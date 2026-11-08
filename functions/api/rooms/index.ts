// GET /api/rooms?game=<key> -- the open rooms a lobby offers (see onRequestGet).
//
// POST /api/rooms -- { game, seats, live? } host a new online game room. Answers
// { code, seat: 0 }. The host must be in a live class (as a student or a
// teacher), since only classmates can join; a fourth open room by the same
// host closes their oldest. Rooms a day past expiry are swept here.

import {
  GAME_MAX, GAME_RE, LIST_LIMIT, MAX_OPEN_ROOMS_PER_HOST, MAX_SEATS, ROOM_TTL_MS, deviceOf, json, liveClassIds, pickRoomCode,
} from '../../_shared/rooms';
import { ownerLabel } from '../../_shared/libraryShare';
import { LIVE_OFFLINE } from '../../_shared/live';

// LIVE: the real-time rooms' Durable Object namespace (workers/live/). Absent,
// a real-time room cannot be made (503), so nothing half-works.
interface Env { DB: D1Database; LIVE?: DurableObjectNamespace }
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

/**
 * GET /api/rooms?game=<key>&device=<tab> -- the rooms the lobby bar lists:
 * not closed, not expired, not full, made with this game key, and hosted by
 * someone who shares a live class with the caller (enrolled or teaching it;
 * this holds for an admin too, who can still join any room by its code).
 * Answers { inClass, rooms: [{ code, host, seats, present, here }] }: `host`
 * is first name + last initial, never an email; `here` is true when this tab
 * already holds a seat (in the room, or left and free to rejoin: such a room
 * is listed for this tab even when every seat is held). `inClass: false` means the caller is in no live
 * class, so there is nothing to list and nothing they could host.
 */
export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  const url = new URL(request.url);
  const game = String(url.searchParams.get('game') ?? '').toLowerCase();
  if (!GAME_RE.test(game)) return json({ error: `The game name can use lowercase letters, digits and dashes (up to ${GAME_MAX}).` }, 400);
  const device = deviceOf(url.searchParams.get('device'));
  // A real-time sketch's lobby lists live rooms only, every other lobby polling rooms only.
  const live = url.searchParams.get('live') === '1' ? 1 : 0;
  const now = Date.now();
  const mine = await liveClassIds(env.DB, data.email, now);
  if (mine.size === 0) return json({ inClass: false, rooms: [] });

  const r = await env.DB.prepare(
    `SELECT r.code, r.seats, r.host_email, r.created_at, s.first_name, s.last_name,
            (SELECT COUNT(*) FROM game_room_players p WHERE p.code = r.code AND p.left_at IS NULL) AS present,
            (SELECT COUNT(*) FROM game_room_players p WHERE p.code = r.code) AS taken,
            (SELECT COUNT(*) FROM game_room_players p WHERE p.code = r.code AND p.email = ?3 AND p.device = ?4) AS here
       FROM game_rooms r LEFT JOIN students s ON s.email = r.host_email
      WHERE r.game = ?1 AND r.closed_at IS NULL AND r.expires_at > ?2 AND r.live = ?5
      ORDER BY r.created_at DESC LIMIT 200`,
  ).bind(game, now, data.email, device, live).all<{
    code: string; seats: number; host_email: string; created_at: number;
    first_name: string | null; last_name: string | null; present: number; taken: number; here: number;
  }>();
  // Not full: a seat whose player left is still theirs (a rejoin gives it
  // back), so a room is joinable only while it has a seat nobody holds --
  // or when the seat held is this tab's own (it left and may come back).
  const candidates = (r.results ?? []).filter((x) => x.taken < x.seats || x.here > 0);

  // Classmates only: the host must share a live class with the caller.
  const hostClasses = new Map<string, Set<string>>();
  const rooms: { code: string; host: string; seats: number; present: number; here: boolean }[] = [];
  for (const x of candidates) {
    let theirs = hostClasses.get(x.host_email);
    if (!theirs) { theirs = await liveClassIds(env.DB, x.host_email, now); hostClasses.set(x.host_email, theirs); }
    let shared = false;
    for (const id of theirs) if (mine.has(id)) { shared = true; break; }
    if (!shared) continue;
    rooms.push({ code: x.code, host: ownerLabel(x.first_name, x.last_name), seats: x.seats, present: x.present, here: x.here > 0 });
    if (rooms.length >= LIST_LIMIT) break;
  }
  return json({ inClass: true, rooms });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ env, data, request }: Ctx) => {
  let body: { game?: unknown; seats?: unknown; device?: unknown; live?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const game = String(body?.game ?? 'game').toLowerCase();
  if (!GAME_RE.test(game)) return json({ error: `The game name can use lowercase letters, digits and dashes (up to ${GAME_MAX}).` }, 400);
  const seats = body?.seats === undefined ? 2 : Number(body.seats);
  if (!Number.isInteger(seats) || seats < 2 || seats > MAX_SEATS) {
    return json({ error: `A room has 2 to ${MAX_SEATS} players.` }, 400);
  }

  const live = body?.live === true ? 1 : 0;
  if (live && !env.LIVE) {
    return json({ error: LIVE_OFFLINE, offline: true }, 503);
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
    // A code no open room holds; a closed or expired room's code may be reused,
    // and its old rows go first (only while still closed/expired, so a room
    // that opened with the code in the meantime is untouched and the INSERT
    // below fails on the key and tries again).
    const picked = await pickRoomCode(env.DB, now);
    if (!picked) break;
    const code = picked.code;
    const gone = 'SELECT code FROM game_rooms WHERE code = ? AND (closed_at IS NOT NULL OR expires_at <= ?)';
    const clear = picked.reuse ? [
      env.DB.prepare(`DELETE FROM game_room_events WHERE code IN (${gone})`).bind(code, now),
      env.DB.prepare(`DELETE FROM game_room_players WHERE code IN (${gone})`).bind(code, now),
      env.DB.prepare('DELETE FROM game_rooms WHERE code = ? AND (closed_at IS NOT NULL OR expires_at <= ?)').bind(code, now),
    ] : [];
    try {
      await env.DB.batch([
        ...clear,
        env.DB.prepare(
          'INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at, live) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(code, game, data.email, seats, now, now + ROOM_TTL_MS, live),
        env.DB.prepare('INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES (?, 0, ?, ?, ?)')
          .bind(code, data.email, deviceOf(body?.device), now),
      ]);
      return json({ code, seat: 0, seats, game, live: live === 1, expiresAt: now + ROOM_TTL_MS }, 201);
    } catch (e) {
      if (!/UNIQUE|PRIMARY KEY|constraint/i.test(String(e))) throw e;
    }
  }
  return json({ error: 'Could not make a room code. Try again.' }, 503);
};
