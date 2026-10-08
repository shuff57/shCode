// The green-to-advance rule, pure so the access gate, the progress footer and a test share one copy.

export type LockRole = 'admin' | 'teacher' | 'student';

/** Admins and teachers bypass green-to-advance gating in the UI. */
export function bypassesLessonLock(role: LockRole | null): boolean {
  return role === 'admin' || role === 'teacher';
}

/** A lesson is locked for a student when it is not first in its module and some earlier lesson there is
 *  not completed. Bypass roles are never locked. A lesson outside the list (index -1) or first in it is
 *  open. */
export function isSequenceLocked(
  siblingIds: readonly string[],
  lessonId: string,
  states: Record<string, string | undefined>,
  role: LockRole | null,
): boolean {
  if (bypassesLessonLock(role)) return false;
  const idx = siblingIds.indexOf(lessonId);
  if (idx <= 0) return false;
  return !siblingIds.slice(0, idx).every((id) => states[id] === 'completed');
}
