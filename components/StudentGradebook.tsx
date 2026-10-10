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
import { lessonHref } from '../lib/lesson-href';
import { lessonGradeCategory, lessonPercent, type GradeCategory } from '../lib/grading-weights';
// Status derivation is shared with the endpoint that builds these cells, so
// the page and the teacher's gradebook can never disagree about whether a
// student is behind. See lib/gradebook-cell.ts.
import {
  cellStatus,
  needsAttention,
  practiceDisplay,
  type CellStatus,
  type GradebookCell,
} from '../lib/gradebook-cell';

interface ManifestLesson {
  id: string;
  title: string;
  unit?: string;
  type?: string;
  /** Quiz questions, rubric points, or pass/fail criteria; null = completion is the grade. */
  maxScore?: number | null;
  /** Grade-category inputs (lib/grading-weights.ts lessonGradeCategory), all on the manifest row. */
  preview?: string | null;
  assignmentCode?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
}

interface Props {
  lessons: ManifestLesson[];
}

/** One class's grade so far, from /api/my-gradebook (functions/_shared/grading.ts studentGrading). */
interface ClassGrade {
  classId: string;
  className: string;
  percent: number;
  gradedTotal: number;
  doneCount: number;
  counted: number;
  missingCount: number;
}

type Filter = 'all' | 'attention' | 'progress';

/** Short names for the chip beside each assignment: which part of the grade it counts toward. */
const CATEGORY_SHORT: Record<GradeCategory, string> = {
  lab: 'Lab',
  group: 'Group assessment',
  written: 'Written',
  quiz: 'Quiz',
  chapterTest: 'Chapter test',
  finalExam: 'Final exam',
  q1: 'Q1 project',
  q2: 'Q2 project',
  q4: 'Q4 project',
};

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
 *  The percent is lessonPercent() -- the SAME function the grade the teacher syncs is built
 *  from (functions/_shared/grading.ts) -- over lesson_state.score, which is raw POINTS (see
 *  lib/gradebook-cell.ts), so it is never printed as if it were already a percent. It used to
 *  be: a chart lesson stored 0 points and showed "9/9 · 0%" beside a grade of 100.
 *
 *  Raw points of the latest attempt appear only when there are points to show: most rubrics
 *  grade pass/fail with every criterion worth 0 points (lib/grade-pass.ts), so `possible` is 0
 *  far more often than it is a real total, and "17/0" would be worse than showing nothing. */
function scoreText(cell: GradebookCell, maxScore: number | null | undefined): string | null {
  const hasPoints = cell.possible != null && cell.possible > 0 && cell.submittedScore != null;
  const percent = cell.state === 'completed' ? lessonPercent(cell.state, cell.score, maxScore) : null;
  // The recorded grade is the BEST attempt (lesson_state.score), so when the lesson has a max the
  // points shown are that best score out of the max, never the latest attempt's: "3/8 \u00b7 50%"
  // paired the last try's 3 with the best try's 4-of-8.
  if (percent != null && maxScore != null && maxScore > 0 && cell.score != null) {
    return `${Math.round(cell.score * 100) / 100}/${maxScore} \u00b7 ${percent}%`;
  }
  if (hasPoints && percent != null) return `${cell.submittedScore}/${cell.possible} · ${percent}%`;
  if (hasPoints) return `${cell.submittedScore}/${cell.possible}`;
  if (percent != null) return `${percent}%`;
  return null;
}

export default function StudentGradebook({ lessons }: Props) {
  const [cells, setCells] = useState<Record<string, GradebookCell> | null>(null);
  const [dueDates, setDueDates] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<ClassGrade[]>([]);
  const [tries, setTries] = useState<Record<string, { used: number; cap: number }>>({});
  const [opensAt, setOpensAt] = useState<Record<string, number>>({});
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
      .then((d: { cells?: Record<string, GradebookCell>; dueDates?: Record<string, number>; grades?: ClassGrade[]; tries?: Record<string, { used: number; cap: number }>; opensAt?: Record<string, number> }) => {
        if (cancelled) return;
        setCells(d.cells ?? {});
        setDueDates(d.dueDates ?? {});
        setGrades((d.grades ?? []).filter((g) => g.counted > 0));
        setTries(d.tries ?? {});
        setOpensAt(d.opensAt ?? {});
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
      const status = cellStatus(cell);
      const t = tries[l.id];
      // Tried and not passing: they handed something in, so "Not started" would be untrue.
      const tried = !!t && t.used > 0 && cell.state !== 'completed' && status !== 'pending';
      const opens = opensAt[l.id] && cell.state !== 'completed' && !tried ? opensAt[l.id] : null;
      return { lesson: l, cell, status, tried, opens, t };
    })
    // A reading, slide deck or example has a due date through its module but no grade, so one the
    // student never opened is not "Missing": it is not an assignment. Ones they did open still show.
    .filter(({ lesson, status }) => {
      if (status !== 'missing' && status !== 'not-started') return true;
      return lessonGradeCategory({ title: lesson.title, preview: lesson.preview, scoreKind: lesson.scoreKind, assignmentCode: lesson.assignmentCode }) !== null;
    });

  // "Missing or late" is what a student can still act on or should know about; "In progress" is
  // work they have started and not finished. They used to be one "Needs attention" list, which told
  // a student halfway through a lesson that something was wrong.
  const isMissingOrLate = (st: CellStatus) => st !== 'started' && needsAttention(st);
  const attentionCount = rows.filter((r) => isMissingOrLate(r.status)).length;
  const nowMs = Date.now();
  const isInProgress = (r: { status: CellStatus; tried: boolean }) => r.status === 'started' || (r.tried && r.status === 'not-started');
  const progressCount = rows.filter(isInProgress).length;
  const shown =
    filter === 'attention'
      ? rows.filter((r) => isMissingOrLate(r.status))
      : filter === 'progress'
        ? rows.filter(isInProgress)
        : rows;

  return (
    <>
    {grades.length > 0 && (
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 10px 0' }}>Your grade so far</h3>
        {grades.map((g) => (
          <div key={g.classId} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{g.percent}%</span>
              <span style={{ opacity: 0.7 }}>{grades.length > 1 ? g.className : 'in your class'}</span>
            </div>
            <div style={{ opacity: 0.6, fontSize: 13, marginTop: 2 }}>
              Counts work that is done plus work past its due date. Lessons not due yet are left out.
              {' '}{g.doneCount} of {g.gradedTotal} graded lessons done
              {g.missingCount > 0 ? ` \u00b7 ${g.missingCount} past due and not done` : ''}.
            </div>
          </div>
        ))}
        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13 }}>How your grade works</summary>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, listStyle: 'disc', fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>
            <li>Each graded assignment counts toward a part of your grade (Lab, Written, Quiz, Chapter test). The chip beside each assignment below says which part.</li>
            <li>Where an assignment allows several tries, your best try is the one that counts, not the latest.</li>
            <li>An assignment past its due date that is not done counts as 0 until you finish it. Turning it in later replaces the 0.</li>
            <li>An assignment that is not due yet does not count against you.</li>
            <li>Handing something in late is marked &ldquo;Completed late&rdquo; so your teacher can see it. It does not lower the percent shown here.</li>
          </ul>
        </details>
      </div>
    )}
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
          Missing or late ({attentionCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('progress')}
          style={filter === 'progress' ? tabActive : tabIdle}
        >
          In progress ({progressCount})
        </button>
      </div>

      {rows.length === 0 ? (
        <p style={mutedStyle}>
          Nothing here yet. An assignment shows up once you start it, or once its due date passes.
        </p>
      ) : shown.length === 0 ? (
        <p style={mutedStyle}>
          {filter === 'progress'
            ? 'Nothing is half-finished right now.'
            : 'Nothing is missing or late. Everything past its due date is done.'}
        </p>
      ) : (
        <div style={scrollWrapStyle} tabIndex={0} role="region" aria-label="Assignments table">
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
              {shown.map(({ lesson, cell, status, tried, opens, t }) => {
                const due = dueDates[lesson.id];
                const category = lessonGradeCategory({
                  title: lesson.title,
                  preview: lesson.preview,
                  scoreKind: lesson.scoreKind,
                  assignmentCode: lesson.assignmentCode,
                });
                // Finished work that does not count toward the grade says so instead of "100%".
                const practice = practiceDisplay(category !== null, status);
                const score = practice ? null : scoreText(cell, lesson.maxScore);
                // Tried and not passing: say what they have and how many tries are left.
                const left = t ? Math.max(0, t.cap - t.used) : 0;
                const statusLabel = opens
                  ? `Opens ${formatDue(opens)}`
                  : tried
                    ? left > 0 ? `Tried \u00b7 ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Tried \u00b7 no tries left'
                    : practice ? practice.statusLabel : STATUS_LABEL[status];
                const statusColor = opens ? '#94a3b8' : tried ? '#bd93f9' : STATUS_COLOR[status];
                const bestText = tried
                  ? cell.score != null && lesson.maxScore
                    ? `best ${Math.round(cell.score * 100) / 100}/${lesson.maxScore}`
                    : cell.possible != null && cell.possible > 0 && cell.submittedScore != null
                      ? `latest ${cell.submittedScore}/${cell.possible}`
                      : null
                  : null;
                const dueSoon = !!due && due > nowMs && due - nowMs <= 7 * 86400000 && status !== 'done' && status !== 'done-late';
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
                          <a href={lessonHref(lesson)} style={{ fontWeight: 500, color: 'inherit' }}>
                            {lesson.title}
                          </a>
                        )}
                        {hasFeedback && (
                          <a
                            href={lessonHref(lesson)}
                            aria-label={`Open ${lesson.title}`}
                            title="Open lesson"
                            style={{ marginLeft: 6, color: '#8393c4', fontSize: 12 }}
                          >
                            Open
                          </a>
                        )}
                        {practice && (
                          <span style={{ ...chipStyle, borderColor: 'transparent', color: '#8393c4' }} title="This lesson is practice. It does not count toward your grade.">
                            <span className="gb-practice-full">{practice.tag}</span>
                            <span className="gb-practice-short" aria-hidden="true">Practice</span>
                          </span>
                        )}
                        {category && (
                          <span
                            style={chipStyle}
                            title={`Counts toward the ${CATEGORY_SHORT[category].toLowerCase()} part of your grade`}
                          >
                            {CATEGORY_SHORT[category]}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, opacity: dueSoon ? 1 : 0.65 }}>
                        {due ? formatDue(due) : '—'}
                        {dueSoon && <span style={{ ...chipStyle, color: '#ffb86c', borderColor: '#ffb86c' }}>due soon</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ ...badgeStyle, color: statusColor, borderColor: statusColor }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={scoreCellStyle}>
                        {bestText ?? score ?? '\u2014'}
                        {t && t.used > 0 && !tried && (
                          <div style={{ opacity: 0.55, fontSize: 11 }}>
                            {t.used} of {t.cap} {t.cap === 1 ? 'try' : 'tries'} used
                          </div>
                        )}
                        {cell.teacherReviewedAt != null && (
                          <div
                            style={{ color: '#bd93f9', fontSize: 11 }}
                            title="Your teacher reviewed this work and may have changed the score"
                          >
                            teacher-adjusted
                          </div>
                        )}
                      </td>
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
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1e1f29',
  border: '1px solid #44475a',
  borderRadius: 8,
  padding: '20px 24px',
  marginBottom: 20,
  minWidth: 0,
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
  maxWidth: '100%',
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

const chipStyle: React.CSSProperties = {
  marginLeft: 8,
  padding: '1px 7px',
  borderRadius: 10,
  border: '1px solid #6272a4',
  color: '#a9b7e0',
  fontSize: 11,
  whiteSpace: 'nowrap',
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
