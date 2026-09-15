'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, CurrentUser } from '../lib/auth';
import NavDropdown from './NavDropdown';

// Menu-item style shared by both dropdowns below — a real <Link>/<a>, not a
// div with onClick, so it stays keyboard- and screen-reader-reachable.
const itemStyle: React.CSSProperties = {
  color: '#f8f8f2',
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
      <Link href="/" className="text-white">Lessons</Link>

      <NavDropdown label="Learn" triggerStyle={{ color: '#fff', fontSize: 15 }}>
        <Link href="/sandbox" style={itemStyle}>Sandbox</Link>
        {/* The pixel editor behind `sprite.texture`. Linked here rather than
            only from the docs: a page nothing navigates to is the failure
            check-reachable.mjs exists to catch. */}
        <Link href="/textures" style={itemStyle}>Textures</Link>
        {/* One Docs tab for the whole family — JavaScript, moSHion and reSHape
            each have a set inside, switched from the hub at /docs and from the
            family switcher on every docs page. */}
        <Link href="/docs" style={itemStyle}>Docs</Link>
      </NavDropdown>

      {isStaff && (
        <NavDropdown label="Teach" triggerStyle={{ color: '#fff', fontSize: 15 }}>
          <Link href="/teacher" style={itemStyle}>Classes</Link>
          <Link href="/teacher/issues" style={itemStyle}>Issues</Link>
          {user?.role === 'admin' && (
            <Link href="/admin/users" style={itemStyle}>Users</Link>
          )}
        </NavDropdown>
      )}

      {/* Students only get two extra links — not worth a dropdown for two.
          Students get the anonymised queue at /issues, staff get the triage
          page above (a different route, kept separate deliberately). Without
          this link the only way in is the one-off link shown after filing a
          report, which is not visibility. */}
      {loaded && user?.role === 'student' && (
        <Link href="/issues" className="text-white">Issues</Link>
      )}
      {/* The student's own gradebook. Until 2026-09-02 /progress was linked
          from NOWHERE in the app — the score table, the due dates and the
          teacher's override comments all rendered on a page reachable only by
          typing the URL. scripts/check-reachable.mjs now holds that open. */}
      {loaded && user?.role === 'student' && (
        <Link href="/progress" className="text-white">Progress</Link>
      )}

      {loaded && user?.role === 'student' && hasEnrollments === false && (
        <Link
          href="/join-class"
          style={{
            background: '#f1fa8c',
            color: '#282a36',
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
