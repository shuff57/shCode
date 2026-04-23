// GET /api/classes/[id] -> class detail + active roster. Viewable by the
// owner, any co-teacher, or an admin.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface EnrollmentRow {
  student_email: string;
  enrolled_at: number;
  enrolled_by: string | null;
  expires_at: number;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  const now = Date.now();
  const enrollments = await env.DB.prepare(
    `SELECT student_email, enrolled_at, enrolled_by, expires_at
       FROM enrollments
      WHERE class_id = ? AND expires_at > ?
      ORDER BY enrolled_at ASC`,
  )
    .bind(classId, now)
    .all<EnrollmentRow>();

  const coTeachers = await env.DB.prepare(
    `SELECT teacher_email, added_at, added_by
       FROM class_teachers
      WHERE class_id = ?
      ORDER BY added_at ASC`,
  )
    .bind(classId)
    .all<{ teacher_email: string; added_at: number; added_by: string | null }>();

  return json({
    class: acl.class,
    isOwner: acl.isOwner,
    roster: enrollments.results ?? [],
    coTeachers: coTeachers.results ?? [],
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
