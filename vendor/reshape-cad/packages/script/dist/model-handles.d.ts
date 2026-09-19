import { type Feature, type ModelDoc, type SketchPlane } from './model-types.js';
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
//# sourceMappingURL=model-handles.d.ts.map