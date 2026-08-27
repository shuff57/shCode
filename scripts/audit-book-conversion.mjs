// What it costs to rewrite the seven Q3 book chapters in reSHape words.
//
//   node scripts/audit-book-conversion.mjs            # summary
//   node scripts/audit-book-conversion.mjs --chapter 8.1 --verbose
//
// The book's 209 runnable editors are written in the real @jscad/modeling API.
// Teaching reSHape instead means rewriting the calls that HAVE a reSHape
// spelling and leaving the ones that do not. This reports which is which, and
// -- the part that matters -- which calls cannot be decided by a script.
//
// IT DOES NOT EDIT ANYTHING. A conversion that guesses is worse than no
// conversion, because six of the mappings are not renames:
//
//   rotate/rotateZ -> turn   CHANGES THE PIVOT. World origin vs the shape's own
//                            middle. An off-centre shape orbits under one and
//                            stays put under the other, and nothing throws. The
//                            picture silently becomes a different picture.
//   torus -> ring            The parameter pair is INVERTED, and neither of
//                            torus's names means what it says.
//   align -> sit             Only for modes ['none','none','min'].
//   extrudeLinear -> extrude Straight extrusions only; twistAngle has no
//                            reSHape spelling.
//   extrudeRotate -> revolve Full turns only; a half turn has no spelling.
//   cylinderElliptic -> cone Only when it really is a cone.
//
// So every call lands in one of three buckets -- CONVERT, KEEP, DECIDE -- and
// the third is the deliverable. The mapping is not restated here: it is read
// out of reference.md's "Reading the book" table at run time, so this cannot
// drift from what the layer documents.

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = process.env.BOOKSHELF
  || join(REPO, '..', 'bookSHelf', 'projects',
          'Introduction to Programming Concepts and Methodologies', 'html');
const REFERENCE = join(REPO, 'public', 'reshape', 'docs', 'reference.md');

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const ONLY = (argv[argv.indexOf('--chapter') + 1] || '').trim();

if (!existsSync(BOOK)) {
  console.error(`No book at ${BOOK}\nSet BOOKSHELF to the html/ directory.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The mapping, read from reference.md rather than restated
// ---------------------------------------------------------------------------

/** Rows of the "Reading the book" table: real name -> the cell describing it. */
function readMapping() {
  const lines = readFileSync(REFERENCE, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf('#### Reading the book');
  if (start === -1) throw new Error('reference.md has no "#### Reading the book" heading');
  const rows = new Map();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) break;
    if (!line.startsWith('|') || /^\|[\s|:-]+\|$/.test(line)) continue;
    const cells = line.slice(1, -1).split('|').map((c) => c.trim());
    if (cells.length !== 2) continue;
    // A left cell can name several: "`rotateZ` / `rotateX` / `rotateY`".
    const names = [...cells[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const word = (cells[1].match(/`([^`]+)`/) || [])[1];
    for (const n of names) rows.set(n, { word, note: cells[1] });
  }
  return rows;
}

// A row whose right cell carries one of these is not a mechanical rename. The
// words are matched against reference.md's own prose, so rewording a warning
// there is what moves a call between buckets -- not an edit here.
const DECIDE_MARKERS = [
  /own middle/i, /world origin/i, /inverted/i, /only when/i, /and only when/i,
  /straight extrusion only/i, /a full turn only/i, /but \*\*only when/i,
  /type the book's own call/i, /read the warning/i,
];

// ---------------------------------------------------------------------------
// Reading the chapters
// ---------------------------------------------------------------------------

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

/** Runnable editors, in document order. */
function editors(html) {
  return [...html.matchAll(/<textarea[^>]*class="cs-input"[^>]*>([\s\S]*?)<\/textarea>/g)]
    .map((m) => decodeEntities(m[1]));
}

/**
 * Comments and string literals removed, so a name mentioned in prose inside a
 * comment is not counted as a call. Deliberately crude: this is a census, and
 * anything it gets wrong shows up as a name nobody recognises rather than as a
 * silent miscount.
 */
function stripped(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

// A bare `name(` that is not a member call and not a JS keyword.
const PLUMBING = new Set([
  'require', 'main', 'module', 'exports', 'function', 'if', 'for', 'while',
  'switch', 'catch', 'return', 'typeof', 'new', 'Math', 'Array', 'Object',
  'Number', 'String', 'JSON', 'console', 'parseInt', 'parseFloat', 'map',
  'filter', 'forEach', 'push', 'slice', 'concat', 'join', 'reduce', 'from',
  'keys', 'values', 'entries', 'toFixed', 'round', 'floor', 'ceil', 'abs',
  'min', 'max', 'sqrt', 'pow', 'sin', 'cos', 'tan', 'PI', 'length', 'of',
]);

function calls(code) {
  const found = [];
  for (const m of stripped(code).matchAll(/(\.)?\b([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (m[1]) continue;                       // a member call, not a bare name
    if (PLUMBING.has(m[2])) continue;
    found.push(m[2]);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Classify
// ---------------------------------------------------------------------------

const mapping = readMapping();
const CHAPTERS = readdirSync(BOOK)
  .filter((f) => /^[89]\.\d.*\.html$/.test(f))
  .sort();

const buckets = { convert: new Map(), keep: new Map(), decide: new Map() };
const perChapter = [];
let totalCalls = 0;
let totalEditors = 0;

for (const file of CHAPTERS) {
  const id = file.match(/^([89]\.\d)/)[1];
  if (ONLY && ONLY !== id) continue;
  const html = readFileSync(join(BOOK, file), 'utf8');
  const cells = editors(html);
  const row = { id, editors: cells.length, convert: 0, keep: 0, decide: 0, calls: 0 };

  cells.forEach((code, i) => {
    for (const name of calls(code)) {
      row.calls++; totalCalls++;
      const hit = mapping.get(name);
      let bucket;
      if (!hit) bucket = 'keep';
      else if (DECIDE_MARKERS.some((rx) => rx.test(hit.note))) bucket = 'decide';
      else bucket = 'convert';
      row[bucket]++;
      const key = name;
      if (!buckets[bucket].has(key)) buckets[bucket].set(key, { n: 0, word: hit?.word, where: [] });
      const e = buckets[bucket].get(key);
      e.n++;
      if (e.where.length < 6) e.where.push(`${id}#${i + 1}`);
    }
  });
  totalEditors += cells.length;
  perChapter.push(row);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const B = '\x1b[1m', D = '\x1b[2m', G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', X = '\x1b[0m';
const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log(`\n${B}Rewriting the Q3 chapters in reSHape words${X}`);
console.log(`${D}mapping read from ${'public/reshape/docs/reference.md'} — "Reading the book"${X}\n`);

console.log(`  ${pad('chapter', 8)} ${num('editors', 8)} ${num('calls', 7)} ${num('convert', 9)} ${num('keep', 6)} ${num('decide', 8)}`);
for (const r of perChapter) {
  console.log(`  ${pad(r.id, 8)} ${num(r.editors, 8)} ${num(r.calls, 7)} ${num(r.convert, 9)} ${num(r.keep, 6)} ${num(r.decide, 8)}`);
}
const tot = (k) => perChapter.reduce((s, r) => s + r[k], 0);
console.log(`  ${pad('TOTAL', 8)} ${num(totalEditors, 8)} ${num(totalCalls, 7)} ${num(tot('convert'), 9)} ${num(tot('keep'), 6)} ${num(tot('decide'), 8)}\n`);

const show = (title, colour, bucket, blurb) => {
  const rows = [...bucket.entries()].sort((a, b) => b[1].n - a[1].n);
  if (!rows.length) return;
  console.log(`${colour}${B}${title}${X}  ${D}${blurb}${X}`);
  for (const [name, e] of rows) {
    const to = e.word ? ` -> ${e.word}` : '';
    console.log(`  ${num(e.n, 4)}  ${pad(name + to, 44)}${VERBOSE ? D + e.where.join(' ') + X : ''}`);
  }
  console.log('');
};

show('CONVERT', G, buckets.convert, 'a rename, mechanical');
show('DECIDE', Y, buckets.decide, 'reference.md marks these NOT a plain rename — read each one');
show('KEEP', D, buckets.keep, 'no reSHape spelling; the book keeps typing these');

const decide = tot('decide');
console.log(`${B}The deliverable${X}`);
console.log(`  ${G}${tot('convert')}${X} calls a script could safely rewrite.`);
console.log(`  ${Y}${decide}${X} calls need a human, because reference.md marks the mapping unsafe.`);
console.log(`  ${D}${tot('keep')}${X} calls stay exactly as the book prints them.\n`);
