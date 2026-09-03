// Measures lib/occt-build.ts against the JSCAD oracle.
//
// The prediction this is checking was written down before the adapter existed,
// when the oracle learned the difference between a tessellated volume and an
// exact one:
//
//   every FLAT fixture should match to the digit
//   every ROUND one should move TOWARD its analytic volume
//
// A round fixture that does not move means the adapter is not really using the
// kernel. A flat one that moves is a defect. Both are failures here.
//
// NOT part of `npm test`: it needs an OpenCascade build, which is 21.9 MB and
// not vendored. Point it at one and run it by hand:
//
//   OCCT_DIR=/path/containing/replicad_single.js node scripts/test-occt-adapter.mjs
//
// Without OCCT_DIR it skips loudly rather than passing vacuously -- a suite
// that goes green because it did nothing is the failure this repo has caught
// itself making before.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const LEDGER = path.join(root, '.gauntlet', 'occt-checks.json');

const flag = process.argv.indexOf('--occt');
const dir = flag > -1 ? process.argv[flag + 1] : process.env.OCCT_DIR;
if (!dir || !existsSync(path.join(dir, 'replicad_single.js'))) {
  // A SKIP THAT SAYS HOW MUCH IT IS SKIPPING.
  //
  // This suite is in `npm test` so the gap is visible on every run, but a bare
  // "SKIPPED" is nearly as invisible as not being there at all -- it scrolls
  // past and nobody knows whether it stands for two checks or two hundred. So a
  // successful run records its own count, and the skip reads it back. The number
  // cannot go stale, because the only thing that writes it is a real run.
  let was = null;
  try { was = JSON.parse(readFileSync(LEDGER, 'utf8')); } catch (e) { /* never run here */ }
  console.log('SKIPPED — no OpenCascade build, so the B-rep kernel was NOT measured.');
  if (was) {
    console.log(`          ${was.checks} checks are not running. Last measured ${was.when}`
      + (was.sha ? ` at ${was.sha}` : '') + '.');
  }
  console.log('          npm run test:occt -- --occt <dir with replicad_single.js>');
  console.log('          (a skip, not a pass: nothing here was measured)');
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(path.join(root, '.gauntlet', 'oracle.json'), 'utf8'));
const out = mkdtempSync(path.join(tmpdir(), 'shcode-occt-'));
let pass = 0;
const fails = [];
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fails.push(name); console.log('  FAIL  ' + name + (detail ? ' -- ' + detail : '')); }
};

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/occt-build.ts', 'lib/model-types.ts', 'lib/sketch-arc.ts', 'lib/topo-resolve.ts',
      'lib/topo-history.ts', 'lib/topo-name.ts',
      'lib/script-surface.ts', 'lib/hull.ts', 'lib/occt-mesh.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const adapter = require(path.join(out, 'occt-build.js'));
  const arc = require(path.join(out, 'sketch-arc.js'));
  const topo = require(path.join(out, 'topo-resolve.js'));
  const hist = require(path.join(out, 'topo-history.js'));
  const naming = require(path.join(out, 'topo-name.js'));
  const types = require(path.join(out, 'model-types.js'));

  const oc = await (await import(pathToFileURL(path.join(dir, 'replicad_single.js')).href)).default();
  console.log('OpenCascade up, ' + Object.keys(oc).length + ' exports\n');

  // The rebuild-identity block at the bottom runs after this try/finally has
  // closed, so it cannot see these bindings. Handing them over explicitly is
  // uglier than nesting and keeps the two concerns readable apart.
  globalThis.__oc = oc;
  globalThis.__adapter = adapter;
  globalThis.__topo = topo;
  globalThis.__arc = arc;
  globalThis.__types = types;
  globalThis.__hist = hist;
  globalThis.__name = naming;
  globalThis.__surface = require(path.join(out, 'script-surface.js'));
  globalThis.__hull = require(path.join(out, 'hull.js'));
  globalThis.__mesh = require(path.join(out, 'occt-mesh.js'));

  // The fixtures this slice claims: primitives, booleans, move, mirror.
  const DOCS = {
    box: [{ id: 'b1', kind: 'box', size: [40, 30, 20], center: [0, 0, 0] }],
    cylinder: [{ id: 'c1', kind: 'cylinder', radius: 12, height: 30, center: [0, 0, 0] }],
    cone: [{ id: 'c1', kind: 'cone', radius: 12, height: 30, center: [0, 0, 0] }],
    sphere: [{ id: 's1', kind: 'sphere', radius: 15, center: [0, 0, 0] }],
    torus: [{ id: 't1', kind: 'torus', ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] }],
    'boolean-cut': [
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 8, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'subtract', targets: ['b1', 'c1'] },
    ],
    'boolean-union': [
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 8, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'union', targets: ['b1', 'c1'] },
    ],
    'boolean-intersect': [
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 15, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'intersect', targets: ['b1', 'c1'] },
    ],
    mirror: [
      { id: 'b1', kind: 'box', size: [20, 20, 20], center: [30, 0, 0] },
      { id: 'mir1', kind: 'mirror', target: 'b1', plane: 'yz' },
    ],
    // --- sketch-based, the slice this run adds ---
    'sketch-extrude': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: [[0,0],[40,0],[40,25],[0,25]] },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    'sketch-on-xz': [
      { id: 'sk1', kind: 'sketch', plane: 'xz', offset: 0, points: [[0,0],[40,0],[40,25],[0,25]] },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    'sketch-on-yz-offset': [
      { id: 'sk1', kind: 'sketch', plane: 'yz', offset: 10, points: [[0,0],[40,0],[40,25],[0,25]] },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    'circle-extrude': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, shape: 'circle', points: [[-15,0],[15,0]] },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 20 },
    ],
    'rounded-corner': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: [[0,0],[40,0],[40,25],[0,25]], rounds: { 1: 6 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    'chamfered-corner': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: [[0,0],[40,0],[40,25],[0,25]], chamfers: { 1: 6 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    'bowed-edge': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: [[0,0],[40,0],[40,25],[0,25]], bulges: { 0: 0.4 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ],
    // Spin, on all three planes. These must DIFFER: the axis is the plane
    // normal, so each stands along a different world axis. Before Spin
    // honoured the plane at all, the three were identical.
    'revolve-on-xy': [
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, points: [[10,0],[20,0],[20,30],[10,30]] },
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ],
    'sketch-revolve': [
      { id: 'sk1', kind: 'sketch', plane: 'xz', offset: 0, points: [[10,0],[20,0],[20,30],[10,30]] },
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ],
    'revolve-on-yz': [
      { id: 'sk1', kind: 'sketch', plane: 'yz', offset: 0, points: [[10,0],[20,0],[20,30],[10,30]] },
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ],
    blend: [
      { id: 'sa', kind: 'sketch', plane: 'xy', offset: 0, points: [[-20,-20],[20,-20],[20,20],[-20,20]] },
      { id: 'sb', kind: 'sketch', plane: 'xy', offset: 30, points: [[-5,-5],[5,-5],[5,5],[-5,5]] },
      { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
    ],
    moved: [
      { id: 'b1', kind: 'box', size: [20, 20, 20], center: [0, 0, 0] },
      { id: 'mv1', kind: 'move', target: 'b1', offset: [15, 5, 0] },
    ],
  };

  for (const [name, features] of Object.entries(DOCS)) {
    const want = baseline.models[name];
    if (!want) { check(name, false, 'no oracle entry'); continue; }
    let got;
    try {
      const built = adapter.buildDoc(oc, { version: 1, features }, arc);
      const last = built.shapes.get(features[features.length - 1].id);
      if (!last) { check(name, false, 'the adapter built nothing for it'); continue; }
      got = adapter.measureShape(oc, last);
    } catch (e) {
      check(name, false, 'threw: ' + String((e && e.message) || e).slice(0, 110));
      continue;
    }

    const db = Math.max(...want.bbox.flatMap((row, i) => row.map((v, j) => Math.abs(got.bbox[i][j] - v))));
    if (want.exact !== undefined && want.curved) {
      // The prediction: it should land on the ANALYTIC number, not the
      // tessellated one, and it should have moved off the tessellated one.
      const dExact = Math.abs(got.volume - want.exact) / want.exact;
      const moved = Math.abs(got.volume - want.volume) / want.volume;
      check(name + ' lands on the exact volume, not the tessellated one',
        dExact < 0.0005 && moved > 0.001,
        'got ' + got.volume + ', exact ' + want.exact + ', jscad ' + want.volume
          + ' (' + (dExact * 100).toFixed(3) + '% from exact, moved '
          + (moved * 100).toFixed(2) + '%)');
    } else if (want.curved) {
      const dv = Math.abs(got.volume - want.volume) / want.volume;
      check(name + ' is within the curved tolerance of the oracle', dv < 0.02,
        'got ' + got.volume + ' vs ' + want.volume + ' (' + (dv * 100).toFixed(2) + '%)');
    } else {
      const dv = Math.abs(got.volume - want.volume) / Math.max(1e-9, want.volume);
      check(name + ' matches the oracle exactly (flat shape)', dv < 0.0005 && db < 0.01,
        'got ' + got.volume + ' vs ' + want.volume + ', bbox off by ' + db.toFixed(4));
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

// ---- the claim the whole naming design rests on -------------------------
//
// Build, name a face, change an upstream number, rebuild, and ask the name
// again. It has to come back to the SAME face. If it does not, a student
// cannot fillet an edge and keep the fillet when they widen the part, and
// parametric modelling does not work whatever the kernel is.

function centreOf(oc, shape, part) {
  const topo = globalThis.__topo;
  const face = topo.resolvePrimitiveFace(oc, shape, part);
  return face ? topo.faceCentre(oc, face) : null;
}

{
  const occ = globalThis.__oc;
  const topo = globalThis.__topo;
  const build = (w, d, h) => globalThis.__adapter.buildDoc(occ,
    { version: 1, features: [{ id: 'b1', kind: 'box', size: [w, d, h], center: [0, 0, 0] }] });

  const before = build(40, 30, 20).shapes.get('b1');
  const topBefore = centreOf(occ, before, '+z');
  check('a primitive face name resolves at all',
    topBefore !== null && Math.abs(topBefore[2] - 10) < 1e-6, JSON.stringify(topBefore));

  // The rebuild. Every dimension changes, so every face moves and the
  // kernel's own face order is free to change with them.
  const after = build(70, 12, 46).shapes.get('b1');
  const topAfter = centreOf(occ, after, '+z');
  check('...and after a rebuild it still finds the TOP face, at its new height',
    topAfter !== null && Math.abs(topAfter[2] - 23) < 1e-6, JSON.stringify(topAfter));
  check('...not merely some face that happens to sit high',
    topAfter !== null && Math.abs(topAfter[0]) < 1e-6 && Math.abs(topAfter[1]) < 1e-6,
    'the top face of a centred box centres on the z axis');

  // Every direction, so a lucky guess on one cannot pass for the design
  // working.
  const dirs = [['+x', 35], ['-x', -35], ['+y', 6], ['-y', -6], ['-z', -23]];
  let allRight = true;
  const seen = [];
  for (const [part, want] of dirs) {
    const c = centreOf(occ, after, part);
    const axis = part.includes('x') ? 0 : part.includes('y') ? 1 : 2;
    seen.push(part + (c ? c[axis].toFixed(1) : 'null'));
    if (!c || Math.abs(c[axis] - want) > 1e-6) allRight = false;
  }
  check('every face of the rebuilt box is found where it belongs', allRight, seen.join(' '));

  // A cylinder, where +z and -z are caps and the wall is neither.
  const cyl = globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'c1', kind: 'cylinder', radius: 12, height: 30, center: [0, 0, 0] }] }).shapes.get('c1');
  const side = topo.resolvePrimitiveFace(occ, cyl, 'side');
  const cap = topo.resolvePrimitiveFace(occ, cyl, '+z');
  check('a cylinder tells its wall from its caps',
    side !== null && cap !== null
      && Math.abs(topo.faceCentre(occ, cap)[2] - 15) < 1e-6
      && Math.abs(topo.faceCentre(occ, side)[2]) < 1e-6,
    'cap should centre at z=15, the wall at z=0');

  // A name that cannot be resolved returns null rather than a wrong face.
  check('an unresolvable name returns null instead of guessing',
    topo.resolveName(occ, { cause: 'swept', feature: 'b1', kind: 'face', from: 'sk9', edge: 0 },
      { shapes: new Map([['b1', after]]), ops: new Map(), sweeps: new Map() }) === null,
    'b1 is a box, so no sweep produced it and there is no edge to have been pulled from');
}


// ---- the boolean half of the same claim ---------------------------------
//
// The block above proves a name survives a REBUILD. This one proves it
// survives an OPERATION, which is the half the whole design was argued over.
// A groove cut across the top of a bar SPLITS that top face in two, and the
// history alone cannot say which piece the student meant -- both came from the
// same parent. "The left one" has to keep meaning the left one when the bar
// changes width.

{
  const occ = globalThis.__oc;
  const topo = globalThis.__topo;
  const hist = globalThis.__hist;
  const naming = globalThis.__name;

  // A bar with a slot cut across its top. The slot stays where it is; only the
  // bar's width changes, so the two top pieces grow and shrink asymmetrically
  // -- which is what makes this a real test rather than a uniform scale.
  const grooved = (w) => globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'bar', kind: 'box', size: [w, 40, 20], center: [0, 0, 0] },
    { id: 'slot', kind: 'box', size: [10, 60, 10], center: [0, 0, 10] },
    { id: 'cut', kind: 'combine', op: 'subtract', targets: ['bar', 'slot'] },
  ] });
  const TOP = { cause: 'primitive', feature: 'bar', kind: 'face', part: '+z' };
  const SIDE = { cause: 'primitive', feature: 'bar', kind: 'face', part: '+y' };
  const cx = (f) => (f ? topo.faceCentre(occ, f)[0] : NaN);

  const a = grooved(40);
  check('buildDoc keeps the boolean, not just its Shape()',
    (a.ops.get('cut') || []).length === 1,
    'the BRepAlgoAPI object holds the history and dies with it');

  const op = a.ops.get('cut')[0].op;
  const topA = topo.resolveName(occ, TOP, a);
  const fate = hist.faceFate(occ, op, topA);
  check('the cut SPLITS the top face rather than merely changing it',
    fate.kind === 'split' && fate.pieces.length === 2,
    'got ' + fate.kind + (fate.pieces ? ' x' + fate.pieces.length : ''));
  check('...while a side face is carried through, changed but still one face',
    hist.faceFate(occ, op, topo.resolveName(occ, SIDE, a)).kind === 'replaced');

  // Naming refuses to write a name it cannot honour.
  check('a carried name is refused for a face that split',
    topo.nameCarried(occ, a, 'cut', TOP) === null,
    'carried would claim there is one such face when there are two');
  const sideName = topo.nameCarried(occ, a, 'cut', SIDE);
  check('...and granted for the face that did not', sideName !== null
    && naming.formatName(sideName) === 'cut.same[bar.face[+y]]',
    sideName ? naming.formatName(sideName) : 'null');

  // The name under test: the LEFT piece of the split top face.
  const left = fate.pieces.reduce((p, q) => (cx(q) < cx(p) ? q : p));
  check('the two pieces sit either side of the slot',
    Math.abs(cx(left) + 12.5) < 1e-6, 'left piece should centre at x=-12.5, got ' + cx(left));
  const leftName = topo.nameSplitPiece(occ, a, 'cut', TOP, left);
  check('a split piece can be named at all', leftName !== null
    && leftName.cause === 'split' && leftName.at !== undefined,
    leftName ? naming.formatName(leftName) : 'null');
  check('...and the name is written as a discriminator, never an ordinal',
    leftName !== null && naming.formatName(leftName).indexOf('near(') > 0,
    leftName ? naming.formatName(leftName) : 'null');

  check('it resolves on the build it was written against',
    Math.abs(cx(topo.resolveName(occ, leftName, a)) + 12.5) < 1e-6);

  // THE CLAIM. Same name, a bar of a different width, still the left piece.
  // The pieces are not merely scaled: at w=70 the left piece runs -35..-5 and
  // at w=26 it runs -13..-5, so a name that tracked world coordinates or piece
  // order would land on the wrong one or on nothing.
  for (const [w, want] of [[70, -20], [26, -9]]) {
    const b = grooved(w);
    const got = topo.resolveName(occ, leftName, b);
    check('the same name still finds the LEFT piece on a ' + w + '-wide bar',
      got !== null && Math.abs(cx(got) - want) < 1e-6,
      got === null ? 'resolved to null' : 'centred at x=' + cx(got).toFixed(2) + ', wanted ' + want);
  }

  // ...and it is not doing it by picking the leftmost thing it can find.
  const rightName = topo.nameSplitPiece(occ, a, 'cut', TOP,
    fate.pieces.reduce((p, q) => (cx(q) > cx(p) ? q : p)));
  const rightOn70 = topo.resolveName(occ, rightName, grooved(70));
  check('the RIGHT piece resolves to the right piece, so it is not a fixed guess',
    rightOn70 !== null && Math.abs(cx(rightOn70) - 20) < 1e-6,
    rightOn70 === null ? 'null' : 'x=' + cx(rightOn70).toFixed(2));

  // A discriminator that lands nowhere is lost, and says so by being null.
  const nowhere = { cause: 'split', feature: 'cut', kind: 'face', of: TOP, at: { u: 500, v: 500 } };
  check('a discriminator that lands on no piece resolves to null, not a neighbour',
    topo.resolveName(occ, nowhere, a) === null);

  // Deleting the feature the name hangs off is caught without a kernel at all.
  check('and a name rooted in a deleted feature is reported as lost, in words',
    naming.whyNameLost(leftName, (id) => id !== 'bar', () => null, (id) => 'the bar')
      === 'That face was made by the bar, which is no longer in the model.',
    String(naming.whyNameLost(leftName, (id) => id !== 'bar', () => null, (id) => 'the bar')));
}

console.log('');

// ---- swept and cap: naming what the student actually drew ---------------
//
// A boolean MODIFIES faces; a sweep GENERATES them. One profile edge in, one
// wall out, plus a cap at each end. So a swept name needs no discriminator --
// it is exact -- and the whole difficulty moves to a different place: making
// sure "edge 2" keeps meaning the same design edge when the student rounds a
// corner somewhere else, and that the face handed back belongs to the solid
// they can actually see.

{
  const occ = globalThis.__oc;
  const topo = globalThis.__topo;
  const hist = globalThis.__hist;
  const naming = globalThis.__name;
  const arc = globalThis.__arc;
  const ctr = (f) => (f ? topo.faceCentre(occ, f) : null);
  const near = (f, want) => f !== null && want.every((n, i) => Math.abs(ctr(f)[i] - n) < 1e-6);

  const bar = (w, extra) => globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
      points: [[0, 0], [w, 0], [w, 25], [0, 25]], ...extra },
    { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
  ] }, arc);

  const E = (i) => ({ cause: 'swept', feature: 'e1', kind: 'face', from: 'sk1', edge: i });
  const CAP = (end) => ({ cause: 'cap', feature: 'e1', kind: 'face', end });

  const a = bar(40);
  check('buildDoc keeps the sweep, not just its Shape()',
    a.sweeps.get('e1') !== undefined && a.sweeps.get('e1').segments.length === 4,
    'segments: ' + JSON.stringify((a.sweeps.get('e1') || {}).segments || []));

  // Each design edge gets its own wall, and each wall is where that edge was.
  // The profile runs (0,0) (40,0) (40,25) (0,25), pulled 12 up.
  const walls = [[20, 0, 6], [40, 12.5, 6], [20, 25, 6], [0, 12.5, 6]];
  let allWalls = true;
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const f = topo.resolveName(occ, E(i), a);
    seen.push(i + ':' + (f ? ctr(f).map((n) => n.toFixed(1)).join(',') : 'null'));
    if (!near(f, walls[i])) allWalls = false;
  }
  check('every design edge resolves to the wall it was pulled into', allWalls, seen.join('  '));

  check('a pull caps both ends, and they are the two flat faces',
    near(topo.resolveName(occ, CAP('bottom'), a), [20, 12.5, 0])
      && near(topo.resolveName(occ, CAP('top'), a), [20, 12.5, 12]),
    JSON.stringify([ctr(topo.resolveName(occ, CAP('bottom'), a)),
      ctr(topo.resolveName(occ, CAP('top'), a))]));

  // THE CLAIM, the sweep half. Change the sketch and the name still lands on
  // the same design edge's wall -- at its new position, which is the point.
  const wide = bar(70);
  check('a swept name survives a rebuild that moves the edge it names',
    near(topo.resolveName(occ, E(1), wide), [70, 12.5, 6]),
    'edge 1 is the right-hand wall; at w=70 it belongs at x=70, got '
      + JSON.stringify(ctr(topo.resolveName(occ, E(1), wide))));

  // ...and it is not just picking the same ordinal. Rounding a corner inserts
  // a segment into the OUTLINE, so an outline-ordinal name would shift here.
  const withRound = bar(40, { rounds: { 1: 6 } });
  check('CONTROL: rounding corner 1 really does add a face',
    topo.facesOf(occ, withRound.shapes.get('e1')).length === 7,
    'got ' + topo.facesOf(occ, withRound.shapes.get('e1')).length + ' faces, expected 6 + 1');
  check('...and design edge 2 is STILL design edge 2 after that round',
    near(topo.resolveName(occ, E(2), withRound), [20, 25, 6]),
    'the far wall moved to ' + JSON.stringify(ctr(topo.resolveName(occ, E(2), withRound))));
  check('...while edges 0 and 1 are shortened by the round rather than lost',
    topo.resolveName(occ, E(0), withRound) !== null
      && topo.resolveName(occ, E(1), withRound) !== null);

  // The round's own face is nameable, and as a CORNER -- not as an edge.
  const R1 = { cause: 'rounded', feature: 'e1', kind: 'face', from: 'sk1', corner: 1 };
  const rf = topo.resolveName(occ, R1, withRound);
  check('the face a rounded corner made is nameable, after the corner',
    rf !== null && naming.formatName(R1) === 'e1.face[sk1.corner1]',
    rf === null ? 'resolved to null' : naming.formatName(R1));
  check('...and it is the curved one, sitting off the corner it replaced',
    rf !== null && Math.abs(ctr(rf)[2] - 6) < 1e-6
      && ctr(rf)[0] > 34 && ctr(rf)[0] < 40 && ctr(rf)[1] > 0 && ctr(rf)[1] < 6,
    rf === null ? 'null' : JSON.stringify(ctr(rf).map((n) => Number(n.toFixed(2)))));
  check('a corner that was never rounded has no such face',
    topo.resolveName(occ, { ...R1, corner: 3 }, withRound) === null
      && topo.resolveName(occ, R1, a) === null,
    'a rounded name should only resolve where a round exists');

  // A chamfer is the same shape of edit and reads the same way.
  const withCham = bar(40, { chamfers: { 1: 6 } });
  check('a chamfered corner is nameable the same way, and is flat',
    topo.resolveName(occ, R1, withCham) !== null
      && Math.abs(ctr(topo.resolveName(occ, R1, withCham))[2] - 6) < 1e-6);

  // Retargeting the pull at a different sketch must not silently rebind.
  check('a swept name whose sketch it no longer comes from resolves to null',
    topo.resolveName(occ, { ...E(0), from: 'sk9' }, a) === null);

  // ---- spin -------------------------------------------------------------
  const spin = (angle, offset) => globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'sk1', kind: 'sketch', plane: 'xy', offset,
      points: [[10, 0], [20, 0], [20, 8], [10, 8]] },
    { id: 'r1', kind: 'revolve', target: 'sk1', angle },
  ] }, arc);
  const rCap = (end) => ({ cause: 'cap', feature: 'r1', kind: 'face', end });

  const quarter = spin(90, 0);
  check('a partial spin has caps, and they resolve',
    topo.resolveName(occ, rCap('bottom'), quarter) !== null
      && topo.resolveName(occ, rCap('top'), quarter) !== null);
  check('a FULL spin has none, and says so instead of handing back the profile',
    topo.resolveName(occ, rCap('bottom'), spin(360, 0)) === null
      && topo.resolveName(occ, rCap('top'), spin(360, 0)) === null,
    'FirstShape/LastShape still return the profile face at 360 -- a face that is '
      + 'not part of the solid at all');

  // The transform trap: a spin on an offset plane is built at the origin and
  // then moved. A face handed back unmoved would float where the part used to
  // be -- which looks like an answer and is not.
  const lifted = spin(90, 30);
  const cap = topo.resolveName(occ, rCap('bottom'), lifted);
  const solid = lifted.shapes.get('r1');
  check('a face of a spin that was moved afterwards lands ON the moved solid',
    cap !== null && hist.distanceTo(occ, occ.gp_Pnt.prototype ? new occ.gp_Pnt(...ctr(cap)) : null, solid) < 1e-6,
    cap === null ? 'null' : 'cap centres at ' + JSON.stringify(ctr(cap).map((n) => Number(n.toFixed(2))))
      + ' while the solid sits at z=30');
  // ...and it moved by exactly the offset. Measured against the same spin at
  // offset 0 rather than against a number typed here: the profile spans 8 up
  // from its plane, so the cap centres 4 above it either way, and asserting a
  // bare 30 would have been asserting the wrong thing. The DIFFERENCE is the
  // transform, and it is the whole claim.
  const flatCap = topo.resolveName(occ, rCap('bottom'), spin(90, 0));
  check('...having moved by exactly the sketch offset, not by nothing',
    cap !== null && flatCap !== null
      && Math.abs((ctr(cap)[2] - ctr(flatCap)[2]) - 30) < 1e-6,
    cap === null || flatCap === null ? 'null'
      : 'offset-0 cap at z=' + ctr(flatCap)[2].toFixed(2)
        + ', offset-30 cap at z=' + ctr(cap)[2].toFixed(2));
}


// ---- the tools the parity list refused ----------------------------------
//
// .gauntlet/parity.json put Draft, Body Draft, Rib, External Thread, Split and
// Modify Fillet in "Kernel-dependent detail", refused because "each needs face
// or edge selection on a B-rep". That was true of the mesh engine and is the
// exact wall the naming slices were built to remove.
//
// Rounding ONE edge is the whole difference. What the app ships today is
// JSCAD's roundRadius, which rounds every edge of a box at once because a mesh
// has no edge to point at. Here the edge is named -- as the meeting of two
// named faces -- and the answer is checked against arithmetic, not a golden
// number: a fillet of radius r along a straight edge of length L removes
// exactly (1 - pi/4) * r^2 * L.

{
  const occ = globalThis.__oc;
  const topo = globalThis.__topo;
  const naming = globalThis.__name;
  const arc = globalThis.__arc;
  const build = (features) => globalThis.__adapter.buildDoc(occ, { version: 1, features }, arc);
  const vol = (s) => (s ? globalThis.__adapter.measureShape(occ, s).volume : NaN);

  const FACE = (part) => ({ cause: 'primitive', feature: 'b1', kind: 'face', part });
  const TOP_RIGHT = {
    cause: 'between', feature: 'b1', kind: 'edge', of: [FACE('+z'), FACE('+x')],
  };
  const bar = (w, d, h, extra) => build([
    { id: 'b1', kind: 'box', size: [w, d, h], center: [0, 0, 0] },
    ...(extra ? [extra] : []),
  ]);

  check('an edge is named by the two faces that meet at it, in a stable order',
    naming.formatName(TOP_RIGHT) === 'b1.edge[b1.face[+x] ^ b1.face[+z]]'
      && naming.formatName({ ...TOP_RIGHT, of: [FACE('+x'), FACE('+z')] })
         === naming.formatName(TOP_RIGHT),
    naming.formatName(TOP_RIGHT));

  const plain = bar(40, 30, 20);
  const edge = topo.resolveName(occ, TOP_RIGHT, plain);
  check('...and it resolves to a real edge on the solid', edge !== null);
  check('...while two faces that never meet resolve to nothing',
    topo.resolveName(occ, { ...TOP_RIGHT, of: [FACE('+z'), FACE('-z')] }, plain) === null,
    'the top and the bottom of a box share no edge');

  // ROUND one edge. Radius 4 along the 30-long edge.
  const loss = (r, L) => (1 - Math.PI / 4) * r * r * L;
  const R = (size, style) => ({
    id: 'r1', kind: 'fillet', target: 'b1', edge: TOP_RIGHT, size, style,
  });
  const rounded = bar(40, 30, 20, R(4, 'fillet'));
  check('Modify Fillet: one named edge is rounded, and only that one',
    Math.abs(vol(rounded.shapes.get('r1')) - (24000 - loss(4, 30))) < 0.01,
    'got ' + vol(rounded.shapes.get('r1')) + ', analytic ' + (24000 - loss(4, 30)).toFixed(4));
  check('...the rounded body replaces the sharp one rather than sitting inside it',
    globalThis.__types.topLevel({ version: 1, features: [
      { id: 'b1', kind: 'box', size: [40, 30, 20], center: [0, 0, 0] }, R(4, 'fillet')] })
      .map((f) => f.id).join(',') === 'r1');

  // THE CLAIM. Same name, different box, still the same edge -- and the loss
  // follows the NEW edge length, which is how we know it is that edge and not
  // a coincidence.
  const wide = bar(70, 12, 46, R(4, 'fillet'));
  check('the same edge name finds the same edge after a rebuild',
    Math.abs(vol(wide.shapes.get('r1')) - (70 * 12 * 46 - loss(4, 12))) < 0.01,
    'got ' + vol(wide.shapes.get('r1')) + ', analytic ' + (70 * 12 * 46 - loss(4, 12)).toFixed(4));
  check('...and it is not a fixed edge: a different pair rounds a different one',
    Math.abs(vol(bar(70, 12, 46, { ...R(4, 'fillet'),
      edge: { ...TOP_RIGHT, of: [FACE('+z'), FACE('+y')] } }).shapes.get('r1'))
      - (70 * 12 * 46 - loss(4, 70))) < 0.01,
    'the top-front edge runs the 70 way, so it should cost 70/12 as much');

  // BEVEL: the same edge, cut flat. A chamfer of distance d removes half of
  // what the square d x d corner would, so d^2 * L / 2.
  const bevelled = bar(40, 30, 20, R(4, 'chamfer'));
  check('...and the same edge can be cut off flat instead',
    Math.abs(vol(bevelled.shapes.get('r1')) - (24000 - (16 * 30) / 2)) < 0.01,
    'got ' + vol(bevelled.shapes.get('r1')) + ', analytic ' + (24000 - 240));

  // An edge that cannot take the radius is refused, not silently ignored:
  // the part survives SHARP under the feature's own id AND the refusal is
  // recorded, so the timeline can mark the step and the panel can say why.
  // (This used to assert the feature produced nothing; that left the whole
  // model missing on screen, which is the policy buildDoc's fillet branch
  // now documents as the bug it closed.)
  const tooBig = bar(40, 30, 20, R(400, 'fillet'));
  check('a radius the edge cannot take keeps the part sharp and records a refusal',
    tooBig.refusals.has('r1') && Math.abs(vol(tooBig.shapes.get('r1')) - 24000) < 0.01,
    'refused: ' + tooBig.refusals.get('r1') + ', vol ' + vol(tooBig.shapes.get('r1')));
  const lostName = bar(40, 30, 20, { ...R(4, 'fillet'),
    edge: { ...TOP_RIGHT, of: [FACE('+z'), FACE('-z')] } });
  check('...and so does an edge name that does not resolve',
    lostName.refusals.has('r1') && Math.abs(vol(lostName.shapes.get('r1')) - 24000) < 0.01,
    'refused: ' + lostName.refusals.get('r1') + ', vol ' + vol(lostName.shapes.get('r1')));

  // DRAFT: tilt one face away from a neutral plane at the base.
  const D = (extra) => ({
    id: 'd1', kind: 'draft', target: 'b1', angle: 8, pull: 'z', neutral: -10, ...extra,
  });
  const one = bar(40, 30, 20, D({ face: FACE('+x') }));
  const oneVol = vol(one.shapes.get('d1'));
  check('Draft: one named face leans, and the part loses material',
    Number.isFinite(oneVol) && oneVol < 24000 && oneVol > 22000,
    'got ' + oneVol);
  check('...and a bigger angle takes more off',
    vol(bar(40, 30, 20, D({ face: FACE('+x'), angle: 16 })).shapes.get('d1')) < oneVol);
  check('...while a zero angle changes nothing',
    Math.abs(vol(bar(40, 30, 20, D({ face: FACE('+x'), angle: 0 })).shapes.get('d1')) - 24000) < 0.01);

  // BODY DRAFT: every side face, so strictly more than one of them.
  const whole = vol(bar(40, 30, 20, D({ whole: true })).shapes.get('d1'));
  check('Body Draft: all four sides lean, so it takes more off than one face does',
    Number.isFinite(whole) && whole < oneVol,
    'one face ' + oneVol + ' vs whole body ' + whole);
  check('...and the two faces the pull points at are left alone',
    Math.abs(globalThis.__adapter.measureShape(occ, bar(40, 30, 20, D({ whole: true }))
      .shapes.get('d1')).bbox[1][2] - 10) < 1e-6,
    'the top should still be a flat face at z=10');
}

// ---------------------------------------------------------------------------
// THE SCRIPTING SURFACE'S VERDICTS, AGAINST THE ACTUAL BUILD
// ---------------------------------------------------------------------------
//
// lib/script-surface.ts classifies all 75 names the documented examples call,
// and every verdict rests on an OpenCascade export being there or not being
// there. Prose cannot hold that: the moment a different build is dropped in,
// half of it silently stops being true.
//
// So both directions are asserted, and the SECOND one is the one that matters.
// Checking that MakeBox exists is a formality. Checking that GTransform still
// does NOT exist is what stops `scale` staying refused out of habit after
// somebody rebuilds the bindings -- an absence nobody would notice becoming
// false is not a measurement, it is a note.

{
  const occ = globalThis.__oc;
  const surface = globalThis.__surface;
  const hull = globalThis.__hull;
  const has = (n) => n in occ;

  const present = [...new Set(surface.SURFACE.flatMap((e) => e.kernel || []))];
  const claimedMissing = [...new Set(surface.SURFACE.flatMap((e) => e.absent || []))];

  const notThere = present.filter((n) => !has(n));
  check('every export a served name relies on is in this build',
    notThere.length === 0, notThere.join(', '));
  check('...and there are enough of them for that to mean something',
    present.length >= 20, present.length + ' cited');

  const there = claimedMissing.filter((n) => has(n));
  check('every export a REFUSED name blames is genuinely absent',
    there.length === 0,
    there.join(', ') + ' -- this build now has it, so re-judge those names in '
      + 'lib/script-surface.ts rather than leaving them refused');
  check('...and the refusals actually name something to look for',
    claimedMissing.length >= 2, claimedMissing.join(', '));

  // The hull verdict, measured rather than asserted from a name list: no export
  // in the whole build mentions one.
  check('nothing in the build offers a convex hull, under any spelling',
    Object.keys(occ).filter((k) => /hull/i.test(k)).length === 0,
    Object.keys(occ).filter((k) => /hull/i.test(k)).join(', '));
  check('...nor a helix, which is the same wall External Thread hits',
    Object.keys(occ).filter((k) => /helix/i.test(k)).length === 0,
    Object.keys(occ).filter((k) => /helix/i.test(k)).join(', '));

  // ---- the scale finding, demonstrated on a real solid --------------------
  //
  // The claim is narrow and easy to get wrong in either direction, so it is
  // built rather than argued: UNIFORM scaling works and lands on the exact
  // volume arithmetic predicts, and the unequal case has nothing to apply.
  const box = new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape();
  const vol3 = (s) => globalThis.__adapter.measureShape(occ, s).volume;
  check('a 10-cube measures 1000 before anything is done to it',
    Math.abs(vol3(box) - 1000) < 1e-6, String(vol3(box)));

  const t = new occ.gp_Trsf();
  t.SetScale(new occ.gp_Pnt(0, 0, 0), 2);
  const bigger = new occ.BRepBuilderAPI_Transform(box, t, true).Shape();
  check('uniform scale x2 gives exactly 8x the volume, so scale([2,2,2]) is fine',
    Math.abs(vol3(bigger) - 8000) < 1e-6, String(vol3(bigger)));

  // gp_GTrsf is bound and can be BUILT -- it is only the applying that is
  // missing, which is why the refusal is "unbound" and not "absent".
  const g = new occ.gp_GTrsf();
  g.SetValue(1, 1, 3);
  check('gp_GTrsf exists and takes an unequal stretch',
    Math.abs(g.Value(1, 1) - 3) < 1e-12, String(g.Value(1, 1)));
  check('...but nothing in this build applies one to a shape',
    !has('BRepBuilderAPI_GTransform'),
    'BRepBuilderAPI_GTransform is here now -- scale, scaleZ, transform and '
      + 'ellipsoid can be lifted from unbound to exact');
  check('...and BRepBuilderAPI_Transform will not take it in its place',
    (() => { try { new occ.BRepBuilderAPI_Transform(box, g, true); return false; }
      catch (e) { return true; } })(),
    'a GTrsf passed to the Trsf constructor was accepted, which would mean the '
      + 'unbound verdict is wrong');

  // ---- the hull we own, sewn into a real solid ----------------------------
  //
  // lib/hull.ts is checked against arithmetic in its own suite with no kernel
  // at all. What is checked HERE is the other half: that its triangles sew into
  // a closed solid OpenCascade agrees is a solid, and that the kernel's own
  // volume -- computed from the sewn faces, not from our arithmetic -- lands on
  // the same number. Two independent measurements of the same shape.
  const CUBE = [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
    [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
    [5, 5, 5],
  ];
  const h = hull.convexHull(CUBE);
  const sew = new occ.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
  for (const tri of h.triangles) {
    const poly = [];
    for (const i of tri) poly.push(new occ.gp_Pnt(CUBE[i][0], CUBE[i][1], CUBE[i][2]));
    const w = new occ.BRepBuilderAPI_MakeWire();
    for (let k = 0; k < 3; k++) {
      w.Add(new occ.BRepBuilderAPI_MakeEdge(poly[k], poly[(k + 1) % 3]).Edge());
    }
    sew.Add(new occ.BRepBuilderAPI_MakeFace(w.Wire(), true).Face());
  }
  sew.Perform(new occ.Message_ProgressRange());
  const shell = sew.SewedShape();
  const solid = new occ.BRepBuilderAPI_MakeSolid();
  solid.Add(occ.TopoDS.Shell(shell));
  const hullSolid = solid.Solid();
  check('our hull triangles sew into a shape the kernel calls a solid',
    !hullSolid.IsNull());
  check('...and the KERNEL measures it at the volume arithmetic predicted',
    Math.abs(vol3(hullSolid) - 1000) < 1e-6,
    'kernel ' + vol3(hullSolid) + ' vs ours ' + hull.hullVolume(CUBE, h));
  check('...having swallowed the interior point on the way',
    h.used.length === 8, JSON.stringify(h.used));

  // The stronger claim, and the one that survives changing the fixture: our
  // volume and the kernel's are computed from different things -- ours from the
  // triangle list by the divergence theorem, the kernel's from the sewn faces by
  // BRepGProp -- and they have to agree. Found by sabotage: lifting one corner
  // 2 mm moved BOTH to 1066.6666666666665 and 1066.6667, which is the pair
  // agreeing rather than one echoing the other.
  check('...and the two independent volumes agree to ten digits',
    Math.abs(vol3(hullSolid) - hull.hullVolume(CUBE, h)) < 1e-9 * 1000,
    'kernel ' + vol3(hullSolid) + ' vs ours ' + hull.hullVolume(CUBE, h));
}


// ---------------------------------------------------------------------------
// TESSELLATION: THE STEP THAT MAKES ANY OF THIS VISIBLE
// ---------------------------------------------------------------------------
//
// Every slice before this one ended at a volume number. A B-rep holds surfaces
// and trimming curves; a GPU draws triangles and nothing else, so until there
// was a bridge the whole conversion could be measured and not seen.
//
// The two traps are silent, so both are measured rather than reasoned about: a
// face's TopLoc_Location (ignore it and every moved copy stacks at the origin)
// and its orientation (a REVERSED face's triangles are wound for the surface,
// not the solid). Neither throws. The SIGNED volume catches the second, which is
// why signedVolume exists at all -- an unsigned one cannot tell a correct mesh
// from a wholly inverted one.

{
  const occ = globalThis.__oc;
  const mesh = globalThis.__mesh;
  const exactCyl = Math.PI * 144 * 30;

  // ---- flat shapes are exact, and cost nothing extra ----------------------
  const box = new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape();
  const bg = mesh.tessellate(occ, box, { deflection: 0.05 });
  check('a box tessellates to exactly twelve triangles',
    mesh.triangleCount(bg) === 12, String(mesh.triangleCount(bg)));
  check('...enclosing exactly its own volume',
    Math.abs(mesh.signedVolume(bg) - 1000) < 1e-9, String(mesh.signedVolume(bg)));

  // THE ORIENTATION CONTROL. Positive is not incidental: a box's six faces come
  // back three FORWARD and three REVERSED, so a build that ignored orientation
  // would put half of them inside-out and land nowhere near +1000. Asserting the
  // SIGN separately from the magnitude is what makes that a real check.
  check('...with a POSITIVE sign, so the winding is outward not inward',
    mesh.signedVolume(bg) > 0, String(mesh.signedVolume(bg)));

  // Flat faces need no more triangles when the dial is turned up, which is the
  // control proving deflection only spends detail on curvature.
  const coarse = mesh.tessellate(occ, new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape(),
    { deflection: 1 });
  check('CONTROL: a loose deflection does not coarsen a flat shape',
    mesh.triangleCount(coarse) === 12
      && Math.abs(mesh.signedVolume(coarse) - 1000) < 1e-9,
    mesh.triangleCount(coarse) + ' tris, ' + mesh.signedVolume(coarse));

  // ---- curved shapes approach the truth as the dial tightens --------------
  const at = (d) => {
    const g = mesh.tessellate(occ, new occ.BRepPrimAPI_MakeCylinder(12, 30).Shape(),
      { deflection: d });
    return { tris: mesh.triangleCount(g), vol: mesh.signedVolume(g) };
  };
  const loose = at(0.05);
  const tight = at(0.005);
  check('a cylinder meshes under its exact volume, as an inscribed solid must',
    loose.vol < exactCyl && tight.vol < exactCyl,
    loose.vol + ' / ' + tight.vol + ' against ' + exactCyl);
  check('...and a tighter deflection gets closer to it',
    Math.abs(tight.vol - exactCyl) < Math.abs(loose.vol - exactCyl),
    'loose ' + loose.vol.toFixed(4) + ', tight ' + tight.vol.toFixed(4));
  check('...by spending triangles to do it',
    tight.tris > loose.tris * 2, loose.tris + ' -> ' + tight.tris);

  // The default already beats what ships. JSCAD's 32-segment cylinder measures
  // 13484.6431, which is 0.64% low.
  check('the default deflection beats the JSCAD mesh it replaces',
    Math.abs(loose.vol - exactCyl) < Math.abs(13484.6431 - exactCyl),
    'ours ' + loose.vol.toFixed(4) + ' vs JSCAD 13484.6431, exact ' + exactCyl.toFixed(4));

  // THE ANGULAR FINDING. Three linear deflections give byte-identical meshes,
  // because below ~0.1 on a shape this size the 0.3 rad angular tolerance is
  // already the tighter constraint. Recorded as an assertion rather than a
  // comment: someone tuning quality with the obvious parameter needs to know it
  // stops responding, and if a future kernel changes that, this says so.
  check('below a point, linear deflection stops being the binding constraint',
    at(1).tris === at(0.1).tris && at(1).tris === at(0.5).tris,
    'd=1 ' + at(1).tris + ', d=0.5 ' + at(0.5).tris + ', d=0.1 ' + at(0.1).tris);
  check('...while the ANGULAR dial still moves it',
    mesh.triangleCount(mesh.tessellate(occ,
      new occ.BRepPrimAPI_MakeCylinder(12, 30).Shape(), { deflection: 1, angular: 0.1 }))
      > at(1).tris,
    'tightening angular at the same deflection must add triangles');

  // ---- the location trap --------------------------------------------------
  //
  // Invisible on a primitive at the origin and wrong the moment anything moves,
  // which is the worst order to find a bug in. Measured by where the triangles
  // actually are, not by whether the call succeeded.
  const bounds = (g) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of g.polygons) for (const v of p.vertices) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < lo[i]) lo[i] = v[i];
        if (v[i] > hi[i]) hi[i] = v[i];
      }
    }
    return [lo, hi];
  };
  const moved = globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'b1', kind: 'box', size: [10, 10, 10], center: [50, 0, 0] },
  ] }).shapes.get('b1');
  const mg = mesh.tessellate(occ, moved, { deflection: 0.05 });
  const [mlo, mhi] = bounds(mg);
  check('a moved solid meshes where it actually sits, not at the origin',
    Math.abs(mlo[0] - 45) < 1e-6 && Math.abs(mhi[0] - 55) < 1e-6,
    'x spans ' + mlo[0] + ' to ' + mhi[0] + ', expected 45 to 55');
  check('...still enclosing the same volume it did before it moved',
    Math.abs(mesh.signedVolume(mg) - 1000) < 1e-9, String(mesh.signedVolume(mg)));

  // ---- a real document, not just primitives -------------------------------
  //
  // The end of the chain the whole conversion is for: a ModelDoc through
  // occt-build, through a boolean, out as triangles. The kernel's own volume and
  // the triangles' volume are computed from different things and must agree.
  const cut = globalThis.__adapter.buildDoc(occ, { version: 1, features: [
    { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
    { id: 'c1', kind: 'cylinder', radius: 8, height: 40, center: [0, 0, 0] },
    { id: 'op1', kind: 'combine', op: 'subtract', targets: ['b1', 'c1'] },
  ] }).shapes.get('op1');
  const cg = mesh.tessellate(occ, cut, { deflection: 0.02 });
  const kernelVol = globalThis.__adapter.measureShape(occ, cut).volume;
  check('a drilled plate from a real ModelDoc tessellates',
    cg !== null && mesh.triangleCount(cg) > 50, String(mesh.triangleCount(cg)));
  check('...and the triangles agree with the kernel to within the deflection',
    Math.abs(mesh.signedVolume(cg) - kernelVol) / kernelVol < 0.002,
    'mesh ' + mesh.signedVolume(cg).toFixed(4) + ' vs kernel ' + kernelVol.toFixed(4));
  check('...with the hole really removed, not merely subtracted on paper',
    mesh.signedVolume(cg) < 40 * 40 * 20 * 0.95,
    String(mesh.signedVolume(cg)));

  // ---- the shape handed back is the renderer's own -------------------------
  //
  // Not a new format: a plain JSCAD geom3, so the existing regl renderer draws
  // an OpenCascade solid with no change to the renderer, the runner, or the
  // preview component. A wrapper here would have made the swap all-or-nothing.
  check('the result is a geom3 the existing renderer already understands',
    Array.isArray(cg.polygons) && Array.isArray(cg.transforms)
      && cg.transforms.length === 16
      && cg.polygons.every((p) => Array.isArray(p.vertices) && p.vertices.length === 3
        && p.vertices.every((v) => v.length === 3 && v.every(Number.isFinite))),
    'a malformed polygon list renders as nothing, silently');
  check('an empty or null shape gives null rather than a blank canvas',
    mesh.tessellate(occ, null) === null);
}


// ---------------------------------------------------------------------------
// THE RECIPES, BUILT RATHER THAN CLAIMED
// ---------------------------------------------------------------------------
//
// lib/script-surface.ts calls seventeen names `recipe`: no single OpenCascade
// call, but buildable from ones it has. Every one of those was a CLAIM -- a
// sentence saying what it would be built from, with nothing built. The
// presence/absence probe above does not touch them: it checks that the cited
// exports exist, which is a long way from checking that they compose into the
// shape the name promises.
//
// So each construction is performed here and measured against arithmetic. Not a
// recorded number -- a hexagon's area, a frustum's volume, an offset polygon's
// area are all things a formula knows, and a recipe that builds the wrong thing
// moves a number the formula does not.
//
// `proved` is collected as it goes and checked against SURFACE at the end, so a
// `proof:` field naming a check that does not exist fails rather than reads
// nicely. That control is the point: without it the field is decoration.

const proved = new Set();

{
  const occ = globalThis.__oc;
  const gp = (s, kind) => {
    const g = new occ.GProp_GProps();
    if (kind === 'v') occ.BRepGProp.VolumeProperties(s, g, true, false, false);
    else occ.BRepGProp.SurfaceProperties(s, g, false, false);
    return g.Mass();
  };
  const P = (x, y, z) => new occ.gp_Pnt(x, y, z);
  const wireOf = (pts) => {
    const w = new occ.BRepBuilderAPI_MakeWire();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      w.Add(new occ.BRepBuilderAPI_MakeEdge(P(a[0], a[1], a[2]), P(b[0], b[1], b[2])).Edge());
    }
    return w.Wire();
  };
  const faceOf = (w) => new occ.BRepBuilderAPI_MakeFace(w, false).Face();
  const prism = (f, h) => new occ.BRepPrimAPI_MakePrism(f, new occ.gp_Vec(0, 0, h), false, true).Shape();
  const close = (a, b, tol) => Math.abs(a - b) < (tol === undefined ? 1e-6 : tol);

  // ---- polygon: edges into a wire into a face -----------------------------
  //
  // BRepBuilderAPI_MakePolygon is NOT bound in this build, which is why this is
  // a recipe rather than exact. A regular hexagon of circumradius R has area
  // (3*sqrt(3)/2) R^2, so extruding it is a number arithmetic already knows.
  {
    const hex = [];
    for (let i = 0; i < 6; i++) {
      hex.push([10 * Math.cos((i * Math.PI) / 3), 10 * Math.sin((i * Math.PI) / 3), 0]);
    }
    const v = gp(prism(faceOf(wireOf(hex)), 5), 'v');
    check('recipe polygon: a hexagon wire extrudes to its analytic volume',
      close(v, (3 * Math.sqrt(3) / 2) * 100 * 5, 1e-4),
      v + ' vs ' + ((3 * Math.sqrt(3) / 2) * 100 * 5));
    // CONTROL: the same recipe with a different corner count must land on a
    // DIFFERENT analytic answer, or the check would pass on a hard-coded shape.
    const sq = gp(prism(faceOf(wireOf([[-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0]])), 5), 'v');
    check('...and a square through the same path gives the square answer',
      close(sq, 400 * 5, 1e-4), String(sq));
    proved.add('polygon-wire');
  }

  // ---- polyhedron: planar faces sewn into a shell, then a solid -----------
  {
    const T = [[0, 0, 0], [6, 0, 0], [0, 9, 0], [0, 0, 4]];
    const tris = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
    const sew = new occ.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
    for (const t of tris) sew.Add(faceOf(wireOf(t.map((i) => T[i]))));
    sew.Perform(new occ.Message_ProgressRange());
    const sol = new occ.BRepBuilderAPI_MakeSolid();
    sol.Add(occ.TopoDS.Shell(sew.SewedShape()));
    const v = gp(sol.Solid(), 'v');
    check('recipe polyhedron: four triangles sew into a solid of |det|/6',
      close(v, 36, 1e-6), String(v));
    proved.add('sewn-solid');
  }

  // ---- cylinderElliptic: a loft between two ellipses ----------------------
  //
  // MakeCone is circular only. An elliptic prism is a ThruSections between two
  // ellipse wires, and its volume is pi*a*b*h exactly -- a real ellipse, not a
  // polygon approximating one, which is the whole gain over the mesh engine.
  {
    const ell = (z) => {
      const ax = new occ.gp_Ax2(P(0, 0, z), new occ.gp_Dir(0, 0, 1));
      const w = new occ.BRepBuilderAPI_MakeWire();
      w.Add(new occ.BRepBuilderAPI_MakeEdge(new occ.gp_Elips(ax, 12, 6)).Edge());
      return w.Wire();
    };
    const mk = new occ.BRepOffsetAPI_ThruSections(true, false, 1e-6);
    mk.AddWire(ell(0));
    mk.AddWire(ell(20));
    mk.Build(new occ.Message_ProgressRange());
    const v = gp(mk.Shape(), 'v');
    check('recipe cylinderElliptic: a loft of two ellipses measures pi*a*b*h',
      close(v, Math.PI * 12 * 6 * 20, 1e-4),
      v + ' vs ' + (Math.PI * 12 * 6 * 20));
    proved.add('loft-ellipses');
  }

  // ---- extrudeFromSlices: the same loft, between unequal sections ---------
  //
  // A frustum, whose volume is h/3 (A1 + A2 + sqrt(A1 A2)). Narrower than the
  // JSCAD original, honestly: that one takes a callback that can emit a twisted
  // run ThruSections refuses rather than quietly triangulating.
  {
    const mk = new occ.BRepOffsetAPI_ThruSections(true, true, 1e-6);
    mk.AddWire(wireOf([[-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0]]));
    mk.AddWire(wireOf([[-5, -5, 30], [5, -5, 30], [5, 5, 30], [-5, 5, 30]]));
    mk.Build(new occ.Message_ProgressRange());
    const v = gp(mk.Shape(), 'v');
    check('recipe extrudeFromSlices: a square frustum measures h/3(A1+A2+sqrt(A1A2))',
      close(v, (30 / 3) * (400 + 100 + Math.sqrt(400 * 100)), 1e-4), String(v));
    proved.add('loft-frustum');
  }

  // ---- extrudeRectangular: offset the outline, then extrude ---------------
  //
  // Offsetting a convex outline outward by t adds P*t + pi*t^2 to its area: the
  // straight strips along each side, plus the corner arcs, which together make
  // exactly one full circle however many corners there are. That last part is
  // what makes this a real check rather than a tautology -- a join style that
  // mitred the corners instead of rounding them would land on a different
  // number.
  {
    const sq = wireOf([[-10, -10, 0], [10, -10, 0], [10, 10, 0], [-10, 10, 0]]);
    const mk = new occ.BRepOffsetAPI_MakeOffset(faceOf(sq), occ.GeomAbs_JoinType.GeomAbs_Arc, false);
    mk.Perform(3, 0);
    const a = gp(faceOf(occ.TopoDS.Wire(mk.Shape())), 's');
    check('recipe extrudeRectangular: an offset outline grows by P*t + pi*t^2',
      close(a, 400 + 80 * 3 + Math.PI * 9, 1e-4),
      a + ' vs ' + (400 + 80 * 3 + Math.PI * 9));
    proved.add('offset-wire');
  }

  // ---- scission: walk the solids of a compound ----------------------------
  //
  // A B-rep knows what is connected to what without being asked, so splitting a
  // shape into its disjoint pieces is an explorer rather than an algorithm.
  {
    const a = new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape();
    const t = new occ.gp_Trsf();
    t.SetTranslation(new occ.gp_Vec(50, 0, 0));
    const b = new occ.BRepBuilderAPI_Transform(
      new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape(), t, false).Shape();
    const fuse = new occ.BRepAlgoAPI_Fuse(a, b, new occ.Message_ProgressRange());
    fuse.Build(new occ.Message_ProgressRange());
    const exp = new occ.TopExp_Explorer(fuse.Shape(),
      occ.TopAbs_ShapeEnum.TopAbs_SOLID, occ.TopAbs_ShapeEnum.TopAbs_SHAPE);
    const vols = [];
    while (exp.More()) { vols.push(gp(exp.Current(), 'v')); exp.Next(); }
    check('recipe scission: fusing two separated boxes leaves TWO solids',
      vols.length === 2 && vols.every((v) => close(v, 1000, 1e-6)),
      vols.length + ' solids: ' + vols.join(', '));
    // CONTROL: overlapping boxes must come back as ONE, or the explorer is
    // simply counting inputs rather than measuring connectivity.
    const t2 = new occ.gp_Trsf();
    t2.SetTranslation(new occ.gp_Vec(5, 0, 0));
    const c = new occ.BRepBuilderAPI_Transform(
      new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape(), t2, false).Shape();
    const f2 = new occ.BRepAlgoAPI_Fuse(a, c, new occ.Message_ProgressRange());
    f2.Build(new occ.Message_ProgressRange());
    const e2 = new occ.TopExp_Explorer(f2.Shape(),
      occ.TopAbs_ShapeEnum.TopAbs_SOLID, occ.TopAbs_ShapeEnum.TopAbs_SHAPE);
    let n2 = 0;
    while (e2.More()) { n2++; e2.Next(); }
    check('...while two OVERLAPPING boxes leave one', n2 === 1, String(n2));
    proved.add('explode-solids');
  }

  // ---- bbox arithmetic: center, align, measureDimensions ------------------
  //
  // AND A REAL TRAP IN IT. BRepBndLib.Add returns a box with a GAP added --
  // measured here at 1e-7 per side, so a 10 x 20 x 30 solid reports
  // 10.0000002 wide. Harmless in a preview and wrong in a measurement a student
  // is asked to read out loud, which is exactly what measureDimensions is for.
  // SetGap(0) clears it, and the two are asserted separately so the gap cannot
  // come back unnoticed.
  {
    const s = new occ.BRepPrimAPI_MakeBox(10, 20, 30).Shape();
    const bb = new occ.Bnd_Box();
    occ.BRepBndLib.Add(s, bb, true);
    const padded = bb.CornerMax().X() - bb.CornerMin().X();
    check('the kernel bounding box arrives PADDED, not exact',
      padded > 10 && padded < 10.001, String(padded));
    bb.SetGap(0);
    const lo = bb.CornerMin();
    const hi = bb.CornerMax();
    check('recipe measureDimensions: SetGap(0) makes it exact',
      close(hi.X() - lo.X(), 10, 1e-9)
        && close(hi.Y() - lo.Y(), 20, 1e-9)
        && close(hi.Z() - lo.Z(), 30, 1e-9),
      [hi.X() - lo.X(), hi.Y() - lo.Y(), hi.Z() - lo.Z()].join(', '));
    check('recipe center/align: the box corner is where the arithmetic says',
      close(lo.X(), 0, 1e-9) && close(hi.Z(), 30, 1e-9),
      lo.X() + ' .. ' + hi.Z());
    proved.add('bbox-arithmetic');
  }

  // ---- aggregate measurements: summed, per shape --------------------------
  {
    const a = new occ.BRepPrimAPI_MakeBox(10, 10, 10).Shape();
    const b = new occ.BRepPrimAPI_MakeBox(20, 10, 10).Shape();
    check('recipe measureAggregateVolume: per-shape BRepGProp, summed',
      close(gp(a, 'v') + gp(b, 'v'), 3000, 1e-6),
      String(gp(a, 'v') + gp(b, 'v')));
    check('recipe measureAggregateArea: the same, on surface area',
      close(gp(a, 's') + gp(b, 's'), 600 + 1000, 1e-6),
      String(gp(a, 's') + gp(b, 's')));
    proved.add('gprop-sum');
  }

  // ---- turn: translate-to-middle, rotate, translate back -------------------
  //
  // reSHape's turn pivots a shape about its OWN bounding-box middle, not the
  // world origin -- api.turn in lib/occt-api.ts composes it from exactly the
  // three gp_Trsf calls performed here. A rotation that silently did nothing
  // would still leave the volume unchanged, so this has to show the shape
  // MOVED too: a box built away from the origin, turned 90 degrees, has to
  // come back centred on the SAME middle (the "in place" half) with its X and
  // Y extents swapped (the "it actually turned" half).
  {
    const raw = new occ.BRepPrimAPI_MakeBox(40, 20, 20).Shape();
    const away = new occ.gp_Trsf();
    away.SetTranslation(new occ.gp_Vec(40, 0, 0));
    const box = new occ.BRepBuilderAPI_Transform(raw, away, false).Shape();

    const before = new occ.Bnd_Box();
    occ.BRepBndLib.AddOptimal(box, before, true, true);
    before.SetGap(0);
    const bLo = before.CornerMin();
    const bHi = before.CornerMax();
    check('the box to turn sits at [40,0,0] .. [80,20,20], not the origin',
      close(bLo.X(), 40, 1e-6) && close(bHi.X(), 80, 1e-6) && close(bHi.Y(), 20, 1e-6),
      [bLo.X(), bHi.X(), bLo.Y(), bHi.Y()].join(', '));

    const mid = [(bLo.X() + bHi.X()) / 2, (bLo.Y() + bHi.Y()) / 2, (bLo.Z() + bHi.Z()) / 2];
    const toOrigin = new occ.gp_Trsf();
    toOrigin.SetTranslation(new occ.gp_Vec(-mid[0], -mid[1], -mid[2]));
    const atOrigin = new occ.BRepBuilderAPI_Transform(box, toOrigin, false).Shape();
    const spin = new occ.gp_Trsf();
    spin.SetRotation(new occ.gp_Ax1(P(0, 0, 0), new occ.gp_Dir(0, 0, 1)), Math.PI / 2);
    const spun = new occ.BRepBuilderAPI_Transform(atOrigin, spin, false).Shape();
    const back = new occ.gp_Trsf();
    back.SetTranslation(new occ.gp_Vec(mid[0], mid[1], mid[2]));
    const turned = new occ.BRepBuilderAPI_Transform(spun, back, false).Shape();

    const after = new occ.Bnd_Box();
    occ.BRepBndLib.AddOptimal(turned, after, true, true);
    after.SetGap(0);
    const aLo = after.CornerMin();
    const aHi = after.CornerMax();
    const aMid = [(aLo.X() + aHi.X()) / 2, (aLo.Y() + aHi.Y()) / 2, (aLo.Z() + aHi.Z()) / 2];
    check('recipe turn: the middle it pivots about does not move',
      close(aMid[0], mid[0], 1e-9) && close(aMid[1], mid[1], 1e-9) && close(aMid[2], mid[2], 1e-9),
      aMid.join(', ') + ' vs ' + mid.join(', '));
    check('...while a 90-degree turn swaps which way the box runs long',
      close(aHi.X() - aLo.X(), 20, 1e-6) && close(aHi.Y() - aLo.Y(), 40, 1e-6),
      'dx=' + (aHi.X() - aLo.X()) + ' dy=' + (aHi.Y() - aLo.Y()));
    check('...and the volume the pivot leaves untouched',
      close(gp(turned, 'v'), 40 * 20 * 20, 1e-6), String(gp(turned, 'v')));
    proved.add('turn-inplace-pivot');
  }
}

// ---- every recipe verdict now points at a proof that really ran ------------
{
  const surface = globalThis.__surface;
  const recipes = surface.SURFACE.filter((e) => e.serves === 'recipe');
  const unproven = recipes.filter((e) => !e.proof);
  check('every recipe verdict names the check that builds it',
    unproven.length === 0,
    unproven.map((e) => e.name).join(', ') + ' -- add a proof, or say honestly '
      + 'in the note that it is unbuilt');
  const dangling = [...new Set(recipes.map((e) => e.proof).filter(Boolean))]
    .filter((p) => !proved.has(p));
  check('...and every proof named is a check that actually ran',
    dangling.length === 0,
    dangling.join(', ') + ' -- named but never performed, which is the failure '
      + 'this control exists for');
  check('...with no proof left over, unclaimed by any name',
    [...proved].every((p) => recipes.some((e) => e.proof === p)),
    [...proved].filter((p) => !recipes.some((e) => e.proof === p)).join(', '));
}


if (fails.length === 0) {
  // Written only when everything passed, so the ledger can never advertise a
  // count that included failures.
  let sha = '';
  try {
    sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root })
      .toString().trim();
  } catch (e) { /* not a checkout */ }
  writeFileSync(LEDGER, JSON.stringify(
    { checks: pass, when: new Date().toISOString().slice(0, 10), sha }, null, 2) + '\n');
}

console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + ' checks'
  + (fails.length ? ', ' + fails.length + ' failed' : '') + ')');
process.exit(fails.length ? 1 : 0);
