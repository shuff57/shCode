'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { bypassesLessonLock, recordLessonStarted, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';

interface ModuleLesson {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string | null;
}

interface Props {
  moduleId: string;
  currentLessonId: string;
  lessons: ModuleLesson[];
}

export default function LessonProgressFooter({ moduleId, currentLessonId, lessons }: Props) {
  const snap = useLessonState();

  // Auto-mark this lesson as "started" on mount. The helper short-circuits
  // if unauthed or already started/completed, so this is safe to call
  // on every mount.
  useEffect(() => {
    recordLessonStarted(currentLessonId);
  }, [currentLessonId]);

  if (lessons.length === 0) return null;
  const idx = lessons.findIndex((l) => l.id === currentLessonId);
  const done = lessons.filter((l) => snap.states[l.id] === 'completed').length;
  const pct = Math.round((done / lessons.length) * 100);

  // Linear progression: a dot is clickable iff every prior lesson is
  // completed. Unauthed (snap.loaded === false on the server) defaults
  // to "all unlocked" until state loads — avoids hydration churn.
  // Admins and teachers bypass the gate entirely.
  const firstUnlocked = (() => {
    if (!snap.loaded) return lessons.length;
    for (let i = 0; i < lessons.length; i++) {
      if (snap.states[lessons[i].id] !== 'completed') return i;
    }
    return lessons.length;
  })();
  const lockBypass = bypassesLessonLock(snap.role);

  return (
    <div
      className="lesson-progress-footer"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#21222c',
        borderTop: '1px solid #44475a',
        padding: '8px 16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#f8f8f2',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.35)',
        fontSize: 12,
      }}
    >
      <Link
        href={`/module/${moduleId}`}
        prefetch={false}
        style={{
          color: '#8be9fd',
          textDecoration: 'none',
          fontWeight: 600,
          minWidth: 80,
        }}
      >
        Module {moduleId}
      </Link>
      <span style={{ color: '#6272a4', minWidth: 96 }}>
        {idx >= 0 ? `Lesson ${idx + 1} of ${lessons.length}` : `${lessons.length} lessons`}
      </span>
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        {lessons.map((l, i) => {
          const isCurrent = l.id === currentLessonId;
          const state = snap.states[l.id];
          const isDone = state === 'completed';
          const isStarted = state === 'started';
          const isLocked = i > firstUnlocked && !isCurrent && !lockBypass;
          const borderColor = isDone
            ? '#50fa7b'
            : isStarted
            ? '#f1fa8c'
            : isLocked
            ? '#2a2d3a'
            : '#44475a';
          const background = isCurrent
            ? '#ff79c6'
            : isDone
            ? '#50fa7b'
            : 'transparent';
          const dotStyle: React.CSSProperties = {
            width: 14,
            height: 14,
            borderRadius: '50%',
            background,
            border: `2px solid ${borderColor}`,
            flexShrink: 0,
            opacity: isLocked ? 0.4 : 1,
            cursor: isLocked ? 'not-allowed' : undefined,
          };
          const titleText = `${l.numberedId} ${l.displayTitle}${isDone ? ' (complete)' : isStarted ? ' (in progress)' : ''}${isCurrent ? ' (current)' : ''}${isLocked ? ' (locked — get a green to unlock)' : ''}`;
          return isLocked ? (
            <span
              key={l.id}
              title={titleText}
              aria-label={`${l.numberedId} ${l.displayTitle} (locked)`}
              aria-disabled="true"
              style={dotStyle}
            />
          ) : (
            <Link
              key={l.id}
              href={lessonHref(l)}
              title={titleText}
              aria-label={`${l.numberedId} ${l.displayTitle}`}
              style={dotStyle}
            />
          );
        })}
      </div>
      {snap.loaded && !snap.authed ? (
        <span style={{ color: '#6272a4' }}>
          <span style={{ color: '#8be9fd' }}>Sign in</span> to save progress
        </span>
      ) : (
        <span style={{ color: '#6272a4', minWidth: 68, textAlign: 'right' }}>
          {done}/{lessons.length} · {pct}%
        </span>
      )}
    </div>
  );
}
