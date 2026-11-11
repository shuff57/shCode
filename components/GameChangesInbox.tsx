'use client';

// "Proposed changes" in the Library's Games tab (lib/game-flow-core.ts): the conversations that concern
// the student, from GET /api/game-changes:
//   For my games    proposals classmates sent to the student's own games (open first)
//   I proposed      the student's own proposals, with what the maker decided
//   I joined        conversations the student commented in
// A row is "new" when it changed since this browser last opened it. Hidden when there is nothing.

import { useCallback, useEffect, useState } from 'react';
import { CHANGES_CHANGED, changeHref, getInbox, isNew, when, type InboxRow } from '../lib/game-flow-client';
import { GAMES_CHANGED } from '../lib/games-client';
import { GITHUB_WORD } from '../lib/game-flow-core';
import { GitHubWord, NewBadge, StatusPill } from './game-flow-ui';
import { sectionHeading, sectionNote, sectionStyle } from './library-ui';

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 8px',
  border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep2)',
};

function Rows({ rows, label }: { rows: InboxRow[]; label: (r: InboxRow) => string }) {
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r) => (
        <li key={r.id} style={rowStyle}>
          <div style={{ minWidth: 160, flex: '1 1 200px' }}>
            <a href={changeHref(r.id)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-fg)', overflowWrap: 'anywhere' }}>{r.title}</a>
            {' '}{isNew(r) && <NewBadge />}
            <div style={{ fontSize: 11, color: 'var(--c-dim)' }}>
              {label(r)} · {r.comments} {r.comments === 1 ? 'comment' : 'comments'} · {when(r.updatedAt)}
            </div>
          </div>
          <StatusPill status={r.status} locked={r.locked} />
        </li>
      ))}
    </ol>
  );
}

export default function GameChangesInbox() {
  const [data, setData] = useState<{ received: InboxRow[]; sent: InboxRow[]; joined: InboxRow[] } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const load = useCallback(async () => {
    const r = await getInbox();
    if (r.ok) setData(r.value);
  }, []);
  useEffect(() => {
    void load();
    const on = () => { void load(); };
    window.addEventListener(CHANGES_CHANGED, on);
    window.addEventListener(GAMES_CHANGED, on);
    return () => { window.removeEventListener(CHANGES_CHANGED, on); window.removeEventListener(GAMES_CHANGED, on); };
  }, [load]);

  if (!data || (!data.received.length && !data.sent.length && !data.joined.length)) return null;
  const cut = (rows: InboxRow[]) => (showAll ? rows : rows.filter((r) => r.status === 'open' || isNew(r)).slice(0, 8));
  const received = cut(data.received);
  const sent = cut(data.sent);
  const joined = cut(data.joined);
  const hidden = data.received.length + data.sent.length + data.joined.length - received.length - sent.length - joined.length;
  const waiting = data.received.filter((r) => r.status === 'open').length;

  return (
    <section aria-labelledby="games-changes-h" style={sectionStyle}>
      <h3 id="games-changes-h" style={{ ...sectionHeading, margin: '0 0 4px' }}>
        Proposed changes{waiting ? ` (${waiting} waiting for you)` : ''}
      </h3>
      <p style={{ ...sectionNote, margin: '0 0 6px' }}>
        Changes classmates proposed to your games, the ones you proposed, and conversations you joined.
      </p>
      <GitHubWord>{GITHUB_WORD.propose}</GitHubWord>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {received.length > 0 && (
          <div>
            <h4 style={{ fontSize: 13, margin: '0 0 4px', color: 'var(--c-dim)' }}>For my games</h4>
            <Rows rows={received} label={(r) => `${r.from} → ${r.gameTitle}`} />
          </div>
        )}
        {sent.length > 0 && (
          <div>
            <h4 style={{ fontSize: 13, margin: '0 0 4px', color: 'var(--c-dim)' }}>I proposed</h4>
            <Rows rows={sent} label={(r) => `to ${r.gameTitle}`} />
          </div>
        )}
        {joined.length > 0 && (
          <div>
            <h4 style={{ fontSize: 13, margin: '0 0 4px', color: 'var(--c-dim)' }}>I joined</h4>
            <Rows rows={joined} label={(r) => `${r.from} → ${r.gameTitle}`} />
          </div>
        )}
        {(hidden > 0 || showAll) && (
          <button type="button" onClick={() => setShowAll((s) => !s)}
            style={{ alignSelf: 'flex-start', fontSize: 12, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' }}>
            {showAll ? 'Show only open and new' : `Show ${hidden} older`}
          </button>
        )}
      </div>
    </section>
  );
}
