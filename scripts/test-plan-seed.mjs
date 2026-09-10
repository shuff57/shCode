// Every `planFrom` lesson must seed the student's imported chart UNDER its
// STEP 1 comment, not at the end of the file.
//
// Why this is a gate and not a comment: 1.6.2's r8 requires an IF/ELSE comment
// pair after the stored comparison, because that pair is step 5's work. The
// seeded chart is itself pseudocode containing `// IF` and `// ELSE`
// (lib/diagram-pseudocode.ts). Seed it at the BOTTOM of the file and it lands
// after the comparison and satisfies r8 on its own -- a green check for work
// the student never did. That is exactly what shipped: the seeding anchor was
// a sentence from 1.5.31's starter that 1.6.2's starter does not contain.
//
// Nothing about that coupling is visible from either file, so it is measured
// here instead: seed the real starter, then run the lesson's real requirement
// patterns over a student answer that deliberately omits step 5.
//
// Compile pattern lifted from scripts/test-diagram.mjs -- lib/ is TypeScript
// that Node will not load directly.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-planseed-'));

let failures = 0;
const check = (ok, label, detail) => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `  -- ${detail}`}`);
};

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/plan-seed.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const { seedPlan, step1BlockEnd } = await import(
    'file://' + path.join(out, 'plan-seed.js').replace(/\\/g, '/')
  );

  // lib/store.ts normalises to LF before anything reads fileContents.
  const lf = (s) => s.replace(/\r\n?/g, '\n');

  // Every lesson that uses the feature, found rather than hardcoded, so a new
  // one is covered the day it is authored.
  const planLessons = readdirSync(path.join(root, 'lessons'))
    .map((d) => ({ dir: d, jsonPath: path.join(root, 'lessons', d, 'lesson.json') }))
    .filter((l) => {
      try {
        return Boolean(JSON.parse(readFileSync(l.jsonPath, 'utf8')).planFrom);
      } catch {
        return false;
      }
    });

  console.log(`\n=== ${planLessons.length} lesson(s) using planFrom ===`);
  check(planLessons.length > 0, 'at least one planFrom lesson exists');

  // What lib/diagram-pseudocode.ts emits for a chart with one diamond.
  const PLAN = [
    '// --- your chart from X ---',
    '// START',
    '// INPUT the numbers',
    '// SET the value TO the arithmetic',
    '// IF the value is at or under the limit',
    '//     report the good case',
    '// ELSE',
    '//     report the other case',
    '// END IF',
    '// END',
  ].join('\n');

  for (const lesson of planLessons) {
    const starter = lf(readFileSync(path.join(root, 'lessons', lesson.dir, 'script.js'), 'utf8'));
    console.log(`\n--- ${lesson.dir} ---`);

    check(step1BlockEnd(starter) !== null, 'starter has a STEP 1 comment block',
      'no `// STEP 1` line, so the chart would be appended at the end of the file');

    const seeded = seedPlan(starter, PLAN);
    const markerAt = seeded.indexOf('// --- your chart from X ---');
    check(markerAt !== -1, 'the chart is present after seeding');

    // The real question: does it land above the rest of the steps, or below
    // everything? STEP 2 is the first thing that must come after it.
    const step2At = seeded.search(/^\s*\/\/\s*STEP\s+2\b/m);
    check(step2At !== -1 && markerAt < step2At, 'the chart sits above STEP 2',
      step2At === -1 ? 'no STEP 2 to compare against' : 'seeded below the remaining steps');

    check(!seeded.trimEnd().endsWith('// END'), 'the chart is not appended at end of file',
      'landed at the bottom, which is the shape that hollowed out r8');
  }

  // The coupling itself, on the lesson that has the check.
  console.log('\n--- 1-6-2-ch1-pa-build: seeding must not satisfy r8 by itself ---');
  const build = JSON.parse(
    readFileSync(path.join(root, 'lessons', '1-6-2-ch1-pa-build', 'lesson.json'), 'utf8'),
  );
  const r8 = build.requirements.find((r) => r.id === 'r8');
  check(Boolean(r8), 'r8 exists');
  if (r8) {
    const re = new RegExp(r8.pattern, r8.flags || '');
    const starter = lf(
      readFileSync(path.join(root, 'lessons', '1-6-2-ch1-pa-build', 'script.js'), 'utf8'),
    );
    const seeded = seedPlan(starter, PLAN);

    // A student who did everything EXCEPT step 5's two branch comments.
    const work = [
      'const placeName = "Tony\'s";',
      'let pizzaPrice = 18.5;',
      'let sliceCount = 8;',
      'const GOOD_DEAL_LIMIT = 2.0;',
      'const costPerSlice = pizzaPrice / sliceCount;',
      'const meetsTheLimit = costPerSlice <= GOOD_DEAL_LIMIT;',
      'console.log(`A slice costs $${costPerSlice}.`);',
      'console.log(typeof costPerSlice);',
    ].join('\n');
    const withoutStep5 = seeded.replace(/^\s*\/\/ STEP 7/m, work + '\n\n// STEP 7');
    check(withoutStep5 !== seeded, 'the fixture actually injected the student work');
    check(!re.test(withoutStep5), 'r8 FAILS when step 5 is skipped',
      'the seeded pseudocode satisfied r8 on its own');

    const withStep5 = withoutStep5.replace(
      'console.log(typeof costPerSlice);',
      'console.log(typeof costPerSlice);\n\n// IF meetsTheLimit THEN report a good deal\n// ELSE report it is not',
    );
    check(re.test(withStep5), 'r8 PASSES once step 5 is written');
  }

  // The fallback still exists for a starter with no STEP 1.
  console.log('\n--- fallback ---');
  const noStep1 = '// just a file\nconst x = 1;\n';
  check(step1BlockEnd(noStep1) === null, 'no STEP 1 block is detected as absent');
  check(seedPlan(noStep1, PLAN).includes(PLAN), 'the chart is still delivered, appended');
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? '\n[test-plan-seed] OK — every planFrom lesson seeds under STEP 1\n'
    : `\n[test-plan-seed] ${failures} FAILURE(S)\n`,
);
process.exit(failures === 0 ? 0 : 1);
