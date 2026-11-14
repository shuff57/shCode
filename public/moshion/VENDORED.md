# Vendored moSHion: where this copy came from

| | |
| --- | --- |
| Source repo | `shuff57/moshion` (local checkout `../moshion`) |
| Commit | `bb13183` (`moshion.js`, `docs/moshion.d.ts`), branch `main` |
| Commit date | 2026-11-14 |
| Vendored | 2026-11-12 (`a662f3d`: `textStyle(NORMAL \| BOLD \| ITALIC \| BOLDITALIC)` (shCode #103), on top of `3f1e70a`'s API audit, `90921bd`'s `textLayer(n)`, `b1a2575`'s `sprite.clone()` and `world.maxSpeed`, `f3e1378` and the `f259b22` sound sync). `textStyle` was first patched in here by hand (`61cfed53`); this sync replaces that patch with the upstream engine, which matches it, so the copy is now upstream `a662f3d` plus the local lines below. |

**`510da29` (2026-11-14): `ani.loop = n`.** `sprite.texture.loop = 3` plays an animation three times, then it stays on the last frame; `true` forever, `false` once; `frame = 0` starts the count over. Engine and `moshion.d.ts` copied from upstream `250b27e`; the in-app docs (Textures, animation page) say so. Copy equals upstream apart from the `/moshion/textures/` line.

**Colours from numbers (2026-11-13; merged upstream into `main` as `361b3f8` on 2026-11-14, so this copy now equals upstream `main` apart from the `/moshion/textures/` base line).** `fill()`, `stroke()` and `background()` read a colour the way p5 does: a CSS string,
one number for grey, grey and alpha, `r, g, b`, or `r, g, b, alpha` (alpha 0-255). `fill(80, 250, 123)`
used to read only the 80 and paint grey, `fill(0, 0, 0, 120)` came out solid black, and
`background(220)` or `background(40, 42, 54)` handed the canvas a bare number, which it ignores, so the
screen stayed black. The sandbox's own starter uses both. Applied here by hand because the upstream
checkout had another session's uncommitted work; upstream now has the identical code. Gate
check "fill, stroke and background take grey, grey+alpha, r,g,b and r,g,b,alpha like p5" (fails on the
engine before it); 699/699 sketches, 107/107 checks. The docs and the lessons that taught around the old
limit (6.6.19, 6.6.25, 5.3 Pinball challenges, the colour pages) were reworded.

**`f164957` + `4074761` (2026-11-13): one name for a texture.** The engine is now upstream
`4074761` plus the local `/moshion/textures/` line and the fill/stroke/background patch above.

- `sprite.texture` reads back the texture itself, not its name: `.name`, and for an animated one
  the same object as `sprite.ani` (`.frameDelay`, `.frame`, `.tick`, `.loop`, `.frameCount`). A still
  one is a `StillTexture` with the same fields (`frameCount` 1). Both print as their name; no texture
  reads `null`; `a.texture = b.texture` copies by name. Name checks are `s.texture.name === 'coin'`
  (`s.texture === 'coin'` is now always false).
- `ani.loop = false` plays once and stays on the last frame; `frame = 0` replays.
- Setting the texture a sprite already shows does not restart it (set every frame in `update()`, it
  froze on frame 0: seen in a student's door animation).
- `.texture` also reads and switches `addAni()` animations: `sprite.texture = 'run'` is
  `changeAni('run')`; `.texture = null` clears the one showing.

Changed for it here: `extras.js` (online sprite sharing reads `.texture.name`), the 7.16 Quest demo
(and `public/builtin-games.json`), `scripts/moshion-checks.mjs` (three new checks, three reads),
lesson 6.4.6 and the docs teach `.texture` where they said `.ani`, and a What's New entry. A search of
every saved student program (2026-11-13) found one `.texture` comparison, which keeps working.
Gates: upstream `tests/texture-unify.spec.mjs`; here the three new checks in `moshion-checks.mjs`.

**`ed04214` (2026-11-13): `HingeJoint` stiffness and limits (shCode #116).**

- `hinge.stiffness`, 0 (floppy, the default) to 1, holds the pose the two sprites
  started in: a planck motor aimed back at that pose, its strength worked out from
  everything joined on past sprite b, so 1 holds a whole arm up and smaller numbers
  sag. `lowerLimit`/`upperLimit` stop the turn, in degrees from the starting pose
  (the direction of `rotation`); `null` takes a side off. `hinge.angle` reads how far
  it has turned. All three can be options or set later.
- The return speed (2 + 3 * stiffness) was measured: 4 + 16 * stiffness made the
  reporting student's ragdoll and four other sizes shake on the floor for good; this
  one settles to 0 for each. Two ragdolls piled on each other keep a slow ~1 px sway.
- A hinge with no options is unchanged: the per-step drive walks an empty list. The
  gate passes 699/699 sketches (one new docs example) and 106/106 checks (one new:
  "HingeJoint stiffness holds a limb up..."); upstream `tests/hinge-stiffness.spec.mjs`
  (8 checks) plus api-audit, integration, math-origin and web-swinger pass. Applied
  here as the upstream diff, so the local lines below are untouched.

**`91135b4` (2026-11-13): `loadSound('coin')` plays the built-in sound by name.**

- A bare name now resolves saved first (`sound:<name>`), then the built-in `.wav` of
  that name in `assets/` beside `moshion.js` (here `/moshion/assets/`, from
  `document.currentScript`, so no local path line was needed), then the name as a URL.
  It used to look only among saved sounds, so the mixer's own snippet
  `loadSound('coin')` failed with "there is no saved sound called 'coin'".
- The engine's list `BUILTIN_SOUNDS_` is the 23 `.wav` files in `assets/` (the same 23
  as `PALETTE` in `lib/sound/presets.ts`); a name not on it is never fetched from
  `assets/`. The warning now says "no saved or built-in sound", suggests near names
  from both and lists the built-ins; `loadSound('coin.wav')` says to drop the `.wav`.
- shCode side: the Library's Built in "Copy code", the mixer's palette buttons, the
  Sound docs page and its example use the name form; the path form still works.

Proof: upstream `tests/builtin-sounds.spec.mjs` 11/11 (real Chromium with Web Audio:
coin and jump load, a saved `hit` wins, `zap` is not fetched, the warnings); upstream
docs (68 examples), integration and api-audit specs pass. In shCode's dev sandbox,
`loadSound('coin')` reported `loaded: true, 0.22s, error null` with no warning.

**`1ef273a` (2026-11-12): group `scale`, `ani.frame`/`ani.tick`, `addAni` by texture
name, and plain sound warnings (shCode #108, #110, #111).**

- A group's `scale` cascades to the members it already has, like `color`, and one
  axis can be set alone: `walls.scale.y = 3`, `walls.scale = { y: 3 }`. A number or
  `[x, y]` still sets both. It used to be a plain field: new members only, and
  `.y` on the number did nothing.
- `ani.frame` is a setter: a whole number, wrapped (-1 is the last frame), and the
  frame starts from the beginning of its duration. `ani.tick` (new) is how many
  game frames the current frame has shown, settable below that frame's duration.
  A frame past the end used to draw a blank slice, and a jump kept the old count.

- `addAni(name, sheet, frames?)` takes a texture name as the sheet, built-in or saved;
  a drawn animation brings its frame count and durations unless a count is given. A
  name used to become `img.src = 'walk'` and draw nothing. An unknown name warns once.
- A sound that fails to load says why in the console, once per file: no saved sound
  by that name (with the near names, case included), a saved name typed with `.mp3`,
  a file on another website, or anything else with the browser's reason. A `.play()`
  before the sound has loaded says so once. Both were silent; the docs even said "a
  misspelled path shows no error". Checked in the browser on the sandbox; the
  headless harness has no audio, so the gate covers only `addAni`.

Proof, 2026-11-12: all 617 moSHion sketches in `lessons/` (every `.js` file and
`js live` block that touches the engine) were run in `scripts/moshion-harness.mjs`
on the previous engine and on this one, 180 frames, once with no input and once with
a fixed mouse and keyboard script, `Math.random` seeded the same; the hash of the draw
ops, console, error and every sprite's position, scale and frame matched for all 617.
Gates: the checks "a group scale reaches current members...", "ani.frame jumps
to a frame..." and "addAni takes the name of a drawn texture..." in
`scripts/moshion-checks.mjs`; the full gate passes 698/698 sketches and 105/105 checks.
The 617-sketch parity run predates the sound and addAni lines, which only change
failure paths and name-like sheets (no course sketch passes one).

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

**`242f783` (2026-11-12), `deltaTime` (shCode #104).** The milliseconds since the last frame, as in p5
(~16.7 at 60 a second, 0 before the first frame), exposed like `frameCount`. Gate: 698/698 sketches unchanged,
102/102 checks (one new).

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

**Automatic path: `npm run sync:moshion`** (`scripts/sync-moshion.mjs`). It reads upstream `origin/main`
(never the working tree), copies `moshion.js` (reapplying the `/moshion/textures/` line), `docs/moshion.d.ts` and
`planck.min.js`, regenerates the autocomplete, runs the moshion gates, and stamps the Commit row above. `-- --check`
only reports drift; `npm run deploy` runs it first as a warning. Afterwards read the `moshion.d.ts` diff and add
wording to `lib/moshion-docs.ts` for anything new: `scripts/check-moshion-docs-coverage.mjs` (also in `npm test`) fails
while a name in the typings is in neither those docs nor the shrink-only `scripts/moshion-docs-gaps.json`. Two places hold
moSHion docs: shCode's `lib/moshion-docs.ts` (the course reference, the one guarded) and the moshion repo's
`docs/data/moshion-docs.js` (the standalone engine site); they overlap but are not copies. The manual steps below are what it automates.

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
