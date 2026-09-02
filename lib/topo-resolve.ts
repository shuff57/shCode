// Turning a TopoName back into an actual face on a built shape.
//
// lib/topo-name.ts decides what a name IS -- a path through the history that
// produced the face, rather than a position in the result. This is the other
// half: given such a name and a freshly built shape, find the face it means.
//
// The claim being tested is narrow and is the whole point of the exercise:
//
//     build -> change an upstream number -> rebuild -> the name still finds
//     the same face
//
// If that holds, a student can fillet an edge and keep the fillet when they
// widen the part. If it does not, parametric modelling does not work, and no
// amount of kernel makes up for it.
//
// WHAT IS HERE AND WHAT IS NOT. This slice resolves `primitive` names -- the
// faces of a box, cylinder, sphere, cone or torus -- which are the ones whose
// identity is knowable from the shape alone, with no operation history needed.
// `carried` and `split` names, the ones that ride through a boolean, need
// OpenCascade's Modified/Generated maps and the operations kept alive to query;
// that is the next slice. The maps are present in this build and were checked
// before any of this was written.

import type { Occt } from './occt-build';
import type { TopoName } from './topo-name';

/** Every face of a shape, in the kernel's own order -- which is exactly the
 *  order nothing here is allowed to depend on. */
export function facesOf(oc: Occt, shape: any): any[] {
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

/** Where a face's area is centred, in world coordinates. Used to tell faces
 *  apart by where they sit rather than by what index they arrived in. */
export function faceCentre(oc: Occt, face: any): [number, number, number] {
  const g = new oc.GProp_GProps();
  oc.BRepGProp.SurfaceProperties(face, g, false, false);
  const c = g.CentreOfMass();
  return [c.X(), c.Y(), c.Z()];
}

/** Area, used only to break a tie between two faces that centre at the same
 *  point -- which a symmetric shape can genuinely produce. */
function faceArea(oc: Occt, face: any): number {
  const g = new oc.GProp_GProps();
  oc.BRepGProp.SurfaceProperties(face, g, false, false);
  return g.Mass();
}

const DIRS: Record<string, [number, number, number]> = {
  '+x': [1, 0, 0], '-x': [-1, 0, 0],
  '+y': [0, 1, 0], '-y': [0, -1, 0],
  '+z': [0, 0, 1], '-z': [0, 0, -1],
};

/**
 * The face of a primitive that faces a given way.
 *
 * Chosen by how far its centre sits along that direction, not by index and not
 * by the kernel's face order -- both of which a rebuild is free to change. On a
 * box that picks the obvious face; on a cylinder `+z` and `-z` pick the caps
 * and anything else picks the curved side, which is the only face left.
 *
 * The limit, stated rather than discovered: this is for the axis-aligned
 * primitive set, which is what `primitive` names cover. It is not a general
 * face picker and must not be used as one -- a face of a boolean result is
 * addressed through its history, not by being furthest in some direction.
 */
export function resolvePrimitiveFace(oc: Occt, shape: any, part: string): any | null {
  const faces = facesOf(oc, shape);
  if (!faces.length) return null;
  const dir = DIRS[part];
  if (dir) {
    let best: any = null;
    let bestScore = -Infinity;
    let bestArea = -Infinity;
    for (const f of faces) {
      const c = faceCentre(oc, f);
      const score = c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2];
      const area = faceArea(oc, f);
      if (score > bestScore + 1e-7 || (Math.abs(score - bestScore) <= 1e-7 && area > bestArea)) {
        best = f;
        bestScore = Math.max(score, bestScore);
        bestArea = area;
      }
    }
    return best;
  }
  if (part === 'side') {
    // The curved wall of a cylinder or cone: the face that is neither cap.
    const top = resolvePrimitiveFace(oc, shape, '+z');
    const bottom = resolvePrimitiveFace(oc, shape, '-z');
    const topC = top ? faceCentre(oc, top) : null;
    const botC = bottom ? faceCentre(oc, bottom) : null;
    const same = (a: [number, number, number] | null, b: [number, number, number]) =>
      a !== null && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-7;
    for (const f of faces) {
      const c = faceCentre(oc, f);
      if (!same(topC, c) && !same(botC, c)) return f;
    }
    return null;
  }
  return null;
}

/**
 * Find the face a name refers to on a built shape, or null.
 *
 * Null is a real answer and the caller must treat it as one: it means the
 * selection is lost, and lib/topo-name.ts's whyNameLost() exists to say why in
 * words a student can act on. Silently returning some other face would be the
 * behaviour that makes people distrust parametric CAD.
 */
export function resolveName(oc: Occt, name: TopoName, built: Map<string, any>): any | null {
  const shape = built.get(name.feature);
  if (!shape) return null;
  if (name.cause === 'primitive') return resolvePrimitiveFace(oc, shape, name.part);
  // carried / split / swept / cap / made need operation history or sweep
  // bookkeeping, which is the next slice. Returning null rather than guessing
  // is the point.
  return null;
}
