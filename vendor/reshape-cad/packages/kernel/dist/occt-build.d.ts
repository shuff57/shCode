import type { ModelDoc } from '@shuff57/reshape-script/model-types';
/** The handful of OpenCascade entry points this adapter uses. Loose on
 *  purpose -- see the note above. */
export interface Occt {
    [name: string]: any;
}
/** A built shape, paired with the feature that produced it. Kept together
 *  because the next piece needs to ask "which feature made this face". */
export interface Built {
    id: string;
    shape: any;
}
/**
 * One boolean, kept alive after it has produced its shape.
 *
 * This is the reason buildDoc returns a record instead of a bare Map. A
 * `BRepAlgoAPI_*` object is not merely a function that returns a shape -- it
 * holds the history that says which input face became which output face, and
 * that history dies with the object. Discarding it, which this file did until
 * the naming work needed it, throws away the only thing that can carry a
 * student's selection across a rebuild.
 *
 * `inputs` is the feature ids that had gone in by the time this step ran. A
 * combine over three targets is two pairwise booleans, and a face of the third
 * target is only visible to the second of them, so the resolver needs to know
 * where in the chain to start asking.
 */
export interface OpRecord {
    op: any;
    inputs: string[];
    /** Which kind of op this is, when a caller needs to tell it apart from a
     *  plain boolean -- 'fillet' for a Round/Bevel's own builder, 'shell' for
     *  an OPEN hollow's BRepOffsetAPI_MakeThickSolid (no boolean runs on that
     *  path; see the shell branch's own comment for why its op is registered
     *  directly). Undefined for an ordinary boolean() call. See faceFate()'s
     *  own doc comment in lib/topo-history.ts for why 'shell' needs a
     *  Generated() fallback a plain boolean or fillet op never has to reach
     *  for -- the opened face itself is genuinely gone, not modified. */
    kind?: 'fillet' | 'shell';
}
/** One outline segment of a sketch, paired with the edge it became in the
 *  profile face. `role`/`index` come straight from segmentRoles() in
 *  lib/sketch-arc.ts, so a face can be named after the design edge or the
 *  rounded corner the student actually drew. */
export interface Segment {
    role: 'edge' | 'corner';
    index: number;
    edge: any;
}
/**
 * One sweep -- a pull or a spin -- kept alive after it has produced its shape,
 * for the same reason as OpRecord: the history lives in the operation object.
 *
 * `after` is the transform applied to the sweep's output afterwards, and it has
 * to be recorded because the faces the sweep generated are NOT faces of the
 * moved solid. `closed` marks a revolve that went all the way round and so has
 * no caps, which the kernel will not tell you -- see capOf().
 */
export interface SweepRecord {
    op: any;
    from: string;
    segments: Segment[];
    after: any | null;
    closed: boolean;
}
/** Everything a build produced: the shapes, and the operation history behind
 *  them, keyed by the feature that ran them. */
export interface BuildResult {
    shapes: Map<string, any>;
    ops: Map<string, OpRecord[]>;
    sweeps: Map<string, SweepRecord>;
    /**
     * Why a feature that IS in `shapes` is not what its document row asked
     * for -- a fillet whose radius did not fit, a draft angle too steep, an
     * edge or face name that no longer resolves. Keyed by the feature's own
     * id, sentence in words a student can act on.
     *
     * THIS FIELD AND THE PASS-THROUGH IT DESCRIBES ARE ONE BEHAVIOUR, NOT TWO.
     * When a fillet or draft is refused, `shape` falls back to the unmodified
     * source (`if (!shape) shape = src;`, in both branches below) rather than
     * staying null -- which is the right resting state ONLY because the
     * reason ends up here and is retrievable. Ship the pass-through without
     * ever reading this map in the UI and the result is a NEW instance of the
     * exact defect this fix removed: a feature that reports success (present,
     * geometry looks fine) and quietly is not what its document row says --
     * the document says "Round 1", the shape has no round, and nothing but
     * this map knows. The intended reader is a per-feature channel on that
     * feature's own timeline row (matching whyCannotRound and its siblings),
     * not the document-wide "Could not build this model" panel -- that panel
     * means the whole document failed, and this is the opposite case: the
     * document built fine, one feature just is not what it says. If you are
     * touching the caller that reads `built`, wire this in; do not carry the
     * pass-through forward on its own.
     *
     * Optional, and the callers inside this file's own loop that build a
     * `partial: BuildResult` to resolve a name against never set it -- none of
     * resolveName()/resolveNameAsUsedBy() read it, so there is nothing to
     * carry there. Only the RETURNED BuildResult from buildDoc() is ever
     * expected to have entries in it.
     *
     * The absence of an id here is not itself a claim that the feature built
     * cleanly -- a feature that was never reachable at all (its own target
     * missing) has no shape AND no refusal, same as before this field existed.
     * Currently covers the per-edge `fillet` feature and draft's single named
     * face. Body Draft (`draft` with `whole: true`) does NOT have this hole --
     * see the comment on that branch in buildDoc() for why. Whole-shape Round
     * on a primitive (BoxFeature/CylinderFeature's own `round`) is deliberately
     * NOT covered here and throws instead -- see roundedEdges()'s own comment
     * for why that one stays loud rather than falling back.
     */
    refusals?: Map<string, string>;
}
/** Build every feature in the document, in order, returning them by id.
 *  Anything this slice does not handle yet comes back absent rather than
 *  throwing, so a partial adapter can still be measured on what it does do. */
/** `arc` is lib/sketch-arc.ts, passed in rather than imported so this file
 *  can be compiled and measured on its own. It is the outline authority --
 *  rounds, chamfers and bows are all already derived there, correctly, by
 *  code that predates the kernel and does not know about it. */
export declare function buildDoc(oc: Occt, doc: ModelDoc, arc?: any): BuildResult;
/** Volume and bounding box, straight from the kernel. Exact for curved
 *  surfaces, which is the whole reason for this exercise. */
export declare function measureShape(oc: Occt, shape: any): {
    volume: number;
    bbox: number[][];
};
//# sourceMappingURL=occt-build.d.ts.map