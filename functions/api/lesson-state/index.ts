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
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
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

  // The skip_lessons flag rides on the same response as the role so the
  // client snapshot can resolve every lock in one place. Absent column
  // (pre-0026) reads as false.
  const student = await env.DB.prepare('SELECT skip_lessons FROM students WHERE email = ?')
    .bind(data.email)
    .first<{ skip_lessons: number | null }>();

  return new Response(
    JSON.stringify({
      states,
      scores,
      role: data.role,
      skipLessons: student?.skip_lessons === 1,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
