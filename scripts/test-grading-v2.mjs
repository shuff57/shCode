// Grading v2 (lib/grading-v2.ts) and lesson.json `work` (lib/lesson-work.ts), in both switch positions.
//
//   1. Off (null) changes nothing: the graded set, "missing", the text-answer pass rule and plan Submit
//      are exactly the rules from before v2.
//   2. On: work.graded decides what counts (the module still decides the role); skipped practice that was
//      past due before the switch is never missing; everything due after it is.
//   3. On: text-box answers pass at 70% of criteria (partial = half); plans at 70% of cards, with any
//      required card green; code stays all-or-nothing; a plan records its card score out of its cards.
//   4. work kinds are read off the lesson's structure, and a mismatch or an unexplained exception is named.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-grading-v2.mjs   (also part of `npm test`)

import { lessonGradeCategory, countsAsMissing, predatesV2, newlyGraded } from '../lib/grading-weights.ts';
import { isPassingGrade, cardsPass, cardScore } from '../lib/grade-pass.ts';
import { reportFromRequirements } from '../lib/ai-check.ts';
import { buildCell, cellStatus } from '../lib/gradebook-cell.ts';
import { studentGrading } from '../functions/_shared/grading.ts';
import { DEFAULT_WEIGHTS } from '../lib/grading-weights.ts';
import { buildDueIndex } from '../lib/due-dates-core.ts';
import { workKindOf, workProblems } from '../lib/lesson-work.ts';
import { lessonScoreFields } from './lesson-score-fields.mjs';
import { GRADING_V2_FROM } from '../lib/grading-v2.ts';

let n = 0, failures = 0;
const check = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { failures++; console.error(`FAIL: ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
};

const SWITCH = Date.UTC(2026, 10, 20);       // the stamp in these tests
const DAY = 86400000;
const NOW = SWITCH + 10 * DAY;

check('the switch ships OFF', GRADING_V2_FROM, null);

// ---------------------------------------------------------------- 1 + 2. what counts
const practice = { title: '2.3.21 Greeting with Backticks', preview: 'console', graded: true };            // graded only by v2
const oldLab = { title: '1.2.28 Fix Ten Declarations', preview: 'console', assignmentCode: 'A1.2.1', graded: true };
const reading = { title: '2.3.3 Reading: switch Statements', preview: 'reading', graded: false };
const pa = { title: '1.7.3 Individual PA Part 3', preview: 'console', assignmentCode: 'A1.7.3', graded: true };
const q1Reading = { title: '4.1.2 Reading: Plan Before You Code', preview: 'reading', graded: true };
const noField = { title: '2.3.21 Greeting with Backticks', preview: 'console' };                           // a manifest from before work

check('off: practice code lab is not graded (as before)', lessonGradeCategory(practice, null), null);
check('off: an A-code lab is a lab (as before)', lessonGradeCategory(oldLab, null), 'lab');
check('on: practice code lab is graded as a lab', lessonGradeCategory(practice, SWITCH), 'lab');
check('on: a reading is not graded', lessonGradeCategory(reading, SWITCH), null);
check('on: the module still decides the role (chapter test, Q1)', [lessonGradeCategory(pa, SWITCH), lessonGradeCategory(q1Reading, SWITCH)], ['chapterTest', 'q1']);
check('on: a lesson with no graded field keeps the old rule', lessonGradeCategory(noField, SWITCH), null);
check('newlyGraded: only lessons v2 added', [newlyGraded(practice, SWITCH), newlyGraded(oldLab, SWITCH), newlyGraded(practice, null)], [true, false, false]);

const before = SWITCH - 3 * DAY, after = SWITCH + 3 * DAY;
check('on: skipped practice due BEFORE the switch is not missing', countsAsMissing(practice, before, NOW, SWITCH), false);
check('on: practice due AFTER the switch, now past, is missing', countsAsMissing(practice, after, NOW, SWITCH), true);
check('on: an old graded lab due before the switch is still missing', countsAsMissing(oldLab, before, NOW, SWITCH), true);
check('not past due is never missing', countsAsMissing(oldLab, NOW + DAY, NOW, SWITCH), false);
check('off: "missing" is plain past-due', [countsAsMissing(practice, before, NOW, null), countsAsMissing(oldLab, before, NOW, null)], [true, true]);
check('predatesV2 marks only pre-switch v2 practice', [predatesV2(practice, before, SWITCH), predatesV2(practice, after, SWITCH), predatesV2(oldLab, before, SWITCH)], [true, false, false]);

const cell = (exempt) => cellStatus(buildCell({ state: null, score: null, completedAt: null, submittedScore: null, possible: null, gradeJson: null, submittedAt: null, dueAt: before, now: NOW, exempt }));
check('teacher grid: exempt pre-switch practice is not-started, not missing', [cell(false), cell(true)], ['missing', 'not-started']);

// studentGrading end to end, one module of three lessons
const scope = (title, extra) => ({ title, moduleId: title.split('.').slice(0, 2).join('.'), unitId: 'U', preview: 'console', assignmentCode: null, maxScore: null, scoreKind: null, graded: true, kind: 'code', ...extra });
const scopeMap = new Map([
  ['skipped', scope('2.3.21 Skipped practice')],
  ['done', scope('2.3.22 Done practice')],
  ['late', scope('2.3.23 Practice due after the switch')],
  ['lab', scope('2.3.24 Old lab', { assignmentCode: 'A2.3.1' })],
]);
const due = { index: buildDueIndex([
  { scope: 'lesson', scopeId: 'skipped', dueAt: before }, { scope: 'lesson', scopeId: 'done', dueAt: before },
  { scope: 'lesson', scopeId: 'late', dueAt: after }, { scope: 'lesson', scopeId: 'lab', dueAt: before }]), waived: new Set(), now: NOW };
const states = [{ lesson_id: 'done', state: 'completed', score: 0 }, { lesson_id: 'lab', state: 'completed', score: 0 }];
const off = studentGrading(scopeMap, states, DEFAULT_WEIGHTS, due, null);
const on = studentGrading(scopeMap, states, DEFAULT_WEIGHTS, due, SWITCH);
check('off: only the A-code lab counts', [off.gradedTotal, off.counted, off.missingIds], [1, 1, []]);
check('on: all four are graded; skipped pre-switch practice is left out; post-switch practice is missing',
  [on.gradedTotal, on.doneCount, on.missingIds, on.counted], [4, 2, ['late'], 3]);

// ---------------------------------------------------------------- 3. pass rules
const crit = (...v) => v.map((verdict) => ({ verdict }));
check('off: a text answer passes with half met or partial', isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: crit('met', 'partial', 'missing', 'missing') }, null), true);
check('on: the same answer (37.5%) does not pass', isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: crit('met', 'partial', 'missing', 'missing') }, SWITCH), false);
check('on: 3 met of 4 (75%) passes; 2 met + 2 partial (75%) passes; 2 met + 1 partial (62.5%) does not',
  [crit('met', 'met', 'met', 'missing'), crit('met', 'met', 'partial', 'partial'), crit('met', 'met', 'partial', 'missing')]
    .map((c) => isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: c }, SWITCH)), [true, true, false]);
check('on: exactly 70% passes (7 of 10)', isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: crit(...Array(7).fill('met'), 'missing', 'missing', 'missing') }, SWITCH), true);
check('on: a required criterion still sinks it', isPassingGrade({ totalEarned: 0, totalPossible: 0, criteria: [{ verdict: 'missing', required: true }, ...crit('met', 'met', 'met', 'met')] }, SWITCH), false);
check('points rubrics are untouched (70% of points either way)',
  [isPassingGrade({ totalEarned: 7, totalPossible: 10, criteria: [] }, null), isPassingGrade({ totalEarned: 6, totalPossible: 10, criteria: [] }, SWITCH)], [true, false]);

const cards = (...s) => s.map((x) => (x === 'p' ? { status: 'failed', partial: true } : { status: x === 'y' ? 'passed' : 'failed' }));
const seventy = cards('y', 'y', 'y', 'y', 'y', 'y', 'y', 'n', 'n', 'n');
check('code is all-or-nothing, on or off', [cardsPass(seventy, 'code', SWITCH), cardsPass(cards('y', 'y'), 'code', SWITCH)], [false, true]);
check('off: a plan needs every card', cardsPass(seventy, 'plan', null), false);
check('on: a plan passes at 70% of cards, partial counting half', [cardsPass(seventy, 'plan', SWITCH), cardsPass(cards('y', 'y', 'p', 'p', 'n'), 'plan', SWITCH), cardsPass(cards('y', 'y', 'y', 'p', 'n', 'n'), 'plan', SWITCH)], [true, false, false]);
check('on: a required plan card must be green', cardsPass([{ status: 'failed', required: true }, ...cards('y', 'y', 'y', 'y', 'y', 'y', 'y', 'y', 'y')], 'plan', SWITCH), false);
check('cardScore counts partial as half', cardScore(cards('y', 'p', 'n')), 1.5);
const reqs = seventy.map((c, i) => ({ id: 'r' + i, title: 't' + i, description: '', ...c }));
const rep = reportFromRequirements(reqs, 0, 'plan', SWITCH);
check('on: a plan records its card score out of its cards', [rep.totalScore, rep.totalPossible, rep.passed], [7, 10, true]);
check('off: a plan reports as before (no points, not passed)', [reportFromRequirements(reqs, 0, 'plan', null).totalPossible, reportFromRequirements(reqs, 0, 'plan', null).passed], [0, false]);

const planMeta = { work: { kind: 'plan' }, requirements: [{}, {}, {}, {}] };
check('a plan has a maxScore only under v2 (its card count)', [lessonScoreFields(planMeta, null, false).maxScore, lessonScoreFields(planMeta, null, true).maxScore], [null, 4]);
check('completionCredit and a rubric still win', [lessonScoreFields({ ...planMeta, grading: { completionCredit: true } }, null, true).maxScore, lessonScoreFields({ ...planMeta, aiGrader: { rubric: [{ points: 5 }] } }, null, true).maxScore], [null, 5]);

// ---------------------------------------------------------------- 4. work kinds
check('kinds read off the structure', [
  workKindOf({ quiz: {} }, []), workKindOf({ editor: 'text', requirements: [{}] }, ['README.md']),
  workKindOf({ preview: 'console', requirements: [{}] }, ['script.js']), workKindOf({ preview: 'assignment', aiGrader: {} }, []),
  workKindOf({ preview: 'reshape', requirements: [{ type: 'model' }] }, ['script.js']), workKindOf({ preview: 'reading' }, ['content.md']),
  workKindOf({ preview: 'example' }, ['content.md', 'script.js']),
], ['quiz', 'plan', 'code', 'written', 'model', 'read', 'read']);
check('a matching work block has no problems', workProblems({ kind: 'code', graded: true }, 'code'), []);
check('a wrong kind is named', workProblems({ kind: 'code', graded: true }, 'plan'), ['work.kind is "code" but the lesson is built as "plan"']);
check('an ungraded code lab needs a why; with one it is fine',
  [workProblems({ kind: 'code', graded: false }, 'code').length, workProblems({ kind: 'code', graded: false, why: 'optional stretch' }, 'code').length], [1, 0]);
check('a missing block is named', workProblems(undefined, 'read'), ['has no "work" block']);

console.log(failures ? `\n${failures} FAILED` : `\nall ${n} passed`);
process.exit(failures ? 1 : 0);
