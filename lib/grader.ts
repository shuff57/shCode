import type { Requirement, FunctionClause } from './types';
import type { ModelDoc } from './model-types';
import { checkModel, type Refusals } from './model-check';
import type { TestRunResults } from './test-harness-source';
import { bindPattern } from './student-names';
import { stripJsComments, blankStringContents } from './js-source-clean';

/** The reSHape ModelDoc a `model` requirement checks against. Optional and
 *  last so every existing caller — which passes only
 *  (requirements, files, passingScore) — keeps working unchanged; a caller
 *  with no reSHape lesson in play simply never supplies it, and a `model`
 *  requirement then fails via checkModel's own null-doc message. */
export interface GradeContext {
  modelDoc?: ModelDoc | null;
  /** Feature ids the kernel refused to build, with its reason; a refused
   *  feature does not count towards a `model` requirement. */
  refusals?: Refusals | null;
  /** What the last Run's `tests` cases found (lib/test-harness-source.ts). Kept
   *  out of grade() itself so grade() stays synchronous: running the student's
   *  code is async and belongs to the runner. Absent, a `tests` requirement
   *  fails with "run your code"; present but made from different code than
   *  files[req.file || 'script.js'], it fails as stale. */
  testResults?: TestRunResults | null;
}

interface GradeResult {
  id: string;
  title: string;
  status: 'passed' | 'failed';
  messages: string[];
  pointsEarned: number;
  pointsPossible: number;
}

export interface GradeReport {
  results: GradeResult[];
  totalScore: number;
  totalPossible: number;
  passed: boolean;
  passingScore: number;
}

// What a regex requirement reads: comments stripped, then, when the
// requirement sets `ignoreStrings`, string contents blanked.
function readableSource(req: Requirement, raw: string): string {
  if (req.stripComments === false) return raw;
  // `<!--` / `-->` / `#!` are comments only in JavaScript; a README plan line may start with an arrow `-->`.
  const code = stripJsComments(raw, !/\.(md|txt)$/i.test(req.file || ''));
  return req.ignoreStrings ? blankStringContents(code) : code;
}

// Return the body of `function <name>(...) { ... }` by balancing braces,
// or null if the function isn't found. Lets requirements scope a pattern
// to e.g. draw()'s body instead of the whole file.
function extractFunctionBody(src: string, name: string): string | null {
  const re = new RegExp(`function\\s+${name.replace(/\$/g, '\\$')}\\s*\\([^)]*\\)\\s*\\{`);
  const m = src.match(re);
  if (!m || m.index === undefined) return null;
  let depth = 1;
  let i = m.index + m[0].length;
  const bodyStart = i;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(bodyStart, i);
    }
    i++;
  }
  return null;
}

// ---- Checkers ----

// Default flags is '' (case-sensitive). Set req.flags = 'i' explicitly if
// you want case-insensitive. moSHion identifiers (Canvas, Sprite, kb,
// world) are case-sensitive so strict is the right default.
function checkRegex(req: Requirement, files: Record<string, string>): boolean {
  // Fail closed. A summative lesson has `pattern` stripped from the copy the
  // browser gets (lib/quiz-redact.ts -- the pattern IS the answer key), and
  // `new RegExp('')` matches every string there is. Without this guard every
  // requirement on every test part reported PASSED whatever the student wrote:
  // measured on 2.7.3, where all five cards went green on the untouched
  // starter. A check that could not run must not report a pass.
  if (!req.pattern) return false;
  const raw = files[req.file || ''] || '';
  const content = readableSource(req, raw);
  const regex = new RegExp(bindPattern(req.pattern, req, raw), req.flags ?? '');
  return regex.test(content);
}

// `followCalls`: the bodies of the student's own functions that `bodies` call,
// followed two calls deep (draw() -> helper -> helper). A call is `name(` not
// after a dot (kb.pressing() is a method, not a helper) and not the `function
// name(` of a declaration, where `function name(...) {` is declared in the file.
// A helper that nothing calls is never read, so it cannot satisfy a card on its
// own. Plain linear scans, one extract per declared name at most, so adversarial
// text stays cheap (following calls inside one big regex took 20+ s).
function calledHelperBodies(src: string, bodies: string[], seen: Set<string>): string[] {
  const declared = new Set<string>();
  for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) declared.add(m[1]);
  const found: string[] = [];
  let frontier = bodies;
  for (let depth = 0; depth < 2 && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const body of frontier) {
      for (const m of body.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)(?=\s*\()/g)) {
        const name = m[2];
        if (seen.has(name) || !declared.has(name)) continue;
        const at = (m.index ?? 0) + m[1].length;
        if (/\bfunction\s*$/.test(body.slice(Math.max(0, at - 20), at))) continue;
        seen.add(name);
        const helper = extractFunctionBody(src, name);
        if (helper !== null) next.push(helper);
      }
    }
    found.push(...next);
    frontier = next;
  }
  return found;
}

// The text an inFunction pattern reads: the named functions' bodies, then (with
// followCalls) the bodies of the helpers they call. Empty when none is declared.
function functionBodies(content: string, fn: string | string[] | undefined, followCalls: boolean): string[] {
  const names = Array.isArray(fn) ? fn : [fn || 'draw'];
  const bodies = names
    .map((n) => extractFunctionBody(content, n))
    .filter((b): b is string => b !== null);
  if (!followCalls || bodies.length === 0) return bodies;
  return [...bodies, ...calledHelperBodies(content, bodies, new Set(names))];
}

// One pattern tested on the bodies of some functions (and, with the
// requirement's followCalls, the helpers they call). A clause may read strings
// differently from its requirement: `ignoreStrings` on the clause wins.
function clauseMatches(req: Requirement, raw: string, clause: FunctionClause): boolean {
  if (!clause.pattern) return false;
  const content = readableSource({ ...req, ignoreStrings: clause.ignoreStrings ?? req.ignoreStrings }, raw);
  const bodies = functionBodies(content, clause.function, !!req.followCalls);
  if (bodies.length === 0) return false;
  return new RegExp(bindPattern(clause.pattern, req, raw), req.flags ?? '').test(bodies.join('\n'));
}

function checkInFunction(req: Requirement, files: Record<string, string>): boolean {
  if (!req.pattern) return false; // same fail-closed reason as checkRegex
  const raw = files[req.file || ''] || '';
  // `orIn`: other places that also count ("a velocity set once in setup()").
  const found = clauseMatches(req, raw, { function: req.function ?? 'draw', pattern: req.pattern })
    || (req.orIn ?? []).some((c) => clauseMatches(req, raw, c));
  if (!found) return false;
  // `forbidIn`: places that must NOT have it ("made in setup() and never in draw()").
  return !(req.forbidIn ?? []).some((c) => clauseMatches(req, raw, c));
}

// ---- Main grader ----
export function grade(
  requirements: Requirement[],
  files: Record<string, string>,
  passingScore: number = 0,
  context?: GradeContext
): GradeReport {
  const results: GradeResult[] = requirements.map((req) => {
    const type = req.type || 'regex';
    let passed = false;
    let modelMessage: string | null = null;
    let testMessage: string | null = null;

    switch (type) {
      case 'regex':
        passed = checkRegex(req, files);
        if (!passed && typeof req.orTest === 'string' && req.orTest !== '') {
          // The named tests requirement proved this at run time (see Requirement.orTest);
          // results from older code never count.
          const tr = context?.testResults;
          passed = !!tr && tr.code === (files[req.file || 'script.js'] ?? '') && tr.byId[req.orTest]?.status === 'passed';
        }
        break;
      case 'inFunction':
        passed = checkInFunction(req, files);
        break;
      case 'output':
      case 'function':
        // These require sandboxed execution via Web Worker (client-side only)
        passed = false;
        break;
      case 'custom':
        passed = false;
        break;
      case 'tests':
        {
          const tr = context?.testResults;
          const res = tr?.byId[req.id];
          if (!tr) {
            testMessage = 'Press Run so your code can be checked.';
          } else if (tr.code !== (files[req.file || 'script.js'] ?? '')) {
            testMessage = 'You changed your code since the last run. Press Run again to check it.';
          } else if (!res) {
            testMessage = 'This check has not run yet. Press Run again.';
          } else {
            passed = res.status === 'passed';
            if (!passed) testMessage = res.message ?? 'A check failed.';
          }
        }
        break;
      case 'model':
        {
          const result = checkModel(req, context?.modelDoc ?? null, context?.refusals ?? null);
          passed = result.passed;
          // The checker's own sentence ("Expected a round 3; the round could
          // not be built: ...") is the only place the kernel's reason reaches
          // the student without clicking the warning step.
          if (!passed && result.message) modelMessage = result.message;
        }
        break;
    }

    const points = req.points || 0;
    return {
      id: req.id,
      title: req.title,
      status: passed ? ('passed' as const) : ('failed' as const),
      // A failing requirement used to render a red bar, its title, and
      // nothing else -- the student could see WHICH check failed but never
      // why, so a correct-looking answer that missed by one token read as
      // the grader being arbitrary (issue report #9). Both renderers
      // already handled `messages`; nothing ever filled it.
      messages: passed ? [] : [...(modelMessage ? [modelMessage] : []), ...(testMessage ? [testMessage] : []), ...(req.hint ? [req.hint] : [])],
      pointsEarned: passed ? points : 0,
      pointsPossible: points,
    };
  });

  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.pointsPossible, 0);

  return {
    results,
    totalScore,
    totalPossible,
    passed: totalScore >= passingScore,
    passingScore,
  };
}
