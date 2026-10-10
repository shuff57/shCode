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
  coarseGrade,
  DEFAULT_WEIGHTS,
  GRADE_CATEGORIES,
  type GradeCategory,
} from '../../lib/grading-weights';
import { resolveDueAt, type DueIndex } from '../../lib/due-dates-core';
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
  /** 0-100, renormalized across whatever categories have counted lessons. 0 when `counted` is 0. */
  percent: number;
  categories: CategoryBreakdown[];
  /** Every graded lesson in the course: the denominator of "X of Y done". */
  gradedTotal: number;
  /** Graded lessons the student has completed. */
  doneCount: number;
  /** Lessons that feed `percent`: completed ones plus past-due ones not done. */
  counted: number;
  /** Past due, not done, not waived: each is a 0 inside `percent`. */
  missingCount: number;
  /** The lesson ids behind `missingCount`, so a teacher's drawer can list lessons the student never opened. */
  missingIds: string[];
}

/** What makes a lesson count as "due so far" for one student in one class. */
export interface GradeDue {
  /** This class's due dates (lesson over module over unit), from loadClassDueRows. */
  index: DueIndex;
  /** Lessons whose due date is waived for this student in this class. */
  waived: ReadonlySet<string>;
  /** The instant "so far" is measured at (server clock). */
  now: number;
}

interface StateRow {
  lesson_id: string;
  state: 'started' | 'completed';
  score: number | null;
}



/**
 * The grade SO FAR, for one student in one class: what they have done, plus
 * what was due and is still not done. A lesson counts when it is completed
 * (at its percent) or when this class's due date for it has passed and the
 * student has not finished it and the date is not waived (a 0, a missing
 * assignment). A lesson that is not due yet, has no due date, or is waived
 * and unfinished is left out of both the numerator and the denominator, so a
 * student who is up to date reads 100% rather than being held down by the
 * rest of the course. `gradedTotal` / `doneCount` carry the other half, so a
 * screen can say "12 of 80 graded lessons done" beside the percent and nobody
 * mistakes "so far" for "whole course".
 *
 * Only lessons the classifier recognises count: a reading or an example
 * carries no grade weight and is excluded entirely.
 */
export function studentGrading(
  scopeMap: Map<string, LessonScope> | null,
  states: StateRow[],
  weights: Weights,
  due: GradeDue,
): StudentGrading {
  if (!scopeMap) return { percent: 0, categories: [], gradedTotal: 0, doneCount: 0, counted: 0, missingCount: 0, missingIds: [] };

  const stateByLesson = new Map<string, StateRow>();
  for (const s of states) stateByLesson.set(s.lesson_id, s);

  // Collect every lesson that counts (done, or past due and not done), with its
  // submodule, then let coarseGrade() roll it up: lessons -> submodule -> role.
  const items: Array<{ category: GradeCategory; percent: number; moduleId: string | null }> = [];
  const doneByRole = new Map<GradeCategory, number>();
  const countedByRole = new Map<GradeCategory, number>();
  let gradedTotal = 0;
  let doneCount = 0;
  let missingCount = 0;
  const missingIds: string[] = [];
  for (const [lessonId, scope] of scopeMap) {
    const category = lessonGradeCategory({
      title: scope.title,
      preview: scope.preview,
      scoreKind: scope.scoreKind,
      assignmentCode: scope.assignmentCode,
    });
    if (category == null) continue; // reading/example -- not graded

    gradedTotal += 1;
    const state = stateByLesson.get(lessonId);
    const isDone = state?.state === 'completed';
    if (isDone) doneCount += 1;
    let counts = isDone;
    if (!isDone && !due.waived.has(lessonId)) {
      const dueAt = resolveDueAt(due.index, { lessonId, moduleId: scope.moduleId, unitId: scope.unitId });
      if (dueAt !== null && dueAt <= due.now) {
        counts = true;
        missingCount += 1;
        missingIds.push(lessonId);
      }
    }
    if (!counts) continue;
    items.push({
      category,
      percent: lessonPercent(state?.state, state?.score, scope.maxScore),
      moduleId: scope.moduleId ?? null,
    });
    const role = coarseGrade([{ category, percent: 0 }], weights).roles[0]?.role ?? category;
    countedByRole.set(role, (countedByRole.get(role) ?? 0) + 1);
    if (isDone) doneByRole.set(role, (doneByRole.get(role) ?? 0) + 1);
  }

  const coarse = coarseGrade(items, weights);
  const categories: CategoryBreakdown[] = coarse.roles.map((r) => ({
    category: r.role,
    label: CATEGORY_LABEL[r.role],
    weight: weights[r.role],
    percent: r.percent,
    done: doneByRole.get(r.role) ?? 0,
    total: countedByRole.get(r.role) ?? 0,
  }));

  return {
    percent: items.length === 0 ? 0 : coarse.percent,
    categories,
    gradedTotal,
    doneCount,
    counted: items.length,
    missingCount,
    missingIds,
  };
}