# moSHion API gaps against a 2D game-dev curriculum

Reviewed 2026-10-30. Read-only review. Repo = `/home/shuff57/Documents/GitHub/moshion` (HEAD `ca3327d`, 2026-10-03);
vendored = `shCode/public/moshion/`. Line numbers are in the REPO `moshion.js` (3226 lines) unless marked "vendored" (3111 lines).
"run" = I executed it in headless Chromium against a scratch copy (nothing in either repo touched). Everything else is code-read.
No CodeHS text is quoted; p5play comparisons are from memory and marked.

## 1. Vendored copy vs repo: DRIFT (vendored is behind)

| File | State |
| --- | --- |
| `moshion.js` | differs, 223 changed lines. Repo is ahead; the vendored file has nothing the repo lacks except cosmetic comment/export order. |
| `planck.min.js` | identical |
| `docs/moshion.d.ts` | differs; lifecycle block (`setup/update/draw/drawTop`) is just moved; repo adds `world.rayCast`, `texture`/`pattern`/group `image` typings, `Ani.frameDelays`/`delays` |
| `docs/README.md`, `docs/CLAUDE.md`, `docs/index.html`, `docs/LICENSE.md` | differ (prose; vendored README says "~800 lines", repo "~2,800"). `docs/data/moshion-docs.js` exists ONLY in the repo |
| `runner.html` | differs: repo takes the sketch over `postMessage` (commit `5ada719`) and scales the canvas to fit; vendored reads `?code=<base64url>` only. shCode's `components/MoshionPreview.tsx:37` builds `?code=`, so the vendored runner still matches its host. Do not copy the repo runner without changing the host. |
| `textures/` | vendored lacks `batFly, beeFly, fishSwim, ladybugWalk, playerWalk (+4 colours), runner, runnerJump, snailCrawl`; `ghost.png`, `textures.js`, `textures.json` differ |
| `assets/` | vendored lacks `coin.wav`, `music.wav`, `grass_tile.png`, `ground_tile.png`, `favicon.svg` |

Features present in repo `moshion.js`, ABSENT in the vendored one (so a lesson using them fails silently in shCode):
- `group.texture` / `group.pattern` / `group.image` cascade (repo 1574-1600; vendored: none)
- `sprite.pattern` (repo 1108) and the shared art cache `loadArt_` (repo 330-348); `sprite.image` accepts `<canvas>`/`<img>`/`ImageBitmap` and falls back to the coloured block when art fails to load
- animated textures with `delays` (repo 400-420)
- `world.rayCast` (repo 1938)
- `fill()` sets `HAS_FILL = true` (repo 2228). Vendored `fill(c)` after `noFill()` leaves fill OFF: a real bug for grid/board drawing.
- `isUrl_` emoji-vs-URL rule is stricter in the repo (a string with `/` or `data:` counts as a URL)

Silent-failure note: `sprite.texture = 'x'` on the vendored file is just a plain property set; nothing is drawn and no warning appears.
No shCode lesson under `lessons/5-*`, `6-*`, `7-*` uses `.texture`, `.pattern`, `rayCast`, `drawTop` or `loadSound` today (grep), so nothing is broken now; it blocks anything new that does.
Smallest fix: re-sync `moshion.js`, `docs/moshion.d.ts`, `textures/`, `assets/*.wav` (keep the vendored `runner.html` unless the host moves to postMessage).

## 2. Need-by-need table

PLACEMENT row names are used for the module column. "Yes" means the symbol exists and I read its implementation.

| Need | Supported? | Evidence | Module that needs it |
| --- | --- | --- | --- |
| Group add/remove/loop | yes | `class Group extends Array` 1545; `add` 1633, `remove` (unparent only) 1623, `delete/deleteAll` 1640, `amount` 1650, `cull` 1733; `new g.Sprite()` factory 1556 | 6.1; projectile candidate |
| Group overlap/collide callbacks | yes (edge/level differ from p5play, see below) | `Sprite.overlaps/colliding/collides/collided/overlapping/overlapped(other, cb)` 1182-1335, each takes a Group and calls `cb(this, member)`; Group versions 1659-1705 | 6.1, 6.2 |
| Collision between two groups | yes | `Group.colliding(otherGroup, cb)` 1666 loops members into `Sprite.colliding(Group)` 1226 | 6.1, OOP games |
| `overlaps()` semantics vs p5play | partial (different) | `overlaps()` is a live AABB/circle test, level not edge (1182, `_overlapsOne` 1203); it is NOT a "pass-through" rule. Calling `a.overlaps(b)` in setup, p5play style, does nothing to physics. Edge/level versions are `overlapping/overlapped` (1286-1330). No collision filtering exists (grep filter/categoryBits/maskBits: none). | every group lesson; Jumper-style coins |
| Disable collision between two specific things | partial | only whole-sprite `collider = 'none'` (972-1003: sensor, gravity switched off, still moved by `vel`). No per-pair rule. | coins, pickups, bullets vs friends |
| Tile maps from a text grid / `Tiles` | NO (absent) | grep `Tiles|tiles` in `moshion.js`, `moshion.d.ts`: no code symbol. Doable by hand: nested loop + `new group.Sprite()`, which works. | new "grids and tile maps"; platformer |
| Large tile worlds perform | partial | `_updateOverlaps()` 2164 tests every live sprite pair every frame (O(n^2)) including static tiles; `render()` 2192 filters+sorts all sprites each frame, no off-screen culling. Run, headless: 100 and 300 static sprites 16.6 ms/frame, 600 sprites 33 ms/frame, 1200 sprites did not finish 60 frames in 4 s. Machine-dependent. | tile maps (a 40x30 map is 1200) |
| Sprite sheets / animation | partial | `addAni(name, url, frameCount)` 1116: one horizontal strip, equal frames, only that 3-argument form. `changeAni` 1127 (unknown name = silent no-op). `ani.frame`, `ani.frameDelay` settable (1511). ABSENT: frame size/offsets, multi-row sheets, `ani.play/stop/pause`, `looping`, `onComplete`, `goToFrame`, `addAnis` (grep `play(`/`looping` none). | 6.4 |
| Flip / mirror | partial | no `mirror`/`flip` (grep). `scale.x = -1` works and is clamped only for 0 (869-884); it flips art, not the collider. | 6.4, platformer |
| Sound and music | yes (repo and vendored code); vendored LACKS the .wav files | `loadSound` 2766, `Sound.play/loop/stop/pause/volume/pan/rate/fade/loaded/ready/error` 2540-2760, `masterVolume` 2771; clips by start/end seconds; audio unlocked on first key/click 2535. Typings `moshion.d.ts` 339-385. | new sound module |
| Kinematic bodies | yes (code-read, not run) | `DYNAMIC/STATIC/KINEMATIC` consts 3125-3130; `body`/`collider` setter 611, 972; `new Sprite(x,y,w,h,'kinematic')` 508; 10 lessons mention kinematic. | 6.3, boss fight/platforms |
| Sensors (e.g. ground sensor) | partial | whole-sprite sensor only (`collider='none'`). ABSENT: `addCollider`, `addSensor`, offset colliders (grep none). Ground check taught as `player.colliding(ground)` (6-3-7 content.md:30) which is also true when touching a wall or ceiling. | 6.3, platformer build |
| Collider shapes | partial | `shape` is `'circle'` or `'rect'` only (609, `_buildFixture` 592). ABSENT: polygon, triangle, chain, vertices (grep none). | pinball flippers/ramps, tiles |
| Camera follows a sprite | partial | `camera.x/y` is the viewport CENTRE (264-285); follow is by hand `camera.x = player.x` (6-4 lessons). `camera.on/off` 285. ABSENT: `camera.zoom`, `follow`, world bounds/clamp (grep). | 6.4, platformer |
| Text and score | yes | `text(str,x,y,size,color)` 2232 (always `monospace`); `fill/textSize/textAlign` 2228-2230; `sprite.text/textColor/textSize` 542; `drawTop()` hook for a HUD in screen space (3040 area, `moshion.d.ts` 565). ABSENT: `textFont`, `textWidth`, `loadFont` (grep). Text drawn in `draw()` sits UNDER sprites; HUD needs `drawTop()` or `camera.off()`. | 5.3, 5.4, every build |
| `random()` | yes | `random()`, `random(max)`, `random(a,b)`, `random([array])` 2362; `randomSeed` 2358. ABSENT: `noise`, `randomGaussian`, `shuffle` (grep). | 5.4 |
| Timers / frame helpers | partial | `frameCount` (3139 getter), `millis()` 2404, `frameRate()` 2411. No moSHion timer helper; native `setTimeout/setInterval` work but are not tied to frames or `noLoop`. `sprite.life` frame countdown 1341, 3094. | 5.4 (spawn pipes) |
| Mouse and touch, drag | yes | `mouse.x/y`, `pressing/presses/released/holds`, `.left/.right/.center`, `dragging/drags/dragged` 152-200; `canvasPos` 164; touch mapped to left button, single finger only 2967-3010. ABSENT: `sprite.mouse.hovering/pressing/dragging` (grep: no `get mouse` on Sprite). Hit-test by hand with `world.getSpriteAt(x,y)` 1769. | 5.3 (drag aim), 6.7 |
| Keyboard edge vs level | yes | `kb.pressing` (level, boolean) 130, `kb.presses` (edge), `holds`, `released`; arrows+WASD both feed `left/right/up/down` 109-115. Edge triggers are taught in 6-3-2..6-3-4. | 5.1, 6.3 |
| Sprite lifetime / delete | yes | `delete()`/`remove()` 1383-1402, `life` countdown, `removed` 1345; `group.cull` 1733 | 5.4, 6.1 |
| `class Foo extends Sprite` | yes, with traps | run: subclass with `static` field+method, `constructor(){super(x,y,20)}`, instance methods, `instanceof Sprite`, add to a Group: all worked. Traps: a subclass `update()` is called automatically every frame (3029) and a subclass `draw()` REPLACES rendering (2213). Built-in accessors shadow student fields: run showed `this.speed = 5` goes through Sprite's `speed` setter (713) and read back 0 on a static body. Other collisions: `direction, life, text, color, scale, mass, x, y, w, h, d, r, width, height, visible, removed`. No test or demo in the moSHion repo extends Sprite (grep `tests/`, `games/`). The course teaches composition on purpose (`lessons/5-3-21-reading-composition`). | 5.6-5.8, OOP games |
| Static class fields/methods in student code | yes | run, above (`static count`, `static make`). The runner injects the sketch as a plain `<script>` (`runner.html`), so ES2022 class syntax is native browser behaviour. | 5.8 (static counter) |
| Save / load | yes | `storeItem` 2810 (JSON), `getItem` 2817, `removeItem` 2825, `clearStorage` 2831; falls back to a host bridge when localStorage is blocked 2792-2808; `loadJSON` 2474. | 6.5 |
| Console input (prompt-like) | NO (absent) | no `prompt/input/readline` in `moshion.js`; no student script under `lessons/5-*, 6-*` calls `prompt(` (the one grep hit is prose). Native `prompt()` would run in the sandboxed iframe: unverified whether the sandbox allows it. | open decision 4 in PLACEMENT |
| Error messages students see | partial | `runner.html` 60-95 shows a red banner `Name: message @ file:line` for uncaught errors and unhandled rejections, plus the source line to the host. The engine itself throws only 3 student-facing errors (`new Canvas(w, h) must be called in setup()` 2859, `group.cull()` argument checks 1739-1742, `saveTexture` 463-466) and warns once for an unknown texture (1076). Everything else is a silent no-op by design: `changeAni('typo')` 1127, unknown key name, `sprite.texture` typos on vendored, `scale=[...]` forms. A missing p5play name (`Tiles`, `loadImage`, `createCanvas`) shows the browser's `ReferenceError: X is not defined`. | all |
| 2D-array / grid helpers | NO (absent) | no grid, `Array2D`, `createGrid` symbol (grep). Plain JS arrays of arrays are enough; `square(x,y,s)` 2244 ignores the fill colour (never sets `fillStyle`), so a grid must use `rect()` 2303 or sprites. | Snake 5.5, grids module |
| Debug overlays | partial | per-sprite `sprite.debug = true` draws the collider outline in lime 1464 (not scaled). ABSENT: `allSprites.debug`/`world.debug`, an fps readout (use `text(frameRate())`; `frameRate()` 2411 exists), joint drawing (grep). | 5.2, debugging activity |
| World edges / bounds | NO (absent) | no walls helper; sprites fall forever; `group.cull` removes offscreen ones. Students build 4 static walls. | 5.3, 5.4 |

## 3. Gaps, ranked

### Blocks a planned module (fix before building it)

1. **Vendored copy is stale** (section 1). Blocks: sound module (no `.wav` in `public/moshion/assets/`), any art/tile/animation work (no `texture`, `pattern`, group `image`, the new animated textures), and the OOP block if it ever wants `rayCast`. Smallest fix: re-sync engine, d.ts, textures and the two `.wav` files into `public/moshion/`; keep the old `runner.html`.
2. **Tile-map module has no helper and a performance ceiling.** Hand-built maps work (nested loop + `new group.Sprite()`), but frame time doubles at about 600 sprites (headless run above) because every sprite pair is tested every frame, static tiles included. Smallest fix: skip static-vs-static pairs in `_updateOverlaps` (2164), or keep the module's maps at or below about 20x12 (240 sprites) and say so. A `Tiles`-style helper is optional on top.
3. **`overlaps()` is a query, not a pass-through rule** (1182). Any CodeHS-shaped coin, pickup or bullet exercise copied literally (`coins.overlaps(player)` once in setup) will still bounce. Smallest fix: keep teaching `collider = 'none'` for pass-through things (26 lessons already do) and put one sentence about it in the Groups lesson; no engine change needed.
4. **Ground check is `colliding(ground)`, true on walls and ceilings.** For the platformer build (not in the current plan; CodeHS Jumper has it) the wall-jump bug will appear. Smallest fix: teach a thin invisible `collider='none'` sprite moved under the player each frame and tested with `overlaps()`/`overlapping()`; or add `sprite.addSensor`. Only blocks if the platformer is built.
5. **Extending Sprite in OOP games.** Works, but field names collide silently with Sprite accessors (`speed`, `life`, `direction`, `text`). If the new OOP games use composition (as 5.7 does) nothing blocks. Smallest fix: keep composition, and add a "names you must not reuse" line to the 5.7/5.8 reading if `extends` is ever shown.

### Nice to have

- Animation controls: `ani.play/stop/looping/onComplete`, multi-row sheets, frame-size form of `addAni` (CodeHS-style sprite-sheet lessons assume them; mark: p5play API from memory).
- `camera.zoom` and a `camera.follow` / clamp (6.4 teaches it by hand with lerp and that is fine).
- Polygon/triangle colliders (pinball ramps, flippers, tile slopes).
- `sprite.mouse.hovering/pressing/dragging` (drag a sprite; today `world.getSpriteAt`).
- `textFont`, `textWidth` (centred score text uses `textAlign(CENTER)` today, which exists).
- A timer helper (every N frames / after N frames); today `frameCount % n` is taught.
- `allSprites.debug` / fps overlay toggle.
- `square()` should honour `fill()` (2244) so a Snake board drawn with `square` is not black.
- Wall helper for the canvas edges.
- Console `prompt`-style input: only if PLACEMENT decision 4 says yes.

## 4. Could not determine, and how to find out

- **Whether native `prompt()` / `alert()` work inside the sandboxed iframe.** Check the iframe `sandbox` attribute in `components/MoshionPreview.tsx` (needs `allow-modals`), then call `prompt('x')` in a sketch.
- **Kinematic body behaviour in play** (moving platform carrying a player, kinematic vs static contact). Read only. Write a 10-line sketch with a kinematic platform and a dynamic box and watch it; Box2D normally does not collide kinematic with static.
- **Real frame cost on a student Chromebook.** My timings are headless Chromium on this box. Run `/tmp`-style page with 300/600 sprites on the classroom hardware, or add `frameRate()` to a tile-map prototype.
- **Whether `class Foo extends Sprite` survives group defaults and joints** (`new group.Sprite` is a different subclass; I only tested direct subclass plus `group.add`). Write a short test with `Group.Sprite` and a `HingeJoint`.
- **p5play features CodeHS uses that I could not confirm from memory:** `Tiles` argument order, `sprite.addAni` multi-argument forms, `sprite.mouse`, `sprite.addSensor` naming. Mark all as "recalled, not verified": check against the CodeHS lesson text on the logged-in session (already read for GD modules 4-6 in `gamedesign.md`), not from here.
- **Whether any lesson in modules 5.6-5.8, 6.2, 6.6-6.8 or 7.1 calls something absent.** I grepped the whole `5-*`, `6-*`, `7-*` lesson trees for the symbols in section 2 only. Full check: run every `script.js` and `solution.js` through the existing corpus harness in the moSHion repo (`tests/harness.mjs`) against the vendored engine after the re-sync.
- **Lesson numbering.** Lesson folders use the old numbers (`5-5-*` is the static/scope module); the table above uses PLACEMENT's "today's ids" and does not claim a folder-to-module mapping.

## 5. Status after fix (2026-10-31)

moSHion commit `3b77bf6` (repo branch `gaps-fix`, not yet pushed or merged) is vendored into `public/moshion/`;
`public/moshion/VENDORED.md` is the pin (commit, what was copied, what shCode keeps as its own and why).
Section 1's drift was already closed by `df183a7d` (2026-10-30); this sync adds the fixes below. All additive:
the moSHion suite went from 199 to 253 checks, all passing (`tests/gaps.spec.mjs` is the new 54), and
shCode's gate is unchanged at 424/424 corpus, 94/94 semantic.

| Gap | Now |
| --- | --- |
| Large tile worlds (O(n^2) overlaps) | Fixed. `_updateOverlaps` uses an exact sort-and-sweep broadphase; `render` culls sprites wholly off screen. Engine work per frame, headless Chromium, N static tiles + 10 balls: 310 sprites 13.95 -> 1.47 ms, 610 42.85 -> 3.25 ms, 1210 160 -> 5.4 ms, 2410 (never reached frame 30) -> 10.2 ms. Re-measure with `bun tests/tiles-perf.bench.mjs` in the moSHion repo, ideally on a Chromebook. |
| Tile maps / `Tiles` | Added: `new Tiles(map, x, y, w, h, legend)`, legend `{ '#': walls }` maps a character to a Group. p5play's `group.tile` form is not supported. |
| World edges | Added: `new Walls(thickness = 50)`, four static walls just outside the canvas; also `walls.top/bottom/left/right`. |
| `square()` ignores `fill()` | Fixed: `square(x, y, s, r)` is `rect(x, y, s, s, r)`. Labs 5.6.9-5.6.11 now show the coloured squares their text promises (they drew black before). |
| Timers | Added: `every(frames, fn)` and `after(frames, fn)`, each with `stop()`; frame-counted, run after `update()`. |
| Ground sensor | Added: `sprite.addSensor(ox, oy, w, h)` returns a `Sensor` with `overlaps()` / `overlapping()` / `remove()`; a detect-only fixture, false against walls and ceilings. |
| `overlaps()` is a query; names not to reuse | Documented in `docs/moshion.d.ts` and the moSHion docs site (`colliding vs overlapping`, `Custom properties`). |
| Deferred | `camera.zoom` / `follow`, polygon colliders, animation controls (`ani.play/stop/looping`, multi-row sheets). |

Item 4 of section 4 is closed: every `script.js`, `solution.js` and `solution/*.js` under `lessons/5-*`, `6-*`, `7-*`
(135 files) ran in real Chromium through the moSHion repo's `tests/harness.mjs` on the old and the new engine. The
results are identical, nothing calls a global the engine lacks, and the 12 that error are graded scaffolds by design
(11 have an empty `setup()` with no `new Canvas`; `5-3-19` calls the `isHigh()` the student writes). Only idle
frames ran, so code behind a key press was not exercised.

Not done here: `lib/moshion-docs.ts` (the in-app docs) does not yet teach the new names, and HANDOFF.md's top
section still calls the vendored copy 223 lines behind.
