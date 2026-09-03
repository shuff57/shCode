// 1.7.3 Find and Fix: the fourth bug's grader must not name the student's
// variable for them.
//
// WHY THIS EXISTS. Bug 4 is `count` meaning two things at once, and the fix is
// to give the second meaning a variable of its own. The requirement was
// written against the reference solution and matched the literal identifier
// `wrappedCount`, so a student who diagnosed the bug correctly and called
// their variable `giftWrapped` was marked wrong -- on a test, and on the one
// requirement that is about understanding rather than syntax. The name is the
// student's to choose; what has to be true is that `count` is no longer
// reassigned and that `wrapFee` uses the new variable.
//
// This is the general defect scripts/audit-grader-tolerance.mjs sweeps for,
// but it cannot carry a "rename an identifier" axis: plenty of requirements
// name a variable on purpose because the lesson asked for that name. So the
// judgement call lives here, in cases, next to the one grader it applies to.
//
//   node scripts/test-find-and-fix.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'lessons', '1-7-3-ch1-individual-pa-find-and-fix');

const lesson = JSON.parse(fs.readFileSync(path.join(DIR, 'lesson.json'), 'utf8'));
const r4 = lesson.requirements.find((r) => r.id === 'r4');
if (!r4) {
  console.error('[test-find-and-fix] FAIL — 1.7.3 has no r4 requirement');
  process.exit(1);
}
const re = new RegExp(r4.pattern, r4.flags || '');

// The same comment strip lib/grader.ts applies (stripComments defaults true).
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const starter = fs.readFileSync(path.join(DIR, 'script.js'), 'utf8');
const solution = fs.readFileSync(path.join(DIR, 'solution.js'), 'utf8');

// The two lines the fix replaces, verbatim from the starter.
const BUG = 'count = 2;\nlet wrapFee = 1.5 * count;';
if (!starter.includes(BUG)) {
  console.error(
    '[test-find-and-fix] FAIL — the starter no longer contains the bug these '
      + 'cases are written against. Re-read script.js and update BUG.',
  );
  process.exit(1);
}
const fix = (replacement) => starter.replace(BUG, replacement);

const cases = [
  // --- must PASS: a correct fix, under any name the student picks ---
  ['the reference solution', solution, true],
  ['named giftWrapped', fix('let giftWrapped = 2;\nlet wrapFee = 1.5 * giftWrapped;'), true],
  ['named n', fix('let n = 2;\nlet wrapFee = 1.5 * n;'), true],
  ['const, and the operands the other way round',
   fix('const wrapped_count$ = 2;\nlet wrapFee = wrapped_count$ * 1.5;'), true],
  ['declared first, wrapFee assigned on a later line',
   fix('let wrapped = 2;\nlet wrapFee = 0;\nwrapFee = 1.5 * wrapped;'), true],

  // --- must FAIL: the bug is still there, or was papered over ---
  ['the untouched starter', starter, false],
  ['deletes count = 2 and leaves wrapFee on count', fix('let wrapFee = 1.5 * count;'), false],
  ['inlines the 2 instead of naming it', fix('let wrapFee = 1.5 * 2;'), false],
  ['declares the variable but wrapFee still uses count',
   fix('let wrapped = 2;\nlet wrapFee = 1.5 * count;'), false],
  ['redeclares count as 2', fix('let count = 2;\nlet wrapFee = 1.5 * count;'), false],
  ['does it in a comment only',
   starter.replace(BUG, '// let wrapped = 2; wrapFee = 1.5 * wrapped\n' + BUG), false],
];

let failures = 0;
for (const [name, src, want] of cases) {
  const got = re.test(strip(src));
  if (got !== want) {
    failures++;
    console.error(
      `  FAIL  ${name} — grader ${got ? 'accepted' : 'refused'} it, expected `
        + `${want ? 'accept' : 'refuse'}`,
    );
  }
}

if (failures > 0) {
  console.error(`\n[test-find-and-fix] FAIL — ${failures} of ${cases.length} cases disagree`);
  process.exit(1);
}
console.log(`[test-find-and-fix] ok — ${cases.length} cases against 1.7.3 bug 4`);
