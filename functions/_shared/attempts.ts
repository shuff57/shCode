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
import { resolveDueForStudent, isLessonAvailableForStudent } from './dueDates';

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

/**
 * True when ANY key anywhere in `value` looks like the grading-failure marker
 * (NFKC-folded, case-folded, letters only: "GRADINGFAILED", "grading_failed",
 * "gradingFailed" spelled with a fullwidth letter). The counting rule is exact
 * (see insertCounted), so a lookalike would be an uncounted row to one reader and
 * a counted one to another; no honest report carries such a key, so the routes
 * refuse them instead of trying to count them. Depth-limited so a hostile body
 * cannot make this walk forever.
 */
export function findMarkerKey(value: unknown, depth = 0): boolean {
  if (depth > 20 || value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((v) => findMarkerKey(v, depth + 1));
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.normalize('NFKC').toLowerCase().replace(/[^a-z]/g, '').includes('gradingfailed')) return true;
    if (findMarkerKey(v, depth + 1)) return true;
  }
  return false;
}

/**
 * May this caller be handed an answer (the quiz key or the pseudocode)? A teacher
 * or admin, always: a self-hosting teacher with no class still has to be able to
 * try the part. A student only while enrolled in a live class (not expired, not
 * archived) AND the lesson is open for them (the "available after" gate, which
 * the lesson page enforces client-side only). Without this, signup takes any
 * email, so a throwaway account could spend three junk tries on a part nobody
 * has opened for it and read the answer. NOT a due-date gate: releasing the
 * answer only after the part closes is a separate decision, see the spec.
 */
export async function mayReadAnswer(
  env: { DB: AttemptDb },
  request: Request,
  email: string,
  role: string | undefined,
  lessonId: string,
): Promise<boolean> {
  if (role === 'teacher' || role === 'admin') return true;
  const res = await env.DB
    .prepare(
      `SELECT 1 AS ok FROM enrollments e JOIN classes c ON c.id = e.class_id
        WHERE e.student_email = ? AND e.expires_at > ? AND c.archived_at IS NULL LIMIT 1`,
    )
    .bind(email, Date.now())
    .all<{ ok: number }>();
  if ((res.results ?? []).length === 0) return false;
  try {
    return await isLessonAvailableForStudent(env as never, request, email, lessonId);
  } catch {
    // The lookup is a gate on a gate: an outage in the due-date tables must not
    // lock an enrolled student out of an answer they have earned. Fail OPEN here
    // only; the enrollment check above already ran.
    return true;
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
  /** Already JSON.stringify'd. */
  gradeJson: string | null;
  score: number | null;
  possible: number | null;
  at: number;
  dueAt: number | null;
}

/**
 * Record ONE row, or refuse because every try is spent. The check and the insert
 * are a single statement (INSERT ... SELECT ... WHERE count < cap), so two
 * requests racing at cap-1 cannot both get in: SQLite serialises the statement,
 * and the loser's WHERE sees the winner's row. A count read in one query and an
 * insert in another would let both through.
 *
 * The same statement writes the bare grading-failure MARKER (score NULL): it is
 * free, but it is refused once every try is spent, so a marker can never be the
 * way to put a fourth answer in front of the teacher after the reveal.
 *
 * ONE COUNTING RULE, in SQL and in JS. A row is free exactly when its grade_json
 * is valid JSON whose top-level `gradingFailed` is the JSON value true -- which is
 * what lib/attempt-cap.ts wasGradingFailure tests with `=== true`. The SQL used to
 * be LIKE '%"gradingFailed":true%', which is case-INSENSITIVE: a row written as
 * {"GRADINGFAILED":true} was free to the SQL count and counted by the JS one, so
 * six POSTs were all admitted. json_type is exact about both the key and the type
 * (1, "true" and "TRUE" are not the value true). The routes also refuse any
 * lookalike key outright (findMarkerKey), so the two rules never get to differ.
 */
export async function insertCounted(db: AttemptDb, row: NewSubmission, cap: number): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT INTO lesson_submissions
         (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at, due_at_submit)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM lesson_submissions
               WHERE student_email = ? AND lesson_id = ? AND submitted_at >= ?
                 AND (grade_json IS NULL
                      OR CASE WHEN json_valid(grade_json)
                              THEN json_type(grade_json, '$.gradingFailed') IS NOT 'true'
                              ELSE 1 END)) < ?`,
    )
    .bind(
      row.id, row.email, row.lessonId, row.response, row.gradeJson, row.score, row.possible, row.at, row.dueAt,
      row.email, row.lessonId, COUNT_SINCE, cap,
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
