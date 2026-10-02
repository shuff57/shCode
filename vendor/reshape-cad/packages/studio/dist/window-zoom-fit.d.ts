/**
 * Window-zoom fit calculation + selection fit.
 * Pure numbers in/out so it is testable without a renderer -- no three.js
 * import (see camera-fit.ts, and packages/studio/AGENTS.md: three.js stays
 * dynamic-import-only inside BrepViewportThree.tsx's loadThree()).
 */
export type Vec3 = [number, number, number];
export interface WindowZoomFitResult {
    valid: boolean;
    target: Vec3;
    distance: number;
}
/**
 * Compute the camera target and distance to frame a screen-space rectangle
 * (the user's drag selection) in world space.
 */
export declare function computeWindowZoomFit(zoomRect: {
    x: number;
    y: number;
    width: number;
    height: number;
}, viewportWidth: number, viewportHeight: number, camera: {
    position: Vec3;
    fov: number;
    near: number;
    far: number;
}, target: Vec3, sceneBox: {
    min: Vec3;
    max: Vec3;
} | null): WindowZoomFitResult;
/**
 * Compute camera target and distance to frame the current selection.
 */
export declare function computeSelectionFit(selectionBoxes: Array<{
    min: Vec3;
    max: Vec3;
}>, camera: {
    position: Vec3;
    fov: number;
    near: number;
    far: number;
}, target: Vec3, viewportWidth: number, viewportHeight: number): WindowZoomFitResult;
//# sourceMappingURL=window-zoom-fit.d.ts.map