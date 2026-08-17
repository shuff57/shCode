// Guards the lesson-numbering invariants that `lib/curriculum.ts` depends on.
//
// WHY THIS EXISTS. A module page orders its lessons by the number parsed off the
// front of each TITLE (parseNumberedIdFromTitle, /^(\d+\.\d+\.\d+)/), not by the
// folder name. Two consequences are easy to hit and invisible once shipped:
//
//   * Two lessons sharing a number sort against each other arbitrarily, so one
//     of them appears in a different place on different builds.
//   * A title with no number is skipped entirely — the lesson still exists, is
//     still reachable by URL, and simply never appears on its module page.
//
// Neither shows up as an error anywhere. Both are one careless renumber away.
//
// The live case this was written for: units 1.2, 1.3 and 1.5 each gained a video
// lesson that took the number their quiz used to have, and the quiz moved up one
// — TITLE only, because lesson ids key student progress in D1 and renaming a
// folder would orphan it. So `1-2-30-unit-quiz` legitimately carries the title
// `1.2.31`. Anyone "tidying" that mismatch by renumbering the title back lands
// it on top of the video. This check turns that into a failed build.
//
// Run by `npm run prebuild` (so it cannot ship) and by `npm test`.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');

const NUMBERED = /^(\d+\.\d+)\.(\d+)/;      // same shape lib/curriculum.ts parses
const UNIT_NUM = /^(\d+\.\d+)/;

const entries = await fs.readdir(lessonsDir, { withFileTypes: true });
const lessons = [];
for (const e of entries) {
  if (!e.isDirectory()) continue;
  let raw;
  try {
    raw = await fs.readFile(path.join(lessonsDir, e.name, 'lesson.json'), 'utf8');
  } catch {
    continue;                                // not a lesson dir (e.g. _retired/)
  }
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch (err) {
    lessons.push({ folder: e.name, parseError: String(err.message) });
    continue;
  }
  lessons.push({ folder: e.name, title: String(meta.title ?? ''), unit: meta.unit ?? null });
}

const errors = [];
const warnings = [];

// --- 1. every lesson carries a parseable number, or it silently vanishes
for (const l of lessons) {
  if (l.parseError) {
    errors.push(`${l.folder}: lesson.json does not parse — ${l.parseError}`);
    continue;
  }
  if (!NUMBERED.test(l.title)) {
    errors.push(`${l.folder}: title has no N.N.N prefix, so its module page will `
      + `skip it entirely — ${JSON.stringify(l.title)}`);
  }
}

// --- 2. no two lessons share a number (the collision this file is named for)
const byNumber = new Map();
for (const l of lessons) {
  const m = l.title && l.title.match(NUMBERED);
  if (!m) continue;
  const num = `${m[1]}.${m[2]}`;
  if (!byNumber.has(num)) byNumber.set(num, []);
  byNumber.get(num).push(l.folder);
}
for (const [num, folders] of [...byNumber].sort()) {
  if (folders.length > 1) {
    errors.push(`duplicate lesson number ${num} used by ${folders.length}: `
      + folders.join(', '));
  }
}

// --- 3. the title's module matches the unit field it claims to be in
for (const l of lessons) {
  const m = l.title && l.title.match(NUMBERED);
  if (!m || !l.unit) continue;
  const u = String(l.unit).match(UNIT_NUM);
  if (u && u[1] !== m[1]) {
    warnings.push(`${l.folder}: numbered ${m[1]}.${m[2]} but filed under unit `
      + `${JSON.stringify(l.unit)}`);
  }
}

for (const w of warnings) console.warn(`[check-lesson-numbers] WARN  ${w}`);
for (const e of errors) console.error(`[check-lesson-numbers] ERROR ${e}`);

if (errors.length) {
  console.error(`\n[check-lesson-numbers] ${errors.length} error(s) across `
    + `${lessons.length} lessons. See the header of this file for why each matters.`);
  process.exit(1);
}
console.log(`[check-lesson-numbers] ${lessons.length} lessons, `
  + `${byNumber.size} distinct numbers, no collisions`
  + (warnings.length ? ` (${warnings.length} warning(s))` : ''));
