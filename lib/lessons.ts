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
  },
  {
    id: 'basic-html',
    title: 'Basic HTML',
    description: 'Learn the fundamentals of HTML structure',
    difficulty: 'beginner',
    estimateMins: 5,
    files: [
      {
        type: 'file',
        name: 'index.html',
        path: 'index.html',
        content:
          '<!DOCTYPE html><html><head><title>Basic HTML</title></head><body><h1>Hello Campers!</h1></body></html>'
      },
      { type: 'file', name: 'style.css', path: 'style.css', content: 'body{font-family:sans-serif;}' },
      { type: 'file', name: 'script.js', path: 'script.js', content: '' }
    ],
    steps: [
      { id: 's1', title: 'Add a paragraph' },
      { id: 's2', title: 'Style the text' }
    ],
    requirements: [
      { id: 'req1', title: 'Add h1', description: 'Includes an h1 element', status: 'pending' },
      { id: 'req2', title: 'Add paragraph', description: 'Includes a p element', status: 'pending' }
    ]
  },
  {
    id: 'debug-camper-bot',
    title: 'Debug Camper Bot',
    description: 'Fix the Camper Bot markup and script',
    difficulty: 'beginner',
    estimateMins: 10,
    files: [
      {
        type: 'file',
        name: 'index.html',
        path: 'index.html',
        content:
          '<!DOCTYPE html><html><head><title>Debug Camper Bot</title></head><body><img id="camperbot" src="camper-bot.png"><script src="script.js"></script></body></html>'
      },
      { type: 'file', name: 'script.js', path: 'script.js', content: 'console.log("Camper Bot ready")' }
    ],
    steps: [
      { id: 's1', title: 'Add alt text to image' },
      { id: 's2', title: 'Log readiness' }
    ],
    requirements: [
      {
        id: 'req1',
        title: 'Image has alt',
        description: 'Image element has alt="Camper Bot"',
        status: 'pending'
      },
      {
        id: 'req2',
        title: 'Log ready',
        description: 'script logs "Camper Bot ready"',
        status: 'pending'
      }
    ]
  }
];
