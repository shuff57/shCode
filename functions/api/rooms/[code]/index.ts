// GET /api/rooms/[code]?after=N -- what a player's sketch polls about once a
// second: the room's state, its players (seat and first name + last initial)
// and the moves after seq N (at most POLL_PAGE at a time; `more` says so).
// Players only; anyone else gets the same 404 as a code that does not exist.

import { POLL_PAGE, getRoom, json, normalizeCode, publicPlayers, roomPlayers, roomState } from '../../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

export const onRequestGet: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  const code = normalizeCode(params.code);
  if (!code) return json({ error: 'A room code is 6 letters and digits.' }, 400);
  const room = await getRoom(env.DB, code);
  const players = room ? await roomPlayers(env.DB, code) : [];
  const me = players.find((p) => p.email === data.email);
  if (!room || !me) return json({ error: 'You are not in that room.' }, 404);

  const after = Math.max(0, Math.floor(Number(new URL(request.url).searchParams.get('after')) || 0));
  const r = await env.DB.prepare(
    'SELECT seq, seat, data_json FROM game_room_events WHERE code = ? AND seq > ? ORDER BY seq LIMIT ?',
  ).bind(code, after, POLL_PAGE + 1).all<{ seq: number; seat: number; data_json: string }>();
  const rows = r.results ?? [];
  const more = rows.length > POLL_PAGE;
  const events = rows.slice(0, POLL_PAGE).map((e) => {
    let d: unknown = null;
    try { d = JSON.parse(e.data_json); } catch { /* stored by send.ts, always JSON */ }
    return { seq: e.seq, seat: e.seat, data: d };
  });
  const present = players.filter((p) => !p.left_at).length;
  return json({
    code,
    game: room.game,
    seats: room.seats,
    mySeat: me.seat,
    state: roomState(room, present),
    players: publicPlayers(players),
    events,
    more,
    expiresAt: room.expires_at,
  });
};
