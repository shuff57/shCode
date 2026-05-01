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

// ---- Detect changed files ----
export function getChangedFiles(
  currentContents: Record<string, string>,
  lastCommitted: Record<string, string>,
  dirtyIds: Set<string>
): string[] {
  const changed: string[] = [];
  dirtyIds.forEach((fileId) => {
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

  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
