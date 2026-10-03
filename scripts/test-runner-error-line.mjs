// A runtime error the student can act on names the line it happened on.
//
// The runner (lib/js-runner-source.ts) parses a line/col out of the stack of a
// `new Function` run and posts them with the error. Five surfaces render that
// payload — the console lessons, the sandbox's JavaScript mode, the docs-drawer
// snippets, the live blocks in the book, and the moSHion/reSHape iframe path —
// and every one of them used to build its own string, which is how four of them
// silently threw the line away while only the first kept it.
//
// This checks the two halves that can rot: the offset (a wrong line number is
// worse than none, so the -2 for the Function-constructor preamble is asserted
// against a real run, not a comment) and the formatter's own output, plus that
// each consumer goes through it rather than re-stringifying the payload.

import { Worker } from 'worker_threads';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'lib', 'js-runner-source.ts'), 'utf8');

// Pull the runner source and the preamble offset straight out of the file, so
// the test fails if they are edited apart rather than testing a copy of them.
const m = source.match(/const RUNNER_SOURCE = `([\s\S]*?)\n`;/);
if (!m) { console.error('FAIL  could not find RUNNER_SOURCE in lib/js-runner-source.ts'); process.exit(1); }
const OFFSET = Number((source.match(/const FUNCTION_PREAMBLE_LINES = (\d+);/) || [])[1]);
if (!OFFSET) { console.error('FAIL  could not read FUNCTION_PREAMBLE_LINES'); process.exit(1); }

// Compile the real module with the repo's own tsc so both the runner string
// and errorWithLocation are exercised as shipped. Same approach as
// scripts/test-js-docs.mjs's readRunnerSource. Reading the template literal out
// of the .ts by regex instead would hand back the raw source with its escapes
// still doubled, which is not what the browser ever runs.
let RUNNER_SOURCE;
let errorWithLocation;
try {
  const dir = mkdtempSync(path.join(tmpdir(), 'shcode-error-line-'));
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/js-runner-source.ts', '--outDir', dir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ], { cwd: root, stdio: 'ignore' });
    writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}');
    const req = createRequire(path.join(dir, 'noop.cjs'));
    ({ RUNNER_SOURCE, errorWithLocation } = req(path.join(dir, 'js-runner-source.js')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} catch (e) {
  console.log(`  FAIL  lib/js-runner-source.ts did not compile -- ${e.message}`);
  console.log('\n1 FAILED');
  process.exit(1);
}

const SHIM = `
import { parentPort } from 'worker_threads';
const self = { postMessage: (v) => parentPort.postMessage(v), onmessage: null };
${RUNNER_SOURCE}
parentPort.on('message', (data) => self.onmessage({ data }));
`;

// Run student code the way the browser does and return the error payload.
function run(code) {
  return new Promise((resolve) => {
    let settled = false;
    const w = new Worker(SHIM, { eval: true });
    const done = (v) => { if (!settled) { settled = true; w.terminate(); resolve(v); } };
    const killer = setTimeout(() => done(null), 3000);
    w.on('message', (d) => { if (d.kind === 'log') return; clearTimeout(killer); done(d); });
    w.on('error', () => done(null));
    w.postMessage(code);
  });
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  -- ${detail}`}`);
  if (!cond) failures++;
};

console.log('console runner: errors carry the line they happened on\n');


// 1. The offset. The throw is on line 3 of the student's code; if the -2 for
// the Function-constructor preamble ever changes, this is what catches it.
{
  const code = ['// line 1', '// line 2', 'undefinedFunction();'].join('\n');
  const d = await run(code);
  check('a thrown error reports a line', d && d.kind === 'error' && typeof d.line === 'number',
    JSON.stringify(d));
  check('the reported line is the student\'s own, not the Function preamble',
    d && d.line === 3, `expected 3, got ${d && d.line}`);
  check('the column comes back too', d && typeof d.col === 'number' && d.col > 0,
    JSON.stringify(d && d.col));
}

// 2. A throw on the very first line must not map to line 0 or -1.
{
  const d = await run('undefinedFunction();');
  check('a throw on line 1 still reports line 1', d && d.line === 1, `got ${d && d.line}`);
}

// 3. A non-Error throw (a bare string, a rejected string) has no stack to
// parse, so the line must be absent rather than wrong.
{
  const d = await run('throw "just a string";');
  check('a non-Error throw is still reported', d && d.kind === 'error', JSON.stringify(d));
  check('a non-Error throw reports no line rather than a wrong one',
    d && d.line === null, `got ${d && d.line}`);
}

// 3b. A COMPILE error (SyntaxError) is raised by `new Function` before any
// student line runs, so its stack holds only the runner's own frame. Parsing
// that stack gave every syntax error in every file the same "line 59, col 5"
// (the runner's own call site), and 1.7.3's hint tells students the console
// names the line. The line has to come from the code itself.
{
  const pad = (n) => Array.from({ length: n }, (_, i) => `// filler ${i + 1}`);
  const cases = [
    ['an unclosed quote on line 13 of a 33-line file',
      [...pad(12), 'const bad = "oops;', ...pad(20)].join('\n'), 13],
    ['a bare `= ;` on line 2', ['let a = 1;', 'let x = ;', 'console.log(a);'].join('\n'), 2],
    ['a missing comma inside a multi-line array, on line 3',
      ['const priceList = [', '  { name: "Clip", price: 1.2 },', '  { name: "Pad", price 2.5 },', '  { name: "Tape", price: 3.1 }', '];'].join('\n'), 3],
    ['a call missing its closing parenthesis, on line 2',
      ['let a = 1;', 'console.log("a" "b");', 'let c = 3;'].join('\n'), 2],
    ['an unclosed brace at the end of the file (reported on its last line)',
      ['function f() {', '  return 1;', '', ''].join('\n'), 2],
  ];
  // JavaScriptCore (Bun, Safari) words an unclosed brace and an unterminated
  // string the same way, so on that engine those two cases may report no line.
  // They must still never report a WRONG one.
  const jsc = !!process.versions.bun;
  const ambiguous = new Set(['an unclosed quote on line 13 of a 33-line file',
    'an unclosed brace at the end of the file (reported on its last line)']);
  for (const [name, code, want] of cases) {
    const d = await run(code);
    const ok = d && d.kind === 'error' && d.name === 'SyntaxError'
      && (d.line === want || (jsc && ambiguous.has(name) && d.line === null));
    check(`${name} reports line ${want}${jsc && ambiguous.has(name) ? ' (or none on JavaScriptCore)' : ''}`, ok,
      `got ${JSON.stringify(d && { name: d.name, line: d.line })}`);
  }
  const d = await run(['let a = 1;', 'let x = ;'].join('\n'));
  check('a compile error carries no column rather than the runner\'s', d && d.col === null,
    `got ${d && d.col}`);
  // A SyntaxError raised WHILE the program runs (JSON.parse) has a real stack
  // frame inside the student's code, and must keep using it.
  const r = await run(['let a = 1;', 'let b = 2;', 'JSON.parse("{bad");'].join('\n'));
  check('a run-time SyntaxError (JSON.parse) still reports its own line',
    r && r.name === 'SyntaxError' && r.line === 3, `got ${JSON.stringify(r && { name: r.name, line: r.line })}`);
}

// 4. The formatter. Same shape in, location on the end.
{
  check('name, message and line all appear',
    errorWithLocation('TypeError', 'x is not a function', 12, 5) === 'TypeError: x is not a function (line 12, col 5)',
    errorWithLocation('TypeError', 'x is not a function', 12, 5));
  check('a line with no column omits the column',
    errorWithLocation('Error', 'boom', 7, null) === 'Error: boom (line 7)',
    errorWithLocation('Error', 'boom', 7, null));
  check('no line means no parenthetical, so an error without one is unchanged',
    errorWithLocation('Error', 'boom', null, null) === 'Error: boom',
    errorWithLocation('Error', 'boom', null, null));
  check('a missing name falls back to Error',
    errorWithLocation(undefined, 'boom', 3, 1) === 'Error: boom (line 3, col 1)',
    errorWithLocation(undefined, 'boom', 3, 1));
}

// 5. Every surface that renders a runner error must go through the formatter.
// This is the regression itself: a caller with its own template literal is how
// the line number was lost four times over.
{
  const consumers = [
    'LessonWorkspace', 'SandboxWorkspace', 'LiveCodeBlock', 'DocLiveSnippet',
  ];
  for (const name of consumers) {
    const text = readFileSync(path.join(root, 'components', `${name}.tsx`), 'utf8');
    check(`${name} imports errorWithLocation from lib/js-runner-source`,
      /import \{[^}]*errorWithLocation[^}]*\} from '\.\.\/lib\/js-runner-source'/.test(text),
      'no such import');
    check(`${name} renders the error through the formatter, not its own template`,
      /errorWithLocation\(/.test(text) && !/\$\{d\.name \|\| 'Error'\}: \$\{d\.message \|\| ''\}`/.test(text),
      'still stringifies the payload inline');
  }
  // The moSHion/reSHape iframe path: the runner already parsed a line, and
  // LessonWorkspace's banner used to discard it.
  const lw = readFileSync(path.join(root, 'components', 'LessonWorkspace.tsx'), 'utf8');
  check('LessonWorkspace keeps the line from the iframe preview-error path',
    /errorWithLocation\(err\.name, err\.message, err\.line, err\.col\)/.test(lw),
    'the preview-error handler does not pass err.line');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}  (preamble offset ${OFFSET})`);
process.exit(failures === 0 ? 0 : 1);
