'use client';

// The Star button on /play: GitHub's starring in the game flow's plain words.
// One press stars the game (it shows in your Library -> Games -> Starred), a
// second press takes the star back. The count beside it opens who starred it.
// The GitHub term is named once, in the small line under the list (GITHUB_WORD.star).
// Route: GET|POST /api/games/[id]/star. `StarCount` is the read-only count the
// Library's rows show.

import { useEffect, useRef, useState } from 'react';
import { setGameStarred } from '../lib/games-client';
import { GITHUB_WORD } from '../lib/game-flow-core';
import { starWords, type StarView } from '../lib/game-stars';

const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z';

export function StarIcon({ on, size = 14 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
      <path d={STAR_PATH} fill={on ? 'var(--c-yellow)' : 'none'} stroke={on ? 'var(--c-yellow)' : 'currentColor'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Read-only star count for a game row; nothing when it has none. */
export function StarCount({ count, starred }: { count?: number; starred?: boolean }) {
  if (!count) return null;
  return (
    <span title={`${starWords(count)}${starred ? ', including yours' : ''}`} aria-label={starWords(count)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
      <StarIcon on={!!starred} size={12} />
      <span>{count}</span>
    </span>
  );
}

const half: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13,
  background: 'var(--c-deep2)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', cursor: 'pointer',
  fontFamily: 'inherit', minHeight: 36,
};

export default function GameStarButton({ gameId }: { gameId: string }) {
  const [view, setView] = useState<StarView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWho, setShowWho] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/games/${encodeURIComponent(gameId)}/star`, { credentials: 'same-origin' })
      .then(async (res) => (res.ok ? ((await res.json()) as StarView) : null))
      .then((v) => { if (live) setView(v); })
      .catch(() => { /* the game still plays; the button just does not appear */ });
    return () => { live = false; };
  }, [gameId]);

  // Close the "who starred it" list on a click elsewhere or Escape.
  useEffect(() => {
    if (!showWho) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setShowWho(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowWho(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [showWho]);

  if (!view) return null;

  async function toggle() {
    if (!view || busy) return;
    const on = !view.starred;
    setBusy(true);
    setError(null);
    // Show it at once, as GitHub does; put it back if the server refuses.
    const before = view;
    setView({ ...view, starred: on, count: view.count + (on ? 1 : -1), by: on ? ['You', ...view.by] : view.by.filter((n) => n !== 'You') });
    const r = await setGameStarred(gameId, on);
    setBusy(false);
    if (r.ok) setView(r.value);
    else { setView(before); setError(r.error); }
  }

  return (
    <div ref={wrap} style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div style={{ display: 'inline-flex' }}>
        <button
          type="button"
          aria-pressed={view.starred}
          disabled={busy || (!view.canStar && !view.starred)}
          onClick={() => void toggle()}
          title={view.starred ? 'Take your star back' : 'Star this game: it tells the maker you like it and keeps it in your Starred list'}
          style={{ ...half, borderRadius: '6px 0 0 6px', borderRight: 'none' }}
        >
          <StarIcon on={view.starred} />
          {view.starred ? 'Starred' : 'Star'}
        </button>
        <button
          type="button"
          aria-expanded={showWho}
          aria-label={`${starWords(view.count)}. Show who starred it`}
          onClick={() => setShowWho((s) => !s)}
          style={{ ...half, borderRadius: '0 6px 6px 0', fontWeight: 600, minWidth: 36, justifyContent: 'center' }}
        >
          {view.count}
        </button>
      </div>
      {showWho && (
        <div role="dialog" aria-label="Who starred this game" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30, width: 240, maxWidth: '80vw',
          padding: '10px 12px', borderRadius: 6, background: 'var(--c-bg)', border: '1px solid var(--c-line)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)', fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{view.count ? `Starred by ${view.count}` : 'No stars yet'}</div>
          {view.by.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 180, overflowY: 'auto', color: 'var(--c-dim)' }}>
              {view.by.map((n, i) => <li key={i} style={{ padding: '2px 0' }}>{n}</li>)}
            </ul>
          )}
          <div style={{ fontSize: 12, color: 'var(--c-dim)', marginTop: 6 }}>{GITHUB_WORD.star}</div>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 12, color: 'var(--c-red)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
