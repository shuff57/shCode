/** The two recess kinds the model defines. Mutually exclusive: one mouth, one
 *  shape (SPEC-brep-feature-provenance 5.2b). */
export type RecessKind = 'counterbore' | 'countersink';
/** A hole feature, as narrowly as this module needs to read it. Structural so a
 *  missing or mistyped field is a type error rather than a silent `undefined`. */
export interface HoleLike {
    kind: string;
    id: string;
    diameter: number;
    depth: number;
    counterbore?: {
        diameter: number;
        depth: number;
    };
    countersink?: {
        diameter: number;
        angleDeg: number;
    };
}
/** Why this feature cannot take a recess, or null if it can. */
export declare function whyCannotRecess(f: {
    kind: string;
} | null | undefined): string | null;
/** The starting numbers for `kind` on `hole`.
 *
 *  Defaults are chosen so the result BUILDS. A recess that is degenerate (wider
 *  than its bore, or deeper than it) is a kernel refusal by the split pinned in
 *  slice A1 -- not a clamp -- so a default that refuses would greet a student with
 *  an error for clicking a button. `across` doubles the bore, which is the
 *  convention every measured case in this project uses (d6 bore with a d12 recess,
 *  in the spec, in the parity fixtures and in the countersink spike).
 */
export declare function recessDefaults(hole: HoleLike, kind: RecessKind): {
    diameter: number;
    angleDeg: number;
    depth?: undefined;
} | {
    diameter: number;
    depth: number;
    angleDeg?: undefined;
};
/** `hole` with `kind` set. Applying the kind a hole already has REMOVES the
 *  recess rather than setting it again -- one click adds, the same click takes
 *  it back off, which is the usual behaviour for a detail button and is the only
 *  remove path the Build toolbar would otherwise have. Switching kind drops the
 *  other one, because the model says they are mutually exclusive and leaving both
 *  set would produce a doc the kernel refuses.
 *
 *  Every click moves something, so there is no no-op to skip.
 */
export declare function withRecess<T extends HoleLike>(hole: T, kind: RecessKind): T;
//# sourceMappingURL=hole-recess.d.ts.map