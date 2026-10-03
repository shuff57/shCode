// Server-side attempt counting and quiz scoring for capped performance-assessment
// parts (.gauntlet/SPEC-attempt-caps.md). One place, so attempt-reveal,
// quiz-reveal and lesson-submissions cannot count differently.
//
// The count is the same rule the browser applies (lib/attempt-cap.ts): rows since
// COUNT_SINCE, minus any row written because grading FAILED. It is read from
// lesson_submissions for the SESSION's email, never from anything the client sent.

import { countAttempts, COUNT_SINCE } from '../../lib/attempt-cap';
import type { QuizKey } from './quiz-keys.generated';
import { ATTEMPT_CAPS, ATTEMPT_KINDS } from './pa-pseudocode.generated';
import { resolveDueForStudent } from './dueDates';

interface AttemptDb {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      all<T>(): Promise<{ results?: T[] }>;
      run(): Promise<{ meta?: { changes?: number } }>;
    };
  };
}

export interface SubmissionRow {
  grade_json: string | null;
  submitted_at: number;
  score: number | null;
  possible: number | null;
}

export type AttemptKind = 'quiz' | 'ai' | 'client';

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** The part's maxSubmissions, or undefined when it is not capped. Server's table only. */
export function capFor(lessonId: string): number | undefined {
  return has(ATTEMPT_CAPS, lessonId) ? ATTEMPT_CAPS[lessonId] : undefined;
}

/** Who produces a capped part's counted row; see scripts/generate-pa-pseudocode.mjs. */
export function kindFor(lessonId: string): AttemptKind {
  return has(ATTEMPT_KINDS, lessonId) ? ATTEMPT_KINDS[lessonId] : 'client';
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
): Promise<Array<{ submittedAt: number; gradeJson: unknown | null; score: number | null; possible: number | null }>> {
  const res = await db
    .prepare(
      'SELECT grade_json, submitted_at, score, possible FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? ORDER BY submitted_at ASC',
    )
    .bind(email, lessonId)
    .all<SubmissionRow>();
  const rows = (res.results ?? []).map((r) => ({
    submittedAt: r.submitted_at,
    gradeJson: parse(r.grade_json),
    score: r.score,
    possible: r.possible,
  }));
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

/** The best score over the rows that spent a try, or null when none carries one. */
export async function bestCountedScore(db: AttemptDb, email: string, lessonId: string): Promise<number | null> {
  let best: number | null = null;
  for (const r of await countedRows(db, email, lessonId)) {
    if (typeof r.score === 'number' && Number.isFinite(r.score) && (best === null || r.score > best)) best = r.score;
  }
  return best;
}

export interface NewSubmission {
  id: string;
  email: string;
  lessonId: string;
  response: string;
  /** Already JSON.stringify'd, so the compact form the count's LIKE expects. */
  gradeJson: string | null;
  score: number | null;
  possible: number | null;
  at: number;
  dueAt: number | null;
}

/**
 * Record ONE row that spends a try, or refuse because every try is spent. The
 * check and the insert are a single statement (INSERT ... SELECT ... WHERE count
 * < cap), so two requests racing at cap-1 cannot both get in: SQLite serialises
 * the statement, and the loser's WHERE sees the winner's row. A count read in one
 * query and an insert in another would let both through.
 *
 * The SQL count is the same rule as countAttempts: rows since COUNT_SINCE that
 * are not a grading-failure marker. Every counted row is written by this server
 * with JSON.stringify, so the marker has exactly one spelling and the LIKE
 * cannot be fooled by text inside a string (a quote inside a JSON string is
 * escaped, which breaks the match).
 */
export async function insertCounted(db: AttemptDb, row: NewSubmission, cap: number): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT INTO lesson_submissions
         (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at, due_at_submit)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM lesson_submissions
               WHERE student_email = ? AND lesson_id = ? AND submitted_at >= ?
                 AND (grade_json IS NULL OR grade_json NOT LIKE ?)) < ?`,
    )
    .bind(
      row.id, row.email, row.lessonId, row.response, row.gradeJson, row.score, row.possible, row.at, row.dueAt,
      row.email, row.lessonId, COUNT_SINCE, '%"gradingFailed":true%', cap,
    )
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

/**
 * The server records an AI-graded part's counted row itself, with the grader's
 * own totals, so no score the browser relayed ever decides a best score.
 * Returns false when every try is already spent (the grade is then withheld).
 */
export async function recordGraded(
  env: { DB: AttemptDb },
  request: Request,
  email: string,
  lessonId: string,
  cap: number,
  response: string,
  result: { totalEarned: number; totalPossible: number },
): Promise<boolean> {
  let dueAt: number | null = null;
  try {
    dueAt = await resolveDueForStudent(env as never, request, email, lessonId);
  } catch {
    dueAt = null;
  }
  return insertCounted(
    env.DB,
    {
      id: `gw-${crypto.randomUUID()}`,
      email,
      lessonId,
      response,
      gradeJson: JSON.stringify(result),
      score: result.totalEarned,
      possible: result.totalPossible,
      at: Date.now(),
      dueAt,
    },
    cap,
  );
}
