// GET /api/classes/[id]/progress
// Returns per-student progress summary (completed_count, started_count,
// last_active, total_score) for all active enrollments in the class, plus
// each student's grade-weighted percentage under this class's weights
// (class_grading_weights, defaulting per lib/grading-weights.ts).

import { canManageClass } from '../../../_shared/classAuth';
import { loadLessonScopeMap } from '../../../_shared/dueDates';
import { loadClassWeights, studentGrading } from '../../../_shared/grading';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
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

/** The subset of lesson_state studentGrading() reads. */
interface StateRow {
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
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

  const rows = result.results ?? [];

  // Grade-weighted percent per student. Fixed number of reads, not N: the
  // scope map and the class weights are identical for every student, and the
  // per-student state rows come back in one query grouped by email.
  const scopeMap = await loadLessonScopeMap(env, request);
  const weights = await loadClassWeights(env.DB, classId);
  const statesByStudent = new Map<string, (StateRow & { student_email: string })[]>();
  if (rows.length > 0) {
    const stateResult = await env.DB.prepare(
      `SELECT ls.student_email, ls.lesson_id, ls.state, ls.score
         FROM lesson_state ls
         JOIN enrollments e ON e.student_email = ls.student_email
        WHERE e.class_id = ? AND e.expires_at > ?`
    )
      .bind(classId, now)
      .all<StateRow & { student_email: string }>();
    for (const r of stateResult.results ?? []) {
      const list = statesByStudent.get(r.student_email);
      if (list) list.push(r);
      else statesByStudent.set(r.student_email, [r]);
    }
  }

  return json({
    students: rows.map((r) => ({
      ...r,
      weightedPercent: studentGrading(scopeMap, statesByStudent.get(r.student_email) ?? [], weights).percent,
    })),
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
