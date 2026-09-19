import type { ModelDoc } from '@shuff57/reshape-script/model-types';
import type { TopoName } from '@shuff57/reshape-script/topo-name';
import type * as THREE_NS from 'three';
import type { EngineAdapter, EngineBuildResult, EngineMesh } from './engine-adapter.js';
export declare class BrepRsEngineAdapter implements EngineAdapter {
    private readonly THREE;
    private wasm;
    private loadPromise;
    constructor(THREE: typeof THREE_NS);
    load(): Promise<void>;
    /** Test-only seam: packages/kernel/test/brep-rs-engine-adapter.test.mjs
     *  loads packages/brep-rs/pkg via `initSync` in node (no fetch there), then
     *  hands the already-initialised module in. Not part of EngineAdapter. */
    loadFromBytes(wasmMod: any): void;
    private requireWasm;
    build(doc: ModelDoc): EngineBuildResult;
    mesh(shape: unknown, opts?: {
        deflection?: number;
    }): EngineMesh | null;
    edges(shape: unknown): Array<{
        edge: unknown;
        geometry: THREE_NS.BufferGeometry;
    }>;
    faceAt(shape: unknown, index: number): unknown | null;
    resolveFace(name: TopoName, build: EngineBuildResult): unknown | null;
    resolveEdge(name: TopoName, build: EngineBuildResult): unknown | null;
    nameFace(build: EngineBuildResult, doc: ModelDoc, pickedFeature: string, face: unknown): TopoName | null;
    nameEdge(_build: EngineBuildResult, doc: ModelDoc, pickedFeature: string, edge: unknown): TopoName | null;
    faceSize(face: unknown): [number, number] | null;
    edgeLength(edge: unknown): number | null;
}
//# sourceMappingURL=brep-rs-engine-adapter.d.ts.map