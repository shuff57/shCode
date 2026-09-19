/** A point. Same shape as Vec3 in lib/model-types.ts, kept local so this file
 *  imports nothing. */
export type Pt = [number, number, number];
/** One face of the hull, as indices into the input points, wound
 *  counter-clockwise seen from outside. */
export type Tri = [number, number, number];
export interface Hull {
    /** The points that ended up ON the hull, in input order. */
    used: number[];
    /** The hull's triangles, indexing the ORIGINAL points array. */
    triangles: Tri[];
}
/**
 * The convex hull of a point set, or null when there is no hull to take.
 *
 * Returns null for fewer than four points, and for a set that is flat --
 * every point on one plane, or on one line. Those are real inputs a student can
 * produce (four corners of a rectangle, say) and they have no VOLUME, so a
 * caller that wants a shape out of this has to say so in words rather than
 * receive a degenerate solid. whyNoHull() below is that sentence.
 *
 * `eps` scales with the point set rather than being a fixed number, because
 * "flat" at the scale of a 200 mm bracket is not flat at the scale of a 0.2 mm
 * feature, and a constant would silently pick one of them.
 */
export declare function convexHull(pts: Pt[]): Hull | null;
/**
 * Why a point set has no hull, phrased for a student, or null when it has one.
 *
 * The same contract as whyDeletingCosts() in lib/model-deps.ts and
 * whyNameLost() in lib/topo-name.ts: say what went wrong in words and let the
 * caller decide. Nothing here refuses anything on its own.
 *
 * The three flat cases are named separately because they are three different
 * mistakes. "All in one place" is usually a loop that forgot to move; "on one
 * line" is a row of shapes; "on one plane" is a 2D drawing where a 3D one was
 * meant, which is the common one and the least obvious from looking at it.
 */
export declare function whyNoHull(pts: Pt[]): string | null;
/**
 * The volume the hull encloses.
 *
 * Here rather than left to the kernel because it is what makes this file
 * checkable on its own: the hull of a cube's eight corners must measure exactly
 * s^3, and must still measure s^3 once interior points are thrown in. That is
 * an arithmetic bar, not a golden number, and it is the control that catches a
 * hull which quietly kept a point it should have swallowed.
 *
 * Signed tetrahedron sum from the origin -- the standard divergence-theorem
 * form. Outward winding makes it positive.
 */
export declare function hullVolume(pts: Pt[], h: Hull): number;
/** A 2D point. */
export type Pt2 = [number, number];
/** The 2D hull: the same two facts as Hull, one dimension down. There is no
 *  `triangles` here because a polygon does not need triangulating to be a
 *  shape -- `boundary` already is the shape, wound counter-clockwise. */
export interface Hull2 {
    /** The points that ended up ON the hull, in input order (a set, for a
     *  caller asking "was point i kept" -- same role as Hull.used). */
    used: number[];
    /** The hull polygon: indices into the input points, wound
     *  counter-clockwise, each one joined to the next and the last back to the
     *  first. This is what a caller turns into a wire. */
    boundary: number[];
}
/**
 * The convex hull of a 2D point set, or null when there is no hull to take --
 * fewer than three points, every point in the same place, or every point on
 * one line. All three have zero area, which is the 2D analogue of the flat
 * (zero-volume) refusal above.
 *
 * COLLINEAR POINTS ARE DROPPED, not kept as extra hull vertices. Three points
 * in a row on the same edge would all "belong" to the hull under a loose
 * reading, but the middle one carries no information -- it sits exactly where
 * its two neighbours already say a straight edge must pass, and keeping it is
 * how a hull with four real corners ends up reporting seven vertices because
 * one side happened to have collinear input on it. This also matches the
 * reference engine's own hullPoints2, whose Graham scan pops a point the
 * instant the turn through it is `<= EPSILON` rather than keeping it -- so a
 * script that already runs against that engine sees the same vertex count
 * here. A caller that wants every input point lying ON an edge, not just the
 * corners, is asking point-in-polygon, which is a different question from
 * "what is the hull" and does not belong in this function.
 *
 * `tol` is a distance-scale tolerance built the same way the 3D code above
 * builds `eps` -- relative to the point set's own span, so a tiny sketch and
 * a room-sized one are not judged against the same fixed number. `cross2`
 * has the same units as the 3D file's line-off-axis test (a single cross
 * product), so it is compared against the identical `eps * span`, not a new
 * constant invented for this function.
 */
export declare function convexHull2(pts: Pt2[]): Hull2 | null;
/**
 * The area the hull encloses. The 2D twin of hullVolume() above, for the same
 * reason: it is what makes this function checkable on its own arithmetic
 * rather than by eye -- a square's hull must measure exactly its own area,
 * still exactly once an interior point is added, and a concave outline's hull
 * must measure exactly the analytic area of its convex boundary.
 *
 * The shoelace formula, which `boundary` is already wound correctly for.
 */
export declare function hull2Area(pts: Pt2[], h: Hull2): number;
//# sourceMappingURL=hull.d.ts.map