'use client';

import { useEffect, useState } from 'react';
import { lessonLabel } from '../lib/lesson-title-order';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NeedsAttentionData {
  inactive: Array<{ student_email: string; last_active: number | null; days_since_active: number }>;
  failed_submission: Array<{ student_email: string; lesson_id: string; score: number; possible: number; submitted_at: number }>;
  stuck: Array<{ student_email: string; lesson_id: string; started_at: number; days_since_started: number }>;
  /** Newest submission is an attempt the AI grader failed on — needs a human. */
  awaiting_grade?: Array<{ student_email: string; lesson_id: string; submitted_at: number; days_waiting: number }>;
}

interface Props {
  classId: string;
  /** lesson id -> title, so an item says "3.3.14 Filter" rather than a folder id. */
  lessonTitles?: Record<string, string>;
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
  marginBottom: 0,
};

const summaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '8px 12px',
  background: 'var(--c-bg)',
  border: '1px solid var(--c-line)',
  borderRadius: 16,
  color: 'var(--c-fg)',
  fontWeight: 600,
  fontSize: 14,
  userSelect: 'none',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: '12px 16px',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const itemStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--c-deep)',
  border: '1px solid var(--c-line)',
  borderRadius: 4,
  fontSize: 13,
  color: 'var(--c-fg)',
  lineHeight: 1.45,
};

const clickableStyle: React.CSSProperties = {
  color: 'var(--c-cyan)',
  cursor: 'pointer',
  textDecoration: 'underline',
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--c-meta)',
  fontSize: 13,
};

// Orange, matching the gradebook's "⋯" cell and the review queue's badge, so
// the three places that talk about an ungraded attempt look like one thing.
const awaitingSummaryStyle: React.CSSProperties = {
  ...summaryStyle,
  borderColor: 'var(--c-orange)',
  color: 'var(--c-orange)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NeedsAttentionPanel({ classId, lessonTitles, onOpenStudent, onOpenTeacherEdit }: Props) {
  const [data, setData] = useState<NeedsAttentionData | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
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
      <div style={{ color: 'var(--c-meta)', fontStyle: 'italic', padding: 16, fontSize: 14 }}>
        Loading attention data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'var(--c-red)', padding: 16, fontSize: 14 }}>
        Failed to load: {error}
      </div>
    );
  }

  if (!data) return null;

  const awaiting = data.awaiting_grade ?? [];
  const shown = <T,>(key: string, items: T[]) => showAll[key] ? items : items.slice(0, 3);
  const moreButton = (key: string, count: number) => count > 3 && !showAll[key] ? (
    <button type="button" onClick={() => setShowAll((prev) => ({ ...prev, [key]: true }))} style={{ alignSelf: 'flex-start', margin: '0 12px 8px', padding: '4px 8px', border: '1px solid var(--c-line)', borderRadius: 4, background: 'var(--c-bg)', color: 'var(--c-cyan)', cursor: 'pointer', font: 'inherit', fontSize: 12 }}>
      Show all {count}
    </button>
  ) : null;

  const hasAny =
    data.inactive.length > 0 ||
    data.failed_submission.length > 0 ||
    data.stuck.length > 0 ||
    awaiting.length > 0;

  if (!hasAny) {
    return (
      <div style={{ color: 'var(--c-green)', padding: 16, fontSize: 14 }}>
        All students are on track.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
      {awaiting.length > 0 && (
        <details onToggle={(e) => { const open = e.currentTarget.open; setExpanded((prev) => ({ ...prev, awaiting: open })); }} style={{ ...sectionStyle, width: expanded.awaiting ? '100%' : undefined }}>
          <summary style={awaitingSummaryStyle}>{awaiting.length} awaiting a grade</summary>
          <div style={listStyle}>
            {shown('awaiting', awaiting).map((item) => (
              <div key={`${item.student_email}-${item.lesson_id}`} style={itemStyle}>
                <button type="button" onClick={() => onOpenTeacherEdit(item.student_email, item.lesson_id)} style={{ ...clickableStyle, background: 'none', border: 0, padding: 0, font: 'inherit', textAlign: 'left' }}>
                  {item.student_email} · {lessonLabel(item.lesson_id, lessonTitles)}
                </button>
              </div>
            ))}
            {moreButton('awaiting', awaiting.length)}
            <a href="#submission-review-queue" style={clickableStyle}>Review queue →</a>
          </div>
        </details>
      )}

      {/* Inactive */}
      {data.inactive.length > 0 && (
        <details onToggle={(e) => { const open = e.currentTarget.open; setExpanded((prev) => ({ ...prev, inactive: open })); }} style={{ ...sectionStyle, width: expanded.inactive ? '100%' : undefined }}>
          <summary style={summaryStyle}>
            {data.inactive.length} inactive
          </summary>
          <div style={listStyle}>
            {shown('inactive', data.inactive).map((item) => (
              <div key={item.student_email} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStudent(item.student_email); }
                  }}
                >
                  {item.student_email}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.days_since_active} day{item.days_since_active === 1 ? '' : 's'} since last activity
                  {' '}&middot; {item.last_active !== null ? `last active ${formatTs(item.last_active)}` : 'never opened a lesson'}
                </span>
              </div>
            ))}
            {moreButton('inactive', data.inactive.length)}
          </div>
        </details>
      )}

      {/* Failed submissions */}
      {data.failed_submission.length > 0 && (
        <details onToggle={(e) => { const open = e.currentTarget.open; setExpanded((prev) => ({ ...prev, failed: open })); }} style={{ ...sectionStyle, width: expanded.failed ? '100%' : undefined }}>
          <summary style={summaryStyle}>
            {data.failed_submission.length} failed
          </summary>
          <div style={listStyle}>
            {shown('failed', data.failed_submission).map((item, i) => (
              <div key={`${item.student_email}-${item.lesson_id}-${i}`} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStudent(item.student_email); }
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
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTeacherEdit(item.student_email, item.lesson_id); }
                  }}
                >
                  {lessonLabel(item.lesson_id, lessonTitles)}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.score}/{item.possible}
                  {' '}&middot; {formatTs(item.submitted_at)}
                </span>
              </div>
            ))}
            {moreButton('failed', data.failed_submission.length)}
          </div>
        </details>
      )}

      {/* Stuck */}
      {data.stuck.length > 0 && (
        <details onToggle={(e) => { const open = e.currentTarget.open; setExpanded((prev) => ({ ...prev, stuck: open })); }} style={{ ...sectionStyle, width: expanded.stuck ? '100%' : undefined }}>
          <summary style={summaryStyle}>
            {data.stuck.length} stuck
          </summary>
          <div style={listStyle}>
            {shown('stuck', data.stuck).map((item, i) => (
              <div key={`${item.student_email}-${item.lesson_id}-${i}`} style={itemStyle}>
                <span
                  style={clickableStyle}
                  onClick={() => onOpenStudent(item.student_email)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenStudent(item.student_email); }
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
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTeacherEdit(item.student_email, item.lesson_id); }
                  }}
                >
                  {lessonLabel(item.lesson_id, lessonTitles)}
                </span>
                <span style={mutedStyle}>
                  {' '}&middot; {item.days_since_started} day{item.days_since_started === 1 ? '' : 's'} stuck
                  {' '}&middot; started {formatTs(item.started_at)}
                </span>
              </div>
            ))}
            {moreButton('stuck', data.stuck.length)}
          </div>
        </details>
      )}
    </div>
  );
}
