'use client';

// Drag-and-drop flowchart canvas. React Flow supplies pan/zoom/drag/connect;
// everything else here exists to keep a beginner on the rails — four shapes
// and nothing else, arrows that snap to a right-angle route, labels typed
// straight onto the diagram, and a shape dropped on an arrow splicing itself
// into the path.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Undo2,
  Trash2,
  Eraser,
  RotateCcw,
  Focus,
  Maximize,
  Minimize,
} from 'lucide-react';

import type { DiagramDoc, FlowShape, SideId } from '../../lib/diagram-types';
import { SHAPE_HINTS, SHAPE_LABELS } from '../../lib/diagram-types';
import { nodeTypes, SHAPE_COLORS, SHAPE_SIZE } from './FlowShapeNodes';
import { edgeTypes } from './EditableEdge';

// ---- doc <-> react-flow ----

function docToFlow(doc: DiagramDoc): { nodes: Node[]; edges: Edge[] } {
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

/** `s-b` / `t-r` -> `b` / `r`. Null for an auto-routed edge. */
function sideOf(handle: string | null | undefined): SideId | undefined {
  if (!handle) return undefined;
  const side = handle.slice(2);
  return side === 't' || side === 'r' || side === 'b' || side === 'l' ? side : undefined;
}

function flowToDoc(nodes: Node[], edges: Edge[]): DiagramDoc {
  const known = new Set(nodes.map((n) => n.id));
  return {
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      shape: (n.data as any).shape as FlowShape,
      label: String((n.data as any).label ?? ''),
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: edges
      .filter((e) => known.has(e.source) && known.has(e.target))
      .map((e) => {
        const fromSide = sideOf(e.sourceHandle);
        const toSide = sideOf(e.targetHandle);
        return {
          id: e.id,
          from: e.source,
          to: e.target,
          ...(e.label ? { label: String(e.label) } : {}),
          ...(fromSide ? { fromSide } : {}),
          ...(toSide ? { toSide } : {}),
        };
      }),
  };
}

const EDGE_BASE = {
  type: 'editable' as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: '#9aa3b8', width: 20, height: 20 },
};

/** How near a shape an arrow may pass before it counts as running through it. */
const BYPASS_CLEARANCE = 72;
/**
 * How far off a decision's own column a target has to sit before its arrow
 * leaves from the side rather than the bottom. Half a layout column, so a
 * branch the layout deliberately pushed across counts and a shape the student
 * has merely nudged a little does not.
 */
const SIDE_EXIT_OFFSET = 120;

/** How close to an arrow a dropped shape has to land to splice into it. */
const SPLICE_RADIUS = 46;

interface Point {
  x: number;
  y: number;
}

function centerOf(n: Node): Point {
  const size = SHAPE_SIZE[(n.data as any).shape as FlowShape] ?? SHAPE_SIZE.process;
  return { x: n.position.x + size.w / 2, y: n.position.y + size.h / 2 };
}

/** Distance from p to the segment ab. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * The arrow nearest to a point, if it is close enough to count as a drop onto
 * that arrow. Measured against the straight line between the two shapes rather
 * than the drawn right-angle route — close enough for a deliberate drop, and
 * far simpler than walking an SVG path.
 */
function edgeUnder(
  p: Point,
  nodes: Node[],
  edges: Edge[],
  excludeNodeId?: string,
): string | null {
  const centers = new Map(nodes.map((n) => [n.id, centerOf(n)] as const));
  let best: string | null = null;
  let bestDist = SPLICE_RADIUS;
  for (const e of edges) {
    if (excludeNodeId && (e.source === excludeNodeId || e.target === excludeNodeId)) continue;
    const a = centers.get(e.source);
    const b = centers.get(e.target);
    if (!a || !b) continue;
    const dist = distToSegment(p, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      best = e.id;
    }
  }
  return best;
}

/**
 * Pick which side each arrow leaves and arrives on, from where the shapes
 * currently sit. A step straight down to the next shape uses bottom-to-top; an
 * arrow that would run through some *other* shape on its way, or that loops
 * back upward, goes around the right-hand side the way a hand-drawn flowchart
 * does. Derived on every render rather than stored, so routing re-tidies
 * itself as the student drags shapes around.
 *
 * Note this asks whether the arrow passes over a shape, not whether it is
 * long: two shapes far apart with clear space between them still get a
 * straight arrow.
 */
function routeEdge(e: Edge, centers: Map<string, Point>, exitCount: Map<string, number>): Edge {
  // An arrow the student attached themselves keeps the sides they chose. Only
  // arrows with no stated sides — a Mermaid starter, or the two halves created
  // by splicing a shape into a path — get routed automatically.
  if (e.sourceHandle && e.targetHandle) return e;

  const from = centers.get(e.source);
  const to = centers.get(e.target);
  if (!from || !to) return e;

  const goesUp = to.y - from.y <= 40;

  // A loop's return arrow goes around the outside, and it goes around the LEFT.
  // The right is spoken for: a decision's second answer leaves on that side
  // (below), so a return arrow coming back up the right would meet the `no`
  // arrow at the same point on the diamond and cross it.
  if (goesUp) return { ...e, sourceHandle: 's-l', targetHandle: 't-l' };

  // Where a shape has more than one way out, those ways out should not share an
  // exit point. The arrow carrying straight on down keeps the bottom; one whose
  // target the layout pushed off to a side leaves from that side. This is what
  // puts a decision's `yes` and `no` on different edges of the diamond, and it
  // separates a loop's "carry on round" from its "leave the loop" at the hexagon.
  //
  // A shape with a single way out is left alone deliberately. Sending its only
  // arrow out sideways drags a horizontal run across the row it is leaving,
  // straight through whatever shape sits between — which reads as a connection
  // that isn't there. With one exit there is nothing to separate from anyway.
  if ((exitCount.get(e.source) ?? 0) > 1 && Math.abs(to.x - from.x) > SIDE_EXIT_OFFSET) {
    return to.x > from.x
      ? { ...e, sourceHandle: 's-r', targetHandle: 't-t' }
      : { ...e, sourceHandle: 's-l', targetHandle: 't-t' };
  }

  const passesThrough = [...centers].some(
    ([id, c]) =>
      id !== e.source && id !== e.target && distToSegment(c, from, to) < BYPASS_CLEARANCE,
  );

  return passesThrough
    ? { ...e, sourceHandle: 's-r', targetHandle: 't-r' }
    : { ...e, sourceHandle: 's-b', targetHandle: 't-t' };
}

function styleEdge(e: Edge, selectedId: string | null, splice: string | null): Edge {
  const active = e.id === selectedId;
  const isSplice = e.id === splice;
  return {
    ...e,
    ...EDGE_BASE,
    style: {
      stroke: isSplice ? '#50fa7b' : active ? '#ff79c6' : '#9aa3b8',
      strokeWidth: isSplice ? 4 : active ? 3 : 2,
      strokeDasharray: isSplice ? '7 4' : undefined,
    },
  };
}

// ---- component ----

interface Props {
  value: DiagramDoc;
  onChange?: (doc: DiagramDoc) => void;
  readOnly?: boolean;
  /** Node ids to outline in red — offenders from a failed structural check. */
  highlight?: string[];
  height?: number;
  /**
   * Floor on how far the initial fit may zoom out. The default keeps a tall
   * figure legible and lets it overflow into a pannable canvas. A review card
   * with a fixed short frame wants the opposite — seeing the whole diagram
   * matters more than label size — so it passes something lower.
   */
  fitMinZoom?: number;
  /** Restores the lesson's starter diagram. Hidden when absent. */
  onReset?: () => void;
}

// The four the book teaches come first and are always visible; the rest are
// the ones the later modules need (functions, loops, long charts, notes) and
// stay behind a toggle so a beginner's first look is still four buttons.
const CORE_SHAPES: FlowShape[] = ['terminal', 'process', 'decision', 'io'];
const MORE_SHAPES: FlowShape[] = ['subroutine', 'preparation', 'connector', 'comment'];
const SHAPE_ORDER: FlowShape[] = [...CORE_SHAPES, ...MORE_SHAPES];

function Canvas({
  value,
  onChange,
  readOnly = false,
  highlight,
  height = 460,
  fitMinZoom = 0.55,
  onReset,
}: Props) {
  const initial = useMemo(() => docToFlow(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [selNode, setSelNode] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const [editNode, setEditNode] = useState<string | null>(null);
  const [editEdge, setEditEdge] = useState<string | null>(null);
  const [spliceTarget, setSpliceTarget] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  // Opens itself if the diagram already uses one of the extra shapes, so a
  // loaded starter never shows shapes the palette appears not to have.
  const [showMore, setShowMore] = useState(() =>
    value.nodes.some((n) => MORE_SHAPES.includes(n.shape)),
  );

  const { screenToFlowPosition, fitView } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const emitted = useRef<string>(JSON.stringify(value));
  const seq = useRef(0);
  const edgeSeq = useRef(0);
  const labelInput = useRef<HTMLInputElement>(null);

  const newEdgeId = useCallback(() => `e${Date.now().toString(36)}-${edgeSeq.current++}`, []);

  // Seed the id counter past anything already on the canvas so a starter
  // diagram's ids can never collide with a newly dropped shape.
  useEffect(() => {
    for (const n of initial.nodes) {
      const m = /^s(\d+)$/.exec(n.id);
      if (m) seq.current = Math.max(seq.current, Number(m[1]));
    }
  }, [initial.nodes]);

  // Parent pushed a different doc in (draft loaded, starter reset) — adopt it.
  useEffect(() => {
    const incoming = JSON.stringify(value);
    if (incoming === emitted.current) return;
    const next = docToFlow(value);
    emitted.current = incoming;
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelNode(null);
    setSelEdge(null);
    setEditNode(null);
    setEditEdge(null);
  }, [value]);

  // Push local edits back out, but only when they actually changed the doc,
  // so a drag that ends where it started doesn't churn the parent.
  useEffect(() => {
    if (!onChange) return;
    const doc = flowToDoc(nodes, edges);
    const json = JSON.stringify(doc);
    if (json === emitted.current) return;
    emitted.current = json;
    onChange(doc);
  }, [nodes, edges, onChange]);

  // ---- fullscreen ----

  useEffect(() => {
    const onChangeFs = () => {
      const active = document.fullscreenElement === wrapRef.current;
      setIsFull(active);
      // The canvas just changed size by a lot; refit once it has settled.
      setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 80);
    };
    document.addEventListener('fullscreenchange', onChangeFs);
    return () => document.removeEventListener('fullscreenchange', onChangeFs);
  }, [fitView]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      wrapRef.current?.requestFullscreen?.().catch(() => {
        // Browsers reject this outside a user gesture or in a sandboxed
        // frame; staying windowed is the correct fallback.
      });
    }
  }, []);

  // ---- history ----

  const snapshot = useCallback(() => {
    history.current.push(JSON.stringify(flowToDoc(nodes, edges)));
    if (history.current.length > 60) history.current.shift();
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    const restored = docToFlow(JSON.parse(prev) as DiagramDoc);
    setNodes(restored.nodes);
    setEdges(restored.edges);
    setSelNode(null);
    setSelEdge(null);
    setEditNode(null);
    setEditEdge(null);
  }, []);

  // ---- graph edits ----

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((es) => applyEdgeChanges(changes, es));
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    const gone = new Set(deleted.map((n) => n.id));
    setEdges((es) => es.filter((e) => !gone.has(e.source) && !gone.has(e.target)));
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      snapshot();
      setEdges((es) => {
        // Don't let a student stack two identical arrows between the same
        // pair — it looks like one arrow but breaks the exit-count check.
        if (es.some((e) => e.source === c.source && e.target === c.target)) return es;
        const from = nodes.find((n) => n.id === c.source);
        // A diamond's exits are the one place a label is mandatory, so
        // pre-fill yes then no and let the student correct it.
        const isDecision = (from?.data as any)?.shape === 'decision';
        const already = es.filter((e) => e.source === c.source).length;
        const label = isDecision ? (already === 0 ? 'yes' : already === 1 ? 'no' : '') : '';
        return [
          ...es,
          {
            id: newEdgeId(),
            source: c.source!,
            target: c.target!,
            // Keep the dots the student actually joined, so the arrow stays
            // attached where they put it instead of being auto-routed.
            sourceHandle: c.sourceHandle ?? undefined,
            targetHandle: c.targetHandle ?? undefined,
            ...(label ? { label } : {}),
          },
        ];
      });
    },
    [nodes, snapshot, newEdgeId],
  );

  /**
   * Drag either end of an existing arrow onto a different shape to re-point
   * it. The arrow keeps its id and its yes/no label, so re-aiming a branch
   * doesn't silently drop the label that says which answer it follows.
   *
   * Deliberately no delete-on-drop-in-empty-space: for a beginner, having an
   * arrow vanish because they let go a little short is worse than having it
   * snap back unchanged.
   */
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      snapshot();
      setEdges((es) => reconnectEdge(oldEdge, newConnection, es));
    },
    [snapshot],
  );

  /**
   * Put `nodeId` in the middle of the arrow `edgeId`: A→B becomes A→N→B. The
   * original arrow's label stays on the first half, since it describes which
   * way the flow left A.
   */
  const spliceInto = useCallback(
    (edgeId: string, nodeId: string) => {
      setEdges((es) => {
        const target = es.find((e) => e.id === edgeId);
        if (!target || target.source === nodeId || target.target === nodeId) return es;
        return [
          ...es.filter((e) => e.id !== edgeId),
          {
            id: newEdgeId(),
            source: target.source,
            target: nodeId,
            ...(target.label ? { label: target.label } : {}),
          },
          { id: newEdgeId(), source: nodeId, target: target.target },
        ];
      });
    },
    [newEdgeId],
  );

  const addShape = useCallback(
    (shape: FlowShape, at?: Point, spliceEdgeId?: string | null) => {
      snapshot();
      const id = `s${++seq.current}`;
      const position = at ?? {
        x: 320 + ((seq.current * 37) % 140),
        y: 60 + ((seq.current * 61) % 220),
      };
      setNodes((ns) => [...ns, { id, type: shape, position, data: { label: '', shape } }]);
      if (spliceEdgeId) spliceInto(spliceEdgeId, id);
      setSelNode(id);
      setSelEdge(null);
      // Open the on-canvas editor immediately: a new shape always needs text.
      setEditNode(id);
      setEditEdge(null);
    },
    [snapshot, spliceInto],
  );

  const setNodeLabel = useCallback((id: string, label: string) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)));
  }, []);

  const setNodeShape = useCallback((id: string, shape: FlowShape) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, type: shape, data: { ...n.data, shape } } : n)),
    );
  }, []);

  const setEdgeLabel = useCallback((id: string, label: string) => {
    setEdges((es) => es.map((e) => (e.id === id ? { ...e, label: label || undefined } : e)));
  }, []);

  const deleteSelected = useCallback(() => {
    snapshot();
    if (selNode) {
      setNodes((ns) => ns.filter((n) => n.id !== selNode));
      setEdges((es) => es.filter((e) => e.source !== selNode && e.target !== selNode));
      setSelNode(null);
    } else if (selEdge) {
      setEdges((es) => es.filter((e) => e.id !== selEdge));
      setSelEdge(null);
    }
  }, [selNode, selEdge, snapshot]);

  const clearAll = useCallback(() => {
    if (nodes.length === 0) return;
    if (!confirm('Delete every shape and start over?')) return;
    snapshot();
    setNodes([]);
    setEdges([]);
    setSelNode(null);
    setSelEdge(null);
    setEditNode(null);
    setEditEdge(null);
  }, [nodes.length, snapshot]);

  // ---- selection + editing ----

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelNode(params.nodes[0]?.id ?? null);
    setSelEdge(params.edges[0]?.id ?? null);
  }, []);

  // snapshot() closes over nodes/edges, so hold it in a ref for callbacks that
  // are handed to child components and must not re-create on every edit.
  const snapshotRef = useRef<(() => void) | null>(null);
  snapshotRef.current = snapshot;

  const beginEditEdge = useCallback((id: string) => {
    snapshotRef.current?.();
    setEditEdge(id);
    setEditNode(null);
  }, []);

  const endEdit = useCallback(() => {
    setEditNode(null);
    setEditEdge(null);
  }, []);

  // ---- dragging a shape onto an arrow ----

  const onNodeDrag = useCallback(
    (_: unknown, node: Node) => {
      // Only an unconnected shape can splice, so nudging an already-wired
      // shape past a line never silently rewires the diagram.
      const wired = edges.some((e) => e.source === node.id || e.target === node.id);
      if (wired) {
        setSpliceTarget(null);
        return;
      }
      setSpliceTarget(edgeUnder(centerOf(node), nodes, edges, node.id));
    },
    [nodes, edges],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      // Recomputed from where the shape actually landed rather than read from
      // the hover highlight: that highlight is React state, and depending on
      // it having committed between two pointer events is a race.
      const wired = edges.some((e) => e.source === node.id || e.target === node.id);
      const target = wired ? null : edgeUnder(centerOf(node), nodes, edges, node.id);
      if (target) spliceInto(target, node.id);
      setSpliceTarget(null);
    },
    [nodes, edges, spliceInto],
  );

  // ---- rendering ----

  const flagged = useMemo(() => new Set(highlight ?? []), [highlight]);

  const renderedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          flagged: flagged.has(n.id),
          editing: editNode === n.id,
          onLabelChange: setNodeLabel,
          onEditEnd: endEdit,
        },
      })),
    [nodes, flagged, editNode, setNodeLabel, endEdit],
  );

  const renderedEdges = useMemo(() => {
    const centers = new Map(nodes.map((n) => [n.id, centerOf(n)] as const));
    const exitCount = new Map<string, number>();
    for (const e of edges) exitCount.set(e.source, (exitCount.get(e.source) ?? 0) + 1);
    return edges.map((e) => ({
      ...styleEdge(routeEdge(e, centers, exitCount), selEdge, spliceTarget),
      data: {
        editing: editEdge === e.id,
        onLabelChange: setEdgeLabel,
        onEditEnd: endEdit,
        onBeginEdit: beginEditEdge,
      },
    }));
  }, [edges, nodes, selEdge, spliceTarget, editEdge, setEdgeLabel, endEdit, beginEditEdge]);

  const selectedNode = nodes.find((n) => n.id === selNode) ?? null;
  const selectedEdge = edges.find((e) => e.id === selEdge) ?? null;

  return (
    <div
      ref={wrapRef}
      className={readOnly ? 'shcode-flow shcode-flow-static' : 'shcode-flow'}
      style={{
        border: '1px solid #44475a',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#21222c',
      }}
    >
      {/* A figure is not a canvas: hide the connection dots so a printed-page
          diagram doesn't advertise handles nobody can drag. React Flow's own
          controls ship light-themed, which reads as white boxes against the
          Dracula canvas. In fullscreen the wrapper becomes a flex column so
          the canvas takes every pixel the toolbar and inspector don't. */}
      <style>{`
        .shcode-flow-static .react-flow__handle { opacity: 0 !important; }
        .shcode-flow .react-flow__controls-button {
          background: #282a36;
          border-bottom: 1px solid #44475a;
          fill: #c8cde0;
          color: #c8cde0;
        }
        .shcode-flow .react-flow__controls-button:hover { background: #3a3d4d; }
        .shcode-flow .react-flow__attribution { background: transparent; font-size: 10px; }
        .shcode-flow .react-flow__attribution a { color: #4b5163; }
        /* React Flow's reconnect anchors are transparent by default, which
           makes re-pointing an arrow undiscoverable. Show them as grab dots
           whenever the arrow is hovered or selected. */
        .shcode-flow .react-flow__edgeupdater { cursor: grab; fill: transparent; }
        .shcode-flow .react-flow__edge:hover .react-flow__edgeupdater,
        .shcode-flow .react-flow__edge.selected .react-flow__edgeupdater {
          fill: #ff79c6;
          stroke: #21222c;
          stroke-width: 2;
        }
        .shcode-flow:fullscreen {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          border: none;
          display: flex;
          flex-direction: column;
        }
        .shcode-flow:fullscreen .shcode-flow-canvas {
          flex: 1 1 auto;
          height: auto !important;
        }
      `}</style>

      {!readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            padding: '8px 10px',
            background: '#282a36',
            borderBottom: '1px solid #44475a',
            flex: '0 0 auto',
          }}
        >
          <span style={{ fontSize: 12, color: '#8b93a7', marginRight: 2 }}>Add:</span>
          {(showMore ? SHAPE_ORDER : CORE_SHAPES).map((shape) => (
            <button
              key={shape}
              type="button"
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData('application/shcode-shape', shape);
                ev.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setSpliceTarget(null)}
              onClick={() => addShape(shape)}
              title={`${SHAPE_HINTS[shape]}. Click to add, or drag onto the canvas — drop it on an arrow to insert it mid-path.`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 11px',
                background: '#21222c',
                border: `1px solid ${SHAPE_COLORS[shape].stroke}66`,
                borderRadius: 6,
                color: '#f8f8f2',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'grab',
              }}
            >
              <ShapeGlyph shape={shape} />
              {SHAPE_LABELS[shape]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            title={showMore ? 'Show only the four basic shapes' : 'Function calls, loop setup, connectors and notes'}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px dashed #44475a',
              borderRadius: 6,
              color: '#8b93a7',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showMore ? '− fewer' : '+ more shapes'}
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <IconButton onClick={undo} title="Undo" Icon={Undo2} />
            <IconButton
              onClick={deleteSelected}
              title="Delete selected (or press Delete)"
              Icon={Trash2}
              disabled={!selNode && !selEdge}
            />
            <IconButton
              onClick={() => fitView({ padding: 0.2, duration: 300 })}
              title="Fit the diagram to the window"
              Icon={Focus}
            />
            <IconButton
              onClick={toggleFullscreen}
              title={isFull ? 'Leave fullscreen (Esc)' : 'Fullscreen'}
              Icon={isFull ? Minimize : Maximize}
            />
            {onReset && (
              <IconButton onClick={onReset} title="Reset to the starter diagram" Icon={RotateCcw} />
            )}
            <IconButton onClick={clearAll} title="Clear the canvas" Icon={Eraser} />
          </div>
        </div>
      )}

      <div
        className="shcode-flow-canvas"
        style={{ height, background: '#21222c' }}
        onDragOver={(ev) => {
          if (readOnly) return;
          ev.preventDefault();
          ev.dataTransfer.dropEffect = 'move';
          // Light up the arrow this shape would splice into, so the student
          // can see the outcome before letting go.
          const at = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
          setSpliceTarget(edgeUnder(at, nodes, edges));
        }}
        onDragLeave={() => setSpliceTarget(null)}
        onDrop={(ev) => {
          if (readOnly) return;
          const shape = ev.dataTransfer.getData('application/shcode-shape') as FlowShape;
          if (!SHAPE_ORDER.includes(shape)) {
            setSpliceTarget(null);
            return;
          }
          ev.preventDefault();
          const at = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
          const size = SHAPE_SIZE[shape];
          // Recomputed here rather than reusing the hover highlight, which is
          // React state and may not have committed between the last dragover
          // and this drop.
          addShape(
            shape,
            { x: Math.round(at.x - size.w / 2), y: Math.round(at.y - size.h / 2) },
            edgeUnder(at, nodes, edges),
          );
          setSpliceTarget(null);
        }}
      >
        <ReactFlow
          nodes={renderedNodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onNodesDelete={readOnly ? undefined : onNodesDelete}
          onConnect={readOnly ? undefined : onConnect}
          onReconnect={readOnly ? undefined : onReconnect}
          onNodeDragStart={readOnly ? undefined : snapshot}
          onNodeDrag={readOnly ? undefined : onNodeDrag}
          onNodeDragStop={readOnly ? undefined : onNodeDragStop}
          onSelectionChange={readOnly ? undefined : onSelectionChange}
          onNodeDoubleClick={
            readOnly
              ? undefined
              : (_, node) => {
                  snapshot();
                  setEditNode(node.id);
                  setEditEdge(null);
                }
          }
          onEdgeDoubleClick={
            readOnly
              ? undefined
              : (_, edge) => {
                  snapshot();
                  setEditEdge(edge.id);
                  setEditNode(null);
                }
          }
          onPaneClick={readOnly ? undefined : endEdit}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          fitView
          // minZoom floors how far fitView will shrink the diagram. A tall
          // chain that can't fit stays legible and pannable instead of being
          // squashed to unreadable text.
          fitViewOptions={{ padding: 0.2, minZoom: fitMinZoom, maxZoom: 1 }}
          minZoom={0.25}
          maxZoom={2}
          deleteKeyCode={editNode || editEdge ? null : ['Backspace', 'Delete']}
          proOptions={{ hideAttribution: false }}
          defaultEdgeOptions={EDGE_BASE}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#3b3d4d" />
          {!readOnly && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>

      {!readOnly && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: '9px 10px',
            background: '#282a36',
            borderTop: '1px solid #44475a',
            minHeight: 44,
            flex: '0 0 auto',
          }}
        >
          {selectedNode ? (
            <>
              <span style={{ fontSize: 12, color: '#8b93a7' }}>Shape text</span>
              <input
                ref={labelInput}
                value={String((selectedNode.data as any).label ?? '')}
                onChange={(ev) => setNodeLabel(selectedNode.id, ev.target.value)}
                onFocus={snapshot}
                placeholder={
                  (selectedNode.data as any).shape === 'decision'
                    ? 'a yes/no question, e.g. age >= 18'
                    : 'what happens here, e.g. get the age'
                }
                style={inputStyle}
              />
              <select
                value={(selectedNode.data as any).shape as FlowShape}
                onChange={(ev) => {
                  snapshot();
                  setNodeShape(selectedNode.id, ev.target.value as FlowShape);
                }}
                style={{ ...inputStyle, flex: '0 0 auto', width: 150, cursor: 'pointer' }}
              >
                {SHAPE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SHAPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </>
          ) : selectedEdge ? (
            <>
              <span style={{ fontSize: 12, color: '#8b93a7' }}>Arrow label</span>
              <input
                value={String(selectedEdge.label ?? '')}
                onChange={(ev) => setEdgeLabel(selectedEdge.id, ev.target.value)}
                onFocus={snapshot}
                placeholder="yes / no — leave blank for a plain arrow"
                style={inputStyle}
              />
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: '#6272a4' }}>
              Double-click a shape or an arrow to type on it. Drag from a shape&apos;s dot to draw
              an arrow, drag an arrow&apos;s end onto a different shape to re-point it, or drop a
              new shape onto an arrow to insert it mid-path.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  flex: 1,
  minWidth: 180,
  background: '#21222c',
  color: '#f8f8f2',
  border: '1px solid #44475a',
  borderRadius: 6,
  padding: '6px 9px',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
} as const;

function IconButton({
  onClick,
  title,
  Icon,
  disabled,
}: {
  onClick: () => void;
  title: string;
  Icon: any;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 28,
        background: '#21222c',
        border: '1px solid #44475a',
        borderRadius: 6,
        color: disabled ? '#4b5163' : '#c8cde0',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon size={15} />
    </button>
  );
}

/** Miniature of each shape, so the palette reads without the words. */
function ShapeGlyph({ shape }: { shape: FlowShape }) {
  const c = SHAPE_COLORS[shape].stroke;
  const common = { width: 18, height: 12, flex: '0 0 auto' } as const;
  if (shape === 'decision') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <path d="M9 1 L17 6 L9 11 L1 6 Z" fill="none" stroke={c} strokeWidth="1.6" />
      </svg>
    );
  }
  if (shape === 'io') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <path d="M4 1 H17 L14 11 H1 Z" fill="none" stroke={c} strokeWidth="1.6" />
      </svg>
    );
  }
  if (shape === 'preparation') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <path d="M4 1 H14 L17 6 L14 11 H4 L1 6 Z" fill="none" stroke={c} strokeWidth="1.6" />
      </svg>
    );
  }
  if (shape === 'subroutine') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <rect x="1" y="1" width="16" height="10" rx="1.5" fill="none" stroke={c} strokeWidth="1.6" />
        <path d="M4.5 1 V11 M13.5 1 V11" stroke={c} strokeWidth="1.4" />
      </svg>
    );
  }
  if (shape === 'connector') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <circle cx="9" cy="6" r="5" fill="none" stroke={c} strokeWidth="1.6" />
      </svg>
    );
  }
  if (shape === 'comment') {
    return (
      <svg {...common} viewBox="0 0 18 12" aria-hidden>
        <path d="M5 1 H16 M5 11 H16 M5 1 V11" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2.5 1.8" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 18 12" aria-hidden>
      <rect
        x="1"
        y="1"
        width="16"
        height="10"
        rx={shape === 'terminal' ? 5 : 1.5}
        fill="none"
        stroke={c}
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function DiagramEditor(props: Props) {
  // React Flow measures the DOM on mount, so it can't render during the
  // static export's prerender pass. Hold a same-height placeholder until the
  // client takes over rather than risk a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        style={{
          height: (props.height ?? 460) + (props.readOnly ? 0 : 90),
          border: '1px solid #44475a',
          borderRadius: 10,
          background: '#21222c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6272a4',
          fontSize: 13,
        }}
      >
        Loading diagram editor…
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
