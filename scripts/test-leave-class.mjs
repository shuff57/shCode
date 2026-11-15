#!/usr/bin/env node
// A student leaves a class (functions/api/leave-class.ts), on a real SQLite with every migration, through the real
// handlers. What has to hold:
//   1. students only; a class they are not in (or a bad id) is refused, and nothing changes;
//   2. leaving deletes only that enrollment; their other classes stay; they can join again with the code;
//   3. what they shared with just that class leaves it (others in it stop seeing it, other classes still do);
//   4. a share with "all of <teacher>'s classes" survives leaving ONE of that teacher's classes and ends, with the
//      remembered teacher, when they leave the last one;
//   5. lesson progress is not touched; no answer carries an email.

import { join } from 'node:path';
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ` -- ${JSON.stringify(detail).slice(0, 500)}` : ''}`); }
}

const out = join(root, '.tmp', 'leave-class-test');
const leave = compileHandler('api/leave-class.ts', join(out, 'a'));
const joinC = compileHandler('api/join-class.ts', join(out, 'b'));
const mine = compileHandler('api/my-enrollments.ts', join(out, 'c'));
const lib = compileHandler('api/library/index.ts', join(out, 'd'));
const share = compileHandler('api/library/[id]/share.ts', join(out, 'e'));
const shared = compileHandler('api/library/shared/index.ts', join(out, 'f'));
const games = compileHandler('api/games/[id]/share.ts', join(out, 'g'));
const aud = compileHandler('api/audiences.ts', join(out, 'h'));

const db = makeD1();
const r2 = new Map();
const env = { DB: db, UPLOADS: {
  async put(k, v) { r2.set(k, String(v)); },
  async get(k) { return r2.has(k) ? { text: async () => r2.get(k) } : null; },
  async delete(k) { r2.delete(k); },
} };
const now = Date.now();
const FAR = now + 1e10;
const sql = (q, ...a) => db.sqlite.prepare(q).run(...a);
const all = (q, ...a) => db.sqlite.prepare(q).all(...a);
for (const [email, first, last, role] of [
  ['ana@s.test', 'Ana', 'Lopez', 'student'], ['ben@s.test', 'Ben', 'Diaz', 'student'], ['dee@s.test', 'Dee', 'Hill', 'student'],
  ['t1@s.test', 'Tess', 'Ward', 'teacher'], ['t2@s.test', 'Tom', 'Reed', 'teacher'],
]) {
  sql(`INSERT INTO students (email, password_hash, created_at, role, first_name, last_name) VALUES (?, 'x', ?, ?, ?, ?)`, email, now, role, first, last);
}
const mkClass = (id, name, code, owner) => sql(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES (?, ?, ?, ?, '2026-2027', ?)`, id, name, code, owner, now);
mkClass('C1', 'Period 1', 'AAAAAA', 't1@s.test');
mkClass('C3', 'Period 3', 'CCCCCC', 't1@s.test');
mkClass('C2', 'Robotics', 'BBBBBB', 't2@s.test');
for (const [c, e] of [['C1', 'ana@s.test'], ['C3', 'ana@s.test'], ['C2', 'ana@s.test'], ['C1', 'ben@s.test'], ['C2', 'dee@s.test']]) {
  sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES (?, ?, ?, ?)`, c, e, now, FAR);
}
sql(`INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at) VALUES ('ana@s.test', '1-1-1', 'completed', ?, ?)`, now, now);
const U = (email, role = 'student') => ({ email, role });
const ANA = U('ana@s.test'), BEN = U('ben@s.test'), DEE = U('dee@s.test'), T1 = U('t1@s.test', 'teacher');

const bodies = [];
async function call(fn, user, url, params = {}, method = 'GET', body) {
  const res = await fn({
    env, data: user, params,
    request: new Request(`https://x.test${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  const text = await res.text();
  // my-enrollments has always carried the class owner's email to the students in that class; it is not under test here
  if (!url.startsWith('/api/my-enrollments')) bodies.push(text);
  return { status: res.status, body: JSON.parse(text) };
}
const leave$ = (u, classId) => call(leave.onRequestPost, u, '/api/leave-class', {}, 'POST', classId === undefined ? {} : { classId });
const inClasses = async (u) => (await call(mine.onRequestGet, u, '/api/my-enrollments')).body.enrollments.map((e) => e.class_id).sort().join(',');
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48]).toString('base64');
const rowsFor = (id) => all(`SELECT class_id FROM library_shares WHERE item_id = ? ORDER BY class_id`, id).map((r) => r.class_id).join(',');
const gRowsFor = (id) => all(`SELECT class_id FROM library_game_shares WHERE game_id = ? ORDER BY class_id`, id).map((r) => r.class_id).join(',');
const seesItem = async (u, id) => ((await call(shared.onRequestGet, u, '/api/library/shared')).body.items ?? []).some((i) => i.id === id);

// ---- 1. who may, and what is refused ----
let r = await leave$(T1, 'C1');
check('a teacher cannot use it (403)', r.status === 403);
r = await leave$(ANA);
check('no class chosen is refused (400)', r.status === 400);
r = await leave$(ANA, 'NOPE');
check('a class she is not in is a 404 and nothing changes', r.status === 404 && (await inClasses(ANA)) === 'C1,C2,C3');
r = await leave$(BEN, 'C2');
check("someone else's class reads the same (404)", r.status === 404 && (await inClasses(DEE)) === 'C2');
sql(`UPDATE enrollments SET expires_at = ? WHERE class_id = 'C2' AND student_email = 'dee@s.test'`, now - 1000);
r = await leave$(DEE, 'C2');
check('an enrollment that already ended has nothing to leave (404)', r.status === 404);
sql(`UPDATE enrollments SET expires_at = ? WHERE class_id = 'C2' AND student_email = 'dee@s.test'`, FAR);

// ---- 3. shares with just some classes ----
const saved = await call(lib.onRequestPut, ANA, '/api/library', {}, 'PUT', { kind: 'texture', name: 'dragon', dataUri: PNG, meta: null });
const ID = saved.body.item.id;
const share$ = (id, body) => call(share.onRequestPost, ANA, `/api/library/${id}/share`, { id }, 'POST', body);
await share$(ID, { share: true, audience: { classes: ['C1', 'C2'] } });
check('Ben (Period 1) sees what she shared', (await seesItem(BEN, ID)) === true && (await seesItem(DEE, ID)) === true);
r = await leave$(ANA, 'C1');
check('she leaves Period 1: the answer names the class, no email', r.status === 200 && r.body.left.class_name === 'Period 1' && !JSON.stringify(r.body).includes('@'));
check('...only that enrollment goes; Period 3 and Robotics stay', (await inClasses(ANA)) === 'C2,C3');
check('...what she shared with Period 1 leaves it; Robotics still has it', rowsFor(ID) === 'C2' && (await seesItem(BEN, ID)) === false && (await seesItem(DEE, ID)) === true);
check('...her lesson progress is untouched', all(`SELECT state FROM lesson_state WHERE student_email = 'ana@s.test'`)[0]?.state === 'completed');
r = await leave$(ANA, 'C1');
check('leaving a class twice is a 404, harmless', r.status === 404);

// ---- 2. she can come back ----
r = await call(joinC.onRequestPost, ANA, '/api/join-class', {}, 'POST', { code: 'AAAAAA' });
check('the class code lets her back in', r.status === 201 && (await inClasses(ANA)) === 'C1,C2,C3', r);
check('...but nothing she shared comes back by itself', rowsFor(ID) === 'C2');

// ---- 4. teacher-wide shares ----
r = await call(aud.onRequestGet, ANA, '/api/audiences');
const T1_K = r.body.teachers.find((t) => t.name === 'Tess W.').key;
r = await share$(ID, { share: true, audience: { teacher: T1_K } });
check('she shares with all of Tess\'s classes', r.status === 200 && rowsFor(ID) === 'C1,C3' && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === 't1@s.test', r);
await leave$(ANA, 'C1');
check('leaving ONE of that teacher\'s classes keeps a teacher-wide share whole (Period 1 stays in it for when she is back)',
  rowsFor(ID) === 'C1,C3' && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === 't1@s.test' && (await seesItem(BEN, ID)) === true);
const GID = 'b'.repeat(32);
sql(`INSERT INTO library_games (id, owner_email, title, code, mode, players, created_at, updated_at) VALUES (?, 'ana@s.test', 'Dodge', 'let x = 1;', 'none', 1, ?, ?)`, GID, now, now);
r = await call(games.onRequestPost, ANA, `/api/games/${GID}/share`, { id: GID }, 'POST', { share: true, audience: { teacher: T1_K } });
check('a game shared with all of Tess\'s classes', r.status === 200 && gRowsFor(GID) === 'C1,C3', r);
r = await leave$(ANA, 'C3');
check('leaving her LAST class with Tess ends both teacher-wide shares: every row and the remembered teacher',
  r.status === 200 && rowsFor(ID) === '' && gRowsFor(GID) === ''
  && all(`SELECT audience_teacher FROM library_items WHERE id = ?`, ID)[0].audience_teacher === null
  && all(`SELECT audience_teacher FROM library_games WHERE id = ?`, GID)[0].audience_teacher === null);
check('...and she is still in Robotics', (await inClasses(ANA)) === 'C2');
check("...Ben no longer sees it", (await seesItem(BEN, ID)) === false);
await share$(ID, { share: true });
check('a share she makes afterwards is an ordinary one (Robotics only)', rowsFor(ID) === 'C2');
r = await leave$(ANA, 'C2');
check('leaving her last class leaves her with none, and nothing shared', r.status === 200 && (await inClasses(ANA)) === '' && rowsFor(ID) === '');

// ---- 6. an ended enrollment does not lock a student out (join-class used to answer "already enrolled") ----
sql(`INSERT INTO enrollments (class_id, student_email, enrolled_at, enrolled_by, expires_at) VALUES ('C1', 'dee@s.test', ?, 't1@s.test', ?)`, now - 4e10, now - 1000);
r = await call(joinC.onRequestPost, DEE, '/api/join-class', {}, 'POST', { code: 'AAAAAA' });
const dee1 = all(`SELECT enrolled_at, enrolled_by, expires_at FROM enrollments WHERE class_id = 'C1' AND student_email = 'dee@s.test'`)[0];
check('a student whose enrollment ended rejoins with the class code', r.status === 201 && (await inClasses(DEE)) === 'C1,C2', r);
check('...with fresh dates, self-enrolled, and still ONE row', dee1.expires_at > now && dee1.enrolled_at >= now && dee1.enrolled_by === null && all(`SELECT COUNT(*) AS n FROM enrollments WHERE class_id = 'C1' AND student_email = 'dee@s.test'`)[0].n === 1, dee1);
r = await call(joinC.onRequestPost, DEE, '/api/join-class', {}, 'POST', { code: 'AAAAAA' });
check('an ACTIVE enrollment still answers "already enrolled" (409) and changes nothing', r.status === 409 && all(`SELECT enrolled_at FROM enrollments WHERE class_id = 'C1' AND student_email = 'dee@s.test'`)[0].enrolled_at === dee1.enrolled_at, r);
r = await call(joinC.onRequestPost, DEE, '/api/join-class', {}, 'POST', { code: 'ZZZZZZ' });
check('a code that is not a class is still a 404', r.status === 404);

check('no answer names an email', !bodies.some((b) => /@s\.test/.test(b)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
