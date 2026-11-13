import { ownedLocal, type WriteResult } from './owned-storage';
import type { Commit, FileHistory, Version, FileNode } from './types';

// ---- Generate file ID map from FileNode tree ----
export function buildFileIdMap(nodes: FileNode[]): Record<string, string> {
  const map: Record<string, string> = {};
  function walk(nodes: FileNode[]) {
    for (const n of nodes) {
      if (n.type === 'file') map[n.path] = n.id;
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

// ---- Line endings ----
//
// Lesson bundles are authored on Windows and ship CRLF. CodeMirror normalises
// its document to LF and fires onChange on mount, so `fileContents` became LF
// while `lastCommittedFileContents` kept CRLF, and every lesson opened showing
// "Commit (1)" on work nobody had touched -- measured on 1.3.11, 1.3.16 and
// 1.3.19 from cleared localStorage. The autosave then persisted the mismatch,
// so it survived every later load.
//
// Normalise on the way IN rather than inside getChangedFiles: fixing the
// comparison alone would hide the counter while still storing CRLF snapshots in
// `commits`, and would leave grader patterns like `//[^\n]{6,}` counting the
// stray \r as a character.
//
// \r\n and a lone \r (classic Mac) both collapse to \n.
export function normalizeEol(text: string): string {
  return (text ?? '').replace(/\r\n?/g, '\n');
}

export function normalizeContents(
  files: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const path of Object.keys(files ?? {})) {
    out[path] = normalizeEol(files[path]);
  }
  return out;
}

// ---- Detect changed files ----
// Compares the two content maps directly. It deliberately does NOT consult a
// dirty-id set: `dirtyFileIds` is reset to empty on every lesson mount, so any
// edit made before a reload was invisible here and commitChanges() silently
// no-opped — a student could finish a lesson with zero rows in `commits`.
export function getChangedFiles(
  currentContents: Record<string, string>,
  lastCommitted: Record<string, string>
): string[] {
  const ids = new Set([...Object.keys(currentContents), ...Object.keys(lastCommitted)]);
  const changed: string[] = [];
  ids.forEach((fileId) => {
    if (currentContents[fileId] !== lastCommitted[fileId]) {
      changed.push(fileId);
    }
  });
  return changed;
}

// ---- Create a commit ----
export function createCommit(
  message: string,
  changedFileIds: string[],
  allFileContents: Record<string, string>
): Commit {
  return {
    id: `commit-${Date.now()}`,
    message,
    timestamp: Date.now(),
    changedFileIds,
    fileContentsSnapshot: { ...allFileContents },
  };
}

// ---- Restore to a specific commit ----
export function restoreToCommit(
  commitId: string,
  commits: Commit[]
): { restoredContents: Record<string, string>; truncatedCommits: Commit[] } | null {
  const idx = commits.findIndex((c) => c.id === commitId);
  if (idx === -1) return null;
  const target = commits[idx];
  if (!target.fileContentsSnapshot) return null;
  return {
    restoredContents: { ...target.fileContentsSnapshot },
    truncatedCommits: commits.slice(0, idx + 1),
  };
}


// ---- Get history for a file from commits ----
export function getFileHistoryFromCommits(
  fileId: string,
  commits: Commit[],
  currentContent: string
): Version[] {
  const versions: Version[] = [
    { timestamp: Date.now(), content: currentContent },
  ];
  for (let i = commits.length - 1; i >= 0; i--) {
    const commit = commits[i];
    if (
      commit.changedFileIds.includes(fileId) &&
      commit.fileContentsSnapshot[fileId] !== undefined
    ) {
      versions.push({
        timestamp: commit.timestamp,
        content: commit.fileContentsSnapshot[fileId],
      });
    }
  }
  return versions;
}


// ---- persistence (this page's owner's records, lib/owned-storage.ts) ----
//
// One record per lesson, `w1:<owner>:progress:<lessonId>`. Commits are NOT kept here:
// the server owns them (lib/store.ts resets them to [] on load), and full commit
// snapshots were the heaviest thing in the old single `shCode:progress` map. That map
// and its older `shCode_progress` name are set aside by lib/owned-storage.ts and are
// never given back automatically (a later stage adds a teacher export).

export const PROGRESS_KEY = 'progress:';

export interface DraftProgress {
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  completedSteps: string[];
}

/** Write a lesson's draft. Never throws; a failed write keeps the previous draft. */
export function saveProgress(lessonId: string, data: DraftProgress): WriteResult {
  return ownedLocal.setJSON(PROGRESS_KEY + lessonId, {
    fileContents: data.fileContents,
    commits: [],
    lastCommittedFileContents: data.lastCommittedFileContents,
    completedSteps: data.completedSteps ?? [],
  });
}

export function loadProgress(lessonId: string): DraftProgress | null {
  return asDraft(ownedLocal.getJSON(PROGRESS_KEY + lessonId));
}

export function clearProgress(lessonId: string): void {
  ownedLocal.removeItem(PROGRESS_KEY + lessonId);
}

/** A stored draft, or null when the record is not one. */
export function asDraft(v: unknown): DraftProgress | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Partial<DraftProgress>;
  if (!r.fileContents || typeof r.fileContents !== 'object') return null;
  return {
    fileContents: r.fileContents,
    commits: [],
    lastCommittedFileContents: r.lastCommittedFileContents && typeof r.lastCommittedFileContents === 'object'
      ? r.lastCommittedFileContents
      : { ...r.fileContents },
    completedSteps: Array.isArray(r.completedSteps) ? r.completedSteps : [],
  };
}
