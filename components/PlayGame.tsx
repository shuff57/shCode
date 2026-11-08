'use client';

// The play page for one published game (/play?game=<id>, the Games library).
// It shows the title and the publisher (first name + last initial), runs the
// code in MoshionPreview with gameKey "game-<id>" so the lobby (a game that
// calls multiplayer('versus' | 'coop', n)) lists only rooms for THIS game, and
// offers Run/Restart, Remix and View code. The code runs only inside that
// sandboxed iframe (no allow-same-origin), exactly as any sketch does; nothing
// here evaluates it.

import { useEffect, useState } from 'react';
import MoshionPreview from './MoshionPreview';
import Console from './Console';
import { getGame, remixIntoSandbox, type FullGame } from '../lib/games-client';
import { isGameId } from '../lib/games-core';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'signed-out' }
  | { kind: 'error'; text: string }
  | { kind: 'ok'; game: FullGame };

const quiet: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 4, background: 'transparent', color: 'var(--c-fg)',
  border: '1px solid var(--c-line)', cursor: 'pointer', fontSize: 13,
};

export default function PlayGame() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [runKey, setRunKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('game') ?? '';
    if (!isGameId(id)) { setState({ kind: 'missing' }); return; }
    let live = true;
    void getGame(id).then((r) => {
      if (!live) return;
      if (r.ok) {
        setState({ kind: 'ok', game: r.value.game });
        document.title = `${r.value.game.title} — shCode`;
      } else if (r.status === 404) setState({ kind: 'missing' });
      else if (r.status === 401) setState({ kind: 'signed-out' });
      else setState({ kind: 'error', text: r.error });
    });
    return () => { live = false; };
  }, []);

  const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', width: '100%', padding: '8px 16px 24px', boxSizing: 'border-box', color: 'var(--c-fg)' };
  const back = <a href="/library/" style={{ color: 'var(--c-cyan)', fontSize: 13 }}>← Library</a>;

  if (state.kind !== 'ok') {
    const text = state.kind === 'loading' ? 'Loading the game…'
      : state.kind === 'signed-out' ? 'Sign in to play games your class made.'
      : state.kind === 'error' ? state.text
      : 'This game is not here. It may have been deleted, taken out of your class, or never shared with your class.';
    return (
      <div style={wrap}>
        {back}
        <p style={{ fontSize: 14, color: state.kind === 'error' ? 'var(--c-red)' : 'var(--c-dim)' }}>{text}</p>
      </div>
    );
  }

  const g = state.game;
  return (
    <div style={wrap}>
      {back}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', margin: '6px 0 10px' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ fontSize: 22, margin: 0, overflowWrap: 'anywhere' }}>{g.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--c-dim)' }}>
            by {g.mine ? `${g.owner} (you)` : g.owner} · {g.modeLabel}
            {g.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-run" onClick={() => setRunKey((k) => k + 1)}>
            {runKey === 0 ? '▶ Run' : '↻ Restart'}
          </button>
          <button
            type="button"
            style={quiet}
            title={g.mine ? 'Put this game in your moSHion sandbox; Publish game there updates it' : 'Copy this game into your own moSHion sandbox to change it'}
            onClick={() => {
              if (remixIntoSandbox({ id: g.id, title: g.title, code: g.code, mine: g.mine })) setNote('Opening your sandbox…');
            }}
          >
            {g.mine ? 'Open in sandbox' : 'Remix'}
          </button>
          <button type="button" style={quiet} aria-expanded={showCode} onClick={() => setShowCode((s) => !s)}>
            {showCode ? 'Hide code' : 'View code'}
          </button>
        </div>
      </div>
      {note && <div role="status" style={{ fontSize: 12, color: 'var(--c-green)', margin: '0 0 6px' }}>{note}</div>}
      <div style={{ height: 'max(360px, calc(100vh - 330px))', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
        <MoshionPreview code={g.code} runKey={runKey} gameKey={'game-' + g.id} />
      </div>
      <div style={{ height: 120, marginTop: 8, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="output-header">Console</div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Console resetKey={String(runKey)} />
        </div>
      </div>
      {showCode && (
        <pre
          aria-label="Game code"
          style={{
            marginTop: 10, padding: 12, maxHeight: 420, overflow: 'auto', fontSize: 12, lineHeight: 1.5,
            background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, whiteSpace: 'pre',
          }}
        >
          <code>{g.code}</code>
        </pre>
      )}
    </div>
  );
}
