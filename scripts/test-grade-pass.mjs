// Guards lib/grade-pass.ts, the one place that answers "did this submission
// pass?".
//
// The bug it exists for: nearly every rubric in the course awards `points: 0`
// per criterion and grades on the model's per-criterion verdicts, so
// totalPossible is 0. Any consumer that compared the totals itself —
// `score < possible * 0.6` in needs-attention, the score branches in the
// gradebook CSV — evaluated `0 < 0` and reported a failing student as fine.
// A whole class could be failing A1.4.1 with an empty needs-attention list.
//
// Compile-to-CommonJS shape matches test-diagram.mjs / test-grader.mjs.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-grade-pass-'));

let failures = 0;
const check = (name, actual, expected) => {
  if (actual === expected) return;
  failures++;
  console.error(`  FAIL ${name}: expected ${expected}, got ${actual}`);
};

const verdicts = (...vs) => vs.map((v) => ({ verdict: v }));
const gj = (...vs) => JSON.stringify({ criteria: verdicts(...vs) });

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/grade-pass.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const { isPassingGrade, isPassingSubmission } =
    createRequire(import.meta.url)(path.join(out, 'grade-pass.js'));

  // --- pass/fail rubrics (points: 0) — the case every consumer got wrong ---
  const pf = (...vs) => isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: verdicts(...vs) });

  check('4 of 4 met passes', pf('met', 'met', 'met', 'met'), true);
  check('2 of 4 met passes (majority bar is ceil(n/2))', pf('met', 'met', 'missing', 'missing'), true);
  check('1 of 4 met fails', pf('met', 'missing', 'missing', 'missing'), false);
  check('partial counts toward the bar', pf('partial', 'partial', 'missing', 'missing'), true);
  check('0 of 5 met fails', pf('missing', 'missing', 'missing', 'missing', 'missing'), false);
  check('3 of 5 met passes', pf('met', 'met', 'met', 'missing', 'missing'), true);
  check('2 of 5 met fails (ceil(5/2) = 3)', pf('met', 'met', 'missing', 'missing', 'missing'), false);
  check('no criteria fails', isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: [] }), false);

  // --- point-scored rubrics keep the 70% bar ---
  check('7/10 passes', isPassingGrade({ totalEarned: 7, totalPossible: 10, criteria: [] }), true);
  check('6/10 fails', isPassingGrade({ totalEarned: 6, totalPossible: 10, criteria: [] }), false);

  // --- stored rows ---
  // The regression itself: a real failing submission on a points:0 rubric.
  check('stored 0/0 row with 1 of 5 met is NOT passing',
    isPassingSubmission(0, 0, gj('met', 'missing', 'missing', 'missing', 'missing')), false);
  check('stored 0/0 row with 5 of 5 met is passing',
    isPassingSubmission(0, 0, gj('met', 'met', 'met', 'met', 'met')), true);

  // Unjudgeable rows must return null, never a cheerful default. A row that
  // silently reads as "passing" is how a struggling student disappears.
  check('outage row (no grade_json) is null', isPassingSubmission(null, null, null), null);
  check('unparseable grade_json is null', isPassingSubmission(0, 0, '{not json'), null);
  check('grade_json with no criteria is null', isPassingSubmission(0, 0, '{"summary":"hi"}'), null);
  check('empty criteria array is null', isPassingSubmission(0, 0, '{"criteria":[]}'), null);
  check('scored rubric with null score is null', isPassingSubmission(null, 10, null), null);

  // Point-scored stored rows ignore grade_json entirely.
  check('stored 8/10 row is passing', isPassingSubmission(8, 10, null), true);
  check('stored 3/10 row is not passing', isPassingSubmission(3, 10, null), false);
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\ntest-grade-pass: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-grade-pass: all checks passed');
