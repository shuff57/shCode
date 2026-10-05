// The student's "grade so far" (GET /api/my-gradebook -> grades) through the REAL handler over a
// real SQLite database. Locks: only work done plus work past its (class's) due date counts; a
// waiver removes a past-due zero AND the late flag; each class a student is in gets its own grade;
// the roster's number for the same student (studentGrading with the same inputs) is identical.
//
// Run: node scripts/test-my-gradebook-grade.mjs   (Bun: it loads the TypeScript handlers directly)

import { strict as assert } from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './dev-demo-api.mjs';
import { onRequestGet } from '../functions/api/my-gradebook.ts';
import { onRequestGet as classGradebookGet } from '../functions/api/classes/[id]/gradebook.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = openDb(root);
const DAY = 86400000;
const NOW = Date.now();
const manifest = { lessons: [
  { id: 'lab-1', title: '1.1.1 Lab one', preview: 'console', assignmentCode: 'A1.1.1', category: 'U1' },
  { id: 'lab-2', title: '1.1.2 Lab two', preview: 'console', assignmentCode: 'A1.1.2', category: 'U1' },
  { id: 'lab-3', title: '1.2.1 Lab three', preview: 'console', assignmentCode: 'A1.2.1', category: 'U1' },
  { id: 'read-1', title: '1.1.3 Reading', preview: 'reading', category: 'U1' },
] };
const env = { DB: db, ASSETS: { async fetch() { return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }); } } };
const FAR = 4102444800000;
const ME = 'kid@x.test';
db.raw.run("INSERT INTO students (email, password_hash, created_at) VALUES (?, 'x', 0)", [ME]);
db.raw.run("INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('dev-class', ?, 0, ?)", [ME, FAR]);
db.raw.run("INSERT INTO classes (id, name, code, owner_email, school_year, created_at) VALUES ('c2', 'Second class', 'SECOND', 't@x', '2026-2027', 0)");
db.raw.run("INSERT INTO enrollments (class_id, student_email, enrolled_at, expires_at) VALUES ('c2', ?, 0, ?)", [ME, FAR]);
const due = (cls, scope, id, at) => db.raw.run("INSERT INTO class_due_dates (class_id, scope, scope_id, due_at, set_by, set_at) VALUES (?, ?, ?, ?, 't', 0)", [cls, scope, id, at]);
due('dev-class', 'lesson', 'lab-1', NOW - DAY);   // past due, done
due('dev-class', 'lesson', 'lab-2', NOW - DAY);   // past due, NOT done  -> a zero
due('dev-class', 'lesson', 'lab-3', NOW + DAY);   // not due yet         -> left out
due('c2', 'lesson', 'lab-2', NOW + 5 * DAY);      // the other class has not reached lab-2
db.raw.run("INSERT INTO lesson_state (student_email, lesson_id, state, started_at, completed_at, score) VALUES (?, 'lab-1', 'completed', 1, ?, NULL)", [ME, NOW - 2 * DAY]);

const get = async () => {
  const res = await onRequestGet({ request: new Request('http://localhost/api/my-gradebook'), env, params: {}, data: { email: ME, role: 'student' }, waitUntil() {} });
  assert.equal(res.status, 200);
  return res.json();
};
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; } };

let body;
await check('a student gets one grade per class, each under its own due dates', async () => {
  body = await get();
  const byClass = Object.fromEntries(body.grades.map((g) => [g.classId, g]));
  // dev-class: lab-1 done (100) + lab-2 past due and missing (0) -> 50%
  assert.equal(byClass['dev-class'].percent, 50);
  assert.equal(byClass['dev-class'].missingCount, 1);
  assert.equal(byClass['dev-class'].doneCount, 1);
  assert.equal(byClass['dev-class'].gradedTotal, 3); // the reading is not graded
  // c2: only lab-1 is done, lab-2's date is in the future there -> 100%, nothing missing
  assert.equal(byClass.c2.percent, 100);
  assert.equal(byClass.c2.missingCount, 0);
});

await check('the cell for the missing lesson is flagged missing by the earliest class date', async () => {
  const lab2 = body.cells['lab-2'];
  assert.ok(lab2, 'a past-due lesson with no row still gets a cell');
  assert.equal(lab2.state, null);
});

const teacherView = async () => {
  const res = await classGradebookGet({ request: new Request('http://localhost/api/classes/dev-class/gradebook'), env, params: { id: 'dev-class' }, data: { email: 'teacher@dev.local', role: 'teacher' }, waitUntil() {} });
  assert.equal(res.status, 200);
  return (await res.json()).students.find((x) => x.email === ME);
};

await check('the teacher grid and the student page agree on every cell (one cell builder)', async () => {
  const mine = (await get()).cells;
  const theirs = (await teacherView()).cells;
  assert.deepEqual(Object.keys(theirs).sort(), Object.keys(mine).sort());
  for (const id of Object.keys(mine)) {
    assert.equal(theirs[id].late, mine[id].late, id + ' late');
    assert.equal(theirs[id].pending, mine[id].pending, id + ' pending');
    assert.equal(theirs[id].state, mine[id].state, id + ' state');
    assert.equal(theirs[id].score, mine[id].score, id + ' score');
  }
  assert.equal(theirs['lab-2'].late, true, 'the missing lesson is late for both');
});

db.raw.run("INSERT INTO lesson_due_waivers (class_id, student_email, lesson_id, granted_by, granted_at) VALUES ('dev-class', ?, 'lab-2', 't', 0)", [ME]);
await check('a waiver removes the past-due zero in that class and the late cell', async () => {
  const b = await get();
  const g = b.grades.find((x) => x.classId === 'dev-class');
  assert.equal(g.percent, 100);
  assert.equal(g.missingCount, 0);
  // the only other class's date for lab-2 is in the future, so the lesson is not due anywhere now
  assert.equal(b.dueDates['lab-2'], NOW + 5 * DAY);
  assert.equal(b.cells['lab-2'], undefined, 'no past-due cell for a waived, not-yet-due lesson');
});

await check('a waiver clears the teacher grid cell too, not only the student page', async () => {
  const theirs = (await teacherView()).cells;
  assert.equal(theirs['lab-2'], undefined);
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\nmy-gradebook grade tests FAILED' : '\nmy-gradebook grade tests passed');
