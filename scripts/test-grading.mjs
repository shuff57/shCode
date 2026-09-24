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

// --- studentGrading (server-side, same rule) ------------------------------

check('studentGrading matches the client rule for one student', () => {
  const scopeMap = new Map([
    ['1.1.1-lab', { title: '1.1.1 Lab', moduleId: '1.1', unitId: 'U1', preview: 'console', assignmentCode: 'A1.1.1', maxScore: null, scoreKind: null }],
    ['1.3.9-quiz', { title: '1.3.9 Quiz', moduleId: '1.3', unitId: 'U1', preview: 'quiz', assignmentCode: 'A1.3.9', maxScore: 10, scoreKind: 'quiz' }],
    ['1.1.2-read', { title: '1.1.2 Reading', moduleId: '1.1', unitId: 'U1', preview: 'reading', assignmentCode: null, maxScore: null, scoreKind: null }],
  ]);
  // Lab not started (0), quiz completed 6/10 (60), reading ignored entirely.
  const g = studentGrading(
    scopeMap,
    [{ lesson_id: '1.3.9-quiz', state: 'completed', score: 6 }],
    DEFAULT_WEIGHTS,
  );
  // lab(30) at 0, quiz(5) at 60 -> 60*5/35 = 8.57 -> 9.
  assert.equal(g.percent, Math.round((0 * 30 + 60 * 5) / 35));
  assert.deepEqual(
    g.categories.map((c) => c.category),
    ['lab', 'quiz'], // reading is absent -- not graded
  );
  assert.equal(g.categories.find((c) => c.category === 'quiz').done, 1);
});

check('a student with no work at all scores 0, not a crash', () => {
  const scopeMap = new Map([
    ['1.1.1-lab', { title: '1.1.1 Lab', moduleId: '1.1', unitId: 'U1', preview: 'console', assignmentCode: 'A1.1.1', maxScore: null, scoreKind: null }],
  ]);
  assert.equal(studentGrading(scopeMap, [], DEFAULT_WEIGHTS).percent, 0);
  assert.equal(studentGrading(null, [], DEFAULT_WEIGHTS).percent, 0);
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrading tests FAILED' : '\ngrading tests passed');
