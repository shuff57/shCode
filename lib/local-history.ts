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

export interface LocalSnapshot {
  id: string;
  timestamp: number;
  message: string;
  files: FileMap;
}

const STORAGE_KEY = 'shCode:local-history';
const PER_LESSON = 20;
const LESSONS = 40;

function readAll(): Record<string, LocalSnapshot[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Quota is the only realistic failure. Keep the newest five per lesson and
    // make one more attempt; in private mode this still throws and the history
    // simply stays in memory for the session.
    const trimmed: Record<string, LocalSnapshot[]> = {};
    for (const [lessonId, list] of Object.entries(all)) trimmed[lessonId] = list.slice(0, 5);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
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

export function clearLocalHistory(lessonId: string): void {
  const all = readAll();
  delete all[lessonId];
  writeAll(all);
}
