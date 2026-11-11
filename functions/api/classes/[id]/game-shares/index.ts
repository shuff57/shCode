// GET  /api/classes/[id]/game-shares  — every game shared into this class, hidden ones too
// POST /api/classes/[id]/game-shares  { gameId, action: 'hide' | 'unhide' | 'remove' | 'clear-suggestions'
//                                               | 'feedback-off' | 'feedback-on' }
//                                      { action: 'class-feedback-off' | 'class-feedback-on' }
//
// Feedback switches (migration 0051): feedback-off / -on closes or opens comments
// and suggestions on ONE game for this class; class-feedback-off / -on does it for
// every game in the class. Either way the creator and the class's teachers still
// read what was written (functions/_shared/gameComments.ts). The list carries each
// game's `feedbackOff` and `comments` (live ones), and the class's `classFeedbackOff`.
//
// clear-suggestions (#96) deletes the suggestions this class's students (enrolled
// now) made on the game; suggestions from another class the game is shared into
// are that class's teachers' to clear. The list's `suggestions` is that count.
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
  const counts = new Map<string, number>();
  if (rows.length) {
    const marks = rows.map(() => '?').join(',');
    const r = await env.DB.prepare(
      `SELECT gs.game_id, COUNT(*) AS n FROM game_suggestions gs
         JOIN enrollments e ON e.student_email = gs.from_email AND e.class_id = ? AND e.expires_at > ?
        WHERE gs.game_id IN (${marks}) GROUP BY gs.game_id`,
    ).bind(classId, Date.now(), ...rows.map((g) => g.id)).all<{ game_id: string; n: number }>();
    for (const c of r.results ?? []) counts.set(c.game_id, c.n);
  }
  const comments = new Map<string, number>();
  const feedbackOff = new Set<string>();
  if (rows.length) {
    const marks = rows.map(() => '?').join(',');
    const ids = rows.map((g) => g.id);
    const [cr, fr] = await Promise.all([
      env.DB.prepare(`SELECT game_id, COUNT(*) AS n FROM game_comments WHERE deleted_at IS NULL AND game_id IN (${marks}) GROUP BY game_id`)
        .bind(...ids).all<{ game_id: string; n: number }>(),
      env.DB.prepare(`SELECT game_id FROM library_game_shares WHERE class_id = ? AND feedback_off_at IS NOT NULL AND game_id IN (${marks})`)
        .bind(classId, ...ids).all<{ game_id: string }>(),
    ]);
    for (const c of cr.results ?? []) comments.set(c.game_id, c.n);
    for (const f of fr.results ?? []) feedbackOff.add(f.game_id);
  }
  const cls = await env.DB.prepare(`SELECT game_feedback_off FROM classes WHERE id = ?`).bind(classId).first<{ game_feedback_off: number | null }>();
  return json({
    classFeedbackOff: !!cls?.game_feedback_off,
    games: rows.map((r) => ({
      id: r.id, title: r.title, mode: r.mode, players: r.players,
      modeLabel: modeLabel(r.mode as GameMode, r.players), bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name),
      sharedAt: r.shared_at, updatedAt: r.updated_at, hidden: r.hidden_at != null,
      canDelete: students.has(r.owner_email),
      suggestions: counts.get(r.id) ?? 0,
      comments: comments.get(r.id) ?? 0,
      feedbackOff: feedbackOff.has(r.id),
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
  const now = Date.now();
  if (body.action === 'class-feedback-off' || body.action === 'class-feedback-on') {
    await env.DB.prepare(`UPDATE classes SET game_feedback_off = ? WHERE id = ?`)
      .bind(body.action === 'class-feedback-off' ? 1 : 0, classId).run();
    return json({ ok: true, classFeedbackOff: body.action === 'class-feedback-off' });
  }
  const gameId = String(body.gameId ?? '');
  if (!isGameId(gameId)) return json({ error: 'Not found' }, 404);
  let res: D1Result;
  if (body.action === 'hide') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET hidden_at = ?, hidden_by = ? WHERE game_id = ? AND class_id = ?`)
      .bind(now, data.email, gameId, classId).run();
  } else if (body.action === 'unhide') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET hidden_at = NULL, hidden_by = NULL WHERE game_id = ? AND class_id = ?`)
      .bind(gameId, classId).run();
  } else if (body.action === 'remove') {
    res = await env.DB.prepare(`DELETE FROM library_game_shares WHERE game_id = ? AND class_id = ?`).bind(gameId, classId).run();
  } else if (body.action === 'clear-suggestions') {
    const shared = await env.DB.prepare(`SELECT 1 AS x FROM library_game_shares WHERE game_id = ? AND class_id = ?`)
      .bind(gameId, classId).first();
    if (!shared) return json({ error: 'Not found' }, 404);
    const del = await env.DB.prepare(
      `DELETE FROM game_suggestions WHERE game_id = ? AND from_email IN
         (SELECT student_email FROM enrollments WHERE class_id = ? AND expires_at > ?)`,
    ).bind(gameId, classId, now).run();
    return json({ ok: true, cleared: del.meta?.changes ?? 0 });
  } else if (body.action === 'feedback-off') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET feedback_off_at = ?, feedback_off_by = ? WHERE game_id = ? AND class_id = ?`)
      .bind(now, data.email, gameId, classId).run();
  } else if (body.action === 'feedback-on') {
    res = await env.DB.prepare(`UPDATE library_game_shares SET feedback_off_at = NULL, feedback_off_by = NULL WHERE game_id = ? AND class_id = ?`)
      .bind(gameId, classId).run();
  } else {
    return json({ error: "action must be 'hide', 'unhide', 'remove', 'clear-suggestions', 'feedback-off', 'feedback-on', 'class-feedback-off' or 'class-feedback-on'" }, 400);
  }
  if (!res.meta || res.meta.changes === 0) return json({ error: 'Not found' }, 404);
  return json({ ok: true });
};
