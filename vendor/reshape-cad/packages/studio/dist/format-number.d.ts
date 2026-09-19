/**
 * Round to two decimal places for display, trimming trailing zeros
 * (40.00 -> "40", 22.50 -> "22.5") and never printing a negative zero
 * (rounding a tiny negative float that is really zero must not read as
 * "-0", which looks like a real, different number to a beginner).
 */
export declare function displayNumber(n: number): string;
//# sourceMappingURL=format-number.d.ts.map