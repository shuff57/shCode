'use client';

import { useLessonState } from '../lib/progress';

interface Props {
  moduleId: string;
  lessonIds: string[];
}

export default function ModuleProgressFooter({ moduleId, lessonIds }: Props) {
  const snap = useLessonState();
  const total = lessonIds.length;
  if (total === 0) return null;

  const done = lessonIds.filter((id) => snap.states[id] === 'completed').length;
  const started = lessonIds.filter((id) => snap.states[id] === 'started').length;
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
      {snap.loaded && !snap.authed ? (
        <span style={{ color: '#6272a4', flex: 1 }}>
          <span style={{ color: '#8be9fd' }}>Sign in</span> to track progress
          <span style={{ marginLeft: 12, color: '#44475a' }}>
            {total} lesson{total === 1 ? '' : 's'} in this module
          </span>
        </span>
      ) : (
        <>
          <span style={{ fontWeight: 600, minWidth: 200 }}>
            {done} / {total} complete
            {started > 0 ? (
              <span style={{ color: '#f1fa8c', marginLeft: 8, fontWeight: 400 }}>
                · {started} in progress
              </span>
            ) : null}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: '#282a36',
              borderRadius: 4,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {started > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${Math.round(((done + started) / total) * 100)}%`,
                  background: '#f1fa8c55',
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${pct}%`,
                height: '100%',
                background: allDone ? '#50fa7b' : 'linear-gradient(90deg, #50fa7b, #8be9fd)',
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
        </>
      )}
    </div>
  );
}
