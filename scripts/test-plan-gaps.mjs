// Guards checkPlanGaps() -- the 3.9.1 skeleton grader.
//
// The lesson hands the pair a plan with the SHAPE given and eight blanks in it.
// What is graded is therefore not "is there a loop" (the lesson wrote it) but
// "which function goes in this blank, and is it handed what it needs". These
// checks pin that, and they pin the two things a blank must never do:
//   - a line of underscores is not a step: `report ______` has not reported;
//   - one blank emptied costs ONE gap, never two (a missing change call must
//     not also take away the report that follows it).
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-plan-gaps.mjs

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPlanGaps, GAP_PASS, PLAN_GAPS } from '../lib/plan-check.ts';
import { isUntouchedStarter } from '../lib/starter-variants.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lesson = 'lessons/3-9-1-ch3-group-pa-design-chart';
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n').trim();

const BLANK = '__________';
const starter = read(`${lesson}/README.md`);
const reference = read(`${lesson}/solution/README.md`);

/** What goes in the eight blanks, top to bottom. */
const ANSWERS = [
  'loadStock()',
  'totalValue(stock)',
  'lowStock(stock, reorder level)',
  'receiptLines(stock)',
  'put the line on the screen',
  'sellItem(stock, "Popcorn")',
  'the new total, totalValue(stock), and the new quantity of Popcorn',
  'saveStock(stock)',
];

/** Fill the skeleton's blanks in order with `answers`. */
function fill(answers) {
  let i = 0;
  return starter
    .split('\n')
    .map((l) => (l.includes(BLANK) && i < answers.length ? l.replace(BLANK, answers[i++]) : l))
    .join('\n');
}
/** Answer every blank but the nth (1-based), which is left as underscores. */
const missingBlank = (n) => fill(ANSWERS.map((a, i) => (i === n - 1 ? BLANK : a)));

let n = 0;
let failures = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.error('  FAIL ' + msg); } };
const verdict = (r, id) => r.criteria.find((c) => c.id === id)?.verdict;
const met = (r) => r.criteria.filter((c) => c.verdict === 'met').length;

// --- the skeleton is the reference, with the answers taken out -------------
// If filling it back reproduces the lesson's own answer, the blanks are the
// only thing being asked of the student.
const planOf = (t) => t.split('\nPLAN\n')[1].trim();
check(planOf(fill(ANSWERS)) === reference, 'the skeleton filled with the reference answers is the reference plan');

// --- the reference answer ---------------------------------------------------
const ref = checkPlanGaps(reference);
check(ref.criteria.length === 8, 'eight gaps, one per blank');
check(met(ref) === 8, 'the reference plan has every gap right');
check(ref.passed, 'the reference plan passes');
check(ref.blanks === 0, 'the reference plan has no blanks left');

// --- the shipped starter ---------------------------------------------------
// Eight lines of underscores are eight empty answers, including the `report
// ______` line: a blank is not a report.
const skel = checkPlanGaps(starter);
check(skel.blanks === 8, 'the untouched starter is eight blanks');
check(met(skel) === 0, 'the untouched starter has nothing right');
check(!skel.passed, 'the untouched starter does not pass');
check(verdict(skel, 'gap-7-report') === 'missing', '`report ______` is not a report');

// --- one blank at a time ---------------------------------------------------
// Each blank emptied in turn costs exactly that gap. One blank wrong is the
// allowance the 6-of-8 bar is for; two at once must not still pass.
const names = [
  'gap-1-load', 'gap-2-total', 'gap-3-subset', 'gap-4-lines',
  'gap-5-loop-body', 'gap-6-change', 'gap-7-report', 'gap-8-save',
];
// Blanks 6 and 7 are required: the change to one record is what the lesson
// calls the point of the plan, and the report is the proof. Six of eight is the
// tolerance for wording, not permission to skip the sale.
const CRUX = new Set(['gap-6-change', 'gap-7-report']);
for (let i = 0; i < 8; i++) {
  const r = checkPlanGaps(missingBlank(i + 1));
  const wrong = r.criteria.filter((c) => c.verdict !== 'met').map((c) => c.id);
  check(wrong.length === 1 && wrong[0] === names[i], `blank ${i + 1} missing costs only ${names[i]} (got ${wrong.join(', ') || 'none'})`);
  check(met(r) === 7, `blank ${i + 1} missing still leaves 7 of 8`);
  if (CRUX.has(names[i])) {
    check(!r.passed, `blank ${i + 1} is required: seven of eight is not a pass without it`);
  } else {
    check(r.passed, `blank ${i + 1} missing still passes`);
  }
}

// The two-crux case: no change call and no report. That is one decision made
// twice, and it fails -- at six of eight, which used to be a pass.
const noChange = checkPlanGaps(fill(ANSWERS.map((a, i) => (i === 5 ? BLANK : i === 6 ? BLANK : a))));
check(met(noChange) === 6, 'both crux blanks left costs exactly two gaps');
check(verdict(noChange, 'gap-7-report') === 'missing', 'an empty report after an empty change is missing');
check(!noChange.passed, 'six of eight without the change and its report is a fail');

// A half-filled change is not a sale either: handed only the list, it cannot
// know which record to change.
const halfChange = checkPlanGaps(fill(ANSWERS.map((a, i) => (i === 5 ? 'sellItem(stock)' : a))));
check(verdict(halfChange, 'gap-6-change') === 'partial', 'a change call handed only the list is partial');
check(!halfChange.passed, 'a partial change call does not pass the part');
check(PLAN_GAPS.filter((g) => g.required).map((g) => g.id).join(',') === 'gap-6-change,gap-7-report', 'the spec marks exactly the change and its report as required');

// The bar, stated plainly. Six of eight is 75%, the nearest whole-blank count
// to the 70% the course asks for, and it means a pair may leave two blanks.
// Three is a fail. If that allowance ever feels too loose, GAP_PASS is the one
// number to move.
const two = checkPlanGaps(fill(ANSWERS.map((a, i) => (i === 1 || i === 3 ? BLANK : a))));
check(met(two) === 6, 'two blanks left costs two gaps');
check(two.passed, 'two blanks still pass at six of eight (the 70% bar)');
const three = checkPlanGaps(fill(ANSWERS.map((a, i) => (i === 1 || i === 3 || i === 7 ? BLANK : a))));
check(met(three) === 5, 'three blanks left costs three gaps');
check(!three.passed, 'three blanks left fails');
check(GAP_PASS === 6, 'the bar is six of eight');

// --- the pair's own names count -------------------------------------------
// Same job, different words, with the contracts saying what each does: this is
// the plan the rubric asks for, so it must score full.
const renamed = `Problem: Snack Shack
Partners: A and B

CONTRACTS (one row per function: name, takes in, gives back)
- addUp(list) adds up price times qty for the whole list
- underLevel(list, level) gives back a NEW array of the items below that level
- linesFor(list) gives back one line per item
- takeOne(list, name) lowers that item's qty by one
- storeStock(list) saves the list to storage
- readStock() gives the list back

PLAN
START
set stock to readStock()
set shop name and reorder level
set total to addUp(stock)
report the shop name and the total
set low to underLevel(stock, reorder level)
if low has anything in it
    report the low-stock list
otherwise
    report that everything is stocked
set lines to linesFor(stock)
for each line in lines
    put the line on the screen
takeOne(stock, "Popcorn")
report the new total and the new qty of Popcorn
storeStock(stock)
END`;
const ren = checkPlanGaps(renamed);
check(met(ren) === 8, 'a plan using the pair\'s own names and contracts scores full');
check(ren.passed, 'the renamed plan passes');

// Shouting and a slip of the fingers.
const shouting = renamed
  .replace(/readStock/g, 'READSTOCK')
  .replace(/addUp/g, 'ADDUP')
  .replace(/underLevel/g, 'UNDERLEVEL')
  .replace(/linesFor/g, 'LINESFOR')
  .replace(/takeOne/g, 'TAKEONE')
  .replace(/storeStock/g, 'STORESTOCK');
const shout = checkPlanGaps(shouting);
check(met(shout) === 8, 'shouting and misspelling the names does not cost a gap');

// --- a blank is not a step -------------------------------------------------
// `report ______` must not satisfy the report gap, and a blank inside the loop
// must not satisfy the loop's work.
const fakeReport = checkPlanGaps(missingBlank(7));
check(verdict(fakeReport, 'gap-7-report') === 'missing', 'a blanked report line is not a report');
const fakeBody = checkPlanGaps(missingBlank(5));
check(verdict(fakeBody, 'gap-5-loop-body') === 'missing', 'a blank loop body is not work');

// --- a report inside the loop is not the report of one change -------------
// `put the line on the screen` prints once per item. It cannot stand in for the
// line that shows the effect of changing one record, so the report has to come
// after the loop as well as after the change.
const reportInLoop = checkPlanGaps(`Problem: Snack Shack
CONTRACTS
- totalValue(list) gives back the total value
- lowStock(list, level) gives back a NEW list below the level
- receiptLines(list) gives back one line per item
- sellItem(list, name) lowers that item's qty by one
- saveStock(list) saves the list
- loadStock() gives the list back
PLAN
START
set stock to loadStock()
set total to totalValue(stock)
report total
set low to lowStock(stock, 3)
set lines to receiptLines(stock)
sellItem(stock, "Popcorn")
for each line in lines
    put the line on the screen
saveStock(stock)
END`);
check(verdict(reportInLoop, 'gap-6-change') === 'met', 'the change call itself is credited');
check(verdict(reportInLoop, 'gap-7-report') === 'missing', 'a print inside the loop is not a report of the change');

// --- a plan written as JavaScript is not marked down for it ---------------
// The rubric welcomes real code showing the same plan. `JSON.parse(` and
// `getItem(` are not the pair's named functions, so the round trip has to be
// recognised from the browser's own calls, and `console.log(` counts as the
// loop doing something with each line.
const jsPlan = `Problem: Snack Shack
CONTRACTS
- totalValue(list) gives back the total value
- lowStock(list, level) gives back a NEW list below the level
- receiptLines(list) gives back one line per item
- sellItem(list, name) lowers that item's qty by one
- saveStock(list) saves the list
- loadStock() gives the list back
PLAN
START
let stock = JSON.parse(localStorage.getItem("stock"))
set total to totalValue(stock)
report total
set low to lowStock(stock, 3)
set lines to receiptLines(stock)
for (let i = 0; i < lines.length; i++) {
    console.log(lines[i])
}
sellItem(stock, "Popcorn")
report totalValue(stock + " and " + stock[0].qty)
localStorage.setItem("stock", JSON.stringify(stock))
END`;
const js = checkPlanGaps(jsPlan);
check(verdict(js, 'gap-1-load') === 'met', 'localStorage.getItem / JSON.parse counts as the load');
check(verdict(js, 'gap-5-loop-body') === 'met', 'console.log(lines[i]) counts as the loop doing work');
check(verdict(js, 'gap-8-save') === 'met', 'localStorage.setItem counts as the save');
check(js.passed, 'a JavaScript-shaped plan filled into the skeleton passes');

// --- determinism -----------------------------------------------------------
check(JSON.stringify(checkPlanGaps(reference)) === JSON.stringify(checkPlanGaps(reference)), 'same text -> identical result');
check(
  JSON.stringify(checkPlanGaps(reference)) === JSON.stringify(checkPlanGaps(reference.replace(/\n/g, '\r\n'))),
  'CRLF does not change the result',
);

// --- one starter per problem ----------------------------------------------
// Step 1 offers four problems, so the editor offers four skeletons: the same
// eight blanks, worded in that problem's own names. Each starter must be its
// problem's reference answer with the eight answers taken out -- fill it back
// and you get the reference, byte for byte.
const lessonJson = JSON.parse(read(`${lesson}/lesson.json`));
const variants = lessonJson.starterVariants ?? [];
const solutions = {
  'snack-shack': `${lesson}/solution/README.md`,
  'lap-times': `${lesson}/solution/variants/lap-times/README.md`,
  'seed-tray': `${lesson}/solution/variants/seed-tray/README.md`,
  'library-cart': `${lesson}/solution/variants/library-cart/README.md`,
};
// 0-based, inside START..END: load, total, subset, lines, loop body, change,
// report, save.
const ANSWER_LINES = [1, 3, 5, 10, 12, 13, 14, 15];

check(variants.length === 4, 'four starters, one per problem');
check(
  variants.map((v) => v.id).join(',') === 'snack-shack,lap-times,seed-tray,library-cart',
  'the starters are the lesson\'s four problems, in its order'
);
check(variants[0]?.text.trim() === starter, 'the first starter is the shipped README, so a pair who never picks still gets a starter');

for (const v of variants) {
  const sol = read(solutions[v.id]).split('\n');
  const plan = v.text.split('\nPLAN\n')[1].trimEnd().split('\n');
  check(sol.length === 17, `${v.id}: the reference is the 17-line plan`);
  check(plan.length === 17 && plan[0] === 'START' && plan[16] === 'END', `${v.id}: the starter has the same 17 lines`);
  check((v.text.match(/_{3,}/g) ?? []).length === 8, `${v.id}: eight blanks`);
  const filled = plan.map((l, i) => (ANSWER_LINES.includes(i) ? sol[i] : l)).join('\n');
  check(filled === sol.join('\n'), `${v.id}: filled with its own answers, the starter is the reference`);

  const blank = checkPlanGaps(v.text);
  check(blank.blanks === 8, `${v.id}: untouched, the starter is eight blanks`);
  check(met(blank) === 0, `${v.id}: untouched, nothing is credited`);
  check(!blank.passed, `${v.id}: untouched, the starter does not pass`);
  const done = checkPlanGaps(filled);
  check(met(done) === 8, `${v.id}: filled in, every gap is right`);
  check(done.passed, `${v.id}: filled in, the plan passes`);
}

// The picker overwrites only a file that still holds a starter. Anything typed
// must be confirmed first, so "is this untouched?" has to be able to say no.
const asLesson = { id: 'probe', starterVariants: variants };
check(isUntouchedStarter(asLesson, starter), 'the shipped starter counts as untouched');
check(isUntouchedStarter(asLesson, variants[1].text), 'another problem\'s starter counts as untouched');
check(isUntouchedStarter(asLesson, '  \n'), 'an empty file counts as untouched');
check(!isUntouchedStarter(asLesson, starter.replace('set stock to __________', 'set stock to loadStock()')), 'a filled-in blank is work, not a starter');

// --- the spec and the checks agree ----------------------------------------
check(PLAN_GAPS.length === 8, 'the gap spec lists eight blanks');
check(ref.criteria.every((c, i) => c.id === PLAN_GAPS[i].id), 'the gaps come back in the order the student sees them');

console.log(`\n[test-plan-gaps] ${n - failures}/${n} checks held`);
if (failures) process.exit(1);
console.log('[test-plan-gaps] OK - eight blanks, one mark each, and a blank is never a step');
