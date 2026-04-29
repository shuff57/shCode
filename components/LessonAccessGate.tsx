'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { bypassesLessonLock, useLessonState } from '../lib/progress';

interface Props {
  currentLessonId: string;
  siblings: string[]; // ordered lesson ids in the same module
  moduleId: string | null;
  children: ReactNode;
}

// Wraps the lesson/assignment workspace and refuses to render it for a
// student who hasn't earned access (every prior lesson in the module
// must be `completed`). Static-export-friendly: the page HTML is the
// same, but the gate's render path swaps the workspace tree for a
// "Locked" panel before the workspace ever instantiates.
export default function LessonAccessGate({
  currentLessonId,
  siblings,
  moduleId,
  children,
}: Props) {
  const snap = useLessonState();
  const idx = siblings.findIndex((id) => id === currentLessonId);

  // Lessons outside any module (idx === -1) or the first-in-module
  // (idx === 0) are always accessible. Matches the home-screen rule.
  if (idx <= 0) return <>{children}</>;

  // Until the snapshot loads we don't know role or completion state.
  // Show a non-content placeholder so we don't briefly flash a locked
  // lesson's body before the gate kicks in.
  if (!snap.loaded) {
    return (
      <div
        style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          color: '#6272a4',
          fontSize: '0.95rem',
        }}
      >
        Checking access…
      </div>
    );
  }

  if (bypassesLessonLock(snap.role)) return <>{children}</>;

  const allPriorComplete = siblings
    .slice(0, idx)
    .every((id) => snap.states[id] === 'completed');
  if (allPriorComplete) return <>{children}</>;

  return (
    <div
      style={{
        padding: '2.5rem',
        maxWidth: 560,
        margin: '4rem auto',
        background: '#21222c',
        border: '1px solid #44475a',
        borderRadius: 10,
        textAlign: 'center',
        color: '#f8f8f2',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: '0.75rem' }} aria-hidden>
        🔒
      </div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Lesson locked
      </h1>
      <p style={{ color: '#bdbdce', marginBottom: '1.75rem', lineHeight: 1.5 }}>
        Finish the prior lessons in this module to unlock this one.
        {!snap.authed && (
          <>
            {' '}
            <span style={{ color: '#8be9fd' }}>Sign in</span> to track your progress.
          </>
        )}
      </p>
      {moduleId ? (
        <Link
          href={`/module/${moduleId}`}
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.2rem',
            background: '#bd93f9',
            color: '#282a36',
            borderRadius: 4,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to module {moduleId}
        </Link>
      ) : (
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.2rem',
            background: '#bd93f9',
            color: '#282a36',
            borderRadius: 4,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to home
        </Link>
      )}
    </div>
  );
}
