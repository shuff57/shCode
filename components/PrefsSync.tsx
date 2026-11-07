'use client';

// Mounted once in the root layout: when someone is signed in, their Appearance
// settings (theme, accent, font, home background) come from their account and
// are applied (lib/prefs.ts). The local copy has already been applied before
// first paint by the inline script, so this only matters on a new computer or
// after a change made elsewhere. Renders nothing.

import { useEffect } from 'react';
import { getCurrentUser } from '../lib/auth';
import { pullPrefs } from '../lib/prefs';

export default function PrefsSync() {
  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (cancelled || !user?.email) return;
      void pullPrefs();
    });
    return () => { cancelled = true; };
  }, []);
  return null;
}
