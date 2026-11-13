'use client';

import { lessonLabel } from '../lib/lesson-title-order';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX } from 'lucide-react';
import { parseDiagramArtifact, parseDiagramGrade, parseDiagramResponse } from '../lib/diagram-submission';
import { criteriaScore } from '../lib/grade-pass';
import { errorText } from '../lib/http-error';
import { diagramFrameHeight } from '../lib/diagram-types';
import SubmissionBoundary from './SubmissionBoundary';
import PlanCheckPanel from './PlanCheckPanel';
import { useFeedback } from './FeedbackProvider';
import {
  buildMarkCriteria,
  clampMark,
  controlFor,
  criterionMax,
  initialMarks,
  rubricFitsForm,
  rubricTotal,
  scoreSourceText,
  type MarkCriterion,
  type ScoreSource,
} from '../lib/rubric-mark';
import { countedScoreNote, quizAnswerRows, scoreCountNote, scoreOutOf, studentFirstName, type QuizAnswerRow, type ScoreWeight, type TeacherQuiz } from '../lib/teacher-drawer';
import { readTeacherNotes } from '../lib/gradebook-cell';
import { collapseQueue, needsHuman, orderCards, queueIntro } from '../lib/submission-queue-order';

// Only pulled in when a flowchart submission is actually on screen — a class
// with no diagram assignments never downloads React Flow.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 360, display: 'grid', placeItems: 'center', color: 'var(--c-meta)', fontSize: 13 }}>
      Loading diagram…
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// What /api/grade-written actually stores is {id, earned, max, verdict,
// feedback} — the rubric's human title lives in lesson.json and never makes it
// into the blob. `title`/`points` stay optional so older or hand-written rows
// that do carry them still render.
interface GradeCriterion {
  id: string;
  title?: string;
  points?: number;
  max?: number;
  earned?: number;
  verdict?: string;
  feedback?: string;
}

interface GradeJson {
  totalEarned: number;
  totalPossible: number;
  criteria: GradeCriterion[];
}

interface SubmissionItem {
  id: string;
  student_email: string;
  lesson_id: string;
  submitted_at: number;
  // These are the lesson_submissions column names, which is what
  // /api/classes/[id]/submission-queue selects and returns verbatim. They are
  // nullable: a submission recorded without a numeric grade stores NULL.
  score: number | null;
  possible: number | null;
  grade_json: string;
  response: string;
  /**
   * What a teacher's mark on this row is out of (the server's rowLimit): points, or criteria met on a
   * pass/fail part. Present even for a grader-outage row, which has no criteria list of its own.
   */
  limit?: { max: number; unit: 'points' | 'criteria' } | null;
  /** The part has a try limit, so the server refuses a mark above `limit` (round 7). */
  capped?: boolean;
  /** The student's lesson_state for this lesson (null: none yet), and whether it is past due: what decides
   *  whether a teacher's score counts yet (ux2 T1). Older servers send neither. */
  lessonState?: 'started' | 'completed' | null;
  pastDue?: boolean;
  /** lesson_state.score (the score the grade reads: the best try, or the teacher's chosen score when
   *  `stateOverride`), so a card can say which score counts when its newest try differs (ux3). */
  stateScore?: number | null;
  stateOverride?: boolean;
}

/** The assignment a row answers, from the queue GET's `assignments` (teacher-only, server-side config). */
interface AssignmentBrief {
  prompt: string;
  rubric: Array<{ id: string; title: string; points: number; description?: string; required?: boolean }>;
}

interface Props {
  classId: string;
  /** lesson id -> title, so a row says "3.3.14 Filter" rather than a folder id. */
  lessonTitles?: Record<string, string>;
  /** lesson id -> whether a teacher's score on it changes the grade (lib/teacher-drawer.ts scoreWeight). */
  lessonWeights?: Record<string, ScoreWeight>;
  /** Called after a score is saved or a quiz reopened, so the page can update its "to grade" count at once. */
  onGraded?: () => void;
  /** email -> the student's name, so a card says "Ben Franklin" and "Counts once Ben finishes" (ux2 T1). */
  studentNames?: Record<string, { firstName?: string | null; lastName?: string | null }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// To the minute, never seconds (system pass rule 3).
function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// One field style for the teacher screens (system pass rule 5): inset surface, visible border, 15px prose;
// hover and focus come from the `teacher-field` class in globals.css.
const FIELD: React.CSSProperties = {
  background: 'var(--c-deep2)',
  color: 'var(--c-fg)',
  border: '1px solid var(--c-line)',
  borderRadius: 4,
  fontFamily: 'var(--font-prose)',
  fontSize: 15,
  boxSizing: 'border-box',
};
const FIELD_LABEL: React.CSSProperties = { fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 600, color: 'var(--c-fg)' };

function parseGradeJson(raw: string): GradeJson | null {
  try {
    const parsed = JSON.parse(raw) as GradeJson;
    if (
      typeof parsed.totalEarned === 'number' &&
      typeof parsed.totalPossible === 'number' &&
      Array.isArray(parsed.criteria)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

interface FailedGrade {
  gradingFailed: true;
  error?: string;
  httpStatus?: number;
  attemptedAt?: number;
}

/** A submission recorded because grading FAILED — the student's answer reached
 *  the server but never got a score. WrittenGrader writes this marker into
 *  grade_json (see the comment there for why a marker and not a NULL), so these
 *  rows arrive in this queue through the existing query and are the ones a
 *  teacher has to mark by hand. */
function parseFailedGrade(raw: string): FailedGrade | null {
  try {
    const parsed = JSON.parse(raw) as FailedGrade;
    return parsed && parsed.gradingFailed === true ? parsed : null;
  } catch {
    return null;
  }
}

/** A console code lab saves the workspace's GradeReport: one `results` entry per requirement, passed or failed.
 *  Nothing AI scored it, so the row says how many checks passed instead of "AI score: 0 / 0". */
function labChecks(raw: string): { passed: number; total: number } | null {
  try {
    const results = (JSON.parse(raw) as { results?: unknown })?.results;
    if (!Array.isArray(results) || results.length === 0) return null;
    const rows = results.filter((r): r is { status?: unknown } => !!r && typeof r === 'object');
    return { passed: rows.filter((r) => r.status === 'passed').length, total: rows.length };
  } catch {
    return null;
  }
}

/** True when the grade_json shows a human has set this row's score since the
 *  AI failed on it. The override endpoint stamps teacherReviewedAt (with
 *  feedback) or teacherOverriddenAt (score only) — same fields the student
 *  gradebook reads. */
function hasTeacherReview(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as { teacherReviewedAt?: unknown; teacherOverriddenAt?: unknown };
    return typeof parsed?.teacherReviewedAt === 'number' || typeof parsed?.teacherOverriddenAt === 'number';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Override form inline component
// ---------------------------------------------------------------------------

interface OverrideFormProps {
  classId: string;
  submissionId: string;
  /** Pass/fail part: the mark is CRITERIA MET out of this many. Null: a pointed or unknown part. */
  unitTotal: number | null;
  /** A pointed part: the mark is points, out of this many. Null: unknown. */
  pointsMax?: number | null;
  /** The part has a try limit (the server's capFor): the ceiling is enforced, and "keep the higher of
   *  the mark and the best try" plus the persisted score choice apply. Elsewhere the unit is a label,
   *  extra credit is allowed, the mark simply becomes the score, and there is no choice to clear (the
   *  server 400s a clear there), so neither the box nor the clear button is shown. */
  enforceMax?: boolean;
  /** Shown to the LEFT of the score and feedback (climb4 r7 T4). Ignored when `criteria` gives a rubric to mark. */
  aside?: React.ReactNode;
  /** A 0-point part (no criteria, no points). Kept for callers; the sentence about the grade is `weightNote`. */
  zeroPoint?: boolean;
  /** The rubric to mark, with the AI's verdicts where the stored grade has them (ux1 G1). Marking fills the
   *  score with the total. Shown only when the rubric's maximum is what the score is out of. */
  criteria?: MarkCriterion[];
  /** The teacher's score already saved on this hand-in, and their note: the form opens on them. */
  savedScore?: number | null;
  savedFeedback?: string | null;
  /** The plain sentence when this score does not change the grade (scoreCountNote), shown above the fields. */
  weightNote?: string | null;
  onOverride: () => void;
  /** Put focus in the score field on mount (the form was opened by a button, e.g. Change the score). */
  autoFocus?: boolean;
  /** A visible heading for a form opened on purpose (an auto-scored quiz's "Change the score"). */
  heading?: string;
}

/** A pass/fail rubric's grade unit (criteria met out of the criteria count), or null for a pointed one. */
function markUnit(g: GradeJson | null): { total: number } | null {
  if (!g || !Array.isArray(g.criteria) || g.criteria.length === 0) return null;
  if (typeof g.totalPossible === 'number' && g.totalPossible > 0) return null;
  return { total: g.criteria.length };
}

function verdictLabel(v: string | null | undefined): string {
  return v === 'met' ? 'Met' : v === 'partial' ? 'Partly met' : v === 'missing' ? 'Not met' : '';
}

/**
 * The rubric as controls (ux1 G1): a checkbox for an all-or-nothing criterion (half-ticked when it is
 * partly met), a number stepper for one worth more than a point. Space toggles a box; Tab moves on.
 */
function RubricMarker({
  criteria,
  marks,
  onMark,
  aiMarked,
  formId,
}: {
  criteria: MarkCriterion[];
  marks: Record<string, number>;
  onMark: (id: string, value: number) => void;
  aiMarked: boolean;
  formId: string;
}) {
  const [details, setDetails] = useState(false);
  const hasDetails = criteria.some((c) => c.aiFeedback);
  const listId = `sq-mark-${formId}`;
  const each = criteria.length > 1 && criteria.every((c) => criterionMax(c) === criterionMax(criteria[0])) ? criteria[0].points : null;
  const { total, marked, max } = rubricTotal(criteria, marks);
  return (
    <fieldset className="sq-mark">
      <legend className="sq-mark-legend">
        Rubric
        <span className="sq-assignment-meta">
          {` · ${criteria.length} criteri${criteria.length === 1 ? 'on' : 'a'}`}
          {each !== null ? (each > 0 ? `, ${each} point${each === 1 ? '' : 's'} each` : ', each met or not met') : `, ${max} points`}
        </span>
      </legend>
      <div className="sq-mark-sub">
        <span>
          {aiMarked ? 'Marked from the AI grader’s verdicts. Change any you disagree with.' : 'Tick what the answer does. The score adds itself up.'}
        </span>
        <span className="sq-mark-total" aria-live="polite">
          {marked > 0 ? `Adds up to ${total} of ${max}` : ''}
        </span>
        {hasDetails && (
          <button type="button" className="sq-rubric-compact-toggle" aria-expanded={details} aria-controls={listId} onClick={() => setDetails((v) => !v)}>
            {details ? 'Hide AI notes' : 'Show AI notes'}
          </button>
        )}
      </div>
      <ol id={listId} className="sq-mark-list">
        {criteria.map((c) => {
          const m = marks[c.id];
          const cmax = criterionMax(c);
          const inputId = `${listId}-${c.id}`;
          const ai = c.aiVerdict ? verdictLabel(c.aiVerdict) : '';
          return (
            <li key={c.id} className="sq-mark-item">
              {controlFor(c) === 'check' ? (
                <input
                  id={inputId}
                  type="checkbox"
                  className="sq-mark-check"
                  checked={m === cmax}
                  ref={(el) => {
                    if (el) el.indeterminate = typeof m === 'number' && m > 0 && m < cmax;
                  }}
                  onChange={() => onMark(c.id, m === cmax ? 0 : cmax)}
                />
              ) : (
                <span className="sq-mark-stepper">
                  <input
                    id={inputId}
                    type="number"
                    min={0}
                    max={cmax}
                    step={0.5}
                    value={typeof m === 'number' ? m : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') return;
                      onMark(c.id, clampMark(c, Number(v)));
                    }}
                    className="teacher-field"
                    style={{ ...FIELD, width: 56, height: 30, padding: '2px 6px', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span className="sq-mark-of">/ {cmax}</span>
                </span>
              )}
              <label htmlFor={inputId} className="sq-mark-label">
                <span className="sq-rubric-title">
                  {c.title}
                  {c.required && <span className="sq-rubric-required">Required</span>}
                </span>
                <span className="sq-mark-meta">
                  {each === null && controlFor(c) === 'check' && <span>{c.points > 0 ? `${c.points} pt` : 'met / not'}</span>}
                  {typeof m === 'number' && m > 0 && m < cmax && controlFor(c) === 'check' && <span className="sq-mark-partial">partly met</span>}
                  {ai && <span className={`sq-mark-ai is-${c.aiVerdict}`}>AI: {ai}</span>}
                </span>
                {details && c.aiFeedback && <span className="sq-mark-note">{c.aiFeedback}</span>}
              </label>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

export function OverrideForm({
  classId,
  submissionId,
  unitTotal,
  pointsMax = null,
  enforceMax = false,
  aside,
  criteria,
  savedScore = null,
  savedFeedback = null,
  weightNote = null,
  onOverride,
  autoFocus = false,
  heading,
}: OverrideFormProps) {
  // A toast survives a reload of the list; the inline status below is where focus goes after a save.
  const { toast } = useFeedback();
  const formMax = unitTotal ?? pointsMax ?? null;
  const rubric = criteria && rubricFitsForm(criteria, formMax) ? criteria : null;
  const [marks, setMarks] = useState<Record<string, number>>(() => (rubric ? initialMarks(rubric) : {}));
  const aiMarked = !!rubric && rubric.some((c) => !!c.aiVerdict);
  const [score, setScore] = useState(savedScore !== null && savedScore !== undefined ? String(savedScore) : '');
  const [source, setSource] = useState<ScoreSource>(savedScore !== null && savedScore !== undefined ? 'saved' : 'empty');
  const [feedback, setFeedback] = useState(savedFeedback ?? '');
  // Capped parts only: the box is not rendered elsewhere (the server ignores it there anyway).
  const [replaceBest, setReplaceBest] = useState(false);
  const [whatIsThis, setWhatIsThis] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLInputElement>(null);
  const sum = rubric ? rubricTotal(rubric, marks) : null;
  useEffect(() => {
    if (autoFocus) scoreRef.current?.focus();
  }, [autoFocus]);

  // Focus the result line once it says what happened, so a keyboard or screen reader user is not dropped on <body>.
  useEffect(() => {
    if (msg) statusRef.current?.focus();
  }, [msg]);

  function mark(id: string, value: number) {
    const next = { ...marks, [id]: value };
    setMarks(next);
    // A hand-typed score wins: marking after typing leaves the typed number and says what the rubric adds up to.
    if (source !== 'hand' && rubric) {
      setScore(String(rubricTotal(rubric, next).total));
      setSource('rubric');
    }
  }

  function applyRubricTotal() {
    if (!sum) return;
    setScore(String(sum.total));
    setSource('rubric');
  }

  // Drop a "use this as the score" choice made earlier: the part goes back to the best its rows give.
  async function handleClear() {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/submission-queue`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, clearOverride: true }),
      });
      if (!res.ok) throw new Error(await errorText(res));
      setMsg({ type: 'success', text: 'Cleared. The score is now the student’s best again.' });
      toast('Cleared. The score is now the student’s best again.');
      onOverride();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Clear failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (score.trim() === '') {
      setMsg({ type: 'error', text: rubric ? 'Mark the rubric or type a score first.' : 'Type a score first.' });
      return;
    }
    const parsedScore = Number(score);
    if (isNaN(parsedScore) || parsedScore < 0) {
      setMsg({ type: 'error', text: 'Enter a valid score.' });
      return;
    }
    if (enforceMax && unitTotal !== null && parsedScore > unitTotal) {
      setMsg({ type: 'error', text: `This part is marked in criteria met, out of ${unitTotal}. Enter 0 to ${unitTotal}.` });
      return;
    }
    if (enforceMax && unitTotal === null && pointsMax !== null && parsedScore > pointsMax) {
      setMsg({ type: 'error', text: `This part is marked in points, out of ${pointsMax}. Enter 0 to ${pointsMax}.` });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      // The path takes the CLASS id and the body uses the endpoint's own field names.
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/submission-queue`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score: parsedScore,
          feedback: feedback.trim() || undefined,
          replaceBest: replaceBest || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await errorText(res));
      }

      const out = (await res.json().catch(() => null)) as { overrideActive?: boolean; stateScore?: number } | null;
      const outOf = formMax !== null ? ` / ${formMax}` : '';
      const kept = out && out.overrideActive && !replaceBest;
      setMsg({
        type: 'success',
        text: kept
          ? `Saved ${parsedScore}${outOf} on this try. A score you set earlier is still in force (${out!.stateScore}); tick the box to change it.`
          : `Saved: ${parsedScore}${outOf}${feedback.trim() ? ', with your note' : ''}.`,
      });
      setSource('saved');
      toast(kept ? 'Saved on this try. An earlier score is still in force.' : 'Score saved.');
      onOverride();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Override failed' });
    } finally {
      setSubmitting(false);
    }
  }

  const sourceText = scoreSourceText(source, sum ? { total: sum.total, marked: sum.marked, count: rubric!.length } : null);
  const aiSum = aiMarked && source === 'empty' && sum ? sum.total : null;

  // Save is the form's last row, and it is sticky (ux2 T5): while any part of the form is on screen the row
  // sits at the bottom of the view (above an on-screen keyboard, through --kb-inset), so a ten-criterion rubric
  // or a phone keyboard never puts Save out of reach. It spans the form's width and has its own surface.
  const actions = (
    <div className="override-actions sq-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      <button
        type="submit"
        disabled={submitting}
        style={{
          background: 'var(--c-cyan)',
          color: 'var(--c-bg)',
          border: 'none',
          borderRadius: 4,
          padding: '4px 16px',
          height: 32,
          fontWeight: 700,
          fontSize: 14,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.5 : 1,
        }}
      >
        {submitting ? 'Saving…' : 'Save grade'}
      </button>
      {enforceMax && (
      <button
        type="button"
        onClick={handleClear}
        disabled={submitting}
        title="Drop a 'use this as the score' choice you made earlier on this part"
        style={{ background: 'none', border: '1px solid var(--c-line)', borderRadius: 4, color: 'var(--c-meta)', padding: '4px 12px', fontSize: 13, height: 32, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        Clear my score choice
      </button>
      )}

      <span
        ref={statusRef}
        tabIndex={-1}
        role={msg?.type === 'error' ? 'alert' : 'status'}
        className="sq-save-status"
        style={{ fontFamily: 'var(--font-prose)', fontSize: 14, color: msg?.type === 'success' ? 'var(--c-green)' : 'var(--c-red)' }}
      >
        {msg?.text ?? ''}
      </span>
    </div>
  );

  const body = (
    <>
      {weightNote && <p role="note" className="sq-weight-note">{weightNote}</p>}
      <div className="override-fields">
      <div className="override-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <label htmlFor={`override-score-${submissionId}`} style={FIELD_LABEL}>
          {unitTotal !== null
            ? `New mark (criteria met, out of ${unitTotal}):`
            : pointsMax !== null
              ? `New score (points, out of ${pointsMax}):`
              : 'New score:'}
        </label>
        <input
          ref={scoreRef}
          id={`override-score-${submissionId}`}
          type="number"
          min={0}
          max={enforceMax ? unitTotal ?? pointsMax ?? undefined : undefined}
          step={0.5}
          value={score}
          onChange={(e) => {
            setScore(e.target.value);
            setSource(e.target.value === '' ? 'empty' : 'hand');
          }}
          aria-describedby={`override-src-${submissionId}`}
          className="teacher-field"
          style={{
            ...FIELD,
            width: 96,
            height: 36,
            padding: '4px 8px',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <span id={`override-src-${submissionId}`} className="sq-score-src">
          {aiSum !== null ? `The AI’s marks add up to ${aiSum}` : sourceText}
          {rubric && sum && sum.marked > 0 && (source === 'hand' || source === 'saved' || source === 'empty') && Number(score) !== sum.total && (
            <button type="button" className="sq-score-use" onClick={applyRubricTotal}>
              Use {sum.total}
            </button>
          )}
        </span>
      </div>

      {/* The "use this score even if it is lower" choice belongs to the score, so it follows the score field: on a
          phone or in the drawer (one column) it sits ABOVE the note, where the pinned Save bar cannot cover it
          while the note is being typed (rewalk2 T9). In the wide queue form it is shown under the row as
          before (globals.css ux3: order). */}
      {enforceMax && (
        <div className="sq-keep">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-prose)', fontSize: 14, color: 'var(--c-fg)' }}>
            <input type="checkbox" checked={replaceBest} onChange={(e) => setReplaceBest(e.target.checked)} />
            Use this score even if it is lower than their best try
          </label>
          <button type="button" className="sq-score-use" aria-expanded={whatIsThis} aria-controls={`keep-help-${submissionId}`} onClick={() => setWhatIsThis((v) => !v)}>
            What is this?
          </button>
          {whatIsThis && (
            <p id={`keep-help-${submissionId}`} className="sq-keep-help">
              On a part with a try limit the higher of your score and the student&apos;s best try is kept, so your
              score never lowers it. Tick this to make your score the one that counts, lower or not. It stays until
              you change it or press Clear my score choice; the student&apos;s later tries do not undo it.
            </p>
          )}
        </div>
      )}

      <div className="override-feedback" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <label htmlFor={`override-feedback-${submissionId}`} style={FIELD_LABEL}>
          Note to the student (optional):
        </label>
        <textarea
          id={`override-feedback-${submissionId}`}
          rows={2}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="teacher-field"
          style={{
            ...FIELD,
            width: '100%',
            padding: '8px 12px',
            lineHeight: 1.5,
            resize: 'vertical',
            minHeight: 64,
            maxHeight: 120,
            boxSizing: 'border-box',
          }}
        />
      </div>

      </div>

    </>
  );

  const left = rubric ? <RubricMarker criteria={rubric} marks={marks} onMark={mark} aiMarked={aiMarked} formId={submissionId} /> : aside;

  return (
    <form
      onSubmit={handleOverride}
      className={left ? 'override-form has-aside' : 'override-form'}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-line)' }}
      aria-label={heading}
    >
      {heading && <h4 className="override-heading">{heading}</h4>}
      {left ? (
        <>
          <div className="override-aside">{left}</div>
          <div className="override-main">{body}</div>
        </>
      ) : body}
      {actions}
    </form>
  );
}

// ---------------------------------------------------------------------------
// The assignment beside the answer
// ---------------------------------------------------------------------------

/**
 * The task the student was given and the criteria it is graded on, so a teacher marking an answer can
 * see the question. Open on a desktop, folded on a phone (where the answer and the form matter most).
 * Renders nothing when the server sent no brief for the lesson.
 */
function AssignmentBlock({ brief, hideRubric = false }: { brief: AssignmentBrief; hideRubric?: boolean }) {
  // The prompt is always shown; the rubric is folded so the answer and the score field stay on screen
  // (open by default it pushed both below the fold and lost its blind comparison).
  const [open, setOpen] = useState(false);
  const total = brief.rubric.reduce((n, c) => n + (c.points > 0 ? c.points : 0), 0);
  return (
    <div className="sq-assignment">
      {brief.prompt && (
        <div className="sq-assignment-top">
          <div className="sq-assignment-label">Assignment</div>
          <div className="sq-assignment-prompt">{brief.prompt}</div>
        </div>
      )}
    {brief.rubric.length > 0 && !hideRubric && (
    <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        Rubric
        <span className="sq-assignment-meta">
          {brief.rubric.length > 0 ? ` · ${brief.rubric.length} criteri${brief.rubric.length === 1 ? 'on' : 'a'}${total > 0 ? `, ${total} point${total === 1 ? '' : 's'}` : ''}` : ''}
        </span>
      </summary>
      <div className="sq-assignment-body">
        {(
          <div>
            <ol className="sq-assignment-rubric">
              {brief.rubric.map((c) => (
                <li key={c.id}>
                  <div className="sq-rubric-head">
                    <span className="sq-rubric-title">
                      {c.title}
                      {c.required && <span className="sq-rubric-required">Required</span>}
                    </span>
                    <span className="sq-rubric-points">{c.points > 0 ? `${c.points} pt${c.points === 1 ? '' : 's'}` : 'met / not met'}</span>
                  </div>
                  {c.description && <div className="sq-rubric-desc">{c.description}</div>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
    )}
    </div>
  );
}

/**
 * The rubric OPEN but compact, beside the score field of a submission that needs a manual grade
 * (climb4 r7 T4): one line per criterion, title left and points right, two columns when there is room.
 * The descriptions stay behind a disclosure so Save grade stays on screen.
 */
function RubricCompact({ brief, submissionId }: { brief: AssignmentBrief; submissionId: string }) {
  const [details, setDetails] = useState(false);
  const total = brief.rubric.reduce((n, c) => n + (c.points > 0 ? c.points : 0), 0);
  const hasDescriptions = brief.rubric.some((c) => c.description);
  const listId = `sq-rubric-${submissionId}`;
  // Every criterion worth the same: say it once in the heading and give the titles the room.
  const each = brief.rubric.length > 1 && brief.rubric.every((c) => c.points === brief.rubric[0].points) ? brief.rubric[0].points : null;
  return (
    <div className="sq-rubric-compact">
      <div className="sq-rubric-compact-head">
        <span className="sq-rubric-compact-title">
          Rubric
          <span className="sq-assignment-meta">
            {` · ${brief.rubric.length} criteri${brief.rubric.length === 1 ? 'on' : 'a'}`}
            {each !== null
              ? each > 0 ? `, ${each} point${each === 1 ? '' : 's'} each` : ', each met or not met'
              : total > 0 ? `, ${total} point${total === 1 ? '' : 's'}` : ''}
          </span>
        </span>
        {hasDescriptions && (
          <button type="button" className="sq-rubric-compact-toggle" aria-expanded={details} aria-controls={listId} onClick={() => setDetails((v) => !v)}>
            {details ? 'Hide descriptions' : 'Show descriptions'}
          </button>
        )}
      </div>
      {/* r9 T2: on a wide screen the two columns share row tracks and fill down, then across (--sq-rows). */}
      <ol
        id={listId}
        className={details ? 'sq-rubric-compact-list is-detailed' : 'sq-rubric-compact-list'}
        style={{ ['--sq-rows' as string]: Math.ceil(brief.rubric.length / 2) } as React.CSSProperties}
      >
        {brief.rubric.map((c) => (
          <li key={c.id}>
            <div className="sq-rubric-head">
              <span className="sq-rubric-title" title={details ? undefined : c.description ? `${c.title}: ${c.description}` : c.title}>
                {c.title}
                {c.required && <span className="sq-rubric-required">Required</span>}
              </span>
              {each === null && <span className="sq-rubric-points">{c.points > 0 ? `${c.points} pt${c.points === 1 ? '' : 's'}` : 'met / not'}</span>}
            </div>
            {details && c.description && <div className="sq-rubric-desc">{c.description}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * A quiz hand-in as the teacher reads it: each question, the answer the student picked (its text), and on a
 * wrong one the right answer's text (ux2 T3b). Shared by the review queue and the student drawer.
 */
export function QuizAnswers({ rows }: { rows: QuizAnswerRow[] }) {
  if (rows.length === 0) return <p className="sq-quiz-row" style={{ margin: 0 }}>(no answers)</p>;
  return (
    <ol className="sq-quiz">
      {rows.map((q) => (
        <li key={q.id} className="sq-quiz-row">
          <span className="sq-quiz-q">{q.question}</span>
          <span className="sq-quiz-a">
            {q.correct !== null && (
              <span className={q.correct ? 'sq-quiz-ok' : 'sq-quiz-no'}>
                {q.correct ? <CircleCheck size={13} aria-hidden="true" /> : <CircleX size={13} aria-hidden="true" />}
                {q.correct ? 'Right' : 'Wrong'}
              </span>
            )}
            <span>
              <span className="sq-quiz-k">Picked:</span>{' '}
              {q.chosenText !== null ? <span className="sq-quiz-t">{q.chosenText}</span> : q.chosen}
            </span>
          </span>
          {q.correct === false && q.answerText !== null && (
            <span className="sq-quiz-a">
              <span><span className="sq-quiz-k">Answer:</span> <span className="sq-quiz-t">{q.answerText}</span></span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SubmissionQueue({ classId, lessonTitles, lessonWeights, onGraded, studentNames }: Props) {
  const { confirm, toast } = useFeedback();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentBrief>>({});
  // Each listed quiz's questions, options and key (teacher-only, from the same GET), for "Picked / Answer".
  const [quizzes, setQuizzes] = useState<Record<string, TeacherQuiz>>({});
  // Auto-scored quiz cards whose "Change the score" form the teacher opened (ux2 T3c).
  const [quizOverride, setQuizOverride] = useState<Set<string>>(new Set());
  const [quizStems, setQuizStems] = useState<Record<string, Record<string, string>>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reopening, setReopening] = useState<string | null>(null);
  // The card order the teacher is looking at: a reload after a save keeps it, so the card just graded
  // does not jump down the list and the next one does not slide up under the cursor (ux1 G3).
  const orderRef = useRef<string[]>([]);

  useEffect(() => {
    let live = true;
    fetch('/quiz-stems.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      if (live && d && typeof d === 'object') setQuizStems(d as Record<string, Record<string, string>>);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setError(null);

    fetch(`/api/classes/${encodeURIComponent(classId)}/submission-queue`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await errorText(res));
        }
        return res.json();
      })
      .then((json: { submissions: SubmissionItem[]; assignments?: Record<string, AssignmentBrief>; quizzes?: Record<string, TeacherQuiz> }) => {
        if (!mounted) return;
        setSubmissions(json.submissions);
        setAssignments(json.assignments && typeof json.assignments === 'object' ? json.assignments : {});
        setQuizzes(json.quizzes && typeof json.quizzes === 'object' ? json.quizzes : {});
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey]);

  function handleOverride() {
    setRefreshKey((k) => k + 1);
    onGraded?.();
  }

  // Reopen a quiz from its card (ux1 G6): the same route and the same rules as the drawer's.
  async function reopenQuiz(sub: SubmissionItem, title: string, handIns: number) {
    const ok = await confirm({
      title: `Reopen "${title}" for ${sub.student_email}?`,
      message: `${handIns > 1 ? `All ${handIns} of their hand-ins` : 'Their hand-in'} of this quiz and its score are removed.\nTheir answers are kept, so they can change them and hand it in again.`,
      confirmLabel: 'Reopen quiz',
      danger: true,
    });
    if (!ok) return;
    setReopening(sub.id);
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/lesson-unsubmit`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail: sub.student_email, lessonId: sub.lesson_id }),
      });
      if (!res.ok) throw new Error(await errorText(res));
      toast(`Reopened "${title}" for ${sub.student_email}. They can change their answers and hand it in again.`);
      handleOverride();
    } catch (err) {
      toast(`Could not reopen the quiz: ${err instanceof Error ? err.message : 'network error'}. Nothing changed.`, { kind: 'error' });
    } finally {
      setReopening(null);
    }
  }

  if (!loaded) {
    return (
      <div style={{ color: 'var(--c-meta)', fontStyle: 'italic', padding: 16, fontFamily: 'var(--font-prose)', fontSize: 14 }}>
        Loading submission queue...
      </div>
    );
  }

  if (error && submissions.length === 0) {
    return (
      <div style={{ color: 'var(--c-red)', padding: 16, fontFamily: 'var(--font-prose)', fontSize: 14 }}>
        Failed to load: {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div style={{ color: 'var(--c-meta)', padding: '8px 0', fontFamily: 'var(--font-prose)', fontSize: 15 }}>
        No submissions in the review queue.
      </div>
    );
  }

  // One card per student and lesson (ux1 G5). Order (ux2 T2): needs your score and counts, then needs your
  // score but does not change the grade right now, then already scored; the intro is built from the same groups.
  const weightOf = (lessonId: string): ScoreWeight | null =>
    lessonWeights && Object.prototype.hasOwnProperty.call(lessonWeights, lessonId) ? lessonWeights[lessonId] : null;
  const nameOf = (email: string) => studentNames && Object.prototype.hasOwnProperty.call(studentNames, email) ? studentNames[email] : undefined;
  const countNoteOf = (row: SubmissionItem) =>
    scoreCountNote(weightOf(row.lesson_id), {
      lessonState: row.lessonState ?? null,
      pastDue: row.pastDue === true,
      studentName: studentFirstName(nameOf(row.student_email)?.firstName, row.student_email),
    });
  const counts = (c: { row: SubmissionItem }) => countNoteOf(c.row) === null;
  const collapsed = collapseQueue(submissions);
  const cards = orderCards(collapsed, counts, orderRef.current, (c) => needsHuman(c.row));
  orderRef.current = cards.map((c) => c.key);
  // Is what is on screen the order the intro describes? Not after a Save that kept a card in place (ux3).
  const natural = orderCards(collapsed, counts, [], (c) => needsHuman(c.row)).map((c) => c.key);
  const heldInPlace = natural.some((k, i) => k !== cards[i]?.key);
  const needCounts = cards.filter((c) => needsHuman(c.row) && counts(c)).length;
  const needOther = cards.filter((c) => needsHuman(c.row) && !counts(c)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* What is listed, then how many need a human, and that the ones whose score changes nothing come last. */}
      <div style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch', marginBottom: 8 }}>
        {queueIntro(cards.length, needCounts, needOther, heldInPlace)}
      </div>
      {error && <div role="alert" style={{ color: 'var(--c-red)', fontFamily: 'var(--font-prose)', fontSize: 14, marginBottom: 8 }}>Could not refresh the list: {error}</div>}
      {cards.map(({ key, row: sub, others }) => {
        const title = lessonLabel(sub.lesson_id, lessonTitles);
        // A flowchart submission nests its rubric under `ai`, so the plain
        // top-level reader returns null for it; fall through to the diagram
        // reader before deciding there is no criteria breakdown to show.
        const diagramGrade = parseDiagramGrade(sub.grade_json);
        const gradeData: GradeJson | null =
          parseGradeJson(sub.grade_json) ??
          (diagramGrade?.ai
            ? {
                totalEarned: diagramGrade.ai.totalEarned,
                totalPossible: diagramGrade.ai.totalPossible,
                criteria: diagramGrade.ai.criteria,
              }
            : null);
        // A capped AI-graded chart's `response` is the Mermaid text the model read; the drawn chart
        // itself is kept in grade_json.artifact.
        const diagram = parseDiagramResponse(sub.response) ?? parseDiagramArtifact(sub.grade_json);
        // The row's own criteria say it first; a grader-outage row has none, so the server's
        // limit carries the unit (round 6: the form must always say what the mark is out of).
        const unit = markUnit(gradeData) ?? (sub.limit?.unit === 'criteria' ? { total: sub.limit.max } : null);
        // The row's own score, not the marker, decides (a mark leaves the marker in place).
        const failed = sub.score === null && parseFailedGrade(sub.grade_json);
        const brief = Object.prototype.hasOwnProperty.call(assignments, sub.lesson_id) ? assignments[sub.lesson_id] : undefined;
        const quiz = quizAnswerRows(sub.grade_json, sub.response, quizStems[sub.lesson_id], quizzes[sub.lesson_id]);
        const notes = readTeacherNotes(sub.grade_json);
        const teacherScored = hasTeacherReview(sub.grade_json) && sub.score !== null;
        // What a score here is out of: the row's own points, else the part's (the server's limit).
        const outOf = sub.possible !== null && sub.possible > 0 ? sub.possible : sub.limit?.unit === 'points' ? sub.limit.max : null;
        // Does a score here change the grade now? One helper for the tag, the sentence and the drawer (ux2 T1).
        const countNote = countNoteOf(sub);
        const who = nameOf(sub.student_email);
        const fullName = [who?.firstName, who?.lastName].map((x) => (x ?? '').trim()).filter(Boolean).join(' ');
        // An auto-scored quiz has its score; the form to change it is behind a button (ux2 T3c).
        const quizScored = !!quiz && !failed && sub.score !== null;
        const showForm = !quizScored || quizOverride.has(key);
        const pointsMax = sub.limit?.unit === 'points' ? sub.limit.max : null;
        const criteria = brief || gradeData ? buildMarkCriteria(brief?.rubric, gradeData?.criteria) : [];
        const rubricShown = rubricFitsForm(criteria, unit?.total ?? pointsMax);
        // The newest try's score and the score the grade reads can differ (best try kept, or the teacher's
        // chosen score): then the chip shows what counts and a sentence names both (ux3).
        const counted = countedScoreNote({
          rowScore: sub.score,
          stateScore: sub.stateScore,
          stateOverride: sub.stateOverride === true,
          lessonState: sub.lessonState ?? null,
          newest: !(others > 0 && failed),
          hasCountNote: countNote !== null,
          fmt: (n) => (unit ? `${Math.round(n * 100) / 100} of ${unit.total} criteria` : scoreOutOf(n, outOf)),
        });

        return (
          <div
            key={key}
            className="sq-card"
            // One container per thing (rule 6): submissions are separated by a divider inside the queue's
            // card, not boxed a second time.
            style={{
              borderTop: '1px solid var(--c-line)',
              padding: '16px 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Header: who (the card's title), what (its own line), when (to the minute, in meta). It stays in view
                while the card is being graded (ux2 T5): sticky under the class tabs, inside this card only. */}
            <div className="sq-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div className="sq-head-who" style={{ flex: '1 1 240px', minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'var(--font-prose)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Who and what on one line (climb4 r6: the stacked identity pushed Save grade below the fold). */}
                <h3 style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, lineHeight: 1.4, margin: 0, fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'var(--font-prose)' }}>
                  <strong style={{ fontWeight: 600, color: 'var(--c-fg)', fontSize: 16 }}>
                    {fullName || sub.student_email}
                  </strong>
                  <span aria-hidden="true" style={{ color: 'var(--c-meta)' }}>·</span>
                  <span style={{ color: 'var(--c-fg)', fontSize: 15 }}>{title}</span>
                </h3>
                <span style={{ color: 'var(--c-meta)', fontSize: 13, lineHeight: 1.5 }}>
                  {fullName ? `${sub.student_email} · ` : ''}Submitted {formatTs(sub.submitted_at)}
                  {others > 0 ? ` · handed in ${others + 1} times, ${failed ? 'this one needs your score' : 'showing the newest'}` : ''}
                </span>
              </div>
              <div className="sq-head-right">
              <div
                style={{
                  flexShrink: 0,
                  background: failed ? 'var(--c-orange)' : 'var(--c-line)',
                  color: failed ? 'var(--c-bg)' : 'var(--c-fg)',
                  padding: '4px 12px',
                  borderRadius: 4,
                  // r7 T8: a status and a score, read as data: the reading face, not small mono.
                  fontFamily: 'var(--font-prose)',
                  fontSize: 14,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {failed
                  ? 'Needs your score'
                  : counted
                    ? counted.chip
                    : unit
                    ? // A pass/fail rubric stores 0 of 0, so the stored numbers say nothing. Its grade is
                      // criteria met out of the criteria count, and that is what a mark is in.
                      teacherScored
                      ? `Your mark: ${sub.score} of ${unit.total} criteria`
                      : `AI: ${criteriaScore(gradeData?.criteria as Array<{ verdict: string }>)} of ${unit.total} criteria met`
                    : teacherScored
                      ? `Your score: ${scoreOutOf(sub.score, outOf)}`
                      : quiz
                        ? sub.score === null ? 'Quiz: not scored yet' : `Quiz score: ${scoreOutOf(sub.score, outOf)}`
                        : labChecks(sub.grade_json)
                          ? `Lab checks: ${labChecks(sub.grade_json)!.passed} of ${labChecks(sub.grade_json)!.total} passed`
                          : `AI score: ${scoreOutOf(sub.score, outOf)}`}
              </div>
              {countNote && <div className="sq-weight-tag">{countNote.tag}</div>}
              {failed && (
                // One compact line on the header's right (climb4 r6); the full sentence and the
                // grader's own error stay reachable in the tooltip and to screen readers.
                <div
                  role="note"
                  className="sq-grader-note"
                  title={`The AI grader could not score this. The student's answer is below and is safe: read it and set a score yourself.${
                    failed.error ? ` (${failed.error}${failed.httpStatus ? `, HTTP ${failed.httpStatus}` : ''})` : ''
                  }`}
                >
                  AI grader unavailable: set a score yourself
                  <span className="sr-only">
                    . The student&apos;s answer is below and is safe.
                    {failed.error ? ` (${failed.error}${failed.httpStatus ? `, HTTP ${failed.httpStatus}` : ''})` : ''}
                  </span>
                </div>
              )}
              </div>
            </div>

            {/* Does this score change the grade now? Said before the form, always visible, in the drawer's words. */}
            {countNote && <p role="note" className={`sq-weight-note is-${countNote.reason}`}>{countNote.note}</p>}
            {counted && <p role="note" className="sq-weight-note is-counted">{counted.note}</p>}

            {/* The teacher's own note, kept with their score (ux1 G2). */}
            {notes.feedback && (
              <div className="sq-teacher-note">
                <span className="sq-teacher-note-label">Your note{notes.reviewedAt ? `, ${formatTs(notes.reviewedAt)}` : ''}:</span>{' '}
                <span style={{ whiteSpace: 'pre-wrap' }}>{notes.feedback}</span>
              </div>
            )}

            {/* Advisory only, and only for the Chapter 3 plan part. */}
            <PlanCheckPanel lessonId={sub.lesson_id} response={sub.response} />

            {/* Assignment (prompt + folded rubric) and the answer side by side at >= 1000px (climb4 r6). */}
            <div className="sq-review-cols">
            <div className="sq-review-col">
            {/* The question and its criteria, above the answer they grade. The rubric moves into the form
                when it can be marked there. */}
            {brief && <AssignmentBlock brief={brief} hideRubric={!!failed || rubricShown} />}

            {/* Grading criteria, when they are not already the marking list */}
            {gradeData && !rubricShown && gradeData.criteria.length > 0 && (
              <div
                style={{
                  background: 'var(--c-bg)',
                  borderRadius: 4,
                  padding: '10px 12px',
                  fontFamily: 'var(--font-prose)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--c-fg)', marginBottom: 8 }}>
                  Criteria (total: {gradeData.totalEarned}/{gradeData.totalPossible})
                </div>
                {gradeData.criteria.map((c) => {
                  const max = c.max ?? c.points;
                  return (
                    <div
                      key={c.id}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', color: 'var(--c-fg)' }}
                    >
                      <span>{c.title || brief?.rubric.find((r) => r.id === c.id)?.title || c.id}</span>
                      <span style={{ color: 'var(--c-meta)', flex: '0 0 auto' }}>
                        {max ? `${c.earned ?? '?'}/${max}` : (c.verdict ?? '—')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            </div>

            {/* Student response: a filled block, no border inside the queue's card (rule 6). */}
            <div
              className="sq-review-col sq-review-answer"
              style={{
                background: 'var(--c-bg)',
                borderRadius: 4,
                padding: '10px 12px',
              }}
            >
              <div className="sq-answer-label" style={{ fontFamily: 'var(--font-prose)', fontWeight: 700, color: 'var(--c-fg)', fontSize: 14, marginBottom: 4 }}>
                {diagram ? 'Student diagram' : quiz ? 'Student answers' : 'Student response'}
              </div>
              <SubmissionBoundary raw={sub.response}>
                {quiz ? (
                  // A quiz is question / the answer picked / the right answer, never its raw JSON (ux2 T3b).
                  <QuizAnswers rows={quiz} />
                ) : diagram ? (
                  <>
                    <DiagramEditor
                      value={diagram}
                      readOnly
                      height={diagramFrameHeight(diagram, 300, 560)}
                      fitMinZoom={0.3}
                    />
                    <div style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, marginTop: 5 }}>
                      {diagram.nodes.length} shapes · {diagram.edges.length} arrows · scroll to zoom,
                      drag to pan
                    </div>
                    {/* The text the AI actually graded, beside the drawing. */}
                    {parseDiagramResponse(sub.response) === null && sub.response ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, marginBottom: 4 }}>What the AI read</div>
                        <div
                          style={{
                            color: 'var(--c-fg)',
                            fontSize: 13,
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap',
                            maxHeight: 160,
                            overflowY: 'auto',
                            background: 'var(--c-deep)',
                            borderRadius: 4,
                            padding: '8px 8px',
                          }}
                        >
                          {sub.response}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{
                      color: 'var(--c-fg)',
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 160,
                      overflowY: 'auto',
                    }}
                  >
                    {sub.response || '(no response)'}
                  </div>
                )}
              </SubmissionBoundary>
              {quiz && (
                <button
                  type="button"
                  className="sq-reopen"
                  disabled={reopening === sub.id}
                  onClick={() => { void reopenQuiz(sub, title, others + 1); }}
                >
                  {reopening === sub.id ? 'Reopening…' : `Reopen quiz for ${sub.student_email}`}
                </button>
              )}
            </div>
            </div>

            {/* An auto-scored quiz: its score, and changing it is a deliberate step (ux2 T3c). */}
            {quizScored && !showForm && (
              <div className="sq-quiz-scored">
                <span>{counted ? 'This try scored automatically' : 'Scored automatically'}: <strong>{scoreOutOf(sub.score, outOf)}</strong>. Nothing to grade.</span>
                <button
                  type="button"
                  className="sq-score-use"
                  onClick={() => setQuizOverride((prev) => new Set(prev).add(key))}
                >
                  Change the score
                </button>
              </div>
            )}

            {/* Override form */}
            {showForm && <OverrideForm
              key={sub.id}
              classId={classId}
              submissionId={sub.id}
              unitTotal={unit?.total ?? null}
              pointsMax={pointsMax}
              enforceMax={sub.capped === true}
              criteria={rubricShown ? criteria : undefined}
              savedScore={teacherScored ? sub.score : null}
              savedFeedback={notes.feedback}
              aside={failed && brief && brief.rubric.length > 0 && !rubricShown ? <RubricCompact brief={brief} submissionId={sub.id} /> : undefined}
              onOverride={handleOverride}
              autoFocus={quizScored}
              heading={quizScored ? `Change the quiz score for ${fullName || sub.student_email}` : undefined}
            />}

            {/* Structural checks — only a flowchart submission records these. */}
            {diagramGrade?.structural && diagramGrade.structural.length > 0 && (
              <div
                style={{
                  background: 'var(--c-bg)',
                  borderRadius: 4,
                  padding: '10px 12px',
                  fontFamily: 'var(--font-prose)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--c-fg)', marginBottom: 8 }}>
                  Flowchart structure (
                  {diagramGrade.structural.filter((c) => c.passed).length}/
                  {diagramGrade.structural.length} passed)
                </div>
                {diagramGrade.structural.map((c, i) => (
                  <div
                    key={c.id + i}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', color: 'var(--c-fg)' }}
                  >
                    {c.passed ? (
                      <CircleCheck size={13} color="var(--c-green)" style={{ flex: '0 0 auto' }} />
                    ) : (
                      <CircleX size={13} color="var(--c-red)" style={{ flex: '0 0 auto' }} />
                    )}
                    <span>{c.title}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
