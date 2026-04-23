// POST /api/classes/[id]/teachers  body { email }
// Adds a co-teacher. Only the class owner (or admin) can add co-teachers.
// Target email must belong to a teacher or admin account.

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);

  // Only the owner (or admin) can add co-teachers — co-teachers themselves cannot.
  if (!acl.isOwner && data.role !== 'admin') {
    return json({ error: 'Only the class owner can add co-teachers' }, 403);
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const target = normalizeEmail(body.email || '');
  if (!target) return json({ error: 'Teacher email required' }, 400);

  // Prevent adding the class owner as a co-teacher.
  if (target === acl.class.owner_email) {
    return json({ error: 'User already owns this class' }, 400);
  }

  // Prevent adding yourself (the caller).
  if (target === data.email) {
    return json({ error: "You're already a co-teacher" }, 400);
  }

  // Validate the target exists and is not a student.
  const targetUser = await env.DB.prepare('SELECT email, role FROM students WHERE email = ?')
    .bind(target)
    .first<{ email: string; role: string }>();
  if (!targetUser) return json({ error: 'No account found for that email' }, 404);
  if (targetUser.role === 'student') {
    return json({ error: 'That user is not a teacher' }, 400);
  }

  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO class_teachers (class_id, teacher_email, added_at, added_by)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(classId, target, now, data.email)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return json({ error: 'Already a co-teacher' }, 409);
    }
    throw err;
  }

  return json(
    {
      ok: true,
      teacher: {
        teacher_email: target,
        added_at: now,
        added_by: data.email,
      },
    },
    201,
  );
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
