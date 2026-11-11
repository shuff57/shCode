#!/usr/bin/env node
// Comments on class games (migration 0051): GET|POST|DELETE /api/games/[id]/comments,
// POST /api/games/[id]/feedback, the teacher's feedback switches in
// /api/classes/[id]/game-shares, and the suggestions route following the same
// switches. On a real SQLite with every migration applied. What has to hold:
//   1. a classmate who can open the game reads and writes; someone in no class
//      the game is shared into gets 404; a reply hangs off a top comment (one
//      level), even when it answers a reply;
//   2. the words are checked (empty, too long, control characters refused);
//   3. the writer and a teacher of the class delete; another classmate
//      cannot; a deleted comment with live replies stays as "deleted" with no
//      words; without replies it is gone;
//   4. the creator's switch: owner only (404 for anyone else); off closes
//      comments AND suggestions to classmates (403 to write, no comments or
//      counts sent); the creator and the class's teacher still read;
//   5. a teacher's per-game switch and class switch close it for THAT class only;
//      a student who also sees the game through another, open class can still write;
//   6. no email is ever in an answer; the list carries comment counts and switches.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); }
}

const out = join(root, '.tmp', 'game-comments-test');
const comments = compileHandler('api/games/[id]/comments.ts', join(out, 'a'));
const feedback = compileHandler('api/games/[id]/feedback.ts', join(out, 'b'));
const shares = compileHandler('api/classes/[id]/game-shares/index.ts', join(out, 'c'));
const suggest = compileHandler('api/games/[id]/suggestions.ts', join(out, 'd'));

const db = makeD1();
const env = { DB: db };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
for (const [email, first, last] of [['ana@s.test', 'Ana', 'Lopez'], ['ben@s.test', 'Ben', 'Diaz'], ['cat@s.test', 'Cat', 'Moss'], ['out@s.test', 'Out', 'Sider'], ['dee@s.test', 'Dee', 'Fox']]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, 'student', ?, ?)`, email, now, first, last);
}
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C1', 'Period 1', 'AAAAAA', 't1@s.test', '2026-2027', ?)`, now);
sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('C2', 'Period 2', 'BBBBBB', 't2@s.test', '2026-2027', ?)`, now);
// Ana (maker) and Ben in C1; Cat in C2; Dee in both.
for (const [c, e] of [['C1', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'cat@s.test'], ['C1', 'dee@s.test'], ['C2', 'dee@s.test'], ['C2', 'ana@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
sql(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('C1', 't1@s.test', 0), ('C2', 't2@s.test', 0)`);
const ANA = { email: 'ana@s.test', role: 'student' };
const BEN = { email: 'ben@s.test', role: 'student' };
const CAT = { email: 'cat@s.test', role: 'student' };
const DEE = { email: 'dee@s.test', role: 'student' };
const OUT = { email: 'out@s.test', role: 'student' };
const T1 = { email: 't1@s.test', role: 'teacher' };
const T2 = { email: 't2@s.test', role: 'teacher' };
const ADMIN = { email: 'boss@s.test', role: 'admin' };

const G = 'a'.repeat(32);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Spike Run', 'x', 'none', 1, ?, ?)`, G, now, now);
sql(`INSERT INTO library_game_shares (game_id, class_id, shared_at) VALUES (?, 'C1', ?), (?, 'C2', ?)`, G, now, G, now);

const bodies = [];
async function call(fn, user, url, params, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const list = (u) => call(comments.onRequestGet, u, `/api/games/${G}/comments`, { id: G });
const post = (u, body, parentId) => call(comments.onRequestPost, u, `/api/games/${G}/comments`, { id: G }, 'POST', parentId ? { body, parentId } : { body });
const del = (u, cid) => call(comments.onRequestDelete, u, `/api/games/${G}/comments?comment=${cid}`, { id: G }, 'DELETE');
const setFeedback = (u, on) => call(feedback.onRequestPost, u, `/api/games/${G}/feedback`, { id: G }, 'POST', { on });
const teacher = (u, cls, body) => call(shares.onRequestPost, u, `/api/classes/${cls}/game-shares`, { id: cls }, 'POST', body);
const teacherList = (u, cls) => call(shares.onRequestGet, u, `/api/classes/${cls}/game-shares`, { id: cls });
const suggestGet = (u) => call(suggest.onRequestGet, u, `/api/games/${G}/suggestions`, { id: G });
const suggestPick = (u, s) => call(suggest.onRequestPost, u, `/api/games/${G}/suggestions`, { id: G }, 'POST', { suggestion: s, on: true });

// 1. reading, writing, replies
let r = await list(BEN);
check('a classmate reads an empty list and may write', r.status === 200 && r.body.comments.length === 0 && r.body.canWrite === true && r.body.isMaker === false);
r = await list(OUT);
check('someone in no class the game is shared into gets 404', r.status === 404);
r = await post(OUT, 'hi');
check('and cannot write (404)', r.status === 404);
r = await post(BEN, 'The spikes are too fast on level 2!');
const top = r.body.comments.find((c) => c.author === 'Ben D.');
check('a classmate posts a comment; the answer is the list, named first name + last initial', r.status === 201 && top && top.mine && !top.byMaker && top.parentId === null);
r = await post(ANA, 'Thanks! I will slow them down.', top.id);
const reply = r.body.comments.find((c) => c.parentId === top.id);
check('the maker replies; the reply is marked as the maker', r.status === 201 && reply && reply.byMaker && reply.author === 'Ana L.');
r = await post(CAT, 'Agreed', reply.id);
check('a reply to a reply hangs off the same top comment (one level)', r.status === 201 && r.body.comments.filter((c) => c.parentId === top.id).length === 2);
r = await post(CAT, 'x', 'f'.repeat(32));
check('a reply to a comment that is not there is 404', r.status === 404);

// 2. the words
r = await post(BEN, '   ');
check('an empty comment is refused', r.status === 400);
r = await post(BEN, 'x'.repeat(1001));
check('a comment over 1000 characters is refused', r.status === 400 && /1000/.test(r.body.error));
r = await post(BEN, 'bad\u0007bell');
check('control characters are refused', r.status === 400);

// 3. deleting
r = await del(CAT, top.id);
check("a classmate cannot delete someone else's comment", r.status === 403);
r = await post(BEN, 'Delete me');
const lone = r.body.comments.find((c) => c.body === 'Delete me');
r = await del(BEN, lone.id);
check('the writer deletes their own; with no replies it is gone', r.status === 200 && !r.body.comments.some((c) => c.id === lone.id));
r = await del(T1, top.id);
const ghost = r.body.comments.find((c) => c.id === top.id);
check("a teacher of the class deletes anyone's; with live replies it stays, marked, without its words",
  r.status === 200 && ghost && ghost.deleted && ghost.body === null && r.body.comments.filter((c) => c.parentId === top.id).length === 2);
r = await post(BEN, 'late reply', top.id);
check('a deleted comment cannot be replied to', r.status === 409);
r = await list(T2);
check('the other class teacher moderates too (the game is shared into their class)', r.body.canModerate === true);
r = await post(ADMIN, 'admin note');
check('an admin in no class of the game cannot open it, as on every game route (visibleGame)', r.status === 404);

// 4. the creator's switch
r = await setFeedback(BEN, false);
check("only the maker holds the switch (404 for anyone else)", r.status === 404);
r = await setFeedback(T1, false);
check('a teacher does not hold the maker switch either', r.status === 404);
r = await setFeedback(ANA, false);
check('the maker turns feedback off', r.status === 200 && r.body.feedbackOn === false);
r = await list(BEN);
check('closed: a classmate gets no comments and cannot write, and is told why', r.status === 200 && r.body.comments.length === 0 && !r.body.canWrite && r.body.closed === 'creator');
r = await post(BEN, 'hello?');
check('closed: a classmate cannot post (403)', r.status === 403);
r = await list(ANA);
check('closed: the maker still reads everything', r.body.comments.length > 0 && r.body.isMaker && r.body.feedbackOn === false && !r.body.canWrite);
r = await list(T1);
check("closed: the class's teacher still reads", r.body.comments.length > 0 && r.body.canModerate);
r = await suggestGet(BEN);
check('closed: suggestions send a classmate no counts and no picking', r.status === 200 && Object.keys(r.body.counts).length === 0 && r.body.canSuggest === false && r.body.closed === 'creator');
r = await suggestPick(BEN, 'harder');
check('closed: a classmate cannot pick a suggestion (403)', r.status === 403);
r = await setFeedback(ANA, true);
r = await suggestPick(BEN, 'harder');
check('open again: suggestions and comments work again', r.status === 200 && (await list(BEN)).body.canWrite === true);

// 5. teacher switches, per class
r = await teacher(BEN, 'C1', { gameId: G, action: 'feedback-off' });
check('a student cannot use the teacher switch', r.status === 403);
r = await teacher(T1, 'C1', { gameId: G, action: 'feedback-off' });
check('a teacher turns feedback off for one game in their class', r.status === 200);
r = await list(BEN);
check('a C1 classmate is closed, told it was the teacher', !r.body.canWrite && r.body.closed === 'teacher' && r.body.comments.length === 0);
r = await list(CAT);
check('a C2 classmate is still open', r.body.canWrite === true);
r = await list(DEE);
check('a student in both classes is open through the other class', r.body.canWrite === true);
r = await teacherList(T1, 'C1');
const row1 = r.body.games.find((g) => g.id === G);
check('the class list shows feedback off and the live comment count (deleted ones not counted)', row1.feedbackOff === true && row1.comments === 2 && r.body.classFeedbackOff === false, row1);
r = await teacher(T1, 'C1', { gameId: G, action: 'feedback-on' });
r = await teacher(T2, 'C2', { action: 'class-feedback-off' });
check('a teacher turns feedback off for the whole class', r.status === 200 && r.body.classFeedbackOff === true);
r = await list(CAT);
check('a C2 classmate is closed by the class switch', !r.body.canWrite && r.body.closed === 'teacher');
r = await list(BEN);
check('C1 is untouched by C2\'s class switch', r.body.canWrite === true);
r = await teacherList(T2, 'C2');
check('the class list carries the class switch', r.body.classFeedbackOff === true);
await teacher(T2, 'C2', { action: 'class-feedback-on' });
r = await list(CAT);
check('the class switch turns back on', r.body.canWrite === true);

// 6. never an email
check('no answer carries an email', !bodies.some((b) => /@s\.test/.test(b)), bodies.find((b) => /@s\.test/.test(b))?.slice(0, 200));

console.log(`\ntest-game-comments: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
