// Does a written-grader result count as passing?
//
// Deliberately its own module with NO imports. Every consumer needs it —
// the student's grader component, the teacher's gradebook and needs-attention
// endpoint — and the obvious home, lib/grade-written-core.ts, drags 70KB of
// lib/moshion-docs.ts along with it into anything that imports it.
//
// Two rubric styles are in use and the difference is not cosmetic. Almost
// every rubric in the course gives each criterion `points: 0` and grades
// pass/fail on the model's per-criterion verdict; a handful carry real point
// values. For the first kind `totalPossible` is 0, so ANY ratio test against
// it — `earned / possible`, `score < possible * 0.6` — is either NaN or
// trivially false, and a genuinely failing submission reads as fine.
//
// Directive: every consumer asking "is this student struggling?" comes
// through here. Do not compare the totals at the call site.

export interface PassCriterion {
  verdict: 'met' | 'partial' | 'missing';
}

export interface PassInput {
  totalEarned: number;
  totalPossible: number;
  criteria: PassCriterion[];
}

/** Pass/fail for a live grade result. */
export function isPassingGrade(r: PassInput): boolean {
  if (r.totalPossible === 0) {
    if (!r.criteria || r.criteria.length === 0) return false;
    const ok = r.criteria.filter((c) => c.verdict === 'met' || c.verdict === 'partial').length;
    return ok >= Math.ceil(r.criteria.length / 2);
  }
  return r.totalEarned / r.totalPossible >= 0.7;
}

/**
 * Same question asked of a stored `lesson_submissions` row.
 *
 * Returns null when the row cannot answer it — an ungraded outage row, or
 * grade_json that will not parse — so callers can tell "not passing" apart
 * from "no verdict available" instead of defaulting a broken row to fine.
 */
export function isPassingSubmission(
  score: number | null,
  possible: number | null,
  gradeJson: string | null,
): boolean | null {
  if (possible !== null && possible > 0) {
    return score === null ? null : score / possible >= 0.7;
  }
  if (!gradeJson) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(gradeJson);
  } catch {
    return null;
  }
  const criteria = (parsed as { criteria?: unknown })?.criteria;
  if (!Array.isArray(criteria) || criteria.length === 0) return null;
  return isPassingGrade({
    totalEarned: score ?? 0,
    totalPossible: 0,
    criteria: criteria as PassCriterion[],
  });
}
