'use client';

// Suggestions on a class game (#96), under the game on /play. A classmate picks
// any of a fixed list (lib/game-suggestions.ts) to help the author; picking one
// again takes it back. Nothing is typed, so nothing here is chat. The author
// sees how many picked each one and who; a classmate sees the counts and their
// own picks. Route: GET|POST /api/games/[id]/suggestions. With feedback turned
// off (the creator's or a teacher's switch, migration 0051) a classmate sees no
// panel at all.

import { useEffect, useState } from 'react';
import type { SuggestionsView } from '../lib/game-suggestions';
import { errorText } from '../lib/http-error';

interface Props {
  gameId: string;
  owner: string;
  mine: boolean;
}

export default function GameSuggestions({ gameId, owner, mine }: Props) {
  const [view, setView] = useState<SuggestionsView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/games/${encodeURIComponent(gameId)}/suggestions`, { credentials: 'same-origin' })
      .then(async (res) => (res.ok ? ((await res.json()) as SuggestionsView) : null))
      .then((v) => { if (live) setView(v); })
      .catch(() => { /* the game still plays; the panel just does not appear */ });
    return () => { live = false; };
  }, [gameId]);

  if (!view) return null;
  // Feedback closed to this reader (migration 0051): nothing to show a classmate.
  // The creator and the class's teachers still see the counts (GameComments says why it is closed).
  if (view.closed && !mine && !view.who) return null;

  async function toggle(id: string, on: boolean) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}/suggestions`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion: id, on }),
      });
      if (!res.ok) { setError(await errorText(res)); return; }
      setView((await res.json()) as SuggestionsView);
    } catch {
      setError('Could not reach shCode. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  }

  const total = Object.values(view.counts).reduce((a, n) => a + n, 0);
  const heading = mine ? 'What players suggest' : `Suggest something to ${owner}`;
  const hint = mine
    ? (total ? 'Classmates who played your game picked these.' : 'No suggestions yet. Classmates who play your game can pick some.')
    : `Pick any that fit. Pick one again to take it back. ${owner} sees what you pick.`;
  const shown = mine ? view.options.filter((o) => view.counts[o.id]) : view.options;

  return (
    <section aria-labelledby="game-suggestions-h" style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--c-line)', borderRadius: 6 }}>
      <h2 id="game-suggestions-h" style={{ fontSize: 15, margin: '0 0 4px' }}>{heading}</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 8px' }}>{hint}</p>
      {shown.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {shown.map((o) => {
            const n = view.counts[o.id] ?? 0;
            const picked = view.mine.includes(o.id);
            const names = view.who?.[o.id];
            const label = `${o.text}${n ? ` (${n})` : ''}`;
            if (!view.canSuggest) {
              return (
                <span key={o.id} title={names?.join(', ')}
                  style={{ fontSize: 13, padding: '5px 10px', borderRadius: 14, border: '1px solid var(--c-line)' }}>
                  {label}{names?.length ? <span style={{ color: 'var(--c-dim)' }}> · {names.join(', ')}</span> : null}
                </span>
              );
            }
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={picked}
                disabled={busy !== null}
                title={names?.length ? names.join(', ') : undefined}
                onClick={() => toggle(o.id, !picked)}
                style={{
                  fontSize: 13, padding: '5px 10px', borderRadius: 14, cursor: busy ? 'wait' : 'pointer',
                  border: `1px solid ${picked ? 'var(--brand)' : 'var(--c-line)'}`,
                  background: picked ? 'var(--brand)' : 'transparent',
                  color: picked ? 'var(--on-brand)' : 'inherit',
                  fontWeight: picked ? 700 : 400,
                }}
              >
                {picked ? '✓ ' : ''}{label}
              </button>
            );
          })}
        </div>
      )}
      {view.canSuggest && view.who && total > 0 && (
        <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '8px 0 0' }}>
          {view.options.filter((o) => view.who?.[o.id]?.length).map((o) => `${o.text}: ${view.who![o.id].join(', ')}`).join(' · ')}
        </p>
      )}
      {error && <p role="alert" style={{ fontSize: 13, color: 'var(--c-red)', margin: '8px 0 0' }}>{error}</p>}
    </section>
  );
}
