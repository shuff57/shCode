// GET /api/me — returns the signed-in student's email + role + firstName/
// lastName so the client can show admin UI and a name without decoding the
// session cookie itself. The name is read from the DB, not the JWT: an edit
// must take effect immediately, not after the next 30-day-token login.
//
// PUT /api/me — { firstName?, lastName? } updates the caller's own name,
// independently. The WHERE clause scopes to the session email, never a
// client-supplied one — same ownership pattern as the uploads DELETE route.

import { normalizeEmail } from '../_shared/auth';

interface Env {
  DB: D1Database;
}

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

const MAX_NAME_LEN = 100;

interface StudentRow {
  first_name: string | null;
  last_name: string | null;
}

export const onRequestGet: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { env, data } = context;

  const row = await env.DB.prepare('SELECT first_name, last_name FROM students WHERE email = ?')
    .bind(data.email)
    .first<StudentRow>();

  return json({
    email: data.email,
    role: data.role,
    firstName: row?.first_name ?? null,
    lastName: row?.last_name ?? null,
  });
};

interface Body {
  firstName?: string | null;
  lastName?: string | null;
}

/** Trim to null-if-empty, capped at MAX_NAME_LEN. */
function cleanName(raw: string | null | undefined): string | null | 'too_long' {
  const trimmed = String(raw || '').trim();
  if (trimmed.length > MAX_NAME_LEN) return 'too_long';
  return trimmed.length > 0 ? trimmed : null;
}

export const onRequestPut: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const firstName = cleanName(body.firstName);
  if (firstName === 'too_long') {
    return json({ error: `First name must be ${MAX_NAME_LEN} characters or fewer` }, 400);
  }
  const lastName = cleanName(body.lastName);
  if (lastName === 'too_long') {
    return json({ error: `Last name must be ${MAX_NAME_LEN} characters or fewer` }, 400);
  }

  const email = normalizeEmail(data.email);
  await env.DB.prepare('UPDATE students SET first_name = ?, last_name = ? WHERE email = ?')
    .bind(firstName, lastName, email)
    .run();

  return json({ email, role: data.role, firstName, lastName });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
