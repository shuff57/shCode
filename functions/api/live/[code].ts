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
//
// ?watch=1 (migration 0054, "Watch live"): a teacher of the class, or someone a message invited to watch
// this very session, gets a watch ticket: no seat in D1, and the LiveDoc refuses its edits.
//
// Code together (migration 0044): a room of kind 'code' goes to env.LIVE_DOC
// (the LiveDoc class in the same Worker) with a DocTicket instead, and answers
// 503 without that binding. Each Durable Object also refuses the other kind's
// ticket, so a code room can never reach LiveRoom nor a game room LiveDoc.

import { TICKET_HEADER, encodeDocTicket, encodeTicket } from '../../../lib/live-protocol';
import { CODE_OFFLINE, LIVE_OFFLINE, authorizeLive } from '../../_shared/live';
import { json } from '../../_shared/rooms';

interface Env { DB: D1Database; LIVE?: DurableObjectNamespace; LIVE_DOC?: DurableObjectNamespace }
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
  if (!env.LIVE && !env.LIVE_DOC) return json({ error: LIVE_OFFLINE, offline: true }, 503);

  // ?watch=1: a read-only seat (functions/_shared/live.ts mayWatch; the room refuses its edits).
  const auth = await authorizeLive(env.DB, data.email, data.role, params.code, url.searchParams.get('device'), Date.now(), url.searchParams.get('watch') === '1');
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const ns = auth.kind === 'code' ? env.LIVE_DOC : env.LIVE;
  if (!ns) return json({ error: auth.kind === 'code' ? CODE_OFFLINE : LIVE_OFFLINE, offline: true }, 503);

  if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') {
    return json({ ok: true, seat: auth.ticket.seat, seats: auth.ticket.seats, kind: auth.kind });
  }
  const headers = new Headers(request.headers);
  headers.delete('Cookie');
  headers.delete('Authorization');
  headers.set(TICKET_HEADER, auth.kind === 'code' ? encodeDocTicket(auth.ticket) : encodeTicket(auth.ticket));
  const stub = ns.get(ns.idFromName(auth.roomKey));
  return stub.fetch(new Request('https://live.internal/connect', { method: 'GET', headers }));
};
