// POST /api/games/[id]/feedback  { on: boolean }  — the creator's "Let classmates give feedback" switch
//
// Migration 0051. Owner only: anyone else (a classmate, a teacher) gets 404, as
// for every owner-only game route, so ids cannot be probed. Off closes BOTH
// comments and suggestions for classmates (functions/_shared/gameComments.ts);
// the creator and the class's teachers still read what was written. Teachers
// have their own switches in /api/classes/[id]/game-shares.

import { json, type SessionData } from '../../../_shared/games';
import { isGameId } from '../../../../lib/games-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const gameId = String(params.id);
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  let body: { on?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (typeof body.on !== 'boolean') return json({ error: 'on must be true or false' }, 400);
  const res = await env.DB.prepare(
    `UPDATE library_games SET feedback_on = ? WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(body.on ? 1 : 0, gameId, data.email).run();
  if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true, feedbackOn: body.on });
};
