# Vendored moSHion: where this copy came from

| | |
| --- | --- |
| Source repo | `shuff57/moshion` (local checkout `../moshion`) |
| Commit | `11caeb5` (`moshion.js`, `docs/moshion.d.ts`), branch `main` (= `origin/main`) |
| Commit date | 2026-11-12 |
| Vendored | 2026-11-12 (`a662f3d`: `textStyle(NORMAL \| BOLD \| ITALIC \| BOLDITALIC)` (shCode #103), on top of `3f1e70a`'s API audit, `90921bd`'s `textLayer(n)`, `b1a2575`'s `sprite.clone()` and `world.maxSpeed`, `f3e1378` and the `f259b22` sound sync). `textStyle` was first patched in here by hand (`61cfed53`); this sync replaces that patch with the upstream engine, which matches it, so the copy is now upstream `a662f3d` plus the local lines below. |

**`3f1e70a` (2026-11-12), the API audit.** Fixes and one consistent shape, no new
subsystem:

- `sprite.w`/`h` (and `width`, `height`, `hw`, `hh`, group default sizes) resize
  the collider; they were plain fields, so drawing and physics could disagree.
- Group look/material settings (color, size, collider, bounciness, friction,
  ...) reach the members a group already has, not only new ones.
- One table of touch verbs on Sprite, Group and Sensor; sensors gain
  `overlapped()` and callbacks. `overlaps()` is still a live query.
- Mouse verbs take a button (`mouse.presses('right')`); `mouse.drag()` is
  callable. A mouseup with no press on the canvas is no longer a click.
- `collider` is the one body-type setting (`body`, `physicsType` alias it);
  a misspelt collider or shape throws a plain error. `new Sprite(x, y, d,
  'static')` is a static circle; `new Sprite()` sits where the camera looks.
- `getSpriteAt` takes a point and finds HUD sprites; `world.rayCast` with no
  callback returns the closest solid hit or null; `GrabberJoint.target` is
  settable; `joint.remove()`; `angleMode(DEGREES)` for cos/sin/tan/atan/atan2.
- The loop runs 60 game frames a second on any screen (a 144 Hz monitor ran
  every per-frame unit 2.4x fast).
- `random()` is reseeded per run by `runner.html` (added here by hand, see
  below); the engine's own default seed stays fixed.

Proof, 2026-11-12: every moSHion sketch in the course (586: lesson
`solution.js`/`script.js`, the `solution/` directory form, `js live` blocks and
the examples in `lib/moshion-docs.ts` as of the previous commit) was run in
`scripts/moshion-harness.mjs` on `90921bd` and on `3f1e70a`, 180 frames each,
once with no input and once with a fixed mouse and keyboard script,
`Math.random` seeded the same; the hash of every draw op, the console, errors,
audio log and every sprite's position at frames 60 and 180 matched for all
586. A canary (the default sprite colour changed by one word) differed in 67,
so the comparison does see changes. Not covered by it: the 60-frame cap (the
harness steps its clock by exactly one frame) and the per-run seed (the
harness does not load `runner.html`). Upstream gates: `tests/api-audit.spec.mjs`
(35 checks) and the rest of the moshion suite, all passing.

**`11caeb5` (2026-11-12), fonts and text layout.** On top of `a662f3d`, changing
only the text section and `runner.html`:

- `textFont('name')` (15 built-in fonts in `fonts/`, or a saved `font:<name>`
  data URI), `fontNames()`, `textWeight(100..900)`; `textStyle()` now sets weight
  700/400 and italic.
- `textDecoration(UNDERLINE | STRIKETHROUGH | NONE)`, `textOutline(color, px)`,
  `textSpacing(px)`, `textLeading(px)`, `textWrap(width, WORD | CHAR)`, and `\n` in
  `text()` starts a new line.
- `runner.html` loads `fonts/fonts.js` before the engine and waits up to 2 s for
  the fonts a sketch names. shCode's copy of the fonts is `public/moshion/fonts/`
  (`scripts/fetch-moshion-fonts.mjs`, catalog base `/moshion/fonts/`); the
  sandboxed runner needs `/moshion/fonts/*` allowed cross-origin (`public/_headers`,
  `server.js`).
- Proof: shCode's gate, 695/695 course and docs sketches unchanged, 101/101
  checks (two new: fonts and weights, lines and decoration).


`main` now carries both the default-gravity-0 change (`91f7e6b`, vendored
2026-11-01) and the math coordinates work on top of it (`4b36bef` engine,
`b7186a2` its browser spec, `d8068bb` docs).

This sync adds one opt-in mode and two helpers, and changes no default:

- **`world.origin = 'math'`**: (0, 0) at the canvas centre, y grows up, a
  positive rotation turns counter-clockwise; a falling world is
  `world.gravity.y = -10`. The default stays `'screen'` (top-left, y down,
  like the browser canvas and p5play).
- **`showGrid(step)`** (labelled axes, default step 50) and **`showMouse()`**
  (the pointer's (x, y)), called from `draw()`, label whichever mode is active.

No sketch that never sets `world.origin` changes. Proof, 2026-11-02: every
moSHion sketch in the course (the `test-moshion.mjs --corpus` discovery plus the
`solution/` directory form, and the examples in `lib/moshion-docs.ts` as of
HEAD) was run in `scripts/moshion-harness.mjs` on the old engine (`91f7e6b`)
and this one, 180 frames each, once with no input and once with a fixed mouse
and keyboard script, `Math.random` seeded the same; the hash of every draw op,
the console, errors, audio log and every sprite's position at frames 60 and
180 matched for every sketch. Gravity's own audit is in
`codehs-review/loop/gravity-default-audit.md`.

A later sync, 2026-11-03 (`f259b22`), adds the sound work. `f3e1378` (2026-11-06)
adds one `window` `blur` listener that releases every held key and mouse button
(shCode issue #78); its gates are upstream `tests/focus.spec.mjs` and the "losing
focus releases a held key" check in `scripts/moshion-checks.mjs`.

`90921bd` (2026-11-11) adds `textLayer(n)` (shCode #101): after it, `text()` called
from `draw()` is painted among the world's sprites, over every sprite whose
`.layer` is `n` or lower and under every higher one; `textLayer()` goes back to
painting at once. Only `moshion.js` and `docs/moshion.d.ts` came over (the same
diff applied to this copy, so the shCode-only lines below stay). Proof: 692 of
the 693 course sketches (lessons, live blocks, `solution/` variants, docs
examples) hash identically on `b1a2575` and `90921bd` over 180 frames with
`Math.random` seeded; the one that differs is the new docs example, which calls
`textLayer()`. Gates: upstream `tests/textlayer.spec.mjs` and the `textLayer(n)`
check in `scripts/moshion-checks.mjs`. The docs page "Text between sprites:
textLayer()" is in both `lib/moshion-docs.ts` and upstream `docs/data/moshion-docs.js`.

`b1a2575` (2026-11-06) adds `sprite.clone()` (shCode #87: looks and physics,
starts still, same groups) and `world.maxSpeed` (shCode #84: planck's per-step
cap in px/frame, default still 60, one console warning naming it when a speed
is set past it). Gates: upstream `tests/clone-maxspeed.spec.mjs` and the two
checks of the same names in `scripts/moshion-checks.mjs`. The two docs pages
("Copying a sprite: clone()", "The speed cap: world.maxSpeed") are added by
hand to `lib/moshion-docs.ts`, whose "Gravity and velocity" page now points at
the cap instead of calling it fixed. `loadSound('name')`
looks a bare code-safe name up in the store under `sound:<name>` before using
it as a URL; a path or a data: URI still bypasses the store. The 8-bit palette
(`coin`, `music`, and the effect/menu cues) is upstream now too.

## Copied byte for byte from that commit

- `planck.min.js` (unchanged by this sync)
- `docs/moshion.d.ts` (`World.origin`, `showGrid`, `showMouse`, the
  "90 is down by default and up in math mode" notes, and the 2026-11-03
  `loadSound` saved-name note), `docs/challenges.md` (unchanged by this sync)
- `textures/*.png`, `textures/LICENSE.txt` (unchanged by this sync)
- `assets/grass_tile.png`, `assets/ground_tile.png` and the other picture
  assets (unchanged by this sync)

## Copied with one change

- `moshion.js`: one line differs. The empty-catalog fallback near line 495
  (it was near line 387 before this sync) returns `base: '/moshion/textures/'`
  here, `base: 'textures/'` in the repo. shCode serves the engine at
  `/moshion/`, so texture URLs need the absolute path. Re-apply this line
  after every copy. The two sound comment blocks also name the shCode mixer and
  `/moshion/assets/` here where the repo says "host page" and `/assets/`; the
  code is identical.

## Kept as shCode's own (do not overwrite from the repo)

- `assets/coin.wav`, `assets/music.wav`, and the 8-bit palette beside them
  (`jump`, `hit`, `laser`, `powerup`, `explode`, `blip`, `select`, `tone`,
  `title`, `win`, `lose`). Since upstream `f259b22` these are the SAME files
  there, so a resync may copy them. They are generated in shCode by
  `node --import ./scripts/register-ts.mjs scripts/make-moshion-sounds.mjs`,
  which drives the vendored jsfxr and ZzFXM engines in `lib/sound/vendor/`
  (Unlicense and MIT respectively); re-run it only when the palette changes.
- `runner.html`. The repo's runner takes the sketch over `postMessage`; this
  one reads `?code=<base64url>`, which is what `components/MoshionPreview.tsx`
  builds. Copying the repo runner without changing the host would leave every
  preview blank. Upstream behaviour is ported by hand instead: from `3f1e70a`,
  the `randomSeed(...)` line after `extras.js` that gives each run fresh dice.
- `textures/textures.js`, `textures/textures.json`. Generated by
  `scripts/make-moshion-textures.py` with base `/moshion/textures/`;
  `scripts/check-moshion-textures.mjs` checks them against the PNGs.
- `docs/README.md`, `docs/CLAUDE.md`, `docs/LICENSE.md`, `docs/index.html`.
  These name shCode paths (`scripts/make-moshion-textures.py`,
  `public/moshion/textures/`) where the repo's name its own. Engine
  invariants are added to `docs/CLAUDE.md` by hand: the exact overlap
  broadphase, render culling and `addSensor` in the 3b77bf6 sync, the
  gravity-starts-at-0 note in the 91f7e6b one, the `world.origin` bullet and
  the "Coordinates (`world.origin`)" section in this one.
- Not copied: the repo's `docs/data/moshion-docs.js` (its docs site; shCode's
  in-app docs are `lib/moshion-docs.ts`, which carries the same three gravity
  wording changes and, from this sync, the three-page Coordinates section by
  hand), the repo's `README.md`, `assets/favicon.svg`, `index.html`,
  `sandbox.html`, `games/`, `tests/` (including `tests/math-origin.spec.mjs`).

## To resync

1. Copy the files in the first two lists from the new commit, then re-apply
   the `/moshion/textures/` line in `moshion.js`. The WAV palette now matches
   `f259b22`; copy it or leave it, the files are identical.
2. Run `node scripts/generate-moshion-completions.mjs` (the editor's autocomplete is built
   from `docs/moshion.d.ts`; `test-editor-completions.mjs` fails while it is stale), then
   `node --import ./scripts/register-ts.mjs scripts/check-moshion-textures.mjs`
   and `node --import ./scripts/register-ts.mjs scripts/test-moshion.mjs`.
3. Update the commit, dates and lists in this file.

## Local additions (not upstream)

- **`extras.js`** — `rgba(r, g, b, a)` and `randomColor(a)` / `randomColor(minA, maxA)`, the
  colour helpers documented under Canvas → "A colour with alpha". It is loaded after
  `moshion.js` by `runner.html` and by `scripts/moshion-harness.mjs`, so a sketch behaves the
  same headless. It is shCode's file, not the engine's: it is absent from an upstream sync and
  must be re-checked after one. Tests: `scripts/test-moshion-extras.mjs`.

**Assets, 2026-11-07.** The texture catalog (105: terrain, things, battle,
numbers and candy added) and the 10 designed board-game sounds were made here
and pushed upstream as `shuff57/moshion` `ee992a9`, with the docs' Textures page
and the README's sound list. The engine is unchanged (`moshion.js` still matches
`b1a2575` apart from the two local lines: the `/moshion/textures/` base and the
`/moshion/assets/` path in the saved-sound comments).
