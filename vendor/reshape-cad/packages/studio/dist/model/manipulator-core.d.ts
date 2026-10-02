import type { Feature, ModelDoc } from '@shuff57/reshape-script/model-types';
/**
 * Which feature kinds the Phase 5.1 manipulator covers: the ones whose
 * handle already names a single positive-extent parameter — extrude
 * (height), pocket (depth), fillet (size). A box/cylinder already carries
 * its own size handles, so they stay untouched.
 */
export declare const MANIPULATOR_KINDS: readonly ["extrude", "pocket", "fillet", "draft"];
export type ManipulatorKind = (typeof MANIPULATOR_KINDS)[number];
/**
 * The parameter a manipulator drives for a selected feature, or null when
 * the feature has no manipulator. This is the CONVERGENCE point the
 * acceptance criteria name: the value box and the drag both end in this
 * exact generated-param name (`<featureId>_<slot>`), the same one
 * generatedParams() emits and applyParam() writes back, so neither path
 * can drift from the panel's slider.
 *
 * Phase 5.1 part 2 (todo 23) rides on top: DraftFeature.angle is the
 * confirmed angle-bearing parameter (ExtrudeFeature has no taper field --
 * verified at model-types.ts:591-604 during plan review), so a draft
 * manipulator gets a secondary TAPER ARC whose visibility is driven by
 * the feature's own parameter, never a global toggle.
 */
export declare function manipulatorParam(feature: Feature): {
    kind: ManipulatorKind;
    slot: string;
    param: string;
} | null;
/** A short student-facing label for the value box (matches the captions
 *  the Dimensions panel already uses for these slots). */
export declare function manipulatorLabel(slot: string): string;
/**
 * Why this typed text cannot drive the parameter, in a sentence, or null
 * when it can. Extrude/pocket heights may not be negative (a negative
 * extent is a different feature, not this one driven backwards); a fillet
 * radius must be strictly positive. Zero is refused for all three -- every
 * zero-extent solid is degenerate. Plain non-numeric text is refused too.
 * The caller shows the sentence and writes NOTHING: a refused value must
 * not grow the undo stack (the same discipline as the sketch dimension
 * flow's dimensionValueError).
 */
export declare function manipulatorValueError(kind: ManipulatorKind, text: string): string | null;
/**
 * Current committed value of the manipulator's parameter, read off the
 * doc itself -- never off a slider cache. Returns null when the doc has
 * drifted from the selection (feature deleted mid-flight).
 */
export declare function manipulatorValue(doc: ModelDoc, param: string): number | null;
/**
 * Does THIS feature carry a taper/angle parameter? The todo's visibility
 * rule verbatim: the arc handle's presence is driven by the feature's own
 * parameter schema, not a global toggle -- a draft has one, a fillet does
 * not, and nothing else in Phase 5.1's set does.
 */
export declare function hasAngleParam(feature: Feature): boolean;
/**
 * Why this typed text cannot drive a TAPER ANGLE, in a sentence, or null
 * when it can. Degrees: |angle| < 90 (89.9 is a near-parallel wall; 90
 * exactly is degenerate), and 0 is ALLOWED -- the kernel treats a 0-degree
 * draft as identity, and "remove the taper" is a real thing a student
 * types. Same write-nothing discipline as the extent error above.
 */
export declare function angleValueError(text: string): string | null;
/**
 * Screen points along a taper ARC at an anchor: the arc of radius `r` px
 * centred on (cx,cy) from angle `fromDeg` to `toDeg` (SVG degrees, y-down,
 * the same convention MarkingMenu's wedges already use). Pure arithmetic
 * beside the SVG that draws it; the caller picks r and the sweep so the
 * arc sits beside the arrow instead of over the value box.
 */
export declare function arcPoints(cx: number, cy: number, r: number, fromDeg: number, toDeg: number, samples?: number): string;
/**
 * The live-preview tint (todo 25) for a feature kind: 'add' renders
 * blue, 'cut' renders red -- SPEC-mouse-parity.md Phase 5.3's colour
 * convention verbatim. Fillet rounds a corner (additive, it fills the
 * corner with material); draft tilts a wall (the wall leans, the
 * silhouette changes) -- the honest colour for "the shape you see is not
 * committed yet" is the ADD one for both. Null for kinds with no
 * preview claim.
 */
export declare function previewTint(kind: Feature['kind']): 'add' | 'cut' | null;
//# sourceMappingURL=manipulator-core.d.ts.map