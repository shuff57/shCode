// POST /api/rooms/[code]/send -- { data } one move from a player in the room.
// Game data only (checkGameData): numbers, true/false and short words, 1 KB.
// Answers { seq }. Rate limited per player; a room holds MAX_EVENTS_PER_ROOM.

import {
  MAX_EVENTS_PER_ROOM, RATE_LIMIT, RATE_WINDOW_MS, checkGameData, deviceOf, getRoom, json, normalizeCode,
} from '../../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'code', SessionData>;

export const onRequestPost: PagesFunction<Env, 'code', SessionData> = async ({ env, data, params, request }: Ctx) => {
  const code = normalizeCode(params.code);
  if (!code) return json({ error: 'A room code is 4 pictures (4 letters, like BHKE).' }, 400);
  const text = await request.text();
  if (text.length > 4096) return json({ error: 'That move is too big.' }, 413);
  let body: { data?: unknown; device?: unknown };
  try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!body || !('data' in body)) return json({ error: 'Nothing to send.' }, 400);
  const problem = checkGameData(body.data);
  if (problem) return json({ error: problem }, 400);

  const now = Date.now();
  const room = await getRoom(env.DB, code);
  const me = room
    ? await env.DB.prepare('SELECT seat, left_at FROM game_room_players WHERE code = ? AND email = ? AND device = ?')
        .bind(code, data.email, deviceOf(body.device)).first<{ seat: number; left_at: number | null }>()
    : null;
  if (!room || !me || me.left_at) return json({ error: 'You are not in that room.' }, 404);
  if (room.closed_at || room.expires_at <= now) return json({ error: 'That room has closed.' }, 410);

  const counts = await env.DB.prepare(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN seat = ? AND created_at > ? THEN 1 ELSE 0 END) AS recent
       FROM game_room_events WHERE code = ?`,
  ).bind(me.seat, now - RATE_WINDOW_MS, code).first<{ total: number; recent: number | null }>();
  if ((counts?.total ?? 0) >= MAX_EVENTS_PER_ROOM) return json({ error: 'This room is full of moves. Start a new room.' }, 409);
  if ((counts?.recent ?? 0) >= RATE_LIMIT) {
    return json({ error: `Too many moves at once: at most ${RATE_LIMIT} every ${RATE_WINDOW_MS / 1000} seconds. Send a move when something changes, not every frame.` }, 429);
  }

  const payload = JSON.stringify(body.data);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await env.DB.prepare(
        `INSERT INTO game_room_events (code, seq, seat, data_json, created_at)
         SELECT ?1, COALESCE(MAX(seq), 0) + 1, ?2, ?3, ?4 FROM game_room_events WHERE code = ?1
         RETURNING seq`,
      ).bind(code, me.seat, payload, now).first<{ seq: number }>();
      return json({ seq: row?.seq ?? 0 });
    } catch (e) {
      if (!/UNIQUE|PRIMARY KEY|constraint/i.test(String(e))) throw e;
    }
  }
  return json({ error: 'Could not send. Try again.' }, 503);
};
