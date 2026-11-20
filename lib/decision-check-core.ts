// DRAFT, NOT WIRED IN: an alternative decision model for the fast Check, behind CheaperInference's
// POST /v1/decisions (OpenAI Decisions shape). Nothing imports this file; functions/api/clef-check.ts
// still calls Workers AI Clef. Measured 2026-11-20 with scripts/clef-harness.mjs --provider cheaperinference
// --model decision-1.1 (Microsoft): see scripts/ci-questions/decision-1.1.json for the questions it needs.
//
// What it takes to switch (none of it done):
//   1. A secret CHEAPERINFERENCE_API_KEY, and a fetch to DECISION_URL in the route instead of env.AI.run.
//   2. The per-model questions: generate-ai-graders.mjs would read scripts/ci-questions/decision-1.1.json
//      over lesson.json's own `aiCheck.clef.questions` (the lesson wording is tuned for Clef; this model needs
//      its own for about 57 cards). Questions must come from the server's config, never the body.
//   3. The student's code leaves Cloudflare (to CheaperInference, then Microsoft). Decide that first.
//   4. The key has a per-minute request limit; a 429 must read as "offline" (the browser then runs the
//      slow Check), exactly as the Clef route does for its own refusals. DONE here: askDecision() below
//      returns null for a 429 and every other failure; the route only has to answer 503 { offline: true }.
//
// Pure: no fetch, no DOM. It reuses clef-check-core's state, band and answer reader, so a card comes out in
// the same { id, verdict, p } shape and everything downstream (pattern fallback, notes) is unchanged.

import { cardsFromAnswer, clefInputs, type ClefCard, type ClefConfig, type ClefVerdict } from './clef-check-core';

export const DECISION_URL = 'https://api.cheaperinference.com/v1/decisions';
export const DECISION_MODEL = 'decision-1.1';

/**
 * This model's own "sure" lines. Clef's shared BAND (0.85 / 0.15, lib/clef-check-core.ts) is NOT changed.
 * Measured 2026-11-20 on the 300-lab gate (about 6,000 labelled cells): with the tuned questions, a 0.80 "met"
 * line sends 17.2% of cards to the pattern check, against 21.1% at 0.85, and adds no failing program; below it,
 * confident errors climb (0.75: 9 false greens, 0.70: 14), all on near-miss wrong answers. The "missing" line
 * stays at 0.15: raising it to 0.20 made 7 false reds. Held-out programs: 154/158 at either line.
 */
export const DECISION_BAND = { hi: 0.8, lo: 0.15 } as const;

/** The JSON body for POST DECISION_URL. The code is the only part the request supplies. */
export function decisionRequest(cfg: ClefConfig, code: string, model: string = DECISION_MODEL) {
  return {
    model,
    // The same named fields Clef is given (about / task / student_code), as one string: this API's `input` is text.
    input: JSON.stringify(clefInputs(cfg, code).state),
    // One yes/no question per card, named by the card's id so the answer maps back without relying on order.
    questions: Object.entries(cfg.questions).map(([name, instructions]) => ({ type: 'predicate' as const, name, instructions })),
  };
}

/**
 * The answer as one card per question, or null when the answer as a whole is unusable. A refusal, a
 * missing or unnamed answer, or a probability outside 0..1 makes that card unsure (never green), so the
 * lab's pattern check decides it.
 */
export function cardsFromDecisionAnswer(body: unknown, ids: string[]): ClefCard[] | null {
  const list = (body as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(list)) return null;
  const answers: Record<string, { noul: unknown }> = {};
  for (const a of list as Array<{ type?: unknown; name?: unknown; probability?: unknown }>) {
    if (a && a.type === 'predicate' && typeof a.name === 'string') answers[a.name] = { noul: a.probability };
  }
  const cards = cardsFromAnswer({ answers }, ids);
  // cardsFromAnswer bands at Clef's lines; re-band at this model's own.
  return cards && cards.map((c) => ({ ...c, verdict: decisionBand(c.p) }));
}

/**
 * One call, as the route would make it. Resolves to the cards, or to `null` for EVERY way it can fail: a 429
 * (the key's per-minute limit), any other non-200, a network error, or an unreadable answer. The route turns
 * `null` into `503 { offline: true }`, exactly as it does for a Clef failure, so the browser runs the slow
 * Check and a student never sees the fast path fail. `fetchFn` is injected so this stays pure and testable.
 */
export async function askDecision(
  fetchFn: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>,
  apiKey: string,
  cfg: ClefConfig,
  code: string,
  model: string = DECISION_MODEL,
): Promise<ClefCard[] | null> {
  try {
    const res = await fetchFn(DECISION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionRequest(cfg, code, model)),
    });
    if (!res.ok) return null;
    return cardsFromDecisionAnswer(await res.json(), Object.keys(cfg.questions));
  } catch {
    return null;
  }
}

export function decisionBand(p: number | null): ClefVerdict {
  if (p === null || !Number.isFinite(p)) return 'unsure';
  if (p >= DECISION_BAND.hi) return 'met';
  if (p <= DECISION_BAND.lo) return 'missing';
  return 'unsure';
}
