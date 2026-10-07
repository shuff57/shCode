// The per-student grade export (lib/grades-csv.ts): shape, blanks, quoting, and the spreadsheet-formula guard.
// Run: node scripts/test-grades-csv.mjs   (also part of `npm test`)
import { strict as assert } from 'node:assert';
import { buildGradesCsv, csvCell } from '../lib/grades-csv.ts';

const results = [];
function check(name, fn) {
  try { fn(); results.push(`  ok  ${name}`); } catch (e) { results.push(`FAIL  ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const S = (o) => ({ email: 'a@x.test', firstName: 'Ada', lastName: 'Lovelace', percent: 87, counted: 10, done: 9, total: 74, missing: 1, categories: [{ category: 'lab', percent: 90 }, { category: 'quiz', percent: 70 }], ...o });

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
  assert.equal(lines[0].split(',').length, 7 + 8);
  assert.ok(lines[0].startsWith('last_name,first_name,email,grade_so_far_percent'));
});

check('a category the student has nothing counted in is blank, not 0', () => {
  const row = buildGradesCsv([S()]).split('\r\n')[1].split(',');
  assert.equal(row[3], '87');
  assert.equal(row[7], '90'); // Weekly Lab
  assert.equal(row[8], ''); // Written: nothing counted
  assert.equal(row[9], '70'); // Quizzes
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

console.log(results.join('\n'));
console.log(process.exitCode ? '\ngrades-csv tests FAILED' : '\ngrades-csv tests passed');
