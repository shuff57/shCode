// Rewrite the in-app docs at /docs/reshape in reSHape words, and PROVE each
// example still builds what it built.
//
//   node scripts/convert-docs-to-reshape.mjs          # dry run
//   node scripts/convert-docs-to-reshape.mjs --write
//
// lib/reshape-docs.ts documents the whole @jscad/modeling surface the course
// uses -- 94 exports across 19 sections -- and it kept the require() /
// module-qualified form ON PURPOSE, because the DOCS gate required every
// example to run unchanged on jscad.app. That contract was written while the
// book taught the real API. It no longer does, so the examples move to the
// vocabulary the course actually teaches:
//
//     const { primitives } = require('@jscad/modeling')     before
//     function main() {
//       return primitives.cuboid({ size: [40, 20, 10] })
//     }
//
//     function main() {                                     after
//       return box(40, 20, 10)
//     }
//
// The REFERENCE still covers all 94 exports. Only the spelling changes, and
// only where reSHape has a word for it -- translate, subtract, hull, colorize
// and the rest stay exactly as they are, because they are bare real names in
// this runner and always were.
//
// EVERY REWRITE IS EXECUTED. The original runs in the jscad.app-equivalent
// context it was written for, the rewrite runs in the shCode runner, and the
// two are compared as flattened geometry. An example that changes shape is a
// failure, not a diff to read.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'node:vm';

import { createSimpleContext, modelFingerprint } from './reshape-simple-checks.mjs';
import { createRequireOnlyContext, loadModeling, captureConsole } from './reshape-harness.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(REPO, 'lib', 'reshape-docs.ts');
const WRITE = process.argv.includes('--write');

// The fifteen module names the bundle exposes. A qualified call through any of
// them is the same function as the bare name the runner installs, so dropping
// the prefix changes nothing but the reading.
const MODULES = ['primitives', 'transforms', 'booleans', 'extrusions', 'hulls',
  'expansions', 'measurements', 'colors', 'text', 'maths', 'utils', 'geometries',
  'curves', 'modifiers', 'connectors'];

const OPT = String.raw`\{\s*([^{}]*?)\s*\}`;

function entries(body) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
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
  .filter((e) => !drop.some((d) => new RegExp(`^${d}\\s*:`).test(e))).join(', ');
const withOpts = (r) => (r ? `, { ${r} }` : '');
const items = (arr) => entries(String(arr).trim().replace(/^\[|\]$/g, ''));

// Only the constructors reSHape actually has a word for. Everything else keeps
// its real name, bare.
const RULES = [
  [`\\bcircle\\(${OPT}\\)`, (_, b) => `disc(${key(b, 'radius')}${withOpts(others(b, ['radius']))})`],
  [`\\bsphere\\(${OPT}\\)`, (_, b) => `ball(${key(b, 'radius')}${withOpts(others(b, ['radius']))})`],
  [`\\brectangle\\(${OPT}\\)`, (_, b) => {
    const [w, h] = items(key(b, 'size')); return `rect(${w}, ${h}${withOpts(others(b, ['size']))})`; }],
  [`\\bcuboid\\(${OPT}\\)`, (_, b) => {
    const [w, d, h] = items(key(b, 'size')); return `box(${w}, ${d}, ${h}${withOpts(others(b, ['size']))})`; }],
  [`\\broundedCuboid\\(${OPT}\\)`, (_, b) => {
    const [w, d, h] = items(key(b, 'size')); return `box(${w}, ${d}, ${h}${withOpts(others(b, ['size']))})`; }],
  [`\\broundedRectangle\\(${OPT}\\)`, (_, b) => {
    const [w, h] = items(key(b, 'size')); return `rect(${w}, ${h}${withOpts(others(b, ['size']))})`; }],
  [`\\bcube\\(${OPT}\\)`, (_, b) => {
    const s = key(b, 'size'); return `box(${s}, ${s}, ${s}${withOpts(others(b, ['size']))})`; }],
  [`\\bcylinder\\(${OPT}\\)`, (_, b) =>
    `tube(${key(b, 'radius')}, ${key(b, 'height')}${withOpts(others(b, ['radius', 'height']))})`],
  [`\\broundedCylinder\\(${OPT}\\)`, (_, b) =>
    `tube(${key(b, 'radius')}, ${key(b, 'height')}${withOpts(others(b, ['radius', 'height']))})`],
  // torus's pair is INVERTED -- outerRadius is the ring, innerRadius the tube.
  [`\\btorus\\(${OPT}\\)`, (m, b) => (has(b, 'innerRadius') && has(b, 'outerRadius')
    ? `ring(${key(b, 'outerRadius')}, ${key(b, 'innerRadius')})` : m)],
  // Straight extrusions and full revolutions only; anything with a twist or a
  // partial angle has no reSHape spelling and keeps the real call.
  [`\\bextrudeLinear\\(${OPT},\\s*`, (m, b) => (has(b, 'twistAngle') || has(b, 'twistSteps')
    ? m : `extrude(${key(b, 'height')}, `)],
  [`\\bextrudeRotate\\(${OPT},\\s*`, (m, b) => (has(b, 'angle') || has(b, 'startAngle')
    ? m : `revolve(`)],
];

/**
 * A variable that collides with the reSHape name its own initialiser now calls
 * takes the name of the primitive it used to call — the same rule the book
 * conversion uses. `const ball = sphere(...)` becomes `const sphere = ball(...)`,
 * so the real vocabulary survives as a noun. Without this the rewrite produces
 * a binding that shadows the function in its own initialiser and dies with
 * "Cannot access 'ball' before initialization".
 */
const FROM_RESHAPE = {
  box: 'cuboid', rect: 'rectangle', disc: 'circle', ball: 'sphere',
  tube: 'cylinder', ring: 'torus', poly: 'polygon', cone: 'cone_',
  extrude: 'extruded', revolve: 'revolved', turn: 'turned', sit: 'seated',
};

function renameCollisions(code) {
  let out = code;
  for (const [name, to] of Object.entries(FROM_RESHAPE)) {
    const declares = new RegExp(`(^|\\n)\\s*(?:let|const|var)\\s+${name}\\b`);
    if (!declares.test(out)) continue;
    if (!new RegExp(`\\b${name}\\s*\\(`).test(out)) continue;
    if (new RegExp(`\\b${to}\\b`).test(out)) continue;   // the new name is taken too
    out = out.replace(new RegExp(`(?<![.\\w$])${name}\\b(?!\\s*\\()`, 'g'), to);
  }
  return out;
}

function convert(code) {
  let out = code;
  // 1. The require header, in either spelling, and any line left empty by it.
  out = out.replace(/^\s*const\s+\{[^}]*\}\s*=\s*require\('@jscad\/modeling'\)\s*\n/gm, '');
  out = out.replace(/^\s*const\s+\w+\s*=\s*require\('@jscad\/modeling'\)\s*\n/gm, '');
  // 1b. ...and the alias lines that hang off it. Several examples destructure
  //     in two steps -- `const jscad = require(...)` then `const primitives =
  //     jscad.primitives` -- and dropping only the first leaves the second
  //     reaching for a name that is gone.
  out = out.replace(
    new RegExp(`^\\s*const\\s+\\w+\\s*=\\s*jscad\\.(?:${MODULES.join('|')})\\s*\n`, 'gm'), '');
  // 2. Module prefixes. `jscad.primitives.cuboid(` and `primitives.cuboid(`
  //    are the same function as the bare name the runner installs.
  out = out.replace(new RegExp(`\\bjscad\\.(${MODULES.join('|')})\\.`, 'g'), '');
  out = out.replace(new RegExp(`\\b(${MODULES.join('|')})\\.`, 'g'), '');
  // 3. reSHape spellings.
  for (const [rx, to] of RULES) out = out.replace(new RegExp(rx, 'g'), (...a) => to(a[0], ...a.slice(1, -2)));
  // 4. module.exports is jscad.app plumbing; the runner finds main() without it.
  out = out.replace(/^\s*module\.exports\s*=\s*\{[^}]*\}\s*;?\s*$/gm, '');
  // 5. Last, because a collision only exists once the function has taken the
  //    variable's name.
  out = renameCollisions(out);
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd();
}

/** Run a program and hand back whatever main() built, flattened. */
function build(ctx, code) {
  vm.runInContext(`${code}\n;globalThis.__out = (typeof main === 'function') ? main() : undefined;`,
    ctx, { filename: 'example' });
  const flat = [];
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v !== undefined) flat.push(v); };
  walk(ctx.__out);
  return flat;
}

// One bundle, used to fingerprint BOTH sides. The require-only context deletes
// globalThis.jscadModeling on purpose -- on jscad.app the library is reachable
// through require() and nothing else -- so it cannot supply its own. isA is
// duck-typed, so geometry from either context measures fine against this one.
const { jscad: REF } = loadModeling();

const src = readFileSync(DOCS, 'utf8');
const G = '\x1b[32m', R = '\x1b[31m', D = '\x1b[2m', B = '\x1b[1m', X = '\x1b[0m';

let n = 0, touched = 0, proved = 0, skipped = 0;
const failures = [];

const next = src.replace(/(\bcode: `)([\s\S]*?)(`)/g, (whole, open, body, close) => {
  n++;
  const original = body.replace(/\\`/g, '`').replace(/\\\$/g, '$');
  const code = convert(original);
  if (code === original.trimEnd()) return whole;

  let before;
  try {
    const ctx = createRequireOnlyContext(captureConsole().console);
    before = build(ctx, original);
    var fa = modelFingerprint(REF, before);
  } catch (e) {
    skipped++;                       // never ran portably either; nothing to compare
    return whole;
  }
  let fb;
  try {
    const sc = createSimpleContext({ consoleImpl: captureConsole().console });
    fb = modelFingerprint(REF, build(sc.ctx, code));
  } catch (e) {
    failures.push({ n, original, code, why: `the rewrite does not run: ${e.message}` });
    return whole;
  }
  if (fa !== fb) {
    failures.push({ n, original, code, why: 'builds a DIFFERENT model' });
    return whole;
  }
  touched++; proved++;
  return open + code.replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + close;
});

console.log(`\n${B}/docs/reshape — lib/reshape-docs.ts${X}`);
console.log(`  ${n} examples, ${touched} rewritten, ${G}${proved} proved identical${X}`
  + `, ${D}${skipped} not runnable to compare${X}`
  + (failures.length ? `, ${R}${failures.length} FAILED${X}` : ''));

const byReason = new Map();
for (const f of failures) {
  const k = f.why.replace(/'[^']*'/g, "'X'").slice(0, 90);
  byReason.set(k, (byReason.get(k) || 0) + 1);
}
if (byReason.size) {
  console.log(`\n${R}${B}Failures by cause${X}`);
  for (const [k, c] of [...byReason].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padStart(4)}  ${k}`);
  }
}

for (const f of failures.slice(0, 3)) {
  console.log(`\n${R}FAIL example #${f.n}${X} — ${f.why}`);
  console.log(`${D}  was: ${f.original.trim().split('\n').slice(0, 6).join('\n       ')}${X}`);
  console.log(`${D}  got: ${f.code.trim().split('\n').slice(0, 6).join('\n       ')}${X}`);
}
if (failures.length > 8) console.log(`${D}  ...and ${failures.length - 8} more${X}`);

// Each example is independent and each rewrite is proved on its own, so a
// failure elsewhere is no reason to hold back the ones that passed. Failures
// are left EXACTLY as they were — never half-converted — and reported.
if (WRITE) {
  writeFileSync(DOCS, next, 'utf8');
  console.log(`\n${G}written${X} — ${proved} rewritten, ${failures.length} left as they were\n`);
} else {
  console.log(`\n${D}dry run; pass --write to apply${X}\n`);
}
// Non-zero while anything is still unconverted, so this stays visible.
process.exit(failures.length ? 1 : 0);
