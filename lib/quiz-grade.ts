// Grading for multiple-choice module quizzes. Pulled out of QuizView so the
// pass arithmetic has somewhere to be tested — see scripts/test-quiz.mjs.

import type { QuizQuestion } from './types';

export const DEFAULT_PASS_PERCENT = 70;

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
