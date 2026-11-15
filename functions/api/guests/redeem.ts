// POST /api/guests/redeem  { code }
//
// The guest, signed in with their own account, uses a host's one-use code (migration 0059, functions/_shared/guests.ts).
// It does NOT give access: it asks. The row becomes 'pending' and a teacher of the host's vouching class decides. A code
// that is wrong, used, expired or ended answers the same 404 (nothing to learn by guessing). Throttled per IP like the
// class code (`guestRedeem`). Refused when the caller is the host, already has a live class with the host (they can join
// that host's sessions as a classmate), the class switched guests off, a TEACHER of the class said no to this pair before
// (a host or guest ending it themselves does not count), or the caller has too many requests waiting.
// Anyone with an account may be a guest, a teacher included: the teacher decides, and sees the address and role to do it.

import { checkRateLimit, rateLimitExceeded } from '../../_shared/rateLimit';
import { MAX_PENDING_PER_CLASS, normalizeGuestCode, pendingInClass, type GuestRow } from '../../_shared/guests';
import { ownerLabel } from '../../_shared/libraryShare';
import { personLabel } from '../../_shared/messages';
import { liveClassIds } from '../../_shared/rooms';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

/** Requests one person may have waiting at once. */
export const MAX_PENDING_AS_GUEST = 5;
const GONE = 'That code is not valid. It may have been used, or it ran out. Ask for a new one.';

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  const limited = await checkRateLimit(env.DB, request, 'guestRedeem');
  if (!limited.allowed) return rateLimitExceeded(limited.retryAfter);

  let body: { code?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const code = normalizeGuestCode(body.code);
  if (!code) return json({ error: 'A guest code is 8 letters and numbers.' }, 400);
  const now = Date.now();

  const row = await env.DB.prepare(`SELECT * FROM sandbox_guests WHERE code = ?`).bind(code).first<GuestRow>();
  if (!row || row.status !== 'invited' || row.expires_at <= now) return json({ error: GONE }, 404);
  if (row.host_email === data.email) return json({ error: 'That is your own invite. Give the code to the person you are inviting.' }, 400);

  const cls = await env.DB.prepare(
    `SELECT c.name, c.guests_off, c.archived_at, c.owner_email, t.first_name, t.last_name FROM classes c LEFT JOIN students t ON t.email = c.owner_email WHERE c.id = ?`,
  ).bind(row.class_id).first<{ name: string; guests_off: number; archived_at: number | null; owner_email: string; first_name: string | null; last_name: string | null }>();
  if (!cls || cls.archived_at != null) return json({ error: GONE }, 404);
  if (cls.guests_off) return json({ error: `Guests are turned off in ${cls.name}.` }, 403);

  const host = await env.DB.prepare(`SELECT first_name, last_name FROM students WHERE email = ?`).bind(row.host_email).first<{ first_name: string | null; last_name: string | null }>();
  const hostName = ownerLabel(host?.first_name ?? null, host?.last_name ?? null);

  // Already a classmate (or an admin): they join this host's sessions anyway, so a guest row would only be noise.
  if (data.role === 'admin') return json({ error: 'You can already join anything.' }, 409);
  const [theirs, mine] = await Promise.all([liveClassIds(env.DB, row.host_email, now), liveClassIds(env.DB, data.email, now)]);
  for (const id of theirs) if (mine.has(id)) return json({ error: `You are already in a class with ${hostName}, so you can join their sessions without a guest code.` }, 409);

  const prior = (await env.DB.prepare(`SELECT status, decided_by FROM sandbox_guests WHERE host_email = ? AND guest_email = ?`).bind(row.host_email, data.email).all<{ status: string; decided_by: string | null }>()).results ?? [];
  if (prior.some((p) => p.status === 'pending' || p.status === 'approved')) return json({ error: `You already have a request with ${hostName}.` }, 409);
  // Only a TEACHER's no stands: a host or guest ending it themselves does not bar the pair.
  if (prior.some((p) => (p.status === 'declined' || p.status === 'revoked') && p.decided_by && p.decided_by !== row.host_email && p.decided_by !== data.email)) {
    return json({ error: `A teacher said no to this, so the code cannot be used.` }, 403);
  }
  const waiting = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sandbox_guests WHERE guest_email = ? AND status = 'pending'`).bind(data.email).first<{ n: number }>();
  if ((waiting?.n ?? 0) >= MAX_PENDING_AS_GUEST) return json({ error: `You already have ${MAX_PENDING_AS_GUEST} requests waiting for a teacher. Wait for some to be decided.` }, 409);
  if ((await pendingInClass(env.DB, row.class_id)) >= MAX_PENDING_PER_CLASS) return json({ error: 'That teacher has a lot of guests waiting. Try again later.' }, 409);

  // Single use, even if two people press at once: only the one that finds it still 'invited' wins.
  const res = await env.DB.prepare(
    `UPDATE sandbox_guests SET guest_email = ?, status = 'pending', redeemed_at = ? WHERE id = ? AND status = 'invited'`,
  ).bind(data.email, now, row.id).run();
  if (!res.meta.changes) return json({ error: GONE }, 404);

  return json({ ok: true, status: 'pending', host: hostName, className: cls.name, teacher: personLabel(cls.first_name, cls.last_name, true) }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
