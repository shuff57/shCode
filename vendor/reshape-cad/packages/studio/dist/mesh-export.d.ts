/**
 * A triangle mesh, structurally: flat XYZ positions, and an optional flat
 * triangle index buffer (3 indices per triangle, into `positions` measured in
 * VERTICES not floats).
 *
 * When `indices` is omitted, every 3 positions form one triangle -- the shape
 * lib/occt-mesh.ts's Geom3 flattens to (see fromPolygonSoup below). When
 * present, it is the shape lib/occt-three.ts's BufferGeometry already carries
 * (`geometry.attributes.position.array`, `geometry.index.array`).
 *
 * `ArrayLike<number>` rather than `number[]` so a caller can hand in a
 * Float32Array / Uint32Array straight off a BufferGeometry without copying.
 */
export interface MeshInput {
    positions: ArrayLike<number>;
    indices?: ArrayLike<number>;
}
/**
 * Concatenates several triangle meshes into the single MeshInput
 * writeSTL/writeOBJ/write3MF expect, offsetting each mesh's own indices by
 * the running vertex count so winding and triangle membership survive the
 * merge.
 *
 * Exists for BrepViewportThree.tsx: a ModelDoc can have more than one
 * top-level shape (two boxes never combined into one solid), and that is
 * still one file to export -- the same flattening JSCAD's own Save STL does
 * to a `solids` array before serializing it.
 */
export declare function mergeMeshes(meshes: MeshInput[]): MeshInput;
/**
 * Converts occt-mesh.ts's ungrouped Geom3 (`{ polygons: [{ vertices:
 * [[x,y,z] x3] }] }`) into a MeshInput. Takes the polygon shape structurally
 * -- an inline type, not an import of lib/occt-mesh.ts's `Geom3` -- for the
 * same reason this module avoids importing three.js: it should not become a
 * compile-time dependency of whichever caller happened to be written first.
 */
export declare function fromPolygonSoup(polygons: {
    vertices: ArrayLike<ArrayLike<number>>;
}[]): MeshInput;
/**
 * Binary STL. Chosen over ASCII STL the way lib/occt-mesh.ts's table chooses
 * a deflection default: measured, not assumed. ASCII STL runs roughly 5x the
 * bytes for the same triangles (every float printed as decimal text with a
 * keyword on either side) and every slicer in real use reads binary, so
 * there is no compatibility reason to pay for the larger format.
 *
 * Layout, and this is the part a hand-rolled writer gets wrong: an 80-byte
 * header (content ignored by every reader; left zeroed here), a little-endian
 * uint32 triangle count, then exactly 50 bytes per triangle -- 12 floats
 * (normal + 3 vertices, 4 bytes each = 48) plus a uint16 "attribute byte
 * count" that real files leave 0. Getting the attribute bytes wrong, or
 * padding the header to a rounder number, produces a file some slicers
 * accept (they resync on the count) and others silently misread -- which is
 * exactly why the test suite asserts total byte length, not just "did it
 * parse".
 */
export declare function writeSTL(mesh: MeshInput): Uint8Array;
/**
 * Plain-text OBJ: `v` lines (one per vertex, in `positions` order) then `f`
 * lines (one per triangle). OBJ is 1-indexed, unlike every buffer this module
 * otherwise deals in -- the +1 below is the one place that matters, and the
 * classic OBJ bug is forgetting it (or applying it twice after already
 * converting elsewhere), which the test suite checks directly.
 */
export declare function writeOBJ(mesh: MeshInput): string;
/**
 * 3MF: a ZIP containing `[Content_Types].xml`, `_rels/.rels`, and the actual
 * geometry in `3D/3dmodel.model`. All three are required for a 3MF reader to
 * accept the file at all -- the first two are boilerplate declaring what
 * `3D/3dmodel.model` is, and every real 3MF file repeats them near-verbatim.
 *
 * Async, unlike the other two writers, because JSZip's `generateAsync` is;
 * that is the one place this module's laziness (no bundled zip writer of its
 * own) becomes visible in the API.
 */
export declare function write3MF(mesh: MeshInput): Promise<Uint8Array>;
//# sourceMappingURL=mesh-export.d.ts.map