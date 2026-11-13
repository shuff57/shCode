// Every request this page makes to /api/* says which owner the page loaded with
// (`X-Work-Owner`, lib/owned-storage.ts). The server (functions/_middleware.ts)
// refuses a request whose session is someone else's with 409 owner-mismatch and
// writes nothing: a tab left open as A cannot hand in, save or upload into B's
// account after B signs in on the same computer.
//
// installed once, by components/OwnerNotices.tsx when the root layout's client
// chunk first runs, before any page effect can call fetch. It only adds a header
// and listens for that one refusal: no wait, no retry, no gate. A request to
// /api/auth/* (signing in must work from any tab), a GET of /api/me (it only says who
// is signed in, and a page that loaded signed out must be able to find out it is
// signed in now: lib/owner-guard.ts) and anything off-site is sent exactly as it was.
//
// After the server has refused once, later /api calls from this page are answered
// at once with the same 409 instead of being sent (no burst of refused requests
// from polling code), until the cookie names this page's owner again.

import { pageOwner, readOwnerCookie } from './owned-storage';

export const WORK_OWNER_HEADER = 'X-Work-Owner';
export const OWNER_MISMATCH_HEADER = 'X-Owner-Mismatch';

/** What a hand-in button says when the server refused it this way. */
export const OWNER_MISMATCH_HANDIN_TEXT =
  'Not handed in: someone else is signed in on this computer now. Your answer is kept on this computer under your own account. Sign in again as yourself to hand it in.';

/** True for the server's (or this page's) 409 owner-mismatch answer. */
export function isOwnerMismatchResponse(res: { status: number; headers: Headers }): boolean {
  return res.status === 409 && res.headers.get(OWNER_MISMATCH_HEADER) === '1';
}

type Fetch = typeof fetch;
type MismatchListener = () => void;

const listeners = new Set<MismatchListener>();
let mismatched = false;

/** Hear when the server has refused this page's request because the account changed. */
export function onOwnerMismatch(fn: MismatchListener): () => void {
  listeners.add(fn);
  if (mismatched) { try { fn(); } catch { /* ignore */ } }
  return () => { listeners.delete(fn); };
}
export function ownerMismatched(): boolean {
  return mismatched;
}

/** Whether a request to `url` from a page at `origin` gets the header. */
export function wantsOwnerHeader(url: string, origin: string, method = 'GET'): boolean {
  let u: URL;
  try { u = new URL(url, origin); } catch { return false; }
  if (u.origin !== origin) return false;
  if (u.pathname === '/api/me' && method.toUpperCase() === 'GET') return false;
  return u.pathname.startsWith('/api/') && !u.pathname.startsWith('/api/auth/');
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

function mismatchResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'owner-mismatch', message: 'Someone else is signed in on this computer now.' }),
    { status: 409, headers: { 'Content-Type': 'application/json', [OWNER_MISMATCH_HEADER]: '1' } },
  );
}

/** Wrap a fetch so page requests carry the owner. Exported for the tests. */
export function ownerFetch(base: Fetch, origin: string, owner: () => string, cookieOwner: () => string): Fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input);
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    if (!wantsOwnerHeader(url, origin, method)) return base(input, init);
    // The server exempts accepting the terms from owner matching (the sign-in dialog calls
    // it from a page that loaded signed out); this page's own latch must not stop it either.
    let exempt = false;
    try { exempt = new URL(url, origin).pathname.replace(/\/$/, '') === '/api/accept-terms'; } catch { exempt = false; }
    if (exempt) return base(input, init);
    if (mismatched) {
      if (cookieOwner() !== owner()) return mismatchResponse();
      mismatched = false; // the right account is back
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(WORK_OWNER_HEADER, owner());
    const res = await base(input, { ...init, headers });
    if (res.status === 409 && res.headers.get(OWNER_MISMATCH_HEADER) === '1') {
      const first = !mismatched;
      mismatched = true;
      if (first) for (const fn of [...listeners]) { try { fn(); } catch { /* ignore */ } }
    }
    return res;
  }) as Fetch;
}

let installed = false;
export function installOwnerFetch(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const owner = pageOwner(); // fixes this page's owner now, at load
  window.fetch = ownerFetch(window.fetch.bind(window), window.location.origin, () => owner, readOwnerCookie);
}

/** For tests: forget a previous refusal. */
export function __resetOwnerFetchForTests(): void {
  mismatched = false;
  listeners.clear();
}
