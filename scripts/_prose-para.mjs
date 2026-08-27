import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const src = readFileSync(new URL('../lib/reshape-docs.ts', import.meta.url), 'utf8');
const want = new Set(process.argv.slice(2));
let listing = '';
try { listing = execSync('node scripts/check-docs-prose.mjs --list', { encoding: 'utf8' }); }
catch (e) { listing = e.stdout || ''; }
const flagged = new Map();
for (const ln of listing.split('\n')) {
  const [sec, , title, hits] = ln.split('\t');
  if (hits && want.has(sec)) flagged.set(title, hits.split(' '));
}
const re = /\{\s*\n\s*title: (['"])((?:\.|(?!\1)[\s\S])*?)\1,\s*\n\s*body: `((?:\.|[^`])*)`,/g;
let m;
while ((m = re.exec(src))) {
  const hits = flagged.get(m[2]);
  if (!hits) continue;
  console.log(`\n########## ${m[2]}   [${hits.join(' ')}]`);
  for (const para of m[3].split(/\n\s*\n/)) {
    if (hits.some((h) => para.includes(h.replace('()', '(')))) console.log('\n' + para);
  }
}
