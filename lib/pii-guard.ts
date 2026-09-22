// The ML layer of the AI-tutor safety gate, on top of the regex gate in
// pii-check.ts. This file is the DECISION logic only -- pure, synchronous,
// no model loading -- so it can be unit tested without touching a byte of
// ONNX. The inference itself lives in the worker (public/models/, generated
// by scripts/build-pii-guard-models.mjs); the client wrapper feeds results
// here as plain data.
//
// Thresholds are picked from measured scores, not guesses:
// scripts/probe-pii-guard.mjs prints raw model output for a labeled corpus.

import { findPII } from './pii-check';

export interface InjectionVerdict {
  /** Top label from Prompt Guard 2 22M. The staged mirror is 2-class: BENIGN | MALICIOUS. */
  label: string;
  score: number;
}

export interface PiiSpan {
  /** Aggregated Presidio-style label, e.g. 'EMAIL_ADDRESS' or 'PERSON'. */
  label: string;
  score: number;
}

export interface SafetyVerdict {
  blocked: boolean;
  /** Human-readable category for the block message; null when safe. */
  reason: string | null;
}

// Blocking labels, narrowed by measurement (probe-pii-guard.mjs). The model
// reliably catches these and the regex gate cannot: PASSWORD and
// US_DRIVER_LICENSE especially. Dropped from the set because the probe showed
// the model misses or mislabels them (IMEI -> ORGANIZATION/CREDIT_CARD noise,
// IBAN_CODE -> ORGANIZATION, US_LICENSE_PLATE -> nothing): keeping them would
// add no catch rate and only risk noise.
export const BLOCKING_PII_LABELS: Record<string, string> = {
  EMAIL_ADDRESS: 'email address',
  PHONE_NUMBER: 'phone number',
  US_SSN: 'social security number',
  CREDIT_CARD: 'credit card number',
  PASSWORD: 'password',
  US_DRIVER_LICENSE: "driver's license number",
  IP_ADDRESS: 'IP address',
  US_BANK_NUMBER: 'bank account number',
  US_PASSPORT: 'passport number',
  US_ITIN: 'tax ID number',
};

// Out of scope by design (NER-shaped: students naturally mention teachers,
// friends, places, dates in a tutor) plus buckets the probe showed are noise.
// A hit on any of these NEVER blocks.
const IGNORED_PII_LABELS = new Set([
  'PERSON', 'ORGANIZATION', 'LOCATION', 'DATE_TIME', 'NRP', 'TITLE', 'URL',
  'AGE', 'COORDINATE', 'FINANCIAL', 'IMEI', 'IBAN_CODE', 'US_LICENSE_PLATE',
  'MAC_ADDRESS',
]);

// A span below this confidence is model noise, not evidence. Measured in the
// browser (probe + manual probes): real blocking hits on SSN/license/IP land
// 0.73-0.99; PASSWORD is the weakest reliable category, measured 0.52-0.92
// depending on phrasing -- 0.5 catches 'my password is Sunshine123' and
// 'hunter2' while ordinary tutor traffic (name mentions, locations, plain
// questions) produced no PASSWORD span above 0.3. Not stricter -- the
// hard-block policy has no override, so recall matters more here.
export const PII_MIN_SCORE = 0.5;

export interface GateResult {
  blocked: boolean;
  /** Which layer fired: 'regex' | 'injection' | 'pii', null when allowed. */
  layer: 'regex' | 'injection' | 'pii' | null;
  /** Human-facing reason, already worded for a student. */
  reason: string | null;
}

/**
 * The single decision point. Order is load-bearing: regex first (free, sync,
 * catches the exact shapes it was built for), then the injection classifier,
 * then PII spans. First block wins.
 */
export function evaluateSafety(
  text: string,
  injection: InjectionVerdict | null,
  piiSpans: PiiSpan[],
): GateResult {
  const regexHit = findPII(text);
  if (regexHit) {
    return {
      blocked: true,
      layer: 'regex',
      reason: `Message blocked — looks like it contains personal info (${regexHit}). Remove it and try again.`,
    };
  }

  if (injection && injection.label !== 'BENIGN') {
    return {
      blocked: true,
      layer: 'injection',
      reason:
        "Message blocked — this may look like an attempt to manipulate the AI. Rephrase it as a question about your own code and try again.",
    };
  }

  const hit = piiSpans.find(
    (s) => s.score >= PII_MIN_SCORE && !IGNORED_PII_LABELS.has(s.label) && BLOCKING_PII_LABELS[s.label],
  );
  if (hit) {
    return {
      blocked: true,
      layer: 'pii',
      reason: `Message blocked — looks like it contains a ${BLOCKING_PII_LABELS[hit.label]}. Remove it and try again.`,
    };
  }

  return { blocked: false, layer: null, reason: null };
}