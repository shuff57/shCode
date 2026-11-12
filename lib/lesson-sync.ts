'use client';

// Save-for-another-device workspace sync.
//
// The student's current files for a lesson can be parked on the server (D1,
// table `lesson_sync`), then loaded automatically when the same lesson opens on
// another device. The Save button is DELIBERATE: pressed when the student wants a
// Cloud history version. Since stage 2 the draft ALSO uploads by itself (below and
// lib/outbox.ts), without a history row. There is no poll; opening a lesson reads
// once and merges.
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
//
// Stage 2 of per-account storage adds an UPLOAD BY ITSELF beside the Save button
// (lib/outbox.ts): a changed draft is queued, and the outbox sends it through the same
// PUT with the revision this computer last saw plus `auto: true`, which makes the server
// skip the Cloud history row (an ordinary Save is unchanged, byte for byte). When the
// server has a newer copy, the per-file merge runs ONLY when no file changed on both
// sides; if one did, the upload pauses, the other version goes into History, and the
// lesson asks "Keep mine / Open the other one". Arrival applies the same rule.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLessonStore, flattenFiles, saveOpenDraft } from './store';
import { hasPendingSaves } from './draft-autosave';
import { loadProgress, normalizeContents, normalizeEol, saveProgress, PROGRESS_KEY } from './version-control';
import { filesEqual, mergeSyncFiles, type FileMap } from './lesson-sync-merge';
import type { Lesson } from './types';
import { ownedLocal, pageIsAccount } from './owned-storage';
import { keepInHistory, keepSnapshot, listLocalHistory } from './local-history';
import {
  choose, enqueue, noteUploaded, pauseForConflict, readEntry, whenText,
  type OtherVersion, type OutboxEntry, type SendResult, type Sender,
} from './outbox';

// `w1:<owner>:sync:<lessonId>` (lib/owned-storage.ts): the server row this device last saw.
const SYNC_KEY = 'sync:';

export interface SyncRecord {
  base: FileMap;
  revision: number;
  /**
   * The files of the last DELIBERATE Save, kept only after an upload by itself moved `base` on:
   * absent = the same as `base` (every record written before stage 2, and after any Save);
   * null = nothing was saved deliberately. A Save whose files differ from it is still sent as an
   * ordinary Save, so it gets its Cloud history row even when the account already has the files.
   */
  saved?: FileMap | null;
}

interface Runtime {
  /** The server row this device last saw (the merge base). */
  base: FileMap;
  /** The revision of that row. */
  revision: number;
  /** A save in flight, so a double-click cannot send two PUTs. */
  saving: Promise<SaveResult> | null;
  /** An upload by itself in flight (lib/outbox.ts); a Save waits for it. */
  auto: Promise<unknown> | null;
}
const runtimes = new Map<string, Runtime>();

export interface RemoteWorkspace {
  files: FileMap | null;
  revision: number;
  updatedAt: number | null;
  /**
   * This revision has a Cloud history row: it was a Save, not an upload by itself.
   * Absent from an older server, and then read as before stage 2 (every row was a Save).
   */
  versioned?: boolean;
}

/** 'owner': refused because someone else is signed in on this computer now (409 owner-mismatch). */
export type SaveResult = 'saved' | 'unchanged' | 'error' | 'owner';

type PushResponse =
  | { ok: true; revision: number; updatedAt: number }
  | { ok: false; owner: true }
  | { ok: false; conflict: RemoteWorkspace }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Per-lesson record: the server row this device last saw.
// ---------------------------------------------------------------------------

export function readRecord(lessonId: string): SyncRecord | null {
  if (typeof window === 'undefined') return null;
  const rec = ownedLocal.getJSON<SyncRecord>(SYNC_KEY + lessonId);
  if (!rec || typeof rec.revision !== 'number' || !rec.base || typeof rec.base !== 'object') {
    return null;
  }
  return rec;
}

export function writeRecord(lessonId: string, rec: SyncRecord): void {
  if (typeof window === 'undefined') return;
  // A full store keeps the old record; the save itself still worked for this session.
  ownedLocal.setJSON(SYNC_KEY + lessonId, rec);
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

  const rt: Runtime = { base, revision, saving: null, auto: null };
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
      ...(typeof data.versioned === 'boolean' ? { versioned: data.versioned } : {}),
    };
  } catch {
    return null;
  }
}

export interface PushOptions {
  /** An upload by itself: the server keeps no Cloud history row for it. */
  auto?: boolean;
  /** Sent while the tab closes (fetch keepalive). */
  keepalive?: boolean;
}

export async function pushWorkspace(
  lessonId: string,
  files: FileMap,
  baseRevision: number,
  opts: PushOptions = {},
): Promise<PushResponse> {
  try {
    // An ordinary Save sends exactly what it always sent; only an upload by itself adds `auto`.
    const body = opts.auto ? { files, baseRevision, auto: true } : { files, baseRevision };
    const res = await fetch(`/api/lesson-sync/${encodeURIComponent(lessonId)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(opts.keepalive ? { keepalive: true } : {}),
    });
    if (res.status === 409 && res.headers.get('X-Owner-Mismatch') === '1') {
      // Someone else is signed in on this computer now. Nothing was written; no retry.
      return { ok: false, owner: true };
    }
    if (res.status === 409) {
      const data = (await res.json()) as RemoteWorkspace;
      return {
        ok: false,
        conflict: {
          files: data.files ?? null,
          revision: typeof data.revision === 'number' ? data.revision : 0,
          updatedAt: data.updatedAt ?? null,
          ...(typeof data.versioned === 'boolean' ? { versioned: data.versioned } : {}),
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

export async function saveWorkspace(lesson: Lesson): Promise<SaveResult> {
  const lessonId = lesson.id;
  if (!editing(lessonId)) return 'error';
  const rt = runtimeFor(lesson);
  // An upload by itself is on its way: let it land, so the two do not race for one revision.
  if (rt.auto) { try { await rt.auto; } catch { /* the Save still decides */ } }
  // The student may have opened another lesson while waiting: never send its files under this one.
  if (!editing(lessonId)) return 'error';
  // `rt` is the account row THIS TAB'S EDITOR is based on. It is never moved on to a row
  // another tab recorded: naming a newer revision while sending an older editor overwrote the
  // newer work. A tab that is behind finds out from the server's 409 below, which merges.
  const files = useLessonStore.getState().fileContents;

  // Pressing Save on an untouched workspace is not an error, and it is not a
  // write. "No changes to save" is the honest answer; "already saved" would
  // claim a cloud copy this device may never have made.
  // Except after an upload by itself: the account has these files but no Cloud history
  // version of them, and a Save is that version, so it is sent as an ordinary Save.
  if (filesEqual(files, rt.base)) {
    // Only the stored record of this very row can say "uploaded but never Saved". When another
    // tab has moved the record on, this tab simply has nothing of its own to save.
    const rec = readRecord(lessonId);
    if (!rec || rec.revision !== rt.revision) return 'unchanged';
    if (rec.saved === undefined || (rec.saved !== null && filesEqual(rec.saved, files))) return 'unchanged';
  }

  if (rt.saving) return rt.saving;

  const task = (async (): Promise<SaveResult> => {
    const result = await pushWorkspace(lessonId, files, rt.revision);
    if (result.ok) {
      rt.base = files;
      rt.revision = result.revision;
      writeRecord(lesson.id, { base: files, revision: result.revision });
      return 'saved';
    }
    if ('owner' in result) return 'owner';
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
    // The editor now shows another lesson: there is nothing of this one to merge into.
    if (!editing(lessonId)) return 'error';
    const local = useLessonStore.getState().fileContents;
    // This Save is about to put this tab's text over a file the account's copy also changed.
    // That copy may have got there by an upload by itself (another tab, another computer) and
    // then has no Cloud history version, so it goes into History here first, read back; if
    // that cannot be done nothing is sent.
    if (changedOnBoth(normalizeContents(local), rt.base, remoteFiles).length > 0) {
      let kept = false;
      try { kept = keepInHistory(lessonId, remoteFiles, `From another computer or tab, ${whenText(remote.updatedAt ?? Date.now())}`); } catch { kept = false; }
      if (!kept) return 'error';
    }
    const { files: merged } = mergeSyncFiles(local, rt.base, remoteFiles);

    // What this computer knows was last Saved deliberately. Its own record of exactly this row
    // says so; otherwise the row may be an upload by itself whose answer never came back, so
    // the last Save this computer knows of is kept and the next Save still makes a version.
    const rec = readRecord(lessonId);
    // The server says outright when it can (`versioned`).
    const lastSaved: FileMap | null | undefined = remote.versioned === true ? undefined
      : remote.versioned === false ? null
      : rec && rec.revision === remote.revision ? rec.saved
      : rec ? (rec.saved !== undefined ? rec.saved : rec.base) : null;
    rt.base = remoteFiles;
    rt.revision = remote.revision;
    writeRecord(lesson.id, lastSaved === undefined
      ? { base: remoteFiles, revision: remote.revision }
      : { base: remoteFiles, revision: remote.revision, saved: lastSaved });
    if (!filesEqual(merged, local)) applyWorkspace(merged);

    // The account already has exactly these files. "No changes" only when they are known to be
    // a Saved version; otherwise this Save is sent, so it gets its Cloud history row.
    if (filesEqual(merged, remoteFiles)
      && (lastSaved === undefined || (lastSaved !== null && filesEqual(lastSaved, merged)))) return 'unchanged';

    const retry = await pushWorkspace(lesson.id, merged, remote.revision);
    if (!retry.ok) return 'owner' in retry ? 'owner' : 'error';
    rt.base = merged;
    rt.revision = retry.revision;
    writeRecord(lesson.id, { base: merged, revision: retry.revision });
    return 'saved';
  })();

  rt.saving = task;
  try {
    const result = await task;
    if (result === 'saved') savedOutsideOutbox(lesson.id);
    return result;
  } finally {
    rt.saving = null;
  }
}

/** A Save reached the account: the chip says so, and a waiting upload (or a pause) is settled. */
function savedOutsideOutbox(lessonId: string): void {
  noteUploaded('lab', lessonId);
  // The Save merged this computer's version over the other one, as Save always has: there
  // is nothing left to choose, and the next send finds the record uploaded and clears it.
  if (readEntry('lab', lessonId)) choose('lab', lessonId, 'resolved');
}

/**
 * Make a chosen Cloud version the current copy. Unlike a normal save this does
 * not merge: the student picked the version, so it wins over the live row (the
 * version it replaces stays in Cloud history). Used by History's Cloud tab.
 *
 * Since stage 2 the live row may be an upload by itself, which has NO Cloud history row. Such
 * a row is put in History on this computer first (read back); if that cannot be done the
 * restore is refused and nothing is replaced.
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

  const keepLive = (row: RemoteWorkspace): boolean => keepLiveRow(lessonId, row, files);
  const live = await fetchWorkspace(lessonId);
  if (!live) return 'error';
  if (!keepLive(live)) return 'error';

  let base = live.revision;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await pushWorkspace(lessonId, files, base);
    if (result.ok) {
      rt.base = files;
      rt.revision = result.revision;
      writeRecord(lessonId, { base: files, revision: result.revision });
      savedOutsideOutbox(lessonId);
      return 'saved';
    }
    if ('owner' in result) return 'owner';
    if (!('conflict' in result) || result.conflict.files === null) return 'error';
    // Another device saved between our read and this write. The chosen
    // version still wins; name the revision it just handed us and retry.
    if (!keepLive(result.conflict)) return 'error';
    base = result.conflict.revision;
  }
  return 'error';
}

/**
 * The account's live row is about to be replaced by `files`. Unless the server SAID it is a
 * Saved version (`versioned === true`; unknown counts as not), it goes into History first,
 * read back. False = it could not be kept, and the caller must replace nothing.
 */
function keepLiveRow(lessonId: string, row: RemoteWorkspace, files: FileMap): boolean {
  if (row.files === null || row.versioned === true || filesEqual(row.files, files)) return true;
  return keepOnce(lessonId, row.files, `Replaced by a restored version, ${whenText(row.updatedAt ?? Date.now())}`);
}

/** keepInHistory, without a second copy when History (read from storage) already holds these files. */
function keepOnce(lessonId: string, files: FileMap, label: string): boolean {
  try {
    // Only among the newest few: History keeps 20 per lesson, and an older copy could be pushed
    // out by the very next thing kept.
    if (listLocalHistory(lessonId).slice(0, 5).some((x) => filesEqual(x.files, files))) return true;
    return keepInHistory(lessonId, files, label);
  } catch { return false; }
}

export type BeforeRestoreResult = 'ok' | 'history' | 'not-open';

/**
 * History is about to replace the editor with a chosen version (components/HistoryPanel.tsx).
 * Since stage 2 whatever the editor then holds uploads by itself, so everything that restore
 * would replace is put in History FIRST, each read back: what the editor shows now, what this
 * computer last uploaded by itself (when that is not a Saved version), and, for a Cloud
 * restore, the account's live row unless the server says it is a Saved version. 'history' =
 * one of them could not be kept: the caller restores nothing.
 */
export async function keepBeforeRestore(lessonId: string, files: FileMap, toCloud: boolean): Promise<BeforeRestoreResult> {
  if (!editing(lessonId)) return 'not-open';
  const target = normalizeContents(files);
  const keep = (f: FileMap, label: string): boolean => keepOnce(lessonId, f, label);
  const cur = normalizeContents(useLessonStore.getState().fileContents);
  if (!filesEqual(cur, target) && !keep(cur, 'Yours, before you restored a version')) return 'history';
  const rec = readRecord(lessonId);
  if (rec && rec.saved !== undefined && !filesEqual(rec.base, cur) && !filesEqual(rec.base, target)
    && !keep(rec.base, 'Uploaded from this computer, before you restored a version')) return 'history';
  if (toCloud) {
    const live = await fetchWorkspace(lessonId);
    if (live && !filesEqual(live.files ?? {}, cur) && !keepLiveRow(lessonId, live, target)) return 'history';
    if (!editing(lessonId)) return 'not-open';
    // The student may have typed while the account was read (History closed meanwhile): what the
    // editor holds NOW is kept too. Nothing is awaited after this, and the caller replaces the
    // editor at once.
    const now = normalizeContents(useLessonStore.getState().fileContents);
    if (!filesEqual(now, cur) && !filesEqual(now, target) && !keep(now, 'Yours, before you restored a version')) return 'history';
  }
  return 'ok';
}

/**
 * Read the lesson's saved workspace and merge it under anything this device has
 * changed. Silent by design: this is the retired Pull button, done on arrival.
 * Never writes.
 */
export async function restoreWorkspace(lesson: Lesson): Promise<void> {
  if (!editing(lesson.id)) return;
  const rt = runtimeFor(lesson);
  const remote = await fetchWorkspace(lesson.id);
  if (!remote || remote.files === null) return;
  // The student moved to another lesson while this was read: it is not this editor's any more.
  if (!editing(lesson.id)) return;
  // On arrival the editor has just been loaded from the stored draft. While it still shows
  // exactly that draft, this tab is in step with whatever row this computer last recorded
  // (another tab may have uploaded since this page first made its runtime).
  const stored = readRecord(lesson.id);
  if (stored && stored.revision > rt.revision && showsStoredDraft(lesson.id)) {
    rt.base = stored.base;
    rt.revision = stored.revision;
  }
  // Nothing newer than the row this device already saw.
  if (remote.revision <= rt.revision) return;

  const local = useLessonStore.getState().fileContents;
  // A file changed here AND on the other computer: nothing is merged, applied or recorded.
  // The other version goes into History and the lesson asks which one to keep; until then
  // nothing uploads (lib/outbox.ts). Files changed on one side only merge as before.
  if (changedOnBoth(local, rt.base, remote.files).length > 0 && pageIsAccount()) {
    const e = readEntry('lab', lesson.id);
    if (e?.other?.revision === remote.revision && (e.paused === 'conflict' || e.keep === 'mine')) return;
    pauseForConflict('lab', lesson.id, keepOther(lesson.id, remote.files, remote.revision, remote.updatedAt, remote.versioned));
    return;
  }
  const { files: merged } = mergeSyncFiles(local, rt.base, remote.files);

  // The base becomes the row just read, not the merged result: if this device
  // keeps a local edit, the next Save still names the revision it knows.
  rt.base = remote.files;
  rt.revision = remote.revision;
  // A row that got there by an upload by itself (this computer's, whose answer was lost before a
  // reload, or another computer's) is not a Saved version yet: `saved: null` makes the next
  // Save send it, so it gets its Cloud history row.
  writeRecord(lesson.id, remote.versioned === false
    ? { base: remote.files, revision: remote.revision, saved: null }
    : { base: remote.files, revision: remote.revision });

  if (!filesEqual(merged, local)) applyWorkspace(merged);
}

/** Whether the open editor shows exactly the draft stored for this lesson. */
function showsStoredDraft(lessonId: string): boolean {
  if (!editing(lessonId)) return false;
  const d = loadProgress(lessonId);
  return !!d && filesEqual(normalizeContents(d.fileContents), normalizeContents(useLessonStore.getState().fileContents));
}

// ---------------------------------------------------------------------------
// Upload by itself (lib/outbox.ts sends; this is the lab and sandbox half)
// ---------------------------------------------------------------------------

// Lessons a workspace on this page is showing with uploads allowed (signed in, and not
// showing the reference solution). Counted, so two mounts of one lesson cannot clear it.
const live = new Map<string, number>();
function isLive(lessonId: string): boolean {
  return (live.get(lessonId) ?? 0) > 0;
}
/** Allow uploads by itself for a lesson this page shows (the hook below; tests). Returns the undo. */
export function allowAutoUpload(lessonId: string): () => void {
  return markLive(lessonId);
}
function markLive(lessonId: string): () => void {
  live.set(lessonId, (live.get(lessonId) ?? 0) + 1);
  return () => {
    const n = (live.get(lessonId) ?? 1) - 1;
    if (n <= 0) live.delete(lessonId); else live.set(lessonId, n);
  };
}

/** The server row this computer last saw for a lesson, without needing the lesson itself. */
function syncStateFor(lessonId: string): { base: FileMap; revision: number } {
  // The STORED record first: another tab may have uploaded since this tab's runtime was made,
  // and what is done must be decided from what is stored, never from one tab's memory.
  const rec = readRecord(lessonId);
  if (rec) return { base: rec.base, revision: rec.revision };
  const rt = runtimes.get(lessonId);
  if (rt) return { base: rt.base, revision: rt.revision };
  // Same baseline as runtimeFor(): the last committed snapshot, else the draft itself.
  const saved = loadProgress(lessonId);
  const committed = saved && Object.keys(saved.lastCommittedFileContents ?? {}).length > 0
    ? normalizeContents(saved.lastCommittedFileContents)
    : null;
  return { base: committed ?? (saved ? normalizeContents(saved.fileContents) : {}), revision: 0 };
}

// The stamp of the draft THIS TAB last wrote from its editor (noteDraftSaved). A drain that sent
// exactly that draft sent this tab's own text, so this tab's runtime may follow the upload.
const wroteDraft = new Map<string, number | null>();

// A Code together session in ANY tab of this student holds uploads by itself for that sandbox:
// the shared text is in the stored draft while the session is on, and another tab's drain must
// not send it. Stored (not one tab's memory), ONE KEY PER SESSION TAB (so a tab that leaves
// removes only its own), refreshed while the session lasts, and each runs out by itself, so a
// tab that crashed cannot hold uploads for ever.
const HOLD_KEY = 'upload-hold:';
const HOLD_MS = 3 * 60 * 1000;
const HOLD_BEAT_MS = 60 * 1000;
function heldForSession(lessonId: string): boolean {
  const now = Date.now();
  let held = false;
  for (const k of ownedLocal.keys(HOLD_KEY + lessonId + ':')) {
    const h = ownedLocal.getJSON<{ t: number }>(k);
    if (h && typeof h.t === 'number' && Math.abs(now - h.t) < HOLD_MS) held = true;
    else ownedLocal.removeItem(k); // run out (its tab is gone); a live tab writes it again
  }
  return held;
}
/** Hold uploads by itself for a lesson in every tab (a Code together session). Returns the undo. */
export function holdAutoUpload(lessonId: string): () => void {
  const key = `${HOLD_KEY}${lessonId}:${Math.random().toString(36).slice(2, 12)}`;
  const beat = () => { ownedLocal.setJSON(key, { t: Date.now() }); };
  beat();
  const timer = setInterval(beat, HOLD_BEAT_MS);
  return () => {
    clearInterval(timer);
    ownedLocal.removeItem(key);
  };
}

/**
 * Record the server row this computer now knows. `auto`: it got there by an upload by itself,
 * so the last deliberate Save is remembered separately (SyncRecord.saved).
 * `inStep`: this tab's editor holds these files (or its own newer typing on top of them), so
 * this tab's runtime follows. A tab whose editor is merely open and older keeps its runtime:
 * its next Save then meets the server's 409 and merges, instead of overwriting.
 */
function setSynced(lessonId: string, files: FileMap, revision: number, how: 'auto' | 'other', inStep: boolean): void {
  const rt = runtimes.get(lessonId);
  if (rt && inStep) { rt.base = files; rt.revision = revision; }
  if (how === 'auto') {
    const old = readRecord(lessonId);
    const saved = old ? (old.saved !== undefined ? old.saved : old.base) : null;
    writeRecord(lessonId, { base: files, revision, saved });
  } else {
    writeRecord(lessonId, { base: files, revision });
  }
}

/** Files this computer changed AND the other one changed, to different text. */
export function changedOnBoth(local: FileMap, base: FileMap, remote: FileMap): string[] {
  const out: string[] = [];
  for (const p of new Set([...Object.keys(local), ...Object.keys(base), ...Object.keys(remote)])) {
    if (local[p] !== base[p] && remote[p] !== base[p] && local[p] !== remote[p]) out.push(p);
  }
  return out;
}

/** Put the other computer's version in History, and describe it for the paused entry. */
function keepOther(lessonId: string, files: FileMap, revision: number, updatedAt: number | null, versioned?: boolean): OtherVersion {
  const label = `From another computer, ${whenText(updatedAt ?? Date.now())}`;
  let snap: string | null = null;
  try { snap = keepSnapshot(lessonId, files, label); } catch { snap = null; }
  return { revision, updatedAt, snap, label, ...(typeof versioned === 'boolean' ? { versioned } : {}) };
}

/**
 * After a clean merge brought in the other computer's files: put them in the STORED draft.
 * Only files not changed since the send began take the merged text. Returns the draft's new
 * stamp when it is exactly the merged result, null when it changed meanwhile (the entry stays
 * and the next send carries the change), or undefined when nothing had to change.
 *
 * The open editor is updated only when it is in step: it shows exactly what was sent (then it
 * shows the merged files, which is what is now stored), or this tab has an unsaved edit that
 * its own pending save will write (then the other computer's files are merged under it). A tab
 * whose editor is merely open and older is left alone, so it cannot write that over the draft.
 */
function applyMerged(
  lessonId: string, sent: FileMap, merged: FileMap, t0: number | null, inStep: boolean,
): { wroteT: number | null | undefined; inStep: boolean } {
  if (filesEqual(merged, sent)) return { wroteT: undefined, inStep };
  const key = PROGRESS_KEY + lessonId;
  let wrote: number | null = null;
  const d = loadProgress(lessonId);
  if (d) {
    // By CONTENT as well as by stamp: only a stored draft that is exactly what was sent is
    // replaced whole; anything typed since is merged under, never replaced.
    const untouched = ownedLocal.stamp(key) === t0 && filesEqual(normalizeContents(d.fileContents), sent);
    const next = untouched ? merged : mergeSyncFiles(normalizeContents(d.fileContents), sent, merged).files;
    if (saveProgress(lessonId, { ...d, fileContents: next }) === 'ok' && untouched) wrote = ownedLocal.stamp(key);
  }
  // Whether the editor now holds the other computer's files too. Only then may this tab's
  // runtime name the merged row: a tab that lacks them would Save its old copies over them.
  let editorHasThem = false;
  if (editing(lessonId)) {
    const cur = normalizeContents(useLessonStore.getState().fileContents);
    if (wrote !== null && filesEqual(cur, sent)) {
      applyWorkspace(merged);
      editorHasThem = true;
    } else if (inStep && !filesEqual(cur, sent) && hasPendingSaves()) {
      const next = mergeSyncFiles(cur, sent, merged).files;
      if (!filesEqual(next, cur)) applyWorkspace(next);
      wrote = null;
      editorHasThem = true;
    }
  }
  return { wroteT: wrote, inStep: editorHasThem };
}

function asSendResult(r: PushResponse): SendResult | null {
  if (r.ok) return null;
  if ('owner' in r) return { kind: 'owner' };
  if ('error' in r) return r.error === '401' ? { kind: 'auth' } : { kind: 'retry', error: r.error };
  return null;
}

async function autoUpload(entry: OutboxEntry, keepalive: boolean): Promise<SendResult> {
  const lessonId = entry.id;
  // Open on this page but not allowed to upload (the reference solution is showing): not now.
  if (editing(lessonId) && !isLive(lessonId)) return { kind: 'skip' };
  // A Code together session is on in some tab: the stored draft holds the shared text.
  if (heldForSession(lessonId)) return { kind: 'skip' };
  const rt = runtimes.get(lessonId);
  if (rt?.saving || rt?.auto) return { kind: 'skip' };
  const draft = loadProgress(lessonId);
  if (!draft) return { kind: 'done' };
  const t0 = ownedLocal.stamp(PROGRESS_KEY + lessonId);
  const local = normalizeContents(draft.fileContents);
  const st = syncStateFor(lessonId);
  const keep = entry.keep === 'mine';
  if (!keep && filesEqual(local, st.base)) return { kind: 'done' };

  // Is this tab's editor what is being sent? Either it shows exactly that text, or this tab
  // wrote that very draft from its editor (and may have typed more since).
  const inStep = editing(lessonId) && (
    filesEqual(normalizeContents(useLessonStore.getState().fileContents), local)
    || (t0 !== null && wroteDraft.get(lessonId) === t0)
  );

  const first = await pushWorkspace(lessonId, local, st.revision, { auto: !keep, keepalive });
  if (first.ok) {
    setSynced(lessonId, local, first.revision, keep ? 'other' : 'auto', inStep);
    return { kind: 'done' };
  }
  const failed = asSendResult(first);
  if (failed) return failed;
  const remote = (first as { conflict: RemoteWorkspace }).conflict;
  if (remote.files === null) return { kind: 'retry', error: 'conflict' };

  // "Keep mine" was chosen over exactly this version; anything newer is a new choice.
  const keepHere = keep && entry.other?.revision === remote.revision;
  if (!keepHere && changedOnBoth(local, st.base, remote.files).length > 0) {
    return { kind: 'conflict', other: keepOther(lessonId, remote.files, remote.revision, remote.updatedAt, remote.versioned) };
  }
  const merged = mergeSyncFiles(local, st.base, remote.files).files;
  if (filesEqual(merged, remote.files)) {
    // The account already has everything (this upload's own answer may have been lost on the
    // way back): `saved` is kept, so the next Save is still a Cloud history version.
    const applied = applyMerged(lessonId, local, merged, t0, inStep);
    setSynced(lessonId, remote.files, remote.revision, keepHere ? 'other' : 'auto', applied.inStep);
    return { kind: 'done', wroteT: applied.wroteT };
  }
  const second = await pushWorkspace(lessonId, merged, remote.revision, { auto: !keepHere, keepalive });
  if (second.ok) {
    const applied = applyMerged(lessonId, local, merged, t0, inStep);
    setSynced(lessonId, merged, second.revision, keepHere ? 'other' : 'auto', applied.inStep);
    return { kind: 'done', wroteT: applied.wroteT };
  }
  const failed2 = asSendResult(second);
  if (failed2) return failed2;
  const remote2 = (second as { conflict: RemoteWorkspace }).conflict;
  // A third computer saved in between: with a choice on the line, show the newest one.
  if (keepHere && remote2.files) {
    return { kind: 'conflict', other: keepOther(lessonId, remote2.files, remote2.revision, remote2.updatedAt, remote2.versioned) };
  }
  return { kind: 'retry', error: 'busy' };
}

/** The outbox's sender for lab and sandbox code (installed by lib/outbox-senders.ts). */
// It has no "write the editor first" step: the outbox runs only saves that are really pending
// in this tab (lib/draft-autosave.ts flushPendingSaves) and this sends the STORED draft.
export const labSender: Sender = {
  async send(entry, { keepalive }) {
    const rt = runtimes.get(entry.id);
    const task = autoUpload(entry, keepalive);
    if (rt && !keepalive) rt.auto = task;
    try {
      return await task;
    } finally {
      if (rt && rt.auto === task) rt.auto = null;
    }
  },
};

/**
 * The open lesson's draft was just written (the autosave): queue it when it differs from
 * what the account last had. Called by LessonWorkspace's and SandboxWorkspace's saves.
 */
export function noteDraftSaved(lessonId: string): void {
  if (editing(lessonId)) wroteDraft.set(lessonId, ownedLocal.stamp(PROGRESS_KEY + lessonId));
  if (!pageIsAccount() || !isLive(lessonId) || !editing(lessonId)) return;
  const files = normalizeContents(useLessonStore.getState().fileContents);
  if (filesEqual(files, syncStateFor(lessonId).base)) return;
  enqueue('lab', lessonId);
}

export type KeepMineResult = 'ok' | 'history' | 'none';

/**
 * "Keep mine": upload this computer's version; files only the other computer changed still come
 * in. Only once the OTHER version is confirmed in History, read back from storage: its snapshot
 * is still there, or (gone or never written) the account's copy at exactly that revision is
 * fetched and kept now. Otherwise nothing changes, the lesson stays paused, and 'history' says so.
 */
export async function keepMine(lessonId: string): Promise<KeepMineResult> {
  const e = readEntry('lab', lessonId);
  if (!e?.other || e.paused !== 'conflict') return 'none';
  const other = e.other;
  let kept = !!(other.snap && listLocalHistory(lessonId).some((x) => x.id === other.snap));
  if (!kept) {
    const r = await fetchWorkspace(lessonId);
    if (r?.files && r.revision === other.revision) {
      try { kept = keepInHistory(lessonId, r.files, other.label); } catch { kept = false; }
    }
  }
  if (!kept) return 'history';
  // Still the same choice (another tab may have settled it meanwhile).
  const now = readEntry('lab', lessonId);
  if (now?.paused !== 'conflict' || now.other?.revision !== other.revision) return 'none';
  choose('lab', lessonId, 'mine');
  return 'ok';
}

export type OpenOtherResult = 'ok' | 'history' | 'missing' | 'not-open';

/**
 * "Open the other one". The student's own version is put in History FIRST and read back;
 * if that fails nothing at all changes. Then the other version replaces the editor's.
 */
export async function openOtherVersion(lessonId: string): Promise<OpenOtherResult> {
  const e = readEntry('lab', lessonId);
  if (!e?.other || !editing(lessonId) || !isLive(lessonId)) return 'not-open';
  const own = { ...useLessonStore.getState().fileContents };
  if (!keepInHistory(lessonId, own, 'Yours, before you opened the other one')) return 'history';
  let files: FileMap | null = null;
  let revision = e.other.revision;
  let versioned = e.other.versioned;
  const snap = e.other.snap ? listLocalHistory(lessonId).find((x) => x.id === e.other!.snap) : undefined;
  if (snap) files = { ...snap.files };
  if (!files) {
    const r = await fetchWorkspace(lessonId);
    if (r?.files) { files = r.files; revision = r.revision; versioned = r.versioned; }
    // The student may have opened another lesson while it was fetched: change nothing.
    if (!editing(lessonId) || !isLive(lessonId)) return 'not-open';
  }
  if (!files) return 'missing';
  // The student may have typed while the other version was fetched: that is in History too.
  if (!filesEqual(useLessonStore.getState().fileContents, own)
    && !keepInHistory(lessonId, { ...useLessonStore.getState().fileContents }, 'Yours, before you opened the other one')) {
    return 'history';
  }
  if (!editing(lessonId)) return 'not-open';
  applyWorkspace(files);
  saveOpenDraft(lessonId);
  setSynced(lessonId, files, revision, 'other', true);
  // Unless the server said the other version is a Saved one, it may have been uploaded by
  // itself: `saved: null` makes a Save pressed now send it, so it gets its Cloud history row.
  if (versioned !== true) writeRecord(lessonId, { base: files, revision, saved: null });
  choose('lab', lessonId, 'resolved');
  return 'ok';
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
 * after Reset), lets the outbox upload the draft by itself while `enabled` and
 * `autoUpload`, and hands the toolbar a deliberate Save action. `enabled` is
 * false while the student is unauthenticated or an admin is previewing the
 * reference solution; in both cases saving must not touch the student's row.
 */
export function useCloudWorkspace(lesson: Lesson, enabled: boolean, autoUpload = true): CloudWorkspace {
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

  // Uploads by itself are allowed while this workspace shows the lesson and Save is allowed.
  // A draft that already differs from what the account last had is queued now, so one whose
  // queue entry was lost is found again whenever the lesson opens.
  // `autoUpload` false (a Code together session is on): the shared text is not uploaded by
  // itself; Save still works, and leaving the session keeps the text as the student's draft.
  useEffect(() => {
    if (!enabled || !autoUpload || storeLessonId !== lessonId) return;
    const off = markLive(lessonId);
    noteDraftSaved(lessonId);
    return off;
  }, [enabled, autoUpload, lessonId, storeLessonId]);

  // While a Code together session is on, every tab of this student holds this lesson's uploads.
  useEffect(() => {
    if (!enabled || autoUpload || storeLessonId !== lessonId) return;
    return holdAutoUpload(lessonId);
  }, [enabled, autoUpload, lessonId, storeLessonId]);

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
    } else if (result === 'owner') {
      setNote({ kind: 'error', text: 'Not saved: someone else is signed in on this computer now. Your work stays on this computer under your name.' });
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
