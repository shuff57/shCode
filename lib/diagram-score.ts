// Deterministic scoring of a flowchart's STRUCTURE, for the hybrid chart grader.
//
// The AI grader is good at "do these labels describe this program" and unreliable at "is this
// shape a function-call double rail" and "does the arrow leave the loop before the print". So the
// heavy points of a hybrid chart are marked here, from shape KINDS and arrow TOPOLOGY only. Labels
// are never read by the heavy items (a student's label is data, and a rule that reads it is a rule
// a label can talk its way past). The only label reads are the opt-in `label` step and the
// relevance gate, which is a cap and never awards points.
//
// Pure and isomorphic: no React, no DOM. Runs in the Pages Function (functions/api/grade-written.ts)
// and in the tests. It works on the SAME collapsed graph the structural checker uses
// (lib/diagram-check.ts buildGraph: connector pairs merged, notes dropped), so a connector jump or
// a margin note cannot change a score.
//
// Schema (Matcher, CheckStep, RubricCheck, DiagramGate) is documented in lib/diagram-types.ts.

import type { CheckStep, DiagramDoc, DiagramGate, FlowNode, FlowShape, Matcher, RubricCheck } from './diagram-types';
import { buildGraph, reachableFrom, startNodes } from './diagram-check';
import type { Graph } from './diagram-check';

// ---------------------------------------------------------------------------
// Types shared with the server (structural, so this file imports nothing heavy)

export interface ScoreRubricItem {
  id: string;
  title: string;
  description?: string;
  points: number;
  check?: RubricCheck;
}

export interface ScoredCriterion {
  id: string;
  title: string;
  earned: number;
  max: number;
  verdict: 'met' | 'partial' | 'missing';
  feedback: string;
  source: 'rules' | 'ai';
  /** Rule criteria only: shapes to point at. */
  offenders?: string[];
}

export interface GateResult {
  passed: boolean;
  matched: number;
  min: number;
  capTo: number;
  fail: string;
}

export interface DiagramScore {
  criteria: ScoredCriterion[];
  earned: number;
  possible: number;
  gate: GateResult | null;
}

export interface MergedGrade {
  ok: true;
  totalEarned: number;
  totalPossible: number;
  criteria: ScoredCriterion[];
  summary: string;
  hints: string[];
  /** Set when the relevance gate held the total down. */
  capped?: boolean;
  grader?: string;
  graderModel?: string;
}

/** What shapeResult (lib/grade-written-core.ts) returns, structurally. */
export interface AiResultLike {
  totalEarned: number;
  totalPossible: number;
  criteria: Array<{ id: string; title?: string; earned: number; max: number; verdict: 'met' | 'partial' | 'missing'; feedback: string }>;
  summary: string;
  hints: string[];
  grader?: string;
  graderModel?: string;
}

// ---------------------------------------------------------------------------
// Rubric split

/** Items with a `check` are scored here; the rest go to the model. */
export function splitRubric<T extends { check?: unknown }>(rubric: T[]): { ruleItems: T[]; aiItems: T[] } {
  const ruleItems: T[] = [];
  const aiItems: T[] = [];
  for (const r of rubric ?? []) (r && r.check ? ruleItems : aiItems).push(r);
  return { ruleItems, aiItems };
}

// ---------------------------------------------------------------------------
// Text folding and matching

/** Fold a label the way every pattern expects: NFKC, lowercase, no invisibles, one space. */
export function foldLabel(s: string): string {
  return (s ?? '')
    .normalize('NFKC')
    .replace(/[​-‏⁠﻿]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const reCache = new Map<string, RegExp | null>();
function compile(src: string): RegExp | null {
  let r = reCache.get(src);
  if (r === undefined) {
    try {
      r = new RegExp(src, 'iu');
    } catch {
      r = null;
    }
    reCache.set(src, r);
  }
  return r;
}

const asArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function matchesNode(m: Matcher | undefined, n: FlowNode): boolean {
  if (!m) return true;
  if (m.kind !== undefined) {
    const kinds = asArray<FlowShape>(m.kind);
    if (!kinds.includes(n.shape)) return false;
  }
  if (m.re !== undefined) {
    const label = foldLabel(n.label);
    const pats = asArray(m.re);
    if (!pats.some((p) => compile(p)?.test(label))) return false;
  }
  if (m.not && matchesNode(m.not, n)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Graph facts

interface Facts {
  g: Graph;
  /** Nodes on some Start -> End path. Empty when the chart has no single Start. */
  onPath: Set<string>;
  startId: string | null;
  ends: Set<string>;
  /** logical id -> SCC index, for non-trivial SCCs only. */
  sccOf: Map<string, number>;
  sccMembers: Map<number, Set<string>>;
  byId: Map<string, FlowNode>;
  dominated: Map<string, Set<string>>;
  /** decision id -> where its yes-ish / no-ish labelled arrows go (orientation 'labelled' only). */
  branchLabels: Map<string, { yes?: string; no?: string }>;
}

function nodeOf(f: Facts, id: string): FlowNode {
  return f.byId.get(id)!;
}

function tarjan(g: Graph): { sccOf: Map<string, number>; members: Map<number, Set<string>> } {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccOf = new Map<string, number>();
  const members = new Map<number, Set<string>>();
  let counter = 0;
  let sccCount = 0;

  // Iterative: a student chart is small, but the cap on nodes is not a cap on recursion depth.
  for (const root of g.flowNodes.map((n) => n.id)) {
    if (index.has(root)) continue;
    const work: Array<{ v: string; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const outs = g.outgoing.get(frame.v) ?? [];
      if (frame.i < outs.length) {
        const w = outs[frame.i++];
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v)!, index.get(w)!));
        }
      } else {
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp = new Set<string>();
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.add(w);
          } while (w !== frame.v);
          if (comp.size > 1) {
            for (const m of comp) sccOf.set(m, sccCount);
            members.set(sccCount, comp);
            sccCount++;
          }
        }
        work.pop();
        if (work.length > 0) {
          const parent = work[work.length - 1].v;
          low.set(parent, Math.min(low.get(parent)!, low.get(frame.v)!));
        }
      }
    }
  }
  return { sccOf, members };
}

function buildFacts(doc: DiagramDoc): Facts {
  const g = buildGraph(doc);
  const byId = new Map(g.flowNodes.map((n) => [n.id, n]));
  const roots = startNodes(g);
  const ends = new Set(
    g.flowNodes.filter((n) => n.shape === 'terminal' && (g.outgoing.get(n.id) ?? []).length === 0 && (g.incoming.get(n.id) ?? []).length > 0).map((n) => n.id),
  );
  let onPath = new Set<string>();
  let startId: string | null = null;
  if (roots.length === 1 && ends.size > 0) {
    startId = roots[0].id;
    const fwd = reachableFrom([startId], g);
    const back = reachableFrom([...ends], g, 'incoming');
    onPath = new Set([...fwd].filter((id) => back.has(id)));
  }
  const { sccOf, members } = tarjan(g);
  const facts: Facts = { g, onPath, startId, ends, sccOf, sccMembers: members, byId, dominated: new Map(), branchLabels: new Map() };

  // dominated.get(n) = nodes that become unreachable from Start once n is removed (n excluded).
  if (startId) {
    for (const n of onPath) {
      const dom = new Set<string>();
      if (n === startId) {
        for (const m of onPath) if (m !== n) dom.add(m);
      } else {
        const seen = new Set<string>([startId]);
        const queue = [startId];
        while (queue.length > 0) {
          const v = queue.shift()!;
          for (const w of g.outgoing.get(v) ?? []) {
            if (w !== n && !seen.has(w)) {
              seen.add(w);
              queue.push(w);
            }
          }
        }
        for (const m of onPath) if (m !== n && !seen.has(m)) dom.add(m);
      }
      facts.dominated.set(n, dom);
    }
  }
  return facts;
}

// ---------------------------------------------------------------------------
// Step evaluation

interface StepOutcome {
  /** 0..1 */
  fraction: number;
  message: string;
  offenders: string[];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function kindWord(m: Matcher | undefined): string {
  const k = asArray<FlowShape>(m?.kind);
  if (k.length === 0) return 'matching';
  const names: Record<FlowShape, string> = {
    terminal: 'Start/End oval',
    process: 'task rectangle',
    decision: 'decision diamond',
    io: 'input/output parallelogram',
    subroutine: 'function-call',
    preparation: 'loop-setup hexagon',
    connector: 'connector',
    comment: 'note',
  };
  return k.map((x) => names[x]).join(' or ');
}

const NOT_ON_PATH = 'Fix the structure first: this check needs one Start and a path from it to an End.';

function expandIds(ids: string[], g: Graph): string[] {
  return ids.flatMap((id) => g.membersOf.get(id) ?? [id]);
}

function evalCount(f: Facts, step: Extract<CheckStep, { op: 'count' | 'label' }>): StepOutcome {
  const min = step.op === 'count' ? step.min : (step.min ?? 1);
  const max = step.op === 'count' ? step.max : undefined;
  const hits = [...f.onPath].filter((id) => matchesNode(step.match, nodeOf(f, id)));
  const have = hits.length;
  const word = kindWord(step.match);
  const okMin = have >= min;
  const okMax = max === undefined || have <= max;
  if (okMin && okMax) return { fraction: 1, message: step.pass ?? `Found ${have} ${word} ${plural(have, 'shape', 'shapes')} on the path.`, offenders: [] };
  const fraction = !okMin ? Math.min(have, min) / min : 0;
  const message =
    step.fail ??
    (!okMin
      ? `Needs at least ${min} ${word} ${plural(min, 'shape', 'shapes')} on the path from Start to End; yours has ${have}.`
      : `Needs at most ${max} ${word} ${plural(max!, 'shape', 'shapes')} on the path; yours has ${have}.`);
  return { fraction, message, offenders: [] };
}

function evalSequence(f: Facts, step: Extract<CheckStep, { op: 'sequence' }>): StepOutcome {
  const of = step.of;
  const fail = step.fail ?? 'The shapes are not in the order the program runs them: each one must come on every route to the next.';
  if (!f.startId) return { fraction: 0, message: NOT_ON_PATH, offenders: [] };
  const cand = of.map((m) => [...f.onPath].filter((id) => matchesNode(m, nodeOf(f, id))));
  if (cand.some((c) => c.length === 0)) return { fraction: 0, message: fail, offenders: [] };

  // Longest dominator chain n1..nk, distinct, n_i dominating n_(i+1), with a work bound.
  let budget = 20000;
  let best: string[] = [];
  const dfs = (i: number, chain: string[]): boolean => {
    if (i === of.length) {
      best = chain;
      return true;
    }
    if (chain.length > best.length) best = chain;
    for (const id of cand[i]) {
      if (budget-- <= 0) return false;
      if (chain.includes(id)) continue;
      if (i > 0 && !f.dominated.get(chain[i - 1])?.has(id)) continue;
      if (dfs(i + 1, [...chain, id])) return true;
    }
    return false;
  };
  if (dfs(0, [])) return { fraction: 1, message: step.pass ?? 'The shapes come in the right order.', offenders: [] };
  return { fraction: 0, message: fail, offenders: expandIds(best, f.g) };
}

function evalCycle(f: Facts, step: Extract<CheckStep, { op: 'in-cycle' | 'not-in-cycle' }>): StepOutcome {
  const hits = [...f.onPath].filter((id) => matchesNode(step.match, nodeOf(f, id)));
  const want = step.op === 'in-cycle';
  if (hits.length === 0) {
    return { fraction: 0, message: step.fail ?? `No ${kindWord(step.match)} shape found on the path from Start to End.`, offenders: [] };
  }
  const bad = hits.filter((id) => f.sccOf.has(id) !== want);
  if (bad.length === 0) return { fraction: 1, message: step.pass ?? (want ? 'It sits inside a repeat.' : 'It sits outside every repeat.'), offenders: [] };
  return {
    fraction: 0,
    message: step.fail ?? (want ? 'That shape should be part of a repeat (an arrow must lead back to it), and it is not.' : 'That shape should be outside every repeat, and an arrow loops back through it.'),
    offenders: expandIds(bad, f.g),
  };
}

/** Fewest non-terminal shapes on any route from `from` to an End (0-1 BFS). Infinity when none. */
function fewestStepsToEnd(f: Facts, from: string): number {
  const cost = (id: string) => (nodeOf(f, id).shape === 'terminal' ? 0 : 1);
  const dist = new Map<string, number>([[from, cost(from)]]);
  const dq: string[] = [from];
  // Dijkstra on a tiny graph is clearer than a deque and the graph has at most ~200 nodes.
  const done = new Set<string>();
  while (dq.length > 0) {
    dq.sort((a, b) => dist.get(a)! - dist.get(b)!);
    const v = dq.shift()!;
    if (done.has(v)) continue;
    done.add(v);
    if (f.ends.has(v)) return dist.get(v)!;
    for (const w of f.g.outgoing.get(v) ?? []) {
      const nd = dist.get(v)! + cost(w);
      if (nd < (dist.get(w) ?? Infinity)) {
        dist.set(w, nd);
        dq.push(w);
      }
    }
  }
  return Infinity;
}

function evalLoopExit(f: Facts, step: Extract<CheckStep, { op: 'loop-exit' }>): StepOutcome {
  const minAfter = step.minAfter ?? 1;
  const anyFrom = step.from === 'any';
  const heads = [...f.onPath].filter((id) => matchesNode(step.loop, nodeOf(f, id)));
  const fail = step.fail;
  if (heads.length === 0) {
    return { fraction: 0, message: fail ?? `There is no ${kindWord(step.loop)} shape on the path from Start to End.`, offenders: [] };
  }
  const inLoop = heads.filter((id) => f.sccOf.has(id));
  if (inLoop.length === 0) {
    return {
      fraction: 0,
      message: fail ?? `The ${kindWord(step.loop)} shape is not part of a repeat: an arrow has to lead back to it from the steps that run each time round.`,
      offenders: expandIds(heads, f.g),
    };
  }
  for (const h of inLoop) {
    const comp = f.sccMembers.get(f.sccOf.get(h)!)!;
    const sources = anyFrom ? [...comp] : [h];
    for (const s of sources) {
      for (const x of f.g.outgoing.get(s) ?? []) {
        if (comp.has(x) || !f.onPath.has(x)) continue;
        if (fewestStepsToEnd(f, x) >= minAfter) {
          return { fraction: 1, message: step.pass ?? 'The way out of the loop leads on to the work after it.', offenders: [] };
        }
      }
    }
  }
  return {
    fraction: 0,
    message:
      fail ??
      `The arrow that leaves the repeat does not lead to ${minAfter} more ${plural(minAfter, 'step', 'steps')} before End. Work meant to run once, after the loop, has to hang off the way out.`,
    offenders: expandIds(inLoop, f.g),
  };
}

const YES = /^(yes|y|true|t|ok)\b/i;
const NO = /^(no|n|false|f|else)\b/i;

function evalBranch(f: Facts, step: Extract<CheckStep, { op: 'branch' }>): StepOutcome {
  const fail = step.fail ?? 'The decision does not split into the two different results the program needs.';
  const decisions = [...f.onPath].filter((id) => matchesNode(step.at, nodeOf(f, id)));
  // Labels are read ONLY for orientation 'labelled', and only as yes-ish / no-ish.
  for (const d of decisions) {
    const outs = f.g.outgoing.get(d) ?? [];
    if (outs.length !== 2) continue;
    const [a, b] = outs;
    if (step.distinct && a === b) continue;
    const fits = (x: string, y: string) => matchesNode(step.yes, nodeOf(f, x)) && matchesNode(step.no, nodeOf(f, y));
    const any = fits(a, b) || fits(b, a);
    if (!any) continue;
    if (step.orientation === 'labelled') {
      const lab = f.branchLabels.get(d);
      if (!lab) continue;
      const [yes, no] = [lab.yes, lab.no];
      if (!yes || !no || !fits(yes, no)) continue;
    }
    return { fraction: 1, message: step.pass ?? 'The decision splits the way the program does.', offenders: [] };
  }
  return { fraction: 0, message: fail, offenders: expandIds(decisions, f.g) };
}

function fillBranchLabels(doc: DiagramDoc, f: Facts): void {
  for (const e of doc.edges) {
    const from = f.g.logicalOf.get(e.from);
    const to = f.g.logicalOf.get(e.to);
    if (!from || !to || from === to) continue;
    const label = foldLabel(e.label ?? '');
    const slot = f.branchLabels.get(from) ?? {};
    if (YES.test(label)) slot.yes = to;
    else if (NO.test(label)) slot.no = to;
    f.branchLabels.set(from, slot);
  }
}

function evalStep(f: Facts, step: CheckStep): StepOutcome {
  if (!f.startId) return { fraction: 0, message: NOT_ON_PATH, offenders: [] };
  switch (step.op) {
    case 'count':
    case 'label':
      return evalCount(f, step);
    case 'sequence':
      return evalSequence(f, step);
    case 'loop-exit':
      return evalLoopExit(f, step);
    case 'in-cycle':
    case 'not-in-cycle':
      return evalCycle(f, step);
    case 'branch':
      return evalBranch(f, step);
    default:
      return { fraction: 0, message: 'This check is not set up correctly. Tell your teacher.', offenders: [] };
  }
}

const half = (n: number) => Math.round(n * 2) / 2;

// ---------------------------------------------------------------------------
// Gate

/** How many token groups match at least one flow-node label. */
export function gateMatches(doc: DiagramDoc, gate: DiagramGate): number {
  const labels = doc.nodes.filter((n) => n.shape !== 'comment').map((n) => foldLabel(n.label));
  let matched = 0;
  for (const src of gate.anyOf) {
    const re = compile(src);
    if (re && labels.some((l) => re.test(l))) matched++;
  }
  return matched;
}

export function evalGate(doc: DiagramDoc, gate: DiagramGate | null | undefined): GateResult | null {
  if (!gate) return null;
  const matched = gateMatches(doc, gate);
  return { passed: matched >= gate.min, matched, min: gate.min, capTo: gate.capTo, fail: gate.fail };
}

// ---------------------------------------------------------------------------
// Public scoring

export function scoreDiagram(doc: DiagramDoc, ruleItems: ScoreRubricItem[], gate?: DiagramGate | null): DiagramScore {
  const f = buildFacts(doc);
  fillBranchLabels(doc, f);
  const criteria: ScoredCriterion[] = ruleItems.map((item) => {
    const check = item.check ?? { steps: [] };
    const outs = check.steps.map((s) => evalStep(f, s));
    const allPass = outs.length > 0 && outs.every((o) => o.fraction === 1);
    const mean = outs.length === 0 ? 0 : outs.reduce((a, o) => a + o.fraction, 0) / outs.length;
    const earned = check.scale === 'linear' ? Math.min(item.points, half(item.points * mean)) : allPass ? item.points : 0;
    const verdict: ScoredCriterion['verdict'] = earned >= item.points ? 'met' : earned > 0 ? 'partial' : 'missing';
    // Feedback: the failing steps' lines; on a pass, the pass lines.
    const failing = outs.filter((o) => o.fraction < 1);
    const feedback = (failing.length > 0 ? failing : outs).map((o) => o.message).join(' ').slice(0, 400);
    return {
      id: item.id,
      title: item.title,
      earned,
      max: item.points,
      verdict,
      feedback,
      source: 'rules',
      offenders: [...new Set(failing.flatMap((o) => o.offenders))].slice(0, 50),
    };
  });
  return {
    criteria,
    earned: criteria.reduce((a, c) => a + c.earned, 0),
    possible: ruleItems.reduce((a, r) => a + r.points, 0),
    gate: evalGate(doc, gate),
  };
}

/**
 * Rule criteria first, then the AI's, each tagged with where its number came from. The gate caps
 * the TOTAL (a chart with the right shapes and none of the program's words cannot pass), never an
 * individual criterion. `ai` null means the model gave nothing: AI criteria are listed as zeros.
 * The server never records that shape (an unreachable model is a free outage marker, not a grade);
 * it exists so a caller can render what was checked.
 */
export function mergeGrade(
  det: DiagramScore,
  ai: AiResultLike | null,
  aiItems: Array<{ id: string; title: string; points: number }>,
): MergedGrade {
  const aiCriteria: ScoredCriterion[] = ai
    ? ai.criteria.map((c) => ({ ...c, title: c.title ?? aiItems.find((r) => r.id === c.id)?.title ?? c.id, source: 'ai' as const }))
    : aiItems.map((r) => ({ id: r.id, title: r.title, earned: 0, max: r.points, verdict: 'missing' as const, feedback: '', source: 'ai' as const }));
  const aiEarned = aiCriteria.reduce((a, c) => a + c.earned, 0);
  const aiPossible = aiItems.reduce((a, r) => a + r.points, 0);
  const rawTotal = det.earned + aiEarned;
  const possible = det.possible + aiPossible;
  const capped = !!det.gate && !det.gate.passed && rawTotal > det.gate.capTo;
  const totalEarned = capped ? det.gate!.capTo : rawTotal;

  const parts = [`Shapes and order: ${det.earned} of ${det.possible}.`];
  if (aiItems.length > 0) parts.push(`Wording: ${aiEarned} of ${aiPossible}.`);
  let summary = parts.join(' ');
  if (det.gate && !det.gate.passed) {
    summary += ` ${det.gate.fail}` + (capped ? ` Your total is held at ${det.gate.capTo} of ${possible} until it does.` : '');
  }
  if (ai?.summary) summary += ` ${ai.summary}`;

  const merged: MergedGrade = {
    ok: true,
    totalEarned,
    totalPossible: possible,
    // Rule criteria carry `offenders` for the highlight; the wire copy keeps them (ids only).
    criteria: [...det.criteria, ...aiCriteria],
    summary: summary.slice(0, 900),
    hints: ai?.hints ?? [],
  };
  if (capped) merged.capped = true;
  return merged;
}
