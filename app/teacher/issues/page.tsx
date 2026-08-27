'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/auth';
import {
  IssueReport,
  IssueStatus,
  listIssueReports,
  setIssueReportStatus,
} from '../../../lib/issue-reports-api';

// ---------------------------------------------------------------------------
// Staff triage queue for student issue reports. Read from D1, export the
// whole queue as markdown, and flip statuses in place. The markdown file is
// the handoff artifact — download it, work the fixes, flip statuses here.
// ---------------------------------------------------------------------------

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--text)' } as React.CSSProperties,

  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  } as React.CSSProperties,

  select: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '5px 8px',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,

  button: {
    background: 'var(--muted)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
};

const KIND_COLOR: Record<string, string> = {
  bug: '#f87171',
  quirk: '#fbbf24',
  enhancement: '#22c55e',
};

const STATUS_COLOR: Record<IssueStatus, string> = {
  open: '#f87171',
  'in-progress': '#5baafd',
  fixed: '#22c55e',
  deferred: '#999',
};

const STATUS_ORDER: IssueStatus[] = ['open', 'in-progress', 'fixed', 'deferred'];

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Filter = 'open' | 'all';

function IssuesPageInner() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setAuthChecked(true);
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    listIssueReports()
      .then((r) => {
        setReports(r);
        setLoadError('');
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (user?.role === 'student') return;
    load();
  }, [authChecked, user, load]);

  async function handleStatus(id: number, status: IssueStatus) {
    // Optimistic flip; reload on failure so the row shows the server truth.
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await setIssueReportStatus(id, status);
    } catch {
      load();
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!authChecked) return <div style={{ ...S.page, color: 'var(--text)', opacity: 0.55 }}>Loading…</div>;

  if (!user || user.role === 'student') {
    return (
      <div style={S.page}>
        <p style={{ color: '#dc2626', fontSize: 16, marginBottom: 16 }}>Staff access required.</p>
        <Link href="/" style={{ color: 'var(--brand)', fontSize: 14 }}>← Home</Link>
      </div>
    );
  }

  const visible = filter === 'open' ? reports.filter((r) => r.status === 'open') : reports;
  const openCount = reports.filter((r) => r.status === 'open').length;
  const counts = STATUS_ORDER.map(
    (s) => `${s}: ${reports.filter((r) => r.status === s).length}`,
  ).join(' · ');

  function download() {
    // The export endpoint sets Content-Disposition; a plain nav works and
    // keeps the auth cookie flowing.
    window.location.href = '/api/issue-reports?format=md';
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Issue reports</h1>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          style={{ ...S.select, minWidth: 160 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filter reports"
        >
          <option value="open">Open only ({openCount})</option>
          <option value="all">All ({reports.length})</option>
        </select>

        <button type="button" style={S.button} onClick={download}>
          Download report.md
        </button>
        <button type="button" style={S.button} onClick={load}>
          Refresh
        </button>

        <span style={{ fontSize: 13, color: 'var(--text)', opacity: 0.55 }}>{counts}</span>
      </div>

      {loading && <div style={{ color: 'var(--text)', opacity: 0.55 }}>Loading reports…</div>}
      {loadError && <div style={{ color: '#dc2626', fontSize: 14 }}>{loadError}</div>}

      {!loading && !loadError && visible.length === 0 && (
        <p style={{ color: 'var(--text)', opacity: 0.55, fontSize: 14 }}>
          {filter === 'open'
            ? 'Nothing open. Nice.'
            : 'No reports yet. Students file these from the "Report an issue" button.'}
        </p>
      )}

      {visible.map((r) => {
        const isExpanded = expanded.has(r.id);
        const context = r.context as {
          path?: string;
          lessonId?: string;
          lessonTitle?: string;
          currentFile?: string;
          currentFileContent?: string;
          currentFileContentTruncated?: boolean;
          userAgent?: string;
        } | null;

        return (
          <div key={r.id} style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'transparent',
                  color: KIND_COLOR[r.kind] ?? 'var(--text)',
                  border: `1px solid ${KIND_COLOR[r.kind] ?? 'var(--border)'}`,
                  fontWeight: 700,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                {r.kind}
              </span>

              <span style={{ fontSize: 14, flex: 1, minWidth: 200 }}>
                {r.message.split('\n')[0].slice(0, 120)}
              </span>

              <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.6 }}>
                {r.reporter_email} · {fmtDate(r.created_at)}
              </span>

              <select
                style={{
                  ...S.select,
                  color: STATUS_COLOR[r.status],
                  borderColor: STATUS_COLOR[r.status],
                }}
                value={r.status}
                onChange={(e) => void handleStatus(r.id, e.target.value as IssueStatus)}
                aria-label={`Status for report ${r.id}`}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {(r.message.includes('\n') || context) && (
                <button
                  type="button"
                  onClick={() => toggleExpand(r.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand)',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  {isExpanded ? 'Less' : 'More'}
                </button>
              )}
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                {r.message.includes('\n') && (
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: 13,
                      color: 'var(--text)',
                      margin: '0 0 12px',
                      fontFamily: 'inherit',
                    }}
                  >
                    {r.message}
                  </pre>
                )}

                {context && (
                  <div style={{ fontSize: 12, color: 'var(--text)', opacity: 0.7, display: 'grid', gap: 4 }}>
                    {context.path && <div>Page: <code>{context.path}</code></div>}
                    {context.lessonId && (
                      <div>
                        Lesson: <code>{context.lessonId}</code>
                        {context.lessonTitle ? ` — ${context.lessonTitle}` : ''}
                      </div>
                    )}
                    {context.currentFile && <div>File: <code>{context.currentFile}</code></div>}
                    {context.userAgent && <div style={{ wordBreak: 'break-all' }}>{context.userAgent}</div>}
                  </div>
                )}

                {context?.currentFileContent && (
                  <pre
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: 10,
                      fontSize: 12,
                      overflowX: 'auto',
                      maxHeight: 300,
                      marginTop: 10,
                      color: 'var(--text)',
                    }}
                  >
                    {context.currentFileContent}
                    {context.currentFileContentTruncated ? '\n… (truncated)' : ''}
                  </pre>
                )}

                {r.triaged_by && (
                  <div style={{ fontSize: 12, color: 'var(--text)', opacity: 0.6, marginTop: 10 }}>
                    Last triaged by {r.triaged_by}
                    {r.triaged_at ? ` · ${fmtDate(r.triaged_at)}` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<div style={{ ...S.page, color: 'var(--text)', opacity: 0.55 }}>Loading…</div>}>
      <IssuesPageInner />
    </Suspense>
  );
}