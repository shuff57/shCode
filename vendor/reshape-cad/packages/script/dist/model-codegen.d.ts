import { type ModelDoc } from './model-types.js';
export interface GeneratedParam {
    name: string;
    caption: string;
    value: number;
    min: number;
    max: number;
    step: number;
}
/** Param names must survive an edit, or pushing values into a live frame
 *  would land on the wrong slot. Keyed by feature id, never by position.
 *  Exported so lib/reshape-script.ts can correlate a script's own `param()`
 *  name with the exact doc slot it lands in, using the identical key format
 *  generatedParams() below already uses -- two different producers of the
 *  same panel row must agree on its key, or a slider drawn from one and a
 *  value pushed by the other silently miss each other. */
export declare function pname(id: string, slot: string): string;
/** Every numeric slot in the doc, in panel order. */
export declare function generatedParams(doc: ModelDoc): GeneratedParam[];
/** Live values keyed by generated param name — what gets posted to the frame. */
export declare function paramValues(doc: ModelDoc): Record<string, number>;
/**
 * Write a value the panel produced back into the doc.
 *
 * The panel talks in generated names (`b1_width`), the doc in fields. Without
 * this the two drift the moment a dimension is typed: the frame would show one
 * model and the generated code would still say another.
 */
export declare function applyParam(doc: ModelDoc, name: string, value: number): ModelDoc;
/**
 * Make every constrained sketch in a doc obey its own rules.
 *
 * Applied wherever a doc is adopted, so "the points satisfy the constraints as
 * far as they can" is an invariant of the doc rather than something each caller
 * has to remember. Solving at the call site instead meant a caller holding a
 * stale copy could solve the wrong points and write the result back -- which is
 * exactly how a typed corner value went missing the moment a rule was applied.
 */
export declare function solveDoc(doc: ModelDoc): ModelDoc;
/**
 * Run a corner change past the sketch's constraints.
 *
 * Returns every corner parameter the solver ended up moving, not just the one
 * that was dragged — a constrained edge moves its far end too, and the frame
 * has to be told about both or the model and the outline disagree.
 *
 * The dragged corners are pinned, so the solver moves everything else to meet
 * them. Without that the pointer fights the constraint and the corner crawls.
 */
export declare function solveSketchDrag(doc: ModelDoc, changed: Record<string, number>): Record<string, number>;
//# sourceMappingURL=model-codegen.d.ts.map