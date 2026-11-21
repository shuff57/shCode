// The fast half of Check on a lab whose cards carry decision questions (lesson.json `aiCheck.clef`, the field
// keeps its first model's name).
//
// The model is Microsoft decision-1.1 through CheaperInference (lib/decision-check-core.ts: request, band,
// answer reader). Cloudflare Clef, the first model here, is retired (2026-11-21) and nothing calls it. The model
// reads the student's code and one yes/no question per card and answers a probability per card. It decides a
// card only when it is sure either way; a card in between is "unsure" and the lab's own pattern check decides
// it, in the browser. Today's AI Check (gemma, /api/grade-written) is asked only about red cards, on demand
// ("Why?"), and only for the notes: its verdicts never change a card's colour.
//
// Every question is written for its card: questions built automatically from a card's wording were not good
// enough (5.1.20's cards say "in draw()" while update() runs every frame too).
//
// Pure: no fetch, no DOM. The server (functions/api/clef-check.ts) and the browser both import it.

import type { GradeReport } from './grader';
import type { AiVerdicts } from './ai-check';

/** A question is a sentence or a few: long enough to say what counts, short enough to stay one idea. */
export const QUESTION_MIN = 20;
export const QUESTION_MAX = 700;

/** lesson.json `aiCheck.clef`: one question per card, keyed by requirement id. */
export interface ClefAuthored {
  questions: Record<string, string>;
  /** What the student was asked to do. Absent: the aiCheck prompt up to "You cannot run their code". */
  task?: string;
}

/** What the server holds (functions/_shared/ai-graders.generated.ts), built by generate-ai-graders.mjs. */
export interface ClefConfig {
  task: string;
  kind: 'moshion' | 'console' | 'plan';
  questions: Record<string, string>;
}

/** Engine facts every question on that kind of lab relies on. Never lab-specific. */
export const CLEF_ABOUT: Record<ClefConfig['kind'], string> = {
  moshion:
    'This is a moSHion sketch (p5-style JavaScript): code at the top level and setup() run once when the sketch starts; update() and draw() run on every frame, about 60 times a second, update() first. A later assignment in the same frame overwrites an earlier one.',
  console: 'This is plain JavaScript run once in a console.',
  plan: 'This is a plan written in plain English or pseudocode, not code that runs. Judge what the steps say, however they are worded, numbered or capitalised; keywords are optional.',
};

export type ClefVerdict = 'met' | 'missing' | 'unsure';
export interface ClefCard { id: string; verdict: ClefVerdict; p: number | null }

/** The task line handed to the model: the authored one, else the aiCheck prompt's task part. */
export function clefTask(authored: ClefAuthored, aiCheckPrompt: string): string | null {
  if (authored.task && authored.task.trim()) return authored.task.trim();
  const cut = aiCheckPrompt.split(/You cannot run their code/)[0].trim();
  return cut && cut !== aiCheckPrompt.trim() ? cut : null;
}

/** What the model is told besides the questions: the engine facts, the task, and the code (the only part the request supplies). */
export function checkState(cfg: ClefConfig, code: string) {
  return { about: CLEF_ABOUT[cfg.kind], task: cfg.task, student_code: code };
}

/**
 * The cards' colours: the model where it is sure, the pattern check (`report`, lib/grader.ts grade() on the
 * same files) where it is not. A card the pattern check has no result for stays red.
 * `decidedBy` says which one decided each card, for the note and for measuring.
 */
export function resolveClefCards(cards: ClefCard[], report: GradeReport): { verdicts: AiVerdicts; decidedBy: Record<string, 'clef' | 'pattern'> } {
  const byId = new Map(report.results.map((r) => [r.id, r]));
  const verdicts: AiVerdicts = {};
  const decidedBy: Record<string, 'clef' | 'pattern'> = {};
  for (const c of cards) {
    if (c.verdict === 'unsure') {
      verdicts[c.id] = { passed: byId.get(c.id)?.status === 'passed', feedback: '' };
      decidedBy[c.id] = 'pattern';
    } else {
      verdicts[c.id] = { passed: c.verdict === 'met', feedback: '' };
      decidedBy[c.id] = 'clef';
    }
  }
  return { verdicts, decidedBy };
}

/**
 * The AI Check's notes laid onto the colours the model already set. A note is kept only where the AI's
 * verdict agrees with the card's colour: a "this is missing" note under a green card (or the
 * reverse) would contradict the card. Elsewhere a red card shows its authored hint (its description is
 * on the card already), a green one nothing. Colours never change here.
 */
export function mergeClefNotes(
  colours: AiVerdicts,
  ai: AiVerdicts,
  reqs: { id: string; hint?: string }[],
): AiVerdicts {
  // The card already shows its description, so only an authored hint adds anything.
  const hint = new Map(reqs.map((r) => [r.id, (r.hint ?? '').trim()]));
  const out: AiVerdicts = {};
  for (const [id, v] of Object.entries(colours)) {
    const a = ai[id];
    const agrees = a && a.passed === v.passed && a.feedback;
    out[id] = { passed: v.passed, feedback: agrees ? a.feedback : v.passed ? '' : hint.get(id) ?? '' };
  }
  return out;
}

/** Red cards with no note get their hint straight away, before the AI's notes arrive. */
export function withHints(colours: AiVerdicts, reqs: { id: string; hint?: string }[]): AiVerdicts {
  return mergeClefNotes(colours, {}, reqs);
}

/**
 * The notes request asks the AI only about the cards that ended red: a green card needs no advice,
 * and a shorter answer is faster and cheaper. The ids may only pick from the server's own rubric
 * (never add text to it); none that match means the whole rubric, as before.
 */
export function onlyCards<T extends { id: string }>(rubric: T[], onlyIds: unknown): T[] {
  if (!Array.isArray(onlyIds)) return rubric;
  const want = new Set(onlyIds.filter((x): x is string => typeof x === 'string'));
  const subset = rubric.filter((r) => want.has(r.id));
  return subset.length ? subset : rubric;
}

/** The cards that need a note: the red ones. None red = no notes request at all. */
export function redIds(colours: AiVerdicts): string[] {
  return Object.entries(colours).filter(([, v]) => !v.passed).map(([id]) => id);
}
