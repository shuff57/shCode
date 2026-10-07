// One tolerant validator for a chart (DiagramDoc) that arrives from somewhere untrusted: a
// browser's grade-written artifact, or a stored submission row the teacher's reader opens.
//
// WHY ONE FUNCTION. Round 6 rebuilt the chart inside the server's cleanArtifact only; the readers
// (lib/diagram-submission.ts) kept sniffing just id and shape, so a row written by the uncapped or
// 'client' route with `edges: [null]` or `label: 5` reached docToFlow and threw during render,
// which takes the whole /teacher page down (round 7). Every reader and the writer now go through
// this, so a chart that comes out of it can never make docToFlow, DiagramEditor or
// describeDiagram throw.
//
// It DROPS what is wrong rather than refusing the chart: a node that is not an object or has no
// string id or a shape the course does not have; an edge that is not an object, repeats an id,
// or points at a node that is not there. Labels are coerced to bounded strings, coordinates are
// clamped. The caller decides whether a chart that lost something is still worth showing (the
// server keeps an artifact only when the doc, as rebuilt, still describes exactly the text the
// model graded).
//
// Pure: no DOM, no React, importable from a Pages Function.

import type { DiagramDoc, FlowEdge, FlowNode, FlowShape, SideId } from './diagram-types';

/** The shapes a chart may use. Kept in step with lib/diagram-types.ts FlowShape by test-attempt-reveal. */
export const FLOW_SHAPES: ReadonlySet<string> = new Set([
  'terminal',
  'process',
  'decision',
  'io',
  'subroutine',
  'preparation',
  'connector',
  'comment',
]);

export const MAX_DIAGRAM_NODES = 200;
export const MAX_DIAGRAM_EDGES = 400;
export const MAX_NODE_LABEL = 300;
export const MAX_EDGE_LABEL = 100;
export const MAX_ID_LENGTH = 80;
/** Far past any chart a student draws, small enough that no layout maths overflows. */
export const MAX_COORD = 100_000;

const SIDES: ReadonlySet<string> = new Set(['t', 'r', 'b', 'l']);

const clamp = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(-MAX_COORD, Math.min(MAX_COORD, v)) : 0;

const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

const validId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID_LENGTH;

/**
 * The chart, rebuilt from the known keys only, or null when `raw` is not shaped like a chart at
 * all (no nodes/edges arrays, over the size caps, or it had nodes and none of them survived).
 */
export function sanitizeDiagramDoc(raw: unknown): DiagramDoc | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const doc = raw as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null;
  if (doc.nodes.length > MAX_DIAGRAM_NODES || doc.edges.length > MAX_DIAGRAM_EDGES) return null;

  const nodes: FlowNode[] = [];
  const ids = new Set<string>();
  for (const n of doc.nodes) {
    if (!n || typeof n !== 'object') continue;
    const k = n as { id?: unknown; shape?: unknown; label?: unknown; x?: unknown; y?: unknown };
    if (!validId(k.id) || ids.has(k.id)) continue;
    if (typeof k.shape !== 'string' || !FLOW_SHAPES.has(k.shape)) continue;
    ids.add(k.id);
    nodes.push({
      id: k.id,
      shape: k.shape as FlowShape,
      label: text(k.label, MAX_NODE_LABEL),
      x: clamp(k.x),
      y: clamp(k.y),
    });
  }
  // A {nodes, edges} object that is not a chart would otherwise render as an empty canvas, which
  // reads as "the student submitted nothing".
  if (doc.nodes.length > 0 && nodes.length === 0) return null;

  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  for (const e of doc.edges) {
    if (!e || typeof e !== 'object') continue;
    const k = e as { id?: unknown; from?: unknown; to?: unknown; label?: unknown; fromSide?: unknown; toSide?: unknown };
    if (!validId(k.id) || edgeIds.has(k.id)) continue;
    if (typeof k.from !== 'string' || typeof k.to !== 'string' || !ids.has(k.from) || !ids.has(k.to)) continue;
    edgeIds.add(k.id);
    const edge: FlowEdge = { id: k.id, from: k.from, to: k.to };
    if (typeof k.label === 'string' && k.label) edge.label = k.label.slice(0, MAX_EDGE_LABEL);
    if (typeof k.fromSide === 'string' && SIDES.has(k.fromSide)) edge.fromSide = k.fromSide as SideId;
    if (typeof k.toSide === 'string' && SIDES.has(k.toSide)) edge.toSide = k.toSide as SideId;
    edges.push(edge);
  }
  return { version: 1, nodes, edges };
}
