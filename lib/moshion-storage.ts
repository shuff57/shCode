'use client';

import { RefObject, useEffect } from 'react';

// Saves for moSHion sketches.
//
// The preview iframe is sandboxed WITHOUT allow-same-origin, deliberately, so
// student code cannot reach /api/* carrying the viewer's session cookie. The
// price is an opaque origin, where merely READING window.localStorage throws
// SecurityError -- so `storeItem()` killed the sketch outright. Measured
// 2026-08-25: every one of the 42 lesson files that calls storeItem/getItem
// showed a black canvas and "Error: Script error.", which is all of unit 6.5
// (Save & Load), parts of 6.6 and 7.1, and 4.1.4.
//
// So the host page holds the store instead, on its own real origin, and the
// frame gets a hydrated copy:
//
//   parent (app origin)          iframe (opaque origin)
//     localStorage  ---- init --->  window.__moshionStorage
//        ^                                  |
//        +---------- set/remove/clear ------+
//
// The frame waits for `init` before it runs the student script, so getItem()
// is an ordinary synchronous read of an object that is already populated.
// That matters: the moSHion API is synchronous and a save that only arrived
// after setup() would be worse than no save at all.
//
// One namespace for every sketch, matching what real localStorage would do
// for a real game on one origin -- so a save made in the 6.5.4 example is
// still there for the 6.5.7 example that loads it, which is the point those
// two lessons are making.

const KEY = 'moshion.store.v1';

// A student sketch can call storeItem() every frame. The app keeps lesson
// drafts in this same localStorage, so an unbounded sketch could evict a
// student's unsaved work -- these caps make that impossible rather than
// unlikely.
const MAX_VALUE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024;

// ---- saved sounds ---------------------------------------------------------
//
// The mixer (app/sound) saves a generated WAV here under `sound:<name>`, and
// the preview bridge hands the sketch the same store. `loadSound('myZap')`
// then resolves the name, with no upload and no API route -- the exact shape
// saved textures already use.
//
// Audio is larger than pixel art, so sound keys get their own ceiling. Keeping
// the two budgets separate is the important part: a few megabytes of music
// must never be able to push out a student's lesson draft.
const SOUND_PREFIX = 'sound:';
// Metadata for reopening a sound in the mixer: preset/loop, volume, rate, pan.
// Like `texmeta:`, it deliberately does not start with `sound:` so it never
// lists as a sound.
const SNDMETA_PREFIX = 'sndmeta:';
const MAX_SOUND_VALUE_BYTES = 256 * 1024;
const MAX_SOUND_TOTAL_BYTES = 2 * 1024 * 1024;

type Store = Record<string, string>;

function storeBytes(store: Store): { draft: number; sound: number } {
  let draft = 0;
  let sound = 0;
  for (const [key, value] of Object.entries(store)) {
    const bytes = key.length + value.length;
    if (key.startsWith(SOUND_PREFIX)) sound += bytes;
    else draft += bytes;
  }
  return { draft, sound };
}

function withinCaps(store: Store): boolean {
  const { draft, sound } = storeBytes(store);
  return draft <= MAX_TOTAL_BYTES && sound <= MAX_SOUND_TOTAL_BYTES;
}

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    if (!withinCaps(store)) return;
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota, private mode -- the sketch keeps its in-frame copy either way */
  }
}

// ---- saved textures -------------------------------------------------------
//
// `sprite.texture = 'myGuy'` resolves a saved texture out of this same store,
// under the key `texture:<name>`. The editor runs on the app origin and writes
// here directly; the bridge above then hands the sketch a hydrated copy, so
// there is no API call and no second store to keep in sync.
//
// The value format is whatever moshion.js's storeItem() writes -- a
// JSON-encoded string, NOT the raw data URL. Writing the raw URL here would
// read back through getItem()'s JSON.parse as a plain string too (it falls
// back on a parse failure), which is exactly the kind of accidental agreement
// that breaks the day someone saves a name containing a quote. Encode it.

const TEXTURE_PREFIX = 'texture:';
// An animation is the same image key holding a horizontal STRIP, plus its
// frame count here. Two keys, so a still and an animation load identically and
// dropping the meta downgrades rather than breaks. 'texmeta:' deliberately
// does not begin with 'texture:', so meta never lists as a texture.
const TEXMETA_PREFIX = 'texmeta:';


export interface SavedTexture {
  name: string;
  dataUrl: string;
  bytes: number;
  /** 1 for a still; >1 means dataUrl is a strip of this many frames. */
  frames: number;
  /** Game frames per animation frame, matching moSHion's Ani.frameDelay. */
  frameDelay: number;
  /** Optional per-frame holds, one per frame; null means uniform frameDelay. */
  delays: number[] | null;
}

/** Every texture saved in this browser, sorted by name. */
export function listSavedTextures(): SavedTexture[] {
  const store = readStore();
  const out: SavedTexture[] = [];
  for (const key of Object.keys(store)) {
    if (!key.startsWith(TEXTURE_PREFIX)) continue;
    let dataUrl: string;
    try {
      const parsed = JSON.parse(store[key]);
      if (typeof parsed !== 'string') continue;
      dataUrl = parsed;
    } catch {
      continue; // not ours, or corrupted -- skip rather than throw
    }
    if (!dataUrl.startsWith('data:')) continue;
    const name = key.slice(TEXTURE_PREFIX.length);
    const meta = readMeta(store, name);
    out.push({
      name,
      dataUrl,
      bytes: store[key].length,
      frames: meta.frames,
      frameDelay: meta.frameDelay,
      delays: meta.delays,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function readMeta(
  store: Store,
  name: string
): { frames: number; frameDelay: number; delays: number[] | null } {
  const still = { frames: 1, frameDelay: 4, delays: null };
  const raw = store[TEXMETA_PREFIX + name];
  if (!raw) return still;
  try {
    const m = JSON.parse(raw);
    const parsed = typeof m === 'string' ? JSON.parse(m) : m;
    const frames = Math.floor(parsed?.frames);
    if (!(frames > 1)) return still;
    // Only honour a delays array that matches the frame count. A mismatched
    // one is a half-written save; using it would hold the wrong frames.
    const d = parsed?.delays;
    const delays = Array.isArray(d) && d.length === frames
      ? d.map((n: unknown) => Math.max(1, Math.floor(Number(n)) || 1))
      : null;
    return { frames, frameDelay: Math.max(1, Math.floor(parsed?.frameDelay) || 4), delays };
  } catch {
    return still;
  }
}

/**
 * Save one texture. Returns null on success, or a human-readable reason.
 *
 * Reasons rather than exceptions because every caller is a form: the editor
 * wants to put the sentence next to the Save button, not catch and translate.
 */
export function saveTexture(
  name: string,
  dataUrl: string,
  anim?: { frames: number; frameDelay: number; delays?: number[] | null }
): string | null {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    return 'Name must start with a letter and contain only letters, digits and _ (it becomes a texture name in code).';
  }
  if (!dataUrl.startsWith('data:image/')) return 'That is not an image.';
  const encoded = JSON.stringify(dataUrl);
  if (encoded.length > MAX_VALUE_BYTES) {
    return `That image is ${Math.round(encoded.length / 1024)} KB; the limit is ${Math.round(MAX_VALUE_BYTES / 1024)} KB. Use fewer frames or a smaller grid.`;
  }
  const store = readStore();
  const next: Store = { ...store, [TEXTURE_PREFIX + name]: encoded };
  const frames = anim ? Math.floor(anim.frames) : 1;
  if (frames > 1) {
    // storeItem()'s format, so moshion.js's getItem() parses it directly.
    const d = anim!.delays;
    next[TEXMETA_PREFIX + name] = JSON.stringify({
      frames,
      frameDelay: Math.max(1, Math.floor(anim!.frameDelay) || 4),
      delays: Array.isArray(d) && d.length === frames
        ? d.map((n) => Math.max(1, Math.floor(n) || 1))
        : null,
    });
  } else {
    // Saving a still over an animation must drop the old frame count, or the
    // still gets sliced into N pieces and only a sliver ever draws.
    delete next[TEXMETA_PREFIX + name];
  }
  if (!withinCaps(next)) {
    return 'Saved textures are full. Delete one before saving another.';
  }
  writeStore(next);
  return null;
}

export function deleteSavedTexture(name: string): void {
  const store = readStore();
  delete store[TEXTURE_PREFIX + name];
  delete store[TEXMETA_PREFIX + name];
  writeStore(store);
}

// ---- saved sounds ---------------------------------------------------------

export type SavedSoundKind = 'sfx' | 'music';

export interface SoundMeta {
  kind: SavedSoundKind;
  /** jsfxr preset name (sfx) or ZzFXM loop id (music). */
  source: string;
  volume?: number;
  rate?: number;
  pan?: number;
  /**
   * The full jsfxr definition for an effect, so the mixer can reopen it and
   * keep tweaking. Music has no per-note definition here; its `source` names
   * the loop. Older saves have no def and fall back to the preset.
   */
  def?: Record<string, unknown>;
}

export interface SavedSound extends Required<Omit<SoundMeta, 'def'>> {
  name: string;
  dataUri: string;
  bytes: number;
  /** Empty for music; a plain jsfxr definition for an effect. */
  def: Record<string, unknown>;
}

const clamp01 = (n: unknown): number => Math.max(0, Math.min(1, Number(n) || 0));
const clampRate = (n: unknown): number => Math.max(0.25, Math.min(4, Number(n) || 1));
const clampPan = (n: unknown): number => Math.max(-1, Math.min(1, Number(n) || 0));

function readSoundMeta(
  store: Store,
  name: string
): Required<Omit<SoundMeta, 'def'>> & { def: Record<string, unknown> } {
  const fallback = {
    kind: 'sfx' as const,
    source: 'pickupCoin',
    volume: 1,
    rate: 1,
    pan: 0,
    def: {} as Record<string, unknown>,
  };
  const raw = store[SNDMETA_PREFIX + name];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // Older saves (and anything written through storeItem) are JSON-encoded
    // twice; unwrap the second layer when it is a string.
    const m = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    const def =
      m?.def && typeof m.def === 'object' && !Array.isArray(m.def)
        ? (m.def as Record<string, unknown>)
        : {};
    return {
      kind: m?.kind === 'music' ? 'music' : 'sfx',
      source: typeof m?.source === 'string' ? m.source : fallback.source,
      volume: clamp01(m?.volume ?? 1),
      rate: clampRate(m?.rate ?? 1),
      pan: clampPan(m?.pan ?? 0),
      def,
    };
  } catch {
    return fallback;
  }
}

/** Every sound saved in this browser, sorted by name. */
export function listSavedSounds(): SavedSound[] {
  const store = readStore();
  const out: SavedSound[] = [];
  for (const key of Object.keys(store)) {
    if (!key.startsWith(SOUND_PREFIX)) continue;
    let dataUri: string;
    try {
      const parsed = JSON.parse(store[key]);
      if (typeof parsed !== 'string') continue;
      dataUri = parsed;
    } catch {
      continue; // not ours, or corrupted -- skip rather than throw
    }
    if (!dataUri.startsWith('data:audio/')) continue;
    const name = key.slice(SOUND_PREFIX.length);
    const meta = readSoundMeta(store, name);
    out.push({ name, dataUri, bytes: store[key].length, ...meta });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save one sound. Returns null on success, or a human-readable reason.
 *
 * The name becomes the argument a sketch writes: `loadSound('myZap')`. That
 * is why it is restricted to a code-safe identifier, exactly as a texture
 * name is.
 */
export function saveSound(name: string, dataUri: string, meta: SoundMeta): string | null {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    return 'Name must start with a letter and contain only letters, digits and _ (it becomes a name in code).';
  }
  if (!dataUri.startsWith('data:audio/')) return 'That is not a sound.';
  const encoded = JSON.stringify(dataUri);
  if (encoded.length > MAX_SOUND_VALUE_BYTES) {
    return `That sound is ${Math.round(encoded.length / 1024)} KB; the limit is ${Math.round(MAX_SOUND_VALUE_BYTES / 1024)} KB. Try a shorter version.`;
  }
  const store = readStore();
  const next: Store = {
    ...store,
    [SOUND_PREFIX + name]: encoded,
    [SNDMETA_PREFIX + name]: JSON.stringify({
      kind: meta.kind,
      source: meta.source,
      volume: clamp01(meta.volume ?? 1),
      rate: clampRate(meta.rate ?? 1),
      pan: clampPan(meta.pan ?? 0),
      def: meta.def && typeof meta.def === 'object' && !Array.isArray(meta.def) ? meta.def : {},
    }),
  };
  if (!withinCaps(next)) {
    return 'Saved sounds are full. Delete one before saving another.';
  }
  writeStore(next);
  return null;
}

export function deleteSavedSound(name: string): void {
  const store = readStore();
  delete store[SOUND_PREFIX + name];
  delete store[SNDMETA_PREFIX + name];
  writeStore(store);
}

/**
 * Serve the storage bridge for one moSHion preview iframe.
 *
 * Only messages whose source IS this frame's contentWindow are answered, so
 * several previews on one page (a reading with four live blocks) do not each
 * reply to the others' requests.
 */
export function useMoshionStorage(ref: RefObject<HTMLIFrameElement | null>): void {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const frame = ref.current;
      if (!frame || !frame.contentWindow || e.source !== frame.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;

      if (d.source === 'preview-storage-request') {
        frame.contentWindow.postMessage(
          { source: 'preview-storage-init', data: readStore() },
          '*'
        );
        return;
      }
      if (d.source !== 'preview-storage') return;

      if (d.op === 'clear') {
        writeStore({});
        return;
      }
      if (typeof d.key !== 'string') return;
      const store = readStore();
      if (d.op === 'remove') {
        delete store[d.key];
      } else if (d.op === 'set') {
        const limit = d.key.startsWith(SOUND_PREFIX) ? MAX_SOUND_VALUE_BYTES : MAX_VALUE_BYTES;
        if (typeof d.value !== 'string' || d.value.length > limit) return;
        store[d.key] = d.value;
      } else {
        return;
      }
      writeStore(store);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [ref]);
}
