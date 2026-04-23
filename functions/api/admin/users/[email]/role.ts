// POST /api/admin/users/[email]/role — change a single user's role.
// Admin-only. Body: { role: 'admin' | 'teacher' | 'student' }
//
// Note on stale sessions: changing a user's role here does NOT invalidate
// their existing session JWT (which carries the old role). The affected
// user will continue to behave under the old role until their session
// expires or they log out and back in. This is intentional and consistent
// with the JWT-based auth model used throughout this app.

import { normalizeEmail } from '../../../../_shared/auth';

interface Env {
  DB: D1Database;
}

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, '[email]', SessionData>;

const VALID_ROLES = new Set(['admin', 'teacher', 'student']);

export const onRequestPost: PagesFunction<Env, '[email]', SessionData> = async (context: Ctx) => {
  const { request, env, data, params } = context;

  if (data.role !== 'admin') {
    return json({ error: 'Admin only' }, 403);
  }

  const targetEmail = normalizeEmail(decodeURIComponent(params['[email]'] as string));
  if (!targetEmail) {
    return json({ error: 'Missing email parameter' }, 400);
  }

  let body: { role?: unknown };
  try {
    body = (await request.json()) as { role?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const newRole = body.role;
  if (typeof newRole !== 'string' || !VALID_ROLES.has(newRole)) {
    return json({ error: 'role must be one of: admin, teacher, student' }, 400);
  }

  // Self-demotion guard: admin cannot demote their own account.
  const callerEmail = normalizeEmail(data.email);
  if (targetEmail === callerEmail && newRole !== 'admin') {
    return json({ error: "Can't demote yourself" }, 400);
  }

  // Verify target account exists.
  const existing = await env.DB.prepare('SELECT email FROM students WHERE email = ?')
    .bind(targetEmail)
    .first<{ email: string }>();
  if (!existing) {
    return json({ error: 'User not found' }, 404);
  }

  await env.DB.prepare('UPDATE students SET role = ? WHERE email = ?')
    .bind(newRole, targetEmail)
    .run();

  return json({ ok: true, email: targetEmail, role: newRole });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
