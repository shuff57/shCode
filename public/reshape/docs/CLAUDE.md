# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
the reSHape integration in this repository.

## JSCAD is retired

This directory used to document a JSCAD-vendored runner: two MIT-licensed
bundles evaluated in an iframe behind an additive scope shim, a nine-name
`reshape.js` sugar layer on top of the real JSCAD API, and a 449-check gate
(`scripts/test-reshape.mjs`) that verified all of it against the shim cut live
out of `runner.html`. None of that ships any more. The bundles, the shim, the
sugar layer and the gate are all deleted (repo-root `CLAUDE.md`'s "JSCAD is
retired" section has the history and the loop that settled the replacement).
This file describes what replaced them.

## Repository layout

- `public/reshape/kernel/` — the B-rep build, gitignored and rebuilt by
  `scripts/build-brep-kernel.mjs` (wired into `prebuild`). Holds the compiled
  OpenCascade wasm loader (`replicad_single.js`/`.wasm`), the compiled
  first-party TypeScript the kernel needs at runtime (`occt-build.js`,
  `model-types.js`, `sketch-arc.js`, `reshape-script.js`, ...), and three.js.
  Nothing here is committed; a fresh checkout has none of it until `prebuild`
  (or `npm run dev`, which runs the kernel build first) has run once.
- `public/reshape/script-runner.html` — the Code-side iframe. It draws
  NOTHING: it evals the student's script through `lib/reshape-script.ts`'s
  `runScript()`, turns it into a `ModelDoc`, and posts that doc out. The
  parent's own B-rep viewport (`components/model/BrepViewportThree.tsx`) is
  what actually renders it — see the file's own header for "the one idea"
  this turns on.
- `lib/reshape-script.ts` — the interpreter. `runScript(source)` installs
  every top-level name in `VOCABULARY` (`box`, `hole`, `round`, `repeat`, ...)
  and evaluates the student's program through `new Function()`, appending one
  feature to a `ModelDoc` per call — the SAME `new*` constructors and
  `nextId()` sequence a Build-mode mouse click uses, so a script and an
  equivalent sequence of toolbar actions produce byte-comparable docs. It
  never touches a kernel and never draws anything.
- `lib/reshape-script-gen.ts` — the inverse direction: `toScript(doc,
  namedParams)` turns a `ModelDoc` back into reSHape Script source, so Build
  mode can keep `script.js` (the one saved artifact) in sync as a student
  uses the toolbar, and Code mode has something real to show after a Run.
- `lib/reshape-docs.ts` — the in-app `/docs/reshape` content (sections, pages,
  runnable examples), written directly in reSHape Script.
- `public/reshape/docs/reference.md` — the same language, as a standalone
  markdown reference with fenced ` ```js ` examples, for reading offline or
  printed. `lib/reshape-docs.ts` and this file are held in sync by a doc-drift
  check (see below); a deliberate difference between the two is allowed, a
  silent one is not.
- `components/ReshapeScriptPreview.tsx` — the "code in, kernel picture out"
  pair for a page with no Build side (the docs live sandbox, the docs-drawer
  snippet `components/ReshapeDocLiveSnippet.tsx`): mounts a hidden
  `script-runner.html` frame purely to eval the script, and renders the
  resulting doc through the same B-rep viewport Build mode uses.
- `components/reshape/ReshapeStudio.tsx` — the full Build+Code experience
  (toolbar, timeline, Rules panel, params panel, both viewports), extracted
  out of `components/SandboxWorkspace.tsx` so a lesson can mount the same
  thing the sandbox does.
- `lib/occt-build.ts` — the actual builder. Takes a `ModelDoc` (from either
  side — a mouse click or a script run) and produces real B-rep geometry
  through the OpenCascade kernel. reSHape Script never sees this file; it
  only ever produces the document the kernel reads.

## The one idea

A reSHape script IS the Build timeline, written down. There is no second
geometry representation to keep in sync: `runScript()` builds a `ModelDoc`
and nothing else, and `lib/occt-build.ts` is what turns ANY `ModelDoc` —
mouse-built or script-built — into a solid. This is why Build and Code stay
interchangeable: switching sides never re-derives geometry from text, it
just hands the same document to the same kernel.

## The message protocol

`script-runner.html` and its parent (`ReshapeStudio.tsx` /
`ReshapeScriptPreview.tsx`) talk over `postMessage`, in a vocabulary
deliberately distinct from the (now-deleted) JSCAD/B-rep runners' own
(`reshape-params`, `reshape-anchors`, `reshape-rebuilt`, ... — this frame
builds a document, not a picture, so it has nothing living to eval an
expression against between runs):

- outbound `reshape-doc { doc, params, namedParams }` — the doc the script
  built, plus the panel-facing param list.
- outbound `preview-error { error: { message, line } }` — a throw partway
  through a run. `reshape-doc` still arrives first with whatever built before
  the throw, unless the throw was on the very first line (nothing to show).
- inbound `reshape-set-params { params }` — a live drag on the params panel
  re-runs the script with the moved value(s) substituted in.

## Key facts for anyone editing this

- **The DSL vocabulary is one constant.** `VOCABULARY` in
  `lib/reshape-script.ts` is the single source of truth for what a script can
  call — `runScript()` builds its `globals` object from it, and the doc-sync
  check below reads it too, rather than working from a hand-copied word list
  anywhere else.
- **A refusal names what it needs, not just that it failed.** The same
  discipline the JSCAD-era shim held to: a doc-level constraint a script call
  cannot satisfy (an edge that cannot round, a corner spacing that would
  collapse the sketch) is refused with a sentence, not a generic error.
  `scripts/test-reshape-docs.mjs`'s "refusal sentences are the runtime's own"
  group checks that every refusal sentence quoted in the docs is an instance
  of a real template in `lib/occt-build.ts`, `lib/model-types.ts` or
  `lib/reshape-script.ts` — a doc quoting an invented sentence fails the
  build.
- **The in-app docs and `reference.md` must stay in sync.** Both are read as
  the DSL's own vocabulary (not a hand-copied list) by
  `scripts/test-reshape-docs.mjs`'s DRIFT group, which warns (does not fail)
  on any name documented in one but not the other, and prints the coverage
  percentage every run (COVERAGE).
- **Prose must not teach the wrong language.** `scripts/check-docs-prose.mjs`
  scans `lib/reshape-docs.ts` for a JSCAD call name (`cuboid(`, `translate(`,
  `union(`, ...) mentioned in body text or a code comment while the code
  beside it is reSHape Script — the two drifted apart once already, when the
  examples were converted and the prose was not.
- **Every reference example and every in-app page actually builds.**
  `scripts/test-reshape-script.mjs` runs every fenced example in
  `reference.md` and every in-app docs page through `runScript()` and the
  real kernel (needs `--occt <dir with replicad_single.js>`, or point it at
  `public/reshape/kernel` once `prebuild` has run) — 211/211 measured
  2026-09-05 (`.gauntlet/reshape-script-loop.json` records the loop that
  first shipped this at 195/195; the reference and in-app docs have grown
  since). It also
  round-trips every oracle fixture through `toScript()` then `runScript()`
  and checks the reconstructed doc equals the original, so Build → Code →
  Build never silently loses a feature.
- **`?engine=jscad` and `?script=0` no longer exist.** The kernel is the only
  engine, on both sides, unconditionally.

## Consuming reSHape Script (context for user-facing questions)

A student writes a script that calls names like `box`, `hole`, `round`,
`extrude`, `repeat` — no `require`, no CommonJS export, no `main()`. Every
call appends one step to the model; the model is what the Build side (and
the kernel) sees, not the text of the script itself. There is no external
environment to paste into the way JSCAD had jscad.app — a reSHape script only
means something inside this app, against this kernel.
