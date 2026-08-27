// Replace one section's pages array in lib/reshape-docs.ts.
//   node scripts/_splice-section.mjs <slug> <nextSlug> <file>
import { readFileSync, writeFileSync } from 'node:fs';
const DOC = new URL('../lib/reshape-docs.ts', import.meta.url);
const [slug, next, file] = process.argv.slice(2);
let s = readFileSync(DOC, 'utf8');
// Normalise line endings on the way in. A CRLF copy of this file makes every
// LF-written patch string miss, silently and by exactly one character a line.
s = s.replace(/\r\n/g, '\n');
const i = s.indexOf(`slug: '${slug}'`);
const j = s.indexOf(`slug: '${next}'`);
if (i === -1 || j === -1 || j < i) { console.error('bad slugs'); process.exit(1); }
const ps = s.indexOf('pages: [', i) + 'pages: [\n'.length;
// Sections are not uniformly indented, so find the last "]," line closing the
// pages array rather than matching a fixed indent.
let pe = -1;
for (const m of s.slice(ps, j).matchAll(/\n[ \t]*\],\n/g)) pe = ps + m.index + 1;
if (pe < ps) { console.error('no page-array end found'); process.exit(1); }
writeFileSync(DOC, s.slice(0, ps) + readFileSync(file, 'utf8') + s.slice(pe));
console.log(`spliced ${slug}`);
