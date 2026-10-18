// The four things the sandbox can hold. Each mode is its own lesson id, so the
// store keeps four independent drafts — switching modes does not clobber the
// code you left in another one.

import type { Lesson } from './types';

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

// Every dimension is declared in getParameterDefinitions() rather than written
// as a literal in main(). That is what lets the Dimensions panel drive the model
// without touching a character of the source.
const RESHAPE_STARTER = `// reSHape sandbox -- solid modelling.
// Every line is one step, the same steps the Build tools make.
// Every number becomes a slider in the Dimensions panel.

const body = box(40, 40, 20, { corner: 4 })
hole(body, { across: 10 })
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
    label: 'reSHape',
    blurb: 'Solid modelling. Drag a dimension and the model rebuilds.',
    preview: 'reshape',
    docsHref: '/docs/reshape',
    file: 'script.js',
    starter: RESHAPE_STARTER,
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

export function sandboxLesson(mode: SandboxMode): Lesson {
  return {
    id: `sandbox-${mode.id}`,
    title: 'Sandbox',
    description: mode.blurb,
    estimateMins: 0,
    unit: 'Sandbox',
    preview: mode.preview,
    files: [
      {
        type: 'file',
        id: `sandbox-${mode.id}-script`,
        name: mode.file,
        path: mode.file,
        content: mode.starter,
      },
    ],
    steps: [],
    requirements: [],
  };
}
