// POST /api/rooms -- { game, seats } host a new online game room. Answers
// { code, seat: 0 }. The host must be in a live class (as a student or a
// teacher), since only classmates can join; a fourth open room by the same
// host closes their oldest. Rooms a day past expiry are swept here.

import {
  GAME_RE, MAX_OPEN_ROOMS_PER_HOST, MAX_SEATS, ROOM_TTL_MS, deviceOf, json, liveClassIds, newRoomCode,
} from '../../_shared/rooms';

interface Env { DB: D1Database }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { game?: unknown; seats?: unknown; device?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const game = String(body?.game ?? 'game').toLowerCase();
  if (!GAME_RE.test(game)) return json({ error: 'The game name can use lowercase letters, digits and dashes (up to 24).' }, 400);
  const seats = body?.seats === undefined ? 2 : Number(body.seats);
  if (!Number.isInteger(seats) || seats < 2 || seats > MAX_SEATS) {
    return json({ error: `A room has 2 to ${MAX_SEATS} players.` }, 400);
  }

  const now = Date.now();
  if (data.role !== 'admin') {
    const classes = await liveClassIds(env.DB, data.email, now);
    if (classes.size === 0) {
      return json({ error: 'Online play is for classmates, so join your class first (Join your class, at the top).' }, 403);
    }
  }

  // Sweep: rooms a day past their end, with their players and events.
  const stale = now - ROOM_TTL_MS - 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM game_room_events WHERE code IN (SELECT code FROM game_rooms WHERE expires_at < ?)').bind(stale),
    env.DB.prepare('DELETE FROM game_room_players WHERE code IN (SELECT code FROM game_rooms WHERE expires_at < ?)').bind(stale),
    env.DB.prepare('DELETE FROM game_rooms WHERE expires_at < ?').bind(stale),
  ]);

  // At most MAX_OPEN_ROOMS_PER_HOST open rooms each: close the oldest beyond that.
  const open = await env.DB.prepare(
    'SELECT code FROM game_rooms WHERE host_email = ? AND closed_at IS NULL AND expires_at > ? ORDER BY created_at DESC',
  ).bind(data.email, now).all<{ code: string }>();
  const extra = (open.results ?? []).slice(MAX_OPEN_ROOMS_PER_HOST - 1);
  for (const r of extra) await env.DB.prepare('UPDATE game_rooms SET closed_at = ? WHERE code = ?').bind(now, r.code).run();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRoomCode();
    try {
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        ).bind(code, game, data.email, seats, now, now + ROOM_TTL_MS),
        env.DB.prepare('INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES (?, 0, ?, ?, ?)')
          .bind(code, data.email, deviceOf(body?.device), now),
      ]);
      return json({ code, seat: 0, seats, game, expiresAt: now + ROOM_TTL_MS }, 201);
    } catch (e) {
      if (!/UNIQUE|PRIMARY KEY|constraint/i.test(String(e))) throw e;
    }
  }
  return json({ error: 'Could not make a room code. Try again.' }, 503);
};
