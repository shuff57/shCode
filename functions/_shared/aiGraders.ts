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

/**
 * What a TEACHER reviewing a submission is shown of the assignment (the Today tab's review queue):
 * the task the student was given and each criterion's title and points. Built from the same
 * server-side config, and only ever returned by a teacher/admin-gated route (submission-queue GET).
 *
 * Deliberately narrow. It never carries the model id, context docs, the hybrid chart gate or a
 * criterion's deterministic `check`, and on a graded test part (`strict`) it drops each
 * criterion's description too, because those name the answers. Solutions, after-tries pseudocode
 * and quiz keys live elsewhere and are never read here.
 */
export interface TeacherBriefCriterion {
  id: string;
  title: string;
  points: number;
  description?: string;
  required?: boolean;
}
export interface TeacherBrief {
  prompt: string;
  rubric: TeacherBriefCriterion[];
}

// Lab graders wrap the task in model instructions ("The task they were given: ... You cannot run their
// code: ..."); the teacher needs the task, not the instructions.
const TASK_RE = /The task they were given:\s*([\s\S]*?)\s*You cannot run their code/;

export function teacherBrief(cfg: AiGraderConfig | null): TeacherBrief | null {
  if (!cfg || typeof cfg.prompt !== 'string' || !Array.isArray(cfg.rubric)) return null;
  const task = cfg.prompt.match(TASK_RE)?.[1]?.trim();
  const prompt = (task || cfg.prompt).trim();
  const rubric: TeacherBriefCriterion[] = [];
  for (const r of cfg.rubric) {
    if (!r || typeof r.id !== 'string' || typeof r.title !== 'string') continue;
    const item: TeacherBriefCriterion = { id: r.id, title: r.title, points: typeof r.points === 'number' ? r.points : 0 };
    if (!cfg.strict && typeof r.description === 'string' && r.description.trim()) item.description = r.description.trim();
    if (r.required === true) item.required = true;
    rubric.push(item);
  }
  if (!prompt && rubric.length === 0) return null;
  return { prompt, rubric };
}
