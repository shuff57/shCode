export type CoreGeom = {
    k: 'point' | 'line' | 'circle' | 'arc';
    id: number;
    construction?: boolean;
} & Record<string, any>;
export interface Pt {
    x: number;
    y: number;
}
/** Which named points each geometry kind exposes. A point exposes only its
 *  own location; a line its two ends; a circle its centre; an arc all three
 *  plus both ends. The UI hit-tests ONLY the named points a kind really
 *  has -- offering a line's 'c' would snap to nothing and refuse later. */
export declare function namedPointsOf(g: CoreGeom): Array<{
    at: 'a' | 'b' | 'c';
}>;
/** World coordinates of a named point of geometry `g`, from the row's own
 *  values (the UI keeps rows solved, so no re-projection is needed). */
export declare function pointWorld(g: CoreGeom, at: 'a' | 'b' | 'c'): Pt | null;
/** The nearest named point within `snapPx` screen pixels of the pointer, or
 *  null. Screen distance is decided by the caller-supplied `distPx`, so the
 *  projection stays the component's business. */
export declare function snapVertex(geoms: CoreGeom[], target: Pt, distPx: (p: Pt) => number, snapPx: number): {
    id: number;
    at: 'a' | 'b' | 'c';
    world: Pt;
} | null;
export declare function distToSegment(p: Pt, a: Pt, b: Pt): number;
export declare function distToCircleStroke(p: Pt, center: Pt, r: number): number;
/** Is world angle `theta` inside the CCW sweep [a0, a1]? An arc's sweep stays
 *  under one full turn, so normalising theta into [a0, a0+2pi) is exact. */
export declare function angleInArcRange(theta: number, a0: number, a1: number): boolean;
/** Arc geometry from a row: centre, radius, start angle a0 and CCW sweep.
 *  The soup stores centre + radius + both endpoints + sense, never angles,
 *  so the UI derives them the same way the emitter does. */
export declare function arcAngles(g: CoreGeom): {
    a0: number;
    sweep: number;
} | null;
export declare function sampleArc(cx: number, cy: number, r: number, a0: number, sweep: number, steps?: number): Pt[];
export interface LineChain {
    startId: number | null;
    startAt: 'a' | 'b' | null;
    prevX: number;
    prevY: number;
    prevId: number | null;
    prevAt: 'a' | 'b' | null;
    pinOrigin: boolean;
}
/** Angle (deg, 0..360 from +X) of the segment from `from` to `to`. */
export declare function lineAngleDeg(from: Pt, to: Pt): number;
/** Does the candidate line want to be horizontal or vertical? */
export declare function inferLineConstraint(from: Pt, to: Pt, angleTolDeg?: number): 'horizontal' | 'vertical' | null;
/** Snaps `to` onto the axis `kind` implies relative to `from`, so the
 *  committed line is truly axis-aligned (redundant-free), not a few-degrees-
 *  off yank. Returns a NEW point; never mutates `to`. */
export declare function snapAxis(from: Pt, to: Pt, kind: 'horizontal' | 'vertical'): Pt;
/** centre/start/end clicks -> {r, a0, sweep} for the arc tool. CCW from the
 *  start ray to the end ray; a cw arc's sweep goes negative. */
export declare function arcFromClicks(c1: Pt, c2: Pt, c3: Pt): {
    cx: number;
    cy: number;
    r: number;
    a0: number;
    sweep: number;
} | null;
/** Endpoint positions of an arc given centre/radius/a0/sweep, so a committed
 *  arc row can carry its own a/b like every other soup arc. */
export declare function arcEnds(cx: number, cy: number, r: number, a0: number, sweep: number): {
    a: Pt;
    b: Pt;
};
/** The id the next piece of geometry gets: max existing id + 1, starting at 1.
 *  The soup contract requires dense 1-based ids, so after a delete the next
 *  add must REUSE the hole. */
export declare function nextGeomId(geoms: CoreGeom[]): number;
/** Renumber rows to restore density after a delete: geometry shifts down and
 *  every rule reference follows. Returns NEW arrays; never mutates. */
export declare function renumber(geoms: CoreGeom[], rules: Record<string, any>[], removedId: number): {
    geoms: CoreGeom[];
    rules: Record<string, any>[];
};
/** Read the solved rows back out of a full parameter vector, mirroring the
 *  kernel's slot layout (built-ins 10, then point 2 / line 4 / circle 3 /
 *  arc 7 per row in id order). Rows carry their construction flag through. */
export declare function readSolved(geoms: CoreGeom[], params: Float64Array | number[]): CoreGeom[];
/** A soup geometry row minus its id, distributively over the union so each
 *  kind keeps its own fields (a plain Omit<SoupGeom,'id'> does not). */
import type { SoupGeom } from '@shuff57/reshape-script/model-types';
type DistOmit<U> = U extends unknown ? Omit<U, 'id'> : never;
export type SoupGeomNew = DistOmit<SoupGeom>;
/** Majority toggle: if ANY selected shape is not construction, all become
 *  construction; only when they all already are does the toggle turn them
 *  all off. A per-shape toggle on a mixed selection just inverts the mix,
 *  which no user has ever wanted. Returns the rows with `construction` set. */
export declare function toggleConstruction(geoms: CoreGeom[], ids: number[]): CoreGeom[];
/** Where does the segment p1->p2 cross the segment p3->p4, if at all within
 *  BOTH segments? Returns the crossing point or null. Parallel segments
 *  never cross (denominator 0). */
export declare function segmentIntersection(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null;
/** The nearest crossing of the clicked line with any OTHER line, within the
 *  clicked line itself. Circles/arcs are future work here: a line-circle
 *  quadratic is easy, but the piece bookkeeping after a split is not free,
 *  and half a trim tool is worse than none. Returns the split point and the
 *  other line's id, or null. */
export declare function trimPick(geoms: CoreGeom[], clickedId: number, click: Pt): {
    at: Pt;
    otherId: number;
} | null;
/** Trim the clicked line at `split`: the half UNDER the click is deleted
 *  (whichever half's midpoint sits closer to the click), the far half keeps
 *  the clicked row's id with its far endpoint pulled to the split. No new
 *  row, no weld: a trim that deletes a piece leaves the wire open, and wire
 *  discovery's refusals say exactly that. Rules referencing the clicked row
 *  keep working (the surviving half kept the id); a rule that referenced the
 *  deleted geometry may become unsatisfiable — the diagnosis badge surfaces
 *  that, the trim does not try to fix it. */
export declare function trimLine(geoms: CoreGeom[], rules: Array<Record<string, any>>, clickedId: number, split: Pt, click: Pt): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
};
export interface SlotResult {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
    ids: {
        arc1: number;
        arc2: number;
        top: number;
        bottom: number;
    };
}
/** Build a slot (obround) from three clicks: centre A, centre B, and a point
 *  whose distance from A is the radius. The four rows are two arcs and two
 *  tangent lines, welded by four line-arc tangencies and nothing else —
 *  tangency IS the weld here, coincidents would fight it (O2's note: the
 *  endpoint forms and the simple forms are different asks).
 *
 *  Arc ends are placed at the axis-aligned extremes: the caps face outward
 *  along the A->B direction's perpendicular, which keeps the seed solvable
 *  and the tangencies well-posed (the line runs from one arc's extreme to
 *  the other's matching extreme, on the same side). */
export declare function slotRows(cA: Pt, cB: Pt, rPoint: Pt, baseId: number): SlotResult | null;
export interface CircleSplitResult {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
    replacedIds: number[];
}
/** Replace every circle that carries >= 2 simple tangencies to LINES with an
 *  arc pair split at two of the contact points. Rows after the replaced ones
 *  shift ids down by 1 per replacement; rule references follow via
 *  renumber-style shifting. Returns the new rows; never mutates. */
export declare function splitWeldedCircles(geoms: CoreGeom[], rules: Array<Record<string, any>>): CircleSplitResult;
/** One duplicated row with its id remapped and its point coordinates
 *  transformed by `xf`. Rules INTERNAL to the selection are duplicated with
 *  remapped ids; rules referencing the selection from OUTSIDE are left
 *  alone (the copy is independent). Returns null when the selection is
 *  empty. */
export interface DupResult {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
    /** old id -> new id, for callers that want to constrain the copy. */
    idMap: Map<number, number>;
}
/** Mirror the selected rows about the X axis (y -> -y) or the Y axis
 *  (x -> -x). Arc sense flips under a mirror: the same sweep walked
 *  backwards. */
export declare function mirrorSelection(geoms: CoreGeom[], rules: Array<Record<string, any>>, ids: number[], axis: 'x' | 'y'): DupResult | null;
/** Copy the selected rows, shifted by (dx, dy). */
export declare function copySelection(geoms: CoreGeom[], rules: Array<Record<string, any>>, ids: number[], dx: number, dy: number): DupResult | null;
/** Re-dense the ids after duplication: 100000-offset ids are a collision-
 *  free trick, not a representation. Renumber everything to 1..n and rewrite
 *  every rule reference through the map. */
export declare function densifyIds(geoms: CoreGeom[], rules: Array<Record<string, any>>): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
};
export {};
//# sourceMappingURL=sketch-canvas-core.d.ts.map