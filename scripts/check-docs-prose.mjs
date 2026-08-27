#!/usr/bin/env node
// Gate: the prose in a reSHape doc page must not teach the real @jscad/modeling
// vocabulary while the code beside it is reSHape. Body text and code drifted
// apart when the examples were converted; this measures the gap and keeps it shut.
import { readFileSync } from 'node:fs';

const SRC = new URL('../lib/reshape-docs.ts', import.meta.url);
const text = readFileSync(SRC, 'utf8');

// reSHape replaces exactly twelve names. Those are the ones prose must not
// teach. Everything else in the app IS JSCAD's own vocabulary used bare —
// translate, union, subtract, hull, align, colorize — so a page saying
// "translate hands back a moved copy" is correct, not drift.
const REPLACED = [
  'cuboid', 'roundedCuboid', 'rectangle', 'roundedRectangle',
  'roundedCylinder', 'cylinderElliptic',
  'torus', 'polygon', 'extrudeLinear', 'extrudeRotate',
];

// Also English words. Only a call counts.
const REPLACED_SOFT = ['sphere', 'cylinder', 'circle', 'square'];

// The boilerplate reSHape does away with. A file in this app has no require
// line, no module.exports, and reaches nothing through a module object.
const BOILERPLATE = [
  'require(', 'module.exports', '@jscad/modeling', 'jscad.',
  'primitives.', 'transforms.', 'booleans.', 'extrusions.', 'measurements.',
];

// The word JSCAD is not itself drift: the Overview says plainly that reSHape
// sits on JSCAD, so prose naming the library underneath is telling the truth.
// What this gate measures is which CALLS the prose teaches — and the one place
// a real name belongs is the paragraph that names the call a reSHape name
// stands for, which is what this pattern exempts.
const NAMING = /Underneath|[Tt]he library|JSCAD version|jscad\.app/;


// Extracted pages: title + body + code, in source order.
function pages(src) {
  const out = [];
  const re = /\{\s*\n\s*title: (['"`])((?:\.|(?!\1)[\s\S])*?)\1,\s*\n\s*body: `((?:\.|[^`])*)`,(\s*\n\s*code: `((?:\.|[^`])*)`,)?/g;
  let m;
  while ((m = re.exec(src))) {
    const before = src.slice(0, m.index);
    const sl = before.lastIndexOf("slug: '");
    out.push({
      section: sl === -1 ? '?' : before.slice(sl + 7, before.indexOf("'", sl + 7)),
      title: m[2],
      body: m[3],
      code: m[5] || '',
      index: m.index,
      line: src.slice(0, m.index).split('\n').length,
    });
  }
  return out;
}

function hits(body) {
  const found = [];
  // Paragraph at a time. The one place a real name belongs in reSHape prose is
  // the paragraph that names the JSCAD call a reSHape name stands for — and
  // that paragraph usually says so once and then uses the names freely, so the
  // exemption has to cover the whole of it rather than one sentence.
  const parts = body.split(/\n\s*\n/);
  const push = (n) => { if (!found.includes(n)) found.push(n); };
  for (const part of parts) {
    if (NAMING.test(part)) continue;
    for (const name of REPLACED) if (part.includes(name)) push(name);
    for (const name of BOILERPLATE) {
      // jscad.app is a website, not a namespace.
      if (name === 'jscad.' && !part.replace(/jscad\.app/g, '').includes('jscad.')) continue;
      if (part.includes(name)) push(name);
    }
    for (const name of REPLACED_SOFT) {
      let at = part.indexOf(name + '(');
      while (at !== -1) {
        const before = at === 0 ? ' ' : part[at - 1];
        if (!/[A-Za-z0-9_]/.test(before)) { push(name + '()'); break; }
        at = part.indexOf(name + '(', at + 1);
      }
    }
  }
  return found;
}

// 'beyond' documents the seventeen exports the course deliberately does NOT
// teach — minkowski, the extra measurements, the colour conversions. reSHape
// has no name for any of them, so their own names are the only ones there are.
const NOT_TAUGHT = 'beyond';

const RESHAPE_NAMES = [
  'box', 'rect', 'disc', 'ball', 'tube', 'cone', 'ring', 'poly',
  'extrude', 'revolve', 'turn', 'sit',
];

/**
 * A comment is prose that happens to sit inside the code block, so it drifts
 * the same way and matters as much — it is the line a student reads while
 * looking at the call it describes.
 */
function commentHits(code) {
  const lines = [];
  for (const ln of code.split('\n')) {
    const at = ln.indexOf('//');
    if (at !== -1) lines.push(ln.slice(at + 2));
  }
  return lines.length ? hits(lines.join('\n\n')) : [];
}

/**
 * `const box = measureBoundingBox(pin)` shadows the primitive for the rest of
 * the function. It runs, so no test catches it, and it teaches a student that
 * the name is theirs to take.
 */
function shadows(code) {
  const found = [];
  for (const name of RESHAPE_NAMES) {
    for (const kw of ['const ', 'let ', 'var ', 'function ']) {
      if (code.includes(kw + name + ' ') || code.includes(kw + name + '(')) {
        if (!found.includes(name)) found.push(name);
      }
    }
  }
  return found;
}

const all = pages(text);
const bad = [];
for (const p of all) {
  if (p.section === NOT_TAUGHT) continue;
  const h = [
    ...hits(p.body),
    ...commentHits(p.code).map((x) => `//${x}`),
    ...shadows(p.code).map((x) => `shadows:${x}`),
  ];
  if (h.length) bad.push({ ...p, hits: h });
}

const arg = process.argv[2];
if (arg === '--list') {
  for (const p of bad) {
    console.log(`${p.section}	${p.line}	${p.title}	${[...new Set(p.hits)].join(' ')}`);
  }
}

console.log(`docs prose: ${all.length} pages, ${bad.length} still teaching the real API`);
if (bad.length) {
  if (arg !== '--list') console.log('  run with --list to see which');
  process.exit(1);
}
