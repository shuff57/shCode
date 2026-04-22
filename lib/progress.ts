'use client';

// Client-side store for lesson state backed by /api/lesson-state.
// Absence of an entry in `states` = not_opened.
// Single shared cache + pub/sub so every progress widget on a page
// hits the API once.

import { useEffect, useState } from 'react';

export type LessonState = 'started' | 'completed';

export interface LessonStateSnapshot {
  loaded: boolean;
  authed: boolean;
  states: Record<string, LessonState>;
  scores: Record<string, number>;
}

const empty: LessonStateSnapshot = { loaded: false, authed: false, states: {}, scores: {} };
let cache: LessonStateSnapshot = empty;
let inflight: Promise<LessonStateSnapshot> | null = null;
const subs = new Set<(s: LessonStateSnapshot) => void>();

function notify() {
  subs.forEach((f) => f(cache));
}

async function load(): Promise<LessonStateSnapshot> {
  try {
    const res = await fetch('/api/lesson-state', { credentials: 'include' });
    if (res.status === 401) {
      return { loaded: true, authed: false, states: {}, scores: {} };
    }
    if (!res.ok) throw new Error(`lesson-state GET ${res.status}`);
    const data = (await res.json()) as { states: Record<string, LessonState>; scores: Record<string, number> };
    return { loaded: true, authed: true, states: data.states ?? {}, scores: data.scores ?? {} };
  } catch {
    return { loaded: true, authed: false, states: {}, scores: {} };
  }
}

export function ensureLessonStateLoaded(): Promise<LessonStateSnapshot> {
  if (cache.loaded) return Promise.resolve(cache);
  if (!inflight) {
    inflight = load().then((s) => {
      cache = s;
      inflight = null;
      notify();
      return s;
    });
  }
  return inflight;
}

export function useLessonState(): LessonStateSnapshot {
  const [snap, setSnap] = useState<LessonStateSnapshot>(cache);
  useEffect(() => {
    const sub = (s: LessonStateSnapshot) => setSnap({ ...s });
    subs.add(sub);
    if (cache.loaded) sub(cache);
    else ensureLessonStateLoaded();
    return () => {
      subs.delete(sub);
    };
  }, []);
  return snap;
}

async function postState(lessonId: string, state: LessonState, score?: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/lesson-state/${encodeURIComponent(lessonId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score !== undefined ? { state, score } : { state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function recordLessonStarted(lessonId: string): Promise<void> {
  await ensureLessonStateLoaded();
  if (!cache.authed) return;
  // 'completed' is sticky server-side; skip the POST if we already know it's set.
  if (cache.states[lessonId]) return;
  const ok = await postState(lessonId, 'started');
  if (ok) {
    cache = { ...cache, states: { ...cache.states, [lessonId]: 'started' } };
    notify();
  }
}

export async function recordLessonCompleted(lessonId: string, score?: number): Promise<void> {
  await ensureLessonStateLoaded();
  if (!cache.authed) return;
  const ok = await postState(lessonId, 'completed', score);
  if (ok) {
    const nextScores = { ...cache.scores };
    if (score !== undefined) nextScores[lessonId] = score;
    cache = {
      ...cache,
      states: { ...cache.states, [lessonId]: 'completed' },
      scores: nextScores,
    };
    notify();
  }
}

export async function resetLessonState(lessonId: string): Promise<void> {
  await ensureLessonStateLoaded();
  if (!cache.authed) return;
  try {
    const res = await fetch(`/api/lesson-state/${encodeURIComponent(lessonId)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return;
  } catch {
    return;
  }
  const nextStates = { ...cache.states };
  const nextScores = { ...cache.scores };
  delete nextStates[lessonId];
  delete nextScores[lessonId];
  cache = { ...cache, states: nextStates, scores: nextScores };
  notify();
}
