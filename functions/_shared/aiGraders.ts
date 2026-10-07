// Server-side lookup of a lesson's authored AI-grader config.
//
// The rubric and prompt are declared to the model as trusted teacher context
// (see lib/grade-written-core.ts), so they must NOT come from the request body.
// They are read from ai-graders.generated.ts, baked at build time by
// scripts/generate-ai-graders.mjs and bundled into this worker.
//
// It is deliberately NOT a static asset. It used to be public/ai-graders.json,
// which anyone could fetch without logging in, and it holds the rubric (and so
// the answers) for the chapter tests. A bundled module has no URL.
//
// Unlike the sibling-gate manifest in lessonAccess.ts, which fails OPEN so an
// asset hiccup can't lock students out of lessons, this fails CLOSED: a lookup
// that can't be resolved must refuse to grade, never fall back to the client's
// copy. Falling back is the exact hole this module exists to close.

import type { RubricItem } from '../../lib/grade-written-core';
import type { DiagramGate, DiagramRule } from '../../lib/diagram-types';
import { AI_GRADERS } from './ai-graders.generated';

export interface AiGraderConfig {
  lessonTitle: string;
  prompt: string;
  rubric: RubricItem[];
  model?: string;
  contextDocs?: string[];
  /** Graded test part: the strict marking framing instead of the lenient default. */
  strict?: boolean;
  /**
   * A flowchart part's own structural rules (lesson.diagram.rules), so the server can recompute the
   * checks it keeps beside a graded chart instead of trusting the browser's. Not secret: the page
   * shows the same list to the student. Absent = DEFAULT_RULES.
   */
  diagramRules?: DiagramRule[];
  /**
   * Hybrid chart: relevance gate (lib/diagram-score.ts). SERVER ONLY, like each rubric item's
   * `check`: both are copied here from diagram.aiGrader by generate-ai-graders.mjs and stripped
   * from the browser's copy by lib/quiz-redact.ts.
   */
  gate?: DiagramGate;
}

// `env` and `request` are no longer needed (there is nothing to fetch) but the
// signature stays so the caller does not change.
export async function loadAiGrader(
  _env: unknown,
  _request: Request,
  lessonId: string,
): Promise<AiGraderConfig | null> {
  // Own properties only: a lessonId of "__proto__" or "constructor" must not
  // resolve to something off Object.prototype.
  return Object.prototype.hasOwnProperty.call(AI_GRADERS, lessonId) ? AI_GRADERS[lessonId] : null;
}
