import { type ComponentType, type ForwardRefExoticComponent, type ReactNode, type RefAttributes } from 'react';
import { type ModelDoc } from '@shuff57/reshape-script/model-types';
/** The two pieces of shCode's lesson/sandbox chrome this component does not
 *  own -- CodeEditor is the shared, store-backed code editor used well
 *  beyond reSHape (LessonWorkspace, SandboxWorkspace), and ReshapePreview
 *  wraps the sandboxed script-runner iframe, itself dependent on shCode's
 *  MoshionPreview for its `encodeCode` helper. Neither is reSHape-only, so
 *  neither moved into this package (see reshape-cad's B1 extraction notes);
 *  the host app injects its own implementations instead. */
export type ReshapePreviewComponent = ForwardRefExoticComponent<{
    code: string;
    runKey: number;
    engine: 'brep' | 'script';
} & RefAttributes<HTMLIFrameElement>>;
export type ReshapeStudioProps = {
    /** script.js text -- the ONE saved artifact. Controlled: Code edits it
     *  through the store-backed CodeEditor this component renders, and Build
     *  regenerates it (debounced) through `onChange`. */
    value: string;
    onChange: (text: string) => void;
    /** Which panel(s) exist -- ['build'], ['code'], or both. */
    sides: ('build' | 'code')[];
    /** Which side to open on. Defaults to 'build' when both sides exist,
     *  otherwise whichever one does. Read once, at mount -- this component
     *  owns its own side state after that (see the module CLAUDE.md note: the
     *  localStorage keys stay in the caller). */
    startSide?: 'build' | 'code';
    /** The latest built doc, for a caller's grading pass. Called with `null`
     *  until the very first successful build (mount hydration or a Run). */
    onDocChange?: (doc: ModelDoc | null, refusals?: Record<string, string>) => void;
    /** For per-lesson UI keys; pass 'sandbox' from the sandbox. Currently
     *  unused by anything DOM-id-scoped (ModelEditor's ribbon/rules/timeline
     *  hosts are hardcoded ids and only one ReshapeStudio is ever mounted at a
     *  time), kept for a future per-instance need and so a caller always has
     *  something stable to key a remount on (e.g. a lesson's Reset button). */
    lessonId: string;
    /** Fires once on mount and again on every Build/Code toggle. A caller that
     *  wraps this in its own chrome (SandboxWorkspace hides its header and the
     *  program-type tabs while Build is showing, matching the pre-extraction
     *  look) needs to know the side live -- it is not derivable from `sides`. */
    onSideChange?: (side: 'build' | 'code') => void;
    /** Whether `value` should be silently run through the sandbox once on
     *  mount to hydrate `doc` (see the file header). Default true, for a
     *  lesson: `value` there is the student's own saved progress, and a
     *  reload with nothing on screen until they press Run would look like
     *  their work was lost. The sandbox passes false: `value` on a fresh
     *  session is RESHAPE_STARTER, a teaching example for the Code side, not
     *  built work -- auto-adopting it into Build silently pre-built a box and
     *  a hole before the student had touched a tool (SPEC-A1 rework 1). */
    autoRunOnMount?: boolean;
    /** Extra controls rendered at the end of this component's own toolbar row
     *  (see the file header's chrome note) -- SandboxWorkspace folds its Reset
     *  and Full-screen buttons in here so they sit in the SAME row as the
     *  Build ribbon, exactly as the pre-extraction sandbox rendered them, since
     *  those two actions need `shellRef`/localStorage this component has no
     *  reason to own. Unused by a lesson, which has its own separate toolbar. */
    toolbarExtra?: ReactNode;
    /** The store-backed code editor Code mode renders. Shared shCode chrome
     *  (LessonWorkspace and SandboxWorkspace both mount it too), so the host
     *  app supplies it rather than this package owning a copy. */
    CodeEditor: ComponentType;
    /** The sandboxed script-runner iframe wrapper. Also shCode chrome (it
     *  depends on MoshionPreview's `encodeCode`, outside reSHape entirely),
     *  injected the same way as `CodeEditor`. */
    ReshapePreview: ReshapePreviewComponent;
};
export default function ReshapeStudio({ value, onChange, sides, startSide, onDocChange, onSideChange, toolbarExtra, autoRunOnMount, CodeEditor, ReshapePreview, }: ReshapeStudioProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ReshapeStudio.d.ts.map