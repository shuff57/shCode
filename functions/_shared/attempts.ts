// Server-side attempt counting and quiz scoring for capped performance-assessment
// parts (.gauntlet/SPEC-attempt-caps.md). One place, so attempt-reveal,
// quiz-reveal and lesson-submissions cannot count differently.
//
// The count is the same rule the browser applies (lib/attempt-cap.ts): rows since
// COUNT_SINCE, minus any row written because grading FAILED. It is read from
// lesson_submissions for the SESSION's email, never from anything the client sent.

import { countAttempts, COUNT_SINCE } from '../../lib/attempt-cap';
import { criteriaScore } from '../../lib/grade-pass';
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

/** A cap no real student reaches: what a previewing teacher or admin is held to. */
export const UNLIMITED_TRIES = 1_000_000;

/**
 * A teacher or admin who opens a capped part is PREVIEWING it (checking a rubric, running a
 * burst test before test day). Their rows are recorded but never refused, so the cap passed to
 * insertCounted / recordGraded / recordOutage is UNLIMITED for them. They are never enrolled in
 * a class, so the gradebook and the review queue (both read enrolled students only) never see
 * their rows.
 */
export function isStaff(role: string | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}

export function effectiveCap(cap: number, role: string | undefined): number {
  return isStaff(role) ? UNLIMITED_TRIES : cap;
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

/**
 * Has this student handed in ANYTHING for the part: a counted try, or the server's
 * own grader-outage marker? A capped part may only be COMPLETED after that. Without
 * it `POST /api/lesson-state` {completed} stored a NULL score for a part nobody sat,
 * and lessonPercent() reads a completed lesson with no score as 100.
 */
export async function hasAnyRow(db: AttemptDb, email: string, lessonId: string): Promise<boolean> {
  const res = await db
    .prepare('SELECT 1 AS n FROM lesson_submissions WHERE student_email = ? AND lesson_id = ? LIMIT 1')
    .bind(email, lessonId)
    .all<{ n: number }>();
  return (res.results ?? []).length > 0;
}

/**
 * One counted row's score as it enters the grade. A row with points (`possible > 0`,
 * a quiz or a pointed rubric) is its stored `score`. A pass/fail rubric's row stores
 * `possible` 0 and `score` 0 whatever the verdicts were, so its score is read from the
 * criteria it carries (met 1, partial half): see criteriaScore in lib/grade-pass.ts.
 * Without that, every pass/fail part's best is 0 or NULL and grades 100 on completion.
 */
export function rowScore(r: { score: number | null; possible: number | null; gradeJson: unknown | null }): number | null {
  const pointed = typeof r.possible === 'number' && r.possible > 0;
  // A row a teacher has MARKED (the review queue's override) carries the teacher's number in
  // `score`, in the units of the part's maxScore, so it is read as stored, never re-derived
  // from the AI's criteria.
  const g = r.gradeJson && typeof r.gradeJson === 'object'
    ? (r.gradeJson as { teacherOverriddenAt?: unknown; teacherReviewedAt?: unknown; aiScore?: unknown; teacherReplace?: unknown })
    : null;
  const teacherMarked = !!g && (typeof g.teacherOverriddenAt === 'number' || typeof g.teacherReviewedAt === 'number');
  if (!pointed && !teacherMarked) {
    const criteria = r.gradeJson && typeof r.gradeJson === 'object' ? (r.gradeJson as { criteria?: unknown }).criteria : null;
    if (Array.isArray(criteria) && criteria.length > 0) return criteriaScore(criteria as Array<{ verdict: string }>);
  }
  const stored = typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null;
  // A teacher's mark replaces the AI's score on that row, but it must not LOWER the part's
  // grade unless the teacher said so (replaceBest, which also sets lesson_state.score_override).
  // The row keeps the AI's own score as `aiScore` when first marked, and the row reads as the
  // higher of the two, so any recompute from the rows (a give-back, a completion, clearing an
  // override) lands on the same number the review queue showed.
  if (teacherMarked && g && g.teacherReplace !== true && typeof g.aiScore === 'number' && Number.isFinite(g.aiScore)) {
    return stored === null ? g.aiScore : Math.max(stored, g.aiScore);
  }
  return stored;
}

/**
 * A stored row's score as it counts toward the part's BEST. A grading-failure marker counts only
 * once a teacher has marked it by hand (the review queue writes the teacher's number onto it); an
 * unmarked marker carries no score, and one that somehow does (a forged insert) must not raise the
 * best. Every recompute from the rows (lesson-state, tries-reset, the review queue) reads this.
 */
export function scoreForBest(r: { score: number | null; possible: number | null; gradeJson: unknown | null }): number | null {
  const g = r.gradeJson && typeof r.gradeJson === 'object'
    ? (r.gradeJson as { gradingFailed?: unknown; teacherOverriddenAt?: unknown; teacherReviewedAt?: unknown })
    : null;
  if (g && g.gradingFailed === true && typeof g.teacherOverriddenAt !== 'number' && typeof g.teacherReviewedAt !== 'number') return null;
  return rowScore(r);
}

/** The best score over the rows that spent a try, or null when none carries one. */
export async function bestCountedScore(db: AttemptDb, email: string, lessonId: string): Promise<number | null> {
  let best: number | null = null;
  for (const r of await countedRows(db, email, lessonId)) {
    const sc = rowScore(r);
    if (sc !== null && (best === null || sc > best)) best = sc;
  }
  return best;
}

/**
 * The best score over EVERY row the student has for the part: tries since go-live, rows from
 * before it (their score is the part's old best, which the spec keeps), and a teacher's mark on
 * a grader-outage row. A row with no score (the bare outage marker) contributes nothing.
 * `exclude` leaves out rows a tries-reset is about to delete, so the recompute is the score
 * AFTER the reset. This is what lesson_state.score is rebuilt from; bestCountedScore (tries
 * only) is kept for callers that mean "what the counted tries earned".
 */
export async function bestScoreOverAllRows(
  db: AttemptDb,
  email: string,
  lessonId: string,
  exclude: ReadonlySet<string> = new Set(),
): Promise<number | null> {
  const res = await db
    .prepare('SELECT id, grade_json, score, possible FROM lesson_submissions WHERE student_email = ? AND lesson_id = ?')
    .bind(email, lessonId)
    .all<{ id: string; grade_json: string | null; score: number | null; possible: number | null }>();
  let best: number | null = null;
  for (const r of res.results ?? []) {
    if (exclude.has(r.id)) continue;
    const sc = scoreForBest({ score: r.score, possible: r.possible, gradeJson: parse(r.grade_json) });
    if (sc !== null && (best === null || sc > best)) best = sc;
  }
  return best;
}

/** The teacher's persisted "this is the score" for the part, or null (see migration 0034). */
export async function scoreOverride(db: AttemptDb, email: string, lessonId: string): Promise<number | null> {
  const res = await db
    .prepare('SELECT score_override AS o FROM lesson_state WHERE student_email = ? AND lesson_id = ?')
    .bind(email, lessonId)
    .all<{ o: number | null }>();
  const o = (res.results ?? [])[0]?.o;
  return typeof o === 'number' && Number.isFinite(o) ? o : null;
}

/** The most JSON a stored artifact may be (a 200-shape chart with its checks is a few KB). */
export const MAX_ARTIFACT_CHARS = 60_000;

/**
 * What a flowchart part may hand the grader besides its text: the drawn chart and the
 * browser-side structural checks, so the teacher can SEE what was graded (the counted row's
 * `response` is the Mermaid text the model read, and the browser's own copy of the chart is
 * dropped on an AI-graded capped part). It is DISPLAY ONLY: bounded, shape-checked, stored under
 * grade_json.artifact, never used for scoring and never put in the model's prompt. Anything that
 * does not fit is dropped (the grade is unaffected), never trusted.
 */
export function cleanArtifact(raw: unknown): { doc: { version: 1; nodes: unknown[]; edges: unknown[] }; checks: unknown[] } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const a = raw as { doc?: unknown; checks?: unknown };
  const doc = a.doc as { nodes?: unknown; edges?: unknown } | undefined;
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return undefined;
  if (doc.nodes.length > 200 || doc.edges.length > 400) return undefined;
  const nodesOk = doc.nodes.every(
    (n) => !!n && typeof n === 'object' && typeof (n as { id?: unknown }).id === 'string' && typeof (n as { shape?: unknown }).shape === 'string',
  );
  const edgesOk = doc.edges.every(
    (e) => !!e && typeof e === 'object' && typeof (e as { source?: unknown }).source === 'string' && typeof (e as { target?: unknown }).target === 'string',
  );
  if (!nodesOk || !edgesOk) return undefined;
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
  const checks: unknown[] = [];
  if (Array.isArray(a.checks)) {
    if (a.checks.length > 40) return undefined;
    for (const c of a.checks) {
      if (!c || typeof c !== 'object') return undefined;
      const k = c as { id?: unknown; title?: unknown; passed?: unknown; detail?: unknown; offenders?: unknown };
      if (typeof k.passed !== 'boolean') return undefined;
      checks.push({
        id: str(k.id, 40),
        title: str(k.title, 200),
        passed: k.passed,
        detail: str(k.detail, 500),
        offenders: Array.isArray(k.offenders) ? k.offenders.filter((o): o is string => typeof o === 'string').slice(0, 50).map((o) => o.slice(0, 80)) : [],
      });
    }
  }
  const out = { doc: { version: 1 as const, nodes: doc.nodes, edges: doc.edges }, checks };
  // A key anywhere that looks like the grading-failure marker is never honest, and the count
  // rule must not be able to see one inside a row the server wrote either.
  if (findMarkerKey(out)) return undefined;
  let size = 0;
  try {
    size = JSON.stringify(out).length;
  } catch {
    return undefined;
  }
  return size > MAX_ARTIFACT_CHARS ? undefined : out;
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
  artifact?: unknown,
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
      // `artifact` is what the teacher needs to SEE (the drawn chart and its structural
      // checks). It is stored beside the grade and nothing reads it for scoring.
      gradeJson: JSON.stringify(artifact === undefined ? result : { ...result, artifact }),
      score: result.totalEarned,
      possible: result.totalPossible,
      at: Date.now(),
      dueAt,
    },
    cap,
  );
}

/**
 * The grader-outage marker, written by the SERVER (grade-written) when it could not
 * get a usable grade out of the model. It keeps the student's work in front of the
 * teacher and is FREE (it spends no try). It used to be written by the browser, which
 * made the "free" row a thing a student could post at will; now the browser's marker
 * is refused on a capped part (lesson-submissions) and only a real failure here
 * produces one.
 *
 * Three limits, all in ONE statement so a race cannot widen them:
 *   - not once every try is spent (a marker is never the way to put a fourth answer
 *     in front of the teacher after the reveal);
 *   - at most `cap` markers per student per part, so a student who can provoke the
 *     model into non-answers cannot flood the review queue;
 *   - not twice for the same text, so five Submits against a dead grader are one row.
 * A refusal is not an error: the caller just does not write a row.
 */
export async function recordOutage(
  env: { DB: AttemptDb },
  request: Request,
  email: string,
  lessonId: string,
  cap: number,
  response: string,
  reason: string,
  httpStatus: number,
  artifact?: unknown,
): Promise<boolean> {
  let dueAt: number | null = null;
  try {
    dueAt = await resolveDueForStudent(env as never, request, email, lessonId);
  } catch {
    dueAt = null;
  }
  const marker = JSON.stringify(
    artifact === undefined
      ? { gradingFailed: true, error: reason.slice(0, 300), httpStatus }
      : { gradingFailed: true, error: reason.slice(0, 300), httpStatus, artifact },
  );
  const res = await env.DB
    .prepare(
      `INSERT INTO lesson_submissions
         (id, student_email, lesson_id, response, grade_json, score, possible, submitted_at, due_at_submit)
       SELECT ?, ?, ?, ?, ?, NULL, NULL, ?, ?
       WHERE (SELECT COUNT(*) FROM lesson_submissions
               WHERE student_email = ? AND lesson_id = ? AND submitted_at >= ?
                 AND (grade_json IS NULL
                      OR CASE WHEN json_valid(grade_json)
                              THEN json_type(grade_json, '$.gradingFailed') IS NOT 'true'
                              ELSE 1 END)) < ?
         AND (SELECT COUNT(*) FROM lesson_submissions
               WHERE student_email = ? AND lesson_id = ? AND submitted_at >= ?
                 AND json_valid(grade_json) AND json_type(grade_json, '$.gradingFailed') IS 'true') < ?
         AND NOT EXISTS (SELECT 1 FROM lesson_submissions
               WHERE student_email = ? AND lesson_id = ? AND response = ?
                 AND json_valid(grade_json) AND json_type(grade_json, '$.gradingFailed') IS 'true')`,
    )
    .bind(
      `gw-${crypto.randomUUID()}`, email, lessonId, response, marker, Date.now(), dueAt,
      email, lessonId, COUNT_SINCE, cap,
      email, lessonId, COUNT_SINCE, cap,
      email, lessonId, response,
    )
    .run();
  return (res.meta?.changes ?? 0) === 1;
}
