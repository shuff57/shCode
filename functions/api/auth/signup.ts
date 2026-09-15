// POST /api/auth/signup — { email, password } -> 201 + session cookie.
// 409 if the email is already registered.

import {
  buildSessionCookie,
  hashPassword,
  isAdminEmail,
  isTeacherEmail,
  normalizeEmail,
  signSession,
} from '../../_shared/auth';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  ADMIN_EMAILS?: string;
  TEACHER_EMAILS?: string;
}

type Ctx = EventContext<Env, string, { email: string }>;

interface Body {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const MAX_NAME_LEN = 100;

/** Trim to null-if-empty, capped at MAX_NAME_LEN. Each half is independent —
 *  a user can set only a first name. */
function cleanName(raw: string | undefined): string | null | 'too_long' {
  const trimmed = String(raw || '').trim();
  if (trimmed.length > MAX_NAME_LEN) return 'too_long';
  return trimmed.length > 0 ? trimmed : null;
}

export const onRequestPost: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env } = context;
  if (!env.AUTH_SECRET) return json({ error: 'Server missing AUTH_SECRET' }, 500);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email) return json({ error: 'Email required' }, 400);
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

  // Optional, independently. Empty/omitted stores NULL — every display site
  // falls back to email in that case.
  const firstName = cleanName(body.firstName);
  if (firstName === 'too_long') {
    return json({ error: `First name must be ${MAX_NAME_LEN} characters or fewer` }, 400);
  }
  const lastName = cleanName(body.lastName);
  if (lastName === 'too_long') {
    return json({ error: `Last name must be ${MAX_NAME_LEN} characters or fewer` }, 400);
  }

  const existing = await env.DB.prepare('SELECT email FROM students WHERE email = ?')
    .bind(email)
    .first<{ email: string }>();
  if (existing) return json({ error: 'An account with that email already exists' }, 409);

  const passwordHash = await hashPassword(password);
  const role = isAdminEmail(email, env.ADMIN_EMAILS)
    ? 'admin'
    : isTeacherEmail(email, env.TEACHER_EMAILS)
    ? 'teacher'
    : 'student';
  await env.DB.prepare(
    'INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(email, passwordHash, Date.now(), role, firstName, lastName)
    .run();

  const token = await signSession(email, role, env.AUTH_SECRET);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ email, role, firstName, lastName }, 201, {
    'Set-Cookie': buildSessionCookie(token, 60 * 60 * 24 * 30, secure),
  });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
