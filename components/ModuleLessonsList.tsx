'use client';

import Link from 'next/link';
import { badgeForLesson } from '../lib/lesson-badges';
import { bypassesLessonLock, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';
import { lessonAvailability, resolveDue, resolveModuleSummary, useDueDates, useNow } from '../lib/due-dates';
import DueBadge, { ModuleDueBadge, OpensBadge } from './DueBadge';
import DueClassPicker from './DueClassPicker';
import DueDateChip from './DueDateChip';
import LessonAccessChip from './LessonAccessChip';
import { moduleSummaryForClass, ownDate, resolveForClass, useTeacherDue } from '../lib/due-dates-edit';

interface LessonItem {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string;
  preview?: string;
  estimateMins?: number;
}

const stateStripeColors: Record<string, string> = {
  completed: '#50fa7b',
  started: '#f1fa8c',
};

const stateLabels: Record<string, string> = {
  completed: 'Done',
  started: 'In progress',
};

export default function ModuleLessonsList({
  lessons,
  moduleId,
  unitId,
}: {
  lessons: LessonItem[];
  /** Dotted module id, e.g. "1.1". Omit and lessons can only show their own overrides. */
  moduleId?: string | null;
  /** lesson.json `category`, e.g. "Unit 1: JavaScript Fundamentals". */
  unitId?: string | null;
}) {
  const progress = useLessonState();
  const due = useDueDates();
  // One clock for the whole list. Availability is resolved per row with the
  // pure lessonAvailability(), not the hook — a hook inside .map() would be
  // a different number of hooks per render.
  const now = useNow();

  if (lessons.length === 0) {
    return <p style={{ opacity: 0.6 }}>No lessons yet.</p>;
  }

  const totalMins = lessons.reduce((sum, l) => sum + (l.estimateMins ?? 0), 0);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const durationLabel =
    totalMins <= 0 ? null
    : hrs === 0 ? `~${mins} min`
    : mins === 0 ? `~${hrs} hr`
    : `~${hrs} hr ${mins} min`;

  // Lessons advance linearly: get a green on the current lesson before
  // unlocking the next. A lesson at index j is unlocked iff every prior
  // lesson is 'completed'. Unauthed students see locks too — the progress
  // footer already prompts sign-in. Admins and teachers bypass the gate.
  const completed = (id: string) => progress.states[id] === 'completed';
  const firstUnlocked = (() => {
    for (let i = 0; i < lessons.length; i++) {
      if (!completed(lessons[i].id)) return i;
    }
    return lessons.length; // all done
  })();
  const lockBypass = bypassesLessonLock(progress.role);

  // Module header summary: one date if every lesson agrees, otherwise "Mixed"
  // with the range it spans. Computed, never stored — see lib/due-dates-core.
  const teacherDue = useTeacherDue();
  const lessonIds = lessons.map((l) => l.id);
  const teacherModuleDue = moduleId ? moduleSummaryForClass(teacherDue, moduleId, lessonIds, unitId) : null;
  const moduleDue = moduleId
    ? resolveModuleSummary(due, moduleId, lessons.map((l) => l.id), unitId)
    : null;

  return (
    <>
      {(durationLabel || moduleDue || teacherDue.canEdit) && (
        <p style={{ fontSize: 13, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {durationLabel && <span style={{ opacity: 0.5 }}>Estimated: {durationLabel}</span>}
          {moduleDue && (
            <ModuleDueBadge
              kind={moduleDue.kind}
              dueAt={moduleDue.dueAt}
              min={moduleDue.min}
              max={moduleDue.max}
            />
          )}
          {/* Teacher-only: the class this module's dates belong to, and the
              module's own date. Both render null for a student. */}
          <DueClassPicker />
          {moduleId && teacherModuleDue && (
            <DueDateChip
              scope="module"
              scopeId={moduleId}
              resolvedAt={teacherModuleDue.ownDueAt ?? teacherModuleDue.dueAt}
              ownAt={ownDate(teacherDue, 'module', moduleId)}
              mixed={teacherModuleDue.kind === 'mixed'}
              min={teacherModuleDue.min}
              max={teacherModuleDue.max}
              moduleLessonIds={lessonIds}
              size="md"
            />
          )}
        </p>
      )}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {lessons.map((l, idx) => {
        const badge = badgeForLesson({ type: l.type, preview: l.preview });
        const href = lessonHref(l);
        const lessonState = progress.states[l.id];
        const stripeColor = stateStripeColors[lessonState ?? ''] ?? 'var(--border)';
        const stateLabel = stateLabels[lessonState ?? ''];
        const lessonDue = resolveDue(due, l.id, moduleId, unitId);
        // Two independent gates — sequence and clock. Either closes the row.
        const availability = lessonAvailability(due, l.id, moduleId, unitId, now);
        const timeLocked = !availability.available && !lockBypass;
        const locked = (progress.loaded && idx > firstUnlocked && !lockBypass) || timeLocked;

        const rowStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderLeft: '4px solid ' + badge.color,
          borderRight: '4px solid ' + stripeColor,
          textDecoration: 'none',
          color: 'var(--text)',
          opacity: locked ? 0.5 : 1,
          cursor: locked ? 'not-allowed' : undefined,
        };

        const inner = (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: badge.color,
                background: badge.color + '22',
                border: '1px solid ' + badge.color + '55',
                borderRadius: 999,
                padding: '3px 10px',
                minWidth: 140,
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <badge.Icon size={12} strokeWidth={2.25} />
              {badge.label}
            </span>
            <span style={{ opacity: 0.5, fontFamily: 'monospace', minWidth: 50 }}>
              {l.numberedId}
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>{l.displayTitle}</span>
            {locked ? (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted-fg, #94a3b8)',
                  background: 'rgba(148,163,184,0.15)',
                  border: '1px solid rgba(148,163,184,0.35)',
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
                aria-label={timeLocked ? 'Not available yet' : 'Locked'}
                title={
                  timeLocked
                    ? 'Your teacher set this lesson to open later — the date is on this row.'
                    : 'Get a green on the lesson above before this one unlocks'
                }
              >
                {timeLocked ? '🔒 Not yet' : '🔒 Locked'}
              </span>
            ) : stateLabel ? (
              <span
                style={{
                  fontSize: 11,
                  color: stripeColor,
                  background: stripeColor + '22',
                  border: '1px solid ' + stripeColor + '55',
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {stateLabel}
              </span>
            ) : null}
            <DueBadge
              dueAt={lessonDue?.dueAt ?? null}
              completed={lessonState === 'completed'}
              className={lessonDue?.className}
              ambiguous={lessonDue?.ambiguous}
            />
            <OpensBadge
              openAt={availability.openAt}
              available={availability.available || lockBypass}
              className={availability.className}
              ambiguous={availability.ambiguous}
            />
            {l.estimateMins ? (
              <span style={{ opacity: 0.5, fontSize: 12 }}>~{l.estimateMins} min</span>
            ) : null}
            <DueDateChip
              scope="lesson"
              scopeId={l.id}
              resolvedAt={resolveForClass(teacherDue, l.id, moduleId, unitId)}
              ownAt={ownDate(teacherDue, 'lesson', l.id)}
              pushRight
            />
            {/* Same roster-checkbox controls as the home-page card and the
                Due Dates panel — this list is the third and last place a
                teacher edits a lesson's dates, so it gets the same pair. */}
            {teacherDue.canEdit && teacherDue.activeClassId && (
              <>
                <LessonAccessChip
                  classId={teacherDue.activeClassId}
                  lessonId={l.id}
                  lessonTitle={l.displayTitle}
                  kind="early"
                />
                <LessonAccessChip
                  classId={teacherDue.activeClassId}
                  lessonId={l.id}
                  lessonTitle={l.displayTitle}
                  kind="late"
                />
              </>
            )}
          </>
        );

        return (
          <li key={l.id} style={{ marginBottom: 8 }}>
            {locked ? (
              <div
                className="bg-card border-border border rounded block"
                style={rowStyle}
                aria-disabled="true"
              >
                {inner}
              </div>
            ) : (
              <Link
                href={href}
                className="bg-card border-border border rounded block hover:bg-muted shadow-lg"
                style={rowStyle}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
    </>
  );
}
