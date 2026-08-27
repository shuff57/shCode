// Apply prose rewrites to lib/reshape-docs.ts. Input: a JSON array of
// { title, from, to } — `from` must appear exactly once in that page's body.
import { readFileSync, writeFileSync } from 'node:fs';
const DOC = new URL('../lib/reshape-docs.ts', import.meta.url);
const patch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let src = readFileSync(DOC, 'utf8');
// Normalise line endings on the way in. A CRLF copy of this file makes every
// LF-written patch string miss, silently and by exactly one character a line.
src = src.replace(/\r\n/g, '\n');
let n = 0;
for (const { title, from, to } of patch) {
  const t = src.indexOf(`title: '${title}'`) !== -1
    ? src.indexOf(`title: '${title}'`)
    : src.indexOf(`title: "${title}"`);
  if (t === -1) { console.error(`NO PAGE: ${title}`); process.exit(1); }
  const bs = src.indexOf('body: `', t) + 7;
  const be = src.indexOf('`,', bs);
  const body = src.slice(bs, be);
  const c = body.split(from).length - 1;
  if (c !== 1) { console.error(`${c} matches for "${from.slice(0, 60)}" in ${title}`); process.exit(1); }
  src = src.slice(0, bs) + body.replace(from, to) + src.slice(be);
  n++;
}
writeFileSync(DOC, src);
console.log(`applied ${n}`);
