'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { bypassesLessonLock, useLessonState } from '../lib/progress';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
  preview: string | null;
  category: string | null;
  week: number | null;
}

interface Neighbor {
  id: string;
  title: string;
}

// Sorts siblings by the X.Y.Z numbered id parsed from the title, matching
// the canonical order used by lib/curriculum.ts on the module listing page.
// Titles without a numbered prefix sort to the end.
function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

function computeNeighbors(
  lessons: ManifestLesson[],
  id: string
): { prev: Neighbor | null; next: Neighbor | null } {
  const current = lessons.find((l) => l.id === id);
  if (!current) return { prev: null, next: null };
  const peers = lessons
    .filter((l) => l.category === current.category)
    .sort((a, b) => {
      const an = parseNumberedId(a.title);
      const bn = parseNumberedId(b.title);
      if (an && bn) return an.localeCompare(bn, undefined, { numeric: true });
      if (an) return -1;
      if (bn) return 1;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
  const idx = peers.findIndex((l) => l.id === id);
  const toN = (l?: ManifestLesson): Neighbor | null =>
    l ? { id: l.id, title: l.title } : null;
  return {
    prev: toN(idx > 0 ? peers[idx - 1] : undefined),
    next: toN(idx < peers.length - 1 ? peers[idx + 1] : undefined),
  };
}

function parseRoute(pathname: string): { id: string; basePath: string } | null {
  const lessonMatch = pathname.match(/^\/lesson\/([^/]+)\/?$/);
  if (lessonMatch) return { id: lessonMatch[1], basePath: '/lesson' };
  const assignmentMatch = pathname.match(/^\/assignment\/([^/]+)\/?$/);
  if (assignmentMatch) return { id: assignmentMatch[1], basePath: '/assignment' };
  return null;
}

export default function HeaderLessonNav() {
  const pathname = usePathname();
  const [lessons, setLessons] = useState<ManifestLesson[] | null>(null);
  const snap = useLessonState();

  useEffect(() => {
    if (!parseRoute(pathname || '')) return;
    let cancelled = false;
    fetch('/lessons-manifest.json')
      .then((r) => (r.ok ? r.json() : { lessons: [] }))
      .then((data) => {
        if (!cancelled) setLessons(data.lessons || []);
      })
      .catch(() => {
        if (!cancelled) setLessons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const route = parseRoute(pathname || '');
  if (!route) return null;
  if (!lessons) return null;

  const { prev, next } = computeNeighbors(lessons, route.id);
  if (!prev && !next) return null;

  const titleStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  };

  // Next lesson is locked until the current lesson's state is 'completed'.
  // Unauthed users see the lock too — they're already prompted to sign in
  // by the progress footer, so this isn't surprising. Admins and teachers
  // bypass the gate.
  const currentCompleted = snap.states[route.id] === 'completed';
  const nextLocked = !currentCompleted && !bypassesLessonLock(snap.role);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 16px',
        borderTop: '1px solid #1f2937',
        color: '#cbd5e1',
        fontSize: '0.85rem',
      }}
    >
      {prev ? (
        <a className="hdr-lesson-link" href={`${route.basePath}/${prev.id}`}>
          <span style={{ opacity: 0.7 }}>←</span>
          <span style={titleStyle}>{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        nextLocked ? (
          <span
            className="hdr-lesson-link hdr-lesson-link-right"
            title="Get a green on this lesson before moving forward"
            aria-disabled="true"
            style={{
              opacity: 0.45,
              cursor: 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={titleStyle}>{next.title}</span>
            <span style={{ opacity: 0.7 }} aria-hidden="true">🔒</span>
          </span>
        ) : (
          <a
            className="hdr-lesson-link hdr-lesson-link-right"
            href={`${route.basePath}/${next.id}`}
          >
            <span style={titleStyle}>{next.title}</span>
            <span style={{ opacity: 0.7 }}>→</span>
          </a>
        )
      ) : (
        <span />
      )}
    </div>
  );
}
