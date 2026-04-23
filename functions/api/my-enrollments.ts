// GET /api/my-enrollments
// Student sees their active enrollments. Returns class name + code +
// owner email so the UI can render "You're in: <class name> (taught by
// <owner>)".

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface Row {
  class_id: string;
  class_name: string;
  class_code: string;
  owner_email: string;
  enrolled_at: number;
  expires_at: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const now = Date.now();
  const result = await env.DB.prepare(
    `SELECT
       c.id          AS class_id,
       c.name        AS class_name,
       c.code        AS class_code,
       c.owner_email AS owner_email,
       e.enrolled_at AS enrolled_at,
       e.expires_at  AS expires_at
     FROM enrollments e
     JOIN classes c ON c.id = e.class_id
     WHERE e.student_email = ? AND e.expires_at > ?
     ORDER BY e.enrolled_at DESC`,
  )
    .bind(data.email, now)
    .all<Row>();

  return json({ enrollments: result.results ?? [] });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
