import { create } from 'zustand';
import { Lesson, Requirement, FileNode } from './lessons';
import { clearDraft, restoreDraft, writeDraft } from './drafts.js';

interface UIState {
  sidebarOpen: boolean;
  activeSidebarTab: 'Files' | 'Steps';
}

interface DraftState {
  /** When this browser last backed the work up, or null if nothing is saved. */
  savedAt: number | null;
  /** Set when the browser refuses to store anything, so the UI can warn. */
  error: string | null;
  /** When the draft that opened this session was written, if there was one. */
  restoredAt: number | null;
}

interface LessonState {
  lesson?: Lesson;
  currentFile?: string;
  fileContents: Record<string, string>;
  requirements: Requirement[];
  ui: UIState;
  draft: DraftState;
  setLesson: (lesson: Lesson) => void;
  selectFile: (path: string) => void;
  updateFile: (path: string, value: string) => void;
  moveFile: (from: string, to: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'Files' | 'Steps') => void;
  setRequirements: (reqs: Requirement[]) => void;
  /** Throw this browser's saved work away and go back to the starter files. */
  resetToStarter: () => void;
  /** Write a pending edit right now, e.g. when the tab is closing. */
  flushDraft: () => void;
}

const flatten = (nodes: FileNode[]): FileNode[] =>
  nodes.flatMap((n) => (n.type === 'file' ? [n] : flatten(n.children || [])));

const starterContents = (lesson: Lesson) =>
  Object.fromEntries(flatten(lesson.files).map((f) => [f.path, f.content || '']));

// Saves are debounced so a fast typist is not hitting localStorage on every
// keystroke, and flushed on pagehide so the last few characters still survive
// a closed laptop lid. See lib/drafts.js.
const SAVE_DEBOUNCE_MS = 400;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPendingSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
}

export const useLessonStore = create<LessonState>((set, get) => {
  const persist = () => {
    const { lesson, fileContents, currentFile } = get();
    if (!lesson) return;
    const { savedAt, error } = writeDraft(lesson.id, fileContents, currentFile);
    set((state) => ({
      draft: {
        ...state.draft,
        savedAt: savedAt ?? state.draft.savedAt,
        error,
      },
    }));
  };

  const schedulePersist = () => {
    cancelPendingSave();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persist();
    }, SAVE_DEBOUNCE_MS);
  };

  return {
    lesson: undefined,
    currentFile: undefined,
    fileContents: {},
    requirements: [],
    ui: { sidebarOpen: false, activeSidebarTab: 'Files' },
    draft: { savedAt: null, error: null, restoredAt: null },
    setLesson: (lesson) => {
      // A queued save belongs to the lesson we are leaving, not this one.
      cancelPendingSave();
      const starter = starterContents(lesson);
      const { contents, currentFile, restoredAt } = restoreDraft(
        lesson.id,
        starter,
        flatten(lesson.files)[0]?.path
      );
      set({
        lesson,
        currentFile,
        fileContents: contents,
        requirements: lesson.requirements,
        draft: { savedAt: restoredAt, error: null, restoredAt },
      });
    },
    selectFile: (path) => set({ currentFile: path }),
    updateFile: (path, value) => {
      set((state) => ({
        fileContents: { ...state.fileContents, [path]: value },
      }));
      schedulePersist();
    },
    moveFile: (from, to) => {
      set((state) => {
        const contents = { ...state.fileContents };
        const content = contents[from];
        delete contents[from];
        contents[to] = content;
        const currentFile = state.currentFile === from ? to : state.currentFile;
        return { fileContents: contents, currentFile };
      });
      schedulePersist();
    },
    setSidebarOpen: (open) =>
      set((state) => ({ ui: { ...state.ui, sidebarOpen: open } })),
    setActiveTab: (tab) =>
      set((state) => ({ ui: { ...state.ui, activeSidebarTab: tab } })),
    setRequirements: (reqs) => set({ requirements: reqs }),
    resetToStarter: () => {
      const { lesson } = get();
      if (!lesson) return;
      cancelPendingSave();
      clearDraft(lesson.id);
      set({
        currentFile: flatten(lesson.files)[0]?.path,
        fileContents: starterContents(lesson),
        draft: { savedAt: null, error: null, restoredAt: null },
      });
    },
    flushDraft: () => {
      if (!saveTimer) return;
      cancelPendingSave();
      persist();
    },
  };
});
