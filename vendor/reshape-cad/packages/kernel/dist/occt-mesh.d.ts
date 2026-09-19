/** The OpenCascade entry points this file uses. Same hand-written slice as
 *  lib/occt-build.ts -- a wrong name fails at the first call rather than
 *  quietly. */
export interface Occt {
    [name: string]: any;
}
/** One triangle, in the JSCAD polygon shape the renderer already understands. */
export interface Polygon {
    vertices: Array<[number, number, number]>;
}
/** A JSCAD geom3. Deliberately structural: this is the library's own shape, not
 *  a wrapper, so it goes straight into the renderer and into measureVolume. */
export interface Geom3 {
    polygons: Polygon[];
    transforms: number[];
}
export interface MeshOptions {
    /**
     * How far a triangle may sit from the true surface, in sketch units.
     *
     * The accuracy dial. See the table at the top of this file: 0.05 is better
     * than the 32-segment cylinder that ships today, at a size nothing on a
     * preview-sized canvas can tell from exact.
     */
    deflection?: number;
    /**
     * How far a triangle's normal may swing from the true one, in radians.
     *
     * Does the work `deflection` cannot on a tightly curved face: a 1 mm fillet
     * satisfies a 0.05 deflection with three triangles and still looks faceted.
     * 0.3 rad is about 17 degrees.
     */
    angular?: number;
}
/**
 * Turn a B-rep solid into triangles.
 *
 * Returns a geom3 the existing renderer draws, or null when the shape has no
 * drawable surface at all -- an empty result, or a shape that is only edges.
 * Null rather than an empty geom3 because "nothing to draw" and "a shape whose
 * every face failed to mesh" deserve different words from the caller, and an
 * empty polygon list would render as a blank canvas with no way to tell which
 * happened.
 *
 * Meshing MUTATES the shape: BRepMesh_IncrementalMesh attaches a triangulation
 * to each face rather than returning one. That is OpenCascade's design, not a
 * choice here, and it is why calling this twice with different deflections
 * re-meshes rather than accumulating.
 */
export declare function tessellate(oc: Occt, shape: any, opts?: MeshOptions): Geom3 | null;
/**
 * The volume a triangle soup encloses, SIGNED.
 *
 * Here rather than left to the kernel because it is the only check that catches
 * the orientation trap. An unsigned volume cannot tell a correctly wound mesh
 * from one whose every face is flipped, and a mesh with SOME faces flipped -- the
 * realistic failure, since a box's six faces split three and three -- lands
 * somewhere between the right answer and zero.
 *
 * So: positive AND equal to the kernel's own volume is the bar, and neither half
 * is sufficient alone.
 */
export declare function signedVolume(g: Geom3): number;
/** How many triangles a geom3 carries. The cost half of the deflection trade. */
export declare function triangleCount(g: Geom3 | null): number;
//# sourceMappingURL=occt-mesh.d.ts.map