// Library items as GameAssets (lib/game-assets.ts): the bytes from R2 (UPLOADS, library/<id>), never a public URL.
// An object that is missing, not a data: URI, or over the library's per-item cap is skipped. Used by
// GET /api/games/[id]/assets (a published game's art on /play) and POST /api/rooms/[code]/assets (the other
// people's art in a Code together session).

import { MAX_ITEM_BYTES, r2Key, type LibraryKind } from './library';
import { metaFrames, type GameAsset } from '../../lib/game-assets';

export interface AssetItemRow {
  id: string;
  kind: LibraryKind;
  name: string;
  mime: string;
  meta: string | null;
}

export async function loadItemAssets(uploads: R2Bucket | undefined, rows: readonly AssetItemRow[]): Promise<GameAsset[]> {
  if (!uploads) return [];
  const got = await Promise.all(rows.map(async (u) => {
    const obj = await uploads.get(r2Key(u.id));
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
  return got.filter((a): a is GameAsset => a !== null);
}
