# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
JSCAD integration in this repository.

## Repository layout

JSCAD is **not vendored**. The app loads the library from unpkg at runtime,
so there is no `public/jscad/` runtime folder — only this docs folder.

- `lib/jscad-docs.ts` — the in-app `/docs/jscad` content (sections, pages,
  runnable examples). Hand-authored against `@jscad/modeling@2.13.0`.
- `lib/preview-builder.ts` — `buildJscadPreviewHtml(scriptContent)` builds
  the 3D preview iframe: loads the two unpkg scripts, shims
  `require`/`module`/`exports`, runs the student code, renders with
  `@jscad/regl-renderer`.
- `components/JscadPreview.tsx` — iframe wrapper for the preview.
- `app/docs/jscad/` — the in-app docs route (reuses the shplay docs client
  and sandbox components).
- `lessons/jscad-*` — the JSCAD lessons (jscad-intro, jscad-2d-shapes,
  jscad-booleans).

## Versions (keep in sync)

- `@jscad/modeling@2.13.0` — unpkg URL in `lib/preview-builder.ts`.
- `@jscad/regl-renderer@2.6.15` — unpkg URL in `lib/preview-builder.ts`.

If either version bumps, update the unpkg URLs in `lib/preview-builder.ts`
and the version notes in `docs/README.md`.

## Runtime architecture

The preview iframe (`buildJscadPreviewHtml`):

1. Loads `jscad-modeling.min.js` and `jscad-regl-renderer.min.js` from unpkg.
   If either fails (no internet), the status line shows an error.
2. Defines a CJS shim: `require('@jscad/modeling')` returns the global
   `jscadModeling`; any other module name throws.
3. Runs the student code in a try/catch; a caught error is stored on
   `window.__jscadError` and surfaced after the CDN check.
4. Calls `module.exports.main()`, converts the result to renderer entities
   (orange mesh on the jscad.app dark theme), and renders with an orbit
   camera + grid + axes.

### Key invariants when editing

- **The CJS shim only knows `@jscad/modeling`.** Student code that requires
  anything else fails with "Unknown module". The docs examples must stay
  within that single-module surface.
- **`main()` must return geometry or an array of geometries.** The runner
  shows a specific error for a missing `main`, a non-function `main`, or a
  `main` that returns nothing.
- **`getParameterDefinitions()` has no UI in the sandbox.** The preview runs
  `main({})` — parameter examples must fall back to defaults when `params`
  is empty. The live parameter panel is a jscad.app feature.
- **The docs examples are verified.** Every `code` block in
  `lib/jscad-docs.ts` was executed against `@jscad/modeling@2.13.0`; if you
  change an example, re-verify it (e.g. `npm i @jscad/modeling@2.13.0` in a
  temp dir and run each block through `main({})`).
- **The in-app docs and `docs/reference.md` must stay in sync.** They cover
  the same API subset; a new page in one belongs in the other.

## Consuming JSCAD (context for user-facing questions)

Students write a single-file CommonJS-style program: `require` the library,
define `main()`, export it. The app renders the result in a 3D viewport.
The canonical external environment is jscad.app; the in-app preview is a
teaching sandbox with the same library and a subset of the UI.
