// GET /api/library  — the caller's textures, sounds and fonts (tombstones included) + quota
// PUT /api/library  — save one item: { kind, name, dataUri, meta, baseHash, remixedFrom? }
//
// The account copy of what the texture editor and the sound mixer save in the
// browser (lib/moshion-storage.ts). lib/library-sync.ts merges the two; this
// route only stores, checks, and refuses. Every query is scoped to the session
// email. Bytes go to R2 (UPLOADS, library/<id>); see migrations/0039_library.sql.
//
// `baseHash` is the hash the browser last saw for this name. If the account
// copy has changed since (another device saved over it) the save is refused
// with 409 and the current item, and the browser keeps both copies under two
// names rather than one device silently erasing the other's work.
//
// `remixedFrom` (migration 0045) is the id of the classmate's item this one was
// copied from (Copy to mine / Remix in the class library). It is read only when
// the name is new (or was deleted): the server takes the original's name,
// author (first name + last initial) and choice from the original's own row
// and records them, so the credit follows the copy to every device. Saving
// over an existing item never moves it. A copy of a "keep remixes open" item
// starts as 'open' and can only be shared that way (POST /api/library/[id]/share).

import { isUploadId, newUploadId } from '../../_shared/uploads';
import {
  MAX_ITEM_BYTES,
  MAX_ITEMS_PER_KIND,
  metaLimit,
  MAX_TOTAL_BYTES,
  FONT_FILE_MAX,
  FONT_FILES_TOTAL_MAX,
  NAME_RE,
  fileBytesOf,
  isKind,
  itemHash,
  r2Key,
  sniffLibraryItem,
  type LibraryKind,
} from '../../_shared/library';
import { originalItem } from '../../_shared/shareChoice';
import {
  PROVENANCE_COLUMNS,
  choiceOf,
  decideChoice,
  provenanceFromRow,
  provenanceToRow,
  type Provenance,
  type ProvenanceRow,
} from '../../../lib/share-choice';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export interface LibraryRow extends Partial<ProvenanceRow> {
  id: string;
  kind: LibraryKind;
  name: string;
  bytes: number;
  mime: string;
  meta: string | null;
  hash: string;
  updated_at: number;
  deleted_at: number | null;
  shared?: number;
  share_choice?: string | null;
}

export function itemJson(r: LibraryRow) {
  return {
    id: r.id, kind: r.kind, name: r.name, bytes: r.bytes, mime: r.mime, meta: r.meta,
    hash: r.hash, updatedAt: r.updated_at, deletedAt: r.deleted_at, shared: !!r.shared,
    choice: choiceOf(r.share_choice), remixedFrom: provenanceFromRow(r),
  };
}

const MAX_BODY = 512 * 1024;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const res = await env.DB.prepare(
    `SELECT id, kind, name, bytes, mime, meta, hash, updated_at, deleted_at, share_choice, ${PROVENANCE_COLUMNS},
            EXISTS (SELECT 1 FROM library_shares s WHERE s.item_id = library_items.id) AS shared
       FROM library_items WHERE owner_email = ? ORDER BY kind, name`,
  ).bind(data.email).all<LibraryRow>();
  const rows = res.results ?? [];
  const used = (k: LibraryKind) => rows.filter((r) => r.kind === k && r.deleted_at == null).reduce((n, r) => n + r.bytes, 0);
  return json({
    items: rows.map(itemJson),
    quota: {
      texture: { bytes: used('texture'), maxBytes: MAX_TOTAL_BYTES.texture, maxItemBytes: MAX_ITEM_BYTES.texture },
      sound: { bytes: used('sound'), maxBytes: MAX_TOTAL_BYTES.sound, maxItemBytes: MAX_ITEM_BYTES.sound },
      font: { bytes: used('font'), maxBytes: MAX_TOTAL_BYTES.font, maxItemBytes: MAX_ITEM_BYTES.font },
    },
  });
};

export const onRequestPut: PagesFunction<Env, string, SessionData> = async ({ request, env, data }: Ctx) => {
  if (!env.UPLOADS) return json({ error: 'The library is not configured on this server' }, 500);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'That is too large to save.' }, 413);

  let body: { kind?: unknown; name?: unknown; dataUri?: unknown; meta?: unknown; baseHash?: unknown; remixedFrom?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { kind, name, dataUri } = body;
  if (!isKind(kind)) return json({ error: "kind must be 'texture', 'sound' or 'font'" }, 400);
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    return json({ error: 'Name must start with a letter and contain only letters, digits and _ (40 at most).' }, 400);
  }
  if (typeof dataUri !== 'string') return json({ error: 'dataUri must be a string' }, 400);
  const meta = body.meta == null ? null : body.meta;
  if (meta !== null && typeof meta !== 'string') return json({ error: 'meta must be a string or null' }, 400);
  if (meta && meta.length > metaLimit(kind)) {
    return json({ error: kind === 'font' ? 'This font\'s drawing is too large to keep. Remove some pieces and save again.' : 'meta is too large' }, 413);
  }
  const baseHash = typeof body.baseHash === 'string' ? body.baseHash : null;

  const label = kind === 'texture' ? 'texture' : kind === 'sound' ? 'sound' : 'font';
  if (dataUri.length > MAX_ITEM_BYTES[kind]) {
    // A font's limit is said in KB of FILE, the number a student sees beside the file.
    const [have, max] = kind === 'font'
      ? [fileBytesOf(dataUri.length), FONT_FILE_MAX]
      : [dataUri.length, MAX_ITEM_BYTES[kind]];
    return json({ error: `That ${label} is ${Math.round(have / 1024)} KB; the limit is ${Math.round(max / 1024)} KB.` }, 413);
  }
  // The type comes from the bytes, never from the data URI's own label.
  const mime = sniffLibraryItem(kind, dataUri);
  if (!mime) {
    return json({ error: kind === 'texture' ? 'That is not a PNG, JPEG, GIF or WebP image.'
      : kind === 'sound' ? 'That is not a WAV, MP3 or OGG sound.'
      : 'That is not a TTF, OTF, WOFF or WOFF2 font file.' }, 415);
  }
  const hash = await itemHash(dataUri, meta);

  const existing = await env.DB.prepare(
    `SELECT id, kind, name, bytes, mime, meta, hash, updated_at, deleted_at, share_choice, ${PROVENANCE_COLUMNS}
       FROM library_items WHERE owner_email = ? AND kind = ? AND name = ?`,
  ).bind(data.email, kind, name).first<LibraryRow>();

  if (existing && existing.deleted_at == null && existing.hash !== hash && existing.hash !== baseHash) {
    return json({ error: 'This name was changed on another device.', conflict: true, item: itemJson(existing) }, 409);
  }
  if (existing && existing.deleted_at == null && existing.hash === hash) {
    return json({ item: itemJson(existing) }); // already there, byte for byte
  }

  const totals = await env.DB.prepare(
    `SELECT COALESCE(SUM(bytes), 0) AS bytes, COUNT(*) AS n
       FROM library_items
      WHERE owner_email = ? AND kind = ? AND deleted_at IS NULL AND name <> ?`,
  ).bind(data.email, kind, name).first<{ bytes: number; n: number }>();
  if ((totals?.n ?? 0) + 1 > MAX_ITEMS_PER_KIND) {
    return json({ error: `Your library holds ${MAX_ITEMS_PER_KIND} ${label}s at most. Delete one first.` }, 413);
  }
  if ((totals?.bytes ?? 0) + dataUri.length > MAX_TOTAL_BYTES[kind]) {
    const full = kind === 'font' ? `${FONT_FILES_TOTAL_MAX / 1024} KB` : `${MAX_TOTAL_BYTES[kind] / 1024 / 1024} MB`;
    return json({ error: `Your ${label}s are full (${full}). Delete one first.` }, 413);
  }

  const id = existing && isUploadId(existing.id) ? existing.id : newUploadId();
  const now = Date.now();
  // A new name (or one brought back from a tombstone) starts its own story: where
  // it was copied from, if anywhere, and the choice that follows from that.
  // Saving over a live item keeps both as they are.
  const fresh = !existing || existing.deleted_at != null;
  let remixedFrom: Provenance | null = existing && !fresh ? provenanceFromRow(existing) : null;
  let choice = existing && !fresh ? choiceOf(existing.share_choice) : choiceOf(null);
  if (fresh) {
    if (typeof body.remixedFrom === 'string' && isUploadId(body.remixedFrom)) {
      const original = await originalItem(env.DB, body.remixedFrom, data.email);
      if (original) remixedFrom = original.provenance;
    }
    const ch = decideChoice(undefined, remixedFrom);
    choice = 'choice' in ch ? ch.choice : choice;
  }
  const p = provenanceToRow(remixedFrom);
  await env.UPLOADS.put(r2Key(id), dataUri, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
  if (fresh) {
    await env.DB.prepare(
      `INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at,
                                  share_choice, ${PROVENANCE_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (owner_email, kind, name) DO UPDATE SET
         bytes = excluded.bytes, mime = excluded.mime, meta = excluded.meta, hash = excluded.hash,
         updated_at = excluded.updated_at, deleted_at = NULL, share_choice = excluded.share_choice,
         remixed_from_id = excluded.remixed_from_id, remixed_from_title = excluded.remixed_from_title,
         remixed_from_author = excluded.remixed_from_author, remixed_from_choice = excluded.remixed_from_choice,
         origin_id = excluded.origin_id, origin_title = excluded.origin_title, origin_author = excluded.origin_author`,
    ).bind(id, data.email, kind, name, dataUri.length, mime, meta, hash, now, choice,
      p.remixed_from_id, p.remixed_from_title, p.remixed_from_author, p.remixed_from_choice,
      p.origin_id, p.origin_title, p.origin_author).run();
  } else {
    await env.DB.prepare(
      `UPDATE library_items SET bytes = ?, mime = ?, meta = ?, hash = ?, updated_at = ?, deleted_at = NULL
        WHERE owner_email = ? AND kind = ? AND name = ?`,
    ).bind(dataUri.length, mime, meta, hash, now, data.email, kind, name).run();
  }

  return json({
    item: itemJson({
      id, kind, name, bytes: dataUri.length, mime, meta, hash, updated_at: now, deleted_at: null,
      share_choice: choice, ...p,
    }),
  }, existing ? 200 : 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
