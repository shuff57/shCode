// The review queue's order and cap (GET /api/classes/[id]/submission-queue).
//
// The queue used to be "the 50 most recent graded rows", so a busy stretch of routine rows (25
// students x 8 auto-checked code labs) pushed an older grader-outage row off the end, and the one
// answer a student was waiting on a human for was no longer on the teacher's screen. A row that
// needs a human now comes first and is fetched on its own, so routine rows cannot crowd it out.

/** Rows that need a human at most; routine rows fill what is left up to QUEUE_TOTAL_CAP. */
export const QUEUE_TOTAL_CAP = 100;
/** The newest routine rows shown (the old "most recent 50" feed). */
export const QUEUE_ROUTINE_CAP = 50;

/**
 * True when nothing has scored this row yet: the grader-outage marker (`gradingFailed` is the JSON
 * value true at the top level, the same exact rule attempts.ts counts by) and no score on the row.
 * A teacher's mark writes a score and leaves the marker, so a marked row is routine again.
 * Malformed JSON is routine rather than a throw: one bad legacy row must not take down the queue.
 */
export function needsHuman(row: { score: number | null; grade_json: string | null }): boolean {
  if (row.score !== null && row.score !== undefined) return false;
  if (!row.grade_json) return false;
  try {
    const parsed = JSON.parse(row.grade_json) as { gradingFailed?: unknown } | null;
    return !!parsed && typeof parsed === 'object' && parsed.gradingFailed === true;
  } catch {
    return false;
  }
}

/**
 * Rows needing a human first (newest first among them), then the newest routine rows, no id twice,
 * never more than QUEUE_TOTAL_CAP in all and never more than QUEUE_ROUTINE_CAP routine ones.
 * `pending` and `recent` are each newest-first as the two queries return them; `recent` may
 * itself contain rows that need a human (it is every graded row), which are moved to the front.
 */
export function orderQueue<T extends { id: string; score: number | null; grade_json: string | null; submitted_at: number }>(
  pending: T[],
  recent: T[],
  totalCap: number = QUEUE_TOTAL_CAP,
  routineCap: number = QUEUE_ROUTINE_CAP,
): T[] {
  const seen = new Set<string>();
  const human: T[] = [];
  const routine: T[] = [];
  for (const r of pending) {
    if (seen.has(r.id) || !needsHuman(r)) continue;
    seen.add(r.id);
    human.push(r);
  }
  for (const r of recent) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    if (needsHuman(r)) human.push(r);
    else routine.push(r);
  }
  // `recent` can add a human row newer than some of `pending` only if `pending` was truncated, so
  // re-sort the human group by time to keep it newest first.
  human.sort((a, b) => b.submitted_at - a.submitted_at);
  const h = human.slice(0, totalCap);
  return [...h, ...routine.slice(0, Math.max(0, Math.min(routineCap, totalCap - h.length)))];
}
