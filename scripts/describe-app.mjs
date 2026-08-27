// Describe the current app screenshot in precise visual terms.
//
//     node scripts/describe-app.mjs [model]

import { readFileSync } from 'fs';

const OUT = 'C:/Users/shuff/AppData/Local/Temp/opencode';
const model = process.argv[2] ?? 'qwen3.5:397b';

const vars = readFileSync('.dev.vars', 'utf8');
const key = vars.split('\n').find((l) => l.startsWith('OLLAMA_API_KEY='))?.slice('OLLAMA_API_KEY='.length).trim();
if (!key) { console.error('no OLLAMA_API_KEY in .dev.vars'); process.exit(1); }

const b64 = readFileSync(`${OUT}/sandbox-build.png`).toString('base64');

const prompt = `This is a screenshot of a 3D modelling web app in Build mode. Describe it in precise
visual terms:

1. List every horizontal band you can see, top to bottom, with its approximate height and colour.
   For each band say whether it looks like a separate UI bar or part of the same surface as the
   one below it.
2. Where does the 3D canvas start (which band), and what colour is it?
3. Is there any visible seam, border, or colour change between the topmost band and the canvas?
4. What text labels are visible in the top band?
5. Describe the left panel and the right panel: what do they contain, what colour are they, and
   do they look like separate cards or part of the same surface as the canvas?
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
