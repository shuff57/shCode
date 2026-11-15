// POST /api/guests/school  { id, schoolEmail }   (the guest, signed in)
//
// A request that is waiting (migration 0061) gets, or changes, the school address the guest says is theirs. Used when a class
// switched the school-email proof on AFTER the guest asked (so the request has no address yet), or when the guest typed the wrong
// one. It makes a fresh phrase for the teacher's card and clears any old one, so a phrase sent to the old address is dead. Refused
// once the proof is done (nothing to change), when the class does not ask for one, and for a request that is not the caller's.

import { cleanSchoolEmail, newSchoolPhrase, parseDomainList, type GuestRow } from '../../_shared/guests';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { id?: unknown; schoolEmail?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (typeof body.id !== 'string' || !/^[0-9a-f]{32}$/.test(body.id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(`SELECT * FROM sandbox_guests WHERE id = ? AND guest_email = ? AND status = 'pending'`).bind(body.id, data.email).first<GuestRow>();
  if (!row) return json({ error: 'Not found' }, 404);
  const cls = await env.DB.prepare(`SELECT guest_school_required, guest_school_domains FROM classes WHERE id = ?`).bind(row.class_id)
    .first<{ guest_school_required: number; guest_school_domains: string }>();
  if (!cls?.guest_school_required) return json({ error: 'That class does not ask for a school email.' }, 409);
  if (row.school_verified_at) return json({ error: 'Your school email is already confirmed.' }, 409);

  const school = cleanSchoolEmail(body.schoolEmail, parseDomainList(cls.guest_school_domains));
  if ('error' in school) return json({ error: school.error }, 400);
  const now = Date.now();
  const res = await env.DB.prepare(
    `UPDATE sandbox_guests SET school_email = ?, school_phrase = ?, school_phrase_at = ?, school_tries = 0
      WHERE id = ? AND guest_email = ? AND status = 'pending' AND school_verified_at IS NULL`,
  ).bind(school.email, newSchoolPhrase(), now, row.id, data.email).run();
  if (!res.meta.changes) return json({ error: 'Not found' }, 404);
  return json({ ok: true, schoolEmail: school.email, schoolProof: 'need-phrase' });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
