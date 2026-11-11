// GET /api/classes/[id]/game-changes  — every proposed change on a game shared into this class, and the
//                                      newest comments across their conversations
//
// Owner, co-teacher or admin only (the same check as game-shares). The comments are free text between
// students (owner decision 2026-11-10), so the class's teachers read all of them here, removed ones
// included and marked. Acting on one (remove a comment, lock, remove the proposal) goes through
// POST /api/game-changes/[cid], which gives a teacher of the class those powers. No email in the answer.

import { canManageClass } from '../../../_shared/classAuth';
import { json, type SessionData } from '../../../_shared/games';
import { CHANGE_COLUMNS, statusFor, type ChangeRow } from '../../../_shared/gameFlow';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const classId = String(params.id);
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);

  const changes = (await env.DB.prepare(
    `SELECT ${CHANGE_COLUMNS.split(', ').map((c) => 'c.' + c).join(', ')}, g.title AS game_title, (g.deleted_at IS NULL) AS game_live,
            (SELECT COUNT(*) FROM game_change_comments k WHERE k.change_id = c.id AND k.kind = 'comment') AS comments
       FROM game_changes c
       JOIN library_games g ON g.id = c.game_id
      WHERE c.game_id IN (SELECT game_id FROM library_game_shares WHERE class_id = ?)
      ORDER BY c.updated_at DESC LIMIT 100`,
  ).bind(classId).all<ChangeRow & { game_title: string; game_live: number; comments: number }>()).results ?? [];

  const recent = (await env.DB.prepare(
    `SELECT k.id, k.change_id, k.author_name, k.body, k.created_at, k.deleted_at, k.deleted_by, c.title AS change_title, g.title AS game_title
       FROM game_change_comments k
       JOIN game_changes c ON c.id = k.change_id
       JOIN library_games g ON g.id = c.game_id
      WHERE k.kind = 'comment' AND c.game_id IN (SELECT game_id FROM library_game_shares WHERE class_id = ?)
      ORDER BY k.created_at DESC LIMIT 60`,
  ).bind(classId).all<{
    id: string; change_id: string; author_name: string; body: string; created_at: number;
    deleted_at: number | null; deleted_by: string | null; change_title: string; game_title: string;
  }>()).results ?? [];

  return json({
    changes: changes.map((c) => ({
      id: c.id, title: c.title, gameId: c.game_id, gameTitle: c.game_title, from: c.from_name,
      status: statusFor(c, c.game_live ? {} : null), locked: c.locked_at != null, comments: c.comments,
      createdAt: c.created_at, updatedAt: c.updated_at,
    })),
    recentComments: recent.map((k) => ({
      id: k.id, changeId: k.change_id, author: k.author_name, body: k.deleted_at ? '' : k.body,
      deleted: k.deleted_at ? (k.deleted_by === 'teacher' ? 'teacher' : 'author') : null,
      createdAt: k.created_at, changeTitle: k.change_title, gameTitle: k.game_title,
    })),
  });
};
