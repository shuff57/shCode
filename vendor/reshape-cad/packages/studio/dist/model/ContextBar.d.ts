export interface ContextBarAction {
    label: string;
    /** Tooltip, e.g. the full sentence the toolbar button shows. */
    title?: string;
    /** The underline-accent verb, e.g. the ✎Dimensions focus action. */
    primary?: boolean;
    onRun: () => void;
}
interface Props {
    /** Feature kind word, for callers that style per-kind; v1 renders `name` only. */
    featureKind: string;
    /** Display name, e.g. "Pocket 1" -- doubles as the toolbar's aria-label. */
    name: string;
    /** Screen point to float above, in the offset parent's coordinates. Null hides the bar. */
    anchor: {
        x: number;
        y: number;
    } | null;
    /** Mono readouts, e.g. { label: 'depth', value: '12 mm' }. */
    chips: {
        label: string;
        value: string;
    }[];
    /** Why an action cannot run, shown inline in the danger colour. */
    refusal: string | null;
    actions: ContextBarAction[];
    onDismiss: () => void;
    /** Escape tiering: return false when something else (the sketch draw tool,
     *  the selection strip) owns Escape for this keypress, so one press does
     *  not clear both. Absent means the bar may always dismiss itself. */
    canDismiss?: () => boolean;
    /** Viewport width for horizontal clamping; absent means no clamp (v1). */
    viewWidth?: number;
}
export default function ContextBar({ featureKind: _featureKind, name, anchor, chips, refusal, actions, onDismiss, canDismiss, viewWidth, }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ContextBar.d.ts.map