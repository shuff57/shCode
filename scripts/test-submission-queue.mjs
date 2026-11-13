#!/usr/bin/env node
// Tests the teacher review queue's GET (functions/api/classes/[id]/submission-queue): a row that
// needs a human (the grader-outage marker, no score yet) is always listed, first, however many
// routine rows came after it, and the total stays capped.
//
// The bug this guards: the queue was "the 50 most recent graded rows", so 25 students x 8 routine
// code labs pushed an older outage row off the end and the teacher never saw it.
//
// Compiles the REAL handler (and its real imports) to CJS and drives it against an in-memory
// SQLite (node:sqlite) behind a small D1-shaped shim, so the SQL itself is exercised, json_type
// included. Also checks the pure ordering rules in lib/submission-queue-order.ts.
//
// Run: node scripts/test-submission-queue.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = mkdtempSync(join(tmpdir(), 'shcode-queue-test-'));
const ENTRY = 'functions/api/classes/[id]/submission-queue/index.ts';

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

const tsc = spawnSync('node', [
  join(root, 'node_modules/typescript/bin/tsc'), join(root, ENTRY),
  '--outDir', outDir, '--rootDir', root, '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule',
  '--types', '@cloudflare/workers-types',
], { cwd: root, encoding: 'utf8' });
const log = `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`;
if (log.includes('submission-queue')) { console.error('FAIL: tsc reported an error in the handler:\n' + log.trim()); process.exit(1); }
writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');
const handlerJs = join(outDir, ENTRY.replace(/\.ts$/, '.js'));
if (!existsSync(handlerJs)) { console.error(`FAIL: tsc did not emit ${handlerJs}\n${log}`); process.exit(1); }
const { onRequestGet } = require(handlerJs);
const Q = require(join(outDir, 'lib/submission-queue-order.js'));
const TD = await import('../lib/teacher-drawer.ts');

// ---- D1 shim over node:sqlite ------------------------------------------------
function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
        async first() { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
        async run() { db.prepare(sql).run(...args); return { success: true }; },
      };
      return stmt;
    },
  };
}

const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE classes (id TEXT PRIMARY KEY, owner_email TEXT);
  CREATE TABLE class_teachers (class_id TEXT, teacher_email TEXT);
  CREATE TABLE enrollments (class_id TEXT, student_email TEXT, expires_at INTEGER);
  CREATE TABLE lesson_submissions (id TEXT PRIMARY KEY, student_email TEXT, lesson_id TEXT, response TEXT,
    grade_json TEXT, score REAL, possible REAL, submitted_at INTEGER, due_at_submit INTEGER);
  CREATE TABLE lesson_state (student_email TEXT, lesson_id TEXT, state TEXT, started_at INTEGER, completed_at INTEGER, score REAL);
  INSERT INTO classes VALUES ('C1', 't@x');
`);
const FAR = 4102444800000;
for (let s = 0; s < 25; s++) db.prepare('INSERT INTO enrollments VALUES (?, ?, ?)').run('C1', `s${s}@x`, FAR);
db.prepare('INSERT INTO enrollments VALUES (?, ?, ?)').run('OTHER', 'stranger@x', FAR);

const ins = db.prepare('INSERT INTO lesson_submissions VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)');
const routineJson = JSON.stringify({ results: [{ status: 'passed' }] });
// The older outage row first (t = 1000), then 60 routine code-lab rows after it.
ins.run('fail-old', 's3@x', 'lab-x', 'my answer', JSON.stringify({ gradingFailed: true, error: 'timeout' }), null, null, 1000);
for (let i = 0; i < 60; i++) ins.run(`r${i}`, `s${i % 25}@x`, `lab-${i % 8}`, 'code', routineJson, 0, 0, 2000 + i);
// Not needing a human: an outage row a teacher has since marked, a malformed blob, a lookalike key,
// and an outage row of a student not in this class.
ins.run('fail-marked', 's4@x', 'lab-x', 'a', JSON.stringify({ gradingFailed: true, teacherOverriddenAt: 5 }), 3, null, 900);
ins.run('bad-json', 's5@x', 'lab-x', 'a', '{not json', null, null, 800);
ins.run('lookalike', 's6@x', 'lab-x', 'a', JSON.stringify({ GRADINGFAILED: true }), null, null, 700);
ins.run('stranger-fail', 'stranger@x', 'lab-x', 'a', JSON.stringify({ gradingFailed: true }), null, null, 600);

async function get(email = 't@x', role = 'teacher') {
  const res = await onRequestGet({
    env: { DB: d1(db) }, data: { email, role }, params: { id: 'C1' },
    request: new Request('https://example.test/api/classes/C1/submission-queue'),
  });
  return { status: res.status, body: await res.json() };
}

const r1 = await get();
const ids = r1.body.submissions.map((s) => s.id);
check('GET answers 200', r1.status, 200);
check('the older outage row is still returned past 60 routine rows', ids.includes('fail-old'), true);
check('and it comes first', ids[0], 'fail-old');
check('routine rows are capped at 50, newest first', ids.slice(1, 4), ['r59', 'r58', 'r57']);
check('total is 51 (1 needing a human + 50 routine)', ids.length, 51);
check('a marked outage row is routine (and too old to be in the newest 50)', ids.includes('fail-marked'), false);
check('a malformed blob is not treated as needing a human', ids.includes('bad-json'), false);
check('a lookalike key is not treated as needing a human', ids.includes('lookalike'), false);
check('another class’s student never appears', ids.includes('stranger-fail'), false);
check('response shape: submissions carry limit and capped', ['limit', 'capped'].every((k) => k in r1.body.submissions[0]), true);
check('a non-manager is refused', (await get('nobody@x', 'teacher')).status, 403);

// Many rows needing a human: all of them first, the total still capped.
for (let i = 0; i < 120; i++) ins.run(`f${i}`, `s${i % 25}@x`, 'lab-x', 'a', JSON.stringify({ gradingFailed: true }), null, null, 100 + i);
const r2 = await get();
const ids2 = r2.body.submissions.map((s) => s.id);
check('total never exceeds the cap', ids2.length, Q.QUEUE_TOTAL_CAP);
check('with more than the cap needing a human, every listed row needs a human', ids2.every((id) => id.startsWith('f')), true);

// ---- the assignment brief (prompt + rubric) the Today queue shows -------------
// Fresh rows for real catalog lessons: a written part, a capped strict PA part, and the unknown 'lab-x'.
db.exec("DELETE FROM lesson_submissions");
const WRITTEN = '1-1-22-a1-2-describe-lifecycle', LAB = '1-2-28-a1-2-1-fix-ten-declarations', PA = '1-6-1-ch1-pa-design-chart';
ins.run('w1', 's1@x', WRITTEN, 'my essay', JSON.stringify({ criteria: [] }), 3, 4, 5000);
ins.run('w2', 's2@x', WRITTEN, 'other essay', JSON.stringify({ criteria: [] }), 4, 4, 5001);
ins.run('l1', 's1@x', LAB, 'code', JSON.stringify({ gradingFailed: true }), null, null, 5002);
ins.run('p1', 's2@x', PA, 'plan', JSON.stringify({ criteria: [] }), 1, 3, 5003);
ins.run('u1', 's3@x', 'lab-x', 'code', JSON.stringify({ criteria: [] }), 1, 1, 5004);
db.prepare('INSERT INTO classes VALUES (?, ?)').run('C2', 'other@x');
const r3 = await get();
const A = r3.body.assignments ?? {};
check('the teacher of the class gets an assignments map', typeof A, 'object');
check('one brief per listed lesson, unknown lesson absent (fails closed)', Object.keys(A).sort(), [LAB, PA, WRITTEN].sort());
check('written part: the prompt is the task the student read', /four framework activities/.test(A[WRITTEN].prompt), true);
check('written part: criteria carry title and points', A[WRITTEN].rubric.every((c) => typeof c.title === 'string' && c.title && typeof c.points === 'number'), true);
check('lab part: the model instructions are cut, the task stays',
  [/Several declarations are missing/.test(A[LAB].prompt), /You cannot run their code/.test(A[LAB].prompt)], [true, false]);
check('a graded test part drops criterion descriptions (they name the answers)', A[PA].rubric.some((c) => 'description' in c), false);
check('a brief holds only prompt and rubric', Object.values(A).every((b) => JSON.stringify(Object.keys(b).sort()) === '["prompt","rubric"]'), true);
const ALLOWED = new Set(['id', 'title', 'points', 'description', 'required']);
check('a criterion holds no check, model, gate or other server-only field',
  Object.values(A).every((b) => b.rubric.every((c) => Object.keys(c).every((k) => ALLOWED.has(k)))), true);
const raw = JSON.stringify(r3.body);
check('no solution, pseudocode, answer key, model or context docs anywhere in the response',
  ['"solution', '"pseudocode', '"answers"', '"answerKey', '"model"', '"contextDocs"', '"gate"', '"check"'].filter((k) => raw.includes(k)), []);
check('a student is refused', (await get('s1@x', 'student')).status, 403);
check('a student is never sent a brief', 'assignments' in (await get('s1@x', 'student')).body, false);
check('the teacher of another class is refused', (await get('other@x', 'teacher')).status, 403);
db.prepare('INSERT INTO class_teachers VALUES (?, ?)').run('C1', 'co@x');
check('a co-teacher gets the briefs', Object.keys((await get('co@x', 'teacher')).body.assignments ?? {}).length, 3);
check('an admin gets the briefs', Object.keys((await get('admin@x', 'admin')).body.assignments ?? {}).length, 3);
{
  const res = await onRequestGet({ env: { DB: d1(db) }, data: { email: 't@x', role: 'teacher' }, params: { id: 'NOPE' },
    request: new Request('https://example.test/api/classes/NOPE/submission-queue') });
  check('an unknown class is 404', res.status, 404);
}
// A prompt written to the model ("The student wrote pseudocode ...") is never shown as the assignment:
// the lesson's own description is (ux1 G5).
check('PA part: the grader instructions are not the assignment', /^\s*The student\b/.test(A[PA].prompt), false);
check('PA part: the lesson description is', /Pick one of four problems/.test(A[PA].prompt), true);
check('no listed brief begins with the model-addressed "The student"', Object.values(A).some((b) => /^\s*The student\b/.test(b.prompt)), false);

// ---- ?briefs= : the drawer's rubric lookup -----------------------------------
async function briefs(q, email = 't@x', role = 'teacher') {
  const res = await onRequestGet({ env: { DB: d1(db) }, data: { email, role }, params: { id: 'C1' },
    request: new Request(`https://example.test/api/classes/C1/submission-queue?briefs=${encodeURIComponent(q)}`) });
  return { status: res.status, body: await res.json() };
}
{
  const b = await briefs(`${PA},${LAB},lab-x,__proto__`);
  check('briefs: known lessons only, unknown and prototype names absent', Object.keys(b.body.assignments).sort(), [LAB, PA].sort());
  check('briefs: no submissions in the answer', 'submissions' in b.body, false);
  check('briefs: a student is refused', (await briefs(PA, 's1@x', 'student')).status, 403);
  check('briefs: another class’s teacher is refused', (await briefs(PA, 'other@x', 'teacher')).status, 403);
  check('briefs: at most 20 ids are looked up', Object.keys((await briefs(Array(30).fill(PA).map((p, i) => (i < 25 ? `x${i}` : p)).join(','))).body.assignments).length, 0);
}

// ---- one card per student and lesson, ordered by whether the score counts ----
{
  const F = JSON.stringify({ gradingFailed: true }), R = JSON.stringify({ results: [] });
  const sub = (id, s, l, t, score, g = R) => ({ id, student_email: s, lesson_id: l, submitted_at: t, score, grade_json: g });
  const cards = Q.collapseQueue([sub('a2', 'ben', 'pa', 12, 1.5), sub('a1', 'ben', 'pa', 11, 1.5), sub('d', 'dev', 'lab', 5, null, F), sub('q', 'ada', 'quiz', 9, 4)]);
  check('collapse: two tries of one part are one card, the newest', cards.map((c) => [c.key, c.row.id, c.others]), [['ben|pa', 'a2', 1], ['dev|lab', 'd', 0], ['ada|quiz', 'q', 0]]);
  const mixed = Q.collapseQueue([sub('new', 'ben', 'pa', 20, 2), sub('old', 'ben', 'pa', 10, null, F)]);
  check('collapse: the hand-in that needs a human wins over a newer graded one', [mixed[0].row.id, mixed[0].others], ['old', 1]);
  const counts = (c) => c.key !== 'dev|lab';
  check('order: cards whose score does not count go last', Q.orderCards(cards, counts).map((c) => c.key), ['ben|pa', 'ada|quiz', 'dev|lab']);
  const urgent = (c) => Q.needsHuman(c.row);
  check('order: a card needing a score leads, counted before practice, then the rest',
    Q.orderCards([...cards, { key: 'eli|lab2', row: sub('e', 'eli', 'lab2', 30, null, F) }], counts, [], urgent).map((c) => c.key),
    ['eli|lab2', 'dev|lab', 'ben|pa', 'ada|quiz']);
  check('order: a reload keeps the order on screen, new cards first',
    Q.orderCards([...cards, { key: 'eli|x' }], () => true, ['dev|lab', 'ada|quiz', 'ben|pa']).map((c) => c.key), ['eli|x', 'dev|lab', 'ada|quiz', 'ben|pa']);
}

// ---- the pure ordering rules -----------------------------------------------
const row = (id, t, score, g) => ({ id, submitted_at: t, score, grade_json: g });
const F = JSON.stringify({ gradingFailed: true });
const R = JSON.stringify({ results: [] });
check('needsHuman: marker and no score', Q.needsHuman(row('a', 1, null, F)), true);
check('needsHuman: marker but scored', Q.needsHuman(row('a', 1, 0, F)), false);
check('needsHuman: routine', Q.needsHuman(row('a', 1, null, R)), false);
check('needsHuman: malformed', Q.needsHuman(row('a', 1, null, '{')), false);
check('orderQueue: no duplicate when a pending row is also in recent',
  Q.orderQueue([row('p', 5, null, F)], [row('x', 9, 0, R), row('p', 5, null, F)]).map((r) => r.id), ['p', 'x']);
check('orderQueue: a needing-human row inside recent moves up, newest first',
  Q.orderQueue([row('p', 5, null, F)], [row('x', 9, 0, R), row('q', 8, null, F)]).map((r) => r.id), ['q', 'p', 'x']);
check('orderQueue: routine cap and total cap',
  Q.orderQueue([row('p', 5, null, F)], [row('x', 9, 0, R), row('y', 8, 0, R), row('z', 7, 0, R)], 3, 5).map((r) => r.id), ['p', 'x', 'y']);

// ---- ux2 T1: each row says the student's lesson state, so the card can say a score does not count yet ----
{
  db.exec('DELETE FROM lesson_submissions');
  ins.run('st1', 's1@x', PA, 'plan', JSON.stringify({ criteria: [] }), 1.5, 3, 6000);
  ins.run('st2', 's2@x', WRITTEN, 'essay', JSON.stringify({ criteria: [] }), 4, 4, 6001);
  ins.run('st3', 's3@x', LAB, 'code', JSON.stringify({ gradingFailed: true }), null, null, 6002);
  db.prepare('INSERT INTO lesson_state VALUES (?, ?, ?, 1, NULL, 1.5)').run('s1@x', PA, 'started');
  db.prepare('INSERT INTO lesson_state VALUES (?, ?, ?, 1, 2, 4)').run('s2@x', WRITTEN, 'completed');
  db.prepare('INSERT INTO lesson_state VALUES (?, ?, ?, 1, 2, 4)').run('stranger@x', PA, 'completed');
  const r = await get();
  const by = Object.fromEntries(r.body.submissions.map((x) => [x.id, x]));
  check('lessonState: started, completed, and none (no row yet)', [by.st1.lessonState, by.st2.lessonState, by.st3.lessonState], ['started', 'completed', null]);
  check('pastDue: a class with no due dates is never past due', [by.st1.pastDue, by.st2.pastDue, by.st3.pastDue], [false, false, false]);
}

// ---- ux2 T3b: a quiz hand-in's questions, options and key, for the teacher only ----
{
  const QUIZ = '1-1-18-same-framework';
  db.exec('DELETE FROM lesson_submissions');
  ins.run('qz', 's1@x', QUIZ, JSON.stringify({ answers: { 'q1-four-ps-named': 2 } }), JSON.stringify({ quiz: [{ id: 'q1-four-ps-named', picked: 2, correct: true }] }), 5, 5, 7000);
  const r = await get();
  const quiz = r.body.quizzes?.[QUIZ];
  check('quizzes: the listed quiz has its questions', Array.isArray(quiz?.questions) && quiz.questions.length > 0, true);
  const q1 = quiz.questions.find((q) => q.id === 'q1-four-ps-named');
  check('quizzes: a question carries its text, every option and the key index', [typeof q1.question, q1.options.length, q1.options[q1.answer]], ['string', 4, 'Problem, project, people, product']);
  check('quizzes: only listed quiz lessons are sent', Object.keys(r.body.quizzes), [QUIZ]);
  check('quizzes: a student is refused (never sent a key)', [(await get('s1@x', 'student')).status, 'quizzes' in (await get('s1@x', 'student')).body], [403, false]);
  check('quizzes: another class’s teacher is refused', (await get('other@x', 'teacher')).status, 403);
  const b = await briefs(`${QUIZ},__proto__,lab-x`);
  check('briefs: the drawer gets the quiz content by id, unknown and prototype names absent', Object.keys(b.body.quizzes), [QUIZ]);
  check('briefs: a student asking for quiz content is refused', (await briefs(QUIZ, 's1@x', 'student')).status, 403);
}

// ---- ux2 T2: the intro says the order the cards are in ----
{
  const F2 = JSON.stringify({ gradingFailed: true }), R2 = JSON.stringify({ results: [] });
  const card = (key, needs, countsNow) => ({ key, row: { id: key, score: needs ? null : 1, grade_json: needs ? F2 : R2 }, countsNow });
  const list = [card('scored-practice', false, false), card('need-practice', true, false), card('scored-counts', false, true), card('need-counts', true, true)];
  const ordered = Q.orderCards(list, (c) => c.countsNow, [], (c) => Q.needsHuman(c.row)).map((c) => c.key);
  check('order: needs a score AND counts, then needs a score but does not count, then scored (counting first)',
    ordered, ['need-counts', 'need-practice', 'scored-counts', 'scored-practice']);
  check('intro: both kinds needing a score, in that order',
    Q.queueIntro(4, 1, 1),
    '4 recent submissions, one per student and lesson. 2 need your score and are listed first: the 1 whose score changes the grade, then the 1 whose score does not change the grade right now. Work that already has a score comes after.');
  check('intro: only a card whose score does not count needs a score (the walker’s case): it says so, never "listed after"',
    Q.queueIntro(9, 0, 1),
    '9 recent submissions, one per student and lesson. 1 needs your score and is listed first, though its score does not change the grade right now. Work that already has a score comes after.');
  check('intro: nothing needs a score', Q.queueIntro(1, 0, 0), '1 recent submission, one per student and lesson. Every one has a score; change it below if you disagree. The ones whose score changes the grade are listed first.');
  check('intro: no em dash', /\u2014/.test(Q.queueIntro(4, 1, 1) + Q.queueIntro(2, 0, 2)), false);
  // ux3 (rewalk2 T1): after a Save the scored card keeps its place, so the intro must not claim the order.
  check('intro: a just-scored card held in place, nothing else needs a score',
    Q.queueIntro(6, 0, 0, true),
    '6 recent submissions, one per student and lesson. Every one has a score; change it below if you disagree. Cards you just scored stay where they are until you reload the page.');
  check('intro: held in place while others still need a score',
    Q.queueIntro(6, 1, 0, true).endsWith('Work that already has a score comes after. Cards you just scored stay where they are until you reload the page.'), true);
  // Held in place = the order on screen differs from the order the intro describes.
  const graded = list.map((c) => c.key === 'need-practice' ? card('need-practice', false, false) : c);
  const shown = Q.orderCards(graded, (c) => c.countsNow, ordered, (c) => Q.needsHuman(c.row)).map((c) => c.key);
  const natural = Q.orderCards(graded, (c) => c.countsNow, [], (c) => Q.needsHuman(c.row)).map((c) => c.key);
  check('a saved card stays where it was', shown, ordered);
  check('...which is not the order a reload gives', natural.join() !== shown.join(), true);
}
{
  // ux3 (rewalk2 T4/T8): newest try vs the score the grade reads.
  const fmt = (n) => `${n} / 5`;
  const base = { lessonState: 'completed', newest: true, hasCountNote: false, fmt };
  check('counted: newest 4, best 5', TD.countedScoreNote({ ...base, rowScore: 4, stateScore: 5 }),
    { chip: 'Counts: 5 / 5 (best try)', note: 'Newest try: 4 / 5. Counts toward the grade: best try, 5 / 5.' });
  check('counted: the teacher chose a lower score', TD.countedScoreNote({ ...base, rowScore: 5, stateScore: 3, stateOverride: true }).note,
    'Newest try: 5 / 5. Counts toward the grade: your chosen score, 3 / 5.');
  check('counted: same score says nothing', TD.countedScoreNote({ ...base, rowScore: 5, stateScore: 5 }), null);
  check('counted: not finished says nothing (the count note speaks)', TD.countedScoreNote({ ...base, lessonState: 'started', rowScore: 4, stateScore: 5 }), null);
  check('counted: practice says nothing', TD.countedScoreNote({ ...base, hasCountNote: true, rowScore: 4, stateScore: 5 }), null);
  check('counted: unknown stored score says nothing', TD.countedScoreNote({ ...base, rowScore: 4, stateScore: null }), null);
}

// ---- ux2 review: staff on a roster are in NO student list of needs-attention (one helper, classStaff.ts) ----
{
  const NA = 'functions/api/classes/[id]/needs-attention.ts';
  const t2 = spawnSync('node', [
    join(root, 'node_modules/typescript/bin/tsc'), join(root, NA),
    '--outDir', outDir, '--rootDir', root, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule',
    '--types', '@cloudflare/workers-types',
  ], { cwd: root, encoding: 'utf8' });
  if (`${t2.stdout ?? ''}${t2.stderr ?? ''}`.includes('needs-attention')) { console.error('FAIL: tsc error in needs-attention:\n' + t2.stdout + t2.stderr); process.exit(1); }
  const NAget = require(join(outDir, NA.replace(/\.ts$/, '.js'))).onRequestGet;
  const S = require(join(outDir, 'functions/_shared/classStaff.js'));
  const ndb = new DatabaseSync(':memory:');
  ndb.exec(`
    CREATE TABLE classes (id TEXT PRIMARY KEY, owner_email TEXT, archived_at INTEGER);
    CREATE TABLE class_teachers (class_id TEXT, teacher_email TEXT);
    CREATE TABLE students (email TEXT PRIMARY KEY, role TEXT NOT NULL DEFAULT 'student');
    CREATE TABLE enrollments (class_id TEXT, student_email TEXT, enrolled_at INTEGER, expires_at INTEGER);
    CREATE TABLE lesson_state (student_email TEXT, lesson_id TEXT, state TEXT, started_at INTEGER, completed_at INTEGER, score REAL);
    CREATE TABLE lesson_submissions (id TEXT PRIMARY KEY, student_email TEXT, lesson_id TEXT, response TEXT,
      grade_json TEXT, score REAL, possible REAL, submitted_at INTEGER);
    INSERT INTO classes VALUES ('N1', 'owner@x', NULL);
    INSERT INTO class_teachers VALUES ('N1', 'co@x');
  `);
  const old = Date.now() - 30 * 86400000;
  // A student, the owner, a co-teacher and a student account promoted to teacher, all enrolled, all inactive,
  // all stuck on a lesson, all with a failing submission; the owner also has a hand-in waiting for a score.
  for (const [email, role] of [['kid@x', 'student'], ['owner@x', 'student'], ['co@x', 'student'], ['prom@x', 'teacher']]) {
    ndb.prepare('INSERT INTO students VALUES (?, ?)').run(email, role);
    ndb.prepare('INSERT INTO enrollments VALUES (?, ?, ?, ?)').run('N1', email, old, FAR);
    ndb.prepare("INSERT INTO lesson_state VALUES (?, 'L1', 'started', ?, NULL, NULL)").run(email, old);
    ndb.prepare("INSERT INTO lesson_submissions VALUES (?, ?, 'L2', 'a', '{}', 1, 10, ?)").run(`f-${email}`, email, old);
  }
  ndb.prepare("INSERT INTO lesson_submissions VALUES ('w-owner', 'owner@x', 'L3', 'a', ?, NULL, NULL, ?)").run(JSON.stringify({ gradingFailed: true }), old);
  const res = await NAget({ env: { DB: d1(ndb) }, data: { email: 'owner@x', role: 'teacher' }, params: { id: 'N1' },
    request: new Request('https://example.test/api/classes/N1/needs-attention') });
  const body = await res.json();
  const who = (list) => [...new Set(list.map((r) => r.student_email))].sort();
  check('staff helper: owner, co-teacher and non-student role', [...(await S.classStaffEmails(d1(ndb), 'N1'))].sort(), ['co@x', 'owner@x', 'prom@x']);
  check('needs-attention: inactive lists students only', who(body.inactive), ['kid@x']);
  check('needs-attention: stuck lists students only', who(body.stuck), ['kid@x']);
  check('needs-attention: failed submissions list students only (the reviewed gap)', who(body.failed_submission), ['kid@x']);
  check('needs-attention: work waiting for a score is kept, so it matches the review queue', who(body.awaiting_grade), ['owner@x']);
  check('withoutStaff: an empty staff set returns the list as it is', S.withoutStaff([{ student_email: 'a' }], new Set()).length, 1);
}

console.log(`\n${n} checks`);
