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
    'INSERT INTO students (email, password_hash, created_at, role) VALUES (?, ?, ?, ?)',
  )
    .bind(email, passwordHash, Date.now(), role)
    .run();

  const token = await signSession(email, role, env.AUTH_SECRET);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ email, role }, 201, {
    'Set-Cookie': buildSessionCookie(token, 60 * 60 * 24 * 30, secure),
  });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
