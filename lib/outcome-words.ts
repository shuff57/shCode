// Words for "what happened after I pressed it" on a student lesson (ux1 student batch):
// when a Run or Check last ran, whether the code changed since, and the saved
// outcome a returning student sees ("Submitted on Tue, Nov 11"). Pure, so
// scripts/test-outcome-words.mjs can pin it.

/** Under a minute ago reads "just now"; after that the clock time it ran. */
export function ranWhen(at: number, now: number, locale?: string): string {
  if (now - at < 60_000) return 'just now';
  return 'at ' + new Date(at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

/** A day a 14-year-old reads at a glance: "Tue, Nov 11", with the year only when it is not this one. */
export function submittedOn(at: number, now: number, locale?: string): string {
  const d = new Date(at);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Whether a result is out of date: it was produced from `ranOn` (a snapshot of the
 * text it read) and the text is now `current`. No snapshot means nothing ran yet,
 * which is not "out of date".
 */
export function isOutOfDate(ranOn: string | null, current: string): boolean {
  return ranOn !== null && ranOn !== current;
}

/** The newest `submittedAt` of a list of submission rows, or null. */
export function latestSubmittedAt(rows: { submittedAt?: number | null }[]): number | null {
  let best: number | null = null;
  for (const r of rows) {
    const t = r.submittedAt;
    if (typeof t === 'number' && Number.isFinite(t) && (best === null || t > best)) best = t;
  }
  return best;
}

/** The quiz score line, the same words at the head of the quiz and beside Check. */
export function quizScoreLine(correct: number, total: number, needed: number): string {
  return correct >= needed
    ? `Passed: ${correct} of ${total} right`
    : `${correct} of ${total} right. You need ${needed}.`;
}
