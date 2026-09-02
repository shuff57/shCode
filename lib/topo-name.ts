// Stable names for faces and edges, so a student's selection survives a rebuild.
//
// THE PROBLEM. A B-rep kernel gives you ADDRESSABLE faces. It does not give you
// PERSISTENT ones. Change an upstream dimension, the kernel rebuilds, and you
// get a fresh shape whose faces are in a fresh order. "Face 3" is not
// necessarily the face the student clicked. Every parametric CAD system has to
// solve this and it is the one FreeCAD lived with as its most notorious defect
// for over a decade. Adopting a kernel is the easy half; this file is the hard
// half.
//
// THE IDEA. A name is not a position in the result. It is a path through the
// history that PRODUCED the result. shCode has an unusual advantage here:
// ModelDoc is already an ordered list of features with stable string ids, which
// is exactly the substrate a naming scheme needs and what most CAD systems have
// to retrofit. Every face in the final solid has a first cause somewhere in
// that list, and the name is that cause written down.
//
//   e1.side[sk1.edge0]     the side face extrude e1 swept from sketch edge 0
//   e1.cap[top]            the face capping the top of that extrude
//   b1.face[+z]            the top face of box b1
//   op1.split[b1.face[+z], near(12.5,4)]
//                          a piece of that box face, cut into several by op1
//
// Read the last one carefully, because it is where the difficulty actually
// lives. A boolean does not merely keep or drop faces: it SPLITS them. One face
// goes in and three come out, and which of the three the student meant cannot
// be answered by the history alone -- the history says "all three came from
// b1.face[+z]". Something has to distinguish them.
//
// WHAT DISTINGUISHES A SPLIT PIECE. Not an ordinal. `split[..., 0]` is exactly
// the index-based naming this file exists to avoid: change an upstream number,
// the pieces come back in a different order, and the fillet jumps to a
// different piece of the same face. Instead a piece carries a geometric
// discriminator -- a point known to lie on it -- expressed in the PARENT
// face's own parameter space so it moves with the parent rather than with the
// world. On a rebuild the pieces are re-derived and the one containing that
// point wins.
//
// That is a heuristic and it is worth being honest about its failure mode: if
// a change is large enough that no piece contains the old point, the name does
// not resolve. That is a real limit, and the answer to it is not to guess. See
// the note on unresolvable names at the bottom.
//
// WHAT THIS FILE IS NOT. There is no kernel here. This is the algebra of names
// -- their shape, how they are written down, how they are read back, and what
// each feature kind is entitled to name. Resolution against real geometry is
// the next piece and it needs OpenCascade's Modified/Generated history maps.
// Keeping the two apart means the naming rules can be tested against
// arithmetic, the way lib/least-squares.ts is, rather than only against a
// running kernel.

/** Which of a shape's parts a name refers to. */
export type TopoKind = 'face' | 'edge' | 'vertex';

/**
 * A point that is known to lie on the thing being named, used only to tell
 * apart pieces that share a cause -- see the header.
 *
 * `u`/`v` are in the PARENT surface's parameter space, not in world
 * coordinates, so that stretching the model moves the discriminator with the
 * face it belongs to instead of leaving it behind. Rounded on purpose: two
 * rebuilds of the same model should produce the same name text, and raw
 * floats do not.
 */
export interface OnPoint {
  u: number;
  v: number;
}

/** The generative causes a name can be built from. One per way a face or edge
 *  can come into existence in this app. */
export type TopoName =
  /** A face of a primitive, named by the direction it faces or its role.
   *  `b1.face[+z]`, `c1.face[side]`. Primitives have a fixed, knowable set. */
  | { cause: 'primitive'; feature: string; kind: TopoKind; part: string }
  /** A face or edge an extrude or revolve swept from one sketch edge.
   *  `e1.side[sk1.edge0]`. The sketch edge index is itself already stable --
   *  reindex() in lib/sketch-arc.ts keeps it so across corner insertion and
   *  removal, which is why this is a sound thing to name from. */
  | { cause: 'swept'; feature: string; kind: TopoKind; from: string; edge: number }
  /** The cap a sweep puts on its own end. `e1.cap[top]`. */
  | { cause: 'cap'; feature: string; kind: TopoKind; end: 'top' | 'bottom' }
  /** A part that came through an operation unchanged, keeping its identity.
   *  The common case for a boolean: most faces are untouched. */
  | { cause: 'carried'; feature: string; kind: TopoKind; of: TopoName }
  /** One of several pieces an operation cut a single parent part into. The
   *  discriminator, not an ordinal, is what tells the pieces apart. */
  | { cause: 'split'; feature: string; kind: TopoKind; of: TopoName; at: OnPoint }
  /** A part that did not exist before this operation -- the wall a subtraction
   *  cuts, the seam a union makes. It has no ancestor to name, so it is named
   *  by its maker and located by a discriminator. */
  | { cause: 'made'; feature: string; kind: TopoKind; at: OnPoint };

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

/** Write a name as text: stable, comparable, and readable in a message to a
 *  student. Two rebuilds of the same model must produce the same string, which
 *  is why the discriminator is rounded rather than raw. */
export function formatName(n: TopoName): string {
  const at = (p: OnPoint) => `near(${r4(p.u)},${r4(p.v)})`;
  switch (n.cause) {
    case 'primitive': return `${n.feature}.${n.kind}[${n.part}]`;
    case 'swept': return `${n.feature}.${n.kind}[${n.from}.edge${n.edge}]`;
    case 'cap': return `${n.feature}.cap[${n.end}]`;
    case 'carried': return `${n.feature}.same[${formatName(n.of)}]`;
    case 'split': return `${n.feature}.split[${formatName(n.of)}, ${at(n.at)}]`;
    case 'made': return `${n.feature}.made[${n.kind}, ${at(n.at)}]`;
  }
}

/** The feature a name ultimately hangs off -- the earliest one in the chain.
 *  This is what a dependency check asks for: delete that feature and every
 *  name rooted in it is gone, which is a thing to say out loud rather than
 *  discover at rebuild time. */
export function rootFeature(n: TopoName): string {
  return n.cause === 'carried' || n.cause === 'split' ? rootFeature(n.of) : n.feature;
}

/** Every feature id a name passes through, nearest cause first. Used to decide
 *  whether an edit can possibly have disturbed a selection: if none of these
 *  ids changed, the name did not need re-resolving at all. */
export function featureChain(n: TopoName): string[] {
  const out = [n.feature];
  if (n.cause === 'carried' || n.cause === 'split') out.push(...featureChain(n.of));
  return out;
}

/**
 * Is this name still meaningful in this document?
 *
 * A structural check only -- it asks whether the features and sketch edges the
 * name refers to still exist, not whether the geometry still has such a face.
 * Cheap, runs without a kernel, and catches the common case: a student removed
 * the sketch corner that a filleted edge was swept from.
 */
export function nameIsStructurallyValid(
  n: TopoName,
  featureExists: (id: string) => boolean,
  sketchEdgeCount: (id: string) => number | null,
): boolean {
  if (!featureExists(n.feature)) return false;
  if (n.cause === 'swept') {
    const count = sketchEdgeCount(n.from);
    if (count === null || n.edge < 0 || n.edge >= count) return false;
  }
  if (n.cause === 'carried' || n.cause === 'split') {
    return nameIsStructurallyValid(n.of, featureExists, sketchEdgeCount);
  }
  return true;
}

/**
 * Why a name no longer resolves, phrased for a student.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a name that cannot be resolved is
 * never silently dropped and never silently moved to a neighbour. Both are
 * worse than an error, because both look like the model quietly deciding
 * something on the student's behalf -- and a fillet that hops to a different
 * edge when you change an unrelated dimension is exactly the behaviour that
 * makes people distrust parametric CAD.
 *
 * Same contract as whyCannotRoundCorner() and whyRemovingCornerCosts() in
 * lib/sketch-arc.ts: say what was lost, say what caused it, and let the caller
 * decide what to do about it.
 */
export function whyNameLost(
  n: TopoName,
  featureExists: (id: string) => boolean,
  sketchEdgeCount: (id: string) => number | null,
  label: (id: string) => string,
): string | null {
  if (!featureExists(n.feature)) {
    return `That ${n.kind} was made by ${label(n.feature)}, which is no longer in the model.`;
  }
  if (n.cause === 'swept') {
    const count = sketchEdgeCount(n.from);
    if (count === null) {
      return `That ${n.kind} was pulled from ${label(n.from)}, which is no longer in the model.`;
    }
    if (n.edge < 0 || n.edge >= count) {
      return `That ${n.kind} was pulled from edge ${n.edge + 1} of ${label(n.from)}, `
        + `which now has only ${count} edge${count === 1 ? '' : 's'}.`;
    }
  }
  if (n.cause === 'carried' || n.cause === 'split') {
    return whyNameLost(n.of, featureExists, sketchEdgeCount, label);
  }
  return null;
}
