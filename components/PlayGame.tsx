'use client';

// The play page for one published game (/play?game=<id>, the Games library).
// It shows the title and the publisher (first name + last initial), runs the
// code in MoshionPreview with gameKey "game-<id>" so the lobby (a game that
// calls multiplayer('versus' | 'coop', n)) lists only rooms for THIS game, and
// offers Run/Restart, Remix and View code. /play?builtin=<id> runs one of the
// built-in games (public/builtin-games.json: the finished Trail, Checkers and
// Quest from the lesson demos) PLAY ONLY: no Remix, no View code, because they
// are the games students build in those chains, and with the lesson demo's room
// key ('demo-<fence>') so Library and lesson players can join each other.
// Every game is packed (packForUrl) before it runs: the code travels in the
// runner's URL and a request line over ~16 KB is refused. The code runs only inside that
// sandboxed iframe (no allow-same-origin), exactly as any sketch does; nothing
// here evaluates it.
//
// A published game's own pictures and sounds (saved textures and sounds it
// loads by name) come from GET /api/games/[id]/assets and are laid over the
// store the sketch sees for this run (lib/game-assets.ts); the preview waits
// for that answer before it starts. Items the publisher has not shared with
// the class are named in a note above the game.
//
// Sharing choices (lib/share-choice.ts): a classmate's "just play" game shows
// no Remix and no View code (canRemix false; the code still reaches this page
// so it can run, and the server refuses to publish a remix of it). A remix
// says where it came from under the title ("Remixed from Plane by Sam W.").

import { useEffect, useState } from 'react';
import MoshionPreview from './MoshionPreview';
import { packForUrl } from './DemoGameBlock';
import Console from './Console';
import { getGame, getGameAssets, remixIntoSandbox, type FullGame } from '../lib/games-client';
import { builtinTextureNames, listWords, missingToShow, type GameAsset } from '../lib/game-assets';
import { isGameId } from '../lib/games-core';
import { CHOICE_TEXT } from '../lib/share-choice';
import { RemixCreditLine } from './ShareChoicePicker';
import GameSuggestions from './GameSuggestions';

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'signed-out' }
  | { kind: 'error'; text: string }
  | { kind: 'ok'; game: FullGame }
  | { kind: 'builtin'; game: BuiltinGame };

export interface BuiltinGame {
  id: string; title: string; blurb: string; lesson: string; fence: string; mode: string; players: number; code: string;
}

const quiet: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 4, background: 'transparent', color: 'var(--c-fg)',
  border: '1px solid var(--c-line)', cursor: 'pointer', fontSize: 13,
};

export default function PlayGame() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [runKey, setRunKey] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // null while the game's pictures and sounds are still on their way.
  const [assets, setAssets] = useState<{ list: GameAsset[]; missing: string[] } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let live = true;
    const builtin = params.get('builtin');
    if (builtin) {
      fetch('/builtin-games.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { games: BuiltinGame[] } | null) => {
          if (!live) return;
          const g = d?.games.find((x) => x.id === builtin);
          if (!g) { setState({ kind: 'missing' }); return; }
          setState({ kind: 'builtin', game: g });
          document.title = `${g.title} — shCode`;
        })
        .catch(() => { if (live) setState({ kind: 'error', text: 'Could not load the game. Try again.' }); });
      return () => { live = false; };
    }
    const id = params.get('game') ?? '';
    if (!isGameId(id)) { setState({ kind: 'missing' }); return; }
    void getGame(id).then((r) => {
      if (!live) return;
      if (r.ok) {
        setState({ kind: 'ok', game: r.value.game });
        document.title = `${r.value.game.title} — shCode`;
        // Best effort: a failure plays the game with the player's own library,
        // exactly as before this existed.
        void Promise.all([getGameAssets(id), builtinTextureNames()]).then(([a, builtins]) => {
          if (!live) return;
          if (!a.ok) { setAssets({ list: [], missing: [] }); return; }
          setAssets({ list: a.value.assets ?? [], missing: missingToShow(a.value.missingItems ?? [], builtins) });
        });
      } else if (r.status === 404) setState({ kind: 'missing' });
      else if (r.status === 401) setState({ kind: 'signed-out' });
      else setState({ kind: 'error', text: r.error });
    });
    return () => { live = false; };
  }, []);

  const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', width: '100%', padding: '8px 16px 24px', boxSizing: 'border-box', color: 'var(--c-fg)' };
  const back = <a href="/library/" style={{ color: 'var(--c-cyan)', fontSize: 13 }}>← Library</a>;

  if (state.kind === 'builtin') {
    const b = state.game;
    const online = b.mode === 'versus' || b.mode === 'coop';
    return (
      <div style={wrap}>
        {back}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', margin: '6px 0 10px' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>{b.title}</h1>
            <div style={{ fontSize: 13, color: 'var(--c-dim)' }}>
              Built in · {b.blurb}{online ? ' Play a classmate with the bar above the game, or press L to play both sides on one computer.' : ''}
            </div>
          </div>
          <button type="button" className="btn-run" onClick={() => setRunKey((k) => k + 1)}>
            {runKey === 0 ? '▶ Play' : '↻ Restart'}
          </button>
        </div>
        <div style={{ height: 'max(360px, calc(100vh - 230px))', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
          <MoshionPreview code={packForUrl(b.code)} runKey={runKey} gameKey={'demo-' + b.fence} />
        </div>
      </div>
    );
  }

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
  // Hold the frame back until the assets answer, so its first store already
  // has them (the frame reads its store once, before the sketch starts).
  const effectiveRunKey = assets ? runKey : 0;
  // A classmate's "just play" game: play only (the server says so; older answers mean yes).
  const canRemix = g.mine || g.canRemix !== false;
  return (
    <div style={wrap}>
      {back}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', margin: '6px 0 10px' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ fontSize: 22, margin: 0, overflowWrap: 'anywhere' }}>{g.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--c-dim)' }}>
            by {g.mine ? `${g.owner} (you)` : g.owner} · {g.modeLabel} · {CHOICE_TEXT.game[g.choice ?? 'credit'].short}
            {g.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
          </div>
          <RemixCreditLine from={g.remixedFrom} style={{ fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-run" onClick={() => setRunKey((k) => k + 1)}>
            {runKey === 0 ? '▶ Run' : '↻ Restart'}
          </button>
          {canRemix && (
            <>
              <button
                type="button"
                style={quiet}
                title={g.mine ? 'Put this game in your moSHion sandbox; Publish game there updates it' : 'Copy this game into your own moSHion sandbox to change it'}
                onClick={() => {
                  const ok = remixIntoSandbox(
                    { id: g.id, title: g.title, code: g.code, mine: g.mine, owner: g.owner, choice: g.choice, remixedFrom: g.remixedFrom },
                    undefined,
                    (m) => setNote(m),
                  );
                  if (ok) setNote('Opening your sandbox…');
                }}
              >
                {g.mine ? 'Open in sandbox' : 'Remix'}
              </button>
              <button type="button" style={quiet} aria-expanded={showCode} onClick={() => setShowCode((s) => !s)}>
                {showCode ? 'Hide code' : 'View code'}
              </button>
            </>
          )}
        </div>
      </div>
      {note && <div role="status" style={{ fontSize: 12, color: 'var(--c-green)', margin: '0 0 6px' }}>{note}</div>}
      {assets && assets.missing.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 6px' }}>
          Some pictures or sounds in this game aren&apos;t shared, so they won&apos;t show: {listWords(assets.missing)}.
          {g.mine ? '' : ` Ask ${g.owner} to share them.`}
        </p>
      )}
      <div style={{ height: 'max(360px, calc(100vh - 330px))', border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
        <MoshionPreview
          code={packForUrl(g.code)}
          runKey={effectiveRunKey}
          gameKey={'game-' + g.id}
          assets={assets?.list}
          assetsOwnWins={g.mine}
        />
      </div>
      <div style={{ height: 120, marginTop: 8, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="output-header">Console</div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Console
            resetKey={String(effectiveRunKey)}
            // The engine's "No texture named X" reads like a bug when X is the author's own picture they haven't shared.
            reword={(text) => {
              const m = /^No texture named "([^"]+)"/.exec(text);
              if (!m || !assets?.missing.includes(m[1])) return text;
              return `"${m[1]}" is one of ${g.owner}'s own pictures, and it isn't shared with the class, so it can't show here. Ask ${g.owner} to share it.`;
            }}
          />
        </div>
      </div>
      <GameSuggestions gameId={g.id} owner={g.owner} mine={g.mine} />
      {showCode && canRemix && (
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
