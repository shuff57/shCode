'use client';

import { useEffect } from 'react';
import { bypassesLessonLock, recordLessonStarted, useLessonState } from '../lib/progress';
import { useDueDates, useLessonAvailability } from '../lib/due-dates';

interface Props {
  lessonId: string;
  siblings: string[];
  moduleId: string | null;
  unitId?: string | null;
}

// Marks the lesson "started". Rendered only inside LessonAccessGate's open branch, so a lesson held
// shut by the sequence rule never mounts it; it also waits for the due-dates snapshot, because
// lessonAvailability() answers "available" until that has loaded and would let the POST out for a
// lesson a teacher's "available after" date is still holding closed (the server answers 403).
export default function MarkStarted({ lessonId, siblings, moduleId, unitId = null }: Props) {
  const dues = useDueDates();
  const snap = useLessonState();
  const availability = useLessonAvailability(lessonId, moduleId, unitId);
  const ready = dues.loaded && snap.loaded;
  const open = availability.available || bypassesLessonLock(snap.role);

  useEffect(() => {
    if (!ready || !open) return;
    recordLessonStarted(lessonId, siblings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, ready, open]);

  return null;
}
