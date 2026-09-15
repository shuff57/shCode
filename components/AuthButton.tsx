'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, logout, firstNameOrFallback, CurrentUser } from '../lib/auth';
import AuthModal from './AuthModal';
import NavDropdown from './NavDropdown';

const roleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#282a36',
};

const menuItemStyle: React.CSSProperties = {
  color: '#f8f8f2',
  textDecoration: 'none',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};

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
      <NavDropdown
        label={firstNameOrFallback(user)}
        align="right"
        triggerStyle={{ fontSize: 13, opacity: 0.9 }}
      >
        {(user.role === 'admin' || user.role === 'teacher') && (
          <span
            style={{
              ...roleBadgeStyle,
              background: user.role === 'admin' ? '#bd93f9' : '#ffb86c',
              margin: '0 10px 4px',
            }}
          >
            {user.role === 'admin' ? 'Admin' : 'Teacher'}
          </span>
        )}
        <Link
          href="/account"
          style={menuItemStyle}
          title={user.firstName ? user.email : 'Set a name'}
        >
          My account
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            ...menuItemStyle,
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </NavDropdown>
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
