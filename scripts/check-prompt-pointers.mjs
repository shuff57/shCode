// Every lesson number a student is pointed at must be a real, reachable lesson.
//
// The written-assignment question set names the lesson that teaches each
// concept ("1.1.17"), and components/WrittenGrader.tsx turns those numbers
// into links at render time. The link is only as good as the index behind it:
// a number with no matching lesson title renders as plain text with no visible
// failure, so a typo in a prompt becomes a dead reference no test would catch.
//
// This reads every aiGrader prompt, collects the numbers, and checks each one
// against the lesson titles. Uniqueness of the numbering itself is enforced
// separately by check-lesson-numbers.mjs; this checks the other direction --
// that each pointer resolves to exactly one lesson.

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');

const LESSON_NUMBER = /\d+\.\d+\.\d+/g;
const LEADING_NUMBER = /^(\d+\.\d+\.\d+)/;

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  -- ${detail}`}`);
  if (!cond) failures++;
};

console.log('written-assignment prompt pointers resolve to a real lesson\n');

// displayed number -> lesson id, from every lesson.json title.
const byNumber = new Map();
const collisions = [];
for (const dir of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const file = path.join(lessonsDir, dir.name, 'lesson.json');
  if (!existsSync(file)) continue;
  const { title } = JSON.parse(readFileSync(file, 'utf8'));
  const m = String(title ?? '').match(LEADING_NUMBER);
  if (!m) continue;
  if (byNumber.has(m[1])) collisions.push(`${m[1]}: ${byNumber.get(m[1])} and ${dir.name}`);
  else byNumber.set(m[1], dir.name);
}

let promptCount = 0;
let pointerCount = 0;
const dead = [];
const ambiguous = [];

for (const dir of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const file = path.join(lessonsDir, dir.name, 'lesson.json');
  if (!existsSync(file)) continue;
  const lesson = JSON.parse(readFileSync(file, 'utf8'));
  const prompt = lesson?.aiGrader?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) continue;
  promptCount++;
  for (const n of prompt.match(LESSON_NUMBER) ?? []) {
    pointerCount++;
    if (!byNumber.has(n)) dead.push(`${dir.name}: (${n})`);
  }
}

console.log(`  ${promptCount} prompt(s), ${pointerCount} pointer(s), ${byNumber.size} numbered lessons\n`);

// The core assertion. A dead pointer is the whole point of this file.
check('every lesson number in a prompt names a real lesson', dead.length === 0,
  dead.length ? `${dead.length} dead pointer(s): ${dead.slice(0, 12).join(', ')}` : '');

// A number naming two lessons cannot pick one href, so the link is dropped.
// check-lesson-numbers.mjs makes this a build error; asserted here too because
// the symptom (a silently plain pointer) lives in this feature.
check('no lesson number names two different lessons', collisions.length === 0,
  collisions.length ? collisions.join('; ') : '');

// Zero prompts would mean the census is reading the wrong path, which would
// make every other check here pass vacuously.
check('the scan found prompts to check', promptCount > 0 && pointerCount > 0,
  `promptCount=${promptCount} pointerCount=${pointerCount}`);

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
