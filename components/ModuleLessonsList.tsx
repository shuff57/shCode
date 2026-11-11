'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import type { LessonGroup } from '../lib/lesson-groups';
import { badgeForLesson } from '../lib/lesson-badges';
import { bypassesLessonLock, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';
import { lessonAvailability, resolveDue, resolveModuleSummary, useDueDates, useNow } from '../lib/due-dates';
import DueBadge, { ModuleDueBadge, OpensBadge } from './DueBadge';
import DueClassPicker from './DueClassPicker';
import DueDateChip from './DueDateChip';
import { useCountedLessons } from '../lib/lesson-counted';
import LessonAccessChip from './LessonAccessChip';
import { moduleSummaryForClass, ownDate, resolveForClass, useTeacherDue } from '../lib/due-dates-edit';
import { withAlpha } from '../lib/color-alpha';
import { pickNextLesson } from '../lib/module-next';

interface LessonItem {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string;
  preview?: string;
  estimateMins?: number;
}

const stateStripeColors: Record<string, string> = {
  completed: 'var(--c-green)',
  started: 'var(--c-yellow)',
};

const stateLabels: Record<string, string> = {
  completed: '✓ Done',
  started: 'In progress',
};

export default function ModuleLessonsList({
  lessons,
  moduleId,
  unitId,
  groups,
}: {
  lessons: LessonItem[];
  /** Dotted module id, e.g. "1.1". Omit and lessons can only show their own overrides. */
  moduleId?: string | null;
  /** lesson.json `category`, e.g. "Unit 1: JavaScript Fundamentals". */
  unitId?: string | null;
  /**
   * The module's lesson layer (curriculum/groups/<id>.json). Presentational
   * only: it adds a heading before each lesson's first screen. Locking, due
   * dates and "done" stay per screen, so a group never changes what counts.
   */
  groups?: LessonGroup[] | null;
}) {
  const progress = useLessonState();
  const due = useDueDates();
  const counted = useCountedLessons();
  // One clock for the whole list. Availability is resolved per row with the
  // pure lessonAvailability(), not the hook — a hook inside .map() would be
  // a different number of hooks per render.
  const now = useNow();

  if (lessons.length === 0) {
    return <p style={{ color: 'var(--c-meta)' }}>No lessons yet.</p>;
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
  // The row the module page's Continue button points at (same pick, lib/module-next.ts).
  const nextPick = pickNextLesson(lessons.map((l) => l.id), {
    loaded: progress.loaded,
    state: (id) => progress.states[id],
    isAvailable: (id) => lessonAvailability(due, id, moduleId, unitId, now).available,
    bypass: lockBypass,
  });
  const nextId = nextPick?.kind === 'next' ? nextPick.id : null;

  // Module header summary: one date if every lesson agrees, otherwise "Mixed"
  // with the range it spans. Computed, never stored — see lib/due-dates-core.
  const teacherDue = useTeacherDue();
  const lessonIds = lessons.map((l) => l.id);
  const teacherModuleDue = moduleId ? moduleSummaryForClass(teacherDue, moduleId, lessonIds, unitId) : null;
  const moduleDue = moduleId
    ? resolveModuleSummary(due, moduleId, lessons.map((l) => l.id), unitId)
    : null;

  // A heading goes above the group's first screen that is actually in this
  // list — a screen filtered out by the module's category must not swallow it.
  const groupHeadings = new Map<string, { group: LessonGroup; index: number }>();
  if (groups) {
    groups.forEach((g, i) => {
      const first = g.screens.find((s) => lessons.some((l) => l.id === s));
      if (first) groupHeadings.set(first, { group: g, index: i + 1 });
    });
  }

  return (
    <>
      {(durationLabel || moduleDue || teacherDue.canEdit) && (
        <p style={{ fontSize: 13, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {durationLabel && <span style={{ color: 'var(--c-meta)' }}>Estimated: {durationLabel}</span>}
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
        const isNext = l.id === nextId;
        const stateLabel = stateLabels[lessonState ?? ''] ?? (isNext ? 'Next up' : undefined);
        const lessonDue = resolveDue(due, l.id, moduleId, unitId);
        // Two independent gates — sequence and clock. Either closes the row.
        const availability = lessonAvailability(due, l.id, moduleId, unitId, now);
        const timeLocked = !availability.available && !lockBypass;
        const locked = (progress.loaded && idx > firstUnlocked && !lockBypass) || timeLocked;

        const rowStyle: React.CSSProperties = {
          padding: '10px 14px',
          borderLeft: '4px solid ' + badge.color,
          // A completed row says so with its DONE pill; a green right edge on top of it was a second signal
          // for the same fact (climb4 r6). An in-progress row keeps its yellow edge.
          borderRight: '2px solid ' + (lessonState === 'completed' ? 'var(--border)' : stripeColor),
          textDecoration: 'none',
          color: 'var(--text)',
          opacity: locked ? 0.5 : 1,
          cursor: locked ? 'not-allowed' : undefined,
        };

        const inner = (
          <>
            <span className="mod-row-title" style={{ fontWeight: 500 }}><span className="mod-row-num" style={{ color: 'var(--c-meta)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{l.numberedId}</span>{' '}<span>{l.displayTitle}</span></span>
            <span className="mod-row-details">
            <span
              className="mod-row-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: badge.color,
                background: withAlpha(badge.color, '22'),
                border: '1px solid ' + withAlpha(badge.color, '55'),
                borderRadius: 999,
                padding: '3px 10px',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <badge.Icon size={12} strokeWidth={2.25} />
              {badge.label}
            </span>
            <span className="mod-row-meta">
            <span className="mod-row-state">
            {locked ? (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--muted-fg, var(--x-94a3b8))',
                  background: 'color-mix(in srgb, var(--x-94a3b8) 15.0%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--x-94a3b8) 35.0%, transparent)',
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
                className={lessonState === 'completed' ? 'mod-row-done' : isNext ? 'mod-row-next-label' : undefined}
                style={{
                  fontSize: 12,
                  color: isNext && !lessonState ? 'var(--c-cyan)' : stripeColor,
                  background: withAlpha(isNext && !lessonState ? 'var(--c-cyan)' : stripeColor, '22'),
                  border: '1px solid ' + withAlpha(isNext && !lessonState ? 'var(--c-cyan)' : stripeColor, '55'),
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
            </span>
            <DueBadge
              dueAt={lessonDue?.dueAt ?? null}
              completed={lessonState === 'completed'}
              counted={counted?.get(l.id) === true}
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
              <span className="mod-row-duration" style={{ color: 'var(--c-meta)', fontSize: 13 }}>~{l.estimateMins} min</span>
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
            </span>
            </span>
            {!locked && <span className="mod-row-chevron" aria-hidden="true">›</span>}
          </>
        );

        const heading = groupHeadings.get(l.id);
        const minutes = heading
          ? heading.group.screens.reduce(
              (sum, s) => sum + (lessons.find((x) => x.id === s)?.estimateMins ?? 0),
              0,
            )
          : 0;

        return (
          <Fragment key={l.id}>
          {heading && (
            <li
              style={{
                listStyle: 'none',
                margin: idx === 0 ? '0 0 10px' : '22px 0 10px',
                padding: '0 4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--c-purple)',
                  }}
                >
                  Lesson {heading.index} of {groups?.length}
                </span>
                <span style={{ fontWeight: 650, fontSize: 15 }}>{heading.group.title}</span>
                <span style={{ fontSize: 13, color: 'var(--c-meta)' }}>
                  {heading.group.screens.length} screen{heading.group.screens.length === 1 ? '' : 's'}
                  {minutes > 0 ? ` · ~${minutes} min` : ''}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-meta)', lineHeight: 1.45 }}>
                {heading.group.objective}
              </p>
            </li>
          )}
          <li style={{ marginBottom: 8 }}>
            {locked ? (
              <div
                className="mod-row bg-card border-border border rounded block"
                style={rowStyle}
                aria-disabled="true"
              >
                {inner}
              </div>
            ) : (
              <Link
                href={href}
                className={`mod-row bg-card border-border border rounded block hover:bg-muted shadow-lg${isNext ? ' is-next' : ''}`}
                style={rowStyle}
                aria-current={isNext ? 'step' : undefined}
              >
                {inner}
              </Link>
            )}
          </li>
          </Fragment>
        );
      })}
    </ol>
    </>
  );
}
