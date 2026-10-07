/**
 * ViewCube hit-zone partition (SPEC-mouse-parity.md Phase 1.5, todo 28).
 *
 * Pure geometry: each cube face is a side×side square partitioned into a
 * 3×3 grid — 4 corner cells, 4 edge cells, 1 face cell — so a click point
 * on ANY face resolves to exactly one of { face, edge, corner, none },
 * never two. Edge/corner ids are pairs/triples of CSS face keys
 * (NAV_CUBE_FACES keys in BrepViewportThree.tsx), sorted and '|'-joined;
 * the component resolves an id to a view direction by summing the face
 * dirs it names (see cubeZoneDirs), so this file never needs the DIR
 * constants and can never drift from the JSX's face assignment.
 */
export type CubeFaceKey = 'front' | 'back' | 'right' | 'left' | 'top' | 'bottom';
/** Corner-zone cell size in px; face side is 64 (NAV_CUBE_SIZE), so each
 *  face partitions as 16px corner | 32px edge band | 32px face centre. */
export declare const CUBE_ZONE_CELL = 16;
export type CubeZone = {
    kind: 'face';
    id: string;
} | {
    kind: 'edge';
    id: string;
} | {
    kind: 'corner';
    id: string;
} | {
    kind: 'none';
    id: null;
};
/** Classifies a click point in a face's own plane ([0..side]², y down,
 *  x right as seen looking at that face) to its single hit zone. */
export declare function cubeZoneAt(face: CubeFaceKey, px: number, py: number, side?: number): CubeZone;
/** The 12 unique cube edges, as 'a|b' ids (each cube edge shows up on two
 *  faces' planes; the id dedupes them). */
export declare function cubeEdgeIds(): string[];
/** The 8 unique cube corners, as 'a|b|c' triples. */
export declare function cubeCornerIds(): string[];
/** id → normalized view direction, from the face dirs the component
 *  already owns (NAV_CUBE_FACES). An edge view looks from the normalized
 *  sum of its two faces' dirs; a corner view from the sum of three. */
export declare function cubeZoneDirs(faceDirs: Record<CubeFaceKey, [number, number, number]>): Record<string, [number, number, number]>;
//# sourceMappingURL=cube-zone.d.ts.map