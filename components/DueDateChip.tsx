'use client';

// The editable due-date / open-date chip a teacher sees on the right edge of
// a module row or a lesson card. Students never see this — it renders null
// unless useTeacherDue() says the signed-in user can manage a class.
//
// Three visual states, because "no date" and "a date it inherited" and "a date
// I set here" are three different things to a teacher and only the third is
// clearable:
//
//   + due          nothing set anywhere up the chain
//   Sep 11         inherited from the module (dimmed, italic)
//   Sep 18  x      this row owns the date (solid, clearable)
//
// One chip, two kinds (`kind` prop, default 'due'): Due is advisory and
// color-codes by status (late/today/upcoming); Opens is a lock, has no "late"
// concept, and always reads in the same lock-purple as OpensBadge so a
// teacher recognizes it as the same idea whether it's read-only or editable.
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
import { dueStatus, formatDue, schoolDateString, type DueScope } from '../lib/due-dates-core';

const C = {
  dim: '#6272a4',
  text: '#f8f8f2',
  late: '#ff5555',
  today: '#f1fa8c',
  set: '#8be9fd',
  open: '#bd93f9',
  border: '#44475a',
  bg: '#282a36',
};

function colorFor(dueAt: number): string {
  const s = dueStatus(dueAt, null, Date.now());
  return s === 'late' ? C.late : s === 'today' ? C.today : C.set;
}

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
  /** 'due' (default) is advisory; 'open' is the "available after" lock. */
  kind?: 'due' | 'open';
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
  kind = 'due',
}: DueDateChipProps) {
  const due = useTeacherDue();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!due.canEdit || !due.activeClassId) return null;

  const isOpenKind = kind === 'open';
  const noun = isOpenKind ? 'open date' : 'due date';
  const fontSize = size === 'md' ? 13 : 12;
  const stop = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // What the calendar opens on: this row's own date if it has one, otherwise
  // the date it inherits, so a teacher lands in the right month either way.
  const anchorDate = ownAt ?? resolvedAt;

  const commit = (date: string) => {
    setOpen(false);
    // Setting a date on a Mixed module is the "apply to all" gesture — the
    // point of picking one date for a module whose children disagree.
    if (scope === 'module' && mixed && moduleLessonIds) {
      void (isOpenKind
        ? applyModuleOpenDateToAll(scopeId, date, moduleLessonIds)
        : applyModuleDateToAll(scopeId, date, moduleLessonIds));
    } else {
      void (isOpenKind ? setOpenDate(scope, scopeId, date) : setDueDate(scope, scopeId, date));
    }
  };

  // ---- label ----
  let label: string;
  let color: string;
  let italic = false;
  let title: string;

  if (mixed) {
    label = 'Mixed';
    color = C.dim;
    title =
      min !== null && max !== null
        ? `Lessons here ${isOpenKind ? 'open' : 'are due'} between ${formatDue(min)} and ${formatDue(max)} — pick a date to apply one to all of them`
        : `Lessons here have different ${isOpenKind ? 'open' : 'due'} dates`;
  } else if (ownAt !== null) {
    label = formatDue(ownAt);
    color = isOpenKind ? C.open : colorFor(ownAt);
    title = `${isOpenKind ? 'Opens' : 'Due'} date set on this ${scope}. Click to change, x to clear.`;
  } else if (resolvedAt !== null) {
    label = formatDue(resolvedAt);
    color = C.dim;
    italic = true;
    title = `Inherited from the module. Click to give this ${scope} its own ${noun}.`;
  } else {
    label = isOpenKind ? '+ opens' : '+ due';
    color = C.dim;
    title = `Set an ${noun} for this ${scope}`;
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
        {isOpenKind ? (
          <LockKeyhole size={fontSize} strokeWidth={2} />
        ) : (
          <CalendarClock size={fontSize} strokeWidth={2} />
        )}
        {label}
      </button>

      {open && (
        <CalendarPopover
          anchor={btnRef.current}
          value={anchorDate === null ? null : schoolDateString(anchorDate)}
          today={schoolDateString(Date.now())}
          onPick={commit}
          onClear={
            ownAt === null
              ? undefined
              : () => {
                  setOpen(false);
                  void (isOpenKind ? setOpenDate(scope, scopeId, null) : setDueDate(scope, scopeId, null));
                }
          }
          onClose={() => setOpen(false)}
        />
      )}

      {ownAt !== null && (
        <button
          type="button"
          title={
            scope === 'module'
              ? `Clear this module’s ${noun}`
              : `Clear this override and go back to the module’s ${isOpenKind ? 'open date' : 'due date'}`
          }
          disabled={due.saving}
          onClick={(e) => {
            stop(e);
            void (isOpenKind ? setOpenDate(scope, scopeId, null) : setDueDate(scope, scopeId, null));
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
