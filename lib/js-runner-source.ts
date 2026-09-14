// Worker source for plain-JavaScript runs: no DOM, no canvas, console only.
// Lives here rather than inline because two callers need it now — the console
// lessons in LessonWorkspace and the sandbox's "JavaScript" mode.

// How long student code may run before we stop it. Generous for anything a
// beginner writes on purpose; short enough that a runaway loop does not feel
// like a crash.
export const RUN_TIMEOUT_MS = 3000;

// Ceiling on logs streamed back from the runner. `while (true) console.log(i)`
// would otherwise post millions of messages and lock the main thread — which
// is the exact failure the Worker exists to prevent.
export const RUN_MAX_LOGS = 1000;

export const RUNNER_SOURCE = `
const MAX = ${RUN_MAX_LOGS};
let sent = 0;
const ser = (a) => {
  if (typeof a !== 'object' || a === null) return String(a);
  try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
};
const cap = (type) => (...args) => {
  if (sent >= MAX) return;
  sent++;
  self.postMessage({
    kind: 'log',
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
self.onmessage = (e) => {
  try {
    new Function(e.data)(); // student code execution (educational tool)
    self.postMessage({ kind: 'done' });
  } catch (err) {
    // The Function constructor wraps student code in a synthesized
    // "function anonymous(\\n) {\\n" preamble -- exactly two lines -- before
    // the body starts, so a V8 stack frame's <anonymous>:LINE:COL maps back
    // to the student's own source at LINE - 2 (issue #25). Best-effort:
    // an engine whose stack doesn't match this shape just gets no line/col
    // rather than a wrong one.
    let line = null;
    let col = null;
    const stack = (err && err.stack) || '';
    const m = stack.match(/<anonymous>:(\\d+):(\\d+)/);
    if (m) {
      const rawLine = parseInt(m[1], 10) - 2;
      if (rawLine >= 1) { line = rawLine; col = parseInt(m[2], 10); }
    }
    self.postMessage({
      kind: 'error',
      name: (err && err.name) || 'Error',
      message: (err && err.message) || String(err),
      line,
      col,
    });
  }
};
`;
