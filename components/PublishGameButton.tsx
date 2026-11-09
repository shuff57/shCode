'use client';

// "Publish game" in the moSHion sandbox toolbar (the Games library, migration
// 0042). Publishing saves the sketch's code as a game in the student's
// Library; shared with their class, classmates can play it on /play?game=<id>
// and remix it into their own sandbox. Publishing again updates the same game
// (lib/games-client.ts keeps which one in shCode:sandbox-game). The code only
// ever runs inside the sandboxed moSHion iframe, like any sketch.
//
// A game stores only its code: the student's own saved pictures (textures) and
// sounds it loads by name reach a classmate only when they are shared with the
// class (GET /api/games/[id]/assets serves the shared ones on /play). So the
// panel lists the ones this code uses, says which are shared, and offers to
// share the rest. It never blocks publishing.

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
import { GAME_TITLE_MAX, checkCode, cleanTitle, declaredMode, modeLabel, usedItems } from '../lib/games-core';
import { LIBRARY_SHARES_CHANGED, LIBRARY_SYNC_STATUS, accountItems, setShared } from '../lib/library-sync';
import { LIBRARY_UPDATED, localLibraryItems, type LibraryKind } from '../lib/moshion-storage';
import { builtinTextureNames, listWords } from '../lib/game-assets';

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

/** One of the student's own items the code uses. `local` = only in this browser, not in the account yet. */
interface UsedItem { kind: LibraryKind; name: string; state: 'shared' | 'not-shared' | 'local' }

/** The student's own pictures and sounds `code` uses, account copy first, then this browser's. */
async function findUsedItems(code: string): Promise<UsedItem[]> {
  const builtins = await builtinTextureNames();
  const byKey = new Map<string, UsedItem>();
  for (const a of accountItems()) byKey.set(`${a.kind}:${a.name}`, { kind: a.kind, name: a.name, state: a.shared ? 'shared' : 'not-shared' });
  for (const l of localLibraryItems()) {
    const k = `${l.kind}:${l.name}`;
    if (!byKey.has(k)) byKey.set(k, { kind: l.kind, name: l.name, state: 'local' });
  }
  return usedItems(code, [...byKey.values()], builtins)
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'texture' ? -1 : 1));
}

/** "Your game uses your pictures: hero and coin, and your sound: jump." */
function usesSentence(used: UsedItem[]): string {
  const pics = used.filter((u) => u.kind === 'texture').map((u) => u.name);
  const snds = used.filter((u) => u.kind === 'sound').map((u) => u.name);
  const parts: string[] = [];
  if (pics.length) parts.push(`your ${pics.length === 1 ? 'picture' : 'pictures'}: ${listWords(pics)}`);
  if (snds.length) parts.push(`your ${snds.length === 1 ? 'sound' : 'sounds'}: ${listWords(snds)}`);
  return `Your game uses ${parts.join(', and ')}.`;
}

export default function PublishGameButton({ getCode }: { getCode: () => string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [share, setShare] = useState(true);
  const [published, setPublished] = useState<Published | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [declared, setDeclared] = useState('1 player');
  const [used, setUsed] = useState<UsedItem[]>([]);
  const [sharingItems, setSharingItems] = useState(false);
  const [itemsNote, setItemsNote] = useState<{ text: string; bad: boolean } | null>(null);
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

  // Which of the student's own pictures and sounds the code uses, kept fresh
  // while the panel is open (a sync finishing or a share changing moves them).
  useEffect(() => {
    if (!open) { setUsed([]); setItemsNote(null); return; }
    let live = true;
    const recompute = () => { void findUsedItems(getCode()).then((u) => { if (live) setUsed(u); }); };
    recompute();
    for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.addEventListener(ev, recompute);
    return () => {
      live = false;
      for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.removeEventListener(ev, recompute);
    };
  }, [open, getCode]);

  async function shareUsed() {
    const todo = used.filter((u) => u.state === 'not-shared');
    if (!todo.length) return;
    setSharingItems(true);
    setItemsNote(null);
    const errors: string[] = [];
    const done: string[] = [];
    for (const u of todo) {
      const err = await setShared(u.kind, u.name, true);
      if (err) errors.push(err);
      else done.push(u.name);
    }
    setSharingItems(false);
    setUsed(await findUsedItems(getCode()));
    if (errors.length) {
      setItemsNote({ text: (done.length ? `Shared ${listWords(done)}. ` : '') + [...new Set(errors)].join(' '), bad: true });
    } else {
      setItemsNote({ text: `Shared ${listWords(done)} with your class.`, bad: false });
    }
  }

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
          {used.length > 0 && (
            <div style={{ margin: '0 0 10px', padding: '8px 10px', border: '1px solid var(--c-line)', borderRadius: 4 }}>
              <p style={{ margin: '0 0 4px' }}>{usesSentence(used)}</p>
              <ul style={{ margin: '0 0 6px', padding: 0, listStyle: 'none', fontSize: 12 }}>
                {used.map((u) => (
                  <li key={`${u.kind}:${u.name}`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ overflowWrap: 'anywhere' }}>{u.name}</span>
                    <span style={{ color: 'var(--c-dim)' }}>({u.kind === 'texture' ? 'picture' : 'sound'})</span>
                    <span style={{ color: u.state === 'shared' ? 'var(--c-green)' : u.state === 'not-shared' ? 'var(--c-orange)' : 'var(--c-dim)' }}>
                      {u.state === 'shared' ? 'Shared ✓' : u.state === 'not-shared' ? 'Not shared with your class' : 'Not saved to your account yet'}
                    </span>
                  </li>
                ))}
              </ul>
              {used.some((u) => u.state !== 'shared') && (
                <p style={{ margin: '0 0 6px', color: 'var(--c-dim)', fontSize: 12 }}>
                  Classmates only see pictures and sounds you share with your class.
                  {used.some((u) => u.state === 'local') && ' One that is not saved to your account yet cannot be shared: it saves there by itself in a moment, then you can share it.'}
                </p>
              )}
              {used.some((u) => u.state === 'not-shared') && (
                <button
                  type="button"
                  style={{ ...quiet, fontSize: 12, padding: '4px 10px', opacity: sharingItems ? 0.6 : 1 }}
                  disabled={sharingItems}
                  onClick={() => void shareUsed()}
                >
                  {sharingItems ? 'Sharing…' : 'Share them with my class'}
                </button>
              )}
              {itemsNote && (
                <div role="status" aria-live="polite" style={{ marginTop: 6, fontSize: 12, color: itemsNote.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
                  {itemsNote.text}
                </div>
              )}
            </div>
          )}
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
