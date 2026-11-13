// Runs before every Pages request. For /api/* it verifies the session cookie
// and attaches the authenticated student's email to context.data so
// downstream handlers can scope everything to the caller.
//
// Auth endpoints under /api/auth/* bypass this check so users can sign up
// or log in while unauthenticated.
//
// Work owner (lib/owned-storage.ts; the id is a keyed hash of the email, see
// functions/_shared/auth.ts workOwnerFor, so it never needs a database read):
//  * A page keeps its account's work in this browser under the id in the readable
//    `shcode_owner` cookie, fixed when the page loads. Every response to a request
//    with a valid session sets that cookie when it is missing or wrong: a page DOCUMENT
//    load (before any script runs; an older session without the `wo` claim is re-signed
//    with it, keeping its end time) and any /api/* answer, /api/me included. A document
//    load with no valid session clears a left-over owner cookie.
//  * Every /api/* request a page makes carries `X-Work-Owner: <the page's owner>`. If
//    the session's account is someone else (another student signed in in another tab
//    after this page loaded, or a request was still in flight when the account
//    changed), the request is refused with 409 {error:'owner-mismatch'} and nothing is
//    written. A request WITHOUT the header (a bundle cached from before this change)
//    is handled exactly as before. /api/accept-terms is exempt (session still
//    required): the sign-in dialog calls it from a page that loaded signed out.

import {
  buildOwnerCookie,
  buildSessionCookie,
  OWNER_COOKIE,
  readCookie,
  readSessionCookie,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  WORK_OWNER_HEADER,
  workOwnerFor,
  type Session,
} from './_shared/auth';
import {
  isOwnerMismatch,
  OWNER_CHECK_EXEMPT,
  OWNER_MISMATCH_BODY,
  OWNER_MISMATCH_HEADER,
  wantsDocument,
} from './_shared/ownerCheck';

interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
}

// `wo`: the session's work owner, so GET /api/me can hand it to the page (lib/outbox.ts confirms
// the account before uploading). Routes that do not read it are unaffected.
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student'; wo?: string };
type Ctx = EventContext<Env, string, SessionData>;

const PUBLIC_API_PREFIXES = ['/api/auth/'];

export const onRequest: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) return document(context, url);
  if (PUBLIC_API_PREFIXES.some((p) => url.pathname.startsWith(p))) return next();

  if (!env.AUTH_SECRET) {
    return json({ error: 'Server missing AUTH_SECRET' }, 500);
  }

  const token = readSessionCookie(request);
  if (!token) return json({ error: 'Not signed in' }, 401);

  const session = await verifySession(token, env.AUTH_SECRET);
  if (!session) return json({ error: 'Invalid session' }, 401);

  const wo = session.wo ?? (await workOwnerFor(session.email, env.AUTH_SECRET));
  const claimed = request.headers.get(WORK_OWNER_HEADER);
  if (!OWNER_CHECK_EXEMPT.includes(url.pathname) && isOwnerMismatch(claimed, wo)) {
    return json(OWNER_MISMATCH_BODY, 409, { [OWNER_MISMATCH_HEADER]: '1' });
  }

  data.email = session.email;
  data.role = session.role;
  data.wo = wo;
  const res = await next();
  if (readCookie(request, OWNER_COOKIE) === wo) return res;
  // A WebSocket upgrade (101, /api/live/*) cannot be rebuilt without losing its socket.
  if (res.status === 101 || (res as Response & { webSocket?: unknown }).webSocket) return res;
  // The browser holds this session but not (or not the right) owner cookie: give it the
  // account's, so the next page load keeps its work under the account, never `guest`.
  const out = new Response(res.body, res);
  out.headers.append('Set-Cookie', buildOwnerCookie(wo, maxAgeOf(session), url.protocol === 'https:'));
  return out;
};

function maxAgeOf(session: Session): number {
  const nowSec = Math.floor(Date.now() / 1000);
  return session.exp ? Math.max(0, session.exp - nowSec) : SESSION_TTL_SECONDS;
}

/** Non-API requests: pass through, fixing the owner cookie on a page load. Never fails the page. */
async function document(context: Ctx, url: URL): Promise<Response> {
  const { request, env, next } = context;
  let cookies: string[] = [];
  try {
    if (env.AUTH_SECRET && wantsDocument(request)) cookies = await ownerCookiesFor(request, env, url);
  } catch (error) {
    console.error('owner cookie check failed:', error);
    cookies = [];
  }
  const res = await next();
  if (cookies.length === 0) return res;
  const out = new Response(res.body, res);
  for (const c of cookies) out.headers.append('Set-Cookie', c);
  return out;
}

async function ownerCookiesFor(request: Request, env: Env, url: URL): Promise<string[]> {
  const secure = url.protocol === 'https:';
  const have = readCookie(request, OWNER_COOKIE);
  const token = readSessionCookie(request);
  const session: Session | null = token ? await verifySession(token, env.AUTH_SECRET) : null;
  if (!session) {
    // No session (signed out, expired, or a rotated secret): the page is a guest.
    return have !== null ? [buildOwnerCookie('', 0, secure)] : [];
  }
  const maxAge = maxAgeOf(session);
  if (session.wo) {
    return have === session.wo ? [] : [buildOwnerCookie(session.wo, maxAge, secure)];
  }
  // A session signed before the `wo` claim existed: re-sign the SAME session with it,
  // keeping its end time, and set the owner cookie beside it.
  const wo = await workOwnerFor(session.email, env.AUTH_SECRET);
  const resigned = await signSession(session.email, session.role, env.AUTH_SECRET, session.exp);
  return [buildSessionCookie(resigned, maxAge, secure), buildOwnerCookie(wo, maxAge, secure)];
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}
