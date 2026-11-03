# cs-student-moderate lens: module 6.9 Grids and tile maps (6.9.1 to 6.9.14)

Method. Walked as `dev_student=gmoderate` on the dev server (lock ON, no stubbing), session `g-moderate` (closed). Every lesson
finished through its UI: 6.9.1 plan, 6.9.2/6.9.5/6.9.9 marked complete, 6.9.3 live block run, labs 6.9.4, .6, .7, .8, .10, .11, .14
run, requirement strip read, Submit + Confirm, quiz 6.9.13 answered (6/7 recorded), 6.9.12 submitted. Lesson state read back from
`/api/lesson-state` (all 14 `completed`; 6.9.14 lands on "Lesson 14 of 14", next 7.1.1 locked).

Grader work: `lib/run-tests-node.ts` bundled with esbuild from the working tree, then ~110 shapes run against the real requirements.
Candidates were built from the course's own earlier examples (6.9.5 scan, 6.9.9 live grid, 5.5.2 `cellToPixel`, 3.3.20 `for...of`
nested loop, 6.1 group calls) by splicing one function into each reference or starter. Baseline held: every starter fully red,
every reference fully green (6.9.4, .6, .7, .8, .10, .11, .14). Cheats caught as intended: `return ' '` in `tileAt`, `return 0`/constant in
the counters, no-flip in `clickCell`, no coin test in `checkGoal`, no grid read in `drawGrid`, round instead of floor.

Not exercised: the AI graders (6.9.1 and 6.9.12). The dev server has no Workers AI or Ollama key, so Submit answers "The grader isn't
responding right now. Your answer has been saved and sent to your teacher" and the lesson still goes `completed`. Rubric text for
6.9.12 was read; it is "very generous" by design and was not measured.

Citations: `check-lesson-citations.mjs` is clean for 6.9 (825 lessons). I resolved all 27 number-shaped citations by hand against titles
(2.1.20, 2.1.29, 2.1.33, 2.2.19, 2.4.24, 3.2.11, 3.3.20, 3.3.21, 3.5.3, 5.2.6, 5.4.6, 5.5.1, 5.5.2, 6.2.3 and the 6.9.x ones): all land on
the right topic. The prose references ("in the next reading", "the last lab of the maze", "this module's maps are 10 by 10", "the next two
labs") all resolve. The wrong-topic pointers are in the requirement "Help:" lines, see D below.

## Findings (blocking first)

### A. 6.9.6 r3 refuses `cellToPixel`, the function 6.9.5 itself points the student at  (BLOCKS SUBMIT)
6.9.6 <- 6.9.5 and 5.5.2. 6.9.5 says "This is the same rule as 5.5.2's `cellToPixel`". A student reaches back for 5.5.2, pastes
`function cellToPixel(n) { return n * TILE + TILE / 2; }` and writes `return { x: cellToPixel(c), y: cellToPixel(r) };` in `findStart`.
Grader: r1 P, r2 P, r3 F "Row and column become pixels", r4 P, r5 P. In the browser the strip reads 4/5, "Still needed (1)",
Submit is greyed out. The sprite is on the P correctly, so the student sees a working game and a red card. Also refused: `const half =
TILE / 2` then `c * TILE + half`. The only accepted spelling is the literal `c * TILE + TILE / 2` (or `(c + 0.5) * TILE`, `+ 20`).
Fix: let r3 pass when `findStart` calls a helper whose body has the formula, or accept `cellToPixel(`/`toPixel(`-style calls; or drop the
5.5.2 sentence from 6.9.5. This is the "grader vs the course's own model" case: the course modelled the helper, the grader will not take it.

### B. 6.9.11 r2 refuses the exact phrase the step uses: "take that off first"  (BLOCKS SUBMIT)
6.9.11 <- 6.9.9. The step: "The wall starts TOP pixels down, so take that off first". 6.9.9 only models the offset inline,
`floor((mouse.y - TOP) / CELL)`. A student who reads "take it off first" and writes `y = y - TOP;` then `const r = floor(y / BH);`, or
`const inWall = y - TOP;` then `floor(inWall / BH)`, gets r2 F. In the browser: 5/6, Submit disabled. Behaviour is correct (checked:
clicks remove the right brick). r2's pattern needs `floor(` with `TOP` or `60` inside the same call. A second shape, `floor(y / BH) - 3`,
passes only because the pattern allows a literal 3 (lax in the other direction).
Fix: r2 should accept a subtraction of TOP anywhere in the function before the divide by BH.

### C. 6.9.10 r6 and 6.9.11 r6 refuse the nested `for...of` that 3.3.20 teaches, while r2 in the same lab accepts it
6.9.10/6.9.11 <- 3.3.20 ("Lists Inside Lists": `for (let row of grid) { for (let cell of row) {...} }`). Refused:
`for (const row of grid) { for (const cell of row) { if (cell) n++; } }` (6.9.10 r6 F; 6.9.11 `for (const b of row) if (b === 1) n++` r6 F) and
the two-line `const cell = bricks[r][c]; if (cell === 1) n++`. Accepted in the same file: the `for...of` version of `drawGrid` (r2 passes by an
explicit `for ... of grid` branch). So the lab accepts the shape for drawing and refuses it for counting. `.filter(` and `+= bricks[r][c]` pass.
Fix: add the `for ... of` branch (and "a variable holding the cell") to r6 in both labs.

### D. Help pointers that name the wrong lesson (cited numbers that point at the wrong topic)
All numbers resolve; several point at a lesson that does not teach the requirement:
- 6.9.7 r3 and r4 ("no coins left AND on the goal", `won = true`): Help 6.9.3. 6.9.3 has no goal, no `&&`, no `won`. Right pointers: 2.1.29 (`&&`) and 6.9.4 for `goals`.
- 6.9.7 r2 (score goes up): Help 6.9.3. 6.9.3's callback deletes the coin but never touches a score.
- 6.9.8 r4 and r5 (`levelNum += 1`, `loadLevel`, last level): Help 6.9.7. 6.9.7 has neither `levelNum` nor `loadLevel`; only 6.9.8's own step text teaches them.
- 6.9.4 r3 (goal is its own Group): Help 6.9.3. 6.9.3 has no `goals` Group and no `'G'` in its legend, so `'G': goals` and `goals.collider = 'none'` are used in 6.9.4 with no earlier model (they are copies of the coins shape, so a middle student gets there, but the pointer is empty).

### E. 6.9.14 r1 refuses honest versions of the challenges the step describes
Run against the starter (the finished wall) with one rule changed. Accepted: `score += (BRICK_ROWS - r) * 10`, `score += 10 * (5 - r)`,
`score += POINTS[r]`, `bricks[r][c] -= 1` / `= bricks[r][c] - 1`, `SHAPE[r][c] === '#'` ternary. Refused:
- `score = score + (BRICK_ROWS - r) * 10` (6.9.7 r2 and 6.9.11 r5 both accept `score = score + ...`; 6.9.14 does not).
- `const points = (BRICK_ROWS - r) * 10; score += points;`
- `if (r === 0) { score += 50; } else { score += 10; }`
- Challenge 2 as `if (bricks[r][c] === 2) { bricks[r][c] = 1; } else { bricks[r][c] = 0; }`
- Challenge 3 as `const ch = SHAPE[r][c]; if (ch === '#') ...`, `switch (SHAPE[r][c])`, or `for (const ch of line)`. The step says "read it with `SHAPE[r][c]` (the same two-index read as 6.9.5)", and 6.9.5 does compare `map[r][c]` inline, but 3.3.20 teaches `for...of` and the step permits "any one".
Step 2 ("write one `//` comment ... what would happen if you removed it") has no requirement at all, so it is unchecked.

## Behaviour traps the grader cannot see (lax, transfer-shaped)

1. **6.9.9's live example uses 1/0 and `=== 1`; 6.9.10 uses true/false.** A student copies the model into `drawGrid`:
   `fill(grid[r][c] === 1 ? 'gold' : '#334')`. Result: 6/6 green and Submit enabled. Verified in the browser: clicking cells lights nothing, because
   `!grid[r][c]` makes `true` and `true === 1` is false. The correct version lit the clicked cell in the same session, so the click path was fine.
   The step text spells out the truthy form, but the course's only worked drawing loop is the `=== 1` one. Cheapest bridge: say in 6.9.10 step 2
   "6.9.9 compared with `=== 1` because its cells were numbers; yours are `true`/`false`", or have r2 require the fill not to compare to 1.
2. **6.9.10 r1 passes a shared row.** `const row = []` filled once outside the outer loop, then `g.push(row)` eight times: r1 P (and 6.9.10's whole strip green).
   Every row is the same array, so one click flips a whole column. The reading shows `row` made inside the outer loop, so it is a slip, not a modelled shape.
3. **6.9.11 r3 passes a column-only bounds check** (`c >= 0 && c < BRICK_COLS && bricks[r][c] === 1`); a click above or below the wall then reads `bricks[undefined]`
   and stops the sketch, which is the lab's own named failure. r3's description says "above AND below".
4. **6.9.7 r1 passes `coins[0].delete()`** inside `if (player.overlaps(coins))`; 6.1.8 warns against exactly that ("deleting the wrong one is easy").
5. **6.9.8 without the `if (level)` guard** passes 5/5 (r1 sees `level.delete(`) but crashes at the first frame: "TypeError: Cannot read properties of undefined (reading 'delete')
   @ sketch.js:81". The UI handles it well: the strip stays green but Submit greys out with "Run your code again - the last run had an error".
6. **6.9.8 r1 accepts `walls.delete(); coins.delete(); goals.delete();`**, the Group-level form; it ran to the win screen in the browser, so it is fine. `walls.removeAll()` is
   refused, but `removeAll` appears nowhere in the course, so that is not a finding.

## Shipped-state defects seen while playing

- **6.9.8 win screen reads "level 4 of 3".** `drawTop` (given in the starter, student cannot avoid it) prints `levelNum + 1`, and `checkGoal` bumps `levelNum` to 3
  before setting `won`. Observed in the browser on the reference run (score 13, "You escaped!"). The 6.9.8 step text promises 'You escaped!' and says nothing of a level counter.
- **6.9.4 starter comment disagrees with the step.** The starter comment: "make a Group called walls ... color is slategray". The step: the Group is already made, color `'dimgray'`.
  A student who follows the comment gets a different colour from 6.9.2/6.9.3 (not graded).
- **6.9.6 step 3 promises `standing on: [ ]`** before the student writes `tileAt`; the starter's `tileAt` returns nothing, so the corner reads `[undefined]` until step 3.

## Forward references

- 6.9.11 hint 2: "This is the function a Breakout ball will call later through `hitAt(ball.x, ball.y)`". No lesson in the course builds a Breakout ball or calls `hitAt`
  (grep of `lessons/` outside 6-9: no `hitAt`, no Breakout; 7.1.1 Arcade Cabinet does not use it). The promise does not land.
- Landed: 6.9.2 "use `level.delete()` in 6.9.8"; 6.9.2 "in the next reading you will use that on purpose" (the `P` in 6.9.5); 6.9.5 "the last lab of the maze uses exactly this" (6.9.8's `levels`);
  6.9.5 "an array of arrays, which is 6.9.9"; 6.9.9 "the next two labs draw straight from the data".

## Transfer, the seams (could a student who did the first piece well start the second?)

- 2.4.24 -> 6.9.5/6.9.6. Carries, with one bridge present. 2.4.24's only nested loop has two constant bounds (`row <= 3`, `col <= 4`) and prints; the inner bound that depends on the outer
  row (`c < map[r].length`) is first shown in 6.9.5's coin counter and then copied in 6.9.6 with `return` inside. Distance: one `if` body changed, one `return`. Good design. The
  `return { x, y }` from inside two loops is modelled only as a stub in 6.9.5; a student who copies the live block's "assign to `startX`/`startY`" form and returns them at the end also passes (tested).
- 3.3.20/3.3.21 -> 6.9.9/6.9.10. 3.3.21 gives a literal board and a `for...of` print; the push-a-row-into-a-grid build is first shown in 6.9.9 and is genuinely new, with its own example. Fine. What does
  not carry is the loop shape: after 6.9.5 every grid loop in the module is the index form, so a student who reaches back to 3.3.20's `for...of` is refused (finding C) although they were taught it.
- 5.5.2 -> 6.9.5/6.9.6. Carries conceptually, refused by the grader (finding A).
- 6.9.9 -> 6.9.10. `rect` top-left vs sprite centre is taught fresh and carries; the `=== 1` vs `true` model change is the trap (behaviour trap 1).
- 6.9.9 -> 6.9.11. The offset example carries in the inline form only (finding B).
- 6.9.11 -> 6.9.14. Carries; the grader narrows what "any one challenge" means (finding E).
- 6.9.13 quiz: all seven `source` strings resolve; the answer key checks out against the readings (q3 140, q4 floor 3, q5 row 2).
- Only-one-shape: every nested loop over 2D data in 6.9.5, .6, .9, .10, .11, .14 is `for (let r = 0; r < X.length; r++) { for (let c = 0; c < X[r].length; c++) {`. No `for...of`
  and no `forEach` example anywhere in the module. A student learns the shape, not the idea, and the graders then enforce the shape (C).

## Not findings (checked and fine)

All levels in 6.9.8 are solvable (BFS from `P`: every coin and `G` reachable, no ragged row). The lock held: 6.9.6 stayed "Lesson locked" until 6.9.5 was marked complete.
`nextLevel()` as a helper is refused by 6.9.8 r4 (`levelNum += 1` outside `checkGoal`); that is the plain "increment must be inside" shape and I would leave it.
No abbreviations (`'s'`, `'n'`) are taught anywhere in the course for `collider`, so refusing them in 6.9.4 is right; `HALF = TILE / 2` is refused by 6.9.4 r5 but 6.9.2 names `TILE / 2` literally.

## Single biggest gap

6.9.6 r3: the lab pointed at 5.5.2's `cellToPixel` by name, and a student who reuses it is left at 4/5 with Submit disabled and a correct-looking game. Same family as B and C
(a taught shape the grader will not take), but A is the one where the lesson itself sends the student to the example the grader then refuses.
