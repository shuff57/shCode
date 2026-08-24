// Asserts that no reference answer reaches the student bundle.
//
// Reference answers live in lessons/<id>/solution.js or lessons/<id>/solution/.
// Three walkers read the lessons tree and TWO of them ship to students:
// lib/lessons.ts (the lesson payload) and scripts/generate-lesson-starters.mjs
// (the Reset bundle). Both recurse into subdirectories, so a solution/ folder
// is only kept out by being excluded by name -- a one-line omission would hand
// every student the answer key with nothing failing.
//
// What is checked, per lesson that has a reference answer:
//
//   1. No file path under solution/ appears in the starters bundle.
//   2. No solution file's FULL text appears there.
//   3. The answer IS in solutions.generated.ts, so the guard is not passing
//      because the answer went missing everywhere.
//   4. No lesson has both solution.js and solution/ -- two copies drift.
//
// Deliberately NOT a line-by-line comparison. A starter legitimately shares
// lines with its solution (that is what a scaffold is); flagging those produced
// 79 false alarms on the first attempt and would have trained everyone to
// ignore this check.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const lessonsDir = path.join(root, 'lessons');

const startersPath = path.join(root, 'functions', '_shared', 'lesson-starters.generated.ts');
const solutionsPath = path.join(root, 'functions', '_shared', 'solutions.generated.ts');

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  FAIL  ${msg}`);
};

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

// Both bundles are gitignored, so on a fresh clone (and in `npm test`, which
// does not run prebuild) they will not exist yet. Build them rather than
// skipping — a check that quietly no-ops is worse than no check.
if (!(await exists(startersPath)) || !(await exists(solutionsPath))) {
  const { execFileSync } = await import('child_process');
  for (const gen of ['generate-solutions.mjs', 'generate-lesson-starters.mjs']) {
    execFileSync(process.execPath, [path.join(__dirname, gen)], {
      cwd: root,
      stdio: 'inherit',
    });
  }
}

const starters = await fs.readFile(startersPath, 'utf8');
const solutions = await fs.readFile(solutionsPath, 'utf8');

// The bundles hold JSON-encoded strings, so compare in that encoding.
const encoded = (s) => JSON.stringify(s).slice(1, -1);

const entries = await fs.readdir(lessonsDir, { withFileTypes: true });
const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

let dirForm = 0;
let fileForm = 0;

for (const id of dirs) {
  const solDir = path.join(lessonsDir, id, 'solution');
  const solFile = path.join(lessonsDir, id, 'solution.js');

  const hasDir = (await exists(solDir)) && (await fs.stat(solDir)).isDirectory();
  const hasFile = await exists(solFile);

  if (hasDir && hasFile) {
    fail(`${id}: has BOTH solution/ and solution.js — two copies that will drift`);
  }
  if (!hasDir && !hasFile) continue;

  /** @type {Array<[string, string]>} */
  const files = [];
  if (hasDir) {
    dirForm++;
    const names = await fs.readdir(solDir, { withFileTypes: true, recursive: true });
    for (const n of names) {
      if (n.isDirectory()) continue;
      const parent = n.parentPath ?? n.path ?? solDir;
      const full = path.join(parent, n.name);
      files.push([path.relative(solDir, full).replace(/\\/g, '/'), await fs.readFile(full, 'utf8')]);
    }
    // 1. The path itself must never appear as a key in the student bundle.
    for (const [name] of files) {
      if (starters.includes(encoded(`solution/${name}`))) {
        fail(`${id}: the starters bundle contains a key for solution/${name}`);
      }
    }
  } else {
    fileForm++;
    files.push(['script.js', await fs.readFile(solFile, 'utf8')]);
  }

  for (const [name, text] of files) {
    if (text.trim().length === 0) {
      fail(`${id}/${name}: solution file is empty`);
      continue;
    }
    // 2. Whole-file leak. A starter identical to its own solution is also a
    //    defect -- it means the assignment ships pre-solved.
    if (starters.includes(encoded(text))) {
      fail(`${id}/${name}: the full solution text is in the starters bundle`);
    }
    // 3. Mirror check.
    if (!solutions.includes(encoded(text))) {
      fail(`${id}/${name}: not in solutions.generated.ts — teachers cannot see it`);
    }
  }
}

if (dirForm + fileForm === 0) {
  fail('no solutions found at all — this check would pass vacuously');
}

if (failures > 0) {
  console.error(`[check-solution-leak] ${failures} problem(s)`);
  process.exit(1);
}

console.log(
  `[check-solution-leak] OK — ${fileForm} solution.js + ${dirForm} solution/ checked, ` +
    `none leaked into the starters bundle`,
);
