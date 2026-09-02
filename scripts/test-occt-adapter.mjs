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

const dir = process.env.OCCT_DIR;
if (!dir || !existsSync(path.join(dir, 'replicad_single.js'))) {
  console.log('SKIPPED — set OCCT_DIR to a directory containing replicad_single.js');
  console.log('          (this is a skip, not a pass: nothing was measured)');
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

  const oc = await (await import(pathToFileURL(path.join(dir, 'replicad_single.js')).href)).default();
  console.log('OpenCascade up, ' + Object.keys(oc).length + ' exports\n');

  // The rebuild-identity block at the bottom runs after this try/finally has
  // closed, so it cannot see these bindings. Handing them over explicitly is
  // uglier than nesting and keeps the two concerns readable apart.
  globalThis.__oc = oc;
  globalThis.__adapter = adapter;
  globalThis.__topo = topo;
  globalThis.__hist = hist;
  globalThis.__name = naming;

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
      { shapes: new Map([['b1', after]]), ops: new Map() }) === null,
    'swept names need sweep bookkeeping, which this slice does not have');
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
console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + ' checks'
  + (fails.length ? ', ' + fails.length + ' failed' : '') + ')');
process.exit(fails.length ? 1 : 0);
