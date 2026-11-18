// The manifest's score fields for one lesson.json (maxScore + scoreKind). One function so
// scripts/generate-lessons-manifest.mjs and scripts/test-grading.mjs measure the same rule.
// Mirrors app/page.tsx maxScoreFor()/scoreKindFor().
//
// grading.formative: a practice chart with a weighted rubric keeps its pass line in the grader
// but carries no score or category here, so it stays out of the course grade.
// v2 (lib/grading-v2.ts, passed in as `v2On`): a plan lab with no rubric of its own records its cards
// (met 1, partly met 0.5) out of the card count, so its maxScore is the card count and the gradebook
// keeps the score instead of reading every finished plan as 100%.
export function lessonScoreFields(meta, quizCount, v2On = false) {
  const rubric = meta.aiGrader?.rubric ?? meta.diagram?.aiGrader?.rubric;
  const rubricPoints = Array.isArray(rubric) ? rubric.reduce((sum, r) => sum + (r?.points ?? 0), 0) : 0;
  const passFailCount = Array.isArray(rubric) && rubric.length > 0 && rubricPoints === 0 ? rubric.length : null;
  if ((meta.grading?.formative === true || meta.grading?.completionCredit === true) && quizCount == null) return { maxScore: null, scoreKind: null };
  const planCards = v2On && meta.work?.kind === 'plan' && !Array.isArray(rubric) && Array.isArray(meta.requirements) && meta.requirements.length > 0
    ? meta.requirements.length : null;
  return {
    maxScore: quizCount ?? (rubricPoints > 0 ? rubricPoints : passFailCount ?? planCards),
    scoreKind: quizCount != null ? 'quiz' : rubricPoints > 0 ? 'written' : null,
  };
}
