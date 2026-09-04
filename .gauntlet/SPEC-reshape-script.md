# reSHape Script — the scripting side of the B-rep build

Status: spec, 2026-09-03. Operator asked for "a scripting version for our
B-rep build" and for JSCAD to be replaced in the docs, UI and examples.

## The one idea

A reSHape script is the Build timeline written down. Every call appends one
step to the same `ModelDoc` the Build tools produce; the same kernel builds
it; the same Dimensions panel, handles, timeline chips, refusals, exports and
oracle tests apply. There is no second geometry API. Code mode and Build mode
are two views of one document.

```
   script (sandboxed iframe)           parent page
   ┌──────────────────────┐   doc     ┌──────────────────────────────┐
   │ box(40,40,20)        │ ───────▶  │ buildDoc(oc, doc)  (kernel)  │
   │ hole(b, {across:6})  │  JSON     │ viewport · panel · timeline  │
   │ hollow(b, {wall:2})  │           │ refusals · export · oracle   │
   └──────────────────────┘           └──────────────────────────────┘
```

Consequences that fall out for free:
- No `getParameterDefinitions()`. Every number in the doc is a slider already
  (`generatedParams`). A script may name a number with `param()` (below) to
  give it a caption; otherwise it gets the Build tool's caption.
- The kernel never enters the iframe. The iframe only produces JSON, so the
  sandbox stays `allow-scripts` without `allow-same-origin`, and the 23 MB
  wasm loads once, in the parent, exactly as Build does today.
- Build → Code is codegen from the doc (`toScript(doc)`, replacing
  `toReshape`). Code → Build is running the script. Both directions produce
  the same doc, so switching sides loses nothing.
- Refusals are the kernel's, with the same sentences ("Hollowing Hollow 1 to
  15 thick would collapse it -- the wall has to be under 10. …").
- The oracle (`scripts/oracle-measure.mjs`, `test-occt-adapter.mjs`) tests
  scripts by running them to a doc first; the 227 reference examples become
  the fixture set.

## The language

Plain JavaScript, run once per rebuild, in the iframe. The vocabulary is the
Build toolbar's words, not CAD's. Numbers are millimetres. Angles are
degrees. Faces are plain words. The first argument of a step is always the
thing it acts on.

### Shapes (each returns a handle, and adds a step)

```js
const b = box(40, 40, 20)                 // width, depth, height, centred at the origin
const c = cylinder(30, 80)                // across, tall
const s = sphere(30)                      // across
const k = cone(30, 40)                    // across at the base, tall (comes to a point: ConeFeature has one radius)
const r = ring(40, 8)                     // across, tube across (torus)
box(40, 40, 20, { at: [50, 0, 0] })       // any shape takes `at`
box(40, 40, 20, { corner: 4 })            // round every edge of a box or cylinder
```

Defaults match the Build tools' defaults (`newShape`, `newHole`, …), so
`box()` alone is the 40×40×20 the toolbar makes, placed clear of what exists.

### Steps (each acts on a handle, returns the same handle, adds a step)

```js
hole(b, { across: 6 })                    // through, by default (depth = extent + 2)
hole(b, { across: 6, deep: 10 })          // a pocket
hole(b, { across: 6, at: [10, 0], along: 'x' })
holes(b, { across: 6, apart: [15, 10] })  // four corners
hollow(b, { wall: 2 })                    // closed
hollow(b, { wall: 2, open: 'top' })       // one face left open
round(b, 3)                               // every edge (a box/cylinder property)
round(b.edge('top', 'front'), 3)          // one edge, named by its two faces
bevel(b.edge('top', 'front'), 3)
repeat(b, { count: 3, step: 60 })         // linear, along x; step: [60, 0, 0] for any axis
repeatAround(b, { count: 6, axis: 'z' })  // circular
mirror(b, 'left-right')                   // 'front-back' | 'top-bottom'
move(b, [20, 0, 0])                       // move; copy: true keeps the original
turn(b, [0, 0, 45])                       // rotate, degrees
join(b, c)                                // union; cut(b, c); keep(b, c) (intersect)
draft(b.face('right'), 8, { from: 'bottom' })
```

### Sketches

```js
const sk = sketch('front')                // 'top' | 'front' | 'side', optional offset
sk.rect(20, 10); sk.circle(8, { at: [10, 0] }); sk.polygon([[0,0],[20,0],[10,15]])
const p = pull(sk, 30)                    // extrude
const v = spin(sk, 360)                   // revolve
const bl = blend(sk1, sk2, 20)            // loft
```

### Names

- Faces: `'top' 'bottom' 'front' 'back' 'left' 'right'` map to the primitive
  face parts `+z -z -y +y -x +x` (`namePrimitiveFace`). A cylinder also has
  `'side'`.
- Edges: `shape.edge(faceA, faceB)` is the `between` name of those two faces,
  exactly what the viewport's edge pick produces. A script never sees a face
  index.
- Step handles: every call returns the handle it acted on; `b.id` is the
  feature id (`box1`, `hole1`, …), the same id the timeline chip shows.

### Parameters

```js
const wall = param('wall', 2, { min: 0.5, max: 10 })   // named slider in the panel
hollow(b, { wall })
```

`param()` registers a caption and bounds and returns the current value. A
slider drag re-runs the script with the new value (same `reshape-set-params`
message the JSCAD runner answers today). Unnamed numbers still get the Build
tool's automatic slider.

### What is deliberately not in the language

No `require`, no modules, no raw kernel calls, no mesh access, no
`getParameterDefinitions`, no `main()`. A script is a straight run of steps;
loops and `if` are ordinary JavaScript and simply add steps.

## Amendments from the build (2026-09-03)

- `cone(across, tall)`: two arguments. `ConeFeature` carries one radius, so a
  frustum is not expressible; the Build tool makes the same cone.
- `sk.round(corner, radius)` and `sk.chamfer(corner, distance)`: sketch corner
  treatments the Rules panel already supports; without them a rounded sketch
  corner is unreachable from a script and the oracle round trip fails.
- `draft(face, angle, { from: 'bottom' })` also accepts `{ neutral: N }` as an
  escape hatch, because `DraftFeature.neutral` is not always a bounding-box
  extreme.
- `holes(b, { apart: [dx, dy] })` is full corner-to-corner spacing; the
  document stores half-spacings.

## Runtime pieces

| Piece | File | Notes |
| --- | --- | --- |
| DSL → doc | `lib/reshape-script.ts` | pure; `runScript(source): { doc, params, errors }`; every call validated with the same refusal sentences `reshape.js` uses today (`requireNumbers`, `readOptions`) |
| doc → DSL | `lib/reshape-script-gen.ts` | `toScript(doc)`, one line per feature, every number a literal or a `param()`; replaces `toReshape` for the editor; `toReshape` stays for the oracle until the docs move |
| iframe runner | `public/reshape/script-runner.html` | loads `reshape-script.js` (compiled by `scripts/build-brep-kernel.mjs` beside the kernel), evals the script, posts `reshape-doc {doc, params}` and `preview-error`; answers `reshape-set-params` by re-running |
| parent | `components/ReshapePreview.tsx`, `SandboxWorkspace.tsx` | `engine='script'`: on `reshape-doc`, `loadDoc(doc)` into the existing B-rep viewport; Build's `HandleOverlay` and panel keep working because it is the same doc |
| tests | `scripts/test-reshape-script.mjs` | run every reference example through `runScript`, then `buildDoc` on the kernel, compare volume/bbox to `.gauntlet/oracle.json` where a fixture exists; assert every refusal sentence |

Errors a student can make get the sentences the Build side already uses, in
the timeline strip, never a stack trace. A script that throws keeps the last
good doc on screen (the refusal pattern), with the line number.

## Migration

1. Runtime (`lib/reshape-script.ts` + runner + parent wiring) behind
   `engine='script'`, Code mode still JSCAD until step 3.
2. `toScript(doc)` and the Build → Code handoff; a Code → Build switch runs the
   script and adopts its doc (today's one-way "never parsed back" note goes
   away).
3. The reference: `public/reshape/docs/reference.md` and `lib/reshape-docs.ts`
   rewritten in this vocabulary, one page per Build tool, every example run by
   `test-reshape-script.mjs`. The JSCAD reference moves to
   `public/reshape/docs/jscad-legacy.md` behind `?engine=jscad` until the
   lessons that might cite it are written (none do today).
4. UI strings: no `getParameterDefinitions`, `@jscad/modeling`, `cuboid`,
   `main(p)`, "JSCAD" anywhere a student can read.
5. Flip Code mode to `engine='script'`; keep the JSCAD runner reachable one
   release behind `?engine=jscad`; then delete it and `public/reshape/lib/`.

## Bar for the loop that builds it

Oracle: the 227 reference examples, re-expressed in the DSL, must produce
the same solids the JSCAD versions do where JSCAD could (volume and bbox
against `.gauntlet/oracle.json` and analytic values), and every Build-only
capability (one-edge round, open hollow, draft) must be expressible in one
line. Then the three student lenses work the rewritten reference's first
ten pages; pass when all three finish without the language or the runner
getting in the way.
