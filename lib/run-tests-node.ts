// Node-side twin of the browser's "Run, then check the cases" path, for the
// scripts that grade reference solutions and starters (check-starters,
// test-runtime-tests, ...). NOT imported by the app.
//
// It does not re-implement anything: it drives the SAME RUNNER_SOURCE under
// worker_threads, feeds it the same request the browser host sends, and turns
// the same messages into results with the same createTestSession(). The kill
// timer works as in runStudentCode: RUN_TIMEOUT_MS for the script, then each
// test case's own budget, after which the Worker is terminated.

import { Worker } from 'worker_threads';
import { RUNNER_SOURCE, RUN_TIMEOUT_MS, type RunnerMessage } from './js-runner-source';
import { createTestSession, jobsFromRequirements, type TestJob, type TestRunResults } from './test-harness-source';
import { grade, type GradeContext, type GradeReport } from './grader';
import type { Requirement } from './types';

// A browser Worker has `self` === globalThis and a global postMessage; give the
// node one the same shape so student code that touches them behaves alike.
const SHIM = `
const { parentPort } = require('worker_threads');
globalThis.self = globalThis;
globalThis.postMessage = (v) => parentPort.postMessage(v);
${RUNNER_SOURCE}
parentPort.on('message', (data) => globalThis.onmessage({ data }));
`;

export interface NodeRun {
  /** Console output of the script itself (never the harness's). */
  logs: { type: string; message: string }[];
  /** How the run ended. */
  outcome: 'done' | 'error' | 'timeout';
  /** 'run' if the script itself hung, 'case' if a test case did. */
  timeoutPhase?: 'run' | 'case';
  error?: { name?: string; message?: string; line?: number | null };
  tests: TestRunResults;
}

export function runCodeWithTests(code: string, jobs: TestJob[], runTimeoutMs: number = RUN_TIMEOUT_MS): Promise<NodeRun> {
  return new Promise((resolve) => {
    const session = createTestSession(jobs);
    const logs: NodeRun['logs'] = [];
    const worker = new Worker(SHIM, { eval: true });
    let settled = false;
    let killer: ReturnType<typeof setTimeout>;

    const end = (outcome: NodeRun['outcome'], extra: Partial<NodeRun> = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      const how = outcome === 'timeout' ? 'timeout' : outcome === 'error' ? 'error' : 'done';
      const phase = session.inCasePhase() ? 'case' : 'run';
      const tests = session.finish(how, code);
      void worker.terminate();
      resolve({ logs, outcome, tests, ...(outcome === 'timeout' ? { timeoutPhase: phase as 'run' | 'case' } : {}), ...extra });
    };
    const arm = (ms: number) => {
      clearTimeout(killer);
      killer = setTimeout(() => end('timeout'), ms);
    };
    arm(runTimeoutMs);

    worker.on('message', (d: RunnerMessage) => {
      const r = session.accept(d);
      if (r.consumed) {
        if (r.armMs) arm(r.armMs);
        return;
      }
      if (d.kind === 'log') { logs.push({ type: d.type || 'log', message: d.message || '' }); return; }
      if (d.kind === 'done') end('done');
      else if (d.kind === 'error') end('error', { error: { name: d.name, message: d.message, line: d.line } });
    });
    worker.on('error', (e: Error) => end('error', { error: { name: e.name, message: e.message } }));
    worker.postMessage({ code, answers: [], attempt: 1, tests: session.payload });
  });
}

/**
 * grade() with the `tests` requirements evaluated: runs script.js once in the
 * runner when any requirement needs it, then grades with the results in the
 * context. Without a `tests` requirement this is plain grade().
 */
export async function gradeWithTests(
  reqs: Requirement[],
  files: Record<string, string>,
  passingScore: number = 0,
  context: GradeContext = {},
): Promise<GradeReport> {
  const jobs = jobsFromRequirements(reqs);
  if (jobs.length === 0) return grade(reqs, files, passingScore, context);
  const run = await runCodeWithTests(files['script.js'] ?? '', jobs);
  return grade(reqs, files, passingScore, { ...context, testResults: run.tests });
}
