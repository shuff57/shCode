// The page's call for the share picker (migration 0057). Browser only; the rules and types are in lib/audience.ts.

import type { AudienceOptions } from './audience';

/** Asks the server what to offer. Null when it cannot (offline, signed out): the share then goes as it always did. */
export async function fetchAudiences(): Promise<AudienceOptions | null> {
  try {
    const res = await fetch('/api/audiences', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return null;
    const b = (await res.json()) as AudienceOptions;
    return Array.isArray(b.classes) && Array.isArray(b.teachers) ? b : null;
  } catch {
    return null;
  }
}
