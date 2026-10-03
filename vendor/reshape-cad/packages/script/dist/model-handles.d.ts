import { type SketchFrame, type Feature, type ModelDoc, type SketchPlane } from './model-types.js';
export type HandleKind = 'size' | 'move' | 'turn' | 'point' | 'radius';
export interface HandleSpec {
    kind: HandleKind;
    /** Generated parameter this handle drives, e.g. "box1_width". */
    param: string;
    /** Point on the shape, world space. */
    origin: [number, number, number];
    /** Unit direction the handle slides along, world space. */
    axis: [number, number, number];
    /** Second direction, for handles that move in a plane rather than a line. */
    axisV?: [number, number, number];
    /** Parameter the second direction drives. */
    paramV?: string;
    scale: number;
    label: string;
}
export declare function planeAxes(plane: string): {
    u: [number, number, number];
    v: [number, number, number];
};
/**
 * Where a sketch sits and which way Pull carries it, from the ONE resolver
 * (sketchFrameOf) -- so a sketch with a `frame` (sketch-on-a-face, or on a
 * datum plane) is handled on its real plane, not on the placeholder 'xy' its
 * `plane` field holds. SPEC-datum-family Stage 1c.
 *
 * `u`/`v`/`origin` are the frame. `w` is the pull direction: a named plane
 * keeps its MEASURED sweep (n * SWEEP_DIR, so xz pulls -Y); a literal frame
 * pulls along u x v, exactly as the kernel's sketch_frame does.
 */
export declare function placementOf(sk: {
    plane?: SketchPlane;
    offset?: number;
    frame?: SketchFrame;
}): {
    u: [number, number, number];
    v: [number, number, number];
    origin: [number, number, number];
    n: [number, number, number];
    w: [number, number, number];
};
/**
 * A single anchor at a sketch plane's own origin -- what a click-to-draw
 * surface needs to exist BEFORE any corner does, so a screen click can be
 * measured relative to something. Same u/v axis convention as a sketch
 * corner's own handle (see sketchHandles), just with no existing point to
 * anchor from.
 */
export declare function planeAnchor(plane: SketchPlane, offset: number): HandleSpec;
export declare function handlesFor(f: Feature, doc?: ModelDoc): HandleSpec[];
/**
 * A representative world point for a feature -- the one a context bar or any
 * other selection-anchored chrome should float above. Pure: no doc mutation,
 * no camera, no projection; the caller owns turning this into screen space.
 *
 * Shapes answer their own centre. A sketch answers its bbox centre pushed
 * through the plane basis (the same world() math sketchHandles uses), so a
 * framed sketch-on-a-face is covered by that same arithmetic rather than a
 * second copy of it. The handle helpers for extrude/pocket/fillet already
 * compute exactly the origins their one solid sits on, so those are reused
 * verbatim -- one source of truth for "where this feature is". Everything
 * else (hole/shell/move/pattern/mirror/combine/blend/groove/draft/prism/
 * wedge) has no cheap representative point yet and reads as null: no anchor,
 * no bar, which is the honest state rather than a bar floating over
 * nothing.
 */
export declare function featureCenter(f: Feature, doc: ModelDoc): [number, number, number] | null;
/**
 * The named plane to look straight down when this feature is selected, or null.
 * A sketch with a literal `frame` (sketch-on-a-face, or on a frame datum) has
 * no named plane -- its `plane` field is a placeholder 'xy' -- so it returns
 * null rather than looking down the wrong axis (SPEC-datum-family 1c).
 * A datum is not a sketch: null.
 */
export declare function flatViewPlane(f: Feature | undefined | null): SketchPlane | null;
//# sourceMappingURL=model-handles.d.ts.map