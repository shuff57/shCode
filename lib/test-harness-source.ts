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
//               `same('a', 'b')` is true when variables a and b are the very same
//               object or array (the copies above cannot show that).
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
// throws or never finishes is "could not be checked", never a pass (a traced job that
// perturbs may still pass on what ran before the error; see EXECUTION TRACE). `expr` is
// evaluated with new Function over those copies only (lesson.json is trusted
// author text; student text is never evaluated).

import type { Requirement, TestCase, ScriptCheck, VariableCheck } from './types';
import { studentNames, bindText, bindCode } from './student-names';

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
    /** Opt-in execution trace (see EXECUTION TRACE below). */
    trace?: boolean;
    perturb?: string[];
    /** Opt-in call spy (EXECUTION TRACE item 12): the student's functions to watch. */
    spy?: string[];
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
export function jobsFromRequirements(reqs: Requirement[], code?: string): TestJob[] {
  const jobs: TestJob[] = [];
  for (const r of reqs) {
    if (r.type !== 'tests') continue;
    // The student's own names for what the requirement was written with (lib/student-names.ts).
    // The job is rewritten to read THEIR name: the variable, the function, the perturbed name
    // and every author expression, so the checks stand exactly as written.
    const own = r.names && typeof code === 'string' ? studentNames(code, r.names) : {};
    const renamed = Object.keys(own).length > 0;
    const names = (Array.isArray(r.function) ? r.function : [r.function]).filter((n): n is string => typeof n === 'string' && n !== '').map((n) => own[n] || n);
    const fn = names[0];
    const variables = (Array.isArray(r.variables) ? r.variables : []).map((v) => (renamed ? { ...v, name: own[v.name] || v.name, ...(typeof v.fail === 'string' ? { fail: bindText(v.fail, own) } : {}) } : v));
    const checks = (Array.isArray(r.checks) ? r.checks : []).map((c) => (renamed ? {
      ...c,
      expr: bindCode(c.expr, own),
      ...(typeof c.fail === 'string' ? { fail: bindText(c.fail, own) } : {}),
      ...(typeof c.failExpr === 'string' ? { failExpr: bindCode(c.failExpr, own) } : {}),
    } : c));
    const eo = Array.isArray(r.expectOutput) && r.expectOutput.length > 0 ? r.expectOutput : undefined;
    const eoc = Array.isArray(r.expectOutputContains) && r.expectOutputContains.length > 0 ? r.expectOutputContains : undefined;
    const hasScript = variables.length > 0 || checks.length > 0 || !!eo || !!eoc;
    // Only a requirement that asks for it gets the trace; every other job is sent exactly as before.
    const trace = hasScript && r.trace === true;
    const perturb = trace && Array.isArray(r.perturb) ? r.perturb.filter((n): n is string => typeof n === 'string' && (n === '*' || n === '{}' || n === '!storage' || n === '!arrays' || n === '!numbers' || n === '!stored' || IDENT.test(n))).map((n) => own[n] || n) : [];
    const spy = trace && Array.isArray(r.spy) ? r.spy.filter((n): n is string => typeof n === 'string' && IDENT.test(n)).map((n) => own[n] || n) : [];
    const traceFields = trace ? { trace: true, ...(perturb.length ? { perturb } : {}), ...(spy.length ? { spy } : {}) } : {};
    jobs.push({
      id: r.id,
      fn: typeof fn === 'string' ? fn : '',
      fns: names,
      cases: Array.isArray(r.cases) ? r.cases : [],
      ...(hasScript ? { script: { variables, checks, ...(eo ? { expectOutput: eo } : {}), ...(eoc ? { expectOutputContains: eoc } : {}), ...traceFields } } : {}),
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
  // st.live: read each data property with an ordinary read instead of from its descriptor, so
  // the changed run's data (a proxy over the literal, EXECUTION TRACE item 2) reads as changed.
  function snap(v, st, d) {
    if (v === null || typeof v !== 'object') return v;
    if (d > 40 || ++st.n > 5000) { st.over = true; return undefined; }
    if (isArr(v)) {
      const o = [];
      const len = v.length;
      for (let i = 0; i < len; i++) {
        const ds = gopd(v, String(i));
        if (ds && (ds.get || ds.set)) { st.accessor = true; o.push(undefined); continue; }
        o.push(ds ? snap(st.live ? v[i] : ds.value, st, d + 1) : undefined);
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
      o[ks[i]] = snap(ds ? (st.live ? v[ks[i]] : ds.value) : undefined, st, d + 1);
    }
    return o;
  }
  // A silent run's variables (the lookup's {name: [1, value]} record), read for the job's own
  // variable names only: {name: copy}. null when that run did not reach its end.
  function snapRun(raw, sc) {
    if (!raw || typeof raw !== 'object') return null;
    const o = {};
    for (let i = 0; i < sc.variables.length; i++) {
      const n = sc.variables[i] && sc.variables[i].name;
      if (typeof n !== 'string' || !hasOwn.call(raw, n) || !isArr(raw[n]) || raw[n][0] !== 1) continue;
      const st = { n: 0, over: false, accessor: false, live: true };
      let val;
      try { val = snap(raw[n][1], st, 0); } catch (_) { continue; }
      if (!st.over && !st.accessor) o[n] = val;
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
  function runScriptChecks(job, vars, lines, tr) {
    const sc = job.script;
    const bad = (msg, hidden, own) => ({ ok: false, msg: hidden ? 'A hidden check failed.' : clip(own || msg, 220) });
    const traced = sc.trace === true;
    // The trace binding: a frozen copy of what each console.log call site did.
    let traceVal;
    if (traced) {
      if (!tr) return bad('Your program could not be watched while it ran (code that declares its own console, or is too long to follow, cannot be), so this could not be checked.', false);
      // The silent runs did not fit in the time left (EXECUTION TRACE, drive): say so, not a plain fail.
      if (tr.slow && isArr(sc.perturb) && sc.perturb.length) {
        const secs = Math.max(0.1, Math.round(tr.slow / 100) / 10);
        return bad('Your program takes about ' + secs + ' seconds to run: too slow to run again with changed data inside the ' + Math.round((tr.budget || 3000) / 1000) + '-second limit, so this could not be checked. Make it faster (a loop that runs too many times?) and Run again.', false);
      }
      traceVal = freezeDeep({
        prints: tr.recs.map((r) => ({ src: r.src, code: r.code, ran: r.ran, out: r.out.slice(), out2: r.out2 ? r.out2.slice() : null, stable: r.stable === true, outD: r.outD ? r.outD.slice() : null, outS: r.outS ? r.outS.slice() : null })),
        perturbed: tr.perturbed === true,
        threw: tr.threw === true,
        mk: typeof tr.mk === 'string' ? tr.mk : null,
        k: tr.k || 0,
        c: tr.c || 0,
        rk: typeof tr.rk === 'string' ? tr.rk : null,
        results: (tr.results || []).slice(0, 50),
        dreads: (tr.dreads || []).slice(0, 100).map((d) => d.slice()),
        code: tr.blank,
        text: tr.text,
        vars2: snapRun(tr.vars2, sc),
        empty: tr.emptyRun ? { threw: tr.emptyRun.threw === true, vars: snapRun(tr.emptyRun.vars, sc) } : null,
        stored: tr.storedRun ? { threw: tr.storedRun.threw === true, vars: snapRun(tr.storedRun.vars, sc) } : null,
        calls: tr.spyRun ? { threw: tr.spyRun.threw === true, events: tr.spyRun.events } : null,
        arrays: tr.arr ? tr.arr.events.map((e) => (e.k === 'p' ? { k: 'p', s: e.s, n: e.n, ids: e.ids.slice(), sigs: (e.sigs || []).slice() } : { k: 'm', m: e.m, id: e.id, ch: e.ch === true, b: e.b === undefined ? null : e.b, a: e.a === undefined ? null : e.a })) : null,
      }, 0);
    }
    const seen = {};
    const names = [];
    const vals = [];
    for (let i = 0; i < sc.variables.length; i++) {
      const e = sc.variables[i] || {};
      const name = e.name;
      const hidden = e.hidden === true;
      if (typeof name !== 'string' || !IDENT_RE.test(name) || name === 'output' || name === 'same' || (traced && name === 'trace')) {
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
      // Author-written text from lesson.json, never student text. It sees the
      // frozen copies and the printed lines, and nothing else of the script.
      // same('a', 'b'): are the variables a and b the very same object? The frozen copies
      // below lose identity, so this answers it from the live values (restored = player).
      const same = (x, y) => hasOwn.call(vars, x) && hasOwn.call(vars, y) && vars[x][0] === 1 && vars[y][0] === 1 && vars[x][1] === vars[y][1] && vars[x][1] !== null && typeof vars[x][1] === 'object';
      const params = traced ? ['output', 'same', 'trace', ...names] : ['output', 'same', ...names];
      const argsFor = () => {
        const frozen = vals.map((v) => freezeDeep(snap(v, { n: 0, over: false, accessor: false }, 0), 0));
        return traced ? [freezeDeep(lines.slice(), 0), same, traceVal, ...frozen] : [freezeDeep(lines.slice(), 0), same, ...frozen];
      };
      try {
        const f = new Function(...params, '"use strict"; return (' + String(c.expr) + ');');
        ok = !!f.apply(undefined, argsFor());
      } catch (_) { ok = false; }
      if (!ok) {
        // failExpr: an author expression over the same bindings that words the failure
        // (it may quote what the student wrote); anything but a non-empty string falls back.
        let own;
        if (!hidden && typeof c.failExpr === 'string' && c.failExpr !== '') {
          try {
            const g = new Function(...params, '"use strict"; return (' + c.failExpr + ');');
            const s = g.apply(undefined, argsFor());
            if (typeof s === 'string' && s.trim() !== '') own = s;
          } catch (_) { own = undefined; }
        }
        return bad(own || fail, hidden);
      }
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
  // tr: the execution trace (EXECUTION TRACE below), or null when none was taken.
  // threw: the script stopped with an error. Then only the jobs that perturb are
  // checked, on what ran before the error (vars from the capture run); one that
  // passes is posted, anything else is left to "Your code stopped with an error".
  return function (jobs, fns, vars, lines, nonce, tr, threw) {
    // In a traced run, a function a check calls prints nowhere (not to the student's output).
    const con = console;
    const savedLog = con.log;
    if (tr) con.log = function () {};
    try { runJobs(jobs, fns, vars, lines, nonce, tr, threw === true); } finally { if (tr) con.log = savedLog; }
  };
  function runJobs(jobs, fns, vars, lines, nonce, tr, threw) {
    for (let j = 0; j < jobs.length; j++) {
      const job = jobs[j];
      if (threw) {
        const sc = job.script;
        if (!sc || !tr || sc.trace !== true || !isArr(sc.perturb) || !sc.perturb.length || job.cases.length || !vars) continue;
        if (!sc.variables.every((e) => e && typeof e.name === 'string' && hasOwn.call(vars, e.name))) continue;
        const sr = runScriptChecks(job, vars, lines || [], tr);
        if (sr.ok) {
          post({ kind: 'test-case', nonce, id: job.id, i: -1, ok: true });
          post({ kind: 'test-job', nonce, id: job.id, status: 'ran' });
        }
        continue;
      }
      if (job.script) {
        if (!vars) continue; // the script never reached its end: the check "did not finish"
        const sr = runScriptChecks(job, vars, lines || [], tr || null);
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
  }
})();

// EXECUTION TRACE (opt-in per requirement: "trace": true, optional "perturb").
// Only built when a job asks for it; every other run is byte-for-byte as before.
//   1. Each console.log(...) CALL site in the student's code gets its own stand-in
//      for the word console, an identifier of exactly the same length ($ + three
//      random letters + a 3-digit index) passed in as a parameter of the compiled
//      function. Same length and no new lines, so every line and column an error
//      reports is unchanged. The stand-in counts the call and hands the arguments
//      to whatever console.log is at that moment, so a console.log the student
//      reassigned behaves as written. What the call printed is what reached the
//      real console while it ran (a probe sits in console.log for the run): a
//      console.log replaced by one that prints nothing leaves the call's out empty.
//      Code that declares its own console is not traced at all (a check then says
//      it could not be watched).
//   2. With "perturb": ["book"], the script runs again, silently (nothing is printed
//      or posted), with book's data changed: an object or array literal assigned to
//      book (Object.freeze(...) around it included) is wrapped in a proxy whose
//      reads give mk + text + mk for a string and n * k + c for a number, where mk
//      is a tilde, three random letters and a tilde, and k and c are random whole
//      numbers, all fresh on every Run so none can be typed in advance. A method
//      read off it (and a call book(...)) gives its result back as rk + text + rk
//      (rk: three random letters in guillemets) or n * rkk + rkc, and every such
//      result is kept in results. The name "*" wraps every object or array literal
//      assigned to any name. Object.freeze, seal and preventExtensions do nothing in
//      a silent run. The changed run happens TWICE with the same changes: a call
//      whose two outputs differ printed something the data alone does not decide
//      (Math.random, the clock) and is not stable. Before each silent run the
//      globals the script added or replaced, and the host's own state (the
//      localStorage stand-in, prompt answers), are put back, so a flag set by one
//      run cannot tell the next one apart.
//   3. The pseudo-name "{}" adds one more silent run, without the data changes, in
//      which the right-hand side of each destructuring declaration
//      (const { a, b } = x) is wrapped so every key it unpacks is marked on its own
//      (its own random marker, or its own k and c); dreads lists [site, key, value].
//   4. When the real run throws, the jobs that perturb are still checked on what ran
//      before the throw. Their variables come from one more silent run that only
//      records each literal assigned to a name. A job that passes counts; any other
//      job keeps "Your code stopped with an error". Jobs without perturb are not
//      checked, so a run that throws never completes a lab.
//   5. The runs cannot be told apart from inside the script: every one is compiled by the same
//      call (compile), with the same parameters (the stand-ins, two hooks and, in code that is not
//      strict, an empty arguments), and entered through the same frames (drive, enter), so a stack
//      trace reads the same; performance marks are cleared, the RegExp statics reset, and every
//      function the global object holds (Error.stackTraceLimit ...) and the global object's own
//      prototype chain are put back. Still visible from inside: what a silent run replaces (timers,
//      Promise.then, Object.freeze, postMessage), a getter's or a method's frames when called through
//      the changed data, the time, and columns on a line the changed run rewrote.
//   6. A silent run starts only when it fits in what is left of the run's time limit; when one does
//      not, the checks that needed it say the program is too slow to check (st.slow).
//   7. Every silent run ends with the same lookup statement as the real run, and the first changed
//      run's record is kept: vars2 is the job's variables as that run left them, read through the
//      changed data, so a check can tell a result the script COMPUTED from the data (it changed
//      with it) from one typed in (it did not). null when that run did not reach its end.
//   8. The pseudo-name "!storage" adds one more silent run, the data as written, in which the
//      host's localStorage stand-in reads as empty and drops every write (the host passes the
//      switch as drive's mute option): a script's missing-key path, run for real. empty is
//      { threw, vars } for that run (vars as in 7), or null when it did not run.
//   9. The pseudo-name "!arrays" watches the arrays in the real run: while it goes, the methods that
//      change an array in place (push, unshift, pop, shift, splice, sort, reverse, fill, copyWithin)
//      and the ways a print reads a whole array (join, which String(), + and a template call; slice,
//      concat and the iterator, which spread and Array.from use) are wrapped, and put back after.
//      A print's sigs hold the contents of JSON text of an array it printed; a method call holds
//      the contents before (b) and after (a).
//      arrays lists, in order, each such method call ({k: 'm', m, id, ch}: id the array's identity,
//      ch whether its contents changed) and each console.log call ({k: 'p', s, n, ids}: prints[s],
//      its call n, the arrays it printed as an argument or joined just before). So a check can ask
//      that one and the same array, printed twice with different contents, was changed in place by
//      a method that ran between the prints, through an alias or a parameter as well.
//  10. "!numbers": the changed run changes numbers only and leaves strings as written, for a script
//      whose logic compares text from the data with a literal (items.find((i) => i.name === "Mug")).
//  11. "!stored": one more silent run, the script as written, in which every text read back from
//      localStorage (the host's tweakStore option) is parsed and changed like the changed run's data
//      (mk around strings, n * k + c) before the script sees it. stored is { threw, vars } for that
//      run (vars as in 7) and each print's outS what it printed then: a value loaded from storage
//      changes there, a typed one does not.
//  12. A tests requirement's "spy": ["fn", ...] adds one more silent run, the script as written, in which
//      each named function (a student's, found under the student's own name; or a built-in such as
//      structuredClone) is wrapped where it is defined, so every call that RUNS is recorded, through
//      an alias or as a callback too. calls is { threw, events } for that run: each call
//      {k: 'c', fn, args, same, ids, ret, retSame, retId} and each print {k: 'p', s, same, ids} in
//      order, where args are copies made at the call, same[i] the top-level names whose final value
//      is argument i (the same object, or the same number or text), ids an identity per object.
//      A call behind if (false) is never recorded; a call on a literal has no name in same.
//   The host gets an afterReal call right after the real run, so the checks can see the
//   localStorage the real run left, not the one the silent runs put back.
// A check sees trace = { prints: [{src, code, ran, out, out2, stable, outD}],
//   perturbed, threw, mk, k, c, rk, results, dreads, code, text, vars2, empty, arrays, stored, calls }:
//   (each print also has outS, item 11)
// src is the call's argument text as written, code the same with comments and
// string contents blanked, ran how many times it ran in the real run, out what it
// printed then (each call one string, at most 50), out2 the same for the changed
// run (null without perturb), stable whether the second changed run printed the
// same, outD what it printed in the destructure run (null without "{}");
// perturbed is true when the changed run finished (or the real run threw as well);
// threw is true when the real run threw; code and text are the whole script,
// blanked and as written.
const __traceKit = (() => {
  const BT = String.fromCharCode(96);
  const DOLLAR = String.fromCharCode(36);
  const OPEN_BRACE = String.fromCharCode(123);
  const isWs = (ch) => ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v';
  const isWord = (ch) => ch !== undefined && /[A-Za-z0-9_$]/.test(ch);
  const keep = (ch) => (ch === '\n' || ch === '\r' ? ch : ' ');

  // Same length as src: comments, string contents, template text and the inside of
  // regular-expression literals become spaces (line breaks kept). The quote marks,
  // the template's dollar-brace parts and every other character stay.
  function blankCode(src) {
    const n = src.length;
    const parts = [];
    let i = 0;
    let lastSig = '';
    let lastWord = '';
    let lastWordDot = false;
    let prevWord = false;
    const braces = [];
    let inT = false;
    const push = (s) => { parts.push(s); prevWord = false; };
    const code = (ch) => {
      const wasWord = prevWord;
      parts.push(ch);
      if (isWord(ch)) {
        if (wasWord) lastWord += ch;
        else { lastWord = ch; lastWordDot = lastSig === '.'; }
        prevWord = true;
      } else prevWord = false;
      if (!isWs(ch)) lastSig = ch;
    };
    // The identifier just before a '/', when that is the last code: return / typeof
    // start a regular expression, any other word (or obj.return) is a division.
    const wordBefore = () => (isWord(lastSig) && !lastWordDot ? lastWord : '');
    while (i < n) {
      const c = src[i];
      if (inT) {
        if (c === '\\') { push(' ' + (i + 1 < n ? keep(src[i + 1]) : '')); i += 2; continue; }
        if (c === BT) { code(c); inT = false; i++; continue; }
        if (c === DOLLAR && src[i + 1] === OPEN_BRACE) { push(DOLLAR); code(OPEN_BRACE); braces.push(0); inT = false; i += 2; continue; }
        push(keep(c)); i++; continue;
      }
      if (c === '/' && src[i + 1] === '/') {
        let j = i;
        while (j < n && src[j] !== '\n') j++;
        push(' '.repeat(j - i)); i = j; continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        let j = i + 2;
        while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
        j = Math.min(n, j + 2);
        let s = '';
        for (let k = i; k < j; k++) s += keep(src[k]);
        push(s); i = j; continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        let closed = false;
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === c) { closed = true; break; }
          j++;
        }
        if (!closed || j >= n) { code(c); i++; continue; }
        push(c + ' '.repeat(j - i - 1)); code(c); i = j + 1; continue;
      }
      if (c === BT) { code(c); inT = true; i++; continue; }
      if (c === '/') {
        let startsRe = lastSig === '' || /[(,=:\[!&|?{};+\-*%<>~^]/.test(lastSig);
        if (!startsRe && isWord(lastSig)) { const w = wordBefore(); startsRe = w === 'return' || w === 'typeof'; }
        if (startsRe) {
          let j = i + 1;
          let inClass = false;
          let closed = false;
          while (j < n && src[j] !== '\n') {
            const d = src[j];
            if (d === '\\') { j += 2; continue; }
            if (d === '[') inClass = true;
            else if (d === ']') inClass = false;
            else if (d === '/' && !inClass) { closed = true; break; }
            j++;
          }
          if (closed && j > i + 1 && j < n) { push('/' + ' '.repeat(j - i - 1)); code('/'); i = j + 1; continue; }
        }
      }
      if (braces.length) {
        if (c === OPEN_BRACE) braces[braces.length - 1]++;
        else if (c === '}') {
          if (braces[braces.length - 1] === 0) { braces.pop(); code(c); inT = true; i++; continue; }
          braces[braces.length - 1]--;
        }
      }
      code(c);
      i++;
    }
    const out = parts.join('');
    return out.length === n ? out : null;
  }

  // Index of the bracket that closes the one at open (in blanked text), or -1.
  function matchClose(b, open) {
    let d = 0;
    for (let j = open; j < b.length; j++) {
      const ch = b[j];
      if (ch === '(' || ch === '[' || ch === OPEN_BRACE) d++;
      else if (ch === ')' || ch === ']' || ch === '}') { d--; if (d === 0) return j; if (d < 0) return -1; }
    }
    return -1;
  }

  const rnd3 = () => { let s = ''; for (let k = 0; k < 3; k++) s += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; return s; };
  const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const LQ = String.fromCharCode(171);
  const RQ = String.fromCharCode(187);
  const TILDE = String.fromCharCode(126);
  const slice = (a) => Array.prototype.slice.call(a);
  const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  // The real ones, taken before any student code runs.
  const R = { freeze: Object.freeze, seal: Object.seal, pext: Object.preventExtensions, ownKeys: Reflect.ownKeys, gopd: Reflect.getOwnPropertyDescriptor, def: Reflect.defineProperty, now: Date.now, parse: JSON.parse, stringify: JSON.stringify };
  const PERF = typeof performance === 'object' && performance !== null ? performance : null;
  const pbind = (n) => (PERF && typeof PERF[n] === 'function' ? PERF[n].bind(PERF) : null);
  R.pnow = pbind('now'); R.clearMarks = pbind('clearMarks'); R.clearMeasures = pbind('clearMeasures');
  const clock = () => (R.pnow ? R.pnow() : R.now());

  function fmt(args) {
    try {
      return args.map((a) => {
        if (typeof a !== 'object' || a === null) return String(a);
        try { const s = JSON.stringify(a, null, 2); return s === undefined ? String(a) : s; } catch (_) { return String(a); }
      }).join(' ');
    } catch (_) { return ''; }
  }

  // A name console declared by the script (const console, function console, a
  // parameter or catch binding called console): the stand-ins would call the
  // wrong one, so such code is not traced.
  const SHADOW = /(?<![\w$.])(?:const|let|var|function|class)\s+console(?![\w$])|\bcatch\s*\(\s*console\s*\)|(?<![\w$.])console\s*=>|\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)*console\s*(?:,[^()]*)?\)\s*(?:=>|\{)/;

  // The console.log call sites, and the code with each one's console swapped for
  // its same-length stand-in. null when the code cannot be read, has too many, or
  // declares its own console.
  function instrument(text) {
    const blank = blankCode(String(text));
    if (blank === null || SHADOW.test(blank)) return null;
    const re = /(?<![\w$.])console(?=\s*\.\s*log\s*\()/g;
    const sites = [];
    let m;
    while ((m = re.exec(blank))) {
      const lp = blank.indexOf('(', m.index + 7);
      const close = lp >= 0 ? matchClose(blank, lp) : -1;
      sites.push({ at: m.index, src: close > lp ? text.slice(lp + 1, close) : '', code: close > lp ? blank.slice(lp + 1, close) : '' });
      if (sites.length > 999) return null;
    }
    const tag = DOLLAR + rnd3();
    const ids = sites.map((s, k) => tag + String(k).padStart(3, '0'));
    let out = '';
    let from = 0;
    for (let k = 0; k < sites.length; k++) {
      out += text.slice(from, sites[k].at) + ids[k];
      from = sites[k].at + 7;
    }
    out += text.slice(from);
    const RL = console.log;
    const st = {
      phase: 1, key: '', perturbed: false, threw: false, blank, text: String(text), cap: null, RL,
      mk: null, k: 0, c: 0, rk: null, rkk: 0, rkc: 0, results: [], dreads: [], g0: null, restore: null,
      recs: sites.map((s, k) => ({ i: k, src: s.src, code: s.code, ran: 0, out: [], out2: null, out3: null, stable: false, outD: null, outS: null })),
      // Every run's hook parameters, the same names in each; argp: whether the code also takes a
      // parameter called arguments (not in strict code); gen: which silent run's stand-ins are live;
      // durs: how long each run took (ms); slow: the real run's ms when the silent runs did not fit.
      pn: DOLLAR + rnd3() + 'P', dn: DOLLAR + rnd3() + 'D', argp: null, gen: 0, durs: [], slow: 0, caps: null, budget: 0,
      // tail: the lookup statement the real run ends with, so every silent run ends with it too;
      // look: tells its record from any other value; vars2 / emptyRun: what items 7 and 8 kept;
      // mute: the host's switch for an empty, write-dropping localStorage (item 8).
      tail: '', look: null, vars2: null, emptyRun: null, mute: null,
      // arr: the array watch of item 9, while the real run is going (null otherwise); numOnly:
      // item 10; storedRun / tweakStore: item 11.
      arr: null, numOnly: false, storedRun: null, tweakStore: null,
      // spyLog / spyRun / spyMark: the call spy of item 12
      spyLog: null, spyRun: null, spyMark: null,
    };
    // Sits in console.log while a traced run is going: notes what reaches the real
    // console during a call site's own call, and prints only in the real run.
    st.probe = function () {
      const a = slice(arguments);
      if (st.cap) st.cap.push(fmt(a));
      return st.phase === 1 ? RL.apply(console, a) : undefined;
    };
    // One call of a stand-in: hand the arguments on, and keep what reached the real
    // console during the call under key ('' keeps nothing).
    st.call = (r, args, key) => {
      if (!key) return console.log.apply(console, args);
      const prev = st.cap;
      const got = [];
      st.cap = got;
      try {
        return console.log.apply(console, args);
      } finally {
        st.cap = prev;
        const o = r[key];
        if (o && got.length && o.length < 50) o.push(got.join('\n'));
      }
    };
    // The real run's stand-ins (a silent run makes its own from the same factory).
    st.objs = standIns(st, 0);
    return { code: out, ids, st };
  }

  // EXECUTION TRACE item 9: in the real run, the in-place array methods and join are watched.
  // Each call of a method that changes an array in place on an array is an event {k: 'm', m, id,
  // ch} (id: the array's identity, ch: its contents changed), and each console.log call is an
  // event {k: 'p', s, n, ids}: s the call site, n which of its calls, ids the arrays it printed
  // (an argument, or an array joined, or turned into text, since the last event).
  const MUTATORS = ['push', 'unshift', 'pop', 'shift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
  function armArrays(st) {
    const AP = Array.prototype;
    const ids = new WeakMap();
    let next = 1;
    const saved = {};
    const J0 = AP.join;
    const w = { events: [], pend: [], quiet: 0, idOf: null, off: null, sig: null };
    w.idOf = (o) => { let i = ids.get(o); if (i === undefined) { i = next++; ids.set(o, i); } return i; };
    const sig = (a) => (a.length > 200 ? null : a.length + ':' + J0.call(a, String.fromCharCode(1)));
    w.sig = sig;
    const live = (o) => w.quiet === 0 && st.phase === 1 && Array.isArray(o) && w.events.length < 2000;
    const named = (f, n, len) => { try { R.def(f, 'name', { value: n, configurable: true }); R.def(f, 'length', { value: len, configurable: true }); } catch (_) { /* keep */ } return f; };
    MUTATORS.forEach((m) => {
      const f = AP[m];
      if (typeof f !== 'function') return;
      saved[m] = f;
      AP[m] = named(function () {
        if (!live(this)) return f.apply(this, arguments);
        let before = null;
        w.quiet++;
        try { before = sig(this); } catch (_) { before = null; } finally { w.quiet--; }
        const out = f.apply(this, arguments);
        w.quiet++;
        try {
          const after = sig(this);
          w.events[w.events.length] = { k: 'm', m, id: w.idOf(this), ch: before === null || after === null || before !== after, b: before, a: after };
          w.pend = [];
        } catch (_) { /* keep */ } finally { w.quiet--; }
        return out;
      }, m, f.length);
    });
    // The ways a print reads an array whole: join (String(), + and a template call it), a copy
    // (slice, concat, spread and Array.from go through the iterator) are noted as "printed".
    const reads = (f, n) => named(function () {
      if (live(this) && w.pend.length < 20) w.pend[w.pend.length] = w.idOf(this);
      return f.apply(this, arguments);
    }, n, f.length);
    ['join', 'slice', 'concat'].forEach((m) => { const f = AP[m]; if (typeof f === 'function') { saved[m] = f; AP[m] = reads(f, m); } });
    const IT = Symbol.iterator;
    const it0 = AP[IT];
    const values0 = AP.values;
    if (typeof it0 === 'function') {
      const wit = reads(it0, 'values');
      AP[IT] = wit;
      if (values0 === it0) AP.values = wit;
    }
    w.off = () => {
      Object.keys(saved).forEach((m) => { AP[m] = saved[m]; });
      if (typeof it0 === 'function') { AP[IT] = it0; AP.values = values0; }
    };
    st.arr = w;
  }
  // sigs: the contents of JSON text of an array the call printed (JSON.stringify(a) reads the array
  // without calling any of its methods), so a check can match that snapshot to the array.
  function arrPrint(w, r, args) {
    if (w.events.length >= 2000) { w.pend = []; return; }
    const ids = w.pend.slice(0, 20);
    const sigs = [];
    const add = (s) => { if (s !== null && sigs.indexOf(s) < 0 && sigs.length < 40) sigs[sigs.length] = s; };
    for (let i = 0; i < args.length && ids.length < 40; i++) {
      const a = args[i];
      if (Array.isArray(a)) {
        const id = w.idOf(a);
        if (ids.indexOf(id) < 0) ids[ids.length] = id;
      } else if (typeof a === 'string' && a.length < 5000 && /^\s*\[/.test(a)) {
        try { const v = R.parse(a); if (Array.isArray(v)) add(w.sig(v)); } catch (_) { /* not JSON */ }
      }
    }
    w.events[w.events.length] = { k: 'p', s: r.i, n: r.ran - 1, ids, sigs };
    w.pend = [];
  }

  // The stand-ins of one run, all from this one factory so every run's look the same. gen 0 is the
  // real run's: it counts its calls and keeps what they print. A silent run's (gen > 0) are live only
  // while that run is going, so a callback it left behind (an await) cannot print the changed data later.
  function standIns(st, gen) {
    return st.recs.map((r) => ({ log: function () { return standIn(st, r, gen, arguments); } }));
  }
  function standIn(st, r, gen, args) {
    if (gen === 0) {
      if (st.phase === 1) r.ran++;
      const w = st.arr;
      if (!w) return st.call(r, slice(args), st.phase === 1 ? 'out' : '');
      if (st.phase === 1) arrPrint(w, r, args);
      // What console.log does with the arguments is the harness's, not the script's.
      w.quiet++;
      try { return st.call(r, slice(args), st.phase === 1 ? 'out' : ''); } finally { w.quiet--; }
    }
    if (gen !== st.gen || st.phase !== 2) return undefined;
    const log = st.spyLog;
    if (log && st.key === 'outC' && log.length < 300) log[log.length] = { k: 'p', s: r.i, live: slice(args) };
    return st.call(r, slice(args), st.key);
  }
  // The hook parameters every run gets (a silent run's code calls them; the real run's does not).
  function hook(impl) { return function (a, b) { return impl(a, b); }; }
  const same2 = (a, b) => b;
  // A fresh, empty arguments object for the parameter called arguments.
  const argsObj = function () { return arguments; };
  function runArgs(st, gen, pnF, dnF) {
    const a = standIns(st, gen).concat([hook(pnF || same2), hook(dnF || same2)]);
    if (st.argp) a.push(argsObj());
    return a;
  }
  // The one place a traced script is compiled, real run and silent runs alike. In code that is not
  // strict a last parameter called arguments hides the call's own arguments object (its callee is
  // the compiled source, which differs between runs); strict code refuses that name, and there
  // arguments.callee throws anyway.
  function fnew(ps, body) { return new Function(...ps, body); }
  function compile(tr, body) {
    const st = tr.st;
    const ps = tr.ids.concat([st.pn, st.dn]);
    if (st.argp !== false) {
      try {
        const f = fnew(ps.concat(['arguments']), body);
        st.argp = true;
        return f;
      } catch (e) {
        if (st.argp === true) throw e;
        st.argp = false;
      }
    }
    return fnew(ps, body);
  }
  // Right before any run enters the student's code: performance marks and measures cleared, and the
  // legacy RegExp statics (RegExp.$1, lastMatch, input) set by one fixed match, so neither can
  // tell one run from another.
  function fresh() {
    try { if (R.clearMarks) R.clearMarks(); if (R.clearMeasures) R.clearMeasures(); } catch (_) { /* keep */ }
    /(?:)/.exec('');
  }
  function enter(f, a) { return f(...a); }

  // The globals and built-ins a script could leave a note on for a later run.
  // Besides the usual ones: every function the global object holds (Error and its stackTraceLimit,
  // RegExp, Map, Symbol ...) with its prototype, the namespaces, performance, and the global
  // object's own prototype chain.
  const HELD = () => {
    const out = [];
    const seen = new Set();
    const add = (o) => { if (o !== null && (typeof o === 'object' || typeof o === 'function') && !seen.has(o)) { seen.add(o); out.push(o); } };
    [self, Math, JSON, Object, Array, String, Number, Boolean, Date, Reflect, Promise, console, Object.prototype, Array.prototype, String.prototype, Number.prototype, Boolean.prototype, Function.prototype, Promise.prototype].forEach(add);
    for (let p = Object.getPrototypeOf(self); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) add(p);
    ['Atomics', 'Intl', 'WebAssembly'].forEach((n) => { const d = R.gopd(self, n); if (d && 'value' in d) add(d.value); });
    add(PERF);
    const ks = R.ownKeys(self);
    for (let i = 0; i < ks.length; i++) {
      const d = R.gopd(self, ks[i]);
      if (!d || !('value' in d) || typeof d.value !== 'function') continue;
      add(d.value);
      try { const pd = R.gopd(d.value, 'prototype'); if (pd && 'value' in pd) add(pd.value); } catch (_) { /* keep */ }
    }
    return out;
  };
  function snapshot(st, restore) {
    st.g0 = HELD().map((o) => {
      const m = new Map();
      const ks = R.ownKeys(o);
      for (let i = 0; i < ks.length; i++) m.set(ks[i], R.gopd(o, ks[i]));
      return [o, m];
    });
    st.restore = typeof restore === 'function' ? restore : null;
  }
  // Put every held object's own properties back as they were before the real run.
  function resetGlobals(st) {
    if (st.g0) {
      for (let i = 0; i < st.g0.length; i++) {
        const o = st.g0[i][0];
        const m = st.g0[i][1];
        const ks = R.ownKeys(o);
        for (let j = 0; j < ks.length; j++) {
          const d0 = m.get(ks[j]);
          if (!d0) { try { delete o[ks[j]]; } catch (_) { /* keep */ } continue; }
          const d = R.gopd(o, ks[j]);
          if (d && 'value' in d0 && (!('value' in d) || d.value !== d0.value)) { try { R.def(o, ks[j], d0); } catch (_) { /* keep */ } }
        }
        m.forEach((d0, k) => { if (!R.gopd(o, k)) { try { R.def(o, k, d0); } catch (_) { /* keep */ } } });
      }
    }
    if (st.restore) { try { st.restore(); } catch (_) { /* keep */ } }
  }
  // Before the real run: remember the globals, then put the probe in console.log.
  function begin(tr, restore) {
    snapshot(tr.st, restore);
    console.log = tr.st.probe;
  }
  function end(tr) {
    tr.st.phase = 3;
    resetGlobals(tr.st);
  }

  // The changed run's data. A string becomes mk + s + mk, a number n * k + c; a
  // function gives its result back marked (rk + s + rk, or n * rkk + rkc), and with
  // record each result is kept; plain objects and arrays become proxies that do the
  // same to every own value read off them (an array's length is left alone).
  function makePerturber(st, record) {
    const cache = new WeakMap();
    const ours = new WeakSet();
    const own = Object.prototype.hasOwnProperty;
    const OP = Object.prototype;
    const num = (v, k, c) => (v === v && v !== Infinity && v !== -Infinity ? v * k + c : v);
    function tweak(v) {
      if (typeof v === 'string') return st.numOnly ? v : st.mk + v + st.mk;
      if (typeof v === 'number') return num(v, st.k, st.c);
      if (typeof v === 'function') return wrapFn(v);
      if (v !== null && typeof v === 'object') return wrapObj(v);
      return v;
    }
    function tweakResult(r) {
      let t;
      if (typeof r === 'string') t = st.numOnly ? r : st.rk + r + st.rk;
      else if (typeof r === 'number') t = num(r, st.rkk, st.rkc);
      else t = tweak(r);
      if (record && st.results.length < 50 && (t === null || (typeof t !== 'object' && typeof t !== 'function'))) st.results.push(t);
      return t;
    }
    function wrapFn(f) {
      if (ours.has(f)) return f;
      if (cache.has(f)) return cache.get(f);
      const w = function () { return tweakResult(f.apply(this, arguments)); };
      try { Object.defineProperty(w, 'length', { value: f.length }); } catch (_) { /* keep */ }
      cache.set(f, w); ours.add(w);
      return w;
    }
    function wrapObj(o) {
      if (ours.has(o)) return o;
      if (cache.has(o)) return cache.get(o);
      const arr = Array.isArray(o);
      const pr = Object.getPrototypeOf(o);
      if (!arr && pr !== OP && pr !== null) return o;
      const p = new Proxy(o, {
        get(t, k, r) {
          const v = Reflect.get(t, k, r);
          if (typeof k === 'symbol' || !own.call(t, k) || (arr && k === 'length')) return v;
          const d = Object.getOwnPropertyDescriptor(t, k);
          if (d && d.configurable === false && d.writable === false) return v;
          return tweak(v);
        },
      });
      cache.set(o, p); ours.add(p);
      return p;
    }
    return (name, v) => tweak(v);
  }

  // The destructure run's wrapper: every key a destructuring declaration unpacks
  // reads back with a marker (or k and c) of its own; each read is listed in dreads.
  function makeDestructurer(st) {
    const marks = {};
    const own = Object.prototype.hasOwnProperty;
    return (site, v) => {
      if (v === null || typeof v !== 'object') return v;
      return new Proxy(v, {
        get(t, k, r) {
          const x = Reflect.get(t, k, r);
          if (typeof k === 'symbol' || !own.call(t, k)) return x;
          const d = Object.getOwnPropertyDescriptor(t, k);
          if (d && d.configurable === false && d.writable === false) return x;
          const id = site + ':' + String(k);
          const m = marks[id] || (marks[id] = { s: TILDE + rnd3() + TILDE, k: rint(101, 997), c: rint(1009, 9973) });
          let y;
          if (typeof x === 'string') y = m.s + x + m.s;
          else if (typeof x === 'number' && x === x && x !== Infinity && x !== -Infinity) y = x * m.k + m.c;
          else return x;
          if (st.dreads.length < 100) st.dreads.push([site, String(k), y]);
          return y;
        },
      });
    };
  }

  // A silent run's code: each named literal wrapped in pn(name, ...), each named
  // call routed through pn(name, fn)(...), and with dn each destructuring
  // declaration's right-hand side wrapped in dn(site, ...).
  function perturbSource(code, blank, names, pn, dn) {
    const ins = [];
    const wrapped = {};
    const q = (s) => JSON.stringify(s);
    for (let qn = 0; qn < names.length; qn++) {
      const nm = names[qn];
      if (nm === '{}') continue;
      const esc = nm.replace(/\$/g, '\\$');
      const ra = new RegExp('(?<![\\w$.])(' + (nm === '*' ? '[A-Za-z_$][\\w$]*' : esc) + ')\\s*=(?![=>])\\s*(?=[\\[{]|Object\\s*\\.\\s*freeze\\s*\\()', 'g');
      let m;
      while ((m = ra.exec(blank))) {
        const open = m.index + m[0].length;
        let close = -1;
        if (blank[open] === '[' || blank[open] === OPEN_BRACE) close = matchClose(blank, open);
        else { const lp = blank.indexOf('(', open); if (lp >= 0) close = matchClose(blank, lp); }
        if (close < 0 || wrapped[open]) continue;
        wrapped[open] = true;
        ins.push([open, 0, pn + '(' + q(m[1]) + ',']);
        ins.push([close + 1, 0, ')']);
      }
      if (nm === '*') continue;
      const rb = new RegExp('(?<![\\w$.])' + esc + '(?=\\s*\\()', 'g');
      while ((m = rb.exec(blank))) {
        const before = blank.slice(Math.max(0, m.index - 40), m.index);
        if (/(?:\bfunction\s*\*?|\bnew)\s*$/.test(before)) continue;
        const lp = blank.indexOf('(', m.index + nm.length);
        const close = matchClose(blank, lp);
        if (close < 0) continue;
        let k = close + 1;
        while (k < blank.length && isWs(blank[k])) k++;
        if (blank[k] === OPEN_BRACE) continue; // a method written name(...) { }, not a call
        ins.push([m.index, 0, pn + '(' + q(nm) + ',']);
        ins.push([m.index + nm.length, 0, ')']);
      }
    }
    if (dn) {
      const rd = /(?<![\w$.])(?:const|let|var)\s*(?=\{)/g;
      let m;
      let site = 0;
      while ((m = rd.exec(blank))) {
        const cb = matchClose(blank, m.index + m[0].length);
        if (cb < 0) continue;
        let k = cb + 1;
        while (k < blank.length && isWs(blank[k])) k++;
        if (blank[k] !== '=' || blank[k + 1] === '=' || blank[k + 1] === '>') continue;
        k++;
        while (k < blank.length && isWs(blank[k])) k++;
        const s = k;
        let d = 0;
        for (; k < blank.length; k++) {
          const ch = blank[k];
          if (ch === '(' || ch === '[' || ch === OPEN_BRACE) d++;
          else if (ch === ')' || ch === ']' || ch === '}') { if (d === 0) break; d--; }
          else if (d === 0 && (ch === ';' || ch === ',' || ch === '\n')) break;
        }
        let e = k;
        while (e > s && isWs(blank[e - 1])) e--;
        // A literal written in place is not data the script built: left unmarked.
        if (e <= s || blank[s] === OPEN_BRACE || blank[s] === '[') continue;
        ins.push([s, 1, dn + '(' + site + ',']);
        ins.push([e, -1, ')']);
        site++;
      }
    }
    // Right to left; at one position an outer wrapper's opening goes left of an
    // inner one's and its closing right of it.
    ins.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    let out = code;
    for (let k = 0; k < ins.length; k++) out = out.slice(0, ins[k][0]) + ins[k][2] + out.slice(ins[k][0]);
    return out;
  }

  // Before and after one silent run of the traced code: globals put back first and after,
  // nothing printed or posted, each call site's output kept under s.key (none when key is '').
  // The code is compiled by compile() and entered by drive(), the same as the real run.
  function silentPre(tr, s) {
    const st = tr.st;
    if (s.key) for (let k = 0; k < st.recs.length; k++) st.recs[k][s.key] = [];
    resetGlobals(st);
    s.pmOwn = Object.prototype.hasOwnProperty.call(self, 'postMessage');
    s.pm = self.postMessage;
    s.then0 = Promise.prototype.then;
    s.timers = ['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame'].filter((n) => typeof self[n] === 'function');
    st.gen++;
    s.gen = st.gen;
    st.phase = 2;
    st.key = s.key;
    let f = null;
    try {
      f = compile(tr, s.srcOf(st.pn, st.dn) + (typeof s.tail === 'string' ? s.tail : st.tail));
      console.log = st.probe;
      // console.warn and console.error stay the runner's own: they post, and posting goes nowhere.
      self.postMessage = function postMessage() {};
      // Each its own function, so Object.freeze === Object.seal stays false as in the real run.
      Object.freeze = function freeze(o) { return o; };
      Object.seal = function seal(o) { return o; };
      Object.preventExtensions = function preventExtensions(o) { return o; };
      // The changed data is a proxy and structuredClone refuses a proxy: copy what it reads as, then clone.
      s.sc0 = typeof self.structuredClone === 'function' ? self.structuredClone : null;
      if (s.sc0) {
        const sc0 = s.sc0;
        const plain = (v, seen) => {
          if (v === null || typeof v !== 'object') return v;
          if (seen.has(v)) return seen.get(v);
          const pr = Object.getPrototypeOf(v);
          if (!Array.isArray(v) && pr !== Object.prototype && pr !== null) return v;
          const out = Array.isArray(v) ? [] : {};
          seen.set(v, out);
          const ks = Object.keys(v);
          for (let i = 0; i < ks.length; i++) out[ks[i]] = plain(v[ks[i]], seen);
          return out;
        };
        self.structuredClone = function structuredClone(v, o) { return arguments.length > 1 ? sc0(plain(v, new Map()), o) : sc0(plain(v, new Map())); };
      }
      // Nothing a silent run schedules ever runs.
      const then0 = s.then0;
      s.timers.forEach((n) => { self[n] = function () { return 0; }; });
      Promise.prototype.then = function then() { return then0.call(this); };
    } catch (_) {
      f = null;
    }
    return f;
  }
  function silentPost(tr, s) {
    const st = tr.st;
    st.phase = 3;
    st.key = '';
    Promise.prototype.then = s.then0;
    Object.freeze = R.freeze; Object.seal = R.seal; Object.preventExtensions = R.pext;
    if (s.sc0) self.structuredClone = s.sc0;
    const pm = s.pm;
    if (s.pmOwn) self.postMessage = pm; else { try { delete self.postMessage; } catch (_) { self.postMessage = pm; } if (self.postMessage !== pm) self.postMessage = pm; }
    resetGlobals(st);
  }

  // The names the jobs perturb ("{}" is the destructure run, "!storage" the empty-storage run,
  // "!arrays" the array watch, "!numbers" and "!stored" items 10 and 11: none is a name).
  function perturbNames(jobs) {
    const names = [];
    let destr = false;
    let empty = false;
    let arrays = false;
    let numbers = false;
    let stored = false;
    const spies = [];
    for (let j = 0; j < jobs.length; j++) {
      const sp = jobs[j] && jobs[j].script && jobs[j].script.trace === true && Array.isArray(jobs[j].script.spy) ? jobs[j].script.spy : [];
      for (let k = 0; k < sp.length; k++) if (typeof sp[k] === 'string' && IDENT_RE.test(sp[k]) && spies.indexOf(sp[k]) < 0) spies.push(sp[k]);
      const ps = jobs[j] && jobs[j].script && jobs[j].script.trace === true && Array.isArray(jobs[j].script.perturb) ? jobs[j].script.perturb : [];
      for (let k = 0; k < ps.length; k++) {
        if (ps[k] === '{}') destr = true;
        else if (ps[k] === '!storage') empty = true;
        else if (ps[k] === '!arrays') arrays = true;
        else if (ps[k] === '!numbers') numbers = true;
        else if (ps[k] === '!stored') stored = true;
        else if (typeof ps[k] === 'string' && (ps[k] === '*' || IDENT_RE.test(ps[k])) && names.indexOf(ps[k]) < 0) names.push(ps[k]);
      }
    }
    return { names, destr, empty, arrays, numbers, stored, spies };
  }

  // Item 12, the call spy. Bracket depth before each character of blanked code.
  function depthsOf(b) {
    const dp = new Int32Array(b.length + 1);
    let d = 0;
    for (let i = 0; i < b.length; i++) {
      dp[i] = d;
      const ch = b[i];
      if (ch === '(' || ch === '[' || ch === OPEN_BRACE) d++;
      else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
    }
    dp[b.length] = d;
    return dp;
  }
  // Where an initializer that starts at s ends: a , or ; at its own depth, the bracket that closes
  // around it, or a line that starts the next statement.
  function initEndOf(b, s) {
    let k = 0;
    for (let i = s; i < b.length; i++) {
      const ch = b[i];
      if (ch === '(' || ch === '[' || ch === OPEN_BRACE) k++;
      else if (ch === ')' || ch === ']' || ch === '}') { if (k === 0) return i; k--; }
      else if (k === 0 && (ch === ',' || ch === ';')) return i;
      else if (k === 0 && ch === '\n' && /^\s*(?:const|let|var|function|class|if|for|while|console)\b/.test(b.slice(i + 1, i + 40))) return i;
    }
    return b.length;
  }
  // The top-level names a script declares (the spy run hands their values back at its end).
  function topNames(b) {
    const dp = depthsOf(b);
    const out = [];
    const re = /(?<![\w$.])(?:(?:const|let|var)\s+|function\s*\*?\s*)([A-Za-z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(b)) && out.length < 80) if (dp[m.index] === 0 && out.indexOf(m[1]) < 0) out.push(m[1]);
    const more = /,\s*([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
    while ((m = more.exec(b)) && out.length < 80) if (dp[m.index] === 0 && out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  function spyTail(mark, tops) {
    const parts = tops.map((n) => JSON.stringify(n) + ': (() => { try { return [1, ' + n + ']; } catch (e) { return [0]; } })()');
    return '\n;return [' + JSON.stringify(mark) + ', {' + parts.join(', ') + '}];';
  }
  // The spy run's code: a watched function declared with function name() is wrapped at the top
  // (after any "use strict"), so every call, through an alias or as a callback too, goes through
  // the wrapper; one declared as const name = ... has its initializer wrapped; a name the script
  // does not declare (a built-in such as structuredClone) is wrapped at the top.
  function spySource(code, b, names, pn) {
    const dp = depthsOf(b);
    const ins = [];
    const pro = /^(?:\s*(["'])[^"'\n]*\1[ \t]*(?:;|\n))*/.exec(b);
    const top = pro ? pro[0].length : 0;
    const q = (s) => JSON.stringify(s);
    for (let k = 0; k < names.length; k++) {
      const n = names[k];
      const esc = n.replace(/\$/g, '\\$');
      let m;
      let done = false;
      const fd = new RegExp('(?<![\\w$.])function\\s*\\*?\\s+' + esc + '\\s*\\(', 'g');
      while ((m = fd.exec(b))) { if (dp[m.index] === 0) { ins.push([top, 0, ';' + n + ' = ' + pn + '(' + q(n) + ', ' + n + ');']); done = true; break; } }
      if (done) continue;
      const vd = new RegExp('(?<![\\w$.])(?:const|let|var)\\s+' + esc + '\\s*=(?![=>])\\s*', 'g');
      while ((m = vd.exec(b))) {
        if (dp[m.index] !== 0) continue;
        const s = m.index + m[0].length;
        const e = initEndOf(b, s);
        ins.push([s, 1, pn + '(' + q(n) + ', ']);
        ins.push([e, -1, ')']);
        done = true;
        break;
      }
      if (!done && typeof self[n] === 'function') ins.push([top, 0, ';' + n + ' = ' + pn + '(' + q(n) + ', ' + n + ');']);
    }
    ins.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    let out = code;
    for (let k = 0; k < ins.length; k++) out = out.slice(0, ins[k][0]) + ins[k][2] + out.slice(ins[k][0]);
    return out;
  }
  // A plain copy of a value for the record: what an argument held when the call was made.
  function copyVal(v, d) {
    if (v === null || (typeof v !== 'object' && typeof v !== 'function')) return v;
    if (typeof v === 'function') return '[function]';
    if (d > 4) return '...';
    try {
      if (Array.isArray(v)) { const o = []; for (let i = 0; i < v.length && i < 50; i++) { const ds = R.gopd(v, String(i)); o[i] = ds && 'value' in ds ? copyVal(ds.value, d + 1) : undefined; } return o; }
      const pr = Object.getPrototypeOf(v);
      if (pr !== Object.prototype && pr !== null) return String(v);
      const o = {};
      const ks = Object.keys(v);
      for (let i = 0; i < ks.length && i < 50; i++) { const ds = R.gopd(v, ks[i]); if (ds && 'value' in ds) o[ks[i]] = copyVal(ds.value, d + 1); }
      return o;
    } catch (_) { return '?'; }
  }
  function spyWrap(st, name, fn) {
    const w = function () {
      const log = st.spyLog;
      let ev = null;
      if (log && st.phase === 2 && log.length < 300) {
        const live = slice(arguments);
        ev = { k: 'c', fn: name, live, args: live.map((a) => copyVal(a, 0)), retLive: undefined };
        log[log.length] = ev;
      }
      const out = fn.apply(this, arguments);
      if (ev) ev.retLive = out;
      return out;
    };
    try { R.def(w, 'name', { value: fn.name, configurable: true }); R.def(w, 'length', { value: fn.length, configurable: true }); } catch (_) { /* keep */ }
    return w;
  }
  // The record a check sees: each call {k: 'c', fn, args, same, ids, ret, retSame, retId} and each
  // print {k: 'p', s, same, ids}, in order. same[i]: the top-level names whose final value IS
  // argument i (the same object, or the same primitive value); ids: an identity per object.
  function finishSpy(st, ok, v) {
    const vars = ok && Array.isArray(v) && v[0] === st.spyMark && v[1] && typeof v[1] === 'object' ? v[1] : null;
    const ids = new WeakMap();
    let next = 1;
    const isObj = (x) => x !== null && (typeof x === 'object' || typeof x === 'function');
    const idOf = (x) => { if (!isObj(x)) return null; let i = ids.get(x); if (i === undefined) { i = next++; ids.set(x, i); } return i; };
    const namesOf = (x) => (vars ? Object.keys(vars).filter((k) => Array.isArray(vars[k]) && vars[k][0] === 1 && vars[k][1] === x && (isObj(x) || typeof x === 'number' || typeof x === 'string')).slice(0, 10) : []);
    const events = (st.spyLog || []).map((e) => (e.k === 'c'
      ? { k: 'c', fn: e.fn, args: e.args, same: e.live.map(namesOf), ids: e.live.map(idOf), ret: copyVal(e.retLive, 0), retSame: namesOf(e.retLive), retId: idOf(e.retLive) }
      : { k: 'p', s: e.s, same: e.live.map(namesOf), ids: e.live.map(idOf) }));
    return { threw: !ok, events };
  }

  // Item 11: stored JSON text read back changed the way the changed run changes data (a string
  // gets mk on both sides, a number becomes n * k + c); text that is not JSON is left as it is.
  function storeTweaker(st) {
    const deep = (v) => {
      if (typeof v === 'string') return st.mk + v + st.mk;
      if (typeof v === 'number') return v === v && v !== Infinity && v !== -Infinity ? v * st.k + st.c : v;
      if (Array.isArray(v)) { const o = []; for (let i = 0; i < v.length; i++) o[i] = deep(v[i]); return o; }
      if (v !== null && typeof v === 'object') { const o = {}; const ks = Object.keys(v); for (let i = 0; i < ks.length; i++) o[ks[i]] = deep(v[ks[i]]); return o; }
      return v;
    };
    return (text) => { try { return R.stringify(deep(R.parse(text))); } catch (_) { return text; } };
  }

  // The silent runs after the real one: the changed run twice, then the destructure run (see
  // above); after a real run that threw, one more that only records what each literal assigned to
  // a name held when the run stopped (st.caps).
  function plan(tr, jobs, steps, threw) {
    const st = tr.st;
    st.phase = 3;
    resetGlobals(st);
    const pl = perturbNames(jobs);
    const lookOf = (ok, v) => (ok && typeof st.look === 'function' && st.look(v) ? v[2] : null);
    st.numOnly = pl.numbers;
    if (pl.names.length || pl.destr || pl.stored) {
      st.mk = TILDE + rnd3() + TILDE; st.k = rint(11, 97); st.c = rint(101, 997);
      st.rk = LQ + rnd3() + RQ; st.rkk = rint(11, 97); st.rkc = rint(101, 997);
    }
    if (pl.names.length || pl.destr) {
      if (pl.names.length) {
        const srcOf = (pn) => perturbSource(tr.code, st.blank, pl.names, pn, null);
        steps.push({ key: 'out2', srcOf, pnF: makePerturber(st, true), after: (ok, v) => { st.perturbed = ok || st.threw; st.vars2 = lookOf(ok, v); } });
        steps.push({
          key: 'out3', srcOf, pnF: makePerturber(st, false),
          // Let the clock move on, so a print of the time cannot come out the same twice.
          before: () => { const t = R.now(); while (R.now() === t) { /* at most a millisecond */ } },
          after: () => { for (let k = 0; k < st.recs.length; k++) st.recs[k].stable = JSON.stringify(st.recs[k].out2) === JSON.stringify(st.recs[k].out3); },
        });
      }
      if (pl.destr) steps.push({ key: 'outD', srcOf: (pn, dn) => perturbSource(tr.code, st.blank, [], pn, dn), dnF: makeDestructurer(st) });
    }
    if (pl.spies.length) {
      // The script as written, each watched function wrapped where it is defined (item 12).
      st.spyMark = 'spy' + rnd3() + rnd3() + rnd3();
      const tops = topNames(st.blank);
      steps.push({
        key: 'outC', srcOf: (pn) => spySource(tr.code, st.blank, pl.spies, pn), tail: spyTail(st.spyMark, tops),
        pnF: (n, v) => (typeof v === 'function' ? spyWrap(st, n, v) : v),
        before: () => { st.spyLog = []; },
        after: (ok, v) => { st.spyRun = finishSpy(st, ok, v); st.spyLog = null; },
      });
    }
    if (pl.stored && typeof st.tweakStore === 'function') {
      // The script as written, but every text it reads back from localStorage is changed (item 11).
      steps.push({
        key: 'outS', srcOf: (pn) => perturbSource(tr.code, st.blank, [], pn, null),
        before: () => { st.tweakStore(storeTweaker(st)); },
        after: (ok, v) => { st.tweakStore(null); st.storedRun = { threw: !ok, vars: lookOf(ok, v) }; },
      });
    }
    if (pl.empty && typeof st.mute === 'function') {
      // The data as written, with nothing saved and nothing that saves (item 8).
      steps.push({
        key: '', srcOf: (pn) => perturbSource(tr.code, st.blank, [], pn, null),
        before: () => { st.mute(true); },
        after: (ok, v) => { st.mute(false); st.emptyRun = { threw: !ok, vars: lookOf(ok, v) }; },
      });
    }
    if (threw) {
      const names = pl.names.filter((n) => n !== '*').concat('*');
      const caps = {};
      st.caps = caps;
      steps.push({ key: '', srcOf: (pn) => perturbSource(tr.code, st.blank, names, pn, null), pnF: (n, v) => { caps[n] = v; return v; } });
    }
  }

  // Every run of a traced script, the real one and the silent ones, enters the student's code
  // through this one loop, enter() and code that compile() made: the frames above the student's
  // code, their names and their places are the same in every run, so a stack trace cannot tell
  // them apart. ok(value) says the real run reached its end (the lookup statement). A silent run
  // starts only when it fits in the time left (budget ms after t0); if one does not, st.slow holds
  // the real run's ms and the checks that needed it say the program is too slow to check.
  function drive(tr, fn, jobs, ok, opts) {
    const st = tr.st;
    const o = opts || {};
    const t0 = typeof o.t0 === 'number' ? o.t0 : clock();
    st.budget = typeof o.budget === 'number' && o.budget > 0 ? o.budget : 3000;
    st.tail = typeof o.tail === 'string' ? o.tail : '';
    st.look = ok;
    st.mute = typeof o.mute === 'function' ? o.mute : null;
    st.tweakStore = typeof o.tweakStore === 'function' ? o.tweakStore : null;
    const watchArrays = !!jobs && perturbNames(jobs).arrays;
    const steps = [{ real: true }];
    const res = { value: undefined, threw: false, err: undefined };
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      let f = fn;
      if (!s.real) {
        // Every silent run still to come, each as slow as the slowest so far: skipped only when they
        // cannot fit, so nothing that used to finish in time is refused.
        const per = Math.max.apply(null, st.durs);
        if (clock() - t0 + per * (steps.length - i) + 50 > st.budget) { st.slow = st.durs[0] || 1; break; }
        if (s.before) s.before();
        f = silentPre(tr, s);
      }
      const args = runArgs(st, s.real ? 0 : s.gen, s.pnF, s.dnF);
      fresh();
      if (s.real && watchArrays) armArrays(st);
      const t = clock();
      let v;
      let threw = false;
      let err;
      try {
        if (typeof f !== 'function') throw null;
        v = enter(f, args);
      } catch (e) { threw = true; err = e; }
      if (s.real && st.arr) st.arr.off();
      st.durs.push(clock() - t);
      if (s.real) {
        res.value = v; res.threw = threw; res.err = err;
        // The host keeps what the real run left (its localStorage stand-in) for the checks.
        if (typeof o.afterReal === 'function') { try { o.afterReal(); } catch (_) { /* keep */ } }
        if (threw ? err !== o.stop && !!jobs : !!jobs && ok(v)) {
          if (threw) st.threw = true;
          plan(tr, jobs, steps, threw);
        }
      } else {
        silentPost(tr, s);
        if (s.after) s.after(!threw, v);
      }
    }
    return res;
  }

  return { blankCode, instrument, begin, end, compile, drive, clock, resetGlobals };
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
