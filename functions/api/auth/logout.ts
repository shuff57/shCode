// POST /api/auth/logout — clears the session cookie. Always returns 200.

import { buildSessionCookie } from '../../_shared/auth';

export const onRequestPost: PagesFunction = async ({ request }) => {
  const secure = new URL(request.url).protocol === 'https:';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie('', 0, secure),
    },
  });
};
