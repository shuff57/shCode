# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
JSCAD integration in this repository.

## Repository layout

JSCAD **is vendored**. Both bundles live in `public/jscad/lib/` and nothing
loads from a CDN at runtime.

- `public/jscad/lib/jscad-modeling.min.js` — `@jscad/modeling@2.13.0` (UMD).
- `public/jscad/lib/jscad-regl-renderer.min.js` — `@jscad/regl-renderer@2.6.15` (UMD).
- `public/jscad/runner.html` — the 3D preview iframe. Same shape as
  `public/shplay/runner.html`: reads the student code from `?code=<base64url>`,
  pipes console + errors to the parent over the `preview-console` /
  `preview-error` protocol, loads the two vendored bundles by relative path,
  installs the additive scope shim, runs `main()`, renders with
  `@jscad/regl-renderer`.
- `lib/jscad-docs.ts` — the in-app `/docs/jscad` content (sections, pages,
  runnable examples). Hand-authored against `@jscad/modeling@2.13.0`.
- `components/JscadPreview.tsx` — iframe wrapper; takes `{ code, runKey }` and
  builds `src=/jscad/runner.html?code=…&r=…`, mirroring `ShPlayPreview.tsx`.
- `app/docs/jscad/` — the in-app docs route (reuses the shplay docs client
  and sandbox components).
- `lessons/jscad-*` — the JSCAD lessons (jscad-intro, jscad-2d-shapes,
  jscad-booleans).

## Versions (keep in sync)

- `@jscad/modeling@2.13.0` — vendored at `public/jscad/lib/jscad-modeling.min.js`.
- `@jscad/regl-renderer@2.6.15` — vendored at `public/jscad/lib/jscad-regl-renderer.min.js`.

If either version bumps, re-download the bundle into `public/jscad/lib/`, then
re-check the collision list in the shim banner in `public/jscad/runner.html`
(`window.__jscadBareNamesSkipped` in the preview console is the live answer)
and update the version notes here and in `docs/README.md`.

## Runtime architecture

The preview iframe (`public/jscad/runner.html`):

1. Installs the console/error reporter, then loads the two vendored bundles by
   relative path. They are UMD and must load *before* the shim declares
   `window.module`, or they export into it instead of onto `window`.
2. Installs the additive scope shim: the real CommonJS surface
   (`require('@jscad/modeling')`, `module`, `exports`) plus a bare-name copy of
   every module and every module member onto `window`. The precedence order and
   the two real collisions are documented in the banner above the shim.
3. Decodes `?code=` and injects the student source as a `<script>` with a
   `//# sourceURL=script.js` pragma, so thrown errors carry student line
   numbers. A trailing flag assignment tells the renderer whether the script
   ran to completion.
4. Finds `main` — `module.exports.main`, then `module.exports` if it is itself
   a function, then a bare `main` via indirect eval (which sees `const`/`let`
   declarations that `window` cannot). Calls it with the defaults from
   `getParameterDefinitions()` if present, awaits a promise if it returns one,
   converts the result to renderer entities (orange mesh on the jscad.app dark
   theme), and renders with an orbit camera + grid + axes.

### Key invariants when editing

- **The shim is additive, never a replacement API.** No JSCAD name is
  renamed, no geometry is wrapped in a custom class, and no new function name
  is invented. The test that matters: a student file written in the
  `require` / `module.exports` form must still paste into jscad.app and run.
- **`require()` only resolves `@jscad/modeling`** and its real submodule paths
  (e.g. `@jscad/modeling/src/operations/booleans`). Anything else throws
  "Cannot find module". The docs examples must stay within that surface.
- **`main()` must return geometry or an array of geometries.** The runner
  shows a specific error for a missing `main`, a non-function `main`, or a
  `main` that returns nothing.
- **`getParameterDefinitions()` has no UI in the sandbox.** The runner reads
  the declared defaults and calls `main(defaults)`; with no
  `getParameterDefinitions`, `main({})`. Parameter examples must still work
  from defaults alone. The live parameter panel is a jscad.app feature.
- **The docs examples are verified.** Every `code` block in
  `lib/jscad-docs.ts` and every ` ```js ` block in `docs/reference.md` is run
  by `npm test` against the vendored bundle, in a require-only context — the
  jscad.app environment, with the shim subtracted back out. An example that
  needs a bare shim name fails the build.
- **The in-app docs and `docs/reference.md` must stay in sync.** They cover
  the same API subset; a new page in one belongs in the other. `npm test`
  enforces this: the two files must document the same set of
  `@jscad/modeling` function names, with any deliberate asymmetry recorded in
  `DOC_SYNC_EXCEPTIONS` in `scripts/jscad-checks.mjs`.

## The gate

`npm test` (or `npm run test:jscad`) runs `scripts/test-jscad.mjs` — 67 checks
in six groups: BUNDLE, SHIM, API, RENDERER, DOCS, SYNC. It evaluates the real
vendored bundles and the scope shim **cut live out of `runner.html`** in a
`node:vm` context, so editing the shim tests the edit; nothing is
reimplemented in the test.

The two checks worth knowing about before touching the runtime:

- `__jscadBareNamesSkipped` must deep-equal `["utils", "minkowski"]`. That is
  the library-upgrade tripwire the shim banner describes, and it was
  previously observable only by opening the preview console by hand.
- every taught function must be the **same reference** bare as it is
  namespaced. A shim that wrapped geometry in a friendlier object would still
  "work" and would still break paste-into-jscad.app; this is the check that
  catches it.

Two fence tags exist in `reference.md`, both asserted in the direction that
makes them un-abusable — a `skeleton` that returns geometry, or a
`shcode-only` block that runs portably, fails the build:

- ` ```js skeleton ` — `main()` is a stub and returns nothing.
- ` ```js shcode-only ` — the example depends on the shim and is NOT portable.

Runtime builders must not edit `scripts/test-jscad.mjs` or
`scripts/jscad-checks.mjs`. A red check is closed by fixing the runner, the
bundles, or the docs.

## Consuming JSCAD (context for user-facing questions)

Students write a single-file CommonJS-style program: `require` the library,
define `main()`, export it. The app renders the result in a 3D viewport.
The canonical external environment is jscad.app; the in-app preview is a
teaching sandbox with the same library and a subset of the UI.
