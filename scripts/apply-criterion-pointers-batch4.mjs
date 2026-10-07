// Per-criterion lesson pointers -- batch 4: modules 1.6, 2.6, 4.1, 5.3, 6.5.
//
// Same rule as batches 1-3: point a criterion at an earlier lesson that teaches
// that specific construct; leave the foundational ones alone; never point
// forward. check-prompt-pointers.mjs enforces resolution, uniqueness and
// direction on every pointer in the course.
//
// MODULE 8.1 IS DELIBERATELY ABSENT. Its nine criteria are single-tool
// reSHape targets -- "a 12 mm hole through the box", "one edge rounded to
// 3 mm". Each is taught by the Build toolbar on the page the student is
// already looking at, not by an earlier lesson; the module's only reading
// (8.1.1) explains what a "part" is, not how to drill a hole. A pointer from
// "drill a hole" to "a part is a list of steps" would look authoritative and
// answer nothing. Recorded here so the absence is a decision on the record
// rather than a gap somebody re-derives.

import { readFileSync, writeFileSync } from 'fs';

// Default per lesson. ONE value per folder -- listing a folder twice silently
// overwrites, which happened in batch 2.
const POINTERS = {
  // --- 1.6.2 Group PA: the variable-typing material is chapter 1 ----------
  '1-6-2-ch1-pa-build': { target: '1.2.2', note: 'Declaring Variables with let and const' },

  // --- 2.6.2 Group PA: same header criteria, chapter 1 --------------------
  '2-6-2-ch2-group-pa-build': { target: '1.2.2', note: 'Declaring Variables with let and const' },

  // 4.1.6 has NO default on purpose. Ten criteria spanning arrays, functions,
  // loops, conditionals, persistence and template literals cannot share one
  // target; a default leaked "3.3.2 Array Basics" onto "Uses a conditional".
  // Every criterion there is listed explicitly instead.

  // --- 5.3.8 / 5.3.9: property read/write on an instance ------------------
  '5-3-8-lab-read-property': { target: '5.3.3', note: 'Class and instance' },
  '5-3-9-lab-write-property': { target: '5.3.3', note: 'Class and instance' },

  // --- 5.3.10: two instances, one property changed ------------------------
  '5-3-10-lab-two-instances': { target: '5.3.3', note: 'Class and instance' },

  // --- 5.3.13: sprites are created, not declared -------------------------
  '5-3-13-lab-build-sprite': { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },

  // --- 6.5.26 / 6.5.27: the save system ----------------------------------
  '6-5-25-a16-1-save-system': { target: '6.5.3', note: 'storeItem: Save Game Data' },
  '6-5-26-challenges': { target: '6.5.3', note: 'storeItem: Save Game Data' },
};

// Per-CRITERION overrides. Key is "<folder>\u0000<title substring>"; longest
// match wins so a specific entry is never shadowed by a broader one.
const PER_CRITERION = {
  // --- 1.6.2 -------------------------------------------------------------
  '1-6-2-ch1-pa-build\u0000typeof is reported for one value':
    { target: '1.2.23', note: 'The typeof Operator' },
  '1-6-2-ch1-pa-build\u0000The diamond is stored as a boolean':
    { target: '1.2.2', note: 'Declaring Variables with let and const' },
  '1-6-2-ch1-pa-build\u0000Both branches written as pseudocode':
    { target: '1.6.1', note: 'Group PA Part 1: Design the Chart' },
  // 1-6-1 must come first in course order, so the chart lesson is the
  // backward reference for anything the chart itself defines.
  '1-6-2-ch1-pa-build\u0000The problem is named in the header':
    { target: '1.6.1', note: 'Group PA Part 1: Design the Chart' },
  '1-6-2-ch1-pa-build\u0000The value is computed from the inputs':
    { target: '1.2.2', note: 'Declaring Variables with let and const' },

  // --- 2.6.2 -------------------------------------------------------------
  '2-6-2-ch2-group-pa-build\u0000The problem is named in the header':
    { target: '2.6.1', note: 'Group PA Part 1: Design the Chart' },
  '2-6-2-ch2-group-pa-build\u0000The loop uses a for or while':
    { target: '2.2.13', note: 'The while Loop' },
  '2-6-2-ch2-group-pa-build\u0000The loop has a continue':
    { target: '2.4.13', note: 'Skipping a Round with continue' },
  '2-6-2-ch2-group-pa-build\u0000A break AND a continue':
    { target: '2.4.13', note: 'Skipping a Round with continue' },
  '2-6-2-ch2-group-pa-build\u0000A switch classifies the outcome':
    { target: '2.3.3', note: 'switch Statements' },
  '2-6-2-ch2-group-pa-build\u0000The bad input is guarded with throw':
    { target: '2.5.1', note: 'Handling Errors with try/catch' },

  // --- 4.1.6 Q1 Synthesis: a function of the student's own ----------------
  '4-1-4-print-shop\u0000A 3+ parameter function':
    { target: '3.2.2', note: 'Parameters & Return Values' },
  '4-1-4-print-shop\u0000A function that returns a value':
    { target: '3.2.2', note: 'Parameters & Return Values' },
  '4-1-4-print-shop\u0000Tests report PASS or FAIL':
    { target: '4.1.4', note: 'Manual Testing: PASS / FAIL Checks' },
  '4-1-4-print-shop\u0000An array of your own':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '4-1-4-print-shop\u0000A sort':
    { target: '3.7.21', note: 'Mutating vs. Non-Mutating Methods' },
  '4-1-4-print-shop\u0000Uses a loop':
    { target: '2.2.9', note: 'The for Loop' },
  '4-1-4-print-shop\u0000Uses a conditional':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '4-1-4-print-shop\u0000Saves and loads with localStorage + JSON':
    { target: '3.8.15', note: 'Saving by Key' },
  '4-1-4-print-shop\u0000Prints a formatted verdict':
    { target: '1.2.15', note: 'Greeting with Backticks' },

  // --- 5.3 ---------------------------------------------------------------
  '5-3-9-lab-write-property\u0000Detect a key press':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '5-3-10-lab-two-instances\u0000Only b1.color is reassigned':
    { target: '5.3.3', note: 'Class and instance' },
  '5-3-13-lab-build-sprite\u0000Rectangle sprite (4-arg form)':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-3-13-lab-build-sprite\u0000Circle sprite (3-arg form)':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-3-13-lab-build-sprite\u0000Property set on an instance':
    { target: '5.3.3', note: 'Class and instance' },

  // --- 6.5 save system: JSON is a module 3.8 topic -----------------------
  '6-5-25-a16-1-save-system\u0000getItem used':
    { target: '6.5.3', note: 'storeItem: Save Game Data' },
  '6-5-25-a16-1-save-system\u0000JSON.stringify used':
    { target: '3.8.4', note: 'JSON.stringify' },
  '6-5-25-a16-1-save-system\u0000JSON.parse used':
    { target: '3.8.8', note: 'JSON.parse' },
  '6-5-26-challenges\u0000getItem used':
    { target: '6.5.3', note: 'storeItem: Save Game Data' },
  '6-5-26-challenges\u0000JSON.stringify used':
    { target: '3.8.4', note: 'JSON.stringify' },
  '6-5-26-challenges\u0000JSON.parse used':
    { target: '3.8.8', note: 'JSON.parse' },
};

// Criteria with no pointer, and why. Keyed on the criterion TITLE, which is
// what the matcher tests against.
const SKIP_TITLE = {
  'Both partners named in the header': 'a header comment, not a concept',
  'The limit is a const': 'const is covered by the sibling variable criterion',
  'A string variable is declared': 'covered by the sibling variable criterion',
  'A number variable is declared': 'covered by the sibling variable criterion',
  'Five objects stored': 'a data-shape requirement; no single earlier lesson',
  'Canvas exists': 'covered by the sibling storeItem criterion on the same reading',
  'Canvas created with a size': 'Canvas is taught on the tool surface, not by a reading',
  'Stroke used': 'a drawing property taught by the tool surface',
  'Two distinct new Box(...) calls': 'instance construction; sibling criterion carries it',
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

    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];

    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 56)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 56)}" -- already points somewhere`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 56)}"`);
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
