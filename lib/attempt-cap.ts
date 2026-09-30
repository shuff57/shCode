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
  since: number = ATTEMPT_CAPS_APPLIED,
): number {
  return rows.filter(
    (r) =>
      typeof r?.submittedAt === 'number' &&
      r.submittedAt >= since &&
      !wasGradingFailure(r.gradeJson),
  ).length;
}
