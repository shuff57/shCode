// Server-side attempt counting and quiz scoring for capped performance-assessment
// parts (.gauntlet/SPEC-attempt-caps.md). One place, so attempt-reveal,
// quiz-reveal and lesson-submissions cannot count differently.
//
// The count is the same rule the browser applies (lib/attempt-cap.ts): rows since
// COUNT_SINCE, minus any row written because grading FAILED. It is read from
// lesson_submissions for the SESSION's email, never from anything the client sent.

import { countAttempts, COUNT_SINCE } from '../../lib/attempt-cap';
import type { QuizKey } from './quiz-keys.generated';

interface AttemptDb {
  prepare(sql: string): {
    bind(...args: unknown[]): { all<T>(): Promise<{ results?: T[] }> };
  };
}

export interface SubmissionRow {
  grade_json: string | null;
  submitted_at: number;
}

function parse(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Rows that spend a try, oldest first. */
export async function countedRows(
  db: AttemptDb,
  email: string,
  lessonId: string,
): Promise<Array<{ submittedAt: number; gradeJson: unknown | null }>> {
  const res = await db
    .prepare(
      'SELECT grade_json, submitted_at FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? ORDER BY submitted_at ASC',
    )
    .bind(email, lessonId)
    .all<SubmissionRow>();
  const rows = (res.results ?? []).map((r) => ({ submittedAt: r.submitted_at, gradeJson: parse(r.grade_json) }));
  return rows.filter((r) => countAttempts([r], COUNT_SINCE) === 1);
}

export async function attemptsUsed(db: AttemptDb, email: string, lessonId: string): Promise<number> {
  return (await countedRows(db, email, lessonId)).length;
}

/**
 * Marks of one hand-in against the key, for the form the student sat. The
 * picks come from the stored row (`gradeJson.quiz[].picked`), which the browser
 * wrote; the key never left the server. Questions the student's form does not
 * carry are ignored, so a different form's key cannot inflate the total.
 */
export function scoreQuiz(
  key: QuizKey,
  variant: string | null,
  gradeJson: unknown,
): { correct: number; total: number } {
  const mine = key.questions.filter((q) => !variant || !q.variant || q.variant === variant);
  const picks = new Map<string, unknown>();
  const quiz = gradeJson && typeof gradeJson === 'object' ? (gradeJson as { quiz?: unknown }).quiz : null;
  if (Array.isArray(quiz)) {
    for (const p of quiz) {
      if (p && typeof p === 'object') picks.set(String((p as { id?: unknown }).id), (p as { picked?: unknown }).picked);
    }
  }
  let correct = 0;
  for (const q of mine) if (picks.get(q.id) === q.answer) correct++;
  return { correct, total: mine.length };
}
