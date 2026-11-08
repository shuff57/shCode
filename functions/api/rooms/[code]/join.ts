// POST /api/rooms/[code]/join -- take a seat in a classmate's room. Answers
// { code, seat, seats, game }. A seat is an account in one browser tab
// (body.device): joining again from the same tab gives the seat back (a
// rerun rejoins), and a second tab of the same account takes the next seat,
// so one student can try a two-player game alone. Classmates only: a code from outside
// your classes answers 404, the same as a code that does not exist, so codes
// cannot be probed.

import { deviceOf, getRoom, json, mayJoin, normalizeCode, roomPlayers } from '../../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

const NOT_FOUND = 'No room has that code in your classes. Check the code with the person hosting.';

export const onRequestPost: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  let body: { device?: unknown } = {};
  try { body = await request.json(); } catch { /* no body: device '' */ }
  const device = deviceOf(body?.device);
  const code = normalizeCode(params.code);
  if (!code) return json({ error: 'A room code is 4 pictures (4 letters, like BHKE).' }, 400);
  const now = Date.now();
  const room = await getRoom(env.DB, code);
  if (!room || !(await mayJoin(env.DB, room.host_email, data.email, data.role, now))) return json({ error: NOT_FOUND }, 404);
  if (room.closed_at || room.expires_at <= now) return json({ error: 'That room has closed. Ask for a new code.' }, 410);

  for (let attempt = 0; attempt < 4; attempt++) {
    const players = await roomPlayers(env.DB, code);
    const mine = players.find((p) => p.email === data.email && p.device === device);
    if (mine) {
      if (mine.left_at) await env.DB.prepare('UPDATE game_room_players SET left_at = NULL WHERE code = ? AND seat = ?').bind(code, mine.seat).run();
      return json({ code, seat: mine.seat, seats: room.seats, game: room.game, live: room.live === 1 });
    }
    const taken = new Set(players.map((p) => p.seat));
    let seat = -1;
    for (let s = 0; s < room.seats; s++) if (!taken.has(s)) { seat = s; break; }
    if (seat < 0) return json({ error: 'That room is full.' }, 409);
    try {
      await env.DB.prepare('INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES (?, ?, ?, ?, ?)')
        .bind(code, seat, data.email, device, now).run();
      return json({ code, seat, seats: room.seats, game: room.game, live: room.live === 1 });
    } catch (e) {
      if (!/UNIQUE|PRIMARY KEY|constraint/i.test(String(e))) throw e;
      // Someone took that seat at the same moment: look again.
    }
  }
  return json({ error: 'Could not take a seat. Try again.' }, 503);
};
