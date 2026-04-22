'use client';

import { useEffect, useState } from 'react';
import { loadCourseProgress } from '../lib/progress';

interface Props {
  lessonIds: string[];
  label?: string;
}

export default function UnitProgressBadge({ lessonIds, label }: Props) {
  const [done, setDone] = useState(0);

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

  const total = lessonIds.length;
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <span
      className="inline-flex items-center gap-2"
      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
      title={label ? `${label}: ${done}/${total} complete (${pct}%)` : undefined}
    >
      <span
        style={{
          display: 'inline-block',
          width: 80,
          height: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${pct}%`,
            background: allDone ? '#50fa7b' : '#8be9fd',
            transition: 'width 200ms ease',
          }}
        />
      </span>
      <span style={{ color: allDone ? '#50fa7b' : 'inherit', fontWeight: 600 }}>
        {done}/{total}
      </span>
    </span>
  );
}
