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
// — TITLE only at first, because lesson ids key student progress in D1 and a
// bare folder rename orphans it. Migrations 0011 and 0013 have since moved the
// D1 ids onto the title numbering and the folders were renamed to match, so
// `1-2-31-unit-quiz` now agrees with its title `1.2.31`. Do not read that as
// permission to renumber freely: a title renumber still has to ship with a
// migration, or every completion on the lessons it passes goes dead. Anyone
// "tidying" a number without one lands a lesson on top of another. This check
// turns the collision into a failed build; it cannot see the orphaning.
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
  lessons.push({
    folder: e.name,
    title: String(meta.title ?? ''),
    unit: meta.unit ?? null,
    category: meta.category ?? null,
    graders: [meta.aiGrader, meta.diagram?.aiGrader].filter(Boolean),
    quiz: meta.quiz ?? null,
  });
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

// --- 3b. one category per chapter.
//
// `category` is not decoration: HeaderLessonNav builds prev/next out of
// `lessons.filter(l => l.category === current.category)`. A lesson whose
// category string drifts gets its neighbours from the drifted set instead of
// its own chapter. Seven "Chart the Code" lessons carried "Unit 2: moSHion Game
// Development" against everyone else's "Unit 2: moSHion: Applied Game
// Development", so their Next button jumped between units -- 6.6.21 to 6.7.11
// to 6.8.12 -- and moshion-bounce, alone under "Unit 5: moSHion: Game Physics",
// had no prev or next at all. Nothing rendered an error; the arrows just went
// somewhere else.
const catsByChapter = new Map();
for (const l of lessons) {
  const m = l.title && l.title.match(NUMBERED);
  if (!m || !l.category) continue;
  const ch = m[1].split('.')[0];
  if (!catsByChapter.has(ch)) catsByChapter.set(ch, new Map());
  const seen = catsByChapter.get(ch);
  if (!seen.has(l.category)) seen.set(l.category, []);
  seen.get(l.category).push(l.folder);
}
for (const [ch, seen] of [...catsByChapter].sort()) {
  if (seen.size < 2) continue;
  const ranked = [...seen].sort((a, b) => b[1].length - a[1].length);
  const [main] = ranked;
  for (const [cat, folders] of ranked.slice(1)) {
    errors.push(`chapter ${ch} has ${seen.size} category strings — `
      + `${folders.length} lesson(s) use ${JSON.stringify(cat)} while `
      + `${main[1].length} use ${JSON.stringify(main[0])}, so prev/next skips `
      + `between them: ${folders.slice(0, 4).join(', ')}`
      + (folders.length > 4 ? ` (+${folders.length - 4} more)` : ''));
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

// --- 3c. assignments/<moduleId>_*.md must name a module that exists.
//
// getModule() surfaces these to teachers as "Legacy module-level markdown
// files" by matching `${moduleId}_`. Module ids went from three-part to
// two-part at the renumber and these filenames did not, so the prefix matched
// zero files -- for as long as both had existed. Nothing errored: the <details>
// block is hidden when the list is empty, so a silent zero looks identical to
// "this module has no packets".
//
// A-prefixed handouts (A10.1_sprite-playground.md) are a different scheme and
// were never collected by this path; they are ignored here rather than flagged.
const assignDir = path.join(root, 'assignments');
let attached = 0;
for (const f of await fs.readdir(assignDir).catch(() => [])) {
  if (!f.endsWith('.md')) continue;
  const m = /^([\d.]+)_/.exec(f);
  if (!m) continue;                          // A*, or anything not module-numbered
  if (modulesById.has(m[1])) { attached++; continue; }
  errors.push(`assignments/${f} is named for module ${m[1]}, which no module `
    + 'declares, so it is attached to nothing and renders nowhere');
}
// ...and if NONE attach, the check above is vacuous: every file could be
// misnamed in the same way and each one would look like an ignorable A-file.
if (attached === 0) {
  errors.push('no file in assignments/ attaches to any module — either the '
    + 'directory is empty of module packets or the id shape has drifted again');
}

// The packets cross-link each other by bare filename, so renaming one to fix
// its module attachment breaks every link pointing at it. Renaming the nine
// broke thirty such links in one go.
const assignFiles = new Set(await fs.readdir(assignDir).catch(() => []));
let linkChecked = 0;
for (const f of assignFiles) {
  if (!f.endsWith('.md')) continue;
  const src = await fs.readFile(path.join(assignDir, f), 'utf8');
  for (const m of src.matchAll(/\]\(([^)#\s]+\.(?:md|js))\)/g)) {
    linkChecked++;
    if (assignFiles.has(m[1])) continue;
    errors.push(`assignments/${f} links ${m[1]}, which is not in assignments/`);
  }
}
if (linkChecked === 0) {
  errors.push('no sibling links found in assignments/ — the link check above '
    + 'proved nothing; confirm the packets still cross-link before trusting it');
}

// 6. a lesson page breadcrumb links to /module/<first token of the unit field>
// (ContentLessonView). A static export has no page for an id no module declares,
// so that link 404s. All 23 lessons of module 1.1 shipped filed under the unit
// "1 Foundations", whose breadcrumb pointed at /module/1 — a page that has never
// existed. Check 3 misses this: its UNIT_NUM wants d+.d+ and skips a bare "1".
const strayUnits = new Map();
for (const l of lessons) {
  if (!l.unit) continue;
  const id = String(l.unit).split(" ")[0];
  if (modulesById.has(id)) continue;
  strayUnits.set(String(l.unit), (strayUnits.get(String(l.unit)) ?? 0) + 1);
}
for (const [unit, n] of [...strayUnits].sort()) {
  errors.push(`unit ${JSON.stringify(unit)} on ${n} lesson(s) leads with an id no `
    + `module declares, so their breadcrumb links to /module/${unit.split(" ")[0]} — a 404`);
}

// 7. every aiGrader rubric item needs a numeric `points`. An item authored
// without one makes lib/grade-written-core.ts's totalPossible NaN, and
// components/WrittenGrader.tsx decides pass/fail as:
//
//     if (r.totalPossible === 0) { ...count met/partial verdicts... }
//     return r.totalEarned / r.totalPossible >= 0.7;
//
// NaN === 0 is false, so the pass/fail branch that every green-to-advance
// lesson relies on is skipped, and NaN >= 0.7 is false as well. The student
// writes the essay, gets graded, and is told "needs revision" no matter what
// they wrote — then green-to-advance walls them there permanently. It is
// invisible in review: the rubric item reads perfectly, it is just missing
// one key. 1.1.22 shipped that way.
for (const l of lessons) {
  for (const g of l.graders ?? []) {
    if (!Array.isArray(g.rubric) || g.rubric.length === 0) {
      errors.push(`${l.folder} has an aiGrader with no rubric array, so nothing can be graded`);
      continue;
    }
    for (const r of g.rubric) {
      if (typeof r.points !== 'number' || !Number.isFinite(r.points)) {
        errors.push(`${l.folder} rubric item ${JSON.stringify(r.id)} has no numeric `
          + `points (got ${JSON.stringify(r.points)}) — totalPossible goes NaN and the `
          + `lesson can never be passed`);
      }
    }
  }
}

// --- every quiz `source` must still point at the lesson it was pinned to
//
// QuizView resolves `source` LIVE by lesson number, and it is a plain prose
// string ("2.1.28 and 2.1.18") -- not backtick-quoted, so a sweep for cited
// lesson TITLES never sees it. Unit 2.1 was renumbered, three questions kept
// their old numbers, and a student who missed one and clicked "review" landed
// on an unrelated lesson.
//
// Checking only that the number EXISTS is useless here, and this check
// originally did exactly that: every stale number still named a real lesson,
// just the wrong one. Replaying the real defect against it passed clean.
//
// So each question also carries `sourceIds`, the FOLDER IDS those numbers
// resolved to when pinned. Ids never move; numbers move on every insert or
// reorder. If they stop agreeing, the citation drifted.
//
// What this proves: the number and the pinned lesson still agree. What it does
// NOT prove: that the pinned lesson was the right one to cite. Pinning froze
// whatever was true at the time.
const numberOf = new Map();
for (const l of lessons) {
  const m = /^(\d+\.\d+\.\d+)\s/.exec(l.title);
  if (m) numberOf.set(l.folder, m[1]);
}
for (const l of lessons) {
  const questions = l.quiz?.questions;
  if (!Array.isArray(questions)) continue;
  questions.forEach((q, i) => {
    if (!q.source) return;
    const cited = String(q.source).match(/\d+\.\d+\.\d+/g) ?? [];
    const ids = q.sourceIds;
    if (!Array.isArray(ids) || ids.length !== cited.length) {
      errors.push(`${l.folder} quiz question ${i + 1} has ${cited.length} number(s) `
        + `in \`source\` but ${Array.isArray(ids) ? ids.length : 'no'} \`sourceIds\`. `
        + `Run scripts/pin-quiz-sources.mjs to re-pin.`);
      return;
    }
    cited.forEach((n, k) => {
      const now = numberOf.get(ids[k]);
      if (now === undefined) {
        errors.push(`${l.folder} quiz question ${i + 1} pins ${ids[k]}, which no longer exists.`);
      } else if (now !== n) {
        errors.push(`${l.folder} quiz question ${i + 1} cites ${n}, but ${ids[k]} `
          + `is now ${now}. The review link points at the wrong lesson -- renumbering `
          + `must rewrite \`source\`, and nothing else does.`);
      }
    });
  });
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
