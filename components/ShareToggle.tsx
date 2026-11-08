'use client';

// "Share with class" on one of the student's own saved textures or sounds.
// Sharing is opt-in, per item, and puts it in the class library of every class
// the student is in (functions/api/library/[id]/share.ts). Hidden while signed
// out; disabled until the item has synced to the account.

import { useEffect, useState } from 'react';
import {
  LIBRARY_SHARES_CHANGED,
  LIBRARY_SYNC_STATUS,
  accountItem,
  setShared,
  signedInForSync,
} from '../lib/library-sync';
import type { LibraryKind } from '../lib/moshion-storage';

export default function ShareToggle({ kind, name, onMessage, compact = false }: {
  kind: LibraryKind;
  name: string;
  onMessage?: (text: string, bad: boolean) => void;
  compact?: boolean;
}) {
  const [, bump] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener(LIBRARY_SYNC_STATUS, on);
    window.addEventListener(LIBRARY_SHARES_CHANGED, on);
    return () => {
      window.removeEventListener(LIBRARY_SYNC_STATUS, on);
      window.removeEventListener(LIBRARY_SHARES_CHANGED, on);
    };
  }, []);
  if (!signedInForSync()) return null;
  const item = accountItem(kind, name);
  const shared = !!item?.shared;
  const label = shared ? (compact ? 'shared ✓' : 'Shared with class ✓') : (compact ? 'share' : 'Share with class');
  return (
    <button
      type="button"
      disabled={!item || busy}
      aria-pressed={shared}
      title={!item ? 'Syncing to your account first…' : shared ? 'In your class' + "'" + 's Library. Click to take it out.' : 'Put this in your class' + "'" + 's Library so they can copy it.'}
      onClick={async () => {
        setBusy(true);
        const err = await setShared(kind, name, !shared);
        setBusy(false);
        onMessage?.(
          err ?? (shared ? `"${name}" is no longer shared with your class.` : `"${name}" is shared with your class now. They can copy it from the Library.`),
          !!err,
        );
      }}
      style={compact
        ? { fontSize: 10, background: 'none', border: 'none', padding: 0, cursor: item ? 'pointer' : 'default', color: shared ? 'var(--c-green)' : 'var(--c-cyan)' }
        : {
          fontSize: 12, padding: '4px 8px', borderRadius: 4, cursor: item ? 'pointer' : 'default',
          background: shared ? 'color-mix(in srgb, var(--c-green) 13.3333%, transparent)' : 'transparent', color: shared ? 'var(--c-green)' : 'var(--c-cyan)',
          border: `1px solid ${shared ? 'color-mix(in srgb, var(--c-green) 53.3333%, transparent)' : 'var(--c-line)'}`,
        }}
    >
      {label}
    </button>
  );
}
