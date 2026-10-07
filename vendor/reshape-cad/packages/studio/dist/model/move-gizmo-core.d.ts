/**
 * The ADAPTIVE increment for a model whose longest extent is `extent` mm:
 * the largest ruler step whose ladder value keeps a full drag of `extent`
 * to at most ~20 stops. A 40mm part snaps in 2mm jumps; a 300mm part in
 * 20mm jumps. Degenerate (extent <= 0) falls back to 1mm -- a number, not
 * a NaN.
 */
export declare function adaptiveStep(extent: number): number;
/**
 * Snap a world-space drag delta to the nearest increment, per mode.
 * `fixedStep <= 0` (or non-finite) means "no increment" -- the raw delta
 * passes through, which is what the toggle-off case must do, not 0.
 */
export declare function snapDelta(delta: [number, number, number], mode: 'adaptive' | 'fixed' | 'off', fixedStep: number, modelExtent: number): [number, number, number];
//# sourceMappingURL=move-gizmo-core.d.ts.map