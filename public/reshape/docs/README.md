# JSCAD docs

Reference material for the JSCAD 3D-modeling unit (Q3–Q4 of the course).
JSCAD **is vendored** — `@jscad/modeling` and `@jscad/regl-renderer` live in
`public/reshape/lib/` and are loaded by `public/reshape/runner.html` over relative
paths. Nothing loads from a CDN at runtime.

## What's in this folder

| File | Covers |
|---|---|
| `reference.md` | Hand-authored API reference — the exact function subset the course teaches, with signatures + examples |
| `challenges.md` | Challenge ladder written against the real @jscad/modeling API |
| `CLAUDE.md` | How the app integrates JSCAD (the runner, vendored versions, the additive scope shim) — dev reference |
| `LICENSE.md` | License notes for @jscad/modeling and @jscad/regl-renderer |
| `index.html` | Docs index page (open `docs/` in a browser) |

## Where the docs live in the app

- **In-app:** `/docs/reshape` — built from `lib/reshape-docs.ts`, with live
  runnable examples in the same sandbox style as `/docs/moshion`.
- **External (canonical):** https://openjscad.xyz/docs/ — the generated JSDoc
  for the full `@jscad/modeling` surface. The in-app docs cover only what the
  course teaches; the external docs cover everything.

## Versions

- `@jscad/modeling@2.13.0` — vendored at `public/reshape/lib/jscad-modeling.min.js`.
- `@jscad/regl-renderer@2.6.15` — the 3D viewport renderer, vendored at
  `public/reshape/lib/jscad-regl-renderer.min.js`.

## Licensing

`@jscad/modeling` and `@jscad/regl-renderer` are MIT. See `LICENSE.md`.
