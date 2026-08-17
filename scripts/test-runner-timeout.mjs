// The console-lesson runner must survive code that never returns.
//
// Module 2.4 teaches infinite loops on purpose, so students write `while (true)`
// deliberately. Synchronous JavaScript cannot be interrupted — the only way to
// stop it is to terminate the worker running it, which is why
// LessonWorkspace.tsx runs student code in a Worker rather than calling
// `new Function(...)()` on the main thread.
//
// This checks that contract. It runs the real RUNNER_SOURCE extracted from the
// component, under node's worker_threads with a small shim for the browser
// Worker globals (`self.postMessage` / `self.onmessage`). Termination
// semantics are the same in both: terminate() kills synchronous code.

import { Worker } from 'worker_threads';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = readFileSync(path.join(root, 'components', 'LessonWorkspace.tsx'), 'utf8');

// Pull the runner source and the two limits straight out of the component, so
// this test fails if they are edited apart rather than silently testing a copy.
const m = component.match(/const RUNNER_SOURCE = `([\s\S]*?)\n`;/);
if (!m) { console.error('FAIL  could not find RUNNER_SOURCE in LessonWorkspace.tsx'); process.exit(1); }
const TIMEOUT = Number((component.match(/const RUN_TIMEOUT_MS = (\d+);/) || [])[1]);
const MAX_LOGS = Number((component.match(/const RUN_MAX_LOGS = (\d+);/) || [])[1]);
if (!TIMEOUT || !MAX_LOGS) { console.error('FAIL  could not read RUN_TIMEOUT_MS / RUN_MAX_LOGS'); process.exit(1); }

// The component interpolates RUN_MAX_LOGS into the template literal; do the same.
const runnerSource = m[1].replace(/\$\{RUN_MAX_LOGS\}/g, String(MAX_LOGS));

const SHIM = `
import { parentPort } from 'worker_threads';
const self = { postMessage: (v) => parentPort.postMessage(v), onmessage: null };
${runnerSource}
parentPort.on('message', (data) => self.onmessage({ data }));
`;

function run(code, timeoutMs) {
  return new Promise((resolve) => {
    const logs = [];
    let settled = false;
    const w = new Worker(SHIM, { eval: true });
    const done = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      w.terminate();
      resolve({ outcome, logs });
    };
    const killer = setTimeout(() => done('timeout'), timeoutMs);
    w.on('message', (d) => {
      if (d.kind === 'log') { logs.push(d); return; }
      done(d.kind); // 'done' | 'error'
    });
    w.on('error', () => done('error'));
    w.postMessage(code);
  });
}

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  -- ${detail}`}`);
  if (!cond) failures++;
};

console.log('console runner: terminates runaway code\n');

// 1. The whole point: a synchronous infinite loop must not outlive the timeout.
{
  const t0 = Date.now();
  const r = await run('while (true) {}', 1500);
  const elapsed = Date.now() - t0;
  check('an infinite loop is stopped, not left running', r.outcome === 'timeout', `got "${r.outcome}"`);
  check('it is stopped at the deadline, not later', elapsed < 3000, `took ${elapsed}ms`);
}

// 2. Ordinary code still runs and its output still comes back.
{
  const r = await run('console.log("hello"); console.log(1 + 1);', 3000);
  check('normal code completes', r.outcome === 'done', `got "${r.outcome}"`);
  check('its output is captured', r.logs.map((l) => l.message).join('|') === 'hello|2',
    JSON.stringify(r.logs.map((l) => l.message)));
}

// 3. A thrown error is reported rather than swallowed — 2.5 depends on this.
{
  const r = await run('undefinedFunction();', 3000);
  check('a runtime error is reported', r.outcome === 'error', `got "${r.outcome}"`);
}

// 4. A loop that prints forever must not flood the main thread with messages.
{
  const r = await run('let i = 0; while (true) { console.log(i++); }', 2000);
  check('runaway output is capped', r.logs.length <= MAX_LOGS,
    `${r.logs.length} logs posted, cap is ${MAX_LOGS}`);
  check('the cap explains itself to the student',
    r.logs.length === 0 || /output stopped after/.test(r.logs[r.logs.length - 1].message),
    JSON.stringify(r.logs[r.logs.length - 1]?.message));
}

// 5. Output produced before a hang is not lost — it is streamed, not batched.
{
  const r = await run('console.log("before the hang"); while (true) {}', 1500);
  check('logs from before a hang survive', r.logs.some((l) => l.message === 'before the hang'),
    JSON.stringify(r.logs.map((l) => l.message)));
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}  (component timeout is ${TIMEOUT}ms, log cap ${MAX_LOGS})`);
process.exit(failures === 0 ? 0 : 1);
