// Scoring a submission from its rubric, for the teacher's grading form (review queue and the student
// drawer's Override score). Pure: no React, no fetch, so scripts/test-rubric-mark.mjs can pin it.
//
// This is a way to COMPUTE the number the teacher saves, nothing more. The marks are not stored; the
// score is, through the same POST /api/classes/[id]/submission-queue as a hand-typed one. The course
// grade is still studentGrading() on the server.
//
// The rules follow the course's own: a pass/fail criterion (0 points) counts 1 when met and 0.5 when
// partly met (lib/grade-pass.ts criteriaScore); a pointed criterion earns 0 up to its points.

export type Verdict = 'met' | 'partial' | 'missing';

export interface MarkCriterion {
  id: string;
  title: string;
  /** The criterion's points; 0 means pass/fail (met / partly / not). */
  points: number;
  required?: boolean;
  /** What the AI grader said, when the stored grade carries it. */
  aiVerdict?: Verdict | null;
  /** The AI's points for a pointed criterion. */
  aiEarned?: number | null;
  aiFeedback?: string;
}

/** A checkbox for an all-or-nothing criterion (pass/fail, or worth one point); a stepper above that. */
export function controlFor(c: MarkCriterion): 'check' | 'stepper' {
  return c.points > 1 ? 'stepper' : 'check';
}

/** The most a criterion can add to the total: 1 for pass/fail, else its points. */
export function criterionMax(c: MarkCriterion): number {
  return c.points > 0 ? c.points : 1;
}

/** Clamp a mark to 0..max on half steps (the score field's own step). */
export function clampMark(c: MarkCriterion, v: number): number {
  if (!Number.isFinite(v)) return 0;
  const max = criterionMax(c);
  return Math.min(max, Math.max(0, Math.round(v * 2) / 2));
}

function verdictOf(v: unknown): Verdict | null {
  return v === 'met' || v === 'partial' || v === 'missing' ? v : null;
}

/** Turn an id like "q1-four-ps-named" into readable words when nothing gives the title. */
export function titleFromId(id: string): string {
  const words = id.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Criterion';
}

/**
 * One list of criteria to mark: the assignment's rubric (titles and points) when the page has it,
 * merged by id with the stored grade's criteria (the AI's verdicts). Without a rubric the stored
 * criteria are used on their own (their `max` is the points). Returns [] when there is nothing to mark.
 */
export function buildMarkCriteria(
  rubric: ReadonlyArray<{ id: string; title: string; points: number; required?: boolean }> | null | undefined,
  stored: ReadonlyArray<unknown> | null | undefined,
): MarkCriterion[] {
  const byId = new Map<string, Record<string, unknown>>();
  for (const s of Array.isArray(stored) ? stored : []) {
    if (s && typeof s === 'object' && typeof (s as { id?: unknown }).id === 'string') byId.set((s as { id: string }).id, s as Record<string, unknown>);
  }
  const ai = (s: Record<string, unknown> | undefined) => ({
    aiVerdict: s ? verdictOf(s.verdict) : null,
    aiEarned: s && typeof s.earned === 'number' && Number.isFinite(s.earned) ? s.earned : null,
    aiFeedback: s && typeof s.feedback === 'string' ? s.feedback.slice(0, 600) : '',
  });
  if (Array.isArray(rubric) && rubric.length > 0) {
    return rubric
      .filter((r) => r && typeof r.id === 'string')
      .map((r) => ({
        id: r.id,
        title: r.title || titleFromId(r.id),
        points: typeof r.points === 'number' && r.points > 0 ? r.points : 0,
        ...(r.required ? { required: true } : {}),
        ...ai(byId.get(r.id)),
      }));
  }
  const out: MarkCriterion[] = [];
  for (const s of byId.values()) {
    const max = typeof s.max === 'number' && s.max > 0 ? s.max : typeof s.points === 'number' && s.points > 0 ? s.points : 0;
    out.push({
      id: s.id as string,
      title: typeof s.title === 'string' && s.title ? s.title : titleFromId(s.id as string),
      points: max,
      ...ai(s),
    });
  }
  return out;
}

/** The marks the AI's verdicts imply, by criterion id. A criterion the AI said nothing about is absent. */
export function initialMarks(criteria: ReadonlyArray<MarkCriterion>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of criteria) {
    if (!c.aiVerdict) continue;
    const max = criterionMax(c);
    if (c.aiVerdict === 'met') out[c.id] = max;
    else if (c.aiVerdict === 'missing') out[c.id] = 0;
    else out[c.id] = clampMark(c, c.points > 0 && typeof c.aiEarned === 'number' ? c.aiEarned : max / 2);
  }
  return out;
}

/** What the marks add up to, how many criteria are marked, and the most the rubric can give. */
export function rubricTotal(criteria: ReadonlyArray<MarkCriterion>, marks: Readonly<Record<string, number>>): { total: number; marked: number; max: number } {
  let total = 0;
  let marked = 0;
  let max = 0;
  for (const c of criteria) {
    max += criterionMax(c);
    const m = marks[c.id];
    if (typeof m === 'number' && Number.isFinite(m)) {
      total += clampMark(c, m);
      marked += 1;
    }
  }
  return { total: Math.round(total * 100) / 100, marked, max: Math.round(max * 100) / 100 };
}

/**
 * Can these criteria score this form? Only when the rubric's own maximum is what the form's score is
 * out of: a rubric worth 10 cannot fill a field out of 3. An unknown form maximum accepts any rubric.
 */
export function rubricFitsForm(criteria: ReadonlyArray<MarkCriterion>, formMax: number | null): boolean {
  if (criteria.length === 0) return false;
  if (formMax === null) return true;
  return Math.abs(rubricTotal(criteria, {}).max - formMax) < 1e-9;
}

/** Where the number in the score field came from, in the words the form shows. */
export type ScoreSource = 'rubric' | 'hand' | 'saved' | 'empty';

export function scoreSourceText(source: ScoreSource, rubric: { total: number; marked: number; count: number } | null): string {
  if (source === 'rubric') {
    return rubric && rubric.marked < rubric.count
      ? `From the rubric (${rubric.marked} of ${rubric.count} criteria marked)`
      : 'From the rubric';
  }
  if (source === 'hand') return rubric && rubric.marked > 0 ? `Typed by hand (the rubric adds up to ${rubric.total})` : 'Typed by hand';
  if (source === 'saved') return 'Your saved score';
  return '';
}
