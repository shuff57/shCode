import { type ModelDoc, type RoundStyle, type SketchPlane } from '@shuff57/reshape-script/model-types';
import { type TopoName } from '@shuff57/reshape-script/topo-name';
interface Props {
    doc: ModelDoc;
    onChange: (next: ModelDoc) => void;
    /** Lifted so the preview knows whose drag handles to draw. */
    selected: string[];
    onSelect: (ids: string[]) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    /** Bumped by the caller on every Undo/Redo, whichever way it was
     *  triggered -- the toolbar button here, or the Ctrl+Z/Ctrl+Shift+Z
     *  shortcut, which the caller owns and this component never sees
     *  directly. Clears the info banner below on change (see its own
     *  effect): an Undo that puts a curved edge back to straight left the
     *  banner still claiming it curves (EXPLORE-2d, 2026-09-04), because
     *  nothing told this component the doc it is reading just moved a step
     *  in time rather than forward from a fresh edit. */
    historyGen?: number;
    /** When set, the panel breaks down to a thin preview bar and back. Used by
     *  the sandbox's Build mode, where the canvas owns the window and the tools
     *  are a sidebar the student can hide to look at the shape. The state lives
     *  here — inside the editor — rather than in the sandbox, so the shape
     *  toolbar's own strip is the only control that moves it. */
    collapsible?: boolean;
    /** Mirrors the collapsed state up, so the sandbox can dress its shell
     *  (the floating panel must turn transparent when the strip is all that
     *  is left of it, or a 420px card sits over the canvas). */
    onCollapsed?: (collapsed: boolean) => void;
    /** Mirrors whether the card holds anything (a note or the sketch rules).
     *  The feature list lives in the bottom timeline now, so an empty card is
     *  hidden entirely rather than sitting over the canvas as a click-eater. */
    onContentChange?: (hasContent: boolean) => void;
    /** Rollback bar boundary (0..features.length): features at or past this
     *  index are suppressed from the rebuilt model. null means "show everything".
     *  A view change, not a structural edit -- the sandbox regenerates the live
     *  runner when this changes, without touching the doc or its history. */
    rollbackIndex?: number | null;
    /** Set the rollback boundary, or null to clear it (show the full model). */
    onRollback?: (i: number | null) => void;
    /**
     * An edge picked in the 3D viewport (BrepViewportThree's `onPick`), lifted
     * up alongside `selected` for the same reason: the pick outlives any one
     * render and the sandbox is what owns the viewport this came from.
     *
     * `edge` is null when the picked edge is real (and highlighted in the
     * viewport) but could not be turned into a TopoName -- anything past a box
     * or cylinder; see nameEdgeBetweenPrimitiveFaces() in lib/topo-resolve.ts.
     * round() below only acts on a non-null edge and otherwise falls back to
     * the whole-shape tool, same as picking nothing at all.
     */
    pickedEdge?: {
        target: string;
        edge: TopoName | null;
    } | null;
    /** Called once a picked edge has been consumed into a new FilletFeature,
     *  so the sandbox stops pinning a selection that no longer points at
     *  anything useful (its target feature is now consumed -- see topLevel()). */
    onClearPickedEdge?: () => void;
    /** The last FACE picked in the viewport, the same way pickedEdge tracks an
     *  edge -- see ShellFeature.open. `face` is null the same way pickedEdge's
     *  `edge` can be: a real pick that could not be traced back to a named
     *  primitive face (see nameFaceOnCurrentShape() in lib/topo-resolve.ts).
     *  openHollow() below only acts on a non-null face and otherwise refuses
     *  with a reason, rather than falling back to a closed hollow silently. */
    pickedFace?: {
        target: string;
        face: TopoName | null;
    } | null;
    /** Called once a picked face has been consumed into a new open ShellFeature,
     *  the same reason onClearPickedEdge exists. */
    onClearPickedFace?: () => void;
    /**
     * Every edge the student has Shift-added to the selection (item E), most
     * recent last -- purely additive over `pickedEdge` above, which keeps
     * meaning "the most recent pick" for every consumer that only ever cared
     * about one edge (the tooltip, the disabled-state message, Hole/Hollow's
     * own single-face requirement). round() below only takes the multi-edge
     * path once two or more of these resolve to the SAME solid as `chosen`;
     * otherwise it falls straight through to the single-edge/whole-shape
     * logic that already existed, unchanged.
     */
    pickedEdges?: Array<{
        target: string;
        edge: TopoName;
    }>;
    /** Called once every edge in a multi-selection has been consumed into new
     *  FilletFeatures, the same reason onClearPickedEdge exists. */
    onClearPickedEdges?: () => void;
    /** Feature id -> why that feature could not be built, from the B-rep build.
     *  A refused feature is ABSENT from the model but still present in the
     *  history, which without this marker looks like the app ignoring a click. */
    refusals?: Map<string, string>;
    /** Adoption step 4 piece B: this component's own toolbar verbs (the same
     *  remove/round/hole/... closures the ribbon buttons call), handed UP so
     *  ReshapeStudio's context bar can offer them without owning a second
     *  copy of any verb. Null on unmount/collapse of the thing being handed;
     *  the caller treats null as "no actions, omit the buttons". */
    registerContextActions?: (actions: ContextActions | null) => void;
    /** The File group's own gate -- the same condition the retired MenuBar.tsx
     *  used to compute, now read directly by the ribbon's File group instead of
     *  being handed up to a second component. */
    hasMesh: boolean;
    onExportSTL: () => void;
    onExportOBJ: () => void;
    onExport3MF: () => void;
    /** Same `canBuild` gate the retired MenuBar's Clear-model item used. */
    canClearModel: boolean;
    onClearModel: () => void;
    /** Which plane a new Sketch/Circle/Rectangle/Polygon starts on -- set by
     *  clicking a plane in this component's own Planes tree (see the
     *  `model-browser` JSX below). Lives in the caller (ReshapeStudio) since
     *  the Rectangle/Polygon draw tool's own placement handler is there too. */
    activePlane: SketchPlane;
    onActivePlaneChange: (plane: SketchPlane) => void;
    /** True while a sketch is open in the 2D constraint sketcher (ReshapeStudio's
     *  sketchEditId is set). The ribbon shows only File/Edit and a Done button
     *  while this holds, and Sketch/Circle route into 2D instead of the legacy
     *  drag-corners-in-3D flow -- the clear 2D/3D tool divide this exists for. */
    sketchMode?: boolean;
    /** Create a sketch, then hand its id to the caller to open in the 2D
     *  sketcher -- the caller owns sketchEditId (see sketchMode above). */
    onOpenSketch2D?: (id: string) => void;
    /** Leave the 2D sketcher and return to the 3D ribbon. */
    onExitSketch2D?: () => void;
}
type PatternMode = 'linear' | 'circular';
/** Adoption step 4 piece B: the toolbar's own verbs, handed up to the caller
 *  (ReshapeStudio's context bar) via registerContextActions. Each entry IS
 *  the same closure the ribbon button calls -- thin arrows, no second
 *  implementation of any verb, so a context-bar Round and a ribbon Round
 *  can never drift apart. RoundStyle/SketchPlane/PatternMode mirror the
 *  toolbar's own flyout signatures. */
export interface ContextActions {
    remove: () => void;
    moveTool: (copy: boolean) => void;
    round: (style: RoundStyle) => void;
    drillHole: () => void;
    hollow: () => void;
    pull: () => void;
    spin: () => void;
    turn: () => void;
    repeat: (mode: PatternMode) => void;
    mirror: (plane: SketchPlane) => void;
}
export default function ModelEditor({ doc, onChange, selected, onSelect, onUndo, onRedo, canUndo, canRedo, collapsible, onCollapsed, onContentChange, rollbackIndex, onRollback, pickedEdge, onClearPickedEdge, pickedFace, onClearPickedFace, pickedEdges, onClearPickedEdges, refusals, registerContextActions, historyGen, hasMesh, onExportSTL, onExportOBJ, onExport3MF, canClearModel, onClearModel, activePlane, onActivePlaneChange, sketchMode, onOpenSketch2D, onExitSketch2D, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ModelEditor.d.ts.map