'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, Circle } from 'lucide-react';
import {
  recordLessonCompleted,
  resetLessonState,
  useLessonState,
} from '../lib/progress';
import { getNextLesson, navigateToNextLesson } from '../lib/lesson-neighbors';
import { lessonHref } from '../lib/lesson-href';

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
  // The same next lesson the header's "→" link and Mark-as-complete's auto-advance go to. It is
  // shown as an action only once this lesson is complete, which is what unlocks it.
  const [next, setNext] = useState<{ title: string; href: string } | null>(null);
  useEffect(() => {
    let live = true;
    getNextLesson(lessonId).then((n) => { if (live) setNext(n ? { title: n.title, href: lessonHref(n) } : null); });
    return () => { live = false; };
  }, [lessonId]);

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
  if (complete) return (
    <section aria-live="polite" style={{ marginTop: 20, padding: '16px 18px', border: '1px solid color-mix(in srgb, var(--c-green) 33.3333%, transparent)', borderRadius: 8, background: 'color-mix(in srgb, var(--c-green) 3.9216%, transparent)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <CircleCheck size={20} color="var(--c-green)" />
      <span className="completion-done-text" style={{ color: 'var(--c-green)', flex: 1 }}>Completed · next lesson unlocked</span>
      <button onClick={toggle} disabled={!snap.authed} style={{ background: 'transparent', border: 0, color: 'var(--c-meta)', textDecoration: 'underline', cursor: 'pointer', padding: 6 }}>Undo</button>
      {next && (
        <a className="completion-next" href={next.href}>
          <span className="completion-next-verb">Next:</span> <span className="completion-next-title">{next.title}</span> <span aria-hidden="true">→</span>
        </a>
      )}
    </section>
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
