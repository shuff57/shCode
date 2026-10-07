// Worker source for plain-JavaScript runs: no DOM, no canvas, console only.
// Lives here rather than inline because four callers need it — the console
// lessons in LessonWorkspace, the sandbox's "JavaScript" mode, the live blocks
// in the book, and the docs-drawer snippets.
//
// WHERE IT RUNS, AND WHY NOT AN IFRAME. Student code runs in a Worker because
// that is the only way to stop synchronous JS: a runaway loop cannot be
// interrupted by a timeout, so module 2.4's `while (true)` lesson needs
// something that can be terminated. An iframe was tried and rejected — a
// sandboxed frame is an opaque origin, and Chromium schedules those in the
// PARENT's process, so a spinning frame froze the whole lesson page for the
// full duration with the kill timer unable to fire (measured: 60s spin, 60s
// frozen tab; `credentialless` did not change it). The Worker's terminate() is
// the guarantee, so the Worker stays.
//
// WHAT THAT COSTS: a Worker has no window, so `prompt` does not exist in here.
// 3.1.9's Terms and Conditions Loop — student code, reference solution and a
// graded requirement — died on `ReferenceError: prompt is not defined`, and a
// synchronous prompt() cannot be bridged out of a Worker either, because the
// Worker blocks inside the call and so cannot receive the answer. Hence the
// prompt() handshake below: the run stops at the first unanswered prompt(),
// the HOST raises the real dialog, and the run restarts with one more answer in
// the list. See NEEDS_INPUT for the whole mechanism.

// How long student code may run before we stop it. Generous for anything a
// beginner writes on purpose; short enough that a runaway loop does not feel
// like a crash.
export const RUN_TIMEOUT_MS = 3000;

// Ceiling on logs streamed back from the runner. `while (true) console.log(i)`
// would otherwise post millions of messages and lock the main thread — which is
// the exact failure the Worker exists to prevent.
export const RUN_MAX_LOGS = 1000;

import { TEST_HARNESS_SOURCE, createTestSession, type TestJob, type TestRunResults } from './test-harness-source';

// The Function constructor's preamble is exactly two lines (see the parse in
// RUNNER_SOURCE), so a V8 stack line is the student's line + 2.
const FUNCTION_PREAMBLE_LINES = 2;

// Every console surface renders an error the same way: name, message, then
// where it happened. This is that one formatter, so a line number cannot be
// quietly dropped by a caller that stringifies the payload on its own.
export function errorWithLocation(
  name?: string,
  message?: string,
  line?: number | null,
  col?: number | null,
): string {
  const where = line ? ` (line ${line}${col ? `, col ${col}` : ''})` : '';
  return `${name || 'Error'}: ${message || ''}${where}`;
}

// What a host sends: the script, plus the answers collected so far and which
// attempt this is. A bare string is still accepted, which is what the node
// harnesses in scripts/ post.
export interface RunnerRequest {
  code: string;
  answers?: string[];
  attempt?: number;
  /** Runtime test cases (lib/test-harness-source.ts): run after the script,
   *  from the runner's own closure, tagged with a nonce the script never sees. */
  tests?: { jobs: TestJob[]; nonce: string };
}

// What a host gets back. `needs-input` is the prompt handshake; `attempt` is on
// every message because a re-run re-prints what the last one printed, and the
// host keeps only the newest attempt's lines.
export interface RunnerMessage {
  kind: 'log' | 'needs-input' | 'done' | 'error';
  attempt?: number;
  type?: 'log' | 'warn' | 'error';
  message?: string;
  name?: string;
  line?: number | null;
  col?: number | null;
  /** On the final message of a run that was given test jobs: one result per
   *  `tests` requirement. Absent when the run was not asked to test. */
  tests?: TestRunResults;
}

/** What the host's kill timer reports. `phase: 'case'` means the script itself
 *  finished and one test case then ran too long; `tests` carries every result
 *  gathered up to that point, the case that hung marked as not finished. */
export interface RunTimeout {
  phase: 'run' | 'case';
  tests?: TestRunResults;
}

// The no-Worker fallback (very old browsers) runs `new Function` on the main
// thread, where there is no runner to do the parsing, so it parses here.
//
// The innermost frame is where the throw happened, and its spelling varies by
// engine: `<anonymous>:3:18` in a browser Worker, `at blob:...:3:18`, or
// `at anonymous (file:///x:3:18)` under node. Matching one exact format meant
// a line number that silently never appeared in the browser, so this takes the
// trailing line:col of the first frame that has one.
//
// Best-effort: a stack with no locatable frame gets no line rather than a
// wrong one.
export function lineColOf(err: unknown): { line: number | null; col: number | null } {
  const stack = (err instanceof Error && err.stack) || '';
  // slice(1) drops the "TypeError: message" line, which can itself hold colons.
  const frame = String(stack).split('\n').slice(1).find((l) => /:\d+:\d+/.test(l));
  const m = frame && frame.match(/:(\d+):(\d+)\)?\s*$/);
  if (!m) return { line: null, col: null };
  const line = parseInt(m[1], 10) - FUNCTION_PREAMBLE_LINES;
  return line >= 1 ? { line, col: parseInt(m[2], 10) } : { line: null, col: null };
}

/**
 * Run student code in the shared runner and read the results.
 *
 * Owns the prompt handshake so no caller has to: each `needs-input` raises the
 * browser's own dialog and re-runs with the answer.
 *
 * That re-run REPRINTS everything the last one printed, so `onSuperseded` fires
 * when an answer restarts the run and the caller drops what it has already
 * shown. It lives here rather than in each caller because forgetting it means
 * the student watches the same lines appear three times — silent, and easy to
 * miss in review.
 *
 * The 3-second kill timer is the caller's (each surface words its own message),
 * but it is NOT reset while a dialog is up: a modal blocks the page anyway, so
 * a student who walks away from a prompt lab comes back to the dialog waiting.
 */
export function runStudentCode(
  code: string,
  onMessage: (m: RunnerMessage) => void,
  onTimeout: (info: RunTimeout) => void,
  onSuperseded: () => void,
  opts?: { tests?: TestJob[] },
): { kill: () => void } {
  const url = URL.createObjectURL(new Blob([RUNNER_SOURCE], { type: 'text/javascript' }));
  const worker = new Worker(url);
  const answers: string[] = [];
  let attempt = 1;

  // Test jobs (see lib/test-harness-source.ts). Each attempt gets a fresh
  // session and so a fresh nonce: a prompt() restart re-sends the request, and
  // a listener the script left behind must not be able to reuse an old one.
  const jobs = opts?.tests && opts.tests.length ? opts.tests : null;
  let session = jobs ? createTestSession(jobs) : null;

  let killer: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    clearTimeout(killer);
    worker.terminate();
    URL.revokeObjectURL(url);
  };
  // The kill timer terminates the Worker itself, then tells the caller. A
  // case-phase timer is re-armed per test case, so a hung case is reported
  // against its own budget and the results that already came in survive.
  const arm = (ms: number) => {
    clearTimeout(killer);
    killer = setTimeout(() => {
      const phase = session && session.inCasePhase() ? 'case' : 'run';
      const tests = session ? session.finish('timeout', code) : undefined;
      cleanup();
      onTimeout({ phase, tests });
    }, ms);
  };
  arm(RUN_TIMEOUT_MS);

  worker.onmessage = (e: MessageEvent) => {
    if (session) {
      const r = session.accept(e.data);
      if (r.consumed) {
        if (r.armMs) arm(r.armMs);
        return;
      }
    }
    const d = e.data as RunnerMessage;
    // A newer attempt supersedes everything printed by the one before it.
    if (d.attempt && d.attempt !== attempt) {
      attempt = d.attempt;
      answers.length = 0;
    }
    if (d.kind === 'needs-input') {
      // Everything printed so far belongs to a run that is about to happen
      // again; the caller's lines go with it.
      onSuperseded();
      // Cancel returns null; '' keeps the rest of the program running instead
      // of turning a dismissed dialog into a crash.
      answers.push(window.prompt(d.message || '') ?? '');
      attempt += 1;
      if (jobs) session = createTestSession(jobs);
      worker.postMessage({ code, answers: answers.slice(), attempt, tests: session?.payload } satisfies RunnerRequest);
      return;
    }
    // A log is not the end of the run. Only `done`, `error` and `needs-input`
    // are, and needs-input has returned above -- so anything that is not a log
    // tears the worker down. Getting this wrong kills the run after its first
    // line, which shows the student an empty panel and no clue why.
    if (session && d.kind === 'done') d.tests = session.finish('done', code);
    else if (session && d.kind === 'error') d.tests = session.finish('error', code);
    onMessage(d);
    if (d.kind !== 'log') cleanup();
  };
  worker.onerror = (e: ErrorEvent) => {
    const tests = session ? session.finish('error', code) : undefined;
    cleanup();
    onMessage({ kind: 'error', message: e.message || 'Error', tests });
  };

  worker.postMessage({ code, answers: [], attempt, tests: session?.payload } satisfies RunnerRequest);
  return { kill: cleanup };
}

export const RUNNER_SOURCE = `
${TEST_HARNESS_SOURCE}
const MAX = ${RUN_MAX_LOGS};
let sent = 0;
// Which pass of the script this is. A prompt() answer restarts the run, so the
// host is told which pass each message belongs to and keeps only the last.
let attempt = 1;
let answers = [];
let promptMessage = '';
// Thrown to unwind out of the student's prompt() call. A Worker has no window,
// so prompt() cannot be answered from in here; the host asks and re-runs.
const NEEDS_INPUT = { needInput: true };
self.prompt = function (message) {
  if (answers.length === 0) {
    promptMessage = message === undefined ? '' : String(message);
    throw NEEDS_INPUT;
  }
  return answers.shift();
};
const ser = (a) => {
  if (typeof a !== 'object' || a === null) return String(a);
  try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
};
const cap = (type) => (...args) => {
  if (sent >= MAX) return;
  sent++;
  self.postMessage({
    kind: 'log',
    attempt,
    type,
    message: sent === MAX
      ? '… output stopped after ' + MAX + ' lines. If you did not mean to print this much, check your loop.'
      : args.map(ser).join(' '),
  });
};
console.log = cap('log');
console.warn = cap('warn');
console.error = cap('error');
// A Worker has no window, so localStorage does not exist there. Module 3.8
// teaches the save-by-key pattern in this runner, and the book's own section
// editor runs it for real, so supply a small in-memory stand-in: save, load,
// parse and the missing-key check all run for real within the one run. The
// "survives the page closing" half is what only a real browser adds, and the
// lesson's prose says so. Same shim the docs drawer has always injected --
// moved here so every console surface (Lessons, sandbox, docs, live blocks)
// gets it from one place.
const __store = new Map();
const localStorage = {
  setItem: (k, v) => { __store.set(String(k), String(v)); },
  getItem: (k) => (__store.has(String(k)) ? __store.get(String(k)) : null),
  removeItem: (k) => { __store.delete(String(k)); },
  clear: () => { __store.clear(); },
};
// Where a compile error is. V8 reports a SyntaxError from the Function
// constructor without a position in the student's code, so ask the engine
// instead: the error is on the first line whose prefix already fails with the
// SAME message as the whole file. An error that is only about the code ending
// too soon (an unclosed brace or template) is reported on the last line that
// has anything on it, which is where the closing half is missing.
function locateSyntaxError(code, message) {
  const lines = String(code).split('\\n');
  if (lines.length > 2000) return null;
  // JavaScriptCore says "Unexpected EOF" for an unclosed brace AND for an
  // unterminated string, so there it is not possible to tell which line is meant:
  // no line is better than the wrong one.
  if (/unexpected eof/i.test(message)) return null;
  const lastLine = () => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() !== '') return i + 1;
    }
    return null;
  };
  if (/end of (input|script)|unterminated template/i.test(message)) return lastLine();
  // V8's Function constructor closes the body with a synthetic "}" of its own, so
  // an unclosed brace or bracket swallows it and surfaces as "Unexpected token ')'"
  // instead of "end of input". If appending a closer makes the file parse, the
  // file simply ends too soon. A stray ")" the student really typed does not
  // parse with a closer added, so it falls through to the line-by-line search.
  const closers = ['}', ')', ']', '}}', '})', '}]', '))', ')}'];
  for (let c = 0; c < closers.length; c++) {
    try {
      new Function(String(code) + '\\n' + closers[c]);
      return lastLine();
    } catch (e) { /* not this closer */ }
  }
  for (let k = 1; k <= lines.length; k++) {
    try {
      new Function(lines.slice(0, k).join('\\n'));
    } catch (e) {
      if (e && e.name === 'SyntaxError' && e.message === message) return k;
    }
  }
  return null;
}
self.onmessage = (e) => {
  // {code, answers, attempt} from a browser host; a bare string from the node
  // harnesses in scripts/, which have no dialog to raise.
  const req = typeof e.data === 'string' ? { code: e.data } : (e.data || {});
  answers = Array.isArray(req.answers) ? req.answers.slice() : [];
  attempt = req.attempt || 1;
  sent = 0;
  let compiled = false;
  let codeText = '';
  try {
    codeText = req.code;
    const runStudent = new Function(codeText); // a compile error is thrown HERE, before any student line runs
    compiled = true;
    // With test jobs, the SAME script is compiled once more with a trailing
    // statement that returns its functions, and that copy is the one run: the
    // script still runs exactly once, so its output and side effects are
    // unchanged. If the extra statement will not compile (a stray top-level
    // return, say) the plain copy runs and the checks report "did not run".
    const tj = req.tests && Array.isArray(req.tests.jobs) && typeof req.tests.nonce === 'string' ? req.tests : null;
    let withTests = null;
    if (tj) {
      try { withTests = new Function(codeText + '\\n;' + __testLookupSource(tj.jobs)); } catch (_) { withTests = null; }
    }
    const fns = (withTests || runStudent)(); // student code execution (educational tool)
    if (tj && withTests) __runTestJobs(tj.jobs, fns, tj.nonce);
    self.postMessage({ kind: 'done', attempt });
  } catch (err) {
    if (err === NEEDS_INPUT) {
      // Not a crash: the run is paused at a prompt() waiting for the host to
      // raise the dialog and post the script back with one more answer.
      self.postMessage({ kind: 'needs-input', message: promptMessage, attempt });
      return;
    }
    // The Function constructor wraps student code in a synthesized
    // "function anonymous(\\n) {\\n" preamble -- exactly two lines -- before
    // the body starts, so a V8 stack frame's line maps back to the student's
    // own source at LINE - 2 (issue #25).
    //
    // The innermost frame is where the throw happened. Its spelling varies by
    // engine -- <anonymous>:3:18 in a browser Worker, at blob:...:3:18, at
    // anonymous (file:///x:3:18) elsewhere -- so take the trailing line:col of
    // the first frame that has one rather than matching one exact format, which
    // is what kept a browser's line number from ever appearing.
    let line = null;
    let col = null;
    const stack = (err && err.stack) || '';
    const frame = String(stack).split('\\n').slice(1).find((l) => /:\\d+:\\d+/.test(l));
    const m = frame && frame.match(/:(\\d+):(\\d+)\\)?\\s*$/);
    if (m) {
      const rawLine = parseInt(m[1], 10) - ${FUNCTION_PREAMBLE_LINES};
      if (rawLine >= 1) { line = rawLine; col = parseInt(m[2], 10); }
    }
    // A SyntaxError thrown by the Function constructor is raised before any
    // student line runs, so its stack holds only THIS runner's own frame: every
    // compile error used to read "line 59, col 5" whatever the file said.
    // The real position is not in the error, so it is found from the code.
    if (!compiled && err && err.name === 'SyntaxError') {
      line = locateSyntaxError(codeText, String(err.message));
      col = null;
    }
    self.postMessage({
      kind: 'error',
      attempt,
      name: (err && err.name) || 'Error',
      message: (err && err.message) || String(err),
      line,
      col,
    });
  }
};
`;
