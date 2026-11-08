// Online game rooms (migration 0041). Every rule about who may be in a room
// and what may be sent through it lives here; the routes only call these.

import { ownerLabel, studentClassIds, teacherClassIds } from './libraryShare';
import { ROOM_CODE_LETTERS, randomRoomCode } from '../../lib/room-icons';

export const ROOM_TTL_MS = 3 * 60 * 60 * 1000;
export const MAX_SEATS = 4;
export const MAX_OPEN_ROOMS_PER_HOST = 3;
export const MAX_EVENT_BYTES = 1024;
export const MAX_STRING = 20;
/** All the words in one move together: room for a few labels, not for a sentence. */
export const MAX_TEXT_PER_MOVE = 24;
export const MAX_EVENTS_PER_ROOM = 3000;
/** A player may send at most this many events in RATE_WINDOW_MS. */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 10_000;
export const POLL_PAGE = 200;

/**
 * A room code: 4 picture letters (lib/room-icons.ts, 16 letters, one per
 * built-in texture) since 2026-11-07. The old 6-character codes are still
 * accepted everywhere a code is read, so a room made before the change, or a
 * `const JOIN = '...'` holding one, keeps working until it expires.
 */
export const CODE_RE = new RegExp(`^(?:[${ROOM_CODE_LETTERS}]{4}|[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})$`);
export const PICTURE_CODE_RE = new RegExp(`^[${ROOM_CODE_LETTERS}]{4}$`);
/**
 * The game key a room is made with (`game_rooms.game`): the open-rooms list
 * (GET /api/rooms?game=) shows only rooms with the caller's key, so a lobby
 * never offers a room for a different game. Lesson pages use the lesson id,
 * the sandbox 'sandbox', a published game 'game-<id>' (lib/moshion-online.ts
 * `roomGameKey` fits a longer id into this), a sketch's own online.host() 'moshion'.
 */
export const GAME_MAX = 48;
export const GAME_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
/** How many open rooms GET /api/rooms?game= lists at most. */
export const LIST_LIMIT = 30;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,19}$/;
const DEVICE_RE = /^[a-z0-9]{8,32}$/;

/** The browser tab a request comes from ('' when it does not say). */
export function deviceOf(raw: unknown): string {
  const d = String(raw ?? '');
  return DEVICE_RE.test(d) ? d : '';
}

export type Role = 'admin' | 'teacher' | 'student';

/** A random 4-picture code. Use pickRoomCode() to get one no open room holds. */
export function newRoomCode(): string {
  return randomRoomCode();
}

/**
 * A code for a new room: never one an OPEN room holds (not closed, not
 * expired). With 65,536 codes nearly every first try has never been used;
 * when every try hits an existing row, a code whose room has closed or
 * expired is reused (`reuse: true`), and the caller deletes that old room's
 * rows before inserting so the primary key stays unique. null: no code found.
 */
export async function pickRoomCode(
  db: D1Database, now = Date.now(), tries = 24, gen: () => string = newRoomCode,
): Promise<{ code: string; reuse: boolean } | null> {
  let spare: string | null = null;
  for (let i = 0; i < tries; i++) {
    const code = gen();
    const row = await db.prepare('SELECT closed_at, expires_at FROM game_rooms WHERE code = ?').bind(code)
      .first<{ closed_at: number | null; expires_at: number }>();
    if (!row) return { code, reuse: false };
    if (!spare && (row.closed_at || row.expires_at <= now)) spare = code;
  }
  return spare ? { code: spare, reuse: true } : null;
}

/** A code as typed: upper-cased, spaces and dashes dropped. 4 picture letters or an old 6-character code; null otherwise. */
export function normalizeCode(raw: unknown): string | null {
  const c = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}

/**
 * Game data only. A value is null, a boolean, a finite number, a one-word
 * string (no spaces) of at most MAX_STRING characters, or an array / object of
 * those, with at most MAX_TEXT_PER_MOVE characters of words in the whole move (object keys are
 * identifiers), nested at most 4 deep, MAX_EVENT_BYTES as JSON. Returns the
 * reason in the course's words, or null when it is fine.
 */
export function checkGameData(v: unknown): string | null {
  let text = 0;
  function walk(x: unknown, depth: number): string | null {
    if (x === null || typeof x === 'boolean') return null;
    if (typeof x === 'number') return Number.isFinite(x) ? null : 'Numbers must be ordinary numbers.';
    if (typeof x === 'string') {
      if (/\s/.test(x)) return 'A word in a move cannot have spaces: a move is game data (numbers, true/false, one-word labels), not a message.';
      text += x.length;
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
  if (text > MAX_TEXT_PER_MOVE) return `A move can hold at most ${MAX_TEXT_PER_MOVE} letters of words in all. Send numbers for the game, not messages.`;
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

export interface PlayerRow { seat: number; email: string; device: string; left_at: number | null; first_name: string | null; last_name: string | null }

export async function roomPlayers(db: D1Database, code: string): Promise<PlayerRow[]> {
  const r = await db.prepare(
    `SELECT p.seat, p.email, p.device, p.left_at, s.first_name, s.last_name
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
