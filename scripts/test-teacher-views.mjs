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
  join(root, 'lib/gradebook-view.ts'), join(root, 'lib/teacher-drawer.ts'),
  '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const req = createRequire(import.meta.url);
const { moduleOptions, selectGradebookLessons } = req(join(out, 'gradebook-view.js'));
const D = req(join(out, 'teacher-drawer.js'));

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

console.log(`\n${n} checks`);
