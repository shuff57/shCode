// GET /api/live/[code]?device=<tab> -- a real-time room's WebSocket
// (codehs-review/REALTIME-SPEC.md). Behind the auth middleware like every
// /api/* route. The caller must be a player in that room from this tab, with
// the same rules as the polling routes (functions/_shared/live.ts); the
// upgrade is then handed to the room's Durable Object (env.LIVE, the Worker in
// workers/live/) with a ticket naming the seat. The cookie is not passed on:
// the room trusts the ticket and nothing the client says.
//
// Without an Upgrade header it answers the same check as JSON
// ({ ok, seat, seats } or the error), which the page asks when a socket would
// not open, so a student is told WHY (closed, not in the room, not switched on).
//
// Fails CLOSED: with no LIVE binding (the site deployed before the Worker) it
// answers 503 and touches nothing else.

import { TICKET_HEADER, encodeTicket } from '../../../lib/live-protocol';
import { LIVE_OFFLINE, authorizeLive } from '../../_shared/live';
import { json } from '../../_shared/rooms';

interface Env { DB: D1Database; LIVE?: DurableObjectNamespace }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

export const onRequestGet: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  const url = new URL(request.url);
  // A page on another site must not open a socket as this student.
  const origin = request.headers.get('Origin');
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch { /* not a URL */ }
    if (host !== url.host) return json({ error: 'Wrong origin.' }, 403);
  }
  if (!env.LIVE) return json({ error: LIVE_OFFLINE, offline: true }, 503);

  const auth = await authorizeLive(env.DB, data.email, data.role, params.code, url.searchParams.get('device'));
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') {
    return json({ ok: true, seat: auth.ticket.seat, seats: auth.ticket.seats });
  }
  const headers = new Headers(request.headers);
  headers.delete('Cookie');
  headers.delete('Authorization');
  headers.set(TICKET_HEADER, encodeTicket(auth.ticket));
  const stub = env.LIVE.get(env.LIVE.idFromName(auth.roomKey));
  return stub.fetch(new Request('https://live.internal/connect', { method: 'GET', headers }));
};
