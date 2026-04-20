// ---- File System ----

export type FileType = 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'text' | 'python';

export interface FileNode {
  id: string;
  type: 'file' | 'folder';
  name: string;
  path: string;
  language?: FileType;
  content?: string;
  children?: FileNode[];
}

// ---- Version Control ----

export interface Commit {
  id: string;
  message: string;
  timestamp: number;
  changedFileIds: string[];
  fileContentsSnapshot: Record<string, string>;
}

export interface Version {
  timestamp: number;
  content: string;
}

export type FileHistory = Record<string, Version[]>;

// ---- Lessons & Assignments ----

export type LessonType = 'lesson' | 'assignment' | 'project';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type RequirementType = 'regex' | 'output' | 'function' | 'custom';

export interface Step {
  id: string;
  title: string;
  instructions?: string;
  hints?: string[];
  requiredCommit?: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
  type?: RequirementType;
  file?: string;
  pattern?: string;
  flags?: string;
  expected?: string;
  testFn?: string;
  points?: number;
}

export interface Grading {
  totalPoints: number;
  passingScore: number;
  allowLateSubmit?: boolean;
  reviewCommitHistory?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type?: LessonType;
  difficulty: Difficulty;
  estimateMins: number;
  category?: string;
  unit?: string;
  preview?: 'html' | 'console' | 'jscad' | 'q5play';
  week?: number;
  slos?: string[];
  files: FileNode[];
  steps: Step[];
  requirements: Requirement[];
  grading?: Grading;
}

// ---- Student State (localStorage) ----

export interface StudentProgress {
  lessonId: string;
  fileContents: Record<string, string>;
  commits: Commit[];
  lastCommittedFileContents: Record<string, string>;
  fileHistory: FileHistory;
  completedSteps: string[];
  submissionStatus: 'in-progress' | 'submitted' | 'graded';
  score: number | null;
  submittedAt: number | null;
}
