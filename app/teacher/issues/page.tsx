'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '../../../lib/auth';
import {
  IssueKind,
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

  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text)',
    padding: '6px 10px',
    fontSize: 13,
    minWidth: 240,
    outline: 'none',
    fontFamily: 'inherit',
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

/**
 * A filter chip. Active is a ring rather than an inverted fill: the status
 * colours are mid-tone, so light-text-on-colour is only legible in one of
 * the two themes. Colour on --bg is the pairing the per-card status select
 * already ships, so it is known to read in both.
 */
function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    background: 'var(--bg)',
    color,
    border: `1px solid ${color}`,
    boxShadow: active ? `inset 0 0 0 2px ${color}` : 'none',
    opacity: active ? 1 : 0.65,
    borderRadius: 999,
    padding: '3px 12px',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    textTransform: 'capitalize',
  };
}

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

// Status was 'open' | 'all' until the queue outgrew one screen. With four
// statuses in use, "show me the deferred pile" — the view you want when
// deciding whether a deferral still holds — was the one question the old
// two-way switch could not ask.
type StatusFilter = 'all' | IssueStatus;
type KindFilter = 'all' | IssueKind;
type SortKey = 'newest' | 'oldest' | 'votes' | 'status';

// Issue #14: staff asked to filter the list by how old a report is, on top
// of the existing open/all status filter. created_at is epoch ms and was
// already stored + indexed (migration 0018) -- this needed no schema change.
type AgeFilter = 'any' | '24h' | '7d' | '30d';
const AGE_FILTER_MS: Record<AgeFilter, number | null> = {
  any: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const KIND_ORDER: IssueKind[] = ['bug', 'quirk', 'enhancement'];

const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'votes', 'status'];
const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  votes: 'Most voted',
  status: 'By status',
};

// 'newest' is the default because it is the order the API already returns
// (ORDER BY created_at DESC for a staff caller), so the page still opens on
// the arrangement staff are used to and re-sorting stays opt-in. 'votes'
// matches the student queue's rule, ties broken newest-first.
const SORTERS: Record<SortKey, (a: IssueReport, b: IssueReport) => number> = {
  newest: (a, b) => b.created_at - a.created_at,
  oldest: (a, b) => a.created_at - b.created_at,
  votes: (a, b) => b.score - a.score || b.created_at - a.created_at,
  status: (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.created_at - a.created_at,
};

/** What a search term is matched against: everything a staff member might
 *  remember about a report — its headline, its body, who filed it, and
 *  where from. The id is included as "#31" so both spellings find it. */
function searchHaystack(r: IssueReport): string {
  const c = (r.context ?? {}) as Record<string, unknown>;
  return [`#${r.id}`, r.title, r.message, r.reporter_email, r.kind, r.status, r.resolution_note, c.lessonId, c.lessonTitle, c.path]
    .filter((v) => v !== null && v !== undefined)
    .join(' ')
    .toLowerCase();
}

/** Every term must match, so a second word narrows rather than widens. */
function matchesQuery(r: IssueReport, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = searchHaystack(r);
  return terms.every((t) => hay.includes(t));
}

function IssuesPageInner() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('any');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState('');
  // Keyed by report id. A draft only exists once staff starts typing;
  // rendering falls back to the report's own resolution_note, so this never
  // needs syncing on load the way a mirrored copy of server state would.
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [noteBusy, setNoteBusy] = useState<Set<number>>(new Set());
  const [noteErrors, setNoteErrors] = useState<Record<number, string>>({});

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

  // Independent of handleStatus: the per-card dropdown never sends `note`,
  // so flipping status alone can never blow away an existing reply, and
  // saving a reply alone (this) never touches status.
  async function handleNote(id: number, note: string) {
    const status = reports.find((r) => r.id === id)?.status ?? 'open';
    setNoteBusy((prev) => new Set(prev).add(id));
    setNoteErrors((prev) => {
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
    try {
      await setIssueReportStatus(id, status, note);
      const saved = note.trim() ? note.trim() : null;
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, resolution_note: saved } : r)));
      setNoteDrafts((prev) => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      setNoteErrors((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setNoteBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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

  function toggleExpandAll() {
    setExpanded(allExpanded ? new Set() : new Set(visible.map((r) => r.id)));
  }

  function resetFilters() {
    setStatusFilter('open');
    setKindFilter('all');
    setAgeFilter('any');
    setSortKey('newest');
    setQuery('');
  }

  // The whole header row toggles its card, which puts every control in that
  // row — the vote buttons, the status select, Delete, the chevron itself —
  // inside the click target. Ignoring clicks that landed on a control beats
  // stopPropagation on each one, which is the kind of thing the next control
  // added to this row would quietly forget. The selection check is the other
  // half of it: finishing a drag across the headline is not a request to
  // collapse the card.
  function onHeaderClick(e: React.MouseEvent<HTMLDivElement>, id: number) {
    if ((e.target as Element).closest('button, select, input, a, label')) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    toggleExpand(id);
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

  // Narrow, then order. Every .filter() allocates, so the .sort() at the end
  // is working on this chain's own array and never reorders `reports`.
  const maxAgeMs = AGE_FILTER_MS[ageFilter];
  const visible = reports
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .filter((r) => kindFilter === 'all' || r.kind === kindFilter)
    .filter((r) => maxAgeMs === null || Date.now() - r.created_at <= maxAgeMs)
    .filter((r) => matchesQuery(r, query))
    .sort(SORTERS[sortKey]);

  const allExpanded = visible.length > 0 && visible.every((r) => expanded.has(r.id));
  const filtersActive =
    statusFilter !== 'open' ||
    kindFilter !== 'all' ||
    ageFilter !== 'any' ||
    sortKey !== 'newest' ||
    query !== '';

  function download() {
    // The export endpoint sets Content-Disposition; a plain nav works and
    // keeps the auth cookie flowing.
    window.location.href = '/api/issue-reports?format=md';
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Issue reports</h1>

      {/* The tally doubles as the status filter. It used to be a static
          string, which made "deferred: 13" a fact you could read but not a
          pile you could open. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          aria-pressed={statusFilter === 'all'}
          style={chipStyle(statusFilter === 'all', 'var(--text)')}
        >
          all {reports.length}
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            aria-pressed={statusFilter === s}
            style={chipStyle(statusFilter === s, STATUS_COLOR[s])}
          >
            {s} {reports.filter((r) => r.status === s).length}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="search"
          style={S.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search text, reporter, lesson, #id"
          aria-label="Search reports"
        />

        <select
          style={{ ...S.select, minWidth: 140 }}
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as KindFilter)}
          aria-label="Filter by kind"
        >
          <option value="all">Any kind</option>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {k} ({reports.filter((r) => r.kind === k).length})
            </option>
          ))}
        </select>

        <select
          style={{ ...S.select, minWidth: 140 }}
          value={ageFilter}
          onChange={(e) => setAgeFilter(e.target.value as AgeFilter)}
          aria-label="Filter by age"
        >
          <option value="any">Any age</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        <select
          style={{ ...S.select, minWidth: 140 }}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort reports"
        >
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>

        {filtersActive && (
          <button type="button" style={S.button} onClick={resetFilters}>
            Reset
          </button>
        )}

        <span style={{ fontSize: 13, color: 'var(--text)', opacity: 0.55 }}>
          Showing {visible.length} of {reports.length}
        </span>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" style={S.button} onClick={toggleExpandAll} disabled={visible.length === 0}>
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
        <button type="button" style={S.button} onClick={download}>
          Download report.md
        </button>
        <button
          type="button"
          style={S.button}
          onClick={() => void copyForAgent()}
          disabled={visible.length === 0}
          title="Copy the filtered reports shown below as a work order for Claude Code or opencode"
        >
          Copy for agent
        </button>
        <button type="button" style={S.button} onClick={load}>
          Refresh
        </button>

        {copied && <span style={{ fontSize: 13, color: '#22c55e' }}>{copied}</span>}
      </div>

      {loading && <div style={{ color: 'var(--text)', opacity: 0.55 }}>Loading reports…</div>}
      {loadError && <div style={{ color: '#dc2626', fontSize: 14 }}>{loadError}</div>}
      {voteError && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{voteError}</div>}

      {!loading && !loadError && visible.length === 0 && (
        <p style={{ color: 'var(--text)', opacity: 0.55, fontSize: 14 }}>
          {reports.length === 0
            ? 'No reports yet. Students file these from the "Report an issue" button.'
            : filtersActive
              ? 'No reports match these filters.'
              : 'Nothing open. Nice.'}
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
            <div
              onClick={(e) => onHeaderClick(e, r.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
            >
              {/* The row click is a mouse convenience; this button is the
                  real control, so the card stays operable from the keyboard
                  without nesting interactive elements inside one another. */}
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                aria-expanded={isExpanded}
                aria-controls={`report-${r.id}-detail`}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} report ${r.id}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  opacity: 0.7,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={16} aria-hidden="true" />
                ) : (
                  <ChevronRight size={16} aria-hidden="true" />
                )}
              </button>
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

              {r.resolution_note && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--brand)',
                    border: '1px solid var(--brand)',
                    borderRadius: 4,
                    padding: '2px 8px',
                  }}
                >
                  Replied
                </span>
              )}

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
                style={S.danger}
                onClick={() => void handleDelete(r.id, reportHeadline(r))}
                title="Delete this report permanently (for duplicates, misfires and test reports)"
              >
                Delete
              </button>
            </div>

            {isExpanded && (
              <div
                id={`report-${r.id}-detail`}
                style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}
              >
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

                <div style={{ marginTop: 12 }}>
                  <label
                    htmlFor={`note-${r.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text)',
                      opacity: 0.7,
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Reply (shown to the reporter, and to anyone else viewing this report)
                  </label>
                  <textarea
                    id={`note-${r.id}`}
                    style={{ ...S.input, width: '100%', minHeight: 60, resize: 'vertical' }}
                    value={noteDrafts[r.id] ?? r.resolution_note ?? ''}
                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="e.g. Fixed by loosening r2's regex to allow flavor text. Or: Deferred — reverting this broke something worse last time."
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      style={S.button}
                      disabled={
                        noteBusy.has(r.id) ||
                        (noteDrafts[r.id] ?? r.resolution_note ?? '') === (r.resolution_note ?? '')
                      }
                      onClick={() => void handleNote(r.id, noteDrafts[r.id] ?? r.resolution_note ?? '')}
                    >
                      {noteBusy.has(r.id) ? 'Saving…' : 'Save reply'}
                    </button>
                    {noteErrors[r.id] && (
                      <span style={{ color: '#dc2626', fontSize: 12 }}>{noteErrors[r.id]}</span>
                    )}
                  </div>
                </div>

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