'use client';

// Catches errors thrown from app/layout.tsx itself, which app/error.tsx
// cannot -- must define its own <html>/<body> since it replaces the whole
// root layout when it fires. Only auto-reloads for the stale-build failure
// mode (isChunkLoadError) -- any other error is a real bug and renders
// immediately with its message visible, never silently reloaded. See
// lib/stale-build-guard.ts and app/error.tsx.

import { useEffect, useState } from 'react';
import { guardedReload, isChunkLoadError } from '../lib/stale-build-guard';

type Status = 'pending' | 'reload-exhausted' | 'real-error';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    if (isChunkLoadError(error)) {
      const reloaded = guardedReload(`global-error-boundary:${error?.name ?? 'Error'}:${error?.message ?? ''}`);
      setStatus(reloaded ? 'pending' : 'reload-exhausted');
    } else {
      console.error(error);
      setStatus('real-error');
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: '#282a36', margin: 0 }}>
        {status !== 'pending' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              gap: 16,
              color: '#f8f8f2',
              textAlign: 'center',
              padding: 24,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <p>Something went wrong loading shCode.</p>
            {status === 'real-error' && error?.message ? (
              <p style={{ color: '#6272a4', fontSize: '0.85rem', maxWidth: 480 }}>{error.message}</p>
            ) : null}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#bd93f9',
                color: '#282a36',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Refresh
            </button>
          </div>
        ) : null}
      </body>
    </html>
  );
}
