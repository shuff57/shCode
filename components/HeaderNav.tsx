'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, CurrentUser } from '../lib/auth';
import NavDropdown from './NavDropdown';

// Menu-item style shared by both dropdowns below — a real <Link>/<a>, not a
// div with onClick, so it stays keyboard- and screen-reader-reachable.
const itemStyle: React.CSSProperties = {
  color: 'var(--c-fg)',
  textDecoration: 'none',
  fontSize: 13,
  padding: '6px 10px',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};

export default function HeaderNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasEnrollments, setHasEnrollments] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      if (u?.role === 'student') {
        fetch('/api/my-enrollments', { credentials: 'same-origin' })
          .then((res) => {
            if (!res.ok) return null;
            return res.json() as Promise<{ enrollments?: unknown[] }>;
          })
          .then((data) => {
            if (data == null) {
              setHasEnrollments(null);
            } else {
              setHasEnrollments(
                Array.isArray(data.enrollments) ? data.enrollments.length > 0 : true
              );
            }
          })
          .catch(() => {
            setHasEnrollments(null);
          })
          .finally(() => setLoaded(true));
      } else {
        setLoaded(true);
      }
    });
  }, []);

  const isStaff = loaded && (user?.role === 'teacher' || user?.role === 'admin');

  return (
    <>
      <Link href="/" style={{ color: 'var(--header-fg)' }}>Lessons</Link>

      <NavDropdown label="Learn" triggerStyle={{ color: 'var(--header-fg)', fontSize: 15 }}>
        <Link href="/sandbox" style={itemStyle}>Sandbox</Link>
        {/* The pixel editor behind `sprite.texture`. Linked here rather than
            only from the docs: a page nothing navigates to is the failure
            check-reachable.mjs exists to catch. */}
        <Link href="/textures" style={itemStyle}>Textures</Link>
        {/* The 8-bit sound mixer behind `loadSound('name')`. Link it beside
            the texture editor for the same reason: a tool no page reaches is
            a tool nobody finds. */}
        <Link href="/sound" style={itemStyle}>Sounds</Link>
        {/* What classmates shared (#81): textures and sounds, with Copy to mine. */}
        <Link href="/library" style={itemStyle}>Library</Link>
        {/* One Docs tab for the whole family — JavaScript, moSHion and reSHape
            each have a set inside, switched from the hub at /docs and from the
            family switcher on every docs page. */}
        <Link href="/docs" style={itemStyle}>Docs</Link>
      </NavDropdown>

      {isStaff && (
        <NavDropdown label="Teach" triggerStyle={{ color: 'var(--header-fg)', fontSize: 15 }}>
          <Link href="/teacher" style={itemStyle}>Classes</Link>
          <Link href="/teacher/issues" style={itemStyle}>Issues</Link>
          {user?.role === 'admin' && (
            <Link href="/admin/users" style={itemStyle}>Users</Link>
          )}
        </NavDropdown>
      )}

      {/* Top-level shortcut into the same gradebook DetailView tab reaches via
          Teach -> Classes -> pick a class -> Gradebook tab. Staff only. */}
      {isStaff && (
        <Link href="/teacher?view=gradebook" style={{ color: 'var(--header-fg)' }}>Gradebook</Link>
      )}

      {/* Students only get two extra links — not worth a dropdown for two.
          Students get the anonymised queue at /issues, staff get the triage
          page above (a different route, kept separate deliberately). Without
          this link the only way in is the one-off link shown after filing a
          report, which is not visibility. */}
      {loaded && user?.role === 'student' && (
        <Link href="/issues" style={{ color: 'var(--header-fg)' }}>Issues</Link>
      )}
      {/* The student's own gradebook. Until 2026-09-02 /progress was linked
          from NOWHERE in the app — the score table, the due dates and the
          teacher's override comments all rendered on a page reachable only by
          typing the URL. scripts/check-reachable.mjs now holds that open. */}
      {loaded && user?.role === 'student' && (
        <Link href="/progress" style={{ color: 'var(--header-fg)' }}>Gradebook</Link>
      )}

      {loaded && user?.role === 'student' && hasEnrollments === false && (
        <Link
          href="/join-class"
          style={{
            background: 'var(--c-yellow)',
            color: 'var(--c-bg)',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Join your class
        </Link>
      )}
    </>
  );
}
