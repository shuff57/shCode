'use client';

// The envelope dropdown's Issues tab (2026-11-14: Issues moved off the top bar into the mailbox). The issue
// queue in short: for a student, everyone's reports worst-first by vote (GET /api/issue-reports already hides
// who filed them); for a teacher, the newest. Each row says what kind of report it is, where it stands, the
// start of what was reported and of the reply, and has the same thumbs up / down as the full page
// (IssueVoteControl), so voting no longer needs a trip to /issues (#121, 2026-11-16). "Yours" narrows the
// list to the reader's own reports, which is where the replies they are waiting for are. The title opens the
// full page at that report (/issues for students, /teacher/issues for staff), where withdrawing and triage stay.
//
// A vote does not re-sort the open list (a row jumping away under the pointer reads as a mis-click); the
// order is the one the list had when it was opened.

import { useEffect, useState } from 'react';
import IssueVoteControl, { type VoteState } from './IssueVoteControl';
import { listIssueReports, reportHeadline, type IssueReport } from '../lib/issue-reports-api';

const STATUS: Record<IssueReport['status'], { label: string; color: string }> = {
  open: { label: 'Open', color: 'var(--c-orange)' },
  'in-progress': { label: 'Being fixed', color: 'var(--c-cyan)' },
  fixed: { label: 'Fixed', color: 'var(--c-green)' },
  deferred: { label: 'Later', color: 'var(--c-dim)' },
};
const KIND: Record<IssueReport['kind'], string> = { bug: 'Bug', quirk: 'Quirk', enhancement: 'Idea' };
const SHOWN = 15;

const clamp2: React.CSSProperties = {
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere',
};

export default function IssuesTab({ active, staff }: { active: boolean; staff: boolean }) {
  const [rows, setRows] = useState<IssueReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
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

  function applyVote(id: number, next: VoteState) {
    setVoteError(null);
    setRows((prev) => prev && prev.map((r) => (r.id === id ? { ...r, up: next.up, down: next.down, score: next.up - next.down, myVote: next.myVote } : r)));
  }

  const mineCount = rows ? rows.filter((r) => r.mine).length : 0;
  const shown = rows ? (onlyMine ? rows.filter((r) => r.mine) : rows) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: 'min(520px, 70vh)' }} data-testid="issues-tab">
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-line)' }}>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--c-meta)' }}>
          {staff
            ? 'Problems and ideas students reported, newest first. Thumbs up or down to say how much each one matters.'
            : 'Problems and ideas people reported, the most wanted first. Give a thumbs up to the ones that bother you too, so they get fixed sooner. To report one, use the flag at the bottom right of any page.'}
        </p>
        {!staff && mineCount > 0 && (
          <div role="group" aria-label="Which reports" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {([false, true] as const).map((mine) => (
              <button key={String(mine)} type="button" aria-pressed={onlyMine === mine} onClick={() => setOnlyMine(mine)}
                data-testid={mine ? 'issues-filter-mine' : 'issues-filter-all'}
                style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid var(--c-line)',
                  background: onlyMine === mine ? 'color-mix(in srgb, var(--c-cyan) 18%, transparent)' : 'transparent',
                  color: onlyMine === mine ? 'var(--c-fg)' : 'var(--c-meta)',
                }}>
                {mine ? `Yours (${mineCount})` : 'Everyone’s'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {error && <p role="alert" style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-red)' }}>{error}</p>}
        {voteError && <p role="alert" style={{ margin: 0, padding: '8px 12px', fontSize: 12, color: 'var(--c-red)' }}>{voteError}</p>}
        {!rows && !error && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>Loading…</p>}
        {shown && !shown.length && <p style={{ margin: 0, padding: 12, fontSize: 13, color: 'var(--c-dim)' }}>No issues reported yet.</p>}
        {shown && shown.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {shown.slice(0, SHOWN).map((r) => {
              const st = STATUS[r.status];
              const headline = reportHeadline(r);
              const body = r.title && r.message && r.message.trim() !== headline.trim() ? r.message : null;
              return (
                <li key={r.id} data-testid="issues-row" style={{ display: 'flex', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--c-line)' }}>
                  <div style={{ minWidth: 0, flex: 1, fontSize: 13 }}>
                    <a href={`${href}#report-${r.id}`} style={{ ...clamp2, color: 'var(--c-fg)', textDecoration: 'none', fontWeight: 600 }}>
                      {headline}
                    </a>
                    <div style={{ fontSize: 11, marginTop: 2, color: 'var(--c-meta)' }}>
                      <span style={{ color: st?.color ?? 'var(--c-dim)' }}>{st?.label ?? r.status}</span>
                      {' · '}{KIND[r.kind] ?? r.kind}{' · '}#{r.id}
                      {r.mine ? ' · yours' : null}
                    </div>
                    {body && <div style={{ ...clamp2, fontSize: 12, marginTop: 3, color: 'var(--c-dim)' }}>{body}</div>}
                    {r.resolution_note && (
                      <div style={{ fontSize: 12, marginTop: 4, padding: '4px 8px', borderRadius: 4, color: 'var(--c-fg)', background: 'var(--c-deep2)' }}>
                        <div style={clamp2}><strong>Reply:</strong> {r.resolution_note}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: '0 0 auto', alignSelf: 'flex-start' }}>
                    <IssueVoteControl
                      reportId={r.id}
                      vote={{ up: r.up, down: r.down, myVote: r.myVote }}
                      onChange={(next) => applyVote(r.id, next)}
                      onError={setVoteError}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <a href={href} data-testid="issues-open"
        style={{ fontSize: 12, padding: '8px 12px', color: 'var(--c-cyan)', borderTop: '1px solid var(--c-line)' }}>
        Open the Issues page{shown && shown.length > SHOWN ? ` (all ${shown.length})` : ''}
      </a>
    </div>
  );
}
