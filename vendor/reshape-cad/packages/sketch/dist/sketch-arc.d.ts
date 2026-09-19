import type { Constraint } from './sketch-solve.js';
export type Point = [number, number];
/** The minimal shape reindex()/circleOf()/tessellate() need. A SketchFeature
 *  satisfies this structurally, without either file importing the other --
 *  model-types.ts imports FROM here (reindex, for addCorner), so this file
 *  must never import model-types.ts back. */
export interface SketchLike {
    points: Point[];
    shape?: 'circle';
    bulges?: Record<number, number>;
    /** Radius the student asked for on DESIGN corner n. See outlineOf(). */
    rounds?: Record<number, number>;
    /** Chamfer trim distance the student asked for on DESIGN corner n. See
     *  outlineOf(). */
    chamfers?: Record<number, number>;
    constraints?: Constraint[];
}
/**
 * Rebuild an arc from the two endpoints of its chord and its bulge.
 *
 * Derivation (the identity that makes bulge useful at all): with half-chord
 * h = |b-a|/2 and half-angle t = includedAngle/4, the sagitta is h*bulge and
 * the radius is h*(bulge + 1/bulge)/2 = |b-a|*(1+bulge^2)/(4*|bulge|). The
 * center sits on the chord's perpendicular bisector, on the LEFT of a->b for
 * a positive (CCW) bulge -- verified against a hand-worked fillet: a=[25,0],
 * b=[28,9], bulge=0.720748 puts the center at exactly [25,5], radius 5.
 * Flipping the sign puts it at [28,4] instead -- outside the corner instead
 * of inside it, which is the sign-error failure this shape of bug produces.
 */
export declare function arcFromBulge(a: Point, b: Point, bulge: number): {
    center: Point;
    radius: number;
    startAngle: number;
    endAngle: number;
};
/** Reads f.shape and nothing else -- the tag IS the answer, never a distance
 *  comparison on the points. A non-circle sketch (shape absent) is null,
 *  never guessed at from having exactly two points. */
export declare function circleOf(f: {
    shape?: 'circle';
    points: Point[];
}): {
    center: Point;
    radius: number;
} | null;
/**
 * The real ceiling on this corner's fillet radius: the radius whose trim
 * distance (r / tan(interior/2), filletCorner()'s own formula) reaches
 * exactly half the shorter adjacent edge.
 *
 * This USED to be angle-blind -- half the shorter edge, full stop -- on the
 * theory that the corner's own angle didn't need to factor in. That was
 * wrong: trim grows much faster than radius as a corner sharpens, so a sharp
 * corner's true safe radius is far SMALLER than half its edge, and the old
 * formula let a radius through that trimmed straight past the far corner and
 * self-crossed the outline (Finding 1, sketch gauntlet round 2). At a
 * 90-degree corner tan(45deg) = 1, so this returns the same number the old
 * formula did -- verified by the existing rectangle assertion below, which a
 * fix that broke the 90-degree case would fail.
 *
 * Two whole-corner refusals live here rather than in the caller, because
 * every caller of this number treats 0 as "this corner cannot be rounded":
 *
 *   - A STRAIGHT corner (interior 180deg). This used to fall out as
 *     tan(PI/2) = Infinity, i.e. "any radius you like" -- and filletCorner()
 *     then trimmed by r/tan(PI/2) = 0 and spliced two IDENTICAL points with
 *     a zero bulge, leaving a duplicate point and a zero-length edge that
 *     made every later round of the neighbours no-op forever. Every corner
 *     addCorner() creates on a straight edge is exactly this corner, so it
 *     was not a corner case, it was the common case.
 *   - A corner with an already-CURVED edge on either side. filletCorner()'s
 *     whole construction reads the two adjacent edges as straight chords, so
 *     next to an arc it neither meets the arc tangentially nor leaves that
 *     arc's radius alone (trimming its chord while its bulge factor stays
 *     put silently rescales it). Refusing is the honest answer; see
 *     whyCannotRoundCorner() for the words.
 *
 * `bulges` is optional so a caller with only a point list still gets the
 * straight/sharp answers; pass it whenever you have it.
 */
export declare function maxFilletRadius(points: Point[], corner: number, bulges?: Record<number, number>): number;
/**
 * Plain words for why THIS corner cannot take a fillet at all, or null when
 * some positive radius would work. maxFilletRadius() returning 0 already
 * disables the slider (min === max === 0), but a caller that reaches this
 * corner anyway -- a stale value already in the field, a future caller that
 * skips the slider -- needs something to say instead of quietly building
 * nothing, the same complaint whyCannotRound() in model-types.ts exists to
 * answer for a whole feature.
 *
 * On remedies: only the two ANGLE answers name one, and the remedy they name
 * is dragging the corner, which is a real handle a student can grab --
 * sketchHandles() in lib/model-handles.ts emits a two-axis 'point' handle per
 * sketch corner and HandleOverlay.tsx draws it. The CURVED-neighbour answer
 * deliberately names no remedy: there is no un-round action in the app, so
 * "straighten that edge first" would be an instruction with nothing behind
 * it. It states the limit and stops.
 */
export declare function whyCannotRoundCorner(points: Point[], corner: number, bulges?: Record<number, number>): string | null;
/**
 * The real ceiling on this corner's chamfer trim distance: the distance at
 * which trimming both edges reaches exactly the far end of the shorter
 * adjacent edge. A chamfer's input IS the trim distance -- there is no
 * radius-to-trim conversion, no tan() -- so the ceiling is simply
 * `Math.min(lenIn, lenOut)`, unlike maxFilletRadius()'s
 * `(Math.min/2) * tan(interior/2)`.
 *
 * The two whole-corner refusals are the same three as maxFilletRadius() and
 * in the same spirit (a caller treats 0 as "this corner cannot be
 * chamfered"): a curved neighbour via `bulges`, a zero-length adjacent edge,
 * and a corner already straight within STRAIGHT_TOL. A chamfer next to an
 * arc reads that arc as a straight chord and slices it, which either breaks
 * tangency or rescales the arc -- so refusing is the honest answer, same as
 * rounding would. `bulges` is optional so a caller with only a point list
 * still gets the straight/sharp answers; pass it whenever you have it.
 */
export declare function maxChamferDistance(points: Point[], corner: number, bulges?: Record<number, number>): number;
/**
 * Plain words for why THIS corner cannot take a chamfer at all, or null when
 * some positive distance would work. The mirror of whyCannotRoundCorner():
 * the same three refusals, the same message strings, "chamfer" where the
 * round one says "round"/"rounded". On remedies, the same rule applies: the
 * two ANGLE answers name the corner-drag handle (a real handle, emitted by
 * sketchHandles() in lib/model-handles.ts); the CURVED-neighbour answer names
 * none, because there is no un-round action in the app to point a student at.
 */
export declare function whyCannotChamferCorner(points: Point[], corner: number, bulges?: Record<number, number>): string | null;
/**
 * Shift every constraint and bulge index past `insertedAt` by one.
 *
 * "Past a seam" is the one operation both callers need, because both add
 * exactly one corner and one edge at the same seam:
 *   - addCorner(f, index) splits edge `index` into two straight edges,
 *     insertedAt = index.
 *   - filletCorner(f, corner, r) deletes corner `corner` and replaces it with
 *     two trim points plus a new arc edge between them, insertedAt =
 *     corner - 1. (Corner `corner` itself, and edge `corner` -- its own
 *     outgoing edge -- both count as "past" corner-1, so they shift forward
 *     onto the new positions the split created; there is no old index that
 *     legitimately still means "the arc," because the arc never existed
 *     before this call. Its caller fills that slot in separately.)
 * A corner or edge index <= insertedAt is untouched either way.
 *
 * WHAT THIS FUNCTION IS NOT ALLOWED TO BE ASKED. It moves a bulge's KEY and
 * never its VALUE -- and a bulge's value is shape-relative, a factor of its
 * own chord (tan(sweep/4)), not an absolute radius. So it is only correct
 * while every surviving edge still spans the same two points it spanned
 * before. Hand it an operation that MOVED an edge's endpoints and that
 * edge's arc silently rescales: same factor, different chord, different
 * radius, different centre, no error and nothing on screen to notice.
 *
 * That is one bug, and it wore three faces (sketch gauntlet round 2 -> 3):
 * splitting a bulged edge halved its radius, and rounding a corner next to a
 * bulged edge shortened that arc's chord by the trim. Both are now handled
 * where the endpoints actually move -- splitEdge() below owns the split, and
 * filletCorner() refuses a curved neighbour outright -- which leaves this
 * function a pure index shift, correctly, for both callers.
 */
export declare function reindex<T extends SketchLike>(f: T, insertedAt: number): T;
/**
 * Put one new corner halfway along edge `index`, leaving the OUTLINE exactly
 * where it was. This is addCorner()'s whole body; it lives here because the
 * hard half of it is bulge arithmetic.
 *
 * Halfway along the edge AS DRAWN, which on a curved edge is not halfway
 * along its chord:
 *
 *   - Straight edge: the chord midpoint. A point already on the line adds a
 *     corner without moving the outline a micron. It is exactly collinear,
 *     which is a real corner in the point list and NOT a roundable one --
 *     see maxFilletRadius()'s straight case. Nudging it off the line to make
 *     it roundable was the alternative and it is worse: asking for a corner
 *     would change the shape you already drew.
 *   - Curved edge: the point ON THE ARC at half its sweep, and the arc is
 *     divided into two arcs that together retrace the original curve. Each
 *     half turns through half the angle, so each half's bulge is
 *     tan(sweep/8) where the whole was tan(sweep/4) -- the half-angle
 *     identity tan(x/2) = (sqrt(1+t^2) - 1)/t with t = tan(x) gives that
 *     straight from the stored number: b' = (sqrt(1+b^2) - 1)/b.
 *
 * Before this, both halves inherited the WHOLE edge's bulge factor across
 * HALF the chord -- half the radius each, moved centres, a visibly different
 * outline, and no error anywhere. The check that catches a regression is a
 * before/after tessellate() area+perimeter comparison, not a look at the
 * bulge numbers: a wrong split still produces plausible-looking numbers.
 *
 * A circle sketch is refused (unchanged): its two points are diameter ends
 * because shape === 'circle' says so, and a third point makes that tag a lie.
 */
export declare function splitEdge<T extends SketchLike>(f: T, index: number): T;
/**
 * Round one sharp corner into an arc: trim both adjacent edges back by the
 * tangent distance, drop the sharp corner, and insert the two trim points
 * plus a bulge for the arc between them.
 *
 * Trim distance is r / tan(interiorAngle / 2) -- the standard fillet
 * construction, verified against a non-90-degree corner on purpose (a
 * rectangle's 90-degree corners cannot tell trim-by-r apart from the correct
 * trim-by-r/tan(45deg)=r, since they are numerically identical there).
 *
 * The whole corner-removal (trim, splice, lock-strip, reindex) lives in
 * trimCorner(), shared with chamferCorner(); this wrapper only decides the
 * trim distance from the radius and then, on top of the trimmed outline,
 * writes the arc's bulge.
 */
export declare function filletCorner<T extends SketchLike>(f: T, corner: number, radius: number): T;
/**
 * Slice one sharp corner off flat: trim both adjacent edges back by `distance`
 * and drop the corner, leaving a straight edge between the two trim points.
 *
 * Same overall shape as filletCorner() -- clamp the request to what the corner
 * can actually take, then trimCorner() -- but no bulge math afterwards: the new
 * edge between pointIn and pointOut is straight, which is already what "0 or
 * absent" means in `bulges` per this file's top-of-file convention. So the
 * reindexed result with the trimmed `points` is the whole answer.
 */
export declare function chamferCorner<T extends SketchLike>(f: T, corner: number, distance: number): T;
/**
 * The outline in plane coordinates, curves sampled into short straight runs
 * -- what the preview overlay and (conceptually) the generated geometry both
 * draw. A circle samples 48 points around its centre; a bulged edge samples
 * max(8, ceil(|sweep| / 7.5deg)), so a barely-curved edge still gets a
 * believable arc and a near-full circle does not look faceted.
 */
export declare function tessellate(f: SketchLike): Point[];
/**
 * Rounds asked for on the DESIGN corners, and the outline they add up to.
 * Nothing else in the app may build or hold an arc endpoint.
 *
 * A sketch stores only what the student placed -- its corners, and a radius on
 * the corners they rounded -- and outlineOf() is the only code that may produce
 * or read an arc's endpoint, so no mover can hold, move, or invalidate a point
 * it did not create.
 *
 * That sentence is the whole design. Before it, a fillet baked its two trim
 * points straight into f.points, where they were indistinguishable from
 * corners the student had drawn -- so the drag handles offered one per trim
 * point, the constraint solver relaxed them like any other corner, and the
 * Rules panel listed the arc as an edge. Each of those moved a trim point
 * while the bulge factor beside it stayed put, and a bulge is a factor of ITS
 * OWN CHORD: same factor, shorter chord, smaller radius, broken tangency, no
 * error anywhere. Measured: dragging one trim point of an r=8 fillet took the
 * radius to 28.15 and opened a 33.4-degree kink at the joint; one length rule
 * on the STRAIGHT edge next door took it to 6.32 in the same click that
 * created it. Refusing each mover one at a time is a losing game -- there is
 * always a fourth. Taking the points away from them is not.
 *
 * `basis` says which design corner each outline point came from, which is what
 * lets the overlay project a derived point through a real anchor: both trim
 * points of corner k carry basis k.
 *
 * `ok: false` means the DESIGN has collapsed -- two corners on top of each
 * other, so an edge has no length and the outline has stopped being a shape.
 * Callers keep whatever they had rather than adopting it (see solveDoc()).
 * The message names no remedy on purpose: this is reached from the constraint
 * solver, from a drag and from a load, and only one of those has something to
 * undo. The caller that knows which one it is adds the remedy.
 */
export interface Outline {
    ok: boolean;
    points: Point[];
    bulges?: Record<number, number>;
    /** Parallel to `points`: the design corner each one projects from. */
    basis: number[];
    /** One per round that could not be honoured in full. `got` is what the
     *  outline actually used -- 0 when the corner took no round at all. */
    notes: Array<{
        corner: number;
        want: number;
        got: number;
    }>;
    /** Present only when ok is false. */
    why?: string;
}
/** What one segment of a finished outline means back in the design. */
export interface SegmentRole {
    /** `edge` -- the run of design edge `index`, between design corners `index`
     *  and `index + 1`. `corner` -- the arc or flat that replaced design corner
     *  `index` when it was rounded or chamfered. */
    role: 'edge' | 'corner';
    index: number;
}
/**
 * Read an outline's segments back as design edges and treated corners.
 *
 * This is what lets a face of a pulled solid be named after the thing the
 * student drew rather than after its position in the result. `basis` already
 * says which design corner each outline point projects from, and rounding a
 * corner is exactly what duplicates an entry there -- one sharp corner becomes
 * two trim points, both carrying the same basis. So a segment whose two ends
 * share a basis IS the corner treatment, and every other segment is the design
 * edge its first end came from.
 *
 * Worked through, a square rounded at corner 2 gives basis [0,1,2,2,3]:
 *
 *   segment 0  basis 0 -> 1   design edge 0
 *   segment 1  basis 1 -> 2   design edge 1
 *   segment 2  basis 2 -> 2   THE ROUND at corner 2
 *   segment 3  basis 2 -> 3   design edge 2
 *   segment 4  basis 3 -> 0   design edge 3   (the wrap)
 *
 * Design edges keep their numbers whatever is rounded, which is the property
 * the naming scheme needs and the reason it can refer to `edge 2` at all.
 */
export declare function segmentRoles(basis: number[]): SegmentRole[];
export declare function outlineOf(f: SketchLike): Outline;
/**
 * The largest bow design edge `e` can take: half its chord, which is a
 * half-circle (|bulge| = 1).
 *
 * Not an arbitrary limit. Past |bulge| = 1 the arc's centre crosses to the
 * other side of the chord and the edge starts swallowing its neighbours; a
 * beginner who asks for more has made a mistake rather than asked for a major
 * arc. arcFromBulge() handles |bulge| > 1 correctly either way, so this is a
 * UI ceiling, not a math one -- a legacy doc carrying a bigger bulge still
 * loads, draws and builds.
 */
export declare function maxBow(pts: Point[], e: number): number;
/** The bow currently on design edge `e`, in sketch units. 0 when straight. */
export declare function bowOf(pts: Point[], e: number, bulges?: Record<number, number>): number;
/** The bulge that puts design edge `e` at bow `want`, clamped to maxBow.
 *  0 for a straight edge or a collapsed one -- a chord of zero length has no
 *  middle to stand off, and dividing by it is how a NaN reaches the outline. */
export declare function bulgeFromBow(pts: Point[], e: number, want: number): number;
/**
 * Why edge `e` cannot take the bow it was asked for, in a sentence a student
 * can act on -- or null when it can. Same shape and the same job as
 * whyCannotRoundCorner()/whyCannotChamferCorner(): the panel shows this
 * instead of silently clamping, because a box that accepts 40 and stores 12
 * teaches that the tool is broken.
 */
export declare function whyCannotBowEdge(pts: Point[], e: number, want: number): string | null;
/** Set (or clear, at 0) the bow on design edge `e`, returning a new sketch.
 *
 *  Writes `bulges` DIRECTLY rather than a request map beside `rounds` and
 *  `chamfers`, and that is deliberate. Those two store a request because their
 *  geometry is derived and clamped against the NEIGHBOURING edges, so a stored
 *  result is one a later mover can invalidate. A bulge is derived from
 *  nothing: it is the parameter itself, and it is the right thing to preserve
 *  when a corner moves -- the included angle stays put and the bow scales with
 *  the chord, which is what a curve is supposed to do under a drag. */
export declare function bowEdge<T extends SketchLike>(f: T, e: number, bow: number): T;
/** Can corner `k` come off at all? A sentence if not, null if it can. */
export declare function whyCannotRemoveCorner(f: SketchLike, k: number): string | null;
/** What removing corner `k` would cost, as a sentence, or null when it costs
 *  nothing. Written for a student, in the vocabulary the panel already uses:
 *  rules, curves, rounds and chamfers -- never "constraint" or "bulge". */
export declare function whyRemovingCornerCosts(f: SketchLike, k: number): string | null;
/**
 * Remove design corner `k`, merging the two edges beside it.
 *
 * Returns the sketch unchanged when whyCannotRemoveCorner() has something to
 * say -- a refusal is the caller's to report, exactly as it is for rounding
 * and chamfering, so nothing here says anything out loud.
 */
export declare function removeCorner<T extends SketchLike>(f: T, k: number): T;
//# sourceMappingURL=sketch-arc.d.ts.map