import { type ModelDoc, type RoundStyle, type SketchPlane } from '@shuff57/reshape-script/model-types';
import { type SelectionState } from '../selection-model.js';
import type { RecessKind } from './hole-recess.js';
interface Props {
    doc: ModelDoc;
    onChange: (next: ModelDoc) => void;
    /** The ONE selection state, owned by ReshapeStudio and shared with the
     *  viewport (SPEC-mouse-parity.md Phase 3 item 7). It carries what used to
     *  arrive here as four separate props -- the selected feature ids plus the
     *  picked edge/face -- so a pick made in the viewport and a click made on a
     *  row below are the same state, not two copies that have to agree. Read
     *  through selection-model.ts's ops just below the destructure. */
    selection: SelectionState;
    /** Replace the selected feature ids, leaving the viewport picks alone --
     *  every `setSelected([...])` in this file. The caller owns that swap (it
     *  owns the state), so this signature is unchanged from when `selected`
     *  was its own prop. */
    onSelect: (ids: string[]) => void;
    /** Write the whole selection. Takes a next state OR an updater, the same
     *  shape React's own setState does, because several verbs here write it
     *  twice in one handler -- round() selects the new fillets, then drops the
     *  edge they consumed -- and the second write has to see the first. */
    onSelectionChange: (next: SelectionState | ((prev: SelectionState) => SelectionState)) => void;
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
    /** Double-click a timeline row (SPEC-mouse-parity.md Phase 3.6): open
     *  that feature's params panel, focused -- the caller's own per-kind
     *  "open this" action (Edit 2D for a sketch, Dimensions otherwise), the
     *  same one the context bar's own buttons already call, not a second
     *  entry point. A single click's own `pick()` below is unaffected. */
    onEditFeature?: (id: string) => void;
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
    /** Give the chosen hole a recess, or take it back off. The decision
     *  itself is pure and lives in ./hole-recess.ts; this is the closure both the
     *  context bar and repeatLast dispatch through. */
    recess: (kind: RecessKind) => void;
    hollow: () => void;
    pull: () => void;
    spin: () => void;
    turn: () => void;
    repeat: (mode: PatternMode) => void;
    mirror: (plane: SketchPlane) => void;
    /** The marking menu's Repeat wedge: re-run the LAST feature op
     *  (whatever lastPattern holds at the call). Same flow as repeat(mode)
     *  with the sticky last-used mode. */
    repeatLast: () => void;
}
export default function ModelEditor({ doc, onChange, selection, onSelect, onSelectionChange, onUndo, onRedo, canUndo, canRedo, collapsible, onCollapsed, onContentChange, rollbackIndex, onRollback, refusals, registerContextActions, historyGen, hasMesh, onExportSTL, onExportOBJ, onExport3MF, canClearModel, onClearModel, activePlane, onActivePlaneChange, sketchMode, onOpenSketch2D, onExitSketch2D, onEditFeature, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ModelEditor.d.ts.map