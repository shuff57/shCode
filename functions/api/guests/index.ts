// GET  /api/guests   — what the caller has: the guests they invited (`hosted`), where they are a guest (`asGuest`),
//                      and whether and through which classes they may invite (`classes`, `limits`)
// POST /api/guests   { classId, name, relation, age: 'teen' | 'adult', org, purpose }  — make a one-use invite code (a student, through one of their live classes)
//
// Migration 0059; every rule is functions/_shared/guests.ts. The code is the host's to read out or send as a link
// (/guest/?code=...): it is shown only here, only to the host, only while it is unused and unexpired. The host never
// types an email. `relation` is their own words for who this is ("my cousin"), at most 60 characters, checked for
// personal details; the teacher reads it when deciding. Names are first name + last initial; no email in any answer.

import {
  CODE_LEN, INVITE_TTL_MS, MAX_GUESTS_PER_HOST, cleanGuestDetails, clearOldPhrases, inviteProblem, newGuestCode, newGuestId, parseDomainList, schoolState, type GuestRow,
} from '../../_shared/guests';
import { ownerLabel, studentClassIds } from '../../_shared/libraryShare';
import { personLabel } from '../../_shared/messages';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const RECENT_MS = 14 * 86_400_000;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const now = Date.now();
  const me = data.email;
  await clearOldPhrases(env.DB, now);

  const hostedRows = (await env.DB.prepare(
    `SELECT g.*, c.name AS class_name, s.first_name, s.last_name FROM sandbox_guests g
       JOIN classes c ON c.id = g.class_id LEFT JOIN students s ON s.email = g.guest_email
      WHERE g.host_email = ?1 AND (
        (g.status = 'invited' AND g.expires_at > ?2) OR g.status IN ('pending', 'approved')
        OR (g.status IN ('declined', 'revoked') AND g.decided_at > ?3))
      ORDER BY g.invited_at DESC LIMIT 50`,
  ).bind(me, now, now - RECENT_MS).all<GuestRow & { class_name: string; first_name: string | null; last_name: string | null }>()).results ?? [];

  const guestRows = (await env.DB.prepare(
    `SELECT g.*, c.name AS class_name, c.owner_email, c.guest_school_required, c.guest_school_domains, h.first_name, h.last_name, t.first_name AS t_first, t.last_name AS t_last
       FROM sandbox_guests g JOIN classes c ON c.id = g.class_id
       LEFT JOIN students h ON h.email = g.host_email LEFT JOIN students t ON t.email = c.owner_email
      WHERE g.guest_email = ?1 AND (g.status IN ('pending', 'approved') OR (g.status IN ('declined', 'revoked') AND g.decided_at > ?2))
      ORDER BY g.redeemed_at DESC LIMIT 50`,
  ).bind(me, now - RECENT_MS).all<GuestRow & { class_name: string; guest_school_required: number; guest_school_domains: string; first_name: string | null; last_name: string | null; t_first: string | null; t_last: string | null }>()).results ?? [];

  let classes: { id: string; name: string; guestsOff: boolean }[] = [];
  if (data.role === 'student') {
    const ids = await studentClassIds(env.DB, me, now);
    if (ids.length) {
      classes = ((await env.DB.prepare(`SELECT id, name, guests_off FROM classes WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name`)
        .bind(...ids).all<{ id: string; name: string; guests_off: number }>()).results ?? []).map((c) => ({ id: c.id, name: c.name, guestsOff: !!c.guests_off }));
    }
  }

  return json({
    hosted: hostedRows.map((r) => ({
      id: r.id, status: r.status, className: r.class_name, relation: r.relation, invitedName: r.guest_name, age: r.guest_age, org: r.guest_org, purpose: r.guest_purpose,
      guest: r.guest_email ? ownerLabel(r.first_name, r.last_name) : null,
      ...(r.status === 'invited' ? { code: r.code, expiresAt: r.expires_at } : {}),
      endsAt: r.ends_at, decidedAt: r.decided_at,
    })),
    asGuest: guestRows.map((r) => ({
      id: r.id, status: r.status, host: ownerLabel(r.first_name, r.last_name), className: r.class_name,
      teacher: personLabel(r.t_first, r.t_last, true), endsAt: r.ends_at, decidedAt: r.decided_at,
      // The school-email proof (0061), only while a request waits. The guest's OWN address, never the phrase: that is on the teacher's card.
      ...(r.status === 'pending' ? {
        school: {
          state: schoolState(!!r.guest_school_required, r, now),
          email: r.school_email,
          domains: r.guest_school_required ? parseDomainList(r.guest_school_domains) : [],
        },
      } : {}),
    })),
    classes,
    canInvite: data.role === 'student' && classes.length > 0,
    limits: { maxGuests: MAX_GUESTS_PER_HOST, ttlDays: Math.round(INVITE_TTL_MS / 86_400_000), codeLength: CODE_LEN },
  });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { classId?: unknown; name?: unknown; relation?: unknown; age?: unknown; org?: unknown; purpose?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const now = Date.now();
  const bad = await inviteProblem(env.DB, data, body.classId, now);
  if (bad) return json({ error: bad.error }, bad.status);
  const details = cleanGuestDetails(body);
  if ('error' in details) return json({ error: details.error }, 400);

  const id = newGuestId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newGuestCode();
    try {
      await env.DB.prepare(
        `INSERT INTO sandbox_guests (id, host_email, class_id, code, relation, guest_name, guest_age, guest_org, guest_purpose, status, invited_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'invited', ?, ?)`,
      ).bind(id, data.email, body.classId as string, code, details.relation, details.name, details.age, details.org, details.purpose, now, now + INVITE_TTL_MS).run();
      const cls = await env.DB.prepare(`SELECT name FROM classes WHERE id = ?`).bind(body.classId as string).first<{ name: string }>();
      return json({ id, code, expiresAt: now + INVITE_TTL_MS, className: cls?.name ?? '', link: `/guest/?code=${code}` }, 201);
    } catch (err) {
      // A code another invite holds: try another. Anything else is a real failure.
      if (!String(err instanceof Error ? err.message : err).includes('UNIQUE')) throw err;
    }
  }
  return json({ error: 'Could not make a code just now. Try again.' }, 503);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
