'use client';

import LessonModeControl from '../../components/LessonModeControl';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { compareLessons, compareUnitLabels, lessonLabel } from '../../lib/lesson-title-order';
import { NeedsAttentionPanel } from '../../components/NeedsAttentionPanel';
import { BulkEnrollmentForm } from '../../components/BulkEnrollmentForm';
import { SubmissionQueue, OverrideForm, QuizAnswers } from '../../components/SubmissionQueue';
import { AnnouncementsPanel } from '../../components/AnnouncementsPanel';
import DueDatesPanel from '../../components/DueDatesPanel';
import GradingWeightsPanel from '../../components/GradingWeightsPanel';
import SolutionReleasePanel from '../../components/SolutionReleasePanel';
import { defaultModule, moduleKey, moduleOptions, modulePages, pagedColumnWidth, pagerFor, pageSize, resolveModuleParam, selectGradebookLessons } from '../../lib/gradebook-view';
import { describeGrade, opensInCodeEditor, quizAnswerRows, scoreCountNote, scoreOutOf, scoreWeight, showLateBadge, stillFailingRequirements, studentFirstName, submissionWasLate, verdictWord, type RequirementEventRow, type ScoreWeight, type TeacherQuiz } from '../../lib/teacher-drawer';
import { buildMarkCriteria } from '../../lib/rubric-mark';
import MostMissedPanel from '../../components/MostMissedPanel';
import ClassLibraryModeration from '../../components/ClassLibraryModeration';
import ClassGamesModeration from '../../components/ClassGamesModeration';
import { useClearStudentLibrary } from '../../components/ClearStudentLibrary';
import ClassCodeSessions from '../../components/ClassCodeSessions';
import ClassMessages from '../../components/ClassMessages';
import ClassGameChanges from '../../components/ClassGameChanges';
import PastDuePanel from '../../components/PastDuePanel';
import { formatDue, schoolDateString } from '../../lib/due-dates-core';
import { lessonHref } from '../../lib/lesson-href';
import { criteriaScore } from '../../lib/grade-pass';
import { practiceDisplay, readTeacherNotes } from '../../lib/gradebook-cell';
import { CATEGORY_LABEL, GRADE_CATEGORIES, lessonGradeCategory, lessonPercent, type GradeCategory } from '../../lib/grading-weights';
import { buildGradesCsv, buildLessonScoresCsv, classAverage, compareByLastName } from '../../lib/grades-csv';
import { FeedbackProvider, useFeedback } from '../../components/FeedbackProvider';
import { RowMenu } from '../../components/RowMenu';
import { ArrowDown, ArrowUp, ArrowUpDown, MousePointerClick } from 'lucide-react';
import { toMermaid } from '../../lib/diagram-mermaid';
import { errorText } from '../../lib/http-error';

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
  firstName?: string | null;
  lastName?: string | null;
  /** 0-100 grade-so-far under this class's weights and due dates (work done plus work past due). */
  weightedPercent: number;
  /** Graded lessons in the course, how many this student finished, and how many are past due and not done. */
  gradedTotal?: number;
  gradedDone?: number;
  gradedMissing?: number;
  gradedCounted?: number;
  categories?: Array<{ category: string; percent: number }>;
  /** The owner, a co-teacher or a non-student account on the roster: listed, never counted (ux2 T6). */
  staff?: boolean;
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
  /** The class due date in force when this was handed in; null = none. Late = submitted_at after it. */
  due_at_submit?: number | null;
}

interface StudentDetail {
  student_email: string;
  firstName?: string | null;
  lastName?: string | null;
  lessonState: Record<string, LessonStateEntry>;
  latestSubmissions: Record<string, SubmissionEntry>;
  /** This class's due date per lesson (epoch ms); a waived lesson has none. */
  dueDates?: Record<string, number>;
  /** Absent when the class page's endpoint could not load the manifest. */
  grading?: {
    percent: number;
    gradedTotal?: number;
    doneCount?: number;
    counted?: number;
    missingCount?: number;
    missingIds?: string[];
    categories: Array<{ category: string; label: string; weight: number; percent: number; done: number; total: number }>;
  };
}

/** "First Last", trimmed, handling either half being null/undefined. Null if both unset. */
function fullName(first?: string | null, last?: string | null): string | null {
  const parts = [first, last].map((s) => (s || '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/** 0-100 as a color. Green only at 100, amber once anything is done, dim
 *  otherwise -- same thresholds the student's own badge uses, so a teacher
 *  and a student read one colour code. */
// A pass/fail rubric stores score 0 of possible 0 whatever the verdicts were (lib/grade-pass.ts),
// so "Score: 0 / 0" said nothing and read as a zero. Its result is the criteria met out of the
// criteria count, which the row carries; a pointed row shows its points.
function submissionScoreLabel(sub: { score: number | null; possible: number | null; grade_json?: string | null }): string | null {
  if (sub.score !== null && sub.possible !== null && sub.possible > 0) return `Score: ${sub.score} / ${sub.possible}`;
  if (!sub.grade_json) return null;
  try {
    const criteria = (JSON.parse(sub.grade_json) as { criteria?: unknown }).criteria;
    if (Array.isArray(criteria) && criteria.length > 0) {
      return `Criteria met: ${criteriaScore(criteria as Array<{ verdict: string }>)} of ${criteria.length}`;
    }
  } catch {
    // an unparseable blob has no result to show
  }
  return null;
}

function pctColor(pct: number): string {
  return pct >= 100 ? 'var(--c-green)' : pct > 0 ? 'var(--c-yellow)' : 'var(--c-meta)';
}

/** A grade that COUNTS (something is done or past due): 0% is the worst state there is, so it is red like
 *  the past-due count beside it, not the muted grey that means "nothing counted yet" (shown as —). */
function countedGradeColor(pct: number): string {
  return pct <= 0 ? 'var(--c-red)' : pctColor(pct);
}

/** The 80x6 bar from UnitProgressBadge, reused so the roster and the
 *  student's own badge look like the same control. */
function MiniBar({ pct }: { pct: number }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: 80,
        height: 6,
        background: 'color-mix(in srgb, var(--x-ffffff) 10.0%, transparent)',
        borderRadius: 3,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          width: `${Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0}%`,
          height: '100%',
          background: pct >= 100 ? 'var(--c-green)' : 'var(--c-cyan)',
        }}
      />
    </span>
  );
}

interface LessonMeta {
  id: string;
  title: string;
  unit: string | null;
  preview: string | null;
  /** 'lesson' | 'assignment' | 'project'. Decides the /lesson vs /assignment
   *  prefix — see lib/lesson-href.ts for why guessing it is not safe. */
  type?: string | null;
  /** The part's try limit, or null/absent when it has none (lessons-manifest.json). */
  maxSubmissions?: number | null;
  /** Quiz questions, rubric points, or pass/fail criteria; null = completion is the grade. */
  maxScore?: number | null;
  /** Grade-category inputs (lib/grading-weights.ts lessonGradeCategory): which lessons are graded at all. */
  assignmentCode?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
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
const CODE_PREVIEWS: ReadonlySet<string> = new Set(['console', 'example', 'moshion']); // same list as opensInCodeEditor (lib/teacher-drawer.ts)

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

/** One student's grade so far in this class, from /api/classes/[id]/progress. */
interface GridGrade {
  pct: number;
  counted: number;
  missing: number;
  /** Percent per grade category, from the same studentGrading() call. Only categories with something counted. */
  cats: Record<string, number>;
  /** A staff account on the roster (ux2 T6): not a row of the gradebook, not in its averages. */
  staff: boolean;
}

/** Header stripe and total-column tint per grade category. None of these is a state colour (green, yellow, red, orange). */
const CAT_COLOR: Record<GradeCategory, string> = {
  lab: 'var(--c-cyan)',
  group: 'var(--x-69d2c3)',
  chapterTest: 'var(--x-6c9ef8)',
  finalExam: 'var(--x-e0c3fc)',
  q1: 'var(--x-d4a373)',
  q2: 'var(--x-d4a373)',
  q4: 'var(--x-d4a373)',
};
const CAT_SHORT: Record<GradeCategory, string> = {
  lab: 'Labs',
  group: 'Group',
  chapterTest: 'Tests',
  finalExam: 'Final',
  q1: 'Q1',
  q2: 'Q2',
  q4: 'Q4',
};

/** The background behind a lesson cell: the state at a glance, with the number or mark in front of it. */
function cellTint(cell: GradebookCell | undefined, graded: boolean, pct: number): string | undefined {
  if (cell?.pending) return 'color-mix(in srgb, var(--c-orange) 18.0%, transparent)'; // handed in, needs you
  if (cell?.state === 'completed') return pct >= 70 ? 'color-mix(in srgb, var(--c-green) 11.0%, transparent)' : 'color-mix(in srgb, var(--c-yellow) 10.0%, transparent)';
  if (cell?.state === 'started' || (cell && cell.submitted_score !== null)) {
    return cell.late && graded ? 'color-mix(in srgb, var(--c-red) 16.0%, transparent)' : 'color-mix(in srgb, var(--c-yellow) 7.0%, transparent)';
  }
  if (cell?.late && graded) return 'color-mix(in srgb, var(--c-red) 16.0%, transparent)'; // missing: past due, not started
  return undefined;
}

interface GradebookStudent {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
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
  /** Multiple-choice quizzes: one { id, picked, correct? } per question. Its
   *  presence is how the drawer tells a quiz from any other graded submission. */
  quiz?: unknown[];
  /** Code labs: the GradeReport the workspace saved (one result per requirement, score as totalScore). */
  results?: Array<{ id?: unknown; title?: unknown; status?: unknown; messages?: unknown }>;
  totalScore?: number;
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
  // The server's own sentence when it sent one; never a raw HTML page or a bare "HTTP 404" (ux2 T7).
  const errorMsg = await errorText(res);
  return { data: null, error: errorMsg, status: res.status };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function fmtTs(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// CSV download (the rows are built in lib/grades-csv.ts, where they are tested)
// ---------------------------------------------------------------------------

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
    background: 'var(--c-bg)',
    color: 'var(--c-fg)',
    padding: '24px clamp(16px, 3vw, 32px)',
    fontFamily: 'inherit',
    fontSize: 14,
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--c-fg)' } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--c-fg)' } as React.CSSProperties,

  card: {
    background: 'var(--c-deep)',
    border: '1px solid var(--c-line)',
    borderRadius: 8,
    padding: 'clamp(16px, 2vw, 20px)',
    minWidth: 0,
    marginBottom: 16,
  } as React.CSSProperties,

  btn: (color: string) =>
    ({
      background: color,
      color: 'var(--c-bg)',
      border: 'none',
      borderRadius: 4,
      padding: '4px 12px',
      height: 32,
      boxSizing: 'border-box',
      whiteSpace: 'nowrap',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    }) as React.CSSProperties,

  btnDisabled: {
    background: 'var(--c-line)',
    color: 'var(--c-meta)',
    border: 'none',
    borderRadius: 4,
    padding: '4px 12px',
    height: 32,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'not-allowed',
    opacity: 1, // beats the global `:disabled { opacity: .5 }`
    // climb4 r6: no fade. Meta text on the line fill is >= 4.5:1 in every theme (4.75 dark), and the grey
    // fill against the coloured enabled fills is what says "not yet".
  } as React.CSSProperties,

  // One field style for the teacher screens (system pass rule 5): an inset surface, a visible 1px
  // border, 15px prose text. Hover and focus come from the `teacher-field` class in globals.css.
  input: {
    background: 'var(--c-deep2)',
    border: '1px solid var(--c-line)',
    borderRadius: 4,
    color: 'var(--c-fg)',
    padding: '4px 12px',
    height: 36,
    boxSizing: 'border-box',
    maxWidth: '100%',
    fontFamily: 'var(--font-prose)',
    fontSize: 15,
    minWidth: 220,
  } as React.CSSProperties,

  // A form label above its field (rule 5): prose 14px/600.
  label: { display: 'block', fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 600, color: 'var(--c-fg)', marginBottom: 6 } as React.CSSProperties,

  // A metadata item's label and value (rule 3).
  metaLabel: { color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13 } as React.CSSProperties,
  metaValue: { color: 'var(--c-fg)', fontFamily: 'var(--font-prose)', fontSize: 13, fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,

  error: { color: 'var(--c-red)', fontSize: 13, marginTop: 8 } as React.CSSProperties,

  badge: (archived: boolean) =>
    ({
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: 4,
      background: archived ? 'var(--c-yellow)' : 'var(--c-green)',
      color: 'var(--c-bg)',
      fontSize: 12,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }) as React.CSSProperties,

  // The join code is a value to read out, not the page's headline: code face, body size.
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--c-cyan)',
    letterSpacing: '0.08em',
  } as React.CSSProperties,

  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 14 },
  th: {
    textAlign: 'left' as const,
    padding: '8px 12px',
    borderBottom: '1px solid var(--c-line)',
    color: 'var(--c-meta)',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase' as const,
  },
  td: { padding: '8px 12px', borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)', verticalAlign: 'middle' as const },
};

// Roster columns on a wide screen: name, grade, graded done, past due, last active, then the row's
// actions in their own right-aligned track (at least 16px of column gap plus 8px of lead before Open).
// r7 T6: the actions track is a fixed width ("View progress" + More), because the header row and every
// student row are separate grids and an auto track sized each one differently.
const ROSTER_COLS = 'minmax(180px, 2fr) 140px 144px 80px 136px 220px';

/** Roster column sort (desktop headings). Null = the order the server sent, which is the default. */
type RosterSortKey = 'name' | 'grade' | 'missing' | 'active';
type RosterSort = { key: RosterSortKey; dir: 'asc' | 'desc' } | null;
/** First click on a heading: name A-Z, lowest grade first, most past due first, most recently active first. */
const ROSTER_FIRST_DIR: Record<RosterSortKey, 'asc' | 'desc'> = { name: 'asc', grade: 'asc', missing: 'desc', active: 'desc' };
/** Display order only. A student with nothing counted yet (grade "—") or no activity sorts last either way. */
function sortRosterRows<R extends { student_email: string }>(rows: R[], sort: RosterSort, prog: (email: string) => StudentProgress | undefined): R[] {
  if (!sort) return rows;
  const sign = sort.dir === 'asc' ? 1 : -1;
  const label = (r: R) => (fullName(prog(r.student_email)?.firstName, prog(r.student_email)?.lastName) ?? r.student_email).toLowerCase();
  const value = (r: R): number | null => {
    const p = prog(r.student_email);
    if (sort.key === 'grade') return p?.gradedCounted && Number.isFinite(p.weightedPercent) ? p.weightedPercent : null;
    if (sort.key === 'missing') return p?.gradedMissing ?? 0;
    if (sort.key === 'active') return p?.last_active ?? null;
    return null;
  };
  return [...rows].sort((a, b) => {
    if (sort.key === 'name') return sign * label(a).localeCompare(label(b));
    const va = value(a), vb = value(b);
    if (va === null || vb === null) return va === vb ? label(a).localeCompare(label(b)) : va === null ? 1 : -1;
    return sign * (va - vb) || label(a).localeCompare(label(b));
  });
}

// ---------------------------------------------------------------------------
// StudentDrawer — right-side panel showing per-lesson progress
// ---------------------------------------------------------------------------

function StudentDrawer({
  classId,
  email,
  lessonMap,
  focusLessonId,
  onClose,
}: {
  classId: string;
  email: string;
  lessonMap: Map<string, LessonMeta>;
  /** Open with this lesson's submission expanded and scrolled into view (from the Today queue or a grid cell). */
  focusLessonId?: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { confirm, toast } = useFeedback();
  const closeRef = useRef<HTMLButtonElement>(null);
  // The lesson whose Override score form is open (one at a time).
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null);
  // Shown after a score is saved: the form closes on success, so without this the teacher sees nothing happen.
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 7000);
    return () => window.clearTimeout(t);
  }, [notice]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Escape closes the drawer; focus starts on Close and goes back to wherever it was when it shuts.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, []);
  const [err, setErr] = useState('');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  // Phone width: lesson titles get their own line and the buttons stack under them.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  // Best-effort checklist data for console labs: which requirements this student has missed and not yet
  // passed (the same endpoint as the Most missed panel, filtered to this student). Never a grade input.
  const [reqRows, setReqRows] = useState<RequirementEventRow[]>([]);
  const [reqTitles, setReqTitles] = useState<Record<string, Array<{ id: string; title: string }>>>({});
  // Quiz question text by lesson then question id (public/quiz-stems.json), for the "missed" list.
  const [quizStems, setQuizStems] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    let live = true;
    fetch('/quiz-stems.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => {
      if (live && d && typeof d === 'object') setQuizStems(d as Record<string, Record<string, string>>);
    });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all([
      fetch(`/api/classes/${encodeURIComponent(classId)}/requirement-events`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/lesson-requirements.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([ev, titles]) => {
      if (!live) return;
      if (ev && Array.isArray(ev.rows)) setReqRows(ev.rows as RequirementEventRow[]);
      if (titles && typeof titles === 'object') setReqTitles(titles as Record<string, Array<{ id: string; title: string }>>);
    });
    return () => { live = false; };
  }, [classId]);
  // Bumped after an unsubmit to re-run the fetch below; `unsubmitting` is the
  // lesson id in flight, so its button can't be double-fired.
  const [reloadKey, setReloadKey] = useState(0);
  const [unsubmitting, setUnsubmitting] = useState<string | null>(null);
  // lesson id whose tries are being given back, so its buttons can't be double-fired.
  const [givingBack, setGivingBack] = useState<string | null>(null);

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
  }, [classId, email, reloadKey]);

  // The assignment rubric of each hand-in shown here, so Override score can be marked from it (ux1 G1).
  // Same teacher-only route the review queue reads, asking only for briefs; a lesson with no grader config
  // simply has none and its form falls back to the stored criteria or a plain score field.
  const [briefs, setBriefs] = useState<Record<string, { prompt: string; rubric: Array<{ id: string; title: string; points: number; required?: boolean }> }>>({});
  // A quiz hand-in's questions, options and key (teacher-only, same route), for "Picked / Answer" (ux2 T3b).
  const [quizContent, setQuizContent] = useState<Record<string, TeacherQuiz>>({});
  useEffect(() => {
    if (!detail) return;
    const ids = Object.keys(detail.latestSubmissions);
    if (ids.length === 0) return;
    let live = true;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
    void Promise.all(chunks.map((c) =>
      apiFetch<{ assignments?: Record<string, { prompt: string; rubric: Array<{ id: string; title: string; points: number; required?: boolean }> }>; quizzes?: Record<string, TeacherQuiz> }>(
        `/api/classes/${encodeURIComponent(classId)}/submission-queue?briefs=${encodeURIComponent(c.join(','))}`,
      ).catch(() => null),
    )).then((all) => {
      if (!live) return;
      const out: typeof briefs = {};
      const qs: Record<string, TeacherQuiz> = {};
      for (const r of all) {
        if (r && r.error === null && r.data.assignments) Object.assign(out, r.data.assignments);
        if (r && r.error === null && r.data.quizzes) Object.assign(qs, r.data.quizzes);
      }
      setBriefs(out);
      setQuizContent(qs);
    });
    return () => { live = false; };
  }, [detail, classId]);

  // Arrived from a queue row or a grid cell: open that lesson's submission and bring it into view once.
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!detail || !focusLessonId || focusedRef.current === focusLessonId) return;
    focusedRef.current = focusLessonId;
    if (detail.latestSubmissions[focusLessonId]) {
      setExpandedSubs((prev) => new Set(prev).add(focusLessonId));
    }
    window.setTimeout(() => {
      document.getElementById(`drawer-lesson-${focusLessonId}`)?.scrollIntoView({ block: 'center' });
    }, 50);
  }, [detail, focusLessonId]);

  function toggleSub(lessonId: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  // Reopen a submitted quiz: the student keeps their answers and can change
  // them and resubmit. Removes the submission and its score, so confirm first.
  async function unsubmit(lessonId: string, title: string) {
    const ok = await confirm({
      title: `Reopen "${title}" for ${email}?`,
      message: `Every hand-in of this quiz by ${email} and its score are removed.\nTheir answers are kept, so they can change them and hand it in again.`,
      confirmLabel: 'Reopen quiz',
      danger: true,
    });
    if (!ok) return;
    setUnsubmitting(lessonId);
    setErr('');
    const res = await apiFetch<{ ok: true }>(`/api/classes/${classId}/lesson-unsubmit`, {
      method: 'POST',
      body: JSON.stringify({ studentEmail: email, lessonId }),
    }).catch(() => null);
    setUnsubmitting(null);
    if (res === null) { setErr('Network error'); toast('Could not reopen the quiz: network error. Nothing changed.', { kind: 'error' }); }
    else if (res.error !== null) { setErr(res.error); toast(`Could not reopen the quiz: ${res.error}`, { kind: 'error' }); }
    else { setReloadKey((k) => k + 1); toast(`Reopened "${title}". The student can change their answers and hand it in again.`); }
  }

  // Give tries back on a capped part. 'give-back-one' removes the newest try (the
  // earlier ones and their best score stay); 'reset' clears the part so every try is
  // back. What is removed is kept in an audit table (migration 0033), so confirm first.
  async function giveBack(lessonId: string, title: string, action: 'give-back-one' | 'reset') {
    const ok = await confirm(action === 'reset'
      ? {
          title: `Reset all tries on "${title}"?`,
          message: `Every submission and the score for ${email} on this part are removed, and they get all their tries back.\nWhat was removed is kept in an audit log.`,
          confirmLabel: 'Reset all tries',
          danger: true,
        }
      : {
          title: `Give one try back on "${title}"?`,
          message: `${email}'s newest try is removed. Their other tries and best score stay.\nWhat was removed is kept in an audit log.`,
          confirmLabel: 'Give a try back',
        });
    if (!ok) return;
    setGivingBack(lessonId);
    setErr('');
    const res = await apiFetch<{ ok: true }>(`/api/classes/${classId}/tries-reset`, {
      method: 'POST',
      body: JSON.stringify({ studentEmail: email, lessonId, action }),
    }).catch(() => null);
    setGivingBack(null);
    if (res === null) { setErr('Network error'); toast('Could not change the tries: network error. Nothing changed.', { kind: 'error' }); }
    else if (res.error !== null) { setErr(res.error); toast(`Could not change the tries: ${res.error}`, { kind: 'error' }); }
    else { setReloadKey((k) => k + 1); toast(action === 'reset' ? `All tries reset on "${title}".` : `One try given back on "${title}".`); }
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
      // Graded lessons past due that the student never opened have no row anywhere; they are the ones
      // a teacher opens the drawer to find, so they are listed too, marked Missing.
      ...(detail.grading?.missingIds ?? []),
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
    unitOrder.sort(compareUnitLabels);

    for (const u of unitOrder) {
      unitGroups.push({ unit: u, lessons: byUnit[u].sort(compareLessons) });
    }
  }

  const drawerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(600px, 100vw)',
    background: 'var(--c-deep)',
    borderLeft: '1px solid var(--c-line)',
    overflowY: 'auto',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  };

  // `submitted` covers the case with no lesson_state row at all but a graded
  // submission on file — a free-response answer that did not pass. Without
  // this it fell through to "Not started", which is the opposite of true and
  // worse than the missing row it replaced.
  function stateBadge(state: 'started' | 'completed' | undefined, submitted = false, missing = false, practice = false, teacherScored = false) {
    // A hand-in you have scored is not "In progress" or merely "Submitted" any more (ux1 G3). The grade still
    // counts it only once the lesson is done (studentGrading), which the tooltip says.
    if (teacherScored && state !== 'completed') {
      return (
        <span style={{ background: 'var(--c-cyan)', color: 'var(--c-bg)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }} title="You have scored this hand-in. The student has not finished the lesson yet, so the grade counts it once they do.">
          Scored by you
        </span>
      );
    }
    if (!state && !submitted && missing) {
      return (
        <span style={{ background: 'var(--c-red)', color: 'var(--c-bg)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }} title="Past its due date and never opened">
          Missing
        </span>
      );
    }
    if (!state && submitted) {
      return (
        <span style={{ background: 'var(--c-orange)', color: 'var(--c-bg)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          Submitted
        </span>
      );
    }
    if (state === 'completed' && practice) {
      // Same rule as the grid and the student's page (practiceDisplay): finished, but it does not count.
      return (
        <span style={{ background: 'color-mix(in srgb, var(--c-green) 15.0%, transparent)', color: 'var(--c-meta)', border: '1px solid var(--c-line)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }} title="Finished. This lesson is practice and does not count toward the grade.">
          Done {'\u00b7'} practice (not graded)
        </span>
      );
    }
    if (state === 'completed') {
      return (
        <span style={{ background: 'var(--c-green)', color: 'var(--c-bg)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          Complete
        </span>
      );
    }
    if (state === 'started') {
      return (
        <span style={{ background: 'var(--c-yellow)', color: 'var(--c-bg)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          In progress
        </span>
      );
    }
    return (
      <span style={{ background: 'var(--c-line)', color: 'var(--c-meta)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
        Not started
      </span>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div style={overlayStyle} onClick={onClose} />

      {/* Panel. A real dialog: Escape closes it, focus lands on Close, and assistive tech is told it
          is modal. It used to be a bare div that only the backdrop could dismiss. */}
      <div
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Student progress: ${fullName(detail?.firstName, detail?.lastName) || email}`}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-fg)', marginBottom: 4 }}>
              Student Progress
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-cyan)', fontFamily: 'monospace' }}>
              {fullName(detail?.firstName, detail?.lastName) || email}
            </div>
            {fullName(detail?.firstName, detail?.lastName) && (
              <div style={{ fontSize: 13, color: 'var(--c-meta)', fontFamily: 'monospace' }}>{email}</div>
            )}
          </div>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--c-meta)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            onClick={onClose}
            aria-label="Close"
            ref={closeRef}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading && <div style={{ color: 'var(--c-meta)' }}>Loading…</div>}
          {err && <div style={{ color: 'var(--c-red)', fontSize: 13 }}>{err}</div>}
          {notice && <div role="status" style={{ color: 'var(--c-green)', fontSize: 13, marginBottom: 12 }}>{notice}</div>}
          {detail?.grading && detail.grading.categories.length > 0 && (
            <div style={{ marginBottom: 24, padding: 12, background: 'var(--c-bg)', borderRadius: 6, border: '1px solid color-mix(in srgb, var(--c-line) 20%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MiniBar pct={detail.grading.percent} />
                <span style={{ fontSize: 14, fontWeight: 700, color: pctColor(detail.grading.percent) }}>
                  {detail.grading.percent}% so far
                </span>
                {typeof detail.grading.gradedTotal === 'number' && detail.grading.gradedTotal > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--c-meta)' }}>
                    {detail.grading.doneCount ?? 0} of {detail.grading.gradedTotal} graded lessons done
                    {(detail.grading.missingCount ?? 0) > 0 ? ` · ${detail.grading.missingCount} past due` : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.grading.categories.map((c) => (
                  <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: pctColor(c.percent), flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--c-fg)' }}>
                      {c.label}
                      <span style={{ opacity: 0.6 }}> · {c.weight}% of grade</span>
                    </span>
                    <span style={{ color: 'var(--c-meta)' }}>
                      {c.done}/{c.total}
                    </span>
                    <span style={{ color: pctColor(c.percent), fontWeight: 600, width: 40, textAlign: 'right' }}>
                      {c.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {detail && unitGroups.length === 0 && (
            <p style={{ color: 'var(--c-meta)', fontSize: 14 }}>No lesson activity yet.</p>
          )}
          {detail && unitGroups.map(({ unit, lessons }) => (
            <div key={unit} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-purple)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                {unit}
              </div>
              <div>
                {lessons.map((lesson) => {
                  const ls = detail.lessonState[lesson.id];
                  const sub = detail.latestSubmissions[lesson.id];
                  const isExpanded = expandedSubs.has(lesson.id);
                  // A lesson with no grade category does not count: say so instead of "Complete" / "N pts".
                  // An id with no current lesson.json keeps the counted look (nothing to classify it by).
                  const meta = lessonMap.get(lesson.id);
                  const practice =
                    !!meta &&
                    !!practiceDisplay(
                      lessonGradeCategory({ title: meta.title, preview: meta.preview, scoreKind: meta.scoreKind, assignmentCode: meta.assignmentCode }) !== null,
                      'done',
                    ) &&
                    ls?.state === 'completed';

                  let gradeData: GradeResponse | null = null;
                  if (sub?.grade_json) {
                    try {
                      gradeData = JSON.parse(sub.grade_json) as GradeResponse;
                      // A capped AI-graded chart keeps its browser-side checks beside the grade
                      // (grade_json.artifact.checks); show them as the structure list again.
                      const kept = (gradeData as { artifact?: { checks?: StructuralCheck[] } }).artifact?.checks;
                      if (gradeData && !gradeData.structural && Array.isArray(kept) && kept.length > 0) {
                        gradeData = { ...gradeData, structural: kept };
                      }
                      // A code lab saves the workspace's GradeReport: `results` and `totalScore`, not the
                      // `structural` / `totalEarned` the rest of this panel reads. Map it, or a 25 of 40
                      // lab shows "undefined / 40 pts" and the failed requirement is nowhere to be seen.
                      if (gradeData && !gradeData.structural && Array.isArray(gradeData.results)) {
                        gradeData = {
                          ...gradeData,
                          totalEarned: typeof gradeData.totalEarned === 'number' ? gradeData.totalEarned : (gradeData.totalScore ?? 0),
                          structural: gradeData.results
                            .filter((r) => !!r && typeof r === 'object')
                            .map((r) => ({
                              id: String(r.id ?? ''),
                              title: typeof r.title === 'string' && r.title ? r.title : String(r.id ?? 'Requirement'),
                              passed: r.status === 'passed',
                              detail: Array.isArray(r.messages) ? r.messages.filter((m) => typeof m === 'string').join(' ') : '',
                            })),
                        };
                      }
                      // The check list is whatever the student's browser sent on some routes; the
                      // list below reads `.passed` off every entry, so keep only real objects.
                      if (gradeData && Array.isArray(gradeData.structural)) {
                        gradeData = {
                          ...gradeData,
                          structural: gradeData.structural.filter((c): c is StructuralCheck => !!c && typeof c === 'object'),
                        };
                      }
                    } catch {
                      // malformed grade_json — skip
                    }
                  }
                  // The teacher's own score and note on the latest hand-in (ux1 G2, G3).
                  const tnotes = sub ? readTeacherNotes(sub.grade_json) : null;
                  const teacherScored = !!sub && sub.score !== null && tnotes?.reviewedAt != null;
                  const isQuiz = Array.isArray(gradeData?.quiz);
                  const brief = Object.prototype.hasOwnProperty.call(briefs, lesson.id) ? briefs[lesson.id] : undefined;
                  const briefPoints = brief ? brief.rubric.reduce((n, c) => n + (c.points > 0 ? c.points : 0), 0) : 0;
                  // What a score on this lesson is out of: the part's maximum, else the hand-in's own, else its rubric's.
                  const outOf = meta?.maxScore ?? (sub && sub.possible !== null && sub.possible > 0 ? sub.possible : null) ?? (briefPoints > 0 ? briefPoints : null);
                  const weight = meta ? scoreWeight({ counts: lessonGradeCategory({ title: meta.title, preview: meta.preview, scoreKind: meta.scoreKind, assignmentCode: meta.assignmentCode }) !== null, maxScore: meta.maxScore }) : null;
                  // Practice work never shows a points value, finished or not. `practice` is true only once the
                  // lesson is done, so a teacher's score on an unfinished hand-in needs its own "does it count"
                  // check (an id with no current lesson.json keeps the counted look, as `practice` does).
                  const counted = !meta || lessonGradeCategory({ title: meta.title, preview: meta.preview, scoreKind: meta.scoreKind, assignmentCode: meta.assignmentCode }) !== null;
                  const shownScore =
                    ls?.state === 'completed' && !practice && ls.score !== null ? ls.score : teacherScored && counted ? sub!.score : null;
                  // Does a teacher score here change the grade now? The queue card's helper, so the words match (ux2 T1).
                  const dueAt = detail.dueDates?.[lesson.id];
                  const countNote = scoreCountNote(weight, {
                    lessonState: ls?.state ?? null,
                    pastDue: typeof dueAt === 'number' && dueAt <= Date.now(),
                    studentName: studentFirstName(detail.firstName, email),
                  });
                  // A quiz by its lesson, so a quiz with no hand-in row still says why nothing can be shown (ux2 T3a).
                  const quizLesson = isQuiz || meta?.scoreKind === 'quiz' || meta?.preview === 'quiz';

                  return (
                    <div key={lesson.id} id={`drawer-lesson-${lesson.id}`} style={{ marginBottom: 8, background: 'var(--c-bg)', borderRadius: 6, padding: '12px 16px', border: `1px solid ${focusLessonId === lesson.id ? 'var(--c-cyan)' : 'color-mix(in srgb, var(--c-line) 20%, transparent)'}` }}>
                      {/* Lesson row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ flex: compact ? '1 1 100%' : '1 1 240px', fontSize: 13, color: 'var(--c-fg)', minWidth: 0, overflowWrap: 'anywhere' }}>
                          {lesson.title}
                          {detail.dueDates?.[lesson.id] && (
                            <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--c-meta)' }} title="This class's due date for the lesson">
                              due {formatDue(detail.dueDates[lesson.id])}
                            </span>
                          )}
                        </span>
                        {stateBadge(ls?.state, !!sub, !!detail.grading?.missingIds?.includes(lesson.id), practice, teacherScored && counted)}
                        {sub && showLateBadge(!!meta && !practice && lessonGradeCategory({ title: meta.title, preview: meta.preview, scoreKind: meta.scoreKind, assignmentCode: meta.assignmentCode }) !== null, submissionWasLate(sub.submitted_at, sub.due_at_submit)) && (
                          <span style={{ background: 'color-mix(in srgb, var(--c-red) 18.0%, transparent)', color: 'var(--c-red)', border: '1px solid var(--c-red)', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }} title={`Handed in after the due date (${sub.due_at_submit ? formatDue(sub.due_at_submit) : ''})`}>
                            Late
                          </span>
                        )}
                        {/* A 0-point (mastery) lab stores score 0 of 0: "0 pts" beside "Complete" reads as a zero. */}
                        {/* Always "x / max" (ux1 G3). A 0-point lab's stored 0 of 0 is not shown as a zero. */}
                        {shownScore !== null && !practice && !(sub && sub.possible === 0 && !shownScore && !teacherScored) && (
                          <span style={{ fontSize: 13, color: 'var(--c-cyan)', fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                            {teacherScored ? 'Your score: ' : 'Score: '}{scoreOutOf(shownScore, outOf)}
                          </span>
                        )}
                        {/* lessonMap.has(...) guards against a stale/renumbered id with
                            no current lesson.json — nothing real to open there. */}
                        {lessonMap.has(lesson.id) && CODE_PREVIEWS.has(lesson.preview ?? '') && (
                          <a
                            href={`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(email)}&lesson=${encodeURIComponent(lesson.id)}`}
                            style={{ background: 'none', border: '1px solid var(--c-purple)', borderRadius: 4, color: 'var(--c-purple)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0, textDecoration: 'none' }}
                          >
                            Open in editor
                          </a>
                        )}
                        {!lessonMap.has(lesson.id) && (
                          <span style={{ fontSize: 13, color: 'var(--c-meta)', fontStyle: 'italic', flexShrink: 0 }}>
                            legacy id — lesson since renamed
                          </span>
                        )}
                        {sub && (
                          <button
                            style={{ background: 'none', border: '1px solid var(--c-comment)', borderRadius: 4, color: 'var(--c-cyan)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                            onClick={() => toggleSub(lesson.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Hide' : isQuiz ? 'View answers' : 'View submission'}
                          </button>
                        )}
                        {sub && isQuiz && (
                          <button
                            type="button"
                            disabled={unsubmitting === lesson.id}
                            style={{ background: 'none', border: '1px solid var(--c-orange)', borderRadius: 4, color: 'var(--c-orange)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                            title="Removes their hand-in and score; their answers are kept so they can change them and hand it in again"
                            onClick={() => { void unsubmit(lesson.id, lesson.title); }}
                          >
                            {unsubmitting === lesson.id ? 'Reopening…' : 'Reopen quiz'}
                          </button>
                        )}
                        {sub && !isQuiz && (
                          <button
                            id={`override-btn-${lesson.id}`}
                            style={{ background: 'none', border: '1px solid var(--c-purple)', borderRadius: 4, color: 'var(--c-purple)', fontSize: 12, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                            aria-expanded={overrideOpen === lesson.id}
                            title="Change this student's score for the lesson, with an optional comment they will see"
                            onClick={() => setOverrideOpen((cur) => (cur === lesson.id ? null : lesson.id))}
                          >
                            {overrideOpen === lesson.id ? 'Close override' : 'Override score'}
                          </button>
                        )}
                        {/* The three actions that remove something live in one menu, in words, so a routine
                            click on View or Override cannot land on Reset by accident. Each still confirms. */}
                        {sub && typeof lesson.maxSubmissions === 'number' && (
                          <RowMenu
                            label={`More actions for ${lesson.title}`}
                            buttonText="More"
                            disabled={givingBack === lesson.id || unsubmitting === lesson.id}
                            items={[
                              { label: 'Give back one try', title: 'Removes their newest try; their other tries and best score stay.', onSelect: () => { void giveBack(lesson.id, lesson.title, 'give-back-one'); } },
                              { label: 'Reset all tries', danger: true, title: 'Clears every submission on this part so they get all their tries back.', onSelect: () => { void giveBack(lesson.id, lesson.title, 'reset'); } },
                            ]}
                          />
                        )}
                      </div>

                      {/* A score that does not change the grade now says so, in the queue card's words (ux2 T1). Shown
                          once there is a teacher score to be wrong about; the override form shows it too. */}
                      {countNote && teacherScored && overrideOpen !== lesson.id && (
                        <p role="note" className={`sq-weight-note is-${countNote.reason}`} style={{ marginTop: 8 }}>{countNote.note}</p>
                      )}

                      {/* A finished quiz with no hand-in row (its score came from lesson progress only): nothing to show
                          or reopen, and the row says so rather than offering nothing (ux2 T3a). */}
                      {quizLesson && !sub && ls?.state === 'completed' && (
                        <p className="drawer-quiz-none">
                          Only the score was saved for this quiz (no hand-in), so there are no answers to show or reopen.
                        </p>
                      )}

                      {/* The teacher's note, kept with their score (ux1 G2). The student reads it on their Progress page. */}
                      {tnotes?.feedback && (
                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--c-fg)', fontFamily: 'var(--font-prose)', overflowWrap: 'anywhere' }}>
                          <span style={{ fontWeight: 700, color: 'var(--c-cyan)' }}>Your note{tnotes.reviewedAt ? ` (${fmtTs(tnotes.reviewedAt)})` : ''}:</span>{' '}
                          <span style={{ whiteSpace: 'pre-wrap' }}>{tnotes.feedback}</span>
                        </div>
                      )}

                      {/* Console labs: the checklist items this student has missed and not passed yet. */}
                      {meta && meta.preview === 'console' && ls?.state !== 'completed' && (() => {
                        const failing = stillFailingRequirements(reqRows, email, lesson.id, reqTitles[lesson.id]);
                        if (failing.length === 0) return null;
                        return (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid color-mix(in srgb, var(--c-line) 20%, transparent)', fontSize: 12 }}>
                            <div style={{ color: 'var(--c-orange)', fontWeight: 600, marginBottom: 4 }}>
                              Still failing {failing.length} {failing.length === 1 ? 'requirement' : 'requirements'}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--c-fg)', display: 'grid', gap: 4 }}>
                              {failing.map((f) => (
                                <li key={f.reqId} style={{ overflowWrap: 'anywhere' }}>
                                  {f.title} <span style={{ color: 'var(--c-meta)' }}>({f.fails} {f.fails === 1 ? 'miss' : 'misses'})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                      {/* Override score: the same form the review queue uses, so the rules (the part's maximum, "keep the
                          higher score" on a part with a try limit, the persisted choice) are one set of rules. */}
                      {overrideOpen === lesson.id && sub && (
                        <div className="drawer-override" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid color-mix(in srgb, var(--c-line) 20%, transparent)' }}>
                          <div style={{ fontSize: 13, color: 'var(--c-meta)' }}>
                            Latest hand-in {fmtTs(sub.submitted_at)}{submissionScoreLabel(sub) ? ` · ${submissionScoreLabel(sub)}` : ''}
                          </div>
                          <OverrideForm
                            classId={classId}
                            submissionId={sub.id}
                            unitTotal={
                              gradeData && Array.isArray(gradeData.criteria) && gradeData.criteria.length > 0 && !(typeof gradeData.totalPossible === 'number' && gradeData.totalPossible > 0)
                                ? gradeData.criteria.length
                                : null
                            }
                            // The hand-in's own maximum only, never the rubric's total: on a part with a try limit
                            // the form enforces this number, and the server's ceiling decides what it accepts.
                            pointsMax={sub.possible !== null && sub.possible > 0 ? sub.possible : null}
                            enforceMax={typeof lesson.maxSubmissions === 'number'}
                            criteria={brief || (gradeData?.criteria && gradeData.criteria.length > 0) ? buildMarkCriteria(brief?.rubric, gradeData?.criteria) : undefined}
                            savedScore={teacherScored ? sub.score : null}
                            savedFeedback={tnotes?.feedback ?? null}
                            weightNote={countNote?.note ?? null}
                            onOverride={() => {
                              setOverrideOpen(null);
                              setNotice(`Saved. ${lesson.title} now carries your score. ${countNote?.note ?? 'The student sees it, and any note, on their Progress page, marked teacher-adjusted.'}`);
                              setReloadKey((k) => k + 1);
                              // The form closes on save: put focus back on the button that opened it, not on <body>.
                              window.setTimeout(() => document.getElementById(`override-btn-${lesson.id}`)?.focus(), 0);
                            }}
                          />
                        </div>
                      )}

                      {/* Submission detail */}
                      {isExpanded && sub && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid color-mix(in srgb, var(--c-line) 20%, transparent)' }}>
                          <div style={{ fontSize: 13, color: 'var(--c-meta)', marginBottom: 8 }}>
                            Submitted: {fmtTs(sub.submitted_at)}
                            {showLateBadge(!!meta && lessonGradeCategory({ title: meta.title, preview: meta.preview, scoreKind: meta.scoreKind, assignmentCode: meta.assignmentCode }) !== null, submissionWasLate(sub.submitted_at, sub.due_at_submit)) && (
                              <span style={{ marginLeft: 8, color: 'var(--c-red)', fontWeight: 700 }}>Late, was due {formatDue(sub.due_at_submit as number)}</span>
                            )}
                            {submissionScoreLabel(sub) && (
                              <span style={{ marginLeft: 12, color: 'var(--c-yellow)' }}>
                                {submissionScoreLabel(sub)}
                              </span>
                            )}
                          </div>

                          {(() => {
                            // A chart keeps its hybrid result (rules plus wording) under `ai`; show what it says.
                            const gd = describeGrade(sub.grade_json);
                            if (!gd || gd.from !== 'ai') return null;
                            return (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-green)', marginBottom: 8 }}>
                                  {gd.totalEarned !== null && gd.totalPossible !== null && gd.totalPossible > 0
                                    ? `${gd.totalEarned} / ${gd.totalPossible} pts`
                                    : `${gd.lines.filter((l) => l.verdict === 'met' || l.verdict === 'partial').length} of ${gd.lines.length} criteria met`}
                                </div>
                                {gd.capped && (
                                  <div role="note" style={{ fontSize: 12, color: 'var(--c-bg)', background: 'var(--c-orange)', borderRadius: 4, padding: '8px 12px', marginBottom: 8, fontWeight: 600 }}>
                                    {gd.cappedNote}
                                  </div>
                                )}
                                {gd.summary && (
                                  <div style={{ fontSize: 12, color: 'var(--c-fg)', background: 'var(--c-deep)', borderRadius: 4, padding: '8px 12px', marginBottom: 8, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                    {gd.summary}
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {gd.lines.map((c) => (
                                    <div key={c.id || c.title} style={{ fontSize: 12, background: 'var(--c-deep)', borderRadius: 4, padding: '8px 12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: c.feedback ? 3 : 0 }}>
                                        <span style={{ color: 'var(--c-fg)', minWidth: 0, overflowWrap: 'anywhere' }}>
                                          {c.title}
                                          {c.source && <span style={{ color: 'var(--c-meta)', fontSize: 13, marginLeft: 8 }}>{c.source === 'rules' ? 'shape / order' : 'wording'}</span>}
                                        </span>
                                        <span style={{ fontFamily: 'monospace', flexShrink: 0, color: c.verdict === 'met' ? 'var(--c-green)' : c.verdict === 'partial' ? 'var(--c-yellow)' : 'var(--c-red)' }}>
                                          {verdictWord(c.verdict)}{c.max > 0 ? ` ${c.earned}/${c.max}` : ''}
                                        </span>
                                      </div>
                                      {c.feedback && <div style={{ color: 'var(--c-meta)', fontSize: 13, overflowWrap: 'anywhere' }}>{c.feedback}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {gradeData && !isQuiz && describeGrade(sub.grade_json)?.from !== 'ai' && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-green)', marginBottom: 8 }}>
                                {/* A pass/fail rubric has no point total, and a diagram
                                    submission has neither -- both used to render a bare
                                    " / pts" with the numbers missing. */}
                                {typeof gradeData.totalPossible === 'number' && gradeData.totalPossible > 0
                                  ? `${gradeData.totalEarned} / ${gradeData.totalPossible} pts`
                                  : gradeData.criteria && gradeData.criteria.length > 0
                                    ? `${gradeData.criteria.filter((c) => c.verdict === 'met' || c.verdict === 'partial').length} of ${gradeData.criteria.length} criteria met`
                                    : gradeData.structural && gradeData.structural.length > 0
                                      ? `${gradeData.structural.filter((s) => s.passed).length} of ${gradeData.structural.length} checks passed`
                                      : /"gradingFailed"\s*:\s*true/.test(sub.grade_json ?? '') && sub.score === null
                                        ? 'Needs your score: the AI grader could not score this'
                                        : teacherScored && counted
                                          ? `Scored by you: ${scoreOutOf(sub.score, outOf)}`
                                          : 'graded'}
                              </div>

                              {/* Diagram assignments store their browser-side checks here.
                                  Without this the drawer showed a date and a score and
                                  nothing else -- a teacher could not see which check a
                                  student failed, let alone what they drew. */}
                              {gradeData.structural && gradeData.structural.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                  {gradeData.structural.map((s) => (
                                    <div key={s.id} style={{ fontSize: 12, background: 'var(--c-deep)', borderRadius: 4, padding: '8px 12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: s.detail ? 3 : 0 }}>
                                        <span style={{ color: 'var(--c-fg)' }}>{s.title}</span>
                                        <span style={{ color: s.passed ? 'var(--c-green)' : 'var(--c-red)', fontFamily: 'monospace' }}>
                                          {s.passed ? 'pass' : 'fail'}
                                        </span>
                                      </div>
                                      {s.detail && <div style={{ color: 'var(--c-meta)', fontSize: 13 }}>{s.detail}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {gradeData.criteria && gradeData.criteria.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {gradeData.criteria.map((c) => (
                                    <div key={c.id} style={{ fontSize: 12, background: 'var(--c-deep)', borderRadius: 4, padding: '8px 12px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: c.feedback ? 3 : 0 }}>
                                        <span style={{ color: 'var(--c-fg)' }}>{c.title}</span>
                                        <span style={{ color: 'var(--c-cyan)', fontFamily: 'monospace' }}>
                                          {criterionScore(c, !(typeof gradeData.totalPossible === 'number' && gradeData.totalPossible > 0))}
                                        </span>
                                      </div>
                                      {c.feedback && (
                                        <div style={{ color: 'var(--c-meta)', fontSize: 13 }}>{c.feedback}</div>
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
                          {isQuiz && (() => {
                            // Question / chosen answer / right or wrong, the same reading as the review queue's (ux1 G5).
                            const rows = quizAnswerRows(sub.grade_json, sub.response, quizStems[lesson.id], quizContent[lesson.id]) ?? [];
                            const missed = rows.filter((q) => q.correct === false);
                            const keyed = rows.some((q) => q.correct !== null);
                            return (
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 13, color: 'var(--c-meta)', marginBottom: 4 }}>
                                  {!keyed ? `${rows.length} answers` : missed.length === 0 ? 'No questions missed' : `Missed ${missed.length} of ${rows.length}`}
                                </div>
                                <QuizAnswers rows={rows} />
                              </div>
                            );
                          })()}
                          {sub.response && !Array.isArray(gradeData?.quiz) && (
                            <div>
                              <div style={{ fontSize: 13, color: 'var(--c-meta)', marginBottom: 4 }}>
                                {asDiagramMermaid(sub.response) || (gradeData as { artifact?: unknown } | null)?.artifact ? 'Their chart' : 'Their answer'}
                              </div>
                              <pre style={{ margin: 0, maxHeight: 260, overflow: 'auto', background: 'var(--c-deep)', borderRadius: 4, padding: '8px 12px', fontSize: 12, color: 'var(--c-fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
  onOpenStudent: (email: string, lessonId?: string) => void;
}) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [gbData, setGbData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  // Find-a-student controls. All of them only narrow or reorder what is drawn; the CSV still has everyone.
  const [query, setQuery] = useState('');
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'missing'>('name');
  // Off by default: the grid is the graded lessons only (about a tenth of the columns). Readings, slides and
  // examples carry no grade, so they were 640 columns of dots between the ones a teacher came to read.
  const [showAll, setShowAll] = useState(false);
  const [showCategoryColumns, setShowCategoryColumns] = useState(false);
  // The page: one module's columns (its `unit` string), null for every module, undefined while the teacher
  // has not picked one (the default page below). The address carries it as `&module=1.1` or `&module=all`,
  // read once on mount so a reload or a shared link keeps the page.
  const [modulePick, setModulePick] = useState<string | null | undefined>(undefined);
  const [moduleParam] = useState<string | null>(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('module')));
  function pickModule(unit: string | null) {
    setModulePick(unit);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('module', unit === null ? 'all' : moduleKey(unit));
      window.history.replaceState(window.history.state, '', u.toString());
    } catch { /* an address bar we cannot rewrite is not worth failing a page change over */ }
    gridElement?.scrollTo({ left: 0 });
  }
  const [grades, setGrades] = useState<Map<string, GridGrade>>(new Map());
  // At least 168px columns: at 112px the blind panel preferred the old grid 3-0 (titles truncated), and 140px
  // with three-line titles read as cramped. At 168px (156px of text) a title is two lines of 13px prose;
  // measured 2026-11-10, 135 of the 149 graded titles fit. A one-module page has few columns, so they grow
  // to share the grid's width up to 240px (pagedColumnWidth) and the long titles fit too. The width is
  // set below, once the page is known; the scroll sync reads it through this ref.
  const cellWRef = useRef(168);
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
  const [gridW, setGridW] = useState(0);
  const [gridScroll, setGridScroll] = useState({ left: false, right: false, more: 0, partialWidth: 0, rightInset: 0, first: 0, last: 0 });
  const syncGridRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!gridElement) return;
    const sync = () => {
      const remaining = gridElement.scrollWidth - gridElement.clientWidth - gridElement.scrollLeft;
      const lessonCount = Number(gridElement.dataset.lessonCount ?? 0);
      // Cover the entire last partial column, including during smooth scroll.
      // Measuring actual columns also handles summaries, filters and scrollbars.
      const edge = gridElement.getBoundingClientRect().left + gridElement.clientLeft + gridElement.clientWidth;
      const partial = Array.from(gridElement.querySelectorAll('col')).find((col) => {
        const rect = col.getBoundingClientRect();
        return rect.left < edge - 0.01 && rect.right > edge + 0.01;
      });
      // Which lesson columns are in view (more than half of one past the frozen names counts; a column
      // cut by the right edge does not, matching the "N more" count), for the "Lessons 1-5 of 149" label.
      const frozenEdge = gridElement.getBoundingClientRect().left + gridElement.clientLeft + Number(gridElement.dataset.frozen ?? 0);
      const lessonCols = Array.from(gridElement.querySelectorAll<HTMLElement>('col[data-lesson-col]'));
      let first = 0;
      let last = 0;
      lessonCols.forEach((col, i) => {
        const rect = col.getBoundingClientRect();
        if (!first && rect.right - frozenEdge > rect.width / 2) first = i + 1;
        if (rect.left < edge && rect.right <= edge + 0.5) last = i + 1;
      });
      if (last < first) last = first;
      const next = {
        first,
        last,
        rightInset: gridElement.offsetWidth - gridElement.clientLeft - gridElement.clientWidth,
        partialWidth: remaining > 1 && partial ? edge - partial.getBoundingClientRect().left : 0,
        left: gridElement.scrollLeft > 1,
        right: remaining > 1,
        more: Math.min(lessonCount, Math.max(0, Math.ceil((remaining - 1) / cellWRef.current))),
      };
      setGridW((w) => (w === gridElement.clientWidth ? w : gridElement.clientWidth));
      setGridScroll((prev) => prev.left === next.left && prev.right === next.right && prev.more === next.more && prev.first === next.first && prev.last === next.last && prev.partialWidth === next.partialWidth && prev.rightInset === next.rightInset ? prev : next);
      // Unit band labels ("1.3 DOCUMENTATION AND ...") are fitted to the part of their span that is in view,
      // between the frozen name columns and the right edge (or the cover over a partial column), so a label
      // ends in an ellipsis instead of being cut mid-word by the edge. Written straight to the DOM: this
      // runs on every scroll frame and needs no re-render.
      const frozenRight = gridElement.getBoundingClientRect().left + gridElement.clientLeft + Number(gridElement.dataset.frozen ?? 0);
      const visibleRight = edge - next.partialWidth;
      gridElement.querySelectorAll<HTMLElement>('[data-unit-label]').forEach((label) => {
        const cell = label.parentElement;
        if (!cell) return;
        const r = cell.getBoundingClientRect();
        const from = Math.max(r.left, frozenRight);
        const to = Math.min(r.right, visibleRight);
        label.style.marginLeft = `${Math.max(0, from - r.left - 4)}px`;
        label.style.width = `${Math.max(0, to - from - 8)}px`;
      });
    };
    syncGridRef.current = sync;
    sync();
    gridElement.addEventListener('scroll', sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(gridElement);
    if (gridElement.firstElementChild) observer.observe(gridElement.firstElementChild);
    return () => {
      gridElement.removeEventListener('scroll', sync);
      observer.disconnect();
      syncGridRef.current = null;
    };
  }, [gridElement]);
  // A new set of columns (module filter, readings shown) can keep the table's width; refit the unit labels.
  useEffect(() => { syncGridRef.current?.(); });

  // The grade so far beside each name: the same number the roster shows (one endpoint, one rule).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ students: StudentProgress[] }>(`/api/classes/${classId}/progress`).then((res) => {
      if (cancelled || res.error !== null) return;
      setGrades(new Map(res.data.students.map((p) => [p.student_email, {
        pct: Number.isFinite(p.weightedPercent) ? p.weightedPercent : 0,
        counted: p.gradedCounted ?? 1,
        missing: p.gradedMissing ?? 0,
        cats: Object.fromEntries((p.categories ?? []).map((c) => [c.category, c.percent])),
        staff: p.staff === true,
      }])));
    }).catch(() => { /* the column just stays empty; the grid still works */ });
    return () => { cancelled = true; };
  }, [classId]);

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

  // Phone width: the frozen name and grade columns (304px) were wider than the
  // matrix box itself, so no lesson cell was reachable. Below 640px the name
  // column narrows and the grade column scrolls with the lessons.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (loading) return <div style={{ color: 'var(--c-meta)' }}>Loading gradebook…</div>;
  if (err) return <div style={{ color: 'var(--c-red)', fontSize: 13 }}>{err}</div>;
  if (!gbData) return null;
  if (gbData.students.length === 0) {
    return <p style={{ color: 'var(--c-meta)', fontSize: 14 }}>No students enrolled — roster is empty.</p>;
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
  // Units and the lessons inside them go in course order (title number), not folder-id order.
  unitOrder.sort(compareUnitLabels);
  for (const u of unitOrder) byUnit[u].sort(compareLessons);

  // Flatten to an ordered array, then let lib/gradebook-view.ts pick the columns: one module or all of
  // them, counted lessons only unless the teacher asks for the rest.
  const orderedLessons: LessonMeta[] = [];
  for (const u of unitOrder) orderedLessons.push(...byUnit[u]);
  const isGradedLesson = (l: LessonMeta) =>
    lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode }) !== null;
  const moduleChoices = moduleOptions(orderedLessons, isGradedLesson);
  // Paging by module: the pages, the one shown (the teacher's pick, else the address, else the module
  // that was due most recently), and its neighbours. A pick that is no longer a page (the manifest
  // changed, or ungraded lessons were hidden again) falls back to the default page, never an empty grid.
  const pages = modulePages(moduleChoices, showAll);
  const chosen = modulePick !== undefined ? modulePick : resolveModuleParam(pages, moduleParam);
  const moduleSel: string | null = chosen === null
    ? null
    : chosen !== undefined && pages.some((p) => p.unit === chosen)
      ? chosen
      : defaultModule(pages, orderedLessons, isGradedLesson, gbData.dueDates, Date.now());
  const pager = pagerFor(pages, moduleSel);
  const picked = selectGradebookLessons(orderedLessons, { module: moduleSel, showAll, isCounted: isGradedLesson });
  // Every module under the same switches: what the CSV exports and what "Missing or ungraded work" looks
  // across, so neither depends on the page being looked at.
  const everyLesson = moduleSel === null ? picked.lessons : selectGradebookLessons(orderedLessons, { module: null, showAll, isCounted: isGradedLesson }).lessons;
  const hiddenCount = picked.hidden;
  let displayLessons = picked.lessons;
  let displaySpans = picked.spans;
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
  const stickyBg = 'var(--c-deep)';
  const headerBg = 'var(--c-bg)';

  // Category total columns, between the grade and the first lesson.
  const CAT_W = showCategoryColumns ? 64 : 116;
  // r9 T1: on a wide screen the Grade column holds two aligned slots (grade, past due), so it takes 38px
  // from the name column. The two still add up to 274px, so the lesson columns keep their width.
  const EMAIL_W = narrow ? 110 : 152;
  // Height of the unit header row. The per-lesson row sticks at this offset, so
  // the row has to BE this tall: a unit title that wrapped made it 100px and the
  // lesson row slid 67px up over it.
  const HEAD1_H = 28;
  // Frozen only on wide screens (see `narrow` above).
  const gradeLeft = narrow ? undefined : EMAIL_W;

  type CellStatus = 'missing' | 'late' | 'grade' | 'started' | 'not-due';
  const overdueFill = 'color-mix(in srgb, var(--c-red) 11%, transparent)';

  // Presentation only: keep the existing score branches and pending-review priority.
  function nonScoreStatus(cell: GradebookCell | undefined, graded: boolean): CellStatus | null {
    if (cell?.pending) return 'grade';
    if (!cell || (!cell.state && cell.submitted_score === null)) {
      return cell?.late && graded ? 'missing' : 'not-due';
    }
    if (cell.state === 'completed') return null;
    if (cell.state === 'started') {
      if ((cell.score ?? cell.submitted_score) !== null) return null;
      return cell.late && graded ? 'late' : 'started';
    }
    if (cell.submitted_score !== null) return null;
    return cell.late && graded ? 'missing' : 'not-due';
  }

  function statusLabel(status: CellStatus, legend = false): React.ReactNode {
    const overdue = status === 'missing' || status === 'late';
    const label = { missing: 'Missing', late: 'Late', grade: 'Grade', started: 'Started', 'not-due': '—' }[status];
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        whiteSpace: 'nowrap', boxSizing: 'border-box',
        fontFamily: 'var(--font-prose)', fontSize: 13, lineHeight: '20px',
        fontWeight: overdue || status === 'grade' ? 700 : 600,
        padding: status === 'not-due' ? 0 : '0 8px', borderRadius: 4,
        // r7 T2: a missing / late cell is light text with a red dot on a faint red fill. Red text on the red
        // fill was the least legible thing in the grid.
        color: overdue ? 'var(--c-fg)' : status === 'grade' ? 'var(--c-orange)' : status === 'started' ? 'var(--c-yellow)' : 'var(--c-meta)',
        gap: overdue ? 6 : undefined,
        background: overdue && legend ? overdueFill : status === 'grade' ? 'color-mix(in srgb, var(--c-orange) 12%, transparent)' : 'transparent',
        border: status === 'grade' ? '1px solid color-mix(in srgb, var(--c-orange) 45%, transparent)' : status === 'started' ? '1px solid color-mix(in srgb, var(--c-yellow) 40%, transparent)' : '1px solid transparent',
      }}>
        {overdue && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-red)', flexShrink: 0 }} />}
        {label}
      </span>
    );
  }

  function cellContent(cell: GradebookCell | undefined, maxScore?: number | null, graded = true): React.ReactNode {
    // Colour reflects the displayed mark's percentage; the stored mark and grading stay unchanged.
    const scoreColor = (pct: number) => pct >= 90 ? 'var(--c-green)' : pct >= 70 ? 'var(--c-cyan)' : pct >= 50 ? 'var(--c-orange)' : 'var(--c-pink)';
    const withLate = (c: GradebookCell | undefined, node: React.ReactNode) => {
      const mark = c?.score ?? c?.submitted_score;
      const possible = maxScore ?? c?.possible;
      const pct = c?.state === 'completed'
        ? lessonPercent(c.state, c.score, maxScore)
        : mark != null ? (possible != null && possible > 0 ? mark * 100 / possible : mark) : null;
      const color = c?.pending ? 'var(--c-orange)' : graded && pct != null ? scoreColor(pct)
        : c?.state === 'completed' ? 'var(--c-green)' : c?.late && graded ? 'var(--c-red)'
        : c?.state === 'started' ? 'var(--c-yellow)' : 'var(--c-meta)';
      return <span style={{ color }}>{node}</span>;
    };
    const status = nonScoreStatus(cell, graded);
    if (status) return statusLabel(status);
    if (!cell) return null;
    if (cell.state === 'completed') {
      // The PERCENT the grade is built from (lessonPercent, the function functions/_shared/grading.ts
      // uses), not lesson_state.score, which is raw points in the part's own units. The raw number
      // read "0" on a chart lesson that grades 100, and "3" meant 3 of 4 on one lesson and 3 of 10 on
      // the next. The latest attempt's raw points are still in the tooltip (cellTitle).
      const pct = lessonPercent(cell.state, cell.score, maxScore);
      // Practice work (no grade category; only visible with "Show readings and slides") has no mark:
      // its 100 is a placeholder, so a check says "done" without implying a score.
      if (!graded) {
        return withLate(cell, <span style={{ color: 'inherit', fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13 }}>✓</span>);
      }
      // A number for every finished lesson, 100 included: the cell background carries the state.
      return withLate(cell, (
        <span style={{ color: 'inherit', fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 15 }}>
          {pct}
        </span>
      ));
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
          <span style={{ color: 'inherit', fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 15 }}>
            {partial}
          </span>
        ));
      }
      return statusLabel(cell.late && graded ? 'late' : 'started');
    }
    // Has submission data but no lesson_state (edge case)
    if (cell.submitted_score !== null) {
      return withLate(cell, (
        <span style={{ color: 'inherit', fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 15 }}>
          {cell.submitted_score}
        </span>
      ));
    }
    return statusLabel(cell.late && graded ? 'missing' : 'not-due');
  }

  // Plain words for a cell, for the hover tip and for screen readers: what the student has done, the
  // best score, and whether it is late. (This used to print "state: completed | sub score: 4".)
  function cellWords(cell: GradebookCell | undefined, maxScore?: number | null, graded = true): string {
    if (!cell) return 'Not started';
    if (cell.pending) return 'Awaiting a grade: the AI grader failed, see the review queue';
    if (cell.state === 'completed') {
      const pct = lessonPercent(cell.state, cell.score, maxScore);
      if (!graded) return `${cell.late ? 'Completed late' : 'Done'}, practice (not graded)`;
      let pts = cell.score !== null && maxScore != null && maxScore > 0 ? `, best ${Math.round(cell.score * 100) / 100} of ${maxScore} points` : '';
      // A 0-point lab reads 100% whatever it holds; the one number it can carry is the teacher's mark.
      if (cell.possible === 0 && cell.score) pts = `, teacher mark ${cell.score}`;
      return `${cell.late ? 'Completed late' : 'Done'}, ${pct}%${pts}`;
    }
    if (cell.state === 'started') {
      const partial = cell.score ?? cell.submitted_score;
      return `In progress${partial !== null ? `, ${partial} points so far` : ''}${cell.late && graded ? ', past due' : ''}`;
    }
    if (cell.submitted_score !== null) {
      const of = maxScore != null && maxScore > 0 ? ` of ${maxScore}` : '';
      return `Handed in, ${cell.submitted_score}${of} points, not passed yet`;
    }
    return cell.late && graded ? 'Missing: past due, not started' : 'Not started';
  }

  function cellTitle(cell: GradebookCell | undefined, lessonTitle: string, lessonId?: string, maxScore?: number | null, graded = true): string {
    const dueAt = lessonId ? gbData?.dueDates?.[lessonId] : undefined;
    const lines = [lessonTitle, cellWords(cell, maxScore, graded)];
    // Practice work reads as practice only: its stored score is a placeholder and a try's number beside
    // "not graded" invites reading it as a mark. submitted_score is the latest try, so the label is right.
    if (graded && cell && cell.possible !== null && cell.possible > 0 && cell.submitted_score !== null) {
      lines.push(`Latest try: ${cell.submitted_score} of ${cell.possible}`);
    }
    if (dueAt) lines.push(`Due ${formatDue(dueAt)}`);
    return lines.join('\n');
  }

  // Students shown: filtered by the search box and the "problems only" switch, then ordered.
  // A reading or a slide deck has a due date through its module but is not graded, so only graded lessons
  // count as a problem here, the same set the grade's "past due" number counts.
  const gradedIds = new Set(
    [...everyLesson, ...displayLessons].filter((l) => lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode }) !== null).map((l) => l.id),
  );
  const isProblem = (st: GradebookStudent) =>
    Object.entries(st.cells).some(([id, c]) => gradedIds.has(id) && (c.pending || (c.late && c.state !== 'completed')));
  const q = query.trim().toLowerCase();
  // Named students first by LAST name then first name; accounts with no name set go last, by email (ux2 T8:
  // the option says "last name", because the rows show "First Last" and A-Z by first name was what people expected).
  const byName = compareByLastName;
  // Staff on the roster (owner, co-teacher, non-student account) are not gradebook rows (ux2 T6).
  const classStudents = gbData.students.filter((st) => !grades.get(st.email)?.staff);
  const visibleStudents = classStudents
    .filter((st) => (q === '' ? true : `${st.firstName ?? ''} ${st.lastName ?? ''} ${st.email}`.toLowerCase().includes(q)))
    .filter((st) => !problemsOnly || isProblem(st))
    .sort((a, b) => {
      if (sortBy === 'grade') return (grades.get(a.email)?.pct ?? 101) - (grades.get(b.email)?.pct ?? 101) || byName(a, b);
      if (sortBy === 'missing') return (grades.get(b.email)?.missing ?? 0) - (grades.get(a.email)?.missing ?? 0) || byName(a, b);
      return byName(a, b);
    });
  const GRADE_W = narrow ? 64 : 122;

  // Which grade category each shown lesson belongs to (null = not graded) and the categories that appear,
  // in the course's own order. Each category gets a total column; the numbers are the server's
  // (studentGrading via /progress), never recomputed here.
  const catOf = new Map(
    displayLessons.map((l) => [l.id, lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode })] as const),
  );
  const shownCats = GRADE_CATEGORIES.filter((c) => displayLessons.some((l) => catOf.get(l.id) === c));

  // ux2 T9: on a phone the Summary column is left out (it is still there through "Show category columns"), so a
  // lesson column fits beside the names; the frozen name + grade + summary were wider than the whole grid box.
  const showSummary = !showCategoryColumns && shownCats.length > 0 && !narrow;
  const categoryColumnCount = shownCats.length ? (showCategoryColumns ? shownCats.length : showSummary ? 1 : 0) : 0;
  // Column width for this page (see cellWRef above): the room right of the frozen and total columns,
  // shared by this module's lessons; the every-module grid keeps the 168px minimum.
  const CELL_W = narrow
    ? Math.max(92, Math.floor(((gridW || 300) - EMAIL_W) / 2)) // two lesson columns beside the names once the grade scrolls off
    : moduleSel === null
      ? 168
      : pagedColumnWidth(gridW - EMAIL_W - GRADE_W - CAT_W * categoryColumnCount, displayLessons.length);
  cellWRef.current = CELL_W;
  const showScrollCue = moduleSel === null || gridScroll.left || gridScroll.right;

  function handleDownloadCsv() {
    // Every module, never just the page on screen; every student, never just the search result.
    const all = everyLesson.length > 0 ? everyLesson : displayLessons;
    const csv = buildLessonScoresCsv(
      classStudents.map((st) => {
        const g = grades.get(st.email);
        return { email: st.email, firstName: st.firstName, lastName: st.lastName, grade: g && g.counted > 0 ? g.pct : null, cells: st.cells };
      }),
      all.map((l) => ({ id: l.id, title: l.title, maxScore: l.maxScore, due: gbData!.dueDates?.[l.id] ? schoolDateString(gbData!.dueDates[l.id]) : null })),
    );
    const file = `lesson-scores-${className.replace(/\s+/g, '-')}-${schoolDateString(Date.now())}.csv`;
    downloadCsv(csv, file);
    toast(`Downloaded ${file}: one row per student, one column per graded lesson.`);
  }

  // ux2 T8: a class average per lesson and for the grade, for display only: the mean of the percents already on
  // this page, over the students who have one (a finished lesson; a grade with something counted). Missing work
  // is not in a lesson's average (it is in each student's grade, by the one grade rule).
  const gradeAvg = classAverage(classStudents.map((st) => { const g = grades.get(st.email); return g && g.counted > 0 ? g.pct : null; }));
  const lessonAvg = (lesson: LessonMeta) =>
    classAverage(classStudents.map((st) => {
      const c = st.cells[lesson.id];
      return c?.state === 'completed' && gradedIds.has(lesson.id) ? lessonPercent(c.state, c.score, lesson.maxScore) : null;
    }));

  return (
    <div
      style={fullScreen ? {
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'var(--c-bg)', padding: 16,
        display: 'flex', flexDirection: 'column',
      } : undefined}
    >
      {/* Toolbar, two rows (climb4 r6): the pager and its counts, with find / order / More on the right;
          then the legend. */}
      <div className="gb-toolbar" style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* Pager: one module's lessons per page, or every module (the old scrolling grid). */}
        {pages.length > 0 && (
          <nav aria-label="Gradebook pages" className="gb-pager">
            <button
              type="button"
              className="gb-pager-step"
              disabled={pager.position === 0 || pager.prev === null}
              onClick={() => pager.prev !== null && pickModule(pager.prev)}
              aria-label={pager.prev ? `Previous module: ${pager.prev}` : 'No previous module'}
            >
              ‹ Previous
            </button>
            <select
              value={moduleSel ?? ''}
              onChange={(e) => pickModule(e.target.value === '' ? null : e.target.value)}
              aria-label="Gradebook page: one module, or all modules"
              className="teacher-field gb-pager-select"
            >
              {pages.map((m) => (
                <option key={m.unit} value={m.unit}>{m.unit} · {pageSize(m, showAll)} {showAll ? 'lessons' : 'graded'}</option>
              ))}
              <option value="">All modules · {everyLesson.length} {showAll ? 'lessons' : 'graded'}</option>
            </select>
            <button
              type="button"
              className="gb-pager-step"
              disabled={pager.next === null}
              onClick={() => pager.next !== null && pickModule(pager.next)}
              aria-label={pager.next ? `${pager.position === 0 ? 'First' : 'Next'} module: ${pager.next}` : 'No next module'}
            >
              {pager.position === 0 ? 'First module ›' : 'Next ›'}
            </button>
            <p className="gb-pager-where" aria-live="polite">
              {pager.position > 0 ? (
                <>
                  {/* The picker names the module, so this line carries only the counts (climb4 r6). */}
                  {/* r7 T2: the picker already carries the lesson count, so this says only where the page is. */}
                  <span>Module {pager.position} of {pager.total}</span>
                </>
              ) : (
                <>
                  <span>{displayLessons.length} {showAll ? '' : 'graded '}lessons in {pager.total} modules</span>
                </>
              )}
            </p>
          </nav>
        )}
        {pages.length === 0 && (
          <span style={{ fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--c-meta)', whiteSpace: 'nowrap' }}>
            {`${classStudents.length} student${classStudents.length !== 1 ? 's' : ''}`}
            {' · '}{displayLessons.length} lesson{displayLessons.length !== 1 ? 's' : ''}
          </span>
        )}
        <div className="gb-toolbar-right" style={{ display: 'flex', flexWrap: narrow ? 'wrap' : 'nowrap', alignItems: 'center', gap: 8, marginLeft: narrow ? 0 : 'auto', minWidth: 0, flex: narrow ? '1 1 100%' : undefined }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a student"
          aria-label="Find a student by name or email"
          className="teacher-field"
          style={{ background: 'var(--c-deep2)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, height: 32, boxSizing: 'border-box', padding: '4px 8px', fontFamily: 'var(--font-prose)', fontSize: 15, width: narrow ? '100%' : 180, minWidth: 0, flex: narrow ? '1 1 100%' : '0 1 180px' }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'grade' | 'missing')}
          aria-label="Order students by"
          className="teacher-field"
          style={{ background: 'var(--c-deep2)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, height: 32, padding: '4px 8px', fontFamily: 'var(--font-prose)', fontSize: 15, maxWidth: narrow ? '100%' : 240, minWidth: 0 }}
        >
          <option value="name">Order: last name, A to Z</option>
          <option value="grade">Order: lowest grade first</option>
          <option value="missing">Order: most past due first</option>
        </select>
        {/* Scroll cue: on the every-module grid always, on a module page only when its columns do not fit. */}
        {showScrollCue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: narrow ? 0 : 'auto', flexShrink: 0 }}>
          {/* Where the view is in the course, so "N more" has a position. */}
          {gridScroll.first > 0 && displayLessons.length > 0 && (
            <span style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: 'var(--c-meta)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              Lessons <strong style={{ color: 'var(--c-fg)', fontWeight: 600 }}>{gridScroll.first === gridScroll.last ? gridScroll.first : `${gridScroll.first}–${gridScroll.last}`}</strong> of {displayLessons.length}
            </span>
          )}
          <button
            type="button"
            disabled={!gridScroll.left}
            aria-label="Scroll back three lesson columns"
            onClick={() => gridElement?.scrollBy({ left: -CELL_W * 3, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
            title="Student names stay in view while the lessons scroll"
            style={{ height: 32, padding: '0 8px', flexShrink: 0, borderRadius: 4, border: '1px solid var(--c-line)', background: 'var(--c-deep2)', color: 'var(--c-cyan)', fontSize: 13, opacity: gridScroll.left ? 1 : 0.5, cursor: gridScroll.left ? 'pointer' : 'not-allowed' }}
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={!gridScroll.right}
            aria-label={`Scroll forward three lesson columns, ${gridScroll.more} more lessons to the right`}
            onClick={() => gridElement?.scrollBy({ left: CELL_W * 3, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
            title="Student names stay in view while the lessons scroll"
            style={{ height: 32, padding: '0 12px', flexShrink: 0, whiteSpace: 'nowrap', borderRadius: 4, border: '1px solid var(--c-cyan)', background: 'var(--c-deep2)', color: 'var(--c-cyan)', fontSize: 13, fontWeight: 700, opacity: gridScroll.right ? 1 : 0.5, cursor: gridScroll.right ? 'pointer' : 'not-allowed' }}
          >
            {gridScroll.right ? `${gridScroll.more} more lesson${gridScroll.more === 1 ? '' : 's'} →` : gridScroll.left ? 'End of lessons' : 'All lessons in view'}
          </button>
          <span aria-live="polite" className="sr-only">{gridScroll.right ? `${gridScroll.more} more lesson${gridScroll.more === 1 ? '' : 's'} to the right.` : 'All lessons shown.'} Student names stay in view.</span>
        </div>
        )}
        <details style={{ position: 'relative', fontSize: 13, color: 'var(--c-fg)', flexShrink: 0, marginLeft: !showScrollCue && !narrow ? 'auto' : undefined }}>
          <summary style={{ cursor: 'pointer', height: 32, boxSizing: 'border-box', padding: '4px 12px', border: '1px solid var(--c-line)', borderRadius: 4 }}>More{showAll || problemsOnly ? ' •' : ''} ▾</summary>
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 30, background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 16, width: 260, maxWidth: 'calc(100vw - 64px)', boxSizing: 'border-box', display: 'grid', gap: 12 }}>
        <label style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.4, color: 'var(--c-fg)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} title="By default the grid shows only the lessons that count toward the grade. Tick this to add the ones that do not (readings, slides, examples, and any lab or chart with no grade category). They show a check mark, never a score.">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Include ungraded lessons{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
        </label>
        <label style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.4, color: 'var(--c-fg)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
          Missing or ungraded work
        </label>
        <label style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.4, color: 'var(--c-fg)', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={showCategoryColumns} onChange={e => setShowCategoryColumns(e.target.checked)} />
          Show category columns
        </label>
        <button
          style={{
            ...S.btn(fullScreen ? 'var(--c-pink)' : 'transparent'),
            width: '100%',
            // S.btn hardcodes color:var(--c-bg) for its dark-text-on-bright-fill
            // case. With a transparent fill that is black on near-black, so
            // the outline state has to restate both colour and border.
            ...(fullScreen ? {} : { color: 'var(--c-cyan)', border: '1px solid var(--c-cyan)' }),
          }}
          onClick={() => setFullScreen((v) => !v)}
          title={fullScreen ? 'Esc also exits' : 'Fill the window with the matrix'}
        >
          {fullScreen ? '✕ Exit full screen' : '⛶ Full screen'}
        </button>
        <button style={{ ...S.btn('transparent'), color: 'var(--c-cyan)', border: '1px solid var(--c-line)', whiteSpace: 'normal', height: 'auto', minHeight: 32 }} onClick={handleDownloadCsv}>Download lesson scores (CSV)</button>
        <p style={{ margin: 0, fontFamily: 'var(--font-prose)', fontSize: 13, lineHeight: 1.45, color: 'var(--c-meta)' }}>
          One row per student, one column per graded lesson. For one row per student with the grade only, use Download grades on the Students tab.
        </p>
          </div>
        </details>
        </div>
      </div>

      {/* r10 T1: the legend is a "Key": closed, five swatches with a short label each and room between them;
          open, a plain sentence for each state. The hint that a cell opens the work sits at the row's end. */}
      <div className="gb-legend-row">
        <details className="gb-key">
          <summary aria-label="Gradebook key: what each cell means. Select to read more.">
            <span className="gb-key-title">Key</span>
            <span className="gb-legend" role="list">
              {([
                { key: 'done', swatch: 'var(--c-green)', label: 'Done' },
                { key: 'missing', swatch: 'var(--c-red)', label: 'Missing' },
                { key: 'grade', swatch: 'var(--c-orange)', label: 'Needs grading' },
                { key: 'started', swatch: 'var(--c-yellow)', label: 'Started' },
                { key: 'not-due', swatch: 'var(--c-line)', label: 'Not due yet' },
              ] as const).map(({ key, swatch, label }) => (
                <span key={key} role="listitem" className="gb-legend-item">
                  <span aria-hidden="true" className="gb-legend-swatch" style={{ background: swatch }} />
                  {label}
                </span>
              ))}
            </span>
            <span className="gb-key-more" aria-hidden="true">What these mean</span>
          </summary>
          <dl className="gb-key-list">
            <div><dt><span aria-hidden="true" className="gb-legend-swatch" style={{ background: 'var(--c-green)' }} />Done</dt><dd>A number is the score on finished work, out of 100.</dd></div>
            <div><dt><span aria-hidden="true" className="gb-legend-swatch" style={{ background: 'var(--c-red)' }} />Missing</dt><dd>Past its due date and not done. It counts as 0 in the grade.</dd></div>
            <div><dt><span aria-hidden="true" className="gb-legend-swatch" style={{ background: 'var(--c-orange)' }} />Needs grading</dt><dd>Handed in and waiting for your score on the Today tab.</dd></div>
            <div><dt><span aria-hidden="true" className="gb-legend-swatch" style={{ background: 'var(--c-yellow)' }} />Started</dt><dd>Opened but not finished yet.</dd></div>
            <div><dt><span aria-hidden="true" className="gb-legend-swatch" style={{ background: 'var(--c-line)' }} />Not due yet</dt><dd>A dash: not started, and the due date has not passed.</dd></div>
          </dl>
        </details>
        {/* ux2 T8: how many students a search shows, here rather than in the toolbar, so typing in Find a
            student never pushes the toolbar onto a second row under the cursor. */}
        <span className="gb-filter-count" aria-live="polite">
          {visibleStudents.length !== classStudents.length ? `Showing ${visibleStudents.length} of ${classStudents.length} students` : ''}
        </span>
        {/* r8 T5: a still screen shows no hover, so say once that a cell opens the work. */}
        <span className="gb-open-hint"><MousePointerClick size={14} aria-hidden="true" />Select a score to open the work</span>
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
      <div style={{ position: 'relative', minHeight: 0, ...(fullScreen ? { display: 'flex', flex: 1 } : {}) }}>
      {gridScroll.left && <div aria-hidden="true" style={{ position: 'absolute', left: EMAIL_W + (narrow ? 0 : GRADE_W), top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, var(--c-bg), transparent)', borderLeft: '2px solid var(--c-cyan)', zIndex: 5, pointerEvents: 'none' }} />}
      {gridScroll.right && <div aria-hidden="true" data-gradebook-edge style={{ position: 'absolute', right: gridScroll.rightInset, top: 0, bottom: 0, width: gridScroll.partialWidth || 2, background: gridScroll.partialWidth > 0 ? 'var(--c-bg)' : 'var(--c-cyan)', borderLeft: gridScroll.partialWidth > 0 ? '2px solid var(--c-cyan)' : undefined, boxSizing: 'border-box', zIndex: 5, pointerEvents: 'none' }} />}
      <div
        ref={setGridElement}
        data-lesson-count={displayLessons.length}
        data-frozen={EMAIL_W + (narrow ? 0 : GRADE_W)}
        style={{
          width: '100%',
          overflow: 'auto',
          // In the overlay the box owns the window, so it takes the remaining
          // flex space instead of guessing at how much chrome sits above it.
          ...(fullScreen ? { flex: 1, minHeight: 0 } : { maxHeight: 'calc(100vh - 140px)' }),
          border: '1px solid var(--c-line)',
          borderRadius: 6,
        }}
      >
        <table style={{ borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', width: EMAIL_W + GRADE_W + CAT_W * categoryColumnCount + CELL_W * displayLessons.length, minWidth: EMAIL_W + GRADE_W + CAT_W * categoryColumnCount + CELL_W * displayLessons.length }}>
          <colgroup>
            <col style={{ width: EMAIL_W }} />
            <col style={{ width: GRADE_W }} />
            {Array.from({ length: categoryColumnCount }, (_, i) => <col key={`category-${i}`} style={{ width: CAT_W }} />)}
            {displayLessons.map((lesson) => <col key={lesson.id} data-lesson-col style={{ width: CELL_W }} />)}
          </colgroup>
          {/* Unit-spanning header row */}
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: 'sticky', left: 0, top: 0, zIndex: 3,
                  width: EMAIL_W, minWidth: EMAIL_W,
                  boxSizing: 'border-box',
                  background: headerBg, padding: '8px 12px',
                  borderBottom: '2px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                  textAlign: 'left', color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600,
                }}
                className="gb-head-student"
              >
                Student
              </th>
              <th
                rowSpan={2}
                style={{
                  position: 'sticky', left: gradeLeft, top: 0, zIndex: 3,
                  width: GRADE_W, minWidth: GRADE_W,
                  boxSizing: 'border-box',
                  background: headerBg, padding: '8px 8px',
                  borderBottom: '2px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                  textAlign: 'center', color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600,
                }}
                className="gb-head-grade"
                title="Grade so far: work done plus work past its due date, under this class's weights. Lessons not due yet are left out. Past due is how many graded lessons are past due and not done."
              >
                {/* r9 T1: grade and past due are two aligned slots with their own headings (one slot on a phone). */}
                {narrow ? 'Grade' : (
                  <span className="gb-grade-pair"><span>Grade</span><span>Past due</span></span>
                )}
              </th>
              {categoryColumnCount > 0 && (
                <th
                  colSpan={categoryColumnCount}
                  style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    height: HEAD1_H, boxSizing: 'border-box',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    background: headerBg, padding: '4px 4px',
                    borderBottom: '1px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                    textAlign: 'center', color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600,
                  }}
                  title="Percent per grade category, from the same rule as the grade"
                  className="gb-head-totals"
                >
                  Totals
                </th>
              )}
              {displaySpans.map(({ unit, count }) => (
                <th
                  key={unit}
                  colSpan={count}
                  title={unit}
                  className="gb-head-unit"
                  style={{
                    position: 'sticky', top: 0, zIndex: 2,
                    height: HEAD1_H, boxSizing: 'border-box',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    background: headerBg, padding: '4px 4px',
                    borderBottom: '1px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                    textAlign: 'center', color: 'var(--c-purple)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600,
                    width: CELL_W * count,
                  }}
                >
                  <span data-unit-label style={{ display: 'block', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit}</span>
                </th>
              ))}
            </tr>
            {/* Per-lesson title row */}
            <tr>
              {showSummary && <th className="gb-head-summary" style={{ position: 'sticky', top: HEAD1_H, zIndex: 2, width: CAT_W, background: stickyBg, color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600, borderBottom: '2px solid var(--c-line)' }}>Summary</th>}
              {showCategoryColumns && shownCats.map((c, ci) => (
                <th
                  key={c}
                  className={ci === shownCats.length - 1 ? 'gb-cat-last' : undefined}
                  title={`${CATEGORY_LABEL[c]}: percent across this category's graded lessons`}
                  style={{
                    position: 'sticky', top: HEAD1_H, zIndex: 2,
                    width: CAT_W, minWidth: CAT_W, maxWidth: CAT_W,
                    height: 56, verticalAlign: 'top', overflow: 'hidden',
                    background: stickyBg, padding: '8px 4px 8px',
                    borderTop: `3px solid ${CAT_COLOR[c]}`,
                    borderBottom: '2px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                    textAlign: 'center', color: CAT_COLOR[c], fontFamily: 'var(--font-prose)', fontSize: 12, fontWeight: 700,
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{CAT_SHORT[c]}</span>
                </th>
              ))}
              {displayLessons.map((lesson) => (
                <th
                  key={lesson.id}
                  className="gb-head-lesson"
                  title={`${lesson.title}${lesson.maxScore ? ` · ${lesson.maxScore} pts` : ''}${gbData.dueDates?.[lesson.id] ? ` · Due ${formatDue(gbData.dueDates[lesson.id])}` : ''}`}
                  style={{
                    position: 'sticky', top: HEAD1_H, zIndex: 2,
                    width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                    // The lesson number as a small meta line, then the title in at most two lines of 13px
                    // prose. One fixed height for exactly that (3 + 6 + 16 + 2 + 36 + 6 + 2 = 71px); a
                    // longer title ends in an ellipsis and its full text is the tooltip.
                    height: 72, boxSizing: 'border-box', verticalAlign: 'top', overflow: 'hidden',
                    background: stickyBg, padding: '6px 6px 6px',
                    borderTop: `3px solid ${catOf.get(lesson.id) ? CAT_COLOR[catOf.get(lesson.id) as GradeCategory] : 'var(--c-line)'}`,
                    borderBottom: '2px solid var(--c-line)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)',
                    textAlign: 'left', color: 'var(--c-fg)', fontSize: 13,
                    fontWeight: 700,
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
                    className="gb-lesson-link"
                    href={lessonHref(lesson)}
                    target="_blank"
                    rel="noreferrer"
                    title={lesson.title}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      // Full title stays available in the header tooltip.
                      display: 'block',
                      maxWidth: CELL_W - 12,
                      whiteSpace: 'normal',
                      overflow: 'hidden',
                      lineHeight: 1.25,
                    }}
                  >
                    <strong style={{ display: 'block', color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, lineHeight: '16px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title.match(/^\d+\.\d+\.\d+/)?.[0] ?? lesson.title}</strong>
                    <span className="gb-lesson-title" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, maxHeight: 36, marginTop: 2, color: 'var(--c-fg)', fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 600, lineHeight: '18px', overflow: 'hidden', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{lesson.title.replace(/^\d+\.\d+\.\d+\s*[:–—.-]?\s*/, '')}</span>
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ux2 T8: how the class did, per lesson and on the grade. Display only, from the cells on this page. */}
            {classStudents.length > 1 && (
              <tr className="gb-avg-row">
                <th scope="row" className="gb-avg-label" style={{ position: 'sticky', left: 0, zIndex: 1, width: EMAIL_W, minWidth: EMAIL_W }}>
                  Class average
                  <span className="gb-avg-sub">of finished work</span>
                </th>
                <td
                  className="gb-avg-cell"
                  style={{ position: 'sticky', left: gradeLeft, zIndex: 1, width: GRADE_W, minWidth: GRADE_W }}
                  title={gradeAvg.avg === null ? 'No student has anything counted yet' : `Average grade so far: ${gradeAvg.avg}%, across ${gradeAvg.n} student${gradeAvg.n === 1 ? '' : 's'} with something counted`}
                >
                  {gradeAvg.avg === null ? '—' : `${gradeAvg.avg}%`}
                </td>
                {Array.from({ length: categoryColumnCount }, (_, i) => <td key={`avg-cat-${i}`} className="gb-avg-cell" aria-hidden="true" />)}
                {displayLessons.map((lesson) => {
                  const a = lessonAvg(lesson);
                  return (
                    <td
                      key={lesson.id}
                      className="gb-avg-cell"
                      title={a.avg === null
                        ? `${lesson.title}: nobody has finished it yet`
                        : `${lesson.title}: average ${a.avg} across the ${a.n} of ${classStudents.length} students who finished it. Missing work is not in this average.`}
                    >
                      {/* ux3: "100" alone read as the column's result over a column of Missing cells. The average
                          of finished work says so, with how many finished, in a quiet line. */}
                      {a.avg === null ? <span className="gb-avg-none">—</span> : (
                        <span className="gb-avg-line">
                          <span className="gb-avg-v">{a.avg} avg</span>
                          <span className="gb-avg-n">{a.n} of {classStudents.length} done</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
            {visibleStudents.length === 0 && (
              <tr><td colSpan={displayLessons.length + categoryColumnCount + 2} style={{ padding: 16, color: 'var(--c-meta)' }}>No student matches. Clear the search or the filter above.</td></tr>
            )}
            {visibleStudents.map((student, i) => (
              <tr
                key={student.email}
                style={{ height: 32, lineHeight: '20px', whiteSpace: 'nowrap', background: i % 2 === 0 ? 'var(--c-deep)' : 'var(--x-252636)' }}
              >
                {/* Sticky email cell */}
                <td
                  style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: i % 2 === 0 ? 'var(--c-deep)' : 'var(--x-252636)',
                    width: EMAIL_W, minWidth: EMAIL_W,
                    padding: '8px 12px',
                    borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                    fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 500, color: 'var(--c-cyan)',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                  onClick={() => onOpenStudent(student.email)}
                  title={student.email}
                >
                  {fullName(student.firstName, student.lastName) || student.email}
                </td>
                {/* Grade so far */}
                {(() => {
                  const g = grades.get(student.email);
                  const bg = i % 2 === 0 ? 'var(--c-deep)' : 'var(--x-252636)';
                  return (
                    <td
                      className="gb-cell-grade"
                      style={{
                        position: 'sticky', left: gradeLeft, zIndex: 1, background: bg,
                        width: GRADE_W, minWidth: GRADE_W, padding: '8px 8px', textAlign: 'center',
                        borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 26.6667%, transparent)',
                        fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums',
                        color: !g || g.counted === 0 ? 'var(--c-meta)' : countedGradeColor(g.pct),
                      }}
                      title={g ? (g.counted === 0 ? 'Nothing is due yet and nothing is done' : `Grade so far ${g.pct}%${g.missing > 0 ? `, ${g.missing} past due and not done` : ''}`) : 'Loading'}
                    >
                      {narrow ? (
                        <>
                          {g ? (g.counted === 0 ? '—' : `${g.pct}%`) : '…'}
                          {g && g.missing > 0 && <span style={{ display: 'block', color: 'var(--c-red)', fontWeight: 400, fontSize: 12, lineHeight: '14px' }} aria-label={`${g.missing} past due and not done`}>{g.missing} missing</span>}
                        </>
                      ) : (
                        <span className="gb-grade-pair">
                          <span>{g ? (g.counted === 0 ? '—' : `${g.pct}%`) : '…'}</span>
                          <span>
                            {g && g.missing > 0
                              ? <span className="gb-late-badge" aria-label={`${g.missing} past due`}>{g.missing}</span>
                              : <span className="gb-grade-zero">{g ? '0' : ''}</span>}
                          </span>
                        </span>
                      )}
                    </td>
                  );
                })()}
                {/* Category totals: the server's per-category percent, a dash where nothing in it counts yet */}
                {showSummary && <td className="gb-cell-summary" style={{ width: CAT_W, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '8px 8px', color: 'var(--c-fg)', fontSize: 14, fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums', background: 'color-mix(in srgb, var(--c-purple) 6%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)' }} title={shownCats.map(c => `${CATEGORY_LABEL[c]}: ${grades.get(student.email)?.cats[c] === undefined ? 'nothing counted yet' : `${grades.get(student.email)?.cats[c]}%`}`).join(' · ')}>
                  {(() => {
                    const c = shownCats.find(c => grades.get(student.email)?.cats[c] !== undefined);
                    return c ? <strong>{CAT_SHORT[c]} {grades.get(student.email)?.cats[c]}%</strong> : <span style={{ color: 'var(--c-meta)' }}>—</span>;
                  })()}
                </td>}
                {showCategoryColumns && shownCats.map((c, ci) => {
                  const v = grades.get(student.email)?.cats[c];
                  return (
                    <td
                      key={c}
                      className={ci === shownCats.length - 1 ? 'gb-cat-last' : undefined}
                      style={{
                        width: CAT_W, minWidth: CAT_W, maxWidth: CAT_W, padding: '8px 4px', textAlign: 'center',
                        borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)',
                        fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-prose)', fontVariantNumeric: 'tabular-nums',
                        background: 'color-mix(in srgb, var(--c-comment) 10.0%, transparent)',
                        color: v === undefined ? 'var(--c-meta)' : countedGradeColor(v),
                      }}
                      title={v === undefined ? `${CATEGORY_LABEL[c]}: nothing counted yet` : `${CATEGORY_LABEL[c]}: ${v}%`}
                    >
                      {v === undefined ? '–' : `${v}%`}
                    </td>
                  );
                })}
                {/* Cell per lesson */}
                {displayLessons.map((lesson) => {
                  const cell = student.cells[lesson.id];
                  const isCodingLesson = CODE_PREVIEWS.has(lesson.preview ?? '');
                  const status = nonScoreStatus(cell, gradedIds.has(lesson.id));
                  return (
                    <td
                      key={lesson.id}
                      className={isCodingLesson || cell ? 'gb-cell-open' : undefined}
                      style={{
                        width: CELL_W, minWidth: CELL_W, maxWidth: CELL_W,
                        padding: '8px 4px', fontSize: 14,
                        borderBottom: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)', borderRight: '1px solid color-mix(in srgb, var(--c-line) 13.3333%, transparent)',
                        textAlign: 'center', verticalAlign: 'middle',
                        background: status === 'missing' || status === 'late' ? overdueFill : 'transparent',
                        ...(isCodingLesson || cell ? { cursor: 'pointer' } : {}),
                      }}
                      title={cellTitle(cell, lesson.title, lesson.id, lesson.maxScore, gradedIds.has(lesson.id))}
                      aria-label={`${fullName(student.firstName, student.lastName) || student.email}, ${lesson.title}: ${cellWords(cell, lesson.maxScore, gradedIds.has(lesson.id))}`}
                      tabIndex={isCodingLesson || cell ? 0 : undefined}
                      onKeyDown={isCodingLesson ? (e) => {
                        if (e.key === 'Enter') router.push(`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(student.email)}&lesson=${encodeURIComponent(lesson.id)}`);
                      } : cell ? (e) => {
                        if (e.key === 'Enter') onOpenStudent(student.email, lesson.id);
                      } : undefined}
                      onClick={isCodingLesson ? () => {
                        router.push(`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(student.email)}&lesson=${encodeURIComponent(lesson.id)}`);
                      } : cell ? () => onOpenStudent(student.email, lesson.id) : undefined}
                    >
                      {cellContent(cell, lesson.maxScore, gradedIds.has(lesson.id))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

// Only the existing grading panel needs this flag; teacher containers use CSS.
function useGradingWeightsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

function ListView() {
  const router = useRouter();
  const { toast } = useFeedback();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // r7 T3: "New class" is a button at the top right of the heading that opens a small form under it, so the
  // grid holds only class cards. With no class yet the form starts open.
  const [createOpen, setCreateOpen] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);
  const newClassBtnRef = useRef<HTMLButtonElement>(null);
  const createPanelRef = useRef<HTMLFormElement>(null);
  // The form is a popover over the page: a click outside it (and outside its button) closes it.
  useEffect(() => {
    if (!createOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (createPanelRef.current?.contains(t) || newClassBtnRef.current?.contains(t)) return;
      setCreateOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [createOpen]);
  // Per class: students with work past due, and submissions waiting for a grade. Filled in as each class
  // answers, so the list shows at a glance which of five classes needs a teacher first.
  const [chips, setChips] = useState<Record<string, { behind: number; toGrade: number }>>({});
  let lastId: string | null = null;
  try { lastId = window.localStorage.getItem('shcode:lastClass'); } catch { /* private window */ }

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

  useEffect(() => {
    let cancelled = false;
    for (const c of classes) {
      if (c.archived_at) continue;
      void Promise.all([
        apiFetch<{ students: StudentProgress[] }>(`/api/classes/${c.id}/progress`),
        apiFetch<{ awaiting_grade?: unknown[] }>(`/api/classes/${c.id}/needs-attention`),
      ]).then(([prog, att]) => {
        if (cancelled || prog.error !== null) return;
        // The roster's own number: students (never staff) with graded work past due and not done (ux2 T6).
        const behind = prog.data.students.filter((p) => !p.staff && (p.gradedMissing ?? 0) > 0).length;
        const toGrade = att.error === null ? (att.data.awaiting_grade?.length ?? 0) : 0;
        setChips((prev) => ({ ...prev, [c.id]: { behind, toGrade } }));
      });
    }
    return () => { cancelled = true; };
  }, [classes]);

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
      setCreateError(`Could not create the class: ${result.error.replace(/\.$/, '')}. Nothing was created; try again.`);
    } else {
      setNewName('');
      router.push(`/teacher?class=${result.data.class.id}`);
    }
  }

  const showCreate = createOpen || classes.length === 0;

  if (loading) return <div style={{ color: 'var(--c-meta)' }}>Loading…</div>;
  if (forbidden)
    return (
      <div style={{ color: 'var(--c-red)', fontSize: 16, padding: 32 }}>Teacher access required.</div>
    );

  return (
    <div className="teacher-frame">
      {/* Heading row: title and intro on the left, the one page action on the right (r7 T3). */}
      <div className="teacher-list-head">
        <div style={{ minWidth: 0 }}>
          <h1 style={{ ...S.h1, marginBottom: 8 }}>My classes</h1>
          <p style={{ color: 'var(--c-meta)', margin: 0, fontFamily: 'var(--font-prose)', fontSize: 15, lineHeight: 1.5, maxWidth: '70ch' }}>Your classroom at a glance. Open a class to review work and support your students.</p>
        </div>
        <button
          ref={newClassBtnRef}
          type="button"
          className="teacher-new-class-btn"
          aria-expanded={showCreate}
          aria-controls="new-class-panel"
          onClick={() => {
            const next = !createOpen;
            setCreateOpen(next);
            if (next) window.setTimeout(() => createInputRef.current?.focus(), 0);
          }}
        >
          <span aria-hidden="true">+</span> New class
        </button>
        {showCreate && (
          <form
            id="new-class-panel"
            className={classes.length > 0 ? 'teacher-create-panel is-pop' : 'teacher-create-panel'}
            ref={createPanelRef}
            onSubmit={(e) => { void handleCreate(e); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && classes.length > 0) {
                setCreateOpen(false);
                newClassBtnRef.current?.focus();
              }
            }}
          >
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <label htmlFor="new-class-name" style={S.label}>New class name</label>
              <input
                ref={createInputRef}
                className="teacher-field"
                style={{ ...S.input, width: '100%', minWidth: 0 }}
                id="new-class-name"
                placeholder="e.g. Introduction to coding"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{ ...(creating || !newName.trim() ? S.btnDisabled : S.btn('var(--c-purple)')), height: 36 }}
            >
              {creating ? 'Creating…' : 'Create class'}
            </button>
            {classes.length > 0 && (
              <button
                type="button"
                className="teacher-utility-btn"
                onClick={() => { setCreateOpen(false); newClassBtnRef.current?.focus(); }}
                style={{ height: 36, padding: '0 12px', borderRadius: 4, border: '1px solid var(--c-line)', background: 'transparent', color: 'var(--c-fg)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
            {createError && <p role="alert" style={{ ...S.error, flexBasis: '100%', margin: 0, fontFamily: 'var(--font-prose)', fontSize: 14 }}>{createError}</p>}
          </form>
        )}
      </div>


      {/* Include archived toggle */}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-prose)', fontSize: 14, color: 'var(--c-meta)', marginBottom: 16, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          style={{ accentColor: 'var(--c-cyan)' }}
        />
        Include archived classes
      </label>

      {classes.length === 0 && (
        <p style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 15 }}>No classes yet. Name your first class above.</p>
      )}
        <div className="teacher-class-grid" style={{ display: 'grid', gap: 16, maxWidth: 880 }}>
          {[...classes].sort((x, y) => Number(y.id === lastId) - Number(x.id === lastId)).map((c) => (
            <div
              key={c.id}
              className="teacher-class-card tcc-r9"
              style={{
                ...S.card,
                marginBottom: 0,
                opacity: c.archived_at ? 0.6 : 1,
              }}
            >
              {/* r9 T3: one class reads as a complete summary. Name and badges on the left, the labelled facts
                  as a 2x2 grid in the middle, the action on the right (stacked on a narrow screen). */}
              <div className="tcc-main">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  {/* The class name is the way in: a real link (opens in a new tab, copies as a URL) that the
                      router handles on a plain click. */}
                  <a
                    href={`/teacher/?class=${encodeURIComponent(c.id)}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      router.push(`/teacher?class=${c.id}`);
                    }}
                    className="teacher-class-link"
                    style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: 'var(--c-fg)', textDecoration: 'underline', textDecorationColor: 'color-mix(in srgb, var(--c-cyan) 55%, transparent)', textUnderlineOffset: 4, textDecorationThickness: 1, overflowWrap: 'anywhere' }}
                  >
                    {c.name}
                  </a>
                  {c.archived_at && <span style={S.badge(true)}>Archived</span>}
                  {c.id === lastId && <span style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: 'var(--c-meta)' }}>last opened</span>}
                </div>
                {/* The badges. Each one is a way in to the tab
                    that answers it: "to grade" opens Today, "behind" opens Students. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, fontFamily: 'var(--font-prose)' }}>
                  {!c.archived_at && (chips[c.id] === undefined ? (
                    <span style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13 }}>checking…</span>
                  ) : chips[c.id].behind === 0 && chips[c.id].toGrade === 0 ? (
                    <span style={{ color: 'var(--c-green)', fontFamily: 'var(--font-prose)', fontSize: 13 }}>All caught up</span>
                  ) : (
                    <>
                      {chips[c.id].toGrade > 0 && (
                        <a
                          href={`/teacher/?class=${encodeURIComponent(c.id)}&tab=today`}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                            e.preventDefault();
                            router.push(`/teacher?class=${c.id}&tab=today`);
                          }}
                          className="teacher-chip-link"
                          title="Open this class's Today tab"
                          style={{ color: 'var(--c-bg)', background: 'var(--c-orange)', borderRadius: 10, padding: '4px 8px', fontWeight: 700, textDecoration: 'none' }}
                        >
                          {chips[c.id].toGrade} to grade
                        </a>
                      )}
                      {chips[c.id].behind > 0 && (
                        <a
                          href={`/teacher/?class=${encodeURIComponent(c.id)}&tab=students&filter=behind`}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                            e.preventDefault();
                            router.push(`/teacher?class=${c.id}&tab=students&filter=behind`);
                          }}
                          className="teacher-chip-link"
                          title="Students with graded work past due and not done. Opens the roster showing only them."
                          style={{ color: 'var(--c-bg)', background: 'var(--c-red)', borderRadius: 10, padding: '4px 8px', fontWeight: 700, textDecoration: 'none' }}
                        >
                          {/* r10 T7: say what is counted. */}
                          {chips[c.id].behind} {chips[c.id].behind === 1 ? 'student' : 'students'} behind
                        </a>
                      )}
                    </>
                  ))}
                </div>
              </div>
              <dl className="teacher-class-facts tcc-facts">
                <div><dt>Students</dt><dd>{c.student_count}</dd></div>
                <div>
                  <dt>Join code</dt>
                  <dd className="tcc-code">
                    <span aria-label={`Join code ${c.code.split('').join(' ')}`}>{c.code}</span>
                    <button
                      type="button"
                      className="tcc-copy"
                      aria-label={`Copy join code ${c.code}`}
                      onClick={() => {
                        void (async () => {
                          try {
                            await navigator.clipboard.writeText(c.code);
                            toast('Join code copied.');
                          } catch {
                            toast(`Could not copy. The join code is ${c.code}.`, { kind: 'error' });
                          }
                        })();
                      }}
                    >
                      Copy
                    </button>
                  </dd>
                </div>
                {/* r10 T7: Year and Role are background facts, set quieter than Students and Join code. */}
                <div className="tcc-quiet"><dt>Year</dt><dd>{c.school_year || 'Not set'}</dd></div>
                <div className="tcc-quiet"><dt>Role</dt><dd style={{ textTransform: 'capitalize' }}>{c.role}</dd></div>
              </dl>
              <div className="tcc-action">
                <button
                  style={{ ...S.btn('var(--c-cyan)'), flexShrink: 0 }}
                  onClick={() => router.push(`/teacher?class=${c.id}`)}
                >
                  {chips[c.id]?.toGrade > 0 ? 'Review work →' : 'Open class →'}
                </button>
              </div>
            </div>
          ))}
        </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

type TabId = 'today' | 'students' | 'gradebook' | 'schedule' | 'settings';

const TABS: Array<{ id: TabId; label: string; color: string }> = [
  { id: 'today', label: 'Today', color: 'var(--c-orange)' },
  { id: 'students', label: 'Students', color: 'var(--c-purple)' },
  { id: 'gradebook', label: 'Gradebook', color: 'var(--c-cyan)' },
  { id: 'schedule', label: 'Schedule', color: 'var(--c-green)' },
  { id: 'settings', label: 'Class settings', color: 'var(--c-meta)' },
];

/** ?tab= value -> tab. Accepts the two names the old tabs used (roster, attention) so saved links still land. */
function parseTab(v: string | null): TabId | undefined {
  if (v === 'roster') return 'students';
  if (v === 'attention') return 'today';
  return TABS.some((t) => t.id === v) ? (v as TabId) : undefined;
}

function DetailView({ classId, initialTab, initialFilter }: { classId: string; initialTab?: TabId; initialFilter?: 'behind' }) {
  const desktop = useGradingWeightsDesktop();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const clearLibrary = useClearStudentLibrary(classId);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [actionError, setActionError] = useState('');
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
  const lessonTitles = Object.fromEntries([...lessonMap.values()].map((l) => [l.id, l.title]));
  const [drawerEmail, setDrawerEmail] = useState<string | null>(null);
  // The lesson to open expanded inside the drawer (a chart or quiz from the Today queue, a grid cell).
  const [drawerLesson, setDrawerLesson] = useState<string | null>(null);
  // r7 T6: the roster starts sorted by name A-Z, so a heading always shows which column orders the list.
  const [rosterSort, setRosterSort] = useState<RosterSort>(initialFilter === 'behind' ? { key: 'missing', dir: 'desc' } : { key: 'name', dir: 'asc' });
  // ux2 T6: "N students behind" on the class card opens the roster showing exactly those N students.
  const [rosterFilter, setRosterFilter] = useState<'behind' | null>(initialFilter ?? null);
  function clearRosterFilter() {
    setRosterFilter(null);
    setRosterSort({ key: 'name', dir: 'asc' });
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete('filter');
      window.history.replaceState(window.history.state, '', u.toString());
    } catch { /* fine */ }
  }
  const rosterSortIsDefault = rosterSort?.key === 'name' && rosterSort.dir === 'asc';

  // Section tabs. Seeded from ?tab= (or the top-nav "Gradebook" shortcut's ?view=gradebook) on mount only.
  // With no explicit tab the page opens on Students, and moves itself to Today once if submissions are
  // waiting for a grade, so the most urgent job is the first thing a teacher sees. A tab the teacher
  // picked is never overridden.
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'students');
  const pickedTab = useRef(initialTab !== undefined);
  const [awaitingCount, setAwaitingCount] = useState<number | null>(null);
  function pickTab(t: TabId) {
    pickedTab.current = true;
    setActiveTab(t);
    // Keep the address in step so a refresh or a shared link lands on the same tab. replaceState, not a
    // navigation: it must not add a history entry per click or re-run the page's loaders.
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('tab', t);
      u.searchParams.delete('view');
      window.history.replaceState(window.history.state, '', u.toString());
    } catch { /* an address bar we cannot rewrite is not worth failing a tab click over */ }
  }
  // On a phone the tab row scrolls sideways: keep the open tab in view (Class settings starts off-screen).
  useEffect(() => {
    if (!compact) return;
    const tab = document.getElementById(`tab-${activeTab}`);
    const row = tab?.parentElement;
    if (!tab || !row) return;
    const left = tab.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = Math.max(0, left - 16);
    }
  }, [activeTab, compact, loading]);
  // ux2 T5: the class tabs' height, so a queue card's sticky header sits just under them; and whether a
  // grading form has focus, so on a phone the tabs stop sticking while the teacher types (they took ~110px of
  // the ~500px a keyboard leaves). --kb-inset lifts the sticky Save row above an on-screen keyboard.
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [tabsH, setTabsH] = useState(0);
  const [grading, setGrading] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const sync = () => setTabsH(Math.round(el.getBoundingClientRect().height));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => setKbInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => { vv.removeEventListener('resize', sync); vv.removeEventListener('scroll', sync); };
  }, []);
  const studentNames = useMemo(() => {
    const out: Record<string, { firstName?: string | null; lastName?: string | null }> = {};
    for (const [email, p] of progressMap) out[email] = { firstName: p.firstName, lastName: p.lastName };
    return out;
  }, [progressMap]);

  // Remember the class for next time (the class list and the top-nav Gradebook shortcut offer it first).
  useEffect(() => {
    try { window.localStorage.setItem('shcode:lastClass', classId); } catch { /* private window: fine */ }
  }, [classId]);

  // Only the first load shows "Loading…". A refresh after an action (add a student, bulk enroll, a co-teacher)
  // keeps the page on screen: blanking it unmounted every panel, so the bulk-enroll result vanished as it
  // arrived and the teacher lost their place (ux2 T7).
  const loadedOnce = useRef(false);
  const loadDetail = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    setLoadError('');
    const result = await apiFetch<ClassDetail>(`/api/classes/${classId}`);
    if (result.error !== null) {
      if (loadedOnce.current) toast(`Could not refresh the class: ${result.error}`, { kind: 'error' });
      else setLoadError(result.error);
    } else {
      loadedOnce.current = true;
      setDetail(result.data);
      setCurrentCode(result.data.class.code);
    }
    setLoading(false);
  }, [classId, toast]);

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

  // How many submissions are waiting for this teacher: the Today badge, and the reason to open on Today.
  // Bumped after a score is saved in the queue (ux1 G3), so the badge and the Needs attention chips drop at once.
  const [gradedTick, setGradedTick] = useState(0);
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    void apiFetch<{ awaiting_grade?: unknown[] }>(`/api/classes/${classId}/needs-attention`).then((res) => {
      if (cancelled) return;
      if (res.error !== null && gradedTick > 0) return; // a failed refresh keeps the count it had
      const n = res.error === null ? (res.data.awaiting_grade?.length ?? 0) : 0;
      setAwaitingCount(n);
      if (n > 0 && !pickedTab.current && gradedTick === 0) setActiveTab('today');
    });
    return () => { cancelled = true; };
  }, [detail, classId, gradedTick]);
  // Whether a teacher's score on each lesson changes the grade, for the queue's practice label and order (ux1 G4).
  const lessonWeights = useMemo(() => {
    const out: Record<string, ScoreWeight> = {};
    for (const [id, l] of lessonMap) {
      const w = scoreWeight({ counts: lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode }) !== null, maxScore: l.maxScore });
      if (w) out[id] = w;
    }
    return out;
  }, [lessonMap]);

  async function handleRegenCode() {
    const ok = await confirm({
      title: 'Make a new join code?',
      message: 'The old code stops working right away. Students already in the class stay in it.\nStudents who have not joined yet will need the new code.',
      confirmLabel: 'Make a new code',
      danger: true,
    });
    if (!ok) return;
    setRegenerating(true);
    const result = await apiFetch<{ ok: boolean; code: string }>(
      `/api/classes/${classId}/regenerate-code`,
      { method: 'POST' },
    );
    setRegenerating(false);
    if (result.error === null) { setCurrentCode(result.data.code); setActionError(''); toast(`New join code: ${result.data.code}. The old one no longer works.`); }
    else { setActionError(`Could not make a new join code: ${result.error}. The old code still works.`); toast(`Could not make a new join code: ${result.error}. The old code still works.`, { kind: 'error' }); }
  }

  async function handleArchiveToggle() {
    if (!detail) return;
    const isArchived = !!detail.class.archived_at;
    const action = isArchived ? 'Unarchive' : 'Archive';
    const ok = await confirm(isArchived
      ? { title: 'Unarchive this class?', message: 'It comes back into your class list and students can use it again.', confirmLabel: 'Unarchive' }
      : { title: 'Archive this class?', message: 'It leaves your class list (tick "Include archived classes" to see it) and students can no longer join it. Nothing is deleted, and you can unarchive it any time.', confirmLabel: 'Archive' });
    if (!ok) return;
    setArchiving(true);
    const result = await apiFetch<{ ok: boolean; archived_at: string | null }>(
      `/api/classes/${classId}/archive`,
      { method: 'POST', body: JSON.stringify({ archived: !isArchived }) },
    );
    setArchiving(false);
    if (result.error !== null) { setActionError(`Could not ${action.toLowerCase()} this class: ${result.error}.`); toast(`Could not ${action.toLowerCase()} this class: ${result.error}.`, { kind: 'error' }); }
    else { setActionError(''); toast(isArchived ? 'Class unarchived.' : 'Class archived. It is in the list under "Include archived classes".'); }
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
      // Say what to do next, not only what went wrong (ux2 T7).
      if (result.status === 404 && /account/i.test(result.error)) setEnrollError(`No account uses ${enrollEmail.trim()} yet. They need to sign up first. Share the join code ${currentCode}, or add them here after they sign up.`);
      else if (result.status === 409) setEnrollError(`${enrollEmail.trim()} is already in this class.`);
      else if (result.status === 400 && /not a student/i.test(result.error)) setEnrollError(`${enrollEmail.trim()} is a teacher account, so it cannot be added as a student. Add them as a co-teacher under Class settings instead.`);
      else setEnrollError(`Could not add ${enrollEmail.trim()}: ${result.error.replace(/\.$/, '')}. Nothing changed.`);
    } else {
      toast(`Added ${enrollEmail.trim()} to the class.`);
      setEnrollEmail('');
      void loadDetail();
    }
  }

  async function handleDelete() {
    if (!detail) return;
    const name = detail.class.name;
    const ok = await confirm({
      title: `Permanently delete "${name}"?`,
      message: 'This cannot be undone.\nIt removes the class, its enrollments, its co-teachers and every message sent in it, AND all progress (completions, scores, submissions, saved work) of every student who is not enrolled in another class.\nStudents who are also in another class keep their progress.',
      confirmLabel: 'Delete the class',
      danger: true,
      requireText: name,
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: `Remove ${email} from this class?`,
      message: 'They leave the roster and the gradebook for this class. Their work is kept, and adding them again brings it back.',
      confirmLabel: 'Remove from class',
      danger: true,
    });
    if (!ok) return;
    setRemovingEmail(email);
    const res = await apiFetch(`/api/classes/${classId}/enrollments/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    }).catch(() => null);
    setRemovingEmail('');
    if (res === null || res.error !== null) {
      toast(`Could not remove ${email}: ${res === null ? 'network error' : res.error}. They are still in the class.`, { kind: 'error' });
      return;
    }
    void loadDetail();
    toast(`Removed ${email} from the class.`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void apiFetch(`/api/classes/${classId}/enrollments`, { method: 'POST', body: JSON.stringify({ email }) }).then((r) => {
            if (r.error === null) { toast(`${email} is back in the class.`); void loadDetail(); }
            else toast(`Could not add ${email} back: ${r.error}`, { kind: 'error' });
          });
        },
      },
    });
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
    const ok = await confirm({
      title: `Remove ${email} as co-teacher?`,
      message: 'They lose access to this class right away. The class and its students are not affected.',
      confirmLabel: 'Remove co-teacher',
      danger: true,
    });
    if (!ok) return;
    setRemovingCoTeacher(email);
    await apiFetch(`/api/classes/${classId}/teachers/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setRemovingCoTeacher('');
    toast(`${email} is no longer a co-teacher.`);
    void loadDetail();
  }

  if (loading) return <div style={{ color: 'var(--c-meta)' }}>Loading…</div>;
  if (loadError)
    return (
      <div>
        <button
          style={{ ...S.btn('var(--c-comment)'), color: 'var(--c-fg)', marginBottom: 16 }}
          onClick={() => router.push('/teacher')}
        >
          ← Back to list
        </button>
        <p style={{ color: 'var(--c-red)' }}>{loadError}</p>
      </div>
    );
  if (!detail) return null;

  const { class: cls, isOwner, roster, coTeachers } = detail;
  const isArchived = !!cls.archived_at;
  // ux2 T6: staff on the roster (owner, co-teacher, non-student account) are listed last and never counted.
  const isStaffRow = (email: string) => progressMap.get(email)?.staff === true;
  const studentRoster = roster.filter((r) => !isStaffRow(r.student_email));
  const staffRoster = roster.filter((r) => isStaffRow(r.student_email));
  const behindRoster = studentRoster.filter((r) => (progressMap.get(r.student_email)?.gradedMissing ?? 0) > 0);
  const rosterShown = rosterFilter === 'behind'
    ? sortRosterRows(behindRoster, rosterSort, (e) => progressMap.get(e))
    : [...sortRosterRows(studentRoster, rosterSort, (e) => progressMap.get(e)), ...staffRoster];
  // r8 T7: when every student has the same number of graded lessons, the heading says it once ("of 149") and
  // each row shows just the count. A class whose totals differ keeps the per-row fractions.
  const rosterTotals = new Set(studentRoster.map((r) => progressMap.get(r.student_email)?.gradedTotal).filter((n): n is number => typeof n === 'number'));
  const rosterCommonTotal = rosterTotals.size === 1 ? [...rosterTotals][0] : null;

  return (
    <div
      // Every tab in the same frame, so the site bar and the class title never jump when the tab changes;
      // the gradebook's table scrolls sideways inside it when a module has many lessons.
      className={activeTab === 'gradebook' ? 'teacher-frame teacher-gradebook' : 'teacher-frame'}
      style={{ ['--teacher-tabs-h' as string]: `${grading && compact ? 0 : tabsH}px`, ['--kb-inset' as string]: `${kbInset}px` } as React.CSSProperties}
      onFocus={(e) => setGrading(!!(e.target as HTMLElement).closest?.('.override-form'))}
      onBlur={(e) => { if (!(e.relatedTarget as HTMLElement | null)?.closest?.('.override-form')) setGrading(false); }}
    >
      {/* Back link */}
      {/* r7 T8: a secondary link, so the reading face at 14px, not small mono. */}
      <button
        className="teacher-back-link"
        style={{ background: 'none', border: 'none', color: 'var(--c-cyan)', cursor: 'pointer', fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 500, padding: 0, marginBottom: compact ? 4 : 8 }}
        onClick={() => router.push('/teacher')}
      >
        ← All classes
      </button>

      {/* Header. On a phone the Actions menu stays beside the title instead of taking a row of its own. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'nowrap', gap: 8, marginBottom: compact ? 4 : 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, minWidth: 0 }}>
            <h1 style={{ ...S.h1, fontSize: compact ? 21 : 28, lineHeight: 1.2, margin: 0, overflowWrap: 'anywhere' }}>{cls.name}</h1>
            {isArchived && <span style={S.badge(true)}>Archived</span>}
          </div>
          {/* Labelled facts (system pass rule 3): label in meta, value in the body colour. */}
          <div style={{ display: 'flex', gap: compact ? '4px 16px' : '4px 24px', fontFamily: 'var(--font-prose)', fontSize: 13, lineHeight: '20px', flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span title="Students join with this code. Regenerate it under Class settings."><span style={S.metaLabel}>Join code</span> <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--c-cyan)', letterSpacing: '0.04em' }}>{currentCode}</strong></span>
            {cls.school_year && <span><span style={S.metaLabel}>Year</span> <span style={S.metaValue}>{cls.school_year}</span></span>}
            {!compact && <span><span style={S.metaLabel}>Created</span> <span style={S.metaValue}>{fmt(cls.created_at)}</span></span>}
            {cls.archived_at && <span><span style={S.metaLabel}>Archived</span> <span style={S.metaValue}>{fmt(cls.archived_at)}</span></span>}
          </div>
        </div>

        {/* Owner-only actions */}
        {isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, maxWidth: compact ? '45%' : undefined }}>
            <RowMenu buttonText="Actions" label="Class actions" items={[
              { label: isArchived ? 'Unarchive class' : 'Archive class…', disabled: archiving, onSelect: () => { void handleArchiveToggle(); } },
              { label: 'Delete permanently…', danger: true, disabled: deleting, onSelect: () => { void handleDelete(); } },
            ]} />
            {deleteError && <p style={S.error}>{deleteError}</p>}
            {actionError && <p style={S.error}>{actionError}</p>}
          </div>
        )}
      </div>

      {/* Section tabs. Sticky, so the way to the other sections is never scrolled out of reach, and each
          panel mounts only while its tab is open (every panel used to mount and fetch on page load). */}
      <div
        role="tablist"
        aria-label="Class sections"
        ref={tabsRef}
        className="teacher-tabs"
        // On a phone the five tabs sit in two rows, all visible: a single scrolling row lost 3-0 to it in the
        // blind panel (Schedule clipped, Class settings out of sight). A 6-track grid: three tabs of two tracks
        // on the first row, two of three on the second, so both rows fill the width and "Class settings" gets
        // the room to stay on one line.
        style={{ position: grading && compact ? 'static' : 'sticky', top: 0, zIndex: 20, background: 'var(--c-bg)', padding: compact ? '6px 0' : '8px 0', marginBottom: 12, display: compact ? 'grid' : 'flex', gridTemplateColumns: compact ? 'repeat(6, minmax(0, 1fr))' : undefined, gap: compact ? 6 : 8, flexWrap: 'nowrap', overflowX: 'auto', borderBottom: '1px solid var(--c-line)' }}
      >
        {TABS.map((t, tabIndex) => {
          const on = activeTab === t.id;
          const badge = t.id === 'today' ? (awaitingCount ?? 0) : t.id === 'students' ? studentRoster.length : 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => pickTab(t.id)}
              tabIndex={on ? 0 : -1}
              onKeyDown={(e) => {
                // Arrow keys move between tabs (the tablist pattern); Home and End jump to the ends.
                const i = TABS.findIndex((x) => x.id === t.id);
                const to = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
                if (to < 0) return;
                e.preventDefault();
                pickTab(TABS[to].id);
                document.getElementById(`tab-${TABS[to].id}`)?.focus();
              }}
              style={{
                ...S.btn(on ? 'var(--c-purple)' : 'transparent'),
                background: on ? 'var(--c-purple)' : 'transparent',
                color: on ? 'var(--c-bg)' : 'var(--c-meta)',
                fontWeight: on ? 700 : 500,
                boxShadow: 'none',
                border: `1px solid ${on ? 'var(--c-purple)' : 'var(--c-line)'}`,
                borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap', fontSize: compact ? 13 : 14, padding: compact ? '4px 8px' : '4px 16px',
                // Phone: equal-height cells, label centred; a label that still cannot fit (a wider font from
                // Appearance settings) wraps inside its cell instead of being clipped.
                ...(compact ? {
                  gridColumn: tabIndex < 3 ? 'span 2' : 'span 3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  whiteSpace: 'normal', height: 'auto', minHeight: 36, lineHeight: '16px', minWidth: 0,
                } : {}),
              }}
            >
              {t.label}
              {badge > 0 && (
                <span
                  style={{ marginLeft: compact ? 4 : 8, background: on ? 'var(--c-bg)' : t.color, color: on ? t.color : 'var(--c-bg)', borderRadius: 10, padding: compact ? '0 4px' : '0 8px', fontSize: 12, fontWeight: 700 }}
                  title={t.id === 'today' ? `${badge} submission${badge === 1 ? '' : 's'} waiting for you to grade` : `${badge} enrolled student${badge === 1 ? '' : 's'}`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'today' && (
        <div role="tabpanel" id={`panel-today`} aria-labelledby={`tab-today`} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Needs Attention view: one strip, the heading beside its chips, so the grading form below sits
            in the first screen. An opened chip still spreads to the full width under the strip. */}
          <div style={{ ...S.card, padding: compact ? '8px 16px' : '8px 20px', marginBottom: 0, display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px 16px' }}>
            <h2 style={{ ...S.h2, fontSize: 18, lineHeight: '36px', margin: 0, whiteSpace: 'nowrap' }}>Needs attention</h2>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <NeedsAttentionPanel
              key={gradedTick}
              classId={classId}
              lessonTitles={lessonTitles}
              onOpenStudent={(email: string) => { setDrawerLesson(null); setDrawerEmail(email); }}
              onOpenTeacherEdit={(studentEmail: string, lessonId: string) => {
                // /teacher-edit is a code-only editor. A chart, quiz or written answer is read in the student's
                // drawer, opened on that lesson's submission.
                if (opensInCodeEditor(lessonMap.get(lessonId)?.preview)) {
                  router.push(`/teacher-edit?class=${encodeURIComponent(classId)}&student=${encodeURIComponent(studentEmail)}&lesson=${encodeURIComponent(lessonId)}`);
                } else {
                  setDrawerLesson(lessonId);
                  setDrawerEmail(studentEmail);
                }
              }}
            />
            </div>
          </div>
        {/* Submission Review Queue */}
        <div id="submission-review-queue" style={{ ...S.card, padding: compact ? 16 : '16px 20px', marginBottom: 0, scrollMarginTop: 100 }}>
          <h2 style={{ ...S.h2, fontSize: 18, marginBottom: 8 }}>Submission review queue</h2>
          <SubmissionQueue classId={classId} lessonTitles={lessonTitles} lessonWeights={lessonWeights} studentNames={studentNames} onGraded={() => setGradedTick((t) => t + 1)} />
        </div>
        {/* Past due */}
        <div style={{ ...S.card, padding: compact ? 16 : 20, marginBottom: 0 }}>
          <h2 style={S.h2}>Past due</h2>
          <PastDuePanel classId={classId} />
        </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div role="tabpanel" id={`panel-students`} aria-labelledby={`tab-students`} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Roster view */}
          <div className={compact ? 'roster-panel is-compact' : 'roster-panel'} style={{ ...S.card, padding: compact ? 16 : 20, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ ...S.h2, fontSize: 18, lineHeight: '26px', marginBottom: 0 }}>Roster ({studentRoster.length})</h2>
            <button
              type="button"
              // A utility, not the page's action: outlined and quiet, so each row's Open is what reads as the action.
              // r7 T7: on a phone it sits on its own line under the heading as a quiet text action.
              className={compact ? 'teacher-utility-btn roster-csv-compact' : 'teacher-utility-btn'}
              style={compact ? undefined : (roster.length === 0 || progressMap.size === 0 ? S.btnDisabled : { ...S.btn('transparent'), color: 'var(--c-fg)', border: '1px solid var(--c-line)', fontWeight: 500 })}
              disabled={roster.length === 0 || progressMap.size === 0}
              title="One row per student: the grade so far, how many graded lessons are done and past due, and a column per grade category. Ready to copy into a spreadsheet or the grade book."
              onClick={() => {
                const csv = buildGradesCsv(studentRoster.map((r) => {
                  const p = progressMap.get(r.student_email);
                  return {
                    email: r.student_email,
                    firstName: p?.firstName,
                    lastName: p?.lastName,
                    percent: p?.weightedPercent ?? 0,
                    counted: p?.gradedCounted ?? 0,
                    done: p?.gradedDone ?? 0,
                    total: p?.gradedTotal ?? 0,
                    missing: p?.gradedMissing ?? 0,
                    categories: p?.categories,
                  };
                }));
                const file = `grades-${cls.name.replace(/\s+/g, '-')}-${schoolDateString(Date.now())}.csv`;
                downloadCsv(csv, file);
                toast(`Downloaded ${file}: one row per student with the grade so far.`);
              }}
            >
              Download grades (CSV)
            </button>
          </div>
            {/* ux2 T6: the class card's "N students behind" lands here showing exactly those students. */}
            {rosterFilter === 'behind' && (
              <div role="status" className="roster-filter-note">
                <span>
                  Showing the {behindRoster.length} student{behindRoster.length === 1 ? '' : 's'} with graded work past due and not done,
                  most past due first.
                </span>
                <button type="button" className="sq-score-use" onClick={clearRosterFilter}>Show everyone</button>
              </div>
            )}
            {roster.length === 0 ? (
              <p style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 15 }}>No students enrolled yet.</p>
            ) : (
              <div className="roster-list" role={compact ? undefined : 'table'} aria-label={compact ? undefined : 'Roster'} style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 0 }}>
                {!compact && (
                  <div role="row" style={{ display: 'grid', gridTemplateColumns: ROSTER_COLS, gap: 16, padding: '8px 12px 4px', color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--c-line)' }}>
                    {([
                      ['name', 'Student'], ['grade', 'Grade so far'], [null, 'Graded done'], ['missing', 'Past due'], ['active', 'Last active'],
                    ] as const).map(([key, text]) => {
                      if (key === null) return (
                        <span key={text} role="columnheader" style={{ padding: '4px 0', whiteSpace: 'nowrap' }} title="Graded lessons this student has finished, out of every graded lesson in the course">
                          {text}{rosterCommonTotal != null && <span className="roster-head-of"> (of {rosterCommonTotal})</span>}
                        </span>
                      );
                      const on = rosterSort?.key === key;
                      return (
                        <span key={key} role="columnheader" aria-sort={on ? (rosterSort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button
                            type="button"
                            className={`roster-sort${on ? ' is-on' : ''}`}
                            onClick={() => setRosterSort(on ? { key, dir: rosterSort!.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: ROSTER_FIRST_DIR[key] })}
                            title={on ? `Sorted by ${text.toLowerCase()}, ${rosterSort!.dir === 'asc' ? (key === 'name' ? 'A to Z' : 'lowest first') : (key === 'name' ? 'Z to A' : 'highest first')}. Click to reverse.` : `Sort by ${text.toLowerCase()}`}
                          >
                            {text}
                            <span aria-hidden="true" className="roster-sort-arrow">{on ? (rosterSort!.dir === 'asc' ? <ArrowUp size={14} strokeWidth={2.5} /> : <ArrowDown size={14} strokeWidth={2.5} />) : <ArrowUpDown size={12} strokeWidth={2} />}</span>
                          </button>
                        </span>
                      );
                    })}
                    <span role="columnheader">
                      {!rosterSortIsDefault && (
                        <button type="button" className="roster-sort roster-sort-reset" onClick={() => setRosterSort({ key: 'name', dir: 'asc' })}>Reset to A-Z</button>
                      )}
                      {/* r9 T4: a visible, quiet heading over the row actions. */}
                      {rosterSortIsDefault && <span className="roster-actions-head">Actions</span>}
                    </span>
                  </div>
                )}
                {/* r8 T1: on a phone the grade's label is said once, above the cards, not on every card.
                    r9 T5: said to screen readers only; the cards are self-explanatory on screen. */}
                {compact && (
                  <div className="roster-card-head sr-only"><span>Student</span> <span>Grade so far</span></div>
                )}
                {/* Desktop: 20px name + 18px email + 12px padding + 1px border = 51px.
                    Phone: row 1 = name + grade, row 2 = counts on one line + Open and a compact More
                    (about 64px). Putting Open/More on the name row stranded the grade below them (lost 3-0). */}
                {rosterShown.map((row) => {
                  const prog = progressMap.get(row.student_email);
                  const staffRow = prog?.staff === true;
                  // A stale or older response can lack weightedPercent; a NaN
                  // here would render "NaN% of grade", so fall back to 0.
                  const wp = prog && Number.isFinite(prog.weightedPercent) ? prog.weightedPercent : 0;
                  return (
                    <div
                      key={row.student_email}
                      role={compact ? undefined : 'row'}
                      className={compact ? 'roster-pcard' : undefined}
                      style={{ background: 'var(--c-bg)', borderRadius: compact ? 8 : 0, padding: compact ? '10px 14px' : '6px 12px', borderBottom: '1px solid var(--c-line)', display: 'grid', gridTemplateColumns: compact ? 'minmax(0, 1fr) auto' : ROSTER_COLS, alignItems: 'center', minWidth: 0, minHeight: compact ? undefined : 51, boxSizing: 'border-box', gap: compact ? '4px 10px' : 16 }}
                    >
                      {/* Phone: the name and the grade share row 1 across BOTH columns (the grade laid over its
                          right end), so column 2 is only as wide as Open + ⋯ and the counts in row 2 fit one line. */}
                      <div role={compact ? undefined : 'cell'} style={{ minWidth: 0, gridColumn: compact ? '1 / -1' : undefined, gridRow: compact ? 1 : undefined, paddingRight: compact ? 64 : undefined, fontFamily: 'var(--font-prose)' }} title={`Enrolled ${fmt(row.enrolled_at)} by ${row.enrolled_by ?? 'self'}`}>
                        <div style={{ fontSize: compact ? 16 : 15, lineHeight: compact ? '22px' : '20px', fontWeight: compact ? 700 : 600, color: 'var(--c-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(prog?.firstName, prog?.lastName) ?? row.student_email}</div>
                        {!compact && <div style={{ color: 'var(--c-meta)', fontSize: 13, lineHeight: '18px', marginTop: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.student_email}</div>}
                        {staffRow && <div className="roster-staff-note">Teacher account: not counted in the class numbers</div>}
                      </div>
                      <div role={compact ? undefined : 'cell'} title="Grade so far, under this class's weights" style={{ gridColumn: compact ? '1 / -1' : undefined, gridRow: compact ? 1 : undefined, justifySelf: compact ? 'end' : undefined, display: 'flex', alignItems: compact ? 'baseline' : 'center', justifyContent: compact ? 'flex-end' : undefined, gap: compact ? 6 : 10, whiteSpace: 'nowrap', lineHeight: compact ? '22px' : '22px' }}>
                        {/* The coloured number is the grade; completion is the "Graded done" column (on a phone, the
                            "graded" count under the name), so no bar here suggests course progress. On a phone the
                            number carries its own label under it, since there is no column header above it. */}
                        {/* Phone: one line, the label in meta before the number ("Grade so far 100%"). */}
                        {compact && <span className="sr-only">Grade so far </span>}
                        <strong style={{ color: prog?.gradedCounted && !staffRow ? countedGradeColor(wp) : 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: compact ? 16 : 15, fontVariantNumeric: 'tabular-nums', minWidth: compact ? undefined : 44, textAlign: 'right' }}>{prog?.gradedCounted && !staffRow ? `${wp}%` : '—'}</strong>
                      </div>
                      <div role={compact ? undefined : 'cell'} style={{ gridColumn: compact ? 1 : undefined, gridRow: compact ? 2 : undefined, minWidth: 0, display: 'flex', flexWrap: compact ? 'wrap' : 'nowrap', overflow: compact ? undefined : 'hidden', gap: compact ? '4px 4px' : 8, lineHeight: '18px', fontFamily: 'var(--font-prose)', fontSize: compact ? 13 : 14, color: compact ? 'var(--c-meta)' : 'var(--c-fg)', fontVariantNumeric: 'tabular-nums' }}>
                        {/* r8 T1: on a phone the two counts are one quiet meta line, "7/149 graded · 6 past due",
                            the past-due part red only when it is above 0. */}
                        <span className={compact ? 'roster-chip' : undefined} style={{ whiteSpace: 'nowrap' }}>{prog?.gradedDone ?? 0}{(compact || rosterCommonTotal == null) && <>/{prog?.gradedTotal ?? '—'}</>}{compact && ' graded'}</span>
                        {compact && <span aria-hidden="true" className="roster-chip-sep">·</span>}
                        {compact && <span className={prog?.gradedMissing ? 'roster-chip is-late' : 'roster-chip'} style={{ whiteSpace: 'nowrap' }}>{prog?.gradedMissing ?? 0} past due</span>}
                      </div>
                      {/* r8 T7: past due is a small red badge above 0 and a plain 0 at zero, so the column compares. */}
                      {!compact && <><span role="cell" style={{ fontFamily: 'var(--font-prose)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{prog?.gradedMissing ? <span className="roster-late-badge" title={`${prog.gradedMissing} graded lesson${prog.gradedMissing === 1 ? '' : 's'} past due`}>{prog.gradedMissing}</span> : <span className="roster-zero">0</span>}</span><span role="cell" title={prog?.last_active ? fmtTs(prog.last_active) : 'No activity yet'} style={{ minWidth: 0, fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: '18px', color: prog?.last_active ? 'var(--c-fg)' : 'var(--c-meta)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog?.last_active ? fmtTs(prog.last_active) : 'No activity yet'}</span></>}
                      <div role={compact ? undefined : 'cell'} style={{ gridColumn: compact ? 2 : undefined, gridRow: compact ? 2 : undefined, minWidth: 0, display: 'flex', flexWrap: 'nowrap', gap: compact ? 6 : 8, justifyContent: 'flex-end', justifySelf: 'end', alignItems: 'center', paddingLeft: compact ? 0 : 8 }}>
                        {/* The row's action: a full-strength cyan outline with a bold label and a faint tint, so it
                            reads as the thing to press without a column of bright fills outshouting the grades. */}
                        <button
                          type="button"
                          aria-label={`View progress for ${fullName(prog?.firstName, prog?.lastName) ?? row.student_email}`}
                          title="Lessons, scores and submissions for this student"
                          className="teacher-row-open"
                          // r10 T4: on a phone the "Progress" button is narrower (padding 0 8px, no 64px minimum).
                          style={{ background: 'color-mix(in srgb, var(--c-cyan) 8%, transparent)', color: 'var(--c-cyan)', border: '1px solid var(--c-cyan)', borderRadius: 4, height: 32, boxSizing: 'border-box', padding: compact ? '0 8px' : '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '18px', flexShrink: 0, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          onClick={() => { setDrawerLesson(null); setDrawerEmail(row.student_email); }}
                        >
                          {/* r7 T6: say what opens (the student's progress drawer), not just "Open". On a phone the
                              row has room for a chevron only (its name says the same), so the card stays two rows. */}
                          {/* r10 T4: on a phone it says what it opens ("Progress"); the accessible name is unchanged. */}
                          {compact ? 'Progress' : 'View progress'}
                        </button>
                        <RowMenu
                          label={`More actions for ${row.student_email}`}
                          buttonText={compact ? '⋯' : 'More'}
                          caret={!compact}
                          className={compact ? 'roster-more-compact' : undefined}
                          disabled={removingEmail === row.student_email}
                          items={[
                            { label: 'Remove from class…', danger: true, title: 'Takes them off this class roster. Their work is kept.', onSelect: () => { void handleRemove(row.student_email); } },
                            { label: 'Clear Library…', danger: true, title: 'Deletes every picture, sound, uploaded image and published game they have, on every computer.', onSelect: () => { void clearLibrary(row.student_email, prog?.firstName, prog?.lastName); } },
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        {/* Add student */}
        <div style={S.card}>
          <h2 style={S.h2}>Add student by email</h2>
          <form onSubmit={(e) => { void handleEnroll(e); }} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <input
              className="teacher-field"
              aria-label="Student email"
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
              style={{ ...(enrolling || !enrollEmail.trim() ? S.btnDisabled : S.btn('var(--c-green)')), height: 36 }}
            >
              {enrolling ? 'Adding…' : 'Add student'}
            </button>
          </form>
          {enrollError && <p role="alert" style={{ ...S.error, fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, maxWidth: '70ch' }}>{enrollError}</p>}
        </div>
        {/* Bulk enroll */}
        <div style={S.card}>
          <h2 style={S.h2}>Bulk enroll</h2>
          <BulkEnrollmentForm classId={classId} joinCode={currentCode} onDone={() => { void loadDetail(); }} />
        </div>
        {/* Textures and sounds students shared with this class (#81) */}
        <div style={S.card}>
          <h2 style={S.h2}>Shared textures, sounds and fonts</h2>
          <ClassLibraryModeration classId={classId} />
        </div>
        {/* Games students published from the moSHion sandbox and shared with this class */}
        <div style={S.card}>
          <h2 style={S.h2}>Shared games</h2>
          <ClassGamesModeration classId={classId} />
        </div>
        {/* Changes students proposed to each other's games, and their conversations (free text; teachers read them here) */}
        <div style={S.card}>
          <h2 style={S.h2}>Proposed changes to games</h2>
          <ClassGameChanges classId={classId} />
        </div>
        {/* Messages between students of this class (migration 0053): the switch, pausing a student, reading and removing */}
        <div style={S.card}>
          <h2 style={S.h2}>Messages</h2>
          <ClassMessages classId={classId} />
        </div>
        {/* Programs students wrote together in the sandbox (Code together); kept 30 days */}
        <div style={S.card}>
          <h2 style={S.h2}>Code together sessions</h2>
          <ClassCodeSessions classId={classId} />
        </div>
        </div>
      )}

      {activeTab === 'gradebook' && (
        <div role="tabpanel" id={`panel-gradebook`} aria-labelledby={`tab-gradebook`} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Gradebook view */}
          <div style={{ ...S.card, padding: compact ? 16 : 20, marginBottom: 0 }}>
            <h2 style={{ ...S.h2, marginBottom: 12 }}>Gradebook</h2>
            <GradebookView
              classId={classId}
              className={cls.name}
              lessonMap={lessonMap}
              onOpenStudent={(email, lessonId) => { setDrawerLesson(lessonId ?? null); setDrawerEmail(email); }}
            />
          </div>
          <div style={{ ...S.card, padding: compact ? 16 : 20, marginBottom: 0 }}>
            <h2 style={{ ...S.h2, marginBottom: 16 }}>Most missed</h2>
            <MostMissedPanel classId={classId} onOpenStudent={(email) => { setDrawerLesson(null); setDrawerEmail(email); }} />
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div role="tabpanel" id={`panel-schedule`} aria-labelledby={`tab-schedule`} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        {/* Due dates */}
        <div style={S.card}>
          <h2 style={S.h2}>Due dates</h2>
          <DueDatesPanel classId={classId} />
        </div>
        {/* Solution release */}
        <div style={S.card}>
          <h2 style={S.h2}>Release solutions</h2>
          <SolutionReleasePanel classId={classId} />
        </div>
        {/* Shape tools vs code. Only reSHape assignments can be gated — the setting
            decides which side a reSHape lesson opens on, and means nothing to a
            moSHion or console one. */}
          <LessonModeControl
            classId={classId}
            lessons={[...lessonMap.values()]
              .filter((l) => l.preview === 'reshape')
              .map((l) => ({ id: l.id, title: l.title }))}
          />
                </div>
      )}

      {activeTab === 'settings' && (
        <div role="tabpanel" id={`panel-settings`} aria-labelledby={`tab-settings`} style={{ display: 'grid', alignItems: 'start', gap: 16, gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))' }}>
        {/* Grading weights */}
        <div style={{ ...S.card, marginBottom: 0, padding: compact ? 16 : 20 }}>
          <GradingWeightsPanel classId={classId} desktop={desktop} />
        </div>
        <div className="settings-side" style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        {/* Code */}
        <div style={{ ...S.card, padding: 16, marginBottom: 0 }}>
          {/* A labelled value at body size: the editable panels (weights, announcements) lead the page, not
              the code. */}
          {/* r7 T5: the routine action (Copy) sits beside the code; making a new code is in the card's menu,
              with its confirm. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <h2 style={{ ...S.h2, margin: 0 }}>Join code</h2>
            {isOwner && (
              <RowMenu
                label="Code options"
                // r10 T6: the menu says what it is about, not just "More".
                buttonText="Code options"
                disabled={regenerating}
                items={[
                  { label: regenerating ? 'Making a new code…' : 'Make a new join code…', danger: true, disabled: regenerating, title: 'The old code stops working right away', onSelect: () => { void handleRegenCode(); } },
                ]}
              />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...S.code, letterSpacing: '0.06em' }} aria-label={`Join code ${currentCode.split('').join(' ')}`}>{currentCode}</span>
            <button
              type="button"
              className="teacher-utility-btn"
              style={{ ...S.btn('transparent'), color: 'var(--c-cyan)', border: '1px solid var(--c-cyan)', fontWeight: 700 }}
              aria-label={`Copy join code ${currentCode}`}
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(currentCode);
                    toast('Join code copied.');
                  } catch {
                    toast(`Could not copy. The join code is ${currentCode}.`, { kind: 'error' });
                  }
                })();
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, color: 'var(--c-meta)', maxWidth: '70ch' }}>
            Students join this class with this code.{!isOwner && ' Only the class owner can make a new one.'}
          </p>
        </div>
        {/* Co-teachers */}
        <div style={{ ...S.card, marginBottom: 0, padding: 16 }}>
          <h2 style={{ ...S.h2, marginBottom: 8 }}>Co-teachers ({coTeachers.length})</h2>
          {coTeachers.length === 0 ? (
            <p style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 15, margin: 0, marginBottom: isOwner ? 12 : 0 }}>No co-teachers added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: isOwner ? 16 : 0 }}>
              {coTeachers.map((ct) => (
                <div
                  key={ct.teacher_email}
                  style={{ background: 'var(--c-bg)', borderRadius: 6, padding: '12px 16px', border: '1px solid color-mix(in srgb, var(--c-line) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--c-fg)', marginBottom: 4 }}>
                      {ct.teacher_email}
                    </div>
                    <div style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: 'var(--c-meta)' }}>
                      added {fmtTs(ct.added_at)}{ct.added_by ? ` by ${ct.added_by}` : ''}
                    </div>
                  </div>
                  {isOwner && (
                    <RowMenu label={`Actions for ${ct.teacher_email}`} disabled={removingCoTeacher === ct.teacher_email} items={[{ label: 'Remove co-teacher…', danger: true, onSelect: () => { void handleRemoveCoTeacher(ct.teacher_email); } }]} />
                  )}
                </div>
              ))}
            </div>
          )}
          {isOwner && (
            <form onSubmit={(e) => { void handleAddCoTeacher(e); }} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* r9 T6: a persistent visible label, not only the placeholder. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="co-teacher-email" style={{ fontFamily: 'var(--font-prose)', fontWeight: 600, color: 'var(--c-fg)', fontSize: 14 }}>
                  Co-teacher&apos;s email
                </label>
                <input
                  id="co-teacher-email"
                  className="teacher-field"
                  style={S.input}
                  type="email"
                  placeholder="teacher@example.com"
                  value={coTeacherEmail}
                  onChange={(e) => setCoTeacherEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={addingCoTeacher || !coTeacherEmail.trim()}
                style={{ ...(addingCoTeacher || !coTeacherEmail.trim() ? S.btnDisabled : S.btn('var(--c-purple)')), height: 36 }}
              >
                {addingCoTeacher ? 'Adding…' : 'Add co-teacher'}
              </button>
            </form>
          )}
          {coTeacherError && <p style={S.error}>{coTeacherError}</p>}
        </div>
        {/* Announcements: in the right-hand column on desktop, so it is visible without scrolling past the
            weights (it used to sit under them while this column stood half empty). */}
        <div style={{ ...S.card, marginBottom: 0, padding: 16 }}>
          <h2 style={{ ...S.h2, marginBottom: 8 }}>Announcements</h2>
          <AnnouncementsPanel classId={classId} />
        </div>
        </div>
        </div>
      )}

      {/* Student drawer */}
      {drawerEmail !== null && (
        <StudentDrawer
          classId={classId}
          email={drawerEmail}
          lessonMap={lessonMap}
          focusLessonId={drawerLesson}
          onClose={() => { setDrawerEmail(null); setDrawerLesson(null); }}
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
  const view = params.get('view');
  const wantsGradebook = view === 'gradebook';

  return (
    <FeedbackProvider>
      <div style={S.page}>
        {classId ? (
          <DetailView classId={classId} initialTab={parseTab(params.get('tab')) ?? (wantsGradebook ? 'gradebook' : undefined)} initialFilter={params.get('filter') === 'behind' ? 'behind' : undefined} />
        ) : wantsGradebook ? (
          <GradebookRedirect />
        ) : (
          <ListView />
        )}
      </div>
    </FeedbackProvider>
  );
}

// Top-nav "Gradebook" shortcut lands here with ?view=gradebook and no
// ?class= yet. No "last visited class" is persisted anywhere in this app
// (grepped for localStorage in this file: none exists), so this picks the
// first class in the teacher's own list and replaces into DetailView's
// gradebook tab. Zero classes (or a fetch error, e.g. 403) falls through to
// the ordinary ListView, which already renders the right empty/forbidden state.
function GradebookRedirect() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ classes: ClassSummary[] }>('/api/classes').then((result) => {
      if (cancelled) return;
      if (result.error === null && result.data.classes.length > 0) {
        let last: string | null = null;
        try { last = window.localStorage.getItem('shcode:lastClass'); } catch { /* private window */ }
        const pick = result.data.classes.find((c) => c.id === last) ?? result.data.classes[0];
        router.replace(`/teacher?class=${pick.id}&tab=gradebook`);
      } else {
        setEmpty(true);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  if (empty) return <ListView />;
  return <div style={{ color: 'var(--c-meta)' }}>Loading…</div>;
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div style={{ ...S.page, color: 'var(--c-meta)' }}>Loading…</div>}>
      <TeacherPageInner />
    </Suspense>
  );
}
