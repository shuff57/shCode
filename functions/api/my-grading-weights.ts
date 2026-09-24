// GET /api/my-grading-weights
//
// The caller's own effective grade-category weights: the class from their
// most recently enrolled non-expired enrollment, with class_grading_weights
// overrides merged onto lib/grading-weights.ts DEFAULT_WEIGHTS for any
// category that class never set. A teacher/admin previewing the home page
// has no enrollment row, so this resolves straight to the defaults.
//
// Deliberately a single resolved map, not raw rows like /api/my-due-dates:
// weighting has no per-lesson inheritance chain to reconcile client-side,
// and a student is graded by ONE class's weights, not the earliest of
// several -- so there is nothing for the client to additionally resolve.

import { DEFAULT_WEIGHTS, GRADE_CATEGORIES, type GradeCategory } from '../../lib/grading-weights';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface EnrollmentRow {
  class_id: string;
}

interface WeightRow {
  category: string;
  weight: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const now = Date.now();

  const enrollment = await env.DB
    .prepare(
      `SELECT class_id FROM enrollments
       WHERE student_email = ? AND expires_at > ?
       ORDER BY enrolled_at DESC LIMIT 1`,
    )
    .bind(data.email, now)
    .first<EnrollmentRow>();

  const weights: Record<GradeCategory, number> = { ...DEFAULT_WEIGHTS };

  if (enrollment) {
    const result = await env.DB
      .prepare('SELECT category, weight FROM class_grading_weights WHERE class_id = ?')
      .bind(enrollment.class_id)
      .all<WeightRow>();
    for (const row of result.results ?? []) {
      if ((GRADE_CATEGORIES as string[]).includes(row.category)) {
        weights[row.category as GradeCategory] = row.weight;
      }
    }
  }

  return json({ weights });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
