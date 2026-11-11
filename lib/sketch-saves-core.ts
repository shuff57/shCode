// The rules for a sketch's 'remote' saves (#97), shared by the route
// (functions/api/sketch-saves.ts) and the browser (lib/moshion-storage.ts), so
// the browser can refuse a save the server would refuse, in the same words.
//
// The data is the same shape as the browser store a sketch already uses:
// name -> the value's JSON text (moSHion's storeItem() stringifies). The route
// never parses a value; it only counts and measures.

/** A preview's game key: lesson ids, 'sandbox', 'game-<id>', 'demo-<fence>'. */
export const SKETCH_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
export const MAX_NAMES = 100;
export const MAX_NAME_LENGTH = 100;
export const MAX_VALUE_BYTES = 16 * 1024;
export const MAX_TOTAL_BYTES = 64 * 1024;
/** Sketches with remote saves per account. A new one past this is refused. */
export const MAX_SKETCHES = 200;

export type SketchData = Record<string, string>;

function utf8Length(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function isSketchKey(v: unknown): v is string {
  return typeof v === 'string' && SKETCH_KEY_RE.test(v);
}

/** Validate a whole data map. Returns the error in a student's words, or null. */
export function checkSketchData(v: unknown): { ok: true; data: SketchData } | { ok: false; error: string } {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, error: 'Saved data must be a set of names and values.' };
  const out: SketchData = {};
  const names = Object.keys(v as object);
  if (names.length > MAX_NAMES) {
    return { ok: false, error: `A sketch can save at most ${MAX_NAMES} different names online.` };
  }
  for (const name of names) {
    const value = (v as Record<string, unknown>)[name];
    if (!name || name.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `A save name must be 1 to ${MAX_NAME_LENGTH} characters.` };
    }
    if (typeof value !== 'string') return { ok: false, error: `The value saved as "${name}" is not readable.` };
    if (utf8Length(value) > MAX_VALUE_BYTES) {
      return { ok: false, error: `"${name}" is too big to save online (over ${MAX_VALUE_BYTES / 1024} KB).` };
    }
    out[name] = value;
  }
  if (utf8Length(JSON.stringify(out)) > MAX_TOTAL_BYTES) {
    return { ok: false, error: `This sketch's online saves are over ${MAX_TOTAL_BYTES / 1024} KB in total.` };
  }
  return { ok: true, data: out };
}

/** Does this code mention remote saving at all? Then the page loads it before the sketch runs. */
export function wantsRemote(code: string): boolean {
  return /(['"`])remote\1/.test(code);
}
