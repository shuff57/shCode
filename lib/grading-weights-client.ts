'use client';

// Client-side store for the signed-in student's effective grade-category
// weights, backed by /api/my-grading-weights. Same singleton + pub/sub
// shape as lib/progress.ts so every UnitProgressBadge on the page shares
// one fetch. Defaults to DEFAULT_WEIGHTS synchronously (before the fetch
// resolves, and for a teacher/admin/signed-out visitor who has none) so a
// badge never has to gate rendering on this loading.

import { useEffect, useState } from 'react';
import { DEFAULT_WEIGHTS, type GradeCategory } from './grading-weights';

export interface GradingWeightsSnapshot {
  loaded: boolean;
  weights: Record<GradeCategory, number>;
}

const empty: GradingWeightsSnapshot = { loaded: false, weights: DEFAULT_WEIGHTS };
let cache: GradingWeightsSnapshot = empty;
let inflight: Promise<void> | null = null;
const subs = new Set<(s: GradingWeightsSnapshot) => void>();

function notify() {
  subs.forEach((f) => f(cache));
}

async function load(): Promise<void> {
  try {
    const res = await fetch('/api/my-grading-weights', { credentials: 'include' });
    if (!res.ok) {
      cache = { loaded: true, weights: DEFAULT_WEIGHTS };
      notify();
      return;
    }
    const data = (await res.json()) as { weights?: Partial<Record<GradeCategory, number>> };
    cache = { loaded: true, weights: { ...DEFAULT_WEIGHTS, ...(data.weights ?? {}) } };
  } catch {
    cache = { loaded: true, weights: DEFAULT_WEIGHTS };
  }
  notify();
}

function ensureGradingWeightsLoaded(): void {
  if (cache.loaded || inflight) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

export function useGradingWeights(): GradingWeightsSnapshot {
  const [snap, setSnap] = useState<GradingWeightsSnapshot>(cache);
  useEffect(() => {
    const sub = (s: GradingWeightsSnapshot) => setSnap(s);
    subs.add(sub);
    if (cache.loaded) sub(cache);
    else ensureGradingWeightsLoaded();
    return () => {
      subs.delete(sub);
    };
  }, []);
  return snap;
}
