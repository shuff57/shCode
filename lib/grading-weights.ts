// Grade-category weighting: the curriculum's GRADING STRUCTURE table
// (curriculum-plan.md, adopted 2026-09-23) made real. Isomorphic -- no
// 'use client', no D1 -- so it's shared verbatim between the Pages
// Functions that read/write class_grading_weights and the client code that
// turns a lesson's completion into a grade-weighted percentage.
//
// A lesson does not carry a category field -- lesson.json only has `type`
// ('lesson'|'assignment'|'project'|'example'|'challenge'), which cannot tell
// a quiz apart from a lab apart from a chapter test (all three are commonly
// `type: "assignment"`). `lessonGradeCategory` below derives the category
// instead, from signals that already exist: module id (parsed off the
// numbered title, same as parseNumberedId in LessonSearchFilter.tsx),
// preview, scoreKind and assignmentCode.

export type GradeCategory =
  | 'lab'
  | 'group'
  | 'chapterTest'
  | 'finalExam'
  | 'q1'
  | 'q2'
  | 'q4';

export const GRADE_CATEGORIES: GradeCategory[] = [
  'lab',
  'group',
  'chapterTest',
  'finalExam',
  'q1',
  'q2',
  'q4',
];

export const CATEGORY_LABEL: Record<GradeCategory, string> = {
  lab: 'Regular submodules',
  group: 'Group Performance Assessments',
  chapterTest: 'Individual Chapter Tests',
  finalExam: 'Final Exams',
  q1: 'Q1 Synthesis',
  q2: 'Q2 Synthesis',
  q4: 'Q4 Synthesis',
};

// COARSE GRADE (User decision 2026-10-09, explicit): the course grade is built
// from SUBMODULES, not from individual lessons. Every graded lesson counts the
// same inside its submodule; a submodule's grade is the mean of those; submodules
// of the same ROLE count the same; and each role carries one weight. A role with
// no counted submodule yet drops out and the rest renormalize (same as Aeries'
// category math over 100-point assignments, which is what keeps the two equal).
//
// Roles reuse the category keys so stored class_grading_weights rows still
// apply: 'lab' is the regular submodules, 'chapterTest' the individual
// assessments, 'group' the group assessments, 'finalExam' and q1/q2/q4 as before.
// Quizzes and written work are NOT roles: they are lessons inside a regular
// submodule and count the same as the labs there. A stored class_grading_weights
// row for the retired 'written' or 'quiz' categories is simply ignored.
// Sums to 100 over the roles that exist today.
export const DEFAULT_WEIGHTS: Record<GradeCategory, number> = {
  lab: 40,
  group: 10,
  chapterTest: 25,
  finalExam: 10,
  q1: 10,
  q2: 10,
  q4: 10,
};

// Individual Chapter Tests authored so far -- only 3 of the planned 8
// (chapters 4-8 have none yet). Q4 Synthesis (13.1-13.3) and Final Exams
// have zero lessons at all. weightedGradePercent()'s renormalization is
// what keeps an empty category from being a permanent drag on every grade.
const CHAPTER_TEST_MODULES = new Set(['1.7', '2.7', '3.10']);
// Group Performance Assessments (Part 3 "Demo It" etc.): their own role.
const GROUP_MODULES = new Set(['1.6', '2.6', '3.9']);
const Q1_MODULE = '4.1';
const Q2_MODULE = '7.1';
const Q4_MODULES = new Set(['13.1', '13.2', '13.3']);

export function moduleIdFromTitle(title: string): string | null {
  const m = /^(\d+\.\d+)\.\d+/.exec(title);
  return m ? m[1] : null;
}

export interface CategorizableLesson {
  title: string;
  preview?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
  assignmentCode?: string | null;
}

// Module id wins over preview/scoreKind/assignmentCode: a chapter test's own
// parts still carry preview:"quiz" or an aiGrader on some parts, and the Q1
// design chart (A4.1.0) still carries an assignmentCode -- checking those
// first would misclassify them as plain Quiz/Written/Lab instead of the
// test/synthesis they're actually part of.
export function lessonGradeCategory(l: CategorizableLesson): GradeCategory | null {
  const moduleId = moduleIdFromTitle(l.title);
  if (moduleId === Q1_MODULE) return 'q1';
  if (moduleId === Q2_MODULE) return 'q2';
  if (moduleId && Q4_MODULES.has(moduleId)) return 'q4';
  if (moduleId && CHAPTER_TEST_MODULES.has(moduleId)) return 'chapterTest';
  if (moduleId && GROUP_MODULES.has(moduleId)) return 'group';
  // A quiz, a written rubric or a coded lab is a lesson inside a regular
  // submodule. Whether it is GRADED is what this decides; the kind no longer
  // picks a weight.
  if (l.preview === 'quiz' || l.scoreKind === 'written' || l.assignmentCode) return 'lab';
  return null; // a reading/example/slide -- formative, not part of the grade
}

export interface CoarseItem {
  category: GradeCategory | null;
  percent: number;
  /** The submodule this lesson belongs to ("1.1"). Items without one each count as their own submodule. */
  moduleId?: string | null;
}

export interface CoarseRole {
  role: GradeCategory;
  /** 0-100, mean of the role's submodule grades. */
  percent: number;
  /** Submodules counted in this role. */
  modules: number;
}

/**
 * The coarse course grade. Mean of lessons per submodule, mean of submodules per
 * role, weighted mean of roles renormalized over the roles present. A role whose
 * weight is 0 is ignored. Falls back to a flat average when nothing is
 * categorised, exactly as before.
 */
export function coarseGrade(
  items: CoarseItem[],
  weights: Record<GradeCategory, number>,
): { percent: number; roles: CoarseRole[] } {
  const moduleBuckets = new Map<string, { role: GradeCategory; percents: number[] }>();
  let anon = 0;
  let categorised = 0;
  for (const { category, percent, moduleId } of items) {
    if (category == null) continue;
    categorised += 1;
    const key = moduleId ? `${category}:${moduleId}` : `${category}:#${anon++}`;
    let b = moduleBuckets.get(key);
    if (!b) moduleBuckets.set(key, (b = { role: category, percents: [] }));
    b.percents.push(percent);
  }
  if (categorised === 0) {
    if (items.length === 0) return { percent: 0, roles: [] };
    return { percent: Math.round(items.reduce((sum, i) => sum + i.percent, 0) / items.length), roles: [] };
  }

  const byRole = new Map<GradeCategory, number[]>();
  for (const { role, percents } of moduleBuckets.values()) {
    const mean = percents.reduce((sum, p) => sum + p, 0) / percents.length;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(mean);
  }

  const roles: CoarseRole[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  for (const category of GRADE_CATEGORIES) {
    const means = byRole.get(category);
    if (!means) continue;
    const avg = means.reduce((sum, p) => sum + p, 0) / means.length;
    roles.push({ role: category, percent: Math.round(avg), modules: means.length });
    const w = weights[category] ?? 0;
    if (w <= 0) continue;
    weightedSum += avg * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return { percent: 0, roles };
  return { percent: Math.round(weightedSum / totalWeight), roles };
}

export function weightedGradePercent(items: CoarseItem[], weights: Record<GradeCategory, number>): number {
  return coarseGrade(items, weights).percent;
}

// One lesson's completion as a 0-100 percent. Isomorphic, so the student's
// own badge (lib/progress.ts re-exports this) and the teacher's per-student
// view compute the identical number.
//
// `score` is RAW POINTS, not a percent: QuizView writes correctCount and
// WrittenGrader writes totalEarned into lesson_state.score (see those
// components). maxScore is the question count / rubric total from the
// lessons manifest, so the fraction is score/maxScore.
//
// A completed lesson with no score -- a summative quiz whose key is stripped
// client-side, or a pass/fail rubric -- reads as 100: green-to-advance
// pending a teacher's mark.
//
// A score only counts once the lesson is completed. An unfinished lesson is 0
// no matter what is in the score column -- that column records a finished,
// graded submission, and crediting it early would show a grade for work not
// handed in. (Unreachable today: every writer sets state='completed' with a
// score. Locked anyway so a future writer cannot quietly make an in-progress
// lesson count toward a grade.)
export function lessonPercent(
  state: 'started' | 'completed' | undefined | null,
  score: number | undefined | null,
  maxScore: number | null | undefined,
): number {
  if (state !== 'completed') return 0;
  if (maxScore != null && maxScore > 0 && score != null) {
    return Math.round(Math.min(1, Math.max(0, score / maxScore)) * 100);
  }
  return 100;
}
