#!/usr/bin/env node
// "Watch live" (migration 0054): a read-only seat in a Code together session. What has to hold:
//   1. a watch ticket round-trips; its seat is WATCH_SEAT_BASE and up, so a decoder from before watching
//      (one that ignores `watch`) refuses it: an old Worker can never take a watcher for an editor;
//   2. LiveDocCore: the watcher gets the program and every change as it is typed; its edits and a seed
//      are refused and it is put back to the room's text; its cursor is never relayed; the people coding
//      see it listed as watching; it is not written down as one of the program's writers;
//   3. GET /api/live/[code]?watch=1 lets in someone a message invited to watch THIS session (a message a
//      teacher has not removed), and a teacher of the class; not an uninvited classmate, not a teacher of
//      another class, not an invitation to a different session; a closed session is 410.

import { join } from 'node:path';
import { EditorState, Transaction } from '@codemirror/state';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

const P = await import(join(root, 'lib/live-protocol.ts'));
const D = await import(join(root, 'lib/live-doc-protocol.ts'));
const { DocSync } = await import(join(root, 'lib/live-doc.ts'));

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`); }
}

// ---- 1. tickets ----
const EXP = Date.now() + 3_600_000;
const ticket = (o = {}) => ({
  kind: 'code', code: 'BHKE', seat: 0, seats: 2, name: 'Ann L.', expiresAt: EXP,
  email: 'ann@s.test', host: 'ann@s.test', hostName: 'Ann L.', lang: 'moshion', roomKey: 'BHKE-1000', startedAt: 1000, ...o,
});
const wseat = P.watchSeatOf('cy@s.test', 'tab1');
const wt = ticket({ seat: wseat, email: 'cy@s.test', name: 'Cy R.', watch: true });
const back = P.decodeDocTicket(P.encodeDocTicket(wt));
check('ticket: a watch ticket round-trips, watch and all', back && back.watch === true && back.seat === wseat && back.email === 'cy@s.test');
check('ticket: a watcher\'s seat is fixed per account and tab, and outside every room\'s seats',
  P.watchSeatOf('cy@s.test', 'tab1') === wseat && P.watchSeatOf('cy@s.test', 'tab2') !== wseat && wseat >= P.WATCH_SEAT_BASE && P.isWatchSeat(wseat));
const { watch: _w, ...stripped } = JSON.parse(P.encodeDocTicket(wt));
check('ticket: read by a decoder that ignores `watch` (an old Worker), it is refused', P.decodeDocTicket(JSON.stringify(stripped)) === null);
check('ticket: watch with an editor\'s seat is refused', P.decodeDocTicket(JSON.stringify(ticket({ watch: true, seat: 1 }))) === null);
check('ticket: watch must be exactly true', P.decodeDocTicket(JSON.stringify(ticket({ watch: 'yes' }))) === null && P.decodeDocTicket(JSON.stringify(ticket({ watch: false }))) === null);
check('ticket: an editor ticket is unchanged (no watch field)', !('watch' in P.decodeDocTicket(P.encodeDocTicket(ticket()))));

// ---- 2. the room ----
let clock = 1_000_000;
const now = () => clock;
const socks = new Set();
const rows = [];
const core = new D.LiveDocCore({
  sockets: () => [...socks], store: D.memoryDocStore(), now,
  timer: { set: () => 0, clear: () => {} },
  write: async (row) => { rows.push(row); },
  schedule: () => {},
  closeRow: async () => {},
});
function client(t, own = '') {
  const c = { inbox: [], outbox: [] };
  let att = null;
  c.sock = { send: (x) => c.inbox.push(JSON.parse(x)), close: () => socks.delete(c.sock), attachment: () => att, attach: (a) => { att = a; } };
  c.sync = new DocSync({ send: (m) => { c.outbox.push(JSON.stringify(m)); return true; }, now, onRewound: () => {}, wantCursor: () => {} });
  c.ed = {
    state: EditorState.create({ doc: own, extensions: [c.sync.inner.of([])] }),
    dispatch(...specs) { const tr = specs[0] instanceof Transaction ? specs[0] : this.state.update(...specs); this.state = tr.state; },
  };
  c.sync.attach(c.ed);
  c.text = () => c.ed.state.doc.toString();
  c.seeded = false;
  c.pump = () => {
    let moved = false;
    while (c.inbox.length) {
      const m = c.inbox.shift(); moved = true;
      if (m.t === 'hello') { c.sync.hello(m, c.seeded || !c.seed ? null : c.seed()); c.seeded = true; c.hello = m; }
      else if (m.t === 'updates') c.sync.updates(m);
      else if (m.t === 'reset') c.sync.reset(m);
      else (c.other ??= []).push(m);
    }
    while (c.outbox.length) { core.message(c.sock, c.outbox.shift()); moved = true; }
    return moved;
  };
  socks.add(c.sock);
  core.accept(c.sock, t);
  return c;
}
const settle = (...cs) => { for (let i = 0; i < 200; i++) if (!cs.map((c) => c.pump()).some(Boolean)) return; };

const host2 = client(ticket(), 'let a = 1;\n');
host2.seed = () => 'let a = 1;\n';
settle(host2);
const watcher = client(wt, '');
settle(host2, watcher);
check('room: the watcher is told it is watching, and gets the program', watcher.hello?.watch === true && watcher.text() === host2.text() && host2.text() === 'let a = 1;\n', [watcher.text(), host2.text()]);
host2.ed.dispatch(host2.ed.state.update({ changes: { from: host2.text().length, insert: 'let b = 2;\n' } }));
host2.sync.push();
settle(host2, watcher);
check('room: what the coder types reaches the watcher', watcher.text() === 'let a = 1;\nlet b = 2;\n', watcher.text());
const before = host2.text();
watcher.ed.dispatch(watcher.ed.state.update({ changes: { from: 0, insert: '// hacked\n' } }));
watcher.sync.push();
settle(host2, watcher);
check('room: a watcher\'s edit is refused in plain words', (watcher.other ?? []).some((m) => m.t === 'error' && m.error === D.WATCH_ONLY));
check('room: ...the program is unchanged for the coder, and the watcher is put back to it', host2.text() === before && watcher.text() === before, [host2.text(), watcher.text()]);
core.message(watcher.sock, JSON.stringify({ t: 'seed', doc: 'x' }));
settle(host2, watcher);
check('room: a watcher cannot seed the program', host2.text() === before);
host2.other = [];
core.message(watcher.sock, JSON.stringify({ t: 'cursor', anchor: 1, head: 1, version: 0 }));
settle(host2, watcher);
check('room: a watcher\'s cursor is never relayed', !(host2.other ?? []).some((m) => m.t === 'cursor'));
const ps = core.players();
check('room: the coders see the watcher listed as watching', ps.some((p) => p.seat === wseat && p.watching === true && p.name === 'Cy R.') && ps.some((p) => p.seat === 0 && !p.watching), ps);
check('room: no email reaches a socket', ![...host2.inbox, ...(host2.other ?? []), ...(watcher.other ?? [])].some((m) => JSON.stringify(m).includes('@')) && !JSON.stringify(watcher.hello).includes('@'));
await core.persistNow?.();
core.left?.(host2.sock);
await new Promise((r) => setTimeout(r, 10));
const last = rows.at(-1);
check('room: the watcher is not written down as a writer of the program', last ? !JSON.parse(last.participants ?? '[]').includes('cy@s.test') : true, last);

// ---- 3. who may watch ----
const out = join(root, '.tmp', 'live-watch-test');
const liveR = compileHandler('api/live/[code].ts', join(out, 'live'));
const db = makeD1();
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const FAR = 4102444800000;
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c1', 'P1', 'AAAAAA', 'teach@s.test', '2026-2027', 0)`);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c2', 'P2', 'BBBBBB', 'other@s.test', '2026-2027', 0)`);
for (const [e, f, l, c] of [['ann@s.test', 'Ann', 'Lee', 'c1'], ['bo@s.test', 'Bo', 'Ng', 'c1'], ['cy@s.test', 'Cy', 'Ray', 'c1'], ['dee@s.test', 'Dee', 'Fox', 'c2']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', 0, 'student', ?, ?)`, e, f, l);
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)`, c, e, FAR);
}
const T0 = Date.now();
const room = (code, created, closed = null) => {
  sql(`INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at, closed_at, live, kind) VALUES (?, 'code-moshion', 'ann@s.test', 2, ?, ?, ?, 1, 'code')`, code, created, T0 + 3_600_000, closed);
  sql(`INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES (?, 0, 'ann@s.test', 'd0', ?)`, code, created);
};
room('BHKE', T0 - 1000);
room('CDFG', T0 - 2000);
// Ann invites Cy to watch BHKE, and Bo to watch CDFG.
const invite = (thread, to, code, created, msgId, kind = 'watch') => {
  sql(`INSERT OR IGNORE INTO message_threads (id, class_id, pair_key, kind, created_by, created_at, last_at) VALUES (?, 'c1', ?, 'students', 'ann@s.test', ?, ?)`, thread, `c1|ann|${to}`, T0, T0);
  sql(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, 'ann@s.test', 'Ann L.', 0, 0)`, thread);
  sql(`INSERT OR IGNORE INTO message_members (thread_id, email, name, teacher, read_at) VALUES (?, ?, 'x', 0, 0)`, thread, to);
  sql(`INSERT INTO messages (id, thread_id, author_email, body, created_at) VALUES (?, ?, 'ann@s.test', '', ?)`, msgId, thread, T0);
  sql(`INSERT INTO message_shares (id, message_id, thread_id, author_email, kind, lang, title, room_code, room_created_at, created_at) VALUES (?, ?, ?, 'ann@s.test', ?, 'moshion', 'Maze', ?, ?, ?)`,
    'sh' + msgId, msgId, thread, kind, code, created, T0);
};
invite('t'.repeat(32), 'cy@s.test', 'BHKE', T0 - 1000, 'm1');
invite('u'.repeat(32), 'bo@s.test', 'CDFG', T0 - 2000, 'm2');

const ns = { calls: [], idFromName: (n) => `id:${n}`, get: (id) => ({ fetch: async (r) => { ns.calls.push({ id, req: r }); return new Response('{}'); } }) };
const ENV = { DB: db, LIVE: ns, LIVE_DOC: ns };
const UP = { Upgrade: 'websocket', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' };
async function watch(user, code, headers = UP, q = '&watch=1') {
  ns.calls.length = 0;
  const res = await liveR.onRequestGet({ env: ENV, data: user, params: { code }, request: new Request(`https://shcode.test/api/live/${code}?device=tabZ${q}`, { headers }) });
  let body = null; try { body = await res.json(); } catch { /* upgrade */ }
  return { status: res.status, body, t: ns.calls[0] ? P.decodeDocTicket(ns.calls[0].req.headers.get(P.TICKET_HEADER)) : null };
}
const S = (email, role = 'student') => ({ email, role });
let r = await watch(S('cy@s.test'), 'BHKE');
check('route: the classmate invited to watch this session gets a watch ticket', r.t?.watch === true && P.isWatchSeat(r.t.seat) && r.t.name === 'Cy R.' && r.t.email === 'cy@s.test', r);
check('route: ...with no seat taken in D1', db.sqlite.prepare(`SELECT COUNT(*) AS n FROM game_room_players WHERE code = 'BHKE'`).get().n === 1);
r = await watch(S('cy@s.test'), 'BHKE', {});
check('route: the check without Upgrade says yes', r.status === 200 && r.body.ok === true);
r = await watch(S('cy@s.test'), 'BHKE', UP, '');
check('route: without watch=1 the invited watcher is not an editor (no seat)', r.status === 404 && !r.t);
r = await watch(S('bo@s.test'), 'BHKE');
check('route: a classmate invited to a DIFFERENT session cannot watch this one', r.status === 404 && !r.t, r.body);
r = await watch(S('bo@s.test'), 'CDFG');
check('route: ...but can watch the one they were invited to', r.t?.watch === true);
r = await watch(S('teach@s.test', 'teacher'), 'BHKE');
check('route: a teacher of the class can watch any of its sessions', r.t?.watch === true);
r = await watch(S('other@s.test', 'teacher'), 'BHKE');
check('route: a teacher of another class cannot', r.status === 404);
r = await watch(S('dee@s.test'), 'BHKE');
check('route: a student of another class cannot', r.status === 404);
sql(`UPDATE messages SET deleted_at = ? WHERE id = 'm1'`, T0);
r = await watch(S('cy@s.test'), 'BHKE');
check('route: once a teacher removed the invitation, it no longer lets them in', r.status === 404);
sql(`UPDATE messages SET deleted_at = NULL WHERE id = 'm1'`);
sql(`UPDATE game_rooms SET closed_at = ? WHERE code = 'BHKE'`, T0);
r = await watch(S('cy@s.test'), 'BHKE');
check('route: a closed session is 410', r.status === 410);
sql(`DELETE FROM game_room_players WHERE code = 'BHKE'`);
sql(`DELETE FROM game_rooms WHERE code = 'BHKE'`);
room('BHKE', T0);
r = await watch(S('cy@s.test'), 'BHKE');
check('route: the same code used again for a new session is not covered by the old invitation', r.status === 404);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
