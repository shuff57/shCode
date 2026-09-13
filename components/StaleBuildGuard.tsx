'use client';

// Mounted once in the root layout. Guards against issue #20: a tab left
// open across a Cloudflare Pages deploy, whose old client-side router code
// then either (a) shows a page's raw RSC flight payload as visible text
// instead of rendering it, or (b) throws a ChunkLoadError trying to load a
// hashed JS chunk that no longer exists in the new deploy. Both cases are
// fixed the same way a manual refresh would fix them: a one-time, silent
// reload. See lib/stale-build-guard.ts for the detection heuristics and the
// reload-loop guard.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearStaleBuildGuard,
  guardedReload,
  isChunkLoadError,
  looksLikeStaleFlightPayload,
} from '../lib/stale-build-guard';

export default function StaleBuildGuard() {
  const pathname = usePathname();
  const [gaveUp, setGaveUp] = useState(false);

  // After each navigation, once the new page has painted, check whether
  // what's actually visible is a raw flight payload rather than real UI.
  useEffect(() => {
    const timer = setTimeout(() => {
      const visibleText = document.body.innerText || '';
      if (looksLikeStaleFlightPayload(visibleText)) {
        const reloaded = guardedReload(`visible-flight-payload:${pathname}`);
        if (!reloaded) setGaveUp(true);
      } else {
        clearStaleBuildGuard();
        setGaveUp(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Catch the other half: a ChunkLoadError thrown outside any React render
  // (e.g. a lazy import during router navigation), which a route-level
  // error.tsx boundary would never see.
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isChunkLoadError(event.error ?? event.message)) {
        const reloaded = guardedReload(`window-error:${pathname}`);
        if (!reloaded) setGaveUp(true);
      }
    }
    function onRejection(event: PromiseRejectionEvent) {
      if (isChunkLoadError(event.reason)) {
        const reloaded = guardedReload(`unhandled-rejection:${pathname}`);
        if (!reloaded) setGaveUp(true);
      }
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
    // Intentionally re-subscribed per pathname so the closure's guardedReload
    // reason string stays accurate; the listeners themselves are cheap.
  }, [pathname]);

  // Only rendered in the rare case where a reload already happened once for
  // this episode and the page is still broken -- give the student something
  // actionable instead of leaving raw unreadable text on screen forever.
  if (!gaveUp) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: '#282a36',
        border: '2px solid #ff5555',
        color: '#f8f8f2',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: '0.85rem',
        maxWidth: 280,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ marginBottom: 8 }}>This page didn&apos;t load correctly.</div>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#bd93f9',
          color: '#282a36',
          border: 'none',
          borderRadius: 4,
          padding: '6px 12px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Refresh
      </button>
    </div>
  );
}
