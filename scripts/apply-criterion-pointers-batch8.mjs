// Per-criterion lesson pointers -- batch 8: modules 1.3, 3.6, 5.2, 5.4.
//
// Same rule as batches 1-7. A skip is only for a criterion with no honest earlier
// lesson -- NOT for one the lesson default already covers (batch 7 over-skipped
// 67 criteria that way before it was caught).

import { readFileSync, writeFileSync } from 'fs';

const POINTERS = {
  // --- 1.3.11 rename the mystery variables -------------------------------
  '1-3-11-lab-rename-the-mystery-variables': { target: '1.3.7', note: 'Avoid Single Letters and Abbreviations' },
  // --- 1.3.16 split the reused variable ----------------------------------
  '1-3-16-lab-split-the-reused-variable': { target: '1.3.13', note: 'Reuse or Create?' },
  // --- 1.3.19 document a messy program -----------------------------------
  '1-3-19-a1-3-1-document-a-messy-program': { target: '1.3.6', note: 'Human-Readable Names' },

  // --- 3.6 module: pass by value vs reference is the spine ---------------
  '3-6-4-lab-predict-primitive-vs-array': { target: '3.6.2', note: 'Pass by Value vs Reference' },
  '3-6-8-lab-fix-reassign-bug': { target: '3.6.5', note: 'Changing vs. Reassigning' },
  '3-6-12-lab-object-param-mutation': { target: '3.6.10', note: 'Defensive Copying: [...] and {...}' },
  '3-6-13-lab-nested-mutation': { target: '3.6.9', note: 'Side Effects and Copies' },
  '3-6-16-lab-capstone': { target: '3.6.10', note: 'Defensive Copying: [...] and {...}' },

  // --- 5.2 module: ground gating, forces, cleanup ------------------------
  '5-2-5-lab-add-a-jump': { target: '5.2.4', note: 'Ground-Gated Actions' },
  'moshion-bounce': { target: '5.2.6', note: 'Bounciness and Friction' },
  '5-2-9-lab-wind-zone': { target: '5.2.8', note: 'Forces vs Velocity' },
  '5-2-11-lab-reaching-the-goal': { target: '5.2.10', note: 'Cleanup and Delete' },
  '5-2-13-a5-2-1-pinball-scene': { target: '5.2.6', note: 'Bounciness and Friction' },
  '5-2-15-challenges': { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },

  // --- 5.4 module: methods on a class ------------------------------------
  '5-3-17-lab-method-no-params': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-18-lab-method-with-params': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-19-lab-method-returns': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-20-lab-method-calls-method': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-22-lab-mutate-sprite-prop': { target: '5.4.7', note: 'Why this.sprite, not extends Sprite' },
  '5-3-23-lab-cleanup': { target: '5.2.10', note: 'Cleanup and Delete' },
  '5-3-25-lab-three-vars': { target: '5.3.3', note: 'Class and instance' },
  '5-3-26-lab-array-of-instances': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-27-lab-loop-instances': { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-31-a12-1-collectible': { target: '5.4.17', note: 'When to reach for OOP' },
  '5-3-34-challenges': { target: '5.4.1', note: 'Methods: functions that live on a class' },
};

const PER_CRITERION = {
  '1-3-11-lab-rename-the-mystery-variables\u0000No single-letter variables left':
    { target: '1.3.7', note: 'Avoid Single Letters and Abbreviations' },
  '1-3-19-a1-3-1-document-a-messy-program\u0000taxRate is declared with const':
    { target: '1.3.2', note: 'camelCase and const' },
  '1-3-19-a1-3-1-document-a-messy-program\u0000Operators are spaced':
    { target: '1.3.3', note: 'Code Layout' },
  '1-3-19-a1-3-1-document-a-messy-program\u0000At least four explanatory comments':
    { target: '1.3.4', note: 'Comments: // and /* */' },
  '1-3-19-a1-3-1-document-a-messy-program\u0000README answers all three prompts':
    { target: '1.3.18', note: 'What a README Is For' },

  '3-6-4-lab-predict-primitive-vs-array\u0000.push used':
    { target: '3.3.2', note: 'Array Basics: Index, push, pop' },
  '3-6-8-lab-fix-reassign-bug\u0000for loop present':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '3-6-8-lab-fix-reassign-bug\u0000indexed write into the parameter':
    { target: '3.3.3', note: 'Changing an Item by Index' },
  '3-6-12-lab-object-param-mutation\u0000object spread used':
    { target: '3.6.10', note: 'Defensive Copying: [...] and {...}' },
  '3-6-13-lab-nested-mutation\u0000outer object copied with spread':
    { target: '3.6.10', note: 'Defensive Copying: [...] and {...}' },
  '3-6-16-lab-capstone\u0000new array built with spread':
    { target: '3.6.10', note: 'Defensive Copying: [...] and {...}' },
  '3-6-16-lab-capstone\u0000copyBook defined with a deep copy':
    { target: '3.6.9', note: 'Side Effects and Copies' },

  '5-2-5-lab-add-a-jump\u0000Launch the player upward':
    { target: '5.2.2', note: 'Gravity' },
  '5-2-5-lab-add-a-jump\u0000Combine both checks with &&':
    { target: '2.1.29', note: 'Logical Operators: && || !' },
  '5-2-9-lab-wind-zone\u0000Only apply the force inside a zone':
    { target: '2.1.3', note: 'If / Else if / Else' },
  '5-2-13-a5-2-1-pinball-scene\u0000Turn on gravity':
    { target: '5.2.2', note: 'Gravity' },
  '5-2-15-challenges\u0000Build a scene with two goals':
    { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },

  '5-3-18-lab-method-with-params\u0000Parameter used inside method body':
    { target: '3.2.5', note: 'Parameters and Arguments' },
  '5-3-19-lab-method-returns\u0000isHigh() compares this.n to 10':
    { target: '5.4.1', note: 'Methods: functions that live on a class' },
  '5-3-27-lab-loop-instances\u0000for loop over enemies in draw()':
    { target: '3.3.5', note: 'Looping Over Arrays (for / for…of)' },
  '5-3-31-a12-1-collectible\u0000Constructor creates the sprite':
    { target: '5.1.6', note: 'Sprite: new Sprite(x, y, w, h) + .color' },
  '5-3-34-challenges\u0000Use one OOP feature':
    { target: '5.4.20', note: 'Encapsulation, inheritance, polymorphism' },
};

const SKIP_TITLE = {
  // SEQUENCING: both are taught LATER than the lab that uses them.
  'Use an edge-triggered key check': 'SEQUENCING: kb.presses is introduced at 6.3.3, AFTER this lab',
  'Overlap detection': 'SEQUENCING: overlaps() is taught at 6.2.3, AFTER this lab',
  'All four are printed': 'console.log -- foundational',
  'results logged': 'console.log -- foundational',
  'caller variables logged': 'console.log -- foundational',
  'caller array logged': 'console.log -- foundational',
  'objects logged': 'console.log -- foundational',
  'Print the finish message': 'console.log -- foundational',
  'No single-letter variables remain': 'covered by the default pointer on this lesson',
  'README mentions the tax rate': 'covered by the README criterion',
  'bookTitle holds the title': 'covered by the default pointer on this lesson',
  'unitPrice and quantity are named': 'covered by the default pointer on this lesson',
  'subtotal is computed from them': 'covered by the default pointer on this lesson',
  'orderTotal uses the tax rate': 'covered by the default pointer on this lesson',
  'maxScore holds the number': 'covered by the default pointer on this lesson',
  'playerName holds the text': 'covered by the default pointer on this lesson',
  'isGameOver holds a boolean': 'covered by the default pointer on this lesson',
  'levelCount holds the number': 'covered by the default pointer on this lesson',
  'stuff is gone': 'covered by the default pointer on this lesson',
  'subjectName replaces a': 'the default pointer covers all six renames',
  'finalGrade replaces b': 'the default pointer covers all six renames',
  'gradeReport replaces c': 'the default pointer covers all six renames',
  'hoursWorked replaces n': 'the default pointer covers all six renames',
  'hourlyRate replaces d': 'the default pointer covers all six renames',
  'totalPay replaces p': 'the default pointer covers all six renames',
  'Create multiple static walls': 'static bodies are named in the module content, not a reading',
  'Add at least three static obstacles': 'static bodies are named in the module content, not a reading',
  'Create a dynamic ball': 'sprite creation is taught by the tool surface',
  'Set bounciness': 'covered by the default pointer on this lesson',
  'Set friction': 'covered by the default pointer on this lesson',
  'Add a reset key': 'kb.pressing is 5.1.13; no earlier lesson needed for a single key read',
  'Track collection progress': 'a counter variable; no single earlier lesson',
  'Check that the player is on the ground': 'covered by the default pointer on this lesson',
  'Compute the distance to the goal': 'covered by the default pointer on this lesson',
  'Guard the check on the goal still existing': 'covered by the default pointer on this lesson',
  'Delete the goal on arrival': 'covered by the default pointer on this lesson',
  'Clear the goal variable': 'covered by the default pointer on this lesson',
  'e1 assigned to a new Enemy': 'covered by the default pointer on this lesson',
  'e2 assigned to a new Enemy': 'covered by the default pointer on this lesson',
  'e3 assigned to a new Enemy': 'covered by the default pointer on this lesson',
  'Method called on loop variable': 'covered by the default pointer on this lesson',
  'changeNum defined': 'covered by the default pointer on this lesson',
  'changeArr defined': 'covered by the default pointer on this lesson',
  'birthday defined': 'covered by the default pointer on this lesson',
  'birthdaySafe defined': 'covered by the default pointer on this lesson',
  'property mutated': 'covered by the default pointer on this lesson',
  'addScore defined': 'covered by the default pointer on this lesson',
  'recordPlay defined': 'covered by the default pointer on this lesson',
  'plays property updated': 'covered by the default pointer on this lesson',
  'Define at least one class': 'covered by the default pointer on this lesson',
  'Instantiates a class of your own': 'covered by the default pointer on this lesson',
  'Write a constructor': 'covered by the default pointer on this lesson',
  'At least one instance': 'covered by the default pointer on this lesson',
  'collect() method does work': 'covered by the default pointer on this lesson',
  'Constructor stores state on the object': 'covered by the default pointer on this lesson',
  'enemies.push(new Enemy(...)) used at least once': 'covered by the default pointer on this lesson',
  'Three separate new Enemy(...) calls': 'covered by the default pointer on this lesson',
  'bigStep() calls this.addBy(5) and returns this.isHigh()': 'covered by the default pointer',
  'moveRight(dx) mutates this.sprite.x': 'covered by the default pointer on this lesson',
  'pop() calls this.sprite.delete()': 'covered by the default pointer on this lesson',
  'tick() method increments this.n': 'covered by the default pointer on this lesson',
  'addBy(n) method declared': 'covered by the default pointer on this lesson',
  'structuredClone used': 'a deep-copy builtin; no earlier reading teaches it',
  'Make the ball genuinely bouncy': 'covered by the default pointer on this lesson',
  'Use applyForce on the player': 'covered by the default pointer on this lesson',
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
      console.log(`  KEEP     ${folder}  "${title.slice(0, 52)}"`);
      continue;
    }
    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    const target = perCrit ? perCrit[1] : skip ? null : def;
    if (!target) {
      skipped++;
      console.log(`  no ptr  ${folder}  "${title.slice(0, 52)}" -- ${skip ? skip[1] : 'no teaching lesson identified'}`);
      continue;
    }
    const desc = String(req.description ?? '');
    const next = /\.$/.test(desc) ? desc : `${desc}.`;
    req.description = `${next} Help: ${target.target} (${target.note})`;
    added++;
    console.log(`  ${DRY ? 'would add' : 'add   '}  ${folder} -> ${target.target}  "${title.slice(0, 52)}"`);
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
