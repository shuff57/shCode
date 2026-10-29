// Deterministic grader for a Chapter 3 pseudocode PLAN (3.9.1 and the same
// shape in 1.6.1 / 2.6.1).
//
// WHY THIS EXISTS. The AI grader marking these criteria produced different
// verdicts for the same plan on different runs -- measured on 106 real
// submissions: six of sixteen identical plans changed verdicts, and a single
// criterion moved on ~18% of cells. Every criterion is STRUCTURAL ("four named
// calls", "a loop over the list", "the change-one-record call", "load first,
// save last"), so the text itself can decide them. No model, no sampling, no
// drift.
//
// TWO BARS, ONE PARSER.
//   checkPlan()      -- the four criteria. At least half FULLY met passes. This
//                       is the grader for a plan written from nothing.
//   checkPlanGaps()  -- 3.9.1's skeleton: eight blanks in a plan whose shape is
//                       given, one gap per blank, six of the eight needed. The
//                       shape is the lesson's, so the marks are about which
//                       function goes in which blank and what it is handed.
// Both read the same parse, so a plan cannot be credited by one and not the
// other for the same words.
//
// It does NOT judge whether the plan solves the problem (the right comparison,
// the right report). That is the lesson's content, not this rubric, and a
// parser cannot see it. A plan that structures everything correctly but
// computes the wrong thing is out of scope here -- the build part (3.9.2)
// catches it.
//
// JavaScript-shaped plans are marked on their main sequence only. Students who
// write real code are not marked down for it (the rubric says so), but the
// function BODIES they write are not the plan: a call inside one is that
// function's business, and neither `let(` nor `push(` is one of the pair's
// named functions. Three fixes on 2026-10-28 came from the real corpus, where
// plan #11 was credited with ten named calls and makes two.

import { formatPlan, type PlanLine } from './plan-format';

export type PlanVerdict = 'met' | 'partial' | 'missing';

/**
 * Lessons whose part is this plan shape. The Chapter 1 and 2 design parts ship
 * different rubrics (three and four unrelated criteria), so they are NOT listed
 * here; adding one without teaching this module its criteria would mislabel it.
 */
export const PLAN_LESSONS = ['3-9-1-ch3-group-pa-design-chart'];

export interface PlanEvidence {
  /** 1-based line number in the student's text. */
  line: number;
  text: string;
}

export interface PlanCriterion {
  id: string;
  title: string;
  verdict: PlanVerdict;
  feedback: string;
  evidence: PlanEvidence[];
}

export interface PlanCheck {
  ok: true;
  criteria: PlanCriterion[];
  /** met = 1, partial = 0.5 -- the same scale as lib/grade-pass.ts. */
  totalEarned: number;
  totalPossible: number;
  /** checkPlan: at least half the criteria fully met. checkPlanGaps: see GAP_PASS. */
  passed: boolean;
  summary: string;
  /** How the plan was read after formatting (indentation and scaffolding). */
  canonical: string;
  /** What the formatter changed, in plain words. Empty for a plan already tidy. */
  notes: string[];
  /** Lines that are still a run of underscores -- an unfilled blank. */
  blanks: number;
}

/** A formatted line, as the formatter hands it over. */
type SrcLine = PlanLine;

interface Call {
  name: string;
  args: string[];
  line: number;
  raw: string;
}

const KEYWORDS = new Set([
  'if', 'else', 'otherwise', 'for', 'while', 'repeat', 'set', 'report', 'print',
  'put', 'output', 'say', 'display', 'show', 'call', 'return', 'start', 'end',
  'let', 'const', 'var', 'function', 'funtion', 'func', 'def', 'method', 'new',
  'throw', 'typeof', 'await', 'async', 'switch', 'case', 'do', 'try', 'catch',
  'finally', 'import', 'export', 'class', 'this', 'super', 'yield', 'delete',
  'void', 'in', 'of',
]);

/**
 * Words that are never a named call: JavaScript builtins and the language's own
 * plumbing. A plan written as JavaScript (`stock.push(item)`, `JSON.stringify`,
 * `localStorage.setItem`) is welcome -- the rubric says real code showing the
 * same plan is not marked down -- but `push(` is not one of the pair's functions.
 * Counting them credited plan #11 with ten named calls when it makes two.
 */
const NOT_CALLS = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'concat', 'join', 'split',
  'map', 'filter', 'reduce', 'foreach', 'find', 'findindex', 'some', 'every',
  'includes', 'indexof', 'sort', 'reverse', 'keys', 'values', 'entries', 'length',
  'tostring', 'tofixed', 'tolowercase', 'touppercase', 'trim', 'replace', 'match',
  'log', 'warn', 'error', 'stringify', 'parse', 'setitem', 'getitem', 'removeitem',
  'clear', 'localstorage', 'json', 'console', 'math', 'random', 'floor', 'ceil',
  'round', 'abs', 'max', 'min', 'now', 'date', 'number', 'string', 'boolean',
  'array', 'object', 'promise', 'parseint', 'parsefloat', 'isnan', 'alert',
  'prompt', 'confirm', 'settimeout', 'setinterval', 'fetch', 'then',
  'getelementbyid', 'queryselector', 'addeventlistener',
]);

const CALL_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)/g;

/** A run of underscores left in the plan is a blank the student never filled. */
const BLANK = /_{3,}/;

function splitArgs(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function callsIn(line: SrcLine, known: string[]): Call[] {
  const out: Call[] = [];
  CALL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CALL_RE.exec(line.text))) {
    const name = m[1];
    const low = name.toLowerCase();
    if (KEYWORDS.has(low) || NOT_CALLS.has(low)) continue;
    out.push({ name, args: splitArgs(m[2]), line: line.n, raw: line.text });
  }
  if (out.length) return out;
  // "name of the list" -- the no-parentheses form students actually write
  // ("set total to totalvalue of stock"). Only known function names count, so
  // prose that happens to start with a word cannot become a call.
  for (const name of known) {
    if (NOT_CALLS.has(name.toLowerCase())) continue;
    const hit = line.text.match(new RegExp(`\\b${name}\\s+of\\s+([^.;]+)`, 'i'));
    if (hit) {
      out.push({ name, args: splitArgs(hit[1].replace(/\band\b/gi, ',')), line: line.n, raw: line.text });
      return out;
    }
  }
  // A misspelt name in that form ("sellItm of stock"): bind the word to the known
  // name one or two edits away, so a typo does not lose the call.
  const words = line.text.match(/\b[A-Za-z_][A-Za-z0-9_]{4,}\b/g) ?? [];
  for (const w of words) {
    const low = w.toLowerCase();
    if (NOT_CALLS.has(low) || KEYWORDS.has(low)) continue;
    const near = known.find((k) => !NOT_CALLS.has(k) && nearName(low, k));
    if (!near) continue;
    const hit = line.text.match(new RegExp(`\\b${w}\\s+of\\s+([^.;]+)`, 'i'));
    if (hit) {
      out.push({ name: near, args: splitArgs(hit[1].replace(/\band\b/gi, ',')), line: line.n, raw: line.text });
      return out;
    }
  }
  // "set stock to loadstock" -- a no-argument load/save call.
  for (const name of known.filter((n) => /^(load|save)/.test(n))) {
    if (new RegExp(`\\b(?:to|call)\\s+${name}\\b`, 'i').test(line.text)) {
      out.push({ name, args: [], line: line.n, raw: line.text });
      return out;
    }
  }
  return out;
}

/** Function names the plan defines in its contracts, plus the course's names. */
function knownNamesFor(before: SrcLine[]): string[] {
  const names = new Set<string>();
  for (const l of before) {
    const m = l.text.match(/^[-*•\s]*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (m) names.add(m[1].toLowerCase());
  }
  for (const n of [
    'makeitem', 'totalvalue', 'lowstock', 'receiptlines', 'recepitlines', 'sellitem', 'savestock', 'loadstock',
    'makerunner', 'totalseconds', 'slowrunners', 'resultlines', 'droplap', 'savemeet', 'loadmeet',
    'makevariety', 'totalseeds', 'lowpackets', 'labellines', 'sowpacket', 'savetray', 'loadtray',
    'maketitle', 'totalpages', 'longtitles', 'spinelins', 'spineslines', 'spinelins', 'checkout', 'savecart', 'loadcart',
  ]) names.add(n);
  return [...names].sort((a, b) => b.length - a.length);
}

// --------------------------------------------------------------- the five jobs
// The plan's names are the student's own. "Credit when the names say what the
// function does" is the rubric's own words, so the grader classifies each call
// by what its name and its contract say, not by matching one fixed spelling.
// This is what keeps `takeOne`, `readStock`, `recieptLines` and `sellItm` from
// being marked missing: a correct plan is not wrong because a name is worded
// differently, abbreviated, or misspelt.

type Job = 'build' | 'total' | 'subset' | 'lines' | 'change' | 'save' | 'load';

const JOB_IN_DESC: [Job, RegExp][] = [
  ['change', /\b(lowers?|reduces?|decrements?|by (one|1)|minus (one|1)|takes? (one|1)|sells?|removes?|checks? ?out)\b/i],
  ['save', /\b(saves?|stores?|writes?|persists?|keeps?)\b/i],
  ['load', /\b(loads?|reads?|restores?|retrieves?|fetches?)\b/i],
  ['total', /\b(totals?|sums?|adds? up|worth|price \*|times)\b/i],
  ['subset', /\b(less than|below|under|above|greater|new (array|list)|subset|filter)\b/i],
  ['lines', /\b(one line per|line for each|lines?)\b/i],
  ['build', /\b(one (item|record|runner|variety|title|entry)|object|creates? (an|one))\b/i],
];

const JOB_IN_NAME: [Job, RegExp][] = [
  ['change', /sell|drop|sow|checkout|checkout|take|remove|decrement|minus|decr/i],
  ['save', /save|store|write|persist|keep/i],
  ['load', /load|read|restore|retriev|fetch/i],
  ['total', /tot|sum|value|price|cost|worth/i],
  ['subset', /low|under|below|slow|long|few|short/i],
  ['lines', /line|label|spine|receip|reciep|receip/i],
  ['build', /make|create|build|new|add/i],
];

interface Contract {
  name: string;
  desc: string;
  params: number;
}

function parseContracts(before: SrcLine[]): Contract[] {
  const out: Contract[] = [];
  for (const l of before) {
    const m = l.text.match(/^[-*•\s]*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(.*)$/);
    if (m) out.push({ name: m[1].toLowerCase(), desc: m[3] || '', params: splitArgs(m[2]).length });
  }
  return out;
}

/**
 * Optimal string alignment distance: substitutions, insertions, deletions and a
 * swapped pair of neighbours each cost 1. The transposition case is why this is
 * not plain Levenshtein -- "reprot" is one slip of the fingers from "report",
 * and "report" is two substitutions from "repeat", which must stay different.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Is `word` a typo of `target`? One slip, or two in a long name. */
function nearName(word: string, target: string): boolean {
  if (word.length < 5) return false;
  return editDistance(word, target) <= (Math.min(word.length, target.length) >= 9 ? 2 : 1);
}

/** Every job a call's name and contract point at (possibly none). */
function jobsOf(contracts: Contract[], name: string): Job[] {
  const low = name.toLowerCase();
  const jobs = new Set<Job>();
  const exact = contracts.find((c) => c.name === low);
  // A misspelt call still belongs to the contract it is trying to name.
  const near =
    exact ??
    contracts.find((c) => nearName(low, c.name));
  if (near) for (const [job, re] of JOB_IN_DESC) if (re.test(near.desc)) jobs.add(job);
  for (const [job, re] of JOB_IN_NAME) if (re.test(low)) jobs.add(job);
  return [...jobs];
}

// A misspelt keyword ("reprot total", "repett for each line") must not lose the
// line: the marker words are few and short, so one or two edits are safe, and
// only words of five letters or more are fuzzed (so "look" is never "loop").
const fuzzyWord = (word: string, choices: string[]): boolean => choices.some((c) => nearName(word, c));
const firstWord = (l: SrcLine): string => (l.text.match(/^[A-Za-z]+/) ?? [''])[0].toLowerCase();

// A line that is still a run of underscores is a blank, not a step: `report
// ______` has not reported anything, and must not count as the report after a
// change or as the loop's work.
const isReport = (l: SrcLine) =>
  !BLANK.test(l.text) &&
  (/^(report|print|put|output|say|display|show|log|write)\b/i.test(l.text) ||
    /\bconsole\.log\s*\(/i.test(l.text) ||
    fuzzyWord(firstWord(l), ['report', 'display', 'output', 'write', 'print']));
const isLoop = (l: SrcLine) =>
  /^(for\s+each|for|repeat\s+for|repeat|while|loop)\b/i.test(l.text) ||
  fuzzyWord(firstWord(l), ['foreach', 'repeat', 'while']);
const isIf = (l: SrcLine) => /^(if|else|otherwise)\b/i.test(l.text);

function bodyOf(lines: SrcLine[], i: number): SrcLine[] {
  const head = lines[i];
  const body: SrcLine[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (!l.text) continue;
    if (l.indent <= head.indent) break;
    body.push(l);
  }
  return body;
}

/** The change-one-record function for the problem the plan names. */
function changeNamesFor(text: string): string[] {
  const p = (text.match(/problem\s*[:\-]\s*([^\n]+)/i)?.[1] || '').toLowerCase();
  if (/lap/.test(p)) return ['droplap'];
  if (/seed|tray/.test(p)) return ['sowpacket'];
  if (/library|cart/.test(p)) return ['checkout'];
  if (/snack|shop|stock/.test(p)) return ['sellitem'];
  // No header: accept any of the four course names, then a descriptive fallback.
  return ['sellitem', 'droplap', 'sowpacket', 'checkout'];
}

function isChangeCall(c: Call, names: string[]): boolean {
  const n = c.name.toLowerCase();
  return names.includes(n) || /sell|drop|sow|checkout|change|update/i.test(n);
}

const ev = (l: SrcLine): PlanEvidence => ({ line: l.n, text: l.raw.trim() || l.text });

/**
 * END of the plan -- not END FOR / END IF / END WHILE, which close a step inside
 * it. Reading "END FOR" as the end of the plan cut a correct plan off at its
 * first loop and cost it three criteria.
 */
const isPlanEnd = (l: SrcLine) =>
  /^end\b(?!\s*(?:for|if|while|loop|repeat|each|sub|subroutine|function|method))/i.test(l.text);

// ------------------------------------------------------------------ the parse
// One reading of the text, shared by both graders below. Keeping it in one
// place is why "credited by the four criteria" and "credited by the gaps" can
// never disagree about the same words.

interface PlanParse {
  text: string;
  lines: SrcLine[];
  mainSeq: SrcLine[];
  before: SrcLine[];
  known: string[];
  calls: Call[];
  /** One call per name, the first time it is written. */
  callsById: Map<string, Call>;
  contracts: Contract[];
  of: (c: Call) => Job[];
  has: (c: Call, job: Job) => boolean;
  needsNothing: (c: Call) => boolean;
  /** Calls handed something (or needing nothing), the rubric's "usable" calls. */
  usable: Call[];
  /** Usable calls whose names say what they do. */
  named: Call[];
  notes: string[];
  canonical: string;
  /** Main-sequence lines that are still a run of underscores. */
  blanks: number;
  startLine: number;
}

function parsePlan(text: string): PlanParse {
  const formatted = formatPlan(text);
  const { lines, notes, canonical } = formatted;
  const start = lines.findIndex((l) => /^start\b/i.test(l.text));
  const end = start >= 0 ? lines.findIndex((l, i) => i > start && isPlanEnd(l)) : -1;
  const mainStart = start >= 0 ? start : 0;
  const mainEnd = end >= 0 ? end : lines.length - 1;
  const main = lines.slice(mainStart, mainEnd + 1);
  const before = start >= 0 ? lines.slice(0, start) : [];
  // Function definitions written inside START..END are not the main sequence:
  // the formatter marks them, so the grader does not have to recognise them.
  const mainSeq = main.filter((l) => l.role !== 'definition');

  // Calls made in the main sequence. A contract line ("- sellItem(list, name)
  // lowers ...", before START) is a description, not a call -- the distinction
  // the old regex could not make -- and a call inside a written-out function
  // body is that function's business, not the plan's.
  const known = knownNamesFor(before);
  const calls = mainSeq.flatMap((l) => callsIn(l, known));
  const callsById = new Map<string, Call>();
  for (const c of calls) {
    const key = c.name.toLowerCase();
    if (!callsById.has(key)) callsById.set(key, c);
  }
  // What each call is FOR, from its own name and from the student's contract for
  // it. Nothing below matches a fixed spelling: `takeOne` whose contract says
  // "lowers that item's count by one" is the change function, whatever it is called.
  const contracts = parseContracts(before);
  const jobs = new Map<string, Job[]>();
  for (const c of callsById.values()) jobs.set(c.name.toLowerCase(), jobsOf(contracts, c.name));
  const of = (c: Call) => jobs.get(c.name.toLowerCase()) ?? [];
  const has = (c: Call, job: Job) => of(c).includes(job);
  // "Each handed what it needs": a load or a save needs nothing, and a contract
  // that declares no parameters says so. Counting only calls with arguments cost
  // a correct plan the criterion for writing `loadStock()` the normal way.
  const needsNothing = (c: Call) => {
    if (has(c, 'load') || has(c, 'save')) return true;
    const k = contracts.find((x) => x.name === c.name.toLowerCase());
    return k ? k.params === 0 : false;
  };
  const usable = [...callsById.values()].filter((c) => c.args.length > 0 || needsNothing(c));
  const named = usable.filter((c) => of(c).length > 0);
  return {
    text,
    lines,
    mainSeq,
    before,
    known,
    calls,
    callsById,
    contracts,
    of,
    has,
    needsNothing,
    usable,
    named,
    notes,
    canonical,
    blanks: mainSeq.filter((l) => BLANK.test(l.text)).length,
    startLine: start >= 0 ? lines[start].n : 0,
  };
}

// ------------------------------------------------------------------ the loop
// A loop counts when its body does something with each item. The work can be
// indented under it, written on the head line itself ("for each line in lines,
// put it on screen"), or repeated by a numbered "go back to #5".
function loopAnalysis(p: PlanParse): { loopWork: LoopWork[]; offPlan?: SrcLine } {
  const { mainSeq, known, before, lines } = p;
  const worksLine = (l: SrcLine) =>
    !BLANK.test(l.text) &&
    (isIf(l) || /\b(put|print|report|output|display|show|log)\b/i.test(l.text) || callsIn(l, known).length > 0);
  const inlineWork = (l: SrcLine): boolean => {
    const m = l.text.match(/[,:]\s+(.+)$/);
    if (!m) return false;
    return /^(put|print|report|show|display|output|say|call|set|add|update)\b/i.test(m[1]) || /\b[A-Za-z_]\w*\s*\(/.test(m[1]);
  };
  // A body can be closed by a word instead of indentation: END FOR, NEXT, END LOOP.
  const LOOP_CLOSE = /^(end\s*(for|loop|while|repeat|each)|next\b|wend\b|until\b)/i;
  const loopIdx = mainSeq.map((l, i) => (isLoop(l) ? i : -1)).filter((i) => i >= 0);
  const loopWork: LoopWork[] = loopIdx.map((i) => {
    let body = bodyOf(mainSeq, i);
    if (body.length === 0) {
      for (let j = i + 1; j < mainSeq.length && j <= i + 20; j++) {
        if (LOOP_CLOSE.test(mainSeq[j].text)) { body = mainSeq.slice(i + 1, j); break; }
        if (isLoop(mainSeq[j])) break;
      }
    }
    return { head: mainSeq[i], body, works: inlineWork(mainSeq[i]) || body.some(worksLine) };
  });
  // A numbered "go back to #5" is a loop in the lesson's own words ("repeat for
  // every item, or equivalent"). The lines between the target and the jump repeat.
  const backIdx = mainSeq.findIndex((l) => /go\s+back\s+to\s*#?\d+/i.test(l.text));
  if (backIdx >= 0) {
    const num = Number((mainSeq[backIdx].text.match(/go\s+back\s+to\s*#?(\d+)/i) || [])[1]);
    const target = mainSeq.findIndex((l, i) => i < backIdx && Number((l.raw.match(/^\s*(\d+)/) || [])[1]) === num);
    if (target >= 0) {
      const body = mainSeq.slice(target, backIdx);
      loopWork.push({
        head: mainSeq[backIdx],
        body,
        works: body.some(worksLine),
        back: mainSeq[target],
      });
    }
  }
  // A loop described outside the main sequence -- in the contracts, or inside a
  // function the student wrote out -- is not the main plan's loop; say so rather
  // than silently missing it.
  const contractLoops = before.filter((l) => /\b(for\s+each|repeat|loop|go\s+through)\b/i.test(l.text));
  const defLoops = lines.filter((l) => l.role === 'definition' && isLoop(l));
  return { loopWork, offPlan: contractLoops[0] ?? defLoops[0] };
}

interface LoopWork {
  head: SrcLine;
  body: SrcLine[];
  works: boolean;
  back?: SrcLine;
}

// -------------------------------------------------------- the four criteria
// For a plan written from nothing. At least half fully met passes.

export function checkPlan(text: string): PlanCheck {
  const p = parsePlan(text);
  const { mainSeq, callsById, needsNothing, named, usable: withArgs, notes, canonical, blanks } = p;
  const { loopWork, offPlan } = loopAnalysis(p);

  // --- functions-as-calls ---------------------------------------------------
  let functions: PlanCriterion;
  if (withArgs.length >= 4 && named.length >= 2) {
    functions = {
      id: 'functions-as-calls',
      title: "The pair's functions are used as named calls",
      verdict: 'met',
      feedback: `Your main section calls ${withArgs.length} functions by name: ${withArgs.map((c) => c.name).join(', ')}.`,
      evidence: withArgs.slice(0, 8).map((c) => ({ line: c.line, text: c.raw })),
    };
  } else if (withArgs.length >= 4) {
    // Four calls, but the names do not say what any of them does -- the rubric's
    // own words for a partial ("the names do not say what the function does").
    functions = {
      id: 'functions-as-calls',
      title: "The pair's functions are used as named calls",
      verdict: 'partial',
      feedback:
        `Your main section calls ${withArgs.length} functions, but their names do not say what they do: ${withArgs.map((c) => c.name).join(', ')}. ` +
        'Name each one for its job (totalValue, lowStock, receiptLines, sellItem, saveStock) or say in the contracts what it does.',
      evidence: withArgs.map((c) => ({ line: c.line, text: c.raw })),
    };
  } else if (withArgs.length >= 2) {
    const noArgs = [...callsById.values()].filter((c) => c.args.length === 0 && !needsNothing(c)).map((c) => c.name);
    functions = {
      id: 'functions-as-calls',
      title: "The pair's functions are used as named calls",
      verdict: 'partial',
      feedback:
        `Your main section calls ${withArgs.length} functions by name: ${withArgs.map((c) => c.name).join(', ')}. ` +
        `The plan needs at least four${noArgs.length ? `, and ${noArgs.join(', ')} ${noArgs.length === 1 ? 'is' : 'are'} written with nothing to work on` : ''}.`,
      evidence: withArgs.map((c) => ({ line: c.line, text: c.raw })),
    };
  } else {
    functions = {
      id: 'functions-as-calls',
      title: "The pair's functions are used as named calls",
      verdict: 'missing',
      feedback:
        'The main section does not call four functions by name. Write each job as a call with what it needs, for example "set total to totalValue(stock)". ' +
        'A line in the contracts that describes a function is not a call.',
      evidence: withArgs.map((c) => ({ line: c.line, text: c.raw })),
    };
  }

  // --- loop-over-the-list ---------------------------------------------------
  let loop: PlanCriterion;
  if (loopWork.some((l) => l.works)) {
    const good = loopWork.find((l) => l.works)!;
    loop = {
      id: 'loop-over-the-list',
      title: 'The list is walked by a loop',
      verdict: 'met',
      feedback: good.back
        ? `Line ${good.head.n} goes back to line ${good.back.n}, so the lines between are repeated for each item.`
        : `Line ${good.head.n} starts a loop over the list, and its indented body works on each item.`,
      evidence: [ev(good.head), ...good.body.slice(0, 3).map(ev)],
    };
  } else if (loopWork.length > 0) {
    loop = {
      id: 'loop-over-the-list',
      title: 'The list is walked by a loop',
      verdict: 'partial',
      feedback:
        `Line ${loopWork[0].head.n} starts a loop, but its indented body does not do anything with each item. ` +
        'Put the work to repeat on the line(s) indented under the loop.',
      evidence: [ev(loopWork[0].head), ...loopWork[0].body.slice(0, 3).map(ev)],
    };
  } else {
    const inside = offPlan
      ? ` The loop at line ${offPlan.n} is inside a function description, not the main plan.`
      : '';
    loop = {
      id: 'loop-over-the-list',
      title: 'The list is walked by a loop',
      verdict: 'missing',
      feedback: `The main section never walks the list with a loop. Add a FOR EACH line after the list is loaded, with the work indented under it.${inside}`,
      evidence: offPlan ? [ev(offPlan)] : [],
    };
  }

  // --- change-one-record ----------------------------------------------------
  const { changeCall, reportAfter, unplaced } = changeAnalysis(p);
  let change: PlanCriterion;
  if (!changeCall && named.length >= 2 && unplaced.length > 0) {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'partial',
      feedback:
        `Could not tell which call changes one record, so this one needs a look: ${unplaced.map((c) => `${c.name} (line ${c.line})`).join(', ')}. ` +
        'If one of them lowers a count by one, name it so that it says so, or say it in the contracts.',
      evidence: unplaced.slice(0, 3).map((c) => ({ line: c.line, text: c.raw })),
    };
  } else if (!changeCall) {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'missing',
      feedback:
        'The plan never calls a function that changes one record. Call it with the list and the name of the item to change ' +
        '(for example sellItem(stock, "Popcorn")), then report the new total or quantity.',
      evidence: [],
    };
  } else if (changeCall.args.length >= 2 && reportAfter) {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'met',
      feedback: `Line ${changeCall.line} changes one record on the list, and line ${reportAfter.n} reports the result.`,
      evidence: [ev(lineOf(mainSeq, changeCall.line)), ev(reportAfter)],
    };
  } else if (changeCall.args.length >= 2) {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'partial',
      feedback: `Line ${changeCall.line} calls the change function with the list and a name, but no later line reports or uses the changed list. Add a report of the new total or the item's new quantity after it.`,
      evidence: [ev(lineOf(mainSeq, changeCall.line))],
    };
  } else {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'partial',
      feedback: `Line ${changeCall.line} calls the change function, but not with both the list and the name of the item to change. It cannot know which record to change.`,
      evidence: [ev(lineOf(mainSeq, changeCall.line))],
    };
  }

  // --- save-and-load --------------------------------------------------------
  const { loadCall, saveCall, loadOrder } = storage(p);
  let save: PlanCriterion;
  if (loadCall && saveCall && loadCall.line < saveCall.line && loadOrder <= 2) {
    save = {
      id: 'save-and-load',
      title: 'Loads and saves the list',
      verdict: 'met',
      feedback: `Line ${loadCall.line} loads the list before it is used, and line ${saveCall.line} saves it at the end.`,
      evidence: [ev(lineOf(mainSeq, loadCall.line)), ev(lineOf(mainSeq, saveCall.line))],
    };
  } else if (loadCall || saveCall) {
    const which = loadCall && saveCall ? 'are in the wrong order, or the load comes after the list is used' : `only ${loadCall ? 'the load' : 'the save'} is written`;
    save = {
      id: 'save-and-load',
      title: 'Loads and saves the list',
      verdict: 'partial',
      feedback: `Your load and save calls ${which}. Load the list near the start, before it is used, and save it near the end.`,
      evidence: [loadCall, saveCall].filter(Boolean).map((c) => ev(lineOf(mainSeq, c!.line))),
    };
  } else {
    save = {
      id: 'save-and-load',
      title: 'Loads and saves the list',
      verdict: 'missing',
      feedback: 'The plan neither loads the list at the start nor saves it at the end. It works on a list that is never read back from storage or kept.',
      evidence: [],
    };
  }

  const criteria = [functions, loop, change, save];
  const totalEarned = criteria.reduce((s, c) => s + (c.verdict === 'met' ? 1 : c.verdict === 'partial' ? 0.5 : 0), 0);
  const metCount = criteria.filter((c) => c.verdict === 'met').length;
  const passed = metCount >= Math.ceil(criteria.length / 2);
  const next = criteria.find((c) => c.verdict !== 'met');
  return {
    ok: true,
    criteria,
    canonical,
    notes,
    blanks,
    totalEarned,
    totalPossible: criteria.length,
    passed,
    summary: next
      ? `${metCount} of ${criteria.length} fully met (${Math.ceil(criteria.length / 2)} needed to pass). Next: ${next.feedback}`
      : `All four parts of the plan are in place. ${metCount} of ${criteria.length} fully met.`,
  };
}

// ------------------------------------------------------------------- the gaps
// 3.9.1 hands the student the shape of the plan and eight blanks. The shape is
// not what is graded -- the loop, the if/otherwise and the order are given --
// so each blank gets its own mark: is there a call here, does it do that job,
// was it handed what it needs. Six of the eight pass. Decided 2026-10-28.

/** How many of the eight gaps must be right. 70% of 8 is 5.6; six is that bar. */
export const GAP_PASS = 6;

interface GapSpec {
  id: string;
  title: string;
  /** What belongs in the blank, in the course's words. Used by the feedback. */
  wants: string;
}

/**
 * The eight blanks of the Snack Shack skeleton, top to bottom. The wording of
 * each `wants` is the lesson's own question for that blank, so feedback and
 * instructions say the same thing.
 */
export const PLAN_GAPS: GapSpec[] = [
  { id: 'gap-1-load', title: 'The list comes back from storage', wants: 'where does the list come from, before anything uses it?' },
  { id: 'gap-2-total', title: 'The total is worked out by a call', wants: 'what gives you the total? Hand it the list.' },
  { id: 'gap-3-subset', title: 'The low-stock list comes from a call', wants: 'what gives you the low-stock list? It needs the list and the level.' },
  { id: 'gap-4-lines', title: 'The lines come from a call', wants: 'what turns the list into one line per record?' },
  { id: 'gap-5-loop-body', title: 'The loop does something with each line', wants: 'the loop is walking lines, so what happens once per line?' },
  { id: 'gap-6-change', title: 'One record is changed by a call', wants: 'which function changes one record? Hand it the list and a name.' },
  { id: 'gap-7-report', title: 'The change is reported', wants: 'the record has changed. What do you report so the change shows?' },
  { id: 'gap-8-save', title: 'The list is saved', wants: 'what happens to the list when you are done?' },
];

export function checkPlanGaps(text: string): PlanCheck {
  const p = parsePlan(text);
  const { mainSeq, calls, has, needsNothing, notes, canonical, blanks } = p;
  const { loopWork } = loopAnalysis(p);
  const { changeCall } = changeAnalysis(p);
  const { loadCall, saveCall, loadOrder } = storage(p);
  const blankWord = (n: number) => `${n} blank${n === 1 ? '' : 's'}`;

  const callJob = (job: Job, minArgs: number): Call | undefined =>
    calls.find((c) => has(c, job) && (c.args.length >= minArgs || needsNothing(c)));

  // 1. the list comes back from storage
  const g1: PlanCriterion = !loadCall
    ? gap('gap-1-load', 'missing', 'Nothing loads the list before it is used. The plan needs a call that brings it back from storage.')
    : loadOrder > 2
      ? gap('gap-1-load', 'partial', `Line ${loadCall.line} loads the list, but after other calls have already used it. It has to come first.`)
      : gap('gap-1-load', 'met', `Line ${loadCall.line} loads the list before anything uses it.`, [ev(lineOf(mainSeq, loadCall.line))]);

  // 2. the total. It has to be worked out BEFORE it is reported -- the reference
  // plan calls totalValue again in its report line, and that later call must not
  // fill the earlier blank.
  const firstReport = mainSeq.find((l) => isReport(l));
  const totalCalls = calls.filter((c) => has(c, 'total') && (c.args.length >= 1 || needsNothing(c)));
  const totalCall = totalCalls.find((c) => !firstReport || c.line < firstReport.n);
  const g2: PlanCriterion = totalCall
    ? gap('gap-2-total', 'met', `Line ${totalCall.line} hands the list to a call that works out the total, before it is reported.`, [ev(lineOf(mainSeq, totalCall.line))])
    : totalCalls.length
      ? gap('gap-2-total', 'partial', `The total is worked out on line ${totalCalls[0].line}, but only after line ${firstReport?.n} has already reported it. The call has to come first.`, [ev(lineOf(mainSeq, totalCalls[0].line))])
      : gap('gap-2-total', 'missing', 'Nothing works out the total. The plan needs a call handed the list that returns the value of everything in it.');

  // 3. the low-stock list
  const subsetAny = calls.find((c) => has(c, 'subset'));
  const g3: PlanCriterion = subsetAny && subsetAny.args.length >= 2
    ? gap('gap-3-subset', 'met', `Line ${subsetAny.line} asks for the subset and hands it both the list and the level.`, [ev(lineOf(mainSeq, subsetAny.line))])
    : subsetAny
      ? gap('gap-3-subset', 'partial', `Line ${subsetAny.line} calls the subset function, but it is not handed both the list and the level.`, [ev(lineOf(mainSeq, subsetAny.line))])
      : gap('gap-3-subset', 'missing', 'Nothing asks for the low-stock list. That call takes the list and the level.');

  // 4. the lines
  const linesCall = callJob('lines', 1);
  const g4: PlanCriterion = linesCall
    ? gap('gap-4-lines', 'met', `Line ${linesCall.line} turns the list into one line per record.`, [ev(lineOf(mainSeq, linesCall.line))])
    : gap('gap-4-lines', 'missing', 'Nothing turns the list into lines. That call takes the list and gives back one line per record.');

  // 5. the loop's body
  const goodLoop = loopWork.find((l) => l.works);
  const g5: PlanCriterion = goodLoop
    ? gap('gap-5-loop-body', 'met', `Line ${goodLoop.body[0]?.n ?? goodLoop.head.n} is the work the loop repeats for each line.`, [
        ev(goodLoop.head),
        ...goodLoop.body.slice(0, 2).map(ev),
      ])
    : gap('gap-5-loop-body', 'missing', 'The loop repeats, but nothing happens for each line inside it.');

  // 6. the change call
  const g6: PlanCriterion = !changeCall
    ? gap('gap-6-change', 'missing', 'No call changes one record. That call takes the list and a name.')
    : changeCall.args.length >= 2
      ? gap('gap-6-change', 'met', `Line ${changeCall.line} changes one record, and is handed both the list and a name.`, [ev(lineOf(mainSeq, changeCall.line))])
      : gap('gap-6-change', 'partial', `Line ${changeCall.line} calls the change function, but not with both the list and a name. It cannot know which record to change.`, [ev(lineOf(mainSeq, changeCall.line))]);

  // 7. the report after it. The report has to come after the LOOP as well: a
  // `put` inside the loop prints one line per item, not the effect of the
  // change. An emptied blank 6 must not cost this gap too, so with no change
  // call the point is still the end of the loop.
  const loopEnd = loopWork[0]
    ? Math.max(loopWork[0].head.n, ...loopWork[0].body.map((l) => l.n))
    : -1;
  const reportPoint = Math.max(changeCall?.line ?? -1, loopEnd);
  const reportAfterChange = reportPoint >= 0
    ? mainSeq.find((l) => l.n > reportPoint && isReport(l))
    : undefined;
  const g7: PlanCriterion = reportAfterChange
    ? gap('gap-7-report', 'met', `Line ${reportAfterChange.n} reports the result after the change.`, [ev(reportAfterChange)])
    : gap('gap-7-report', 'missing', 'Nothing after the change reports or uses the changed list, so the change is invisible.');

  // 8. the save
  const g8: PlanCriterion = !saveCall
    ? gap('gap-8-save', 'missing', 'The list is never saved. The plan needs a call that puts it back into storage before END.')
    : changeCall && saveCall.line < changeCall.line
      ? gap('gap-8-save', 'partial', `Line ${saveCall.line} saves the list before line ${changeCall.line} changes it, so the change is lost.`, [ev(lineOf(mainSeq, saveCall.line))])
      : gap('gap-8-save', 'met', `Line ${saveCall.line} saves the list after the change.`, [ev(lineOf(mainSeq, saveCall.line))]);

  const criteria = [g1, g2, g3, g4, g5, g6, g7, g8];
  const metCount = criteria.filter((c) => c.verdict === 'met').length;
  const partials = criteria.filter((c) => c.verdict === 'partial').length;
  const totalEarned = criteria.reduce((s, c) => s + (c.verdict === 'met' ? 1 : c.verdict === 'partial' ? 0.5 : 0), 0);
  const passed = metCount >= GAP_PASS;
  const next = criteria.find((c) => c.verdict !== 'met');
  return {
    ok: true,
    criteria,
    canonical,
    notes,
    blanks,
    totalEarned,
    totalPossible: criteria.length,
    passed,
    summary: `${metCount} of ${criteria.length} gaps right${partials ? `, ${partials} nearly` : ''} (${GAP_PASS} needed to pass).`
      + (blanks ? ` ${blankWord(blanks)} still empty.` : '')
      + (next ? ` Next: ${next.title.toLowerCase()}.` : ''),
  };
}

function gap(id: string, verdict: PlanVerdict, feedback: string, evidence: PlanEvidence[] = []): PlanCriterion {
  const spec = PLAN_GAPS.find((g) => g.id === id)!;
  return { id, title: spec.title, verdict, feedback, evidence };
}

// ------------------------------------------------- shared change / storage
// Both graders ask the same two questions about the plan -- "which call changes
// a record, and is the change reported?" and "where does the list come from and
// go back to?" -- so they are answered once, here.

function lineOf(lines: SrcLine[], n: number): SrcLine {
  return lines.find((l) => l.n === n) ?? lines[0];
}

function changeAnalysis(p: PlanParse): { changeCall?: Call; reportAfter?: SrcLine; unplaced: Call[] } {
  const { mainSeq, calls, of, text } = p;
  const changeNames = changeNamesFor(text);
  const changeCall = calls.find((c) => p.has(c, 'change') || isChangeCall(c, changeNames));
  const reportAfter = changeCall ? mainSeq.find((l) => l.n > changeCall.line && isReport(l)) : undefined;
  // A call the grader could not place, in a plan that otherwise calls its own
  // functions by name, is more likely a name it does not know than a missing
  // step. Say so and let a teacher look; do not fail it outright.
  const unplaced = calls.filter((c) => c.args.length >= 2 && of(c).length === 0);
  return { changeCall, reportAfter, unplaced };
}

function storage(p: PlanParse): { loadCall?: Call; saveCall?: Call; loadOrder: number } {
  const { calls, mainSeq } = p;
  // The job, not the spelling: `readStock`/`writeStock`, `restore`/`persist` and
  // a contract that says "loads the saved list" all count the same as loadStock.
  const asCall = (l: SrcLine, name: string): Call => ({ name, args: [], line: l.n, raw: l.text });
  const loadByCall = calls.find((c) => p.has(c, 'load') || /^load/i.test(c.name));
  const saveByCall = [...calls].reverse().find((c) => p.has(c, 'save') || /^save/i.test(c.name));
  // A plan written as JavaScript loads and saves with the browser's own calls.
  // `JSON.parse(` and `getItem(` are deliberately not counted as the pair's
  // named functions, so without this a correct JS-shaped plan lost both ends of
  // the round trip.
  const jsLoad = mainSeq.find((l) => /\b(getItem|JSON\.parse)\s*\(/i.test(l.text) && !/\bsetItem\s*\(/i.test(l.text));
  const jsSave = mainSeq.find((l) => /\bsetItem\s*\(/i.test(l.text));
  const loadCall = loadByCall ?? (jsLoad ? asCall(jsLoad, 'localStorage.getItem') : undefined);
  const saveCall = saveByCall ?? (jsSave ? asCall(jsSave, 'localStorage.setItem') : undefined);
  // How early the load is, by line rather than by list position, so a load the
  // plan never names as one of its own functions still counts as early or late.
  const loadOrder = loadCall ? calls.filter((c) => c.line < loadCall.line).length : -1;
  return { loadCall, saveCall, loadOrder };
}
