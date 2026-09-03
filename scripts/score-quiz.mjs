#!/usr/bin/env node
// Scores a summative quiz from the options students picked.
//
// WHY THIS EXISTS. A summative quiz ships to the browser with its answer key
// stripped (lib/quiz-redact.ts), because leaving the key in the page meant View
// Source handed a student every answer. The browser therefore cannot mark the
// paper, and a summative submission records the picks with a NULL score. This
// turns those picks into marks, on the machine that still has the key.
//
//   node scripts/score-quiz.mjs 1-7-1-ch1-individual-pa-concepts
//   node scripts/score-quiz.mjs 1-7-1-ch1-individual-pa-concepts --csv
//   node scripts/score-quiz.mjs <lessonId> --local     # local dev D1
//
// It reads only: one SELECT against lesson_submissions. It writes nothing --
// entering the number is the teacher's job, in Aeries, as it is for every other
// part of a chapter assessment.
//
// Each student's LATEST submission is the one that counts. There should only be
// one, since summative quizzes lock after submitting; a second row means the
// lock was got around and the run says so rather than quietly taking the newer.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const lessonId = args.find((a) => !a.startsWith('--'));
const asCsv = args.includes('--csv');
const local = args.includes('--local');

if (!lessonId) {
  console.error('usage: node scripts/score-quiz.mjs <lessonId> [--csv] [--local]');
  process.exit(2);
}

const lessonFile = path.join(ROOT, 'lessons', lessonId, 'lesson.json');
if (!fs.existsSync(lessonFile)) {
  console.error(`No such lesson: lessons/${lessonId}/lesson.json`);
  process.exit(2);
}
const lesson = JSON.parse(fs.readFileSync(lessonFile, 'utf8'));
if (!lesson.quiz) {
  console.error(`${lessonId} has no quiz block.`);
  process.exit(2);
}

// The key, straight from source. This is the copy the student never gets.
const key = new Map();
for (const q of lesson.quiz.questions ?? []) key.set(q.id, q.answer);

const sql = `SELECT student_email, grade_json, submitted_at FROM lesson_submissions `
  + `WHERE lesson_id = '${lessonId.replace(/'/g, "''")}' ORDER BY submitted_at ASC;`;

const out = execFileSync(
  process.execPath,
  [
    path.join(ROOT, 'scripts', 'd1.mjs'),
    'execute', 'shcode-commits',
    local ? '--local' : '--remote',
    '--command', sql,
    '--json',
  ],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

// The wrapper prints the wrangler envelope; take the first JSON array in it.
const start = out.indexOf('[');
const rows = JSON.parse(out.slice(start, out.lastIndexOf(']') + 1))[0]?.results ?? [];

if (rows.length === 0) {
  console.log(`No submissions recorded for ${lessonId}.`);
  process.exit(0);
}

const byStudent = new Map();
for (const row of rows) {
  let parsed;
  try { parsed = JSON.parse(row.grade_json ?? '{}'); } catch { parsed = {}; }
  const picks = Array.isArray(parsed.quiz) ? parsed.quiz : [];
  const asked = picks.length;
  let right = 0;
  const wrong = [];
  // A summative quiz can be handed in with blanks -- that is deliberate, so a
  // student stuck on question 4 can still hand in 1-3 and reach the next part.
  // Blanks are wrong for the mark, but they are not the same THING as a wrong
  // answer, and only the teacher can tell "ran out of time" from "got it wrong"
  // if the two are separated here.
  const blank = [];
  for (const p of picks) {
    if (!key.has(p.id)) continue;                 // a question retired since
    if (p.picked === undefined || p.picked === null) blank.push(p.id);
    else if (p.picked === key.get(p.id)) right++;
    else wrong.push(p.id);
  }
  const prior = byStudent.get(row.student_email);
  byStudent.set(row.student_email, {
    email: row.student_email,
    variant: parsed.variant ?? '-',
    right,
    asked,
    wrong,
    blank,
    at: row.submitted_at,
    attempts: (prior?.attempts ?? 0) + 1,
  });
}

const marks = [...byStudent.values()].sort((a, b) => a.email.localeCompare(b.email));

if (asCsv) {
  console.log('email,form,right,asked,blank,attempts,missed,unanswered');
  for (const m of marks) {
    console.log(
      `${m.email},${m.variant},${m.right},${m.asked},${m.blank.length},${m.attempts},`
      + `"${m.wrong.join(' ')}","${m.blank.join(' ')}"`,
    );
  }
} else {
  console.log(`\n${lessonId} — ${marks.length} student(s)\n`);
  const w = Math.max(...marks.map((m) => m.email.length), 5);
  console.log(`${'email'.padEnd(w)}  form  score   missed / [blank]`);
  for (const m of marks) {
    const flag = m.attempts > 1 ? `  (${m.attempts} hand-ins)` : '';
    const blanks = m.blank.length ? `  [blank: ${m.blank.join(' ')}]` : '';
    console.log(
      `${m.email.padEnd(w)}  ${String(m.variant).padEnd(4)}  ${m.right}/${m.asked}`
      + `     ${m.wrong.join(' ') || '-'}${blanks}${flag}`,
    );
  }
  const partial = marks.filter((m) => m.blank.length > 0);
  if (partial.length) {
    console.log(`\n${partial.length} student(s) left questions blank. That is allowed: a `
      + 'test part can be handed in unfinished so the parts after it unlock, and the '
      + 'paper stays open until every question is answered. Blanks score nothing.');
  }
  const repeats = marks.filter((m) => m.attempts > 1);
  if (repeats.length) {
    console.log(`\n${repeats.length} student(s) handed in more than once. Expected when the `
      + 'first hand-in was partial -- the LATEST row is the one scored above. A student '
      + 'with several hand-ins and no blanks is worth a look.');
  }
  console.log('\nEach question is worth 5 points on the Chapter 1 PA: score x 5.');
}
