// Per-criterion lesson pointers -- batch 5: modules 1.4, 3.9, 6.8, 7.1.
//
// Same rule as batches 1-4: point a criterion at an earlier lesson that teaches
// that specific construct; leave the foundational and the tool-surface ones
// alone; never point forward.
//
// 7.1 IS THE PRIZE: the Arcade Cabinet is the Q2 capstone and its eleven
// criteria are a checklist of the whole course, so each one has an honest
// earlier lesson to point at. A student who cannot get past "a class of your
// own" gets sent to the reading that teaches classes.

import { readFileSync, writeFileSync } from 'fs';

// Default per lesson. ONE value per folder -- a default that suits one criterion
// leaks onto its siblings (batch 4), so anything mixed gets no default.
const POINTERS = {
  // --- 1.4.3: which language for which job --------------------------------
  '1-4-3-match-the-language': { target: '1.4.2', note: 'Why There Are So Many Languages' },

  // --- 1.4.12: naming the three structures -------------------------------
  '1-4-12-name-the-structure': { target: '1.4.10', note: 'Sequence, Selection, Repetition' },

  // 3.9.2 has NO default. A lesson spanning functions, arrays, map and spread
  // cannot share one target, and a 1.2.2 variables default leaked onto "A
  // function returns a value" and "map() is called with an arrow function".
};

// Per-CRITERION overrides. Key is "<folder>\u0000<title substring>"; longest
// match wins.
const PER_CRITERION = {
  // --- 1.4.20 Sort the Snippet: four DIFFERENT paradigms, four readings ----
  '1-4-20-sort-the-snippet\u0000Snippet A is procedural':
    { target: '1.4.8', note: 'Procedural Programming' },
  '1-4-20-sort-the-snippet\u0000Snippet B is object-oriented':
    { target: '1.4.15', note: 'Object-Oriented Programming' },
  '1-4-20-sort-the-snippet\u0000Snippet C is functional':
    { target: '1.4.18', note: 'Functional Programming' },
  '1-4-20-sort-the-snippet\u0000JavaScript is multi-paradigm':
    { target: '1.4.19', note: 'JavaScript Is Multi-Paradigm' },

  // --- 3.9.2: the chart, and the array of records -------------------------
  '3-9-2-ch3-group-pa-build\u0000The problem is named in the header':
    { target: '3.9.1', note: 'Group PA Part 1: Design the Chart' },
  '3-9-2-ch3-group-pa-build\u0000The data is an array of record objects':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-9-2-ch3-group-pa-build\u0000A function returns a value':
    { target: '3.2.2', note: 'Parameters & Return Values' },
  '3-9-2-ch3-group-pa-build\u0000push builds a new list':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-9-2-ch3-group-pa-build\u0000map() is called with an arrow function':
    { target: '3.4.6', note: 'Arrow Functions' },
  // const IS taught at 1.2.2, so this one is a real pointer rather than a skip.
  '3-9-2-ch3-group-pa-build\u0000The level is a const':
    { target: '1.2.2', note: 'Declaring Variables with let and const' },

  // --- 6.8.13 Challenges --------------------------------------------------
  '6-7-28-challenges\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },

  // --- 6.8.14 Two-Player Pong-Sumo ---------------------------------------
  '6-7-27-a17-1-pong-sumo\u0000Two-player keyboard input':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '6-7-27-a17-1-pong-sumo\u0000Independent per-player score variables':
    { target: '1.2.2', note: 'Declaring Variables with let and const' },
  '6-7-27-a17-1-pong-sumo\u0000Push-collision physics tuned with bounciness':
    { target: '6.7.14', note: 'moSHion docs: sprite.bounciness' },
  '6-7-27-a17-1-pong-sumo\u0000Top-down arena: no gravity':
    { target: '5.2.2', note: 'Gravity' },
  '6-7-27-a17-1-pong-sumo\u0000Win condition fires on a threshold':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '6-7-27-a17-1-pong-sumo\u0000At least one joint is used':
    { target: '6.8.4', note: 'moSHion docs: HingeJoint' },

  // --- 7.1.1 Arcade Cabinet: the Q2 capstone checklist --------------------
  '7-1-1-arcade-cabinet\u0000A class of your own':
    { target: '5.3.3', note: 'Class and instance' },
  '7-1-1-arcade-cabinet\u0000A Group':
    { target: '6.1.3', note: 'moSHion docs: Groups' },
  '7-1-1-arcade-cabinet\u0000An overlap or collision':
    { target: '6.2.3', note: 'moSHion docs: Collisions + Overlaps' },
  '7-1-1-arcade-cabinet\u0000Player input':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '7-1-1-arcade-cabinet\u0000Motion tuned on purpose':
    { target: '5.2.8', note: 'Forces vs Velocity' },
  '7-1-1-arcade-cabinet\u0000Game states':
    { target: '2.3.3', note: 'switch Statements' },
  '7-1-1-arcade-cabinet\u0000Saves and loads':
    { target: '6.5.3', note: 'storeItem: Save Game Data' },
  '7-1-1-arcade-cabinet\u0000A function that takes a parameter and returns a value':
    { target: '3.2.2', note: 'Parameters & Return Values' },
  '7-1-1-arcade-cabinet\u0000An array of game data':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '7-1-1-arcade-cabinet\u0000A loop that reads it':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '7-1-1-arcade-cabinet\u0000Tests report PASS or FAIL':
    { target: '4.1.4', note: 'Manual Testing: PASS / FAIL Checks' },
};

// Criteria with no pointer, and why. Keyed on the criterion TITLE.
const SKIP_TITLE = {
  'Both partners named in the header': 'a header comment, not a concept',
  // 3.9.2: the level is a const, but the lesson's own pointer already covers
  // variable declaration on the sibling criteria.
  'Clear the background each frame': 'a draw-loop call taught by the tool surface',
  'Create at least one sprite': 'sprite creation is taught by the tool surface',
  'Live score rendered with text()': 'moSHion text() is taught by the tool surface',
  'Use at least one stretch joint feature': 'SliderJoint and the rope are named in content.md, not taught by a reading',
  'The level is a const': 'covered by the sibling variable criterion',
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

    // "Already points somewhere" is checked FIRST. With no default target for a
    // lesson, the target check used to report those criteria as unpointed --
    // which is false, they carry hand-authored pointers, and a misleading report
    // is how a real gap gets missed.
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 56)}" -- already points somewhere`);
      continue;
    }
    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 56)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
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
