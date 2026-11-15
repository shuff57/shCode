#!/usr/bin/env node
// Guests (migration 0059; functions/_shared/guests.ts), on a real SQLite with every migration applied, through the real
// handlers. What has to hold:
//   1. inviting: a student in a class only, through one of their own classes, 3 at a time; the host's own words are checked
//      for personal details; the code is shown only to the host;
//   2. redeeming ASKS, it does not grant: single use, a wrong or used or expired code reads the same 404, not your own code,
//      not a classmate of the host, once per pair, a teacher's earlier no stands but a host's or guest's own ending does not;
//   3. a pending guest gets nothing; only a teacher of the host's class decides (another class's teacher cannot);
//   4. an approved guest joins rooms their HOST starts and only those, cannot start one, sees Everyone, and is shown as a
//      guest; the guest list is the one place an email appears;
//   4b. a host and their guest MESSAGE each other (migration 0060): a direct conversation filed under the host's class so its
//      teachers read it, host-and-guest only (no classmates, groups, channels), the host's level governs both ways, ending it
//      stops sending but not reading, and a guest is capped even with a teacher account;
//   5. ending it (host, guest, teacher) drops the guest's seats in running sessions AT ONCE (the live room is told), and
//      a host leaving the class, the class being archived or switched off, or the approval expiring takes access away;
//   6. teachers, hosts and guests are told in the Activity feed, and "Your teacher" is only ever a teacher.

import { createRequire } from 'node:module';
import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'guests-test');
let n = 0;
const h = (entry) => compileHandler(entry, join(out, String(n++)));
const mine = h('api/guests/index.ts');
const redeem = h('api/guests/redeem.ts');
const one = h('api/guests/[id].ts');
const cls = h('api/classes/[id]/guests/index.ts');
const rooms = h('api/rooms/index.ts');
const join$ = h('api/rooms/[code]/join.ts');
const pub = h('api/public.ts');
const notes = h('api/notifications.ts');
const inbox = h('api/messages/index.ts');
const msg = h('api/messages/[id].ts');
const teachMsgs = h('api/classes/[id]/messages.ts');
const leave = h('api/leave-class.ts');
const liveMod = h('_shared/live.ts');
const protocol = createRequire(import.meta.url)(join(out, String(n - 1), 'lib', 'live-protocol.js'));

const db = makeD1();
// A stand-in for the live Durable Object: records every control message the Functions send it.
const controls = [];
const LIVE_DOC = {
  idFromName: (name) => name,
  get: (id) => ({ fetch: async (_url, init) => { controls.push({ room: id, op: JSON.parse(init.headers[protocol.CONTROL_HEADER]) }); return new Response('ok'); } }),
};
const env = { DB: db, LIVE_DOC };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const all = (q, ...a) => db.sqlite.prepare(q).all(...a);
const get = (q, ...a) => db.sqlite.prepare(q).get(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['cy@s.test', 'Cy', 'Moss', 'student'],
  ['fri@s.test', 'Fri', 'Ends', 'student'], ['fri2@s.test', 'Fay', 'Two', 'student'], ['fri3@s.test', 'Fox', 'Three', 'student'], ['fri4@s.test', 'Fin', 'Four', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'], ['t3@s.test', 'Uma', 'Park', 'teacher'],
  ['adm@s.test', 'Ad', 'Min', 'admin'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now - 86_400_000 * 30, role, first, last);
}
const mkClass = (id, name, code, owner) => sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, code, owner, now);
mkClass('C1', 'Period 1', 'AAAAAA', 't1@s.test');
mkClass('C2', 'Robotics', 'BBBBBB', 't2@s.test');
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cy@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), CY = U('cy@s.test');
const FRI = U('fri@s.test'), FRI2 = U('fri2@s.test'), FRI3 = U('fri3@s.test'), FRI4 = U('fri4@s.test');
const T1 = U('t1@s.test', 'teacher'), T2 = U('t2@s.test', 'teacher'), T3 = U('t3@s.test', 'teacher'), ADM = U('adm@s.test', 'admin');

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body, extraEnv = {}) {
  const res = await fn({
    env: { ...env, ...extraEnv }, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  // the teacher's decision list is the one place an email is meant to appear
  if (!/^\/api\/classes\//.test(url)) bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
// Every invite now carries what a teacher decides on (migration 0062); a test overrides only what it is about.
const DETAILS = { name: 'Fri Ends', relation: 'a friend', age: 'teen', org: 'Oak High School', purpose: 'build a game together' };
const invite = (u, classId, relation, more = {}) => call(mine.onRequestPost, u, '/api/guests', {}, 'POST', { classId, ...DETAILS, ...(relation !== undefined ? { relation } : {}), ...more });
const redeem$ = (u, code) => call(redeem.onRequestPost, u, '/api/guests/redeem', {}, 'POST', { code });
const myGuests = (u) => call(mine.onRequestGet, u, '/api/guests');
const end = (u, id) => call(one.onRequestDelete, u, `/api/guests/${id}`, { id }, 'DELETE');
const panel = (u, classId, body) => body === undefined
  ? call(cls.onRequestGet, u, `/api/classes/${classId}/guests`, { id: classId })
  : call(cls.onRequestPost, u, `/api/classes/${classId}/guests`, { id: classId }, 'POST', body);
const roomList = (u) => call(rooms.onRequestGet, u, '/api/rooms?game=code-js&kind=code&device=t1');
const roomMake = (u) => call(rooms.onRequestPost, u, '/api/rooms', {}, 'POST', { game: 'code-js', kind: 'code', seats: 3, device: 'host-tab' });
const roomJoin = (u, code, device = 'g-tab') => call(join$.onRequestPost, u, `/api/rooms/${code}/join`, { code }, 'POST', { kind: 'code', device });
const everyone = (u) => call(pub.onRequestGet, u, '/api/public');
const activity = async (u) => (await call(notes.onRequestGet, u, '/api/notifications')).body.items.filter((i) => i.kind === 'guest');
const rowOf = (id) => get(`SELECT * FROM sandbox_guests WHERE id = ?`, id);

// ---- 1. inviting ----
let r = await invite(ANA, 'C1', 'my cousin');
const A1 = r.body;
check('a student in a class makes a code (8 safe characters), good for days', r.status === 201 && /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(A1.code) && A1.expiresAt > now + 6 * 86_400_000 && A1.link === `/guest/?code=${A1.code}`, r);
r = await myGuests(ANA);
check('...only the host is shown the code, with the class and their own words', r.body.hosted[0].code === A1.code && r.body.hosted[0].relation === 'my cousin' && r.body.hosted[0].className === 'Period 1' && r.body.canInvite === true, r.body);
r = await myGuests(BEN);
check("...a classmate's list does not have it", r.body.hosted.length === 0);
r = await invite(FRI, 'C1');
check('a student with no class cannot invite (404, choose your class)', r.status === 404, r);
r = await invite(CY, 'C1');
check("...nor through a class they are not in", r.status === 404);
r = await invite(T1, 'C1');
check('a teacher is told they do not need guests (403)', r.status === 403 && /Students in your classes/.test(r.body.error), r);
r = await invite(ANA, 'C1', 'call me 555 201 3344');
check("the host's own words are checked for personal details", r.status === 400 && /phone number/.test(r.body.error), r);
r = await invite(ANA, 'C1', 'x'.repeat(61));
check('...and kept short', r.status === 400);
// What a teacher decides on (migration 0062): all of it is asked for, in the host's words, and none of it a phone, email or address.
const rowsBefore = all(`SELECT id FROM sandbox_guests`).length;
r = await invite(ANA, 'C1', undefined, { name: '' });
check("a guest's name is required (400)", r.status === 400 && /their full name/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { name: 'Cher' });
check('...and it has to be a first and last name (400)', r.status === 400 && /first and last name/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { name: 'Pat 555 Guest' });
check('...in letters only (400)', r.status === 400);
r = await invite(ANA, 'C1', undefined, { relation: '' });
check('who they are to the host is required (400)', r.status === 400 && /who they are to you/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { age: 'under13' });
check('a guest under 13 is refused with the reason (400)', r.status === 400 && /13 or older/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { age: undefined });
check('an age group is required (400)', r.status === 400 && /how old/i.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { age: 'ancient' });
check('...and only the listed ones (400)', r.status === 400);
r = await invite(ANA, 'C1', undefined, { org: '' });
check('where they go to school or work is required (400)', r.status === 400 && /school or work/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { org: 'call 555 201 3344' });
check('...and checked for personal details (400)', r.status === 400 && /phone number/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { purpose: 'mail me at pat@home.test' });
check('what they will do together is checked for personal details too (400)', r.status === 400 && /email/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { purpose: undefined });
check('what they will do together is required when left out entirely (400)', r.status === 400 && /do together/.test(r.body.error), r);
r = await invite(ANA, 'C1', undefined, { purpose: 'hi' });
check('...and has to say something (400)', r.status === 400);
r = await invite(ANA, 'C1', undefined, { purpose: 'x'.repeat(121) });
check('...and is kept short (400)', r.status === 400);
check('none of those refusals made a row', all(`SELECT id FROM sandbox_guests`).length === rowsBefore);
const A2 = (await invite(ANA, 'C1', 'a friend')).body;
const A3 = (await invite(ANA, 'C1')).body;
r = await invite(ANA, 'C1');
check('three at a time, then a plain refusal (409)', r.status === 409 && /3 guests/.test(r.body.error), r);
r = await end(ANA, A3.id);
check('the host cancels an unused code: the row is gone', r.status === 200 && r.body.ended === 'cancelled' && !rowOf(A3.id));
r = await redeem$(FRI, A3.code);
check('...and the code stops working (404)', r.status === 404);

// ---- 2. redeeming asks, it does not grant ----
r = await redeem$(FRI, 'short');
check('a malformed code is a 400', r.status === 400);
r = await redeem$(FRI, 'ZZZZZZZZ');
check('a code that does not exist is a 404', r.status === 404);
r = await redeem$(ANA, A1.code);
check('the host cannot use their own code (400)', r.status === 400);
r = await redeem$(BEN, A1.code);
check('a classmate of the host is told to just join (409), and the code stays unused', r.status === 409 && /already in a class with Ana L\./.test(r.body.error) && rowOf(A1.id).status === 'invited', r);
r = await redeem$(ADM, A1.code);
check('an admin can already join anything (409)', r.status === 409);
r = await redeem$(T1, A1.code);
check('so can a teacher of the class (409): no guest row is needed', r.status === 409);
r = await redeem$(FRI, A1.code);
check('a person with an account and no class asks: pending, naming the teacher who decides, no email', r.status === 201 && r.body.status === 'pending' && r.body.host === 'Ana L.' && r.body.teacher === 'Tess W.' && r.body.className === 'Period 1', r);
r = await redeem$(FRI2, A1.code);
check('a code is single use (the same 404 as a wrong one)', r.status === 404);
r = await redeem$(FRI, A2.code);
check('the same pair cannot ask twice (409)', r.status === 409);
sql(`UPDATE sandbox_guests SET expires_at = ? WHERE id = ?`, now - 1000, A2.id);
r = await redeem$(FRI2, A2.code);
check('an expired code reads the same 404', r.status === 404);
sql(`DELETE FROM sandbox_guests WHERE id = ?`, A2.id);

// ---- 3. a pending guest gets nothing; who decides ----
const room = (await roomMake(ANA)).body;
check('Ana starts a Code together session', !!room.code && room.kind === 'code', room);
r = await roomJoin(FRI, room.code);
check('a pending guest cannot join it (404)', r.status === 404);
r = await roomList(FRI);
check("...sees no sessions, and is in no class", r.body.inClass === false && r.body.rooms.length === 0, r.body);
r = await everyone(FRI);
check('...and Everyone is closed to them (403)', r.status === 403);
check('a teacher of ANOTHER class cannot see the list (403), nor a student', (await panel(T2, 'C1')).status === 403 && (await panel(ANA, 'C1')).status === 403);
r = await panel(T1, 'C1');
const g = r.body.guests[0];
check("the teacher's list shows who asked and who for, with the address, role, account age and the host's words", r.status === 200 && g.status === 'pending' && g.host === 'Ana Lopez' && g.guest.email === 'fri@s.test' && g.guest.name === 'Fri Ends' && g.guest.role === 'student' && g.guest.accountSince < now && g.relation === 'my cousin', r.body);
check("...and what the host said: the guest's name, age group, school or work and plan", g.details.name === 'Fri Ends' && g.details.age === 'teen' && g.details.org === 'Oak High School' && g.details.purpose === 'build a game together', g.details);
r = await myGuests(FRI);
check("the guest's own list never carries what the host said about them", !JSON.stringify(r.body).includes('build a game together') && !JSON.stringify(r.body).includes('Oak High School'), r.body);
r = await myGuests(ANA);
check('the host sees their own words on the invite', r.body.hosted[0].invitedName === 'Fri Ends' && r.body.hosted[0].age === 'teen' && r.body.hosted[0].purpose === 'build a game together', r.body.hosted[0]);
r = await panel(T1, 'C1', { action: 'approve', id: 'f'.repeat(32) });
check('deciding something that is not in this class is a 404', r.status === 404);
r = await panel(T2, 'C1', { action: 'approve', id: A1.id });
check("another class's teacher cannot decide it (403)", r.status === 403 && rowOf(A1.id).status === 'pending');
r = await panel(T1, 'C1', { action: 'revoke', id: A1.id });
check('revoking something that is not approved is a 409', r.status === 409);

// ---- 4. an approved guest ----
r = await panel(T1, 'C1', { action: 'approve', id: A1.id });
check('Tess approves: until the school year\'s cutoff', r.status === 200 && r.body.guests[0].status === 'approved' && rowOf(A1.id).ends_at > now && rowOf(A1.id).decided_by === 't1@s.test', r.body);
r = await panel(T1, 'C1', { action: 'approve', id: A1.id });
check('approving twice is a 409', r.status === 409);
r = await roomList(FRI);
check('the guest now sees their host\'s session, marked as guest-only (no class)', r.body.inClass === true && r.body.guest === true && r.body.rooms.some((x) => x.code === room.code), r.body);
r = await roomJoin(FRI, room.code);
check("...and joins it", r.status === 200 && r.body.seat >= 1, r);
r = await roomMake(FRI);
check('...but cannot start one (403, "ask them for their code")', r.status === 403 && /As a guest you join a session your host starts/.test(r.body.error), r);
const benRoom = (await roomMake(BEN)).body;
r = await roomJoin(FRI, benRoom.code);
check("...nor join a session of someone who did not invite them (404)", r.status === 404);
const auth = await liveMod.authorizeLive(db, 'fri@s.test', 'student', room.code, 'g-tab', Date.now());
check('in the live session they are shown as a guest', auth.ok === true && auth.ticket.name === 'Fri E. (guest)', auth);
const hostAuth = await liveMod.authorizeLive(db, 'ana@s.test', 'student', room.code, 'host-tab', Date.now());
check("...and the host is not", hostAuth.ok === true && hostAuth.ticket.name === 'Ana L.', hostAuth.ticket);
r = await everyone(FRI);
check('an approved guest counts as vetted for Everyone (200)', r.status === 200);
r = await call(inbox.onRequestGet, FRI, '/api/messages?people=1');
check('...and in messaging has exactly one person to write to, their host, under "Guest of ..." (no classmates, not a class of theirs)',
  r.status === 200 && r.body.classes.length === 1 && r.body.classes[0].guestOf === true && r.body.classes[0].name === 'Guest of Ana L.' && r.body.classes[0].people.length === 1 && r.body.classes[0].people[0].name === 'Ana L.', r.body);
r = await myGuests(FRI);
check('their own page says where they are a guest, and the teacher who decided it', r.body.asGuest[0].status === 'approved' && r.body.asGuest[0].host === 'Ana L.' && r.body.asGuest[0].teacher === 'Tess W.' && r.body.canInvite === false, r.body);

// ---- 5. ending it drops the seat at once ----
controls.length = 0;
r = await end(ANA, A1.id);
check('the host ends it', r.status === 200 && r.body.ended === 'revoked' && rowOf(A1.id).status === 'revoked' && rowOf(A1.id).decided_by === 'ana@s.test', r);
check("...the guest's seat is dropped in D1 and the running room is told to close that seat", r.body.seatsClosed === 1 && controls.some((c) => c.op.op === 'leave' && c.op.seat >= 1) && get(`SELECT left_at FROM game_room_players WHERE code = ? AND email = 'fri@s.test'`, room.code).left_at != null, { controls, r: r.body });
r = await roomJoin(FRI, room.code);
check('...and they cannot rejoin (404)', r.status === 404);
r = await everyone(FRI);
check('...nor see Everyone (403)', r.status === 403);
r = await end(FRI, A1.id);
check('ending an ended one is a 404', r.status === 404);

// a host's own ending does not bar the pair
const B1 = (await invite(ANA, 'C1', 'my cousin')).body;
r = await redeem$(FRI, B1.code);
check("a host ending it themselves does not bar the pair: they can ask again", r.status === 201, r);
r = await panel(T1, 'C1', { action: 'decline', id: B1.id });
check('Tess declines', r.status === 200 && rowOf(B1.id).status === 'declined');
const B2 = (await invite(ANA, 'C1')).body;
r = await redeem$(FRI, B2.code);
check("a TEACHER's no stands: the pair cannot use another code (403)", r.status === 403 && /A teacher said no/.test(r.body.error) && rowOf(B2.id).status === 'invited', r);
await end(ANA, B2.id);

// the guest withdraws; a teacher revokes
const C1 = (await invite(ANA, 'C1', 'a friend')).body;
await redeem$(FRI2, C1.code);
r = await end(FRI2, C1.id);
check('a guest withdraws a request that is waiting: the row is gone', r.status === 200 && r.body.ended === 'cancelled' && !rowOf(C1.id));
const D1 = (await invite(ANA, 'C1', 'a friend')).body;
await redeem$(FRI2, D1.code);
await panel(T1, 'C1', { action: 'approve', id: D1.id });
const room2 = (await roomMake(ANA)).body;
await roomJoin(FRI2, room2.code, 'g2');
controls.length = 0;
r = await panel(T1, 'C1', { action: 'revoke', id: D1.id });
check('a teacher revokes: the seat is dropped at once too', r.status === 200 && controls.some((c) => c.op.op === 'leave') && (await roomJoin(FRI2, room2.code, 'g2')).status === 404, controls);
check('...and it is recorded as the teacher\'s, so it does bar the pair', (await panel(T1, 'C1')).body.guests.find((x) => x.id === D1.id).endedBy === 'teacher');

// ---- 5b. what else takes access away ----
const E1 = (await invite(ANA, 'C1', 'a friend')).body;
await redeem$(FRI3, E1.code);
await panel(T1, 'C1', { action: 'approve', id: E1.id });
const room3 = (await roomMake(ANA)).body;
check('a new approved guest joins', (await roomJoin(FRI3, room3.code, 'g3')).status === 200);
r = await panel(T1, 'C1', { action: 'class-off' });
check('the class switch turns guests off', r.body.guestsOff === true);
check('...every guest of that class loses access at once', (await roomJoin(FRI3, room3.code, 'g4')).status === 404 && (await everyone(FRI3)).status === 403);
r = await invite(ANA, 'C1');
check('...and no new invites (403, plain words)', r.status === 403 && /turned off guests in Period 1/.test(r.body.error), r);
await panel(T1, 'C1', { action: 'class-on' });
check('switching it back on gives the approved guest their access back', (await roomJoin(FRI3, room3.code, 'g4')).status === 200);
sql(`UPDATE sandbox_guests SET ends_at = ? WHERE id = ?`, now - 1000, E1.id);
check('an approval past its end stops working', (await roomJoin(FRI3, room3.code, 'g5')).status === 404);
sql(`UPDATE sandbox_guests SET ends_at = ? WHERE id = ?`, FAR, E1.id);
check('(and works again when it is not)', (await roomJoin(FRI3, room3.code, 'g5')).status === 200);
sql(`UPDATE classes SET archived_at = ? WHERE id = 'C1'`, now);
check('an archived class takes its guests with it', (await roomJoin(FRI3, room3.code, 'g6')).status === 404);
sql(`UPDATE classes SET archived_at = NULL WHERE id = 'C1'`);
r = await call(leave.onRequestPost, ANA, '/api/leave-class', {}, 'POST', { classId: 'C1' });
check('a host who leaves the class takes their guests with them', r.status === 200 && (await roomJoin(FRI3, room3.code, 'g7')).status === 404 && (await everyone(FRI3)).status === 403);
sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('C1', 'ana@s.test', ?, ?)`, now, FAR);

// ---- 6. any account may be a guest; the teacher decides ----
const F1 = (await invite(ANA, 'C1', 'a teacher friend')).body;
r = await redeem$(T3, F1.code);
check('a teacher of another school (any account) can ask, and the teacher decides', r.status === 201 && (await panel(T1, 'C1')).body.guests.some((x) => x.guest.email === 't3@s.test' && x.guest.role === 'teacher' && x.status === 'pending'), r);


// ---- 8. a host and their guest message each other (migration 0060) ----
const ANA_KEYS = (await call(inbox.onRequestGet, ANA, '/api/messages?people=1')).body.classes.find((c) => c.id === 'C1').people;
const guestEntry = ANA_KEYS.find((p) => p.guest);
check("the host's people list offers the approved guest, tagged and flagged (never for a group)", guestEntry && guestEntry.name === 'Fox T. (guest)' && guestEntry.guest === true, ANA_KEYS);
const BEN_PEOPLE = (await call(inbox.onRequestGet, BEN, '/api/messages?people=1')).body.classes.find((c) => c.id === 'C1').people;
check("...a classmate's list does not have the guest", !BEN_PEOPLE.some((p) => p.name.includes('Fox')));
const FRI3_PEOPLE = (await call(inbox.onRequestGet, FRI3, '/api/messages?people=1')).body.classes;
const ANA_KEY = FRI3_PEOPLE[0].people[0].key;
const BEN_KEY = ANA_KEYS.find((p) => p.name === 'Ben D.').key;
const send = (u, to, body) => call(inbox.onRequestPost, u, '/api/messages', {}, 'POST', { classId: 'C1', to, body });
const reply = (u, id, body) => call(msg.onRequestPost, u, `/api/messages/${id}`, { id }, 'POST', { body });
const open = (u, id) => call(msg.onRequestGet, u, `/api/messages/${id}`, { id });

r = await send(FRI3, ANA_KEY, 'hi Ana, it is Fox');
const GT = r.body.id;
check('the guest writes to their host: a direct conversation, with the line that says who reads it', r.status === 201 && r.body.kind === 'students' && r.body.note === 'A teacher of the class that invited this guest can read these messages.' && r.body.other.name === 'Ana L.', r);
r = await open(ANA, GT);
check('the host reads it, and sees the guest named as one', r.status === 200 && r.body.other.name === 'Fox T. (guest)' && r.body.messages.length === 1 && r.body.canSend === true, r.body);
r = await reply(ANA, GT, 'welcome!');
check('the host replies', r.status === 201 && r.body.messages.length === 2);
check("...and it counts as unread for the guest", (await call(inbox.onRequestGet, FRI3, '/api/messages?count=1')).body.unread === 1);
r = await send(FRI3, BEN_KEY, 'hi Ben');
check("a guest cannot write to a classmate of their host (404)", r.status === 404, r);
r = await call(inbox.onRequestPost, FRI3, '/api/messages', {}, 'POST', { classId: 'C1', create: 'group', people: [ANA_KEY], title: 'sneaky' });
check('...nor make a group, and a channel is not theirs to read or post in', r.status === 404);
const general = (await call(inbox.onRequestGet, ANA, '/api/messages')).body.threads.find((t) => t.kind === 'channel');
check('...#general is not even listed to them', !(await call(inbox.onRequestGet, FRI3, '/api/messages')).body.threads.some((t) => t.kind === 'channel') && !!general);
r = await open(FRI3, general.id);
check('...and opening it is a 404', r.status === 404);
r = await send(FRI3, ANA_KEY, 'call me at 555 201 3344');
check('the personal-details filter runs on a guest too', r.status === 400 && r.body.safety === true, r);
r = await send(BEN, guestEntry.key, 'hello guest');
check("a classmate of the host cannot write to the guest (404): the guest is the host's alone", r.status === 404, r);
r = await send(BEN, ANA_KEY, 'hi Ana');
check("(while the same classmate writing to the host is ordinary)", r.status === 201);

// teachers of the host's class read it; nobody else does
let tp = await call(teachMsgs.onRequestGet, T1, '/api/classes/C1/messages', { id: 'C1' });
const tthread = tp.body.threads.find((t) => t.id === GT);
check('a teacher of the host\'s class sees it in the class\'s conversations, with the guest named as one', !!tthread && tthread.people.includes('Fox T. (guest)') && tthread.people.includes('Ana L.'), tp.body.threads);
r = await call(teachMsgs.onRequestGet, T1, `/api/classes/C1/messages?thread=${GT}`, { id: 'C1' });
check('...and reads every message', r.status === 200 && r.body.thread.messages.length === 2);
r = await open(T1, GT);
check('...in their mailbox too, as an onlooker who cannot write', r.status === 200 && r.body.onlooker === true && r.body.canSend === false, r.body);
r = await open(T2, GT);
check("a teacher of ANOTHER class cannot (404)", r.status === 404);
r = await call(msg.onRequestPost, T1, `/api/messages/${GT}`, { id: GT }, 'POST', { action: 'remove', messageId: r2first(GT) });
function r2first(id) { return get(`SELECT id FROM messages WHERE thread_id = ? ORDER BY created_at LIMIT 1`, id).id; }
check('the teacher can Remove a message, as anywhere in messaging', r.status === 200 && r.body.messages[0].removed === true);
r = await open(FRI3, GT);
check('...and the guest sees "removed", not the words', r.body.messages[0].removed === true && r.body.messages[0].body === null);

// the HOST's level governs both directions
await call(teachMsgs.onRequestPost, T1, '/api/classes/C1/messages', { id: 'C1' }, 'POST', { action: 'student-level', student: ANA_KEYS.find((p) => p.name === 'Ben D.') && (await call(teachMsgs.onRequestGet, T1, '/api/classes/C1/messages', { id: 'C1' })).body.students.find((x) => x.name === 'Ana L.').key, level: 1 });
r = await reply(FRI3, GT, 'still there?');
check('a teacher sets the HOST to Teacher only: the guest cannot write to them either (403, plain words)', r.status === 403 && /teacher only|paused/i.test(r.body.error), r);
r = await reply(ANA, GT, 'me too');
check('...nor can the host', r.status === 403);
r = await open(FRI3, GT);
check('...but both still read', r.status === 200 && r.body.messages.length === 2 && r.body.canSend === false);
check("...and the guest's list offers no one to write to while it is on", (await call(inbox.onRequestGet, FRI3, '/api/messages?people=1')).body.classes[0].people.length === 0);
await call(teachMsgs.onRequestPost, T1, '/api/classes/C1/messages', { id: 'C1' }, 'POST', { action: 'student-level', student: (await call(teachMsgs.onRequestGet, T1, '/api/classes/C1/messages', { id: 'C1' })).body.students.find((x) => x.name === 'Ana L.').key, level: 0 });
check('back On: it works again', (await reply(FRI3, GT, 'back')).status === 201);

// ending it stops sending, not reading
await panel(T1, 'C1', { action: 'class-off' });
r = await reply(FRI3, GT, 'hello?');
check('guests switched off for the class: sending stops (403, "not set up as host and guest")', r.status === 403 && r.body.why === 'guest-ended', r);
check('...both still read what was said', (await open(FRI3, GT)).status === 200 && (await open(ANA, GT)).status === 200);
await panel(T1, 'C1', { action: 'class-on' });
check('switching it back on lets them write again', (await reply(FRI3, GT, 'hello again')).status === 201);
const rowE1 = get(`SELECT id FROM sandbox_guests WHERE guest_email = 'fri3@s.test' AND status = 'approved'`).id;
await end(ANA, rowE1);
r = await reply(ANA, GT, 'bye');
check('the host ends the guest: neither can send any more', r.status === 403 && r.body.why === 'guest-ended' && (await reply(FRI3, GT, 'bye')).status === 403);
check('...both can still read the whole conversation', (await open(FRI3, GT)).body.messages.length >= 3);
check('...and the ended guest has no one left to write to', (await call(inbox.onRequestGet, FRI3, '/api/messages?people=1')).body.classes.length === 0);
r = await send(FRI3, ANA_KEY, 'let me back in');
check('...a new message to the host is refused (403)', r.status === 403 && r.body.why === 'guest-ended');
const G2 = (await invite(ANA, 'C1', 'my cousin again')).body;
await redeem$(FRI3, G2.code);
await panel(T1, 'C1', { action: 'approve', id: G2.id });
r = await send(FRI3, ANA_KEY, 'I am back');
check('invited and approved again: the SAME conversation continues (one per pair per class)', r.status === 201 && r.body.id === GT, r.body.id);

// a guest is capped even when their account is a teacher's
const F1row = get(`SELECT id FROM sandbox_guests WHERE guest_email = 't3@s.test'`).id;
await panel(T1, 'C1', { action: 'approve', id: F1row });
const T3_KEY = (await call(inbox.onRequestGet, ANA, '/api/messages?people=1')).body.classes.find((c) => c.id === 'C1').people.find((p) => p.name.startsWith('Uma')).key;
const T3_ANA = (await call(inbox.onRequestGet, T3, '/api/messages?people=1')).body.classes[0].people[0].key;
r = await send(T3, T3_ANA, 'hello from a teacher account');
const T3T = r.body.id;
check('a teacher-role account that is a guest can message the host', r.status === 201 && r.body.note === 'A teacher of the class that invited this guest can read these messages.', r);
for (let i = 0; i < 10; i++) sql(`INSERT INTO messages (id, thread_id, author_email, body, created_at) VALUES (?, ?, 't3@s.test', 'x', ?)`, `t${String(i).padStart(31, '0')}`, T3T, Date.now());
r = await reply(T3, T3T, 'one more');
check('...but is capped like a student (429): 10 a minute', r.status === 429 && /10 messages/.test(r.body.error), r);
void T3_KEY;

// ---- 7. told in the app ----
// (section 8 approved the earlier waiting request: make a fresh one so there is something for Tess to decide)
sql(`DELETE FROM sandbox_guests WHERE guest_email = 't3@s.test'`);
const P1 = (await invite(ANA, 'C1', 'a friend from robotics')).body;
await redeem$(FRI4, P1.code);
let tn = await activity(T1);
check('Tess is asked in her Activity (until she decides), naming the host and the guest', tn.some((i) => i.audience === 'teacher' && i.state === 'pending' && i.who === 'Ana L.' && i.title === 'Fin F.' && i.classId === 'C1'), tn);
r = await send(FRI4, ANA_KEY, 'hi, I am waiting to be approved');
check('someone whose request is still waiting cannot message the host (404): nobody a teacher has not said yes to', r.status === 404, r);
check('...and has nobody to write to', (await call(inbox.onRequestGet, FRI4, '/api/messages?people=1')).body.classes.length === 0);
check("...Tom (another class) is not", (await activity(T2)).length === 0);
const hostTn = await activity(ANA);
check('Ana hears her teacher\'s decisions (approved Fri\'s earlier ask; declined once), as "Your teacher"', hostTn.some((i) => i.state === 'approved' && i.audience === 'host' && i.who === 'Your teacher') && hostTn.some((i) => i.state === 'declined' && i.audience === 'host'), hostTn);
check("...but not her own ending of a guest as if a teacher did it", !hostTn.some((i) => i.key.includes(A1.id)), hostTn.map((i) => i.key));
const gTn = await activity(FRI);
check('the guest hears the decision too, naming the host', gTn.some((i) => i.audience === 'guest' && i.state === 'declined' && i.title === 'Ana L.'), gTn);

check('no student-facing answer names an email', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
