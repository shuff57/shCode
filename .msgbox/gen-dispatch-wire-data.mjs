// Regenerates dispatch-wire-data.js from log.jsonl + events.jsonl so dispatch-wire.html
// (a plain local file, opened via file://) has something to read. The page has no fetch/server
// access, so this is the sync step: run it, the already-open page picks it up on its next
// 5s auto-refresh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const readJsonl = (p) => fs.existsSync(p)
  ? fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => ({ ...JSON.parse(l), src: path.basename(p, '.jsonl') }))
  : [];

const all = [...readJsonl(path.join(dir, 'log.jsonl')), ...readJsonl(path.join(dir, 'events.jsonl'))]
  .sort((a, b) => new Date(a.ts) - new Date(b.ts));

fs.writeFileSync(path.join(dir, 'dispatch-wire-data.js'), 'window.SEED = ' + JSON.stringify(all) + ';\n');
console.log(`dispatch-wire-data.js: ${all.length} entries`);
