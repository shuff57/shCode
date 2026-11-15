// Ending a guest drops their seats in running sessions at once (migration 0059; rules in guests.ts). Kept apart from
// guests.ts because it needs rooms.ts and live.ts, and rooms.ts mayJoin imports guests.ts.

import { getRoom, liveRoomKey } from './rooms';
import { tellLiveRoom } from './live';

interface LiveEnv { LIVE?: DurableObjectNamespace; LIVE_DOC?: DurableObjectNamespace }

/**
 * Drop the guest's seats in this host's running rooms: mark them left in D1 (a left seat cannot rejoin once mayJoin says
 * no) and tell the live room (its existing `leave` control closes that socket; LiveDoc and LiveRoom both handle it, so a
 * revoke needs no Worker change). Best effort on the live half: a room nobody is connected to has nothing to close, and
 * the socket route refuses an unapproved guest anyway. Returns how many seats went.
 */
export async function closeGuestSeats(db: D1Database, env: LiveEnv, host: string, guest: string, now = Date.now()): Promise<number> {
  const seats = (await db.prepare(
    `SELECT p.code, p.seat FROM game_room_players p JOIN game_rooms r ON r.code = p.code
      WHERE r.host_email = ? AND p.email = ? AND p.left_at IS NULL AND r.closed_at IS NULL AND r.expires_at > ?`,
  ).bind(host, guest, now).all<{ code: string; seat: number }>()).results ?? [];
  let n = 0;
  for (const s of seats) {
    const res = await db.prepare(`UPDATE game_room_players SET left_at = ? WHERE code = ? AND seat = ? AND email = ? AND left_at IS NULL`)
      .bind(now, s.code, s.seat, guest).run();
    if (!res.meta.changes) continue;
    n += 1;
    const room = await getRoom(db, s.code);
    if (room && room.live === 1) {
      await tellLiveRoom(room.kind === 'code' ? env.LIVE_DOC : env.LIVE, liveRoomKey(room), { op: 'leave', seat: s.seat });
    }
  }
  return n;
}
