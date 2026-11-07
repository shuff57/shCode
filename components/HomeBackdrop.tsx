'use client';

// The home page's background chosen in Appearance (#77): a preset pattern made
// from the theme's own colours, or one of the student's uploaded images under a
// veil of the page colour so the course cards stay readable. A fixed layer
// behind the page; nothing when no background is chosen.

import { useEffect, useState } from 'react';
import { PREFS_CHANGED, readLocalPrefs } from '../lib/prefs';
import { presetBackground, uploadUrl, type HomeBg } from '../lib/prefs-core';

export function backdropStyle(bg: HomeBg): React.CSSProperties {
  if (bg.kind === 'preset') return { background: presetBackground(bg.id) };
  return {
    background: `linear-gradient(color-mix(in srgb, var(--bg) 78%, transparent), color-mix(in srgb, var(--bg) 78%, transparent)), url("${uploadUrl(bg)}") center / cover no-repeat, var(--bg)`,
  };
}

export default function HomeBackdrop() {
  const [bg, setBg] = useState<HomeBg | null>(null);
  useEffect(() => {
    setBg(readLocalPrefs().homeBg);
    const on = (e: Event) => setBg((e as CustomEvent).detail?.homeBg ?? null);
    window.addEventListener(PREFS_CHANGED, on);
    return () => window.removeEventListener(PREFS_CHANGED, on);
  }, []);
  if (!bg) return null;
  return <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', ...backdropStyle(bg) }} />;
}
