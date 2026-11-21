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
// null = off: every rule behaves exactly as before v2. Go-live (CLAUDE.md "Grading v2" has the full list):
//   1. scripts/grading-v2-impact.mjs --switch <date>        read-only preview per class
//   2. scripts/stamp-grading-v2.mjs --set-now, commit
//   3. scripts/backfill-v2-plan-scores.mjs --emit-sql a.sql --until <now>; review; apply
//   4. npm run deploy
//   5. the backfill again with --until <the deploy's finish time>; apply (finished plans the old code scored 0)
// Do not move the stamp afterwards: an earlier instant would count practice students skipped before v2.
// Rollback: set it back to null and deploy; the backfilled plan scores read 100% under the old rule too.
export const GRADING_V2_FROM: number | null = 1795242681102; // 2026-11-21T06:31:21.102Z

/** Plans and text-box answers pass at this fraction of their cards (owner's decision 2026-11-18). */
export const V2_PASS_FRACTION = 0.7;

export const gradingV2On = (from: number | null = GRADING_V2_FROM): from is number => from !== null;
