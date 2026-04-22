'use client';

import { useEffect, useState } from 'react';
import { loadCourseProgress } from '../lib/progress';

interface Props {
  moduleId: string;
  lessonIds: string[];
}

export default function ModuleProgressFooter({ moduleId, lessonIds }: Props) {
  const [done, setDone] = useState(0);
  const total = lessonIds.length;

  useEffect(() => {
    const read = () => {
      const set = new Set(loadCourseProgress().completedLessons);
      setDone(lessonIds.filter((id) => set.has(id)).length);
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'shCode_courseProgress') read();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lessonIds]);

  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#21222c',
        borderTop: '1px solid #44475a',
        padding: '10px 20px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        color: '#f8f8f2',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.35)',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#6272a4', minWidth: 80 }}>Module {moduleId}</span>
      <span style={{ fontWeight: 600, minWidth: 170 }}>
        {done} / {total} lessons complete
      </span>
      <div
        style={{
          flex: 1,
          height: 8,
          background: '#282a36',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: allDone
              ? '#50fa7b'
              : 'linear-gradient(90deg, #50fa7b, #8be9fd)',
            transition: 'width 200ms ease',
          }}
        />
      </div>
      <span
        style={{
          color: allDone ? '#50fa7b' : '#8be9fd',
          fontWeight: 600,
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
