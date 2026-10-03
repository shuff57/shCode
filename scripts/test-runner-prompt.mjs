// prompt() in a console lab: the handshake that makes it possible.
//
// Student code runs in a Worker, which has no window and so no prompt. A
// synchronous prompt() cannot be bridged out of one either — the Worker blocks
// inside the call and cannot receive the answer — so RUNNER_SOURCE pauses the
// run at the first unanswered prompt() and asks the host to raise the dialog.
// The host answers and posts the script back with one more answer in the list,
// and the run restarts.
//
// This checks the half that can be checked without a browser dialog: that the
// runner asks, in order, with the message the student wrote; that answers are
// consumed in order; that the last attempt is the one that completes; and that
// the attempt number rides along on every message, which is how the host knows
// to drop the prints of a superseded attempt.
//
// The host half (window.prompt, the kill timer, terminate) is the same code
// path every console surface already used, and is covered end to end by running
// 3.1.9 in a browser.

import { Worker } from 'worker_threads';
import { readFileSync, mkdtempSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let RUNNER_SOURCE;
{
  const dir = mkdtempSync(path.join(tmpdir(), 'shcode-runner-prompt-'));
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/js-runner-source.ts', '--outDir', dir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ], { cwd: root, stdio: 'pipe' });
    ({ RUNNER_SOURCE } = createRequire(path.join(dir, 'x.js'))(path.join(dir, 'js-runner-source.js')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SHIM = `
const { parentPort } = require('worker_threads');
// node's worker_threads DOES have a global prompt (it reads stdin), which a
// browser Worker does not. Left in place it would answer the student's prompt()
// from the test's stdin instead of pausing for the host, so this test would be
// measuring node rather than the runner. Deleting it makes the shim faithful.
delete globalThis.prompt;
// self must be the real global here, not a stand-in object: the runner
// installs its prompt() shim onto it, and the student's code has to find that
// binding in the worker's own scope.
globalThis.postMessage = (v) => parentPort.postMessage(v);
${RUNNER_SOURCE}
parentPort.on('message', (data) => self.onmessage({ data }));
`;

// One run: post the script, answer every prompt() from `scripted`, and collect
// every message the runner posts. Mirrors what runStudentCode does on a page.
function run(code, scripted) {
  return new Promise((resolve) => {
    const w = new Worker(SHIM, { eval: true });
    const messages = [];
    const answers = [];
    const shown = [];          // what a caller would be displaying right now
    const superseded = () => { shown.length = 0; };
    let attempt = 1;
    const killer = setTimeout(() => {
      w.terminate();
      resolve({ messages, timedOut: true });
    }, 3000);
    w.on('message', (d) => {
      messages.push(d);
      if (d.kind === 'log') shown.push(d.message);
      if (d.attempt && d.attempt !== attempt) {
        attempt = d.attempt;
        answers.length = 0;
      }
      if (d.kind === 'needs-input') {
        superseded();
        answers.push(scripted.shift() ?? '');
        attempt += 1;
        w.postMessage({ code, answers: answers.slice(), attempt });
        return;
      }
      if (d.kind === 'done' || d.kind === 'error') {
        clearTimeout(killer);
        w.terminate();
        resolve({ messages, shown: [...shown], timedOut: false });
      }
    });
    w.postMessage({ code, answers: [], attempt });
  });
}

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
  }
};

// The lesson's own shape: one prompt for the count, then one per user.
const LAB = `
function terms() {
  console.log('Do you accept the terms and conditions?');
  const answer = prompt('Enter Y or N:');
  if (answer === 'Y') console.log('Thank you for accepting.');
  else console.log('Have a good day.');
}
const numUsers = Number(prompt('How many users?'));
for (let i = 0; i < numUsers; i++) terms();
`;

const r = await run(LAB, ['2', 'Y', 'N']);
const asks = r.messages.filter((m) => m.kind === 'needs-input');
const logs = r.shown;   // what the caller is left displaying
const lastAttempt = Math.max(...r.messages.map((m) => m.attempt || 1));

console.log('console runner: prompt() asks the host for the answer');

check('the run is not left hanging', !r.timedOut);
check('it asks three times: the count, then one per user', asks.length === 3, `got ${asks.length}`);
check(
  'the first question is the one the student wrote',
  asks[0]?.message === 'How many users?',
  JSON.stringify(asks[0]?.message),
);
check(
  'the per-user question comes from inside the function',
  asks[1]?.message === 'Enter Y or N:' && asks[2]?.message === 'Enter Y or N:',
  JSON.stringify(asks.slice(1).map((a) => a.message)),
);
check('the answers arrive in the order they were given', logs.includes('Thank you for accepting.') && logs.includes('Have a good day.'), logs.join(' | '));
check('the final pass is the one that finishes', r.messages.some((m) => m.kind === 'done' && m.attempt === lastAttempt), `last attempt ${lastAttempt}`);
check(
  'only the final pass prints (the host drops superseded ones)',
  logs.filter((l) => l === 'Do you accept the terms and conditions?').length === 2,
  logs.join(' | '),
);
check('a cancelled dialog ("") does not hang the run', (await run("var n = Number(prompt('How many?')); console.log('n=' + n);", [''])).messages.some((m) => m.kind === 'done'));
// The first version of the host loop tore the worker down on the FIRST message
// it saw, so a three-line run reported one line and then went silent -- an
// empty Output panel with nothing in the log to explain it. The protocol-level
// guard: every line arrives, and `done` arrives after them.
{
  const lines = await run("console.log(1); console.log(2); console.log(3);", []);
  const kinds = lines.messages.map((m) => m.kind);
  check(
    'every console.log line arrives, and done comes after them',
    lines.shown.join(',') === '1,2,3' && kinds[kinds.length - 1] === 'done',
    `shown=${lines.shown.join(',')} kinds=${kinds.join(',')}`,
  );
}
check(
  'a code with no prompt() is untouched by the handshake',
  (await run("console.log('plain');", [])).messages.filter((m) => m.kind === 'log').length === 1,
);
check(
  'a throw after a prompt is still reported as an error, not a dialog',
  (await run("prompt('a'); null.x;", ['ok'])).messages.some((m) => m.kind === 'error' && /x/.test(m.message || '')),
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);