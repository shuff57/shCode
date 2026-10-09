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
