'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/auth';
import {
  IssueReport,
  IssueStatus,
  listIssueReports,
  setIssueReportStatus,
  deleteIssueReport,
  reportHeadline,
  screenshotUrl,
  setScreenshotShared,
} from '../../../lib/issue-reports-api';
import IssueVoteControl, { type VoteState } from '../../../components/IssueVoteControl';

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

  danger: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    fontSize: 13,
    cursor: 'pointer',
    padding: 0,
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

/** A markdown code fence, spelled out so the string below stays readable. */
const FENCE = '```';

/**
 * A paste-ready work order for Claude Code or opencode.
 *
 * Same substance as the ?format=md export minus the summary table: an agent
 * does not need counts, it needs the reproduction context for each item and an
 * instruction about scope. The scope line is the important half — without it a
 * coding agent treats a one-line bug report as licence to reorganise the file.
 *
 * Deliberately built with concatenation rather than template literals: the
 * body embeds code fences, and nesting backticks inside backticks is how this
 * kind of function quietly starts emitting broken markdown.
 */
function buildAgentPrompt(reports: IssueReport[]): string {
  const out: string[] = [
    'These are issue reports filed by students in the shCode app.',
    '',
    'For each one: reproduce it if you can, fix the root cause, and state which',
    'report number your change addresses. If a report is not actionable, say so',
    'and why rather than guessing. Do not change anything the report does not',
    'touch.',
    '',
  ];

  for (const r of reports) {
    const c = (r.context ?? {}) as Record<string, unknown>;
    out.push('## #' + r.id + ' [' + r.kind + '] ' + reportHeadline(r), '', r.message, '');
    if (c.path) out.push('- page: ' + String(c.path));
    if (c.lessonId) {
      out.push(
        '- lesson: ' +
          String(c.lessonId) +
          (c.lessonTitle ? ' (' + String(c.lessonTitle) + ')' : ''),
      );
    }
    if (c.currentFile) out.push('- file open: ' + String(c.currentFile));
    if (c.userAgent) out.push('- browser: ' + String(c.userAgent));
    if (r.screenshot_id) {
      // Absolute, because the agent is not running in the browser and a bare
      // /uploads/... path is unfetchable from a terminal.
      out.push('- screenshot: ' + window.location.origin + screenshotUrl(r.screenshot_id));
    }
    if (typeof c.currentFileContent === 'string' && c.currentFileContent) {
      out.push('', 'Their code at the time:', FENCE, c.currentFileContent, FENCE);
      if (c.currentFileContentTruncated) out.push('(snapshot was truncated)');
    }
    out.push('', '---', '');
  }

  return out.join('\n');
}

type Filter = 'open' | 'all';

function IssuesPageInner() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState('');

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

  function applyVote(id: number, next: VoteState) {
    setVoteError('');
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, up: next.up, down: next.down, score: next.up - next.down, myVote: next.myVote } : r,
      ),
    );
  }

  // Off is the safe default (migration 0022) -- ticking this on publishes
  // the screenshot to the whole internet via the unauthenticated /uploads/
  // route, permanently. Reload on failure rather than assume the toggle
  // took, same reasoning as handleStatus above.
  async function handleShareScreenshot(id: number, shared: boolean) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, screenshot_shared: shared ? 1 : 0 } : r)));
    try {
      await setScreenshotShared(id, shared);
    } catch (e) {
      load();
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }

  // Delete is for reports that were never real: a duplicate, a misfire, or
  // one of your own filed while testing the button. A real report that is
  // finished gets status 'fixed' instead — collapsing "done" and "was noise"
  // into one state is what makes an export useless as a handoff document.
  async function handleDelete(id: number, label: string) {
    const ok = window.confirm(
      `Delete report #${id} permanently?\n\n"${label}"\n\n` +
        'This also deletes its screenshot. To close a real report instead, ' +
        "set its status to 'fixed'.",
    );
    if (!ok) return;
    const before = reports;
    setReports((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteIssueReport(id);
    } catch (e) {
      setReports(before);
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }

  async function copyForAgent() {
    const text = buildAgentPrompt(visible);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`Copied ${visible.length} report(s)`);
    } catch {
      setCopied('Clipboard blocked — use Download report.md');
    }
    setTimeout(() => setCopied(''), 2500);
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
        <button
          type="button"
          style={S.button}
          onClick={() => void copyForAgent()}
          disabled={visible.length === 0}
          title="Copy the reports shown below as a work order for Claude Code or opencode"
        >
          Copy for agent
        </button>
        <button type="button" style={S.button} onClick={load}>
          Refresh
        </button>

        <span style={{ fontSize: 13, color: 'var(--text)', opacity: 0.55 }}>{counts}</span>
        {copied && (
          <span style={{ fontSize: 13, color: '#22c55e' }}>{copied}</span>
        )}
      </div>

      {loading && <div style={{ color: 'var(--text)', opacity: 0.55 }}>Loading reports…</div>}
      {loadError && <div style={{ color: '#dc2626', fontSize: 14 }}>{loadError}</div>}
      {voteError && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{voteError}</div>}

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

              <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 200 }}>
                {reportHeadline(r)}
              </span>

              <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.6 }}>
                {r.reporter_email} · {fmtDate(r.created_at)}
              </span>

              <IssueVoteControl
                reportId={r.id}
                vote={{ up: r.up, down: r.down, myVote: r.myVote }}
                onChange={(next) => applyVote(r.id, next)}
                onError={setVoteError}
              />

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

              <button
                type="button"
                style={S.danger}
                onClick={() => void handleDelete(r.id, reportHeadline(r))}
                title="Delete this report permanently (for duplicates, misfires and test reports)"
              >
                Delete
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
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

                {r.screenshot_id && (
                  <a
                    href={screenshotUrl(r.screenshot_id)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-block', marginTop: 10 }}
                  >
                    <img
                      src={screenshotUrl(r.screenshot_id)}
                      alt={`Screenshot attached to report ${r.id}`}
                      style={{
                        maxWidth: 420,
                        maxHeight: 280,
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        display: 'block',
                        cursor: 'zoom-in',
                      }}
                    />
                  </a>
                )}

                {r.screenshot_id && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--text)',
                      opacity: 0.85,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={r.screenshot_shared === 1}
                      onChange={(e) => void handleShareScreenshot(r.id, e.target.checked)}
                    />
                    Show screenshot to students
                  </label>
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