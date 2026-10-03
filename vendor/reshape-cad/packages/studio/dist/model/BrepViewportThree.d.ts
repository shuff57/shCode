import type { ModelDoc } from '@shuff57/reshape-script/model-types';
import { type TopoName } from '@shuff57/reshape-script/topo-name';
import type { EngineAdapter } from '@shuff57/reshape-kernel/engine-adapter';
import type { HandleSpec } from '@shuff57/reshape-script/model-handles';
import type { AnchorPoint } from './HandleOverlay.js';
import { type MeshInput } from '../mesh-export.js';
import type { SelectionFilters, SelectionItem } from '../selection-model.js';
export interface BrepViewportStats {
    buildMs: number;
    meshMs: number;
    drawMs: number;
    triangles: number;
    /** Feature id -> the sentence saying why that feature could not be built.
     *  Absent or empty means everything in the document built. Comes straight
     *  from EngineBuildResult.refusals, and with no fallback engine this is the
     *  ONLY way a refusal reaches the student -- surface it. */
    refusals?: Map<string, string>;
    /** The world-space extent of everything on screen (computeSceneBox()'s own
     *  box), rounded to 1 decimal, mm -- the same measurement Home/fit already
     *  computes. Absent when the scene is not ready or nothing is drawn, so a
     *  caller's readout can hide rather than show zeros. */
    dimsMm?: {
        x: number;
        y: number;
        z: number;
    };
}
/**
 * What a click in the viewport landed on.
 *
 * `faceIndex` is a FaceRange.index -- the face's position in the shape's own
 * face walk, stable across camera moves and rebuilds of an unchanged shape
 * (see lib/occt-three.ts) -- kept alongside `name` because it is what
 * paintFaceHighlight() re-finds the same face by, cheaper than resolving a
 * name back down to a kernel face. A face or edge's `name` is null when the
 * pick is real and gets highlighted like any other, but could not be traced
 * back to any primitive -- see nameFaceOnCurrentShape()/nameEdgeOnCurrentShape()
 * in lib/topo-resolve.ts for which faces/edges that covers and which they
 * honestly refuse. The caller can still show it was picked; it just cannot
 * build a Fillet, or an open Hollow, from it.
 *
 * `ctrlKey`/`shiftKey`/`metaKey` are read straight off the triggering
 * PointerEvent/MouseEvent at the moment of the pick (SPEC-mouse-parity.md
 * Phase 3 item 1), never a global keyboard listener -- the stopgap that
 * used to fake Shift this way is gone precisely because
 * a page-wide listener could not tell "Shift held while clicking this
 * canvas" from "Shift held while the runner iframe has focus". A pick with
 * no real triggering event (restorePicks()'s own re-emission once a name
 * resolves post-rebuild) carries all three false.
 *
 * `vertex`/`body` (SPEC-mouse-parity.md Phase 3 item 2) have no naming
 * machinery of their own -- there is no kernel concept of a stable vertex
 * or whole-body name the way a TopoName resolves a face or edge -- so
 * `name` is always `null` for them, not sometimes-null like a face/edge
 * pick whose resolution merely failed. `size` is likewise never present:
 * nothing measures a point, and a body's own size is just its owning
 * feature's, already shown elsewhere.
 */
export type ViewportPick = {
    kind: 'face';
    target: string;
    faceIndex: number;
    name: TopoName | null;
    size?: [number, number];
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
} | {
    kind: 'edge';
    target: string;
    name: TopoName | null;
    size?: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
} | {
    kind: 'vertex';
    target: string;
    name: null;
    size?: undefined;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
} | {
    kind: 'body';
    target: string;
    name: null;
    size?: undefined;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
};
interface Props {
    doc: ModelDoc;
    /** Chord tolerance in mm, passed straight to the adapter's mesh(). Left
     *  undefined to take the kernel's own default. */
    deflection?: number;
    onStats?: (s: BrepViewportStats) => void;
    /** Fired on every click that lands on the model (a face or an edge), and
     *  on a click that lands on nothing (null, clearing the selection). */
    onPick?: (pick: ViewportPick | null) => void;
    /**
     * The edge selection to keep highlighted, LIFTED rather than kept as
     * internal state, because this component cannot keep it on its own: every
     * doc change throws away every mesh and rebuilds from zero (see the file
     * header), so "the edge the student picked" has to survive as a NAME, not
     * an object reference. Re-resolved against the fresh shape on every
     * rebuild via resolveName() -- the same mechanism a real FilletFeature
     * resolves against. Absent or null both mean nothing is pinned; a face
     * selection has no equivalent prop because nothing outside this component
     * consumes one yet (see the header).
     */
    pick?: {
        target: string;
        name: TopoName;
    } | null;
    /**
     * How many shapes are currently selected in the model tree (ModelEditor's
     * own `selected` array, lifted here purely for display) -- rendered as a
     * small "N Selected" badge over the canvas.
     *
     * Cheap, and worth stealing: Chili3D (chili3d.com), the OCCT-in-WASM +
     * three.js reference this viewport is measured against, shows a running
     * count so nobody has to count highlights on screen by eye. 0 or
     * undefined shows nothing -- an empty badge is not information.
     */
    selectedCount?: number;
    /**
     * Item N: Date.now() of the last time the Rules panel or a handle was
     * actually touched (ReshapeStudio.tsx's own touchRuleActivity()), or
     * null if never. Used to hold the "A sketch is flat..." Pull hint off
     * screen for ~3s after real activity there -- a blind judge read it as
     * an unrelated prompt with no affordance for the rule they were setting,
     * because it kept refreshing on top of every rule committed. Absent or
     * null behaves exactly as before (the hint shows immediately).
     */
    ruleActivityAt?: number | null;
    /**
     * What to print in that badge instead of the bare count, once there is
     * exactly one selection worth naming -- "Box 1", "Hole 1 -- top face",
     * "Round 1 -- edge" (SandboxWorkspace.tsx computes this from `selected`,
     * `doc`, and whichever of `pickedFace`/`pickedEdge` is live, via
     * lib/model-types.ts's nameMap() plus the picked TopoName's own `part`
     * where the pick resolved one). A blind 2D-side judge's own complaint --
     * "selection reported only as a generic count badge with no element
     * name" -- applies here too: a beginner staring at "1 Selected" has no way
     * to confirm they picked the THING they meant to. Falls back to the plain
     * `${selectedCount} Selected` wording below when this is absent (a caller
     * that has not been updated, or the 2+-selected case, which stays a count
     * on purpose -- naming two or more things in one badge is a sentence, not
     * a label).
     */
    selectionLabel?: string | null;
    /**
     * Drag-handle specs to project to screen, world space -- the same
     * `HandleSpec[]` SandboxWorkspace.tsx already computes via handlesFor() and
     * posts into the JSCAD runner as `reshape-set-anchors`. This is that same
     * data reaching this component directly instead, since there is no iframe
     * boundary here to cross.
     */
    anchors?: HandleSpec[];
    /**
     * Fired with the projected result -- container-relative CSS pixels, the
     * same `AnchorPoint[]` shape the JSCAD runner posts back as
     * `reshape-anchors` -- every time it changes: once per new `anchors` prop,
     * and once per animation frame while the camera is moving (orbit, pan,
     * zoom, and the damping tail after any of them). See projectAnchors() for
     * why a moving camera needs its own flush point on a render-on-demand
     * viewport.
     */
    onAnchors?: (points: AnchorPoint[]) => void;
    /**
     * Fired with the built geometry every time a rebuild finishes -- one merged
     * MeshInput (lib/mesh-export.ts) across every top-level shape, or null when
     * there is nothing drawable (the empty document, or a build error). This is
     * the same triangle data drawGeoms() puts on screen, just handed out in the
     * structural {positions, indices} shape the exporter wants instead of a
     * THREE.BufferGeometry, so a caller can wire STL/OBJ/3MF export without
     * this component knowing anything about file formats or download buttons --
     * see SandboxWorkspace.tsx's Export STL button, the one place that reads it.
     */
    onMesh?: (mesh: MeshInput | null) => void;
    /**
     * Hands the caller this component's own pick function -- the exact code
     * path `onClick` below runs (face/edge hit test, naming, highlight paint,
     * `onPick` emission), invokable from OUTSIDE a real pointer event on the
     * canvas. Exists for HandleOverlay.tsx's `onTap`: a click that lands on a
     * drag handle never reaches this component's own click listener (the
     * handle is a separate DOM element sitting on top), so a tap there has no
     * other way to still pick whatever face or edge is underneath it.
     *
     * Called once with the live function whenever the render effect (re)runs,
     * and with `null` on cleanup -- a stale closure over a disposed renderer
     * is worse than a caller finding pickAt briefly unset.
     */
    registerPickAt?: (fn: ((clientX: number, clientY: number) => void) | null) => void;
    /**
     * The plane of the single sketch currently selected, or null when nothing
     * (or something other than exactly one sketch) is selected --
     * SandboxWorkspace.tsx derives this from `selected`/`doc` the same way it
     * already derives `selectionLabel`.
     *
     * A transition from null to a plane means "the student just started
     * looking at a sketch flat": the camera saves its current orbit (so
     * selecting a solid again can put it back -- see viewpointBeforeSketchRef's
     * own comment), looks straight down that plane's own normal (Ground -> the
     * TOP_DIR the view strip already uses, Front -> FRONT_DIR, Side -> the new
     * SIDE_DIR), and fits to the sketch the same way fitToModel() fits a
     * solid, MINUS `panelOcclusionPx` of visible width (the Rules panel
     * appearing alongside it). A transition from a plane back to null restores
     * the saved orbit. No-op while the plane string does not change (staying
     * on the same sketch, or switching to a different sketch on the SAME
     * plane, is not a new "entering flat view" event).
     */
    sketchPlane?: 'xy' | 'xz' | 'yz' | null;
    /** Ids of datum planes currently selected (timeline), drawn brighter. A
     *  datum has no mesh, so the viewport cannot learn this from a pick. */
    selectedDatumIds?: string[];
    /** A click that lands on a datum plane and on no solid face or edge. Datums
     *  have no mesh, so this is separate from `onPick`; the modifiers say whether
     *  the click accumulates (Ctrl/Shift/Cmd) or replaces the selection. */
    onDatumPick?: (datumId: string, mods: {
        ctrlKey: boolean;
        shiftKey: boolean;
        metaKey: boolean;
    }) => void;
    /**
     * How many pixels of docked UI panel currently sit to one side of the
     * canvas -- the Rules panel's own width while a sketch is being viewed
     * flat, passed straight to lib/camera-fit.ts's fitDistance() as its
     * `occludedWidth` argument (see that function's own comment for why this
     * is a known constant handed in, not something read back off the DOM).
     * Only read at the moment `sketchPlane` transitions from null to a plane;
     * this component does not re-fit on every later render just because this
     * number happened to change (the Dimensions panel is effectively always
     * open in Build mode and does not itself trigger a re-fit either -- see
     * fitToModel()'s own "never on every rebuild" rule).
     */
    panelOcclusionPx?: number;
    /**
     * Fired once, with the live EngineAdapter, as soon as the kernel is up.
     * There is one kernel and this component never swaps it mid-session, so a
     * caller can read the first call as "the engine is ready" and keep the
     * instance for anything this component's own props do not cover.
     */
    onEngine?: (engine: EngineAdapter) => void;
    /**
     * Step-1 note taxonomy (SPEC-ui-revamp-decisions.md §5): when true, the
     * top-right selection badge + edge-hover-hint stack is NOT rendered here --
     * the selection readout lives in the caller's status bar instead.
     * Default false: every existing caller keeps its badges.
     */
    badgesInStatusBar?: boolean;
    /** The status bar's mouse-binding hint, LIFTED to the caller like the
     *  selection readout badgesInStatusBar lifts: the viewport owns the
     *  scheme (its own chip writes it), the caller renders the words. Fired
     *  on mount and on every scheme flip, with the pure navHint() string.
     *  Absent: the caller renders nothing (app/brep-three callers). */
    onNavHint?: (hint: string) => void;
    /**
     * Which pickable kinds are currently active -- SPEC-mouse-parity.md Phase 3
     * item 2's filter toolbar. Rendered HERE, beside this component's own view
     * strip, rather than in ReshapeStudio.tsx: every other piece of viewport
     * chrome (the view strip itself, the nav cube, the selection badge) already
     * lives in this component's own JSX, driven by props the caller owns --
     * `filters` follows that same split rather than inventing a second
     * viewport-overlay convention. Read through a ref (see filtersRef below)
     * the same way `onPick`/`pick` are, so hitAt()'s pointermove/click
     * listeners -- set up once by the scene-setup effect, not on every prop
     * change -- see a toggle the instant it happens. Absent (no caller has
     * wired the toolbar) defaults to every kind pickable, i.e. today's actual
     * behaviour before this filter existed -- see DEFAULT_FILTERS.
     */
    filters?: SelectionFilters;
    /**
     * Fired with the next filters value on a chip click. ReshapeStudio.tsx
     * owns the real SelectionState.filters this only reflects; this component
     * renders the toggle UI and reports the requested change, the same split
     * `onPick` already draws between "renders a pick" and "owns selection".
     */
    onFiltersChange?: (next: SelectionFilters) => void;
    /**
     * Fired once a box-select drag completes (SPEC-mouse-parity.md Phase 3
     * item 4) with every candidate the drag's window/crossing rect kept,
     * filtered by `filters` the same way a single click already is -- a
     * filtered-out kind is never in this list, same as it is never
     * click-pickable. `shiftKey` mirrors a click's own accumulate-vs-replace
     * choice (Ctrl's "add if absent" has no separate meaning for a whole
     * batch, so only Shift's distinction survives here): held, the caller
     * adds every item to whatever is already selected; released, the caller
     * replaces the selection with exactly these. Never fired for a drag
     * that stayed under the 4px threshold or started on a real pick target
     * -- both fall through to the ordinary click-to-pick path (`onPick`)
     * instead, same as before this prop existed. Absent means box select
     * still WORKS (the drag gesture and its rectangle overlay do not depend
     * on this prop), it just has nowhere to report its result.
     */
    onBoxSelect?: (items: SelectionItem[], shiftKey: boolean) => void;
    /**
     * Double-click a feature body (SPEC-mouse-parity.md Phase 3.6): fired
     * with the feature id hitAt() resolves at the click point. Never fired
     * for a double-click on empty space -- the caller's job is "open this
     * feature's params panel, focused", which has nothing to open when
     * nothing was hit. A single click's own onPick keeps selecting exactly
     * as it always has; this is purely additive.
     */
    onFeatureDoubleClick?: (featureId: string) => void;
    /**
     * Ctrl+A while the canvas has focus (SPEC-mouse-parity.md Phase 3.6):
     * select every feature. Fired with no arguments, the same
     * "renders the gesture, reports it, the caller owns SelectionState"
     * split `onFiltersChange`/`onBoxSelect` already draw -- the caller writes
     * `selectAllFeatures(doc)` itself.
     */
    onSelectAll?: () => void;
    /**
     * Delete/Backspace while the canvas has focus (SPEC-mouse-parity.md
     * Phase 3.6): delete the current selection through the SAME doc-edit
     * path the caller's own Delete button already uses. Guarded internally
     * by `shouldHandleViewportDelete()` (pick-helpers.ts) so a Delete/
     * Backspace typed into a text field elsewhere on the page is never
     * intercepted -- the listener lives on the canvas element itself, so it
     * only ever sees a keydown that targeted (or bubbled through) the
     * canvas in the first place.
     */
    onDeleteSelected?: () => void;
    /**
     * The marking menu's Undo/Redo wedges (SPEC-mouse-parity.md Phase 4.1) --
     * the SAME history ReshapeStudio.tsx's own toolbar buttons already call
     * (`undo`/`redo`). Absent means those wedges render disabled: "renders the
     * gesture, reports it, the caller owns the history" is the same split
     * `onDeleteSelected`/`onSelectAll` above already draw.
     */
    onUndo?: () => void;
    onRedo?: () => void;
    /**
     * The marking menu's Sketch wedge: start a new sketch on the caller's
     * current active plane, the exact flow ModelEditor's own Sketch button
     * (startSketch(), ModelEditor.tsx:884-890) runs -- this component has no
     * `doc`-editing machinery of its own, so the caller supplies the whole
     * gesture rather than this component reaching into `doc`/`activePlane`
     * itself. Absent means the wedge renders disabled.
     */
    onStartSketch?: () => void;
    /** The marking menu's Repeat wedge (Fusion's top wedge, footage-verified
     *  in the holes lesson: it re-runs the last feature command). The
     *  viewport only names the wedge; the caller supplies the repeat flow
     *  (ModelEditor's own repeat(lastPattern)). Null/absent keeps the wedge
     *  present-but-disabled — visible, greyed, no-op. */
    onRepeat?: () => void;
    /** The canvas's M hotkey (Fusion footage 03:08: "M" activates Move/Copy
     *  from the viewport). The viewport owns keydown scope; the caller
     *  supplies the Move/Copy entry (ModelEditor's moveTool). Fires only on
     *  a plain 'm' with no modifier and no text field owning the keys. */
    onMoveHotkey?: () => void;
    /**
     * Phase 5.3's live-preview tint (todo 25): while a manipulator drag is
     * in flight the rebuilt meshes are drawn TRANSLUCENT in the op's colour
     * -- blue for an additive operation, red for a cut -- instead of the
     * committed opaque orange. `active` is the caller's own previewDoc
     * signal (a pending param fold exists); `tint` is the selected
     * feature's op colour (manipulator-core's previewTint). Absent or
     * inactive draws the committed material, exactly as before.
     */
    preview?: {
        active: boolean;
        tint: 'add' | 'cut';
    } | null;
}
/**
 * Renders a ModelDoc through the brep-rs B-rep kernel, live, in the page.
 *
 * Incremental (feature-level) rebuild is NOT here: every doc change rebuilds
 * every feature from scratch through the adapter's build().
 */
export default function BrepViewportThree({ doc, deflection, onStats, onPick, pick, selectedCount, selectionLabel, anchors, onAnchors, onMesh, registerPickAt, sketchPlane, selectedDatumIds, onDatumPick, panelOcclusionPx, ruleActivityAt, onEngine, badgesInStatusBar, onNavHint, filters, onFiltersChange, onBoxSelect, onFeatureDoubleClick, onSelectAll, onDeleteSelected, onUndo, onRedo, onStartSketch, onRepeat, onMoveHotkey, preview, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BrepViewportThree.d.ts.map