// Tests for lib/mesh-export.ts -- the first-party STL/OBJ/3MF writers that
// replace @jscad/{stl,3mf,obj}-serializer behind the Save buttons.
//
// lib/mesh-export.ts has no local relative imports (only the bare package
// import 'jszip'), so unlike scripts/test-model-codegen.mjs and
// scripts/test-least-squares.mjs it needs no tsc-to-commonjs detour -- Node's
// native TypeScript support strips the (fully erasable) type syntax and
// resolves 'jszip' against this project's own node_modules exactly the way
// it would resolve any other bare specifier, so the file is imported
// directly, below.
//
// WHAT ACTUALLY GETS CHECKED, and why each one:
//
//   ROUND-TRIP. Parse the STL this module writes back into triangles by hand
//   (a from-scratch reader, not lib/mesh-export.ts's own code, so a bug
//   shared between writer and reader can't hide) and confirm the triangle
//   count and the SIGNED volume (mirroring lib/occt-mesh.ts's signedVolume)
//   survive the round trip. A cube of side 10 has an exact volume of 1000 --
//   no float rounding to allow for -- so that number is asserted exactly.
//
//   BYTE LENGTH. Binary STL is 84 + 50*triangleCount, always. This is the
//   check that catches padding and attribute-byte-count mistakes -- the
//   classic hand-rolled-STL bug, and one that produces a file some slicers
//   accept (they resync past the bad bytes) and others silently misread.
//
//   OBJ INDEXING. Asserts every face index is 1-based and none exceeds the
//   vertex count. Off-by-one here produces a file that opens looking almost
//   right, which is worse than not opening at all.
//
//   3MF. Unzips the writer's own output with jszip and counts <vertex> and
//   <triangle> tags in 3D/3dmodel.model against the input counts.
//
//   MERGE. mergeMeshes() -- added for BrepViewportThree.tsx's Export STL
//   button, which can have more than one top-level shape to flatten into one
//   file -- offsets a second mesh's indices by the first's vertex count.
//   Checked against the realistic bug (forgetting the offset) rather than
//   just checking the happy path: an un-offset merge is asserted to give a
//   DIFFERENT, wrong volume, so the correctness check above is proven able
//   to fail.
//
//   WINDING. Built from a cube whose six faces are constructed with a known
//   outward normal each (see buildCube below) -- the same shape
//   lib/occt-mesh.ts's header warns is the realistic failure case, since a
//   plain box has half its OCCT faces REVERSED. Asserts every exported
//   triangle's normal points away from the cube's center. An inverted mesh
//   looks fine on screen and prints hollow or inside-out, so this is a real
//   defect class, not a nicety.
//
// Run: node scripts/test-mesh-export.mjs   (also part of `npm test`)

import { writeSTL, writeOBJ, write3MF, mergeMeshes } from '../lib/mesh-export.ts';
import JSZip from 'jszip';

let pass = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fails.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A cube of side `s`, as a flat (non-indexed) triangle soup -- the shape
 * lib/occt-mesh.ts's Geom3 flattens to. Each of the 6 faces is built from an
 * ORIGIN corner plus two in-plane axis vectors `u`, `v` chosen so that
 * `u x v` equals the face's own outward normal; the two triangles
 * (origin, origin+u, origin+u+v) and (origin, origin+u+v, origin+v) then
 * wind outward by construction (their (b-a)x(c-a) is `s*s*(u x v)`, i.e. the
 * outward normal scaled positive) rather than by hand-checked luck. This is
 * the fixture the winding test and the round-trip volume both depend on.
 */
function buildCube(s) {
  const faces = [
    { o: [s, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, // +x
    { o: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0] }, // -x
    { o: [0, s, 0], u: [0, 0, 1], v: [1, 0, 0] }, // +y
    { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1] }, // -y
    { o: [0, 0, s], u: [1, 0, 0], v: [0, 1, 0] }, // +z
    { o: [0, 0, 0], u: [0, 1, 0], v: [1, 0, 0] }, // -z
  ];
  const positions = [];
  for (const { o, u, v } of faces) {
    const corner = (b, c) => [0, 1, 2].map((a) => o[a] + u[a] * s * b + v[a] * s * c);
    const p00 = corner(0, 0), p10 = corner(1, 0), p11 = corner(1, 1), p01 = corner(0, 1);
    positions.push(...p00, ...p10, ...p11);
    positions.push(...p00, ...p11, ...p01);
  }
  return { positions };
}

/** A UV sphere, indexed -- the shape lib/occt-three.ts's BufferGeometry
 *  carries. Winding is auto-corrected to be outward (positive signed
 *  volume) after generation rather than hand-derived, since the point of
 *  this fixture is round-trip precision on curved geometry, not a second
 *  winding fixture -- the cube already covers that. */
function buildSphere(radius, latSegments, lonSegments) {
  const positions = [];
  for (let lat = 0; lat <= latSegments; lat++) {
    const theta = (lat * Math.PI) / latSegments;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let lon = 0; lon <= lonSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / lonSegments;
      positions.push(radius * sinT * Math.cos(phi), radius * cosT, radius * sinT * Math.sin(phi));
    }
  }
  let indices = [];
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const a = lat * (lonSegments + 1) + lon;
      const b = a + lonSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  if (signedVolumeOf({ positions, indices }) < 0) {
    const flipped = [];
    for (let i = 0; i < indices.length; i += 3) flipped.push(indices[i], indices[i + 2], indices[i + 1]);
    indices = flipped;
  }
  return { positions, indices };
}

// ---------------------------------------------------------------------------
// Small mirrors of lib/mesh-export.ts's own helpers, kept independent on
// purpose -- see the file header on why the STL parser below is a from-
// scratch reader rather than reusing anything the writer does internally.
// ---------------------------------------------------------------------------

function vertexAt(mesh, i) { return [mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]]; }
function triCount(mesh) { return mesh.indices ? mesh.indices.length / 3 : mesh.positions.length / 9; }
function triIndices(mesh, t) {
  return mesh.indices ? [mesh.indices[t * 3], mesh.indices[t * 3 + 1], mesh.indices[t * 3 + 2]] : [t * 3, t * 3 + 1, t * 3 + 2];
}
function meshTriangles(mesh) {
  const out = [];
  for (let t = 0; t < triCount(mesh); t++) {
    const [ia, ib, ic] = triIndices(mesh, t);
    out.push([vertexAt(mesh, ia), vertexAt(mesh, ib), vertexAt(mesh, ic)]);
  }
  return out;
}

/** Mirrors lib/occt-mesh.ts's signedVolume() -- same tetrahedron-sum
 *  formula, same reason: positive AND matching the expected magnitude is the
 *  bar, since a partially-flipped mesh (the realistic failure) lands
 *  between the right answer and zero rather than at a distinctly wrong
 *  number. Restructured to sum the numerator across ALL triangles and divide
 *  by 6 once at the end, rather than dividing per triangle: mathematically
 *  the same value, but dividing 12 times first (occt-mesh.ts's order) loses
 *  the last bit on a plain axis-aligned cube and lands on 999.9999999999999
 *  instead of the exact 1000 this suite checks for. */
function signedVolume(triangles) {
  let v = 0;
  for (const [a, b, c] of triangles) {
    v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return v / 6;
}
function signedVolumeOf(mesh) { return signedVolume(meshTriangles(mesh)); }

/** A from-scratch binary STL reader -- deliberately not lib/mesh-export.ts's
 *  own code, so a bug shared between writer and reader can't cancel out and
 *  hide. */
function parseSTL(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nTri = view.getUint32(80, true);
  const triangles = [];
  let offset = 84;
  for (let t = 0; t < nTri; t++) {
    const normal = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    offset += 12;
    const verts = [];
    for (let i = 0; i < 3; i++) {
      verts.push([view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)]);
      offset += 12;
    }
    offset += 2; // attribute byte count
    triangles.push({ normal, vertices: verts });
  }
  return { triangleCount: nTri, triangles };
}

// ---------------------------------------------------------------------------
// Fixtures under test
// ---------------------------------------------------------------------------

const cube = buildCube(10);
const sphere = buildSphere(12, 16, 24);

console.log('cube: fixture sanity');
{
  const expectedVolume = 1000; // 10^3, exact
  ok('cube fixture triangle count is 12', triCount(cube) === 12, `got ${triCount(cube)}`);
  ok('cube fixture volume is exactly 1000', signedVolumeOf(cube) === expectedVolume, `got ${signedVolumeOf(cube)}`);
}

console.log('STL: round-trip (cube)');
{
  const bytes = writeSTL(cube);
  const parsed = parseSTL(bytes);
  ok('byte length is 84 + 50*triangleCount', bytes.length === 84 + 50 * triCount(cube), `got ${bytes.length}, expected ${84 + 50 * triCount(cube)}`);
  ok('parsed triangle count matches input', parsed.triangleCount === triCount(cube), `got ${parsed.triangleCount}`);
  const volume = signedVolume(parsed.triangles.map((t) => t.vertices));
  ok('parsed signed volume matches input exactly (integer coords, no float loss)', volume === 1000, `got ${volume}`);
}

console.log('STL: round-trip (sphere, curved geometry)');
{
  const inputVolume = signedVolumeOf(sphere);
  const bytes = writeSTL(sphere);
  const parsed = parseSTL(bytes);
  ok('byte length is 84 + 50*triangleCount', bytes.length === 84 + 50 * triCount(sphere), `got ${bytes.length}, expected ${84 + 50 * triCount(sphere)}`);
  ok('parsed triangle count matches input', parsed.triangleCount === triCount(sphere), `got ${parsed.triangleCount}`);
  const volume = signedVolume(parsed.triangles.map((t) => t.vertices));
  // Positions round-trip through float32 (STL's native precision), so this
  // allows for that quantization, not for a logic error -- 1e-4 relative on
  // a volume in the thousands is far looser than float32 rounding needs and
  // far tighter than any real bug would land inside.
  const relErr = Math.abs(volume - inputVolume) / inputVolume;
  ok('parsed signed volume matches input within float32 rounding', relErr < 1e-4, `input ${inputVolume}, parsed ${volume}, relErr ${relErr}`);
  ok('sphere volume is positive (outward-wound)', volume > 0, `got ${volume}`);
}

console.log('STL: winding (cube, known outward orientation)');
{
  const parsed = parseSTL(writeSTL(cube));
  const center = [5, 5, 5]; // cube spans [0,10]^3
  let allOutward = true;
  for (const tri of parsed.triangles) {
    const centroid = [0, 1, 2].map((a) => (tri.vertices[0][a] + tri.vertices[1][a] + tri.vertices[2][a]) / 3);
    const toCentroid = [0, 1, 2].map((a) => centroid[a] - center[a]);
    const dot = tri.normal[0] * toCentroid[0] + tri.normal[1] * toCentroid[1] + tri.normal[2] * toCentroid[2];
    if (dot <= 0) allOutward = false;
  }
  ok('every exported triangle normal points away from the cube center', allOutward);
}

console.log('OBJ: indexing (cube)');
{
  const obj = writeOBJ(cube);
  const nV = cube.positions.length / 3;
  const faceLines = obj.split('\n').filter((l) => l.startsWith('f '));
  ok('one f line per triangle', faceLines.length === triCount(cube), `got ${faceLines.length}`);
  let minIndex = Infinity, maxIndex = -Infinity;
  for (const line of faceLines) {
    for (const tok of line.slice(2).trim().split(/\s+/)) {
      const idx = Number(tok);
      minIndex = Math.min(minIndex, idx);
      maxIndex = Math.max(maxIndex, idx);
    }
  }
  ok('smallest face index is 1 (1-based, not 0-based)', minIndex === 1, `got ${minIndex}`);
  ok('no face index exceeds the vertex count', maxIndex <= nV, `got max ${maxIndex}, vertex count ${nV}`);
}

console.log('3MF: structure and counts (cube)');
{
  const bytes = await write3MF(cube);
  const zip = await JSZip.loadAsync(bytes);
  ok('contains [Content_Types].xml', zip.file('[Content_Types].xml') !== null);
  ok('contains _rels/.rels', zip.file('_rels/.rels') !== null);
  const modelFile = zip.file('3D/3dmodel.model');
  ok('contains 3D/3dmodel.model', modelFile !== null);
  if (modelFile) {
    const xml = await modelFile.async('string');
    const vertexTags = (xml.match(/<vertex /g) || []).length;
    const triangleTags = (xml.match(/<triangle /g) || []).length;
    ok('3MF vertex count matches input', vertexTags === cube.positions.length / 3, `got ${vertexTags}`);
    ok('3MF triangle count matches input', triangleTags === triCount(cube), `got ${triangleTags}`);
  }
}

console.log('mergeMeshes: unindexed + indexed, offset arithmetic (BrepViewportThree.tsx export)');
{
  // cube has NO index buffer (buildCube's own shape); sphere does -- so this
  // exercises both branches mergeMeshes has to get right: synthesizing
  // sequential indices for the unindexed part, and OFFSETTING the real ones
  // for the indexed part by the running vertex count.
  const merged = mergeMeshes([cube, sphere]);
  const expectedTris = triCount(cube) + triCount(sphere);
  const expectedVerts = cube.positions.length / 3 + sphere.positions.length / 3;
  ok('merged triangle count is the sum of the parts', triCount(merged) === expectedTris, `got ${triCount(merged)}`);
  ok('merged vertex count is the sum of the parts', merged.positions.length / 3 === expectedVerts, `got ${merged.positions.length / 3}`);

  // Two closed, outward-wound surfaces sum their enclosed volumes under the
  // same divergence-theorem sum regardless of whether they overlap in space
  // (this is the same formula signedVolumeOf() already uses) -- so a correct
  // merge's volume is exactly the two inputs' volumes added, and a merge that
  // corrupted the second mesh's indices (the realistic bug -- forgetting the
  // offset, or applying it twice) would NOT land here by coincidence.
  const expectedVol = signedVolumeOf(cube) + signedVolumeOf(sphere);
  const vol = signedVolumeOf(merged);
  const relErr = Math.abs(vol - expectedVol) / expectedVol;
  ok('merged signed volume is the sum of the parts', relErr < 1e-4, `got ${vol}, expected ${expectedVol}`);

  // KNOWN-BAD CHECK: the check above actually has to be sensitive to the
  // offset, not just structurally always-true. Rebuild the same merge but
  // WITHOUT offsetting the sphere's indices (the realistic bug this function
  // exists to avoid) and confirm the volume check above would have caught it.
  const naiveIndices = [...(cube.indices ?? [...Array(cube.positions.length / 3).keys()]), ...sphere.indices];
  const naiveVol = signedVolumeOf({ positions: merged.positions, indices: naiveIndices });
  ok('an un-offset merge (the bug this guards against) gives a different, wrong volume',
    Math.abs(naiveVol - expectedVol) / expectedVol > 1e-3, `naive got ${naiveVol}, correct is ${expectedVol}`);
}

console.log('');
if (fails.length) {
  console.log(`FAIL — ${fails.length} of ${pass + fails.length} checks failed`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`ALL PASS — ${pass} checks`);
