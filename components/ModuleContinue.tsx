'use client';

// "Continue: 1.1.18 Same Framework, Different Weight" beside the module heading: the next
// unfinished, unlocked lesson, picked by lib/module-next.ts from the same progress and lock
// data the lesson list below uses. When every lesson is done it is a quiet "All done".

import Link from 'next/link';
import { bypassesLessonLock, useLessonState } from '../lib/progress';
import { lessonHref } from '../lib/lesson-href';
import { lessonAvailability, useDueDates, useNow } from '../lib/due-dates';
import { pickNextLesson } from '../lib/module-next';

interface LessonItem {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string;
  preview?: string;
}

export default function ModuleContinue({
  lessons,
  moduleId,
  unitId,
}: {
  lessons: LessonItem[];
  moduleId: string;
  unitId?: string | null;
}) {
  const progress = useLessonState();
  const due = useDueDates();
  const now = useNow();
  const next = pickNextLesson(lessons.map((l) => l.id), {
    loaded: progress.loaded,
    state: (id) => progress.states[id],
    isAvailable: (id) => lessonAvailability(due, id, moduleId, unitId, now).available,
    bypass: bypassesLessonLock(progress.role),
  });
  if (!next) return null;
  if (next.kind === 'done') {
    return <p className="module-continue is-done" role="status">✓ All done in this module</p>;
  }
  const lesson = lessons[next.index];
  const anyProgress = lessons.some((l) => progress.states[l.id]);
  const verb = anyProgress ? 'Continue' : 'Start';
  return (
    <div className="module-continue">
      <Link href={lessonHref(lesson)} className="module-continue-action">
        <span className="module-continue-verb">{verb}<span className="module-continue-colon">:</span></span>
        <span className="module-continue-title">{lesson.numberedId} {lesson.displayTitle}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
