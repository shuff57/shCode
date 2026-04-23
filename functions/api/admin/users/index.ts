// GET /api/admin/users — list every account with class/enrollment counts.
// Admin-only. Non-admin callers receive 403.

interface Env {
  DB: D1Database;
}

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface UserRow {
  email: string;
  role: string;
  created_at: number;
  classes_owned: number;
  active_enrollments: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;

  if (data.role !== 'admin') {
    return json({ error: 'Admin only' }, 403);
  }

  const now = Date.now();

  const result = await env.DB.prepare(
    `SELECT
      s.email, s.role, s.created_at,
      (SELECT COUNT(*) FROM classes c WHERE c.owner_email = s.email) AS classes_owned,
      (SELECT COUNT(*) FROM enrollments e WHERE e.student_email = s.email AND e.expires_at > ?) AS active_enrollments
    FROM students s
    ORDER BY s.created_at DESC`,
  )
    .bind(now)
    .all<UserRow>();

  return json({ users: result.results ?? [] });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
