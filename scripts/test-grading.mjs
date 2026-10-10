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
import { lessonScoreFields } from './lesson-score-fields.mjs';
import fs from 'node:fs';

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

check('present roles weight against each other, not against the total', () => {
  // regular (lab, 40) at 0, group (10) at 100 -> 10/50 -> 20%.
  const pct = weightedGradePercent(
    [
      { category: 'lab', percent: 0, moduleId: '1.1' },
      { category: 'group', percent: 100, moduleId: '1.6' },
    ],
    DEFAULT_WEIGHTS,
  );
  assert.equal(pct, Math.round((0 * 40 + 100 * 10) / 50));
});

// --- the coarse model (User decision 2026-10-09): lessons -> submodule -> role ---------------
check('coarse: a submodule counts once, however many lessons it has', () => {
  // 1.1 has nine perfect lessons, 1.2 has one failed lesson. Per lesson that is 90%;
  // per submodule it is (100 + 0) / 2 = 50%.
  const items = [
    ...Array.from({ length: 9 }, () => ({ category: 'lab', percent: 100, moduleId: '1.1' })),
    { category: 'lab', percent: 0, moduleId: '1.2' },
  ];
  assert.equal(weightedGradePercent(items, DEFAULT_WEIGHTS), 50);
});
check('coarse: quizzes and written work count as lessons inside a regular submodule', () => {
  // One submodule: a lab at 100 and a quiz at 50 average to 75 -- the quiz has no weight of its own.
  const items = [
    { category: 'lab', percent: 100, moduleId: '1.1' },
    { category: 'quiz', percent: 50, moduleId: '1.1' },
    { category: 'written', percent: 50, moduleId: '1.1' },
  ];
  assert.equal(weightedGradePercent(items, DEFAULT_WEIGHTS), 67);
});
check('coarse: individual assessments carry their own role weight', () => {
  // regular 40 at 100, individual 25 at 60 -> (4000 + 1500) / 65 = 85.
  const items = [
    { category: 'lab', percent: 100, moduleId: '1.1' },
    { category: 'chapterTest', percent: 60, moduleId: '1.7' },
  ];
  assert.equal(weightedGradePercent(items, DEFAULT_WEIGHTS), 85);
});
check('coarse: group assessments are classified by module and are a separate role', () => {
  assert.equal(lessonGradeCategory({ title: '1.6.3 Group PA Part 3', preview: 'assignment', assignmentCode: 'A1.6.3' }), 'group');
  assert.equal(lessonGradeCategory({ title: '3.9.1 Group PA Part 1', preview: 'console', assignmentCode: 'A3.9.1' }), 'group');
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
  assert.deepEqual(g.categories.map((c) => c.category), ['lab']); // a quiz is a lesson inside a regular submodule
  assert.equal(g.gradedTotal, 3); // reading is not graded
  assert.equal(g.doneCount, 1);
  assert.equal(g.counted, 1);
  assert.equal(g.missingCount, 0);
});

check('studentGrading: a past-due lesson that is not done counts as a zero', () => {
  const g = studentGrading(scopeMap, [done('quiz-1', 10)], DEFAULT_WEIGHTS, dueOn([['lab-1', NOW - DAY]]));
  // lab-1 (submodule 1.1) is a missing 0 and quiz-1 (submodule 1.3) is 100: two regular
  // submodules, so (0 + 100) / 2 = 50.
  assert.equal(g.percent, 50);
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

// --- grading.formative: a weighted-rubric practice chart stays out of the grade ----------------
const weighted = [{ id: 'a', points: 7 }, { id: 'b', points: 7 }, { id: 'c', points: 2 }, { id: 'd', points: 2 }, { id: 'e', points: 2 }];
const chartMeta = (grading) => ({ preview: 'diagram', diagram: { aiGrader: { rubric: weighted } }, grading });
const chartScope = (f) => lesson('3.2.8 Chart the Code', { preview: 'diagram', assignmentCode: null, ...f });

check('formative flag: a weighted-rubric chart with grading.formative has no score kind or max', () => {
  assert.deepEqual(lessonScoreFields(chartMeta({ totalPoints: 0, passingScore: 0, formative: true }), null), { maxScore: null, scoreKind: null });
});
check('formative flag: the same chart WITHOUT it is Written, 20 points (unchanged behaviour)', () => {
  assert.deepEqual(lessonScoreFields(chartMeta({ totalPoints: 0, passingScore: 0 }), null), { maxScore: 20, scoreKind: 'written' });
});
check('formative flag: a flagged chart is excluded from the grade; an unflagged one counts', () => {
  const flagged = chartScope(lessonScoreFields(chartMeta({ formative: true }), null));
  const plain = chartScope(lessonScoreFields(chartMeta({}), null));
  assert.equal(lessonGradeCategory(flagged), null);
  assert.equal(lessonGradeCategory(plain), 'written');
  const startedChart = { lesson_id: 'chart', state: 'started', score: null };
  const base = new Map([['quiz-1', lesson('1.3.9 Quiz', { preview: 'quiz', maxScore: 10, scoreKind: 'quiz' })]]);
  const without = studentGrading(base, [done('quiz-1', 10)], DEFAULT_WEIGHTS, noDue);
  const withFlag = studentGrading(new Map([...base, ['chart', flagged]]), [done('quiz-1', 10), done('chart', 6)], DEFAULT_WEIGHTS, noDue);
  assert.equal(withFlag.percent, without.percent);
  assert.equal(withFlag.gradedTotal, without.gradedTotal); // not in the denominator
  assert.deepEqual(withFlag.categories.map((c) => c.category), ['lab']);
  const withPlain = studentGrading(new Map([...base, ['chart', plain]]), [done('quiz-1', 10), done('chart', 6)], DEFAULT_WEIGHTS, noDue);
  assert.equal(withPlain.gradedTotal, 2);
  assert.notEqual(withPlain.percent, 100);
  // past due and untouched: a flagged chart is never "missing"
  const lateNone = studentGrading(new Map([...base, ['chart', flagged]]), [done('quiz-1', 10), startedChart], DEFAULT_WEIGHTS, dueOn([['chart', NOW - DAY]]));
  assert.equal(lateNone.missingCount, 0);
});
check('formative flag: every flagged lesson in the tree has no score fields in the committed manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/lessons-manifest.json', import.meta.url), 'utf8')).lessons;
  let flagged = 0;
  for (const l of manifest) {
    const meta = JSON.parse(fs.readFileSync(new URL(`../lessons/${l.id}/lesson.json`, import.meta.url), 'utf8'));
    if (meta.grading?.formative !== true) continue;
    flagged += 1;
    assert.equal(l.scoreKind, null, l.id);
    assert.equal(l.maxScore, null, l.id);
  }
  assert.ok(flagged >= 0); // no lesson is flagged now; the synthetic charts above still test the flag
});

// --- counted console labs: completion credit (decided 2026-10-07) -----------------------------
// A console lab with an assignmentCode and no rubric (maxScore and scoreKind null) is a Lab, scores
// 100% on completion, and is "missing" only when its class due date has passed.

const countedLab = () => new Map([['cl-1', lesson('3.2.26 Lab: findMax & isEven', { assignmentCode: 'A3.2.4' })], ['cl-2', lesson('3.2.28 Lab: Sum 1 to N', { assignmentCode: 'A3.2.6' })]]);

check('counted console lab: assignmentCode with no rubric is category lab', () => {
  assert.equal(lessonGradeCategory({ title: '3.2.26 Lab: findMax & isEven', preview: 'console', scoreKind: null, assignmentCode: 'A3.2.4' }), 'lab');
});
check('counted console lab: done with no maxScore reads 100%, and counts in gradedTotal and doneCount', () => {
  assert.equal(lessonPercent('completed', null, null), 100);
  const g = studentGrading(countedLab(), [done('cl-1')], DEFAULT_WEIGHTS, noDue);
  assert.equal(g.percent, 100);
  assert.equal(g.gradedTotal, 2);
  assert.equal(g.doneCount, 1);
  assert.equal(g.counted, 1);
  assert.deepEqual(g.categories.map((c) => c.category), ['lab']);
});
check('counted console lab: past due and not done is missing (a 0); not waived only', () => {
  const g = studentGrading(countedLab(), [done('cl-1')], DEFAULT_WEIGHTS, dueOn([['cl-1', NOW - DAY], ['cl-2', NOW - DAY]]));
  assert.deepEqual(g.missingIds, ['cl-2']);
  assert.equal(g.percent, 50);
  const waived = studentGrading(countedLab(), [done('cl-1')], DEFAULT_WEIGHTS, dueOn([['cl-1', NOW - DAY], ['cl-2', NOW - DAY]], ['cl-2']));
  assert.equal(waived.percent, 100);
  assert.equal(waived.missingCount, 0);
});
check('counted console lab: not due (future date or no date) and not done is excluded from the grade', () => {
  for (const d of [noDue, dueOn([['cl-2', NOW + DAY]])]) {
    const g = studentGrading(countedLab(), [done('cl-1')], DEFAULT_WEIGHTS, d);
    assert.equal(g.percent, 100);
    assert.equal(g.counted, 1);
    assert.equal(g.missingCount, 0);
    assert.equal(g.gradedTotal, 2);
  }
});

check('guard: the four runtime-tested labs carry codes and no try cap; all three charts count as Labs', () => {
  const read = (id) => JSON.parse(fs.readFileSync(new URL(`../lessons/${id}/lesson.json`, import.meta.url), 'utf8'));
  const manifest = new Map(JSON.parse(fs.readFileSync(new URL('../public/lessons-manifest.json', import.meta.url), 'utf8')).lessons.map((l) => [l.id, l]));
  const labs = { '3-1-8-lab-findmax-iseven': 'A3.2.4', '3-2-19-lab-compose-functions': 'A3.2.5', '3-1-9-lab-sum-to-n': 'A3.2.6', '3-3-14-lab-filter-function': 'A3.3.3' };
  for (const [id, code] of Object.entries(labs)) {
    const meta = read(id);
    assert.equal(meta.assignmentCode, code, id);
    assert.ok(!meta.maxSubmissions && !meta.aiGrader && !meta.quiz, `${id} must stay unlimited-tries completion credit`);
    const m = manifest.get(id);
    assert.equal(m.assignmentCode, code, `${id} manifest (run generate-lessons-manifest)`);
    assert.equal(m.maxScore, null, id);
    assert.equal(m.scoreKind, null, id);
    assert.equal(m.maxSubmissions, null, id);
    assert.equal(lessonGradeCategory({ title: m.title, preview: m.preview, scoreKind: m.scoreKind, assignmentCode: m.assignmentCode }), 'lab', id);
  }
  // Counted charts (decided 2026-10-07 after 38 real drafts were measured; 3.3.11 followed 2026-10-08): Lab category, pass at 80%.
  for (const [id, code] of [['3-2-8-chart-parameter-trace', 'A3.2.2'], ['3-2-18-chart-chained-calls', 'A3.2.3'], ['3-3-11-chart-the-array-loop', 'A3.3.2']]) {
    const meta = read(id);
    assert.ok(!meta.grading?.formative, id);
    assert.equal(meta.grading?.completionCredit, true, id);
    assert.equal(manifest.get(id).maxScore, null, `${id}: done = 100%`);
    assert.equal(meta.assignmentCode, code, id);
    assert.ok(!meta.diagram?.maxSubmissions && !meta.maxSubmissions, `${id} stays unlimited tries`);
    const m = manifest.get(id);
    assert.equal(lessonGradeCategory({ title: m.title, preview: m.preview, scoreKind: m.scoreKind, assignmentCode: m.assignmentCode }), 'lab', id);
  }
  const taken = new Set([...manifest.values()].map((l) => l.assignmentCode).filter(Boolean));
});

check('guard: every 3.4-3.8 console lab counts as a Lab (completion credit, unlimited tries); the nine charts there stay practice', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/lessons-manifest.json', import.meta.url), 'utf8')).lessons;
  let labs = 0;
  let charts = 0;
  for (const m of manifest) {
    if (!/^3\.[4-8]\.\d+\s/.test(m.title)) continue;
    const cat = lessonGradeCategory({ title: m.title, preview: m.preview, scoreKind: m.scoreKind, assignmentCode: m.assignmentCode });
    if (m.type === 'assignment' && m.preview === 'console') {
      labs++;
      assert.equal(cat, 'lab', `${m.id} is a console lab and must count`);
      assert.equal(m.maxScore, null, `${m.id}: done = 100%`);
      assert.equal(m.maxSubmissions, null, `${m.id} stays unlimited tries`);
    }
    if (m.type === 'lesson' && m.preview === 'diagram') {
      charts++;
      assert.equal(cat, null, `${m.id} is a practice chart and must not count`);
    }
  }
  assert.equal(labs, 35, 'expected 35 counted labs in 3.4-3.8');
  assert.equal(charts, 9, 'expected 9 practice charts in 3.4-3.8');
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrading tests FAILED' : '\ngrading tests passed');
