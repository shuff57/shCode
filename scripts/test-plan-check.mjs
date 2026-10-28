// Guards lib/plan-check.ts, the deterministic grader for the Chapter 3 plan.
//
// Why it exists: the AI grader marking these four criteria changed its verdict
// on the same plan between runs (measured: six of sixteen identical plans).
// This grader must be boringly repeatable, and it must be right on the forms
// the course actually teaches:
//   - reference answers and every variant score full;
//   - the untouched starter scores nothing;
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
import { checkPlan } from '../lib/plan-check.ts';

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
const starter = checkPlan(read(`${lesson}/README.md`));
check(!starter.passed, 'starter: does not pass');
check(starter.criteria.every((c) => c.verdict === 'missing'), 'starter: nothing credited');

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
check(verdict(c1, 'functions-as-calls') === 'partial', 'four calls with the contract names count');
check(verdict(c1, 'change-one-record') === 'met', 'change call with two arguments and a later report');
check(/inside a function description/.test(c1.criteria.find((c) => c.id === 'loop-over-the-list').feedback), 'feedback says where the loop is');

// --- the change call present but nothing reports the effect ---------------
const noReport = contractOnly.replace('report totalValue(stock)\n', '').replace('saveStock(stock)', 'saveStock(stock)');
const c2 = checkPlan(noReport);
check(verdict(c2, 'change-one-record') === 'partial', 'change call without a later report is partial');
check(/no later line reports/i.test(c2.criteria.find((c) => c.id === 'change-one-record').feedback), 'feedback asks for the report');
// The pass rule is "at least half FULLY met"; c2 has one fully-met criterion
// (save/load) and must not pass on the strength of its partials.
check(c2.criteria.filter((c) => c.verdict === 'met').length === 1, 'this plan has exactly one fully-met criterion');
check(!c2.passed, 'one fully-met criterion is not enough to pass');

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

console.log(`\n[test-plan-check] ${n - failures}/${n} checks held`);
if (failures) process.exit(1);
console.log('[test-plan-check] OK — deterministic, and right on the taught forms');
