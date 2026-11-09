// GET /api/games/[id]/assets  — the publisher's own pictures and sounds a game uses
//
// A published game stores only its code, and a sketch loads a saved texture or
// sound by name from the PLAYER's library. This hands /play the publisher's
// items the code uses, so a classmate sees the game as it was made; /play lays
// them over the store for that run only (lib/game-assets.ts) and never saves
// them into the player's library.
//
// Same access as GET /api/games/[id] (visibleGame): the owner, a classmate in
// a class it is shared into and not hidden, a teacher of that class. Anything
// else is 404. An item is served when
//   (a) its name is a string literal in the game's code (lib/games-core.ts
//       usedItems; comments do not count), and
//   (b) it is live (not deleted), and
//   (c) the caller is the publisher, or it is shared, not hidden, into a class
//       the caller sees the game through.
// A used item that fails (c) is named in `missing` so /play can say so. Bytes
// come from R2 (UPLOADS, library/<id>), never a public URL, and an object over
// the library's per-item cap is skipped. No email is ever in the response.

import { gameClassesFor, json, visibleGame, type SessionData } from '../../../_shared/games';
import { MAX_ITEM_BYTES, isKind, r2Key, type LibraryKind } from '../../../_shared/library';
import { isGameId, usedItems } from '../../../../lib/games-core';
import { metaFrames, type GameAsset } from '../../../../lib/game-assets';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type Ctx = EventContext<Env, 'id', SessionData>;

interface ItemRow {
  id: string;
  kind: LibraryKind;
  name: string;
  mime: string;
  meta: string | null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, id);
  if (!seen) return json({ error: 'Not found' }, 404);
  const author = seen.row.owner_email;

  const items = await env.DB.prepare(
    `SELECT id, kind, name, mime, meta FROM library_items WHERE owner_email = ? AND deleted_at IS NULL ORDER BY kind, name`,
  ).bind(author).all<ItemRow>();
  const used = usedItems(seen.row.code, (items.results ?? []).filter((r) => isKind(r.kind)));
  if (!used.length) return json({ assets: [], missing: [], missingItems: [] });

  let available: Set<string>;
  if (seen.mine) {
    available = new Set(used.map((u) => u.id));
  } else {
    const classes = await gameClassesFor(env.DB, data, id);
    available = new Set();
    if (classes.length) {
      // Filtered by owner and class rather than by item id, so the query has a
      // handful of parameters however many items the game uses.
      const marks = classes.map(() => '?').join(',');
      const shares = await env.DB.prepare(
        `SELECT DISTINCT s.item_id FROM library_shares s
           JOIN library_items i ON i.id = s.item_id AND i.deleted_at IS NULL
          WHERE i.owner_email = ? AND s.hidden_at IS NULL AND s.class_id IN (${marks})`,
      ).bind(author, ...classes).all<{ item_id: string }>();
      for (const s of shares.results ?? []) available.add(s.item_id);
    }
  }

  const missingItems = used.filter((u) => !available.has(u.id)).map((u) => ({ kind: u.kind, name: u.name }));
  const assets: GameAsset[] = [];
  if (env.UPLOADS) {
    const got = await Promise.all(used.filter((u) => available.has(u.id)).map(async (u) => {
      const obj = await env.UPLOADS.get(r2Key(u.id));
      if (!obj) return null;
      const text = await obj.text();
      if (!text.startsWith('data:') || text.length > MAX_ITEM_BYTES[u.kind]) return null;
      const a: GameAsset = { kind: u.kind, name: u.name, type: u.mime, data: text, meta: u.meta ?? null };
      if (u.kind === 'texture') {
        const f = metaFrames(u.meta);
        if (f) a.frames = f;
      }
      return a;
    }));
    for (const a of got) if (a) assets.push(a);
  }
  return json({
    assets,
    missing: [...new Set(missingItems.map((m) => m.name))].sort((a, b) => a.localeCompare(b)),
    missingItems,
  });
};
