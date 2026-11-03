# cs-student-moderate lens, round 3: module 6.9 Grids and tile maps

Method. Rounds 1 and 2 (grids-moderate.md, grids-moderate-r2.md) and grids-fix-cases.md read first. Grader work: `lib/grader.ts`
`grade()` run directly (`node --import ./scripts/register-ts.mjs`) against the committed `lesson.json` requirements, about 150 shapes
built by splicing ONE function into each reference or starter (the course's own examples: 6.9.5 scan, 6.9.9 build/draw/flip/offset,
3.3.15/3.3.20 `for...of`, 2.4 `while`, 5.5.2 `cellToPixel`, 6.1.4 / 6.2.5 group loops, 6.2.2 callback). Baseline held: every starter
red, every reference green (6.9.4, .6, .7, .8, .10, .11, .14). Browser, session `g-moderate3` (closed), cookie `dev_student=gmoderate3`,
lock ON: 6.9.1-6.9.13 completed through `/api/lesson-state`, then 6.9.14 and 6.9.10 driven in the editor and read from the Quest strip.
No repo file edited; scratch harness in the session scratchpad only.

## Round 2 fixes: verified held (nothing newly red from the taught shapes I re-ran)

- 6.9.14 r1 ternary flip. HELD. `bricks[r][c] = bricks[r][c] === 2 ? 1 : 0`, also `> 1 ? 1 : 0`, `-= 1`, `= bricks[r][c] - 1`, `if === 2 {=1} else {=0}`,
  `score += (BRICK_ROWS - r) * 10`, `score = score + ...`, `const points = ...; score += points`, `if (r === 0) 50 else 10`, `[50,..][r]`, `r < 2 ? 30 : 10`,
  `(r + 1) * 10`, `score += 25`, and the three SHAPE reads (ternary, `switch`, `const ch = SHAPE[r][c]`, `const line = SHAPE[r]; line[c]`): all r1 green.
  Browser: full two-hit brick written the 6.9.9 way (row 0 pushed as 2, `> 0` in three places, `'silver'`, ternary flip, a sentence on line 1):
  strip 2/2, Submit enabled, Confirm Submission, lesson `completed`. This is the exact case round 2 left at 1/2.
- 6.9.14 r2 comment: sentence above the title, under the title, after a blank line, all green; a mid-file comment, a block comment `/* */`, and a
  comment starting with a digit stay red (by design; the step says "at the top").
- 6.9.10/6.9.11 r1 `while` build, `g.push([])` + `g[r].push(false)`, mixed `for`+`while`, `new Array(COLS).fill(false)`: green.
- 6.9.11 "take that off first": `y = y - TOP`, `const py = y - TOP`, `(y - 60)`: green; a click-offset left out is red (r2); column-only bounds is red (r3).
  6.9.10 bounds: early `return`, nested ifs, `0 <= r`, `r > -1`, `grid.length`/`grid[0].length`, `grid[r] && grid[r][c] !== undefined`: green.
- 6.9.11 r5: `score = score + 10`, `const points; score += points`, `hit` flag, nested ifs: green.
- 6.9.6: `cellToPixel(c)` helper, `(c + 0.5) * TILE`, `startX/startY`, `while`, `for...of` with counters, `Math.trunc`, `charAt`, `indexOf('P')`: green; `round` red.
- 6.9.7: nested ifs, `!coins.length`, `won = A && B`, swapped order, `== 0`, `coins.length < 1`, 6.1.4 `for (let coin of coins)`, 6.2.5 backwards index loop: green.
  Named callback (`overlaps(coins, pickUp)`) red r1/r2: no lesson models one, left alone as before.
- 6.9.8: last-level-first then increment, `< length - 1`, `>=`, `levelNum++`, literal 3, early `return`, `!== undefined` guard, group-level deletes: green.
- 6.9.4: goals declared apart, legend const, literal `20, 20, 40, 40`, green; `HALF = TILE / 2` still red r5 (same as before, policy).
- Help pointers: 6.9.4 r3/r4 and 6.9.8 r4 now "step N of this lab", 6.9.7 -> 6.2.2/6.2.3/6.9.5, 6.9.11 r5 "step 2 of this lab": each lands (I read 6.2.2's `score++` and
  6.9.5's `&&` and `levels.length` paragraphs). `check-lesson-citations.mjs`: 825 lessons resolve; the two FORWARD notes are in 1.4.9 and 6.4.4, not 6.9.
- 6.9.13 q6 reworded and still keyed correctly (option 3). 6.9.5 live-block comment ("Forward:" removed) fine.

## Findings

### 1. 6.9.10 r6, 6.9.10 r2 and 6.9.11 r6 still demand `for`, one rule after round 2 made r1 accept `while`  (BLOCKS SUBMIT, verified in the browser)
6.9.10 <- 6.9.9 / 2.4. Round 2 changed r1 to "two loops, for or while", and that is what a student reads. A student who then builds the grid with `while`
(accepted) writes `countLit` the same way, and r6 refuses it: browser, 6.9.10 with `makeGrid` and `countLit` both written as nested `while`: strip **5/6**,
"Still needed (1)", Submit disabled. Measured with the grader on single splices:
- `countLit` as nested `while` (with `c = c + 1` / `r = r + 1`): 6.9.10 r6 F; 6.9.11 `bricksLeft` nested `while`: r6 F.
- `countLit` with a `for` outer and a `while` inner: r6 F.
- `drawGrid` as nested `while` (6.9.10): r2 F ("The picture is drawn from the grid"); the same shape in 6.9.11 `drawBricks` is green. So even the two labs disagree.
Cause: all three patterns open with `(?=[\s\S]*\bfor\b[\s\S]*\bfor\b)`; r1 and 6.9.11 r1 were widened to `(?:for|while)`, nothing else was.
Distance from the model: none, `while` is exactly what r1's own card says is fine. Medium: `while` is taught only back in 2.4 and this module's examples are all `for`, so most
students will not hit it, but the one who takes the permission r1 gives is stopped at the next card with no explanation of why `while` was fine a card ago.
Fix: change `\bfor\b[\s\S]*\bfor\b` to `\b(?:for|while)\b[\s\S]*\b(?:for|while)\b` in 6.9.10 r2 and r6 and 6.9.11 r6 (check 6.9.11 r2/r6 `for ... of` branches keep working), or revert r1 to `for` only and say so.

### 2. Still open, low, unchanged from round 2 (not re-opened by round 2's edits)
- 6.9.10 r1: `row[c] = false; g[r] = row` (index assignment build) is red. Plausible but not modelled anywhere in 6.9.
- 6.9.10 r6 / 6.9.11 r6: a row alias (`const row = grid[r]; row[c]`) is now GREEN (it was red in round 2); the hybrid `for (let cell of grid[r])` under an index outer loop, `forEach`, and `ROWS * COLS - dark` are still red. None modelled in 6.9.
- 6.9.14 r1: a `const shape = SHAPE; shape[r][c]` alias is red; `const line = SHAPE[r]` now green. Fine.
- 6.9.13 q6 key text says "reading a cell from it stops the sketch" but the question's code is a WRITE (`grid[r][c] = ...`); the sketch does stop (TypeError on `undefined[c]`), only the verb is loose.

## Behaviour traps still open (lax, unchanged; re-measured this round)
`coins[0].delete()` in 6.9.7 still green; 6.9.7 `coin.delete()` for the wrong sprite is not caught by any card. Everything else on the round 2 list was not touched.

## Seams
- 6.9.9 -> 6.9.10 / 6.9.11: carries with one-word edits for build, draw, offset, bounds, flip, count, EXCEPT the `while` count above.
- 6.9.11 -> 6.9.14: carries; every honest challenge shape I built (3 challenges, ~15 spellings) is accepted.
- 6.9.5 -> 6.9.6 -> 6.9.8: carries; `findStart` reused unchanged.
- No new forward references; no prose reference drifted ("the next two labs", "the last lab of the maze", "6.9.8's `levels`" all still resolve).

## Single biggest gap
Finding 1: the `while` permission added in round 2 stops at the first card. 6.9.10 and 6.9.11 accept a `while` build and refuse the same student's `while` count (and `while` draw in 6.9.10), leaving 5/6 and a disabled Submit.
Otherwise clean: all round 1 and round 2 fixes held and no taught shape went red.
