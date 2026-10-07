// Per-criterion lesson pointers -- batch 6: modules 1.1, 2.2, 6.3, 6.4.
//
// Same rule as batches 1-5: point a criterion at an earlier lesson that teaches
// that specific construct; leave the foundational and the tool-surface ones
// alone; never point forward.

import { readFileSync, writeFileSync } from 'fs';

// Default per lesson. ONE value per folder; a lesson whose criteria span several
// constructs gets no default and is listed per criterion instead (batch 4).
const POINTERS = {
  // --- 1.1.3 Your First Statement: statements and console.log -------------
  '1-1-3-first-statement': { target: '1.1.2', note: 'console.log & sequential execution' },

  // --- 1.1.7 Classify the Task: the four phases ---------------------------
  '1-1-7-classify-the-task': { target: '1.1.6', note: 'The Four Phases' },

  // --- 1.1.11 Name That Umbrella -----------------------------------------
  '1-1-11-name-that-umbrella': { target: '1.1.10', note: 'Umbrella Activities' },

  // --- 6.3.9 Space Jumper: gravity, then the module's own input material --
  '6-3-9-a14-1-space-jumper': { target: '5.2.2', note: 'Gravity' },

  // --- 6.3.10 Car on a Ramp: same gravity reading -------------------------
  '6-3-10-a14-2-car-ramp': { target: '5.2.2', note: 'Gravity' },
};

// Per-CRITERION overrides. Key is "<folder>\u0000<title substring>"; longest
// match wins.
const PER_CRITERION = {
  // --- 1.1.4 What a Program Is: six different constructs ------------------
  '1-1-4-sdlc-overview\u0000Hello world':
    { target: '1.1.2', note: 'console.log & sequential execution' },
  '1-1-4-sdlc-overview\u0000Math expression':
    { target: '1.1.2', note: 'console.log & sequential execution' },
  // String concatenation and boolean comparison are taught in module 1.2, which
  // comes AFTER this lab. Pointing there would send the student forward, and the
  // direction gate failed the build on exactly that. They get no pointer, and
  // the gap is a sequencing finding rather than a linking one -- see the note
  // at the bottom of this file.

  // --- 2.2 loops: the for reading and the while reading are different -----
  '2-2-7-lab-count-to-ten\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-2-10-lab-countdown\u0000while loop present':
    { target: '2.2.13', note: 'The while Loop' },
  '2-2-16-a2-2-1-loop-program\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-2-16-a2-2-1-loop-program\u0000while loop present':
    { target: '2.2.13', note: 'The while Loop' },
  '2-2-17b-lab-count-a-letter\u0000loop runs to word.length with <':
    { target: '2.2.19', note: 'Walking Through a Word' },
  '2-2-17b-lab-count-a-letter\u0000a character is tested by position':
    { target: '2.2.19', note: 'Walking Through a Word' },
  '2-2-17b-lab-count-a-letter\u0000the counter goes up inside the if':
    { target: '2.2.9', note: 'The for Loop' },
  '2-2-13-challenges\u0000for loop present':
    { target: '2.2.9', note: 'The for Loop' },
  '2-2-13-challenges\u0000if statement present':
    { target: '2.1.3', note: 'If / Else if / Else' },

  // --- 6.3.9 Space Jumper: module 6.3 teaches edges and ground checks -----
  '6-3-9-a14-1-space-jumper\u0000WASD horizontal input':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '6-3-9-a14-1-space-jumper\u0000Edge-triggered jump':
    { target: '6.3.3', note: 'moSHion docs: Input edges' },
  '6-3-9-a14-1-space-jumper\u0000Ground-gated jump':
    { target: '6.3.6', note: 'Colliding + Ground Detection' },
  '6-3-9-a14-1-space-jumper\u0000Win condition via overlap':
    { target: '6.2.3', note: 'moSHion docs: Collisions + Overlaps' },

  // --- 6.3.10 Car on a Ramp ----------------------------------------------
  '6-3-10-a14-2-car-ramp\u0000WASD drives the car':
    { target: '5.1.14', note: 'Keyboard Movement' },
  '6-3-10-a14-2-car-ramp\u0000Sets horizontal velocity':
    { target: '5.1.15', note: 'Velocity: vel.x and vel.y' },
  '6-3-10-a14-2-car-ramp\u0000Tilted ramp via rotation':
    { target: '5.1.10', note: 'Sprite property tour: pos, rotation, scale' },
  '6-3-10-a14-2-car-ramp\u0000Uses WheelJoint':
    // No lesson teaches WheelJoint -- the module's own content.md names it and
    // 6.3.8 is the nearest worked example of a joint. Deliberately left blank
    // rather than pointed at a pendulum, which is a different joint.
    null,

  // --- 6.4.9 Animated Sprites Sandbox: module 6.4 teaches animation -------
  '6-4-9-animated-sprites-sandbox\u0000Two or more visual states':
    { target: '6.4.3', note: 'moSHion docs: Animation' },
  '6-4-9-animated-sprites-sandbox\u0000Visual swap driven by input':
    { target: '5.1.14', note: 'Keyboard Movement' },

  // --- 6.4.18 Side-Scrolling Platformer ----------------------------------
  '6-4-18-a15-1-platformer\u0000Two or more animation states':
    { target: '6.4.3', note: 'moSHion docs: Animation' },
  '6-4-18-a15-1-platformer\u0000Camera follows the player':
    { target: '6.4.11', note: 'moSHion docs: Camera' },
  '6-4-18-a15-1-platformer\u0000Working ground-gated jump':
    { target: '6.3.6', note: 'Colliding + Ground Detection' },
  '6-4-18-a15-1-platformer\u0000Goal detection + win message':
    { target: '6.2.3', note: 'moSHion docs: Collisions + Overlaps' },

  // --- 6.4.19 Challenges --------------------------------------------------
  '6-4-19-challenges\u0000Create a canvas':
    { target: '5.1.5', note: 'Canvas: new Canvas(w, h)' },
  '6-4-19-challenges\u0000Camera follows something':
    { target: '6.4.11', note: 'moSHion docs: Camera' },
};

// Criteria with no pointer, and why. Keyed on the criterion TITLE.
const SKIP_TITLE = {
  'String concatenation': 'SEQUENCING: taught at 1.2.12, AFTER this lab',
  'Boolean comparison': 'SEQUENCING: taught in module 1.2, AFTER this lab',
  'Your name': 'a string literal; 1.1.2 is on the sibling criterion',
  'Your hobby': 'a string literal; 1.1.2 is on the sibling criterion',
  'console.log present': 'console.log itself -- taught at 1.1.2, already done',
  'First statement present': 'covered by the sibling statement criteria',
  'Second statement present': 'covered by the sibling statement criteria',
  'Third statement present': 'covered by the sibling statement criteria',
  'Fourth statement is a console.log': 'console.log -- 1.1.2 is on the sibling criterion',
  'Fifth statement is a console.log': 'console.log -- 1.1.2 is on the sibling criterion',
  'Fourth statement changed': 'a revision of an earlier statement, not a new construct',
  'Fifth statement changed': 'a revision of an earlier statement, not a new construct',
  'the total is printed': 'console.log -- foundational',
  'Static geometry exists': 'static bodies are named in the module content, not a reading',
  'Player sprite exists': 'sprite creation is taught by the tool surface',
  'Player sprite has a visual': 'sprite visuals are taught by the tool surface',
  'Create at least one sprite': 'sprite creation is taught by the tool surface',
  'Clear the background each frame': 'a draw-loop call taught by the tool surface',
  'Background cleared each frame': 'a draw-loop call taught by the tool surface',
  'Three or more static platforms': 'static bodies are named in the module content, not a reading',
  'Use one stretch feature': 'the stretch features are named in content.md, not a reading',
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

    // Checked FIRST: a criterion that already points somewhere is not a gap,
    // and reporting it as one is how a real gap gets missed (batch 5).
    if (/\d+\.\d+\.\d+/.test(String(req.description ?? ''))) {
      console.log(`  KEEP     ${folder}  "${title.slice(0, 56)}" -- already points somewhere`);
      continue;
    }

    const perCrit = Object.entries(PER_CRITERION)
      .filter(([k]) => k.split('\u0000')[0] === folder && title.includes(k.split('\u0000')[1]))
      .sort((a, b) => b[0].length - a[0].length)[0];
    const skip = Object.entries(SKIP_TITLE).find(([t]) => title.includes(t));
    // An explicit null in PER_CRITERION is a decision NOT to point, so it wins
    // over the lesson default.
    const target = perCrit ? perCrit[1] : skip ? null : POINTERS[folder];

    if (!target) {
      skipped++;
      const why = perCrit
        ? 'explicitly declined -- see the note beside it in the mapping'
        : skip ? skip[1] : 'no teaching lesson identified';
      console.log(`  no ptr  ${folder}  "${title.slice(0, 56)}" -- ${why}`);
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
