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
// WHAT IS HERE AND WHAT IS NOT. `primitive` names -- the faces of a box,
// cylinder, sphere, cone or torus -- resolve from the shape alone, with no
// operation history needed. `carried` and `split` names, the ones that ride
// through a boolean, resolve through the operation history that buildDoc now
// keeps alive; lib/topo-history.ts is the layer that asks the kernel and this
// file is the bookkeeping on top of it.
//
// `swept`, `rounded` and `cap` resolve through the sweep history buildDoc keeps
// alongside the boolean history -- a prism or revolve GENERATES one wall per
// profile edge and a cap at each end, which is an exact answer rather than a
// discriminated one.
//
// `made` still returns null, and it is worth saying why rather than listing it
// as missing: the faces a cut appears to invent -- the floor and walls of a
// groove -- are not invented at all, they are the TOOL'S faces carried through.
// So they are already nameable with the machinery here, off the tool feature's
// id, and `made` may turn out to be needed only for the seams a fuse genuinely
// creates. That is a design question, not a gap, and it is left open rather
// than guessed at.

import type { BuildResult, Occt, OpRecord } from './occt-build';
import type { TopoName } from './topo-name';
import {
  capOf, faceFate, fractionOnFace, generatedFrom, pieceContaining,
  placed, pointAtFraction, pointOnFace, sharedEdge,
} from './topo-history';

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
 * The operations at a feature that a given ancestor's face has to pass through.
 *
 * A combine over three targets is two pairwise booleans. A face of the first
 * target sees both; a face of the third only sees the second. Starting at the
 * wrong one asks an operation about a face it has never seen, which answers
 * "deleted" and loses a selection that was never actually lost.
 *
 * An ancestor the chain does not mention -- a name rooted several features back
 * -- falls back to the whole chain, which is the conservative reading: it went
 * in at the beginning.
 */
function chainFor(build: BuildResult, feature: string, ancestor: string): OpRecord[] {
  const list = build.ops.get(feature) ?? [];
  const at = list.findIndex((r) => r.inputs.includes(ancestor));
  return at < 0 ? list : list.slice(at);
}

/**
 * Push a face forward through a chain of booleans.
 *
 * `discriminator` is consulted only where an operation SPLITS the face, and it
 * is evaluated on the face as it enters that operation -- which is the face
 * whose pieces they are. For the single-boolean case, which is what the app
 * actually produces today, that is exactly the parent face the name was written
 * against. Naming uses the same rule (see nameSplitPiece), so the two halves
 * agree by construction rather than by coincidence.
 *
 * A split met by a name that carries no discriminator returns null. That is not
 * a gap: it means an edit turned one face into several and the name predates
 * the split, so there is genuinely no answer to which piece was meant.
 */
function pushThrough(
  oc: Occt,
  chain: OpRecord[],
  face: any,
  discriminator: { u: number; v: number } | null,
): any | null {
  let cur = face;
  for (const rec of chain) {
    const fate = faceFate(oc, rec.op, cur);
    if (fate.kind === 'deleted') return null;
    if (fate.kind === 'kept' || fate.kind === 'replaced') {
      cur = fate.face;
      continue;
    }
    if (!discriminator) return null;
    const p = pointAtFraction(oc, cur, discriminator.u, discriminator.v);
    const hit = pieceContaining(oc, fate.pieces, p);
    if (!hit) return null;
    cur = hit;
  }
  return cur;
}

/**
 * Find the face a name refers to on a built shape, or null.
 *
 * Null is a real answer and the caller must treat it as one: it means the
 * selection is lost, and lib/topo-name.ts's whyNameLost() exists to say why in
 * words a student can act on. Silently returning some other face would be the
 * behaviour that makes people distrust parametric CAD.
 */
export function resolveName(oc: Occt, name: TopoName, build: BuildResult): any | null {
  if (name.cause === 'primitive') {
    const shape = build.shapes.get(name.feature);
    return shape ? resolvePrimitiveFace(oc, shape, name.part) : null;
  }
  if (name.cause === 'carried' || name.cause === 'split') {
    // The ancestor is resolved on ITS OWN feature's shape -- the state of the
    // model before this operation ran -- and then pushed forward. Resolving it
    // against the result would be asking for the answer this function exists to
    // compute.
    const parent = resolveName(oc, name.of, build);
    if (!parent) return null;
    const chain = chainFor(build, name.feature, name.of.feature);
    if (!chain.length) return null;
    return pushThrough(oc, chain, parent, name.cause === 'split' ? name.at : null);
  }
  if (name.cause === 'swept' || name.cause === 'rounded') {
    const rec = build.sweeps.get(name.feature);
    // `from` is checked rather than trusted: a name written against one sketch
    // and read back after the pull was retargeted at another refers to an edge
    // that exists but is not the one meant.
    if (!rec || rec.from !== name.from) return null;
    const want = name.cause === 'swept' ? 'edge' : 'corner';
    const at = name.cause === 'swept' ? name.edge : name.corner;
    const seg = rec.segments.find((s) => s.role === want && s.index === at);
    if (!seg) return null;
    return placed(oc, generatedFrom(oc, rec.op, seg.edge), rec.after);
  }
  if (name.cause === 'between') {
    // Both faces are resolved on the SAME built shape, and the edge is the one
    // they share. Nothing here knows or cares which edge index that is, which
    // is the entire point -- the same pair of face names finds the same edge on
    // a box of any size.
    const a = resolveName(oc, name.of[0], build);
    const b = resolveName(oc, name.of[1], build);
    return a && b ? sharedEdge(oc, a, b) : null;
  }
  if (name.cause === 'cap') {
    const rec = build.sweeps.get(name.feature);
    if (!rec) return null;
    return placed(oc, capOf(oc, rec.op, name.end, rec.closed), rec.after);
  }
  // made -- see the header. Returning null rather than guessing is the point.
  return null;
}

// ---- writing a name down ----------------------------------------------------
//
// The inverse direction, and it has to exist here rather than in
// lib/topo-name.ts: deciding whether a face was carried or split, and where its
// discriminator goes, is a question about real geometry.

/**
 * The name for a face that came through an operation without splitting.
 *
 * Returns null when the face was split instead, because `carried` would then be
 * a lie -- there are several faces with that history and the name would not say
 * which. The caller wants nameSplitPiece in that case, and the null is how it
 * finds out.
 */
export function nameCarried(
  oc: Occt,
  build: BuildResult,
  feature: string,
  of: TopoName,
): TopoName | null {
  const parent = resolveName(oc, of, build);
  if (!parent) return null;
  const chain = chainFor(build, feature, of.feature);
  if (!chain.length) return null;
  for (const rec of chain) {
    const fate = faceFate(oc, rec.op, parent);
    if (fate.kind === 'deleted' || fate.kind === 'split') return null;
  }
  return { cause: 'carried', feature, kind: of.kind, of };
}

/**
 * The name for one piece of a face an operation split.
 *
 * The discriminator is computed the same way it will later be read: a point
 * known to lie on the chosen piece, expressed in the parameter space of the
 * face as it entered the splitting operation. Both halves going through
 * pointOnFace and uvOnFace is what keeps them honest -- a name is only written
 * if the point that identifies it can actually be found and located.
 *
 * Null means the piece could not be identified, and no name is better than a
 * name that will not resolve.
 */
export function nameSplitPiece(
  oc: Occt,
  build: BuildResult,
  feature: string,
  of: TopoName,
  piece: any,
): TopoName | null {
  const parent = resolveName(oc, of, build);
  if (!parent) return null;
  let cur = parent;
  for (const rec of chainFor(build, feature, of.feature)) {
    const fate = faceFate(oc, rec.op, cur);
    if (fate.kind === 'deleted') return null;
    if (fate.kind === 'kept' || fate.kind === 'replaced') {
      cur = fate.face;
      continue;
    }
    const on = pointOnFace(oc, piece);
    if (!on) return null;
    // Belt and braces: the point has to identify the piece uniquely among its
    // siblings, or the name would resolve to null the moment it was read back.
    if (!pieceContaining(oc, fate.pieces, on)) return null;
    const uv = fractionOnFace(oc, cur, on);
    return uv ? { cause: 'split', feature, kind: of.kind, of, at: uv } : null;
  }
  return null;
}
