// GET /api/my-lesson-modes
//
// Every mode the caller's teachers have set, resolved across their active
// classes. Returned in bulk rather than per lesson: a lesson page would
// otherwise wait on a round trip before it could decide which editor to draw,
// and a student has at most a handful of overrides.
//
// Resolution here covers rules 1 and 2 (per-assignment, then class default).
// Rules 3 and 4 -- the lesson's own declaration, then 'both' -- are applied by
// the client, which is the side that already has lesson.json.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, never, SessionData>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction<Env, never, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const now = Date.now();

  // Join through active enrollments so a student cannot read a class they left,
  // and so an expired enrollment stops applying on its own.
  const rows = await env.DB.prepare(
    `SELECT m.lesson_id, m.mode, m.updated_at
       FROM lesson_modes m
       JOIN enrollments e ON e.class_id = m.class_id
      WHERE e.student_email = ?
        AND (e.expires_at IS NULL OR e.expires_at > ?)
      ORDER BY m.updated_at DESC`
  )
    .bind(data.email, now)
    .all<{ lesson_id: string; mode: string; updated_at: number }>();

  const list = rows.results ?? [];

  // Most recent wins on a tie. A student in two active classes whose teachers
  // disagree gets whichever teacher spoke last, which is the only rule that
  // explains itself to the one who just changed it.
  const perLesson: Record<string, string> = {};
  let classDefault: string | null = null;
  for (const r of list) {
    if (r.lesson_id === '*') {
      if (classDefault === null) classDefault = r.mode;
    } else if (!(r.lesson_id in perLesson)) {
      perLesson[r.lesson_id] = r.mode;
    }
  }

  return json({ classDefault, lessons: perLesson });
};
