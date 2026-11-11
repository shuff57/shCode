// Suggestions on class games (#96). Classmates help a game's author by picking
// from a FIXED list, never typing: the owner decided 2026-11-10 that games stay
// "game data, not chat" (the 2026-11-07 rule for rooms), so a suggestion is an
// id from this list and nothing a student writes is ever stored or shown.
//
// An id is stored in game_suggestions (migration 0047), so ids are never
// renamed or reused; the words may be edited. Add new ones at the end.

export interface Suggestion { id: string; text: string }

export const SUGGESTIONS: readonly Suggestion[] = [
  { id: 'fun', text: 'So fun!' },
  { id: 'art', text: 'Love the art' },
  { id: 'more-levels', text: 'Add more levels' },
  { id: 'more-obstacles', text: 'Add more obstacles' },
  { id: 'more-enemies', text: 'Add more enemies' },
  { id: 'harder', text: 'Make it harder' },
  { id: 'easier', text: 'Make it easier' },
  { id: 'longer', text: 'Make it longer' },
  { id: 'sounds', text: 'Add sounds' },
  { id: 'two-player', text: 'Add a 2-player mode' },
  { id: 'how-to-play', text: 'Show how to play' },
  { id: 'bug', text: 'I found a bug' },
];

const IDS = new Set(SUGGESTIONS.map((s) => s.id));

export function isSuggestionId(v: unknown): v is string {
  return typeof v === 'string' && IDS.has(v);
}

/** What GET /api/games/[id]/suggestions answers. */
export interface SuggestionsView {
  options: readonly Suggestion[];
  /** Suggestion id -> how many people picked it. */
  counts: Record<string, number>;
  /** The caller's own picks. */
  mine: string[];
  /** Who picked what (first name + last initial), for the author and the class's teachers only. */
  who?: Record<string, string[]>;
  /** False for the author (and on a hidden game): they read suggestions, they do not make them. */
  canSuggest: boolean;
  /**
   * Why feedback is closed for this reader (migration 0051: the creator's or a
   * teacher's switch), or null/absent when open. Closed to a classmate, counts and
   * picks are not sent; the creator and the class's teachers still see them.
   */
  closed?: 'creator' | 'teacher' | 'hidden' | 'unshared' | null;
}
