// A student's own flowchart, turned into the comment scaffold they then fill
// in with code. Used by the second half of a two-part assignment (1.5.30 draws
// the chart, 1.5.31 implements it), where the chart used to be unavailable on
// the page that asked them to work from it.
//
// The output is deliberately pseudocode COMMENTS, in the notation 1.5.20 and
// 1.5.22 teach (one instruction per line, indentation = containment,
// IF/ELSE/END IF in capitals) -- not code. The student still writes every line
// of JavaScript themselves.
//
// Scope: straight runs and one-level-nested decisions, which is all the two
// starter shapes of a 1.5-era chart can express. Anything it cannot walk
// confidently -- a loop, a jump, a branch that never rejoins -- falls back to a
// flat list of the labels in rank order. A wrong scaffold is worse than a
// plain one, so the fallback is not a failure case, it is the safe answer.

import type { DiagramDoc, FlowEdge, FlowNode } from './diagram-types';

const INDENT = '  ';

function outgoing(doc: DiagramDoc, id: string): FlowEdge[] {
  return doc.edges.filter((e) => e.from === id);
}

/** "yes"/"y"/"true" all read as the affirmative branch; anything else is the other one. */
function isYes(edge: FlowEdge): boolean {
  const l = (edge.label ?? '').trim().toLowerCase();
  return l === 'yes' || l === 'y' || l === 'true';
}

/**
 * Where the two arms of a decision come back together. Walking forward from
 * each arm, the first node both reach is the merge point; everything after it
 * belongs to neither arm. Returns null when they never rejoin.
 */
function mergePoint(doc: DiagramDoc, a: string, b: string): string | null {
  const walk = (start: string): string[] => {
    const order: string[] = [];
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      order.push(cur);
      const next = outgoing(doc, cur);
      // Only follow unambiguous single exits; a second branch inside an arm is
      // past what this walk claims to handle.
      cur = next.length === 1 ? next[0].to : undefined;
    }
    return order;
  };
  const fromB = new Set(walk(b));
  for (const id of walk(a)) {
    if (fromB.has(id)) return id;
  }
  return null;
}

function labelOf(n: FlowNode): string {
  return n.label.trim().replace(/\s+/g, ' ');
}

/**
 * Pseudocode comment lines for a student's chart. Every line already carries
 * its `// `, so the caller can join with newlines and drop it into a starter.
 */
export function toPseudocodeComments(doc: DiagramDoc): string[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  // Comments sit beside the flow, and connectors are jumps -- neither is a
  // step, and lib/diagram-check.ts drops them for the same reason.
  const flowNodes = doc.nodes.filter((n) => n.shape !== 'comment' && n.shape !== 'connector');
  if (flowNodes.length === 0) return [];

  const targets = new Set(doc.edges.map((e) => e.to));
  const start =
    flowNodes.find((n) => n.shape === 'terminal' && !targets.has(n.id)) ??
    flowNodes.find((n) => !targets.has(n.id));

  const flat = (): string[] => flowNodes.map((n) => `// ${labelOf(n)}`);
  if (!start) return flat();

  const lines: string[] = [];
  const visited = new Set<string>();
  let bailed = false;

  const emit = (id: string | undefined, stopAt: string | null, depth: number): void => {
    let cur = id;
    while (cur && cur !== stopAt) {
      if (visited.has(cur)) {
        // A node reached twice means a loop or a jump: past this walk's scope.
        bailed = true;
        return;
      }
      visited.add(cur);
      const node = byId.get(cur);
      if (!node) return;
      const pad = INDENT.repeat(depth);
      const outs = outgoing(doc, cur);

      if (node.shape === 'decision') {
        const yes = outs.find(isYes) ?? outs[0];
        const no = outs.find((e) => e !== yes);
        if (!yes || !no) {
          bailed = true;
          return;
        }
        const merge = mergePoint(doc, yes.to, no.to);
        lines.push(`${pad}// IF ${labelOf(node)}`);
        emit(yes.to, merge, depth + 1);
        lines.push(`${pad}// ELSE`);
        emit(no.to, merge, depth + 1);
        lines.push(`${pad}// END IF`);
        if (bailed) return;
        cur = merge ?? undefined;
        continue;
      }

      // A terminal at the end is the chart's punctuation, not an instruction.
      if (!(node.shape === 'terminal' && outs.length === 0)) {
        lines.push(`${pad}// ${labelOf(node)}`);
      }
      if (outs.length > 1) {
        bailed = true;
        return;
      }
      cur = outs[0]?.to;
    }
  };

  // The opening terminal is "Start", not a step to write.
  const firstStep = outgoing(doc, start.id)[0]?.to;
  visited.add(start.id);
  emit(firstStep, null, 0);

  if (bailed || lines.length === 0) return flat();
  // Anything the walk never reached means the chart branches in a way this
  // does not model; the flat list is honest, the partial walk would not be.
  const reached = visited.size;
  const expected = flowNodes.length;
  if (reached < expected) return flat();
  return lines;
}
