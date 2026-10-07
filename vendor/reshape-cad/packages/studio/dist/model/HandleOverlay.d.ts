import { type Point } from '@shuff57/reshape-sketch/sketch-arc';
import type { Feature, ModelDoc } from '@shuff57/reshape-script/model-types';
/**
 * One sketch's outline, in plane coordinates -- what the overlay needs to
 * draw it as a read-only reference shape, alongside the corner param names
 * used to look up each corner's projected anchor. `shape`/`bulges` mirror
 * SketchFeature exactly; this is a plain data carrier, not a re-derivation
 * of the doc.
 */
export interface SketchOutline {
    /** Param name of each DESIGN corner's u-value, in order -- the key
     *  `outlineAnchors` is looked up by. One per corner the student placed; a
     *  rounded corner is still one entry, not two. */
    corners: string[];
    /** The same design corners' plane coordinates, parallel to `corners`. */
    design: Point[];
    /** The DERIVED outline in plane coordinates -- what actually gets drawn.
     *  Equal to `design` for a sketch with nothing rounded. Never a source of
     *  truth: outlineOf() produces it, and nothing may write it back. */
    points: Point[];
    /** Parallel to `points`: which design corner each outline point projects
     *  through. Both trim points of a rounded corner carry that corner, which
     *  is what lets a derived point ride a real anchor -- there is no anchor of
     *  its own to ride, and that is the whole point of the split. */
    basis: number[];
    shape?: 'circle';
    bulges?: Record<number, number>;
}
export interface AnchorPoint {
    param: string;
    label: string;
    kind?: 'size' | 'move' | 'turn' | 'point' | 'radius';
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    pxPerUnit: number;
    /** Screen pixels per world unit along the handle's axis, as a vector. */
    ux?: number;
    uy?: number;
    /** Present only for handles that move in a plane rather than along a line. */
    paramV?: string;
    vx?: number;
    vy?: number;
}
interface Props {
    points: AnchorPoint[];
    /** Current model value per parameter — the drag starts from this. */
    values: Record<string, unknown>;
    /** How much the dimension moves per unit the handle moves. */
    scales: Record<string, number>;
    onDrag: (param: string, value: number) => void;
    /** Any sketch on screen, so its outline can be drawn as a read-only
     *  reference shape -- see SketchOutline's own doc comment. */
    outlines?: SketchOutline[];
    /**
     * The anchor set `outlines` projects through -- a sketch's own corner
     * anchors included, which `points` above deliberately excludes (a sketch
     * is edited in SketchCanvas2D now, not by dragging a corner here). Falls
     * back to `points` when absent, so a caller with nothing sketch-specific
     * to project need not pass it at all.
     */
    outlineAnchors?: AnchorPoint[];
    /** Called once when the drag ends, to fold the result back into the doc. */
    onCommit: () => void;
    /**
     * Fired instead of a drag when a pointerdown+pointerup on a handle moved
     * less than TAP_TOLERANCE_PX -- a tap, not a drag. Must act exactly as a
     * click on the canvas underneath the handle would: this component emits
     * no `onDrag` and no `onCommit` for that interaction, so the caller is
     * expected to run its own pick (face/edge) at this point instead. Absent
     * means a tap on a handle does nothing, same as before this prop existed.
     */
    onTap?: (clientX: number, clientY: number) => void;
    /**
     * How much of the layer's OWN bottom edge to leave uncovered, in CSS
     * pixels. Defaults to 0 -- plain `inset:0`, filling its containing block
     * exactly.
     *
     * GEOMETRY NOW (docked grid, adoption step 2, 2026-09-16): the timeline is
     * a grid row OUTSIDE the pane-view, and the status bar is outside too, so
     * normal bottomInset is 0. The prop remains for hosts that reserve bottom
     * space in the pane-view itself (e.g. old hosts passing 84).
     *
     * MECHANICS, for hosts that do pass it: `inset:0` ON AN ABSOLUTELY
     * POSITIONED ELEMENT RESOLVES AGAINST THE CONTAINING BLOCK'S PADDING
     * EDGE, NOT ITS CONTENT EDGE -- a genuine CSS rule, not a bug, but one the
     * host that renders this overlay got backwards for a while. SandboxWorkspace.tsx's Build mode reserves
     * space for its timeline strip with `padding-bottom` on the shared
     * container this layer sits in, on the (documented, and wrong) assumption
     * that padding on that ancestor would shrink this layer the same way it
     * shrinks the flex-sized render surface (the JSCAD iframe, or
     * BrepViewportThree's canvas) beside it. It does not: a flex child
     * respects its container's padding because it lays out in the CONTENT
     * box; this layer's own `inset:0` still measures against the fuller
     * PADDING box, so it stood exactly as many pixels taller as the padding
     * reserved -- measured directly on BOTH render paths, same gap, same
     * cause, not something specific to either engine. Passing that same
     * reservation back in here is what makes the two match again.
     */
    bottomInset?: number;
    /**
     * Phase 5.1's arrow+value-box manipulator (todo 22). The currently
     * selected feature and the doc to read its committed value from; when
     * the feature kind carries a single positive-extent parameter (extrude
     * height / pocket depth / fillet size) the projected anchor for that
     * parameter grows an on-canvas ARROW and a floating drag-or-type value
     * box at its tip. Dragging stays the existing push/commit flow (the
     * same rAF coalescer, one undo step on pointerup); typing commits
     * through the same param name on Enter, so both paths converge on one
     * parameter-update call. Refused text leaves the doc alone, in a
     * sentence. Absent (Code mode, or no selection) draws nothing new.
     */
    manipulator?: {
        feature: Feature;
        doc: ModelDoc;
        onDragParam: (param: string, value: number) => void;
        onCommitParam: () => void;
    } | null;
    /**
     * Phase 5.2's Incremental Move (todo 24): snap mode and step for
     * drags on a MOVE feature's axis handles. 'adaptive' reads the model
     * extent (move-gizmo-core.adaptiveStep); 'fixed' uses fixedStep; 'off'
     * passes raw deltas through. modelExtent is the model's longest mm
     * extent, which ReshapeStudio already owns from the stats readout.
     */
    incrementalMove?: {
        mode: 'adaptive' | 'fixed' | 'off';
        fixedStep: number;
        modelExtent: number;
        onModeChange?: (mode: 'adaptive' | 'fixed' | 'off') => void;
        onStepChange?: (step: number) => void;
    } | null;
    /**
     * Phase 5.4 (todo 26): the ACTIVE COMMAND's own state, for the
     * step tooltip -- prompt string per command step rather than the
     * single static string per hover target. `active: false` (command
     * cancelled or ended) clears the tooltip rather than persisting a
     * stale prompt. The command id is the manipulator feature's kind.
     */
    activeCommand?: {
        command: string;
        selectionCount: number;
    } | null;
}
export default function HandleOverlay({ points, values, scales, onDrag, onCommit, onTap, outlines, outlineAnchors, bottomInset, manipulator, incrementalMove, activeCommand, }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=HandleOverlay.d.ts.map