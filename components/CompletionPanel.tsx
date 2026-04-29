'use client';

import { CircleCheck, Circle } from 'lucide-react';
import {
  recordLessonCompleted,
  resetLessonState,
  useLessonState,
} from '../lib/progress';

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

  function toggle() {
    if (complete) {
      resetLessonState(lessonId);
    } else {
      recordLessonCompleted(lessonId, 1);
    }
  }

  if (!snap.loaded) return null;

  return (
    <section
      style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '2px solid #44475a',
      }}
    >
      <h2 style={{ fontSize: 20, marginBottom: 12, color: '#f8f8f2' }}>
        Mark complete to continue
      </h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          color: '#aaa',
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
            background: complete ? '#44475a' : '#50fa7b',
            color: complete ? '#f8f8f2' : '#282a36',
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
          background: '#282a36',
          border: complete ? '1px solid #50fa7b55' : '1px solid #44475a',
        }}
      >
        <h3 style={{ fontSize: 18, color: '#f8f8f2', marginTop: 0, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#aaa', marginTop: 0, marginBottom: 8 }}>{fullDescription}</p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: complete ? '#50fa7b' : '#6272a4',
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
