// Who may open a real-time room's socket (GET /api/live/[code]). The SAME rules
// as the polling routes (functions/_shared/rooms.ts): the caller must hold a
// seat in this room from this browser tab (device), still share a live class
// with the host, and the room must be open. Used by the Pages Function and by
// the dev server's stand-in (scripts/dev-live.mjs), so both let in exactly the
// same people.
//
// A Code together session (game_rooms.kind 'code', migration 0044) is let in by
// the same rules and answers kind 'code' with a DocTicket: the socket goes to
// the LiveDoc Durable Object (env.LIVE_DOC), a game room's to LiveRoom (env.LIVE).

import { CONTROL_HEADER, codeLangOf, type DocTicket, type LiveTicket } from '../../lib/live-protocol';
import { ownerLabel } from './libraryShare';
import { type Role, deviceOf, getRoom, liveRoomKey, mayJoin, normalizeCode, roomKind, roomPlayers } from './rooms';

export type LiveAuth =
  | { ok: true; kind: 'game'; ticket: LiveTicket; roomKey: string }
  | { ok: true; kind: 'code'; ticket: DocTicket; roomKey: string }
  | { ok: false; status: number; error: string };

export const LIVE_OFFLINE = 'Real-time play is not switched on for this site yet. Ask your teacher.';
export const CODE_OFFLINE = 'Code together is not switched on for this site yet. Ask your teacher.';
export const NOT_IN_ROOM = 'You are not in that room.';

export async function authorizeLive(
  db: D1Database, email: string, role: Role, rawCode: unknown, rawDevice: unknown, now = Date.now(),
): Promise<LiveAuth> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, status: 400, error: 'A room code is 4 pictures (4 letters, like BHKE).' };
  const device = deviceOf(rawDevice);
  const room = await getRoom(db, code);
  const players = room ? await roomPlayers(db, code) : [];
  const me = players.find((p) => p.email === email && p.device === device);
  // A stranger, a code that does not exist and a seat in another tab all read the same.
  if (!room || !me || !(await mayJoin(db, room.host_email, email, role, now))) return { ok: false, status: 404, error: NOT_IN_ROOM };
  if (room.closed_at || room.expires_at <= now) return { ok: false, status: 410, error: 'That room has closed. Ask for a new code.' };
  if (me.left_at) return { ok: false, status: 404, error: 'You left that room. Join it again to play.' };
  if (room.live !== 1) return { ok: false, status: 409, error: 'That room is not a real-time room.' };
  const ticket: LiveTicket = { code, seat: me.seat, seats: room.seats, name: ownerLabel(me.first_name, me.last_name), expiresAt: room.expires_at };
  const roomKey = liveRoomKey(room);
  if (roomKind(room) !== 'code') return { ok: true, kind: 'game', roomKey, ticket };
  const lang = codeLangOf(room.game);
  if (!lang) return { ok: false, status: 409, error: 'That session is not for a sandbox program.' };
  const host = players.find((p) => p.seat === 0);
  return {
    ok: true,
    kind: 'code',
    roomKey,
    ticket: {
      ...ticket, kind: 'code', email, host: room.host_email,
      hostName: host ? ownerLabel(host.first_name, host.last_name) : '', lang, roomKey, startedAt: room.created_at,
    },
  };
}

/**
 * Tell a live room that a seat left or the host closed it (leave.ts). Best
 * effort: a room nobody is connected to has nothing to close, and the socket
 * route refuses a closed room anyway.
 */
export async function tellLiveRoom(ns: DurableObjectNamespace | undefined, roomKey: string, op: { op: 'close' } | { op: 'leave'; seat: number }): Promise<void> {
  if (!ns) return;
  try {
    await ns.get(ns.idFromName(roomKey)).fetch('https://live.internal/control', {
      method: 'POST',
      headers: { [CONTROL_HEADER]: JSON.stringify(op) },
    });
  } catch { /* the room will refuse on its own */ }
}
