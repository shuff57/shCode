'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { useLessonStore } from '../lib/store';

function clockTime(stamp: number) {
  return new Date(stamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DraftStatus() {
  const draft = useLessonStore((s) => s.draft);
  const resetToStarter = useLessonStore((s) => s.resetToStarter);
  const flushDraft = useLessonStore((s) => s.flushDraft);
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // A debounced save is still pending when a tab is closed or backgrounded.
  // Write it out before the page goes away.
  useEffect(() => {
    const flush = () => flushDraft();
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flushDraft]);

  // A new lesson clears restoredAt, so the restore notice comes back for it.
  useEffect(() => {
    setDismissed(false);
    setConfirming(false);
  }, [draft.restoredAt]);

  return (
    <div className="draft-status">
      {draft.error ? (
        <span className="draft-warning" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          {draft.error}
        </span>
      ) : draft.savedAt ? (
        <span className="draft-saved" aria-live="polite">
          <Check size={14} aria-hidden="true" />
          Work saved at {clockTime(draft.savedAt)}
        </span>
      ) : (
        <span className="draft-idle">Your work saves automatically as you type</span>
      )}

      {confirming ? (
        <span className="draft-confirm">
          Delete your saved work and start over?
          <button
            type="button"
            onClick={() => {
              resetToStarter();
              setConfirming(false);
              setDismissed(true);
            }}
          >
            Yes, reset
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="draft-reset"
          onClick={() => setConfirming(true)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset to starter code
        </button>
      )}

      {draft.restoredAt !== null && !dismissed ? (
        <span className="draft-restored" role="status">
          Picked up where you left off
          {draft.restoredAt ? ` (saved ${clockTime(draft.restoredAt)})` : ''}. Not
          your work?
          <button type="button" onClick={() => setConfirming(true)}>
            Start fresh
          </button>
          <button type="button" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </span>
      ) : null}
    </div>
  );
}
