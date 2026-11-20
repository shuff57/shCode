// The four types of sandbox project. A project picks one when it is made
// (lib/sandbox-projects-core.ts), and each project is its own lesson id, so
// switching projects never clobbers the code left in another one.

import type { Lesson } from './types';
import { CAD_CODE_SETTINGS, CAD_SETTINGS_FILE, CAD_STARTER } from './solidcraft-code';

export type SandboxModeId = 'js' | 'moshion' | 'reshape' | 'flow';

export interface SandboxMode {
  id: SandboxModeId;
  label: string;
  blurb: string;
  preview: 'console' | 'moshion' | 'reshape' | 'diagram';
  docsHref: string | null;
  /** The one saved file. Code modes keep script.js; a flowchart keeps its DiagramDoc as JSON. */
  file: string;
  starter: string;
}

// A flowchart is not run, so the starter is a canvas with one oval on it
// rather than a blank page: the first thing a student needs is a place to start.
export const FLOW_FILE = 'chart.json';
const FLOW_STARTER = JSON.stringify({
  version: 1,
  nodes: [{ id: 'start', shape: 'terminal', label: 'Start', x: 360, y: 40 }],
  edges: [],
});

const JS_STARTER = `// JavaScript sandbox — output goes to the console below.

const names = ['Ada', 'Grace', 'Alan'];

for (const name of names) {
  console.log('Hello, ' + name + '!');
}
`;

const MOSHION_STARTER = `// moSHion sandbox — try it out!

function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(40, 42, 54);
  fill(80, 250, 123);
  noStroke();
  circle(mouseX, mouseY, 40);
}
`;

export const SANDBOX_MODES: SandboxMode[] = [
  {
    id: 'js',
    label: 'JavaScript',
    blurb: 'Plain JavaScript. Output goes to the console.',
    preview: 'console',
    docsHref: null,
    file: 'script.js',
    starter: JS_STARTER,
  },
  {
    id: 'moshion',
    label: 'moSHion',
    blurb: 'A blank moSHion canvas to try out ideas.',
    preview: 'moshion',
    docsHref: '/docs/moshion',
    file: 'script.js',
    starter: MOSHION_STARTER,
  },
  {
    id: 'reshape',
    label: 'SolidCraft CAD',
    blurb: 'Script-driven 2D sketches and 3D parts. Change a measurement, then Run.',
    preview: 'reshape',
    docsHref: null,
    file: 'script.js',
    starter: CAD_STARTER,
  },
  {
    id: 'flow',
    label: 'Flowchart',
    blurb: 'A free canvas for flowcharts. No checks, no grade.',
    preview: 'diagram',
    docsHref: null,
    file: FLOW_FILE,
    starter: FLOW_STARTER,
  },
];

export function getMode(id: SandboxModeId): SandboxMode {
  return SANDBOX_MODES.find((m) => m.id === id) ?? SANDBOX_MODES[1];
}

/** The workspace for one sandbox project; `lessonId` is the project's (lib/sandbox-projects-core.ts). */
export function sandboxLesson(mode: SandboxMode, lessonId = `sandbox-${mode.id}`): Lesson {
  return {
    id: lessonId,
    title: 'Sandbox',
    description: mode.blurb,
    estimateMins: 0,
    unit: 'Sandbox',
    preview: mode.preview,
    ...(mode.id==='reshape'?{cadHost:'solidcraft' as const}:{}),
    files: [
      {
        type: 'file',
        id: `${lessonId}-script`,
        name: mode.file,
        path: mode.file,
        content: mode.starter,
      },
      ...(mode.id==='reshape' ? [
        {type:'file' as const,id:`${lessonId}-cad`,name:CAD_SETTINGS_FILE,path:CAD_SETTINGS_FILE,content:CAD_CODE_SETTINGS},
      ] : []),
    ],
    steps: [],
    requirements: [],
  };
}

/**
 * The type of the sandbox opened last. Before projects, the sandbox opened on this mode; now it only
 * decides which of the old sandboxes opens first for a student with no project remembered
 * (lib/sandbox-projects.ts), and opening a project writes it.
 */
export const SANDBOX_MODE_KEY = 'shCode:sandbox-mode';
