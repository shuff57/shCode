export interface ValueBoxProps {
    /** What the box shows right now: the typed draft, or the formatted
     *  committed value while untouched. Parent-owned. */
    value: string;
    onChange: (next: string) => void;
    /** Enter. Receives the raw text; the caller parses and refuses there,
     *  in a sentence, exactly as the sketch chips always have. */
    onCommit: () => void;
    /** Escape: drop the pending edit with no doc change. */
    onCancel: () => void;
    /** Anchor: CSS px inside the nearest positioned ancestor, top-left.
     *  The chip is centred on this point (translate(-50%,-50%)), the same
     *  convention chipAt()/worldToScreen handed the sketch chips. */
    x: number;
    y: number;
    /** data-* marker the Playwright scenarios key on (e.g. "dim-pending",
     *  "fillet-pending" -- and now "manipulator-value"). */
    testId: string;
    /** Optional extra chip text rendered under data-editing, for tests. */
    kind?: string;
    className?: string;
}
/** The chip itself. Not a text field with a label around it: the whole
 *  interaction is one input, and the styling below matches
 *  .sk2d-dim-chip's, so the sketch flow and this look like one family. */
export default function ValueBox({ value, onChange, onCommit, onCancel, x, y, testId, kind, className, }: ValueBoxProps): import("react/jsx-runtime").JSX.Element;
/** A dimension-like value as the box shows it at rest: full float
 *  precision would print 39.99999999 for a 40 a solver produced. Same
 *  rounding formatDim() used in SketchCanvas2D; hoisted here because the
 *  3D value box needs it too and a second copy there would be the drift
 *  this file exists to prevent. */
export declare function formatValue(v: number): string;
//# sourceMappingURL=ValueBox.d.ts.map