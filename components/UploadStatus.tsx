'use client';

// Where a lab's or the sandbox's code is, in plain words (lib/outbox.ts uploadText):
//   "Saved on this computer. Will upload when you're back online" / "Saved on this computer" /
//   "Uploading..." / "Uploaded 10:42" / "Two versions. Choose" / "Sign in again to upload".
// And, when a file was changed here and on another computer, the choice:
//   "This lesson was also changed on another computer."  [Keep mine] [Open the other one]
// Nothing uploads for that lesson until the student picks one. Neither component blocks or
// waits for anything; both re-read when the outbox says something changed.

import { useEffect, useState, type CSSProperties } from 'react';
import { onOutboxChange, uploadStatus, uploadText, type OutboxKind, type UploadState, type UploadStatus } from '../lib/outbox';
import { keepMine, openOtherVersion, type OpenOtherResult } from '../lib/lesson-sync';

const NONE: UploadStatus = { state: 'none', at: null, other: null };

/** The lesson's upload status, kept current. `enabled` false (signed out, reference solution) shows nothing. */
export function useUploadStatus(lessonId: string, enabled: boolean, kind: OutboxKind = 'lab'): UploadStatus {
  const [status, setStatus] = useState<UploadStatus>(NONE);
  useEffect(() => {
    if (!enabled) { setStatus(NONE); return; }
    const read = () => setStatus(uploadStatus(kind, lessonId));
    read();
    const off = onOutboxChange(read);
    // The browser going on or off line changes the words, and so does another tab's upload.
    window.addEventListener('online', read);
    window.addEventListener('offline', read);
    const onVisible = () => { if (document.visibilityState === 'visible') read(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      window.removeEventListener('online', read);
      window.removeEventListener('offline', read);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lessonId, enabled, kind]);
  return status;
}

const COLOR: Record<UploadState, string> = {
  none: 'var(--c-meta)',
  offline: 'var(--c-orange)',
  waiting: 'var(--c-meta)',
  sending: 'var(--c-meta)',
  uploaded: 'var(--c-green)',
  conflict: 'var(--c-orange)',
  auth: 'var(--c-orange)',
};

/** The sandbox's dot style for each state (app/globals.css .sandbox-save-state). */
export function sandboxDotState(s: UploadState): 'device' | 'cloud' | 'changed' {
  if (s === 'uploaded') return 'cloud';
  if (s === 'conflict' || s === 'auth' || s === 'offline') return 'changed';
  return 'device';
}

export function UploadChip({ status, style, what = 'code' }: { status: UploadStatus; style?: CSSProperties; what?: string }) {
  const text = uploadText(status);
  if (!text) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      data-upload-state={status.state}
      title={status.state === 'conflict' ? 'Choose a version in the note above.' : `Your ${what} is kept on this computer and uploads to your account by itself.`}
      style={{
        color: COLOR[status.state],
        fontFamily: 'var(--font-prose)',
        fontSize: 12,
        alignSelf: 'center',
        // Narrow and wrapping: the lab's tool row does not wrap, and the longest state is two lines.
        maxWidth: 190,
        minWidth: 0,
        lineHeight: 1.25,
        whiteSpace: 'normal',
        ...style,
      }}
    >
      {text}
    </span>
  );
}

const bar: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
  margin: '8px 0',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--c-orange)',
  background: 'var(--card)',
  color: 'var(--text)',
  fontFamily: 'var(--font-prose)',
  fontSize: 14,
  lineHeight: 1.45,
};
const primary: CSSProperties = {
  background: 'var(--brand)',
  color: 'var(--on-brand)',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-prose)',
  cursor: 'pointer',
};
const secondary: CSSProperties = { ...primary, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' };

export const KEEP_FAILED = 'This computer could not keep the other version in History, so nothing was changed.';

const OPEN_FAILED: Record<Exclude<OpenOtherResult, 'ok'>, string> = {
  history: 'Nothing was changed: your version could not be put in History first. Your code is still here.',
  missing: 'Nothing was changed: the other version could not be found. Connect to the internet and try again.',
  'not-open': 'Nothing was changed. Reload the page and try again.',
};

/** Shown while a lesson has two versions. Keep mine / Open the other one. */
export function TwoVersionsNotice({ lessonId, status }: { lessonId: string; status: UploadStatus }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (status.state !== 'conflict') setNote(null); }, [status.state]);
  if (status.state !== 'conflict') return null;
  const label = status.other?.label;
  return (
    <div role="alert" data-two-versions="" style={bar}>
      <span style={{ flex: '1 1 280px' }}>
        <strong>This lesson was also changed on another computer.</strong>{' '}
        Your version is open here. {label ? `The other one is in History as "${label}".` : 'The other one is in your account.'}{' '}
        Nothing uploads until you choose.
        {note && <span style={{ display: 'block', color: 'var(--c-orange)', marginTop: 4 }}>{note}</span>}
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          style={primary}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            // Only once the other version is safely in History (read back); otherwise nothing changes.
            const r = await keepMine(lessonId);
            setBusy(false);
            if (r === 'history') setNote(KEEP_FAILED);
          }}
        >
          Keep mine
        </button>
        <button
          type="button"
          style={secondary}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            const r = await openOtherVersion(lessonId);
            setBusy(false);
            if (r !== 'ok') setNote(OPEN_FAILED[r]);
          }}
        >
          Open the other one
        </button>
      </span>
    </div>
  );
}
