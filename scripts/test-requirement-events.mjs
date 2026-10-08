#!/usr/bin/env node
// Drives the REAL POST /api/requirement-events and GET /api/classes/[id]/requirement-events against
// sqlite (every migration applied, including 0035). Run: node scripts/test-requirement-events.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = join(root, '.tmp-reqevents-test');
const post = compileHandler('api/requirement-events.ts', out);
const read = compileHandler('api/classes/[id]/requirement-events/index.ts', out);
const manifest = readFileSync(join(root, 'public/lessons-manifest.json'), 'utf8');
const LESSON = JSON.parse(manifest).lessons[0].id;
const LESSON2 = JSON.parse(manifest).lessons[1].id;

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

const db = makeD1();
const ASSETS = { fetch: async () => new Response(manifest, { headers: { 'Content-Type': 'application/json' } }) };
const env = { DB: db, ASSETS };
const sq = db.sqlite;
const NOW = Date.now(), FAR = 4102444800000;

const ada = 'ada@school.test', ben = 'ben@school.test', zed = 'zed@elsewhere.test', gone = 'old@school.test';
const t1 = 'teach1@school.test', t2 = 'teach2@school.test', co = 'co@school.test', adm = 'admin@school.test';
sq.exec(`INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c1','One','AAAAAA','${t1}','2026-2027',0),('c2','Two','BBBBBB','${t2}','2026-2027',0)`);
sq.exec(`INSERT INTO class_teachers (class_id, teacher_email, added_at) VALUES ('c1','${co}',0)`);
for (const [e, f, l] of [[ada, 'Ada', 'L'], [ben, 'Ben', 'F'], [zed, 'Zed', 'Z'], [gone, 'Old', 'Gone']]) {
  sq.prepare('INSERT INTO students (email, password_hash, created_at, first_name, last_name) VALUES (?,?,0,?,?)').run(e, 'x', f, l);
}
sq.exec(`INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('c1','${ada}',0,${FAR}),('c1','${ben}',0,${FAR}),('c2','${zed}',0,${FAR}),('c1','${gone}',0,${NOW - 1000})`);

async function send(email, role, body, raw) {
  const res = await post.onRequestPost({
    request: new Request('http://x.invalid/api/requirement-events', { method: 'POST', body: raw ?? JSON.stringify(body) }),
    env, data: { email, role }, params: {},
  });
  return { status: res.status, body: await res.json() };
}
async function get(email, role, classId) {
  const res = await read.onRequestGet({
    request: new Request(`http://x.invalid/api/classes/${classId}/requirement-events`),
    env, data: { email, role }, params: { id: classId },
  });
  return { status: res.status, body: await res.json() };
}
const row = (e, l, r) => sq.prepare('SELECT fails, first_pass_at FROM requirement_events WHERE student_email=? AND lesson_id=? AND req_id=?').get(e, l, r);
const count = () => sq.prepare('SELECT COUNT(*) AS n FROM requirement_events').get().n;

// ---- student writes
let r = await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 3, passed: false }, { reqId: 'r2', fails: 0, passed: true }] });
check('student post stores', [r.status, r.body], [200, { ok: true, stored: true }]);
check('fails stored, no pass yet', [row(ada, LESSON, 'r1')?.fails, row(ada, LESSON, 'r1')?.first_pass_at], [3, null]);
check('a clean first pass stores 0 fails with first_pass_at', [row(ada, LESSON, 'r2').fails, typeof row(ada, LESSON, 'r2').first_pass_at], [0, 'number']);
await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 2, passed: false }] });
check('repeated batches accumulate', row(ada, LESSON, 'r1').fails, 5);
await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 1, passed: true }] });
const firstPass = row(ada, LESSON, 'r1').first_pass_at;
check('first_pass_at set on the first pass', [row(ada, LESSON, 'r1').fails, typeof firstPass], [6, 'number']);
await new Promise((ok) => setTimeout(ok, 5));
await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 0, passed: true }] });
check('first_pass_at never moves', row(ada, LESSON, 'r1').first_pass_at, firstPass);
await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'dup', fails: 4, passed: false }, { reqId: 'dup', fails: 4, passed: false }] });
check('duplicate reqId in one batch adds both', row(ada, LESSON, 'dup').fails, 8);
sq.prepare("UPDATE requirement_events SET fails = 9995 WHERE student_email=? AND req_id='dup'").run(ada);
await send(ada, 'student', { lessonId: LESSON, results: [{ reqId: 'dup', fails: 50, passed: false }] });
check('stored fails capped at 10000', row(ada, LESSON, 'dup').fails, 10000);

// ---- who it is stored as
await send(ben, 'student', { lessonId: LESSON, email: ada, studentEmail: ada, results: [{ reqId: 'r9', fails: 1, passed: false, studentEmail: ada }] });
check('a body email is ignored: stored under the session', [row(ben, LESSON, 'r9')?.fails, row(ada, LESSON, 'r9')], [1, null]);

// ---- staff post stores nothing
const before = count();
for (const role of ['teacher', 'admin']) {
  r = await send(t1, role, { lessonId: LESSON, results: [{ reqId: 'r1', fails: 5, passed: false }] });
  check(`${role} post accepted, not stored`, [r.status, r.body, count()], [200, { ok: true, stored: false }, before]);
}

// ---- bad input
const bad = async (name, body, want = 400, raw) => {
  const b = count();
  const x = await send(ada, 'student', body, raw);
  check(`${name} -> ${want}, nothing written`, [x.status, count()], [want, b]);
};
await bad('not JSON', null, 400, '{nope');
await bad('missing lessonId', { results: [{ reqId: 'a', fails: 1, passed: false }] });
await bad('missing results', { lessonId: LESSON });
await bad('empty results', { lessonId: LESSON, results: [] });
await bad('results not an array', { lessonId: LESSON, results: 'x' });
await bad('unknown lesson', { lessonId: 'no-such-lesson', results: [{ reqId: 'a', fails: 1, passed: false }] });
await bad('61 results', { lessonId: LESSON, results: Array.from({ length: 61 }, (_, i) => ({ reqId: `q${i}`, fails: 1, passed: false })) });
await bad('reqId 81 chars', { lessonId: LESSON, results: [{ reqId: 'x'.repeat(81), fails: 1, passed: false }] });
await bad('empty reqId', { lessonId: LESSON, results: [{ reqId: '', fails: 1, passed: false }] });
await bad('fraction fails', { lessonId: LESSON, results: [{ reqId: 'a', fails: 1.5, passed: false }] });
await bad('string fails', { lessonId: LESSON, results: [{ reqId: 'a', fails: '2', passed: false }] });
await bad('negative fails', { lessonId: LESSON, results: [{ reqId: 'a', fails: -1, passed: false }] });
await bad('fails 51', { lessonId: LESSON, results: [{ reqId: 'a', fails: 51, passed: false }] });
await bad('passed missing', { lessonId: LESSON, results: [{ reqId: 'a', fails: 1 }] });
await bad('one bad entry rejects the whole batch', { lessonId: LESSON, results: [{ reqId: 'ok', fails: 1, passed: false }, { reqId: 'a', fails: 99, passed: false }] });
check('exactly 60 results accepted', (await send(ben, 'student', { lessonId: LESSON2, results: Array.from({ length: 60 }, (_, i) => ({ reqId: `m${i}`, fails: 1, passed: false })) })).status, 200);
// the per-lesson row ceiling
for (let i = 0; i < 3; i++) await send(ben, 'student', { lessonId: LESSON2, results: Array.from({ length: 60 }, (_, j) => ({ reqId: `n${i}-${j}`, fails: 1, passed: false })) });
check('a student cannot create endless rows for one lesson', (await send(ben, 'student', { lessonId: LESSON2, results: [{ reqId: 'one-more', fails: 1, passed: false }] })).status, 429);
sq.exec(`DELETE FROM requirement_events WHERE student_email='${ben}' AND lesson_id='${LESSON2}'`);

// ---- teacher read
await send(ben, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 2, passed: false }, { reqId: 'rb', fails: 1, passed: false }] });
await send(zed, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 40, passed: false }] }); // other class
await send(gone, 'student', { lessonId: LESSON, results: [{ reqId: 'r1', fails: 30, passed: false }] }); // expired enrolment
await send(ada, 'student', { lessonId: LESSON2, results: [{ reqId: 'x', fails: 1, passed: false }] });

r = await get(t1, 'teacher', 'c1');
check('owner reads their class', r.status, 200);
const emails = [...new Set(r.body.rows.map((x) => x.studentEmail))].sort();
check('only enrolled students of that class', emails, [ada, ben]);
check('rows carry names and first pass', r.body.rows.find((x) => x.studentEmail === ada && x.reqId === 'r1'), { studentEmail: ada, firstName: 'Ada', lastName: 'L', lessonId: LESSON, reqId: 'r1', fails: 6, firstPassAt: firstPass });
check('clean first passes are not listed', r.body.rows.some((x) => x.reqId === 'r2'), false);
const top = r.body.topMissed;
check('top is the biggest total', [top[0].reqId, top[1].reqId], ['dup', 'r1']);
check('r1 aggregate counts students, fails, and who is not past it', top.find((x) => x.reqId === 'r1'), { lessonId: LESSON, reqId: 'r1', studentsFailed: 2, totalFails: 8, studentsNotPast: 1 });
check('ties break on lesson then requirement id', top.slice(2).map((x) => `${x.lessonId === LESSON ? 'L1' : 'L2'}/${x.reqId}`), ['L1/r9', 'L1/rb', 'L2/x']);
check('other class and expired totals excluded', top.find((x) => x.reqId === 'r1').totalFails, 8);

// topMissed limit
sq.exec(`DELETE FROM requirement_events`);
for (let b = 0; b < 2; b++) await send(ada, 'student', { lessonId: LESSON, results: Array.from({ length: 15 }, (_, i) => ({ reqId: `t${b}-${i}`, fails: i + 1, passed: false })) });
r = await get(t1, 'teacher', 'c1');
check('topMissed limited to 20, largest first', [r.body.topMissed.length, r.body.topMissed[0].totalFails, r.body.topMissed[19].totalFails], [20, 15, 6]);

// ---- access
check('co-teacher allowed', (await get(co, 'teacher', 'c1')).status, 200);
check('admin allowed on any class', (await get(adm, 'admin', 'c1')).status, 200);
check('teacher of another class refused', (await get(t2, 'teacher', 'c1')).status, 403);
check('an unrelated student refused', (await get(zed, 'student', 'c1')).status, 403);
check('an enrolled student refused', (await get(ada, 'student', 'c1')).status, 403);
check('unknown class 404', (await get(t1, 'teacher', 'nope')).status, 404);
r = await get(t2, 'teacher', 'c2');
check('class two sees only its own student', [...new Set(r.body.rows.map((x) => x.studentEmail))], []);

console.log(`test-requirement-events: ${n} checks`);
rmSync(out, { recursive: true, force: true });
