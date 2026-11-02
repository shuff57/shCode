# moSHion default gravity 9.8 -> 0: lesson audit (2026-11-01)

**Decision (owner, 2026-11-01):** moSHion's world gravity now starts at `0`, as in
p5play. A plain `new Sprite()` stays where it was put; gravity is something a sketch
turns on with `world.gravity.y = ...` (taught in 5.2.6 Reading: Gravity).

Engine: moSHion branch `default-gravity-0`, commit `91f7e6b` (off `gaps-fix`), vendored
into `public/moshion/` (see `public/moshion/VENDORED.md`).

## Method

Every moSHion sketch in the course was run headless twice in the
`scripts/moshion-harness.mjs` sandbox: once on the engine at git HEAD (default gravity
9.8), once on the new engine (default 0), 180 frames each, `Math.random` seeded the
same for both runs. Compared: every sprite's position at frames 60 and 180, how many
sprites are on the canvas at frame 180, and a hash of the last frame's draw ops.

Corpus (504 items, the same discovery as `test-moshion.mjs --corpus` plus the
`solution/` directory form): `solution.js` and runnable `script.js` starters, every
non-`plain` ```` ```js live ```` block in `lessons/*/content.md`, and the 60 examples in
`lib/moshion-docs.ts`. 81 graded scaffolds (`// STEP N:` starters with no canvas yet)
cannot run and were skipped. Step, hint and Quest-card text in `lesson.json` holds code
fragments, not sketches; it was read by hand where a lesson's text mentions falling,
gravity, dropping or landing.

## Summary

| Result | Sketches | Lessons |
| --- | --- | --- |
| Identical before and after | 306 | |
| Changed | **117** | 64 lessons + 2 docs examples |
| Already set a non-zero `world.gravity.y` (every lesson that relies on falling: Pinball, Flappy, 5.2 Physics Feel, platformers, joints, 6.x physics) | 101 | 53 |
| Set `world.gravity.y = 0` explicitly | 46 | 15 |
| Set no gravity at all | 276 (117 changed + 159 with only static / kinematic / `'none'` / position-driven sprites) | |
| Scaffolds, not runnable | 81 | |
| Errors | 0 | |

**Lessons that needed an explicit gravity line: 0.** Every one of the 117 changed
sketches sets no gravity, and in every one of them the old default was a bug: the
sprites fell off the canvas while the text said they sat still ("a square in the
middle", "three red enemies in a row", "Release the button and it stays where you
dropped it"). No changed sketch's text, steps, hints or Quest cards rely on falling,
so no `world.gravity.y = 9.8` was added anywhere. Snake, Defender and Breakout move
their sprites by hand (`'none'` colliders or position writes) and are unaffected.

## The eight reference solutions that rendered blank

Sprites on the canvas at frame 180 (before was 0: every sprite had fallen off).

| Lesson | Before | After | Draws |
| --- | --- | --- | --- |
| 5.1.7 Exploration: Move, resize and recolor a sprite (`5-1-7-lab-one-sprite`) | 0/1 | 1/1 | yes |
| 5.1.11 Hello Sprite (`5-1-11-moshion-intro`) | 0/1 | 1/1 | yes |
| 5.6.14 Your Turn: Build a Sprite (`5-3-13-lab-build-sprite`) | 0/2 | 2/2 | yes |
| 5.7.9 Lab: Mutate this.sprite.x from a method (`5-3-22-lab-mutate-sprite-prop`) | 0/1 | 1/1 | yes |
| 5.7.10 Lab: Cleanup with this.sprite.delete() (`5-3-23-lab-cleanup`) | 0/1 | 1/1 | yes |
| 5.7.12 Lab: Three Enemies in three variables (`5-3-25-lab-three-vars`) | 0/3 | 3/3 | yes |
| 5.7.13 Lab: An array of Enemies (`5-3-26-lab-array-of-instances`) | 0/5 | 5/5 | yes |
| 5.7.14 Lab: Loop over an array of instances (`5-3-27-lab-loop-instances`) | 0/5 | 5/5 | yes |

## 5.1.4 live blocks

First sprite's position, headless:

| Block | Before (9.8) | After (0) |
| --- | --- | --- |
| 3 (one sprite made in `setup()`) | y 200 -> 238 -> 349 -> 1530 (frames 1/30/60/180) | y 200 at every frame |
| 1 and 2 (a sprite made every frame in `draw()`) | y 200 -> 382 -> 561 -> 1759 | y 200 -> 200 -> 221 -> 229; x 200 -> 48 -> -28 -> -116 |

Blocks 1 and 2 no longer fall (y stays about 221), but the overlapping dynamic sprites
push each other apart sideways, so Step 2's "You just can't see them because they're
all in the same spot" is still not literally true. That was already false before (they
fell in a column). **Open for the owner**; not a gravity question.

## Text changed to match the new default

| Lesson | Before | After | Action |
| --- | --- | --- | --- |
| 5.2.6 Reading: Gravity (`5-2-2-reading-gravity`) | "Positive values pull down, `0` turns gravity off" | sketch unchanged (sets 10) | Added "Gravity starts at `0`. A sprite does not fall until you set `world.gravity.y`: that is why no sprite in 5.1 ever fell." and "Deleting the line does the same, because the world starts at `0`." "`0` turns gravity off" now reads "`0` means no gravity". The "dynamic (the default) is affected by gravity" line stays true. |
| 5.2.2 Worked Example: Sparkles on a beat (`5-2-random-2-example-sparkles`) | "switches off the pull ... Take the line out and every square falls off the bottom." (now false) | sketch unchanged (sets 0) | Reworded: the line keeps gravity at 0, it is already 0 when a sketch starts, the line is there so a reader can see nothing will fall. The false sentence is gone. Comes before 5.2.6 and still defers gravity to it. |
| 5.2.7 Worked Example: Falling Block (`moshion-gravity`) | steps 10 -> 0 -> 20 | same | None. It never says "set it back to zero"; "change to 0, the block floats" is still true. |
| 5.2.8 Lab: Tune Gravity (`5-2-3-lab-tune-gravity`) | try 10, 0, -5, 20 | same | None. r1 ("a value other than 10") unchanged. |
| 5.8.14 Reading: One value shared by every instance (`5-5-14-reading-static`) | "If a sprite in this module refuses to fall, check the body type" | its live block now stays on canvas | "If a sprite refuses to fall once `world.gravity.y` is set, check the body type". |
| 6.8.14 Two-Player Pong-Sumo (`6-7-27-a17-1-pong-sumo`) | r4 demanded `world.gravity.y = 0`, now a no-op line | solution sets 0; starter has no gravity line | r4 regex relaxed to also pass when the file never sets `world.gravity` (a top-down arena with no gravity line is now an honest shape). Step 1, r4's description, the content table row and the starter's STEP 1 comment say gravity starts at 0 and still ask for the line so a reader sees it. Reference full, starter below full (gates below). |
| 6.9.2 Reading: A map is rows of text (`6-9-grids-2-reading-a-map-is-rows-of-text`) | "so turn gravity off" | sketches unchanged (set 0) | "so gravity stays off ... here it is 0, where every world starts, and the setup writes it out". |
| in-app docs `lib/moshion-docs.ts` | "Gravity and velocity", "Top-down movement", "Your first sprite" | same examples | Same three sentences as the moSHion docs site: gravity starts at 0, keep it at 0 for top-down, a first sprite stays put until gravity is set. |

Kept as is (still true with a default of 0): 6.7.16's "`world.gravity.y = 0` keeps the
paddles floating"; 5.2.3/5.2.4's `world.gravity.y = 0; // no falling` comments; every
requirement that demands gravity ON (5.2.18 Pinball Scene r1, 5.3.4 Build the table r1,
6.3.9 Space Jumper r4, 6.3.10 Car on a Ramp r4) and 5.4.8's crash freeze r4; 7.1.1's
"Motion tuned on purpose".

## Every changed sketch

Positions are at frame 180; "first" is the first sprite in `allSprites`.

| Lesson | Sketch(es) | Before (gravity 9.8, frame 180) | After (gravity 0, frame 180) | Action |
| --- | --- | --- | --- | --- |
| 5.1.10 Reading: Sprite property tour: pos, rotation, layer (`5-1-10-reading-sprite-props`) | block1 | block1: 0/2 on canvas, first at (99.1,1459.4) | block1: 2/2 on canvas, first at (99.1,129.1) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.11 Hello Sprite (`5-1-11-moshion-intro`) | solution.js | solution.js: 0/1 on canvas, first at (200,1530.4) | solution.js: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.15 Worked Example: Keyboard Movement (`5-1-14-example-keyboard`) | block1, block2, block3 | block1: 0/1 on canvas, first at (200,1530.4)<br>block2: 1/1 on canvas, first at (200,214.7)<br>block3: 0/2 on canvas, first at (100,1530.4) | block1: 1/1 on canvas, first at (200,200)<br>block2: 1/1 on canvas, first at (200,200)<br>block3: 2/2 on canvas, first at (100,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.16 Reading: Velocity: vel.x and vel.y (`5-1-15-reading-velocity`) | block1 | block1: 0/1 on canvas, first at (760,1510.4) | block1: 0/1 on canvas, first at (760,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.17 Reading: Movement pattern (if / else if / else) (`5-1-16-reading-movement-pattern`) | block1 | block1: 1/1 on canvas, first at (180,194.7) | block1: 1/1 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.18 Reading: The else-to-zero rule (`5-1-17-reading-else-to-zero`) | block1 | block1: 0/1 on canvas, first at (180,1510.4) | block1: 1/1 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.19 Lab: Delete the else, watch drift (`5-1-18-lab-else-to-zero`) | solution.js | solution.js: 1/1 on canvas, first at (180,194.7) | solution.js: 1/1 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.14 Reading: Key names: WASD and the arrow keys (`5-1-19-reading-wasd`) | block1 | block1: 0/1 on canvas, first at (180,1430.4) | block1: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.20 Make it Move (`5-1-20-moshion-move-keys`) | solution.js | solution.js: 1/1 on canvas, first at (200,214.7) | solution.js: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.22 Sprite Playground (`5-1-21-a10-1-sprite-playground`) | solution.js | solution.js: 1/2 on canvas, first at (250,214.7) | solution.js: 2/2 on canvas, first at (250,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.24 Challenges (`5-1-23-challenges`) | solution.js | solution.js: 2/2 on canvas, first at (250,214.7) | solution.js: 2/2 on canvas, first at (250,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.4 Worked Example: Minimum Sprite Program (`5-1-4-example-minimum-sprite`) | block1, block2, block3 | block1: 68/180 on canvas, first at (214.6,1758.6)<br>block2: 68/180 on canvas, first at (214.6,1758.6)<br>block3: 0/1 on canvas, first at (200,1530.4) | block1: 145/180 on canvas, first at (-115.7,228.9)<br>block2: 145/180 on canvas, first at (-115.7,228.9)<br>block3: 1/1 on canvas, first at (200,200) | none to gravity. Blocks 1-2 (a sprite made every frame) no longer fall, but the stacked dynamic sprites push each other sideways, so "they're all in the same spot" is still not literally true. Flagged for the owner. |
| 5.1.6 Reading: Sprite: new Sprite(x, y, w, h) + .color (`5-1-6-reading-sprite`) | block1, block2 | block1: 0/1 on canvas, first at (180,1510.4)<br>block2: 0/1 on canvas, first at (180,1510.4) | block1: 1/1 on canvas, first at (180,180)<br>block2: 1/1 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.7 Exploration: Move, resize and recolor a sprite (`5-1-7-lab-one-sprite`) | solution.js, script.js | solution.js: 0/1 on canvas, first at (60,1390.4)<br>script.js: 0/1 on canvas, first at (180,1510.4) | solution.js: 1/1 on canvas, first at (60,60)<br>script.js: 1/1 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.8 Reading: Storing the sprite in a let variable (`5-1-8-reading-sprite-variable`) | block1, block2 | block1: 48/180 on canvas, first at (194.6,1658.6)<br>block2: 0/1 on canvas, first at (180,1430.4) | block1: 88/180 on canvas, first at (-135.7,128.9)<br>block2: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.1.9 Reading: background(color) wipe rule (`5-1-9-reading-background`) | block1 | block1: 0/1 on canvas, first at (190,1430.4) | block1: 1/1 on canvas, first at (190,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.2.15 Reading: Cleanup and Delete (`5-2-10-reading-delete`) | block1 | block1: 0/2 on canvas, first at (120,1430.4) | block1: 2/2 on canvas, first at (120,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.6.14 Your Turn: Build a Sprite (`5-3-13-lab-build-sprite`) | solution.js | solution.js: 0/2 on canvas, first at (120,1480.4) | solution.js: 2/2 on canvas, first at (120,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.6.15 Worked Example: Sprite Showcase (`5-3-14-moshion-sprite-showcase`) | block1, block2, block3, block4 | block1: 0/1 on canvas, first at (80,1410.4)<br>block2: 0/3 on canvas, first at (100,1530.4)<br>block3: 0/2 on canvas, first at (120,1530.4)<br>block4: 0/6 on canvas, first at (80,1410.4) | block1: 1/1 on canvas, first at (80,80)<br>block2: 3/3 on canvas, first at (100,200)<br>block3: 2/2 on canvas, first at (120,200)<br>block4: 6/6 on canvas, first at (80,80) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.8 Reading: Why this.sprite, not extends Sprite (`5-3-21-reading-composition`) | block1 | block1: 0/1 on canvas, first at (180,1430.4) | block1: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.9 Lab: Mutate this.sprite.x from a method (`5-3-22-lab-mutate-sprite-prop`) | solution.js | solution.js: 0/1 on canvas, first at (50,1430.4) | solution.js: 1/1 on canvas, first at (50,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.10 Lab: Cleanup with this.sprite.delete() (`5-3-23-lab-cleanup`) | solution.js | solution.js: 0/1 on canvas, first at (150,1480.4) | solution.js: 1/1 on canvas, first at (150,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.11 Worked Example: Write an Enemy class (integration) (`5-3-24-example-enemy-class`) | block1, block2, block3, block4 | block1: 0/1 on canvas, first at (200,1530.4)<br>block2: 0/1 on canvas, first at (200,1530.4)<br>block3: 0/1 on canvas, first at (200,1530.4)<br>block4: 0/1 on canvas, first at (200,1530.4) | block1: 1/1 on canvas, first at (200,200)<br>block2: 1/1 on canvas, first at (200,200)<br>block3: 1/1 on canvas, first at (200,200)<br>block4: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.12 Lab: Three Enemies in three variables (`5-3-25-lab-three-vars`) | solution.js | solution.js: 0/3 on canvas, first at (80,1430.4) | solution.js: 3/3 on canvas, first at (80,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.13 Lab: An array of Enemies (`5-3-26-lab-array-of-instances`) | solution.js | solution.js: 0/5 on canvas, first at (50,1430.4) | solution.js: 5/5 on canvas, first at (50,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.14 Lab: Loop over an array of instances (`5-3-27-lab-loop-instances`) | solution.js | solution.js: 0/5 on canvas, first at (50,1430.4) | solution.js: 5/5 on canvas, first at (50,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.15 Reading: Parallel Arrays vs Classes (`5-3-28-reading-parallel-vs-classes`) | block2 | block2: 0/3 on canvas, first at (90,1450.4) | block2: 3/3 on canvas, first at (90,120) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.16 Worked Example: Procedural vs OOP side-by-side (`5-3-29-example-proc-vs-oop`) | block1, block2 | block1: 0/3 on canvas, first at (100,1530.4)<br>block2: 0/3 on canvas, first at (100,1530.4) | block1: 3/3 on canvas, first at (100,200)<br>block2: 3/3 on canvas, first at (100,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.7.19 Collectible Class (`5-3-31-a12-1-collectible`) | solution.js | solution.js: 6/6 on canvas, first at (200,214.7) | solution.js: 6/6 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.6.7 Worked Example: You've been using classes (`5-3-6-example-devtools-reveal`) | block1 | block1: 0/1 on canvas, first at (200,1530.4) | block1: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.11 Worked Example: player.hit(enemy) (`5-5-11-example-player-hits-enemy`) | block1, block2 | block1: 0/2 on canvas, first at (120,1450.4)<br>block2: 0/2 on canvas, first at (120,1450.4) | block1: 2/2 on canvas, first at (120,120)<br>block2: 2/2 on canvas, first at (120,120) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.12 Lab: Write hit(other) (`5-5-12-lab-write-hit`) | solution.js | solution.js: 0/2 on canvas, first at (120,1450.4) | solution.js: 2/2 on canvas, first at (120,120) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.13 Lab: Reap the dead with filter (`5-5-13-lab-reap-the-dead`) | solution.js | solution.js: 0/4 on canvas, first at (80,1460.4) | solution.js: 4/4 on canvas, first at (80,130) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.14 Reading: One value shared by every instance (`5-5-14-reading-static`) | block1 | block1: 0/1 on canvas, first at (120,1430.4) | block1: 1/1 on canvas, first at (120,100) | text: "refuses to fall" now reads "refuses to fall once `world.gravity.y` is set". |
| 5.8.17 Worked Example: The wave spawner (`5-5-17-example-wave-spawner`) | block1, block2 | block1: 1/2 on canvas, first at (260,484.4)<br>block2: 0/3 on canvas, first at (90,434.4) | block1: 2/2 on canvas, first at (260,150)<br>block2: 3/3 on canvas, first at (90,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.18 Lab: Build a wave (`5-5-18-lab-wave-spawner`) | solution.js | solution.js: 0/3 on canvas, first at (90,434.4) | solution.js: 3/3 on canvas, first at (90,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.5 Reading: Who may change a property (`5-5-5-reading-object-owns-its-rule`) | block1 | block1: 0/1 on canvas, first at (180,1430.4) | block1: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.6 Worked Example: The number anyone can set (`5-5-6-example-hp-from-outside`) | block1, block2 | block1: 0/1 on canvas, first at (180,1430.4)<br>block2: 0/1 on canvas, first at (180,1430.4) | block1: 1/1 on canvas, first at (180,100)<br>block2: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.8 Lab: takeHit with a floor at zero (`5-5-8-lab-takehit-floor`) | solution.js | solution.js: 0/1 on canvas, first at (180,1430.4) | solution.js: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 5.8.9 Lab: Give the class its own isAlive() (`5-5-9-lab-isalive`) | solution.js | solution.js: 0/1 on canvas, first at (180,1430.4) | solution.js: 1/1 on canvas, first at (180,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.1.3 Reading: moSHion docs: Groups (`6-1-3-reading-groups`) | block1 | block1: 0/5 on canvas, first at (71.8,1510.4) | block1: 5/5 on canvas, first at (16,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.1.4 Worked Example: Iterating a Group (`6-1-4-example-iterate-group`) | block1, block2, block3 | block1: 0/5 on canvas, first at (61.2,1597.3)<br>block2: 5/5 on canvas, first at (62.5,288.8)<br>block3: 0/30 on canvas, first at (61.2,1597.3) | block1: 5/5 on canvas, first at (60.3,267)<br>block2: 5/5 on canvas, first at (62.5,274.1)<br>block3: 30/30 on canvas, first at (60.3,267) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.2.3 Reading: moSHion docs: Collisions + Overlaps (`6-1-8-reading-collisions`) | block1 | block1: 1/4 on canvas, first at (180,180) | block1: 4/4 on canvas, first at (180,180) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.4.13 Reading: Camera-follow pattern (`6-4-13-reading-camera-follow`) | block1 | block1: 5/17 on canvas, first at (0,150) | block1: 6/17 on canvas, first at (0,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.4.14 Reading: Smoothing with lerp (`6-4-14-reading-lerp-smoothing`) | block1 | block1: 5/17 on canvas, first at (0,150) | block1: 6/17 on canvas, first at (0,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.4.15 Reading: sprite.layer (render order) (`6-4-15-reading-sprite-layer`) | block1 | block1: 6/18 on canvas, first at (0,150) | block1: 7/18 on canvas, first at (0,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.4.9 Animated Sprites Sandbox (`6-4-9-animated-sprites-sandbox`) | solution.js | solution.js: 0/1 on canvas, first at (200,1550.4) | solution.js: 1/1 on canvas, first at (200,220) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.12 Worked Example: Save Full Player State (`6-5-12-example-save-player-state`) | block1, block2, block3, block4 | block1: 1/1 on canvas, first at (250,214.7)<br>block2: 1/1 on canvas, first at (250,214.7)<br>block3: 1/1 on canvas, first at (250,214.7)<br>block4: 1/1 on canvas, first at (250,214.7) | block1: 1/1 on canvas, first at (250,200)<br>block2: 1/1 on canvas, first at (250,200)<br>block3: 1/1 on canvas, first at (250,200)<br>block4: 1/1 on canvas, first at (250,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.13 Worked Example: Restore Full Player State from a Save (`6-5-13-example-restore-player-state`) | block1, block2, block3 | block1: 0/1 on canvas, first at (250,1530.4)<br>block2: 1/1 on canvas, first at (250,214.7)<br>block3: 1/1 on canvas, first at (250,214.7) | block1: 1/1 on canvas, first at (250,200)<br>block2: 1/1 on canvas, first at (250,200)<br>block3: 1/1 on canvas, first at (250,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.17 Worked Example: Three Save Slots (`6-5-17-example-three-slots`) | block1, block2, block3, block4 | block1: 1/2 on canvas, first at (200,164.7)<br>block2: 1/2 on canvas, first at (200,164.7)<br>block3: 1/2 on canvas, first at (200,164.7)<br>block4: 1/2 on canvas, first at (200,164.7) | block1: 2/2 on canvas, first at (200,150)<br>block2: 2/2 on canvas, first at (200,150)<br>block3: 2/2 on canvas, first at (200,150)<br>block4: 2/2 on canvas, first at (200,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.18 Worked Example: Delete and Overwrite a Save Slot (`6-5-18-example-delete-overwrite`) | block1, block2, block3, block4 | block1: 1/2 on canvas, first at (200,164.7)<br>block2: 1/2 on canvas, first at (200,164.7)<br>block3: 1/2 on canvas, first at (200,164.7)<br>block4: 1/2 on canvas, first at (200,164.7) | block1: 2/2 on canvas, first at (200,150)<br>block2: 2/2 on canvas, first at (200,150)<br>block3: 2/2 on canvas, first at (200,150)<br>block4: 2/2 on canvas, first at (200,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.22 Worked Example: Confirm Before Overwriting a Save (`6-5-21-example-confirm-overwrite`) | block1, block2, block3, block4 | block1: 1/1 on canvas, first at (200,164.7)<br>block2: 1/1 on canvas, first at (200,164.7)<br>block3: 1/1 on canvas, first at (200,164.7)<br>block4: 1/1 on canvas, first at (200,164.7) | block1: 1/1 on canvas, first at (200,150)<br>block2: 1/1 on canvas, first at (200,150)<br>block3: 1/1 on canvas, first at (200,150)<br>block4: 1/1 on canvas, first at (200,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.25 Worked Example: Auto-Save on Level Complete or Timer (`6-5-24-example-autosave-level`) | block1, block2, block3, block4 | block1: 1/2 on canvas, first at (60,1430.4)<br>block2: 1/2 on canvas, first at (60,1430.4)<br>block3: 1/2 on canvas, first at (60,1430.4)<br>block4: 1/2 on canvas, first at (60,1430.4) | block1: 2/2 on canvas, first at (60,100)<br>block2: 2/2 on canvas, first at (60,100)<br>block3: 2/2 on canvas, first at (60,100)<br>block4: 2/2 on canvas, first at (60,100) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.26 Save System: Build Save/Load with Slots (`6-5-25-a16-1-save-system`) | solution.js | solution.js: 1/1 on canvas, first at (60,214.7) | solution.js: 1/1 on canvas, first at (60,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.5.4 Worked Example: Save a High Score on Game Over (`6-5-4-example-save-highscore`) | block1, block2 | block1: 0/2 on canvas, first at (200,1530.4)<br>block2: 0/2 on canvas, first at (200,1530.4) | block1: 2/2 on canvas, first at (200,200)<br>block2: 2/2 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.11 Worked Example: Title Screen with Start Button (`6-6-11-example-title-start-button`) | block3, block4 | block3: 0/1 on canvas, first at (200,1480.4)<br>block4: 0/1 on canvas, first at (200,1480.4) | block3: 1/1 on canvas, first at (200,150)<br>block4: 1/1 on canvas, first at (200,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.13 Worked Example: Three-State Machine: Title, Play, Game Over (`6-6-13-example-three-state-machine`) | block3, block4 | block3: 0/2 on canvas, first at (100,1480.4)<br>block4: 0/2 on canvas, first at (100,1480.4) | block3: 2/2 on canvas, first at (100,150)<br>block4: 2/2 on canvas, first at (100,150) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.18 Worked Example: Score Threshold Triggers Game Over (`6-6-17-example-score-threshold`) | block1, block2, block3 | block1: 0/1 on canvas, first at (250,1680.4)<br>block2: 0/1 on canvas, first at (250,1680.4)<br>block3: 0/1 on canvas, first at (250,1680.4) | block1: 1/1 on canvas, first at (250,350)<br>block2: 1/1 on canvas, first at (250,350)<br>block3: 1/1 on canvas, first at (250,350) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.20 Worked Example: Adding a Pause State (`6-6-19-example-pause-state`) | block1, block2, block3 | block1: 0/1 on canvas, first at (250,1680.4)<br>block2: 0/1 on canvas, first at (250,1680.4)<br>block3: 0/1 on canvas, first at (250,1680.4) | block1: 1/1 on canvas, first at (250,350)<br>block2: 1/1 on canvas, first at (250,350)<br>block3: 1/1 on canvas, first at (250,350) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.22 Worked Example: Win Screen State (`6-6-20-example-win-screen`) | block1, block2, block3 | block1: 1/2 on canvas, first at (0,0.8)<br>block2: 1/2 on canvas, first at (0,0.8)<br>block3: 1/2 on canvas, first at (0,0.8) | block1: 2/2 on canvas, first at (0,0)<br>block2: 2/2 on canvas, first at (0,0)<br>block3: 2/2 on canvas, first at (0,0) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.24 Worked Example: Save on State Transition (`6-6-22-example-save-on-transition`) | block1, block2, block3 | block1: 0/1 on canvas, first at (300,1530.4)<br>block2: 0/1 on canvas, first at (300,1530.4)<br>block3: 0/1 on canvas, first at (300,1530.4) | block1: 1/1 on canvas, first at (300,200)<br>block2: 1/1 on canvas, first at (300,200)<br>block3: 1/1 on canvas, first at (300,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.25 Worked Example: Continue Loads the Correct State (`6-6-23-example-continue-right-state`) | block1, block2, block3, block4 | block1: 0/1 on canvas, first at (300,1530.4)<br>block2: 0/1 on canvas, first at (300,1530.4)<br>block3: 0/1 on canvas, first at (300,1530.4)<br>block4: 0/1 on canvas, first at (300,1530.4) | block1: 1/1 on canvas, first at (300,200)<br>block2: 1/1 on canvas, first at (300,200)<br>block3: 1/1 on canvas, first at (300,200)<br>block4: 1/1 on canvas, first at (300,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.6.26 Game States: State Machine with Persistence (`6-6-24-a16-2-game-states`) | solution.js | solution.js: 0/1 on canvas, first at (200,1530.4) | solution.js: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
| 6.7.10 Worked Example: Drag a Sprite Around (`6-7-10-example-drag-sprite`) | block1, block2 | block1: 0/1 on canvas, first at (200,1530.4)<br>block2: 0/1 on canvas, first at (200,1530.4) | block1: 1/1 on canvas, first at (200,200)<br>block2: 1/1 on canvas, first at (200,200) | none: no text, step, hint or Quest card relies on falling; the sprite now stays where the text says it is |
