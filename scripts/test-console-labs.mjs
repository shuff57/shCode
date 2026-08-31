// Guards the 1.4 console labs (1.4.3, 1.4.12, 1.4.20) against the regression
// that made them unusable: their requirement patterns used to order on
// console.log CALL COUNT -- "the Nth log must be the Nth answer" -- so one
// extra print statement failed every requirement at once, not just the nearest.
// That punished the exact labelled-log style 1.4.18 teaches two lessons
// earlier (console.log("hot days: ", hot)), and a student with entirely
// correct answers saw a wall of red with no hint why.
//
// The patterns now order on the ANSWERS instead, each anchored inside its own
// console.log call. Extra logs, labels and leading output are free; getting
// the answers in the wrong order is still wrong.
//
// Same compile-to-CommonJS shape as test-diagram.mjs / test-grader.mjs, and
// for the same reason: lib/grader.ts is TypeScript importing without file
// extensions, which Node will not load directly. Grading runs through the
// SHIPPED grade() -- comment stripping included -- not a copy of it.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-console-labs-'));

let failures = 0;
const check = (name, actual, expected) => {
  if (actual === expected) return;
  failures++;
  console.error(`  FAIL ${name}: expected ${expected}, got ${actual}`);
};

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/grader.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const { grade } = createRequire(import.meta.url)(path.join(out, 'grader.js'));

  // Each lab's answers, in the order the lesson asks for them.
  const LABS = {
    '1-4-3-match-the-language': ['SQL', 'Swift', 'C', 'JavaScript', 'Python'],
    '1-4-12-name-the-structure': ['sequence', 'selection', 'repetition', 'selection and repetition'],
    '1-4-20-sort-the-snippet': ['procedural', 'object-oriented', 'functional', 'multi-paradigm'],
  };

  for (const [dir, answers] of Object.entries(LABS)) {
    console.log(`\n${dir}`);
    const lesson = JSON.parse(readFileSync(path.join(root, 'lessons', dir, 'lesson.json'), 'utf8'));
    const reqs = lesson.requirements;
    const starter = readFileSync(path.join(root, 'lessons', dir, 'script.js'), 'utf8');
    const solution = readFileSync(path.join(root, 'lessons', dir, 'solution.js'), 'utf8');

    // How many requirements pass for a given script.js.
    const passCount = (src) =>
      grade(reqs, { 'script.js': src }).results.filter((r) => r.status === 'passed').length;

    const plain = answers.map((a) => `console.log(${JSON.stringify(a)});`).join('\n');

    // The reference answer must score full marks, or Submit can never be
    // demonstrated in front of a class.
    check('reference solution passes all', passCount(solution), reqs.length);
    check('plain answers pass all', passCount(plain), reqs.length);

    // The starter alone teaches nothing to the grader. Its worked snippets sit
    // in comments, which grade() strips -- so this also proves the patterns are
    // not reading the student's comments back to them as answers.
    check('starter alone passes none', passCount(starter), 0);

    // --- the regressions this file exists for ---

    // 1.4.18's own labelled two-argument style.
    check(
      'labelled two-arg logs pass all',
      passCount(answers.map((a, i) => `console.log("STEP ${i + 1}: ", ${JSON.stringify(a)});`).join('\n')),
      reqs.length,
    );

    // A label printed on its own line before each answer.
    check(
      'leading label logs pass all',
      passCount(answers.map((a, i) => `console.log("STEP ${i + 1}:");\nconsole.log(${JSON.stringify(a)});`).join('\n')),
      reqs.length,
    );

    // Debug output before any answer, which a beginner leaves lying around.
    check('leading stray log passes all', passCount(`console.log("here goes");\n${plain}`), reqs.length);

    // Trailing extras were always harmless; keep them that way.
    check('trailing stray log passes all', passCount(`${plain}\nconsole.log("done");`), reqs.length);

    // --- still strict about the things that are actually wrong ---

    // Order is the whole point of these labs: answer N belongs to question N.
    const swapped = [...answers];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const swappedPass = passCount(swapped.map((a) => `console.log(${JSON.stringify(a)});`).join('\n'));
    if (swappedPass >= reqs.length) {
      failures++;
      console.error(`  FAIL swapping the first two answers still passes all ${reqs.length}`);
    }

    // Dropping the last answer must fail exactly the last requirement.
    check('omitting the last answer fails one',
      passCount(answers.slice(0, -1).map((a) => `console.log(${JSON.stringify(a)});`).join('\n')),
      reqs.length - 1);

    // An answer written but never printed is not an answer.
    check('answers in a bare string fail all',
      passCount(answers.map((a) => JSON.stringify(a) + ';').join('\n')), 0);

    if (failures === 0) console.log(`  ok — ${reqs.length} requirements`);
  }

  // Fix-the-bug labs hand the student working-but-wrong code instead of a
  // list of answers, so the checks above do not apply. The one thing that
  // must hold is that the grader can tell the two apart: a starter that
  // already passes means the lab grades nothing.
  const FIX_LABS = [
    '2-1-9b-lab-count-the-equals',
    '2-1-33-lab-debug-door',
  ];

  for (const dir of FIX_LABS) {
    console.log(`\n${dir}`);
    const lesson = JSON.parse(readFileSync(path.join(root, 'lessons', dir, 'lesson.json'), 'utf8'));
    const reqs = lesson.requirements;
    const passCount = (src) =>
      grade(reqs, { 'script.js': src }).results.filter((r) => r.status === 'passed').length;

    const starter = readFileSync(path.join(root, 'lessons', dir, 'script.js'), 'utf8');
    const solution = readFileSync(path.join(root, 'lessons', dir, 'solution.js'), 'utf8');

    check(`${dir}: reference solution passes all`, passCount(solution), reqs.length);

    const starterPass = passCount(starter);
    if (starterPass >= reqs.length) {
      failures++;
      console.error(`  FAIL ${dir}: the broken starter already passes all ${reqs.length} — nothing is graded`);
    } else {
      console.log(`  ok — starter ${starterPass}/${reqs.length}, solution ${reqs.length}/${reqs.length}`);
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\ntest-console-labs: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntest-console-labs: all checks passed');
