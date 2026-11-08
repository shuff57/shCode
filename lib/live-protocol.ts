// Real-time play: the ONE message protocol of a live room
// (codehs-review/REALTIME-SPEC.md). Used by the Cloudflare Durable Object in
// workers/live/ and by the dev server's in-process stand-in
// (scripts/dev-live.mjs), so dev and production cannot drift: both wrap the
// same LiveRoomCore and only supply the sockets.
//
// The sandboxed sketch never touches a socket. The parent page
// (lib/moshion-online.ts) opens `GET /api/live/<code>?device=<tab>` as the
// signed-in student; the Pages Function (functions/api/live/[code].ts) checks
// the seat in D1 and hands the upgrade to the room with a TICKET (seat, room
// size, first name + last initial). The room trusts only that ticket, which
// only the Function can set (the Worker has no public URL), and stamps every
// message with the ticket's seat: a client never says who it is.
//
// Client -> room (JSON text frames, at most MAX_FRAME_BYTES):
//   { t: 'move', data }              a game event; data passes checkGameData
//   { t: 'share', list: [Shared] }   1-8 shared sprites' state (online.share)
//   { t: 'unshare', id? }            stop sharing one sprite (or all of mine)
//   { t: 'ping' }                    -> { t: 'pong' }
// Room -> client:
//   { t: 'hello', code, seat, seats, seq, players, state }   on connect
//   { t: 'players', players, state }                         someone came or went
//   { t: 'move', seq, seat, data }   to EVERY socket, the sender's included, in seq order
//   { t: 'share', seat, list }       to every OTHER socket; never stored
//   { t: 'unshare', seat, id? }
//   { t: 'error', error }            a refused message (the socket stays open)
//   { t: 'closed', reason }          then the socket closes with LIVE_CLOSED
//
// Every incoming frame costs one token from a per-socket bucket
// (LIVE_RATE_PER_SEC, burst LIVE_BURST); an empty bucket drops the frame and
// says so at most once a second.

import { checkGameData } from './game-data';

/** Tokens a socket earns per second, and the most it can save up. */
export const LIVE_RATE_PER_SEC = 30;
export const LIVE_BURST = 60;
/** One frame, as text. A move is at most 1 KB of game data; 8 shared sprites fit easily. */
export const MAX_FRAME_BYTES = 4096;
/** How many sprites one seat may share at a time. */
export const MAX_SHARED = 8;
/** How often extras.js sends shared sprites (a sprite that has not moved is sent once a second). */
export const SHARE_HZ = 15;
/** The header the Pages Function sets on the forwarded upgrade. The room trusts nothing else. */
export const TICKET_HEADER = 'X-Shcode-Live-Ticket';
/** The header leave.ts sets to tell the room a seat left or the host closed it. */
export const CONTROL_HEADER = 'X-Shcode-Live-Control';
/** Close codes: the room closed (host left, expired); this seat connected somewhere else. */
export const LIVE_CLOSED = 4000;
export const LIVE_REPLACED = 4001;
export const LIVE_BAD_TICKET = 4002;

export interface LiveTicket {
  code: string;
  seat: number;
  seats: number;
  /** First name + last initial, never an email. */
  name: string;
  expiresAt: number;
}

/** What a socket carries (serializeAttachment in the Durable Object). */
export interface LiveAttachment extends LiveTicket {
  /** The room's last move seq when this socket last heard: lets a woken room carry on counting. */
  seq: number;
}

export interface LivePlayer { seat: number; name: string; left: boolean }
export type LiveState = 'waiting' | 'ready' | 'closed';

/** One shared sprite's state, as online.share() sends it. */
export interface SharedState {
  id: number;
  x: number;
  y: number;
  r?: number;
  vx?: number;
  vy?: number;
  w?: number;
  h?: number;
  d?: number;
  /** A colour: a named colour, #hex, or rgb()/rgba()/hsl()/hsla() with numbers only. */
  c?: string;
  /** A texture name. */
  tx?: string;
  /** visible */
  v?: boolean;
}

export type ClientMessage =
  | { t: 'move'; data: unknown }
  | { t: 'share'; list: SharedState[] }
  | { t: 'unshare'; id?: number }
  | { t: 'ping' };

const SEAT_MAX = 3;
const CODE_RE = /^[A-Z0-9]{4,6}$/;

export function encodeTicket(t: LiveTicket): string {
  return JSON.stringify({ code: t.code, seat: t.seat, seats: t.seats, name: t.name, expiresAt: t.expiresAt });
}

/** A ticket as the Function wrote it, or null for anything else (a Code together ticket included). */
export function decodeTicket(raw: string | null | undefined): LiveTicket | null {
  if (!raw || raw.length > 400) return null;
  let v: Record<string, unknown>;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== 'object') return null;
  // A game room's ticket has no kind; a code room's says so and belongs to LiveDoc, never here.
  if (v.kind !== undefined && v.kind !== 'game') return null;
  const { code, seat, seats, name, expiresAt } = v;
  if (typeof code !== 'string' || !CODE_RE.test(code)) return null;
  if (!Number.isInteger(seats) || (seats as number) < 2 || (seats as number) > SEAT_MAX + 1) return null;
  if (!Number.isInteger(seat) || (seat as number) < 0 || (seat as number) >= (seats as number)) return null;
  if (typeof name !== 'string' || name.length > 80) return null;
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;
  return { code, seat: seat as number, seats: seats as number, name, expiresAt };
}

const COLOR_RE = /^(?:[a-z]{3,20}|#[0-9a-f]{3,8}|(?:rgba?|hsla?)\(\s*-?[\d.]+%?(?:\s*,\s*-?[\d.]+%?){2,3}\s*\))$/i;
const TEXTURE_RE = /^[A-Za-z0-9_-]{1,20}$/;
const SHARED_KEYS = new Set(['id', 'x', 'y', 'r', 'vx', 'vy', 'w', 'h', 'd', 'c', 'tx', 'v']);
const COORD = 1e6;
const SIZE = 1e4;

/**
 * The shared-sprite message shape: 1 to MAX_SHARED entries, each an object of
 * only the SharedState names, numbers finite and in range, a distinct id 0-7,
 * a colour that is a colour and a texture that is one name. A sprite's state
 * is positions, never words: there is no field a sentence fits in.
 */
export function checkShared(list: unknown): string | null {
  if (!Array.isArray(list) || list.length === 0) return 'Nothing to share.';
  if (list.length > MAX_SHARED) return `You can share at most ${MAX_SHARED} sprites.`;
  const ids = new Set<number>();
  for (const s of list) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return 'A shared sprite must be an object.';
    const o = s as Record<string, unknown>;
    for (const k of Object.keys(o)) if (!SHARED_KEYS.has(k)) return `"${k.slice(0, 20)}" is not part of a shared sprite.`;
    if (!Number.isInteger(o.id) || (o.id as number) < 0 || (o.id as number) >= MAX_SHARED) return 'A shared sprite needs an id from 0 to 7.';
    if (ids.has(o.id as number)) return 'Two shared sprites have the same id.';
    ids.add(o.id as number);
    for (const k of ['x', 'y', 'r', 'vx', 'vy']) {
      const n = o[k];
      if (n === undefined && k !== 'x' && k !== 'y') continue;
      if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > COORD) return `A shared sprite's ${k} must be an ordinary number.`;
    }
    for (const k of ['w', 'h', 'd']) {
      const n = o[k];
      if (n === undefined) continue;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > SIZE) return `A shared sprite's ${k} must be a size from 0 to ${SIZE}.`;
    }
    if (o.c !== undefined && (typeof o.c !== 'string' || o.c.length > 40 || !COLOR_RE.test(o.c))) return 'A shared sprite\'s colour must be a colour.';
    if (o.tx !== undefined && (typeof o.tx !== 'string' || !TEXTURE_RE.test(o.tx))) return 'A shared sprite\'s texture must be a texture name.';
    if (o.v !== undefined && typeof o.v !== 'boolean') return 'A shared sprite\'s visible must be true or false.';
  }
  return null;
}

/** A frame from a client, checked. */
export function parseClientMessage(text: unknown): { ok: true; msg: ClientMessage } | { ok: false; error: string } {
  if (typeof text !== 'string') return { ok: false, error: 'Messages are text.' };
  if (text.length > MAX_FRAME_BYTES) return { ok: false, error: 'That message is too big.' };
  let v: Record<string, unknown>;
  try { v = JSON.parse(text); } catch { return { ok: false, error: 'That message is not JSON.' }; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, error: 'That message is not an object.' };
  if (v.t === 'ping') return { ok: true, msg: { t: 'ping' } };
  if (v.t === 'move') {
    if (!('data' in v)) return { ok: false, error: 'Nothing to send.' };
    const problem = checkGameData(v.data);
    return problem ? { ok: false, error: problem } : { ok: true, msg: { t: 'move', data: v.data } };
  }
  if (v.t === 'share') {
    const problem = checkShared(v.list);
    return problem ? { ok: false, error: problem } : { ok: true, msg: { t: 'share', list: v.list as SharedState[] } };
  }
  if (v.t === 'unshare') {
    if (v.id === undefined) return { ok: true, msg: { t: 'unshare' } };
    if (!Number.isInteger(v.id) || (v.id as number) < 0 || (v.id as number) >= MAX_SHARED) return { ok: false, error: 'unshare needs an id from 0 to 7.' };
    return { ok: true, msg: { t: 'unshare', id: v.id as number } };
  }
  return { ok: false, error: 'Unknown message.' };
}

export interface Bucket { tokens: number; at: number }

export function newBucket(now: number): Bucket {
  return { tokens: LIVE_BURST, at: now };
}

/** Takes one token; false when the bucket is empty (the frame is dropped). */
export function takeToken(b: Bucket, now: number, rate = LIVE_RATE_PER_SEC, burst = LIVE_BURST): boolean {
  const dt = Math.max(0, now - b.at) / 1000;
  b.tokens = Math.min(burst, b.tokens + dt * rate);
  b.at = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

/** A socket as the room sees it. The DO wraps a hibernatable WebSocket, dev wraps a `ws` socket. */
export interface LiveSocket {
  send(text: string): void;
  close(code: number, reason: string): void;
  attachment(): LiveAttachment | null;
  attach(a: LiveAttachment | null): void;
}

/**
 * One live room. Holds no state that must survive the Durable Object
 * hibernating: the seat, name and room size ride on each socket's attachment,
 * and the move counter is copied onto every attachment as it moves, so a woken
 * room picks it up again. Rate buckets live in memory (a room only sleeps when
 * it is idle, and an idle socket's bucket is full anyway).
 */
export class LiveRoomCore {
  private readonly sockets: () => LiveSocket[];
  private readonly now: () => number;
  private seq = -1;
  private readonly buckets = new WeakMap<LiveSocket, Bucket>();
  private readonly toldAt = new WeakMap<LiveSocket, number>();
  closed = false;

  constructor(sockets: () => LiveSocket[], now: () => number = Date.now) {
    this.sockets = sockets;
    this.now = now;
  }

  private open(except?: LiveSocket): LiveSocket[] {
    return this.sockets().filter((s) => s !== except && s.attachment());
  }

  private currentSeq(): number {
    if (this.seq < 0) {
      this.seq = 0;
      for (const s of this.sockets()) this.seq = Math.max(this.seq, s.attachment()?.seq ?? 0);
    }
    return this.seq;
  }

  /** Who is connected: one entry per seat, in seat order. */
  players(except?: LiveSocket): { players: LivePlayer[]; state: LiveState; seats: number } {
    const bySeat = new Map<number, LivePlayer>();
    let seats = 0;
    for (const s of this.open(except)) {
      const a = s.attachment()!;
      seats = a.seats;
      bySeat.set(a.seat, { seat: a.seat, name: a.name, left: false });
    }
    const players = [...bySeat.values()].sort((a, b) => a.seat - b.seat);
    const state: LiveState = this.closed ? 'closed' : seats > 0 && players.length >= seats ? 'ready' : 'waiting';
    return { players, state, seats };
  }

  private static say(ws: LiveSocket, msg: unknown) {
    try { ws.send(JSON.stringify(msg)); } catch { /* socket going */ }
  }

  private broadcast(msg: unknown, except?: LiveSocket) {
    const text = JSON.stringify(msg);
    for (const s of this.open(except)) { try { s.send(text); } catch { /* socket going */ } }
  }

  /** Tell the others who is here. `gone`: a socket that is closing (not counted, not told). */
  private announce(skip?: LiveSocket, gone?: LiveSocket) {
    const p = this.players(gone);
    this.broadcast({ t: 'players', players: p.players, state: p.state }, skip ?? gone);
  }

  /** A socket the Function let in, with its ticket. */
  accept(ws: LiveSocket, ticket: LiveTicket) {
    const now = this.now();
    if (this.closed || ticket.expiresAt <= now) {
      LiveRoomCore.say(ws, { t: 'closed', reason: 'That room has closed.' });
      try { ws.close(LIVE_CLOSED, 'closed'); } catch { /* gone */ }
      return;
    }
    const seq = this.currentSeq();
    // One socket per seat: the same tab reconnecting (or a second copy of it)
    // replaces the old one.
    for (const other of this.open(ws)) {
      if (other.attachment()!.seat === ticket.seat) {
        LiveRoomCore.say(other, { t: 'error', error: 'This seat connected again somewhere else.' });
        try { other.close(LIVE_REPLACED, 'replaced'); } catch { /* gone */ }
        other.attach(null);
      }
    }
    ws.attach({ ...ticket, seq });
    this.buckets.set(ws, newBucket(now));
    const p = this.players();
    LiveRoomCore.say(ws, { t: 'hello', code: ticket.code, seat: ticket.seat, seats: ticket.seats, seq, players: p.players, state: p.state });
    this.announce(ws);
  }

  /** A frame from a socket. */
  message(ws: LiveSocket, text: unknown) {
    const a = ws.attachment();
    if (!a) { try { ws.close(LIVE_BAD_TICKET, 'no seat'); } catch { /* gone */ } return; }
    const now = this.now();
    if (this.closed || a.expiresAt <= now) { this.closeRoom('That room has closed.'); return; }
    let b = this.buckets.get(ws);
    if (!b) { b = newBucket(now); this.buckets.set(ws, b); }
    if (!takeToken(b, now)) {
      const last = this.toldAt.get(ws) ?? 0;
      if (now - last >= 1000) {
        this.toldAt.set(ws, now);
        LiveRoomCore.say(ws, { t: 'error', error: `Too many messages: at most ${LIVE_RATE_PER_SEC} a second. Send a move when something changes.` });
      }
      return;
    }
    const parsed = parseClientMessage(text);
    if (!parsed.ok) { LiveRoomCore.say(ws, { t: 'error', error: parsed.error }); return; }
    const m = parsed.msg;
    if (m.t === 'ping') { LiveRoomCore.say(ws, { t: 'pong' }); return; }
    if (m.t === 'move') {
      const seq = this.currentSeq() + 1;
      this.seq = seq;
      const out = JSON.stringify({ t: 'move', seq, seat: a.seat, data: m.data });
      for (const s of this.open()) {
        try { s.send(out); } catch { /* going */ }
        const att = s.attachment();
        if (att) s.attach({ ...att, seq });
      }
      return;
    }
    if (m.t === 'share') { this.broadcast({ t: 'share', seat: a.seat, list: m.list }, ws); return; }
    if (m.t === 'unshare') { this.broadcast(m.id === undefined ? { t: 'unshare', seat: a.seat } : { t: 'unshare', seat: a.seat, id: m.id }, ws); }
  }

  /** A socket closed (or errored). */
  left(ws: LiveSocket) {
    const a = ws.attachment();
    if (!a) return;
    // Its shared sprites vanish from the other screens.
    this.broadcast({ t: 'unshare', seat: a.seat }, ws);
    this.announce(undefined, ws);
  }

  /** A seat left the room (POST /api/rooms/<code>/leave): drop its socket. */
  leaveSeat(seat: number) {
    for (const s of this.open()) {
      if (s.attachment()!.seat !== seat) continue;
      LiveRoomCore.say(s, { t: 'closed', reason: 'You left the room.' });
      this.left(s);
      try { s.close(LIVE_CLOSED, 'left'); } catch { /* gone */ }
      s.attach(null);
    }
  }

  /** The host left or the room expired: tell everyone and close every socket. */
  closeRoom(reason: string) {
    this.closed = true;
    for (const s of this.sockets()) {
      LiveRoomCore.say(s, { t: 'closed', reason });
      try { s.close(LIVE_CLOSED, 'closed'); } catch { /* gone */ }
      // Anything it still sends is ignored (the page also closes on 'closed').
      try { s.attach(null); } catch { /* gone */ }
    }
  }

  /** A control request from the Function (leave.ts). */
  control(raw: string | null): boolean {
    let v: { op?: unknown; seat?: unknown } | null = null;
    try { v = raw ? JSON.parse(raw) : null; } catch { return false; }
    if (v?.op === 'close') { this.closeRoom('The host left, so the room closed.'); return true; }
    if (v?.op === 'leave' && Number.isInteger(v.seat)) { this.leaveSeat(v.seat as number); return true; }
    return false;
  }
}

// ---- Code together (REALTIME-SPEC.md Part 2) --------------------------------
// A code room is a row in game_rooms with kind 'code' (migration 0044), always
// live. Its socket goes to the LiveDoc Durable Object (lib/live-doc-protocol.ts),
// not to LiveRoom, with a DocTicket. The ticket carries the emails the LiveDoc
// needs to keep the shared program for teachers (code_sessions); the Worker has
// no public URL, so they never leave Cloudflare, and no email is ever sent to a
// socket.

/** The game key of a code room, per sandbox mode. Nothing else is a code room's key. */
export const CODE_ROOM_GAMES = { js: 'code-js', moshion: 'code-moshion' } as const;
export type CodeLang = keyof typeof CODE_ROOM_GAMES;

/** The sandbox mode a code room's game key names, or null for any other key. */
export function codeLangOf(game: unknown): CodeLang | null {
  if (game === CODE_ROOM_GAMES.js) return 'js';
  if (game === CODE_ROOM_GAMES.moshion) return 'moshion';
  return null;
}

export interface DocTicket extends LiveTicket {
  kind: 'code';
  /** This socket's account (kept for teachers, never sent to a socket). */
  email: string;
  /** The host's account and its first name + last initial. */
  host: string;
  hostName: string;
  lang: CodeLang;
  /** The Durable Object's name (code + creation time) and the room's creation time. */
  roomKey: string;
  startedAt: number;
}

const EMAIL_MAX = 254;
const ROOM_KEY_RE = /^[A-Z0-9]{4,6}-\d{1,16}$/;

export function encodeDocTicket(t: DocTicket): string {
  return JSON.stringify({
    kind: 'code', code: t.code, seat: t.seat, seats: t.seats, name: t.name, expiresAt: t.expiresAt,
    email: t.email, host: t.host, hostName: t.hostName, lang: t.lang, roomKey: t.roomKey, startedAt: t.startedAt,
  });
}

/** A Code together ticket as the Function wrote it, or null for anything else (a game ticket included). */
export function decodeDocTicket(raw: string | null | undefined): DocTicket | null {
  if (!raw || raw.length > 1400) return null;
  let v: Record<string, unknown>;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || typeof v !== 'object' || v.kind !== 'code') return null;
  const base = decodeTicket(JSON.stringify({ code: v.code, seat: v.seat, seats: v.seats, name: v.name, expiresAt: v.expiresAt }));
  if (!base) return null;
  const { email, host, hostName, lang, roomKey, startedAt } = v;
  if (typeof email !== 'string' || !email || email.length > EMAIL_MAX) return null;
  if (typeof host !== 'string' || !host || host.length > EMAIL_MAX) return null;
  if (typeof hostName !== 'string' || hostName.length > 80) return null;
  if (lang !== 'js' && lang !== 'moshion') return null;
  if (typeof roomKey !== 'string' || !ROOM_KEY_RE.test(roomKey)) return null;
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null;
  return { ...base, kind: 'code', email, host, hostName, lang, roomKey, startedAt };
}
