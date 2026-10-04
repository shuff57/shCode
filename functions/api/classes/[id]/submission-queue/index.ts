// GET  /api/classes/[id]/submission-queue
// POST /api/classes/[id]/submission-queue   body: { submissionId, score, feedback? }
//
// Teacher review queue for AI-graded written submissions.
// GET returns the 50 most recent graded submissions across all enrolled
// students. That includes attempts the grader FAILED on: those carry a
// gradingFailed marker in grade_json with score NULL, so they match this
// query unchanged and surface as "needs manual grade" in the UI.
// POST lets a teacher override the AI score and optionally attach feedback.
//
// Auth: caller must be an owner / co-teacher of the class OR an admin.

import { canManageClass } from '../../../../_shared/classAuth';
import { bestScoreOverAllRows, capFor, rowScore, scoreOverride } from '../../../../_shared/attempts';
import { loadAiGrader } from '../../../../_shared/aiGraders';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

interface SubmissionRow {
  id: string;
  student_email: string;
  lesson_id: string;
  response: string;
  grade_json: string | null;
  score: number | null;
  possible: number | null;
  submitted_at: number;
}

interface OverrideBody {
  submissionId: string;
  /** Required unless `clearOverride` is set. On a pass/fail capped part this is CRITERIA MET,
   *  out of the rubric's criteria count (0..N); on a pointed part it is points. */
  score?: number;
  feedback?: string;
  /** Capped parts only: make this mark THE stored score even when it is lower than the
   *  student's best. PERSISTED (lesson_state.score_override) so the student's next completion,
   *  a later try or a give-back cannot undo it. Absent/false keeps the higher of the mark and the
   *  student's best, and leaves any override already in force exactly as it is. */
  replaceBest?: boolean;
  /** Capped parts only: drop the persisted override and go back to the best the rows give. */
  clearOverride?: boolean;
}

// GET — return the 50 most recent AI-graded submissions for this class.
export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async (
  context: Ctx,
) => {
  const { env, data, params } = context;
  const classId = params.id;

  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  const now = Date.now();

  const result = await env.DB.prepare(
    `SELECT id, student_email, lesson_id, response, grade_json, score, possible, submitted_at
       FROM lesson_submissions
      WHERE grade_json IS NOT NULL
        AND student_email IN (
          SELECT student_email FROM enrollments
           WHERE class_id = ?1 AND expires_at > ?2
        )
      ORDER BY submitted_at DESC
      LIMIT 50`,
  )
    .bind(classId, now)
    .all<SubmissionRow>();

  return json({ submissions: result.results ?? [] });
};

// POST — teacher overrides an AI grade.
export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (
  context: Ctx,
) => {
  const { env, data, params, request } = context;
  const classId = params.id;

  if (typeof classId !== 'string' || !classId) return json({ error: 'classId required' }, 400);

  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') {
    return json({ error: 'Not authorized for this class' }, 403);
  }

  let body: OverrideBody;
  try {
    body = (await request.json()) as OverrideBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.submissionId || typeof body.submissionId !== 'string') {
    return json({ error: 'submissionId required' }, 400);
  }
  const clearOnly = body.clearOverride === true && body.score === undefined;
  if (!clearOnly) {
    if (typeof body.score !== 'number' || !Number.isFinite(body.score) || body.score < 0 || body.score > 100000) {
      return json({ error: 'score must be a finite number between 0 and 100000' }, 400);
    }
  }

  // Fetch the submission to verify it belongs to an enrolled student.
  const submission = await env.DB.prepare(
    `SELECT id, student_email, lesson_id, grade_json, score, possible
       FROM lesson_submissions
      WHERE id = ?1`,
  )
    .bind(body.submissionId)
    .first<{ id: string; student_email: string; lesson_id: string; grade_json: string | null; score: number | null; possible: number | null }>();

  if (!submission) return json({ error: 'Submission not found' }, 404);

  // Confirm the student is actively enrolled in this class.
  const now = Date.now();
  const enrollment = await env.DB.prepare(
    `SELECT 1 FROM enrollments
      WHERE class_id = ?1 AND student_email = ?2 AND expires_at > ?3`,
  )
    .bind(classId, submission.student_email, now)
    .first();

  if (!enrollment) return json({ error: 'Student not enrolled in this class' }, 403);

  const capped = capFor(submission.lesson_id) !== undefined;
  if (clearOnly && !capped) return json({ error: 'That part has no try limit, so there is no score choice to clear.' }, 400);

  let existing: Record<string, unknown> = {};
  try {
    existing = submission.grade_json ? (JSON.parse(submission.grade_json) as Record<string, unknown>) : {};
  } catch {
    existing = {};
  }

  // The mark's UNIT. A pass/fail part (an all-0-point rubric) is graded as criteria met out of
  // criteria total, so that is what the teacher is marking and the ceiling is the criteria
  // count: "AI score: 0 / 0" and a bare number with no unit let a teacher who typed 1 meaning
  // "pass" give 1/6. A pointed part's ceiling is its points. Where nothing says (an outage row on
  // an uncapped part) the old 0..100000 range stands.
  // The row's own denominator first (what it was actually graded out of), then the criteria it
  // carries (pass/fail), then the part's rubric (an outage row has neither).
  let ceiling: number | null = null;
  const rowCriteria = Array.isArray(existing.criteria) ? existing.criteria.length : 0;
  if (typeof submission.possible === 'number' && submission.possible > 0) {
    ceiling = submission.possible;
  } else if (rowCriteria > 0) {
    ceiling = rowCriteria;
  } else {
    const grader = await loadAiGrader(env, request, submission.lesson_id);
    if (grader && grader.rubric.length > 0) {
      const pts = grader.rubric.reduce((n, r) => n + (typeof r.points === 'number' && r.points > 0 ? r.points : 0), 0);
      ceiling = pts > 0 ? pts : grader.rubric.length;
    }
  }
  if (!clearOnly && ceiling !== null && capped && (body.score as number) > ceiling) {
    return json({ error: `score must be between 0 and ${ceiling}`, ceiling }, 400);
  }

  // Build updated grade_json, appending teacher feedback if provided. The AI's own score for
  // the row is kept (once) as `aiScore`: rowScore() reads a teacher-marked row as the higher of the
  // mark and that, so a mark can raise the part's grade but never quietly lower it. Lowering it on
  // purpose is replaceBest, which lives in lesson_state.score_override, not on the row, so
  // clearing the override returns the part to what the rows give.
  let updatedGradeJson: string | null = null;
  if (!clearOnly) {
    const parsed = { ...existing };
    if (typeof parsed.aiScore !== 'number') {
      const ai = rowScore({ score: submission.score, possible: submission.possible, gradeJson: existing });
      if (ai !== null) parsed.aiScore = ai;
    }
    if (body.feedback) {
      parsed.teacherFeedback = body.feedback;
      parsed.teacherReviewedAt = now;
      parsed.teacherReviewedBy = data.email;
    } else {
      // No feedback: keep existing grade_json but still record the override timestamp.
      parsed.teacherOverriddenAt = now;
      parsed.teacherOverriddenBy = data.email;
    }
    updatedGradeJson = JSON.stringify(parsed);

    await env.DB.prepare(
      `UPDATE lesson_submissions
          SET score = ?1, grade_json = ?2
        WHERE id = ?3`,
    )
      .bind(body.score, updatedGradeJson, body.submissionId)
      .run();
  }

  // Sync lesson_state so the override reaches the gradebook and progress views.
  //
  // Upsert rather than UPDATE: a submission recorded because grading FAILED
  // never created a lesson_state row, so the old UPDATE matched nothing and a
  // hand-set score silently went nowhere. On insert the row is marked
  // completed — a teacher setting a score by hand is the act of finishing the
  // lesson, and green-to-advance needs it to unlock the next one. On conflict
  // only the score moves, so an existing row's state is left exactly as it was.
  //
  // On a CAPPED part "the best try counts" (.gauntlet/SPEC-attempt-caps.md), and a mark
  // written straight through used to bypass that: a student with a best of 8 and a stranded
  // outage-marker row the teacher marked 5 dropped to 5, until the next completion put the
  // 8 back. Here the teacher's mark is the score of THAT row only (never lower than the
  // AI's own score for it), and the part's stored score is the best over every row. A teacher
  // who really means "this is the grade, lower or not" sends replaceBest: true, which is
  // PERSISTED in lesson_state.score_override: the student's next completion, a later try
  // and a give-back all leave it alone, and only a teacher changes it (replaceBest again with
  // another mark, clearOverride, or a tries-reset 'reset'). A plain mark leaves an override in
  // force exactly as it was and says so (overrideActive).
  let stateScore: number;
  let overrideNow: number | null = null;
  if (capped) {
    const prior = await scoreOverride(env.DB, submission.student_email, submission.lesson_id);
    if (body.clearOverride === true) overrideNow = null;
    else if (body.replaceBest === true) overrideNow = body.score as number;
    else overrideNow = prior; // a plain mark never changes an override already in force
    stateScore = overrideNow ?? (await bestScoreOverAllRows(env.DB, submission.student_email, submission.lesson_id)) ?? (body.score as number);
  } else {
    stateScore = body.score as number;
  }
  await env.DB.prepare(
    capped
      ? `INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score, score_override)
         VALUES (?1, ?2, 'completed', ?3, ?3, ?4, ?5)
         ON CONFLICT (student_email, lesson_id)
         DO UPDATE SET score = excluded.score, score_override = excluded.score_override`
      : `INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score)
         VALUES (?1, ?2, 'completed', ?3, ?3, ?4)
         ON CONFLICT (student_email, lesson_id)
         DO UPDATE SET score = excluded.score`,
  )
    .bind(...(capped
      ? [submission.student_email, submission.lesson_id, now, stateScore, overrideNow]
      : [submission.student_email, submission.lesson_id, now, stateScore]))
    .run();

  return json({
    id: body.submissionId,
    student_email: submission.student_email,
    lesson_id: submission.lesson_id,
    score: clearOnly ? null : body.score,
    stateScore,
    overrideActive: overrideNow !== null,
    ceiling,
    grade_json: updatedGradeJson ?? submission.grade_json,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
