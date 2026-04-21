// Single-shot lookup of the signed-in student's email from /api/me.
// The Pages Function middleware attaches the email from the verified
// Cloudflare Access JWT; the client just asks "who am I?".

export interface CurrentUser {
  email: string;
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
