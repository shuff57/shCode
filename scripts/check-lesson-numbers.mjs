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
// The same hazard exists one level up, in curriculum/modules/*.md. A module's id
// lives in its frontmatter, not its filename, so a renumber that refiles a module
// leaves the old file declaring the old id — and listModules() emits BOTH while
// getModule() resolves the id with .find(), i.e. whichever readdir returns first.
// That is not hypothetical: 3.2_arrays.md outlived the move of Arrays to 3.3 and
// shadowed the real 3.2, so /module/3.2 rendered the Arrays prose above the
// Parameters lessons. Checks 4 and 5 cover it.
//
// Run by `npm run prebuild` (so it cannot ship) and by `npm test`.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const modulesDir = path.join(root, 'curriculum', 'modules');

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

// --- 4/5. the module files those numbers land on
const moduleFiles = await fs.readdir(modulesDir).catch(() => []);
const modulesById = new Map();
for (const f of moduleFiles.filter((f) => f.endsWith('.md'))) {
  const src = await fs.readFile(path.join(modulesDir, f), 'utf8');
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const id = fm && fm[1].match(/^id:\s*['"]?([\d.]+)['"]?\s*$/m);
  if (!id) continue;                          // no id -> listModules() skips it too
  if (!modulesById.has(id[1])) modulesById.set(id[1], []);
  modulesById.get(id[1]).push(f);
}

// 4. two files claiming one id — one of them silently wins
for (const [id, files] of [...modulesById].sort()) {
  if (files.length > 1) {
    errors.push(`duplicate module id ${id} declared by ${files.length}: `
      + `${files.join(', ')} — getModule() picks whichever readdir returns first`);
  }
}

// 5. a lesson numbered for a module that does not exist never appears anywhere.
// Grouped by module — one missing file is one problem, not one per lesson.
const homeless = new Map();
for (const num of byNumber.keys()) {
  const mod = num.match(UNIT_NUM)[1];
  if (modulesById.has(mod)) continue;
  homeless.set(mod, (homeless.get(mod) ?? 0) + 1);
}
for (const [mod, n] of [...homeless].sort()) {
  errors.push(`module ${mod} has no file in curriculum/modules/, so its ${n} `
    + `lesson(s) appear on no module page`);
}

for (const w of warnings) console.warn(`[check-lesson-numbers] WARN  ${w}`);
for (const e of errors) console.error(`[check-lesson-numbers] ERROR ${e}`);

if (errors.length) {
  console.error(`\n[check-lesson-numbers] ${errors.length} error(s) across `
    + `${lessons.length} lessons. See the header of this file for why each matters.`);
  process.exit(1);
}
console.log(`[check-lesson-numbers] ${lessons.length} lessons, `
  + `${byNumber.size} distinct numbers, ${modulesById.size} modules, no collisions`
  + (warnings.length ? ` (${warnings.length} warning(s))` : ''));
