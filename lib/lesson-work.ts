// What a lesson asks the student to make, and whether it counts toward the grade: lesson.json `work`.
//
// One field instead of reading it off `type`, `preview`, `editor`, `aiGrader`, `assignmentCode` and the
// module number (owner's decision 2026-11-18: everything a student makes is graded). `type: "assignment"`
// never meant graded (54 Chapter 1 lessons carry it, 29 were graded), and `preview` names a page and a
// runner at once ("console" is also the plan editor, "assignment" the text-answer page), so neither
// could carry it.
//
// The pass rule follows the kind (lib/grade-pass.ts passesWork):
//   code, model   every card green, or nothing (100% when passed)
//   plan, written 70% or better, a partly met card counting half; the gradebook keeps the score
//   quiz          the percent, no pass mark
//   read          nothing to hand in, not graded
//
// Pure, no fs: the manifest generator, the check script and the browser all import it.

export type WorkKind = 'read' | 'quiz' | 'code' | 'model' | 'plan' | 'written';

export interface LessonWork {
  kind: WorkKind;
  /** Counts toward the grade. Every kind but `read` is graded unless an author says otherwise, with `why`. */
  graded: boolean;
  /** Required when `graded` differs from the kind's default, so an exception is never silent. */
  why?: string;
}

export const WORK_KINDS: readonly WorkKind[] = ['read', 'quiz', 'code', 'model', 'plan', 'written'];

/** The fields of lesson.json the kind is read from. */
export interface WorkShape {
  quiz?: unknown;
  editor?: string;
  preview?: string;
  aiGrader?: unknown;
  cadHost?: string;
  requirements?: { type?: string }[];
}

/**
 * The kind a lesson's structure says it is. `files` are the names in the lesson folder (not
 * lesson.json). Used to write `work` once, and afterwards to check an authored `work` still
 * matches what the lesson actually is.
 */
export function workKindOf(l: WorkShape, files: readonly string[]): WorkKind {
  if (l.quiz) return 'quiz';
  if (l.editor === 'text') return 'plan';
  const reqs = Array.isArray(l.requirements) ? l.requirements : [];
  if (l.cadHost || l.preview === 'reshape' || reqs.some((r) => r?.type === 'model')) return reqs.length || l.cadHost ? 'model' : 'read';
  if (l.aiGrader && !files.includes('script.js')) return 'written';
  if (reqs.length > 0 && (files.includes('script.js') || l.preview === 'console' || l.preview === 'moshion')) return 'code';
  if (l.aiGrader) return 'code';
  return 'read';
}

export const defaultGraded = (kind: WorkKind): boolean => kind !== 'read';

/** Problems with an authored `work`, in plain words; empty when it is fine. */
export function workProblems(work: unknown, derived: WorkKind): string[] {
  const w = work as Partial<LessonWork> | undefined;
  if (!w || typeof w !== 'object') return ['has no "work" block'];
  const out: string[] = [];
  if (!WORK_KINDS.includes(w.kind as WorkKind)) out.push(`work.kind ${JSON.stringify(w.kind)} is not one of ${WORK_KINDS.join(', ')}`);
  else if (w.kind !== derived) out.push(`work.kind is "${w.kind}" but the lesson is built as "${derived}"`);
  if (typeof w.graded !== 'boolean') out.push('work.graded must be true or false');
  else if (WORK_KINDS.includes(w.kind as WorkKind) && w.graded !== defaultGraded(w.kind as WorkKind) && !(typeof w.why === 'string' && w.why.trim())) {
    out.push(`work.graded is ${w.graded} for a "${w.kind}" lesson; say why in work.why`);
  }
  return out;
}
