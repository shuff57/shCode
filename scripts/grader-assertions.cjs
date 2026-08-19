// Contract checks for the AI essay grader, run over every real rubric in the
// repo rather than a fixture.
//
// WHAT BROKE. components/WrittenGrader.tsx decides pass/fail like this:
//
//     if (r.totalPossible === 0) { ...count met/partial verdicts... }
//     return r.totalEarned / r.totalPossible >= 0.7;
//
// Every lesson is green-to-advance, so every rubric item carries points: 0 and
// totalPossible is 0 — the first branch is the ONLY one that ever runs. One
// rubric item authored without a `points` key makes totalPossible NaN. NaN === 0
// is false, so the pass/fail branch is skipped, and NaN >= 0.7 is false too.
// The student writes the essay, gets graded, is told "needs revision" whatever
// they wrote, and green-to-advance walls them there. 1.1.22 shipped that way.
//
// So the invariant is not "points are present" — it is "totalPossible comes out
// a finite number, and 0 for a pass/fail rubric". These check that against
// shapeResult itself, so a change to the shaping logic is caught too.

const fs = require('fs');
const path = require('path');

const libDir = process.env.GRADER_LIB_DIR;
if (!libDir) {
  console.error('GRADER_LIB_DIR not set — run via scripts/test-grader.mjs');
  process.exit(1);
}
// tsc picks rootDir from the common ancestor of its inputs, so a single
// lib/*.ts input lands at <out>/grade-written-core.js while a multi-dir
// compile keeps the lib/ segment. Accept either rather than pinning one.
const candidates = [
  path.join(libDir, 'grade-written-core.js'),
  path.join(libDir, 'lib', 'grade-written-core.js'),
];
const libPath = candidates.find((c) => fs.existsSync(c));
if (!libPath) {
  console.error('compiled grade-written-core.js not found in ' + libDir);
  process.exit(1);
}
const { shapeResult, validateRequest } = require(libPath);

const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'lessons');

// Collect every graded rubric in the repo: the essay grader, and the optional
// second-stage grader a diagram assignment can carry.
const rubrics = [];
for (const folder of fs.readdirSync(lessonsDir)) {
  const p = path.join(lessonsDir, folder, 'lesson.json');
  if (!fs.existsSync(p)) continue;
  const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [kind, g] of [['aiGrader', meta.aiGrader], ['diagram.aiGrader', meta.diagram && meta.diagram.aiGrader]]) {
    if (g) rubrics.push({ folder, kind, rubric: g.rubric });
  }
}

let failures = 0;
const warnings = [];
function check(label, ok, detail) {
  if (ok) return;
  failures++;
  console.error(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}

console.log(`=== shapeResult over ${rubrics.length} real rubrics ===`);
for (const { folder, kind, rubric } of rubrics) {
  const label = `${folder} (${kind})`;

  if (!Array.isArray(rubric) || rubric.length === 0) {
    check(label, false, 'no rubric array');
    continue;
  }

  // The model met every criterion.
  const allMet = { criteria: rubric.map((r) => ({ id: r.id, earned: r.points, verdict: 'met', feedback: 'ok' })), summary: 's', hints: [] };
  const met = shapeResult(allMet, rubric);

  check(label, Number.isFinite(met.totalPossible), `totalPossible is ${met.totalPossible}`);
  check(label, Number.isFinite(met.totalEarned), `totalEarned is ${met.totalEarned}`);
  check(label, met.criteria.length === rubric.length, `shaped ${met.criteria.length} of ${rubric.length} criteria`);
  check(label, met.criteria.every((c) => c.verdict === 'met'), 'an all-met response did not shape to all met');

  // Green-to-advance: totalPossible 0 is what reaches WrittenGrader's
  // pass/fail branch. Nonzero points are not broken — it falls through to the
  // >= 70% branch and the lesson is still passable — but it means that lesson
  // grades on a different rule than every other one. Worth naming, not worth
  // failing a build over.
  if (met.totalPossible !== 0) {
    warnings.push(
      `${label} scores out of ${met.totalPossible} rather than pass/fail, so it `
      + `needs >= 70% while every other graded lesson only needs met/partial`,
    );
  }

  // The model met nothing — must still shape cleanly, and must not read as a pass.
  const none = shapeResult(
    { criteria: rubric.map((r) => ({ id: r.id, earned: 0, verdict: 'missing', feedback: 'no' })), summary: 's', hints: [] },
    rubric,
  );
  check(label, none.criteria.every((c) => c.verdict === 'missing'), 'an all-missing response did not shape to all missing');

  // A model that omitted the criteria array entirely.
  const empty = shapeResult({}, rubric);
  check(label, empty.criteria.length === rubric.length, 'a criteria-less model reply lost criteria');
  check(label, Number.isFinite(empty.totalEarned), `totalEarned is ${empty.totalEarned} on a criteria-less reply`);
}

console.log('=== validateRequest ===');
const okRubric = [{ id: 'a', title: 'A', points: 0 }];
const cases = [
  ['rejects a short response', validateRequest({ response: 'too short', rubric: okRubric }) !== null],
  ['rejects a missing rubric', validateRequest({ response: 'x'.repeat(50), rubric: [] }) !== null],
  ['accepts a real submission', validateRequest({ response: 'x'.repeat(50), rubric: okRubric }) === null],
];
for (const [label, ok] of cases) check(label, ok);

for (const w of warnings) console.warn(`  WARN  ${w}`);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `\nALL PASS  (${rubrics.length} rubrics, ${cases.length} validateRequest cases`
  + (warnings.length ? `, ${warnings.length} warning(s)` : '') + ')',
);
