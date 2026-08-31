'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { bypassesLessonLock, recordLessonStarted, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';

interface ModuleLesson {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string | null;
}

interface Props {
  moduleId: string;
  currentLessonId: string;
  lessons: ModuleLesson[];
}

export default function LessonProgressFooter({ moduleId, currentLessonId, lessons }: Props) {
  const snap = useLessonState();

  // Auto-mark this lesson as "started" on mount. The helper short-circuits
  // if unauthed or already started/completed, so this is safe to call
  // on every mount.
  useEffect(() => {
    recordLessonStarted(currentLessonId);
  }, [currentLessonId]);

  if (lessons.length === 0) return null;
  const idx = lessons.findIndex((l) => l.id === currentLessonId);
  const done = lessons.filter((l) => snap.states[l.id] === 'completed').length;
  const pct = Math.round((done / lessons.length) * 100);

  // Linear progression: a dot is clickable iff every prior lesson is
  // completed. Unauthed (snap.loaded === false on the server) defaults
  // to "all unlocked" until state loads — avoids hydration churn.
  // Admins and teachers bypass the gate entirely.
  const firstUnlocked = (() => {
    if (!snap.loaded) return lessons.length;
    for (let i = 0; i < lessons.length; i++) {
      if (snap.states[lessons[i].id] !== 'completed') return i;
    }
    return lessons.length;
  })();
  const lockBypass = bypassesLessonLock(snap.role);

  return (
    <div
      className="lesson-progress-footer"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#21222c',
        borderTop: '1px solid #44475a',
        padding: '8px 16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#f8f8f2',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.35)',
        fontSize: 12,
      }}
    >
      <Link
        href={`/module/${moduleId}`}
        prefetch={false}
        style={{
          color: '#8be9fd',
          textDecoration: 'none',
          fontWeight: 600,
          minWidth: 80,
        }}
      >
        Module {moduleId}
      </Link>
      {/* Dropped below 720px (see globals.css): at phone width this and the
          segments were competing for the same ~70px, and the tally on the
          right already says how many lessons the module has. */}
      <span className="lesson-progress-count" style={{ color: '#6272a4', minWidth: 96 }}>
        {idx >= 0 ? `Lesson ${idx + 1} of ${lessons.length}` : `${lessons.length} lessons`}
      </span>
      {/* Segments, not dots. A dot is a fixed 14px, so 31 of them plus the
          surrounding text stopped fitting somewhere around 700px wide and the
          row silently became a scroller with no scrollbar — the lessons you
          had already finished slid off the left edge. Segments divide whatever
          width they are handed, so the rail cannot overflow at any viewport;
          it only gets thinner. */}
      <div className="lesson-progress-segs">
        {lessons.map((l, i) => {
          const isCurrent = l.id === currentLessonId;
          const state = snap.states[l.id];
          const isDone = state === 'completed';
          const isStarted = state === 'started';
          const isLocked = i > firstUnlocked && !isCurrent && !lockBypass;
          // Segment colours are contrast-driven: on this #21222c footer a
          // segment needs 3.0:1 (WCAG 2.1 non-text) to be visible at all.
          // Every state clears it, including locked — a student reported the
          // locked run as unreadable and #44475a measured 1.72:1. Locked is
          // #6272a4 at 3.36:1 and available-not-started #7b88b8 at 4.55:1, so
          // the two stay a full step apart in lightness. Do not dim either
          // back down. scripts/check-dot-contrast.mjs reads this chain.
          const stateColor = isCurrent
            ? '#ff79c6'
            : isDone
            ? '#50fa7b'
            : isStarted
            ? '#f1fa8c'
            : isLocked
            ? '#6272a4'
            : '#7b88b8';
          // The current lesson is the only one that changes height. Colour
          // alone would not survive a colour-blind reader scanning for "where
          // am I", and height is the one channel nothing else here uses.
          // Every segment is a 16px-tall target that only PAINTS its bottom
          // 6px. `background-clip: content-box` confines the colour to the
          // content box, so the padding above it is invisible but still
          // clickable — at 380px a segment is only ~3.7px wide, and the
          // vertical room costs nothing. Height still marks the current
          // lesson, because that one paints its full 16px.
          //
          // padding-top lives in globals.css, NOT here: it is what the hover
          // lift animates, and an inline style outranks a stylesheet rule, so
          // setting it here silently killed :hover. Only the colour, which
          // varies per lesson, stays inline.
          const segStyle: React.CSSProperties = {
            flex: '1 1 0',
            minWidth: 0,
            height: 16,
            // backgroundColor, NOT the `background` shorthand: the shorthand
            // resets background-clip to border-box, so the colour filled the
            // padding too and every segment rendered as a 16px block.
            backgroundClip: 'content-box',
            borderRadius: 1,
            backgroundColor: stateColor,
            cursor: isLocked ? 'not-allowed' : undefined,
          };
          const segClass = `lesson-progress-seg${isCurrent ? ' is-current' : ''}`;
          const titleText = `${l.numberedId} ${l.displayTitle}${isDone ? ' (complete)' : isStarted ? ' (in progress)' : ''}${isCurrent ? ' (current)' : ''}${isLocked ? ' (locked — get a green to unlock)' : ''}`;
          return isLocked ? (
            <span
              key={l.id}
              className={segClass}
              title={titleText}
              aria-label={`${l.numberedId} ${l.displayTitle} (locked)`}
              aria-disabled="true"
              style={segStyle}
            />
          ) : (
            <Link
              key={l.id}
              href={lessonHref(l)}
              className={segClass}
              title={titleText}
              aria-label={`${l.numberedId} ${l.displayTitle}`}
              aria-current={isCurrent ? 'page' : undefined}
              style={segStyle}
            />
          );
        })}
      </div>
      {snap.loaded && !snap.authed ? (
        <span style={{ color: '#6272a4' }}>
          <span style={{ color: '#8be9fd' }}>Sign in</span> to save progress
        </span>
      ) : (
        <span style={{ color: '#6272a4', minWidth: 68, textAlign: 'right' }}>
          {done}/{lessons.length} · {pct}%
        </span>
      )}
    </div>
  );
}
