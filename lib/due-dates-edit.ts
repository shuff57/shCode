'use client';

// Teacher-side date store: the rows for ONE chosen class, for BOTH "Due" and
// "Opens", plus a writer for each.
//
// This is deliberately separate from lib/due-dates.ts. That store answers
// "when is this due/open for me?" and reads /api/my-due-dates, which is
// scoped by enrollment — a teacher is not enrolled in their own class, so it
// returns nothing for them. This one answers "what have I set this to for
// Period 3?" and reads the class's own rows, which is the thing an editor
// has to edit.
//
// Same singleton + pub/sub shape as lib/progress.ts so every chip on the page
// shares one fetch and one re-render.
//
// Generalized 2026-09-03 from a Due-only store, so a teacher can also set
// "Opens" from the same home-page cards, not only from the /teacher due-dates
// panel. EVERY function that existed before this still has its EXACT old
// name and signature and still means "due" — nothing that already depended
// on this file changed behavior. What's new is a parallel set of `open*`
// functions with the same shapes, backed by a second cache (`open`) fetched
// alongside the due one so there is still only one /api/me and one
// /api/classes round trip per page, not two.

import { useEffect, useState } from 'react';
import {
  buildDueIndex,
  buildOpenIndex,
  moduleDueSummary,
  resolveDueAt,
  type DueDateRow,
  type DueIndex,
  type DueScope,
  type ModuleDueSummary,
  type OpenDateRow,
} from './due-dates-core';

type Kind = 'due' | 'open';
const ENDPOINT: Record<Kind, string> = { due: 'due-dates', open: 'open-dates' };

const ACTIVE_CLASS_KEY = 'shcode.dueDates.activeClass';

export interface DueClassOption {
  id: string;
  name: string;
}

interface KindState {
  index: DueIndex;
  /** Rows keyed "scope:scopeId" -> epoch ms, for "does this level own a row?" */
  own: Map<string, number>;
}

export interface TeacherDueSnapshot {
  loaded: boolean;
  /** Role allows editing AND at least one class is manageable. */
  canEdit: boolean;
  classes: DueClassOption[];
  activeClassId: string | null;
  /** @internal — read through ownDate/resolveForClass/etc, not directly. */
  due: KindState;
  /** @internal — read through ownOpenDate/resolveOpenForClass/etc, not directly. */
  open: KindState;
  saving: boolean;
  error: string | null;
}

const emptyIndex = (): DueIndex => ({ lesson: new Map(), module: new Map(), unit: new Map() });
const emptyKindState = (): KindState => ({ index: emptyIndex(), own: new Map() });

const empty: TeacherDueSnapshot = {
  loaded: false,
  canEdit: false,
  classes: [],
  activeClassId: null,
  due: emptyKindState(),
  open: emptyKindState(),
  saving: false,
  error: null,
};

let cache: TeacherDueSnapshot = empty;
let inflight: Promise<void> | null = null;
const subs = new Set<(s: TeacherDueSnapshot) => void>();

function set(patch: Partial<TeacherDueSnapshot>) {
  cache = { ...cache, ...patch };
  subs.forEach((f) => f(cache));
}

function readStoredClass(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CLASS_KEY);
  } catch {
    return null; // private mode / storage disabled — just don't remember.
  }
}

function writeStoredClass(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_CLASS_KEY, id);
    else window.localStorage.removeItem(ACTIVE_CLASS_KEY);
  } catch {
    /* not worth surfacing */
  }
}

async function fetchKind(classId: string, kind: Kind): Promise<KindState> {
  const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${ENDPOINT[kind]} GET ${res.status}`);
  const own = new Map<string, number>();
  if (kind === 'due') {
    const data = (await res.json()) as { dueDates?: { scope: DueScope; scopeId: string; dueAt: number }[] };
    const rows = data.dueDates ?? [];
    for (const r of rows) own.set(`${r.scope}:${r.scopeId}`, r.dueAt);
    return { index: buildDueIndex(rows as DueDateRow[]), own };
  }
  const data = (await res.json()) as { openDates?: { scope: DueScope; scopeId: string; openAt: number }[] };
  const rows = data.openDates ?? [];
  for (const r of rows) own.set(`${r.scope}:${r.scopeId}`, r.openAt);
  return { index: buildOpenIndex(rows as OpenDateRow[]), own };
}

async function fetchBoth(classId: string): Promise<{ due: KindState; open: KindState }> {
  const [due, open] = await Promise.all([fetchKind(classId, 'due'), fetchKind(classId, 'open')]);
  return { due, open };
}

async function load(): Promise<void> {
  // Not a teacher -> loaded, canEdit false, and no further requests. Every
  // chip then renders read-only and this costs exactly one /api/me.
  let role: string | null = null;
  try {
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (meRes.ok) role = ((await meRes.json()) as { role?: string }).role ?? null;
  } catch {
    /* fall through to read-only */
  }
  if (role !== 'teacher' && role !== 'admin') {
    set({ loaded: true, canEdit: false });
    return;
  }

  let classes: DueClassOption[] = [];
  try {
    const res = await fetch('/api/classes', { credentials: 'include' });
    if (res.ok) {
      const data = (await res.json()) as {
        classes?: { id: string; name: string; archived_at: number | null }[];
      };
      classes = (data.classes ?? [])
        .filter((c) => c.archived_at === null)
        .map((c) => ({ id: c.id, name: c.name }));
    }
  } catch {
    /* fall through */
  }

  if (classes.length === 0) {
    set({ loaded: true, canEdit: false, classes: [] });
    return;
  }

  const stored = readStoredClass();
  const activeClassId = classes.some((c) => c.id === stored) ? stored! : classes[0].id;
  writeStoredClass(activeClassId);

  try {
    const { due, open } = await fetchBoth(activeClassId);
    set({ loaded: true, canEdit: true, classes, activeClassId, due, open, error: null });
  } catch {
    set({
      loaded: true,
      canEdit: true,
      classes,
      activeClassId,
      error: 'Could not load dates for this class.',
    });
  }
}

export function ensureTeacherDueLoaded(): void {
  if (cache.loaded || inflight) return;
  inflight = load().finally(() => {
    inflight = null;
  });
}

export function useTeacherDue(): TeacherDueSnapshot {
  const [snap, setSnap] = useState<TeacherDueSnapshot>(cache);
  useEffect(() => {
    const sub = (s: TeacherDueSnapshot) => setSnap(s);
    subs.add(sub);
    if (cache.loaded) sub(cache);
    else ensureTeacherDueLoaded();
    return () => {
      subs.delete(sub);
    };
  }, []);
  return snap;
}

export async function selectClass(classId: string): Promise<void> {
  if (classId === cache.activeClassId) return;
  writeStoredClass(classId);
  set({ activeClassId: classId, due: emptyKindState(), open: emptyKindState(), saving: true, error: null });
  try {
    const { due, open } = await fetchBoth(classId);
    set({ due, open, saving: false });
  } catch {
    set({ saving: false, error: 'Could not load dates for this class.' });
  }
}

async function writeOne(kind: Kind, scope: DueScope, scopeId: string, date: string | null): Promise<boolean> {
  const classId = cache.activeClassId;
  if (!classId) return false;
  set({ saving: true, error: null });
  try {
    const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [{ scope, scopeId, date }] }),
    });
    if (!res.ok) throw new Error(`${ENDPOINT[kind]} PUT ${res.status}`);
    const state = await fetchKind(classId, kind);
    set(kind === 'due' ? { due: state, saving: false } : { open: state, saving: false });
    return true;
  } catch {
    set({ saving: false, error: 'Could not save that date.' });
    return false;
  }
}

async function applyModuleToAll(
  kind: Kind,
  moduleId: string,
  date: string,
  lessonIds: readonly string[],
): Promise<boolean> {
  const classId = cache.activeClassId;
  if (!classId) return false;
  const own = kind === 'due' ? cache.due.own : cache.open.own;
  const entries: { scope: DueScope; scopeId: string; date: string | null }[] = [
    { scope: 'module', scopeId: moduleId, date },
    ...lessonIds
      .filter((id) => own.has(`lesson:${id}`))
      .map((id) => ({ scope: 'lesson' as DueScope, scopeId: id, date: null })),
  ];
  set({ saving: true, error: null });
  try {
    const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`${ENDPOINT[kind]} PUT ${res.status}`);
    const state = await fetchKind(classId, kind);
    set(kind === 'due' ? { due: state, saving: false } : { open: state, saving: false });
    return true;
  } catch {
    set({ saving: false, error: 'Could not save that date.' });
    return false;
  }
}

// ---- Due: unchanged names, unchanged signatures, unchanged behavior -------

/**
 * Write one due date. `date` is a zoneless YYYY-MM-DD straight off an
 * <input type="date">, or null to clear the row and fall back to
 * inheritance.
 *
 * Always re-reads afterwards rather than patching the cache locally: the
 * server converts the calendar date to 23:59:59.999 in the school timezone,
 * so the resulting epoch ms is not ours to guess.
 */
export function setDueDate(scope: DueScope, scopeId: string, date: string | null): Promise<boolean> {
  return writeOne('due', scope, scopeId, date);
}

/**
 * Push a module's due date onto the module row and clear every child
 * override in one batch, so a "Mixed" module snaps back to a single date.
 */
export function applyModuleDateToAll(
  moduleId: string,
  date: string,
  lessonIds: readonly string[],
): Promise<boolean> {
  return applyModuleToAll('due', moduleId, date, lessonIds);
}

export function ownDate(snap: TeacherDueSnapshot, scope: DueScope, scopeId: string): number | null {
  return snap.due.own.get(`${scope}:${scopeId}`) ?? null;
}

export function resolveForClass(
  snap: TeacherDueSnapshot,
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): number | null {
  return resolveDueAt(snap.due.index, { lessonId, moduleId, unitId });
}

export function moduleSummaryForClass(
  snap: TeacherDueSnapshot,
  moduleId: string,
  lessonIds: readonly string[],
  unitId?: string | null,
): ModuleDueSummary {
  return moduleDueSummary(snap.due.index, moduleId, lessonIds, unitId);
}

// ---- Opens: same shapes, "open" instead of "due" ---------------------------
//
// A date with no time here defaults to MIDNIGHT (start of the day), not end
// of day — that is what the open-dates route itself defaults to, and it is
// the more common ask ("available Monday") than a precise hour. A teacher who
// needs an exact time (the way 1.7 opened at 12:30 PM sharp) still has the
// full /teacher due-dates panel, which carries a time input; this chip is the
// quick, common-case path, not a replacement for that panel.

/** Write one "available after" date. Same contract as setDueDate. */
export function setOpenDate(scope: DueScope, scopeId: string, date: string | null): Promise<boolean> {
  return writeOne('open', scope, scopeId, date);
}

/** Same contract as applyModuleDateToAll, for Opens. */
export function applyModuleOpenDateToAll(
  moduleId: string,
  date: string,
  lessonIds: readonly string[],
): Promise<boolean> {
  return applyModuleToAll('open', moduleId, date, lessonIds);
}

export function ownOpenDate(snap: TeacherDueSnapshot, scope: DueScope, scopeId: string): number | null {
  return snap.open.own.get(`${scope}:${scopeId}`) ?? null;
}

export function resolveOpenForClass(
  snap: TeacherDueSnapshot,
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): number | null {
  return resolveDueAt(snap.open.index, { lessonId, moduleId, unitId });
}

export function moduleOpenSummaryForClass(
  snap: TeacherDueSnapshot,
  moduleId: string,
  lessonIds: readonly string[],
  unitId?: string | null,
): ModuleDueSummary {
  return moduleDueSummary(snap.open.index, moduleId, lessonIds, unitId);
}
