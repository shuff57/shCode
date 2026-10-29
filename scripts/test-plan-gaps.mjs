// Guards checkPlanGaps() -- the 3.9.1 find-and-fix grader.
//
// The lesson hands the pair a COMPLETE plan with four mistakes planted in it.
// What is graded is therefore not "is there a loop" (the lesson wrote it) but
// "does this line do its job, and is it handed what it needs". These checks pin
// that, and they pin the three things a repair must never do:
//   - a line of underscores is not a step: `report ______` has not reported;
//   - restoring the order without the name (or the name without the order) costs
//     exactly one job, never two;
//   - a pair cannot pass by leaving the change or its report broken.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-plan-gaps.mjs

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPlanGaps, GAP_PASS, PLAN_GAPS } from '../lib/plan-check.ts';
import { isUntouchedStarter } from '../lib/starter-variants.ts';
import { planGradeReport, planRequirements } from '../lib/plan-requirements.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lesson = 'lessons/3-9-1-ch3-group-pa-design-chart';
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n').trim();

const BLANK = '__________';
const HEADER = 'Problem:\nPartners:\n\nCONTRACTS (one row per function: name, takes in, gives back)\n-\n\nPLAN\n';

/** The four problems, and where each one's fixed plan lives. */
const PROBLEMS = [
  ['snack-shack', 'Snack Shack', `${lesson}/solution/README.md`],
  ['lap-times', 'Lap Times', `${lesson}/solution/variants/lap-times/README.md`],
  ['seed-tray', 'Seed Tray', `${lesson}/solution/variants/seed-tray/README.md`],
  ['library-cart', 'Library Cart', `${lesson}/solution/variants/library-cart/README.md`],
];

/**
 * The four mistakes, planted by line index in the 17-line reference plan:
 *   1  the load calls the save
 *   5  the subset call is not handed the level
 *   13/14  the report is moved ABOVE the change, and the change loses its name
 */
function breakPlan(ref) {
  const out = [...ref];
  out[1] = out[1].replace(/load(\w*)/, 'save$1');
  out[5] = out[5].replace(/,\s*[^)]*\)/, ')');
  [out[13], out[14]] = [out[14], out[13]];
  out[14] = out[14].replace(/,\s*"[^"]*"\)/, ')');
  return out;
}

const planOf = (text) => text.split('\nPLAN\n')[1].trimEnd().split('\n');
const textOf = (lines) => HEADER + lines.join('\n') + '\n';

let n = 0;
let failures = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.error('  FAIL ' + msg); } };
const verdict = (r, id) => r.criteria.find((c) => c.id === id)?.verdict;
const met = (r) => r.criteria.filter((c) => c.verdict === 'met').length;
const partial = (r) => r.criteria.filter((c) => c.verdict === 'partial').length;

const lessonJson = JSON.parse(read(`${lesson}/lesson.json`));
const variants = lessonJson.starterVariants ?? [];

// --- the shipped starters are the references, with the four mistakes ---------
// If replanting the four mistakes reproduces the starter, the starter can never
// drift from the answer it belongs to, and the four mistakes are the only thing
// the pair is asked to repair.
check(variants.length === 4, 'four starters, one per problem');
check(
  variants.map((v) => v.id).join(',') === 'snack-shack,lap-times,seed-tray,library-cart',
  'the starters are the lesson\'s four problems, in its order',
);

for (const [i, [id, label, rel]] of PROBLEMS.entries()) {
  const v = variants[i];
  const ref = planOf(read(rel));
  const starterPlan = planOf(v.text);

  check(v.id === id && v.label === label, `${id}: the starter is labelled and keyed for its problem`);
  check(ref.length === 17, `${id}: the reference is the 17-line plan`);
  check(starterPlan.length === 17, `${id}: the starter has the same 17 lines`);
  check(starterPlan.join('\n') === breakPlan(ref).join('\n'), `${id}: the starter is its reference with the four mistakes planted`);
  check((v.text.match(/_{3,}/g) ?? []).length === 0, `${id}: the starter has no blanks left`);

  const r = checkPlanGaps(v.text);
  check(met(r) === 4, `${id}: untouched, four of the eight jobs are already right (got ${met(r)})`);
  check(partial(r) === 2, `${id}: untouched, two jobs are half-right (got ${partial(r)})`);
  check(verdict(r, 'gap-1-load') === 'missing', `${id}: the planted load mistake is missing, not met`);
  check(verdict(r, 'gap-3-subset') === 'partial', `${id}: the subset call without the level is partial`);
  check(verdict(r, 'gap-6-change') === 'partial', `${id}: the change call without the name is partial`);
  check(verdict(r, 'gap-7-report') === 'missing', `${id}: a report above the change is not a report of it`);
  check(!r.passed, `${id}: untouched, the starter does not pass`);
  check(r.blanks === 0, `${id}: untouched, nothing is left as underscores`);
}

// --- one repair at a time ----------------------------------------------------
// Each mistake repaired in place costs exactly that job. The two half-right
// calls each have a single repair, and the report/change pair has two
// independent ones: restoring the order fixes the report, and adding the name
// fixes the change.
const snack = planOf(read(PROBLEMS[0][2]));
const snackStarter = planOf(variants[0].text);

const withLine = (lines, index, text) => lines.map((l, i) => (i === index ? text : l));
const fixLoad = withLine(snackStarter, 1, snack[1]);
const fixSubset = withLine(snackStarter, 5, snack[5]);
const fixName = withLine(snackStarter, 14, snack[13]);
const swapOrder = (lines) => { const out = [...lines]; [out[13], out[14]] = [out[14], out[13]]; return out; };
const fixOrder = swapOrder(snackStarter);
const fixBoth = withLine(withLine(snackStarter, 13, snack[13]), 14, snack[14]);
const fixAll = withLine(withLine(fixBoth, 1, snack[1]), 5, snack[5]);

const cases = [
  ['load', fixLoad, 'gap-1-load'],
  ['subset', fixSubset, 'gap-3-subset'],
  ['name', fixName, 'gap-6-change'],
  ['order', fixOrder, 'gap-7-report'],
];
for (const [name, lines, id] of cases) {
  const r = checkPlanGaps(textOf(lines));
  check(verdict(r, id) === 'met', `repairing the ${name} fixes ${id}`);
  const wrong = r.criteria.filter((c) => c.verdict !== 'met').map((c) => c.id);
  check(wrong.length === 3, `repairing the ${name} leaves exactly three jobs not met (got ${wrong.join(', ')})`);
  check(met(r) === 5, `repairing the ${name} still leaves five of eight (got ${met(r)})`);
  check(!r.passed, `repairing only the ${name} does not pass, because the required change and report are not both right`);
}

// Fixing both crux jobs passes at six of eight -- the same "two may be left"
// allowance the blanks had. Fixing the two ordinary jobs instead does not: the
// required gate is what stops a plan with no sale in it from passing.
const cruxOnly = checkPlanGaps(textOf(fixBoth));
check(met(cruxOnly) === 6, 'the two crux repairs leave six of eight');
check(cruxOnly.passed, 'the two crux repairs pass');

const ordinaryOnly = checkPlanGaps(textOf(withLine(fixLoad, 5, snack[5])));
check(met(ordinaryOnly) === 6, 'the two ordinary repairs also leave six of eight');
check(!ordinaryOnly.passed, 'six of eight without the change and its report is a fail');

// All four repairs reproduce the reference, byte for byte, and score full.
const fixed = checkPlanGaps(textOf(fixAll));
check(met(fixed) === 8, 'repairing all four jobs scores eight of eight');
check(fixed.passed, 'the fully repaired plan passes');
check(textOf(fixAll).trimEnd() === HEADER + snack.join('\n'), 'repairing all four mistakes gives the reference plan, byte for byte');

// The bar, stated plainly. Six of eight is 75%, the nearest job count to the 70%
// the course asks for, and it means a pair may leave two jobs. If that allowance
// ever feels too loose, GAP_PASS is the one number to move.
const twoLeft = checkPlanGaps(textOf(withLine(withLine(fixBoth, 1, snackStarter[1]), 5, snackStarter[5])));
check(met(twoLeft) === 6, 'two jobs left costs two marks');
check(twoLeft.passed, 'two jobs still pass at six of eight (the 75% bar)');
check(GAP_PASS === 6, 'the bar is six of eight');

// --- a blank is not a step -------------------------------------------------
// A pair can still empty a line. `report ______` must not satisfy the report
// job, and a blank line in the loop is not work.
const blankReport = withLine(snackStarter, 13, BLANK);
check(verdict(checkPlanGaps(textOf(blankReport)), 'gap-7-report') === 'missing', 'a blanked report line is not a report');
const blankBody = withLine(snackStarter, 12, BLANK);
check(verdict(checkPlanGaps(textOf(blankBody)), 'gap-5-loop-body') === 'missing', 'a blank loop body is not work');

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
check(met(shout) === 8, 'shouting and misspelling the names does not cost a job');

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
check(js.passed, 'a JavaScript-shaped plan filled into the shape passes');

// --- determinism -----------------------------------------------------------
check(JSON.stringify(checkPlanGaps(renamed)) === JSON.stringify(checkPlanGaps(renamed)), 'same text -> identical result');
check(
  JSON.stringify(checkPlanGaps(renamed)) === JSON.stringify(checkPlanGaps(renamed.replace(/\n/g, '\r\n'))),
  'CRLF does not change the result',
);

// The picker overwrites only a file that still holds a starter. Anything typed
// must be confirmed first, so "is this untouched?" has to be able to say no.
const asLesson = { id: 'probe', starterVariants: variants };
check(isUntouchedStarter(asLesson, variants[0].text), 'the shipped starter counts as untouched');
check(isUntouchedStarter(asLesson, variants[1].text), 'another problem\'s starter counts as untouched');
check(isUntouchedStarter(asLesson, '  \n'), 'an empty file counts as untouched');
check(!isUntouchedStarter(asLesson, textOf(fixLoad)), 'a repaired line is work, not a starter');

// --- the editor strip is the same eight jobs -------------------------------
// The strip a student reads before submitting and the grade they get after
// must describe the same eight jobs. One red card per job the plan is not doing.
const strip = planRequirements(variants[0].text);
check(strip.length === 8, 'the strip shows eight cards, not the authored four');
check(strip.map((r) => r.id).join(',') === PLAN_GAPS.map((g) => g.id).join(','), 'the cards are the jobs, in the order the student sees them');
check(
  strip.every((r, i) => r.title === PLAN_GAPS[i].title + (PLAN_GAPS[i].required ? ' (required)' : '')),
  'each card carries its job\'s title, and the two required ones say so',
);
check(
  strip.filter((r) => r.title.endsWith('(required)')).length === 2,
  'exactly the change and its report are marked required',
);
check(strip.every((r) => r.description === PLAN_GAPS.find((g) => g.id === r.id).wants), 'each card asks the lesson\'s own question for its job');
const stripMet = strip.filter((r) => r.status === 'passed').length;
check(stripMet === 4, 'the untouched starter is four green cards and four red ones');
check(strip.filter((r) => r.status === 'failed').map((r) => r.id).join(',') === 'gap-1-load,gap-3-subset,gap-6-change,gap-7-report', 'the red cards are exactly the four mistakes');
check(planRequirements(textOf(fixBoth)).filter((r) => r.status === 'passed').map((r) => r.id).join(',') === 'gap-2-total,gap-4-lines,gap-5-loop-body,gap-6-change,gap-7-report,gap-8-save', 'the two crux repairs turn exactly the crux cards green');
check(planRequirements(renamed).every((r) => r.status === 'passed'), 'the reference is eight green cards');
const partialStrip = planRequirements(variants[0].text);
check(partialStrip.find((r) => r.id === 'gap-6-change').messages.length === 2, 'a red required card carries the reason and the note that it cannot be left');
check(partialStrip.find((r) => r.id === 'gap-1-load').messages.length === 1, 'a red ordinary card carries the reason only');
check(planRequirements(renamed).find((r) => r.id === 'gap-6-change').messages.length === 0, 'a green card carries no complaint');

// The report built for the strip passes on the same rule as the grader.
const stripReport = planGradeReport(variants[0].text);
check(stripReport.totalScore === 4 && stripReport.totalPossible === 8, 'the strip report counts the eight jobs');
check(stripReport.passed === false, 'the untouched starter fails the strip report');
const halfReport = planGradeReport(textOf(withLine(fixLoad, 5, snack[5])));
check(halfReport.totalScore === 6 && halfReport.passed === false, 'six of eight without the crux jobs still fails the strip report');
check(planGradeReport(textOf(fixBoth)).passed === true, 'the two crux repairs pass the strip report');

// --- the spec and the checks agree ----------------------------------------
check(PLAN_GAPS.length === 8, 'the gap spec lists eight jobs');
check(fixed.criteria.every((c, i) => c.id === PLAN_GAPS[i].id), 'the jobs come back in the order the student sees them');
check(PLAN_GAPS.filter((g) => g.required).map((g) => g.id).join(',') === 'gap-6-change,gap-7-report', 'the spec marks exactly the change and its report as required');

console.log(`\n[test-plan-gaps] ${n - failures}/${n} checks held`);
if (failures) process.exit(1);
console.log('[test-plan-gaps] OK - four mistakes, one mark per job, and a repair is never a free pass');
