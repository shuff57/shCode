'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, logout, firstNameOrFallback, CurrentUser } from '../lib/auth';
import AuthModal from './AuthModal';
import NavDropdown from './NavDropdown';
import { openWhatsNew, useWhatsNewUnseen } from './WhatsNewModal';

const roleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--c-bg)',
};

const menuItemStyle: React.CSSProperties = {
  color: 'var(--c-fg)',
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
  const whatsNewUnseen = useWhatsNewUnseen();

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
      // data-account-menu: What's New hands focus back to this menu's button when it closes.
      <span data-account-menu style={{ display: 'inline-block' }}>
      <NavDropdown
        label={firstNameOrFallback(user)}
        align="right"
        triggerStyle={{ fontSize: 13, opacity: 0.9 }}
      >
        {(user.role === 'admin' || user.role === 'teacher') && (
          <span
            style={{
              ...roleBadgeStyle,
              background: user.role === 'admin' ? 'var(--c-purple)' : 'var(--c-orange)',
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
        {/* Every What's New entry for this role (components/WhatsNewModal.tsx); the dot means recent news not seen yet. */}
        <button
          type="button"
          onClick={(e) => {
            const trigger = e.currentTarget.closest('[data-account-menu]')?.querySelector('button') as HTMLElement | null;
            openWhatsNew(trigger);
          }}
          style={{
            ...menuItemStyle,
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
          data-testid="whats-new-menu"
        >
          What&apos;s new
          {whatsNewUnseen && (
            <>
              <span
                aria-hidden="true"
                data-testid="whats-new-dot"
                style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }}
              />
              <span className="sr-only">(new updates)</span>
            </>
          )}
        </button>
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
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--c-green)',
          color: 'var(--c-bg)',
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
