// Every lesson number a student is pointed at must be a real, reachable lesson.
//
// Two surfaces carry those numbers. A written assignment's question set names
// the lesson that teaches each question (aiGrader.prompt), and a coding
// assignment's criterion does the same in its `description` or its failure
// `hint`. Both are rendered by components/LessonNumberLinks.tsx, which turns
// the numbers into links.
//
// The link is only as good as the index behind it: a number with no matching
// lesson title renders as plain text with no visible failure, so a typo in a
// prompt becomes a dead reference no other test would catch.
//
// Uniqueness of the numbering is enforced by check-lesson-numbers.mjs; this
// checks the other direction -- that each pointer resolves to exactly one
// lesson. Note that check-lesson-citations.mjs already covers a wider set of
// prose surfaces and additionally rejects a FORWARD citation; it does not read
// aiGrader.prompt, which is why this file exists.
//
// DIRECTION is checked here too, and this is the only gate that covers every
// pointer on both surfaces. check-lesson-citations.mjs rejects a forward citation,
// but it reads only content.md / description / steps / requirements -- never
// aiGrader.prompt -- and it only judges direction for citations phrased as
// back-references. A pointer to a lesson the student has not reached sends them
// to material that assumes what they are trying to learn.
//
// A pointer to the CURRENT lesson is not a defect but is a dead link: it opens a
// second copy of the page the student is already on. Counted, not failed.

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

console.log('lesson pointers resolve to a real lesson\n');

const readLesson = (dir) => {
  const file = path.join(lessonsDir, dir, 'lesson.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

// displayed number -> lesson id, plus folder id -> displayed number. Both are
// needed: the resolver and the course order are keyed by number, while the
// prose surfaces are keyed by folder.
const byNumber = new Map();
const numberById = new Map();
const collisions = [];
const order = [];
for (const dir of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const m = String(readLesson(dir.name)?.title ?? '').match(LEADING_NUMBER);
  if (!m) continue;
  numberById.set(dir.name, m[1]);
  if (byNumber.has(m[1])) collisions.push(`${m[1]}: ${byNumber.get(m[1])} and ${dir.name}`);
  else byNumber.set(m[1], dir.name);
  order.push(m[1].split('.').map(Number));
}

// Course order, so "has the student reached this yet?" has an answer. Sorted by
// the displayed number's three parts, which is the order the course teaches in.
order.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
const rank = new Map(order.map((parts, i) => [parts.join('.'), i]));

// Every prose surface the linkifier renders.
const surfaces = [];
for (const dir of readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const lesson = readLesson(dir.name);
  if (!lesson) continue;

  const prompt = lesson?.aiGrader?.prompt;
  if (typeof prompt === 'string' && prompt.trim()) {
    surfaces.push([dir.name, 'aiGrader.prompt', prompt]);
  }
  for (const req of lesson?.requirements ?? []) {
    for (const field of ['description', 'hint']) {
      if (typeof req?.[field] === 'string' && req[field].trim()) {
        surfaces.push([dir.name, `requirements.${field}`, req[field]]);
      }
    }
  }
}

const dead = [];
const forward = [];
const self = [];
let unknownSource = 0;
let pointerCount = 0;
for (const [id, where, text] of surfaces) {
  const me = numberById.get(id);
  if (me === undefined) { unknownSource++; continue; }
  for (const n of text.match(LESSON_NUMBER) ?? []) {
    pointerCount++;
    if (!byNumber.has(n)) {
      dead.push(`${id} [${where}]: (${n})`);
      continue;
    }
    if (n === me) self.push(`${id} [${where}]: (${n})`);
    else if (rank.get(n) > rank.get(me)) forward.push(`${id} [${where}]: ${me} -> ${n}`);
  }
}

console.log(`  ${surfaces.length} prose surface(s), ${pointerCount} pointer(s), ${byNumber.size} numbered lessons`);
console.log(`  ${pointerCount - forward.length - self.length} point BACKWARD, ${forward.length} forward, ${self.length} self-reference(s)\n`);

// The core assertion. A dead pointer is the whole point of this file.
check('every lesson number in a prompt or criterion names a real lesson', dead.length === 0,
  dead.length ? `${dead.length} dead pointer(s): ${dead.slice(0, 12).join(', ')}` : '');

// A number naming two lessons cannot pick one href, so the link is dropped.
// check-lesson-numbers.mjs makes this a build error; asserted here too because
// the symptom (a silently plain pointer) lives in this feature.
check('no lesson number names two different lessons', collisions.length === 0,
  collisions.length ? collisions.join('; ') : '');

// Zero pointers would mean the scan is reading the wrong path, which would make
// every other check here pass vacuously.
check('the scan found pointers to check', pointerCount > 0, `pointerCount=${pointerCount}`);

// The direction assertion. Zero today; a lesson reorder is what creates them.
check('no pointer sends the student to a lesson they have not reached', forward.length === 0,
  forward.length ? `${forward.length} forward pointer(s): ${forward.slice(0, 8).join(', ')}` : '');

// A pointer to the CURRENT lesson opens a second copy of the page the student is
// already on. It used to be reported but never failed, so three of them sat in
// the course for months: "the chart (1.6.1), the code (1.6.2), this writeup
// (1.6.3)" -- where the words already say "this writeup" and the number is
// redundant. Fixed editorially; this makes it a build failure.
check('no pointer links a lesson to itself', self.length === 0,
  self.length ? `${self.length} self-reference(s): ${self.slice(0, 8).join(', ')}` : '');

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
