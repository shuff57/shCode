/**
 * Pure helpers for the teacher's student drawer and review views, kept out of the page so they can be
 * tested without a browser. None of them computes a grade: the grade is studentGrading() on the server.
 */

// ---------------------------------------------------------------------------
// Lateness
// ---------------------------------------------------------------------------

/** A lateness badge is only ever shown for a lesson that counts toward the grade (readings and slides never). */
export function showLateBadge(counted: boolean, late: boolean): boolean {
  return counted && late;
}

/**
 * Was a hand-in late? `dueAtSubmit` is the class due date in force when it was handed in
 * (lesson_submissions.due_at_submit); null/undefined means no date applied, which is never late.
 */
export function submissionWasLate(submittedAt: number, dueAtSubmit: number | null | undefined): boolean {
  return typeof dueAtSubmit === 'number' && Number.isFinite(dueAtSubmit) && submittedAt > dueAtSubmit;
}

// ---------------------------------------------------------------------------
// Chart (and other rubric) grade detail
// ---------------------------------------------------------------------------

export interface GradeLine {
  id: string;
  title: string;
  verdict: 'met' | 'partial' | 'missing' | null;
  earned: number;
  max: number;
  feedback: string;
  /** Who scored it on a hybrid chart: 'rules' (shapes and order) or 'ai' (wording). */
  source: 'rules' | 'ai' | null;
}

export interface GradeDetail {
  /** Where the criteria came from: `ai` is the nested block a chart keeps beside its checks. */
  from: 'ai' | 'top';
  totalEarned: number | null;
  totalPossible: number | null;
  summary: string;
  /** The relevance gate held the total below what the criteria add up to. */
  capped: boolean;
  /** Sum of the criteria's points, to show next to a held-down total. */
  criteriaSum: number;
  /** One sentence for the teacher when capped, else ''. */
  cappedNote: string;
  lines: GradeLine[];
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}
function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function lines(list: unknown): GradeLine[] {
  if (!Array.isArray(list)) return [];
  const out: GradeLine[] = [];
  for (const c of list.slice(0, 80)) {
    if (!c || typeof c !== 'object') continue;
    const k = c as Record<string, unknown>;
    const verdict = k.verdict === 'met' || k.verdict === 'partial' || k.verdict === 'missing' ? k.verdict : null;
    out.push({
      id: str(k.id, 60),
      title: str(k.title, 200) || str(k.id, 60) || 'Criterion',
      verdict,
      earned: num(k.earned),
      max: num(k.max),
      feedback: str(k.feedback, 600),
      source: k.source === 'rules' || k.source === 'ai' ? k.source : null,
    });
  }
  return out;
}

/**
 * Read a stored grade_json for display. A chart keeps its hybrid result under `ai`
 * ({criteria, summary, capped, totalEarned, totalPossible}); a written assignment keeps the same keys at
 * the top level. Returns null when the blob has no criteria to show.
 */
export function describeGrade(raw: string | null | undefined): GradeDetail | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const top = parsed as Record<string, unknown>;
  const nested = top.ai && typeof top.ai === 'object' && Array.isArray((top.ai as Record<string, unknown>).criteria)
    ? (top.ai as Record<string, unknown>)
    : null;
  const src = nested ?? top;
  const ls = lines(src.criteria);
  if (ls.length === 0) return null;
  const criteriaSum = ls.reduce((a, l) => a + l.earned, 0);
  const totalEarned = typeof src.totalEarned === 'number' ? src.totalEarned : null;
  const totalPossible = typeof src.totalPossible === 'number' ? src.totalPossible : null;
  const capped = src.capped === true;
  let cappedNote = '';
  if (capped) {
    const held = totalEarned !== null && totalPossible !== null ? `The total is held at ${totalEarned} of ${totalPossible}` : 'The total is held down';
    cappedNote = `${held} by the relevance check (the chart did not use enough of the program's own words), although the criteria below add up to ${criteriaSum}.`;
  }
  return {
    from: nested ? 'ai' : 'top',
    totalEarned,
    totalPossible,
    summary: str(src.summary, 1200),
    capped,
    criteriaSum,
    cappedNote,
    lines: ls,
  };
}

/** Plain words for a verdict. */
export function verdictWord(v: GradeLine['verdict']): string {
  return v === 'met' ? 'Met' : v === 'partial' ? 'Partly met' : v === 'missing' ? 'Missing' : '';
}

// ---------------------------------------------------------------------------
// Requirements a student is still failing in a console lab
// ---------------------------------------------------------------------------

export interface RequirementEventRow {
  studentEmail: string;
  lessonId: string;
  reqId: string;
  fails: number;
  firstPassAt: number | null;
}

export interface FailingRequirement {
  reqId: string;
  title: string;
  fails: number;
}

/**
 * The checklist items one student has missed and not yet passed, in one lab. Rows only exist for items
 * the student failed at least once, so a requirement with no row is either passed first time or never run;
 * only the failing ones are knowable, which is what a teacher needs. `titles` maps reqId to its words
 * (public/lesson-requirements.json); an unknown id shows as the id.
 */
export function stillFailingRequirements(
  rows: RequirementEventRow[],
  email: string,
  lessonId: string,
  titles: Array<{ id: string; title: string }> | undefined,
): FailingRequirement[] {
  const order = new Map((titles ?? []).map((t, i) => [t.id, i] as const));
  const words = new Map((titles ?? []).map((t) => [t.id, t.title] as const));
  return rows
    .filter((r) => r.studentEmail === email && r.lessonId === lessonId && r.fails > 0 && r.firstPassAt === null)
    .map((r) => ({ reqId: r.reqId, title: words.get(r.reqId) ?? r.reqId, fails: r.fails }))
    .sort((a, b) => (order.get(a.reqId) ?? 1e9) - (order.get(b.reqId) ?? 1e9) || a.reqId.localeCompare(b.reqId));
}

// ---------------------------------------------------------------------------
// Where a teacher opens a student's work from
// ---------------------------------------------------------------------------

/**
 * Previews that open the code workspace at /teacher-edit (a code-only editor). Everything else (charts,
 * quizzes, written answers, reSHape) is read through the student drawer.
 */
export const CODE_PREVIEW_SET: ReadonlySet<string> = new Set(['console', 'example', 'moshion']);

export function opensInCodeEditor(preview: string | null | undefined): boolean {
  return CODE_PREVIEW_SET.has(preview ?? '');
}

// ---------------------------------------------------------------------------
// Does a teacher's score on this lesson change the grade? (review queue and drawer, one wording)
// ---------------------------------------------------------------------------

/**
 * What a teacher's score on a lesson does to the course grade, from the same manifest fields the grade
 * itself reads (lessonGradeCategory for "counts at all", maxScore for "the score is the percent"):
 *  - 'counts':    the score is the lesson's percent (score / maxScore).
 *  - 'done-only': the lesson counts, but as done or not done: lessonPercent() gives 100 once it is
 *                 completed whatever the score, because it has no maximum (a 0-point lab).
 *  - 'practice':  the lesson has no grade category and does not count at all.
 * Null when the lesson is not in the manifest (nothing to say, so say nothing).
 */
export type ScoreWeight = 'counts' | 'done-only' | 'practice';

export function scoreWeight(meta: { counts: boolean; maxScore?: number | null } | null | undefined): ScoreWeight | null {
  if (!meta) return null;
  if (!meta.counts) return 'practice';
  return typeof meta.maxScore === 'number' && meta.maxScore > 0 ? 'counts' : 'done-only';
}

/** The one sentence both the queue card and the drawer show; null when the score counts as usual. */
export function scoreWeightNote(w: ScoreWeight | null): string | null {
  if (w === 'practice') return 'Practice: this lesson does not count toward the grade. Your score is kept for your records only.';
  if (w === 'done-only') return 'Your score does not change the grade: this lab counts as 100% once it is done, whatever the score.';
  return null;
}

/** The short tag for a card header. */
export function scoreWeightTag(w: ScoreWeight | null): string | null {
  if (w === 'practice') return 'Practice, not graded';
  if (w === 'done-only') return 'Score does not change the grade';
  return null;
}

/** "7 / 10" whenever a maximum is known; "7 (no maximum set)" when nothing says what it is out of. */
export function scoreOutOf(score: number | null | undefined, max: number | null | undefined): string {
  const s = typeof score === 'number' && Number.isFinite(score) ? String(Math.round(score * 100) / 100) : 'no score';
  if (typeof max === 'number' && Number.isFinite(max) && max > 0) return `${s} / ${max}`;
  return typeof score === 'number' ? `${s} (no maximum set)` : s;
}

// ---------------------------------------------------------------------------
// A quiz hand-in, as the teacher reads it
// ---------------------------------------------------------------------------

export interface QuizAnswerRow {
  id: string;
  /** The question's text, or the id in words when the page has no text for it. */
  question: string;
  /** "Choice B", or "No answer". The options' text is not available to the teacher's page. */
  chosen: string;
  /** Right or wrong when the stored grade says; null when the hand-in carried no key. */
  correct: boolean | null;
}

function choiceName(picked: unknown): string {
  if (typeof picked === 'number' && Number.isInteger(picked) && picked >= 0) {
    return picked < 26 ? `Choice ${String.fromCharCode(65 + picked)}` : `Choice ${picked + 1}`;
  }
  if (typeof picked === 'string' && picked.trim()) return picked.trim().slice(0, 200);
  return 'No answer';
}

/**
 * A quiz hand-in as question / chosen answer / right or wrong. The stored grade's `quiz` list is the
 * source (one { id, picked, correct? } per question, in the quiz's order); the response's `answers`
 * map fills in a pick the grade lacks. Returns null when the grade is not a quiz.
 */
export function quizAnswerRows(
  gradeJson: string | null | undefined,
  response: string | null | undefined,
  stems: Readonly<Record<string, string>> | null | undefined,
): QuizAnswerRow[] | null {
  let grade: unknown;
  try {
    grade = gradeJson ? JSON.parse(gradeJson) : null;
  } catch {
    return null;
  }
  const quiz = grade && typeof grade === 'object' ? (grade as { quiz?: unknown }).quiz : undefined;
  if (!Array.isArray(quiz)) return null;
  let answers: Record<string, unknown> = {};
  try {
    const a = response ? (JSON.parse(response) as { answers?: unknown })?.answers : null;
    if (a && typeof a === 'object') answers = a as Record<string, unknown>;
  } catch {
    answers = {};
  }
  const out: QuizAnswerRow[] = [];
  for (const q of quiz.slice(0, 200)) {
    if (!q || typeof q !== 'object' || typeof (q as { id?: unknown }).id !== 'string') continue;
    const k = q as { id: string; picked?: unknown; correct?: unknown };
    const picked = k.picked !== undefined && k.picked !== null ? k.picked : answers[k.id];
    const stem = stems && Object.prototype.hasOwnProperty.call(stems, k.id) ? stems[k.id] : '';
    out.push({
      id: k.id,
      question: stem || k.id.replace(/^q\d+[-_]?/i, '').replace(/[-_]+/g, ' ').trim() || k.id,
      chosen: choiceName(picked),
      correct: k.correct === true ? true : k.correct === false ? false : null,
    });
  }
  return out;
}
