// An alias is the handle a person picks for how CLASSMATES see them. The real first and last
// name stay on the account and are what grading and every teacher view use.
// Pure (the server and the account page both import it).
import { findPII } from './pii-check';

export const ALIAS_MIN = 2;
export const ALIAS_MAX = 20;

/** Letters, digits, and single spaces, dots, dashes or underscores between them. */
const ALIAS_SHAPE = /^[\p{L}\p{N}]+(?:[ ._-][\p{L}\p{N}]+)*$/u;

/**
 * Tidy what was typed: `null` clears the alias, a string is the alias to store, `{ error }` is a
 * reason in plain words. Empty or spaces-only clears.
 */
export function cleanAlias(raw: unknown): string | null | { error: string } {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return { error: 'Alias must be text.' };
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if (s.length < ALIAS_MIN) return { error: `An alias needs at least ${ALIAS_MIN} characters.` };
  if (s.length > ALIAS_MAX) return { error: `An alias can be at most ${ALIAS_MAX} characters.` };
  if (!ALIAS_SHAPE.test(s)) return { error: 'Use letters, numbers and single spaces, dots, dashes or underscores.' };
  if (findPII(s)) return { error: 'An alias cannot hold personal details like a phone number or an address.' };
  return s;
}
