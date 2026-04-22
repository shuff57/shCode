// GET    /api/lesson-drafts/[lessonId] -> { response, updatedAt } | 404
// POST   /api/lesson-drafts/[lessonId] body { response } -> upsert
// DELETE /api/lesson-drafts/[lessonId] -> remove
//
// One draft per student+lesson. The Save button on WrittenGrader POSTs here;
// Submit also syncs the draft so resuming shows the most recent text.

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, 'lessonId', { email: string }>;

interface DraftRow {
  response: string;
  updated_at: number;
}

export const onRequestGet: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  const row = await env.DB.prepare(
    'SELECT response, updated_at FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .first<DraftRow>();
  if (!row) return json({ error: 'Not found' }, 404);
  return json({ response: row.response, updatedAt: row.updated_at });
};

export const onRequestPost: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { request, env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  let body: { response?: string };
  try {
    body = (await request.json()) as { response?: string };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (typeof body.response !== 'string') {
    return json({ error: 'response (string) required' }, 400);
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO lesson_drafts (student_email, lesson_id, response, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(student_email, lesson_id) DO UPDATE SET
       response = excluded.response,
       updated_at = excluded.updated_at`,
  )
    .bind(data.email, lessonId, body.response, now)
    .run();

  return json({ ok: true, updatedAt: now });
};

export const onRequestDelete: PagesFunction<Env, 'lessonId', { email: string }> = async (context: Ctx) => {
  const { env, data, params } = context;
  const lessonId = params.lessonId;
  if (typeof lessonId !== 'string' || !lessonId) return json({ error: 'lessonId required' }, 400);

  await env.DB.prepare(
    'DELETE FROM lesson_drafts WHERE student_email = ? AND lesson_id = ?',
  )
    .bind(data.email, lessonId)
    .run();
  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
