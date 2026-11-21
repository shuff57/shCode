// The fast Check's model: Microsoft decision-1.1 behind CheaperInference's POST /v1/decisions (OpenAI Decisions
// shape), which REPLACED Cloudflare Clef here (2026-11-21, owner's decision). functions/api/clef-check.ts calls
// askDecision(). Measured with scripts/clef-harness.mjs --provider cheaperinference --model decision-1.1.
//
//   - The per-model questions are scripts/ci-questions/decision-1.1.json, laid over lesson.json's own
//     `aiCheck.clef.questions` by generate-ai-graders.mjs (the lesson wording was tuned for Clef; this model needs
//     its own for some cards). Questions come from the server's config, never the body.
//   - The student's code LEAVES Cloudflare (to CheaperInference, then Microsoft). Every request carries
//     `zdr: true` so it is routed only through zero-data-retention providers (the account's own Data Protection
//     mode is on too). The owner decided this 2026-11-21, having read CheaperInference's terms; those say
//     "Do not submit ... children's data" and do not state the serving provider's retention.
//   - The key has a per-minute request limit; a 429 reads as "offline" (the browser then runs the slow Check),
//     exactly as the route does for any failure: askDecision() returns null for a 429 and every other failure.
//
//   - The questions file and DECISION_BAND were measured on decision-1.1 ONLY. Another model needs its own
//     questions file, its own band and a gate run (scripts/clef-harness.mjs) before production asks it.
//
// Pure: no fetch, no DOM. It reuses clef-check-core's checkState, so a card comes out in the same
// { id, verdict, p } shape and everything downstream (pattern fallback, notes) is unchanged.

import { checkState, type ClefCard, type ClefConfig, type ClefVerdict } from './clef-check-core';

export const DECISION_URL = 'https://api.cheaperinference.com/v1/decisions';
export const DECISION_MODEL = 'decision-1.1';

/**
 * This model's "sure" lines.
 * Measured 2026-11-20 on the 300-lab gate (about 6,000 labelled cells): with the tuned questions, a 0.80 "met"
 * line sends 17.2% of cards to the pattern check, against 21.1% at 0.85, and adds no failing program; below it,
 * confident errors climb (0.75: 9 false greens, 0.70: 14), all on near-miss wrong answers. The "missing" line
 * stays at 0.15: raising it to 0.20 made 7 false reds. Held-out programs: 154/158 at either line.
 */
export const DECISION_BAND = { hi: 0.8, lo: 0.15 } as const;

/**
 * The model the route asks, from the optional DECISION_CHECK_MODEL. Only a build of decision-1.1 is accepted
 * (`decision-1.1` itself, or a pinned `decision-1.1-<suffix>`), because the questions and the band above were
 * measured on it; anything else is ignored and decision-1.1 is asked. `ignored` says so, for the log.
 */
export function decisionModelFor(configured: string | undefined): { model: string; ignored: boolean } {
  const v = (configured ?? '').trim();
  if (!v) return { model: DECISION_MODEL, ignored: false };
  if (v === DECISION_MODEL || v.startsWith(DECISION_MODEL + '-')) return { model: v, ignored: false };
  return { model: DECISION_MODEL, ignored: true };
}

/** The JSON body for POST DECISION_URL. The code is the only part the request supplies. */
export function decisionRequest(cfg: ClefConfig, code: string, model: string = DECISION_MODEL) {
  return {
    model,
    // Zero data retention, asked for on EVERY request: the call is routed only through providers that keep
    // nothing, or refused with a 503 (which reads as "offline" below). The account's own mode does the same;
    // this makes the request safe even if that setting is ever changed. A student's code never goes anywhere else.
    zdr: true as const,
    // The named fields (about / task / student_code), as one string: this API's `input` is text.
    input: JSON.stringify(checkState(cfg, code)),
    // One yes/no question per card, named by the card's id so the answer maps back without relying on order.
    questions: Object.entries(cfg.questions).map(([name, instructions]) => ({ type: 'predicate' as const, name, instructions })),
  };
}

/**
 * The answer as one card per question, or null when the answer as a whole is unusable. A refusal, a
 * missing or unnamed answer, or a probability outside 0..1 makes that card unsure (never green), so the
 * lab's pattern check decides it.
 */
export function cardsFromDecisionAnswer(
  body: unknown,
  ids: string[],
  lines: { hi: number; lo: number } = DECISION_BAND,
): ClefCard[] | null {
  const list = (body as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(list)) return null;
  const raw: Record<string, unknown> = {};
  for (const a of list as Array<{ type?: unknown; name?: unknown; probability?: unknown }>) {
    if (a && a.type === 'predicate' && typeof a.name === 'string') raw[a.name] = a.probability;
  }
  // Banded on the RAW probability, rounded only for display: rounding first made 0.7996 read 0.8 and go green,
  // under the 0.80 line.
  return ids.map((id) => {
    const r = raw[id];
    const p = typeof r === 'number' && r >= 0 && r <= 1 ? r : null;
    return { id, verdict: decisionBand(p, lines), p: p === null ? null : Math.round(p * 1000) / 1000 };
  });
}

/**
 * One call, as the route would make it. Resolves to the cards, or to `null` for EVERY way it can fail: a 429
 * (the key's per-minute limit), any other non-200, a network error, or an unreadable answer. The route turns
 * `null` into `503 { offline: true }`, so the browser runs the slow
 * Check and a student never sees the fast path fail. `fetchFn` is injected so this stays pure and testable.
 */
export async function askDecision(
  fetchFn: (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>,
  apiKey: string,
  cfg: ClefConfig,
  code: string,
  model: string = DECISION_MODEL,
  signal?: AbortSignal,
): Promise<ClefCard[] | null> {
  try {
    const res = await fetchFn(DECISION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionRequest(cfg, code, model)),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) return null;
    return cardsFromDecisionAnswer(await res.json(), Object.keys(cfg.questions));
  } catch {
    return null;
  }
}

export function decisionBand(p: number | null, lines: { hi: number; lo: number } = DECISION_BAND): ClefVerdict {
  if (p === null || !Number.isFinite(p)) return 'unsure';
  if (p >= lines.hi) return 'met';
  if (p <= lines.lo) return 'missing';
  return 'unsure';
}
