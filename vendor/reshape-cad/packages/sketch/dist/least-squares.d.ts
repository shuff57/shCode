export interface LeastSquaresResult {
    /** The inputs it settled on. */
    x: number[];
    /** Largest single residual at the end, in whatever units the caller used. */
    worst: number;
    /** How many steps were accepted. */
    iterations: number;
    /** True when it stopped still carrying error above `tolerance` -- the rules
     *  cannot all hold at once, and this is the closest it could get. */
    unsatisfied: boolean;
}
export interface LeastSquaresOptions {
    /** Stop once every residual is under this. Distance units, caller's choice. */
    tolerance?: number;
    /** Hard cap on steps, so an impossible system ends rather than spins. */
    maxIterations?: number;
    /** Nudge used for the finite-difference Jacobian. Small enough to be a
     *  derivative, large enough not to be swallowed by float noise. */
    epsilon?: number;
    /** How many leading residuals are the REAL constraints. Anything past this
     *  still shapes the answer but is not judged for convergence.
     *
     *  A caller can append a weak pull toward the starting point, to prefer the
     *  smallest change among answers that are equally correct. That pull is a
     *  tie-breaker, not a rule -- and counting it in the tolerance test means the
     *  solver can never converge (the pull is nonzero whenever anything moved) so
     *  it stops early with the real rules still out. Measured 2026-09-01: rules
     *  that should have settled at 1e-9 sat at 1e-5. */
    primaryCount?: number;
}
/** Solve `A d = b` for d by Gaussian elimination with partial pivoting.
 *  Returns null when the matrix is singular to working precision -- which is
 *  not an error here: it means this step is not available, and the caller
 *  raises damping and asks again. */
export declare function solveLinear(A: number[][], b: number[]): number[] | null;
/**
 * Move `start` until `residuals(x)` is as close to all-zero as it can get.
 *
 * `residuals` must return the same number of entries every call, and they
 * should be in comparable units -- one tolerance is applied to all of them, so
 * mixing a distance with an angle makes that tolerance meaningless for both.
 */
export declare function leastSquares(start: number[], residuals: (x: number[]) => number[], options?: LeastSquaresOptions): LeastSquaresResult;
//# sourceMappingURL=least-squares.d.ts.map