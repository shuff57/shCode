// Who may read and write feedback on a game (comments and suggestions):
// migration 0051. ONE rule, used by GET|POST|DELETE /api/games/[id]/comments,
// the suggestions route and the creator's switch, so the comment box and the
// suggestion buttons can never disagree.
//
//   seen      visibleGame(): the game exists and the reader may open it, else 404.
//   open      the creator's switch is on, and the game is shared, not hidden,
//             into a class the reader sees it through (for the creator: any
//             class it is shared into) whose teacher has not turned feedback
//             off for this game or for the whole class.
//   canWrite  open.
//   canRead   open, or the reader made the game, or the reader moderates it.
//   moderate  a teacher of a class the game is shared into, or an admin.

import { callerClasses, gameClassesFor, visibleGame, type SessionData } from './games';
import type { FeedbackClosed } from '../../lib/game-comments-core';

interface ShareRow {
  class_id: string;
  hidden_at: number | null;
  feedback_off_at: number | null;
  class_off: number | null;
}

export interface FeedbackState {
  gameId: string;
  ownerEmail: string;
  isMaker: boolean;
  feedbackOn: boolean;
  canWrite: boolean;
  canRead: boolean;
  canModerate: boolean;
  closed: FeedbackClosed;
}

/** The feedback rules for this reader on this game, or null when they may not open it (answer 404). */
export async function feedbackState(db: D1Database, data: SessionData, gameId: string): Promise<FeedbackState | null> {
  const seen = await visibleGame(db, data, gameId);
  if (!seen) return null;
  const game = await db.prepare(`SELECT feedback_on FROM library_games WHERE id = ?`).bind(gameId).first<{ feedback_on: number | null }>();
  const feedbackOn = (game?.feedback_on ?? 1) !== 0;

  const shares = (await db.prepare(
    `SELECT s.class_id, s.hidden_at, s.feedback_off_at, c.game_feedback_off AS class_off
       FROM library_game_shares s JOIN classes c ON c.id = s.class_id
      WHERE s.game_id = ?`,
  ).bind(gameId).all<ShareRow>()).results ?? [];

  // The classes this reader sees the game through (the creator: every class it is in).
  let through: Set<string>;
  let teaches = new Set<string>();
  if (seen.mine) {
    through = new Set(shares.map((s) => s.class_id));
    if (data.role !== 'student') teaches = (await callerClasses(db, data)).teaches;
  } else {
    const [mine, cls] = await Promise.all([gameClassesFor(db, data, gameId), callerClasses(db, data)]);
    through = new Set(mine);
    teaches = cls.teaches;
  }
  const mineShares = shares.filter((s) => through.has(s.class_id));
  const canModerate = data.role === 'admin' || mineShares.some((s) => teaches.has(s.class_id));

  const visible = mineShares.filter((s) => s.hidden_at == null);
  const openShares = visible.filter((s) => s.feedback_off_at == null && !s.class_off);
  let closed: FeedbackClosed = null;
  if (!feedbackOn) closed = 'creator';
  else if (!mineShares.length) closed = 'unshared';
  else if (!visible.length) closed = 'hidden';
  else if (!openShares.length) closed = 'teacher';

  const canWrite = closed === null;
  return {
    gameId,
    ownerEmail: seen.row.owner_email,
    isMaker: seen.mine,
    feedbackOn,
    canWrite,
    canRead: canWrite || seen.mine || canModerate,
    canModerate,
    closed,
  };
}
