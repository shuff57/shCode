// GET  /api/classes/[id]/guests  — the guests students of this class asked to bring in, and the class switch
// POST /api/classes/[id]/guests  { action: 'approve' | 'decline' | 'revoke', id }   a decision
//                                { action: 'class-off' | 'class-on' }                the switch
//
// Migration 0059; rules in functions/_shared/guests.ts. Owner, co-teacher or admin of the class. Nothing is live until a
// teacher approves: 'approve' (a waiting request) makes the guest approved until the school year's cutoff, 'decline' (a
// waiting one) is a no that stands (the pair cannot be invited again by code), 'revoke' (an approved one) ends it AND drops
// the guest's seats in the host's running sessions at once. "class-off" stops new invites and every guest of this class
// joining anything until it is switched back on.
//
// This is the ONE list that carries an email (the guest's), plus their account's role and age: signup has no email
// verification, so who someone is rests on the teacher's judgement of exactly these signals and the host's own words.

import { canManageClass } from '../../../../_shared/classAuth';
import { getCurrentExpirationDate } from '../../../../_shared/schoolYear';
import { closeGuestSeats } from '../../../../_shared/guestSeats';
import type { GuestRow } from '../../../../_shared/guests';
import { ownerLabel } from '../../../../_shared/libraryShare';

interface Env {
  DB: D1Database;
  LIVE?: DurableObjectNamespace;
  LIVE_DOC?: DurableObjectNamespace;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

const RECENT_MS = 30 * 86_400_000;

async function allowed(env: Env, data: SessionData, classId: string): Promise<Response | null> {
  if (data.role === 'student') return json({ error: 'Teachers only' }, 403);
  const acl = await canManageClass(env.DB, data.email, classId);
  if (!acl.class) return json({ error: 'Class not found' }, 404);
  if (!acl.canManage && data.role !== 'admin') return json({ error: 'Not your class' }, 403);
  return null;
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
}

async function view(env: Env, classId: string) {
  const now = Date.now();
  const cls = await env.DB.prepare(`SELECT guests_off FROM classes WHERE id = ?`).bind(classId).first<{ guests_off: number | null }>();
  const rows = (await env.DB.prepare(
    `SELECT g.*, h.first_name AS h_first, h.last_name AS h_last, u.first_name AS u_first, u.last_name AS u_last, u.role AS u_role, u.created_at AS u_since
       FROM sandbox_guests g LEFT JOIN students h ON h.email = g.host_email LEFT JOIN students u ON u.email = g.guest_email
      WHERE g.class_id = ?1 AND g.status IN ('pending', 'approved', 'declined', 'revoked') AND (g.status IN ('pending', 'approved') OR g.decided_at > ?2)
      ORDER BY CASE g.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, COALESCE(g.decided_at, g.redeemed_at) DESC LIMIT 100`,
  ).bind(classId, now - RECENT_MS).all<GuestRow & { h_first: string | null; h_last: string | null; u_first: string | null; u_last: string | null; u_role: string | null; u_since: number | null }>()).results ?? [];
  const unused = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sandbox_guests WHERE class_id = ? AND status = 'invited' AND expires_at > ?`).bind(classId, now).first<{ n: number }>();
  return {
    guestsOff: !!cls?.guests_off,
    unusedCodes: unused?.n ?? 0,
    guests: rows.map((r) => ({
      id: r.id, status: r.status,
      host: fullName(r.h_first, r.h_last) || ownerLabel(r.h_first, r.h_last),
      guest: { name: fullName(r.u_first, r.u_last), email: r.guest_email, role: r.u_role, accountSince: r.u_since },
      relation: r.relation, askedAt: r.redeemed_at, decidedAt: r.decided_at, endsAt: r.ends_at,
      endedBy: r.status === 'declined' || r.status === 'revoked'
        ? (r.decided_by === r.host_email ? 'host' : r.decided_by === r.guest_email ? 'guest' : 'teacher') : null,
    })),
  };
}

export const onRequestGet: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  return json(await view(env, classId));
};

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data, request }: Ctx) => {
  const classId = String(params.id);
  const refused = await allowed(env, data, classId);
  if (refused) return refused;
  let body: { action?: unknown; id?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  if (body.action === 'class-off' || body.action === 'class-on') {
    await env.DB.prepare(`UPDATE classes SET guests_off = ? WHERE id = ?`).bind(body.action === 'class-off' ? 1 : 0, classId).run();
    return json(await view(env, classId));
  }

  if (body.action === 'approve' || body.action === 'decline' || body.action === 'revoke') {
    if (typeof body.id !== 'string' || !/^[0-9a-f]{32}$/.test(body.id)) return json({ error: 'Not found' }, 404);
    const row = await env.DB.prepare(`SELECT * FROM sandbox_guests WHERE id = ? AND class_id = ?`).bind(body.id, classId).first<GuestRow>();
    if (!row) return json({ error: 'Not found' }, 404);
    const now = Date.now();

    if (body.action === 'revoke') {
      const res = await env.DB.prepare(`UPDATE sandbox_guests SET status = 'revoked', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'approved'`).bind(data.email, now, row.id).run();
      if (!res.meta.changes) return json({ error: 'That guest is not approved.' }, 409);
      if (row.guest_email) await closeGuestSeats(env.DB, env, row.host_email, row.guest_email, now);
      return json(await view(env, classId));
    }

    if (row.status !== 'pending') return json({ error: 'That request has already been decided.' }, 409);
    if (body.action === 'approve') {
      // A host who has left the class cannot vouch for anyone any more.
      const host = await env.DB.prepare(`SELECT 1 AS x FROM enrollments WHERE class_id = ? AND student_email = ? AND expires_at > ?`).bind(classId, row.host_email, now).first();
      if (!host) return json({ error: 'The student who invited them is not in this class any more.' }, 409);
    }
    const res = body.action === 'approve'
      ? await env.DB.prepare(`UPDATE sandbox_guests SET status = 'approved', decided_by = ?, decided_at = ?, ends_at = ? WHERE id = ? AND status = 'pending'`).bind(data.email, now, getCurrentExpirationDate(), row.id).run()
      : await env.DB.prepare(`UPDATE sandbox_guests SET status = 'declined', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'`).bind(data.email, now, row.id).run();
    if (!res.meta.changes) return json({ error: 'That request has already been decided.' }, 409);
    return json(await view(env, classId));
  }

  return json({ error: 'Unknown action' }, 400);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
