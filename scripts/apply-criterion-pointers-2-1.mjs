// Per-criterion lesson pointers, module 2.1 (batch 1).
//
// WHY A SCRIPT: 62 judgements, and the judgement IS the deliverable. Encoding them
// as a table makes the decisions reviewable in one place instead of buried in 19
// lesson.json files, and re-runnable if a number is renumbered.
//
// THE RULE APPLIED, and it is deliberately narrow:
//
//   Point a criterion at an earlier lesson in the SAME module that teaches that
//   specific construct -- normally the Reading, or the Worked Example for the
//   exact form. That is the pointer a student can actually act on: "I don't
//   remember what else-if does" has an answer one click away.
//
//   Do NOT point at earlier CHAPTERS. Roughly a third of these criteria are
//   foundational -- "console.log runs inside the if block", "two variables are
//   declared", "checks divisibility by 4". A student reaching module 2.1 has
//   already done those, and the specific lesson that taught them cannot be
//   identified from the data without guessing. A guessed pointer is worse than
//   none, so those are recorded below as NO POINTER and left alone.
//
//   Every number here must be BACKWARD. scripts/check-prompt-pointers.mjs
//   enforces that, plus resolution and self-reference, on every pointer in the
//   course -- so this batch cannot ship a link to an unreached lesson.
//
// Value is a phrase appended to `description`. Only `description` is touched:
// lib/grader.ts checks `pattern`/`flags` and nothing else, so a criterion still
// grades identically.

import { readFileSync, writeFileSync } from 'fs';

// lesson folder -> the lesson that teaches the construct its criteria use.
const POINTERS = {
  // --- if / else / else-if: the module's core reading -------------------
  '2-1-5-lab-first-if': { target: '2.1.3', note: 'If / Else if / Else' },
  '2-1-6-lab-add-else': { target: '2.1.3', note: 'If / Else if / Else' },
  '2-1-14-lab-chain-else-if': { target: '2.1.3', note: 'If / Else if / Else' },

  // --- nesting: its own reading ----------------------------------------
  '2-1-17-lab-nested-conditionals': { target: '2.1.9', note: 'Nested Conditionals' },

  // --- truthy/falsy: a bare variable in a condition ---------------------
  '2-1-20-lab-truthy-guard': { target: '2.1.12', note: 'Truthy and Falsy Values' },

  // --- comparison operators, === vs == ---------------------------------
  '2-1-9-lab-predict-comparisons': { target: '2.1.15', note: 'Comparison Operators' },
  '2-1-9b-lab-count-the-equals': { target: '2.1.18', note: 'One Equals Sign, or Three?' },

  // --- ternary, and chained ternary ------------------------------------
  '2-1-24-lab-ternary': { target: '2.1.20', note: 'The Conditional Operator ?' },
  '2-1-27-lab-ternary-chain': { target: '2.1.23', note: 'Chaining Multiple ? Operators' },

  // --- if/else again: rewriting a ternary back into if/else ------------
  '2-1-30-lab-ternary-vs-if': { target: '2.1.3', note: 'If / Else if / Else' },

  // --- logical operators && || ! ---------------------------------------
  '2-1-12-lab-guard-and': { target: '2.1.29', note: 'Logical Operators' },
  '2-1-13-lab-branch-or': { target: '2.1.29', note: 'Logical Operators' },
  '2-1-31-lab-flip-not': { target: '2.1.29', note: 'Logical Operators' },
  '2-1-33-lab-debug-door': { target: '2.1.29', note: 'Logical Operators' },
  '2-1-34-lab-combine-logical': { target: '2.1.30', note: 'Combining conditions' },
};

// Criteria inside a pointed lesson that must NOT get the lesson's pointer.
//
// This is the correction that matters. A lesson-level mapping applied to every
// criterion sends "two variables declared" to the Logical Operators reading,
// which is not where variables are taught. These are foundational -- chapter 1
// material a student has already done by module 2.1 -- and the specific lesson
// that taught them cannot be identified from the data without guessing. A
// pointer to the wrong reading is worse than no pointer: it looks authoritative
// and sends the student somewhere irrelevant.
//
// Matched as a substring of the criterion title, because the titles are the
// authored wording and are what the student reads.
const SKIP_TITLE = [
  'two variables declared',
  'a message is printed inside the if block',
  'console.log present',
  'discount is logged',
  'rating is logged',
  'playerOne and playerTwo declared',
  'isMember and orderTotal declared',
  'checks divisibility by 4',
  'logs a comparison expression',
  'logs both leap year messages',
  'logs a Tie result',
  'both shipping thresholds used',
];

// Why each was left alone. Listed rather than silently skipped: the absence is
// a decision, and the next batch's author needs to see it.
const NO_POINTER = Object.fromEntries(
  SKIP_TITLE.map((t) => [t, 'foundational (chapter 1) or already covered by a sibling criterion']),
);
const DRY = process.argv.includes('--dry-run');
let touched = 0;
let added = 0;
let skipped = 0;

for (const [folder, { target, note }] of Object.entries(POINTERS)) {
  const file = `lessons/${folder}/lesson.json`;
  let lesson;
  try {
    lesson = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.log(`  SKIP  ${folder} -- no readable lesson.json`);
    continue;
  }
  const reqs = lesson.requirements ?? [];
  if (!reqs.length) {
    console.log(`  SKIP  ${folder} -- no requirements`);
    continue;
  }
  for (const req of reqs) {
    const title = String(req.title ?? '');
    if (SKIP_TITLE.some((s) => title.includes(s))) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title}" -- foundational, left alone`);
      continue;
    }
    const desc = String(req.description ?? '');
    if (/\d+\.\d+\.\d+/.test(desc)) {
      console.log(`  KEEP  ${folder} ${req.title} -- already points somewhere`);
      continue;
    }
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target} (${note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target}  "${req.title}"`);
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
