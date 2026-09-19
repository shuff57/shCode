import { type ModelDoc } from './model-types.js';
/** Just enough of lib/reshape-script.ts's NamedParamDef for this file to read
 *  -- a type-only import of the real one would work too, but this file has
 *  no other reason to depend on the interpreter, and duplicating a three-line
 *  shape here keeps it that way. Keep in sync with NamedParamDef by hand;
 *  scripts/test-reshape-script.mjs's round-trip checks catch a drift that
 *  breaks anything real. */
export interface ScriptParamRef {
    name: string;
    caption: string;
    value: number;
    min: number;
    max: number;
    step: number;
    slots: string[];
}
export declare function toScript(doc: ModelDoc, namedParams?: readonly ScriptParamRef[]): string;
//# sourceMappingURL=reshape-script-gen.d.ts.map