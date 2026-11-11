'use client';

import { useState } from 'react';
import { CircleCheck, Circle } from 'lucide-react';
import {
  recordLessonCompleted,
  resetLessonState,
  useLessonState,
} from '../lib/progress';
import LessonOutcome from './LessonOutcome';

interface Props {
  lessonId: string;
  lessonType: string; // preview field — 'reading', 'video', etc.
  description?: string;
}

const TYPE_VERB: Record<string, string> = {
  reading:    'read the material',
  video:      'watched the video',
  example:    'reviewed the worked example',
  challenge:  'tried at least one challenge',
  assignment: 'finished the assignment',
  slides:     'worked through the slide deck',
};

export default function CompletionPanel({ lessonId, lessonType, description }: Props) {
  const snap = useLessonState();
  const complete = snap.states[lessonId] === 'completed';
  // Bumped when the student marks it complete HERE, which moves focus to Next. A return visit
  // shows the same block without stealing focus. Marking complete no longer walks the student
  // away (ux1 B1): they see it worked, then choose Next.
  const [justDone, setJustDone] = useState(0);
  const [busy, setBusy] = useState(false);

  const verb = TYPE_VERB[lessonType] ?? 'finished this lesson';
  const title = 'Mark as complete';
  const fullDescription = description ?? `Confirm you've ${verb}.`;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (complete) {
        await resetLessonState(lessonId);
        setJustDone(0);
      } else {
        // Await the server roundtrip so the next page's access gate sees this
        // lesson as completed when the student follows Next.
        await recordLessonCompleted(lessonId, 1);
        setJustDone(Date.now());
      }
    } finally {
      setBusy(false);
    }
  }

  if (!snap.loaded) return null;
  if (complete) return (
    <LessonOutcome
      lessonId={lessonId}
      title="Lesson complete"
      detail="It counts toward your progress. The next lesson is unlocked."
      focusKey={justDone || null}
      extra={
        <button type="button" className="lesson-outcome-undo" onClick={toggle} disabled={!snap.authed || busy}>
          Undo
        </button>
      }
    />
  );

  return (
    <section
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: '2px solid var(--c-line)',
      }}
    >
      <h2 style={{ fontSize: 18, marginBottom: 12, color: 'var(--c-fg)' }}>
        Mark complete to continue
      </h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          color: 'var(--c-meta)',
          fontSize: 14,
        }}
        aria-live="polite"
      >
        <span>{complete ? 'Complete — next lesson is unlocked' : 'Not complete yet'}</span>
        <button
          onClick={toggle}
          disabled={!snap.authed || busy}
          title={snap.authed ? undefined : 'Sign in to track progress'}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            fontWeight: 600,
            cursor: snap.authed ? 'pointer' : 'not-allowed',
            opacity: snap.authed ? 1 : 0.5,
            background: complete ? 'var(--c-line)' : 'var(--c-green)',
            color: complete ? 'var(--c-fg)' : 'var(--c-bg)',
          }}
        >
          {complete ? '↺ Undo complete' : '✓ Mark as complete'}
        </button>
      </div>

      <div
        className="requirement"
        style={{
          padding: 16,
          borderRadius: 8,
          background: 'var(--c-bg)',
          border: complete ? '1px solid color-mix(in srgb, var(--c-green) 33.3333%, transparent)' : '1px solid var(--c-line)',
        }}
      >
        <h3 style={{ fontSize: 18, color: 'var(--c-fg)', marginTop: 0, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--c-meta)', marginTop: 0, marginBottom: 8 }}>{fullDescription}</p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: complete ? 'var(--c-green)' : 'var(--c-dim)',
          }}
        >
          {complete ? (
            <>
              <CircleCheck size={18} />
              <span>Complete</span>
            </>
          ) : (
            <>
              <Circle size={18} />
              <span>Pending</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
