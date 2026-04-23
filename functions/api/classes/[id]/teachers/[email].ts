// DELETE /api/classes/[id]/teachers/[email]
// Removes a co-teacher. Only the class owner (or admin) can remove co-teachers.
// Idempotent — succeeds even if the row didn't exist.

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

  // Only the owner (or admin) can remove co-teachers.
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can remove co-teachers' }, 403);
  }

  await env.DB.prepare('DELETE FROM class_teachers WHERE class_id = ? AND teacher_email = ?')
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
