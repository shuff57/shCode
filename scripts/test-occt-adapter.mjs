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

  // An edge that cannot take the radius is refused, not silently ignored.
  check('a radius the edge cannot take produces nothing, rather than a sharp body',
    bar(40, 30, 20, R(400, 'fillet')).shapes.get('r1') === undefined,
    'an over-large round must not quietly return the unrounded solid');
  check('...and neither does an edge name that does not resolve',
    bar(40, 30, 20, { ...R(4, 'fillet'),
      edge: { ...TOP_RIGHT, of: [FACE('+z'), FACE('-z')] } }).shapes.get('r1') === undefined);

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

console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + ' checks'
  + (fails.length ? ', ' + fails.length + ' failed' : '') + ')');
process.exit(fails.length ? 1 : 0);
