// Mermaid <-> DiagramDoc. A deliberately small subset — the four shapes the
// book teaches, plus plain and labelled arrows. Authors write Mermaid in a
// ```flow fence; students drag the parsed result; the grader reads the
// re-serialized text.
//
// Supported node syntax:
//   A([Start])      terminal      A(Start)     terminal
//   B[get the age]  process       C{age >= 18} decision
//   D[/print x/]    input/output
//
// Supported edges:
//   A --> B         A -- yes --> B      A -->|yes| B

import type { DiagramDoc, FlowEdge, FlowNode, FlowShape } from './diagram-types';

// ---- Parsing ----

// One edge operator. Alternatives are ordered so `-- label -->` wins over a
// bare `-->`; a bare `-->` can't match the first branch because `>` is
// excluded from the label's opening character class.
const EDGE_OP = /--\s*([^>|\-][^>]*?)\s*-->|-->\s*\|\s*([^|]*?)\s*\||-->/g;

const NODE_REF =
  /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(\[([\s\S]*)\]\)|\[\/([\s\S]*)\/\]|\[([\s\S]*)\]|\{([\s\S]*)\}|\(([\s\S]*)\))?$/;

interface ParsedRef {
  id: string;
  shape?: FlowShape;
  label?: string;
}

function unquote(raw: string): string {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/#quot;/g, '"').trim();
  }
  return s.replace(/#quot;/g, '"');
}

function parseRef(segment: string): ParsedRef | null {
  const m = NODE_REF.exec(segment.trim());
  if (!m) return null;
  const id = m[1];
  if (m[2] !== undefined) return { id, shape: 'terminal', label: unquote(m[2]) };
  if (m[3] !== undefined) return { id, shape: 'io', label: unquote(m[3]) };
  if (m[4] !== undefined) return { id, shape: 'process', label: unquote(m[4]) };
  if (m[5] !== undefined) return { id, shape: 'decision', label: unquote(m[5]) };
  if (m[6] !== undefined) return { id, shape: 'terminal', label: unquote(m[6]) };
  return { id }; // bare reference to a node declared elsewhere
}

/**
 * Parse a Mermaid flowchart into a laid-out DiagramDoc. Unparseable lines are
 * skipped rather than thrown on — an author's typo should cost them one arrow,
 * not the whole figure.
 */
export function fromMermaid(src: string): DiagramDoc {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  let edgeSeq = 0;

  const touch = (ref: ParsedRef): FlowNode => {
    const existing = nodes.get(ref.id);
    if (existing) {
      // A later declaration with an explicit shape/label wins over an earlier
      // bare reference, so `A --> B` then `B[do it]` still names B.
      if (ref.shape) existing.shape = ref.shape;
      if (ref.label !== undefined && ref.label !== '') existing.label = ref.label;
      return existing;
    }
    const node: FlowNode = {
      id: ref.id,
      shape: ref.shape ?? 'process',
      label: ref.label ?? ref.id,
      x: 0,
      y: 0,
    };
    nodes.set(ref.id, node);
    return node;
  };

  for (const rawLine of src.split('\n')) {
    const line = rawLine.replace(/%%.*$/, '').trim();
    if (!line) continue;
    if (/^(flowchart|graph)\b/i.test(line)) continue;
    if (/^(subgraph|end|classDef|class|style|linkStyle|direction)\b/i.test(line)) continue;

    // Walk the line, splitting on edge operators and keeping each operator's
    // label so `C -- yes --> D` lands on the right arrow.
    EDGE_OP.lastIndex = 0;
    const segments: string[] = [];
    const opLabels: (string | undefined)[] = [];
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = EDGE_OP.exec(line)) !== null) {
      segments.push(line.slice(cursor, m.index));
      opLabels.push(m[1] ?? m[2]);
      cursor = m.index + m[0].length;
    }
    segments.push(line.slice(cursor));

    const refs = segments.map(parseRef);
    if (refs.some((r) => r === null)) continue;

    const chain = (refs as ParsedRef[]).map(touch);
    for (let i = 0; i < chain.length - 1; i++) {
      const label = opLabels[i]?.trim();
      edges.push({
        id: `e${edgeSeq++}`,
        from: chain[i].id,
        to: chain[i + 1].id,
        ...(label ? { label } : {}),
      });
    }
  }

  return layout({ version: 1, nodes: [...nodes.values()], edges });
}

// ---- Layout ----

const COL_W = 240;
const ROW_H = 150;

/**
 * Rank nodes by longest path from a start node, then spread each rank
 * horizontally. Crude, but a flowchart is nearly a tree and the student can
 * drag anything that lands badly.
 */
export function layout(doc: DiagramDoc): DiagramDoc {
  const { nodes, edges } = doc;
  if (nodes.length === 0) return doc;

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    indegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!outgoing.has(e.from) || !indegree.has(e.to)) continue;
    outgoing.get(e.from)!.push(e.to);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }

  const rank = new Map<string, number>();
  const roots = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0);
  // A pure cycle has no zero-indegree node; fall back to the first node so
  // layout still produces something rather than an empty canvas.
  const seeds = roots.length > 0 ? roots : [nodes[0]];

  const queue: string[] = [];
  for (const s of seeds) {
    rank.set(s.id, 0);
    queue.push(s.id);
  }
  // Bounded relaxation: each node's rank can only increase, and is capped at
  // the node count, so a cycle terminates instead of spinning.
  let guard = nodes.length * nodes.length + 8;
  while (queue.length > 0 && guard-- > 0) {
    const id = queue.shift()!;
    const r = rank.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      const candidate = r + 1;
      if (candidate > nodes.length) continue;
      if ((rank.get(next) ?? -1) < candidate) {
        rank.set(next, candidate);
        queue.push(next);
      }
    }
  }

  const byRank = new Map<number, FlowNode[]>();
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(n);
  }

  const placed = nodes.map((n) => ({ ...n }));
  const index = new Map(placed.map((n) => [n.id, n]));
  for (const [r, group] of byRank) {
    group.forEach((n, i) => {
      const target = index.get(n.id)!;
      target.x = Math.round((i - (group.length - 1) / 2) * COL_W + 360);
      target.y = r * ROW_H + 40;
    });
  }

  return { ...doc, nodes: placed };
}

// ---- Serializing ----

const OPEN: Record<FlowShape, string> = {
  terminal: '([',
  process: '[',
  decision: '{',
  io: '[/',
};
const CLOSE: Record<FlowShape, string> = {
  terminal: '])',
  process: ']',
  decision: '}',
  io: '/]',
};

function quote(label: string): string {
  const clean = label.replace(/"/g, '#quot;').replace(/\s+/g, ' ').trim();
  // Mermaid needs quoting for anything with structural punctuation in it.
  return /[[\]{}()|<>"#]/.test(label) || clean === '' ? `"${clean}"` : clean;
}

/** Stable short ids so two exports of the same diagram diff cleanly. */
function idMap(doc: DiagramDoc): Map<string, string> {
  return new Map(doc.nodes.map((n, i) => [n.id, `n${i + 1}`]));
}

export function toMermaid(doc: DiagramDoc): string {
  const ids = idMap(doc);
  const lines = ['flowchart TD'];
  for (const n of doc.nodes) {
    const short = ids.get(n.id)!;
    lines.push(`  ${short}${OPEN[n.shape]}${quote(n.label)}${CLOSE[n.shape]}`);
  }
  for (const e of doc.edges) {
    const from = ids.get(e.from);
    const to = ids.get(e.to);
    if (!from || !to) continue;
    lines.push(e.label ? `  ${from} -- ${e.label} --> ${to}` : `  ${from} --> ${to}`);
  }
  return lines.join('\n');
}

/**
 * Mermaid plus a prose walk of the graph. The prose half matters: the grader
 * model reads shape *meaning* far more reliably from "Decision: age >= 18 —
 * yes goes to ..." than from `n3{age >= 18}`.
 */
export function describeDiagram(doc: DiagramDoc): string {
  const ids = idMap(doc);
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const kind: Record<FlowShape, string> = {
    terminal: 'Terminal (start/end oval)',
    process: 'Task (rectangle)',
    decision: 'Decision (diamond)',
    io: 'Input/Output (parallelogram)',
  };

  const walk: string[] = [];
  for (const n of doc.nodes) {
    const outs = doc.edges.filter((e) => e.from === n.id);
    const arrows =
      outs.length === 0
        ? 'no outgoing arrow'
        : outs
            .map((e) => {
              const target = byId.get(e.to);
              const name = target ? `"${target.label}"` : '(missing node)';
              return e.label ? `on "${e.label}" goes to ${name}` : `goes to ${name}`;
            })
            .join('; ');
    walk.push(`- ${ids.get(n.id)} ${kind[n.shape]} labelled "${n.label}" — ${arrows}.`);
  }

  return [
    'The student submitted a flowchart diagram. Mermaid source:',
    '',
    '```mermaid',
    toMermaid(doc),
    '```',
    '',
    `Shape-by-shape walk (${doc.nodes.length} shapes, ${doc.edges.length} arrows):`,
    walk.length > 0 ? walk.join('\n') : '- (the diagram is empty)',
  ].join('\n');
}
