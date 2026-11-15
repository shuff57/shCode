// DELETE /api/guests/[id]  — the HOST or the GUEST ends it (migration 0059, functions/_shared/guests.ts)
//
//   an unused code (host)             the row is deleted: the code stops working
//   a request still waiting           the row is deleted (the host cancelled it, or the guest withdrew)
//   an approved guest                 status 'revoked', decided_by the one who ended it, and the guest's seats in the host's
//                                     running sessions are dropped at once (guestSeats.ts closeGuestSeats)
// A host or guest ending it themselves does not bar the pair from being invited again; only a TEACHER's no does
// (redeem.ts). Anyone else, a missing id and an already-ended row all read the same 404.

import { closeGuestSeats } from '../../_shared/guestSeats';
import type { GuestRow } from '../../_shared/guests';

interface Env {
  DB: D1Database;
  LIVE?: DurableObjectNamespace;
  LIVE_DOC?: DurableObjectNamespace;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async ({ params, env, data }: Ctx) => {
  const id = String(params.id);
  if (!/^[0-9a-f]{32}$/.test(id)) return json({ error: 'Not found' }, 404);
  const row = await env.DB.prepare(`SELECT * FROM sandbox_guests WHERE id = ?`).bind(id).first<GuestRow>();
  const mine = !!row && (row.host_email === data.email || row.guest_email === data.email);
  if (!row || !mine || row.status === 'declined' || row.status === 'revoked') return json({ error: 'Not found' }, 404);
  const now = Date.now();

  if (row.status === 'invited' || row.status === 'pending') {
    // Only the host may cancel an unused code; the guest may withdraw a request they made.
    if (row.status === 'invited' && row.host_email !== data.email) return json({ error: 'Not found' }, 404);
    await env.DB.prepare(`DELETE FROM sandbox_guests WHERE id = ? AND status IN ('invited', 'pending')`).bind(id).run();
    return json({ ok: true, ended: 'cancelled' });
  }

  await env.DB.prepare(`UPDATE sandbox_guests SET status = 'revoked', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'approved'`).bind(data.email, now, id).run();
  const seats = row.guest_email ? await closeGuestSeats(env.DB, env, row.host_email, row.guest_email, now) : 0;
  return json({ ok: true, ended: 'revoked', seatsClosed: seats });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
