// Per-criterion lesson pointers -- batch 9: modules 2.4, 2.5, 3.7, 5.1.
//
// Same rule as batches 1-8. A skip is only for a criterion with no honest
// earlier lesson, never for one the lesson default already covers.

import { readFileSync, writeFileSync } from 'fs';

const POINTERS = {
  // --- 2.4 loop control ---------------------------------------------------
  '2-4-4-lab-write-both-loops': { target: '2.4.2', note: 'for vs while: Choosing a Loop' },
  '2-4-8-lab-do-while-count': { target: '2.4.5', note: 'The do...while Loop' },
  '2-4-12-lab-break-square': { target: '2.4.9', note: 'Leaving Early with break' },
  '2-4-19-lab-multiples-of-three': { target: '2.4.13', note: 'Skipping a Round with continue' },
  '2-4-23-a2-4-1-debug-five-loops': { target: '2.4.20', note: 'Infinite Loops: Three Causes' },
  '2-4-30-lab-triangle-of-stars': { target: '2.4.24', note: 'Nested Loops' },
  '2-4-31-lab-fix-duplicate-pairs': { target: '2.4.24', note: 'Nested Loops' },
  '2-4-32-a2-4-2-grid-pattern': { target: '2.4.24', note: 'Nested Loops' },
  '2-4-33-challenges': { target: '2.4.2', note: 'for vs while: Choosing a Loop' },

  // --- 2.5 try/catch/finally ---------------------------------------------
  '2-5-3-lab-runtime-or-syntax': { target: '2.5.2', note: 'What an Error Actually Does' },
  '2-5-6-lab-wrap-only-risk': { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '2-5-8-lab-catch-first-error': { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '2-5-9-lab-what-runs': { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '2-5-11-lab-fix-silent-catch': { target: '2.5.10', note: 'The Empty catch Trap' },
  '2-5-14-lab-report-the-error': { target: '2.5.12', note: 'Reading the Error Object' },
  '2-5-19-lab-reject-bad-input': { target: '2.5.15', note: 'Throwing Your Own Errors' },
  '2-5-20-lab-after-a-throw': { target: '2.5.15', note: 'Throwing Your Own Errors' },
  '2-5-22-lab-when-finally-runs': { target: '2.5.21', note: 'Cleaning Up with finally' },
  '2-5-24-lab-guard-only-inside': { target: '2.5.18', note: 'throw vs if: The Distance Rule' },
  '2-5-25-lab-predict-try-catch-finally': { target: '2.5.21', note: 'Cleaning Up with finally' },
  '2-5-26-a2-5-1-loop-with-try-catch': { target: '2.5.4', note: 'try...catch: Attempt and Recover' },
  '2-5-27-challenges': { target: '2.5.15', note: 'Throwing Your Own Errors' },

  // --- 3.7 array methods and spread ---------------------------------------
  '3-7-4-lab-map-non-mutating': { target: '3.7.2', note: 'Transforming a List with .map()' },
  '3-7-8-lab-slice-sublist': { target: '3.7.6', note: 'Taking Part of a List with .slice()' },
  '3-7-11-lab-concat-two-lists': { target: '3.7.9', note: 'Joining Lists with .concat()' },
  '3-7-17-lab-spread-array': { target: '3.7.14', note: 'Spreading into a New Array or Object' },
  '3-7-18-lab-spread-object': { target: '3.7.14', note: 'Spreading into a New Array or Object' },
  '3-7-21-lab-mutating-sort-drill': { target: '3.7.19', note: 'What Else Is Out There' },
  '3-7-22-lab-capstone': { target: '3.7.2', note: 'Transforming a List with .map()' },

  // --- 5.1 moSHion basics -------------------------------------------------
  '5-1-7-lab-one-sprite': { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
  '5-1-11-moshion-intro': { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
  '5-1-18-lab-else-to-zero': { target: '5.1.17', note: 'The else-to-zero rule' },
  '5-1-20-moshion-move-keys': { target: '5.1.13', note: 'kb.pressing(key)' },
  '5-1-21-a10-1-sprite-playground': { target: '5.1.16', note: 'Movement pattern (if / else if / else)' },
  '5-1-23-challenges': { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
};

const PER_CRITERION = {
  '2-4-4-lab-write-both-loops\u0000while loop present':
    { target: '2.2.13', note: 'The while Loop' },
  '2-4-19-lab-multiples-of-three\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-4-19-lab-multiples-of-three\u0000remainder operator used':
    { target: '1.2.7', note: 'Arithmetic Operators and Type Coercion' },
  '2-4-23-a2-4-1-debug-five-loops\u0000Program 5 fixed: do...while used':
    { target: '2.4.5', note: 'The do...while Loop' },
  '2-4-33-challenges\u0000continue present':
    { target: '2.4.13', note: 'Skipping a Round with continue' },

  '2-5-6-lab-wrap-only-risk\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-5-19-lab-reject-bad-input\u0000checks password length':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '2-5-19-lab-reject-bad-input\u0000catch logs err.message':
    { target: '2.5.12', note: 'Reading the Error Object' },
  '2-5-26-a2-5-1-loop-with-try-catch\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-5-26-a2-5-1-loop-with-try-catch\u0000catch reports err.message':
    { target: '2.5.12', note: 'Reading the Error Object' },
  '2-5-14-lab-report-the-error\u0000reads a property of null':
    { target: '1.2.19', note: 'The null Value' },
  '2-5-8-lab-catch-first-error\u0000reads username inside try':
    { target: '1.2.20', note: 'The undefined Value' },

  '3-7-22-lab-capstone\u0000Array built with .push()':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-7-22-lab-capstone\u0000.slice() used':
    { target: '3.7.6', note: 'Taking Part of a List with .slice()' },
  '3-7-22-lab-capstone\u0000Object spread with override':
    { target: '3.7.14', note: 'Spreading into a New Array or Object' },
  '3-7-22-lab-capstone\u0000Arrays joined':
    { target: '3.7.9', note: 'Joining Lists with .concat()' },

  '5-1-7-lab-one-sprite\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-1-11-moshion-intro\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-1-11-moshion-intro\u0000Set a sprite color':
    { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
  '5-1-18-lab-else-to-zero\u0000Restore else player.vel.x = 0':
    { target: '5.1.17', note: 'The else-to-zero rule' },
  '5-1-20-moshion-move-keys\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-1-20-moshion-move-keys\u0000Create a sprite':
    { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
  '5-1-20-moshion-move-keys\u0000Horizontal keyboard input':
    { target: '5.1.13', note: 'kb.pressing(key)' },
  '5-1-20-moshion-move-keys\u0000Vertical keyboard input':
    { target: '5.1.13', note: 'kb.pressing(key)' },
  '5-1-20-moshion-move-keys\u0000Set horizontal velocity':
    { target: '5.1.15', note: 'Velocity: vel.x and vel.y' },
  '5-1-20-moshion-move-keys\u0000Set vertical velocity':
    { target: '5.1.15', note: 'Velocity: vel.x and vel.y' },
  '5-1-21-a10-1-sprite-playground\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '5-1-21-a10-1-sprite-playground\u0000Horizontal WASD input':
    { target: '5.1.19', note: 'WASD-not-arrows' },
  '5-1-21-a10-1-sprite-playground\u0000Vertical WASD input':
    { target: '5.1.19', note: 'WASD-not-arrows' },
  '5-1-21-a10-1-sprite-playground\u0000Velocity resets to zero':
    { target: '5.1.17', note: 'The else-to-zero rule' },
  '5-1-23-challenges\u0000Create at least one sprite':
    { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
};

const SKIP_TITLE = {
  // console.log is taught at 1.1.2, long before every one of these.
  'console.log present': 'console.log -- foundational',
  'total logged after catch': 'console.log -- foundational',
  'at least two console.log calls': 'console.log -- foundational',
  'Welcome! logged after the block': 'console.log -- foundational',
  'logs A before the risky line': 'console.log -- foundational',
  'catch logs C': 'console.log -- foundational',
  'D logged after the whole block': 'console.log -- foundational',
  'finally logs cleanup': 'console.log -- foundational',
  'D logged after the whole statement': 'console.log -- foundational',
  'logs start before the throw': 'console.log -- foundational',
  'logs err.name': 'console.log -- foundational; the sibling criterion has the reading',
  'logs err.message': 'console.log -- foundational; the sibling criterion has the reading',
  // tool surface / already covered by the default
  'Clear the background each frame': 'the wipe rule is 5.1.9, but the sibling Canvas criterion carries the pointer',
  'Background set each frame': 'the wipe rule is 5.1.9, but the sibling Canvas criterion carries the pointer',
  'Create at least one sprite': 'covered by the default pointer on this lesson',
  'Create at least 2 sprites': 'covered by the default pointer on this lesson',
  'Create a sprite': 'covered by the default pointer on this lesson',
  'Set the sprite\'s color': 'covered by the default pointer on this lesson',
  'Array declared': 'covered by the default pointer on this lesson',
  'Arrays declared': 'covered by the default pointer on this lesson',
  'Two arrays declared': 'covered by the default pointer on this lesson',
  'Object declared': 'covered by the default pointer on this lesson',
  'Two spread arrays combined': 'covered by the default pointer on this lesson',
  'Two .slice() calls': 'covered by the default pointer on this lesson',
  '.map() used': 'covered by the default pointer on this lesson',
  '.concat() used': 'covered by the default pointer on this lesson',
  'Object spread used': 'covered by the default pointer on this lesson',
  'Spread used': 'covered by the default pointer on this lesson',
  'A mutating method is called': 'covered by the default pointer on this lesson',
  'A non-mutating method is called': 'covered by the default pointer on this lesson',
  'Override after the spread': 'covered by the default pointer on this lesson',
  'outer loop present': 'covered by the default pointer on this lesson',
  'inner loop bound depends on row': 'covered by the default pointer on this lesson',
  'inner loop starts at a + 1': 'covered by the default pointer on this lesson',
  'rows variable declared': 'covered by the default pointer on this lesson',
  'cols variable declared': 'covered by the default pointer on this lesson',
  'outer loop reads rows': 'covered by the default pointer on this lesson',
  'inner loop reads cols': 'covered by the default pointer on this lesson',
  'closing while present': 'covered by the default pointer on this lesson',
  'while (true) loop present': 'covered by the default pointer on this lesson',
  'break present': 'covered by the default pointer on this lesson',
  'continue present': 'covered by the default pointer on this lesson',
  'throw present': 'covered by the default pointer on this lesson',
  'finally present': 'covered by the default pointer on this lesson',
  'try/catch present': 'covered by the default pointer on this lesson',
  'try/catch/finally present': 'covered by the default pointer on this lesson',
  'try/catch inside the loop': 'covered by the default pointer on this lesson',
  'try block cannot fail': 'covered by the default pointer on this lesson',
  'reads an undeclared variable': 'covered by the default pointer on this lesson',
  'throws a new Error': 'covered by the default pointer on this lesson',
  'throws with the exact message': 'covered by the default pointer on this lesson',
  'throws boom': 'covered by the default pointer on this lesson',
  'catch reports caught plus the message': 'covered by the default pointer on this lesson',
  'catch is no longer empty': 'covered by the default pointer on this lesson',
  'guards firstMissing': 'covered by the default pointer on this lesson',
  'secondMissing left unguarded': 'covered by the default pointer on this lesson',
  'checks for NaN': 'NaN is 1.2.8, but this is a numeric guard inside a catch, not a NaN lesson',
  'Program 1 fixed: update added': 'the loop-debugging method is on the default pointer',
  'Program 2 fixed: update moves the right way': 'the loop-debugging method is on the default pointer',
  'Program 3 fixed: inclusive comparison': 'the loop-debugging method is on the default pointer',
  'Program 4 fixed: starts at 1': 'the loop-debugging method is on the default pointer',
  'Automatic motion for the mover': 'no single earlier lesson; the movement pattern is on the default',
  'On-screen text label': 'moSHion text() is taught by the tool surface',
  'Use at least one advanced feature': 'the advanced features are named in content.md, not a reading',
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
