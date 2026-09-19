/** One soup geometry row, the same shape ModelDoc stores (model-types.ts). */
export type SessionGeom = {
    k: 'point';
    id: number;
    p: [number, number];
    construction?: boolean;
} | {
    k: 'line';
    id: number;
    a: [number, number];
    b: [number, number];
    construction?: boolean;
} | {
    k: 'circle';
    id: number;
    c: [number, number];
    r: number;
    construction?: boolean;
} | {
    k: 'arc';
    id: number;
    c: [number, number];
    r: number;
    a: [number, number];
    b: [number, number];
    sense: 'ccw' | 'cw';
    construction?: boolean;
};
/** One soup rule row, the same shape ModelDoc stores. */
export type SessionRule = Record<string, unknown> & {
    k: string;
};
/** The diagnosis JSON sketch_diagnose returns. */
export interface Diagnosis {
    rank: number;
    dof: number;
    bucket: 'consistent' | 'globally-infeasible' | 'redundant' | 'conflicting';
    blame: number[];
}
/** One solved profile segment (sketch_profile). Arc sweep is CCW radians. */
export type ProfileSeg = {
    k: 'line';
    a: [number, number];
    b: [number, number];
} | {
    k: 'arc';
    centre: [number, number];
    radius: number;
    start: number;
    sweep: number;
};
/** One solved profile loop (sketch_profile): the sketch's outline, or a hole
 *  through it (SPEC-sketcher2 §8.2). */
export type ProfileLoop = {
    role: 'outer' | 'hole';
    segs: ProfileSeg[];
};
/** The slot base of geometry `id` in the parameter vector, or null when no
 *  such geometry exists. Mirrors ParamBlock's push order. */
export declare function slotBaseOf(geoms: SessionGeom[], id: number): number | null;
/** Slots (x, y) of a named point of geometry `id`, for the drag hot path.
 *  Point refs: 'a'/'b' on lines and arcs, 'c' on circles and arcs, 'a' on a
 *  bare point. Unknown combos return null and the caller skips the drag. */
export declare function pointSlots(geoms: SessionGeom[], id: number, at: 'a' | 'b' | 'c'): [number, number] | null;
export declare class SketchSession2D {
    private wasm;
    private handle;
    private geoms;
    private rules;
    /** The current parameter vector: warm start for the next solve. */
    params: Float64Array;
    /** Test-only seam: the caller has already run initSync in node and hands
     *  the initialised module in (same convention as
     *  BrepRsEngineAdapter.loadFromBytes). */
    loadFromBytes(wasmMod: any): void;
    load(): Promise<void>;
    private requireWasm;
    /** Open (or reopen) the session from rows. Replaces both rows and params;
     *  a fresh open has no warm start. Returns the refusal sentence on a bad
     *  row, or null on success. */
    open(geoms: SessionGeom[], rules: SessionRule[]): string | null;
    /** Solve at the current params (or `params` as a warm start). Returns
     *  false and lastError() when the solve refuses. */
    solve(params?: Float64Array): boolean;
    /** Drag: solve with two slots pulled toward (tx, ty). `slotA`/`slotB` come
     *  from pointSlots(). The vector this returns becomes the session's params. */
    drag(slotA: number, slotB: number, tx: number, ty: number): boolean;
    /** Diagnose at the current point: rank, DoF, bucket, blame. */
    diagnose(): Diagnosis | null;
    /** The solved profile, or { refusal } when the sketch cannot be trusted.
     *  `loops[0]` is the outline; every later loop is a hole through it. */
    profile(): {
        loops: ProfileLoop[];
    } | {
        refusal: string;
    };
    /** The last wasm-side sentence (open/solve/diagnose failures). */
    lastError(): string | null;
    /** Solved geometry readback: the rows the params describe. Rows come back
     *  in id order with the same kind fields `open` took. */
    solvedGeoms(): SessionGeom[];
    close(): void;
}
//# sourceMappingURL=sketch-session.d.ts.map