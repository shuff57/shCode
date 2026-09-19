import type { BuildResult, Occt } from './occt-build.js';
import type { TopoName } from '@shuff57/reshape-script/topo-name';
/** Every face of a shape, in the kernel's own order -- which is exactly the
 *  order nothing here is allowed to depend on. */
export declare function facesOf(oc: Occt, shape: any): any[];
/** Where a face's area is centred, in world coordinates. Used to tell faces
 *  apart by where they sit rather than by what index they arrived in. */
export declare function faceCentre(oc: Occt, face: any): [number, number, number];
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
export declare function resolvePrimitiveFace(oc: Occt, shape: any, part: string): any | null;
/**
 * The inverse of resolvePrimitiveFace(): given a real TopoDS_Face the
 * student actually clicked -- on a primitive's OWN shape, before anything is
 * cut from it, the exact scope resolvePrimitiveFace's own doc comment states
 * -- which named part is it?
 *
 * Tried in the same fixed order every time, so two rebuilds of an
 * unmodified primitive agree on the answer -- though the match itself is by
 * IsSame(), not by that order or by any index.
 */
export declare function namePrimitiveFace(oc: Occt, shape: any, feature: string, kind: 'box' | 'cylinder', face: any): TopoName | null;
/**
 * Name an EDGE the student clicked in the viewport, as the `between` of its
 * two adjacent faces -- see the `between` cause's own doc comment in
 * lib/topo-name.ts for why an edge is named by its faces rather than given a
 * naming mechanism of its own.
 *
 * Scoped to the same primitive set namePrimitiveFace() covers -- which is
 * also exactly the set Round/Bevel already work on (isRoundable() in
 * lib/model-types.ts). A box or cylinder's OWN shape has exactly two faces
 * meeting at any edge and both are always nameable; a shape with a real
 * operation history (a boolean, a sweep) can have edges bordering faces this
 * file has no name for yet, and this returns null rather than guessing which
 * -- the caller falls back to the whole-shape tool, the same way
 * whyCannotRound() already refuses those kinds today.
 */
export declare function nameEdgeBetweenPrimitiveFaces(oc: Occt, shape: any, feature: string, kind: 'box' | 'cylinder', edge: any): TopoName | null;
/**
 * Resolve a name, then push the result forward to the feature that is
 * actually going to USE it -- the counterpart to placed() for a name whose
 * root sits one or more `move` (or other recorded) steps behind where a
 * fillet or draft needs it.
 *
 * If the name already lives at `usedByFeature` (the ordinary case -- a
 * fillet on the very shape the edge was named against) this is exactly
 * resolveName() and nothing more runs. It is the fillet/draft call sites in
 * lib/occt-build.ts that need the push, because they alone resolve a name
 * against one feature (the edge's own history) and then hand the result to
 * BRepFilletAPI/BRepOffsetAPI_DraftAngle against a DIFFERENT, later shape.
 *
 * No recorded path between the two -- `chainToFeature` returns null -- is
 * not treated as failure here: it means this pair of features has no boolean
 * or move history linking them (most builds today), so the plain resolution
 * is already correct and is returned as-is rather than discarded.
 */
export declare function resolveNameAsUsedBy(oc: Occt, name: TopoName, build: BuildResult, usedByFeature: string): any | null;
/**
 * Find the face a name refers to on a built shape, or null.
 *
 * Null is a real answer and the caller must treat it as one: it means the
 * selection is lost, and lib/topo-name.ts's whyNameLost() exists to say why in
 * words a student can act on. Silently returning some other face would be the
 * behaviour that makes people distrust parametric CAD.
 */
export declare function resolveName(oc: Occt, name: TopoName, build: BuildResult): any | null;
/**
 * The name for a face that came through an operation without splitting.
 *
 * Returns null when the face was split instead, because `carried` would then be
 * a lie -- there are several faces with that history and the name would not say
 * which. The caller wants nameSplitPiece in that case, and the null is how it
 * finds out.
 */
export declare function nameCarried(oc: Occt, build: BuildResult, feature: string, of: TopoName): TopoName | null;
/**
 * The name for one piece of a face an operation split.
 *
 * The discriminator is computed the same way it will later be read: a point
 * known to lie on the chosen piece, expressed in the parameter space of the
 * face as it entered the splitting operation. Both halves going through
 * pointOnFace and uvOnFace is what keeps them honest -- a name is only written
 * if the point that identifies it can actually be found and located.
 *
 * `side` is recorded alongside it -- see siblingSide() and the 'split'
 * cause's own doc comment in lib/topo-name.ts for what it is for. Both are
 * computed on the SAME `fate.pieces` from the SAME rebuild, which is what
 * keeps them honest with each other the same way `at` already is.
 *
 * Null means the piece could not be identified, and no name is better than a
 * name that will not resolve.
 */
export declare function nameSplitPiece(oc: Occt, build: BuildResult, feature: string, of: TopoName, piece: any): TopoName | null;
/**
 * Name an edge picked on the CURRENT top-level shape of `pickedFeature` --
 * which may be a bare primitive, or something built on top of one (a Move, a
 * Hole, ...) -- by finding which primitive feature and named face pair
 * actually produced it.
 *
 * WHY nameEdgeBetweenPrimitiveFaces() ALONE IS NOT ENOUGH. That function only
 * ever compares against a primitive's OWN untouched shape, which is exactly
 * right for an edge picked on a fresh Box or Cylinder and silent for anything
 * built on top of one. The moment even a Move sits on top, the picked shape's
 * faces are no longer IsSame() with the primitive's own --
 * BRepBuilderAPI_Transform relocates a face rather than reusing its identity
 * untouched, see the long comment on the 'move' branch in lib/occt-build.ts
 * -- so a direct comparison always misses, even though the model genuinely
 * still remembers where the edge came from.
 *
 * THE FIX RUNS resolveNameAsUsedBy() BACKWARDS, AS A SEARCH. That function
 * already knows how to push a stored primitive-face name FORWARD across
 * however many recorded operations sit between where it was written and
 * where it is used -- moves, booleans, whatever `ops` holds; it is what a
 * FilletFeature itself resolves against when it rebuilds (see
 * lib/occt-build.ts's 'fillet' branch). Naming a click is the same problem
 * read the other way: try every primitive this document could mean, push
 * each of its candidate face names forward to `pickedFeature`, and keep
 * whichever one lands on the exact face that was clicked. Bounded and
 * cheap -- at most (primitive count) x (3-6 faces per primitive)
 * resolutions, never a search over the model's whole geometry.
 *
 * NARROW ON PURPOSE, the same discipline nameEdgeBetweenPrimitiveFaces()
 * already follows. A face with no recorded path back to any primitive --
 * the new wall a Hole drills, the reflected half of a Mirror (only its
 * fuse is recorded as an op, not the reflecting transform that made the
 * second half -- see that branch's own comment), the seam where two
 * different primitives actually meet in a Combine -- returns null here
 * rather than a guess. That is the same refusal resolveName() already gives
 * for a `made` name: no answer is better than a confident wrong one.
 */
export declare function nameEdgeOnCurrentShape(oc: Occt, build: BuildResult, doc: {
    features: Array<{
        id: string;
        kind: string;
    }>;
}, pickedFeature: string, edge: any): TopoName | null;
/**
 * Name a FACE picked on the CURRENT top-level shape of `pickedFeature`, by
 * the same brute-force-but-bounded search nameEdgeOnCurrentShape() already
 * runs for each of an edge's two adjacent faces (see that function's own
 * doc comment for why the search direction has to run backwards from "try
 * every primitive" rather than forwards from the click) -- extracted here so
 * a face pick that never touches an edge (Hollow's "leave this face open",
 * a future Draft or Mirror picker) can resolve a name too, not only a Round.
 */
export declare function nameFaceOnCurrentShape(oc: Occt, build: BuildResult, doc: {
    features: Array<{
        id: string;
        kind: string;
    }>;
}, pickedFeature: string, face: any): TopoName | null;
//# sourceMappingURL=topo-resolve.d.ts.map