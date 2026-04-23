'use client';

import { useEffect, useState, useRef } from 'react';
import { useLessonStore } from '../lib/store';
import { getCurrentUser } from '../lib/auth';
import type { CurrentUser } from '../lib/auth';
import type { Commit } from '../lib/types';
import DiffViewer from './DiffViewer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ModalProps {
  unseenCommits: Commit[];
  currentFiles: Record<string, string>;
  onAdopt: (commit: Commit) => void;
  onClose: () => void;
}

function TeacherPushModal({ unseenCommits, currentFiles, onAdopt, onClose }: ModalProps) {
  const [index, setIndex] = useState(unseenCommits.length - 1); // newest first

  const commit = unseenCommits[index];
  if (!commit) return null;

  const total = unseenCommits.length;
  const fileNames = Object.keys(commit.fileContentsSnapshot);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Teacher's edit"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg, #282a36)',
          border: '1px solid var(--border, #44475a)',
          borderRadius: 8,
          width: 'min(92vw, 860px)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border, #44475a)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f8f8f2' }}>
              Teacher&#39;s edit — {commit.message}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>
              {commit.authoredByEmail} &middot; {formatTs(commit.timestamp)}
            </div>
          </div>

          {/* Prev / Next when multiple unseen */}
          {total > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                aria-label="Previous"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                style={navBtnStyle(index === 0)}
              >
                &#8592;
              </button>
              <span style={{ fontSize: '0.8rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                {index + 1} of {total}
              </span>
              <button
                aria-label="Next"
                disabled={index === total - 1}
                onClick={() => setIndex((i) => i + 1)}
                style={navBtnStyle(index === total - 1)}
              >
                &#8594;
              </button>
            </div>
          )}

          <button
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}
          >
            &times;
          </button>
        </div>

        {/* Diff area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fileNames.length === 0 && (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No file changes in this commit.</p>
          )}
          {fileNames.map((fname) => (
            <div key={fname} style={{ border: '1px solid var(--border, #44475a)', borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '4px 10px',
                  background: 'var(--muted, #44475a)',
                  fontSize: '0.78rem',
                  color: '#ccc',
                  fontFamily: 'monospace',
                }}
              >
                {fname}
              </div>
              <div style={{ height: 240 }}>
                <DiffViewer
                  original={currentFiles[fname] ?? ''}
                  modified={commit.fileContentsSnapshot[fname]}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border, #44475a)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: '#6272a4',
              color: '#f8f8f2',
              border: 'none',
              borderRadius: 5,
              padding: '7px 18px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Close
          </button>
          <button
            onClick={() => onAdopt(commit)}
            style={{
              background: '#bd93f9',
              color: '#282a36',
              border: 'none',
              borderRadius: 5,
              padding: '7px 18px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Adopt teacher&#39;s version
          </button>
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: '1px solid #44475a',
    color: disabled ? '#555' : '#f8f8f2',
    borderRadius: 4,
    padding: '2px 8px',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.9rem',
  };
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export default function TeacherPushBanner() {
  const commits = useLessonStore((s) => s.commits);
  const fileContents = useLessonStore((s) => s.fileContents);

  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  // Track the latest timestamp at which the user dismissed the banner so we
  // can reshow it if a newer teacher commit arrives.
  const dismissedAtRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  // Fetch current user once on mount
  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  // Nothing to show for non-students or not-yet-loaded user
  if (user === undefined || user === null || user.role !== 'student') return null;

  const email = user.email;

  // Split commits by author
  const teacherCommits = commits.filter(
    (c) => c.authoredByEmail !== undefined && c.authoredByEmail !== email,
  );

  // Most recent own commit (by timestamp)
  const ownLatest = commits
    .filter((c) => !c.authoredByEmail || c.authoredByEmail === email)
    .reduce<Commit | null>((best, c) => (best === null || c.timestamp > best.timestamp ? c : best), null);

  const ownLatestTs = ownLatest?.timestamp ?? 0;

  // Teacher commits newer than the student's most recent commit
  const unseenCommits = teacherCommits
    .filter((c) => c.timestamp > ownLatestTs)
    .sort((a, b) => a.timestamp - b.timestamp); // oldest-first so modal index 0 = oldest

  const latestUnseenTs = unseenCommits.length > 0
    ? unseenCommits[unseenCommits.length - 1].timestamp
    : 0;

  // Banner is suppressed only when every unseen commit falls within the
  // dismissed window (i.e., nothing arrived after the last dismissal).
  const dismissed = latestUnseenTs > 0 && latestUnseenTs <= dismissedAtRef.current;

  if (unseenCommits.length === 0 || dismissed) return null;

  const count = unseenCommits.length;
  const plural = count === 1 ? '' : 's';

  function handleDismiss() {
    dismissedAtRef.current = latestUnseenTs;
    forceRender((n) => n + 1);
  }

  function handleAdopt(commit: Commit) {
    // Overwrite working files with the teacher's snapshot, but do NOT truncate
    // the commit history (unlike restoreCommit which pops history).
    useLessonStore.setState((s) => ({
      fileContents: { ...s.fileContents, ...commit.fileContentsSnapshot },
    }));
    setModalOpen(false);
    handleDismiss();
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        style={{
          background: '#f1fa8c',
          color: '#1a1a1a',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          flexShrink: 0,
        }}
      >
        <span>
          Your teacher pushed {count} new edit{plural}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: 'none',
              border: '1px solid rgba(0,0,0,0.25)',
              borderRadius: 4,
              padding: '2px 10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#1a1a1a',
            }}
          >
            Review &#8594;
          </button>
          <button
            aria-label="Dismiss banner"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              color: '#555',
              padding: '0 2px',
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {modalOpen && (
        <TeacherPushModal
          unseenCommits={unseenCommits}
          currentFiles={fileContents}
          onAdopt={handleAdopt}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
