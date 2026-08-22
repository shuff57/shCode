'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NeedsAttentionData {
  inactive: Array<{ student_email: string; last_active: number; days_since_active: number }>;
  failed_submission: Array<{ student_email: string; lesson_id: string; score: number; possible: number; submitted_at: number }>;
  stuck: Array<{ student_email: string; lesson_id: string; started_at: number; days_since_started: number }>;
  /** Newest submission is an attempt the AI grader failed on — needs a human. */
  awaiting_grade?: Array<{ student_email: string; lesson_id: string; submitted_at: number; days_waiting: number }>;
}

interface Props {
  classId: string;
  onOpenStudent: (email: string) => void;
  onOpenTeacherEdit: (studentEmail: string, lessonId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionStyle: React.CSSProperties = {
  marginBottom: 8,
};

const summaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '8px 12px',
  background: '#282a36',
  border: '1px solid #44475a',
  borderRadius: 4,
  color: '#f8f8f2',
  fontWeight: 600,
  fontSize: '0.88rem',
  userSelect: 'none',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: '8px 12px',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const itemStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#1e1f29',
  border: '1px solid #44475a',
  borderRadius: 4,
  fontSize: '0.84rem',
  color: '#f8f8f2',
  lineHeight: 1.45,
};

const clickableStyle: React.CSSProperties = {
  color: '#8be9fd',
  cursor: 'pointer',
  textDecoration: 'underline',
};

const mutedStyle: React.CSSProperties = {
  color: '#6272a4',
  fontSize: '0.78rem',
};

// Orange, matching the gradebook's "⋯" cell and the review queue's badge, so
// the three places that talk about an ungraded attempt look like one thing.
const awaitingSummaryStyle: React.CSSProperties = {
  ...summaryStyle,
  borderColor: '#ffb86c',
  color: '#ffb86c',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NeedsAttentionPanel({ classId, onOpenStudent, onOpenTeacherEdit }: Props) {
  const [data, setData] = useState<NeedsAttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/classes/${encodeURIComponent(classId)}/needs-attention`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text().catch(() => 'Unknown error');
          throw new Error(msg || `${res.status}`);
        }
        return res.json();
      })
      .then((json: NeedsAttentionData) => {
        if (mounted) setData(json);
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
  }, [classId]);

  if (loading) {
    return (
      <div style={{ color: '#6272a4', fontStyle: 'italic', padding: 16, fontSize: '0.88rem' }}>
        Loading attention data...
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

  if (!data) return null;

  const awaiting = data.awaiting_grade ?? [];

  const hasAny =
    data.inactive.length > 0 ||
    data.failed_submission.length > 0 ||
    data.stuck.length > 0 ||
    awaiting.length > 0;

  if (!hasAny) {
    return (
      <div style={{ color: '#50fa7b', padding: 16, fontSize: '0.88rem' }}>
        All students are on track.
      </div>
    );
  }

  return (
    <div>
      {/* Awaiting a grade — first, and open by default. Every other category
          describes a student who is behind; this one describes work that is
          already done and waiting on us, so it is the only one a teacher can
          clear the same minute they see it. */}
      {awaiting.length > 0 && (
        <details open style={sectionStyle}>
          <summary style={awaitingSummaryStyle}>
            Awaiting a grade ({awaiting.length})
          </summary>
          <div style={listStyle}>
            <div style={{ ...mutedStyle, padding: '0 10px' }}>
              The AI grader failed on these, so nothing scored them. The answers are
              in the review queue — open a lesson to mark it by hand.
            </div>
            {awaiting.map((item, i) => (
              <div key={`${item.student_email}-${item.lesson_id}-${i}`} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenStudent(item.student_email);
                  }}
                >
                  {item.student_email}
                </span>
                <span style={mutedStyle}>{' '}&middot; lesson{' '}</span>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenTeacherEdit(item.student_email, item.lesson_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenTeacherEdit(item.student_email, item.lesson_id);
                  }}
                >
                  {item.lesson_id}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; waiting {item.days_waiting} day{item.days_waiting === 1 ? '' : 's'}
                  {' '}&middot; {formatTs(item.submitted_at)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Inactive */}
      {data.inactive.length > 0 && (
        <details open style={sectionStyle}>
          <summary style={summaryStyle}>
            Inactive ({data.inactive.length})
          </summary>
          <div style={listStyle}>
            {data.inactive.map((item) => (
              <div key={item.student_email} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenStudent(item.student_email);
                  }}
                >
                  {item.student_email}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.days_since_active} day{item.days_since_active === 1 ? '' : 's'} since last activity
                  {' '}&middot; last active {formatTs(item.last_active)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Failed submissions */}
      {data.failed_submission.length > 0 && (
        <details style={sectionStyle}>
          <summary style={summaryStyle}>
            Failed submissions ({data.failed_submission.length})
          </summary>
          <div style={listStyle}>
            {data.failed_submission.map((item, i) => (
              <div key={`${item.student_email}-${item.lesson_id}-${i}`} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenStudent(item.student_email);
                  }}
                >
                  {item.student_email}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; lesson{' '}
                </span>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenTeacherEdit(item.student_email, item.lesson_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenTeacherEdit(item.student_email, item.lesson_id);
                  }}
                >
                  {item.lesson_id}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.score}/{item.possible}
                  {' '}&middot; {formatTs(item.submitted_at)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Stuck */}
      {data.stuck.length > 0 && (
        <details style={sectionStyle}>
          <summary style={summaryStyle}>
            Stuck in progress ({data.stuck.length})
          </summary>
          <div style={listStyle}>
            {data.stuck.map((item, i) => (
              <div key={`${item.student_email}-${item.lesson_id}-${i}`} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenStudent(item.student_email);
                  }}
                >
                  {item.student_email}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; lesson{' '}
                </span>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenTeacherEdit(item.student_email, item.lesson_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpenTeacherEdit(item.student_email, item.lesson_id);
                  }}
                >
                  {item.lesson_id}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.days_since_started} day{item.days_since_started === 1 ? '' : 's'} stuck
                  {' '}&middot; started {formatTs(item.started_at)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
