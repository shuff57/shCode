#!/usr/bin/env node
// Messages (migration 0053): GET|POST /api/messages, GET|POST /api/messages/[id], and the teacher's
// GET|POST /api/classes/[id]/messages. On a real SQLite with every migration applied. What has to hold:
//   1. a student is offered their teacher and classmates, only from classes they are in now; never an email;
//   2. a student messages a classmate and a teacher, the teacher replies; a second message to the same
//      person in the same class lands in the same conversation; unread counts and reading work;
//   3. someone outside the class, or not in the conversation, gets 404;
//   4. the words: empty, too long and personal details (phone, email, address) are refused in plain words;
//   5. the class switch: off stops classmates (new and existing conversations), never a teacher;
//   6. a mute: the muted student cannot message classmates but can message a teacher;
//   7. the teacher's panel lists conversations between two students only, reads them (removed words
//      included), removes and restores a message; students then see "removed", never the words;
//      another class's teacher and a student are refused;
//   8. a student is capped at 10 messages a minute; a teacher is not.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'messages-test');
const inbox = compileHandler('api/messages/index.ts', join(out, 'a'));
const one = compileHandler('api/messages/[id].ts', join(out, 'b'));
const teach = compileHandler('api/classes/[id]/messages.ts', join(out, 'c'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cat@s.test', 'Cat', 'Moss', 'student'],
  ['old@s.test', 'Old', 'Timer', 'student'], ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e, exp] of [['C1', 'ana@s.test', FAR], ['C1', 'ben@s.test', FAR], ['C2', 'cat@s.test', FAR], ['C1', 'old@s.test', now - 1000]]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, exp);
}
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };
const OLD = { email: 'old@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };

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
const count = (u) => call(inbox.onRequestGet, u, '/api/messages?count=1');
const start = (u, classId, to, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId, to, body });
const open = (u, id) => call(one.onRequestGet, u, `/api/messages/${id}`, { id });
const reply = (u, id, body) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { body });
const panel = (u, cls) => call(teach.onRequestGet, u, `/api/classes/${cls}/messages`, { id: cls });
const panelThread = (u, cls, t) => call(teach.onRequestGet, u, `/api/classes/${cls}/messages?thread=${t}`, { id: cls });
const act = (u, cls, body) => call(teach.onRequestPost, u, `/api/classes/${cls}/messages`, { id: cls }, 'POST', body);

// 1. whom a student is offered
let r = await people(ANA);
const c1 = r.body.classes?.find((c) => c.id === 'C1');
check('a student is offered only the classes they are in now', r.status === 200 && r.body.classes.length === 1 && c1);
check('...their teacher (marked) and their classmates, not someone whose enrollment ran out',
  c1 && c1.people.some((p) => p.name === 'Tess W.' && p.teacher) && c1.people.some((p) => p.name === 'Ben D.' && !p.teacher)
  && !c1.people.some((p) => p.name === 'Old T.') && !c1.people.some((p) => p.name === 'Ana L.'));
const key = (name) => c1.people.find((p) => p.name === name).key;
const BEN_KEY = key('Ben D.');
const T1_KEY = key('Tess W.');
r = await people(CAT);
const CAT_KEY_FROM_C2 = r.body.classes[0].people.find((p) => p.name === 'Cat M.');
check('a student is not listed to themselves', !CAT_KEY_FROM_C2);

// 2. sending and replying
r = await start(ANA, 'C1', BEN_KEY, 'Want to code together after lunch?');
const AB = r.body.id;
check('a student messages a classmate; the answer is the conversation, marked as between classmates',
  r.status === 201 && AB && r.body.kind === 'students' && r.body.other.name === 'Ben D.' && r.body.messages.length === 1 && r.body.messages[0].mine);
r = await count(BEN);
check('the classmate has one unread conversation', r.body.unread === 1);
r = await list(BEN);
// (Every class also lists its #general channel, migration 0055.)
const benOwn = r.body.threads.filter((t) => t.kind !== 'channel');
check("the classmate's list shows it, unread, with the first words", benOwn.length === 1 && benOwn[0].unread && /lunch/.test(benOwn[0].last.snippet) && benOwn[0].other.name === 'Ana L.');
r = await open(BEN, AB);
check('opening it shows the message and the conversation can be answered', r.status === 200 && r.body.canSend && r.body.messages[0].author === 'Ana L.' && !r.body.messages[0].mine);
r = await count(BEN);
check('...and marks it read', r.body.unread === 0);
r = await reply(BEN, AB, 'Sure!');
check('the classmate replies', r.status === 201 && r.body.messages.length === 2);
r = await start(ANA, 'C1', BEN_KEY, 'See you then');
check('a second "new message" to the same person in the same class lands in the same conversation', r.status === 201 && r.body.id === AB && r.body.messages.length === 3);
r = await start(ANA, 'C1', T1_KEY, 'I am stuck on 2.3');
const AT = r.body.id;
check('a student messages their teacher (a teacher conversation)', r.status === 201 && r.body.kind === 'teacher' && r.body.other.teacher);
r = await reply(T1, AT, 'Look at the loop condition.');
check('the teacher replies', r.status === 201 && r.body.messages[1].teacher && r.body.messages[1].mine);
r = await list(T1);
check("the teacher's mailbox has the conversation", r.body.threads.some((t) => t.id === AT));

// 3. outsiders
r = await open(CAT, AB);
check('someone not in the conversation gets 404', r.status === 404);
r = await reply(CAT, AB, 'hi');
check('...and cannot write in it (404)', r.status === 404);
r = await start(CAT, 'C1', BEN_KEY, 'hi');
check('a student not in the class cannot message someone in it (404)', r.status === 404);
r = await start(OLD, 'C1', BEN_KEY, 'hi');
check('a student whose enrollment ran out cannot message the class (404)', r.status === 404);
r = await start(ANA, 'C1', 'p' + '0'.repeat(20), 'hi');
check('an unknown person key is 404', r.status === 404);

// 4. the words
r = await reply(ANA, AB, '   ');
check('an empty message is refused', r.status === 400);
r = await reply(ANA, AB, 'x'.repeat(1001));
check('a message over 1000 characters is refused', r.status === 400 && /1000/.test(r.body.error));
r = await reply(ANA, AB, 'call me at 530-555-1234');
check('a phone number is refused in plain words', r.status === 400 && r.body.safety && /phone number/.test(r.body.error) && /not sent/.test(r.body.error));
r = await reply(ANA, AB, 'my email is ana.lopez@gmail.com');
check('an email address is refused', r.status === 400 && /email address/.test(r.body.error));
r = await reply(ANA, AB, 'I live at 123 Oak Street');
check('a street address is refused', r.status === 400 && /street address/.test(r.body.error));
r = await open(BEN, AB);
check('nothing refused was stored', r.body.messages.length === 3);

// 5. the class switch
r = await act(T1, 'C1', { action: 'messages-off' });
check('the teacher turns messages between classmates off', r.status === 200 && r.body.studentMessagesOn === false);
r = await reply(ANA, AB, 'still there?');
check('an existing conversation between classmates is closed (403, plain reason)', r.status === 403 && r.body.why === 'class-off' && /teacher only/.test(r.body.error));
r = await open(ANA, AB);
check('...it can still be read, and says why it cannot be answered', r.status === 200 && !r.body.canSend && /message your teacher/.test(r.body.whyText));
r = await reply(ANA, AT, 'Thanks!');
check('the student can still message the teacher', r.status === 201);
r = await people(BEN);
check('classmates are not offered while it is off; the teacher still is',
  r.body.classes[0].classmatesBlocked === 'class-off' && r.body.classes[0].people.every((p) => p.teacher) && r.body.classes[0].people.length === 1);
await act(T1, 'C1', { action: 'messages-on' });
r = await reply(ANA, AB, 'back on');
check('turned back on, classmates can write again', r.status === 201);

// 6. a mute
r = await panel(T1, 'C1');
const anaRow = r.body.students.find((s) => s.name === 'Ana L.');
check("the teacher's panel lists the class's students with a key, no email", anaRow && /^p[0-9a-f]{20}$/.test(anaRow.key) && !anaRow.muted);
r = await act(T1, 'C1', { action: 'mute', student: anaRow.key });
check('the teacher mutes one student', r.status === 200 && r.body.students.find((s) => s.name === 'Ana L.').muted);
r = await reply(ANA, AB, 'hello?');
check('the muted student cannot message a classmate', r.status === 403 && r.body.why === 'muted' && /paused/.test(r.body.error));
r = await reply(ANA, AT, 'Why am I muted?');
check('the muted student can still message the teacher', r.status === 201);
r = await reply(BEN, AB, 'Ana?');
check('a classmate can still write to them', r.status === 201);
r = await act(T1, 'C1', { action: 'mute', student: T1_KEY });
check('a teacher cannot be muted (not a student of the class)', r.status === 404);
r = await act(T1, 'C1', { action: 'unmute', student: anaRow.key });
check('unmuting lets them write again', r.status === 200 && !r.body.students.find((s) => s.name === 'Ana L.').muted && (await reply(ANA, AB, 'ok')).status === 201);

// 7. the teacher's panel
r = await panel(T1, 'C1');
check('the panel lists conversations between two students, not a teacher conversation',
  r.status === 200 && r.body.threads.some((t) => t.id === AB) && !r.body.threads.some((t) => t.id === AT));
const abRow = r.body.threads.find((t) => t.id === AB);
check('...with both names and how many messages', abRow.people.join(',') === 'Ana L.,Ben D.' && abRow.count >= 6);
r = await panelThread(T1, 'C1', AB);
check('the teacher reads it', r.status === 200 && r.body.thread.messages.length === abRow.count);
const target = r.body.thread.messages.find((m) => m.body === 'Sure!');
r = await count(BEN);
const benUnreadBefore = r.body.unread;
r = await act(T1, 'C1', { action: 'remove', messageId: target.id });
check('the teacher removes a message; the teacher still sees its words, marked', r.status === 200 && r.body.thread.messages.find((m) => m.id === target.id).removed && r.body.thread.messages.find((m) => m.id === target.id).body === 'Sure!');
r = await open(ANA, AB);
const gone = r.body.messages.find((m) => m.id === target.id);
check('students see it as removed, without its words', gone && gone.removed && gone.body === null && !bodies[bodies.length - 1].includes('Sure!'));
r = await act(T1, 'C1', { action: 'restore', messageId: target.id });
check('and it can be put back', !r.body.thread.messages.find((m) => m.id === target.id).removed);
r = await panelThread(T1, 'C1', AT);
check('the teacher in a teacher conversation reads it on the panel too', r.status === 200);
r = await panelThread(T2, 'C1', AB);
check("another class's teacher is refused", r.status === 403);
r = await panel(BEN, 'C1');
check('a student is refused the panel', r.status === 403);
r = await panelThread(T1, 'C2', AB);
check('a conversation is only read through its own class', r.status === 404 || r.status === 403);
r = await count(BEN);
check('reading on the panel marks nothing read for the students', r.body.unread === benUnreadBefore);

// 8. caps
for (let i = 0; i < 4; i++) await reply(ANA, AB, `msg ${i}`);
let capped = null;
for (let i = 0; i < 12 && !capped; i++) { const x = await reply(ANA, AB, `burst ${i}`); if (x.status === 429) capped = x; }
check('a student is capped at 10 messages a minute', capped && /minute/.test(capped.body.error));
let teacherOk = true;
for (let i = 0; i < 12; i++) if ((await reply(T1, AT, `note ${i}`)).status !== 201) teacherOk = false;
check('a teacher is not', teacherOk);

// no email anywhere
const leaked = bodies.filter((b) => /@s\.test/.test(b));
check('no answer carries an email', leaked.length === 0, leaked[0]);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
