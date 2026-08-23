// The three things the sandbox can run. Each mode is its own lesson id, so the
// store keeps three independent drafts — switching modes does not clobber the
// code you left in another one.

import type { Lesson } from './types';

export type SandboxModeId = 'js' | 'shplay' | 'jscad';

export interface SandboxMode {
  id: SandboxModeId;
  label: string;
  blurb: string;
  preview: 'console' | 'shplay' | 'jscad';
  docsHref: string | null;
  starter: string;
}

const JS_STARTER = `// JavaScript sandbox — output goes to the console below.

const names = ['Ada', 'Grace', 'Alan'];

for (const name of names) {
  console.log('Hello, ' + name + '!');
}
`;

const SHPLAY_STARTER = `// shPlay sandbox — try it out!

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
const JSCAD_STARTER = `// JSCAD sandbox — solid modelling.
// Numbers declared here show up in the Dimensions panel.

const { primitives, booleans, transforms } = require('@jscad/modeling')

function getParameterDefinitions() {
  return [
    { name: 'width',  type: 'float', initial: 40, min: 5, max: 120, step: 1, caption: 'Width' },
    { name: 'depth',  type: 'float', initial: 40, min: 5, max: 120, step: 1, caption: 'Depth' },
    { name: 'height', type: 'float', initial: 20, min: 5, max: 120, step: 1, caption: 'Height' },
    { name: 'round',  type: 'float', initial: 4,  min: 0, max: 20,  step: 0.5, caption: 'Corner round' },
    { name: 'hole',   type: 'float', initial: 10, min: 0, max: 40,  step: 1, caption: 'Hole radius' },
  ]
}

function main(p) {
  const body = p.round > 0
    ? primitives.roundedCuboid({ size: [p.width, p.depth, p.height], roundRadius: p.round })
    : primitives.cuboid({ size: [p.width, p.depth, p.height] })

  if (p.hole <= 0) return body

  const drill = primitives.cylinder({ radius: p.hole, height: p.height * 2 })
  return booleans.subtract(body, drill)
}

module.exports = { main, getParameterDefinitions }
`;

export const SANDBOX_MODES: SandboxMode[] = [
  {
    id: 'js',
    label: 'JavaScript',
    blurb: 'Plain JavaScript. Output goes to the console.',
    preview: 'console',
    docsHref: null,
    starter: JS_STARTER,
  },
  {
    id: 'shplay',
    label: 'shPlay',
    blurb: 'A blank shPlay canvas to try out ideas.',
    preview: 'shplay',
    docsHref: '/docs/shplay',
    starter: SHPLAY_STARTER,
  },
  {
    id: 'jscad',
    label: 'JSCAD',
    blurb: 'Solid modelling. Drag a dimension and the model rebuilds.',
    preview: 'jscad',
    docsHref: '/docs/jscad',
    starter: JSCAD_STARTER,
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
        name: 'script.js',
        path: 'script.js',
        content: mode.starter,
      },
    ],
    steps: [],
    requirements: [],
  };
}
