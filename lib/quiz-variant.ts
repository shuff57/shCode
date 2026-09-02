// Per-student forms for a multiple-choice quiz.
//
// Two independent knobs, both opt-in per lesson (see QuizConfig):
//
//   variants — the quiz carries three forms' worth of questions and each
//              student is shown exactly one form's worth
//   shuffle  — the questions, and the options inside them, are re-ordered
//
// Both are derived from a hash of (lesson id + the student's email), so a
// student sees the same paper every time they reload, on any device, with
// nothing stored anywhere. Two students sitting next to each other see
// different papers. There are no cards to hand out and no roster to keep.
//
// The one rule that makes this safe to bolt onto an existing quiz: **an
// answer is stored by its index into `question.options`, never by where it
// was drawn.** QuizView translates at the click, so `countCorrect`, the
// recorded submission and every saved draft mean exactly what they meant
// before shuffling existed, and a re-shuffle can never silently re-point a
// student's answer at a different option.

import type { QuizConfig, QuizQuestion } from './types';

/** One question as it should be drawn for this student. */
export interface QuizViewQuestion {
  question: QuizQuestion;
  /**
   * Display order. `order[displayed] = index into question.options`, so the
   * option drawn third is `question.options[order[2]]` and clicking it stores
   * `order[2]`.
   */
  order: number[];
}

export interface QuizViewModel {
  /** The form this student sits, or null when the quiz declares no variants. */
  variant: string | null;
  questions: QuizViewQuestion[];
}

/** FNV-1a, 32-bit. Small, stable across engines, and not a security boundary. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG. Same seed, same sequence, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a copy. Never mutates the input. */
export function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Which form this student sits. Deterministic, and spread evenly enough for a
 * class of 25 — the seed is a full hash, not the low bits of an id.
 */
export function assignVariant(variants: string[] | undefined, seed: number): string | null {
  if (!variants || variants.length === 0) return null;
  return variants[seed % variants.length];
}

/**
 * The questions this student is asked, in the order they should be drawn.
 *
 * `identity` is the student's email, or 'guest' when nobody is signed in — a
 * signed-out visitor still gets a stable, sensible paper rather than a
 * reshuffle on every render.
 */
export function buildQuizView(
  config: QuizConfig,
  lessonId: string,
  identity: string,
): QuizViewModel {
  const all = config.questions ?? [];
  const seed = hashSeed(`${lessonId}:${identity}`);
  const variant = assignVariant(config.variants, seed);

  // A question with no `variant` is common to every form. A tagged one belongs
  // to its form alone. With no variants declared, nothing is filtered — a
  // stray tag is a config error the checker catches, not a reason to hide a
  // question at runtime.
  const mine = variant === null ? all : all.filter((q) => !q.variant || q.variant === variant);

  if (!config.shuffle) {
    return { variant, questions: mine.map((q) => ({ question: q, order: identityOrder(q) })) };
  }

  // Separate streams per question, so adding a question to the end of the file
  // does not re-order the options of every question before it.
  const rand = mulberry32(seed);
  const ordered = shuffle(mine, rand);
  return {
    variant,
    questions: ordered.map((q) => ({
      question: q,
      order: shuffle(identityOrder(q), mulberry32(hashSeed(`${lessonId}:${identity}:${q.id}`))),
    })),
  };
}

function identityOrder(q: QuizQuestion): number[] {
  return (q.options ?? []).map((_, i) => i);
}
