// POST /api/classes/[id]/delete
// Permanently removes the class row plus its enrollments and class_teachers
// rows. Student-scoped data (lesson_state, commits, lesson_submissions)
// stays — those are keyed to student_email, not class_id, so students
// keep their history if they re-enroll elsewhere.
//
// POST (not DELETE) because Cloudflare Pages Functions route body-carrying
// DELETEs inconsistently on some CDN paths; POST with an explicit "delete"
// action is safer and matches how archive.ts handles its toggle.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can delete' }, 403);
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM enrollments WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM class_teachers WHERE class_id = ?').bind(classId),
    env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(classId),
  ]);

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
