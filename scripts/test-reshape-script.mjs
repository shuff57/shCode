// Tests lib/reshape-script.ts (the DSL interpreter) and lib/reshape-script-gen.ts
// (its codegen twin), per .gauntlet/SPEC-reshape-script.md's "bar for the loop
// that builds it".
//
// THREE THINGS ARE CHECKED, IN ORDER:
//
//   (a) round-trip: every geometry fixture in scripts/oracle-measure.mjs, run
//       through toScript() and back through runScript(), produces a doc equal
//       to the original UP TO IDS AND DEFAULTS -- see reshape-script.ts's own
//       header, and reshape-script-gen.ts's file header on why a script
//       variable's name is not the same claim as a doc id. "Up to ids" is
//       compared structurally: build a position-indexed id map between the
//       two feature lists, remap the original doc's ids/target refs/TopoName
//       roots through it, and deep-equal what is left (floats to 1e-6, since
//       ring()'s (across - tubeAcross) / 2 and similar derived arithmetic can
//       differ from a literal by rounding noise that carries no meaning).
//
//       oracle-measure.mjs's fixtures() is not imported: importing it would
//       run its entire body as a side effect (it compiles TypeScript, spins
//       up a JSCAD sandbox, and calls process.exit() at the end) rather than
//       just handing over a function. So the SAME fixture set is copied here,
//       verbatim where the doc shape allows -- see FIXTURES below, and the
//       one exclusion's own comment.
//
//   (b) the spec's own Language section examples, run through runScript() and
//       then buildDoc() on a real OpenCascade kernel, measured against a
//       volume/bbox this file derives by hand (the same discipline
//       oracle-measure.mjs's EXACT map already uses for box/cylinder/sphere/
//       hole-through/etc, and the identical geometry for the shared ones, so
//       those numbers are re-used rather than re-derived).
//
//   (c) every refusal sentence a bad call should produce -- one assertion per
//       validation branch in reshape-script.ts, checked against the EXACT
//       text (a refusal that silently reworded itself is a defect the same
//       way a refusal that stopped firing is).
//
// Part (b) needs a real kernel and is SKIPPED (not failed) without one, same
// convention scripts/test-topo-resolve.mjs and scripts/test-occt-adapter.mjs
// already use -- see their own headers for why a skip prints how much it is
// skipping rather than going quietly green.
//
//   node scripts/test-reshape-script.mjs --occt public/reshape/kernel

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let pass = 0;
const fails = [];
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fails.push(name); console.log('  FAIL  ' + name + (detail ? '\n        ' + detail : '')); }
};

// ---------------------------------------------------------------------------
// FIXTURES -- copied from scripts/oracle-measure.mjs's fixtures(), not
// imported. See this file's own header for why.
// ---------------------------------------------------------------------------

function oracleFixtures() {
  const doc = (...features) => ({ version: 1, features });
  const FACE = (part) => ({ cause: 'primitive', feature: 'b1', kind: 'face', part });
  const TOP_RIGHT = { cause: 'between', feature: 'b1', kind: 'edge', of: [FACE('+z'), FACE('+x')] };
  // The default (no `pts` override) is what newSketch()/the Sketch tool
  // actually build, rectangle rules included (lib/model-types.ts's own
  // RECTANGLE_CONSTRAINTS) -- copied verbatim here, same "not imported"
  // discipline as the rest of this file's fixtures, so a change to that
  // constant is a change two places have to agree, on purpose. A CUSTOM
  // `pts` fixture is not built through newSketch()/newRectangleSketch() at
  // all (it is whatever shape the test wants), so it carries no rules of its
  // own -- reshape-script.ts's own sketch('top').polygon(...) does not
  // invent any either.
  const sketch = (id, plane = 'xy', offset = 0, pts = null) => ({
    id, kind: 'sketch', plane, offset,
    points: pts || [[0, 0], [40, 0], [40, 25], [0, 25]],
    ...(pts ? {} : {
      constraints: [
        { kind: 'horizontal', edge: 0 },
        { kind: 'vertical', edge: 1 },
        { kind: 'horizontal', edge: 2 },
        { kind: 'vertical', edge: 3 },
      ],
    }),
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
    // One fixture per Rules-panel rule kind (SPEC-d2-rules-in-script.md) --
    // each on the DEFAULT rectangle's own points, but with only the ONE rule
    // named (not the rectangle's usual four), which is exactly what forces
    // toScript() off the .rect() shortcut and onto the per-rule .polygon()
    // + call path this spec adds (hasRectangleConstraints() in
    // reshape-script-gen.ts requires an EXACT four-rule match). Every rule
    // here is already true of these exact points, so round-tripping never
    // asks the solver to move anything -- the fixture is testing that the
    // call is EMITTED and READ BACK, not that solving converges.
    'sketch-rule-across': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'horizontal', edge: 0 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-up': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'vertical', edge: 1 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-length': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'length', edge: 0, value: 40 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-equal': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'equal', edge: 1, other: 3 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-parallel': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'parallel', edge: 0, other: 2 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-perpendicular': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'perpendicular', edge: 0, other: 1 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    'sketch-rule-pin': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [40, 0], [40, 25], [0, 25]],
        constraints: [{ kind: 'lock', corner: 0 }],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    // Three rules at once, on a FREE outline (not axis-aligned, not born
    // from newSketch()'s rectangle default) -- the D2 evidence's own
    // reproduction shape. Edge 2 (from [30,20] to [10,35], dx=-20 dy=15) is
    // exactly 25 long, so the length rule is already satisfied and nothing
    // here needs the solver to move a point either.
    'sketch-rules-free-outline': doc(
      {
        id: 'sk1', kind: 'sketch', plane: 'xy', offset: 0,
        points: [[0, 0], [30, 0], [30, 20], [10, 35]],
        constraints: [
          { kind: 'horizontal', edge: 0 },
          { kind: 'vertical', edge: 1 },
          { kind: 'length', edge: 2, value: 25 },
        ],
      },
      { id: 'e1', kind: 'extrude', target: 'sk1', height: 12 },
    ),
    // 'bowed-edge' (a `bulges`-only sketch, no `rounds`) is EXCLUDED here on
    // purpose: model-types.ts's own doc comment on SketchFeature.bulges calls
    // that shape "a legacy or imported outline" -- something ELSE already
    // built the arc and this doc form passes it through untouched. There is
    // no script call that produces a bare bulge with no round request behind
    // it (sk.round() always writes `rounds`, per its own contract in
        // lib/reshape-script.ts), so this fixture is not reachable from the
    // language at all, by the same design that makes it a passthrough rather
    // than an editable feature in Build mode's own Rules panel.
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
    'hole-through': doc(
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 'hole1', kind: 'hole', target: 'b1', diameter: 6, depth: 22, center: [0, 0, 0], axis: 'z' },
    ),
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
    'pattern-circular-6': doc(
      { id: 'b1', kind: 'box', size: [10, 10, 10], center: [30, 0, 0] },
      { id: 'pat1', kind: 'pattern', target: 'b1', mode: 'circular', count: 6, axis: 'z', totalAngle: 360 },
    ),
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

// ---------------------------------------------------------------------------
// Structural "equal up to ids" comparator -- see the file header.
// ---------------------------------------------------------------------------

function remapId(id, map) {
  return map.has(id) ? map.get(id) : id;
}
function remapTopo(name, map) {
  if (!name || typeof name !== 'object') return name;
  const c = { ...name, feature: remapId(name.feature, map) };
  if (c.cause === 'between') c.of = c.of.map((n) => remapTopo(n, map));
  if (c.cause === 'carried' || c.cause === 'split') c.of = remapTopo(c.of, map);
  return c;
}
/** "Up to defaults" -- fill in the two fields a hand-written oracle fixture
 *  is allowed to omit but a REAL constructor never does: a box/cylinder's
 *  own round always gets a style (ModelEditor.tsx's round() stamps
 *  roundStyle on every whole-shape round, fillet included -- ​the oracle's
 *  'box-rounded' fixture just does not bother), and MoveFeature.copy is not
 *  even an optional field on the type (newMove() always writes it). Neither
 *  is a real ambiguity in the doc's meaning -- model-codegen.ts's own
 *  featureExpr() already reads a missing roundStyle as fillet -- so treating
 *  them as equal here is the comparator catching up to the constructors,
 *  not a loophole. */
function normalizeDefaults(f) {
  const c = { ...f };
  if (c.round !== undefined && c.roundStyle === undefined) c.roundStyle = 'fillet';
  if (c.kind === 'move' && c.copy === undefined) c.copy = false;
  return c;
}

function remapFeature(f, map) {
  const c = normalizeDefaults({ ...f, id: remapId(f.id, map) });
  if ('target' in c && typeof c.target === 'string') c.target = remapId(c.target, map);
  if ('targets' in c && Array.isArray(c.targets)) c.targets = c.targets.map((t) => remapId(t, map));
  if (c.kind === 'fillet') c.edge = remapTopo(c.edge, map);
  if (c.kind === 'draft' && c.face) c.face = remapTopo(c.face, map);
  if (c.kind === 'shell' && c.open) c.open = remapTopo(c.open, map);
  return c;
}

/** Deep-equal with a numeric tolerance -- ring()'s (across - tubeAcross) / 2
 *  and similar derived arithmetic can differ from the stored literal by
 *  floating-point noise that carries no geometric meaning. */
function closeEqual(a, b, path = '$') {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) ? null : `${path}: ${a} != ${b}`;
  }
  if (a === b) return null;
  if (a === null || b === null || a === undefined || b === undefined) return `${path}: ${a} != ${b}`;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return `${path}: array shape ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
    }
    for (let i = 0; i < a.length; i++) {
      const d = closeEqual(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const d = closeEqual(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

function docsEqualUpToIds(original, reconstructed) {
  if (original.features.length !== reconstructed.features.length) {
    return `feature count ${original.features.length} != ${reconstructed.features.length}`;
  }
  const map = new Map();
  original.features.forEach((f, i) => map.set(f.id, reconstructed.features[i].id));
  const remapped = original.features.map((f) => remapFeature(f, map));
  for (let i = 0; i < remapped.length; i++) {
    const d = closeEqual(remapped[i], reconstructed.features[i], `features[${i}] (${remapped[i].kind})`);
    if (d) return d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Compile lib/reshape-script.ts + lib/reshape-script-gen.ts + their deps.
// ---------------------------------------------------------------------------

const out = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-script-'));
let script, gen, types, codegen;
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/reshape-script.ts', 'lib/reshape-script-gen.ts',
      'lib/model-types.ts', 'lib/model-codegen.ts',
      'lib/sketch-arc.ts', 'lib/sketch-solve.ts', 'lib/topo-name.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  script = require(path.join(out, 'reshape-script.js'));
  gen = require(path.join(out, 'reshape-script-gen.js'));
  types = require(path.join(out, 'model-types.js'));
  codegen = require(path.join(out, 'model-codegen.js'));
} catch (e) {
  console.error('failed to compile lib/reshape-script.ts and friends: ' + (e && e.message ? e.message : e));
  rmSync(out, { recursive: true, force: true });
  process.exit(1);
}

// ---- (a) round-trip: every oracle fixture, toScript() then runScript() ----

console.log('=== (a) round-trip: oracle fixtures through toScript() -> runScript() ===');
for (const [name, doc] of Object.entries(oracleFixtures())) {
  let src, result;
  try {
    src = gen.toScript(doc);
  } catch (e) {
    check(name, false, 'toScript() threw: ' + (e && e.message ? e.message : e));
    continue;
  }
  result = script.runScript(src);
  if (result.errors.length) {
    check(name, false, 'runScript() on the generated source threw: ' + result.errors[0].message
      + '\n        generated:\n' + src.split('\n').map((l) => '          ' + l).join('\n'));
    continue;
  }
  const why = docsEqualUpToIds(doc, result.doc);
  check(name, !why, why ? why + '\n        generated:\n' + src.split('\n').map((l) => '          ' + l).join('\n') : undefined);
}

// ---- (c) refusals -----------------------------------------------------

console.log('\n=== (c) refusals -- exact sentence, not just "it threw" ===');
function refuses(name, src, wantSubstring) {
  const result = script.runScript(src);
  if (result.errors.length === 0) {
    check(name, false, 'did not throw at all');
    return;
  }
  const got = result.errors[0].message;
  check(name, got.includes(wantSubstring), `got: ${JSON.stringify(got)}\n        want it to include: ${JSON.stringify(wantSubstring)}`);
}
refuses('box() missing an argument', 'box(40, 40)', 'box needs a number for height');
refuses('box() given a string', 'box("wide", 40, 20)', 'has to be a number');
refuses('an unknown option key', 'box(40, 40, 20, { squish: 3 })', 'has no option called "squish"');
refuses('at needs three numbers', 'box(40, 40, 20, { at: [1, 2] })', 'needs three numbers');
refuses('hole() with no target', 'hole(5, { across: 6 })', 'hole() needs a shape');
refuses('hole() with no across', 'const b = box(40, 40, 20)\nhole(b, {})', 'hole() needs { across:');
refuses('holes() with no apart', 'const b = box(40, 40, 20)\nholes(b, { across: 6 })', 'holes() needs { apart:');
refuses('hollow() with no wall', 'const b = box(40, 40, 20)\nhollow(b, {})', 'hollow() needs { wall:');
refuses('round() on a hole', 'const b = box(40, 40, 20)\nhole(b, { across: 6 })\nround(b, 3)', 'Rounding works on the shape, not the hole');
refuses('round() on a sphere', 'const s = sphere(30)\nround(s, 3)', 'no edges to round');
refuses('bevel() on a whole shape', 'const b = box(40, 40, 20)\nbevel(b, 3)', 'bevel() needs one edge');
refuses('.edge() with the same face twice', 'const b = box(40, 40, 20)\nround(b.edge("top", "top"), 3)', 'two DIFFERENT faces');
refuses('.edge() with an unknown word', 'const b = box(40, 40, 20)\nround(b.edge("top", "diagonal"), 3)', 'does not know the face "diagonal"');
refuses('mirror() with a bad word', 'const b = box(40, 40, 20)\nmirror(b, "sideways")', "needs 'left-right'");
refuses('turn() on a hole', 'const b = box(40, 40, 20)\nhole(b, { across: 6 })\nturn(b, [0, 0, 45])', 'turn() only works on a shape you built directly');
refuses('repeatAround() on the axis', 'const b = box(40, 40, 20)\nrepeatAround(b, { count: 6 })', 'nothing to spin around');
refuses('join() with one shape', 'const b = box(40, 40, 20)\njoin(b)', 'join() needs two or more shapes');
refuses('param() reusing a name', 'param("wall", 2)\nparam("wall", 3)', 'already used the name "wall"');
refuses('sketch() with a bad plane', "sketch('under')", "needs a plane word");
refuses('.polygon() with two points', 'const sk = sketch("top")\nsk.polygon([[0,0],[1,1]])', 'at least three');
refuses('blend() with a solid', 'const b = box(40, 40, 20)\nblend(b, b, 20)', 'blend() needs two sketches');

// ---- negative/zero sizes are refused, not silently absorbed -----------
// Advanced-lens finding, 2026-09-04: box(-10, -10, -10) used to build a
// 10 mm box with no message (Math.abs()-shaped silent absorption
// somewhere down the line). Every size/across/tall/wall/deep argument now
// goes through positiveNumber() in lib/reshape-script.ts.
refuses('box() with a negative width', 'box(-10, 10, 10)', 'box(): a size has to be a positive number -- got -10 for width.');
refuses('box() with a zero height', 'box(10, 10, 0)', 'box(): a size has to be a positive number -- got 0 for height.');
refuses('cylinder() with a negative across', 'cylinder(-10, 10)', 'cylinder(): a size has to be a positive number -- got -10 for across.');
refuses('sphere() with a zero across', 'sphere(0)', 'sphere(): a size has to be a positive number -- got 0 for across.');
refuses('cone() with a negative tall', 'cone(10, -5)', 'cone(): a size has to be a positive number -- got -5 for tall.');
refuses('ring() with a negative tubeAcross', 'ring(40, -8)', 'ring(): a size has to be a positive number -- got -8 for tubeAcross.');
refuses(
  'hole() with a negative across',
  'const b = box(40, 40, 20)\nhole(b, { across: -6 })',
  'hole(): a size has to be a positive number -- got -6 for across.'
);
refuses(
  'hole() with a zero deep',
  'const b = box(40, 40, 20)\nhole(b, { across: 6, deep: 0 })',
  'hole(): a size has to be a positive number -- got 0 for deep.'
);
refuses(
  'hollow() with a negative wall',
  'const b = box(40, 40, 20)\nhollow(b, { wall: -2 })',
  'hollow(): a size has to be a positive number -- got -2 for wall.'
);
refuses(
  'box() with a negative corner',
  'box(40, 40, 20, { corner: -3 })',
  'box(): a size has to be a positive number -- got -3 for corner.'
);

// ---- count has to be a whole number of at least one --------------------
refuses(
  'repeat() with a zero count',
  'const b = box(10, 10, 10)\nrepeat(b, { count: 0, step: 20 })',
  'repeat(): count has to be a whole number of at least 1 -- got 0.'
);
refuses(
  'repeat() with a fractional count',
  'const b = box(10, 10, 10)\nrepeat(b, { count: 2.5, step: 20 })',
  'repeat(): count has to be a whole number of at least 1 -- got 2.5.'
);
refuses(
  'repeatAround() with a negative count',
  "const b = box(10, 10, 10, { at: [30, 0, 0] })\nrepeatAround(b, { count: -1, axis: 'z' })",
  'repeatAround(): count has to be a whole number of at least 1 -- got -1.'
);

// ---- a misspelled call gets the nearest VOCABULARY word, not a raw
// ReferenceError -- beginner-lens finding, 2026-09-04.
refuses('a misspelled call gets a "did you mean" hint', 'boxx(10)', 'boxx is not a tool here. Did you mean box()?');
refuses(
  'a misspelled step gets a "did you mean" hint',
  'const b = box(10, 10, 10)\nhollo(b, { wall: 2 })',
  'hollo is not a tool here. Did you mean hollow()?'
);
// A name far from every VOCABULARY word is a genuine undeclared variable,
// not a typo -- guessing a suggestion for it would be a worse answer than
// none, so the "Did you mean" half is dropped entirely.
refuses(
  'a name far from every tool gets no guess',
  'totallyUnrelatedName(10)',
  'totallyUnrelatedName is not a tool here.'
);
{
  const r = script.runScript('totallyUnrelatedName(10)');
  check(
    'the no-guess message really has no "Did you mean" in it',
    r.errors.length === 1 && !/Did you mean/.test(r.errors[0].message),
    JSON.stringify(r.errors)
  );
}
{
  // The line still points at the misspelled call, exactly like any other
  // refusal -- the message changed, the line-recovery machinery did not.
  const r = script.runScript('const b = box(10, 10, 10)\nboxx(b)');
  check(
    'the "did you mean" hint still carries the right line',
    r.errors.length === 1 && r.errors[0].line === 2,
    JSON.stringify(r.errors)
  );
}

// ---- a script that throws part-way keeps what ran before it ------------
// Advanced-lens finding, 2026-09-04: a throw used to leave ZERO chips in
// Build, discarding the steps that built successfully. runScript() itself
// already returned the partial doc alongside the error (docNow() runs
// unconditionally after the try/catch) -- what was missing was
// public/reshape/script-runner.html posting it. These two assert the
// CONTRACT runScript() promises; the browser-verified steps below assert
// the runner and the parent actually honour it.
console.log('\n=== (c2) a throw keeps the doc built so far ===');
{
  const r = script.runScript('const b = box(40, 40, 20)\nhole(b, { across: 6 })\nround(b, "oops")');
  check(
    'mid-script throw: the two good steps survive',
    r.doc.features.length === 2 && r.doc.features[0].kind === 'box' && r.doc.features[1].kind === 'hole',
    `got ${r.doc.features.length} feature(s): ${JSON.stringify(r.doc.features.map((f) => f.kind))}`
  );
  check('mid-script throw: the error is reported, with a line', r.errors.length === 1 && r.errors[0].line === 3, JSON.stringify(r.errors));
}
{
  const r = script.runScript('box("oops", 40, 20)');
  check(
    'first-line throw: the doc is empty (nothing to keep)',
    r.doc.features.length === 0,
    `got ${r.doc.features.length} feature(s)`
  );
  check('first-line throw: the error is reported, with a line', r.errors.length === 1 && r.errors[0].line === 1, JSON.stringify(r.errors));
}

// ---- param() survives Build -> Code without a drag ----------------------
// Advanced-lens finding, 2026-09-04: toScript(doc) used to regenerate
// `hollow(box1, { wall: 2 })` -- the name and bounds param('wall', 2, {...})
// declared were gone, so the panel fell back to the auto-derived 0.5-40
// instead of the declared 0.5-10. Fixed by carrying RunResult.namedParams
// (feature/slot bindings runScript() already computed) through to
// toScript(doc, namedParams).
console.log('\n=== (c3) param() round-trips through toScript(doc, namedParams) ===');
{
  const src = "const wall = param('wall', 2, { min: 0.5, max: 10 })\nconst b = box(40, 40, 20)\nhollow(b, { wall })";
  const first = script.runScript(src);
  check('param round-trip: the script runs clean', first.errors.length === 0, JSON.stringify(first.errors));
  check(
    'param round-trip: namedParams reports wall with its own bounds',
    first.namedParams.length === 1 && first.namedParams[0].name === 'wall'
      && first.namedParams[0].min === 0.5 && first.namedParams[0].max === 10
      && first.namedParams[0].slots.length === 1,
    JSON.stringify(first.namedParams)
  );
  const regenerated = gen.toScript(first.doc, first.namedParams);
  check(
    'toScript(doc, namedParams) re-declares param(\'wall\', ...) with its bounds',
    /param\('wall', 2, \{ min: 0\.5, max: 10 \}\)/.test(regenerated),
    regenerated
  );
  check(
    'toScript(doc, namedParams) uses `wall` in hollow(), not a literal 2',
    /hollow\([^)]*\{\s*wall\s*\}\)/.test(regenerated) && !/wall:\s*2\b/.test(regenerated),
    regenerated
  );
  const second = script.runScript(regenerated);
  check('the regenerated script itself runs clean', second.errors.length === 0, JSON.stringify(second.errors));
  const why = docsEqualUpToIds(first.doc, second.doc);
  check('runScript(toScript(doc, namedParams)).doc equals the original doc', !why, why);
  check(
    'the regenerated script STILL reports wall as a named param with the same bounds',
    second.namedParams.length === 1 && second.namedParams[0].name === 'wall'
      && second.namedParams[0].min === 0.5 && second.namedParams[0].max === 10,
    JSON.stringify(second.namedParams)
  );
  // Without namedParams (the ordinary Build-mode doc, never built by a
  // script), toScript() falls back to exactly today's literal-only output.
  const literalOnly = gen.toScript(first.doc);
  check(
    'toScript(doc) with no namedParams argument still emits a literal',
    /wall:\s*2\b/.test(literalOnly) && !/param\(/.test(literalOnly),
    literalOnly
  );

  // A Build-mode slider drag never touches namedParams -- it calls
  // applyParam() straight on the doc (the same path a real drag in the
  // Dimensions panel takes) -- so namedParams[0].value is now STALE (still
  // 2) while the doc itself says 7. Beginner-lens finding, 2026-09-04:
  // toScript() used to print the stale namedParams value, so a dragged
  // slider's new number never reached the regenerated param() line at all.
  const draggedDoc = codegen.applyParam(first.doc, first.namedParams[0].slots[0], 7);
  check('applyParam() actually changed the doc (sanity)', draggedDoc !== first.doc);
  const afterDrag = gen.toScript(draggedDoc, first.namedParams);
  check(
    "toScript(doc, namedParams) after a drag prints the DOC's current value, not the stale namedParams one",
    /param\('wall', 7,/.test(afterDrag) && !/param\('wall', 2,/.test(afterDrag),
    afterDrag
  );
}

// ---- the FULL Code -> Build -> Code -> Build -> drag -> Code sequence ---
// Regression, 2026-09-04 (team lead's independent browser pass): a param()
// survived ONE Code <-> Build round trip but was silently gone by the
// second, WITHOUT the student ever pressing Run again. Root cause was in
// components/SandboxWorkspace.tsx, not in this file's own functions: its
// loadDoc() regenerated the live `code` state via toScript(next) with NO
// namedParams argument, so the moment Code mode's ReshapePreview mounted
// fresh and auto-evaluated that stale text (a real re-run the student never
// asked for, indistinguishable to script-runner.html from one they did),
// the reply reported ZERO named params and overwrote the correct ones.
// This test cannot exercise the React component, but it can and does
// exercise the exact SEQUENCE of toScript()/runScript()/applyParam() calls
// that sequence produces at each step -- run, adopt with namedParams
// (loadDoc), auto-eval that same text on the Code mount, adopt AGAIN
// (second loadDoc), drag (applyParam), regenerate once more -- which is
// precisely the shape a browser-level repro cannot narrow down to. Swap
// `codeAfterFirstBuild` below back to `gen.toScript(run1.doc)` (no
// namedParams -- the bug) to see this test fail the same way the report
// did, at the very next check.
console.log('\n=== (c4) the full two-round-trip sequence: param() must survive without a Run ===');
{
  const src = "const wall = param('wall', 2, { min: 0.5, max: 10 })\nconst b = box(40, 40, 20)\nhollow(b, { wall })";

  // Step 1: Run.
  const run1 = script.runScript(src);
  check('two-round-trip: the first run is clean', run1.errors.length === 0, JSON.stringify(run1.errors));

  // chooseBuild(true): loadDoc()'s OWN setCode() call, WITH namedParams --
  // the fix. chooseBuild(false) writes the identical text to the editor.
  const codeAfterFirstBuild = gen.toScript(run1.doc, run1.namedParams);

  // Code mode's ReshapePreview mounts fresh and auto-evaluates whatever
  // `code` currently holds -- a re-run the student never pressed Run for.
  const autoRun = script.runScript(codeAfterFirstBuild);
  check('two-round-trip: the auto-eval on the Code mount is clean', autoRun.errors.length === 0, JSON.stringify(autoRun.errors));
  check(
    'two-round-trip: the auto-eval still reports wall as a named param, not wiped',
    autoRun.namedParams.length === 1 && autoRun.namedParams[0].name === 'wall'
      && autoRun.namedParams[0].min === 0.5 && autoRun.namedParams[0].max === 10,
    JSON.stringify(autoRun.namedParams)
  );

  // chooseBuild(true) a second time: loadDoc() runs again, from whatever
  // the auto-eval just reported.
  const codeAfterSecondBuild = gen.toScript(autoRun.doc, autoRun.namedParams);
  check(
    'two-round-trip: param() survives the SECOND Build visit with no edit and no Run',
    /param\('wall', 2, \{ min: 0\.5, max: 10 \}\)/.test(codeAfterSecondBuild),
    codeAfterSecondBuild
  );

  // A slider drag on Hollow 1: applyParam() straight on the doc, same as a
  // real drag in the Dimensions panel.
  const dragged = codegen.applyParam(autoRun.doc, autoRun.namedParams[0].slots[0], 10);
  const codeAfterDrag = gen.toScript(dragged, autoRun.namedParams);
  check(
    'two-round-trip: a drag on the SECOND visit lands inside param(), not a literal',
    /param\('wall', 10, \{ min: 0\.5, max: 10 \}\)/.test(codeAfterDrag)
      && /hollow\([^)]*\{\s*wall\s*\}\)/.test(codeAfterDrag),
    codeAfterDrag
  );
}

// ---- (b) volume/bbox against a real kernel -----------------------------

console.log('\n=== (b) spec examples, built on a real kernel, against hand-derived geometry ===');
const argIdx = process.argv.indexOf('--occt');
const occtDir = argIdx > -1 ? process.argv[argIdx + 1] : process.env.OCCT_DIR;
if (!occtDir || !existsSync(path.join(occtDir, 'replicad_single.js'))) {
  console.log('SKIPPED -- no OpenCascade build, so volumes were NOT measured against a kernel.');
  console.log('          node scripts/test-reshape-script.mjs --occt <dir with replicad_single.js>');
  console.log('          (a skip, not a pass -- (a) and (c) above still ran and are the real gate for those)');
} else {
  const kernelOut = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-script-kernel-'));
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        'lib/occt-build.ts', 'lib/model-types.ts', 'lib/sketch-arc.ts',
        'lib/topo-resolve.ts', 'lib/topo-history.ts', 'lib/topo-name.ts',
        '--outDir', kernelOut, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
      ],
      { cwd: root, stdio: 'inherit' },
    );
    writeFileSync(path.join(kernelOut, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(import.meta.url);
    const adapter = require(path.join(kernelOut, 'occt-build.js'));
    const arc = require(path.join(kernelOut, 'sketch-arc.js'));

    const oc = await (await import(pathToFileURL(path.join(occtDir, 'replicad_single.js')).href)).default();
    console.log('OpenCascade up, ' + Object.keys(oc).length + ' exports\n');

    /** Sum volume / merge bbox across every TOP-LEVEL feature the doc shows --
     *  matching oracle-measure.mjs's own `measure()`, which unions/sums the
     *  same set, and needed here because mirror() (unlike hole/shell/repeat)
     *  deliberately leaves TWO solids on screen -- see MirrorFeature's own
     *  doc comment in lib/model-types.ts. */
    function measureDoc(doc) {
      const built = adapter.buildDoc(oc, doc, arc);
      const top = types.topLevel(doc);
      // A mirror's OWN shape in occt-build.ts is already `original fused
      // with its reflection` (BRepAlgoAPI_Fuse -- see the 'mirror' branch),
      // matching reSHape's "the source stays visible AND the copy is added"
      // contract as ONE complete solid, not two. topLevel() still lists the
      // mirror's target as its own independent row (by design -- see
      // MirrorFeature's own doc comment in lib/model-types.ts), so summing
      // every top-level shape's volume naively counts that target's volume
      // TWICE: once directly, once again already inside the fused mirror
      // shape. Measured 2026-09-03: a 20-cube mirrored came back 24000, not
      // 16000, until this skip was added. Excluding a mirror's target from
      // the sum here is a measurement fix, not a claim about what
      // components/model/BrepViewportThree.tsx actually draws on screen --
      // that component maps topLevel() the same naive way this test
      // originally did (see its own `shapes = topLevel(doc).map(...)`), so
      // whether the real viewport also double-draws a mirrored shape's
      // source is worth someone on the B-rep-default effort checking; it is
      // not this file's claim either way, and out of this feature's scope.
      const mirroredAway = new Set(
        doc.features.filter((f) => f.kind === 'mirror').map((f) => f.target)
      );
      let volume = 0;
      let bbox = null;
      for (const f of top) {
        if (mirroredAway.has(f.id)) continue;
        const shape = built.shapes.get(f.id);
        if (!shape) throw new Error(`no shape built for top-level feature ${f.id}`);
        const m = adapter.measureShape(oc, shape);
        volume += m.volume;
        if (!bbox) bbox = [m.bbox[0].slice(), m.bbox[1].slice()];
        else {
          bbox[0] = bbox[0].map((v, i) => Math.min(v, m.bbox[0][i]));
          bbox[1] = bbox[1].map((v, i) => Math.max(v, m.bbox[1][i]));
        }
      }
      return { volume, bbox, refusals: built.refusals };
    }

    const VOL_TOL = 0.005; // fraction, same tolerance oracle-measure.mjs uses for flat/exact shapes

    function checkVolume(name, src, wantVolume, wantBbox) {
      const result = script.runScript(src);
      if (result.errors.length) {
        check(name, false, 'runScript() threw: ' + result.errors[0].message);
        return;
      }
      let got;
      try {
        got = measureDoc(result.doc);
      } catch (e) {
        check(name, false, 'buildDoc() threw: ' + (e && e.message ? e.message : e));
        return;
      }
      const dv = Math.abs(got.volume - wantVolume) / Math.max(1e-9, Math.abs(wantVolume));
      const db = wantBbox
        ? Math.max(...wantBbox.flatMap((row, i) => row.map((v, j) => Math.abs(got.bbox[i][j] - v))))
        : 0;
      check(
        name,
        dv <= VOL_TOL && db <= 0.01,
        `volume ${wantVolume} -> ${got.volume} (${(dv * 100).toFixed(2)}%)` +
          (wantBbox ? `, worst bbox corner off by ${db.toFixed(4)}` : '')
      );
    }

    // Every example below is drawn straight from the spec's Language section
    // (.gauntlet/SPEC-reshape-script.md) or a minimal variant of it. Volumes
    // for the shapes this file shares with scripts/oracle-measure.mjs's own
    // EXACT map (box, cylinder, sphere, hole-through, shell/hollow on a box)
    // are the SAME geometry, so the same formula applies -- re-derived here
    // rather than imported, for the reason given in this file's own header.

    checkVolume('box(40, 40, 20)', 'box(40, 40, 20)', 40 * 40 * 20, [[-20, -20, -10], [20, 20, 10]]);

    checkVolume('cylinder(24, 30) -- across is diameter', 'cylinder(24, 30)', Math.PI * 12 * 12 * 30);

    checkVolume('sphere(30) -- across is diameter', 'sphere(30)', (4 / 3) * Math.PI * 15 * 15 * 15);

    // ring(across, tubeAcross): ringRadius = (across - tubeAcross) / 2 --
    // reshape.js's own header spells out this exact formula for `ring`.
    // across 48, tube 8 -> ringRadius 20, tubeRadius 4.
    checkVolume('ring(48, 8)', 'ring(48, 8)', 2 * Math.PI * Math.PI * 20 * 4 * 4);

    // hole(b, { across: 6 }) -- a THROUGH hole (depth defaults to extent + 2,
    // which exceeds the box's own 20-thick extent), so only the box's own
    // height is actually removed -- same reasoning as oracle-measure.mjs's
    // 'hole-through'.
    checkVolume(
      'box(40,40,20); hole(b, { across: 6 })',
      'const b = box(40, 40, 20)\nhole(b, { across: 6 })',
      40 * 40 * 20 - Math.PI * 3 * 3 * 20
    );

    // hole(b, { across: 6, deep: 10 }) -- a pocket, entirely inside the box.
    checkVolume(
      'box(40,40,20); hole(b, { across: 6, deep: 10 })',
      'const b = box(40, 40, 20)\nhole(b, { across: 6, deep: 10 })',
      40 * 40 * 20 - Math.PI * 3 * 3 * 10
    );

    // hollow(b, { wall: 2 }) -- a box's true offset shell IS the scaled
    // inner box (offsetting every axis-aligned face of a box inward by t is
    // exactly the same box as shrinking it by 2t on every axis), so the
    // simple w*d*h - (w-2t)*(d-2t)*(h-2t) form is exact here, not merely a
    // JSCAD-tessellation approximation.
    checkVolume(
      'box(40,40,20); hollow(b, { wall: 2 })',
      'const b = box(40, 40, 20)\nhollow(b, { wall: 2 })',
      40 * 40 * 20 - 36 * 36 * 16
    );

    // repeat(b, { count: 3, step: 60 }) -- three clear, non-overlapping
    // copies of a 40-wide box spaced 60 apart.
    checkVolume(
      'box(40,40,20); repeat(b, { count: 3, step: 60 })',
      'const b = box(40, 40, 20)\nrepeat(b, { count: 3, step: 60 })',
      3 * 40 * 40 * 20
    );

    // mirror(b, "left-right") -- the original stays standing (see
    // MirrorFeature's own doc comment), so this is TWO solids, twice the
    // volume of one.
    checkVolume(
      "box(20,20,20,{at:[30,0,0]}); mirror(b, 'left-right')",
      "const b = box(20, 20, 20, { at: [30, 0, 0] })\nmirror(b, 'left-right')",
      2 * 20 * 20 * 20
    );

    // move(b, [15, 5, 0]) -- a rigid translation changes nothing about the
    // volume; bbox does move.
    checkVolume(
      'box(20,20,20); move(b, [15, 5, 0])',
      'const b = box(20, 20, 20)\nmove(b, [15, 5, 0])',
      20 * 20 * 20,
      [[-10 + 15, -10 + 5, -10], [10 + 15, 10 + 5, 10]]
    );

    // turn(b, [0, 0, 45]) -- a rotation about the shape's own middle changes
    // neither the volume nor where its centre sits.
    checkVolume('box(40,20,10); turn(b, [0, 0, 45])', 'const b = box(40, 20, 10)\nturn(b, [0, 0, 45])', 40 * 20 * 10);

    // join(a, b) / cut(a, b) -- two clear, non-overlapping 20-cubes.
    checkVolume(
      'join(two clear boxes)',
      "const a = box(20, 20, 20, { at: [-30, 0, 0] })\nconst b = box(20, 20, 20, { at: [30, 0, 0] })\njoin(a, b)",
      2 * 20 * 20 * 20
    );

    // round(shape.edge('top','right'), 4) / bevel(...) / draft(...) on the
    // SAME 40x40x20 box scripts/oracle-measure.mjs's own EXACT map already
    // derives these three for -- reused verbatim (see this block's own
    // comment), not re-derived, so a mismatch here means this file targets a
    // DIFFERENT edge/face/pull than the oracle's own TOP_RIGHT (+z, +x) and
    // FACE('+x') fixtures do, not that the geometry itself is wrong.
    checkVolume(
      "box(40,40,20); round(b.edge('top','right'), 4)",
      "const b = box(40, 40, 20)\nround(b.edge('top', 'right'), 4)",
      40 * 40 * 20 - (1 - Math.PI / 4) * 4 * 4 * 40
    );
    checkVolume(
      "box(40,40,20); bevel(b.edge('top','right'), 4)",
      "const b = box(40, 40, 20)\nbevel(b.edge('top', 'right'), 4)",
      40 * 40 * 20 - (4 * 4 * 40) / 2
    );
    checkVolume(
      "box(40,40,20); draft(b.face('right'), 8, {from:'bottom'})",
      "const b = box(40, 40, 20)\ndraft(b.face('right'), 8, { from: 'bottom' })",
      40 * 40 * 20 - (((20 * Math.tan((8 * Math.PI) / 180)) * 20) / 2) * 40
    );

    // ---- (d) public/reshape/docs/reference.md's own fenced examples, as
    // the oracle -- every ```js <slug> fence is a runnable script, and the
    // prose immediately beneath it is read the same way a human reads it:
    // "refused" anywhere in that first paragraph means the kernel is
    // EXPECTED to refuse the step, and a number stated as "N mm³" (comma or
    // space thousands separators, an optional leading "≈") is the volume
    // this file's own measurement has to land within 0.5% of. Everything
    // else just has to build into a real, positive-volume solid.
    console.log('\n=== (d) reference.md examples: refusal / drawable / stated volume ===');

    function parseReferenceExamples(mdPath) {
      const src = readFileSync(mdPath, 'utf8');
      const fenceRx = /^```js[ \t]+(\S+)\n([\s\S]*?)^```$/gm;
      const matches = [...src.matchAll(fenceRx)];
      return matches.map((m, i) => {
        const afterStart = m.index + m[0].length;
        const afterEnd = i + 1 < matches.length ? matches[i + 1].index : src.length;
        let prose = src.slice(afterStart, afterEnd);
        const heading = prose.search(/\n#{1,6}\s/);
        if (heading !== -1) prose = prose.slice(0, heading);
        return { slug: m[1], code: m[2], prose: (prose.trim().split(/\n\s*\n/)[0] || '').trim() };
      });
    }

    function parseExactVolumeMM3(prose) {
      const m = /(≈\s*)?([\d][\d,  ]*)\s*mm³/.exec(prose);
      if (!m) return null;
      const n = Number(m[2].replace(/[,  ]/g, ''));
      return Number.isFinite(n) ? n : null;
    }

    /** The same three assertions for a doc example, wherever its `code`
     *  and describing prose came from -- reference.md's fence body, or a
     *  lib/reshape-docs.ts page's `code` + `body`. */
    function checkDocExample(label, code, prose) {
      const result = script.runScript(code);
      if (result.errors.length) {
        check(label, false, 'runScript() threw: ' + result.errors[0].message);
        return;
      }
      let m;
      try {
        m = measureDoc(result.doc);
      } catch (e) {
        check(label, false, 'buildDoc()/measureShape() threw: ' + (e && e.message ? e.message : e));
        return;
      }
      const refusalMsgs = [...m.refusals.values()];
      const expectRefusal = /\brefused\b/i.test(prose);
      if (expectRefusal) {
        check(
          label,
          refusalMsgs.length > 0,
          'the prose says "refused" but the kernel built it cleanly (no refusal fired)'
        );
        return;
      }
      if (refusalMsgs.length > 0) {
        check(label, false, 'unexpected refusal: ' + refusalMsgs[0]);
        return;
      }
      if (!(Number.isFinite(m.volume) && m.volume > 0)) {
        check(label, false, `not a drawable solid: volume ${m.volume}`);
        return;
      }
      const wantVol = parseExactVolumeMM3(prose);
      if (wantVol != null) {
        const dv = Math.abs(m.volume - wantVol) / Math.max(1e-9, wantVol);
        check(label, dv <= 0.005, `prose states ${wantVol} mm³, measured ${m.volume} (${(dv * 100).toFixed(2)}% off)`);
        return;
      }
      check(label, true, `volume ${m.volume}`);
    }

    const referencePath = path.join(root, 'public', 'reshape', 'docs', 'reference.md');
    const referenceExamples = parseReferenceExamples(referencePath);
    console.log(`  ----  ${referenceExamples.length} fenced examples in reference.md`);
    for (const ex of referenceExamples) {
      checkDocExample('reference.md: ' + ex.slug, ex.code, ex.prose);
    }

    // ---- (e) lib/reshape-docs.ts's `code` fields, the same three checks --
    console.log('\n=== (e) lib/reshape-docs.ts code fields: refusal / drawable / stated volume ===');
    const docsOut = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-docs-ts-'));
    try {
      execFileSync(
        process.execPath,
        [
          path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
          'lib/docs-core.ts', 'lib/reshape-docs.ts',
          '--outDir', docsOut, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
        ],
        { cwd: root, stdio: 'inherit' },
      );
      writeFileSync(path.join(docsOut, 'package.json'), '{"type":"commonjs"}');
      const requireDocs = createRequire(import.meta.url);
      const { sections: docSections } = requireDocs(path.join(docsOut, 'reshape-docs.js'));
      let pageCount = 0;
      for (const s of docSections) {
        for (const p of s.pages || []) {
          if (typeof p.code !== 'string' || !p.code.trim()) continue;
          pageCount++;
          checkDocExample(`lib/reshape-docs.ts: ${s.slug} / ${p.title}`, p.code, p.body || '');
        }
      }
      console.log(`  ----  ${pageCount} pages carrying a code example`);
    } catch (e) {
      check('lib/reshape-docs.ts examples', false, 'threw: ' + (e && e.message ? e.message : e));
    } finally {
      rmSync(docsOut, { recursive: true, force: true });
    }
  } catch (e) {
    check('kernel harness', false, 'threw before any check ran: ' + (e && e.message ? e.message : e));
  } finally {
    rmSync(kernelOut, { recursive: true, force: true });
  }
}

rmSync(out, { recursive: true, force: true });

console.log('\n' + (fails.length ? 'FAIL' : 'ALL PASS') + '  (' + pass + '/' + (pass + fails.length) + ')');
if (fails.length) {
  console.log('failed: ' + fails.join(', '));
}
process.exit(fails.length ? 1 : 0);
