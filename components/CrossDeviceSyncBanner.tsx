'use client';

// Cyan banner at the top of the lesson workspace when the student's latest
// server-side commit (authored by them) doesn't match this device's
// `lastCommittedFileContents`. That happens when they committed on
// another device — school laptop -> home laptop, etc. — and this
// machine is behind.
//
// Separate from TeacherPushBanner: that handles commits authored by
// someone OTHER than the student. This handles the student's own work
// arriving from elsewhere.

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useLessonStore } from '../lib/store';
import { getCurrentUser } from '../lib/auth';
import type { Commit } from '../lib/types';

function snapshotsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CrossDeviceSyncBanner() {
  const commits = useLessonStore((s) => s.commits);
  const lastCommitted = useLessonStore((s) => s.lastCommittedFileContents);
  const dirtyFileIds = useLessonStore((s) => s.dirtyFileIds);
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);
  const [dismissedAt, setDismissedAt] = useState(0);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((u) => {
      if (mounted) setUserEmail(u?.email ?? null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const pendingCommit = useMemo<Commit | null>(() => {
    if (userEmail === undefined || userEmail === null) return null;
    if (commits.length === 0) return null;
    // The most recent commit authored by this student. Legacy rows
    // without authored_by_email are treated as student-authored (matches
    // the server's coercion in rowToCommit).
    const own = commits.find((c) => (c.authoredByEmail ?? userEmail) === userEmail);
    if (!own) return null;
    // If this device's "last committed" state matches the server's latest
    // own-authored snapshot, there's nothing new to pull.
    if (snapshotsEqual(own.fileContentsSnapshot, lastCommitted)) return null;
    // Session dismissal — reappears if a newer commit arrives.
    if (own.timestamp <= dismissedAt) return null;
    return own;
  }, [commits, lastCommitted, userEmail, dismissedAt]);

  if (!pendingCommit) return null;

  function handlePull() {
    if (!pendingCommit) return;
    if (dirtyFileIds.size > 0) {
      const ok = window.confirm(
        'You have unsaved changes on this device. Pulling will overwrite them. Continue?',
      );
      if (!ok) return;
    }
    useLessonStore.setState({
      fileContents: { ...pendingCommit.fileContentsSnapshot },
      lastCommittedFileContents: { ...pendingCommit.fileContentsSnapshot },
      dirtyFileIds: new Set(),
    });
    setDismissedAt(pendingCommit.timestamp);
  }

  function handleDismiss() {
    if (pendingCommit) setDismissedAt(pendingCommit.timestamp);
  }

  return (
    <div
      style={{
        background: '#8be9fd',
        color: '#282a36',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <RefreshCw size={16} />
      <span style={{ flex: 1 }}>
        Work from another device ready to pull — {fmtTime(pendingCommit.timestamp)}
        {pendingCommit.message ? ` · "${pendingCommit.message}"` : ''}
      </span>
      <button
        onClick={handlePull}
        style={{
          background: '#282a36',
          color: '#8be9fd',
          border: 'none',
          borderRadius: 4,
          padding: '4px 14px',
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        Pull
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#282a36',
          cursor: 'pointer',
          padding: 4,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
