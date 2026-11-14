#!/usr/bin/env node
// A sandbox program sent in a message (migration 0054): POST /api/messages and /api/messages/[id] with a
// `share`, GET /api/shares/[id], and the teacher's panel. On a real SQLite with every migration applied.
// What has to hold:
//   1. a copy goes with or without words; the reader's conversation shows its card (no code in it);
//   2. GET /api/shares/[id] gives the code to the two people and, between students, the class's
//      teachers; anyone else (another class's teacher, a student outside it, a bad id) gets the same 404;
//   3. a copy is refused when empty, over 64 KB or holding personal details, and the words and the
//      project name are checked as well; the class switch and a pause still stop it;
//   4. the mailbox list says what was sent when there are no words;
//   5. a teacher removing the message hides the card and the program from the students, not the teacher;
//   6. an invitation to Code together needs a session of that kind the sender is in, open; the card has
//      the session's code only while that same session is open (a closed one, or a reused code, has none);
//   7. deleting the class deletes the programs sent in it.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'message-shares-test');
const inbox = compileHandler('api/messages/index.ts', join(out, 'a'));
const one = compileHandler('api/messages/[id].ts', join(out, 'b'));
const teach = compileHandler('api/classes/[id]/messages.ts', join(out, 'c'));
const shares = compileHandler('api/shares/[id].ts', join(out, 'd'));
const del = compileHandler('api/classes/[id]/delete.ts', join(out, 'e'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cat@s.test', 'Cat', 'Moss', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cat@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };
const ADMIN = { email: 'boss@s.test', role: 'admin' };

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const people = (u) => call(inbox.onRequestGet, u, '/api/messages?people=1');
const list = (u) => call(inbox.onRequestGet, u, '/api/messages');
const start = (u, classId, to, body, share) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId, to, body, share });
const open = (u, id) => call(one.onRequestGet, u, `/api/messages/${id}`, { id });
const reply = (u, id, body, share) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { body, share });
const share = (u, id) => call(shares.onRequestGet, u, `/api/shares/${id}`, { id });
const panelThread = (u, cls, t) => call(teach.onRequestGet, u, `/api/classes/${cls}/messages?thread=${t}`, { id: cls });
const panel = (u, cls) => call(teach.onRequestGet, u, `/api/classes/${cls}/messages`, { id: cls });
const act = (u, cls, body) => call(teach.onRequestPost, u, `/api/classes/${cls}/messages`, { id: cls }, 'POST', body);

const CODE = "let s;\nfunction setup() {\n  new Canvas(400, 400);\n  s = new Sprite(200, 200, 40);\n}\n";
const copy = (code = CODE, title = 'Maze', lang = 'moshion') => ({ kind: 'copy', lang, title, code });

let r = await people(ANA);
const c1 = r.body.classes.find((c) => c.id === 'C1');
const BEN_KEY = c1.people.find((p) => p.name === 'Ben D.').key;
const T1_KEY = c1.people.find((p) => p.name === 'Tess W.').key;

// 1. a copy, with no words
r = await start(ANA, 'C1', BEN_KEY, '', copy());
const AB = r.body.id;
const sent = r.body.messages?.[0];
check('a student sends a classmate a copy of a program, with no words', r.status === 201 && sent?.share?.kind === 'copy' && sent.share.lang === 'moshion' && sent.share.title === 'Maze' && sent.body === '');
check('...the card carries no code', !bodies[bodies.length - 1].includes('new Canvas'));
const SID = sent?.share?.id;
check('...and its id is 128 random bits', /^[0-9a-f]{32}$/.test(SID ?? ''));
r = await open(BEN, AB);
check("the classmate's conversation shows the card", r.status === 200 && r.body.messages[0].share?.id === SID && !r.body.messages[0].mine);
r = await reply(BEN, AB, 'Nice! Here is mine', copy("console.log('hi');", 'Hello', 'js'));
check('a reply can carry a program and words', r.status === 201 && r.body.messages[1].body === 'Nice! Here is mine' && r.body.messages[1].share.lang === 'js');
const SID_JS = r.body.messages[1].share.id;
r = await reply(BEN, AB, 'plain words');
check('an ordinary reply still has no card', r.status === 201 && r.body.messages[2].share === null);

// 2. who may open it
r = await share(BEN, SID);
check('the reader opens the copy: its code, the sender by name, not theirs', r.status === 200 && r.body.code === CODE && r.body.author === 'Ana L.' && r.body.mine === false && r.body.kind === 'copy');
r = await share(ANA, SID);
check('the sender opens it too, marked as theirs', r.status === 200 && r.body.mine === true);
r = await share(T1, SID);
check("the class's teacher opens a copy sent between two of their students", r.status === 200 && r.body.code === CODE);
r = await share(ADMIN, SID);
check('an admin opens it', r.status === 200);
r = await share(T2, SID);
check("another class's teacher gets 404", r.status === 404);
r = await share(CAT, SID);
check('a student outside the conversation gets 404', r.status === 404);
const missingText = r.body.error;
r = await share(CAT, 'f'.repeat(32));
check('...the same answer as an id that does not exist', r.status === 404 && r.body.error === missingText);
r = await share(BEN, 'not-an-id');
check('a malformed id is 404', r.status === 404);
check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));

// teacher conversations: its two people only
r = await start(ANA, 'C1', T1_KEY, 'Can you look at this?', copy());
const AT = r.body.id;
const SID_T = r.body.messages[0].share.id;
r = await share(T1, SID_T);
check('a copy sent to a teacher opens for that teacher', r.status === 200);
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('C1', 't2@s.test', ?)`, now);
r = await share(T2, SID_T);
check("a co-teacher does not open a copy in someone else's teacher conversation", r.status === 404);
sql(`DELETE FROM class_teachers WHERE class_id = 'C1' AND teacher_email = 't2@s.test'`);

// 3. what is refused
r = await reply(ANA, AB, '', copy(''));
check('an empty program is refused', r.status === 400 && /no code/i.test(r.body.error));
r = await reply(ANA, AB, '', copy('x'.repeat(64 * 1024 + 1)));
check('a program over 64 KB is refused in plain words', r.status === 400 && /too long/i.test(r.body.error));
r = await reply(ANA, AB, '', copy("// call me 555-201-3344\nlet x = 1;"));
check('a program with a phone number in it is refused as a safety refusal', r.status === 400 && r.body.safety === true && /phone number/.test(r.body.error));
r = await reply(ANA, AB, 'my email is ana@example.com', copy());
check('the words with it are checked too', r.status === 400 && r.body.safety === true);
r = await reply(ANA, AB, '', copy(CODE, 'ana@example.com'));
check('and so is the project name', r.status === 400 && r.body.safety === true && /project name/.test(r.body.error));
r = await reply(ANA, AB, '', { kind: 'zip', lang: 'moshion', code: CODE });
check('an unknown kind of share is refused', r.status === 400);
r = await reply(ANA, AB, '', { kind: 'copy', lang: 'reshape', code: CODE });
check('a mode other than JavaScript or moSHion is refused', r.status === 400);
r = await reply(ANA, AB, '', copy(CODE, 'A really very extremely long project name that goes on'));
check('a long project name is cut to 40 characters', r.status === 201 && [...r.body.messages.at(-1).share.title].length === 40);
await act(T1, 'C1', { action: 'messages-off' });
r = await reply(ANA, AB, '', copy());
check('with messages between classmates off, a program cannot be sent to a classmate', r.status === 403);
r = await start(ANA, 'C1', T1_KEY, '', copy());
check('...but still to the teacher', r.status === 201);
await act(T1, 'C1', { action: 'messages-on' });

// 4. the list
r = await list(BEN);
const abRow = r.body.threads.find((t) => t.id === AB);
check('the list says a program was sent when there are no words', /^A program: A really/.test(abRow?.last?.snippet ?? ''), abRow?.last);
r = await panel(T1, 'C1');
check("...and so does the teacher's panel", /^A program/.test(r.body.threads.find((t) => t.id === AB)?.last?.snippet ?? ''));

// 5. a removed message takes its program with it, for the students
await act(T1, 'C1', { action: 'remove', messageId: sent.id });
r = await open(BEN, AB);
check('a removed message shows no card to the students', r.body.messages[0].removed && r.body.messages[0].share === null);
r = await share(BEN, SID);
check('...and the program no longer opens for them', r.status === 404);
r = await share(ANA, SID);
check('...not even for its sender', r.status === 404);
r = await share(T1, SID);
check('the teacher can still open it', r.status === 200 && r.body.code === CODE);
r = await panelThread(T1, 'C1', AB);
check("the teacher's view of the conversation keeps the card", r.body.thread.messages[0].share?.id === SID);
await act(T1, 'C1', { action: 'restore', messageId: sent.id });
r = await share(BEN, SID);
check('putting the message back brings the program back', r.status === 200);
r = await share(BEN, SID_JS);
check('a JavaScript copy opens as JavaScript', r.status === 200 && r.body.lang === 'js' && r.body.code === "console.log('hi');");

// 6. Code together invitations
function room(code, game, host, { closed = null, expires = now + 3_600_000, created = now } = {}) {
  sql(`DELETE FROM game_rooms WHERE code = ?`, code);
  sql(`DELETE FROM game_room_players WHERE code = ?`, code);
  sql(`INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at, closed_at, live, kind) VALUES (?, ?, ?, 2, ?, ?, ?, 1, 'code')`,
    code, game, host, created, expires, closed);
  sql(`INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES (?, 0, ?, 'd1', ?)`, code, host, now);
}
const together = (code, lang = 'moshion') => ({ kind: 'together', lang, title: 'Maze', room: code });
room('BHKE', 'code-moshion', 'ana@s.test', { created: now - 5000 });
r = await reply(ANA, AB, 'Come help', together('bhke'));
const inv = r.body.messages?.at(-1);
check('a student in a Code together session invites a classmate to it', r.status === 201 && inv?.share?.kind === 'together' && inv.share.open === true && inv.share.room === 'BHKE');
r = await open(BEN, AB);
check('the classmate sees the session open, with its code', r.body.messages.at(-1).share.open === true && r.body.messages.at(-1).share.room === 'BHKE');
r = await share(BEN, inv.share.id);
check('...and opening the invitation gives the code, never a copy of the program', r.status === 200 && r.body.room === 'BHKE' && !('code' in r.body));
sql(`UPDATE game_rooms SET closed_at = ? WHERE code = 'BHKE'`, now);
r = await open(BEN, AB);
const closedCard = r.body.messages.at(-1).share;
check('once the session closed the card says so and has no code', closedCard.open === false && !('room' in closedCard));
room('BHKE', 'code-moshion', 'cat@s.test', { created: now });
r = await open(BEN, AB);
check('a code used again for a new session does not reopen the old invitation', r.body.messages.at(-1).share.open === false);
r = await reply(ANA, AB, '', together('BHKE'));
check('a student cannot invite people to a session they are not in', r.status === 403);
room('HJKM', 'code-moshion', 'ana@s.test');
r = await reply(ANA, AB, 'Watch me build it', { kind: 'watch', lang: 'moshion', title: 'Maze', room: 'HJKM' });
const w = r.body.messages?.at(-1)?.share;
check('a student in a session invites a classmate to WATCH it live', r.status === 201 && w?.kind === 'watch' && w.open === true && w.room === 'HJKM', r);
r = await list(BEN);
check('...the list says so', r.body.threads.find((t) => t.id === AB)?.last?.snippet === 'Watch me build it');
r = await reply(ANA, AB, '', { kind: 'watch', lang: 'moshion', title: 'Maze', room: 'BHKE' });
check('...only to a session they are in', r.status === 403);
room('CDFG', 'code-js', 'ana@s.test');
r = await reply(ANA, AB, '', together('CDFG', 'moshion'));
check('an invitation must name the kind of program the session is', r.status === 400);
room('GHJK', 'code-moshion', 'ana@s.test', { closed: now - 10 });
r = await reply(ANA, AB, '', together('GHJK'));
check('a session that has ended cannot be shared', r.status === 409);
room('KMNP', 'code-moshion', 'ana@s.test', { expires: now - 10 });
r = await reply(ANA, AB, '', together('KMNP'));
check('...nor one past its 3 hours', r.status === 409);
sql(`INSERT INTO game_rooms (code, game, host_email, seats, created_at, expires_at, live, kind) VALUES ('PQRS', 'pong', 'ana@s.test', 2, ?, ?, 1, 'game')`, now, now + 3_600_000);
sql(`INSERT INTO game_room_players (code, seat, email, device, joined_at) VALUES ('PQRS', 0, 'ana@s.test', 'd1', ?)`, now);
r = await reply(ANA, AB, '', together('PQRS'));
check('a game room is not a Code together session', r.status === 409);
r = await reply(ANA, AB, '', together('nope!'));
check('a code that is not a code is refused', r.status === 409);

// 7. deleting the class
const before = db.sqlite.prepare(`SELECT COUNT(*) AS n FROM message_shares`).get().n;
// The test database's batch gives no rows back for the count SELECT in it, so the handler stops after its
// batch has run (in D1 it answers 200). What is checked is what the batch deleted.
try { await call(del.onRequestPost, T1, '/api/classes/C1/delete', { id: 'C1' }, 'POST', {}); } catch { /* see above */ }
const after = db.sqlite.prepare(`SELECT COUNT(*) AS n FROM message_shares`).get().n;
const classGone = !db.sqlite.prepare(`SELECT 1 FROM classes WHERE id = 'C1'`).get();
check('deleting the class deletes the programs sent in it', classGone && before > 0 && after === 0, { before, after, classGone });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
