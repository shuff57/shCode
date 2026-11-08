#!/usr/bin/env node
// Tests Code together (codehs-review/REALTIME-SPEC.md, Part 2):
//   1. the shared helpers (lib/live-doc-protocol.ts, the DocTicket in
//      lib/live-protocol.ts): ChangeSet checks, the 64 KB count, tickets of one
//      kind refused by the other;
//   2. LiveDocCore (what the LiveDoc Durable Object AND the dev stand-in run)
//      driven by two simulated @codemirror/collab clients (DocSync from
//      lib/live-doc.ts, the browser's own sync) over a lossy, reordering
//      network: random concurrent edits, the same line too, converge; a stale
//      version is caught up, a client too far behind is reset; the seed rules;
//      the 64 KB cap and the frame limit; the rate limit; presence relayed and
//      never stored; seat stamping; a woken room; code_sessions writes (first
//      push, at most every 2 minutes, on close and when the last person
//      leaves) and that no email ever reaches a socket;
//   3. the Pages routes on a real SQLite: kind routing (code rooms to
//      LIVE_DOC, game rooms to LIVE; the polling send refuses a code room; a
//      join of the wrong kind is refused), the lists keep the kinds apart, the
//      host leaving tells LiveDoc, GET /api/classes/[id]/code-sessions is for
//      that class's teachers only;
//   4. the dev stand-in (scripts/dev-live.mjs) end to end over real sockets.
//
// Run: node scripts/test-live-doc.mjs

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { EditorState, Transaction } from '@codemirror/state';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

const require = createRequire(import.meta.url);
const { WebSocket } = require('next/dist/compiled/ws');
const P = await import(join(root, 'lib/live-protocol.ts'));
const D = await import(join(root, 'lib/live-doc-protocol.ts'));
const { DocSync, presenceField, setCursors } = await import(join(root, 'lib/live-doc.ts'));
const { makeDevLive } = await import(join(root, 'scripts/dev-live.mjs'));

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`); }
}

// ---- 1. helpers ----
check('utf8: ASCII, 2-, 3- and 4-byte characters', D.utf8Bytes('a') === 1 && D.utf8Bytes('é') === 2 && D.utf8Bytes('€') === 3 && D.utf8Bytes('😀') === 4);
check('cap: 64 KB of ASCII is allowed, one byte more is not', !D.overDocCap('x'.repeat(D.MAX_DOC_BYTES)) && D.overDocCap('x'.repeat(D.MAX_DOC_BYTES + 1)));
check('cap: counted in UTF-8 bytes, not characters', D.overDocCap('€'.repeat(Math.floor(D.MAX_DOC_BYTES / 3) + 1)) && !D.overDocCap('€'.repeat(Math.floor(D.MAX_DOC_BYTES / 3))));
check('changes: a real ChangeSet JSON applies', D.parseChanges([3, [0, 'hi']], 3)?.length === 3);
check('changes: the wrong document length is refused', D.parseChanges([3, [0, 'hi']], 4) === null);
check('changes: a line break inside a line is refused', D.parseChanges([[0, 'a\nb']], 0) === null && D.parseChanges([[0, 'a\rb']], 0) === null);
check('changes: junk is refused', D.parseChanges('x', 0) === null && D.parseChanges([], 0) === null && D.parseChanges([[-1]], 0) === null && D.parseChanges([{ a: 1 }], 0) === null);
const T_EXP = Date.now() + 3_600_000;
const docTicket = (o = {}) => ({
  kind: 'code', code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: T_EXP,
  email: 'ann@s.test', host: 'ann@s.test', hostName: 'Ann L.', lang: 'moshion', roomKey: 'BHKE-1000', startedAt: 1000, ...o,
});
const sorted = (o) => o && JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))));
check('ticket: a DocTicket round-trips', sorted(P.decodeDocTicket(P.encodeDocTicket(docTicket()))) === sorted(docTicket()));
check('ticket: LiveRoom refuses a code room\'s ticket', P.decodeTicket(P.encodeDocTicket(docTicket())) === null);
check('ticket: LiveDoc refuses a game room\'s ticket', P.decodeDocTicket(P.encodeTicket({ code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: T_EXP })) === null);
check('ticket: a bad language or room key is refused', P.decodeDocTicket(JSON.stringify(docTicket({ lang: 'python' }))) === null && P.decodeDocTicket(JSON.stringify(docTicket({ roomKey: 'x' }))) === null);
check('game keys: code-js and code-moshion only', P.codeLangOf('code-js') === 'js' && P.codeLangOf('code-moshion') === 'moshion' && P.codeLangOf('sandbox') === null);

// Presence in the editor: a cursor from someone whose text is ahead of ours
// (typing we have not received yet) must not break the next change. Found in
// the browser: an unclamped position made mapPos throw inside the state field,
// which failed the shared update and then the reset.
{
  let st = EditorState.create({ doc: '0123456789', extensions: [presenceField] });
  st = st.update({ effects: setCursors.of([{ seat: 1, name: 'Bo N.', anchor: 40, head: 50 }]) }).state;
  check('presence: a cursor past the end is clamped as it is stored', st.field(presenceField).cursors[0].head === 10, st.field(presenceField).cursors[0]);
  let threw = null;
  try { st = st.update({ changes: { from: 2, to: 4, insert: 'abc' } }).state; } catch (e) { threw = e; }
  check('presence: the next change still applies', !threw && st.doc.toString() === '01abc456789' && st.field(presenceField).cursors[0].head === 11, threw?.message);
  st = st.update({ effects: setCursors.of([{ seat: 2, name: 'Cy R.', anchor: Number.NaN, head: -5 }]) }).state;
  check('presence: junk positions land at the start', st.field(presenceField).cursors[0].anchor === 0 && st.field(presenceField).cursors[0].head === 0);
}

// ---- 2. LiveDocCore + two collab clients ----
let clock = 1_000_000;
const now = () => clock;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** setTimeout on the test clock: run() fires what is due. */
function fakeTimer() {
  const pending = new Map();
  let id = 0;
  return {
    pending,
    set: (fn, ms) => { const h = ++id; pending.set(h, { fn, at: clock + ms }); return h; },
    clear: (h) => { pending.delete(h); },
    run() { for (const [h, t] of [...pending]) if (t.at <= clock) { pending.delete(h); t.fn(); } },
  };
}

/** A room; `store` given = the same Durable Object waking (or rebuilt after an eviction). */
function makeRoom(store = D.memoryDocStore()) {
  const socks = new Set();
  const rows = [];
  const scheduled = [];
  const timer = fakeTimer();
  const core = new D.LiveDocCore({
    sockets: () => [...socks], store, now, timer,
    write: async (row) => { rows.push(row); },
    schedule: (at) => scheduled.push(at),
  });
  return { core, socks, store, rows, scheduled, timer };
}

/** One browser: a socket the core sees, and DocSync on a plain editor state (no DOM). */
function client(room, ticket, { seed = null, own = 'my own code' } = {}) {
  const c = { inbox: [], outbox: [], seen: [], seed, seeded: false, closedWith: null, rewound: 0, room };
  const socket = (r) => {
    let att = null;
    const sock = {
      send: (t) => { c.inbox.push(JSON.parse(t)); c.seen.push(t); },
      close: (code) => { c.closedWith = code; r.socks.delete(sock); },
      attachment: () => att,
      attach: (a) => { att = a; },
    };
    return sock;
  };
  c.sock = socket(room);
  c.sync = new DocSync({ send: (m) => { c.outbox.push(JSON.stringify(m)); return true; }, now, onRewound: () => { c.rewound++; } });
  c.ed = {
    state: EditorState.create({ doc: own, extensions: [c.sync.inner.of([])] }),
    dispatch(...specs) {
      const tr = specs[0] instanceof Transaction ? specs[0] : this.state.update(...specs);
      this.state = tr.state;
    },
  };
  c.sync.attach(c.ed);
  c.text = () => c.ed.state.doc.toString();
  c.handle = (m) => {
    if (m.t === 'hello') { c.sync.hello(m, c.seeded ? null : c.seed); c.seeded = true; }
    else if (m.t === 'updates') c.sync.updates(m);
    else if (m.t === 'reset') c.sync.reset(m);
    else if (m.t === 'error' && m.code === 'rate') c.sync.released();
  };
  c.deliverIn = () => { const m = c.inbox.shift(); if (m) c.handle(m); return !!m; };
  c.deliverOut = () => { const f = c.outbox.shift(); if (f) c.room.core.message(c.sock, f); return !!f; };
  c.edit = (spec) => { c.ed.dispatch(c.ed.state.update(spec)); };
  /** The socket dropped and opened again, possibly on a rebuilt room: what was in flight is gone. */
  c.reconnect = (r) => {
    c.room = r;
    c.inbox.length = 0;
    c.outbox.length = 0;
    c.closedWith = null;
    c.sock = socket(r);
    r.socks.add(c.sock);
    r.core.accept(c.sock, ticket);
  };
  room.socks.add(c.sock);
  room.core.accept(c.sock, ticket);
  return c;
}

function drain(room, clients, rounds = 2000) {
  for (let i = 0; i < rounds; i++) {
    let moved = false;
    for (const c of clients) { while (c.deliverOut()) moved = true; }
    for (const c of clients) { while (c.deliverIn()) moved = true; }
    for (const c of clients) if (c.sync.push()) moved = true;
    if (!moved) { clock += 100; if (!clients.some((c) => c.sync.hasSendable() || c.inbox.length || c.outbox.length)) return true; }
  }
  return false;
}

const ANN_T = docTicket();
const BO_T = docTicket({ seat: 1, name: 'Bo N.', email: 'bo@s.test' });
const SEED = 'let x = 1;\nfunction draw() {\n  clear();\n}\n';
{
  const room = makeRoom();
  const ann = client(room, ANN_T, { seed: SEED, own: SEED });
  ann.deliverIn();
  check('hello carries seat, version 0 and an empty doc, no email', room.core.version === 0 && ann.seen[0].includes('"seat":0') && !ann.seen[0].includes('@'), ann.seen[0]);
  check('the host seeds an empty doc with its own code', ann.outbox[0] && JSON.parse(ann.outbox[0]).t === 'seed');
  ann.deliverOut();
  ann.deliverIn();
  check('the seed is accepted as update 1 and the host is in sync', room.core.version === 1 && room.core.text() === SEED && ann.sync.installed && ann.text() === SEED, [room.core.version, ann.text()]);
  check('the first accepted change is written for teachers at once', room.rows.length === 1 && room.rows[0].text === SEED && room.rows[0].closed_at === null && room.rows[0].kind === 'moshion', room.rows);
  const bo = client(room, BO_T, { own: 'Bo\'s own sandbox code' });
  bo.deliverIn();
  check('a joiner gets the shared program in hello and its editor shows it', bo.sync.installed && bo.text() === SEED, bo.text());
  check('the host hears the joiner arrive (names only)', ann.inbox.some((m) => m.t === 'players' && m.players.length === 2 && m.players[1].name === 'Bo N.'));
  drain(room, [ann, bo]);
  // Seed rules.
  bo.outbox.push(JSON.stringify({ t: 'seed', doc: 'take over' }));
  bo.deliverOut();
  const refused = bo.inbox.find((m) => m.t === 'error');
  check('seed: refused from a seat that is not 0', refused && /started the session/.test(refused.error) && room.core.text() === SEED, refused);
  drain(room, [ann, bo]);
  ann.outbox.push(JSON.stringify({ t: 'seed', doc: 'again' }));
  ann.deliverOut();
  check('seed: refused once the program has started', ann.inbox.some((m) => m.t === 'error' && /already started/.test(m.error)) && room.core.text() === SEED);
  drain(room, [ann, bo]);

  // Concurrent edits on the same line, before either hears the other.
  ann.edit({ changes: { from: 9, insert: '0' } }); // let x = 10;
  bo.edit({ changes: { from: 9, insert: '5' } });
  ann.sync.push(); bo.sync.push();
  check('same position, same moment: both pushes go out', ann.outbox.length === 1 && bo.outbox.length === 1);
  bo.deliverOut(); ann.deliverOut();
  check('a stale push is answered with the updates since its version', ann.inbox.some((m) => m.t === 'updates' && m.updates.some((u) => u.seat === 1)), ann.inbox.map((m) => m.t));
  check('drain: both converge after the same-line clash', drain(room, [ann, bo]) && ann.text() === bo.text() && bo.text() === room.core.text(), [ann.text(), bo.text(), room.core.text()]);
  check('...and both characters survived', /let x = 1(05|50);/.test(room.core.text()), room.core.text().split('\n')[0]);

  // Random concurrent edits over a reordering network.
  const rand = rng(Number(process.env.LIVE_DOC_SEED || 44));
  const words = ['a', 'let ', 'x', '+', '()', '{\n', '}', ';\n', 'circle(10, 20, 5)', 'é', '€', '😀', ' '];
  const clients = [ann, bo];
  let edits = 0;
  for (let step = 0; step < 1500; step++) {
    clock += 40;
    const c = clients[Math.floor(rand() * 2)];
    const r = rand();
    if (r < 0.35) {
      const len = c.ed.state.doc.length;
      if (rand() < 0.7 || len < 3) {
        const at = Math.floor(rand() * (len + 1));
        c.edit({ changes: { from: at, insert: words[Math.floor(rand() * words.length)] } });
      } else {
        const from = Math.floor(rand() * len);
        const to = Math.min(len, from + 1 + Math.floor(rand() * 4));
        // Do not split a surrogate pair (the editor never does).
        const t = c.ed.state.doc.sliceString(from, to);
        if (!/[\uD800-\uDFFF]/.test(t)) c.edit({ changes: { from, to } });
      }
      edits++;
    } else if (r < 0.55) c.sync.push();
    else if (r < 0.8) c.deliverOut();
    else c.deliverIn();
  }
  check(`random: ${edits} concurrent edits drain to quiet`, drain(room, clients));
  check('random: both editors and the room hold the same text', ann.text() === bo.text() && bo.text() === room.core.text(), [ann.text().length, bo.text().length, room.core.text().length]);
  check('random: the room counted every accepted update', room.core.version > 10, room.core.version);

  // Every update carries the seat and the client id the ROOM gave it.
  ann.seen.length = 0;
  const push = JSON.parse(JSON.stringify({ t: 'push', version: bo.sync.version, updates: [{ changes: [[0, '// x', ''], room.core.text().length], clientID: 'evil' }] }));
  bo.outbox.push(JSON.stringify(push));
  bo.deliverOut();
  const stamped = ann.inbox.findLast((m) => m.t === 'updates');
  check('stamping: the seat and client id come from the ticket, not the client', stamped && stamped.updates[0].seat === 1 && stamped.updates[0].clientID === 's1', stamped);
  drain(room, clients);
  check('stamping: a raw push from the side still converges', ann.text() === bo.text() && bo.text() === room.core.text());

  // Catch up from an old version, and reset when too far behind.
  const v = room.core.version;
  bo.outbox.push(JSON.stringify({ t: 'pull', version: v - 2 }));
  bo.deliverOut();
  const caught = bo.inbox.at(-1);
  check('pull: a stale version gets exactly the updates it missed', caught?.t === 'updates' && caught.version === v - 2 && caught.updates.length === 2, caught);
  drain(room, clients);
  for (let i = 0; i < D.KEEP_UPDATES + 5; i++) {
    ann.edit({ changes: { from: 0, insert: 'z' } });
    ann.sync.push(); ann.deliverOut(); ann.deliverIn();
    clock += 40;
  }
  bo.outbox.push(JSON.stringify({ t: 'pull', version: v }));
  bo.inbox.length = 0;
  bo.deliverOut();
  check(`pull: more than ${D.KEEP_UPDATES} behind gets a reset`, bo.inbox.at(-1)?.t === 'reset' && bo.inbox.at(-1).doc === room.core.text(), bo.inbox.at(-1)?.t);
  check('drain: everyone converges after the reset', drain(room, clients) && ann.text() === bo.text() && bo.text() === room.core.text());

  // The 64 KB cap and the frame limit.
  const before = room.core.text();
  const big = 'y'.repeat(D.MAX_DOC_FRAME + 10);
  bo.outbox.push(JSON.stringify({ t: 'push', version: room.core.version, updates: [{ changes: [[0, big], before.length] }] }));
  bo.inbox.length = 0;
  bo.deliverOut();
  check('frame: a push over 16 KB is refused and the pusher reset', bo.inbox[0]?.t === 'error' && bo.inbox[0].code === 'too-big' && bo.inbox[1]?.t === 'reset' && room.core.text() === before, bo.inbox.map((m) => m.t));
  drain(room, clients);
  const chunk = 'w'.repeat(15000);
  let hit = null;
  for (let i = 0; i < 6 && !hit; i++) {
    bo.inbox.length = 0;
    bo.outbox.push(JSON.stringify({ t: 'push', version: room.core.version, updates: [{ changes: [[0, chunk], room.core.text().length] }] }));
    bo.deliverOut();
    hit = bo.inbox.find((m) => m.t === 'error');
    if (!hit) drain(room, clients);
  }
  check('cap: the push that would pass 64 KB is refused in plain words', hit && hit.code === 'too-big' && /64 KB/.test(hit.error), hit);
  check('cap: the shared program stays at or under 64 KB', !D.overDocCap(room.core.text()), D.utf8Bytes(room.core.text()));
  drain(room, clients);
  check('cap: everyone still agrees', ann.text() === bo.text() && bo.text() === room.core.text());

  // Presence: relayed to the others, rate limited, never stored.
  ann.inbox.length = 0; bo.inbox.length = 0;
  for (let i = 0; i < 30; i++) { bo.outbox.push(JSON.stringify({ t: 'cursor', anchor: 3, head: 7 })); bo.deliverOut(); }
  const cursors = ann.inbox.filter((m) => m.t === 'cursor');
  check('presence: a cursor reaches the others, stamped with the seat', cursors.length > 0 && cursors[0].seat === 1 && cursors[0].anchor === 3 && cursors[0].head === 7, cursors[0]);
  check(`presence: at most ${D.CURSOR_PER_SEC} a second`, cursors.length <= D.CURSOR_PER_SEC, cursors.length);
  check('presence: never echoed to the sender', !bo.inbox.some((m) => m.t === 'cursor'));
  check('presence: never stored', !JSON.stringify(room.store.state).includes('anchor') && !JSON.stringify(room.rows).includes('anchor'));
  bo.outbox.push(JSON.stringify({ t: 'cursor', anchor: -1, head: 'x' }));
  bo.deliverOut();
  clock += 2000;

  // Rate limit: a burst, then drops with ONE error a second.
  bo.inbox.length = 0;
  for (let i = 0; i < 100; i++) room.core.message(bo.sock, '{"t":"ping"}');
  const pongs = bo.inbox.filter((m) => m.t === 'pong').length;
  const errs = bo.inbox.filter((m) => m.t === 'error' && m.code === 'rate').length;
  check(`rate: ${P.LIVE_BURST} through, then dropped`, pongs <= P.LIVE_BURST && pongs >= P.LIVE_BURST - 5, pongs);
  check('rate: said once, not per frame', errs === 1, errs);
  clock += 3000;
  bo.inbox.length = 0;
  check('unknown and non-JSON frames are refused, the socket stays', (room.core.message(bo.sock, '{"t":"chat","text":"hi"}'), room.core.message(bo.sock, 'nope'), bo.inbox.filter((m) => m.t === 'error').length === 2) && bo.closedWith === null);

  // code_sessions: at most every 2 minutes while it changes.
  drain(room, clients);
  clock += D.SAVE_EVERY_MS;
  ann.edit({ changes: { from: 0, insert: 'p' } });
  drain(room, clients);
  await room.core.idle();
  check('save: a change 2 minutes after the last write is written at once', room.rows.at(-1)?.text === room.core.text() && room.rows.at(-1).updated_at >= clock - 1000, room.rows.at(-1)?.updated_at);
  const nRows = room.rows.length;
  ann.edit({ changes: { from: 0, insert: 'q' } });
  drain(room, clients);
  check('save: a change within 2 minutes of the last write is not written yet', room.rows.length === nRows, [room.rows.length, nRows]);
  check('save: a write is scheduled for 2 minutes after the last', room.scheduled.length > 0 && room.scheduled.at(-1) >= room.rows.at(-1).updated_at + D.SAVE_EVERY_MS - 1, room.scheduled.at(-1));
  clock = room.scheduled.at(-1) + 1;
  room.core.flush();
  await room.core.idle();
  check('save: the scheduled write keeps the room\'s own text', room.rows.length === nRows + 1 && room.rows.at(-1).text === room.core.text(), room.rows.length);
  check('save: participants are the accounts from the tickets', JSON.stringify(JSON.parse(room.rows.at(-1).participants)) === JSON.stringify(['ann@s.test', 'bo@s.test']));

  // A woken room: the same store, no history (its pending storage write lands first).
  clock += D.PERSIST_EVERY_MS;
  room.timer.run();
  const room2 = { ...room, core: new D.LiveDocCore({ sockets: () => [...room.socks], store: room.store, now, write: async (r) => { room.rows.push(r); }, schedule: () => {} }) };
  check('wake: text and version come back from the room\'s storage', room2.core.text() === room.core.text() && room2.core.version === room.core.version);
  bo.inbox.length = 0;
  room2.core.message(bo.sock, JSON.stringify({ t: 'pull', version: room2.core.version - 1 }));
  check('wake: a client behind is reset (history is memory only)', bo.inbox.at(-1)?.t === 'reset');
  for (const c of clients) c.inbox.length = 0;

  // The last person leaving writes; the host closing writes closed_at and closes every socket.
  const n2 = room.rows.length;
  room.core.left(bo.sock); room.socks.delete(bo.sock); bo.sock.attach(null);
  check('leave: the others hear it', ann.inbox.some((m) => m.t === 'players' && m.players.length === 1));
  room.core.left(ann.sock); room.socks.delete(ann.sock); ann.sock.attach(null);
  await room.core.idle();
  check('leave: the last person out writes the session (still open)', room.rows.length === n2 + 1 && room.rows.at(-1).closed_at === null);
  const ann2 = client(room, ANN_T);
  ann2.deliverIn();
  check('rejoin: the host comes back to the same program', ann2.text() === room.core.text());
  check('control: junk refused', room.core.control('nope') === false && room.core.control('{"op":"x"}') === false);
  check('control: close', room.core.control(JSON.stringify({ op: 'close' })));
  await room.core.idle();
  const closed = ann2.inbox.find((m) => m.t === 'closed');
  check('close: everyone is told who ended it', closed?.why === 'host' && /Ann L\. ended the session/.test(closed.reason) && ann2.closedWith === P.LIVE_CLOSED, closed);
  check('close: written with closed_at', room.rows.at(-1).closed_at === clock, room.rows.at(-1));
  const late = client(room, BO_T);
  check('close: a closed session refuses a new socket', late.closedWith === P.LIVE_CLOSED && late.inbox[0]?.t === 'closed');
  check('no email ever reached a socket', ![...ann.seen, ...bo.seen, ...ann2.seen].some((t) => t.includes('@s.test')));
}
{
  // Seed rules at the edge: a joiner first, an oversized seed, an expired ticket.
  const room = makeRoom();
  const bo = client(room, BO_T, { own: 'mine' });
  bo.deliverIn();
  check('seed: a joiner before the host sees the empty program', bo.sync.installed && bo.text() === '');
  const ann = client(room, ANN_T, { seed: 'z'.repeat(D.MAX_DOC_BYTES + 1) });
  ann.deliverIn(); ann.deliverOut();
  check('seed: a seed over 64 KB is refused in plain words', ann.inbox.some((m) => m.t === 'error' && /64 KB/.test(m.error)) && room.core.version === 0);
  const old = client(room, docTicket({ seat: 1, expiresAt: clock - 1 }));
  check('an expired ticket is refused', old.closedWith === P.LIVE_CLOSED);
  check('nobody wrote anything: nothing kept', room.rows.length === 0);
  const r2 = makeRoom();
  const a = client(r2, docTicket({ expiresAt: clock + 10 }), { seed: 'x' });
  a.deliverIn(); a.deliverOut(); a.deliverIn();
  clock += 20;
  r2.core.message(a.sock, '{"t":"ping"}');
  await r2.core.idle();
  check('a session that expires closes on the next frame and is kept', a.closedWith === P.LIVE_CLOSED && r2.rows.at(-1)?.closed_at !== null && r2.rows.at(-1)?.text === 'x');
}

{
  // The room's own storage: at most one write per 2 seconds while changes
  // arrive, at once on close and when the last person leaves.
  const room = makeRoom();
  const ann = client(room, ANN_T, { seed: 'let a = 1;\n', own: 'let a = 1;\n' });
  const bo = client(room, BO_T);
  drain(room, [ann, bo]);
  clock += D.PERSIST_EVERY_MS; room.timer.run();
  const saves = room.store.saves;
  let pushes = 0;
  for (let i = 0; i < 30; i++) {
    clock += 50;
    (i % 2 ? ann : bo).edit({ changes: { from: 0, insert: String(i % 10) } });
    for (const c of [ann, bo]) { if (c.sync.push()) pushes++; c.deliverOut(); }
    for (const c of [ann, bo]) while (c.deliverIn());
    room.timer.run();
  }
  check(`persist: ${pushes} accepted pushes inside 2 s write nothing yet`, pushes >= 10 && room.store.saves === saves && room.core.persistPending, [pushes, room.store.saves - saves]);
  clock += D.PERSIST_EVERY_MS;
  room.timer.run();
  check('persist: ...then exactly one write, holding the latest text', room.store.saves === saves + 1 && room.store.state.version === room.core.version && room.store.state.doc === room.core.text(), room.store.saves - saves);
  ann.edit({ changes: { from: 0, insert: 'x' } });
  drain(room, [ann, bo]);
  const s2 = room.store.saves;
  check('persist: a change after the write starts a new 2-second wait', room.core.persistPending && room.store.saves === s2);
  room.core.control(JSON.stringify({ op: 'close' }));
  check('persist: close writes at once, closed and up to date', room.store.saves > s2 && room.store.state.closed === true && room.store.state.doc === room.core.text() && !room.core.persistPending);
  await room.core.idle();

  const r2 = makeRoom();
  const a2 = client(r2, ANN_T, { seed: 'x', own: 'x' });
  drain(r2, [a2]);
  a2.edit({ changes: { from: 1, insert: 'yz' } });
  drain(r2, [a2]);
  const s3 = r2.store.saves;
  check('persist: a change waiting for its 2 seconds...', r2.core.persistPending && r2.store.state.doc !== r2.core.text());
  r2.core.left(a2.sock); r2.socks.delete(a2.sock); a2.sock.attach(null);
  check('persist: ...is written at once when the last person leaves', r2.store.saves > s3 && r2.store.state.doc === 'xyz' && !r2.core.persistPending);
  await r2.core.idle();
}
{
  // Evicted between storage writes: the room wakes a few seconds behind its clients.
  const room = makeRoom();
  const ann = client(room, ANN_T, { seed: 'let a = 1;\n', own: 'let a = 1;\n' });
  const bo = client(room, BO_T);
  drain(room, [ann, bo]);
  clock += D.PERSIST_EVERY_MS; room.timer.run();
  const kept = room.core.text();
  const keptVersion = room.core.version;
  for (let i = 0; i < 4; i++) { ann.edit({ changes: { from: 0, insert: `/*${i}*/` } }); drain(room, [ann, bo]); }
  check('rewind: the last few changes are not in storage yet', room.core.version > keptVersion && room.store.state.version === keptVersion);
  // Evicted: no flush. A new object rebuilds from storage; the old sockets are gone.
  const woke = makeRoom(room.store);
  check('rewind: the rebuilt room is behind', woke.core.version === keptVersion && woke.core.text() === kept);
  const probe = { got: [], send(t) { this.got.push(JSON.parse(t)); }, close() {}, attachment: () => BO_T, attach() {} };
  woke.core.message(probe, JSON.stringify({ t: 'push', version: keptVersion + 2, updates: [{ changes: [kept.length, [0, 'q']] }] }));
  check('rewind: a push AHEAD of the room gets a reset to the room\'s text, why rewound', probe.got.at(-1)?.t === 'reset' && probe.got.at(-1).why === 'rewound' && probe.got.at(-1).doc === kept && probe.got.at(-1).version === keptVersion, probe.got.at(-1));
  probe.got.length = 0;
  woke.core.message(probe, JSON.stringify({ t: 'pull', version: keptVersion + 1 }));
  check('rewind: a pull AHEAD of the room too', probe.got.at(-1)?.t === 'reset' && probe.got.at(-1).why === 'rewound');
  // Ana had typing the room never got: it is in flight when the socket dies.
  ann.edit({ changes: { from: 0, insert: 'LOST ' } });
  // Bo reconnects first and starts again from the room's text, then types on.
  bo.reconnect(woke);
  bo.deliverIn();
  check('rewind: the first one back starts again from the room\'s text and is told', bo.text() === kept && bo.rewound === 1, [bo.text(), bo.rewound]);
  for (let i = 0; i < 8; i++) { bo.edit({ changes: { from: 0, insert: `b${i};` } }); drain(woke, [bo]); }
  check('rewind: the room moves on past where Ana was', woke.core.version >= ann.sync.version, [woke.core.version, ann.sync.version]);
  // Ana comes back to a new incarnation that woke behind her: she must not build on Bo's updates.
  ann.reconnect(woke);
  ann.deliverIn();
  check('rewind: a client from the old incarnation, past where the room woke, resets', ann.rewound === 1 && ann.text() === woke.core.text(), [ann.rewound, ann.text().slice(0, 40), woke.core.text().slice(0, 40)]);
  ann.edit({ changes: { from: 0, insert: 'A;' } });
  bo.edit({ changes: { from: woke.core.text().length, insert: '//B' } });
  check('rewind: both converge again', drain(woke, [ann, bo]) && ann.text() === bo.text() && bo.text() === woke.core.text(), [ann.text(), bo.text()]);
  // A plain hibernation (written before it slept) resets nobody.
  clock += D.PERSIST_EVERY_MS; woke.timer.run();
  const slept = makeRoom(woke.store);
  bo.reconnect(slept);
  bo.deliverIn();
  check('rewind: waking from a written state resets nobody', bo.rewound === 1 && bo.text() === slept.core.text());
}

// ---- 3. the Pages routes on a real SQLite ----
const out = join(root, '.tmp', 'live-doc-test');
const liveR = compileHandler('api/live/[code].ts', join(out, 'live'));
const create = compileHandler('api/rooms/index.ts', join(out, 'create'));
const joinR = compileHandler('api/rooms/[code]/join.ts', join(out, 'join'));
const leaveR = compileHandler('api/rooms/[code]/leave.ts', join(out, 'leave'));
const sendR = compileHandler('api/rooms/[code]/send.ts', join(out, 'send'));
const sessionsR = compileHandler('api/classes/[id]/code-sessions/index.ts', join(out, 'sessions'));

const db = makeD1();
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const FUTURE = 4102444800000;
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c1', 'P1', 'AAAAAA', 'teach@s.test', '2026-2027', 0)`);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c2', 'P2', 'BBBBBB', 'other@s.test', '2026-2027', 0)`);
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('c1', 'co@s.test', 0)`);
const student = (email, first, last, cls) => {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', 0, 'student', ?, ?)`, email, first, last);
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)`, cls, email, FUTURE);
};
student('ann@s.test', 'Ann', 'Lee', 'c1');
student('bo@s.test', 'Bo', 'Ng', 'c1');
student('dee@s.test', 'Dee', 'Fox', 'c2');
const S = (email, role = 'student') => ({ email, role });
const ANN = S('ann@s.test'), BO = S('bo@s.test'), DEE = S('dee@s.test');
const DEV_A = 'tabaaaaaaaa1', DEV_B = 'tabbbbbbbbb2';

function fakeNs() {
  const calls = [];
  return {
    calls,
    idFromName: (n) => `id:${n}`,
    get: (id) => ({ fetch: async (input, init) => { const r = input instanceof Request ? input : new Request(input, init); calls.push({ id, req: r }); return new Response('{"ok":true}', { status: 200 }); } }),
  };
}
const req = (method, path, body, headers = {}) => new Request(`https://shcode.test${path}`, {
  method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers },
});
async function call(h, fn, env, user, method, path, params, body, headers) {
  const res = await h[fn]({ env, data: user, params: params ?? {}, request: req(method, path, body, headers) });
  let b = null;
  try { b = await res.json(); } catch { /* none */ }
  return { status: res.status, body: b };
}
const LIVE = fakeNs();
const LIVE_DOC = fakeNs();
const ENV = { DB: db, LIVE, LIVE_DOC };

let r = await call(create, 'onRequestPost', { DB: db, LIVE }, ANN, 'POST', '/api/rooms', {}, { kind: 'code', game: 'code-moshion', seats: 2, device: DEV_A });
check('rooms: a code session needs the LIVE_DOC binding (503, offline)', r.status === 503 && r.body.offline === true && /Code together/.test(r.body.error), r);
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { kind: 'code', game: 'race', seats: 2, device: DEV_A });
check('rooms: a code session is for code-js or code-moshion only', r.status === 400, r);
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { kind: 'code', game: 'code-moshion', seats: 3, device: DEV_A });
check('rooms: a code session is made through the same POST, always live', r.status === 201 && r.body.kind === 'code' && r.body.live === true && r.body.seats === 3, r);
const CODE = r.body.code;
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'code-moshion', seats: 2, device: DEV_A, live: true });
check('rooms: a game room cannot take a code session\'s key', r.status === 400, r);
r = await call(create, 'onRequestPost', ENV, ANN, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: DEV_A, live: true });
const GAME = r.body.code;
check('stored: kind code for the session, game for the room', db.sqlite.prepare('SELECT kind FROM game_rooms WHERE code = ?').get(CODE).kind === 'code' && db.sqlite.prepare('SELECT kind FROM game_rooms WHERE code = ?').get(GAME).kind === 'game');
const list = async (q) => (await call(create, 'onRequestGet', ENV, BO, 'GET', `/api/rooms?${q}&device=${DEV_B}`)).body;
let l = await list('game=code-moshion&kind=code');
check('list: kind=code lists the code session', l.inClass === true && l.rooms.length === 1 && l.rooms[0].code === CODE && l.rooms[0].host === 'Ann L.' && l.rooms[0].seats === 3, l);
l = await list('game=code-js&kind=code');
check('list: a JavaScript list does not show a moSHion session', l.rooms.length === 0, l);
l = await list('game=code-moshion&live=1');
check('list: a game lobby never lists a code session, even with its key', l.rooms.length === 0, l);
l = await list('game=race&live=1');
check('list: a game lobby lists its game room (unchanged)', l.rooms.length === 1 && l.rooms[0].code === GAME, l);
l = await list('game=race&kind=code');
check('list: kind=code with a game key is refused', l.error !== undefined);
r = await call(create, 'onRequestGet', ENV, S('nobody@s.test'), 'GET', '/api/rooms?game=code-js&kind=code');
check('list: someone in no class gets inClass false (the button stays hidden)', r.body.inClass === false, r);

r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${CODE}/join`, { code: CODE }, { device: DEV_B });
check('join: a game join (a sketch\'s online.join) cannot take a seat in a code session', r.status === 409 && /Code together/.test(r.body.error), r);
r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${GAME}/join`, { code: GAME }, { device: DEV_B, kind: 'code' });
check('join: a code join cannot take a seat in a game room', r.status === 409, r);
r = await call(joinR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${CODE}/join`, { code: CODE }, { device: DEV_B, kind: 'code' });
check('join: a classmate joins the code session', r.status === 200 && r.body.seat === 1 && r.body.kind === 'code', r);
r = await call(joinR, 'onRequestPost', ENV, DEE, 'POST', `/api/rooms/${CODE}/join`, { code: CODE }, { device: DEV_A, kind: 'code' });
check('join: a stranger (another class) is told no such room (404)', r.status === 404, r);
r = await call(sendR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${CODE}/send`, { code: CODE }, { data: { n: 1 }, device: DEV_B });
check('send: the polling send route refuses a code session (409), nothing stored', r.status === 409 && db.sqlite.prepare('SELECT COUNT(*) AS n FROM game_room_events WHERE code = ?').get(CODE).n === 0, r);

const UP = { Upgrade: 'websocket', Cookie: 'session=secret', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' };
const live = (env, user, code, device, headers) => call(liveR, 'onRequestGet', env, user, 'GET', `/api/live/${code}?device=${device}`, { code }, undefined, headers);
LIVE.calls.length = 0; LIVE_DOC.calls.length = 0;
r = await live(ENV, BO, CODE, DEV_B, { ...UP, [P.TICKET_HEADER]: '{"forged":true}' });
const fwd = LIVE_DOC.calls[0]?.req;
const t = fwd ? P.decodeDocTicket(fwd.headers.get(P.TICKET_HEADER)) : null;
check('route: a code session\'s upgrade goes to LIVE_DOC, never LIVE', LIVE_DOC.calls.length === 1 && LIVE.calls.length === 0, [LIVE_DOC.calls.length, LIVE.calls.length]);
check('route: with a DocTicket from D1 (seat, account, host, language, room key)', t && t.seat === 1 && t.email === 'bo@s.test' && t.host === 'ann@s.test' && t.hostName === 'Ann L.' && t.lang === 'moshion' && t.roomKey === LIVE_DOC.calls[0].id.slice(3), t);
check('route: the cookie is not passed on', fwd && !fwd.headers.get('Cookie'));
LIVE.calls.length = 0; LIVE_DOC.calls.length = 0;
r = await live(ENV, ANN, GAME, DEV_A, UP);
check('route: a game room\'s upgrade goes to LIVE, never LIVE_DOC (unchanged)', LIVE.calls.length === 1 && LIVE_DOC.calls.length === 0 && P.decodeTicket(LIVE.calls[0].req.headers.get(P.TICKET_HEADER))?.seat === 0);
r = await live({ DB: db, LIVE }, BO, CODE, DEV_B, UP);
check('route: no LIVE_DOC binding -> 503 for a code session', r.status === 503 && r.body.offline === true && /Code together/.test(r.body.error), r);
r = await live({ DB: db, LIVE_DOC }, ANN, GAME, DEV_A, UP);
check('route: no LIVE binding -> 503 for a game room', r.status === 503, r);
r = await live(ENV, BO, CODE, DEV_B);
check('route: without Upgrade it answers the check with the kind', r.status === 200 && r.body.kind === 'code', r);
r = await live(ENV, DEE, CODE, DEV_A, UP);
check('route: a stranger -> 404', r.status === 404, r);

LIVE.calls.length = 0; LIVE_DOC.calls.length = 0;
r = await call(leaveR, 'onRequestPost', ENV, BO, 'POST', `/api/rooms/${CODE}/leave`, { code: CODE }, { device: DEV_B });
const ctl1 = LIVE_DOC.calls[0]?.req.headers.get(P.CONTROL_HEADER);
check('leave: a joiner leaving drops its seat in LiveDoc', ctl1 && JSON.parse(ctl1).op === 'leave' && JSON.parse(ctl1).seat === 1 && LIVE.calls.length === 0, ctl1);
r = await call(leaveR, 'onRequestPost', ENV, ANN, 'POST', `/api/rooms/${CODE}/leave`, { code: CODE }, { device: DEV_A });
const ctl2 = LIVE_DOC.calls.at(-1)?.req.headers.get(P.CONTROL_HEADER);
check('leave: the host leaving tells LiveDoc to close', ctl2 && JSON.parse(ctl2).op === 'close' && LIVE.calls.length === 0, ctl2);

// code_sessions: the ONE write, and the teacher route.
const row = (id, host, people, text, at, closed = null) => ({ id, code: id.split('-')[0], host_email: host, kind: 'js', participants: JSON.stringify(people), text, started_at: at - 1000, updated_at: at, closed_at: closed });
const T0 = Date.now();
await D.writeCodeSession(db, row('ABCD-1', 'ann@s.test', ['ann@s.test', 'bo@s.test'], 'v1', T0 - 5000), T0);
await D.writeCodeSession(db, row('ABCD-1', 'ann@s.test', ['ann@s.test', 'bo@s.test'], 'v2', T0 - 4000, T0 - 4000), T0);
await D.writeCodeSession(db, row('ABCD-1', 'ann@s.test', ['ann@s.test', 'bo@s.test'], 'v3', T0 - 3000, null), T0);
let got = db.sqlite.prepare('SELECT * FROM code_sessions WHERE id = ?').get('ABCD-1');
check('write: an upsert keeps the latest text', got.text === 'v3' && got.updated_at === T0 - 3000, got);
check('write: a closed_at, once written, stays', got.closed_at === T0 - 4000, got);
await D.writeCodeSession(db, row('EFGH-2', 'dee@s.test', ['dee@s.test'], 'other class', T0 - 2000), T0);
await D.writeCodeSession(db, row('JKMN-3', 'dee@s.test', ['dee@s.test', 'bo@s.test'], 'with Bo', T0 - 1000), T0);
await D.writeCodeSession(db, row('PQRS-4', 'ann@s.test', ['ann@s.test'], 'old', T0 - D.KEEP_SESSIONS_MS - 10), T0 - D.KEEP_SESSIONS_MS);
check('write: an old session is there until the next write', !!db.sqlite.prepare('SELECT 1 FROM code_sessions WHERE id = ?').get('PQRS-4'));
await D.writeCodeSession(db, row('ABCD-1', 'ann@s.test', ['ann@s.test', 'bo@s.test'], 'v3', T0 - 3000), T0);
check('write: sessions older than 30 days are deleted on the next write', !db.sqlite.prepare('SELECT 1 FROM code_sessions WHERE id = ?').get('PQRS-4'));

const sess = (user, cls, q = '') => call(sessionsR, 'onRequestGet', { DB: db }, user, 'GET', `/api/classes/${cls}/code-sessions${q}`, { id: cls });
r = await sess(S('teach@s.test', 'teacher'), 'c1');
check('teacher: the owner sees the class\'s sessions, newest first', r.status === 200 && r.body.sessions.map((s) => s.id).join() === 'JKMN-3,ABCD-1', r.body);
check('teacher: a session counts when a participant is in the class (Bo joined Dee)', r.body.sessions[0].host === 'Dee Fox' && r.body.sessions[0].people.includes('Bo Ng'), r.body.sessions[0]);
check('teacher: the list carries names and sizes, not the text', r.body.sessions[1].people.join() === 'Ann Lee,Bo Ng' && r.body.sessions[1].chars === 2 && !('text' in r.body.sessions[1]) && !JSON.stringify(r.body).includes('@'), r.body.sessions[1]);
r = await sess(S('teach@s.test', 'teacher'), 'c1', '?id=ABCD-1');
check('teacher: one session with its text', r.status === 200 && r.body.session.text === 'v3' && r.body.session.closedAt === T0 - 4000, r.body);
r = await sess(S('teach@s.test', 'teacher'), 'c1', '?id=EFGH-2');
check('teacher: another class\'s session is not readable from this class', r.status === 404, r);
r = await sess(S('co@s.test', 'teacher'), 'c1');
check('teacher: a co-teacher sees them too', r.status === 200 && r.body.sessions.length === 2);
r = await sess(S('other@s.test', 'teacher'), 'c1');
check('teacher: another class\'s teacher is refused (403)', r.status === 403, r);
r = await sess(ANN, 'c1');
check('student: refused (403), even a participant', r.status === 403, r);
r = await sess(S('boss@s.test', 'admin'), 'c1');
check('admin: allowed', r.status === 200 && r.body.sessions.length === 2);
r = await sess(S('teach@s.test', 'teacher'), 'nope');
check('teacher: an unknown class -> 404', r.status === 404);

// ---- 4. the dev stand-in over real sockets ----
const dev = makeDevLive({ db, identity: (rq) => { const e = rq.headers['x-test-user']; return e ? { email: e, role: 'student' } : null; } });
const DEVENV = { DB: db, LIVE: dev.namespace, LIVE_DOC: dev.docNamespace };
const server = createServer((_q, s) => { s.statusCode = 404; s.end(); });
server.on('upgrade', dev.onUpgrade);
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;
r = await call(create, 'onRequestPost', DEVENV, ANN, 'POST', '/api/rooms', {}, { kind: 'code', game: 'code-js', seats: 2, device: DEV_A });
const DEV_CODE = r.body.code;
await call(joinR, 'onRequestPost', DEVENV, BO, 'POST', `/api/rooms/${DEV_CODE}/join`, { code: DEV_CODE }, { device: DEV_B, kind: 'code' });

function open(email, code, device) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/live/${code}?device=${device}`, { headers: { 'x-test-user': email } });
    const got = [];
    ws.on('message', (d) => got.push(JSON.parse(String(d))));
    const next = (pred, ms = 2000) => new Promise((ok) => {
      const t0 = Date.now();
      const look = () => { const m = got.find(pred); if (m) return ok(m); if (Date.now() - t0 > ms) return ok(null); setTimeout(look, 20); };
      look();
    });
    ws.on('open', () => resolve({ ws, got, next, status: 101 }));
    ws.on('unexpected-response', (_q, res) => resolve({ status: res.statusCode }));
    ws.on('error', () => resolve({ status: 0 }));
  });
}
const A = await open('ann@s.test', DEV_CODE, DEV_A);
const B = await open('bo@s.test', DEV_CODE, DEV_B);
check('dev: both open (101) on the LiveDoc stand-in', A.status === 101 && B.status === 101, [A.status, B.status]);
const hA = await A.next((m) => m.t === 'hello');
check('dev: hello with version 0 and the room\'s client id', hA?.version === 0 && hA.clientID === 's0' && hA.seat === 0, hA);
A.ws.send(JSON.stringify({ t: 'seed', doc: 'console.log(1);\n' }));
const upB = await B.next((m) => m.t === 'updates' && m.updates.length === 1);
check('dev: the seed reaches the joiner as update 1', upB?.version === 0 && upB.updates[0].seat === 0, upB);
B.ws.send(JSON.stringify({ t: 'push', version: 1, updates: [{ changes: [16, [0, 'console.log(2);']] }] }));
const upA = await A.next((m) => m.t === 'updates' && m.version === 1);
check('dev: a push from the joiner reaches the host, stamped with seat 1', upA?.updates[0].seat === 1 && upA.updates[0].clientID === 's1', upA);
B.ws.send(JSON.stringify({ t: 'cursor', anchor: 2, head: 2 }));
const cA = await A.next((m) => m.t === 'cursor');
check('dev: a cursor reaches the host', cA?.seat === 1 && cA.head === 2, cA);
const C = await open('dee@s.test', DEV_CODE, DEV_A);
check('dev: a stranger is refused at the upgrade (404)', C.status === 404, C.status);
await new Promise((ok) => setTimeout(ok, 50));
const closedB = new Promise((ok) => B.ws.on('close', (code) => ok(code)));
await call(leaveR, 'onRequestPost', DEVENV, ANN, 'POST', `/api/rooms/${DEV_CODE}/leave`, { code: DEV_CODE }, { device: DEV_A });
const bCode = await Promise.race([closedB, new Promise((ok) => setTimeout(() => ok('timeout'), 2000))]);
check('dev: the host leaving closes the joiner with the closed code', bCode === P.LIVE_CLOSED, bCode);
check('dev: ...told who ended it', B.got.some((m) => m.t === 'closed' && m.why === 'host' && /Ann L\./.test(m.reason)));
const kept = db.sqlite.prepare("SELECT * FROM code_sessions WHERE code = ? ORDER BY updated_at DESC").get(DEV_CODE);
check('dev: the stand-in kept the program for teachers, closed', kept && kept.text === 'console.log(1);\nconsole.log(2);' && kept.closed_at !== null && kept.kind === 'js', kept);
const late = await open('bo@s.test', DEV_CODE, DEV_B);
check('dev: a closed session refuses (410)', late.status === 410, late.status);
for (const x of [A, B]) try { x.ws.terminate(); } catch { /* gone */ }
dev.close();
server.close();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
