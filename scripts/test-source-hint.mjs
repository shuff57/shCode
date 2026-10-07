// The linkifier decides what becomes a link, so its two failure modes matter:
//
//   A number that IS a lesson but is not linked  -- the student cannot get to
//     the material. (Half the feature.)
//   A number that is NOT a lesson but IS linked -- the student clicks "Figure
//     2.2.3" and lands on an unrelated lesson, which is worse than no link.
//     "Definition 1.5.5", "Figure 2.2.3" and friends are real in this corpus;
//     check-lesson-citations.mjs skips them for exactly this reason, and so
//     must the renderer, or the two disagree about what a citation is.
//
// Round-tripping matters too: the parts are concatenated back into prose, so a
// dropped or duplicated character would silently corrupt every question and
// criterion on the page.

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Compile the real module so this tests what ships.
let sourceHintParts;
let sourceHintNumbers;
try {
  const dir = mkdtempSync(path.join(tmpdir(), 'shcode-source-hint-'));
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/source-hint.ts', '--outDir', dir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ], { cwd: root, stdio: 'ignore' });
    writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}');
    const req = createRequire(path.join(dir, 'noop.cjs'));
    ({ sourceHintParts, sourceHintNumbers } = req(path.join(dir, 'source-hint.js')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} catch (e) {
  console.log(`  FAIL  lib/source-hint.ts did not compile -- ${e.message}`);
  console.log('\n1 FAILED');
  process.exit(1);
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  -- ${detail}`}`);
  if (!cond) failures++;
};

const numbers = (s) => sourceHintParts(s).filter((p) => p.isNumber).map((p) => p.text);
const roundTrip = (s) => sourceHintParts(s).map((p) => p.text).join('');

console.log('lesson-number linkifier: what becomes a link\n');

// 1. The ordinary case, which is the whole feature.
check('a pointer becomes its own linkable part',
  JSON.stringify(numbers('see (1.1.5) for this')) === '["1.1.5"]',
  JSON.stringify(numbers('see (1.1.5) for this')));
check('several pointers in one sentence all split',
  JSON.stringify(numbers('(1.1.5 and 1.1.6)')) === '["1.1.5","1.1.6"]',
  JSON.stringify(numbers('(1.1.5 and 1.1.6)')));
check('a pointer in running prose links too, not only in parentheses',
  JSON.stringify(numbers('Everything you need is in the 1.1.5 video and 1.1.10.')) === '["1.1.5","1.1.10"]',
  JSON.stringify(numbers('Everything you need is in the 1.1.5 video and 1.1.10.')));

// 2. Not-lessons. Three-part is the citation shape; a two-part number is a
// section or module reference in this course ("the loop (2.2)"), and a decimal
// is a quantity. Linking either would be a wrong link.
check('a two-part number is not a lesson',
  JSON.stringify(numbers('the loop (2.2) and the switch (2.3)')) === '[]',
  JSON.stringify(numbers('the loop (2.2) and the switch (2.3)')));
check('a decimal is not a lesson',
  JSON.stringify(numbers('it costs 12.50 and 98.6 total')) === '[]',
  JSON.stringify(numbers('it costs 12.50 and 98.6 total')));

// 3. Labelled numbers: the wrong-link half. Each of these is a real citation
// shape in the corpus that names nothing.
for (const label of ['Figure', 'Fig.', 'Definition', 'Table', 'Example', 'Section', 'version']) {
  check(`"${label} 2.2.3" is not linked`,
    JSON.stringify(numbers(`as in ${label} 2.2.3 above`)) === '[]',
    JSON.stringify(numbers(`as in ${label} 2.2.3 above`)));
}

// A labelled number must not disable the real pointer next to it.
check('a labelled number does not suppress a real pointer beside it',
  JSON.stringify(numbers('Figure 2.2.3 but see 1.1.5')) === '["1.1.5"]',
  JSON.stringify(numbers('Figure 2.2.3 but see 1.1.5')));

// 4. Round-trip: the parts are concatenated back into prose on the page, so
// the split must not lose or invent a character.
for (const s of [
  'Everything is in the 1.1.5 video, 1.1.6 and 1.1.8: go back and reread.',
  'Part 1: describe them (1.1.5 and 1.1.6).\n\nPart 2: now 3.3.13.',
  'no pointers here at all',
  '',
  'Figure 2.2.3 and 1.1.5',
]) {
  check(`round-trips exactly: ${JSON.stringify(s.slice(0, 40))}`, roundTrip(s) === s, JSON.stringify(roundTrip(s)));
}

// 5. The lookup list a caller feeds to the href resolver.
check('sourceHintNumbers dedupes and keeps order',
  JSON.stringify(sourceHintNumbers('(1.1.5) then (1.1.6) then (1.1.5)')) === '["1.1.5","1.1.6"]',
  JSON.stringify(sourceHintNumbers('(1.1.5) then (1.1.6) then (1.1.5)')));
check('sourceHintNumbers ignores labelled numbers',
  JSON.stringify(sourceHintNumbers('Figure 2.2.3 and 1.1.5')) === '["1.1.5"]',
  JSON.stringify(sourceHintNumbers('Figure 2.2.3 and 1.1.5')));

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
