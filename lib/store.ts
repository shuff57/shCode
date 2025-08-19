import { create } from 'zustand';
import { Lesson, Requirement, FileNode } from './lessons';

interface UIState {
  sidebarOpen: boolean;
  activeSidebarTab: 'Files' | 'Steps';
}

interface LessonState {
  lesson?: Lesson;
  currentFile?: string;
  fileContents: Record<string, string>;
  requirements: Requirement[];
  ui: UIState;
  setLesson: (lesson: Lesson) => void;
  selectFile: (path: string) => void;
  updateFile: (path: string, value: string) => void;
  moveFile: (from: string, to: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'Files' | 'Steps') => void;
  setRequirements: (reqs: Requirement[]) => void;
}

export const useLessonStore = create<LessonState>((set) => ({
  lesson: undefined,
  currentFile: undefined,
  fileContents: {},
  requirements: [],
  ui: { sidebarOpen: false, activeSidebarTab: 'Files' },
  setLesson: (lesson) => {
    const flatten = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap((n) =>
        n.type === 'file' ? [n] : flatten(n.children || [])
      );
    const files = flatten(lesson.files);
    set({
      lesson,
      currentFile: files[0]?.path,
      fileContents: Object.fromEntries(
        files.map((f) => [f.path, f.content || ''])
      ),
      requirements: lesson.requirements,
    });
  },
  selectFile: (path) => set({ currentFile: path }),
  updateFile: (path, value) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: value },
    })),
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
}));
