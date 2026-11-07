// GET /api/library  — the caller's textures and sounds (tombstones included) + quota
// PUT /api/library  — save one item: { kind, name, dataUri, meta, baseHash }
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

import { isUploadId, newUploadId } from '../../_shared/uploads';
import {
  MAX_ITEM_BYTES,
  MAX_ITEMS_PER_KIND,
  MAX_META_BYTES,
  MAX_TOTAL_BYTES,
  NAME_RE,
  isKind,
  itemHash,
  r2Key,
  sniffLibraryItem,
  type LibraryKind,
} from '../../_shared/library';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export interface LibraryRow {
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
}

export function itemJson(r: LibraryRow) {
  return {
    id: r.id, kind: r.kind, name: r.name, bytes: r.bytes, mime: r.mime, meta: r.meta,
    hash: r.hash, updatedAt: r.updated_at, deletedAt: r.deleted_at, shared: !!r.shared,
  };
}

const MAX_BODY = 512 * 1024;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const res = await env.DB.prepare(
    `SELECT id, kind, name, bytes, mime, meta, hash, updated_at, deleted_at,
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
    },
  });
};

export const onRequestPut: PagesFunction<Env, string, SessionData> = async ({ request, env, data }: Ctx) => {
  if (!env.UPLOADS) return json({ error: 'The library is not configured on this server' }, 500);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return json({ error: 'That is too large to save.' }, 413);

  let body: { kind?: unknown; name?: unknown; dataUri?: unknown; meta?: unknown; baseHash?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { kind, name, dataUri } = body;
  if (!isKind(kind)) return json({ error: "kind must be 'texture' or 'sound'" }, 400);
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    return json({ error: 'Name must start with a letter and contain only letters, digits and _ (40 at most).' }, 400);
  }
  if (typeof dataUri !== 'string') return json({ error: 'dataUri must be a string' }, 400);
  const meta = body.meta == null ? null : body.meta;
  if (meta !== null && typeof meta !== 'string') return json({ error: 'meta must be a string or null' }, 400);
  if (meta && meta.length > MAX_META_BYTES) return json({ error: 'meta is too large' }, 413);
  const baseHash = typeof body.baseHash === 'string' ? body.baseHash : null;

  const label = kind === 'texture' ? 'texture' : 'sound';
  if (dataUri.length > MAX_ITEM_BYTES[kind]) {
    return json({ error: `That ${label} is ${Math.round(dataUri.length / 1024)} KB; the limit is ${MAX_ITEM_BYTES[kind] / 1024} KB.` }, 413);
  }
  // The type comes from the bytes, never from the data URI's own label.
  const mime = sniffLibraryItem(kind, dataUri);
  if (!mime) {
    return json({ error: kind === 'texture' ? 'That is not a PNG, JPEG, GIF or WebP image.' : 'That is not a WAV, MP3 or OGG sound.' }, 415);
  }
  const hash = await itemHash(dataUri, meta);

  const existing = await env.DB.prepare(
    `SELECT id, kind, name, bytes, mime, meta, hash, updated_at, deleted_at
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
    return json({ error: `Your ${label}s are full (${MAX_TOTAL_BYTES[kind] / 1024 / 1024} MB). Delete one first.` }, 413);
  }

  const id = existing && isUploadId(existing.id) ? existing.id : newUploadId();
  const now = Date.now();
  await env.UPLOADS.put(r2Key(id), dataUri, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } });
  await env.DB.prepare(
    `INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT (owner_email, kind, name) DO UPDATE SET
       bytes = excluded.bytes, mime = excluded.mime, meta = excluded.meta, hash = excluded.hash,
       updated_at = excluded.updated_at, deleted_at = NULL`,
  ).bind(id, data.email, kind, name, dataUri.length, mime, meta, hash, now).run();

  return json({
    item: itemJson({ id, kind, name, bytes: dataUri.length, mime, meta, hash, updated_at: now, deleted_at: null }),
  }, existing ? 200 : 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
