// Structural checks on a flowchart graph. Runs in the browser, instantly,
// with no network call — the student gets "your diamond only has one exit"
// the moment they ask, and the AI grader is reserved for the question these
// rules can never answer: does this diagram actually solve the problem.
//
// Two shapes are not ordinary flow nodes, and every rule here works on a
// *collapsed* view that accounts for them:
//
//   comment    sits beside the chart, takes no arrows. Dropped entirely, or
//              it would read as a floating shape and as a second start.
//   connector  a jump. Two connectors sharing a label are one point, so they
//              merge into a single logical node — otherwise "every shape is
//              reachable" fails on exactly the diagrams connectors exist to
//              make readable.

import type { DiagramDoc, DiagramRule, DiagramRuleId, FlowNode } from './diagram-types';
import { isFlowShape } from './diagram-types';

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
  'connector-pairs': 'Every connector has a matching partner',
  'min-decisions': 'Uses at least one decision diamond',
  'min-process': 'Uses at least one task rectangle',
  'min-nodes': 'Diagram has enough shapes',
};

interface Graph {
  /** Every original node, for naming offenders. */
  byId: Map<string, FlowNode>;
  /** Logical nodes: comments dropped, connector groups merged. */
  flowNodes: FlowNode[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
  /** original id -> logical id (null for comments). */
  logicalOf: Map<string, string | null>;
  /** logical id -> original ids, so a merged connector highlights both halves. */
  membersOf: Map<string, string[]>;
}

/** Connectors pair on their label, case- and space-insensitively. */
function connectorKey(n: FlowNode): string | null {
  const label = n.label.trim().toLowerCase();
  return label ? `conn:${label}` : null;
}

function buildGraph(doc: DiagramDoc): Graph {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const logicalOf = new Map<string, string | null>();
  const membersOf = new Map<string, string[]>();
  const representative = new Map<string, FlowNode>();

  for (const n of doc.nodes) {
    if (!isFlowShape(n.shape)) {
      logicalOf.set(n.id, null);
      continue;
    }
    // An unlabelled connector cannot pair with anything, so it stays its own
    // node and gets caught by connector-pairs rather than silently merging.
    const key = n.shape === 'connector' ? (connectorKey(n) ?? n.id) : n.id;
    logicalOf.set(n.id, key);
    if (!membersOf.has(key)) {
      membersOf.set(key, []);
      representative.set(key, { ...n, id: key });
    }
    membersOf.get(key)!.push(n.id);
  }

  const flowNodes = [...representative.values()];
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const n of flowNodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }

  for (const e of doc.edges) {
    // Edges to deleted nodes, or to/from a note, are ignored rather than
    // counted — the editor prevents the latter, a hand-authored starter might not.
    const from = logicalOf.get(e.from);
    const to = logicalOf.get(e.to);
    if (!from || !to) continue;
    if (from === to) continue; // collapsing a connector pair can create this
    outgoing.get(from)!.push(to);
    incoming.get(to)!.push(from);
  }

  return { byId, flowNodes, outgoing, incoming, logicalOf, membersOf };
}

/** Logical ids -> original ids, so highlighting lands on real canvas shapes. */
function expand(ids: string[], g: Graph): string[] {
  return ids.flatMap((id) => g.membersOf.get(id) ?? [id]);
}

function startNodes(g: Graph): FlowNode[] {
  return g.flowNodes.filter((n) => (g.incoming.get(n.id) ?? []).length === 0);
}

function endNodes(g: Graph): FlowNode[] {
  return g.flowNodes.filter((n) => (g.outgoing.get(n.id) ?? []).length === 0);
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

/** Names a logical node by the label a student can actually see. */
function nameList(ids: string[], g: Graph): string {
  return ids
    .map((id) => {
      const first = (g.membersOf.get(id) ?? [id])[0];
      const label = (g.byId.get(first) ?? g.flowNodes.find((n) => n.id === id))?.label?.trim();
      return label ? `"${label}"` : '(unlabelled)';
    })
    .join(', ');
}

function evaluate(rule: DiagramRule, doc: DiagramDoc, g: Graph): Omit<CheckResult, 'title'> {
  const id = rule.id;

  switch (id) {
    case 'one-start': {
      const roots = startNodes(g);
      const terminalRoots = roots.filter((n) => n.shape === 'terminal');
      if (g.flowNodes.length === 0) {
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
          offenders: expand(roots.map((n) => n.id), g),
        };
      }
      if (terminalRoots.length !== 1) {
        return {
          id,
          passed: false,
          detail: `The first shape is ${nameList([roots[0].id], g)}, but it is not an oval. Start and End are drawn as ovals.`,
          offenders: expand([roots[0].id], g),
        };
      }
      return { id, passed: true, detail: `Starts at ${nameList([roots[0].id], g)}.`, offenders: [] };
    }

    case 'has-end': {
      // An End oval is a terminal that something arrives at and nothing leaves.
      const leaves = endNodes(g).filter(
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
      // Notes are included: a blank note is as unhelpful as a blank task.
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
      if (g.flowNodes.length <= 1) {
        return { id, passed: true, detail: 'Nothing to connect yet.', offenders: [] };
      }
      const loose = g.flowNodes.filter(
        (n) => (g.incoming.get(n.id) ?? []).length === 0 && (g.outgoing.get(n.id) ?? []).length === 0,
      );
      return loose.length === 0
        ? { id, passed: true, detail: 'Every shape is connected to at least one other.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${nameList(loose.map((n) => n.id), g)} ${plural(loose.length, 'is', 'are')} floating with no arrows at all. Drag from a shape's dot to connect it. (Notes are exempt — they are meant to sit beside the chart.)`,
            offenders: expand(loose.map((n) => n.id), g),
          };
    }

    case 'connector-pairs': {
      const connectors = doc.nodes.filter((n) => n.shape === 'connector');
      if (connectors.length === 0) {
        return { id, passed: true, detail: 'No connectors to check.', offenders: [] };
      }
      const unlabelled = connectors.filter((n) => !n.label.trim());
      if (unlabelled.length > 0) {
        return {
          id,
          passed: false,
          detail: `${unlabelled.length} ${plural(unlabelled.length, 'connector has', 'connectors have')} no letter. A connector needs a label so its partner can be identified.`,
          offenders: unlabelled.map((n) => n.id),
        };
      }
      const groups = new Map<string, FlowNode[]>();
      for (const n of connectors) {
        const key = connectorKey(n)!;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(n);
      }
      const lonely = [...groups.values()].filter((group) => group.length < 2);
      return lonely.length === 0
        ? {
            id,
            passed: true,
            detail: `${groups.size} connector ${plural(groups.size, 'pair', 'pairs')} matched up.`,
            offenders: [],
          }
        : {
            id,
            passed: false,
            detail: `${nameList(lonely.map((group) => connectorKey(group[0])!), g)} has no partner. A jump needs two connectors with the same letter — one where the flow leaves, one where it lands.`,
            offenders: lonely.flatMap((group) => group.map((n) => n.id)),
          };
    }

    case 'decision-two-exits': {
      const diamonds = g.flowNodes.filter((n) => n.shape === 'decision');
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
            offenders: expand(bad.map((n) => n.id), g),
          };
    }

    case 'decision-labeled': {
      const diamondIds = new Set(
        g.flowNodes.filter((n) => n.shape === 'decision').map((n) => n.id),
      );
      if (diamondIds.size === 0) {
        return { id, passed: true, detail: 'No decision diamonds to check.', offenders: [] };
      }
      const bad = [...diamondIds].filter((did) =>
        doc.edges.some((e) => g.logicalOf.get(e.from) === did && !(e.label ?? '').trim()),
      );
      return bad.length === 0
        ? { id, passed: true, detail: 'Every arrow out of a diamond says which answer it follows.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${nameList(bad, g)} has an unlabelled exit. Click the arrow and type yes or no so a reader knows which way each answer goes.`,
            offenders: expand(bad, g),
          };
    }

    case 'reaches-end': {
      const roots = startNodes(g);
      if (g.flowNodes.length === 0) {
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
      const stranded = g.flowNodes.filter((n) => !seen.has(n.id));
      if (stranded.length > 0) {
        return {
          id,
          passed: false,
          detail: `${nameList(stranded.map((n) => n.id), g)} cannot be reached by following arrows from Start.`,
          offenders: expand(stranded.map((n) => n.id), g),
        };
      }
      const endsHit = g.flowNodes.filter(
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
      // Checked on the original edges: a connector pair legitimately collapses
      // to a self-reference, and that is a jump, not a mistake.
      const loops = doc.edges.filter((e) => e.from === e.to);
      return loops.length === 0
        ? { id, passed: true, detail: 'No shape points at itself.', offenders: [] }
        : {
            id,
            passed: false,
            detail: `${loops.map((e) => `"${g.byId.get(e.from)?.label ?? e.from}"`).join(', ')} has an arrow pointing back at itself.`,
            offenders: loops.map((e) => e.from),
          };
    }

    case 'min-decisions':
    case 'min-process':
    case 'min-nodes': {
      const want = rule.count ?? 1;
      const flow = doc.nodes.filter((n) => isFlowShape(n.shape));
      const [have, noun] =
        id === 'min-decisions'
          ? [flow.filter((n) => n.shape === 'decision').length, 'decision diamond']
          : id === 'min-process'
            ? [flow.filter((n) => n.shape === 'process').length, 'task rectangle']
            : [flow.length, 'shape'];
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
