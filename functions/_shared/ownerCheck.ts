// The X-Work-Owner rule (lib/owned-storage.ts, functions/_middleware.ts), kept pure so
// scripts/test-owner-check.mjs and the dev server (server.js) use the same rule.
//
//  * No header: an old cached bundle. Accepted, exactly as before the header existed.
//  * Header equal to the account's id: accepted.
//  * Anything else, including `guest` (a page opened while signed out, now sending
//    under someone's cookie): refused with 409.

export const OWNER_MISMATCH_HEADER = 'X-Owner-Mismatch';

/**
 * Paths that need a session but are never refused for the owner: the sign-in dialog
 * records an older account's terms acceptance (components/AuthModal.tsx) from a page
 * that loaded signed out, so that page's owner is still `guest`. It writes nothing
 * personal to the browser and the session decides whose account it is.
 */
export const OWNER_CHECK_EXEMPT: readonly string[] = ['/api/accept-terms'];
export const OWNER_MISMATCH_BODY = {
  error: 'owner-mismatch',
  message: 'Someone else is signed in on this computer now. Nothing was saved to their account.',
} as const;

export function isOwnerMismatch(claimed: string | null, accountOwner: string | null | undefined): boolean {
  if (claimed === null) return false;
  if (!accountOwner) return false;
  return claimed !== accountOwner;
}

/** A top-level page load (HTML), not a script, image or fetch. */
export function wantsDocument(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const dest = request.headers.get('Sec-Fetch-Dest');
  if (dest) return dest === 'document';
  return (request.headers.get('Accept') || '').includes('text/html');
}
