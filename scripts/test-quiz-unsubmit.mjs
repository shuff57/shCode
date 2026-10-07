#!/usr/bin/env node
// Tests the teacher-side quiz unsubmit (functions/api/classes/[id]/lesson-unsubmit).
//
// The mechanic is a DELETE wearing a teacher's credentials on a student's rows,
// so what needs proving is narrower than "does it work":
//   1. only a manager of the class (or an admin) reaches the batch;
//   2. only an ACTIVELY ENROLLED student -- otherwise a teacher can reopen any
//      student in the world by naming their own class, because progress is keyed
//      by student_email and not by class;
//   3. only a quiz is deleted. A written answer or a diagram shares the same
//      table, and unsubmitting one would throw away a graded essay;
//   4. the batch is all-or-nothing and in this order: draft rewritten to the
//      same answers with graded:false, state dropped to 'started', submissions
//      gone. The student's picks are the one thing that must survive.
//
// Compiles the REAL handler (and its real imports) to CJS and drives it with a
// D1 stub, same shape as scripts/test-login-lockout.mjs.
//
// Run: node scripts/test-quiz-unsubmit.mjs

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp-unsubmit-test');
const ENTRY = 'api/classes/[id]/lesson-unsubmit/index.ts';

let passed = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`PASS  ${passed}/${total}  ${name}`);
  } else {
    fail(`${name}${detail ? ` -- ${detail}` : ''}`);
  }
}
const total = 25;

// --- Compile the handler (and its real imports) to CJS ---
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tsc = spawnSync(
  'node',
  [
    join(root, 'node_modules/typescript/bin/tsc'),
    join(root, 'functions', ENTRY),
    '--outDir', outDir,
    '--rootDir', join(root, 'functions'),
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--skipLibCheck',
    '--esModuleInterop',
    '--types', '@cloudflare/workers-types',
  ],
  { cwd: root, encoding: 'utf8' },
);
// tsc exits non-zero on errors in the workers-types lib but still emits JS.
// A real type error in the handler under test is not in that bucket.
const compileLog = `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`;
if (compileLog.includes('lesson-unsubmit')) {
  fail('tsc reported a type error in the handler:\n' + compileLog.trim());
  process.exit(1);
}
writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');

if (!existsSync(join(outDir, ENTRY.replace(/\.ts$/, '.js')))) {
  fail(`tsc did not emit ${ENTRY.replace(/\.ts$/, '.js')}`);
  process.exit(1);
}

const { onRequestPost } = require(join(outDir, ENTRY.replace(/\.ts$/, '.js')));
if (typeof onRequestPost !== 'function') {
  fail('onRequestPost not exported from compiled handler');
  process.exit(1);
}

// --- A D1 stub that answers per-table and records every batch statement ---
function makeStubDb({ ownerEmail = null, coTeacher = false, enrolled = true, latest = null } = {}) {
  const state = { batches: [] };
  const db = {
    prepare(sql) {
      const stmt = { sql, args: [] };
      stmt.bind = (...args) => {
        stmt.args = args;
        return stmt;
      };
      stmt.first = async () => {
        if (sql.includes('FROM classes')) {
          return ownerEmail === null ? null : { id: 'c1', owner_email: ownerEmail };
        }
        if (sql.includes('FROM class_teachers')) return coTeacher ? { 1: 1 } : null;
        if (sql.includes('FROM enrollments')) return enrolled ? { 1: 1 } : null;
        if (sql.includes('FROM lesson_submissions')) return latest;
        return null;
      };
      stmt.all = async () => ({ results: [] });
      stmt.run = async () => ({ success: true });
      return stmt;
    },
    batch: async (stmts) => {
      state.batches.push(stmts);
      return stmts.map(() => ({ success: true }));
    },
  };
  return { db, state };
}

const CLASS_ID = 'c1';
const STUDENT = 'Kid@Example.INVALID';  // normalization is part of the test
const STUDENT_NORM = 'kid@example.invalid';
const LESSON = '1-7-1-ch1-individual-pa-concepts';
const QUIZ_SUB = {
  response: JSON.stringify({ answers: { q1: 2, q3: 0 }, graded: true }),
  grade_json: JSON.stringify({ variant: 0, quiz: [{ id: 'q1', picked: 2 }] }),
};
const WRITTEN_SUB = {
  response: 'A paragraph of prose a teacher already graded.',
  grade_json: JSON.stringify({ totalEarned: 9, totalPossible: 10, criteria: [] }),
};

async function call(db, body, { role = 'teacher', email = 'teacher@example.invalid' } = {}) {
  const request = new Request(`https://example.test/api/classes/${CLASS_ID}/lesson-unsubmit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return onRequestPost({
    request,
    env: { DB: db },
    params: { id: CLASS_ID },
    data: { email, role },
    next: async () => new Response(null),
  });
}

const okBody = { studentEmail: STUDENT, lessonId: LESSON };

// --- 1. owner, enrolled, quiz -> one ordered batch ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'teacher@example.invalid', latest: QUIZ_SUB });
  const res = await call(db, okBody);
  check('owner: 200', res.status === 200, `got ${res.status}`);
  check('owner: one batch', state.batches.length === 1, `got ${state.batches.length}`);
  const batch = state.batches[0] ?? [];
  check('owner: three statements', batch.length === 3, `got ${batch.length}`);
  check(
    'owner: draft first, same answers, graded false',
    /lesson_drafts/.test(batch[0]?.sql ?? '') &&
      JSON.parse(batch[0].args[2]).graded === false &&
      JSON.stringify(JSON.parse(batch[0].args[2]).answers) === JSON.stringify({ q1: 2, q3: 0 }),
    JSON.stringify(batch[0]?.args),
  );
  check(
    'owner: state back to started, score cleared',
    /UPDATE lesson_state SET state = 'started'/.test(batch[1]?.sql ?? '') &&
      /score = NULL/.test(batch[1]?.sql ?? ''),
    batch[1]?.sql,
  );
  check(
    'owner: submissions deleted last',
    /DELETE FROM lesson_submissions/.test(batch[2]?.sql ?? ''),
    batch[2]?.sql,
  );
  check(
    'owner: every statement scoped to the normalized student + lesson',
    batch.every((s) => s.args[0] === STUDENT_NORM && s.args[1] === LESSON),
    JSON.stringify(batch.map((s) => s.args.slice(0, 2))),
  );
}

// --- 2. co-teacher is a manager too ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'someone.else@example.invalid', coTeacher: true, latest: QUIZ_SUB });
  const res = await call(db, okBody);
  check('co-teacher: 200', res.status === 200, `got ${res.status}`);
  check('co-teacher: batch ran', state.batches.length === 1);
}

// --- 3. a teacher with no claim on the class gets nothing ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'someone.else@example.invalid', latest: QUIZ_SUB });
  const res = await call(db, okBody);
  check('stranger: 403', res.status === 403, `got ${res.status}`);
  check('stranger: no batch', state.batches.length === 0, `got ${state.batches.length}`);
}

// --- 4. admin bypasses the ACL, as everywhere else in the app ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'someone.else@example.invalid', latest: QUIZ_SUB });
  const res = await call(db, okBody, { role: 'admin', email: 'admin@example.invalid' });
  check('admin: 200', res.status === 200, `got ${res.status}`);
  check('admin: batch ran', state.batches.length === 1);
}

// --- 5. class missing -> 404 ---
{
  const { db, state } = makeStubDb({ ownerEmail: null, latest: QUIZ_SUB });
  const res = await call(db, okBody);
  check('unknown class: 404', res.status === 404, `got ${res.status}`);
  check('unknown class: no batch', state.batches.length === 0);
}

// --- 6. THE CROSS-CLASS HOLE: manages the class, but the student is not in it ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'teacher@example.invalid', enrolled: false, latest: QUIZ_SUB });
  const res = await call(db, okBody);
  check('not enrolled: 404', res.status === 404, `got ${res.status}`);
  check('not enrolled: no batch', state.batches.length === 0, `got ${state.batches.length}`);
}

// --- 7. nothing submitted -> 404, nothing to undo ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'teacher@example.invalid', latest: null });
  const res = await call(db, okBody);
  check('no submission: 404', res.status === 404, `got ${res.status}`);
  check('no submission: no batch', state.batches.length === 0);
}

// --- 8. a written answer must survive: 409, and the batch never runs ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'teacher@example.invalid', latest: WRITTEN_SUB });
  const res = await call(db, okBody);
  check('written answer: 409', res.status === 409, `got ${res.status}`);
  check('written answer: essay not deleted', state.batches.length === 0, `got ${state.batches.length}`);
}

// --- 9. malformed body -> 400 before any write ---
{
  const { db, state } = makeStubDb({ ownerEmail: 'teacher@example.invalid', latest: QUIZ_SUB });
  const res = await call(db, { studentEmail: STUDENT });
  check('missing lessonId: 400', res.status === 400, `got ${res.status}`);
  check('missing lessonId: no batch', state.batches.length === 0);
}

// --- 10. garbage response still reopens, as a blank quiz ---
{
  const { db, state } = makeStubDb({
    ownerEmail: 'teacher@example.invalid',
    latest: { response: 'not json', grade_json: QUIZ_SUB.grade_json },
  });
  const res = await call(db, okBody);
  const batch = state.batches[0] ?? [];
  check('garbage response: 200', res.status === 200, `got ${res.status}`);
  check(
    'garbage response: blank answers, still ungraded',
    batch.length === 3 && JSON.parse(batch[0]?.args[2] ?? '{}').graded === false &&
      Object.keys(JSON.parse(batch[0]?.args[2] ?? '{}').answers ?? {}).length === 0,
    batch[0]?.args?.[2],
  );
}

rmSync(outDir, { recursive: true, force: true });

if (process.exitCode) {
  console.error('\nquiz unsubmit FAILED');
} else {
  console.log(`\nquiz unsubmit: ${passed}/${total}`);
}
