// 3.9.1's editor strip: the eight blanks, as requirement cards.
//
// WHY NOT THE LESSON'S OWN `requirements`. Those four cards were written before
// the part became a skeleton, and they describe the whole plan ("at least four
// of the five jobs appear as named calls"). They cannot say "this blank holds
// the change call", so the strip read 0/4 next to feedback about eight blanks,
// and — worse — it never moved: a text lesson runs no requirement check on
// typing, so the four cards sat grey for the whole part.
//
// The gap grader already answers the question the strip is asking, and it is
// the same parser the teacher's blank check and the AI rubric describe. So the
// strip is computed from the text instead of from the authored cards, and a
// student sees the same eight lines before submitting that they are graded on
// after. The authored `requirements` stay in lesson.json: `check-starters`
// grades the reference and the starter against them, and they are the coarse
// "is this a plan at all" check the lesson was built with.

import type { Requirement } from './types';
import type { GradeReport } from './grader';
import { checkPlanGaps, PLAN_GAPS, PLAN_LESSONS } from './plan-check';

/** Is this a lesson whose strip is the blanks rather than its authored cards? */
export const isPlanLesson = (lessonId: string): boolean => PLAN_LESSONS.includes(lessonId);

/** The eight blanks as strip cards. A partial is NOT yet: it does not do the job. */
export function planRequirements(text: string): Requirement[] {
  const { criteria } = checkPlanGaps(text);
  return criteria.map((c) => {
    const spec = PLAN_GAPS.find((g) => g.id === c.id);
    const required = spec?.required === true;
    return {
      id: c.id,
      // The requirement card has no field for it, and a student should see which
      // two blanks cannot be left, so the title says so.
      title: required ? `${c.title} (required)` : c.title,
      description: spec?.wants ?? '',
      status: c.verdict === 'met' ? 'passed' : 'failed',
      messages:
        c.verdict === 'met'
          ? []
          : required
            ? [c.feedback, 'The plan cannot pass without this one.']
            : [c.feedback],
    } satisfies Requirement;
  });
}

/**
 * A GradeReport built from the same cards, for the call sites that want one.
 *
 * `passed` is the real verdict — six of eight AND the two required blanks — not
 * "every card green", so the strip's own count and the part's bar can differ
 * without lying: a plan at seven of eight with the change missing is not a pass.
 */
export function planGradeReport(text: string): GradeReport {
  const check = checkPlanGaps(text);
  const cards = planRequirements(text);
  return {
    results: cards.map((c, i) => ({
      id: c.id,
      title: c.title,
      status: c.status === 'passed' ? 'passed' : 'failed',
      messages: c.messages ?? [],
      pointsEarned: check.criteria[i]?.verdict === 'met' ? 1 : 0,
      pointsPossible: 1,
    })),
    totalScore: check.criteria.filter((c) => c.verdict === 'met').length,
    totalPossible: check.criteria.length,
    passed: check.passed,
    passingScore: 0,
  };
}
