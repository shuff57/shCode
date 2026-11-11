'use client';

// The one "it worked" block every student lesson shows where the student acted
// (ux1 student B1/B2): a lasting success line, announced to screen readers, with
// one primary "Next: <lesson> →" right there. Used by the reading/video/slides
// completion panel, the quiz, the lab and the written answer, so all four say it
// the same way. Nothing here navigates by itself: the student chooses Next.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { getNextLesson } from '../lib/lesson-neighbors';
import { lessonHref } from '../lib/lesson-href';

export interface NextLessonLink {
  title: string;
  href: string;
}

/** The next lesson in this unit (the same one the old auto-advance went to), or null at the end. */
export function useNextLesson(lessonId: string): NextLessonLink | null | undefined {
  const [next, setNext] = useState<NextLessonLink | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    getNextLesson(lessonId).then((n) => {
      if (live) setNext(n ? { title: n.title, href: lessonHref(n) } : null);
    });
    return () => {
      live = false;
    };
  }, [lessonId]);
  return next;
}

/** The primary Next link. `completion-next` keeps globals.css hiding the duplicate bottom nav. */
export function NextLessonButton({
  lessonId,
  focusKey,
}: {
  lessonId: string;
  /** Change it (a counter, a timestamp) to move focus to the link: done right after the student acted. */
  focusKey?: number | string | null;
}) {
  const next = useNextLesson(lessonId);
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!focusKey || next === undefined) return;
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The whole result, not just the link, and clear of the fixed module bar at the bottom.
    const target = el.closest<HTMLElement>('.lesson-outcome') ?? el;
    target.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  }, [focusKey, next]);
  if (next === undefined) return null;
  return next ? (
    <a ref={ref} className="completion-next" href={next.href}>
      <span className="completion-next-verb">Next:</span> <span className="completion-next-title">{next.title}</span>{' '}
      <span aria-hidden="true">→</span>
    </a>
  ) : (
    <a ref={ref} className="completion-next" href="/">
      <span className="completion-next-verb">Unit done.</span> <span className="completion-next-title">Back to lessons</span>{' '}
      <span aria-hidden="true">→</span>
    </a>
  );
}

export default function LessonOutcome({
  lessonId,
  title,
  detail,
  focusKey,
  extra,
  id,
}: {
  lessonId: string;
  /** "Lesson complete", "Submitted", "Passed: 5 of 5 right". */
  title: ReactNode;
  /** One quiet line under it: when, and whether / how to redo it. */
  detail?: ReactNode;
  focusKey?: number | string | null;
  /** Anything else on the row (an Undo). */
  extra?: ReactNode;
  id?: string;
}) {
  // A live region announces a CHANGE, not what it held when it mounted: the words land one frame
  // after the (empty) region, so a screen reader hears "Submitted" the moment it appears.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section className="lesson-outcome" id={id} aria-label="Result">
      <CircleCheck size={20} color="var(--c-green)" aria-hidden="true" className="lesson-outcome-icon" />
      <div className="lesson-outcome-text">
        <p className="lesson-outcome-title" role="status" aria-live="polite">{ready ? title : null}</p>
        {detail ? <p className="lesson-outcome-detail">{detail}</p> : null}
      </div>
      {extra}
      <NextLessonButton lessonId={lessonId} focusKey={focusKey} />
    </section>
  );
}
