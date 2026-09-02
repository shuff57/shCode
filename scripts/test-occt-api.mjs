#!/usr/bin/env node
// The docs' own examples, run on BOTH engines, compared as numbers.
//
// THE BAR. Everything before this measured the kernel: volumes against
// arithmetic, recipes against formulae, one document end to end in a browser.
// None of it answered the question a student's file asks -- does MY program
// build the same thing? So this takes the real `code` off a real page of
// lib/reshape-docs.ts, runs it once in the JSCAD scope the runner gives a
// student and once in the OpenCascade scope lib/occt-api.ts provides, and
// compares volume and bounding box.
//
// Same source, two engines, two numbers that have to agree. A unit test can be
// written to pass; this cannot, because the input is the documentation.
//
// WHAT COUNTS AS AGREEMENT, and why it is not equality. JSCAD tessellates: its
// cylinder is a 32-sided prism holding 0.64% less than the real one, and its
// bounding box is the inscribed polygon's, which is narrower than the true
// diameter. Demanding equality would fail the MORE correct answer for not being
// the old one -- the same mistake the oracle already learned not to make. So a
// tolerance, and the direction is asserted too: on a round shape OpenCascade
// must measure LARGER, never smaller.
//
// A page that does not run is reported by REASON, not swept into a percentage.
// "94% agree" is worthless without knowing whether the other 6% are unported
// names or wrong shapes, and those need completely different work.
//
//   node scripts/test-occt-api.mjs --occt <dir with replicad_single.js>

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runProgram } from './reshape-harness.mjs';
import { createSimpleContext } from './reshape-simple-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const flag = process.argv.indexOf('--occt');
const dir = flag > -1 ? process.argv[flag + 1] : process.env.OCCT_DIR;
if (!dir || !existsSync(path.join(dir, 'replicad_single.js'))) {
  console.log('SKIPPED — no OpenCascade build, so the vocabulary was NOT measured.');
  console.log('          node scripts/test-occt-api.mjs --occt <dir with replicad_single.js>');
  console.log('          (a skip, not a pass)');
  process.exit(0);
}

let fails = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  PASS  ' + name);
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
};

const out = mkdtempSync(path.join(tmpdir(), 'shcode-api-'));
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/occt-api.ts', 'lib/occt-mesh.ts', 'lib/hull.ts',
      'lib/docs-core.ts', 'lib/reshape-docs.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const req = createRequire(path.join(out, 'noop.cjs'));
  const { createApi } = req(path.join(out, 'occt-api.js'));
  const mesh = req(path.join(out, 'occt-mesh.js'));
  const hull = req(path.join(out, 'hull.js'));
  const { sections } = req(path.join(out, 'reshape-docs.js'));

  const oc = await (await import(pathToFileURL(path.join(dir, 'replicad_single.js')).href)).default();
  const api = createApi(oc, {
    tessellate: mesh.tessellate,
    convexHull: hull.convexHull,
  });

  // ---- the two scopes ------------------------------------------------------
  //
  // The OpenCascade one is built the same way the shim builds the JSCAD one: the
  // names go straight onto the global object, so a program that says `cuboid(...)`
  // finds it without a namespace. Nothing is wrapped and nothing is renamed --
  // that is the whole contract this file is checking.
  const occtContext = () => {
    const quiet = { log() {}, warn() {}, error() {}, info() {} };
    const sandbox = { module: { exports: {} }, console: quiet, Math, JSON, Array, Object, Number, String };
    for (const [k, v] of Object.entries(api)) if (k !== 'colorOf') sandbox[k] = v;
    sandbox.require = (id) => {
      if (id === '@jscad/modeling') {
        throw new Error("require('@jscad/modeling') is not available on the B-rep kernel yet");
      }
      throw new Error('cannot require ' + id);
    };
    return vm.createContext(sandbox);
  };

  const measureJscad = (g) => {
    const geoms = require0('@jscad/modeling');
    const list = Array.isArray(g) ? g : [g];
    let vol = 0;
    for (const item of list) {
      if (geoms.geometries.geom3.isA(item)) vol += geoms.measurements.measureVolume(item);
    }
    const bb = geoms.measurements.measureAggregateBoundingBox(list);
    return { vol, bb };
  };
  let require0;
  {
    const { loadModeling } = await import('./reshape-harness.mjs');
    const { jscad } = loadModeling();
    require0 = () => jscad;
  }

  const measureOcct = (g) => {
    const list = Array.isArray(g) ? g : [g];
    let vol = 0;
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    for (const s of list) {
      if (!s || typeof s.ShapeType !== 'function') continue;
      vol += api.measureVolume(s);
      const [a, b] = api.measureBoundingBox(s);
      for (let i = 0; i < 3; i++) {
        if (a[i] < lo[i]) lo[i] = a[i];
        if (b[i] > hi[i]) hi[i] = b[i];
      }
    }
    return { vol, bb: [lo, hi] };
  };

  // ---- run every page both ways -------------------------------------------

  const pages = [];
  for (const s of sections) {
    for (const p of s.pages || []) {
      if (typeof p.code === 'string' && p.code.trim()) {
        pages.push({ key: `${s.slug} / ${p.title}`, code: p.code });
      }
    }
  }

  const VOL_TOL = 0.05;      // tessellation, mostly
  const BOX_TOL = 0.02;

  /** Whether box `a` encloses box `b`, allowing a hair for arithmetic. */
  const contains = (a, b) => {
    const eps = 1e-6 * Math.max(1, ...[0, 1, 2].map((i) => Math.abs(b[1][i] - b[0][i])));
    return [0, 1, 2].every((i) => a[0][i] <= b[0][i] + eps && a[1][i] >= b[1][i] - eps);
  };

  const agreed = [];
  const expected = [];
  const drifted = [];
  const unported = new Map();   // name -> pages
  const broke = [];
  const jscadOnly = [];

  for (const p of pages) {
    let ref;
    try {
      const { ctx } = createSimpleContext({ consoleImpl: { log() {}, warn() {}, error() {} } });
      const r = runProgram(ctx, p.code, p.key);
      if (!r.ok || !r.main || r.geometry === undefined) { jscadOnly.push(p.key); continue; }
      ref = measureJscad(r.geometry);
    } catch (e) { jscadOnly.push(p.key); continue; }
    if (!(ref.vol > 0)) { jscadOnly.push(p.key); continue; }   // 2D or empty: no volume to compare

    let got;
    try {
      const r = runProgram(occtContext(), p.code, p.key);
      if (!r.ok) {
        const m = /(\w+) is not defined/.exec(r.error.message);
        if (m) {
          if (!unported.has(m[1])) unported.set(m[1], []);
          unported.get(m[1]).push(p.key);
        } else broke.push(`${p.key}: ${r.error.message.slice(0, 90)}`);
        continue;
      }
      if (!r.main || r.geometry === undefined) { broke.push(`${p.key}: no geometry`); continue; }
      got = measureOcct(r.geometry);
    } catch (e) {
      const m = /(\w+) is not defined/.exec(String(e.message));
      if (m) {
        if (!unported.has(m[1])) unported.set(m[1], []);
        unported.get(m[1]).push(p.key);
      } else broke.push(`${p.key}: ${String(e.message).slice(0, 90)}`);
      continue;
    }

    const dv = Math.abs(got.vol - ref.vol) / ref.vol;
    const dbox = Math.max(
      ...[0, 1, 2].map((i) => Math.max(
        Math.abs(got.bb[0][i] - ref.bb[0][i]),
        Math.abs(got.bb[1][i] - ref.bb[1][i]),
      )),
    );
    const span = Math.max(...[0, 1, 2].map((i) => ref.bb[1][i] - ref.bb[0][i]), 1);
    // A PAGE ABOUT `segments` IS SUPPOSED TO DIFFER, and lumping it in with the
    // wrong shapes would be the same mistake in reverse.
    //
    // `segments` asks a mesh how coarsely to fake a curve, and several pages
    // exist precisely to show what a low count costs -- "sphere, and what
    // segments cost", "How round is round". A B-rep has no such dial, so it
    // builds the real surface and measures more.
    //
    // THE DIRECTION RULE ONLY HOLDS ONE WAY ROUND, which the first version of
    // this got wrong. An exact primitive is LARGER than the inscribed prism it
    // replaces -- but subtract that larger cylinder and the result is SMALLER,
    // so "the exact kernel measures more" is false for every page that drills a
    // hole. Six boolean pages were reported as wrong shapes on that reasoning,
    // at differences of 0.04%, which the ordinary tolerance had already
    // accepted. So the tolerance is applied FIRST and this branch only catches
    // what genuinely exceeds it.
    //
    // Detected by looking for the word in the source, which is crude and is
    // crude in the SAFE direction: a page that mentions segments and is
    // genuinely broken gets the weaker check, while a page that does not
    // mention it can never escape the strict one.
    // Pages whose result depends on a property of the MESH rather than of the
    // shape. Named one by one, not pattern-matched, because each is a decision
    // someone made and should have to state.
    //
    //   measureBoundingSphere -- JSCAD centres on the centroid of the mesh
    //   vertices, which moves with tessellation density and which a B-rep has
    //   no canonical vertex set to reproduce. See lib/occt-api.ts.
    const KNOWN_DIVERGENT = new Set(['beyond / measureBoundingSphere']);

    const meshy = /\bsegments\b/.test(p.code) || KNOWN_DIVERGENT.has(p.key);
    if (dv <= VOL_TOL && dbox / span <= BOX_TOL) {
      agreed.push({ key: p.key, dv, dbox: dbox / span });
    } else if (meshy && KNOWN_DIVERGENT.has(p.key)) {
      // A named divergence is exempt from the direction rule too: a bounding
      // sphere with a different CENTRE is neither contained in nor containing
      // the other. What is still required is that it ran and produced a solid,
      // which the code above already established.
      expected.push({ key: p.key, dv, ref: ref.vol, got: got.vol });
    } else if (meshy && got.vol > ref.vol && contains(got.bb, ref.bb)) {
      // Over tolerance, but in the direction and for the reason a `segments`
      // page is over tolerance.
      //
      // CONTAINMENT, not a box tolerance, and the difference matters. A page
      // asking for `segments: 6` builds a hexagonal prism where the kernel
      // builds a cylinder, and their bounding boxes legitimately differ by
      // (1 - cos(pi/6)) = 13.4% of the radius -- far outside any tolerance
      // loose enough to still catch a real defect. What is EXACTLY true is that
      // the true cylinder contains the inscribed prism, so its box contains the
      // prism's. That is an invariant rather than a threshold: it cannot be
      // satisfied by a shape that is merely close, and it fails immediately for
      // one that is shifted, mirrored or the wrong size.
      expected.push({ key: p.key, dv, ref: ref.vol, got: got.vol });
    } else {
      drifted.push({ key: p.key, dv, dbox: dbox / span, ref: ref.vol, got: got.vol });
    }
  }

  // ---- the number ----------------------------------------------------------

  console.log('\n=== the docs, run on both engines ===');
  const comparable = agreed.length + drifted.length + broke.length
    + [...unported.values()].reduce((n, l) => n + l.length, 0);
  console.log(`  ----  ${pages.length} pages, ${comparable} with a solid to compare`);
  console.log(`  ----  ${agreed.length} agree, ${expected.length} differ AS EXPECTED `
    + `(a segments page -- the exact kernel measures more), ${drifted.length} differ, `
    + `${[...unported.values()].reduce((n, l) => n + l.length, 0)} blocked on an unported name, `
    + `${broke.length} threw`);
  console.log(`  ----  ${jscadOnly.length} skipped (2D, no main, or no volume to compare)`);

  if (unported.size) {
    console.log('\n  names not ported yet, by how many pages each blocks:');
    for (const [n, l] of [...unported.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ----    ${String(l.length).padStart(3)}  ${n}`);
    }
  }
  if (expected.length) {
    console.log('\n  pages that differ because the kernel is exact and the mesh was not:');
    for (const d of expected) {
      console.log(`  ----    ${d.key}  ${d.ref.toFixed(1)} -> ${d.got.toFixed(1)} `
        + `(+${(d.dv * 100).toFixed(2)}%)`);
    }
  }
  if (drifted.length) {
    console.log('\n  pages whose shape differs:');
    for (const d of drifted.slice(0, 20)) {
      console.log(`  ----    ${d.key}  vol ${(d.dv * 100).toFixed(2)}% `
        + `(${d.ref.toFixed(1)} -> ${d.got.toFixed(1)}), box ${(d.dbox * 100).toFixed(2)}%`);
    }
  }
  if (broke.length) {
    console.log('\n  pages that threw:');
    for (const b of broke.slice(0, 15)) console.log('  ----    ' + b);
  }

  check('the harness really ran both engines on real pages',
    comparable > 20, `${comparable} comparable pages — too few to mean anything`);
  check('every page that runs on both engines builds the same shape',
    drifted.length === 0,
    'a page that runs and disagrees is a wrong shape, which is the failure this '
    + 'file exists for — an unported NAME is a different problem and is counted '
    + 'separately above');

  // ---- the direction, which a tolerance alone would hide -------------------
  //
  // A tolerance says "close enough" in both directions. On a ROUND shape the two
  // engines are not symmetric: JSCAD's is an inscribed prism and OpenCascade's is
  // exact, so ours must come out LARGER. If it ever came out smaller, the
  // tolerance would still pass and the shape would be wrong.
  console.log('\n=== the exact engine measures MORE, never less ===');
  const round = runProgram(occtContext(),
    'function main() { return cylinder({ radius: 12, height: 30 }) }\nmodule.exports={main}', 'round<occt>');
  const { ctx } = createSimpleContext({ consoleImpl: { log() {}, warn() {}, error() {} } });
  const roundRef = runProgram(ctx,
    'function main() { return cylinder({ radius: 12, height: 30 }) }\nmodule.exports={main}', 'round<jscad>');
  const ov = measureOcct(round.geometry).vol;
  const jv = measureJscad(roundRef.geometry).vol;
  const exact = Math.PI * 144 * 30;
  check('a cylinder measures MORE on the exact kernel than on the mesh',
    ov > jv, `occt ${ov.toFixed(4)} vs jscad ${jv.toFixed(4)}`);
  check('...and lands on the analytic volume, which the mesh cannot',
    Math.abs(ov - exact) < 1e-6 && Math.abs(jv - exact) > 1,
    `occt ${ov.toFixed(4)}, jscad ${jv.toFixed(4)}, exact ${exact.toFixed(4)}`);

  // ---- the refusal that must stay a refusal -------------------------------
  console.log('\n=== non-uniform scale refuses, rather than approximating ===');
  const bad = runProgram(occtContext(),
    'function main() { return scale([3, 1, 1], cube({ size: 10 })) }\nmodule.exports={main}', 'scale<occt>');
  check('scale([3,1,1]) refuses with the reason, not a wrong solid',
    !bad.ok && /GTransform/.test(bad.error.message), String(bad.ok));
  const okScale = runProgram(occtContext(),
    'function main() { return scale([2, 2, 2], cube({ size: 10 })) }\nmodule.exports={main}', 'uscale<occt>');
  check('CONTROL: uniform scale still works, so the refusal is narrow',
    okScale.ok && Math.abs(measureOcct(okScale.geometry).vol - 8000) < 1e-6,
    okScale.ok ? String(measureOcct(okScale.geometry).vol) : okScale.error.message);
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails === 0 ? 0 : 1);
