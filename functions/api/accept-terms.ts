// POST /api/accept-terms — { confirmedAge13: true, acceptedTerms: true }
// A signed-in student (typically an account made before the signup
// checkboxes existed) confirms they are 13+ and accepts the Terms of Service
// and Privacy Policy. Records the time and terms version. The first
// acceptance wins: an existing timestamp is never overwritten.

import { TERMS_VERSION } from '../_shared/terms';

interface Env {
  DB: D1Database;
}

type Session = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, Session>;

interface Body {
  confirmedAge13?: boolean;
  acceptedTerms?: boolean;
}

export const onRequestPost: PagesFunction<Env, string, Session> = async (context: Ctx) => {
  const { request, env, data } = context;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (body.confirmedAge13 !== true) {
    return json({ error: 'You must be at least 13 years old to use shCode on your own' }, 400);
  }
  if (body.acceptedTerms !== true) {
    return json({ error: 'You must agree to the Terms of Service and Privacy Policy' }, 400);
  }

  await env.DB.prepare(
    'UPDATE students SET terms_accepted_at = ?, terms_version = ? WHERE email = ? AND terms_accepted_at IS NULL',
  )
    .bind(Date.now(), TERMS_VERSION, data.email)
    .run();

  return json({ ok: true });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
