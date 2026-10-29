// Guards lib/plan-check.ts, the deterministic grader for the Chapter 3 plan.
//
// Why it exists: the AI grader marking these four criteria changed its verdict
// on the same plan between runs (measured: six of sixteen identical plans).
// This grader must be boringly repeatable, and it must be right on the forms
// the course actually teaches:
//   - reference answers and every variant score full;
//   - the untouched starter does not pass the lesson's own grader;
//   - a contract line is not a call, and a loop inside a function description
//     is not a loop in the main plan;
//   - the no-parentheses form a real student wrote ("totalvalue of stock")
//     counts, and so does a numbered "go back to #5" loop;
//   - the same text always produces byte-identical output.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-plan-check.mjs

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPlan, checkPlanGaps } from '../lib/plan-check.ts';
import { formatPlan } from '../lib/plan-format.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lesson = 'lessons/3-9-1-ch3-group-pa-design-chart';
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n?/g, '\n').trim();

let n = 0;
let failures = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.error('  FAIL ' + msg); } };
const verdict = (r, id) => r.criteria.find((c) => c.id === id)?.verdict;

// --- the lesson's own answers ---------------------------------------------
for (const f of [
  'solution/README.md',
  'solution/variants/lap-times/README.md',
  'solution/variants/seed-tray/README.md',
  'solution/variants/library-cart/README.md',
]) {
  const r = checkPlan(read(`${lesson}/${f}`));
  check(r.criteria.every((c) => c.verdict === 'met'), `${f}: every criterion met`);
  check(r.passed, `${f}: passes`);
}
// The starter is a complete plan with four mistakes planted in it (see
// scripts/test-plan-gaps.mjs for the eight-job bar, which is 3.9.1's). The
// four-criteria bar below is the grader for a plan written from nothing, and it
// is kept honest here in the way it can be: the starter must not pass the
// lesson's own grader, and the two planted faults it still has -- the change
// call without a name and the load that calls the save -- must show here too.
const starter = checkPlan(read(`${lesson}/README.md`));
check(!checkPlanGaps(read(`${lesson}/README.md`)).passed, 'starter: does not pass the lesson\'s own grader');
check(verdict(starter, 'change-one-record') === 'partial', 'starter: the change call without a name is partial');
check(verdict(starter, 'save-and-load') === 'partial', 'starter: a load that calls the save is not a load');

// --- determinism ----------------------------------------------------------
const sample = read(`${lesson}/solution/README.md`);
check(JSON.stringify(checkPlan(sample)) === JSON.stringify(checkPlan(sample)), 'same text -> identical result');
check(JSON.stringify(checkPlan(sample)) === JSON.stringify(checkPlan(sample.replace(/\n/g, '\r\n'))), 'CRLF does not change the result');

// --- a contract line is not a call / a contract loop is not the plan loop -
const contractOnly = `
CONTRACTS
- lowStock(list, level) goes through the list with a FOR EACH and keeps the low items
PLAN
START
set stock to loadStock()
set total to totalValue(stock)
report total
sellItem(stock, "Popcorn")
report totalValue(stock)
saveStock(stock)
END`;
const c1 = checkPlan(contractOnly);
check(verdict(c1, 'loop-over-the-list') === 'missing', 'a loop only in a contract does not count as the plan loop');
check(verdict(c1, 'functions-as-calls') === 'met', 'four named calls count, and loadStock() needs nothing to be handed');
check(verdict(c1, 'change-one-record') === 'met', 'change call with two arguments and a later report');
check(/inside a function description/.test(c1.criteria.find((c) => c.id === 'loop-over-the-list').feedback), 'feedback says where the loop is');

// --- the change call present but nothing reports the effect ---------------
const noReport = contractOnly.replace('report totalValue(stock)\n', '');
const c2 = checkPlan(noReport);
check(verdict(c2, 'change-one-record') === 'partial', 'change call without a later report is partial');

// The pass rule is "at least half FULLY met"; partials do not count. This plan
// has one fully-met criterion (save/load) and three partials and must not pass.
const oneMet = `
START
set stock to loadStock()
report stock
for each line in stock
report done
sellItem(stock)
saveStock(stock)
END`;
const c2b = checkPlan(oneMet);
check(c2b.criteria.filter((c) => c.verdict === 'met').length === 1, 'this plan has exactly one fully-met criterion');
check(!c2b.passed, 'one fully-met criterion is not enough to pass');

// --- the no-parentheses form a real student used --------------------------
const ofForm = `
Problem: Snack Shack
CONTRACTS
- makeItem(name, price, qty) gives back one item
- totalValue(list) returns the total
- lowStock(list, level) returns the low items
- receiptLines(list) returns one line per item
- sellItem(list, name) lowers the named item
- saveStock(list) saves the list
- loadStock() loads the list
PLAN
START
set stock to loadstock
set total to totalvalue of stock
report total
for each line in receiptLines of stock
    put that line on screen
sellItem of stock and "Popcorn"
report totalvalue of stock
saveStock of stock
END`;
const c3 = checkPlan(ofForm);
check(c3.criteria.every((c) => c.verdict === 'met'), '"name of list" calls and a FOR EACH are all recognised');
check(c3.passed, 'the no-parentheses plan passes');

// --- numbered plan with "go back to #5" -----------------------------------
const goBack = `
Problem: Snack Shack
CONTRACTS
- makeItem(name, price, qty) gives back one item
- totalValue(list) returns the total
- lowStock(list, level) returns the low items
- receiptLines(list) returns one line per item
- sellItem(list, name) lowers the named item
- saveStock(list) saves the list
- loadStock() loads the list
PLAN
START
1. set stock to loadstock
2. set total to totalvalue of stock
3. report total
4. set lines to receiptLines of stock
5. is there another line in lines?
6. if yes, put that line on screen
7. go back to #5
8. sellItem of stock and "Popcorn"
9. report the new total and quantity
10. saveStock of stock
END`;
const c4 = checkPlan(goBack);
check(verdict(c4, 'loop-over-the-list') === 'met', '"go back to #5" counts as the loop');
check(c4.passed, 'the numbered plan passes');

// --- prose that describes functions but never calls them ------------------
const prose = `
Problem: Snack Shack
CONTRACTS
- makeItem makes an item
- totalValue returns the total
PLAN
START
START BY MAKING OUR LISTS WITH MAKEITEM
TOTALVALUE TAKES IN AN ITEM AND RETURNS PRICE TIMES QUANTITY
LOWSTOCK TAKES IN AN ITEM AND CHECKS THE QUANTITY
END`;
const c5 = checkPlan(prose);
check(verdict(c5, 'functions-as-calls') === 'missing', 'prose descriptions are not calls');
check(verdict(c5, 'loop-over-the-list') === 'missing', 'no loop in prose');
check(!c5.passed, 'the prose plan does not pass');

// --- a JavaScript-shaped plan: bodies are not the plan ---------------------
// Real plan #11's shape. The student wrote the function bodies out inside
// START..END and then called them. The bodies must not become the plan's
// calls (`let(`, `push(`, `setItem(`), and the loop inside receiptLines is
// not the main plan's loop, but the calls in the main sequence are.
const jsShaped = `
Problem: Snack Shack
CONTRACTS
-
PLAN
START
let stock = [
{name: "berries", price: 14, qty: 10}
]
function [[makeItem]](name, price, qty) {
let item = makeItem(name, price, qty)
return item
}
function [[receiptLines]](list) {
let lines = []
for (let i = 0; i < list.length; i++) {
lines.push(list[i].name + " " + list[i].qty)
}
localStorage.setItem("lines", lines)
return lines
}
set stock to loadStock()
set total to totalValue of stock
report total
set lines to receiptLines of stock
put those lines on screen
sellItem of stock and "Popcorn"
log the new total and quantity
saveStock of stock
END`;
const j1 = checkPlan(jsShaped);
const fnFeedback = j1.criteria.find((c) => c.id === 'functions-as-calls').feedback;
check(verdict(j1, 'functions-as-calls') === 'met', 'the main-sequence calls are credited');
check(!/\blet\b|\bpush\b|\bsetItem\b|\breturn\b/i.test(fnFeedback), 'JS builtins and keywords are not counted as named functions');
check(/sellitem/i.test(fnFeedback) && /totalvalue/i.test(fnFeedback), 'the real calls are the ones named');
check(verdict(j1, 'loop-over-the-list') === 'missing', 'a loop inside a written-out function is not the plan loop');
check(/inside a function description/.test(j1.criteria.find((c) => c.id === 'loop-over-the-list').feedback), 'feedback says the loop is in a function');
check(verdict(j1, 'change-one-record') === 'met', '"log the new total" counts as reporting the change');
check(j1.passed, 'the JavaScript-shaped plan passes on its main sequence');

// A plan whose only parentheses are JS plumbing has no function calls at all.
const onlyBuiltins = `
START
let stock = []
stock.push("berries")
localStorage.setItem("list", stock)
console.log(stock)
END`;
const j2 = checkPlan(onlyBuiltins);
check(verdict(j2, 'functions-as-calls') === 'missing', 'push/setItem/console.log are not named functions');
check(!j2.passed, 'a plan of JS plumbing does not pass');

// --- the student's own spelling: the grader reads the job, not the name -----
// A correct plan is not wrong because a name is worded differently, abbreviated,
// shouting, or misspelt. These four cases are the ways a plan actually varies.
const synonyms = `
Problem: Snack Shack
CONTRACTS
- addUp(list) adds up price times quantity
- underLevel(list, level) returns a new array of items below the level
- linesFor(list) gives one line per item
- takeOne(list, name) lowers that item's qty by one
- storeStock(list) saves the list
- readStock(list) reads the list back
PLAN
START
set stock to readStock()
set total to addUp(stock)
report total
set lines to linesFor(stock)
for each line in lines
    put the line on screen
takeOne(stock, "Popcorn")
report the new total
storeStock(stock)
END`;
const s1 = checkPlan(synonyms);
check(s1.criteria.every((c) => c.verdict === 'met'), 'a plan renamed to synonyms is fully credited');
check(s1.passed, 'the synonym plan passes');

// Shouting, snake_case, abbreviations and a slipped key, all at once.
const misspelt = read(`${lesson}/solution/README.md`)
  .replace(/totalValue/g, 'TOTALVALU')
  .replace(/lowStock/g, 'LOWSTOK')
  .replace(/receiptLines/g, 'RECIEPTLINES')
  .replace(/sellItem/g, 'SELLITM')
  .replace(/saveStock/g, 'SAVESTOCK')
  .replace(/loadStock/g, 'LOADSTOCK')
  .replace(/report/g, 'REPROT');
const s2 = checkPlan(misspelt);
check(s2.criteria.every((c) => c.verdict === 'met'), 'misspelt, shouting names are still credited in full');
check(s2.passed, 'the misspelt plan passes');

// Four calls whose names say nothing: the rubric's own "partial".
const namelessPlan = `
START
set a to helperOne(stock)
set b to helperTwo(stock)
set c to helperThree(stock)
set d to helperFour(stock)
END`;
const s3 = checkPlan(namelessPlan);
check(verdict(s3, 'functions-as-calls') === 'partial', 'four calls with names that say nothing are partial');
check(/names do not say what they do/.test(s3.criteria.find((c) => c.id === 'functions-as-calls').feedback), 'feedback asks for a name that says what the function does');
check(!s3.passed, 'a plan of undecipherable names does not pass');

// A call the grader cannot place in an otherwise sound plan is a "look at this",
// not a failure: the name may be one it does not know.
const unplaceable = `
START
set stock to loadStock()
set total to totalValue(stock)
report total
for each line in receiptLines of stock
    put the line on screen
set x to wobble(stock, "Popcorn")
saveStock(stock)
END`;
const s4 = checkPlan(unplaceable);
check(verdict(s4, 'change-one-record') === 'partial', 'an unplaceable call is partial, not missing');
check(/needs a look/.test(s4.criteria.find((c) => c.id === 'change-one-record').feedback), 'feedback says the call needs a look');

// --- the same plan, structured differently --------------------------------
// Structure is what this grader reads, so these are the cases that matter most:
// each is the reference plan with one structural habit changed, and each is
// functionally the same plan.
const body = `set stock to loadStock()
set total to totalValue(stock)
report the total
set lines to receiptLines(stock)
LOOP
BODY
sellItem(stock, "Popcorn")
report the new total and quantity
saveStock(stock)
END`;
const structural = [
  ['the loop closed by END FOR', body.replace('LOOP', 'FOR EACH line IN lines\n    put the line on screen\nEND FOR').replace('\nBODY', '')],
  ['the body not indented, closed by NEXT', body.replace('LOOP', 'for each line in lines\nput the line on screen\nNEXT').replace('\nBODY', '')],
  ['the body on the loop line', body.replace('LOOP', 'for each line in lines, put the line on screen').replace('\nBODY', '')],
  ['numbered steps, loop by "repeat steps"', `1. set stock to loadStock()
2. set total to totalValue(stock)
3. report the total
4. set lines to receiptLines(stock)
5. for each line in lines, put the line on screen
6. repeat steps 5 for every line
7. sellItem(stock, "Popcorn")
8. report the new total and quantity
9. saveStock(stock)`],
  ['a two-column table', `| 1 | set stock to loadStock() |
| 2 | set total to totalValue(stock) |
| 3 | report the total |
| 4 | set lines to receiptLines(stock) |
| 5 | for each line in lines: put the line on screen |
| 6 | sellItem(stock, "Popcorn") |
| 7 | report the new total and quantity |
| 8 | saveStock(stock) |`],
  ['no START/END at all', body.replace('LOOP', 'for each line in lines\n    put the line on screen').replace('\nBODY', '')],
  ['the loop over the records', body.replace('LOOP', 'for each item in stock\n    put item.name and item.qty on screen').replace('\nBODY', '').replace('set lines to receiptLines(stock)\n', '')],
  ['the change before the loop', `START
set stock to loadStock()
sellItem(stock, "Popcorn")
report the new total and quantity
set lines to receiptLines(stock)
for each line in lines
    put the line on screen
saveStock(stock)
END`],
];
for (const [name, text] of structural) {
  const r = checkPlan(text);
  check(r.criteria.every((c) => c.verdict === 'met'), `structure: ${name} — every criterion met`);
  check(r.passed, `structure: ${name} — passes`);
}

// --- the formatter --------------------------------------------------------
const delimited = formatPlan(`START
set stock to loadStock()
FOR EACH line IN receiptLines(stock)
put the line on screen
END FOR
saveStock(stock)
END`);
check(/Line 3 starts a loop/.test(delimited.notes.join(' ')), 'the formatter says what it re-indented');
check(/\n {4}put the line on screen/.test(delimited.canonical), 'the loop body is indented in the read-back');
check(
  formatPlan(delimited.canonical).canonical === delimited.canonical,
  'formatting is idempotent: formatting the read-back changes nothing',
);
check(formatPlan(read(`${lesson}/solution/README.md`)).notes.length === 0, 'a tidy plan needs noting');
check(/^set stock to loadStock\(\)$/m.test(formatPlan('1. set stock to loadStock()').canonical), 'a step number is scaffold, not content');

console.log(`\n[test-plan-check] ${n - failures}/${n} checks held`);
if (failures) process.exit(1);
console.log('[test-plan-check] OK — deterministic, and right on the taught forms');
