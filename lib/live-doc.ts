// Code together, the browser half (codehs-review/REALTIME-SPEC.md, Part 2).
//
// LiveDocClient opens the session's socket (GET /api/live/<code>?device=<tab>,
// the same route and seat check as real-time play; a code room is routed to the
// LiveDoc Durable Object) and returns ONE CodeMirror extension the sandbox's
// editor adds through a Compartment (components/CodeMirrorPane.tsx `collab`):
//
//   - collab (lib/live-collab.ts: @codemirror/collab, changed so that two
//     people typing at one spot each keep their run of typing in one piece),
//     installed only once the shared text is known (an inner Compartment, so
//     a reset can take it out and put it back at a new version), plus the sync
//     below that pushes `sendableUpdates` and applies incoming `updates` with
//     `receiveUpdates`;
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
// A room that lost its last few seconds (evicted between its 2-second storage
// writes, lib/live-doc-protocol.ts) wakes BEHIND its clients: a client then
// starts again from the room's text and says so calmly ("The shared program
// jumped back a few seconds.").

import {
  ChangeSet, Compartment, EditorState, Facet, StateEffect, StateField, Transaction,
  type ChangeDesc, type Extension, type Text, type TransactionSpec,
} from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import { collab, getSyncedVersion, receiveUpdates, sendableUpdates, unmapChar } from './live-collab';
import { MAX_DOC_FRAME, MAX_UPDATES_PER_PUSH, TOO_BIG, overDocCap, textOf } from './live-doc-protocol';
import type { LivePlayer } from './live-protocol';

const PUSH_DELAY_MS = 60;
const CURSOR_MS = 150; // under the room's 10 a second
const IN_FLIGHT_MS = 3000; // a push with no answer by then is sent again
const WATCHDOG_MS = 2000;
const RETRY_MS = 500;
const RETRY_MAX_MS = 8000;
const PING_MS = 25_000;
/** Someone gone this long has left (a dropped socket that comes back sooner is not news). */
const LEFT_GRACE_MS = 3000;
const LIVE_CLOSED = 4000;
const LIVE_REPLACED = 4001;
/** One change's ChangeSet JSON, kept under the frame with room for the message around it. */
const MAX_CHANGE_JSON = MAX_DOC_FRAME - 512;

export const PASTE_TOO_BIG = 'That paste is too big to share in one go. Paste it in smaller pieces.';
export const REWOUND = 'The shared program jumped back a few seconds.';

/**
 * Each seat's colour (the course palette): seat 0 is the host. A person's
 * caret, selection, name tag and their dot in the Code together bar all wear
 * it. Four hues far apart in every theme: cyan beside green was the closest
 * pair (in Forest the two are nearly one mint), so the third and fourth seats
 * are orange and purple. The name always shows too, so colour is never the
 * only way to tell people apart. scripts/test-live-doc.mjs measures, in every
 * theme, that the colours stay apart and the tag text reads on each.
 */
export const SEAT_COLORS = ['var(--c-pink)', 'var(--c-cyan)', 'var(--c-orange)', 'var(--c-purple)'] as const;
/** The name tag's text, on the seat colour (at least 4.5:1 in every theme, measured in the test). */
export const TAG_TEXT = 'var(--c-deep)';

export function seatColor(seat: number): string {
  return SEAT_COLORS[((seat % SEAT_COLORS.length) + SEAT_COLORS.length) % SEAT_COLORS.length];
}

// ---- the sync, testable without a socket or a DOM ---------------------------

export interface EditorLike {
  readonly state: EditorState;
  dispatch(...specs: (TransactionSpec | Transaction)[]): void;
}

interface WireUpdate { changes: unknown; clientID: string; seat?: number }

/** Accepted updates this editor remembers, to place a cursor sent at an older version. */
const KEEP_HISTORY = 500;

/** A cursor as the room relays it: positions in the room's text at `version` (absent from an older client: as is). */
export interface CursorMessage { seat: number; name: string; anchor: number; head: number; version?: number }

export interface DocSyncOptions {
  /** Send a frame to the room; false when the socket is not open. */
  send: (msg: Record<string, unknown>) => boolean;
  /** There is something to push (the client debounces, a test pushes when it likes). */
  wantPush?: () => void;
  /** The room lost its last few seconds and this editor started again from the room's text. */
  onRewound?: () => void;
  /** A cursor asked for while this editor's own typing was unconfirmed can be sent now, or someone's typing moved this caret. */
  wantCursor?: () => void;
  now?: () => number;
}

const quiet = [Transaction.addToHistory.of(false), Transaction.remote.of(true)];

/** Who typed a character: this editor (`own`), another seat, or null (the starting program, or older than the history kept). */
export type CharAuthor = { own: boolean; seat: number } | null;
type AuthorOf = (state: EditorState, pos: number) => CharAuthor;
/** How the presence field asks who typed a character (DocSync provides it with collab). */
const charAuthor = Facet.define<AuthorOf, AuthorOf | null>({ combine: (v) => v[0] ?? null });

export class DocSync {
  /** Holds collab() once the shared text is known; empty before. */
  readonly inner = new Compartment();
  clientID = '';
  installed = false;
  /** The room incarnation this editor's version comes from (see lib/live-doc-protocol.ts). */
  epoch = '';
  private readonly opts: DocSyncOptions;
  private readonly now: () => number;
  private ed: EditorLike | null = null;
  /** The room's text and version while collab is not installed yet. */
  private base: { doc: Text; version: number } | null = null;
  private awaitingSeed = false;
  private inFlightAt = 0;
  /**
   * The room's accepted updates this editor applied, in order: `items[i]`
   * took the room's text from version `from + i` to `from + i + 1`. A cursor
   * is sent in the room's text at a version, and placed here by mapping it
   * through what came after (see remoteCursor). Each says whose it was
   * (`seat`; `own`: this editor's; `typed`: false for the starting program),
   * which is how a run of someone's typing is kept in one piece (see authorAt).
   */
  private hist: { from: number; items: { desc: ChangeDesc; seat: number; own: boolean; typed: boolean }[] } = { from: 0, items: [] };
  /** Cursors sent at a version this editor has not reached yet, by seat. */
  private pending = new Map<number, CursorMessage>();
  /** cursor() was asked for while this editor had unconfirmed typing. */
  private cursorWanted = false;

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
  hello(m: { version: number; doc: string; clientID: string; seat: number; epoch?: string; since?: number }, seed?: string | null) {
    this.clientID = String(m.clientID);
    this.inFlightAt = 0;
    const was = this.epoch;
    this.epoch = String(m.epoch ?? '');
    if (!this.installed) {
      this.base = { doc: textOf(String(m.doc ?? '')), version: Number(m.version) };
      this.hist = { from: this.base.version, items: [] };
      if (seed && m.seat === 0 && m.version === 0 && !m.doc) {
        this.awaitingSeed = true;
        this.opts.send({ t: 'seed', doc: seed });
        return;
      }
      this.install();
      return;
    }
    const synced = this.version;
    // A new incarnation of the room that woke at `since` does not have anything
    // past it from the old one; nor does a room behind us. Its text wins.
    const rewound = m.version < synced
      || (!!was && !!m.epoch && m.epoch !== was && typeof m.since === 'number' && synced > m.since);
    if (rewound) {
      this.reset({ doc: m.doc, version: m.version, epoch: m.epoch });
      this.opts.onRewound?.();
      return;
    }
    if (m.version === synced) { if (this.hasSendable()) this.opts.wantPush?.(); }
    else this.opts.send({ t: 'pull', version: synced });
  }

  /** Accepted updates, the first applying at `m.version`. */
  updates(m: { version: number; updates: WireUpdate[]; epoch?: string }) {
    const list = Array.isArray(m.updates) ? m.updates : [];
    if (!this.installed) {
      const b = this.base;
      if (!b) return;
      if (m.version > b.version) { this.opts.send({ t: 'pull', version: b.version }); return; }
      if (m.epoch) this.epoch = m.epoch;
      try {
        for (const u of list.slice(b.version - m.version)) {
          const cs = ChangeSet.fromJSON(u.changes);
          b.doc = cs.apply(b.doc);
          this.record(b.version, cs, u);
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
    if (m.epoch) this.epoch = m.epoch; // a socket that outlived hibernation learns the new incarnation here
    const fresh = list.slice(synced - m.version);
    let follow = false;
    if (fresh.length) {
      try {
        const parsed = fresh.map((u) => ChangeSet.fromJSON(u.changes));
        // This caret sits right after someone else's text and they type on at
        // it: it goes after their new text, so they carry on in one piece and
        // this editor's next keystroke does not land inside their word. (Right
        // after this editor's own text it stays in front, as CodeMirror does.)
        const sel = ed.state.selection.main;
        if (sel.empty) {
          const who = this.localAuthor(ed.state, sel.head - 1);
          follow = !!who && !who.own && fresh.some((u) => u.seat === who.seat && String(u.clientID) !== this.clientID);
        }
        // Each update says whose it is, so that person's own cursor moves with
        // their typing (presenceField) instead of staying in front of it.
        ed.dispatch(receiveUpdates(ed.state, fresh.map((u, i) => ({
          changes: parsed[i], clientID: String(u.clientID),
          effects: Number.isInteger(u.seat) ? [typedBy.of(u.seat as number)] : undefined,
        })), { ownChar: (pos) => this.authorAt(pos, synced)?.own === true, caretAfter: follow }));
        parsed.forEach((cs, i) => this.record(synced + i, cs, fresh[i]));
      } catch { this.askReset(); return; }
    }
    this.inFlightAt = 0;
    this.placePending();
    if (this.hasSendable()) this.opts.wantPush?.();
    else this.cursorNowSendable();
    // The others see this caret where it went (their editors move it the same way, but a word costs nothing).
    if (follow) this.opts.wantCursor?.();
  }

  /** Remember the room's update that took its text from `version` to the next. */
  private record(version: number, cs: ChangeSet, u: WireUpdate) {
    const h = this.hist;
    if (h.from + h.items.length !== version) { h.from = version; h.items = []; }
    h.items.push({
      desc: cs.desc,
      seat: Number.isInteger(u.seat) ? (u.seat as number) : -1,
      own: String(u.clientID) === this.clientID,
      // The update at version 0 is the starting program (the host's seed), not anyone's typing.
      typed: version > 0,
    });
    if (h.items.length > KEEP_HISTORY) {
      const drop = h.items.length - KEEP_HISTORY;
      h.items.splice(0, drop);
      h.from += drop;
    }
  }

  /**
   * Who typed the character at `pos` in the room's text at `version`, read
   * from the room's accepted updates this editor remembers (each stamped with
   * whose it was); null for the starting program or anything older.
   *
   * It keeps each person's run of typing in one piece, by one rule used in
   * three places: an insert goes AFTER a caret, or after someone's own insert
   * at the same spot, when the character just before that spot was typed by
   * the person inserting (they are carrying on their own run); otherwise it
   * goes in front, as CodeMirror does. The places are the rebase of this
   * editor's unconfirmed typing (lib/live-collab.ts), this editor's caret
   * (`follow` in updates), and the other people's carets (presenceField, place).
   */
  private authorAt(pos: number, version: number): CharAuthor {
    const h = this.hist;
    if (pos < 0 || version < h.from || version > h.from + h.items.length) return null;
    let p = pos;
    for (let i = version - h.from - 1; i >= 0; i--) {
      p = unmapChar(h.items[i].desc, p);
      if (p < 0) {
        const it = h.items[i];
        return it.typed && (it.own || it.seat >= 0) ? { own: it.own, seat: it.seat } : null;
      }
    }
    return null;
  }

  /** Who typed the character at `pos` in this editor's text now (its own unconfirmed typing included). */
  localAuthor(state: EditorState, pos: number): CharAuthor {
    if (pos < 0) return null;
    let p = pos;
    const mine = sendableUpdates(state);
    for (let k = mine.length - 1; k >= 0; k--) {
      p = unmapChar(mine[k].changes, p);
      if (p < 0) return { own: true, seat: -1 };
    }
    return this.authorAt(p, getSyncedVersion(state));
  }

  private cursorNowSendable() {
    if (!this.cursorWanted || !this.installed || this.hasSendable()) return;
    this.cursorWanted = false;
    this.opts.wantCursor?.();
  }

  /**
   * This editor's cursor for the others, in the room's text at the version it
   * has synced to. While its own typing is unconfirmed its positions are in a
   * text nobody else has yet, so it is not sent: it goes once the room has
   * accepted that typing (wantCursor), which is what kept the other person's
   * tag a character or two off after two people typed at once.
   */
  cursor(): { t: 'cursor'; anchor: number; head: number; version: number } | null {
    const ed = this.ed;
    if (!this.installed || !ed) { this.cursorWanted = true; return null; }
    if (sendableUpdates(ed.state).length) { this.cursorWanted = true; return null; }
    this.cursorWanted = false;
    const { anchor, head } = ed.state.selection.main;
    return { t: 'cursor', anchor, head, version: getSyncedVersion(ed.state) };
  }

  /**
   * Another person's cursor. It was sent in the room's text at `version`; this
   * editor maps it through every update it applied since then, and through its
   * own unconfirmed typing, so it lands where that person's caret really is.
   * A cursor from a version this editor has not reached waits until it has.
   */
  remoteCursor(c: CursorMessage) {
    const ed = this.ed;
    if (!this.installed || !ed) { this.pending.set(c.seat, c); return; }
    if (typeof c.version === 'number' && c.version > getSyncedVersion(ed.state)) { this.pending.set(c.seat, c); return; }
    this.pending.delete(c.seat);
    const placed = this.place(c);
    this.setCursorsWith((list) => [...list.filter((x) => x.seat !== c.seat), placed]);
  }

  /** Keep only these seats' cursors (someone left). */
  keepCursors(seats: Set<number>) {
    for (const s of [...this.pending.keys()]) if (!seats.has(s)) this.pending.delete(s);
    this.setCursorsWith((list) => list.filter((c) => seats.has(c.seat)));
  }

  private setCursorsWith(fn: (list: RemoteCursor[]) => RemoteCursor[]) {
    const ed = this.ed;
    if (!ed) return;
    let cur: RemoteCursor[] = [];
    try { cur = ed.state.field(presenceField).cursors; } catch { return; }
    ed.dispatch({ effects: setCursors.of(fn(cur)) });
  }

  private placePending() {
    if (!this.pending.size || !this.installed || !this.ed) return;
    const synced = getSyncedVersion(this.ed.state);
    for (const c of [...this.pending.values()]) {
      if (typeof c.version !== 'number' || c.version <= synced) this.remoteCursor(c);
    }
  }

  /** A cursor's positions in this editor's text now. */
  private place(c: CursorMessage): RemoteCursor {
    const ed = this.ed!;
    let anchor = Number(c.anchor);
    let head = Number(c.head);
    const h = this.hist;
    const synced = getSyncedVersion(ed.state);
    if (typeof c.version === 'number' && c.version >= h.from && synced - h.from <= h.items.length) {
      // That person's own later typing carries their caret with it, and so
      // does typing that carries on the text just before their caret (their
      // editor moves it the same way, see authorAt); anyone else's insert at
      // the same spot leaves it in front, as their editor does.
      for (let v = c.version; v < synced; v++) {
        const it = h.items[v - h.from];
        const len = it.desc.length;
        const carries = it.seat === c.seat || (anchor === head && followsRun(this.authorAt(clampPos(head, len) - 1, v), it.own, it.seat));
        const assoc = carries ? 1 : -1;
        anchor = it.desc.mapPos(clampPos(anchor, len), assoc);
        head = it.desc.mapPos(clampPos(head, len), assoc);
      }
      const mine = sendableUpdates(ed.state);
      mine.forEach((u, k) => {
        const len = u.changes.length;
        // The text u applies to: the synced text plus this editor's earlier unconfirmed typing.
        const who = anchor === head ? this.authorBefore(mine, k, clampPos(head, len) - 1, synced) : null;
        const assoc = who?.own ? 1 : -1;
        anchor = u.changes.mapPos(clampPos(anchor, len), assoc);
        head = u.changes.mapPos(clampPos(head, len), assoc);
      });
    }
    return { seat: c.seat, name: c.name, anchor, head };
  }

  /** Who typed the character at `pos` in the text mine[k] applies to (the synced text plus mine[0..k-1]). */
  private authorBefore(mine: readonly { changes: ChangeSet }[], k: number, pos: number, synced: number): CharAuthor {
    if (pos < 0) return null;
    let p = pos;
    for (let j = k - 1; j >= 0; j--) {
      p = unmapChar(mine[j].changes, p);
      if (p < 0) return { own: true, seat: -1 };
    }
    return this.authorAt(p, synced);
  }

  /** Start again from the room's text (too far behind, a refused change, or the room rewound). */
  reset(m: { doc: string; version: number; epoch?: string; why?: string }) {
    if (m.epoch) this.epoch = m.epoch;
    if (m.why === 'rewound') this.opts.onRewound?.();
    this.base = { doc: textOf(String(m.doc ?? '')), version: Number(m.version) };
    this.hist = { from: this.base.version, items: [] };
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
    ed.dispatch({ effects: this.inner.reconfigure([
      collab({ startVersion: b.version, clientID: this.clientID }),
      charAuthor.of((state, pos) => this.localAuthor(state, pos)),
    ]) });
    this.installed = true;
    this.base = null;
    this.placePending();
    this.cursorNowSendable();
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
/** Rides on a shared update: whose typing it was (that seat's cursor moves along with it). */
const typedBy = StateEffect.define<number>();

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

/** Does an insert by `own`/`seat` at a caret carry on the run of the character just before it (`who`)? */
function followsRun(who: CharAuthor, own: boolean, seat: number): boolean {
  if (!who) return false;
  return own ? who.own : !who.own && who.seat === seat;
}

function clampPos(n: number, len: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(len, Math.floor(n))) : 0;
}

/**
 * Where a caret's name tag sits: above the caret unless that would cover code
 * on the line above, then below unless that would cover code on the line
 * below; when both have code under it, above. The tag is about 0.8 of a code
 * character per letter of the name, plus padding.
 */
export function tagGoesBelow(doc: Text, pos: number, name: string): boolean {
  const line = doc.lineAt(pos);
  const col = pos - line.from;
  const span = Math.ceil(name.length * 0.8) + 2;
  const covers = (n: number) => {
    if (n < 1 || n > doc.lines) return false;
    return doc.line(n).text.slice(col, col + span).trim() !== '';
  };
  if (line.number === 1) return true;          // nothing above: room underneath
  if (!covers(line.number - 1)) return false;  // the line above is clear there
  if (line.number < doc.lines && !covers(line.number + 1)) return true;
  if (line.number === doc.lines) return true;  // the last line: nothing below to cover
  return false;
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
    ranges.push(Decoration.widget({ widget: new CaretWidget(color, c.name, tagGoesBelow(doc, h, c.name)), side: 1 }).range(h));
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
      const typists = new Set<number>();
      for (const e of tr.effects) if (e.is(typedBy)) typists.add(e.value);
      const local = !tr.annotation(Transaction.remote);
      const authorOf = tr.startState.facet(charAuthor);
      cursors = cursors.map((c) => {
        // Someone's own typing at their caret puts the caret after it, and so
        // does typing that carries on the text just before their caret (their
        // editor moves it the same way); anyone else's leaves it in front.
        let assoc = typists.has(c.seat) ? 1 : -1;
        const at = clampPos(c.head, len);
        if (assoc < 0 && authorOf && c.anchor === c.head && tr.changes.mapPos(at, -1) !== tr.changes.mapPos(at, 1)) {
          const who = authorOf(tr.startState, at - 1);
          if (local ? !!who?.own : !!who && !who.own && typists.has(who.seat)) assoc = 1;
        }
        return { ...c, anchor: tr.changes.mapPos(clampPos(c.anchor, len), assoc), head: tr.changes.mapPos(at, assoc) };
      });
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
    color: TAG_TEXT,
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
  /** A calm word about something that happened on its own (the room jumped back). */
  notice: string | null;
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
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** People who just went, by seat: said once they have stayed gone (LEFT_GRACE_MS). */
  private goneTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private lastCursorAt = 0;

  constructor(opts: LiveDocClientOptions) {
    this.opts = opts;
    this.code = opts.code;
    this.status = { phase: 'connecting', code: opts.code, seat: -1, seats: 0, players: [], host: '', error: null, notice: null };
    this.sync = new DocSync({
      send: (m) => this.send(m), wantPush: () => this.schedulePush(), onRewound: () => this.calm(REWOUND),
      wantCursor: () => this.sendCursorSoon(),
    });
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
    for (const t of [this.retryTimer, this.pushTimer, this.cursorTimer, this.errorTimer, this.noticeTimer]) if (t) clearTimeout(t);
    for (const t of this.goneTimers.values()) clearTimeout(t);
    this.goneTimers.clear();
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.retryTimer = this.pushTimer = this.cursorTimer = this.errorTimer = this.noticeTimer = null;
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

  /** A calm note (not an error) for a few seconds. */
  private calm(text: string) {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.emit({ notice: text });
    this.noticeTimer = setTimeout(() => { this.noticeTimer = null; this.emit({ notice: null }); }, 8000);
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
        this.noteLeavers(this.status.players, players);
        this.emit({ players });
        this.sync.keepCursors(new Set(players.map((p) => p.seat)));
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
        this.sync.remoteCursor({
          seat, name, anchor: Number(m.anchor), head: Number(m.head),
          version: Number.isInteger(m.version) ? (m.version as number) : undefined,
        });
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

  /** "Ana P. left." for whoever went and did not come straight back. */
  private noteLeavers(before: LivePlayer[], after: LivePlayer[]) {
    const now = new Set(after.map((p) => p.seat));
    for (const seat of now) {
      const t = this.goneTimers.get(seat);
      if (t) { clearTimeout(t); this.goneTimers.delete(seat); }
    }
    for (const p of before) {
      if (now.has(p.seat) || p.seat === this.status.seat || this.goneTimers.has(p.seat)) continue;
      const name = p.name || `Person ${p.seat + 1}`;
      this.goneTimers.set(p.seat, setTimeout(() => {
        this.goneTimers.delete(p.seat);
        if (!this.stopped && !this.status.players.some((q) => q.seat === p.seat)) this.calm(`${name} left.`);
      }, LEFT_GRACE_MS));
    }
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
      if (!this.view) return;
      // Null while this editor's own typing is unconfirmed: DocSync asks again once it is.
      const msg = this.sync.cursor();
      if (msg && this.send(msg)) this.lastCursorAt = Date.now();
    }, wait);
  }
}
