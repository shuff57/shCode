// Deterministic grader for a Chapter 3 pseudocode PLAN (3.9.1 and the same
// shape in 1.6.1 / 2.6.1).
//
// WHY THIS EXISTS. The AI grader marking these four criteria produced different
// verdicts for the same plan on different runs -- measured on 106 real
// submissions: six of sixteen identical plans changed verdicts, and a single
// criterion moved on ~18% of cells. Every one of the four criteria is
// STRUCTURAL ("four named calls", "a loop over the list", "the change-one-record
// call", "load first, save last"), so the text itself can decide them. No model,
// no sampling, no drift.
//
// It returns met / partial / missing so the feedback can name what is missing.
// PASS RULE (decided 2026-10-28): at least half the criteria FULLY met. A
// partly-met criterion does not count toward passing. On the 16 real plans this
// gives 13/16, the same rate the AI grader produced, while refusing plans whose
// only progress is partial (no loop, no working change call).
//
// It does NOT judge whether the plan solves the problem (the right comparison,
// the right report). That is the lesson's content, not this rubric, and a
// parser cannot see it. A plan that structures all four correctly but computes
// the wrong thing is out of scope here -- the build part (3.9.2) catches it.

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
  /** At least half the criteria fully met (partials do not count). */
  passed: boolean;  summary: string;
}

interface SrcLine {
  n: number;
  raw: string;
  text: string;
  indent: number;
}

interface Call {
  name: string;
  args: string[];
  line: number;
  raw: string;
}

const KEYWORDS = new Set([
  'if', 'else', 'otherwise', 'for', 'while', 'repeat', 'set', 'report', 'print',
  'put', 'output', 'say', 'display', 'show', 'call', 'return', 'start', 'end',
]);

const CALL_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)/g;

function linesOf(text: string): SrcLine[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((raw, i) => ({
      n: i + 1,
      raw,
      text: raw.trim(),
      indent: (raw.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length,
    }));
}

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
    if (KEYWORDS.has(name.toLowerCase())) continue;
    out.push({ name, args: splitArgs(m[2]), line: line.n, raw: line.text });
  }
  if (out.length) return out;
  // "name of the list" -- the no-parentheses form students actually write
  // ("set total to totalvalue of stock"). Only known function names count, so
  // prose that happens to start with a word cannot become a call.
  for (const name of known) {
    const hit = line.text.match(new RegExp(`\\b${name}\\s+of\\s+([^.;]+)`, 'i'));
    if (hit) {
      out.push({ name, args: splitArgs(hit[1].replace(/\band\b/gi, ',')), line: line.n, raw: line.text });
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

const isReport = (l: SrcLine) => /^(report|print|put|output|say|display|show)\b/i.test(l.text);
const isLoop = (l: SrcLine) => /^(for\s+each|for|repeat\s+for|repeat|while|loop)\b/i.test(l.text);
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

const ev = (l: SrcLine): PlanEvidence => ({ line: l.n, text: l.text });

export function checkPlan(text: string): PlanCheck {
  const lines = linesOf(text);
  const start = lines.findIndex((l) => /^start\b/i.test(l.text));
  const end = start >= 0 ? lines.findIndex((l, i) => i > start && /^end\b/i.test(l.text)) : -1;
  const mainStart = start >= 0 ? start : 0;
  const mainEnd = end >= 0 ? end : lines.length - 1;
  const main = lines.slice(mainStart, mainEnd + 1);
  const before = start >= 0 ? lines.slice(0, start) : [];

  // Calls made in the main sequence. A contract line ("- sellItem(list, name)
  // lowers ...", before START) is a description, not a call -- the distinction
  // the old regex could not make.
  const known = knownNamesFor(before);
  const calls = main.flatMap((l) => callsIn(l, known));
  const callsById = new Map<string, Call>();
  for (const c of calls) {
    const key = c.name.toLowerCase();
    if (!callsById.has(key)) callsById.set(key, c);
  }
  const withArgs = [...callsById.values()].filter((c) => c.args.length > 0);

  // --- functions-as-calls ---------------------------------------------------
  let functions: PlanCriterion;
  if (withArgs.length >= 4) {
    functions = {
      id: 'functions-as-calls',
      title: "The pair's functions are used as named calls",
      verdict: 'met',
      feedback: `Your main section calls ${withArgs.length} functions by name: ${withArgs.map((c) => c.name).join(', ')}.`,
      evidence: withArgs.slice(0, 8).map((c) => ({ line: c.line, text: c.raw })),
    };
  } else if (withArgs.length >= 2) {
    const noArgs = [...callsById.values()].filter((c) => c.args.length === 0).map((c) => c.name);
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
  const worksLine = (l: SrcLine) =>
    isIf(l) || /\b(put|print|report|output|display|show)\b/i.test(l.text) || callsIn(l, known).length > 0;
  const loopIdx = main.map((l, i) => (isLoop(l) ? i : -1)).filter((i) => i >= 0);
  const loopWork: { head: SrcLine; body: SrcLine[]; works: boolean; back?: SrcLine }[] = loopIdx.map((i) => {
    const body = bodyOf(main, i);
    return { head: main[i], body, works: body.some(worksLine) };
  });
  // A numbered "go back to #5" is a loop in the lesson's own words ("repeat for
  // every item, or equivalent"). The lines between the target and the jump repeat.
  const backIdx = main.findIndex((l) => /go\s+back\s+to\s*#?\d+/i.test(l.text));
  if (backIdx >= 0) {
    const num = Number((main[backIdx].text.match(/go\s+back\s+to\s*#?(\d+)/i) || [])[1]);
    const target = main.findIndex((l, i) => i < backIdx && Number((l.text.match(/^(\d+)/) || [])[1]) === num);
    if (target >= 0) {
      const body = main.slice(target, backIdx);
      loopWork.push({
        head: main[backIdx],
        body,
        works: body.some(worksLine),
        back: main[target],
      });
    }
  }
  // A loop described in the contracts ("lowStock goes through the list with a
  // FOR EACH") is not the main plan's loop; say so rather than silently missing it.
  const contractLoops = before.filter((l) => /\b(for\s+each|repeat|loop|go\s+through)\b/i.test(l.text));
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
    const inside = contractLoops.length
      ? ` The loop at line ${contractLoops[0].n} is inside a function description, not the main plan.`
      : '';
    loop = {
      id: 'loop-over-the-list',
      title: 'The list is walked by a loop',
      verdict: 'missing',
      feedback: `The main section never walks the list with a loop. Add a FOR EACH line after the list is loaded, with the work indented under it.${inside}`,
      evidence: contractLoops.slice(0, 2).map(ev),
    };
  }

  // --- change-one-record ----------------------------------------------------
  const changeNames = changeNamesFor(text);
  const changeCall = calls.find((c) => isChangeCall(c, changeNames));
  const reportAfter = changeCall ? main.find((l) => l.n > changeCall.line && isReport(l)) : undefined;
  let change: PlanCriterion;
  if (!changeCall) {
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
      evidence: [ev(main.find((l) => l.n === changeCall.line)!), ev(reportAfter)],
    };
  } else if (changeCall.args.length >= 2) {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'partial',
      feedback: `Line ${changeCall.line} calls the change function with the list and a name, but no later line reports or uses the changed list. Add a report of the new total or the item's new quantity after it.`,
      evidence: [ev(main.find((l) => l.n === changeCall.line)!)],
    };
  } else {
    change = {
      id: 'change-one-record',
      title: 'The function that changes a record is called on the list and its effect reported',
      verdict: 'partial',
      feedback: `Line ${changeCall.line} calls the change function, but not with both the list and the name of the item to change. It cannot know which record to change.`,
      evidence: [ev(main.find((l) => l.n === changeCall.line)!)],
    };
  }

  // --- save-and-load --------------------------------------------------------
  const loadCall = calls.find((c) => /^load/i.test(c.name));
  const saveCall = [...calls].reverse().find((c) => /^save/i.test(c.name));
  const loadOrder = loadCall ? calls.indexOf(loadCall) : -1;
  let save: PlanCriterion;
  if (loadCall && saveCall && loadCall.line < saveCall.line && loadOrder <= 2) {
    save = {
      id: 'save-and-load',
      title: 'Loads and saves the list',
      verdict: 'met',
      feedback: `Line ${loadCall.line} loads the list before it is used, and line ${saveCall.line} saves it at the end.`,
      evidence: [ev(main.find((l) => l.n === loadCall.line)!), ev(main.find((l) => l.n === saveCall.line)!)],
    };
  } else if (loadCall || saveCall) {
    const which = loadCall && saveCall ? 'are in the wrong order, or the load comes after the list is used' : `only ${loadCall ? 'the load' : 'the save'} is written`;
    save = {
      id: 'save-and-load',
      title: 'Loads and saves the list',
      verdict: 'partial',
      feedback: `Your load and save calls ${which}. Load the list near the start, before it is used, and save it near the end.`,
      evidence: [loadCall, saveCall].filter(Boolean).map((c) => ev(main.find((l) => l.n === c!.line)!)),
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
    totalEarned,
    totalPossible: criteria.length,
    passed,
    summary: next
      ? `${metCount} of ${criteria.length} fully met (${Math.ceil(criteria.length / 2)} needed to pass). Next: ${next.feedback}`
      : `All four parts of the plan are in place. ${metCount} of ${criteria.length} fully met.`,
  };
}
