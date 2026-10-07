// Which body a lesson renders (lib/lesson-view.ts): the code workspace or the
// read-and-answer view. Regression for the three find-and-fix test parts: they
// carry an `aiGrader` (the AI marks the student's FILE) AND are console lessons,
// and `aiGrader` alone used to send them to the prose WrittenGrader panel, with no
// editor, no Run button and no tries count.
//
//   node scripts/test-lesson-view.mjs

import fs from 'node:fs';
import path from 'node:path';
import { rendersAsContent } from '../lib/lesson-view.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const LESSONS = path.join(ROOT, 'lessons');
let failed = 0;
const check = (name, ok) => {
  if (!ok) { failed++; console.error('FAIL ' + name); }
};

// Unit cases.
check('console + aiGrader is the workspace', rendersAsContent({ preview: 'console', aiGrader: {} }) === false);
check('console without aiGrader is the workspace', rendersAsContent({ preview: 'console' }) === false);
check('written assignment + aiGrader is content', rendersAsContent({ preview: 'assignment', aiGrader: {} }) === true);
check('diagram is content', rendersAsContent({ preview: 'diagram', diagram: {} }) === true);
check('quiz is content', rendersAsContent({ preview: 'quiz', quiz: {} }) === true);
check('reading is content', rendersAsContent({ preview: 'reading' }) === true);
check('no preview + aiGrader is content', rendersAsContent({ aiGrader: {} }) === true);
check('console + a quiz block is still content', rendersAsContent({ preview: 'console', quiz: {} }) === true);

// Every real lesson: a code preview with an aiGrader renders as the workspace, and
// the three find-and-fix parts are among them.
const FIND_AND_FIX = ['1-7-3-ch1-individual-pa-find-and-fix', '2-7-3-ch2-individual-pa-find-and-fix', '3-10-3-ch3-individual-pa-find-and-fix'];
const seen = new Set();
for (const id of fs.readdirSync(LESSONS)) {
  const file = path.join(LESSONS, id, 'lesson.json');
  if (!fs.existsSync(file)) continue;
  let l;
  try { l = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  if (['console', 'moshion', 'reshape'].includes(l.preview) && l.aiGrader) {
    seen.add(id);
    check(`${id}: a code lesson with an aiGrader renders as the workspace`, rendersAsContent(l) === false);
  }
}
for (const id of FIND_AND_FIX) check(`${id} is a code lesson with an aiGrader`, seen.has(id));

if (failed) { console.error(`[test-lesson-view] ${failed} failure(s)`); process.exit(1); }
console.log(`[test-lesson-view] ok -- ${seen.size} code lesson(s) with an aiGrader render as the workspace`);
