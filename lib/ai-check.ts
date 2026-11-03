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

/**
 * Whether the latest run lets Submit through. It must have reported back and not have thrown.
 *
 * A moSHion run reports from its frame some time after Run (public/moshion/runner.html: an error,
 * or `preview-status` once its first frame ran clean), and a cold load can take seconds. Check's
 * pattern fallback re-runs the sketch and marks the cards 400 ms later, so a sketch that throws
 * showed four green cards and an enabled Submit until its error arrived (5.1.25 with
 * `world.origin = 'math'` after the sprite, 2026-11-03). `pending` is that gap. A sketch that only
 * failed to GRADE (the AI unreachable) still submits once its run comes up clean.
 * `expectsRuntimeError` (Grading.expectsRuntimeError) accepts the error, never the gap.
 */
export function runLetsSubmit(run: { error: string | null; pending: boolean }, expectsRuntimeError = false): boolean {
  if (run.pending) return false;
  return !run.error || expectsRuntimeError;
}

/**
 * A moSHion lab's Submit gate: green cards AND a clean Run of the SAME code (owner decision,
 * 2026-11-03). Check's AI path reads the text and never runs it, so cards alone let a sketch with
 * `nope();` as the first line of setup() submit without a frame ever mounting (5.1 walk, round 2).
 *
 * `MoshionRun` is what the lab knows about its latest Run. `text` is the script.js text that run
 * started with, compared EXACTLY with the editor: any edit, whitespace included, needs a new Run.
 * (A newline can change what JavaScript does, through automatic semicolons, and the AI's marks
 * already go stale on the same exact-text rule.) The frame reports through `moshionRunStep`:
 * `came-up` once its first frame ran clean, `error` for a throw at ANY point, so a late error (a
 * throw at frame 120, or from a timer) re-locks Submit at once and keeps it locked after Stop.
 */
export interface MoshionRun {
  /** The script.js text the latest Run started with; null before the first Run (and after Reset). */
  text: string | null;
  /** Started, and its frame has not reported yet. */
  pending: boolean;
  /** Its first frame ran with no error. */
  clean: boolean;
  /** It threw, at boot or any later frame. */
  errored: boolean;
}
export const NO_MOSHION_RUN: MoshionRun = { text: null, pending: false, clean: false, errored: false };

export type MoshionRunEvent =
  | { type: 'run'; text: string }
  | { type: 'came-up' }
  | { type: 'error' }
  | { type: 'stop' };

export function moshionRunStep(run: MoshionRun, ev: MoshionRunEvent): MoshionRun {
  switch (ev.type) {
    case 'run':
      return { text: ev.text, pending: true, clean: false, errored: false };
    case 'came-up':
      // A frame that threw never says it came up (runner.html); this guards the order anyway.
      return run.errored ? run : { ...run, pending: false, clean: true };
    case 'error':
      return { ...run, pending: false, clean: false, errored: true };
    case 'stop':
      // A clean run stays clean and a crash stays a crash; a run stopped before its frame
      // reported never came up, so it does not count.
      return { ...run, pending: false };
    default:
      return run;
  }
}

/** What stands between this code and Submit on the run side. null = the run is good. */
export type MoshionRunNeed = 'run' | 'rerun' | 'wait' | 'fix' | null;

export function moshionRunNeed(run: MoshionRun, currentText: string, expectsRuntimeError = false): MoshionRunNeed {
  if (run.text === null) return 'run';
  if (run.text !== currentText) return 'rerun';
  if (run.pending) return 'wait';
  if (run.errored) return expectsRuntimeError ? null : 'fix';
  return run.clean ? null : 'run';
}

export function canSubmitMoshion(s: { cardsOk: boolean; run: MoshionRun; currentText: string; expectsRuntimeError?: boolean }): boolean {
  return s.cardsOk && moshionRunNeed(s.run, s.currentText, s.expectsRuntimeError) === null;
}

/**
 * The words beside a shut Submit on a moSHion lab. `note` follows "Still needed (N) · " in the
 * header while cards are red; `line` stands in for that summary when every card is green but the
 * run is not; `title` is Submit's hover text. A run in flight gets no `line`: it resolves itself
 * in a moment, and a line that flashed on every Run would be noise.
 */
export function moshionSubmitWords(s: { need: MoshionRunNeed; cardsOk: boolean; aiCheck: boolean }): {
  note?: string;
  line?: string;
  title?: string;
} {
  const runBad = s.need === 'run' || s.need === 'rerun' || s.need === 'fix';
  const note = s.cardsOk
    ? undefined
    : s.aiCheck
      ? runBad ? 'press Run, then Check' : 'press Check to mark them'
      : runBad ? 'press Run to mark them' : undefined;
  const runWords: Record<'run' | 'rerun' | 'wait' | 'fix', string> = {
    run: 'Press Run so we can see your sketch work, then Submit.',
    rerun: 'You changed your code since the last Run. Press Run again, then Submit.',
    wait: 'Your sketch is starting. Submit turns on once it is running.',
    fix: 'Your last Run stopped with an error. Fix it, then press Run again.',
  };
  if (s.cardsOk) {
    if (!s.need) return {};
    return { line: s.need === 'wait' ? undefined : runWords[s.need], title: runWords[s.need] };
  }
  const title = s.need === 'fix'
    ? runWords.fix
    : runBad
      ? s.aiCheck
        ? 'Press Run, then Check. Submit turns on when this code has run with no error and every Quest card is green.'
        : 'Press Run. Submit turns on when this code has run with no error and every Quest card is green.'
      : s.aiCheck
        ? 'Press Check to mark the Quest cards. Submit turns on when every card is green.'
        : 'Submit turns on when every Quest card is green.';
  return { note, title };
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
