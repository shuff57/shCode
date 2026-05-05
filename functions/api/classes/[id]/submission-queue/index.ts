// GET  /api/classes/[id]/submission-queue
// POST /api/classes/[id]/submission-queue   body: { submissionId, score, feedback? }
//
// Teacher review queue for AI-graded written submissions.
// GET returns the 50 most recent graded submissions across all enrolled students.
// POST lets a teacher override the AI score and optionally attach feedback.
//
// Auth: caller must be an owner / co-teacher of the class OR an admin.

import { canManageClass } from '../../../../_shared/classAuth';

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
  score: number;
  feedback?: string;
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
  if (typeof body.score !== 'number') {
    return json({ error: 'score (number) required' }, 400);
  }

  // Fetch the submission to verify it belongs to an enrolled student.
  const submission = await env.DB.prepare(
    `SELECT id, student_email, lesson_id, grade_json
       FROM lesson_submissions
      WHERE id = ?1`,
  )
    .bind(body.submissionId)
    .first<{ id: string; student_email: string; lesson_id: string; grade_json: string | null }>();

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

  // Build updated grade_json, appending teacher feedback if provided.
  let updatedGradeJson: string;
  if (body.feedback) {
    let parsed: Record<string, unknown>;
    try {
      parsed = submission.grade_json
        ? (JSON.parse(submission.grade_json) as Record<string, unknown>)
        : {};
    } catch {
      parsed = {};
    }
    parsed.teacherFeedback = body.feedback;
    parsed.teacherReviewedAt = now;
    parsed.teacherReviewedBy = data.email;
    updatedGradeJson = JSON.stringify(parsed);
  } else {
    // No feedback — keep existing grade_json but still record the override timestamp.
    let parsed: Record<string, unknown>;
    try {
      parsed = submission.grade_json
        ? (JSON.parse(submission.grade_json) as Record<string, unknown>)
        : {};
    } catch {
      parsed = {};
    }
    parsed.teacherOverriddenAt = now;
    parsed.teacherOverriddenBy = data.email;
    updatedGradeJson = JSON.stringify(parsed);
  }

  // Update the submission row.
  await env.DB.prepare(
    `UPDATE lesson_submissions
        SET score = ?1, grade_json = ?2
      WHERE id = ?3`,
  )
    .bind(body.score, updatedGradeJson, body.submissionId)
    .run();

  // Update lesson_state.score so the override is reflected in gradebook / progress views.
  await env.DB.prepare(
    `UPDATE lesson_state
        SET score = ?1
      WHERE student_email = ?2 AND lesson_id = ?3`,
  )
    .bind(body.score, submission.student_email, submission.lesson_id)
    .run();

  return json({
    id: body.submissionId,
    student_email: submission.student_email,
    lesson_id: submission.lesson_id,
    score: body.score,
    grade_json: updatedGradeJson,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
