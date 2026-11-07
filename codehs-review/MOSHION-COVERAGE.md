# moSHion coverage: have we covered everything?

Audited 2026-11-02, branch `codehs-inspiration`, read-only. Engine: `public/moshion/moshion.js` vendored from
moSHion `d8068bb` (default gravity 0, `world.origin = 'math'` available). The course is the 330 lessons in
category "Unit 2: moSHion" (5.1-5.11, 6.1-6.11, 7.1), taken in title-number order (`5.6.15` before `5.7.1`), not
folder order: folder ids still carry the old numbers (`5-3-*` is 5.6/5.7, `5-5-1..20` is 5.8, `6-1-1x` is 6.2,
`6-7-1x/2x` is 6.8). `moshion-bounce` (5.2.12) and `moshion-gravity` (5.2.7) are included.

**Short answer: no.** The engine exposes 239 API entries (rows below; aliases grouped). The course teaches 106 of
them somewhere in Units 5-7, 14 of those only after a lab has already used them, uses another 10 that no screen
introduces, leaves 57 to the docs drawer, and never mentions 66. On the owner's Chapter 5 criterion, 72 of the 113
BASIC entries are not taught anywhere in 5.1-5.5. Most of those 72 are small (aliases, extra drawing calls), but
the biggest ones are core: **sound, overlap-based pickups, the `update()` hook, and safe custom field names on
sprites.**

## Counts

| status | all 239 | BASIC (113) | ADVANCED (126) |
|---|---|---|---|
| TAUGHT (a reading, example or the lab's own text introduces it) | 106 (14 of them late, see "Used but never introduced") | 70 (14 late) | 36 |
| USED-ONLY (a step, starter or solution uses it, no screen introduces it) | 10 | 6 | 4 |
| DOCS-ONLY (only the in-app docs drawer has it) | 57 | 26 | 31 |
| ABSENT (in the engine, in no lesson and not in the docs drawer) | 66 | 11 | 55 |

"Taught" counts a reading, worked example, slide deck or the lab's own `content.md`. A lab's step text or a
requirement card that only *names* a call does not count as teaching. A grader that merely *accepts* a call as an
alternative (5.2.17 accepts `dist()` and `player.distanceTo(goal)`) does not count as use.

## Chapter 5 scope check

Owner criterion (relayed 2026-11-02): Chapter 5 must cover all the basics of moSHion and functional game design
before the course moves to advanced moSHion and OOP game design. **BASIC** means what a student needs for a
functional game: sprites, keys, movement, collisions, gravity and physics feel, score, timers, random, game over and
restart, state in plain variables and functions, arrays of sprites, text, background, sound basics. **ADVANCED**
means groups as a design tool, classes wrapping sprites, inheritance, joints, tile maps and grids, camera, saves
beyond a high score, animation sheets, and niche physics. The per-name level is my call against that definition
(column "level" in the full table). The functional block is 5.1-5.5. 5.6-5.8 are classes and objects, and 5.9-5.11
are the Defender build.

### (a) BASIC names not taught in 5.1-5.5 (the real gaps), ranked

1. **Sound: `loadSound()`, `.play()`, `.loop()`, `.stop()`, `.volume`.** Nothing in 5.1-5.5 makes a sound, so Pinball,
   Flappy and Snake are silent. The first sound is in the 5.11.9 lab's own text (`5-11-defender-sound-lab-sound-effects`),
   and the first reading is 6.11.1. Your BASIC list names sound.
2. **`overlaps()` with `collider = 'none'` (pickups, coins, goals).** No 5.1-5.5 screen uses an overlap test.
   5.2.17 (`5-2-11-lab-reaching-the-goal`) does the goal with distance math, and its requirement card says
   "Not met: ... overlaps() alone". The graded 5.7.19 A12.1 lab (step s4: `player.overlaps(c.sprite)`) is the first
   place a student must use it. The first reading is 5.9.5. Pinball, Flappy and Snake only use `colliding()` or grid
   cells.
3. **The `update()` hook.** No lesson ever explains it: all 99 lesson solutions do their work in `draw()`, and none
   defines `update()`. But 46 of the 63 docs-drawer examples put input and movement in `update()`, and the 5.1 labs
   send students to the drawer from 5.1.11 on. The 7.1.1 capstone starter then gives them an empty `update()` and a
   `clear()`, neither introduced anywhere. Either teach it in 5.1, or bring the docs into line with the course.
4. **Custom fields on sprites that clash with built-in names (`speed`, `life`, `direction`, `text`, `mass`, `scale`,
   `visible`, `d`, `r`, ...).** 5.3.8 (`b.worth`, `b.wasTouching`), Flappy (`p.passed`, `p.mate`) and 5.5.2
   (`head.col`, "you can give it your own properties") all teach students to hang their own fields on sprites. No
   lesson tells them which names are taken. `bird.life = 3` deletes the bird three frames later, and `pipe.speed = 2`
   rewrites its velocity. The warning exists only on the docs drawer's Groups > Custom properties page.
5. **Mouse and touch input: `mouse.x`/`mouse.y`, `mouse.presses()`, `mouse.pressing()`.** In 5.1-5.5 these appear
   only as "try this" lines in the 5.1.22 and 5.1.24 labs. The first reading is 5.7.15 (`mouse.presses`). A click,
   tap or aim game cannot be built from the functional block.
6. **Frame timers `every(frames, fn)` and `after(frames, fn)` (with `.stop()`).** 5.2.1-5.2.4 teach the timer idea
   with `frameCount % n` and a frame-number one-shot, so the concept is covered. The helpers exist only on the docs
   drawer's "Timers: every and after" page.
7. **Centred text: `textAlign(CENTER)`.** Every game-over and title screen in 5.3-5.5 places text at a hand-picked x.
   It is first explained in the 5.8.2 example, though the 5.7.3-5.7.6 starters already use it.
8. **Physics-feel knobs: `.mass`, `.density`, `.drag`, `.gravityScale`, `.rotationLock`.** The 5.2 "Physics Feel"
   module teaches gravity, `bounciness`, `friction`, `vel` and `applyForce`, but none of these. They are docs-only,
   except `rotationLock` (first explained in 6.9.2).
9. **Things that expire: `.life`.** It is docs-only. The Defender shots in 5.9 are removed with off-screen checks and
   `splice`, which is fine, but the one-line timed sprite (particles, a flash, a power-up) is never shown.
10. **Plain shapes: `rect()`, `line()`, `stroke()`, `noStroke()`, `strokeWeight()`, `noFill()`, `ellipse()`.** None is
    taught in 5.1-5.5. `circle()` appears only as a 5.1.24 challenge hint, `square()` first in 5.6.8 and `rect()`
    first in 6.5.22. A HUD bar, lane line or board outline therefore has to be built from sprites.
11. **Sprite art: `.image` (emoji or picture) and `.texture` (named pixel art).** Every functional game is coloured
    boxes. `.image` is first in 6.4.3, and `.texture` is docs-only even though 55 textures ship.
12. **Screen edges: `new Walls()` and `constrain()`.** Pinball builds its walls by hand, which is a fine lesson. But
    the 5.2.10 jump lab's reference lets the player run off the ground and fall forever (harness run: after 220 frames
    holding `d`, the player is at x=1336, y=1540). `Walls` is docs-only, and `constrain()` is mentioned only by the
    5.9.4 grader.
13. **Simple high score that survives a reload: `storeItem()`/`getItem()`.** 5.3-5.5 keep `best` only for the
    session. Saving first appears in 6.5.3.
14. **Small math helpers: `round()`, `min()`/`max()`, `abs()`, `dist()`, `random([list])`.** These appear only as
    alternatives accepted on requirement cards (5.2.3, 5.2.17, 5.4.11, 5.5.11), and in the 5.4.11 and 5.5.11 challenge
    solutions (`min(score / 5, 3)`). The docs drawer has no math page at all (see "Docs drawer").
15. Lower stakes: `.debug` (collider outline, docs-only, useful for the "Debugging" activity PLACEMENT asks for),
    `.text`/`.textColor` labels on sprites (first in 5.6.7), `.scale` (flip a sprite, 6.4.5), `noLoop()` (the course
    uses a `playing` flag instead, which is fine), `.collides()` (Pinball teaches a `wasTouching` flag on purpose,
    5.3.5), `.moveTowards()`/`.rotateTo()` (chasers and turrets, docs-only), `.speed`/`.direction` (docs-only),
    `kb.released()` (appears only as a wrong answer in the 5.4.10 quiz).

### Proposed homes for the missing basics (owner's expansion plan)

The owner plans to expand 5.3 Pinball, 5.4 Flappy and 5.5 Snake so that between them they cover the basics of
CodeHS's Mini Golf, Projectiles (cannon) and Jumper units, with classes staying in the later block. This table is
a proposal only; no lesson is edited. "Comes from" summarises the unit's build steps in my own words, from the
structure notes in `codehs-review/gamedesign.md`. No CodeHS text is copied.

| Missing basic (names) | Natural home | What that game already does | Comes from |
|---|---|---|---|
| Mouse press, drag and release to aim (`mouse.x`/`y`, `mouse.presses()`, `mouse.pressing()`, `mouse.released()`) | **5.3 Pinball** | Already launches a ball onto a walled table. A pull-back-and-release launch replaces the fixed start. | Mini Golf (drag to aim); Projectiles (aim at the pointer) |
| Launch at an angle and power (`.direction` + `.speed`, or `vel` from `sin`/`cos`; `dist()` for drag length; `min()` to cap power; `.rotation`/`.rotateTo()` to turn an aim arrow) | **5.3 Pinball** | The ball and walls exist; only the aimed launch is new. | Mini Golf (rotate the aim); Projectiles (rotate the cannon toward a point) |
| Slow down and stop when slow (`.drag`, reading `.speed`, `abs()`) | **5.3 Pinball** (a top-down putting-green variant with gravity 0, now the default). 5.2 can introduce `.drag` as a knob first. | Uses `friction` and `bounciness` already. | Mini Golf (slow the ball, stop it) |
| A target that does not block (`collider = 'none'` + `overlaps()`) | **5.3 Pinball** (the hole or goal). Reinforce in **5.4 Flappy** with an invisible gate between the pipes that scores the gap. | Pinball's goal uses `colliding()` plus a flag; Flappy scores a gap by comparing x. | Mini Golf (ball drops in the hole); Jumper (coins) |
| Strokes and par (plain counters compared with a target) | **5.3 Pinball** | Already has `score`, a `playing` flag and a restart. | Mini Golf (score display, second hole) |
| Sound effects and music (`loadSound()`, `.play()`, `.volume`, `.loop()`, `.stop()`) | **5.3 Pinball** for `.play()` on a bumper hit or the hole; **5.4 Flappy** for `.loop()` while playing and `.stop()` on a crash | Pinball has hit events; Flappy has clear playing and crashed states. | Mini Golf (music and score step) |
| Names a custom field must not use (`speed`, `life`, `direction`, `text`, ...) | **5.3 Pinball**, at 5.3.8, where `worth` is the first custom field; repeat at 5.5.2 | Already teaches "a sprite is an object, store your own values on it". | (our own; the docs drawer has the list) |
| Labels on sprites (`.text`, `.textColor`, `.textSize`) | **5.3 Pinball** (each bumper shows its worth) | Bumpers already carry `worth`. | Mini Golf (score display) |
| Destroy a target on a hit, win when all are gone, hit budget | **5.3 Pinball** (targets that break after N hits; clear the table to win) | Already scores each bumper and loops over an array of them. | Projectiles (destroy blocks, limit destruction, win check) |
| Fire projectiles on input, move them, expire or reap them (`new Sprite` on a key or click, `.life`, array plus `splice`/`.delete()`) | **No natural home in the three games.** Flappy's pipe array has the same spawn/move/reap mechanics but nothing to shoot. The real home already exists: Defender Parts A and B (5.9-5.10) teach fire-with-cooldown, a shots array and `overlaps()` hits with **no classes** (verified: no `class`, `this.` or `Group` in any 5-9-* or 5-10-* file), but they sit after the 5.6-5.8 class block. Moving 5.9-5.10 ahead of the classes would cover this and also put the `overlaps()` reading (5.9.5) before its first graded use (5.7.19). | Pipes spawn, scroll and are deleted from an array. | Projectiles (cannonballs, firing) |
| Frame timers (`every()`, `after()`, `.stop()`) | **5.4 Flappy** (`every()` spawns pipes; `after()` for a short get-ready or restart pause) and **5.5 Snake** (the step clock). 5.2.1 can name the helper. | Both already run on `frameCount % n`. | Projectiles/Jumper timing; our 5.2.1 |
| Centred title and game-over text (`textAlign(CENTER)`) | **5.4 Flappy** (5.4.8 crash and start again) | Already has a game-over screen. | Jumper (end of level, game over) |
| Keep the player on screen (`constrain()`) | **5.4 Flappy** (the bird cannot leave the top) | The bird already exists. | (general) |
| A high score that survives a reload (`storeItem()`, `getItem()`) | **5.4 Flappy** (5.4.11 already keeps `best` for the session); repeat in 5.5 Snake | Already keeps `best`. | (general; 6.5 goes deeper) |
| Sprite art (`.image` emoji, `.texture` names) | **5.4 Flappy** (the bird) and **5.5 Snake** (the food) | Both are coloured boxes today; 55 textures ship. | Jumper (character art; sheets stay ADVANCED) |
| Plain drawing (`rect()`, `line()`, `stroke()`, `noStroke()`, `noFill()`, `strokeWeight()`) | **5.5 Snake** (board outline and grid lines) and **5.3 Pinball** (the aim line from ball to pointer) | Snake already thinks in cells; Pinball would gain the drag. | Mini Golf (aim indicator) |
| Pick from a list (`random([list])`) | **5.5 Snake** (food colour or spot), or **5.2.2**, which already does `colors[floor(random(colors.length))]` | | (our own) |
| Things that expire (`.life`) | **5.2.2 Sparkles example** (it spawns a spark every 30 frames that never goes away) | Already spawns on a beat. | Projectiles (balls that should not live forever) |
| Physics knobs (`.mass`/`.density`, `.gravityScale`, `.rotationLock`, `.debug`) | **5.2 Physics Feel** (heavy against light, a floaty bird, a player that will not tip, a visible collider outline) | 5.2 is the knob module; it teaches gravity, `bounciness`, `friction` and `applyForce` now. | Projectiles (wood and stone materials); Jumper (player gets back up) |
| Platforms and ground detection (static platforms, ground-gated jump, `addSensor()`, `kb.released()` for a shorter jump, `.scale.x = -1` to face the walking direction, `new Walls()` so the player cannot leave the world) | **No natural home in Pinball, Flappy or Snake**; none of them is a platformer. The only platform-shaped place is 5.2: the ground-gated jump (5.2.9-5.2.10) and the finished scene (5.2.16-5.2.17). Either 5.2 grows a small platform level, or the Jumper basics need a fourth functional build. | 5.2.10 already has jump plus `colliding(ground)`; its reference lets the player run off the ground forever. | Jumper (character, jump, ground sensor, coins, end of level) |
| Chasing or homing enemies (`.moveTowards()`, `.angleTo()`) | **No natural home in the three games** (none has an enemy). Defender Part B (5.10, functional) is the natural place. | | Projectiles/Jumper do not need it; general |
| The `update()` hook (input and movement before physics) | **No game home.** It belongs in 5.1's frame-loop screens (5.1.12-5.1.18). The alternative is to keep the course draw-only and change the 46 docs-drawer examples that use `update()`. | | (our own) |

Basics with no natural home in Pinball, Flappy or Snake: **projectile firing** (Defender 5.9-5.10 already teach it
without classes, so this is a reorder rather than new content), **platforms and ground sensing** (5.2 or a fourth
build), **chasing enemies** (Defender 5.10), and the **`update()` hook** (5.1).

The full list of the 72 BASIC entries not taught in 5.1-5.5:

| BASIC name | in 5.1-5.5 at all? | taught later | docs drawer |
|---|---|---|---|
| update() hook | no | never; used 7.1.1 | yes |
| clear() | no | never; used 7.1.1 | no |
| noLoop() | no | never; used 6.2.7 | yes |
| mouseX / mouseY | no | 6.6.22 (example) | yes |
| showGrid() | used/told only: 5.1.25 | never; used 5.1.25 | yes |
| showMouse() | used/told only: 5.1.25 | never; used 5.1.25 | yes |
| new Sprite() / new g.Sprite() no args | grader accepts it: 5.1.25 | never | yes |
| new Sprite(x, y) | no | 6.1.3 (reading) | yes |
| .speed | no | never | yes |
| .direction | no | never | yes |
| .angularVelocity | no | 6.3.8 (example) | yes |
| .rotationSpeed | no | never | no |
| .rotationLock | no | 6.9.2 (reading) | yes |
| .rotateTo() | no | never | yes |
| .moveTowards() | no | never | yes |
| .distanceTo() | grader accepts it: 5.2.17 | never | yes |
| .w / .h | no | never | no |
| .width / .height (sprite) | no | 6.2.7 (moshion) | no |
| .diameter | no | 6.1.3 (reading) | yes |
| .scale | no | 6.4.5 (reading) | yes |
| .stroke (sprite) | no | 5.6.15 (example) | yes |
| .strokeWeight (sprite) | no | 5.6.15 (example) | yes |
| .opacity | no | never | yes |
| .debug | no | never | yes |
| .image (sprite) | no | 6.4.3 (reading) | yes |
| .texture (sprite) | no | never | yes |
| .text (sprite label) | no | 5.6.7 (example) | yes |
| .textColor | no | never | yes |
| .textSize (sprite) | no | never | yes |
| .density | no | never | yes |
| .mass | no | never | yes |
| .drag (air resistance) | no | 6.3.1 | yes |
| .gravityScale | no | never | no |
| .overlaps() | no | 5.9.5 (reading) | yes |
| .collides() | no | never | no |
| .remove() (sprite) | grader accepts it: 5.2.17, 5.4.6 | 5.7.7 (console) | yes |
| .removed | no | never | no |
| .life | no | never | yes |
| new Walls() | no | never | yes |
| walls.top / bottom / left / right | no | never | yes |
| kb.released() / releases() | used/told only: 5.4.10 | never; used 5.4.10 | no |
| mouse.pressing() | no | 6.3.3 (reading) | yes |
| mouse.presses() | no | 5.7.15 (reading) | yes |
| mouse.released() / releases() | no | never | yes |
| textAlign() | no | 5.8.2 (example) | yes |
| CENTER / LEFT / RIGHT | no | 5.8.2 (example) | yes |
| ellipse() | no | never | no |
| rect() | no | 6.5.22 (example) | yes |
| square() | no | 5.6.8 (reading) | yes |
| line() | no | never | yes |
| stroke() | no | never | yes |
| noStroke() | no | never | yes |
| strokeWeight() | no | never | yes |
| noFill() | no | never | yes |
| random([array]) pick form | no | never | no |
| constrain() | no | never | no |
| dist() | grader accepts it: 5.2.17 | never | no |
| round() | grader accepts it: 5.2.3 | 6.5.12 (example) | yes |
| abs() | no | never | no |
| min() / max() | used/told only: 5.4.11, 5.5.11 | 6.6.22 (example) | no |
| sqrt() / pow() | no | never | no |
| millis() | no | 6.5.18 (example) | no |
| every(frames, fn) | no | never | yes |
| after(frames, fn) | no | never | yes |
| timer.stop() / timer.active | no | never | yes |
| loadSound() | no | 5.11.9 (moshion) | yes |
| sound.play() | no | 5.11.9 (moshion) | yes |
| sound.loop() | no | 6.11.1 (reading) | yes |
| sound.stop() / pause() | no | 6.11.1 (reading) | yes |
| sound.volume | no | 5.11.9 (moshion) | yes |
| storeItem() | no | 6.5.3 (reading) | yes |
| getItem() | no | 6.5.3 (reading) | yes |

**What 5.6-5.11 add that 5.1-5.5 lack (BASIC only):** .stroke (sprite) (5.6.15); .strokeWeight (sprite) (5.6.15); .text (sprite label) (5.6.7, 5.7.11, 5.7.16); .overlaps() (5.9.5, 5.10.4); .remove() (sprite) (5.7.7, 5.7.11, 5.11.3); mouse.presses() (5.7.15, 5.8.14, 5.8.15); textAlign() (5.8.2); CENTER / LEFT / RIGHT (5.8.2); square() (5.6.8, 5.7.21); loadSound() (5.11.9); sound.play() (5.11.9); sound.volume (5.11.9). So sound, overlaps, mouse clicks, centred text
and sprite labels do eventually arrive in Chapter 5, but only inside the classes block or Defender, after the
functional games are finished.

### (b) ADVANCED names Chapter 5 already uses or teaches

| ADVANCED name | in 5.1-5.5 | in 5.6-5.11 |
|---|---|---|
| world.origin (math mode) | 5.1.25 | - |
| group.length / for..of over group | - | 5.11.3 |
| allSprites | - | 5.11.3 |
| lerp() | 5.1.24 | - |
| sound.rate | - | 5.11.9 |
| masterVolume() | - | 5.11.9 |

Also in Chapter 5, though not moSHion API: **inheritance.** The 5.7.21 reading names it, and the 5.7.22 Challenge 3
(`5-3-34-challenges`) asks for "a `PowerUp` class that extends a base `Collectible` class". Its solution uses
`extends` and `super(...)`, and the step text mentions `new Group(...)`. PLACEMENT decision 8 put inheritance in one
Chapter 7 module. The challenge is optional, but it is the one ADVANCED item that is actually taught in Chapter 5
rather than named in passing. The rest are minor: math mode is the optional, ungraded 5.1.25; `lerp()` is one 5.1.24
challenge hint; `allSprites.length` is a sprite count in the 5.11.3 example; `sound.rate` and `masterVolume()` are
in the 5.11.9 lab's own text.

### (c) Does anything in 5.1-5.5 use OOP, classes or groups?

**No.** A regex sweep of every file in the 5.1-5.5 lessons (content, `lesson.json`, starters, solutions) for
`class X`, `extends`, `new Group`, `this.<field>`, `allSprites`, or `new <Name>(` other than `Sprite`/`Canvas`
finds nothing. The only words that match are prose ("this reading"). 5.3-5.5 do store plain fields on sprites
(`b.worth`, `p.mate`, `head.col`) and keep sprites in arrays. That is objects-as-data, which Unit 3 taught, not OOP.
Gap 4 above is the risk that comes with it.

## Gaps that matter for students (whole game block, ranked)

These are what a student working through Units 5-7 would plausibly need or run into, and no screen teaches.

1. **Sound is missing from the functional games** (gap a1). The first sound is the 5.11.9 lab.
2. **No pass-through pickup in 5.1-5.5, and the first `overlaps()` is in a graded lab before its reading** (a2).
   5.7.19 needs it, 5.9.5 explains it.
3. **`update()` is never explained, while the docs drawer and the 7.1.1 capstone starter both use it** (a3). It is
   the first thing a student sees in most drawer examples.
4. **Silent name clashes on custom sprite fields** (a4). The bug produces no error, and the sprite deletes itself or
   changes speed.
5. **`fill(r, g, b, a)` is written in lesson text but moSHion ignores the alpha.** 5.1.24 (hint "fades older
   positions"), the 6.6.20 pause-overlay example ("a semi-transparent rectangle (`fill(0,0,0,120)`) dims the
   background") and the 6.6.27 hint all write it. moSHion's `fill()` takes one colour. Verified in the harness:
   `fill(0, 0, 0, 120); rect(...)` paints solid `rgb(0,0,0)`, so the 6.6.20 pause screen goes black instead of
   dimming. The fix is `fill('rgba(0,0,0,0.5)')`.
6. **`WheelJoint` is asked for and never taught.** 6.3.10 (`6-3-10-a14-2-car-ramp`, the A14 "Car on a Ramp" option)
   says "Attach each wheel to the chassis with a WheelJoint" (step s3, starter and solution). No reading covers
   it, and 6.8 Joints teaches only Distance, Hinge and Slider. This is an old 6.x lesson, so it only matters if
   6.3 survives the restructure.
7. **Mouse/touch input is not available to the functional games** (a5). On touch Chromebooks this rules out tap
   games until 5.7.
8. **`canvas.w` / `canvas.h` in the 6.4.12 and 6.4.13 camera readings.** moSHion has no `canvas` object (the globals
   are `width` and `height`). A student who copies `camera.x = player.pos.x - canvas.w / 2 + 100` gets an error or
   NaN. This is an old 6.x lesson.
9. **Timers, art, plain shapes, physics knobs and screen edges** (a6, a8, a10, a11, a12). Each has a docs page but no
   lesson, and each is something a student building their own game asks for.
10. **The docs drawer has no page for moSHion's math helpers** (`random`, `floor`, `round`, `constrain`, `lerp`, `map`,
    `dist`, `min`/`max`, `sin`/`cos`, `millis`). The course teaches `random()` and `floor()` in 5.2.1, but a student who
    searches the drawer for them finds nothing, and the drawer's own examples use `Math.random()`.

## Used but never introduced (taught-before-asked risks)

| name | where it is used first | how | first introduced |
|---|---|---|---|
| `update()` hook | 7.1.1 `7-1-1-arcade-cabinet` | starter: `function update() {}` | never |
| `clear()` | 7.1.1 `7-1-1-arcade-cabinet` | starter: `function draw() { clear(); }` | never (not in the docs drawer either) |
| `.overlaps()` | 5.7.19 `5-3-31-a12-1-collectible` (graded A12.1); 5.7.22 `5-3-34-challenges` | step s4 names `player.overlaps(c.sprite)`; solutions | 5.9.5 reading |
| `textAlign()` / `CENTER` / `LEFT` | 5.7.3-5.7.6 `5-3-17` .. `5-3-20` labs | starter and solution | 5.8.2 example |
| `mouse.presses()` | 5.7.10 `5-3-23-lab-cleanup` | starter and solution (`if (mouse.presses()) b.pop();`) | 5.7.15 reading |
| `.stroke` / `.strokeWeight` on a sprite | 5.6.14 `5-3-13-lab-build-sprite` | step s4, starter, solution | 5.6.15 example (the next screen) |
| `new Sprite(x, y, d)` (circle) | 5.2.12 `moshion-bounce`; 5.2.18 `5-2-13-a5-2-1-pinball-scene` | step s2 text and hint, solutions | 5.3.2 reading (no earlier reading shows the 3-number form) |
| `.collider` / `collider = 'none'` | 5.1.24 `5-1-23-challenges` | reference solution only | 5.2.16 example |
| `min()` | 5.4.11 `5-4-flappy-9-challenges-make-it-yours`; 5.5.11 snake challenges | reference solutions; card accepts `max(...)` | 6.6.22 example |
| `.diameter` | 5.7.22 `5-3-34-challenges` | reference solution | 6.1.3 reading |
| `world.origin = 'math'`, `showGrid()`, `showMouse()` | 5.1.25 `5-1-25-math-grid` (optional, ungraded) | the lab's own steps explain them | never in a reading (docs Coordinates section) |
| `world.gravity` | 5.1.25 `5-1-25-math-grid` | step s5 mentions `world.gravity.y = -10` | 5.2.2 example, 5.2.6 reading |
| `kb.released()` | 5.4.10 `5-4-flappy-8-quiz-flappy-check` | a wrong answer in the quiz | never |
| `noLoop()`, `mouseX` | 6.2.7 `6-1-12-challenges` | reference solution | never / 6.6.22 |
| `.rotationLock` | 6.4.19 `6-4-19-challenges` | reference solution | 6.9.2 reading |
| `WheelJoint` | 6.3.10 `6-3-10-a14-2-car-ramp` | step s3, starter, solution | never (6.8 skips it) |
| `sound.play(clip)` / `clips`, `sound.pan` | 6.11.10 `6-11-sound-10-challenges-make-it-yours` | step s1 challenge text, solution | never |

Also student-visible, and lax by design: requirement cards render their `description` to the student
(`components/RequirementCard.tsx`). Several name calls no screen taught, as accepted alternatives: 5.2.17
("`dist(...)`, or `player.distanceTo(goal)`"), 5.2.3 ("a `round()` of `random(1, 6)` also counts"), 5.4.11 and
5.5.11 (`max(...)`), and 5.9.4 (`constrain()`). Nothing is required, but the student does read the names.

Docs-drawer pointers that lead nowhere: the hints in 5.6.11, 5.7.3, 5.7.4, 5.7.5, 5.7.6 and 5.7.12 send students to
the "class syntax" or "class method" section of the moSHion docs drawer. Neither the moSHion set nor the JavaScript
set (`lib/js-docs.ts`) has a classes section. 5.7.13 and 5.7.14 send them to arrays and loops in the moSHion drawer
(those pages are in the JavaScript set). 6.4.9 and 6.4.18 name a "Visual / image section"; the page is "Images and
emoji on sprites".

## Docs drawer verification

Two layers, both read-only.

**Generic gate.** `node --import ./scripts/register-ts.mjs scripts/test-moshion.mjs --corpus --json` passes all 63
docs examples (60 frames, draws something, no console error), alongside 249 live blocks, 99 solutions, 82 scaffolds
and 15 starters: 0 failures. That bar only proves an example runs and draws. It cannot tell whether the example shows
what its page says.

**Behaviour checks, 12 entries** (scratch script driving the repo's own `scripts/moshion-harness.mjs`, with
scripted keys and mouse where needed):

| # | docs page | what the page claims (checked) | result | measured |
|---|---|---|---|---|
| 1 | Coordinates > Math mode: centre, y up | world.origin = 'math' + gravity -10: ball falls DOWN the screen (y decreases) and rests on the floor at y=-120 | PASS | origin=math ball.y=-92.4 |
| 2 | Sprite > Collider types: dynamic, static, kinematic, none | dynamic falls, static stays, kinematic rides its vel, none ignores gravity | PASS | dyn.y=252.5 floor.y=380 elevator.y=200.0 none.y=30 |
| 3 | Sprite > Removing and cleaning up sprites | bullets past x=400 are deleted, so the group stays small | PASS | bullets=10 maxX=384.0 allSprites=10 |
| 4 | Physics > Walls around the canvas | new Walls() makes 4 walls and 10 bouncing balls stay on the canvas | PASS | walls=4 allInside=true sprites=14 |
| 5 | Collisions & Overlaps > Ground sensors | addSensor foot strip reports the floor once the player lands | PASS | feet.overlaps=true color=deepskyblue player.y=259.6 |
| 6 | Groups > Tile maps from text | Tiles builds one sprite per legend character (30 walls + 4 coins) | PASS | level=34 (want 34) coins=4 walls=30 |
| 7 | Input > Keyboard basics | holding ArrowRight moves right 4 px/frame; space turns it gold | PASS | player.x=320.0 color=gold |
| 8 | Game Patterns > Timers: every and after | every(45) spawns pipes; after(600) stops the spawner | PASS | at 50f pipes=1 active=true; at 610f active=false |
| 9 | Text & HUD > HUDs that don't scroll | drawTop() text is the last thing painted each frame (above sprites) | PASS | last draw op=fillText(x: 200) |
| 10 | Persistence > Saving and loading data | three space presses store highScore=3; r removes it | PASS | after 3 presses getItem=3; after r getItem=null |
| 11 | Joints > DistanceJoint | tether.length = 120 holds the ball 120 px from the anchor as it swings | PASS | distance=120.00 length=120.00 |
| 12 | Input > Hit-testing with the mouse | clicking on the 2nd square selects it via world.getSpriteAt and turns it tomato | PASS | selected is sprite #2=true color=tomato |
| 13 | Groups > Sound | the example's sound files exist next to runner.html (relative URLs resolve to /moshion/<file>) | **FAIL** | loads coin.mp3, music.mp3; missing: coin.mp3, music.mp3 (shipped: assets/coin.wav, assets/music.wav) |
| 14 | Animation > addAni and changeAni | the example actually calls addAni/changeAni | **FAIL** | addAni/changeAni lines are commented out; the example sets an emoji .image instead |
| 15 | (lesson text) > fill(r, g, b, a) as written in 5.1.24 / 6.6.20 / 6.6.27 | a 4-number fill() gives a see-through colour | **FAIL** | fillStyle used: rgb(0,0,0) then rgb(255,255,255) |

Rows 13 and 14 are what the frame harness structurally cannot see: its `fetch()` always succeeds and its images
always load, which is why the gate is green while the Sound page is silent in a browser. Row 15 checks the engine
fact behind three lesson texts, measured in the same harness. The Sound example loads
`coin.mp3` and `music.mp3` relative to `/moshion/runner.html`. Neither file exists; the shipped files are
`/moshion/assets/coin.wav` and `/moshion/assets/music.wav`, and every lesson uses those absolute paths. The addAni
page's example comments out its `addAni`/`changeAni` lines and sets an emoji, so it shows no animation, although
`/moshion/assets/ghost_idle.avif`, `ghost_fly.avif` and animated textures ship.

Other docs findings:
- **No math/random page.** No docs page covers any moSHion math helper.
- **`sprite.pos` is not mentioned**, although the course uses `player.pos.x` from 5.1.9 on.
- 30 of the 63 examples still set `world.gravity.y = 0`, a no-op since gravity started at 0 (2026-11-01). It is
  harmless, but it teaches a line that does nothing.

## Cross-check with MOSHION-GAPS.md and PLACEMENT.md

The decisions are not re-litigated here. These are the places where the notes no longer match the tree.

1. **MOSHION-GAPS section 1 (drift) still reads as current.** It is superseded by section 5 and by
   `public/moshion/VENDORED.md`, which now pins `d8068bb` on `main`. **HANDOFF.md line 18** still says the copy is
   `3b77bf6` on the unmerged `gaps-fix` branch.
2. **MOSHION-GAPS section 5, last paragraph** ("`lib/moshion-docs.ts` does not yet teach the new names") is stale.
   The drawer now has Walls, Tiles, Ground sensors, Timers: every and after, Drawing plain shapes, and Coordinates.
3. **MOSHION-GAPS section 1, "no lesson uses `drawTop` or `loadSound`"**, is stale. `drawTop()` is taught in 5.4.5 and
   used through 5.4-5.11. `loadSound()` is used in 5.11.9 and 6.11. `.texture`, `.pattern` and `rayCast` are still
   unused.
4. **Gravity is now 0 by default.** MOSHION-GAPS's "sprites fall forever; students build 4 static walls" now applies
   only after a sketch sets gravity. The 5.2.3/5.2.4 starters keep `world.gravity.y = 0; // no falling: sprites stay
   where they are put`, which is now a no-op with a comment that implies otherwise. 25 lesson files carry the line.
5. **Timers.** PLACEMENT decision 3 (a random-and-timers lesson opening 5.2) is built as 5.2.1-5.2.4 on `frameCount`.
   `every()`/`after()` arrived later (moSHion `3b77bf6`) and no lesson mentions them. The owner should decide whether
   5.2.1 names them; MOSHION-GAPS still lists "no timer helper".
6. **Ground check.** MOSHION-GAPS gap 4 (ground check is `colliding(ground)`, true on walls; add `addSensor`) is
   half-closed. `addSensor` exists and has a docs page, but 5.2.9 still teaches `colliding(ground)`. That is fine on
   flat ground and still open for any platformer.
7. **"Names you must not reuse."** MOSHION-GAPS gap 5 said to add the line to 5.7/5.8 if `extends` is ever shown.
   `extends` is now shown (5.7.22 Challenge 3), and 5.3-5.5 already add custom fields to sprites. The line exists
   only in the docs drawer.
8. **PLACEMENT "Still open" is mostly decided or built.** Item 4 (console input) was decided 10-31 (#5). Item 5
   (sound) is built as 5.11.9 plus 6.11. Item 7 (Breakout) is built as 6.10. Item 8 (inheritance) is decided (#8)
   but already taught in the 5.7.22 challenge. Items 9 and 11 are decided. Item 12 (numbering) is applied in titles
   while folders keep the old ids.
9. **PLACEMENT decision 1** ("no cannon/projectile build in the functional block for now"). Defender (5.9-5.11, a
   ship-and-shots build on arrays, then classes) sits after the class modules 5.6-5.8. That is consistent with "groups
   stay at 6.1", but it is the projectile build, so the decision text is out of date.
10. **The scope-out comment at the top of `lib/moshion-docs.ts`** still lists as dropped things that are built and
    now documented: `world.autoStep`/`physicsUpdate`, `world.allowSleeping`/`sprite.sleeping`, `world.explodeAt`,
    `world.rayCast`, `world.getSpritesAt`, `sprite.angleTo`, `sprite.update`/`draw` overrides,
    `sprite.drag`/`rotationDrag`/`applyTorque`/`rotationSpeed`, `group.amount`/`autoDraw`/`autoUpdate`,
    `camera.off`/`on`, and `mouse.drags`/`dragging`/`dragged`. Of these, `camera.off`/`on`, `world.autoStep`,
    `world.allowSleeping`, `sprite.sleeping`, `sprite.angleTo` and `sprite.drag` have drawer pages; the rest are
    engine-only.
11. **Math origin.** Neither note mentions it, and nothing needs re-deciding. It lives only in the optional 5.1.25,
    and nothing after it uses it (per `public/moshion/docs/CLAUDE.md`).
12. **aiCheck.** 67 lessons in 5.x carry `aiCheck`. In this audit its only effect is to widen what graders accept
    (see the requirement-card note above). No aiCheck rubric requires an untaught call.

## Deliberately out of scope (from the existing notes)

- **3D.** The engine is 2D only; 3D is reSHape's job (`moshion.js` scope comment).
- **Deferred in MOSHION-GAPS section 5:** `camera.zoom`/`camera.follow` (6.4.19 correctly says there is no
  `camera.follow`), polygon/triangle colliders, and animation controls (`ani.play/stop/looping`, multi-row sheets).
- **Not supported by design:** p5play's `group.tile` form of tile maps (6.9.2 says so), and `overlaps()` as a
  pass-through rule (moSHion's is a question; pass-through is `collider = 'none'`).
- **PLACEMENT decisions:** groups wait until 6.1 (no groups in 5.3-5.5); console input is not a module (key-press
  title screen plus `allow-modals` for a student's own `prompt()`); inheritance is one Chapter 7 module; Breakout
  comes in Chapter 6 after grids; random and timers open 5.2; every build module gets the plan/build/playtest/reflect
  close; scope comes before static.
- **Docs scope-out, still not in the engine** (`lib/moshion-docs.ts` header): Visual/Visuals, EmojiImage, multitouch
  `pointers`, `world.renderStats`/`meterSize`, palettes, `world.timeScale`/`physicsTime`/`realTime`,
  `rayCastAll`, `sprite.passes`/`pass`, `addCollider`/`addDefaultSensors`, `playAni`/`playAnis`, `grabbable`,
  `group.addTiles`/`tile`, `autoCull`, `group.life`, subgroups, contros (gamepad), joint springiness/damping/limits,
  `color()`, `triangle()`, `textFont`, `parseTextureAtlas`, `loadImage`, `addAnis`, `anis.cutFrames`/`offset`.
- **Math mode is opt-in**, and the only lesson that uses it is the optional 5.1.25 (`public/moshion/docs/CLAUDE.md`).

## Not in moSHion: p5/p5play names a student may reach for

None of these exist in the engine. A lesson that called one would fail with a ReferenceError or do nothing.

| p5play / p5 name | where it appears in the course |
|---|---|
| deltaTime | nowhere |
| noise() | nowhere |
| loadImage() | nowhere |
| image() draw call | nowhere |
| push()/pop() transform stack | 5.5.6:req, 5.7.10:instr, 5.7.10:req, 5.7.10:starter, 5.7.10:solution |
| translate()/rotate() | nowhere |
| triangle()/arc()/point() | nowhere |
| textFont()/textWidth() | nowhere |
| camera.zoom | nowhere |
| camera.follow | 6.4.19:teach |
| contro (gamepad) | nowhere |
| sprite.mouse.* | nowhere |
| sprite.mirror | nowhere |
| ani.play()/stop()/looping | nowhere |
| keyIsDown() | nowhere |
| mouseIsPressed | nowhere |
| createCanvas() | nowhere |
| group.tile / addTiles | 6.9.2:teach |
| addCollider() | nowhere |
| sprite.passes()/pass() | nowhere |
| world.timeScale | nowhere |
| color() function | nowhere |
| keyPressed()/mousePressed() callbacks | nowhere |

Every hit above is a false alarm, checked by hand: the `pop()` hits are `segments.pop()` and a student `Bubble.pop()`
method; 6.4.19 says moSHion has *no* `camera.follow`; and 6.9.2 names `group.tile` only to say it is not supported.
No lesson uses a missing name as code. The engine exports exactly what `moshion.d.ts` declares. The only things in
the engine but not in the `.d.ts` are `Ani.holdOf()` (internal frame-hold lookup), `Sensor` (returned by `addSensor`,
not a global) and `_moshionAutoBoot` (internal).

## Full inventory

"lesson id(s)" gives the first teaching screen, then the first use if it comes earlier or differs. "modules" lists
every module where the name is taught or used. "docs drawer" means `lib/moshion-docs.ts` mentions it. Aliases share a
row (`.colour`/`.fill`, `.hw`/`.halfWidth`, and so on).

| API name | area | level | status | lesson id(s) | modules | docs drawer | note |
|---|---|---|---|---|---|---|---|
| setup() | Lifecycle | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.7 `5-1-7-lab-one-sprite` [starter,solution] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| update() hook | Lifecycle | BASIC | USED-ONLY | first used 7.1.1 `7-1-1-arcade-cabinet` [starter] | 7.1 | yes | Never taught: every course sketch reads input and moves sprites in draw(). Most docs-drawer examples use update(), and the 7.1.1 capstone starter hands students an empty update() with no explanation. |
| draw() hook | Lifecycle | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.7 `5-1-7-lab-one-sprite` [starter,solution] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| drawTop() hook | Lifecycle | BASIC | TAUGHT | taught 5.4.5 `5-4-flappy-4-reading-a-world-that-scrolls` (reading); first used 5.4.6 `5-4-flappy-5-lab-pipes-that-come-and-go` [instr,starter,solution,hints] | 5.4, 5.5, 5.9, 5.10, 5.11, 6.9, 6.10, 6.11 | yes | Taught in the 5.4.5 reading, before its first use in 5.4.6. |
| update(step) parameter | Lifecycle | ADVANCED | ABSENT | - | - | no |  |
| new Canvas(w, h) | Canvas | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.5 `5-1-5-reading-canvas` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| background() | Canvas | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.7 `5-1-7-lab-one-sprite` [starter,solution] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| clear() | Canvas | BASIC | USED-ONLY | first used 7.1.1 `7-1-1-arcade-cabinet` [starter] | 7.1 | no | Only in the 7.1.1 capstone starter (draw() { clear(); }). Not in the docs drawer, never explained. |
| noLoop() | Canvas | BASIC | USED-ONLY | first used 6.2.7 `6-1-12-challenges` [solution] | 6.2 | yes | Only the 6.2.7 challenge solution. The course ends a game with a playing flag instead. |
| start() | Canvas | ADVANCED | ABSENT | - | - | no |  |
| frameCount | Canvas | BASIC | TAUGHT | taught 5.1.15 `5-1-14-example-keyboard` (example); first used 5.1.22 `5-1-21-a10-1-sprite-playground` [instr,starter,solution,hints] | 5.1, 5.2, 5.4, 5.5, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.4, 6.5, 6.6 | yes |  |
| width (global) | Canvas | BASIC | TAUGHT | taught 5.1.5 `5-1-5-reading-canvas` (reading); first used 5.6.14 `5-3-13-lab-build-sprite` [instr] | 5.1, 5.6, 6.2, 6.6, 6.7, 6.10 | yes |  |
| height (global) | Canvas | BASIC | TAUGHT | taught 5.1.5 `5-1-5-reading-canvas` (reading); first used 5.6.14 `5-3-13-lab-build-sprite` [instr,starter] | 5.1, 5.6, 6.2, 6.6, 6.7 | yes |  |
| mouseX / mouseY | Input: mouse | BASIC | TAUGHT-LATE | taught 6.6.22 `6-6-20-example-win-screen` (example); first used 6.2.7 `6-1-12-challenges` [solution] | 6.2, 6.6 | yes | p5 alias. The 6.2.7 solution uses it before 6.6.22 explains it. |
| world.origin (math mode) | Coordinates | ADVANCED | USED-ONLY | first used 5.1.25 `5-1-25-math-grid` [instr,solution,hints] | 5.1 | yes | Only the optional, ungraded 5.1.25 lab, explained in its own steps. No reading. |
| showGrid() | Coordinates | BASIC | USED-ONLY | first used 5.1.25 `5-1-25-math-grid` [instr,solution] | 5.1 | yes | Only 5.1.25 (optional). |
| showMouse() | Coordinates | BASIC | USED-ONLY | first used 5.1.25 `5-1-25-math-grid` [instr,solution] | 5.1 | yes | Only 5.1.25 (optional). |
| new Sprite(...) any form | Sprite: create | BASIC | TAUGHT | taught 5.1.4 `5-1-4-example-minimum-sprite` (example); first used 5.1.6 `5-1-6-reading-sprite` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| new Sprite() / new g.Sprite() no args | Sprite: create | BASIC | DOCS-ONLY | grader accepts it in 5.1.25, 5.7.22 | - | yes | Only the 5.1.25 and 5.7.22 grader regexes. |
| new Sprite(x, y) | Sprite: create | BASIC | TAUGHT | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 6.1.5 `6-1-5-groups-sandbox` [instr,solution] | 6.1, 6.2 | yes | 5.3.4/6.4.18 hits were new Sprite(..., 'static') placeholders |
| new Sprite(x, y, d) circle | Sprite: create | BASIC | TAUGHT-LATE | taught 5.3.2 `5-3-pinball-1-reading-from-scene-to-game` (reading); first used 5.2.12 `moshion-bounce` [solution,hints] | 5.2, 5.3, 5.4, 5.6, 5.7, 6.3, 6.7, 6.8, 6.10, 6.11 | yes | First asked in the 5.2.12 lab step ('one size argument = circle'). No reading shows the 3-number form until 5.3.2. |
| new Sprite(x, y, w, h) box | Sprite: create | BASIC | TAUGHT | taught 5.1.4 `5-1-4-example-minimum-sprite` (example); first used 5.1.6 `5-1-6-reading-sprite` [instr] | 5.1, 5.2, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1 | yes |  |
| new Sprite(x, y, w, h, 'static'\|...) | Sprite: create | BASIC | TAUGHT | taught 5.2.5 `5-2-1-slides` (slides); first used 5.2.8 `5-2-3-lab-tune-gravity` [starter] | 5.2, 5.3, 5.4, 5.5, 5.8, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.6, 6.8, 6.9, 6.10, 6.11 | yes |  |
| STATIC / DYNAMIC / KINEMATIC constants | Sprite: collider | ADVANCED | ABSENT | grader accepts it in 6.9.4 | - | no | Only the 6.9.4 grader's regex accepts them. |
| .x / .y | Sprite: position | BASIC | TAUGHT | taught 5.1.9 `5-1-9-reading-background` (reading); first used 5.1.16 `5-1-15-reading-velocity` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| .pos | Sprite: position | BASIC | TAUGHT | taught 5.1.9 `5-1-9-reading-background` (reading); first used 5.1.24 `5-1-23-challenges` [instr] | 5.1, 5.7, 6.1, 6.2, 6.4, 6.7, 6.8 | no | The course teaches player.pos.x from 5.1.9. The docs drawer never mentions sprite.pos, only .x/.y. |
| .position | Sprite: position | ADVANCED | TAUGHT | taught 6.5.17 `6-5-17-example-three-slots` (example) | 6.5 | no |  |
| .vel | Sprite: motion | BASIC | TAUGHT | taught 5.1.15 `5-1-14-example-keyboard` (example); first used 5.1.16 `5-1-15-reading-velocity` [instr] | 5.1, 5.2, 5.3, 5.4, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.1 | yes |  |
| .velocity | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .speed | Sprite: motion | BASIC | DOCS-ONLY | - | - | yes | every course hit is a field on a plain class (this.speed in 5.11 Enemy, kind.speed in 7.1.1), not the Sprite accessor |
| .direction | Sprite: motion | BASIC | DOCS-ONLY | - | - | yes |  |
| .setSpeedAndDirection() | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .isMoving | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .rotation | Sprite: rotation | BASIC | TAUGHT | taught 5.1.10 `5-1-10-reading-sprite-props` (reading); first used 5.2.18 `5-2-13-a5-2-1-pinball-scene` [solution] | 5.1, 5.2, 5.3, 6.3 | yes |  |
| .angularVelocity | Sprite: rotation | BASIC | TAUGHT | taught 6.3.8 `6-3-8-example-pendulum` (example) | 6.3 | yes |  |
| .rotationSpeed | Sprite: rotation | BASIC | ABSENT | - | - | no |  |
| .rotationLock | Sprite: rotation | BASIC | TAUGHT-LATE | taught 6.9.2 `6-9-grids-2-reading-a-map-is-rows-of-text` (reading); first used 6.4.19 `6-4-19-challenges` [solution] | 6.4, 6.9 | yes | The 6.4.19 challenge solution uses it. First explained in 6.9.2. |
| .rotationDrag | Sprite: rotation | ADVANCED | ABSENT | - | - | no |  |
| .rotateTo() | Sprite: rotation | BASIC | DOCS-ONLY | - | - | yes |  |
| .rotateTowards() | Sprite: rotation | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .angleToFace() | Sprite: rotation | ADVANCED | ABSENT | - | - | no |  |
| .rotationToFace() | Sprite: rotation | ADVANCED | ABSENT | - | - | no |  |
| .moveTowards() | Sprite: motion | BASIC | DOCS-ONLY | - | - | yes |  |
| .moveAway() | Sprite: motion | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .attractTo() | Sprite: motion | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .repelFrom() | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .distanceTo() | Sprite: motion | BASIC | DOCS-ONLY | grader accepts it in 5.2.17 | - | yes | 5.7.1/5.8.10 teach a student-written Point.distanceTo(); the Sprite method is only an accepted alternative in the 5.2.17 grader |
| .angleTo() | Sprite: motion | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .prevPos / .previousPosition | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .prevRotation / .previousRotation | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| sprite.canvasPos | Sprite: motion | ADVANCED | ABSENT | - | - | no |  |
| .w / .h | Sprite: size | BASIC | ABSENT | - | - | no | the only hits are canvas.w / canvas.h in 6.4.12-6.4.13, and moSHion has no canvas object (use width / height) |
| .width / .height (sprite) | Sprite: size | BASIC | TAUGHT | taught 6.2.7 `6-1-12-challenges` (moshion) | 6.2 | no |  |
| .hw / .hh / .halfWidth / .halfHeight | Sprite: size | ADVANCED | ABSENT | - | - | no |  |
| .diameter | Sprite: size | BASIC | TAUGHT-LATE | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 5.7.22 `5-3-34-challenges` [solution] | 5.7, 6.1, 6.2, 6.3, 6.9 | yes | The 5.7.22 challenge solution uses it. First explained in 6.1.3 (groups). |
| .d / .r / .radius | Sprite: size | ADVANCED | ABSENT | - | - | no |  |
| .shape | Sprite: size | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .scale | Sprite: art | BASIC | TAUGHT | taught 6.4.5 `6-4-5-reading-change-ani` (reading); first used 6.4.19 `6-4-19-challenges` [instr,starter,solution] | 6.4 | yes |  |
| .scaleBy() | Sprite: art | ADVANCED | ABSENT | - | - | no |  |
| .color | Sprite: art | BASIC | TAUGHT | taught 5.1.4 `5-1-4-example-minimum-sprite` (example); first used 5.1.6 `5-1-6-reading-sprite` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| .colour / .fill (sprite alias) | Sprite: art | ADVANCED | ABSENT | grader accepts it in 6.9.10, 6.9.11 | - | no | Only the 6.9.10-6.9.11 grader regexes. |
| .stroke (sprite) | Sprite: art | BASIC | TAUGHT-LATE | taught 5.6.15 `5-3-14-moshion-sprite-showcase` (example); first used 5.6.14 `5-3-13-lab-build-sprite` [instr,starter,solution] | 5.6 | yes | The 5.6.14 lab step asks for it. The 5.6.15 example that shows it comes after. |
| .strokeWeight (sprite) | Sprite: art | BASIC | TAUGHT-LATE | taught 5.6.15 `5-3-14-moshion-sprite-showcase` (example); first used 5.6.14 `5-3-13-lab-build-sprite` [instr,starter,solution] | 5.6 | yes | Same as .stroke: asked in 5.6.14, shown in 5.6.15. |
| .visible | Sprite: art | BASIC | TAUGHT | taught 5.2.15 `5-2-10-reading-delete` (reading) | 5.2, 6.8 | yes |  |
| .layer | Sprite: art | BASIC | TAUGHT | taught 5.1.10 `5-1-10-reading-sprite-props` (reading); first used 6.4.15 `6-4-15-reading-sprite-layer` [instr] | 5.1, 6.4 | yes |  |
| .opacity | Sprite: art | BASIC | DOCS-ONLY | - | - | yes |  |
| .debug | Sprite: art | BASIC | DOCS-ONLY | - | - | yes | Docs only. Draws the collider outline. |
| .image (sprite) | Sprite: art | BASIC | TAUGHT | taught 6.4.3 `6-4-3-reading-animation` (reading); first used 6.4.7 `6-4-7-reading-sprite-image` [instr] | 6.4 | yes |  |
| .texture (sprite) | Sprite: art | BASIC | DOCS-ONLY | - | - | yes |  |
| .pattern (sprite) | Sprite: art | ADVANCED | ABSENT | - | - | no |  |
| .text (sprite label) | Sprite: label | BASIC | TAUGHT | taught 5.6.7 `5-3-6-example-devtools-reveal` (example); first used 5.7.12 `5-3-25-lab-three-vars` [starter,solution] | 5.6, 5.7, 5.8, 5.10, 5.11 | yes | Shown in the 5.6.7 example; used throughout 5.7-5.11. |
| .textColor | Sprite: label | BASIC | DOCS-ONLY | - | - | yes |  |
| .textSize (sprite) | Sprite: label | BASIC | DOCS-ONLY | - | - | yes |  |
| .textFill / .textStroke / .textStrokeWeight | Sprite: label | ADVANCED | ABSENT | - | - | no |  |
| .screenSpace | Sprite: art | ADVANCED | ABSENT | - | - | no |  |
| .autoDraw / .autoUpdate | Sprite: lifecycle | ADVANCED | ABSENT | - | - | no |  |
| sprite.update = fn (override) | Sprite: lifecycle | ADVANCED | ABSENT | - | - | no |  |
| sprite.draw = fn (override) | Sprite: lifecycle | ADVANCED | ABSENT | - | - | no |  |
| .collider | Sprite: collider | BASIC | TAUGHT-LATE | taught 5.2.16 `5-2-12-example-finished-scene` (example); first used 5.1.24 `5-1-23-challenges` [solution] | 5.1, 5.2, 5.7, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes | First used in the 5.1.24 challenge reference (collider = 'none'). First explained in 5.2.16. |
| collider = 'none' | Sprite: collider | BASIC | TAUGHT-LATE | taught 5.2.16 `5-2-12-example-finished-scene` (example); first used 5.1.24 `5-1-23-challenges` [solution] | 5.1, 5.2, 5.7, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.9, 6.10, 6.11 | yes | Same as .collider. Also the course's pass-through tool (the docs say overlaps() is only a question). |
| collider = 'kinematic' / 'kinematic' arg | Sprite: collider | BASIC | TAUGHT | taught 5.4.5 `5-4-flappy-4-reading-a-world-that-scrolls` (reading); first used 5.4.6 `5-4-flappy-5-lab-pipes-that-come-and-go` [starter,solution] | 5.4, 6.2, 6.3, 6.6, 7.1 | yes | 5.4.5 reading, then the 5.4.6 Flappy pipes. 5.1.15 says 'kinematic style of motion' in prose only |
| .body / .physicsType | Sprite: collider | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .physicsEnabled / .visualOnly | Sprite: collider | ADVANCED | ABSENT | - | - | no |  |
| .bounciness | Sprite: physics | BASIC | TAUGHT | taught 5.2.5 `5-2-1-slides` (slides); first used 5.2.12 `moshion-bounce` [instr,solution] | 5.2, 5.3, 6.5, 6.7, 6.8 | yes |  |
| .friction | Sprite: physics | BASIC | TAUGHT | taught 5.2.5 `5-2-1-slides` (slides); first used 5.2.12 `moshion-bounce` [instr,solution] | 5.2, 7.1 | yes |  |
| .density | Sprite: physics | BASIC | DOCS-ONLY | - | - | yes |  |
| .mass | Sprite: physics | BASIC | DOCS-ONLY | - | - | yes |  |
| .resetMass() / .centerOfMass | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .drag (air resistance) | Sprite: physics | BASIC | TAUGHT | taught 6.3.1 `6-3-pocket-1-reading-rolling-to-a-stop`; first used 6.3.2 `6-3-pocket-2-sub-slow-to-a-stop` [instr,solution] | 6.3, 6.4, 6.5 | yes |  |
| .rollingResistance | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .gravityScale | Sprite: physics | BASIC | ABSENT | - | - | no |  |
| .applyForce() | Sprite: physics | BASIC | TAUGHT | taught 5.2.13 `5-2-8-reading-forces-vs-velocity` (reading); first used 5.2.14 `5-2-9-lab-wind-zone` [solution] | 5.2, 6.8 | yes |  |
| .applyForceScaled() | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .applyTorque() | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .sleeping / .allowSleeping | Sprite: physics | ADVANCED | DOCS-ONLY | - | - | yes |  |
| .isSuperFast | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .surfaceSpeed | Sprite: physics | ADVANCED | ABSENT | - | - | no |  |
| .overlaps() | Contact | BASIC | TAUGHT-LATE | taught 5.9.5 `5-9-defender-5-reading-did-the-shot-hit` (reading); first used 5.7.19 `5-3-31-a12-1-collectible` [instr,solution] | 5.7, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.9, 6.10, 6.11, 7.1 | yes | The graded 5.7.19 lab (A12.1) and the 5.7.22 challenge need it; the lab step names it. First reading: 5.9.5. In 5.2.17 the grader refuses 'overlaps() alone'. |
| .overlapping() | Contact | ADVANCED | DOCS-ONLY | grader accepts it in 5.7.19 | - | yes |  |
| .overlapped() | Contact | ADVANCED | ABSENT | - | - | no |  |
| .colliding() | Contact | BASIC | TAUGHT | taught 5.2.5 `5-2-1-slides` (slides); first used 5.2.10 `5-2-5-lab-add-a-jump` [solution] | 5.2, 5.3, 5.4, 5.9, 6.3, 6.4 | yes |  |
| .collides() | Contact | BASIC | ABSENT | - | - | no | Not used. Pinball teaches a wasTouching flag instead (5.3.5 'A collision is not an event'), on purpose. |
| .collided() | Contact | ADVANCED | ABSENT | - | - | no |  |
| contact callback cb(self, other) | Contact | ADVANCED | TAUGHT | taught 6.2.2 `6-1-7-example-apple-catcher` (example); first used 6.2.6 `6-1-11-a13-1-asteroid-field` [instr] | 6.2, 6.9 | yes |  |
| sprite vs group: a.overlaps(group) etc. | Contact | ADVANCED | TAUGHT | taught 6.2.2 `6-1-7-example-apple-catcher` (example); first used 6.2.6 `6-1-11-a13-1-asteroid-field` [instr,solution] | 6.2, 6.3, 6.4, 6.9 | yes |  |
| .addSensor() / Sensor | Contact | ADVANCED | DOCS-ONLY | - | - | yes | Docs only. The 5.2.9 ground check uses colliding(ground), which is also true against a wall. |
| .remove() (sprite) | Sprite: lifecycle | BASIC | TAUGHT | taught 5.7.7 `5-3-20a-chart-the-method-chain` (console); first reading/example 5.7.11; first used 5.11.4 `5-11-defender-4-lab-enemy-takes-over` [instr,solution,hints] | 5.7, 5.11, 6.1, 6.2, 6.6, 6.8, 7.1 | yes | Named as delete()'s twin in the 5.4.6 step text; used from 5.11.4. |
| .delete() (sprite) | Sprite: lifecycle | BASIC | TAUGHT | taught 5.2.15 `5-2-10-reading-delete` (reading); first used 5.2.17 `5-2-11-lab-reaching-the-goal` [instr,starter,solution,hints] | 5.2, 5.4, 5.5, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.8, 6.9 | yes | 5.2.15 reading. |
| .removed | Sprite: lifecycle | BASIC | ABSENT | - | - | no |  |
| .life | Sprite: lifecycle | BASIC | DOCS-ONLY | - | - | yes | Docs only. The natural tool for bullets and particles that expire. |
| .groups / .joints (read-only lists) | Sprite: lifecycle | ADVANCED | ABSENT | - | - | no |  |
| .addAni() | Animation | ADVANCED | TAUGHT | taught 6.4.4 `6-4-4-reading-add-ani` (reading) | 6.4 | yes | Taught in 6.4.4. The docs drawer's addAni example has its addAni lines commented out. |
| .changeAni() | Animation | ADVANCED | TAUGHT | taught 6.4.5 `6-4-5-reading-change-ani` (reading) | 6.4 | yes |  |
| .ani (current animation) | Animation | ADVANCED | TAUGHT | taught 6.4.6 `6-4-6-reading-frame-delay` (reading) | 6.4 | yes |  |
| ani.frame / frameDelay / frameCount | Animation | ADVANCED | TAUGHT | taught 6.4.6 `6-4-6-reading-frame-delay` (reading) | 6.4 | yes |  |
| Ani / Anis classes (direct) | Animation | ADVANCED | ABSENT | - | - | no |  |
| textureNames() | Textures | ADVANCED | DOCS-ONLY | - | - | yes |  |
| hasTexture() | Textures | ADVANCED | DOCS-ONLY | - | - | yes |  |
| saveTexture() | Textures | ADVANCED | DOCS-ONLY | - | - | yes |  |
| deleteTexture() | Textures | ADVANCED | DOCS-ONLY | - | - | yes |  |
| new Group() | Group | ADVANCED | TAUGHT | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 6.1.5 `6-1-5-groups-sandbox` [instr,solution] | 6.1, 6.2, 6.3, 6.9, 7.1 | yes | 6.1.3. The 5.7.22 challenge step mentions new Group(...) in passing. |
| new group.Sprite() factory | Group | ADVANCED | TAUGHT | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 6.1.5 `6-1-5-groups-sandbox` [instr,solution] | 6.1, 6.2, 6.3 | yes |  |
| group.newSprite() | Group | ADVANCED | ABSENT | - | - | no |  |
| group defaults (group.color etc.) | Group | ADVANCED | TAUGHT | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 6.1.5 `6-1-5-groups-sandbox` [instr,solution] | 6.1, 6.2, 6.3, 6.9 | yes |  |
| group.add() / group.push() | Group | ADVANCED | TAUGHT | taught 6.1.3 `6-1-3-reading-groups` (reading); first used 7.1.1 `7-1-1-arcade-cabinet` [solution] | 6.1, 7.1 | no |  |
| group.remove(sprite) (unparent) | Group | ADVANCED | ABSENT | - | - | no |  |
| group.contains() | Group | ADVANCED | ABSENT | - | - | no |  |
| group.delete() / deleteAll() | Group | ADVANCED | TAUGHT | taught 6.9.2 `6-9-grids-2-reading-a-map-is-rows-of-text` (reading) | 6.9 | yes |  |
| group.length / for..of over group | Group | ADVANCED | TAUGHT | taught 5.11.3 `5-11-defender-3-example-finished-in-one-place` (example); first used 6.9.4 `6-9-grids-4-lab-build-the-maze` [starter,solution] | 5.11, 6.2, 6.9 | yes |  |
| group.amount | Group | ADVANCED | ABSENT | - | - | no |  |
| group.cull() | Group | ADVANCED | TAUGHT | taught 6.2.7 `6-1-12-challenges` (moshion) | 6.2 | yes | 6.2.6 grader and the 6.2.7 challenge text only. |
| group overlap/collide (group as receiver) | Group | ADVANCED | DOCS-ONLY | - | - | yes |  |
| group cascades (applyForce, moveTowards...) | Group | ADVANCED | ABSENT | - | - | no |  |
| group.texture / pattern / image | Group | ADVANCED | ABSENT | - | - | no |  |
| allSprites | Group | ADVANCED | TAUGHT | taught 5.11.3 `5-11-defender-3-example-finished-in-one-place` (example); first used 6.4.18 `6-4-18-a15-1-platformer` [instr,starter,solution] | 5.11, 6.2, 6.4 | yes | 5.11.3 example (allSprites.length as a sprite count), then 6.x. |
| new Tiles(map, x, y, w, h, legend) | Tiles & walls | ADVANCED | TAUGHT | taught 6.9.2 `6-9-grids-2-reading-a-map-is-rows-of-text` (reading); first used 6.9.4 `6-9-grids-4-lab-build-the-maze` [instr,starter,solution] | 6.9 | yes | 6.9.2 reading. 'group.tile' is named only to say it is not supported. |
| new Walls() | Tiles & walls | BASIC | DOCS-ONLY | - | - | yes | Docs only. Pinball builds its walls by hand; the 5.2.10 player can run off the ground and fall forever. |
| walls.top / bottom / left / right | Tiles & walls | BASIC | DOCS-ONLY | - | - | yes |  |
| world.gravity | World | BASIC | TAUGHT-LATE | taught 5.2.2 `5-2-random-2-example-sparkles` (example); first used 5.1.25 `5-1-25-math-grid` [instr] | 5.1, 5.2, 5.3, 5.4, 5.8, 6.2, 6.3, 6.4, 6.7, 6.8, 6.9, 7.1 | yes | Taught in the 5.2.2 example and 5.2.6 reading. The optional 5.1.25 lab mentions it first. Gravity now starts at 0, and 30 of the 63 docs examples and 25 lesson files still set world.gravity.y = 0, which does nothing. |
| world.getSpriteAt() | World | ADVANCED | TAUGHT | taught 6.7.6 `6-7-6-reading-mouse-hittest` (reading) | 6.7, 6.8 | yes |  |
| world.getSpritesAt() | World | ADVANCED | ABSENT | - | - | no |  |
| world.rayCast() | World | ADVANCED | ABSENT | - | - | no |  |
| world.explodeAt() | World | ADVANCED | ABSENT | - | - | no |  |
| world.autoStep / physicsUpdate() | World | ADVANCED | DOCS-ONLY | - | - | yes |  |
| world.allowSleeping | World | ADVANCED | DOCS-ONLY | - | - | yes |  |
| world.bounceThreshold | World | ADVANCED | ABSENT | - | - | no |  |
| camera.x / camera.y | Camera | ADVANCED | TAUGHT | taught 6.4.11 `6-4-11-reading-camera` (reading); first used 6.4.12 `6-4-12-reading-camera-xy` [instr] | 6.4 | yes | 6.4.11. The 6.4.12-6.4.13 readings write canvas.w / canvas.h, which moSHion does not define. |
| camera.off() / camera.on() | Camera | ADVANCED | DOCS-ONLY | - | - | yes | Docs only. The course uses drawTop() instead. |
| camera.isActive | Camera | ADVANCED | ABSENT | - | - | no |  |
| kb.pressing() | Input: keyboard | BASIC | TAUGHT | taught 5.1.13 `5-1-13-reading-input` (reading) | 5.1, 5.2, 5.3, 5.4, 5.7, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| kb.presses() | Input: keyboard | BASIC | TAUGHT | taught 5.1.24 `5-1-23-challenges` (moshion); first reading/example 5.2.5 | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes | First named in the 5.1.24 challenge hints. Taught by the 5.2 deck (5.2.5) and the 5.2.9 reading. |
| kb.holding() | Input: keyboard | ADVANCED | DOCS-ONLY | - | - | yes |  |
| kb.holds() | Input: keyboard | ADVANCED | DOCS-ONLY | - | - | yes |  |
| kb.held() | Input: keyboard | ADVANCED | DOCS-ONLY | - | - | yes |  |
| kb.released() / releases() | Input: keyboard | BASIC | USED-ONLY | first used 5.4.10 `5-4-flappy-8-quiz-flappy-check` [instr] | 5.4 | no | Only a wrong answer in the 5.4.10 quiz. |
| kb.pressed() (fires on key-UP) | Input: keyboard | ADVANCED | TAUGHT | taught 6.5.11 `6-5-11-reading-store-structured` (reading) | 6.5 | no |  |
| kb.holdThreshold | Input: keyboard | ADVANCED | DOCS-ONLY | - | - | yes |  |
| kb.space / kb.enter ... named keys | Input: keyboard | ADVANCED | DOCS-ONLY | - | - | yes |  |
| arrow keys = WASD twin | Input: keyboard | BASIC | TAUGHT | taught 5.1.13 `5-1-13-reading-input` (reading); first used 5.1.19 `5-1-18-lab-else-to-zero` [starter,solution] | 5.1, 5.2, 5.6, 5.7, 5.8, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1 | no |  |
| mouse.x / mouse.y | Input: mouse | BASIC | TAUGHT | taught 5.1.22 `5-1-21-a10-1-sprite-playground` (moshion); first reading/example 5.7.15; first used 5.8.16 `5-5-16-lab-count-spawns` [starter,solution] | 5.1, 5.7, 5.8, 6.6, 6.7, 6.8, 6.9, 6.10 | yes | Only as a 'try this' line in the 5.1.22 and 5.1.24 labs until 5.7.15. |
| mouse.pos / mouse.position | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| mouse.canvasPos | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| mouse.pressing() | Input: mouse | BASIC | TAUGHT | taught 6.3.3 `6-3-3-reading-input-edges` (reading); first used 6.7.4 `6-7-4-reading-mouse-pressing` [instr] | 6.3, 6.7, 6.8 | yes |  |
| mouse.presses() | Input: mouse | BASIC | TAUGHT-LATE | taught 5.7.15 `5-3-28-reading-parallel-vs-classes` (reading); first used 5.7.10 `5-3-23-lab-cleanup` [starter,solution] | 5.7, 5.8, 6.3, 6.7, 6.8, 6.9 | yes | The 5.7.10 starter uses it. First reading: 5.7.15. |
| mouse.released() / releases() | Input: mouse | BASIC | DOCS-ONLY | - | - | yes |  |
| mouse.pressed() | Input: mouse | ADVANCED | ABSENT | - | - | no |  |
| mouse.holding() / holds() / held() | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| mouse.left / center / right | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| mouse.drag / dragging / drags / dragged | Input: mouse | ADVANCED | ABSENT | - | - | no |  |
| mouse.isOnCanvas / isActive | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| mouse.cursor | Input: mouse | ADVANCED | ABSENT | - | - | no |  |
| mouse.scrollDelta | Input: mouse | ADVANCED | ABSENT | - | - | no |  |
| mouse.holdThreshold | Input: mouse | ADVANCED | DOCS-ONLY | - | - | yes |  |
| text() | Drawing & text | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.21 `5-1-24-reading-text-labels` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| text(str, x, y, size, color) 5-arg form | Drawing & text | BASIC | TAUGHT | taught 5.1.21 `5-1-24-reading-text-labels` (reading) | 5.1, 6.5, 6.6, 6.9 | yes |  |
| fill() | Drawing & text | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.21 `5-1-24-reading-text-labels` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes | 5.1.24 (hint), 6.6.20 (pause-overlay example) and 6.6.27 write fill(r, g, b, a). moSHion's fill() takes one colour, so the alpha is dropped: fill(0,0,0,120) paints solid rgb(0,0,0) (verified). |
| textSize() | Drawing & text | BASIC | TAUGHT | taught 5.1.3 `5-1-3-reading-canvas-sprite` (reading); first used 5.1.21 `5-1-24-reading-text-labels` [instr] | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 7.1 | yes |  |
| textAlign() | Drawing & text | BASIC | TAUGHT-LATE | taught 5.8.2 `5-5-2-example-counter-that-resets` (example); first used 5.7.3 `5-3-17-lab-method-no-params` [starter,solution] | 5.7, 5.8, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8 | yes | The 5.7.3 starter uses textAlign(CENTER). First example: 5.8.2. |
| CENTER / LEFT / RIGHT | Drawing & text | BASIC | TAUGHT-LATE | taught 5.8.2 `5-5-2-example-counter-that-resets` (example); first used 5.7.3 `5-3-17-lab-method-no-params` [starter,solution] | 5.7, 5.8, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8, 6.9 | yes | Same as textAlign. |
| circle() | Drawing & text | BASIC | TAUGHT | taught 5.1.24 `5-1-23-challenges` (moshion); first reading/example 5.7.15 | 5.1, 5.7 | yes | Only a hint in the 5.1.24 challenge. |
| ellipse() | Drawing & text | BASIC | ABSENT | - | - | no |  |
| rect() | Drawing & text | BASIC | TAUGHT | taught 6.5.22 `6-5-21-example-confirm-overwrite` (example); first used 6.9.10 `6-9-grids-10-lab-light-the-grid` [instr,starter,solution,hints] | 6.5, 6.6, 6.9, 6.10 | yes |  |
| square() | Drawing & text | BASIC | TAUGHT | taught 5.6.8 `5-3-7-reading-properties` (reading); first used 5.6.9 `5-3-8-lab-read-property` [starter,solution] | 5.6, 5.7 | yes |  |
| line() | Drawing & text | BASIC | DOCS-ONLY | - | - | yes |  |
| stroke() | Drawing & text | BASIC | DOCS-ONLY | grader accepts it in 5.6.14 | - | yes |  |
| noStroke() | Drawing & text | BASIC | DOCS-ONLY | - | - | yes |  |
| strokeWeight() | Drawing & text | BASIC | DOCS-ONLY | grader accepts it in 5.6.14 | - | yes |  |
| noFill() | Drawing & text | BASIC | DOCS-ONLY | - | - | yes |  |
| random() | Math & random | BASIC | TAUGHT | taught 5.2.1 `5-2-random-1-reading-random-and-timers` (reading) | 5.2, 5.3, 5.4, 5.5, 5.9, 5.10, 5.11, 6.1, 6.2, 6.5, 6.6, 6.11, 7.1 | no | Taught in 5.2.1. The docs drawer has no page for random() or any other math helper; its examples use Math.random(). |
| random([array]) pick form | Math & random | BASIC | ABSENT | - | - | no |  |
| randomSeed() | Math & random | ADVANCED | ABSENT | - | - | no |  |
| lerp() | Math & random | ADVANCED | TAUGHT | taught 5.1.24 `5-1-23-challenges` (moshion); first reading/example 6.4.14; first used 6.4.14 `6-4-14-reading-lerp-smoothing` [instr] | 5.1, 6.4 | no | A hint in the 5.1.24 challenge; reading 6.4.14. |
| map() | Math & random | ADVANCED | TAUGHT | taught 6.5.22 `6-5-21-example-confirm-overwrite` (example) | 6.5 | no |  |
| constrain() | Math & random | BASIC | ABSENT | grader accepts it in 5.9.4 | - | no |  |
| dist() | Math & random | BASIC | ABSENT | grader accepts it in 5.2.17 | - | no |  |
| round() | Math & random | BASIC | TAUGHT | taught 6.5.12 `6-5-12-example-save-player-state` (example); first used 6.9.13 `6-9-grids-13-quiz-grids-and-tile-maps` [instr] | 6.5, 6.8, 6.9, 6.10 | yes |  |
| floor() / ceil() / int() | Math & random | BASIC | TAUGHT | taught 5.2.1 `5-2-random-1-reading-random-and-timers` (reading); first used 5.2.3 `5-2-random-3-lab-random-spot-and-colour` [solution,hints] | 5.2, 5.3, 5.5, 5.10, 5.11, 6.6, 6.9, 6.10, 6.11 | no | Taught in 5.2.1. Not in the docs drawer. |
| abs() | Math & random | BASIC | ABSENT | - | - | no |  |
| min() / max() | Math & random | BASIC | TAUGHT-LATE | taught 6.6.22 `6-6-20-example-win-screen` (example); first used 5.4.11 `5-4-flappy-9-challenges-make-it-yours` [solution] | 5.4, 5.5, 6.6 | no | The 5.4.11 challenge solution uses min(). First shown in 6.6.22. |
| sqrt() / pow() | Math & random | BASIC | ABSENT | - | - | no |  |
| sin() / cos() / atan2() | Math & random | BASIC | TAUGHT | taught 5.1.15 `5-1-14-example-keyboard` (example); first used 5.1.24 `5-1-23-challenges` [instr,starter,solution] | 5.1, 6.1 | no |  |
| radians() / degrees() | Math & random | ADVANCED | ABSENT | - | - | no |  |
| PI / TWO_PI / HALF_PI | Math & random | ADVANCED | ABSENT | - | - | no |  |
| nf() | Math & random | ADVANCED | TAUGHT | taught 6.6.22 `6-6-20-example-win-screen` (example) | 6.6 | no |  |
| millis() | Time | BASIC | TAUGHT | taught 6.5.18 `6-5-18-example-delete-overwrite` (example) | 6.5, 6.6 | no |  |
| frameRate() | Time | BASIC | TAUGHT | taught 5.1.24 `5-1-23-challenges` (moshion) | 5.1 | yes | Only the 5.1.24 challenge text. |
| every(frames, fn) | Time | BASIC | DOCS-ONLY | - | - | yes | Docs page 'Timers: every and after'. The 5.2.1 timers lesson teaches frameCount % n instead. |
| after(frames, fn) | Time | BASIC | DOCS-ONLY | - | - | yes | Docs only. |
| timer.stop() / timer.active | Time | BASIC | DOCS-ONLY | - | - | yes |  |
| createVector() / new Vector() | Vector | ADVANCED | TAUGHT | taught 6.5.4 `6-5-4-example-save-highscore` (example) | 6.5 | no |  |
| vector .mag() / .normalize() / .mult() ... | Vector | ADVANCED | ABSENT | - | - | no |  |
| GlueJoint | Joints | ADVANCED | DOCS-ONLY | - | - | yes |  |
| DistanceJoint | Joints | ADVANCED | TAUGHT | taught 6.8.2 `6-7-12-reading-distance-joint` (reading) | 6.8 | yes |  |
| HingeJoint | Joints | ADVANCED | TAUGHT | taught 6.3.8 `6-3-8-example-pendulum` (example); first used 6.8.4 `6-7-14-reading-hinge-joint` [instr] | 6.3, 6.8 | yes |  |
| SliderJoint | Joints | ADVANCED | TAUGHT | taught 6.8.13 `6-7-28-challenges` (moshion) | 6.8 | yes |  |
| WheelJoint | Joints | ADVANCED | USED-ONLY | first used 6.3.10 `6-3-10-a14-2-car-ramp` [instr,starter,solution,hints] | 6.3 | yes | 6.3.10 (A14 option 'Car on a Ramp') asks for WheelJoints. No reading teaches them, and 6.8 Joints covers only Distance, Hinge and Slider. |
| GrabberJoint | Joints | ADVANCED | DOCS-ONLY | - | - | yes |  |
| joint.delete() | Joints | ADVANCED | TAUGHT | taught 6.8.6 `6-7-16-reading-joint-delete` (reading); first used 6.8.14 `6-7-27-a17-1-pong-sumo` [hints] | 6.8 | yes |  |
| DistanceJoint .length (set after) | Joints | ADVANCED | TAUGHT | taught 6.8.2 `6-7-12-reading-distance-joint` (reading); first used 6.8.14 `6-7-27-a17-1-pong-sumo` [instr,hints] | 6.8 | yes |  |
| joint options {anchor, axis, maxForce, length} | Joints | ADVANCED | TAUGHT | taught 6.8.3 `6-7-13-example-distance-pendulum` (example); first used 6.8.13 `6-7-28-challenges` [solution] | 6.8 | yes |  |
| loadSound() | Sound | BASIC | TAUGHT | taught 5.11.9 `5-11-defender-sound-lab-sound-effects` (moshion); first reading/example 6.11.1 | 5.11, 6.11 | yes | First taught inside the 5.11.9 lab's own text. First reading: 6.11.1. |
| new Sound() | Sound | ADVANCED | ABSENT | - | - | no |  |
| sound.play() | Sound | BASIC | TAUGHT | taught 5.11.9 `5-11-defender-sound-lab-sound-effects` (moshion); first reading/example 6.11.1 | 5.11, 6.11 | yes | Same as loadSound. |
| sound.play(clip) / clips | Sound | ADVANCED | USED-ONLY | first used 6.11.10 `6-11-sound-10-challenges-make-it-yours` [instr,solution] | 6.11 | yes | Only the 6.11.10 challenge text. |
| sound.loop() | Sound | BASIC | TAUGHT | taught 6.11.1 `6-11-sound-1-reading-sound-in-a-sketch` (reading); first used 6.11.4 `6-11-sound-4-lab-music-volume-and-a-mute-key` [instr,solution,hints] | 6.11 | yes |  |
| sound.stop() / pause() | Sound | BASIC | TAUGHT | taught 6.11.1 `6-11-sound-1-reading-sound-in-a-sketch` (reading); first used 6.11.7 `6-11-sound-7-lab-music-for-every-screen` [solution] | 6.11 | yes |  |
| sound.volume | Sound | BASIC | TAUGHT | taught 5.11.9 `5-11-defender-sound-lab-sound-effects` (moshion); first reading/example 6.11.1 | 5.11, 6.11 | yes | 5.11.9 lab text, then 6.11. 5.7.18 hit is a config.volume field, dropped |
| sound.pan | Sound | ADVANCED | USED-ONLY | first used 6.11.10 `6-11-sound-10-challenges-make-it-yours` [instr,solution] | 6.11 | yes | Only the 6.11.10 challenge text. |
| sound.rate | Sound | ADVANCED | TAUGHT | taught 5.11.9 `5-11-defender-sound-lab-sound-effects` (moshion); first reading/example 6.11.1 | 5.11, 6.11 | yes | 5.11.9 lab text, then 6.11. |
| sound.fade() | Sound | ADVANCED | DOCS-ONLY | - | - | yes |  |
| sound.playing | Sound | ADVANCED | TAUGHT | taught 6.11.1 `6-11-sound-1-reading-sound-in-a-sketch` (reading) | 6.11 | no |  |
| sound.loaded / ready / duration | Sound | ADVANCED | TAUGHT | taught 6.11.1 `6-11-sound-1-reading-sound-in-a-sketch` (reading) | 6.11 | no | Taught in 6.11.1, never used. |
| sound.error / blocked | Sound | ADVANCED | ABSENT | - | - | no |  |
| masterVolume() | Sound | ADVANCED | TAUGHT | taught 5.11.9 `5-11-defender-sound-lab-sound-effects` (moshion); first reading/example 6.11.1 | 5.11, 6.11 | yes | 5.11.9 lab text, then 6.11. |
| storeItem() | Storage | BASIC | TAUGHT | taught 6.5.3 `6-5-3-reading-storeitem` (reading) | 6.5, 6.6, 6.11, 7.1 | yes | 6.5 Save and Load. 5.3-5.5 keep 'best' only for the session. |
| getItem() | Storage | BASIC | TAUGHT | taught 6.5.3 `6-5-3-reading-storeitem` (reading); first used 6.5.5 `6-5-5-reading-getitem` [instr] | 6.5, 6.6, 6.11, 7.1 | yes |  |
| removeItem() | Storage | ADVANCED | TAUGHT | taught 6.5.16 `6-5-16-reading-removeitem-clearstorage` (reading) | 6.5 | yes |  |
| clearStorage() | Storage | ADVANCED | TAUGHT | taught 6.5.16 `6-5-16-reading-removeitem-clearstorage` (reading) | 6.5 | no |  |
| loadJSON() | Storage | ADVANCED | TAUGHT | taught 6.5.14 `6-5-14-reading-loadjson-async` (reading) | 6.5 | no |  |

## Method and confidence

- **Inventory:** `public/moshion/docs/moshion.d.ts` (read in full), the `global.*` export block of `moshion.js` (lines
  3718-3810), and a TypeScript-parser pass over every class, object literal and `defineProperty` in `moshion.js`. 239
  rows: each public method, property and global, with pure aliases grouped and constructor forms split by argument
  count.
- **Course matching:** regex per name over each lesson's `content.md` (plus the one real deck, `5.2_physics_feel`), its
  `lesson.json` (description, steps, hints, quiz, aiGrader prompt, requirements, aiCheck), starter and solution
  files. A worked example's code counts as teaching. Group methods are matched only on variables the same lesson
  assigns a `Group`/`Tiles`/`Walls`.
- **Hand verification:** I checked by hand every TAUGHT-late and USED-ONLY row and about 30 first-teach hits, and
  overrode 7 false positives: `.speed` (plain-class fields in 5.11 and 7.1.1), `.distanceTo` (a student `Point`
  method in 5.7.1), `canvas.w`, `config.volume`, the "kinematic style" prose, `new Sprite(..., 'static')`
  placeholders, and prose like "circle (one size number)". I grepped 22 DOCS-ONLY names raw to rule out misses.
- **What I could not verify:**
  - The 28 videos, including 5.1.12 "frame loop", which might explain `update()`.
  - 8 of the 9 slides lessons, which are placeholders with no deck.
  - Anything a teacher says in class.
  - The BASIC/ADVANCED split is my judgment against the relayed definition.
  - Course order is title-number order. The `week` fields agree except that 6.9 (week 16) sits beside 6.4-6.5.
  - Regex matching can still over-count generic names (`.x`, `.text`, `.remove`) in TAUGHT rows I did not hand-check.
    It cannot see a name a lesson teaches only in an image.
  - The behaviour checks ran in the headless harness, not a browser.
  - The 6.6.20 opaque overlay is inferred from the engine's `fill()` and the harness's recorded `fillStyle`; I did not
    look at it on screen.
