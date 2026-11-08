// POST /api/rooms/[code]/leave -- a player leaves. The seat stays theirs (a
// rejoin gets it back) but the others see them as gone. When the host leaves,
// the room closes.

import { deviceOf, getRoom, json, normalizeCode } from '../../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

export const onRequestPost: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  let body: { device?: unknown } = {};
  try { body = await request.json(); } catch { /* no body */ }
  const device = deviceOf(body?.device);
  const code = normalizeCode(params.code);
  if (!code) return json({ error: 'A room code is 4 pictures (4 letters, like BHKE).' }, 400);
  const room = await getRoom(env.DB, code);
  if (!room) return json({ error: 'You are not in that room.' }, 404);
  const now = Date.now();
  const res = await env.DB.prepare('UPDATE game_room_players SET left_at = ? WHERE code = ? AND email = ? AND device = ? AND left_at IS NULL')
    .bind(now, code, data.email, device).run();
  // The host is the seat-0 player: that tab leaving closes the room.
  const host = await env.DB.prepare('SELECT email, device FROM game_room_players WHERE code = ? AND seat = 0').bind(code).first<{ email: string; device: string }>();
  if (host && host.email === data.email && host.device === device && !room.closed_at) {
    await env.DB.prepare('UPDATE game_rooms SET closed_at = ? WHERE code = ?').bind(now, code).run();
  }
  return json({ left: (res.meta?.changes ?? 0) > 0 });
};
