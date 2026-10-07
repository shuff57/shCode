export type V3 = readonly [number, number, number];
export interface DatumQuad {
    id: string;
    origin: V3;
    u: V3;
    v: V3;
    half: number;
}
/** The nearest datum a ray crosses inside its square, with the distance along the
 *  ray, or null. A ray parallel to the plane, or a plane behind the ray, is a miss. */
export declare function pickDatum(rayOrigin: V3, rayDir: V3, quads: readonly DatumQuad[]): {
    id: string;
    t: number;
} | null;
//# sourceMappingURL=datum-pick.d.ts.map