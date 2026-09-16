'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { bypassesLessonLock, recordLessonStarted, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';

interface ModuleLesson {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string | null;
}

interface Tip {
  x: number;
  bottom: number;
  text: string;
  lessonId: string;
}

interface Props {
  moduleId: string;
  currentLessonId: string;
  lessons: ModuleLesson[];
}

export default function LessonProgressFooter({ moduleId, currentLessonId, lessons }: Props) {
  const snap = useLessonState();
  const footerRef = useRef<HTMLDivElement>(null);
  // One tooltip for the whole rail, not one per segment: at 380px viewport a
  // segment is only ~3.7px wide, and a per-segment bubble would overflow it.
  // `bottom` is stored, not `y`: it is the anchor the tooltip actually uses.
  // `lessonId` rides along because the aria-describedby link must name exactly
  // the segment the bubble is showing for.
  const [tip, setTip] = useState<Tip | null>(null);
  // The bubble's real width, measured after render. The horizontal clamp
  // MUST use it: guessing a half-width clamped 653 of 689 real lesson titles
  // wrong — any bubble wider than the guess still overflowed the viewport,
  // and a position:fixed element past the edge raises a page scrollbar.
  const [tipWidth, setTipWidth] = useState(0);
  // Phase of the two-phase measure-then-clamp: 'measuring' renders the bubble
  // at a WIDE anchor (left:8) so shrink-to-fit lays it out at its desired
  // width capped by min(60vw, 520px) — measuring at the final clamped
  // position instead let near-rail hovers squeeze to min-content and lock in
  // a ~113px column. 'placed' recomputes left from the measured half-width.
  // 'failed' covers a measurement that returned 0 (null ref / detached
  // bubble): edge-clamp only, but visible — unclamped-centre is better than
  // a bubble stuck invisible.
  const [tipPhase, setTipPhase] = useState<'measuring' | 'placed' | 'failed'>('measuring');
  const tipRef = useRef<HTMLDivElement>(null);
  // useId so the bubble is addressable: role="tooltip" alone is never
  // announced; the segment has to point at it.
  const tipId = useId();

  // Two phases, so the width is measured where the layout is WIDE, not where
  // the clamp will land it (measure-then-clamp):
  //   Phase A ('measuring') — the bubble renders anchored at left:8 (no
  //   translateX, visibility hidden, whiteSpace normal + maxWidth already
  //   applied), so its shrink-to-fit width is its DESIRED width capped by
  //   min(60vw, 520px). That is the number the clamp needs.
  //   Phase B ('placed') — once tipWidth lands, left is recomputed from the
  //   real half-width and the bubble is centred and shown. useLayoutEffect's
  //   synchronous re-render beats paint either way, so the hidden
  //   wrong-position frame never appears.
  // The phase is reset back to 'measuring' wherever a NEW tip is set (see
  // showTip) — React batches that reset with setTip into one render, so
  // sliding the hover from one segment to the next re-enters phase A. If a
  // tip ever arrived WITHOUT the reset, this effect would simply measure it
  // at its clamped position — the old behaviour, degraded but visible —
  // never a bubble stuck hidden.
  // Why the placed box still cannot overflow: at the clamped position its
  // shrink-to-fit available width is clientWidth - left, so the box may
  // render NARROWER than the measured width (it re-shrinks inward, never
  // wider). Painted left = left - w/2 >= lo - W/2 = 8 and painted right =
  // left + w/2 <= hi + W/2 <= clientWidth - 8 for any w <= W — the clamp
  // borrows W as an upper bound on the true (post-shrink) half-width, the
  // safe direction. `bottom` is a top anchor — unaffected by the measured
  // width, so it needs no second pass.
  useLayoutEffect(() => {
    if (!tip) {
      setTipWidth(0);
      setTipPhase('measuring');
      return;
    }
    const w = tipRef.current?.offsetWidth ?? 0;
    if (w > 0) {
      setTipWidth(w);
      setTipPhase('placed');
    } else {
      setTipWidth(0);
      setTipPhase('failed');
    }
  }, [tip]);

  // `snap.loaded` flipping false→true after mount re-derives isLocked and can
  // swap a hovered segment between <span> and <Link>; React unmounts the
  // element under the pointer and mouseleave never fires, leaving a tooltip
  // pointing at nothing. Same staleness after a reflow from a window resize.
  // Both just close the bubble until the next mouseenter.
  useEffect(() => {
    setTip(null);
  }, [snap.loaded]);

  useEffect(() => {
    const clearTip = () => setTip(null);
    window.addEventListener('resize', clearTip);
    return () => window.removeEventListener('resize', clearTip);
  }, []);

  // Auto-mark this lesson as "started" on mount. The helper short-circuits
  // if unauthed or already started/completed, so this is safe to call
  // on every mount.
  useEffect(() => {
    recordLessonStarted(currentLessonId);
  }, [currentLessonId]);

  // Publish our own rendered height as a CSS var, the same trick
  // TabbedRightDrawer already uses for its width (--shd-tabbed) -- so the
  // drawer can inset its `bottom` above us instead of covering us entirely
  // (issue #17: opening Steps/Docs blocked this footer). A ResizeObserver
  // rather than a one-time measurement because this row can wrap onto two
  // lines on a narrow window.
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const cssVar = '--shd-footer-height';
    const publish = () => document.documentElement.style.setProperty(cssVar, `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(cssVar);
    };
  }, []);

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
      ref={footerRef}
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
          // Fast hover tooltip, replacing the slow ~1s native `title`
          // tooltip. One shared element for the whole rail (segments can be
          // ~3.7px wide; a per-segment bubble would overflow), positioned
          // from the segment's rect at event time — the footer sits at the
          // bottom of the viewport, so the bubble must go ABOVE the segment
          // or it is offscreen. The native `title` is removed from both
          // segment branches so the slow and fast tooltips never show
          // together; the aria-labels stay as the accessible name and
          // aria-describedby (set below on both branches) makes the bubble
          // itself announced while it shows.
          const showTip = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            // Store the raw centre; the horizontal clamp is applied at render
            // time, from the bubble's MEASURED width (see tipWidth above) —
            // HALF-guessing it here measured 653/689 real titles wider than
            // the guess, and they overflowed.
            // The phase reset rides WITH the setTip: batched into one
            // render, so every new hover (including segment-to-segment
            // slides, where the previous tip's tipWidth is still in state)
            // re-enters phase A and is measured at the wide anchor.
            setTipPhase('measuring');
            setTip({
              x: r.left + r.width / 2,
              bottom: window.innerHeight - r.top + 6,
              text: titleText,
              lessonId: l.id,
            });
          };
          return isLocked ? (
            <span
              key={l.id}
              className={segClass}
              aria-label={`${l.numberedId} ${l.displayTitle} (locked)`}
              aria-disabled="true"
              aria-describedby={tip && tip.lessonId === l.id ? tipId : undefined}
              style={segStyle}
              onMouseEnter={showTip}
              onMouseLeave={() => setTip(null)}
            />
          ) : (
            <Link
              key={l.id}
              href={lessonHref(l)}
              className={segClass}
              aria-label={`${l.numberedId} ${l.displayTitle}`}
              aria-current={isCurrent ? 'page' : undefined}
              aria-describedby={tip && tip.lessonId === l.id ? tipId : undefined}
              style={segStyle}
              onMouseEnter={showTip}
              onMouseLeave={() => setTip(null)}
              onFocus={showTip}
              onBlur={() => setTip(null)}
            />
          );
        })}
        {/* Portaled to document.body: the footer is z-index 50, and a tooltip
            inside it could never rise above the drawer (z-index 900). Fixed
            positioning alone does not escape a stacking context. */}
        {tip &&
          createPortal(
            <div
              id={tipId}
              ref={tipRef}
              role="tooltip"
              style={{
                position: 'fixed',
                // PHASE A ('measuring'): anchor at left:8 — there the
                // available width is clientWidth - 16, so shrink-to-fit lays
                // the box out at its DESIRED width capped by maxWidth below,
                // which is the number the clamp needs (measuring at the
                // final clamped position instead let the box squeeze to
                // min-content and lock in a ~113px column). Hidden this
                // frame; useLayoutEffect's synchronous re-render replaces it
                // before paint.
                // PHASE B ('placed'): clamp the stored centre from the
                // MEASURED half-width — HALF-guessing 160px left 653 of 689
                // real titles overflowing (worst ~716px; the current
                // lesson's segment is at the right end of the rail, so the
                // worst case is the common one) — then centre and show. The
                // 8px is breathing room at the viewport edge. clientWidth,
                // not innerWidth — innerWidth includes the scrollbar, which
                // would let the bubble slide under a classic scrollbar.
                // MEASURE-FAILED ('failed', offsetWidth 0): edge-clamp only
                // and show anyway — a slightly misplaced bubble beats one
                // stuck invisible.
                left:
                  tipPhase === 'placed'
                    ? Math.min(
                        Math.max(tip.x, tipWidth / 2 + 8),
                        document.documentElement.clientWidth - tipWidth / 2 - 8,
                      )
                    : tipPhase === 'failed'
                    ? Math.min(Math.max(tip.x, 8), document.documentElement.clientWidth - 8)
                    : 8,
                // Centre the bubble on tip.x. In phase B the x itself was
                // clamped from the measured half-width first, so the centred
                // bubble stays inside the viewport (see the layout effect for
                // why the final box also cannot overflow after re-shrinking).
                transform: tipPhase === 'measuring' ? undefined : 'translateX(-50%)',
                // Bottom anchor = the distance from the viewport's bottom edge
                // up to the segment's top + 6px gap. Computed at event time
                // because the tooltip must sit ABOVE the segment: the footer
                // hugs the viewport's bottom edge, so a bubble below the
                // pointer would be offscreen. Wrapping changes the bubble's
                // height, not its top, so the anchor survives wrapping.
                bottom: tip.bottom,
                // The tooltip must never steal the hover from the segment
                // under the pointer — if it could, enter/leave would flicker
                // every frame as the bubble covered and uncovered the target.
                pointerEvents: 'none',
                // Phase A is hidden so it can be measured at its desired
                // width; phase B is recomputed from the REAL half-width and
                // shown before paint. The measure-failed fallback also shows
                // (edge-clamped), so the bubble can never get stuck hidden.
                visibility: tipPhase === 'measuring' ? 'hidden' : 'visible',
                // Long titles wrap instead of forcing a ~716px strip, capped
                // at min(60vw, 520px) AT THE WIDE anchor of phase A. At the
                // final clamped position the box re-shrinks inward where the
                // viewport is tight — that is intentional and safe (see the
                // layout effect above), and a mid-rail hover still gets the
                // full cap. lineHeight 1.35 keeps a wrapped bubble tight.
                whiteSpace: 'normal',
                maxWidth: 'min(60vw, 520px)',
                lineHeight: 1.35,
                background: '#282a36',
                border: '1px solid #44475a',
                color: '#f8f8f2',
                fontSize: 12,
                borderRadius: 4,
                padding: '4px 8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                zIndex: 950,
              }}
            >
              {tip.text}
            </div>,
            document.body,
          )}
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
