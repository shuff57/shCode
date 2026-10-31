# Grids and tile maps spec (module 6.9)

Written 2026-10-31 on branch `codehs-inspiration`. Spec only: no lesson file exists yet. Every script in this file was run
in the course's own headless harness (`scripts/moshion-harness.mjs`, which loads the vendored `public/moshion/moshion.js`)
and the two most important ones also in a real Chromium; section 9 says how. The code blocks below are the verified files,
pasted by a script, not retyped. The requirement regexes were graded by the app's own `lib/grader.ts`.

**Placement.** The student has finished Units 1-5 and 6.1-6.8. The module doc and the title prefix say `6.9.N`; the real
renumber into the systems block after 6.1 is deferred (PLACEMENT.md item 12). `week: 16` in every `lesson.json`.
Folder names (`6-9-grids-<n>-<slug>`) are the D1 ids, so they are final once shipped; only the displayed title number
moves at the renumber.

**Size.** 14 lessons, 234 minutes by `estimateMins` (3 h 54 min): 3 readings, 1 worked example, 6 labs, 1 plan (AI), 1 playtest (AI),
1 check, 1 challenges. The brief aimed at 10-14 lessons and 4-5 hours; the minutes are `estimateMins`, which PACING.md notes is not contact time.

**Hand-off to Breakout.** The module ends with a brick wall the student built: `makeBricks()`, `drawBricks()`,
`hitAt(x, y)` and `bricksLeft()`. A Breakout module keeps those four and adds a ball that calls `hitAt(ball.x, ball.y)`.
The names are fixed in section 3 for that reason.

---

## 1. What the student builds, and why this shape

Two small programs, one idea.

**Part 1, Coin Maze (6.9.1-6.9.8).** A top-down maze 10 tiles by 10 (400 x 400, tiles 40 x 40). A blue square walks a maze of
dimgray walls, picks up gold coins, and the green goal opens only when no coin is left. Three levels held in a list of maps;
touching the goal with no coins left runs `level.delete()` and builds the next level; after the last one the screen says
"You escaped!"; R starts over. The level is written as rows of text and built by moSHion's `Tiles`.

**Part 2, a grid kept as data (6.9.9-6.9.11).** First a clickable 8 x 8 "lights" grid (an array of arrays of `true`/`false`,
drawn with `rect`, a click flips a cell, a count of lit cells), then a wall of bricks (an array of arrays of `1`/`0`, built
by two nested loops, drawn only where the cell is 1, a click removes a brick, a count of bricks left). Nothing here is a
sprite: the point is that **the grid is the data and the picture is drawn from it every frame**.

| Choice | Reason |
| --- | --- |
| Top-down maze, not a platformer | A platformer needs gravity, a ground check, jumping, and `colliding(ground)` is also true on walls and ceilings (MOSHION-GAPS gap 4). Top-down needs none of it, so every new idea is about the map. `world.gravity.y = 0` is one line, taught on 6.9.2. |
| A list of three maps and `level.delete()` | The brief's "collect everything, load the next level". It is the only place `Tiles`' result being a Group (6.1) matters: one `delete()` clears the level. |
| "Find the player start" scan on 6.9.5-6.9.6 | `P` is deliberately NOT in the legend, so `Tiles` treats it as an empty cell and the student has to find it by scanning the text. This is the course's first row/column to pixels conversion that is not handed over. |
| `tileAt(x, y)` and the click-to-cell conversions | The reverse, pixels to row/column with `floor`, is the one place pixels and cells meet. It is taught once on 6.9.5 and then used by every later lab (`tileAt`, `clickCell`, `hitAt`). |
| The brick wall is `rect`s, not sprites | `Tiles` makes a sprite per tile and moSHion tests every sprite pair each frame. Maps here stay at 100 tiles. A wall of rects costs nothing, and the Breakout module can still turn the data into sprites later (Challenge ideas). |
| Booleans in the lights grid, 1/0 in the bricks | Two honest ways to hold a cell. Lights flip with `!`; bricks are counted and (in the challenge) go 2, 1, 0. |
| No key-press mode select | The brief says it is not part of this module. Each program is its own lab with its own script. |

**Kept out on purpose:** platform physics, `camera`, animation, sound, `extends`, `Walls`, procedural maze generation,
`Array(n).fill` (not taught; the grader accepts it if a student finds it), two-dimensional `Array.from`, flood fill.

---

## 2. What the student already knows, and what this module adds

### Assumed from before 6.9 (each is taught on the screen named, titles as displayed)

| Idea | Taught in |
| --- | --- |
| A string has `.length` and `word[i]` is one letter, counted from 0 | 1.2.14 Reading: String Methods in Practice; 2.2.19 Worked Example: Walking Through a Word |
| An element of an array can be an array; `grid[r][c]` reads row then cell; `grid.length` counts rows, `grid[0].length` cells in a row; write with `grid[r][c] = v` | 3.3.20 Reading: Lists Inside Lists; 3.3.21 Worked Example: A Tic-Tac-Toe Board as a Nested Array; 3.3.22 Lab: Read and Update a Nested Array |
| `array.push(x)`; `row.join(' ')` | 3.3.21; 5.4.6 Lab: Pipes that come and go |
| Nested `for` loops, the inner finishes before the outer steps | 2.4.24 Reading: Nested Loops; 2.4.25 Worked Example: A Multiplication Table; 2.4.32 Print a Grid Pattern |
| `return` hands a value back; an object literal `{ x: 1, y: 2 }` and `obj.x` | 3.2.11 Reading: Getting a Value Back with `return`; 3.5.3 Worked Example: An Object Literal for One Record |
| `&&`, `||`, `!`; truthy and falsy (an unset variable is falsy); the ternary `a ? b : c` | 2.1.29 Reading: Logical Operators: && \|\| !; 2.1.33 Flip It with !; 2.1.12 Reading: Truthy and Falsy Values; 2.1.20 Reading: The Conditional Operator ? |
| `floor`, `random`, `frameCount` | 5.2.1 Reading: Random numbers and timers |
| A column and a row to a pixel position: `n * CELL + CELL / 2` (the centre of a cell) | 5.5.2 Reading: A world on a grid |
| `kb.pressing('left')`, `kb.presses('r')`, `vel.x`/`vel.y` | 5.1.13 Reading: kb.pressing(key); 5.1.16 Reading: Velocity: vel.x and vel.y |
| `collider = 'none'` for a pass-through thing; `world.gravity.y` | 5.2.17 Lab: Reaching the Goal; 5.2.6 Reading: Gravity |
| `sprite.delete()`; an array of sprites kept and cleaned up | 5.4.6 Lab: Pipes that come and go |
| `text(str, x, y)`, `fill`, `textSize`; words go in `drawTop()` | 5.1.21 Reading: Words on the canvas: text(); 5.4.5 Reading: A world that scrolls |
| The `playing`-style flag and a restart function that puts everything back, R to restart | 5.4.8 Lab: Crash, and start again; 5.5.6 Lab: Grow and eat |
| A Group, its defaults (`group.collider`, `.color`, `.diameter`), `new group.Sprite()`, `.length`, `for...of` | 6.1.3 Reading: moSHion docs: Groups |
| `player.overlaps(group, (p, other) => { ... })`, once per overlapping pair | 6.2.3 Reading: moSHion docs: Collisions + Overlaps; 6.2.2 Worked Example: Apple Catcher |
| `mouse.x`, `mouse.y`, `mouse.presses()` (true for one frame per click) | 6.7.3 Reading: moSHion docs: mouse.x and mouse.y; 6.7.5 Reading: moSHion docs: mouse.presses() |
| `fill(c)` then `rect(...)` has been SEEN (a pause overlay, a dialog) but the corner rule was never said | 6.6.20 Worked Example: Adding a Pause State (used, not explained) |

Classes are not used. Groups are allowed (6.1 precedes this module) but the module says in words what a Group default does
the first time it is asked (6.9.2).

### New in this module (taught on the screen named, before any lab asks for it)

| New idea | Taught in | First asked in |
| --- | --- | --- |
| A level written as an array of strings; `new Tiles(map, x, y, w, h, legend)`; the legend (an object from a letter to a Group); an unlisted letter is an empty cell | 6.9.2, 6.9.3 | 6.9.4 |
| `x, y` of `Tiles` is the CENTRE of the top-left tile, so half a tile in | 6.9.2, 6.9.3 (Try this 3) | 6.9.4 (card r5) |
| `Tiles` returns a Group of every tile, so `level.length` and `level.delete()` | 6.9.2, 6.9.3 | 6.9.8 |
| `world.gravity.y = 0` and `rotationLock = true` for a top-down sprite | 6.9.2 (one paragraph) | 6.9.4 (given in the starter, never asked) |
| Scan a map with two loops; `map[r][c] === 'P'`; a function can return `{ x, y }` | 6.9.5 | 6.9.6 |
| Cell to pixel (`c * TILE + TILE / 2`) applied to a map the student did not place; pixel to cell with `floor` (and why not `round`) | 6.9.5 | 6.9.6 |
| A string cannot be changed letter by letter (`map[1][2] = 'x'` does nothing) | 6.9.5 | never asked, only warned |
| A list of maps: `levels[n]` is a map | 6.9.5 | 6.9.8 |
| An index that is off the grid gives `undefined`, and reading a cell of `undefined` stops the sketch; check row and column first | 6.9.5 (mouse over the map), 6.9.9 | 6.9.10 |
| Build an array of arrays: `const row = []`, push cells, push the row | 6.9.9 | 6.9.10 |
| `rect(x, y, w, h)`: x, y is the TOP-LEFT corner (a sprite's x, y is its centre); the colour is the last `fill`; text uses that same `fill` | 6.9.9 | 6.9.10 |
| A grid that does not start at pixel 0: take the offset off before dividing, add it back when drawing | 6.9.9 (the live block starts 40 down) | 6.9.11 |
| Flip a boolean with `!`; turn a 1 into a 0 | 6.9.9 | 6.9.10, 6.9.11 |
| Count cells with two loops and an `if` | 6.9.9 | 6.9.10, 6.9.11 |

---

## 3. Conventions every builder follows

- **Folders** `6-9-grids-<n>-<slug>` (list below). **Titles** start with the displayed number (`6.9.4 Lab: Build the maze`).
- **lesson.json fields**, copied from the 5.5 Snake folders: `category: "Unit 2: moSHion: Applied Game Development"`,
  `unit: "6.9 Grids and Tile Maps"`, `slos: ["SLO-3", "SLO-4"]`, `week: 16`, `points: 0`. Readings: `type "lesson", preview "reading"`,
  `contentFile "content.md"`. Worked example: `type "lesson", preview "example"` with a `js live` block. Labs and challenges:
  `type "lesson", preview "moshion"`, `script.js` + `solution.js`, `steps`, `requirements` with `points: 0`. Quiz:
  `type "assignment", preview "quiz", points 0, quiz.passPercent 70`. Plan and playtest: `type "assignment", preview "assignment",
  points 0`, an `aiGrader` with `model "glm-5.3-flash:cloud"`, exactly the shape of `lessons/5-5-snake-1-plan-break-snake-into-parts/lesson.json`
  and `lessons/5-5-snake-9-playtest-and-reflect/lesson.json`.
- **content.md is NOT rendered in a moshion lab.** Everything a lab student needs (the story, the three challenges) goes in
  `description` and the step `instructions`/`hints`. Readings, the example and the quiz do use `content.md`.
- **Requirement cards** (`id`, `title`, `description`, `type`, `file: "script.js"`, `pattern`, `flags: ""`, `points: 0`,
  `status: "pending"`; `function` on `inFunction`). Descriptions are student-facing words and end with
  `Help: <number> (<exact title without the number>)`; section 7 has them written out. Optional hardening, not needed for the
  patterns below: `names` ({ "grid": "array", "bricks": "array" }) lets a renamed top-level variable still pass.
- **Code shape** (every script and example): `background('#111')`; words in `drawTop()` with `fill('white')` first; row first,
  then column everywhere (`grid[r][c]`, `map[r][c]`, loop variables `r` then `c`); canvas sizes below.
- **Fixed names, shared by every lab** (a lab's starter, solution, hints and cards all use them):

| Program | Names |
| --- | --- |
| Coin Maze | constants `TILE = 40`; `levels` (array of maps), `map` (the current map, a global `let`), `level` (the `Tiles` result), groups `walls`, `coins`, `goals`, sprite `player` (26 x 26, speed 3), `levelNum`, `score`, `won`; functions `setup()`, `startGame()`, `loadLevel(n)`, `draw()`, `movePlayer()`, `findStart(map)` (returns `{ x, y }`), `tileAt(x, y)`, `collect()`, `checkGoal()`, `drawTop()`. Legend letters `#` walls, `c` coin, `G` goal, `P` player start (not in the legend), space and `.` empty. Colours dimgray, gold (diameter 14), limegreen, deepskyblue. |
| Lights grid | constants `COLS = 8`, `ROWS = 8`, `CELL = 50`; `grid` (`grid[r][c]` is `true` when lit); functions `makeGrid()`, `drawGrid()`, `clickCell(x, y)`, `countLit()`, `drawTop()`. Canvas 400 x 440 (the grid is 400 x 400, words in the strip under it). |
| Brick wall | constants `BRICK_COLS = 8`, `BRICK_ROWS = 5`, `BW = 50`, `BH = 20`, `TOP = 60`, `ROW_COLORS`; `bricks` (`bricks[r][c]` is 1 or 0), `score`; functions `setup()`, `startGame()`, `makeBricks()`, `drawBricks()`, `hitAt(x, y)` (true when it removed a brick), `bricksLeft()`, `drawTop()`. Canvas 400 x 400, the wall starts 60 down. |
| Challenges | the brick wall plus `SHAPE` (array of strings: `#` brick, `2` two-hit brick, `.` gap). |

- **A Group default is said in words where first used (6.9.2):** "a Group's defaults are copied onto every sprite made through
  it, so you set them once on the Group instead of on each tile."
- **AI-graded screens are 0-point and lenient** (`feedback_pseudocode-grading-lax`). Prompts open with the 5.5.1 sentence
  ("Everything you need is on this page and in ... : go back and reread it if you get stuck. A few short sentences per
  answer is plenty, in your own everyday words."). Every rubric item's description is its own first sentence followed by the
  **lenient tail** of 5.5.1 (plan) or 5.5.9 (playtest), verbatim, with the game name changed (section 6).

---

## 4. The lessons

| # | Folder | Kind | One line | Pts | Min |
| --- | --- | --- | --- | --- | --- |
| 6.9.1 | `6-9-grids-1-plan-break-the-coin-maze-into-parts` | plan (AI) | The maze, the lights grid and the bricks in a paragraph; name the parts, what is remembered, what first, what is hard. | 0 | 12 |
| 6.9.2 | `6-9-grids-2-reading-a-map-is-rows-of-text` | reading | A level is an array of strings; the legend; Group defaults; `Tiles`; the centre rule; `level.delete()`. | 0 | 8 |
| 6.9.3 | `6-9-grids-3-example-a-level-from-text` | example | A live 10 x 6 level with coins; edit the letters, the legend and the tile size and watch. | 0 | 10 |
| 6.9.4 | `6-9-grids-4-lab-build-the-maze` | lab | Three Group defaults and the `Tiles` call: the maze appears. | 0 | 20 |
| 6.9.5 | `6-9-grids-5-reading-reading-a-map-as-data` | reading | Scan a map with two loops; row and column to pixels and back with `floor`; bounds; a list of maps. | 0 | 12 |
| 6.9.6 | `6-9-grids-6-lab-find-the-start` | lab | `findStart` scans for P and returns the pixel centre; put the player there; `tileAt` goes the other way. | 0 | 20 |
| 6.9.7 | `6-9-grids-7-lab-coins-and-the-goal` | lab | Pick up coins, count them, and open the goal only when none are left. | 0 | 20 |
| 6.9.8 | `6-9-grids-8-lab-the-next-level` | lab | `loadLevel(n)`: delete the old level, build level n, place the player; the goal advances; the last level wins. | 0 | 20 |
| 6.9.9 | `6-9-grids-9-reading-a-grid-is-data` | reading | A grid is an array of arrays; the screen is a picture drawn from it; click to cell; bounds; flip; count. | 0 | 12 |
| 6.9.10 | `6-9-grids-10-lab-light-the-grid` | lab | Build the grid with two loops, draw it from the data, flip a cell on click, count the lit cells. | 0 | 25 |
| 6.9.11 | `6-9-grids-11-lab-a-wall-of-bricks` | lab | Build a wall with two loops, remove the brick at a pixel (with an offset), count the bricks left. | 0 | 25 |
| 6.9.12 | `6-9-grids-12-playtest-and-reflect` | playtest (AI) | Play the maze and the wall, find a surprise, link it to code, choose a change. | 0 | 10 |
| 6.9.13 | `6-9-grids-13-quiz-grids-and-tile-maps` | check | Seven questions on rows and columns, pixels and cells, the offset, bounds and `level.delete()`. | 0 | 10 |
| 6.9.14 | `6-9-grids-14-challenges-make-it-yours` | challenges | Points by row, two-hit bricks, a wall read from text. | 0 | 30 |

Titles: `6.9.1 Plan: Break the Coin Maze into parts`, `6.9.2 Reading: A map is rows of text`, `6.9.3 Worked Example: A level from text`,
`6.9.4 Lab: Build the maze`, `6.9.5 Reading: Reading a map as data`, `6.9.6 Lab: Find the start`, `6.9.7 Lab: Coins and the goal`,
`6.9.8 Lab: The next level`, `6.9.9 Reading: A grid is data`, `6.9.10 Lab: Light the grid`, `6.9.11 Lab: A wall of bricks`,
`6.9.12 Playtest and reflect: Coin Maze and bricks`, `6.9.13 Check: Grids and tile maps`, `6.9.14 Challenges: Make it yours`.

Total 12 + 8 + 10 + 20 + 12 + 20 + 20 + 20 + 12 + 25 + 25 + 10 + 10 + 30 = **234 minutes**.

### 6.9.1 Plan (AI-graded, 0 points)
Content as 5.5.1: "Plan before you build", then **the module in one paragraph**: "You will build a maze whose levels are rows of
text (a blue square, gold coins, a green exit that stays shut until every coin is gone, three levels). Then you will keep a
grid of lights as data, and finish with a wall of bricks you can click away. In the maze the picture comes from the map; in
the grids the picture comes from an array of arrays." Prompt pointer: `this page and 5.5.1 (Plan: Break Snake into parts)`.
Questions and rubric items (section 6): `parts` (four or more: walls, coins, goal, player, start position, levels, score,
winning, restart), `remember` (two or more things kept between frames: which level, the map, the score, where the coins
are, whether the game is won), `first` (a first part and any reason), `unsure` (one part they are unsure how to build).

### 6.9.2 Reading: A map is rows of text
Points to make, in order: (1) a level can be written as an array of strings, one string per row; each letter is one tile; show the
six-line map from 6.9.3. (2) Reading it: `map[2][5]` is row 2, column 5 (a string indexes like the words in 2.2.19; the array of
rows reads like 3.3.20); `map.length` is the number of rows and `map[0].length` the number of columns; **every row must be the
same length** (a short row leaves a hole and nothing warns you). (3) `new Tiles(map, x, y, w, h, legend)`: the legend is an object
from a letter to a Group, `{ '#': walls, 'c': coins }`; **a letter the legend does not name is an empty cell** (space, `.`, and
later `P`). (4) Group defaults in words (the sentence in section 3): `walls.collider = 'static'` (never moves),
`coins.collider = 'none'` (walk through), `coins.diameter = 14` (a small circle instead of a full tile); the group's default size
wins over the tile size. (5) **`x, y` is the CENTRE of the top-left tile**, like a sprite's x, y: for 40-pixel tiles starting at the
canvas corner pass `20, 20`, not `0, 0` (show what 0, 0 does: the whole level sits half a tile up and left). A small table of the
six arguments. (6) What `Tiles` gives back is itself a Group of every tile: `level.length` counts them, `level.delete()` clears the
level, and a tile deleted on its own (a coin picked up) leaves the group. (7) Top-down: `world.gravity.y = 0` (5.2.6 set it to
10) and `player.rotationLock = true` so the box does not tip at a corner. (8) Each tile is a sprite, so keep a map to about 20 x 12
or fewer; this module's maps are 10 x 10. Glossary: tile, map, legend, row, column, centre.

### 6.9.3 Worked Example: A level from text
Live block `E3` (section 8.2, verified; 34 tiles built: 30 walls and 4 coins). "What you'll see": a small maze, a blue square you
move with the arrows, four gold coins that disappear when touched; the top line counts tiles in the level, the bottom walls and
coins. **Try this:** (1) change a `#` to a space and Run: that wall is gone; (2) delete `'c': coins` from the legend and Run: the
coins vanish because the letter is no longer named; (3) change `TILE` to `30` and Run: the level is the wrong size and shifted;
now change the two `20`s in the `Tiles` line to `15` and it sits right again (the centre of the first tile is half a tile in);
(4) delete one letter from one row and see the hole. The text under the block says what each Try found (the centre rule is Try 3).

### 6.9.4 Lab: Build the maze
Steps (student-facing; the starter already makes the three empty Groups, the map, the canvas, the player and its movement, and
shows `coins left` in the corner, which reads 0 until step 3 works):
**s1 Walls that never move**: "The starter made `walls = new Group()`. Set its defaults: its `collider` is `'static'` (it never
moves when you bump it) and its `color` is `'dimgray'`." Hints: `walls.collider = 'static';`; `walls.color = 'dimgray';`.
**s2 Coins and the goal**: "Set the defaults for `coins` (`collider` `'none'`, `diameter` 14, `color` `'gold'`) and for `goals`
(`collider` `'none'`, `color` `'limegreen'`). `'none'` is what lets the player walk through them." Hint: the same four lines as
the walls, with different words.
**s3 Build the level**: "Make `level = new Tiles(map, 20, 20, TILE, TILE, legend)`. The legend is an object: `'#'` builds `walls`, `'c'` builds `coins`,
`'G'` builds `goals`. The first tile's centre is half a tile in, which is 20." Hints: `{ '#': walls, 'c': coins, 'G': goals }`;
"if the level is in the wrong place, check the two numbers after `map`."
Run it: `coins left: 5` and a maze you can walk (the P is an empty cell for now; the player starts at a fixed spot, cell 1, 1). Cards: r1 walls are
static (Help 6.9.2), r2 coins let you walk through (6.9.2), r3 the goal lets you walk through (6.9.3), r4 the level is built from the map with
Tiles and the legend (6.9.2), r5 the first tile is centred half a tile in (6.9.3). Solution and starter: section 8.1 (`S4`).

### 6.9.5 Reading: Reading a map as data
Points, in order: (1) one map, two uses: `Tiles` turns it into sprites, and your own code can read it as data, for things `Tiles`
cannot do (find where the player starts). (2) Scan: two loops, `r` over `map.length`, `c` over `map[r].length`, test `map[r][c]`
(2.4.24 recalled); show counting the coins with `n += 1`. (3) **`P` is not in the legend, so `Tiles` ignores it**, and the scan is how you
find it. (4) A function can hand back two values as an object: `return { x: 140, y: 60 }`, read with `start.x` and `start.y` (3.5.3,
3.2.11 recalled); say what to return when the letter is missing. (5) **Cell to pixels:** the centre of column `c` is `c * TILE + TILE / 2`,
the same rule as 5.5.2's `cellToPixel`, now applied to a map the student did not place. (6) **Pixels back to a cell:** `floor(x / TILE)` is the
column and `floor(y / TILE)` the row; worked example with `x = 150`, `TILE = 40`: 3.75 floors to 3, and `round` would say 4, the next tile.
(7) This is the one place pixels and cells meet: the map speaks cells, sprites speak pixels, and every game that mixes them needs exactly
these two conversions. Name the pair `findStart` (cells to pixels) and `tileAt` (pixels to a cell). (8) The mouse can be anywhere, so
`map[r][c]` for a mouse position can fail: a row that does not exist is `undefined`, and `undefined[c]` stops the sketch. Check
`r >= 0 && r < map.length && c >= 0 && c < map[r].length` first (show it in the live block). (9) A string cannot be changed by index:
`map[1][2] = 'x'` silently does nothing. To change a grid while the game runs you need an array of arrays (6.9.9). (10) A game with several levels keeps
a list of maps: `levels[0]` is a whole map, `levels[1][3][2]` is a letter, `levels.length` is how many levels. Live block `E5`
(section 8.2): scans for P and shows the pixel start; hover shows `row 3, column 6 holds [c]`, and off the canvas shows nothing instead of crashing.
Glossary: scan, floor, bounds, `undefined`.

### 6.9.6 Lab: Find the start
Starter (section 8.1, `S6`): the maze from 6.9.4 complete, the player created at (0, 0), `findStart(map)` and `tileAt(x, y)` empty,
and `standing on: [ ]` in the corner. Steps: **s1 Scan for P**: "Write `findStart(map)`. Loop over the rows and, inside, over the letters of each
row. When `map[r][c]` is `'P'`, `return` an object `{ x, y }` with the pixel centre of that tile." Hints: the two loops are the
nested loops of 6.9.5; the centre of column `c` is `c * TILE + TILE / 2`. **s2 Start there**: "In `setup()`, ask `findStart(map)` for the start
and put the player on it: `player.x = start.x` and the same for `y`." **s3 Pixels back to a tile**: "Write `tileAt(x, y)`: turn the pixels
into a column and a row with `floor` and `TILE`, and give back `map[row][col]`." Hint: row comes from `y`, column from `x`.
When it works: the player stands on the P (the corner says `standing on: [P]`), and walking shows `[ ]` on open floor and `[c]` on a coin. Cards: r1 findStart looks at every letter of every row, r2 it looks for the letter P, r3 row and column become pixels, r4 the player is
put on the start, r5 tileAt turns pixels into a row and a column with floor (all Help 6.9.5). Not machine-checked: a `tileAt` with row and column
swapped (see risks); the `[P]` readout at the start is symmetric on this map, so the hint says "walk to the first coin and read the corner".

### 6.9.7 Lab: Coins and the goal
Starter (`S7`): everything above plus `score`, `won`, empty `collect()` and `checkGoal()`, a draw loop that stops moving when `won`, and
a HUD with `coins left`, `score` and the "Grab every coin first!" line. Steps: **s1 Pick up the coins**: "In `collect()`, when the player overlaps
`coins`, delete that coin and add 1 to `score`. (Use the callback form from 6.2.3.)" Hint: `player.overlaps(coins, (p, coin) => { ... })`.
**s2 The goal opens last**: "In `checkGoal()`, when no coins are left AND the player is on `goals`, set `won` to `true`." Hints: `coins.length === 0`;
"try the goal first: nothing should happen until the last coin is gone." Cards: r1 walking over a coin picks it up (Help 6.2.3), r2 each coin adds to
the score (6.9.3), r3 the goal only counts when no coins are left, r4 reaching the goal wins (both 6.9.3).

### 6.9.8 Lab: The next level
Starter (`S8`): `levels` holds three maps, `startGame()` resets `score`, `won` and `levelNum` and calls `loadLevel(levelNum)`, R calls `startGame()`,
`draw` and the HUD show "level 1 of 3"; `loadLevel(n)` and `checkGoal()` are empty (so the screen is blank until s1). Steps: **s1 Build level n**: "In `loadLevel(n)`:
delete the old level if there is one, set `map` to `levels[n]`, build the `Tiles` from it exactly as in 6.9.4, then put the player on the new level's P with
`findStart(map)`." Hints: "the first time there is no `level` yet, so ask `if (level)` before you delete (an unset variable is falsy, 2.1.12)"; "`level.delete()` from 6.9.2".
**s2 Next level, then the end**: "In `checkGoal()`, when no coins are left and the player is on the goal, add 1 to `levelNum`. If that was the last
level set `won` to `true`; otherwise call `loadLevel(levelNum)`." Hint: the last level is when `levelNum` has reached `levels.length`. Cards r1 the old
level is thrown away (Help 6.9.2), r2 the new level comes from the levels list (6.9.2), r3 the player is put on the new level's P (6.9.6), r4 reaching the
goal moves to the next level (6.9.7), r5 the last level ends the game (6.9.7). Finished game: `S8` solution, played to the end by the autopilot (section 9).

### 6.9.9 Reading: A grid is data
Points, in order: (1) The Coin Maze's map was text you could read but not change. A **grid** you can change is an array of arrays (3.3.20): `grid[r][c]`.
(2) **The grid is the truth; the screen is a picture drawn from it every frame.** To change what is shown you change the data. (3) Build one:
`const g = []`, then for each row `const row = []`, push the cells, `g.push(row)` (the whole row goes in as ONE item); say why two loops. (4) Draw it: two loops and
`rect(x, y, w, h)`; **`rect`'s x, y is the TOP-LEFT corner, not the centre**; `fill(...)` first (the colour is the last `fill`); the thin black outline is
the default and is what makes the grid lines; draw only the cells that hold a 1. Loop over the data's own size (`grid.length`, `grid[r].length`) so the loop never
disagrees with the data. (5) Click to cell: `c = floor(mouse.x / CELL)`, `r = floor((mouse.y - TOP) / CELL)`; **if the grid does not start at pixel 0, take the offset
off before dividing and add it back when drawing**. (6) **Check the cell exists before touching it**: `r >= 0 && r < grid.length && c >= 0 && c < grid[r].length`; `&&`
stops at the first false, so the row check comes before anything reads `grid[r]` (2.1.31 recalled). (7) Change a cell: a boolean flips with `!`
(`grid[r][c] = !grid[r][c]`, 2.1.33), a 0 or 1 with `grid[r][c] = grid[r][c] === 1 ? 0 : 1` or `= 0`. (8) Count with two loops and an `if`. (9) The words use the last `fill`, so
`fill('white')` before `text`; words go in `drawTop()`. (10) The link back: `Tiles` made sprites from letters and the letters could not be changed; a grid of numbers
can change, and sprites made from it are one more picture of it. Live block `E9` (section 8.2, 6 x 5, 40 down): click to flip orange/dark, row 0 printed on top.
Try this: click in the strip above the grid and under it (nothing happens); delete the `r >= 0 &&` half of the test and click the strip above (the sketch stops with an error). Glossary: grid, cell,
offset, bounds.

### 6.9.10 Lab: Light the grid
Starter (`S10`): the canvas (400 x 440), `grid = makeGrid()` in `setup()`, `draw()` calling `clickCell(mouse.x, mouse.y)` on each press, `drawGrid()`, and the words
`lit: n of 64` in the strip. `makeGrid()` returns an empty array, `drawGrid()` and `clickCell()` are empty and `countLit()` returns 0. Steps: **s1 Build the grid**: "In `makeGrid()` make
`ROWS` rows. Each is an empty array you push `COLS` values of `false` into, and each finished row is pushed onto `g`." **s2 Draw it from the data**: "In `drawGrid()`, visit every cell with
two loops. Set `fill` to `'gold'` for a lit cell and `'#334'` for an off cell, then draw it with `rect(c * CELL, r * CELL, CELL, CELL)`." **s3 A click flips a cell**: "In `clickCell(x, y)`,
turn the pixels into a column and a row with `floor` and `CELL`. If that row and column are on the grid, flip the cell." Hints: the strip under the grid gives row 8 and `grid[8]` is
`undefined`; "`!`". **s4 Count the lit cells**: "In `countLit()`, add 1 to `n` for every cell that is `true`." Cards (section 7): r1 built with two loops, r2 drawn from the grid, r3 a click becomes a row and a column with floor,
r4 a click outside the grid does nothing, r5 the click flips the cell, r6 countLit counts the lit cells (all Help 6.9.9).

### 6.9.11 Lab: A wall of bricks
Starter (`S11`): constants for the wall (`BW 50`, `BH 20`, `TOP 60`), `startGame()`, R restarts, a click calls `hitAt(mouse.x, mouse.y)`, `drawBricks()` is given (it draws a coloured `rect` for every 1 and nothing for a 0),
`drawTop()` shows `bricks left` and `score` and "Cleared!" once the wall is gone. `makeBricks()` returns `[]`, `hitAt()` returns `false`, `bricksLeft()` returns 0. Steps: **s1 Build the wall**: "In `makeBricks()` make `BRICK_ROWS` rows, each an array of
`BRICK_COLS` ones, and push each row onto `b`." **s2 Which brick is at this pixel?**: "In `hitAt(x, y)`, the column is `floor(x / BW)`. The wall starts `TOP` pixels down, so take that off first: the row is `floor((y - TOP) / BH)`. If that row and column are
inside the wall AND the cell is `1`, set it to `0`, add 10 to `score` and `return true`." Hints: "a click above the wall gives a negative row, a click under it a row that is too big"; "put the row and column tests before the `bricks[r][c]` test in the same `if`". **s3 Bricks left**: "In `bricksLeft()`
add 1 to `n` for every cell that is `1`." Try it: click a brick, click a gap, click above the wall. Cards r1-r6 (section 7; Help 6.9.9 and 6.9.10). `hitAt(x, y)` is the function a Breakout ball will call.

### 6.9.12 Playtest and reflect: Coin Maze and bricks (AI-graded, 0 points)
As 5.5.9. Content: play the finished Coin Maze to the end at least once and the brick wall to "Cleared!" once; try to break each (walk to the goal first; click outside the wall); what surprised
you. Questions and rubric ids `played`, `bug`, `cause`, `change` (section 6).

### 6.9.13 Check: Grids and tile maps (7 questions, passPercent 70)
Section 5.

### 6.9.14 Challenges: Make it yours
As 5.5.11 / 5.11.9. The script is the brick wall (section 8.3). The three challenges go in the steps' instructions (content.md is not shown):
**Challenge 1, points by row (easy)**: "Make the top rows worth more. In `hitAt`, change `score += 10` so a hit in row `r` scores `(BRICK_ROWS - r) * 10`, so the top row is worth 50 and the bottom 10." **Challenge 2, two-hit bricks (medium)**:
"Some bricks take two hits. Let a cell hold 2 as well as 1 and 0: build row 0 with 2s, make a hit lower the cell by 1 instead of setting it to 0, draw a 2 in `'silver'`, and change the places that test `=== 1` to `> 0` so a brick that
is still 1 still counts." **Challenge 3, a wall from text (hard)**: "Write the wall as rows of text in `SHAPE`: `#` is a brick, `2` a two-hit brick, `.` a gap. Make `makeBricks()` read it with `SHAPE[r][c]` (the same two-index read as a map in 6.9.5) and set `BRICK_ROWS` and `BRICK_COLS` from it." Steps: **s1 Pick a rule and change it** (hint for each challenge), **s2 Name what you changed** (a `//` comment at the top). Card: one card, r1, that any one of the three turns green.
Starter: the brick wall final with the header `// 6.9.14 Challenges: Make it yours. Pick one rule and change it.`. Solution (all three): section 8.3.

---

## 5. The check (6.9.13): quiz questions, answers and explanations

Seven questions, `quiz.passPercent: 70`, `points 0`. Option order below is the order to ship (the keys are C, B, B, D, A, C, D: A once, B twice, C twice, D twice); the correct option is not the longest
in any question where lengths differ (it is longest in 0 of the 5 non-numeric questions; q3 and q5 are numbers, so length means nothing). `source` is the lesson number shown and `sourceIds` the folder.

| id | Question | Options (answer in bold, in the order to ship) | Key | sourceIds |
| --- | --- | --- | --- | --- |
| q1-letter | `map` is an array of strings, one string per row. What does `map[2][5]` give you? | A) The whole of row 2<br>B) The pixel position of that tile<br>**C) The letter in row 2, column 5**<br>D) The letter in column 2, row 5 | C | 6-9-grids-2-reading-a-map-is-rows-of-text |
| q2-data | A lit cell must go dark when it is clicked. What do you change? | A) The colour of the rectangle that is on screen<br>**B) The value in the grid; the next draw shows it**<br>C) Nothing yet; the screen has to be cleared first<br>D) The size of CELL | B | 6-9-grids-9-reading-a-grid-is-data |
| q3-forward | TILE is 40. Which pixel x is the centre of column 3? | A) 120<br>**B) 140**<br>C) 160<br>D) 3 | B | 6-9-grids-5-reading-reading-a-map-as-data |
| q4-back | TILE is 40 and the mouse is at x = 150. Which column is it over, and how do you get it? | A) Column 4, from round(150 / 40)<br>B) Column 3.75, from 150 / 40<br>C) Column 150, since x is already a column<br>**D) Column 3, from floor(150 / 40)** | D | 6-9-grids-5-reading-reading-a-map-as-data |
| q5-offset | The wall starts TOP = 60 pixels down and each brick is BH = 20 tall. A click lands at y = 100. Which row is that? | **A) Row 2**<br>B) Row 5<br>C) Row 1<br>D) Row 4 | A | 6-9-grids-11-lab-a-wall-of-bricks |
| q6-bounds | The grid has 8 rows (0 to 7) and a words strip under it. A click lands in the strip, so floor(y / CELL) is 8. What happens if the code goes straight to grid[r][c] = ... ? | A) Nothing happens: JavaScript skips a row that is not there and carries on<br>B) The last row, row 7, is flipped instead<br>**C) grid[8] is undefined, so reading a cell from it stops the sketch**<br>D) The grid quietly grows a ninth row to fit the click | C | 6-9-grids-10-lab-light-the-grid |
| q7-delete | Why does loadLevel(n) call level.delete() before it builds the next level with Tiles? | A) It puts the player back on the P of the old level<br>B) It adds up the score once for every coin left<br>C) Tiles would refuse to build a second level while the first still exists<br>**D) The old walls and coins would stay on screen and keep blocking** | D | 6-9-grids-8-lab-the-next-level |

Explanations (one sentence each, restating the reason):

- `q1-letter`: The first index picks the row (a string), the second picks a letter in that row. Read it left to right: row, then column.
- `q2-data`: The grid is the truth and the screen is a picture drawn from it every frame. Change the data and the picture follows.
- `q3-forward`: Column 3 starts at 3 * 40 = 120, and the centre is half a tile further: 120 + 20 = 140.
- `q4-back`: 150 / 40 is 3.75. floor cuts off the 0.75 and leaves 3, the column the pixel is inside. round would say 4, which is the next tile.
- `q5-offset`: Take the 60 off first: 100 - 60 = 40, and 40 / 20 = 2. Dividing 100 by 20 without taking TOP off gives 5, which is row 5 of a wall that starts at the top.
- `q6-bounds`: There is no row 8, so grid[8] is undefined and undefined has no cells. That is why every click is checked against the size of the grid first.
- `q7-delete`: Tiles only adds sprites. The old level is still there until you delete it, so level 2 would be built on top of level 1.

---

## 6. The AI-graded screens: prompts and rubrics

Both follow `lessons/5-5-snake-1-plan-break-snake-into-parts/lesson.json` and `lessons/5-5-snake-9-playtest-and-reflect/lesson.json` exactly (`model "glm-5.3-flash:cloud"`, `contextDocs []`, every rubric item `points 0`). Every item's description is
its own first sentence(s) followed by the **lenient tail** below, verbatim.

**Lenient tail, plan screens** (from 5.5.1):
`Be very generous: anything remotely related to this question earns full credit, and so does any answer that merely gestures at it. Read the student's whole response, not only the line that answers this question: if anything anywhere in it touches this question, even indirectly, give full credit. Do not mark this criterion missing just because the student skipped this numbered question: when the response is about the Coin Maze or the grids at all, even if it only describes the game or says how they feel about it, mark this criterion met. Only a blank response, or one about something else entirely, is a miss.`

**Lenient tail, playtest screens** (from 5.5.9): the same, with `when the response is about their Coin Maze or their brick wall at all` in place of `when the response is about the Coin Maze or the grids at all`.

### 6.9.1 `aiGrader`
`rubricTitle`: `Plan Coin Maze: AI-graded rubric`.
`prompt`: "Everything you need is on this page and in 5.5.1 (Plan: Break Snake into parts): go back and reread it if you get stuck. A few short sentences per answer is plenty, in your own everyday words.\n\nYou are about to build a maze whose levels are rows of text, and then a grid of lights and a wall of bricks. Before you write any code, plan it.\n\n1. List at least four separate parts of the Coin Maze, things it has or does.\n\n2. Which two or more things does the game have to remember from one frame to the next?\n\n3. Which part would you build first, and why?\n\n4. Which part are you unsure how to build, and what makes it hard?"
Rubric items (title; first sentence; then the plan tail):
- `parts`, "Four or more parts of the game are named": "The student names about four parts of the Coin Maze in their own words, such as the walls, the coins, the goal, where the player starts, the levels, the score, winning and restarting. Credit any list, however loose, short or oddly worded; a list of fewer than four still gets full credit if it clearly tries."
- `remember`, "Says what the game must remember between frames": "The student names at least two things the game has to remember from one frame to the next, for example which level it is on, the map, the score, which coins are left, where the player is, or whether the game is won. Any sensible item, or any gesture at remembering something, earns full credit."
- `first`, "Picks a first thing to build and gives a reason": "The student says which part they would build first and gives any reason at all, or just a hunch. Any answer that mentions a part to start with earns full credit."
- `unsure`, "Names a part they are unsure about": "The student names any part they are unsure how to build, or says what looks hard or confusing, even loosely. If they are not unsure of anything, saying so or naming the part they find easiest also earns full credit."

### 6.9.12 `aiGrader`
`rubricTitle`: `Playtest Coin Maze and bricks: AI-graded rubric`.
`prompt`: "Everything you need is in 6.9.1 (Plan: Break the Coin Maze into parts) and 6.9.8 (Lab: The next level): go back and reread them if you get stuck. A few short sentences per answer is plenty, in your own everyday words.\n\nPlay your finished Coin Maze to the end at least once, and clear your brick wall once. Try to break each one: reach the goal before the coins, or click outside the wall. Then answer:\n\n1. How many times did you play, and how did it go?\n\n2. What is one thing that surprised you or did not work as you expected?\n\n3. Which part of your code do you think that comes from?\n\n4. What is one rule or number you would change, and what would it do to the game?"
Rubric items (playtest tail): `played` "Says how many times they played and how it went" (any mention of playing, or any detail of a play: a level reached, a score, bricks cleared, a way it went wrong); `bug` "Names one thing that surprised or broke" (anything that surprised
them or felt wrong, however small; saying they found nothing, or naming something they tried, also earns full credit); `cause` "Says which part of the code that touches" (some part of the game or its code such as the map, `findStart`, `loadLevel`, the click-to-cell conversion or the bounds check, even loosely or wrongly; any guess at a cause);
`change` "Names one rule they would change and what it would do" (one rule, number or feature to change or add, and anything about what it would do).

---

## 7. Requirement patterns (verified)

Each block below is lesson.json-ready (`pattern` strings already escaped; add `title`, `description` from the table after the block, `flags: ""`, `points: 0`, `status: "pending"`, `file: "script.js"`). They were graded by the app's own `lib/grader.ts` (comments stripped as in production,
function bodies extracted by `extractFunctionBody` for `inFunction`): **every reference scores full, every starter scores nothing (0 of N on every lab), every listed cheat is refused, and every listed honest variant passes.** Nothing uses a lookbehind. Worst case on 5000-character adversarial input
(repeated `floor(`, `for (`, `grid[r][c] =`, `if (grid`, bracket runs, long space runs): under **25 ms** across all 32 patterns (the slowest is 6.9.14 r1 on a 2000-space run, 12-22 ms over several runs; the rest are under 8 ms). The six layout mutations of `scripts/audit-grader-tolerance.mjs`'s gate axes (Allman braces, spaces inside every parenthesis, doubled parentheses on `if`, no semicolons, compact `a=b`, tab indents)
leave every reference at full on every lab. Builders harden them further in review rounds as 5.3-5.5's were; these are the floor, not the ceiling.

The description of every card is "student-facing words" plus `Help: <number> (<title without the number>)`; they are written out here so the builder pastes them:

| Lab | Card | Title | Description (then the Help text, already included) |
| --- | --- | --- | --- |
| 6.9.4 | r1 | Walls are static | Walls never move: their collider is static. Help: 6.9.2 (Reading: A map is rows of text) |
| 6.9.4 | r2 | Coins let you walk through | Coins do not block the player: their collider is none. Help: 6.9.2 (Reading: A map is rows of text) |
| 6.9.4 | r3 | The goal lets you walk through | The goal is its own Group and does not block the player either. Help: 6.9.3 (Worked Example: A level from text) |
| 6.9.4 | r4 | The level is built from the map with Tiles | new Tiles(map, ...) with a legend: # builds walls, c builds coins, G builds goals. Help: 6.9.2 (Reading: A map is rows of text) |
| 6.9.4 | r5 | The first tile is centred half a tile in | x and y are the CENTRE of the top-left tile, so they are half a tile, not 0. Help: 6.9.3 (Worked Example: A level from text) |
| 6.9.6 | r1 | findStart looks at every letter of every row | Two loops, one inside the other: rows, then the letters of each row. Help: 6.9.5 (Reading: Reading a map as data) |
| 6.9.6 | r2 | It looks for the letter P | The scan stops at the tile that holds P. Help: 6.9.5 (Reading: Reading a map as data) |
| 6.9.6 | r3 | Row and column become pixels | A tile centre is its column (or row) times TILE, plus half a tile. Help: 6.9.5 (Reading: Reading a map as data) |
| 6.9.6 | r4 | The player is put on the start | setup asks findStart for the start and moves the player there. Help: 6.9.5 (Reading: Reading a map as data) |
| 6.9.6 | r5 | tileAt turns pixels into a row and a column with floor | floor(x / TILE) is the column, floor(y / TILE) is the row, and the answer is map[row][col]. Help: 6.9.5 (Reading: Reading a map as data) |
| 6.9.7 | r1 | Walking over a coin picks it up | When the player overlaps a coin, that coin is deleted. Help: 6.2.3 (Reading: moSHion docs: Collisions + Overlaps) |
| 6.9.7 | r2 | Each coin adds to the score | Picking up a coin raises score. Help: 6.9.3 (Worked Example: A level from text) |
| 6.9.7 | r3 | The goal only counts when no coins are left | checkGoal asks both: no coins left AND the player is on the goal. Help: 6.9.3 (Worked Example: A level from text) |
| 6.9.7 | r4 | Reaching the goal wins | When both are true, set won to true. Help: 6.9.3 (Worked Example: A level from text) |
| 6.9.8 | r1 | The old level is thrown away | level.delete() before a new level is built (the first time there is no level yet). Help: 6.9.2 (Reading: A map is rows of text) |
| 6.9.8 | r2 | The new level comes from the levels list | loadLevel(n) builds level n with Tiles, using levels[n]. Help: 6.9.2 (Reading: A map is rows of text) |
| 6.9.8 | r3 | The player is put on the new level's P | findStart on the new map, then player.x and player.y. Help: 6.9.6 (Lab: Find the start) |
| 6.9.8 | r4 | Reaching the goal moves to the next level | levelNum goes up by 1 and loadLevel builds that level. Help: 6.9.7 (Lab: Coins and the goal) |
| 6.9.8 | r5 | The last level ends the game | After the final level, won becomes true instead of loading another. Help: 6.9.7 (Lab: Coins and the goal) |
| 6.9.10 | r1 | The grid is built with two loops | A row is made for each of ROWS, filled with COLS false values, and pushed onto g. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.10 | r2 | The picture is drawn from the grid | Two loops visit every cell; the colour comes from grid[r][c]; each cell is a rect. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.10 | r3 | A click becomes a row and a column with floor | floor(x / CELL) is the column and floor(y / CELL) is the row. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.10 | r4 | A click outside the grid does nothing | The row and column are checked against the size of the grid before the cell is read. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.10 | r5 | The click flips the cell | A lit cell goes dark and a dark cell lights: the new value is worked out from the old one. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.10 | r6 | countLit counts the lit cells | Two loops, and a count that goes up only for a lit cell. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.11 | r1 | The wall is built with two loops | A row is made for each of BRICK_ROWS and filled with BRICK_COLS ones, then pushed onto b. Help: 6.9.10 (Lab: Light the grid) |
| 6.9.11 | r2 | A hit pixel becomes a row and a column | Divide by the brick size with floor. The wall starts TOP pixels down, so take TOP off y first. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.11 | r3 | A hit outside the wall does nothing | The row and column are checked, above AND below, before the cell is read. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.11 | r4 | A hit removes the brick | The cell goes from 1 to 0. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.11 | r5 | A hit scores and says true | score goes up, and hitAt gives back true when it removed a brick. Help: 6.9.9 (Reading: A grid is data) |
| 6.9.11 | r6 | bricksLeft counts the bricks | Two loops, counting only the cells that hold a brick. Help: 6.9.10 (Lab: Light the grid) |
| 6.9.14 | r1 | You changed one rule of the wall | Any one challenge turns this green: two-hit bricks, points by row, or a wall read from text. Help: 6.9.11 (Lab: A wall of bricks) |

(6.9.7 r1 points at `6.2.3 Reading: moSHion docs: Collisions + Overlaps`, the number that title carries today although its folder is `6-1-8-reading-collisions`; the renumber may move it, and `check-help-pointer-titles` will say so.)

#### 6.9.4
```json
  {"id":"r1","type":"regex","pattern":"\\bwalls\\.collider\\s*=\\s*(?:['\"]static['\"]|STATIC\\b|STA\\b)"},
  {"id":"r2","type":"regex","pattern":"\\bcoins\\.collider\\s*=\\s*['\"]none['\"]"},
  {"id":"r3","type":"regex","pattern":"\\bgoals\\.collider\\s*=\\s*['\"]none['\"]"},
  {"id":"r4","type":"regex","pattern":"^(?=[\\s\\S]*\\bnew\\s+Tiles\\s*\\()(?=[\\s\\S]*['\"]#['\"]\\s*:\\s*walls\\b)(?=[\\s\\S]*['\"]c['\"]\\s*:\\s*coins\\b)(?=[\\s\\S]*['\"]G['\"]\\s*:\\s*goals\\b)"},
  {"id":"r5","type":"regex","pattern":"new\\s+Tiles\\s*\\(\\s*[\\w$.\\[\\]]+\\s*,\\s*(?:20|TILE\\s*\\/\\s*2|0?\\.5\\s*\\*\\s*TILE|TILE\\s*\\*\\s*0?\\.5)\\s*,\\s*(?:20|TILE\\s*\\/\\s*2|0?\\.5\\s*\\*\\s*TILE|TILE\\s*\\*\\s*0?\\.5)\\s*,"}
```

Accept (tested): `walls.collider = STATIC`, double quotes, no spaces around `=`, the legend in a `const legend` variable passed by name, legend keys in any order, `0.5 * TILE` or `TILE * 0.5` or literal `20` for the centre. Refuse (tested): `'dynamic'` for walls, the walls line only inside a comment, `new Tiles(map, 0, 0, ...)`, no `Tiles` at all (a hand-built loop), a swapped legend (`'#': coins`), solid coins, a solid goal.

#### 6.9.6
```json
  {"id":"r1","type":"inFunction","function":"findStart","pattern":"^(?=[\\s\\S]*\\b(?:for|while)\\b[\\s\\S]*\\b(?:for|while)\\b)|\\.indexOf\\s*\\(\\s*['\"]P['\"]\\s*\\)"},
  {"id":"r2","type":"inFunction","function":"findStart","pattern":"===?\\s*['\"]P['\"]|['\"]P['\"]\\s*===?|\\.(?:includes|indexOf)\\s*\\(\\s*['\"]P['\"]"},
  {"id":"r3","type":"inFunction","function":"findStart","pattern":"(?:TILE|\\b40)\\s*\\)?\\s*\\+\\s*(?:TILE\\s*\\/\\s*2|\\b20\\b|0?\\.5\\s*\\*\\s*TILE|TILE\\s*\\*\\s*0?\\.5)|(?:TILE|\\b40)\\s*\\*\\s*[\\w$]+\\s*\\+\\s*(?:TILE\\s*\\/\\s*2|\\b20\\b)|\\(\\s*[\\w$]+\\s*\\+\\s*0?\\.5\\s*\\)\\s*\\*\\s*(?:TILE|40)\\b|(?:TILE|40)\\s*\\*\\s*\\(\\s*[\\w$]+\\s*\\+\\s*0?\\.5\\s*\\)|(?:TILE\\s*\\/\\s*2|\\b20\\b|0?\\.5\\s*\\*\\s*TILE)\\s*\\+\\s*\\(?\\s*(?:[\\w$]+\\s*\\*\\s*(?:TILE|40)\\b|(?:TILE|40)\\s*\\*\\s*[\\w$]+)"},
  {"id":"r4","type":"inFunction","function":"setup","pattern":"^(?=[\\s\\S]*\\bfindStart\\s*\\()(?=[\\s\\S]*\\bplayer\\.(?:x|pos(?:ition)?)\\b)"},
  {"id":"r5","type":"inFunction","function":"tileAt","pattern":"^(?=[\\s\\S]*(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:TILE|40)\\b[\\s\\S]*(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:TILE|40)\\b)(?=[\\s\\S]*\\bmap\\s*\\[[^\\]]+\\]\\s*(?:\\[[^\\]]+\\]|\\.charAt\\s*\\())"}
```

Accept: `while` loops, `row`/`col` names, `map[row].charAt(col) == 'P'`, `TILE * col + TILE / 2`, `(c + 0.5) * TILE`, `20 + c * 40`, `Math.floor`, `player.pos = { x, y }`. Refuse: a hard-coded `return { x: 60, y: 60 }`, a scan for the wrong letter, `P` only in a comment, no half tile (`c * TILE`), `findStart` never used in `setup`, `round` instead of `floor`, no division at all. Known gap: row and column swapped in `map[col][row]` passes; the lab's walk-and-read hint is the safeguard.

#### 6.9.7
```json
  {"id":"r1","type":"inFunction","function":"collect","pattern":"^(?=[\\s\\S]*(?:\\bplayer\\.overlaps\\s*\\(\\s*[\\w$]+|\\bcoins\\.overlaps\\s*\\(\\s*player\\b))(?=[\\s\\S]*\\.(?:delete|remove)\\s*\\(\\s*\\))"},
  {"id":"r2","type":"inFunction","function":"collect","pattern":"\\bscore\\s*(?:\\+=\\s*[1-9]\\d*|\\+\\+|=\\s*score\\s*\\+\\s*[1-9]\\d*)|\\+\\+\\s*score\\b"},
  {"id":"r3","type":"inFunction","function":"checkGoal","pattern":"^(?=[\\s\\S]*(?:\\bcoins\\.length\\s*(?:===?\\s*0|<=\\s*0|<\\s*1)\\b|\\b0\\s*===?\\s*coins\\.length\\b|!\\s*coins\\.length\\b))(?=[\\s\\S]*(?:\\bplayer\\.overlaps\\s*\\(\\s*goals\\b|\\bgoals\\.overlaps\\s*\\(\\s*player\\b))"},
  {"id":"r4","type":"inFunction","function":"checkGoal","pattern":"\\bwon\\s*=\\s*true\\b"}
```

Accept: `score++`, `coin.remove()`, a `for...of` over `[...coins]` with `player.overlaps(coin)` and `score = score + 1`, `!coins.length`, `coins.length <= 0`, goal test first, nested ifs. Refuse: no `delete`, deleting everything with `coins.deleteAll()` and no overlap test, the goal with no coin test, the wrong sense (`coins.length > 0`), no goal overlap, `score = 1`, `score -= 1`.

#### 6.9.8
```json
  {"id":"r1","type":"inFunction","function":"loadLevel","pattern":"\\blevel\\s*\\??\\.\\s*(?:delete|remove|deleteAll)\\s*\\(|^(?=[\\s\\S]*\\bwalls\\s*\\.\\s*(?:deleteAll|delete)\\s*\\()(?=[\\s\\S]*\\bcoins\\s*\\.\\s*(?:deleteAll|delete)\\s*\\()(?=[\\s\\S]*\\bgoals\\s*\\.\\s*(?:deleteAll|delete)\\s*\\()"},
  {"id":"r2","type":"inFunction","function":"loadLevel","pattern":"^(?=[\\s\\S]*\\bnew\\s+Tiles\\s*\\()(?=[\\s\\S]*\\blevels\\s*\\[\\s*[A-Za-z_$])"},
  {"id":"r3","type":"inFunction","function":"loadLevel","pattern":"^(?=[\\s\\S]*\\bfindStart\\s*\\()(?=[\\s\\S]*\\bplayer\\.(?:x|pos(?:ition)?)\\b)"},
  {"id":"r4","type":"inFunction","function":"checkGoal","pattern":"^(?=[\\s\\S]*(?:\\blevelNum\\s*(?:\\+=\\s*1\\b|\\+\\+)|\\+\\+\\s*levelNum\\b|\\blevelNum\\s*=\\s*levelNum\\s*\\+\\s*1\\b))(?=[\\s\\S]*\\bloadLevel\\s*\\()"},
  {"id":"r5","type":"inFunction","function":"checkGoal","pattern":"^(?=[\\s\\S]*(?:\\blevelNum\\b[^;{}]*\\blevels\\.length\\b|\\blevels\\.length\\b[^;{}]*\\blevelNum\\b|\\blevelNum\\s*(?:===?|>=|>|<)\\s*\\d))(?=[\\s\\S]*\\bwon\\s*=\\s*true\\b)"}
```

Accept: `if (level !== undefined) {...}`, deleting the three Groups with `deleteAll()` instead of `level.delete()`, `levelNum = levelNum + 1`, the reversed test (`levelNum < levels.length` then load, else win), `levelNum === 3`. Refuse: no delete at all, always `levels[0]`, no `findStart` (a fixed start), no `levelNum` increment, no last-level test.

#### 6.9.10
```json
  {"id":"r1","type":"inFunction","function":"makeGrid","pattern":"^(?=[\\s\\S]*\\bfor\\b[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*\\.push\\s*\\(\\s*(?:false|0)\\s*\\))(?=[\\s\\S]*\\.push\\s*\\(\\s*(?!false\\b|true\\b|\\d)[A-Za-z_$][\\w$]*\\s*\\))|^(?=[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*\\.fill\\s*\\(\\s*(?:false|0)\\s*\\))"},
  {"id":"r2","type":"inFunction","function":"drawGrid","pattern":"^(?=[\\s\\S]*\\bfor\\b[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*(?:\\bgrid\\s*\\[\\s*[\\w$]+\\s*\\]\\s*\\[\\s*[\\w$]+\\s*\\]|\\bfor\\s*\\(\\s*(?:const|let)\\s+[\\w$]+\\s+of\\s+grid\\b))(?=[\\s\\S]*\\b(?:rect|square)\\s*\\()"},
  {"id":"r3","type":"inFunction","function":"clickCell","pattern":"^(?=[\\s\\S]*(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:CELL|50)\\b[\\s\\S]*(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:CELL|50)\\b)"},
  {"id":"r4","type":"inFunction","function":"clickCell","pattern":"<=?\\s*(?:ROWS|COLS|grid\\.length|grid\\s*\\[\\s*[\\w$0]+\\s*\\]\\.length|[78])\\b|>=?\\s*(?:ROWS|COLS|grid\\.length|grid\\s*\\[\\s*[\\w$0]+\\s*\\]\\.length|[78])\\b|!==?\\s*undefined|\\?\\.\\["},
  {"id":"r5","type":"inFunction","function":"clickCell","pattern":"\\bgrid\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*=\\s*[^;]*\\bgrid\\s*\\[|^(?=[\\s\\S]*\\]\\s*=\\s*true\\b)(?=[\\s\\S]*\\]\\s*=\\s*false\\b)"},
  {"id":"r6","type":"inFunction","function":"countLit","pattern":"^(?=[\\s\\S]*\\bfor\\b[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*(?:\\bif\\s*\\([^)]*\\bgrid\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]|\\bgrid\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*\\?|\\+=\\s*grid\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]))|\\.filter\\s*\\("}
```

Accept: `new Array(COLS).fill(false)` pushed per row, `row.push(0)`, `square(...)`, an `if/else` that sets `fill`, a `for...of` over rows and cells with running x and y, `Math.floor`, differently named parameters, only an upper-bound test (`r < ROWS && c < COLS`; clicks cannot be negative on this canvas), an early `return` for out-of-grid clicks, `grid.length` and `grid[0].length` as the limits, flipping by `if/else` or by ternary, `n += grid[r][c] ? 1 : 0`, `grid.flat().filter(...)`.
Refuse: a flat list of 64 values, hard-coded rows, `round` instead of `floor`, no bounds check, a click that only ever lights (`= true`), drawing the same colour for every cell, counting every cell, `n = 64`.

#### 6.9.11
```json
  {"id":"r1","type":"inFunction","function":"makeBricks","pattern":"^(?=[\\s\\S]*\\bfor\\b[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*\\.push\\s*\\(\\s*(?:1|true)\\s*\\))(?=[\\s\\S]*\\.push\\s*\\(\\s*(?!1\\b|true\\b|false\\b|0\\b)[A-Za-z_$][\\w$]*\\s*\\))"},
  {"id":"r2","type":"inFunction","function":"hitAt","pattern":"^(?=[\\s\\S]*(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:BW|50)\\b)(?=[\\s\\S]*(?:(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*(?:\\bTOP\\b|\\b60\\b)[^;]*\\/\\s*(?:BH|20)\\b|(?:\\bfloor|Math\\.floor|Math\\.trunc)\\s*\\([^;]*\\/\\s*(?:BH|20)\\b[^;]*\\)\\s*-\\s*(?:TOP\\s*\\/\\s*BH|3)\\b))"},
  {"id":"r3","type":"inFunction","function":"hitAt","pattern":"^(?=[\\s\\S]*(?:>=?\\s*0\\b|<\\s*0\\b|\\b0\\s*<=?|\\b0\\s*>))(?=[\\s\\S]*(?:<=?\\s*(?:BRICK_ROWS|BRICK_COLS|bricks\\.length|bricks\\s*\\[\\s*[\\w$0]+\\s*\\]\\.length|[58])\\b|>=?\\s*(?:BRICK_ROWS|BRICK_COLS|bricks\\.length|bricks\\s*\\[\\s*[\\w$0]+\\s*\\]\\.length|[58])\\b))|!==?\\s*undefined|\\?\\.\\["},
  {"id":"r4","type":"inFunction","function":"hitAt","pattern":"\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*(?:=\\s*0\\b|-=\\s*1\\b|--)"},
  {"id":"r5","type":"inFunction","function":"hitAt","pattern":"^(?=[\\s\\S]*(?:\\bscore\\s*(?:\\+=\\s*[1-9]|\\+\\+|=\\s*score\\s*\\+)|\\+\\+\\s*score\\b))(?=[\\s\\S]*\\breturn\\s+true\\b)"},
  {"id":"r6","type":"inFunction","function":"bricksLeft","pattern":"^(?=[\\s\\S]*\\bfor\\b[\\s\\S]*\\bfor\\b)(?=[\\s\\S]*(?:\\bif\\s*\\([^)]*\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]|\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*\\?|\\+=\\s*bricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]))|\\.filter\\s*\\("}
```

Accept: `Math.floor((y - 60) / 20)`, `floor(y / BH) - TOP / BH`, an early `return false` for out-of-wall hits followed by `if (bricks[r][c] === 1)`, `bricks[r] !== undefined && ...`, `bricks.length` and `bricks[0].length` as limits, `n += bricks[r][c]`. Refuse: ignoring `TOP`, only the upper bounds, no bounds, never removing the brick, never returning `true`, a hard-coded `return 40`, one loop pushing 40 ones.

#### 6.9.14
```json
  {"id":"r1","type":"regex","pattern":"\\bbricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*(?:-=\\s*1\\b|--|=\\s*bricks\\s*\\[[^\\]]+\\]\\s*\\[[^\\]]+\\]\\s*-\\s*1\\b)|\\bscore\\s*\\+=\\s*[^;]*(?:-\\s*[\\w$]+|\\[\\s*[\\w$]+\\s*\\])|[\\w$]+\\s*\\[\\s*[\\w$]+\\s*\\]\\s*\\[\\s*[\\w$]+\\s*\\]\\s*===?\\s*['\"][^'\"\\s]['\"]|\\.charAt\\s*\\(\\s*[\\w$]+\\s*\\)\\s*===?\\s*['\"]"}
```

Accept: `bricks[r][c] -= 1` (two-hit), `score += (BRICK_ROWS - r) * 10` or `score += POINTS[r]`, a text read `LAYOUT[r][c] === '#'` or `.charAt(c) === '#'`. Refuse: the unchanged starter, a comment-only edit. Any one challenge turns the card green.

---

## 8. Reference scripts

### 8.0 How the scripts were generated (builders: reproduce, then check the hashes)

Every lab script below is ONE file with `//>> sN` ... `//<<` markers around what the student writes. The solution is the file with the marker lines removed; the starter replaces each marked block by `// STEP N: <text>` comments (text in the steps JSON) and
turns a header `(reference solution ...)` into a full stop. Everything outside a marker is identical in both. This keeps starter and solution from drifting, and it is why each starter is the solution minus exactly the student's lines. The splitter:

```js
// mk.mjs: split a marked solution into {solution, starter}
// marker: "//>> sN" ... "//<<"; steps: {sN: "text"}
export function split(src, steps, indentFallback='  ') {
  const lines = src.split('\n'); const sol=[], st=[];
  let inBlk=null, blockLines=[];
  for (const ln of lines) {
    const m = ln.match(/^\/\/>> (\w+)$/);
    if (m) { inBlk=m[1]; blockLines=[]; continue; }
    if (ln === '//<<') {
      sol.push(...blockLines);
      const first = blockLines.find(l=>l.trim()!=='')||'';
      const ind = first.match(/^\s*/)[0];
      const n = inBlk.replace(/^s/,'');
      const text = 'STEP '+n+': '+steps[inBlk];
      for (const w of wrap(text, 78-ind.length-3)) st.push(ind+'// '+(w.first?'':'  ')+w.t);
      inBlk=null; continue;
    }
    if (inBlk) blockLines.push(ln); else { sol.push(ln); st.push(ln); }
  }
  return {solution: sol.join('\n'), starter: st.join('\n').replace(/^(\/\/ [^\n]*?)\s*\(reference solution[^)]*\)\./, '$1.')};
}
function wrap(text, width){
  const words=text.split(' '); const out=[]; let cur=''; let first=true;
  for (const w of words){ if ((cur+' '+w).trim().length>width){ out.push({t:cur,first}); first=false; cur=w; } else cur=(cur+' '+w).trim(); }
  if (cur) out.push({t:cur,first}); return out;
}
```

Hashes of the generated files (first 12 hex of SHA-256 of the file bytes, no trailing newline added; lets a builder confirm the splitter output):

| Lab | solution.js | script.js (starter) |
| --- | --- | --- |
| 6.9.4 | `0be7343d1f6f` | `b07bdf9d32ff` |
| 6.9.6 | `4ec9fe6c3444` | `1830525f5e76` |
| 6.9.7 | `21c2c30e5e7d` | `3e5a2e01cedb` |
| 6.9.8 | `7d4350ab045b` | `9a56c98af72a` |
| 6.9.10 | `35d8a2589043` | `5c046032c09e` |
| 6.9.11 | `37bfdf149494` | `76e03767c6c8` |
| 6.9.14 | `d723b6a061c6` | `92b66a80bd0c` |

Steps JSON for the starter comments:

```json
{
 "S4": {
  "s1": "make a Group called walls. Its collider is static (it never moves), and its color is slategray.",
  "s2": "make coins (collider none, diameter 14, color gold) and goals (collider none, color limegreen), the same way.",
  "s3": "build the level with new Tiles(map, 20, 20, TILE, TILE, legend). The legend is an object: the letter # builds walls, c builds coins, G builds goals."
 },
 "S6": {
  "s1": "write findStart(map). Loop over the rows and, inside, over the letters of each row. When map[r][c] is the letter P, return an object { x, y } with the pixel centre of that tile.",
  "s2": "ask findStart(map) for the start and move the player there: player.x = start.x, and the same for y.",
  "s3": "write tileAt(x, y). Turn the pixels into a column and a row with floor and TILE, and give back map[row][col]."
 },
 "S7": {
  "s1": "in collect(), when the player overlaps coins, delete that coin and add 1 to score.",
  "s2": "in checkGoal(), when no coins are left AND the player overlaps goals, set won to true."
 },
 "S8": {
  "s1": "in loadLevel(n), delete the old level if there is one, set map to levels[n], build the Tiles from it, and put the player on its P with findStart.",
  "s2": "in checkGoal(), when no coins are left and the player is on the goal, add 1 to levelNum. If that was the last level set won to true, otherwise call loadLevel(levelNum)."
 },
 "S10": {
  "s1": "build the grid. For each of ROWS rows make an empty row, push COLS values of false into it, then push the row onto g.",
  "s2": "draw the grid from the data. Two loops over every cell: fill gold when grid[r][c] is true and a dark colour when it is false, then rect(c * CELL, r * CELL, CELL, CELL).",
  "s3": "turn the click into a column and a row with floor and CELL. If that row and column are on the grid, flip the cell: grid[r][c] = !grid[r][c].",
  "s4": "count the lit cells. Two loops over the grid, adding 1 to n for every cell that is true."
 },
 "S11": {
  "s1": "build the wall. For each of BRICK_ROWS rows make a row, push BRICK_COLS ones into it, and push the row onto b.",
  "s2": "find the brick at pixel (x, y): c = floor(x / BW) and r = floor((y - TOP) / BH). If that row and column are inside the wall AND the cell is 1, set it to 0, add 10 to score and return true.",
  "s3": "count the bricks still standing: two loops over the wall, adding 1 to n for every cell that is 1."
 }
}
```

### 8.1 Coin Maze, four labs (marked sources; `S8` solution is the finished game)

Where a function header is outside a marker (`findStart`, `tileAt`, `collect`, `checkGoal`, `loadLevel`) the starter keeps the header and a fallback line, so every starter runs with no error (checked: 120 frames each, section 9).

#### 6.9.4 Lab: Build the maze (`S4`)
```js
// 6.9.4 Lab: Build the maze (reference solution).

const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#P  c    #',
  '# ###### #',
  '#c      c#',
  '# # #### #',
  '#   #  c #',
  '### # ## #',
  '#c  #    #',
  '#  ## ##G#',
  '##########',
];

let walls, coins, goals, player, level;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
//>> s1
  walls.collider = 'static';
  walls.color = 'dimgray';
//<<

  coins = new Group();
  goals = new Group();
//>> s2
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';
  goals.collider = 'none';
  goals.color = 'limegreen';
//<<

//>> s3
  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });
//<<

  player = new Sprite(60, 60, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
}

function draw() {
  background('#111');
  movePlayer();
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
}
```

#### 6.9.6 Lab: Find the start (`S6`)
```js
// 6.9.6 Lab: Find the start (reference solution).

const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#P  c    #',
  '# ###### #',
  '#c      c#',
  '# # #### #',
  '#   #  c #',
  '### # ## #',
  '#c  #    #',
  '#  ## ##G#',
  '##########',
];

let walls, coins, goals, player, level;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  goals = new Group();
  goals.collider = 'none';
  goals.color = 'limegreen';

  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });

  player = new Sprite(0, 0, 26, 26);   // findStart decides where it really stands
  player.color = 'deepskyblue';
  player.rotationLock = true;
//>> s2
  const start = findStart(map);
  player.x = start.x;
  player.y = start.y;
//<<
}

function draw() {
  background('#111');
  movePlayer();
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

// Scan the rows for the letter P and give back the pixel centre of that tile.
function findStart(map) {
//>> s1
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
      }
    }
  }
//<<
  return { x: TILE / 2, y: TILE / 2 };   // no P in the map: use the top-left tile
}

// The letter in the map at a pixel position: the way back, from pixels to a tile.
function tileAt(x, y) {
//>> s3
  const c = floor(x / TILE);
  const r = floor(y / TILE);
  return map[r][c];
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('standing on: [' + tileAt(player.x, player.y) + ']', 12, 392);
}
```

#### 6.9.7 Lab: Coins and the goal (`S7`)
```js
// 6.9.7 Lab: Coins and the goal (reference solution).

const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#P  c    #',
  '# ###### #',
  '#c      c#',
  '# # #### #',
  '#   #  c #',
  '### # ## #',
  '#c  #    #',
  '#  ## ##G#',
  '##########',
];

let walls, coins, goals, player, level;
let score = 0;
let won = false;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  goals = new Group();
  goals.collider = 'none';
  goals.color = 'limegreen';

  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });

  player = new Sprite(0, 0, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
  const start = findStart(map);
  player.x = start.x;
  player.y = start.y;
}

function draw() {
  background('#111');
  if (!won) {
    movePlayer();
    collect();
    checkGoal();
  } else {
    player.vel.x = 0;
    player.vel.y = 0;
  }
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

function findStart(map) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
      }
    }
  }
  return { x: TILE / 2, y: TILE / 2 };   // no P in the map: use the top-left tile
}

// Walking over a coin picks it up: the coin goes, the score goes up.
function collect() {
//>> s1
  player.overlaps(coins, (p, coin) => {
    coin.delete();
    score += 1;
  });
//<<
}

// The goal only counts once every coin is gone.
function checkGoal() {
//>> s2
  if (coins.length === 0 && player.overlaps(goals)) {
    won = true;
  }
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('score: ' + score, 300, 24);
  if (player.overlaps(goals) && coins.length > 0) {
    text('Grab every coin first!', 100, 392);
  }
  if (won) {
    textSize(32);
    text('You escaped!', 100, 200);
  }
}
```

#### 6.9.8 Lab: The next level (`S8`, the finished Coin Maze; the three maps are in it)
```js
// 6.9.8 Lab: The next level (reference solution: Coin Maze, final).

const TILE = 40;   // one tile is 40 by 40 pixels

const levels = [
  [
    '##########',
    '#P  c    #',
    '# ###### #',
    '#c      c#',
    '# # #### #',
    '#   #  c #',
    '### # ## #',
    '#c  #    #',
    '#  ## ##G#',
    '##########',
  ],
  [
    '##########',
    '#P   #  c#',
    '# ## # # #',
    '#c#  # # #',
    '# # ## # #',
    '# #    #c#',
    '# ###### #',
    '#   c#   #',
    '# ##   #G#',
    '##########',
  ],
  [
    '##########',
    '#P#c     #',
    '# # ### ##',
    '#   #c#  #',
    '### # ## #',
    '#c  #  # #',
    '# ###c ###',
    '#     #  #',
    '# ###   G#',
    '##########',
  ],
];

let walls, coins, goals, player, level, map;
let levelNum, score, won;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  goals = new Group();
  goals.collider = 'none';
  goals.color = 'limegreen';

  player = new Sprite(0, 0, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;

  startGame();
}

// A fresh game: back to the first level with nothing collected.
function startGame() {
  score = 0;
  won = false;
  levelNum = 0;
  loadLevel(levelNum);
}

// Throw the old level away, build level n from its rows of text, put the player on its P.
function loadLevel(n) {
//>> s1
  if (level) level.delete();
  map = levels[n];
  level = new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins, 'G': goals });
  const start = findStart(map);
  player.x = start.x;
  player.y = start.y;
//<<
}

function draw() {
  background('#111');
  if (kb.presses('r')) startGame();
  if (!won) {
    movePlayer();
    collect();
    checkGoal();
  } else {
    player.vel.x = 0;
    player.vel.y = 0;
  }
}

function movePlayer() {
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;
}

function findStart(map) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        return { x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 };
      }
    }
  }
  return { x: TILE / 2, y: TILE / 2 };   // no P in the map: use the top-left tile
}

function collect() {
  player.overlaps(coins, (p, coin) => {
    coin.delete();
    score += 1;
  });
}

// The goal only counts once every coin is gone. Then on to the next level, or the end.
function checkGoal() {
//>> s2
  if (coins.length === 0 && player.overlaps(goals)) {
    levelNum += 1;
    if (levelNum === levels.length) {
      won = true;
    } else {
      loadLevel(levelNum);
    }
  }
//<<
}

function drawTop() {
  fill('white');
  textSize(16);
  text('coins left: ' + coins.length, 12, 24);
  text('level ' + (levelNum + 1) + ' of ' + levels.length, 150, 24);
  text('score: ' + score, 300, 24);
  if (player.overlaps(goals) && coins.length > 0) {
    text('Grab every coin first!', 100, 392);
  }
  if (won) {
    textSize(32);
    text('You escaped!', 100, 200);
    textSize(16);
    text('Press R to play again', 120, 240);
  }
}
```

The three maps (verified solvable by breadth-first search over the text: every coin and the goal reachable from P; 5, 4 and 4 coins; 13 in all):

```
// level 1
##########
#P  c    #
# ###### #
#c      c#
# # #### #
#   #  c #
### # ## #
#c  #    #
#  ## ##G#
##########

// level 2
##########
#P   #  c#
# ## # # #
#c#  # # #
# # ## # #
# #    #c#
# ###### #
#   c#   #
# ##   #G#
##########

// level 3
##########
#P#c     #
# # ### ##
#   #c#  #
### # ## #
#c  #  # #
# ###c ###
#     #  #
# ###   G#
##########
```

### 8.2 Live blocks for the reading and the example (verified; each ran 120 frames with no error)

#### 6.9.3 Worked Example (`E3`)
```js
// A level written as rows of text. Change a letter, press Run, and the level changes.
const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#        #',
  '#  c  c  #',
  '#  ##    #',
  '# c    c #',
  '##########',
];

let walls, coins, player, level;

function setup() {
  new Canvas(400, 240);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  // The first tile's centre is (20, 20). Each tile is 40 wide and 40 tall.
  level = new Tiles(map, 20, 20, TILE, TILE, { '#': walls, 'c': coins });

  player = new Sprite(60, 100, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
}

function draw() {
  background('#111');
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;

  player.overlaps(coins, (p, coin) => {
    coin.delete();
  });
}

function drawTop() {
  fill('white');
  textSize(14);
  text('tiles in the level: ' + level.length, 12, 24);
  text('walls: ' + walls.length + '   coins: ' + coins.length, 12, 224);
}
```

#### 6.9.5 Reading (`E5`)
```js
// Scan the map for the letter P, then show which tile is under the mouse.
const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#P  c    #',
  '# ###### #',
  '#c      c#',
  '# # #### #',
  '#   #  c #',
  '### # ## #',
  '#c  #    #',
  '#  ## ##G#',
  '##########',
];

let walls, hero, startX, startY;

function setup() {
  new Canvas(400, 400);

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';
  new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls });

  // Forward: look at every letter. When it is the P, turn its row and column into pixels.
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        startX = c * TILE + TILE / 2;
        startY = r * TILE + TILE / 2;
      }
    }
  }
  hero = new Sprite(startX, startY, 26, 26, 'static');
  hero.color = 'deepskyblue';
}

function drawTop() {
  // Back: turn the mouse's pixels into a column and a row.
  const c = floor(mouse.x / TILE);
  const r = floor(mouse.y / TILE);
  fill('white');
  textSize(16);
  text('P was found at ' + startX + ', ' + startY, 12, 24);
  // The mouse can be anywhere, so check the row and column exist before reading them.
  if (r >= 0 && r < map.length && c >= 0 && c < map[r].length) {
    text('row ' + r + ', column ' + c + ' holds [' + map[r][c] + ']', 12, 392);
  }
}
```

#### 6.9.9 Reading (`E9`)
```js
// A grid is data. The picture is drawn FROM the grid, and a click changes the grid.
const CELL = 60;   // each cell is 60 by 60 pixels
const TOP = 40;    // the grid starts 40 pixels down; the words live in the strip above it

const grid = [
  [0, 1, 0, 0, 1, 0],
  [1, 1, 0, 0, 1, 1],
  [0, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 1, 0],
];

function setup() {
  new Canvas(360, 360);
}

function draw() {
  background('#111');

  if (mouse.presses()) {
    const c = floor(mouse.x / CELL);          // pixels -> column
    const r = floor((mouse.y - TOP) / CELL);  // pixels -> row (take the top strip off first)
    // The click can land anywhere, so check the cell exists before touching it.
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
      grid[r][c] = grid[r][c] === 1 ? 0 : 1;
    }
  }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      fill(grid[r][c] === 1 ? 'orange' : '#334');
      rect(c * CELL, TOP + r * CELL, CELL, CELL);   // x, y is the TOP-LEFT corner
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('row 0 is: ' + grid[0].join(' '), 12, 24);
}
```

### 8.3 The grids

#### 6.9.10 Lab: Light the grid (`S10`)
```js
// 6.9.10 Lab: Light the grid (reference solution).

const COLS = 8;
const ROWS = 8;
const CELL = 50;      // each cell is 50 by 50 pixels

let grid;             // grid[r][c] is true when that cell is lit

function setup() {
  new Canvas(400, 440);   // 400 by 400 for the grid, a strip underneath for words
  grid = makeGrid();
}

// A grid of ROWS rows with COLS cells each, every cell off (false).
function makeGrid() {
  const g = [];
//>> s1
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(false);
    }
    g.push(row);
  }
//<<
  return g;
}

function draw() {
  background('#111');
  if (mouse.presses()) clickCell(mouse.x, mouse.y);
  drawGrid();
}

// The picture is drawn FROM the data: a lit cell is gold, an off cell is dark.
function drawGrid() {
//>> s2
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      fill(grid[r][c] ? 'gold' : '#334');
      rect(c * CELL, r * CELL, CELL, CELL);
    }
  }
//<<
}

// A click is a pixel. Turn it into a row and a column, and flip that cell if it is on the grid.
function clickCell(x, y) {
//>> s3
  const c = floor(x / CELL);
  const r = floor(y / CELL);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
    grid[r][c] = !grid[r][c];
  }
//<<
}

// How many cells are lit right now?
function countLit() {
  let n = 0;
//>> s4
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c]) n += 1;
    }
  }
//<<
  return n;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('lit: ' + countLit() + ' of ' + (ROWS * COLS), 12, 428);
}
```

#### 6.9.11 Lab: A wall of bricks (`S11`)
```js
// 6.9.11 Lab: A wall of bricks (reference solution: Brick wall, final).

const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];

let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
let score;

function setup() {
  new Canvas(400, 400);
  startGame();
}

function startGame() {
  bricks = makeBricks();
  score = 0;
}

// BRICK_ROWS rows of BRICK_COLS bricks, every cell a 1.
function makeBricks() {
  const b = [];
//>> s1
  for (let r = 0; r < BRICK_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      row.push(1);
    }
    b.push(row);
  }
//<<
  return b;
}

function draw() {
  background('#111');
  if (kb.presses('r')) startGame();
  if (mouse.presses()) hitAt(mouse.x, mouse.y);
  drawBricks();
}

// Draw a rectangle for every cell that holds a 1. The gaps draw nothing.
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

// Something hit the wall at pixel (x, y). If a brick is there, take it out and say true.
function hitAt(x, y) {
//>> s2
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    score += 10;
    return true;
  }
//<<
  return false;
}

// How many bricks are still standing?
function bricksLeft() {
  let n = 0;
//>> s3
  for (let r = 0; r < bricks.length; r++) {
    for (let c = 0; c < bricks[r].length; c++) {
      if (bricks[r][c] === 1) n += 1;
    }
  }
//<<
  return n;
}

function drawTop() {
  fill('white');
  textSize(16);
  text('bricks left: ' + bricksLeft(), 12, 24);
  text('score: ' + score, 300, 24);
  if (score > 0 && bricksLeft() === 0) {
    textSize(32);
    text('Cleared!', 140, 260);
    textSize(16);
    text('Press R for a new wall', 110, 290);
  }
}
```

#### 6.9.14 Challenges: solution (all three), as a diff from the brick wall final (the starter is the brick wall final with its header changed)
```diff
--- a/script.js
+++ b/script.js
@@ -1,13 +1,22 @@
-// 6.9.11 Lab: A wall of bricks (reference solution: Brick wall, final).
+// 6.9.14 Challenges: Make it yours (reference solution: two-hit bricks, points by row,
+// and a wall read from rows of text).
 
-const BRICK_COLS = 8;
-const BRICK_ROWS = 5;
+// Challenge 3: the wall is rows of text. # is a brick, 2 is a two-hit brick, . is a gap.
+const SHAPE = [
+  '22222222',
+  '#.####.#',
+  '########',
+  '.######.',
+  '..####..',
+];
+const BRICK_ROWS = SHAPE.length;
+const BRICK_COLS = SHAPE[0].length;
 const BW = 50;          // one brick is 50 pixels wide
 const BH = 20;          // and 20 tall
 const TOP = 60;         // the wall starts 60 pixels down, leaving room for words
 const ROW_COLORS = ['crimson', 'orange', 'gold', 'limegreen', 'deepskyblue'];
 
-let bricks;             // bricks[r][c] is 1 for a brick, 0 for a gap
+let bricks;             // bricks[r][c]: 0 is a gap, 1 is a brick, 2 is a two-hit brick
 let score;
 
 function setup() {
@@ -20,13 +29,15 @@
   score = 0;
 }
 
-// BRICK_ROWS rows of BRICK_COLS bricks, every cell a 1.
+// Read the wall from SHAPE: one number per letter.
 function makeBricks() {
   const b = [];
   for (let r = 0; r < BRICK_ROWS; r++) {
     const row = [];
     for (let c = 0; c < BRICK_COLS; c++) {
-      row.push(1);
+      if (SHAPE[r][c] === '#') row.push(1);
+      else if (SHAPE[r][c] === '2') row.push(2);
+      else row.push(0);
     }
     b.push(row);
   }
@@ -44,8 +55,8 @@
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
@@ -56,9 +67,9 @@
 function hitAt(x, y) {
   const c = floor(x / BW);
   const r = floor((y - TOP) / BH);
-  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) {
-    bricks[r][c] = 0;
-    score += 10;
+  if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] > 0) {
+    bricks[r][c] -= 1;
+    score += (BRICK_ROWS - r) * 10;   // Challenge 2: the top rows are worth more
     return true;
   }
   return false;
@@ -69,7 +80,7 @@
   let n = 0;
   for (let r = 0; r < bricks.length; r++) {
     for (let c = 0; c < bricks[r].length; c++) {
-      if (bricks[r][c] === 1) n += 1;
+      if (bricks[r][c] > 0) n += 1;
     }
   }
   return n;
```

---

## 9. How this was checked

All in the session scratchpad; nothing in the repo touched except this file.

1. **Headless, the course's own engine** (`scripts/moshion-harness.mjs`: the vendored `moshion.js` + `planck.min.js`, a stubbed DOM, a hand-stepped clock, synthetic key and mouse events). Every solution, starter and example above ran 120 frames with no error.
   Behaviour, with an autopilot that BFS-walks the map text and holds arrow keys:
   - `S8` (the full game): wins all three levels at frame 1818 with `score 13` (5 + 4 + 4 coins), `levelNum 3`; on every level `allSprites` equals tiles + the player (no ghosts after `level.delete()`); R mid-game restores `levelNum 0`, `score 0`, `won false`, 5 coins, 65 sprites; standing on the goal with coins left does nothing.
   - `S7`: collects 5 coins and wins level 1 at frame 820. `S6`: the player starts at (60, 60) and `tileAt` reads `P`, `#` and a space as expected.
   - `S10`: three clicks light 3 cells; a click on a lit cell turns it off; a click in the words strip (row 8) does nothing and does not crash; the last cell (399, 399) works.
   - `S11`: 40 bricks; (10, 65) removes brick (0, 0) and scores 10; a second click there does nothing; clicks above and below the wall do nothing; `hitAt` returns true then false; clearing all 40 gives score 400 and "Cleared!" on screen; R restores 40 bricks and score 0.
   - Challenge solution: row 0 is `2`s; the first hit on a two-hit brick leaves a `1` and scores 50, the second removes it and scores 100; a click on a gap returns false.
   - `E5` with the mouse off the canvas does not crash; `E9`'s strip clicks do nothing; deleting `r >= 0 &&` from `E9` and clicking the strip stops the sketch (shown in the reading's Try this).
   - Traps confirmed: `s[1] = 'X'` on a string leaves it unchanged (sloppy mode, which the runner uses: `runner.html` injects the sketch as a classic script); `g[8][0]` and `g[-1][0]` both throw `Cannot read properties of undefined`; `const map = [...]` is allowed (moSHion's `map()` is shadowed, harmless here).
2. **Real Chromium** (`playwright-cli`, session `gridspec`, closed afterwards; a same-origin host page around `runner.html`, because the runner refuses to run as a top-level document): `S8` loaded at level 1 with 5 coins and 58 walls; a real ArrowRight key held for a second moved the player from x 60 to 318 and picked up a coin (`score 1`);
   a screenshot showed dimgray walls, gold coins, the green goal and readable HUD text. `S11`: a real click at the first brick and one at row 1, column 6 removed exactly those bricks and scored 20 (canvas offset in the page accounted for). **Not run in a real browser:** `S10`, `E3`, `E5`, `E9` and every starter (headless only).
3. **Grading** with the app's own `lib/grader.ts`: each reference scores full, each starter scores 0 of N, 86 cheat and honest-variant cases (105 per-card assertions) agree, six layout mutations leave every reference at full, worst regex time under 25 ms (section 7).
4. **Quiz**: the correct option is longest in none of the five questions with text options; the keys are C, B, B, D, A, C, D.

Not checked: the lesson pages themselves (none exist), the quiz JSON build, the AI rubrics against the live model, `npm run prebuild` gates, and any cs-student lens walk (a beginner, moderate and advanced student reading the screens in order). The first builder round should be followed by the usual three lenses.

---

## 10. Module doc and groups outlines

### `curriculum/modules/6.9_grids-and-tile-maps.md` (shape of `5.5_snake.md`)
Frontmatter: `id: "6.9"`, `title: Grids and Tile Maps`, `quarter: 2`, `weeks: [16]`, `environment: moSHion`, `status: draft`. Sections: **`# Module 6.9: Grids and Tile Maps`** with the line `Quarter 2 · Week 16 · after §6.8 Joints`; **SLO Focus** (SLO 3: the artifacts are a playable game and a clickable grid; reinforces SLO 4: scanning and indexing a grid are algorithms and data structures); **Module Goal** (students build a maze whose levels are rows of text, read a map as data, and keep a grid of cells in an array of arrays that the screen is drawn from; the new ideas are the map, the pixel/cell conversion and the offset, and bounds);
**Pre-requisite snapshot** (§6.1-6.8 complete: groups and overlaps, the mouse, nested arrays from 3.3.20, nested loops from 2.4); **Post-requisite snapshot** (can write a level as text and build it with `Tiles`, find a letter and convert between pixels and cells, build, draw, click and count a grid of arrays; has a brick wall with `hitAt(x, y)` ready for a Breakout ball); **Note** (not a book section; 14 lessons in folders `6-9-grids-*`, the prefix kept when the module is renumbered into the systems block after 6.1, PLACEMENT.md item 12; words go in `drawTop()`; the maze is top-down on purpose; the brick wall is rects, not sprites, on purpose; `P` is deliberately not in the legend);
**The one idea this module is really about**: *a grid is data and the picture is drawn from it*: the maze map is read-only text that `Tiles` turns into sprites, the lights and bricks are arrays of arrays you change, and the only place pixels and cells meet is two small conversions (`c * TILE + TILE / 2` and `floor(x / TILE)`);
**Unit-level assessments** (6.9.1 and 6.9.12 are the AI-graded plan and playtest, 0 points and lenient like 5.5's; 6.9.13 is a short check; 6.9.14 closes on challenges graded by one card any one of the three turns green).

### `curriculum/groups/6.9.json` (shape of `5.5.json`)
`moduleId: "6.9"`, `source`: "Not a book section. The plan, build and playtest shape follows CodeHS's project modules in Introduction to Game Design; the tile-map and grid-of-bricks ideas follow Video Game Design in JavaScript's tile and Breakout ladders. Structure only: no CodeHS text, problems or code is copied." Lessons (groups):

| id | title | objective | screens |
| --- | --- | --- | --- |
| `plan-and-maps` | Plan, and a map is rows of text | Students will be able to plan a game as parts and remembered values, and read a level written as rows of text. | 6-9-grids-1, 6-9-grids-2, 6-9-grids-3 (full folder names) |
| `build-the-level` | Build the level | Students will be able to set Group defaults and build a level from a map with Tiles and a legend. | 6-9-grids-4 |
| `the-map-as-data` | The map as data | Students will be able to scan a map for a letter, and convert between a row and column and pixels. | 6-9-grids-5, 6-9-grids-6 |
| `the-game` | Coins, the goal and the levels | Students will be able to pick up coins, open a goal only when none are left, and load the next level from a list of maps. | 6-9-grids-7, 6-9-grids-8 |
| `a-grid-is-data` | A grid is data | Students will be able to build, draw, click and count an array of arrays, with the picture drawn from the data. | 6-9-grids-9, 6-9-grids-10, 6-9-grids-11 |
| `playtest-and-extend` | Playtest, check, and make it yours | Students will be able to playtest their own work, link what they saw to their code, and extend it with a rule of their own. | 6-9-grids-12, 6-9-grids-13, 6-9-grids-14 |

---

## 11. Build split for parallel builders

| Builder | Owns (disjoint) | Reads from this spec |
| --- | --- | --- |
| A | `lessons/6-9-grids-1-*` to `6-9-grids-4-*` (4 lessons), `curriculum/modules/6.9_grids-and-tile-maps.md`, `curriculum/groups/6.9.json` | sections 2, 3, 4 (6.9.1-6.9.4), 6 (6.9.1), 7 (6.9.4), 8.0, 8.1 (`S4`), 8.2 (`E3`), 10 |
| B | `lessons/6-9-grids-5-*` to `6-9-grids-8-*` (4 lessons) | sections 2, 3, 4 (6.9.5-6.9.8), 7 (6.9.6-6.9.8), 8.0, 8.1 (`S6`, `S7`, `S8`, the maps), 8.2 (`E5`) |
| C | `lessons/6-9-grids-9-*` to `6-9-grids-14-*` (6 lessons) | sections 2, 3, 4 (6.9.9-6.9.14), 5, 6 (6.9.12), 7 (6.9.10, 6.9.11, 6.9.14), 8.0, 8.2 (`E9`), 8.3 |

No builder needs another's output: the cross-lab chain (`S4` to `S8`) is written out in one marked source each, and every help pointer uses a title fixed in section 4. Builders must **not** commit regenerated shared files (`public/lessons-manifest.json`,
`public/lesson-requirements.json`, `public/ai-graders.json`, quiz keys, generated starters); the orchestrator regenerates them once after merging and runs the gate list from `codehs-review/LOOP-PLAN.md` (check-lesson-numbers, check-lesson-groups, check-prompt-pointers, check-help-pointer-titles, check-lesson-citations, check-hints, check-live-blocks,
check-starters, check-solution-leak, test-quiz, tsc, and `test-moshion.mjs --corpus`). `check-lesson-numbers` must be taught that `6.9.x` titles sit after `6.8.x`. Do not touch `.gauntlet/occt-checks.json`.

---

## 12. Totals, risks and open questions

**14 lessons**: 3 readings (6.9.2, 6.9.5, 6.9.9), 1 worked example (6.9.3), 6 labs (6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11), 1 plan and 1 playtest (AI, 0 points), 1 check, 1 challenges. 234 minutes.

**Risks and things a builder should know**

1. **Pacing.** Week 16 already holds 6.5 (364 min, PACING.md). With this module it is 598 min, 1.4 times the Q2 average of 440 min. `week: 16` is the owner's instruction; it is flagged here, not changed.
2. **`map` is also a p5 function name.** moSHion defines `map(v, a, b, c, d)`; a top-level `const map` or `let map` shadows it without error (checked). Nothing in this module uses `map()` the function, but a student who wants it later in the same sketch gets a `TypeError`. The fixed name is kept because it matches the `Tiles` docs and the brief.
3. **A string cannot be changed by index, and nothing says so.** `map[1][2] = 'x'` is silent in the classic-script runner. 6.9.5 says it in words and quiz-less; if students trip on it, a Try this in 6.9.5 can show it.
4. **`tileAt` with row and column swapped passes the card.** The pattern can only see that `floor(.../TILE)` appears twice and a `map[..][..]` read exists. The start tile is symmetric (`P` at 1, 1), so the corner readout also looks right at the start; the 6.9.6 hint says to walk to a coin and read it. A `tests` requirement could close it; it was not written.
5. **`rect` is top-left, sprites are centre.** The one conversion that bites beginners. 6.9.9 says it and 6.9.10's drawing step shows `c * CELL, r * CELL`; the quiz does not ask it.
6. **`Tiles` is moSHion's, not p5play's.** Searching online turns up p5play's form (`group.tile = '#'`, no legend), which moSHion does not support (`moshion.d.ts` says so). 6.9.2 says "this is moSHion's `Tiles`" and the in-app docs page "Tile maps from text" (`lib/moshion-docs.ts`) matches.
7. **Performance ceiling.** A sprite per tile; MOSHION-GAPS measured about 600 sprites as the point where frame time doubles (before the 3b77bf6 "exact overlap broadphase" resync, so likely better now; not re-measured). The maps here are 100 tiles. The brick wall is rects on purpose.
8. **Player at a corner.** The autopilot never snagged on tile seams and neither did the real browser run, in corridors 40 wide for a 26-wide player at speed 3. No claim is made about a student who changes the player size.
9. **Only the course's own checks ran; no student has walked it.** No cs-student beginner/moderate/advanced lens, no live AI rubric run, no quiz build, no `check-*` gate. Real Chromium covered `S8` and `S11` only.
10. **The Breakout hand-off is untested.** `hitAt(ball.x, ball.y)` tests only the ball's centre, so a ball clipping a brick's side or corner does not hit. That is acceptable for a first Breakout and is the Breakout module's problem; it is noted here so the builder of that module is not surprised.
11. **Starter comments carry no answers.** Every `// STEP N` comment says what to build, never the code; comments are stripped by the grader, so a starter cannot score from its own comments (checked: starters score 0).
12. **The challenge lab is bricks only.** There is no maze challenge (a trap tile, a fourth level); one Challenge idea, left out to keep the script single, is a spike letter `^` that sends the player back to `findStart(map)`.

**Open for the owner or orchestrator**

1. Pacing (risk 1): move 6.9 to week 17, or trim 6.9.14 (30 min) to an extension.
2. The renumber into the systems block after 6.1 (PLACEMENT.md item 12): the folder prefix `6-9-grids-` stays, the displayed `6.9.N` changes with it, and the `Help: 6.9.x` text in section 7 changes with it (a find-and-replace of the module number, checked by `check-help-pointer-titles`).
3. Whether a maze challenge should replace one brick challenge (risk 12).
4. Whether 6.9.5's string-immutability warning should become a quiz question (it is not one now; the quiz has seven).
