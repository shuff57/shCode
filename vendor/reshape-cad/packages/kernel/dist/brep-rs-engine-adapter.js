// packages/kernel/src/brep-rs-engine-adapter.ts
//
// A third EngineAdapter, backed by the brep-rs wasm kernel (SPEC-brep-kernel-rs).
// A thin forward to the wasm exports -- no OCCT/topo-resolve logic is copied
// here; naming/measurement answers come back over the same JSON contracts the
// parity gate already pins (docs/specs/SPEC-brep-engine-adapter.md).
//
// Shape handles are plain objects THIS adapter owns: `{ doc, feature }` for a
// solid, `{ doc, feature, index }` for a face or edge -- `doc` being the exact
// ModelDoc JSON string the build ran on. Every method just passes that doc
// string back into the wasm export, where a single-entry thread_local cache
// (wasm.rs's LAST_DOC/LAST_HIST) keeps repeated calls from rebuilding.
//
// `THREE` is constructor-injected rather than statically imported, so three
// stays a peer dependency this package never hard-imports at runtime.
import { getKernelBaseUrl } from './config.js';
/** Which import strategy actually worked, set once on the first successful
 *  load. Purely diagnostic: the two-strategy fallback exists because a
 *  bundler that rewrites a runtime-computed import() breaks the URL load,
 *  and new Function is the escape hatch that is never rewritten. */
let kernelImportStrategy = null;
async function dynamicImportKernel(url) {
    if (kernelImportStrategy === 'new-function') {
        return new Function('u', 'return import(u)')(url);
    }
    try {
        const mod = await import(/* webpackIgnore: true */ url);
        kernelImportStrategy = 'webpackIgnore';
        return mod;
    }
    catch {
        const mod = await new Function('u', 'return import(u)')(url);
        kernelImportStrategy = 'new-function';
        return mod;
    }
}
/** The one wasm module, shared by every BrepRsEngineAdapter instance -- the
 *  same module-level-once discipline BrepViewportThree.tsx's enginePromise
 *  follows, because two viewports in one session must not fetch the wasm
 *  twice. */
let wasmPromise = null;
async function loadWasm() {
    if (!wasmPromise) {
        wasmPromise = (async () => {
            const base = getKernelBaseUrl();
            const mod = await dynamicImportKernel(`${base}/brep-rs/brep_rs.js`);
            await mod.default(`${base}/brep-rs/brep_rs_bg.wasm`);
            return mod;
        })();
    }
    return wasmPromise;
}
const round2 = (n) => Math.round(n * 100) / 100;
export class BrepRsEngineAdapter {
    THREE;
    wasm = null;
    loadPromise = null;
    constructor(THREE) {
        this.THREE = THREE;
    }
    async load() {
        if (this.wasm)
            return;
        if (!this.loadPromise) {
            this.loadPromise = (async () => {
                this.wasm = await loadWasm();
            })();
        }
        return this.loadPromise;
    }
    /** Test-only seam: packages/kernel/test/brep-rs-engine-adapter.test.mjs
     *  loads packages/brep-rs/pkg via `initSync` in node (no fetch there), then
     *  hands the already-initialised module in. Not part of EngineAdapter. */
    loadFromBytes(wasmMod) {
        // initSync has already run against the pkg module in the test process;
        // hand the namespace in and mark load() complete so requireWasm() passes.
        this.wasm = wasmMod;
        this.loadPromise = Promise.resolve();
    }
    requireWasm() {
        if (!this.wasm)
            throw new Error('BrepRsEngineAdapter: load() has not completed');
        return this.wasm;
    }
    build(doc) {
        const wasm = this.requireWasm();
        const docJson = JSON.stringify(doc);
        const out = JSON.parse(wasm.build_doc_json(docJson));
        const shapes = new Map();
        for (const id of out.built) {
            shapes.set(id, { doc: docJson, feature: id });
        }
        const refusals = new Map();
        for (const [id, reason] of Object.entries(out.refusals ?? {})) {
            refusals.set(id, typeof reason === 'string' ? reason : JSON.stringify(reason));
        }
        return { shapes, refusals };
    }
    mesh(shape, opts) {
        const wasm = this.requireWasm();
        const part = shape;
        if (!part || typeof part.doc !== 'string')
            return null;
        const deflection = opts?.deflection ?? 0.05;
        const raw = wasm.mesh_feature(part.doc, part.feature, deflection);
        let m;
        try {
            m = JSON.parse(raw);
        }
        catch {
            return null;
        }
        if (!m || typeof m.error === 'string')
            return null;
        const positions = new Float32Array(m.positions);
        const indices = m.indices;
        if (!indices || indices.length === 0)
            return null;
        const geometry = new this.THREE.BufferGeometry();
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const faces = [];
        for (let i = 0; i < m.faces.length; i++) {
            const f = m.faces[i];
            faces.push({ index: i, start: f.start, count: f.count });
            geometry.addGroup(f.start, f.count, 0);
        }
        return { geometry, faces };
    }
    edges(shape) {
        const wasm = this.requireWasm();
        const part = shape;
        if (!part || typeof part.doc !== 'string')
            return [];
        const raw = wasm.mesh_feature(part.doc, part.feature, 0.05);
        let m;
        try {
            m = JSON.parse(raw);
        }
        catch {
            return [];
        }
        if (!m || typeof m.error === 'string')
            return [];
        const out = [];
        // One BufferGeometry of line segments per polyline -- mesh_feature's
        // `edges` field is one flat [x,y,z,...] polyline per topological edge,
        // in the SAME edges() order face/edge indices refer to.
        const edges = (m.edges ?? []);
        for (let i = 0; i < edges.length; i++) {
            const flat = edges[i];
            if (!flat || flat.length < 6)
                continue;
            // flat is a polyline: consecutive points, so line segments pair
            // point k with point k+1.
            const segs = [];
            for (let k = 0; k + 5 < flat.length; k += 3) {
                segs.push(flat[k], flat[k + 1], flat[k + 2], flat[k + 3], flat[k + 4], flat[k + 5]);
            }
            if (segs.length === 0)
                continue;
            const geometry = new this.THREE.BufferGeometry();
            geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(new Float32Array(segs), 3));
            out.push({ edge: { doc: part.doc, feature: part.feature, index: i }, geometry });
        }
        return out;
    }
    faceAt(shape, index) {
        const wasm = this.requireWasm();
        const part = shape;
        if (!part || typeof part.doc !== 'string')
            return null;
        const raw = wasm.mesh_feature(part.doc, part.feature, 0.05);
        let m;
        try {
            m = JSON.parse(raw);
        }
        catch {
            return null;
        }
        if (!m || typeof m.error === 'string')
            return null;
        const faces = (m.faces ?? []);
        // Same contract as facesOf(): the index counts ALL faces of the shape in
        // mesh order; out of range is a real null, not an error.
        if (index < 0 || index >= faces.length)
            return null;
        return { doc: part.doc, feature: part.feature, index };
    }
    resolveFace(name, build) {
        const wasm = this.requireWasm();
        // Rebuild the doc the build came from: the adapter's handles carry the
        // exact doc string, but a TopoName only names a feature -- so rebuild via
        // resolve()'s enrichment to get its faceIndex.
        const docJson = docOf(build);
        if (!docJson)
            return null;
        const raw = wasm.resolve(docJson, JSON.stringify(name));
        if (raw === 'null')
            return null;
        let r;
        try {
            r = JSON.parse(raw);
        }
        catch {
            return null;
        }
        if (!r || r.kind !== 'face' || typeof r.faceIndex !== 'number')
            return null;
        const feature = typeof r.feature === 'string' ? r.feature : name.feature;
        if (!feature)
            return null;
        return { doc: docJson, feature, index: r.faceIndex };
    }
    resolveEdge(name, build) {
        const wasm = this.requireWasm();
        const docJson = docOf(build);
        if (!docJson)
            return null;
        const raw = wasm.resolve(docJson, JSON.stringify(name));
        if (raw === 'null')
            return null;
        let r;
        try {
            r = JSON.parse(raw);
        }
        catch {
            return null;
        }
        if (!r || r.kind !== 'edge' || typeof r.edgeIndex !== 'number')
            return null;
        const feature = typeof r.feature === 'string' ? r.feature : name.feature;
        if (!feature)
            return null;
        return { doc: docJson, feature, index: r.edgeIndex };
    }
    nameFace(build, doc, pickedFeature, face) {
        const wasm = this.requireWasm();
        const part = face;
        if (!part || typeof part.index !== 'number')
            return null;
        const raw = wasm.name_face(JSON.stringify(doc), pickedFeature, part.index);
        if (raw === 'null')
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    nameEdge(_build, doc, pickedFeature, edge) {
        const wasm = this.requireWasm();
        const part = edge;
        if (!part || typeof part.index !== 'number')
            return null;
        // wasm's name_edge builds the `between` cause from the edge's two adjacent
        // faces and returns "null" when either face has no name cause (a bore wall
        // on a boolean result, for instance) -- a real null, not an error.
        const raw = wasm.name_edge(JSON.stringify(doc), pickedFeature, part.index);
        if (raw === 'null')
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    faceSize(face) {
        const wasm = this.requireWasm();
        const part = face;
        if (!part || typeof part.doc !== 'string' || typeof part.index !== 'number')
            return null;
        const raw = wasm.face_size(part.doc, part.feature, part.index);
        if (raw === 'null')
            return null;
        try {
            const wh = JSON.parse(raw);
            if (Array.isArray(wh) && wh.length === 2)
                return [wh[0], wh[1]];
        }
        catch {
            return null;
        }
        return null;
    }
    edgeLength(edge) {
        const wasm = this.requireWasm();
        const part = edge;
        if (!part || typeof part.doc !== 'string' || typeof part.index !== 'number')
            return null;
        const raw = wasm.edge_length(part.doc, part.feature, part.index);
        if (raw === 'null')
            return null;
        const len = Number(raw);
        return Number.isFinite(len) && len > 0 ? round2(len) : null;
    }
}
/** The exact doc JSON one of this adapter's builds ran on. Handles carry it,
 *  but an EngineBuildResult arriving from a FRESH doc build carries nothing
 *  -- resolveFace/resolveEdge recover it from the build's own shape handle
 *  (the doc string every handle embeds). */
function docOf(build) {
    for (const shape of build.shapes.values()) {
        const p = shape;
        if (p && typeof p.doc === 'string')
            return p.doc;
    }
    return null;
}
//# sourceMappingURL=brep-rs-engine-adapter.js.map