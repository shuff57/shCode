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
  | 'written'
  | 'quiz'
  | 'chapterTest'
  | 'finalExam'
  | 'q1'
  | 'q2'
  | 'q4';

export const GRADE_CATEGORIES: GradeCategory[] = [
  'lab',
  'written',
  'quiz',
  'chapterTest',
  'finalExam',
  'q1',
  'q2',
  'q4',
];

export const CATEGORY_LABEL: Record<GradeCategory, string> = {
  lab: 'Weekly Lab Assignments',
  written: 'Written Assignments',
  quiz: 'Quizzes',
  chapterTest: 'Individual Chapter Tests',
  finalExam: 'Final Exams',
  q1: 'Q1 Synthesis',
  q2: 'Q2 Synthesis',
  q4: 'Q4 Synthesis',
};

// curriculum-plan.md GRADING STRUCTURE, adopted 2026-09-23. Sums to 100.
// A class with no class_grading_weights rows uses this untouched.
export const DEFAULT_WEIGHTS: Record<GradeCategory, number> = {
  lab: 30,
  written: 10,
  quiz: 5,
  chapterTest: 15,
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
const Q1_MODULE = '4.1';
const Q2_MODULE = '7.1';
const Q4_MODULES = new Set(['13.1', '13.2', '13.3']);

function moduleIdFromTitle(title: string): string | null {
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
  if (l.preview === 'quiz') return 'quiz';
  if (l.scoreKind === 'written') return 'written';
  if (l.assignmentCode) return 'lab';
  return null; // a reading/example/slide -- formative, not part of the grade
}

// Weighted average across whatever categories are actually present in
// `items`, renormalized so a category with nothing in it yet (Final Exams,
// Q4 Synthesis, 5 of the 8 chapter tests) doesn't drag the percentage down
// before there's anything there to grade -- confirmed 2026-09-23: "these are
// the weights for the grade, so if its empty shouldnt affect the grade
// until there is something." Falls back to a flat average when NOTHING in
// the group carries a category (a reading-only module).
export function weightedGradePercent(
  items: Array<{ category: GradeCategory | null; percent: number }>,
  weights: Record<GradeCategory, number>,
): number {
  const byCategory = new Map<GradeCategory, number[]>();
  for (const { category, percent } of items) {
    if (category == null) continue;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(percent);
  }

  if (byCategory.size === 0) {
    if (items.length === 0) return 0;
    return Math.round(items.reduce((sum, i) => sum + i.percent, 0) / items.length);
  }

  let totalWeight = 0;
  let weightedSum = 0;
  for (const [category, percents] of byCategory) {
    const w = weights[category] ?? 0;
    if (w <= 0) continue;
    const avg = percents.reduce((sum, p) => sum + p, 0) / percents.length;
    weightedSum += avg * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}
