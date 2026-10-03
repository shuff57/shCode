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
//   -- and that score is DERIVED from the counted rows; the browser's is ignored
//   a forged gradingFailed on a quiz is never a free probe (NULL score, no marks)
//   a fourth submission is refused (409), also when two race at cap-1
//   an AI part's counted row is written by grade-written with the grader's totals,
//     the browser's relay is a no-op, and grade-written refuses once the cap is spent
//   a deterministic ('client') part clamps the score it is handed
//   TRIES_APPLIED stays a fixed literal (phase 5 sets it to the deploy instant)
//
// Run: node scripts/test-attempt-reveal.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  'functions/api/grade-written.ts',
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
  'fx-written': CAP, 'fx-nopseudo': CAP, 'fx-quiz': 2, 'fx-client': CAP,
})};
exports.ATTEMPT_KINDS = ${JSON.stringify({
  'fx-written': 'ai', 'fx-nopseudo': 'ai', 'fx-quiz': 'quiz', 'fx-client': 'client',
})};
exports.PA_PSEUDOCODE = ${JSON.stringify({
  'fx-written': 'SET total TO 0\nFOR each item IN cart\n  ADD item.price TO total\nRETURN total',
  'fx-quiz': 'IF the answer is a THEN ...',
})};`);
writeFileSync(join(outDir, 'functions/_shared/ai-graders.generated.js'), `exports.AI_GRADERS = ${JSON.stringify({
  'fx-written': {
    lessonTitle: 'fx', prompt: 'grade it', model: 'fx-model',
    rubric: [{ id: 'a', title: 'A', description: 'a', points: 2 }, { id: 'b', title: 'B', description: 'b', points: 2 }],
  },
})};`);
const QKEY = {
  maxSubmissions: 2,
  questions: [
    { id: 'q1', answer: 1, optionText: 'B', explanation: 'EXPLAIN-ONE-SECRET' },
    { id: 'q2', answer: 0, optionText: 'A', explanation: 'EXPLAIN-TWO-SECRET' },
  ],
};
writeFileSync(join(outDir, 'functions/_shared/quiz-keys.generated.js'), `exports.QUIZ_KEYS = ${JSON.stringify({ 'fx-quiz': QKEY })};`);

for (const f of ['functions/api/grade-written.js', 'functions/api/attempt-reveal.js', 'functions/api/quiz-reveal.js', 'functions/api/lesson-submissions/index.js', 'functions/api/lesson-state/[lessonId].js']) {
  if (!existsSync(join(outDir, f))) { fail(`tsc did not emit ${f}`); process.exit(1); }
}
const attemptReveal = require(join(outDir, 'functions/api/attempt-reveal.js')).onRequestGet;
const quizReveal = require(join(outDir, 'functions/api/quiz-reveal.js')).onRequestGet;
const submissionsPost = require(join(outDir, 'functions/api/lesson-submissions/index.js')).onRequestPost;
const stateMod = require(join(outDir, 'functions/api/lesson-state/[lessonId].js'));
const gradeWritten = require(join(outDir, 'functions/api/grade-written.js')).onRequestPost;
const { COUNT_SINCE, TRIES_APPLIED } = require(join(outDir, 'lib/attempt-cap.js'));

// --- an in-memory SQLite dressed as D1 ---
function makeDb() {
  const sql = new Database(':memory:');
  sql.run(`CREATE TABLE lesson_submissions (id TEXT PRIMARY KEY, student_email TEXT, lesson_id TEXT,
    response TEXT, grade_json TEXT, score REAL, possible REAL, submitted_at INTEGER, due_at_submit INTEGER)`);
  sql.run('CREATE TABLE ai_help_usage (student_email TEXT, unit TEXT, day TEXT, count INTEGER, PRIMARY KEY (student_email, unit, day))');
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
        async run() { const r = stmt.run(...args); return { success: true, meta: { changes: r.changes } }; },
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
  // the cap is 2: a third hand-in is REFUSED, so the key just released cannot be used to score a perfect try
  const r3 = await submitQuiz(db, [['q1', 1], ['q2', 0]]);
  eq(r3.status, 409, 'a hand-in after every try is spent -> 409');
  const b3 = await (await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz')).json();
  eq([b3.attempts, b3.best.correct], [2, 2], '...and it recorded nothing (still 2 tries)');
}
{
  const db = makeDb();
  await submitQuiz(db, [['q1', 1], ['q2', 0]]);
  await submitQuiz(db, [['q1', 0], ['q2', 1]]);
  const b = await (await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz')).json();
  eq([b.best.correct, b.last.correct], [2, 0], 'best is the maximum over tries, not the last one');
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

// ============ forged gradingFailed on a capped quiz is never a free probe ============
{
  const db = makeDb();
  const forged = (picks) => call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST',
    body: JSON.stringify({ id: `p${++rowSeq}`, lessonId: 'fx-quiz', response: 'x', score: 99, possible: 99,
      gradeJson: { gradingFailed: true, quiz: picks.map(([id, picked]) => ({ id, picked })) } }),
  });
  for (let i = 0; i < 6; i++) await forged([['q1', i % 2], ['q2', 1]]);
  const rows = db.raw.query('SELECT score, possible, grade_json FROM lesson_submissions').all();
  eq(rows.every((r) => r.score === null && r.possible === null), true, 'six forged probes: every stored score is NULL (the server marked nothing)');
  eq(rows.every((r) => !r.grade_json.includes('quiz')), true, '...and the picks were discarded with the marker');
  eq((await call(quizReveal, db, '/api/quiz-reveal?lessonId=fx-quiz')).status, 403, '...and they spent no try, so there is still no result and no key');
  // a nested copy of the marker cannot hide a client row from the SQL count (deterministic part)
  const nest = await call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id: 'n1', lessonId: 'fx-client', response: 'x', score: 1, possible: 2, gradeJson: { a: { gradingFailed: true } } }),
  });
  eq(nest.status, 400, 'a nested gradingFailed marker is refused on a capped part');
}
{
  const db = makeDb();
  const noPicks = await call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id: 'q0', lessonId: 'fx-quiz', response: 'x', score: 8, possible: 8, gradeJson: { total: 8 } }),
  });
  eq(noPicks.status, 400, 'a capped quiz hand-in without picks is refused, not stored with the browser score');
  eq(db.raw.query('SELECT COUNT(*) AS n FROM lesson_submissions').get().n, 0, '...and nothing was stored');
}

// ============ the cap on writes: 409, and exactly one of two racers ============
{
  const db = makeDb();
  const send = (id) => call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id, lessonId: 'fx-client', response: 'x', score: 3, possible: 4, gradeJson: { report: 1 } }),
  });
  eq([(await send('c1')).status, (await send('c2')).status], [201, 201], "'client' kind: tries 1 and 2 are recorded");
  const race = await Promise.all([send('c3'), send('c4'), send('c5')]);
  eq(race.map((r) => r.status).sort(), [201, 409, 409], 'three concurrent submissions at cap-1: exactly ONE gets in');
  eq(db.raw.query("SELECT COUNT(*) AS n FROM lesson_submissions WHERE lesson_id = 'fx-client'").get().n, CAP, `...so the table holds exactly ${CAP} rows`);
  eq((await send('c6')).status, 409, 'and a later submission is refused');
  const clamped = makeDb();
  const bad = await call(submissionsPost, clamped, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id: 'k1', lessonId: 'fx-client', response: 'x', score: 9999, possible: 4, gradeJson: {} }),
  });
  eq([bad.status, clamped.raw.query('SELECT score FROM lesson_submissions').get().score], [201, null], "'client' kind: a score above its own possible is stored as NULL, never as a mark");
}
{
  // an AI part: the browser's row is a no-op, a failure marker is free and scoreless
  const db = makeDb();
  const relay = await call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id: 'r1', lessonId: 'fx-written', response: 'x', score: 4, possible: 4, gradeJson: { totalEarned: 4 } }),
  });
  eq([relay.status, db.raw.query('SELECT COUNT(*) AS n FROM lesson_submissions').get().n], [200, 0], "'ai' kind: the browser's relay of a grade is acknowledged and NOT stored");
  const failed = await call(submissionsPost, db, '/api/lesson-submissions', A, 'student', {
    method: 'POST', body: JSON.stringify({ id: 'r2', lessonId: 'fx-written', response: 'my answer', score: 4, possible: 4, gradeJson: { gradingFailed: true, error: 'down' } }),
  });
  const fr = db.raw.query("SELECT score, possible, response FROM lesson_submissions WHERE id = 'r2'").get();
  eq([failed.status, fr.score, fr.possible, fr.response], [201, null, null, 'my answer'], "'ai' kind: a grading-failure row keeps the answer, with NULL score even if the browser sent 4");
  eq((await reveal(db, 'fx-written')).status, 403, '...and spends no try');
}

// ============ grade-written spends the try itself on an AI part ============
{
  const db = makeDb();
  const model = JSON.stringify({ criteria: [{ id: 'a', earned: 2, verdict: 'met', feedback: 'f' }, { id: 'b', earned: 1, verdict: 'partial', feedback: 'f' }], summary: 's', hints: [] });
  let modelCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/chat')) { modelCalls++; return new Response(JSON.stringify({ message: { content: model } }), { status: 200 }); }
    return realFetch(url);
  };
  const gw = (lessonId = 'fx-written', email = A) => handlerCall(gradeWritten, db, email, { lessonId, response: 'my answer is long enough to be graded' });
  function handlerCall(h, d, email, body) {
    return h({ request: new Request('https://example.test/api/grade-written', { method: 'POST', body: JSON.stringify(body) }), env: { DB: d, OLLAMA_API_KEY: 'k' }, params: {}, data: { email, role: 'student' }, next: async () => new Response(null) });
  }
  const g1 = await gw();
  const g1b = await g1.json();
  eq([g1.status, g1b.totalEarned, g1b.totalPossible], [200, 3, 4], 'grade-written: a capped AI part returns the grade (3 of 4)');
  const row = db.raw.query("SELECT score, possible, id FROM lesson_submissions WHERE lesson_id = 'fx-written'").get();
  eq([row.score, row.possible, row.id.startsWith('gw-')], [3, 4, true], '...and RECORDED the counted row itself, with the grader\'s own totals');
  await gw(); await gw();
  eq(db.raw.query("SELECT COUNT(*) AS n FROM lesson_submissions WHERE lesson_id = 'fx-written'").get().n, CAP, `three grades -> ${CAP} counted rows (no free practice)`);
  const callsBefore = modelCalls;
  const g4 = await gw();
  eq([g4.status, (await g4.json()).capReached, modelCalls], [409, true, callsBefore], 'a fourth call is refused 409 BEFORE the model is reached (no cost, no grade)');
  eq((await reveal(db, 'fx-written')).status, 200, 'and the pseudocode is released only now');
  // racers at cap-1: the loser's grade is withheld
  const db2 = makeDb();
  await handlerCall(gradeWritten, db2, A, { lessonId: 'fx-written', response: 'an answer long enough to be graded' });
  await handlerCall(gradeWritten, db2, A, { lessonId: 'fx-written', response: 'an answer long enough to be graded' });
  const rr = await Promise.all([1, 2, 3].map(() => handlerCall(gradeWritten, db2, A, { lessonId: 'fx-written', response: 'an answer long enough to be graded' })));
  eq(rr.map((r) => r.status).sort(), [200, 409, 409], 'three concurrent grade calls at cap-1: one grade is given, two are withheld');
  eq(db2.raw.query('SELECT COUNT(*) AS n FROM lesson_submissions').get().n, CAP, '...and exactly the cap many rows exist');
  globalThis.fetch = realFetch;
}

// ============ lesson_state: the best score is DERIVED, the browser's is ignored ============
const setScore = (db, lessonId, score) =>
  call(stateMod.onRequestPost, db, `/api/lesson-state/${lessonId}`, A, 'teacher', { method: 'POST', body: JSON.stringify(score === undefined ? { state: 'completed' } : { state: 'completed', score }) }, { lessonId });
const stored = (db, lessonId) => db.raw.query('SELECT score FROM lesson_state WHERE student_email = ? AND lesson_id = ?').get(A, lessonId)?.score;
{
  const db = makeDb();
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW, score: 14, possible: 20 });
  await setScore(db, 'fx-written', 9999);
  eq(stored(db, 'fx-written'), 14, 'capped: a forged 9999 is ignored, the stored score is the best counted row (14)');
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW + 1, score: 9, possible: 20 });
  await setScore(db, 'fx-written', 9999);
  eq(stored(db, 'fx-written'), 14, 'capped: a worse later try (9 after 14) leaves the best (14)');
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { score: 1 }, at: NOW + 2, score: 17, possible: 20 });
  await setScore(db, 'fx-written', 0);
  eq(stored(db, 'fx-written'), 17, 'capped: a better counted try (17) replaces it, whatever the browser says');
  addRow(db, { email: A, lessonId: 'fx-written', gradeJson: { gradingFailed: true }, at: NOW + 3, score: 20, possible: 20 });
  await setScore(db, 'fx-written', undefined);
  eq(stored(db, 'fx-written'), 17, 'capped: a grading-failure row (even one carrying a score) does not raise the best');
  const none = makeDb();
  await setScore(none, 'fx-written', 20);
  eq(stored(none, 'fx-written') ?? null, null, 'capped: completing with no counted row stores NO score (the browser cannot supply one)');
  const un = makeDb();
  await setScore(un, 'fx-uncapped', 14);
  await setScore(un, 'fx-uncapped', 9);
  eq(stored(un, 'fx-uncapped'), 9, 'uncapped: the score still replaces (formative retakes unchanged)');
  const bad = await setScore(un, 'fx-uncapped', -5);
  eq(bad.status, 400, 'uncapped: a negative score is refused');
  const bad2 = await call(stateMod.onRequestPost, un, '/api/lesson-state/fx-uncapped', A, 'teacher', { method: 'POST', body: JSON.stringify({ state: 'completed', score: 'lots' }) }, { lessonId: 'fx-uncapped' });
  eq(bad2.status, 400, 'uncapped: a non-numeric score is refused');
}

// ============ TRIES_APPLIED is a fixed instant ============
{
  const src = readFileSync(join(root, 'lib/attempt-cap.ts'), 'utf8');
  if (!/export const TRIES_APPLIED = \d{13};/.test(src)) fail('TRIES_APPLIED must be a fixed 13-digit literal, not Date.now() or a computed value');
  else ok('TRIES_APPLIED is a fixed literal');
  const rec = JSON.parse(readFileSync(join(root, '.gauntlet/attempt-caps-loop.json'), 'utf8'));
  if (!(rec.phase5_todo || []).some((t) => /TRIES_APPLIED/.test(t))) fail('the loop record must list "set TRIES_APPLIED to the deploy time" under phase5_todo');
  else ok('phase 5 todo lists setting TRIES_APPLIED');
  if (typeof TRIES_APPLIED !== 'number') fail('TRIES_APPLIED not exported');
}

// ============ the browser's count fails CLOSED ============
{
  // lib/use-attempt-cap.ts is a React hook, so the rule is held as a source
  // assertion: there is no "not signed in, so zero tries used" shortcut. `authed` is
  // false while lesson-state is still loading and when it failed, and treating that
  // as zero enabled Submit for a student who had spent every try.
  const hook = readFileSync(join(root, 'lib/use-attempt-cap.ts'), 'utf8').replace(/\/\/.*$/gm, '');
  if (/setUsed\(\s*0\s*\)/.test(hook)) fail('use-attempt-cap sets used to 0 without a server count: the cap fails OPEN');
  else if (!/r\.loaded\s*\?\s*countAttempts/.test(hook)) fail('use-attempt-cap no longer derives the count from a LOADED submissions fetch');
  else ok('the hook has no zero-by-default path: unknown until the server rows are read');
}

rmSync(outDir, { recursive: true, force: true });
if (failures) { console.error(`\nattempt-reveal: ${failures} failure(s)`); process.exit(1); }
console.log('\nattempt-reveal: all cases passed');
