// Importing a short clip into the sound mixer (#85): an MP3, WAV or OGG file
// the student already has becomes a saved sound that `loadSound('name')`
// plays, and that the library sync carries to their account.
//
// The type comes from the file's bytes, the same rule the account library
// enforces (functions/_shared/library.ts sniffSoundType): a file merely NAMED
// .mp3 is refused, which is also how a renamed web page is kept out.

export type ClipType = 'audio/wav' | 'audio/ogg' | 'audio/mpeg';

/** Saved sounds are capped at 256 KB as stored (lib/moshion-storage.ts): a JSON-quoted data URI. */
export const MAX_SAVED_SOUND_CHARS = 256 * 1024;

export function sniffClip(b: Uint8Array): ClipType | null {
  if (b.length < 12) return null;
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return 'audio/wav';
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'audio/ogg';
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'audio/mpeg';
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && ((b[1] >> 3) & 0x03) !== 0x01 && ((b[1] >> 1) & 0x03) !== 0x00) {
    return 'audio/mpeg';
  }
  return null;
}

export const CLIP_EXTENSION: Record<ClipType, string> = {
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
};

/** The largest file that still fits once saved (base64 grows it by a third). */
export function maxClipBytes(type: ClipType): number {
  const prefix = `"data:${type};base64,"`.length;
  // base64 writes whole 4-character groups, each carrying 3 bytes.
  return Math.floor((MAX_SAVED_SOUND_CHARS - prefix) / 4) * 3;
}

/** A code-safe name from a file name: `Big Jump!.mp3` -> `Big_Jump`, never clashing with `taken`. */
export function clipName(fileName: string, taken: Set<string>): string {
  let base = fileName.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[A-Za-z]/.test(base)) base = `clip${base ? '_' + base : ''}`;
  base = base.slice(0, 40);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = base.slice(0, 40 - String(n).length) + n;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Bytes -> data URI, in chunks so a 190 KB clip does not blow the call stack. */
export function toDataUri(type: ClipType, bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${type};base64,${btoa(bin)}`;
}

export type ImportResult =
  | { ok: true; type: ClipType; dataUri: string }
  | { ok: false; error: string };

/** Check a chosen file and turn it into a data URI, or say in plain words why not. */
export function prepareClip(bytes: Uint8Array): ImportResult {
  const type = sniffClip(bytes);
  if (!type) return { ok: false, error: 'That file is not an MP3, WAV or OGG sound.' };
  const max = maxClipBytes(type);
  if (bytes.length > max) {
    return {
      ok: false,
      error: `That clip is ${Math.round(bytes.length / 1024)} KB; the most a saved sound can be is about ${Math.floor(max / 1024)} KB. Trim it shorter or save it as a smaller MP3.`,
    };
  }
  return { ok: true, type, dataUri: toDataUri(type, bytes) };
}
