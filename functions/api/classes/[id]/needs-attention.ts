// GET /api/classes/[id]/needs-attention
// Returns students who need teacher attention: inactive, failed submissions, stuck.
// Only the class owner, co-teachers, or an admin may call this endpoint.

import { canManageClass } from '../../../_shared/classAuth';
import { isPassingSubmission } from '../../../../lib/grade-pass';

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
  grade_json: string | null;
  submitted_at: number;
}

interface StuckRow {
  student_email: string;
  lesson_id: string;
  started_at: number;
}

interface AwaitingRow {
  student_email: string;
  lesson_id: string;
  grade_json: string | null;
  submitted_at: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * True when a submission carries the WrittenGrader outage marker.
 *
 * Parsed in JS rather than with json_extract in SQL: SQLite raises on
 * malformed JSON, and one bad legacy row would take down the whole panel.
 * Same shape as the gradebook's check, deliberately — the two views must
 * agree on what "ungraded" means.
 */
function isGradingFailed(raw: string | null): boolean {
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as { gradingFailed?: unknown })?.gradingFailed === true;
  } catch {
    return false;
  }
}

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

  // 2. Failed submissions: the latest SCORED submission per student per lesson
  //    that did not pass.
  //
  //    Pass/fail is decided by isPassingSubmission, NOT by comparing the
  //    totals here. Nearly every rubric in the course awards `points: 0` per
  //    criterion and grades on the model's verdicts, so `possible` is 0 and
  //    the old `score < possible * 0.6` predicate was `0 < 0` — permanently
  //    false. A whole class could be failing A1.4.1 and this list came back
  //    empty. Rows the helper cannot judge (unparseable grade_json) return
  //    null and are left to rule 4 rather than guessed at.
  //
  //    Only scored rows are ranked. An attempt the grader failed on has a NULL
  //    score, and `NULL < NULL * 0.6` is NULL rather than true, so it could
  //    never match this rule anyway — but as the newest row it used to take
  //    rn = 1 and push a genuine 3/10 down to rn = 2, silently removing a
  //    struggling student from this list. An outage must not make anyone look
  //    fine. Those rows are reported by rule 4 instead.
  const failedResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, score, possible, grade_json, submitted_at
       FROM (
         SELECT
           student_email, lesson_id, score, possible, grade_json, submitted_at,
           ROW_NUMBER() OVER (
             PARTITION BY student_email, lesson_id
             ORDER BY submitted_at DESC
           ) AS rn
         FROM lesson_submissions
         WHERE score IS NOT NULL
           AND student_email IN (
             SELECT student_email FROM enrollments
              WHERE class_id = ?1 AND expires_at > ?2
           )
       )
      WHERE rn = 1`,
  )
    .bind(classId, now)
    .all<FailedSubRow>();

  const failed_submission = (failedResult.results ?? [])
    .filter((row) => {
      // Point-scored rubrics keep the historical "below 60%" band — a
      // deliberately narrower "really struggling" signal than the 70% pass
      // bar, and untouched by this fix.
      if (row.possible > 0) return row.score < row.possible * 0.6;
      // Pass/fail rubrics have no points to compare. Ask the verdicts.
      return isPassingSubmission(row.score, row.possible, row.grade_json) === false;
    })
    .map((row) => ({
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

  // 4. Awaiting a grade: the student's NEWEST submission on a lesson is an
  //    attempt the AI grader failed on, so nothing has scored it. This is the
  //    only category where the work is done and the hold-up is ours — the
  //    answer is sitting in the review queue waiting for a human.
  //
  //    Ranks every submission, not just scored ones: if a later attempt graded
  //    successfully it takes rn = 1 and the lesson is no longer awaiting.
  //    Same definition as the gradebook's `pending` cell, on purpose.
  const awaitingResult = await env.DB.prepare(
    `SELECT student_email, lesson_id, grade_json, submitted_at
       FROM (
         SELECT
           student_email, lesson_id, grade_json, score, submitted_at,
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
      WHERE rn = 1 AND score IS NULL AND grade_json IS NOT NULL`,
  )
    .bind(classId, now)
    .all<AwaitingRow>();

  const awaiting_grade = (awaitingResult.results ?? [])
    .filter((row) => isGradingFailed(row.grade_json))
    .map((row) => ({
      student_email: row.student_email,
      lesson_id: row.lesson_id,
      lesson_title: row.lesson_id,
      submitted_at: row.submitted_at,
      days_waiting: Math.floor((now - row.submitted_at) / MS_PER_DAY),
    }));

  return json({ inactive, failed_submission, stuck, awaiting_grade });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
