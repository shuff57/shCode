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

/** Which mode the sandbox opens on (SandboxWorkspace reads it at load; Remix sets it). */
export const SANDBOX_MODE_KEY = 'shCode:sandbox-mode';

/**
 * A click on a mode button before React has taken over the page did nothing:
 * the toolbar is in the page's HTML from the start, but its buttons have no
 * handler until the scripts have loaded and hydrated (seconds on a slow
 * school laptop). This inline script, in that same HTML, runs at once and
 * listens for such a click: it keeps the mode where the page reads it as it
 * starts (SANDBOX_MODE_KEY in localStorage, and window.__shcodeSandboxPick for
 * a browser that refuses storage), and marks <html data-sandbox-pick> so the
 * button looks pressed straight away. Once the page has started
 * (window.__shcodeSandboxReady) it does nothing. Rendered by SandboxWorkspace
 * only in the server's HTML; scripts/test-sandbox-early-pick.mjs runs it.
 */
export const SANDBOX_EARLY_PICK_SCRIPT = `(function(){try{var w=window;if(w.__shcodeSandboxPick)return;w.__shcodeSandboxPick={};`
  + `var ok=${JSON.stringify(SANDBOX_MODES.map((m) => m.id))};`
  + `document.addEventListener('click',function(e){if(w.__shcodeSandboxReady)return;`
  + `var t=e.target&&e.target.closest?e.target.closest('[data-sandbox-mode]'):null;if(!t||t.disabled)return;`
  + `var m=t.getAttribute('data-sandbox-mode');if(ok.indexOf(m)<0)return;w.__shcodeSandboxPick.mode=m;`
  + `try{localStorage.setItem(${JSON.stringify(SANDBOX_MODE_KEY)},m)}catch(_){}`
  + `document.documentElement.setAttribute('data-sandbox-pick',m)},true)}catch(_){}})();`;

/** The mode an early click picked (see SANDBOX_EARLY_PICK_SCRIPT), and from now on the page handles clicks itself. */
export function takeEarlyPick(w: { __shcodeSandboxPick?: { mode?: string }; __shcodeSandboxReady?: boolean }): SandboxModeId | null {
  w.__shcodeSandboxReady = true;
  const m = w.__shcodeSandboxPick?.mode;
  return SANDBOX_MODES.some((x) => x.id === m) ? (m as SandboxModeId) : null;
}
