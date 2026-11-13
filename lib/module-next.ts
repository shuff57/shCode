// "The lesson to do next": home's Continue card, a module page's Continue button and its "Next up" row all
// call this one rule with the same progress and the same gates, so they cannot point at different lessons.
//
// The rule (ux3):
//   1. A lesson IN PROGRESS that the student may open wins: the one worked on most recently (ties: the
//      earlier one in course order). That is "Continue where you left off".
//   2. Otherwise the FIRST lesson in course order that the student may open and has not completed.
// "May open" is the same two gates the lists and the lesson page apply: lessons unlock in order inside their
// module (`locked`), and a teacher's open date can hold one shut (`isAvailable`). Teachers and admins skip both.
//
// The student gradebook's "Oldest past-due lesson" is a different question (graded work past its due date)
// and deliberately does not use this. See components/ModuleLessonsList.tsx, components/ModuleContinue.tsx
// and components/LessonSearchFilter.tsx.

export type ModuleNext =
  | { kind: 'next'; index: number; id: string; started: boolean; reason: 'in-progress' | 'first-unfinished' }
  | { kind: 'done' }
  | null;

export function pickNextLesson(
  ids: string[],
  opts: {
    /** Progress has loaded; before that nothing is shown (no flash of a wrong lesson). */
    loaded: boolean;
    state: (id: string) => string | undefined;
    /** The open-date gate for one lesson (true when no date holds it shut). */
    isAvailable: (id: string) => boolean;
    /** Teachers and admins skip the locks, as they do in the list. */
    bypass: boolean;
    /** The in-order lock for one lesson (an earlier lesson in its module is not completed). Absent = the
     *  ids are one module and the lock is "every earlier id completed". */
    locked?: (id: string) => boolean;
    /** When the student last worked in a lesson in progress (epoch ms); absent = unknown (sorts oldest). */
    workedAt?: (id: string) => number | undefined;
  },
): ModuleNext {
  if (!opts.loaded || ids.length === 0) return null;
  const firstUnfinished = ids.findIndex((id) => opts.state(id) !== 'completed');
  if (firstUnfinished < 0) return { kind: 'done' };
  const locked = opts.locked ?? ((id: string) => {
    const i = ids.indexOf(id);
    return ids.slice(0, i).some((x) => opts.state(x) !== 'completed');
  });
  const mayOpen = (id: string) => opts.bypass || (opts.isAvailable(id) && !locked(id));

  // 1. The in-progress lesson worked on most recently.
  let best = -1;
  let bestAt = -Infinity;
  ids.forEach((id, i) => {
    if (opts.state(id) !== 'started' || !mayOpen(id)) return;
    const at = opts.workedAt?.(id) ?? 0;
    if (at > bestAt) {
      best = i;
      bestAt = at;
    }
  });
  if (best >= 0) return { kind: 'next', index: best, id: ids[best], started: true, reason: 'in-progress' };

  // 2. The first unfinished lesson the student may open. Nothing to open (an open date holds every
  // unfinished one shut, or the rest are locked behind one) = no pick, as the list shows no Next up.
  const index = ids.findIndex((id) => opts.state(id) !== 'completed' && mayOpen(id));
  if (index < 0) return null;
  return { kind: 'next', index, id: ids[index], started: false, reason: 'first-unfinished' };
}
