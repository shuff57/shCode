# Breakout spec (module 6.10)

Written 2026-11-01 on branch `codehs-inspiration`, together with the lessons it describes (they exist: `lessons/6-10-breakout-*`).
Built the way 6.9 was (`GRIDS-SPEC.md`), with the 6.9 review rounds' grader lessons applied up front: strings blanked
(`ignoreStrings: true`) and comments stripped on every code card, parentheses, spacing and brace placement tolerated, every
honest shape the course models accepted (`for`/`while`/`for...of`, `if`/`else`/ternary/`switch`, aliases, `=== `/`==`, either
quote), and help pointers that name a lesson which really shows the thing. Every script ran in the course's headless harness
(`scripts/moshion-harness.mjs`) and the finished game in a real Chromium (section 9). Every pattern was graded by the app's own
`lib/grader.ts` (section 7). The code blocks below are pasted from the generator's sources, not retyped.

**Placement.** PLACEMENT.md decision 7 (2026-10-31): Breakout is added in Chapter 6, after the grids module, because the bricks
are a grid. The student has finished Units 1-5 and 6.1-6.9. The module doc and title prefix say `6.10.N`; folder names
(`6-10-breakout-<n>-<slug>`) are the D1 ids and are final once shipped. **`week: 18`** in every `lesson.json` and `weeks: [18]`
in the module doc (section 12, risk 1, says why 18 and not 17).

**Size.** 13 lessons, 207 minutes by `estimateMins`: 2 readings, 1 worked example, 6 labs, 1 plan (AI), 1 playtest (AI),
1 check, 1 challenges. The brief asked for about 10-12; the thirteenth is the second reading (6.10.7, the ball's edges),
which sits right before the lab that needs it, as 6.9's readings do.

---

## 1. What the student builds, and why this shape

One program, built up over six labs into a finished Breakout on a 400 x 400 canvas: a white paddle 80 x 12 at y 370 steered by
the mouse or the arrow keys; a white ball 12 across (`R = 6`) moved by two speed variables; three walls (left, right, top) and
an open bottom; a wall of 36 bricks read from five rows of text (`WALL`), 50 x 20 each, starting 60 down, one colour per row;
`hitAt(x, y)` from 6.9.11 asked about the ball's four edge points; three lives; a title screen where 1 picks the mouse and 2 the
keys; R after a win or a loss goes back to the title.

| Choice | Reason |
| --- | --- |
| The ball is moved by code (`collider = 'none'`, `vx`/`vy`), not physics | A physics bounce (5.2.11) loses speed and gains spin, and the bricks are `rect`s, not bodies, so a physics ball would have nothing to hit. Defender (5.9.5) already moved shots and a drone this way, so it is a known shape. |
| A bounce is `v = -v` | The whole collision model is two sign flips; it makes "which edge hit decides which speed flips" (6.10.7) one sentence. |
| Walls tested at `R`, not 0 | A sprite's x is its centre (5.1.6). This is the same idea as the edge test, met first on the canvas walls (6.10.5), then on bricks. |
| Paddle bounce only while `vy > 0` | `overlaps()` is true on every frame they touch (5.9.5); a paddle sliding into the ball from the side would otherwise flip it every frame. |
| The paddle steers: `vx = (ball.x - paddle.x) / 10` | Without it `vx` is only ever +/-3 and the player cannot aim: where the ball goes next is fixed before it lands. It is about play, not reachability (checked: an autopilot with the line deleted still clears the wall, in about 4,100 frames). The subtraction is 6.8.8's "vector from A to B". |
| The wall is read from text (`WALL`, `#` and `.`) | Joins 6.9's two halves: a map written as rows of text (6.9.2, 6.9.5) and a grid you change (6.9.9-6.9.11). It also makes the challenges (two-hit bricks, a second wall) a change of letters. |
| `hitAt` is given, not rewritten | The student wrote it in 6.9.11; 6.10.6 is the hand-off 6.9.11's hint promised ("the function a Breakout ball will call"). The new work is asking it about the right pixels. |
| Centre test first (6.10.6), edges after a reading (6.10.7-6.10.8) | The student plays the centre version and sees the ball sink into bricks and scrape past corners before the reading names why. GRIDS-SPEC risk 10 flagged exactly this. |
| `state` strings (`'title'`, `'play'`, `'won'`, `'lost'`) | The state variable of 6.6.7 and the key-driven transitions of 6.6.16. 6.9 used a `won` flag; here a title screen needs a real state. |
| Game mode = how to steer (1 mouse, 2 keys) | PLACEMENT decision 5: a game-mode pick is a key-press title screen. The choice really changes play, and it reuses the `control` variable the paddle lab already has. A difficulty mode is challenge 1 (key 3, one ball). |
| `prompt()` as a note, accepted by the grader | Decision 5 also put `allow-modals` on the sketch iframe so a student's own `prompt()` works. The lab explains it (string answer, freezes the game) and the card accepts a prompt-based `pickMode()`; the reference uses keys. |

**Kept out on purpose:** physics bounciness, `Walls`, sprites for bricks, `Tiles` (the wall is `rect`s from data, as in 6.9.11),
angles/trigonometry, speed-up per hit (offered as "an idea of your own" in the challenges), sound, `camera`.

---

## 2. What the student already knows, and what this module adds

### Assumed from before 6.10 (taught on the screen named)

| Idea | Taught in |
| --- | --- |
| A sprite's x, y is its centre; y grows downward; positive `vel.y` is down | 5.1.6 Reading: Sprite: new Sprite(x, y, w, h) + .color; 5.1.16 Reading: Velocity: vel.x and vel.y |
| `kb.pressing('left')` held keys; `kb.presses(key)` one press | 5.1.13 Reading: kb.pressing(key); 6.3.3 Reading: moSHion docs: Input edges |
| A sprite moved by hand with `collider = 'none'`; a `'static'` ship moved by code; `overlaps()` is true on every frame they touch | 5.9.5 Reading: Did the shot hit? |
| `mouse.x` | 6.7.3 Reading: moSHion docs: mouse.x and mouse.y |
| `dx = b.x - a.x` points from A to B | 6.8.8 Reading: Vector from A to B |
| The `state` variable; a title screen; key-driven and condition-driven transitions | 6.6.7 Reading: moSHion docs: The state Variable; 6.6.11 Worked Example: Title Screen with Start Button; 6.6.16 Worked Example: Keyboard-Driven State Changes; 6.6.17 Reading: moSHion docs: Condition-Driven Transitions |
| A map as rows of text; reading `map[r][c]` | 6.9.2 Reading: A map is rows of text; 6.9.5 Reading: Reading a map as data |
| Build, draw (`rect` is top-left), click-to-cell with an offset, bounds, count | 6.9.9 Reading: A grid is data; 6.9.10 Lab: Light the grid; 6.9.11 Lab: A wall of bricks |
| `hitAt(x, y)` and `bricksLeft()` for the brick wall | 6.9.11 Lab: A wall of bricks |
| `&&` stops at the first false part | 6.9.9 (the `||` twin is said in 6.10.7) |
| `prompt()` gives back typed text, turned into a number with `Number(prompt(...))` | 3.1.9 Lab: Terms and Conditions Loop |
| Words in `drawTop()`; R restarts | 5.4.5 Reading: A world that scrolls; 5.4.8 Lab: Crash, and start again |

No citation reaches into chapters 1-2, so `check-lesson-citations.mjs` needed no new `WAIVED` entry.

### New in this module (taught on the screen named, before any lab asks for it)

| New idea | Taught in | First asked in |
| --- | --- | --- |
| A speed held in `vx`/`vy`, a step is `x += vx`, a bounce is `vx = -vx` | 6.10.2, 6.10.3 | 6.10.5 |
| The ball touches a wall at `R`, not 0 | 6.10.2, 6.10.3 (Try 3) | 6.10.5 |
| A paddle steered by the mouse or keys and kept on screen by its half-width | 6.10.2, 6.10.3 | 6.10.4 |
| Bounce off the paddle only while `vy > 0` | 6.10.2 | 6.10.5 |
| Steering: `vx = (ball.x - paddle.x) / 10` | 6.10.2, 6.10.3 (Try 1, 2, 4) | 6.10.5 |
| A wall read from text into `bricks[r][c]` | 6.10.6 step 1 (6.9.5 + 6.9.10 joined) | 6.10.6 |
| Centre test sinks in and misses a scraped brick; the four edge points; top/bottom flip `vy`, sides flip `vx`; `||` stops at the first true | 6.10.7 | 6.10.8 |
| Lives, `'won'`/`'lost'`, `checkEnd()` | 6.10.9 step text (6.6.7, 6.6.17, 6.9.11) | 6.10.9 |
| A digit key is `kb.presses('1')`; a mode chosen on the title; `prompt()` returns a string and freezes the game | 6.10.10 step 2 | 6.10.10 |

---

## 3. Conventions every lesson follows

- **Folders** `6-10-breakout-<n>-<slug>`; **titles** start with the displayed number.
- **lesson.json fields** as 6.9: `category: "Unit 2: moSHion: Applied Game Development"`, `unit: "6.10 Breakout"`, `week: 18`,
  `slos: ["SLO-3", "SLO-4"]`. Readings `type "lesson", preview "reading"`; the worked example `preview "example"` with a `js live`
  block; labs and challenges `preview "moshion"` with `script.js` + `solution.js`, `steps`, `requirements` (all `points: 0`);
  the quiz `type "assignment", preview "quiz"`, `passPercent 70`; plan and playtest `type "assignment", preview "assignment"`,
  `points 0`, `aiGrader` with `model "glm-5.3-flash:cloud"` and the lenient tails of 6.9.1/6.9.12 with "Breakout" in them.
- **content.md is not rendered in a moshion lab**, so each lab's `description`, step `instructions` and `hints` carry
  everything, including the prompt() note (6.10.10 step 2) and the three challenges (6.10.13 step 1).
- **Requirement cards**: `id`, `title`, `description` ending in `Help: <number> (<exact title>)` or `Help: this lab's step 2`,
  `type` (`inFunction` with `function`, or `regex`), `file "script.js"`, `pattern`, `flags ""`, `ignoreStrings: true`,
  `points 0`, `status "pending"`. The one exception is 6.10.13 r2 (the sentence), copied from 6.9.14 r2: `flags "i"`,
  `stripComments: false`, no `ignoreStrings` (it reads the comment).
- **Strings are blanked**, so a quoted word is matched by its length: `'title'`/`'mouse'` 5 spaces, `'play'`/`'lost'`/`'keys'` 4,
  `'won'` 3, a key name 1.
- **Starter comments carry no answers and no `if`/`would`/`without`/`instead`/`otherwise`/`remov...` words** (6.10.13 r2 reads
  every comment; 6.9.14 had to reword "If a brick is there" for the same reason). `hitAt`'s comment says "when a brick is at".
- **Fixed names, shared by every lab:**

| Kind | Names |
| --- | --- |
| Constants | `WALL` (5 strings of 8: `#` brick, `.` gap), `BRICK_ROWS = WALL.length`, `BRICK_COLS = WALL[0].length`, `BW = 50`, `BH = 20`, `TOP = 60`, `ROW_COLORS` (crimson, orange, gold, limegreen, deepskyblue), `R = 6`, `PADDLE_W = 80` |
| Sprites | `paddle` (`new Sprite(200, 370, PADDLE_W, 12, 'static')`, white), `ball` (`new Sprite(200, 300, R * 2)`, `collider = 'none'`, white) |
| Variables | `control` (`'mouse'`/`'keys'`), `vx`, `vy`, `bricks` (`bricks[r][c]` 1 or 0), `score`, `lives`, `state` (`'title'`/`'play'`/`'won'`/`'lost'`) |
| Functions | `setup()`, `startGame()`, `serve()` (ball to 200, 300, `vx = 3`, `vy = -4`), `draw()`, `movePaddle()`, `moveBall()`, `makeBricks()`, `drawBricks()`, `hitAt(x, y)`, `hitBricks()`, `bricksLeft()`, `checkEnd()`, `pickMode()`, `drawTop()` |
| Challenges | `WALLS`, `wallNum` (challenge 3); `'2'` in a wall (challenge 2); key `'3'` (challenge 1) |

---

## 4. The lessons

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 6.10.1 | `6-10-breakout-1-plan-break-breakout-into-parts` | plan (AI) | Before any code: list the parts of Breakout, what the game must remember between frames, what to build first and what looks hard. AI-graded with hints. | 0 | 12 |
| 6.10.2 | `6-10-breakout-2-reading-a-ball-you-move-yourself` | reading | The ball is moved by your code: two speeds, vx and vy, and a bounce is a flipped sign. The walls are R away from the centre, the paddle follows the mouse or the keys, and where the ball lands on the paddle steers it. | 0 | 10 |
| 6.10.3 | `6-10-breakout-3-example-a-ball-in-a-box` | example | A ball that bounces off three walls and a paddle that follows the mouse. Catch it on different parts of the paddle, take the steering away, and move the walls to see what each line controls. | 0 | 10 |
| 6.10.4 | `6-10-breakout-4-lab-the-paddle` | lab | A paddle along the bottom that follows the mouse, or the arrow keys, and never leaves the screen. The canvas and the paddle are made for you. | 0 | 15 |
| 6.10.5 | `6-10-breakout-5-lab-bounce` | lab | The ball moves by two speeds you control. Bounce it off three walls and the paddle, let the paddle steer it, and serve it again when it falls out. | 0 | 20 |
| 6.10.6 | `6-10-breakout-6-lab-a-wall-from-text` | lab | The wall comes back from 6.9.11, written as rows of text this time. Build it from the text, draw it from the data, and let the ball's centre break bricks. | 0 | 20 |
| 6.10.7 | `6-10-breakout-7-reading-the-ball-has-edges` | reading | Testing only the ball's centre lets it sink into a brick and slide past one it only scrapes. Test the four points on its edge instead, and flip vy for a brick above or below, vx for a brick beside it. | 0 | 10 |
| 6.10.8 | `6-10-breakout-8-lab-hit-with-the-edges` | lab | The ball breaks bricks with its centre and sinks into them. Test its four edges instead, and send it back up-and-down or across depending on which edge hit. | 0 | 20 |
| 6.10.9 | `6-10-breakout-9-lab-win-or-lose` | lab | Three balls to clear the wall. Count the bricks left, take a life for every ball that falls out, and end the game when the wall is cleared or the balls run out. | 0 | 20 |
| 6.10.10 | `6-10-breakout-10-lab-pick-a-mode` | lab | A title screen that waits for a key: 1 plays with the mouse, 2 with the arrow keys. Write the choices, read the key, and send R back to the title. With a note on prompt(). | 0 | 20 |
| 6.10.11 | `6-10-breakout-11-playtest-and-reflect` | playtest (AI) | Play your finished Breakout with the mouse and with the keys, try to break it, find one surprise, link it to your code and choose one change. AI-graded with hints. | 0 | 10 |
| 6.10.12 | `6-10-breakout-12-quiz-breakout` | check | Eight multiple-choice questions on flipping a speed, the radius, the paddle bounce, steering, the ball's edges and prompt(). Checked instantly. | 0 | 10 |
| 6.10.13 | `6-10-breakout-13-challenges-make-it-yours` | challenges | Your Breakout is complete. Change one rule of your own: a third mode, bricks that take two hits, or a second wall. Pick one; add an idea of your own on top if you like. | 0 | 30 |

Titles: `6.10.1 Plan: Break Breakout into parts`, `6.10.2 Reading: A ball you move yourself`, `6.10.3 Worked Example: A ball in a box`, `6.10.4 Lab: The paddle`, `6.10.5 Lab: Bounce`, `6.10.6 Lab: A wall from text`, `6.10.7 Reading: The ball has edges`, `6.10.8 Lab: Hit with the edges`, `6.10.9 Lab: Win or lose`, `6.10.10 Lab: Pick a mode`, `6.10.11 Playtest and reflect: Breakout`, `6.10.12 Check: Breakout`, `6.10.13 Challenges: Make it yours`.

Total **207 minutes**.

### Per-lesson notes

- **6.10.1 Plan** cites 6.9.1 (the previous plan) and describes the module in one paragraph; rubric `parts`, `remember`, `first`, `unsure` with the plan tail.
- **6.10.2 Reading** has snippets only (no live block), like 6.9.2: a step, a flip, the walls at `R`, the open bottom, the paddle by mouse or keys and its clamp, `vy > 0`, steering. It says why not physics (5.2.11).
- **6.10.3 Worked Example**: live block `E3` (section 8.2), four Try items, each checked in the harness: (1) ends of the paddle give `vx` -3.3 / +2.7, the middle -0.3; (2) without the steering line `|vx|` is only ever 3; (3) walls at 0 and 400 let the centre reach x 401; (4) `/ 4` gives `vx` 8 at the end of the paddle.
- **6.10.4 The paddle**: s1 mouse, s2 keys (the student flips `let control = 'mouse'` to `'keys'` to try them), s3 clamp. The words show `control` and `paddle x` so the clamp is visible (40 and 360).
- **6.10.5 Bounce**: s1 step, s2 three walls, s3 paddle + steer, s4 serve again. The words show `vx` and `vy`.
- **6.10.6 A wall from text**: s1 `makeBricks()` from `WALL`, s2 `drawBricks()`, s3 `hitBricks()` with the centre only. Step 3 tells the student what to watch for (sinking in, scraping past) and that the next reading explains it.
- **6.10.7 Reading**: centre vs edges, the four points table, which speed flips, `||` stops at the first true, why four points are enough; live block `E7` with `useEdges` and `START_X` (section 8.2).
- **6.10.8 Hit with the edges**: s1 replaces the centre line with top/bottom (flip `vy`), s2 adds left/right (flip `vx`).
- **6.10.9 Win or lose**: the starter adds `lives`, `state` (`'play'`, `'won'`, `'lost'`), R to restart and moves the lost-ball test into `checkEnd()`. s1 `bricksLeft()`, s2 a lost ball costs a life, s3 a cleared wall wins.
- **6.10.10 Pick a mode**: `state` starts `'title'` and `pickMode()` is empty, so the starter waits forever on the title. s1 the title words, s2 keys 1 and 2 (with the prompt() note), s3 R goes back to the title.
- **6.10.11 Playtest** cites 6.10.1 and 6.10.10; rubric `played`, `bug`, `cause`, `change` with the playtest tail.
- **6.10.12 Check**: section 5.
- **6.10.13 Challenges**: the finished game with its header changed; one card any challenge (or an own rule) turns green, one sentence card (6.9.14 r2).

---

## 5. The check (6.10.12)

Eight questions, `passPercent 70`, `points 0`. Keys B, A, C, D, B, D, A, C (two of each). The correct option is not the longest in any question with text options (q4 and q5 are numbers and code).

| id | Question | Options (answer in bold) | sourceIds |
| --- | --- | --- | --- |
| q1-flip | The ball reaches the right wall moving across at `vx = 3`, and the code runs `vx = -vx`. What happens next? | A) It stops dead, because -3 and 3 add up to 0<br>B) **It moves left at the same speed, 3 pixels a frame**<br>C) It moves left, a little slower after every bounce<br>D) It falls straight down, since only vy is left over | 6-10-breakout-2-reading-a-ball-you-move-yourself |
| q2-radius | The ball is 12 pixels wide, so `R` is 6. Why does the left-wall test use `ball.x < R` and not `ball.x < 0`? | A) **`ball.x` is the centre, so the ball's side reaches the wall at 6**<br>B) moSHion never lets a sprite stand at x = 0 anywhere on the canvas<br>C) Comparing with R makes the ball bounce back off the wall faster<br>D) The canvas starts at x = 6, so x = 0 is just off the screen | 6-10-breakout-2-reading-a-ball-you-move-yourself |
| q3-down | Why is the paddle bounce written `if (ball.overlaps(paddle) && vy > 0)`? | A) `overlaps()` is only ever true while the ball is falling, never going up<br>B) `vy > 0` adds a little speed, so the ball leaves faster after every bounce<br>C) **They touch for several frames, and a flip on each would bounce it up, down, up**<br>D) Without `vy > 0` the ball would sink through the paddle and fall out the bottom | 6-10-breakout-2-reading-a-ball-you-move-yourself |
| q4-steer | The paddle is at x = 200 and the ball lands on it at x = 230. With `vx = (ball.x - paddle.x) / 10`, how does the ball leave? | A) To the left, with vx = -3<br>B) Straight up, with vx = 0<br>C) To the right, with vx = 23<br>D) **To the right, with vx = 3** | 6-10-breakout-3-example-a-ball-in-a-box |
| q5-top | `R` is 6 and the ball is at (100, 170), moving up toward the wall. Which call asks about the point at the very top of the ball? | A) `hitAt(100, 176)`<br>B) **`hitAt(100, 164)`**<br>C) `hitAt(94, 170)`<br>D) `hitAt(100, 170)` | 6-10-breakout-7-reading-the-ball-has-edges |
| q6-side | `hitAt(ball.x - R, ball.y)` breaks a brick. Which speed should flip, and why? | A) `vy`, because every brick the ball hits sends it straight back down<br>B) Both, because the ball has to turn all the way back around<br>C) Neither, because `hitAt` already moved the ball out of the brick<br>D) **`vx`: the brick is beside the ball, so the ball turns back across** | 6-10-breakout-7-reading-the-ball-has-edges |
| q7-centre | The ball only asks `hitAt(ball.x, ball.y)`. What goes wrong? | A) **It sinks into a brick before turning, and can miss one it scrapes**<br>B) Every hit breaks two bricks at once, the one above and below<br>C) Bricks break a few frames before the ball has reached them<br>D) hitAt stops the sketch with an error when the ball is above the wall | 6-10-breakout-7-reading-the-ball-has-edges |
| q8-prompt | A player is asked `prompt('Press 1 for the mouse or 2 for the keys')` and types 1. What does `prompt` give back? | A) The number 1, ready to compare with `=== 1`<br>B) The value true, because an answer was typed<br>C) **The text `'1'`, a string, so compare with `'1'`**<br>D) Nothing until the player presses a key in the game | 6-10-breakout-10-lab-pick-a-mode |

Explanations:

- `q1-flip`: Flipping the sign keeps the speed and reverses the direction: 3 pixels a frame to the right becomes 3 pixels a frame to the left.
- `q2-radius`: A sprite's x is its centre. The ball's edge is R from its centre, so the edge reaches the wall when x is R. Testing 0 lets half the ball into the wall first.
- `q3-down`: overlaps() is true on every frame they touch. Flipping only while vy is above 0 means one flip per landing: after it vy is negative and the test stays false.
- `q4-steer`: 230 - 200 is 30: the ball landed 30 pixels right of the centre. 30 / 10 is 3, so it leaves to the right at 3 pixels a frame.
- `q5-top`: The top edge is straight above the centre, R away. y grows downward, so it is 170 - 6 = 164, with the same x.
- `q6-side`: The left edge point found the brick, so the brick is beside the ball, like a wall. A sideways bounce flips vx; vy keeps going.
- `q7-centre`: The centre is R inside the ball's edge. It reaches a brick late, so half the ball is in it first, and a ball passing beside a brick overlaps it without its centre ever entering.
- `q8-prompt`: prompt gives back whatever was typed as a string, which is why 3.1.9 wrapped it in Number(...). So the test is === '1'. That is one reason this game uses a key-press title screen instead.

---

## 6. The AI-graded screens

Both copy 6.9.1 / 6.9.12 exactly (`model "glm-5.3-flash:cloud"`, `contextDocs []`, every rubric item `points 0`), with "Breakout" in the lenient tail. The prompts:

### 6.10.1 Plan: Break Breakout into parts

`rubricTitle`: `Plan Breakout: AI-graded rubric`

```text
Everything you need is on this page and in 6.9.1 (Plan: Break the Coin Maze into parts): go back and reread it if you get stuck. A few short sentences per answer is plenty, in your own everyday words.

You are about to build Breakout: a paddle you steer, a ball that bounces, and a wall of bricks the ball breaks one at a time. Before you write any code, plan it.

1. List at least four separate parts of Breakout, things it has or does.

2. Which two or more things does the game have to remember from one frame to the next?

3. Which part would you build first, and why?

4. Which part are you unsure how to build, and what makes it hard?
```

Rubric: `parts` "Four or more parts of the game are named"; `remember` "Says what the game must remember between frames"; `first` "Picks a first thing to build and gives a reason"; `unsure` "Names one part they are unsure how to build". Each description is its own first sentence(s) then the tail.

### 6.10.11 Playtest and reflect: Breakout

`rubricTitle`: `Playtest Breakout: AI-graded rubric`

```text
Everything you need is in 6.10.1 (Plan: Break Breakout into parts) and 6.10.10 (Lab: Pick a mode): go back and reread them if you get stuck. A few short sentences per answer is plenty, in your own everyday words.

Play your finished Breakout at least twice, once with the mouse and once with the arrow keys. Try to break it: catch the ball on the very ends of the paddle, slide the paddle into the ball from the side, let the ball fall out on purpose. Then answer:

1. How many times did you play, and how did it go?

2. What is one thing that surprised you or did not work as you expected?

3. Which part of your code do you think that comes from?

4. What is one rule or number you would change, and what would it do to the game?
```

Rubric: `played` "Says how many times they played and how it went"; `bug` "Names one thing that surprised or broke"; `cause` "Says which part of the code that touches"; `change` "Names one rule they would change and what it would do". Each description is its own first sentence(s) then the tail.

---

## 7. Requirement cards and patterns (verified)

Each card below is exactly what ships (`lesson.json` is the source of truth; these are pasted from it). Every pattern is `inFunction` unless marked `regex`, `ignoreStrings: true` unless noted. Nothing uses a lookbehind. The patterns were built from named fragments (`FLIPX`/`FLIPY` accept `v = -v`, `v *= -1`, `v = v * -1`, `v = -1 * v`, `v = 0 - v`, `abs`/`Math.abs`; positions accept `x` or `pos.x`).

### 6.10.4 Lab: The paddle

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The paddle follows the mouse | When control is 'mouse', the paddle's x is set to the mouse's x every frame. Help: 6.10.2 (Reading: A ball you move yourself) | movePaddle |
| r2 | The arrow keys move it | When control is 'keys', kb.pressing('left') and kb.pressing('right') move the paddle's x by 6. Help: 6.10.2 (Reading: A ball you move yourself) | movePaddle |
| r3 | The paddle stays on the screen | If its x goes below half its width, or above 400 minus half its width, it is put back on the edge. Help: 6.10.2 (Reading: A ball you move yourself) | movePaddle |

```json
  {"id":"r1","pattern":"^(?=[\\s\\S]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*=(?!=)[^;\\n]*\\bmouse\\s*\\.\\s*(?:pos\\s*\\.\\s*)?x\\b)(?=[\\s\\S]*(?:\\bcontrol\\s*[!=]==?|[!=]==?\\s*control\\b|\\bswitch\\s*\\(\\s*control\\s*\\)))"},
  {"id":"r2","pattern":"^(?=[\\s\\S]*\\bkb\\s*\\.\\s*(?:pressing|holding|presses|pressed|down)\\s*\\([\\s\\S]*?\\bkb\\s*\\.\\s*(?:pressing|holding|presses|pressed|down)\\s*\\()(?=[\\s\\S]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*(?:-=|--|=(?!=)\\s*\\(?\\s*paddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*-))(?=[\\s\\S]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*(?:\\+=|\\+\\+|=(?!=)\\s*\\(?\\s*paddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*\\+))"},
  {"id":"r3","pattern":"\\bif\\s*\\((?=[^;{}]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)(?=[^;{}]*[<>])[^;{}]*\\)\\s*\\{?\\s*paddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*=(?!=)[\\s\\S]*?\\bif\\s*\\((?=[^;{}]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)(?=[^;{}]*[<>])[^;{}]*\\)\\s*\\{?\\s*paddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*=(?!=)|\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*=(?!=)\\s*\\(?\\s*(?:constrain|Math\\s*\\.\\s*(?:min|max)|min|max)\\s*\\("}
```

### 6.10.5 Lab: Bounce

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The ball moves by vx and vy | Every frame vx is added to the ball's x and vy to its y. Help: 6.10.2 (Reading: A ball you move yourself) | moveBall |
| r2 | The side walls flip vx | When the ball is less than R from the left wall or more than 400 - R across, vx changes sign. Help: 6.10.2 (Reading: A ball you move yourself) | moveBall |
| r3 | The top flips vy | When the ball is less than R from the top, vy changes sign. Help: 6.10.2 (Reading: A ball you move yourself) | moveBall |
| r4 | The paddle bounces it only while it comes down | When the ball overlaps the paddle AND vy is above 0, vy changes sign. Help: 6.10.2 (Reading: A ball you move yourself) | moveBall |
| r5 | Where it lands steers it | After a paddle bounce, vx is worked out from the ball's x minus the paddle's x. Help: 6.10.3 (Worked Example: A ball in a box) | moveBall |
| r6 | A lost ball is served again | When the ball's y is past the bottom, serve() puts it back. Help: 6.10.3 (Worked Example: A ball in a box) | moveBall + draw |

```json
  {"id":"r1","pattern":"^(?=[\\s\\S]*(?:\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*(?:\\+=\\s*\\(?\\s*vx\\b|=(?!=)\\s*\\(?\\s*(?:ball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*\\+\\s*\\(?\\s*vx|vx\\s*\\+\\s*ball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x))\\b)|\\bball\\s*\\.\\s*vel\\s*\\.\\s*x\\s*=(?!=)\\s*vx\\b))(?=[\\s\\S]*(?:\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\s*(?:\\+=\\s*\\(?\\s*vy\\b|=(?!=)\\s*\\(?\\s*(?:ball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\s*\\+\\s*\\(?\\s*vy|vy\\s*\\+\\s*ball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y))\\b)|\\bball\\s*\\.\\s*vel\\s*\\.\\s*y\\s*=(?!=)\\s*vy\\b))"},
  {"id":"r2","pattern":"^(?=[\\s\\S]*?\\bif\\s*\\((?=[^;{}]*\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)(?=[^;{}]*<)(?=[^;{}]*(?:\\bR\\b|\\bball\\s*\\.\\s*(?:r|w|h|d|width|height|diameter|radius)\\b|\\b(?:[1-9]|1[0-2])\\b))[^;{}]*\\)\\s*\\{?\\s*(?:\\bvx\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vx\\b|0\\s*-\\s*vx\\b|\\(?\\s*vx\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vx\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vx\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b)|\\bvx\\s*=(?!=)\\s*-?\\s*\\d))(?=[\\s\\S]*?\\bif\\s*\\((?=[^;{}]*\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)(?=[^;{}]*>)(?=[^;{}]*(?:\\bR\\b|\\bball\\s*\\.\\s*(?:r|w|h|d|width|height|diameter|radius)\\b|\\b(?:39\\d|38[89])\\b|\\bwidth\\b))[^;{}]*\\)\\s*\\{?\\s*(?:\\bvx\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vx\\b|0\\s*-\\s*vx\\b|\\(?\\s*vx\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vx\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vx\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b)|\\bvx\\s*=(?!=)\\s*-?\\s*\\d))"},
  {"id":"r3","pattern":"\\bif\\s*\\((?=[^;{}]*\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\b)(?=[^;{}]*<)(?=[^;{}]*(?:\\bR\\b|\\bball\\s*\\.\\s*(?:r|w|h|d|width|height|diameter|radius)\\b|\\b(?:[1-9]|1[0-2])\\b))[^;{}]*\\)\\s*\\{?\\s*(?:\\bvy\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vy\\b|0\\s*-\\s*vy\\b|\\(?\\s*vy\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vy\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vy\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b)|\\bvy\\s*=(?!=)\\s*\\d)"},
  {"id":"r4","pattern":"^(?=[\\s\\S]*(?:\\bball\\s*\\.\\s*overlap(?:s|ping)\\s*\\(\\s*paddle\\b|\\bpaddle\\s*\\.\\s*overlap(?:s|ping)\\s*\\(\\s*ball\\b|\\bif\\s*\\((?=[^;{}]*\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\b)(?=[^;{}]*\\bpaddle\\s*\\.\\s*(?:x|y|pos)\\b)))(?=[\\s\\S]*(?:\\bvy\\s*>=?\\s*0\\b|\\b0\\s*<=?\\s*vy\\b|\\bvy\\s*=(?!=)\\s*-\\s*\\(?\\s*(?:(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vy\\s*\\)|\\d|[A-Z][A-Z_\\d]*\\b)))"},
  {"id":"r5","pattern":"\\bvx\\s*=(?!=)(?=[^;\\n]*\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)(?=[^;\\n]*\\bpaddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b)|\\b(?:const|let|var)\\s+(?<o>[A-Za-z_$][\\w$]*)\\s*=\\s*(?=[^;\\n]*\\b(?:ball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)|paddle\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x))\\b)[^;\\n]*[;\\n][\\s\\S]*?\\bvx\\s*=(?!=)(?=[^;\\n]*\\b\\k<o>\\b)"},
  {"id":"r6","pattern":"\\bif\\s*\\((?=[^;{}]*\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\b)(?=[^;{}]*>)[^;{}]*\\)\\s*\\{?\\s*(?:serve\\s*\\(\\s*\\)|ball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\s*=(?!=)|ball\\s*\\.\\s*pos\\s*=(?!=)|startGame\\s*\\(\\s*\\))"}
```

### 6.10.6 Lab: A wall from text

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The wall is built from WALL with two loops | A row is made for each row of WALL, filled from its letters, and pushed onto b (two loops, for or while). Help: 6.9.10 (Lab: Light the grid) | makeBricks |
| r2 | A # becomes 1, anything else 0 | Each letter is compared with '#': a brick is pushed as 1 and a gap as 0. Help: 6.9.5 (Reading: Reading a map as data) | makeBricks |
| r3 | The wall is drawn from the data | Two loops visit every cell; a brick gets its row's fill and a rect. Help: 6.9.9 (Reading: A grid is data) | drawBricks |
| r4 | Each brick sits at its row and column | The rect starts at c * BW across and TOP + r * BH down, and is BW by BH. Help: 6.9.9 (Reading: A grid is data) | drawBricks |
| r5 | The ball's centre breaks a brick | hitBricks asks hitAt about the ball, and flips vy when it says true. Help: 6.9.11 (Lab: A wall of bricks) | hitBricks |

```json
  {"id":"r1","pattern":"^(?=[\\s\\S]*\\b(?:for|while)\\b[\\s\\S]*\\b(?:for|while)\\b)(?=[\\s\\S]*(?:\\bWALL\\s*\\[[^\\]]+\\]\\s*(?:\\[|\\.\\s*(?:charAt|at)\\s*\\()|\\bof\\s+WALL\\b|=\\s*WALL\\s*\\[))(?=[\\s\\S]*(?:\\.\\s*push\\s*\\(\\s*(?!\\d|true\\b|false\\b)[A-Za-z_$][\\w$]*\\s*\\)|\\.\\s*push\\s*\\(\\s*\\[\\s*\\]\\s*\\)|\\]\\s*=\\s*\\[\\s*\\]))|^(?=[\\s\\S]*\\b(?:for|while)\\b)(?=[\\s\\S]*\\bWALL\\b[^;\\n]*\\.\\s*(?:map|split)\\s*\\()"},
  {"id":"r2","pattern":"^(?=[\\s\\S]*(?:(?:===?|!==?)\\s*(['\"\\x60]) \\1|(['\"\\x60]) \\2\\s*(?:===?|!==?)|\\bcase\\s*(['\"\\x60]) \\3))(?=[\\s\\S]*(?:\\.\\s*push\\s*\\(\\s*1\\s*\\)[\\s\\S]*\\.\\s*push\\s*\\(\\s*0\\s*\\)|\\.\\s*push\\s*\\(\\s*0\\s*\\)[\\s\\S]*\\.\\s*push\\s*\\(\\s*1\\s*\\)|\\?\\s*1\\s*:\\s*0\\b|\\?\\s*0\\s*:\\s*1\\b|\\]\\s*=\\s*1\\s*;[\\s\\S]*\\]\\s*=\\s*0\\s*;|\\]\\s*=\\s*0\\s*;[\\s\\S]*\\]\\s*=\\s*1\\s*;))"},
  {"id":"r3","pattern":"^(?=[\\s\\S]*\\b(?:for|while)\\b[\\s\\S]*\\b(?:for|while)\\b)(?=[\\s\\S]*(?:\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]|\\bof\\s+bricks\\b))(?=[\\s\\S]*\\bfill\\s*\\()(?=[\\s\\S]*\\b(?:rect|square)\\s*\\()"},
  {"id":"r4","pattern":"^(?=[\\s\\S]*\\b(?:rect|square)\\s*\\()(?=[\\s\\S]*(?:\\b(?:TOP|60)\\s*\\+|\\+\\s*\\(?\\s*(?:TOP|60)\\b|=\\s*(?:TOP|60)\\s*[;\\n]))(?=[\\s\\S]*(?:\\*\\s*\\(?\\s*(?:BW|50)\\b|\\b(?:BW|50)\\s*\\*|\\+=\\s*(?:BW|50)\\b))(?=[\\s\\S]*(?:\\*\\s*\\(?\\s*(?:BH|20)\\b|\\b(?:BH|20)\\s*\\*|\\+=\\s*(?:BH|20)\\b))"},
  {"id":"r5","pattern":"\\bif\\s*\\((?=[^;{}]*\\bhitAt\\s*\\((?=[^;{}]*\\bball\\b))[^;{}]*\\)\\s*\\{?\\s*\\bvy\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vy\\b|0\\s*-\\s*vy\\b|\\(?\\s*vy\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vy\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vy\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b)|\\b(?:const|let|var)\\s+(?<h>[A-Za-z_$][\\w$]*)\\s*=\\s*hitAt\\s*\\((?=[^;\\n]*\\bball\\b)[^;\\n]*[;\\n][\\s\\S]*?\\bif\\s*\\((?=[^;{}]*\\b\\k<h>\\b)[^;{}]*\\)\\s*\\{?\\s*\\bvy\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vy\\b|0\\s*-\\s*vy\\b|\\(?\\s*vy\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vy\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vy\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b)"}
```

### 6.10.8 Lab: Hit with the edges

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The top and bottom edges flip vy | hitAt is asked about (ball.x, ball.y - R) and (ball.x, ball.y + R), and a hit flips vy. Help: 6.10.7 (Reading: The ball has edges) | hitBricks |
| r2 | The left and right edges flip vx | hitAt is asked about (ball.x - R, ball.y) and (ball.x + R, ball.y), and a hit flips vx. Help: 6.10.7 (Reading: The ball has edges) | hitBricks |

```json
  {"id":"r1","pattern":"^(?=[\\s\\S]*\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\s*-\\s*\\(?\\s*(?:R\\b|6\\b|ball\\s*\\.\\s*(?:r|radius)\\b|\\(?\\s*ball\\s*\\.\\s*(?:d|w|h|diameter|width|height)\\s*\\/\\s*2\\b))(?=[\\s\\S]*(?:\\bball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\s*\\+\\s*\\(?\\s*(?:R\\b|6\\b|ball\\s*\\.\\s*(?:r|radius)\\b|\\(?\\s*ball\\s*\\.\\s*(?:d|w|h|diameter|width|height)\\s*\\/\\s*2\\b)|\\b(?:R|6)\\s*\\+\\s*ball\\s*\\.\\s*(?:y|pos\\s*\\.\\s*y)\\b))(?=[\\s\\S]*\\bhitAt\\s*\\([\\s\\S]*?\\bhitAt\\s*\\()(?=[\\s\\S]*\\bvy\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vy\\b|0\\s*-\\s*vy\\b|\\(?\\s*vy\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vy\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vy\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b))"},
  {"id":"r2","pattern":"^(?=[\\s\\S]*\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*-\\s*\\(?\\s*(?:R\\b|6\\b|ball\\s*\\.\\s*(?:r|radius)\\b|\\(?\\s*ball\\s*\\.\\s*(?:d|w|h|diameter|width|height)\\s*\\/\\s*2\\b))(?=[\\s\\S]*(?:\\bball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\s*\\+\\s*\\(?\\s*(?:R\\b|6\\b|ball\\s*\\.\\s*(?:r|radius)\\b|\\(?\\s*ball\\s*\\.\\s*(?:d|w|h|diameter|width|height)\\s*\\/\\s*2\\b)|\\b(?:R|6)\\s*\\+\\s*ball\\s*\\.\\s*(?:x|pos\\s*\\.\\s*x)\\b))(?=[\\s\\S]*\\bhitAt\\s*\\([\\s\\S]*?\\bhitAt\\s*\\()(?=[\\s\\S]*\\bvx\\s*(?:=(?!=)\\s*(?:-\\s*\\(?\\s*vx\\b|0\\s*-\\s*vx\\b|\\(?\\s*vx\\s*\\)?\\s*\\*\\s*\\(?\\s*-\\s*1\\b|-\\s*1\\s*\\*\\s*vx\\b|-?\\s*(?:Math\\s*\\.\\s*)?abs\\s*\\(\\s*vx\\s*\\))|\\*=\\s*\\(?\\s*-\\s*1\\b))"}
```

### 6.10.9 Lab: Win or lose

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | bricksLeft counts the bricks | Two loops (index or for...of), counting only the cells that hold a brick, and n goes up. Help: 6.9.11 (Lab: A wall of bricks) | bricksLeft |
| r2 | A lost ball costs a life | When the ball falls out, lives goes down by 1; at 0 the state becomes 'lost', otherwise the ball is served again. Help: 6.6.7 (Reading: moSHion docs: The state Variable) | checkEnd |
| r3 | A cleared wall wins | When bricksLeft() is 0, the state becomes 'won'. Help: 6.6.17 (Reading: moSHion docs: Condition-Driven Transitions) | checkEnd |

```json
  {"id":"r1","pattern":"^(?=[\\s\\S]*\\b(?:for|while)\\b[\\s\\S]*\\b(?:for|while)\\b)(?=[\\s\\S]*(?:\\bn\\s*(?:\\+\\+|\\+=|=\\s*n\\s*\\+)|\\+\\+\\s*n\\b))(?=[\\s\\S]*(?:\\bif\\s*\\([^)]*\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]|\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*\\?|\\+=\\s*\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]|\\bfor\\s*\\(\\s*(?:const|let|var)\\s+([\\w$]+)\\s+of\\s+bricks\\b[\\s\\S]*?\\bfor\\s*\\(\\s*(?:const|let|var)\\s+([\\w$]+)\\s+of\\s+\\1\\b[\\s\\S]*?(?:\\bif\\s*\\(\\s*!?\\s*\\2\\b|\\b\\2\\s*\\?|\\+=\\s*\\2\\b)|\\b(?:const|let|var)\\s+([\\w$]+)\\s*=\\s*\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*;[\\s\\S]*?(?:\\bif\\s*\\(\\s*!?\\s*\\3\\b|\\b\\3\\s*\\?|\\+=\\s*\\3\\b)|\\b(?:const|let|var)\\s+(?<rw>[\\w$]+)\\s*=\\s*\\bbricks\\s*\\[[^\\]]+\\]\\s*;[\\s\\S]*?(?:\\bif\\s*\\([^)]*\\b\\k<rw>\\s*\\[[^\\]]+\\]|\\b\\k<rw>\\s*\\[[^\\]]+\\]\\s*\\?|\\+=\\s*\\k<rw>\\s*\\[[^\\]]+\\])|\\bfor\\s*\\(\\s*(?:const|let|var)\\s+(?<rf>[\\w$]+)\\s+of\\s+bricks\\b[\\s\\S]*?(?:\\bif\\s*\\([^)]*\\b\\k<rf>\\s*\\[[^\\]]+\\]|\\b\\k<rf>\\s*\\[[^\\]]+\\]\\s*\\?|\\+=\\s*\\k<rf>\\s*\\[[^\\]]+\\])))|\\.filter\\s*\\("},
  {"id":"r2","pattern":"^(?=[\\s\\S]*(?:\\blives\\s*(?:-=\\s*1\\b|--)|--\\s*lives\\b|\\blives\\s*=(?!=)\\s*lives\\s*-\\s*1\\b))(?=[\\s\\S]*(?:\\blives\\s*(?:===?\\s*0|<=\\s*0|<\\s*1|>\\s*0|>=\\s*1|!==?\\s*0)\\b|\\b0\\s*(?:===?|>=|<|!==?)\\s*lives\\b|!\\s*\\(?\\s*lives\\b))(?=[\\s\\S]*\\bstate\\s*=(?!=)\\s*(?<q>['\"\\x60]) {4}\\k<q>)(?=[\\s\\S]*\\bserve\\s*\\(\\s*\\))"},
  {"id":"r3","pattern":"^(?=[\\s\\S]*(?:\\bbricksLeft\\s*\\(\\s*\\)\\s*(?:===?\\s*0|<=?\\s*0|<\\s*1)\\b|\\b0\\s*(?:===?|>=)\\s*bricksLeft\\s*\\(\\s*\\)|!\\s*\\(?\\s*bricksLeft\\s*\\(\\s*\\)|\\b(?:const|let|var)\\s+(?<n>[A-Za-z_$][\\w$]*)\\s*=\\s*bricksLeft\\s*\\(\\s*\\)[\\s\\S]*?(?:\\b\\k<n>\\s*(?:===?\\s*0|<=?\\s*0|<\\s*1)\\b|!\\s*\\k<n>\\b)))(?=[\\s\\S]*\\bstate\\s*=(?!=)\\s*(?<q>['\"\\x60]) {3}\\k<q>)"}
```

### 6.10.10 Lab: Pick a mode

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | The title screen says what to press | While state is 'title', the name of the game and the two choices are written on the screen. Help: 6.6.11 (Worked Example: Title Screen with Start Button) | drawTop + draw |
| r2 | A key picks the mode | Key 1 sets control to 'mouse' and key 2 sets it to 'keys', and each one sets state to 'play'. Help: 6.6.16 (Worked Example: Keyboard-Driven State Changes) | pickMode |
| r3 | R goes back to the title | After the game ends, R starts a new game and sets state to 'title'. Help: 6.6.16 (Worked Example: Keyboard-Driven State Changes) | draw + startGame |

```json
  {"id":"r1","pattern":"\\bif\\s*\\((?=[^;{}]*(?:\\bstate\\s*===?\\s*(?<a>['\"\\x60]) {5}\\k<a>|(?<b>['\"\\x60]) {5}\\k<b>\\s*===?\\s*state\\b))[^;{}]*\\)\\s*\\{[^}]*?\\btext\\s*\\([^}]*?\\btext\\s*\\(|\\bcase\\s*(?<c>['\"\\x60]) {5}\\k<c>\\s*:(?:(?!\\bcase\\b|\\bbreak\\b)[^}])*?\\btext\\s*\\((?:(?!\\bcase\\b|\\bbreak\\b)[^}])*?\\btext\\s*\\("},
  {"id":"r2","pattern":"^(?=[\\s\\S]*(?:\\bkb\\s*\\.\\s*(?:presses|pressed|released|pressing)\\s*\\(\\s*(?:(['\"\\x60]) \\1|\\d)\\s*\\)[\\s\\S]*?\\bkb\\s*\\.\\s*(?:presses|pressed|released|pressing)\\s*\\(\\s*(?:(['\"\\x60]) \\2|\\d)\\s*\\)|\\bprompt\\s*\\())(?=[\\s\\S]*\\bcontrol\\s*=(?!=)\\s*(['\"\\x60]) {5}\\3)(?=[\\s\\S]*\\bcontrol\\s*=(?!=)\\s*(['\"\\x60]) {4}\\4)(?=[\\s\\S]*\\bstate\\s*=(?!=)\\s*(['\"\\x60]) {4}\\5)"},
  {"id":"r3","pattern":"\\bkb\\s*\\.\\s*(?:presses|pressed|released)\\s*\\(\\s*(['\"\\x60]) \\1\\s*\\)[\\s\\S]*?\\bstate\\s*=(?!=)\\s*(['\"\\x60]) {5}\\2"}
```

### 6.10.13 Challenges: Make it yours

| Card | Title | Description | Where |
| --- | --- | --- | --- |
| r1 | You changed one rule of the game | Any one challenge turns this green: a third mode, two-hit bricks or a second wall (or a rule of your own, such as a faster ball or a different score). Help: 6.10.10 (Lab: Pick a mode) | regex, whole file |
| r2 | You wrote your sentence | A // comment of a few words at the top of the file says what your rule is and what would happen without it (any wording works; a comment that starts with a number, like the title line, does not count). Help: this lab's step 2 | regex, whole file, reads comments, flags i |

```json
  {"id":"r1","pattern":"^(?=(?:[\\s\\S]*?\\bkb\\s*\\.\\s*(?:presses|pressed|released)\\s*\\(){4})|\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*(?:-=\\s*1\\b|--|=(?!=)\\s*bricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*-\\s*1\\b)|\\.\\s*push\\s*\\(\\s*2\\s*\\)|\\bWALLS\\s*\\[\\s*[A-Za-z_$]|\\b(?:wallNum|levelNum|level|wall)\\s*(?:\\+=\\s*1\\b|\\+\\+)|\\+\\+\\s*(?:wallNum|levelNum|level|wall)\\b|\\bv[xy]\\s*(?:\\*=\\s*-?\\s*\\(?\\s*(?:\\d*\\.\\d+|[2-9]\\d*)|=(?!=)\\s*-?\\s*\\(?\\s*-?\\s*v[xy]\\s*\\)?\\s*\\*\\s*-?\\s*\\(?\\s*(?:\\d*\\.\\d+|[2-9]\\d*))|\\bscore\\s*(?:\\+=|=\\s*score\\s*\\+)(?!\\s*10\\s*(?:[;})\\n]|$))|\\blives\\s*=(?!=)\\s*(?!3\\b)\\d+|\\bPADDLE_W\\s*=\\s*(?!80\\b)\\d+"},
  {"id":"r2","pattern":"^(?:[ \\t]*(?:\\/\\/[^\\n]*)?\\r?\\n)*?[ \\t]*\\/\\/[ \\t]*(?:[A-Za-z][A-Za-z'-]*[,.:;!?]?[ \\t]+){3}[A-Za-z]|\\/\\/[^\\n]*\\b(?:would|without|otherwise|instead|if|remov\\w*)\\b"}
```

### What the patterns accept and refuse (all graded with `lib/grader.ts`, 74 cases, 0 mismatches)

Every reference scores full; every starter scores 0 of N (6.10.13: 0 of 2). Cases are the reference with one function replaced.

| Lab | Accepted (honest shapes) | Refused (wrong or cheating) |
| --- | --- | --- |
| 6.10.4 | `if/else` with `==` and double quotes, `paddle.x = paddle.x - 6`; `switch (control)` + `constrain(...)`; `Math.max(.., Math.min(..))`; reversed comparisons `PADDLE_W / 2 > paddle.x` with `else if`; `paddle.x - PADDLE_W / 2 < 0` | ungated `paddle.x = mouse.x` with no keys and no clamp (0/3); empty clamp `if`s (r3); everything in a string (0/3); one arrow key only (r2, r3) |
| 6.10.5 | separate `if`s with braces and `*= -1`, nested `if (vy > 0)` inside the overlap; `abs`/`-abs` flips with `ball.x - R < 0`, `ball.x + R > 400`, an offset variable for steering; literals `6`/`394` and `paddle.overlaps(ball)`; `ball.vel.x = vx` instead of positions; the lost-ball test moved to `draw()` | walls at 0 and 400 (r2, r3); no `vy > 0` guard (r4); no steering line (r5); the lost-ball test missing (r6); a string or a comment holding the whole body (0/6) |
| 6.10.6 | ternary push; `for...of` over `WALL` and its letters with double quotes; `while` loops with `charAt` and `b[r][c] = 1/0`; `split('').map(...)`; running `x`/`y` with `+= BW`/`+= BH` and a truthy test; `BW * c, r * BH + TOP`; `=== true`, an alias `const hit = hitAt(...)`, the edge version already | every cell a 1, 6.9.11 copied (r1, r2); no `else`, so the row is short (r2); `TOP` forgotten (r4); `hitAt` with no flip (r5) |
| 6.10.8 | four separate `if`/`else if`; aliases `const top = ball.y - R`; `6` for `R`, `(R)` in parentheses, `*= -1` | the starter's centre line kept with only the sides added (r1); a comment or a string holding the edge calls (0/2) |
| 6.10.9 | `lives--` with `<= 0` and braces; `lives = lives - 1` with `lives > 0` first and an alias `const left = bricksLeft()`; nested `for...of` count | never serving again (r2); a string holding `checkEnd` (r2, r3) |
| 6.10.10 | `else if` and double quotes; a `prompt()` in `pickMode()`; `kb.presses(1)` with numbers; `switch (state)` with `case 'title':` in `drawTop()`; `state = 'title'` moved into `startGame()` | only key 1 (r2); an empty `if (state === 'title') {}` (r1) |
| 6.10.13 | key 3; `bricks[r][c] -= 1`; `push(2)`; `WALLS[wallNum]`; own rules: `vy = -vy * 1.05`, `score += (BRICK_ROWS - r) * 10`, `lives = 5` | the starter plus only a sentence (r1); a rule with no sentence (r2) |

Declined on purpose (lax grading, `feedback_pseudocode-grading-lax`):

- 6.10.4 r1 asks for a `control` comparison and an assignment from `mouse.x`, not that one is inside the other; 6.10.4 r2 does not check the arrows are `'left'` and `'right'` (blanked strings).
- 6.10.5 r2/r3 accept a wall test whose `if` mentions `R` (or 6, or the sprite's size) anywhere in the condition, so `ball.x < 0 || ball.x > 400 - R` passes r2.
- 6.10.5 r4 accepts any `vy > 0` (or `vy = -abs(vy)`, or a negative constant) in `moveBall`, not tied to the overlap `if`.
- 6.10.8 does not check the pairing: top/bottom flipping `vx` and sides flipping `vy` passes both cards (the ball then drills straight up through the wall, which the student sees). Requiring the pairing needs an `if`-to-flip link that also accepts aliased points; it was not worth the false negatives.
- 6.10.10 r2 checks two one-character key names and the 5- and 4-letter `control` values, not that `'1'` goes with `'mouse'`.
- A computed-but-unused value (`const t = ball.y - R;` and nothing else) can satisfy a fragment; only `tests`-type requirements close that, as in 6.9.

Gate axes (`scripts/audit-grader-tolerance.mjs`): the three `--gate` layout axes leave every reference full (0 hits, course-wide). The full 6.10 sweep (13 axes) reports one hit: 6.10.13 r2 refuses `/* */` instead of `//`, tagged maybe-intentional (the step asks for a `//` comment; 6.9.14 r2 is the same).

Speed: every pattern on 5000-character adversarial input, through the real grader (comment stripper and string blanker included), 400 seeds x 3 shapes: worst 32 ms (6.10.13 r2, the copied 6.9.14 pattern). Raw regex on targeted pathological strings (`if (` x1250, `if (state === "     "` x230, `kb.presses(` x460, `const a = hitAt(ball` x240 and ten more): worst 8.5 ms, after three alternatives with two `[^;]*` runs around a token were rewritten as lookaheads (they had measured 35-40 ms).

---

## 8. Reference scripts

### 8.0 How the lab scripts are made

Each lab is ONE marked source; `solution.js` is the source with the markers removed and `script.js` (the starter) replaces each block with `// STEP N: <text>` comments, followed by any `//--` starter lines (used where a step CHANGES a line the starter already has: 6.10.8 s1, 6.10.9 s2, 6.10.10 s3). Everything outside a marker is identical in both. Marker grammar: `//>> sN`, solution lines, optional `//--` then starter lines, `//<<`. The splitter is GRIDS-SPEC 8.0's plus the `//--` branch. The STEP texts:

```json
{
  "L4": {
    "s1": "when control is 'mouse', put the paddle's x where the mouse's x is.",
    "s2": "when control is 'keys', the left arrow moves the paddle 6 pixels left and the right arrow 6 pixels right.",
    "s3": "keep the paddle on the screen: its x may not go below half its width, or above 400 minus half its width."
  },
  "L5": {
    "s1": "move the ball one step: add vx to its x and vy to its y.",
    "s2": "bounce off the walls. Past the left or right wall (closer than R), flip the sign of vx. Past the top, flip the sign of vy.",
    "s3": "bounce off the paddle, but only while the ball is coming down (vy above 0): flip vy, then steer: vx is the ball's x minus the paddle's x, divided by 10.",
    "s4": "a ball that falls more than R below the bottom (y 400) is lost: serve it again."
  },
  "L6": {
    "s1": "build the wall from WALL. For each of BRICK_ROWS rows make an empty row; for each of BRICK_COLS letters push 1 when WALL[r][c] is the letter #, and 0 when it is not; then push the row onto b.",
    "s2": "draw the wall from the data. Two loops over every cell: where the cell is 1, fill with ROW_COLORS[r] and draw a rect at the brick's top-left corner, BW wide and BH tall.",
    "s3": "ask hitAt about the ball's centre. If it says true, flip vy so the ball goes back the other way."
  },
  "L8": {
    "s1": "replace the centre test below. Test the ball's top edge (R above its centre) and its bottom edge (R below). If either one hits a brick, flip vy.",
    "s2": "test the ball's left edge (R left of its centre) and its right edge (R right). If either one hits a brick, flip vx."
  },
  "L9": {
    "s1": "count the bricks still standing: two loops over the wall, adding 1 to n for every cell that is 1.",
    "s2": "change the line below. A lost ball costs a life: take 1 from lives. If no lives are left, set state to 'lost'; otherwise serve again.",
    "s3": "when no bricks are left, set state to 'won'."
  },
  "L10": {
    "s1": "while state is 'title', write the name of the game and the two choices: 1 plays with the mouse, 2 with the arrow keys.",
    "s2": "when the 1 key is pressed, set control to 'mouse' and state to 'play'. When the 2 key is pressed, set control to 'keys' and state to 'play'.",
    "s3": "change the line below: after a new game is set up, go back to the title screen instead of straight into play."
  }
}
```

Hashes (first 12 hex of SHA-256 of the shipped file):

| Folder | solution.js | script.js |
| --- | --- | --- |
| `6-10-breakout-4-lab-the-paddle` | `973dce2a2920` | `dbe1f0f6ff5d` |
| `6-10-breakout-5-lab-bounce` | `b156d16bb1ed` | `6bac0f0c0292` |
| `6-10-breakout-6-lab-a-wall-from-text` | `65dddef42de1` | `f3afdf8e7696` |
| `6-10-breakout-8-lab-hit-with-the-edges` | `879fcb79a7e6` | `2a796d263076` |
| `6-10-breakout-9-lab-win-or-lose` | `85a6132aea6d` | `42cf8c5f55a8` |
| `6-10-breakout-10-lab-pick-a-mode` | `a2287ec03027` | `cf4246d3b140` |
| `6-10-breakout-13-challenges-make-it-yours` | `a0041cca65f9` | `527571318893` |

### 8.1 The labs (marked sources)

#### 6.10.4 Lab: The paddle

```js
// 6.10.4 Lab: The paddle (reference solution).

const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle;
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
}

function draw() {
  background('#111');
  movePaddle();
}

// Move the paddle by the mouse or by the arrow keys, then keep it on the screen.
function movePaddle() {
//>> s1
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
//<<
//>> s2
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
//<<
//>> s3
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('control: ' + control, 12, 24);
  text('paddle x: ' + round(paddle.x), 12, 48);
}
```

#### 6.10.5 Lab: Bounce

```js
// 6.10.5 Lab: Bounce (reference solution).

const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';   // nothing pushes it: your code moves it
  ball.color = 'white';
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  movePaddle();
  moveBall();
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

// Move the ball one step, and bounce it off the walls and the paddle.
function moveBall() {
//>> s1
  ball.x += vx;
  ball.y += vy;
//<<
//>> s2
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
//<<
//>> s3
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
//<<
//>> s4
  if (ball.y > 400 + R) serve();
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('vx: ' + round(vx, 1) + '   vy: ' + vy, 12, 24);
}
```

#### 6.10.6 Lab: A wall from text

```js
// 6.10.6 Lab: A wall from text (reference solution).

const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
  '########',
  '########',
  '##.##.##',
  '########',
  '.######.',
];
const BRICK_ROWS = WALL.length;      // 5
const BRICK_COLS = WALL[0].length;   // 8
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let score;
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  bricks = makeBricks();
  score = 0;
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  movePaddle();
  moveBall();
  hitBricks();
  drawBricks();
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
  if (ball.y > 400 + R) serve();
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
//>> s1
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (WALL[r][c] === '#') row.push(1);
      else row.push(0);
    }
    b.push(row);
  }
//<<
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
//>> s2
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
//<<
}

// Your hitAt from 6.9.11: when a brick is at pixel (x, y), take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// Did the ball hit a brick? If it did, send it back the other way.
function hitBricks() {
//>> s3
  if (hitAt(ball.x, ball.y)) vy = -vy;
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
}
```

#### 6.10.8 Lab: Hit with the edges

```js
// 6.10.8 Lab: Hit with the edges (reference solution).

const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
  '########',
  '########',
  '##.##.##',
  '########',
  '.######.',
];
const BRICK_ROWS = WALL.length;      // 5
const BRICK_COLS = WALL[0].length;   // 8
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let score;
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  bricks = makeBricks();
  score = 0;
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  movePaddle();
  moveBall();
  hitBricks();
  drawBricks();
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
  if (ball.y > 400 + R) serve();
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (WALL[r][c] === '#') row.push(1);
      else row.push(0);
    }
    b.push(row);
  }
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Your hitAt from 6.9.11: when a brick is at pixel (x, y), take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// Did the ball hit a brick? Test its edges, and send it back the right way.
function hitBricks() {
//>> s1
  if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
//--
  if (hitAt(ball.x, ball.y)) vy = -vy;
//<<
//>> s2
  if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
}
```

#### 6.10.9 Lab: Win or lose

```js
// 6.10.9 Lab: Win or lose (reference solution).

const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
  '########',
  '########',
  '##.##.##',
  '########',
  '.######.',
];
const BRICK_ROWS = WALL.length;      // 5
const BRICK_COLS = WALL[0].length;   // 8
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let score, lives;
let state;              // 'play', 'won' or 'lost'
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  startGame();
}

// A new game: a whole wall, no points, three balls, and the first serve.
function startGame() {
  bricks = makeBricks();
  score = 0;
  lives = 3;
  state = 'play';
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  if (state === 'play') {
    movePaddle();
    moveBall();
    hitBricks();
    checkEnd();
  } else if (kb.presses('r')) {
    startGame();
  }
  drawBricks();
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (WALL[r][c] === '#') row.push(1);
      else row.push(0);
    }
    b.push(row);
  }
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Your hitAt from 6.9.11: when a brick is at pixel (x, y), take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// Did the ball hit a brick? Test its edges, and send it back the right way.
function hitBricks() {
  if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
  if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
//>> s1
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) n += 1;
    }
  }
//<<
  return n;
}

// Has the ball been lost, or the wall cleared?
function checkEnd() {
//>> s2
  if (ball.y > 400 + R) {
    lives -= 1;
    if (lives === 0) state = 'lost';
    else serve();
  }
//--
  if (ball.y > 400 + R) serve();
//<<
//>> s3
  if (bricksLeft() === 0) state = 'won';
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
  text('bricks left: ' + bricksLeft(), 140, 24);
  text('lives: ' + lives, 320, 24);
  if (state === 'won') text('You cleared the wall! Press R', 85, 260);
  if (state === 'lost') text('Out of balls. Press R', 115, 260);
}
```

#### 6.10.10 Lab: Pick a mode (the finished Breakout)

```js
// 6.10.10 Lab: Pick a mode (reference solution: Breakout, finished).

const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
  '########',
  '########',
  '##.##.##',
  '########',
  '.######.',
];
const BRICK_ROWS = WALL.length;      // 5
const BRICK_COLS = WALL[0].length;   // 8
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let paddle, ball;
let vx, vy;             // the ball's speed: pixels per frame across, and down
let score, lives;
let state;              // 'title', 'play', 'won' or 'lost'
let control = 'mouse';  // 'mouse' or 'keys': who moves the paddle

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';
  ball.color = 'white';
  state = 'title';
  startGame();
}

// A new game: a whole wall, no points, three balls, and the first serve.
function startGame() {
  bricks = makeBricks();
  score = 0;
  lives = 3;
  serve();
}

// Put the ball back above the paddle, heading up and to the right.
function serve() {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}

function draw() {
  background('#111');
  if (state === 'title') {
    pickMode();
  } else if (state === 'play') {
    movePaddle();
    moveBall();
    hitBricks();
    checkEnd();
  } else if (kb.presses('r')) {
    startGame();
//>> s3
    state = 'title';
//--
    state = 'play';
//<<
  }
  drawBricks();
}

// The title screen waits here until a key picks how the paddle moves.
function pickMode() {
//>> s2
  if (kb.presses('1')) {
    control = 'mouse';
    state = 'play';
  }
  if (kb.presses('2')) {
    control = 'keys';
    state = 'play';
  }
//<<
}

function movePaddle() {
  if (control === 'mouse') {
    paddle.x = mouse.x;
  }
  if (control === 'keys') {
    if (kb.pressing('left')) paddle.x -= 6;
    if (kb.pressing('right')) paddle.x += 6;
  }
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
}

function moveBall() {
  ball.x += vx;
  ball.y += vy;
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
  }
}

// Read the wall from WALL: a 1 for every #, a 0 for every gap.
function makeBricks() {
  const b = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      if (WALL[r][c] === '#') row.push(1);
      else row.push(0);
    }
    b.push(row);
  }
  return b;
}

// Draw a rectangle for every cell that holds a 1, in its row's colour.
function drawBricks() {
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) {
        fill(ROW_COLORS[r]);
        rect(c * BW, TOP + r * BH, BW, BH);
      }
    }
  }
}

// Your hitAt from 6.9.11: when a brick is at pixel (x, y), take it out and say true.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
  return false;
}

// Did the ball hit a brick? Test its edges, and send it back the right way.
function hitBricks() {
  if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
  if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) n += 1;
    }
  }
  return n;
}

// Has the ball been lost, or the wall cleared?
function checkEnd() {
  if (ball.y > 400 + R) {
    lives -= 1;
    if (lives === 0) state = 'lost';
    else serve();
  }
  if (bricksLeft() === 0) state = 'won';
}

function drawTop() {
  fill('white');
  textSize(16);
  text('score: ' + score, 12, 24);
  text('bricks left: ' + bricksLeft(), 140, 24);
  text('lives: ' + lives, 320, 24);
//>> s1
  if (state === 'title') {
    textSize(28);
    text('BREAKOUT', 130, 205);
    textSize(16);
    text('Press 1 to play with the mouse', 56, 240);
    text('Press 2 to play with the arrow keys', 32, 265);
  }
//<<
  if (state === 'won') text('You cleared the wall! Press R', 85, 260);
  if (state === 'lost') text('Out of balls. Press R', 115, 260);
}
```

### 8.2 Live blocks

#### 6.10.3 Worked Example (`E3`)

```js
// A ball in a box. Move the mouse to move the paddle.
const R = 6;            // the ball's radius: half of its 12-pixel width
const PADDLE_W = 80;    // the paddle is 80 pixels wide

let paddle, ball;
let vx = 3;             // pixels per frame across: + is right, - is left
let vy = -4;            // pixels per frame down: + is down, - is up
let bounces = 0;

function setup() {
  new Canvas(400, 400);
  paddle = new Sprite(200, 370, PADDLE_W, 12, 'static');
  paddle.color = 'white';
  ball = new Sprite(200, 300, R * 2);
  ball.collider = 'none';   // nothing pushes the ball: this code moves it
  ball.color = 'gold';
}

function draw() {
  background('#111');

  // The paddle follows the mouse, and stays on the screen.
  paddle.x = mouse.x;
  if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
  if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;

  // Move the ball one step.
  ball.x += vx;
  ball.y += vy;

  // A bounce is a flipped sign. x is the ball's CENTRE, so it touches a wall at R, not 0.
  if (ball.x < R || ball.x > 400 - R) vx = -vx;
  if (ball.y < R) vy = -vy;

  // The paddle: only while the ball is coming down, then steer by where it landed.
  if (ball.overlaps(paddle) && vy > 0) {
    vy = -vy;
    vx = (ball.x - paddle.x) / 10;
    bounces += 1;
  }

  // The bottom is open. A lost ball comes back to the middle.
  if (ball.y > 400 + R) {
    ball.x = 200;
    ball.y = 300;
    vx = 3;
    vy = -4;
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('vx: ' + round(vx, 1) + '   vy: ' + vy, 12, 24);
  text('paddle bounces: ' + bounces, 12, 48);
}
```

#### 6.10.7 Reading (`E7`)

```js
// The ball's edges. A big, slow ball goes straight up past a row of bricks.
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 100;        // the row of bricks starts 100 pixels down
const R = 12;           // a big ball, so you can see what happens: 24 pixels wide
const START_X = 104;    // where the ball starts across

let useEdges = false;   // false: test only the centre. true: test the four edges.
let bricks = [[0, 1, 0, 1, 0, 1, 0, 1]];
let ball, vx, vy, hits;

function setup() {
  new Canvas(400, 300);
  ball = new Sprite(START_X, 260, R * 2);
  ball.collider = 'none';
  ball.color = 'gold';
  vx = 0;               // straight up and down
  vy = -1;              // one pixel a frame, upwards
  hits = 0;
}

// The same hitAt as in your brick wall, for one row of bricks.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < bricks.length && c >= 0 && c < bricks[r].length && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    hits += 1;
    return true;
  }
  return false;
}

function draw() {
  background('#111');
  ball.x += vx;
  ball.y += vy;
  if (ball.y < R || ball.y > 260) vy = -vy;

  if (useEdges) {
    if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
    if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
  } else {
    if (hitAt(ball.x, ball.y)) vy = -vy;
  }

  for (let c = 0; c < bricks[0].length; c++) {
    if (bricks[0][c] === 1) {
      fill('orange');
      rect(c * BW, TOP, BW, BH);
    }
  }
}

function drawTop() {
  // The points the code tests, drawn on top of the ball: red is the centre, cyan the edges.
  fill('red');
  rect(ball.x - 2, ball.y - 2, 4, 4);
  if (useEdges) {
    fill('cyan');
    rect(ball.x - 2, ball.y - R - 2, 4, 4);
    rect(ball.x - 2, ball.y + R - 2, 4, 4);
    rect(ball.x - R - 2, ball.y - 2, 4, 4);
    rect(ball.x + R - 2, ball.y - 2, 4, 4);
  }
  fill('white');
  textSize(16);
  text(useEdges ? 'testing the four edges' : 'testing the centre only', 12, 24);
  text('bricks hit: ' + hits, 12, 290);
}
```

### 8.3 6.10.13 Challenges: solution (all three), as a diff from the starter (the starter is the 6.10.10 reference with its header changed)

```diff
@@ -1,14 +1,26 @@
-// 6.10.13 Challenges: Make it yours. Pick one rule and change it.
-
-const WALL = [          // the wall, as rows of text: # is a brick, . is a gap
-  '########',
-  '########',
-  '##.##.##',
-  '########',
-  '.######.',
+// 6.10.13 Challenges: Make it yours (reference solution: all three challenges).
+// My rules: key 3 plays with one life, the top row takes two hits, and a second wall
+// comes after the first. Without them there is one wall and every brick breaks at once.
+
+// Challenge 3: two walls, one after the other. # is a brick, 2 a two-hit brick, . a gap.
+const WALLS = [
+  [
+    '22222222',
+    '########',
+    '##.##.##',
+    '########',
+    '.######.',
+  ],
+  [
+    '2.2.2.2.',
+    '.#.#.#.#',
+    '########',
+    '#.#.#.#.',
+    '########',
+  ],
 ];
-const BRICK_ROWS = WALL.length;      // 5
-const BRICK_COLS = WALL[0].length;   // 8
+const BRICK_ROWS = WALLS[0].length;      // 5: every wall is the same size
+const BRICK_COLS = WALLS[0][0].length;   // 8
 const BW = 50;          // one brick is 50 pixels wide
 const BH = 20;          // and 20 tall
 const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
@@ -16,7 +28,8 @@
 const R = 6;            // the ball's radius: half of its 12-pixel width
 const PADDLE_W = 80;    // the paddle is 80 pixels wide
 
-let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
+let bricks;             // bricks[r][c]: 0 is a gap, 1 a brick, 2 a two-hit brick
+let wallNum;            // which wall in WALLS is up
 let paddle, ball;
 let vx, vy;             // the ball's speed: pixels per frame across, and down
 let score, lives;
@@ -36,6 +49,7 @@
 
 // A new game: a whole wall, no points, three balls, and the first serve.
 function startGame() {
+  wallNum = 0;
   bricks = makeBricks();
   score = 0;
   lives = 3;
@@ -76,6 +90,12 @@
     control = 'keys';
     state = 'play';
   }
+  // Challenge 1: a third mode, the mouse with only one ball.
+  if (kb.presses('3')) {
+    control = 'mouse';
+    lives = 1;
+    state = 'play';
+  }
 }
 
 function movePaddle() {
@@ -101,13 +121,15 @@
   }
 }
 
-// Read the wall from WALL: a 1 for every #, a 0 for every gap.
+// Read wall number wallNum: a 1 for every #, a 2 for every 2, a 0 for every gap.
 function makeBricks() {
+  const wall = WALLS[wallNum];
   const b = [];
   for (let r = 0; r < BRICK_ROWS; r++) {
     const row = [];
     for (let c = 0; c < BRICK_COLS; c++) {
-      if (WALL[r][c] === '#') row.push(1);
+      if (wall[r][c] === '#') row.push(1);
+      else if (wall[r][c] === '2') row.push(2);
       else row.push(0);
     }
     b.push(row);
@@ -119,8 +141,8 @@
 function drawBricks() {
   for (let r = 0; r < bricks.length; r++) {
     for (let c = 0; c < bricks[r].length; c++) {
-      if (bricks[r][c] === 1) {
-        fill(ROW_COLORS[r]);
+      if (bricks[r][c] > 0) {
+        fill(bricks[r][c] === 2 ? 'silver' : ROW_COLORS[r]);
         rect(c * BW, TOP + r * BH, BW, BH);
       }
     }
@@ -131,8 +153,8 @@
 function hitAt(x, y) {
   const c = floor(x / BW);
   const r = floor((y - TOP) / BH);
-  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
-    bricks[r][c] = 0;
+  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] > 0) {
+    bricks[r][c] -= 1;   // Challenge 2: a 2 becomes a 1, a 1 becomes a gap
     score += 10;
     return true;
   }
@@ -150,7 +172,7 @@
   let n = 0;
   for (let r = 0; r < bricks.length; r++) {
     for (let c = 0; c < bricks[r].length; c++) {
-      if (bricks[r][c] === 1) n += 1;
+      if (bricks[r][c] > 0) n += 1;
     }
   }
   return n;
@@ -163,7 +185,15 @@
     if (lives === 0) state = 'lost';
     else serve();
   }
-  if (bricksLeft() === 0) state = 'won';
+  if (bricksLeft() === 0) {
+    wallNum += 1;
+    if (wallNum === WALLS.length) {
+      state = 'won';
+    } else {
+      bricks = makeBricks();   // the next wall, and a fresh serve
+      serve();
+    }
+  }
 }
 
 function drawTop() {
@@ -172,12 +202,14 @@
   text('score: ' + score, 12, 24);
   text('bricks left: ' + bricksLeft(), 140, 24);
   text('lives: ' + lives, 320, 24);
+  if (state !== 'won') text('wall ' + (wallNum + 1) + ' of ' + WALLS.length, 12, 390);
   if (state === 'title') {
     textSize(28);
     text('BREAKOUT', 130, 205);
     textSize(16);
     text('Press 1 to play with the mouse', 56, 240);
     text('Press 2 to play with the arrow keys', 32, 265);
+    text('Press 3 for one ball, with the mouse', 27, 290);
   }
   if (state === 'won') text('You cleared the wall! Press R', 85, 260);
   if (state === 'lost') text('Out of balls. Press R', 115, 260);
```

---

## 9. How this was checked

1. **Headless, the course's own engine** (`scripts/moshion-harness.mjs`, the vendored `public/moshion/moshion.js`). Every starter and
   solution ran 600 frames with the mouse moving and no error. Behaviour, with synthetic keys and mouse:
   - 6.10.4: the paddle follows the mouse to 250, clamps at 40 and 360, the left arrow held 10 frames moves it 360 to 300 in keys
     mode, and the mouse is ignored in keys mode; the starter's paddle does not move.
   - 6.10.5: over 3000 frames the ball stays inside x 3-397 and above y 4, with 17 top bounces and 16 paddle bounces; a ball
     landing right of centre leaves with `vx` about +1.8; with nobody at the paddle the ball is served again 8 times in 1500
     frames; the starter's ball sits still.
   - 6.10.6: `bricks` is read from `WALL` exactly (rows `11011011` and `01111110` where the text has gaps); centre hits score;
     a ball going straight up at x 103 slides past the brick at column 1 with its centre only (the brick stays) and breaks it with
     the edge test (6.10.8); straight up into the middle of a brick, the centre test breaks it with the ball's centre at y 158
     (2 px inside a brick whose bottom is 160) and the edge test at y 162.
   - 6.10.9: with nobody at the paddle the game is lost after 315 frames with lives 0 and "Out of balls. Press R"; nothing moves
     after the end; R restores 36 bricks, 3 lives, score 0; the last brick sets `'won'` and shows "You cleared the wall! Press R";
     the starter never ends.
   - 6.10.10 (the finished game): the title shows its three lines; key 2 gives keys mode; R after a loss returns to the title;
     key 1 gives mouse mode; an autopilot under the ball clears the wall in 5481 frames with score 360 and 3 lives.
   - 6.10.13 solution: key 3 gives one life; a two-hit brick first leaves a 1 (still counted), then goes; both walls are
     cleared (second wall at frame 4824, won at 8461, score 760); the win screen does not say "wall 3 of 2"; R returns to the
     title with the first wall.
   - Live blocks: `E3` and its four Try items (section 4); `E7` as shipped breaks nothing at x 104, with `useEdges` breaks the
     scraped brick, and at x 75 turns with the ball's top at y 107 (centre) or 119 (edges).
2. **Real Chromium** (`playwright-cli`, throwaway session `breakout`, closed afterwards; a host page around `runner.html` served
   from the scratchpad, since the runner refuses to run top-level). The finished game: the title screen renders with every
   line inside the 400 px canvas (screenshot); a real key 1 started play in mouse mode; the paddle followed a real mouse to 200;
   the game ended `'lost'` with "Out of balls. Press R" on screen; a real R returned to the title with 3 lives; a real key 2
   started keys mode; a real ArrowLeft held for a second moved the paddle from 200 to the clamp at 40, and moving the mouse
   then did not move it. `E7` with `useEdges` on: the four cyan dots and the red centre are visible on the ball, and the brick
   the left dot enters breaks (`hits 1`). **Not run in a real browser:** the labs' starters, 6.10.4-6.10.9 as separate files,
   `E3`, the challenge solution, and `prompt()` inside the app's sandboxed iframe (the host page here had no sandbox).
3. **Grading** with the app's own `lib/grader.ts`, bundled by esbuild: section 7's 74 cases, 0 mismatches, and the timing.
4. **Repo gates** after regenerating (`generate-module-docs`, `generate-lessons-manifest`, `generate-ai-graders`,
   `generate-quiz-keys`, `generate-solutions`, `generate-lesson-starters`): `check-lesson-numbers` (838 lessons, no collisions),
   `check-lesson-groups` (6.10.json: 5 lessons over 13 screens), `check-prompt-pointers` (all pass, 0 forward, 0 self),
   `check-help-pointer-titles` (the 10 known older mismatches, none in 6.10), `check-lesson-citations` (every number resolves,
   no stale-numbering finding, the 2 known older forward notes), `check-hints`, `check-live-blocks`, `check-starters` (every
   reference full, every starter not), `check-solution-leak`, `test-quiz`, `audit-grader-tolerance --gate` (0 hits),
   `tsc --noEmit`; beyond the list, `test-moshion.mjs --corpus` (490/490), `check-concept-order`, `test-lesson-title-order`.

Not checked: the AI rubrics against the live model (the dev server has no key), the lesson pages in the app (no dev-server walk),
and no cs-student lens (beginner, moderate, advanced) has walked the module. Those are the next round, as they were for 6.9.

---

## 10. Module doc and groups

- `curriculum/modules/6.10_breakout.md`: `id "6.10"`, `title Breakout`, `quarter 2`, `weeks: [18]`, `environment moSHion`,
  `status draft`; header "Quarter 2 · Week 18 · after §6.9 Grids and Tile Maps"; SLO focus, module goal, pre- and
  post-requisite snapshots, a note (not a book section, 13 lessons, the ball is moved by code on purpose, the bricks are rects on
  purpose, the `vy > 0` rule, words in `drawTop()`), the one idea ("a sprite has edges, and a grid is asked about points"), and
  the unit-level assessments.
- `curriculum/groups/6.10.json`: five lessons, `plan-and-the-ball` (6.10.1-6.10.3), `paddle-and-bounce` (6.10.4-6.10.5),
  `bricks-and-edges` (6.10.6-6.10.8), `the-game` (6.10.9-6.10.10), `playtest-and-extend` (6.10.11-6.10.13). The `source` line
  names CodeHS's project modules and Video Game Design's Breakout ladder as structure only, as 6.9.json does.

---

## 11. Risks, decisions for the owner, and open questions

**Decided here (the owner should know):**

1. **Week 18, not 17.** PACING option B has weeks 17 (6.6, 6.7, 6.8: 760 min, 1.7 x the Q2 average) and 18 (7.1: 320 min).
   This module is 207 min: week 17 would become about 967 min (2.2 x), week 18 becomes 527 min (1.2 x). 6.9 itself sits at
   week 16 although it comes after 6.8 (week 17), so the `week` order is already not monotonic; 18 keeps 6.10 after 6.9 and
   before nothing it depends on. Week 18 now holds this module and the capstone.
2. **The game mode is the controls** (1 mouse, 2 arrow keys), not a difficulty. A difficulty mode (key 3, one ball) is
   challenge 1.
3. **13 lessons, not 10-12:** the second reading (6.10.7, the edges) was kept rather than folding the edge idea into a lab.
4. **The wall is read from text** in 6.10.6 (a step past 6.9.11, which built every cell as a 1). It joins 6.9.5 and 6.9.10 and
   makes challenges 2 and 3 a matter of letters.
5. **`hitAt` is given, finished, in every Breakout starter** (the student wrote it in 6.9.11); the student never rewrites it here.
6. **`prompt()` is accepted by 6.10.10 r2** as an alternative to the two key tests, because the lab teaches it as an option.
7. 6.9.11's hint "This is the function a Breakout ball will call later through `hitAt(ball.x, ball.y)`" now lands: 6.10.6 step 3
   is that call. Nothing in 6.9 was edited.

**Risks:**

1. **Pacing.** Week 18 at 527 min plus the capstone's own weight; if the capstone grows into the five-step close (PLACEMENT),
   week 18 will be heavy. 6.10.13 (30 min) is the obvious extension to drop into homework.
2. **The steering line is the only thing that makes the ball aimable**, and the grader requires it (r5). A student who skips it
   still gets a winnable game (checked), so the card is about play, not about finishing.
3. **`round(vx, 1)` in 6.10.5's words** uses moSHion's two-argument `round`, which no lesson teaches; it is given code the
   student only reads.
4. **`kb.presses('1')`** works because moSHion keeps one-character key names as they are; a keyboard layout where 1 needs Shift
   (some European layouts) would report `'!'`. Not tested.
5. **Static paddle moved by `x`.** Like Defender's ship (5.9.5), the paddle is a `'static'` body set by `x` every frame, and the
   ball is `'none'`, so they never touch physically; the bounce comes only from `overlaps()`. Every starter makes the paddle,
   and no step asks the student to change its collider.
6. **The tolerance cards are lax by design** (section 7, declined list): swapped edge pairing and a key/mode mix-up pass. Both
   show up immediately in play.
7. **Only the course's own checks and one real-browser run so far.** No student lens has walked it.
8. **Found outside this module, not edited:** `6.5.6 Reading: getItem Returns a String` says `getItem('highScore')` gives back
   `"250"`, but the vendored `public/moshion/moshion.js` `getItem` runs `JSON.parse` on what it stored and gives back the number
   250. A first draft of 6.10.10 cited 6.5.6 for "a string"; it now cites 3.1.9's `Number(prompt(...))` instead.

**Open questions:**

1. Should 6.10.13 offer a speed-up challenge (each paddle hit 5% faster) instead of the third mode? The card already accepts it
   as "an idea of your own".
2. Should the playtest (6.10.11) ask about the controls choice specifically (which felt better and why)? It is mentioned in the
   prompt but has no rubric item.
3. The renumber (PLACEMENT item 12) will move `6.10.N` with the rest of chapter 6; the folder prefix `6-10-breakout-` stays.
