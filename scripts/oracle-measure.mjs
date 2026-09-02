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
const BOX_TOL = 0.01;

/** The fixtures. One per thing the core has to keep doing, kept deliberately
 *  small and legible -- a fixture nobody can picture is a fixture nobody can
 *  argue with when it disagrees. */
function fixtures(types) {
  const doc = (...features) => ({ version: 1, features });
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
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/model-types.ts', 'lib/model-codegen.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const types = require(path.join(out, 'model-types.js'));
  const gen = require(path.join(out, 'model-codegen.js'));

  const sandbox = makeSandbox();
  const M = sandbox.jscadModeling;
  results = {};
  for (const [name, doc] of Object.entries(fixtures(types))) {
    try {
      results[name] = measure(sandbox, M, gen.toReshape(doc));
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
  writeFileSync(BASELINE, JSON.stringify({ sha, takenAt: new Date().toISOString().slice(0, 10), models: results }, null, 2) + '\n');
  const broken = Object.entries(results).filter(([, r]) => r.error);
  console.log('recorded ' + Object.keys(results).length + ' models to .gauntlet/oracle.json at ' + sha.slice(0, 7));
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
  const db = Math.max(...want.bbox.flatMap((row, i) => row.map((v, j) => Math.abs(got.bbox[i][j] - v))));
  if (dv <= VOL_TOL && db <= BOX_TOL) {
    pass++;
    console.log('  PASS  ' + name + '  vol ' + got.volume + '  polys ' + want.polys + ' -> ' + got.polys);
  } else {
    fails.push(name);
    console.log('  FAIL  ' + name + ' -- volume ' + want.volume + ' -> ' + got.volume
      + ' (' + (dv * 100).toFixed(2) + '%), worst bbox corner off by ' + db.toFixed(4));
  }
}
console.log('');
console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + '/' + Object.keys(base.models).length
  + ' models match the oracle at ' + String(base.sha).slice(0, 7) + ')');
process.exit(fails.length ? 1 : 0);
