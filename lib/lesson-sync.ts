'use client';

// Save-for-another-device workspace sync.
//
// The student's current files for a lesson can be parked on the server (D1,
// table `lesson_sync`), then loaded automatically when the same lesson opens on
// another device. Saving is DELIBERATE: one button in the lesson toolbar,
// pressed only when the student knows they will resume somewhere else. There is
// no background put, no poll and no timer; opening a lesson reads once and
// merges.
//
// The old CrossDeviceSyncBanner asked the student to press Pull. That button is
// retired: the read side is automatic. Only the write side is manual.
//
// The server's `revision` is the optimistic-concurrency token. A save names the
// revision it read; a 409 hands back the newer row, which is merged per file
// (lib/lesson-sync-merge.ts) and retried once. A file this device changed stays
// local; every other file takes the saved copy, including its deletion.
//
// Nothing here calls Workers AI. A save is one D1 write; opening a lesson is one
// D1 read.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLessonStore, flattenFiles } from './store';
import { loadProgress, normalizeContents, normalizeEol } from './version-control';
import { filesEqual, mergeSyncFiles, type FileMap } from './lesson-sync-merge';
import type { Lesson } from './types';

const STORAGE_KEY = 'shCode:sync';

interface SyncRecord {
  base: FileMap;
  revision: number;
}
type SyncMap = Record<string, SyncRecord>;

interface Runtime {
  /** The server row this device last saw (the merge base). */
  base: FileMap;
  /** The revision of that row. */
  revision: number;
  /** A save in flight, so a double-click cannot send two PUTs. */
  saving: Promise<SaveResult> | null;
}
const runtimes = new Map<string, Runtime>();

export interface RemoteWorkspace {
  files: FileMap | null;
  revision: number;
  updatedAt: number | null;
}

export type SaveResult = 'saved' | 'unchanged' | 'error';

type PushResponse =
  | { ok: true; revision: number; updatedAt: number }
  | { ok: false; conflict: RemoteWorkspace }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Per-lesson record: the server row this device last saw.
// ---------------------------------------------------------------------------

function readMap(): SyncMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as SyncMap;
  } catch {
    return {};
  }
}

function readRecord(lessonId: string): SyncRecord | null {
  const rec = readMap()[lessonId];
  if (!rec || typeof rec.revision !== 'number' || !rec.base || typeof rec.base !== 'object') {
    return null;
  }
  return rec;
}

function writeRecord(lessonId: string, rec: SyncRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readMap();
    all[lessonId] = rec;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode: the save still works for this session */
  }
}

export function starterContents(lesson: Lesson): FileMap {
  return Object.fromEntries(
    flattenFiles(lesson.files).map((f) => [f.path, normalizeEol(f.content || '')]),
  );
}

function runtimeFor(lesson: Lesson): Runtime {
  const existing = runtimes.get(lesson.id);
  if (existing) return existing;

  const rec = readRecord(lesson.id);
  let base: FileMap;
  let revision: number;
  if (rec) {
    base = rec.base;
    revision = rec.revision;
  } else {
    // First visit with this feature on this device. The saved draft's last
    // committed snapshot is the best "the server should already have this"
    // baseline: uncommitted edits on this device then win the merge, while
    // untouched files take the server's copy. With no draft at all the
    // workspace opened at the starter, so the server is newer by definition.
    const saved = typeof window !== 'undefined' ? loadProgress(lesson.id) : null;
    const committed =
      saved && saved.lastCommittedFileContents && Object.keys(saved.lastCommittedFileContents).length > 0
        ? normalizeContents(saved.lastCommittedFileContents)
        : null;
    // Old drafts can hold CRLF; the store normalises its copies, so the merge
    // base must be normalised too or every untouched file reads as changed.
    base = committed ?? (saved?.fileContents ? normalizeContents(saved.fileContents) : starterContents(lesson));
    revision = 0;
  }

  const rt: Runtime = { base, revision, saving: null };
  runtimes.set(lesson.id, rt);
  return rt;
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export async function fetchWorkspace(lessonId: string): Promise<RemoteWorkspace | null> {
  try {
    const res = await fetch(`/api/lesson-sync/${encodeURIComponent(lessonId)}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RemoteWorkspace;
    return {
      files: data.files ?? null,
      revision: typeof data.revision === 'number' ? data.revision : 0,
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function pushWorkspace(
  lessonId: string,
  files: FileMap,
  baseRevision: number,
): Promise<PushResponse> {
  try {
    const res = await fetch(`/api/lesson-sync/${encodeURIComponent(lessonId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, baseRevision }),
    });
    if (res.status === 409) {
      const data = (await res.json()) as RemoteWorkspace;
      return {
        ok: false,
        conflict: {
          files: data.files ?? null,
          revision: typeof data.revision === 'number' ? data.revision : 0,
          updatedAt: data.updatedAt ?? null,
        },
      };
    }
    if (!res.ok) return { ok: false, error: String(res.status) };
    const data = (await res.json()) as { revision: number; updatedAt: number };
    return { ok: true, revision: data.revision, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ---------------------------------------------------------------------------
// Apply / save / restore
// ---------------------------------------------------------------------------

function applyWorkspace(files: FileMap): void {
  const state = useLessonStore.getState();
  if (!state.lesson) return;
  // Only the file map changes. History, the commit baseline and the selected
  // file belong to this device.
  useLessonStore.setState({ fileContents: { ...files } });
}

/** Whether the store is currently editing the lesson this caller is about. */
function editing(lessonId: string): boolean {
  return useLessonStore.getState().lesson?.id === lessonId;
}

async function saveWorkspace(lesson: Lesson): Promise<SaveResult> {
  if (!editing(lesson.id)) return 'error';
  const rt = runtimeFor(lesson);
  const files = useLessonStore.getState().fileContents;

  // Pressing Save on an untouched workspace is not an error, and it is not a
  // write. "No changes to save" is the honest answer; "already saved" would
  // claim a cloud copy this device may never have made.
  if (filesEqual(files, rt.base)) return 'unchanged';

  if (rt.saving) return rt.saving;

  const task = (async (): Promise<SaveResult> => {
    const result = await pushWorkspace(lesson.id, files, rt.revision);
    if (result.ok) {
      rt.base = files;
      rt.revision = result.revision;
      writeRecord(lesson.id, { base: files, revision: result.revision });
      return 'saved';
    }
    if (!('conflict' in result)) {
      // Offline / server error. The student can press Save again.
      return 'error';
    }

    // Another device saved first. Keep this device's edits where it made them,
    // take the server's copy everywhere else, record the row we now know
    // about, and send the merged result once more.
    const remote = result.conflict;
    const remoteFiles = remote.files;
    if (remoteFiles === null) return 'error';
    const local = useLessonStore.getState().fileContents;
    const { files: merged } = mergeSyncFiles(local, rt.base, remoteFiles);

    rt.base = remoteFiles;
    rt.revision = remote.revision;
    writeRecord(lesson.id, { base: remoteFiles, revision: remote.revision });
    if (!filesEqual(merged, local)) applyWorkspace(merged);

    if (filesEqual(merged, remoteFiles)) return 'unchanged';

    const retry = await pushWorkspace(lesson.id, merged, remote.revision);
    if (!retry.ok) return 'error';
    rt.base = merged;
    rt.revision = retry.revision;
    writeRecord(lesson.id, { base: merged, revision: retry.revision });
    return 'saved';
  })();

  rt.saving = task;
  try {
    return await task;
  } finally {
    rt.saving = null;
  }
}

/**
 * Make a chosen Cloud version the current copy. Unlike a normal save this does
 * not merge: the student picked the version, so it wins over the live row (the
 * version it replaces stays in Cloud history). Used by History's Cloud tab.
 */
export async function restoreVersionToCloud(lessonId: string, files: FileMap): Promise<SaveResult> {
  const lesson = useLessonStore.getState().lesson;
  if (!lesson || lesson.id !== lessonId) return 'error';
  const rt = runtimeFor(lesson);

  // A normal Save is in flight; let it settle before taking over.
  if (rt.saving) {
    try { await rt.saving; } catch { /* the restore still decides the result */ }
  }

  // This is already the copy this device has; the local restore is enough.
  if (filesEqual(files, rt.base)) return 'saved';

  let base = rt.revision;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await pushWorkspace(lessonId, files, base);
    if (result.ok) {
      rt.base = files;
      rt.revision = result.revision;
      writeRecord(lessonId, { base: files, revision: result.revision });
      return 'saved';
    }
    if (!('conflict' in result) || result.conflict.files === null) return 'error';
    // Another device saved between our read and this write. The chosen
    // version still wins; name the revision it just handed us and retry.
    base = result.conflict.revision;
  }
  return 'error';
}

/**
 * Read the lesson's saved workspace and merge it under anything this device has
 * changed. Silent by design: this is the retired Pull button, done on arrival.
 * Never writes.
 */
async function restoreWorkspace(lesson: Lesson): Promise<void> {
  if (!editing(lesson.id)) return;
  const rt = runtimeFor(lesson);
  const remote = await fetchWorkspace(lesson.id);
  if (!remote || remote.files === null) return;
  // Nothing newer than the row this device already saw.
  if (remote.revision <= rt.revision) return;

  const local = useLessonStore.getState().fileContents;
  const { files: merged } = mergeSyncFiles(local, rt.base, remote.files);

  // The base becomes the row just read, not the merged result: if this device
  // keeps a local edit, the next Save still names the revision it knows.
  rt.base = remote.files;
  rt.revision = remote.revision;
  writeRecord(lesson.id, { base: remote.files, revision: remote.revision });

  if (!filesEqual(merged, local)) applyWorkspace(merged);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface CloudWorkspace {
  /** Save the current files for this device's student. */
  save: () => Promise<void>;
  saving: boolean;
  /** A short, plain-words result shown beside the button and cleared on a timer. */
  note: { kind: 'saved' | 'unchanged' | 'error'; text: string } | null;
}

/**
 * Mount once per lesson workspace. Restores on arrival (once per lesson, not
 * after Reset) and hands the toolbar a deliberate Save action. `enabled` is
 * false while the student is unauthenticated or an admin is previewing the
 * reference solution; in both cases saving must not touch the student's row.
 */
export function useCloudWorkspace(lesson: Lesson, enabled: boolean): CloudWorkspace {
  const lessonId = lesson.id;
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;
  const storeLessonId = useLessonStore((s) => s.lesson?.id);
  const restoredFor = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<CloudWorkspace['note']>(null);

  // Arrival: adopt a saved workspace from another device. Once per lesson
  // mount, so pressing Reset does not immediately pull the old save back over
  // the starter.
  useEffect(() => {
    if (!enabled || storeLessonId !== lessonId) return;
    runtimeFor(lessonRef.current);
    if (restoredFor.current === lessonId) return;
    restoredFor.current = lessonId;
    void restoreWorkspace(lessonRef.current);
  }, [enabled, lessonId, storeLessonId]);

  const save = useCallback(async () => {
    if (!enabled) return;
    if (saving) return;
    setSaving(true);
    setNote(null);
    const result = await saveWorkspace(lessonRef.current);
    setSaving(false);
    if (result === 'saved') {
      setNote({ kind: 'saved', text: 'Saved — open this lesson on any device.' });
    } else if (result === 'unchanged') {
      setNote({ kind: 'unchanged', text: 'No changes to save.' });
    } else {
      setNote({ kind: 'error', text: 'Could not save. Check your connection and try again.' });
    }
  }, [enabled, saving]);

  const clearNote = useCallback(() => setNote(null), []);

  // The result line is feedback, not a permanent status. Errors stay a little
  // longer because the student has to act on them.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(clearNote, note.kind === 'error' ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [note, clearNote]);

  return { save, saving, note };
}
