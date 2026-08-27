// Blind visual parity check: sandbox Build mode vs the Onshape Part Studio
// reference screenshot, judged by a vision-capable model.
//
//     node scripts/visual-parity-check.mjs [model]
//
// Reads OLLAMA_API_KEY from .dev.vars. Images:
//   C:/Users/shuff/AppData/Local/Temp/opencode/sandbox-build.png
//   C:/Users/shuff/AppData/Local/Temp/opencode/onshape-ref.png

import { readFileSync } from 'fs';

const OUT = 'C:/Users/shuff/AppData/Local/Temp/opencode';
const model = process.argv[2] ?? 'gemma4:31b';

const vars = readFileSync('.dev.vars', 'utf8');
const key = vars.split('\n').find((l) => l.startsWith('OLLAMA_API_KEY='))?.slice('OLLAMA_API_KEY='.length).trim();
if (!key) { console.error('no OLLAMA_API_KEY in .dev.vars'); process.exit(1); }

const b64 = (f) => readFileSync(`${OUT}/${f}`).toString('base64');

const prompt = `You are judging a UI against a reference screenshot, blind.

Image 1 (APP) is a web app called shCode in "Build" mode for a 3D solid-modelling sandbox.
Image 2 (REFERENCE) is Onshape's Part Studio, the CAD tool the app is deliberately modelled on.

The app's Build mode was just changed so the toolbar and the 3D preview are merged into ONE space:
the toolbar should float as a translucent bar over the top-left of the 3D canvas, the canvas should
fill the whole window, a shape-tools card should float on the left edge below the toolbar, and a
Dimensions panel should sit on the right edge.

Answer these questions precisely:

1. LAYOUT: In the APP image, does the toolbar appear to float ON TOP of the 3D canvas (one merged
   space), or does it sit in its own separate row above the canvas? Describe what you actually see.
2. OVERLAP: Does the floating toolbar cover or clip the 3D model, the shape-tools card, or the
   Dimensions panel? Is anything visually cut off or colliding?
3. ONSHAPE PARITY: Onshape's Part Studio has a tool bar across the top of the canvas, a feature
   list on the left, and a panel on the right. How close is the APP's arrangement to that?
   Name the biggest visual difference.
4. CHROME: In the APP, is the toolbar readable (buttons visible, not transparent to the point of
   vanishing)? Does it look like a deliberate overlay or like a bug?
5. VERDICT: One sentence — does the APP look like a CAD tool with a toolbar over a full-window
   canvas, or does it look broken?

Be concrete and honest. If the toolbar is NOT floating over the canvas, say so plainly.`;

const body = {
  model,
  messages: [{ role: 'user', content: prompt, images: [b64('sandbox-build.png'), b64('onshape-ref.png')] }],
  stream: false,
  options: { temperature: 0.2 },
};

const t0 = Date.now();
const res = await fetch('https://ollama.com/api/chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
console.log(`\n=== ${model} (${((Date.now() - t0) / 1000).toFixed(1)}s) ===\n`);
console.log(data.message?.content ?? JSON.stringify(data, null, 2));
