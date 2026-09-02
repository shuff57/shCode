// OpenCascade solid -> THREE.BufferGeometry. three.js's half of the same gap
// lib/occt-mesh.ts closes for the JSCAD/regl renderer -- see that file for the
// full account of why a B-rep has no triangles in it at all until something
// meshes it.
//
// WHY THIS IS A SEPARATE FILE RATHER THAN A SECOND RETURN SHAPE BOLTED ONTO
// tessellate(). The two callers want genuinely different data. The JSCAD/regl
// path wants a `geom3` -- flat, ungrouped, three fresh vertices per triangle --
// because that is the format @jscad/modeling and the regl renderer already
// speak. three.js wants an INDEXED BufferGeometry: shared vertices, a
// `position` attribute, an `index`, and (new here) a record of which index
// range came from which face, so a future Raycaster hit can be resolved back
// to a TopoDS_Face. Neither caller's shape is a strict subset of the other's,
// so this mirrors tessellate() rather than wrapping it.
//
// THE SAME TWO TRAPS, because they are properties of OpenCascade's
// triangulation API, not of the JSCAD-shaped output that used to hide them:
//
//   THE LOCATION. A face's TopLoc_Location must be applied to every node
//   before it goes in the position buffer, or repeated geometry (every
//   instance of a patterned hole, say) stacks up at the origin.
//
//   THE ORIENTATION. A REVERSED face's triangles are wound for the surface,
//   not for the solid, and must have their winding flipped or that face is
//   inside-out. signedVolume() below is the same sanity check occt-mesh.ts
//   runs, ported to read an indexed buffer instead of a polygon list.
//
// THIS FILE DOES NOT IMPORT 'three' AT RUNTIME. Only `import type` -- erased
// at compile time -- so that pulling in this module never pulls three.js into
// a page's bundle. The caller loads three itself (dynamically, so it code-
// splits) and hands the live module in as `THREE`; see
// components/model/BrepViewportThree.tsx.

import type * as THREE from 'three';
import type { MeshOptions, Occt } from './occt-mesh';

export type { MeshOptions, Occt } from './occt-mesh';

// Same defaults occt-mesh.ts measures and documents at length -- this file
// does not repeat that table, it just has to agree with it. Kept as a
// separate constant rather than an import because the two files are the
// drawing layer for two different renderers and neither should have to load
// the other to pick a default.
const DEFAULT_DEFLECTION = 0.05;
const DEFAULT_ANGULAR = 0.3;

/**
 * Which triangle-index range in the geometry's `index` buffer came from one
 * TopoDS_Face.
 *
 * `index` is this face's position in the shape's OWN face list (the same walk
 * facesOf() below performs), not just among the faces that meshed
 * successfully -- a degenerate face that failed to triangulate still holds
 * its place, so re-running facesOf() on the same shape later (for picking)
 * lines up with this list by position. `start`/`count` are index-BUFFER
 * offsets (3 per triangle), matching what BufferGeometry.index / drawRange
 * already expect.
 */
export interface FaceRange {
  index: number;
  start: number;
  count: number;
}

/** A meshed solid, ready for three.js, plus the face-range map picking will
 *  eventually need. Picking itself is out of scope here -- see the file
 *  header. */
export interface BrepThreeMesh {
  geometry: THREE.BufferGeometry;
  faces: FaceRange[];
}

/**
 * Every face of `shape`, as a flat list, in a stable order.
 *
 * The same walk occt-mesh.ts and lib/topo-resolve.ts each already do.
 * Repeated a third time rather than imported, for the same reason
 * occt-mesh.ts gives: this is the drawing layer, not the naming layer, and
 * neither drawing layer should have to load the other to do its own job. The
 * ORDER this produces is the contract FaceRange.index above depends on.
 */
function facesOf(oc: Occt, shape: any): any[] {
  const out: any[] = [];
  const exp = new oc.TopExp_Explorer(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  while (exp.More()) {
    out.push(exp.Current());
    exp.Next();
  }
  return out;
}

/**
 * Turn a B-rep solid into an indexed three.js BufferGeometry.
 *
 * Returns null when the shape has no drawable surface at all, same
 * null-means-"nothing to draw"-not-"empty geom3" contract tessellate() in
 * occt-mesh.ts documents.
 *
 * Meshing MUTATES `shape` (BRepMesh_IncrementalMesh attaches the
 * triangulation to each face), so calling this twice with different
 * deflections re-meshes rather than accumulating -- again, same as
 * occt-mesh.ts.
 */
export function tessellateToThree(
  THREE: typeof import('three'),
  oc: Occt,
  shape: any,
  opts: MeshOptions = {},
): BrepThreeMesh | null {
  if (!shape || (typeof shape.IsNull === 'function' && shape.IsNull())) return null;

  const deflection = opts.deflection ?? DEFAULT_DEFLECTION;
  const angular = opts.angular ?? DEFAULT_ANGULAR;

  // `false` in third place is `isRelative` -- left off for the reason
  // occt-mesh.ts gives: relative deflection would mesh a small hole in a
  // large plate coarsely, which is exactly the feature a student zooms in on.
  new oc.BRepMesh_IncrementalMesh(shape, deflection, false, angular, false);

  const positions: number[] = [];
  const indices: number[] = [];
  const faces: FaceRange[] = [];

  const allFaces = facesOf(oc, shape);
  for (let faceIdx = 0; faceIdx < allFaces.length; faceIdx++) {
    const face = oc.TopoDS.Face(allFaces[faceIdx]);
    const loc = new oc.TopLoc_Location();
    const tri = oc.BRep_Tool.Triangulation(face, loc, 0);
    // A face can come back without a triangulation -- skip it, same discipline
    // tessellate() follows. Its slot in `allFaces` (and so its `index` here)
    // stays reserved even though it contributes no range.
    if (!tri || (typeof tri.IsNull === 'function' && tri.IsNull())) continue;
    if (typeof tri.NbTriangles !== 'function' || tri.NbTriangles() === 0) continue;

    const trsf = loc.Transformation();
    const baseVertex = positions.length / 3;
    for (let i = 1; i <= tri.NbNodes(); i++) {
      const p = tri.Node(i).Transformed(trsf);
      positions.push(p.X(), p.Y(), p.Z());
    }

    const reversed = String(face.Orientation()) === 'TopAbs_REVERSED'
      || face.Orientation() === oc.TopAbs_Orientation?.TopAbs_REVERSED;

    const start = indices.length;
    for (let i = 1; i <= tri.NbTriangles(); i++) {
      const t = tri.Triangle(i);
      const a = baseVertex + t.Value(1) - 1;
      const b = baseVertex + t.Value(2) - 1;
      const c = baseVertex + t.Value(3) - 1;
      // Same flip occt-mesh.ts applies: a REVERSED face's triangles are wound
      // for the surface, not the solid.
      if (reversed) indices.push(a, c, b);
      else indices.push(a, b, c);
    }
    faces.push({ index: faceIdx, start, count: indices.length - start });
  }

  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, faces };
}

/**
 * The volume an indexed BufferGeometry encloses, SIGNED.
 *
 * The three.js twin of occt-mesh.ts's signedVolume() -- same reasoning, same
 * bar (positive AND equal to the kernel's own volume): an unsigned volume
 * cannot distinguish a correctly wound mesh from one flipped everywhere, and
 * a mesh flipped on SOME faces (the realistic failure -- a box splits its six
 * faces three and three) lands somewhere between the right answer and zero.
 */
export function signedVolume(geometry: THREE.BufferGeometry): number {
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();
  if (!pos || !idx) return 0;

  let v = 0;
  for (let i = 0; i < idx.count; i += 3) {
    const ia = idx.getX(i);
    const ib = idx.getX(i + 1);
    const ic = idx.getX(i + 2);
    const ax = pos.getX(ia), ay = pos.getY(ia), az = pos.getZ(ia);
    const bx = pos.getX(ib), by = pos.getY(ib), bz = pos.getZ(ib);
    const cx = pos.getX(ic), cy = pos.getY(ic), cz = pos.getZ(ic);
    v += (
      ax * (by * cz - bz * cy)
      - ay * (bx * cz - bz * cx)
      + az * (bx * cy - by * cx)
    ) / 6;
  }
  return v;
}

/** How many triangles a geometry carries. The cost half of the deflection
 *  trade -- see occt-mesh.ts's triangleCount() and the table it measures. */
export function triangleCount(geometry: THREE.BufferGeometry | null): number {
  if (!geometry) return 0;
  const idx = geometry.getIndex();
  return idx ? idx.count / 3 : 0;
}
