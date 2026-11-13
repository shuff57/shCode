#!/usr/bin/env node
// Guards the pure rules behind the teacher screens: lib/gradebook-view.ts (module filter),
// lib/teacher-drawer.ts (late-badge rule, chart grade detail, still-failing requirements, where a
// lesson opens). Run: node scripts/test-teacher-views.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'shcode-teacher-views-'));
execFileSync('node', [join(root, 'node_modules/typescript/bin/tsc'),
  join(root, 'lib/gradebook-view.ts'), join(root, 'lib/teacher-drawer.ts'), join(root, 'lib/rubric-mark.ts'),
  '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const req = createRequire(import.meta.url);
const { moduleOptions, selectGradebookLessons } = req(join(out, 'gradebook-view.js'));
const D = req(join(out, 'teacher-drawer.js'));
const RM = req(join(out, 'rubric-mark.js'));

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

// ---- module filter --------------------------------------------------------
const M33 = '3.3 Loops', M34 = '3.4 Arrows';
const lessons = [
  { id: 'a', unit: M33, c: true }, { id: 'b', unit: M33, c: false },
  { id: 'c', unit: M34, c: true }, { id: 'd', unit: M34, c: false }, { id: 'e', unit: M34, c: false },
];
const isCounted = (l) => l.c;
check('options count total and counted per module', moduleOptions(lessons, isCounted),
  [{ unit: M33, total: 2, counted: 1 }, { unit: M34, total: 3, counted: 1 }]);
let sel = selectGradebookLessons(lessons, { module: null, showAll: false, isCounted });
check('all modules, counted only', sel.lessons.map((l) => l.id), ['a', 'c']);
check('hidden counts the uncounted', sel.hidden, 3);
check('spans follow the shown lessons', sel.spans, [{ unit: M33, count: 1 }, { unit: M34, count: 1 }]);
sel = selectGradebookLessons(lessons, { module: M34, showAll: false, isCounted });
check('one module, counted only', sel.lessons.map((l) => l.id), ['c']);
check('hidden is for that module only', sel.hidden, 2);
sel = selectGradebookLessons(lessons, { module: M34, showAll: true, isCounted });
check('one module, everything', sel.lessons.map((l) => l.id), ['c', 'd', 'e']);
check('one module, one span of 3', sel.spans, [{ unit: M34, count: 3 }]);
check('showAll hides nothing', sel.hidden, 0);
sel = selectGradebookLessons(lessons, { module: M33, showAll: true, isCounted });
check('other module is excluded', sel.lessons.map((l) => l.id), ['a', 'b']);
sel = selectGradebookLessons(lessons.map((l) => ({ ...l, c: false })), { module: M33, showAll: false, isCounted });
check('nothing counted in scope falls back to all of it, not an empty grid', sel.lessons.map((l) => l.id), ['a', 'b']);
check('fallback is not "narrowed"', sel.narrowed, false);
check('null unit groups as Other', selectGradebookLessons([{ id: 'z', unit: null, c: true }], { module: 'Other', showAll: false, isCounted }).lessons.length, 1);

// ---- paging by module ------------------------------------------------------
const GV = req(join(out, 'gradebook-view.js'));
const M35 = '3.5 Readings only';
const paged = [...lessons, { id: 'f', unit: M35, c: false }];
const opts = moduleOptions(paged, isCounted);
check('module key is the leading number', GV.moduleKey('1.1 Software Lifecycle'), '1.1');
check('module key falls back to the label', GV.moduleKey('Other'), 'Other');
check('pages skip a module with nothing counted', GV.modulePages(opts, false).map((p) => p.unit), [M33, M34]);
check('with ungraded shown it is a page', GV.modulePages(opts, true).map((p) => p.unit), [M33, M34, M35]);
check('nothing counted anywhere: every module is a page',
  GV.modulePages(moduleOptions(paged, () => false), false).map((p) => p.unit), [M33, M34, M35]);
check('page size: counted only', GV.pageSize(opts[1], false), 1);
check('page size: everything', GV.pageSize(opts[1], true), 3);
const pages = GV.modulePages(opts, false);
check('a page shows exactly its module\'s counted lessons',
  selectGradebookLessons(paged, { module: pages[1].unit, showAll: false, isCounted }).lessons.map((l) => l.id), ['c']);
check('first page: no previous', GV.pagerFor(pages, M33), { unit: M33, position: 1, total: 2, prev: null, next: M34 });
check('last page: no next', GV.pagerFor(pages, M34), { unit: M34, position: 2, total: 2, prev: M33, next: null });
check('all modules: position 0, next is the first page', GV.pagerFor(pages, null), { unit: null, position: 0, total: 2, prev: null, next: M33 });
check('a stale unit reads as all modules', GV.pagerFor(pages, 'gone').position, 0);
check('address: all', GV.resolveModuleParam(pages, 'all'), null);
check('address: a key', GV.resolveModuleParam(pages, '3.4'), M34);
check('address: a full label', GV.resolveModuleParam(pages, M33), M33);
check('address: a stale key means no choice', GV.resolveModuleParam(pages, '9.9'), undefined);
check('address: absent means no choice', GV.resolveModuleParam(pages, null), undefined);
check('address: a module that is not a page means no choice', GV.resolveModuleParam(pages, '3.5'), undefined);
check('default: the most recently past-due counted lesson',
  GV.defaultModule(pages, paged, isCounted, { a: 100, c: 200 }, 300), M34);
check('default: a later past date wins whatever the order',
  GV.defaultModule(pages, paged, isCounted, { a: 250, c: 200 }, 300), M33);
check('default: nothing past, the next one coming due',
  GV.defaultModule(pages, paged, isCounted, { a: 900, c: 500 }, 300), M34);
check('default: an uncounted lesson\'s date is ignored',
  GV.defaultModule(pages, paged, isCounted, { d: 250, a: 100 }, 300), M33);
check('default: no dates, the first page', GV.defaultModule(pages, paged, isCounted, undefined, 300), M33);
check('default: no pages', GV.defaultModule([], paged, isCounted, undefined, 300), null);
check('column width grows to share the room', GV.pagedColumnWidth(800, 4), 200);
check('column width never below the minimum', GV.pagedColumnWidth(300, 4), 168);
check('column width capped', GV.pagedColumnWidth(2000, 2), 240);
check('column width: no columns', GV.pagedColumnWidth(800, 0), 168);

// ---- late rule -------------------------------------------------------------
check('late badge: counted and late', D.showLateBadge(true, true), true);
check('late badge: a reading is never late', D.showLateBadge(false, true), false);
check('late badge: on time', D.showLateBadge(true, false), false);
check('submission after due is late', D.submissionWasLate(2000, 1000), true);
check('submission before due is not late', D.submissionWasLate(500, 1000), false);
check('submission exactly at due is not late', D.submissionWasLate(1000, 1000), false);
check('no due date at submit is never late', D.submissionWasLate(9e12, null), false);
check('undefined due date is never late', D.submissionWasLate(9e12, undefined), false);

// ---- chart grade detail ----------------------------------------------------
const chart = JSON.stringify({
  structural: [],
  ai: {
    totalEarned: 13, totalPossible: 20, capped: true,
    summary: 'Shapes and order: 9 of 14.\nTotal 13 of 20 (pass at 16).',
    criteria: [
      { id: 'start', title: 'Starts with a terminal', earned: 2, max: 2, verdict: 'met', feedback: '', source: 'rules' },
      { id: 'loop', title: 'Loop back arrow', earned: 1, max: 3, verdict: 'partial', feedback: 'The arrow goes the wrong way.', source: 'rules' },
      { id: 'w1', title: 'Labels name the call', earned: 0, max: 2, verdict: 'missing', feedback: 'No label mentions it.', source: 'ai' },
      null, 'junk',
    ],
  },
});
const d = D.describeGrade(chart);
check('chart detail comes from the nested ai block', d.from, 'ai');
check('chart detail keeps the total', [d.totalEarned, d.totalPossible], [13, 20]);
check('chart detail drops junk entries', d.lines.length, 3);
check('chart detail keeps verdict and source', [d.lines[1].verdict, d.lines[1].source, d.lines[1].feedback], ['partial', 'rules', 'The arrow goes the wrong way.']);
check('criteria sum is shown beside a held total', d.criteriaSum, 3);
check('capped chart gets an explanatory note', /held at 13 of 20/.test(d.cappedNote) && /add up to 3/.test(d.cappedNote), true);
check('summary is carried', d.summary.startsWith('Shapes and order'), true);
const uncapped = D.describeGrade(JSON.stringify({ ai: { totalEarned: 5, totalPossible: 6, criteria: [{ id: 'x', earned: 5, max: 6, verdict: 'met', feedback: 'ok' }] } }));
check('uncapped chart has no note', [uncapped.capped, uncapped.cappedNote], [false, '']);
check('title falls back to the id', uncapped.lines[0].title, 'x');
const written = D.describeGrade(JSON.stringify({ totalEarned: 1, totalPossible: 2, criteria: [{ id: 'c', title: 'T', earned: 1, max: 2, verdict: 'partial', feedback: '' }] }));
check('a written grade reads from the top level', written.from, 'top');
check('no criteria is null', D.describeGrade(JSON.stringify({ structural: [] })), null);
check('malformed json is null', D.describeGrade('{nope'), null);
check('null is null', D.describeGrade(null), null);
check('verdict words', ['met', 'partial', 'missing', null].map(D.verdictWord), ['Met', 'Partly met', 'Missing', '']);

// ---- still-failing requirements -------------------------------------------
const rows = [
  { studentEmail: 's@x', lessonId: 'L1', reqId: 'r2', fails: 3, firstPassAt: null },
  { studentEmail: 's@x', lessonId: 'L1', reqId: 'r1', fails: 1, firstPassAt: null },
  { studentEmail: 's@x', lessonId: 'L1', reqId: 'r3', fails: 4, firstPassAt: 123 },
  { studentEmail: 's@x', lessonId: 'L2', reqId: 'r1', fails: 2, firstPassAt: null },
  { studentEmail: 'o@x', lessonId: 'L1', reqId: 'r1', fails: 9, firstPassAt: null },
  { studentEmail: 's@x', lessonId: 'L1', reqId: 'r9', fails: 0, firstPassAt: null },
];
const titles = [{ id: 'r1', title: 'First' }, { id: 'r2', title: 'Second' }, { id: 'r3', title: 'Third' }];
check('only this student, this lab, not yet passed, in checklist order',
  D.stillFailingRequirements(rows, 's@x', 'L1', titles),
  [{ reqId: 'r1', title: 'First', fails: 1 }, { reqId: 'r2', title: 'Second', fails: 3 }]);
check('a passed requirement is not listed', D.stillFailingRequirements(rows, 's@x', 'L1', titles).some((r) => r.reqId === 'r3'), false);
check('unknown ids show as the id', D.stillFailingRequirements(rows, 's@x', 'L2', undefined), [{ reqId: 'r1', title: 'r1', fails: 2 }]);
check('nothing for a student with no rows', D.stillFailingRequirements(rows, 'z@x', 'L1', titles), []);

// ---- where a lesson opens --------------------------------------------------
check('console opens the code editor', D.opensInCodeEditor('console'), true);
check('diagram does not', D.opensInCodeEditor('diagram'), false);
check('quiz does not', D.opensInCodeEditor('quiz'), false);
check('missing preview does not', D.opensInCodeEditor(null), false);

// ---- ux1 G1: scoring from the rubric ----------------------------------------
{
  const rubric = [
    { id: 'a', title: 'Inputs', points: 0, required: true },
    { id: 'b', title: 'Compare', points: 0 },
    { id: 'c', title: 'Report', points: 0 },
  ];
  const stored = [{ id: 'a', verdict: 'met' }, { id: 'b', verdict: 'partial', feedback: 'half there' }, { id: 'zzz', verdict: 'met' }];
  const cr = RM.buildMarkCriteria(rubric, stored);
  check('rubric criteria carry the AI verdict by id; an unknown stored id is not added', cr.map((c) => [c.id, c.aiVerdict]), [['a', 'met'], ['b', 'partial'], ['c', null]]);
  check('pass/fail criteria are checkboxes, each worth 1', [cr.map(RM.controlFor), cr.map(RM.criterionMax)], [['check', 'check', 'check'], [1, 1, 1]]);
  const m0 = RM.initialMarks(cr);
  check('AI verdicts pre-mark: met 1, partly 0.5, unsaid unmarked', m0, { a: 1, b: 0.5 });
  check('total, marked and max', RM.rubricTotal(cr, m0), { total: 1.5, marked: 2, max: 3 });
  check('a pass/fail rubric fits a form out of its criteria count', RM.rubricFitsForm(cr, 3), true);
  check('...and not a form out of 10', RM.rubricFitsForm(cr, 10), false);
  check('an unknown form maximum takes any rubric', RM.rubricFitsForm(cr, null), true);
  check('no criteria never fits', RM.rubricFitsForm([], null), false);
  const pts = RM.buildMarkCriteria([{ id: 'p', title: 'Plan', points: 4 }, { id: 'q', title: 'One', points: 1 }], [{ id: 'p', verdict: 'partial', earned: 2.6 }]);
  check('a criterion over a point is a stepper; a 1-point one a checkbox', pts.map(RM.controlFor), ['stepper', 'check']);
  check('a partly met pointed criterion starts at the AI points on half steps', RM.initialMarks(pts), { p: 2.5 });
  check('a mark is clamped to 0..points', [RM.clampMark(pts[0], 9), RM.clampMark(pts[0], -1), RM.clampMark(pts[0], NaN)], [4, 0, 0]);
  const solo = RM.buildMarkCriteria(null, [{ id: 'uses-loop', max: 2, verdict: 'met', earned: 2 }]);
  check('without a rubric the stored criteria are marked, titled from the id', [solo[0].title, solo[0].points], ['Uses loop', 2]);
  check('source words: rubric, part marked', RM.scoreSourceText('rubric', { total: 2, marked: 2, count: 3 }), 'From the rubric (2 of 3 criteria marked)');
  check('source words: typed by hand says what the rubric adds up to', RM.scoreSourceText('hand', { total: 2, marked: 2, count: 3 }), 'Typed by hand (the rubric adds up to 2)');
  check('source words: saved', RM.scoreSourceText('saved', null), 'Your saved score');
}

// ---- ux1 G3, G4: score wording and whether a score counts ---------------------
check('a score always reads x / max', [D.scoreOutOf(7, 10), D.scoreOutOf(1.555, 3)], ['7 / 10', '1.56 / 3']);
check('no maximum is said, never a dash', D.scoreOutOf(7, null), '7 (no maximum set)');
check('a lesson with points counts', D.scoreWeight({ counts: true, maxScore: 5 }), 'counts');
check('a counted lab with no maximum is done-only', D.scoreWeight({ counts: true, maxScore: null }), 'done-only');
check('a lesson with no category is practice', D.scoreWeight({ counts: false, maxScore: 5 }), 'practice');
check('unknown lesson: nothing said', [D.scoreWeight(null), D.scoreWeightNote(null), D.scoreWeightNote('counts')], [null, null, null]);
check('practice and done-only each have one sentence, no em dash',
  ['practice', 'done-only'].map((w) => typeof D.scoreWeightNote(w) === 'string' && !D.scoreWeightNote(w).includes('\u2014')), [true, true]);

// ---- ux1 G5: a quiz hand-in as questions and answers --------------------------
{
  const g = JSON.stringify({ variant: 0, quiz: [{ id: 'q1-four-ps', picked: 2, correct: true }, { id: 'q2-order', picked: 0, correct: false }, { id: 'q3-x' }] });
  const r = JSON.stringify({ answers: { 'q3-x': 1 }, graded: true });
  const rows = D.quizAnswerRows(g, r, { 'q1-four-ps': 'What are the four Ps?' });
  check('quiz rows: question text, chosen letter, right or wrong', rows.map((x) => [x.question, x.chosen, x.correct]),
    [['What are the four Ps?', 'Choice C', true], ['order', 'Choice A', false], ['x', 'Choice B', null]]);
  check('not a quiz is null', D.quizAnswerRows(JSON.stringify({ criteria: [] }), '', {}), null);
  check('malformed grade is null', D.quizAnswerRows('{', '', {}), null);
  check('a question with no pick says so', D.quizAnswerRows(JSON.stringify({ quiz: [{ id: 'q1' }] }), null, null)[0].chosen, 'No answer');
}

// ---- ux2 T1: one helper says whether a teacher's score changes the grade now ----
{
  const unfinished = D.scoreCountNote('counts', { lessonState: 'started', studentName: 'Ben' });
  check('a counted lesson the student has not finished: the score does not count yet, said with their name',
    [unfinished.reason, unfinished.tag, unfinished.note.startsWith('Counts once Ben finishes this lesson.')], ['unfinished', 'Counts once finished', true]);
  check('past due and not finished: says it counts as 0 until then',
    /past due, so until then the grade counts it as 0/.test(D.scoreCountNote('counts', { lessonState: 'started', pastDue: true, studentName: 'Ben' }).note), true);
  check('finished, or no lesson_state row yet (a teacher score finishes it): nothing to say',
    [D.scoreCountNote('counts', { lessonState: 'completed' }), D.scoreCountNote('counts', { lessonState: null }), D.scoreCountNote(null, {})], [null, null, null]);
  check('practice and done-only win over unfinished: the score never counts, whatever the state',
    [D.scoreCountNote('practice', { lessonState: 'started' }).reason, D.scoreCountNote('done-only', { lessonState: 'started' }).reason], ['practice', 'done-only']);
  check('the old label helpers read from the same helper (one wording)',
    [D.scoreWeightNote('done-only') === D.scoreCountNote('done-only').note, D.scoreWeightTag('practice') === D.scoreCountNote('practice').tag], [true, true]);
  check('no name: "the student"', D.scoreCountNote('counts', { lessonState: 'started' }).note.startsWith('Counts once the student finishes'), true);
  check('no em dash in any count note',
    [D.scoreCountNote('counts', { lessonState: 'started', pastDue: true }), D.scoreCountNote('practice'), D.scoreCountNote('done-only')].some((x) => x.note.includes('\u2014')), false);
  check('studentFirstName: the first name, else the email before @', [D.studentFirstName(' Ben ', 'b@x'), D.studentFirstName(null, 'cleo@school.test')], ['Ben', 'cleo']);
}

// ---- ux2 T3b: quiz rows carry the picked option's text and the right answer's ----
{
  const content = { questions: [
    { id: 'q1-four-ps', question: 'What are the four Ps?', options: ['Plan', 'Purpose', 'Problem, project, people, product', 'Price'], answer: 2 },
    { id: 'q2-order', question: 'Which comes first?', options: ['Construction', 'Inception'], answer: 1 },
    { id: 'q3-x', question: 'Unkeyed', options: ['A', 'B'], answer: null },
  ] };
  const g = JSON.stringify({ quiz: [{ id: 'q1-four-ps', picked: 2, correct: true }, { id: 'q2-order', picked: 0, correct: false }, { id: 'q3-x', picked: 1 }, { id: 'q4-gone', picked: 0 }] });
  const rows = D.quizAnswerRows(g, null, {}, content);
  check('quiz rows: question text from the teacher content, picked text, right answer text',
    rows.map((x) => [x.question, x.chosenText, x.answerText, x.correct]),
    [['What are the four Ps?', 'Problem, project, people, product', 'Problem, project, people, product', true],
     ['Which comes first?', 'Construction', 'Inception', false],
     ['Unkeyed', 'B', null, null],
     ['gone', null, null, null]]);
  check('the stored verdict wins; the key only fills a gap',
    D.quizAnswerRows(JSON.stringify({ quiz: [{ id: 'q2-order', picked: 1 }] }), null, null, content)[0].correct, true);
  check('an index outside the options is not shown as text', D.quizAnswerRows(JSON.stringify({ quiz: [{ id: 'q2-order', picked: 7 }] }), null, null, content)[0].chosenText, null);
  check('without teacher content the letters remain', D.quizAnswerRows(g, null, {}, null).map((x) => [x.chosen, x.chosenText]).slice(0, 2), [['Choice C', null], ['Choice A', null]]);
}

console.log(`\n${n} checks`);
