'use client';

import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeForLesson } from '../lib/lesson-badges';
import { bypassesLessonLock, useLessonState } from '../lib/progress';

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
  const isAssignment = type === 'assignment' || type === 'project';
  const href = isAssignment ? `/assignment/${lesson.id}` : `/lesson/${lesson.id}`;
  const pBadge = badgeForLesson({ type: lesson.type, preview: lesson.preview });
  const progress = useLessonState();
  const lessonState = progress.states[lesson.id];
  const stripeColor = stateStripeColors[lessonState ?? ''] ?? 'var(--border)';
  // Lock = caller flagged it AND the viewer isn't an admin/teacher. Default
  // to unlocked until the snapshot loads to avoid first-paint flicker.
  const locked = progress.loaded && lockedForStudent && !bypassesLessonLock(progress.role);

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
            aria-label="Locked"
            title="Open the module to start with the first lesson, then continue from there."
          >
            🔒 Locked
          </span>
        )}
      </div>
      <p className="text-med text-text/70">{lesson.description}</p>
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
