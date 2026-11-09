// POST /api/classes/[id]/game-delete  { gameId }
//
// A teacher deletes a student's shared game outright (not just hides it).
// Owner, co-teacher or admin of the class only, and only for a game shared into
// THIS class by a student enrolled in it now; a teacher's or an admin's game is
// refused. The delete is the student's own delete done for them: a tombstone
// (deleted_at) and every class share of it removed. Copies classmates already
// remixed are theirs and stay. Rules: functions/_shared/libraryDelete.ts.

import { deleteGameFor, json, refuseUnlessClassTeacher, studentStanding, type SessionData } from '../../../_shared/libraryDelete';
import { isGameId } from '../../../../lib/games-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await refuseUnlessClassTeacher(env.DB, data, classId);
  if (refused) return refused;
  let body: { gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const gameId = String(body.gameId ?? '');
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(
    `SELECT g.id, g.title, g.owner_email FROM library_game_shares s
       JOIN library_games g ON g.id = s.game_id AND g.deleted_at IS NULL
      WHERE s.game_id = ? AND s.class_id = ?`,
  ).bind(gameId, classId).first<{ id: string; title: string; owner_email: string }>();
  if (!row) return json({ error: 'Not found' }, 404);
  if ((await studentStanding(env.DB, classId, row.owner_email)) !== 'ok') {
    return json({ error: 'Only a game shared by a student in this class can be deleted here.' }, 403);
  }
  await deleteGameFor(env.DB, row.owner_email, row.id);
  return json({ ok: true, id: row.id, title: row.title });
};
