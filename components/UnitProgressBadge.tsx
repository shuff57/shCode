'use client';

import { useLessonState } from '../lib/progress';

interface Props {
  lessonIds: string[];
  label?: string;
}

export default function UnitProgressBadge({ lessonIds, label }: Props) {
  const snap = useLessonState();
  const total = lessonIds.length;
  if (total === 0) return null;
  if (!snap.loaded || !snap.authed) return null;

  const done = lessonIds.filter((id) => snap.states[id] === 'completed').length;
  const started = lessonIds.filter((id) => snap.states[id] === 'started').length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <span
      className="inline-flex items-center gap-2"
      style={{ fontSize: 12, whiteSpace: 'nowrap' }}
      title={
        label
          ? `${label}: ${done}/${total} complete (${pct}%)${started ? ` · ${started} in progress` : ''}`
          : undefined
      }
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: 80,
          height: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {started > 0 ? (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              width: `${Math.round(((done + started) / total) * 100)}%`,
              background: '#f1fa8c55',
            }}
          />
        ) : null}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            height: '100%',
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
