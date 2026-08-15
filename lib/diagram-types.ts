// ---- Flowchart diagrams ----
//
// One data model behind three surfaces: the drag-and-drop editor students
// use, the ```flow fences authors write in content.md, and the text handed
// to the AI grader. The JSON graph is canonical; Mermaid is a projection of
// it (see lib/diagram-mermaid.ts) so authors never hand-write JSON.
//
// Shapes are exactly the four the book teaches in Table 1.5.2 of
// "1.5 Program Design Tools and Environments" — no more, so a student can't
// wander off into general-purpose drawing.

export type FlowShape = 'terminal' | 'process' | 'decision' | 'io';

export const SHAPE_LABELS: Record<FlowShape, string> = {
  terminal: 'Start / End',
  process: 'Task',
  decision: 'Decision',
  io: 'Input / Output',
};

export interface FlowNode {
  id: string;
  shape: FlowShape;
  label: string;
  x: number;
  y: number;
}

export type SideId = 't' | 'r' | 'b' | 'l';

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  /** Branch label — "yes" / "no" on the exits of a decision diamond. */
  label?: string;
  /**
   * Which side of each shape the arrow attaches to. Set when the student
   * connected the two dots themselves, and then left alone — an arrow must
   * stay where it was put.
   *
   * Absent means "route this one automatically", which is the case for arrows
   * parsed from a Mermaid starter and for arrows created by splicing a shape
   * into an existing path.
   */
  fromSide?: SideId;
  toSide?: SideId;
}

export interface DiagramDoc {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function emptyDiagram(): DiagramDoc {
  return { version: 1, nodes: [], edges: [] };
}

/**
 * How tall a frame this diagram wants, clamped to what the surrounding layout
 * can spare. A fixed height squashes a tall flowchart until its labels are
 * unreadable, so the frame follows the content. The per-shape allowance covers
 * the tallest shape (the 108px diamond) plus its arrow gap.
 */
export function diagramFrameHeight(doc: DiagramDoc, min = 280, max = 880): number {
  if (doc.nodes.length === 0) return min;
  const top = Math.min(...doc.nodes.map((n) => n.y));
  const bottom = Math.max(...doc.nodes.map((n) => n.y));
  return Math.min(max, Math.max(min, bottom - top + 200));
}

// ---- Structural rules ----
//
// Checked in the browser against the graph, instantly and for free. These
// judge whether the diagram is a legal flowchart, never whether it solves
// the assigned problem — that judgment is the AI grader's job.

export type DiagramRuleId =
  | 'one-start'
  | 'has-end'
  | 'all-labeled'
  | 'no-orphans'
  | 'decision-two-exits'
  | 'decision-labeled'
  | 'reaches-end'
  | 'no-self-loop'
  | 'min-decisions'
  | 'min-process'
  | 'min-nodes';

export interface DiagramRule {
  id: DiagramRuleId;
  /** Threshold for the min-* rules. Ignored by the others. */
  count?: number;
  /** Overrides the default student-facing wording. */
  title?: string;
}

/** Applied when a diagram lesson declares no `rules` of its own. */
export const DEFAULT_RULES: DiagramRule[] = [
  { id: 'one-start' },
  { id: 'has-end' },
  { id: 'all-labeled' },
  { id: 'no-orphans' },
  { id: 'decision-two-exits' },
  { id: 'decision-labeled' },
  { id: 'reaches-end' },
];

export interface DiagramConfig {
  /** Shown above the canvas. Falls back to the lesson's content.md. */
  prompt?: string;
  /**
   * Starter diagram, written as Mermaid. Parsed and auto-laid-out on first
   * open. Omit for a blank canvas.
   */
  starter?: string;
  /** Structural rules. Omit to use DEFAULT_RULES; pass [] to check nothing. */
  rules?: DiagramRule[];
  /**
   * When present, "Submit for feedback" also sends the Mermaid text to the
   * Ollama grader through the existing /api/grade-written endpoint.
   */
  aiGrader?: {
    rubricTitle?: string;
    model?: string;
    contextDocs?: string[];
    prompt?: string;
    rubric: Array<{ id: string; title: string; description?: string; points: number }>;
  };
}
