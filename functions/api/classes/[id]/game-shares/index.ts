// GET  /api/classes/[id]/game-shares  — every game shared into this class, hidden ones too
// POST /api/classes/[id]/game-shares  { gameId, action: 'hide' | 'unhide' | 'remove' }
//
// Owner, co-teacher or admin only (the games twin of library-shares). Hide
// keeps the share but takes the game out of every student's view; remove takes
// it out of this class's Games. Neither touches the student's own game.
// No email in the answer: the publisher shows as first name + last initial.

import { canManageClass } from '../../../../_shared/classAuth';
import { gamesSharedInto, json, type SessionData } from '../../../../_shared/games';
import { ownerLabel } from '../../../../_shared/libraryShare';
import { deletableOwners } from '../../../../_shared/libraryDelete';
import { isGameId, modeLabel, type GameMode } from '../../../../../lib/games-core';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

async function allowed(env: Env, data: SessionData, classId: string): Promise<Response | null> {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  return null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  const rows = await gamesSharedInto(env.DB, [classId]);
  // canDelete: the publisher is a student enrolled in this class now (game-delete.ts allows exactly these).
  const students = await deletableOwners(env.DB, classId);
  return json({
    games: rows.map((r) => ({
      id: r.id, title: r.title, mode: r.mode, players: r.players,
      modeLabel: modeLabel(r.mode as GameMode, r.players), bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name),
      sharedAt: r.shared_at, updatedAt: r.updated_at, hidden: r.hidden_at != null,
      canDelete: students.has(r.owner_email),
    })),
  });
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  let body: { gameId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const gameId = String(body.gameId ?? '');
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  const now = Date.now();
  let res: D1Result;
  if (body.action === 'hide') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET hidden_at = ?, hidden_by = ? WHERE game_id = ? AND class_id = ?`)
      .bind(now, data.email, gameId, classId).run();
  } else if (body.action === 'unhide') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET hidden_at = NULL, hidden_by = NULL WHERE game_id = ? AND class_id = ?`)
      .bind(gameId, classId).run();
  } else if (body.action === 'remove') {
    res = await env.DB.prepare(`DELETE FROM library_game_shares WHERE game_id = ? AND class_id = ?`).bind(gameId, classId).run();
  } else {
    return json({ error: "action must be 'hide', 'unhide' or 'remove'" }, 400);
  }
  if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true });
};
