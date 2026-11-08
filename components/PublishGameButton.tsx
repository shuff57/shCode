'use client';

// "Publish game" in the moSHion sandbox toolbar (the Games library, migration
// 0042). Publishing saves the sketch's code as a game in the student's
// Library; shared with their class, classmates can play it on /play?game=<id>
// and remix it into their own sandbox. Publishing again updates the same game
// (lib/games-client.ts keeps which one in shCode:sandbox-game). The code only
// ever runs inside the sandboxed moSHion iframe, like any sketch.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import {
  GAMES_CHANGED,
  getGame,
  playHref,
  publishGame,
  readSandboxGame,
  setGameShared,
  writeSandboxGame,
} from '../lib/games-client';
import { GAME_TITLE_MAX, checkCode, cleanTitle, declaredMode, modeLabel } from '../lib/games-core';

const chip: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-comment)',
  border: '1px solid var(--c-line)',
  cursor: 'pointer',
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
const primary: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: 'var(--c-green)', color: 'var(--c-deep)',
};
const quiet: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};

interface Published { id: string; title: string; shared: boolean }

export default function PublishGameButton({ getCode }: { getCode: () => string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [share, setShare] = useState(true);
  const [published, setPublished] = useState<Published | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [declared, setDeclared] = useState('1 player');
  const wrapRef = useRef<HTMLDivElement>(null);

  // What the sandbox draft is published as, checked against the server (a
  // deleted game, or another account on this browser, reads as unpublished).
  const refresh = useCallback(async () => {
    const rec = readSandboxGame();
    setTitle((t) => t || rec.title);
    if (!rec.id) { setPublished(null); setTitle(rec.title); return; }
    const r = await getGame(rec.id);
    if (r.ok && r.value.game.mine) {
      setPublished({ id: rec.id, title: r.value.game.title, shared: !!r.value.game.shared });
      setShare(!!r.value.game.shared);
      setTitle(rec.title || r.value.game.title);
    } else if (!r.ok && r.status === 404) {
      writeSandboxGame({ id: null, title: rec.title });
      setPublished(null);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const on = () => { setTitle(''); void refresh(); };
    window.addEventListener(GAMES_CHANGED, on);
    return () => window.removeEventListener(GAMES_CHANGED, on);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const d = declaredMode(getCode());
    setDeclared(modeLabel(d.mode, d.players));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open, getCode]);

  async function go(asNew: boolean) {
    setNote(null);
    const t = cleanTitle(title);
    if ('error' in t) { setNote({ text: t.error, bad: true }); return; }
    const c = checkCode(getCode());
    if ('error' in c) { setNote({ text: c.error, bad: true }); return; }
    setBusy(true);
    const r = await publishGame(t.title, c.code, asNew ? null : published?.id ?? null);
    if (!r.ok) { setBusy(false); setNote({ text: r.error, bad: true }); return; }
    const id = r.value.game.id;
    writeSandboxGame({ id, title: t.title });
    let shared = published && published.id === id ? published.shared : false;
    let shareNote = '';
    if (share !== shared) {
      const s = await setGameShared(id, share);
      if (s.ok) shared = s.value.shared;
      else shareNote = ` It is not shared yet: ${s.error}`;
    }
    setBusy(false);
    setPublished({ id, title: t.title, shared });
    setTitle(t.title);
    setNote({
      text: (r.value.created ? `Published "${t.title}".` : `Updated "${t.title}".`)
        + (shared ? ' Your class can play and remix it from Library → Games.' : ' Only you can see it until you share it with your class.')
        + shareNote,
      bad: !!shareNote,
    });
  }

  const label = published ? 'Published ✓' : 'Publish game';
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        style={published ? { ...chip, color: 'var(--c-green)', borderColor: 'color-mix(in srgb, var(--c-green) 53%, transparent)' } : chip}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={published ? `Published as "${published.title}". Click to update it.` : 'Publish this sketch so your class can play and remix it.'}
        onClick={() => { setOpen((o) => !o); setNote(null); }}
      >
        <Gamepad2 size={12} />
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Publish game"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 'min(360px, calc(100vw - 32px))',
            background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6, padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'var(--c-fg)', fontSize: 13, lineHeight: 1.5,
          }}
        >
          <h2 style={{ fontSize: 14, margin: '0 0 6px' }}>{published ? 'Update your game' : 'Publish this sketch as a game'}</h2>
          <p style={{ margin: '0 0 8px', color: 'var(--c-dim)' }}>
            Publishing saves this code as a game in your Library. Shared with your class, classmates
            can <strong style={{ color: 'var(--c-fg)' }}>play</strong> it on its own page and{' '}
            <strong style={{ color: 'var(--c-fg)' }}>remix</strong> it (copy the code into their own sandbox to change it).
            {published ? ' Publishing again replaces the code they get.' : ''}
          </p>
          {published && (
            <p style={{ margin: '0 0 8px' }}>
              Published as <strong>&ldquo;{published.title}&rdquo;</strong>
              {' · '}
              <span style={{ color: published.shared ? 'var(--c-green)' : 'var(--c-dim)' }}>
                {published.shared ? 'shared with your class' : 'not shared'}
              </span>
              {' · '}
              <a href={playHref(published.id)} style={{ color: 'var(--c-cyan)' }}>Play page</a>
            </p>
          )}
          <label style={{ display: 'block', margin: '0 0 4px' }} htmlFor="publish-game-title">Title</label>
          <input
            id="publish-game-title"
            value={title}
            maxLength={GAME_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void go(false); }}
            placeholder="Pong Duel"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 4, fontSize: 13,
              background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
            }}
          />
          <div style={{ color: 'var(--c-dim)', fontSize: 12, margin: '4px 0 8px' }}>
            This sketch says: {declared}.
            {declared === '1 player' && <> Add <code>multiplayer(&apos;versus&apos;, 2)</code> in <code>setup()</code> to play a classmate online.</>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 10px' }}>
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Share with my class
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={{ ...primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => void go(false)}>
              {busy ? 'Publishing…' : published ? 'Update game' : 'Publish'}
            </button>
            {published && (
              <button type="button" style={quiet} disabled={busy} onClick={() => void go(true)} title="Keep the old game and publish this as another one">
                Publish as a new game
              </button>
            )}
            <button type="button" style={quiet} onClick={() => setOpen(false)}>Close</button>
          </div>
          {note && (
            <div role="status" aria-live="polite" style={{ marginTop: 8, color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
              {note.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
