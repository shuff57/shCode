// Browser call for the fast Check (functions/api/clef-check.ts). Null means "use today's Check":
// no binding, an outage, a timeout, the allowance spent, or a lesson without Clef questions. The
// caller never shows this failure to the student; the slow Check simply runs instead.

import type { ClefCard } from './clef-check-core';

const TIMEOUT_MS = 6000;

export async function fetchClefCards(lessonId: string, response: string): Promise<ClefCard[] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/clef-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, response }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; cards?: ClefCard[] };
    return body.ok && Array.isArray(body.cards) ? body.cards : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
