'use client';

// /changes: the Games library's change flow (lib/game-flow-core.ts). Query-string routing, since the
// static export cannot pre-render a page per id:
//   /changes?id=<change id>                  one proposed change and its conversation (ChangeThread)
//   /changes?game=<game id>[&tab=history]    a game's proposed changes and History (GameChangesHub)

import { useEffect, useState } from 'react';
import ChangeThread from './ChangeThread';
import GameChangesHub from './GameChangesHub';
import { isGameId } from '../lib/games-core';
import { isChangeId } from '../lib/game-flow-core';

type View = { kind: 'loading' } | { kind: 'change'; id: string } | { kind: 'game'; id: string; tab: 'changes' | 'history' } | { kind: 'missing' };

export default function ChangesPage() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('id');
    const game = p.get('game');
    if (id && isChangeId(id)) setView({ kind: 'change', id });
    else if (game && isGameId(game)) setView({ kind: 'game', id: game, tab: p.get('tab') === 'history' ? 'history' : 'changes' });
    else setView({ kind: 'missing' });
  }, []);
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '8px 16px 32px', boxSizing: 'border-box', color: 'var(--c-fg)' }}>
      {view.kind === 'change' && <ChangeThread id={view.id} />}
      {view.kind === 'game' && <GameChangesHub gameId={view.id} initialTab={view.tab} />}
      {view.kind === 'missing' && (
        <p style={{ fontSize: 14, color: 'var(--c-dim)' }}>
          Nothing to show here. Open a game&apos;s changes from <a href="/library/?tab=games" style={{ color: 'var(--c-cyan)' }}>Library → Games</a>.
        </p>
      )}
    </div>
  );
}
