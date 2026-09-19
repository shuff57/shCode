// Every graded part of a test unit must be marked summative.
//
// WHY THIS EXISTS. `summative` is what tells a renderer "this is a test":
// Submit stays available on an incomplete attempt, handing in unlocks the
// next part, and marking happens later off the student's screen. Miss it on
// one part and that part alone reverts to practice-assignment rules --
// Submit refuses until everything is green -- which on a sat test locks the
// student out of every part after it. Measured 2026-09-03 on the Chapter 1
// individual PA: Parts 1, 2 and 5 were marked, Parts 3 and 4 were not, so a
// student who could not fix Part 3's syntax error could not reach Parts 4
// and 5 at all and lost the marks they had.
//
// The flag lives in whichever config block the renderer reads, so there are
// four of them and the wrong one is silently inert:
//
//   quiz      -> quiz.summative          (components/QuizView.tsx)
//   aiGrader  -> aiGrader.summative      (components/WrittenGrader.tsx)
//   diagram   -> diagram.summative       (components/DiagramAssignmentView.tsx)
//   regex     -> grading.summative       (components/LessonWorkspace.tsx)
//
// The rule is self-maintaining rather than a hardcoded list of test units: a
// unit counts as a test unit as soon as ONE of its lessons is summative, and
// then every graded lesson beside it has to be too. Add Part 6 to a chapter
// PA and it must opt in, or this fails.
//
//   node scripts/check-summative-parts.mjs

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');

// Which block a lesson's renderer reads, in the order a lesson is dispatched.
// A lesson can own more than one (an AI-graded flowchart owns diagram and, in
// diagram.aiGrader, its rubric) so this returns every one that applies.
function gradedBlocks(lesson) {
  const blocks = [];
  if (lesson.quiz) blocks.push(['quiz', lesson.quiz]);
  if (lesson.aiGrader) blocks.push(['aiGrader', lesson.aiGrader]);
  if (lesson.diagram) blocks.push(['diagram', lesson.diagram]);
  if (Array.isArray(lesson.requirements) && lesson.requirements.length > 0) {
    blocks.push(['grading', lesson.grading ?? null]);
  }
  return blocks;
}

const byUnit = new Map();
for (const dir of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, dir, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let lesson;
  try {
    lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    continue; // check-lesson-numbers.mjs owns malformed JSON
  }
  const unit = lesson.unit;
  if (!unit) continue;
  if (!byUnit.has(unit)) byUnit.set(unit, []);
  byUnit.get(unit).push({ dir, lesson });
}

const problems = [];
let unitsChecked = 0;
let partsChecked = 0;

for (const [unit, entries] of byUnit) {
  // A unit is a TEST unit iff its name matches the individual chapter test
  // pattern: "N.M Chapter N Individual Performance Assessment". Keying on the
  // bare number was wrong twice over: 3.7 Array Methods and 6.7 Advanced
  // Input are teaching modules whose numbers merely end in .7, and the Group
  // PA units are deliberately NOT test units at all — their lessons are
  // green-to-advance and set the flag nowhere (see 2.6's warning block —
  // 2.6.1's chart is supposed to gate 2.6.2, and summative exists precisely
  // to switch that gating off). Keying on any-lesson-summative was wrong the
  // other way too: 2-1-39 and 1-3-21 are module quizzes legitimately marked
  // quiz.summative, and that dragged their whole teaching units in.
  //
  // The section number is \d+ rather than a literal 7 because the assessment
  // modules sit AFTER the chapter's book sections, and chapters are not all
  // five sections long. Ch 1 and Ch 2 end at §N.5 so their tests are N.7;
  // Chapter 3 has eight book sections, so its Group PA is 3.9 and its test is
  // **3.10**. Against the old literal `\.7` that unit did not match, this
  // whole check skipped it, and the five parts of a sat exam went unchecked —
  // which is the exact failure this file exists to prevent (1.7, 2026-09-03:
  // Parts 3 and 4 unflagged, so a student stuck on Part 3 could not reach
  // Parts 4 and 5 at all). The chapter backreference and the two literal
  // words still keep teaching modules and Group PAs out.
  const isTestUnit = /^(\d+)\.\d+ Chapter \1 Individual Performance Assessment$/.test(unit);
  if (!isTestUnit) continue;
  unitsChecked++;

  for (const { dir, lesson } of entries) {
    const blocks = gradedBlocks(lesson);
    if (blocks.length === 0) continue; // a reading sitting in a test unit
    partsChecked++;
    for (const [name, block] of blocks) {
      if (block && block.summative === true) continue;
      problems.push(
        `${dir}\n    unit "${unit}" is a test unit, but this part's `
          + `${name} block does not set "summative": true.\n`
          + `    Without it Submit refuses an incomplete attempt and every part `
          + `after this one stays locked.`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error('[check-summative-parts] FAIL\n');
  for (const p of problems) console.error('  ' + p + '\n');
  console.error(
    `${problems.length} graded part(s) in a test unit are missing the flag.`,
  );
  process.exit(1);
}

console.log(
  `[check-summative-parts] ok — ${partsChecked} graded part(s) across `
    + `${unitsChecked} test unit(s) are all marked summative`,
);
