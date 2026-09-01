// One gradebook cell: what a student's standing on one lesson actually is.
//
// Pure, and imports only due-dates-core (which imports nothing), so the same
// code runs in the Pages Function that builds /api/my-gradebook, in the React
// table that renders it, and in scripts/test-gradebook-cell.mjs. That is the
// same split lib/due-dates-core.ts and lib/grade-pass.ts already use, and it
// exists for the same reason: every consumer must answer "is this student
// behind?" identically, or the page tells a student one thing while the
// teacher's gradebook says another.
//
// Directive: do not re-derive `pending` or `late` at a call site. Both have a
// wrong-looking but deliberate answer on missing data, documented below.

import { isPastDue } from './due-dates-core';

export interface TeacherNotes {
  feedback: string | null;
  reviewedAt: number | null;
  /** The WrittenGrader outage marker: handed in, but nothing scored it. */
  gradingFailed: boolean;
}

/** Pull the teacher and outage markers out of a submission's grade_json.
 *
 *  grade_json is whatever the model returned plus whatever the submission
 *  queue appended, so it is not a trusted shape. Anything unparseable or
 *  unexpected degrades to "no notes" rather than throwing — a malformed blob
 *  must not be able to take down a student's whole gradebook. */
export function readTeacherNotes(raw: string | null | undefined): TeacherNotes {
  const empty: TeacherNotes = { feedback: null, reviewedAt: null, gradingFailed: false };
  if (!raw) return empty;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return empty;
  }
  if (!parsed || typeof parsed !== 'object') return empty;
  // A plain override stamps teacherOverriddenAt; an override WITH a comment
  // stamps teacherReviewedAt. Either one dates the feedback.
  const at = parsed.teacherReviewedAt ?? parsed.teacherOverriddenAt;
  return {
    feedback: typeof parsed.teacherFeedback === 'string' ? parsed.teacherFeedback : null,
    reviewedAt: typeof at === 'number' ? at : null,
    gradingFailed: parsed.gradingFailed === true,
  };
}

export interface GradebookCell {
  state: 'completed' | 'started' | null;
  /** lesson_state.score — the percent shown everywhere else. A teacher
   *  override syncs into this column, so it is the authoritative number. */
  score: number | null;
  /** Raw points off the LATEST submission, so "90%" can be shown as 18/20. */
  submittedScore: number | null;
  possible: number | null;
  /** Past due and not completed, or completed after the due date. */
  late: boolean;
  /** Handed in, but the AI grader failed on it — waiting on a teacher, NOT
   *  missing. Without this a grader outage is indistinguishable, to student
   *  and teacher alike, from never having submitted at all. */
  pending: boolean;
  completedAt: number | null;
  submittedAt: number | null;
  teacherFeedback: string | null;
  teacherReviewedAt: number | null;
}

export interface CellInput {
  state: 'started' | 'completed' | null;
  /** lesson_state.score */
  score: number | null;
  completedAt: number | null;
  /** latest lesson_submissions row, or nulls when there is none */
  submittedScore: number | null;
  possible: number | null;
  gradeJson: string | null;
  submittedAt: number | null;
  dueAt: number | null;
  now: number;
}

export function buildCell(i: CellInput): GradebookCell {
  const notes = readTeacherNotes(i.gradeJson);
  return {
    state: i.state,
    score: i.score,
    submittedScore: i.submittedScore,
    possible: i.possible,
    // A completed row with a NULL completed_at (legacy data) counts as ON
    // TIME — `?? dueAt` reads as "finished by the deadline". Guessing late on
    // missing data would accuse a student of something we cannot show.
    late: isPastDue(i.dueAt, i.state === 'completed' ? (i.completedAt ?? i.dueAt) : null, i.now),
    // Only the latest submission votes, and only while it still has no score.
    // A teacher override writes a score onto the row but leaves the
    // gradingFailed marker in place, so the marker alone would go on claiming
    // "pending" forever after the work had actually been graded.
    pending: i.submittedScore == null && notes.gradingFailed,
    completedAt: i.completedAt,
    submittedAt: i.submittedAt,
    teacherFeedback: notes.feedback,
    teacherReviewedAt: notes.reviewedAt,
  };
}

/** What a reader is told about a cell, student and teacher alike. */
export type CellStatus = 'pending' | 'done' | 'done-late' | 'started' | 'missing' | 'not-started';

/** Order matters. A submission the AI grader crashed on outranks everything
 *  else, because the alternative reading — "missing" — accuses a student who
 *  actually did the work. */
export function cellStatus(cell: GradebookCell): CellStatus {
  if (cell.pending) return 'pending';
  if (cell.state === 'completed') return cell.late ? 'done-late' : 'done';
  if (cell.state === 'started') return 'started';
  return cell.late ? 'missing' : 'not-started';
}

/** Needs the student to do something, or to know something. */
export function needsAttention(s: CellStatus): boolean {
  return s === 'missing' || s === 'done-late' || s === 'pending' || s === 'started';
}
