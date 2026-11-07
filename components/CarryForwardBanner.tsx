'use client';

// The carry-forward strip: "Your 5.3.14 table is saved — bring it forward or
// start from the starter?"
//
// It appears only when all of these hold:
//   - this lesson names a `carryFrom` source,
//   - the student has not chosen for this pair before,
//   - this lesson still holds its authored starter (their newer work always wins),
//   - the source lesson has a commit or an offline draft,
//   - carrying would actually change a file.
//
// Bringing it forward calls the store action, which merges the source's files
// and records a provenance commit ("Brought forward from ...").

import { useEffect, useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { flattenFiles, useLessonStore } from '../lib/store';
import { listCommits } from '../lib/commits-api';
import { loadProgress, normalizeContents } from '../lib/version-control';
import {
  carryWouldChange,
  dismissCarry,
  isAuthoredStarter,
  isCarryDismissed,
  starterContents,
} from '../lib/carry-forward';
import { getLessonTitle } from '../lib/lesson-neighbors';
import type { Lesson } from '../lib/types';

type Phase = 'checking' | 'offer' | 'hidden';

async function findSourceFiles(sourceId: string): Promise<Record<string, string> | null> {
  try {
    const commits = await listCommits(sourceId);
    if (commits.length > 0) {
      return normalizeContents(commits[0].fileContentsSnapshot);
    }
  } catch {
    /* signed out or offline: use the draft below */
  }
  const draft = typeof window === 'undefined' ? null : loadProgress(sourceId);
  return draft ? normalizeContents(draft.fileContents) : null;
}

export default function CarryForwardBanner({ lesson }: { lesson: Lesson }) {
  const current = useLessonStore((s) => s.fileContents);
  const carryForward = useLessonStore((s) => s.carryForward);
  const [phase, setPhase] = useState<Phase>('checking');
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [carried, setCarried] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  const sourceId = lesson.carryFrom;

  useEffect(() => {
    let live = true;
    setPhase('checking');
    setCarried(null);
    setSourceTitle(null);

    if (!sourceId || typeof window === 'undefined') {
      setPhase('hidden');
      return;
    }
    if (isCarryDismissed(lesson.id, sourceId)) {
      setPhase('hidden');
      return;
    }
    if (!isAuthoredStarter(starterContents(flattenFiles(lesson.files)), useLessonStore.getState().fileContents)) {
      setPhase('hidden'); // their own work is already here
      return;
    }

    (async () => {
      const files = await findSourceFiles(sourceId);
      const title = await getLessonTitle(sourceId);
      if (!live) return;
      if (!files || !carryWouldChange(useLessonStore.getState().fileContents, files)) {
        setPhase('hidden');
        return;
      }
      setCarried(files);
      setSourceTitle(title);
      setPhase('offer');
    })();

    return () => {
      live = false;
    };
  }, [lesson.id, sourceId, lesson]);

  if (phase !== 'offer' || !carried) return null;

  const label = sourceTitle ? sourceTitle.replace(/^\d+(\.\d+)*\s*/, '') : 'your last lesson';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 14px',
        margin: '0 0 10px 0',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--x-0ea5e9)',
        borderRadius: 8,
        background: 'rgba(14,165,233,0.08)',
        fontSize: 13,
      }}
    >
      <ArrowDownToLine size={16} color="#0ea5e9" />
      <span style={{ flex: '1 1 320px', minWidth: 220 }}>
        <strong>Your {label} is saved.</strong> Start this lab from your own code, or
        from the starter.
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const ok = await carryForward(sourceId!, sourceTitle ?? '');
          setBusy(false);
          if (ok) setPhase('hidden');
        }}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid var(--x-0ea5e9)',
          background: 'var(--x-0ea5e9)',
          color: 'white',
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          fontSize: 13,
        }}
      >
        {busy ? 'Bringing it…' : 'Bring my work forward'}
      </button>
      <button
        type="button"
        onClick={() => {
          dismissCarry(lesson.id, sourceId!);
          setPhase('hidden');
        }}
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
        Start from the starter
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setPhase('hidden')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
