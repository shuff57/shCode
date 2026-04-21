// Client-side auth wrapper over /api/auth/* + /api/me.
// Uses same-origin cookies — the session cookie is HttpOnly and managed
// by the server.

export interface CurrentUser {
  email: string;
}

export class AuthError extends Error {
  constructor(public status: number, public serverMessage: string) {
    super(serverMessage || `${status}`);
  }
}

let cache: CurrentUser | null | undefined = undefined;
let inFlight: Promise<CurrentUser | null> | null = null;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (cache !== undefined) return cache;
  if (inFlight) return inFlight;
  inFlight = fetchCurrentUser().then((user) => {
    cache = user;
    inFlight = null;
    return user;
  });
  return inFlight;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ? { email: data.email } : null;
  } catch {
    return null;
  }
}

/** Force the next getCurrentUser() call to re-fetch. */
export function invalidateCurrentUser(): void {
  cache = undefined;
  inFlight = null;
}

async function postAuth(path: string, body: unknown): Promise<CurrentUser> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: { email?: string; error?: string } = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new AuthError(res.status, data.error || `${res.status}`);
  if (!data.email) throw new AuthError(500, 'No email in response');
  cache = { email: data.email };
  return cache;
}

export function signup(email: string, password: string): Promise<CurrentUser> {
  return postAuth('/api/auth/signup', { email, password });
}

export function login(email: string, password: string): Promise<CurrentUser> {
  return postAuth('/api/auth/login', { email, password });
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  invalidateCurrentUser();
}
