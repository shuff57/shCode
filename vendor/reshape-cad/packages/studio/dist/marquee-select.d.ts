import { type CoreGeom, type Pt } from './model/sketch-canvas-core.js';
/** The raw drag: where the press began and where it ended. Direction is
 *  recoverable only from the raw pair, so the API takes this and normalizes
 *  internally for the containment math. */
export interface MarqueeDrag {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}
/** Fusion-style marquee: dragged left-to-right is a WINDOW select (only fully
 *  enclosed geometry), right-to-left is a CROSSING select (touched counts).
 *  Decided by the drag's x direction alone; y is irrelevant to the kind. */
export declare function marqueeKind(drag: MarqueeDrag): 'window' | 'crossing';
/** Select geometry ids under a marquee drag. Window (left-to-right): fully
 *  inside only. Crossing (right-to-left): touched or inside. A degenerate
 *  drag (start == end, a click) has zero area and selects nothing. */
export declare function marqueeSelect(geoms: CoreGeom[], drag: MarqueeDrag): number[];
/** Generic point-SET containment test for the SAME window/crossing rule
 *  windowSelect/crossingSelect above apply to a CoreGeom -- generalised so a
 *  caller whose candidate is not sketch geometry (BrepViewportThree.tsx's
 *  3D-projected face/edge/vertex/body picks, SPEC-mouse-parity.md Phase 3
 *  item 4) can reuse the exact same containment math rather than
 *  re-implementing it. `pts` is the candidate already reduced to screen
 *  points: one for a vertex, two (its own endpoints) for an edge, four (its
 *  bbox corners, tl/tr/br/bl) for a face or a whole body. Window: every
 *  point lies inside the rect AND no segment between them crosses its
 *  boundary (the same defensive pair windowSelect's own 'line' case
 *  checks). Crossing: window, OR any point lies inside, OR any segment
 *  crosses -- exactly crossingSelect's per-shape logic, generalised past
 *  one fixed point count. A degenerate drag (zero area) selects nothing,
 *  same as marqueeSelect(). */
export declare function pointSetSelect(pts: Pt[], drag: MarqueeDrag): boolean;
//# sourceMappingURL=marquee-select.d.ts.map