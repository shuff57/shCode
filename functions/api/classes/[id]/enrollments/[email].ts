// DELETE /api/classes/[id]/enrollments/[email]
// Teacher removes a student from the class. Does not touch lesson_state,
// commits, or lesson_submissions — those stay keyed to student_email so
// history is preserved if the student re-enrolls later.

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id' | 'email', SessionData>;

export const onRequestDelete: PagesFunction<Env, 'id' | 'email', SessionData> = async (
  context: Ctx,
) => {
  const { env, data, params } = context;
  const classId = params.id;
  const rawEmail = params.email;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);
  if (typeof rawEmail !== 'string' || !rawEmail) return json({ error: 'email required' }, 400);
  const target = normalizeEmail(decodeURIComponent(rawEmail));

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  await env.DB.prepare('DELETE FROM enrollments WHERE class_id = ? AND student_email = ?')
    .bind(classId, target)
    .run();

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
