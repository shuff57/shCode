'use client';

import { type RefObject, useEffect, useRef } from 'react';
import { mergeAssets, type GameAsset } from './game-assets';
import { checkSketchData, isSketchKey } from './sketch-saves-core';
import { errorText } from './http-error';
import { parseProvenance, type Provenance } from './share-choice';

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

// Saved textures get a budget of their own (1 MB, the same as an account's
// library allows), so a full set of textures can sync down without crowding
// out sketch saves, and sketch saves can never push out a texture.
const MAX_TEXTURE_TOTAL_BYTES = 1024 * 1024;

// Saved fonts (textFont('name'), 2026-11-12) get a budget of their own too:
// 150 KB of font file each and 500 KB of files in all, the same as an
// account's library allows (functions/_shared/library.ts). localStorage holds
// ~5 million characters per site, and drafts, sketch saves, textures and
// sounds can already take 3.5 million of them, so fonts are kept small rather
// than let a student's fonts push out a lesson draft. A data URI is 4/3 of
// its file, and the stored value is that URI JSON-quoted.
const FONT_PREFIX = 'font:';
// The Font maker's drawing of a font it made (lib/font-doc.ts), stored raw
// beside the font so the maker can reopen it; counted in the font budget.
const FONTMETA_PREFIX = 'fontmeta:';
const MAX_FONT_VALUE_BYTES = Math.ceil(150 * 1024 * 4 / 3) + 128;
const MAX_FONT_TOTAL_BYTES = Math.ceil(500 * 1024 * 4 / 3) + 4096;

type Store = Record<string, string>;

function storeBytes(store: Store): { draft: number; sound: number; texture: number; font: number } {
  let draft = 0;
  let sound = 0;
  let texture = 0;
  let font = 0;
  for (const [key, value] of Object.entries(store)) {
    const bytes = key.length + value.length;
    if (key.startsWith(SOUND_PREFIX)) sound += bytes;
    else if (key.startsWith('texture:') || key.startsWith('texmeta:')) texture += bytes;
    else if (key.startsWith(FONT_PREFIX) || key.startsWith(FONTMETA_PREFIX)) font += bytes;
    else draft += bytes;
  }
  return { draft, sound, texture, font };
}

function withinCaps(store: Store): boolean {
  const { draft, sound, texture, font } = storeBytes(store);
  return draft <= MAX_TOTAL_BYTES && sound <= MAX_SOUND_TOTAL_BYTES && texture <= MAX_TEXTURE_TOTAL_BYTES
    && font <= MAX_FONT_TOTAL_BYTES;
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

function writeStore(store: Store): boolean {
  try {
    if (!withinCaps(store)) return false;
    window.localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    /* quota, private mode -- the sketch keeps its in-frame copy either way */
    return false;
  }
}

// A save or delete made here tells the library sync (lib/library-sync.ts) to
// push it to the account. An event rather than an import keeps this file free
// of the sync's network code.
export const LIBRARY_LOCAL_CHANGE = 'moshion-library-local-change';
/** Fired by the sync after it changed this browser's copies (downloads, deletes). */
export const LIBRARY_UPDATED = 'moshion-library-updated';
function localChanged(): void {
  try { window.dispatchEvent(new Event(LIBRARY_LOCAL_CHANGE)); } catch { /* no window */ }
}

// Deletes the student MADE (the editor's or the mixer's Delete), kept until the
// sync has removed them from the account. Only these reach the account: an
// item that is merely missing here -- a sketch called clearStorage(), or the
// browser dropped its storage -- is downloaded again instead of deleted
// everywhere.
const LOCAL_DELETES_KEY = 'moshion.library.deleted.v1';
export function readLocalDeletes(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(LOCAL_DELETES_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
export function writeLocalDeletes(keys: string[]): void {
  try {
    if (keys.length) window.localStorage.setItem(LOCAL_DELETES_KEY, JSON.stringify([...new Set(keys)]));
    else window.localStorage.removeItem(LOCAL_DELETES_KEY);
  } catch { /* private mode */ }
}
function markDeleted(kind: 'texture' | 'sound' | 'font', name: string, deleted: boolean): void {
  const key = `${kind}:${name}`;
  const cur = readLocalDeletes().filter((k) => k !== key);
  writeLocalDeletes(deleted ? [...cur, key] : cur);
  // A deleted item's credit goes with it: a new item saved under the name is new work.
  if (deleted) setLocalOrigin(kind, name, null);
}

// Where a copied picture or sound came from (Copy to mine / Remix in the class
// library; lib/share-choice.ts), until the account has it. Kept OUTSIDE the
// sketch store (moshion.store.v1) so a sketch can neither read nor change it,
// and so the editors rewriting texmeta:/sndmeta: never lose it. The library
// sync sends the original's id with the first upload (PUT /api/library
// remixedFrom); from then on the account's copy of the credit is the one shown,
// on every device.
const ORIGIN_KEY = 'moshion.library.origin.v1';
function readOrigins(): Record<string, unknown> {
  try {
    const v = JSON.parse(window.localStorage.getItem(ORIGIN_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
function writeOrigins(all: Record<string, unknown>): void {
  try {
    if (Object.keys(all).length) window.localStorage.setItem(ORIGIN_KEY, JSON.stringify(all));
    else window.localStorage.removeItem(ORIGIN_KEY);
  } catch { /* private mode */ }
}
/** Where this browser's copy of `kind:name` was copied from, or null. */
export function localOrigin(kind: LibraryKind, name: string): Provenance | null {
  return parseProvenance(readOrigins()[`${kind}:${name}`]);
}
export function setLocalOrigin(kind: LibraryKind, name: string, from: Provenance | null): void {
  const all = readOrigins();
  const key = `${kind}:${name}`;
  if (!from && !(key in all)) return;
  if (from) all[key] = from;
  else delete all[key];
  writeOrigins(all);
}
/** Move a credit with a rename (the sync's "keep both" renames this browser's copy). */
export function moveLocalOrigin(kind: LibraryKind, from: string, to: string): void {
  const all = readOrigins();
  const a = `${kind}:${from}`;
  if (!(a in all)) return;
  all[`${kind}:${to}`] = all[a];
  delete all[a];
  writeOrigins(all);
}
/** Drop credits for names this browser no longer holds (only `keep` stay). */
export function pruneLocalOrigins(keep: Set<string>): void {
  const all = readOrigins();
  let changed = false;
  for (const k of Object.keys(all)) if (!keep.has(k)) { delete all[k]; changed = true; }
  if (changed) writeOrigins(all);
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
  markDeleted('texture', name, false);
  localChanged();
  return null;
}

export function deleteSavedTexture(name: string): void {
  const store = readStore();
  delete store[TEXTURE_PREFIX + name];
  delete store[TEXMETA_PREFIX + name];
  writeStore(store);
  markDeleted('texture', name, true);
  localChanged();
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
  markDeleted('sound', name, false);
  localChanged();
  return null;
}

export function deleteSavedSound(name: string): void {
  const store = readStore();
  delete store[SOUND_PREFIX + name];
  delete store[SNDMETA_PREFIX + name];
  writeStore(store);
  markDeleted('sound', name, true);
  localChanged();
}

// ---- saved fonts ------------------------------------------------------------
//
// A font is saved under `font:<name>` as a data URI, exactly as a texture is,
// and the preview bridge hands the sketch the same store, so textFont('name')
// finds it with no upload and no API route (the engine's _savedFontSrc). Fonts
// arrive from the Font maker page (/fonts: upload a file) or Copy to mine.

export interface SavedFont {
  name: string;
  dataUri: string;
  /** The font FILE's size in bytes (what a student sees beside a file), not the stored text's. */
  fileBytes: number;
  type: 'TTF' | 'OTF' | 'WOFF' | 'WOFF2' | null;
  /** True for a font made in the Font maker: its drawing is kept, so it can be edited. */
  editable: boolean;
}

/** TTF, OTF, WOFF or WOFF2 from a font's first bytes; null for anything else. The server checks again. */
export function fontTypeOf(bytes: Uint8Array): SavedFont['type'] {
  if (bytes.length < 12) return null;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if ((bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) || tag === 'true') return 'TTF';
  if (tag === 'OTTO') return 'OTF';
  if (tag === 'wOFF') return 'WOFF';
  if (tag === 'wOF2') return 'WOFF2';
  return null;
}

function dataUriHead(dataUri: string): Uint8Array {
  try {
    const comma = dataUri.indexOf(',');
    const bin = atob(dataUri.slice(comma + 1, comma + 1 + 24));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return new Uint8Array(0);
  }
}

/** Every font saved in this browser, sorted by name. */
export function listSavedFonts(): SavedFont[] {
  const store = readStore();
  const out: SavedFont[] = [];
  for (const key of Object.keys(store)) {
    if (!key.startsWith(FONT_PREFIX)) continue;
    let dataUri: unknown;
    try { dataUri = JSON.parse(store[key]); } catch { continue; }
    if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) continue;
    const comma = dataUri.indexOf(',');
    out.push({
      name: key.slice(FONT_PREFIX.length),
      dataUri,
      fileBytes: Math.floor((dataUri.length - comma - 1) * 3 / 4),
      type: fontTypeOf(dataUriHead(dataUri)),
      editable: typeof store[FONTMETA_PREFIX + key.slice(FONT_PREFIX.length)] === 'string',
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The limits, for the Font maker page to show and check before reading a file. */
export const FONT_LIMITS = { fileBytes: 150 * 1024, totalFileBytes: 500 * 1024 };

/**
 * Save one font. Returns null on success, or a human-readable reason. The
 * name becomes what a sketch writes, textFont('name'), so it is a code-safe
 * identifier, as a texture's or a sound's name is.
 */
export function saveFont(name: string, dataUri: string, drawing: string | null = null): string | null {
  if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name)) {
    return 'Name must start with a letter and contain only letters, digits and _ (it becomes a name in code).';
  }
  if (!dataUri.startsWith('data:') || !fontTypeOf(dataUriHead(dataUri))) return 'That is not a TTF, OTF, WOFF or WOFF2 font file.';
  const encoded = JSON.stringify(dataUri);
  if (encoded.length > MAX_FONT_VALUE_BYTES) {
    const kb = Math.round((dataUri.length - dataUri.indexOf(',') - 1) * 3 / 4 / 1024);
    return `That font is ${kb} KB; the limit is ${FONT_LIMITS.fileBytes / 1024} KB. A WOFF2 version of the same font is usually much smaller.`;
  }
  const store = readStore();
  const next: Store = { ...store, [FONT_PREFIX + name]: encoded };
  // A font made in the Font maker keeps its drawing; an uploaded font over the
  // same name loses any old one, so Edit never opens a drawing of another font.
  if (drawing) next[FONTMETA_PREFIX + name] = drawing;
  else delete next[FONTMETA_PREFIX + name];
  if (!withinCaps(next)) {
    return `Saved fonts are full (${FONT_LIMITS.totalFileBytes / 1024} KB in all). Delete one before saving another.`;
  }
  writeStore(next);
  markDeleted('font', name, false);
  localChanged();
  return null;
}

/** The Font maker's drawing of a saved font, as saved (lib/font-doc.ts parseDoc reads it), or null. */
export function readFontDrawing(name: string): string | null {
  const v = readStore()[FONTMETA_PREFIX + name];
  return typeof v === 'string' ? v : null;
}

export function deleteSavedFont(name: string): void {
  const store = readStore();
  delete store[FONT_PREFIX + name];
  delete store[FONTMETA_PREFIX + name];
  writeStore(store);
  markDeleted('font', name, true);
  localChanged();
}

// ---- the library sync's view of the store ---------------------------------
//
// lib/library-sync.ts sees each saved texture or sound as one item: its data
// URI plus the raw meta string beside it (texmeta:/sndmeta:), carried opaquely
// so a round trip through the account changes nothing.

export type LibraryKind = 'texture' | 'sound' | 'font';
export interface LocalLibraryItem {
  kind: LibraryKind;
  name: string;
  dataUri: string;
  meta: string | null;
}
const PREFIX: Record<LibraryKind, [string, string]> = {
  texture: [TEXTURE_PREFIX, TEXMETA_PREFIX],
  sound: [SOUND_PREFIX, SNDMETA_PREFIX],
  // An uploaded font has no meta; a font made in the Font maker keeps its drawing there.
  font: [FONT_PREFIX, FONTMETA_PREFIX],
};

/**
 * Put one item into this browser's library as if the student had saved it
 * (Copy to mine from the class library): it syncs up to their own account.
 * `from` is where it was copied from (the credit). Returns false when it would not fit.
 */
export function addToLibrary(item: LocalLibraryItem, from: Provenance | null = null): boolean {
  const store = readStore();
  const [p, mp] = PREFIX[item.kind];
  store[p + item.name] = JSON.stringify(item.dataUri);
  if (item.meta == null) delete store[mp + item.name];
  else store[mp + item.name] = item.meta;
  if (!writeStore(store)) return false;
  markDeleted(item.kind, item.name, false);
  setLocalOrigin(item.kind, item.name, from);
  localChanged();
  try { window.dispatchEvent(new Event(LIBRARY_UPDATED)); } catch { /* no window */ }
  return true;
}

export function localLibraryItems(): LocalLibraryItem[] {
  const store = readStore();
  const out: LocalLibraryItem[] = [];
  for (const kind of ['texture', 'sound', 'font'] as const) {
    const [p, mp] = PREFIX[kind];
    for (const key of Object.keys(store)) {
      if (!key.startsWith(p)) continue;
      let dataUri: unknown;
      try { dataUri = JSON.parse(store[key]); } catch { continue; }
      if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) continue;
      const name = key.slice(p.length);
      out.push({ kind, name, dataUri, meta: store[mp + name] ?? null });
    }
  }
  return out;
}

/**
 * Apply a batch of library changes to this browser in one write. Returns false
 * (and changes nothing) when the result would not fit this browser's budgets.
 */
export function applyLibraryChanges(changes: {
  put?: LocalLibraryItem[];
  remove?: { kind: LibraryKind; name: string }[];
}): boolean {
  const store = readStore();
  for (const r of changes.remove ?? []) {
    const [p, mp] = PREFIX[r.kind];
    delete store[p + r.name];
    delete store[mp + r.name];
  }
  for (const it of changes.put ?? []) {
    const [p, mp] = PREFIX[it.kind];
    store[p + it.name] = JSON.stringify(it.dataUri);
    if (it.meta == null) delete store[mp + it.name];
    else store[mp + it.name] = it.meta;
  }
  const ok = writeStore(store);
  if (ok) {
    try { window.dispatchEvent(new Event(LIBRARY_UPDATED)); } catch { /* no window */ }
  }
  return ok;
}

/**
 * Serve the storage bridge for one moSHion preview iframe.
 *
 * Only messages whose source IS this frame's contentWindow are answered, so
 * several previews on one page (a reading with four live blocks) do not each
 * reply to the others' requests.
 */
export function useMoshionStorage(
  ref: RefObject<HTMLIFrameElement | null>,
  overlay?: { assets?: readonly GameAsset[]; ownWins?: boolean },
  remote?: { key: string; wanted: boolean },
): void {
  // A sketch's 'remote' saves (#97, extras.js save/load/saved). Only fetched
  // when the code mentions 'remote' (wantsRemote, lib/sketch-saves-core.ts), so
  // no other sketch pays a request. Held in memory for this preview's life, so a
  // rerun starts from the latest writes, not from a fetch that may predate them.
  const remoteOpt = useRef(remote);
  remoteOpt.current = remote;
  const remoteState = useRemoteSaves();

  // A published game's own pictures and sounds (/play, lib/game-assets.ts),
  // laid over the store this frame is handed at `init`. Read through a ref so
  // a new array does not re-attach the listener. The keys the game supplied
  // are locked: a sketch's save or delete of one is not persisted, so the
  // game's art never lands in the player's own store or library.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const lockedRef = useRef<Set<string>>(new Set());
  const waitingRef = useRef<MessageEventSource | null>(null);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const frame = ref.current;
      if (!frame || !frame.contentWindow || e.source !== frame.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;

      if (d.source === 'preview-storage-request') {
        const reply = (extra: Record<string, unknown>) => {
          const now = ref.current;
          if (!now || !now.contentWindow || now.contentWindow !== e.source) return; // rerun since: that frame is gone
          const o = overlayRef.current;
          const merged = mergeAssets(readStore(), o?.assets, !!o?.ownWins);
          lockedRef.current = merged.locked;
          now.contentWindow.postMessage({ source: 'preview-storage-init', data: merged.store, ...extra }, '*');
        };
        const r = remoteOpt.current;
        if (!r?.wanted || !isSketchKey(r.key)) { reply({}); return; }
        // The runner asks every 40 ms until it hears back; answer the first ask
        // with 'wait' and the init once the account's saves are here.
        if (waitingRef.current === e.source) return;
        waitingRef.current = e.source;
        frame.contentWindow.postMessage({ source: 'preview-storage-wait' }, '*');
        void remoteState.load(r.key).then((got) => {
          waitingRef.current = null;
          reply(got.state === 'ready' ? { remote: { ...got.data }, remoteState: 'ready' } : { remoteState: got.state });
        });
        return;
      }
      if (d.source !== 'preview-storage') return;

      if (d.remote === true) {
        // A 'remote' save: never written into this browser's store.
        if (typeof d.key === 'string' && typeof d.value === 'string') {
          remoteState.set(d.key, d.value, (message) => {
            const now = ref.current;
            if (now?.contentWindow) now.contentWindow.postMessage({ source: 'preview-storage-remote-error', message }, '*');
          });
        }
        return;
      }

      if (d.op === 'clear') {
        writeStore({});
        return;
      }
      if (typeof d.key !== 'string') return;
      if (lockedRef.current.has(d.key)) return;
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
  }, [ref, remoteState]);
}

type RemoteLoad = { state: 'ready'; data: Record<string, string> } | { state: 'signed-out' | 'offline' };

/**
 * One sketch's remote saves for one preview: load once, then keep the map in
 * memory and write it back whole ({ key, data } to PUT /api/sketch-saves) at
 * most every 2 s while it changes, and at once when the page is hidden or the
 * preview goes away (fetch keepalive, so a closing tab still gets it out).
 */
function useRemoteSaves() {
  const stateRef = useRef<{
    key: string | null;
    loaded: Promise<RemoteLoad> | null;
    data: Record<string, string>;
    dirty: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    lastError: string | null;
  }>({ key: null, loaded: null, data: {}, dirty: false, timer: null, lastError: null });
  const api = useRef<{
    load: (k: string) => Promise<RemoteLoad>;
    set: (name: string, value: string, onError: (m: string) => void) => void;
    flush: (keepalive: boolean, onError?: (m: string) => void) => void;
  } | null>(null);

  if (!api.current) {
    const st = stateRef.current;
    const flush = (keepalive: boolean, onError?: (m: string) => void) => {
      if (st.timer) { clearTimeout(st.timer); st.timer = null; }
      if (!st.dirty || !st.key) return;
      st.dirty = false;
      const checked = checkSketchData(st.data);
      if (!checked.ok) { onError?.(checked.error); return; }
      const body = JSON.stringify({ key: st.key, data: checked.data });
      void fetch('/api/sketch-saves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: keepalive && body.length < 60_000,
        credentials: 'same-origin',
      }).then(async (res) => {
        if (res.ok) { st.lastError = null; return; }
        const msg = `Your online save did not go through: ${await errorText(res)}`;
        if (res.status >= 500) st.dirty = true; // try again with the next change
        if (msg !== st.lastError) { st.lastError = msg; onError?.(msg); }
      }).catch(() => {
        st.dirty = true;
        const msg = 'Your account could not be reached, so the last online save is waiting. It is sent with the next save.';
        if (msg !== st.lastError) { st.lastError = msg; onError?.(msg); }
      });
    };
    api.current = {
      load(k: string) {
        if (st.key !== k) {
          flush(true);
          st.key = k; st.data = {}; st.dirty = false; st.loaded = null;
        }
        if (!st.loaded) {
          st.loaded = fetch(`/api/sketch-saves?key=${encodeURIComponent(k)}`, { credentials: 'same-origin' })
            .then(async (res): Promise<RemoteLoad> => {
              if (res.status === 401 || res.status === 403) return { state: 'signed-out' };
              if (!res.ok) return { state: 'offline' };
              const body = (await res.json()) as { data?: unknown };
              const checked = checkSketchData(body?.data ?? {});
              // Writes made while the fetch was out win over what it brought back.
              st.data = { ...(checked.ok ? checked.data : {}), ...st.data };
              return { state: 'ready', data: st.data };
            })
            .catch((): RemoteLoad => ({ state: 'offline' }))
            .then((got) => {
              if (got.state !== 'ready') st.loaded = null; // ask again on the next run
              return got;
            });
        }
        return st.loaded.then((got) => (got.state === 'ready' ? { state: 'ready', data: st.data } : got));
      },
      set(name: string, value: string, onError: (m: string) => void) {
        st.data[name] = value;
        st.dirty = true;
        if (!st.timer) st.timer = setTimeout(() => { st.timer = null; flush(false, onError); }, 2000);
      },
      flush,
    };
  }

  // Out at once when the tab is hidden or closed, and when this preview goes.
  useEffect(() => {
    const out = () => api.current?.flush(true);
    const onHide = () => { if (document.visibilityState === 'hidden') out(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', out);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', out);
      out();
    };
  }, []);
  return api.current;
}
