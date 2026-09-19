import type { ModelDoc } from './model-types.js';
/**
 * Every feature that could not be built if `ids` were removed -- the ids
 * themselves plus everything that leans on them, however far down the chain.
 *
 * A Pull leans on its sketch, a Hole on the Pull, a Cut on the Hole. Removing
 * the sketch takes all four, and it has to be computed rather than assumed:
 * checking one level deep leaves the Hole pointing at a Pull that is also gone.
 *
 * Run to a fixed point rather than in one forward pass. A doc loaded from disk
 * is not guaranteed to be in dependency order -- the timeline enforces that on
 * reorder, but nothing enforces it on load -- and a single pass over an
 * out-of-order doc would miss the features it had already walked past.
 */
export declare function orphanedBy(doc: ModelDoc, ids: string[]): Set<string>;
/**
 * What deleting `ids` would take with it, phrased for a student, or null when
 * nothing else is lost.
 *
 * `label` turns a feature id into the name on its timeline row, so the sentence
 * names the thing the student clicked rather than `pull1`.
 *
 * A combine that loses one of three inputs is reported as lost along with the
 * rest. That is what the delete path has always done and it is the predictable
 * reading -- "this Cut was made from those two shapes" -- even though the
 * builder would tolerate carrying on with the survivors. Changing it is a
 * product decision, not a bug fix, so it is left as it stands and written down
 * here rather than quietly altered.
 */
export declare function whyDeletingCosts(doc: ModelDoc, ids: string[], label: (id: string) => string): string | null;
/** One reference that names a feature the document does not contain. */
export interface DanglingRef {
    /** The feature holding the broken reference. */
    feature: string;
    /** The id it names, which is not in the document. */
    missing: string;
}
/**
 * Every reference in the document that names a feature that is not there.
 *
 * This should always come back empty. It is an invariant, not a diagnostic:
 * a doc that fails it generates source referring to an undeclared variable, and
 * the preview dies with a ReferenceError rather than a sentence. Held as a
 * function so the delete path, a load, and the test gate can all ask the same
 * question the same way.
 *
 * Face-level selections are covered too, now that Round and Draft carry one.
 * dependsOn() folds in every feature id a TopoName passes through (see
 * topoRefs in lib/model-types.ts), so a Round whose edge names a deleted box is
 * reported here exactly like a Pull whose sketch is gone -- and cascaded by
 * orphanedBy() for the same reason, without either function knowing what a
 * TopoName is.
 */
export declare function danglingRefs(doc: ModelDoc): DanglingRef[];
/**
 * The document with `ids` and everything that leans on them removed.
 *
 * The delete path's whole job, in one place, so that the panel does the asking
 * and this does the arithmetic. Feature order is preserved: the timeline is the
 * student's mental model of what happens in what order, and reshuffling it
 * during a delete would be a second, invisible edit.
 */
export declare function withoutFeatures(doc: ModelDoc, ids: string[]): ModelDoc;
//# sourceMappingURL=model-deps.d.ts.map