// Guards lib/gradebook-cell.ts, the one place that answers "what is this
// student's standing on this lesson?" for BOTH /api/my-gradebook (the student
// view on /progress) and the teacher's classes/[id]/gradebook.
//
// The bugs it exists for, all of which are silent:
//
//  * A submission the AI grader crashed on has score NULL. Read naively, that
//    cell is indistinguishable from a lesson the student never opened — so a
//    grader outage renders to the student as "Missing" and to the teacher as
//    "did nothing". `pending` is the only thing that separates them.
//  * The gradingFailed marker survives a teacher's hand-grade. If `pending`
//    keyed off the marker alone it would claim "awaiting teacher" forever on
//    work that had already been graded.
//  * A completed row with a NULL completed_at is legacy data, not evidence of
//    lateness. Guessing late there accuses a student of something we cannot
//    show. It must read as on time.
//  * grade_json is model output plus whatever the submission queue appended.
//    A malformed blob must degrade to "no notes", never throw — one bad row
//    would otherwise take down a student's whole gradebook.
//
// Compile-to-CommonJS shape matches test-grade-pass.mjs / test-due-dates.mjs.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-gradebook-cell-'));

let failures = 0;
const check = (name, actual, expected) => {
  if (actual === expected) return;
  failures++;
  console.error(`  FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

const DUE = 1_000_000;
const NOW = 2_000_000;

/** Only the fields a caller cares about; the rest default to "no submission". */
const cell = (over) => ({
  state: null,
  score: null,
  completedAt: null,
  submittedScore: null,
  possible: null,
  gradeJson: null,
  submittedAt: null,
  dueAt: null,
  now: NOW,
  ...over,
});

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/gradebook-cell.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const require = createRequire(import.meta.url);
  const { buildCell, cellStatus, needsAttention, readTeacherNotes } =
    require(path.join(out, 'gradebook-cell.js'));

  const status = (over) => cellStatus(buildCell(cell(over)));

  // ---- readTeacherNotes: never throws, never invents -----------------------
  check('null grade_json has no feedback', readTeacherNotes(null).feedback, null);
  check('null grade_json is not failed', readTeacherNotes(null).gradingFailed, false);
  check('unparseable grade_json has no feedback', readTeacherNotes('not json{{').feedback, null);
  check('unparseable grade_json is not failed', readTeacherNotes('not json{{').gradingFailed, false);
  check('a JSON array does not throw', readTeacherNotes('[1,2,3]').feedback, null);
  check('a JSON null does not throw', readTeacherNotes('null').feedback, null);
  check(
    'feedback is read',
    readTeacherNotes('{"teacherFeedback":"good work"}').feedback,
    'good work',
  );
  check(
    'non-string feedback is refused',
    readTeacherNotes('{"teacherFeedback":{"x":1}}').feedback,
    null,
  );
  check(
    'teacherReviewedAt dates the feedback',
    readTeacherNotes('{"teacherFeedback":"hi","teacherReviewedAt":42}').reviewedAt,
    42,
  );
  check(
    'a silent override still dates itself',
    readTeacherNotes('{"teacherOverriddenAt":7}').reviewedAt,
    7,
  );
  check(
    'non-numeric reviewedAt is refused',
    readTeacherNotes('{"teacherReviewedAt":"soon"}').reviewedAt,
    null,
  );

  // ---- pending: an outage is not a missing assignment ----------------------
  check(
    'grader outage reads as pending',
    status({ gradeJson: '{"gradingFailed":true}', submittedAt: 1500 }),
    'pending',
  );
  check(
    'an outage past its due date is STILL pending, not missing',
    status({ gradeJson: '{"gradingFailed":true}', submittedAt: 1500, dueAt: DUE }),
    'pending',
  );
  check(
    'a hand-graded outage row stops being pending',
    status({
      state: 'completed',
      completedAt: 900_000,
      submittedScore: 15,
      possible: 20,
      gradeJson: '{"gradingFailed":true,"teacherFeedback":"ok"}',
      dueAt: DUE,
    }),
    'done',
  );
  check(
    'a score of ZERO is a grade, not an absence',
    buildCell(cell({ submittedScore: 0, gradeJson: '{"gradingFailed":true}' })).pending,
    false,
  );

  // ---- late: never guess it onto a student -------------------------------
  check('no due date is never late', status({ state: 'completed', completedAt: NOW }), 'done');
  check(
    'completed before the due date is on time',
    status({ state: 'completed', completedAt: DUE - 1, dueAt: DUE }),
    'done',
  );
  check(
    'completed after the due date is late',
    status({ state: 'completed', completedAt: DUE + 1, dueAt: DUE }),
    'done-late',
  );
  check(
    'legacy completed row with no timestamp counts as ON TIME',
    status({ state: 'completed', completedAt: null, dueAt: DUE }),
    'done',
  );
  check(
    'never opened and past due is missing',
    status({ dueAt: DUE }),
    'missing',
  );
  check(
    'never opened and not yet due is not-started',
    status({ dueAt: NOW + 100_000 }),
    'not-started',
  );
  check('started and past due is still in progress', status({ state: 'started', dueAt: DUE }), 'started');

  // ---- needsAttention -----------------------------------------------------
  check('done needs no attention', needsAttention('done'), false);
  check('not-started needs no attention', needsAttention('not-started'), false);
  check('missing needs attention', needsAttention('missing'), true);
  check('done-late needs attention', needsAttention('done-late'), true);
  check('pending needs attention', needsAttention('pending'), true);
  check('started needs attention', needsAttention('started'), true);

  // ---- the cell carries what the page renders -----------------------------
  const graded = buildCell(cell({
    state: 'completed',
    score: 90,
    completedAt: 900_000,
    submittedScore: 18,
    possible: 20,
    submittedAt: 899_000,
    gradeJson: '{"teacherFeedback":"nice","teacherReviewedAt":950000}',
    dueAt: DUE,
  }));
  check('raw points survive', graded.submittedScore, 18);
  check('points possible survive', graded.possible, 20);
  check('the authoritative percent survives', graded.score, 90);
  check('teacher feedback survives', graded.teacherFeedback, 'nice');
  check('teacher review date survives', graded.teacherReviewedAt, 950_000);
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\ntest-gradebook-cell: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-gradebook-cell: all checks passed');
