'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GradeCriterion {
  id: string;
  title: string;
  points: number;
  earned?: number;
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
  ai_score: number;
  ai_possible: number;
  grade_json: string;
  written_response: string;
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

// ---------------------------------------------------------------------------
// Override form inline component
// ---------------------------------------------------------------------------

interface OverrideFormProps {
  submissionId: string;
  onOverride: () => void;
}

function OverrideForm({ submissionId, onOverride }: OverrideFormProps) {
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
      const res = await fetch(`/api/classes/${encodeURIComponent(submissionId)}/submission-queue`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submissionId,
          overrideScore: parsedScore,
          overrideFeedback: feedback || undefined,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {submissions.map((sub) => {
        const gradeData = parseGradeJson(sub.grade_json);

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
                  background: '#44475a',
                  color: '#f8f8f2',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                AI score: {sub.ai_score} / {sub.ai_possible}
              </div>
            </div>

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
                {gradeData.criteria.map((c) => (
                  <div
                    key={c.id}
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#f8f8f2' }}
                  >
                    <span>{c.title}</span>
                    <span style={{ color: '#6272a4' }}>
                      {c.earned !== undefined ? c.earned : '?'}/{c.points}
                    </span>
                  </div>
                ))}
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
                Student response
              </div>
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
                {sub.written_response || '(no response)'}
              </div>
            </div>

            {/* Override form */}
            <OverrideForm submissionId={sub.id} onOverride={handleOverride} />
          </div>
        );
      })}
    </div>
  );
}
