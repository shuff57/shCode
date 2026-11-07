#!/usr/bin/env node
// Tests the online game rooms (functions/api/rooms/*, migration 0041) on a
// real SQLite with every migration. What has to hold:
//   1. classmates only: hosting needs a live class; joining needs a class in
//      common with the host (enrolled or teaching it); an expired enrollment
//      or an archived class does not count; a stranger gets the same 404 as a
//      code that does not exist;
//   2. game data only: numbers, booleans, short words, 1 KB; nothing that
//      could carry a sentence;
//   3. seats: rejoin keeps your seat, a full room refuses, the host leaving
//      closes the room;
//   4. polling returns moves in order after a seq, names as first name +
//      last initial and never an email; only players can read a room;
//   5. a player is rate limited.
//
// Run: node scripts/test-rooms.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'rooms-test');
const create = compileHandler('api/rooms/index.ts', join(out, 'create'));
const joinR = compileHandler('api/rooms/[code]/join.ts', join(out, 'join'));
const sendR = compileHandler('api/rooms/[code]/send.ts', join(out, 'send'));
const pollR = compileHandler('api/rooms/[code]/index.ts', join(out, 'poll'));
const leaveR = compileHandler('api/rooms/[code]/leave.ts', join(out, 'leave'));
const shared = await import(join(root, 'functions/_shared/rooms.ts'));

const db = makeD1();
const env = { DB: db };
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const FUTURE = 4102444800000;
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c1', 'P1', 'AAAAAA', 'teach@s.test', '2026-2027', 0)`);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c2', 'P2', 'BBBBBB', 'other@s.test', '2026-2027', 0)`);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at, archived_at) VALUES ('c3', 'Old', 'CCCCCC', 'teach@s.test', '2025-2026', 0, 1)`);
const student = (email, first, last) => sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', 0, 'student', ?, ?)`, email, first, last);
const enrol = (cls, email, exp = FUTURE) => sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, 0, ?)`, cls, email, exp);
student('ann@s.test', 'Ann', 'Lee'); enrol('c1', 'ann@s.test');
student('bo@s.test', 'Bo', 'Ng'); enrol('c1', 'bo@s.test');
student('cy@s.test', 'Cy', 'Ray'); enrol('c1', 'cy@s.test');
student('dee@s.test', 'Dee', 'Fox'); enrol('c2', 'dee@s.test');          // another class
student('eve@s.test', 'Eve', 'Hart'); enrol('c1', 'eve@s.test', 1000);   // expired
student('fay@s.test', 'Fay', 'Kim'); enrol('c3', 'fay@s.test');          // archived class
student('gus@s.test', 'Gus', 'Orr');                                     // no class
const S = (email) => ({ email, role: 'student' });
const ANN = S('ann@s.test'), BO = S('bo@s.test'), CY = S('cy@s.test'), DEE = S('dee@s.test'), EVE = S('eve@s.test'), FAY = S('fay@s.test'), GUS = S('gus@s.test');
const TEACH = { email: 'teach@s.test', role: 'teacher' };

const req = (method, path, body) => new Request(`https://x.test${path}`, { method, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)), headers: { 'Content-Type': 'application/json' } });
async function call(h, fn, user, method, path, params, body) {
  const res = await h[fn]({ env, data: user, params: params ?? {}, request: req(method, path, body) });
  return { status: res.status, body: await res.json() };
}
const host = (u, body = { game: 'race', seats: 2 }) => call(create, 'onRequestPost', u, 'POST', '/api/rooms', {}, body);
const joinRoom = (u, code) => call(joinR, 'onRequestPost', u, 'POST', `/api/rooms/${code}/join`, { code });
const send = (u, code, data, raw) => call(sendR, 'onRequestPost', u, 'POST', `/api/rooms/${code}/send`, { code }, raw ?? { data });
const poll = (u, code, after = 0) => call(pollR, 'onRequestGet', u, 'GET', `/api/rooms/${code}?after=${after}`, { code });
const leave = (u, code) => call(leaveR, 'onRequestPost', u, 'POST', `/api/rooms/${code}/leave`, { code });

// ---- checkGameData ----
const ok = (v) => shared.checkGameData(v) === null;
check('data: move object', ok({ from: 12, to: 15, king: false, who: 'red' }));
check('data: list of numbers', ok([1, 2, 3, [4, 5]]));
check('data: null / number / short word', ok(null) && ok(3.5) && ok('roll'));
check('data: 21-letter word refused', !ok('a'.repeat(21)));
check('data: a phrase with spaces refused', !ok('meet me at lunch ok'));
check('data: words spread over a list refused (24-letter total)', !ok({ say: ['this', 'is', 'a', 'long', 'chat', 'message', 'sent', 'as', 'a', 'list', 'of', 'words'] }));
check('data: three short labels fine', ok({ who: 'red', what: 'roll', state: 'moving' }));
check('data: sentence in a list refused', !ok(['hello', 'there is a long sentence']));
check('data: odd key refused', !ok({ 'my message': 1 }));
check('data: Infinity refused', !ok(Infinity));
check('data: too deep refused', !ok([[[[[1]]]]]));
check('data: 65 items refused', !ok(new Array(65).fill(0)));
check('data: over 1 KB refused', !ok(Array.from({ length: 60 }, () => 'abcdefghijklmnopqrst')));
check('code: normalise typed code', shared.normalizeCode(' abc-23x ') === 'ABC23X' && shared.normalizeCode('ABC1IO') === null);

// ---- hosting ----
let r = await host(GUS);
check('no class: cannot host', r.status === 403, r);
r = await host(ANN, { game: 'Race Game!', seats: 2 });
check('bad game name 400', r.status === 400, r);
r = await host(ANN, { game: 'race', seats: 9 });
check('9 seats 400', r.status === 400, r);
r = await host(ANN);
check('host', r.status === 201 && shared.CODE_RE.test(r.body.code) && r.body.seat === 0, r);
const code = r.body.code;

// ---- joining ----
r = await joinRoom(DEE, code);
check('other class: 404', r.status === 404, r);
r = await joinRoom(DEE, 'ZZZZZZ');
check('no such room: same 404', r.status === 404, r);
r = await joinRoom(EVE, code);
check('expired enrollment: 404', r.status === 404, r);
r = await joinRoom(FAY, code);
check('archived class: 404', r.status === 404, r);
r = await poll(DEE, code);
check('stranger cannot poll', r.status === 404, r);
r = await joinRoom(BO, code.toLowerCase());
check('classmate joins (lowercase code ok)', r.status === 200 && r.body.seat === 1, r);
r = await joinRoom(BO, code);
check('rejoin keeps the seat', r.status === 200 && r.body.seat === 1, r);
r = await joinRoom(CY, code);
check('full room 409', r.status === 409, r);

// ---- moves ----
r = await send(CY, code, { roll: 3 });
check('non-player cannot send', r.status === 404, r);
r = await send(ANN, code, { roll: 'this is a whole sentence of chat' });
check('long word refused 400 with a reason', r.status === 400 && /spaces|20 letters/.test(r.body.error), r);
r = await send(ANN, code, null, '{"nodata":1}');
check('missing data 400', r.status === 400, r);
r = await send(ANN, code, { roll: 4, to: 4 });
check('host sends', r.status === 200 && r.body.seq === 1, r);
r = await send(BO, code, { roll: 2, to: 2 });
check('guest sends', r.status === 200 && r.body.seq === 2, r);
r = await poll(BO, code, 0);
check('poll: ready, two moves in order', r.status === 200 && r.body.state === 'ready' && r.body.events.map((e) => e.seq).join() === '1,2' && r.body.events[0].seat === 0 && r.body.events[0].data.roll === 4, r);
check('poll: names, never emails', JSON.stringify(r.body.players) === JSON.stringify([{ seat: 0, name: 'Ann L.', left: false }, { seat: 1, name: 'Bo N.', left: false }]) && !JSON.stringify(r.body).includes('@'), r.body.players);
check('poll: mySeat', r.body.mySeat === 1);
r = await poll(ANN, code, 1);
check('poll after 1 -> only seq 2', r.body.events.length === 1 && r.body.events[0].seq === 2, r);

// ---- teacher of the class may join a student's room ----
r = await host(CY);
const code2 = r.body.code;
r = await joinRoom(TEACH, code2);
check('teacher of the class joins', r.status === 200 && r.body.seat === 1, r);

// ---- rate limit ----
let last;
for (let i = 0; i < 31; i++) last = await send(ANN, code, { n: i });
check('31st move in 10 s is 429', last.status === 429, last);

// ---- leaving ----
r = await leave(BO, code);
check('guest leaves', r.status === 200 && r.body.left === true, r);
r = await poll(ANN, code, 0);
check('others see them gone, room waiting', r.body.players[1].left === true && r.body.state === 'waiting', r.body);
r = await joinRoom(BO, code);
check('rejoin after leaving gets the seat back', r.status === 200 && r.body.seat === 1, r);
r = await leave(ANN, code);
r = await poll(BO, code, 0);
check('host leaving closes the room', r.body.state === 'closed', r.body);
r = await send(BO, code, { n: 1 });
check('closed room refuses moves 410', r.status === 410, r);
r = await joinRoom(CY, code);
check('closed room refuses joins 410', r.status === 410, r);

// ---- one student, two tabs (a seat is an account in a tab) ----
{
  const tabA = 'aaaaaaaa1111', tabB = 'bbbbbbbb2222';
  const hostT = (u, dev) => call(create, 'onRequestPost', u, 'POST', '/api/rooms', {}, { game: 'race', seats: 2, device: dev });
  const joinT = (u, c, dev) => call(joinR, 'onRequestPost', u, 'POST', `/api/rooms/${c}/join`, { code: c }, { device: dev });
  const sendT = (u, c, dev, d) => call(sendR, 'onRequestPost', u, 'POST', `/api/rooms/${c}/send`, { code: c }, { data: d, device: dev });
  const pollT = (u, c, dev) => call(pollR, 'onRequestGet', u, 'GET', `/api/rooms/${c}?after=0&device=${dev}`, { code: c });
  let t = await hostT(CY, tabA);
  const c3 = t.body.code;
  t = await joinT(CY, c3, tabA);
  check('same tab rejoins its own seat 0', t.status === 200 && t.body.seat === 0, t);
  t = await joinT(CY, c3, tabB);
  check('second tab of the same account takes seat 1', t.status === 200 && t.body.seat === 1, t);
  t = await sendT(CY, c3, tabB, { n: 7 });
  check('second tab sends as seat 1', t.status === 200, t);
  t = await pollT(CY, c3, tabA);
  check('first tab sees seat 1 move, room ready', t.body.state === 'ready' && t.body.mySeat === 0 && t.body.events[0].seat === 1, t.body);
  t = await sendT(BO, c3, tabB, { n: 1 });
  check("a classmate cannot send as someone else's tab", t.status === 404, t);
  t = await call(leaveR, 'onRequestPost', CY, 'POST', `/api/rooms/${c3}/leave`, { code: c3 }, { device: tabB });
  t = await pollT(CY, c3, tabA);
  check('guest tab leaving does not close the room', t.body.state === 'waiting', t.body);
  t = await call(leaveR, 'onRequestPost', CY, 'POST', `/api/rooms/${c3}/leave`, { code: c3 }, { device: tabA });
  t = await pollT(CY, c3, tabA);
  check('host tab leaving closes it', t.body.state === 'closed', t.body);
}

// ---- open-room cap and sweep ----
for (let i = 0; i < 4; i++) await host(BO);
const openRooms = db.sqlite.prepare(`SELECT COUNT(*) AS n FROM game_rooms WHERE host_email = 'bo@s.test' AND closed_at IS NULL`).get().n;
check('at most 3 open rooms per host', openRooms === 3, openRooms);
sql(`UPDATE game_rooms SET expires_at = 1 WHERE code = ?`, code2);
await host(BO);
const gone = db.sqlite.prepare(`SELECT COUNT(*) AS n FROM game_room_players WHERE code = ?`).get(code2).n;
check('long-expired room swept with its players', gone === 0 && !db.sqlite.prepare('SELECT 1 FROM game_rooms WHERE code = ?').get(code2));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
