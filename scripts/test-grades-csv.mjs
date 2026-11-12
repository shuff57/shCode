// The per-student grade export (lib/grades-csv.ts): shape, blanks, quoting, and the spreadsheet-formula guard.
// Run: node scripts/test-grades-csv.mjs   (also part of `npm test`)
import { strict as assert } from 'node:assert';
import { buildGradesCsv, buildLessonScoresCsv, classAverage, compareByLastName, csvCell, lessonScoreText } from '../lib/grades-csv.ts';

const results = [];
function check(name, fn) {
  try { fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const S = (o) => ({ email: 'a@x.test', firstName: 'Ada', lastName: 'Lovelace', percent: 87, counted: 10, done: 9, total: 74, missing: 1, categories: [{ category: 'lab', percent: 90 }, { category: 'chapterTest', percent: 70 }], ...o });

check('a text cell that would run as a formula is neutralised, in every formula-starting form', () => {
  for (const bad of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tx', '\rx']) assert.ok(csvCell(bad).replace(/^"/, '').startsWith("'"), JSON.stringify(bad));
  assert.equal(csvCell('Ada'), 'Ada');
  assert.equal(csvCell("O'Brien"), "O'Brien");
});

check('a number is written as a number, not guarded (a negative or a decimal is not a formula)', () => {
  assert.equal(csvCell(87), '87');
  assert.equal(csvCell(-1.5), '-1.5');
  assert.equal(csvCell(NaN), '');
  assert.equal(csvCell(null), '');
});

check('commas, quotes and newlines are quoted and quotes doubled', () => {
  assert.equal(csvCell('Smith, Jo'), '"Smith, Jo"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a\nb'), '"a\nb"');
});

check('one header row and one row per student, with a column for every grade category', () => {
  const lines = buildGradesCsv([S(), S({ email: 'b@x.test', firstName: 'Ben', lastName: 'Franklin' })]).split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0].split(',').length, 7 + 7);
  assert.ok(lines[0].startsWith('last_name,first_name,email,grade_so_far_percent'));
});

check('a category the student has nothing counted in is blank, not 0', () => {
  const row = buildGradesCsv([S()]).split('\r\n')[1].split(',');
  assert.equal(row[3], '87');
  assert.equal(row[7], '90'); // Regular submodules
  assert.equal(row[8], ''); // Group Performance Assessments: nothing counted
  assert.equal(row[9], '70'); // Individual Chapter Tests
});

check('a student with nothing counted yet has a blank grade, not 0%', () => {
  const row = buildGradesCsv([S({ counted: 0, percent: 0, done: 0, missing: 0, categories: [] })]).split('\r\n')[1].split(',');
  assert.equal(row[3], '');
  assert.equal(row[4], '0');
});

check('rows are ordered by last name, and accounts with no name set come last', () => {
  const out = buildGradesCsv([
    S({ email: 'z@x.test', firstName: null, lastName: null }),
    S({ email: 'w@x.test', firstName: 'Eli', lastName: 'Whitney' }),
    S({ email: 'f@x.test', firstName: 'Ben', lastName: 'Franklin' }),
  ]).split('\r\n').slice(1).map((l) => l.split(',')[2]);
  assert.deepEqual(out, ['f@x.test', 'w@x.test', 'z@x.test']);
});

check('a hostile name cannot become a formula in the file', () => {
  const row = buildGradesCsv([S({ firstName: '=HYPERLINK("http://x","go")', lastName: '+1' })]).split('\r\n')[1];
  assert.ok(!/(^|,)"?[=+\-@]/.test(row.split(',').slice(0, 2).join(',')), row);
});

// ---- ux2 T8: the per-lesson export, the name order and the class average ----
check('last name order: by last, then first, then email; unnamed accounts last', () => {
  const people = [
    { email: 'z@x', firstName: 'Ben', lastName: 'Franklin' }, { email: 'a@x', firstName: 'Ada', lastName: 'Lovelace' },
    { email: 'walker@x' }, { email: 'c@x', firstName: 'Cleo', lastName: 'patra' }, { email: 'd@x', firstName: 'Dev', lastName: 'Patel' },
    { email: 'aa@x', firstName: 'Amy', lastName: 'Franklin' },
  ];
  assert.deepEqual([...people].sort(compareByLastName).map((p) => p.email), ['aa@x', 'z@x', 'a@x', 'd@x', 'c@x', 'walker@x']);
});
check('a cell reads as a number where there is a score, words where there is not, (late) when late', () => {
  const c = (o) => ({ state: null, score: null, submitted_score: null, possible: null, ...o });
  assert.equal(lessonScoreText(c({ state: 'completed', score: 4, possible: 5 })), 4);
  assert.equal(lessonScoreText(c({ state: 'completed', score: 4, possible: 5, late: true })), '4 (late)');
  assert.equal(lessonScoreText(c({ state: 'completed', score: null, possible: null, pending: true })), 'needs grading');
  assert.equal(lessonScoreText(c({ state: 'completed', score: 0, possible: 0 })), 'done');
  assert.equal(lessonScoreText(c({ state: 'started' })), 'started');
  assert.equal(lessonScoreText(c({ submitted_score: 2 })), 'handed in, 2, not passed');
  assert.equal(lessonScoreText(c({ late: true })), 'missing');
  assert.equal(lessonScoreText(undefined), null);
});
check('lesson export: names, grade, a column per lesson with its maximum and due date in the header, no code letters', () => {
  const csv = buildLessonScoresCsv(
    [{ email: 'b@x', firstName: 'Ben', lastName: 'Franklin', grade: 50, cells: { L1: { state: 'completed', score: 4, submitted_score: 4, possible: 5 } } },
     { email: 'n@x', grade: null, cells: { L1: { state: 'started', score: null, submitted_score: null, possible: null } } }],
    [{ id: 'L1', title: '1.4.22 Quiz', maxScore: 5, due: '2026-11-09' }, { id: 'L2', title: '1.4.23 Lab' }],
  );
  const [h, r1, r2] = csv.split('\r\n');
  assert.equal(h, 'last_name,first_name,email,grade_so_far_percent,"1.4.22 Quiz (out of 5, due 2026-11-09)",1.4.23 Lab');
  assert.equal(r1, 'Franklin,Ben,b@x,50,4,');
  assert.equal(r2, ',,n@x,,started,');
});
check('lesson export: a hostile name or title cannot become a formula', () => {
  const csv = buildLessonScoresCsv([{ email: 'x@x', firstName: '=1+1', lastName: '@cmd', grade: 1, cells: {} }], [{ id: 'L', title: '=HYPERLINK("x")' }]);
  assert.ok(!/(^|,)"?[=+\-@]/.test(csv.split('\r\n')[1].split(',').slice(0, 2).join(',')));
  assert.ok(csv.split('\r\n')[0].includes("'=HYPERLINK"));
});
check('class average: the mean of the numbers given, whole number, with how many', () => {
  assert.deepEqual(classAverage([100, 60, null, undefined, NaN, 75]), { avg: 78, n: 3 });
  assert.deepEqual(classAverage([]), { avg: null, n: 0 });
  assert.deepEqual(classAverage([null]), { avg: null, n: 0 });
});

console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrades-csv tests FAILED' : '\ngrades-csv tests passed');
