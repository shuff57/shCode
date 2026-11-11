'use client';

// One game's change flow (/changes?game=<id>[&tab=history]): GitHub's "Pull requests" tab and commit
// history, for beginners.
//   Proposed changes  every proposal, open first, each opening its conversation (ChangeThread)
//   History           every kept version with its note and who made it; See the changes opens a diff
//                     against the version before; the maker can Go back to this version (a NEW version)
// Who sees this is the server's rule (functions/_shared/gameFlow.ts gameAccess): the maker, a classmate
// who may see the game's code, the class's teachers.

import { useCallback, useEffect, useState } from 'react';
import DiffViewer from './DiffViewer';
import {
  changeHref, getVersion, isNew, listGameChanges, listVersions, revertTo, when,
  type ChangeSummary, type GameChanges, type VersionCode, type VersionList,
} from '../lib/game-flow-client';
import { playHref } from '../lib/games-client';
import { FLOW_DOCS, GITHUB_WORD } from '../lib/game-flow-core';
import { GitHubWord, NewBadge, SizeBadge, StatusPill, diffHeight, flowBtn, flowCard, flowLink } from './game-flow-ui';

type Tab = 'changes' | 'history';

function setTabInUrl(t: Tab) {
  const u = new URL(window.location.href);
  if (t === 'history') u.searchParams.set('tab', 'history'); else u.searchParams.delete('tab');
  window.history.replaceState(null, '', u.toString());
}

export default function GameChangesHub({ gameId, initialTab }: { gameId: string; initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [changes, setChanges] = useState<GameChanges | null>(null);
  const [history, setHistory] = useState<VersionList | null>(null);
  const [err, setErr] = useState<{ text: string; status: number } | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [diff, setDiff] = useState<VersionCode | { error: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([listGameChanges(gameId), listVersions(gameId)]);
    if (!a.ok) { setErr({ text: a.error, status: a.status }); return; }
    setChanges(a.value);
    if (b.ok) setHistory(b.value);
    document.title = `${a.value.game.title}: changes — shCode`;
  }, [gameId]);
  useEffect(() => { void load(); }, [load]);

  async function openVersion(v: number) {
    if (open === v) { setOpen(null); setDiff(null); return; }
    setOpen(v);
    setDiff(null);
    const r = await getVersion(gameId, v);
    setDiff(r.ok ? r.value : { error: r.error });
  }

  async function goBack(v: number) {
    if (!changes) return;
    const next = (history?.game.version ?? changes.game.version) + 1;
    if (!window.confirm(`Go back to version ${v}?\n\n${changes.game.title} gets version ${v}'s code as a new version, ${next}. Nothing is deleted: the version you have now stays in History, so you can come back to it.`)) return;
    setBusy(true);
    const r = await revertTo(gameId, v);
    setBusy(false);
    if (!r.ok) { setNote({ text: r.error, bad: true }); return; }
    setNote({ text: `Done. ${changes.game.title} is version ${r.value.version} now, with version ${v}'s code. If your sandbox has this game open, press Open in sandbox in the Library to get it.`, bad: false });
    setOpen(null);
    await load();
  }

  if (err) {
    return (
      <p style={{ fontSize: 14, color: err.status === 404 ? 'var(--c-dim)' : 'var(--c-red)' }}>
        {err.status === 404 ? 'This game is not here, or its changes are not shown: it may have been deleted, taken out of your class, or shared as "just play".'
          : err.status === 401 ? 'Sign in to see a game’s changes.' : err.text}
      </p>
    );
  }
  if (!changes) return <p style={{ fontSize: 14, color: 'var(--c-dim)' }}>Loading…</p>;

  const g = changes.game;
  const openOnes = changes.changes.filter((c) => c.status === 'open');
  const closed = changes.changes.filter((c) => c.status !== 'open');
  const row = (c: ChangeSummary) => (
    <li key={c.id} style={{ ...flowCard, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <a href={changeHref(c.id)} style={{ color: 'var(--c-fg)', fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere' }}>{c.title}</a>
        {' '}{isNew(c) && c.status === 'open' && <NewBadge />}
        <div style={{ fontSize: 12, color: 'var(--c-dim)' }}>
          by {c.mine ? `${c.from} (you)` : c.from} · {c.comments} {c.comments === 1 ? 'comment' : 'comments'} · from version {c.baseVersion} · {when(c.updatedAt)}
          {c.acceptedVersion ? ` · became version ${c.acceptedVersion}` : ''}
        </div>
      </div>
      <SizeBadge size={c.size} />
      <StatusPill status={c.status} locked={c.locked} />
    </li>
  );

  return (
    <div>
      <a href="/library/?tab=games" style={flowLink}>← Library</a>
      <h1 style={{ fontSize: 22, margin: '8px 0 2px', overflowWrap: 'anywhere' }}>{g.title}</h1>
      <div style={{ fontSize: 13, color: 'var(--c-dim)' }}>
        by {g.mine ? `${g.maker} (you)` : g.maker} · version {g.version} · <a href={playHref(g.id)} style={flowLink}>Play</a>
      </div>

      <div role="tablist" aria-label={`${g.title}: changes`} style={{ display: 'flex', gap: 4, margin: '14px 0 10px', borderBottom: '1px solid var(--c-line)' }}>
        {(['changes', 'history'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setTabInUrl(t); }}
            style={{
              padding: '6px 12px', fontSize: 13, cursor: 'pointer', background: 'transparent', border: 'none',
              color: tab === t ? 'var(--c-fg)' : 'var(--c-dim)', fontWeight: tab === t ? 600 : 400,
              borderBottom: tab === t ? '2px solid var(--c-purple)' : '2px solid transparent', marginBottom: -1,
            }}>
            {t === 'changes' ? `Proposed changes (${openOnes.length} open)` : `History (${history?.versions.length ?? '…'})`}
          </button>
        ))}
      </div>

      {note && (
        <div role="status" aria-live="polite" style={{ fontSize: 13, margin: '0 0 10px', color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{note.text}</div>
      )}

      {tab === 'changes' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
            {g.mine
              ? <>Classmates who remix {g.title} can propose their changes back to you. Open one to see the changes, try it, talk it over, and accept it or say no thanks.</>
              : <>Want to change {g.title}? <strong style={{ color: 'var(--c-fg)' }}>Remix</strong> it, change it in your sandbox, then press <strong style={{ color: 'var(--c-fg)' }}>Propose this change</strong>. You can also join any conversation below.</>}
          </p>
          <GitHubWord>{GITHUB_WORD.propose} <a href={FLOW_DOCS.propose} style={{ color: 'var(--c-cyan)' }}>How this works</a></GitHubWord>
          {!changes.changes.length && <p style={{ fontSize: 14, color: 'var(--c-dim)' }}>No proposed changes yet.</p>}
          {openOnes.length > 0 && <ol style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>{openOnes.map(row)}</ol>}
          {closed.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button type="button" style={flowBtn} aria-expanded={showClosed} onClick={() => setShowClosed((s) => !s)}>
                {showClosed ? 'Hide' : 'Show'} closed ones ({closed.length})
              </button>
              {showClosed && <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>{closed.map(row)}</ol>}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && history && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 4px', lineHeight: 1.5 }}>
            Every time {g.mine ? 'you press Update game' : `${g.maker} updates the game`} or accepts a change, a version is saved with a note on what changed. The newest 20 are kept.
          </p>
          <GitHubWord>{GITHUB_WORD.history} <a href={FLOW_DOCS.versions} style={{ color: 'var(--c-cyan)' }}>How this works</a></GitHubWord>
          <ol style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.versions.map((v) => (
              <li key={v.version} style={flowCard}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: v.version === history.game.version ? 'var(--c-green)' : 'var(--c-dim)', minWidth: 74 }}>
                    Version {v.version}{v.version === history.game.version ? ' (now)' : ''}
                  </span>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontSize: 14, overflowWrap: 'anywhere' }}>{v.message}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-dim)' }}>
                      {v.author} · {when(v.createdAt)}
                      {v.byChange && v.changeId && <> · <a href={changeHref(v.changeId)} style={{ ...flowLink, fontSize: 12 }}>accepted change</a></>}
                    </div>
                  </div>
                  <button type="button" style={flowBtn} aria-expanded={open === v.version} onClick={() => void openVersion(v.version)}>
                    {open === v.version ? 'Hide the changes' : 'See the changes'}
                  </button>
                  {history.mine && v.version !== history.game.version && (
                    <button type="button" style={flowBtn} disabled={busy} onClick={() => void goBack(v.version)}>Go back to this version</button>
                  )}
                </div>
                {open === v.version && (
                  <div style={{ marginTop: 8 }}>
                    {!diff && <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>Loading…</p>}
                    {diff && 'error' in diff && <p style={{ fontSize: 13, color: 'var(--c-red)', margin: 0 }}>{diff.error}</p>}
                    {diff && 'version' in diff && (
                      <>
                        <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '0 0 6px' }}>
                          {diff.version.previous
                            ? <>Left: version {diff.version.previous.version}. Right: version {v.version}.</>
                            : <>The first version kept, so it is all new.</>}
                        </p>
                        <div style={{ height: `min(${diffHeight(diff.version.previous?.code ?? '', diff.version.code, 460)}px, 65vh)`, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                          <DiffViewer original={diff.version.previous?.code ?? ''} modified={diff.version.code} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
