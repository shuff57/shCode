// A teacher deleting what a student made (not just hiding it): one shared
// picture or sound, one shared game, or the student's whole Library.
//
// Routes: functions/api/classes/[id]/library-delete.ts, game-delete.ts and
// clear-library.ts. The rules live here so the three cannot drift:
//   - the caller owns or co-teaches the class, or is an admin; a student never;
//   - the target belongs to a role='student' account ENROLLED in that class now
//     (unexpired). A teacher's or an admin's things are never touched here;
//   - a delete is the owner's own delete, done for them: a tombstone row
//     (deleted_at) so the student's other computers drop their copy on the next
//     sync, every share of it removed, and the bytes removed from R2.
// Nothing new is logged.

import { canManageClass } from './classAuth';
import { r2Key } from './library';

export type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** null when the caller may manage this class; otherwise the refusal to send. */
export async function refuseUnlessClassTeacher(db: D1Database, data: SessionData, classId: string): Promise<Response | null> {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(db, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  return null;
}

export type StudentStanding = 'ok' | 'not-enrolled' | 'no-account' | 'not-student';

/** Is `email` a student account enrolled (unexpired) in this class right now? */
export async function studentStanding(db: D1Database, classId: string, email: string, now = Date.now()): Promise<StudentStanding> {
  const enrolled = await db.prepare(
    `SELECT 1 AS x FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?`,
  ).bind(classId, email, now).first<{ x: number }>();
  if (!enrolled) return 'not-enrolled';
  const st = await db.prepare(`SELECT role FROM students WHERE email = ?`).bind(email).first<{ role: string }>();
  if (!st) return 'no-account';
  return st.role === 'student' ? 'ok' : 'not-student';
}

/** Emails of the student accounts enrolled (unexpired) in this class: whose things a teacher may delete. */
export async function deletableOwners(db: D1Database, classId: string, now = Date.now()): Promise<Set<string>> {
  const r = await db.prepare(
    `SELECT e.student_email AS email FROM enrollments e JOIN students s ON s.email = e.student_email
      WHERE e.class_id = ? AND e.expires_at > ? AND s.role = 'student'`,
  ).bind(classId, now).all<{ email: string }>();
  return new Set((r.results ?? []).map((x) => x.email));
}

/** R2 deletes in one call per 1000 keys (the binding's limit), so a big clear stays a few subrequests. */
export async function deleteObjects(bucket: R2Bucket | undefined, keys: string[]): Promise<void> {
  if (!bucket || !keys.length) return;
  for (let i = 0; i < keys.length; i += 1000) {
    // The rows went first, so a failure here leaves an object nobody can list, never a live item with no bytes.
    await bucket.delete(keys.slice(i, i + 1000)).catch(() => {});
  }
}

/** Tombstone one library item for its owner, unshare it everywhere, remove its bytes. */
export async function deleteLibraryItemFor(db: D1Database, bucket: R2Bucket | undefined, owner: string, id: string, now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE library_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`)
      .bind(now, now, id, owner),
    db.prepare(`DELETE FROM library_shares WHERE item_id = ?`).bind(id),
  ]);
  await deleteObjects(bucket, [r2Key(id)]);
}

/** Tombstone one game for its owner and take it out of every class. Games have no bytes in R2. */
export async function deleteGameFor(db: D1Database, owner: string, id: string, now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE library_games SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`)
      .bind(now, now, id, owner),
    db.prepare(`DELETE FROM library_game_shares WHERE game_id = ?`).bind(id),
  ]);
}

export interface ClearCounts {
  pictures: number;
  sounds: number;
  images: number;
  games: number;
}

/**
 * Every picture, sound, uploaded image and published game of one account:
 * library items and games become tombstones (their shares go), upload rows are
 * deleted, and every R2 object behind them is removed. One D1 batch, so a
 * half-cleared library is not a state this can leave behind.
 */
export async function clearLibraryOf(db: D1Database, bucket: R2Bucket | undefined, owner: string, now = Date.now()): Promise<ClearCounts> {
  const items = (await db.prepare(
    `SELECT id, kind FROM library_items WHERE owner_email = ? AND deleted_at IS NULL`,
  ).bind(owner).all<{ id: string; kind: string }>()).results ?? [];
  const games = await db.prepare(
    `SELECT COUNT(*) AS n FROM library_games WHERE owner_email = ? AND deleted_at IS NULL`,
  ).bind(owner).first<{ n: number }>();
  const uploads = (await db.prepare(`SELECT id FROM uploads WHERE owner_email = ?`).bind(owner).all<{ id: string }>()).results ?? [];

  await db.batch([
    db.prepare(`DELETE FROM library_shares WHERE item_id IN (SELECT id FROM library_items WHERE owner_email = ?)`).bind(owner),
    db.prepare(`UPDATE library_items SET deleted_at = ?, updated_at = ? WHERE owner_email = ? AND deleted_at IS NULL`).bind(now, now, owner),
    db.prepare(`DELETE FROM library_game_shares WHERE game_id IN (SELECT id FROM library_games WHERE owner_email = ?)`).bind(owner),
    db.prepare(`UPDATE library_games SET deleted_at = ?, updated_at = ? WHERE owner_email = ? AND deleted_at IS NULL`).bind(now, now, owner),
    db.prepare(`DELETE FROM uploads WHERE owner_email = ?`).bind(owner),
  ]);
  // Library bytes live under library/<id>; an upload's key is its bare id (functions/api/uploads/*).
  await deleteObjects(bucket, [...items.map((i) => r2Key(i.id)), ...uploads.map((u) => u.id)]);

  return {
    pictures: items.filter((i) => i.kind === 'texture').length,
    sounds: items.filter((i) => i.kind === 'sound').length,
    images: uploads.length,
    games: games?.n ?? 0,
  };
}
