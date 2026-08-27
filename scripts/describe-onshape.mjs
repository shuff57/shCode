// Describe the Onshape Part Studio reference screenshot in detail, so the
// app's Build mode can be matched to it.
//
//     node scripts/describe-onshape.mjs [model]

import { readFileSync } from 'fs';

const OUT = 'C:/Users/shuff/AppData/Local/Temp/opencode';
const model = process.argv[2] ?? 'qwen3.5:397b';

const vars = readFileSync('.dev.vars', 'utf8');
const key = vars.split('\n').find((l) => l.startsWith('OLLAMA_API_KEY='))?.slice('OLLAMA_API_KEY='.length).trim();
if (!key) { console.error('no OLLAMA_API_KEY in .dev.vars'); process.exit(1); }

const b64 = readFileSync(`${OUT}/onshape-ref.png`).toString('base64');

const prompt = `This is a screenshot of Onshape's Part Studio, a professional CAD tool.
Describe its layout in precise visual terms, as if instructing someone to reproduce it:

1. Where exactly is the main toolbar strip (the one with modelling tools)? Is it flush with the
   top edge of the window, or inset? Does the 3D canvas extend behind it, or does the canvas start
   below it?
2. What is on the left side of the window, and what is on the right side?
3. Does the 3D canvas fill the whole window behind the panels, or is it a bordered box in the middle?
4. What does the toolbar look like: solid background, translucent, bordered, shadowed? How tall is
   it relative to the window?
5. Describe the overall colour scheme and how the toolbar visually relates to the canvas (same
   background, different, etc.).
Be concrete and visual.`;

const body = {
  model,
  messages: [{ role: 'user', content: prompt, images: [b64] }],
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
