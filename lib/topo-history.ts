// Asking a boolean what became of a face.
//
// lib/topo-name.ts is the algebra of names and lib/topo-resolve.ts turns a name
// back into a face. This file is the one underneath both: the small set of
// OpenCascade calls that answer "this face went into the operation -- what came
// out?". It is separate because every one of these calls has a trap in it, and
// they are better collected in one file with the measurement written down than
// scattered through the resolver.
//
// WHAT A BOOLEAN DOES TO A FACE. Four outcomes, and the naming design in
// topo-name.ts is built around exactly these:
//
//   kept      Modified() empty, IsDeleted() false. The face came through
//             untouched and is literally the same face in the result.
//   replaced  Modified() has one entry. Same identity, new geometry -- a side
//             wall that gained a notch. This is `carried`.
//   split     Modified() has several. One face in, several out, and the
//             history alone cannot say which one the student meant. This is
//             `split`, and the discriminator is what tells them apart.
//   deleted   IsDeleted(). The face is gone and any name rooted in it is lost.
//
// Measured on this build, 2026-09-01, cutting a 10-wide groove across the top
// of a 40x40x20 box:
//
//   side x=0, x=40, bottom   kept
//   side y=0, y=40           replaced (each gained a notch)
//   TOP                      split into two, at x=-12.5 and x=+12.5
//
// FOUR BINDING TRAPS, all of them found the hard way and none of them obvious
// from the error text. They are noted at each call site as well, because that
// is where the next person will be standing.

/** The slice of OpenCascade this file calls. Same deliberate looseness as
 *  lib/occt-build.ts -- see the note there. */
export interface Occt {
  [name: string]: any;
}

/** How far apart two points have to be before they count as different. The
 *  kernel's own modelling tolerance is 1e-7; this is a decimal order looser so
 *  a point that is genuinely ON a face is not rejected for floating-point
 *  noise. */
const ON_TOL = 1e-6;

/**
 * Every shape in one of OpenCascade's history lists.
 *
 * TRAP 1: `TopTools_ListIteratorOfListOfShape` is NOT bound in this build, and
 * neither is `TopTools_ListOfShape` -- the list is exported under its
 * NCollection name. There is no iterator at all. What the list does have is
 * Assign, First, RemoveFirst and (inherited, so it does not show in
 * getOwnPropertyNames) Size and IsEmpty.
 *
 * So the walk is destructive, over a COPY. Assigning into a fresh list first is
 * not defensive tidiness: `Modified()` hands back the algorithm's own list, and
 * emptying that would quietly destroy the history for every later query.
 *
 * TRAP 2: each element has to be `.clone()`d on the way out. The handle
 * `First()` returns points into the copy, and the very next `RemoveFirst()`
 * invalidates it.
 */
export function listShapes(oc: Occt, list: any): any[] {
  if (!list) return [];
  const copy = new oc.NCollection_List_TopoDS_Shape();
  copy.Assign(list);
  const out: any[] = [];
  while (!copy.IsEmpty()) {
    out.push(copy.First().clone());
    copy.RemoveFirst();
  }
  return out;
}

/** What an operation did to one face that went into it. */
export type Fate =
  | { kind: 'kept'; face: any }
  | { kind: 'replaced'; face: any }
  | { kind: 'split'; pieces: any[] }
  | { kind: 'deleted' };

/**
 * Ask one boolean what became of one face.
 *
 * This is the whole mechanism. Everything above it -- carrying a fillet across
 * a rebuild, telling a student their selection is gone -- is bookkeeping on top
 * of these four answers.
 */
export function faceFate(oc: Occt, op: any, face: any): Fate {
  if (!op || !face) return { kind: 'deleted' };
  let gone = false;
  try {
    gone = op.IsDeleted(face);
  } catch {
    // A face the operation never saw. Not an error worth throwing over: the
    // caller asked a reasonable question and the answer is "not mine".
    return { kind: 'deleted' };
  }
  if (gone) return { kind: 'deleted' };
  const mod = listShapes(oc, op.Modified(face));
  if (mod.length === 0) return { kind: 'kept', face };
  if (mod.length === 1) return { kind: 'replaced', face: mod[0] };
  return { kind: 'split', pieces: mod };
}

// ---- points and parameters --------------------------------------------------
//
// The discriminator that tells split pieces apart is a (u, v) in the PARENT
// face's parameter space -- see the header of lib/topo-name.ts for why it is
// not an ordinal. These four functions are how it is written down and read
// back.

/**
 * Where a world point lands in a face's parameter space, or null if it does
 * not lie on that face's surface at all.
 *
 * TRAP 3: out-parameters do not work the way opencascade.js documents them.
 * `LowerDistanceParameters({current:0}, {current:0})` leaves both wrappers at
 * zero and reports success -- a silent wrong answer, and (0, 0) is a plausible
 * enough parameter pair that it does not look wrong. `Parameters(1, u, v)`
 * RETURNS the pair instead, as `{ U, V }`. Measured: a point at world
 * (-12, 5) on a centred 40-box's top face is (8, 25), which is the corner-based
 * parameterisation and not the origin-based one.
 */
export function uvOnFace(oc: Occt, face: any, pnt: any): { u: number; v: number } | null {
  // TRAP 4, shared with lib/occt-build.ts: BRep_Tool.Surface wants a
  // TopoDS_Face. TopExp_Explorer hands out TopoDS_Shape, and the BindingError
  // it throws names the type it got but not the call that wanted it.
  const surf = oc.BRep_Tool.Surface(oc.TopoDS.Face(face));
  const proj = new oc.GeomAPI_ProjectPointOnSurf(pnt, surf, 1e-7);
  if (!proj.NbPoints || proj.NbPoints() < 1) return null;
  const uv = proj.Parameters(1, { current: 0 }, { current: 0 });
  if (!uv || typeof uv.U !== 'number') return null;
  return { u: uv.U, v: uv.V };
}

/** The world point at a raw (u, v) on a face. */
export function pointAt(oc: Occt, face: any, u: number, v: number): any {
  return new oc.BRepAdaptor_Surface(oc.TopoDS.Face(face), true).Value(u, v);
}

/**
 * A face's own parameter range. Read off the adaptor rather than
 * BRepTools.UVBounds, whose out-parameters are subject to the same trap as
 * LowerDistanceParameters -- it leaves the wrappers at zero and reports
 * nothing wrong.
 */
function uvRange(oc: Occt, face: any): { u0: number; u1: number; v0: number; v1: number } {
  const ad = new oc.BRepAdaptor_Surface(oc.TopoDS.Face(face), true);
  return {
    u0: ad.FirstUParameter(), u1: ad.LastUParameter(),
    v0: ad.FirstVParameter(), v1: ad.LastVParameter(),
  };
}

// A discriminator is stored as a FRACTION of the parent face's parameter range,
// not as a raw parameter. This is not a detail; it is the difference between
// the design working and not, and it was settled by measurement rather than
// argument.
//
// OpenCascade parameterises a box face from one of its corners, so a raw
// parameter is a distance from a corner the kernel picked and nobody chose.
// Measured: a bar 40 wide with a 10-wide slot across the top splits into pieces
// at x -20..-5 and x 5..20, whose raw u are 7.5 and 32.5. Widen the bar to 70
// and the corner moves. u=7.5 still lands on the left piece, because the left
// piece is the one touching that corner. u=32.5 lands at x=-2.5, which is
// inside the slot -- on no piece at all, so the name resolves to null and a
// student's fillet silently falls off the part.
//
// As a fraction both survive: 0.1875 and 0.8125 of the face's width land on the
// left and right pieces at 40, 70 and 26 wide. A fraction is also what a person
// means by "the left one" -- a relative position on the face -- where a raw
// parameter means "so many millimetres from an arbitrary corner", which nobody
// means. It has a failure mode of its own and it is worth naming: a face that
// grows while the feature splitting it stays put will eventually drag the
// fraction off the intended piece. That is the case where the answer is null,
// and null is the honest answer.

/** Where a world point sits on a face, as a fraction of that face's own
 *  parameter range. Null if it does not lie on the face's surface. */
export function fractionOnFace(oc: Occt, face: any, pnt: any): { u: number; v: number } | null {
  const raw = uvOnFace(oc, face, pnt);
  if (!raw) return null;
  const r = uvRange(oc, face);
  const du = r.u1 - r.u0;
  const dv = r.v1 - r.v0;
  // A range of zero would be a degenerate face; 0.5 keeps the point in the
  // middle of nothing rather than producing an infinity.
  return {
    u: Math.abs(du) < 1e-12 ? 0.5 : (raw.u - r.u0) / du,
    v: Math.abs(dv) < 1e-12 ? 0.5 : (raw.v - r.v0) / dv,
  };
}

/** The inverse: the world point at a fraction of a face's parameter range.
 *  This is what makes a discriminator survive a rebuild -- the face is
 *  re-derived, its range comes back with it, and the same fraction lands in the
 *  same place relative to the face however the world has moved. */
export function pointAtFraction(oc: Occt, face: any, u: number, v: number): any {
  const r = uvRange(oc, face);
  return pointAt(oc, face, r.u0 + (r.u1 - r.u0) * u, r.v0 + (r.v1 - r.v0) * v);
}

/**
 * How far a world point is from a face, counting the face's trimmed boundary.
 *
 * This is the containment test, and it has to respect trimming: a point on the
 * top plane of the box but sitting over the groove is ON the surface and OFF
 * the face, and only the trimmed distance tells them apart.
 * `BRepClass_FaceClassifier` would be the direct way and is not bound in this
 * build; BRepExtrema_DistShapeShape measures to the trimmed face and answers
 * the same question.
 *
 * TRAP, the same shape as MakeFace(wire) in lib/occt-build.ts: the
 * THREE-argument constructor binds to an `Extrema_ExtFlag` overload whose enum
 * is not exported, and fails with "parameter 0 has unknown type
 * 15Extrema_ExtFlag" -- an error that names neither argument you passed. The
 * two-argument form is bound and works.
 */
export function distanceToFace(oc: Occt, pnt: any, face: any): number {
  const v = new oc.BRepBuilderAPI_MakeVertex(pnt).Vertex();
  return new oc.BRepExtrema_DistShapeShape(v, face).Value();
}

/** Where a face's area is centred. Duplicated from lib/topo-resolve.ts rather
 *  than imported so that this file has no dependency of its own -- it is the
 *  bottom of the stack and both files above it use it. */
function centreOf(oc: Occt, face: any): any {
  const g = new oc.GProp_GProps();
  oc.BRepGProp.SurfaceProperties(face, g, false, false);
  return g.CentreOfMass();
}

/**
 * A world point KNOWN to lie on a face.
 *
 * The centre of area is the obvious candidate and is right for the rectangular
 * pieces a groove or a slot produces. It is not right in general: an L-shaped
 * piece, or one with a hole through the middle, centres somewhere that is not
 * on it. So the centre is CHECKED rather than assumed, and a grid over the
 * face's own parameter range is the fallback.
 *
 * Returning null when even the grid finds nothing is a real answer. A
 * discriminator that does not lie on the piece it is supposed to identify would
 * resolve to nothing later, and it is better to refuse to write the name than
 * to write one that is quietly dead.
 */
export function pointOnFace(oc: Occt, face: any): any | null {
  const c = centreOf(oc, face);
  if (distanceToFace(oc, c, face) <= ON_TOL) return c;
  const ad = new oc.BRepAdaptor_Surface(oc.TopoDS.Face(face), true);
  const u0 = ad.FirstUParameter();
  const u1 = ad.LastUParameter();
  const v0 = ad.FirstVParameter();
  const v1 = ad.LastVParameter();
  const N = 7;
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= N; j++) {
      const p = ad.Value(u0 + ((u1 - u0) * i) / (N + 1), v0 + ((v1 - v0) * j) / (N + 1));
      if (distanceToFace(oc, p, face) <= ON_TOL) return p;
    }
  }
  return null;
}

/**
 * Which of several pieces contains a point, or null.
 *
 * Null covers two different failures and deliberately does not distinguish
 * them here: no piece contains it (the change was big enough to move the
 * geometry out from under the name), or several do (the point landed on a
 * shared edge). Both mean the selection cannot be honoured, and the rule this
 * whole design exists to enforce is that a name which cannot be resolved is
 * never quietly moved to a neighbour.
 */
export function pieceContaining(oc: Occt, pieces: any[], pnt: any): any | null {
  const hits = pieces.filter((f) => distanceToFace(oc, pnt, f) <= ON_TOL);
  return hits.length === 1 ? hits[0] : null;
}
