// Tests for the grade-category weighting: lib/grading-weights.ts's
// lessonGradeCategory(), weightedGradePercent(), lessonPercent(), and the
// server-side studentGrading() that a teacher's roster reads.
//
// The rule being locked: a lesson's grade category decides which weight it
// counts under, an empty category is renormalized away rather than being a
// permanent 0, and a raw score becomes a percent via score/maxScore. Get any
// of those wrong and every student's home-page badge and every teacher's
// roster row are wrong in the same direction, silently.
//
// Run: node scripts/test-grading.mjs   (also part of `npm test`)

import { strict as assert } from 'node:assert';
import {
  lessonGradeCategory,
  lessonPercent,
  weightedGradePercent,
  DEFAULT_WEIGHTS,
} from '../lib/grading-weights.ts';
import { studentGrading } from '../functions/_shared/grading.ts';

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`  ok  ${name}`);
  } catch (err) {
    results.push(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

// --- classification -------------------------------------------------------

check('quiz is recognised by preview, not type', () => {
  assert.equal(
    lessonGradeCategory({ title: '1.3.9 Unit quiz', preview: 'quiz', assignmentCode: 'A1.3.9' }),
    'quiz',
  );
});

check('a lab is recognised by assignmentCode and nothing else', () => {
  assert.equal(lessonGradeCategory({ title: '1.1.4 SDLC', preview: 'console', assignmentCode: 'A1.1.4' }), 'lab');
  // No code -> not graded (a reading/example), NOT a lab.
  assert.equal(lessonGradeCategory({ title: '1.1.2 Reading', preview: 'reading' }), null);
});

check('a written assignment is recognised by scoreKind', () => {
  assert.equal(lessonGradeCategory({ title: '1.3.20 Written', preview: 'assignment', scoreKind: 'written' }), 'written');
});

check('module id beats every other signal (chapter test parts are not quizzes)', () => {
  // A chapter test part that is itself a quiz must still be a chapterTest.
  assert.equal(
    lessonGradeCategory({ title: '1.7.1 Ch1 Test Part A', preview: 'quiz', assignmentCode: 'A1.7.1' }),
    'chapterTest',
  );
  // Part 2 of 1.7 is written -- still a chapterTest.
  assert.equal(
    lessonGradeCategory({ title: '1.7.2 Ch1 Test Part B', preview: 'assignment', scoreKind: 'written' }),
    'chapterTest',
  );
});

check('synthesis modules classify before assignmentCode (A4.1.0 is Q1, not a lab)', () => {
  assert.equal(lessonGradeCategory({ title: '4.1.0 Q1 design chart', assignmentCode: 'A4.1.0' }), 'q1');
  assert.equal(lessonGradeCategory({ title: '4.1.1 Q1 project', preview: 'assignment' }), 'q1');
  assert.equal(lessonGradeCategory({ title: '7.1.1 Arcade cabinet' }), 'q2');
  assert.equal(lessonGradeCategory({ title: '13.1.1 Mechanism', assignmentCode: 'A13.1.1' }), 'q4');
});

check('all three authored chapter-test modules are caught', () => {
  for (const id of ['1.7', '2.7', '3.10']) {
    assert.equal(lessonGradeCategory({ title: `${id}.1 part` }), 'chapterTest', `${id} should be a chapterTest`);
  }
  // Module 4.7 does not exist; it must not be mistaken for a test.
  assert.equal(lessonGradeCategory({ title: '4.7.1 x' }), null);
});

// --- raw score -> percent -------------------------------------------------

check('a raw score is a fraction of maxScore, not a percent already', () => {
  // The bug this locks out: reading lesson_state.score (6) as "6%".
  assert.equal(lessonPercent('completed', 6, 10), 60);
  assert.equal(lessonPercent('completed', 18, 20), 90);
});

check('a completed lesson with no score reads as 100, not 0', () => {
  // Summative quiz: the key is stripped client-side, so no fraction exists.
  assert.equal(lessonPercent('completed', null, 10), 100);
  assert.equal(lessonPercent('completed', undefined, null), 100);
});

check('an incomplete lesson is 0 regardless of a stray score', () => {
  assert.equal(lessonPercent(undefined, 6, 10), 0);
  assert.equal(lessonPercent('started', 6, 10), 0);
});

check('a score over maxScore clamps to 100', () => {
  assert.equal(lessonPercent('completed', 12, 10), 100);
});

// --- renormalization ------------------------------------------------------

check('an empty category does not drag the grade down', () => {
  // Finals(10) and Q4(10) have no lessons. Only lab(30) and quiz(5) are
  // present, both at 100 -> 100, NOT 100*(35/100)=35.
  const pct = weightedGradePercent(
    [
      { category: 'lab', percent: 100 },
      { category: 'quiz', percent: 100 },
    ],
    DEFAULT_WEIGHTS,
  );
  assert.equal(pct, 100);
});

check('present categories weight against each other, not against the total', () => {
  // lab(30) at 0, quiz(5) at 100 -> 5/35 -> 14%.
  const pct = weightedGradePercent(
    [
      { category: 'lab', percent: 0 },
      { category: 'quiz', percent: 100 },
    ],
    DEFAULT_WEIGHTS,
  );
  assert.equal(pct, Math.round((0 * 30 + 100 * 5) / 35));
});

check('a group with nothing graded falls back to a flat average', () => {
  // Reached only by the student's badge on a reading-only module: there is no
  // graded lesson to weight, and showing 0% would read as "you failed" for
  // having read everything. studentGrading() never reaches this -- it drops
  // uncategorized lessons -- so a teacher's roster stays category-weighted.
  assert.equal(weightedGradePercent([{ category: null, percent: 100 }], DEFAULT_WEIGHTS), 100);
  assert.equal(weightedGradePercent([{ category: null, percent: 50 }], DEFAULT_WEIGHTS), 50);
});

check('all categories present and all 100 is exactly 100', () => {
  const items = Object.keys(DEFAULT_WEIGHTS).map((category) => ({ category, percent: 100 }));
  assert.equal(weightedGradePercent(items, DEFAULT_WEIGHTS), 100);
});

// --- studentGrading: the grade SO FAR (server-side) -----------------------
// A lesson counts when it is done, or when this class's due date for it has passed and it is not
// done and not waived. Anything not due yet is out of both numerator and denominator.

const DAY = 86400000;
const NOW = 1_800_000_000_000;
const lesson = (title, o = {}) => ({ title, moduleId: title.split(' ')[0].split('.').slice(0, 2).join('.'), unitId: 'U1', preview: 'console', assignmentCode: 'A' + title.split(' ')[0], maxScore: null, scoreKind: null, ...o });
const scopeMap = new Map([
  ['lab-1', lesson('1.1.1 Lab one')],
  ['lab-2', lesson('1.1.2 Lab two')],
  ['quiz-1', lesson('1.3.9 Quiz', { preview: 'quiz', maxScore: 10, scoreKind: 'quiz' })],
  ['read-1', lesson('1.1.3 Reading', { preview: 'reading', assignmentCode: null })],
]);
const noDue = { index: { lesson: new Map(), module: new Map(), unit: new Map() }, waived: new Set(), now: NOW };
const dueOn = (entries, waived = []) => ({
  index: { lesson: new Map(entries), module: new Map(), unit: new Map() },
  waived: new Set(waived),
  now: NOW,
});
const done = (id, score = null) => ({ lesson_id: id, state: 'completed', score });

check('studentGrading: only completed work counts when nothing has a due date', () => {
  const g = studentGrading(scopeMap, [done('quiz-1', 6)], DEFAULT_WEIGHTS, noDue);
  assert.equal(g.percent, 60); // the quiz alone, at 6/10; the two untouched labs are not yet due
  assert.deepEqual(g.categories.map((c) => c.category), ['quiz']);
  assert.equal(g.gradedTotal, 3); // reading is not graded
  assert.equal(g.doneCount, 1);
  assert.equal(g.counted, 1);
  assert.equal(g.missingCount, 0);
});

check('studentGrading: a past-due lesson that is not done counts as a zero', () => {
  const g = studentGrading(scopeMap, [done('quiz-1', 10)], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY]]));
  // lab(30) at 0 (missing), quiz(5) at 100 -> 100*5/35 = 14
  assert.equal(g.percent, Math.round((0 * 30 + 100 * 5) / 35));
  assert.equal(g.missingCount, 1);
  assert.equal(g.counted, 2);
});

check('studentGrading: a lesson due in the future is left out, not zeroed', () => {
  const g = studentGrading(scopeMap, [done('quiz-1', 10)], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW + DAY]]));
  assert.equal(g.percent, 100);
  assert.equal(g.missingCount, 0);
});

check('studentGrading: missingIds names the past-due, not-done, not-waived lessons (and only those)', () => {
  const g = studentGrading(scopeMap, [done('lab-1')], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY], ['lab-2', NOW - DAY], ['quiz-1', NOW + DAY]]));
  assert.deepEqual(g.missingIds, ['lab-2']);
  const waived = studentGrading(scopeMap, [], DEFAULT_WEIGHTS, dueOn([['lab-2', NOW - DAY]], ['lab-2']));
  assert.deepEqual(waived.missingIds, []);
});

check('studentGrading: a waived past-due lesson is not a zero, a waived DONE one still counts', () => {
  const waivedMissing = studentGrading(scopeMap, [done('quiz-1', 10)], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY]], ['lab-1']));
  assert.equal(waivedMissing.percent, 100);
  assert.equal(waivedMissing.missingCount, 0);
  const waivedDone = studentGrading(scopeMap, [done('lab-1')], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY]], ['lab-1']));
  assert.equal(waivedDone.counted, 1);
  assert.equal(waivedDone.percent, 100);
});

check('studentGrading: up to date reads 100% while the progress denominator stays the whole course', () => {
  const g = studentGrading(scopeMap, [done('lab-1')], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY], ['lab-2', NOW + DAY]]));
  assert.equal(g.percent, 100);
  assert.equal(g.doneCount, 1);
  assert.equal(g.gradedTotal, 3);
});

check('studentGrading: the due date resolves lesson over module over unit', () => {
  const idx = { lesson: new Map([['lab-2', NOW + DAY]]), module: new Map([['1.1', NOW - DAY]]), unit: new Map() };
  const g = studentGrading(scopeMap, [], DEFAULT_WEIGHTS, { index: idx, waived: new Set(), now: NOW });
  assert.equal(g.missingCount, 1); // lab-1 inherits the module date (past); lab-2's own date (future) wins
});

check('studentGrading: a student with no work and nothing due scores 0 with nothing counted, not a crash', () => {
  const g = studentGrading(scopeMap, [], DEFAULT_WEIGHTS, noDue);
  assert.equal(g.percent, 0);
  assert.equal(g.counted, 0);
  assert.equal(studentGrading(null, [], DEFAULT_WEIGHTS, noDue).percent, 0);
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrading tests FAILED' : '\ngrading tests passed');
