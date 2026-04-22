'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadCourseProgress } from '../lib/progress';

interface ModuleLesson {
  id: string;
  numberedId: string;
  displayTitle: string;
}

interface Props {
  moduleId: string;
  currentLessonId: string;
  lessons: ModuleLesson[];
}

export default function LessonProgressFooter({ moduleId, currentLessonId, lessons }: Props) {
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const read = () => setDoneSet(new Set(loadCourseProgress().completedLessons));
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'shCode_courseProgress') read();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (lessons.length === 0) return null;
  const idx = lessons.findIndex((l) => l.id === currentLessonId);
  const done = lessons.filter((l) => doneSet.has(l.id)).length;
  const pct = Math.round((done / lessons.length) * 100);

  return (
    <div
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
        {lessons.map((l) => {
          const isCurrent = l.id === currentLessonId;
          const isDone = doneSet.has(l.id);
          const color = isCurrent ? '#ff79c6' : isDone ? '#50fa7b' : '#44475a';
          return (
            <Link
              key={l.id}
              href={`/lesson/${l.id}`}
              title={`${l.numberedId} ${l.displayTitle}${isDone ? ' (complete)' : ''}${isCurrent ? ' (current)' : ''}`}
              aria-label={`${l.numberedId} ${l.displayTitle}`}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: isDone || isCurrent ? color : 'transparent',
                border: `2px solid ${color}`,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
      <span style={{ color: '#6272a4', minWidth: 68, textAlign: 'right' }}>
        {done}/{lessons.length} · {pct}%
      </span>
    </div>
  );
}
