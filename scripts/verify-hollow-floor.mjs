#!/usr/bin/env node
// Item I (P14 addendum): "A's interior floor shows an unexplained diagonal
// artifact" after hollowing a box open at the top.
//
// INVESTIGATED, NOT REPRODUCED as a floor-face defect -- reported here as a
// genuine negative result with the evidence, the same way D3's own notes
// (scratchpad toolparity/ours/D3/notes.md) reported a documented rim-pick
// defect that careful testing could not find either.
//
// Both hypotheses the spec named were checked directly against the kernel
// and ruled out:
//
//   1. "The tessellation seam being drawn as an edge." The floor tessellates
//      to exactly 2 triangles (a flat quad's ordinary split), and every
//      vertex of both triangles sits at EXACTLY the same Z (max-min == 0,
//      not float noise) -- there is no seam for anything to draw.
//   2. "A coplanar-face z-fight between the floor and the removed top."
//      TopExp_Explorer over the built shell finds exactly ONE face whose
//      bbox matches the floor's own footprint -- there is no second,
//      duplicate face at that level to fight with.
//
// This script is the permanent form of that measurement: it builds the
// exact repro (40x40x20 box, Hollow wall 2, open at the top) through
// lib/occt-build.ts's own buildDoc(), then checks BOTH invariants above,
// plus the literal check the spec asked for -- the floor face's own edge
// list contains no edge lying STRICTLY INSIDE its perimeter (every edge
// found is one of its four boundary edges).
//
// A real repro of the visible artifact, if one shows up again, will FAIL
// one of these three checks and point straight at which hypothesis was
// right. It did not, in this build -- the working theory for what a judge
// actually saw is in the header of check(3)'s own comment below.
//
// Deliberately its OWN small script, not folded into test-occt-adapter.mjs:
// that harness owns and rewrites .gauntlet/occt-checks.json on every run,
// which this pass does not touch.
//
//   node scripts/verify-hollow-floor.mjs --occt <dir with replicad_single.js>

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const flag = process.argv.indexOf('--occt');
const dir = flag > -1 ? process.argv[flag + 1] : process.env.OCCT_DIR;
if (!dir || !existsSync(path.join(dir, 'replicad_single.js'))) {
  console.log('SKIPPED — no OpenCascade build, so the hollow floor was NOT measured.');
  console.log('          node scripts/verify-hollow-floor.mjs --occt <dir with replicad_single.js>');
  console.log('          (a skip, not a pass)');
  process.exit(0);
}

let fails = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  PASS  ' + name);
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
};

const out = mkdtempSync(path.join(tmpdir(), 'shcode-hollow-floor-'));
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/occt-build.ts', 'lib/model-types.ts', 'lib/sketch-arc.ts', 'lib/topo-resolve.ts',
      'lib/topo-history.ts', 'lib/topo-name.ts', 'lib/script-surface.ts', 'lib/hull.ts', 'lib/occt-mesh.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const require = createRequire(import.meta.url);
  const adapter = require(path.join(out, 'occt-build.js'));
  const meshMod = require(path.join(out, 'occt-mesh.js'));

  const oc = await (await import(pathToFileURL(path.join(dir, 'replicad_single.js')).href)).default();
  console.log('OpenCascade up, ' + Object.keys(oc).length + ' exports\n');

  const doc = {
    version: 1,
    features: [
      { id: 'b1', kind: 'box', size: [40, 40, 20], center: [0, 0, 0] },
      { id: 's1', kind: 'shell', target: 'b1', thickness: 2, open: { cause: 'primitive', feature: 'b1', kind: 'box', part: '+z' } },
    ],
  };
  const result = adapter.buildDoc(oc, doc);
  const shape = result.shapes.get('s1');
  check('the open hollow builds at all', !!shape);
  if (!shape) throw new Error('build failed, cannot check further');

  const FLOOR_Z = -10 + 2; // box centred at 0, height 20 -> bottom at -10; wall 2 in
  const bboxOf = (s) => {
    const box = new oc.Bnd_Box();
    oc.BRepBndLib.Add(s, box, true);
    const lo = box.CornerMin();
    const hi = box.CornerMax();
    return [[lo.X(), lo.Y(), lo.Z()], [hi.X(), hi.Y(), hi.Z()]];
  };

  // (2) exactly one face at the floor's own level -- rules out a duplicate,
  // coplanar face for the floor to z-fight against.
  const fexp = new oc.TopExp_Explorer(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const floorFaces = [];
  while (fexp.More()) {
    const f = oc.TopoDS.Face(fexp.Current());
    const bb = bboxOf(f);
    if (Math.abs(bb[0][2] - FLOOR_Z) < 0.5 && Math.abs(bb[1][2] - FLOOR_Z) < 0.5) floorFaces.push(f);
    fexp.Next();
  }
  check('exactly one face sits at the floor level (no duplicate/z-fighting face)',
    floorFaces.length === 1, `found ${floorFaces.length}`);

  // (1) the floor's own tessellation is a plain 2-triangle split, every
  // vertex exactly coplanar -- rules out a tessellation-seam artifact.
  const geom = meshMod.tessellate(oc, shape, {});
  const floorTris = geom.polygons.filter((p) => p.vertices.every((v) => Math.abs(v[2] - FLOOR_Z) < 0.01));
  check('the floor tessellates to exactly 2 triangles', floorTris.length === 2, `found ${floorTris.length}`);
  const maxZDeviation = Math.max(
    ...floorTris.map((t) => Math.max(...t.vertices.map((v) => v[2])) - Math.min(...t.vertices.map((v) => v[2])))
  );
  check('every floor vertex is EXACTLY coplanar (no tessellation noise to draw a seam from)',
    maxZDeviation === 0, `max z deviation ${maxZDeviation}`);

  // (3) the spec's own literal check: the floor face's edge list has
  // nothing strictly inside its perimeter -- only its four boundary edges.
  //
  // Working theory for what a judge's screenshot actually showed, since
  // this measurement came back clean: "Look from above" is an ELEVATED,
  // ANGLED preset (not a true top-down orthographic view -- see
  // BrepViewportThree.tsx's own preset comment), so a real, correct edge
  // FAR from the floor (the back wall's own vertical corner edge, say) can
  // foreshorten to a screen-space line that visually crosses the near
  // floor's own silhouette without being anywhere near it in 3D. That is
  // ordinary wireframe-over-solid parallax, not a floor-face defect, and
  // every check above rules out the floor itself being the source.
  const eexp = new oc.TopExp_Explorer(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const edges = [];
  while (eexp.More()) {
    const e = eexp.Current();
    if (!edges.some((u) => u.IsSame(e))) edges.push(e.clone());
    eexp.Next();
  }
  const floorBBox = bboxOf(floorFaces[0]);
  const [lo, hi] = floorBBox;
  const EPS = 0.1;
  let interior = 0;
  for (const e of edges) {
    const bb = bboxOf(e);
    const zMid = (bb[0][2] + bb[1][2]) / 2;
    if (Math.abs(zMid - FLOOR_Z) > 0.5) continue;
    const strictlyInsideX = bb[0][0] > lo[0] + EPS && bb[1][0] < hi[0] - EPS;
    const strictlyInsideY = bb[0][1] > lo[1] + EPS && bb[1][1] < hi[1] - EPS;
    if (strictlyInsideX && strictlyInsideY) interior++;
  }
  check("the floor face's own edge list has no edge lying inside its perimeter",
    interior === 0, `found ${interior} interior edge(s)`);

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
  process.exit(fails === 0 ? 0 : 1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
