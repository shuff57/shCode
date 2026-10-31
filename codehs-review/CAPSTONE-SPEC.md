# Capstone spec: Defender (modules 5.9, 5.10, 5.11)

Written 2026-10-31 on branch `codehs-inspiration` (HEAD `7eaab0f0`). Spec only: no lesson file exists yet.
Every script in this file was run, in the course's own headless harness and in a real Chromium; section 9
says how. The code blocks are the verified files, pasted by a script, not retyped.

**Placement.** After 5.8 Inside a Class (ends on 5.8.20, the Unit 5 check) and before 6.1 Groups. Three
modules, one game that grows: Part A builds the base procedurally, Part B adds enemies and waves still
procedurally so the code gets visibly messy, Part C rebuilds it with classes and closes the capstone.

**Size.** 26 lessons: 8 + 9 + 9 (the brief aimed at 24-27). Nothing was cut to get there.

---

## 1. The game, and why this one

**Defender.** A ship slides left and right along the bottom of a 400 x 400 canvas, above a grey base strip.
Holding Space fires yellow shots straight up, at most one every 12 frames. Enemies fall from the top in
waves: crimson ones take one shot (worth 10), every third one is orange and takes three (worth 30). An enemy
that reaches the base costs the base 1 of its 3 hp; at 0 the round is over, and R starts a new one. Each
wave has two more enemies than its number and falls a little faster.

It is the brief's "Defender" with one change: **shots go straight up and the ship only moves sideways**
(a vertical shooter), not a free-flying top-down arena ship that aims.

| Reason | Detail |
| --- | --- |
| No maths the course has not taught | Aiming in 2D needs angles or a normalised vector. Nothing in Units 1-5 teaches either, and a capstone is the wrong place to inject trig. Straight-up shots keep every new idea about objects, not geometry. |
| It grows out of Flappy | 5.4 taught "build on a timer, keep in an array, delete in two places". Part A is that pattern twice (shots, then the drone); Part B is two such arrays that have to meet. |
| The mess in Part B is real, not staged | Two arrays that interact need a nested loop with splices in both, an enemy needs more than one number (hp, worth), and an enemy can leave two ways (shot down, landed). That is exactly where parallel arrays and copied removal code hurt. |
| Part C reuses 5.8 almost line for line | `takeHit`/`isAlive` (5.8.8-5.8.9), a method whose parameter is another object (`Bullet.hits(enemy)`, 5.8.10-5.8.12), reap with `filter` (5.8.13), `static spawned` (5.8.14-5.8.16), the wave spawner (5.8.17-5.8.18). |
| It is PLACEMENT's "wave shooter" | `codehs-review/PLACEMENT.md` proposes Brick Breaker, a wave shooter and a boss fight as OOP games. Challenge 2 adds the boss. |
| It hands 6.1 a motive | 6.1's apple catcher and Asteroid Field replace exactly the arrays, nested loop and cleanup the student wrote here with a `Group` and one `overlaps(group, cb)` call. |

Kept out on purpose: groups (6.1 teaches them), inheritance and `extends` (never taught; MOSHION-GAPS lists
the Sprite-subclass traps), sound, sprite art, the camera, angles.

---

## 2. What the student already knows, and what each part adds

### Assumed from before 5.9 (each is taught on the screen named)

| Idea | Taught in |
| --- | --- |
| `new Sprite(x, y, w, h, 'static')`, `collider = 'none'` for pass-through things | 5.2, 5.2.17 Lab: Reaching the Goal |
| `kb.pressing` (held) vs `kb.presses` (one frame), `'space'`, arrows and WASD | 5.1; 5.2.9 Reading: Ground-Gated Actions |
| `random(a, b)`, `floor`, `frameCount % n === 0` | 5.2.1 Reading: Random numbers and timers |
| An array of sprites built on a timer, a backwards `for` loop with `delete()` + `splice` | 5.4.5 Reading: A world that scrolls, 5.4.6 Lab: Pipes that come and go |
| The `playing` flag, a restart function that puts back everything a round owns, R to restart | 5.3.9 Reading: The state of the game, 5.4.8, 5.5.6 (`startRound`) |
| Words on screen in `drawTop()` | 5.4.5, 5.5.2 |
| Moving a sprite by setting `x`/`y` instead of `vel` | 5.5.3, 5.5.4 (grid moves) |
| Nested loops; `break` leaves only the inner loop | 2.4.25 Worked Example: A Multiplication Table, 2.4.26 Plain English to Pseudocode: Nested Loops, 2.4.27 Worked Example: break Leaves Only the Inner Loop |
| Ternary `a ? b : c` | 2.1.22 |
| `sprite.text = String(n)` | 5.8.8 |
| Parallel arrays and why they drift | 5.7.15 Reading: Parallel Arrays vs Classes, 5.7.16 |
| The three-question class checklist | 5.7.18 Reading: When to reach for OOP (3-question checklist) |
| Class, constructor, `this`, methods, `this.sprite` by composition, `this.sprite.delete()` from a method | 5.6, 5.7.3-5.7.11, 5.7.10 Lab: Cleanup with this.sprite.delete() |
| `takeHit(n)` with a floor at 0, `isAlive()` | 5.8.8, 5.8.9 |
| A method whose parameter is another object | 5.8.10 Reading: A parameter that is another object, 5.8.12 |
| `list = list.filter((e) => e.isAlive())` | 5.8.13 Lab: Reap the dead with filter |
| `static spawned = 0`, `Enemy.spawned += 1` in the constructor | 5.8.14-5.8.16 |
| A wave: `enemies.length === 0` before spawning a group | 5.8.17 Worked Example: The wave spawner |

`overlaps()` has appeared once, as an instruction inside 5.7.19 Collectible Class. It is **taught properly
in 5.9.5** before any card asks for it.

### New in each part (taught on the screen named, before any lab asks for it)

| Part | New idea | Taught in | First asked in |
| --- | --- | --- | --- |
| A | Clamping a position with two ifs | 5.9.2 | 5.9.4 |
| A | **A countdown you start yourself** (`cooldown`), versus the `frameCount` beat | 5.9.2, 5.9.3 | 5.9.4 |
| A | `overlaps()` as a level-triggered geometry test; why `colliding()` is wrong for pass-through shots; removing the shot on the frame it hits | 5.9.5 | 5.9.6 |
| A | Base hp with a game-over gate (assembly of 5.3/5.4 ideas) | recall 5.3.9, 5.4.8 | 5.9.7 |
| B | Several facts about one enemy kept in **parallel arrays**, used on purpose | 5.10.1 (recalls 5.7.15) | 5.10.2 |
| B | **Every shot against every enemy**: a nested loop with a splice and a `break` | 2.4.25-2.4.27 recalled in 5.10.4 | 5.10.3 (plain words), 5.10.5 (code) |
| B | A wave with a pause: the same countdown as the cooldown, gated on a clear field | 5.10.6 (recalls 5.8.17) | 5.10.7 |
| B | Reading a drift bug in parallel arrays | 5.10.1, 5.10.4 | 5.10.8 |
| C | Refactoring: same behaviour, rules moved to their owners | 5.11.1 | 5.11.2 (design), 5.11.4-5.11.6 |
| C | **Finished in one place**: objects only change state; once a frame the scene removes finished ones from the screen, then the list | 5.11.3 | 5.11.4 |
| C | Two classes answering the same question (`isAlive()` on Bullet and Enemy) | 5.11.3, 5.11.5 | 5.11.5 |
| C | A class that owns pacing (`Spawner`), and `Enemy.spawned = 0` in a restart | 5.11.1 | 5.11.6 |

---

## 3. Conventions every builder follows

- **Folders** `5-9-defender-<n>-<slug>`, `5-10-defender-<n>-<slug>`, `5-11-defender-<n>-<slug>`; the folder
  name is the D1 id, so it is final once shipped. **Titles** start with the displayed number (`5.10.4 Reading: ...`);
  `check-lesson-numbers` orders by it, and `localeCompare(..., {numeric: true})` already sorts `5.10` after `5.9`
  (3.10 exists today).
- **lesson.json fields**, copied from the 5.5 Snake folders: `category: "Unit 2: moSHion: Applied Game Development"`,
  `unit: "5.9 Project: Defender, Part A"` / `"5.10 Project: Defender, Part B"` / `"5.11 Project: Defender, Part C"`,
  `slos: ["SLO-3"]` (add `"SLO-2"` on 5.11.x), `week: 12` (pacing is an open question, section 11). Readings:
  `type "lesson", preview "reading"`. Examples: `type "lesson", preview "example"` with a `js live` block.
  Labs and challenges: `type "lesson", preview "moshion"`, `script.js` + `solution.js`, `steps`, `requirements`
  with `points: 0`. Quizzes: `type "assignment", preview "quiz", points 0, quiz.passPercent 70`. Plan and playtest
  screens: `type "assignment", preview "assignment", points 0`, an `aiGrader` with `model "glm-5.3-flash:cloud"`
  and 0-point rubric items, exactly the shape of `lessons/5-5-snake-1-plan-break-snake-into-parts/lesson.json`.
- **Points.** 0 everywhere, as in 5.4 and 5.5.
- **Code shape** (every script and example): canvas 400 x 400 (examples may use 400 x 300); `background('#111')`;
  everything that moves is moved by hand inside `if (playing) { ... }`, so game over freezes the world with no
  freeze code; **all words on screen are drawn in `drawTop()`**; `startRound()` puts back everything a round owns and
  is called by `setup()` and by `if (kb.presses('r')) startRound();` (R works at any time, as in Snake).
- **Names are fixed across all three parts** so the before/after comparison in 5.11.1 is line for line:
  `BASE_Y = 370`, `ship`, `base`, `bullets`, `cooldown`, `score`, `baseHp`, `playing`, `enemies`, `enemyHp`,
  `enemyWorth`, `wave`, `wavePause`, `fallSpeed`, `moveShip()`, `fire()`, `moveBullets()`, `moveEnemies()`,
  `hitEnemies()`, `spawnEnemy()`, `spawnWave()`, `nextWave()`, `startRound()`.
- **No** `Group`, `extends`, `super`, `vel` for game objects, `colliding()` for shots, `textAlign`, `constrain`
  in references (a student may use `constrain`; the clamp card accepts it).
- Requirement descriptions end with `Help: <number> (<exact title>)` so `check-help-pointer-titles` and
  `check-prompt-pointers` resolve them. Where a card list below says only `Help: 5.9.2`, write it out in full,
  `Help: 5.9.2 (Reading: A ship, and a timer you start yourself)`, from the title lists in sections 4-6. AI prompts open with the 5.5.1 sentence ("Everything you need is ... go
  back and reread it if you get stuck. A few short sentences per answer is plenty, in your own everyday words.").
  Every rubric item's description is its own first sentence followed by the **lenient tail of 5.5.1, verbatim**,
  with "Snake" replaced by "Defender".
- **AI-graded screens are 0-point and lenient** (`feedback_pseudocode-grading-lax`): anything that gestures at the
  question is met; only a blank answer or one about something else is a miss.

---

## 4. Module 5.9 — Project: Defender, Part A (ship and shots)

**Goal.** Build a playable base: a ship that stays on screen, shots on a cooldown that are cleaned up, one drone
that scores when shot, a base that loses hp when the drone lands, game over and restart. All functions and
arrays, no classes.

**Pre-snapshot.** 5.8 complete (and with it 5.4/5.5's arrays of sprites, `playing`, `startRound`, `drawTop`).
**Post-snapshot.** Can rate-limit an action with a countdown variable, test two sprites with `overlaps()`, remove
a hit sprite from the screen and the array on the frame it hits, and run a round with lives, game over and restart.

**The concept Part A adds:** a timer you start yourself. `frameCount % n` ticks on its own; a cooldown starts when
something happens and counts down to 0.

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 5.9.1 | `5-9-defender-1-plan-break-defender-into-parts` | plan (AI) | The whole three-part game in a paragraph; name the parts, what is remembered, what first, what is hard. | 0 | 12 |
| 5.9.2 | `5-9-defender-2-reading-a-ship-and-a-cooldown` | reading | Clamp the ship with two ifs; why held fire needs a cooldown; a countdown versus the beat; moving by hand inside `if (playing)`. | 0 | 8 |
| 5.9.3 | `5-9-defender-3-example-fire-with-a-cooldown` | example | Hold Space; change `COOLDOWN` to 0, 4, 30 and watch the gap between shots. | 0 | 8 |
| 5.9.4 | `5-9-defender-4-lab-fly-and-fire` | lab | Clamp the ship, fire on a cooldown, delete shots that leave the top. | 0 | 18 |
| 5.9.5 | `5-9-defender-5-reading-did-the-shot-hit` | reading | `overlaps()`, why not `colliding()`, remove the shot on the hit frame, put the drone back at a random x. | 0 | 8 |
| 5.9.6 | `5-9-defender-6-lab-hit-the-drone` | lab | A shot that overlaps the drone scores, leaves, and sends the drone back to the top. | 0 | 12 |
| 5.9.7 | `5-9-defender-7-lab-hold-the-base` | lab | Base hp, a landing costs 1, game over at 0, R starts again. | 0 | 15 |
| 5.9.8 | `5-9-defender-8-quiz-ship-and-shots` | quiz | Six questions on clamping, the cooldown, cleanup, `overlaps`, the `playing` gate. | 0 | 8 |

Titles: `5.9.1 Plan: Break Defender into parts`, `5.9.2 Reading: A ship, and a timer you start yourself`,
`5.9.3 Worked Example: Fire with a cooldown`, `5.9.4 Lab: Fly and fire`, `5.9.5 Reading: Did the shot hit?`,
`5.9.6 Lab: Hit the drone`, `5.9.7 Lab: Hold the base, and start again`, `5.9.8 Check: Ship and shots`.

### 5.9.1 Plan (AI-graded, 0 points)
Content: "Plan before you build" as in 5.5.1, then **Defender, in one paragraph** (the paragraph in section 1),
then one line: "You will build it in three parts: 5.9 the ship and its shots against a single drone, 5.10 many
enemies and waves, 5.11 the same game rebuilt with classes." Prompt pointer: `this page and 5.5.1 (Plan: Break
Snake into parts)`. Questions and rubric items, as 5.5.1: `parts` (four or more parts: ship, shots, enemies, base,
score, waves, game over, restart), `remember` (two or more things kept between frames: where the shots are, enemy
hp, score, base hp, cooldown, whether the round is on), `first` (a first part and any reason), `unsure` (one part
they are unsure how to build).

### 5.9.2 Reading: A ship, and a timer you start yourself
Points to make, in order: (1) the ship moves by `ship.x -= 5` / `+= 5` on `kb.pressing`, and two ifs put it back
inside 20..380; (2) holding Space with `kb.pressing` is true on every frame, so firing on it alone makes 60 shots a
second; `kb.presses` would make the player hammer the key; (3) a **cooldown** is a number you set when you fire and
count down by 1 every frame, firing only at 0: show the four lines of `fire()` minus the sprite; "cooldown 12 means
at most 5 shots a second"; (4) a beat (`frameCount % n`) ticks whether or not anything happened, a cooldown starts
when something happens: table of the two; (5) in this game everything moves by hand (`b.y -= 8`) inside
`if (playing)`, so when the round ends every line that moves stops and nothing needs freezing (contrast 5.4.8,
which had to zero gravity and every pipe's `vel.x`). Glossary: cooldown, clamp.

### 5.9.3 Worked Example: Fire with a cooldown
Live block (verified):

```js
// Hold Space. The cooldown decides how far apart the shots are.
const COOLDOWN = 12;   // try 0, 4 and 30

let ship, bullets, cooldown, fired;

function setup() {
  new Canvas(400, 300);
  ship = new Sprite(200, 270, 36, 18, 'static');
  ship.color = 'deepskyblue';
  bullets = [];
  cooldown = 0;
  fired = 0;
}

function draw() {
  background('#111');

  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    fired += 1;
    cooldown = COOLDOWN;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('cooldown: ' + cooldown, 12, 24);
  text('shots fired: ' + fired, 12, 46);
}
```

"What you'll see": holding Space gives a shot every 12 frames, five a second; `cooldown` runs 12 to 0 between
them. Try this: `COOLDOWN = 0` (a solid stream: one shot every frame), `4`, `30`; delete the line
`if (cooldown > 0) cooldown -= 1;` (one shot, then never again: the timer never runs out).

### 5.9.4 Lab: Fly and fire
Steps: **s1 Keep the ship on the canvas** (two ifs in `moveShip()`; hint: `if (ship.x < 20) ship.x = 20;`);
**s2 Fire on a cooldown** (count down, fire when Space is held and `cooldown === 0`, reset to 12; hints: the
countdown line, the condition); **s3 Shots that leave are deleted** (in `moveBullets()`, delete and splice a shot
whose `y < -20`; "shots alive" in `drawTop()` should hold at 4 or fewer; if it climbs, shots are not removed; hint
points back to 5.4.6).

Solution = the Part A final (section 8.1) with `A6-from-A7` then `A4-from-A6` applied. Starter = that solution with:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// 5.9.4 Lab: Fly and fire (reference solution).
+// 5.9.4 Lab: Fly and fire.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -22,30 +22,24 @@
 function moveShip() {
   if (kb.pressing('left')) ship.x -= 5;
   if (kb.pressing('right')) ship.x += 5;
-  if (ship.x < 20) ship.x = 20;
-  if (ship.x > 380) ship.x = 380;
+  // STEP 1: hold left for a while: the ship slides off the canvas. Add two ifs
+  //   here that put it back: x no smaller than 20 and no bigger than 380.
 }
 
 // Holding Space fires, but only when the cooldown has counted down to 0.
 function fire() {
-  if (cooldown > 0) cooldown -= 1;
-  if (kb.pressing('space') && cooldown === 0) {
-    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
-    b.collider = 'none';
-    b.color = 'yellow';
-    bullets.push(b);
-    cooldown = 12;
-  }
+  // STEP 2: count cooldown down by 1 while it is above 0. Then, when Space is
+  //   held AND cooldown is 0: build a 6 by 14 sprite at (ship.x, ship.y - 18),
+  //   set its collider to 'none' and its colour to 'yellow', push it onto
+  //   bullets, and set cooldown to 12.
 }
 
 // Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
 function moveBullets() {
   for (let i = bullets.length - 1; i >= 0; i--) {
     bullets[i].y -= 8;
-    if (bullets[i].y < -20) {
-      bullets[i].delete();
-      bullets.splice(i, 1);
-    }
+    // STEP 3: a shot whose y is less than -20 has left the top. Delete it and
+    //   splice it out of bullets, as Flappy did with its pipes.
   }
 }
 
```

Cards (patterns in section 7): r1 the ship stays on the canvas (Help: 5.9.2); r2 the cooldown counts down (Help:
5.9.2); r3 a shot is made only when Space is held and the cooldown is 0 (Help: 5.9.3); r4 firing sets the cooldown
again (Help: 5.9.3); r5 shots that leave the top are deleted and spliced out (Help: 5.4.6 (Lab: Pipes that come and go)).
Refuse: a push outside any if (fires every frame); an if on Space alone; resetting the cooldown to 0; splice
without `delete()` (the sprite stays on screen); one side of the clamp only. Accept: `cooldown--`,
`cooldown <= 0`, `!cooldown`, `kb.pressing(' ')`, `constrain(ship.x, 20, 380)`, `Math.max/min`, splice-then-delete
(`bullets.splice(i, 1)[0].delete()`), a forward loop with `i--`.

### 5.9.5 Reading: Did the shot hit?
(1) `a.overlaps(b)` asks: do these two sprites' boxes overlap **this frame**? It is level-triggered like
`colliding()` (5.3.4): true on every frame they touch. (2) Why not `colliding()`: shots and the drone have
`collider = 'none'` so they pass through instead of shoving each other, and `colliding()` only reports physical
contact; `overlaps()` reads their boxes whatever the collider. (3) Because it is level-triggered, the shot must
leave on the frame it hits (delete + splice), or one shot scores on every frame it overlaps. (4) A hit puts the
drone back above the top at `random(30, 370)`: show `resetDrone()`. (5) Loop backwards over `bullets`, as in 5.4.6,
because a hit splices. Include a short live block: the A6 reference is fine.

### 5.9.6 Lab: Hit the drone
Steps: **s1 The shot that hits leaves** (inside the loop: `if (bullets[i].overlaps(drone))`, delete and splice);
**s2 A hit scores and resets the drone**. Solution = Part A final with `A6-from-A7` applied. Starter:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// 5.9.6 Lab: Hit the drone (reference solution).
+// 5.9.6 Lab: Hit the drone.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -69,12 +69,9 @@
 // A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
 function hitDrone() {
   for (let i = bullets.length - 1; i >= 0; i--) {
-    if (bullets[i].overlaps(drone)) {
-      bullets[i].delete();
-      bullets.splice(i, 1);
-      score += 1;
-      resetDrone();
-    }
+    // STEP 1: when bullets[i] overlaps the drone, delete the shot and splice
+    //   it out of bullets.
+    // STEP 2: on the same hit, add 1 to score and call resetDrone().
   }
 }
 
```

Cards: r1 overlaps is used on the drone (Help: 5.9.5); r2 the shot that hit leaves the screen and the array (Help:
5.9.5); r3 a hit scores 1 and resets the drone (Help: 5.9.5). Refuse: `score += 1` outside the overlap if (scores
every frame). Accept `drone.overlaps(bullets[i])`, `score++`, setting `drone.y = -20` by hand instead of `resetDrone()`.

### 5.9.7 Lab: Hold the base, and start again
Steps: **s1 Three hp a round** (add `baseHp = 3;` to `startRound()`; the HUD stops saying `undefined`); **s2 A
landing costs 1** (in `moveDrone()`; at 0, `playing = false`); **s3 Game over, and R** (the words in `drawTop()`
when `!playing`; `if (kb.presses('r')) startRound();` in `draw()`; check that R gives back 3 hp, score 0, no old
shots). Solution = Part A final. Starter:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// Defender, Part A: ship, shots and one drone (5.9 reference).
+// 5.9.7 Lab: Hold the base, and start again.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -63,9 +63,9 @@
 function moveDrone() {
   drone.y += 1.5;
   if (drone.y > BASE_Y) {
-    baseHp -= 1;
+    // STEP 2: reaching the base costs the base 1, and at 0 the round is over
+    //   (playing = false). Everything inside if (playing) in draw() then stops.
     resetDrone();
-    if (baseHp <= 0) playing = false;
   }
 }
 
@@ -88,7 +88,7 @@
   resetDrone();
   cooldown = 0;
   score = 0;
-  baseHp = 3;
+  // STEP 1: give the base 3 hp at the start of every round.
   playing = true;
 }
 
@@ -103,7 +103,7 @@
     hitDrone();
   }
 
-  if (kb.presses('r')) startRound();
+  // STEP 3 (second half): pressing R starts a new round.
 }
 
 // drawTop() runs after the sprites, so nothing can cover the words.
@@ -113,10 +113,6 @@
   text('score: ' + score, 12, 26);
   text('base: ' + baseHp, 310, 26);
 
-  if (!playing) {
-    textSize(30);
-    text('Game over', 122, 190);
-    textSize(14);
-    text('press R to play again', 128, 216);
-  }
+  // STEP 3: when the round is over, write Game over and press R to play again
+  //   in the middle of the screen.
 }
```

Cards: r1 every round starts with base hp (Help: 5.4.8 (Lab: Crash, and start again)); r2 reaching the base costs 1
(Help: 5.9.2); r3 at 0 the round ends (Help: 5.3.9 (Reading: The state of the game)); r4 Game over is written in
drawTop when the round is over (Help: 5.4.5 (Reading: A world that scrolls)); r5 R starts a new round (Help: 5.4.8
(Lab: Crash, and start again)). Accept `playing = baseHp > 0`, `baseHp--`, `kb.pressing('r')`.

### 5.9.8 Check: Ship and shots (6 questions, passPercent 70)

| id | Question | Options (answer first marked *) | sourceIds |
| --- | --- | --- | --- |
| q1-rate | `cooldown` is set to 12 after each shot. Holding Space for one second (60 frames) fires how many shots? | *5 / 12 / 60 / 1 | 5-9-defender-2-reading-a-ship-and-a-cooldown |
| q2-clamp | What do `if (ship.x < 20) ship.x = 20;` and its partner do? | *keep the ship on the canvas / slow the ship down / stop the ship firing / end the round | 5-9-defender-2-reading-a-ship-and-a-cooldown |
| q3-start | A beat (`frameCount % 12 === 0`) and a cooldown both give a 12-frame gap. What can only the cooldown do? | *start counting when something happens, such as a shot / run faster / count backwards past 0 / run while the round is over | 5-9-defender-3-example-fire-with-a-cooldown |
| q4-back | Why does `moveBullets()` loop from the end of `bullets` to the start? | *a splice moves every later shot down one place, and going backwards none is skipped / it is faster / shots fly upwards / the newest shot must move first | 5-9-defender-4-lab-fly-and-fire |
| q5-once | `overlaps()` is true on every frame a shot touches the drone. Why does one shot score only 1? | *the shot is deleted and spliced out on the frame it hits / overlaps only fires once / the drone has collider 'none' / score is capped | 5-9-defender-5-reading-did-the-shot-hit |
| q6-freeze | When `baseHp` reaches 0 the code sets `playing = false` and nothing else. Why does everything stop moving? | *every line that moves something is inside `if (playing)` / the base deletes every sprite / `playing` sets gravity to 0 / drawTop stops drawing | 5-9-defender-7-lab-hold-the-base |

(Shuffle the option order when writing the JSON; the starred one is the answer. Explanations: one sentence each
restating the reason.)

---

## 5. Module 5.10 — Project: Defender, Part B (enemies and waves, the procedural way)

**Goal.** Turn the one drone into a field of enemies with hp and worth, shoot them with every shot against every
enemy, bring them in waves, and feel what it costs to keep one enemy's facts in three arrays.

**Pre-snapshot.** 5.9 complete. **Post-snapshot.** Can keep related facts in parallel arrays and keep them in step,
test every member of one array against every member of another with a nested loop that splices safely, run waves
with a pause, and find a drift bug. Can say, with numbers from their own code, what that layout costs.

**The concept Part B adds:** two arrays that meet. The new technique is the nested hit loop; the new lesson is
what parallel arrays cost.

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 5.10.1 | `5-10-defender-1-reading-many-enemies-parallel-arrays` | reading | From one drone to many enemies; hp and worth in two more arrays beside the sprites, on purpose. | 0 | 8 |
| 5.10.2 | `5-10-defender-2-lab-a-field-of-enemies` | lab | Write `spawnEnemy` (three pushes) and the fall-and-land loop (three splices). | 0 | 18 |
| 5.10.3 | `5-10-defender-3-plan-the-hit-loop` | plan (AI) | Every shot against every enemy, in plain words, before any code. | 0 | 12 |
| 5.10.4 | `5-10-defender-4-reading-every-shot-against-every-enemy` | reading | The nested loop, why both run backwards, why `break` after a hit, what a kill removes. | 0 | 10 |
| 5.10.5 | `5-10-defender-5-lab-shoot-them-down` | lab | Write `hitEnemies()`. | 0 | 18 |
| 5.10.6 | `5-10-defender-6-example-waves-with-a-pause` | example | Waves arrive only when the field is clear, after a countdown. | 0 | 8 |
| 5.10.7 | `5-10-defender-7-lab-waves` | lab | Write `nextWave()` and `spawnWave()`, reset the wave in `startRound()`. | 0 | 18 |
| 5.10.8 | `5-10-defender-8-debugging-the-enemy-that-would-not-die` | debugging lab | One forgotten `enemyHp.splice` makes a crimson "1" take three shots. Find it, fix it. | 0 | 15 |
| 5.10.9 | `5-10-defender-9-quiz-enemies-and-waves` | quiz | Six questions; the last asks how many places change to give every enemy one more fact. | 0 | 8 |

Titles: `5.10.1 Reading: Many enemies, kept in parallel arrays`, `5.10.2 Lab: A field of enemies`,
`5.10.3 Plan: The hit loop in plain words`, `5.10.4 Reading: Every shot against every enemy`,
`5.10.5 Lab: Shoot them down`, `5.10.6 Worked Example: Waves with a pause`, `5.10.7 Lab: Waves`,
`5.10.8 Debugging: The enemy that would not die`, `5.10.9 Check: Enemies and waves`.

### Where the mess is deliberately felt

5.10.1 says it in its first paragraph: "You already know a class would hold this better (5.7.15). This module
builds it the way you would have before classes, on purpose, so that 5.11 has something real to fix. Keep a
tally as you go." Then the mess shows up in the student's own code, in these places of the Part B final (8.2):

| Where | What the student types or reads | Why it hurts |
| --- | --- | --- |
| declarations | `let enemies, enemyHp, enemyWorth;` with "index j in all three is the same enemy" | one enemy is three entries that only an agreement holds together |
| `spawnEnemy()` | three pushes | forget one and every later enemy is off by one |
| `moveEnemies()` landing | `delete()` + three splices | copy 1 of the removal |
| `hitEnemies()` kill | the same `delete()` + three splices | copy 2 of the same four lines |
| `hitEnemies()` loop | `i`, `j`, splice inside a nested loop, `break` so a removed shot is not read again | the fiddliest loop in the course so far |
| `startRound()` | delete every sprite and empty three arrays | a fourth array would need a fourth line here too |
| 5.10.8 | the landing copy is missing `enemyHp.splice(j, 1)` | labels and hp disagree; a crimson "1" needs three shots and its label goes to "2" |
| 5.10.9 q6 | "to give every enemy a shield value, how many places change?" | answer: a new array, its push, a splice in both removal copies, a reset in `startRound`, the line that uses it |

Measured on the references: Part B has **8 `splice` calls, 13 lines that name `enemyHp` or `enemyWorth`, 5
index loops and a `break`**; Part C has 0, 0, 1 (the loop that builds a wave) and 0. Part C is longer (177 code
lines against 138); 5.11.1 says so honestly: the class version is not shorter, it has one place for each rule.

### 5.10.1 Reading: Many enemies, kept in parallel arrays
(1) The mess paragraph above. (2) Show `spawnEnemy()` from the final whole: a crimson or orange sprite with its hp
on it as text, and three pushes. (3) A table: index j → `enemies[j]`, `enemyHp[j]`, `enemyWorth[j]`. (4) The rule:
every push and every splice happens to all three arrays, at the same index. (5)
`fallSpeed` moves every enemy the same; it is one number, not an array. (6) Recall 5.7.15's drift picture in one
sentence, not more.

### 5.10.2 Lab: A field of enemies
Starter gives `spawnOnBeat()` (one enemy every 60 frames, one in four tough), already called in `draw()`; the drone
is gone and shots pass through enemies until 5.10.5. Steps: **s1 Build an enemy** (`spawnEnemy`: sprite, collider,
colour by hp, text, three pushes); **s2 Fall and land** (`moveEnemies`: backwards loop, move by `fallSpeed`, a
landing costs 1, delete and splice all three); **s3 Watch** (let three land: the round ends; press R: no enemy is
left behind; tough ones are orange and say 3).

Solution = Part B final (8.2) with `B5-from-B7` then `B2-from-B5` applied. Starter:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// 5.10.2 Lab: A field of enemies (reference solution).
+// 5.10.2 Lab: A field of enemies.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -57,13 +57,10 @@
 
 // Builds one enemy and adds it to all three arrays, so they stay in step.
 function spawnEnemy(x, y, hp) {
-  const e = new Sprite(x, y, 30, 30);
-  e.collider = 'none';
-  e.color = hp > 1 ? 'orange' : 'crimson';
-  e.text = String(hp);
-  enemies.push(e);
-  enemyHp.push(hp);
-  enemyWorth.push(hp * 10);
+  // STEP 1: build a 30 by 30 sprite at (x, y) with collider 'none', colour
+  //   'orange' if hp is more than 1 and 'crimson' if not, and text String(hp).
+  //   Then push the sprite onto enemies, hp onto enemyHp and hp * 10 onto
+  //   enemyWorth: one push per array, so index j means the same enemy in all three.
 }
 
 // Every 60 frames one enemy arrives at a random spot above the top.
@@ -77,16 +74,9 @@
 
 // Every enemy falls. One that reaches the base costs 1 and is removed from all three arrays.
 function moveEnemies() {
-  for (let j = enemies.length - 1; j >= 0; j--) {
-    enemies[j].y += fallSpeed;
-    if (enemies[j].y > BASE_Y) {
-      baseHp -= 1;
-      enemies[j].delete();
-      enemies.splice(j, 1);
-      enemyHp.splice(j, 1);
-      enemyWorth.splice(j, 1);
-    }
-  }
+  // STEP 2: loop over enemies from the end to the start. Move each one down by
+  //   fallSpeed. One whose y is more than BASE_Y costs the base 1: delete its
+  //   sprite and splice index j out of ALL THREE arrays.
   if (baseHp <= 0) playing = false;
 }
 
```

Cards: r1 spawnEnemy builds a pass-through sprite (Help: 5.2.17 (Lab: Reaching the Goal)); r2 one push per array
(Help: 5.10.1); r3 enemies fall (Help: 5.10.1); r4 a landing costs the base 1 (Help: 5.9.7); r5 a landed enemy
leaves the screen and all three arrays (Help: 5.10.1). r5 also reads a helper named `removeEnemy` (the
`inFunction` list), so a student who writes one is not refused. Refuse: two splices out of three; splices without
`delete()`.

### 5.10.3 Plan: The hit loop in plain words (AI-graded, 0 points)
Prompt pointer: `this page, 2.4.26 (Plain English to Pseudocode: Nested Loops) and 5.9.6 (Lab: Hit the drone)`.
Content: "5.9.6 tested every shot against one drone. Now there are many enemies. Before any code, write the steps
for one frame in plain words or pseudocode." Questions → rubric items: `pairs` (which two lists, and that every
shot meets every enemy; "a loop inside a loop" or any gesture counts); `shot` (what happens to a shot that hits:
it goes away, from the screen and/or the list); `enemy` (what happens to the enemy: loses hp; at none it is gone
and scores); `arrays` (which lists change when an enemy is shot down, ideally all three). Lenient tail on each.

### 5.10.4 Reading: Every shot against every enemy
(1) Recall 2.4.25: the outer loop picks a shot, the inner loop tries it against every enemy; 5 shots and 4
enemies is 20 tests. (2) Both loops run backwards because both can splice. (3) On a hit the shot is spliced; the
inner loop must stop at once, so `break` (2.4.27: it leaves only the inner loop, and the outer one goes on to the
next shot). Without it, `bullets[i]` is now a different shot, tested a second time, or `undefined`. Measured: one
shot alone on screen hitting the second enemy in the array stops the sketch with the red banner `TypeError: Cannot
read properties of undefined (reading 'overlaps')`; show that message. (With several shots alive it usually does
not crash, which is why the bug hides.) (4) On a hit: `enemyHp[j] -= 1`, update the label; at 0: score
`enemyWorth[j]`, delete, three splices. (5) Point out that the last four lines are the same four lines as the
landing in `moveEnemies()`: "keep that in mind".

### 5.10.5 Lab: Shoot them down
Steps: **s1 Every shot against every enemy** (nested backwards loops, `overlaps`, on a hit delete + splice the
shot and `break`); **s2 A hit takes 1 hp** (and shows it); **s3 Shot down** (score the worth, delete, three
splices). Solution = Part B final with `B5-from-B7` applied. Starter:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// 5.10.5 Lab: Shoot them down (reference solution).
+// 5.10.5 Lab: Shoot them down.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -93,24 +93,13 @@
 // Every shot against every enemy. A hit removes the shot and takes 1 hp;
 // an enemy at 0 hp scores its worth and is removed from all three arrays.
 function hitEnemies() {
-  for (let i = bullets.length - 1; i >= 0; i--) {
-    for (let j = enemies.length - 1; j >= 0; j--) {
-      if (bullets[i].overlaps(enemies[j])) {
-        bullets[i].delete();
-        bullets.splice(i, 1);
-        enemyHp[j] -= 1;
-        enemies[j].text = String(enemyHp[j]);
-        if (enemyHp[j] <= 0) {
-          score += enemyWorth[j];
-          enemies[j].delete();
-          enemies.splice(j, 1);
-          enemyHp.splice(j, 1);
-          enemyWorth.splice(j, 1);
-        }
-        break;   // this shot is gone: stop testing it against the others
-      }
-    }
-  }
+  // STEP 1: a loop over bullets from the end, and inside it a loop over enemies
+  //   from the end. When bullets[i] overlaps enemies[j]: delete the shot, splice
+  //   it out, and break (the shot is gone, so stop testing it).
+  // STEP 2: on the same hit, take 1 from enemyHp[j] and show the new number on
+  //   the enemy (enemies[j].text = String(enemyHp[j])).
+  // STEP 3: if that leaves enemyHp[j] at 0 or less, add enemyWorth[j] to score,
+  //   delete the enemy and splice index j out of all three arrays.
 }
 
 // Puts back everything a round owns. setup() and the R key both use it.
```

Cards: r1 every shot is tested against every enemy (Help: 5.10.4); r2 a hit removes the shot (Help: 5.10.4); r3 a
hit takes 1 hp (Help: 5.10.4); r4 at 0 hp the enemy scores its worth and leaves all three arrays (Help: 5.10.4);
r5 a shot that hit is not tested again (`break`, or `return`) (Help: 2.4.27 (Worked Example: break Leaves Only the
Inner Loop)). Accept either nesting order, `enemies[j].overlaps(bullets[i])`, `enemyHp[j]--`, `=== 0`, a
`removeEnemy(j)` helper. Refuse: a kill that splices only `enemies`.

### 5.10.6 Worked Example: Waves with a pause
Live block (verified):

```js
// Waves: a new wave only when the field is clear, after a pause.
let enemies, wave, wavePause;

function setup() {
  new Canvas(400, 300);
  enemies = [];
  wave = 0;
  wavePause = 60;
}

function spawnWave() {
  wave += 1;
  for (let i = 0; i < wave + 2; i++) {
    const e = new Sprite(40 + floor(random(8)) * 45, -20 - i * 50, 30, 30);
    e.collider = 'none';
    e.color = 'crimson';
    enemies.push(e);
  }
}

function nextWave() {
  if (enemies.length > 0) return;   // the field is not clear yet
  wavePause -= 1;                   // the same countdown as the cooldown in 5.9
  if (wavePause <= 0) {
    spawnWave();
    wavePause = 90;
  }
}

function draw() {
  background('#111');
  nextWave();

  for (let j = enemies.length - 1; j >= 0; j--) {
    enemies[j].y += 2;
    if (enemies[j].y > 300) {
      enemies[j].delete();
      enemies.splice(j, 1);
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('wave: ' + wave, 12, 24);
  text('on the field: ' + enemies.length, 12, 46);
  text('pause: ' + wavePause, 12, 68);
}
```

What you'll see: a pause of 60 frames, then three enemies in a column; nothing new until all have fallen out;
then 90 frames and four more. Try this: delete `if (enemies.length > 0) return;` (waves pile up every 90 frames:
5.8.17's conveyor belt); change `wave + 2` to `wave * 2`. Point out that `wavePause` is the cooldown from 5.9
wearing a different name.

### 5.10.7 Lab: Waves
Steps: **s1 A round starts at wave 0** (`wave = 0; wavePause = 60;` in `startRound()`; the HUD stops saying
`undefined`); **s2 Count down on a clear field** (`nextWave()`); **s3 Build a wave** (`spawnWave()`: wave + 1,
`fallSpeed`, `wave + 2` enemies in a column, every third tough). Then play to wave 3 and press R mid-wave.
Solution = Part B final (8.2). Starter:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// Defender, Part B: enemies and waves, the procedural way (5.10 reference).
+// 5.10.7 Lab: Waves.
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -69,22 +69,15 @@
 // One wave: two more enemies than the wave number, in a column above the top,
 // every third one tough. Each wave falls a little faster.
 function spawnWave() {
-  wave += 1;
-  fallSpeed = 0.5 + wave * 0.25;
-  for (let i = 0; i < wave + 2; i++) {
-    const hp = i % 3 === 2 ? 3 : 1;
-    spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp);
-  }
+  // STEP 3: add 1 to wave and set fallSpeed to 0.5 + wave * 0.25. Then loop
+  //   wave + 2 times; on loop number i, hp is 3 when i % 3 === 2 and 1 otherwise,
+  //   and spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp).
 }
 
 // While the field is clear, the pause counts down; at 0 the next wave comes.
 function nextWave() {
-  if (enemies.length > 0) return;
-  wavePause -= 1;
-  if (wavePause <= 0) {
-    spawnWave();
-    wavePause = 90;
-  }
+  // STEP 2: if any enemies are left, return. Otherwise count wavePause down by 1,
+  //   and when it reaches 0, call spawnWave() and set wavePause back to 90.
 }
 
 // Every enemy falls. One that reaches the base costs 1 and is removed from all three arrays.
@@ -133,8 +126,7 @@
   enemies = [];
   enemyHp = [];
   enemyWorth = [];
-  wave = 0;
-  wavePause = 60;
+  // STEP 1: every round starts at wave 0, with a pause of 60 frames.
   fallSpeed = 1;
   cooldown = 0;
   score = 0;
```

Cards: r1 every round starts at wave 0 with a pause (Help: 5.10.6); r2 the pause counts down only on a clear field
(Help: 5.10.6); r3 at 0 the next wave comes and the pause starts again (Help: 5.10.6); r4 a wave adds 1 to the wave
number and builds its enemies in a loop with spawnEnemy (Help: 5.10.6).

### 5.10.8 Debugging: The enemy that would not die
Content: "Something is wrong with this game, and it is not in the part you are looking at." Steps: **s1 Make it
happen** (let one enemy of wave 1 land, shoot the rest, then watch wave 2: one crimson enemy labelled 1 takes three
shots and its label goes up to 2; an orange 3 dies in one); **s2 Find it** (the bug only appears after a landing:
put the two pieces of code that remove an enemy side by side and compare them line by line); **s3 Fix it**;
**s4 (optional) Make it impossible to forget** (move the four removal lines into `function removeEnemy(j)` and call
it from both places; the cards accept this). Reflection line for the content, not graded: "a function stops the
copying; it does not stop a fourth array from needing a fourth splice."

Solution = Part B final (8.2), byte for byte. Starter = the final with one line gone:

```diff
--- solution.js
+++ script.js
@@ -1,4 +1,4 @@
-// Defender, Part B: enemies and waves, the procedural way (5.10 reference).
+// 5.10.8 Debugging: The enemy that would not die (starter, with the planted bug).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -95,7 +95,6 @@
       baseHp -= 1;
       enemies[j].delete();
       enemies.splice(j, 1);
-      enemyHp.splice(j, 1);
       enemyWorth.splice(j, 1);
     }
   }
```

Measured: after one landing in wave 1, wave 2 starts with `[color, label, enemyHp[j]]` =
`[crimson,1,3] [crimson,1,1] [orange,3,1] [crimson,1,3]` and array lengths 4/5/4 (fixed: all labels agree, 4/4/4).
Cards: r1 a landed enemy leaves all three arrays (Help: 5.10.1); r2 a shot-down enemy leaves all three arrays
(Help: 5.10.4; already true in the starter, which is fine: the starter scores 1 of 2). Both read
`["moveEnemies"|"hitEnemies", "removeEnemy"]`.

### 5.10.9 Check: Enemies and waves (6 questions)

| id | Question | Options (* = answer) | sourceIds |
| --- | --- | --- | --- |
| q1-index | `enemies[2]`, `enemyHp[2]` and `enemyWorth[2]`: what do they have in common? | *they describe the same enemy / they are the same number / they were made on the same frame / nothing | 5-10-defender-1-reading-many-enemies-parallel-arrays |
| q2-tests | 5 shots and 4 enemies are alive. At most how many overlap tests does `hitEnemies()` make this frame? | *20 / 9 / 5 / 4 | 5-10-defender-4-reading-every-shot-against-every-enemy |
| q3-break | Why does the inner loop `break` right after a shot hits? | *that shot has been spliced out, so `bullets[i]` is now a different shot or undefined / to end the round / to stop every loop in draw() / to save the score | 5-10-defender-4-reading-every-shot-against-every-enemy |
| q4-clear | Why does `nextWave()` start with `if (enemies.length > 0) return;`? | *the pause only counts while the field is clear, so waves cannot pile up / to stop shots / to reset the score / it makes enemies fall faster | 5-10-defender-6-example-waves-with-a-pause |
| q5-drift | The landing code splices `enemies` and `enemyWorth` but not `enemyHp`. What do you see? | *later enemies read the wrong hp: labels and the shots they need disagree / nothing / the round ends / enemies stop falling | 5-10-defender-8-debugging-the-enemy-that-would-not-die |
| q6-cost | You want each enemy to have a shield value too. In this Part B code, what has to change? | *a new array, a push in spawnEnemy, a splice in both removal places, a line in startRound, and the line that uses it / one line in spawnEnemy / only startRound / nothing, sprites can hold it | 5-10-defender-1-reading-many-enemies-parallel-arrays, 5-10-defender-8-debugging-the-enemy-that-would-not-die |

---

## 6. Module 5.11 — Project: Defender, Part C (classes clean it up)

**Goal.** Rebuild Part B as three classes with the same behaviour, then playtest, check and extend it. This
closes the capstone with the written playtest-and-reflect and the challenges.

**Pre-snapshot.** 5.10 complete. **Post-snapshot.** Can refactor working procedural code into classes without
changing what it does, keep removal in one place, use one object's method on another, own a timer inside a class,
and reset a class variable on restart. Ready for 6.1, where a `Group` does the list-keeping.

**The concept Part C adds:** refactoring. Same game, same numbers, rules moved to the objects that own them.

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 5.11.1 | `5-11-defender-1-reading-count-the-cost` | reading | Count Part B's splices and copies, run the 5.7.18 checklist, draw the three classes, say what each owns. | 0 | 10 |
| 5.11.2 | `5-11-defender-2-plan-draw-the-classes-first` | plan (AI) | Properties and methods for Bullet, Enemy, Spawner before any code. | 0 | 15 |
| 5.11.3 | `5-11-defender-3-example-finished-in-one-place` | example | An Enemy class and the two-line reap: the screen, then the list. | 0 | 10 |
| 5.11.4 | `5-11-defender-4-lab-enemy-takes-over` | lab | Finish Enemy, swap the parallel arrays for one array of objects, reap once. | 0 | 25 |
| 5.11.5 | `5-11-defender-5-lab-bullet` | lab | Bullet with `hits(enemy)`; the nested loop loses every splice and the `break`. | 0 | 20 |
| 5.11.6 | `5-11-defender-6-lab-a-spawner-for-the-waves` | lab | Spawner owns wave and pause; `Enemy.spawned`; a restart is `new Spawner()`. | 0 | 22 |
| 5.11.7 | `5-11-defender-7-playtest-and-reflect` | playtest (AI) | Play three rounds, find one surprise, link it to a class, compare with Part B. | 0 | 15 |
| 5.11.8 | `5-11-defender-8-quiz-defender-with-classes` | quiz | Seven questions on where things live after the refactor. | 0 | 10 |
| 5.11.9 | `5-11-defender-9-challenges-make-it-yours` | challenges | Best score, a boss every fifth wave, or a Ship class that owns its cooldown. One card. | 0 | 25 |

Titles: `5.11.1 Reading: Count the cost`, `5.11.2 Plan: Draw the classes first`,
`5.11.3 Worked Example: Finished in one place`, `5.11.4 Lab: Enemy takes over`,
`5.11.5 Lab: Bullet, and a hit that takes an enemy`, `5.11.6 Lab: A Spawner for the waves`,
`5.11.7 Playtest and reflect: Defender`, `5.11.8 Check: Defender with classes`, `5.11.9 Challenges: Make it yours`.

### How Part C removes the mess

| Part B | Part C | Where |
| --- | --- | --- |
| `let enemies, enemyHp, enemyWorth;` | `let enemies;` holding `Enemy` objects; `this.hp`, `this.worth = hp * 10`, `this.speed` | 5.11.4 |
| `spawnEnemy()`: three pushes | `new Enemy(x, y, hp, speed)` | 5.11.4, then inside `makeWave()` in 5.11.6 |
| landing: `delete()` + three splices | `e.land()` (hp to 0) | 5.11.4 |
| kill: `enemyHp[j] -= 1`, label, `delete()` + three splices | `e.takeHit(1); if (!e.isAlive()) score += e.worth;` | 5.11.4 |
| two removal copies | **one** reap per list, once a frame: `if (!e.isAlive()) e.remove();` then `enemies = enemies.filter(...)` | 5.11.3, 5.11.4 |
| shots as bare sprites, deleted when off the top | `Bullet` with `move`, `isAlive` (not spent and on screen), `spend`, `remove` | 5.11.5 |
| nested index loops, splice inside, `break` | `for (const b of bullets) for (const e of enemies) if (b.hits(e)) { b.spend(); ... }` | 5.11.5 |
| `wave`, `wavePause`, `fallSpeed`, `nextWave()`, `spawnWave()` | `Spawner` with `wave`, `pause`, `ready(enemiesLeft)`, `makeWave()` | 5.11.6 |
| `startRound()` resets three arrays and three wave globals | `spawner = new Spawner(); Enemy.spawned = 0;` and two lists | 5.11.6 |

**One honest wrinkle the content must say aloud.** 5.7.18's checklist asks "more than one of this thing?" first.
`Bullet` and `Enemy` pass all three questions; **`Spawner` fails the first** (there is one). 5.11.1 says so, and
gives the reason it is a class anyway: its three facts (wave, pause, speed) change together, so a restart is one
line, `spawner = new Spawner()`, that cannot forget a piece, which is the bug 5.10.8 was about. 5.11.2 asks the
student to name it, 5.11.8 q6 checks it. (If the owner prefers to keep the checklist absolute, see section 11.)

**"Finished in one place", the rule 5.11.3 teaches and 5.11.4-5.11.5 use.** Inside the frame, objects only change
state (`takeHit`, `land`, `spend`); nothing is spliced inside a loop. At the end of the frame, for each list: first
`remove()` every finished one (the screen), then `filter` to keep the alive ones (the list). Two places, in that
order, once: the same two places as Flappy's pipes, now written once instead of in every loop. It also makes the
double `delete()` impossible (a finished object is removed on the one frame it is filtered out); deleting a sprite
twice destroys its physics body twice, which moSHion does not guard against.

### 5.11.1 Reading: Count the cost
(1) Put three numbers from Part B on the screen: 8 splices, 13 lines that name `enemyHp`/`enemyWorth`, two copies
of the removal; and the 5.10.8 bug. (2) Run 5.7.18's checklist on bullet, enemy, spawner (table, Spawner's honest
"no" on question 1 and the restart reason). (3) The design table, in 5.8.17's "where it lives" form:

| Job | Owner |
| --- | --- |
| a shot's position and whether it is used up | `Bullet` (`sprite`, `spent`) |
| an enemy's hp, worth, speed, and what a hit does | `Enemy` (`hp`, `worth`, `speed`, `takeHit`) |
| how many enemies this round has built | `Enemy.spawned` (static), set back to 0 by `startRound()` |
| which wave it is and how long until the next | `Spawner` (`wave`, `pause`) |
| which shots and enemies are alive | the scene: `bullets`, `enemies` |
| score, base hp, cooldown, playing | the scene |

(4) Say that the class version will be longer, and why that is fine. (5) "Every lab in this module keeps the game
playing exactly as before: same waves, same speeds, same score." (Measured: the same autopilot run gives the same
score, base and wave on B, after 5.11.4, after 5.11.5 and on C; section 9.)

### 5.11.2 Plan: Draw the classes first (AI-graded, 0 points)
Prompt pointer: `this page and 5.11.1 (Reading: Count the cost)`. Questions → rubric items: `remember` (for at
least two of the three classes, something each one remembers); `does` (for at least two, something each can do or
answer); `moves` (one job that leaves `draw()` or a function and moves into a class, e.g. a hit, the wave pause);
`checklist` (which class fails the first checklist question, or any reason one might still be a class). Lenient
tail on each.

### 5.11.3 Worked Example: Finished in one place
Live block (verified: list length and `allSprites.length` agree on every frame for 1200 frames):

```js
// Finished in one place: the enemy changes its own state; the scene removes
// finished enemies from the screen and the list, in that order, once a frame.
class Enemy {
  constructor(x, y, hp) {
    this.hp = hp;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
  }

  move() {
    this.sprite.y += 1;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }

  land() {
    this.hp = 0;
  }

  remove() {
    this.sprite.delete();
  }
}

let enemies;

function setup() {
  new Canvas(400, 300);
  enemies = [];
}

function draw() {
  background('#111');

  if (frameCount % 40 === 0) enemies.push(new Enemy(random(30, 370), -20, floor(random(1, 4))));
  if (kb.presses('space') && enemies.length > 0) enemies[0].takeHit(1);

  for (const e of enemies) {
    e.move();
    if (e.isAlive() && e.sprite.y > 280) e.land();
  }

  // The two places: first the screen, then the list.
  for (const e of enemies) {
    if (!e.isAlive()) e.remove();
  }
  enemies = enemies.filter((e) => e.isAlive());
}

function drawTop() {
  fill('white');
  textSize(16);
  text('in the list: ' + enemies.length, 12, 24);
  text('sprites on screen: ' + allSprites.length, 12, 46);
  text('Space hits the oldest enemy', 12, 290);
}
```

Say in one sentence that `allSprites` is moSHion's own list of every sprite that exists. Try this: delete the
`remove()` loop (sprites on screen climbs past the list: finished enemies stay on screen as ghosts that never move,
as 5.8.13's dead enemies did), then put it back and swap the two lines so `filter` runs first (the finished ones are gone from the list
before anyone removes their sprites: the same ghosts).

### 5.11.4 Lab: Enemy takes over
Starter = header + `const BASE_Y = 370;` + the Enemy skeleton below + the Part B final (8.2) from `let ship, base;`
to the end, unchanged. Header: `// 5.11.4 Lab: Enemy takes over. The game below is Part B's; the Enemy class is
new and nothing uses it yet.`

```js
// One enemy. It keeps its own hp, worth and speed: no parallel arrays.
class Enemy {
  constructor(x, y, hp, speed) {
    this.hp = hp;
    this.worth = hp * 10;
    this.speed = speed;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
  }

  move() {
    this.sprite.y += this.speed;
  }

  // STEP 1: takeHit(n) lowers hp by n, never below 0, and shows the new hp on
  //   the sprite. isAlive() answers true while hp is above 0. (5.8.8, 5.8.9)
  takeHit(n) {
  }

  isAlive() {
  }

  reachedBase() {
    return this.sprite.y > BASE_Y;
  }

  // Reaching the base uses the enemy up: it has no hp left to play with.
  land() {
    // STEP 1: set hp to 0.
  }

  remove() {
    this.sprite.delete();
  }
}
```

Steps: **s1 Finish Enemy** (`takeHit`, `isAlive`, `land`; 5.8.8, 5.8.9); **s2 One array** (`spawnEnemy` becomes
`enemies.push(new Enemy(x, y, hp, fallSpeed));`; delete `enemyHp` and `enemyWorth` everywhere, including
`startRound()`; hint: search the file for `enemyHp`); **s3 Ask the enemy** (in `moveEnemies()`: `e.move()`, and
`if (e.isAlive() && e.reachedBase()) { baseHp -= 1; e.land(); }`; in `hitEnemies()`: replace the enemy half of a
hit with `e.takeHit(1)` and the worth, keep the shot's delete/splice/break, test `e.sprite` in `overlaps`);
**s4 Finished in one place** (`clearEnemies()`: the two-line reap from 5.11.3, called last inside `if (playing)`;
`startRound()` calls `e.remove()`). Then: play to wave 3; the game should feel the same.

Solution = Part C final (8.3) with `C5-from-C6` then `C4-from-C5` applied.

Cards: r1 takeHit lowers hp, never below 0 (Help: 5.8.8 (Lab: takeHit with a floor at zero)); r2 isAlive answers from
hp (Help: 5.8.9 (Lab: Give the class its own isAlive())), titles checked against their lesson.json; r3 land() uses the enemy up (Help: 5.11.1); r4 one array of
Enemy objects, and `enemyHp`/`enemyWorth` are gone (Help: 5.11.1); r5 the scene asks the enemy (`.takeHit(`,
`.land()`, `.reachedBase()`) (Help: 5.11.1); r6 finished enemies leave the screen and the list (Help: 5.11.3).
Refuse: `filter` without `remove()` (5.8.13's ghosts); any surviving `enemyHp`. Accept: index loops
(`enemies[j].takeHit(1)`), a backwards splice loop with `remove()` instead of `filter`, `this.hp = Math.max(0, ...)`.

### 5.11.5 Lab: Bullet, and a hit that takes an enemy
Starter = the 5.11.4 solution with the Bullet skeleton inserted above `// One enemy`, and the header
`// 5.11.5 Lab: Bullet, and a hit that takes an enemy. Bullet is new; nothing uses it yet.`

```js
// A shot from the ship. It climbs until it hits something or leaves the top.
class Bullet {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 6, 14);
    this.sprite.collider = 'none';
    this.sprite.color = 'yellow';
    this.spent = false;
  }

  move() {
    this.sprite.y -= 8;
  }

  // Still in play: not used up, and not off the top.
  isAlive() {
    // STEP 1: true while the shot is not spent AND its y is more than -20.
  }

  // Does this shot touch that enemy? The parameter is another object.
  hits(enemy) {
    // STEP 2: true when this shot and that enemy are both alive and this
    //   sprite overlaps the enemy's sprite.
  }

  spend() {
    // STEP 2: set spent to true.
  }

  remove() {
    this.sprite.delete();
  }
}
```

Steps: **s1 isAlive** (not spent and still on screen); **s2 hits and spend** (`hits(enemy)` is 5.8.12's
`hit(other)` turned into a question); **s3 Fire Bullets** (`fire()` pushes `new Bullet(ship.x, ship.y - 18)`;
`moveBullets()` becomes `for (const b of bullets) b.move();`); **s4 The loop loses its splices** (`hitEnemies()`
becomes two `for...of` loops, `if (b.hits(e)) { b.spend(); e.takeHit(1); ... }`, no `splice`, no `break`;
`clearEnemies()` becomes `clearFinished()` and reaps both lists; `startRound()` uses `b.remove()`).

Solution = Part C final with `C5-from-C6` applied.

Cards: r1 a bullet is alive while not spent and on screen (Help: 5.11.3); r2 `hits(enemy)` asks about the other
object's sprite (Help: 5.8.12 (Lab: Write hit(other))); r3 `spend()` marks it used (Help:
5.11.3); r4 `fire()` builds a Bullet (Help: 5.7.19 (Collectible Class)); r5 the hit loop asks the bullet (`.hits(`,
`.spend()`) (Help: 5.11.1); r6 finished shots leave the screen and the list (Help: 5.11.3). Refuse:
`hits(enemy) { return true; }`.

### 5.11.6 Lab: A Spawner for the waves
Starter = the 5.11.5 solution with the Spawner skeleton inserted above the scene's `let` lines, `let ship, base;`
changed to `let ship, base, spawner;`, and the header `// 5.11.6 Lab: A Spawner for the waves. Spawner is new;
nothing uses it yet.` The Enemy class has no `static` yet.

```js
// Owns the waves: which wave it is, and the pause before the next one.
class Spawner {
  constructor() {
    this.wave = 0;
    this.pause = 60;
  }

  // While the field is clear the pause counts down. True when the next wave is due.
  ready(enemiesLeft) {
    // STEP 1: the job nextWave() did, as a question: false while enemiesLeft is
    //   above 0; otherwise count this.pause down and answer whether it reached 0.
  }

  // Builds the next wave and gives it back as a new array of enemies.
  makeWave() {
    // STEP 2: the job spawnWave() did, on this: add 1 to this.wave, set
    //   this.pause to 90, work out the speed, and build the enemies into a new
    //   array that you return.
  }
}
```

Steps: **s1 ready()** (5.10.7's `nextWave()` as a question); **s2 makeWave()** (`spawnWave()` moved in: it builds
the enemies into a new array and returns it, passing the speed to each `new Enemy`); **s3 The scene asks**
(`if (spawner.ready(enemies.length)) enemies = spawner.makeWave();` replaces `nextWave()`; `startRound()` does
`spawner = new Spawner();`; delete `wave`, `wavePause`, `fallSpeed`, `spawnEnemy`, `spawnWave`, `nextWave`; the HUD
reads `spawner.wave`); **s4 The class counts** (`static spawned = 0`, `Enemy.spawned += 1` in the constructor,
`Enemy.spawned = 0` in `startRound()`, "enemies faced: N" on the game-over screen). Solution = Part C final (8.3).

Cards: r1 ready() counts down only on a clear field (Help: 5.10.6 (Worked Example: Waves with a pause)); r2 makeWave
builds and returns a new array of enemies (Help: 5.11.1); r3 draw() asks the spawner (Help: 5.11.1); r4 a restart is a
new Spawner (Help: 5.11.1); r5 the class counts its enemies and the round resets the count (Help: 5.8.16 (Lab: Count
your spawns)); r6 the old wave globals are gone (Help: 5.11.1).

### 5.11.7 Playtest and reflect: Defender (AI-graded, 0 points)
As 5.5.9, with Defender's own losses: "lose in three different ways: let a wave through on purpose, get overrun in
a late wave, and press R in the middle of a wave." Prompt pointer: `5.9.1 (Plan: Break Defender into parts) and
5.11.6 (Lab: A Spawner for the waves)`. Questions → rubric items: `played` (rounds, waves reached or score), `bug`
(one surprise or thing that felt wrong), `cause` (which class or function it comes from, any guess), `compare` (one
change that is easier, or harder, in Part C than it was in Part B, e.g. adding a property, the 5.10.8 bug, the
restart). Lenient tail on each.

### 5.11.8 Check: Defender with classes (7 questions)

| id | Question | Options (* = answer) | sourceIds |
| --- | --- | --- | --- |
| q1-hp | After 5.11.4, where does an enemy's hp live? | *on its own Enemy object, as this.hp / in enemyHp / in the sprite's text / in Enemy.spawned | 5-11-defender-4-lab-enemy-takes-over |
| q2-nosplice | Why does `hitEnemies()` no longer splice anything? | *objects only change state; clearFinished() removes the finished ones once at the end of the frame / splice is not allowed in classes / for...of loops cannot splice / bullets never hit twice | 5-11-defender-3-example-finished-in-one-place, 5-11-defender-5-lab-bullet |
| q3-filter | What does `enemies = enemies.filter((e) => e.isAlive());` NOT do by itself? | *delete the finished enemies' sprites / keep the alive ones / make a new array / call isAlive() | 5-11-defender-3-example-finished-in-one-place |
| q4-param | In `b.hits(e)`, what is `e`? | *another object, an Enemy, handed to the bullet's method / a number / the bullet's own sprite / a class | 5-11-defender-5-lab-bullet |
| q5-static | Why is `spawned` declared `static`? | *it is a fact about all enemies, so it belongs to the class (Enemy.spawned), not to one enemy / so it cannot change / so it is faster / because it is a number | 5-11-defender-6-lab-a-spawner-for-the-waves |
| q6-checklist | Which class answers "no" to the checklist's first question, more than one of this thing? | *Spawner / Enemy / Bullet / none | 5-11-defender-1-reading-count-the-cost |
| q7-shield | Each enemy needs a shield value. In Part C, where does the change go? | *the Enemy constructor (and the one place that uses it) / a new array, two splices and startRound / every loop in draw() / Spawner only | 5-11-defender-1-reading-count-the-cost |

### 5.11.9 Challenges: Make it yours
As 5.5.11. Content: **Challenge 1, a best score (easy)**: a `best` that `startRound()` never resets, updated when a
round ends, shown in `drawTop()`. **Challenge 2, a boss wave (medium)**: in `makeWave()`, every fifth wave
(`this.wave % 5 === 0`) also pushes one slow Enemy with 10 hp, coloured purple. **Challenge 3, a Ship class (hard)**:
the ship becomes `class Ship` with `move()` and a `fire()` that owns `this.cooldown` and gives back a new Bullet or
`null`; the scene does `const shot = ship.fire(); if (shot) bullets.push(shot);`. Steps s1 "Pick a rule and change
it", s2 "Name what you changed" (a `//` comment at the top), as 5.5.11. Starter = Part C final with the header
`// 5.11.9 Challenges: Make it yours. Pick one rule and change it.` Solution (all three, as 5.5.11's does) = Part C
final with:

```diff
--- solution.js
+++ solution.js
@@ -1,4 +1,5 @@
-// Defender, Part C: the same game, with classes (5.11 reference).
+// 5.11.9 Challenges: Make it yours (reference solution: a best score, a boss wave,
+// and a Ship class that owns its own cooldown).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -101,12 +102,45 @@
       const hp = i % 3 === 2 ? 3 : 1;
       wave.push(new Enemy(40 + floor(random(8)) * 45, -20 - i * 50, hp, speed));
     }
+    // Challenge 2: every fifth wave ends with a slow boss that takes 10 hits.
+    if (this.wave % 5 === 0) {
+      const boss = new Enemy(200, -20 - (this.wave + 2) * 50, 10, speed / 2);
+      boss.sprite.color = 'purple';
+      wave.push(boss);
+    }
     return wave;
   }
 }
 
+// Challenge 3: the ship is a class of its own, and the cooldown lives inside it.
+class Ship {
+  constructor(x, y) {
+    this.sprite = new Sprite(x, y, 36, 18, 'static');
+    this.sprite.color = 'deepskyblue';
+    this.cooldown = 0;
+  }
+
+  move() {
+    if (kb.pressing('left')) this.sprite.x -= 5;
+    if (kb.pressing('right')) this.sprite.x += 5;
+    if (this.sprite.x < 20) this.sprite.x = 20;
+    if (this.sprite.x > 380) this.sprite.x = 380;
+  }
+
+  // Gives back a new Bullet when Space is held and the cooldown is done; otherwise null.
+  fire() {
+    if (this.cooldown > 0) this.cooldown -= 1;
+    if (kb.pressing('space') && this.cooldown === 0) {
+      this.cooldown = 12;
+      return new Bullet(this.sprite.x, this.sprite.y - 18);
+    }
+    return null;
+  }
+}
+
 let ship, base, spawner;
-let bullets, enemies, cooldown, score, baseHp, playing;
+let bullets, enemies, score, baseHp, playing;
+let best = 0;   // Challenge 1: never reset, so it survives R
 
 function setup() {
   new Canvas(400, 400);
@@ -114,31 +148,13 @@
   base = new Sprite(200, 392, 400, 16, 'static');
   base.color = '#334';
 
-  ship = new Sprite(200, 360, 36, 18, 'static');
-  ship.color = 'deepskyblue';
+  ship = new Ship(200, 360);
 
   bullets = [];
   enemies = [];
   startRound();
 }
 
-// Left and right move the ship; two ifs keep it on the canvas.
-function moveShip() {
-  if (kb.pressing('left')) ship.x -= 5;
-  if (kb.pressing('right')) ship.x += 5;
-  if (ship.x < 20) ship.x = 20;
-  if (ship.x > 380) ship.x = 380;
-}
-
-// Holding Space fires, but only when the cooldown has counted down to 0.
-function fire() {
-  if (cooldown > 0) cooldown -= 1;
-  if (kb.pressing('space') && cooldown === 0) {
-    bullets.push(new Bullet(ship.x, ship.y - 18));
-    cooldown = 12;
-  }
-}
-
 // Every shot climbs; one that leaves the top stops being alive, and clearFinished removes it.
 function moveBullets() {
   for (const b of bullets) b.move();
@@ -153,7 +169,10 @@
       e.land();
     }
   }
-  if (baseHp <= 0) playing = false;
+  if (baseHp <= 0) {
+    playing = false;
+    if (score > best) best = score;
+  }
 }
 
 // Every shot against every enemy. Nothing is spliced here: the objects only change.
@@ -190,7 +209,7 @@
   enemies = [];
   spawner = new Spawner();
   Enemy.spawned = 0;
-  cooldown = 0;
+  ship.cooldown = 0;
   score = 0;
   baseHp = 3;
   playing = true;
@@ -200,8 +219,9 @@
   background('#111');
 
   if (playing) {
-    moveShip();
-    fire();
+    ship.move();
+    const shot = ship.fire();
+    if (shot) bullets.push(shot);
     if (spawner.ready(enemies.length)) enemies = spawner.makeWave();
     moveBullets();
     moveEnemies();
@@ -219,6 +239,7 @@
   text('score: ' + score, 12, 26);
   text('wave: ' + spawner.wave, 165, 26);
   text('base: ' + baseHp, 310, 26);
+  text('best: ' + best, 12, 50);
 
   if (!playing) {
     textSize(30);
```

One card: r1 "Your rule is in the code" (Help: 5.11.6 (Lab: A Spawner for the waves)). Measured on the solution: a
boss with 10 hp arrives by wave 5, `best` keeps the score at game over and survives R.

---

## 7. Requirement patterns (verified)

Each block below is lesson.json-ready (`pattern` strings already escaped; add `title`, `description`, `flags: ""`,
`points: 0`, `status: "pending"`, `file: "script.js"`). They were graded by the app's own `lib/grader.ts`
(compiled from the repo, comments stripped as in production): **every reference scores full, every starter scores
below full** (5.10.8's starter scores 1 of 2, by design), every listed cheat is refused, and these honest variants
pass: `constrain` clamp, `cooldown--` with `<= 0` and `kb.pressing(' ')`, splice-then-delete, enemies-outer nesting,
a `removeEnemy(j)` helper, a backwards splice reap with `remove()`, `this.hp = this.hp - amount` with an if-floor,
`bullets.filter(b => ...)` without parentheses, `ready(left)` with `!== 0`. Builders harden them further in review
rounds as 5.3-5.5's were; these are the floor, not the ceiling.

#### 5.9.4

```json
  {"id":"r1","type":"inFunction","function":"moveShip","pattern":"^(?=[\\s\\S]*ship\\.x\\s*<=?\\s*\\d+[\\s\\S]{0,60}?ship\\.x\\s*=\\s*\\d+)(?=[\\s\\S]*ship\\.x\\s*>=?\\s*\\d+[\\s\\S]{0,60}?ship\\.x\\s*=\\s*\\d+)|constrain\\s*\\(\\s*ship\\.x|ship\\.x\\s*=\\s*(?:Math\\.)?(?:max|min)\\s*\\("},
  {"id":"r2","type":"inFunction","function":"fire","pattern":"\\bcooldown\\s*(?:-=\\s*1\\b|--)|--\\s*cooldown\\b|\\bcooldown\\s*=\\s*(?:cooldown\\s*-\\s*1\\b|(?:Math\\.)?max\\s*\\()"},
  {"id":"r3","type":"inFunction","function":"fire","pattern":"if\\s*\\((?=[^{]*kb\\.(?:pressing|presses|holding)\\s*\\(\\s*['\"](?:space| )['\"]\\s*\\))(?=[^{]*(?:cooldown\\s*(?:===?\\s*0|<=\\s*0|<\\s*1)|!\\s*cooldown\\b|0\\s*===?\\s*cooldown))[^{]*\\{[^}]*?bullets\\.push\\s*\\("},
  {"id":"r4","type":"inFunction","function":"fire","pattern":"bullets\\.push\\s*\\([\\s\\S]{0,200}?\\bcooldown\\s*=\\s*[1-9]|\\bcooldown\\s*=\\s*[1-9]\\d*\\s*;[\\s\\S]{0,200}?bullets\\.push\\s*\\("},
  {"id":"r5","type":"inFunction","function":"moveBullets","pattern":"if\\s*\\([^{)]*\\.y\\s*<=?\\s*-?\\d+[^{]*\\)\\s*\\{?[^}]*?(?:\\.(?:delete|remove)\\s*\\(\\s*\\)[^}]*?bullets\\.splice\\s*\\(|bullets\\.splice\\s*\\([^}]*?\\.(?:delete|remove)\\s*\\(\\s*\\))"}
```

#### 5.9.6

```json
  {"id":"r1","type":"inFunction","function":"hitDrone","pattern":"\\.overlaps\\s*\\(\\s*drone\\s*\\)|\\bdrone\\.overlaps\\s*\\("},
  {"id":"r2","type":"inFunction","function":"hitDrone","pattern":"if\\s*\\([^{]*overlaps[^{]*\\)\\s*\\{(?=[^}]*?\\.(?:delete|remove)\\s*\\(\\s*\\))(?=[^}]*?bullets\\.splice\\s*\\()"},
  {"id":"r3","type":"inFunction","function":"hitDrone","pattern":"if\\s*\\([^{]*overlaps[^{]*\\)\\s*\\{(?=[^}]*?(?:\\bscore\\s*(?:\\+=\\s*1\\b|\\+\\+|=\\s*score\\s*\\+\\s*1\\b)|\\+\\+\\s*score\\b))(?=[^}]*?(?:resetDrone\\s*\\(\\s*\\)|drone\\.y\\s*=))"}
```

#### 5.9.7

```json
  {"id":"r1","type":"inFunction","function":"startRound","pattern":"\\bbaseHp\\s*=\\s*[1-9]"},
  {"id":"r2","type":"inFunction","function":"moveDrone","pattern":"\\bbaseHp\\s*(?:-=\\s*1\\b|--)|--\\s*baseHp\\b|\\bbaseHp\\s*=\\s*baseHp\\s*-\\s*1\\b"},
  {"id":"r3","type":"regex","pattern":"if\\s*\\(\\s*baseHp\\s*(?:<=\\s*0|===?\\s*0|<\\s*1)\\s*\\)\\s*\\{?\\s*playing\\s*=\\s*false|playing\\s*=\\s*baseHp\\s*>\\s*0"},
  {"id":"r4","type":"inFunction","function":"drawTop","pattern":"if\\s*\\(\\s*(?:!\\s*playing|playing\\s*===?\\s*false)\\s*\\)\\s*\\{?[^}]*?text\\s*\\("},
  {"id":"r5","type":"inFunction","function":"draw","pattern":"kb\\.(?:presses|pressing)\\s*\\(\\s*['\"]r['\"]\\s*\\)[\\s\\S]{0,40}?startRound\\s*\\(\\s*\\)"}
```

#### 5.10.2

```json
  {"id":"r1","type":"inFunction","function":"spawnEnemy","pattern":"^(?=[\\s\\S]*new\\s+Sprite\\s*\\()(?=[\\s\\S]*\\.collider\\s*=\\s*['\"]none['\"])"},
  {"id":"r2","type":"inFunction","function":"spawnEnemy","pattern":"^(?=[\\s\\S]*\\benemies\\.push\\s*\\()(?=[\\s\\S]*\\benemyHp\\.push\\s*\\()(?=[\\s\\S]*\\benemyWorth\\.push\\s*\\()"},
  {"id":"r3","type":"inFunction","function":"moveEnemies","pattern":"\\.y\\s*(?:\\+=|=\\s*[^;]*\\+)"},
  {"id":"r4","type":"inFunction","function":"moveEnemies","pattern":"if\\s*\\([^{]*\\.y\\s*>=?\\s*(?:BASE_Y|\\d+)[^{]*\\)\\s*\\{[^}]*?(?:\\bbaseHp\\s*(?:-=\\s*1\\b|--)|--\\s*baseHp\\b)"},
  {"id":"r5","type":"inFunction","function":["moveEnemies","removeEnemy"],"pattern":"^(?=[\\s\\S]*\\.(?:delete|remove)\\s*\\(\\s*\\))(?=[\\s\\S]*\\benemies\\.splice\\s*\\()(?=[\\s\\S]*\\benemyHp\\.splice\\s*\\()(?=[\\s\\S]*\\benemyWorth\\.splice\\s*\\()"}
```

#### 5.10.5

```json
  {"id":"r1","type":"inFunction","function":"hitEnemies","pattern":"^(?=[\\s\\S]*\\.overlaps\\s*\\()(?:[\\s\\S]*?for\\s*\\([^)]*\\bbullets\\b[\\s\\S]*?for\\s*\\([^)]*\\benemies\\b|[\\s\\S]*?for\\s*\\([^)]*\\benemies\\b[\\s\\S]*?for\\s*\\([^)]*\\bbullets\\b)"},
  {"id":"r2","type":"inFunction","function":"hitEnemies","pattern":"^(?=[\\s\\S]*\\bbullets\\s*\\[\\s*\\w+\\s*\\]\\.(?:delete|remove)\\s*\\(\\s*\\))(?=[\\s\\S]*\\bbullets\\.splice\\s*\\()"},
  {"id":"r3","type":"inFunction","function":"hitEnemies","pattern":"\\benemyHp\\s*\\[\\s*\\w+\\s*\\]\\s*(?:-=\\s*1\\b|--)|--\\s*enemyHp\\s*\\["},
  {"id":"r4","type":"inFunction","function":["hitEnemies","removeEnemy"],"pattern":"^(?=[\\s\\S]*if\\s*\\(\\s*enemyHp\\s*\\[\\s*\\w+\\s*\\]\\s*(?:<=\\s*0|===?\\s*0|<\\s*1)\\s*\\))(?=[\\s\\S]*\\bscore\\s*\\+=\\s*enemyWorth\\s*\\[)(?=[\\s\\S]*\\benemies\\.splice\\s*\\()(?=[\\s\\S]*\\benemyHp\\.splice\\s*\\()(?=[\\s\\S]*\\benemyWorth\\.splice\\s*\\()"},
  {"id":"r5","type":"inFunction","function":"hitEnemies","pattern":"\\b(?:break|return)\\b"}
```

#### 5.10.7

```json
  {"id":"r1","type":"inFunction","function":"startRound","pattern":"^(?=[\\s\\S]*\\bwave\\s*=\\s*0\\b)(?=[\\s\\S]*\\bwavePause\\s*=\\s*\\d+)"},
  {"id":"r2","type":"inFunction","function":"nextWave","pattern":"^(?=[\\s\\S]*(?:enemies\\.length\\s*(?:>\\s*0|!==?\\s*0|>=\\s*1)|enemies\\.length\\s*===?\\s*0))(?=[\\s\\S]*(?:\\bwavePause\\s*(?:-=\\s*1\\b|--)|--\\s*wavePause\\b))"},
  {"id":"r3","type":"inFunction","function":"nextWave","pattern":"if\\s*\\(\\s*wavePause\\s*(?:<=\\s*0|===?\\s*0|<\\s*1)\\s*\\)\\s*\\{(?=[^}]*spawnWave\\s*\\(\\s*\\))(?=[^}]*\\bwavePause\\s*=\\s*[1-9])"},
  {"id":"r4","type":"inFunction","function":"spawnWave","pattern":"^(?=[\\s\\S]*(?:\\bwave\\s*(?:\\+=\\s*1\\b|\\+\\+)|\\+\\+\\s*wave\\b))(?=[\\s\\S]*for\\s*\\([^)]*\\bwave\\b[\\s\\S]*?spawnEnemy\\s*\\()"}
```

#### 5.10.8

```json
  {"id":"r1","type":"inFunction","function":["moveEnemies","removeEnemy"],"pattern":"^(?=[\\s\\S]*\\benemies\\.splice\\s*\\()(?=[\\s\\S]*\\benemyHp\\.splice\\s*\\()(?=[\\s\\S]*\\benemyWorth\\.splice\\s*\\()"},
  {"id":"r2","type":"inFunction","function":["hitEnemies","removeEnemy"],"pattern":"^(?=[\\s\\S]*\\benemies\\.splice\\s*\\()(?=[\\s\\S]*\\benemyHp\\.splice\\s*\\()(?=[\\s\\S]*\\benemyWorth\\.splice\\s*\\()"}
```

#### 5.11.4

```json
  {"id":"r1","type":"regex","pattern":"takeHit\\s*\\(\\s*(\\w+)\\s*\\)\\s*\\{[^}]*?this\\.hp\\s*(?:-=\\s*\\1\\b|=\\s*this\\.hp\\s*-\\s*\\1\\b)[\\s\\S]{0,160}?(?:if\\s*\\(\\s*this\\.hp\\s*<=?\\s*0\\s*\\)\\s*\\{?\\s*this\\.hp\\s*=\\s*0|this\\.hp\\s*=\\s*(?:Math\\.)?max\\s*\\(\\s*0)"},
  {"id":"r2","type":"regex","pattern":"isAlive\\s*\\(\\s*\\)\\s*\\{\\s*return\\s+(?:this\\.hp\\s*(?:>\\s*0|>=\\s*1|!==?\\s*0)|0\\s*<\\s*this\\.hp)"},
  {"id":"r3","type":"regex","pattern":"land\\s*\\(\\s*\\)\\s*\\{[^}]*?this\\.hp\\s*=\\s*0"},
  {"id":"r4","type":"regex","pattern":"^(?![\\s\\S]*\\benemy(?:Hp|Worth)\\b)[\\s\\S]*new\\s+Enemy\\s*\\("},
  {"id":"r5","type":"regex","pattern":"^(?=[\\s\\S]*\\.takeHit\\s*\\()(?=[\\s\\S]*\\.land\\s*\\(\\s*\\))(?=[\\s\\S]*\\.reachedBase\\s*\\(\\s*\\))"},
  {"id":"r6","type":"regex","pattern":"^(?=[\\s\\S]*\\benemies\\s*=\\s*enemies\\.filter\\s*\\([\\s\\S]{0,80}?isAlive\\s*\\(\\s*\\))(?=[\\s\\S]*if\\s*\\(\\s*!\\s*[\\w\\[\\]\\s]+\\.isAlive\\s*\\(\\s*\\)\\s*\\)\\s*\\{?\\s*[\\w\\[\\]\\s]+\\.remove\\s*\\(\\s*\\))|if\\s*\\(\\s*!\\s*enemies\\s*\\[\\s*\\w+\\s*\\]\\.isAlive\\s*\\(\\s*\\)\\s*\\)\\s*\\{[^}]*\\.remove\\s*\\(\\s*\\)[^}]*enemies\\.splice\\s*\\("}
```

#### 5.11.5

```json
  {"id":"r1","type":"regex","pattern":"class\\s+Bullet\\b[\\s\\S]*?isAlive\\s*\\(\\s*\\)\\s*\\{\\s*return\\s+(?=[^;]*this\\.spent)(?=[^;]*this\\.sprite\\.y\\s*>)"},
  {"id":"r2","type":"regex","pattern":"hits\\s*\\(\\s*(\\w+)\\s*\\)\\s*\\{[^}]*?return[^;]*\\.overlaps\\s*\\(\\s*\\1\\.sprite\\s*\\)"},
  {"id":"r3","type":"regex","pattern":"spend\\s*\\(\\s*\\)\\s*\\{[^}]*this\\.spent\\s*=\\s*true"},
  {"id":"r4","type":"inFunction","function":"fire","pattern":"new\\s+Bullet\\s*\\("},
  {"id":"r5","type":"inFunction","function":"hitEnemies","pattern":"^(?=[\\s\\S]*\\.hits\\s*\\()(?=[\\s\\S]*\\.spend\\s*\\(\\s*\\))"},
  {"id":"r6","type":"regex","pattern":"^(?=[\\s\\S]*\\bbullets\\s*=\\s*bullets\\.filter\\s*\\([\\s\\S]{0,80}?isAlive\\s*\\(\\s*\\))(?=[\\s\\S]*if\\s*\\(\\s*!\\s*[\\w\\[\\]\\s]+\\.isAlive\\s*\\(\\s*\\)\\s*\\)\\s*\\{?\\s*[\\w\\[\\]\\s]+\\.remove\\s*\\(\\s*\\))|if\\s*\\(\\s*!\\s*bullets\\s*\\[\\s*\\w+\\s*\\]\\.isAlive\\s*\\(\\s*\\)\\s*\\)\\s*\\{[^}]*\\.remove\\s*\\(\\s*\\)[^}]*bullets\\.splice\\s*\\("}
```

#### 5.11.6

```json
  {"id":"r1","type":"regex","pattern":"ready\\s*\\(\\s*(\\w+)\\s*\\)\\s*\\{(?=[^}]*\\b\\1\\s*(?:>\\s*0|!==?\\s*0|>=\\s*1))(?=[\\s\\S]{0,200}?this\\.pause\\s*(?:-=\\s*1\\b|--))"},
  {"id":"r2","type":"regex","pattern":"makeWave\\s*\\(\\s*\\)\\s*\\{(?=[\\s\\S]{0,400}?this\\.wave\\s*(?:\\+=\\s*1\\b|\\+\\+))[\\s\\S]{0,600}?new\\s+Enemy\\s*\\([\\s\\S]{0,300}?return\\s+\\w+"},
  {"id":"r3","type":"inFunction","function":"draw","pattern":"^(?=[\\s\\S]*\\bspawner\\.ready\\s*\\()(?=[\\s\\S]*\\bspawner\\.makeWave\\s*\\(\\s*\\))"},
  {"id":"r4","type":"inFunction","function":"startRound","pattern":"\\bspawner\\s*=\\s*new\\s+Spawner\\s*\\("},
  {"id":"r5","type":"regex","pattern":"^(?=[\\s\\S]*static\\s+spawned\\s*=\\s*0)(?=[\\s\\S]*constructor\\s*\\([^)]*\\)\\s*\\{[^}]*?(?:Enemy\\.spawned\\s*(?:\\+=\\s*1\\b|\\+\\+)|\\+\\+\\s*Enemy\\.spawned))(?=[\\s\\S]*function\\s+startRound\\s*\\([^)]*\\)\\s*\\{[^}]*?Enemy\\.spawned\\s*=\\s*0)"},
  {"id":"r6","type":"regex","pattern":"^(?![\\s\\S]*\\b(?:wavePause|spawnWave|nextWave)\\b)[\\s\\S]*class\\s+Spawner\\b"}
```

#### 5.11.9

```json
  {"id":"r1","type":"regex","pattern":"\\bbest\\s*=\\s*(?:\\(\\s*)?(?:Math\\.)?max\\s*\\(|if\\s*\\(\\s*(?:score\\s*>=?\\s*best|best\\s*<=?\\s*score)\\b|\\bwave\\s*%\\s*\\d+\\s*===?\\s*0|class\\s+Ship\\b[\\s\\S]*?this\\.cooldown\\b"}
```

---

## 8. Reference scripts

These are the three part finals. Every intermediate lab solution and every starter is derived from them by the
unified diffs below (each diff round-trips with `patch`; checked). To rebuild one: save the final as
`solution.js`, then `patch solution.js < X.diff`.

### 8.1 Part A final (the 5.9.7 solution)

```js
// Defender, Part A: ship, shots and one drone (5.9 reference).

const BASE_Y = 370;   // anything that falls below this line has reached the base

let ship, base, drone;
let bullets, cooldown, score, baseHp, playing;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  drone = new Sprite(200, -20, 28, 28);
  drone.collider = 'none';
  drone.color = 'crimson';

  bullets = [];
  startRound();
}

// Left and right move the ship; two ifs keep it on the canvas.
function moveShip() {
  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;
  if (ship.x < 20) ship.x = 20;
  if (ship.x > 380) ship.x = 380;
}

// Holding Space fires, but only when the cooldown has counted down to 0.
function fire() {
  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    cooldown = 12;
  }
}

// Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }
}

// Puts the drone back above the top of the screen at a random x.
function resetDrone() {
  drone.x = random(30, 370);
  drone.y = -20;
}

// The drone falls; when it reaches the base the base loses 1 and the drone starts again.
function moveDrone() {
  drone.y += 1.5;
  if (drone.y > BASE_Y) {
    baseHp -= 1;
    resetDrone();
    if (baseHp <= 0) playing = false;
  }
}

// A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
function hitDrone() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].overlaps(drone)) {
      bullets[i].delete();
      bullets.splice(i, 1);
      score += 1;
      resetDrone();
    }
  }
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.delete();
  bullets = [];
  resetDrone();
  cooldown = 0;
  score = 0;
  baseHp = 3;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    moveBullets();
    moveDrone();
    hitDrone();
  }

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('score: ' + score, 12, 26);
  text('base: ' + baseHp, 310, 26);

  if (!playing) {
    textSize(30);
    text('Game over', 122, 190);
    textSize(14);
    text('press R to play again', 128, 216);
  }
}
```

`A6-from-A7` (gives the 5.9.6 solution):

```diff
--- solution.js
+++ solution.js
@@ -1,9 +1,9 @@
-// Defender, Part A: ship, shots and one drone (5.9 reference).
+// 5.9.6 Lab: Hit the drone (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
 let ship, base, drone;
-let bullets, cooldown, score, baseHp, playing;
+let bullets, cooldown, score, playing;
 
 function setup() {
   new Canvas(400, 400);
@@ -59,14 +59,11 @@
   drone.y = -20;
 }
 
-// The drone falls; when it reaches the base the base loses 1 and the drone starts again.
+// The drone falls; when it reaches the base it starts again at the top.
+// (5.9.7 makes reaching the base cost something.)
 function moveDrone() {
   drone.y += 1.5;
-  if (drone.y > BASE_Y) {
-    baseHp -= 1;
-    resetDrone();
-    if (baseHp <= 0) playing = false;
-  }
+  if (drone.y > BASE_Y) resetDrone();
 }
 
 // A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
@@ -81,14 +78,13 @@
   }
 }
 
-// Puts back everything a round owns. setup() and the R key both use it.
+// Puts back everything a round owns. setup() uses it; 5.9.7 gives it to the R key too.
 function startRound() {
   for (const b of bullets) b.delete();
   bullets = [];
   resetDrone();
   cooldown = 0;
   score = 0;
-  baseHp = 3;
   playing = true;
 }
 
@@ -103,7 +99,6 @@
     hitDrone();
   }
 
-  if (kb.presses('r')) startRound();
 }
 
 // drawTop() runs after the sprites, so nothing can cover the words.
@@ -111,12 +106,4 @@
   fill('white');
   textSize(18);
   text('score: ' + score, 12, 26);
-  text('base: ' + baseHp, 310, 26);
-
-  if (!playing) {
-    textSize(30);
-    text('Game over', 122, 190);
-    textSize(14);
-    text('press R to play again', 128, 216);
-  }
 }
```

`A4-from-A6` (gives the 5.9.4 solution):

```diff
--- solution.js
+++ solution.js
@@ -1,9 +1,9 @@
-// 5.9.6 Lab: Hit the drone (reference solution).
+// 5.9.4 Lab: Fly and fire (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
-let ship, base, drone;
-let bullets, cooldown, score, playing;
+let ship, base;
+let bullets, cooldown, playing;
 
 function setup() {
   new Canvas(400, 400);
@@ -14,10 +14,6 @@
   ship = new Sprite(200, 360, 36, 18, 'static');
   ship.color = 'deepskyblue';
 
-  drone = new Sprite(200, -20, 28, 28);
-  drone.collider = 'none';
-  drone.color = 'crimson';
-
   bullets = [];
   startRound();
 }
@@ -53,38 +49,11 @@
   }
 }
 
-// Puts the drone back above the top of the screen at a random x.
-function resetDrone() {
-  drone.x = random(30, 370);
-  drone.y = -20;
-}
-
-// The drone falls; when it reaches the base it starts again at the top.
-// (5.9.7 makes reaching the base cost something.)
-function moveDrone() {
-  drone.y += 1.5;
-  if (drone.y > BASE_Y) resetDrone();
-}
-
-// A shot that overlaps the drone scores 1, leaves the screen and the array, and resets the drone.
-function hitDrone() {
-  for (let i = bullets.length - 1; i >= 0; i--) {
-    if (bullets[i].overlaps(drone)) {
-      bullets[i].delete();
-      bullets.splice(i, 1);
-      score += 1;
-      resetDrone();
-    }
-  }
-}
-
 // Puts back everything a round owns. setup() uses it; 5.9.7 gives it to the R key too.
 function startRound() {
   for (const b of bullets) b.delete();
   bullets = [];
-  resetDrone();
   cooldown = 0;
-  score = 0;
   playing = true;
 }
 
@@ -95,8 +64,6 @@
     moveShip();
     fire();
     moveBullets();
-    moveDrone();
-    hitDrone();
   }
 
 }
@@ -105,5 +72,5 @@
 function drawTop() {
   fill('white');
   textSize(18);
-  text('score: ' + score, 12, 26);
+  text('shots alive: ' + bullets.length, 12, 26);
 }
```

### 8.2 Part B final (the 5.10.7 and 5.10.8 solution)

```js
// Defender, Part B: enemies and waves, the procedural way (5.10 reference).

const BASE_Y = 370;   // anything that falls below this line has reached the base

let ship, base;
let bullets, cooldown, score, baseHp, playing;

// Three parallel arrays: index j in all three is the same enemy.
let enemies, enemyHp, enemyWorth;

let wave, wavePause, fallSpeed;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  bullets = [];
  enemies = [];
  startRound();
}

// Left and right move the ship; two ifs keep it on the canvas.
function moveShip() {
  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;
  if (ship.x < 20) ship.x = 20;
  if (ship.x > 380) ship.x = 380;
}

// Holding Space fires, but only when the cooldown has counted down to 0.
function fire() {
  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
    b.collider = 'none';
    b.color = 'yellow';
    bullets.push(b);
    cooldown = 12;
  }
}

// Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= 8;
    if (bullets[i].y < -20) {
      bullets[i].delete();
      bullets.splice(i, 1);
    }
  }
}

// Builds one enemy and adds it to all three arrays, so they stay in step.
function spawnEnemy(x, y, hp) {
  const e = new Sprite(x, y, 30, 30);
  e.collider = 'none';
  e.color = hp > 1 ? 'orange' : 'crimson';
  e.text = String(hp);
  enemies.push(e);
  enemyHp.push(hp);
  enemyWorth.push(hp * 10);
}

// One wave: two more enemies than the wave number, in a column above the top,
// every third one tough. Each wave falls a little faster.
function spawnWave() {
  wave += 1;
  fallSpeed = 0.5 + wave * 0.25;
  for (let i = 0; i < wave + 2; i++) {
    const hp = i % 3 === 2 ? 3 : 1;
    spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp);
  }
}

// While the field is clear, the pause counts down; at 0 the next wave comes.
function nextWave() {
  if (enemies.length > 0) return;
  wavePause -= 1;
  if (wavePause <= 0) {
    spawnWave();
    wavePause = 90;
  }
}

// Every enemy falls. One that reaches the base costs 1 and is removed from all three arrays.
function moveEnemies() {
  for (let j = enemies.length - 1; j >= 0; j--) {
    enemies[j].y += fallSpeed;
    if (enemies[j].y > BASE_Y) {
      baseHp -= 1;
      enemies[j].delete();
      enemies.splice(j, 1);
      enemyHp.splice(j, 1);
      enemyWorth.splice(j, 1);
    }
  }
  if (baseHp <= 0) playing = false;
}

// Every shot against every enemy. A hit removes the shot and takes 1 hp;
// an enemy at 0 hp scores its worth and is removed from all three arrays.
function hitEnemies() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      if (bullets[i].overlaps(enemies[j])) {
        bullets[i].delete();
        bullets.splice(i, 1);
        enemyHp[j] -= 1;
        enemies[j].text = String(enemyHp[j]);
        if (enemyHp[j] <= 0) {
          score += enemyWorth[j];
          enemies[j].delete();
          enemies.splice(j, 1);
          enemyHp.splice(j, 1);
          enemyWorth.splice(j, 1);
        }
        break;   // this shot is gone: stop testing it against the others
      }
    }
  }
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.delete();
  bullets = [];
  for (const e of enemies) e.delete();
  enemies = [];
  enemyHp = [];
  enemyWorth = [];
  wave = 0;
  wavePause = 60;
  fallSpeed = 1;
  cooldown = 0;
  score = 0;
  baseHp = 3;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    nextWave();
    moveBullets();
    moveEnemies();
    hitEnemies();
  }

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('score: ' + score, 12, 26);
  text('wave: ' + wave, 165, 26);
  text('base: ' + baseHp, 310, 26);

  if (!playing) {
    textSize(30);
    text('Game over', 122, 190);
    textSize(14);
    text('press R to play again', 128, 216);
  }
}
```

`B5-from-B7` (gives the 5.10.5 solution: one enemy per beat instead of waves):

```diff
--- solution.js
+++ solution.js
@@ -1,4 +1,4 @@
-// Defender, Part B: enemies and waves, the procedural way (5.10 reference).
+// 5.10.5 Lab: Shoot them down (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -8,7 +8,7 @@
 // Three parallel arrays: index j in all three is the same enemy.
 let enemies, enemyHp, enemyWorth;
 
-let wave, wavePause, fallSpeed;
+let fallSpeed;
 
 function setup() {
   new Canvas(400, 400);
@@ -66,24 +66,12 @@
   enemyWorth.push(hp * 10);
 }
 
-// One wave: two more enemies than the wave number, in a column above the top,
-// every third one tough. Each wave falls a little faster.
-function spawnWave() {
-  wave += 1;
-  fallSpeed = 0.5 + wave * 0.25;
-  for (let i = 0; i < wave + 2; i++) {
-    const hp = i % 3 === 2 ? 3 : 1;
-    spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp);
-  }
-}
-
-// While the field is clear, the pause counts down; at 0 the next wave comes.
-function nextWave() {
-  if (enemies.length > 0) return;
-  wavePause -= 1;
-  if (wavePause <= 0) {
-    spawnWave();
-    wavePause = 90;
+// Every 60 frames one enemy arrives at a random spot above the top.
+// About one in four is a tough one with 3 hp. (5.10.7 replaces this with waves.)
+function spawnOnBeat() {
+  if (frameCount % 60 === 0) {
+    const hp = floor(random(4)) === 0 ? 3 : 1;
+    spawnEnemy(random(30, 370), -20, hp);
   }
 }
 
@@ -133,8 +121,6 @@
   enemies = [];
   enemyHp = [];
   enemyWorth = [];
-  wave = 0;
-  wavePause = 60;
   fallSpeed = 1;
   cooldown = 0;
   score = 0;
@@ -148,7 +134,7 @@
   if (playing) {
     moveShip();
     fire();
-    nextWave();
+    spawnOnBeat();
     moveBullets();
     moveEnemies();
     hitEnemies();
@@ -162,7 +148,6 @@
   fill('white');
   textSize(18);
   text('score: ' + score, 12, 26);
-  text('wave: ' + wave, 165, 26);
   text('base: ' + baseHp, 310, 26);
 
   if (!playing) {
```

`B2-from-B5` (gives the 5.10.2 solution: no hit loop yet):

```diff
--- solution.js
+++ solution.js
@@ -1,4 +1,4 @@
-// 5.10.5 Lab: Shoot them down (reference solution).
+// 5.10.2 Lab: A field of enemies (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -90,29 +90,6 @@
   if (baseHp <= 0) playing = false;
 }
 
-// Every shot against every enemy. A hit removes the shot and takes 1 hp;
-// an enemy at 0 hp scores its worth and is removed from all three arrays.
-function hitEnemies() {
-  for (let i = bullets.length - 1; i >= 0; i--) {
-    for (let j = enemies.length - 1; j >= 0; j--) {
-      if (bullets[i].overlaps(enemies[j])) {
-        bullets[i].delete();
-        bullets.splice(i, 1);
-        enemyHp[j] -= 1;
-        enemies[j].text = String(enemyHp[j]);
-        if (enemyHp[j] <= 0) {
-          score += enemyWorth[j];
-          enemies[j].delete();
-          enemies.splice(j, 1);
-          enemyHp.splice(j, 1);
-          enemyWorth.splice(j, 1);
-        }
-        break;   // this shot is gone: stop testing it against the others
-      }
-    }
-  }
-}
-
 // Puts back everything a round owns. setup() and the R key both use it.
 function startRound() {
   for (const b of bullets) b.delete();
@@ -137,7 +114,6 @@
     spawnOnBeat();
     moveBullets();
     moveEnemies();
-    hitEnemies();
   }
 
   if (kb.presses('r')) startRound();
```

### 8.3 Part C final (the 5.11.6 solution; the 5.11.9 starter)

```js
// Defender, Part C: the same game, with classes (5.11 reference).

const BASE_Y = 370;   // anything that falls below this line has reached the base

// A shot from the ship. It climbs until it hits something or leaves the top.
class Bullet {
  constructor(x, y) {
    this.sprite = new Sprite(x, y, 6, 14);
    this.sprite.collider = 'none';
    this.sprite.color = 'yellow';
    this.spent = false;
  }

  move() {
    this.sprite.y -= 8;
  }

  // Still in play: not used up, and not off the top.
  isAlive() {
    return !this.spent && this.sprite.y > -20;
  }

  // Does this shot touch that enemy? The parameter is another object.
  hits(enemy) {
    return this.isAlive() && enemy.isAlive() && this.sprite.overlaps(enemy.sprite);
  }

  spend() {
    this.spent = true;
  }

  remove() {
    this.sprite.delete();
  }
}

// One enemy. It keeps its own hp, worth and speed: no parallel arrays.
class Enemy {
  static spawned = 0;

  constructor(x, y, hp, speed) {
    this.hp = hp;
    this.worth = hp * 10;
    this.speed = speed;
    this.sprite = new Sprite(x, y, 30, 30);
    this.sprite.collider = 'none';
    this.sprite.color = hp > 1 ? 'orange' : 'crimson';
    this.sprite.text = String(hp);
    Enemy.spawned += 1;
  }

  move() {
    this.sprite.y += this.speed;
  }

  takeHit(n) {
    this.hp -= n;
    if (this.hp < 0) this.hp = 0;
    this.sprite.text = String(this.hp);
  }

  isAlive() {
    return this.hp > 0;
  }

  reachedBase() {
    return this.sprite.y > BASE_Y;
  }

  // Reaching the base uses the enemy up: it has no hp left to play with.
  land() {
    this.hp = 0;
  }

  remove() {
    this.sprite.delete();
  }
}

// Owns the waves: which wave it is, and the pause before the next one.
class Spawner {
  constructor() {
    this.wave = 0;
    this.pause = 60;
  }

  // While the field is clear the pause counts down. True when the next wave is due.
  ready(enemiesLeft) {
    if (enemiesLeft > 0) return false;
    this.pause -= 1;
    return this.pause <= 0;
  }

  // Builds the next wave and gives it back as a new array of enemies.
  makeWave() {
    this.wave += 1;
    this.pause = 90;
    const speed = 0.5 + this.wave * 0.25;
    const wave = [];
    for (let i = 0; i < this.wave + 2; i++) {
      const hp = i % 3 === 2 ? 3 : 1;
      wave.push(new Enemy(40 + floor(random(8)) * 45, -20 - i * 50, hp, speed));
    }
    return wave;
  }
}

let ship, base, spawner;
let bullets, enemies, cooldown, score, baseHp, playing;

function setup() {
  new Canvas(400, 400);

  base = new Sprite(200, 392, 400, 16, 'static');
  base.color = '#334';

  ship = new Sprite(200, 360, 36, 18, 'static');
  ship.color = 'deepskyblue';

  bullets = [];
  enemies = [];
  startRound();
}

// Left and right move the ship; two ifs keep it on the canvas.
function moveShip() {
  if (kb.pressing('left')) ship.x -= 5;
  if (kb.pressing('right')) ship.x += 5;
  if (ship.x < 20) ship.x = 20;
  if (ship.x > 380) ship.x = 380;
}

// Holding Space fires, but only when the cooldown has counted down to 0.
function fire() {
  if (cooldown > 0) cooldown -= 1;
  if (kb.pressing('space') && cooldown === 0) {
    bullets.push(new Bullet(ship.x, ship.y - 18));
    cooldown = 12;
  }
}

// Every shot climbs; one that leaves the top stops being alive, and clearFinished removes it.
function moveBullets() {
  for (const b of bullets) b.move();
}

// Every enemy falls. One that reaches the base costs 1 and is used up.
function moveEnemies() {
  for (const e of enemies) {
    e.move();
    if (e.isAlive() && e.reachedBase()) {
      baseHp -= 1;
      e.land();
    }
  }
  if (baseHp <= 0) playing = false;
}

// Every shot against every enemy. Nothing is spliced here: the objects only change.
function hitEnemies() {
  for (const b of bullets) {
    for (const e of enemies) {
      if (b.hits(e)) {
        b.spend();
        e.takeHit(1);
        if (!e.isAlive()) score += e.worth;
      }
    }
  }
}

// Finished objects leave in two places: the screen (remove) and the list (filter).
function clearFinished() {
  for (const b of bullets) {
    if (!b.isAlive()) b.remove();
  }
  bullets = bullets.filter((b) => b.isAlive());

  for (const e of enemies) {
    if (!e.isAlive()) e.remove();
  }
  enemies = enemies.filter((e) => e.isAlive());
}

// Puts back everything a round owns. setup() and the R key both use it.
function startRound() {
  for (const b of bullets) b.remove();
  bullets = [];
  for (const e of enemies) e.remove();
  enemies = [];
  spawner = new Spawner();
  Enemy.spawned = 0;
  cooldown = 0;
  score = 0;
  baseHp = 3;
  playing = true;
}

function draw() {
  background('#111');

  if (playing) {
    moveShip();
    fire();
    if (spawner.ready(enemies.length)) enemies = spawner.makeWave();
    moveBullets();
    moveEnemies();
    hitEnemies();
    clearFinished();
  }

  if (kb.presses('r')) startRound();
}

// drawTop() runs after the sprites, so nothing can cover the words.
function drawTop() {
  fill('white');
  textSize(18);
  text('score: ' + score, 12, 26);
  text('wave: ' + spawner.wave, 165, 26);
  text('base: ' + baseHp, 310, 26);

  if (!playing) {
    textSize(30);
    text('Game over', 122, 190);
    textSize(14);
    text('enemies faced: ' + Enemy.spawned, 142, 216);
    text('press R to play again', 128, 238);
  }
}
```

`C5-from-C6` (gives the 5.11.5 solution: no Spawner, no static yet):

```diff
--- solution.js
+++ solution.js
@@ -1,4 +1,4 @@
-// Defender, Part C: the same game, with classes (5.11 reference).
+// 5.11.5 Lab: Bullet, and a hit that takes an enemy (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
@@ -36,8 +36,6 @@
 
 // One enemy. It keeps its own hp, worth and speed: no parallel arrays.
 class Enemy {
-  static spawned = 0;
-
   constructor(x, y, hp, speed) {
     this.hp = hp;
     this.worth = hp * 10;
@@ -46,7 +44,6 @@
     this.sprite.collider = 'none';
     this.sprite.color = hp > 1 ? 'orange' : 'crimson';
     this.sprite.text = String(hp);
-    Enemy.spawned += 1;
   }
 
   move() {
@@ -77,36 +74,10 @@
   }
 }
 
-// Owns the waves: which wave it is, and the pause before the next one.
-class Spawner {
-  constructor() {
-    this.wave = 0;
-    this.pause = 60;
-  }
-
-  // While the field is clear the pause counts down. True when the next wave is due.
-  ready(enemiesLeft) {
-    if (enemiesLeft > 0) return false;
-    this.pause -= 1;
-    return this.pause <= 0;
-  }
-
-  // Builds the next wave and gives it back as a new array of enemies.
-  makeWave() {
-    this.wave += 1;
-    this.pause = 90;
-    const speed = 0.5 + this.wave * 0.25;
-    const wave = [];
-    for (let i = 0; i < this.wave + 2; i++) {
-      const hp = i % 3 === 2 ? 3 : 1;
-      wave.push(new Enemy(40 + floor(random(8)) * 45, -20 - i * 50, hp, speed));
-    }
-    return wave;
-  }
-}
-
-let ship, base, spawner;
-let bullets, enemies, cooldown, score, baseHp, playing;
+let ship, base;
+let bullets, cooldown, score, baseHp, playing;
+let enemies;
+let wave, wavePause, fallSpeed;
 
 function setup() {
   new Canvas(400, 400);
@@ -144,6 +115,32 @@
   for (const b of bullets) b.move();
 }
 
+// One line now: the enemy carries its own hp, worth and speed.
+function spawnEnemy(x, y, hp) {
+  enemies.push(new Enemy(x, y, hp, fallSpeed));
+}
+
+// One wave: two more enemies than the wave number, in a column above the top,
+// every third one tough. Each wave falls a little faster.
+function spawnWave() {
+  wave += 1;
+  fallSpeed = 0.5 + wave * 0.25;
+  for (let i = 0; i < wave + 2; i++) {
+    const hp = i % 3 === 2 ? 3 : 1;
+    spawnEnemy(40 + floor(random(8)) * 45, -20 - i * 50, hp);
+  }
+}
+
+// While the field is clear, the pause counts down; at 0 the next wave comes.
+function nextWave() {
+  if (enemies.length > 0) return;
+  wavePause -= 1;
+  if (wavePause <= 0) {
+    spawnWave();
+    wavePause = 90;
+  }
+}
+
 // Every enemy falls. One that reaches the base costs 1 and is used up.
 function moveEnemies() {
   for (const e of enemies) {
@@ -188,8 +185,9 @@
   bullets = [];
   for (const e of enemies) e.remove();
   enemies = [];
-  spawner = new Spawner();
-  Enemy.spawned = 0;
+  wave = 0;
+  wavePause = 60;
+  fallSpeed = 1;
   cooldown = 0;
   score = 0;
   baseHp = 3;
@@ -202,7 +200,7 @@
   if (playing) {
     moveShip();
     fire();
-    if (spawner.ready(enemies.length)) enemies = spawner.makeWave();
+    nextWave();
     moveBullets();
     moveEnemies();
     hitEnemies();
@@ -217,14 +215,13 @@
   fill('white');
   textSize(18);
   text('score: ' + score, 12, 26);
-  text('wave: ' + spawner.wave, 165, 26);
+  text('wave: ' + wave, 165, 26);
   text('base: ' + baseHp, 310, 26);
 
   if (!playing) {
     textSize(30);
     text('Game over', 122, 190);
     textSize(14);
-    text('enemies faced: ' + Enemy.spawned, 142, 216);
-    text('press R to play again', 128, 238);
+    text('press R to play again', 128, 216);
   }
 }
```

`C4-from-C5` (gives the 5.11.4 solution: no Bullet class yet):

```diff
--- solution.js
+++ solution.js
@@ -1,39 +1,7 @@
-// 5.11.5 Lab: Bullet, and a hit that takes an enemy (reference solution).
+// 5.11.4 Lab: Enemy takes over (reference solution).
 
 const BASE_Y = 370;   // anything that falls below this line has reached the base
 
-// A shot from the ship. It climbs until it hits something or leaves the top.
-class Bullet {
-  constructor(x, y) {
-    this.sprite = new Sprite(x, y, 6, 14);
-    this.sprite.collider = 'none';
-    this.sprite.color = 'yellow';
-    this.spent = false;
-  }
-
-  move() {
-    this.sprite.y -= 8;
-  }
-
-  // Still in play: not used up, and not off the top.
-  isAlive() {
-    return !this.spent && this.sprite.y > -20;
-  }
-
-  // Does this shot touch that enemy? The parameter is another object.
-  hits(enemy) {
-    return this.isAlive() && enemy.isAlive() && this.sprite.overlaps(enemy.sprite);
-  }
-
-  spend() {
-    this.spent = true;
-  }
-
-  remove() {
-    this.sprite.delete();
-  }
-}
-
 // One enemy. It keeps its own hp, worth and speed: no parallel arrays.
 class Enemy {
   constructor(x, y, hp, speed) {
@@ -105,14 +73,23 @@
 function fire() {
   if (cooldown > 0) cooldown -= 1;
   if (kb.pressing('space') && cooldown === 0) {
-    bullets.push(new Bullet(ship.x, ship.y - 18));
+    const b = new Sprite(ship.x, ship.y - 18, 6, 14);
+    b.collider = 'none';
+    b.color = 'yellow';
+    bullets.push(b);
     cooldown = 12;
   }
 }
 
-// Every shot climbs; one that leaves the top stops being alive, and clearFinished removes it.
+// Every shot climbs 8 pixels; one that has left the top is deleted and spliced out.
 function moveBullets() {
-  for (const b of bullets) b.move();
+  for (let i = bullets.length - 1; i >= 0; i--) {
+    bullets[i].y -= 8;
+    if (bullets[i].y < -20) {
+      bullets[i].delete();
+      bullets.splice(i, 1);
+    }
+  }
 }
 
 // One line now: the enemy carries its own hp, worth and speed.
@@ -153,26 +130,24 @@
   if (baseHp <= 0) playing = false;
 }
 
-// Every shot against every enemy. Nothing is spliced here: the objects only change.
+// Every shot against every enemy. A hit removes the shot and calls takeHit;
+// the enemy is not spliced here any more: clearEnemies() does that.
 function hitEnemies() {
-  for (const b of bullets) {
+  for (let i = bullets.length - 1; i >= 0; i--) {
     for (const e of enemies) {
-      if (b.hits(e)) {
-        b.spend();
+      if (e.isAlive() && bullets[i].overlaps(e.sprite)) {
+        bullets[i].delete();
+        bullets.splice(i, 1);
         e.takeHit(1);
         if (!e.isAlive()) score += e.worth;
+        break;   // this shot is gone: stop testing it against the others
       }
     }
   }
 }
 
-// Finished objects leave in two places: the screen (remove) and the list (filter).
-function clearFinished() {
-  for (const b of bullets) {
-    if (!b.isAlive()) b.remove();
-  }
-  bullets = bullets.filter((b) => b.isAlive());
-
+// Finished enemies leave in two places: the screen (remove) and the list (filter).
+function clearEnemies() {
   for (const e of enemies) {
     if (!e.isAlive()) e.remove();
   }
@@ -181,7 +156,7 @@
 
 // Puts back everything a round owns. setup() and the R key both use it.
 function startRound() {
-  for (const b of bullets) b.remove();
+  for (const b of bullets) b.delete();
   bullets = [];
   for (const e of enemies) e.remove();
   enemies = [];
@@ -204,7 +179,7 @@
     moveBullets();
     moveEnemies();
     hitEnemies();
-    clearFinished();
+    clearEnemies();
   }
 
   if (kb.presses('r')) startRound();
```

---

## 9. How this was checked

All in `/tmp` scratch, nothing in the repo touched except this file.

1. **Headless, the course's own engine.** Every reference, every intermediate solution, every starter and the three
   example blocks were run through `scripts/moshion-harness.mjs` (the harness `test-moshion.mjs` uses, loading the
   vendored `public/moshion/moshion.js`): 300 frames each holding Space and Left, no errors, all draw. Then
   behaviour, with an autopilot that steers under the lowest target and holds Space:
   - Part A: idle, the drone lands three times and the round ends; nothing moves after; R restores score 0, base 3,
     no shots, cooldown 0. Autopilot 1200 frames: score 19, base 3, at most 4 shots alive. 60 held frames fire exactly
     5 shots. Holding Left stops at x = 20.
   - Part B (and the 5.10.2 and 5.10.5 shapes): the three arrays have equal length on every frame; a tough enemy
     scores 30; autopilot reaches wave 10, score 1000, base 1; R mid-round leaves only the ship and base on screen.
     The 5.10.8 starter drifts (lengths 4/5/4, labels disagree with `enemyHp`); the fix agrees.
   - Part C, after 5.11.4, after 5.11.5 and final: **the same autopilot run gives the same result as Part B (score
     1000, base 1, wave 10)**, so the refactor changes no behaviour. On every frame `allSprites.length` equals
     2 + shots + enemies (no ghosts, no double delete). `Enemy.spawned` is 3 after wave 1; R sets it to 0 and makes a
     new Spawner; the next wave arrives after the pause.
   - 5.11.9 solution: a 10-hp boss by wave 5; `best` equals the final score and survives R.
2. **Real browser.** The dev server at `http://localhost:3002` served `/moshion/runner.html` with the Part A final
   (rendered: ship, base, drone, HUD). For state reads, the same `runner.html` + `moshion.js` were served
   same-origin from scratch and driven with playwright-cli (session `spec-capstone`, closed afterwards): real Space
   key fired with the cooldown (4 shots alive), real Left clamped at 20; a 20-30 s in-page autopilot gave A score
   21, B and C score 210 at wave 4 (identical again), C9 240; game over showed the words over the enemies
   (drawTop), "enemies faced: 33" after wave 6 (3+4+5+6+7+8), and a real R key reset to score 0, wave 0, spawned 0
   with 2 sprites left.
3. **Grading.** Section 7's patterns against references, starters, cheats and honest variants, with the compiled
   `lib/grader.ts`.

Not checked: the lesson pages themselves (no lesson exists), the quiz JSON, the AI rubrics against the live model,
and `npm run prebuild` gates (nothing to gate yet).

---

## 10. Build split for parallel builders

| Builder | Owns (disjoint) | Reads from this spec |
| --- | --- | --- |
| A | `lessons/5-9-defender-*` (8), `curriculum/modules/5.9_defender-ship-and-shots.md`, `curriculum/groups/5.9.json` | sections 2-4, 7 (5.9.x), 8.1 |
| B | `lessons/5-10-defender-*` (9), `curriculum/modules/5.10_defender-enemies-and-waves.md`, `curriculum/groups/5.10.json` | sections 2, 3, 5, 7 (5.10.x), 8.1 (for 5.10.2's starter base), 8.2 |
| C | `lessons/5-11-defender-*` (9), `curriculum/modules/5.11_defender-classes.md`, `curriculum/groups/5.11.json` | sections 2, 3, 6, 7 (5.11.x), 8.2 (for 5.11.4's starter), 8.3 |

No builder needs another's output: every cross-module starter is pasted here, every cross-module help pointer uses a
title fixed in sections 4-6. Builders must **not** commit regenerated shared files (`public/lessons-manifest.json`,
`public/lesson-requirements.json`, `public/ai-graders.json`, quiz keys, generated starters); the orchestrator
regenerates them once after merging and runs the gate list from `codehs-review/LOOP-PLAN.md` (check-lesson-numbers,
check-lesson-groups, check-prompt-pointers, check-help-pointer-titles, check-lesson-citations, check-hints,
check-live-blocks, check-starters, check-solution-leak, test-quiz, tsc, and `test-moshion.mjs --corpus`, which will
now run all 26 folders' scripts).

Module docs follow `5.5_snake.md`: frontmatter (`id`, `title: "Project: Defender, Part A"` etc., `quarter: 2`,
`weeks`, `environment: moSHion`, `status: draft`), SLO focus, goal, pre/post snapshot (sections 4-6), a Note saying
it is not a book section and that words go in `drawTop()`, "the one idea this module is really about", unit-level
assessments. Groups follow `curriculum/groups/5.5.json`, e.g. 5.9: `ship-and-shots` (5.9.1-5.9.4), `hits`
(5.9.5-5.9.6), `a-round` (5.9.7-5.9.8); 5.10: `many-enemies` (5.10.1-5.10.2), `the-hit-loop` (5.10.3-5.10.5),
`waves` (5.10.6-5.10.7), `the-cost` (5.10.8-5.10.9); 5.11: `design` (5.11.1-5.11.2), `refactor` (5.11.3-5.11.6),
`close` (5.11.7-5.11.9). `source`: "Not a book section. The one-game-across-modules shape follows CodeHS's project
modules in Introduction to Game Design and AP CSA's class units. Structure only: no CodeHS text, problems or code is
copied."

---

## 11. Totals and open questions

**26 lessons**: 5.9 has 8, 5.10 has 9, 5.11 has 9. By kind: 5 readings, 3 worked examples, 10 labs (one of them the
debugging lab), 1 challenges, 3 plans (AI, 0 points), 1 playtest-and-reflect (AI, 0 points), 3 checks. About 6 hours
of student time by the estimates (89 + 115 + 152 minutes). Nothing was cut.

Open for the owner or orchestrator:

1. **Pacing.** Six hours on top of 5.7 (~4h45) and 5.8 (~3h), already flagged in PLACEMENT open question 11. `week`
   is set to 12 here as a placeholder.
2. **Spawner and the checklist.** The spec keeps `Spawner` (the brief asks for it) and has the content say aloud
   that it fails 5.7.18's first question. The alternative is waves as two scene functions in Part C, which drops
   lab 5.11.6's class half (and `Enemy.spawned` would move into 5.11.4).
3. **Neighbours that mention adjacency.** `curriculum/modules/5.8_inside-a-class.md` ("Ready for §6.1") and
   `6.1_groups-overlaps.md` (pre-snapshot) now have the capstone between them; not edited here (out of scope).
   6.1's apple catcher could open with "your Defender arrays and nested loop, in one line"; also not done here.
4. **Points.** 0 everywhere, matching 5.4/5.5. If the capstone should carry weight, the natural graded pieces are
   the three part finals (5.9.7, 5.10.7, 5.11.6).
5. **Game choice.** Vertical shooter, not the brief's free-aiming arena ship (section 1). Changing back would need
   angles or vector normalising taught somewhere first.
