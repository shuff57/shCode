// Per-criterion lesson pointers -- batch 7: modules 1.5, 3.2, 3.3, 3.4.
//
// Same rule as batches 1-6: point at an earlier lesson that teaches that specific
// construct; leave foundational and tool-surface criteria alone; never forward.

import { readFileSync, writeFileSync } from 'fs';

const POINTERS = {
  // --- 1.5.31 implement your plan: variables + a comparison + branches ----
  '1-5-31-a1-5-1-implement-your-plan': { target: '1.2.2', note: 'Declaring Variables with let and const' },
  // --- 1.5.37 operator precedence in the console --------------------------
  '1-5-37-lab-settle-it-in-the-console': { target: '1.2.7', note: 'Arithmetic Operators and Type Coercion' },
  // --- 1.5.39 cause a ReferenceError on purpose --------------------------
  '1-5-39-lab-cause-a-reference-error': { target: '1.5.38', note: 'Reading an Error Message' },
  // --- 1.5.43 debug the order total -------------------------------------
  '1-5-43-lab-debug-the-order-total': { target: '1.5.41', note: 'Debugging with console.log' },
  // --- 3.2.9 findRectangleArea ------------------------------------------
  '3-2-7-lab-rectangle-area': { target: '3.2.2', note: 'Parameters & Return Values' },
  // --- 3.2.15 guard clause ----------------------------------------------
  '3-2-12-lab-guard-clause': { target: '3.2.11', note: 'Getting a Value Back with return' },
  // --- 3.2.18 fix print-not-return --------------------------------------
  '3-2-15-lab-fix-print-not-return': { target: '3.2.16', note: 'Printing Is Not Returning' },
  // --- 3.2.23 compose functions -----------------------------------------
  '3-2-19-lab-compose-functions': { target: '3.2.20', note: 'Building With Returned Values' },
  // --- 3.2.25 scope prediction ------------------------------------------
  '3-2-21-lab-scope-prediction': { target: '3.2.24', note: 'Scope: Local vs Global' },
  // --- 3.3.4 update by index --------------------------------------------
  '3-3-4-lab-update-by-index': { target: '3.3.3', note: 'Changing an Item by Index' },
  // --- 3.3.8 shift/unshift queue ----------------------------------------
  '3-3-7-lab-shift-unshift-queue': { target: '3.3.7', note: 'Adding and Removing from the Front' },
  // --- 3.3.12 sum an array ----------------------------------------------
  '3-2-5-lab-sum-array': { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  // --- 3.3.19 filter function -------------------------------------------
  '3-3-14-lab-filter-function': { target: '3.3.15', note: 'Arrays and Functions' },
  // --- 3.3.22 nested array update ---------------------------------------
  '3-3-17-lab-nested-array-update': { target: '3.3.20', note: 'Lists Inside Lists' },
  // --- 3.3.24 arrays reference lab --------------------------------------
  '3-2-7-arrays': { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  // --- 3.4.5 declaration to expression ----------------------------------
  '3-4-5-lab-declaration-to-expression': { target: '3.4.4', note: 'Function Expressions' },
  // --- 3.4.10 implicit return drill --------------------------------------
  '3-4-10-lab-implicit-return-drill': { target: '3.4.8', note: 'The Shorthand Rules' },
  // --- 3.4.13 one-line callback -----------------------------------------
  '3-4-13-lab-one-line-callback': { target: '3.4.11', note: 'Passing a Function to a Function' },
  // --- 3.4.16 rewrite three arrows --------------------------------------
  '3-4-16-lab-rewrite-three-arrows': { target: '3.4.8', note: 'The Shorthand Rules' },
  // --- 3.4.17 fix broken arrow ------------------------------------------
  '3-4-17-lab-fix-broken-arrow': { target: '3.4.6', note: 'Arrow Functions' },
  // --- 3.4.19 callback capstone -----------------------------------------
  '3-4-19-lab-callback-capstone': { target: '3.4.11', note: 'Passing a Function to a Function' },
};

const PER_CRITERION = {
  '1-5-37-lab-settle-it-in-the-console\u0000The rule is stated in a comment':
    { target: '1.5.19', note: 'Pseudocode and Flowcharts' },
  '1-5-43-lab-debug-the-order-total\u0000A PASS/FAIL check is present':
    { target: '1.5.40', note: 'Testing and Test Cases' },
  '3-2-12-lab-guard-clause\u0000if statement present':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '3-3-18-arrays\u0000Use find or includes':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-3-14-lab-filter-function\u0000for loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-3-17-lab-nested-array-update\u0000nested for loops present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-4-19-lab-callback-capstone\u0000for loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-4-5-lab-declaration-to-expression\u0000Function called through the variable':
    { target: '3.4.2', note: 'A Function Is a Value' },
  '3-4-17-lab-fix-broken-arrow\u0000Two parameters inside the parentheses':
    { target: '3.4.6', note: 'Arrow Functions' },
  '3-4-19-lab-callback-capstone\u0000At least two inline arrows passed':
    { target: '3.4.6', note: 'Arrow Functions' },
};

const SKIP_TITLE = {
  // Module 1.5 is still chapter 1: conditionals are not taught until 2.1, so
  // there is no earlier lesson to point at. A sequencing finding, not a gap.
  'The decision compares the two': 'SEQUENCING: conditionals are taught at 2.1.3, AFTER this lab',
  'Both branches exist': 'SEQUENCING: conditionals are taught at 2.1.3, AFTER this lab',
  'Both branches print': 'console.log -- foundational',
  'results are logged': 'console.log -- foundational',
  'result is logged': 'console.log -- foundational',
  'console.log present': 'console.log -- foundational',
  'The corrected name is printed': 'console.log -- foundational',
  'At least three labelled prints': 'console.log -- foundational',
  'The error message is recorded': 'the message is read on 1.5.38, the sibling criterion carries it',
  'The useful part is identified': 'reading the message is 1.5.38, on the sibling criterion',
  'A third expression of your own': 'the operator rule is on the sibling criterion',
  'result used in an expression': 'using a returned value is 3.2.20, on the sibling criterion',
  'Helper defined': 'declaring a function is 3.1.2, earlier than this module',
  'global variable declared': 'covered by the sibling scope criteria',
  'two functions defined': 'declaring functions is 3.1.2, earlier than this module',
  'calls are made': 'covered by the sibling scope criteria',
  'pagesRequested is declared': 'covered by the sibling variable criteria',
  'creditRemaining is declared': 'covered by the sibling variable criteria',
  'a local variable declared inside a function': 'covered by the default pointer on 3.2.24',
  '.length used': 'array length is on 3.3.5, the default pointer here',
  'function declaration present': 'declaring a function is 3.1.2, earlier than this module',
  'The misspelling is gone': 'the sibling criterion carries the 1.5.38 pointer',
};

const DRY = process.argv.includes('--dry-run');
let added = 0;
let skipped = 0;
let touched = 0;

for (const [folder, def] of Object.entries(POINTERS)) {
  const file = `lessons/${folder}/lesson.json`;
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.log(`  SKIP  ${folder} -- no readable lesson.json`);
    continue;
  }
  for (const req of lesson.requirements ?? []) {
    const title = String(req.title ?? '');
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 54)}"`);
      continue;
    }
    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : def;
    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 54)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 54)}"`);
  }
  if (!DRY) {
    writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
    touched++;
  }
}

console.log(
  `\n${DRY ? 'DRY RUN: ' : ''}${added} pointer(s) across ${touched} lesson(s). ` +
  `${skipped} criterion/criteria deliberately left without one.`,
);
