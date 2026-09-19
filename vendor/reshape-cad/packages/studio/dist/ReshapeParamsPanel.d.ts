import { type ReactNode } from 'react';
export interface ParamDef {
    name: string;
    type?: string;
    caption?: string;
    initial?: unknown;
    default?: unknown;
    min?: number;
    max?: number;
    step?: number;
    values?: unknown[];
    captions?: string[];
}
export type ParamValues = Record<string, unknown>;
interface Props {
    defs: ParamDef[];
    /** Shown when `defs` is empty. The default names getParameterDefinitions(),
     *  which only makes sense in Code mode; Build mode passes its own. */
    emptyMessage?: ReactNode;
    /** A sentence about the selected step the kernel refused to build --
     *  the timeline chip only has room for a warning mark; this is where the
     *  words go. */
    notice?: string | null;
    values: ParamValues;
    onChange: (next: ParamValues) => void;
    /** End of a gesture — a whole slider drag is one undo, not sixty. */
    onCommit: () => void;
    lastMs: number | null;
    /** Why the shape on screen no longer matches the numbers, if it doesn't. */
    stale?: 'empty' | 'error' | null;
}
export default function ReshapeParamsPanel({ defs, values, onChange, onCommit, lastMs, stale, emptyMessage, notice, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ReshapeParamsPanel.d.ts.map