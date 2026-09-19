import type { Feature, ModelDoc } from './model-types.js';
/** One shape (and, optionally, some of its fields) a `model` requirement
 *  expects to find in the student's ModelDoc. Only the named fields are
 *  checked — see the file header. */
export type ModelExpect = {
    kind: Feature['kind'];
    [field: string]: unknown;
};
export type ModelCheckResult = {
    passed: boolean;
    /** `expect` entries that found no matching feature, in the order given. */
    missing: ModelExpect[];
    /** One plain sentence for the student, naming the first missing entry.
     *  Empty when `passed`. */
    message: string;
};
/** A plain-English name for a feature (real or hoped-for), built from
 *  whichever named fields `get` can answer. Shared by the "expected" and
 *  "found" halves of a failure message — see checkModel(). */
/** The word the course uses for a feature kind: the module brief replaced
 *  "fillet" and "shell" with round and hollow, and a failure message is
 *  read by a beginner who has only ever seen the course's words. */
export declare function studentWord(kind: string, style?: unknown): string;
/** Feature ids the kernel could not build, with its reason for each --
 *  BuildResult.refusals (lib/occt-build.ts) flattened to a plain object so it
 *  crosses the grading boundary as JSON. A refused feature is in the doc but
 *  not in the shape ("Rounding Round 1 at 3 would not fit its edge, shown
 *  without it"), so for grading it does not exist: the moderate lens passed
 *  8.1.11 with a sharp corner and a declared Round, 2026-09-04. */
export type Refusals = Readonly<Record<string, string>>;
export declare function checkModel(req: {
    expect?: ModelExpect[];
    tolerance?: number;
}, doc: ModelDoc | null, refusals?: Refusals | null): ModelCheckResult;
//# sourceMappingURL=model-check.d.ts.map