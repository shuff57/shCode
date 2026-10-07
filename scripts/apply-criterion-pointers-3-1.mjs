// Per-criterion lesson pointers, module 3.1 (batch 2).
//
// Same rule as batch 1 (module 2.1), and the same reason for encoding it as a
// table: the judgement is the deliverable.
//
//   Point a criterion at an earlier lesson that teaches that specific
//   construct. In this module that sometimes means an EARLIER MODULE, not an
//   earlier lesson in 3.1 -- a 3.1 lab can absolutely require a conditional.
//   Cross-module is fine as long as the number is BACKWARD; the
//   check-prompt-pointers gate enforces direction on every one of these.
//
//   Do NOT point at foundational material or at anything taught later.
//
// Module 3.1's teaching lessons:
//   3.1.2  Reading: Defining & Calling a Function   -- declaring, naming, calling
//   3.1.7  Worked Example: Refactoring calcDistance -- the refactor move
//   3.1.11 Reading: The Function-Call Shape         -- call syntax
//
// Module 2.1 supplies the conditionals that two of these labs require:
//   2.1.3  If / Else if / Else
//   2.1.29 Logical Operators: && || !

import { readFileSync, writeFileSync } from 'fs';

// DEFAULT per lesson: the lesson that teaches the module's core skill here,
// which for all eight of these labs is "how do I declare a function".
// ONE value per folder -- an earlier draft listed a folder twice and the second
// silently won, which pointed "defined, camelCase" at the call-shape reading.
const POINTERS = {
  '3-1-13-lab-syntax-naming': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-16-lab-concessions-stand': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-17-lab-terms-loop': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-18-lab-refactor-receipt-header': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-19-lab-refactor-grade-advisor': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-8-lab-findmax-iseven': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-9-lab-sum-to-n': { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-10-functions': { target: '3.1.2', note: 'Defining & Calling a Function' },
};
// Per-CRITERION targets, where one lesson needs two different pointers and a
// single lesson-level value cannot express that. Key is
// "<folder>\u0000<criterion title>"; the title is matched as a substring.
const PER_CRITERION = {
  // --- CALLING a function is a different question from DECLARING one ------
  // ONLY for labs that come after 3.1.11. The first three labs (3.1.5, 3.1.8,
  // 3.1.10) sit BEFORE the call-shape reading, so 3.1.11 is a forward pointer
  // for them and they fall back to 3.1.2, which covers declaring AND calling.
  // The direction gate caught exactly this on the first apply.
  '3-1-13-lab-syntax-naming\u0000showTotal is called':
    { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-16-lab-concessions-stand\u0000concessions is called':
    { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-19-lab-refactor-grade-advisor\u0000decideGrade is called':
    { target: '3.1.11', note: 'The Function-Call Shape' },
  '3-1-19-lab-refactor-grade-advisor\u0000printAdvice is called':
    { target: '3.1.11', note: 'The Function-Call Shape' },
  '3-1-18-lab-refactor-receipt-header\u0000printHeader called three times':
    { target: '3.1.2', note: 'Defining & Calling a Function' },
  '3-1-10-functions\u0000Call greet':
    { target: '3.1.11', note: 'The Function-Call Shape' },

  // --- moving text INTO a function is the refactor lesson ----------------
  '3-1-18-lab-refactor-receipt-header\u0000header text lives inside':
    { target: '3.1.7', note: 'Refactoring calcDistance' },

  // --- a 3.1 lab that requires a conditional, taught back in module 2.1 --
  '3-1-17-lab-terms-loop\u0000if/else on the answer':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '3-1-19-lab-refactor-grade-advisor\u0000else if chain on score':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '3-1-19-lab-refactor-grade-advisor\u0000&& or || used to combine':
    { target: '2.1.29', note: 'Logical Operators' },
};
// Criteria that get NO pointer, and why -- each is a real finding, not an
// omission. Matched as a substring of the criterion title.
const SKIP_TITLE = {
  'prints the total': 'console.log itself -- chapter 1, already done',
  'prints the options line': 'console.log itself -- chapter 1, already done',
  'all three books still printed': 'console.log itself -- chapter 1, already done',
  'reads an answer with prompt': 'prompt() -- taught in the input material, not module 3.1',
  'for loop calls terms()': 'for loops -- module 1.3; the exact teaching lesson is not identifiable',
  'for loop present': 'for loops -- module 1.3; the exact teaching lesson is not identifiable',
  'return statement present': 'SEQUENCING: return is taught at 3.2.2, AFTER this lab',
  'Return value': 'SEQUENCING: return is taught at 3.2.2, AFTER this lab',
  'Arrow function': 'SEQUENCING: arrow syntax is taught in 3.2.x, AFTER this lab',
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
  const reqs = lesson.requirements ?? [];
  for (const req of reqs) {
    const title = String(req.title ?? '');

    const perCrit = Object.entries(PER_CRITERION).find(
      ([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]),
    );
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));

    // A criterion with a specific pointer beats the lesson default, which in
    // turn beats no pointer. The skip list is checked last so a criterion can
    // still be rescued by an explicit per-criterion decision.
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];

    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title}" -- already points somewhere`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title}"`);
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
