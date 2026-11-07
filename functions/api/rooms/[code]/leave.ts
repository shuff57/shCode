// POST /api/rooms/[code]/leave -- a player leaves. The seat stays theirs (a
// rejoin gets it back) but the others see them as gone. When the host leaves,
// the room closes.

import { getRoom, json, normalizeCode } from '../../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

export const onRequestPost: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params }: Ctx) => {
  const code = normalizeCode(params.code);
  if (!code) return json({ error: 'A room code is 6 letters and digits.' }, 400);
  const room = await getRoom(env.DB, code);
  if (!room) return json({ error: 'You are not in that room.' }, 404);
  const now = Date.now();
  const res = await env.DB.prepare('UPDATE game_room_players SET left_at = ? WHERE code = ? AND email = ? AND left_at IS NULL')
    .bind(now, code, data.email).run();
  if (room.host_email === data.email && !room.closed_at) {
    await env.DB.prepare('UPDATE game_rooms SET closed_at = ? WHERE code = ?').bind(now, code).run();
  }
  return json({ left: (res.meta?.changes ?? 0) > 0 });
};
