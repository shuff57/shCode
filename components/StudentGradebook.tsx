'use client';

// The student's own gradebook, rendered on /progress.
//
// The teacher has had a full per-lesson matrix since classes/[id]/gradebook.ts
// landed; the student had a score percent on their last five completed lessons
// and nothing else. This renders the same cell the teacher sees, scoped to the
// caller by /api/my-gradebook, so a number on this page can be traced to a
// submission, a due date, and — when a teacher overrode the AI grader — the
// comment they wrote, which has been stored in grade_json from day one and was
// until now rendered by nothing at all.

import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { formatDue } from '../lib/due-dates-core';
import { sortLessons } from '../lib/lesson-order';
// Status derivation is shared with the endpoint that builds these cells, so
// the page and the teacher's gradebook can never disagree about whether a
// student is behind. See lib/gradebook-cell.ts.
import {
  cellStatus,
  needsAttention,
  type CellStatus,
  type GradebookCell,
} from '../lib/gradebook-cell';

interface ManifestLesson {
  id: string;
  title: string;
  unit?: string;
  type?: string;
}

interface Props {
  lessons: ManifestLesson[];
}

type Filter = 'all' | 'attention';

const STATUS_LABEL: Record<CellStatus, string> = {
  pending: 'Awaiting teacher',
  done: 'Completed',
  'done-late': 'Completed late',
  started: 'In progress',
  missing: 'Missing',
  'not-started': 'Not started',
};

const STATUS_COLOR: Record<CellStatus, string> = {
  pending: '#f1fa8c',
  done: '#50fa7b',
  'done-late': '#ffb86c',
  started: '#8be9fd',
  missing: '#ff5555',
  'not-started': '#94a3b8',
};

/** Score text for one cell.
 *
 *  Most rubrics in this course grade pass/fail with every criterion worth 0
 *  points (see lib/grade-pass.ts), so `possible` is 0 far more often than it is
 *  a real total. "17/0" would be worse than showing nothing, so raw points
 *  appear only when there are points to show. */
function scoreText(cell: GradebookCell): string | null {
  const hasPoints = cell.possible != null && cell.possible > 0 && cell.submittedScore != null;
  if (hasPoints && cell.score != null) return `${cell.submittedScore}/${cell.possible} · ${cell.score}%`;
  if (hasPoints) return `${cell.submittedScore}/${cell.possible}`;
  if (cell.score != null) return `${cell.score}%`;
  return null;
}

export default function StudentGradebook({ lessons }: Props) {
  const [cells, setCells] = useState<Record<string, GradebookCell> | null>(null);
  const [dueDates, setDueDates] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/my-gradebook', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`my-gradebook ${r.status}`);
        return r.json();
      })
      .then((d: { cells?: Record<string, GradebookCell>; dueDates?: Record<string, number> }) => {
        if (cancelled) return;
        setCells(d.cells ?? {});
        setDueDates(d.dueDates ?? {});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <div style={cardStyle}>
        <h3 style={headingStyle}>Assignments</h3>
        <p style={mutedStyle}>
          Could not load your assignment list right now. Nothing is lost — reload the page to try again.
        </p>
      </div>
    );
  }

  if (!cells) {
    return (
      <div style={cardStyle}>
        <h3 style={headingStyle}>Assignments</h3>
        <p style={mutedStyle}>Loading assignments...</p>
      </div>
    );
  }

  // Walk the manifest rather than the response: D1 hands rows back in
  // whatever order it likes. Sort here rather than trusting the caller —
  // the manifest arrives in folder-id order, which reads 1.1.19, 1.1.2,
  // 1.1.20 down the Assignment column. See lib/lesson-order.ts.
  const rows = sortLessons(lessons)
    .filter((l) => cells[l.id])
    .map((l) => {
      const cell = cells[l.id];
      return { lesson: l, cell, status: cellStatus(cell) };
    });

  const attentionCount = rows.filter((r) => needsAttention(r.status)).length;
  const shown = filter === 'attention' ? rows.filter((r) => needsAttention(r.status)) : rows;

  return (
    <div style={cardStyle}>
      <div style={toolbarStyle}>
        {/* marginRight:auto, not flex:1 — flex:1 lets the heading shrink to
            nothing on a phone and its text then overlaps the filter pills
            instead of pushing them onto the next line. */}
        <h3 style={{ margin: 0, marginRight: 'auto' }}>Assignments</h3>
        <button type="button" onClick={() => setFilter('all')} style={filter === 'all' ? tabActive : tabIdle}>
          All ({rows.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('attention')}
          style={filter === 'attention' ? tabActive : tabIdle}
        >
          Needs attention ({attentionCount})
        </button>
      </div>

      {rows.length === 0 ? (
        <p style={mutedStyle}>
          Nothing here yet. An assignment shows up once you start it, or once its due date passes.
        </p>
      ) : shown.length === 0 ? (
        <p style={mutedStyle}>Nothing needs your attention — everything is done and on time.</p>
      ) : (
        <div style={scrollWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={theadRowStyle}>
                <th style={thStyle}>Assignment</th>
                <th style={thStyle}>Due</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ lesson, cell, status }) => {
                const due = dueDates[lesson.id];
                const score = scoreText(cell);
                const hasFeedback = !!cell.teacherFeedback;
                const open = hasFeedback && !!expanded[lesson.id];
                return (
                  <Fragment key={lesson.id}>
                    <tr style={rowStyle}>
                      <td style={tdStyle}>
                        {hasFeedback ? (
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [lesson.id]: !open }))}
                            aria-expanded={open}
                            style={toggleStyle}
                          >
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{lesson.title}</span>
                            <MessageSquare size={13} style={{ color: '#bd93f9', flexShrink: 0 }} />
                          </button>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{lesson.title}</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, opacity: 0.65 }}>
                        {due ? formatDue(due) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{ ...badgeStyle, color: STATUS_COLOR[status], borderColor: STATUS_COLOR[status] }}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td style={scoreCellStyle}>{score ?? '—'}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={4} style={{ padding: '0 0 12px 0' }}>
                          <div style={feedbackBoxStyle}>
                            <div style={feedbackHeadStyle}>
                              <MessageSquare size={13} />
                              Teacher review
                              {cell.teacherReviewedAt ? ` · ${formatDue(cell.teacherReviewedAt)}` : ''}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{cell.teacherFeedback}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={legendStyle}>
        <strong style={{ color: STATUS_COLOR.pending }}>Awaiting teacher</strong> means your work was
        handed in but the automatic grader could not score it. Your teacher will grade it by hand — you
        do not need to submit it again.
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1e1f29',
  border: '1px solid #44475a',
  borderRadius: 8,
  padding: '20px 24px',
  marginBottom: 20,
};

const headingStyle: React.CSSProperties = {
  margin: '0 0 14px 0',
  borderBottom: '1px solid #44475a',
  paddingBottom: 8,
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  borderBottom: '1px solid #44475a',
  paddingBottom: 10,
  marginBottom: 14,
};

const mutedStyle: React.CSSProperties = { opacity: 0.5, fontSize: 14 };

// `body` is display:flex in globals.css, so /progress's container is a flex
// item with min-width:auto — it refuses to shrink below its content's
// min-content width, and a `min-width` on this table propagates all the way
// up and pushes the whole PAGE sideways on a phone. Measured at a 380px
// viewport: a 520px minWidth here cost 111px of body overflow on top of the
// 139px the site nav already causes. So the table has no floor of its own,
// the wrapper is a scroll container as a backstop for very long titles, and
// the Due column and status badge are allowed to wrap. Verified back down to
// exactly the 139px baseline.
const scrollWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const theadRowStyle: React.CSSProperties = {
  textAlign: 'left',
  opacity: 0.55,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const rowStyle: React.CSSProperties = { borderTop: '1px solid rgba(68,71,90,0.4)' };

const thStyle: React.CSSProperties = { padding: '4px 10px 8px 0', fontWeight: 600 };

const tdStyle: React.CSSProperties = { padding: '9px 10px 9px 0', verticalAlign: 'top' };

const scoreCellStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  fontWeight: 600,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 12,
  border: '1px solid',
  borderRadius: 999,
  padding: '2px 10px',
  fontWeight: 600,
  display: 'inline-block',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'none',
  border: 'none',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 500,
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

const feedbackBoxStyle: React.CSSProperties = {
  background: 'rgba(189,147,249,0.08)',
  border: '1px solid rgba(189,147,249,0.35)',
  borderRadius: 6,
  padding: '10px 14px',
  fontSize: 14,
};

const feedbackHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  opacity: 0.7,
  marginBottom: 6,
};

const legendStyle: React.CSSProperties = {
  opacity: 0.5,
  fontSize: 12,
  marginTop: 14,
  marginBottom: 0,
  lineHeight: 1.6,
};

const tabIdle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #44475a',
  borderRadius: 999,
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 12px',
  cursor: 'pointer',
};

const tabActive: React.CSSProperties = {
  ...tabIdle,
  background: 'rgba(189,147,249,0.15)',
  borderColor: '#bd93f9',
  color: '#bd93f9',
};
