// Server-side per-student grade weighting. The Pages Functions twin of what
// the student's own home-page badge computes in the browser: same classifier,
// same weights, same percent rule (all from lib/grading-weights.ts), so a
// teacher's roster and the student's own home page cannot disagree.
//
// Why this exists rather than reusing the client component: a Function cannot
// import UnitProgressBadge (it is 'use client'), and the teacher sees MANY
// students at once, so computing this per student in the browser would mean
// shipping the whole lesson manifest and every student's state rows anyway.
// One pass over rows the Function already has is cheaper and keeps the two
// sides on one implementation.

import {
  CATEGORY_LABEL,
  lessonGradeCategory,
  lessonPercent,
  weightedGradePercent,
  DEFAULT_WEIGHTS,
  GRADE_CATEGORIES,
  type GradeCategory,
} from '../../lib/grading-weights';
import type { LessonScope } from './dueDates';

export type Weights = Record<GradeCategory, number>;

interface WeightRow {
  category: string;
  weight: number;
}

/** One class's weights, defaults filled in for every category it never set. */
export async function loadClassWeights(db: D1Database, classId: string): Promise<Weights> {
  const result = await db
    .prepare('SELECT category, weight FROM class_grading_weights WHERE class_id = ?')
    .bind(classId)
    .all<WeightRow>();
  const weights: Weights = { ...DEFAULT_WEIGHTS };
  for (const row of result.results ?? []) {
    if ((GRADE_CATEGORIES as string[]).includes(row.category)) {
      weights[row.category as GradeCategory] = row.weight;
    }
  }
  return weights;
}

export interface CategoryBreakdown {
  category: GradeCategory;
  label: string;
  /** This class's weight for the category, in percentage points. */
  weight: number;
  /** 0-100, the mean percent across lessons in this category that have state. */
  percent: number;
  done: number;
  total: number;
}

export interface StudentGrading {
  /** 0-100, renormalized across whatever categories have lessons. */
  percent: number;
  categories: CategoryBreakdown[];
}

interface StateRow {
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
}



/**
 * A class is graded over the same fixed course, so "every lesson in the
 * course" is the right denominator for one student's grade -- not just the
 * lessons they happened to touch. A student who has done nothing scores 0,
 * which is the honest reading and what the roster needs to show.
 *
 * Only lessons the classifier recognises count: a reading or an example
 * carries no grade weight and is excluded from both the numerator and the
 * denominator (it is in neither category bucket).
 */
export function studentGrading(
  scopeMap: Map<string, LessonScope> | null,
  states: StateRow[],
  weights: Weights,
): StudentGrading {
  if (!scopeMap) return { percent: 0, categories: [] };

  const stateByLesson = new Map<string, StateRow>();
  for (const s of states) stateByLesson.set(s.lesson_id, s);

  // Group course lessons by category, once, then read this student's state.
  const grouped = new Map<GradeCategory, { percents: number[]; done: number }>();
  for (const [lessonId, scope] of scopeMap) {
    const category = lessonGradeCategory({
      title: scope.title,
      preview: scope.preview,
      scoreKind: scope.scoreKind,
      assignmentCode: scope.assignmentCode,
    });
    if (category == null) continue; // reading/example -- not graded

    const state = stateByLesson.get(lessonId);
    let bucket = grouped.get(category);
    if (!bucket) {
      bucket = { percents: [], done: 0 };
      grouped.set(category, bucket);
    }
    bucket.percents.push(lessonPercent(state?.state, state?.score, scope.maxScore));
    if (state?.state === 'completed') bucket.done += 1;
  }

  const items: Array<{ category: GradeCategory; percent: number }> = [];
  const categories: CategoryBreakdown[] = [];
  for (const category of GRADE_CATEGORIES) {
    const bucket = grouped.get(category);
    if (!bucket) continue;
    const avg = Math.round(bucket.percents.reduce((s, p) => s + p, 0) / bucket.percents.length);
    categories.push({
      category,
      label: CATEGORY_LABEL[category],
      weight: weights[category],
      percent: avg,
      done: bucket.done,
      total: bucket.percents.length,
    });
    for (const p of bucket.percents) items.push({ category, percent: p });
  }

  return { percent: weightedGradePercent(items, weights), categories };
}