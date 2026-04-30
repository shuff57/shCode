'use client';

import LessonCard from './LessonCard';
import { useLessonState } from '../lib/progress';
import type { Lesson } from '../lib/types';

// Renders a module's lesson cards on the home page with the same green-to-
// advance lock rule as /module/X — a lesson is unlocked iff every prior
// lesson in the module is `completed`. The first non-completed lesson
// stays unlocked as the "current" one. LessonCard handles role bypass.
export default function HomeModuleLessons({ lessons }: { lessons: Lesson[] }) {
  const progress = useLessonState();
  const firstUnlocked = (() => {
    for (let i = 0; i < lessons.length; i++) {
      if (progress.states[lessons[i].id] !== 'completed') return i;
    }
    return lessons.length;
  })();

  return (
    <>
      {lessons.map((lesson, idx) => (
        <LessonCard
          key={lesson.id}
          lesson={lesson}
          lockedForStudent={idx > firstUnlocked}
        />
      ))}
    </>
  );
}
