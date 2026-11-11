// Rules for the texture, sound and font library (functions/api/library/*),
// shared by the routes and their test. See migrations/0039_library.sql and
// 0050_library_fonts.sql (fonts, 2026-11-12).

import { sniffImageType } from './uploads';

export type LibraryKind = 'texture' | 'sound' | 'font';

/** Per item, measured on the data URI the browser stores. Mirrors lib/moshion-storage.ts. */
// A font is 150 KB of file at most and 500 KB of files per account (the
// owner's decision, 2026-11-12): fonts sit in the same browser localStorage as
// lesson drafts, pictures and sounds, and that holds ~5 million characters per
// site. A data URI is 4/3 of the file plus its prefix, hence the odd numbers.
export const FONT_FILE_MAX = 150 * 1024;
export const FONT_FILES_TOTAL_MAX = 500 * 1024;
export const MAX_ITEM_BYTES: Record<LibraryKind, number> = {
  texture: 64 * 1024,
  sound: 256 * 1024,
  font: Math.ceil(FONT_FILE_MAX * 4 / 3) + 64,
};
/** Per account, live items only. */
export const MAX_TOTAL_BYTES: Record<LibraryKind, number> = {
  texture: 1024 * 1024,
  sound: 2 * 1024 * 1024,
  font: Math.ceil(FONT_FILES_TOTAL_MAX * 4 / 3) + 64,
};

/** The file size a data URI of `n` characters holds, roughly (for messages in KB of file). */
export function fileBytesOf(dataUriLength: number): number {
  return Math.floor(dataUriLength * 3 / 4);
}
export const MAX_ITEMS_PER_KIND = 200;
export const MAX_META_BYTES = 8 * 1024;
/** A font's meta is the Font maker's drawing (lib/font-doc.ts MAX_DOC_BYTES), so it may be larger. */
export function metaLimit(kind: LibraryKind): number {
  return kind === 'font' ? 48 * 1024 : MAX_META_BYTES;
}

/** The same rule the texture editor and the mixer use: a name that is also code. */
export const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

export function isKind(v: unknown): v is LibraryKind {
  return v === 'texture' || v === 'sound' || v === 'font';
}

/** `data:<anything>;base64,<payload>` -> bytes, or null. The declared type is ignored. */
export function decodeDataUri(uri: string): Uint8Array | null {
  const m = /^data:[^,;]*(?:;[^,;]*)*;base64,([A-Za-z0-9+/=]*)$/.exec(uri);
  if (!m) return null;
  try {
    const bin = atob(m[1]);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * The real type of a sound, from its bytes. WAV (RIFF....WAVE), OGG (OggS),
 * MP3 (an ID3 tag, or a bare MPEG audio frame sync). Anything else is null.
 */
export function sniffSoundType(b: Uint8Array): 'audio/wav' | 'audio/ogg' | 'audio/mpeg' | null {
  if (b.length < 12) return null;
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return 'audio/wav';
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'audio/ogg';
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'audio/mpeg';
  // Frame sync: 11 set bits, a valid version (not 01) and layer (not 00).
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && ((b[1] >> 3) & 0x03) !== 0x01 && ((b[1] >> 1) & 0x03) !== 0x00) {
    return 'audio/mpeg';
  }
  return null;
}

/**
 * The real type of a font, from its first four bytes: TrueType (00 01 00 00,
 * or 'true' from old Macs), OpenType with CFF outlines ('OTTO'), WOFF ('wOFF')
 * or WOFF2 ('wOF2'). A font collection ('ttcf') and anything else is null.
 * The browser checks every font again (its font sanitizer) before drawing one.
 */
export function sniffFontType(b: Uint8Array): 'font/ttf' | 'font/otf' | 'font/woff' | 'font/woff2' | null {
  if (b.length < 12) return null;
  const tag = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if ((b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) || tag === 'true') return 'font/ttf';
  if (tag === 'OTTO') return 'font/otf';
  if (tag === 'wOFF') return 'font/woff';
  if (tag === 'wOF2') return 'font/woff2';
  return null;
}

/** The stored MIME for a data URI of this kind, from its bytes; null refuses it. */
export function sniffLibraryItem(kind: LibraryKind, dataUri: string): string | null {
  const bytes = decodeDataUri(dataUri);
  if (!bytes || bytes.length === 0) return null;
  if (kind === 'font') return sniffFontType(bytes);
  return kind === 'texture' ? sniffImageType(bytes) : sniffSoundType(bytes);
}

/** sha-256 hex of the data URI, a NUL, and the meta string. The browser computes the same. */
export async function itemHash(dataUri: string, meta: string | null): Promise<string> {
  const data = new TextEncoder().encode(`${dataUri}\u0000${meta ?? ''}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
}

export function r2Key(id: string): string {
  return `library/${id}`;
}
