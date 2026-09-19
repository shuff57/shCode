/**
 * Convert the SVG `EngineAdapter.exportDrawing()` produces into single-page
 * PDF bytes. Page size comes from the SVG's own width/height in mm (falling
 * back to the viewBox); every drawing coordinate is written in SVG user units
 * verbatim, under one page-level flip transform, which is what makes the
 * output auditable against the input by eye.
 *
 * Throws on anything outside the measured subset rather than dropping it --
 * a silently-skipped element is a wrong drawing with no symptom.
 */
export declare function svgToPdf(svg: Uint8Array | string): Uint8Array;
//# sourceMappingURL=svg-pdf.d.ts.map