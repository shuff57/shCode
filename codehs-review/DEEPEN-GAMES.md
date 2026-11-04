# Deepen the games: grow Pinball, Flappy and Snake, add Mini Golf, Cannon and Jumper

Build spec, drafted 2026-11-03 on `codehs-inspiration`. Nothing is built and no lesson is edited by this file.

**Owner decisions it follows.** (a) 5.3 Pinball, 5.4 Flappy and 5.5 Snake grow inside their own modules. (b) New games
are added ("we already decided to add more games"): a Mini Golf, a Cannon and a Jumper, shaped after the CodeHS units of
the same kind (structure only; no CodeHS text, problems or code). (c) No classes, groups, `this` or `extends` anywhere
here (PLACEMENT #14). (d) The classes and Defender block (5.6-5.11) is not renumbered now; the new games go at 5.12-5.14
and move in front of the classes block at the unit repartition.

**Read for this spec:** `MOSHION-COVERAGE.md` (Chapter 5 scope check, gaps, used-before-taught), `GAMES-FOR-BASICS.md`
(rows 1-16, Options A-C), `PLACEMENT.md`, `PACING.md`, `RELEASE-CH5.md`, module docs and groups 5.3-5.5, every 5.1-5.5
and 5.9-5.10 title, labs 5.3.8, 5.4.8 and 5.5.4, the 5.3.11 and 5.5.9 closes, the 5.1 walk reports in `loop/`, and
`public/moshion/moshion.js` (`d8068bb`) for every API name below.

**Totals.** 65 new lessons: Pinball +7, Flappy +9, Snake +8 (24 deepening); Mini Golf 14, Cannon 13, Jumper 14
(41 new-game). About 844 `estimateMins` (14 h). Ten build batches of 6-7 lessons, then one integration round.

---

## 0. Rules every new screen follows

1. **Ids and numbers.** Every folder is new. Appended lessons take the next display number after the module's last
   (5.3.15+, 5.4.12+, 5.5.12+), so no existing number, Help pointer or D1 key moves. New modules use the prefixes
   `5-12-golf-*`, `5-13-cannon-*`, `5-14-jumper-*`. `lesson.json` keeps the house fields: `category`
   `"Unit 2: moSHion: Applied Game Development"`, `unit` `"5.12 Project: Mini Golf"` (and so on), `slos ["SLO-3"]`,
   0 points, `week` as in section 7.
2. **Cite backwards only, in play order.** A Help pointer or prerequisite may name chapters 1-4, 5.1-5.5 (including the
   new appended screens) and an earlier new game. **Never 5.6-5.11 or 6.x**: those come later in play order once the
   repartition lands. Every `Help: N.N.N (Title)` uses the exact current title (`check-help-pointer-titles`).
3. **Wording that reads right in both orders.** Until the repartition, a student who follows the module list meets
   Defender (5.9-5.10) before Cannon. So no new screen says "for the first time" or "you have never"; it says
   "here is how" and cites 5.1-5.5.
4. **Lab shape = 5.3.8.** `description` + 3-4 `steps` with hints, 2-4 regex `requirements` (each ending with a Help
   pointer), and an `aiCheck` whose rubric mirrors the cards in the same lenient voice. Starter = the previous lab's
   reference, plus only the scaffolding the step needs. Words on screen go in `drawTop()` (5.4.5).
5. **Code convention.** Deepening labs keep their module's existing `draw()` shape. New-game starters follow 5.2.22:
   rules in `update()`, picture in `draw()`, words in `drawTop()`. Every card accepts the work in `update()`, `draw()`
   or a helper either of them calls.
6. **Lax grading** (memory `feedback_pseudocode-grading-lax`): each card states one idea and accepts every honest
   shape of it; the "Accept" lists below become ACCEPT cases in `scripts/test-grader-tolerance.mjs`, the "Refuse"
   lists and the untouched starter become REJECT cases.
7. **Closes.** Plans and playtests are AI-graded, 0 points, and copy the very-generous criterion wording of 5.3.11
   and 5.5.1/5.5.9 word for word apart from the game's name and the lessons cited (section 5).
8. **Name the shape, never the starter's comment.** "In `setup()`, where the STEP 1 comment is" stops being true as
   soon as a student carries their own work forward (`CARRY-FORWARD-SPEC.md`), so say "in `setup()`, below each
   bumper's `worth` line". Where a name may reasonably differ, one sentence covers it: "if you brought your 5.3.14
   work forward, your bumpers may be called something else."

---

## 1. What each game teaches now, and what feels light

### 5.3 Pinball (14 lessons)

| Group (screens) | What it teaches |
|---|---|
| Plan, and from scene to game (5.3.1-5.3.4) | A written plan; the four parts of a game (goal, score, loss, restart); static walls; a goal on the table. |
| Scoring an event (5.3.5-5.3.8) | `colliding()` is true every frame; a was-touching memory; a loop over a bumper array, each bumper with its own `worth` and memory; the do-not-use field names. |
| Losing and restarting (5.3.9-5.3.10) | A `playing` flag, game over, and an R key that puts back what a round owns. |
| Playtest, and make it yours (5.3.11-5.3.12) | AI-graded playtest about what broke; challenges. |
| A sound on a hit (5.3.13-5.3.14) | `loadSound()` once, `.play()` inside the edge check, the first-click rule. |

**Light.** Every sprite is a box with no words, and a hit leaves no mark but the score. The ball has one weight: 5.2
stopped at gravity, bounciness, friction and `applyForce`, so `.mass`, `.gravityScale`, `.rotationLock` and `.debug`
live only in the drawer. After R the player has nothing to do. The close hunts bugs; nothing asks "does it feel finished".

### 5.4 Flappy (11 lessons)

| Group (screens) | What it teaches |
|---|---|
| Plan, and the flap (5.4.1-5.4.4) | A plan; gravity and a flap on `kb.presses`. |
| A world that scrolls (5.4.5-5.4.6) | Kinematic pipes on a `frameCount % 90` beat, kept in an array, deleted and spliced backwards; words in `drawTop()`. |
| Score and crash (5.4.7-5.4.8) | A `passed` flag per pipe; a crash freezes the world; R restarts. |
| Playtest, check, make it yours (5.4.9-5.4.11) | Playtest, a quiz, challenges. |

**Light.** Timers are hand-built `frameCount %` checks; `every()`/`after()` are drawer-only. Game over sits at a
hand-picked x. The bird jumps back to y = 200 when it leaves the screen instead of meeting a ceiling and a floor. The
bird is a coloured circle, and there is no title or get-ready moment.

### 5.5 Snake (11 lessons)

| Group (screens) | What it teaches |
|---|---|
| Plan, and a world on a grid (5.5.1-5.5.3) | A plan; cells and `cellToPixel`; the do-not-use names again. |
| Steering (5.5.4) | Direction as `dx`/`dy`; no reversing; a step on a beat. |
| Growing and searching (5.5.5-5.5.8) | `unshift`/`pop`; eating skips the pop; an `isBody` search; biting yourself ends the round. |
| Playtest, check, make it yours (5.5.9-5.5.11) | Playtest, a quiz, challenges. |

**Light.** The grid exists only in the student's head (no lines, no frame). Food is a red square. The speed never
changes outside a challenge. `min`/`max`/`round`/`abs` appear only as accepted alternatives and in challenge solutions.

### What none of the three can hold

Firing projectiles, aiming with the pointer, direction and speed, slowing to a stop, a pass-through target,
strokes and par, platforms with ground sensing, and a chasing enemy. None of the three games has a pointer, an enemy
or a platform, and bolting one on would change the game. Those go to the three new games (section 4).

---

## 2. Who owns each basic (no duplication)

"Taught" = the reading or example that introduces the name. "Applied" = later labs that use it and cite back.

| Row | Basic | Taught (owner) | Applied in |
|---|---|---|---|
| 1 | Firing projectiles | 5.13.4-5.13.7 (Cannon) | 5.13.9-5.13.10 |
| 2 | Platforms, ground sensing | 5.14.2-5.14.6 (Jumper); `new Walls()` 5.12.7 (Mini Golf) | 5.14.11 |
| 3 | Chasing enemy | 5.14.9-5.14.10 (Jumper) | 5.14.14 |
| 4 | Mouse input and aiming | 5.12.2-5.12.3 (Mini Golf); aim at the pointer 5.13.2 | 5.12.6, 5.13.3, 5.13.7 |
| 5 | Direction and speed | 5.12.4-5.12.6 (Mini Golf); `rotateTo()` 5.13.2 | 5.13.7, 5.14.10 |
| 6 | Pass-through target | 5.12.9-5.12.10 (Mini Golf) | 5.14.7-5.14.8 (coins, door, ghost) |
| 7 | Safe custom field names | already built: 5.3.8 step s1 and 5.5.2 | 5.13.8 (a crate's `hits`, never `life`) |
| 8 | Slowing and stopping | 5.12.7-5.12.8 (Mini Golf) | 5.12.11, 5.14.14 |
| 9 | Timer helpers | 5.4.12-5.4.13 (Flappy) | 5.4.17, 5.13.13, 5.14.10 |
| 10 | Centred text, staying on screen | 5.4.14-5.4.15 (Flappy) | 5.12.10, 5.13.2, 5.14.4 |
| 11 | Physics knobs | 5.3.18-5.3.19 (Pinball) | `gravityScale` 5.4.17; `rotationLock` 5.14.4; `mass` 5.13.13 |
| 12 | Things that expire | 5.3.15-5.3.17 (Pinball) | 5.13.4-5.13.7 |
| 13 | Plain shapes | 5.5.12-5.5.13 (Snake) | 5.12.3 (the aim line) |
| 14 | Sprite art | `.texture` 5.4.16-5.4.17 (Flappy); `.image` 5.5.15-5.5.16 (Snake) | 5.13 crates, 5.14 player, coins, ghost, door |
| 15 | Saved high score | **deferred** to 6.5.3 (PLACEMENT puts saving in 6.5; no Chapter 5 home) | none |
| 16 | Math helpers | 5.5.14 and 5.5.16 (Snake); `constrain` 5.4.14 | `dist`/`min` 5.12.3-5.12.6, `abs` 5.12.8 |
| extra | Labels on sprites (`.text`) | 5.3.15-5.3.17 | none required |
| extra | `kb.released()` | 5.12.2 | 5.14.14 |

---

## 3. Deepening: the polish arcs appended to 5.3, 5.4 and 5.5

Each arc is the same story: the game works, and now we make it feel finished. Each ends with a 0-point
"Playtest and polish" (section 5) and a challenges screen graded by one card that any challenge turns green (the 5.4.11
pattern: step 1 pick a rule, step 2 a `//` comment at the top naming it).

### 3.1 Pinball polish (5.3.15-5.3.21), 7 lessons, 92 min

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.3.15 | `5-3-pinball-polish-1-reading-words-and-sprites-that-run-out` | reading | Reading: Words on a sprite, and sprites that run out | A sprite can wear its own label (`.text`, `.textColor`, `.textSize`); `.life = n` deletes it n frames later, which is why `life` was on 5.3.8's do-not-use list | 12, labels | 5.1.21, 5.2.15, 5.2.16, 5.3.8 | 8 |
| 5.3.16 | `5-3-pinball-polish-2-example-a-plus-that-floats-away` | example | Worked Example: A "+5" that floats away | On the frame a hit starts, make a small sprite at the bumper with `collider = 'none'`, `.text`, a slow upward `vel.y` and `.life = 40`; label each bumper with its worth | 12 | 5.3.15, 5.3.8 | 10 |
| 5.3.17 | `5-3-pinball-polish-3-lab-show-the-worth-pop-the-points` | lab | Lab: Show the worth, pop the points | The same on the student's own table | 12 | 5.3.16, 5.3.14 | 12 |
| 5.3.18 | `5-3-pinball-polish-4-reading-four-physics-knobs` | reading | Reading: Four knobs: mass, gravityScale, rotationLock, debug | A heavier body moves less under the same push; a sprite's own share of gravity (0 floats, 0.5 drifts); a body that will not turn; the collider outline for finding bugs | 11 | 5.2.6, 5.2.11, 5.2.13 | 10 |
| 5.3.19 | `5-3-pinball-polish-5-lab-nudge-the-table` | lab | Lab: Nudge the table | A held key pushes the ball with `applyForce`; mass decides whether that is a nudge or a launch; debug shows the real collider | 11 | 5.3.18, 5.2.13, 5.2.14 | 12 |
| 5.3.20 | `5-3-pinball-polish-6-playtest-and-polish` | written, AI | Playtest and polish: Pinball | Section 5 | close | 5.3.11, 5.3.19 | 15 |
| 5.3.21 | `5-3-pinball-polish-7-challenges-polish-it-your-way` | challenge | Challenges: Polish it your way | Fade the popup with `.opacity` (explained in the step, never `fill()` alpha, which moSHion ignores); a tilt rule (more than 3 nudges in 120 frames loses the ball); a heavier ball in round 2 | 11, 12 | 5.3.15-5.3.19 | 25 |

**5.3.17** (starter = 5.3.14 reference, chime included)
- r1 *Each bumper shows its worth.* Accept `.text` from `worth` in `setup()` or in the loop, by join, template string or
  `String()`, and also `text(b.worth, b.x, b.y)` drawn each frame. Refuse the starter.
- r2 *A popup is made only when a hit starts.* `new Sprite(` (or a helper that makes one) inside the branch that adds the
  worth. Refuse: made on every touching frame; made once in `setup()`.
- r3 *The popup removes itself.* `.life =` a number or variable above 0 on the popup; accept a countdown field of
  their own ending in `.delete()`. Refuse `.life` on the ball or a bumper (the AI note says it deletes them, 5.3.8).

**5.3.19** (starter = 5.3.17 reference)
- r1 *A held key pushes the ball.* `ball.applyForce(` inside a `kb.pressing(` branch; any key, two keys, a helper.
  Refuse `vel.x +=` (velocity ignores mass, so step 2 would change nothing; the note cites 5.2.13).
- r2 *The ball's weight is set.* `ball.mass =` or `ball.density =` any number or variable.
- r3 *The collider outline is on.* `.debug = true` on any sprite; accept a key that flips it.
- Step 4 (no card): a comment saying which mass felt right and why.

### 3.2 Flappy polish (5.4.12-5.4.20), 9 lessons, 123 min

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.4.12 | `5-4-flappy-polish-1-reading-timers-with-names` | reading | Reading: Timers with names: every() and after() | `every(90, fn)` runs fn every 90 frames, `after(60, fn)` once; each returns a handle with `.stop()`; frames, not seconds; make a timer once (in `setup()` or on an event), never inside `draw()`, or sixty new timers start every second | 9 | 5.2.1, 5.2.4, 5.4.6, 3.4.2, 3.4.6 | 10 |
| 5.4.13 | `5-4-flappy-polish-2-lab-pipes-on-a-timer` | lab | Lab: Pipes on a timer, a pause before the start | Pipes from one `every()`; after R, `after(60, …)` starts play while "get ready" shows | 9 | 5.4.12, 5.4.8, 5.3.9 | 15 |
| 5.4.14 | `5-4-flappy-polish-3-reading-centred-words-and-a-ceiling` | reading | Reading: Centred words, and a ceiling: textAlign() and constrain() | `textAlign(CENTER)` makes x the middle of the words and stays on until `textAlign(LEFT)`; `constrain(v, low, high)` keeps a number in range; clamp `bird.y` and stop its upward speed at the top | 10 | 5.1.21, 5.4.5, 5.4.8 | 8 |
| 5.4.15 | `5-4-flappy-polish-4-lab-a-title-a-ceiling-a-floor` | lab | Lab: A title, a ceiling and a floor | Centred title and Game over; the bird stops at the top; the floor ends the round | 10 | 5.4.14, 5.3.9 | 15 |
| 5.4.16 | `5-4-flappy-polish-5-example-a-bird-with-real-art` | example | Worked Example: A bird with real art | `bird.texture = 'bird'` (named pixel art; the drawer's texture page lists the names); the picture changes, the collider does not; a feather: `gravityScale` 0.4, put back by `after(120, …)` | 14, 11, 9 | 5.3.18, 5.4.12 | 10 |
| 5.4.17 | `5-4-flappy-polish-6-lab-a-real-bird-and-a-feather` | lab | Lab: A real bird, and a feather | The same on the student's game, once per round | 14, 11 | 5.4.16 | 15 |
| 5.4.18 | `5-4-flappy-polish-7-quiz-timers-edges-art` | checkpoint | Check: timers, edges and art | 5 items, below | 9, 10, 14 | 5.4.12-5.4.17 | 10 |
| 5.4.19 | `5-4-flappy-polish-8-playtest-and-polish` | written, AI | Playtest and polish: Flappy | Section 5 | close | 5.4.9, 5.4.17 | 15 |
| 5.4.20 | `5-4-flappy-polish-9-challenges-polish-it-your-way` | challenge | Challenges: Polish it your way | Pipes speed up (stop the timer, start a faster one); a 3-2-1 countdown from chained `after()`; the bird tilts with its fall speed (`rotation` from `constrain(bird.vel.y * 5, -30, 60)`) | 9, 10 | 5.4.12-5.4.17 | 25 |

**5.4.13** (starter = 5.4.8 reference)
- r1 *Pipes come from a named timer.* An `every(` that makes a pipe pair (named function, arrow function, helper), made in
  `setup()` or in a start/restart helper. Accept: the callback checks `playing`; the handle `.stop()`ped on a crash and
  a new timer made on R; any beat. Refuse the starter's `frameCount %` beat alone, and `every(` inside `draw()`/`update()`
  outside any key check (one new timer per frame; the AI note names it).
- r2 *R starts play after a pause.* An `after(` made in the R branch whose function sets `playing = true` (or gives
  gravity back); any frame count; a helper. Refuse `after(` running every frame.
- Step 3 (no card): show "get ready" while waiting, using a plain flag (5.3.9).

**5.4.15** (starter = 5.4.13 reference)
- r1 *Game over is centred.* `textAlign(CENTER)` (or `'center'`) before the Game over text. Refuse a hand-picked x alone.
- r2 *The bird stops at the top.* `bird.y = constrain(bird.y, …)`; accept `max(…)` or an `if` that clamps. Refuse the
  starter's jump back to 200 still handling the top.
- r3 *The floor ends the round.* `bird.y` past a bottom number (or `height`), or touching a ground sprite, sets
  `playing = false` or calls the crash helper.
- Step 4 (no card): a centred title before the first flap.

**5.4.17** (starter = 5.4.15 reference)
- r1 *The bird wears named art.* `bird.texture = '…'`; accept `bird.image = '…'` (5.5.15 comes later, but a student may
  find it in the drawer). Refuse art on a pipe only.
- r2 *A key makes the bird floaty.* Inside a `kb.presses(` branch, `bird.gravityScale =` a number or variable below 1
  (the AI note says 0 means no gravity at all).
- r3 *The float ends by itself.* An `after(` whose function sets `gravityScale` back; accept their own countdown.
  Refuse a reset on the next line (no time passes).
- Step 4 (no card): once per round, using a flag that R clears.

**5.4.18 Check items:** what `every(90, makePipe)` in `setup()` does, against the same line inside `draw()`; what
`after(60, fn)` does; where `textAlign(CENTER)` puts words relative to x; `constrain(450, 0, 400)`; does `.texture`
change the collider (no).

### 3.3 Snake polish (5.5.12-5.5.19), 8 lessons, 107 min

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.5.12 | `5-5-snake-polish-1-reading-lines-and-boxes` | reading | Reading: Lines and boxes you draw: line(), rect(), stroke() | `line()`, `rect()`, `stroke()`, `strokeWeight()`, `noStroke()`, `noFill()`; draw settings stay on until changed; drawn every frame after `background()`; in `draw()` they sit under the sprites, in `drawTop()` over them; a grid is one loop | 13 | 5.1.9, 5.4.5, 5.5.2, 3.3.5 | 10 |
| 5.5.13 | `5-5-snake-polish-2-lab-grid-lines-and-a-frame` | lab | Lab: Grid lines and a frame | Faint lines from a loop under the snake; a frame over the board | 13 | 5.5.12 | 12 |
| 5.5.14 | `5-5-snake-polish-3-reading-small-math-helpers` | reading | Reading: Small math helpers | `round`, `min` (a ceiling), `max` (a floor), `abs`, `dist`, `random([list])`, with one game use each; `constrain` recalled from 5.4.14 | 16 | 5.2.1, 5.4.14 | 10 |
| 5.5.15 | `5-5-snake-polish-4-example-fruit-from-a-list` | example | Worked Example: Fruit from a list | `food.image = random(['🍎', '🍒', '🍇'])`; `.image` takes an emoji, `.texture` (5.4.16) a name; neither moves the food's cell | 14, 16 | 5.5.14, 5.4.16 | 10 |
| 5.5.16 | `5-5-snake-polish-5-lab-faster-as-it-grows` | lab | Lab: Faster as it grows, fruit from a list | A beat that shrinks with the score but has a floor; fruit art from a list | 16, 14 | 5.5.14, 5.5.15 | 15 |
| 5.5.17 | `5-5-snake-polish-6-quiz-lines-helpers-art` | checkpoint | Check: lines, helpers and art | 5 items, below | 13, 14, 16 | 5.5.12-5.5.16 | 10 |
| 5.5.18 | `5-5-snake-polish-7-playtest-and-polish` | written, AI | Playtest and polish: Snake | Section 5 | close | 5.5.9, 5.5.16 | 15 |
| 5.5.19 | `5-5-snake-polish-8-challenges-polish-it-your-way` | challenge | Challenges: Polish it your way | A checkerboard from a nested `rect()` loop; a rare golden fruit worth 3 (a list with one rare entry); a speed bar drawn with `rect()` and `min()` | 13, 16 | 5.5.12-5.5.16 | 25 |

**5.5.13** (starter = 5.5.8 reference)
- r1 *The grid lines come from a loop.* `line(` inside a `for` (one loop for both directions, or two); accept a nested
  loop of `rect()` cells after `noFill()`. Refuse the starter.
- r2 *The grid sits under the snake.* The loop runs in `draw()` (or a helper it calls). Refuse the grid in `drawTop()`
  (it covers the cells; the note cites 5.4.5).
- r3 *A frame round the board.* `noFill()` before a `rect(` round the board, or four `line(` calls.
- Builder: confirm in the harness whether `stroke()` also outlines `text()`; if it does, the reading adds `noStroke()`
  before the score.

**5.5.16** (starter = 5.5.13 reference)
- r1 *The food's picture comes from a list.* `.image = random([...])` or `random(list)`; accept the 5.2.2 shape
  `list[floor(random(list.length))]`, and `.texture` from a list. Refuse one fixed emoji.
- r2 *The beat shrinks with the score but never below a floor.* `max(`, `constrain(` or an `if` that stops at a minimum
  (any floor of 1 or more). Refuse a beat with no floor (it reaches 0, `frameCount % 0` is never 0, and the snake freezes:
  the note says so).
- r3 *The step clock uses that beat.* `frameCount % beat`, or `every(beat, …)` re-made with `.stop()` on the old one.
  Refuse the starter's fixed `% 8`.

**5.5.17 Check items:** what `line(0, 0, 400, 400)` draws; why a `stroke()` set for the grid also changes later shapes;
`max(3, 8 - 6)`; what `random(['a', 'b', 'c'])` can return; whether `.image` changes the food's cell (no).

---

## 4. The new games: 5.12 Pocket, 5.13 Sling, 5.14 Climb

**Themes decided 2026-11-04. The tables below still carry the old CodeHS-shaped names and folder prefixes; they are
rewritten in phase 0, before any of these lessons is built.**

- **5.12 Mini Golf -> Pocket**, an eight-ball pool table. Same mechanics, same 14 lessons, same rows (aim, pull-back
  power, `.drag` and stop, pocket as a pass-through target, `new Walls()` rails, shots against par).
- **5.13 Cannon -> Sling**, a catapult siege. **Angry Birds is the reference**: a few shots, an arc, a wall of blocks
  that comes down. The block change is real: blocks are bodies (`mass`, `bounciness`, no `rotationLock`), so the wall
  topples, which is the payoff for 5.3.18. The arm turns to the aim with `rotateTo`, so the cannon's lesson survives.
  Aim and pull-back are not re-taught; 5.12 owns them.
- **5.14 Jumper -> Climb**, an endless vertical climber. **Doodle Jump is the reference**: platforms spawn above and
  recycle below (Flappy's loop; moSHion has no `camera.follow`), the score is height, falling ends the round, and there
  is no door. The hunter is **our addition**, because Doodle Jump has no chase and row 3 would otherwise lose its home.
- **IP rule: clone the mechanic, never the expression.** No borrowed title, character, logo, sound or level layout on a
  student page; the reference is named in the module doc only. Our own pixel art throughout.

**Numbering after the 2026-11-04 repartition.** Units are now 5 functional games basics, 6 functional games advanced,
7 objects and classes (old 5.6-5.11 are 7.1-7.6; Arcade Cabinet is 8.1; Solid Shapes is 9.1). Unit 5 ends at 5.5, so
**Pocket is 5.6**. Sling and Climb are **provisionally 6.12 and 6.13**; that is a placeholder, not a decision: when each
is built it is placed where the concepts it needs are taught, and `scripts/repartition-units.mjs` moves it in one
command. The lesson tables below still say 5.12-5.14 and are rewritten in phase 0.


Each follows the five-step close (PLACEMENT #4): an AI-graded plan, build steps with the concept injected where it is
needed, one **Debugging:** screen (the 5.10.8 kind) or one pseudocode plan before the hardest step (the 5.10.3 kind), an
AI-graded playtest, a check, and challenges. Each module doc states "**no classes, no groups, no `this`**", and that the
module sits at 5.12-5.14 until the repartition moves it in front of the classes block.

### 4.1 5.12 Mini Golf (14 lessons, 177 min)

**Module doc** `curriculum/modules/5.12_mini-golf.md`: top-down green, gravity 0 (the default). **The one idea:** input
has three moments (press, hold, let go) and the putt happens on the third; motion is described as which way and how
fast. **Needs** 5.5 complete, including 5.5.12 (`line()`) and 5.5.14 (`dist`, `min`). **Leads to** 5.13.

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.12.1 | `5-12-golf-1-plan-break-mini-golf-into-parts` | plan, AI | Plan: Break Mini Golf into parts | Parts, what to remember, what to build first | close | 5.5.1 | 12 |
| 5.12.2 | `5-12-golf-2-reading-the-pointer-press-hold-let-go` | reading | Reading: The pointer: press, hold, let go | `mouse.x`/`mouse.y`; `mouse.presses()` (first frame), `mouse.pressing()` (every held frame), `mouse.released()` (the frame you let go); keys have the same three, so `kb.released()` exists; click the canvas first; the pointer reads (0, 0) until it moves over the canvas | 4 | 5.1.13, 5.2.9 | 10 |
| 5.12.3 | `5-12-golf-3-lab-an-aim-line` | lab | Lab: An aim line | While held, a line joins ball and pointer, and the pull length shows | 4, 13, 16 | 5.12.2, 5.5.12, 5.5.14 | 12 |
| 5.12.4 | `5-12-golf-4-reading-which-way-and-how-fast` | reading | Reading: Which way, how fast: direction, speed, angleTo() | `.direction` in degrees (0 right, 90 down on screen), `.speed` in pixels a frame, each set without changing the other; `ball.angleTo(mouse.x, mouse.y)`; pulling back means the opposite way (+180); power from `dist()`, capped with `min()` | 5, 16 | 5.1.15, 5.5.14, 5.12.2 | 10 |
| 5.12.5 | `5-12-golf-5-example-pull-back-and-putt` | example | Worked Example: Pull back and putt | Press, hold (line), let go: direction and speed set on `mouse.released()` | 4, 5 | 5.12.3, 5.12.4 | 10 |
| 5.12.6 | `5-12-golf-6-lab-putt-it` | lab | Lab: Putt it | Letting go launches the ball, power from the pull, with a ceiling | 4, 5, 16 | 5.12.5 | 15 |
| 5.12.7 | `5-12-golf-7-reading-rolling-to-a-stop` | reading | Reading: Rolling to a stop: drag, speed, and the edge of the green | Top-down there is no ground to rub, so `.drag` slows the ball; "stopped" means `ball.speed` under a small number, then set the speed to 0; putt only when stopped; `new Walls()` makes four edges in one line (`walls.left` and so on), placed after `new Canvas()` | 8, 2 | 5.2.11, 5.12.4 | 10 |
| 5.12.8 | `5-12-golf-8-lab-slow-stop-count` | lab | Lab: Slow it, stop it, count it | Drag, a stop rule, putts only at rest, strokes | 8 | 5.12.7 | 15 |
| 5.12.9 | `5-12-golf-9-reading-a-hole-you-can-roll-over` | reading | Reading: A hole you can roll over: collider 'none' and overlaps() | A `'none'` sprite blocks nothing and has no gravity; `ball.overlaps(hole)` is true on **every** frame they overlap, so act once (a flag, or move the ball away); a fast ball rolls over, a slow one drops in; strokes against par | 6 | 5.2.16, 5.3.5, 5.3.9 | 8 |
| 5.12.10 | `5-12-golf-10-lab-sink-it-strokes-and-par` | lab | Lab: Sink it: strokes and par | The hole, the slow-ball rule, the result against par in centred words | 6, 10 | 5.12.9, 5.4.14 | 15 |
| 5.12.11 | `5-12-golf-11-debugging-the-ball-that-never-stops` | debugging | Debugging: The ball that never stops | Three planted bugs (below) | 8, 4 | 5.12.8 | 10 |
| 5.12.12 | `5-12-golf-12-playtest-and-reflect` | written, AI | Playtest and reflect: Mini Golf | Section 5 | close | 5.12.1, 5.12.10 | 15 |
| 5.12.13 | `5-12-golf-13-quiz-mini-golf-check` | checkpoint | Check: the Mini Golf game | 5 items, below | 4-8 | 5.12.2-5.12.10 | 10 |
| 5.12.14 | `5-12-golf-14-challenges-make-it-yours` | challenge | Challenges: Make it yours | A second hole from a `buildHole(n)` helper with total par; a sand patch (`'none'` sprite; the ball's `drag` goes up while it overlaps); water that costs a stroke and puts the ball back | 6, 8 | 5.12.2-5.12.10 | 25 |

**5.12.3** (starter: canvas, green background, a ball at rest, nothing else)
- r1 *While held, a line joins the ball and the pointer.* `line(` with the ball's and the pointer's x/y inside
  `if (mouse.pressing())`; either end first; in `draw()` or `drawTop()`; accept `mouseX`/`mouseY` (not taught, never
  required). Refuse a line every frame with no press test.
- r2 *The pull length shows.* `dist(…)` or `ball.distanceTo(mouse.x, mouse.y)` drawn with `text()`, rounded or not.
- Step 3 (no card): a colour and thickness for the line (5.5.12).

**5.12.6** (starter = 5.12.3 reference)
- r1 *Letting go launches the ball.* Inside `if (mouse.released())`, the ball gets `.direction` and `.speed` (either
  order). Accept `vel.x`/`vel.y` from the ball-minus-pointer difference divided by a number, and `presses()` (a fair
  click-to-putt). Refuse `pressing()` (it pushes every frame).
- r2 *Power comes from the pull.* The speed uses `dist(`/`distanceTo(` or the difference, not a fixed number.
- r3 *Power has a ceiling.* `min(…)`, `constrain(…)` or an `if` caps it.
- Step (no card): putt away from the pointer (+180). A putt toward the pointer is a design choice, not an error.

**5.12.8** (starter = 5.12.6 reference plus `new Walls()`)
- r1 *The ball slows by itself.* `ball.drag =` a number above 0; accept `ball.vel.x *= 0.98` and the same for y every
  frame. Refuse `ball.friction` alone (nothing rubs on a top-down green; the note says so).
- r2 *A slow ball counts as stopped.* `ball.speed <` a small number above 0, then the speed set to 0 or a flag set; accept
  `abs(ball.vel.x) < n && abs(ball.vel.y) < n`. Refuse `=== 0` (with drag it is never exactly 0).
- r3 *A putt only from rest.* The launch sits inside the stopped test, or `&& stopped`.
- r4 *One stroke per putt.* `strokes += 1` (or `++`) in the launch branch. Refuse it inside `pressing()`.

**5.12.10** (starter = 5.12.8 reference)
- r1 *The ball can roll over the hole.* `hole.collider = 'none'`. Refuse a static hole (the ball bounces off it).
- r2 *The ball drops in only when slow.* `ball.overlaps(hole)` (or `dist(…) <` a radius) together with a speed test;
  nested ifs or a helper. Refuse overlap alone (a hard putt drops in at full speed; the note says why).
- r3 *Sinking happens once.* A flag, a moved or deleted ball, or play stops, so the check cannot fire every frame.
- r4 *The result compares strokes with par in words.* Any if/else wording, or `strokes - par` shown.

**5.12.11** plants: `drag` set on the hole instead of the ball; `strokes += 1` inside `mouse.pressing()`; the stop test
`ball.speed === 0`. Cards r1-r3, one per bug, with 5.12.8's accept lists.

**5.12.13 Check items:** which of presses / pressing / released is true once when you let go; which way is direction 90
on screen; what `.drag` does; what happens if `score += 1` sits under `overlaps()` with nothing else; par 3, strokes 4:
over or under.

### 4.2 5.13 Cannon (13 lessons, 167 min)

**Module doc** `curriculum/modules/5.13_cannon.md`: a barrel at the bottom left, gravity on, crates on a shelf at the
right, ten shots. **The one idea:** a projectile is a sprite you make on demand, and every sprite you make needs a way
out, from the screen and from the list. **Needs** 5.12 (pointer, direction and speed), 5.4.5-5.4.6 (the backwards splice
loop), 5.3.15 (`.life`). No trigonometry: the barrel is a bar that turns about its middle and is `collider = 'none'`, and
shots start at its centre.

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.13.1 | `5-13-cannon-1-plan-break-cannon-into-parts` | plan, AI | Plan: Break Cannon into parts | Parts, what to remember, first build | close | 5.12.1 | 12 |
| 5.13.2 | `5-13-cannon-2-reading-a-barrel-that-faces-the-pointer` | reading | Reading: A barrel that faces the pointer | `barrel.rotation = barrel.angleTo(mouse.x, mouse.y)` every frame; `rotateTo(angle, 4)` turns at most 4 degrees a frame; up on screen is -90, so `constrain(angle, -170, -10)` keeps the barrel out of the ground | 4, 5, 10 | 5.1.10, 5.12.4, 5.4.14 | 8 |
| 5.13.3 | `5-13-cannon-3-lab-aim-the-barrel` | lab | Lab: Aim the barrel | The barrel follows the pointer, within limits | 4, 5 | 5.13.2 | 12 |
| 5.13.4 | `5-13-cannon-4-reading-firing-a-new-sprite-on-a-click` | reading | Reading: Firing: a new sprite on a click, kept in a list | On `mouse.presses()`, make a shot at the barrel, set `direction` and `speed`, push it; gravity bends it into an arc; two ways out: off the screen (the 5.4.6 loop) or `.life`; a sprite that `.life` deleted is still in the list (`s.removed` is true), so the same loop splices it | 1, 12 | 5.12.2, 5.12.4, 5.4.5, 5.4.6, 5.3.15 | 10 |
| 5.13.5 | `5-13-cannon-5-plan-the-shot-list-in-plain-words` | plan, AI | Plan: The shot list in plain words | Pseudocode before the hard step | 1 | 5.13.4 | 10 |
| 5.13.6 | `5-13-cannon-6-example-click-fire-clean-up` | example | Worked Example: Click, fire, clean up | One shot per click, a `shots` array, `.life = 150`, one backwards sweep | 1, 12 | 5.13.4 | 10 |
| 5.13.7 | `5-13-cannon-7-lab-fire` | lab | Lab: Fire! | Click fires along the barrel; spent shots leave screen and list | 1 | 5.13.6 | 15 |
| 5.13.8 | `5-13-cannon-8-reading-hits-and-a-hit-budget` | reading | Reading: Hits, a hit budget, and running out | Crates (texture `'crate'`) with their own `hits = 2` (a safe name; never `life`, 5.3.8); every shot against every crate; on a hit the shot is deleted at once, so it counts once with no memory (unlike 5.3.5), then `break` (2.4.27); a crate at 0 leaves screen and list; ten shots; win at no crates, lose at no shots and none flying | 1, 7 | 5.3.8, 5.4.16, 2.4.27, 5.13.4 | 10 |
| 5.13.9 | `5-13-cannon-9-lab-knock-them-down` | lab | Lab: Knock them down | The hit loop | 1 | 5.13.8 | 15 |
| 5.13.10 | `5-13-cannon-10-lab-ten-shots-win-or-lose` | lab | Lab: Ten shots, win or lose | Shot budget, win and lose checks, R restart | 1 | 5.13.8, 5.3.10 | 15 |
| 5.13.11 | `5-13-cannon-11-playtest-and-reflect` | written, AI | Playtest and reflect: Cannon | Section 5 | close | 5.13.1, 5.13.10 | 15 |
| 5.13.12 | `5-13-cannon-12-quiz-cannon-check` | checkpoint | Check: the Cannon game | 5 items, below | 1, 5, 12 | 5.13.2-5.13.10 | 10 |
| 5.13.13 | `5-13-cannon-13-challenges-make-it-yours` | challenge | Challenges: Make it yours | A reload pause with `after()`; wind from a random number, applied to every shot each frame with `applyForce`; a stone crate needing 3 hits with a higher `mass` | 9, 11 | 5.13.2-5.13.10, 5.3.18, 5.4.12 | 25 |

**5.13.3** (starter: ground, a base, a barrel with `collider = 'none'`, gravity on)
- r1 *Each frame the barrel turns toward the pointer.* `rotation =` from `angleTo(…)`, or `rotateTo(…)`; accept
  `angleTo(mouse)`. Refuse turning only on a click.
- r2 *The barrel cannot point into the ground.* `constrain(…)`, `min`/`max`, or an `if` that clamps.

**5.13.7** (starter = 5.13.3 reference plus `let shots = [];`)
- r1 *A click makes one shot and keeps it.* `new Sprite(` and `shots.push(` inside `if (mouse.presses())` (or
  `released()`), or in a `fire()` helper called there; accept `pressing()` gated by a beat (an honest auto-fire). Refuse
  a shot made every frame.
- r2 *The shot leaves the way the barrel points.* `direction` from the barrel's rotation (or `angleTo`) and a `speed`;
  accept `vel` from the pointer difference.
- r3 *Spent shots leave the screen and the list.* A backwards loop with `delete()` and `splice(i, 1)` on an off-screen
  test or on `.removed`; accept a forward loop with `i--`, either order of the two calls. Refuse `delete()` without a
  splice, or a splice without a delete.

**5.13.9** (starter = 5.13.7 reference plus three crates in `crates`, each `hits = 2`)
- r1 *A hit takes one from that crate's own count.* Inside a loop over crates, `c.hits -= 1` under any safe name. Refuse
  `c.life -= 1` (it deletes the crate next frame; the note cites 5.3.8).
- r2 *A hit counts once.* The shot is deleted and spliced in the same branch; accept `break` or a `hit` flag.
- r3 *A spent crate leaves the screen and the list.*

**5.13.10** (starter = 5.13.9 reference)
- r1 *The shot count goes down and stops fire at 0.* Accept a guard around the fire or a `return` in `fire()`.
- r2 *Win when every crate is gone.* `crates.length === 0` (or `< 1`, or a count).
- r3 *Lose when out of shots with none flying.* `shotsLeft === 0 && shots.length === 0`, or a state flag set from it.
- r4 *R puts the round back.* Crates rebuilt (a `makeCrates()` helper), shots deleted and emptied, the count reset.

**5.13.5 Plan rubric** (lenient, 4 items): says what a click does; says where shots are kept; names the ways a shot
leaves; gives any reason for going through the list backwards. **5.13.12 Check items:** why the clean-up loop runs
backwards; what is left in the list after `.life` deletes a shot; what `crate.life -= 1` does; why a deleted shot needs
no memory to count once; what `rotateTo(angle, 4)` does in one frame.

### 4.3 5.14 Jumper (14 lessons, 178 min)

**Module doc** `curriculum/modules/5.14_jumper.md`: one screen, no camera; gravity on; a box player with pixel art; static
platforms in an array; coins; a door; a ghost. **The one idea:** standing is a question about the feet, not about
touching; and a follower is a direction worked out again every frame. **Needs** 5.12 (pass-through, direction and speed,
`kb.released`), 5.4.14 (`constrain`), 5.4.16 (`.texture`), 5.4.12 (`after`), 5.3.18 (`rotationLock`). Independent of 5.13.

| # | Folder id | Type | Title | The one idea | Rows | Needs | Min |
|---|---|---|---|---|---|---|---|
| 5.14.1 | `5-14-jumper-1-plan-break-jumper-into-parts` | plan, AI | Plan: Break Jumper into parts | Parts, what to remember, first build | close | 5.12.1 | 12 |
| 5.14.2 | `5-14-jumper-2-reading-platforms-and-a-player-that-stands` | reading | Reading: Platforms, and a player that stays upright | Static platforms kept in an array (from a list of `{x, y, w}` objects with a loop); a box player with `rotationLock = true` and `texture = 'player'`; walking with `vel.x` and the else-to-zero rule; `constrain(player.x, …)` at the sides | 2, 11, 14, 10 | 5.1.17, 3.5.9, 5.3.18, 5.4.14, 5.4.16 | 8 |
| 5.14.3 | `5-14-jumper-3-example-a-level-of-platforms` | example | Worked Example: A level of platforms | Four platforms from data in one loop; the player walks and does not tip | 2 | 5.14.2 | 10 |
| 5.14.4 | `5-14-jumper-4-lab-build-the-level` | lab | Lab: Build the level | Platforms, an upright player, sides that hold | 2, 10, 11 | 5.14.3 | 15 |
| 5.14.5 | `5-14-jumper-5-reading-feet-when-can-you-jump` | reading | Reading: Feet: when can the player jump? | 5.2.9's `colliding(ground)` is also true against a wall or a platform's underside, so the player climbs walls; a foot sensor `feet = player.addSensor(0, h/2 + 2, w - 4, 4)` (below the sprite in screen mode) asked `feet.overlaps(p)` for every platform; `grounded` starts false each frame; jump on `kb.presses` only when grounded | 2 | 5.2.9, 5.2.10, 3.3.5 | 10 |
| 5.14.6 | `5-14-jumper-6-lab-jump-from-your-feet` | lab | Lab: Jump from your feet | Sensor, grounded flag from a loop, gated jump | 2 | 5.14.5 | 15 |
| 5.14.7 | `5-14-jumper-7-reading-coins-and-a-door` | reading | Reading: Coins you walk through, and a door | Coins (texture `'coin'`, `'none'`) in an array; `overlaps()` is true every frame, so delete and splice in the same branch; a door ends the level once the coins are gone; falling below the screen ends the round | 6 | 5.12.9, 5.4.5 | 8 |
| 5.14.8 | `5-14-jumper-8-lab-coins-and-a-door` | lab | Lab: Coins and a door | Take each coin once, count it, finish at the door, lose in the pit | 6 | 5.14.7 | 15 |
| 5.14.9 | `5-14-jumper-9-reading-an-enemy-that-follows` | reading | Reading: An enemy that follows you | A ghost (texture `'ghost'`, `'none'` so it floats through platforms) sets `direction = angleTo(player)` and a `speed` below the player's walk speed every frame, so it is fair; `moveTowards(player, 0.02)` also exists but slows as it closes in; touching ends the round; `after()` gives a head start | 3 | 5.12.4, 5.12.9, 5.4.12 | 10 |
| 5.14.10 | `5-14-jumper-10-lab-the-ghost` | lab | Lab: The ghost | Chase, slower than you, lose on touch | 3 | 5.14.9 | 15 |
| 5.14.11 | `5-14-jumper-11-debugging-the-jump-that-works-in-the-air` | debugging | Debugging: The jump that works in the air | Two planted bugs (below) | 2 | 5.14.6 | 10 |
| 5.14.12 | `5-14-jumper-12-playtest-and-reflect` | written, AI | Playtest and reflect: Jumper | Section 5 | close | 5.14.1, 5.14.10 | 15 |
| 5.14.13 | `5-14-jumper-13-quiz-jumper-check` | checkpoint | Check: the Jumper game | 5 items, below | 2, 3, 6 | 5.14.2-5.14.10 | 10 |
| 5.14.14 | `5-14-jumper-14-challenges-make-it-yours` | challenge | Challenges: Make it yours | A short hop: let go early and the jump is cut (`kb.released`, 5.12.2); a moving platform (kinematic, `vel.x` flipped by `every()`); a second ghost after 600 frames with `after()` | 2, 3, 9 | 5.14.2-5.14.10, 5.12.2 | 25 |

**5.14.4** (starter: canvas, gravity, a floor, a player box that walks with else-to-zero)
- r1 *At least three static platforms, kept in an array.* `new Sprite(…, 'static')` pushed into an array, by hand or
  from a data loop; accept `.collider = 'static'`. Refuse dynamic platforms (they fall).
- r2 *The player stays upright.* `player.rotationLock = true`; accept `player.rotation = 0` every frame.
- r3 *The player cannot leave the sides.* `constrain(player.x, …)`, an `if` pair, or `new Walls()` (5.12.7).

**5.14.6** (starter = 5.14.4 reference with a jump gated by `colliding(floor)`, so the wall climb is visible)
- r1 *The player has feet.* `player.addSensor(0, n, …)` with n above 0; accept a `'none'` sprite moved under the
  player every frame. Refuse a sensor above the player (n below 0; that is 5.14.11's bug).
- r2 *Standing is worked out from the feet each frame.* A loop over platforms with `feet.overlaps(p)` setting a flag that
  starts false each frame, or a helper that returns true or false.
- r3 *Jump only when standing.* `kb.presses(…)` and the flag; accept nested ifs and `kb.pressing` with the flag.

**5.14.8** (starter = 5.14.6 reference plus a coins array of `'none'` sprites and a door)
- r1 *Each coin is taken once.* `overlaps(c)` (or `dist`) then `delete()` and `splice` in the same branch. Refuse a score
  with no delete (it counts every frame).
- r2 *The score counts coins.* `score += 1` in that branch.
- r3 *The door finishes the level.* `overlaps(door)` sets a finished flag; accept "only once the coins are gone".
- r4 *The pit ends the round.* `player.y >` a number near the bottom (or `height`) sets `playing = false`.

**5.14.10** (starter = 5.14.8 reference plus a ghost in a far corner)
- r1 *Every frame the ghost heads for the player.* `direction` from `angleTo(player)` and a `speed`; accept
  `moveTowards(player, …)` and `vel` set by comparing x and y. Refuse a direction set once in `setup()`.
- r2 *The ghost is slower than the player.* Its speed is below the walk speed (the AI judges against the starter's value).
- r3 *Touching the ghost ends the round.* `overlaps(ghost)` or `dist` sets `playing = false`; accept a lives count.
- Step 4 (no card): `after(180, …)` before the chase starts.

**5.14.11** plants: `grounded` set true in the loop but never set back to false (jumps forever in the air); the sensor's
offset negative (on the head, so bumping a ceiling allows a jump). Cards r1-r2, one per bug.

**5.14.13 Check items:** why `colliding(platform)` lets the player climb walls; where `addSensor(0, 20, 26, 4)` sits on
a 30 by 40 player; what `rotationLock` stops; why the ghost is slower than the player; what goes wrong if a coin's
`overlaps()` adds a point and does not delete the coin.

---

## 5. The closes: plan, playtest and reflect, playtest and polish

All are `type: "assignment"`, `preview: "assignment"`, 0 points, `contentFile: "content.md"`, an `aiGrader` with
`model: "glm-5.3-flash:cloud"` (as every existing close), and each criterion's description copies the very-generous
paragraph of 5.3.11 ("Be very generous ... Only a blank response, or one about something else entirely, is a miss.").
The prompt opens with "Everything you need is in N.N.N (…) and N.N.N (…)" naming the plan and the last lab.

| Close | Copies | Criteria (id: title) |
|---|---|---|
| 5.12.1, 5.13.1, 5.14.1 Plan | 5.5.1 | parts: four or more parts named; remember: what the game remembers between frames; first: a first thing to build and why; unsure: one part they are unsure how to build |
| 5.13.5 Plan: the shot list | 5.10.3's kind | click: what a click does; list: where shots are kept; leave: the ways a shot leaves; backwards: any reason for the backwards loop |
| 5.12.12, 5.13.11, 5.14.12 Playtest and reflect | 5.3.11 / 5.5.9 | played; bug; cause; change (the same four, with this game's examples: a ball that never stops, a shot that never leaves, a jump in the air) |
| 5.3.20, 5.4.19, 5.5.18 **Playtest and polish** | 5.3.11's shape, new questions | played: played at least three rounds, or watched someone else play one; rough: names one thing that felt unfinished or rough; polish: names one change from this polish arc (label, popup, nudge; timer, ceiling, art; grid, fruit, speed) and what it changed for a player; next: one more polish they would add |

The "Playtest and polish" `content.md` says, in our words: a polish pass is not about bugs; it is about whether a new
player understands what is happening without being told. Play three rounds, hand it to someone for one round if you can,
and watch where they hesitate.

---

## 6. Coverage map: basics rows 1-16 to the exact lessons

| Row | Basic | New lessons that teach it | Applied |
|---|---|---|---|
| 1 | Firing projectiles | 5.13.4, 5.13.6, 5.13.7 (fire, keep, reap); 5.13.8-5.13.10 (hit, destroy, hit budget, out of shots) | 5.13.13 |
| 2 | Platforms, ground sensing | 5.14.2-5.14.4 (platforms), 5.14.5-5.14.6 (feet, grounded jump), 5.12.7 (`new Walls()`) | 5.14.11, 5.14.14 |
| 3 | Chasing enemy | 5.14.9, 5.14.10 | 5.14.14 (second ghost) |
| 4 | Mouse input and aiming | 5.12.2, 5.12.3, 5.12.5; 5.13.2 (aim at the pointer) | 5.12.6, 5.13.3, 5.13.7 |
| 5 | Direction and speed | 5.12.4-5.12.6; `rotateTo` 5.13.2 | 5.13.7, 5.14.10 |
| 6 | Pass-through target (+ strokes and par) | 5.12.9, 5.12.10; strokes 5.12.8 | 5.14.7-5.14.8, 5.14.10 |
| 7 | Safe custom field names | already built (5.3.8 s1, 5.5.2); reinforced by 5.13.8/5.13.9 (`hits`, not `life`) | none |
| 8 | Slowing and stopping | 5.12.7, 5.12.8 | 5.12.11 |
| 9 | Timer helpers | 5.4.12, 5.4.13 | 5.4.16-5.4.17, 5.13.13, 5.14.9-5.14.10, 5.14.14 |
| 10 | Centred text, staying on screen | 5.4.14, 5.4.15 | 5.12.10, 5.13.2, 5.14.4 |
| 11 | Physics knobs | 5.3.18, 5.3.19 (`mass`, `debug`) | `gravityScale` 5.4.17; `rotationLock` 5.14.2-5.14.4; `mass` 5.13.13 |
| 12 | Things that expire | 5.3.15, 5.3.16, 5.3.17 | 5.13.4-5.13.7 |
| 13 | Plain shapes | 5.5.12, 5.5.13 | 5.12.3, 5.5.19 |
| 14 | Sprite art | `.texture` 5.4.16, 5.4.17; `.image` 5.5.15, 5.5.16 | 5.13.8, 5.14.2, 5.14.7, 5.14.9 |
| 15 | Saved high score | **none in Chapter 5.** PLACEMENT places saving in 6.5 (6.5.3 reads it first) and decision #13 lists the Chapter 5 basics without it, so it is deferred | 6.5.3 |
| 16 | Math helpers | 5.5.14, 5.5.16; `constrain` 5.4.14 | 5.12.3-5.12.8, 5.13.2 |

Firing has its own story: Cannon's crates are why the shots exist. Mini Golf owns aim, power, drag and the hole, because
a putt needs all four. Jumper owns platforms and the chase, because a platformer is the one game where both make sense.

---

## 7. Placement, numbering, locks and order of play

**Where the new modules sit now.** Module docs `curriculum/modules/5.12_mini-golf.md`, `5.13_cannon.md`,
`5.14_jumper.md` (frontmatter: `id`, `title: Project: Mini Golf` and so on, `quarter: 2`, `weeks`, `environment:
moSHion`, `status: draft`; sections as in `5.5_snake.md`). Groups `curriculum/groups/5.12.json`, `5.13.json`,
`5.14.json` with a `source` line naming the CodeHS project shape and "structure only". Nothing existing moves: the
module list sorts by title number (`lib/lesson-title-order.ts`), so it reads 5.9, 5.10, 5.11, **5.12, 5.13, 5.14**,
6.1.

**At the repartition** the three move in front of the classes block by retitling and citation rewrite only
(`scripts/renumber-module.mjs`; folders keep their ids). Every `scope = 'module'` row keyed `'5.12'`-`'5.14'` in
`class_due_dates`, `class_open_dates` and `class_solution_releases` must move with them (RELEASE-CH5 §6: a renumber
changes what a module `scope_id` means).

**Groups appended to existing modules** (all screens listed, `check-lesson-groups` must pass):
5.3: `polish-labels-and-popups` (15-17), `polish-physics-knobs` (18-19), `polish-close` (20-21).
5.4: `polish-timers` (12-13), `polish-words-and-edges` (14-15), `polish-art` (16-17), `polish-close` (18-20).
5.5: `polish-lines` (12-13), `polish-helpers-and-art` (14-16), `polish-close` (17-19).
5.12: `plan-and-pointer` (1-3), `which-way-how-fast` (4-6), `rolling-to-a-stop` (7-8), `the-hole` (9-11),
`playtest-and-extend` (12-14). 5.13: `plan-and-aim` (1-3), `firing` (4-7), `hits-and-budget` (8-10),
`playtest-and-extend` (11-13). 5.14: `plan-and-platforms` (1-4), `feet` (5-6), `coins-and-door` (7-8),
`the-ghost` (9-11), `playtest-and-extend` (12-14).

**Open-date locks** (class "5 Intro Prog 2627": 5.2-5.11 locked until 2027-07-01; CLAUDE.md: an open date locks,
lesson over module over unit, enforced in the browser).

| What | What happens on deploy | Action |
|---|---|---|
| Appended 5.3/5.4/5.5 screens | If the class's rows are `scope = 'module'` for `'5.3'`, `'5.4'`, `'5.5'`, the new screens inherit the lock at once. If any row is lesson-scoped, the new screens have none and are **open**. | Read-only check first: `SELECT scope, scope_id, open_at FROM class_open_dates WHERE class_id = '<id>' AND (scope_id LIKE '5%' OR scope = 'unit');` |
| New modules 5.12-5.14 | No row exists: **unlocked on production** the moment they deploy (unless a unit-scope row covers them; confirm the unit key in that query). | Add module rows `'5.12'`, `'5.13'`, `'5.14'` with the same 2027-07-01 date in the Schedule tab **before** the deploy, or keep them off `release-ch5` until then. |
| Due dates | Appended screens inherit module due dates (advisory). New modules have none. | None. All 0 points; no gradebook change. |
| Solution releases | No row means not released, which is right for 0-point labs. | None. |

**Recommended order of play** (what open dates should enforce now, and what the numbering will say after the
repartition): 5.1, 5.2, **5.3** (build 1-14, polish 15-21), **5.4** (1-11, 12-20), **5.5** (1-11, 12-19), **5.12 Mini
Golf**, **5.13 Cannon**, **5.14 Jumper**, then classes 5.6-5.8 and Defender 5.9-5.11, then 6.1. Mini Golf needs
Snake's `line()` and `dist`/`min`; Cannon needs Mini Golf's pointer and direction plus Flappy's splice loop and
Pinball's `.life`; Jumper needs Mini Golf's pass-through and the 5.3/5.4 knobs, art and timers. Cannon and Jumper do not
depend on each other, so a short year can drop either one.

**`week` fields.** Appended screens copy their module's (5.3: 11; 5.4 and 5.5: 12). New modules: owner question 4.

---

## 8. Build order: ten batches and an integration round

One batch is one builder round: build, run the gates, lens-loop with the three cs-student agents, fix. Every batch
touches only: its new `lessons/<id>/` folders (`lesson.json`; `content.md` for readings, plans, closes and quizzes;
`script.js` + `solution.js` for labs, examples, debugging and challenges), the module's
`curriculum/groups/5.x.json`, the module doc's lesson count and notes in `curriculum/modules/5.x_*.md`, and one block per
lab in `scripts/test-grader-tolerance.mjs`. Generated files (`public/lessons-manifest.json`,
`public/lesson-requirements.json`, `functions/_shared/ai-graders.generated.ts`,
`functions/_shared/module-docs.generated.ts`) are regenerated at the end of the batch and committed separately, as in
`d61eeef4`. **What shifts: nothing.** No existing title, number, Help pointer, folder or D1 key changes in any batch.

| Batch | Lessons | Count | Depends on | Extra files |
|---|---|---|---|---|
| B1 | 5.3.15-5.3.21 (Pinball polish) | 7 | none | `5.3.json`, `5.3_pinball.md` |
| B2 | 5.4.12-5.4.17 (timers, edges, art) | 6 | B1 (5.3.18 cited by 5.4.16) | `5.4.json`, `5.4_flappy.md` |
| B3 | 5.4.18-5.4.20, 5.5.12-5.5.14 | 6 | B2 | `5.4.json`, `5.5.json`, both module docs |
| B4 | 5.5.15-5.5.19, 5.12.1 | 6 | B3 | `5.5.json`; new `5.12.json`, `5.12_mini-golf.md`; 5.5 doc's "ready for" line names 5.12 |
| B5 | 5.12.2-5.12.7 | 6 | B4 | `5.12.json` |
| B6 | 5.12.8-5.12.14 | 7 | B5 | `5.12.json` |
| B7 | 5.13.1-5.13.6 | 6 | B6, B1, B2 | new `5.13.json`, `5.13_cannon.md` |
| B8 | 5.13.7-5.13.13 | 7 | B7 | `5.13.json` |
| B9 | 5.14.1-5.14.7 | 7 | B6, B1, B2 (not B7-B8) | new `5.14.json`, `5.14_jumper.md` |
| B10 | 5.14.8-5.14.14 | 7 | B9 | `5.14.json` |
| B11 | none (integration) | 0 | all | gates and lens loop below; the open-date query; `release-ch5` decision |

B9-B10 can run beside B7-B8 with two builders. Gates every batch: `check-lesson-numbers`, `check-lesson-groups`,
`check-prompt-pointers`, `check-lesson-citations`, `check-help-pointer-titles`, `check-starters` (reference full,
starter not), `check-solution-leak`, `test-grader-tolerance`, and the moSHion harness running every reference 600 frames
with no input and with the scripted input the lab expects (a run error locks Submit). Stop the dev server before
`npm test` (memory note).

**Each unit also ends with a "build your own" capstone**, one lesson, 0 points, checked only against its own unit:
5.7 after Pocket, 6.14 after Climb, 7.7 after Defender. They ship inside the unit's last batch and are specified in
`BUILD-YOUR-OWN.md`; 8.1 stays the graded, eleven-item synthesis.

---

## 9. Risks

### 9.1 Taught-before-asked traps

| Name or habit | Trap | Where it is handled |
|---|---|---|
| `angleTo(mouse)` | Until the pointer has entered the canvas the engine returns NaN for a `mouse` target, and `rotation = NaN` follows. | 5.12.4 and 5.13.2 teach `angleTo(mouse.x, mouse.y)`; builder measures the NaN case in the harness |
| `new Sprite(x, y, d, 'none')` | The 4th argument is read as a height, so this is not a circle with a type. | Every screen sets `.collider = 'none'` on its own line (5.2.16's shape) |
| `overlaps()` | Level in moSHion (true every frame), unlike p5play's once. | 5.12.9 says it; 5.14.7 repeats it; cards refuse a score with no delete or flag |
| `'none'` sprites | The engine switches their gravity off. | Said in 5.12.9; the ghost and coins rely on it |
| `.life` + arrays | The sprite is deleted, the array keeps it (`.removed` is true). | 5.13.4 teaches the sweep |
| Timer made in `draw()` | One new timer per frame. | 5.4.12 says it; 5.4.13 refuses it |
| `textAlign()` | One argument in moSHion; it stays on. | 5.4.14 teaches the one-argument form and the reset |
| `fill(r, g, b, a)` | moSHion ignores the alpha. | Fades use `.opacity` (5.3.21) |
| `.drag` vs dragging | Same word, two meanings. | Mini Golf says "pull back"; never mentions `mouse.drag`/`dragging()` |
| `new Walls()` | It is a Group inside the engine. | Owner question 1; only `new Walls()` and its four names, never `colliding(walls)` or a loop over it |
| `addSensor` offset | +y is below in screen mode and above in math mode (5.1.26). | 5.14.5 says "screen mode" and gives the exact numbers |
| Trigonometry | `sin`/`cos` with degrees is never taught. | Barrel, putt and chase use `angleTo`, `direction`, `speed` only |
| Untaught names | `mouseX`/`mouseY`, `collides()`, `overlapping()`, `setSpeedAndDirection`, `filter`/`some`, `.scale.x = -1`, `camera`, `storeItem`, `Group`, `allSprites` | References never use them; cards may accept, never require |
| `kb.released()` | 5.4.10 shows it only as a wrong answer. | Taught in 5.12.2 before the 5.14.14 challenge |
| `break` in the hit loop | | Taught at 2.4.27; 5.13.8 cites it |

### 9.2 What the 5.1 round taught (`loop/walk-5.1-*.md`)

1. `content.md` on a moSHion lab is not shown to the student: everything a lab needs goes in `description`, `steps`
   and hints. `content.md` is for readings, examples, plans, closes and quizzes only.
2. A card that only checks that a name is present means nothing: tie the call to its place (inside the hit branch, on
   the popup, inside the release test).
3. Cards that scope to `draw()` refused helper functions; every card here accepts helpers, `update()`, ternaries,
   negative and decimal numbers, and any variable name.
4. 5.1 passed the very bug it taught (a sprite made every frame). Here the matching bugs (a timer, shot or popup made
   every frame) are REJECT cases.
5. A Worked Example sat before the readings it used. Every example here follows its reading.
6. Docs-drawer hints must name the drawer page by its exact title; the drawer opens on Overview.

### 9.3 Other risks

- **Defender overlap.** Cannon teaches firing, a shot list and a nested hit loop before Defender in play order; 5.9.2,
  5.9.5 and 5.10.4 teach their own versions. Until the repartition both stand, and rule 0.3 keeps the wording honest in
  either order (owner question 3).
- **Pacing.** About 844 minutes, nearly two Q2-average weeks (PACING: about 440 a week), in a quarter PACING already
  calls crowded (owner question 4).
- **Production locks.** New modules ship unlocked unless rows are added first (section 7).
- **Texture names** (`'bird'`, `'crate'`, `'coin'`, `'ghost'`, `'door'`, `'player'`) exist in
  `public/moshion/textures/textures.json` today; a builder confirms each one in the harness, and the art is 21 px
  pixel art, so sprites should be sized near it or scaled in the reading's own words.
- **Release branch.** `release-ch5` carries 5.1-5.11. Shipping any of this means cherry-picking onto it with the lock
  rows in place.

---

## 10. Questions for the owner

1. **May Mini Golf teach `new Walls()`?** It is a Group inside the engine, though a student never writes `Group`.
   *Recommended: yes, as a ready-made border, using only `new Walls()` and `walls.left`/`right`/`top`/`bottom`; Jumper
   uses `constrain()` and never needs it.*
2. **Ship 5.12-5.14 to production before the repartition?** *Recommended: yes, but only after module-scope open-date
   rows for `'5.12'`, `'5.13'`, `'5.14'` (2027-07-01, like 5.2-5.11) exist, and after the read-only query shows the
   5.3-5.5 rows are module-scoped, so the appended screens inherit their lock.*
3. **Defender after the new games.** Firing now arrives in Cannon first. *Recommended: change nothing in Defender now.
   At the repartition, keep Defender after the classes as the game that makes the case for classes, and reword 5.9.2,
   5.9.5 and 5.10.4 as short recaps that cite 5.13.*
4. **Pacing and `week` fields for about 14 more hours.** *Recommended: polish arcs keep their module's week; set the
   new games to weeks 13, 13 and 14 now (display only); make all six Challenges screens optional extensions (150 min);
   reflow the weeks once, at the repartition.*
5. **A saved best score in Chapter 5?** PLACEMENT puts saving in 6.5 (6.5.3), so this spec defers it. *Recommended:
   defer; no `storeItem()` in Chapter 5.*

### Answered 2026-11-04: the Defender questions

Asked because Defender Part C is the OOP half of a capstone whose Parts A and B are
procedural, so it looks like it belongs with the classes' own unit and with chapter 6.

**Defender stays at 5.9-5.11, immediately after the classes block. It does not move to
chapter 6, and the capstone is not split.** Reasons, in the order they decide it:

1. **Chapter 6 has no OOP module to move it into.** 6.1-6.11 are groups, collisions,
   physics, camera, saves, state machines, input, joints, grids, Breakout and sound. The
   object block is 5.6-5.8, and 5.11's own post-requisite is "ready for 6.1, where a
   `Group` does the list-keeping". Moving C past 6.1 would mean rewriting it to use groups,
   not moving it.
2. **Parts A and B are not OOP** (verified: no `class`, `this.` or `Group` in any `5-9-*`
   or `5-10-*` file), so moving "Defender" moves a procedural game into the OOP unit. Move
   only C and you split one capstone across two units; C's starter is B's final.
3. **The refactor is the lesson.** Part C is "your own working game, cleaned up with
   classes, same numbers, same behaviour". That argument needs the student's own A and B
   directly behind it, which is where they already are.

The only place this is genuinely open is the **unit-level repartition** (unit 5 functional
/ unit 6 OOP use / unit 7 writing classes), which is not started. If that ever makes an
"OOP use" unit, Defender's three parts are decided together there, by title and citation,
not by a one-module move now.

**Owner question 3 (firing arrives first in Cannon): change nothing in Defender now.**
Checked, not assumed: 5.9.2, 5.9.5 and 5.10.4 carry no "this is the first time" claim and
each teaches its own shape while citing 5.3.5 and 5.4.5, so a student who met Cannon first
reads them as repetition, never as a lie. The "recap that cites 5.13" rewrite is therefore
optional polish at the repartition, to be done only if a lens walk says the repetition
reads as wasted time. It must not be done before 5.13 exists, because a Help pointer may
only cite a built lesson.

**`GAMES-FOR-BASICS` question 5 (retitle Part C's prerequisite for the gap, or move the
Part B reflection forward): moot under this plan.** The gap only opens if Defender A/B move
in front of the classes (Option A or C there), which they do not. Keep it dormant: if that
option is ever revived, retitle C's prerequisite to "after 5.8 Inside a Class, your Part B
game" and **leave the Part B reflection where it is**, because it reflects on code the
student wrote just before it.
