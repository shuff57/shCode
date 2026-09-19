/** What the B-rep kernel can do about one name. */
export type Serves = 
/** The kernel has the operation. In several cases the answer gets MORE
 *  correct, because JSCAD was measuring a tessellation. */
'exact'
/** No single call, but buildable from operations the kernel does have. */
 | 'recipe'
/** No kernel involvement at all -- arithmetic, a colour table, a font. */
 | 'ours'
/** The name exists to manage a triangle mesh. A B-rep has no mesh to
 *  manage, so the name has nothing left to do. Not refused: retired. */
 | 'moot'
/** OpenCascade has it; this wasm build does not bind it. */
 | 'unbound'
/** OpenCascade does not have it, in any build. */
 | 'absent';
export interface SurfaceName {
    name: string;
    /** The @jscad/modeling module it is exported from. */
    module: string;
    serves: Serves;
    /** How, or why not -- one sentence, carrying the number where a number
     *  decided it. */
    note: string;
    /** For recipe / unbound / absent: what has to be built, bound, or owned. */
    needs?: string;
    /**
     * The entry that carries this one's argument.
     *
     * A refusal has to be argued, and three of them inherit their whole case from
     * a sibling: scaleZ and transform hit the wall `scale` describes, hullChain
     * and hullPoints2 the one `hull` describes. Restating the evidence in each
     * would produce four paragraphs that drift apart. Naming the source instead
     * keeps one copy and makes the inheritance checkable -- the gate follows the
     * pointer and requires the target to be a refusal that really does argue at
     * length, so this can never become a chain that ends in nothing.
     */
    sameAs?: string;
    /**
     * OpenCascade exports this name is BUILT ON, whatever the verdict.
     *
     * Asserted present by scripts/test-occt-adapter.mjs. A refused name can have
     * these too, and `hull` is why the two fields are separate: sewing its
     * triangles into a solid needs BRepBuilderAPI_Sewing, which is here -- what is
     * missing is the hull algorithm itself, which is not an export at all. Writing
     * both meanings into one field made the absence check blame Sewing for hull's
     * refusal, which is how the split was found.
     */
    kernel?: string[];
    /**
     * For a `recipe`: the check in scripts/test-occt-adapter.mjs that actually
     * BUILDS it and measures the result against arithmetic.
     *
     * Every recipe here was once a sentence saying what it would be built from,
     * with nothing built -- and the presence probe does not close that, since
     * "the cited exports exist" is a long way from "they compose into the shape
     * the name promises". The suite collects the proofs it performs and checks
     * them against this field both ways: a proof named here that never ran fails,
     * and a proof that ran without any name claiming it fails too. Without that
     * the field would be decoration.
     */
    proof?: string;
    /**
     * OpenCascade exports whose ABSENCE is what refuses this name.
     *
     * Asserted absent, and that is the assertion that earns its keep: an absence
     * nobody would notice becoming false is a note, not a measurement. Bind
     * GTransform and four names stop being refused -- the suite says so on the
     * next run rather than waiting for someone to wonder.
     */
    absent?: string[];
}
/**
 * Every name the documented examples call, with a verdict each.
 *
 * Ordered by module rather than by frequency so that a reader checking one area
 * -- "what happens to the transforms?" -- finds them together.
 */
export declare const SURFACE: SurfaceName[];
/** One name's verdict, or undefined if it has never been classified. */
export declare function verdictFor(name: string): SurfaceName | undefined;
/** The verdicts that stop an example running: nothing to call, either because
 *  OpenCascade lacks it or because this build does not expose it. */
export declare const BLOCKING: Serves[];
export declare function isBlocking(s: Serves): boolean;
/**
 * Which of `names` have no path on the kernel, in SURFACE order.
 *
 * Per NAME, not per call, and that is deliberately conservative in one
 * direction: `scale([2,2,2], s)` is uniform and would build fine, but `scale` is
 * reported blocked because its general case is not. Judging per call would mean
 * deciding what an arbitrary expression evaluates to, which is exactly the kind
 * of cleverness that produces a gate nobody can trust. Over-reporting by one
 * name is the cheaper error.
 */
export declare function blockedNames(names: string[]): SurfaceName[];
/** Names with no verdict at all -- a new example calling something nobody has
 *  judged. The gate treats this as a failure rather than a default. */
export declare function unclassified(names: string[]): string[];
/**
 * Why an example cannot run on the B-rep kernel, phrased for the person who has
 * to do something about it, or null when it can.
 *
 * The two groups get different sentences on purpose: one is work we have to do,
 * the other is a line to add to a build config, and a message that blurred them
 * would send someone to write a hull when they needed to rebuild a binding list.
 */
export declare function whyNotPortable(names: string[]): string | null;
//# sourceMappingURL=script-surface.d.ts.map