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
export type SnapKind = 'vertex' | 'midpoint' | 'center' | 'intersection' | 'onCurve' | 'grid';
export interface SnapHit {
    kind: SnapKind;
    at?: 'a' | 'b' | 'c';
    world: Pt;
    id?: number;
}
export interface FindSnapOpts {
    gridStep?: number;
    kinds?: SnapKind[];
    dist?: (p: Pt) => number;
}
/** Standard line-circle intersection: parametrize the segment p->p+d, solve
 *  the quadratic against the circle, keep roots within [0,1]. */
export declare function lineCircleIntersections(p: Pt, d: Pt, c: Pt, r: number): Pt[];
/** Standard two-circle intersection via the radical line; [] when the circles
 *  do not meet (or coincide). */
export declare function circleCircleIntersections(c1: Pt, r1: number, c2: Pt, r2: number): Pt[];
/** The best snap within `tolWorld` of `worldPt` over every kind: vertices,
 *  midpoints, centres, intersections, on-curve points, and (when a gridStep is
 *  given) grid crossings. Rank decides; distance breaks ties. `opts.kinds` and
 *  `opts.dist` are the delegation seam snapVertex rides on. */
export declare function findSnap(geoms: CoreGeom[], worldPt: Pt, tolWorld: number, opts?: FindSnapOpts): SnapHit | null;
/** The nearest named point within `snapPx` screen pixels of the pointer, or
 *  null. Screen distance is decided by the caller-supplied `distPx`, so the
 *  projection stays the component's business. Delegates to findSnap with the
 *  vertex kind only -- one snap engine, no duplicated logic. */
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
/** The slice of SketchSession2D `solveRows` needs (kept structural so this
 *  file stays free of the wasm import). */
export interface SoupSolver {
    open(geoms: any[], rules: any[]): string | null;
    solve(): boolean;
    params: Float64Array | number[];
}
/** The rows the doc should STORE: the rule-satisfying (solved) state.
 *
 *  model-types.ts says a sketch's `geoms` are the SOLVED coordinates, but a
 *  canvas edit writes the rows it drew plus the new rule, and the kernel only
 *  re-solves at build time. Left alone, a typed dimension changed the built
 *  solid while the doc's own rows (all a `model` requirement can read, see
 *  model-check.ts) still described the old size. Solving here, inside the same
 *  write, keeps one onChange = one undo entry.
 *
 *  Falls back to the rows as given when the session refuses or cannot solve
 *  (the canvas already shows that in its status line), and keeps a row's
 *  original numbers when the solve moved nothing, so a plain edit never drifts
 *  the stored coordinates by float noise. */
export declare function solveRows<G extends CoreGeom>(session: SoupSolver, geoms: G[], rules: unknown[]): G[];
/** A soup geometry row minus its id, distributively over the union so each
 *  kind keeps its own fields (a plain Omit<SoupGeom,'id'> does not). */
import type { SketchConstraint, SoupGeom, SoupRule } from '@shuff57/reshape-script/model-types';
type DistOmit<U> = U extends unknown ? Omit<U, 'id'> : never;
export type SoupGeomNew = DistOmit<SoupGeom>;
/** The soup rules a migrated points outline owes the kernel: one coincident
 *  per corner (line i's end meets line i+1's start, wrap included) plus each
 *  horizontal/vertical edge as a soup row on its line. The soup arm welds
 *  corners through RULES, not coordinates (wires.rs refuses coordinate-only
 *  contact as a guess the student never sees), so a loop migrated with empty
 *  rules arrives as open ends: "edge 1 has a loose end" -- the scaffold Pull
 *  bug of 2026-10-01. A circle has no corners to weld: []. Length and the
 *  other legacy kinds stay on `constraints` untranslated (ponytail: only H/V
 *  ever reach the soup session; add the rest when a legacy doc needs them). */
export declare function migratedRules(constraints: SketchConstraint[] | undefined, geoms: SoupGeom[]): SoupRule[];
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
 *  the clicked row's id with its far endpoint pulled to the split. The far
 *  endpoint keeps its ORIGINAL LETTER ('a' stays 'a', 'b' stays 'b') --
 *  earlier this always wrote `{a: farPt, b: split}` regardless of which
 *  letter farPt actually was, so trimming the line back from its 'a' end
 *  silently RELABELED the surviving far point from 'b' to 'a'. Any weld
 *  (coincident) rule naming that endpoint by letter (e.g. `aEnd: 'b'`)
 *  then silently pointed at the fresh split point instead of the corner it
 *  was welded to -- not a dangling reference (the id still exists), a
 *  SILENTLY WRONG one, which is worse: diagnose() has nothing to flag,
 *  since the rule is perfectly satisfiable, just against the wrong point.
 *  No new row: a trim that deletes a piece leaves the wire open, and wire
 *  discovery's refusals say exactly that. Rules referencing the clicked
 *  row's SURVIVING letter keep working correctly; a rule that referenced
 *  the DELETED letter may become unsatisfiable -- the diagnosis badge
 *  surfaces that, the trim does not try to fix it. */
export declare function trimLine(geoms: CoreGeom[], rules: Array<Record<string, any>>, clickedId: number, split: Pt, click: Pt): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
};
export interface FilletPick {
    lineA: number;
    endA: 'a' | 'b';
    lineB: number;
    endB: 'a' | 'b';
    corner: Pt;
}
/** The fillet-able corner nearest `click`: among every pair of DISTINCT
 *  lines, the named ends that sit at (nearly) the same world point --
 *  within `tolWorld` of the click. Only line-line corners are handled (v1);
 *  circles/arcs are future work here, same precedent as trimPick. */
export declare function filletPick(geoms: CoreGeom[], click: Pt, tolWorld: number): FilletPick | null;
/** The real ceiling on this corner's fillet radius -- maxFilletRadius()'s
 *  own trig (sketch-arc.ts), reading the two lines' live coordinates
 *  instead of a points array. 0 refuses: a zero-length adjacent edge, or a
 *  corner that is straight within FILLET_STRAIGHT_TOL. */
export declare function maxFilletRadiusAt(geoms: CoreGeom[], lineA: number, endA: 'a' | 'b', lineB: number, endB: 'a' | 'b'): number;
/** Plain words for why this corner cannot take a fillet at all, or null
 *  when some positive radius would work -- the soup-native mirror of
 *  whyCannotRoundCorner()'s tone, written fresh (not imported) because the
 *  soup has no bulges/curved-neighbour case to report. */
export declare function whyCannotFilletAt(geoms: CoreGeom[], lineA: number, endA: 'a' | 'b', lineB: number, endB: 'a' | 'b'): string | null;
/** Round one line-line corner into an arc, mutating no row in place.
 *
 *  Clamps `radius` to maxFilletRadiusAt (never trusts the caller's number
 *  past what the corner can take, same as filletCorner()); refuses (null)
 *  when even the smallest positive radius has nowhere to go. Both lines
 *  REUSE their own ids for the surviving trimmed ends (trimLine's own
 *  convention); only the new arc gets a fresh id via nextGeomId(). The one
 *  sharp-corner coincident (if any existed) is dropped and replaced by two
 *  new coincidents welding the arc to both trimmed lines -- the one place
 *  fillet must do more than trim, because it inserts geometry the corner
 *  never had. */
export declare function filletCornerAt(geoms: CoreGeom[], rules: Array<Record<string, any>>, lineA: number, endA: 'a' | 'b', lineB: number, endB: 'a' | 'b', radius: number): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
    arcId: number;
} | null;
/** Append an `equal` rule tying two arcs' radii, unless one already does
 *  (either order) -- the auto-equal-radius heuristic commits alongside a
 *  second same-radius fillet and must not pile up duplicates on repeat. */
export declare function applyEqualRadiusRule(rules: Array<Record<string, any>>, arcIdA: number, arcIdB: number): Array<Record<string, any>>;
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
/** Order the selected line ids into a single simple open chain, walking head
*  to tail via shared (coincident, within tolerance) endpoints among ONLY
*  the given ids. Refuses (null) branching (a T-junction), closed loops
*  (every endpoint shared, no free end to start from), and disconnected
*  pieces -- offsetting an ambiguous or non-chain selection is refused
*  rather than guessed at. A lone id is trivially its own one-line chain. */
export declare function offsetChainOrder(geoms: CoreGeom[], ids: number[]): Array<{
    id: number;
    from: Pt;
    to: Pt;
}> | null;
export interface OffsetPick {
    chain: Array<{
        id: number;
        from: Pt;
        to: Pt;
    }>;
    side: 1 | -1;
}
/** Order the picked ids into a chain (offsetChainOrder) and decide which
*  perpendicular side `click` sits on, relative to whichever chain segment
*  the click lands nearest -- the same nearest-segment idea trimPick uses
*  to pick a crossing. Returns null if the ids are not a single chain. */
export declare function offsetChainPick(geoms: CoreGeom[], ids: number[], click: Pt): OffsetPick | null;
/** Build the new offset chain at `distance` (> 0) on `side`: each segment
*  is pushed perpendicular to its own direction, then adjacent offset
*  segments are re-joined at their new mitered (infinite-line) intersection
*  so the chain's corners stay sharp -- the same corner the ORIGINAL chain
*  had, just pushed out by `distance`. Appends new line rows (fresh ids via
*  nextGeomId) and welds each adjacent pair with the same coincident
*  convention filletCornerAt's new arc uses. The originals keep their own
*  position and id -- offset always creates new geometry alongside the
*  source, never moves or deletes it -- but flip to construction=true
*  (Fusion's own offset behavior: the source becomes a dashed reference,
*  the new offset chain the real profile edge).
*  `distance <= 0` is degenerate (a zero offset would duplicate the source
*  in place) and is refused with null; the caller shows the message. */
export declare function offsetChain(geoms: CoreGeom[], rules: Array<Record<string, any>>, chain: Array<{
    id: number;
    from: Pt;
    to: Pt;
}>, side: 1 | -1, distance: number): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
    newIds: number[];
} | null;
/** Re-dense the ids after duplication: 100000-offset ids are a collision-
 *  free trick, not a representation. Renumber everything to 1..n and rewrite
 *  every rule reference through the map. */
export declare function densifyIds(geoms: CoreGeom[], rules: Array<Record<string, any>>): {
    geoms: CoreGeom[];
    rules: Array<Record<string, any>>;
};
/** The six rule kinds that carry a numeric `value`. They are drawn as a
  * VALUE LABEL rather than an icon -- the number is the glyph -- which is
  * also the set the on-canvas dimension flow can write. */
export declare const DIMENSION_RULE_KINDS: readonly ["distance", "distanceX", "distanceY", "radius", "diameter", "angle"];
export type DimKind = (typeof DIMENSION_RULE_KINDS)[number];
export declare function isDimensionRule(k: string): k is DimKind;
/** The middle of a geometry row: a line's halfway point, a circle's centre,
  * an arc's MID-SWEEP point (not its chord's middle -- a label on the chord
  * of a half circle sits nowhere near the curve), a point's own location.
  * Returns null for anything that is not one of the four soup kinds. */
export declare function geomMidpoint(g: CoreGeom): Pt | null;
/** One end of a dimension: a geometry id plus which of its named points, or
  * null for "the whole row". */
export interface DimPick {
    id: number;
    at: 'a' | 'b' | 'c' | null;
}
export interface AutoDimension {
    kind: DimKind;
    /** What the geometry measures RIGHT NOW -- what the input box opens on. */
    value: number;
    /** Where the label rests until the user places it somewhere else. */
    anchor: Pt;
    /** The ends the committed rule will name. */
    a: DimPick;
    b: DimPick | null;
}
/** What dimension does a pick (or a pair of point picks) ASK for? A line
  * wants the distance between its own two ends; a circle or an arc wants its
  * radius -- the convention SketchCanvas2D's own openDimFromSelection already
  * uses, so the on-canvas flow and the ribbon buttons cannot disagree about
  * what `D` on a circle means; two picked points want the distance between
  * them.
  *
  * Returns null when there is nothing to measure: ONE point pick (it is half
  * a dimension, and the caller waits for the other half), a bare point row,
  * or an id that is not in `geoms`. */
export declare function autoDimension(geoms: CoreGeom[], a: DimPick, b?: DimPick | null): AutoDimension | null;
/** Why the solver cannot take this text, in a sentence, or null when it can.
  * The caller shows the sentence on the status line and writes NOTHING --
  * a refused dimension must not grow the undo stack.
  *
  * distanceX/distanceY are the only SIGNED kinds: a negative one names the
  * other direction and a zero one names a shared axis, so neither is absurd
  * there the way a zero-length distance or a negative radius is. */
export declare function dimensionValueError(kind: DimKind, text: string): string | null;
/** One anchor per rule, INDEX-ALIGNED with `rules` (a rule the canvas cannot
  * place keeps its slot as null) because the glyph layer identifies a rule by
  * its index and a shifted array would delete the wrong one.
  *
  * Rules that land on the same spot are fanned out along +x by `stepWorld`
  * each: a rectangle's bottom edge carries a horizontal AND a distance, and
  * stacked on one pixel they are one unreadable blur. */
export declare function ruleGlyphAnchors(geoms: CoreGeom[], rules: Array<Record<string, any>>, stepWorld: number): Array<Pt | null>;
export {};
//# sourceMappingURL=sketch-canvas-core.d.ts.map