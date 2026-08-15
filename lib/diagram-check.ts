// Structural checks on a flowchart graph. Runs in the browser, instantly,
// with no network call — the student gets "your diamond only has one exit"
// the moment they ask, and the AI grader is reserved for the question these
// rules can never answer: does this diagram actually solve the problem.

import type { DiagramDoc, DiagramRule, DiagramRuleId, FlowNode } from './diagram-types';

export interface CheckResult {
  id: DiagramRuleId;
  title: string;
  passed: boolean;
  /** Student-facing explanation. Present on pass and fail. */
  detail: string;
  /** Nodes to highlight on the canvas when this check fails. */
  offenders: string[];
}

const DEFAULT_TITLES: Record<DiagramRuleId, string> = {
  'one-start': 'Exactly one Start oval',
  'has-end': 'Ends in an End oval',
  'all-labeled': 'Every shape has a label',
  'no-orphans': 'No floating shapes',
  'decision-two-exits': 'Every diamond has two exits',
  'decision-labeled': 'Both diamond exits are labelled',
  'reaches-end': 'Every shape is on a path from Start to End',
  'no-self-loop': 'No arrow points back at its own shape',
  'min-decisions': 'Uses at least one decision diamond',
  'min-process': 'Uses at least one task rectangle',
  'min-nodes': 'Diagram has enough shapes',
};

interface Graph {
  byId: Map<string, FlowNode>;
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

function buildGraph(doc: DiagramDoc): Graph {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const n of doc.nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }
  for (const e of doc.edges) {
    // Edges to deleted nodes are ignored rather than counted — the editor
    // prunes them, but a hand-authored starter might not.
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    outgoing.get(e.from)!.push(e.to);
    incoming.get(e.to)!.push(e.from);
  }
  return { byId, outgoing, incoming };
}

function startNodes(doc: DiagramDoc, g: Graph): FlowNode[] {
  return doc.nodes.filter((n) => (g.incoming.get(n.id) ?? []).length === 0);
}

function endNodes(doc: DiagramDoc, g: Graph): FlowNode[] {
  return doc.nodes.filter((n) => (g.outgoing.get(n.id) ?? []).length === 0);
}

function reachableFrom(seeds: string[], g: Graph): Set<string> {
  const seen = new Set<string>(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of g.outgoing.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function nameList(ids: string[], g: Graph): string {
  return ids
    .map((id) => {
      const label = g.byId.get(id)?.label?.trim();
      return label ? `"${label}"` : '(unlabelled)';
    })
    .join(', ');
}

function evaluate(rule: DiagramRule, doc: DiagramDoc, g: Graph): Omit<CheckResult, 'title'> {
  const id = rule.id;

  switch (id) {
    case 'one-start': {
      const roots = startNodes(doc, g);
      const terminalRoots = roots.filter((n) => n.shape === 'terminal');
      if (doc.nodes.length === 0) {
        return { id, passed: false, detail: 'The canvas is empty — start with a Start oval.', offenders: [] };
      }
      if (roots.length === 0) {
        return {
          id,
          passed: false,
          detail: 'Every shape has an arrow coming into it, so nothing is the beginning. One shape must have no incoming arrow.',
          offenders: [],
        };
      }
      if (roots.length > 1) {
        return {
          id,
          passed: false,
          detail: `${roots.length} shapes have no incoming arrow (${nameList(roots.map((n) => n.id), g)}). A flowchart has exactly one starting point.`,
          offenders: roots.map((n) => n.id),
        };
      }
      if (terminalRoots.length !== 1) {
        return {
          id,
          passed: false,
          detail: `The first shape is ${nameList([roots[0].id], g)}, but it is not an oval. Start and End are drawn as ovals.`,
          offenders: [roots[0].id],
        };
      }
      return { id, passed: true, detail: `Starts at ${nameList([roots[0].id], g)}.`, offenders: [] };
    }

    case 'has-end': {
      // An End oval is a terminal that something *arrives at* and nothing
      // leaves. Requiring an incoming arrow is what stops a freshly-placed,
      // still-unconnected Start oval from being reported as the finish.
      const leaves = endNodes(doc, g).filter(
        (n) => n.shape === 'terminal' && (g.incoming.get(n.id) ?? []).length > 0,
      );
      if (leaves.length === 0) {
        return {
          id,
          passed: false,
          detail: 'No End oval yet. A flowchart finishes at an oval that arrows lead into and none leave.',
          offenders: [],
        };
      }
      return {
        id,
        passed: true,
        detail: `Finishes at ${nameList(leaves.map((n) => n.id), g)}.`,
        offenders: [],
      };
    }

    case 'all-labeled': {
      const blank = doc.nodes.filter((n) => n.label.trim() === '');
      return blank.length === 0
        ? { id, passed: true, detail: `All ${doc.nodes.length} shapes are labelled.`, offenders: [] }
        : {
            id,
            passed: false,
            detail: `${blank.length} ${plural(blank.length, 'shape has', 'shapes have')} no text. Click a shape and type what it does.`,
            offenders: blank.map((n) => n.id),
          };
    }

    case 'no-orphans': {
      if (doc.nodes.length <= 1) {
        return { id, passed: true, detail: 'Nothing to connect yet.', offenders: [] };
      }
      const loose = doc.nodes.filter(
        (n) => (g.incoming.get(n.id) ?? []).length === 0 && (g.outgoing.get(n.id) ?? []).length === 0,
      );
      return loose.length === 0
        ? { id, passed: true, detail: 'Every shape is connected to at least one other.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${nameList(loose.map((n) => n.id), g)} ${plural(loose.length, 'is', 'are')} floating with no arrows at all. Drag from a shape's dot to connect it.`,
            offenders: loose.map((n) => n.id),
          };
    }

    case 'decision-two-exits': {
      const diamonds = doc.nodes.filter((n) => n.shape === 'decision');
      if (diamonds.length === 0) {
        return { id, passed: true, detail: 'No decision diamonds to check.', offenders: [] };
      }
      const bad = diamonds.filter((n) => (g.outgoing.get(n.id) ?? []).length !== 2);
      return bad.length === 0
        ? { id, passed: true, detail: `All ${diamonds.length} ${plural(diamonds.length, 'diamond has', 'diamonds have')} two exits.`, offenders: [] }
        : {
            id,
            passed: false,
            detail: bad
              .map((n) => {
                const count = (g.outgoing.get(n.id) ?? []).length;
                return `${nameList([n.id], g)} has ${count} ${plural(count, 'exit', 'exits')}`;
              })
              .join('; ') + '. A decision asks a yes/no question, so exactly two arrows leave it.',
            offenders: bad.map((n) => n.id),
          };
    }

    case 'decision-labeled': {
      const diamonds = doc.nodes.filter((n) => n.shape === 'decision');
      if (diamonds.length === 0) {
        return { id, passed: true, detail: 'No decision diamonds to check.', offenders: [] };
      }
      const bad = diamonds.filter((n) =>
        doc.edges.some((e) => e.from === n.id && !(e.label ?? '').trim()),
      );
      return bad.length === 0
        ? { id, passed: true, detail: 'Every arrow out of a diamond says which answer it follows.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${nameList(bad.map((n) => n.id), g)} has an unlabelled exit. Click the arrow and type yes or no so a reader knows which way each answer goes.`,
            offenders: bad.map((n) => n.id),
          };
    }

    case 'reaches-end': {
      const roots = startNodes(doc, g);
      if (doc.nodes.length === 0) {
        return { id, passed: false, detail: 'The canvas is empty.', offenders: [] };
      }
      if (roots.length !== 1) {
        return {
          id,
          passed: false,
          detail: 'Fix the Start oval first — this check needs one clear starting point.',
          offenders: [],
        };
      }
      const seen = reachableFrom([roots[0].id], g);
      const stranded = doc.nodes.filter((n) => !seen.has(n.id));
      if (stranded.length > 0) {
        return {
          id,
          passed: false,
          detail: `${nameList(stranded.map((n) => n.id), g)} cannot be reached by following arrows from Start.`,
          offenders: stranded.map((n) => n.id),
        };
      }
      const endsHit = doc.nodes.filter(
        (n) => seen.has(n.id) && n.shape === 'terminal' && (g.outgoing.get(n.id) ?? []).length === 0,
      );
      return endsHit.length > 0
        ? { id, passed: true, detail: 'Following the arrows from Start reaches every shape and finishes at an End oval.', offenders: [] }
        : {
            id,
            passed: false,
            detail: 'Following the arrows from Start never reaches an End oval.',
            offenders: [],
          };
    }

    case 'no-self-loop': {
      const loops = doc.edges.filter((e) => e.from === e.to);
      return loops.length === 0
        ? { id, passed: true, detail: 'No shape points at itself.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${nameList(loops.map((e) => e.from), g)} has an arrow pointing back at itself.`,
            offenders: loops.map((e) => e.from),
          };
    }

    case 'min-decisions':
    case 'min-process':
    case 'min-nodes': {
      const want = rule.count ?? 1;
      const [have, noun] =
        id === 'min-decisions'
          ? [doc.nodes.filter((n) => n.shape === 'decision').length, 'decision diamond']
          : id === 'min-process'
            ? [doc.nodes.filter((n) => n.shape === 'process').length, 'task rectangle']
            : [doc.nodes.length, 'shape'];
      return have >= want
        ? { id, passed: true, detail: `${have} ${plural(have, noun, noun + 's')}.`, offenders: [] }
        : {
            id,
            passed: false,
            detail: `Needs at least ${want} ${plural(want, noun, noun + 's')}; the diagram has ${have}.`,
            offenders: [],
          };
    }

    default: {
      // Unknown rule id from a hand-edited lesson.json — surface it rather
      // than silently passing a check that was never run.
      return {
        id,
        passed: false,
        detail: `Unknown check "${id}" in this lesson's setup. Tell your teacher.`,
        offenders: [],
      };
    }
  }
}

export function checkDiagram(doc: DiagramDoc, rules: DiagramRule[]): CheckResult[] {
  const g = buildGraph(doc);
  return rules.map((rule) => {
    const outcome = evaluate(rule, doc, g);
    const fallback = DEFAULT_TITLES[rule.id] ?? rule.id;
    let title = rule.title ?? fallback;
    if (!rule.title && rule.count !== undefined && rule.id.startsWith('min-')) {
      title = `${fallback} (at least ${rule.count})`;
    }
    return { ...outcome, title };
  });
}

export function allPassed(results: CheckResult[]): boolean {
  return results.length > 0 && results.every((r) => r.passed);
}
