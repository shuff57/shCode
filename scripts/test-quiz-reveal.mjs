// Regression test for the /api/quiz-reveal guard.
//
// The reveal endpoint hands a summative quiz's answer key to exactly one
// requester, exactly after their attempt exists in lesson_submissions. That
// gate must BITE: drive the REAL compiled handler against a D1 stub and assert
// no submission row -> 403 with no key text anywhere in the response, and one
// row -> 200 with the right answers for THAT student's form.
//
// Run: node scripts/test-quiz-reveal.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp-quiz-reveal-test');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

// --- Compile the handler (and its real imports) to CJS ---
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
try {
  execFileSync(
    'node',
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      join(root, 'functions/api/quiz-reveal.ts'),
      '--outDir', outDir,
      '--rootDir', root,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--skipLibCheck',
      '--esModuleInterop',
      '--types', '@cloudflare/workers-types',
      '--lib', 'es2022,dom',
    ],
    { stdio: 'inherit', cwd: root },
  );
} catch {
  // tsc exits non-zero on type errors in the workers-types lib, but still
  // emits JS. Only a missing output file is fatal.
}
writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');

const handlerJs = join(outDir, 'functions/api/quiz-reveal.js');
if (!existsSync(handlerJs)) {
  fail('tsc did not emit functions/api/quiz-reveal.js');
  process.exit(1);
}

const onRequestGet = require(handlerJs).onRequestGet;
if (typeof onRequestGet !== 'function') {
  fail('onRequestGet not exported from compiled handler');
  process.exit(1);
}
const { buildQuizView } = require(join(outDir, 'lib/quiz-variant.js'));

// --- Fixtures ---
const LESSON_ID = '2-7-1-ch2-individual-pa-concepts';
const EMAIL = 'student@example.invalid';
const lesson = JSON.parse(readFileSync(join(root, 'lessons', LESSON_ID, 'lesson.json'), 'utf8'));
const summative = lesson.quiz.questions.filter((q) => q.summative !== false);

// A lesson that has a quiz but is NOT summative — its key must have no reveal path.
let formativeLesson = null;
for (const dir of readdirSync(join(root, 'lessons'))) {
  const file = join(root, 'lessons', dir, 'lesson.json');
  if (!existsSync(file)) continue;
  let l;
  try {
    l = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  if (l.quiz && !l.quiz.summative && (l.quiz.questions ?? []).length > 0) {
    formativeLesson = l;
    break;
  }
}

// --- D1 stub: records binds, answers the submission query ---
function makeStubDb({ hasRow }) {
  const binds = [];
  let sql = '';
  const db = {
    prepare(s) {
      sql = s;
      return {
        bind(...args) {
          binds.push(args);
          return this;
        },
        async first() {
          return hasRow ? { id: 'row-1' } : null;
        },
      };
    },
    lastBinds: () => binds,
    lastSql: () => sql,
  };
  return db;
}

async function callReveal(db, lessonId, email = EMAIL) {
  const request = new Request(
    `https://example.test/api/quiz-reveal${lessonId === null ? '' : `?lessonId=${encodeURIComponent(lessonId)}`}`,
    { method: 'GET' },
  );
  const env = { DB: db };
  const data = email ? { email, role: 'student' } : {};
  return onRequestGet({ request, env, params: {}, data, next: async () => new Response(null) });
}

// Every authored explanation, first 25 chars — enough to catch a leak, too
// short to collide with page prose.
const explanationProbes = (l) =>
  (l?.quiz?.questions ?? [])
    .filter((q) => typeof q.explanation === 'string' && q.explanation.length >= 25)
    .map((q) => q.explanation.slice(0, 25));

const keyFieldNames = ['"answer":', '"explanation":', '"optionText":'];

function assertNoKeyText(res, label, probes) {
  return res.text().then((body) => {
    for (const probe of probes) {
      if (body.includes(probe)) {
        fail(`${label}: response body carries key text (${probe.slice(0, 40)}...)`);
        return;
      }
    }
    for (const field of keyFieldNames) {
      if (body.includes(field)) {
        fail(`${label}: response body carries the field name ${field}`);
        return;
      }
    }
    console.log(`PASS ${label} — no key text in the response`);
  });
}

// --- Test 1: missing lessonId -> 400 ---
{
  const res = await callReveal(makeStubDb({ hasRow: true }), null);
  if (res.status !== 400) fail(`missing lessonId: expected 400, got ${res.status}`);
  else console.log('PASS 1/6 missing lessonId -> 400');
}

// --- Test 2: not signed in -> 401, before any key is touched ---
{
  const res = await callReveal(makeStubDb({ hasRow: true }), LESSON_ID, null);
  if (res.status !== 401) fail(`no session: expected 401, got ${res.status}`);
  else console.log('PASS 2/6 no session -> 401');
}

// --- Test 3: summative, NO submission row -> 403, zero key text ---
{
  const db = makeStubDb({ hasRow: false });
  const res = await callReveal(db, LESSON_ID);
  if (res.status !== 403) {
    fail(`no submission row: expected 403, got ${res.status}`);
  } else if (!db.lastSql().includes('lesson_submissions')) {
    fail('the submission lookup does not read lesson_submissions');
  } else if (!db.lastSql().includes('student_email = ?') || !db.lastSql().includes('lesson_id = ?')) {
    fail(`the submission lookup is not scoped per student and lesson: ${db.lastSql()}`);
  } else if (db.lastBinds()[0]?.[0] !== EMAIL || db.lastBinds()[0]?.[1] !== LESSON_ID) {
    fail(`the lookup is not bound to the CALLER's email and lesson: ${JSON.stringify(db.lastBinds()[0])}`);
  } else {
    await assertNoKeyText(res, '3/6 no submission row -> 403', [
      ...explanationProbes(lesson),
      ...summative.flatMap((q) => q.options ?? []).slice(0, 5),
    ]);
  }
}

// --- Test 4: summative, one row -> 200 with THAT student's form ---
{
  const db = makeStubDb({ hasRow: true });
  const res = await callReveal(db, LESSON_ID);
  if (res.status !== 200) {
    fail(`one submission row: expected 200, got ${res.status}`);
  } else {
    const body = await res.json();
    const view = buildQuizView(lesson.quiz, LESSON_ID, EMAIL);
    const expectedIds = view.questions.map((v) => v.question.id);
    const gotIds = (body.answers ?? []).map((a) => a.id);
    if (body.variant !== view.variant) {
      fail(`variant mismatch: expected ${view.variant}, got ${body.variant}`);
    } else if (JSON.stringify([...gotIds].sort()) !== JSON.stringify([...expectedIds].sort())) {
      fail(`revealed questions are not the student's form\n expected ${expectedIds}\n got ${gotIds}`);
    } else {
      const byId = new Map(lesson.quiz.questions.map((q) => [q.id, q]));
      let ok = true;
      for (const a of body.answers) {
        const q = byId.get(a.id);
        if (!q || a.answer !== q.answer || a.explanation !== q.explanation || a.optionText !== q.options[q.answer]) {
          fail(`wrong key for ${a.id}`);
          ok = false;
          break;
        }
      }
      if (ok) console.log(`PASS 4/6 one submission row -> 200, form ${view.variant}, ${gotIds.length} question(s), key matches`);
    }
  }
}

// --- Test 5: a DIFFERENT student's form must not leak into this response ---
{
  const db = makeStubDb({ hasRow: true });
  const res = await callReveal(db, LESSON_ID, 'other.student@example.invalid');
  if (res.status !== 200) {
    fail(`other student: expected 200, got ${res.status}`);
  } else {
    const body = await res.json();
    const myView = buildQuizView(lesson.quiz, LESSON_ID, EMAIL);
    const mineOnly = myView.questions
      .map((v) => v.question.id)
      .filter((id) => !body.answers.some((a) => a.id === id));
    if (mineOnly.length === 0) {
      console.log('PASS 5/6 both forms share all questions (no variant-only split to separate)');
    } else if (body.answers.some((a) => mineOnly.includes(a.id))) {
      fail(`response leaks questions outside the caller's form: ${mineOnly.join(' ')}`);
    } else {
      console.log(`PASS 5/6 second student gets form ${body.variant}; the first student's form-only questions are absent`);
    }
  }
}

// --- Test 6: non-summative quiz and unknown lesson -> 403 even WITH a row ---
{
  if (formativeLesson) {
    const res = await callReveal(makeStubDb({ hasRow: true }), formativeLesson.id);
    if (res.status !== 403) {
      fail(`non-summative quiz with a row: expected 403, got ${res.status}`);
    } else {
      await assertNoKeyText(res, '6/6 non-summative quiz -> 403 even with a row', explanationProbes(formativeLesson));
    }
  } else {
    console.log('SKIP 6a/6 no non-summative quiz lesson found in lessons/');
  }
  const res = await callReveal(makeStubDb({ hasRow: true }), 'no-such-lesson');
  if (res.status !== 403) fail(`unknown lesson: expected 403, got ${res.status}`);
  else console.log('PASS 6b/6 unknown lesson -> 403');
}

rmSync(outDir, { recursive: true, force: true });

if (process.exitCode) {
  console.error('\nquiz-reveal regression FAILED');
} else {
  console.log('\nquiz-reveal guard: all cases passed');
}
