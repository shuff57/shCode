// Runs before every /api/* Pages Function. Verifies the session cookie
// and attaches the authenticated student's email to context.data so
// downstream handlers can scope everything to the caller.
//
// Auth endpoints under /api/auth/* bypass this check so users can sign up
// or log in while unauthenticated.

import { readSessionCookie, verifySession } from './_shared/auth';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

type Ctx = EventContext<Env, string, { email: string }>;

const PUBLIC_API_PREFIXES = ['/api/auth/'];

export const onRequest: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) return next();
  if (PUBLIC_API_PREFIXES.some((p) => url.pathname.startsWith(p))) return next();

  if (!env.AUTH_SECRET) {
    return json({ error: 'Server missing AUTH_SECRET' }, 500);
  }

  const token = readSessionCookie(request);
  if (!token) return json({ error: 'Not signed in' }, 401);

  const session = await verifySession(token, env.AUTH_SECRET);
  if (!session) return json({ error: 'Invalid session' }, 401);

  data.email = session.email;
  return next();
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
