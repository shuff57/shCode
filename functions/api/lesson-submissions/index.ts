// GET  /api/lesson-submissions?lessonId=X -> list the student's graded submissions
// POST /api/lesson-submissions            -> record one, body:
//   { id, lessonId, response, gradeJson?, score?, possible? }
//
// Append-only history. WrittenGrader POSTs here after each successful grade.

import { resolveDueForStudent } from '../../_shared/dueDates';

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
}
type Ctx = EventContext<Env, string, { email: string }>;

interface Row {
  id: string;
  lesson_id: string;
  response: string;
  grade_json: string | null;
  score: number | null;
  possible: number | null;
  submitted_at: number;
}

interface CreateBody {
  id: string;
  lessonId: string;
  response: string;
  gradeJson?: unknown;
  score?: number;
  possible?: number;
}

export const onRequestGet: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  const lessonId = new URL(request.url).searchParams.get('lessonId');
  if (!lessonId) return json({ error: 'lessonId required' }, 400);

  const result = await env.DB.prepare(
    'SELECT id, lesson_id, response, grade_json, score, possible, submitted_at FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? ORDER BY submitted_at DESC',
  )
    .bind(data.email, lessonId)
    .all<Row>();

  return json({
    submissions: (result.results ?? []).map((r) => ({
      id: r.id,
      lessonId: r.lesson_id,
      response: r.response,
      gradeJson: r.grade_json ? JSON.parse(r.grade_json) : null,
      score: r.score,
      possible: r.possible,
      submittedAt: r.submitted_at,
    })),
  });
};

export const onRequestPost: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env, data } = context;
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.id || !body.lessonId || typeof body.response !== 'string') {
    return json({ error: 'id, lessonId, and response required' }, 400);
  }

  const now = Date.now();

  // Stamp the due date that was in force at this instant. Stored as the
  // resolved timestamp, not an is_late flag, so moving a due date later never
  // rewrites what already happened. Never blocks the submit — a resolution
  // failure just records NULL.
  let dueAtSubmit: number | null = null;
  try {
    dueAtSubmit = await resolveDueForStudent(env, request, data.email, body.lessonId);
  } catch {
    dueAtSubmit = null;
  }

  await env.DB.prepare(
    `INSERT INTO lesson_submissions
       (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at, due_at_submit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id,
      data.email,
      body.lessonId,
      body.response,
      body.gradeJson !== undefined ? JSON.stringify(body.gradeJson) : null,
      body.score ?? null,
      body.possible ?? null,
      now,
      dueAtSubmit,
    )
    .run();

  return json({ ok: true, submittedAt: now, dueAtSubmit, late: dueAtSubmit !== null && now > dueAtSubmit }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
