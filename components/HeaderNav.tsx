'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, CurrentUser } from '../lib/auth';

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

  return (
    <>
      <Link href="/" className="text-white">Lessons</Link>
      <Link href="/sandbox" className="text-white">Sandbox</Link>
      {/* One Docs tab for the whole family — JavaScript, moSHion and reSHape
          each have a set inside, switched from the hub at /docs and from the
          family switcher on every docs page. */}
      <Link href="/docs" className="text-white">Docs</Link>
      {(loaded && user?.role === 'teacher') || user?.role === 'admin' ? (
        <>
          <Link href="/teacher" className="text-white">Classes</Link>
          <Link href="/teacher/issues" className="text-white">Issues</Link>
        </>
      ) : null}
      {/* Students get the anonymised queue at /issues, staff get the triage
          page above. Without this link the only way in is the one-off link
          shown after filing a report, which is not visibility. */}
      {loaded && user?.role === 'student' && (
        <Link href="/issues" className="text-white">Issues</Link>
      )}
      {loaded && user?.role === 'admin' && (
        <Link href="/admin/users" className="text-white">Users</Link>
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
