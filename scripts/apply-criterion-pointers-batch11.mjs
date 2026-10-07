// Per-criterion lesson pointers -- batch 11: modules 1.2, 2.3 (final batch).
//
// Both modules are almost entirely single-concept, so a lesson default fits
// almost every criterion. Module 2.3 is the switch module, and it is the one
// place where "which reading" is a real question: grouped cases, fall-through
// and strict comparison are three DIFFERENT mistakes with three different
// readings.

import { readFileSync, writeFileSync } from 'fs';

const POINTERS = {
  // --- 1.2 types and values ----------------------------------------------
  '1-2-5-lab-change-the-type': { target: '1.2.4', note: 'Dynamically Typed' },
  '1-2-10-lab-predict-the-number': { target: '1.2.7', note: 'Arithmetic Operators and Type Coercion' },
  '1-2-15-lab-greeting-with-backticks': { target: '1.2.13', note: 'Embedding Values with ${...}' },
  '1-2-16-lab-operators-check': { target: '1.2.7', note: 'Arithmetic Operators and Type Coercion' },
  '1-2-25-lab-typeof-round-up': { target: '1.2.23', note: 'The typeof Operator' },
  '1-2-26-lab-variables-types-check': { target: '1.2.3', note: 'Every Value Has a Type' },
  '1-2-28-a1-2-1-fix-ten-declarations': { target: '1.2.2', note: 'Declaring Variables with let and const' },
  '1-2-29-a1-2-2-describe-an-object': { target: '1.2.3', note: 'Every Value Has a Type' },

  // --- 2.3 switch ---------------------------------------------------------
  '2-3-12-lab-predict-fall-through': { target: '2.3.3', note: 'switch Statements' },
  '2-3-13-lab-fix-fall-through': { target: '2.3.9', note: 'break and Fall-Through' },
  '2-3-17-lab-vowel-consonant': { target: '2.3.14', note: 'Grouping Cases' },
  '2-3-19-lab-false-vs-zero': { target: '2.3.18', note: 'switch Compares Strictly' },
  '2-3-22-lab-fix-type-mismatch': { target: '2.3.18', note: 'switch Compares Strictly' },
  '2-3-26-lab-traffic-light': { target: '2.3.3', note: 'switch Statements' },
  '2-3-28-lab-drink-size-switch': { target: '2.3.3', note: 'switch Statements' },
  '2-3-29-a2-3-1-print-settings-advisor': { target: '2.3.3', note: 'switch Statements' },
};

const PER_CRITERION = {
  '1-2-10-lab-predict-the-number\u0000Logs Infinity + 1':
    { target: '1.2.8', note: 'Infinity, -Infinity and NaN' },
  '1-2-16-lab-operators-check\u0000String concatenation':
    { target: '1.2.12', note: 'Strings and the Three Quotes' },
  '1-2-16-lab-operators-check\u0000Comparison operator':
    // 1.2.17 "The boolean Type" comes AFTER this lab; 1.2.3 introduces the
    // types, which is the earliest honest backward reference for a comparison.
    { target: '1.2.3', note: 'Every Value Has a Type' },
  '1-2-25-lab-typeof-round-up\u0000typeof null':
    { target: '1.2.19', note: 'The null Value' },
  '1-2-25-lab-typeof-round-up\u0000typeof undefined':
    { target: '1.2.20', note: 'The undefined Value' },
  '1-2-28-a1-2-1-fix-ten-declarations\u0000middleName is null, not the string "null"':
    { target: '1.2.19', note: 'The null Value' },
  '1-2-28-a1-2-1-fix-ten-declarations\u0000isEnrolled is a real boolean':
    { target: '1.2.17', note: 'The boolean Type' },
  '1-2-29-a1-2-2-describe-an-object\u0000Two different string methods used':
    { target: '1.2.14', note: 'String Methods in Practice' },
  '1-2-29-a1-2-2-describe-an-object\u0000A template literal embeds a variable':
    { target: '1.2.13', note: 'Embedding Values with ${...}' },
  '1-2-29-a1-2-2-describe-an-object\u0000typeof is used to check a type':
    { target: '1.2.23', note: 'The typeof Operator' },

  '2-3-17-lab-vowel-consonant\u0000break present':
    { target: '2.3.9', note: 'break and Fall-Through' },
  '2-3-19-lab-false-vs-zero\u0000break present':
    { target: '2.3.9', note: 'break and Fall-Through' },
};

const SKIP_TITLE = {
  // console.log is taught at 1.1.2, long before every one of these.
  'Log results': 'console.log -- foundational',
  'Logs 10 / 3': 'console.log -- foundational; the operator rule is on the default',
  'Logs 100 / 0': 'console.log -- foundational; the operator rule is on the default',
  'Logs "hello" * 5': 'console.log -- foundational; the operator rule is on the default',
  'Logs Infinity + 1': 'console.log -- foundational; NaN/Infinity is on the sibling criterion',
  'The single-quote version is logged too': 'console.log -- foundational',
  'typeof is printed': 'covered by the sibling criterion carrying the typeof reading',
  'Use console.log': 'console.log -- foundational',
  'console.log present': 'console.log -- foundational',
  // covered by the lesson default
  'myName is declared': 'covered by the default pointer on this lesson',
  'A backtick string embeds myName': 'covered by the default pointer on this lesson',
  'A calculation is embedded': 'covered by the default pointer on this lesson',
  'Use addition': 'covered by the default pointer on this lesson',
  'Use multiplication': 'covered by the default pointer on this lesson',
  'typeof a string': 'covered by the default pointer on this lesson',
  'typeof a number': 'covered by the default pointer on this lesson',
  'typeof true': 'covered by the default pointer on this lesson',
  'typeof an object': 'covered by the default pointer on this lesson',
  'Declare age variable': 'covered by the default pointer on this lesson',
  'Declare name variable': 'covered by the default pointer on this lesson',
  'Use typeof': 'covered by the default pointer on this lesson',
  'thing is declared with let': 'covered by the default pointer on this lesson',
  'thing starts as a string': 'covered by the default pointer on this lesson',
  'thing is reassigned without let': 'covered by the default pointer on this lesson',
  'thing is given a boolean': 'covered by the default pointer on this lesson',
  'studentAge is a number': 'covered by the default pointer on this lesson',
  'firstName is a string': 'covered by the default pointer on this lesson',
  'gradeLevel is declared with a keyword': 'covered by the default pointer on this lesson',
  'maxStudents is a const': 'covered by the default pointer on this lesson',
  'unitPrice replaces the single-letter name': 'covered by the default pointer on this lesson',
  'itemCount replaces the second mystery name': 'covered by the default pointer on this lesson',
  'favouriteColour is camelCase': 'covered by the default pointer on this lesson',
  'finalScore is declared but left unassigned': 'covered by the default pointer on this lesson',
  'At least six variables declared': 'covered by the default pointer on this lesson',
  'At least two numbers': 'covered by the default pointer on this lesson',
  'At least two strings': 'covered by the default pointer on this lesson',
  'At least one boolean': 'covered by the default pointer on this lesson',
  'switch statement present': 'covered by the default pointer on this lesson',
  'three case labels present': 'covered by the default pointer on this lesson',
  'break present': 'covered by the default pointer on this lesson',
  'break added after the apple case': 'covered by the default pointer on this lesson',
  'default label still present': 'covered by the default pointer on this lesson',
  'default label present': 'covered by the default pointer on this lesson',
  "'a' and 'e' cases grouped": 'covered by the default pointer on this lesson',
  "'u' case reaches the shared block": 'covered by the default pointer on this lesson',
  'case false present': 'covered by the default pointer on this lesson',
  'case 0 present': 'covered by the default pointer on this lesson',
  "case '0' present": 'covered by the default pointer on this lesson',
  'switched value converted to a number': 'covered by the default pointer on this lesson',
  'case 1 unchanged': 'covered by the default pointer on this lesson',
  'case 2 unchanged': 'covered by the default pointer on this lesson',
  'case 2 actually prints output': 'the fall-through reading is 2.3.9, the default here is 2.3.18',
  "case 'green' present": 'covered by the default pointer on this lesson',
  "case 'yellow' present": 'covered by the default pointer on this lesson',
  "case 'red' present": 'covered by the default pointer on this lesson',
  "case 'S' present": 'covered by the default pointer on this lesson',
  "case 'M' present": 'covered by the default pointer on this lesson',
  "case 'L' present": 'covered by the default pointer on this lesson',
  "case 'XL' present": 'covered by the default pointer on this lesson',
  "case 'PLA' present": 'covered by the default pointer on this lesson',
  "case 'ABS' present": 'covered by the default pointer on this lesson',
  "case 'PETG' present": 'covered by the default pointer on this lesson',
  "case 'TPU' present": 'covered by the default pointer on this lesson',
};

const DRY = process.argv.includes('--dry-run');
let added = 0;
let skipped = 0;
let touched = 0;

const folders = [...new Set([
  ...Object.keys(POINTERS),
  ...Object.keys(PER_CRITERION).map((k) => k.split('\u0000')[0]),
])];

for (const folder of folders) {
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
      console.log(`  KEEP     ${folder}  "${title.slice(0, 50)}"`);
      continue;
    }
    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];
    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 50)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 50)}"`);
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
