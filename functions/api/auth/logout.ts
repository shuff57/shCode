// POST /api/auth/logout — clears the session cookie and, in the same response, the
// readable work-owner cookie (lib/owned-storage.ts). Always returns 200.

import { buildOwnerCookie, buildSessionCookie } from '../../_shared/auth';

export const onRequestPost: PagesFunction = async ({ request }) => {
  const secure = new URL(request.url).protocol === 'https:';
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', buildSessionCookie('', 0, secure));
  headers.append('Set-Cookie', buildOwnerCookie('', 0, secure));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
