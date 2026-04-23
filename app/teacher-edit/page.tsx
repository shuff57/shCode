'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import type { CurrentUser } from '../../lib/auth';
import type { Commit } from '../../lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiCommit {
  id: string;
  lessonId: string;
  message: string;
  files: Record<string, string>;
  changedFileIds: string[];
  createdAt: number;
  authoredByEmail?: string;
}

function toCommit(api: ApiCommit): Commit {
  return {
    id: api.id,
    message: api.message,
    timestamp: api.createdAt,
    changedFileIds: api.changedFileIds,
    fileContentsSnapshot: api.files,
    authoredByEmail: api.authoredByEmail,
  };
}

// ---------------------------------------------------------------------------
// Styles — Dracula palette matching teacher/page.tsx
// ---------------------------------------------------------------------------

const S = {
  page: {
    minHeight: '100vh',
    background: '#282a36',
    color: '#f8f8f2',
    padding: '0',
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  header: {
    background: '#1e1f29',
    borderBottom: '1px solid #44475a',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
    gap: 12,
  } as React.CSSProperties,

  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  card: {
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 16,
  } as React.CSSProperties,

  btn: (color: string) =>
    ({
      background: color,
      color: '#282a36',
      border: 'none',
      borderRadius: 4,
      padding: '7px 14px',
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer',
      flexShrink: 0,
    }) as React.CSSProperties,

  btnDisabled: {
    background: '#44475a',
    color: '#6272a4',
    border: 'none',
    borderRadius: 4,
    padding: '7px 14px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'not-allowed',
    flexShrink: 0,
  } as React.CSSProperties,

  input: {
    background: '#282a36',
    border: '1px solid #44475a',
    borderRadius: 4,
    color: '#f8f8f2',
    padding: '7px 12px',
    fontSize: 14,
    outline: 'none',
    minWidth: 220,
  } as React.CSSProperties,

  error: { color: '#ff5555', fontSize: 13, marginTop: 6 } as React.CSSProperties,

  tab: (active: boolean) =>
    ({
      padding: '6px 14px',
      borderRadius: '4px 4px 0 0',
      border: '1px solid ' + (active ? '#44475a' : 'transparent'),
      borderBottom: active ? '1px solid #1e1f29' : '1px solid #44475a',
      background: active ? '#1e1f29' : 'transparent',
      color: active ? '#f8f8f2' : '#6272a4',
      cursor: 'pointer',
      fontSize: 13,
      fontFamily: 'monospace',
      fontWeight: active ? 600 : 400,
      whiteSpace: 'nowrap' as const,
    }) as React.CSSProperties,
};

function badge(label: string, color: string, textColor = '#282a36') {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        background: color,
        color: textColor,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function fmtTs(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: '#50fa7b',
        color: '#282a36',
        fontWeight: 700,
        fontSize: 14,
        padding: '12px 20px',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main inner component
// ---------------------------------------------------------------------------

function TeacherEditInner() {
  const params = useSearchParams();
  const classId = params.get('class');
  const studentEmail = params.get('student');
  const lessonId = params.get('lesson');

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const [commits, setCommits] = useState<Commit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Editor state
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>('');
  const [touchedFileIds, setTouchedFileIds] = useState<Set<string>>(new Set());

  // Commit form
  const [commitMsg, setCommitMsg] = useState('Teacher edit: ');
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState('');

  // Toast
  const [toast, setToast] = useState('');

  // Track if we've set initial editor contents
  const initializedRef = useRef(false);

  // Auth
  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setAuthLoaded(true));
  }, []);

  // Fetch commits
  useEffect(() => {
    if (!classId || !studentEmail || !lessonId) return;
    setLoadingCommits(true);
    setLoadError('');
    fetch(
      `/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentEmail)}/commits?lessonId=${encodeURIComponent(lessonId)}`,
      { credentials: 'same-origin' },
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ commits: ApiCommit[] }>;
      })
      .then((data) => {
        const sorted = (data.commits ?? [])
          .map(toCommit)
          .sort((a, b) => b.timestamp - a.timestamp);
        setCommits(sorted);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoadingCommits(false));
  }, [classId, studentEmail, lessonId]);

  // Once commits load, seed editor from the most recent commit
  useEffect(() => {
    if (initializedRef.current) return;
    if (loadingCommits) return;
    if (commits.length === 0) return;
    const latest = commits[0];
    const snapshot = latest.fileContentsSnapshot;
    const ids = Object.keys(snapshot);
    setFiles(snapshot);
    setFileIds(ids);
    setActiveFile(ids[0] ?? '');
    initializedRef.current = true;
  }, [commits, loadingCommits]);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  if (!classId || !studentEmail || !lessonId) {
    return (
      <div style={{ ...S.page, padding: 32 }}>
        <p style={{ color: '#ff5555', fontSize: 16, marginBottom: 16 }}>
          Invalid URL — missing class, student, or lesson parameter.
        </p>
        <a href="/teacher" style={{ color: '#8be9fd', fontSize: 14 }}>
          ← Back to teacher dashboard
        </a>
      </div>
    );
  }

  if (!authLoaded) {
    return <div style={{ ...S.page, padding: 32, color: '#6272a4' }}>Checking auth…</div>;
  }

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return (
      <div style={{ ...S.page, padding: 32 }}>
        <p style={{ color: '#ff5555', fontSize: 16, marginBottom: 16 }}>
          Teacher or admin access required.
        </p>
        <a href="/teacher" style={{ color: '#8be9fd', fontSize: 14 }}>
          ← Sign in as a teacher
        </a>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function loadCommitIntoEditor(commit: Commit) {
    const snapshot = commit.fileContentsSnapshot;
    const ids = Object.keys(snapshot);
    setFiles(snapshot);
    setFileIds(ids);
    setActiveFile(ids[0] ?? '');
    setTouchedFileIds(new Set());
    setCommitMsg('Teacher edit: ');
    setPushError('');
  }

  function handleEditorChange(content: string) {
    setFiles((prev) => ({ ...prev, [activeFile]: content }));
    setTouchedFileIds((prev) => {
      const next = new Set(prev);
      next.add(activeFile);
      return next;
    });
  }

  async function handlePush() {
    if (!commitMsg.trim() || !classId || !studentEmail || !lessonId) return;
    setPushing(true);
    setPushError('');
    try {
      const changedFileIds = touchedFileIds.size > 0 ? Array.from(touchedFileIds) : fileIds;
      const res = await fetch(
        `/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentEmail)}/commits`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            lessonId,
            message: commitMsg.trim(),
            files,
            changedFileIds,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { commit: ApiCommit };
      const newCommit = toCommit(data.commit);
      setCommits((prev) => [newCommit, ...prev]);
      setTouchedFileIds(new Set());
      setCommitMsg('Teacher edit: ');
      setToast(`Pushed commit to ${studentEmail}`);
    } catch (e: unknown) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushing(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const hasCommits = commits.length > 0;
  const canPush = !!commitMsg.trim() && hasCommits && fileIds.length > 0 && !pushing;

  // Derive a lesson display title from the lessonId (e.g. "2.3.1")
  const lessonDisplay = lessonId;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8f8f2' }}>
            Editing{' '}
            <span style={{ color: '#8be9fd', fontFamily: 'monospace' }}>{studentEmail}</span>
            {'\'s code for lesson '}
            <span style={{ color: '#bd93f9', fontFamily: 'monospace' }}>{lessonDisplay}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6272a4' }}>
            Class: {classId}
          </div>
        </div>
        <a
          href={`/teacher?class=${encodeURIComponent(classId)}`}
          style={{ color: '#8be9fd', fontSize: 14, textDecoration: 'none' }}
        >
          ← Back to class
        </a>
      </div>

      {/* Loading / error states */}
      {loadingCommits && (
        <div style={{ padding: 32, color: '#6272a4' }}>Loading student commits…</div>
      )}
      {!loadingCommits && loadError && (
        <div style={{ padding: 32 }}>
          <p style={S.error}>{loadError}</p>
          <a href={`/teacher?class=${encodeURIComponent(classId)}`} style={{ color: '#8be9fd', fontSize: 14 }}>
            ← Back to class
          </a>
        </div>
      )}

      {!loadingCommits && !loadError && !hasCommits && (
        <div style={{ padding: 32 }}>
          <p style={{ color: '#f1fa8c', fontSize: 15, marginBottom: 12 }}>
            Student hasn&apos;t saved any work yet on this lesson — cannot edit.
          </p>
          <a href={`/teacher?class=${encodeURIComponent(classId)}`} style={{ color: '#8be9fd', fontSize: 14 }}>
            ← Back to class
          </a>
        </div>
      )}

      {!loadingCommits && !loadError && hasCommits && (
        <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0 }}>
          {/* Left: Commit history */}
          <div
            style={{
              width: 300,
              flexShrink: 0,
              background: '#1e1f29',
              borderRight: '1px solid #44475a',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #44475a', fontSize: 12, fontWeight: 700, color: '#6272a4', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
              Commit history ({commits.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {commits.map((c, i) => {
                const isTeacher = user && c.authoredByEmail === user.email;
                const isStudent = c.authoredByEmail === studentEmail;
                return (
                  <button
                    key={c.id}
                    onClick={() => loadCommitIntoEditor(c)}
                    style={{
                      width: '100%',
                      background: i === 0 ? '#282a3688' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #44475a22',
                      padding: '10px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {isTeacher && badge('You (teacher)', '#50fa7b')}
                      {!isTeacher && isStudent && badge('Student', '#8be9fd')}
                      {!isTeacher && !isStudent && c.authoredByEmail &&
                        badge(c.authoredByEmail, '#ff79c6', '#282a36')}
                    </div>
                    <div style={{ fontSize: 12, color: '#f8f8f2', lineHeight: 1.4 }}>
                      {c.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#6272a4' }}>
                      {fmtTs(c.timestamp)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: editor area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* File tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 0,
                padding: '8px 16px 0',
                borderBottom: '1px solid #44475a',
                background: '#282a36',
                overflowX: 'auto',
                flexShrink: 0,
              }}
            >
              {fileIds.map((fid) => (
                <button
                  key={fid}
                  onClick={() => setActiveFile(fid)}
                  style={{
                    ...S.tab(fid === activeFile),
                    position: 'relative',
                  }}
                >
                  {fid}
                  {touchedFileIds.has(fid) && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ff79c6',
                        marginLeft: 6,
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Textarea editor */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
              <textarea
                value={files[activeFile] ?? ''}
                onChange={(e) => handleEditorChange(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#282a36',
                  color: '#f8f8f2',
                  fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: '16px',
                  boxSizing: 'border-box',
                  tabSize: 2,
                }}
              />
            </div>

            {/* Push bar */}
            <div
              style={{
                flexShrink: 0,
                background: '#1e1f29',
                borderTop: '1px solid #44475a',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap' as const,
              }}
            >
              <input
                style={{ ...S.input, flex: 1, minWidth: 200 }}
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit message"
              />
              <button
                style={canPush ? S.btn('#bd93f9') : S.btnDisabled}
                disabled={!canPush}
                onClick={() => { void handlePush(); }}
              >
                {pushing ? 'Pushing…' : 'Push to student'}
              </button>
              {pushError && <p style={{ ...S.error, margin: 0, width: '100%' }}>{pushError}</p>}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export — wrapped in Suspense for useSearchParams
// ---------------------------------------------------------------------------

export default function TeacherEditPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#282a36',
            color: '#6272a4',
            padding: 32,
          }}
        >
          Loading…
        </div>
      }
    >
      <TeacherEditInner />
    </Suspense>
  );
}
