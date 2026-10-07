/**
 * Mouse scheme presets + localStorage persistence.
 * Pure numbers in/out so it is testable without a renderer.
 */
export type MouseScheme = 'legacy' | 'fusion';
export interface MouseButtons {
    ORBIT: number;
    PAN: number;
    DOLLY: number;
}
export interface Touches {
    ORBIT: number;
    PAN: number;
    DOLLY: number;
}
export declare const MOUSE_SCHEMES: Record<MouseScheme, {
    label: string;
    buttons: MouseButtons;
    touches: Touches;
}>;
export declare const DEFAULT_SCHEME_NAME: MouseScheme;
export declare function loadSchemeName(): MouseScheme;
export declare function saveSchemeName(name: MouseScheme): void;
export declare function schemeToMouseButtons(scheme: MouseScheme): MouseButtons;
export declare function schemeToTouches(scheme: MouseScheme): Touches;
/** The status bar's one-line mouse-binding hint, derived from the scheme's
 *  own button table so the words can never drift from the bindings (the
 *  stale "Right-drag orbit" hint predates the fusion default flip and read
 *  wrong under it: right-drag DOLLIES there). Both schemes orbit with the
 *  left button; Shift+orbit-button becomes PAN and Shift+pan-button becomes
 *  ORBIT via three.js OrbitControls' own modifier rule -- the fusion scheme's
 *  Shift+MMB orbit is that built-in split, so the hint names it. */
export declare function navHint(scheme: MouseScheme): string;
//# sourceMappingURL=camera-controls.d.ts.map