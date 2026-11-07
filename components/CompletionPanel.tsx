'use client';

import { CircleCheck, Circle } from 'lucide-react';
import {
  recordLessonCompleted,
  resetLessonState,
  useLessonState,
} from '../lib/progress';
import { navigateToNextLesson } from '../lib/lesson-neighbors';

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

  const verb = TYPE_VERB[lessonType] ?? 'finished this lesson';
  const title = 'Mark as complete';
  const fullDescription = description ?? `Confirm you've ${verb}.`;

  async function toggle() {
    if (complete) {
      resetLessonState(lessonId);
    } else {
      // Await the server roundtrip so the next page's access gate sees this
      // lesson as completed when it loads.
      await recordLessonCompleted(lessonId, 1);
      navigateToNextLesson(lessonId);
    }
  }

  if (!snap.loaded) return null;

  return (
    <section
      style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '2px solid var(--c-line)',
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 12, color: 'var(--c-fg)' }}>
        Mark complete to continue
      </h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          color: 'var(--x-aaaaaa)',
          fontSize: 14,
        }}
        aria-live="polite"
      >
        <span>{complete ? 'Complete — next lesson is unlocked' : 'Not complete yet'}</span>
        <button
          onClick={toggle}
          disabled={!snap.authed}
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
        <p style={{ fontSize: 14, color: 'var(--x-aaaaaa)', marginTop: 0, marginBottom: 8 }}>{fullDescription}</p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: complete ? 'var(--c-green)' : 'var(--c-comment)',
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
