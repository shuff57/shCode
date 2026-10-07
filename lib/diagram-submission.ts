// Reading a stored submission back on the teacher side.
//
// A submission's `response` column holds whatever the lesson type put there:
// prose for a written assignment, a serialized DiagramDoc for a flowchart. The
// column is untyped text, so both readers have to sniff it rather than trust it.

import type { DiagramDoc } from './diagram-types';
import type { CheckResult } from './diagram-check';
import { sanitizeDiagramDoc } from './diagram-artifact';

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
    // One validator for every reader (lib/diagram-artifact.ts): a row written by the uncapped or
    // 'client' route is whatever the browser sent, and a null arrow or a numeric label must never
    // reach docToFlow (round 7: it took the whole /teacher page down).
    return sanitizeDiagramDoc(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * The chart a capped AI-graded flowchart part kept with its counted row
 * (grade_json.artifact, written by grade-written from cleanArtifact). The row's `response` is
 * the Mermaid text the model read, so the drawn chart lives here. Null when absent or malformed.
 */
export function parseDiagramArtifact(raw: string | null | undefined): DiagramDoc | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const doc = parsed && typeof parsed === 'object' ? (parsed as { artifact?: { doc?: unknown } }).artifact?.doc : null;
    if (!doc || typeof doc !== 'object') return null;
    return parseDiagramResponse(JSON.stringify(doc));
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
    // A capped AI part keeps its browser-side checks beside the grade, under `artifact.checks`.
    const artifactChecks = parsed.artifact && Array.isArray(parsed.artifact.checks) ? parsed.artifact.checks : null;
    const hasStructural = Array.isArray(parsed.structural) || (artifactChecks !== null && artifactChecks.length > 0);
    const hasAi = parsed.ai && Array.isArray(parsed.ai.criteria);
    if (!hasStructural && !hasAi) return null;
    return {
      structural: hasStructural ? cleanChecks(Array.isArray(parsed.structural) ? parsed.structural : artifactChecks) : undefined,
      ai: hasAi ? parsed.ai : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * A stored check list is whatever a browser sent on the uncapped and 'client' routes, and the
 * reader renders `c.passed` / `c.title` straight off it, so a null entry took the page down. Keep
 * only entries that are objects and give each a boolean `passed` and a string `title` (round 7).
 */
function cleanChecks(list: unknown): CheckResult[] {
  if (!Array.isArray(list)) return [];
  const out: CheckResult[] = [];
  for (const c of list.slice(0, 60)) {
    if (!c || typeof c !== 'object') continue;
    const k = c as { id?: unknown; title?: unknown; passed?: unknown; detail?: unknown; offenders?: unknown };
    out.push({
      id: typeof k.id === 'string' ? k.id.slice(0, 40) : '',
      title: typeof k.title === 'string' ? k.title.slice(0, 200) : String(k.id ?? 'check').slice(0, 40),
      passed: k.passed === true,
      detail: typeof k.detail === 'string' ? k.detail.slice(0, 500) : '',
      offenders: Array.isArray(k.offenders) ? k.offenders.filter((o): o is string => typeof o === 'string').slice(0, 50) : [],
    } as CheckResult);
  }
  return out;
}
