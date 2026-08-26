// GET /api/classes/[id]/students/[email]
// Returns detailed per-lesson state + latest submission per lesson for a
// single student. Verifies the student is actively enrolled in this class
// before returning any data (prevents cross-class data leaks).

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id' | 'email', SessionData>;

interface LessonStateRow {
  lesson_id: string;
  state: 'started' | 'completed';
  started_at: number | null;
  completed_at: number | null;
  score: number | null;
}

interface SubmissionRow {
  id: string;
  lesson_id: string;
  submitted_at: number;
  score: number | null;
  possible: number | null;
  grade_json: string | null;
  response: string | null;
}

export const onRequestGet: PagesFunction<Env, 'id' | 'email', SessionData> = async (
  context: Ctx,
) => {
  const { env, data, params } = context;
  const classId = params.id;
  const rawEmail = params.email;

  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);
  if (typeof rawEmail !== 'string' || !rawEmail) {
    return json({ error: 'student email required' }, 400);
  }
  // Pages Functions pass path params URL-encoded — decode before matching
  // the DB's lowercased email. Matches the pattern in enrollments/[email].ts.
  const studentEmail = normalizeEmail(decodeURIComponent(rawEmail));

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  // Confirm the target student is actively enrolled (prevents cross-class leaks).
  const now = Date.now();
  const enrollment = await env.DB.prepare(
    `SELECT 1 FROM enrollments
      WHERE class_id = ? AND student_email = ? AND expires_at > ?`,
  )
    .bind(classId, studentEmail, now)
    .first();
  if (!enrollment) return json({ error: 'Student not found in this class' }, 404);

  // Fetch all lesson_state rows for this student.
  const stateRows = await env.DB.prepare(
    `SELECT lesson_id, state, started_at, completed_at, score
       FROM lesson_state
      WHERE student_email = ?
      ORDER BY lesson_id ASC`,
  )
    .bind(studentEmail)
    .all<LessonStateRow>();

  // Fetch latest submission per lesson using ROW_NUMBER window function.
  // rn = 1 means the most recent submission for that lesson.
  const submissionRows = await env.DB.prepare(
    `SELECT id, lesson_id, submitted_at, score, possible, grade_json, response
       FROM (
         SELECT
           id, lesson_id, submitted_at, score, possible, grade_json, response,
           ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY submitted_at DESC) AS rn
         FROM lesson_submissions
         WHERE student_email = ?
       )
      WHERE rn = 1`,
  )
    .bind(studentEmail)
    .all<SubmissionRow>();

  // Build typed response maps.
  const lessonState: Record<
    string,
    { state: string; started_at: number | null; completed_at: number | null; score: number | null }
  > = {};
  for (const row of stateRows.results ?? []) {
    lessonState[row.lesson_id] = {
      state: row.state,
      started_at: row.started_at,
      completed_at: row.completed_at,
      score: row.score,
    };
  }

  const latestSubmissions: Record<
    string,
    {
      id: string;
      submitted_at: number;
      score: number | null;
      possible: number | null;
      grade_json: string | null;
      response: string | null;
    }
  > = {};
  for (const row of submissionRows.results ?? []) {
    latestSubmissions[row.lesson_id] = {
      id: row.id,
      submitted_at: row.submitted_at,
      score: row.score,
      possible: row.possible,
      grade_json: row.grade_json,
      // The student's actual answer. A diagram assignment stores its
      // DiagramDoc here, so without it the teacher can see that a chart was
      // submitted and scored but never what was drawn. Bounded: rn = 1 means
      // one row per lesson, not every attempt.
      response: row.response,
    };
  }

  return json({ student_email: studentEmail, lessonState, latestSubmissions });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
