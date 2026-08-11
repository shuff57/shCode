# JSCAD docs

Reference material for the JSCAD 3D-modeling unit (Q3–Q4 of the course).
JSCAD is **not vendored** — the app loads `@jscad/modeling` and
`@jscad/regl-renderer` from unpkg at runtime, so these docs are the only
in-repo JSCAD artifacts.

## What's in this folder

| File | Covers |
|---|---|
| `reference.md` | Hand-authored API reference — the exact function subset the course teaches, with signatures + examples |
| `challenges.md` | Challenge ladder written against the real @jscad/modeling API |
| `CLAUDE.md` | How the app integrates JSCAD (preview builder, unpkg versions, CJS shim) — dev reference |
| `LICENSE.md` | License notes for @jscad/modeling and @jscad/regl-renderer |
| `index.html` | Docs index page (open `docs/` in a browser) |

## Where the docs live in the app

- **In-app:** `/docs/jscad` — built from `lib/jscad-docs.ts`, with live
  runnable examples in the same sandbox style as `/docs/shplay`.
- **External (canonical):** https://openjscad.xyz/docs/ — the generated JSDoc
  for the full `@jscad/modeling` surface. The in-app docs cover only what the
  course teaches; the external docs cover everything.

## Versions

- `@jscad/modeling@2.13.0` — loaded from unpkg in `lib/preview-builder.ts`.
- `@jscad/regl-renderer@2.6.15` — the 3D viewport renderer.

## Licensing

`@jscad/modeling` and `@jscad/regl-renderer` are MIT. See `LICENSE.md`.
