// Runs assertions against lib/diagram-pseudocode.ts, which turns a student's
// own flowchart into the comment scaffold the second half of a two-part
// assignment hands them (1.5.30 draws it, 1.5.31 implements it).
//
// What matters here is the FALLBACK as much as the happy path. A confidently
// wrong scaffold -- a loop flattened into straight-line pseudocode, a branch
// silently dropped -- is worse than a plain list of labels, because the student
// is being told this is their own plan. Every shape the walk cannot model has
// to come back as the flat list, not as a partial answer.
//
// Compile-to-CommonJS shape matches test-diagram.mjs / test-grader.mjs.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-pseudocode-'));

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) return;
  failures++;
  console.error(`  FAIL ${name}\n    expected ${e}\n    got      ${a}`);
}

const n = (id, shape, label) => ({ id, shape, label, x: 0, y: 0 });
const e = (from, to, label) => ({ id: `${from}-${to}`, from, to, label });
const doc = (nodes, edges) => ({ version: 1, nodes, edges });

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/diagram-pseudocode.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const { toPseudocodeComments } =
    createRequire(import.meta.url)(path.join(out, 'diagram-pseudocode.js'));

  // --- a straight run ---
  check('straight run drops both terminals', toPseudocodeComments(doc(
    [n('a', 'terminal', 'Start'), n('b', 'process', 'get pages'), n('c', 'io', 'print total'), n('d', 'terminal', 'End')],
    [e('a', 'b'), e('b', 'c'), e('c', 'd')],
  )), ['// get pages', '// print total']);

  // --- the shape 1.5.31 actually needs ---
  const decision = doc(
    [
      n('a', 'terminal', 'Start'),
      n('b', 'process', 'get pages'),
      n('c', 'decision', 'pages > 20'),
      n('d', 'process', 'charge for extra'),
      n('e', 'process', 'no charge'),
      n('f', 'io', 'print what they owe'),
      n('g', 'terminal', 'End'),
    ],
    [e('a', 'b'), e('b', 'c'), e('c', 'd', 'yes'), e('c', 'e', 'no'), e('d', 'f'), e('e', 'f'), e('f', 'g')],
  );
  check('decision becomes IF / ELSE / END IF, indented, and rejoins', toPseudocodeComments(decision), [
    '// get pages',
    '// IF pages > 20',
    '  // charge for extra',
    '// ELSE',
    '  // no charge',
    '// END IF',
    '// print what they owe',
  ]);

  // Branch labels are the student's; accept the obvious spellings, and do not
  // depend on edge declaration order.
  const swapped = doc(decision.nodes, [
    e('a', 'b'), e('b', 'c'), e('c', 'e', 'No'), e('c', 'd', 'YES'), e('d', 'f'), e('e', 'f'), e('f', 'g'),
  ]);
  check('yes arm comes first whatever order the edges were drawn in',
    toPseudocodeComments(swapped), toPseudocodeComments(decision));

  // --- fallbacks: a wrong scaffold is worse than a plain one ---
  const loop = doc(
    [n('a', 'terminal', 'Start'), n('b', 'process', 'add one'), n('c', 'decision', 'done?'), n('d', 'terminal', 'End')],
    [e('a', 'b'), e('b', 'c'), e('c', 'd', 'yes'), e('c', 'b', 'no')],
  );
  check('a loop falls back to the flat list', toPseudocodeComments(loop),
    ['// Start', '// add one', '// done?', '// End']);

  const orphan = doc(
    [n('a', 'terminal', 'Start'), n('b', 'process', 'step'), n('z', 'process', 'floating')],
    [e('a', 'b')],
  );
  check('an unreachable shape falls back rather than being dropped',
    toPseudocodeComments(orphan), ['// Start', '// step', '// floating']);

  const noRejoin = doc(
    [
      n('a', 'terminal', 'Start'), n('b', 'decision', 'ok?'),
      n('c', 'terminal', 'End A'), n('d', 'terminal', 'End B'),
    ],
    [e('a', 'b'), e('b', 'c', 'yes'), e('b', 'd', 'no')],
  );
  check('arms that never rejoin still produce IF/ELSE, not a dropped branch',
    toPseudocodeComments(noRejoin), ['// IF ok?', '// ELSE', '// END IF']);

  // --- shapes that are not steps ---
  check('a note beside the flow is not an instruction', toPseudocodeComments(doc(
    [n('a', 'terminal', 'Start'), n('b', 'process', 'do it'), n('c', 'terminal', 'End'), n('m', 'comment', 'remember!')],
    [e('a', 'b'), e('b', 'c')],
  )), ['// do it']);

  check('an empty chart produces nothing', toPseudocodeComments(doc([], [])), []);
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\ntest-diagram-pseudocode: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-diagram-pseudocode: all checks passed');
