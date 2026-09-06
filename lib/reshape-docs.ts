// Moved to reshape-cad's packages/script (B1 extraction, plan:
// freecad-browser.md). The real source lives at
// reshape-cad/packages/script/src/reshape-docs.ts (which vendors its own
// copy of lib/docs-core.ts's types + searchDocs helper, since docs-core.ts
// is shared with lib/js-docs.ts and lib/moshion-docs.ts here and stays in
// shCode -- see that file's own header). This file is a thin re-export so
// shCode's existing 'lib/reshape-docs' import paths (components/docs-sets.tsx,
// app/docs/reshape/*) do not have to change.
export * from '@shuff57/reshape-script/reshape-docs';
