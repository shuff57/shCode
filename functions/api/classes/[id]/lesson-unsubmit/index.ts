// POST /api/classes/[id]/lesson-unsubmit
//   body { studentEmail, lessonId }  ->  { ok: true }
//
// Reopens one student's submitted multiple-choice quiz so they can change
// their answers and submit again. "Submitted" lives in three server tables
// (plus the browser's localStorage), and all three have to move or the
// student stays locked out:
//   lesson_drafts      what QuizView hydrates from. Rewritten to the SAME
//                      answers with graded:false, so the radios unlock and
//                      nothing the student picked is lost. It also overrides
//                      a stale graded:true sitting in their localStorage.
//   lesson_state       completed -> started, score cleared. Re-gates the
//                      lessons after it, same as a student's own "Undo
//                      complete" (DELETE /api/lesson-state/[lessonId]).
//   lesson_submissions the graded rows, deleted so the drawer, the queue, the
//                      gradebook and scripts/score-quiz.mjs read "not
//                      submitted" instead of the stale attempt.
//
// Quiz-only. A submission counts as a quiz iff its grade_json carries a
// `quiz` array -- what components/QuizView.tsx writes. A written answer, a
// diagram or code 409s: the delete below would destroy a graded essay.
//
// Auth: owner / co-teacher of the class, or an admin. The student must also be actively
// enrolled in THAT class. This is not a barrier against a teacher acting on a student who is not
// theirs: a teacher can add any student to their own class (the enrollments route) and then this
// applies. The accepted trust model is that teachers are trusted (round 5 finding 6; the try-reset
// route records who did what in lesson_try_resets, this one keeps no trail). Progress is keyed by
// student, not class, so a student in two classes is reopened in both.
//
// ponytail: submissions are deleted outright, no audit trail. Keeping one
// needs a new column or table (migration 0032) and a filter on every reader
// of lesson_submissions. Add when a teacher needs to see what was reopened.

import { canManageClass } from '../../../../_shared/classAuth';
import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface Row {
  response: string;
  grade_json: string | null;
}

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const classId = params.id;
  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not authorized' }, 403);

  let body: { studentEmail?: unknown; lessonId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = typeof body.studentEmail === 'string' ? normalizeEmail(body.studentEmail) : '';
  if (!email) return json({ error: 'studentEmail required' }, 400);
  const lessonId = body.lessonId;
  if (typeof lessonId !== 'string' || lessonId.length === 0 || lessonId.length > 200) {
    return json({ error: 'lessonId must be a non-empty string' }, 400);
  }

  const enrolled = await env.DB
    .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?')
    .bind(classId, email, Date.now())
    .first();
  if (!enrolled) return json({ error: 'Student not found in this class' }, 404);

  // The latest real hand-in. A grading-failure marker row (the answer saved through
  // an outage) is not the hand-in: left in, a stray marker on a capped quiz hid the
  // hand-in beneath it and made the unsubmit 409.
  const latest = await env.DB
    .prepare(
      `SELECT response, grade_json FROM lesson_submissions
        WHERE student_email = ? AND lesson_id = ?
          AND (grade_json IS NULL
               OR CASE WHEN json_valid(grade_json)
                       THEN json_type(grade_json, '$.gradingFailed') IS NOT 'true'
                       ELSE 1 END)
        ORDER BY submitted_at DESC LIMIT 1`,
    )
    .bind(email, lessonId)
    .first<Row>();
  if (!latest) return json({ error: 'No submission to reopen' }, 404);
  if (!isQuizGrade(latest.grade_json)) {
    return json({ error: 'Only a multiple-choice quiz can be unsubmitted' }, 409);
  }

  // One batch = one transaction: a half-reopened quiz (unlocked but still
  // counted as submitted, or the reverse) is worse than either end state.
  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at)
           VALUES (?, ?, ?, ?)
         ON CONFLICT(student_email, lesson_id)
           DO UPDATE SET response = excluded.response, updated_at = excluded.updated_at`,
      )
      .bind(email, lessonId, JSON.stringify({ answers: savedAnswers(latest.response), graded: false }), Date.now()),
    env.DB
      .prepare(
        `UPDATE lesson_state SET state = 'started', completed_at = NULL, score = NULL
          WHERE student_email = ? AND lesson_id = ?`,
      )
      .bind(email, lessonId),
    env.DB
      .prepare('DELETE FROM lesson_submissions WHERE student_email = ? AND lesson_id = ?')
      .bind(email, lessonId),
  ]);

  return json({ ok: true });
};

// QuizView writes grade_json as { variant, quiz: [{ id, picked, correct? }] }.
function isQuizGrade(gradeJson: string | null): boolean {
  if (!gradeJson) return false;
  try {
    return Array.isArray((JSON.parse(gradeJson) as { quiz?: unknown } | null)?.quiz);
  } catch {
    return false;
  }
}

// The submitted payload is { answers, graded: true }; keep the answers. An
// unreadable one reopens as a blank quiz rather than failing the unsubmit.
function savedAnswers(response: string): unknown {
  try {
    const answers = (JSON.parse(response) as { answers?: unknown } | null)?.answers;
    if (answers && typeof answers === 'object') return answers;
  } catch {
    return {};
  }
  return {};
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
