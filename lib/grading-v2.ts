// Grading v2 (owner's decisions 2026-11-18), held behind ONE switch so the code can ship before the rules do.
//
//   - Everything a student makes is graded (lesson.json `work.graded`, lib/lesson-work.ts), not only
//     the lessons with an assignmentCode, a quiz or a points rubric. 342 lessons join the grade.
//   - Code and model labs pass with every card green (unchanged). Plans and text-box answers pass at
//     70% or better, a partly met card counting half, and the gradebook keeps the score.
//   - Practice a student had already skipped is not held against them: a lesson that is graded only
//     because of v2, whose due date passed before the switch, and that the student has not finished,
//     is left out of their grade (newlyGraded + countsAsMissing). Finishing it later still counts.
//
// null = off: every rule behaves exactly as before v2. Turn it on at go-live with
//   node --import ./scripts/register-ts.mjs scripts/stamp-grading-v2.mjs --set-now
// then commit, run the plan-score backfill it prints, and deploy. Do not move it afterwards: an
// earlier instant would start counting practice that students skipped before the rules existed.
export const GRADING_V2_FROM: number | null = null;

/** Plans and text-box answers pass at this fraction of their cards (owner's decision 2026-11-18). */
export const V2_PASS_FRACTION = 0.7;

export const gradingV2On = (from: number | null = GRADING_V2_FROM): from is number => from !== null;
