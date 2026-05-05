// GET /api/classes/[id]/needs-attention
// Returns students who need teacher attention: inactive, failed submissions, stuck.
// Only the class owner, co-teachers, or an admin may call this endpoint.

import { canManageClass } from '../../../_shared/classAuth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface InactiveRow {
  student_email: string;
  last_active_ms: number | null;
  enrolled_at: number;
}

interface FailedSubRow {
  student_email: string;
  lesson_id: string;
  score: number;
  possible: number;
  submitted_at: number;
}

interface StuckRow {
  student_email: string;
  lesson_id: string;
  started_at: number;
}

const MS_PER_DAY = 86_400_000;

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;
  const classId = params.id;

  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized' }, 403);
  }

  const now = Date.now();

  // 1. Inactive: students whose most recent lesson_state activity is > 5 days
  //    ago, or who have never opened a lesson and enrolled > 5 days ago.
  const inactiveCutoff = now - 5 * MS_PER_DAY;

  const inactiveResult = await env.DB.prepare(
    `SELECT
       e.student_email,
       MAX(ls.started_at) AS last_active_ms,
       MAX(e.enrolled_at) AS enrolled_at
     FROM enrollments e
     LEFT JOIN lesson_state ls ON ls.student_email = e.student_email
     WHERE e.class_id = ?1 AND e.expires_at > ?2
     GROUP BY e.student_email`,
  )
    .bind(classId, now)
    .all<InactiveRow>();

  const inactive = (inactiveResult.results ?? [])
    .filter((row) => {
      if (row.last_active_ms !== null) return row.last_active_ms < inactiveCutoff;
      // No lesson_state rows at all — check enrollment date.
      return row.enrolled_at < inactiveCutoff;
    })
    .map((row) => ({
      student_email: row.student_email,
      last_active: row.last_active_ms,
      days_since_active: Math.floor(
        (now - (row.last_active_ms ?? row.enrolled_at)) / MS_PER_DAY,
      ),
    }));

  // 2. Failed submissions: latest submission per student per lesson where
  //    score < possible * 0.6 (below 60%).
  const failedResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, score, possible, submitted_at
       FROM (
         SELECT
           student_email, lesson_id, score, possible, submitted_at,
           ROW_NUMBER() OVER (
             PARTITION BY student_email, lesson_id
             ORDER BY submitted_at DESC
           ) AS rn
         FROM lesson_submissions
         WHERE student_email IN (
           SELECT student_email FROM enrollments
            WHERE class_id = ?1 AND expires_at > ?2
         )
       )
      WHERE rn = 1 AND score < possible * 0.6`,
  )
    .bind(classId, now)
    .all<FailedSubRow>();

  const failed_submission = (failedResult.results ?? []).map((row) => ({
    student_email: row.student_email,
    lesson_id: row.lesson_id,
    lesson_title: row.lesson_id,
    score: row.score,
    possible: row.possible,
    submitted_at: row.submitted_at,
  }));

  // 3. Stuck: lesson_state rows where state = 'started' and started_at is
  //    more than 3 days ago.
  const stuckCutoff = now - 3 * MS_PER_DAY;

  const stuckResult = await env.DB.prepare(
    `SELECT ls.student_email, ls.lesson_id, ls.started_at
       FROM lesson_state ls
      WHERE ls.state = 'started'
        AND ls.started_at < ?3
        AND ls.student_email IN (
          SELECT student_email FROM enrollments
           WHERE class_id = ?1 AND expires_at > ?2
        )`,
  )
    .bind(classId, now, stuckCutoff)
    .all<StuckRow>();

  const stuck = (stuckResult.results ?? []).map((row) => ({
    student_email: row.student_email,
    lesson_id: row.lesson_id,
    lesson_title: row.lesson_id,
    started_at: row.started_at,
    days_since_started: Math.floor((now - row.started_at) / MS_PER_DAY),
  }));

  return json({ inactive, failed_submission, stuck });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
