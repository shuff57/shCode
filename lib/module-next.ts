// Which lesson a module page's "Continue" button points at, and which row it marks as next up.
// Pure, so the button and the list cannot disagree: both call this with the same progress and
// the same two gates the list already applies (lessons unlock in order; an open date can hold
// one shut). See components/ModuleLessonsList.tsx and components/ModuleContinue.tsx.

export type ModuleNext =
  | { kind: 'next'; index: number; id: string; started: boolean }
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
  },
): ModuleNext {
  if (!opts.loaded || ids.length === 0) return null;
  const index = ids.findIndex((id) => opts.state(id) !== 'completed');
  if (index < 0) return { kind: 'done' };
  const id = ids[index];
  // The first unfinished lesson is never sequence-locked (every lesson before it is done),
  // but a teacher's open date can still hold it shut: then there is nowhere to continue to.
  if (!opts.bypass && !opts.isAvailable(id)) return null;
  return { kind: 'next', index, id, started: opts.state(id) === 'started' };
}
