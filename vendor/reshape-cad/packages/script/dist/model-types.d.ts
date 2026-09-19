import type { Constraint as SketchConstraint } from '@shuff57/reshape-sketch/sketch-solve';
import type { TopoName } from './topo-name.js';
/** Re-exported so a caller needs one import to work with a sketch. */
export type { Constraint as SketchConstraint } from '@shuff57/reshape-sketch/sketch-solve';
export type Vec3 = [number, number, number];
/** How a shape's edges are killed. The old JSCAD path had no true fillet and
 *  faked one with a hull of two cylinders; the B-rep kernel (lib/occt-build.ts)
 *  builds a real one for either style. */
export type RoundStyle = 'fillet' | 'chamfer';
/** A single world axis, spelled out rather than as a Vec3 direction — a
 *  student picks "which way", not three numbers, for a bore or a spin. */
export type Axis3 = 'x' | 'y' | 'z';
export interface BoxFeature {
    id: string;
    kind: 'box';
    name?: string;
    size: Vec3;
    center: Vec3;
    /** Degrees about x, y, z. Absent means unrotated, and keeps the code simple. */
    rotate?: Vec3;
    /** Edge radius. 0 or absent leaves the edges sharp. */
    round?: number;
    roundStyle?: RoundStyle;
}
export interface CylinderFeature {
    id: string;
    kind: 'cylinder';
    name?: string;
    radius: number;
    height: number;
    center: Vec3;
    rotate?: Vec3;
    round?: number;
    roundStyle?: RoundStyle;
}
export interface SphereFeature {
    id: string;
    kind: 'sphere';
    name?: string;
    radius: number;
    center: Vec3;
}
export interface ConeFeature {
    id: string;
    kind: 'cone';
    name?: string;
    radius: number;
    height: number;
    center: Vec3;
    rotate?: Vec3;
}
export interface TorusFeature {
    id: string;
    kind: 'torus';
    name?: string;
    /** Distance from the centre of the ring to the centre of the tube. */
    ringRadius: number;
    /** Thickness of the tube itself. */
    tubeRadius: number;
    center: Vec3;
    rotate?: Vec3;
}
/** A regular n-gon prism, extruded standing on Z. SPEC-P1a: the ModelDoc
 *  kind behind the parity flip for PartDesign_AdditivePrism (and, composed
 *  with cut(), SubtractivePrism). OCCT builds it as a prism over a regular
 *  polygon wire — the `polygon` recipe path script-surface.ts already
 *  proved (MakeEdge per side, then MakeWire). */
export interface PrismFeature {
    id: string;
    kind: 'prism';
    name?: string;
    /** Number of sides. 3 (triangle) .. 12; FreeCAD's PartDesign::Prism
     *  clamps at 360/12 the same way and a student never types more. */
    sides: number;
    /** Distance from the centre of the prism to each corner (circumradius). */
    radius: number;
    height: number;
    center: Vec3;
    rotate?: Vec3;
}
/** A right wedge — a triangular profile extruded along the third axis.
 *  SPEC-P1a: the kind behind AdditiveWedge/SubtractiveWedge. */
export interface WedgeFeature {
    id: string;
    kind: 'wedge';
    name?: string;
    /** Footprint width (X) and depth (Y) of the right-triangle profile. */
    width: number;
    depth: number;
    height: number;
    center: Vec3;
    rotate?: Vec3;
}
/** A subtractive revolve — the groove. Spins the target sketch's profile
 *  around the sketch plane's own normal axis and CUTS the swept ring out of
 *  an earlier solid. The ModelDoc twin of the bridge's PartDesign::Groove
 *  emitter; the additive twin already exists as RevolveFeature. */
export interface GrooveFeature {
    id: string;
    kind: 'groove';
    name?: string;
    /** The sketch whose profile is spun into the cutting ring. */
    target: string;
    /** The solid the groove is cut into. */
    into: string;
    /** Degrees to sweep. 360 is a full ring. */
    angle: number;
}
/** A subtractive extrude — the pocket. Pulls the target sketch's profile
 *  straight DOWN into an earlier solid and cuts it away. The ModelDoc twin of
 *  the bridge's PartDesign::Pocket emitter and of the pocket() emitter
 *  statement; the additive twin already exists as ExtrudeFeature. */
export interface PocketFeature {
    id: string;
    kind: 'pocket';
    name?: string;
    /** The sketch whose profile is pulled into the cutting block. */
    target: string;
    /** The solid the pocket is cut into. */
    into: string;
    /** How far into the solid to cut, in mm. Always positive; the DIRECTION is
     *  fixed (into the material, opposite the way extrude pulls) so a student
     *  cannot type a sign that silently cuts air. */
    depth: number;
}
/** Which flat plane a sketch is drawn on. Extrusion runs perpendicular to it. */
export type SketchPlane = 'xy' | 'xz' | 'yz';
/**
 * An arbitrary planar frame a sketch can be laid in -- the sketch-on-a-face
 * form, where the three named planes are not enough. `origin` is a point on
 * the plane (a face's own point), and `u`/`v` are two unit in-plane axes; the
 * normal is u x v, so the frame is right-handed by construction and the
 * sweep/cap conventions match the named planes exactly.
 *
 * A sketch carrying a `frame` ignores `plane` and `offset` entirely. The two
 * are kept as separate representations rather than folding the named planes
 * into frames: routing xz through a cross product would flip its sweep
 * direction and change every existing doc (see packages/brep-rs/src/wasm.rs's
 * `sketch_frame`).
 */
export interface SketchFrame {
    origin: Vec3;
    u: Vec3;
    v: Vec3;
}
/** The resolved world frame of a sketch, whatever form it was written in. */
export interface ResolvedSketchFrame {
    origin: Vec3;
    u: Vec3;
    v: Vec3;
    n: Vec3;
}
/**
 * Resolve a sketch's world frame, whether it names a plane or carries a frame.
 *
 * Named planes take their axes from NAMED_PLANE_FRAMES verbatim -- NOT through
 * a cross product, so xz keeps its -Y sweep direction exactly as before. A
 * sketch with `frame` gets its normal as u x v (normalised), so an arbitrary
 * planar face is expressible while the right-handed convention is preserved.
 */
export declare function sketchFrameOf(f: Pick<SketchFeature, 'plane' | 'offset' | 'frame'>): ResolvedSketchFrame;
/** A closed outline, drawn flat. Not a solid until something extrudes it. */
export interface SketchFeature {
    id: string;
    kind: 'sketch';
    name?: string;
    plane: SketchPlane;
    /** How far the plane sits from the origin along its own normal. */
    offset: number;
    /**
     * Sketch-on-a-face: an explicit world frame, used INSTEAD of `plane` and
     * `offset`. Set when the sketch was authored by picking a planar face;
     * absent for every sketch drawn on one of the three named planes, which is
     * every sketch saved before frames existed. See [`SketchFrame`] and
     * [`sketchFrameOf`]. */
    frame?: SketchFrame;
    /**
     * The DESIGN corners, in plane coordinates and in order -- the points the
     * student actually placed, and the only ones any mover may touch. The
     * outline always closes.
     *
     * This is not the same list as the outline once `rounds` is non-empty: a
     * rounded corner is still ONE point here, and outlineOf() (lib/sketch-arc.ts)
     * turns it into the two trim points and the arc between them. Constraint
     * edge/corner indices, the drag handles and the Rules panel rows are all
     * indices into THIS list.
     */
    points: Array<[number, number]>;
    /**
     * How the outline is read. Absent = a straight-edged polyline, which is
     * every sketch saved before this field existed. 'circle' = exactly two
     * points, which are the ends of a diameter.
     *
     * This is a TAG, not an inference. The two-point-plus-bulges form was
     * considered and rejected: it made "is this a circle" a float comparison
     * repeated at three call sites with nothing tying them together.
     */
    shape?: 'circle';
    /**
     * Bulge of the edge LEAVING corner n (edge n = corner n -> corner n+1,
     * wrapping -- the same convention edgeCorners() in sketch-solve.ts already
     * uses). tan(includedAngle / 4). 0 or a missing key is a straight edge.
     * Never written when shape === 'circle': the tag is the only source of
     * truth there, so the two cannot disagree. See lib/sketch-arc.ts.
     */
    bulges?: Record<number, number>;
    /**
     * Radius the student asked for on design corner n. Absent or empty means
     * nothing is rounded.
     *
     * This is a REQUEST, not geometry: outlineOf() turns it into trim points and
     * a bulge every time the outline is needed, and clamps it to what the corner
     * can actually take at that moment. Storing the request rather than the
     * result is the whole fix -- a stored trim point is a point some other mover
     * will eventually move without moving the arc with it, and three separate
     * movers did exactly that.
     *
     * A doc carrying `bulges` and NO `rounds` is a legacy or imported outline:
     * somebody else already built those arcs, so it passes through untouched
     * and builds the exact same rounded outline it always has.
     */
    rounds?: Record<number, number>;
    /**
     * Chamfer trim distance the student asked for on design corner n. Absent or
     * empty means nothing is chamfered on that corner.
     *
     * Unlike `rounds`, this is a DISTANCE, not a radius -- a chamfer has no arc
     * to convert through tan(), it slices a straight edge between two trim
     * points at exactly this distance along each adjacent edge. Same
     * request-not-geometry contract as `rounds`: outlineOf() derives the actual
     * trim points every time, clamped to what the corner can currently take.
     *
     * A corner should never carry both a `rounds` entry and a `chamfers` entry
     * -- the UI is expected to enforce that as a per-corner choice. If it
     * happens anyway, outlineOf() resolves it deterministically: round wins,
     * the chamfer request is ignored for that corner (see outlineOf()).
     */
    chamfers?: Record<number, number>;
    /** Rules the corners must obey. Absent means free-hand. */
    constraints?: SketchConstraint[];
    /**
     * The soup's geometry rows, in sketch-plane (u, v) coordinates. Ids are
     * SKETCH-LOCAL, DENSE and 1-BASED: row i carries id i + 1, and the
     * explicit `id` in each row is a redundancy the interpreter VALIDATES and
     * refuses on mismatch. That matters because the project requires a script
     * and the equivalent clicks to produce byte-comparable docs, and soup
     * constraints reference geometry BY ID — if ids came from anywhere but
     * array position, a round trip would renumber and every constraint would
     * dangle. Built-in ids -1 (origin point), -2 (X axis) and -3 (Y axis) are
     * FIXED by the kernel and never appear here.
     *
     * The coordinates in these rows are the SOLVED state, and they are the
     * BASIN SELECTOR (§6.3): they are NOT redundant with `rules`. They are
     * what makes a reload deterministic, because the load-time solve starts
     * at the answer. Someone will eventually read them as duplication and try
     * to delete them; that would make a reload land in whichever solution the
     * solver happens to reach, which is a different part.
     */
    geoms?: SoupGeom[];
    /**
     * The same rows under the field name the script surface spells: a student
     * reads `sk.geom` (the word is singular, matching `s1.geom([...])`), while
     * `geoms` is the plural the kernel JSON uses. The interpreter keeps the
     * two in step -- a write to one writes both -- so they cannot drift.
     */
    geom?: SoupGeom[];
    /**
     * The soup's constraint rows, 16 kinds / 17 forms (§2.5). Only a rule's
     * numeric `value` becomes a Dimensions-panel slot, named
     * pname(featureId, `rule${i}-value`) with the 0-based rules index — the
     * same key a panel row already uses (D8). Coordinates never get slots:
     * a 30-primitive sketch would flood the panel with ~200 rows nobody can
     * use.
     */
    rules?: SoupRule[];
}
/** One point reference a soup row names: 'a' = start, 'b' = end,
 *  'c' = centre. A point exposes only 'a', a line 'a' and 'b', a circle only
 *  'c', an arc all three. */
export type SoupPointRef = 'a' | 'b' | 'c';
/** Which way an arc runs from a to b. NON-SOLVER data: the kernel's solver
 *  holds an arc as centre + radius + both endpoints (7 numbers, no angle
 *  variables), and the emitter needs the sense only to pick a sweep
 *  direction at emit time. Never feed it to a residual. */
export type SoupSense = 'ccw' | 'cw';
/** A soup geometry row (§2.3). Four kinds; `construction` marks geometry the
 *  solver solves but the profile ignores — the v2 trim story needs it, the
 *  schema carries it from day one so a v1 doc does not need a migration. */
export type SoupGeom = {
    k: 'point';
    id: number;
    p: [number, number];
    construction?: boolean;
} | {
    k: 'line';
    id: number;
    a: [number, number];
    b: [number, number];
    construction?: boolean;
} | {
    k: 'circle';
    id: number;
    c: [number, number];
    r: number;
    construction?: boolean;
} | {
    k: 'arc';
    id: number;
    c: [number, number];
    r: number;
    a: [number, number];
    b: [number, number];
    sense: SoupSense;
    construction?: boolean;
};
/** A soup constraint row (§2.5). 16 kinds, 17 forms: `symmetric` has a
 *  three-point form (cEnd present) and an about-a-line form (cEnd absent,
 *  c names a line). `tangent`'s simple and endpoint forms are one row shape
 *  distinguished by whether the ends are present, with `side` carrying the
 *  recorded sigma/tau and `mode` the external/internal choice (O2). */
export type SoupRule = {
    k: 'coincident';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
} | {
    k: 'pointOnObject';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
} | {
    k: 'horizontal';
    a: number;
} | {
    k: 'vertical';
    a: number;
} | {
    k: 'parallel';
    a: number;
    b: number;
} | {
    k: 'perpendicular';
    a: number;
    b: number;
} | {
    k: 'tangent';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
    side?: number;
    mode?: 'external' | 'internal';
} | {
    k: 'equal';
    a: number;
    b: number;
} | {
    k: 'symmetric';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
    c: number;
    cEnd?: SoupPointRef;
} | {
    k: 'distance';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
    value: number;
} | {
    k: 'distanceX';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
    value: number;
} | {
    k: 'distanceY';
    a: number;
    aEnd?: SoupPointRef;
    b: number;
    bEnd?: SoupPointRef;
    value: number;
} | {
    k: 'radius';
    a: number;
    value: number;
} | {
    k: 'diameter';
    a: number;
    value: number;
} | {
    k: 'angle';
    a: number;
    b: number;
    value: number;
    quadrant?: number;
} | {
    k: 'lock';
    a: number;
    aEnd?: SoupPointRef;
};
export interface ExtrudeFeature {
    id: string;
    kind: 'extrude';
    name?: string;
    /** The sketch this pulls into a solid. */
    target: string;
    height: number;
}
/**
 * Two flat outlines skinned into one tapered solid -- Onshape calls it Loft.
 *
 * It takes no numbers of its own, deliberately. The two sketches already say
 * everything a blend needs: which plane they sit on and how far along it they
 * are, so the gap between them IS the difference in their offsets and the
 * solid starts at the lower one. A `height` field here would be a third
 * number that could disagree with the two that were already true, and the
 * student would have no way to tell which one the shape obeyed.
 *
 * Both sketches must sit on the SAME plane at DIFFERENT offsets. Anything
 * else is refused with a sentence rather than guessed at -- see
 * whyCannotBlend().
 */
export interface BlendFeature {
    id: string;
    kind: 'blend';
    name?: string;
    /** Exactly two sketch ids, bottom first. Plural so dependsOn() picks it up
     *  without being taught the kind -- see the note on that function. */
    targets: string[];
}
export interface CombineFeature {
    id: string;
    kind: 'combine';
    name?: string;
    op: 'union' | 'subtract' | 'intersect';
    /** Ids of earlier features. For subtract, the first is the body. */
    targets: string[];
}
/** A solid of revolution. reSHape already exposes revolve() in code mode; this
 *  is the Build-mode equivalent, spinning a sketch around the world Z axis. */
export interface RevolveFeature {
    id: string;
    kind: 'revolve';
    name?: string;
    /** The sketch this spins into a solid — same restriction extrude has. */
    target: string;
    /** Degrees to sweep. 360 is a full solid; less leaves a pie-slice gap. */
    angle: number;
}
/**
 * A mirrored copy of an earlier feature across one of the three base planes.
 *
 * Mirror keeps the original standing: like Onshape's default (merge scope
 * off), the source feature stays visible and the mirrored copy is added
 * alongside it, rather than replacing it. See topLevel() for where that is
 * enforced — a mirror's target is deliberately never marked consumed.
 */
export interface MirrorFeature {
    id: string;
    kind: 'mirror';
    name?: string;
    target: string;
    plane: SketchPlane;
}
/**
 * Repeated copies of an earlier feature — a linear row or a ring around an
 * axis. `count` includes the original, so count 1 is a no-op pattern.
 *
 * reSHape Script emits this as one `repeat()`/`repeatAround()` call
 * (lib/reshape-script-gen.ts), not a real `for` loop — the loop itself is
 * the kernel's job (lib/occt-build.ts builds and fuses `count` instances).
 */
export interface PatternFeature {
    id: string;
    kind: 'pattern';
    name?: string;
    target: string;
    mode: 'linear' | 'circular';
    /** Total instances, original included. */
    count: number;
    /** linear only: how far each successive copy shifts. */
    step?: Vec3;
    /** circular only: which world axis the copies orbit. */
    axis?: Axis3;
    /** circular only: degrees the whole ring of copies spans. Spacing between
     *  instances is totalAngle / count, so 360 wraps without a doubled instance
     *  at the seam. */
    totalAngle?: number;
}
/**
 * A cylindrical hole bored into an earlier solid. Sugar over cylinder +
 * subtract — the model tree shows one row for it, not a separate tool body
 * plus a separate cut, even though the generated line does exactly that.
 */
export interface HoleFeature {
    id: string;
    kind: 'hole';
    name?: string;
    /** The solid the hole is cut into. */
    target: string;
    diameter: number;
    depth: number;
    /** Where the hole's mouth sits, as an offset from `target`'s own
     *  bounding-box centre -- not an absolute world position. [0, 0, 0]
     *  means "dead centre on the target," wherever the target actually is;
     *  the kernel (lib/occt-build.ts) resolves that offset at build time. */
    center: Vec3;
    /** Which way the drill points. 'z' bores straight down, matching a hole
     *  placed on a flat top face without any tilt. */
    axis: Axis3;
    /**
     * Four bores instead of one, placed symmetrically around `center` -- half
     * the corner-to-corner spacing on each of the two axes the drill does not
     * point along. Cut from `target` in a single subtract (real JSCAD accepts
     * more than one shape to remove at once), so a bolt pattern is one feature
     * row with guaranteed-matching offsets on every side, not four separate
     * holes a student eyeballed into place one at a time.
     */
    corners?: {
        dx: number;
        dy: number;
    };
}
/**
 * A hollowed-out copy of an earlier solid: wall thickness in, solid body out.
 *
 * NOT a true shell. A true shell offsets every face inward by the same
 * distance, so the wall is exactly `thickness` everywhere. The old JSCAD path
 * had no boolean offset operation, so it scaled a copy of the whole body
 * inward around its own bounding-box centre by a fraction computed from that
 * box instead -- a long thin part got a thin wall on its long axis and a
 * thick one on its short axis, and a curved body (a ball, a tube) was not
 * uniformly thin at all. The kernel (lib/occt-build.ts) does this honestly,
 * with a real constant-distance inward offset.
 */
export interface ShellFeature {
    id: string;
    kind: 'shell';
    name?: string;
    target: string;
    thickness: number;
    /**
     * The face to leave open, named the way the student clicked it -- see
     * DraftFeature.face for the same pattern. Absent means fully closed, which
     * stays the default: a closed hollow is what most students ask for first,
     * and it is what the oracle fixture `shell-2` already records.
     */
    open?: TopoName;
}
/**
 * Round or cut off ONE named edge of a solid -- Onshape's Modify Fillet.
 *
 * The difference from the `round` property a Box already carries is the whole
 * reason this exists. `round` is JSCAD's roundRadius: it rounds EVERY edge of
 * the box at once, and there is no way to point at one, because a mesh has no
 * edge to point at. This names an edge -- as the meeting of two named faces,
 * see the `between` cause in lib/topo-name.ts -- and rounds that one.
 *
 * WHICH ENGINE BUILDS IT. lib/occt-build.ts does, exactly. The old JSCAD
 * path could not and did not pretend to -- it passed the target through
 * unchanged rather than emitting something that looks like a round and is
 * not one.
 */
export interface FilletFeature {
    id: string;
    kind: 'fillet';
    name?: string;
    /** The solid whose edge is being worked. */
    target: string;
    /** Which edge. A `between` name -- the edge where two named faces meet. */
    edge: TopoName;
    /** Radius for a round, or the distance cut back for a chamfer. */
    size: number;
    /** The same two words the rest of the app uses; the UI says Round and Bevel. */
    style: RoundStyle;
}
/**
 * Tilt one face, or every side face, so a moulded part can leave its mould --
 * Onshape's Draft and Body Draft.
 *
 * `pull` is the direction the mould opens; `neutral` is the height along that
 * direction which does not move, so the part pivots about it. Both are the
 * student's to choose and neither has a defensible default, which is why they
 * are stored rather than inferred.
 *
 * `whole` is Body Draft: every face except the two the pull direction points
 * at. Exact for the axis-aligned primitives, and stated here rather than
 * discovered -- on a shape whose sides are not parallel to the pull, "except
 * the two caps" is a rougher description than Onshape's own.
 */
export interface DraftFeature {
    id: string;
    kind: 'draft';
    name?: string;
    target: string;
    /** The face to tilt. Ignored when `whole` is set. */
    face?: TopoName;
    /** Body Draft: tilt every side face rather than one named one. */
    whole?: boolean;
    /** Degrees. Positive leans outward from the neutral plane. */
    angle: number;
    pull: Axis3;
    /** Where along `pull` the part does not move. */
    neutral: number;
}
/**
 * Move or copy an earlier feature by a vector — the move/copy half of
 * Onshape's Transform tool; the rotate half already ships as Turn.
 *
 * `copy: true` leaves the original in place and adds a translated duplicate.
 * `copy: false` relocates the original — the target is consumed and only the
 * moved feature is shown. See topLevel().
 */
export interface MoveFeature {
    id: string;
    kind: 'move';
    name?: string;
    target: string;
    offset: Vec3;
    copy: boolean;
}
export type Feature = BoxFeature | CylinderFeature | SphereFeature | ConeFeature | TorusFeature | PrismFeature | WedgeFeature | SketchFeature | ExtrudeFeature | CombineFeature | BlendFeature | RevolveFeature | GrooveFeature | PocketFeature | MirrorFeature | PatternFeature | HoleFeature | ShellFeature | MoveFeature | FilletFeature | DraftFeature;
/**
 * Ids of earlier features this one is built from directly.
 *
 * Structural, not a kind list: a feature depends on whatever its own
 * `targets` or `target` field names. The reorder guard in ModelEditor.tsx
 * calls this instead of checking `f.kind === 'combine'` by name, so a future
 * derived kind is covered automatically as long as it uses one of these two
 * field names for its dependency -- the same way every derived kind already
 * does -- rather than needing a human to remember to add it to a list.
 */
export declare function dependsOn(f: Feature): string[];
/**
 * Feature ids a feature reaches through a TopoName rather than through a
 * target field.
 *
 * A Round names the edge it works on, and that edge is the meeting of two faces
 * which may belong to a feature other than the one being rounded. That is a
 * real dependency -- delete the feature the face came from and the round has
 * nothing to hold on to -- and it is invisible to a `target` field, which is
 * why dependsOn() above folds this in rather than leaving it to each caller to
 * remember.
 *
 * featureChain() is the authority on which ids a name passes through; this only
 * knows which fields hold names.
 */
export declare function topoRefs(f: Feature): string[];
/** Anything that consumes an earlier feature rather than standing alone. */
export declare function isDerived(f: Feature): f is CombineFeature | ExtrudeFeature | RevolveFeature | MirrorFeature | PatternFeature | HoleFeature | ShellFeature | MoveFeature;
export interface ModelDoc {
    version: 1;
    features: Feature[];
}
/**
 * True when nothing in the doc could ever produce a 3D solid: it is empty,
 * or every feature in it is a bare `sketch` -- flat by construction until a
 * Pull or a Spin turns one into an extrude/revolve.
 *
 * Exists so a caller watching the mesh a build produced can tell "zero
 * triangles because nothing solid was ever asked for" apart from "zero
 * triangles because something that SHOULD be solid came out empty" (an
 * over-large Hole eating the whole part, say). Those two used to be the same
 * signal -- SandboxWorkspace.tsx's `stale` gate read triangle count alone,
 * so a brand-new session (EMPTY_DOC, before a student has drawn anything)
 * and a fresh Sketch/Circle/Polygon both showed the same "These numbers
 * leave nothing behind" warning immediately, for a document that was never
 * broken -- see that call site's own comment for the fix this predicate
 * unblocks.
 */
export declare function isSketchOnly(doc: ModelDoc): boolean;
export declare const EMPTY_DOC: ModelDoc;
/** A positioned primitive: has a centre, and can carry handles. Listed
 *  positively rather than by exclusion — every feature added since the six
 *  derived kinds below has needed to be left OUT of this, not in it. */
export declare function isShape(f: Feature): f is BoxFeature | CylinderFeature | SphereFeature | ConeFeature | TorusFeature;
/** Only a primitive can be rounded — see canRound() for why a combine cannot. */
export declare function isRoundable(f: Feature): f is BoxFeature | CylinderFeature;
/**
 * Why the fillet/chamfer tool refuses, or null when it does not.
 *
 * JSCAD solids are polygon soups with no topology, so there is no edge to pick
 * and no B-rep kernel to blend it. What there IS: rounded primitives, and hull
 * tricks that chamfer one. Both need the shape itself, before anything was cut
 * out of it. Refusing here and saying so is better than a fillet button that
 * quietly does nothing on half the tree -- and it teaches the thing the feature
 * list exists to teach, which is that order changes the result.
 */
export declare function whyCannotRound(f: Feature): string | null;
/**
 * Why Repeat Around would do nothing visible, or null when it would work.
 *
 * A circular pattern orbits a world axis. A shape whose middle sits ON that
 * axis has no radius to sweep, so every copy lands exactly on the original
 * and the union is the shape you started with -- a control that reports
 * success and changes nothing. Refusing up front is better than a feature row
 * that claims six copies exist.
 *
 * Only answerable for a plain primitive, whose centre this file knows. A
 * derived feature's position lives in the generated geometry, not the doc, so
 * this returns null and lets it through rather than guessing.
 */
export declare function whyCannotOrbit(f: Feature, axis: 'x' | 'y' | 'z'): string | null;
/** A sphere looks identical however it is turned, so offering the control
 *  would only teach that some buttons do nothing. */
export declare function canRotate(f: Feature): f is BoxFeature | CylinderFeature | ConeFeature | TorusFeature;
/** Largest round that still leaves a shape. Past this JSCAD throws. */
export declare function maxRound(f: BoxFeature | CylinderFeature): number;
/** Ids are short because they become variable names in the generated code. */
export declare function nextId(doc: ModelDoc, prefix: string): string;
export type ShapeKind = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'prism' | 'wedge';
/**
 * A born-axis-aligned rectangle's four edges, alternating horizontal and
 * vertical -- which is what KEEPS it a rectangle. Without this, typing a
 * Length on one edge had nothing holding the other three square to it: the
 * solver satisfied the new length by whatever arrangement was cheapest, and
 * setting edge0=40 then edge1=20 measurably left edge2 and edge3 at 40.1 and
 * 24.9, not 40 and 20 (2026-09-03). Two length rules plus these four is
 * exactly a rectangle's four degrees of freedom (width, height, position),
 * with nothing left for the solver to trade away.
 */
export declare const RECTANGLE_CONSTRAINTS: SketchConstraint[];
/** A rectangle to start from. An empty canvas with no corners gives a student
 *  nothing to grab, and every real sketch begins by editing a shape anyway. */
export declare function newSketch(doc: ModelDoc, plane?: SketchPlane): SketchFeature;
/**
 * Sketch on a picked planar FACE: the sketch-on-a-face form. `frame` is the
 * face's own world frame (origin on the face, u/v spanning it), so the same
 * rectangle a named-plane sketch starts from lands flat on that face.
 *
 * `plane` is set to 'xy' purely as a required-field placeholder -- `sketchFrameOf`
 * reads `frame` first and IGNORES `plane`/`offset` for a framed sketch, and
 * every consumer goes through that resolver. Storing a named plane here would
 * be a second source of truth that could drift.
 */
export declare function newSketchOnFace(doc: ModelDoc, frame: SketchFrame, points?: Array<[number, number]>): SketchFeature;
/** A circle, drawn as the two ends of a diameter -- see SketchFeature.shape.
 *  Not a rectangle-with-round-corners and not four points: the tag is the
 *  only thing that makes it a circle, so the data says so directly.
 *
 *  `centre` defaults to the origin -- a beginner asked for "a circle at the
 *  rectangle's centre" had no better move than typing the numbers out by
 *  hand, so the tool call site (ModelEditor.tsx) works out where the
 *  selected sketch actually sits and passes that in. Measured 2026-09-04. */
export declare function newCircleSketch(doc: ModelDoc, plane?: SketchPlane, centre?: [number, number]): SketchFeature;
/** The plain bounding-box centre of a sketch's DESIGN corners -- not an
 *  area-weighted centroid (lib/sketch-outline.ts's centroidOf is that, and
 *  stays private to the label-placement math it exists for). A pure
 *  function so a tool call site can ask "where does this sketch sit" without
 *  reaching into the outline/label machinery for an answer this simple.
 *  Empty input reads as the origin -- there is nothing to centre on. */
export declare function sketchBBoxCentre(points: Array<[number, number]>): [number, number];
/**
 * A rectangle from two clicked corners, in plane coordinates. Returns null
 * for a degenerate click pair (either side under 1 unit) rather than
 * creating a sliver -- the caller should treat null as "not a valid second
 * point yet", not as an error to surface.
 */
export declare function newRectangleSketch(doc: ModelDoc, plane: SketchPlane, p1: [number, number], p2: [number, number]): SketchFeature | null;
/**
 * A regular polygon from a clicked center and one clicked vertex, in plane
 * coordinates. The vertex point becomes an actual corner (angle = atan2 of
 * the click relative to center), not just a radius reference. Returns null
 * for a degenerate click (center and vertex under 1 unit apart).
 */
export declare function newPolygonSketch(doc: ModelDoc, plane: SketchPlane, center: [number, number], vertex: [number, number], sides?: number): SketchFeature | null;
export declare function newExtrude(doc: ModelDoc, target: string): ExtrudeFeature;
export declare function newRevolve(doc: ModelDoc, target: string): RevolveFeature;
/** The groove twin of newRevolve: same profile contract, but the swept ring
 *  is cut from `into` rather than standing alone. `into` is required for the
 *  same reason mirror's plane is — a groove with nothing to cut is not a
 *  feature, it is a revolve someone forgot to aim. */
export declare function newGroove(doc: ModelDoc, target: string, into: string): GrooveFeature;
/** The pocket twin of newExtrude: same profile contract, but the pulled block
 *  is cut out of a named solid instead of standing on its own. `into` is
 *  required for the same reason groove's is — a pocket with nothing to cut is
 *  not a pocket. */
export declare function newPocket(doc: ModelDoc, target: string, into: string): PocketFeature;
/**
 * Why these two features cannot be blended, in a sentence, or null when they
 * can. Every refusal names what to do about it -- a blend that silently did
 * nothing, or quietly picked one of two disagreeing planes, is worse than one
 * that says why it will not.
 */
export declare function whyCannotBlend(a: Feature, b: Feature): string | null;
/** Bottom-first: the sketch with the smaller offset leads, so the generated
 *  gap is always positive and the solid always starts at the lower one. */
export declare function newBlend(doc: ModelDoc, a: SketchFeature, b: SketchFeature): BlendFeature;
export declare function newMirror(doc: ModelDoc, target: string, plane: SketchPlane): MirrorFeature;
/**
 * How far the named feature's solid reaches along one world axis, when that
 * can be read straight off a primitive. Follows `target` links (hole, shell,
 * fillet, move, pattern, mirror ... anything with a `target: string`) back
 * to the primitive they were built from, at most 16 hops. Returns null when
 * the root is not a plain box/cylinder or the primitive is rotated -- callers fall
 * back to a flat default then. This is a DEFAULT-PICKING helper, not
 * geometry: a pattern or mirror does change the true extent and this
 * deliberately ignores that.
 */
export declare function extentAlong(doc: ModelDoc, featureId: string, axis: Axis3): number | null;
export declare function newPattern(doc: ModelDoc, target: string, mode?: 'linear' | 'circular'): PatternFeature;
/** center: [0, 0, 0] is not world zero -- see HoleFeature.center. It is "no
 *  offset," so the kernel (lib/occt-build.ts) reads it against the TARGET's
 *  own bounding-box centre at build time, wherever the target actually
 *  sits. A doc-level default has no target geometry to ask, which is
 *  exactly why the interpretation lives at build time and not here. */
export declare function newHole(doc: ModelDoc, target: string): HoleFeature;
/** Same hole, drilled at all four corners of a rectangle at once -- see
 *  HoleFeature.corners. The starting spacing is a guess the Dimensions panel
 *  makes exact; only ever offered while boring straight down, which is the
 *  bolt-pattern case this exists for. */
export declare function newHoleCorners(doc: ModelDoc, target: string): HoleFeature;
export declare function newShell(doc: ModelDoc, target: string, open?: TopoName): ShellFeature;
/**
 * Where a new Hollow (Shell) feature actually belongs, given the feature the
 * student picked to hollow.
 *
 * A Shell is an INWARD OFFSET cut from its own target's shape. If a Hole or a
 * Round already sits anywhere between the picked feature and the primitive
 * it descends from, hollowing the shape AS IT CURRENTLY LOOKS is exactly the
 * case occt-build.ts's own 'shell' branch refuses -- "this kernel cannot
 * hollow a shape that already has a hole or a round" is a real numerical
 * limit of the offset-then-cut it runs, not a data-model rule this file
 * enforces. But which shape gets shelled is a MODELLING CHOICE, not a fact
 * about the geometry: shelling the ORIGINAL primitive, before that hole or
 * round ever cut it, produces exactly the part a student meant (a hollowed
 * box that still has its hole and its round) and hits none of that limit,
 * because it never touches a hole-or-rounded shape at all.
 *
 * Walks the picked feature's `target` chain back to its root (a primitive,
 * or anything with no `target` field), and returns:
 *  - `target`: what the new Shell should actually target -- the picked
 *    feature itself when nothing in its ancestry is a hole or a round, or
 *    the first ancestor found BEFORE the first hole/round otherwise.
 *  - `insertAt`: the array index to splice the new feature in at -- the
 *    end of the document in the ordinary case, or immediately after
 *    `target`'s own position when reordering.
 *  - `rewireId`: null in the ordinary case, or the id of the first
 *    hole/round in the chain -- the caller must repoint THAT feature's own
 *    `target` at the new Shell's id once it exists, so the rest of the chain
 *    (everything already built from it) keeps building on top of the shell
 *    instead of on the bare primitive.
 *
 * A combine's plural `targets` is not walked -- this only ever needs to
 * cross the single-`target` chain a Hole/Fillet/Extrude/Revolve/Shell/Move
 * already forms, and a Combine sitting in that ancestry is treated as a root
 * (a reasonable stopping point, not a claim that nothing beyond it matters).
 *
 * THE FORWARD CASE, added after the backward-only version shipped a real
 * double-body bug: a face pick resolves to whichever feature OWNS that
 * face (see ownerOf()/nameFaceOnCurrentShape()), which can be an upstream
 * ROOT even after later features built on top of it -- a Hole, a Round on
 * some other edge, neither of which touched the picked face at all. Picking
 * a box's own top face after Box -> Hole -> Round used to pass the box's
 * own id as `pickedId` with NOTHING in its backward ancestry (a primitive
 * has no `target`), so this returned "append at the end, no reorder" --
 * and the Hollow that got appended targeted the box DIRECTLY, leaving Hole
 * and Round dangling off the ORIGINAL box in their own untouched branch.
 * `topLevel()` then had two unconsumed leaves (the Hole/Round chain's own
 * tip, and the new Hollow) and rendered BOTH, overlapping, as if the model
 * had silently forked in two. Checked as a single direct hop, not a further
 * walk down the whole downstream chain: reordering past anything ELSE
 * requires rewiring THAT feature's own `target`, and rewiring a feature
 * that is not itself the blocker would silently drop whatever it does (a
 * Move in between, say) -- so this only ever reorders past a blocker that
 * targets the picked feature directly, the same one-hop case the backward
 * walk above already only ever rewires.
 */
export declare function shellInsertion(doc: ModelDoc, pickedId: string): {
    target: string;
    insertAt: number;
    rewireId: string | null;
};
export declare function newMove(doc: ModelDoc, target: string, copy?: boolean): MoveFeature;
/** Insert a corner halfway along the edge after `index`, which is where a
 *  student expects a new one to land when they ask for it. A circle sketch
 *  is refused as a no-op: its two points are diameter ends, read that way
 *  ONLY because shape === 'circle' says so (see SketchFeature.shape), and
 *  splicing a third point in would leave that tag pointing at a pair of
 *  points that are no longer the diameter (Finding 3, sketch gauntlet round
 *  2). ModelEditor.tsx's corner() already refuses before calling this, with
 *  a message the student sees -- this is the belt under that belt. */
export declare function addCorner(f: SketchFeature, index: number): SketchFeature;
/**
 * A second shape used to land exactly on top of the first -- every primitive
 * is born at world zero, so a student's second box was invisible, hidden
 * inside the first, with no clue anything but the x field would ever explain
 * why (a moderate-lens student found this only by discovering that field).
 *
 * The first shape in an empty doc still gets [0, 0, 0] -- there is nothing to
 * clear yet, and 0 is the friendliest place to start building. Every shape
 * after that is placed just past the rightmost edge of whatever primitives
 * already exist, with a 10-unit gap so the two are visibly separate rather
 * than touching.
 */
export declare function newShape(doc: ModelDoc, kind: ShapeKind): Feature;
/**
 * Display names, counted per kind.
 *
 * Numbering by list position made the first cylinder "Cylinder 2" whenever a
 * box preceded it (fixed by grouping per label), and separately renamed
 * every same-kind feature whenever the list was reordered, because the
 * count was re-derived from current array order on every render. Sorting
 * each label's group by creationOrder(id) before numbering fixes both: the
 * order fed to the counter no longer depends on where the row currently
 * sits, only on when it was built.
 */
export declare function nameMap(doc: ModelDoc): Record<string, string>;
export declare function defaultName(f: Feature, doc: ModelDoc): string;
/** Features nothing else consumes — what the model actually shows. */
export declare function topLevel(doc: ModelDoc): Feature[];
//# sourceMappingURL=model-types.d.ts.map