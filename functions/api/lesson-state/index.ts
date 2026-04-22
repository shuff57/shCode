// GET /api/lesson-state -> list the signed-in student's lesson state rows.
// Middleware in functions/_middleware.ts 401s unauthenticated requests.

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, { email: string }>;

interface Row {
  lesson_id: string;
  state: 'started' | 'completed';
  started_at: number;
  completed_at: number | null;
  score: number | null;
}

export const onRequestGet: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { env, data } = context;
  const result = await env.DB.prepare(
    'SELECT lesson_id, state, started_at, completed_at, score FROM lesson_state WHERE student_email = ?',
  )
    .bind(data.email)
    .all<Row>();

  const states: Record<string, 'started' | 'completed'> = {};
  const scores: Record<string, number> = {};
  for (const r of result.results ?? []) {
    states[r.lesson_id] = r.state;
    if (r.score !== null) scores[r.lesson_id] = r.score;
  }

  return new Response(JSON.stringify({ states, scores }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
