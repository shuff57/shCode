// The gate on a capped performance-assessment part's solution, and the server
// rules that make "three tries, best one counts" true (.gauntlet/SPEC-attempt-caps.md).
//
// Drives the REAL compiled handlers (attempt-reveal, quiz-reveal, lesson-submissions
// POST, lesson-state POST) against an in-memory SQLite that stands in for D1, with
// the two baked tables swapped for fixtures after compilation, so nothing here
// depends on which lessons are capped today:
//
//   try 1 and 2 get nothing, try 3 gets the pseudocode
//   a row written because grading FAILED does not spend a try
//   a row from before the go-live cutoff does not spend a try
//   another student's rows do not spend this student's tries
//   no session -> 401, uncapped / unknown / no-pseudocode lesson -> 404
//   a capped quiz shows totals only until the last try, then the key
//   the quiz score is the server's, whatever the browser sent
//   lesson_state keeps the BEST score on a capped part and nothing lower
//
// Run: node scripts/test-attempt-reveal.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp-attempt-reveal-test');

let failures = 0;
function fail(msg) { console.error(`FAIL: ${msg}`); failures++; process.exitCode = 1; }
function ok(msg) { console.log(`PASS ${msg}`); }
function eq(got, want, label) {
  if (JSON.stringify(got) === JSON.stringify(want)) ok(label);
  else fail(`${label}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`);
}

let Database;
try { ({ Database } = await import('bun:sqlite')); } catch { /* fall through */ }
if (!Database) {
  console.log('SKIP test-attempt-reveal: bun:sqlite is not available in this runtime');
  process.exit(0);
}

// --- compile the handlers and their real imports to CJS ---
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const entries = [
  'functions/api/attempt-reveal.ts',
  'functions/api/quiz-reveal.ts',
  'functions/api/lesson-submissions/index.ts',
  'functions/api/lesson-state/[lessonId].ts',
].map((f) => join(root, f));
try {
  execFileSync('node', [
    join(root, 'node_modules/typescript/bin/tsc'), ...entries,
    '--outDir', outDir, '--rootDir', root, '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop',
    '--types', '@cloudflare/workers-types', '--lib', 'es2022,dom',
  ], { stdio: 'inherit', cwd: root });
} catch { /* tsc exits non-zero on workers-types noise but still emits */ }
writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');

// --- swap the baked tables for fixtures ---
const CAP = 3;
const attemptCapsMod = join(outDir, 'functions/_shared/pa-pseudocode.generated.js');
writeFileSync(attemptCapsMod, `exports.ATTEMPT_CAPS = ${JSON.stringify({
  'fx-written': CAP, 'fx-nopseudo': CAP, 'fx-quiz': 2,
})};
exports.PA_PSEUDOCODE = ${JSON.stringify({
  'fx-written': 'SET total TO 0\nFOR each item IN cart\n  ADD item.price TO total\nRETURN total',
  'fx-quiz': 'IF the answer is a THEN ...',
})};`);
const QKEY = {
  maxSubmissions: 2,
  questions: [
    { id: 'q1', answer: 1, optionText: 'B', explanation: 'EXPLAIN-ONE-SECRET' },
    { id: 'q2', answer: 0, optionText: 'A', explanation: 'EXPLAIN-TWO-SECRET' },
  ],
};
writeFileSync(join(outDir, 'functions/_shared/quiz-keys.generated.js'), `exports.QUIZ_KEYS = ${JSON.stringify({ 'fx-quiz': QKEY })};`);

for (const f of ['functions/api/attempt-reveal.js', 'functions/api/quiz-reveal.js', 'functions/api/lesson-submissions/index.js', 'functions/api/lesson-state/[lessonId].js']) {
  if (!existsSync(join(outDir, f))) { fail(`tsc did not emit ${f}`); process.exit(1); }
}
const attemptReveal = require(join(outDir, 'functions/api/attempt-reveal.js')).onRequestGet;
const quizReveal = require(join(outDir, 'functions/api/quiz-reveal.js')).onRequestGet;
const submissionsPost = require(join(outDir, 'functions/api/lesson-submissions/index.js')).onRequestPost;
const stateMod = require(join(outDir, 'functions/api/lesson-state/[lessonId].js'));
const { COUNT_SINCE } = require(join(outDir, 'lib/attempt-cap.js'));

// --- an in-memory SQLite dressed as D1 ---
function makeDb() {
  const sql = new Database(':memory:');
  sql.run(`CREATE TABLE lesson_submissions (id TEXT PRIMARY KEY, student_email TEXT, lesson_id TEXT,
    response TEXT, grade_json TEXT, score REAL, possible REAL, submitted_at INTEGER, due_at_submit INTEGER)`);
  sql.run(`CREATE TABLE lesson_state (student_email TEXT, lesson_id TEXT, state TEXT, started_at INTEGER,
    completed_at INTEGER, score REAL, PRIMARY KEY (student_email, lesson_id))`);
  const db = {
    raw: sql,
    prepare(text) {
      let args = [];
      const stmt = sql.query(text);
      const q = {
        bind(...a) { args = a; return q; },
        async all() { return { results: stmt.all(...args) }; },
        async first() { return stmt.get(...args) ?? null; },
        async run() { stmt.run(...args); return { success: true }; },
      };
      return q;
    },
  };
  return db;
}
let rowSeq = 0;
function addRow(db, { email, lessonId, gradeJson, at, score = null, possible = null }) {
  db.raw.query('INSERT INTO lesson_submissions (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(`r${++rowSeq}`, email, lessonId, 'x', gradeJson === undefined ? null : JSON.stringify(gradeJson), score, possible, at);
}
const NOW = Math.max(COUNT_SINCE, Date.now()) + 1000;
const BEFORE = COUNT_SINCE - 1000;
const A = 'a@example.invalid';
const B = 'b@example.invalid';

const call = (handler, db, url, email = A, role = 'student', init = {}, params = {}) =>
  handler({ request: new Request(`https://example.test${url}`, init), env: { DB: db }, params, data: email ? { email, role } : {}, next: async () => new Response(null) });
const reveal = (db, lessonId, email = A) => call(attemptReveal, db, `/api/attempt-reveal${lessonId === null ? '' : `?lessonId=${lessonId}`}`, email);

// ============ attempt-reveal ============
{
  const db = makeDb();
  eq((await reveal(db, 'fx-written')).status, 403, 'attempt-reveal: 0 tries -> 403');
  for (let i = 1; i <= CAP - 1; i++) {
    addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: i }, at: NOW + i });
    const res = await reveal(db, 'fx-written');
    const body = await res.text();
    if (res.status !== 403) fail(`try ${i} of ${CAP}: expected 403, got ${res.status}`);
    else if (body.includes('SET total') || body.includes('pseudocode')) fail(`try ${i}: 403 body carries the pseudocode`);
    else ok(`attempt-reveal: after try ${i} of ${CAP} -> 403, no pseudocode in the body`);
  }
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 3 }, at: NOW + 99 });
  const res = await reveal(db, 'fx-written');
  const body = await res.json();
  eq([res.status, typeof body.pseudocode === 'string' && body.pseudocode.startsWith('SET total')], [200, true], `attempt-reveal: after try ${CAP} of ${CAP} -> 200 with the pseudocode`);
}
{
  const db = makeDb();
  for (let i = 0; i < CAP - 1; i++) addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW + i });
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { gradingFailed: true, error: 'down' }, at: NOW + 50 });
  eq((await reveal(db, 'fx-written')).status, 403, 'a gradingFailed row does not spend a try (2 real + 1 failed -> 403)');
}
{
  const db = makeDb();
  for (let i = 0; i < CAP; i++) addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: BEFORE - i });
  eq((await reveal(db, 'fx-written')).status, 403, 'rows from before the go-live cutoff do not count (3 old rows -> 403)');
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW });
  eq((await reveal(db, 'fx-written')).status, 403, '...and one new row on top of them is still only try 1');
}
{
  const db = makeDb();
  for (let i = 0; i < CAP; i++) addRow(db, { email: B, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW + i });
  eq((await reveal(db, 'fx-written', A)).status, 403, "another student's 3 rows do not unlock this student");
  eq((await reveal(db, 'fx-written', B)).status, 200, '...but do unlock the student who made them');
}
{
  const db = makeDb();
  for (let i = 0; i < CAP; i++) { addRow(db, { email: A, lessonId: 'fx-nopseudo', gradeJson: {}, at: NOW + i }); addRow(db, { email: A, lessonId: 'fx-uncapped', gradeJson: {}, at: NOW + i }); }
  eq((await reveal(db, 'fx-nopseudo')).status, 404, 'a capped part with no pseudocode written -> 404, even with every try spent');
  eq((await reveal(db, 'fx-uncapped')).status, 404, 'an uncapped lesson -> 404');
  eq((await reveal(db, 'no-such-lesson')).status, 404, 'an unknown lesson -> 404');
  eq((await reveal(db, '__proto__')).status, 404, '__proto__ is not a lesson -> 404');
  eq((await reveal(db, null)).status, 400, 'missing lessonId -> 400');
  eq((await reveal(db, 'fx-written', null)).status, 401, 'no session -> 401');
}

// ============ quiz-reveal on a capped quiz ============
const submitQuiz = (db, picks, email = A, extra = {}) =>
  call(submissionsPost, db, '/api/lesson-submissions', email, 'student', {
    method: 'POST',
    body: JSON.stringify({ id: `s${++rowSeq}`, lessonId: 'fx-quiz', response: '{}', gradeJson: { quiz: picks.map(([id, picked]) => ({ id, picked })) }, ...extra }),
  });
{
  const db = makeDb();
  eq((await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz')).status, 403, 'capped quiz, no hand-in -> 403');
  const r1 = await submitQuiz(db, [['q1', 1], ['q2', 1]], A, { score: 99, possible: 99 });
  eq(r1.status, 201, 'a capped quiz hand-in is accepted');
  const row = db.raw.query('SELECT score, possible FROM lesson_submissions').get();
  eq([row.score, row.possible], [1, 2], "the row's score is the SERVER's (1 of 2), not the 99 the browser claimed");
  const res = await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz');
  const text = await res.text();
  const body = JSON.parse(text);
  if (res.status !== 200 || body.attempts !== 1 || body.best.correct !== 1 || body.best.total !== 2) fail(`after try 1: ${text}`);
  else if (text.includes('EXPLAIN-') || text.includes('"answers"') || text.includes('optionText')) fail(`after try 1 the response already carries the key: ${text}`);
  else ok('capped quiz after try 1: total only (1 of 2), no answers or explanations');
  await submitQuiz(db, [['q1', 1], ['q2', 0]]);
  const res2 = await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz');
  const b2 = await res2.json();
  if (res2.status !== 200 || b2.attempts !== 2 || b2.best.correct !== 2 || b2.last.correct !== 2) fail(`after try 2: ${JSON.stringify(b2)}`);
  else if (!Array.isArray(b2.answers) || b2.answers.length !== 2 || b2.answers[0].explanation !== 'EXPLAIN-ONE-SECRET') fail(`after the last try the key is missing: ${JSON.stringify(b2)}`);
  else ok('capped quiz after the last try: key and explanations released, best = 2 of 2');
  // best is the maximum, not the last: a worse third hand-in cannot lower it
  await submitQuiz(db, [['q1', 0], ['q2', 1]]);
  const b3 = await (await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz')).json();
  eq([b3.best.correct, b3.last.correct], [2, 0], 'best is the maximum over tries, not the last one');
}
{
  const db = makeDb();
  // another student's hand-in must not open this student's marking
  await submitQuiz(db, [['q1', 1], ['q2', 0]], B);
  eq((await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz', A)).status, 403, "capped quiz: another student's hand-in does not open this student's result");
  // a grading-failure marker on a quiz keeps its NULL score and spends nothing
  await call(submissionsPost, db, '/api/lesson-submissions', A, 'student', { method: 'POST', body: JSON.stringify({ id: 'f1', lessonId: 'fx-quiz', response: 'x', gradeJson: { gradingFailed: true } }) });
  const failedRow = db.raw.query("SELECT score FROM lesson_submissions WHERE id = 'f1'").get();
  eq(failedRow.score, null, 'a gradingFailed row on a capped quiz keeps a NULL score');
  eq((await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz', A)).status, 403, '...and spends no try (still no result)');
}

// ============ lesson_state keeps the best score on a capped part ============
const setScore = (db, lessonId, score) =>
  call(stateMod.onRequestPost, db, `/api/lesson-state/${lessonId}`, A, 'teacher', { method: 'POST', body: JSON.stringify(score === undefined ? { state: 'completed' } : { state: 'completed', score }) }, { lessonId });
const stored = (db, lessonId) => db.raw.query('SELECT score FROM lesson_state WHERE student_email = ? AND lesson_id = ?').get(A, lessonId)?.score;
{
  const db = makeDb();
  await setScore(db, 'fx-written', 14);
  await setScore(db, 'fx-written', 9);
  eq(stored(db, 'fx-written'), 14, 'capped: a worse later try (9 after 14) leaves the best (14)');
  await setScore(db, 'fx-written', 17);
  eq(stored(db, 'fx-written'), 17, 'capped: a better later try (17) replaces it');
  await setScore(db, 'fx-written', undefined);
  eq(stored(db, 'fx-written'), 17, 'capped: a scoreless row (grading failure) does not erase the best');
  await setScore(db, 'fx-uncapped', 14);
  await setScore(db, 'fx-uncapped', 9);
  eq(stored(db, 'fx-uncapped'), 9, 'uncapped: the score still replaces (formative retakes unchanged)');
}

rmSync(outDir, { recursive: true, force: true });
if (failures) { console.error(`\nattempt-reveal: ${failures} failure(s)`); process.exit(1); }
console.log('\nattempt-reveal: all cases passed');
