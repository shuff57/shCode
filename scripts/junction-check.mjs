// Focused junction check: is the toolbar visually merged with the canvas?
//
//     node scripts/junction-check.mjs [model]

import { readFileSync } from 'fs';

const OUT = 'C:/Users/shuff/AppData/Local/Temp/opencode';
const model = process.argv[2] ?? 'qwen3.5:397b';

const vars = readFileSync('.dev.vars', 'utf8');
const key = vars.split('\n').find((l) => l.startsWith('OLLAMA_API_KEY='))?.slice('OLLAMA_API_KEY='.length).trim();
if (!key) { console.error('no OLLAMA_API_KEY in .dev.vars'); process.exit(1); }

const b64 = readFileSync(`${OUT}/sandbox-top.png`).toString('base64');

const prompt = `This is a crop of the top of a 3D modelling web app in Build mode. The crop shows the
toolbar strip and the top of the 3D canvas below it.

Answer precisely:

1. Is there a visible horizontal seam, border, or colour change between the toolbar strip and the
   canvas below it? Or do they read as one continuous surface?
2. What colour is the toolbar background, and what colour is the canvas background just below it?
3. Does the toolbar look like it is floating ON the canvas (one merged space), or like a separate
   header bar sitting above a different surface?
4. One sentence verdict.`;

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
