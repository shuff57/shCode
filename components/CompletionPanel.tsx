'use client';

import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
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

  // One action, said once (ux2 S4): what finishes the lesson, and the button that does it. It used to
  // stack a heading, a button and a card that all read "Mark (as) complete", and the card looked
  // like a second thing to press.
  return (
    <section
      className="ux2-complete"
      aria-labelledby={`complete-${lessonId}`}
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: '2px solid var(--c-line)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px 16px',
        flexWrap: 'wrap',
      }}
    >
      <p id={`complete-${lessonId}`} className="ux2-prose" style={{ margin: 0, flex: '1 1 260px', color: 'var(--c-fg)', fontSize: 15, lineHeight: 1.5 }}>
        <strong>Finished?</strong>{' '}
        {description ?? `Once you have ${verb}, mark it complete to unlock the next lesson.`}
      </p>
      <button
        onClick={toggle}
        disabled={!snap.authed || busy}
        title={snap.authed ? undefined : 'Sign in to track progress'}
        style={{
          padding: '10px 18px',
          borderRadius: 6,
          border: 'none',
          fontWeight: 600,
          fontSize: 15,
          cursor: snap.authed ? 'pointer' : 'not-allowed',
          opacity: snap.authed ? 1 : 0.5,
          background: 'var(--c-green)',
          color: 'var(--c-bg)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <CircleCheck size={16} aria-hidden="true" />
        {busy ? 'Saving…' : 'Mark as complete'}
      </button>
      {!snap.authed ? <span style={{ color: 'var(--c-meta)', fontSize: 13 }}>Sign in to keep track of your progress.</span> : null}
    </section>
  );
}
