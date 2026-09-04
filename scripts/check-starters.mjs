// Two invariants that must hold for every graded lesson in the course.
//
//   1. The reference answer scores FULL marks.
//   2. The shipped starter does NOT score full marks.
//
// (2) is the one worth having. A starter that already passes everything means
// the lesson grades nothing: the student clicks Submit on untouched code, sees
// full marks, and learns that Submit is a button rather than a check. It is
// invisible from the authoring side, because the author is looking at the
// reference answer when they write the requirements, never at the starter.
//
// This was measured on three lessons in `test-console-labs.mjs` and on none of
// the other 120. The list of three was hand-written, so it only ever covered
// the labs someone happened to be worried about. There is no reason for a
// list: every lesson with `requirements` and a reference is checkable, so
// check them all.
//
// The bar is deliberately "not full", not "zero". Plenty of starters correctly
// pass some requirements -- a debug-this lab ships code that is mostly right,
// and requiring 0 there would push authors to break the starter artificially.
// Full marks is the line where nothing is being asked.
//
// Run: node scripts/check-starters.mjs   (also part of `npm test`)
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsDir = path.join(root, 'lessons');

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');

// The reference is either `solution.js` (script-only lessons) or a `solution/`
// directory keyed by path. The starter is whatever sits at the lesson root
// under those same keys -- that pairing is what makes the two comparable.
function referenceFiles(id) {
  const dir = path.join(lessonsDir, id);
  const asDir = path.join(dir, 'solution');
  if (existsSync(asDir)) {
    const files = {};
    const walk = (abs, rel) => {
      for (const e of readdirSync(abs, { withFileTypes: true })) {
        const next = path.join(abs, e.name);
        const key = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(next, key);
        else files[key] = read(next);
      }
    };
    walk(asDir, '');
    return files;
  }
  const asFile = path.join(dir, 'solution.js');
  return existsSync(asFile) ? { 'script.js': read(asFile) } : null;
}

function starterFiles(id, keys) {
  const files = {};
  for (const key of keys) {
    const p = path.join(lessonsDir, id, key);
    if (existsSync(p)) files[key] = read(p);
  }
  return Object.keys(files).length ? files : null;
}

const out = mkdtempSync(path.join(tmpdir(), 'shcode-starters-'));
let failures = 0;
try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/grader.ts', '--outDir', out, '--module', 'commonjs',
    '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { grade } = createRequire(import.meta.url)(
    path.join(out, 'grader.js').replace(/\\/g, '/'));

  const passed = (reqs, files) =>
    grade(reqs, files, 0).results.filter((r) => r.status === 'passed').length;

  let checked = 0;
  const noReference = [];
  const noStarter = [];

  for (const id of readdirSync(lessonsDir).sort()) {
    const cfgPath = path.join(lessonsDir, id, 'lesson.json');
    if (!existsSync(cfgPath)) continue;
    let cfg;
    try { cfg = JSON.parse(read(cfgPath)); } catch { continue; }
    const reqs = (cfg.requirements ?? [])
      .filter((r) => !['manual', 'model'].includes(r.type ?? 'regex'));
    if (!reqs.length) continue;

    const ref = referenceFiles(id);
    if (!ref) { noReference.push(id); continue; }
    const starter = starterFiles(id, Object.keys(ref));
    if (!starter) { noStarter.push(id); continue; }
    checked++;

    const refScore = passed(reqs, ref);
    if (refScore !== reqs.length) {
      failures++;
      const failing = grade(reqs, ref, 0).results
        .filter((r) => r.status === 'failed').map((r) => r.id).join(', ');
      console.error(`FAIL ${id}\n     reference scores ${refScore}/${reqs.length}`
        + ` — its own answer fails: ${failing}`);
    }

    const starterScore = passed(reqs, starter);
    if (starterScore === reqs.length) {
      failures++;
      console.error(`FAIL ${id}\n     the untouched starter scores ${reqs.length}/${reqs.length}`
        + ` — this lesson grades nothing`);
    }
  }

  console.log(`\n[check-starters] ${checked} graded lesson(s) checked`);
  if (noReference.length) {
    console.log(`  ${noReference.length} with requirements but no reference answer:`);
    for (const id of noReference) console.log(`    ${id}`);
  }
  if (noStarter.length) {
    console.log(`  ${noStarter.length} with a reference but no matching starter:`);
    for (const id of noStarter) console.log(`    ${id}`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n[check-starters] ${failures} failure(s)`);
  process.exit(1);
}
console.log('[check-starters] every reference scores full, every starter does not');
