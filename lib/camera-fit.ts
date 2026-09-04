// Pure math for "fit the camera to the model" -- how far back a perspective
// camera must sit so a bounding box's longest dimension fills a target
// fraction of the viewport's SHORTER side. No three.js import: this takes
// plain numbers in and gives a plain number back, so it is unit-testable
// without a renderer, a kernel, or a DOM (see scripts/test-model-handles.mjs).
//
// WHY THIS EXISTS. Measured 2026-09-04: at the app's fixed HOME camera
// position, a 40mm box renders about 180px wide in a ~1164x662 viewport --
// roughly 27% of the shorter side. A 3mm round on that box is a handful of
// screen pixels of curve, easy for a beginner to miss and easy for a naive
// before/after pixel-diff to call "unchanged" (both confirmed: see the
// zoomed-in screenshot in scratchpad/parity that shows the SAME fillet is
// obviously rounded once framed larger). BrepViewportThree.tsx calls this on
// the model's first shape and whenever Home is pressed -- see fitToModel()
// there -- never on every rebuild, so a student's own zoom and orbit survive
// everything else.

export interface Box3Like {
  min: [number, number, number];
  max: [number, number, number];
}

/** The centre of a bounding box, as a plain triple. */
export function bboxCenter(bbox: Box3Like): [number, number, number] {
  return [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2,
  ];
}

/** The longest of a bounding box's three axis-aligned extents. */
export function bboxLongestDimension(bbox: Box3Like): number {
  return Math.max(
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  );
}

/** What "fill the viewport" defaults to when a caller does not pin one down --
 *  see fitDistance()'s own doc comment for where this number came from. */
export const DEFAULT_FILL_FRACTION = 0.45;

/** Floor under the fit distance, so a degenerate bbox (zero size -- an empty
 *  doc, or a build landing before any geometry exists) cannot put the camera
 *  on top of its own target by dividing toward zero. Comfortably closer than
 *  the app's own literal HOME position (140,160,130), whose distance from the
 *  origin is ~249 -- this is a last-resort floor, not a typical result. */
export const MIN_FIT_DISTANCE = 20;

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
 * A degenerate bbox (`bboxLongestDimension` <= 0) or an unmeasurable viewport
 * (either side <= 0) returns `MIN_FIT_DISTANCE` rather than a distance of
 * zero or `Infinity`.
 */
export function fitDistance(
  bbox: Box3Like,
  viewportWidth: number,
  viewportHeight: number,
  fovDegrees: number,
  fillFraction: number = DEFAULT_FILL_FRACTION,
): number {
  const longest = bboxLongestDimension(bbox);
  if (!(longest > 0) || !(viewportWidth > 0) || !(viewportHeight > 0) || !(fillFraction > 0)) {
    return MIN_FIT_DISTANCE;
  }

  const aspect = viewportWidth / viewportHeight;
  const verticalHalf = (fovDegrees * Math.PI) / 360; // fovDegrees / 2, in radians
  const shortSideHalf = aspect >= 1 ? verticalHalf : Math.atan(Math.tan(verticalHalf) * aspect);

  const distance = longest / (2 * fillFraction * Math.tan(shortSideHalf));
  return Math.max(distance, MIN_FIT_DISTANCE);
}
