#!/usr/bin/env node
// shplay-parity-report.mjs — how much of q5play's surface does shPlay actually have?
//
// The course half of the bar is measured by running code (test-shplay.mjs).
// This is the other half: a straight surface diff against the real library.
//
// q5play's side comes from `public/q5play/docs/q5play.d.ts` — the vendored
// reference's own typings. shPlay's side comes from *introspecting the running
// engine*, not from parsing its source or its .d.ts: a declaration that was
// never wired to an export has burned this repo before, so the only surface
// that counts is the one a student's sketch can actually reach.
//
// This REPORTS. It is not a gate — full parity is explicitly not the goal
// (see _workspace/gauntlet/DECISIONS.md, D3).
//
//   node scripts/shplay-parity-report.mjs
//   node scripts/shplay-parity-report.mjs --missing   # only what we lack
//   node scripts/shplay-parity-report.mjs --json

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSketch } from './shplay-harness.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF_DTS = join(REPO, 'public', 'q5play', 'docs', 'q5play.d.ts');

const argv = process.argv.slice(2);
const ONLY_MISSING = argv.includes('--missing');
const WANT_JSON = argv.includes('--json');

// ---- the reference surface, from q5play's own typings ---------------------

// Pull the member names declared inside `class X { ... }` / `interface X { ... }`.
function membersOf(dts, className, seen = new Set()) {
  if (seen.has(className)) return [];
  seen.add(className);
  const re = new RegExp(`(?:declare\\s+)?(?:class|interface)\\s+${className}\\b[^{]*\\{`, 'm');
  const m = re.exec(dts);
  if (!m) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  const start = i;
  while (i < dts.length && depth > 0) {
    const c = dts[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  const body = dts.slice(start, i - 1);
  const names = new Set();
  // q5play's input verbs live on InputDevice, which _Keyboard/_Mouse extend.
  // Not walking the chain scored kb at 0% while every verb was present.
  const ext = /extends\s+([A-Za-z_$][\w$.]*)/.exec(m[0]);
  if (ext && !/^(Array|Object)$/.test(ext[1])) {
    for (const n of membersOf(dts, ext[1].replace(/^.*\./, ''), seen) || []) names.add(n);
  }
  // `foo(...)`, `foo: T`, `get foo()`, `set foo(...)`, `readonly foo: T`
  const rx = /^\s*(?:readonly\s+|static\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*[(:?]/gm;
  let mm;
  while ((mm = rx.exec(body)) !== null) {
    const n = mm[1];
    if (['constructor', 'new', 'return', 'if', 'else', 'function'].includes(n)) continue;
    if (n.startsWith('_')) continue; // private by convention
    names.add(n);
  }
  return [...names].sort();
}

function globalsOf(dts) {
  const names = new Set();
  // Everything sits inside `declare global { ... }`, so the declarations are
  // indented `function foo(` / `const foo:` — not `declare function`. Matching
  // only the latter found zero globals and reported a confident 0%.
  const rx = /^\s*(?:declare\s+)?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = rx.exec(dts)) !== null) if (!m[1].startsWith('_')) names.add(m[1]);
  return [...names].sort();
}

// ---- shPlay's real surface, by introspection ------------------------------

function introspect() {
  const r = runSketch(`
    function setup(){
      new Canvas(200,200);
      const s = new Sprite(50,50,20,20);
      const g = new Group();
      const probe = (o) => {
        const out = new Set();
        let cur = o;
        while (cur && cur !== Object.prototype) {
          for (const k of Object.getOwnPropertyNames(cur)) {
            if (!k.startsWith('_') && k !== 'constructor') out.add(k);
          }
          cur = Object.getPrototypeOf(cur);
        }
        return [...out].sort();
      };
      surface = {
        Sprite: probe(s),
        // A q5play Group cascades every Sprite property to its members. shPlay
        // does this dynamically, so an empty Group exposes almost nothing to
        // getOwnPropertyNames — probing one bare scored it at 5% and told us
        // nothing. Probe a group that has a member instead.
        Group: (() => { const g2 = new Group(); new g2.Sprite(10, 10, 5); return probe(g2).filter((k) => isNaN(Number(k))); })(),
        World: probe(world),
        kb: probe(kb),
        mouse: probe(mouse),
        globals: Object.getOwnPropertyNames(globalThis).filter((k) => !k.startsWith('_')).sort(),
      };
    }
    function draw(){}
  `, { frames: 2 });
  if (!r.ok) {
    console.error('could not introspect the engine:', r.error?.message);
    process.exit(2);
  }
  return r.box.sandbox.surface;
}

// ---- compare ---------------------------------------------------------------

// q5play surface shPlay deliberately does not chase (DECISIONS.md D3): gamepads,
// tilemaps, ascii art, multiplayer netcode, touch, raycasting.
const OUT_OF_SCOPE = /^(contro|controllers?|touches?|tiles?|spriteArt|colorPal|EmojiImage|watch|mod|rayCast|rayCastAll|pixelPerfect|vertices|autoCull|amount|subgroups|parent|idNum|tint|tintColor|renderStats|palettes|meterSize|timeScale|updateRate|velocityIterations|positionIterations|velocityThreshold|physicsTime|realTime|extrapolationUpdate|snapToGrid|gridSize|friendlyRounding|storeDeletedGroupRefs|disableImages|emojiScale)$/;

function compare(refNames, ourNames) {
  const ours = new Set(ourNames || []);
  const have = [];
  const missing = [];
  const skipped = [];
  for (const n of refNames || []) {
    if (ours.has(n)) have.push(n);
    else if (OUT_OF_SCOPE.test(n)) skipped.push(n);
    else missing.push(n);
  }
  return { have, missing, skipped };
}

const merge = (...lists) => [...new Set(lists.flat().filter(Boolean))].sort();

function main() {
  const dts = readFileSync(REF_DTS, 'utf8');
  const ours = introspect();
  const inputBase = membersOf(dts, 'InputDevice') || [];

  const groups = [
    ['Sprite', membersOf(dts, 'Sprite'), ours.Sprite],
    ['Group', membersOf(dts, 'Group'), ours.Group],
    ['World', membersOf(dts, 'World'), ours.World],
    // _Keyboard/_Mouse declare only their own extras; every input VERB
    // (presses/pressing/holds/holding/held/released + holdThreshold) lives on
    // the InputDevice base. Merge explicitly — an inheritance walk here was
    // silently returning just the subclass and scoring kb at a confident 0%.
    ['kb', merge(membersOf(dts, '_Keyboard'), inputBase), ours.kb],
    ['mouse', merge(membersOf(dts, '_Mouse'), inputBase), ours.mouse],
    ['globals', globalsOf(dts), ours.globals],
  ];

  const report = {};
  let tHave = 0, tMiss = 0, tSkip = 0;
  for (const [name, ref, our] of groups) {
    if (!ref) { report[name] = { error: 'not found in reference typings' }; continue; }
    const c = compare(ref, our);
    report[name] = c;
    tHave += c.have.length; tMiss += c.missing.length; tSkip += c.skipped.length;
  }

  const inScope = tHave + tMiss;
  const pct = inScope ? Math.round((tHave / inScope) * 100) : 0;
  report.summary = { have: tHave, missing: tMiss, outOfScope: tSkip, inScope, parityPct: pct };

  if (WANT_JSON) { process.stdout.write(JSON.stringify(report, null, 2)); return; }

  const C = { g: '\x1b[32m', r: '\x1b[31m', d: '\x1b[2m', b: '\x1b[1m', y: '\x1b[33m', x: '\x1b[0m' };
  console.log(`\n${C.b}shPlay vs q5play — surface parity${C.x}`);
  console.log(`${C.d}reference: public/q5play/docs/q5play.d.ts · ours: live introspection of the running engine${C.x}\n`);

  for (const [name] of groups) {
    const c = report[name];
    if (!c || c.error) { console.log(`  ${name}: ${C.d}${c?.error}${C.x}`); continue; }
    const n = c.have.length + c.missing.length;
    const p = n ? Math.round((c.have.length / n) * 100) : 0;
    const bar = '█'.repeat(Math.round(p / 5)).padEnd(20, '░');
    console.log(`  ${name.padEnd(9)} ${bar} ${String(p).padStart(3)}%  ${c.have.length}/${n}${c.skipped.length ? C.d + `  (+${c.skipped.length} out of scope)` + C.x : ''}`);
    if (c.missing.length) {
      console.log(`    ${C.d}missing:${C.x} ${c.missing.join(', ')}`);
    }
  }

  console.log(`\n${C.d}  Caveat on Group: q5play predeclares every cascading Sprite property on Group.
  shPlay accepts them dynamically -- coins.color = 'gold' works, and the gate checks it --
  so those read as "missing" here and are not. Group's real gap is its METHODS:
  deleteAll, contains, add. (cull, applyForce and the
  moveTowards family are built now.)${C.x}`);

  console.log(`\n  ${C.b}in-scope parity: ${pct}%${C.x}  (${tHave} of ${inScope}; ${tSkip} members deliberately out of scope per DECISIONS.md D3)\n`);
}

main();
