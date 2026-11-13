'use client';

// "You have work in this lesson from before you signed in." See lib/guest-work.ts
// for when it shows and what each button does. Shown only after mount, so the
// static render and the first client render match.

import { useEffect, useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { flattenFiles, useLessonStore } from '../lib/store';
import { starterContents } from '../lib/carry-forward';
import { acceptGuestWork, declineGuestWork, guestWorkOffer, type GuestOffer } from '../lib/guest-work';
import type { Lesson } from '../lib/types';

export default function GuestWorkOffer({ lesson }: { lesson: Lesson }) {
  const storeLessonId = useLessonStore((s) => s.lesson?.id);
  const [offer, setOffer] = useState<GuestOffer | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setOffer(null);
    setNote(null);
    if (storeLessonId !== lesson.id || typeof window === 'undefined') return;
    const starter = starterContents(flattenFiles(lesson.files));
    setOffer(guestWorkOffer(lesson.id, useLessonStore.getState().fileContents, starter));
  }, [lesson.id, lesson.files, storeLessonId]);

  if (note) {
    return (
      <p role="status" style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--c-meta)', fontFamily: 'var(--font-prose)' }}>{note}</p>
    );
  }
  if (!offer) return null;

  const use = () => {
    const starter = starterContents(flattenFiles(lesson.files));
    const r = acceptGuestWork(lesson.id, offer, useLessonStore.getState().fileContents, starter);
    setOffer(null);
    if (!r.ok) {
      setNote(r.reason === 'history'
        ? 'Nothing was changed. This computer could not keep your current version in History, so your work here stays as it is.'
        : 'Nothing was changed. This computer could not save that work into your account, so your work here stays as it is.');
      return;
    }
    useLessonStore.setState({ fileContents: { ...r.files } });
    setNote('Done. Your work from before you signed in is open now. Your other version is in History.');
  };
  const no = () => {
    declineGuestWork(lesson.id, offer);
    setOffer(null);
  };

  return (
    <div
      role="region"
      aria-label="Work from before you signed in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 14px',
        margin: '0 0 10px 0',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--c-orange)',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--c-orange) 8.0%, transparent)',
        fontSize: 13,
        fontFamily: 'var(--font-prose)',
      }}
    >
      <UserCheck size={16} color="var(--c-orange)" aria-hidden />
      <span style={{ flex: '1 1 320px', minWidth: 220 }}>
        <strong>You have work in this lesson from before you signed in.</strong> It was saved on this
        computer while nobody was signed in, so anyone using it could see it. Use it here?
      </span>
      <button
        type="button"
        onClick={use}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid var(--brand)',
          background: 'var(--brand)',
          color: 'var(--on-brand)',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Use that work
      </button>
      <button
        type="button"
        onClick={no}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        No thanks
      </button>
      <button
        type="button"
        aria-label="Hide for now"
        onClick={() => setOffer(null)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, color: 'var(--text)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
