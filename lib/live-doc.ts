// Code together, the browser half (codehs-review/REALTIME-SPEC.md, Part 2).
//
// LiveDocClient opens the session's socket (GET /api/live/<code>?device=<tab>,
// the same route and seat check as real-time play; a code room is routed to the
// LiveDoc Durable Object) and returns ONE CodeMirror extension the sandbox's
// editor adds through a Compartment (components/CodeMirrorPane.tsx `collab`):
//
//   - @codemirror/collab, installed only once the shared text is known (an
//     inner Compartment, so a reset can take it out and put it back at a new
//     version), plus the sync below that pushes `sendableUpdates` and applies
//     incoming `updates` with `receiveUpdates`;
//   - the other people's cursors and selections, each in its seat's colour with
//     a small name tag (relayed by the room, never stored);
//   - a filter that keeps one change under the room's frame limit and the whole
//     program under 64 KB, saying so in plain words instead of being refused.
//
// The editor's own updateListener keeps the sandbox store's file in step as
// always, so Run and Save behave exactly as they do alone.
//
// DocSync is the sync on its own, with no socket and no DOM: it works on
// anything with `state` and `dispatch` (an EditorView, or a plain object in
// scripts/test-live-doc.mjs, which runs two of them against LiveDocCore).
//
// A dropped socket is reopened with backoff while the route still says yes;
// typing carries on meanwhile and is shared on reconnect (the client pulls what
// it missed from its own version, or is reset when the room has moved on too far).

import {
  ChangeSet, Compartment, EditorState, StateEffect, StateField, Transaction,
  type Extension, type Text, type TransactionSpec,
} from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { collab, getSyncedVersion, receiveUpdates, sendableUpdates } from '@codemirror/collab';
import { MAX_DOC_FRAME, MAX_UPDATES_PER_PUSH, TOO_BIG, overDocCap, textOf } from './live-doc-protocol';
import type { LivePlayer } from './live-protocol';

const PUSH_DELAY_MS = 60;
const CURSOR_MS = 150; // under the room's 10 a second
const IN_FLIGHT_MS = 3000; // a push with no answer by then is sent again
const WATCHDOG_MS = 2000;
const RETRY_MS = 500;
const RETRY_MAX_MS = 8000;
const PING_MS = 25_000;
const LIVE_CLOSED = 4000;
const LIVE_REPLACED = 4001;
/** One change's ChangeSet JSON, kept under the frame with room for the message around it. */
const MAX_CHANGE_JSON = MAX_DOC_FRAME - 512;

export const PASTE_TOO_BIG = 'That paste is too big to share in one go. Paste it in smaller pieces.';

/** Each seat's colour (the course palette): seat 0 is the host. */
export const SEAT_COLORS = ['var(--c-pink)', 'var(--c-cyan)', 'var(--c-green)', 'var(--c-orange)'] as const;

export function seatColor(seat: number): string {
  return SEAT_COLORS[((seat % SEAT_COLORS.length) + SEAT_COLORS.length) % SEAT_COLORS.length];
}

// ---- the sync, testable without a socket or a DOM ---------------------------

export interface EditorLike {
  readonly state: EditorState;
  dispatch(...specs: (TransactionSpec | Transaction)[]): void;
}

interface WireUpdate { changes: unknown; clientID: string }

export interface DocSyncOptions {
  /** Send a frame to the room; false when the socket is not open. */
  send: (msg: Record<string, unknown>) => boolean;
  /** There is something to push (the client debounces, a test pushes when it likes). */
  wantPush?: () => void;
  now?: () => number;
}

const quiet = [Transaction.addToHistory.of(false), Transaction.remote.of(true)];

export class DocSync {
  /** Holds collab() once the shared text is known; empty before. */
  readonly inner = new Compartment();
  clientID = '';
  installed = false;
  private readonly opts: DocSyncOptions;
  private readonly now: () => number;
  private ed: EditorLike | null = null;
  /** The room's text and version while collab is not installed yet. */
  private base: { doc: Text; version: number } | null = null;
  private awaitingSeed = false;
  private inFlightAt = 0;

  constructor(opts: DocSyncOptions) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }

  /** The version this editor has synced up to (or the known base before install). */
  get version(): number {
    if (this.installed && this.ed) return getSyncedVersion(this.ed.state);
    return this.base?.version ?? -1;
  }

  hasSendable(): boolean {
    return !!(this.installed && this.ed && sendableUpdates(this.ed.state).length);
  }

  private askReset() {
    this.opts.send({ t: 'pull', version: -1 });
  }

  /**
   * The room said hello (first connect or a reconnect). `seed`: the host's own
   * text, given only on the host's first hello; it becomes the shared program
   * when the room is still empty.
   */
  hello(m: { version: number; doc: string; clientID: string; seat: number }, seed?: string | null) {
    this.clientID = String(m.clientID);
    this.inFlightAt = 0;
    if (!this.installed) {
      this.base = { doc: textOf(String(m.doc ?? '')), version: Number(m.version) };
      if (seed && m.seat === 0 && m.version === 0 && !m.doc) {
        this.awaitingSeed = true;
        this.opts.send({ t: 'seed', doc: seed });
        return;
      }
      this.install();
      return;
    }
    const synced = this.version;
    if (m.version === synced) { if (this.hasSendable()) this.opts.wantPush?.(); }
    else if (m.version > synced) this.opts.send({ t: 'pull', version: synced });
    else this.reset({ doc: m.doc, version: m.version }); // the room lost what we had: its text wins
  }

  /** Accepted updates, the first applying at `m.version`. */
  updates(m: { version: number; updates: WireUpdate[] }) {
    const list = Array.isArray(m.updates) ? m.updates : [];
    if (!this.installed) {
      const b = this.base;
      if (!b) return;
      if (m.version > b.version) { this.opts.send({ t: 'pull', version: b.version }); return; }
      try {
        for (const u of list.slice(b.version - m.version)) {
          b.doc = ChangeSet.fromJSON(u.changes).apply(b.doc);
          b.version++;
        }
      } catch { this.askReset(); return; }
      if (this.awaitingSeed && b.version >= 1) this.awaitingSeed = false;
      if (m.version === 0 && list.length === 0) this.awaitingSeed = false; // an empty seed
      this.install();
      return;
    }
    const ed = this.ed!;
    const synced = getSyncedVersion(ed.state);
    if (m.version > synced) { this.opts.send({ t: 'pull', version: synced }); return; }
    const fresh = list.slice(synced - m.version);
    if (fresh.length) {
      try {
        ed.dispatch(receiveUpdates(ed.state, fresh.map((u) => ({ changes: ChangeSet.fromJSON(u.changes), clientID: String(u.clientID) }))));
      } catch { this.askReset(); return; }
    }
    this.inFlightAt = 0;
    if (this.hasSendable()) this.opts.wantPush?.();
  }

  /** Start again from the room's text (too far behind, or a refused change). */
  reset(m: { doc: string; version: number }) {
    this.base = { doc: textOf(String(m.doc ?? '')), version: Number(m.version) };
    this.awaitingSeed = false;
    this.inFlightAt = 0;
    if (this.installed && this.ed) {
      const ed = this.ed;
      ed.dispatch({ changes: { from: 0, to: ed.state.doc.length, insert: this.base.doc }, effects: this.inner.reconfigure([]), annotations: quiet, filter: false });
      this.installed = false;
    }
    this.install();
  }

  /** The editor is ready (or came back). */
  attach(ed: EditorLike) {
    this.ed = ed;
    this.installed = false;
    this.install();
  }

  detach() {
    this.ed = null;
    this.installed = false;
  }

  /** Put the room's text in the editor, then collab at the room's version (two steps, so the swap is not an edit). */
  private install() {
    const ed = this.ed;
    const b = this.base;
    if (!ed || !b || this.awaitingSeed || this.installed) return;
    if (ed.state.doc.toString() !== b.doc.toString()) {
      ed.dispatch({ changes: { from: 0, to: ed.state.doc.length, insert: b.doc }, annotations: quiet, filter: false });
    }
    ed.dispatch({ effects: this.inner.reconfigure(collab({ startVersion: b.version, clientID: this.clientID })) });
    this.installed = true;
    this.base = null;
  }

  /** The room dropped a frame (rate limit): the next push may go at once. */
  released() {
    this.inFlightAt = 0;
  }

  /** Send what is waiting, as many updates as fit one frame. */
  push(): boolean {
    const ed = this.ed;
    if (!this.installed || !ed) return false;
    if (this.inFlightAt && this.now() - this.inFlightAt < IN_FLIGHT_MS) return false;
    const ups = sendableUpdates(ed.state);
    if (!ups.length) return false;
    const out: { changes: unknown }[] = [];
    let size = 64;
    for (const u of ups) {
      const json = u.changes.toJSON();
      const s = JSON.stringify(json).length + 16;
      if (out.length && (size + s > MAX_DOC_FRAME - 64 || out.length >= MAX_UPDATES_PER_PUSH)) break;
      out.push({ changes: json });
      size += s;
    }
    if (!this.opts.send({ t: 'push', version: getSyncedVersion(ed.state), updates: out })) return false;
    this.inFlightAt = this.now();
    return true;
  }
}

// ---- other people's cursors ---------------------------------------------------

export interface RemoteCursor { seat: number; name: string; anchor: number; head: number }

/** Replace the other people's cursors (positions are clamped to this editor's text). Exported for the tests. */
export const setCursors = StateEffect.define<RemoteCursor[]>();

class CaretWidget extends WidgetType {
  color: string;
  name: string;
  below: boolean;
  constructor(color: string, name: string, below: boolean) {
    super();
    this.color = color;
    this.name = name;
    this.below = below;
  }
  eq(o: CaretWidget) { return o.color === this.color && o.name === this.name && o.below === this.below; }
  toDOM() {
    const caret = document.createElement('span');
    caret.className = 'cm-remote-caret';
    caret.style.borderLeftColor = this.color;
    caret.setAttribute('aria-hidden', 'true');
    caret.appendChild(document.createTextNode('⁠'));
    const tag = document.createElement('span');
    tag.className = this.below ? 'cm-remote-tag cm-remote-tag-below' : 'cm-remote-tag';
    tag.textContent = this.name;
    tag.style.background = this.color;
    caret.appendChild(tag);
    return caret;
  }
  ignoreEvent() { return true; }
}

function clampPos(n: number, len: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(len, Math.floor(n))) : 0;
}

function cursorDeco(cursors: RemoteCursor[], doc: Text): DecorationSet {
  const ranges = [];
  for (const c of cursors) {
    const a = clampPos(c.anchor, doc.length);
    const h = clampPos(c.head, doc.length);
    const color = seatColor(c.seat);
    if (a !== h) {
      ranges.push(Decoration.mark({
        class: 'cm-remote-selection',
        attributes: { style: `background-color: color-mix(in srgb, ${color} 30%, transparent)` },
      }).range(Math.min(a, h), Math.max(a, h)));
    }
    // On the first line the tag goes under the caret, where there is room.
    ranges.push(Decoration.widget({ widget: new CaretWidget(color, c.name, doc.lineAt(h).number === 1), side: 1 }).range(h));
  }
  return Decoration.set(ranges, true);
}

// A cursor arrives in the sender's text, which may hold typing this editor has
// not received yet, so its positions can run past the end here. They are
// clamped as they are stored and before they are mapped: a position past the
// end would make mapPos throw, and a throw in a state field fails the whole
// transaction (the keystroke, or the shared update being applied).
export const presenceField = StateField.define<{ cursors: RemoteCursor[]; deco: DecorationSet }>({
  create: () => ({ cursors: [], deco: Decoration.none }),
  update(v, tr) {
    let cursors = v.cursors;
    if (tr.docChanged && cursors.length) {
      const len = tr.startState.doc.length;
      cursors = cursors.map((c) => ({
        ...c,
        anchor: tr.changes.mapPos(clampPos(c.anchor, len)),
        head: tr.changes.mapPos(clampPos(c.head, len)),
      }));
    }
    for (const e of tr.effects) {
      if (!e.is(setCursors)) continue;
      const len = tr.state.doc.length;
      cursors = e.value.map((c) => ({ ...c, anchor: clampPos(c.anchor, len), head: clampPos(c.head, len) }));
    }
    if (cursors === v.cursors) return v;
    return { cursors, deco: cursorDeco(cursors, tr.state.doc) };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
});

const presenceTheme = EditorView.baseTheme({
  '.cm-remote-caret': {
    position: 'relative',
    borderLeft: '2px solid',
    marginLeft: '-1px',
    marginRight: '-1px',
    pointerEvents: 'none',
  },
  '.cm-remote-tag': {
    position: 'absolute',
    left: '-2px',
    bottom: '100%',
    padding: '0 4px',
    borderRadius: '3px 3px 3px 0',
    color: 'var(--c-deep)',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '10px',
    fontWeight: '600',
    lineHeight: '1.35',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: '5',
  },
  '.cm-remote-tag.cm-remote-tag-below': {
    bottom: 'auto',
    top: '100%',
    borderRadius: '0 3px 3px 3px',
  },
});

// ---- the client: socket, reconnect, status ----------------------------------

export type DocPhase = 'connecting' | 'live' | 'reconnecting' | 'ended';

export interface DocStatus {
  phase: DocPhase;
  code: string;
  seat: number;
  seats: number;
  /** Who is connected now (names only). */
  players: LivePlayer[];
  /** The host's first name + last initial. */
  host: string;
  /** Something the room refused or could not do, in plain words. */
  error: string | null;
}

export interface DocEnded {
  why: 'host' | 'expired' | 'left' | 'closed' | 'gone' | 'replaced';
  host: string;
  reason: string;
}

export interface LiveDocClientOptions {
  code: string;
  device: string;
  /** The host's own text: becomes the shared program when the session is new. */
  seed?: (() => string) | null;
  onStatus: (s: DocStatus) => void;
  /** The session is over for this tab (the editor goes back to being yours). */
  onEnded: (e: DocEnded) => void;
}

export class LiveDocClient {
  readonly code: string;
  readonly sync: DocSync;
  readonly extension: Extension;
  private readonly opts: LiveDocClientOptions;
  private ws: WebSocket | null = null;
  private stopped = false;
  private seeded = false;
  private tries = 0;
  private status: DocStatus;
  private view: EditorView | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCursorAt = 0;

  constructor(opts: LiveDocClientOptions) {
    this.opts = opts;
    this.code = opts.code;
    this.status = { phase: 'connecting', code: opts.code, seat: -1, seats: 0, players: [], host: '', error: null };
    this.sync = new DocSync({ send: (m) => this.send(m), wantPush: () => this.schedulePush() });
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const client = this;
    const plugin = ViewPlugin.define((view) => {
      client.attachView(view);
      return {
        update(u: ViewUpdate) { client.viewUpdated(u); },
        destroy() { client.detachView(view); },
      };
    });
    const limits = EditorState.transactionFilter.of((tr) => {
      if (!tr.docChanged || !client.sync.installed || tr.annotation(Transaction.remote)) return tr;
      if (JSON.stringify(tr.changes.toJSON()).length > MAX_CHANGE_JSON) { client.note(PASTE_TOO_BIG); return []; }
      if (overDocCap(tr.newDoc)) { client.note(TOO_BIG); return []; }
      return tr;
    });
    this.extension = [this.sync.inner.of([]), presenceField, presenceTheme, limits, plugin];
  }

  start() {
    this.connect();
    this.watchdog = setInterval(() => { if (this.sync.hasSendable()) this.sync.push(); }, WATCHDOG_MS);
  }

  /** Stop for good (Leave, or the page going). Does not tell the server: the caller posts leave. */
  stop() {
    this.stopped = true;
    for (const t of [this.retryTimer, this.pushTimer, this.cursorTimer, this.errorTimer]) if (t) clearTimeout(t);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.retryTimer = this.pushTimer = this.cursorTimer = this.errorTimer = null;
    this.pingTimer = this.watchdog = null;
    const s = this.ws;
    this.ws = null;
    if (s) { try { s.close(1000, 'done'); } catch { /* gone */ } }
  }

  private emit(p: Partial<DocStatus>) {
    this.status = { ...this.status, ...p };
    this.opts.onStatus(this.status);
  }

  /** A plain note in the bar for a few seconds. */
  note(text: string) {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.emit({ error: text });
    this.errorTimer = setTimeout(() => { this.errorTimer = null; this.emit({ error: null }); }, 6000);
  }

  private end(e: DocEnded) {
    if (this.stopped) return;
    this.stop();
    this.emit({ phase: 'ended' });
    this.opts.onEnded(e);
  }

  private send(msg: Record<string, unknown>): boolean {
    const s = this.ws;
    if (!s || s.readyState !== 1) return false;
    try { s.send(JSON.stringify(msg)); return true; } catch { return false; }
  }

  private connect() {
    if (this.stopped) return;
    let sock: WebSocket;
    try {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      sock = new WebSocket(`${proto}//${location.host}/api/live/${encodeURIComponent(this.code)}?device=${encodeURIComponent(this.opts.device)}`);
    } catch {
      void this.problem();
      return;
    }
    this.ws = sock;
    sock.onopen = () => {
      this.tries = 0;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => { this.send({ t: 'ping' }); }, PING_MS);
    };
    sock.onmessage = (e) => {
      if (this.ws !== sock) return;
      let m: Record<string, unknown>;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      this.onMessage(m);
    };
    sock.onclose = (e) => {
      if (this.ws !== sock) return; // replaced or stopped on purpose
      this.ws = null;
      if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
      if (this.stopped) return;
      if (e.code === LIVE_CLOSED) { this.end({ why: 'gone', host: this.status.host, reason: 'That session has ended.' }); return; }
      if (e.code === LIVE_REPLACED) { this.end({ why: 'replaced', host: this.status.host, reason: 'This session opened again in another tab.' }); return; }
      void this.problem();
    };
  }

  /** The socket would not open or dropped: ask the route why, then retry or say so. */
  private async problem() {
    if (this.stopped) return;
    let status = 0;
    let error = '';
    try {
      const res = await fetch(`/api/live/${encodeURIComponent(this.code)}?device=${encodeURIComponent(this.opts.device)}`, { credentials: 'same-origin' });
      status = res.status;
      try { const b = await res.json(); if (typeof b?.error === 'string') error = b.error; } catch { /* no body */ }
    } catch { status = 0; }
    if (this.stopped) return;
    if (status === 404 || status === 410) { this.end({ why: 'gone', host: this.status.host, reason: error || 'That session has ended.' }); return; }
    // Retrying will not help (signed out, not switched on): the editor goes back to being yours.
    if (status === 401) { this.end({ why: 'gone', host: this.status.host, reason: 'Sign in again to code together.' }); return; }
    if (status && status !== 200) { this.end({ why: 'gone', host: this.status.host, reason: error || `Code together could not connect (${status}).` }); return; }
    // The route says yes, or the network is down for a moment: try again, slower each time.
    const wait = Math.min(RETRY_MAX_MS, RETRY_MS * 2 ** this.tries);
    this.tries++;
    this.emit({ phase: 'reconnecting' });
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect(); }, wait);
  }

  private onMessage(m: Record<string, unknown>) {
    switch (m.t) {
      case 'hello': {
        const seed = !this.seeded && this.opts.seed ? this.opts.seed() : null;
        this.seeded = true;
        this.emit({
          phase: 'live', seat: Number(m.seat), seats: Number(m.seats), host: String(m.host ?? ''),
          players: Array.isArray(m.players) ? (m.players as LivePlayer[]) : [], error: null,
        });
        this.sync.hello(m as never, seed);
        this.sendCursorSoon();
        return;
      }
      case 'players': {
        const players = Array.isArray(m.players) ? (m.players as LivePlayer[]) : [];
        this.emit({ players });
        const here = new Set(players.map((p) => p.seat));
        this.setRemote((list) => list.filter((c) => here.has(c.seat)));
        // A newcomer should see where everyone is.
        this.sendCursorSoon();
        return;
      }
      case 'updates': this.sync.updates(m as never); return;
      case 'reset': this.sync.reset(m as never); return;
      case 'cursor': {
        const seat = Number(m.seat);
        if (seat === this.status.seat || !Number.isInteger(seat)) return;
        const name = this.status.players.find((p) => p.seat === seat)?.name ?? `Person ${seat + 1}`;
        const c: RemoteCursor = { seat, name, anchor: Number(m.anchor), head: Number(m.head) };
        this.setRemote((list) => [...list.filter((x) => x.seat !== seat), c]);
        return;
      }
      case 'error': {
        if (m.code === 'rate') {
          this.sync.released();
          setTimeout(() => this.schedulePush(), 1000);
          return;
        }
        if (typeof m.error === 'string') this.note(m.error);
        return;
      }
      case 'closed': {
        const why = (['host', 'expired', 'left', 'closed'] as const).find((w) => w === m.why) ?? 'closed';
        this.end({ why, host: String(m.host ?? this.status.host), reason: String(m.reason ?? 'That session has ended.') });
        return;
      }
      default:
    }
  }

  private setRemote(fn: (list: RemoteCursor[]) => RemoteCursor[]) {
    const v = this.view;
    if (!v) return;
    let cur: RemoteCursor[] = [];
    try { cur = v.state.field(presenceField).cursors; } catch { return; }
    v.dispatch({ effects: setCursors.of(fn(cur)) });
  }

  private attachView(view: EditorView) {
    this.view = view;
    // Not inside the plugin's constructor: an editor cannot be updated while it is updating.
    queueMicrotask(() => { if (this.view === view && !this.stopped) this.sync.attach(view); });
  }

  private detachView(view: EditorView) {
    if (this.view !== view) return;
    this.view = null;
    this.sync.detach();
  }

  private viewUpdated(u: ViewUpdate) {
    const local = u.transactions.some((tr) => !tr.annotation(Transaction.remote));
    if (!local) return;
    if (u.docChanged) this.schedulePush();
    if (u.docChanged || u.selectionSet) this.sendCursorSoon();
  }

  private schedulePush() {
    if (this.pushTimer || this.stopped) return;
    this.pushTimer = setTimeout(() => { this.pushTimer = null; this.sync.push(); }, PUSH_DELAY_MS);
  }

  private sendCursorSoon() {
    if (this.cursorTimer || this.stopped) return;
    const wait = Math.max(0, CURSOR_MS - (Date.now() - this.lastCursorAt));
    this.cursorTimer = setTimeout(() => {
      this.cursorTimer = null;
      const v = this.view;
      if (!v || !this.sync.installed) return;
      const { anchor, head } = v.state.selection.main;
      if (this.send({ t: 'cursor', anchor, head })) this.lastCursorAt = Date.now();
    }, wait);
  }
}
