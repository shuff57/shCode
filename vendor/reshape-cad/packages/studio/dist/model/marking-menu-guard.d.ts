import type { PointerSample } from './marking-menu-core.js';
/** The right button's role in the active scheme, as camera-controls.ts's
 *  MOUSE_SCHEMES bind it (0/1/2 or absent). 'none' means the scheme binds
 *  no camera action to the right button at all. */
export type RightButtonRole = 'orbit' | 'pan' | 'dolly' | 'none';
/** Which slot camera-controls.ts's scheme map binds the right button to.
 *  Mirrors MOUSE_SCHEMES' own buttons ({ ORBIT, PAN, DOLLY } of 0/1/2) --
 *  read from the scheme's shape, not hardcoded, so a todo-29 preset change
 *  flows through automatically. */
export declare function rightButtonRole(scheme: {
    ORBIT: number;
    PAN: number;
    DOLLY: number;
}): RightButtonRole;
/** The guard's verdict for one right-button release. */
export type RightGuardVerdict = 'camera-gesture' | 'menu' | 'ignore';
/** Is this right-button release a menu click, a camera gesture, or
 *  irrelevant? The movement threshold is the SHARED hold-cycle dead zone
 *  (passed in), so a drag beyond it is a camera gesture and a release
 *  within it is a menu -- the same split classifyRightClick draws, plus the
 *  scheme-aware answer for "who owns the right button": the camera keeps
 *  every drag regardless of role; the menu opens only on the click-shaped
 *  release, and only when the release did not already fire a wedge (the
 *  caller checks classifyGesture's 'wedge' verdict BEFORE consulting this).
 *  `down === null` (no right pointerdown seen) always ignores. */
export declare function rightClickGuard(down: PointerSample | null, up: PointerSample, deadZonePx: number): RightGuardVerdict;
//# sourceMappingURL=marking-menu-guard.d.ts.map