'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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

// Mirrors lib/lessons.ts getLessonNeighbors so the client picks the same
// prev/next as the server-rendered page once did.
function computeNeighbors(
  lessons: ManifestLesson[],
  id: string
): { prev: Neighbor | null; next: Neighbor | null } {
  const current = lessons.find((l) => l.id === id);
  if (!current) return { prev: null, next: null };
  const peers = lessons
    .filter((l) => l.category === current.category)
    .sort((a, b) => {
      const w = (a.week ?? 999) - (b.week ?? 999);
      if (w !== 0) return w;
      const u = (a.unit || '').localeCompare(b.unit || '');
      if (u !== 0) return u;
      return a.title.localeCompare(b.title);
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
        <a
          className="hdr-lesson-link hdr-lesson-link-right"
          href={`${route.basePath}/${next.id}`}
        >
          <span style={titleStyle}>{next.title}</span>
          <span style={{ opacity: 0.7 }}>→</span>
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
