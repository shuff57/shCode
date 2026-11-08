// POST /api/games/[id]/share  { share: true | false }
//
// The owner shares one of their own games with every class they are in right
// now (enrolled; a teacher or admin also the classes they teach), or takes it
// back out. Same rules as POST /api/library/[id]/share: a share a teacher hid
// stays hidden when the owner shares again; only the teacher can unhide it.

import { callerClasses, json, type SessionData } from '../../../_shared/games';
import { isGameId } from '../../../../lib/games-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const id = String(params.id);
  if (!isGameId(id)) return json({ error: 'Not found' }, 404);
  let body: { share?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.share !== 'boolean') return json({ error: 'share must be true or false' }, 400);

  const game = await env.DB.prepare(
    `SELECT id FROM library_games WHERE id = ? AND owner_email = ? AND deleted_at IS NULL`,
  ).bind(id, data.email).first<{ id: string }>();
  if (!game) return json({ error: 'Not found' }, 404);

  if (!body.share) {
    await env.DB.prepare(`DELETE FROM library_game_shares WHERE game_id = ?`).bind(id).run();
    return json({ ok: true, shared: false, classes: 0 });
  }
  const { all } = await callerClasses(env.DB, data);
  if (!all.length) {
    return json({
      error: data.role === 'student'
        ? 'Join a class first: sharing puts this game in your class' + "'" + 's Library.'
        : 'Make a class first: sharing puts this game in the Library of every class you teach.',
    }, 409);
  }
  const now = Date.now();
  await env.DB.batch(all.map((c) =>
    env.DB.prepare(`INSERT OR IGNORE INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, ?, ?)`).bind(id, c, now),
  ));
  return json({ ok: true, shared: true, classes: all.length });
};
