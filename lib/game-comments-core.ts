// Comments on class games (migration 0051, owner's decision 2026-11-12): the
// rules and words shared by the routes (functions/api/games/[id]/comments.ts,
// feedback.ts), the teacher's switches (game-shares) and the play page
// (components/GameComments.tsx).
//
// A comment is typed text from someone who can open the game; a reply hangs
// off a top-level comment (one level). The words are checked by the same
// cleanComment() as the proposed-change conversations, so the two cannot
// drift: 1000 characters, 30 lines, no control characters.

export { COMMENT_MAX, cleanComment } from './game-flow-core';

/** A person's comments on all games in one hour, the same allowance as change conversations. */
export const GAME_COMMENTS_PER_HOUR = 40;
/** Live comments one game holds; past it the creator or a teacher clears some first. */
export const GAME_COMMENTS_PER_GAME = 500;

/** Why feedback is closed for this reader, or null when it is open. */
export type FeedbackClosed = 'creator' | 'teacher' | 'hidden' | 'unshared' | null;

/** One comment as the play page receives it. Never an email. */
export interface GameComment {
  id: string;
  parentId: string | null;
  /** First name + last initial, as written at the time. */
  author: string;
  mine: boolean;
  /** Written by the game's creator. */
  byMaker: boolean;
  /** null once deleted (the row stays so its replies keep their place). */
  body: string | null;
  createdAt: number;
  deleted: boolean;
}

/** What GET /api/games/[id]/comments answers. */
export interface GameCommentsView {
  comments: GameComment[];
  /** The reader may add a comment or a reply. */
  canWrite: boolean;
  /** The reader may delete anyone's comment here (a teacher of a class it is shared into, or an admin). */
  canModerate: boolean;
  /** The reader made the game: they hold the switch. */
  isMaker: boolean;
  /** The creator's switch. */
  feedbackOn: boolean;
  closed: FeedbackClosed;
}

/** The words a reader sees for a closed feedback box. */
export function closedText(closed: FeedbackClosed, isMaker: boolean): string {
  if (closed === 'creator') {
    return isMaker
      ? 'Feedback is off for this game: classmates cannot see or add comments or suggestions. You and your teacher can still read what was written.'
      : 'The maker of this game has turned feedback off.';
  }
  if (closed === 'teacher') {
    return isMaker
      ? 'Your teacher has turned feedback off for this game in your class. You can still read what was written.'
      : 'Your teacher has turned feedback off for this game.';
  }
  if (closed === 'hidden') return 'This game is hidden from the class, so nobody can add feedback.';
  if (closed === 'unshared') return isMaker ? 'Share this game with your class to get comments and suggestions.' : '';
  return '';
}
