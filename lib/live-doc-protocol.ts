// Code together: the ONE protocol of a shared sandbox program
// (codehs-review/REALTIME-SPEC.md, Part 2). Used by the LiveDoc Durable Object
// in workers/live/ and by the dev server's stand-in (scripts/dev-live.mjs), so
// dev and production cannot drift: both wrap the same LiveDocCore and only
// supply the sockets, the room's own storage and the D1 write.
//
// The algorithm is @codemirror/collab's central-authority model. The room holds
// the document and the ordered list of updates it accepted; a client pushes the
// updates it made on top of the version it last saw. A push at the room's own
// version is applied and broadcast to every socket (the sender's included, which
// is how the sender learns it was accepted); a push at an older version is
// answered with the updates since that version, and the client rebases its own
// over them (receiveUpdates in lib/live-doc.ts) and pushes again. Every update
// is stamped by the room with the sender's seat and a client id derived from
// it (`s<seat>`), never with anything the client said about itself.
//
// Client -> room (JSON text frames, at most MAX_DOC_FRAME, a seed at most MAX_SEED_FRAME):
//   { t: 'push', version, updates: [{ changes }] }   changes = ChangeSet.toJSON()
//   { t: 'pull', version }                            "send me what I missed"
//   { t: 'seed', doc }                                the host's starting text (seat 0, empty doc at version 0)
//   { t: 'cursor', anchor, head }                     presence, relayed only, never stored
//   { t: 'ping' }                                     -> { t: 'pong' }
// Room -> client:
//   { t: 'hello', code, seat, seats, players, version, doc, clientID, host }
//   { t: 'players', players }
//   { t: 'updates', version, updates: [{ changes, clientID, seat }] }  the first applies at `version`
//   { t: 'reset', doc, version }        start again from here (too old to catch up, or a refused push)
//   { t: 'cursor', seat, anchor, head }
//   { t: 'error', error, code? }        code: 'rate' | 'too-big' | 'bad' (the socket stays open)
//   { t: 'closed', why, reason, host }  why: 'host' | 'expired' | 'left' | 'closed'; then LIVE_CLOSED
//
// The shared program is free text, so unlike a game room it is KEPT where a
// teacher can read it: the room writes its own text (never a client's copy) to
// D1 `code_sessions` (writeCodeSession below) at most every SAVE_EVERY_MS while
// it changes, and when the session closes or the last person leaves.

import { ChangeSet, Text } from '@codemirror/state';
import {
  LIVE_BAD_TICKET, LIVE_CLOSED, LIVE_REPLACED, newBucket, takeToken,
  type Bucket, type CodeLang, type DocTicket, type LivePlayer,
} from './live-protocol';

/** The shared program, in UTF-8 bytes. */
export const MAX_DOC_BYTES = 64 * 1024;
/** One frame, as text. A seed carries the host's whole program, so it may be bigger. */
export const MAX_DOC_FRAME = 16 * 1024;
export const MAX_SEED_FRAME = 2 * MAX_DOC_BYTES + 512;
/** Accepted updates kept in memory; a client further behind is reset. */
export const KEEP_UPDATES = 500;
export const MAX_UPDATES_PER_PUSH = 100;
/** Presence: at most this many cursor messages a second per socket (the rest are dropped quietly). */
export const CURSOR_PER_SEC = 10;
/** How often, at most, the text is written for teachers while it changes. */
export const SAVE_EVERY_MS = 2 * 60 * 1000;
/** Sessions older than this are deleted on the next write. */
export const KEEP_SESSIONS_MS = 30 * 24 * 60 * 60 * 1000;

export const TOO_BIG = 'The shared program can be at most 64 KB. That change was not shared.';

export interface WireUpdate { changes: unknown; clientID: string; seat: number }

/** A socket as the room sees it. The DO wraps a hibernatable WebSocket, dev wraps a `ws` socket. */
export interface DocSocket {
  send(text: string): void;
  close(code: number, reason: string): void;
  attachment(): DocTicket | null;
  attach(a: DocTicket | null): void;
}

export interface SessionMeta {
  roomKey: string;
  code: string;
  host: string;
  hostName: string;
  lang: CodeLang;
  startedAt: number;
  expiresAt: number;
}

/** What the room keeps in its own storage (Durable Object SQLite, or memory in dev). */
export interface DocStored {
  doc: string;
  version: number;
  /** Every account that has connected (from the tickets). */
  participants: string[];
  closed: boolean;
  /** When the text was last written for teachers, and whether it changed since. */
  savedAt: number;
  dirty: boolean;
  meta: SessionMeta | null;
}

export interface DocStore {
  load(): DocStored | null;
  save(s: DocStored): void;
}

/** One row of code_sessions (migration 0044). */
export interface CodeSessionRow {
  id: string;
  code: string;
  host_email: string;
  kind: CodeLang;
  participants: string;
  text: string;
  started_at: number;
  updated_at: number;
  closed_at: number | null;
}

export interface LiveDocOptions {
  sockets: () => DocSocket[];
  store: DocStore;
  /** Writes the session where teachers read it (writeCodeSession on D1). */
  write: (row: CodeSessionRow) => Promise<void>;
  /** Call flush() at this time (the DO arms its alarm, dev a timer). */
  schedule?: (at: number) => void;
  now?: () => number;
}

/** The client id the room gives a seat: stable across reconnects, so a client recognises its own updates. */
export function clientIdOf(seat: number): string {
  return `s${seat}`;
}

/** UTF-8 length without allocating. */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** True when the text is over MAX_DOC_BYTES (a code unit is at most 3 bytes, so short texts skip the count). */
export function overDocCap(doc: Text | string): boolean {
  const len = doc.length;
  if (len * 3 <= MAX_DOC_BYTES) return false;
  if (len > MAX_DOC_BYTES) return true;
  return utf8Bytes(doc.toString()) > MAX_DOC_BYTES;
}

export function textOf(s: string): Text {
  return Text.of(s.split(/\r\n?|\n/));
}

/**
 * A client's ChangeSet JSON, checked: the shape ChangeSet.toJSON() makes, no
 * line break inside an inserted line (the line structure is the array), and it
 * applies to a document of exactly `docLength`. null for anything else.
 */
export function parseChanges(json: unknown, docLength: number): ChangeSet | null {
  if (!Array.isArray(json) || json.length === 0 || json.length > 8000) return null;
  for (const part of json) {
    if (typeof part === 'number') {
      if (!Number.isInteger(part) || part < 0) return null;
      continue;
    }
    if (!Array.isArray(part) || part.length === 0 || !Number.isInteger(part[0]) || part[0] < 0) return null;
    for (let i = 1; i < part.length; i++) if (typeof part[i] !== 'string' || /[\r\n]/.test(part[i])) return null;
  }
  let cs: ChangeSet;
  try { cs = ChangeSet.fromJSON(json); } catch { return null; }
  return cs.length === docLength ? cs : null;
}

interface Accepted { changes: ChangeSet; json: unknown; clientID: string; seat: number }

/**
 * One shared program. Its text, version, participants and closed flag live in
 * the room's own storage (written on every accepted push), so a Durable Object
 * that hibernated rebuilds from them; the last KEEP_UPDATES accepted updates and
 * the rate buckets live in memory only (a woken room resets a client that is
 * behind instead of catching it up).
 */
export class LiveDocCore {
  private readonly opts: LiveDocOptions;
  private readonly now: () => number;
  private doc: Text;
  version: number;
  private history: Accepted[] = [];
  private participants: string[];
  closed: boolean;
  private savedAt: number;
  private dirty: boolean;
  private meta: SessionMeta | null;
  private flushAt = 0;
  private readonly buckets = new WeakMap<DocSocket, Bucket>();
  private readonly cursorBuckets = new WeakMap<DocSocket, Bucket>();
  private readonly toldAt = new WeakMap<DocSocket, number>();
  private readonly writes = new Set<Promise<void>>();

  constructor(opts: LiveDocOptions) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
    const s = opts.store.load();
    this.doc = textOf(s?.doc ?? '');
    this.version = s?.version ?? 0;
    this.participants = Array.isArray(s?.participants) ? [...s!.participants] : [];
    this.closed = s?.closed === true;
    this.savedAt = s?.savedAt ?? 0;
    this.dirty = s?.dirty === true;
    this.meta = s?.meta ?? null;
  }

  /** The text as the room holds it (tests, and the D1 row). */
  text(): string {
    return this.doc.toString();
  }

  /** Resolves when every write for teachers that has started has finished. */
  async idle(): Promise<void> {
    while (this.writes.size) await Promise.all([...this.writes]);
  }

  private persist() {
    this.opts.store.save({
      doc: this.doc.toString(), version: this.version, participants: this.participants,
      closed: this.closed, savedAt: this.savedAt, dirty: this.dirty, meta: this.meta,
    });
  }

  private open(except?: DocSocket): DocSocket[] {
    return this.opts.sockets().filter((s) => s !== except && s.attachment());
  }

  /** Who is connected: one entry per seat, in seat order. Names only, never an email. */
  players(except?: DocSocket): LivePlayer[] {
    const bySeat = new Map<number, LivePlayer>();
    for (const s of this.open(except)) {
      const a = s.attachment()!;
      bySeat.set(a.seat, { seat: a.seat, name: a.name, left: false });
    }
    return [...bySeat.values()].sort((a, b) => a.seat - b.seat);
  }

  private static say(ws: DocSocket, msg: unknown) {
    try { ws.send(JSON.stringify(msg)); } catch { /* socket going */ }
  }

  private broadcast(msg: unknown, except?: DocSocket) {
    const text = JSON.stringify(msg);
    for (const s of this.open(except)) { try { s.send(text); } catch { /* socket going */ } }
  }

  private announce(skip?: DocSocket, gone?: DocSocket) {
    this.broadcast({ t: 'players', players: this.players(gone) }, skip ?? gone);
  }

  private reset(ws: DocSocket) {
    LiveDocCore.say(ws, { t: 'reset', doc: this.doc.toString(), version: this.version });
  }

  private refuse(ws: DocSocket, error: string, code: 'too-big' | 'bad', reset = true) {
    LiveDocCore.say(ws, { t: 'error', error, code });
    if (reset) this.reset(ws);
  }

  /** A socket the Function let in, with its ticket. */
  accept(ws: DocSocket, ticket: DocTicket) {
    const now = this.now();
    if (this.closed || ticket.expiresAt <= now) {
      LiveDocCore.say(ws, { t: 'closed', why: this.closed ? 'closed' : 'expired', reason: 'That session has ended.', host: this.meta?.hostName ?? ticket.hostName });
      try { ws.close(LIVE_CLOSED, 'closed'); } catch { /* gone */ }
      return;
    }
    let changed = false;
    if (!this.meta) {
      this.meta = {
        roomKey: ticket.roomKey, code: ticket.code, host: ticket.host, hostName: ticket.hostName,
        lang: ticket.lang, startedAt: ticket.startedAt, expiresAt: ticket.expiresAt,
      };
      changed = true;
    }
    if (!this.participants.includes(ticket.email)) {
      this.participants.push(ticket.email);
      this.dirty = true;
      changed = true;
    }
    if (changed) this.persist();
    // One socket per seat: the same tab reconnecting replaces the old one.
    for (const other of this.open(ws)) {
      if (other.attachment()!.seat === ticket.seat) {
        LiveDocCore.say(other, { t: 'error', error: 'This seat connected again somewhere else.' });
        try { other.close(LIVE_REPLACED, 'replaced'); } catch { /* gone */ }
        other.attach(null);
      }
    }
    ws.attach(ticket);
    this.buckets.set(ws, newBucket(now));
    this.cursorBuckets.set(ws, { tokens: CURSOR_PER_SEC, at: now });
    LiveDocCore.say(ws, {
      t: 'hello', code: ticket.code, seat: ticket.seat, seats: ticket.seats, players: this.players(),
      version: this.version, doc: this.doc.toString(), clientID: clientIdOf(ticket.seat), host: this.meta!.hostName,
    });
    this.announce(ws);
  }

  /** A frame from a socket. */
  message(ws: DocSocket, text: unknown) {
    const a = ws.attachment();
    if (!a) { try { ws.close(LIVE_BAD_TICKET, 'no seat'); } catch { /* gone */ } return; }
    const now = this.now();
    if (this.closed) { try { ws.close(LIVE_CLOSED, 'closed'); } catch { /* gone */ } return; }
    if (a.expiresAt <= now) { this.closeRoom('expired'); return; }
    let b = this.buckets.get(ws);
    if (!b) { b = newBucket(now); this.buckets.set(ws, b); }
    if (!takeToken(b, now)) {
      const last = this.toldAt.get(ws) ?? 0;
      if (now - last >= 1000) {
        this.toldAt.set(ws, now);
        LiveDocCore.say(ws, { t: 'error', error: 'Too many messages at once. Your typing will be shared in a moment.', code: 'rate' });
      }
      return;
    }
    if (typeof text !== 'string') { LiveDocCore.say(ws, { t: 'error', error: 'Messages are text.', code: 'bad' }); return; }
    if (text.length > MAX_SEED_FRAME) { this.refuse(ws, TOO_BIG, 'too-big'); return; }
    let v: Record<string, unknown>;
    try { v = JSON.parse(text); } catch { LiveDocCore.say(ws, { t: 'error', error: 'That message is not JSON.', code: 'bad' }); return; }
    if (!v || typeof v !== 'object' || Array.isArray(v)) { LiveDocCore.say(ws, { t: 'error', error: 'That message is not an object.', code: 'bad' }); return; }
    if (v.t !== 'seed' && text.length > MAX_DOC_FRAME) {
      this.refuse(ws, 'That change is too big to share at once. Paste it in smaller pieces.', 'too-big', v.t === 'push');
      return;
    }
    if (v.t === 'ping') { LiveDocCore.say(ws, { t: 'pong' }); return; }
    if (v.t === 'push') { this.push(ws, a, v.version, v.updates); return; }
    if (v.t === 'pull') {
      if (!Number.isInteger(v.version) || (v.version as number) < 0) { this.reset(ws); return; }
      this.catchUp(ws, v.version as number);
      return;
    }
    if (v.t === 'seed') { this.seed(ws, a, v.doc); return; }
    if (v.t === 'cursor') { this.cursor(ws, a, v.anchor, v.head, now); return; }
    LiveDocCore.say(ws, { t: 'error', error: 'Unknown message.', code: 'bad' });
  }

  /** Updates since `version` to one socket, or a reset when it is too far behind (or ahead). */
  private catchUp(ws: DocSocket, version: number) {
    const base = this.version - this.history.length;
    if (version > this.version || version < base) { this.reset(ws); return; }
    LiveDocCore.say(ws, { t: 'updates', version, updates: this.history.slice(version - base).map(wire) });
  }

  private push(ws: DocSocket, a: DocTicket, version: unknown, updates: unknown) {
    if (!Number.isInteger(version) || (version as number) < 0) { this.refuse(ws, 'That change could not be read.', 'bad'); return; }
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > MAX_UPDATES_PER_PUSH) { this.refuse(ws, 'That change could not be read.', 'bad'); return; }
    if (version !== this.version) { this.catchUp(ws, version as number); return; }
    let doc = this.doc;
    const accepted: Accepted[] = [];
    for (const u of updates) {
      const json = u && typeof u === 'object' ? (u as Record<string, unknown>).changes : undefined;
      const cs = parseChanges(json, doc.length);
      if (!cs) { this.refuse(ws, 'That change does not fit the shared program, so it was not shared.', 'bad'); return; }
      doc = cs.apply(doc);
      accepted.push({ changes: cs, json: cs.toJSON(), clientID: clientIdOf(a.seat), seat: a.seat });
    }
    if (overDocCap(doc)) { this.refuse(ws, TOO_BIG, 'too-big'); return; }
    this.commit(doc, accepted);
  }

  private seed(ws: DocSocket, a: DocTicket, raw: unknown) {
    if (a.seat !== 0) { this.refuse(ws, 'Only the person who started the session gives it its first program.', 'bad'); return; }
    if (typeof raw !== 'string') { this.refuse(ws, 'That program could not be read.', 'bad'); return; }
    if (this.version !== 0 || this.doc.length !== 0) { this.refuse(ws, 'The shared program has already started.', 'bad'); return; }
    const doc = textOf(raw);
    if (overDocCap(doc)) { this.refuse(ws, 'Your program is over 64 KB, too long to share.', 'too-big'); return; }
    if (doc.length === 0) { LiveDocCore.say(ws, { t: 'updates', version: 0, updates: [] }); return; }
    const changes = ChangeSet.of({ from: 0, insert: doc }, 0);
    this.commit(doc, [{ changes, json: changes.toJSON(), clientID: clientIdOf(0), seat: 0 }]);
  }

  private commit(doc: Text, accepted: Accepted[]) {
    const from = this.version;
    this.doc = doc;
    this.version += accepted.length;
    this.history.push(...accepted);
    if (this.history.length > KEEP_UPDATES) this.history.splice(0, this.history.length - KEEP_UPDATES);
    this.dirty = true;
    this.persist();
    this.broadcast({ t: 'updates', version: from, updates: accepted.map(wire) });
    this.maybeSave();
  }

  private cursor(ws: DocSocket, a: DocTicket, anchor: unknown, head: unknown, now: number) {
    let b = this.cursorBuckets.get(ws);
    if (!b) { b = { tokens: CURSOR_PER_SEC, at: now }; this.cursorBuckets.set(ws, b); }
    if (!takeToken(b, now, CURSOR_PER_SEC, CURSOR_PER_SEC)) return; // presence: dropped quietly
    const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_DOC_BYTES;
    if (!ok(anchor) || !ok(head)) return;
    this.broadcast({ t: 'cursor', seat: a.seat, anchor, head }, ws);
  }

  /** A socket closed (or errored). The last one out writes the session for teachers. */
  left(ws: DocSocket) {
    const a = ws.attachment();
    if (!a) return;
    this.announce(undefined, ws);
    if (this.open(ws).length === 0) this.writeNow(this.closed ? this.now() : null);
  }

  /** A seat left the session (POST /api/rooms/<code>/leave): drop its socket. */
  leaveSeat(seat: number) {
    for (const s of this.open()) {
      if (s.attachment()!.seat !== seat) continue;
      LiveDocCore.say(s, { t: 'closed', why: 'left', reason: 'You left the session.', host: this.meta?.hostName ?? '' });
      this.left(s);
      try { s.close(LIVE_CLOSED, 'left'); } catch { /* gone */ }
      s.attach(null);
    }
  }

  /** The host left or the session expired: tell everyone, close every socket, keep the text for teachers. */
  closeRoom(why: 'host' | 'expired') {
    const host = this.meta?.hostName ?? '';
    const reason = why === 'host'
      ? `${host || 'The host'} ended the session.`
      : 'This session has ended: sessions last 3 hours.';
    const first = !this.closed;
    this.closed = true;
    if (first) this.persist();
    for (const s of this.opts.sockets()) {
      LiveDocCore.say(s, { t: 'closed', why, reason, host });
      try { s.close(LIVE_CLOSED, 'closed'); } catch { /* gone */ }
      try { s.attach(null); } catch { /* gone */ }
    }
    if (first) this.writeNow(this.now());
  }

  /** A control request from the Function (leave.ts). */
  control(raw: string | null): boolean {
    let v: { op?: unknown; seat?: unknown } | null = null;
    try { v = raw ? JSON.parse(raw) : null; } catch { return false; }
    if (v?.op === 'close') { this.closeRoom('host'); return true; }
    if (v?.op === 'leave' && Number.isInteger(v.seat)) { this.leaveSeat(v.seat as number); return true; }
    return false;
  }

  /** The scheduled write (the DO's alarm, dev's timer). */
  flush() {
    this.flushAt = 0;
    if (!this.dirty) return;
    if (this.closed || this.now() - this.savedAt >= SAVE_EVERY_MS - 1000) this.writeNow(this.closed ? this.now() : null);
    else this.scheduleSave();
  }

  private maybeSave() {
    if (!this.dirty) return;
    if (this.now() - this.savedAt >= SAVE_EVERY_MS) this.writeNow(null);
    else this.scheduleSave();
  }

  private scheduleSave() {
    const at = this.savedAt + SAVE_EVERY_MS;
    if (this.flushAt && this.flushAt <= at) return;
    this.flushAt = at;
    this.opts.schedule?.(at);
  }

  /** Write the room's own text for teachers now. closedAt: when the session ended, or null while it is open. */
  private writeNow(closedAt: number | null) {
    const m = this.meta;
    if (!m) return; // nobody ever connected: nothing to keep
    const now = this.now();
    const row: CodeSessionRow = {
      id: m.roomKey, code: m.code, host_email: m.host, kind: m.lang,
      participants: JSON.stringify(this.participants), text: this.doc.toString(),
      started_at: m.startedAt, updated_at: now, closed_at: closedAt,
    };
    this.savedAt = now;
    this.dirty = false;
    this.flushAt = 0; // a write pending for later is moot now; the next change schedules its own
    this.persist();
    const p: Promise<void> = this.opts.write(row)
      .catch(() => { this.dirty = true; this.persist(); this.scheduleSave(); })
      .finally(() => { this.writes.delete(p); });
    this.writes.add(p);
  }
}

function wire(u: Accepted): WireUpdate {
  return { changes: u.json, clientID: u.clientID, seat: u.seat };
}

/** The part of D1 writeCodeSession needs (the real binding, or the dev server's SQLite facade). */
interface D1Like {
  prepare(sql: string): { bind(...args: unknown[]): unknown };
  batch(stmts: unknown[]): Promise<unknown>;
}

/**
 * Upsert one session row and delete sessions older than KEEP_SESSIONS_MS. The
 * ONE copy of this SQL: the Durable Object and the dev stand-in both call it.
 * A closed_at, once written, stays.
 */
export async function writeCodeSession(db: D1Like, row: CodeSessionRow, now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare(
      `INSERT INTO code_sessions (id, code, host_email, kind, participants, text, started_at, updated_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET participants = excluded.participants, text = excluded.text,
         updated_at = excluded.updated_at, closed_at = COALESCE(code_sessions.closed_at, excluded.closed_at)`,
    ).bind(row.id, row.code, row.host_email, row.kind, row.participants, row.text, row.started_at, row.updated_at, row.closed_at),
    db.prepare('DELETE FROM code_sessions WHERE updated_at < ?').bind(now - KEEP_SESSIONS_MS),
  ]);
}

/** A store that keeps the state in memory (the dev stand-in and the tests). */
export function memoryDocStore(): DocStore & { state: DocStored | null } {
  const s: DocStore & { state: DocStored | null } = {
    state: null,
    load: () => (s.state ? JSON.parse(JSON.stringify(s.state)) : null),
    save: (v) => { s.state = JSON.parse(JSON.stringify(v)); },
  };
  return s;
}
