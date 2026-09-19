import { type Feature, type ModelDoc } from './model-types.js';
import type { TopoName } from './topo-name.js';
export interface ParamDef {
    name: string;
    caption: string;
    value: number;
    min: number;
    max: number;
    step: number;
}
export interface ScriptError {
    message: string;
    /** 1-based line inside the student's own source, or null when no line
     *  could be recovered (a bare SyntaxError has no useful stack -- see
     *  lineOf()'s own comment). */
    line: number | null;
}
/**
 * A param() the script named, alongside every doc slot (pname() keys) its
 * value fed -- what toScript(doc, namedParams) needs to regenerate
 * `const wall = param('wall', 2, { min: 0.5, max: 10 })` once and reference
 * the same variable at every place it was used, instead of the name and
 * bounds being lost to a literal the moment the doc round-trips through
 * Build (see reshape-script-gen.ts's own header). `slots` is USUALLY one
 * entry (the common `hollow(b, { wall })` case); it can be more than one if
 * the same variable is read into more than one call (`const s = param(...);
 * box(s, s, s)`), in which case every slot gets the same substitution, even
 * though today's per-slot Dimensions panel still shows one row per slot --
 * see the file-level design-decision note at the bottom of this file.
 */
export interface NamedParamDef extends ParamDef {
    slots: string[];
}
export interface RunResult {
    doc: ModelDoc;
    /** Panel-facing, keyed the same way generatedParams() already keys a
     *  Build-mode slider (`pname(featureId, slot)`) -- unchanged shape from
     *  before NamedParamDef existed, so nothing that already reads this array
     *  needs to change. */
    params: ParamDef[];
    /** Every param() the script declared, keyed by ITS OWN name -- see
     *  NamedParamDef's own comment. Empty when the script named nothing. */
    namedParams: NamedParamDef[];
    errors: ScriptError[];
    /**
     * A rule call (.equal(), .pin(), ...) that never halts the script -- see
     * applyConstraint()'s own comment. Populated only when a freshly-added
     * sketch rule could not be cleanly settled by dropping one older rule and
     * is left in the constraint list still fighting, same as a live Rules
     * panel conflict. Empty on every script that never touches a rule, or
     * whose rules all settle. Optional so nothing that destructures RunResult
     * before this field existed has to change.
     */
    warnings?: string[];
}
/**
 * Every top-level name a reSHape script can call, in the exact order
 * runScript() installs them -- the single source of truth for "what is the
 * DSL", read by scripts/test-reshape-docs.mjs's COVERAGE and DRIFT groups so
 * they measure documentation coverage against what this file actually
 * implements rather than a hand-maintained list that can fall out of step
 * with it. `runScript()`'s own `globals` object below is built FROM this
 * array (`Object.fromEntries(VOCABULARY.map(...))`) rather than the other
 * way around, so the two cannot drift apart.
 */
export declare const VOCABULARY: readonly ["box", "cylinder", "sphere", "cone", "ring", "prism", "wedge", "groove", "pocket", "hole", "holes", "hollow", "round", "bevel", "repeat", "repeatAround", "mirror", "move", "turn", "join", "cut", "keep", "draft", "sketch", "pull", "spin", "blend", "param", "cuboid", "torus", "fillet", "chamfer", "shell", "subtract", "union", "intersect", "linearPattern", "polarPattern", "extrude", "revolve", "loft"];
export interface RunOptions {
    /** Values keyed exactly like generatedParams()'s own `name` field
     *  (`${featureId}_${slot}`, see pname() in lib/model-codegen.ts) -- the
     *  SAME key a Build-mode slider drag already uses. Applied with
     *  applyParam() after the script has built its doc from its own literal
     *  defaults; a script's own control flow (an `if` gated on a param())
     *  therefore still runs the branch its LITERAL default picked, even while
     *  a drag is live. That is a real, deliberate simplification over "re-run
     *  the whole script with the value substituted in", which would let a
     *  dragged param() reshape which STEPS exist, not just their numbers --
     *  see the file-level design-decision note at the bottom of this file. */
    values?: Record<string, number>;
}
export type FaceWord = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'side';
export interface SolidHandle {
    readonly __reshapeHandle: true;
    id: string;
    readonly rootId: string;
    readonly rootKind: 'box' | 'cylinder' | 'other';
    kind: Feature['kind'];
    face(word: FaceWord): TopoRef;
    edge(a: FaceWord, b: FaceWord): TopoRef;
}
/** A .face()/.edge() result. Carries the owning handle alongside the name so
 *  round()/bevel()/draft() can read (and mutate) the shape the name belongs
 *  to, not just the name itself -- see FilletFeature's own doc comment on why
 *  `target` and `edge`'s root can be different features. */
export interface TopoRef {
    readonly __reshapeTopoRef: true;
    owner: SolidHandle;
    name: TopoName;
}
export interface SketchHandle {
    readonly __reshapeSketch: true;
    id: string;
    rect(w: unknown, h: unknown, opts?: unknown): SketchHandle;
    circle(d: unknown, opts?: unknown): SketchHandle;
    polygon(points: unknown): SketchHandle;
    round(corner: unknown, radius: unknown): SketchHandle;
    chamfer(corner: unknown, distance: unknown): SketchHandle;
    across(edge: unknown): SketchHandle;
    up(edge: unknown): SketchHandle;
    length(edge: unknown, value: unknown): SketchHandle;
    equal(edge: unknown, other: unknown): SketchHandle;
    parallel(edge: unknown, other: unknown): SketchHandle;
    perpendicular(edge: unknown, other: unknown): SketchHandle;
    pin(corner: unknown): SketchHandle;
    distX(a: unknown, b: unknown, value: unknown): SketchHandle;
    distY(a: unknown, b: unknown, value: unknown): SketchHandle;
    symmetric(a: unknown, b: unknown, center: unknown): SketchHandle;
    angle(edge: unknown, other: unknown, degrees: unknown): SketchHandle;
    geom(rows: unknown): SketchHandle;
    rules(rows: unknown): SketchHandle;
}
export declare function runScript(source: string, opts?: RunOptions): RunResult;
//# sourceMappingURL=reshape-script.d.ts.map