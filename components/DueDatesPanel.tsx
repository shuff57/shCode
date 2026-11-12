'use client';

// Teacher-facing date editor for one class. Mounted on /teacher?class=<id>
// alongside AnnouncementsPanel, whose shape this follows.
//
// TWO dates per row, and they are not the same kind of thing:
//
//   Opens — "available after". A GATE. Before it, a student cannot open the
//           lesson at all. Writes class_open_dates.
//   Due   — advisory. A badge, and what the gradebook compares against. A
//           past-due lesson still opens and still submits. Writes
//           class_due_dates.
//
// Both inherit the same way (lesson overrides module overrides unit) and both
// take a time of day, so they share one <DateTimeField> and one write path
// parameterised by which endpoint it hits.
//
// Collapsed to modules by default. There are 512 lesson folders in the course;
// rendering every date input at once is both unusable and slow, so a module's
// lessons only mount when you open it.
//
// Writes go straight through on change — one PUT per edit, optimistic locally.
// "Apply to all lessons" is the one multi-row write: it sets the module date
// and deletes every child override in the same batch, which is why the API
// takes an entries array rather than a single row.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFeedback } from './FeedbackProvider';
import { Calendar, ChevronDown, ChevronRight, X } from 'lucide-react';
import CalendarPopover from './CalendarPopover';
import LessonAccessChip from './LessonAccessChip';
import { lessonGradeCategory } from '../lib/grading-weights';
import { withAlpha } from '../lib/color-alpha';
import { draftsAfterSave, formatDateForField, formatTimeForField, planDateCommit } from '../lib/typed-date';
import {
  buildDueIndex,
  buildOpenIndex,
  formatDue,
  formatDueTime,
  moduleDueSummary,
  moduleIdFromTitle,
  resolveDueAt,
  schoolDateString,
  SCHOOL_TZ,
  type DueDateRow,
  type DueScope,
  type OpenDateRow,
} from '../lib/due-dates-core';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
  category: string | null;
  preview?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
  assignmentCode?: string | null;
}

// Both endpoints echo back date + time already split for the inputs, so the
// panel never redoes the timezone math the server owns.
interface ApiDate {
  scope: DueScope;
  scopeId: string;
  /** epoch ms — due_at or open_at depending on which list this came from */
  at: number;
  date: string;
  time: string;
}

interface ModuleGroup {
  moduleId: string;   // "1.1"
  label: string;      // "1.1 Software Lifecycle"
  unitId: string;     // "Unit 1: JavaScript Fundamentals"
  lessons: { id: string; title: string; counts: boolean }[];
}

interface UnitGroup {
  unitId: string;
  modules: ModuleGroup[];
}

// Which of the two date kinds a control is editing. Every write, index and
// summary below is parameterised by this rather than duplicated.
type Kind = 'open' | 'due';

const COUNTS_TEXT = 'Counts toward grade';

const ENDPOINT: Record<Kind, string> = { open: 'open-dates', due: 'due-dates' };

// For an available-after grid a past date is not "late" — the gate already
// opened — so the due wording is replaced on those fields only.
const OPEN_PAST_HINT = 'Already in the past — the lesson is open now';

// "Pacific Time", named once for the schedule header; the zone id itself if the browser cannot name it.
function schoolZoneName(): string {
  try {
    const opts = { timeZone: SCHOOL_TZ, timeZoneName: 'longGeneric' } as unknown as Intl.DateTimeFormatOptions;
    return new Intl.DateTimeFormat('en-US', opts).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? SCHOOL_TZ;
  } catch {
    return SCHOOL_TZ;
  }
}

const C = {
  border: 'var(--c-line)',
  dim: 'var(--c-meta)',
  text: 'var(--c-fg)',
  input: 'var(--c-bg)',
  accent: 'var(--c-cyan)',
  warn: 'var(--c-orange)',
  open: 'var(--c-purple)',
};

// One field style (system pass rule 5): an inset surface, a visible border, 15px prose text. A filled
// date reads strongest: fg text and a border brighter than the line colour.
const dateInput: React.CSSProperties = {
  background: 'var(--c-deep2)',
  color: C.text,
  // r10 T5: a lighter frame (the line colour with a little meta) so the value, not the box, carries the contrast.
  border: `1px solid color-mix(in srgb, ${C.border} 82%, var(--c-meta))`,
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 15,
  height: 34,
  boxSizing: 'border-box',
  fontFamily: 'var(--font-prose)',
  fontVariantNumeric: 'tabular-nums',
  colorScheme: 'dark',
};

// An empty optional date/time is quieter than a filled one (rule 5) but plainly an editable field: the same
// shape and surface, a solid 1px border in the line colour, "Not set" in meta colour.
const emptyField: React.CSSProperties = {
  color: C.dim,
  border: `1px solid ${C.border}`,
};

// The module column, then the Available after group and the Due group with a clear gap between them.
const MODULE_COLS = 'minmax(280px, 1fr) 320px 320px';
const MODULE_GAP = '12px 28px';

// 96px clipped "08:00 AM" to "08:00 A"; the AM/PM segment and the clock icon need about 120px.
const timeInput: React.CSSProperties = { ...dateInput, width: 96, minWidth: 96 };

function numericCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

// Manifest -> Unit -> Module -> lessons, each level in course order.
function groupLessons(lessons: ManifestLesson[]): UnitGroup[] {
  const modules = new Map<string, ModuleGroup>();

  for (const lesson of lessons) {
    const moduleId = moduleIdFromTitle(lesson.title ?? '');
    if (!moduleId) continue; // unnumbered lessons have no module to hang off
    const unitId = lesson.category ?? 'Other';
    const key = `${unitId}::${moduleId}`;
    let group = modules.get(key);
    if (!group) {
      group = { moduleId, label: lesson.unit ?? moduleId, unitId, lessons: [] };
      modules.set(key, group);
    }
    group.lessons.push({ id: lesson.id, title: lesson.title, counts: lessonGradeCategory(lesson) !== null });
  }

  const units = new Map<string, UnitGroup>();
  for (const group of modules.values()) {
    group.lessons.sort((a, b) => numericCompare(a.title, b.title));
    let unit = units.get(group.unitId);
    if (!unit) {
      unit = { unitId: group.unitId, modules: [] };
      units.set(group.unitId, unit);
    }
    unit.modules.push(group);
  }

  const out = [...units.values()];
  for (const unit of out) unit.modules.sort((a, b) => numericCompare(a.moduleId, b.moduleId));
  out.sort((a, b) => numericCompare(a.modules[0]?.moduleId ?? '', b.modules[0]?.moduleId ?? ''));
  return out;
}

// One date + time pair (ux2 T4). Both are plain text fields: the native segmented date input put a click in
// the middle of the box on the YEAR, so typing 12/15/2026 there produced 11/04/152026. Here whatever is typed
// is read by lib/typed-date.ts (12/15/2026, 2026-12-15, 12152026; 3:00 PM, 3pm, 15:00), focus by click or
// Tab selects the whole value so typing replaces it, and Tab goes date -> time -> calendar button.
// The pair is ONE edit: it is sent when focus leaves the pair (or on Enter), so a time typed right after a
// date is saved with it (a date saved on its own blur used to wipe the time being typed). A value the page
// cannot read, or a date outside the school window, is refused in a sentence that says what is wrong and
// what is still saved, and the field goes back to the saved value.
function DateTimeField({
  label,
  color,
  row,
  onWrite,
  onClear,
  ariaSuffix,
  pastHint,
  showLabel = true,
  emptyText,
  emptyColor,
  mixed,
  onProblem,
  onDirty,
}: {
  label: string;
  color: string;
  row: ApiDate | undefined;
  /** Resolves true when the server now holds exactly what was sent. */
  onWrite: (date: string | null, time: string | null) => Promise<boolean> | void;
  onClear?: () => void;
  ariaSuffix: string;
  /** Forwarded to the popover grid; set on available-after fields only. */
  pastHint?: string;
  showLabel?: boolean;
  /** What an empty date reads instead of "Not set": a module whose lessons carry their own dates says
   *  "Mixed" (or "Set per lesson"), never "Not set". */
  emptyText?: string;
  emptyColor?: string;
  /** A module whose lessons carry different dates and no date of its own: the field is ONE control the
   *  size of a date + time pair, "Mixed · set per lesson", that opens the module's lessons (climb4 r7 T1).
   *  "Set one date for all" lives in the opened module's summary line, not in the row. */
  mixed?: { lessonsShown: boolean; onShowLessons: () => void };
  /** Told whether this field is showing a refusal, so the panel's header never says "Saved" over one. */
  onProblem?: (has: boolean) => void;
  /** Told whether this field holds an edit that is not saved yet (typed, or waiting for a save to return). */
  onDirty?: (has: boolean) => void;
}) {
  const date = row?.date ?? '';
  const time = row?.time ?? '';
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLSpanElement>(null);
  // What is typed is a DRAFT (text) until the pair loses focus or Enter is pressed. Null = show the saved value.
  const [draftDate, setDraftDate] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [problem, setProblemState] = useState<string | null>(null);
  const onProblemRef = useRef(onProblem);
  onProblemRef.current = onProblem;
  const setProblem = (p: string | null) => {
    setProblemState(p);
    onProblemRef.current?.(p !== null);
  };
  useEffect(() => () => onProblemRef.current?.(false), []);
  const msgId = useId();
  // A click selects the whole value on the way in; the mouseup that follows must not undo that selection.
  const justFocused = useRef(false);
  const shownDate = draftDate ?? formatDateForField(date);
  const shownTime = draftTime ?? formatTimeForField(time);

  // The drafts as of NOW, for code that runs after an await (a render's closure would be out of date).
  const draftDateRef = useRef<string | null>(null);
  const draftTimeRef = useRef<string | null>(null);
  const setDD = (v: string | null) => { draftDateRef.current = v; setDraftDate(v); };
  const setDT = (v: string | null) => { draftTimeRef.current = v; setDraftTime(v); };
  // What the server holds as far as this field knows. Updated from the row on every render, and at once to
  // what was sent when a save succeeds, because the list is read back after the save and an edit queued in
  // the meantime must be planned against the new value, not the old one.
  const savedRef = useRef({ date, time });
  const lastRow = useRef({ date, time });
  if (lastRow.current.date !== date || lastRow.current.time !== time) {
    lastRow.current = { date, time };
    savedRef.current = { date, time };
  }
  const savedWordsOf = (v: { date: string; time: string }) =>
    v.date ? `${formatDateForField(v.date)}${v.time ? ` ${formatTimeForField(v.time)}` : ''}` : 'no date';

  // A draft that differs from what is saved is an unsent edit: the panel's header must not say "Saved" then.
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  useEffect(() => { onDirtyRef.current?.(draftDate !== null || draftTime !== null); }, [draftDate, draftTime]);
  useEffect(() => () => onDirtyRef.current?.(false), []);

  // Send the pair. One save at a time: an edit committed while one is in flight (Enter, then a correction and
  // Enter again, or a calendar pick) is QUEUED and sent when the first returns, never dropped. After each save
  // only the drafts that are still exactly what was sent are cleared, so a newer edit stays on screen.
  const busy = useRef(false);
  const queued = useRef<{ picked?: string } | null>(null);
  const commit = async (picked?: string) => {
    if (busy.current) {
      // The latest request wins, but a calendar pick is kept unless a newer pick replaces it.
      queued.current = { picked: picked ?? queued.current?.picked };
      return;
    }
    busy.current = true;
    try {
      let next: { picked?: string } | null = { picked };
      while (next) {
        await commitOnce(next.picked);
        next = queued.current;
        queued.current = null;
      }
    } finally {
      busy.current = false;
    }
  };
  const commitOnce = async (picked?: string) => {
    const sentDate = draftDateRef.current;
    const sentTime = draftTimeRef.current;
    const saved = savedRef.current;
    const plan = planDateCommit({ saved, draftDate: sentDate, draftTime: sentTime, picked, today: schoolDateString(Date.now()) });
    if (plan.kind === 'idle') return;
    if (plan.kind === 'unchanged') {
      setDD(null);
      setDT(null);
      setProblem(null);
      return;
    }
    if (plan.kind === 'needs-date') {
      setDD(null);
      setDT(null);
      setProblem(plan.problem);
      return;
    }
    if (plan.kind === 'refuse') {
      // Back to the saved value, and say what is still saved.
      setDD(null);
      setDT(null);
      const why = plan.problem;
      setProblem(/not saved/i.test(why) ? `${why} Still saved: ${savedWordsOf(saved)}.` : `${why} Not saved. Still saved: ${savedWordsOf(saved)}.`);
      return;
    }
    setProblem(null);
    const ok = await onWrite(plan.date, plan.date === null ? null : plan.time);
    if (ok !== false) savedRef.current = { date: plan.date ?? '', time: plan.date === null ? '' : plan.time ?? '' };
    // Only the drafts that are still what was sent go; an edit typed during the save stays.
    const keep = draftsAfterSave({ date: sentDate, time: sentTime }, { date: draftDateRef.current, time: draftTimeRef.current });
    setDD(keep.date);
    setDT(keep.time);
    if (ok === false && keep.date === null && keep.time === null) {
      setProblem(`Not saved. The field shows what is saved: ${savedWordsOf(savedRef.current)}.`);
    }
  };

  if (mixed && !date) {
    return (
      <span className="dd-mixed" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', boxSizing: 'border-box', maxWidth: '100%', padding: showLabel ? 0 : '0 0 0 12px', borderLeft: showLabel ? undefined : `1px solid ${C.border}` }}>
        {showLabel && <span style={{ fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 600, flexBasis: '100%', color }}>{label}</span>}
        <button
          type="button"
          className="dd-mixed-btn"
          aria-expanded={mixed.lessonsShown}
          onClick={mixed.onShowLessons}
          aria-label={`${label} for ${ariaSuffix}: mixed dates, set per lesson. ${mixed.lessonsShown ? 'Hide' : 'Show'} the lessons`}
          title={mixed.lessonsShown ? 'Hide the lessons' : 'Edit each lesson\'s date'}
        >
          {/* r8 T6: name what the control does. */}
          <span style={{ color: emptyColor ?? C.warn, fontWeight: 700 }}>Mixed dates</span>
          <span className="dd-mixed-btn-sub"><span aria-hidden="true">· </span>Edit lessons</span>
          <span aria-hidden="true" className="dd-mixed-btn-chev">{mixed.lessonsShown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </button>
      </span>
    );
  }

  // A pick from the calendar grid is a whole, deliberate date: it is sent at once (or right after a save in
  // flight), with any time typed.
  const pickFromGrid = (d: string) => {
    setCalOpen(false);
    // Shown at once as the field's value (a draft), then sent like a typed date: queued behind a save in flight.
    setDD(formatDateForField(d));
    void commit();
  };

  const selectAllOnFocus = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      justFocused.current = true;
      e.currentTarget.select();
    },
    onMouseUp: (e: React.MouseEvent<HTMLInputElement>) => {
      if (justFocused.current) e.preventDefault();
      justFocused.current = false;
    },
  };
  const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    justFocused.current = false;
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape' && (draftDate !== null || draftTime !== null)) {
      setDD(null);
      setDT(null);
      setProblem(null);
    }
  };
  const timeReady = date !== '' || (draftDate !== null && draftDate.trim() !== '');

  return (
    // flexWrap + maxWidth: at phone width the label, date, time, calendar and clear controls are wider than the
    // row, and a nowrap field pushed the page 23px past the screen.
    <span
      ref={groupRef}
      className="dd-pair"
      onBlur={(e) => {
        // The pair is one edit: only when focus leaves the date, the time AND the calendar button is it sent.
        if (groupRef.current && e.relatedTarget instanceof Node && groupRef.current.contains(e.relatedTarget)) return;
        if (calOpen) return;
        setFocused(false);
        void commit();
      }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', boxSizing: 'border-box', maxWidth: '100%', padding: showLabel ? 0 : '0 0 0 12px', borderLeft: showLabel ? undefined : `1px solid ${C.border}` }}
    >
      {showLabel && <span style={{ fontFamily: 'var(--font-prose)', fontSize: 14, fontWeight: 600, flexBasis: '100%', color }}>{label}</span>}
      <span style={{ position: 'relative', display: 'inline-flex' }}>
      {/* "Not set" covers an empty field only while it is not being typed in (ux1 G7). */}
      {!shownDate && !focused && <span aria-hidden="true" style={{ position: 'absolute', left: 7, top: 1, bottom: 1, right: 1, display: 'flex', alignItems: 'center', background: 'var(--c-deep2)', color: (mixed ? undefined : emptyColor) ?? C.dim, fontFamily: 'var(--font-prose)', fontSize: 15, fontWeight: emptyText && !mixed ? 600 : undefined, pointerEvents: 'none', zIndex: 1 }}>{(mixed ? undefined : emptyText) ?? 'Not set'}</span>}
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="MM/DD/YYYY"
        value={shownDate}
        onChange={(e) => {
          setDD(e.target.value);
          if (problem) setProblem(null);
        }}
        {...selectAllOnFocus}
        onKeyDown={keys}
        className="teacher-field dd-date"
        style={shownDate ? { ...dateInput, width: 116 } : { ...dateInput, width: 116, ...emptyField }}
        aria-label={`${label} date for ${ariaSuffix}, month/day/year`}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${msgId}` : undefined}
      />
      </span>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={timeReady ? '11:59 PM' : ''}
        value={shownTime}
        disabled={!timeReady}
        onChange={(e) => {
          setDT(e.target.value);
          if (problem) setProblem(null);
        }}
        {...selectAllOnFocus}
        onKeyDown={keys}
        className="teacher-field dd-time"
        style={{ ...timeInput, ...(!timeReady ? { ...emptyField, opacity: 0.75, cursor: 'not-allowed' } : {}) }}
        aria-label={`${label} time for ${ariaSuffix}`}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${msgId}` : undefined}
        title={!timeReady ? 'Set a date first' : 'Type a time like 3:00 PM'}
      />
      <button
        ref={calRef}
        type="button"
        className="dd-cal-btn"
        title={`Open the ${label.toLowerCase()} calendar`}
        aria-label={`Open the ${label.toLowerCase()} calendar for ${ariaSuffix}`}
        aria-expanded={calOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCalOpen((v) => !v);
        }}
        style={{ borderColor: calOpen ? C.accent : undefined }}
      >
        <Calendar size={15} strokeWidth={2} />
      </button>
      {onClear && row && (
        <button
          type="button"
          title={`Clear this ${label.toLowerCase()} override — the lesson goes back to the module's date`}
          aria-label={`Clear the ${label.toLowerCase()} date for ${ariaSuffix}`}
          onClick={onClear}
          style={{
            background: 'none', border: 'none', color: C.dim, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', padding: 2,
          }}
        >
          <X size={14} />
        </button>
      )}
      {/* The clear button's room is kept when there is nothing to clear, so a lesson with its own date lines
          up with the lessons around it (a row used to shift left when its × appeared). */}
      {onClear && !row && <span aria-hidden="true" className="dd-clear-space" />}
      {problem && (
        <span id={msgId} role="alert" className="dd-date-msg">{problem}</span>
      )}
      {calOpen && (
        <CalendarPopover
          anchor={calRef.current}
          value={date === '' ? null : date}
          today={schoolDateString(Date.now())}
          onPick={pickFromGrid}
          label={`Pick the ${label.toLowerCase()} date`}
          pastHint={pastHint}
          onClose={() => setCalOpen(false)}
        />
      )}
    </span>
  );
}

/** A module field with no date of its own whose lessons DO carry dates: "Mixed" (orange) when they differ,
 *  "Set per lesson" / "From unit" when they agree. Only a module with no dated lesson under it reads "Not set". */
function emptyFor(summary: { kind: 'none' | 'single' | 'mixed'; ownDueAt: number | null; overrides: number }): { emptyText?: string; emptyColor?: string } {
  if (summary.ownDueAt !== null) return {};
  if (summary.kind === 'mixed') return { emptyText: 'Mixed', emptyColor: C.warn };
  // Every lesson has the same date: from their own rows, or (no lesson rows) inherited from the unit.
  if (summary.kind === 'single') return { emptyText: summary.overrides > 0 ? 'Set per lesson' : 'From unit', emptyColor: C.text };
  return {};
}

export default function DueDatesPanel({ classId }: { classId: string }) {
  const [compact, setCompact] = useState(false);
  const zoneName = useMemo(() => schoolZoneName(), []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const [lessons, setLessons] = useState<ManifestLesson[]>([]);
  const [dates, setDates] = useState<Record<Kind, ApiDate[]>>({ open: [], due: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedParts, setFailedParts] = useState<Record<Kind, boolean>>({ open: false, due: false });
  const { toast } = useFeedback();
  const [saving, setSaving] = useState(false);
  // Fields showing a refused value (ux2 T4): while any is, the header says so instead of "Saved".
  const [problems, setProblems] = useState<Set<string>>(new Set());
  const markProblem = useCallback((key: string, has: boolean) => {
    setProblems((prev) => {
      if (prev.has(key) === has) return prev;
      const next = new Set(prev);
      if (has) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  // Fields holding an edit that is not saved yet: the header says so rather than "Saved".
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const markDirty = useCallback((key: string, has: boolean) => {
    setDirty((prev) => {
      if (prev.has(key) === has) return prev;
      const next = new Set(prev);
      if (has) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const [open, setOpen] = useState<Set<string>>(new Set());
  // `${kind}:${moduleId}` of a mixed module whose field shows a date picker because the teacher chose
  // "Set one date for all" (the field is otherwise the Mixed control).
  const [settingAll, setSettingAll] = useState<Set<string>>(new Set());
  const toggleSettingAll = (key: string, on: boolean) => {
    setSettingAll((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  // Both endpoints, one shape. The GET bodies differ only in the key they
  // hang the array off and the name of the timestamp field.
  const fetchKind = useCallback(
    async (kind: Kind): Promise<ApiDate[]> => {
      const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        dueDates?: { scope: DueScope; scopeId: string; dueAt: number; date: string; time: string }[];
        openDates?: { scope: DueScope; scopeId: string; openAt: number; date: string; time: string }[];
      };
      const rows = kind === 'due' ? data.dueDates ?? [] : data.openDates ?? [];
      return rows.map((r) => ({
        scope: r.scope,
        scopeId: r.scopeId,
        at: 'dueAt' in r ? r.dueAt : (r as { openAt: number }).openAt,
        date: r.date,
        time: r.time,
      }));
    },
    [classId],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      // Each part loads on its own: one failing endpoint must not blank the lessons or the other dates.
      const failed: string[] = [];
      const part = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await run();
        } catch (e) {
          failed.push(`${label} (${e instanceof Error ? e.message : 'failed'})`);
          return fallback;
        }
      };
      const [manifest, openRows, dueRows] = await Promise.all([
        part('lesson list', async () => {
          const res = await fetch('/lessons-manifest.json');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { lessons: ManifestLesson[] };
          return data.lessons ?? [];
        }, [] as ManifestLesson[]),
        part('available-after dates', () => fetchKind('open'), [] as ApiDate[]),
        part('due dates', () => fetchKind('due'), [] as ApiDate[]),
      ]);
      if (!alive) return;
      setLessons(manifest);
      setDates({ open: openRows, due: dueRows });
      if (failed.length > 0) {
        setError(`Could not load: ${failed.join('; ')}. The rest is shown. Saving a date of a part that did not load is disabled until you reload.`);
        setFailedParts({ open: failed.some((f) => f.startsWith('available-after')), due: failed.some((f) => f.startsWith('due dates')) });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [classId, fetchKind]);

  const units = useMemo(() => groupLessons(lessons), [lessons]);

  const byKey = useMemo(() => {
    const build = (rows: ApiDate[]) => {
      const map = new Map<string, ApiDate>();
      for (const row of rows) map.set(`${row.scope}:${row.scopeId}`, row);
      return map;
    };
    return { open: build(dates.open), due: build(dates.due) };
  }, [dates]);

  // moduleDueSummary is index-shaped, not due-specific, so the open dates run
  // through the very same summary logic — "Mixed", the range, the override
  // count are all one implementation.
  const index = useMemo(
    () => ({
      due: buildDueIndex(dates.due.map((d): DueDateRow => ({ scope: d.scope, scopeId: d.scopeId, dueAt: d.at }))),
      open: buildOpenIndex(dates.open.map((d): OpenDateRow => ({ scope: d.scope, scopeId: d.scopeId, openAt: d.at }))),
    }),
    [dates],
  );

  // One write path for every edit. `date: null` deletes the row.
  const write = useCallback(
    async (kind: Kind, entries: { scope: DueScope; scopeId: string; date: string | null; time?: string | null }[]): Promise<boolean> => {
      if (entries.length === 0) return true;
      if (failedParts[kind]) {
        toast(`Not saved: the ${kind === 'due' ? 'due' : 'available-after'} dates did not load. Reload the page first.`, { kind: 'error' });
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Save failed (HTTP ${res.status})`);
          toast(`Not saved: ${body.error ?? `HTTP ${res.status}`}`, { kind: 'error' });
          return false;
        }
        // Re-read rather than patch locally: the server owns the timezone
        // conversion, so the instant for a date we just sent is not ours to
        // guess. Only the kind we wrote is re-read — the other is untouched.
        const fresh = await fetchKind(kind);
        setDates((prev) => ({ ...prev, [kind]: fresh }));
        // Only say "saved" for what the server now holds (ux1 G7): every dated entry must come back as sent.
        const held = entries.every((e) => {
          const r = fresh.find((f) => f.scope === e.scope && f.scopeId === e.scopeId);
          return e.date === null ? !r : !!r && r.date === e.date && (!e.time || r.time === e.time);
        });
        const what = kind === 'due' ? 'Due date' : 'Available-after date';
        if (!held) {
          toast(`${what} not saved as typed. The field shows what is saved.`, { kind: 'error' });
          return false;
        }
        const one = entries.length === 1 ? entries[0] : null;
        toast(one && one.date === null
          ? `${what} cleared.${one.scope === 'lesson' ? ' The lesson goes back to the module\u2019s date.' : ''}`
          : `${what} saved.`);
        return true;
      } catch {
        setError('Save failed — check your connection.');
        toast('Not saved: check your connection.', { kind: 'error' });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [classId, fetchKind, toast, failedParts],
  );

  const toggle = (moduleId: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (loading) return <p style={{ color: C.dim }}>Loading dates…</p>;

  return (
    <div>
      {/* Intro and save state share one line: the save state is a small inline indicator, not a box that
          outweighs the dates. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px 16px', margin: '0 0 4px 0' }}>
        <p style={{ color: C.dim, fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, margin: 0, minWidth: 0, maxWidth: '70ch' }}>Set module dates for the whole group, or open a module to set individual lessons.</p>
        <span role="status" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontFamily: 'var(--font-prose)', fontSize: 13, color: C.dim, whiteSpace: 'nowrap' }}>
          <span style={{ color: saving ? 'var(--c-cyan)' : error || problems.size > 0 ? 'var(--c-orange)' : dirty.size > 0 ? 'var(--c-fg)' : 'var(--c-green)', fontWeight: 600 }}>
            {saving
              ? 'Saving…'
              : error
                ? 'Could not save or load dates — see details below'
                : problems.size > 0
                  ? `Last change not saved: ${problems.size === 1 ? 'a date needs' : `${problems.size} dates need`} fixing (see the orange note)`
                  : dirty.size > 0
                    ? 'Not saved yet: press Enter or leave the field to save'
                    : '✓ Saved'}
          </span>
          {problems.size === 0 && dirty.size === 0 && <span>· changes save automatically</span>}
        </span>
      </div>
      <details style={{ color: C.dim, fontSize: 13, margin: '0 0 12px 0' }}>
        <summary style={{ color: C.accent, cursor: 'pointer', marginBottom: 8, fontFamily: 'var(--font-prose)', fontSize: 14 }}>How dates work</summary>
        <div style={{ fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, maxWidth: '70ch' }}>
        A module&apos;s date applies to every lesson inside it. Give one lesson its own date and the
        module reads <strong>Mixed</strong>; clear that date and the lesson goes back to inheriting.
        <br />
        <strong style={{ color: C.open }}>Available after</strong> is a lock: before it, students see the lesson
        greyed out with the date on it and cannot open it. Leave it blank and the lesson is available
        immediately, which is how all {lessons.length > 0 ? lessons.length : 'the'} lessons behave today.{' '}
        <strong>Due</strong> never locks — a past-due lesson still opens and still submits. Set a date
        and leave the time blank and Available after starts at midnight, Due lands at 11:59 PM. All times are
        school time.
        </div>
      </details>

      {error && (
        <p style={{ color: 'var(--c-red)', fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, marginBottom: 12, maxWidth: '70ch' }}>{error}</p>
      )}

      {units.length === 0 && !loading && (
        <p style={{ color: C.dim, fontFamily: 'var(--font-prose)', fontSize: 15 }}>
          {lessons.length > 0
            ? 'No numbered lessons to set dates on.'
            : error
              ? 'The lesson list did not load, so there is nothing to show.'
              : 'No lessons found.'}
        </p>
      )}

      {units.map((unit) => (
        <div className="schedule-unit" key={unit.unitId} style={{ marginBottom: 16, overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-prose)', fontSize: 15, fontWeight: 700, color: C.accent }}>{unit.unitId}</span>
            <span style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: C.dim }}>Times are in {zoneName}</span>
          </div>

          {/* Group headers: what each column group sets, with what its two fields are in meta. */}
          <div style={{ display: compact ? 'none' : 'grid', gridTemplateColumns: MODULE_COLS, gap: MODULE_GAP, minWidth: 960, padding: '8px 0 8px', borderBottom: `1px solid ${C.border}`, color: C.dim, fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600, alignItems: 'end' }}>
            <span>Module</span>
            <span style={{ paddingLeft: 13 }}><span style={{ color: C.open }}>Available after</span> <span style={{ fontWeight: 400 }}>· date and time</span></span>
            <span style={{ paddingLeft: 13 }}><span style={{ color: C.text }}>Due</span> <span style={{ fontWeight: 400 }}>· date and time</span></span>
          </div>
          {unit.modules.map((mod) => {
            const lessonIds = mod.lessons.map((l) => l.id);
            const dueSummary = moduleDueSummary(index.due, mod.moduleId, lessonIds, mod.unitId);
            const openSummary = moduleDueSummary(index.open, mod.moduleId, lessonIds, mod.unitId);
            const isOpen = open.has(mod.moduleId);

            // "Set the module date, drop every child override" — the one
            // multi-row write, and the reason the API takes an array.
            const applyToAll = (kind: Kind) => {
              const own = byKey[kind].get(`module:${mod.moduleId}`);
              if (!own) return;
              void write(kind, [
                { scope: 'module', scopeId: mod.moduleId, date: own.date, time: own.time },
                ...mod.lessons
                  .filter((l) => byKey[kind].has(`lesson:${l.id}`))
                  .map((l) => ({ scope: 'lesson' as DueScope, scopeId: l.id, date: null })),
              ]);
            };

            const openMixed = openSummary.kind === 'mixed' && openSummary.ownDueAt === null;
            const dueMixed = dueSummary.kind === 'mixed' && dueSummary.ownDueAt === null;
            const settingOpenAll = openMixed && settingAll.has(`open:${mod.moduleId}`);
            const settingDueAll = dueMixed && settingAll.has(`due:${mod.moduleId}`);
            // "Set one date for all" means what it says: the picked date becomes the module's date and every
            // lesson's own date of that kind is dropped, in one batch.
            const setOneForAll = async (kind: Kind, date: string | null, time: string | null): Promise<boolean> => {
              if (date === null) return false;
              const ok = await write(kind, [
                { scope: 'module', scopeId: mod.moduleId, date, time },
                ...mod.lessons
                  .filter((l) => byKey[kind].has(`lesson:${l.id}`))
                  .map((l) => ({ scope: 'lesson' as DueScope, scopeId: l.id, date: null })),
              ]);
              toggleSettingAll(`${kind}:${mod.moduleId}`, false);
              return ok;
            };
            // A module with its own date whose lessons still differ says so under its name, so the collapsed
            // row keeps one shape and the summary line only appears when the module is open.
            const ownWithOverrides = Math.max(
              openSummary.kind === 'mixed' && openSummary.ownDueAt !== null ? openSummary.overrides : 0,
              dueSummary.kind === 'mixed' && dueSummary.ownDueAt !== null ? dueSummary.overrides : 0,
            );
            const setAllButton = (kind: Kind, on: boolean) => (
              <button
                type="button"
                className="dd-mixed-setall"
                onClick={() => toggleSettingAll(`${kind}:${mod.moduleId}`, !on)}
                aria-label={on ? 'Cancel setting one date' : `Set one ${kind === 'open' ? 'available-after' : 'due'} date for all of module ${mod.moduleId}`}
              >
                {on ? 'Cancel' : 'Set one date for all'}
              </button>
            );

            return (
              <div key={mod.moduleId} style={{ borderBottom: `1px solid ${C.border}`, padding: '10px 0', minHeight: 58, boxSizing: 'border-box', minWidth: compact ? 0 : 960 }}>
                <div className="schedule-module-row" style={{ display: 'grid', gridTemplateColumns: compact ? 'minmax(0, 1fr)' : MODULE_COLS, alignItems: 'center', gap: compact ? 12 : MODULE_GAP }}>
                  <button
                    type="button"
                    onClick={() => toggle(mod.moduleId)}
                    aria-expanded={isOpen}
                    className="schedule-module-toggle"
                    style={{
                      background: 'none', border: 'none', color: C.text, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'flex-start', gap: 8, padding: 0,
                      fontSize: 15, whiteSpace: 'normal', fontWeight: 600, fontFamily: 'var(--font-prose)', flex: '1 1 240px', textAlign: 'left', minWidth: 0,
                    }}
                  >
                    {/* r10 T5: a larger chevron in a small framed box, so the row reads as something that opens. */}
                    <span aria-hidden="true" className="schedule-module-chev">{isOpen ? <ChevronDown size={16} strokeWidth={2.25} /> : <ChevronRight size={16} strokeWidth={2.25} />}</span>
                    {/* The name (up to two lines, full name in the tooltip) with the lesson count on its own
                        line under it in meta, so a long name never runs into its count (rule 4). */}
                    <span className="schedule-module-text" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 auto' }}>
                      <span
                        className="schedule-module-name"
                        title={mod.label}
                        style={{ minWidth: 0, lineHeight: '21px', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                      >
                        {mod.label}
                      </span>
                      <span style={{ color: C.dim, fontSize: 13, lineHeight: '18px', fontWeight: 400, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {mod.lessons.length} lesson{mod.lessons.length === 1 ? '' : 's'}
                        {ownWithOverrides > 0 && (
                          <span style={{ color: C.warn }}> · {ownWithOverrides} with {ownWithOverrides === 1 ? 'its' : 'their'} own date</span>
                        )}
                      </span>
                    </span>
                  </button>

                  <DateTimeField
                    label="Available after"
                    color={C.open}
                    row={byKey.open.get(`module:${mod.moduleId}`)}
                    onWrite={(date, time) => {
                      if (settingOpenAll) return setOneForAll('open', date, time);
                      else return write('open', [{ scope: 'module', scopeId: mod.moduleId, date, time }]);
                    }}
                    ariaSuffix={`module ${mod.moduleId}`}
                    pastHint={OPEN_PAST_HINT}
                    showLabel={compact}
                    onProblem={(has) => markProblem(`open:module:${mod.moduleId}`, has)}
                    onDirty={(has) => markDirty(`open:module:${mod.moduleId}`, has)}
                    {...(settingOpenAll ? { emptyText: 'Pick a date', emptyColor: C.text } : emptyFor(openSummary))}
                    mixed={openMixed && !settingOpenAll ? { lessonsShown: isOpen, onShowLessons: () => toggle(mod.moduleId) } : undefined}
                  />

                  <DateTimeField
                    label="Due at"
                    color={C.dim}
                    {...(settingDueAll ? { emptyText: 'Pick a date', emptyColor: C.text } : emptyFor(dueSummary))}
                    mixed={dueMixed && !settingDueAll ? { lessonsShown: isOpen, onShowLessons: () => toggle(mod.moduleId) } : undefined}
                    row={byKey.due.get(`module:${mod.moduleId}`)}
                    onWrite={(date, time) => {
                      if (settingDueAll) return setOneForAll('due', date, time);
                      else return write('due', [{ scope: 'module', scopeId: mod.moduleId, date, time }]);
                    }}
                    ariaSuffix={`module ${mod.moduleId}`}
                    showLabel={compact}
                    onProblem={(has) => markProblem(`due:module:${mod.moduleId}`, has)}
                    onDirty={(has) => markDirty(`due:module:${mod.moduleId}`, has)}
                  />
                </div>

                {/* The module's summary sits under its own columns: what Opens says under Available after,
                    what Due says under Due, so the two states never run together as one sentence. On a
                    phone the two parts stack, each on its own line. Only an OPEN module shows it, so every
                    collapsed row has the same height and shape (climb4 r7 T1). */}
                <div
                  className="schedule-module-summary"
                  style={{
                    display: isOpen ? 'grid' : 'none',
                    gridTemplateColumns: compact ? 'minmax(0, 1fr)' : MODULE_COLS,
                    alignItems: 'start', gap: compact ? 6 : MODULE_GAP, margin: compact ? '8px 0 0 22px' : '6px 0 0',
                    fontFamily: 'var(--font-prose)',
                  }}
                >
                  {!compact && <span aria-hidden="true" />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, paddingLeft: compact ? 0 : 13 }}>
                    {openSummary.kind !== 'none' && (
                      <span style={{ fontSize: 13, color: openSummary.kind === 'mixed' ? C.warn : C.open }}>
                        <span style={{ fontWeight: 700 }}>Opens:</span>{' '}
                        {openSummary.kind === 'mixed'
                          ? `mixed · ${openSummary.overrides} override${openSummary.overrides === 1 ? '' : 's'}`
                          : openSummary.dueAt !== null
                            ? formatDueTime(openSummary.dueAt)
                            : ''}
                      </span>
                    )}
                    {openMixed && setAllButton('open', settingOpenAll)}
                    {openSummary.kind === 'mixed' && openSummary.ownDueAt !== null && (
                      <button
                        type="button"
                        onClick={() => applyToAll('open')}
                        style={{
                          background: 'none', border: `1px solid ${C.border}`, color: C.open,
                          borderRadius: 4, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Apply this Opens to all
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, paddingLeft: compact ? 0 : 13 }}>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: dueSummary.kind === 'mixed' ? C.warn : C.dim }}>
                      <span style={{ fontWeight: 700 }}>Due:</span>{' '}
                      {dueSummary.kind === 'mixed'
                        ? `mixed · ${dueSummary.overrides} override${dueSummary.overrides === 1 ? '' : 's'}`
                        : dueSummary.kind === 'single' && dueSummary.dueAt !== null
                          ? `${formatDueTime(dueSummary.dueAt)} for all lessons`
                          : 'none set'}
                    </span>
                    {dueMixed && setAllButton('due', settingDueAll)}
                    {dueSummary.kind === 'mixed' && dueSummary.ownDueAt !== null && (
                      <button
                        type="button"
                        onClick={() => applyToAll('due')}
                        style={{
                          background: 'none', border: `1px solid ${C.border}`, color: C.warn,
                          borderRadius: 4, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Apply {formatDue(dueSummary.ownDueAt)} to all
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ margin: compact ? '12px 0 0' : '12px 0 8px 24px', overflowX: 'auto' }}>
                    <div style={{ display: compact ? 'none' : 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 350px 350px auto auto', gap: 12, minWidth: 1040, padding: '0 0 8px', borderBottom: `1px solid ${C.border}`, color: C.dim, fontFamily: 'var(--font-prose)', fontSize: 13, fontWeight: 600 }}>
                      <span>Lesson</span><span style={{ color: C.open }}>Available after</span><span>Due</span><span>Early access</span><span>Late access</span>
                    </div>
                    {mod.lessons.map((lesson) => {
                      const openRow = byKey.open.get(`lesson:${lesson.id}`);
                      const dueRow = byKey.due.get(`lesson:${lesson.id}`);
                      // Counted items only: a reading, slide or practice drill has no grade category, so a
                      // date on it changes a badge and nothing else. The marker text is in the fields' names too.
                      const fieldName = lesson.counts ? `${lesson.title}, ${COUNTS_TEXT.toLowerCase()}` : lesson.title;
                      return (
                        <div
                          key={lesson.id}
                          style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '8px 0', borderBottom: `1px solid ${withAlpha(C.border, '66')}` }}
                        >
                          <span
                            style={{
                              flex: compact ? '1 1 100%' : '1 1 240px',
                              fontFamily: 'var(--font-prose)',
                              fontSize: 14,
                              lineHeight: 1.5,
                              color: openRow || dueRow ? C.text : C.dim,
                            }}
                          >
                            {lesson.title}
                            {lesson.counts && (
                              <span
                                style={{
                                  marginLeft: 8, padding: '4px 8px', fontSize: 13, whiteSpace: 'nowrap',
                                  color: C.text, border: `1px solid ${C.dim}`, borderRadius: 999,
                                }}
                              >
                                {COUNTS_TEXT}
                              </span>
                            )}
                            {!openRow && !dueRow && (() => {
                              // Say WHICH date it inherits (lesson > module > unit), not just that it does.
                              const ids = { lessonId: lesson.id, moduleId: mod.moduleId, unitId: mod.unitId };
                              const dueAt = resolveDueAt(index.due, ids);
                              const openAt = resolveDueAt(index.open, ids);
                              const parts = [
                                openAt !== null ? `opens ${formatDueTime(openAt)}` : null,
                                dueAt !== null ? `due ${formatDueTime(dueAt)}` : null,
                              ].filter(Boolean);
                              return (
                                <span style={{ fontSize: 13, color: C.dim }}>
                                  {parts.length > 0 ? ` · inherits ${parts.join(', ')}` : ' · inherits (no date set)'}
                                </span>
                              );
                            })()}
                          </span>

                          <DateTimeField
                            label="Available after"
                            color={C.open}
                            row={openRow}
                            onWrite={(date, time) => write('open', [{ scope: 'lesson', scopeId: lesson.id, date, time }])}
                            onClear={() => { void write('open', [{ scope: 'lesson', scopeId: lesson.id, date: null }]); }}
                            ariaSuffix={fieldName}
                            pastHint={OPEN_PAST_HINT}
                            showLabel={compact}
                            onProblem={(has) => markProblem(`open:lesson:${lesson.id}`, has)}
                    onDirty={(has) => markDirty(`open:lesson:${lesson.id}`, has)}
                          />

                          <DateTimeField
                            label="Due at"
                            color={C.dim}
                            row={dueRow}
                            onWrite={(date, time) => write('due', [{ scope: 'lesson', scopeId: lesson.id, date, time }])}
                            onClear={() => { void write('due', [{ scope: 'lesson', scopeId: lesson.id, date: null }]); }}
                            ariaSuffix={fieldName}
                            showLabel={compact}
                            onProblem={(has) => markProblem(`due:lesson:${lesson.id}`, has)}
                    onDirty={(has) => markDirty(`due:lesson:${lesson.id}`, has)}
                          />

                          <LessonAccessChip classId={classId} lessonId={lesson.id} lessonTitle={lesson.title} kind="early" />
                          <LessonAccessChip classId={classId} lessonId={lesson.id} lessonTitle={lesson.title} kind="late" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
