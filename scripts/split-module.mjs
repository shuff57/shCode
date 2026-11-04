#!/usr/bin/env node
// Split one module into several day-modules: re-home its lessons, renumber
// their titles, rewrite every citation, and write a one-page module doc plus a
// group file per new module.
//
// Why. `renumber-module.mjs` reorders inside one module; `repartition-units.mjs`
// moves whole modules. A game becoming a chain of day-modules needs the third
// operation: one module's lessons distributed across new module numbers. Folders
// are ids and never move, so progress, drafts, submissions and lesson-scoped
// date rows are untouched.
//
//   node scripts/split-module.mjs --plan scripts/split-plans/unit-5.json --dry-run
//   node scripts/split-module.mjs --plan scripts/split-plans/unit-5.json
//
// Plan shape (one entry per NEW module, in display order):
//   { "modules": [
//       { "id": "5.3", "from": "5.3", "slug": "pinball-the-table",
//         "title": "Pinball: the table", "group": "The table",
//         "objective": "…", "lessons": ["5-3-pinball-plan-sketch-the-game", …] },
//       … ] }
//
// `from` names the module whose doc is appended to the first new module built
// from it, so no authored prose is lost.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessonsDir = path.join(root, 'lessons');
const modulesDir = path.join(root, 'curriculum', 'modules');
const groupsDir = path.join(root, 'curriculum', 'groups');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const planArg = args.indexOf('--plan');
if (planArg < 0) {
  console.error('[split-module] ERROR --plan <file> is required');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(path.resolve(root, args[planArg + 1]), 'utf8'));

// The doc of each module being split, captured before any write: a new module may
// reuse the old number (5.5 -> 5.5), so scanning later would pick up the new file.
const sourceDocs = new Map();
for (const mod of plan.modules) {
  if (!mod.from || sourceDocs.has(mod.from)) continue;
  const hit = fs.readdirSync(modulesDir).find((x) => x.startsWith(`${mod.from}_`) && x.endsWith('.md'));
  if (hit) sourceDocs.set(mod.from, hit);
}
const fail = (m) => { console.error(`[split-module] ERROR ${m}`); process.exit(1); };

const TITLE_NUM = /^(\d+\.\d+)\.(\d+)(?=\s)/;
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---------------------------------------------------------------- 1. lessons
const lessons = new Map(); // folder -> { json, num, module }
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const lj = path.join(lessonsDir, d.name, 'lesson.json');
  if (!fs.existsSync(lj)) continue;
  const json = readJson(lj);
  const m = TITLE_NUM.exec(json.title ?? '');
  if (!m) continue;
  lessons.set(d.name, { json, num: `${m[1]}.${m[2]}`, module: m[1] });
}

// ---------------------------------------------------------- 2. plan validation
const assigned = new Map();  // folder -> new number
const newModules = [];
const seenIds = new Set();
const docSources = new Map();

for (const mod of plan.modules) {
  if (!/^\d+\.\d+$/.test(mod.id)) fail(`bad module id ${mod.id}`);
  if (seenIds.has(mod.id)) fail(`module ${mod.id} appears twice`);
  seenIds.add(mod.id);
  if (!mod.lessons?.length) fail(`${mod.id}: no lessons`);
  mod.lessons.forEach((folder, i) => {
    const lesson = lessons.get(folder);
    if (!lesson) fail(`${mod.id}: no lesson folder ${folder}`);
    if (assigned.has(folder)) fail(`${folder} assigned twice`);
    assigned.set(folder, `${mod.id}.${i + 1}`);
  });
  newModules.push(mod);
}

// every lesson of a module named in `from` must be assigned
const froms = new Set(newModules.map((m) => m.from));
for (const [folder, lesson] of lessons) {
  if (froms.has(lesson.module) && !assigned.has(folder)) {
    fail(`${folder} is in module ${lesson.module} but is not in the plan`);
  }
}
// a target may not already host lessons unless it is also a source
const targetModules = new Set(newModules.map((m) => m.id));
for (const [folder, lesson] of lessons) {
  if (targetModules.has(lesson.module) && !assigned.has(folder) && !froms.has(lesson.module)) {
    fail(`module ${lesson.module} already has ${folder}, which the plan does not assign`);
  }
}

const lessonMap = new Map(); // old N.N.N -> new N.N.N
for (const [folder, num] of assigned) lessonMap.set(lessons.get(folder).num, num);

// --------------------------------------------------------------- 3. print map
console.log(`[split-module] ${newModules.length} new modules, ${assigned.size} lessons${DRY ? ' (dry run)' : ''}\n`);
for (const mod of newModules) {
  console.log(`  ${mod.id}  ${mod.title}  (${mod.lessons.length})`);
  mod.lessons.forEach((f, i) => {
    const l = lessons.get(f);
    console.log(`      ${l.num.padEnd(8)} -> ${(mod.id + '.' + (i + 1)).padEnd(8)} ${l.json.title.replace(/^\S+\s*/, '')}`);
  });
}

// --------------------------------------------------------- 4. rewrite the text
// Same discipline as repartition-units: one pass with the whole table, then the
// module numbers only where docs mean ours.
const lessonRe = /(?<![A-Za-z0-9_./-])(\d+\.\d+)\.(\d+)(?![0-9A-Za-z]|\.\d)/g;
const rewrite = (text) => ({
  out: text.replace(lessonRe, (whole, mod, slot) => {
    const to = lessonMap.get(`${mod}.${slot}`);
    return to ?? whole;
  }),
});
const touched = [];
function processFile(abs) {
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { return; }
  const { out } = rewrite(text);
  if (out === text) return;
  touched.push(path.relative(root, abs));
  if (!DRY) fs.writeFileSync(abs, out);
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(json|md|js|mjs|ts|tsx|html|css|txt)$/i.test(e.name) && fs.statSync(p).size < 4e6) processFile(p);
  }
}
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  walk(path.join(lessonsDir, d.name));
}
walk(modulesDir);

// ------------------------------------------- 3b. titles and the `unit` field
// The breadcrumb and the module list read `unit`; a lesson whose title moved to
// another module must say so or check-lesson-numbers fails it as a 404 link.
if (!DRY) {
  for (const mod of newModules) {
    mod.lessons.forEach((folder, i) => {
      const lesson = lessons.get(folder);
      const lj = path.join(lessonsDir, folder, 'lesson.json');
      const json = readJson(lj);
      const rest = String(json.title ?? '').replace(/^\S+\s*/, '');
      json.title = `${mod.id}.${i + 1} ${rest}`;
      json.unit = `${mod.id} ${mod.title}`;
      fs.writeFileSync(lj, JSON.stringify(json, null, 2) + '\n');
    });
  }
}


// -------------------------------------------------------- 5. docs and groups
const firstFromSource = new Set();
function docText(mod, screens) {
  const old = plan.modules.find((m) => m.from === mod.from && !firstFromSource.has(m.from) && m === mod);
  const from = mod.from;
  let appended = '';
  if (old && sourceDocs.has(from)) {
    const raw = fs.readFileSync(path.join(modulesDir, sourceDocs.get(from)), 'utf8');
    const body = raw.replace(/^---[\s\S]*?\n---\n/, '').trim();
    appended = `\n\n---\n\n## Notes from the module this was split out of (old ${from})\n\n` +
      `> Everything below describes the old ${from}. Screens were renumbered; folders did not move.\n\n` +
      body + '\n';
    firstFromSource.add(from);
  }
  const table = screens.map((s, i) => `| ${mod.id}.${i + 1} | \`${s}\` |`).join('\n');
  return `---
id: "${mod.id}"
title: "${mod.title}"
quarter: 2
weeks: []
environment: moSHion
status: draft
---

# Module ${mod.id}: ${mod.title}

**One day.** A chain module of a game: it teaches one element, ends with something that
runs, and the next module in the chain starts from this one's finished game
(\`CARRY-FORWARD-SPEC.md\`).

## The one idea

${mod.idea ?? 'TODO: the single idea this day teaches.'}

## Screens

| # | Folder |
| --- | --- |
${table}

## Carries forward

${mod.carriesFrom ? `The student's work from **${mod.carriesFrom}**.` : 'Nothing: this opens the chain.'}
${appended}`;
}

// Capture the docs being folded away BEFORE writing new ones, or the new files
// (which share the module prefix) are deleted by the cleanup below.
const oldDocs = [...sourceDocs.values()];

for (const mod of newModules) {
  const docPath = path.join(modulesDir, `${mod.id}_${mod.slug}.md`);
  const groupPath = path.join(groupsDir, `${mod.id}.json`);
  // Overwriting is expected only where the id is one of the modules being split:
  // its old group file is replaced, and its old doc is folded away below.
  if (!froms.has(mod.id)) {
    if (fs.existsSync(docPath) || fs.existsSync(groupPath)) {
      fail(`${path.relative(root, docPath)} or its group file already exists`);
    }
  }
  const screens = mod.lessons;
  if (!DRY) {
    fs.writeFileSync(docPath, docText(mod, screens));
    fs.writeFileSync(groupPath, JSON.stringify({
      moduleId: mod.id,
      source: 'Split from the module it belonged to; one lesson per day-module.',
      lessons: [{
        id: mod.slug,
        title: mod.group ?? mod.title,
        objective: mod.objective ?? `Students can ${(mod.group ?? mod.title).toLowerCase()} and see it run.`,
        screens,
      }],
    }, null, 2) + '\n');
  }
}

// Fold the old docs away: their bodies were appended to the first new module.
if (oldDocs.length) {
  console.log(`\n  old docs ${DRY ? 'to be removed' : 'removed'} (their notes were appended to the first new module):`);
  for (const d of [...new Set(oldDocs)]) {
    console.log(`      curriculum/modules/${d}`);
    if (!DRY) fs.unlinkSync(path.join(modulesDir, d));
  }
}

console.log(`\n  ${touched.length} file(s) ${DRY ? 'would change' : 'changed'}; ${newModules.length} docs and groups ${DRY ? 'would be written' : 'written'}`);
if (DRY) console.log('  dry run: nothing written.');
