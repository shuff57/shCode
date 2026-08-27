// Rewrite one Q3 chapter's runnable editors in reSHape words, and PROVE each
// rewrite builds the same model.
//
//   node scripts/convert-book-chapter.mjs 8.1            # dry run, proof only
//   node scripts/convert-book-chapter.mjs 8.1 --write    # apply it
//
// WHY EVERY REWRITE IS EXECUTED RATHER THAN READ. Six of the mappings are not
// renames (see audit-book-conversion.mjs), and the two worst fail SILENTLY:
// torus -> ring inverts its parameter pair, and rotate -> turn changes the
// pivot. Both produce a plausible model that is the wrong model, and no error.
// So each editor is run twice -- once as the book prints it, once converted --
// in a real reSHape context, and the two are compared as flattened geometry.
// A rewrite that changes the picture is a FAILURE, not a diff to eyeball.
//
// The comparison mirrors what partials/js/jscad-run.js renders: every declared
// value that is geometry, in declaration order. Not the last expression, and
// not a hand-picked variable.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'node:vm';

import { createSimpleContext, modelFingerprint } from './reshape-simple-checks.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = process.env.BOOKSHELF
  || join(REPO, '..', 'bookSHelf', 'projects',
          'Introduction to Programming Concepts and Methodologies', 'html');

const CHAPTER = (process.argv[2] || '').trim();
const WRITE = process.argv.includes('--write');
if (!/^[89]\.\d$/.test(CHAPTER)) {
  console.error('usage: convert-book-chapter.mjs <8.1|8.2|...|9.2> [--write]');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// The rewrites
// ---------------------------------------------------------------------------
//
// Ordered. Each is a function so the ones that reorder arguments can do so
// explicitly rather than through a regex that happens to capture in the right
// order. `why` is printed for anything the audit flagged DECIDE, so the reason
// a judgement call was made is visible in the run and not only in a commit.

const OPT = String.raw`\{\s*([^{}]*?)\s*\}`;

/**
 * Split an options body on its TOP-LEVEL commas only.
 *
 * `size: [20, 10]` is one entry, not two. Splitting naively on every comma
 * turned `rectangle({ size: [20, 10] })` into `rect(20, undefined, { 10] })`,
 * which is a syntax error — so this failed loudly. The same bug inside a rule
 * that happened to still parse would have been a silently wrong model, which
 * is the whole reason each rewrite is executed rather than read.
 */
function entries(body) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') depth--;
    else if (c === ',' && depth === 0) { out.push(body.slice(start, i).trim()); start = i + 1; }
  }
  const last = body.slice(start).trim();
  if (last) out.push(last);
  return out.filter(Boolean);
}

const key = (body, name) => {
  for (const e of entries(body)) {
    const m = e.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
    if (m && m[1] === name) return m[2].trim();
  }
  return null;
};
const has = (body, name) => key(body, name) !== null;
const others = (body, drop) => entries(body)
  .filter((e) => !drop.some((d) => new RegExp(`^${d}\\s*:`).test(e)))
  .join(', ');
const withOpts = (rest) => (rest ? `, { ${rest} }` : '');
/** `[20, 10]` -> ['20', '10'], nesting-aware. */
const items = (arr) => entries(arr.trim().replace(/^\[|\]$/g, ''));

const RULES = [
  // --- straight renames -----------------------------------------------------
  { name: 'circle',    rx: new RegExp(`\\bcircle\\(${OPT}\\)`, 'g'),
    to: (_, b) => `disc(${key(b, 'radius')}${withOpts(others(b, ['radius']))})` },
  { name: 'sphere',    rx: new RegExp(`\\bsphere\\(${OPT}\\)`, 'g'),
    to: (_, b) => `ball(${key(b, 'radius')}${withOpts(others(b, ['radius']))})` },
  { name: 'rectangle', rx: new RegExp(`\\brectangle\\(${OPT}\\)`, 'g'),
    to: (_, b) => {
      const [w, h] = items(key(b, 'size'));
      return `rect(${w}, ${h}${withOpts(others(b, ['size']))})`;
    } },
  { name: 'cuboid',    rx: new RegExp(`\\bcuboid\\(${OPT}\\)`, 'g'),
    to: (_, b) => {
      const [w, d, h] = items(key(b, 'size'));
      return `box(${w}, ${d}, ${h}${withOpts(others(b, ['size']))})`;
    } },
  { name: 'cube',      rx: new RegExp(`\\bcube\\(${OPT}\\)`, 'g'),
    to: (_, b) => {
      const s = key(b, 'size');
      return `box(${s}, ${s}, ${s}${withOpts(others(b, ['size']))})`;
    } },
  { name: 'cylinder',  rx: new RegExp(`\\bcylinder\\(${OPT}\\)`, 'g'),
    to: (_, b) => `tube(${key(b, 'radius')}, ${key(b, 'height')}${withOpts(others(b, ['radius', 'height']))})` },
  { name: 'roundedCuboid', rx: new RegExp(`\\broundedCuboid\\(${OPT}\\)`, 'g'),
    to: (_, b) => {
      const [w, d, h] = items(key(b, 'size'));
      return `box(${w}, ${d}, ${h}${withOpts(others(b, ['size']))})`;
    } },
  { name: 'roundedRectangle', rx: new RegExp(`\\broundedRectangle\\(${OPT}\\)`, 'g'),
    to: (_, b) => {
      const [w, h] = items(key(b, 'size'));
      return `rect(${w}, ${h}${withOpts(others(b, ['size']))})`;
    } },
  { name: 'roundedCylinder', rx: new RegExp(`\\broundedCylinder\\(${OPT}\\)`, 'g'),
    to: (_, b) => `tube(${key(b, 'radius')}, ${key(b, 'height')}${withOpts(others(b, ['radius', 'height']))})` },

  // --- the judgement calls, each with its reason ----------------------------
  { name: 'polygon', decide: true,
    why: 'a straight rename minus the { points: } wrapper; neither `paths` nor '
       + '`orientation` is used in this chapter, and those have no reSHape spelling',
    rx: new RegExp(`\\bpolygon\\(${OPT}\\)`, 'g'),
    to: (m, b) => (has(b, 'points') && !has(b, 'paths') && !has(b, 'orientation')
      ? `poly(${key(b, 'points')})` : m) },

  { name: 'torus', decide: true,
    why: 'THE PAIR IS INVERTED. outerRadius is the circle the tube travels along '
       + '(ringRadius); innerRadius is the tube itself (tubeRadius). Getting this '
       + 'backwards builds a plausible wrong ring and throws nothing',
    rx: new RegExp(`\\btorus\\(${OPT}\\)`, 'g'),
    to: (m, b) => (has(b, 'innerRadius') && has(b, 'outerRadius')
      ? `ring(${key(b, 'outerRadius')}, ${key(b, 'innerRadius')})` : m) },

  { name: 'extrudeRotate', decide: true,
    why: 'revolve is a FULL turn only. Converted only where no `angle` is passed',
    rx: new RegExp(`\\bextrudeRotate\\(${OPT},\\s*([A-Za-z_$][\\w$]*)\\s*\\)`, 'g'),
    to: (m, b, shape) => (has(b, 'angle') ? m
      : `revolve(${shape}${withOpts(others(b, []))})`) },

  { name: 'extrudeLinear', decide: true,
    why: 'extrude is a STRAIGHT extrusion only. Converted only where no twistAngle '
       + '/ twistSteps is passed',
    rx: new RegExp(`\\bextrudeLinear\\(${OPT},\\s*`, 'g'),
    to: (m, b) => (has(b, 'twistAngle') || has(b, 'twistSteps') ? m
      : `extrude(${key(b, 'height')}, `) },

  { name: 'rotateZ', decide: true,
    why: 'turn pivots on the shape, rotateZ on the world origin. Converted here '
       + 'ONLY because the shape is still at the origin when it is turned, which '
       + 'makes the two identical -- and the equivalence check below proves it '
       + 'per editor rather than trusting this sentence. turn takes degrees',
    rx: /\brotateZ\(\s*Math\.PI\s*\/\s*(\d+)\s*,\s*/g,
    to: (m, d) => `turn(${180 / Number(d)}, ` },
];

/** The twelve names a converted fence can end up calling. */
const RESHAPE_NAMES = ['box', 'rect', 'disc', 'ball', 'tube', 'cone', 'ring',
  'poly', 'extrude', 'revolve', 'turn', 'sit'];

/**
 * A conversion can collide with the book's own variable names, and the book
 * had no reason to avoid them: §8.1 writes `let ring = torus(...)`, which
 * becomes `let ring = ring(12, 6)` — a let-binding shadowing the function in
 * its own initialiser, dead on arrival with a ReferenceError.
 *
 * Renaming the student's variable is a content decision, not a mechanical one:
 * the prose around the editor may well name it. So this REFUSES and says so,
 * rather than inventing a name.
 */
function shadowed(code) {
  const declared = [...code.matchAll(/(?:^|\n)\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  return RESHAPE_NAMES.filter((n) => declared.includes(n) && new RegExp(`\\b${n}\\s*\\(`).test(code));
}

function convert(code) {
  let out = code;
  const used = [];
  for (const r of RULES) {
    const before = out;
    out = out.replace(r.rx, (...a) => r.to(a[0], ...a.slice(1, -2)));
    if (out !== before) used.push(r);
  }
  return { code: out, used };
}

// ---------------------------------------------------------------------------
// Proving it builds the same model
// ---------------------------------------------------------------------------

/**
 * Run a fence the way jscad-run.js does and hand back its geometry.
 *
 * `let`/`const` become `var` so declarations land on the context global, which
 * is how the declared values are read back — the runner reaches them through
 * `with(scope)` instead, but the set of names is the same and the order is the
 * source order either way.
 */
function build(code) {
  const { ctx, window: w, jscad } = createSimpleContext();
  const names = [...code.matchAll(/(?:^|\n)\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const src = `${code.replace(/(^|\n)(\s*)(?:let|const)\s+/g, '$1$2var ')}
;globalThis.__out = [${names.map((n) => `(typeof ${n}!=="undefined"?${n}:undefined)`).join(',')}];`;
  vm.runInContext(src, ctx, { filename: 'fence' });
  const flat = [];
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v !== undefined) flat.push(v); };
  walk(ctx.__out);
  const geoms = flat
    .map((v) => (typeof w.__reshapeCurrent === 'function' ? w.__reshapeCurrent(v) : v))
    .filter((v) => jscad.geometries.geom2.isA(v) || jscad.geometries.geom3.isA(v)
      || jscad.geometries.path2.isA(v));
  return { jscad, geoms };
}

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const encodeEntities = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const { readdirSync } = await import('fs');
const file = readdirSync(BOOK).find((f) => f.startsWith(`${CHAPTER}_`) && f.endsWith('.html'));
if (!file) { console.error(`no chapter ${CHAPTER} in ${BOOK}`); process.exit(2); }
const path = join(BOOK, file);
const html = readFileSync(path, 'utf8');

const RX = /(<textarea[^>]*class="cs-input"[^>]*>)([\s\S]*?)(<\/textarea>)/g;
const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', D = '\x1b[2m', B = '\x1b[1m', X = '\x1b[0m';

let n = 0, touched = 0, proved = 0;
const failures = [];
const decisions = new Map();

const next = html.replace(RX, (whole, open, body, close) => {
  n++;
  const original = decodeEntities(body);
  const { code, used } = convert(original);
  if (code === original) return whole;
  touched++;
  for (const r of used) if (r.decide) decisions.set(r.name, r.why);

  // Refuse a rewrite that shadows the function it now calls, before running it:
  // the failure is a ReferenceError, and "x is not defined" would read as a
  // missing layer rather than as a name clash.
  const clash = shadowed(code);
  if (clash.length) {
    failures.push({ n, original, code,
      verdict: `the fence declares ${clash.join(', ')}, which is now the name of the function it calls. `
        + 'Rename the variable in the chapter first — the prose may refer to it.' });
    return whole;
  }

  // The proof. Same declared geometry, in the same order, or it does not ship.
  let verdict;
  try {
    const a = build(original);
    const b = build(code);
    const fa = modelFingerprint(a.jscad, a.geoms);
    const fb = modelFingerprint(b.jscad, b.geoms);
    verdict = fa === fb ? true : `builds a DIFFERENT model (${a.geoms.length} vs ${b.geoms.length} shapes)`;
  } catch (e) {
    verdict = `did not run: ${e.message}`;
  }
  if (verdict === true) { proved++; return open + encodeEntities(code) + close; }
  failures.push({ n, original, code, verdict });
  return whole;                                   // leave a failure untouched
});

console.log(`\n${B}${CHAPTER} — ${file}${X}`);
console.log(`  ${n} editors, ${touched} rewritten, ${G}${proved} proved identical${X}`
  + (failures.length ? `, ${R}${failures.length} FAILED${X}` : ''));

if (decisions.size) {
  console.log(`\n${Y}${B}Judgement calls applied${X}`);
  for (const [name, why] of decisions) console.log(`  ${Y}${name}${X} — ${D}${why}${X}`);
}

for (const f of failures) {
  console.log(`\n${R}FAIL editor #${f.n}${X} — ${f.verdict}`);
  console.log(`${D}  was: ${f.original.trim().split('\n').join('\n       ')}${X}`);
  console.log(`${D}  got: ${f.code.trim().split('\n').join('\n       ')}${X}`);
}

if (failures.length) {
  console.log(`\n${R}Not written.${X} Every rewrite must build the same model.\n`);
  process.exit(1);
}
if (WRITE) {
  writeFileSync(path, next, 'utf8');
  console.log(`\n${G}written${X} — ${path}\n`);
} else {
  console.log(`\n${D}dry run; pass --write to apply${X}\n`);
}
