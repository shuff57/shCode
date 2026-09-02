// Course order for a list of manifest lessons.
//
// public/lessons-manifest.json is sorted by lesson FOLDER id — the generator
// says "sort by id for stable output" and means it literally, so the file is
// lexicographic and 1.1.19 lands between 1.1.18 and 1.1.2. That is a fine
// serialization order and a wrong reading order, which is why every consumer
// that displays a *sequence* re-derives it: functions/_shared/lessonAccess.ts,
// lib/lesson-neighbors.ts, components/HeaderLessonNav.tsx,
// components/LessonSearchFilter.tsx and app/teacher/page.tsx each carry their
// own copy of the comparator below.
//
// Directive: do not "fix" the manifest generator instead. Folder ids and
// numbered titles are different keys — 0011_rename_chapter1_lesson_ids.sql
// moved one without the other — and lessonAccess.ts derives the green-to-
// advance lock from this ordering, so changing the file everything reads is a
// much larger blast radius than sorting at the two call sites that need it.

/** "1.1.17" out of "1.1.17 Reading: The Four Ps". Null for the pages that
 *  carry no numbered title. */
export function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

export interface OrderableLesson {
  title: string;
}

/** Numbered lessons first in numeric order, everything else after by title.
 *  Deliberately identical to getNextLesson() in lib/lesson-neighbors.ts: the
 *  two must agree, or "Up Next" names a different lesson than the Next button
 *  actually navigates to. */
export function compareLessons(a: OrderableLesson, b: OrderableLesson): number {
  const an = parseNumberedId(a.title);
  const bn = parseNumberedId(b.title);
  if (an && bn) return an.localeCompare(bn, undefined, { numeric: true });
  if (an) return -1;
  if (bn) return 1;
  return a.title.localeCompare(b.title, undefined, { numeric: true });
}

/** Copy, sorted into course order. Never sorts in place — callers pass the
 *  shared manifest array and a second consumer would see it reordered. */
export function sortLessons<T extends OrderableLesson>(lessons: T[]): T[] {
  return lessons.slice().sort(compareLessons);
}
