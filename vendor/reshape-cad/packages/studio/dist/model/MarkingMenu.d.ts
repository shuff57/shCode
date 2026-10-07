import { type MarkingMenuMode, type SketchSelectionEntry } from './marking-menu-core.js';
export interface MarkingMenuProps {
    x: number;
    y: number;
    mode: MarkingMenuMode;
    /** Sketch-mode selection, as geometry kinds (validSketchConstraints()'s own
     *  input shape) -- ignored in part-viewport mode. Absent/empty means every
     *  selection-gated constraint wedge renders disabled. */
    selection?: SketchSelectionEntry[];
    onCommand: (id: string) => void;
    onClose: () => void;
}
export default function MarkingMenu({ x, y, mode, selection, onCommand, onClose }: MarkingMenuProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MarkingMenu.d.ts.map