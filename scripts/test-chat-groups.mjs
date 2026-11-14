#!/usr/bin/env node
// Groups, channels and messaging levels (migration 0055), on a real SQLite with every migration applied,
// through the real handlers (GET|POST /api/messages, /api/messages/[id], /api/classes/[id]/messages,
// /api/shares/[id]). What has to hold:
//   1. levels: per class and per student, On / Teacher only / Off, the stricter wins; Teacher only = a
//      teacher of the class only; Off = nothing, reading stays; teachers are never limited;
//   2. channels: every class has #general (made once), everyone in the class reads and posts, nobody else;
//      anyone may add one (a tidy name, no duplicates, no personal details); its maker or a teacher renames
//      it; a teacher locks it (only teachers post) or deletes it (#general cannot be deleted);
//      a channel never adds to the envelope's count;
//   3. groups: 2-8 people of one class, made by a student or a teacher; only its people (and the class's
//      teachers, who cannot write in it) read it; rename, add, leave; the last one out deletes it;
//   4. a teacher removes and puts back a message in a group or channel; students then see "removed";
//   5. programs: a copy can go in a group or a channel and opens for whoever may read it; an invitation to
//      Code together or to watch cannot go in a channel;
//   6. the teacher's panel lists groups and sets both levels; no answer carries an email.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)}` : ''}`); }
}

const out = join(root, '.tmp', 'chat-groups-test');
const inbox = compileHandler('api/messages/index.ts', join(out, 'a'));
const one = compileHandler('api/messages/[id].ts', join(out, 'b'));
const teach = compileHandler('api/classes/[id]/messages.ts', join(out, 'c'));
const shares = compileHandler('api/shares/[id].ts', join(out, 'd'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cat@s.test', 'Cat', 'Moss', 'student'],
  ['dan@s.test', 'Dan', 'Hill', 'student'], ['eve@s.test', 'Eve', 'Park', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C1', 'cat@s.test'], ['C1', 'dan@s.test'], ['C2', 'eve@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CAT = U('cat@s.test'), DAN = U('dan@s.test'), EVE = U('eve@s.test');
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher');

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
const count = async (u) => (await call(inbox.onRequestGet, u, '/api/messages?count=1')).body.unread;
const create = (u, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId: 'C1', ...body });
const dm = (u, to, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId: 'C1', to, body });
const open = (u, id) => call(one.onRequestGet, u, `/api/messages/${id}`, { id });
const post = (u, id, body, extra = {}) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { body, ...extra });
const act = (u, id, action, extra = {}) => call(one.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { action, ...extra });
const panel = (u, body) => body === undefined
  ? call(teach.onRequestGet, u, '/api/classes/C1/messages', { id: 'C1' })
  : call(teach.onRequestPost, u, '/api/classes/C1/messages', { id: 'C1' }, 'POST', body);

let r = await people(ANA);
const c1 = r.body.classes.find((c) => c.id === 'C1');
const key = (name) => c1.people.find((p) => p.name === name).key;
const BEN_K = key('Ben D.'), CAT_K = key('Cat M.'), DAN_K = key('Dan H.'), T1_K = key('Tess W.');

// ---- 2. channels ----
r = await list(ANA);
const general = r.body.threads.find((t) => t.kind === 'channel' && t.title === 'general');
check('every class has #general, listed with the class', general && general.classId === 'C1' && general.className === 'Period 1');
await list(BEN); await list(T1);
check('...made once, however many people look', db.sqlite.prepare(`SELECT COUNT(*) AS n FROM message_threads WHERE kind = 'channel' AND class_id = 'C1'`).get().n === 1);
const G = general.id;
r = await post(ANA, G, 'hi everyone');
check('a student posts in #general', r.status === 201 && r.body.kind === 'channel' && r.body.messages.at(-1).body === 'hi everyone' && /Everyone in Period 1/.test(r.body.note));
r = await open(BEN, G);
check('a classmate reads it, the author named', r.status === 200 && r.body.messages.at(-1).author === 'Ana L.');
r = await open(EVE, G);
check('someone in another class gets 404', r.status === 404);
r = await post(EVE, G, 'sneaky');
check('...and cannot post (404)', r.status === 404);
await post(BEN, G, 'hello Ana');
r = await list(ANA);
check('a new channel message shows the channel bold in the list', r.body.threads.find((t) => t.id === G)?.unread === true);
check('...but never adds to the envelope count', (await count(ANA)) === 0);

r = await create(BEN, { create: 'channel', name: '  Game Ideas!! ' });
const GI = r.body.id;
check('a student adds a channel; the name is tidied like Discord', r.status === 201 && r.body.title === 'game-ideas' && r.body.manage === true);
r = await create(CAT, { create: 'channel', name: 'game ideas' });
check('two channels of a class cannot share a name', r.status === 409 && /#game-ideas/.test(r.body.error));
r = await create(CAT, { create: 'channel', name: 'call 555 201 3344' });
check('a channel name with personal details is refused', r.status === 400 && r.body.safety === true);
r = await create(CAT, { create: 'channel', name: '!!!' });
check('an empty name is refused in plain words', r.status === 400 && /name/.test(r.body.error));
r = await act(CAT, GI, 'rename', { title: 'cats' });
check("a classmate cannot rename someone else's channel", r.status === 403);
r = await act(BEN, GI, 'rename', { title: 'game-plans' });
check('its maker renames it', r.status === 200 && r.body.title === 'game-plans');
r = await act(BEN, GI, 'lock');
check('a student cannot lock a channel', r.status === 403);
r = await act(T1, GI, 'lock');
check('a teacher locks it', r.status === 200 && r.body.locked === true);
r = await post(CAT, GI, 'can I post?');
check('...then a student cannot post (403, plain words)', r.status === 403 && r.body.why === 'locked' && /Only teachers can post in #game-plans/.test(r.body.error));
r = await post(T1, GI, 'Announcements only here.');
check('...a teacher can', r.status === 201);
r = await open(CAT, GI);
check('...and students still read it', r.status === 200 && r.body.canSend === false && r.body.messages.length === 1);
r = await act(T1, G, 'delete');
check('#general cannot be deleted', r.status === 400);
r = await act(BEN, GI, 'delete');
check('a student cannot delete a channel', r.status === 403);
r = await act(T1, GI, 'delete');
check('a teacher deletes a channel and everything in it', r.status === 200 && (await open(BEN, GI)).status === 404 && db.sqlite.prepare(`SELECT COUNT(*) AS n FROM messages WHERE thread_id = ?`).get(GI).n === 0);

// ---- 3. groups ----
r = await create(ANA, { create: 'group', people: [BEN_K, CAT_K], title: 'Maze team' });
const GR = r.body.id;
check('a student makes a group with two classmates', r.status === 201 && r.body.kind === 'group' && r.body.title === 'Maze team' && r.body.members.length === 3 && r.body.note === 'Your teacher can read this group.');
r = await post(BEN, GR, 'I will do the walls');
check('a member posts', r.status === 201);
check('...and it counts on the envelope of the others', (await count(CAT)) === 1 && (await count(ANA)) === 1);
r = await open(DAN, GR);
check('a classmate not in it gets 404', r.status === 404);
r = await open(T1, GR);
check("the class's teacher reads it, as an onlooker who cannot write", r.status === 200 && r.body.onlooker === true && r.body.canSend === false && r.body.moderate === true);
r = await post(T1, GR, 'hello');
check('...posting is refused', r.status === 403);
r = await open(T2, GR);
check("another class's teacher gets 404", r.status === 404);
r = await call(inbox.onRequestPost, EVE, '/api/messages', {}, 'POST', { classId: 'C1', create: 'group', people: [ANA.email] });
check('someone not in the class cannot make a group there (404)', r.status === 404);
r = await create(ANA, { create: 'group', people: ['p' + '0'.repeat(20)] });
check('a group of people not in the class is refused', r.status === 400);
r = await create(ANA, { create: 'group', people: [BEN_K, CAT_K, DAN_K, T1_K, 'p1'.padEnd(21, '1'), 'p2'.padEnd(21, '2'), 'p3'.padEnd(21, '3'), 'p4'.padEnd(21, '4')] });
check('a group is at most 8 people', r.status === 400 && /8 people/.test(r.body.error));
r = await create(DAN, { create: 'group', people: [ANA.email] });
check('people are named by their public key, never an email', r.status === 400);
r = await act(CAT, GR, 'rename', { title: 'Maze crew' });
check('a member renames the group', r.status === 200 && r.body.title === 'Maze crew');
r = await act(CAT, GR, 'add', { people: [DAN_K] });
check('a member adds a classmate', r.status === 200 && r.body.members.length === 4 && (await open(DAN, GR)).status === 200);
r = await act(DAN, GR, 'leave');
check('a member leaves', r.status === 200 && (await open(DAN, GR)).status === 404);
r = await create(ANA, { create: 'group', people: [BEN_K] });
const G2 = r.body.id;
check('a group with no name is called by its people', r.status === 201 && r.body.title === 'Ben D.');
await act(ANA, G2, 'leave');
await act(BEN, G2, 'leave');
check('the last one out deletes it', !db.sqlite.prepare(`SELECT 1 FROM message_threads WHERE id = ?`).get(G2));
r = await list(BEN);
check('the list has the group with its name and size', r.body.threads.some((t) => t.id === GR && t.kind === 'group' && t.title === 'Maze crew' && t.people === 3));

// ---- 4. a teacher removes a message ----
r = await open(T1, GR);
const walls = r.body.messages.find((m) => m.body === 'I will do the walls');
r = await act(T1, GR, 'remove', { messageId: walls.id });
check('a teacher removes a message in a group; they still see its words', r.status === 200 && r.body.messages.find((m) => m.id === walls.id).removed && r.body.messages.find((m) => m.id === walls.id).body === 'I will do the walls');
r = await open(CAT, GR);
check('...students see it removed, without its words', r.body.messages.find((m) => m.id === walls.id).body === null && !bodies.at(-1).includes('do the walls'));
r = await act(BEN, GR, 'remove', { messageId: walls.id });
check('a student cannot remove messages', r.status === 403);
r = await act(T1, GR, 'restore', { messageId: walls.id });
check('...and the teacher puts it back', r.status === 200 && !r.body.messages.find((m) => m.id === walls.id).removed);
r = await act(T1, G, 'remove', { messageId: (await open(T1, G)).body.messages[0].id });
check('a teacher removes a message in a channel', r.status === 200 && r.body.messages[0].removed);

// ---- 5. programs ----
r = await post(ANA, GR, '', { share: { kind: 'copy', lang: 'js', title: 'Maze', code: "console.log('maze');" } });
const sid = r.body.messages?.at(-1)?.share?.id;
check('a copy goes into a group', r.status === 201 && !!sid);
check('...opens for its people and its teacher, not for a classmate outside it',
  (await call(shares.onRequestGet, BEN, `/api/shares/${sid}`, { id: sid })).status === 200
  && (await call(shares.onRequestGet, T1, `/api/shares/${sid}`, { id: sid })).status === 200
  && (await call(shares.onRequestGet, DAN, `/api/shares/${sid}`, { id: sid })).status === 404);
r = await post(BEN, G, '', { share: { kind: 'copy', lang: 'js', title: 'Hi', code: "console.log('hi');" } });
const csid = r.body.messages?.at(-1)?.share?.id;
check('a copy goes into a channel and opens for anyone in the class', r.status === 201 && (await call(shares.onRequestGet, DAN, `/api/shares/${csid}`, { id: csid })).status === 200
  && (await call(shares.onRequestGet, EVE, `/api/shares/${csid}`, { id: csid })).status === 404);
r = await post(BEN, G, '', { share: { kind: 'watch', lang: 'js', title: 'Hi', room: 'BHKE' } });
check('an invitation cannot go in a channel', r.status === 400 && /direct message or a group/.test(r.body.error));

// ---- 1. levels ----
r = await panel(T1, { action: 'student-level', student: CAT_K, level: 1 });
check('the teacher sets one student to Teacher only', r.status === 200 && r.body.students.find((s) => s.name === 'Cat M.').level === 1);
r = await post(CAT, G, 'hi');
check('...they cannot post in a channel', r.status === 403 && r.body.why === 'muted');
r = await post(CAT, GR, 'hi');
check('...nor in a group', r.status === 403);
r = await create(CAT, { create: 'group', people: [BEN_K] });
check('...nor make one', r.status === 403);
r = await dm(CAT, BEN_K, 'hi');
check('...nor message a classmate', r.status === 403);
r = await dm(CAT, T1_K, 'Can you help?');
check('...but can message the teacher', r.status === 201);
const CT = r.body.id;
r = await people(CAT);
check('...and New message lists only teachers', r.body.classes[0].people.every((p) => p.teacher) && r.body.classes[0].classmatesBlocked === 'muted');
r = await panel(T1, { action: 'student-level', student: CAT_K, level: 2 });
r = await post(CAT, CT, 'still there?');
check('Off: not even the teacher (403, plain words)', r.status === 403 && r.body.why === 'all-off' && /turned off your messages/.test(r.body.error));
r = await open(CAT, CT);
check('...but they can still read', r.status === 200 && r.body.canSend === false);
r = await people(CAT);
check('...and New message lists nobody, saying why', r.body.classes[0].people.length === 0 && r.body.classes[0].allBlocked === 'all-off');
r = await post(T1, CT, 'I will come to your desk.');
check('a teacher can still write to them', r.status === 201);
await panel(T1, { action: 'student-level', student: CAT_K, level: 0 });
r = await post(CAT, G, 'back!');
check('On again: they post', r.status === 201);

r = await panel(T1, { action: 'class-level', level: 1 });
check('the class set to Teacher only', r.status === 200 && r.body.level === 1);
r = await post(ANA, G, 'hello?');
check('...no student posts in a channel', r.status === 403 && r.body.why === 'class-off');
r = await dm(ANA, T1_K, 'question');
check('...students still message the teacher', r.status === 201);
await panel(T1, { action: 'student-level', student: BEN_K, level: 2 });
r = await dm(BEN, T1_K, 'question');
check('the stricter wins: class Teacher only, student Off = Off', r.status === 403 && r.body.why === 'all-off');
r = await panel(T1, { action: 'class-level', level: 2 });
await panel(T1, { action: 'student-level', student: BEN_K, level: 0 });
r = await dm(ANA, T1_K, 'question');
check('the class Off: no student sends anything', r.status === 403 && r.body.why === 'class-all-off');
r = await post(T1, G, 'Class messages are off for the test.');
check('...teachers still post', r.status === 201);
r = await panel(T1, { action: 'messages-on' });
check("the 0053 switch's name still works (on = level 0)", r.status === 200 && r.body.level === 0);
r = await post(ANA, G, 'yay');
check('...and students post again', r.status === 201);
r = await panel(T1, { action: 'class-level', level: 3 });
check('a level outside 0-2 is refused', r.status === 400);
r = await panel(ANA, { action: 'class-level', level: 2 });
check('a student cannot set levels', r.status === 403);

// ---- 6. the teacher's panel ----
r = await panel(T1);
check("the teacher's panel lists the class's groups with conversations between students", r.body.threads.some((t) => t.id === GR && t.kind === 'group' && t.title === 'Maze crew'));
check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
