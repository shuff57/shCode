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
  let compiled = false;
  let codeText = '';
  try {
    codeText = e.data;
    const runStudent = new Function(codeText); // a compile error is thrown HERE, before any student line runs
    compiled = true;
    runStudent(); // student code execution (educational tool)
    self.postMessage({ kind: 'done' });
  } catch (err) {
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
      name: (err && err.name) || 'Error',
      message: (err && err.message) || String(err),
      line,
      col,
    });
  }
};
`;
