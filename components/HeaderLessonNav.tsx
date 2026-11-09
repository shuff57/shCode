'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { bypassesLessonLock, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
  preview: string | null;
  category: string | null;
  week: number | null;
  type?: string | null;
}

interface Neighbor {
  id: string;
  title: string;
  type?: string | null;
  preview?: string | null;
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
    l ? { id: l.id, title: l.title, type: l.type, preview: l.preview } : null;
  return {
    prev: toN(idx > 0 ? peers[idx - 1] : undefined),
    next: toN(idx < peers.length - 1 ? peers[idx + 1] : undefined),
  };
}

// Only the id matters. The prefix a neighbour needs comes from that
// neighbour's own type, never from the page we happen to be standing on —
// a reading and the assignment after it live under different prefixes.
function parseRoute(pathname: string): { id: string } | null {
  const m = pathname.match(/^\/(?:lesson|assignment)\/([^/]+)\/?$/);
  return m ? { id: m[1] } : null;
}

function shortLabel(n: Neighbor) {
  const kind = n.preview ?? n.type ?? 'Lesson';
  const labels: Record<string, string> = { reading: 'Reading', quiz: 'Quiz', video: 'Video', slides: 'Slides', example: 'Example', console: 'Lab', moshion: 'Lab' };
  return `${parseNumberedId(n.title) ?? ''} ${labels[kind] ?? 'Lesson'}`.trim();
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
      className="header-lesson-nav"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minWidth: 0,
        padding: '2px 16px',
        borderTop: '1px solid var(--x-1f2937)',
        color: 'var(--x-cbd5e1)',
        fontSize: '0.85rem',
      }}
    >
      {prev ? (
        <a className="hdr-lesson-link" href={lessonHref(prev)}>
          <span style={{ color: 'var(--c-meta)' }}>←</span>
          <span style={titleStyle}><span className="lesson-nav-full">{prev.title}</span><span className="lesson-nav-short">{shortLabel(prev)}</span></span>
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
              color: 'var(--c-meta)',
              cursor: 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={titleStyle}><span className="lesson-nav-full">{next.title}</span><span className="lesson-nav-short">{shortLabel(next)}</span></span>
            <span style={{ color: 'var(--c-meta)' }} aria-hidden="true">🔒</span>
          </span>
        ) : (
          <a
            className="hdr-lesson-link hdr-lesson-link-right"
            href={lessonHref(next)}
          >
            <span style={titleStyle}><span className="lesson-nav-full">{next.title}</span><span className="lesson-nav-short">{shortLabel(next)}</span></span>
            <span style={{ color: 'var(--c-meta)' }}>→</span>
          </a>
        )
      ) : (
        <span />
      )}
    </div>
  );
}
