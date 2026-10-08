// "Up Next" on /progress: what a student should look at after the work they have actually reached.
//
// The old list was the first five lessons with NO state row in course order, so a student who skipped
// 1.1.1 saw it at the top for the rest of the year. Now: the lessons that are not completed AFTER the
// furthest completed lesson (course order), counted/graded ones first, topped up with the earliest
// non-counted ones; if nothing lies beyond the furthest completed lesson, fall back to the earliest
// lessons with no state row. Pure and deterministic: same input, same list, always in course order.

export function pickUpNext<T extends { id: string }>(
  ordered: readonly T[],
  states: Record<string, string | undefined>,
  counts: (lesson: T) => boolean,
  limit = 5,
): T[] {
  let furthest = -1;
  ordered.forEach((l, i) => {
    if (states[l.id] === 'completed') furthest = i;
  });
  const after = ordered.map((l, i) => ({ l, i })).filter(({ l, i }) => i > furthest && states[l.id] !== 'completed');
  if (after.length === 0) {
    return ordered.filter((l) => !states[l.id]).slice(0, limit);
  }
  const counted = after.filter(({ l }) => counts(l));
  const rest = after.filter(({ l }) => !counts(l));
  const chosen = [...counted.slice(0, limit), ...rest.slice(0, Math.max(0, limit - counted.length))];
  return chosen.sort((a, b) => a.i - b.i).map(({ l }) => l);
}
