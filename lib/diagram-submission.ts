// Reading a stored submission back on the teacher side.
//
// A submission's `response` column holds whatever the lesson type put there:
// prose for a written assignment, a serialized DiagramDoc for a flowchart. The
// column is untyped text, so both readers have to sniff it rather than trust it.

import type { DiagramDoc } from './diagram-types';
import type { CheckResult } from './diagram-check';

/**
 * A stored response, if it is a flowchart. Returns null for prose, for
 * malformed JSON, and for JSON that happens to parse but isn't a diagram —
 * every one of which falls back to the plain-text view.
 */
export function parseDiagramResponse(raw: string | null | undefined): DiagramDoc | null {
  if (!raw) return null;
  const text = raw.trim();
  // Cheap reject before spending a JSON.parse on a long essay.
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    // Node shape matters: an unrelated {nodes, edges} object would render as an
    // empty canvas, which reads as "the student submitted nothing".
    const nodesOk = parsed.nodes.every(
      (n: any) => n && typeof n.id === 'string' && typeof n.shape === 'string',
    );
    if (!nodesOk) return null;
    return { version: 1, nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    return null;
  }
}

export interface DiagramGradeJson {
  structural?: CheckResult[];
  ai?: {
    totalEarned: number;
    totalPossible: number;
    criteria: Array<{
      id: string;
      /** Absent on rows graded before the grader began storing rubric titles. */
      title?: string;
      earned: number;
      max: number;
      verdict: string;
      feedback: string;
    }>;
    summary?: string;
  };
}

/**
 * A diagram lesson records both verdicts under `{ structural, ai }`, so its
 * rubric criteria sit one level deeper than a written assignment's. Returns
 * null when the blob is a plain written-grader result, which the existing
 * top-level reader already handles.
 */
export function parseDiagramGrade(raw: string | null | undefined): DiagramGradeJson | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const hasStructural = Array.isArray(parsed.structural);
    const hasAi = parsed.ai && Array.isArray(parsed.ai.criteria);
    if (!hasStructural && !hasAi) return null;
    return {
      structural: hasStructural ? parsed.structural : undefined,
      ai: hasAi ? parsed.ai : undefined,
    };
  } catch {
    return null;
  }
}
