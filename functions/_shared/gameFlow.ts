// The Games library's change flow on the server (migration 0048, lib/game-flow-core.ts):
// versions of a game, proposed changes and their conversations.
//
// Who sees a proposal is decided here and nowhere else:
//   - its proposer always does (even after leaving the class);
//   - anyone who can open the game (visibleGame: the maker, a classmate in a class it is shared into)
//     AND may see its code (the maker, or the game's choice is not "just play"). That is GitHub's
//     public pull request: a classmate who can remix the game can read and join the conversation;
//   - a teacher of a class the game is shared into, or an admin, sees every proposal and gets the
//     teacher powers (remove a comment, lock, remove the proposal).
// Anything else answers 404, the same as an id that does not exist. No answer to a student ever
// carries an email: every name is first name + last initial, written when the row was.

import { callerClasses, ownerName, visibleGame, type GameRow, type SessionData } from './games';
import { newUploadId } from './uploads';
import { canRemix } from '../../lib/share-choice';
import { VERSIONS_KEPT, type ChangeEvent, type ChangeRole, type ChangeStatus } from '../../lib/game-flow-core';

export { json } from './games';

export interface ChangeRow {
  id: string;
  game_id: string;
  from_email: string;
  from_name: string;
  title: string;
  base_version: number;
  base_code: string;
  code: string;
  status: ChangeStatus;
  locked_at: number | null;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
  accepted_version: number | null;
}

export const CHANGE_COLUMNS =
  'id, game_id, from_email, from_name, title, base_version, base_code, code, status, locked_at, created_at, updated_at, decided_at, accepted_version';

export function newId(): string {
  return newUploadId();
}

/** A game row including its version (0048); null when it does not exist or was deleted. */
export async function gameWithVersion(db: D1Database, id: string): Promise<(GameRow & { version: number }) | null> {
  return db.prepare(
    `SELECT id, owner_email, title, code, mode, players, created_at, updated_at, share_choice, version,
            remixed_from_id, remixed_from_title, remixed_from_author, remixed_from_choice, origin_id, origin_title, origin_author
       FROM library_games WHERE id = ? AND deleted_at IS NULL`,
  ).bind(id).first<GameRow & { version: number }>();
}

/** Does the caller teach a class this game is shared into (hidden shares too), or are they an admin? */
export async function teachesGame(db: D1Database, data: SessionData, gameId: string): Promise<boolean> {
  if (data.role === 'admin') return true;
  if (data.role === 'student') return false;
  const { teaches } = await callerClasses(db, data);
  if (!teaches.size) return false;
  const ids = [...teaches];
  const r = await db.prepare(
    `SELECT 1 AS x FROM library_game_shares WHERE game_id = ? AND class_id IN (${ids.map(() => '?').join(',')}) LIMIT 1`,
  ).bind(gameId, ...ids).first();
  return !!r;
}

/**
 * May the caller see the game's proposals and versions (its code), and as whom? null = 404.
 * `game` is null when the game was deleted; only the proposer (handled by changeAccess) still sees
 * a proposal then.
 */
export async function gameAccess(db: D1Database, data: SessionData, gameId: string): Promise<{
  game: GameRow & { version: number };
  maker: boolean;
  teacher: boolean;
} | null> {
  const game = await gameWithVersion(db, gameId);
  if (!game) return null;
  const maker = game.owner_email === data.email;
  const teacher = !maker && await teachesGame(db, data, gameId);
  if (maker || teacher) return { game, maker, teacher };
  const seen = await visibleGame(db, data, gameId);
  if (!seen || seen.hidden) return null;
  if (!canRemix(game.share_choice)) return null;
  return { game, maker: false, teacher: false };
}

/** One proposal the caller may see, with their part in it; null = 404. */
export async function changeAccess(db: D1Database, data: SessionData, changeId: string): Promise<{
  change: ChangeRow;
  game: (GameRow & { version: number }) | null;
  role: ChangeRole;
} | null> {
  const change = await db.prepare(`SELECT ${CHANGE_COLUMNS} FROM game_changes WHERE id = ?`).bind(changeId).first<ChangeRow>();
  if (!change) return null;
  const proposer = change.from_email === data.email;
  const access = await gameAccess(db, data, change.game_id);
  if (!access && !proposer) return null;
  // A removed proposal is gone for students other than its proposer; teachers still see it.
  if (change.status === 'removed' && !proposer && !access?.teacher) return null;
  const game = access?.game ?? await gameWithVersion(db, change.game_id);
  return {
    change,
    game,
    role: { maker: !!access?.maker, proposer, teacher: !!access?.teacher },
  };
}

/** The status a reader should see: an open proposal on a deleted game reads as closed. */
export function statusFor(change: ChangeRow, game: unknown): ChangeStatus {
  return change.status === 'open' && !game ? 'closed' : change.status;
}

/** The caller's name as the conversation shows it. */
export function nameOf(db: D1Database, email: string): Promise<string> {
  return ownerName(db, email);
}

/** A conversation event (accepted, locked, ...) as a row. */
export function eventStmt(db: D1Database, changeId: string, kind: ChangeEvent, email: string, name: string, now: number, extra: number | null = null): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO game_change_comments (id, change_id, kind, author_email, author_name, body, extra, created_at)
     VALUES (?, ?, 'event', ?, ?, ?, ?, ?)`,
  ).bind(newId(), changeId, email, name, kind, extra, now);
}

export function commentStmt(db: D1Database, changeId: string, email: string, name: string, body: string, now: number): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO game_change_comments (id, change_id, kind, author_email, author_name, body, created_at)
     VALUES (?, ?, 'comment', ?, ?, ?, ?)`,
  ).bind(newId(), changeId, email, name, body, now);
}

/**
 * The statements that save a new version of a game, for one D1 batch. They succeed together or not
 * at all, and only when the game is still at `expectVersion`:
 *   1. a game from before 0048 has no version rows: its current code becomes version 1 first;
 *   2. the game's code (and `set` columns) change and its version goes up by one, only if it is at
 *      `expectVersion` (someone else saving in between leaves it untouched);
 *   3. the version row is written only when step 2 happened. If someone else saved in between, their
 *      version row already holds that number and the INSERT fails the whole batch (the caller answers
 *      409); if the game was deleted, nothing is written (the caller checks afterwards);
 *   4. versions older than the newest VERSIONS_KEPT go.
 */
export function saveVersionStmts(db: D1Database, v: {
  gameId: string;
  expectVersion: number;
  code: string;
  mode: string;
  players: number;
  message: string;
  authorEmail: string;
  authorName: string;
  ownerName: string;
  changeId?: string | null;
  now: number;
  set?: { title?: string; share_choice?: string };
}): D1PreparedStatement[] {
  const extraCols = Object.entries(v.set ?? {}).filter(([, val]) => val !== undefined);
  const extraSql = extraCols.map(([k]) => `, ${k} = ?`).join('');
  return [
    db.prepare(
      `INSERT OR IGNORE INTO library_game_versions (game_id, version, code, message, author_email, author_name, change_id, created_at)
       SELECT id, version, code, 'First version', owner_email, ?, NULL, created_at
         FROM library_games WHERE id = ? AND deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM library_game_versions WHERE game_id = ?)`,
    ).bind(v.ownerName, v.gameId, v.gameId),
    db.prepare(
      `UPDATE library_games SET code = ?, mode = ?, players = ?, version = version + 1, updated_at = ?${extraSql}
        WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    ).bind(v.code, v.mode, v.players, v.now, ...extraCols.map(([, val]) => val as string), v.gameId, v.expectVersion),
    db.prepare(
      `INSERT INTO library_game_versions (game_id, version, code, message, author_email, author_name, change_id, created_at)
       SELECT id, version, ?, ?, ?, ?, ?, ? FROM library_games
        WHERE id = ? AND version = ? AND code = ? AND deleted_at IS NULL`,
    ).bind(v.code, v.message, v.authorEmail, v.authorName, v.changeId ?? null, v.now, v.gameId, v.expectVersion + 1, v.code),
    db.prepare(
      `DELETE FROM library_game_versions
        WHERE game_id = ? AND version <= (SELECT version FROM library_games WHERE id = ?) - ?`,
    ).bind(v.gameId, v.gameId, VERSIONS_KEPT),
  ];
}

/** Version 1 of a brand-new game. */
export function firstVersionStmt(db: D1Database, gameId: string, code: string, authorEmail: string, authorName: string, now: number): D1PreparedStatement {
  return db.prepare(
    `INSERT OR IGNORE INTO library_game_versions (game_id, version, code, message, author_email, author_name, change_id, created_at)
     VALUES (?, 1, ?, 'First version', ?, ?, NULL, ?)`,
  ).bind(gameId, code, authorEmail, authorName, now);
}

/** After a save batch: did it land? (the game is at `expectVersion + 1` with that code). */
export async function savedAs(db: D1Database, gameId: string, expectVersion: number, code: string): Promise<boolean> {
  const r = await db.prepare(
    `SELECT 1 AS x FROM library_game_versions WHERE game_id = ? AND version = ? AND code = ?`,
  ).bind(gameId, expectVersion + 1, code).first();
  return !!r;
}

/** The code of one kept version, or null. */
export async function versionCode(db: D1Database, gameId: string, version: number): Promise<string | null> {
  if (!Number.isInteger(version) || version < 1) return null;
  const r = await db.prepare(`SELECT code FROM library_game_versions WHERE game_id = ? AND version = ?`)
    .bind(gameId, version).first<{ code: string }>();
  return r?.code ?? null;
}

/** "With changes by ...": the proposers whose changes were accepted into the kept versions, oldest first. */
export async function contributorsOf(db: D1Database, gameId: string): Promise<string[]> {
  const r = await db.prepare(
    `SELECT author_name FROM library_game_versions WHERE game_id = ? AND change_id IS NOT NULL ORDER BY version`,
  ).bind(gameId).all<{ author_name: string }>();
  return [...new Set((r.results ?? []).map((x) => x.author_name))];
}

/** How many open proposals each of these games has (for the Library's cards). */
export async function openChangeCounts(db: D1Database, gameIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < gameIds.length; i += 90) {
    const part = gameIds.slice(i, i + 90);
    if (!part.length) continue;
    const r = await db.prepare(
      `SELECT game_id, COUNT(*) AS n FROM game_changes WHERE status = 'open' AND game_id IN (${part.map(() => '?').join(',')}) GROUP BY game_id`,
    ).bind(...part).all<{ game_id: string; n: number }>();
    for (const row of r.results ?? []) out.set(row.game_id, row.n);
  }
  return out;
}

/**
 * When a game is deleted: its open proposals close, with an event in each conversation. `where` picks
 * the games (SQL on library_games aliased g) and `bind` its values.
 */
export function closeChangesStmts(db: D1Database, where: string, bind: unknown[], now: number): D1PreparedStatement[] {
  return [
    db.prepare(
      `INSERT INTO game_change_comments (id, change_id, kind, author_email, author_name, body, created_at)
       SELECT lower(hex(randomblob(16))), c.id, 'event', '', '', 'closed', ?
         FROM game_changes c JOIN library_games g ON g.id = c.game_id
        WHERE c.status = 'open' AND ${where}`,
    ).bind(now, ...bind),
    db.prepare(
      `UPDATE game_changes SET status = 'closed', decided_at = ?, updated_at = ?
        WHERE status = 'open' AND game_id IN (SELECT g.id FROM library_games g WHERE ${where})`,
    ).bind(now, now, ...bind),
  ];
}
