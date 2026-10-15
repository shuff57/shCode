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

console.log(`\n${n} checks`);
