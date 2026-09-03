'use client';

// Client-side due-date store backed by /api/my-due-dates. Single shared cache
// plus pub/sub so every badge on a page hits the API once — same shape as
// lib/progress.ts, and deliberately so: the two are read side by side in
// every list that renders a lesson.
//
// All the actual resolution logic lives in lib/due-dates-core.ts and is shared
// verbatim with the Pages Functions.

import { useEffect, useState } from 'react';
import {
  buildDueIndex,
  buildOpenIndex,
  isAvailable,
  moduleDueSummary,
  resolveDueAt,
  type DueDateRow,
  type DueIndex,
  type ModuleDueSummary,
  type OpenDateRow,
} from './due-dates-core';

export {
  SCHOOL_TZ,
  dueStatus,
  formatDue,
  formatDueTime,
  formatTime,
  isAvailable,
  moduleIdFromTitle,
  schoolDateString,
  schoolTimeString,
  type DueStatus,
  type ModuleDueSummary,
} from './due-dates-core';

interface ClassDue {
  classId: string;
  className: string;
  index: DueIndex;
  /** class_open_dates for the same class, in the same three-map shape. */
  openIndex: DueIndex;
}

export interface DueDatesSnapshot {
  loaded: boolean;
  authed: boolean;
  classes: ClassDue[];
  /** Lesson ids this student has a standing early-access grant for. */
  overrides: Set<string>;
}

export interface ResolvedDue {
  dueAt: number;
  className: string;
  /** True when the student is in more than one class that dates this lesson. */
  ambiguous: boolean;
}

const empty: DueDatesSnapshot = { loaded: false, authed: false, classes: [], overrides: new Set() };
let cache: DueDatesSnapshot = empty;
let inflight: Promise<DueDatesSnapshot> | null = null;
const subs = new Set<(s: DueDatesSnapshot) => void>();

function notify() {
  subs.forEach((f) => f(cache));
}

interface ApiClass {
  classId: string;
  className: string;
  rows: DueDateRow[];
  openRows?: OpenDateRow[];
}

/** When a lesson opens, and which class said so. */
export interface ResolvedOpen {
  openAt: number;
  className: string;
  /** True when more than one of the student's classes gates this lesson. */
  ambiguous: boolean;
}

async function load(): Promise<DueDatesSnapshot> {
  try {
    const res = await fetch('/api/my-due-dates', { credentials: 'include' });
    if (res.status === 401) return { loaded: true, authed: false, classes: [], overrides: new Set() };
    if (!res.ok) throw new Error(`my-due-dates GET ${res.status}`);
    const data = (await res.json()) as { classes?: ApiClass[]; overrides?: string[] };
    return {
      loaded: true,
      authed: true,
      classes: (data.classes ?? []).map((c) => ({
        classId: c.classId,
        className: c.className,
        index: buildDueIndex(c.rows ?? []),
        openIndex: buildOpenIndex(c.openRows ?? []),
      })),
      overrides: new Set(data.overrides ?? []),
    };
  } catch {
    // A due date is advisory and an open date is a gate, but both fail the
    // same way on purpose: no classes means no dates, which means no badges
    // and nothing locked. A network blip must never seal a student out of
    // work they can already see.
    return { loaded: true, authed: false, classes: [], overrides: new Set() };
  }
}

export function ensureDueDatesLoaded(): Promise<DueDatesSnapshot> {
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

export function useDueDates(): DueDatesSnapshot {
  const [snap, setSnap] = useState<DueDatesSnapshot>(cache);
  useEffect(() => {
    const sub = (s: DueDatesSnapshot) => setSnap({ ...s });
    subs.add(sub);
    if (cache.loaded) sub(cache);
    else ensureDueDatesLoaded();
    return () => {
      subs.delete(sub);
    };
  }, []);
  return snap;
}

// Resolve one lesson across every class the student is in, earliest wins.
// Runs per class rather than over a merged index — see the note in
// functions/api/my-due-dates.ts for why merging is wrong.
export function resolveDue(
  snap: DueDatesSnapshot,
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): ResolvedDue | null {
  let best: ResolvedDue | null = null;
  let matches = 0;
  for (const cls of snap.classes) {
    const dueAt = resolveDueAt(cls.index, { lessonId, moduleId, unitId });
    if (dueAt === null) continue;
    matches++;
    if (best === null || dueAt < best.dueAt) {
      best = { dueAt, className: cls.className, ambiguous: false };
    }
  }
  if (best) best.ambiguous = matches > 1;
  return best;
}

// A clock that re-renders its component every `everyMs`, so a lesson whose
// open time passes while the tab sits there unlocks on its own. A student
// waiting for 8:00 AM staring at a locked card should not have to guess that
// a refresh is what fixes it.
//
// 30s is the resolution: the gate stores whole minutes, so worst case a
// lesson opens 30 seconds late, and the cost is one setState per tab per
// half-minute.
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

/** The hook form of lessonAvailability — subscribes to the store and ticks. */
export function useLessonAvailability(
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): LessonAvailability {
  const snap = useDueDates();
  const now = useNow();
  return lessonAvailability(snap, lessonId, moduleId, unitId, now);
}

// When this lesson opens, across every class the student is in. Earliest
// wins, same as a due date — for a gate that means the least restrictive
// class that actually sets a date.
//
// Classes with NO open rows are skipped rather than counted as "open now".
// Most students sit in two classes (the archived Legacy class plus their
// real one); letting an ungated class veto a gated one would mean the
// feature never locked anything for anybody.
export function resolveOpen(
  snap: DueDatesSnapshot,
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): ResolvedOpen | null {
  let best: ResolvedOpen | null = null;
  let matches = 0;
  for (const cls of snap.classes) {
    const openAt = resolveDueAt(cls.openIndex, { lessonId, moduleId, unitId });
    if (openAt === null) continue;
    matches++;
    if (best === null || openAt < best.openAt) {
      best = { openAt, className: cls.className, ambiguous: false };
    }
  }
  if (best) best.ambiguous = matches > 1;
  return best;
}

export interface LessonAvailability {
  /** False only when a resolved open date is still in the future. */
  available: boolean;
  /** The instant it opens, or null when nothing gates it. */
  openAt: number | null;
  className?: string;
  ambiguous: boolean;
}

/** Always available — the answer before the snapshot loads, and for a
 *  role that bypasses locks. Shared so no caller invents its own default. */
export const ALWAYS_AVAILABLE: LessonAvailability = { available: true, openAt: null, ambiguous: false };

// The single availability answer for one lesson. Every lock site calls this
// rather than comparing timestamps itself, so the card, the module row, the
// footer dot and the workspace gate cannot drift apart.
//
// `now` is passed in rather than read here: a component that re-renders on a
// timer can pass a ticking clock, and a test can pass a fixed one.
export function lessonAvailability(
  snap: DueDatesSnapshot,
  lessonId: string,
  moduleId: string | null | undefined,
  unitId: string | null | undefined,
  now: number,
): LessonAvailability {
  // Not loaded yet = don't lock. Locking on an unloaded snapshot would flash
  // a lock on every lesson on every cold page load.
  if (!snap.loaded) return ALWAYS_AVAILABLE;
  // A per-student grant (lesson_access_overrides) short-circuits the open
  // date entirely — that is the whole point of it. openAt is still reported
  // when one resolves, so a card can show "opens Sep 15" struck through or
  // similar rather than looking like nothing was ever locked here.
  if (snap.overrides.has(lessonId)) {
    const open = resolveOpen(snap, lessonId, moduleId, unitId);
    return { available: true, openAt: open?.openAt ?? null, className: open?.className, ambiguous: false };
  }
  const open = resolveOpen(snap, lessonId, moduleId, unitId);
  if (!open) return ALWAYS_AVAILABLE;
  return {
    available: isAvailable(open.openAt, now),
    openAt: open.openAt,
    className: open.className,
    ambiguous: open.ambiguous,
  };
}

// Module header summary, resolved the same earliest-wins way. When two classes
// both date a module we summarise the one holding the earliest date rather
// than trying to blend two calendars into one header.
export function resolveModuleSummary(
  snap: DueDatesSnapshot,
  moduleId: string,
  lessonIds: readonly string[],
  unitId?: string | null,
): (ModuleDueSummary & { className: string }) | null {
  let best: (ModuleDueSummary & { className: string }) | null = null;
  for (const cls of snap.classes) {
    const summary = moduleDueSummary(cls.index, moduleId, lessonIds, unitId);
    if (summary.kind === 'none') continue;
    const key = summary.min;
    if (key === null) continue;
    if (best === null || key < (best.min ?? Infinity)) {
      best = { ...summary, className: cls.className };
    }
  }
  return best;
}
