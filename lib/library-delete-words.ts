// The words a teacher reads when deleting a student's shared picture, sound or
// game, or clearing a student's whole Library (components/ClassLibraryModeration.tsx,
// ClassGamesModeration.tsx, ClearStudentLibrary.tsx). Pure, so the test can pin them.

/** "Sam W." -> "Sam"; the server's "A classmate" (no name on the account) -> null. */
export function firstOfLabel(label: string): string | null {
  const t = label.trim();
  if (!t || t === 'A classmate') return null;
  const first = t.split(/\s+/)[0];
  // "W." alone is a last initial, not a name to address someone by.
  return /^[A-Za-z]\.$/.test(first) ? null : first;
}

/** "Sam", or "the student" / "The student" when the account has no first name. */
export function who(first: string | null, capital = false): string {
  return first ?? (capital ? 'The student' : 'the student');
}

export function deleteItemConfirm(owner: string, kind: 'texture' | 'sound', name: string): { title: string; message: string } {
  const first = firstOfLabel(owner);
  const noun = kind === 'texture' ? 'picture' : 'sound';
  return {
    title: `Delete ${owner}'s ${noun} "${name}"?`,
    message: `It is gone from ${who(first)}'s Library too, on every computer, and from any game that used it. ${who(first, true)} is not told why.\n`
      + `Copies classmates already made stay theirs. This can't be undone.`,
  };
}

export function deleteGameConfirm(owner: string, title: string): { title: string; message: string } {
  const first = firstOfLabel(owner);
  return {
    title: `Delete ${owner}'s game "${title}"?`,
    message: `It is gone from ${who(first)}'s Library too, on every computer, and classmates can no longer play or remix it. ${who(first, true)} is not told why.\n`
      + `Copies classmates already remixed stay theirs. This can't be undone.`,
  };
}

export interface ClearCounts {
  pictures: number;
  sounds: number;
  images: number;
  games: number;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export function clearLibraryConfirm(label: string, first: string | null): { title: string; message: string } {
  return {
    title: `Clear ${label}'s Library?`,
    message: `This deletes every picture, sound, uploaded image and published game ${who(first)} has, on every computer they use. `
      + `Their games and sketches will show plain boxes and broken pictures where those were, and classmates can no longer play their games. `
      + `${who(first, true)} is not told why.\nTheir lessons, grades and saved code are not touched. This can't be undone.`,
  };
}

/** "Cleared Sam W.'s Library: 12 pictures, 3 sounds, 2 images, 1 game." */
export function clearedSentence(label: string, c: ClearCounts): string {
  if (!c.pictures && !c.sounds && !c.images && !c.games) return `${label}'s Library was already empty.`;
  return `Cleared ${label}'s Library: ${plural(c.pictures, 'picture')}, ${plural(c.sounds, 'sound')}, ${plural(c.images, 'image')}, ${plural(c.games, 'game')}.`;
}
