# reSHape docs

Reference material for the reSHape Solid Modelling unit. reSHape Script is a
first-party language (`lib/reshape-script.ts`) built on the B-rep kernel
(`public/reshape/kernel/`, gitignored, rebuilt by `prebuild`). JSCAD is
retired — see `CLAUDE.md`'s own opening section for what that replaced and
why.

## What's in this folder

| File | Covers |
|---|---|
| `reference.md` | Hand-authored reSHape Script reference — every call the course teaches, with signatures + examples |
| `challenges.md` | Challenge ladder still written against the old JSCAD API (`require`/`main()`/`module.exports`) — not yet converted to reSHape Script; treat as a known gap, not a source of truth |
| `CLAUDE.md` | How the app builds and verifies reSHape Script (the interpreter, the kernel, the doc-sync gates) — dev reference |
| `index.html` | Docs index page (open `docs/` in a browser) |

## Where the docs live in the app

- **In-app:** `/docs/reshape` — built from `lib/reshape-docs.ts`, with live
  runnable examples (`components/ReshapeScriptPreview.tsx`) in the same
  sandbox style as `/docs/moshion`.
- There is no external canonical site the way jscad.app was for JSCAD —
  reSHape Script only means something inside this app, against this kernel.

## Licensing

Nothing shipped derives from JSCAD source any more — `lib/hull.ts`, the one
name OpenCascade has no equivalent for, is first-party (see its own file
header, "Convex hull, ours."). The kernel itself (OpenCascade via a
replicad-family wasm build, LGPL-2.1) loads at runtime as a wasm module and
is never linked into or bundled with our own code; three.js (the viewport
renderer) is MIT.
