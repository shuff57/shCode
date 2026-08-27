# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
JSCAD integration in this repository.

## Repository layout

JSCAD **is vendored**. Both bundles live in `public/reshape/lib/` and nothing
loads from a CDN at runtime.

- `public/reshape/lib/jscad-modeling.min.js` — `@jscad/modeling@2.13.0` (UMD).
- `public/reshape/lib/jscad-regl-renderer.min.js` — `@jscad/regl-renderer@2.6.15` (UMD).
- `public/reshape/runner.html` — the 3D preview iframe. Same shape as
  `public/moshion/runner.html`: reads the student code from `?code=<base64url>`,
  pipes console + errors to the parent over the `preview-console` /
  `preview-error` protocol, loads the two vendored bundles by relative path,
  installs the additive scope shim, runs `main()`, renders with
  `@jscad/regl-renderer`.
- `public/reshape/reshape.js` — **reSHape**, the simplified nine-name layer the
  course teaches for the whole of Q3. Additive, in its own file, loaded by
  `runner.html` after the shim and before student code. See the amended
  invariant below.
- `lib/reshape-docs.ts` — the in-app `/docs/reshape` content (sections, pages,
  runnable examples). Hand-authored against `@jscad/modeling@2.13.0`.
- `components/ReshapePreview.tsx` — iframe wrapper; takes `{ code, runKey }` and
  builds `src=/reshape/runner.html?code=…&r=…`, mirroring `MoshionPreview.tsx`.
- `app/docs/reshape/` — the in-app docs route (reuses the moSHion docs client
  and sandbox components).
- `lessons/reshape-*` — the JSCAD lessons (reshape-intro, reshape-2d-shapes,
  reshape-booleans).

## Versions (keep in sync)

- `@jscad/modeling@2.13.0` — vendored at `public/reshape/lib/jscad-modeling.min.js`.
- `@jscad/regl-renderer@2.6.15` — vendored at `public/reshape/lib/jscad-regl-renderer.min.js`.

If either version bumps, re-download the bundle into `public/reshape/lib/`, then
re-check the collision list in the shim banner in `public/reshape/runner.html`
(`window.__jscadBareNamesSkipped` in the preview console is the live answer)
and update the version notes here and in `docs/README.md`.

## Runtime architecture

The preview iframe (`public/reshape/runner.html`):

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
  renamed and no geometry is wrapped in a custom class. The test that matters:
  a student file written in the `require` / `module.exports` form must still
  paste into jscad.app and run.

  **This invariant used to end "and no new function name is invented", and
  reSHape deliberately amends that half of it.** The SHIM still invents nothing —
  it copies real names onto `window` and does not add a tenth thing. reSHape is a
  separate additive layer in its own file, `public/reshape/reshape.js`, loaded
  after the shim and before student code, which adds nine NEW names (`box`,
  `rect`, `disc`, `ball`, `tube`, `extrude`, `revolve`, `turn`, `sit`) and
  never renames, wraps or overwrites a real one — every name is a new word, not
  an abbreviation of the function it stands for, and any name already on
  `window` is skipped and reported in `window.__reshapeNamesSkipped`. It exists
  because the real API forces an object literal *and* an array literal into a
  fourteen-year-old's first 3D line, which puts the brace where it is only
  punctuation. reSHape makes required values positional and every named extra an
  optional trailing `{ }`, so `box(40, 20, 10)` is day one and
  `box(40, 20, 10, { center: [0, 0, 10] })` is the day the model needed
  something — which is the objects lesson the book has no chapter for yet.
  Every reSHape call returns the same real geometry the call it stands for
  returns, so the two vocabularies mix in one file and graduation is a rename.
  Its own banner carries the design; `scripts/reshape-simple-checks.mjs` carries
  the expectations.

  **`turn` is the one exception, and it diverges twice.** The pivot is the
  known half: it rotates about the shape's own middle, not the world origin.
  The second half is the consequence, and it is a *loss* — rotating about a
  shape's own middle **commutes with `translate`**, so `turn(a, translate(t, s))`
  and `translate(t, turn(a, s))` are the same model, always, while with
  `rotate` they are two different models. "The order you apply transforms in
  changes the answer" therefore **cannot be shown with `turn` at all**, which
  also means `turn`'s graduation lesson is *not* "this is why you build at the
  origin and translate last" — with `turn` that advice makes no difference.
  Both facts are stated in the banner and in `reference.md`, and both halves
  are asserted by `TURN_COMPOSITION` (turn must commute; `transforms.rotate`
  must still not). The order lesson stays teachable because reSHape renames
  nothing: `rotate` and `translate` are bare, real, and what the book prints.

  **A refusal always names the real function.** A key reSHape does not have, a
  `{ }` written where the real API wants one, a third argument to `turn` — each
  is refused with the JSCAD name that does take it, and where the refused key
  is a real key of that call (`revolve` + `angle`, `extrude` + `twistAngle`)
  the message spells the call out. That is the escape hatch the layer promises,
  at the moment a student most needs it: §9.1's own worked example is
  `extrudeRotate({ segments: 8, angle: TAU / 2 }, profile)`, so "revolve has no
  option called angle" on its own is a dead end in the chapter `revolve` exists
  for. `REFUSALS_NAME_THE_REAL_CALL` pins it, including the two calls
  (`turn(45, s, 30)`, `sit(s, { modes })`) that were measured being accepted and
  silently ignored.
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
  `lib/reshape-docs.ts` and every ` ```js ` block in `docs/reference.md` is run
  by `npm test` against the vendored bundle, in a require-only context — the
  jscad.app environment, with the shim subtracted back out. An example that
  needs a bare shim name fails the build.
- **The in-app docs and `docs/reference.md` must stay in sync.** They cover
  the same API subset; a new page in one belongs in the other. `npm test`
  enforces this: the two files must document the same set of
  `@jscad/modeling` function names, with any deliberate asymmetry recorded in
  `DOC_SYNC_EXCEPTIONS` in `scripts/reshape-checks.mjs`.

## The gate

`npm test` (or `npm run test:jscad`) runs `scripts/test-reshape.mjs` — 449 checks
in eight groups: BUNDLE, SHIM, API, RENDERER, DOCS, SYNC, REACH, SIMPLE. It
evaluates the real vendored bundles, the scope shim **cut live out of
`runner.html`**, and `public/reshape/reshape.js` read off disk, in a `node:vm`
context — so editing any of the three tests the edit; nothing is reimplemented
in the test.

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

The SIMPLE group adds twelve more, the first three about reSHape staying additive: none of its
nine names exists before `reshape.js` runs, no real JSCAD name resolves to
anything different afterwards, and every reSHape call builds geometry **identical**
to the real call it stands for — serialised and compared, not just counted, so
a helpful default drifting in would fail. `turn` is exempt from that last one on
purpose and is pinned to the in-place expectation instead, with a counter-case
that fails if it ever becomes a plain `transforms.rotate`.

The fourth is the one to know about. **The graduation table in `reference.md`
is executed, both halves of every row, and the two results compared as whole
geometry.** That table is the only place a student is handed the real call to
copy at the moment they leave reSHape, and proving `reshape.js` matches the real
API proves nothing about what the docs *say* the real API is. The two drifted
once already: the `sit` row was missing `grouped`, which is correct for a single
shape and silently collapses an assembly onto `z = 0` — every part dropped
separately, parts interpenetrating, no error — in exactly the two sections
(§9.2, §10.1) that are entirely about assemblies. The gate was green throughout.
A row with no executable right-hand cell (`turn` alone) has to be listed in
`GRADUATION.prose` with a reason, and a stale exemption fails rather than
quietly excusing a new row. `GRADUATION_TRIPWIRES` holds the counter-cases that
stop a row becoming decoration.

The fifth and sixth close the two holes that table left. **`reference.md` also
carries the table the other way round** — real name on the left, reSHape word on
the right, under `#### Reading the book` — because the seven written Q3 chapters
are in the real API, so a student *reads* `cuboid` and has to write `box`.
Measured on the chapter sources: 177 of the 273 calls in the assigned reading
— 65% — are in a spelling reSHape replaces, and three mappings (`extrudeRotate`
→ `revolve`, `align` → `sit`, `rotate` → `turn`) cannot be guessed backwards
at all. `REVERSE_LOOKUP` asserts every name reSHape stands in for has a row pointing
at the right reSHape word. And **every `shcode-only` example in `reference.md` is
now executed** in the reSHape context. They were previously asserted only to
*fail* portably — which is what the tag means — so nothing ever checked that
they work, and the `turn` examples, the ones a student is likeliest to copy out
of the hardest section, had never been run at all.

The seventh, eighth and ninth were added after the reverse table was measured
against the chapter sources rather than eyeballed.

**The bridge.** `REVERSE_LOOKUP` asks whether every name *reSHape replaces* has a
row. A student reading the book asks whether every name they can *type* has one,
and eight did not — `cube` among them, at 12 calls across four chapters and in
the opening runnable block of the whole unit, with `box(10, 10, 10)` being
exactly it and nothing shCode shipped saying so. `BOOK_CENSUS` records the
measurement as data (the chapters live in another repository, so `npm test` must
not need it checked out) and the gate asserts that **every one of the 273 calls
the seven chapters make has a row** on one of `reference.md`'s two bridge
tables, never both, and that the second table names only things the library
really exports. `BRIDGE_WARNINGS` then asserts that the rows which are *not*
renames say so: `SIT_VS_BOOK_ALIGN` measures the one that was quietly wrong —
`sit` is hard-wired to `modes: ['none','none','min']` and not one of the four
`align` calls in the chapters is written that way, so a student following the
old row got a part on the bed but still off to one side, with no error.

**`TAU`, which is not a name.** §9.1 types a bare `TAU` in five runnable blocks
and the option tables print it a dozen more times. The shim installs module
members one level deep and `TAU` lives one level below that, at
`maths.constants.TAU` — so it is genuinely not in scope here, and reSHape's own
refusal messages used to hand a student a call containing it. `BOOK_IDENTIFIERS`
asserts it is still out of scope (the day it is not, delete the docs it guards),
that `constants.TAU`, `maths.constants.TAU` and `Math.PI * 2` all evaluate to
2π, and that `reference.md` says so. `REFUSAL_CALLS` closes the other half:
every call a refusal spells out is lifted from the message verbatim and
**executed**. That also made `REAL_EXTRAS.extrude` reachable for the first time
— `extrude` never calls `readOptions`, so its hints had never fired and its
refusal stopped at a function name.

**The object literal, measured.** The layer's whole defence is that it postpones
objects rather than hiding them, and the section making that argument held
exactly ONE live object literal, because every other brace on the page was
inside a `//` comment showing the real API. `OBJECT_DEPTH` counts the option
objects a student can actually run in that section, how many carry more than one
key, and whether each of the three keys reSHape ships is *worked* rather than
merely tabled — plus `getParameterDefinitions`, which stays real JSCAD, is
executed and checked to be an array of genuinely different object shapes whose
declared defaults reach `main()`. `PARAM_DEFAULTS` pins the trap that goes with
it against `runner.html` itself: the sandbox reads `initial` / `default` and
nothing else, so a `checkbox`'s `checked` never arrives.

**And the keys, swept.** A name only counts as translated if the keys beside it
do something, and JSCAD ignores an unknown option without a word — so
`BOOK_OPTION_KEYS` builds every option key the seven chapters print twice,
with two different values, and compares. Thirteen of the fourteen pairs are
fine. The fourteenth is §8.1's glyph exercise, which writes
`vectorText({ height: 8, inputText: 'J' })` — there is no `inputText` option, so
that call, the same call with `'H'`, and the call with no letter at all come
back byte-identical. The chapter then says "run, then swap 'J' for 'H'". The
real key is `input`, the `vectorText` row says so, and `changes: false` asserts
the defect is still there rather than tolerating it.

**The words that are not calls.** Every check above answers a *name*, and
`BOOK_CENSUS` counts *calls* — so a word the book prints inside an object
literal was covered by nothing, and the coverage claim stayed true while a
student stalled. It happened twice, and both times the underlying defect was
the same: two doc surfaces disagreeing, with `reference.md` — the file the
reSHape section tells a student to keep open — the poorer of the two.

First, `type: 'float'`. A reSHape-only reader translated all 28 of §8.5's calls
and stopped on line two of its first parameter block. `reference.md`'s
parameter table had four rows (`number`, `text`, `checkbox`, `choice`); the
seven chapters print seven types, and the in-app docs taught `int`, `slider`,
`color` and `group` that `reference.md` did not. Worse, the in-app docs said
"**three** of the types hand you a number", which does not merely omit `float`
— it counts the numeric types and gets the wrong answer, so a student who
trusted the docs was told `float` did not exist. It always worked: `initialOf`
in `runner.html` reads `initial` then `default` and **never looks at `type`**.
`PARAM_TYPES` pins the census (27 definitions, seven spellings), one check per
spelling for its row, both doc surfaces for the list, the in-app count against
the list, and — from both ends — that `type` picks the control while `initial`
carries the value: structurally against `initialOf`, and behaviourally by
declaring each type and reading the value back out of `main()`, including a
type that is not a JSCAD type at all.

Then, swept for rather than found by hand: `twistAngle` / `twistSteps`. §9.1
types them in three runnable editors, `extrude` has no options object at all,
and the `extrudeLinear` row was a plain rename with no warning — while the two
words appeared **nowhere** in `reference.md`. `BOOK_OPTION_WORDS` is the
generalisation: every option key the seven chapters type, one check each,
asserting `reference.md` writes it. That is the wall that should have caught
both, and the reason a third one of this shape is a build failure rather than a
critic's finding.

One consequence worth writing down: **`revolve` is the one reSHape name whose
`{ }` changes ends on graduation.** reSHape's grammar has no exceptions — every
extra rides in a trailing `{ }` — but `extrudeRotate` and `extrudeLinear` take
theirs first. `extrude` hides that (its required value *becomes* the leading
`{ height: … }`); `revolve` cannot, because its required value is the shape. So
`revolve(profile, { segments: 16 })` is `extrudeRotate({ segments: 16 }, profile)`.
The swap is a table row, a paragraph in `reference.md`, and a named error rather
than an inherited surprise.

Runtime builders must not edit `scripts/test-reshape.mjs`,
`scripts/reshape-checks.mjs` or `scripts/reshape-simple-checks.mjs`. A red check is
closed by fixing the runner, `reshape.js`, the bundles, or the docs.

## Consuming JSCAD (context for user-facing questions)

Students write a single-file CommonJS-style program: `require` the library,
define `main()`, export it. The app renders the result in a 3D viewport.
The canonical external environment is jscad.app; the in-app preview is a
teaching sandbox with the same library and a subset of the UI.
