/** The 2D sketch view state: which world point (cx, cy) sits at the viewport
 *  centre, and how many screen pixels one millimetre of sketch spans. */
export interface SketchView {
    cx: number;
    cy: number;
    pxPerMm: number;
}
/** A 2D point or axis-aligned bbox, in sketch world units (mm). */
export interface Pt2Like {
    x: number;
    y: number;
}
export interface BBox2Like {
    min: [number, number];
    max: [number, number];
}
/** Viewport size in screen pixels. */
export interface SizePx {
    width: number;
    height: number;
}
/** Floor and ceiling for pxPerMm, so a runaway wheel cannot push the scale to
 *  zero (everything vanishes) or to Infinity (NaN in the transforms). */
export declare const MIN_PX_PER_MM = 0.000001;
export declare const MAX_PX_PER_MM = 1000000;
/** Clamp a scale into [MIN_PX_PER_MM, MAX_PX_PER_MM]. */
export declare function clampScale(pxPerMm: number): number;
/** Screen point -> world point for a view. Screen y grows downward, world y
 *  grows upward, hence the flip. */
export declare function screenToWorld(view: SketchView, pt: Pt2Like, size: SizePx): Pt2Like;
/** World point -> screen point for a view (inverse of screenToWorld). */
export declare function worldToScreen(view: SketchView, pt: Pt2Like, size: SizePx): Pt2Like;
/**
 * Wheel zoom about a cursor: multiply pxPerMm by `zoomFactor` (clamped), and
 * shift the centre so the world point under `cursorPx` before the zoom is
 * the same world point under it after. Derived by requiring
 * worldToScreen(post, w, size) == cursorPx for w = screenToWorld(pre, ...):
 * the centre must move by the cursor's offset from the viewport centre,
 * measured in the NEW scale.
 */
export declare function applyWheelZoom(view: SketchView, cursorPx: Pt2Like, size: SizePx, zoomFactor: number): SketchView;
/** Pan by a screen-pixel drag (dx, dy). The view moves opposite to the
 *  drag: dragging right shows content further left. */
export declare function panByPx(view: SketchView, dxPx: number, dyPx: number): SketchView;
/**
 * Fit a world bbox into the viewport: centre on the bbox centre, scale so
 * the bbox's longest dimension fills `DEFAULT_FILL_FRACTION` of the shorter
 * viewport side, then shrink that scale so `padPx` of margin survives on
 * every side. Reuses camera-fit's bbox helpers -- the same definitions of
 * "centre" and "longest" as the 3D Home view, not a second copy.
 *
 * A degenerate bbox (zero extent -- an empty sketch, or a single point) or
 * an unmeasurable viewport falls back to 1 px/mm centred on the bbox
 * centre, rather than a zero or infinite scale.
 */
export declare function fitView(bbox: BBox2Like, size: SizePx, padPx: number): SketchView;
/** How many world units `px` screen pixels span in this view -- the screen
 *  -> world conversion for SNAP_PX/HIT_PX tolerances, which stay in screen
 *  space so they survive zoom. */
export declare function screenPxToWorld(px: number, view: SketchView): number;
//# sourceMappingURL=sketch-view.d.ts.map