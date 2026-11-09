'use client';

// "Remixed from hero by Sam W." under one of the student's own pictures or
// sounds that was copied from a classmate (Copy to mine / Remix in the class
// library; lib/share-choice.ts). The account's record once the copy has synced,
// this browser's until then (lib/library-sync.ts remixCredit). Renders nothing
// for the student's own work. Meant for the Mine cards (MyLibrary) and the
// frames viewer (SpriteViewer's children).

import { useEffect, useState } from 'react';
import { LIBRARY_SHARES_CHANGED, LIBRARY_SYNC_STATUS, remixCredit } from '../lib/library-sync';
import { LIBRARY_UPDATED, type LibraryKind } from '../lib/moshion-storage';
import { RemixCreditLine } from './ShareChoicePicker';

export default function RemixCredit({ item, style }: {
  item: { kind: LibraryKind; name: string };
  style?: React.CSSProperties;
}) {
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.addEventListener(ev, on);
    return () => { for (const ev of [LIBRARY_SYNC_STATUS, LIBRARY_SHARES_CHANGED, LIBRARY_UPDATED]) window.removeEventListener(ev, on); };
  }, []);
  // Read after mount only: localStorage is not there during the static render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <RemixCreditLine from={remixCredit(item.kind, item.name)} style={{ textAlign: 'center', ...style }} />;
}
