'use client';

import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeForLesson } from '../lib/lesson-badges';
import { bypassesLessonLock, useLessonState } from '../lib/progress';
import { withInlineCode } from './InlineCode';
import { lessonHref } from '../lib/lesson-href';
import { moduleIdFromTitle, resolveDue, useDueDates, useLessonAvailability } from '../lib/due-dates';
import DueBadge, { OpensBadge } from './DueBadge';
import DueDateChip from './DueDateChip';
import { ownDate, resolveForClass, useTeacherDue } from '../lib/due-dates-edit';

const typeBadgeColors: Record<string, string> = {
  lesson: '#5baafd',
  assignment: '#f59e0b',
  project: '#10b981',
  example: '#a78bfa',
};

// Right-edge stripe colors signal per-lesson progress state.
const stateStripeColors: Record<string, string> = {
  completed: '#50fa7b',
  started: '#f1fa8c',
};

interface Props {
  lesson: Lesson;
  // Home page passes `true` for every lesson except the first one in its
  // module. Students see it as locked; admins/teachers bypass.
  lockedForStudent?: boolean;
}

export default function LessonCard({ lesson, lockedForStudent = false }: Props) {
  const type = lesson.type || 'lesson';
  const href = lessonHref(lesson);
  const pBadge = badgeForLesson({ type: lesson.type, preview: lesson.preview });
  const progress = useLessonState();
  const due = useDueDates();
  const teacherDue = useTeacherDue();
  const lessonState = progress.states[lesson.id];
  const stripeColor = stateStripeColors[lessonState ?? ''] ?? 'var(--border)';
  // The card only has the lesson itself, so its module comes off the numbered
  // title prefix — "1.1.4 What a Program Is" -> "1.1".
  const moduleId = moduleIdFromTitle(lesson.title);
  const lessonDue = resolveDue(due, lesson.id, moduleId, lesson.category ?? null);
  const availability = useLessonAvailability(lesson.id, moduleId, lesson.category ?? null);
  const bypass = bypassesLessonLock(progress.role);
  // Two independent gates, and either one closes the card:
  //   sequence — caller flagged it (prior lesson not green)
  //   clock    — the teacher's "available after" time hasn't arrived
  // Both default to unlocked until their snapshot loads, to avoid a
  // first-paint flicker. Admins and teachers bypass both.
  const timeLocked = !availability.available && !bypass;
  const locked = (progress.loaded && lockedForStudent && !bypass) || timeLocked;

  const cardStyle: React.CSSProperties = {
    borderLeftColor: pBadge?.color ?? typeBadgeColors[type] ?? 'var(--brand)',
    borderRightColor: stripeColor,
    opacity: locked ? 0.5 : 1,
    cursor: locked ? 'not-allowed' : undefined,
  };

  const inner = (
    <>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {pBadge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: pBadge.color + '22',
              color: pBadge.color,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid ' + pBadge.color + '55',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <pBadge.Icon size={12} strokeWidth={2.25} />
            {pBadge.label}
          </span>
        )}
        <h3 className="font-semibold text-text">{lesson.title}</h3>
        {!pBadge && (
          <span
            className="lesson-type-badge"
            style={{ backgroundColor: typeBadgeColors[type] || 'var(--brand)' }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        )}
        {lesson.week && (
          <span className="lesson-week-badge">Week {lesson.week}</span>
        )}
        <DueBadge
          dueAt={lessonDue?.dueAt ?? null}
          completed={lessonState === 'completed'}
          className={lessonDue?.className}
          ambiguous={lessonDue?.ambiguous}
        />
        <OpensBadge
          openAt={availability.openAt}
          available={availability.available || bypass}
          className={availability.className}
          ambiguous={availability.ambiguous}
        />
        {/* Teacher only, and pushed to the right edge of the card. Renders
            null for a student, so it costs no layout there. */}
        <DueDateChip
          scope="lesson"
          scopeId={lesson.id}
          resolvedAt={resolveForClass(teacherDue, lesson.id, moduleId, lesson.category ?? null)}
          ownAt={ownDate(teacherDue, 'lesson', lesson.id)}
          pushRight
        />
        {locked && (
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
              marginLeft: 'auto',
            }}
            aria-label={timeLocked ? 'Not available yet' : 'Locked'}
            title={
              timeLocked
                ? 'Your teacher set this lesson to open later — the date is on the card.'
                : 'Open the module to start with the first lesson, then continue from there.'
            }
          >
            {timeLocked ? '🔒 Not yet' : '🔒 Locked'}
          </span>
        )}
      </div>
      {/* Worked examples ship without a description by convention (all 66 of
          them), and an unconditional <p> gave every one of those cards an empty
          paragraph's worth of height. */}
      {lesson.description?.trim() && (
        <p className="text-med text-text/70">{withInlineCode(lesson.description)}</p>
      )}
    </>
  );

  if (locked) {
    return (
      <div
        className="bg-card border-border border rounded p-4 block border-l-4 border-r-4 shadow-lg"
        style={cardStyle}
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="bg-card border-border border rounded p-4 hover:bg-muted block border-l-4 border-r-4 shadow-lg"
      style={cardStyle}
    >
      {inner}
    </Link>
  );
}
