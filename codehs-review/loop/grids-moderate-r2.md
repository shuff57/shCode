# cs-student-moderate lens, round 2: module 6.9 Grids and tile maps

Method. Round 1 (grids-moderate.md) and the fix table (grids-fix-cases.md) read first. Grader work: `lib/grader.ts` `grade()` run
directly (`node --import ./scripts/register-ts.mjs`) against the committed `lesson.json` requirements, about 150 shapes built by
splicing ONE function into each lab's reference, copying the course's own earlier examples (6.9.5 scan, 6.9.9 build/draw/flip/offset,
3.3.15 nested `for...of`, 2.4 `while`, 5.5.2 `cellToPixel`, 6.1.4 / 6.2.5 group loops, 6.2.2 callback). Baseline held: every
starter red, every reference green (6.9.4, .6, .7, .8, .10, .11, .14). Browser, session `g-moderate2` (closed), cookie
`dev_student=gmoderate2`, lock ON: 6.9.1-6.9.5 and 6.9.9 completed through `/api/lesson-state`, then 6.9.6 and 6.9.14 driven in the
editor and read back from the Quest strip. Run via the Run BUTTON: the strip does not update until a Run finishes (a Ctrl+Enter sent
from my script right after inserting text left "Stop" showing and no sketch iframe; I could not tell if that is the script's focus or a
real defect, so it is not reported).

## Round 1 fixes: verified held

- A (6.9.6 refuses `cellToPixel`): HELD. Reference plus `cellToPixel(c)`/`cellToPixel(r)` helper: all green in the grader, and in the
  browser the strip reads 5/5 with Submit enabled. Also green: `TILE / 2 + c * TILE`, `TILE * (c + 0.5)`, literal `c * 40 + 20`,
  `const half`, `{ x, y }` shorthand, the 6.9.5 live-block `startX/startY` form, `while` loops, `indexOf('P')`, `for...of` with counters.
- B (6.9.11 "take that off first"): HELD (`y = y - TOP`, `const py = y - TOP`, `let yy`, `Math.floor((y - TOP) / BH)` all green).
- C (6.9.10/6.9.11 nested `for...of` count): HELD for the 3.3.15 shape (`for (let row of grid) { for (let cell of row)`, braces, `n = n + 1`, `=== true`, `.filter`).
- 6.9.10 `=== 1` copied from 6.9.9 fill: still red r2 (trap 1 closed). 6.9.9 now has the "test a cell the way the grid stores it" bullet and 6.9.10 step 2 says it.
- 6.9.8 "level 4 of 3": fixed in both script.js and solution.js (`Math.min`). Breakout forward reference: gone. Citations: 825 lessons resolve.

## Findings, blocking first

### 1. 6.9.14 r1 refuses the two-hit brick written the way 6.9.9 writes a flip (BLOCKS SUBMIT, verified in the browser)
6.9.14 <- 6.9.9. 6.9.9's "Changing a cell" models `grid[r][c] = grid[r][c] === 1 ? 0 : 1`. A student doing challenge 2 adapts
that by one number: `bricks[r][c] = bricks[r][c] === 2 ? 1 : 0;`, row 0 pushed as 2, every `=== 1` changed to `> 0`, a silver 2, and a
comment sentence. Browser result: "You changed one rule of the wall: Not yet", "You wrote your sentence: Passed", strip 1/2, Submit disabled.
The challenge is fully done. r1's challenge-2 branch accepts only `-= 1`, `--`, `= 1` and `= bricks[r][c] - 1`; the `if (=== 2) = 1 else = 0`
form was accepted in round 1 (fix table) but the ternary of the SAME logic is not. Also red: a second `hp[r][c]` array.
Fix: add `bricks[r][c] = bricks[r][c] === 2 ? 1 : 0` (any `bricks[..][..] = ... ?`) to r1, or accept any `bricks[r][c] =` assignment whose
right side mentions `bricks[r][c]`. Distance from the model: one number changed, so this is the course's own shape being refused.

### 2. 6.9.10 r1 and 6.9.11 r1 refuse `while` and the `g.push([])` / `g[r].push(false)` build; 6.9.6 r1 accepts `while`
6.9.10 <- 6.9.9 / 2.4. The step says "two loops" and the reading uses `for`, so refusing `while` is defensible, but 6.9.6 r1 in the same module
takes `while`/`for` alike, so the module disagrees with itself. Red in 6.9.10 r1: nested `while` build; `g.push([])` then `g[r].push(false)`
(3.3.3/3.3.17 index-and-push style); `row[c] = false` with `g[r] = row`; `Array.from(...)`. 6.9.11 r1: nested `while`. Only
`new Array(COLS).fill(false)` inside a `for` passes. The first two are plausible middle-student shapes (the step does say "make an empty
array called `row`", which is why I rate this medium-low). Fix: let r1 count `while`, and accept `g[r].push(...)` after `g.push([])`.

### 3. 6.9.11 r5 refuses a named points value and a `hit` flag
6.9.11 <- 6.9.7 / 6.2.2. r5 needs `score += <digit>` and the literal text `return true`. Red: `const points = 10; score += points; return true;`
and `let hit = false; ... hit = true; return hit;`. 6.9.14 r1 accepts `const points = ...; score += points`, so the same module takes the shape
in the challenge and refuses it in the lab. The `hit` flag is the shape 6.9.7's `won` flag models. Low-medium. Fix: allow `score += [A-Za-z_]\w*`.

### 4. 6.9.10 r6 and 6.9.11 r6 refuse a row alias and the hybrid loop
6.9.10 <- 3.3.15/3.3.16. Red: `const row = grid[r]; ... row[c]`, and `for (let cell of grid[r])` under an index outer loop; 6.9.11 r6 red:
`for (let row of bricks) { for (let c = 0; c < row.length; c++) if (row[c] === 1)` and counting gaps then `ROWS * COLS - gaps`.
Round 1 only fixed the pure `for...of` pair. No lesson in 6.9 models the alias, so this is not blocking; note only.

### 5. 6.9.14 r1 refuses an alias into SHAPE
`const line = SHAPE[r]; line[c] === '#'` and `const shape = SHAPE; shape[r][c]` are red; `for (let line of SHAPE)`, `SHAPE[r].split('')`, `SHAPE[r][c]`
and `switch (SHAPE[r][c])` are green. Same family as 4. Low. (A rule of your own, such as a row colour or `BW`, is red by design: the card says "one of three".)

### 6. Help pointers: what still points at a lesson that does not teach the line
Round 1's D is mostly fixed (6.9.7 r2 -> 6.2.2, r1 -> 6.2.3, r3 -> 6.9.5, r4 -> "step 2 of this lab"; 6.9.4 now 6.9.2). What remains, all small:
- 6.9.11 r5 "A hit scores and says true": Help 6.9.9. 6.9.9 has no score and no `return true`; 6.9.7 / 6.2.2 teach `score +=`. The `return true` is only in this lab's step 2.
- 6.9.8 r4 (`levelNum += 1`, `loadLevel`): Help 6.9.7. 6.9.7 has neither; only 6.9.8's own step 2 teaches them. r2 (`levels[n]`): Help 6.9.2, but `levels[0]` / `levels[1][3][2]` is in 6.9.5 (6.9.2 only has `Tiles`).
- 6.9.4 r3 (the goal is its own Group, `'G'`): Help 6.9.2; 6.9.2 has no goal and no `'G'` (only `#` and `c`). The shape is a copy of the coins lines, so it is reachable, the pointer just adds nothing.
All numbers resolve; none sends a student to a later lesson.

## Seams (could a student who did the first piece well start the second?)

- 6.9.9 -> 6.9.10: yes. Build, draw (`=== 1` vs boolean now spelled out), floor+offset, bounds and `!` flip all carry with a one-word edit. `drawGrid` in `for...of` with counters, `if/else fill`, `grid.length`, `ROWS/COLS` and early return all green.
- 6.9.9 -> 6.9.11: yes (finding 3 aside); offset taught inline and with `y = y - TOP` both accepted.
- 6.9.11 -> 6.9.14: carries except finding 1.
- 6.9.5 -> 6.9.6 -> 6.9.8: carries; `findStart` is reused unchanged by 6.9.8 r3. 6.9.8 `loadLevel` accepted with `level != undefined`, `levelNum` for `n`, `findStart(map).x`, `player.pos`; `walls/coins/goals.removeAll()` red (not in the course, fine) and a `nextLevel()` helper red r4/r5 (left alone as in round 1).
- 6.9.7: iterating the group (6.1.4 `for (let coin of coins)`, 6.2.5 backwards index loop and `[...coins]`) all green with `player.overlaps(coin)`; a named callback defined outside `collect` is red r1/r2 (no lesson models one).

## Behaviour traps still open (lax, transfer-shaped, unchanged from the fix table's "declined")

`coins[0].delete()`, `hitAt` column-only check with a row upper bound, `bricks[r][c]` truthy test, `makeGrid` sharing one row. Not re-measured.

## Not findings

Two-ways-to-bound (`r > -1`, `0 <= r`, `grid[0].length`), `Math.floor`, `mouse.x` instead of the `x` parameter, `if (y < TOP) return` alone (red by policy), `== 1`, and `y < TOP`-only guards in 6.9.11 r3 (red by policy).

## Single biggest gap

6.9.14 r1 against the ternary two-hit brick (finding 1). It is the one place where the grader refuses a shape that 6.9.9 literally wrote down, the
challenge is genuinely complete, and the student ends at 1/2 with Submit disabled.
