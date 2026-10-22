// The Grade button on a plain-English-to-pseudocode lab (lesson.json `aiCheck`). A lab that keeps
// the code editor labels it "Grade with AI"; a text-editor lab (editor: "text") labels it "Grade".
//
// The regex requirements stay the way a Run grades a lab. This is the second opinion for the
// labs where students write plain English, which is too varied for a pattern to judge: the
// student's file goes to /api/grade-written (rubric and prompt are read server-side by lesson
// id, like every other AI-graded part), and the verdict for each criterion replaces that
// requirement card's red or green. The criterion ids ARE the requirement ids.
//
// It is practice feedback in the browser, like the regex check beside it: nothing here is a
// score, and a lab that has `aiCheck` is not scored as a written assignment anywhere.

import type { GradeReport } from './grader';
import type { Requirement } from './types';

export interface AiCheckConfig {
  /** The file the student writes in. Defaults to README.md. */
  file?: string;
  /** Heading for the AI's own notes. */
  rubricTitle?: string;
  /** The grading brief. Read on the server from the generated config, not from the browser. */
  prompt: string;
  rubric: { id: string; title: string; description?: string; points: number }[];
}

export interface AiCheckCriterion {
  id: string;
  verdict?: string;
  feedback?: string;
}

export interface AiVerdict {
  passed: boolean;
  feedback: string;
}

export type AiVerdicts = Record<string, AiVerdict>;

/** Only a clear "met" turns a card green. "partial" and "missing" stay red, with the AI's note. */
export function verdictsFromCriteria(criteria: AiCheckCriterion[], knownIds: string[]): AiVerdicts {
  const known = new Set(knownIds);
  const out: AiVerdicts = {};
  for (const c of criteria) {
    if (!known.has(c.id)) continue;
    out[c.id] = { passed: c.verdict === 'met', feedback: (c.feedback ?? '').trim() };
  }
  return out;
}

/** Overlay the AI's verdicts on the cards. A card with no verdict keeps what it had. */
export function applyAiVerdicts(reqs: Requirement[], verdicts: AiVerdicts | null): Requirement[] {
  if (!verdicts) return reqs;
  return reqs.map((r) => {
    const v = verdicts[r.id];
    if (!v) return r;
    return {
      ...r,
      status: v.passed ? 'passed' : 'failed',
      messages: v.feedback ? [v.feedback] : [],
    };
  });
}

/** What Submit records for an aiCheck lab: the cards as the student sees them. */
export function reportFromRequirements(reqs: Requirement[]): GradeReport {
  const results = reqs.map((r) => ({
    id: r.id,
    title: r.title,
    status: (r.status === 'passed' ? 'passed' : 'failed') as 'passed' | 'failed',
    messages: r.messages ?? [],
    pointsEarned: 0,
    pointsPossible: 0,
  }));
  return {
    results,
    totalScore: 0,
    totalPossible: 0,
    passed: results.length > 0 && results.every((r) => r.status === 'passed'),
    passingScore: 0,
  };
}
