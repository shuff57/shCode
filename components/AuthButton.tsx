'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, logout, CurrentUser } from '../lib/auth';
import AuthModal from './AuthModal';

export default function AuthButton() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoaded(true));
  }, []);

  // A full reload is the simplest way to reset every module-scoped cache
  // (lib/auth.ts user cache, lib/progress.ts lesson-state cache, HeaderNav
  // enrollments, etc.) after an auth state change. Individual caches
  // invalidating themselves would work too but adds a pub/sub for each
  // one — not worth it for a state change the user triggers by hand.
  async function handleLogout() {
    await logout();
    setUser(null);
    window.location.reload();
  }

  function handleAuthenticated(u: CurrentUser) {
    setUser(u);
    window.location.reload();
  }

  if (!loaded) return <span style={{ fontSize: 13, opacity: 0.5 }}>…</span>;

  if (user) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        {user.role === 'admin' && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 4,
              background: '#bd93f9',
              color: '#282a36',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Admin
          </span>
        )}
        <span style={{ opacity: 0.8 }}>{user.email}</span>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'inherit',
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Sign out
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: '#50fa7b',
          color: '#282a36',
          border: 'none',
          padding: '6px 14px',
          borderRadius: 4,
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Sign in
      </button>
      <AuthModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}
