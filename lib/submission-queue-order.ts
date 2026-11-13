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

// ---------------------------------------------------------------------------
// The review queue as the teacher reads it: one card per student and lesson
// ---------------------------------------------------------------------------

export interface QueueCard<T> {
  /** `${student}|${lesson}`: the card's identity across reloads. */
  key: string;
  row: T;
  /** Other hand-ins of the same lesson by the same student in the list, not shown as cards. */
  others: number;
}

/**
 * One card per student and lesson. A part with tries (or a re-submitted answer) put the same student
 * and lesson on the list two or three times, identical to the eye, and a teacher could not tell which
 * one to grade. The card shows the hand-in that needs a human if there is one (the newest such),
 * otherwise the newest. `rows` is the GET's order; the result keeps the order of each group's first row.
 */
export function collapseQueue<T extends { id: string; student_email: string; lesson_id: string; score: number | null; grade_json: string | null; submitted_at: number }>(
  rows: T[],
): QueueCard<T>[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const r of rows) {
    const key = `${r.student_email}|${r.lesson_id}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else {
      groups.set(key, [r]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const g = groups.get(key)!;
    const human = g.filter(needsHuman).sort((a, b) => b.submitted_at - a.submitted_at);
    const row = human[0] ?? [...g].sort((a, b) => b.submitted_at - a.submitted_at)[0];
    return { key, row, others: g.length - 1 };
  });
}

/**
 * The queue's intro sentence, built from the same three groups orderCards() sorts by (ux2 T2), so the
 * sentence and the order cannot disagree:
 *   1. needs your score and the score changes the grade (`needCounts`),
 *   2. needs your score but the score does not change the grade, or not yet (`needOther`),
 *   3. already has a score (the rest; inside it, the ones that change the grade first).
 */
// `heldInPlace`: the cards on screen are NOT in the order this sentence describes, because a card the teacher
// just scored keeps its place (orderCards' `previous`) instead of jumping under them. The sentence then says
// so, rather than claiming an order that is not on screen until a reload (rewalk2 T1).
export function queueIntro(total: number, needCounts: number, needOther: number, heldInPlace = false): string {
  const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const base = `${total} recent submission${total === 1 ? '' : 's'}, one per student and lesson.`;
  const need = needCounts + needOther;
  const held = heldInPlace ? ' Cards you just scored stay where they are until you reload the page.' : '';
  if (need === 0) {
    return `${base} Every one has a score; change it below if you disagree.${heldInPlace ? held : ' The ones whose score changes the grade are listed first.'}`;
  }
  let lead = `${need} ${s(need, 'needs', 'need')} your score and ${s(need, 'is', 'are')} listed first`;
  if (needCounts > 0 && needOther > 0) {
    lead += `: the ${needCounts} whose score changes the grade, then the ${needOther} whose score does not change the grade right now`;
  } else if (needOther > 0) {
    lead += `, though ${s(needOther, 'its', 'their')} score does not change the grade right now`;
  }
  const rest = total - need;
  return `${base} ${lead}.${rest > 0 ? ` Work that already has a score comes after.` : ''}${held}`;
}

/**
 * The order cards are read in. Cards that need the teacher's score come first (the student is waiting on
 * them), then the rest; inside each, the cards whose score changes the grade come before the ones whose
 * score does not (a practice lesson, a 0-point lab), each group in the order it came.
 * `counts(card)` false = after; `urgent(card)` true = needs a score (default: none are).
 * `previous` is the key order the teacher was looking at before a reload: keys already on screen keep
 * that order (a card that was just graded does not jump down the list under the teacher), and new
 * keys go first.
 */
export function orderCards<C extends { key: string }>(
  cards: C[],
  counts: (c: C) => boolean,
  previous: readonly string[] = [],
  urgent: (c: C) => boolean = () => false,
): C[] {
  const tier = (c: C) => (urgent(c) ? 0 : 2) + (counts(c) ? 0 : 1);
  const sorted = cards.map((c, i) => ({ c, i })).sort((a, b) => tier(a.c) - tier(b.c) || a.i - b.i).map((x) => x.c);
  if (previous.length === 0) return sorted;
  const at = new Map(previous.map((k, i) => [k, i]));
  const fresh = sorted.filter((c) => !at.has(c.key));
  const kept = sorted.filter((c) => at.has(c.key)).sort((a, b) => (at.get(a.key) as number) - (at.get(b.key) as number));
  return [...fresh, ...kept];
}
