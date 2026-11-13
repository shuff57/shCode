import { create } from 'zustand';
import type { Lesson, Requirement, FileNode, Commit, Version, FileHistory } from './types';
import {
  createCommit,
  getChangedFiles,
  normalizeEol,
  normalizeContents,
  restoreToCommit,
  getFileHistoryFromCommits,
  buildFileIdMap,
  loadProgress,
  saveProgress,
  clearProgress,
} from './version-control';
import { listCommits, createCommit as apiCreateCommit } from './commits-api';
import { rememberedStarter, starterFile } from './starter-variants';
import { carryMessage, mergeCarriedFiles } from './carry-forward';
import { keepInHistory } from './local-history';
import { filesEqual } from './lesson-sync-merge';

interface UIState {
  sidebarOpen: boolean;
  activeSidebarTab: 'Files' | 'Grading';
}


interface LessonState {
  // Lesson
  lesson?: Lesson;
  currentFile?: string;
  fileContents: Record<string, string>;
  requirements: Requirement[];
  ui: UIState;

  // Version Control
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  dirtyFileIds: Set<string>;
  fileHistory: FileHistory;

  // Lesson actions
  setLesson: (lesson: Lesson) => void;
  /**
   * Reset to the canonical starter from lesson.files, erasing any saved draft. The code it
   * replaces goes into History first (read back): since work uploads by itself, the starter
   * would otherwise replace the account's copy too with the old code kept nowhere. False =
   * it could not be kept, and nothing was reset (say NOT_KEPT_TEXT, lib/local-history.ts).
   * `discard: true` when the editor shows something that is NOT the person's own work (the
   * reference solution a teacher inserted): it is replaced without being put in History.
   */
  resetLesson: (lesson: Lesson, opts?: { discard?: boolean }) => boolean;
  selectFile: (path: string) => void;
  updateFile: (path: string, value: string) => void;
  moveFile: (from: string, to: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'Files' | 'Grading') => void;
  setRequirements: (reqs: Requirement[]) => void;

  // VC actions
  initVC: (fileContents: Record<string, string>) => void;
  markDirty: (fileId: string) => void;
  commitChanges: (message: string) => Promise<boolean>;
  /**
   * Bring the source lesson's saved work into this one and record a provenance
   * commit. Reads the source's newest server commit, falls back to its offline
   * draft. Returns false when there is nothing to carry.
   */
  carryForward: (sourceId: string, sourceTitle: string) => Promise<boolean>;
  restoreCommit: (commitId: string) => void;
  restoreVersion: (fileId: string, version: Version) => void;
  getFileHistory: (fileId: string) => Version[];
  getDirtyCount: () => number;

  // Helpers
  pathToId: (path: string) => string;
  idToPath: (id: string) => string | undefined;
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.flatMap((n) =>
    n.type === 'file' ? [n] : flattenFiles(n.children || [])
  );
}

export const useLessonStore = create<LessonState>((set, get) => ({
  // State
  lesson: undefined,
  currentFile: undefined,
  fileContents: {},
  requirements: [],
  ui: { sidebarOpen: false, activeSidebarTab: 'Grading' },
  commits: [],
  lastCommittedFileContents: {},
  dirtyFileIds: new Set(),
  fileHistory: {},

  setLesson: (lesson) => {
    const files = flattenFiles(lesson.files);
    // Bundles ship CRLF; the editor works in LF. Normalise here so the
    // two content maps can never differ by line endings alone.
    const fileContents = Object.fromEntries(
      files.map((f) => [f.path, normalizeEol(f.content || '')])
    );

    // For JS-only preview modes (console, reshape, moshion), default to script.js.
    // A text lesson opens its graded file (README.md), even when the folder also
    // holds an authored content.md.
    const jsPreviewModes = ['console', 'reshape', 'moshion'];
    const defaultFile = lesson.editor === 'text'
      ? (lesson.aiCheck?.file || files.find((f) => f.path === 'README.md')?.path || files[0]?.path)
      : jsPreviewModes.includes(lesson.preview || '')
        ? (files.find((f) => f.path.endsWith('.js'))?.path || files[0]?.path)
        : files[0]?.path;

    set({
      lesson,
      currentFile: defaultFile,
      fileContents,
      requirements: lesson.requirements,
    });

    // Commits are owned by the server now — no localStorage fallback for
    // history. File contents still load from localStorage so in-progress
    // edits survive a reload even when offline.
    if (typeof window !== 'undefined') {
      const saved = loadProgress(lesson.id);
      set({
        // normalizeContents on the saved branch repairs drafts written
        // before this fix, which persisted the mismatch to localStorage.
        fileContents: saved ? normalizeContents(saved.fileContents) : fileContents,
        lastCommittedFileContents: saved
          ? normalizeContents(saved.lastCommittedFileContents)
          : { ...fileContents },
        commits: [],
        dirtyFileIds: new Set(),
        fileHistory: {},
      });

      // Fire-and-forget fetch of remote commits. Populates the store when
      // it resolves. 401 / network failures leave commits empty — the
      // UI renders "no history yet".
      listCommits(lesson.id)
        .then((commits) => {
          // Ignore if the user has since navigated to another lesson.
          if (get().lesson?.id === lesson.id) set({ commits });
        })
        .catch(() => {
          /* unauthenticated or offline — history stays empty */
        });
    }
  },

  resetLesson: (lesson, opts) => {
    // Load the canonical starter from the lesson bundle — never from localStorage.
    // Also wipes the stored draft so the next page-load starts fresh.
    const files = flattenFiles(lesson.files);
    // Bundles ship CRLF; the editor works in LF. Normalise here so the
    // two content maps can never differ by line endings alone.
    const fileContents = Object.fromEntries(
      files.map((f) => [f.path, normalizeEol(f.content || '')])
    );
    // A lesson that offers a choice of problem restores the pair's own
    // starter. Only WHICH starter is read from storage -- the text still comes
    // from the bundle, so a Reset never hands back an edited draft.
    const picked = rememberedStarter(lesson);
    if (picked) fileContents[starterFile(picked)] = normalizeEol(picked.text);
    const jsPreviewModes = ['console', 'reshape', 'moshion'];
    const defaultFile = jsPreviewModes.includes(lesson.preview || '')
      ? (files.find((f) => f.path.endsWith('.js'))?.path || files[0]?.path)
      : files[0]?.path;

    const open = get();
    if (typeof window !== 'undefined' && !opts?.discard && open.lesson?.id === lesson.id && !filesEqual(open.fileContents, fileContents)) {
      let kept = false;
      try { kept = keepInHistory(lesson.id, { ...open.fileContents }, 'Yours, before you reset'); } catch { kept = false; }
      if (!kept) return false;
    }

    set({
      lesson,
      currentFile: defaultFile,
      fileContents,
      requirements: lesson.requirements,
      lastCommittedFileContents: { ...fileContents },
      commits: [],
      dirtyFileIds: new Set(),
      fileHistory: {},
    });

    if (typeof window !== 'undefined') {
      clearProgress(lesson.id);
      // Re-fetch remote history so the History panel stays accurate.
      listCommits(lesson.id)
        .then((commits) => {
          if (get().lesson?.id === lesson.id) set({ commits });
        })
        .catch(() => { /* unauthenticated or offline */ });
    }
    return true;
  },

  selectFile: (path) => set({ currentFile: path }),

  updateFile: (path, value) => {
    // Every write goes through here -- typing, an uploaded file, and the
    // reference-solution insert, which hands over raw CRLF bundle text.
    const text = normalizeEol(value);
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: text },
    }));
    // Mark dirty by file ID
    const state = get();
    if (state.lesson) {
      const idMap = buildFileIdMap(state.lesson.files);
      const id = idMap[path];
      if (id) {
        set((s) => ({
          dirtyFileIds: new Set(s.dirtyFileIds).add(id),
        }));
      }
    }
  },

  moveFile: (from, to) =>
    set((state) => {
      const contents = { ...state.fileContents };
      const content = contents[from];
      delete contents[from];
      contents[to] = content;
      const currentFile = state.currentFile === from ? to : state.currentFile;
      return { fileContents: contents, currentFile };
    }),

  setSidebarOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, sidebarOpen: open } })),

  setActiveTab: (tab) =>
    set((state) => ({ ui: { ...state.ui, activeSidebarTab: tab } })),

  setRequirements: (reqs) => set({ requirements: reqs }),

  // ---- Version Control ----

  initVC: (rawFileContents) => {
    const fileContents = normalizeContents(rawFileContents);
    const initial = createCommit('Initial code', Object.keys(fileContents), fileContents);
    set({
      commits: [initial],
      lastCommittedFileContents: { ...fileContents },
      dirtyFileIds: new Set(),
      fileHistory: {},
    });
  },

  markDirty: (fileId) =>
    set((state) => ({
      dirtyFileIds: new Set(state.dirtyFileIds).add(fileId),
    })),

  commitChanges: async (message) => {
    const state = get();
    if (!state.lesson) return false;
    const changed = getChangedFiles(
      state.fileContents,
      state.lastCommittedFileContents,
    );
    if (changed.length === 0) return false;

    const commit = createCommit(message, changed, state.fileContents);

    // Optimistic local add so the UI updates immediately. If the POST
    // fails we roll back and re-throw so callers can surface the error.
    set({
      commits: [...state.commits, commit],
      lastCommittedFileContents: { ...state.fileContents },
      dirtyFileIds: new Set(),
    });

    try {
      const stored = await apiCreateCommit(state.lesson.id, commit);
      // Replace the optimistic entry with the server's authoritative copy
      // (identical today, but keeps us honest if the server ever mutates).
      set((s) => ({
        commits: s.commits.map((c) => (c.id === commit.id ? stored : c)),
      }));
      // Flush to localStorage immediately. The 2-second autosave in
      // LessonWorkspace can lag a quick refresh, leaving a stale
      // lastCommittedFileContents that shows changes nobody made.
      const fresh = get();
      saveProgress(state.lesson.id, {
        fileContents: fresh.fileContents,
        commits: fresh.commits,
        lastCommittedFileContents: fresh.lastCommittedFileContents,
        completedSteps: [],
      });
      return true;
    } catch (err) {
      // Roll back the optimistic commit on failure.
      set((s) => ({
        commits: s.commits.filter((c) => c.id !== commit.id),
        lastCommittedFileContents: state.lastCommittedFileContents,
        dirtyFileIds: state.dirtyFileIds,
      }));
      throw err;
    }
  },

  carryForward: async (sourceId, sourceTitle) => {
    const state = get();
    const lesson = state.lesson;
    if (!lesson) return false;

    // Newest server commit first; the offline draft is the fallback so a
    // student who worked without a connection is not offered nothing.
    let carried: Record<string, string> | null = null;
    try {
      const commits = await listCommits(sourceId);
      if (commits.length > 0) carried = commits[0].fileContentsSnapshot;
    } catch {
      /* unauthenticated or offline: try the draft */
    }
    if (!carried) {
      const draft = loadProgress(sourceId);
      if (draft) carried = draft.fileContents;
    }
    if (!carried) return false;

    const merged = mergeCarriedFiles(state.fileContents, carried);
    // The files it replaces go into History first (read back); if they cannot, nothing is brought in.
    if (typeof window !== 'undefined' && !filesEqual(merged, state.fileContents)) {
      let kept = false;
      try { kept = keepInHistory(lesson.id, { ...state.fileContents }, 'Yours, before you brought work forward'); } catch { kept = false; }
      if (!kept) return false;
    }
    const commit = createCommit(carryMessage(sourceTitle), Object.keys(merged), merged);

    set({
      fileContents: merged,
      lastCommittedFileContents: { ...merged },
      commits: [commit, ...state.commits],
      dirtyFileIds: new Set(),
    });

    // Remember it locally at once, so a refresh before the POST lands keeps the
    // carried work. The POST only makes it part of the server-side history.
    saveProgress(lesson.id, {
      fileContents: merged,
      commits: get().commits,
      lastCommittedFileContents: { ...merged },
      completedSteps: [],
    });

    try {
      const stored = await apiCreateCommit(lesson.id, commit);
      set((s) => ({ commits: s.commits.map((c) => (c.id === commit.id ? stored : c)) }));
    } catch {
      /* carried work is in place; provenance stays local until the next commit */
    }
    return true;
  },

  restoreCommit: (commitId) => {
    const state = get();
    const result = restoreToCommit(commitId, state.commits);
    if (!result) return;

    // Snapshots committed before this fix still hold CRLF.
    const restored = normalizeContents(result.restoredContents);
    set({
      fileContents: restored,
      commits: result.truncatedCommits,
      lastCommittedFileContents: { ...restored },
      dirtyFileIds: new Set(),
    });
  },

  restoreVersion: (fileId, version) => {
    const state = get();
    // Find file path by ID
    if (!state.lesson) return;
    const idMap = buildFileIdMap(state.lesson.files);
    const path = Object.entries(idMap).find(([, id]) => id === fileId)?.[0];
    if (path) {
      set((s) => ({
        fileContents: { ...s.fileContents, [path]: normalizeEol(version.content) },
        dirtyFileIds: new Set(s.dirtyFileIds).add(fileId),
      }));
    }
  },

  getFileHistory: (fileId) => {
    const state = get();
    const currentContent = Object.values(state.fileContents).find((_, i) => {
      if (!state.lesson) return false;
      const idMap = buildFileIdMap(state.lesson.files);
      const paths = Object.entries(idMap);
      return paths[i]?.[1] === fileId;
    }) || '';
    return getFileHistoryFromCommits(fileId, state.commits, currentContent);
  },

  getDirtyCount: () => {
    const state = get();
    return getChangedFiles(
      state.fileContents,
      state.lastCommittedFileContents
    ).length;
  },

  pathToId: (filePath) => {
    const state = get();
    if (!state.lesson) return filePath.replace(/\//g, '-');
    const idMap = buildFileIdMap(state.lesson.files);
    return idMap[filePath] || filePath.replace(/\//g, '-');
  },

  idToPath: (id) => {
    const state = get();
    if (!state.lesson) return undefined;
    const idMap = buildFileIdMap(state.lesson.files);
    return Object.entries(idMap).find(([, fileId]) => fileId === id)?.[0];
  },
}));

/**
 * Write the open lesson's draft, if the store is still showing `lessonId` (after a
 * switch it holds another lesson, whose own workspace saves it). The lab autosave
 * (components/LessonWorkspace.tsx, lib/draft-autosave.ts) calls this, and so does
 * scripts/test-owned-storage.mjs. The write lands in the page owner's keys.
 */
export function saveOpenDraft(lessonId: string): 'ok' | 'full' | 'blocked' | 'skipped' {
  const state = useLessonStore.getState();
  if (!state.lesson || state.lesson.id !== lessonId) return 'skipped';
  return saveProgress(state.lesson.id, {
    fileContents: state.fileContents,
    commits: state.commits,
    lastCommittedFileContents: state.lastCommittedFileContents,
    completedSteps: [],
  });
}
