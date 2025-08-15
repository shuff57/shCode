import { create } from 'zustand';
import { Lesson, Requirement } from './lessons';

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
  toggleSidebar: () => void;
  setActiveTab: (tab: 'Files' | 'Steps') => void;
  setRequirements: (reqs: Requirement[]) => void;
}

export const useLessonStore = create<LessonState>((set) => ({
  lesson: undefined,
  currentFile: undefined,
  fileContents: {},
  requirements: [],
  ui: { sidebarOpen: true, activeSidebarTab: 'Files' },
  setLesson: (lesson) =>
    set({
      lesson,
      currentFile: lesson.files[0]?.path,
      fileContents: Object.fromEntries(
        lesson.files
          .filter((f) => f.type === 'file')
          .map((f) => [f.path, f.content || ''])
      ),
      requirements: lesson.requirements,
    }),
  selectFile: (path) => set({ currentFile: path }),
  updateFile: (path, value) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [path]: value },
    })),
  toggleSidebar: () =>
    set((state) => ({
      ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
    })),
  setActiveTab: (tab) =>
    set((state) => ({ ui: { ...state.ui, activeSidebarTab: tab } })),
  setRequirements: (reqs) => set({ requirements: reqs }),
}));
