export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface FileNode {
  type: 'file' | 'folder';
  name: string;
  path: string;
  content?: string;
  children?: FileNode[];
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  messages?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimateMins: number;
  files: FileNode[];
  steps: { id: string; title: string }[];
  requirements: Requirement[];
}

import { getLessonsFromHtmlDir } from './discoverLessons';

export const lessons = getLessonsFromHtmlDir();
