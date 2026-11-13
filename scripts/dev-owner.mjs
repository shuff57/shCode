// Dev server half of the work-owner rule (lib/owned-storage.ts, functions/_middleware.ts),
// so `npm run dev` behaves like production for per-account browser storage.
//
// The dev identity is the `dev_student` cookie (server.js devIdentity), not a session, so:
//  * Its owner id is computed the way production computes it (functions/_shared/auth.ts
//    workOwnerFor: base32 of HMAC-SHA256(secret, "work-owner:" + email), 16 characters),
//    with a fixed dev-only secret. No table, no lookup, stable across dev restarts.
//  * A page load sets `shcode_owner` to the identity's id (and clears it while signed out),
//    and so does any /api/* answer while it is missing or wrong, as production does.
//  * Sign-out sets `dev_signed_out=1` (the browser is then a guest: /api/me answers 401 and
//    the owner cookie is cleared); sign-in clears it. Both answer with the owner cookie in
//    the same response, as the real auth routes do.
//  * /api/* (but not /api/auth/*, nor the OWNER_CHECK_EXEMPT paths) with an X-Work-Owner
//    header that is not the identity's id is refused with 409 owner-mismatch, by the same
//    isOwnerMismatch() production uses.

import crypto from 'node:crypto';
import { isOwnerMismatch, OWNER_CHECK_EXEMPT, OWNER_MISMATCH_BODY, OWNER_MISMATCH_HEADER } from '../functions/_shared/ownerCheck.ts';

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
const MAX_AGE = 60 * 60 * 24 * 7;

const DEV_SECRET = 'shcode-dev-only-work-owner-secret';

export function devOwnerId(identity) {
  const mac = crypto.createHmac('sha256', DEV_SECRET).update(`work-owner:${String(identity).trim().toLowerCase()}`).digest();
  let out = '';
  let bits = 0;
  let acc = 0;
  for (let i = 0; i < mac.length && out.length < 16; i++) {
    acc = (acc << 8) | mac[i];
    bits += 8;
    while (bits >= 5 && out.length < 16) { bits -= 5; out += B32[(acc >> bits) & 31]; }
    acc &= (1 << bits) - 1;
  }
  return out;
}

const cookieOf = (req, name) => {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(req.headers.cookie || '');
  return m ? m[1] : null;
};
export const devSignedOut = (req) => cookieOf(req, 'dev_signed_out') === '1';

const ownerCookie = (v, maxAge) => `shcode_owner=${v}; Path=/; SameSite=Lax; Max-Age=${maxAge}`;

function isDocument(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const dest = req.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (req.get('accept') || '').includes('text/html');
}

/** Mount before every /api route. */
export function mountDevOwner({ server, devIdentity }) {
  server.use((req, res, next) => {
    const path = req.path || '';
    if (path.startsWith('/api/auth/')) return next();
    if (path.startsWith('/api/')) {
      if (devSignedOut(req)) {
        if (path === '/api/me') return res.status(401).json({ error: 'Not signed in' });
        return next();
      }
      const want = devOwnerId(devIdentity(req));
      const claimed = req.get('x-work-owner') ?? null;
      if (!OWNER_CHECK_EXEMPT.includes(path) && isOwnerMismatch(claimed, want)) {
        res.set(OWNER_MISMATCH_HEADER, '1');
        return res.status(409).json(OWNER_MISMATCH_BODY);
      }
      if (cookieOf(req, 'shcode_owner') !== want) res.append('Set-Cookie', ownerCookie(want, MAX_AGE));
      return next();
    }
    if (isDocument(req)) {
      const have = cookieOf(req, 'shcode_owner');
      if (devSignedOut(req)) {
        if (have !== null) res.append('Set-Cookie', ownerCookie('', 0));
      } else {
        const want = devOwnerId(devIdentity(req));
        if (have !== want) res.append('Set-Cookie', ownerCookie(want, MAX_AGE));
      }
    }
    return next();
  });
}

/** The dev sign-in and sign-out stubs' cookies. */
export function devSignInCookies(req, devIdentity) {
  return ['dev_signed_out=; Path=/; Max-Age=0', ownerCookie(devOwnerId(devIdentity(req)), MAX_AGE)];
}
export function devSignOutCookies() {
  return ['dev_signed_out=1; Path=/; SameSite=Lax', ownerCookie('', 0)];
}
