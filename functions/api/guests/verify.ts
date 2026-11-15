// POST /api/guests/verify  { phrase }   (the guest, signed in)
// POST /api/guests/school  { id, schoolEmail }  is in school.ts
//
// The last step of the school-email proof (migration 0061, functions/_shared/guests.ts): the guest types back the phrase their
// school inbox received from the teacher. It matches only a request of THEIR OWN that is still waiting, on a class that asked for
// the proof, with a live phrase. A match marks the proof done and DELETES the phrase; it does not approve anything (a teacher
// still decides). A wrong phrase counts: after MAX_PHRASE_TRIES the phrase is deleted and a teacher has to make a new one, so six
// characters cannot be guessed at. The phrase is never sent to this page or to the host: only the teacher's card shows it.

import { MAX_PHRASE_TRIES, clearOldPhrases, normalizeSchoolPhrase, type GuestRow } from '../../_shared/guests';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const NOTHING = 'There is nothing to confirm right now. Ask your teacher for a new phrase.';

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { phrase?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const phrase = normalizeSchoolPhrase(body.phrase);
  if (!phrase) return json({ error: 'The phrase is 6 letters and numbers, like shcode-K7Q2M9.' }, 400);
  const now = Date.now();
  await clearOldPhrases(env.DB, now);

  const live = (await env.DB.prepare(
    `SELECT g.* FROM sandbox_guests g JOIN classes c ON c.id = g.class_id
      WHERE g.guest_email = ? AND g.status = 'pending' AND c.guest_school_required = 1 AND g.school_verified_at IS NULL AND g.school_phrase IS NOT NULL`,
  ).bind(data.email).all<GuestRow>()).results ?? [];
  if (!live.length) return json({ error: NOTHING }, 404);

  const hit = live.find((r) => r.school_phrase === phrase);
  if (!hit) {
    // A wrong phrase counts against every phrase this person is waiting on; at the limit the phrase is deleted.
    await env.DB.prepare(
      `UPDATE sandbox_guests SET school_tries = school_tries + 1 WHERE guest_email = ? AND status = 'pending' AND school_verified_at IS NULL AND school_phrase IS NOT NULL`,
    ).bind(data.email).run();
    await env.DB.prepare(
      `UPDATE sandbox_guests SET school_phrase = NULL WHERE guest_email = ? AND status = 'pending' AND school_verified_at IS NULL AND school_tries >= ?`,
    ).bind(data.email, MAX_PHRASE_TRIES).run();
    const left = MAX_PHRASE_TRIES - Math.min(...live.map((r) => r.school_tries)) - 1;
    return json({
      error: left > 0 ? `That is not the phrase. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That is not the phrase, and you are out of tries. Ask your teacher for a new one.',
      triesLeft: Math.max(0, left),
    }, 400);
  }

  // Single use: only the press that still finds the phrase wins.
  const res = await env.DB.prepare(
    `UPDATE sandbox_guests SET school_verified_at = ?, school_phrase = NULL, school_tries = 0 WHERE id = ? AND status = 'pending' AND school_phrase = ? AND school_verified_at IS NULL`,
  ).bind(now, hit.id, phrase).run();
  if (!res.meta.changes) return json({ error: NOTHING }, 404);
  return json({ ok: true, verified: true, id: hit.id });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
