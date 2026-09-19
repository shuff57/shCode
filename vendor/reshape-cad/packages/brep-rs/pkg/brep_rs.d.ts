/* tslint:disable */
/* eslint-disable */

/**
 * Build every feature in `doc_json`, in order. Returns
 * `{"built":[ids], "refusals":{id: reason}}` -- the adapter's `build()`
 * answer, mirroring buildDoc()'s own result shape (§4.5).
 */
export function build_doc_json(doc_json: string): string;

/**
 * The true curve length of one edge, rounded to 0.01, or `null`.
 */
export function edge_length(doc_json: string, feature_id: string, edge_index: number): string;

/**
 * Write one feature's built solid as a STEP part file (SPEC §3: "STEP export
 * and import"). Returns `{"step": "<file text>"}`, or `{"error": ...}` when the
 * feature is missing, was refused, or holds geometry `step::write_solid` has no
 * exact STEP counterpart for. JSON either way, so a caller tells the two apart
 * without sniffing the payload.
 */
export function export_step(doc_json: string, feature_id: string): string;

/**
 * The `[w, h]` (smallest first, rounded to 0.01) of a planar axis-aligned
 * face, else `null` -- the wasm form of OcctEngineAdapter.faceSize (§H).
 */
export function face_size(doc_json: string, feature_id: string, face_index: number): string;

export function measure_doc(doc_json: string): string;

/**
 * Measure one imported STEP part file (SPEC §4.5). The shape is ONE ENTRY of
 * `measure_doc`'s `shapes` map -- `{volume, bbox, faces, edges}`, no
 * `shapes` wrapper -- so an imported solid is measurable exactly like a
 * built one. `read_solid` refuses in plain words rather than returning a
 * wrong solid (SPEC §4.5), so `{"error": ...}` is the honest path, not a
 * crash.
 */
export function measure_step(text: string): string;

/**
 * Tessellate one feature's built solid for three.js (SPEC-brep-mesh). Returns
 * positions/indices/faces/edges JSON, or `{"error": ...}` when the feature is
 * missing, was refused, or the face set is not tessellable yet.
 */
export function mesh_feature(doc_json: string, feature_id: string, deflection: number): string;

/**
 * A TopoName JSON for an edge: the `between` cause, naming the two faces
 * that share it (§4.6). The rule is OcctAdapter's `nameEdgeOnCurrentShape`'s
 * exactly -- an edge used by OTHER than two faces gets no name, and both
 * faces must themselves be nameable, or the answer is null rather than a
 * guess. `between` is the only edge cause in the vocabulary.
 */
export function name_edge(doc_json: string, feature_id: string, edge_index: number): string;

/**
 * A TopoName JSON for a face of a primitive (box ±x/±y/±z) or an extrude
 * cap/side the sweep history records, else `null` (§4.6).
 */
export function name_face(doc_json: string, feature_id: string, face_index: number): string;

/**
 * Resolve one TopoName against the document. Returns the face's area/centroid,
 * the edge's length/centroid, or null — never a guess (§4.7).
 */
export function resolve(doc_json: string, name_json: string): string;

/**
 * Close a session and free its slot.
 */
export function sketch_close(h: number): void;

/**
 * Diagnose at the current point: rank, DoF, bucket, blame — JSON.
 */
export function sketch_diagnose(h: number): string | undefined;

/**
 * The last sketch seam error, or "". The u32-returning exports cannot carry
 * a sentence, so the sentence waits here for the caller that asked.
 */
export function sketch_last_error(): string | undefined;

/**
 * Open a warm sketch session from the schema contract's rows. Returns the
 * handle, or u32::MAX with the sentence available via sketch_last_error.
 */
export function sketch_open(topology_json: string): number;

/**
 * The solved profile: closed loops, construction dropped. JSON: a `loops`
 * array of `{ role: "outer" | "hole", segs: [...] }`, the outline first and
 * every hole after it (§8.2); each seg is a {a,b} line or a
 * {centre,radius,start,sweep} arc. Or `{"refusal": sentence}`.
 */
export function sketch_profile(h: number): string | undefined;

/**
 * Solve from the warm start. `params` is the full parameter vector in slot
 * order (a memcpy round trip); `drag` is 2 doubles: the dragged point's two
 * FULL-vector slots, or a slice of length 0 for no drag. Returns the solved
 * vector, or an empty vector (check sketch_last_error) on refusal.
 */
export function sketch_solve(h: number, params: Float64Array, drag_slots: Float64Array, drag_target_x: number, drag_target_y: number): Float64Array | undefined;

export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly build_doc_json: (a: number, b: number) => [number, number];
    readonly edge_length: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly export_step: (a: number, b: number, c: number, d: number) => [number, number];
    readonly face_size: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly measure_doc: (a: number, b: number) => [number, number];
    readonly measure_step: (a: number, b: number) => [number, number];
    readonly mesh_feature: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly name_edge: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly name_face: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly resolve: (a: number, b: number, c: number, d: number) => [number, number];
    readonly sketch_close: (a: number) => void;
    readonly sketch_diagnose: (a: number) => [number, number];
    readonly sketch_last_error: () => [number, number];
    readonly sketch_open: (a: number, b: number) => number;
    readonly sketch_profile: (a: number) => [number, number];
    readonly sketch_solve: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly version: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
