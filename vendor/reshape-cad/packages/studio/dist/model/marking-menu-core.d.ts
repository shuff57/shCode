export type MarkingMenuMode = 'part-viewport' | 'sketch';
export interface MarkingMenuWedge {
    id: string;
    label: string;
    /** Ribbon-style shortcut hint, e.g. 'Del'. Not rendered by this todo's
     *  MarkingMenu, carried on the type so a later flyout label can use it. */
    shortcut?: string;
    /** Static enabled state from the DATA itself -- absent means enabled.
     *  Selection-dependent enablement (the sketch constraint wedges) is NOT
     *  carried here; see validSketchConstraints() below, which the component
     *  consults instead. */
    enabled?: boolean;
    /** Second-level flyout (todo 18) -- not read by this todo's MarkingMenu. */
    children?: MarkingMenuWedge[];
}
export type MarkingMenuConfig = Record<MarkingMenuMode, MarkingMenuWedge[]>;
/** The Sketch flyout's tools, as a function so it is defined after the
*  SKETCH_TOOLS list below (hoisting makes a const initializer cycle here).
*  Every tool SketchCanvas2D.tsx's own toolbar already arms -- the lesson's
*  sketch tool set (SPEC :33-36, "hover Sketch for a second radial").
*  ids/dispatch are MarkingMenu.tsx's caller's job (todo 17 wired the same
*  pattern for the first level). */
export declare function SKETCH_TOOL_CHILDREN(): MarkingMenuWedge[];
/** The lookup table item 17 asks for ("define a MarkingMenuConfig type and a
 *  lookup table, do not hardcode the eight commands inline in the
 *  component"). */
export declare const MARKING_MENU_CONFIG: MarkingMenuConfig;
export declare function wedgesForMode(mode: MarkingMenuMode): MarkingMenuWedge[];
/** The ten constraint wedge ids -- exactly SKETCH_WEDGES minus 'done'/'dim',
 *  exported so validSketchConstraints() below and MarkingMenu.tsx agree on
 *  which ids are selection-gated without restating the list twice. */
export declare const SKETCH_CONSTRAINT_IDS: readonly ["horizontal", "vertical", "coincident", "parallel", "perpendicular", "equal", "tangent", "pointOnObject", "symmetric", "lock"];
export type SketchGeomKind = 'point' | 'line' | 'arc' | 'circle';
export interface SketchSelectionEntry {
    kind: SketchGeomKind;
}
/** Which constraint wedge ids apply to the CURRENT selection's entity types
 *  -- reimplements the ten canX booleans SketchCanvas2D.tsx:1033-1048 already
 *  computes over its own `selShapes`/`selPoints` split (a 'point' entry is a
 *  named point pick; everything else is a "shape"), so a caller passing its
 *  selection's resolved geometry kinds gets the identical answer the
 *  toolbar buttons' own `disabled=` props already give:
 *  - horizontal/vertical: exactly 1 line
 *  - parallel/perpendicular/equal: exactly 2 lines
 *  - tangent: exactly 2 shapes, NOT both lines (line+curve or curve+curve --
 *    never two lines, which is what parallel/perpendicular/equal are for)
 *  - coincident: exactly 2 points
 *  - pointOnObject: exactly 1 point + 1 shape
 *  - symmetric: exactly 3 points
 *  - lock: exactly 1 point
 */
export declare function validSketchConstraints(selection: SketchSelectionEntry[]): string[];
/** One pointer sample: client-space px + event timestamp. */
export interface PointerSample {
    x: number;
    y: number;
    t: number;
}
/** Distinguishes a right-CLICK (open the marking menu) from a right-DRAG
 *  (let OrbitControls/pan keep the movement, per SPEC-mouse-parity.md Phase
 *  4.3 -- "distinguish a click (menu) from a drag by movement threshold")
 *  by the same movement threshold the click-and-hold cycling gesture already
 *  uses (input-threshold.ts's HOLD_CYCLE_DEAD_ZONE_PX, passed in as
 *  `deadZonePx` so this module does not need to import that one for a single
 *  constant). `down === null` (no matching pointerdown seen) always ignores.
 *  Takes timestamps now even though this todo only reads the distance, so
 *  todo 19's hold/drag gesture state machine can extend this same function
 *  rather than writing a second one. */
export declare function classifyRightClick(down: PointerSample | null, up: PointerSample, deadZonePx: number): 'menu' | 'ignore';
/** The vertical context list SPEC :34-35 describes below the radial
*  ("a context list below holds Pan/Zoom/Orbit, Isolate, workspaces, saved
*  shortcuts"). Pure data, keyed by mode like the wedges. Entries whose
*  flows don't exist in reSHape yet are present-but-disabled (the same
*  convention todo 17 used for the part-viewport command wedges) -- the
*  component renders them greyed, never hidden. */
export declare function contextListFor(mode: MarkingMenuMode): MarkingMenuWedge[];
/** Which way the flyout-hold logic decides, for one cursor sample.
*  'stay' keeps the flyout open, 'close' collapses it. */
export type FlyoutVerdict = 'stay' | 'close';
export interface FlyoutSample {
    x: number;
    y: number;
}
/** The flyout's dead-zone hit-test (todo 18's acceptance criterion): while
*  the cursor is INSIDE the triangle whose corners are the parent wedge's
*  position, the flyout's nearest edge point, and the point between them
*  perpendicular to the wedge-to-flyout line, it stays open -- the standard
*  hover-menu "diagonal grace" that stops the flyout collapsing while the
*  user moves toward it. Directly-away paths (back toward the menu center)
*  fall outside the triangle and close. Pure: positions in, verdict out, no
*  time (the component owns any grace TIMER; the geometry here is what makes
*  the diagonal path safe).
*
*  `wedge` is the parent wedge's own position; `flyoutCenter` the flyout's
*  anchor. The triangle is (wedge, flyoutCenter, midpoint-of-wedge-flyout
*  offset perpendicular by the same distance as the wedge-to-flyout gap) --
*  wide enough that any monotonic move from the wedge toward the flyout
*  stays inside it, while a move BACK through the wedge toward the menu
*  center exits it immediately. */
export declare function flyoutHitTest(wedge: FlyoutSample, flyoutCenter: FlyoutSample, cursor: FlyoutSample): FlyoutVerdict;
/** The gesture's resolution, for todo 19's acceptance criteria: 'menu' means
 *  "the delay elapsed with the pointer still (nearly) stationary -- show the
 *  full menu"; a wedge direction means "the pointer left the dead zone in
 *  that direction BEFORE the delay elapsed -- fire that wedge's command
 *  directly, never rendering the menu" (SPEC :37-39: "hold right-button and
 *  drag toward a wedge without showing the menu"). */
export type GestureVerdict = {
    kind: 'menu';
} | {
    kind: 'wedge';
    wedgeIndex: number;
} | {
    kind: 'ignore';
};
export interface GestureThresholds {
    /** Milliseconds the pointer must stay within `deadZonePx` before the menu
     *  renders. [CONFIRM] default 150ms, pending real-Fusion verification
     *  (SPEC open question #2; the handover file only settled the HOLD-cycle
     *  numbers, not the marking-menu gesture's). */
    delayMs: number;
    /** CSS px of movement that still counts as stationary. Shared with the
     *  click-and-hold cycling gesture: the caller passes
     *  input-threshold.ts's HOLD_CYCLE_DEAD_ZONE_PX rather than a new number. */
    deadZonePx: number;
    /** How many wedges the menu has (8 for the radial first level). */
    wedgeCount: number;
}
/** The pure gesture classifier todo 19 needs: given the pointerdown sample,
 *  the pointerup sample, and the thresholds, decide whether this was a
 *  "show the menu" click/hold, a directional wedge gesture, or an
 *  irrelevant gesture (left button, or the first wedge slot straight UP --
 *  per SPEC :37-39 "Sketch is reached by dragging down first", the FIRST
 *  wedge in the lesson's gesture order is reached by dragging DOWN, so a
 *  straight-up drag from the center is not a wedge gesture; it falls back
 *  to 'menu'). A drag that leaves the dead zone BEFORE the delay is a
 *  wedge gesture WITHOUT ever rendering the menu; a release that is still
 *  within the dead zone after the delay is 'menu'.
 *
 *  Written as a function of ONE down sample and ONE up sample on purpose:
 *  todo 19's runtime only needs to remember the right-button pointerdown
 *  and pass every later sample's x/y/t -- the same state todo 17's
 *  onCanvasContextMenu already tracks (BrepViewportThree.tsx's
 *  `rightDownAt`). The wedge direction is the angle from the down point to
 *  the up point, indexed over `wedgeCount` slots starting at 12 o'clock
 *  going clockwise, matching MarkingMenu.tsx's own wedge layout
 *  (`-90 + 360/n * i` degrees, ccw from +X after the screen-flip). */
export declare function classifyGesture(down: PointerSample | null, up: PointerSample, thresholds: GestureThresholds): GestureVerdict;
//# sourceMappingURL=marking-menu-core.d.ts.map