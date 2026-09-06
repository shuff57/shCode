// Moved to reshape-cad's packages/script (B1 extraction, plan:
// freecad-browser.md). The real source lives at
// reshape-cad/packages/script/src/model-types.ts; this file is a thin
// re-export so shCode's existing 'lib/model-types' import paths (grader.ts,
// LessonWorkspace.tsx, ReshapeScriptPreview.tsx, and the /docs/reshape
// pages) do not have to change.
export * from '@shuff57/reshape-script/model-types';
