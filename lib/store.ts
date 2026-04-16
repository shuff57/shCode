import { create } from 'zustand';
import type { Lesson, Requirement, FileNode, Commit, Version, FileHistory } from './types';
import {
  createCommit,
  getChangedFiles,
  restoreToCommit,
  getFileHistoryFromCommits,
  buildFileIdMap,
  saveProgress,
  loadProgress,
} from './version-control';

interface UIState {
  sidebarOpen: boolean;
  activeSidebarTab: 'Files' | 'Steps';
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
  selectFile: (path: string) => void;
  updateFile: (path: string, value: string) => void;
  moveFile: (from: string, to: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'Files' | 'Steps') => void;
  setRequirements: (reqs: Requirement[]) => void;

  // VC actions
  initVC: (fileContents: Record<string, string>) => void;
  markDirty: (fileId: string) => void;
  commitChanges: (message: string) => boolean;
  restoreCommit: (commitId: string) => void;
  restoreVersion: (fileId: string, version: Version) => void;
  getFileHistory: (fileId: string) => Version[];
  getDirtyCount: () => number;

  // Helpers
  pathToId: (path: string) => string;
  idToPath: (id: string) => string | undefined;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
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
  ui: { sidebarOpen: false, activeSidebarTab: 'Files' },
  commits: [],
  lastCommittedFileContents: {},
  dirtyFileIds: new Set(),
  fileHistory: {},

  setLesson: (lesson) => {
    const files = flattenFiles(lesson.files);
    const fileContents = Object.fromEntries(
      files.map((f) => [f.path, f.content || ''])
    );

    // For console/jscad-mode (JS-only) lessons, default to script.js
    const defaultFile = lesson.preview === 'console' || lesson.preview === 'jscad'
      ? (files.find((f) => f.path.endsWith('.js'))?.path || files[0]?.path)
      : files[0]?.path;

    set({
      lesson,
      currentFile: defaultFile,
      fileContents,
      requirements: lesson.requirements,
    });

    // Check for saved progress
    if (typeof window !== 'undefined') {
      const saved = loadProgress(lesson.id);
      if (saved) {
        set({
          fileContents: saved.fileContents,
          commits: saved.commits,
          lastCommittedFileContents: saved.lastCommittedFileContents,
          dirtyFileIds: new Set(),
        });
      } else {
        // Create ID-keyed contents for initial commit
        const idMap = buildFileIdMap(lesson.files);
        const idContents: Record<string, string> = {};
        for (const [filePath, content] of Object.entries(fileContents)) {
          const id = idMap[filePath];
          if (id) idContents[id] = content;
        }
        const initial = createCommit('Initial code', Object.keys(idContents), idContents);
        set({
          commits: [initial],
          lastCommittedFileContents: { ...fileContents },
          dirtyFileIds: new Set(),
          fileHistory: {},
        });
      }
    }
  },

  selectFile: (path) => set({ currentFile: path }),

  updateFile: (path, value) => {
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: value },
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

  initVC: (fileContents) => {
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

  commitChanges: (message) => {
    const state = get();
    const changed = getChangedFiles(
      state.fileContents,
      state.lastCommittedFileContents,
      state.dirtyFileIds
    );
    if (changed.length === 0) return false;

    const commit = createCommit(message, changed, state.fileContents);
    set({
      commits: [...state.commits, commit],
      lastCommittedFileContents: { ...state.fileContents },
      dirtyFileIds: new Set(),
    });

    // Persist to localStorage
    if (state.lesson && typeof window !== 'undefined') {
      saveProgress(state.lesson.id, {
        fileContents: state.fileContents,
        commits: [...state.commits, commit],
        lastCommittedFileContents: { ...state.fileContents },
        completedSteps: [],
      });
    }
    return true;
  },

  restoreCommit: (commitId) => {
    const state = get();
    const result = restoreToCommit(commitId, state.commits);
    if (!result) return;

    set({
      fileContents: result.restoredContents,
      commits: result.truncatedCommits,
      lastCommittedFileContents: { ...result.restoredContents },
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
        fileContents: { ...s.fileContents, [path]: version.content },
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
      state.lastCommittedFileContents,
      state.dirtyFileIds
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
