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

export const lessons: Lesson[] = [
  {
    id: 'html-intro',
    title: 'HTML Intro',
    description: 'Build a simple HTML page',
    difficulty: 'beginner',
    estimateMins: 10,
    files: [
      { type: 'file', name: 'index.html', path: 'index.html', content: '<h1>Hello world</h1>' },
      { type: 'file', name: 'style.css', path: 'style.css', content: 'h1{color:blue;}' },
      { type: 'file', name: 'script.js', path: 'script.js', content: 'console.log("hi")' }
    ],
    steps: [
      { id: 's1', title: 'Add heading' },
      { id: 's2', title: 'Style heading' }
    ],
    requirements: [
      { id: 'req1', title: 'Has h1', description: 'Contains an h1 tag', status: 'pending' },
      { id: 'req2', title: 'Logs hi', description: 'console logs "hi"', status: 'pending' }
    ]
  }
];
