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

type Store = Record<string, string>;

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
    const raw = JSON.stringify(store);
    if (raw.length > MAX_TOTAL_BYTES) return;
    window.localStorage.setItem(KEY, raw);
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

/** Bytes a single saved texture may occupy, matching the bridge's own cap. */
export const TEXTURE_MAX_BYTES = MAX_VALUE_BYTES;

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
  if (JSON.stringify(next).length > MAX_TOTAL_BYTES) {
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
        if (typeof d.value !== 'string' || d.value.length > MAX_VALUE_BYTES) return;
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
