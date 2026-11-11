'use client';

import { lessonLabel } from '../lib/lesson-title-order';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX } from 'lucide-react';
import { parseDiagramArtifact, parseDiagramGrade, parseDiagramResponse } from '../lib/diagram-submission';
import { criteriaScore } from '../lib/grade-pass';
import { errorText } from '../lib/http-error';
import { diagramFrameHeight } from '../lib/diagram-types';
import SubmissionBoundary from './SubmissionBoundary';
import PlanCheckPanel from './PlanCheckPanel';
import { useFeedback } from './FeedbackProvider';

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
}

interface Props {
  classId: string;
  /** lesson id -> title, so a row says "3.3.14 Filter" rather than a folder id. */
  lessonTitles?: Record<string, string>;
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

/** A multiple-choice quiz stores its per-question picks under `quiz` (the same test the student drawer uses). */
function isQuizGrade(raw: string): boolean {
  try {
    return Array.isArray((JSON.parse(raw) as { quiz?: unknown })?.quiz);
  } catch {
    return false;
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
  /** A 0-point part (no criteria, no points): the mark is recorded for the teacher and the course
   *  grade does not change (the lab counts as done at 100%). */
  zeroPoint?: boolean;
  onOverride: () => void;
}

/** A pass/fail rubric's grade unit (criteria met out of the criteria count), or null for a pointed one. */
function markUnit(g: GradeJson | null): { total: number } | null {
  if (!g || !Array.isArray(g.criteria) || g.criteria.length === 0) return null;
  if (typeof g.totalPossible === 'number' && g.totalPossible > 0) return null;
  return { total: g.criteria.length };
}

export function OverrideForm({ classId, submissionId, unitTotal, pointsMax = null, enforceMax = false, zeroPoint = false, onOverride }: OverrideFormProps) {
  // The queue reloads after a save and unmounts this form, taking its inline message with it; a toast survives that.
  const { toast } = useFeedback();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  // Capped parts only: the box is not rendered elsewhere (the server ignores it there anyway).
  const [replaceBest, setReplaceBest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      setMsg({ type: 'success', text: 'Cleared. The score is now the student\u2019s best again.' });
      toast('Cleared. The score is now the student\u2019s best again.');
      onOverride();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Clear failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
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
      // The path takes the CLASS id and the body uses the endpoint's own field
      // names. Both were wrong here: the submission id was being interpolated
      // as the class id, and {id, overrideScore, overrideFeedback} does not
      // match the {submissionId, score, feedback} the handler validates — so
      // every override 400'd or 404'd and no teacher could correct a grade.
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/submission-queue`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score: parsedScore,
          feedback: feedback || undefined,
          replaceBest: replaceBest || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await errorText(res));
      }

      const out = (await res.json().catch(() => null)) as { overrideActive?: boolean; stateScore?: number } | null;
      setMsg({
        type: 'success',
        text: out && out.overrideActive && !replaceBest
          ? `Saved on this try. A score you set earlier is still in force (${out.stateScore}); tick the box to change it.`
          : 'Grade overridden successfully.',
      });
      toast(out && out.overrideActive && !replaceBest ? 'Saved on this try. An earlier score is still in force.' : 'Score saved.');
      onOverride();
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Override failed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleOverride}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-line)' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <label htmlFor={`override-score-${submissionId}`} style={FIELD_LABEL}>
          {unitTotal !== null
            ? `New mark (criteria met, out of ${unitTotal}):`
            : pointsMax !== null
              ? `New score (points, out of ${pointsMax}):`
              : zeroPoint
                ? 'New mark (0-point lab: recorded for you, does not change the course grade):'
                : 'New score:'}
        </label>
        <input
          id={`override-score-${submissionId}`}
          type="number"
          min={0}
          max={enforceMax ? unitTotal ?? pointsMax ?? undefined : undefined}
          step={0.5}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="teacher-field"
          style={{
            ...FIELD,
            width: 96,
            height: 36,
            padding: '4px 8px',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <label htmlFor={`override-feedback-${submissionId}`} style={FIELD_LABEL}>
          Feedback (optional):
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

      {enforceMax && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch' }}>
          <input type="checkbox" style={{ marginTop: 4, flexShrink: 0 }} checked={replaceBest} onChange={(e) => setReplaceBest(e.target.checked)} />
          Use this as the student&apos;s score even if it is lower than their best try (otherwise the higher one is kept on a part with a try limit). This stays until you change or clear it; the student&apos;s later tries do not undo it.
        </label>
      )}

      {/* Save comes last, after every field it saves (score, feedback, the keep-this-score choice). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
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

        {msg && (
          <span style={{ fontFamily: 'var(--font-prose)', fontSize: 14, color: msg.type === 'success' ? 'var(--c-green)' : 'var(--c-red)' }}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SubmissionQueue({ classId, lessonTitles }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
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
      .then((json: { submissions: SubmissionItem[] }) => {
        if (mounted) setSubmissions(json.submissions);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey]);

  function handleOverride() {
    setRefreshKey((k) => k + 1);
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--c-meta)', fontStyle: 'italic', padding: 16, fontFamily: 'var(--font-prose)', fontSize: 14 }}>
        Loading submission queue...
      </div>
    );
  }

  if (error) {
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

  // Ungraded attempts are the ones with a deadline attached — a student is
  // waiting on a human for these — so say how many there are rather than making
  // a teacher spot orange badges down a list of fifty.
  const needsManual = submissions.filter(
    (s) => parseFailedGrade(s.grade_json) && s.score === null,
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* The list below is the most recent graded work of every kind, so say that first and count what is
          listed; the orange note then counts only the rows the AI grader failed on. */}
      <div style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch', marginBottom: 8 }}>
        {submissions.length} recent submission{submissions.length === 1 ? '' : 's'}, {needsManual > 0 ? 'the ones needing a manual grade first, then ' : ''}newest first
        {needsManual > 0 ? '' : '. Every one has a score; override it below if you disagree'}.
      </div>
      {submissions.map((sub) => {
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
        // The row's own score, not the marker, decides. An override writes a
        // score onto the row but leaves gradingFailed in place, so keying on
        // the marker alone kept a graded submission reading "Needs manual
        // grade" forever — the gradebook already treats it as scored.
        const failed = sub.score === null && parseFailedGrade(sub.grade_json);

        return (
          <div
            key={sub.id}
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
            {/* Header: who (the card's title), what (its own line), when (to the minute, in meta). */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: '1 1 240px', minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'var(--font-prose)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <strong style={{ fontWeight: 600, color: 'var(--c-fg)', fontSize: 16, lineHeight: 1.4 }}>
                  {sub.student_email}
                </strong>
                <span style={{ color: 'var(--c-fg)', fontSize: 15, lineHeight: 1.4 }}>{lessonLabel(sub.lesson_id, lessonTitles)}</span>
                <span style={{ color: 'var(--c-meta)', fontSize: 13, lineHeight: 1.5 }}>Submitted {formatTs(sub.submitted_at)}</span>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  background: failed ? 'var(--c-orange)' : 'var(--c-line)',
                  color: failed ? 'var(--c-bg)' : 'var(--c-fg)',
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {failed
                  ? 'Needs manual grade'
                  : unit
                    ? // A pass/fail rubric stores 0 of 0, so the stored numbers say nothing. Its grade is
                      // criteria met out of the criteria count, and that is what a mark is in.
                      hasTeacherReview(sub.grade_json)
                      ? `Teacher mark: ${sub.score ?? '—'} of ${unit.total} criteria`
                      : `AI: ${criteriaScore(gradeData?.criteria as Array<{ verdict: string }>)} of ${unit.total} criteria met`
                    : hasTeacherReview(sub.grade_json)
                      ? // A 0-point lab stores 0 of 0, so "7 / 0" would be the teacher's own mark over nothing.
                        sub.possible === 0
                        ? `Teacher mark: ${sub.score ?? '—'}`
                        : `Teacher score: ${sub.score ?? '—'} / ${sub.possible ?? '—'}`
                      : isQuizGrade(sub.grade_json)
                        ? `Quiz score: ${sub.score ?? '—'} / ${sub.possible ?? '—'}`
                        : labChecks(sub.grade_json)
                          ? `Lab checks: ${labChecks(sub.grade_json)!.passed} of ${labChecks(sub.grade_json)!.total} passed`
                          : `AI score: ${sub.score ?? '—'} / ${sub.possible ?? '—'}`}
              </div>
            </div>

            {/* Advisory only, and only for the Chapter 3 plan part: the rules
                grade the same text deterministically, so a teacher can see where
                they disagree with the AI before this becomes the recorded grade. */}
            <PlanCheckPanel lessonId={sub.lesson_id} response={sub.response} />

            {failed && (
              // A wrapped prose notice (rule 3): an accent edge and a tint, no second border.
              <div
                role="note"
                style={{
                  background: 'color-mix(in srgb, var(--c-orange) 10%, transparent)',
                  borderLeft: '4px solid var(--c-orange)',
                  borderRadius: 4,
                  padding: '8px 12px',
                  fontFamily: 'var(--font-prose)',
                  fontSize: 14,
                  color: 'var(--c-fg)',
                  lineHeight: 1.5,
                  maxWidth: '70ch',
                }}
              >
                The AI grader could not score this. The student&apos;s answer is below and is
                safe — read it and set a score yourself.
                {failed.error && (
                  <span style={{ display: 'block', color: 'var(--c-meta)', marginTop: 2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    ({failed.error}
                    {failed.httpStatus ? `, HTTP ${failed.httpStatus}` : ''})
                  </span>
                )}
              </div>
            )}

            {/* Grading criteria */}
            {gradeData && (
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
                      <span>{c.title || c.id}</span>
                      <span style={{ color: 'var(--c-meta)', flex: '0 0 auto' }}>
                        {/* Every rubric is zero-point under green-to-advance, so
                            "3/0" says nothing — show the verdict instead. */}
                        {max ? `${c.earned ?? '?'}/${max}` : (c.verdict ?? '—')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Student response: a filled block, no border inside the queue's card (rule 6). */}
            <div
              style={{
                background: 'var(--c-bg)',
                borderRadius: 4,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontFamily: 'var(--font-prose)', fontWeight: 600, color: 'var(--c-meta)', fontSize: 13, marginBottom: 4 }}>
                {diagram ? 'Student diagram' : 'Student response'}
              </div>
              <SubmissionBoundary raw={sub.response}>
                {diagram ? (
                  <>
                    <DiagramEditor
                      value={diagram}
                      readOnly
                      height={diagramFrameHeight(diagram, 300, 560)}
                      // A review card is short by design, so let the fit shrink
                      // far enough to show the whole diagram; the teacher can
                      // scroll-zoom into anything they need to read closely.
                      fitMinZoom={0.3}
                    />
                    <div style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, marginTop: 5 }}>
                      {diagram.nodes.length} shapes · {diagram.edges.length} arrows · scroll to zoom,
                      drag to pan
                    </div>
                    {/* The text the AI actually graded, beside the drawing: the chart is a display
                        copy, and the teacher must always be able to see what the model read. */}
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
            </div>

            {/* Override form */}
            <OverrideForm
              classId={classId}
              submissionId={sub.id}
              unitTotal={unit?.total ?? null}
              pointsMax={sub.limit?.unit === 'points' ? sub.limit.max : null}
              enforceMax={sub.capped === true}
              zeroPoint={!unit && sub.limit?.unit !== 'points' && sub.possible === 0 && !isQuizGrade(sub.grade_json)}
              onOverride={handleOverride}
            />

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
