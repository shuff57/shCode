'use client';

// Local machine history.
//
// Versions kept in THIS browser's localStorage. They do not leave the device:
// clearing site data, a different browser, or a different machine sees none of
// them. That is the point — it is the "This device" tab, beside the Cloud tab
// that reads the saves in D1.
//
// A snapshot is taken when the student presses Save (whether or not the cloud
// copy succeeds), when they Submit, and when they adopt a teacher's edit. The
// 2-second draft autosave is not a snapshot; only a deliberate event is.
//
// Full file maps are stored, capped at 20 per lesson and 40 lessons overall,
// oldest lesson dropped first. If localStorage is full, every lesson is
// trimmed to its newest five versions and the write is tried once more.

import { filesEqual, type FileMap } from './lesson-sync-merge';
import { ownedLocal } from './owned-storage';

export interface LocalSnapshot {
  id: string;
  timestamp: number;
  message: string;
  files: FileMap;
}

// `w1:<owner>:local-history` (lib/owned-storage.ts): this account's versions on this browser.
const STORAGE_KEY = 'local-history';
const PER_LESSON = 20;
const LESSONS = 40;

function readAll(): Record<string, LocalSnapshot[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = ownedLocal.getJSON<Record<string, unknown>>(STORAGE_KEY) ?? {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, LocalSnapshot[]> = {};
    for (const [lessonId, list] of Object.entries(raw)) {
      if (Array.isArray(list)) out[lessonId] = list as LocalSnapshot[];
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, LocalSnapshot[]>): void {
  if (typeof window === 'undefined') return;
  if (ownedLocal.setJSON(STORAGE_KEY, all) === 'full') {
    // Quota is the only realistic failure. Keep the newest five per lesson and
    // make one more attempt; if that fails too the stored history stays as it
    // was and the new version lives in memory for the session.
    const trimmed: Record<string, LocalSnapshot[]> = {};
    for (const [lessonId, list] of Object.entries(all)) trimmed[lessonId] = list.slice(0, 5);
    ownedLocal.setJSON(STORAGE_KEY, trimmed);
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function listLocalHistory(lessonId: string): LocalSnapshot[] {
  return readAll()[lessonId] ?? [];
}

/**
 * Record the workspace as a version on this device. A press with no edits since
 * the newest snapshot is not a new version, so it returns null and stores
 * nothing.
 */
/** The label of the copy Code together keeps when a session ends (History shows it as written together). */
export const TOGETHER_COPY = 'Kept from Code together';

export function addLocalSnapshot(
  lessonId: string,
  files: FileMap,
  message: string,
): LocalSnapshot | null {
  const all = readAll();
  const list = all[lessonId] ?? [];
  if (list.length > 0 && filesEqual(list[0].files, files)) return null;

  const snapshot: LocalSnapshot = {
    id: newId(),
    timestamp: Date.now(),
    message,
    files: { ...files },
  };
  all[lessonId] = [snapshot, ...list].slice(0, PER_LESSON);

  // Bound the number of lessons kept, oldest newest-snapshot first.
  const lessonIds = Object.keys(all);
  if (lessonIds.length > LESSONS) {
    lessonIds
      .sort((a, b) => (all[a][0]?.timestamp ?? 0) - (all[b][0]?.timestamp ?? 0))
      .slice(0, lessonIds.length - LESSONS)
      .forEach((id) => delete all[id]);
  }

  writeAll(all);
  return snapshot;
}

/**
 * Make sure `files` is in this lesson's History on this device, and SAY whether it is:
 * true only when the newest stored version, read back from storage, holds exactly these
 * files (already there, or written now). Anything that promises "your work is kept in
 * History" before replacing it must check this first and change nothing on false.
 */
export function keepInHistory(lessonId: string, files: FileMap, message: string): boolean {
  return keepSnapshot(lessonId, files, message) !== null;
}

/**
 * keepInHistory, answering WHICH version holds the files: the id of the newest stored
 * version once it reads back with exactly these files, or null when it does not.
 */
export function keepSnapshot(lessonId: string, files: FileMap, message: string): string | null {
  if (typeof window === 'undefined') return null;
  addLocalSnapshot(lessonId, files, message);
  const newest = readAll()[lessonId]?.[0];
  return newest && filesEqual(newest.files, files) ? newest.id : null;
}

/**
 * Said when an action that replaces the student's code (Reset, another starter, bringing work
 * forward) could not put the current code in History first, and so changed nothing.
 */
export const NOT_KEPT_TEXT = 'This computer could not keep your current work in History, so nothing was changed.';

export function clearLocalHistory(lessonId: string): void {
  const all = readAll();
  delete all[lessonId];
  writeAll(all);
}
