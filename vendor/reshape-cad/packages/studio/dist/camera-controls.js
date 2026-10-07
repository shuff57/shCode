/**
 * Mouse scheme presets + localStorage persistence.
 * Pure numbers in/out so it is testable without a renderer.
 */
export const MOUSE_SCHEMES = {
    legacy: {
        label: 'Legacy (L=Orbit, M=Dolly, R=Pan)',
        buttons: { ORBIT: 0, PAN: 2, DOLLY: 1 },
        touches: { ORBIT: 0, PAN: 1, DOLLY: 2 },
    },
    fusion: {
        label: 'Fusion (L=Orbit, M=Pan, R=Dolly)',
        buttons: { ORBIT: 0, PAN: 1, DOLLY: 2 },
        touches: { ORBIT: 0, PAN: 2, DOLLY: 1 },
    },
};
// Todo 29 (SPEC Phase 1.1): flipped from 'legacy' after the FmMNIGVpCng
// review (official Autodesk Fusion footage, filed in fusion-video-findings.md
// as "## Navigation / camera") CONFIRMED MMB-pan + Shift+MMB-orbit; the
// 'fusion' preset's MMB=PAN matches, and a stored preference still wins via
// loadSchemeName() -- the default only reaches first-time users.
export const DEFAULT_SCHEME_NAME = 'fusion';
const STORAGE_KEY = 'reshape.mouseScheme';
export function loadSchemeName() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'legacy' || stored === 'fusion'))
            return stored;
    }
    catch { /* ignore */ }
    return DEFAULT_SCHEME_NAME;
}
export function saveSchemeName(name) {
    try {
        localStorage.setItem(STORAGE_KEY, name);
    }
    catch { /* ignore */ }
}
export function schemeToMouseButtons(scheme) {
    return MOUSE_SCHEMES[scheme].buttons;
}
export function schemeToTouches(scheme) {
    return MOUSE_SCHEMES[scheme].touches;
}
/** The status bar's one-line mouse-binding hint, derived from the scheme's
 *  own button table so the words can never drift from the bindings (the
 *  stale "Right-drag orbit" hint predates the fusion default flip and read
 *  wrong under it: right-drag DOLLIES there). Both schemes orbit with the
 *  left button; Shift+orbit-button becomes PAN and Shift+pan-button becomes
 *  ORBIT via three.js OrbitControls' own modifier rule -- the fusion scheme's
 *  Shift+MMB orbit is that built-in split, so the hint names it. */
export function navHint(scheme) {
    const b = MOUSE_SCHEMES[scheme].buttons;
    const word = (btn) => btn === 0 ? 'Left' : btn === 1 ? 'Middle' : 'Right';
    const shift = (btn) => {
        // The OTHER camera action on the same button (three.js's own modifier
        // split: Rotate+Shift=Pan, Pan+Shift=Rotate). Dolly+Shift stays Dolly.
        if (b.ORBIT === btn)
            return `Shift+${word(btn)}-drag: pan`;
        if (b.PAN === btn)
            return `Shift+${word(btn)}-drag: orbit`;
        return '';
    };
    const parts = [
        `${word(b.ORBIT)}-drag: orbit`,
        `${word(b.PAN)}-drag: pan`,
        shift(b.ORBIT),
        shift(b.PAN),
        b.DOLLY === 1 ? 'Scroll: zoom' : `${word(b.DOLLY)}-drag: dolly`,
    ].filter(Boolean);
    // Scroll always zooms (OrbitControls' wheel handler is buttonless).
    if (b.DOLLY !== 1)
        parts.push('Scroll: zoom');
    return parts.join(' · ');
}
//# sourceMappingURL=camera-controls.js.map