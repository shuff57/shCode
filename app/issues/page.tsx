'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, type CurrentUser } from '../../lib/auth';
import {
  IssueReport,
  listIssueReports,
  reportHeadline,
  screenshotUrl,
  setIssueReportWithdrawn,
} from '../../lib/issue-reports-api';
import IssueVoteControl, { type VoteState } from '../../components/IssueVoteControl';

// ---------------------------------------------------------------------------
// The public-ish issue queue: what everyone who has filed a "Report an issue"
// gets to see filed by everyone else, worst-first by vote score. The API
// (GET /api/issue-reports) already anonymises this for a student caller —
// no reporter_email, no triaged_by, no raw context — so this page never
// has an identity to render even by accident.
//
// "Worst first" is a promise this page makes, not the API: a staff caller's
// response comes back in chronological order (the shape /teacher/issues
// needs for triage — see functions/api/issue-reports/index.ts), so a
// teacher or admin who opens THIS page would otherwise see it out of order.
// sortByScore() below applies the same rule GET /api/issue-reports already
// uses for a student caller either way, so the promise holds regardless of
// who is looking.
// ---------------------------------------------------------------------------

/** Worst first: highest score first, ties broken newest-first. Same rule as
 *  rankReports() in functions/_shared/issue-reports.ts — duplicated here
 *  (rather than imported) because that module is Pages-Function-only code,
 *  and this is the client bundle. */
function sortByScore(rows: IssueReport[]): IssueReport[] {
  return [...rows].sort((a, b) => b.score - a.score || b.created_at - a.created_at);
}

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)' } as React.CSSProperties,

  sub: { fontSize: 14, color: 'var(--text)', opacity: 0.6, marginBottom: 24 } as React.CSSProperties,

  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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

const STATUS_COLOR: Record<string, string> = {
  open: '#f87171',
  'in-progress': '#5baafd',
  fixed: '#22c55e',
  deferred: '#999',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  fixed: 'Fixed',
  deferred: 'Deferred',
};

function relativeTime(ms: number): string {
  const diffSec = Math.round((Date.now() - ms) / 1000);
  const table: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ];
  let value = diffSec;
  for (const [span, unit] of table) {
    if (value < span) {
      const n = Math.max(1, Math.round(value));
      return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    }
    value /= span;
  }
  return 'a while ago';
}

export default function IssuesPage() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [voteError, setVoteError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawBusy, setWithdrawBusy] = useState<Set<number>>(new Set());

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    listIssueReports()
      .then((r) => {
        setReports(sortByScore(r));
        setLoadError('');
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user === undefined || !user) return;
    load();
  }, [user, load]);

  function applyVote(id: number, next: VoteState) {
    setVoteError('');
    setReports((prev) =>
      sortByScore(
        prev.map((r) =>
          r.id === id ? { ...r, up: next.up, down: next.down, score: next.up - next.down, myVote: next.myVote } : r,
        ),
      ),
    );
  }

  // Withdraw is not delete — the report stays in the queue for staff, this
  // just stops other students from seeing it. Optimistic, revert on failure,
  // same shape as applyVote above.
  async function handleWithdraw(id: number, withdrawn: boolean) {
    setWithdrawError('');
    setWithdrawBusy((prev) => new Set(prev).add(id));
    const before = reports;
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, withdrawn } : r)));
    try {
      await setIssueReportWithdrawn(id, withdrawn);
    } catch (e) {
      setReports(before);
      setWithdrawError(e instanceof Error ? e.message : String(e));
    } finally {
      setWithdrawBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (user === undefined) {
    return <div style={{ ...S.page, opacity: 0.55 }}>Loading…</div>;
  }

  if (!user) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>Issue reports</h1>
        <p style={{ opacity: 0.7 }}>Sign in to see what everyone else has reported.</p>
        <Link href="/" style={{ color: 'var(--brand)', fontSize: 14 }}>← Home</Link>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Issue reports</h1>
      <p style={S.sub}>
        Bugs, quirks, and ideas everyone has reported — worst first, by vote. Vote up the ones that
        are hitting you too.
      </p>

      <div style={{ marginBottom: 16 }}>
        <button type="button" style={S.button} onClick={load}>
          Refresh
        </button>
      </div>

      {loading && <div style={{ opacity: 0.55 }}>Loading reports…</div>}
      {loadError && <div style={{ color: '#dc2626', fontSize: 14 }}>{loadError}</div>}
      {voteError && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{voteError}</div>}
      {withdrawError && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{withdrawError}</div>}

      {!loading && !loadError && reports.length === 0 && (
        <p style={{ opacity: 0.55, fontSize: 14 }}>
          No reports yet. File one with the "Report an issue" button.
        </p>
      )}

      {reports.map((r) => {
        const context = r.context as { path?: string; lessonId?: string } | null;
        const busy = withdrawBusy.has(r.id);
        return (
          <div key={r.id} style={r.withdrawn ? { ...S.card, opacity: 0.55 } : S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
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

              {r.mine && (
                <span style={{ fontSize: 11, opacity: 0.55, fontStyle: 'italic' }}>Yours</span>
              )}

              <span
                style={{
                  color: STATUS_COLOR[r.status] ?? 'var(--text)',
                  border: `1px solid ${STATUS_COLOR[r.status] ?? 'var(--border)'}`,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                }}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>

              <IssueVoteControl
                reportId={r.id}
                vote={{ up: r.up, down: r.down, myVote: r.myVote }}
                onChange={(next) => applyVote(r.id, next)}
                onError={setVoteError}
              />

              {r.mine && (
                <button
                  type="button"
                  style={{ ...S.button, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}
                  disabled={busy}
                  onClick={() => void handleWithdraw(r.id, !r.withdrawn)}
                >
                  {r.withdrawn ? 'Restore' : 'Withdraw'}
                </button>
              )}
            </div>

            {r.mine && r.withdrawn && (
              <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, opacity: 0.7 }}>
                Withdrawn — only you can see this report now.
              </p>
            )}

            <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {r.screenshot_id && (
                <a href={screenshotUrl(r.screenshot_id)} target="_blank" rel="noreferrer">
                  <img
                    src={screenshotUrl(r.screenshot_id)}
                    alt={`Screenshot attached to report #${r.id}`}
                    style={{
                      maxWidth: 160,
                      maxHeight: 110,
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      display: 'block',
                      cursor: 'zoom-in',
                    }}
                  />
                </a>
              )}

              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {r.message}
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, opacity: 0.6 }}>
                  {context?.path && (
                    <Link href={context.path} style={{ color: 'var(--brand)' }}>
                      {context.path}
                    </Link>
                  )}
                  <span>{relativeTime(r.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
