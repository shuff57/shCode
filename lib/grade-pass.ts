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

interface PassCriterion {
  verdict: 'met' | 'partial' | 'missing';
  source?: string;
}

/**
 * A pointed rubric passes at 70%, except a hybrid flowchart (some criteria scored by rules, source
 * 'rules'): there the rules alone can earn exactly 70%, which would leave the wording points unable to
 * fail anyone. Measured on 38 real chart drafts, 2026-10-07: 37 scored 14/14 on the rules, six of them
 * with junk labels. At 80% a chart needs real wording for 2 of the 6 AI points.
 */
export const HYBRID_PASS_FRACTION = 0.8;
export function passFraction(criteria: ReadonlyArray<{ source?: string }> | null | undefined): number {
  return Array.isArray(criteria) && criteria.some((c) => c && c.source === 'rules') ? HYBRID_PASS_FRACTION : 0.7;
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
  return r.totalEarned / r.totalPossible >= passFraction(r.criteria);
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
    if (score === null) return null;
    return score / possible >= (gradeJson && gradeJson.includes('"source":"rules"') ? HYBRID_PASS_FRACTION : 0.7);
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

/**
 * A pass/fail rubric's score as a number: each criterion met counts 1, partial 0.5,
 * missing 0, out of `criteria.length`.
 *
 * WHY. A 0-point rubric stores `totalEarned = 0` whatever the verdicts say, so a
 * completed part with that score and a NULL maxScore reads as 100% in lessonPercent()
 * -- three junk answers on a group demo graded full marks. Counting the verdicts gives
 * the part a real fraction: the manifest's maxScore for such a part is the number of
 * criteria (scripts/generate-lessons-manifest.mjs, app/page.tsx). Partial is half so a
 * half-covered paper is not graded as a pass-and-a-bit; the separate pass rule above
 * (ceil(n/2) criteria met or partial) is unchanged and still decides "struggling".
 */
export function criteriaScore(criteria: ReadonlyArray<{ verdict: string }> | null | undefined): number {
  if (!Array.isArray(criteria)) return 0;
  let n = 0;
  for (const c of criteria) {
    if (c && c.verdict === 'met') n += 1;
    else if (c && c.verdict === 'partial') n += 0.5;
  }
  return n;
}

/** Does a rubric carry no points at all (a pass/fail rubric)? */
export function isPassFailRubric(rubric: ReadonlyArray<{ points?: number }> | null | undefined): boolean {
  return Array.isArray(rubric) && rubric.length > 0 && rubric.every((r) => !(typeof r?.points === 'number' && r.points > 0));
}
