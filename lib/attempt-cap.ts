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
 * (.gauntlet/SPEC-attempt-caps.md). Attempts before it are free: every student
 * starts with a FULL set of tries on a part that is capped from here.
 *
 * THIS RESETS THE TWO PARTS THAT WERE ALREADY CAPPED (2.7.2 and 2.7.5, capped
 * from ATTEMPT_CAPS_APPLIED) and gives every student a fresh 3 on Chapter 1 and 2
 * parts they already sat once -- up to six tries in total on 2.7.2 and 2.7.5 for
 * a student who spent three before. That is the owner's decision (spec
 * assumption 3, "attempts spent before go-live are free"), recorded here so it
 * is never mistaken for a bug. The best score they had stays on the record.
 *
 * Until deploy this is the instant the mechanism was written, which is what a
 * local test run needs. PHASE 5 MUST SET IT TO THE DEPLOY INSTANT (it is the
 * first item of `phase5_todo` in .gauntlet/attempt-caps-loop.json, and
 * scripts/test-attempt-reveal.mjs fails if it stops being a fixed literal).
 * Never move it earlier than a deploy students have already used: that
 * confiscates tries.
 */
export const TRIES_APPLIED = 1791125019914;

/**
 * Has the go-live instant above been set on purpose? FALSE until the human runs
 * `node scripts/stamp-tries-applied.mjs --set-now` once at go-live (it writes the real
 * instant into TRIES_APPLIED and flips this to true; commit the result). `npm run deploy`
 * runs `stamp-tries-applied.mjs --check` and refuses to ship while this is false, so a
 * deploy can no longer go out with the development-time placeholder above and silently
 * hand out (or confiscate) tries from the wrong instant.
 */
export const TRIES_GO_LIVE_STAMPED = true;

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
