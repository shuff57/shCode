// Stars on class games (migration 0052): GitHub's starring, in the plain words
// the rest of the game flow uses (lib/game-flow-core.ts GITHUB_WORD.star names
// the GitHub term once). A star is a toggle: it tells the maker you like the game
// and keeps it in your Starred list in the Library.

/** What GET|POST /api/games/[id]/star answers. */
export interface StarView {
  count: number;
  /** Did the caller star it. */
  starred: boolean;
  /** False only for a teacher looking at a game they hid. */
  canStar: boolean;
  /** Who starred it, newest first ("You" for the caller), first name + last initial; at most 50. */
  by: string[];
}

/** "3 stars" / "1 star" / "No stars yet". */
export function starWords(count: number): string {
  if (!count) return 'No stars yet';
  return `${count} ${count === 1 ? 'star' : 'stars'}`;
}
