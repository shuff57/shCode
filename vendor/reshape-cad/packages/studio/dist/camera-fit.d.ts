export interface Box3Like {
    min: [number, number, number];
    max: [number, number, number];
}
/** The centre of a bounding box, as a plain triple. */
export declare function bboxCenter(bbox: Box3Like): [number, number, number];
/** The longest of a bounding box's three axis-aligned extents. */
export declare function bboxLongestDimension(bbox: Box3Like): number;
/** What "fill the viewport" defaults to when a caller does not pin one down --
 *  see fitDistance()'s own doc comment for where this number came from. */
export declare const DEFAULT_FILL_FRACTION = 0.45;
/** Floor under the fit distance, so a degenerate bbox (zero size -- an empty
 *  doc, or a build landing before any geometry exists) cannot put the camera
 *  on top of its own target by dividing toward zero. Comfortably closer than
 *  the app's own literal HOME position (140,160,130), whose distance from the
 *  origin is ~249 -- this is a last-resort floor, not a typical result. */
export declare const MIN_FIT_DISTANCE = 20;
/**
 * How far back a PerspectiveCamera must sit from a bounding box's centre so
 * the box's longest dimension fills `fillFraction` of the viewport's
 * SHORTER side.
 *
 * `fovDegrees` is the camera's VERTICAL field of view -- three.js's own
 * convention for `PerspectiveCamera`. Which side is "shorter" decides which
 * half-angle actually limits what fits on screen: in landscape (width >=
 * height, the common case here) height is shorter and the vertical fov
 * applies directly; in portrait, the EFFECTIVE horizontal half-angle --
 * derived from the vertical one and the aspect ratio the same way three.js
 * itself derives `tan(hFov/2) = tan(vFov/2) * aspect` -- governs instead,
 * and is always the narrower of the two when width < height.
 *
 * `occludedWidth` is how many pixels of `viewportWidth`, on one side, a
 * docked UI panel covers -- the Rules panel when a sketch is being viewed
 * flat, say. Subtracted from `viewportWidth` BEFORE the aspect ratio is
 * computed, so the fit is against the space a student can actually SEE, not
 * the canvas element's full width. This is deliberately independent of
 * whether the canvas element has already been resized by the browser's own
 * layout for that panel (a real docked flex column normally does resize the
 * canvas, given time) -- passing the panel's own known width here makes the
 * fit correct on the very first frame a panel appears, with no dependency on
 * a ResizeObserver callback having already fired first. Clamped to leave at
 * least 1px of visible width, so an occlusion wider than the viewport itself
 * cannot flip the effective width negative.
 *
 * A degenerate bbox (`bboxLongestDimension` <= 0) or an unmeasurable viewport
 * (either side <= 0) returns `MIN_FIT_DISTANCE` rather than a distance of
 * zero or `Infinity`.
 */
export declare function fitDistance(bbox: Box3Like, viewportWidth: number, viewportHeight: number, fovDegrees: number, fillFraction?: number, occludedWidth?: number): number;
//# sourceMappingURL=camera-fit.d.ts.map