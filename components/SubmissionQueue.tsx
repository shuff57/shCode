'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX } from 'lucide-react';
import { parseDiagramArtifact, parseDiagramGrade, parseDiagramResponse } from '../lib/diagram-submission';
import { criteriaScore } from '../lib/grade-pass';
import { diagramFrameHeight } from '../lib/diagram-types';
import SubmissionBoundary from './SubmissionBoundary';

// Only pulled in when a flowchart submission is actually on screen — a class
// with no diagram assignments never downloads React Flow.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 360, display: 'grid', placeItems: 'center', color: '#6272a4', fontSize: '0.82rem' }}>
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

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
  /** The ceiling is enforced (a capped part). Elsewhere the unit is a label and extra credit is allowed. */
  enforceMax?: boolean;
  onOverride: () => void;
}

/** A pass/fail rubric's grade unit (criteria met out of the criteria count), or null for a pointed one. */
function markUnit(g: GradeJson | null): { total: number } | null {
  if (!g || !Array.isArray(g.criteria) || g.criteria.length === 0) return null;
  if (typeof g.totalPossible === 'number' && g.totalPossible > 0) return null;
  return { total: g.criteria.length };
}

export function OverrideForm({ classId, submissionId, unitTotal, pointsMax = null, enforceMax = false, onOverride }: OverrideFormProps) {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  // Capped parts only matter, but the box is harmless elsewhere (the server ignores it).
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
      if (!res.ok) throw new Error((await res.text().catch(() => '')) || `${res.status}`);
      setMsg({ type: 'success', text: 'Cleared. The score is now the student\u2019s best again.' });
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
        const errMsg = await res.text().catch(() => 'Unknown error');
        throw new Error(errMsg || `${res.status}`);
      }

      const out = (await res.json().catch(() => null)) as { overrideActive?: boolean; stateScore?: number } | null;
      setMsg({
        type: 'success',
        text: out && out.overrideActive && !replaceBest
          ? `Saved on this try. A score you set earlier is still in force (${out.stateScore}); tick the box to change it.`
          : 'Grade overridden successfully.',
      });
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
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor={`override-score-${submissionId}`} style={{ fontSize: '0.82rem', color: '#f8f8f2' }}>
          {unitTotal !== null ? `New mark (criteria met, out of ${unitTotal}):` : pointsMax !== null ? `New score (points, out of ${pointsMax}):` : 'New score:'}
        </label>
        <input
          id={`override-score-${submissionId}`}
          type="number"
          min={0}
          max={enforceMax ? unitTotal ?? pointsMax ?? undefined : undefined}
          step={0.5}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          style={{
            width: 80,
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: '0.85rem',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor={`override-feedback-${submissionId}`} style={{ fontSize: '0.82rem', color: '#f8f8f2' }}>
          Feedback (optional):
        </label>
        <textarea
          id={`override-feedback-${submissionId}`}
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          style={{
            width: '100%',
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6272a4' }}>
        <input type="checkbox" checked={replaceBest} onChange={(e) => setReplaceBest(e.target.checked)} />
        Use this as the student&apos;s score even if it is lower than their best try (otherwise the higher one is kept on a part with a try limit). This stays until you change or clear it; the student&apos;s later tries do not undo it.
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#bd93f9',
            color: '#282a36',
            border: 'none',
            borderRadius: 4,
            padding: '6px 18px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'Overriding...' : 'Override grade'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={submitting}
          title="Drop a 'use this as the score' choice you made earlier on this part"
          style={{ background: 'none', border: '1px solid #44475a', borderRadius: 4, color: '#6272a4', padding: '5px 10px', fontSize: '0.78rem', cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          Clear my score choice
        </button>

        {msg && (
          <span style={{ fontSize: '0.82rem', color: msg.type === 'success' ? '#50fa7b' : '#ff5555' }}>
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

export function SubmissionQueue({ classId }: Props) {
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
          const msg = await res.text().catch(() => 'Unknown error');
          throw new Error(msg || `${res.status}`);
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
      <div style={{ color: '#6272a4', fontStyle: 'italic', padding: 16, fontSize: '0.88rem' }}>
        Loading submission queue...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#ff5555', padding: 16, fontSize: '0.88rem' }}>
        Failed to load: {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div style={{ color: '#6272a4', padding: 16, fontSize: '0.88rem' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {needsManual > 0 && (
        <div
          style={{
            background: '#ffb86c',
            color: '#282a36',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          {needsManual} submission{needsManual === 1 ? '' : 's'} the AI grader could not score.
          Set a score by hand below — the students&apos; answers were saved.
        </div>
      )}
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
            style={{
              background: '#1e1f29',
              border: '1px solid #44475a',
              borderRadius: 6,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#f8f8f2', fontSize: '0.9rem' }}>
                  {sub.student_email}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6272a4' }}>
                  {sub.lesson_id} &middot; submitted {formatTs(sub.submitted_at)}
                </div>
              </div>
              <div
                style={{
                  background: failed ? '#ffb86c' : '#44475a',
                  color: failed ? '#282a36' : '#f8f8f2',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: '0.82rem',
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
                      ? `Teacher score: ${sub.score ?? '—'} / ${sub.possible ?? '—'}`
                      : `AI score: ${sub.score ?? '—'} / ${sub.possible ?? '—'}`}
              </div>
            </div>

            {failed && (
              <div
                style={{
                  background: '#282a36',
                  border: '1px solid #ffb86c',
                  borderLeft: '4px solid #ffb86c',
                  borderRadius: 4,
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  color: '#f8f8f2',
                  lineHeight: 1.5,
                }}
              >
                The AI grader could not score this. The student&apos;s answer is below and is
                safe — read it and set a score yourself.
                {failed.error && (
                  <div style={{ color: '#6272a4', marginTop: 4, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {failed.error}
                    {failed.httpStatus ? ` (HTTP ${failed.httpStatus})` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Grading criteria */}
            {gradeData && (
              <div
                style={{
                  background: '#282a36',
                  border: '1px solid #44475a',
                  borderRadius: 4,
                  padding: 10,
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#f8f8f2', marginBottom: 6 }}>
                  Criteria (total: {gradeData.totalEarned}/{gradeData.totalPossible})
                </div>
                {gradeData.criteria.map((c) => {
                  const max = c.max ?? c.points;
                  return (
                    <div
                      key={c.id}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0', color: '#f8f8f2' }}
                    >
                      <span>{c.title || c.id}</span>
                      <span style={{ color: '#6272a4', flex: '0 0 auto' }}>
                        {/* Every rubric is zero-point under green-to-advance, so
                            "3/0" says nothing — show the verdict instead. */}
                        {max ? `${c.earned ?? '?'}/${max}` : (c.verdict ?? '—')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Student response */}
            <div
              style={{
                background: '#282a36',
                border: '1px solid #44475a',
                borderRadius: 4,
                padding: 10,
              }}
            >
              <div style={{ fontWeight: 600, color: '#f8f8f2', fontSize: '0.82rem', marginBottom: 4 }}>
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
                    <div style={{ color: '#6272a4', fontSize: '0.76rem', marginTop: 5 }}>
                      {diagram.nodes.length} shapes · {diagram.edges.length} arrows · scroll to zoom,
                      drag to pan
                    </div>
                    {/* The text the AI actually graded, beside the drawing: the chart is a display
                        copy, and the teacher must always be able to see what the model read. */}
                    {parseDiagramResponse(sub.response) === null && sub.response ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: '#6272a4', fontSize: '0.76rem', marginBottom: 3 }}>What the AI read</div>
                        <div
                          style={{
                            color: '#f8f8f2',
                            fontSize: '0.78rem',
                            lineHeight: 1.45,
                            whiteSpace: 'pre-wrap',
                            maxHeight: 160,
                            overflowY: 'auto',
                            background: '#1e1f29',
                            borderRadius: 4,
                            padding: '6px 8px',
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
                      color: '#f8f8f2',
                      fontSize: '0.85rem',
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

            {/* Structural checks — only a flowchart submission records these. */}
            {diagramGrade?.structural && diagramGrade.structural.length > 0 && (
              <div
                style={{
                  background: '#282a36',
                  border: '1px solid #44475a',
                  borderRadius: 4,
                  padding: 10,
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#f8f8f2', marginBottom: 6 }}>
                  Flowchart structure (
                  {diagramGrade.structural.filter((c) => c.passed).length}/
                  {diagramGrade.structural.length} passed)
                </div>
                {diagramGrade.structural.map((c, i) => (
                  <div
                    key={c.id + i}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', color: '#f8f8f2' }}
                  >
                    {c.passed ? (
                      <CircleCheck size={13} color="#50fa7b" style={{ flex: '0 0 auto' }} />
                    ) : (
                      <CircleX size={13} color="#ff5555" style={{ flex: '0 0 auto' }} />
                    )}
                    <span>{c.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Override form */}
            <OverrideForm classId={classId} submissionId={sub.id} unitTotal={unit?.total ?? null} pointsMax={sub.limit?.unit === 'points' ? sub.limit.max : null} enforceMax={sub.capped === true} onOverride={handleOverride} />
          </div>
        );
      })}
    </div>
  );
}
