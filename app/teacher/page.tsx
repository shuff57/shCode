'use client';

import LessonModeControl from '../../components/LessonModeControl';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NeedsAttentionPanel } from '../../components/NeedsAttentionPanel';
import { BulkEnrollmentForm } from '../../components/BulkEnrollmentForm';
import { SubmissionQueue } from '../../components/SubmissionQueue';
import { AnnouncementsPanel } from '../../components/AnnouncementsPanel';
import DueDatesPanel from '../../components/DueDatesPanel';
import PastDuePanel from '../../components/PastDuePanel';
import { formatDue, schoolDateString } from '../../lib/due-dates-core';
import { lessonHref } from '../../lib/lesson-href';
import { toMermaid } from '../../lib/diagram-mermaid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassSummary {
  id: string;
  name: string;
  code: string;
  owner_email: string;
  school_year: string | null;
  created_at: string;
  archived_at: string | null;
  role: 'owner' | 'co-teacher';
  student_count: number;
}

interface RosterRow {
  student_email: string;
  enrolled_at: string;
  enrolled_by: string | null;
  expires_at: string | null;
}

interface CoTeacherRow {
  teacher_email: string;
  added_at: number;
  added_by: string | null;
}

interface ClassDetail {
  class: ClassSummary;
  isOwner: boolean;
  roster: RosterRow[];
  coTeachers: CoTeacherRow[];
}

interface StudentProgress {
  student_email: string;
  completed_count: number;
  started_count: number;
  last_active: number | null;
  total_score: number;
}

interface LessonStateEntry {
  state: 'started' | 'completed';
  started_at: number | null;
  completed_at: number | null;
  score: number | null;
}

interface SubmissionEntry {
  id: string;
  submitted_at: number;
  score: number | null;
  possible: number | null;
  grade_json: string | null;
  /** The student's own answer. A diagram assignment stores its DiagramDoc here. */
  response: string | null;
}

interface StudentDetail {
  student_email: string;
  lessonState: Record<string, LessonStateEntry>;
  latestSubmissions: Record<string, SubmissionEntry>;
}

interface LessonMeta {
  id: string;
  title: string;
  unit: string | null;
  preview: string | null;
  /** 'lesson' | 'assignment' | 'project'. Decides the /lesson vs /assignment
   *  prefix — see lib/lesson-href.ts for why guessing it is not safe. */
  type?: string | null;
}

/**
 * Previews that open a real code workspace in /teacher-edit — which is a code
 * editor and nothing else: a file list, CodeMirror, and the student's commits.
 *
 * An allowlist, not a blocklist. The blocklist it replaced named only slides,
 * video and reading, so `diagram` (23 lessons), `assignment` (16) and `quiz`
 * (14) all counted as code: their gradebook cells were clickable and the
 * student drawer offered "Open in editor", and every one of those clicks left
 * the teacher in an empty editor with no commits, having lost their place in
 * the matrix. Listing what IS code means the next preview type added defaults
 * to "not code" instead of silently joining that list.
 */
const CODE_PREVIEWS = new Set(['console', 'example', 'moshion']);

// A student's lesson_state/commits rows can reference an id from before a
// renumbering (ids recycle across years — see project memory). That id no
// longer appears in the manifest, so meta.unit is null. Rather than dump it
// in "Other", borrow the unit label from any manifest lesson sharing the
// same "<unit>-<submodule>-" id prefix (e.g. "1-1-3-..." -> "1-1-").
function inferUnit(id: string, lessonMap: Map<string, LessonMeta>): string {
  const prefix = id.match(/^(\d+-\d+)-/)?.[1];
  if (!prefix) return 'Other';
  for (const meta of lessonMap.values()) {
    if (meta.unit && meta.id.startsWith(`${prefix}-`)) return meta.unit;
  }
  return 'Other';
}

interface GradebookCell {
  state: 'completed' | 'started' | null;
  score: number | null;
  submitted_score: number | null;
  possible: number | null;
  /** Past due and not completed, or completed after the due date. */
  late?: boolean;
  /** Handed in, but the AI grader failed on it — no score exists yet. */
  pending?: boolean;
}

interface GradebookStudent {
  email: string;
  cells: Record<string, GradebookCell>;
}

interface GradebookData {
  students: GradebookStudent[];
  /** lessonId -> resolved due date (epoch ms). Absent lessons have no date. */
  dueDates?: Record<string, number>;
}

// Mirrors CriterionResult in lib/grade-written-core.ts. The denominator field
// is `max`, not `possible` -- this interface said `possible` and the drawer
// rendered "0/" with nothing after the slash for every AI-graded criterion in
// the course. `possible` IS the right name one level up, on the submission and
// gradebook cell, which is how the two got confused.
interface GradeCriterion {
  id: string;
  title: string;
  earned: number;
  max: number;
  verdict?: 'met' | 'partial' | 'missing';
  feedback?: string;
}

// One structural check from lib/diagram-check.ts. Diagram assignments store
// these under `structural` instead of `criteria` -- 23 lessons across the
// course, one of them (2.2.7 / A5.2) AI-graded on top.
interface StructuralCheck {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
}

interface GradeResponse {
  totalEarned: number;
  totalPossible: number;
  criteria?: GradeCriterion[];
  /** Diagram assignments: the browser-side structural checks. */
  structural?: StructuralCheck[];
  /** Diagram assignments that also run the essay grader. */
  ai?: GradeResponse;
}

// Nearly every rubric in the course awards points: 0 per criterion and grades
// on the verdict, so totalPossible is 0 and any "x / y pts" rendering is "0 / 0
// pts" -- true, and useless to a teacher answering "why did my kid lose points
// on criterion 3". Show what the student was shown instead.
// A diagram assignment stores its DiagramDoc as the submission response.
// Returns the Mermaid projection when the response is one, null otherwise --
// which is also how the caller decides whether to label it a chart or prose.
// Raw DiagramDoc JSON is not something to show a teacher.
function asDiagramMermaid(response: string): string | null {
  if (!response.trimStart().startsWith('{')) return null;
  try {
    const doc = JSON.parse(response);
    if (!Array.isArray(doc?.nodes) || !Array.isArray(doc?.edges)) return null;
    return toMermaid(doc);
  } catch {
    return null;
  }
}

function criterionScore(c: GradeCriterion, passFail: boolean): string {
  if (passFail) return c.verdict ?? 'missing';
  return `${c.earned}/${c.max}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T; error: null } | { data: null; error: string; status: number }> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  if (res.ok) {
    const data = (await res.json()) as T;
    return { data, error: null };
  }
  let errorMsg = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) errorMsg = body.error;
  } catch {
    // ignore parse errors
  }
  return { data: null, error: errorMsg, status: res.status };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function fmtTs(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// CSV helper — no libraries, ~30 lines
// ---------------------------------------------------------------------------

function buildGradebookCsv(
  students: GradebookStudent[],
  lessonIds: string[],
  dueDates?: Record<string, number>,
): string {
  const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v);

  const header = ['student_email', ...lessonIds].map(escape).join(',');

  // Second header row carries each lesson's due date, so the export is
  // self-contained — a spreadsheet opened in March still says what was due.
  // Blank for lessons with no due date. Omitted entirely if the class sets none.
  const hasDue = dueDates && Object.keys(dueDates).length > 0;
  const dueRow = hasDue
    ? ['due_date', ...lessonIds.map((lid) => (dueDates![lid] ? schoolDateString(dueDates![lid]) : ''))]
        .map(escape)
        .join(',')
    : null;

  const rows = students.map((s) => {
    const cols = [s.email, ...lessonIds.map((lid) => {
      const c = s.cells[lid];
      if (!c) return '';
      // "L" suffix = late. Kept as a suffix rather than its own column so the
      // matrix stays one cell per lesson.
      const suffix = c.late ? 'L' : '';
      // Before the C branch. An outage row is state=completed with a NULL
      // score, so it would otherwise export as "C" — a finished lesson — into
      // the one file a teacher pastes straight into a grade system.
      if (c.pending) return 'P' + suffix;
      if (c.score !== null) return String(c.score) + suffix;
      if (c.state === 'completed') return 'C' + suffix;
      if (c.state === 'started') return 'S' + suffix;
      // Submitted, graded, and did NOT pass. WrittenGrader only writes a
      // lesson_state row when the grade passes, so a failing submission has
      // no state at all — and every branch above missed it, exporting the
      // same empty cell as a student who never opened the lesson. The matrix
      // on screen already had this branch; the CSV, which is the file a
      // teacher actually pastes into a grade system, did not.
      if (c.submitted_score !== null) return 's' + c.submitted_score + suffix;
      return suffix || '';
    })];
    return cols.map(escape).join(',');
  });

  return [header, ...(dueRow ? [dueRow] : []), ...rows].join('\r\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const S = {
  page: {
    minHeight: '100vh',
    background: '#282a36',
    color: '#f8f8f2',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#f8f8f2' } as React.CSSProperties,
  h2: { fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#f8f8f2' } as React.CSSProperties,

  card: {
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,

  btn: (color: string) =>
    ({
      background: color,
      color: '#282a36',
      border: 'none',
      borderRadius: 4,
      padding: '7px 14px',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
    }) as React.CSSProperties,

  btnDisabled: {
    background: '#44475a',
    color: '#6272a4',
    border: 'none',
    borderRadius: 4,
    padding: '7px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  input: {
    background: '#282a36',
    border: '1px solid #44475a',
    borderRadius: 4,
    color: '#f8f8f2',
    padding: '7px 12px',
    fontSize: 14,
    outline: 'none',
    minWidth: 220,
  } as React.CSSProperties,

  error: { color: '#ff5555', fontSize: 13, marginTop: 6 } as React.CSSProperties,

  badge: (archived: boolean) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      background: archived ? '#f1fa8c' : '#50fa7b',
      color: '#282a36',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }) as React.CSSProperties,

  code: {
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: 700,
    color: '#8be9fd',
    letterSpacing: '0.15em',
  } as React.CSSProperties,

  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    borderBottom: '1px solid #44475a',
    color: '#6272a4',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase' as const,
  },
  td: { padding: '8px 12px', borderBottom: '1px solid #44475a22', verticalAlign: 'middle' as const },
};

// ---------------------------------------------------------------------------
// StudentDrawer — right-side panel showing per-lesson progress
// ---------------------------------------------------------------------------

function StudentDrawer({
  classId,
  email,
  lessonMap,
  onClose,
}: {
  classId: string;
  email: string;
  lessonMap: Map<string, LessonMeta>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setErr('');
    apiFetch<StudentDetail>(
      `/api/classes/${classId}/students/${encodeURIComponent(email)}`,
    ).then((res) => {
      if (res.error !== null) {
        setErr(res.error);
      } else {
        setDetail(res.data);
      }
      setLoading(false);
    }).catch(() => {
      setErr('Network error');
      setLoading(false);
    });
  }, [classId, email]);

  function toggleSub(lessonId: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  // Group active lessons by unit. Only show lessons that have some state.
  const unitGroups: Array<{ unit: string; lessons: LessonMeta[] }> = [];
  if (detail) {
    const unitOrder: string[] = [];
    const byUnit: Record<string, LessonMeta[]> = {};

    // Union, not just lessonState. A free-response answer that was graded and
    // failed writes a lesson_submissions row and NO lesson_state row, so
    // keying off lessonState alone dropped the lesson out of this drawer
    // entirely — no row, no badge, no way in to the submission — for exactly
    // the students a teacher opens the drawer to find. The grade itself was
    // already sitting in detail.latestSubmissions, unread.
    const lessonIds = new Set([
      ...Object.keys(detail.lessonState),
      ...Object.keys(detail.latestSubmissions),
    ]);

    for (const id of lessonIds) {
      const meta = lessonMap.get(id) ?? { id, title: id, unit: null, preview: null };
      const u = meta.unit ?? inferUnit(id, lessonMap);
      if (!byUnit[u]) {
        byUnit[u] = [];
        unitOrder.push(u);
      }
      byUnit[u].push(meta);
    }

    // Natural-sort unit labels ("1.1" < "1.2" < ... < "2.1"); "Other" always last
    // so genuinely unrecognized ids don't scatter mid-list.
    unitOrder.sort((a, b) => {
      if (a === 'Other') return b === 'Other' ? 0 : 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    for (const u of unitOrder) {
      unitGroups.push({ unit: u, lessons: byUnit[u].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })) });
    }
  }

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 600,
    background: '#1e1f29',
    borderLeft: '1px solid #44475a',
    overflowY: 'auto',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  };

  // `submitted` covers the case with no lesson_state row at all but a graded
  // submission on file — a free-response answer that did not pass. Without
  // this it fell through to "Not started", which is the opposite of true and
  // worse than the missing row it replaced.
  function stateBadge(state: 'started' | 'completed' | undefined, submitted = false) {
    if (!state && submitted) {
      return (
        <span style={{ background: '#ffb86c', color: '#282a36', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          Submitted
        </span>
      );
    }
    if (state === 'completed') {
      return (
        <span style={{ background: '#50fa7b', color: '#282a36', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          Complete
        </span>
      );
    }
    if (state === 'started') {
      return (
        <span style={{ background: '#f1fa8c', color: '#282a36', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          In progress
        </span>
      );
    }
    return (
      <span style={{ background: '#44475a', color: '#6272a4', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        Not started
      </span>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div style={overlayStyle} onClick={onClose} />

      {/* Panel */}
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #44475a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8f8f2', marginBottom: 2 }}>
              Student Progress
            </div>
            <div style={{ fontSize: 13, color: '#8be9fd', fontFamily: 'monospace' }}>{email}</div>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: '#6272a4', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ color: '#6272a4' }}>Loading…</div>}
          {err && <div style={{ color: '#ff5555', fontSize: 13 }}>{err}</div>}
          {detail && unitGroups.length === 0 && (
            <p style={{ color: '#6272a4', fontSize: 14 }}>No lesson activity yet.</p>
          )}
          {detail && unitGroups.map(({ unit, lessons }) => (
            <div key={unit} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#bd93f9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {unit}
              </div>
              <div>
                {lessons.map((lesson) => {
                  const ls = detail.lessonState[lesson.id];
                  const sub = detail.latestSubmissions[lesson.id];
                  const isExpanded = expandedSubs.has(lesson.id);

                  let gradeData: GradeResponse | null = null;
                  if (sub?.grade_json) {
                    try {
                      gradeData = JSON.parse(sub.grade_json) as GradeResponse;
                    } catch {
                      // malformed grade_json — skip
                    }
                  }

                  return (
                    <div key={lesson.id} style={{ marginBottom: 8, background: '#282a36', borderRadius: 6, padding: '10px 14px', border: '1px solid #44475a33' }}>
                      {/* Lesson row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, fontSize: 13, color: '#f8f8f2', minWidth: 0 }}>
                          {lesson.title}
                        </span>
                        {stateBadge(ls?.state, !!sub)}
                        {ls?.state === 'completed' && ls.score !== null && (
                          <span style={{ fontSize: 12, color: '#8be9fd', fontFamily: 'monospace', flexShrink: 0 }}>
                            {ls.score} pts
                          </span>
                        )}
                        {/* lessonMap.has(...) guards against a stale/renumbered id with
                            no current lesson.json — nothing real to open there. */}
                        {lessonMap.has(lesson.id) && CODE_PREVIEWS.has(lesson.preview ?? '') && (
                          <a
                            href={`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(email)}&lesson=${encodeURIComponent(lesson.id)}`}
                            style={{ background: 'none', border: '1px solid #bd93f9', borderRadius: 4, color: '#bd93f9', fontSize: 12, cursor: 'pointer', padding: '3px 8px', flexShrink: 0, textDecoration: 'none' }}
                          >
                            Open in editor
                          </a>
                        )}
                        {!lessonMap.has(lesson.id) && (
                          <span style={{ fontSize: 11, color: '#6272a4', fontStyle: 'italic', flexShrink: 0 }}>
                            legacy id — lesson since renamed
                          </span>
                        )}
                        {sub && (
                          <button
                            style={{ background: 'none', border: '1px solid #6272a4', borderRadius: 4, color: '#8be9fd', fontSize: 12, cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}
                            onClick={() => toggleSub(lesson.id)}
                          >
                            {isExpanded ? 'Hide' : 'View submission'}
                          </button>
                        )}
                      </div>

                      {/* Submission detail */}
                      {isExpanded && sub && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #44475a33' }}>
                          <div style={{ fontSize: 11, color: '#6272a4', marginBottom: 8 }}>
                            Submitted: {fmtTs(sub.submitted_at)}
                            {sub.score !== null && sub.possible !== null && (
                              <span style={{ marginLeft: 12, color: '#f1fa8c' }}>
                                Score: {sub.score} / {sub.possible}
                              </span>
                            )}
                          </div>

                          {gradeData && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#50fa7b', marginBottom: 6 }}>
                                {/* A pass/fail rubric has no point total, and a diagram
                                    submission has neither -- both used to render a bare
                                    " / pts" with the numbers missing. */}
                                {typeof gradeData.totalPossible === 'number' && gradeData.totalPossible > 0
                                  ? `${gradeData.totalEarned} / ${gradeData.totalPossible} pts`
                                  : gradeData.criteria && gradeData.criteria.length > 0
                                    ? `${gradeData.criteria.filter((c) => c.verdict === 'met' || c.verdict === 'partial').length} of ${gradeData.criteria.length} criteria met`
                                    : gradeData.structural && gradeData.structural.length > 0
                                      ? `${gradeData.structural.filter((s) => s.passed).length} of ${gradeData.structural.length} checks passed`
                                      : 'graded'}
                              </div>

                              {/* Diagram assignments store their browser-side checks here.
                                  Without this the drawer showed a date and a score and
                                  nothing else -- a teacher could not see which check a
                                  student failed, let alone what they drew. */}
                              {gradeData.structural && gradeData.structural.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                  {gradeData.structural.map((s) => (
                                    <div key={s.id} style={{ fontSize: 12, background: '#1e1f29', borderRadius: 4, padding: '6px 10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: s.detail ? 3 : 0 }}>
                                        <span style={{ color: '#f8f8f2' }}>{s.title}</span>
                                        <span style={{ color: s.passed ? '#50fa7b' : '#ff5555', fontFamily: 'monospace' }}>
                                          {s.passed ? 'pass' : 'fail'}
                                        </span>
                                      </div>
                                      {s.detail && <div style={{ color: '#6272a4', fontSize: 11 }}>{s.detail}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {gradeData.criteria && gradeData.criteria.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {gradeData.criteria.map((c) => (
                                    <div key={c.id} style={{ fontSize: 12, background: '#1e1f29', borderRadius: 4, padding: '6px 10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: c.feedback ? 3 : 0 }}>
                                        <span style={{ color: '#f8f8f2' }}>{c.title}</span>
                                        <span style={{ color: '#8be9fd', fontFamily: 'monospace' }}>
                                          {criterionScore(c, !(typeof gradeData.totalPossible === 'number' && gradeData.totalPossible > 0))}
                                        </span>
                                      </div>
                                      {c.feedback && (
                                        <div style={{ color: '#6272a4', fontSize: 11 }}>{c.feedback}</div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* The answer itself. Diagram submissions store a
                              DiagramDoc, so render the Mermaid projection of it
                              rather than raw JSON; everything else is prose. */}
                          {sub.response && (
                            <div>
                              <div style={{ fontSize: 11, color: '#6272a4', marginBottom: 4 }}>
                                {asDiagramMermaid(sub.response) ? 'Their chart' : 'Their answer'}
                              </div>
                              <pre style={{ margin: 0, maxHeight: 260, overflow: 'auto', background: '#1e1f29', borderRadius: 4, padding: '8px 10px', fontSize: 11, color: '#f8f8f2', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {asDiagramMermaid(sub.response) ?? sub.response}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// GradebookView — sticky header + first column matrix
// ---------------------------------------------------------------------------

function GradebookView({
  classId,
  className,
  lessonMap,
  onOpenStudent,
}: {
  classId: string;
  className: string;
  lessonMap: Map<string, LessonMeta>;
  onOpenStudent: (email: string) => void;
}) {
  const router = useRouter();
  const [gbData, setGbData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    setErr('');
    apiFetch<GradebookData>(`/api/classes/${classId}/gradebook`)
      .then((res) => {
        if (res.error !== null) setErr(res.error);
        else setGbData(res.data);
        setLoading(false);
      })
      .catch(() => { setErr('Network error'); setLoading(false); });
  }, [classId]);

  // Full screen is an in-page overlay, not the browser Fullscreen API: the API
  // needs a user gesture that survives to the call, drops out whenever the tab
  // loses focus, and swallows Esc for its own exit. A fixed overlay is
  // predictable, and Esc closing it is something we control.
  // Hooks must sit above the early returns below.
  const [fullScreen, setFullScreen] = useState(false);
  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullScreen(false); };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the overlay from scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [fullScreen]);

  if (loading) return <div style={{ color: '#6272a4' }}>Loading gradebook…</div>;
  if (err) return <div style={{ color: '#ff5555', fontSize: 13 }}>{err}</div>;
  if (!gbData) return null;
  if (gbData.students.length === 0) {
    return <p style={{ color: '#6272a4', fontSize: 14 }}>No students enrolled — roster is empty.</p>;
  }

  // Build ordered lesson list from the manifest, preserving unit grouping.
  // Only include lessons that appear in the manifest (i.e. are known).
  const unitOrder: string[] = [];
  const byUnit: Record<string, LessonMeta[]> = {};
  for (const meta of lessonMap.values()) {
    const u = meta.unit ?? 'Other';
    if (!byUnit[u]) { byUnit[u] = []; unitOrder.push(u); }
    byUnit[u].push(meta);
  }
  // Sort lessons within each unit by id.
  for (const u of unitOrder) byUnit[u].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  // Flatten to an ordered array; track unit spans for colspan.
  const orderedLessons: LessonMeta[] = [];
  const unitSpans: Array<{ unit: string; count: number }> = [];
  for (const u of unitOrder) {
    orderedLessons.push(...byUnit[u]);
    unitSpans.push({ unit: u, count: byUnit[u].length });
  }

  // If lesson manifest is empty (not yet loaded), fall back to lessons seen in data.
  let displayLessons = orderedLessons;
  let displaySpans = unitSpans;
  if (displayLessons.length === 0) {
    const allIds = new Set<string>();
    for (const s of gbData.students) for (const lid of Object.keys(s.cells)) allIds.add(lid);
    const fallback = Array.from(allIds).sort();
    displayLessons = fallback.map((id) => ({ id, title: id, unit: null, preview: null }));
    displaySpans = displayLessons.length > 0
      ? [{ unit: 'Lessons', count: displayLessons.length }]
      : [];
  }

  // Sticky background must be solid so content doesn't bleed through.
  const stickyBg = '#1e1f29';
  const headerBg = '#282a36';

  const CELL_W = 60;
  const EMAIL_W = 220;

  // Late cells keep their normal glyph and gain a red underline, so scanning
  // the matrix for red still works without a second symbol to learn.
  function withLate(cell: GradebookCell | undefined, node: React.ReactNode): React.ReactNode {
    if (!cell?.late) return node;
    return (
      <span style={{ borderBottom: '2px solid #ff5555', paddingBottom: 1, display: 'inline-block' }}>
        {node}
      </span>
    );
  }

  function cellContent(cell: GradebookCell | undefined): React.ReactNode {
    // Checked before every other branch. A grader outage leaves the row
    // completed with a NULL score, which reads as a plain green tick, and it
    // leaves submitted_score NULL, which reads as the same "·" a student who
    // never opened the lesson gets. Either way the teacher is told nothing
    // happened when in fact an answer is sitting in the review queue.
    if (cell?.pending) {
      return withLate(cell, (
        <span
          style={{ color: '#ffb86c', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}
        >
          ⋯
        </span>
      ));
    }
    if (!cell || (!cell.state && cell.submitted_score === null)) {
      return withLate(cell, <span style={{ color: cell?.late ? '#ff5555' : '#44475a', fontFamily: 'monospace', fontSize: 14 }}>·</span>);
    }
    if (cell.state === 'completed') {
      if (cell.score !== null) {
        const hasSubDiff = cell.submitted_score !== null && cell.submitted_score !== cell.score;
        return withLate(cell, (
          <span style={{ color: '#50fa7b', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
            {cell.score}
            {hasSubDiff && (
              <sub style={{ color: '#8be9fd', fontSize: 9, marginLeft: 2 }}>
                s{cell.submitted_score}
              </sub>
            )}
          </span>
        ));
      }
      return withLate(cell, <span style={{ color: '#50fa7b', fontFamily: 'monospace', fontSize: 14 }}>✓</span>);
    }
    if (cell.state === 'started') {
      // A score can exist while the row is still 'started', and the glyph alone
      // hid it: WrittenGrader only flips the row to completed when the grade
      // passes, and a teacher override updates score without touching state.
      // So a 60% AI grade and a hand-graded submission both used to read as a
      // bare "in progress" until you hovered for the tooltip.
      const partial = cell.score ?? cell.submitted_score;
      if (partial !== null) {
        return withLate(cell, (
          <span style={{ color: '#f1fa8c', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
            {partial}
          </span>
        ));
      }
      return withLate(cell, <span style={{ color: '#f1fa8c', fontFamily: 'monospace', fontSize: 14 }}>○</span>);
    }
    // Has submission data but no lesson_state (edge case)
    if (cell.submitted_score !== null) {
      return withLate(cell, (
        <span style={{ color: '#8be9fd', fontFamily: 'monospace', fontSize: 12 }}>
          s{cell.submitted_score}
        </span>
      ));
    }
    return withLate(cell, <span style={{ color: '#44475a', fontFamily: 'monospace', fontSize: 14 }}>·</span>);
  }

  function cellTitle(cell: GradebookCell | undefined, lessonTitle: string, lessonId?: string): string {
    const dueAt = lessonId ? gbData?.dueDates?.[lessonId] : undefined;
    if (!cell) return dueAt ? `${lessonTitle} | due ${formatDue(dueAt)}` : lessonTitle;
    const parts: string[] = [lessonTitle];
    // First, because it is the only thing in the tooltip that asks the teacher
    // to do something. There is no legend above the matrix, so "⋯" has to
    // explain itself here.
    if (cell.pending) parts.push('AI grading failed - needs a manual grade (see the review queue)');
    if (cell.state) parts.push(`state: ${cell.state}`);
    if (cell.score !== null) parts.push(`score: ${cell.score}`);
    if (cell.submitted_score !== null) parts.push(`sub score: ${cell.submitted_score}`);
    if (cell.possible !== null) parts.push(`possible: ${cell.possible}`);
    if (dueAt) parts.push(`due ${formatDue(dueAt)}`);
    if (cell.late) parts.push('LATE');
    return parts.join(' | ');
  }

  function handleDownloadCsv() {
    const csv = buildGradebookCsv(gbData!.students, displayLessons.map((l) => l.id), gbData!.dueDates);
    downloadCsv(csv, `gradebook-${className.replace(/\s+/g, '-')}.csv`);
  }

  return (
    <div
      style={fullScreen ? {
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#282a36', padding: 16,
        display: 'flex', flexDirection: 'column',
      } : undefined}
    >
      {/* Toolbar */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={S.btn('#8be9fd')} onClick={handleDownloadCsv}>
          Download as CSV
        </button>
        <span style={{ fontSize: 12, color: '#6272a4' }}>
          {gbData.students.length} student{gbData.students.length !== 1 ? 's' : ''} · {displayLessons.length} lesson{displayLessons.length !== 1 ? 's' : ''}
        </span>
        {/* marginLeft:auto parks it on the right edge of the toolbar, above the
            matrix's own right edge, whatever the counts above widen to. */}
        <button
          style={{
            ...S.btn(fullScreen ? '#ff79c6' : 'transparent'),
            marginLeft: 'auto',
            // S.btn hardcodes color:#282a36 for its dark-text-on-bright-fill
            // case. With a transparent fill that is black on near-black, so
            // the outline state has to restate both colour and border.
            ...(fullScreen ? {} : { color: '#8be9fd', border: '1px solid #8be9fd' }),
          }}
          onClick={() => setFullScreen((v) => !v)}
          title={fullScreen ? 'Esc also exits' : 'Fill the window with the matrix'}
        >
          {fullScreen ? '✕ Exit full screen' : '⛶ Full screen'}
        </button>
      </div>

      {/* Scrollable matrix */}
      {/*
        A cap, not a height: a small class gets a box the size of its own rows
        and nothing is clipped, and only a roster tall enough to outgrow the
        window scrolls internally under the sticky header. Deliberately NOT
        measured from this element's own top — that reads the position it has
        before you scroll to it, freezes a box shorter than its contents, and
        slices the last student off while the window sits half empty.
      */}
      <div
        style={{
          overflow: 'auto',
          // In the overlay the box owns the window, so it takes the remaining
          // flex space instead of guessing at how much chrome sits above it.
          ...(fullScreen ? { flex: 1, minHeight: 0 } : { maxHeight: 'calc(100vh - 140px)' }),
          border: '1px solid #44475a',
          borderRadius: 6,
        }}
      >
        <table style={{ borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: EMAIL_W + CELL_W * displayLessons.length }}>
          {/* Unit-spanning header row */}
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky', left: 0, top: 0, zIndex: 3,
                  width: EMAIL_W, minWidth: EMAIL_W,
                  background: headerBg, padding: '6px 10px',
                  borderBottom: '1px solid #44475a', borderRight: '1px solid #44475a44',
                  textAlign: 'left', color: '#6272a4', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}
              >
                Student
              </th>
              {displaySpans.map(({ unit, count }) => (
                <th
                  key={unit}
                  colSpan={count}
                  style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    background: headerBg, padding: '6px 4px',
                    borderBottom: '1px solid #44475a', borderRight: '1px solid #44475a44',
                    textAlign: 'center', color: '#bd93f9', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    width: CELL_W * count,
                  }}
                >
                  {unit}
                </th>
              ))}
            </tr>
            {/* Per-lesson title row */}
            <tr>
              <th
                style={{
                  position: 'sticky', left: 0, top: 33, zIndex: 3,
                  width: EMAIL_W, minWidth: EMAIL_W,
                  background: stickyBg, padding: '4px 10px',
                  borderBottom: '2px solid #44475a', borderRight: '1px solid #44475a44',
                }}
              />
              {displayLessons.map((lesson) => (
                <th
                  key={lesson.id}
                  title={lesson.title}
                  style={{
                    position: 'sticky', top: 33, zIndex: 2,
                    width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                    // `height` on a <th> is a MINIMUM, not a maximum — the row
                    // grew to whatever the longest sideways title needed (574px
                    // measured), pushing every student below the fold. The cap
                    // that actually binds is maxHeight on the rotated div below.
                    height: 180, verticalAlign: 'bottom', overflow: 'hidden',
                    background: stickyBg, padding: '6px 2px',
                    borderBottom: '2px solid #44475a', borderRight: '1px solid #44475a11',
                    textAlign: 'center', color: '#bd93f9', fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {/*
                    A plain <a>, not next/link: Link prefetches every href that
                    scrolls into view, and this header holds 510 of them.
                    Opens in a new tab so checking what an assignment asks for
                    does not cost the teacher their scroll position in a table
                    that is 30,000px wide.
                  */}
                  <a
                    href={lessonHref(lesson)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      display: 'block',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.1,
                      margin: '0 auto',
                      // Sideways text runs along the block's HEIGHT, so height
                      // is the inline size that text-overflow clips. The full
                      // title stays reachable via the th's title= tooltip.
                      maxHeight: 168,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {lesson.title}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gbData.students.map((student, i) => (
              <tr
                key={student.email}
                style={{ background: i % 2 === 0 ? '#1e1f29' : '#252636' }}
              >
                {/* Sticky email cell */}
                <td
                  style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: i % 2 === 0 ? '#1e1f29' : '#252636',
                    width: EMAIL_W, minWidth: EMAIL_W,
                    padding: '6px 10px',
                    borderBottom: '1px solid #44475a22', borderRight: '1px solid #44475a44',
                    fontFamily: 'monospace', fontSize: 12, color: '#8be9fd',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                  onClick={() => onOpenStudent(student.email)}
                  title={student.email}
                >
                  {student.email}
                </td>
                {/* Cell per lesson */}
                {displayLessons.map((lesson) => {
                  const cell = student.cells[lesson.id];
                  const isCodingLesson = CODE_PREVIEWS.has(lesson.preview ?? '');
                  return (
                    <td
                      key={lesson.id}
                      style={{
                        width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                        padding: '4px 2px',
                        borderBottom: '1px solid #44475a22', borderRight: '1px solid #44475a11',
                        textAlign: 'center', verticalAlign: 'middle',
                        ...(isCodingLesson ? { cursor: 'pointer' } : {}),
                      }}
                      title={cellTitle(cell, lesson.title, lesson.id)}
                      onClick={isCodingLesson ? () => {
                        router.push(`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(student.email)}&lesson=${encodeURIComponent(lesson.id)}`);
                      } : undefined}
                    >
                      {cellContent(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function ListView() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadClasses = useCallback(async (withArchived: boolean) => {
    setLoading(true);
    const url = withArchived ? '/api/classes?includeArchived=true' : '/api/classes';
    const result = await apiFetch<{ classes: ClassSummary[] }>(url);
    if (result.error !== null) {
      if (result.status === 403) setForbidden(true);
    } else {
      setClasses(result.data.classes);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadClasses(includeArchived);
  }, [loadClasses, includeArchived]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    const result = await apiFetch<{ class: ClassSummary }>('/api/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() }),
    });
    setCreating(false);
    if (result.error !== null) {
      setCreateError(result.error);
    } else {
      setNewName('');
      router.push(`/teacher?class=${result.data.class.id}`);
    }
  }

  if (loading) return <div style={{ color: '#6272a4' }}>Loading…</div>;
  if (forbidden)
    return (
      <div style={{ color: '#ff5555', fontSize: 16, padding: 32 }}>Teacher access required.</div>
    );

  return (
    <div>
      <h1 style={S.h1}>My Classes</h1>

      {/* Create form */}
      <div style={{ ...S.card, marginBottom: 32 }}>
        <h2 style={{ ...S.h2, marginBottom: 12 }}>Create a new class</h2>
        <form onSubmit={(e) => { void handleCreate(e); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            style={S.input}
            placeholder="Class name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            style={creating || !newName.trim() ? S.btnDisabled : S.btn('#bd93f9')}
          >
            {creating ? 'Creating…' : 'Create class'}
          </button>
        </form>
        {createError && <p style={S.error}>{createError}</p>}
      </div>

      {/* Include archived toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6272a4', marginBottom: 20, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          style={{ accentColor: '#8be9fd' }}
        />
        Include archived classes
      </label>

      {/* Class list */}
      {classes.length === 0 ? (
        <p style={{ color: '#6272a4' }}>No classes yet. Create one above.</p>
      ) : (
        <div>
          {classes.map((c) => (
            <div
              key={c.id}
              style={{
                ...S.card,
                opacity: c.archived_at ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name}</span>
                  {c.archived_at && <span style={S.badge(true)}>Archived</span>}
                </div>
                <div style={{ display: 'flex', gap: 20, color: '#6272a4', fontSize: 13, flexWrap: 'wrap' }}>
                  <span>Code: <span style={{ fontFamily: 'monospace', color: '#8be9fd' }}>{c.code}</span></span>
                  {c.school_year && <span>Year: {c.school_year}</span>}
                  <span>{c.student_count} student{c.student_count !== 1 ? 's' : ''}</span>
                  <span style={{ textTransform: 'capitalize' }}>{c.role}</span>
                </div>
              </div>
              <button
                style={S.btn('#8be9fd')}
                onClick={() => router.push(`/teacher?class=${c.id}`)}
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function DetailView({ classId }: { classId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [removingEmail, setRemovingEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Co-teacher management state
  const [coTeacherEmail, setCoTeacherEmail] = useState('');
  const [addingCoTeacher, setAddingCoTeacher] = useState(false);
  const [coTeacherError, setCoTeacherError] = useState('');
  const [removingCoTeacher, setRemovingCoTeacher] = useState('');

  // Progress state
  const [progressMap, setProgressMap] = useState<Map<string, StudentProgress>>(new Map());
  const [lessonMap, setLessonMap] = useState<Map<string, LessonMeta>>(new Map());
  const [drawerEmail, setDrawerEmail] = useState<string | null>(null);

  // View toggle: 'roster' | 'gradebook'
  const [activeView, setActiveView] = useState<'roster' | 'gradebook' | 'attention'>('roster');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await apiFetch<ClassDetail>(`/api/classes/${classId}`);
    if (result.error !== null) {
      setLoadError(result.error);
    } else {
      setDetail(result.data);
      setCurrentCode(result.data.class.code);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // Fetch progress roll-up whenever class loads successfully.
  useEffect(() => {
    if (!detail) return;
    apiFetch<{ students: StudentProgress[] }>(`/api/classes/${classId}/progress`).then((res) => {
      if (res.error === null) {
        const m = new Map<string, StudentProgress>();
        for (const s of res.data.students) m.set(s.student_email, s);
        setProgressMap(m);
      }
    }).catch(() => undefined);
  }, [classId, detail]);

  // Load lesson manifest once (client-safe static JSON).
  useEffect(() => {
    fetch('/lessons-manifest.json')
      .then((r) => r.json() as Promise<{ lessons: LessonMeta[] }>)
      .then((data) => {
        const m = new Map<string, LessonMeta>();
        for (const l of data.lessons) m.set(l.id, l);
        setLessonMap(m);
      })
      .catch(() => undefined);
  }, []);

  async function handleRegenCode() {
    if (!window.confirm('Regenerate join code? The old code will stop working.')) return;
    setRegenerating(true);
    const result = await apiFetch<{ ok: boolean; code: string }>(
      `/api/classes/${classId}/regenerate-code`,
      { method: 'POST' },
    );
    setRegenerating(false);
    if (result.error === null) setCurrentCode(result.data.code);
  }

  async function handleArchiveToggle() {
    if (!detail) return;
    const isArchived = !!detail.class.archived_at;
    const action = isArchived ? 'Unarchive' : 'Archive';
    if (!window.confirm(`${action} this class?`)) return;
    setArchiving(true);
    const result = await apiFetch<{ ok: boolean; archived_at: string | null }>(
      `/api/classes/${classId}/archive`,
      { method: 'POST', body: JSON.stringify({ archived: !isArchived }) },
    );
    setArchiving(false);
    if (result.error === null) {
      setDetail((prev) =>
        prev
          ? { ...prev, class: { ...prev.class, archived_at: result.data.archived_at } }
          : prev,
      );
    }
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollEmail.trim()) return;
    setEnrolling(true);
    setEnrollError('');
    const result = await apiFetch<{ ok: boolean; enrollment: unknown }>(
      `/api/classes/${classId}/enrollments`,
      { method: 'POST', body: JSON.stringify({ email: enrollEmail.trim() }) },
    );
    setEnrolling(false);
    if (result.error !== null) {
      if (result.status === 404) setEnrollError('No account found for that email.');
      else if (result.status === 409) setEnrollError('Already enrolled.');
      else setEnrollError(result.error);
    } else {
      setEnrollEmail('');
      void loadDetail();
    }
  }

  async function handleDelete() {
    if (!detail) return;
    const name = detail.class.name;
    const typed = window.prompt(
      `Permanently delete "${name}"?\n\nThis removes the class, enrollments, and co-teacher rows. Student progress data (commits, completions) is preserved.\n\nType the class name to confirm:`,
    );
    if (typed === null) return;
    if (typed.trim() !== name) {
      setDeleteError('Name did not match. Nothing deleted.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    const result = await apiFetch<{ ok: boolean }>(`/api/classes/${classId}/delete`, {
      method: 'POST',
    });
    setDeleting(false);
    if (result.error !== null) {
      setDeleteError(result.error);
    } else {
      router.push('/teacher');
    }
  }

  async function handleRemove(email: string) {
    if (!window.confirm(`Remove ${email} from this class?`)) return;
    setRemovingEmail(email);
    await apiFetch(`/api/classes/${classId}/enrollments/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setRemovingEmail('');
    void loadDetail();
  }

  async function handleAddCoTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!coTeacherEmail.trim()) return;
    setAddingCoTeacher(true);
    setCoTeacherError('');
    const result = await apiFetch<{ ok: boolean; teacher: CoTeacherRow }>(
      `/api/classes/${classId}/teachers`,
      { method: 'POST', body: JSON.stringify({ email: coTeacherEmail.trim() }) },
    );
    setAddingCoTeacher(false);
    if (result.error !== null) {
      setCoTeacherError(result.error);
    } else {
      setCoTeacherEmail('');
      void loadDetail();
    }
  }

  async function handleRemoveCoTeacher(email: string) {
    if (!window.confirm(`Remove ${email} as co-teacher?`)) return;
    setRemovingCoTeacher(email);
    await apiFetch(`/api/classes/${classId}/teachers/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setRemovingCoTeacher('');
    void loadDetail();
  }

  if (loading) return <div style={{ color: '#6272a4' }}>Loading…</div>;
  if (loadError)
    return (
      <div>
        <button
          style={{ ...S.btn('#6272a4'), color: '#f8f8f2', marginBottom: 16 }}
          onClick={() => router.push('/teacher')}
        >
          ← Back to list
        </button>
        <p style={{ color: '#ff5555' }}>{loadError}</p>
      </div>
    );
  if (!detail) return null;

  const { class: cls, isOwner, roster, coTeachers } = detail;
  const isArchived = !!cls.archived_at;

  return (
    <div>
      {/* Back link */}
      <button
        style={{ background: 'none', border: 'none', color: '#8be9fd', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 24 }}
        onClick={() => router.push('/teacher')}
      >
        ← Back to list
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ ...S.h1, marginBottom: 0 }}>{cls.name}</h1>
            {isArchived && <span style={S.badge(true)}>Archived</span>}
          </div>
          <div style={{ display: 'flex', gap: 20, color: '#6272a4', fontSize: 13, flexWrap: 'wrap' }}>
            {cls.school_year && <span>Year: {cls.school_year}</span>}
            <span>Created: {fmt(cls.created_at)}</span>
            {cls.archived_at && <span>Archived: {fmt(cls.archived_at)}</span>}
          </div>
        </div>

        {/* Owner-only actions */}
        {isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                style={archiving ? S.btnDisabled : S.btn(isArchived ? '#50fa7b' : '#f1fa8c')}
                disabled={archiving}
                onClick={() => { void handleArchiveToggle(); }}
              >
                {archiving ? '…' : isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                style={deleting ? S.btnDisabled : { ...S.btn('#ff5555'), color: '#f8f8f2' }}
                disabled={deleting}
                onClick={() => { void handleDelete(); }}
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
            {deleteError && <p style={S.error}>{deleteError}</p>}
          </div>
        )}
      </div>

      {/* Code */}
      <div style={{ ...S.card, marginBottom: 28 }}>
        <div style={{ color: '#6272a4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Join Code</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={S.code}>{currentCode}</span>
          <button
            style={regenerating ? S.btnDisabled : S.btn('#ff79c6')}
            disabled={regenerating}
            onClick={() => { void handleRegenCode(); }}
          >
            {regenerating ? 'Regenerating…' : 'Regenerate code'}
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          style={{
            ...S.btn(activeView === 'roster' ? '#bd93f9' : 'transparent'),
            color: activeView === 'roster' ? '#282a36' : '#bd93f9',
            border: '1px solid #bd93f9',
            borderRadius: 20,
          }}
          onClick={() => setActiveView('roster')}
        >
          Roster
        </button>
        <button
          style={{
            ...S.btn(activeView === 'gradebook' ? '#8be9fd' : 'transparent'),
            color: activeView === 'gradebook' ? '#282a36' : '#8be9fd',
            border: '1px solid #8be9fd',
            borderRadius: 20,
          }}
          onClick={() => setActiveView('gradebook')}
        >
          Gradebook
        </button>
        <button
          style={{
            ...S.btn(activeView === 'attention' ? '#ffb86c' : 'transparent'),
            color: activeView === 'attention' ? '#282a36' : '#ffb86c',
            border: '1px solid #ffb86c',
            borderRadius: 20,
          }}
          onClick={() => setActiveView('attention')}
        >
          Needs Attention
        </button>
      </div>

      {/* Shape tools vs code. Only JSCAD assignments can be gated — the setting
          decides which editor a JSCAD lesson opens in, and means nothing to a
          moSHion or console one. */}
      {activeView === 'roster' && (
        <LessonModeControl
          classId={classId}
          lessons={[...lessonMap.values()]
            .filter((l) => l.preview === 'jscad')
            .map((l) => ({ id: l.id, title: l.title }))}
        />
      )}

      {/* Roster view */}
      {activeView === 'roster' && (
        <div style={{ ...S.card, marginBottom: 28 }}>
          <h2 style={S.h2}>Roster ({roster.length})</h2>
          {roster.length === 0 ? (
            <p style={{ color: '#6272a4', fontSize: 14 }}>No students enrolled yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {roster.map((row) => {
                const prog = progressMap.get(row.student_email);
                return (
                  <div
                    key={row.student_email}
                    style={{ background: '#282a36', borderRadius: 6, padding: '12px 16px', border: '1px solid #44475a33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f8f8f2', marginBottom: 4 }}>
                        {row.student_email}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6272a4', flexWrap: 'wrap' }}>
                        <span>
                          Enrolled: {fmt(row.enrolled_at)} by {row.enrolled_by ?? 'self'}
                        </span>
                        {prog ? (
                          <>
                            <span style={{ color: '#50fa7b' }}>{prog.completed_count} completed</span>
                            {prog.started_count > 0 && (
                              <span style={{ color: '#f1fa8c' }}>{prog.started_count} started</span>
                            )}
                            {prog.last_active !== null && (
                              <span>last active {fmtTs(prog.last_active)}</span>
                            )}
                          </>
                        ) : (
                          <span>No activity yet</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        style={S.btn('#8be9fd')}
                        onClick={() => setDrawerEmail(row.student_email)}
                      >
                        Open
                      </button>
                      <button
                        style={
                          removingEmail === row.student_email
                            ? S.btnDisabled
                            : { ...S.btn('#ff5555'), color: '#f8f8f2' }
                        }
                        disabled={removingEmail === row.student_email}
                        onClick={() => { void handleRemove(row.student_email); }}
                      >
                        {removingEmail === row.student_email ? '…' : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gradebook view */}
      {activeView === 'gradebook' && (
        <div style={{ ...S.card, marginBottom: 28 }}>
          <h2 style={{ ...S.h2, marginBottom: 16 }}>Gradebook</h2>
          <GradebookView
            classId={classId}
            className={cls.name}
            lessonMap={lessonMap}
            onOpenStudent={(email) => setDrawerEmail(email)}
          />
        </div>
      )}

      {/* Needs Attention view */}
      {activeView === 'attention' && (
        <div style={{ ...S.card, marginBottom: 28 }}>
          <h2 style={{ ...S.h2, marginBottom: 16 }}>Needs Attention</h2>
          <NeedsAttentionPanel
            classId={classId}
            onOpenStudent={(email: string) => setDrawerEmail(email)}
            onOpenTeacherEdit={(studentEmail: string, lessonId: string) => {
              router.push(`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(studentEmail)}&lesson=${encodeURIComponent(lessonId)}`);
            }}
          />
        </div>
      )}

      {/* Co-teachers */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <h2 style={S.h2}>Co-teachers ({coTeachers.length})</h2>
        {coTeachers.length === 0 ? (
          <p style={{ color: '#6272a4', fontSize: 14, marginBottom: isOwner ? 16 : 0 }}>No co-teachers added yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: isOwner ? 16 : 0 }}>
            {coTeachers.map((ct) => (
              <div
                key={ct.teacher_email}
                style={{ background: '#282a36', borderRadius: 6, padding: '10px 14px', border: '1px solid #44475a33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f8f8f2', marginBottom: 2 }}>
                    {ct.teacher_email}
                  </div>
                  <div style={{ fontSize: 12, color: '#6272a4' }}>
                    added {fmtTs(ct.added_at)}{ct.added_by ? ` by ${ct.added_by}` : ''}
                  </div>
                </div>
                {isOwner && (
                  <button
                    style={
                      removingCoTeacher === ct.teacher_email
                        ? S.btnDisabled
                        : { ...S.btn('#ff5555'), color: '#f8f8f2' }
                    }
                    disabled={removingCoTeacher === ct.teacher_email}
                    onClick={() => { void handleRemoveCoTeacher(ct.teacher_email); }}
                  >
                    {removingCoTeacher === ct.teacher_email ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <form onSubmit={(e) => { void handleAddCoTeacher(e); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <input
              style={S.input}
              type="email"
              placeholder="teacher@example.com"
              value={coTeacherEmail}
              onChange={(e) => setCoTeacherEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={addingCoTeacher || !coTeacherEmail.trim()}
              style={addingCoTeacher || !coTeacherEmail.trim() ? S.btnDisabled : S.btn('#bd93f9')}
            >
              {addingCoTeacher ? 'Adding…' : 'Add co-teacher'}
            </button>
          </form>
        )}
        {coTeacherError && <p style={S.error}>{coTeacherError}</p>}
      </div>

      {/* Add student */}
      <div style={S.card}>
        <h2 style={S.h2}>Add student by email</h2>
        <form onSubmit={(e) => { void handleEnroll(e); }} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            style={S.input}
            type="email"
            placeholder="student@example.com"
            value={enrollEmail}
            onChange={(e) => setEnrollEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={enrolling || !enrollEmail.trim()}
            style={enrolling || !enrollEmail.trim() ? S.btnDisabled : S.btn('#50fa7b')}
          >
            {enrolling ? 'Adding…' : 'Add student'}
          </button>
        </form>
        {enrollError && <p style={S.error}>{enrollError}</p>}
      </div>

      {/* Bulk enroll */}
      <div style={S.card}>
        <h2 style={S.h2}>Bulk enroll</h2>
        <BulkEnrollmentForm classId={classId} onDone={() => { void loadDetail(); }} />
      </div>

      {/* Submission Review Queue */}
      <div style={S.card}>
        <h2 style={S.h2}>Submission Review Queue</h2>
        <SubmissionQueue classId={classId} />
      </div>

      {/* Past due */}
      <div style={S.card}>
        <h2 style={S.h2}>Past due</h2>
        <PastDuePanel classId={classId} />
      </div>

      {/* Due dates */}
      <div style={S.card}>
        <h2 style={S.h2}>Due dates</h2>
        <DueDatesPanel classId={classId} />
      </div>

      {/* Announcements */}
      <div style={S.card}>
        <h2 style={S.h2}>Announcements</h2>
        <AnnouncementsPanel classId={classId} />
      </div>

      {/* Student drawer */}
      {drawerEmail !== null && (
        <StudentDrawer
          classId={classId}
          email={drawerEmail}
          lessonMap={lessonMap}
          onClose={() => setDrawerEmail(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root — reads ?class= param
// ---------------------------------------------------------------------------

function TeacherPageInner() {
  const params = useSearchParams();
  const classId = params.get('class');

  return (
    <div style={S.page}>
      {classId ? <DetailView classId={classId} /> : <ListView />}
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div style={{ ...S.page, color: '#6272a4' }}>Loading…</div>}>
      <TeacherPageInner />
    </Suspense>
  );
}
