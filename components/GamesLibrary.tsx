'use client';

// The Library's Games section (migration 0042): "Yours", the games you
// published from the moSHion sandbox, each with Play, Open in sandbox, Share
// with class and Delete; and "Shared with your class", each with Play, Remix
// and the publisher's name (first name + last initial). Remix copies the code
// into your own sandbox draft (lib/games-client.ts asks first if that would
// replace work). A game only ever runs on /play, inside the sandboxed moSHion
// iframe.

import { useCallback, useEffect, useState } from 'react';
import {
  GAMES_CHANGED,
  deleteGame,
  getGame,
  listMyGames,
  listSharedGames,
  playHref,
  remixIntoSandbox,
  setGameShared,
  type MyGame,
  type SharedGame,
} from '../lib/games-client';
import { modeLabel } from '../lib/games-core';

const btn: React.CSSProperties = {
  fontSize: 12, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)', textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center',
};
const playBtn: React.CSSProperties = { ...btn, background: 'var(--c-green)', color: 'var(--c-deep)', border: '1px solid var(--c-green)', fontWeight: 600 };
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 8px',
  border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep2)',
};
const badge: React.CSSProperties = { fontSize: 11, color: 'var(--c-dim)', whiteSpace: 'nowrap' };

type Loaded<T> = { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'error'; text: string } | { kind: 'ok'; games: T[] };

export default function GamesLibrary({ onMessage }: { onMessage?: (text: string, bad: boolean) => void }) {
  const [mine, setMine] = useState<Loaded<MyGame>>({ kind: 'loading' });
  const [shared, setShared] = useState<Loaded<SharedGame>>({ kind: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  // Shown in this section, where the button was pressed (the panel's own
  // message line sits at the top, out of view by the time you reach Games).
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([listMyGames(), listSharedGames()]);
    setMine(a.ok ? { kind: 'ok', games: a.value.games } : a.status === 401 ? { kind: 'signed-out' } : { kind: 'error', text: a.error });
    // The class list leaves out your own games: they are already under "Yours".
    setShared(b.ok ? { kind: 'ok', games: b.value.games.filter((g) => !g.mine) } : b.status === 401 ? { kind: 'signed-out' } : { kind: 'error', text: b.error });
  }, []);
  useEffect(() => {
    void load();
    const on = () => { void load(); };
    window.addEventListener(GAMES_CHANGED, on);
    return () => window.removeEventListener(GAMES_CHANGED, on);
  }, [load]);

  const say = (text: string, bad = false) => { setNote({ text, bad }); onMessage?.(text, bad); };

  async function remix(id: string, mineToo: boolean) {
    setBusy(id);
    const r = await getGame(id);
    setBusy(null);
    if (!r.ok) { say(r.error, true); return; }
    const g = r.value.game;
    const done = remixIntoSandbox({ id: g.id, title: g.title, code: g.code, mine: mineToo && g.mine });
    if (done) say(`"${g.title}" is in your moSHion sandbox now. Press Run to play it, then change anything you like.`);
  }

  async function toggleShare(g: MyGame) {
    setBusy(g.id);
    const r = await setGameShared(g.id, !g.shared);
    setBusy(null);
    if (!r.ok) { say(r.error, true); return; }
    say(r.value.shared ? `"${g.title}" is shared with your class. They can play and remix it.` : `"${g.title}" is no longer shared with your class.`);
  }

  async function remove(g: MyGame) {
    if (!window.confirm(`Delete "${g.title}"?\n\nIt leaves your Library and your class's Games at once. Copies classmates already remixed stay theirs. Your sandbox code is not touched.`)) return;
    setBusy(g.id);
    const r = await deleteGame(g.id);
    setBusy(null);
    if (!r.ok) { say(r.error, true); return; }
    say(`Deleted "${g.title}".`);
  }

  if (mine.kind === 'signed-out') {
    return (
      <section aria-labelledby="games-h" style={{ marginTop: 18 }}>
        <h3 id="games-h" style={{ fontSize: 14, margin: '0 0 4px' }}>Games</h3>
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>Sign in to publish games and play the ones your class made.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="games-h" style={{ marginTop: 18 }}>
      <h3 id="games-h" style={{ fontSize: 14, margin: '0 0 4px' }}>Games</h3>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
        Games made in the moSHion sandbox with <strong style={{ color: 'var(--c-fg)' }}>Publish game</strong>.{' '}
        <strong style={{ color: 'var(--c-fg)' }}>Remix</strong> copies a game&apos;s code into your own sandbox so you can change it.
      </p>

      {note && (
        <div role="status" aria-live="polite" style={{ fontSize: 12, margin: '0 0 8px', color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {note.text}
        </div>
      )}
      <h4 style={{ fontSize: 13, margin: '10px 0 6px' }}>Yours</h4>
      {mine.kind === 'loading' && <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>Loading…</p>}
      {mine.kind === 'error' && <p style={{ fontSize: 13, color: 'var(--c-red)', margin: 0 }}>{mine.text}</p>}
      {mine.kind === 'ok' && !mine.games.length && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0, lineHeight: 1.5 }}>
          None yet. In the <a href="/sandbox/" style={{ color: 'var(--c-cyan)' }}>sandbox</a>, pick moSHion, make something,
          and press <strong style={{ color: 'var(--c-fg)' }}>Publish game</strong>.
        </p>
      )}
      {mine.kind === 'ok' && mine.games.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mine.games.map((g) => (
            <div key={g.id} style={rowStyle}>
              <div style={{ minWidth: 140, flex: '1 1 160px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
                <div style={badge}>
                  {modeLabel(g.mode, g.players)}
                  {g.shared ? <span style={{ color: 'var(--c-green)' }}> · shared with your class</span> : ' · only you'}
                </div>
              </div>
              <a href={playHref(g.id)} style={playBtn}>Play</a>
              <button type="button" style={btn} disabled={busy === g.id} onClick={() => void remix(g.id, true)}
                title="Put this game's code in your moSHion sandbox; Publish game there updates it">
                Open in sandbox
              </button>
              <button type="button" style={g.shared ? { ...btn, color: 'var(--c-green)' } : btn} aria-pressed={g.shared}
                disabled={busy === g.id} onClick={() => void toggleShare(g)}
                title={g.shared ? 'In your class' + "'" + 's Games. Click to take it out.' : 'Put this in your class' + "'" + 's Games so they can play and remix it.'}>
                {g.shared ? 'Shared with class ✓' : 'Share with class'}
              </button>
              <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy === g.id} onClick={() => void remove(g)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <h4 style={{ fontSize: 13, margin: '14px 0 6px' }}>Shared with your class</h4>
      {shared.kind === 'loading' && <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>Loading…</p>}
      {shared.kind === 'error' && <p style={{ fontSize: 13, color: 'var(--c-red)', margin: 0 }}>{shared.text}</p>}
      {shared.kind === 'ok' && !shared.games.length && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>No classmate has shared a game yet.</p>
      )}
      {shared.kind === 'ok' && shared.games.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shared.games.map((g) => (
            <div key={g.id} style={{ ...rowStyle, opacity: g.hidden ? 0.7 : 1 }}>
              <div style={{ minWidth: 140, flex: '1 1 160px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
                <div style={badge}>
                  by {g.owner} · {g.modeLabel}
                  {g.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
                </div>
              </div>
              <a href={playHref(g.id)} style={playBtn}>Play</a>
              <button type="button" style={btn} disabled={busy === g.id} onClick={() => void remix(g.id, false)}
                title="Copy this game's code into your own moSHion sandbox">
                Remix
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
