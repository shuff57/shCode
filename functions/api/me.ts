// GET /api/me — returns the signed-in student's email + role + displayName
// so the client can show admin UI and a name without decoding the session
// cookie itself. displayName is read from the DB, not the JWT: a name edit
// must take effect immediately, not after the next 30-day-token login.
//
// PUT /api/me — { name: string | null } updates the caller's own
// display_name. The WHERE clause scopes to the session email, never a
// client-supplied one — same ownership pattern as the uploads DELETE route.

import { normalizeEmail } from './_shared/auth';

interface Env {
  DB: D1Database;
}

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

const MAX_NAME_LEN = 100;

interface StudentRow {
  display_name: string | null;
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { env, data } = context;

  const row = await env.DB.prepare('SELECT display_name FROM students WHERE email = ?')
    .bind(data.email)
    .first<StudentRow>();

  return json({
    email: data.email,
    role: data.role,
    displayName: row?.display_name ?? null,
  });
};

interface Body {
  name?: string | null;
}

export const onRequestPut: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const trimmed = String(body.name || '').trim();
  if (trimmed.length > MAX_NAME_LEN) {
    return json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer` }, 400);
  }
  const displayName = trimmed.length > 0 ? trimmed : null;

  const email = normalizeEmail(data.email);
  await env.DB.prepare('UPDATE students SET display_name = ? WHERE email = ?')
    .bind(displayName, email)
    .run();

  return json({ email, role: data.role, displayName });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
