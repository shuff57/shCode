'use client';

// Route-level error boundary. Only auto-reloads for the stale-build failure
// mode (a ChunkLoadError from a hashed JS chunk that no longer exists after
// a redeploy) -- see lib/stale-build-guard.ts and components/StaleBuildGuard.tsx
// for the fuller picture, this is one of three places the same guarded
// reload runs. Any OTHER error (a real bug) must NOT be silently reloaded
// and hidden -- it renders immediately with the error message visible.

import { useEffect, useState } from 'react';
import { guardedReload, isChunkLoadError } from '../lib/stale-build-guard';

type Status = 'pending' | 'reload-exhausted' | 'real-error';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    if (isChunkLoadError(error)) {
      const reloaded = guardedReload(`error-boundary:${error?.name ?? 'Error'}:${error?.message ?? ''}`);
      setStatus(reloaded ? 'pending' : 'reload-exhausted');
    } else {
      // A real bug, not a stale-build symptom -- never auto-reload this,
      // it would hide the error and could loop on a genuinely broken page.
      console.error(error);
      setStatus('real-error');
    }
  }, [error]);

  // A reload is already in flight for the chunk-load case -- render nothing
  // rather than flash an error screen the student will only see for a moment.
  if (status === 'pending') return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 16,
        color: '#f8f8f2',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <p>Something went wrong loading this page.</p>
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
  );
}
