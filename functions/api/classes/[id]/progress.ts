// GET /api/classes/[id]/progress
// Returns per-student progress summary (completed_count, started_count,
// last_active, total_score) for all active enrollments in the class.
// One SQL query via GROUP BY student_email.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface ProgressRow {
  student_email: string;
  completed_count: number;
  started_count: number;
  last_active: number | null;
  total_score: number;
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

  // ONE query: join active enrollments → lesson_state, group by student.
  // Students with zero lesson_state rows still appear via the LEFT JOIN with
  // zeroed counts and null last_active.
  const result = await env.DB.prepare(
    `SELECT
       e.student_email,
       COUNT(CASE WHEN ls.state = 'completed' THEN 1 END) AS completed_count,
       COUNT(CASE WHEN ls.state = 'started'   THEN 1 END) AS started_count,
       MAX(
         CASE
           WHEN ls.completed_at IS NOT NULL AND ls.started_at IS NOT NULL
             THEN MAX(ls.completed_at, ls.started_at)
           WHEN ls.completed_at IS NOT NULL THEN ls.completed_at
           WHEN ls.started_at   IS NOT NULL THEN ls.started_at
           ELSE NULL
         END
       ) AS last_active,
       COALESCE(SUM(ls.score), 0) AS total_score
     FROM enrollments e
     LEFT JOIN lesson_state ls ON ls.student_email = e.student_email
     WHERE e.class_id = ? AND e.expires_at > ?
     GROUP BY e.student_email
     ORDER BY e.student_email ASC`,
  )
    .bind(classId, now)
    .all<ProgressRow>();

  return json({ students: result.results ?? [] });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
