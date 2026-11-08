'use client';

// The lobby bar a moSHion sketch gets when it calls multiplayer('versus' | 'coop', n)
// (public/moshion/extras.js). It sits on the page above the canvas, never in it:
// Host makes a room for n players with this page's game key, Join takes a typed
// code, and Open rooms lists classmates' rooms for THIS game (GET /api/rooms?game=),
// refreshed every few seconds while the bar is showing and you are not in a room.
// The room calls themselves live in lib/moshion-online.ts, which also tells the
// sketch which room it is in.

import { useEffect, useState } from 'react';
import type { LobbyActions, LobbyView } from '../lib/moshion-online';
import { ROOM_CODE_LENGTH, ROOM_CODE_LETTERS, ROOM_ICONS, codeIcons, iconForLetter, roomIconSrc } from '../lib/room-icons';

const LIST_MS = 3000;

interface OpenRoom { code: string; host: string; seats: number; present: number; here: boolean }
type ListState =
  | { kind: 'loading' }
  | { kind: 'rooms'; rooms: OpenRoom[] }
  | { kind: 'signed-out' }
  | { kind: 'no-class' }
  | { kind: 'error'; text: string };

const bar: React.CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 10px',
  background: 'var(--c-deep2)',
  borderBottom: '1px solid var(--c-line)',
  color: 'var(--c-fg)',
  fontSize: '0.8rem',
  lineHeight: 1.35,
  maxHeight: '60%',
  overflowY: 'auto',
  minWidth: 0,
};
const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minWidth: 0 };
const btn: React.CSSProperties = {
  background: 'var(--c-purple)',
  color: 'var(--c-deep)',
  border: 'none',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const quiet: React.CSSProperties = {
  ...btn,
  background: 'transparent',
  color: 'var(--c-fg)',
  border: '1px solid var(--c-line)',
  fontWeight: 500,
};
const dim: React.CSSProperties = { color: 'var(--c-dim)' };

/** One picture of a room code. Decorative where its name is said beside it. */
function Pic({ icon, size, label }: { icon: string; size: number; label?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={roomIconSrc(icon)}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
      style={{ imageRendering: 'pixelated', display: 'block', width: size, height: size }}
    />
  );
}

/** A code as pictures in a row, with each letter small underneath (big = the host's view). */
function CodePictures({ code, size, letters }: { code: string; size: number; letters: boolean }) {
  const icons = codeIcons(code);
  if (!icons) {
    // An old 6-letter code (a room made before picture codes): letters only.
    return <strong style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.12em', color: 'var(--c-cyan)' }}>{code}</strong>;
  }
  return (
    <span role="img" aria-label={`Room code ${icons.join(', ')} (${code})`} style={{ display: 'inline-flex', gap: size > 30 ? 6 : 2, alignItems: 'flex-start' }}>
      {icons.map((icon, i) => (
        <span key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <Pic icon={icon} size={size} />
          {letters ? <span style={{ fontSize: '0.68rem', color: 'var(--c-dim)', fontFamily: 'var(--font-mono, monospace)' }}>{code[i]}</span> : null}
        </span>
      ))}
    </span>
  );
}

function modeName(mode: LobbyView['mode']): string {
  return mode === 'versus' ? 'Versus' : 'Co-op';
}

export default function MoshionLobby({ view, actions, gameKey, device }: {
  view: LobbyView;
  actions: LobbyActions;
  gameKey: string;
  device: string;
}) {
  const [typed, setTyped] = useState('');
  const [list, setList] = useState<ListState>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);
  const inRoom = !!view.room;

  // The open-rooms list, while not in a room.
  useEffect(() => {
    if (inRoom) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function load() {
      try {
        const res = await fetch(`/api/rooms?game=${encodeURIComponent(gameKey)}&device=${encodeURIComponent(device)}`, { credentials: 'same-origin' });
        if (!live) return;
        if (res.status === 401) setList({ kind: 'signed-out' });
        else if (!res.ok) {
          let text = `Could not load open rooms (${res.status}).`;
          try { const b = await res.json(); if (typeof b?.error === 'string') text = b.error; } catch { /* keep */ }
          setList({ kind: 'error', text });
        } else {
          const b = await res.json() as { inClass?: boolean; rooms?: OpenRoom[] };
          setList(b.inClass === false ? { kind: 'no-class' } : { kind: 'rooms', rooms: Array.isArray(b.rooms) ? b.rooms : [] });
        }
      } catch {
        if (live) setList({ kind: 'error', text: 'Could not reach the server. Trying again.' });
      }
      if (live) timer = setTimeout(() => void load(), document.hidden ? LIST_MS * 3 : LIST_MS);
    }
    void load();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [inRoom, gameKey, device]);

  const title = `${modeName(view.mode)} · ${view.players} players`;
  const blocked = !inRoom && (list.kind === 'signed-out' || list.kind === 'no-class');

  if (view.room) {
    const r = view.room;
    const here = r.players.length ? r.players.filter((p) => !p.left).length : 1;
    const names = r.players.filter((p) => !p.left).map((p) => p.name).join(', ');
    const copy = async () => {
      try { await navigator.clipboard.writeText(r.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked: the code is on screen */ }
    };
    return (
      <div style={bar} role="region" aria-label="Online game room" data-testid="moshion-lobby">
        <div style={row}>
          <span style={dim}>Room</span>
          <span data-testid="lobby-code" data-code={r.code}><CodePictures code={r.code} size={48} letters /></span>
          <button type="button" style={quiet} onClick={() => void copy()} aria-label={`Copy room code ${r.code}`}>{copied ? 'Copied' : 'Copy'}</button>
          <span data-testid="lobby-status" aria-live="polite">
            {here} of {r.seats} here · you are player {r.seat + 1}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" style={quiet} onClick={() => actions.leave()}>Leave</button>
        </div>
        <div style={{ ...row, ...dim }}>
          {r.state === 'ready'
            ? <span>Everyone is here. Play!</span>
            : <span>Waiting for {Math.max(1, r.seats - here)} more {r.seats - here === 1 ? 'player' : 'players'}{r.hosting ? ': classmates can pick this room from Open rooms, or type the code.' : '.'}</span>}
          {names ? <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>({names})</span> : null}
        </div>
        {view.error ? <div role="alert" style={{ color: 'var(--c-red)' }}>{view.error}</div> : null}
      </div>
    );
  }

  return (
    <div style={bar} role="region" aria-label="Online game lobby" data-testid="moshion-lobby">
      <div style={row}>
        <strong>{title}</strong>
        <span style={dim}>online with classmates</span>
      </div>
      {blocked ? (
        <div data-testid="lobby-blocked">Sign in and join a class to play online.</div>
      ) : (
        <>
          <div style={row}>
            <button type="button" style={btn} disabled={view.busy} onClick={() => actions.host()}>
              Host a room
            </button>
            <form
              style={{ ...row, flexWrap: 'nowrap' }}
              onSubmit={(e) => { e.preventDefault(); actions.join(typed); }}
            >
              <label htmlFor="moshion-lobby-code" style={dim}>Code</label>
              <input
                id="moshion-lobby-code"
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                placeholder="BHKE"
                style={{
                  width: '6em', minWidth: 0, padding: '3px 6px', fontSize: '0.8rem',
                  background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4,
                  fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.08em',
                }}
              />
              <button type="submit" style={quiet} disabled={view.busy || !typed.trim()}>Join</button>
            </form>
          </div>
          <PicturePicker typed={typed} setTyped={setTyped} busy={view.busy} />
          <div>
            <div style={{ ...dim, marginBottom: 2 }}>Open rooms for this game</div>
            {list.kind === 'loading' ? <div style={dim}>Looking for rooms...</div> : null}
            {list.kind === 'error' ? <div style={dim}>{list.text}</div> : null}
            {list.kind === 'rooms' && list.rooms.length === 0 ? (
              <div style={dim}>No open rooms yet. Host one, or wait for a classmate to.</div>
            ) : null}
            {list.kind === 'rooms' && list.rooms.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }} data-testid="lobby-rooms">
                {list.rooms.map((r) => (
                  <li key={r.code} style={row}>
                    <CodePictures code={r.code} size={22} letters={false} />
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{r.host}</span>
                    <span style={dim}>{r.present} of {r.seats} here</span>
                    <button
                      type="button"
                      style={quiet}
                      disabled={view.busy}
                      onClick={() => actions.join(r.code)}
                      aria-label={`${r.here ? 'Rejoin' : 'Join'} ${r.host}'s room, ${r.present} of ${r.seats} here`}
                    >
                      {r.here ? 'Rejoin' : 'Join'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div style={{ ...dim, fontSize: '0.72rem' }}>
            Moves travel about once a second, so this suits turn-based and slower games.
          </div>
        </>
      )}
      {view.notice ? <div aria-live="polite" style={{ color: 'var(--c-orange)' }}>{view.notice}</div> : null}
      {view.error ? <div role="alert" style={{ color: 'var(--c-red)' }}>{view.error}</div> : null}
    </div>
  );
}

/**
 * Join by pictures: click the host's 4 pictures in order. Each click adds that
 * picture's letter to the same code the text box holds, so typing and picking
 * are one code; Back takes the last one off, Clear empties it.
 */
function PicturePicker({ typed, setTyped, busy }: { typed: string; setTyped: (v: string) => void; busy: boolean }) {
  const picked = Array.from(typed).map(iconForLetter);
  const isPictures = typed.length <= ROOM_CODE_LENGTH && picked.every((x) => x !== null);
  const full = isPictures && typed.length === ROOM_CODE_LENGTH;
  const slot: React.CSSProperties = {
    width: 30, height: 30, border: '1px dashed var(--c-line)', borderRadius: 4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-bg)',
  };
  return (
    <div role="group" aria-label="Join with pictures" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={row}>
        <span style={dim}>Or pick the 4 pictures in order:</span>
        <span style={{ display: 'inline-flex', gap: 3 }} aria-live="polite" data-testid="lobby-picked">
          {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => {
            const icon = isPictures ? picked[i] : null;
            return (
              <span key={i} style={slot}>
                {icon ? <Pic icon={icon} size={24} label={icon} /> : <span className="sr-only">empty</span>}
              </span>
            );
          })}
        </span>
        <button type="button" style={quiet} disabled={!typed} onClick={() => setTyped(typed.slice(0, -1))}>Back</button>
        <button type="button" style={quiet} disabled={!typed} onClick={() => setTyped('')}>Clear</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {ROOM_ICONS.map((icon, i) => (
          <button
            key={icon}
            type="button"
            aria-label={icon}
            title={`${icon} (${ROOM_CODE_LETTERS[i]})`}
            disabled={busy || (isPictures && full) || (!isPictures && typed.length > 0)}
            onClick={() => setTyped((isPictures ? typed : '') + ROOM_CODE_LETTERS[i])}
            style={{
              width: 34, height: 34, padding: 2, borderRadius: 4, cursor: 'pointer',
              background: 'var(--c-bg)', border: '1px solid var(--c-line)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Pic icon={icon} size={26} />
          </button>
        ))}
      </div>
    </div>
  );
}
