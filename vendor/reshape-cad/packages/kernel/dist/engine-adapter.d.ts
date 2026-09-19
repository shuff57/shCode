import type { ModelDoc } from '@shuff57/reshape-script/model-types';
import type { TopoName } from '@shuff57/reshape-script/topo-name';
import type * as THREE from 'three';
/**
 * Which triangle-index range in a meshed geometry's `index` buffer came from
 * one face of the solid.
 *
 * `index` is that face's position in the shape's OWN face list -- the same
 * order faceAt() indexes into, and the same order the kernel's own faces()
 * walk produces -- not just among the faces that meshed successfully. A face
 * that produced no triangles still holds its place, so a face index survives
 * a re-mesh of the same shape (which is what picking depends on).
 * `start`/`count` are index-BUFFER offsets, 3 per triangle, matching what
 * BufferGeometry.index / drawRange already expect.
 */
export interface FaceRange {
    index: number;
    start: number;
    count: number;
}
/** What one build produced, in adapter-neutral terms. `shapes` mirrors
 *  BuildResult.shapes (feature id -> built shape) -- kept as `unknown`
 *  rather than `any` because callers only ever pass a shape back into this
 *  SAME adapter's own methods (mesh/resolveFace/resolveEdge/nameFace/
 *  nameEdge), never inspect it directly; each implementation knows its own
 *  concrete shape type. `refusals` mirrors BuildResult.refusals exactly
 *  (occt-build.ts) -- per-feature reasons a feature's result differs from
 *  what its document row asked for. */
export interface EngineBuildResult {
    shapes: Map<string, unknown>;
    refusals?: Map<string, string>;
}
/** A meshed shape, three.js-ready. Adapter-neutral on purpose: an
 *  implementation converges on this whether its kernel hands back geometry
 *  directly or it has to assemble one from JSON. */
export interface EngineMesh {
    geometry: THREE.BufferGeometry;
    faces: FaceRange[];
}
export interface EngineAdapter {
    /** Bring the underlying kernel up (load the wasm, or open a session).
     *  Idempotent-ish in spirit -- called once before the first build(). */
    load(): Promise<void>;
    /** Rebuild every shape in `doc`. Full replay, not an incremental diff:
     *  every call rebuilds the whole feature list from scratch. */
    build(doc: ModelDoc): EngineBuildResult;
    /** Mesh one already-built shape for three.js. Returns null exactly when
     *  tessellateToThree() would: no drawable surface. `deflection` is the
     *  chord tolerance in mm, same convention both kernels already use. */
    mesh(shape: unknown, opts?: {
        deflection?: number;
    }): EngineMesh | null;
    /** Every pickable edge of a built shape, paired with its line geometry --
     *  the adapter form of edgesToThree(). Raycaster hits one of these lines
     *  and the caller gets back the SAME edge handle resolveEdge()/nameEdge()
     *  take, without re-walking the shape. */
    edges(shape: unknown): Array<{
        edge: unknown;
        geometry: THREE.BufferGeometry;
    }>;
    /** The face at FaceRange.index on a built shape -- the reverse lookup a
     *  raycast hit (or a persisted face selection) needs, in the SAME order
     *  mesh()'s FaceRange.index was assigned in. The adapter form of
     *  `facesOf(oc, shape)[index]`. Out-of-range or unmeshed returns null. */
    faceAt(shape: unknown, index: number): unknown | null;
    /** Resolve a stored TopoName back to a face/edge on a freshly built shape
     *  (picking-by-reference: fillet an edge, widen the part, the name still
     *  finds it). Null is a real answer -- see topo-resolve.ts's resolveName()
     *  doc comment -- and every caller must treat it as one. */
    resolveFace(name: TopoName, build: EngineBuildResult): unknown | null;
    resolveEdge(name: TopoName, build: EngineBuildResult): unknown | null;
    /** Name a face/edge the student just clicked, on the CURRENT top-level
     *  shape of `pickedFeature` -- the adapter form of
     *  nameFaceOnCurrentShape()/nameEdgeOnCurrentShape(). Null means "no
     *  recorded path back to a nameable primitive", not an error. */
    nameFace(build: EngineBuildResult, doc: ModelDoc, pickedFeature: string, face: unknown): TopoName | null;
    nameEdge(build: EngineBuildResult, doc: ModelDoc, pickedFeature: string, edge: unknown): TopoName | null;
    /** A picked face's own in-plane size (e.g. [40, 40] for a box's top face),
     *  read off the BUILT geometry -- the adapter form of
     *  BrepViewportThree.tsx's own module-level faceSize(oc, face) helper,
     *  found during the step-10 seam refactor: it reached into `kernel.oc`
     *  directly (Bnd_Box/BRepBndLib), same as every other call this interface
     *  already covers, so it moves here rather than staying a stray exception.
     *  Null for a curved or non-axis-aligned face, or whenever the size cannot
     *  be computed -- same "no answer over a wrong one" rule as resolveFace. */
    faceSize(face: unknown): [number, number] | null;
    /** A picked edge's own true arc length -- the adapter form of
     *  BrepViewportThree.tsx's own module-level edgeLength(oc, edge) helper,
     *  moved here for the same reason as faceSize above. Null whenever it
     *  cannot be computed. */
    edgeLength(edge: unknown): number | null;
}
//# sourceMappingURL=engine-adapter.d.ts.map