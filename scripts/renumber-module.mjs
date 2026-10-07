#!/usr/bin/env node
// Renumber the lesson TITLES of one or more modules to a new order, and rewrite
// every citation of a changed number, without renaming a single lesson folder.
//
// WHY. A module page orders its lessons by the number at the start of each
// lesson.json `title`, not by folder name, and the folder name IS the lesson id
// that keys lesson_state, lesson_drafts, lesson_submissions and the due-date,
// open-date and solution-release tables (CLAUDE.md, "D1 schema"). So inserting
// a lesson mid-module means every later TITLE moves, every sentence in the
// course that says "see 3.2.9" must move with it, and the folders must stay put
// (sub-module-spec-conventions.md 4.1: letter-suffix inserts are retired,
// renumber titles sequentially). Doing that by hand is how 140 citations once
// rotted (see check-lesson-citations.mjs). This script does it from one
// explicit table.
//
// THE PLAN is a JSON file (default scripts/renumber-plans/3.2-3.3-practice-drills.json):
//
//   { "modules": { "3.2": [ { "folder": "3-2-1-slides-parameters-return" },
//                            { "folder": "3-2-drill-shout", "new": true,
//                              "type": "lab", "notes": "..." }, ... ] },
//     "alsoRewrite": [ "curriculum-plan.md", "scripts/test-runtime-labs.mjs", ... ] }
//
// A module's list is its FINAL order, slot 1 first. An entry without `new` is an
// existing lesson: its CURRENT title number is the OLD number, its position here
// is the NEW one. An entry with `"new": true` is a lesson you wrote already
// numbered for the final order: its title prefix is set from its position, and
// its own text is left alone (its citations are already in the new numbering).
//
// WHAT IT DOES, in order:
//   1. builds the old -> new table from the plan and prints it;
//   2. rewrites every lesson-citation of a changed number in every text file
//      under lessons/ (except new lessons and lessons/_retired), which also
//      renumbers each existing lesson's own `title`, quiz `source`, "Help: 3.2.9"
//      pointers, "(reread 3.2.20)" explanations, and the "// 3.2.12 ..." header
//      comment of a starter;
//   3. does the same for the files named in the plan's `alsoRewrite` globs;
//   4. rebuilds each module doc's Numbered Lesson List table (slot, title, slug;
//      Type and Notes are kept for existing rows, taken from the plan for new
//      ones) and its `lessonSlots` front matter.
// It does NOT touch generated files (public/lessons-manifest.json,
// functions/_shared/*.generated.ts): run the generators afterwards.
//
// A CITATION is a bare N.N.N for a number in the table, not preceded by a letter
// or digit (so `A3.3.1`, an assignment code, is skipped), not followed by a
// digit, and not introduced by a label (Definition 3.2.1, Figure, Table,
// Example, Section ...). Replacement is ONE pass over the text with the whole
// table, so 3.2.9 -> 3.2.11 and 3.2.11 -> 3.2.14 never chain.
//
// IDEMPOTENT: titles are read from disk, so a second run finds old == new,
// prints "nothing to do" and writes nothing.
//
//   node scripts/renumber-module.mjs --dry-run            # table + every rewrite, no writes
//   node scripts/renumber-module.mjs                      # apply
//   node scripts/renumber-module.mjs --plan other.json    # another plan
//   node scripts/renumber-module.mjs --dry-run --verbose  # also list each replaced line
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const planArg = args.indexOf('--plan');
const planPath = path.resolve(root, planArg >= 0 ? args[planArg + 1]
  : 'scripts/renumber-plans/3.2-3.3-practice-drills.json');

const lessonsDir = path.join(root, 'lessons');
const modulesDir = path.join(root, 'curriculum', 'modules');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const TEXT = /\.(json|md|js|mjs|cjs|ts|tsx|html|css|txt|py|yml)$/i;
const TITLE_NUM = /^(\d+\.\d+\.\d+)(?=\s)/;

const fail = (msg) => { console.error(`[renumber-module] ERROR ${msg}`); process.exit(1); };

// ------------------------------------------------------------------ 1. table
const readTitle = (folder) => {
  const p = path.join(lessonsDir, folder, 'lesson.json');
  if (!fs.existsSync(p)) fail(`plan names ${folder}, which has no lesson.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8')).title ?? '';
};

const mapping = new Map();        // old number -> new number (changed ones only)
const newFolders = new Set();     // folders whose text must not be rewritten
const finalNumber = new Map();    // folder -> final number
const rows = [];                  // for the printed table
const seenFolders = new Set();

for (const [mod, list] of Object.entries(plan.modules)) {
  list.forEach((entry, i) => {
    const folder = entry.folder;
    if (seenFolders.has(folder)) fail(`${folder} appears twice in the plan`);
    seenFolders.add(folder);
    const num = `${mod}.${i + 1}`;
    finalNumber.set(folder, num);
    const title = readTitle(folder);
    const m = TITLE_NUM.exec(title);
    if (entry.new) {
      newFolders.add(folder);
      rows.push({ folder, old: '(new)', now: num });
      return;
    }
    if (!m) fail(`${folder}: title ${JSON.stringify(title)} has no N.N.N prefix`);
    const oldNum = m[1];
    if (!oldNum.startsWith(`${mod}.`)) {
      fail(`${folder}: title number ${oldNum} is not in module ${mod}, but the plan puts it there`);
    }
    rows.push({ folder, old: oldNum, now: num });
    if (oldNum !== num) {
      if (mapping.has(oldNum)) fail(`two lessons both currently numbered ${oldNum}`);
      mapping.set(oldNum, num);
    }
  });
}

// Every lesson currently numbered inside a planned module must be in the plan,
// or it would keep a stale number and collide.
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const lp = path.join(lessonsDir, d.name, 'lesson.json');
  if (!fs.existsSync(lp)) continue;
  const m = TITLE_NUM.exec(JSON.parse(fs.readFileSync(lp, 'utf8')).title ?? '');
  if (!m) continue;
  for (const mod of Object.keys(plan.modules)) {
    if (m[1].startsWith(`${mod}.`) && !seenFolders.has(d.name)) {
      fail(`${d.name} is numbered ${m[1]} but is not in the plan for module ${mod}`);
    }
  }
}

// An old number that is itself the target of another entry is fine (one pass),
// but two lessons must never end on the same number.
const targets = new Map();
for (const [folder, n] of finalNumber) {
  if (targets.has(n)) fail(`${n} is assigned to both ${targets.get(n)} and ${folder}`);
  targets.set(n, folder);
}

console.log(`[renumber-module] plan: ${path.relative(root, planPath)}${DRY ? '  (dry run)' : ''}`);
console.log('\nold -> new lesson numbers (titles only; folders never move)\n');
console.log('  old       new       folder');
for (const r of rows) {
  const flag = r.old === '(new)' ? 'NEW ' : r.old === r.now ? '    ' : '->  ';
  console.log(`  ${r.old.padEnd(9)} ${flag}${r.now.padEnd(9)} ${r.folder}`);
}
console.log(`\n  ${mapping.size} existing number(s) change; `
  + `${rows.filter((r) => r.old !== '(new)' && r.old === r.now).length} unchanged; `
  + `${newFolders.size} new lesson(s)\n`);

// ------------------------------------------------------ 2/3. citation rewrite
const LABELLED = /(?:definition|figure|fig\.?|table|example|section|appendix|version|v)\s*$/i;
const CITE = /(?<![A-Za-z0-9_.\/-])(\d+\.\d+\.\d+)(?![0-9A-Za-z]|\.\d)/g;

function rewrite(text) {
  const hits = [];
  const out = text.replace(CITE, (whole, num, offset) => {
    const to = mapping.get(num);
    if (to === undefined) return whole;
    if (LABELLED.test(text.slice(Math.max(0, offset - 14), offset))) return whole;
    hits.push({ offset, from: num, to });
    return to;
  });
  return { out, hits };
}

const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;

const touched = [];   // { rel, count }
let totalHits = 0;
function processFile(abs) {
  const rel = path.relative(root, abs);
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { return; }
  const { out, hits } = rewrite(text);
  if (!hits.length) return;
  touched.push({ rel, count: hits.length });
  totalHits += hits.length;
  if (VERBOSE) {
    for (const h of hits) {
      const line = text.split('\n')[lineOf(text, h.offset) - 1].trim().slice(0, 110);
      console.log(`    ${rel}:${lineOf(text, h.offset)}  ${h.from} -> ${h.to}   ${line}`);
    }
  }
  if (!DRY) fs.writeFileSync(abs, out);
}

function walk(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else if (TEXT.test(e.name) && fs.statSync(p).size < 4e6) fn(p);
  }
}

if (mapping.size) {
  for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('_') || newFolders.has(d.name)) continue;
    walk(path.join(lessonsDir, d.name), processFile);
  }
  const globToRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
  const extra = (plan.alsoRewrite ?? []).map(globToRe);
  const candidates = [];
  const scanDirs = new Set((plan.alsoRewrite ?? []).map((g) => g.split('/').slice(0, -1).join('/') || '.'));
  for (const dir of scanDirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (e.isFile()) candidates.push(path.join(dir, e.name));
    }
  }
  const skipModuleDocs = new Set(Object.keys(plan.modules));
  for (const rel of candidates) {
    if (!extra.some((re) => re.test(rel))) continue;
    // The module docs of the renumbered modules get their table rebuilt below
    // and their prose edited by hand ("was titled 3.2.1" is history, not a citation).
    const mm = /^curriculum\/modules\/(\d+\.\d+)_/.exec(rel);
    if (mm && skipModuleDocs.has(mm[1])) continue;
    processFile(path.join(root, rel));
  }
}

console.log(`[renumber-module] citation rewrite: ${totalHits} replacement(s) in ${touched.length} file(s)`);
const byArea = {};
for (const t of touched) {
  const area = t.rel.startsWith('lessons/') ? 'lessons/' + (/^lessons\/(3-[23]-|3-1-(3|4|8|9)-)/.test(t.rel) ? '(3.2/3.3 modules)' : '(other modules)')
    : t.rel.split('/').slice(0, 2).join('/');
  byArea[area] = (byArea[area] ?? 0) + 1;
}
for (const [a, n] of Object.entries(byArea).sort()) console.log(`    ${String(n).padStart(4)} file(s)  ${a}`);
const outside = touched.filter((t) => t.rel.startsWith('lessons/') && !/^lessons\/(3-[23]-|3-1-(3|4|8|9)-)/.test(t.rel));
if (outside.length) {
  console.log('  lessons OUTSIDE modules 3.2 / 3.3 that cite a renumbered lesson:');
  for (const t of outside) console.log(`    ${t.rel}  (${t.count})`);
}

// ----------------------------------------------- titles of existing lessons
// The rewrite above already moved each title; verify it landed on the plan.
if (!DRY) {
  for (const [folder, num] of finalNumber) {
    const p = path.join(lessonsDir, folder, 'lesson.json');
    const raw = fs.readFileSync(p, 'utf8');
    const title = JSON.parse(raw).title;
    const m = TITLE_NUM.exec(title);
    if (m && m[1] === num) continue;
    if (!newFolders.has(folder)) fail(`${folder}: title is ${JSON.stringify(title)} after rewrite, wanted prefix ${num}`);
    // A new lesson: set the prefix from its position (text edit, formatting kept).
    if (!m) fail(`${folder}: new lesson's title has no N.N.N prefix to set`);
    const fixed = raw.replace(/("title"\s*:\s*")\d+\.\d+\.\d+/, `$1${num}`);
    fs.writeFileSync(p, fixed);
    console.log(`  set ${folder} title prefix ${m[1]} -> ${num}`);
  }
}

// -------------------------------------------------------- 4. module docs
function moduleDocPath(mod) {
  const f = fs.readdirSync(modulesDir).find((n) => n.startsWith(`${mod}_`) && n.endsWith('.md'));
  if (!f) fail(`no curriculum/modules/${mod}_*.md`);
  return path.join(modulesDir, f);
}

const ROW = /^\|\s*([\d.]+)\s*\|\s*([^|]*?)\s*\|\s*(.*?)\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*$/;
for (const [mod, list] of Object.entries(plan.modules)) {
  const p = moduleDocPath(mod);
  const src = fs.readFileSync(p, 'utf8');
  const lines = src.split('\n');
  const head = lines.findIndex((l) => /^\|\s*Slot\s*\|\s*Type\s*\|\s*Title\s*\|\s*Slug\s*\|\s*Notes\s*\|/.test(l));
  if (head < 0) fail(`${path.basename(p)}: no Numbered Lesson List table`);
  let end = head + 2;
  while (end < lines.length && ROW.test(lines[end])) end++;
  const old = new Map();
  for (let i = head + 2; i < end; i++) {
    const m = ROW.exec(lines[i]);
    old.set(m[4], { type: m[2], notes: m[5] });
  }
  const table = list.map((entry, i) => {
    const slot = `${mod}.${i + 1}`;
    const keep = old.get(entry.folder);
    // An existing row (or a new one already added to the doc) keeps what the doc says.
    const type = keep?.type ?? entry.type ?? 'lesson';
    const notes = keep?.notes ?? entry.notes ?? '';
    const t = readTitle(entry.folder);
    // In a dry run the title on disk is still the old one; show the slot anyway.
    const title = DRY ? t.replace(TITLE_NUM, slot) : t;
    if (!entry.new && !keep) fail(`${path.basename(p)}: no existing row for ${entry.folder}`);
    return `| ${slot} | ${type} | ${title} | \`${entry.folder}\` | ${notes} |`;
  });
  const next = [...lines.slice(0, head + 2), ...table, ...lines.slice(end)].join('\n')
    .replace(/^(lessonSlots:\s*")[^"]*(")/m, `$1${mod}.1–${mod}.${list.length}$2`);
  console.log(`[renumber-module] ${path.basename(p)}: table rebuilt (${old.size} -> ${list.length} rows), `
    + `lessonSlots ${mod}.1–${mod}.${list.length}${next === src ? '  (no change)' : ''}`);
  if (!DRY && next !== src) fs.writeFileSync(p, next);
}

if (!mapping.size && !touched.length) console.log('[renumber-module] nothing to do');
console.log(DRY ? '[renumber-module] dry run: nothing written' : '[renumber-module] done. Now run the generators (see header).');
