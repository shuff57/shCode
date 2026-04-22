// POST /api/auth/login — { email, password } -> 200 + session cookie.
// 401 if the pair is wrong; does NOT reveal whether the email exists.

import {
  buildSessionCookie,
  normalizeEmail,
  signSession,
  verifyPassword,
} from '../../_shared/auth';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
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
  if (!email || !password) return json({ error: 'Invalid email or password' }, 401);

  const row = await env.DB.prepare(
    'SELECT password_hash, role FROM students WHERE email = ?',
  )
    .bind(email)
    .first<{ password_hash: string; role: string }>();
  if (!row) return json({ error: 'Invalid email or password' }, 401);

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return json({ error: 'Invalid email or password' }, 401);

  const role = row.role === 'admin' ? 'admin' : 'student';
  const token = await signSession(email, role, env.AUTH_SECRET);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ email, role }, 200, {
    'Set-Cookie': buildSessionCookie(token, 60 * 60 * 24 * 30, secure),
  });
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
