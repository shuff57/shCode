// A published game's own pictures and sounds on /play (GET /api/games/[id]/assets).
//
// A game stores only its code; the textures and sounds it loads by name live in
// the publisher's library. /play fetches the ones the publisher shared with the
// class and lays them OVER the store the sketch sees for that run (the storage
// bridge in lib/moshion-storage.ts), so the game's art wins over a same-named
// item in the player's own library. They are never written into the player's
// store: the bridge refuses a sketch's save to one of these keys, and nothing
// here touches localStorage or the library sync.
//
// No React and no window here, so scripts/test-game-assets.mjs can run it.

import type { AssetKind } from './games-core';

export interface GameAsset {
  kind: AssetKind;
  name: string;
  /** The type read from the bytes when it was saved (image/png, audio/wav, ...). */
  type: string;
  /** The data: URI, exactly as the publisher's library holds it. */
  data: string;
  /** The raw texmeta:/sndmeta: string beside it (animation frames, volume...), or null. */
  meta: string | null;
  /** For an animated picture: its frame count. Absent for a still or a sound. */
  frames?: number;
}

export interface GameAssetsResponse {
  assets: GameAsset[];
  /** Names the code uses that match a publisher item the caller cannot see (not shared, or hidden). */
  missing: string[];
  /** The same, with each item's kind. */
  missingItems: { kind: AssetKind; name: string }[];
}

type Store = Record<string, string>;

const KEYS: Record<AssetKind, [string, string]> = {
  texture: ['texture:', 'texmeta:'],
  sound: ['sound:', 'sndmeta:'],
};

/** The frame count in a texmeta string, or undefined for a still. Tolerates the double-encoded form. */
export function metaFrames(meta: string | null): number | undefined {
  if (!meta) return undefined;
  try {
    const a = JSON.parse(meta);
    const m = typeof a === 'string' ? JSON.parse(a) : a;
    const f = Math.floor(Number(m?.frames));
    return f > 1 ? f : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The store a sketch run sees: the player's own `store` with the game's
 * `assets` laid in. With `ownWins` false (a classmate playing) the game's item
 * replaces a same-named one of the player's, meta included (a still from the
 * game must not be sliced by the player's own animation meta). With `ownWins`
 * true (the publisher playing their own game) an item fills in only when the
 * player's store has nothing under that name, so unsynced edits on this
 * computer are what they see.
 *
 * `locked` is every key the game supplied: the bridge refuses a sketch's write
 * to those, so the game's art can never land in the player's own library.
 */
export function mergeAssets(store: Store, assets: readonly GameAsset[] | undefined, ownWins = false): { store: Store; locked: Set<string> } {
  const out: Store = { ...store };
  const locked = new Set<string>();
  for (const a of assets ?? []) {
    const pair = KEYS[a.kind];
    if (!pair || typeof a.data !== 'string' || typeof a.name !== 'string') continue;
    const [p, mp] = pair;
    const key = p + a.name;
    const metaKey = mp + a.name;
    if (ownWins && Object.prototype.hasOwnProperty.call(store, key)) continue;
    // Same encoding the library uses (lib/moshion-storage.ts addToLibrary):
    // the data URI JSON-encoded, the meta string as stored.
    out[key] = JSON.stringify(a.data);
    if (a.meta == null) delete out[metaKey];
    else out[metaKey] = a.meta;
    locked.add(key);
    locked.add(metaKey);
  }
  return { store: out, locked };
}

/** Names that will not show, leaving out a picture the built-in catalog still draws under that name. */
export function missingToShow(missingItems: readonly { kind: AssetKind; name: string }[], builtinTextures: ReadonlySet<string>): string[] {
  const names = new Set<string>();
  for (const m of missingItems) {
    if (m.kind === 'texture' && builtinTextures.has(m.name)) continue;
    names.add(m.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** "hero", "hero and coin", "hero, coin, and jump". */
export function listWords(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

// ---- browser helpers -------------------------------------------------------

let builtinCache: Promise<Set<string>> | null = null;

/** The built-in texture names (public/moshion/textures/textures.json), fetched once. Empty on failure. */
export function builtinTextureNames(): Promise<Set<string>> {
  if (!builtinCache) {
    builtinCache = fetch('/moshion/textures/textures.json')
      .then((r) => (r.ok ? (r.json() as Promise<{ textures?: Record<string, unknown> } | null>) : null))
      .then((d) => new Set(Object.keys(d?.textures ?? {})))
      .catch(() => {
        builtinCache = null; // try again next time
        return new Set<string>();
      });
  }
  return builtinCache;
}
