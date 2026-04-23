// POST /api/classes/[id]/enrollments  body { email }
// Teacher-initiated add. Validates that the email belongs to a registered
// student account. Accepts teachers being enrolled as students? No —
// reject if the target's role isn't 'student'.

import { canManageClass } from '../../../../_shared/classAuth';
import { getCurrentExpirationDate } from '../../../../_shared/schoolYear';
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
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }
  if (acl.class.archived_at) return json({ error: 'Class is archived' }, 400);

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const target = normalizeEmail(body.email || '');
  if (!target) return json({ error: 'Student email required' }, 400);

  const student = await env.DB.prepare('SELECT email, role FROM students WHERE email = ?')
    .bind(target)
    .first<{ email: string; role: string }>();
  if (!student) return json({ error: 'No account found for that email' }, 404);
  if (student.role !== 'student') {
    return json({ error: 'That user is not a student' }, 400);
  }

  const now = Date.now();
  const expiresAt = getCurrentExpirationDate();
  try {
    await env.DB.prepare(
      `INSERT INTO enrollments (class_id, student_email, enrolled_at, enrolled_by, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(classId, target, now, data.email, expiresAt)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      return json({ error: 'Student already enrolled in this class' }, 409);
    }
    throw err;
  }

  return json(
    {
      ok: true,
      enrollment: {
        class_id: classId,
        student_email: target,
        enrolled_at: now,
        enrolled_by: data.email,
        expires_at: expiresAt,
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
