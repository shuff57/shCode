'use client';

// Teacher-side due-date store: the rows for ONE chosen class, plus a writer.
//
// This is deliberately separate from lib/due-dates.ts. That store answers
// "when is this due for me?" and reads /api/my-due-dates, which is scoped by
// enrollment — a teacher is not enrolled in their own class, so it returns
// nothing for them. This one answers "when have I set this for Period 3?" and
// reads the class's own rows, which is the thing an editor has to edit.
//
// Same singleton + pub/sub shape as lib/progress.ts so every chip on the page
// shares one fetch and one re-render.

import { useEffect, useState } from 'react';
import {
  buildDueIndex,
  moduleDueSummary,
  resolveDueAt,
  type DueDateRow,
  type DueIndex,
  type DueScope,
  type ModuleDueSummary,
} from './due-dates-core';

const ACTIVE_CLASS_KEY = 'shcode.dueDates.activeClass';

export interface DueClassOption {
  id: string;
  name: string;
}

export interface TeacherDueSnapshot {
  loaded: boolean;
  /** Role allows editing AND at least one class is manageable. */
  canEdit: boolean;
  classes: DueClassOption[];
  activeClassId: string | null;
  index: DueIndex;
  /** Rows keyed "scope:scopeId" -> epoch ms, for "does this level own a row?" */
  own: Map<string, number>;
  saving: boolean;
  error: string | null;
}

const emptyIndex = (): DueIndex => ({ lesson: new Map(), module: new Map(), unit: new Map() });

const empty: TeacherDueSnapshot = {
  loaded: false,
  canEdit: false,
  classes: [],
  activeClassId: null,
  index: emptyIndex(),
  own: new Map(),
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

interface ApiDueRow {
  scope: DueScope;
  scopeId: string;
  dueAt: number;
}

async function fetchRows(classId: string): Promise<ApiDueRow[]> {
  const res = await fetch(`/api/classes/${classId}/due-dates`, { credentials: 'include' });
  if (!res.ok) throw new Error(`due-dates GET ${res.status}`);
  const data = (await res.json()) as { dueDates?: ApiDueRow[] };
  return data.dueDates ?? [];
}

function indexRows(rows: ApiDueRow[]): { index: DueIndex; own: Map<string, number> } {
  const own = new Map<string, number>();
  for (const r of rows) own.set(`${r.scope}:${r.scopeId}`, r.dueAt);
  return { index: buildDueIndex(rows as DueDateRow[]), own };
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
    const { index, own } = indexRows(await fetchRows(activeClassId));
    set({ loaded: true, canEdit: true, classes, activeClassId, index, own, error: null });
  } catch {
    set({
      loaded: true,
      canEdit: true,
      classes,
      activeClassId,
      error: 'Could not load due dates for this class.',
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
  set({ activeClassId: classId, index: emptyIndex(), own: new Map(), saving: true, error: null });
  try {
    const { index, own } = indexRows(await fetchRows(classId));
    set({ index, own, saving: false });
  } catch {
    set({ saving: false, error: 'Could not load due dates for this class.' });
  }
}

/**
 * Write one due date. `date` is a zoneless YYYY-MM-DD straight off an
 * <input type="date">, or null to clear the row and fall back to inheritance.
 *
 * Always re-reads afterwards rather than patching the cache locally: the
 * server converts the calendar date to 23:59:59.999 in the school timezone,
 * so the resulting epoch ms is not ours to guess.
 */
export async function setDueDate(
  scope: DueScope,
  scopeId: string,
  date: string | null,
): Promise<boolean> {
  const classId = cache.activeClassId;
  if (!classId) return false;
  set({ saving: true, error: null });
  try {
    const res = await fetch(`/api/classes/${classId}/due-dates`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [{ scope, scopeId, date }] }),
    });
    if (!res.ok) throw new Error(`due-dates PUT ${res.status}`);
    const { index, own } = indexRows(await fetchRows(classId));
    set({ index, own, saving: false });
    return true;
  } catch {
    set({ saving: false, error: 'Could not save that date.' });
    return false;
  }
}

/**
 * Push a module's date onto the module row and clear every child override in
 * one batch, so a "Mixed" module snaps back to a single date.
 */
export async function applyModuleDateToAll(
  moduleId: string,
  date: string,
  lessonIds: readonly string[],
): Promise<boolean> {
  const classId = cache.activeClassId;
  if (!classId) return false;
  const entries: { scope: DueScope; scopeId: string; date: string | null }[] = [
    { scope: 'module', scopeId: moduleId, date },
    ...lessonIds
      .filter((id) => cache.own.has(`lesson:${id}`))
      .map((id) => ({ scope: 'lesson' as DueScope, scopeId: id, date: null })),
  ];
  set({ saving: true, error: null });
  try {
    const res = await fetch(`/api/classes/${classId}/due-dates`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) throw new Error(`due-dates PUT ${res.status}`);
    const { index, own } = indexRows(await fetchRows(classId));
    set({ index, own, saving: false });
    return true;
  } catch {
    set({ saving: false, error: 'Could not save that date.' });
    return false;
  }
}

// ---- read helpers over the active class -----------------------------------

export function ownDate(snap: TeacherDueSnapshot, scope: DueScope, scopeId: string): number | null {
  return snap.own.get(`${scope}:${scopeId}`) ?? null;
}

export function resolveForClass(
  snap: TeacherDueSnapshot,
  lessonId: string,
  moduleId?: string | null,
  unitId?: string | null,
): number | null {
  return resolveDueAt(snap.index, { lessonId, moduleId, unitId });
}

export function moduleSummaryForClass(
  snap: TeacherDueSnapshot,
  moduleId: string,
  lessonIds: readonly string[],
  unitId?: string | null,
): ModuleDueSummary {
  return moduleDueSummary(snap.index, moduleId, lessonIds, unitId);
}
