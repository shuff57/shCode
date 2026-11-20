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
// else is 404. An item is served when it is live (not deleted) and either
//   (a) the caller is the publisher and the item is USED: its name is a string
//       literal in the game's code, or is put together from them
//       (lib/games-core.ts usedItems; comments do not count); or
//   (b) it is shared, not hidden, into a class the caller sees the game through
//       (or public, for a game seen only through Everyone). EVERY such item is
//       served, used-looking or not (#129): a game can name a picture from
//       something the code never spells out (an enemy type read from a table,
//       a level number), and these items are already the caller's to see in
//       the class library, so sending them shows nothing new. Bounded by the
//       library's own caps (MAX_ITEMS_PER_KIND in functions/_shared/library.ts).
// A used item the caller cannot get is named in `missing` so /play can say so. Bytes
// come from R2 (UPLOADS, library/<id>), never a public URL, and an object over
// the library's per-item cap is skipped. No email is ever in the response.

import { gameClassesFor, json, visibleGame, type SessionData } from '../../../_shared/games';
import { publicItemIdsOf } from '../../../_shared/publicShare';
import { isKind } from '../../../_shared/library';
import { loadItemAssets, type AssetItemRow } from '../../../_shared/itemAssets';
import { isGameId, usedItems } from '../../../../lib/games-core';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  const seen = await visibleGame(env.DB, data, id);
  if (!seen) return json({ error: 'Not found' }, 404);
  const author = seen.row.owner_email;

  const items = await env.DB.prepare(
    `SELECT id, kind, name, mime, meta FROM library_items WHERE owner_email = ? AND deleted_at IS NULL ORDER BY kind, name`,
  ).bind(author).all<AssetItemRow>();
  const all = (items.results ?? []).filter((r) => isKind(r.kind));
  const used = usedItems(seen.row.code, all);
  if (seen.mine && !used.length) return json({ assets: [], missing: [], missingItems: [] });

  let available: Set<string>;
  if (seen.mine) {
    available = new Set(used.map((u) => u.id));
  } else if (seen.viaPublic) {
    // Seen only because the game is public (migration 0058): it brings the author's items that are public too.
    available = await publicItemIdsOf(env.DB, author);
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
  // The publisher gets only what the code uses (the rest of their library is theirs on this computer anyway);
  // anyone else gets everything they may see (see (b) above).
  const serve = seen.mine ? used : all.filter((u) => available.has(u.id));
  const assets = await loadItemAssets(env.UPLOADS, serve);
  return json({
    assets,
    missing: [...new Set(missingItems.map((m) => m.name))].sort((a, b) => a.localeCompare(b)),
    missingItems,
  });
};
