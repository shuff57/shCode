// Grading for multiple-choice module quizzes. Pulled out of QuizView so the
// pass arithmetic has somewhere to be tested — see scripts/test-quiz.mjs.

import type { QuizQuestion } from './types';

const DEFAULT_PASS_PERCENT = 70;

/**
 * How many correct answers are needed to advance.
 * Ceiling, not rounding: 70% of 6 questions is 5, never 4.
 */
export function passThreshold(total: number, passPercent = DEFAULT_PASS_PERCENT): number {
  if (total <= 0) return 0;
  return Math.min(total, Math.ceil((total * passPercent) / 100));
}

/** -1/undefined answers count as wrong, not as errors — an unanswered quiz just fails. */
export function countCorrect(
  questions: QuizQuestion[],
  answers: Record<string, number>,
): number {
  return questions.filter((q) => answers[q.id] === q.answer).length;
}

/**
 * The questions whose answer differs from the one that was checked (ux2 S2). Changing one answer
 * after a Check clears that question's mark only; the others keep theirs until the next Check.
 * `checked` null = never checked, so nothing has changed "since".
 */
export function changedSinceCheck(
  questions: { id: string }[],
  answers: Record<string, number>,
  checked: Record<string, number> | null,
): string[] {
  if (!checked) return [];
  return questions.filter((q) => answers[q.id] !== checked[q.id]).map((q) => q.id);
}

/**
 * What a returning visit restores. Answers come back from wherever they were kept (this browser or
 * the server's draft). The marks and score ("checked") come back ONLY from the server's saved copy
 * for the signed-in account: this browser alone never produces "Passed N of M" or marked answers on
 * load, because on a shared computer it may hold another student's checked quiz (the answer key).
 * A local "checked" flag restores the answers, not the marks: one Check shows them again.
 */
export function restoreQuizState(
  stored: { answers?: Record<string, number>; graded?: boolean; checked?: Record<string, number> | null } | null,
  fromServer: boolean,
): { answers: Record<string, number>; checked: Record<string, number> | null } {
  const answers = stored?.answers && typeof stored.answers === 'object' ? stored.answers : {};
  if (!stored?.graded || !fromServer) return { answers, checked: null };
  const checked = stored.checked && typeof stored.checked === 'object' ? stored.checked : answers;
  return { answers, checked };
}
