// GET /api/lesson-state -> list the signed-in student's lesson state rows.
// Middleware in functions/_middleware.ts 401s unauthenticated requests.
// Response also carries the session role so the client can bypass lesson
// locks for admins and teachers without a separate /api/me round-trip.

interface Env {
  DB: D1Database;
}
type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

interface Row {
  lesson_id: string;
  state: 'started' | 'completed';
  started_at: number;
  completed_at: number | null;
  score: number | null;
  worked_at: number | null;
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { env, data } = context;
  // worked_at: the last time the student did anything in a lesson they have started and not finished (opened
  // it, saved a draft, or synced their files), so "Continue where you left off" can name the most recent one
  // (lib/module-next.ts). Only read for 'started' rows; a finished lesson needs no recency.
  const result = await env.DB.prepare(
    `SELECT ls.lesson_id, ls.state, ls.started_at, ls.completed_at, ls.score,
       CASE WHEN ls.state = 'started' THEN MAX(
         ls.started_at,
         COALESCE((SELECT d.updated_at FROM lesson_drafts d WHERE d.student_email = ls.student_email AND d.lesson_id = ls.lesson_id), 0),
         COALESCE((SELECT y.updated_at FROM lesson_sync y WHERE y.student_email = ls.student_email AND y.lesson_id = ls.lesson_id), 0)
       ) END AS worked_at
     FROM lesson_state ls WHERE ls.student_email = ?`,
  )
    .bind(data.email)
    .all<Row>();

  const states: Record<string, 'started' | 'completed'> = {};
  const scores: Record<string, number> = {};
  const workedAt: Record<string, number> = {};
  for (const r of result.results ?? []) {
    states[r.lesson_id] = r.state;
    if (r.score !== null) scores[r.lesson_id] = r.score;
    if (r.state === 'started' && typeof r.worked_at === 'number') workedAt[r.lesson_id] = r.worked_at;
  }

  return new Response(JSON.stringify({ states, scores, workedAt, role: data.role }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
