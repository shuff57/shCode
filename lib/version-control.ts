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

// ---- Restore a single file version ----
export function restoreFileVersion(
  fileId: string,
  version: Version
): { fileId: string; content: string } {
  return { fileId, content: version.content };
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

// ---- Filter commits by file/folder ----
export function filterCommitsByPath(
  commits: Commit[],
  fileIds: Set<string>
): Commit[] {
  return commits.filter((c) =>
    c.changedFileIds.some((id) => fileIds.has(id))
  );
}

// ---- localStorage persistence ----
const STORAGE_KEY = 'shCode:progress';
const LEGACY_STORAGE_KEY = 'shCode_progress';

export function saveProgress(
  lessonId: string,
  data: {
    fileContents: Record<string, string>;
    commits: Commit[];
    lastCommittedFileContents: Record<string, string>;
    completedSteps: string[];
  }
): void {
  const all = loadAllProgress();
  all[lessonId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadProgress(
  lessonId: string
): {
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  completedSteps: string[];
} | null {
  const all = loadAllProgress();
  return all[lessonId] || null;
}

export function clearProgress(lessonId: string): void {
  const all = loadAllProgress();
  delete all[lessonId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadAllProgress(): Record<string, any> {
  // One-time migration from the old underscore key so existing drafts
  // survive the rename.
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null && localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, legacy);
  }
  if (legacy !== null) localStorage.removeItem(LEGACY_STORAGE_KEY);

  let all: Record<string, any>;
  try {
    all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }

  // The sandbox names its draft after the mode it belongs to, so renaming the
  // jscad mode to reshape would strand whatever a student had open in it.
  // Rewrite the key instead. Idempotent, and it never overwrites a newer draft
  // already sitting under the new name.
  let moved = false;
  for (const key of Object.keys(all)) {
    if (!key.startsWith('sandbox-jscad')) continue;
    const renamed = `sandbox-reshape${key.slice('sandbox-jscad'.length)}`;
    if (all[renamed] === undefined) all[renamed] = all[key];
    delete all[key];
    moved = true;
  }
  if (moved) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* quota, private mode */ }
  }
  return all;
}
