// The Games library (migration 0042: library_games, library_game_shares).
// A student publishes a moSHion sketch as a game; the owner shares it into the
// classes they are in, where classmates can play and remix it, and a teacher
// of the class can hide it or take it out. Same rules as the texture and sound
// library (functions/_shared/libraryShare.ts), which this reuses for "which
// classes" and "how a name shows".
//
// Who sees a game is decided here and nowhere else:
//   - the owner always sees their own live games;
//   - a student sees a game shared into a class they are ENROLLED in now
//     (unexpired, class not archived), never a hidden one;
//   - a teacher or co-teacher of the class (or an admin) sees every game shared
//     into it, hidden ones included and marked.
// Anything else answers 404, the same as an id that does not exist. No route
// ever returns an email: a publisher shows as first name + last initial.

import { ownerLabel, studentClassIds, teacherClassIds } from './libraryShare';

export type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

export interface GameRow {
  id: string;
  owner_email: string;
  title: string;
  code: string;
  mode: string;
  players: number;
  created_at: number;
  updated_at: number;
}

export interface SharedGameRow {
  id: string;
  title: string;
  mode: string;
  players: number;
  bytes: number;
  owner_email: string;
  first_name: string | null;
  last_name: string | null;
  class_id: string;
  class_name: string;
  shared_at: number;
  updated_at: number;
  hidden_at: number | null;
}

/** Every class the caller is in now: enrolled, plus taught for a teacher or admin. */
export async function callerClasses(db: D1Database, data: SessionData): Promise<{ all: string[]; teaches: Set<string> }> {
  const asStudent = await studentClassIds(db, data.email);
  const asTeacher = data.role === 'student' ? [] : await teacherClassIds(db, data.email);
  return { all: [...new Set([...asStudent, ...asTeacher])], teaches: new Set(asTeacher) };
}

/** Every live game shared into any of `classIds` (no code, only its length). */
export async function gamesSharedInto(db: D1Database, classIds: string[]): Promise<SharedGameRow[]> {
  if (!classIds.length) return [];
  const marks = classIds.map(() => '?').join(',');
  const r = await db.prepare(
    `SELECT g.id, g.title, g.mode, g.players, LENGTH(g.code) AS bytes, g.owner_email,
            st.first_name, st.last_name, s.class_id, c.name AS class_name, s.shared_at,
            g.updated_at, s.hidden_at
       FROM library_game_shares s
       JOIN library_games g ON g.id = s.game_id AND g.deleted_at IS NULL
       JOIN classes c ON c.id = s.class_id
       LEFT JOIN students st ON st.email = g.owner_email
      WHERE s.class_id IN (${marks})
      ORDER BY s.shared_at DESC`,
  ).bind(...classIds).all<SharedGameRow>();
  return r.results ?? [];
}

export async function ownerName(db: D1Database, email: string): Promise<string> {
  const st = await db.prepare(`SELECT first_name, last_name FROM students WHERE email = ?`)
    .bind(email).first<{ first_name: string | null; last_name: string | null }>();
  return ownerLabel(st?.first_name ?? null, st?.last_name ?? null);
}

/**
 * One game the caller may open (play or remix), or null. `hidden` is true only
 * for a teacher looking at a game they hid; a student never gets one.
 */
export async function visibleGame(db: D1Database, data: SessionData, id: string): Promise<{ row: GameRow; mine: boolean; hidden: boolean } | null> {
  const row = await db.prepare(
    `SELECT id, owner_email, title, code, mode, players, created_at, updated_at
       FROM library_games WHERE id = ? AND deleted_at IS NULL`,
  ).bind(id).first<GameRow>();
  if (!row) return null;
  if (row.owner_email === data.email) return { row, mine: true, hidden: false };
  const { all, teaches } = await callerClasses(db, data);
  if (!all.length) return null;
  const marks = all.map(() => '?').join(',');
  const shares = await db.prepare(
    `SELECT class_id, hidden_at FROM library_game_shares WHERE game_id = ? AND class_id IN (${marks})`,
  ).bind(id, ...all).all<{ class_id: string; hidden_at: number | null }>();
  const rows = shares.results ?? [];
  if (rows.some((s) => s.hidden_at == null)) return { row, mine: false, hidden: false };
  if (rows.some((s) => teaches.has(s.class_id)) || (rows.length && data.role === 'admin')) {
    return { row, mine: false, hidden: true };
  }
  return null;
}

/**
 * The classes through which the caller sees a game they do not own: the game
 * is shared into the class, the caller is in it now, and the share is not
 * hidden (a teacher of that class, or an admin, also sees it through a hidden
 * one, matching visibleGame). Empty for anyone visibleGame would refuse.
 */
export async function gameClassesFor(db: D1Database, data: SessionData, gameId: string): Promise<string[]> {
  const { all, teaches } = await callerClasses(db, data);
  if (!all.length) return [];
  const marks = all.map(() => '?').join(',');
  const shares = await db.prepare(
    `SELECT class_id, hidden_at FROM library_game_shares WHERE game_id = ? AND class_id IN (${marks})`,
  ).bind(gameId, ...all).all<{ class_id: string; hidden_at: number | null }>();
  return (shares.results ?? [])
    .filter((s) => s.hidden_at == null || teaches.has(s.class_id) || data.role === 'admin')
    .map((s) => s.class_id);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
