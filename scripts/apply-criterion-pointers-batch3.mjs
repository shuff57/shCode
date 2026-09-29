// Per-criterion lesson pointers -- batch 3: modules 1.7, 2.7, 3.10, 6.1, 6.2, 6.6.
//
// Same rule as batches 1 and 2: point a criterion at an earlier lesson that
// teaches that specific construct; leave the foundational ones alone; and never
// point forward. check-prompt-pointers.mjs enforces resolution, uniqueness and
// direction on every pointer in the course, so a mistake here fails the build
// rather than reaching a student.
//
// Batched six modules together because the dev server caches lesson data at
// startup (lib/lessons.ts has a module-level cache), so every batch costs a
// restart.
//
// WHAT THESE SIX MODULES HAVE IN COMMON: the "Individual PA Part 3: Find and
// Fix" lessons (1.7, 2.7, 3.10) share a shape -- a syntax bug, a runtime bug,
// two logic bugs, and naming the kind of each. The three bug-kind criteria map
// onto chapter 1's error-reading material, which is genuinely where a student
// would look. The logic bugs map to whichever module taught the construct that
// is broken.

import { readFileSync, writeFileSync } from 'fs';

// Default per lesson. ONE value per folder -- an earlier batch listed folders
// twice and the second entry silently overwrote the first.
const POINTERS = {
  // --- 1.7.3 Find and Fix: errors are chapter 1 material -------------------
  '1-7-3-ch1-individual-pa-find-and-fix': { target: '1.5.38', note: 'Reading an Error Message' },

  // --- 2.7.3 Find and Fix -------------------------------------------------
  '2-7-3-ch2-individual-pa-find-and-fix': { target: '1.5.38', note: 'Reading an Error Message' },

  // --- 3.10.3 Find and Fix ------------------------------------------------
  '3-10-3-ch3-individual-pa-find-and-fix': { target: '1.5.38', note: 'Reading an Error Message' },

  // --- 6.1.5 Groups Sandbox: the Groups reading is right there -------------
  '6-1-5-groups-sandbox': { target: '6.1.3', note: 'moSHion docs: Groups' },

  // --- 6.2.6 Asteroid Field -----------------------------------------------
  '6-1-11-a13-1-asteroid-field': { target: '6.1.3', note: 'moSHion docs: Groups' },

  // --- 6.2.7 Challenges ---------------------------------------------------
  '6-1-12-challenges': { target: '6.1.3', note: 'moSHion docs: Groups' },

  // --- 6.6.26 Game States: switch + persistence ---------------------------
  '6-6-24-a16-2-game-states': { target: '2.3.3', note: 'switch Statements' },

  // --- 6.6.27 Challenges: Extended State Features -------------------------
  '6-6-25-challenges': { target: '2.3.3', note: 'switch Statements' },
};

// Per-CRITERION overrides, where one lesson needs different pointers and a
// single default cannot express that. Key is "<folder>\u0000<title substring>".
const PER_CRITERION = {
  // --- the runtime bug is an undeclared name, which is its own lesson ------
  '1-7-3-ch1-individual-pa-find-and-fix\u0000Bug 2 — the program stops part way through':
    { target: '1.5.39', note: 'Cause a ReferenceError on Purpose' },
  '2-7-3-ch2-individual-pa-find-and-fix\u0000Bug 2 — the program stops part way through':
    { target: '1.5.39', note: 'Cause a ReferenceError on Purpose' },
  '3-10-3-ch3-individual-pa-find-and-fix\u0000Bug 2 — the program stops part way through':
    { target: '1.5.39', note: 'Cause a ReferenceError on Purpose' },

  // --- the two LOGIC bugs are about the construct the module taught -------
  // 1.7: a total that is not the sum of its parts, and a count that is wrong.
  '1-7-3-ch1-individual-pa-find-and-fix\u0000Bug 3 — the Before tax line':
    { target: '1.5.41', note: 'Debugging with console.log' },
  '1-7-3-ch1-individual-pa-find-and-fix\u0000Bug 4 — the Ordered line':
    { target: '1.5.41', note: 'Debugging with console.log' },
  // 2.7: a deposit line in the wrong place relative to a `continue`, and a
  // counter that never advances -- both are the continue/loop-pair material.
  '2-7-3-ch2-individual-pa-find-and-fix\u0000Bug 3 — the savings total is wrong':
    { target: '2.4.13', note: 'Skipping a Round with continue' },
  '2-7-3-ch2-individual-pa-find-and-fix\u0000Bug 4 — the loop counter never advances':
    { target: '2.4.16', note: 'The continue Trap in a while Loop' },
  // 3.10: indexing an array with its own length, an arrow's block body, and a
  // copy made in the wrong order.
  '3-10-3-ch3-individual-pa-find-and-fix\u0000Bug 2 — the program stops part way through\u0000':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-10-3-ch3-individual-pa-find-and-fix\u0000Bug 3 — the price list is wrong':
    { target: '3.4.6', note: 'Arrow Functions' },
  '3-10-3-ch3-individual-pa-find-and-fix\u0000Bug 4 — the backup changes the original':
    { target: '3.7.14', note: 'Spreading into a New Array or Object' },

  // --- moSHion: despawning means iterating a group -----------------------
  '6-1-5-groups-sandbox\u0000Despawn offscreen sprites':
    { target: '6.1.4', note: 'Iterating a Group' },
  '6-1-11-a13-1-asteroid-field\u0000Safe despawn loop':
    { target: '6.1.4', note: 'Iterating a Group' },
  '6-1-11-a13-1-asteroid-field\u0000Asteroids have velocity':
    { target: '5.1.15', note: 'Velocity: vel.x and vel.y' },
  '6-1-11-a13-1-asteroid-field\u0000WASD ship input':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '6-1-11-a13-1-asteroid-field\u0000Overlap detection':
    { target: '6.2.1', note: 'overlaps() boolean vs callback' },
  '6-1-12-challenges\u0000Use overlaps()':
    { target: '6.2.1', note: 'overlaps() boolean vs callback' },

  // --- state machine: persistence is its own chapter, JSON its own module --
  '6-6-24-a16-2-game-states\u0000At least 3 case labels':
    { target: '2.3.3', note: 'switch Statements' },
  '6-6-24-a16-2-game-states\u0000Each case ends with break':
    { target: '2.3.9', note: 'break and Fall-Through' },
  '6-6-24-a16-2-game-states\u0000storeItem used':
    { target: '6.5.3', note: 'storeItem: Save Game Data' },
  '6-6-24-a16-2-game-states\u0000JSON.stringify used':
    { target: '3.8.4', note: 'JSON.stringify' },
  '6-6-24-a16-2-game-states\u0000JSON.parse used':
    { target: '3.8.8', note: 'JSON.parse' },
  '6-6-25-challenges\u0000Canvas created':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '6-6-25-challenges\u0000Multiple cases used':
    { target: '2.3.3', note: 'switch Statements' },
};

// Criteria that get NO pointer, and why. Keyed on the criterion TITLE, which is
// what the matcher tests against -- an earlier draft keyed these on the
// description text, so eleven of the twelve never matched anything.
//
// Note what is NOT here: the descriptions of the Find-and-Fix criteria mostly
// restate the fix ("The file is valid JavaScript and reaches the end"). Those
// are fine -- the pointer rides on the criterion whose TITLE names the bug,
// which is the line the student reads first.
const SKIP_TITLE = {
  'Implement one stretch challenge': 'points at content.md inside this lesson, not at an earlier lesson',
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

    // Longest key first, so the Bug-2 entry for 3.10 (which needs a different
    // target from the other two modules) cannot be shadowed by the shorter one.
    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];

    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];

    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 58)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 58)}" -- already points somewhere`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 58)}"`);
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
