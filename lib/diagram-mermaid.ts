// Mermaid <-> DiagramDoc. A deliberately small subset — the eight shapes of
// lib/diagram-types.ts, plus plain and labelled arrows. Authors write Mermaid
// in a ```flow fence; students drag the parsed result; the grader reads the
// re-serialized text.
//
// Supported node syntax:
//   A([Start])      terminal      A(Start)      terminal
//   B[get the age]  process       C{age >= 18}  decision
//   D[/print x/]    input/output  E[[draw()]]   subroutine
//   F{{i = 0 to 9}} preparation   G((A))        connector
//   H>a note]       comment
//
// Supported edges:
//   A --> B         A -- yes --> B      A -->|yes| B

import type { DiagramDoc, FlowEdge, FlowNode, FlowShape } from './diagram-types';

// ---- Parsing ----

// One edge operator. Alternatives are ordered so `-- label -->` wins over a
// bare `-->`; a bare `-->` can't match the first branch because `>` is
// excluded from the label's opening character class.
const EDGE_OP = /--\s*([^>|\-][^>]*?)\s*-->|-->\s*\|\s*([^|]*?)\s*\||-->/g;

// Alternatives are ordered longest-delimiter-first: `[[x]]` must be tried
// before `[x]`, `{{x}}` before `{x}`, and `((x))` before `(x)`, or the shorter
// form matches and swallows a bracket into the label.
const NODE_REF = new RegExp(
  '^([A-Za-z_][A-Za-z0-9_]*)\\s*(?:' +
    '\\[\\[([\\s\\S]*)\\]\\]' + // subroutine
    '|\\{\\{([\\s\\S]*)\\}\\}' + // preparation (hexagon)
    '|\\(\\(([\\s\\S]*)\\)\\)' + // connector (circle)
    '|>([\\s\\S]*)\\]' + //        comment (asymmetric flag)
    '|\\(\\[([\\s\\S]*)\\]\\)' + // terminal (stadium)
    '|\\[\\/([\\s\\S]*)\\/\\]' + // io (parallelogram)
    '|\\[([\\s\\S]*)\\]' + //      process
    '|\\{([\\s\\S]*)\\}' + //      decision
    '|\\(([\\s\\S]*)\\)' + //      terminal (rounded)
    ')?$',
);

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

// Capture-group order must match the alternation order in NODE_REF.
const REF_SHAPES: FlowShape[] = [
  'subroutine',
  'preparation',
  'connector',
  'comment',
  'terminal',
  'io',
  'process',
  'decision',
  'terminal',
];

function parseRef(segment: string): ParsedRef | null {
  const m = NODE_REF.exec(segment.trim());
  if (!m) return null;
  const id = m[1];
  for (let i = 0; i < REF_SHAPES.length; i++) {
    const captured = m[i + 2];
    if (captured !== undefined) return { id, shape: REF_SHAPES[i], label: unquote(captured) };
  }
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

  const outgoing = new Map<string, { to: string; i: number }[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    indegree.set(n.id, 0);
  }
  edges.forEach((e, i) => {
    if (!outgoing.has(e.from) || !indegree.has(e.to)) return;
    outgoing.get(e.from)!.push({ to: e.to, i });
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  });

  const rank = new Map<string, number>();
  const roots = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0);
  // A pure cycle has no zero-indegree node; fall back to the first node so
  // layout still produces something rather than an empty canvas.
  const seeds = roots.length > 0 ? roots : [nodes[0]];

  // A loop's return arrow points back at a node we are already inside. Ranking
  // through it would push every node around the loop one row lower, again on
  // the next trip, and again until the cap — which sinks the loop body below
  // the shapes that come after the loop and reads as though flow runs upward.
  // Find those edges with a depth-first walk and rank as if they were absent.
  // They still draw; they just don't get a vote on what row anything sits in.
  const back = new Set<number>();
  const state = new Map<string, 0 | 1 | 2>(); // unvisited | on the stack | done
  function walk(id: string) {
    state.set(id, 1);
    for (const { to, i } of outgoing.get(id) ?? []) {
      const s = state.get(to) ?? 0;
      if (s === 1) back.add(i);
      else if (s === 0) walk(to);
    }
    state.set(id, 2);
  }
  for (const s of seeds) if ((state.get(s.id) ?? 0) === 0) walk(s.id);
  // Anything a seed couldn't reach (a detached fragment) still needs ranking.
  for (const n of nodes) if ((state.get(n.id) ?? 0) === 0) walk(n.id);

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
    for (const { to: next, i } of outgoing.get(id) ?? []) {
      if (back.has(i)) continue;
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

  // Column assignment. A shape sits in its parent's column whenever that column
  // is free, so an unbranching run of steps falls in one straight line and a
  // decision's *first* answer carries straight on down. A second answer finds
  // the column taken and shifts right — which is exactly the "yes below, no out
  // to the side" shape a hand-drawn flowchart uses, and it is what lets the two
  // answers leave the diamond on different sides instead of crossing.
  //
  // Declaration order decides who wins the column, so `C -- yes --> D` written
  // before `C -- no --> E` puts the yes branch in the main line. Back edges get
  // no vote: a loop's return arrow must not drag its target out of the column
  // its real parent put it in.
  const firstParent = new Map<string, string>();
  edges.forEach((e, i) => {
    if (back.has(i) || firstParent.has(e.to)) return;
    if (!rank.has(e.from) || !rank.has(e.to)) return;
    firstParent.set(e.to, e.from);
  });

  const col = new Map<string, number>();
  for (const r of [...byRank.keys()].sort((a, b) => a - b)) {
    const taken = new Set<number>();
    for (const n of byRank.get(r)!) {
      const parent = firstParent.get(n.id);
      let c = parent !== undefined ? (col.get(parent) ?? 0) : 0;
      while (taken.has(c)) c++;
      taken.add(c);
      col.set(n.id, c);
    }
  }

  const placed = nodes.map((n) => ({ ...n }));
  const index = new Map(placed.map((n) => [n.id, n]));
  for (const [r, group] of byRank) {
    for (const n of group) {
      const target = index.get(n.id)!;
      target.x = Math.round((col.get(n.id) ?? 0) * COL_W + 360);
      target.y = r * ROW_H + 40;
    }
  }

  return { ...doc, nodes: placed };
}

// ---- Serializing ----

const OPEN: Record<FlowShape, string> = {
  terminal: '([',
  process: '[',
  decision: '{',
  io: '[/',
  subroutine: '[[',
  preparation: '{{',
  connector: '((',
  comment: '>',
};
const CLOSE: Record<FlowShape, string> = {
  terminal: '])',
  process: ']',
  decision: '}',
  io: '/]',
  subroutine: ']]',
  preparation: '}}',
  connector: '))',
  comment: ']',
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
    subroutine: 'Function call (predefined process)',
    preparation: 'Loop setup (hexagon)',
    connector: 'Connector (jump point; connectors sharing a label are the same point)',
    comment: 'Note (annotation, deliberately outside the flow)',
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
