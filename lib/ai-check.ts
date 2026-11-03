// The Grade button on a plain-English-to-pseudocode lab (lesson.json `aiCheck`). A lab that keeps
// the code editor labels it "Check"; a text-editor lab (editor: "text") labels it "Check".
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
  /** Other files the same check reads (a lab graded on its script and its README). They are sent after
   *  `file`, each under a "----- name -----" line, and the prompt says so. */
  alsoFiles?: string[];
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

/** The text the AI reads, and the text the cards' AI marks belong to: the main file, then any others. */
export function aiCheckText(config: Pick<AiCheckConfig, 'file' | 'alsoFiles'>, files: Record<string, string>): string {
  const main = files[config.file ?? 'README.md'] ?? '';
  const more = (config.alsoFiles ?? []).map((f) => `\n\n----- ${f} -----\n${files[f] ?? ''}`);
  return main + more.join('');
}

/**
 * When the AI cannot answer, the pattern check marks the cards instead, and it must grade through
 * the same runner a plain Run of that lab uses: a text lab has nothing to run (grade the file), a
 * moSHion sketch runs in the moSHion runner, anything else in the console runner. The console runner
 * on a moSHion sketch reports `Canvas is not defined` for top-level sprite code, which raised a
 * bogus run error and locked Submit.
 */
export type FallbackRunner = 'grade' | 'moshion' | 'console';
export function fallbackRunner(lesson: { editor?: string; preview?: string }): FallbackRunner {
  if (lesson.editor === 'text') return 'grade';
  if (lesson.preview === 'moshion') return 'moshion';
  return 'console';
}

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

/**
 * What Submit records for an aiCheck lab: the cards as the student sees them. A card carries
 * the points the regex check gave it, so a scored lab keeps its score when the AI's verdicts
 * replace the pattern check's; a lab whose cards are worth nothing is "passed" when every card
 * is green, as before.
 */
export function reportFromRequirements(reqs: Requirement[], passingScore = 0): GradeReport {
  const results = reqs.map((r) => {
    const status = (r.status === 'passed' ? 'passed' : 'failed') as 'passed' | 'failed';
    const possible = r.points ?? 0;
    return {
      id: r.id,
      title: r.title,
      status,
      messages: r.messages ?? [],
      pointsEarned: status === 'passed' ? possible : 0,
      pointsPossible: possible,
    };
  });
  const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPossible = results.reduce((sum, r) => sum + r.pointsPossible, 0);
  return {
    results,
    totalScore,
    totalPossible,
    passed: totalPossible > 0 ? totalScore >= passingScore : results.length > 0 && results.every((r) => r.status === 'passed'),
    passingScore,
  };
}
