'use client';

// The notification bell (#112) links to one comment: /changes/?id=..#c-<id> and /play/?game=..#comment-<id>.
// Those comments arrive after the page loads, so the browser's own jump to #id finds nothing. Once `ready`
// (the list is on screen), this scrolls to the element once and returns its id so the page can mark it.

import { useEffect, useRef, useState } from 'react';

/** Outline for the comment a notification opened. */
export const hashTargetStyle: React.CSSProperties = { outline: '2px solid var(--brand)', outlineOffset: 6, borderRadius: 6 };

export function useHashTarget(ready: boolean): string | null {
  const [target, setTarget] = useState<string | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    let id = '';
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { /* a malformed hash */ }
    if (!id) return;
    done.current = true;
    setTarget(id);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }, [ready]);
  return target;
}
