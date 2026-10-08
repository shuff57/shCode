// GET /api/classes/[id]/requirement-events
// Which requirements this class's students keep failing in console labs. Only the class owner,
// co-teachers, or an admin may call it, and only students ENROLLED (not expired) in THIS class are
// ever returned. Data is written by POST /api/requirement-events; best effort, never a grade input.

import { canManageClass } from '../../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

const TOP_LIMIT = 20;
const MAX_ROWS = 5000;

interface Row {
  student_email: string;
  first_name: string | null;
  last_name: string | null;
  lesson_id: string;
  req_id: string;
  fails: number;
  first_pass_at: number | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context) => {
  const { env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  // Rows where the student actually stumbled; a clean first pass is not "missed".
  const res = await env.DB
    .prepare(
      `SELECT re.student_email, s.first_name, s.last_name, re.lesson_id, re.req_id, re.fails, re.first_pass_at
         FROM requirement_events re
         JOIN enrollments e ON e.student_email = re.student_email AND e.class_id = ?1 AND e.expires_at > ?2
         LEFT JOIN students s ON s.email = re.student_email
        WHERE re.fails > 0
        ORDER BY re.fails DESC, re.lesson_id, re.req_id, re.student_email
        LIMIT ?3`,
    )
    .bind(classId, Date.now(), MAX_ROWS)
    .all<Row>();
  const rows = res.results ?? [];

  const agg = new Map<string, { lessonId: string; reqId: string; studentsFailed: number; totalFails: number; studentsNotPast: number }>();
  for (const r of rows) {
    const key = `${r.lesson_id}\u0000${r.req_id}`;
    let a = agg.get(key);
    if (!a) {
      a = { lessonId: r.lesson_id, reqId: r.req_id, studentsFailed: 0, totalFails: 0, studentsNotPast: 0 };
      agg.set(key, a);
    }
    a.studentsFailed += 1;
    a.totalFails += r.fails;
    if (r.first_pass_at === null) a.studentsNotPast += 1;
  }
  const topMissed = [...agg.values()]
    .sort(
      (x, y) =>
        y.totalFails - x.totalFails ||
        y.studentsFailed - x.studentsFailed ||
        x.lessonId.localeCompare(y.lessonId) ||
        x.reqId.localeCompare(y.reqId),
    )
    .slice(0, TOP_LIMIT);

  return json({
    rows: rows.map((r) => ({
      studentEmail: r.student_email,
      firstName: r.first_name,
      lastName: r.last_name,
      lessonId: r.lesson_id,
      reqId: r.req_id,
      fails: r.fails,
      firstPassAt: r.first_pass_at,
    })),
    topMissed,
    truncated: rows.length >= MAX_ROWS,
  });
};
