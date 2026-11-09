// The console-lesson runner must survive code that never returns.
//
// Module 2.4 teaches infinite loops on purpose, so students write `while (true)`
// deliberately. Synchronous JavaScript cannot be interrupted — the only way to
// stop it is to terminate the worker running it, which is why
// The console runner (lib/js-runner-source.ts, used by LessonWorkspace and the
// sandbox's JavaScript mode) runs student code in a Worker rather than calling
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
import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = readFileSync(path.join(root, 'lib', 'js-runner-source.ts'), 'utf8');

// Pull the runner source and the two limits straight out of the component, so
// this test fails if they are edited apart rather than silently testing a copy.
const m = component.match(/const RUNNER_SOURCE = `([\s\S]*?)\n`;/);
if (!m) { console.error('FAIL  could not find RUNNER_SOURCE in lib/js-runner-source.ts'); process.exit(1); }
const TIMEOUT = Number((component.match(/const RUN_TIMEOUT_MS = (\d+);/) || [])[1]);
const MAX_LOGS = Number((component.match(/const RUN_MAX_LOGS = (\d+);/) || [])[1]);
if (!TIMEOUT || !MAX_LOGS) { console.error('FAIL  could not read RUN_TIMEOUT_MS / RUN_MAX_LOGS'); process.exit(1); }

// The limits still come from the file text above, but the runner body must be
// COMPILED: reading the template literal out by regex hands back the source with
// its backslash escapes still doubled, which is not the JavaScript a browser
// runs and does not even parse. Same approach as test-js-docs.mjs.
const runnerSource = readRunnerSource();
if (runnerSource === null) {
  console.error('FAIL  lib/js-runner-source.ts did not compile');
  process.exit(1);
}

function readRunnerSource() {
  const dir = mkdtempSync(path.join(tmpdir(), 'shcode-runner-timeout-'));
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/js-runner-source.ts', '--outDir', dir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ], { cwd: root, stdio: 'ignore' });
    writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}');
    const req = createRequire(path.join(dir, 'noop.cjs'));
    return req(path.join(dir, 'js-runner-source.js')).RUNNER_SOURCE;
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

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

// 6. On a summative part, the stop message must not diagnose. 2.7.3's bug 4 is a
// while-continue that never advances; the practice-path message names the repair
// ("check that the value in the condition actually changes"), which is the same
// giveaway the 2026-09-02 checklist narrowing stripped out of Part C — reappearing
// one layer down, from the platform. The stop itself must still report.
{
  const lesson = JSON.parse(readFileSync(path.join(root, 'lessons', '2-7-3-ch2-individual-pa-find-and-fix', 'lesson.json'), 'utf8'));
  check('2-7-3 is grading-summative (the fixture this guards)', lesson.grading?.summative === true,
    JSON.stringify(lesson.grading));
  const componentText = readFileSync(path.join(root, 'components', 'LessonWorkspace.tsx'), 'utf8');
  const DIAGNOSIS = 'check that the value in the condition actually changes';
  const stillRunning = componentText.match(/`[^`]*still running[^`]*`/g) ?? [];
  check('the component composes a still-running stop message', stillRunning.length >= 1,
    'no still-running template found in LessonWorkspace.tsx');
  const guarded = /const summative\s*=\s*lesson\.grading\?\.summative\s*===\s*true/.test(componentText);
  check('every stop message that carries the diagnosis is behind a summative guard',
    stillRunning.every((tpl) => !tpl.includes(DIAGNOSIS) || guarded),
    'a diagnosis-carrying message exists with no summative guard in the component');
  const diagnosisTemplate = stillRunning.find((tpl) => tpl.includes(DIAGNOSIS));
  const cleanTemplate = stillRunning.find((tpl) => !tpl.includes(DIAGNOSIS));
  check('a summative variant of the stop message exists and omits the diagnosis',
    guarded && !!diagnosisTemplate && !!cleanTemplate,
    'no diagnosis-free stop message beside the diagnosed one, or no summative guard');
}

// 7. Timers. The standalone sandbox opts in (`timers`) so setTimeout and
// setInterval callbacks run and their output streams in; every lesson leaves
// it off, so a lab still ends after its synchronous pass. This drives the REAL
// host, runStudentCode, with a Worker stand-in that runs the same
// RUNNER_SOURCE under worker_threads.
{
  const { runStudentCode, timerLimitMessage, TIMER_RUN_LIMIT_MS } = await import(path.join(root, 'lib', 'js-runner-source.ts'));
  const VM_SHIM = `
const { parentPort } = require('worker_threads');
globalThis.self = globalThis;
globalThis.postMessage = (v) => parentPort.postMessage(v);
require('vm').runInThisContext(${JSON.stringify(runnerSource)});
parentPort.on('message', (data) => globalThis.onmessage({ data }));
`;
  // A browser Worker as runStudentCode uses it: onmessage/onerror, postMessage,
  // terminate() (after which nothing more is delivered).
  globalThis.Worker = class {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
      this.dead = false;
      this.w = new Worker(VM_SHIM, { eval: true });
      this.w.on('message', (data) => { if (!this.dead && this.onmessage) this.onmessage({ data }); });
      this.w.on('error', (e) => { if (!this.dead && this.onerror) this.onerror({ message: e.message }); });
    }
    postMessage(m) { this.w.postMessage(m); }
    terminate() { this.dead = true; void this.w.terminate(); }
  };
  const promptAnswers = [];
  globalThis.window = { prompt: () => promptAnswers.shift() ?? '' };

  /** One run through runStudentCode: what the sandbox would show, and how it ended. */
  const host = (code, opts, { killAfter } = {}) => new Promise((resolve) => {
    const t0 = Date.now();
    const lines = [];
    const at = [];
    let superseded = 0;
    let settled = false;
    const end = (how, extra = {}) => {
      if (settled) return;
      settled = true;
      // Anything that arrives after the end would be a bug: wait a moment and keep it.
      const after = lines.length;
      setTimeout(() => resolve({ how, lines, at, superseded, ms: Date.now() - t0, late: lines.slice(after), ...extra }), 250);
    };
    const run = runStudentCode(
      code,
      (d) => {
        if (d.kind === 'log') { lines.push(d.message); at.push(Date.now() - t0); return; }
        end(d.kind, { error: d.kind === 'error' ? d : null });
      },
      (info) => end('timeout', { phase: info.phase }),
      () => { superseded++; lines.length = 0; at.length = 0; },
      opts,
    );
    if (killAfter) setTimeout(() => { run.kill(); end('killed'); }, killAfter);
  });

  check('timers: the sandbox limit is 30 seconds', TIMER_RUN_LIMIT_MS === 30000, TIMER_RUN_LIMIT_MS);
  {
    const r = await host("console.log('first'); setTimeout(() => console.log('later'), 400);", { timers: true });
    check('timers: setTimeout output arrives after the synchronous output', r.how === 'done' && r.lines.join('|') === 'first|later', JSON.stringify(r));
    check('timers: ...as it happens, not batched at the end', r.at[0] < 300 && r.at[1] >= 380, JSON.stringify(r.at));
    check('timers: the run ends once nothing is waiting', r.ms - 250 < 1000 && r.late.length === 0, `${r.ms}ms`);
  }
  {
    const r = await host("let n = 0;\nconst id = setInterval(() => {\n  n++;\n  console.log('tick ' + n);\n  if (n === 3) clearInterval(id);\n}, 60);", { timers: true });
    check('timers: a setInterval cleared after 3 ticks prints tick 1..3 and ends the run', r.how === 'done' && r.lines.join('|') === 'tick 1|tick 2|tick 3' && r.late.length === 0, JSON.stringify(r));
  }
  {
    const r = await host("setInterval(() => console.log('x'), 100);", { timers: { limitMs: 900 } });
    check('timers: an uncleared setInterval is stopped at the limit, as a timers stop', r.how === 'timeout' && r.phase === 'timers', JSON.stringify({ how: r.how, phase: r.phase }));
    check('timers: ...at the limit, not before and not much after', r.ms - 250 >= 850 && r.ms - 250 < 1800, `${r.ms - 250}ms`);
    check('timers: ...having printed until then, and nothing after', r.lines.length >= 5 && r.late.length === 0, `${r.lines.length} lines, ${r.late.length} late`);
    const msg = timerLimitMessage();
    check('timers: the stop message is about timers, in plain words, not the stuck-loop one',
      /^Stopped after 30 seconds\./.test(msg) && /Timers keep a program running/.test(msg) && /Stop/.test(msg) && !/loop/i.test(msg), msg);
    const sandbox = readFileSync(path.join(root, 'components', 'SandboxWorkspace.tsx'), 'utf8');
    check('timers: the sandbox opts in and shows the timers message for a timers stop',
      /\{\s*timers:\s*true\s*\}/.test(sandbox) && /info\.phase === 'timers'\s*\?\s*timerLimitMessage\(\)/.test(sandbox), 'see components/SandboxWorkspace.tsx runJs');
  }
  {
    const r = await host("console.log('a');\nsetTimeout(() => {\n  undefinedFn();\n}, 50);", { timers: true });
    check('timers: an error inside a callback is reported like any error, with its line',
      r.how === 'error' && r.error?.name === 'ReferenceError' && /undefinedFn/.test(r.error?.message) && r.error?.line === 3 && r.lines.join('|') === 'a',
      JSON.stringify(r.error));
  }
  {
    const r = await host("setTimeout(() => { while (true) {} }, 20);", { timers: { limitMs: 20000 } });
    check('timers: a callback stuck in a loop is stopped like a stuck script, not after the timers limit',
      r.how === 'timeout' && r.phase === 'run' && r.ms - 250 < 5000, JSON.stringify({ how: r.how, phase: r.phase, ms: r.ms - 250 }));
  }
  {
    promptAnswers.push('Ana');
    const r = await host("console.log('start');\nsetTimeout(() => {\n  const n = prompt('Your name?');\n  console.log('hi ' + n);\n}, 50);", { timers: true });
    check('timers: prompt() in a callback still re-runs with the answer', r.how === 'done' && r.superseded === 1 && r.lines.join('|') === 'start|hi Ana', JSON.stringify(r));
  }
  {
    const r = await host("setInterval(() => console.log('x'), 50);", { timers: true }, { killAfter: 400 });
    check('timers: Stop (kill) ends it at once and nothing more arrives', r.how === 'killed' && r.late.length === 0, JSON.stringify({ how: r.how, late: r.late.length }));
  }
  {
    // A lesson's run: no opt-in. Unchanged: done right after the synchronous
    // pass, the timer's output never arrives. (The time bound only rules out waiting for the 30 s timers limit;
    // 100 ms flaked at 117 under npm test's load, 2026-11-08.)
    const r = await host("console.log('a'); setTimeout(() => console.log('b'), 100);", undefined);
    check('lab mode (no opt-in): still ends after the synchronous pass', r.how === 'done' && r.lines.join('|') === 'a' && r.ms - 250 < 400, JSON.stringify({ how: r.how, lines: r.lines, ms: r.ms - 250 }));
    await new Promise((res) => setTimeout(res, 150));
    check('lab mode (no opt-in): a pending timer\'s output never shows', r.lines.join('|') === 'a' && r.late.length === 0, JSON.stringify(r.lines));
    const s = await host('while (true) {}', {});
    check('lab mode (no opt-in): a stuck script is still stopped as a run timeout', s.how === 'timeout' && s.phase === 'run', JSON.stringify({ how: s.how, phase: s.phase }));
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}  (component timeout is ${TIMEOUT}ms, log cap ${MAX_LOGS})`);
process.exit(failures === 0 ? 0 : 1);
