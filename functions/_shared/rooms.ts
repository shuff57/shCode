// Online game rooms (migration 0041). Every rule about who may be in a room
// and what may be sent through it lives here; the routes only call these.

import { ownerLabel, studentClassIds, teacherClassIds } from './libraryShare';

export const ROOM_TTL_MS = 3 * 60 * 60 * 1000;
export const MAX_SEATS = 4;
export const MAX_OPEN_ROOMS_PER_HOST = 3;
export const MAX_EVENT_BYTES = 1024;
export const MAX_STRING = 20;
export const MAX_EVENTS_PER_ROOM = 3000;
/** A player may send at most this many events in RATE_WINDOW_MS. */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 10_000;
export const POLL_PAGE = 200;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
export const GAME_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,19}$/;

export type Role = 'admin' | 'teacher' | 'student';

export function newRoomCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
}

/** A code as typed: upper-cased, spaces and dashes dropped. null if it cannot be one. */
export function normalizeCode(raw: unknown): string | null {
  const c = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}

/**
 * Game data only. A value is null, a boolean, a finite number, a string of at
 * most MAX_STRING characters, or an array / object of those (object keys are
 * identifiers), nested at most 4 deep, MAX_EVENT_BYTES as JSON. Returns the
 * reason in the course's words, or null when it is fine.
 */
export function checkGameData(v: unknown): string | null {
  function walk(x: unknown, depth: number): string | null {
    if (x === null || typeof x === 'boolean') return null;
    if (typeof x === 'number') return Number.isFinite(x) ? null : 'Numbers must be ordinary numbers.';
    if (typeof x === 'string') {
      return x.length <= MAX_STRING ? null : `Words in a move can be at most ${MAX_STRING} letters. Send numbers, true/false and short words.`;
    }
    if (depth >= 4) return 'A move can be nested at most 4 levels deep.';
    if (Array.isArray(x)) {
      if (x.length > 64) return 'A list in a move can hold at most 64 items.';
      for (const y of x) { const e = walk(y, depth + 1); if (e) return e; }
      return null;
    }
    if (typeof x === 'object') {
      const keys = Object.keys(x as object);
      if (keys.length > 32) return 'An object in a move can have at most 32 names.';
      for (const k of keys) {
        if (!KEY_RE.test(k)) return `"${k.slice(0, 20)}" cannot be a name in a move: use letters, digits and _ (up to 20).`;
        const e = walk((x as Record<string, unknown>)[k], depth + 1);
        if (e) return e;
      }
      return null;
    }
    return 'A move can only hold numbers, true/false, short words, lists and objects.';
  }
  const e = walk(v, 0);
  if (e) return e;
  const size = new TextEncoder().encode(JSON.stringify(v)).length;
  if (size > MAX_EVENT_BYTES) return `A move can be at most ${MAX_EVENT_BYTES} bytes; this one is ${size}.`;
  return null;
}

/** Every live class the person is in, as a student or a teacher. */
export async function liveClassIds(db: D1Database, email: string, now = Date.now()): Promise<Set<string>> {
  const [s, t] = await Promise.all([studentClassIds(db, email, now), teacherClassIds(db, email)]);
  return new Set([...s, ...t]);
}

/** Classmates only: the two share at least one live class. An admin may join anything. */
export async function mayJoin(db: D1Database, hostEmail: string, email: string, role: Role, now = Date.now()): Promise<boolean> {
  if (role === 'admin' || hostEmail === email) return true;
  const [a, b] = await Promise.all([liveClassIds(db, hostEmail, now), liveClassIds(db, email, now)]);
  for (const id of a) if (b.has(id)) return true;
  return false;
}

export interface RoomRow {
  code: string;
  game: string;
  host_email: string;
  seats: number;
  created_at: number;
  expires_at: number;
  closed_at: number | null;
}

export async function getRoom(db: D1Database, code: string): Promise<RoomRow | null> {
  return db.prepare('SELECT * FROM game_rooms WHERE code = ?').bind(code).first<RoomRow>();
}

export function roomState(room: RoomRow, playerCount: number, now = Date.now()): 'waiting' | 'ready' | 'closed' {
  if (room.closed_at || room.expires_at <= now) return 'closed';
  return playerCount >= room.seats ? 'ready' : 'waiting';
}

export interface PlayerRow { seat: number; email: string; left_at: number | null; first_name: string | null; last_name: string | null }

export async function roomPlayers(db: D1Database, code: string): Promise<PlayerRow[]> {
  const r = await db.prepare(
    `SELECT p.seat, p.email, p.left_at, s.first_name, s.last_name
       FROM game_room_players p LEFT JOIN students s ON s.email = p.email
      WHERE p.code = ? ORDER BY p.seat`,
  ).bind(code).all<PlayerRow>();
  return r.results ?? [];
}

/** What a player sees of the others: seat and first name + last initial, never an email. */
export function publicPlayers(rows: PlayerRow[]): { seat: number; name: string; left: boolean }[] {
  return rows.map((p) => ({ seat: p.seat, name: ownerLabel(p.first_name, p.last_name), left: p.left_at !== null }));
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
