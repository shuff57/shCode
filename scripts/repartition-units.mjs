#!/usr/bin/env node
// Move whole modules to new unit numbers, rewriting every lesson title and every
// citation, without renaming a single lesson folder.
//
// WHY. `renumber-module.mjs` reorders lessons *inside* one module and refuses a
// folder whose title number belongs to another module. The unit repartition moves
// modules across units (5.6 -> 7.1, 7.1 -> 8.1, ...), which that script cannot do:
// the module number itself changes, and module docs and group files are named
// after it. This script does that one job.
//
// Folders are ids (lesson_state, lesson_drafts, lesson_submissions, and every
// lesson-scoped date row key them) and never move. Module-scoped rows in
// class_due_dates, class_open_dates and class_solution_releases key on scope_id,
// so they DO need migrating -- this script prints the SQL and never runs it.
//
//   node scripts/repartition-units.mjs --dry-run     # table, counts, SQL; no writes
//   node scripts/repartition-units.mjs               # apply to the working tree
//
// Plan (scripts/renumber-plans/unit-repartition.json):
//   { "moves": { "5.6": "7.1", "7.1": "8.1" }, "alsoRewrite": ["curriculum-plan.md"] }
//
// ONE PASS over every text file with the whole table, then the two-part module
// numbers in a second pass. A chain (7.1 -> 8.1 -> 9.1) therefore never re-numbers
// its own output.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const planArg = args.indexOf('--plan');
const planPath = path.resolve(root, planArg >= 0 ? args[planArg + 1]
  : 'scripts/renumber-plans/unit-repartition.json');

const lessonsDir = path.join(root, 'lessons');
const modulesDir = path.join(root, 'curriculum', 'modules');
const groupsDir = path.join(root, 'curriculum', 'groups');
const TEXT = /\.(json|md|js|mjs|cjs|ts|tsx|html|css|txt|yml)$/i;
const TITLE_NUM = /^(\d+\.\d+)\.(\d+)(?=\s)/;

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const moves = plan.moves ?? {};

const fail = (m) => { console.error(`[repartition-units] ERROR ${m}`); process.exit(1); };

// ---------------------------------------------------------------- 1. validate
for (const [from, to] of Object.entries(moves)) {
  if (!/^\d+\.\d+$/.test(from) || !/^\d+\.\d+$/.test(to)) fail(`bad module in ${from} -> ${to}`);
  if (from === to) fail(`${from} moves to itself`);
  if (moves[to] && !moves[from]) fail(`${to} is both a source and a target`);
}

// every lesson in a moved module must exist, and slot numbers are kept
const lessonMap = new Map();   // old N.N.N -> new N.N.N
const moduleMap = new Map();   // old N.N   -> new N.N
const moved = [];              // { folder, old, now }
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const lp = path.join(lessonsDir, d.name, 'lesson.json');
  if (!fs.existsSync(lp)) continue;
  const title = JSON.parse(fs.readFileSync(lp, 'utf8')).title ?? '';
  const m = TITLE_NUM.exec(title);
  if (!m) continue;
  const to = moves[m[1]];
  if (!to) continue;
  const oldNum = `${m[1]}.${m[2]}`;
  const newNum = `${to}.${m[2]}`;
  if (lessonMap.has(oldNum)) fail(`${oldNum} appears twice (${d.name})`);
  lessonMap.set(oldNum, newNum);
  moved.push({ folder: d.name, old: oldNum, now: newNum });
}

// a target must be free unless the module occupying it is itself moving away
const occupied = new Set();
for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  const lp = path.join(lessonsDir, d.name, 'lesson.json');
  if (!fs.existsSync(lp)) continue;
  const m = TITLE_NUM.exec(JSON.parse(fs.readFileSync(lp, 'utf8')).title ?? '');
  if (m) occupied.add(m[1]);
}
for (const [from, to] of Object.entries(moves)) {
  if (occupied.has(to) && !moves[to]) fail(`target ${to} is already a module`);
  moduleMap.set(from, to);
}

moved.sort((a, b) => a.old.localeCompare(b.old, undefined, { numeric: true }));
console.log(`[repartition-units] plan: ${path.relative(root, planPath)}${DRY ? '  (dry run)' : ''}`);
console.log(`\n  ${moved.length} lessons move in ${Object.keys(moves).length} modules\n`);
console.log('  old        new        folder');
for (const r of moved) console.log(`  ${r.old.padEnd(10)} -> ${r.now.padEnd(10)} ${r.folder}`);

// ------------------------------------------------------------- 2. text rewrite
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// three-part numbers first, one pass, so 7.1.2 -> 8.1.2 cannot chain
const lessonRe = new RegExp(
  `(?<![A-Za-z0-9_.\\/-])(\\d+\\.\\d+)\\.(\\d+)(?![0-9A-Za-z]|\\.\\d)`, 'g');
// then bare module numbers: 5.6 but not 5.6.3, not 5.13, not inside a folder id
const moduleRe = new RegExp(
  `(?<![A-Za-z0-9_.\\/-])(\\d+\\.\\d+)(?![0-9A-Za-z]|\\.\\d|-)`, 'g');

const rewritten = [];
let totalHits = 0;

// Two modes, because a bare N.N is ambiguous outside lessons/:
//   lesson -- inside a lesson everything numbered N.N is ours (unit field, prose,
//             "the 5.10 reference"), so every bare module number moves.
//   doc    -- inside our docs a bare N.N may be a book section, a table row's
//             lesson position, or an assignment code, so only explicit module
//             forms move: id, moduleId, "Module N.N", "module N.N", and §N.N that
//             is not "book §N.N".
const DOC_FORMS = [
  /("id"\s*:\s*")(\d+\.\d+)(")/g,
  /^(id:\s*"?)(\d+\.\d+)("?)\s*$/gm,
  /("moduleId"\s*:\s*")(\d+\.\d+)(")/g,
  /\b(Module\s+)(\d+\.\d+)\b/g,
  /\b(module\s+)(\d+\.\d+)\b/g,
];
const SECTION_RE = /(?<!book\s)(§)(\d+\.\d+)(?![\d.]|-)/g;

// The module number is always the SECOND capture group; rebuild the match from
// the groups and drop the trailing (offset, input) the replacer receives.
const withModule = (m) => {
  const to = moduleMap.get(m[2]);
  if (!to) return m[0];
  const groups = m.slice(1, m.length - 2);
  groups[1] = to;
  return groups.join('');
};

function rewriteText(text, mode) {
  let hits = 0;
  let out = text.replace(lessonRe, (whole, mod, slot) => {
    const to = moduleMap.get(mod);
    if (!to) return whole;
    hits++;
    return `${to}.${slot}`;
  });
  if (mode === 'lesson') {
    out = out.replace(moduleRe, (whole, mod) => {
      const to = moduleMap.get(mod);
      if (!to) return whole;
      hits++;
      return to;
    });
  } else {
    for (const re of DOC_FORMS) {
      out = out.replace(re, (...m) => {
        const r = withModule(m);
        if (r !== m[0]) hits++;
        return r;
      });
    }
    out = out.replace(SECTION_RE, (...m) => {
      const r = withModule(m);
      if (r !== m[0]) hits++;
      return r;
    });
  }
  return { out, hits };
}

function processFile(abs, mode) {
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { return; }
  const { out, hits } = rewriteText(text, mode);
  if (!hits) return;
  totalHits += hits;
  rewritten.push({ rel: path.relative(root, abs), count: hits });
  if (!DRY) fs.writeFileSync(abs, out);
}

function walk(dir, mode) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, mode);
    else if (TEXT.test(e.name) && fs.statSync(p).size < 4e6) processFile(p, mode);
  }
}

for (const d of fs.readdirSync(lessonsDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith('_')) continue;
  walk(path.join(lessonsDir, d.name), 'lesson');
}
walk(modulesDir, 'doc');
walk(groupsDir, 'doc');

// ------------------------------------------------- 3. rename docs and groups
const renames = [];
for (const [from, to] of Object.entries(moves)) {
  for (const dir of [modulesDir, groupsDir]) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith(`${from}_`) && f !== `${from}.json`) continue;
      const nf = f.replace(new RegExp(`^${escape(from)}`), to);
      renames.push({ from: path.join(dir, f), to: path.join(dir, nf) });
    }
  }
}
for (const r of renames) {
  if (fs.existsSync(r.to)) fail(`${path.relative(root, r.to)} already exists`);
  console.log(`  rename ${path.relative(root, r.from)} -> ${path.relative(root, r.to)}`);
  if (!DRY) fs.renameSync(r.from, r.to);
}

console.log(`\n  ${totalHits} citation(s) in ${rewritten.length} file(s) ${DRY ? 'would change' : 'changed'}`);
if (DRY) {
  for (const r of rewritten.sort((a, b) => b.count - a.count).slice(0, 12)) {
    console.log(`    ${String(r.count).padStart(4)}  ${r.rel}`);
  }
}

// ------------------------------------------------------------------ 4. D1 SQL
const scopeIds = [...Object.entries(moves)].map(([f, t]) => `('${f}', '${t}')`).join(', ');
console.log(`\n  D1 (module-scoped rows; run only after the code is merged):
  SELECT scope, scope_id, COUNT(*) FROM class_due_dates WHERE scope_id IN (${Object.keys(moves).map((m) => `'${m}'`).join(', ')}) GROUP BY 1, 2;
  SELECT scope, scope_id, COUNT(*) FROM class_open_dates WHERE scope_id IN (${Object.keys(moves).map((m) => `'${m}'`).join(', ')}) GROUP BY 1, 2;
  SELECT scope, scope_id, COUNT(*) FROM class_solution_releases WHERE scope_id IN (${Object.keys(moves).map((m) => `'${m}'`).join(', ')}) GROUP BY 1, 2;
  -- then, per table and only where no row already exists for the target:
  --   UPDATE <table> SET scope_id = <new> WHERE scope_id = <old>;
  -- pairs: ${scopeIds}
`);
