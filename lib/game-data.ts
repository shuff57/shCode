// Game data only: the one rule for what a move in an online game room may
// hold (decided by the course owner 2026-11-07). The polling routes
// (functions/api/rooms/*) and the real-time rooms (lib/live-protocol.ts, used by
// the Durable Object in workers/live/ and the dev server's stand-in) all call
// this, so a move refused in one is refused in the other.

export const MAX_EVENT_BYTES = 1024;
export const MAX_STRING = 20;
/** All the words in one move together: room for a few labels, not for a sentence. */
export const MAX_TEXT_PER_MOVE = 24;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,19}$/;

/**
 * Game data only. A value is null, a boolean, a finite number, a one-word
 * string (no spaces) of at most MAX_STRING characters, or an array / object of
 * those, with at most MAX_TEXT_PER_MOVE characters of words in the whole move (object keys are
 * identifiers), nested at most 4 deep, MAX_EVENT_BYTES as JSON. Returns the
 * reason in the course's words, or null when it is fine.
 */
export function checkGameData(v: unknown): string | null {
  let text = 0;
  function walk(x: unknown, depth: number): string | null {
    if (x === null || typeof x === 'boolean') return null;
    if (typeof x === 'number') return Number.isFinite(x) ? null : 'Numbers must be ordinary numbers.';
    if (typeof x === 'string') {
      if (/\s/.test(x)) return 'A word in a move cannot have spaces: a move is game data (numbers, true/false, one-word labels), not a message.';
      text += x.length;
      return x.length <= MAX_STRING ? null : `Words in a move can be at most ${MAX_STRING} letters. Send numbers, true/false and short words.`;
    }
    if (depth >= 4) return 'A move can be nested at most 4 levels deep.';
    if (Array.isArray(x)) {
      if (x.length > 64) return 'A list in a move can hold at most 64 items.';
      for (const y of x) { const e = walk(y, depth + 1); if (e) return e; }
      return null;
    }
    if (typeof x === 'object') {
      const keys = Object.keys(x as object);
      if (keys.length > 32) return 'An object in a move can have at most 32 names.';
      for (const k of keys) {
        if (!KEY_RE.test(k)) return `"${k.slice(0, 20)}" cannot be a name in a move: use letters, digits and _ (up to 20).`;
        const e = walk((x as Record<string, unknown>)[k], depth + 1);
        if (e) return e;
      }
      return null;
    }
    return 'A move can only hold numbers, true/false, short words, lists and objects.';
  }
  const e = walk(v, 0);
  if (e) return e;
  if (text > MAX_TEXT_PER_MOVE) return `A move can hold at most ${MAX_TEXT_PER_MOVE} letters of words in all. Send numbers for the game, not messages.`;
  const size = new TextEncoder().encode(JSON.stringify(v)).length;
  if (size > MAX_EVENT_BYTES) return `A move can be at most ${MAX_EVENT_BYTES} bytes; this one is ${size}.`;
  return null;
}
