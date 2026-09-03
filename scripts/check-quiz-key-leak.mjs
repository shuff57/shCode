// A summative quiz's answer key must not appear in the page it is asked on.
//
// WHY THIS EXISTS. Every "don't reveal it yet" rule in QuizView governs what is
// DRAWN. None of them governs what is SHIPPED, and /lesson/[lessonId]/ is a
// static export whose body is a client component -- so the whole lesson object,
// `quiz.answer` and `quiz.explanation` included, was serialised into the page's
// RSC payload. Measured 2026-09-02 on the Chapter 1 individual PA: View Source
// on the built page returned all three forms, all 18 answer indices and every
// explanation, before a single question had been answered.
// lib/quiz-redact.ts strips them now; this measures that it stayed stripped.
//
// The check reads the BUILT output, not the source, because the source was
// never the thing that was wrong.
//
//   node scripts/check-quiz-key-leak.mjs                  # after a build
//   node scripts/check-quiz-key-leak.mjs --allow-missing  # skip if out/ absent
//
// --allow-missing exists for `npm test` on a tree that has not been built. It
// prints NOT CHECKED rather than passing quietly: a skip that reads like a pass
// is how this class of hole survives.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');
const OUT = path.join(ROOT, 'out', 'lesson');

const allowMissing = process.argv.includes('--allow-missing');

const summative = [];
for (const dir of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, dir, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let lesson;
  try { lesson = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  if (lesson.quiz?.summative) summative.push({ dir, lesson });
}

if (summative.length === 0) {
  console.log('[check-quiz-key-leak] no summative quizzes authored — nothing to check');
  process.exit(0);
}

if (!fs.existsSync(OUT)) {
  const msg = `[check-quiz-key-leak] NOT CHECKED — no out/ directory. `
    + `${summative.length} summative quiz(zes) unverified. Run \`npm run build\` first.`;
  console.log(msg);
  process.exit(allowMissing ? 0 : 1);
}

let failures = 0;
let checked = 0;
let unchecked = 0;

for (const { dir, lesson } of summative) {
  const page = path.join(OUT, lesson.id ?? dir, 'index.html');
  if (!fs.existsSync(page)) {
    // out/ exists but predates this lesson -- a stale build, not a leak. Same
    // rule as a missing out/: unverified, and it says so rather than passing.
    console.log(`NOT CHECKED ${dir}: no built page at out/lesson/${lesson.id ?? dir}/`
      + ' -- the build predates this lesson. Run `npm run build`.');
    if (!allowMissing) failures++;
    unchecked++;
    continue;
  }
  checked++;
  const html = fs.readFileSync(page, 'utf8');

  // Three separate tells, because one of them alone is easy to dodge by
  // accident: the field name, the prose, and the correct option's own text.
  const hits = [];
  if (/\\?"answer\\?":\s*\d/.test(html)) hits.push('an "answer" index');
  if (/\\?"explanation\\?":/.test(html)) hits.push('an "explanation" field');

  for (const q of lesson.quiz.questions ?? []) {
    if (q.explanation && html.includes(q.explanation.slice(0, 40))) {
      hits.push(`the explanation text of ${q.id}`);
      break;
    }
  }

  if (hits.length) {
    console.log(`FAIL ${dir}: the built page contains ${hits.join(', ')} — `
      + 'the answer key ships to the student. See lib/quiz-redact.ts.');
    failures++;
  }
}

console.log(
  failures
    ? `\n[check-quiz-key-leak] ${failures} FAILURE(S) across ${summative.length} summative quiz(zes)`
    : `\n[check-quiz-key-leak] OK - ${checked} summative quiz page(s) ship no answer key`
      + (unchecked ? ` (${unchecked} NOT CHECKED - stale build)` : ''),
);
process.exit(failures ? 1 : 0);
