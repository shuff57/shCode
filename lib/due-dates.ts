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
  moduleDueSummary,
  resolveDueAt,
  type DueDateRow,
  type DueIndex,
  type ModuleDueSummary,
} from './due-dates-core';

export {
  SCHOOL_TZ,
  dueStatus,
  formatDue,
  moduleIdFromTitle,
  schoolDateString,
  type DueStatus,
  type ModuleDueSummary,
} from './due-dates-core';

interface ClassDue {
  classId: string;
  className: string;
  index: DueIndex;
}

export interface DueDatesSnapshot {
  loaded: boolean;
  authed: boolean;
  classes: ClassDue[];
}

export interface ResolvedDue {
  dueAt: number;
  className: string;
  /** True when the student is in more than one class that dates this lesson. */
  ambiguous: boolean;
}

const empty: DueDatesSnapshot = { loaded: false, authed: false, classes: [] };
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
}

async function load(): Promise<DueDatesSnapshot> {
  try {
    const res = await fetch('/api/my-due-dates', { credentials: 'include' });
    if (res.status === 401) return { loaded: true, authed: false, classes: [] };
    if (!res.ok) throw new Error(`my-due-dates GET ${res.status}`);
    const data = (await res.json()) as { classes?: ApiClass[] };
    return {
      loaded: true,
      authed: true,
      classes: (data.classes ?? []).map((c) => ({
        classId: c.classId,
        className: c.className,
        index: buildDueIndex(c.rows ?? []),
      })),
    };
  } catch {
    // A due date is advisory, never a gate. A failed fetch renders no badges
    // rather than blocking anything.
    return { loaded: true, authed: false, classes: [] };
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
