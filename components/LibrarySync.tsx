'use client';

// Mounted once in the root layout: while someone is signed in, their saved
// textures and sounds sync with their account library (lib/library-sync.ts).
// Renders nothing. Signed out, it does nothing and the store stays local.

import { useEffect } from 'react';
import { getCurrentUser } from '../lib/auth';
import { startLibrarySync } from '../lib/library-sync';

export default function LibrarySync() {
  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled || !user?.email || user.needsTerms) return;
      if (typeof crypto === 'undefined' || !crypto.subtle) return; // insecure origin: no hashing, no sync
      stop = startLibrarySync(user.email);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}
