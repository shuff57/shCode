// The geometry ORACLE for the core replacement.
//
// reSHape's core is being replaced underneath a UI that stays exactly as it is.
// That makes the contract sharp: the same ModelDoc must produce the same solid,
// whatever kernel is under it. This records what the CURRENT core produces, in
// numbers, so the next one can be held to it.
//
// Why numbers and not screenshots: a kernel swap changes tessellation, normals,
// winding and triangle counts for reasons that are nobody's bug. Volume and
// bounding box do not move when the mesh is rebuilt differently -- they move
// when the SHAPE is wrong, which is the only question worth asking.
//
//   node scripts/oracle-measure.mjs --record    write .gauntlet/oracle.json
//   node scripts/oracle-measure.mjs             compare against it
//
// The baseline records the git sha it was taken at, so a disagreement can
// always be re-derived from a worktree at that sha rather than argued about.
//
// polys is recorded but NEVER compared: it is the mesh detail, which a new
// kernel is expected and allowed to change. It is here because a huge swing in
// it alongside a matching volume is worth a human look.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const BASELINE = path.join(root, '.gauntlet', 'oracle.json');
const record = process.argv.includes('--record');

// Tolerance. Volume is compared as a FRACTION because a big solid and a small
// one deserve different absolute slack; the bounding box is compared in sketch
// units because it is a position, and a position that is off by a millimetre is
// off wherever it sits.
const VOL_TOL = 0.005;
// Curved shapes get a looser one, and the reason is not sloppiness.
//
// JSCAD tessellates: a cylinder is a 32-sided prism, and a prism inscribed in
// a cylinder holds LESS than the cylinder. So the recorded volume for anything
// round is an artifact of one implementation's mesh density, not the truth.
// Measured 2026-09-01 against OpenCascade, which computes from the exact
// surface: cylinder r12 h30 is 13571.6803 by both OCCT and pi*r*r*h, and
// 13484.6431 by JSCAD -- 0.64% low. A sphere is 1.60% low.
//
// Holding an exact kernel to the tessellated number would fail the MORE
// correct answer for not being the old one, which is the same mistake the
// solver bar made about relaxation's exact length preservation. So a fixture
// that is round says so, and the `exact` field below records the analytic
// volume where arithmetic knows it -- that is the real target, and the
// tessellated value is what the current core happens to produce on the way.
const CURVED_VOL_TOL = 0.02;
const BOX_TOL = 0.01;

/** The fixtures. One per thing the core has to keep doing, kept deliberately
 *  small and legible -- a fixture nobody can picture is a fixture nobody can
 *  argue with when it disagrees. */
function fixtures(types) {
  const doc = (...features) => ({ version: 1, features });
  // A face/edge name, spelled exactly like the ones lib/occt-build.ts's own
  // fillet/draft checks already build (script comment "TOP_RIGHT" there) --
  // reused rather than reinvented so the same edge is what both this file and
  // the adapter's own hand test point at.
  const FACE = (part) => ({ cause: 'primitive', feature: 'b1', kind: 'face', part });
  const TOP_RIGHT = { cause: 'between', feature: 'b1', kind: 'edge', of: [FACE('+z'), FACE('+x')] };
  const sketch = (id, plane = 'xy', offset = 0, pts = null) => ({
    id, kind: 'sketch', plane, offset,
    points: pts || [[0, 0], [40, 0], [40, 25], [0, 25]],
  });
  const hex = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hex.push([12 * Math.cos(a), 12 * Math.sin(a)]);
  }
  return {
    box: doc({ id: 'b1', kind: 'box', size: [40, 30, 20], center: [0, 0, 0] }),
    'box-rounded': doc({ id: 'b1', kind: 'box', size: [40, 30, 20], center: [0, 0, 0], round: 4 }),
    cylinder: doc({ id: 'c1', kind: 'cylinder', radius: 12, height: 30, center: [0, 0, 0] }),
    cone: doc({ id: 'c1', kind: 'cone', radius: 12, height: 30, center: [0, 0, 0] }),
    sphere: doc({ id: 's1', kind: 'sphere', radius: 15, center: [0, 0, 0] }),
    torus: doc({ id: 't1', kind: 'torus', ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] }),

    'sketch-extrude': doc(sketch('sk1'), { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 }),
    'sketch-on-xz': doc(sketch('sk1', 'xz'), { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 }),
    'sketch-on-yz-offset': doc(sketch('sk1', 'yz', 10), { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 }),
    'sketch-revolve': doc(
      sketch('sk1', 'xz', 0, [[10, 0], [20, 0], [20, 30], [10, 30]]),
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ),
    // Three planes, one profile. These SHOULD differ and today they do not:
    // revolve does not go through extrudeOnPlane at all, it calls
    // extrudeRotate on the raw 2D profile, which sweeps around world Z
    // whatever plane the sketch sits on. Recorded so the defect is measured
    // rather than assumed, and so the day it is fixed, two of these three
    // move and the third does not.
    'revolve-on-xy': doc(
      sketch('sk1', 'xy', 0, [[10, 0], [20, 0], [20, 30], [10, 30]]),
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ),
    'revolve-on-yz': doc(
      sketch('sk1', 'yz', 0, [[10, 0], [20, 0], [20, 30], [10, 30]]),
      { id: 'r1', kind: 'revolve', target: 'sk1', angle: 360 },
    ),
    'circle-extrude': doc(
      { id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0, shape: 'circle', points: [[-15, 0], [15, 0]] },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 20 },
    ),
    'rounded-corner': doc(
      { ...sketch('sk1'), rounds: { 1: 6 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'chamfered-corner': doc(
      { ...sketch('sk1'), chamfers: { 1: 6 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'bowed-edge': doc(
      { ...sketch('sk1'), bulges: { 0: 0.4 } },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    blend: doc(
      { id: 'sa', kind: 'sketch', plane: 'xy', offset: 0, points: [[-20, -20], [20, -20], [20, 20], [-20, 20]] },
      { id: 'sb', kind: 'sketch', plane: 'xy', offset: 30, points: [[-5, -5], [5, -5], [5, 5], [-5, 5]] },
      { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
    ),
    'blend-mixed-corners': doc(
      { id: 'sa', kind: 'sketch', plane: 'xy', offset: 0, points: [[-20, -20], [20, -20], [20, 20], [-20, 20]] },
      { id: 'sb', kind: 'sketch', plane: 'xy', offset: 30, points: hex },
      { id: 'bl1', kind: 'blend', targets: ['sa', 'sb'] },
    ),

    'boolean-cut': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 8, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'subtract', targets: ['b1', 'c1'] },
    ),
    'boolean-union': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 8, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'union', targets: ['b1', 'c1'] },
    ),
    'boolean-intersect': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'c1', kind: 'cylinder', radius: 15, height: 40, center: [0, 0, 0] },
      { id: 'op1', kind: 'combine', op: 'intersect', targets: ['b1', 'c1'] },
    ),
    mirror: doc(
      { id: 'b1', kind: 'box', size: [20, 20, 20], center: [30, 0, 0] },
      { id: 'mir1', kind: 'mirror', target: 'b1', plane: 'yz' },
    ),
    moved: doc(
      { id: 'b1', kind: 'box', size: [20, 20, 20], center: [0, 0, 0] },
      { id: 'mv1', kind: 'move', target: 'b1', offset: [15, 5, 0] },
    ),
    turned: doc({ id: 'b1', kind: 'box', size: [40, 20, 10], center: [0, 0, 0], rotate: [0, 0, 45] }),

    // ---- the Build tools added since this oracle last grew: hole, shell,
    // pattern, a fillet/chamfer on a NAMED edge, and draft. All ten sit on
    // the same 40x40x20 box (b1, centred at the origin) unless noted, so a
    // reader can hold one shape in their head across the whole list.
    'hole-through': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 22, center: [0, 0, 0], axis: 'z' },
    ),
    // depth 10 on a 20-thick box: the bore spans z -5..5, entirely inside
    // the solid on both sides -- a pocket, not a through-hole.
    'hole-blind': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 10, center: [0, 0, 0], axis: 'z' },
    ),
    'hole-corners': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      {
        id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 22,
        center: [0, 0, 0], axis: 'z', corners: { dx: 15, dy: 10 },
      },
    ),
    'hole-x-axis': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 42, center: [0, 0, 0], axis: 'x' },
    ),
    'shell-2': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'shell1', kind: 'shell', target: 'b1', thickness: 2 },
    ),
    'pattern-linear-3': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'linear', count: 3, step: [60, 0, 0] },
    ),
    // A DIFFERENT target -- a small cube standing off-axis at [30,0,0] -- not
    // b1. Orbiting the world z axis at the origin, six 10-cubes spaced 60
    // degrees apart at radius 30: chord between neighbours is
    // 2*30*sin(30deg) = 30, against a rotated cube's own half-diagonal of
    // sqrt(5^2+5^2) = 7.07 -- nowhere near touching.
    'pattern-circular-6': doc(
      { id: 'b1', kind: 'box', size: [10, 10, 10], center: [30, 0, 0] },
      { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'circular', count: 6, axis: 'z', totalAngle: 360 },
    ),
    // Modify Fillet / Bevel / Draft do not build on JSCAD at all --
    // whyNotOnJscad() in lib/model-types.ts, and featureExpr()'s fillet/draft
    // branch in lib/model-codegen.ts passes the target straight through with
    // a comment. So JSCAD's own recorded number for these three is the PLAIN
    // BOX, unrounded -- that gap between engines is the finding these three
    // fixtures exist to measure, not a defect in the fixture.
    'round-one-edge': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'r1', kind: 'fillet', target: 'b1', edge: TOP_RIGHT, size: 4, style: 'fillet' },
    ),
    'bevel-one-edge': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'r1', kind: 'fillet', target: 'b1', edge: TOP_RIGHT, size: 4, style: 'chamfer' },
    ),
    'draft-one-face': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'd1', kind: 'draft', target: 'b1', angle: 8, pull: 'z', neutral: -10, face: FACE('+x') },
    ),
  };
}

/** Constrained sketches, for the SOLVER half of the core swap.
 *
 *  What is recorded is deliberately NOT where the corners landed. A solver
 *  that is free to satisfy a rule in more than one way will land somewhere of
 *  its own choosing, and holding the next one to relaxation's particular
 *  choice would fail a correct answer for not being the old answer. So the
 *  contract is the PROPERTY: which rules come out satisfied, whether the set
 *  is reported over-constrained, and whether a pinned corner stayed pinned.
 *  Positions are recorded beside it for a human to read, and never compared
 *  -- the same bargain `polys` gets above. */
function sketchFixtures() {
  const rect = () => [[0, 0], [40, 0], [40, 25], [0, 25]];
  const skew = () => [[0, 0], [40, 6], [40, 25], [0, 25]];
  const tri = () => [[0, 0], [40, 0], [20, 30]];
  return {
    'nothing-asked': { points: rect(), constraints: [] },
    horizontal: { points: skew(), constraints: [{ kind: 'horizontal', edge: 0 }] },
    vertical: { points: [[0, 0], [40, 0], [46, 25], [0, 25]], constraints: [{ kind: 'vertical', edge: 1 }] },
    length: { points: rect(), constraints: [{ kind: 'length', edge: 0, value: 30 }] },
    equal: { points: rect(), constraints: [{ kind: 'equal', edge: 0, other: 1 }] },
    parallel: { points: [[0, 0], [40, 0], [46, 25], [0, 25]], constraints: [{ kind: 'parallel', edge: 0, other: 2 }] },
    perpendicular: { points: [[0, 0], [40, 6], [40, 25], [0, 25]], constraints: [{ kind: 'perpendicular', edge: 0, other: 1 }] },
    'lock-holds-a-corner': { points: skew(), constraints: [
      { kind: 'horizontal', edge: 0 }, { kind: 'lock', corner: 0 }] },
    'a-real-square': { points: rect(), constraints: [
      { kind: 'horizontal', edge: 0 }, { kind: 'vertical', edge: 1 },
      { kind: 'horizontal', edge: 2 }, { kind: 'vertical', edge: 3 },
      { kind: 'equal', edge: 0, other: 1 }] },
    'two-lengths-one-edge': { points: rect(), constraints: [
      { kind: 'length', edge: 0, value: 40 }, { kind: 'length', edge: 0, value: 10 },
      { kind: 'length', edge: 1, value: 25 }] },
    'impossible-triangle': { points: tri(), constraints: [
      { kind: 'perpendicular', edge: 0, other: 1 },
      { kind: 'perpendicular', edge: 1, other: 2 },
      { kind: 'perpendicular', edge: 2, other: 0 }] },
  };
}

/** Solve one fixture and reduce it to the facts that any correct solver owes. */
function measureSketch(S, fx) {
  const solved = S.solveSketch(fx.points, fx.constraints);
  const residuals = S.residualsOf(solved.points, fx.constraints);
  const round = (n) => Math.round(n * 1e4) / 1e4;
  const locksHeld = fx.constraints
    .filter((c) => c.kind === 'lock')
    .map((c) => Math.hypot(
      solved.points[c.corner][0] - fx.points[c.corner][0],
      solved.points[c.corner][1] - fx.points[c.corner][1],
    ) < 1e-6);
  return {
    satisfied: residuals.map((r) => r <= 1e-3),
    overConstrained: solved.overConstrained,
    locksHeld,
    finite: solved.points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])),
    closed: solved.points.length === fx.points.length,
    _points: solved.points.map((p) => p.map(round)),
    _residual: round(solved.residual),
  };
}

function makeSandbox() {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.console = console;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(path.join(root, 'public/reshape/lib/jscad-modeling.min.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(path.join(root, 'public/reshape/reshape.js'), 'utf8'), sandbox);
  return sandbox;
}

/** Measure one generated program: volume, bounding box, triangle count. */
function measure(sandbox, M, src) {
  const mod = { exports: {} };
  const run = vm.runInContext('(function (require, module) {' + src + '\n})', sandbox);
  run((n) => {
    if (n !== '@jscad/modeling') throw new Error('unexpected require: ' + n);
    return M;
  }, mod);
  const params = {};
  for (const d of mod.exports.getParameterDefinitions()) params[d.name] = d.initial;
  const g = mod.exports.main(params);
  const list = Array.isArray(g) ? g : [g];
  const round = (n) => Math.round(n * 1e4) / 1e4;
  const bbox = M.measurements.measureBoundingBox(list.length === 1 ? list[0] : M.booleans.union(...list));
  return {
    volume: round(list.reduce((n, s) => n + M.measurements.measureVolume(s), 0)),
    bbox: bbox.map((v) => v.map(round)),
    polys: list.reduce((n, s) => n + M.geometries.geom3.toPolygons(s).length, 0),
  };
}

const out = mkdtempSync(path.join(tmpdir(), 'shcode-oracle-'));
let results;
let sketches;
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-types.ts', 'lib/model-codegen.ts', 'lib/sketch-solve.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const types = require(path.join(out, 'model-types.js'));
  const gen = require(path.join(out, 'model-codegen.js'));

  const solve = require(path.join(out, 'sketch-solve.js'));
  sketches = {};
  for (const [name, fx] of Object.entries(sketchFixtures())) {
    try { sketches[name] = measureSketch(solve, fx); }
    catch (e) { sketches[name] = { error: String((e && e.message) || e) }; }
  }

  const sandbox = makeSandbox();
  const M = sandbox.jscadModeling;
  results = {};
  // Analytic volumes, worked by hand. A fixture listed here is round, is
  // compared on the looser tolerance, and carries the number an exact kernel
  // should hit.
  const EXACT = {
    box: 40 * 30 * 20,
    cylinder: Math.PI * 12 * 12 * 30,
    cone: (Math.PI * 12 * 12 * 30) / 3,
    sphere: (4 / 3) * Math.PI * 15 * 15 * 15,
    torus: 2 * Math.PI * Math.PI * 14 * 4 * 4,
    'sketch-extrude': 40 * 25 * 12,
    'circle-extrude': Math.PI * 15 * 15 * 20,
    // A ring: outer 20, inner 10, 30 tall. pi*(R*R - r*r)*h. Spin tessellates
    // more coarsely than the primitives do -- JSCAD comes in 4.5% under this,
    // against 0.64% for a cylinder -- so these need the analytic target or an
    // exact kernel fails them for being right.
    'sketch-revolve': Math.PI * (20 * 20 - 10 * 10) * 30,
    'revolve-on-xy': Math.PI * (20 * 20 - 10 * 10) * 30,
    'revolve-on-yz': Math.PI * (20 * 20 - 10 * 10) * 30,

    // ---- the ten Build-tool fixtures. 32000 is the 40x40x20 box (b1) they
    // all start from unless noted.
    // Through hole: the bore (depth 22) exceeds the box's own 20-thick
    // extent, so only the box's height is actually removed: r=3, h=20.
    'hole-through': 32000 - Math.PI * 3 * 3 * 20,
    // Blind: the bore (depth 10) sits entirely inside the box, so its own
    // full height is what disappears.
    'hole-blind': 32000 - Math.PI * 3 * 3 * 10,
    // Four bores, same reasoning as hole-through, clear of each other and of
    // the box edges (centres +-15/+-10 from the middle of a 40x40 face).
    'hole-corners': 32000 - 4 * Math.PI * 3 * 3 * 20,
    // Bored along x: depth 42 exceeds the box's 40-wide x extent, so only
    // that 40 is removed.
    'hole-x-axis': 32000 - Math.PI * 3 * 3 * 40,
    // Shell: JSCAD's shellOp scales each axis by (size - 2*thickness)/size
    // about the bbox centre, which for an axis-aligned box IS the true
    // per-face offset -- 40x40x20 shelled by 2 leaves a 36x36x16 cavity.
    'shell-2': 32000 - 36 * 36 * 16,
    // Linear pattern: 3 copies 60 apart, each 40 wide -- clear by 20 on
    // every side, so three whole, unclipped boxes.
    'pattern-linear-3': 3 * 32000,
    // Circular pattern: see the fixture's own comment on why the six
    // 10-cubes at radius 30 never touch.
    'pattern-circular-6': 6 * 1000,
    // Round one edge (length 40, the box's y-run) at radius 4: a fillet
    // removes the corner of a quarter-circle from a square corner, i.e.
    // (1 - pi/4) of a 4x4 square, extruded along the 40-long edge.
    'round-one-edge': 32000 - (1 - Math.PI / 4) * 4 * 4 * 40,
    // Bevel the same edge: a chamfer takes off a right triangle whose two
    // legs are the cut size (4), i.e. half the 4x4 square, along the same
    // 40-long edge.
    'bevel-one-edge': 32000 - (4 * 4 * 40) / 2,
    // Draft: the +x face pivots at z=-10 (its own bottom, since the box runs
    // z -10..10) and leans 8 degrees over the 20-tall height. At the top the
    // face has swung in by 20*tan(8deg); the missing sliver is a right
    // triangle of base 20*tan(8deg) and height 20, run along the box's
    // 40-long y edge. The adapter's own draft check (bar(40,30,20) loses
    // material at this same angle/neutral) fixes the sign: material is LOST,
    // not gained.
    'draft-one-face': 32000 - ((20 * Math.tan((8 * Math.PI) / 180)) * 20) / 2 * 40,
  };
  const CURVED = new Set([
    'box-rounded', 'cylinder', 'cone', 'sphere', 'torus', 'sketch-revolve',
    'circle-extrude', 'rounded-corner', 'bowed-edge', 'boolean-cut',
    'revolve-on-xy', 'revolve-on-yz',
    'boolean-union', 'boolean-intersect',
    'hole-through', 'hole-blind', 'hole-corners', 'hole-x-axis',
  ]);
  // round-one-edge is deliberately NOT in CURVED: what JSCAD actually
  // records for it is a plain, sharp, six-face box (polys=6) -- the fillet
  // never ran -- so there is no tessellated curve here for JSCAD to be
  // measurably close to or far from. It gets its own rule via JSCAD_LACKS
  // below instead of the curved+exact one meant for tessellation error.
  // Fillet, chamfer and draft do not build on JSCAD at all -- whyNotOnJscad()
  // in lib/model-types.ts, and featureExpr()'s fillet/draft branch in
  // lib/model-codegen.ts passes the target straight through with a comment.
  // So JSCAD's own recorded number for these three is not a worse measurement
  // of the same shape (the way a tessellated cylinder is) -- it is the
  // UNMODIFIED target, because the feature never ran on this engine at all.
  // That is a different kind of disagreement than tessellation error, and
  // conflating the two let round-one-edge pass test-occt-adapter.mjs's
  // exact+curved check for the wrong reason: "moved off JSCAD" read as
  // "moved off a totally absent feature," not as "moved off tessellation
  // noise," which is what that check was built to detect. Flagging it here
  // lets the adapter give these three their own, honest rule instead.
  const JSCAD_LACKS = new Set(['round-one-edge', 'bevel-one-edge', 'draft-one-face']);
  for (const [name, doc] of Object.entries(fixtures(types))) {
    try {
      results[name] = measure(sandbox, M, gen.toReshape(doc));
      if (CURVED.has(name)) results[name].curved = true;
      if (JSCAD_LACKS.has(name)) results[name].jscadLacks = true;
      if (EXACT[name] !== undefined) {
        results[name].exact = Math.round(EXACT[name] * 1e4) / 1e4;
      }
    } catch (e) {
      results[name] = { error: String((e && e.message) || e) };
    }
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

let sha = 'unknown';
try {
  sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();
} catch { /* not a checkout */ }

if (record) {
  writeFileSync(BASELINE, JSON.stringify({ sha, takenAt: new Date().toISOString().slice(0, 10), models: results, sketches }, null, 2) + '\n');
  const broken = Object.entries(results).filter(([, r]) => r.error);
  console.log('recorded ' + Object.keys(results).length + ' models and '
    + Object.keys(sketches).length + ' constrained sketches to .gauntlet/oracle.json at ' + sha.slice(0, 7));
  for (const [n, r] of broken) console.log('  NOTE  ' + n + ' does not build: ' + r.error);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.log('no .gauntlet/oracle.json -- run with --record first');
  process.exit(1);
}
const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
let pass = 0;
const fails = [];
for (const [name, want] of Object.entries(base.models)) {
  const got = results[name];
  if (!got) { fails.push(name); console.log('  FAIL  ' + name + ' -- the new core does not build it at all'); continue; }
  if (want.error || got.error) {
    const same = Boolean(want.error) === Boolean(got.error);
    if (same) { pass++; console.log('  PASS  ' + name + ' (both refuse to build it, as recorded)'); }
    else { fails.push(name); console.log('  FAIL  ' + name + ' -- one core builds it and the other does not'); }
    continue;
  }
  const dv = Math.abs(got.volume - want.volume) / Math.max(1e-9, Math.abs(want.volume));
  const tol = want.curved ? CURVED_VOL_TOL : VOL_TOL;
  const db = Math.max(...want.bbox.flatMap((row, i) => row.map((v, j) => Math.abs(got.bbox[i][j] - v))));
  if (dv <= tol && db <= BOX_TOL) {
    pass++;
    console.log('  PASS  ' + name + '  vol ' + got.volume + '  polys ' + want.polys + ' -> ' + got.polys);
  } else {
    fails.push(name);
    console.log('  FAIL  ' + name + ' -- volume ' + want.volume + ' -> ' + got.volume
      + ' (' + (dv * 100).toFixed(2) + '%, limit ' + (tol * 100) + '%), worst bbox corner off by '
      + db.toFixed(4)
      + (want.exact !== undefined ? ' | exact would be ' + want.exact : ''));
  }
}
console.log('');
// The SOLVER half, compared on properties only. _points and _residual are
// recorded for a human and never checked: a different solver may satisfy the
// same rules from a different resting place and be exactly as correct. Holding
// the next one to relaxation's particular landing spot would fail a right
// answer for not being the old answer, which is the failure mode this whole
// oracle exists to avoid.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const [name, want] of Object.entries(base.sketches || {})) {
  const got = sketches[name];
  if (!got) {
    fails.push(name);
    console.log('  FAIL  sketch ' + name + ' -- the new solver does not handle it at all');
    continue;
  }
  const why = [];
  if (!same(got.satisfied, want.satisfied)) {
    why.push('rules met ' + JSON.stringify(want.satisfied) + ' -> ' + JSON.stringify(got.satisfied));
  }
  if (got.overConstrained !== want.overConstrained) {
    why.push('overConstrained ' + want.overConstrained + ' -> ' + got.overConstrained);
  }
  if (!same(got.locksHeld, want.locksHeld)) why.push('a pinned corner moved');
  if (!got.finite) why.push('produced a non-finite point');
  if (!got.closed) why.push('changed the corner count');
  if (why.length) {
    fails.push(name);
    console.log('  FAIL  sketch ' + name + ' -- ' + why.join('; '));
  } else {
    pass++;
    console.log('  PASS  sketch ' + name + '  '
      + want.satisfied.filter(Boolean).length + '/' + want.satisfied.length + ' rules met'
      + (want.overConstrained ? ', over-constrained as recorded' : ''));
  }
}

console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + '/' + (Object.keys(base.models).length + Object.keys(base.sketches || {}).length)
  + ' models and sketches match the oracle at ' + String(base.sha).slice(0, 7) + ')');
process.exit(fails.length ? 1 : 0);
