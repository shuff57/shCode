'use client';

// The one due-date badge. Sits inline in every list that renders a lesson,
// and on the module page header.
//
// A completed lesson renders NOTHING, even if it was finished after the due
// date: the course is mastery-based with no points, so a student who is done
// has nothing left to act on. Late-ness after the fact is the teacher's view,
// not the student's — see the needs-attention endpoint.

import { CalendarClock, LockKeyhole } from 'lucide-react';
import { dueStatus, formatDue, formatDueTime, type DueStatus } from '../lib/due-dates';

const STYLES: Record<Exclude<DueStatus, 'none' | 'done' | 'done-late'>, { color: string; prefix: string }> = {
  upcoming: { color: '#6272a4', prefix: 'Due ' },
  today:    { color: '#f1fa8c', prefix: 'Due today · ' },
  late:     { color: '#ff5555', prefix: 'Late · was due ' },
};

export interface DueBadgeProps {
  dueAt: number | null;
  /** Completed lessons show no badge at all. */
  completed?: boolean;
  /** Shown after the date when the student is in more than one dated class. */
  className?: string;
  ambiguous?: boolean;
  size?: 'sm' | 'md';
}

export default function DueBadge({
  dueAt,
  completed = false,
  className,
  ambiguous = false,
  size = 'sm',
}: DueBadgeProps) {
  if (dueAt === null || completed) return null;

  const status = dueStatus(dueAt, null, Date.now());
  if (status === 'none' || status === 'done' || status === 'done-late') return null;

  const style = STYLES[status];
  const label = `${style.prefix}${formatDue(dueAt)}`;
  const fontSize = size === 'md' ? 13 : 12;

  return (
    <span
      title={ambiguous && className ? `Earliest due date across your classes (${className})` : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: style.color,
        fontSize,
        whiteSpace: 'nowrap',
        fontWeight: status === 'late' ? 600 : 400,
      }}
    >
      <CalendarClock size={fontSize} strokeWidth={2} />
      {label}
      {ambiguous && className ? <span style={{ opacity: 0.7 }}>· {className}</span> : null}
    </span>
  );
}

// "Opens Mon Sep 8 · 8:00 AM" — the counterpart of DueBadge for a lesson the
// "available after" gate is still holding shut.
//
// This one carries the time, where DueBadge does not: a due date is a whole
// school day and a student plans around the day, but an open time is the
// exact moment a locked card becomes clickable, and "opens Monday" with no
// hour is the question a student asks the second they read it.
//
// Renders nothing once the lesson is open. There is no lingering "opened
// Tuesday" state — a lesson you can work on has nothing left to say.
export function OpensBadge({
  openAt,
  available,
  className,
  ambiguous = false,
  size = 'sm',
}: {
  openAt: number | null;
  available: boolean;
  className?: string;
  ambiguous?: boolean;
  size?: 'sm' | 'md';
}) {
  if (openAt === null || available) return null;
  const fontSize = size === 'md' ? 13 : 12;

  return (
    <span
      title={
        ambiguous && className
          ? `Earliest open date across your classes (${className})`
          : 'Your teacher set this lesson to open later.'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: '#bd93f9',
        fontSize,
        whiteSpace: 'nowrap',
        fontWeight: 600,
      }}
    >
      <LockKeyhole size={fontSize} strokeWidth={2} />
      Opens {formatDueTime(openAt)}
      {ambiguous && className ? <span style={{ opacity: 0.7 }}>· {className}</span> : null}
    </span>
  );
}

// Module header variant: one date, or "Mixed" with the range it spans.
export function ModuleDueBadge({
  kind,
  dueAt,
  min,
  max,
  size = 'md',
}: {
  kind: 'none' | 'single' | 'mixed';
  dueAt: number | null;
  min: number | null;
  max: number | null;
  size?: 'sm' | 'md';
}) {
  if (kind === 'none') return null;
  const fontSize = size === 'md' ? 13 : 12;

  if (kind === 'single' && dueAt !== null) {
    const status = dueStatus(dueAt, null, Date.now());
    const color = status === 'late' ? '#ff5555' : status === 'today' ? '#f1fa8c' : '#6272a4';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontSize, whiteSpace: 'nowrap' }}>
        <CalendarClock size={fontSize} strokeWidth={2} />
        Due {formatDue(dueAt)}
      </span>
    );
  }

  const range = min !== null && max !== null ? `${formatDue(min)} – ${formatDue(max)}` : '';
  return (
    <span
      title={range ? `Lessons in this module are due between ${range}` : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6272a4', fontSize, whiteSpace: 'nowrap' }}
    >
      <CalendarClock size={fontSize} strokeWidth={2} />
      Mixed{range ? ` · ${range}` : ''}
    </span>
  );
}
