// Direct comparison: what must change for the APP to read as Onshape?
//
//     node scripts/compare-onshape.mjs [model]

import { readFileSync } from 'fs';

const OUT = 'C:/Users/shuff/AppData/Local/Temp/opencode';
const model = process.argv[2] ?? 'qwen3.5:397b';

const vars = readFileSync('.dev.vars', 'utf8');
const key = vars.split('\n').find((l) => l.startsWith('OLLAMA_API_KEY='))?.slice('OLLAMA_API_KEY='.length).trim();
if (!key) { console.error('no OLLAMA_API_KEY in .dev.vars'); process.exit(1); }

const b64 = (f) => readFileSync(`${OUT}/${f}`).toString('base64');

const prompt = `Image 1 (APP) is a 3D modelling web app in Build mode. Image 2 (REFERENCE) is Onshape's
Part Studio, the CAD tool the app is modelled on.

The APP's Build mode is SUPPOSED to look like Onshape: a toolbar merged with a full-window 3D
canvas. The toolbar background is the exact same colour as the canvas and there is no border
between them, yet the toolbar still reads as a separate header row.

Give me the TOP 3 concrete, actionable visual changes that would make the APP's toolbar read as
part of the canvas (merged, Onshape-style) instead of a separate header. For each change, say
exactly what to do (e.g. "remove the X", "make the Y thinner", "move the Z"). Be specific about
what in the APP image is causing the "separate header" reading.`;

const body = {
  model,
  messages: [{ role: 'user', content: prompt, images: [b64('sandbox-build.png'), b64('onshape-ref.png')] }],
  stream: false,
  options: { temperature: 0.2 },
};

const res = await fetch('https://ollama.com/api/chat', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) { console.error(`HTTP ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
console.log(data.message?.content ?? JSON.stringify(data, null, 2));
