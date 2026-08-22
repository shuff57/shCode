'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleCheck, CircleX } from 'lucide-react';
import { parseDiagramGrade, parseDiagramResponse } from '../lib/diagram-submission';
import { diagramFrameHeight } from '../lib/diagram-types';

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

// ---------------------------------------------------------------------------
// Override form inline component
// ---------------------------------------------------------------------------

interface OverrideFormProps {
  classId: string;
  submissionId: string;
  onOverride: () => void;
}

function OverrideForm({ classId, submissionId, onOverride }: OverrideFormProps) {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    const parsedScore = Number(score);
    if (isNaN(parsedScore) || parsedScore < 0) {
      setMsg({ type: 'error', text: 'Enter a valid score.' });
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
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text().catch(() => 'Unknown error');
        throw new Error(errMsg || `${res.status}`);
      }

      setMsg({ type: 'success', text: 'Grade overridden successfully.' });
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
          New score:
        </label>
        <input
          id={`override-score-${submissionId}`}
          type="number"
          min={0}
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
  const needsManual = submissions.filter((s) => parseFailedGrade(s.grade_json)).length;

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
        const diagram = parseDiagramResponse(sub.response);
        const failed = parseFailedGrade(sub.grade_json);

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
            <OverrideForm classId={classId} submissionId={sub.id} onOverride={handleOverride} />
          </div>
        );
      })}
    </div>
  );
}
