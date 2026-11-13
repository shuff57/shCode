'use client';

// A game's family tree on /play, drawn as a course flowchart: the same
// read-only canvas (components/diagram/DiagramEditor) and the same shapes the
// flowchart lessons teach. The original is the Start oval, each remix a Task
// box one row below the game it came from, with an arrow labelled "remixed ·
// from v3"; an accepted change is an arrow back up, routed round the left like
// a loop's return. A small circle is a game the reader cannot open. Clicking a
// shape opens that game; the same links are listed under the chart for the
// keyboard and screen readers.
// Data: GET /api/games/[id]/family (lib/game-family.ts decides what is shown
// and turns it into the chart).

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import EditorPlaceholder from './diagram/EditorPlaceholder';
import { familyToDiagram, type FamilyView } from '../lib/game-family';
import { diagramFrameHeight } from '../lib/diagram-types';
import { GITHUB_WORD } from '../lib/game-flow-core';

// Lazy, like every flowchart outside a diagram lesson: a game page with no
// remixes must not pay for React Flow.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => <EditorPlaceholder height={320} />,
});

function day(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GameFamilyTree({ gameId }: { gameId: string }) {
  const [view, setView] = useState<FamilyView | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/games/${encodeURIComponent(gameId)}/family`, { credentials: 'same-origin' })
      .then(async (res) => (res.ok ? ((await res.json()) as FamilyView) : null))
      .then((v) => { if (live) setView(v); })
      .catch(() => { /* the game still plays; the tree just does not appear */ });
    return () => { live = false; };
  }, [gameId]);

  const chart = useMemo(() => (view ? familyToDiagram(view) : null), [view]);
  if (!view || !chart) return null;
  const remixes = view.nodes.filter((n) => n.parent).length;
  // A game nobody has remixed and that is not a remix: nothing to draw.
  if (!remixes && !view.unseen) return null;

  const makers = new Set(view.nodes.filter((n) => n.parent && n.author).map((n) => n.author)).size;
  const byKey = new Map(view.nodes.map((n) => [n.key, n]));
  const height = Math.min(560, diagramFrameHeight(chart.doc, 260, 560));

  return (
    <details open style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--c-line)', borderRadius: 6 }}>
      <summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        Family tree <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--c-dim)' }}>
          · {remixes} {remixes === 1 ? 'remix' : 'remixes'}{makers ? ` by ${makers} ${makers === 1 ? 'person' : 'people'}` : ''}
        </span>
      </summary>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '6px 0 8px', lineHeight: 1.5 }}>
        Read it like a flowchart. The oval at the top is the original game. Each arrow down is a remix: who made it,
        when, and which version it started from. An arrow back up is a change that was sent back and accepted.
        Click a box to play that game.
        <span style={{ display: 'block', fontSize: 12 }}>{GITHUB_WORD.family}</span>
      </p>

      <DiagramEditor
        key={gameId}
        value={chart.doc}
        readOnly
        height={height}
        fitMinZoom={0.4}
        onNodeClick={(id) => {
          const target = chart.links[id];
          if (target) window.location.href = `/play/?game=${target}`;
        }}
      />

      <details style={{ marginTop: 8, fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--c-dim)' }}>The same tree as a list</summary>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          {view.nodes.map((n) => {
            const parent = n.parent ? byKey.get(n.parent) : undefined;
            const name = n.title ?? 'A game in another class';
            const extra = [
              n.author ? `by ${n.author}${n.mine ? ' (you)' : ''}` : '',
              parent ? `remixed from ${parent.title ?? 'a game in another class'}${n.fromVersion ? ` at version ${n.fromVersion}` : ''}` : 'the original',
              n.createdAt ? day(n.createdAt) : '',
            ].filter(Boolean).join(', ');
            const merged = view.merges.filter((m) => m.from === n.key)
              .map((m) => `${m.by}'s change accepted${m.version ? ` as version ${m.version}` : ''}${m.at ? ` on ${day(m.at)}` : ''}`);
            return (
              <li key={n.key}>
                {n.gameId && !n.current
                  ? <a href={`/play/?game=${n.gameId}`} style={{ color: 'var(--c-cyan)' }}>{name}</a>
                  : <strong>{name}</strong>}
                {n.current && ' (this game)'}{extra && ` — ${extra}`}{merged.length > 0 && `. ${merged.join('. ')}`}
              </li>
            );
          })}
        </ul>
      </details>

      {view.unseen > 0 && (
        <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '6px 0 0' }}>
          And {view.unseen} more {view.unseen === 1 ? 'remix' : 'remixes'} in classes you are not in.
        </p>
      )}
    </details>
  );
}
