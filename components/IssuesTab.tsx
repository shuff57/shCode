'use client';

// The envelope dropdown's Issues tab (2026-11-14: Issues moved off the top bar into the mailbox). A short
// list of the issue queue: for a student, everyone's reports worst-first by vote (GET /api/issue-reports
// already hides who filed them) with their own marked; for a teacher, the newest. Each opens the full page
// (/issues for students, /teacher/issues for staff), where voting, withdrawing and triage stay.

import { useEffect, useState } from 'react';
import { listIssueReports, reportHeadline, type IssueReport } from '../lib/issue-reports-api';

const STATUS: Record<IssueReport['status'], { label: string; color: string }> = {
  open: { label: 'Open', color: 'var(--c-orange)' },
  'in-progress': { label: 'Being fixed', color: 'var(--c-cyan)' },
  fixed: { label: 'Fixed', color: 'var(--c-green)' },
  deferred: { label: 'Later', color: 'var(--c-dim)' },
};
const SHOWN = 12;

export default function IssuesTab({ active, staff }: { active: boolean; staff: boolean }) {
  const [rows, setRows] = useState<IssueReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const href = staff ? '/teacher/issues' : '/issues';

  useEffect(() => {
    if (!active) return;
    let live = true;
    listIssueReports()
      .then((r) => {
        if (!live) return;
        const list = r.filter((x) => !x.withdrawn && !x.withdrawn_at);
        list.sort(staff ? (a, b) => b.created_at - a.created_at : (a, b) => b.score - a.score || b.created_at - a.created_at);
        setRows(list);
        setError(null);
      })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not load the issues.'); });
    return () => { live = false; };
  }, [active, staff]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'min(480px, 70vh)' }} data-testid="issues-tab">
      <p style={{ margin: 0, padding: '8px 12px', fontSize: 12, lineHeight: 1.45, color: 'var(--c-meta)', borderBottom: '1px solid var(--c-line)' }}>
        {staff
          ? 'Problems students reported, newest first.'
          : 'Problems people reported, the most wanted first. Vote on them on the Issues page. To report one, use the flag at the bottom right.'}
      </p>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {error && <p role="alert" style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
        {!rows && !error && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
        {rows && !rows.length && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>No issues reported yet.</p>}
        {rows && rows.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.slice(0, SHOWN).map((r) => (
              <li key={r.id} style={{ borderBottom: '1px solid var(--c-line)' }}>
                <a href={`${href}#report-${r.id}`} data-testid="issues-row"
                  style={{ display: 'flex', gap: 8, padding: '8px 12px', color: 'var(--c-fg)', textDecoration: 'none', fontSize: 13 }}>
                  <span style={{ minWidth: 34, textAlign: 'right', color: 'var(--c-meta)', fontVariantNumeric: 'tabular-nums' }} title="Votes">{r.score > 0 ? `+${r.score}` : r.score}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      #{r.id} {reportHeadline(r)}
                    </span>
                    <span style={{ fontSize: 11, color: STATUS[r.status]?.color ?? 'var(--c-dim)' }}>
                      {STATUS[r.status]?.label ?? r.status}{r.mine ? <span style={{ color: 'var(--c-meta)' }}> · yours</span> : null}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <a href={href} data-testid="issues-open"
        style={{ fontSize: 12, padding: '8px 12px', color: 'var(--c-cyan)', borderTop: '1px solid var(--c-line)' }}>
        Open Issues{rows && rows.length > SHOWN ? ` (all ${rows.length})` : ''}
      </a>
    </div>
  );
}
