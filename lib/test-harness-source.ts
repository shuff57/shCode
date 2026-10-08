// Runtime test cases for a console lesson: the `tests` requirement type.
//
// WHY. The regex graders only see the SHAPE of code, so wrong-but-shaped code
// passes: findMax returning the smaller value, isEven testing n % 3, a sum that
// adds 1 instead of i. A `tests` requirement calls the student's own function
// with fixed arguments and compares what comes back (or what it prints).
//
// HOW IT RUNS. Once, in the SAME Worker run as the Run button (lib/js-runner-
// source.ts). The runner compiles the student's script with one extra trailing
// statement, `return { findMax: <the function or undefined>, ... }`, so the
// functions come back as the script's return value -- no name is injected into
// the student's scope and the harness's own variables never share it. The
// cases are then called from the runner's closure, outside student scope.
//
// ONE SOURCE. TEST_HARNESS_SOURCE below is embedded into RUNNER_SOURCE, so the
// browser Worker and the node runner (lib/run-tests-node.ts, which drives that
// same RUNNER_SOURCE under worker_threads) cannot diverge. The pure pieces that
// turn the runner's messages into per-requirement results (createTestSession)
// are here too and are used by both hosts.
//
// THREAT MODEL, honestly. This is formative classroom grading; a student can
// only cheat themselves, and the case data ships in lesson.json to the browser,
// so a student who reads it can hard-code the answers. A summative or capped
// part would need cases held on the server (not built). What IS defended:
//   * Forged results. Every harness message carries a random per-attempt nonce
//     the host generates and sends with the run. The nonce is read only inside
//     the runner's closure; student code never sees it. A student's
//     postMessage({kind:'test-case', ...}) without the nonce is ignored, and a
//     faked early {kind:'done'} leaves the checks unfinished, which fails.
//   * Tampering with postMessage. The harness binds postMessage at worker load,
//     before any student code exists.
//   * A fake line in the console. Results never travel as console text.
// NOT defended: a student patching built-ins such as JSON or Array.prototype to
// bend the comparison. That is deliberate sabotage of their own grade.
//
// CASE FIELDS AND WHEN TO USE WHICH (the conversion guide).
//   expect              the RETURN value, exact (deep equality, numeric
//                       `tolerance`). Use for numbers, booleans, arrays,
//                       objects: that is correctness, not wording.
//   expectOutput        the printed lines, EXACT, line by line. Use only when
//                       the lesson's steps dictate the exact text ("print
//                       exactly Hello, Sam!") or the lines ARE the substance
//                       (one price per line, nothing else).
//   expectOutputContains  each string must appear in the printed text
//                       (case-insensitive, whitespace collapsed). Use when the
//                       steps ask for a result but not a wording: "The area is
//                       12", "Area = 12" and "12" all pass for ["12"].
//   expectContains / expectContainsAll   the same, for a string RETURN value
//                       ("Cannot divide by zero" and "zero is not allowed" both
//                       contain "zero").
//   A needle that is a plain number ("12", "-3", "6.5") matches only as a whole
//   number token: "12" is not found in "112", "212", "12.5", "-12" or "1.12",
//   but is found in "12", "12.", "= 12 units", "12,". A comma between thousands
//   groups is ignored in the printed text ("1,200" reads as 1200). Any other
//   needle is a plain substring test.
//   `function` may be one name or an array of acceptable names (the first one
//   the student defined is called); use an array only when the steps let the
//   student choose the name.
//   All fields given on a case must hold. Failure messages name the first
//   failing case only; a `hidden` case says only "A hidden check failed."
//
// JSON TAGS. JSON cannot say undefined, NaN, Infinity or -0, so a value of the
// exact shape {"$":"undefined"} / {"$":"NaN"} / {"$":"Infinity"} /
// {"$":"-Infinity"} / {"$":"-0"} anywhere in `args`, `expect` or `after` stands
// for that value.
//
// SCRIPT-LEVEL CHECKS (a `tests` requirement with no function). For a lab whose
// code is top-level statements (array labs before array parameters are taught),
// check what the script LEFT BEHIND instead of calling a function. Fields sit on
// the requirement itself, beside or instead of `function` + `cases`:
//   variables   [{name, expect?, fail?, hidden?}]  after the script has run once,
//               the named TOP-LEVEL let/const/var is read and compared with
//               `expect` (deep equality, `tolerance`, the JSON tags above). Omit
//               `expect` to require only that it exists. A declared variable
//               holding undefined is found; a name never declared is missing:
//               "I could not find a variable called scores. Check its name."
//               Mismatch: "scores should end as [77, 85] but is [72, 85]" (`fail`
//               replaces that sentence; `hidden` says only "A hidden check failed.").
//   checks      [{expr, fail?, hidden?}]  author-written JavaScript expressions
//               over the listed `variables` (read-only deep copies, frozen) and
//               `output` (the printed lines), e.g.
//               {"expr":"total === grid.flat().reduce((a, b) => a + b, 0)",
//               "fail":"total should add every cell of grid after the update."}.
//               Truthy passes; false, a throw or a syntax error fails with `fail`.
//               A variable not listed in `variables` is not visible to `expr`.
//   expectOutput / expectOutputContains   the same as on a case (exact lines /
//               loose needles) but over everything the WHOLE SCRIPT printed with
//               console.log; wording "Your program should print ...".
// Order, first failure only: variables (in order), checks, expectOutput,
// expectOutputContains; then any function `cases`. Give the STARTER the starting
// state (`let scores = [72, 85, 90, 64];`) so the final state is deterministic,
// and keep a regex requirement when the lesson is about a syntax (index
// assignment, push/shift): a hard-coded final value passes the variable check
// but fails the regex. Example:
//   {"id":"t1","type":"tests","file":"script.js","points":0,
//    "variables":[{"name":"scores","expect":[77,85,90,70]}],
//    "hint":"Index 0 becomes 77; index 3 goes up by 6."}
// Mechanics: the same appended statement that returns the functions also returns
// the variables, stamped with a fresh per-run secret, so a top-level `return` in
// the student's code cannot imitate it; values are rebuilt from own data
// properties (a getter is refused), bounded in depth and size; a script that
// throws or never finishes is "could not be checked", never a pass. `expr` is
// evaluated with new Function over those copies only (lesson.json is trusted
// author text; student text is never evaluated).

import type { Requirement, TestCase, ScriptCheck, VariableCheck } from './types';

/** Default per-case budget in ms. A case that has not returned by then is
 *  killed (the whole Worker is terminated) and reported as "did not finish". */
export const TEST_CASE_TIMEOUT_MS = 1000;

export interface TestJob {
  id: string;
  /** The primary function name (the first acceptable one). */
  fn: string;
  /** Every acceptable name, `fn` first. The first one the student defined is
   *  the one called; a lab whose steps let the student pick the name lists them. */
  fns: string[];
  cases: TestCase[];
  /** Script-level checks (what the script LEFT BEHIND: variables, the whole
   *  script's printed lines). Present only when the requirement has any. */
  script?: {
    variables: VariableCheck[];
    checks: ScriptCheck[];
    expectOutput?: string[];
    expectOutputContains?: string[];
  };
  timeout: number;
  tolerance: number;
}

export interface RequirementTestResult {
  status: 'passed' | 'failed';
  /** Student-words sentence naming the FIRST failing case only. */
  message?: string;
}

/** What the grader reads (GradeContext.testResults). `code` is the exact
 *  script the results were produced from, so edits made after the run read as
 *  stale instead of passing on old evidence. */
export interface TestRunResults {
  code: string;
  byId: Record<string, RequirementTestResult>;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** The `tests` requirements of a lesson, as jobs the runner understands. */
export function jobsFromRequirements(reqs: Requirement[]): TestJob[] {
  const jobs: TestJob[] = [];
  for (const r of reqs) {
    if (r.type !== 'tests') continue;
    const names = (Array.isArray(r.function) ? r.function : [r.function]).filter((n): n is string => typeof n === 'string' && n !== '');
    const fn = names[0];
    const variables = Array.isArray(r.variables) ? r.variables : [];
    const checks = Array.isArray(r.checks) ? r.checks : [];
    const eo = Array.isArray(r.expectOutput) && r.expectOutput.length > 0 ? r.expectOutput : undefined;
    const eoc = Array.isArray(r.expectOutputContains) && r.expectOutputContains.length > 0 ? r.expectOutputContains : undefined;
    const hasScript = variables.length > 0 || checks.length > 0 || !!eo || !!eoc;
    jobs.push({
      id: r.id,
      fn: typeof fn === 'string' ? fn : '',
      fns: names,
      cases: Array.isArray(r.cases) ? r.cases : [],
      ...(hasScript ? { script: { variables, checks, ...(eo ? { expectOutput: eo } : {}), ...(eoc ? { expectOutputContains: eoc } : {}) } } : {}),
      timeout: Math.min(Math.max(Number(r.timeout) || TEST_CASE_TIMEOUT_MS, 50), 10000),
      tolerance: typeof r.tolerance === 'number' && r.tolerance >= 0 ? r.tolerance : 1e-9,
    });
  }
  return jobs;
}

export function randomNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

interface JobState {
  notfound: boolean;
  failed: string | null;
  done: boolean;
  inflight: { call: string; hidden: boolean; timeout: number } | null;
}

export type TestFinish = 'done' | 'timeout' | 'error' | 'stopped';

export interface TestSession {
  nonce: string;
  /** Goes in the run request as `tests`. */
  payload: { jobs: TestJob[]; nonce: string };
  /** Offer every runner message. `consumed` means it was a harness message
   *  (valid or forged) and the host must not treat it as a log or an end;
   *  `armMs` asks the host to restart its kill timer for the case that began. */
  accept(d: unknown): { consumed: boolean; armMs?: number };
  /** True once any case has started, so a timeout is a case's, not the script's. */
  inCasePhase(): boolean;
  finish(how: TestFinish, code: string): TestRunResults;
}

export function createTestSession(jobs: TestJob[], nonce: string = randomNonce()): TestSession {
  const state: Record<string, JobState> = {};
  for (const j of jobs) state[j.id] = { notfound: false, failed: null, done: false, inflight: null };
  let casePhase = false;
  const byId = new Map(jobs.map((j) => [j.id, j]));

  return {
    nonce,
    payload: { jobs, nonce },
    inCasePhase: () => casePhase,
    accept(d) {
      const m = d as { kind?: unknown; nonce?: unknown; id?: unknown; i?: unknown } | null;
      if (!m || typeof m !== 'object' || typeof m.kind !== 'string' || !m.kind.startsWith('test-')) {
        return { consumed: false };
      }
      // A harness-shaped message with the wrong nonce is a forgery: swallow it
      // so it is not shown as a log either, and count it for nothing.
      if (m.nonce !== nonce || typeof m.id !== 'string' || !state[m.id]) return { consumed: true };
      const s = state[m.id];
      const mm = m as Record<string, unknown>;
      if (m.kind === 'test-start') {
        casePhase = true;
        const job = byId.get(m.id)!;
        const timeout = Math.min(Math.max(Number(mm.timeout) || job.timeout, 50), 10000);
        s.inflight = { call: String(mm.call ?? ''), hidden: mm.hidden === true, timeout };
        return { consumed: true, armMs: timeout };
      }
      if (m.kind === 'test-case') {
        s.inflight = null;
        if (mm.ok !== true && s.failed === null) s.failed = String(mm.msg || 'A check failed.').slice(0, 300);
      } else if (m.kind === 'test-job') {
        if (mm.status === 'notfound') s.notfound = true;
        else if (mm.status === 'ran') s.done = true;
      }
      return { consumed: true };
    },
    finish(how, code) {
      const out: Record<string, RequirementTestResult> = {};
      for (const job of jobs) {
        const s = state[job.id];
        const fail = (message: string) => { out[job.id] = { status: 'failed', message }; };
        const names = job.fns && job.fns.length ? job.fns : [job.fn];
        const hasCases = job.cases.length > 0;
        if (hasCases && !names.every((n) => IDENT.test(n))) { fail('This check has no valid function name, so it cannot run.'); continue; }
        if (!hasCases && !job.script) { fail('This check has no cases, so it cannot run.'); continue; }
        if (s.notfound) {
          fail(names.length > 1
            ? `None of these functions was found: ${names.join(', ')}. Check that you wrote one of them as function name(...) with exactly that name.`
            : `Function ${job.fn} was not found. Check that you wrote function ${job.fn}(...) with exactly that name.`);
        } else if (s.failed !== null) {
          fail(s.failed);
        } else if (s.inflight && how === 'timeout') {
          const secs = Math.round((s.inflight.timeout / 1000) * 10) / 10;
          fail(s.inflight.hidden
            ? 'A hidden check did not finish, so it was stopped. Look for a loop that never ends.'
            : `${s.inflight.call} did not finish in ${secs} second${secs === 1 ? '' : 's'}, so it was stopped. Look for a loop that never ends.`);
        } else if (s.done) {
          out[job.id] = { status: 'passed' };
        } else if (how === 'error') {
          fail('Your code stopped with an error before this could be checked. Fix the error shown in the output first.');
        } else if (how === 'timeout') {
          fail('Your code was still running when time ran out, so this could not be checked.');
        } else {
          fail('This check did not finish running. Press Run again.');
        }
      }
      return { code, byId: out };
    },
  };
}

// The part that runs inside the Worker. String.raw so regex backslashes need no
// doubling; it therefore must not contain a backtick or a dollar-brace.
export const TEST_HARNESS_SOURCE = String.raw`
const __runTestJobs = (() => {
  const post = self.postMessage.bind(self);
  const hasOwn = Object.prototype.hasOwnProperty;
  const keysOf = Object.keys;
  const isArr = Array.isArray;
  const OBJ_PROTO = Object.prototype;
  const getProto = Object.getPrototypeOf;
  const MAX_CAPTURED = 500;
  const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  // {"$":"NaN"} style tags -> the real value; every call builds fresh objects,
  // so a case that mutates its arguments cannot poison the next case.
  function decode(v) {
    if (isArr(v)) { const o = []; for (let i = 0; i < v.length; i++) o.push(decode(v[i])); return o; }
    if (v !== null && typeof v === 'object') {
      const ks = keysOf(v);
      if (ks.length === 1 && ks[0] === '$') {
        const t = v.$;
        if (t === 'undefined') return undefined;
        if (t === 'NaN') return NaN;
        if (t === 'Infinity') return Infinity;
        if (t === '-Infinity') return -Infinity;
        if (t === '-0') return -0;
      }
      const o = {};
      for (let i = 0; i < ks.length; i++) o[ks[i]] = decode(v[ks[i]]);
      return o;
    }
    return v;
  }

  // Deep equality. NaN equals NaN; 0 equals -0; arrays and plain objects are
  // compared structurally (extra or missing keys differ); numbers may differ
  // by up to tol. Anything else (functions, Dates, Maps) is equal only if ===.
  function eq(a, b, tol, d) {
    if (d > 40) return false;
    if (typeof a === 'number' && typeof b === 'number') {
      if (a !== a && b !== b) return true;
      if (a === b) return true;
      return tol > 0 && Math.abs(a - b) <= tol;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
    const aa = isArr(a);
    if (aa !== isArr(b)) return false;
    if (aa) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!eq(a[i], b[i], tol, d + 1)) return false;
      return true;
    }
    const pa = getProto(a);
    const pb = getProto(b);
    if ((pa !== OBJ_PROTO && pa !== null) || (pb !== OBJ_PROTO && pb !== null)) return false;
    const ka = keysOf(a);
    if (ka.length !== keysOf(b).length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (!hasOwn.call(b, ka[i]) || !eq(a[ka[i]], b[ka[i]], tol, d + 1)) return false;
    }
    return true;
  }

  function clip(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // Student-readable text for a value.
  function show(v, depth) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') return v !== v ? 'NaN' : (v === 0 && 1 / v < 0) ? '-0' : String(v);
    if (t === 'string') return JSON.stringify(v);
    if (t === 'boolean') return String(v);
    if (t === 'function') return 'a function';
    if (t !== 'object') return String(v);
    if (typeof v.then === 'function') return 'a Promise (async functions are not checked)';
    if ((depth || 0) > 3) return '…';
    try {
      if (isArr(v)) return '[' + v.map((x) => show(x, (depth || 0) + 1)).join(', ') + ']';
      return '{' + keysOf(v).map((k) => k + ': ' + show(v[k], (depth || 0) + 1)).join(', ') + '}';
    } catch (_) { return 'an object'; }
  }
  const showClip = (v) => clip(show(v, 0), 60);

  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  function fmtLog(a) {
    return a.map((x) => {
      if (typeof x !== 'object' || x === null) return String(x);
      try { return JSON.stringify(x, null, 2); } catch (_) { return String(x); }
    }).join(' ');
  }

  function outputMsg(call, exp, got) {
    const n = Math.max(exp.length, got.length);
    for (let i = 0; i < n; i++) {
      const e = i < exp.length ? String(exp[i]).replace(/\s+$/, '') : null;
      const g = i < got.length ? got[i].replace(/\s+$/, '') : null;
      if (e === g) continue;
      const where = exp.length > 1 ? ' on line ' + (i + 1) : '';
      if (g === null) return call + ' should print ' + clip(JSON.stringify(e), 60) + where + ' but printed ' + (got.length === 0 ? 'nothing' : 'only ' + plural(got.length, 'line'));
      if (e === null) return call + ' should print ' + plural(exp.length, 'line') + ' but printed an extra line ' + clip(JSON.stringify(g), 60);
      return call + ' should print ' + clip(JSON.stringify(e), 60) + where + ' but printed ' + clip(JSON.stringify(g), 60);
    }
    return null;
  }

  // One case. Returns {ok:true} or {ok:false,msg}. Never throws.
  // Loose text matching. norm: lower case, any run of whitespace -> one space.
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  const NUM_RE = /^-?[0-9]+(\.[0-9]+)?$/;
  const isDig = (ch) => ch !== undefined && ch >= '0' && ch <= '9';
  const isAlnum = (ch) => ch !== undefined && /[a-z0-9]/i.test(ch);
  // Does haystack (already normalised) contain needle (already normalised)?
  // A number needle must stand alone as a number: not inside a longer run of
  // digits, not the whole-number part of a decimal ("12" in "12.5") and not
  // the tail of a decimal ("12" in "1.12"), and not with a minus it lacks.
  function hasNeedle(hay, needle) {
    if (needle === '') return true;
    if (!NUM_RE.test(needle)) return hay.indexOf(needle) !== -1;
    const text = hay.replace(/(?<=[0-9]),(?=[0-9]{3}(?![0-9]))/g, '');
    let from = 0;
    for (;;) {
      const at = text.indexOf(needle, from);
      if (at === -1) return false;
      from = at + 1;
      const before = text[at - 1];
      const after = text[at + needle.length];
      if (isDig(before)) continue;
      if (before === '.' && isDig(text[at - 2])) continue;
      if (after !== undefined && isDig(after)) continue;
      if (after === '.' && isDig(text[at + needle.length + 1])) continue;
      if (needle[0] !== '-' && before === '-' && !isAlnum(text[at - 2])) continue;
      return true;
    }
  }
  // A number needle whose digits DO appear, just not as a standalone number ("12" in "Area: 112"):
  // the plain "includes" wording would read as a lie, so the message says what is actually wanted.
  function digitsInside(hay, needle) {
    return NUM_RE.test(needle) && hay.replace(/(?<=[0-9]),(?=[0-9]{3}(?![0-9]))/g, '').indexOf(needle) !== -1;
  }
  function needlesOf(c, one, many) {
    const out = [];
    if (typeof c[one] === 'string') out.push(c[one]);
    if (isArr(c[many])) for (let i = 0; i < c[many].length; i++) out.push(String(c[many][i]));
    return out;
  }

  // The shared wording for "these strings must appear in what was printed".
  function outputContainsMsg(call, needles, lines) {
    const printed = norm(lines.join(' '));
    for (let i = 0; i < needles.length; i++) {
      if (!hasNeedle(printed, norm(needles[i]))) {
        if (digitsInside(printed, norm(needles[i]))) {
          return call + ' should print the number ' + clip(String(needles[i]).trim(), 40) + ' on its own, but printed ' + clip(lines.map((l) => JSON.stringify(l.replace(/\s+$/, ''))).join(', '), 80);
        }
        return call + ' should print a line that includes ' + clip(JSON.stringify(String(needles[i])), 60) + ' but printed ' + (lines.length === 0 ? 'nothing' : clip(lines.map((l) => JSON.stringify(l.replace(/\s+$/, ''))).join(', '), 80));
      }
    }
    return null;
  }

  // ---- script-level checks: what the whole script left behind -------------
  // A copy of a value that student code can no longer reach: arrays and plain
  // objects are rebuilt from own DATA properties (a getter is refused, so a
  // property cannot compute a different answer each time it is read); anything
  // else is kept as is and so only equals itself. Bounded in depth and size.
  const gopd = Object.getOwnPropertyDescriptor;
  function snap(v, st, d) {
    if (v === null || typeof v !== 'object') return v;
    if (d > 40 || ++st.n > 5000) { st.over = true; return undefined; }
    if (isArr(v)) {
      const o = [];
      const len = v.length;
      for (let i = 0; i < len; i++) {
        const ds = gopd(v, String(i));
        if (ds && (ds.get || ds.set)) { st.accessor = true; o.push(undefined); continue; }
        o.push(ds ? snap(ds.value, st, d + 1) : undefined);
      }
      return o;
    }
    const pr = getProto(v);
    if (pr !== OBJ_PROTO && pr !== null) return v;
    const o = {};
    const ks = keysOf(v);
    for (let i = 0; i < ks.length; i++) {
      const ds = gopd(v, ks[i]);
      if (ds && (ds.get || ds.set)) { st.accessor = true; continue; }
      o[ks[i]] = snap(ds ? ds.value : undefined, st, d + 1);
    }
    return o;
  }
  function freezeDeep(v, d) {
    if (v === null || typeof v !== 'object' || d > 40) return v;
    if (isArr(v) || getProto(v) === OBJ_PROTO || getProto(v) === null) {
      Object.freeze(v);
      const ks = keysOf(v);
      for (let i = 0; i < ks.length; i++) freezeDeep(v[ks[i]], d + 1);
    }
    return v;
  }
  const showWide = (v) => clip(show(v, 0), 90);

  // vars: {name: [1, value]} (found) or {name: [0]} (no such variable), read by
  // the lookup statement appended to the script. lines: what the script printed.
  function runScriptChecks(job, vars, lines) {
    const sc = job.script;
    const bad = (msg, hidden, own) => ({ ok: false, msg: hidden ? 'A hidden check failed.' : clip(own || msg, 220) });
    const seen = {};
    const names = [];
    const vals = [];
    for (let i = 0; i < sc.variables.length; i++) {
      const e = sc.variables[i] || {};
      const name = e.name;
      const hidden = e.hidden === true;
      if (typeof name !== 'string' || !IDENT_RE.test(name) || name === 'output') {
        return bad('This check names a variable that cannot be read.', false);
      }
      const rec = hasOwn.call(vars, name) ? vars[name] : null;
      if (!rec || rec[0] !== 1) return bad('I could not find a variable called ' + name + '. Check its name.', hidden);
      const st = { n: 0, over: false, accessor: false };
      const val = snap(rec[1], st, 0);
      if (st.over) return bad(name + ' is too big, or loops back on itself, so it cannot be checked.', hidden);
      if (st.accessor) return bad(name + ' holds a value that cannot be checked (it has a getter or setter).', hidden);
      if (!seen[name]) { seen[name] = true; names.push(name); vals.push(val); }
      if (hasOwn.call(e, 'expect')) {
        const exp = decode(e.expect);
        if (!eq(val, exp, job.tolerance, 0)) {
          return bad(name + ' should end as ' + showWide(exp) + ' but is ' + showWide(val), hidden, typeof e.fail === 'string' ? e.fail : undefined);
        }
      }
    }
    for (let i = 0; i < sc.checks.length; i++) {
      const c = sc.checks[i] || {};
      const hidden = c.hidden === true;
      const fail = typeof c.fail === 'string' && c.fail !== '' ? c.fail : 'A check on your results failed.';
      let ok = false;
      try {
        // Author-written text from lesson.json, never student text. It sees the
        // frozen copies and the printed lines, and nothing else of the script.
        const f = new Function('output', ...names, '"use strict"; return (' + String(c.expr) + ');');
        const frozen = vals.map((v) => freezeDeep(snap(v, { n: 0, over: false, accessor: false }, 0), 0));
        ok = !!f.apply(undefined, [freezeDeep(lines.slice(), 0), ...frozen]);
      } catch (_) { ok = false; }
      if (!ok) return bad(fail, hidden);
    }
    if (isArr(sc.expectOutput)) {
      const m = outputMsg('Your program', sc.expectOutput, lines);
      if (m !== null) return bad(m, false);
    }
    if (isArr(sc.expectOutputContains)) {
      const m = outputContainsMsg('Your program', sc.expectOutputContains, lines);
      if (m !== null) return bad(m, false);
    }
    return { ok: true };
  }

  function runCase(fn, c, job) {
    const hidden = c.hidden === true;
    const rawArgs = isArr(c.args) ? c.args : [];
    const args = decode(rawArgs);
    const orig = decode(rawArgs);
    const call = clip(job.fn + '(' + orig.map(showClip).join(', ') + ')', 100) + (c.description ? ' (' + c.description + ')' : '');
    const lines = [];
    const con = console;
    const saved = [con.log, con.warn, con.error];
    con.warn = con.error = function () {};
    con.log = function () { if (lines.length < MAX_CAPTURED) lines.push(...fmtLog([].slice.call(arguments)).split('\n')); };
    let got, threw = false, thrown;
    try { got = fn.apply(undefined, args); } catch (e) { threw = true; thrown = e; }
    con.log = saved[0]; con.warn = saved[1]; con.error = saved[2];
    const bad = (msg) => ({ ok: false, msg: hidden ? 'A hidden check failed.' : clip(msg, 220) });
    if (threw) {
      if (thrown && thrown.needInput) return bad(call + ' asked for input with prompt(), which a check cannot answer');
      const nm = thrown && thrown.name ? thrown.name : 'Error';
      return bad(call + ' stopped with an error: ' + nm + ': ' + (thrown && thrown.message !== undefined ? thrown.message : String(thrown)));
    }
    if (hasOwn.call(c, 'expect')) {
      const exp = decode(c.expect);
      if (!eq(got, exp, job.tolerance, 0)) {
        const printed = got === undefined && exp !== undefined && lines.length > 0;
        return bad(call + ' should give ' + showClip(exp) + ' but gave ' + showClip(got) + (printed ? ' (it printed instead of returning a value - use return)' : ''));
      }
    }
    if (isArr(c.expectOutput)) {
      const m = outputMsg(call, c.expectOutput, lines);
      if (m !== null) return bad(m);
    }
    const retNeedles = needlesOf(c, 'expectContains', 'expectContainsAll');
    if (retNeedles.length) {
      const hay = typeof got === 'string' ? norm(got) : null;
      for (let i = 0; i < retNeedles.length; i++) {
        if (hay === null || !hasNeedle(hay, norm(retNeedles[i]))) {
          if (hay !== null && digitsInside(hay, norm(retNeedles[i]))) {
            return bad(call + ' should give the number ' + clip(String(retNeedles[i]).trim(), 40) + ' on its own, but gave ' + showClip(got));
          }
          return bad(call + ' should give text that includes ' + clip(JSON.stringify(retNeedles[i]), 60) + ' but gave ' + showClip(got) + (got === undefined && lines.length > 0 ? ' (it printed instead of returning a value - use return)' : ''));
        }
      }
    }
    if (isArr(c.expectOutputContains)) {
      const m = outputContainsMsg(call, c.expectOutputContains, lines);
      if (m !== null) return bad(m);
    }
    if (c.unchanged !== undefined) {
      const idx = isArr(c.unchanged) ? c.unchanged : [c.unchanged];
      for (let i = 0; i < idx.length; i++) {
        if (!eq(args[idx[i]], orig[idx[i]], 0, 0)) {
          const a = orig[idx[i]];
          return bad(call + ' changed the ' + (isArr(a) ? 'array' : 'object') + ' you gave it. It should leave the original untouched');
        }
      }
    }
    if (c.after && typeof c.after === 'object') {
      const ks = keysOf(c.after);
      for (let i = 0; i < ks.length; i++) {
        const want = decode(c.after[ks[i]]);
        if (!eq(args[ks[i]], want, job.tolerance, 0)) {
          return bad(call + ' should leave argument ' + (Number(ks[i]) + 1) + ' as ' + showClip(want) + ' but left it as ' + showClip(args[ks[i]]));
        }
      }
    }
    return { ok: true };
  }

  // Calls only hold ids and plain data; each message carries the nonce.
  // fns / vars come from the lookup statement appended to the script (null when
  // it did not run); lines is what the whole script printed.
  return function (jobs, fns, vars, lines, nonce) {
    for (let j = 0; j < jobs.length; j++) {
      const job = jobs[j];
      if (job.script) {
        if (!vars) continue; // the script never reached its end: the check "did not finish"
        const sr = runScriptChecks(job, vars, lines || []);
        post({ kind: 'test-case', nonce, id: job.id, i: -1, ok: sr.ok, msg: sr.msg });
        if (!sr.ok) { post({ kind: 'test-job', nonce, id: job.id, status: 'ran' }); continue; }
        if (job.cases.length === 0) { post({ kind: 'test-job', nonce, id: job.id, status: 'ran' }); continue; }
      }
      const names = isArr(job.fns) && job.fns.length ? job.fns : [job.fn];
      let fn, used = job.fn;
      for (let k = 0; k < names.length && typeof fn !== 'function'; k++) {
        if (fns && hasOwn.call(fns, names[k]) && typeof fns[names[k]] === 'function') { fn = fns[names[k]]; used = names[k]; }
      }
      if (typeof fn !== 'function') { post({ kind: 'test-job', nonce, id: job.id, status: 'notfound' }); continue; }
      const jobUsed = used === job.fn ? job : { fn: used, cases: job.cases, timeout: job.timeout, tolerance: job.tolerance };
      for (let i = 0; i < job.cases.length; i++) {
        const c = job.cases[i] || {};
        const rawArgs = isArr(c.args) ? c.args : [];
        post({
          kind: 'test-start', nonce, id: job.id, i, timeout: job.timeout, hidden: c.hidden === true,
          call: clip(used + '(' + decode(rawArgs).map(showClip).join(', ') + ')', 100),
        });
        const r = runCase(fn, c, jobUsed);
        post({ kind: 'test-case', nonce, id: job.id, i, ok: r.ok, msg: r.msg });
        if (!r.ok) break;
      }
      post({ kind: 'test-job', nonce, id: job.id, status: 'ran' });
    }
  };
})();

// The script's own scope hands its functions and the named variables back by
// returning them, inside a record stamped with this run's secret marker.
function __testLookupSource(jobs, marker) {
  const seen = {};
  const parts = [];
  const vseen = {};
  const vparts = [];
  for (let i = 0; i < jobs.length; i++) {
    const list = jobs[i] && Array.isArray(jobs[i].fns) && jobs[i].fns.length ? jobs[i].fns : [jobs[i] && jobs[i].fn];
    for (let k = 0; k < list.length; k++) {
      const n = list[k];
      if (typeof n !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n) || seen[n]) continue;
      seen[n] = true;
      parts.push(JSON.stringify(n) + ': (typeof ' + n + " === 'function' ? " + n + ' : undefined)');
    }
    const vs = jobs[i] && jobs[i].script && Array.isArray(jobs[i].script.variables) ? jobs[i].script.variables : [];
    for (let k = 0; k < vs.length; k++) {
      const n = vs[k] && vs[k].name;
      if (typeof n !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n) || vseen[n]) continue;
      vseen[n] = true;
      // A declared variable that holds undefined is FOUND; only a name the
      // script never declared throws ReferenceError and reads as missing.
      vparts.push(JSON.stringify(n) + ': (() => { try { return [1, ' + n + ']; } catch (e) { return [0]; } })()');
    }
  }
  return 'return [' + JSON.stringify(String(marker)) + ', {' + parts.join(', ') + '}, {' + vparts.join(', ') + '}];';
}
`;
