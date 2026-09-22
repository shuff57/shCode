// POST /api/auth/login — { email, password } -> 200 + session cookie.
// 401 if the pair is wrong; does NOT reveal whether the email exists.

import {
  buildSessionCookie,
  normalizeEmail,
  SESSION_TTL_SECONDS,
  signSession,
  verifyPassword,
} from '../../_shared/auth';
import { checkRateLimit, rateLimitExceeded } from '../../_shared/rateLimit';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

type Ctx = EventContext<Env, string, { email: string }>;

interface Body {
  email: string;
  password: string;
}

// Brute-force throttle: fail_count/locked_until live in the login_attempts
// table (migrations/0029), keyed by email so it survives across devices.
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

export const onRequestPost: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env } = context;
  if (!env.AUTH_SECRET) return json({ error: 'Server missing AUTH_SECRET' }, 500);

  // IP-scoped, on top of the per-email lockout below: that one stops an
  // attacker hammering a single account, this stops one IP hammering many.
  const rateLimitResult = await checkRateLimit(env.DB, request, 'login');
  if (!rateLimitResult.allowed) return rateLimitExceeded(rateLimitResult.retryAfter);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!email || !password) return json({ error: 'Invalid email or password' }, 401);

  const now = Date.now();
  const attempt = await env.DB.prepare(
    'SELECT fail_count, locked_until FROM login_attempts WHERE email = ?',
  )
    .bind(email)
    .first<{ fail_count: number; locked_until: number }>();
  if (attempt && attempt.locked_until > now) {
    const waitMin = Math.max(1, Math.ceil((attempt.locked_until - now) / 60000));
    return json(
      { error: `Too many failed attempts. Try again in ${waitMin} minute${waitMin === 1 ? '' : 's'}.` },
      429,
    );
  }

  const row = await env.DB.prepare(
    'SELECT password_hash, role, first_name, last_name FROM students WHERE email = ?',
  )
    .bind(email)
    .first<{ password_hash: string; role: string; first_name: string | null; last_name: string | null }>();
  if (!row) {
    await recordFailedLogin(env.DB, email, now);
    return json({ error: 'Invalid email or password' }, 401);
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    await recordFailedLogin(env.DB, email, now);
    return json({ error: 'Invalid email or password' }, 401);
  }

  // Reset the counter on success -- a typo streak should not carry into a
  // legitimate login later.
  await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(email).run();

  const role: 'admin' | 'teacher' | 'student' =
    row.role === 'admin' || row.role === 'teacher' ? row.role : 'student';
  const token = await signSession(email, role, env.AUTH_SECRET);
  const secure = new URL(request.url).protocol === 'https:';
  return json({ email, role, firstName: row.first_name, lastName: row.last_name }, 200, {
    'Set-Cookie': buildSessionCookie(token, SESSION_TTL_SECONDS, secure),
  });
};

async function recordFailedLogin(db: D1Database, email: string, now: number): Promise<void> {
  const lockUntil = now + LOCKOUT_MS;
  await db
    .prepare(
      `INSERT INTO login_attempts (email, fail_count, locked_until, updated_at)
       VALUES (?, 1, 0, ?)
       ON CONFLICT(email) DO UPDATE SET
         fail_count = fail_count + 1,
         updated_at = ?,
         locked_until = CASE WHEN fail_count + 1 >= ? THEN ? ELSE locked_until END`,
    )
    .bind(email, now, now, LOCKOUT_THRESHOLD, lockUntil)
    .run();
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
