/**
 * Orthographic camera mode + frustum sizing + localStorage persistence.
 * Pure numbers in/out so it is testable without a renderer.
 */
export declare enum CameraMode {
    PERSPECTIVE = "perspective",
    ORTHOGRAPHIC = "orthographic"
}
export declare function loadCameraMode(): CameraMode;
export declare function saveCameraMode(mode: CameraMode): void;
/**
 * Compute orthographic frustum parameters from a perspective camera,
 * preserving the same visible area at the current target distance.
 */
export declare function orthoFrustumFromPerspective(perspCam: {
    fov: number;
    aspect: number;
    near: number;
    far: number;
}, targetDistance: number): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
};
/**
 * Compute orthographic frustum parameters from any camera (perspective or ortho),
 * preserving the visible area at the target distance.
 */
export declare function orthoFrustumFromCamera(camera: {
    fov?: number;
    aspect?: number;
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    near: number;
    far: number;
    zoom?: number;
}, targetDistance: number, currentMode: CameraMode): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
};
//# sourceMappingURL=ortho-camera.d.ts.map