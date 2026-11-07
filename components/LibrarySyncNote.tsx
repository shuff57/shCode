'use client';

// One line under the texture editor and the sound mixer saying whether saved
// work has reached the account (lib/library-sync.ts). Quiet when all is well;
// a problem (offline, out of room, a refused file) is said in plain words.

import { useEffect, useState } from 'react';
import { LIBRARY_SYNC_STATUS, lastSyncResult, type SyncResult } from '../lib/library-sync';

export default function LibrarySyncNote({ what }: { what: 'textures' | 'sounds' }) {
  const [r, setR] = useState<SyncResult | null>(null);
  useEffect(() => {
    setR(lastSyncResult());
    const on = (e: Event) => setR((e as CustomEvent<SyncResult>).detail);
    window.addEventListener(LIBRARY_SYNC_STATUS, on);
    return () => window.removeEventListener(LIBRARY_SYNC_STATUS, on);
  }, []);
  if (!r) return null;
  const renamed = r.renamed.filter((x) => (what === 'textures' ? x.kind === 'texture' : x.kind === 'sound'));
  return (
    <div role="status" style={{ fontSize: 12, color: r.problems.length ? '#ffb86c' : '#8393c4', marginTop: 6 }}>
      {r.problems.length
        ? r.problems.join(' ')
        : `Your saved ${what} are synced to your account.`}
      {renamed.map((x) => (
        <div key={x.to}>
          &ldquo;{x.from}&rdquo; was changed on another device too, so this browser&rsquo;s version is now &ldquo;{x.to}&rdquo;.
        </div>
      ))}
    </div>
  );
}
