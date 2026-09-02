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
      'lib/occt-build.ts', 'lib/model-types.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const adapter = require(path.join(out, 'occt-build.js'));

  const oc = await (await import(pathToFileURL(path.join(dir, 'replicad_single.js')).href)).default();
  console.log('OpenCascade up, ' + Object.keys(oc).length + ' exports\n');

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
      const built = adapter.buildDoc(oc, { version: 1, features });
      const last = built.get(features[features.length - 1].id);
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

console.log('');
console.log((fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + ' checks'
  + (fails.length ? ', ' + fails.length + ' failed' : '') + ')');
process.exit(fails.length ? 1 : 0);
