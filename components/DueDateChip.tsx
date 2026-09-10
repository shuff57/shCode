'use client';

// The editable date chip a teacher sees on the right edge of a module row or
// a lesson card. Students never see this — it renders null unless
// useTeacherDue() says the signed-in user can manage a class.
//
// ONE chip, not two. The button face and the calendar grid are Due (the
// thing this component has always shown); opening it also shows "Available
// after" — the Opens lock — as a second, simpler date+time row underneath.
// A separate always-visible Opens chip was tried and reverted: it read as
// clutter on a row that already has one date control, and every "available
// after" question a teacher asks starts from clicking the due date anyway.
//
// Three visual states on the Due face, because "no date" and "a date it
// inherited" and "a date I set here" are three different things to a teacher
// and only the third is clearable:
//
//   + due          nothing set anywhere up the chain
//   Sep 11         inherited from the module (dimmed, italic)
//   Sep 18  x      this row owns the date (solid, clearable)
//
// A small lock glyph on the button face itself is the only hint that an
// Opens date exists — the detail lives one click away, in the popover.
//
// Chips live inside <summary> elements, so every interactive part stops the
// click from toggling the accordion it sits in.

import { useRef, useState } from 'react';
import { CalendarClock, LockKeyhole, X } from 'lucide-react';
import CalendarPopover from './CalendarPopover';
import {
  applyModuleDateToAll,
  applyModuleOpenDateToAll,
  setDueDate,
  setOpenDate,
  useTeacherDue,
} from '../lib/due-dates-edit';
import {
  dueStatus,
  formatDue,
  formatDueTime,
  schoolDateString,
  schoolTimeString,
  type DueScope,
} from '../lib/due-dates-core';

const C = {
  dim: '#6272a4',
  text: '#f8f8f2',
  late: '#ff5555',
  today: '#f1fa8c',
  set: '#8be9fd',
  open: '#bd93f9',
  border: '#44475a',
  bg: '#282a36',
  raised: '#343746',
};

function colorFor(dueAt: number): string {
  const s = dueStatus(dueAt, null, Date.now());
  return s === 'late' ? C.late : s === 'today' ? C.today : C.set;
}

const dateInputStyle: React.CSSProperties = {
  background: C.raised,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  color: C.text,
  fontSize: 12,
  fontFamily: 'inherit',
  padding: '2px 4px',
  colorScheme: 'dark',
};

export interface DueDateChipProps {
  scope: DueScope;
  scopeId: string;
  /** What this row resolves to today, after inheritance. */
  resolvedAt: number | null;
  /** The date stored on THIS row, if any. Non-null means clearable. */
  ownAt: number | null;
  /** Module chips only: children disagree, so show "Mixed". */
  mixed?: boolean;
  min?: number | null;
  max?: number | null;
  /** Module chips only: lesson ids to clear when applying a date to all. */
  moduleLessonIds?: readonly string[];
  /** Sit at the right edge of a flex row. Costs nothing when the chip is hidden. */
  pushRight?: boolean;
  size?: 'sm' | 'md';

  // ---- "Available after" companion, shown in the same popover ----
  /**
   * This row's own Opens date, if any. Native date/time inputs edit this
   * directly. Optional and defaulting to null — a caller that doesn't pass
   * it just doesn't get the Opens row or lock glyph, same as before this
   * existed (ModuleLessonsList.tsx, the /module/[id] page, hasn't opted in).
   */
  openOwnAt?: number | null;
  /** Module chips only: children disagree on Opens. */
  openMixed?: boolean;
}

export default function DueDateChip({
  scope,
  scopeId,
  resolvedAt,
  ownAt,
  mixed = false,
  min = null,
  max = null,
  moduleLessonIds,
  pushRight = false,
  size = 'sm',
  openOwnAt = null,
  openMixed = false,
}: DueDateChipProps) {
  const due = useTeacherDue();
  const [open, setOpen] = useState(false);
  // null = "not touched this session" -> falls back to the time already on
  // the row (or blank for a row with no date yet). A non-null value is what
  // the teacher is actively typing, and survives across open/close so a time
  // set before a date is picked isn't lost.
  const [timeDraft, setTimeDraft] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!due.canEdit || !due.activeClassId) return null;

  const fontSize = size === 'md' ? 13 : 12;
  const stop = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // What the calendar opens on: this row's own due date if it has one,
  // otherwise the date it inherits, so a teacher lands in the right month
  // either way.
  const anchorDate = ownAt ?? resolvedAt;
  const effectiveTime = timeDraft ?? (anchorDate !== null ? schoolTimeString(anchorDate) : '');

  const commit = (date: string) => {
    setOpen(false);
    const time = timeDraft || undefined;
    setTimeDraft(null);
    // Setting a date on a Mixed module is the "apply to all" gesture — the
    // point of picking one date for a module whose children disagree.
    if (scope === 'module' && mixed && moduleLessonIds) {
      void applyModuleDateToAll(scopeId, date, moduleLessonIds, time);
    } else {
      void setDueDate(scope, scopeId, date, time);
    }
  };

  // Adjusting the time on a row that already has its OWN due date re-saves
  // right away, same date, new time — matches the "writes go straight
  // through on change" convention everywhere else in this store. A row with
  // no date of its own yet (inheriting, or nothing set) has nothing to
  // attach the time to until a day is picked, so this just holds the draft.
  const changeTime = (t: string) => {
    setTimeDraft(t);
    if (ownAt !== null) {
      const date = schoolDateString(ownAt);
      void setDueDate(scope, scopeId, date, t);
    }
  };

  // ---- Available after: writes straight through, no draft state -- the
  // native inputs already carry the row's current value, same pattern as
  // DueDatesPanel's DateTimeField. ----
  const openDateStr = openOwnAt !== null ? schoolDateString(openOwnAt) : '';
  const openTimeStr = openOwnAt !== null ? schoolTimeString(openOwnAt) : '';

  const writeOpen = (date: string | null, time: string | null) => {
    if (date === null) {
      void setOpenDate(scope, scopeId, null);
      return;
    }
    if (scope === 'module' && openMixed && moduleLessonIds) {
      void applyModuleOpenDateToAll(scopeId, date, moduleLessonIds, time ?? undefined);
    } else {
      void setOpenDate(scope, scopeId, date, time ?? undefined);
    }
  };

  // ---- Due face label ----
  let label: string;
  let color: string;
  let italic = false;
  let title: string;

  if (mixed) {
    label = 'Mixed';
    color = C.dim;
    title =
      min !== null && max !== null
        ? `Lessons here are due between ${formatDue(min)} and ${formatDue(max)} — pick a date to apply one to all of them`
        : 'Lessons here have different due dates';
  } else if (ownAt !== null) {
    label = formatDueTime(ownAt);
    color = colorFor(ownAt);
    title = `Due date set on this ${scope}. Click to change, x to clear — and to set an "available after" date.`;
  } else if (resolvedAt !== null) {
    label = formatDueTime(resolvedAt);
    color = C.dim;
    italic = true;
    title = `Inherited from the module. Click to give this ${scope} its own due date.`;
  } else {
    label = '+ due';
    color = C.dim;
    title = `Set a due date for this ${scope} — and, if you want one, an "available after" date`;
  }

  return (
    <span
      onClick={stop}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        whiteSpace: 'nowrap',
        marginLeft: pushRight ? 'auto' : undefined,
      }}
    >
      <button
        ref={btnRef}
        type="button"
        title={title}
        disabled={due.saving}
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: `1px solid ${ownAt !== null || mixed ? C.border : 'transparent'}`,
          borderRadius: 4,
          color,
          cursor: due.saving ? 'wait' : 'pointer',
          fontSize,
          fontFamily: 'inherit',
          fontStyle: italic ? 'italic' : 'normal',
          padding: '1px 5px',
          opacity: due.saving ? 0.6 : 1,
        }}
      >
        <CalendarClock size={fontSize} strokeWidth={2} />
        {label}
        {(openOwnAt !== null || openMixed) && (
          <LockKeyhole
            size={fontSize - 2}
            strokeWidth={2}
            color={C.open}
            aria-label="Also has an available-after date"
          />
        )}
      </button>

      {open && (
        <CalendarPopover
          anchor={btnRef.current}
          value={anchorDate === null ? null : schoolDateString(anchorDate)}
          today={schoolDateString(Date.now())}
          onPick={commit}
          time={effectiveTime}
          onTimeChange={changeTime}
          timeLabel="Due at"
          onClear={
            ownAt === null
              ? undefined
              : () => {
                  setOpen(false);
                  setTimeDraft(null);
                  void setDueDate(scope, scopeId, null);
                }
          }
          onClose={() => setOpen(false)}
          extra={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px solid ${C.border}`,
              }}
            >
              <LockKeyhole size={12} strokeWidth={2} color={C.open} />
              <span
                style={{
                  color: C.open,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                Available after{openMixed ? ' (mixed)' : ''}
              </span>
              <input
                type="date"
                value={openDateStr}
                title={openMixed ? 'Lessons here open at different times — pick a date to apply one to all' : undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  writeOpen(v === '' ? null : v, v === '' ? null : openTimeStr || null);
                }}
                style={dateInputStyle}
                aria-label={`Available-after date for this ${scope}`}
              />
              <input
                type="time"
                value={openTimeStr}
                disabled={openDateStr === ''}
                onChange={(e) => {
                  if (openDateStr === '') return;
                  writeOpen(openDateStr, e.target.value === '' ? null : e.target.value);
                }}
                style={{ ...dateInputStyle, opacity: openDateStr === '' ? 0.4 : 1 }}
                aria-label={`Available-after time for this ${scope}`}
                title={openDateStr === '' ? 'Set a date first' : undefined}
              />
              {openOwnAt !== null && (
                <button
                  type="button"
                  title="Clear the available-after date — the lesson opens immediately"
                  onClick={() => writeOpen(null, null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.dim,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: 2,
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          }
        />
      )}

      {ownAt !== null && (
        <button
          type="button"
          title={
            scope === 'module'
              ? 'Clear this module’s due date'
              : 'Clear this override and go back to the module’s due date'
          }
          disabled={due.saving}
          onClick={(e) => {
            stop(e);
            setTimeDraft(null);
            void setDueDate(scope, scopeId, null);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            color: C.dim,
            cursor: due.saving ? 'wait' : 'pointer',
            padding: '1px 2px',
          }}
        >
          <X size={fontSize} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
