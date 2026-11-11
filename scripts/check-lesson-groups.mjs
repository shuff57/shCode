// Validates curriculum/groups/*.json — the lesson layer between a module and
// its screens.
//
// The failure this exists for: a screen added to a module that already has a
// group file silently belongs to no lesson, so it renders above the list of
// headings or below the last one with nothing saying where it sits. The module
// page would still build. validateGroups() in lib/lesson-groups.ts is the same
// function the module page calls at render time, so this check and the page
// cannot disagree about what a valid group file is.
//
// Run by `npm run prebuild` and by `npm test`.
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadModuleGroups, validateGroups } from '../lib/lesson-groups.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const groupsDir = path.join(root, 'curriculum', 'groups');
const lessonsDir = path.join(root, 'lessons');
const modulesDir = path.join(root, 'curriculum', 'modules');

// Every lesson folder's parsed lesson.json, read once for the whole run
// rather than once per group file.
let metasPromise = null;
function lessonMetas() {
  metasPromise ??= (async () => {
    const dirs = (await fs.readdir(lessonsDir, { withFileTypes: true })).filter((d) => d.isDirectory());
    const metas = await Promise.all(dirs.map(async (dir) => {
      try {
        return { dir, meta: JSON.parse(await fs.readFile(path.join(lessonsDir, dir.name, 'lesson.json'), 'utf8')) };
      } catch {
        return null;
      }
    }));
    return metas.filter(Boolean);
  })();
  return metasPromise;
}

async function moduleScreens(moduleId) {
  // Mirrors listLessonsInModule() in lib/curriculum.ts: a lesson belongs to a
  // module when the number on its TITLE starts with the module id, and to the
  // module's category when the module spec declares one.
  const moduleFile = (await fs.readdir(modulesDir)).find((f) => f.endsWith('.md') && f.startsWith(moduleId + '_'));
  let category = null;
  if (moduleFile) {
    const src = await fs.readFile(path.join(modulesDir, moduleFile), 'utf8');
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const m = fm && fm[1].match(/^category\s*:\s*(.+)$/m);
    if (m) category = m[1].trim().replace(/^["']|["']$/g, '');
  }
  const out = [];
  for (const { dir, meta } of await lessonMetas()) {
    const numbered = String(meta.title || '').match(/^(\d+\.\d+\.\d+)/)?.[1];
    if (!numbered) continue;
    if (!(numbered === moduleId || numbered.startsWith(moduleId + '.'))) continue;
    if (category && meta.category !== category) continue;
    out.push({ id: dir.name, numbered });
  }
  // Module order is the number on the TITLE, never the folder name (5.1.24 sits
  // in `moshion-gravity`), and never readdir order.
  out.sort((a, b) => a.numbered.localeCompare(b.numbered, undefined, { numeric: true }));
  return out.map((x) => x.id);
}

let files = [];
try {
  files = (await fs.readdir(groupsDir)).filter((f) => f.endsWith('.json')).sort();
} catch {
  // no group files yet — nothing to check
}

const lines = [];
let failed = false;

for (const f of files) {
  const moduleId = f.replace(/\.json$/, '');
  let groups;
  try {
    groups = await loadModuleGroups(moduleId);
  } catch (e) {
    lines.push(`FAIL  ${f}  ${e.message}`);
    failed = true;
    continue;
  }
  const screens = await moduleScreens(moduleId);
  const problems = validateGroups(groups ?? [], screens);
  if (problems.length) {
    failed = true;
    lines.push(`FAIL  ${f}  (${screens.length} screens)`);
    for (const p of problems) lines.push(`        ${p}`);
  } else {
    const total = groups.reduce((n, g) => n + g.screens.length, 0);
    lines.push(`  ok  ${f}  ${groups.length} lessons over ${total} screens`);
  }
}

if (files.length === 0) lines.push('  ok  no lesson groups authored yet');
console.log(lines.join('\n'));
if (failed) process.exitCode = 1;
