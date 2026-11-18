#!/usr/bin/env node
// Code together's pictures and sounds (POST /api/rooms/[code]/assets) on a real SQLite with every migration applied.
// What has to hold:
//   1. a seated person gets the OTHER seated people's live items the program uses, shared with a class or not
//      (owner's decision 2026-11-17), and never their own;
//   2. an item the program does not name, a deleted item, and the items of someone who left are not sent;
//   3. a person not seated now (never joined, or left), a game room, a closed room and an unknown code all get 404;
//   4. two people with an item of the same name: the lower seat's (the host's) is sent;
//   5. a program over twice the room's cap is refused; no answer carries an email.
// And a moSHion program sent in a message (POST /api/shares/[id]/assets):
//   6. whoever may open the share gets the sender's used items, shared or not; anyone else 404; the sender nothing;
//   7. a copy uses the code stored with it, never the request's; a watch uses the request's text, only while that
//      very session is open, and only the sender's items; a JavaScript program gets nothing.
// Run: node --import ./scripts/register-ts.mjs scripts/test-session-assets.mjs

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}

const out = join(root, '.tmp', 'session-assets-test');
const fn = compileHandler('api/rooms/[code]/assets.ts', join(out, 'a')).onRequestPost;
const shareAssets = compileHandler('api/shares/[id]/assets.ts', join(out, 'b')).onRequestPost;
const inbox = compileHandler('api/messages/index.ts', join(out, 'c'));

const db = makeD1();
const r2 = new Map();
const env = { DB: db, UPLOADS: { async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; } } };
const now = Date.now();
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const e of ['host@s.test', 'joe@s.test', 'kim@s.test', 'gone@s.test', 'out@s.test']) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', 'A', 'B')`, e, now);
}
const room = (code, kind, host, { closed = null, expires = now + 3600e3 } = {}) =>
  sql(`INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at, closed_at, live, kind) VALUES (?, ?, ?, 4, ?, ?, ?, 1, ?)`,
    code, kind === 'code' ? 'code-moshion' : 'pong', host, now, expires, closed, kind);
const seat = (code, n, email, left = null) =>
  sql(`INSERT INTO game_room_players (code, seat, email, device, joined_at, left_at) VALUES (?, ?, ?, ?, ?, ?)`, code, n, email, 'd' + n, now, left);
room('BHKE', 'code', 'host@s.test');
seat('BHKE', 0, 'host@s.test'); seat('BHKE', 1, 'joe@s.test'); seat('BHKE', 2, 'kim@s.test'); seat('BHKE', 3, 'gone@s.test', now);
room('GAME', 'game', 'host@s.test'); seat('GAME', 0, 'host@s.test'); seat('GAME', 1, 'joe@s.test');
room('SHUT', 'code', 'host@s.test', { closed: now }); seat('SHUT', 0, 'host@s.test'); seat('SHUT', 1, 'joe@s.test');

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
let n = 0;
function item(owner, kind, name, { deleted = false, shareIn = null } = {}) {
  const id = (++n).toString(16).padStart(32, '0');
  sql(`INSERT INTO library_items (id, owner_email, kind, name, bytes, mime, meta, hash, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL, 'h', ?, ?)`,
    id, owner, kind, name, PNG.length, kind === 'texture' ? 'image/png' : 'audio/wav', now, deleted ? now : null);
  r2.set(`library/${id}`, PNG + '#' + owner);
  if (shareIn) sql(`INSERT INTO library_shares (item_id, class_id, shared_at) VALUES (?, ?, ?)`, id, shareIn, now);
}
item('host@s.test', 'texture', 'birb');                       // not shared with any class: still sent
item('host@s.test', 'texture', 'pipe', { shareIn: 'C1' });
item('host@s.test', 'sound', 'jump');
item('host@s.test', 'texture', 'unused');                     // not in the program
item('host@s.test', 'texture', 'old', { deleted: true });
item('host@s.test', 'texture', 'Enemy_Rammer');               // a name put together from pieces
item('kim@s.test', 'texture', 'birb');                        // same name, higher seat: loses to the host's
item('kim@s.test', 'texture', 'kimArt');
item('joe@s.test', 'texture', 'joeArt');
item('gone@s.test', 'texture', 'goneArt');                    // left the session
const PROGRAM = `s.texture = 'birb'; t.texture = 'pipe'; loadSound('jump'); e.texture = 'Enemy_' + kind; const kind = 'Rammer';
u.texture = 'old'; v.texture = 'kimArt'; w.texture = 'joeArt'; x.texture = 'goneArt';`;

async function post(user, code, body) {
  const res = await fn({ env, data: { email: user, role: 'student' }, params: { code },
    request: new Request(`https://x.test/api/rooms/${code}/assets`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });
  const text = await res.text();
  check(`no email in ${user} ${code} ${res.status}`, !/@s\.test/.test(text.replace(/#[a-z]+@s\.test/g, '')));
  return { status: res.status, body: JSON.parse(text) };
}
const names = (r) => (r.body.assets ?? []).map((a) => `${a.kind}:${a.name}`).sort();

{
  const r = await post('joe@s.test', 'BHKE', { code: PROGRAM });
  check('joiner gets the others\' used items, shared or not, never their own, never a left person\'s',
    r.status === 200 && JSON.stringify(names(r)) === JSON.stringify(['sound:jump', 'texture:Enemy_Rammer', 'texture:birb', 'texture:kimArt', 'texture:pipe']), names(r));
  const birb = r.body.assets.find((a) => a.name === 'birb');
  check('same name: the host\'s copy wins over a higher seat\'s', birb?.data.endsWith('#host@s.test'), birb?.data);
}
{
  const r = await post('host@s.test', 'BHKE', { code: PROGRAM });
  check('host gets the joiners\' used items only', JSON.stringify(names(r)) === JSON.stringify(['texture:birb', 'texture:joeArt', 'texture:kimArt']), names(r));
  check('host gets kim\'s birb (no other copy among the others)', r.body.assets.find((a) => a.name === 'birb')?.data.endsWith('#kim@s.test'));
}
check('someone who left gets 404', (await post('gone@s.test', 'BHKE', { code: PROGRAM })).status === 404);
check('someone never seated gets 404', (await post('out@s.test', 'BHKE', { code: PROGRAM })).status === 404);
check('a game room gets 404', (await post('joe@s.test', 'GAME', { code: PROGRAM })).status === 404);
check('a closed session gets 404', (await post('joe@s.test', 'SHUT', { code: PROGRAM })).status === 404);
check('an unknown code gets 404', (await post('joe@s.test', 'ZZZZ', { code: PROGRAM })).status === 404);
check('an empty program gets nothing', (await post('joe@s.test', 'BHKE', { code: '' })).body.assets?.length === 0);
check('a program far over the cap is refused', (await post('joe@s.test', 'BHKE', { code: 'x'.repeat(200 * 1024) })).status === 413);

// ---- a program sent in a message ---------------------------------------------
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES ('t1@s.test', 'x', ?, 'teacher', 'Tess', 'Ward')`, now);
for (const e of ['host@s.test', 'joe@s.test', 'kim@s.test']) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('C1', ?, ?, ?)`, e, now, now + 1e10);
}
sql(`UPDATE students SET first_name = 'Hal', last_name = 'Host' WHERE email = 'host@s.test'`);
sql(`UPDATE students SET first_name = 'Joe', last_name = 'Jay' WHERE email = 'joe@s.test'`);
const as = (email, role = 'student') => ({ email, role });
async function inboxCall(method, user, body) {
  const res = await inbox[method === 'GET' ? 'onRequestGet' : 'onRequestPost']({ env, data: as(user), params: {},
    request: new Request(`https://x.test/api/messages${method === 'GET' ? '?people=1' : ''}`, { method, body: body && JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });
  return res.json();
}
const ppl = await inboxCall('GET', 'host@s.test');
const JOE_KEY = ppl.classes.find((c) => c.id === 'C1').people.find((p) => p.name === 'Joe J.').key;
const SENT = `s.texture = 'birb'; loadSound('jump'); k.texture = 'kimArt';`;
const started = await inboxCall('POST', 'host@s.test', { classId: 'C1', to: JOE_KEY, body: '', share: { kind: 'copy', lang: 'moshion', title: 'Birb', code: SENT } });
const SID = started.messages?.[0]?.share?.id;
check('setup: a copy was sent', /^[0-9a-f]{32}$/.test(SID ?? ''), started);
async function sp(user, id, body = {}, role = 'student') {
  const res = await shareAssets({ env, data: as(user, role), params: { id },
    request: new Request(`https://x.test/api/shares/${id}/assets`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });
  const text = await res.text();
  check(`no email in share ${user} ${res.status}`, !/@s\.test/.test(text.replace(/#[a-z]+@s\.test/g, '')));
  return { status: res.status, body: JSON.parse(text) };
}
{
  const r = await sp('joe@s.test', SID, { code: `x.texture = 'unused'; y.texture = 'pipe';` });
  check('copy: the reader gets the sender\'s used items from the STORED code (request ignored), shared or not',
    r.status === 200 && JSON.stringify(names(r)) === JSON.stringify(['sound:jump', 'texture:birb']), names(r));
  check('copy: someone else\'s item the code names is not sent (kim did not send it)', !names(r).includes('texture:kimArt'));
}
check('copy: the sender gets nothing', (await sp('host@s.test', SID)).body.assets?.length === 0);
check('copy: the class\'s teacher (reads student conversations) gets them too', (await sp('t1@s.test', SID, {}, 'teacher')).body.assets?.length === 2);
check('copy: a classmate outside the conversation gets 404', (await sp('kim@s.test', SID)).status === 404);
check('copy: a bad id gets 404', (await sp('joe@s.test', 'f'.repeat(32))).status === 404);
{
  // A watch share needs an open session the sender holds a seat in; made here directly, beside the copy's message.
  const msg = db.sqlite.prepare(`SELECT message_id, thread_id FROM message_shares WHERE id = ?`).get(SID);
  const created = db.sqlite.prepare(`SELECT created_at FROM game_rooms WHERE code = 'BHKE'`).get().created_at;
  const watch = (id, room, at, lang = 'moshion') => sql(
    `INSERT INTO message_shares (id, message_id, thread_id, author_email, kind, lang, title, code, room_code, room_created_at, created_at) VALUES (?, ?, ?, 'host@s.test', 'watch', ?, 'Birb', NULL, ?, ?, ?)`,
    id, msg.message_id, msg.thread_id, lang, room, at, now);
  watch('a'.repeat(32), 'BHKE', created);
  watch('b'.repeat(32), 'SHUT', db.sqlite.prepare(`SELECT created_at FROM game_rooms WHERE code = 'SHUT'`).get().created_at);
  watch('c'.repeat(32), 'BHKE', created - 1); // the code was reused by a later session
  watch('d'.repeat(32), 'BHKE', created, 'js');
  const r = await sp('joe@s.test', 'a'.repeat(32), { code: `s.texture = 'pipe'; t.texture = 'kimArt';` });
  check('watch: the request\'s text, the sender\'s items only', JSON.stringify(names(r)) === JSON.stringify(['texture:pipe']), names(r));
  check('watch: a closed session gets nothing', (await sp('joe@s.test', 'b'.repeat(32), { code: `s.texture = 'pipe';` })).body.assets?.length === 0);
  check('watch: a reused code (another session) gets nothing', (await sp('joe@s.test', 'c'.repeat(32), { code: `s.texture = 'pipe';` })).body.assets?.length === 0);
  check('a JavaScript program gets nothing', (await sp('joe@s.test', 'd'.repeat(32), { code: `s.texture = 'pipe';` })).body.assets?.length === 0);
  check('watch: a program far over the cap is refused', (await sp('joe@s.test', 'a'.repeat(32), { code: 'x'.repeat(200 * 1024) })).status === 413);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
