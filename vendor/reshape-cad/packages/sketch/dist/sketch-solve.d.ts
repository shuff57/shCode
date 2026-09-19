export type Point = [number, number];
export type Constraint = {
    kind: 'horizontal';
    edge: number;
} | {
    kind: 'vertical';
    edge: number;
} | {
    kind: 'length';
    edge: number;
    value: number;
} | {
    kind: 'equal';
    edge: number;
    other: number;
} | {
    kind: 'parallel';
    edge: number;
    other: number;
} | {
    kind: 'perpendicular';
    edge: number;
    other: number;
} | {
    kind: 'distanceX';
    a: number;
    b: number;
    value: number;
} | {
    kind: 'distanceY';
    a: number;
    b: number;
    value: number;
} | {
    kind: 'symmetric';
    a: number;
    b: number;
    center: number;
} | {
    kind: 'angle';
    edge: number;
    other: number;
    degrees: number;
} | {
    kind: 'lock';
    corner: number;
};
/** Constraints that index CORNERS, not edges. The rest of this package
 *  was written when `lock` was the only one, so it asks `kind === 'lock'`
 *  in six places and then reads `.edge` off everything else. P1d added
 *  three more corner rules, which made that the wrong question: the
 *  discriminator is not "is it a lock", it is "does it index corners".
 *  Ask THIS instead — a seventh corner rule then costs one line here
 *  rather than a hunt through two files. */
export type CornerConstraint = Extract<Constraint, {
    kind: 'lock' | 'distanceX' | 'distanceY' | 'symmetric';
}>;
export type EdgeConstraint = Exclude<Constraint, CornerConstraint>;
export declare function indexesCorners(c: Constraint): c is CornerConstraint;
/** Every corner this rule names, for the remap/filter sites. */
export declare function cornersOf(c: CornerConstraint): number[];
export interface SolveResult {
    points: Point[];
    /** Largest remaining violation, in sketch units. */
    residual: number;
    iterations: number;
    /** True when the constraints could not all be met at once. */
    overConstrained: boolean;
}
/** Edge n runs from corner n to corner n+1, wrapping at the end. */
export declare function edgeCorners(n: number, count: number): [number, number];
export declare function edgeLength(pts: Point[], n: number): number;
/**
 * @param pinned corners the solver may not move — the one being dragged, plus
 *   any locked by a constraint. Without this a drag fights the solver: the
 *   corner under the pointer gets pulled back by whatever it is constrained to.
 */
export declare function solveSketch(input: Point[], constraints: Constraint[], pinned?: Iterable<number>): SolveResult;
/** How far each constraint is from being satisfied, parallel to `constraints`.
 *
 *  Every entry is a DISTANCE, so the numbers are comparable across kinds and
 *  one tolerance means the same thing for all of them. A `lock` reports 0: it
 *  pins a corner rather than asserting anything that can be off.
 *
 *  This is what lets the panel say WHICH rules disagree instead of only that
 *  some do. Once relaxation has settled, a constraint still carrying error is
 *  one the others outvoted -- that is the culprit set, and naming it is the
 *  difference between "remove one to settle it" and pointing at the two that
 *  are actually fighting.
 *
 *  Collateral is possible: a third rule can be dragged off true by a conflict
 *  it is not part of, and it will appear in the set. Over-reporting is the
 *  safe direction -- every rule genuinely in the conflict is always present. */
/** `scale` turns an angle into a distance. It defaults to the sketch's own
 *  size, which is right for a reader asking "how wrong is this now" -- and
 *  wrong for a SOLVER, which must be handed the size measured once at the
 *  start. A scale recomputed from the points being solved shrinks as they do,
 *  so shrinking the whole sketch makes every angle rule look better: measured
 *  2026-09-01, the impossible triangle collapsed to a 0.00002-wide speck and
 *  reported a residual of 2e-5. Freezing the scale removes the incentive. */
export declare function residualsOf(pts: Point[], constraints: Constraint[], scaleOverride?: number): number[];
export declare function residualOf(pts: Point[], constraints: Constraint[]): number;
/**
 * True when solving moved the shape past collapsed rather than merely
 * satisfying a rule: some edge fell under 25% of its own pre-solve length,
 * or the whole outline's area fell under 25% of its pre-solve area.
 *
 * residual/overConstrained cannot see this on their own -- a rule the solver
 * satisfies by squeezing the shape to a sliver reports exactly the residual
 * a sensible answer would, because collapsing IS what satisfied it. Only
 * geometry, compared against what the shape looked like before this solve,
 * can tell the difference.
 *
 * Both edges AND area, not just one: an edge can hold its own length while
 * the whole outline still folds thin (three corners forced onto one line),
 * and the outline can hold its area while a single edge alone is squeezed
 * to nothing.
 */
export declare function collapsedByRatio(before: Point[], after: Point[]): boolean;
/**
 * The seed a freshly-added rule should be solved FROM: fewestMoversSeed for
 * a between-edges rule that is the LAST entry in `constraints` (the
 * convention every SketchConstraints.tsx handler already appends to), the
 * raw points unchanged otherwise. Shared by ModelEditor's own gate and
 * addConstraintSettling so both judge the exact same attempt.
 */
export declare function seedForNewRule(points: Point[], constraints: Constraint[]): Point[];
export declare function describe(c: Constraint): string;
/** "Edge 3 no longer has to stay level so edge 2 can. Undo puts it back." --
 *  the panel note addConstraintSettling's caller shows IN PLACE OF the red
 *  conflict banner, when settling the new rule cost an older one its place.
 *  This is the beginner-facing case working exactly as intended, so it is
 *  written as a fact about the sketch, not as news of a removal: naming a
 *  RULE ("Edge 1's across rule was removed") reads like an error even when
 *  nothing went wrong, and a blind critic read it as one (2026-09-04). "so
 *  edge N can" is left to trail off when the new rule asks the same thing of
 *  its edge as the old one did (both `horizontal`, say) -- spelling out the
 *  shared quality twice reads like the sentence forgot what it just said. */
export declare function describeRemovalNote(removed: Constraint, added: Constraint): string;
/** Same claim as describeRemovalNote() above, for the rarer case where
 *  settling the new rule cost TWO older rules, not one: "Edge 3 no longer
 *  has to stay level and edge 4 no longer has to stay upright so they can
 *  meet at a right angle. Undo puts them back." One sentence naming both,
 *  not two separate notes -- a beginner reads two rules going at once as
 *  one event (this rule needed both), not as two unrelated changes. */
export declare function describeRemovalNotePair(removed: Constraint, removedAlso: Constraint, added: Constraint): string;
export interface ConflictResolution {
    constraints: Constraint[];
    /** The older rule that had to go to make room for the new one, or null
     *  when nothing needed to -- either the new rule fit cleanly, or no
     *  removal (single or, failing that, a pair -- see `removedAlso`) would
     *  have settled it (the banner is the honest answer in that case, and
     *  `constraints` here is just `next`, unchanged, same as if this
     *  function had never been called). */
    removed: Constraint | null;
    /** A SECOND older rule that also had to go, only when `removed` alone
     *  was not enough -- see addConstraintSettling's own comment on when a
     *  between-edges rule needs two rules gone at once. Always null unless
     *  `removed` is also set. */
    removedAlso: Constraint | null;
}
/**
 * Settles a newly-added rule the way a beginner means it: `next`'s own last
 * entry is the rule they just clicked or typed (every SketchConstraints.tsx
 * handler appends there), and if the result is unsatisfiable, the fix a
 * beginner wants is not a red banner over the rule they just finished
 * setting -- it is "whichever OLDER rule is in the way, gone".
 *
 * Measured 2026-09-04: cycling "Edges 1 and 2" to equal after both edges
 * already carried fixed, different lengths (40 and 20) landed the sketch in
 * "these rules cannot all be true", garbled numbers, red banner -- for a
 * rule the student had just asked for on purpose. Solved and judged from
 * seedForNewRule()'s seed rather than the raw points, so a between-edges
 * rule gets the same fewest-movers attempt ModelEditor's own gate does --
 * settling should not have to fight a collapse the seed would have avoided.
 *
 * "Unsatisfiable" now means the geometric gate too (collapsedByRatio), not
 * only overConstrained: a between-edges rule can satisfy every residual by
 * collapsing the shape to a sliver (S09, 2026-09-04), which is exactly the
 * case this function exists to route around, not to wave through because
 * the numbers came back clean.
 *
 * Tries removing each older rule in turn -- never the one just added -- and
 * keeps the single removal that resolves it AND keeps the most of the
 * sketch's own area. Array order (oldest first) alone is not enough: S11
 * (2026-09-04) had two older rules that would each individually resolve the
 * conflict on their own, and the older of the two was the wrong one to drop
 * -- it left the sketch's UNTOUCHED bottom edge tilted, where dropping the
 * other left the edge the student was actually working on tilted instead,
 * and kept 38% of the sketch's area against the older removal's 28%. A
 * conflict that needs more than one rule gone is left alone, banner
 * included: this is a nudge for the ordinary "these two just started
 * disagreeing" case, not a general re-solver for every possible
 * contradiction (three different lengths pinned to one edge, for instance,
 * never resolves by dropping any single one of them, and must not pretend
 * to by cascading through a second removal).
 */
export declare function addConstraintSettling(points: Point[], next: Constraint[]): ConflictResolution;
/** Which DESIGN EDGES are named by a constraint that is still violated after a
 *  solve -- the geometry a student should be looking at, as opposed to
 *  `residualsOf`, which names the rules.
 *
 *  Onshape's loudest conflict signal is the geometry itself turning red, and
 *  this is the set that earns it. Both edges of a pair rule are included: an
 *  `equal` that cannot be met is an argument between two edges and pointing at
 *  one of them would be picking a side arbitrarily.
 *
 *  A corner rule (`lock`, and P1d's `distanceX`/`distanceY`/`symmetric`)
 *  names corners rather than edges and never appears here. `lock` never had
 *  a residual to begin with; the other three do, but a red edge is not the
 *  claim they make -- inventing one would paint an edge the student never
 *  constrained. If a red CORNER is wanted later, that is a separate
 *  function with its own name, not a widening of this one.
 *
 *  The 1e-3 tolerance is the same one the Rules panel marks a control with, so
 *  a red edge and a red control are always the same claim. */
export declare function losingEdges(pts: Point[], constraints: Constraint[]): number[];
//# sourceMappingURL=sketch-solve.d.ts.map