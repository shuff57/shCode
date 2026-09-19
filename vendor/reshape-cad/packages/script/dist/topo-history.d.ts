/** The slice of OpenCascade this file calls. Same deliberate looseness as
 *  lib/occt-build.ts -- see the note there. */
export interface Occt {
    [name: string]: any;
}
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
export declare function listShapes(oc: Occt, list: any): any[];
/** What an operation did to one face that went into it. */
export type Fate = {
    kind: 'kept';
    face: any;
} | {
    kind: 'replaced';
    face: any;
} | {
    kind: 'split';
    pieces: any[];
} | {
    kind: 'deleted';
};
/**
 * Ask one boolean (or fillet, or shell) what became of one face.
 *
 * This is the whole mechanism. Everything above it -- carrying a fillet across
 * a rebuild, telling a student their selection is gone -- is bookkeeping on top
 * of these four answers.
 *
 * IsDeleted() true does not end the question the way it used to. An open
 * hollow's own closing face is the case that forced this open: the face
 * itself does not survive (there is a hole where it was, not a modified
 * version of it), but BRepOffsetAPI_MakeThickSolid still GENERATES real
 * geometry from it -- the rim where the opening meets the part's own outer
 * wall -- and a between() name naming an edge at that rim needs exactly that
 * face to resolve pushForward against. Modified() answers "what did this
 * face become"; Generated() answers "what did this operation BUILD from a
 * face that itself did not persist" -- a different question IsDeleted()
 * being true does not settle either way, so Generated() is only tried once
 * Modified()'s own precondition (the face persisting at all) has already
 * failed. Zero results from Generated() is the same honest "genuinely gone"
 * answer this always returned; a fillet or a plain boolean simply never has
 * anything there, so this costs them nothing.
 */
export declare function faceFate(oc: Occt, op: any, face: any): Fate;
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
export declare function uvOnFace(oc: Occt, face: any, pnt: any): {
    u: number;
    v: number;
} | null;
/** The world point at a raw (u, v) on a face. */
export declare function pointAt(oc: Occt, face: any, u: number, v: number): any;
/** Where a world point sits on a face, as a fraction of that face's own
 *  parameter range. Null if it does not lie on the face's surface. */
export declare function fractionOnFace(oc: Occt, face: any, pnt: any): {
    u: number;
    v: number;
} | null;
/** The inverse: the world point at a fraction of a face's parameter range.
 *  This is what makes a discriminator survive a rebuild -- the face is
 *  re-derived, its range comes back with it, and the same fraction lands in the
 *  same place relative to the face however the world has moved. */
export declare function pointAtFraction(oc: Occt, face: any, u: number, v: number): any;
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
export declare function distanceTo(oc: Occt, pnt: any, shape: any): number;
/** Every edge of a shape. Used to find the profile edge a sketch segment
 *  became -- see the note on generatedFrom. */
export declare function edgesOf(oc: Occt, shape: any): any[];
/** The one edge of `shape` that passes through a point, or null if none does
 *  or several do. Ambiguity is a refusal, for the same reason a split piece
 *  that two discriminators claim is a refusal. */
export declare function edgeThrough(oc: Occt, shape: any, pnt: any): any | null;
/**
 * The single face a sweep generated from one profile edge, or null.
 *
 * TRAP, and it is the one that decides how the profile has to be built: the
 * edges you hand to BRepBuilderAPI_MakeWire are NOT the edges that end up in
 * the wire. The builder copies and reorients them to make the wire connected,
 * so asking Generated() about an edge you kept a reference to answers with an
 * empty list -- for every edge except, confusingly, the first, which is added
 * as-is. Measured: a four-sided profile answered 1, 0, 0, 0.
 *
 * The fix is not to keep the edges at all. Build the face, walk the edges back
 * OFF it, and match each one to its outline segment by a point known to lie on
 * it. That is order-independent as well as correct, which matters because
 * explorer order is exactly the thing this whole design refuses to depend on.
 */
export declare function generatedFrom(oc: Occt, op: any, edge: any): any | null;
/**
 * The face capping one end of a sweep, or null.
 *
 * `closed` is not a convenience flag. A revolve that goes all the way round has
 * no caps -- the profile meets itself -- but FirstShape() and LastShape() still
 * return a face, and they return the PROFILE, which is not part of the solid at
 * all. Measured: a 90-degree revolve gives 6 faces with First and Last at
 * different places; the same profile at 360 gives 4 faces with First and Last
 * both at the profile's own centre. Handing that back would be a face the
 * student can never see, on a solid it is not part of.
 */
export declare function capOf(oc: Occt, op: any, end: 'top' | 'bottom', closed: boolean): any | null;
/**
 * The one edge two faces share, or null.
 *
 * This is all an edge name needs. A box has twelve edges, they are
 * indistinguishable to look at, and the kernel's order over them is exactly
 * what a name may not depend on -- but each one is the meeting of two faces,
 * and faces are already nameable. So the pair IS the name and this is the
 * whole of its resolution.
 *
 * IsSame rather than a geometric comparison: two faces of one solid share the
 * literal same edge, so identity is available and is stronger than proximity.
 * Null when they share none (opposite faces of a box) or several (which a
 * curved pair can genuinely do) -- both mean the name does not pick out one
 * edge, and refusing is the rule.
 */
export declare function sharedEdge(oc: Occt, a: any, b: any): any | null;
/**
 * Round one edge of a solid.
 *
 * The payoff of every naming slice before this one, and the reason the
 * refusal in .gauntlet/parity.json said "each needs face or edge selection on
 * a B-rep": rounding ONE edge is not a thing a mesh can express. What ships in
 * the app today is JSCAD's roundRadius, which rounds every edge of a box at
 * once and cannot be pointed at one.
 *
 * Measured against the analytic answer rather than a golden number: a fillet of
 * radius r along a straight edge of length L removes exactly
 * (1 - pi/4) * r^2 * L. On a 40x30x20 box, r=4 along the 30 edge: 103.009 in,
 * 103.009 out.
 *
 * ChFi3d_Rational is the surface family OCCT builds the blend from; it is the
 * ordinary choice and the only one of the three that is exact for a constant
 * radius on a straight edge.
 */
/** A fillet's result, plus the builder itself -- BRepFilletAPI_MakeFillet
 *  exposes the SAME IsDeleted()/Modified() history query interface a
 *  boolean's builder does (measured 2026-09-04: this kernel build binds all
 *  three of IsDeleted/Modified/Generated on it), so the caller can register
 *  it in BuildResult.ops exactly like occt-build.ts's own boolean() helper
 *  does -- see that function's own comment. Without this, a face nothing
 *  about the fillet touched (a box's own top face, after a Round on some
 *  other edge entirely) had NO recorded path forward at all: chainToFeature()
 *  never finds a hop into a fillet feature's own id, resolveNameAsUsedBy()
 *  falls back to the name resolved on its ORIGINAL pre-fillet shape, and
 *  IsSame() against the post-fillet tessellation fails -- fillet, unlike a
 *  boolean, does not reliably preserve untouched faces' own TShape identity,
 *  so the two are never "the same" object even though they are the same
 *  face. The practical cost: Hollow, opened at a face picked after a Round
 *  exists anywhere in the chain, silently built fully closed -- the pick
 *  still highlighted correctly (that path resolves the CURRENT tip's own
 *  face, not this one), but nameFaceOnCurrentShape() returned null for the
 *  SAME face when hollow() asked "which named face is this", so
 *  pickedFaceUsable stayed false and `open` was never passed to newShell(). */
export interface FilletResult {
    shape: any;
    op: any;
}
export declare function filleted(oc: Occt, shape: any, edge: any, radius: number): FilletResult | null;
/** Cut one edge off flat, at `distance` from it. The chamfer to filleted()'s
 *  round, and the same story: one named edge, not all of them. Returns the
 *  same shape+op pair, for the same reason -- see FilletResult's own doc
 *  comment; BRepFilletAPI_MakeChamfer shares its base class's history query
 *  interface with BRepFilletAPI_MakeFillet. */
export declare function chamfered(oc: Occt, shape: any, edge: any, distance: number): FilletResult | null;
/**
 * Tilt one face of a solid, so the part can leave a mould.
 *
 * `pull` is the direction the mould opens and `neutral` the plane that does not
 * move -- everything above it leans out, everything below leans in. Both are
 * required by the kernel and neither has a sensible default, so the caller
 * supplies them from the feature rather than this guessing.
 */
export declare function drafted(oc: Occt, shape: any, face: any, pull: [number, number, number], angleRad: number, neutralZ: number): any | null;
/**
 * Put a face where its solid actually ended up.
 *
 * A sweep's output is sometimes moved afterwards -- a revolve on an offset
 * sketch plane is built at the origin and then translated. The transform shares
 * the underlying geometry rather than copying it, so the face the sweep
 * generated is NOT a face of the moved solid: measured, IsSame() against every
 * face of the moved solid is false, and the face sits where the solid used to
 * be. Applying the same transform to the face lands it exactly on the right
 * one. Skipping this would hand back a face floating in space, which is worse
 * than null because it looks like an answer.
 */
export declare function placed(oc: Occt, shape: any, trsf: any | null): any | null;
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
export declare function pointOnFace(oc: Occt, face: any): any | null;
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
export declare function pieceContaining(oc: Occt, pieces: any[], pnt: any): any | null;
//# sourceMappingURL=topo-history.d.ts.map