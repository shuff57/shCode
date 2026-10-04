// A stored chart (DiagramDoc) as the nodes and arrows React Flow draws. Pure, so the teacher's
// read path (a submission's chart -> what appears on the canvas) can be tested without a
// browser: scripts/test-attempt-reveal.mjs feeds it a chart stored by grade-written.

import type { Edge, Node } from '@xyflow/react';
import type { DiagramDoc } from './diagram-types';

export function docToFlow(doc: DiagramDoc): { nodes: Node[]; edges: Edge[] } {
  const known = new Set(doc.nodes.map((n) => n.id));
  return {
    nodes: doc.nodes.map((n) => ({
      id: n.id,
      type: n.shape,
      position: { x: n.x, y: n.y },
      data: { label: n.label, shape: n.shape },
    })),
    edges: doc.edges
      .filter((e) => known.has(e.from) && known.has(e.to))
      .map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        ...(e.label ? { label: e.label } : {}),
        ...(e.fromSide ? { sourceHandle: `s-${e.fromSide}` } : {}),
        ...(e.toSide ? { targetHandle: `t-${e.toSide}` } : {}),
      })),
  };
}
