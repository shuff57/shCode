'use client';

// The Library's Games tab (migration 0042): "My games", the games you
// published from the moSHion sandbox, each with Play, Open in sandbox, Share
// with class and Delete; "Class games", each with Play, Remix and the
// publisher's name (first name + last initial); then the built-in games. Remix copies the code
// into your own sandbox draft (lib/games-client.ts asks first if that would
// replace work). A game only ever runs on /play, inside the sandboxed moSHion
// iframe.
//
// Sharing choices (lib/share-choice.ts): Share with class opens a chooser
// (ShareChoicePicker) under the row: who may do what with the game, defaulting
// to the student's last choice, locked to "keep remixes open" for a remix of a
// game that asked for that. A classmate's "just play" game has no Remix. A
// remix shows "Remixed from <title> by <name>".
//
// Versions and proposed changes (migration 0048, lib/game-flow-core.ts): each game links to its
// History and its proposed changes (/changes?game=<id>), "Proposed changes" lists the conversations
// that concern the student (GameChangesInbox), and Remix says how to send a change back.

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
import { modeLabel, type GameMode } from '../lib/games-core';
import { CHOICE_TEXT, canRemix, type ShareChoice } from '../lib/share-choice';
import { sectionHeading, sectionNote, sectionStyle } from './library-ui';
import ShareChoicePicker, { RemixCreditLine, lockedChoice, useLastChoice } from './ShareChoicePicker';
import GameChangesInbox from './GameChangesInbox';
import { gameChangesHref } from '../lib/game-flow-client';

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

// Built-in games (public/builtin-games.json, made from the lesson demos by
// scripts/generate-builtin-games.mjs): PLAY ONLY, no Remix and no code, because
// they are the games students build in Trail, Checkers and Quest.
interface Builtin { id: string; title: string; blurb: string; mode: GameMode; players: number }
function BuiltinGames() {
  const [games, setGames] = useState<Builtin[] | null>(null);
  useEffect(() => {
    fetch('/builtin-games.json').then((r) => (r.ok ? r.json() : null))
      .then((d: { games: Builtin[] } | null) => setGames(d?.games ?? []))
      .catch(() => setGames([]));
  }, []);
  if (games && games.length === 0) return null;
  return (
    <section aria-labelledby="games-builtin-h" style={sectionStyle}>
      <h3 id="games-builtin-h" style={sectionHeading}>Built in ({games ? games.length : '…'})</h3>
      <p style={sectionNote}>The games you build in the lessons, ready to play.</p>
      {games && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {games.map((g) => (
          <div key={g.id} style={rowStyle}>
            <div style={{ minWidth: 140, flex: '1 1 160px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
              <div style={{ ...badge, whiteSpace: 'normal' }}>{modeLabel(g.mode, g.players)} · {g.blurb}</div>
            </div>
            <a href={`/play/?builtin=${g.id}`} style={playBtn}>Play</a>
          </div>
        ))}
      </div>}
    </section>
  );
}

type Loaded<T> = { kind: 'loading' } | { kind: 'signed-out' } | { kind: 'error'; text: string } | { kind: 'ok'; games: T[] };

export default function GamesLibrary({ onMessage }: { onMessage?: (text: string, bad: boolean) => void }) {
  const [mine, setMine] = useState<Loaded<MyGame>>({ kind: 'loading' });
  const [shared, setShared] = useState<Loaded<SharedGame>>({ kind: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  // Shown in this section, where the button was pressed (the panel's own
  // message line sits at the top, out of view by the time you reach Games).
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  /** The game whose sharing chooser is open, and the choice picked in it. */
  const [choosing, setChoosing] = useState<{ id: string; choice: ShareChoice } | null>(null);
  const [lastChoice, rememberChoice] = useLastChoice('game');

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([listMyGames(), listSharedGames()]);
    setMine(a.ok ? { kind: 'ok', games: a.value.games } : a.status === 401 ? { kind: 'signed-out' } : { kind: 'error', text: a.error });
    // The class list leaves out your own games: they are already under "My games".
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
    const done = remixIntoSandbox(
      { id: g.id, title: g.title, code: g.code, mine: mineToo && g.mine, owner: g.owner, choice: g.choice, remixedFrom: g.remixedFrom, version: g.version },
      undefined,
      (m) => say(m, true),
    );
    if (done) {
      say(mineToo && g.mine
        ? `"${g.title}" is in your moSHion sandbox now. Press Run to play it, then change anything you like.`
        : `"${g.title}" is in your moSHion sandbox now. Change anything you like, then press Propose change to send it back to ${g.owner}.`);
    }
  }

  function openChooser(g: MyGame) {
    if (choosing?.id === g.id) { setChoosing(null); return; }
    setChoosing({ id: g.id, choice: lockedChoice(g.remixedFrom, g.shared ? g.choice : lastChoice) });
  }

  async function applyShare(g: MyGame, share: boolean) {
    const choice = choosing?.id === g.id ? choosing.choice : g.choice;
    setBusy(g.id);
    const r = await setGameShared(g.id, share, share ? choice : undefined);
    setBusy(null);
    if (!r.ok) { say(r.error, true); return; }
    setChoosing(null);
    if (!r.value.shared) { say(`"${g.title}" is no longer shared with your class.`); return; }
    rememberChoice(r.value.choice ?? choice);
    say((r.value.choice ?? choice) === 'play'
      ? `"${g.title}" is shared with your class. They can play it.`
      : `"${g.title}" is shared with your class. They can play and remix it.`);
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
      <div style={{ marginTop: 8 }}>
        <p style={{ ...sectionNote, margin: 0 }}>Sign in to publish games and play the ones your class made.</p>
        <BuiltinGames />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ ...sectionNote, margin: '0 0 8px' }}>
        Games made in the moSHion sandbox with <strong style={{ color: 'var(--c-fg)' }}>Publish game</strong>.{' '}
        <strong style={{ color: 'var(--c-fg)' }}>Remix</strong> copies a game&apos;s code into your own sandbox so you can change it.
      </p>

      {note && (
        <div role="status" aria-live="polite" style={{ fontSize: 12, margin: '0 0 8px', color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {note.text}
        </div>
      )}
      <section aria-labelledby="games-mine-h" style={{ marginTop: 8 }}>
      <h3 id="games-mine-h" style={{ ...sectionHeading, margin: '0 0 6px' }}>My games ({mine.kind === 'ok' ? mine.games.length : '…'})</h3>
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
              <div style={{ minWidth: 200, flex: '1 1 240px' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</div>
                <div style={{ ...badge, whiteSpace: 'normal' }}>
                  {modeLabel(g.mode, g.players)}{g.version ? ` · version ${g.version}` : ''}
                  {g.shared
                    ? <span style={{ color: 'var(--c-green)' }}> · shared with your class ({CHOICE_TEXT.game[g.choice ?? 'credit'].short})</span>
                    : ' · only you'}
                </div>
                <RemixCreditLine from={g.remixedFrom} />
              </div>
              <a href={playHref(g.id)} style={playBtn}>Play</a>
              <button type="button" style={btn} disabled={busy === g.id} onClick={() => void remix(g.id, true)}
                title="Put this game's code in your moSHion sandbox; Publish game there updates it">
                Open in sandbox
              </button>
              <button type="button" style={g.shared ? { ...btn, color: 'var(--c-green)' } : btn}
                aria-expanded={choosing?.id === g.id}
                disabled={busy === g.id} onClick={() => openChooser(g)}
                title={g.shared ? 'In your class' + "'" + 's Games. Click to change who can do what, or stop sharing.' : 'Put this in your class' + "'" + 's Games.'}>
                {g.shared ? 'Shared with class ✓' : 'Share with class'}
              </button>
              <a href={gameChangesHref(g.id, 'history')} style={btn} title="Every version of this game, with what changed">History</a>
              <a href={gameChangesHref(g.id)} style={g.openChanges ? { ...btn, color: 'var(--c-orange)', borderColor: 'color-mix(in srgb, var(--c-orange) 55%, transparent)' } : btn}
                title="Changes classmates proposed to this game">
                {g.openChanges ? `${g.openChanges} proposed ${g.openChanges === 1 ? 'change' : 'changes'}` : 'Proposed changes'}
              </a>
              <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy === g.id} onClick={() => void remove(g)}>Delete</button>
              {choosing?.id === g.id && (
                <div style={{ flex: '1 1 100%', minWidth: 0, marginTop: 4 }}>
                  <ShareChoicePicker thing="game" value={choosing.choice} from={g.remixedFrom} idPrefix={`game-share-${g.id}`} compact
                    onChange={(c) => setChoosing({ id: g.id, choice: c })} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" style={playBtn} disabled={busy === g.id} onClick={() => void applyShare(g, true)}>
                      {g.shared ? 'Save' : 'Share with my class'}
                    </button>
                    {g.shared && (
                      <button type="button" style={btn} disabled={busy === g.id} onClick={() => void applyShare(g, false)}>Stop sharing</button>
                    )}
                    <button type="button" style={btn} onClick={() => setChoosing(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </section>

      <GameChangesInbox />

      <section aria-labelledby="games-class-h" style={sectionStyle}>
      <h3 id="games-class-h" style={{ ...sectionHeading, margin: '0 0 6px' }}>Class games ({shared.kind === 'ok' ? shared.games.length : '…'})</h3>
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
                  by {g.owner} · {g.modeLabel} · {CHOICE_TEXT.game[g.choice ?? 'credit'].short}
                  {g.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
                </div>
                <RemixCreditLine from={g.remixedFrom} />
              </div>
              <a href={playHref(g.id)} style={playBtn}>Play</a>
              {canRemix(g.choice) && (
                <button type="button" style={btn} disabled={busy === g.id} onClick={() => void remix(g.id, false)}
                  title="Copy this game's code into your own moSHion sandbox">
                  Remix
                </button>
              )}
              {canRemix(g.choice) && (
                <a href={gameChangesHref(g.id)} style={btn} title="Proposed changes to this game, and their conversations">Changes</a>
              )}
            </div>
          ))}
        </div>
      )}
      </section>

      <BuiltinGames />
    </div>
  );
}
