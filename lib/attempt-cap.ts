// Counts a student's attempts at a capped item, out of the server's own rows.
//
// WHY THIS EXISTS. `summative` capped nothing. WrittenGrader decided "already
// submitted" from localStorage, so clearing site data, switching browser or
// opening a second device handed back an unlocked Submit on a one-shot
// assessment -- the lock that a6006dd5 added a server call to fix, on a
// different surface. An attempt cap counted from the browser is a speed bump.
// `GET /api/lesson-submissions?lessonId=` is already per-student and already
// carries `submitted_at` and `grade_json`, so the count has a server-side
// source and needs no new endpoint.
//
// TWO RULES HERE, both deliberate.
//
// 1. A row written because GRADING FAILED does not spend an attempt.
//    WrittenGrader records one when the grader is unreachable or answers
//    non-JSON, carrying `gradingFailed: true` and NULL score/possible so the
//    work still reaches the teacher. Counting those would spend a student's
//    attempts on our outage, which is the same class of bug as the first one.
//
// 2. Rows written before ATTEMPT_CAPS_APPLIED are not counted. The Chapter 2
//    individual test opened 2026-09-30 00:00 and students sat it on the day the
//    cap was decided. There is no way to un-submit an attempt someone already
//    made, so those attempts are grandfathered: they keep what they had, and
//    the cap applies from here on. Moving this constant confiscates attempts
//    retroactively -- do not, without a decision recorded here.

/**
 * Epoch ms of 2026-09-30T21:49Z, when the Chapter 2 attempt caps were built.
 * Attempts recorded at or after this instant count toward `maxSubmissions`.
 */
export const ATTEMPT_CAPS_APPLIED = 1790804940000;

/**
 * Epoch ms when three tries on every Performance Assessment part went live
 * (.gauntlet/SPEC-attempt-caps.md). Attempts before it are free, so every
 * student starts with a full set of tries on a part that is capped from here,
 * including Chapter 1 and 2 parts they already sat once. Phase 5 sets this to
 * the deploy instant; until then it is the instant the mechanism was written,
 * which is what a local test run needs. Never move it earlier than a deploy
 * that students have already used: that confiscates tries.
 */
export const TRIES_APPLIED = 1791065875120;

/** The instant from which attempts count: the later of the two cutoffs. */
export const COUNT_SINCE = Math.max(ATTEMPT_CAPS_APPLIED, TRIES_APPLIED);

/** The columns `countAttempts` needs. `SubmissionRecord` satisfies it. */
export interface AttemptRow {
  submittedAt: number;
  gradeJson: unknown | null;
}

function wasGradingFailure(gradeJson: unknown): boolean {
  return (
    !!gradeJson &&
    typeof gradeJson === 'object' &&
    (gradeJson as { gradingFailed?: unknown }).gradingFailed === true
  );
}

/**
 * How many attempts this student has spent at the item since the cap applied.
 * A `gradingFailed` row and anything predating the cap are both free.
 */
export function countAttempts(
  rows: AttemptRow[],
  since: number = COUNT_SINCE,
): number {
  return rows.filter(
    (r) =>
      typeof r?.submittedAt === 'number' &&
      r.submittedAt >= since &&
      !wasGradingFailure(r.gradeJson),
  ).length;
}

/**
 * What the reveal gate decides, as one pure function so the Pages Function and
 * the local dev stub cannot disagree. `cap` is the part's maxSubmissions
 * (undefined = not capped, so nothing to reveal).
 */
export type RevealDecision = 'not-capped' | 'no-solution' | 'locked' | 'open';

export function decideReveal(
  cap: number | undefined,
  used: number,
  hasSolution: boolean,
): RevealDecision {
  if (typeof cap !== 'number') return 'not-capped';
  if (!hasSolution) return 'no-solution';
  return used >= cap ? 'open' : 'locked';
}
