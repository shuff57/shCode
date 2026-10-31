# Advanced lens: module 6.9 Grids and Tile Maps

Run 2026-10-31. Labs 6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11, 6.9.14 and quiz 6.9.13. Policy applied: grading is LAX, so only false greens that skip the lesson's point are reported as findings. Over-strict refusals of differently shaped answers are listed once, as "tested", with a note on whether the course teaches the shape.

## Method

- Real grader: `lib/grader.ts` bundled with esbuild, each lab's own `lesson.json` requirements, no changes to the repo. Comments are stripped by default; **none of the seven labs sets `ignoreStrings`**, so string contents count as code.
- 159 candidate files (cheats, honest differently-shaped answers, reference function bodies), including 5 whole-lab "paste the reference into a string" variants and 2 minimal two-string versions. A crude stub of the p5play globals ran the three worst cheats frame by frame (6.9.7 bare expression, 6.9.8 ungated, 6.9.8 delete-after-build) to confirm what the game does. Not done in a browser.
- Every untouched starter is 0 and every `solution.js` is full on all seven labs (4: 0/5 and 5/5; 6: 0/5, 5/5; 7: 0/4, 4/4; 8: 0/5, 5/5; 10: 0/6, 6/6; 11: 0/6, 6/6; 14: 0/1, 1/1).
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/` (`gen.py` makes the cases, `runall.cjs` grades them, `ovr.cjs` holds the patched patterns, `base.txt` / `ovr.txt` are the before and after tables).

## GAMEABLE, cheapest first

### 1. Every lab: a string literal turns the cards green (6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11)

Minimum passing input, 6.9.7, the starter plus two statements, scores 4/4 and the game does nothing (no coin is picked up, no goal logic):
```
function collect()   { "player.overlaps(coins); coin.delete(); score += 1"; }
function checkGoal() { "coins.length === 0; player.overlaps(goals); won = true"; }
```
6.9.8 is 5/5 the same way (`"level.delete(); new Tiles(levels[n]); findStart(map); player.x"` in `loadLevel`, `"levelNum += 1; levelNum === levels.length; loadLevel(levelNum); won = true"` in `checkGoal`). 6.9.4 is 5/5 with the starter plus one line, `const s = "walls.collider = 'static'; coins.collider = 'none'; goals.collider = 'none'; new Tiles(map, 20, 20, TILE, TILE, {'#': walls, 'c': coins, 'G': goals})";`. Pasting the whole reference body into the empty starter function as a template-string statement is 5/5, 4/4, 5/5, 6/6, 6/6 on labs 6, 7, 8, 10, 11.

Cause: `readableSource()` strips comments but blanks strings only when the requirement sets `ignoreStrings: true` (63 other lessons already do). None of these 7 does.

Tighten: `"ignoreStrings": true` on every requirement of 6.9.7, 6.9.8, 6.9.10, 6.9.11, and on 6.9.6 r3, r4, r5. Do NOT set it on 6.9.4 (patterns need `'static'`, `'none'`, `'#'`), 6.9.6 r1/r2 (need `'P'`) or 6.9.14 r3-alt (needs `'#'`).
- Must start failing: the string cheats above (labs 7, 8, 10, 11 drop to 0 cards; 6.9.6 drops to 2/5, r1 and r2 still match `'P'`).
- Must keep passing: every `solution.js`, and all 100+ honest shapes below, which are identical before and after (diff of `base.txt` against `ovr.txt` shows no honest line changed except the improvements in finding 7).
- Starters stay 0.
- Cost: one JSON key per requirement. 6.9.4 stays open (a string still works there); a dead, never-called function also passes everywhere (see "not fixable by regex").

### 2. 6.9.8 checkGoal: the condition that opens the goal is not graded at all. 5/5, wins in three frames

Minimum passing input (with the reference `loadLevel`):
```
function checkGoal() {
  levelNum += 1;
  if (levelNum === levels.length) { won = true; } else { loadLevel(levelNum); }
}
```
5/5. `draw()` calls `checkGoal()` every frame, so the stub run shows `levelNum` 1, 2, 3 and `won = true` on frame 3 with `score: 0` and no coin touched. The same 5/5 with `||` in place of `&&` around the reference condition.
Cause: r4 wants `levelNum += 1` and `loadLevel(` somewhere in `checkGoal`; r5 wants `levelNum ... levels.length` and `won = true`. Neither mentions `coins.length` or `goals`. 6.9.7 r3 grades exactly that condition; 6.9.8 step 2 repeats it ("when no coins are left and the player is on the goal") and grades none of it. This is a missing measurement.

Tighten r4 (patched pattern in `ovr.cjs`, key `8:r4`): `coins.length` and `player.overlaps(goals)` (or `goals.overlaps(player)`) must each appear BEFORE the `levelNum` increment, and `loadLevel(` must be present.
- Must start failing: the ungated cheat (4/5, r4).
- Must keep passing: reference (5/5); `levelNum++`; `levelNum = levelNum + 1`; `< levels.length` / `>= levels.length` / literal `3` end tests; check-before-increment (`if (levelNum === levels.length - 1) won = true; else { levelNum++; loadLevel(levelNum); }`); a `last` flag; `player.overlaps(goals) && coins.length === 0`. All 8 checkGoal shapes tested stay 5/5.
- Starter 0/5.
- Left open on purpose: `||` and a bare `coins.length; player.overlaps(goals); levelNum += 1;` (needs a deliberate dummy).

### 3. 6.9.7 checkGoal: no `&&`, no `if` needed. 4/4 and the goal wins on frame 1

```
function checkGoal() {
  coins.length === 0 && player.overlaps(goals);
  won = true;
}
```
4/4 (with the reference `collect`). Stub run: `won = true` on frame 1, five coins still on the map. Also 4/4 with `||`: `if (coins.length === 0 || player.overlaps(goals)) { won = true; }`, the exact slip step 2 contrasts ("nothing should happen until the last coin is gone").
Cause: r3 and r4 are independent whole-body lookaheads; `won = true` need not be under anything.

Tighten r4 (key `7:r4`): `\bif\s*\([^{}]*\)[\s\S]*?\bwon\s*=\s*true\b`.
- Must start failing: the bare-expression cheat (3/4, r4); `won = true;` alone (2/4).
- Must keep passing: reference; nested `if (A) { if (B) { won = true; } }`; swapped order; `!coins.length && ...`; `==`; `const allGone = ...; if (allGone && ...)`; and the guard form `if (coins.length > 0) return; if (player.overlaps(goals)) won = true;` stays 3/4 (r3), unchanged from today.
- Starter 0/4.
- Still passes (lax, left alone): the `||` slip. If you want it gone, r3 needs an `&&` or a nested `if` between its two halves; I did not build that because it would refuse the flag-variable form.

### 4. 6.9.10 r4 and 6.9.11 r3: the bounds test may come AFTER the read, and `!== undefined` is accepted. These crash on the click the lab tells you to try

6.9.10:
```
const c = floor(x / CELL);  const r = floor(y / CELL);
if (grid[r][c] !== undefined) { grid[r][c] = !grid[r][c]; }
```
6.9.10 r4 is green. Clicking the strip under the grid gives `r = 8`, `grid[8]` is undefined, `grid[8][c]` throws: the quiz's q6 and step 3's warning. Also green: `grid[r][c] = !grid[r][c];` followed by an unused `const ok = r >= 0 && r < ROWS && c >= 0 && c < COLS;`.
6.9.11:
```
if (bricks[r][c] === 1 && r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS) { ... }
```
6.9.11 r3 is green, and a click above the wall (`r = -1`) throws. The step says "put the row and column tests BEFORE `bricks[r][c] === 1`" and the reading (6.9.5, 6.9.9) teaches the order and has a "delete the `r >= 0 &&` half and click" experiment. The order is the lesson; no card measures it.
Cause: both patterns are order-blind lookaheads, and both have a bare `!==? undefined` alternative.

Tighten (keys `10:r4`, `11:r3`): the comparison(s) must occur before the first `grid[..][..]` / `bricks[..][..]` read. `grid[r]?.[c]` stays accepted. `!== undefined` is accepted only when joined with `&&` or followed by `) return`, and a `grid[r] && grid[r][c]` truthy-row guard is added.
- Must start failing: guard-after-read (both labs), `!== undefined` read-first (both), dead-guard-then-flip (6.9.10).
- Must keep passing: reference (both); `if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;` then flip; `r < grid.length && c < grid[r].length`; literal `8`/`5`; `grid[r]?.[c]`; `if (grid[r] && grid[r][c] !== undefined)`; `if (grid[r]) {...}`; row and col renamed `row`/`col`; early-return form in 6.9.11; `bricks.length` form; `&& bricks[r][c]` truthy.
- Starters stay 0.
- Cost: none measured. A guard with only the upper test before the read (`if (r < ROWS) {...}`) still passes 6.9.10, which is fine there because `y` is never negative. Honest forms it newly refuses: none of the 24 click/hit shapes tested.

### 5. 6.9.10 r6, 6.9.11 r6: the count never has to go up

`for` `for` `if (grid[r][c]) { }` and nothing else is 6/6 (`lit: 0 of 64` forever, which is the starter's own symptom, so the student does see it). Same in 6.9.11 with `if (bricks[r][c] === 1) { }`.
Tighten (keys `10:r6`, `11:r6`): add a lookahead for `n += / n++ / n = n + / ++n`. It must name `n`: a bare `\+\+` matches the loop's own `r++`, which I hit on the first attempt.
- Must start failing: empty-if counter, `n = 64` inside the loops (both 5/6).
- Must keep passing: reference; `n += grid[r][c] ? 1 : 0`; `n = n + 1`; `== true`; `.flat().filter(...)`; sum `n += bricks[r][c]`.
- Starters stay 0.
- Not fixed: counting the wrong cell (`if (!grid[r][c]) n += 1`, `=== 0`) still passes; the screen shows `lit: 64` at start, so it self-corrects.

### 6. 6.9.10 r5: the flip can be a self-assignment

`grid[r][c] = grid[r][c];` is 6/6 (r5 alt 1 only wants `grid[..][..] = ...grid[`). The click does nothing. Contrived, low.
Tighten (key `10:r5`): the right side must carry `!`, `?`, `===`/`==`/`!=`, or `1 - `. Must still pass: `!grid[r][c]`, taught `grid[r][c] === 1 ? 0 : 1`, ternary `? false : true`, if/else with `= false` / `= true`. Verified: all unchanged; the self-assign drops to 5/6.

### 7. 6.9.14 r1: cheaper than the challenge, and refuses three honest shapes of it

Passes with no change to the game: `function unused() { score += 10 - 0; }`, `function unused() { bricks[0][0]--; }`, or a string `"score += 10 - r"` (all 1/1). Low: it is an open "make it yours" lab. The comment sentence of step 2 is stripped before any regex sees it, so it is ungraded (reflective, low).
Refused honest answers (all 0/1 today):
- Challenge 1 via an intermediate: `const pts = (BRICK_ROWS - r) * 10; score += pts;`
- Challenge 3 via an alias: `const ch = SHAPE[r][c]; if (ch === '#') ...`
- Challenge 3 via `switch (SHAPE[r][c])`, `'#' === SHAPE[r][c]`, `SHAPE[r].substring(c, c+1) === '#'`, `SHAPE[r].split('')[c]`.
A student who did the challenge correctly sees a red card, and the lab says one is enough. Fix (key `14:r1`) adds two alternatives: `\(\s*BRICK_ROWS\s*-\s*\w+\s*\)\s*\*` and any indexed read of `SHAPE` (`SHAPE[i][` or `SHAPE[i].charAt/substring/slice/split/at(`). Verified: the five refused shapes now pass; `ROW_POINTS[r]`, `(BRICK_ROWS - r) * 10`, `-= 1`, `--`, `bricks[r][c] - 1`, `SHAPE[r][c] === '#'`, `.charAt(c)` and the ternary stay passing; starter 0/1.

## Design note: P is at (row 1, column 1) in every map, so findStart is invisible

6.9.4, 6.9.6 and all three levels of 6.9.8 put `P` at row 1, column 1, i.e. pixel (60, 60). Consequences, all measured as 5/5:
- 6.9.6: `findStart` returning the constant `{ x: 40 + 20, y: 40 + 20 }` inside two empty `for (;false;) {}` loops and `if ('P' === 'P') {}` scores 5/5 and puts the player on the right spot.
- 6.9.6: `x: r * TILE + TILE / 2, y: c * TILE + TILE / 2` (x and y swapped) is 5/5 and indistinguishable on screen, because row = column.
- 6.9.8: `findStart(map); player.x = 60; player.y = 60;` is 5/5 and correct for all three levels, so the "reuse findStart on the next map" idea of step 1 cannot fail in play.
Suggested content fix (no regex): move `P` in level 2 or 3 of 6.9.8 to a cell where row differs from column (and keep both maps solvable). That makes the hardcode and the x/y swap visible in play. Not applied.

## Also tested, not flagged

- 6.9.6 r4 / 6.9.8 r3: `findStart(map); player.x = 0;` (result discarded) is green; in 6.9.6 the player stays in the corner, the starter's own symptom. Low.
- 6.9.6 r5 accepts `floor(y/TILE)` into the column and `floor(x/TILE)` into the row (swapped) and `map[c][r]`, the very slip step 3's second hint names. Invisible only because of the symmetric P; the lab asks the student to walk to the first coin (row 1, column 4) and read the corner, so it shows. `round` is correctly refused.
- 6.9.8 r1: `level.delete()` placed AFTER the `new Tiles(...)` call is 5/5; stub run: the screen is empty (`coins 0, walls 0`). An honest ordering slip, and step 1 and quiz q7 both say "first". The fix is a lookahead that `level.delete` precedes `new Tiles`; I did not build it (the call is `if (level) level.delete()` at the top in every taught form, so it is cheap to add if wanted).
- 6.9.7 r1/r2: `player.overlaps(coins); if (coins.length > 0) { coins[0].delete(); score += 1; }` is 4/4 and deletes a coin per frame whether touched or not. `score += 1` outside the callback, or `+= 1; -= 1` also pass. Needs a deliberate ungated body.
- Wrong size grids pass (a 3 by 3 `makeGrid`, a 1 by 1 `makeBricks`): ROWS/COLS are never required. The student sees the board.
- 6.9.11 r5 `return true` is not tied to a hit (`return true` after the `if` is green); nothing in `draw()` reads the result.
- Honest shapes the graders refuse (all tested, none is taught in 6.9.2 to 6.9.11, so per policy not defects): 6.9.4 `HALF` named constant or `(TILE / 2)` in parentheses (r5), `'s'`/`'n'` collider shorthand (r1/r2, r3); 6.9.6 `const row = map[r]; return row[c]` (r5), `HALF` in findStart (r3), `int()` and `| 0` (r5); 6.9.7 `won = coins.length === 0 && player.overlaps(goals)` (r4), guard-return (r3), `score += POINTS` (r2); 6.9.10 for-of and `const lit = grid[r][c]; if (lit)` counting (r6), `const row = grid[r]; row[c] = !row[c]` (r5), `if (grid[r] === undefined) return;` (r4, `!==` only), `forEach` drawing (r2, `forEach` is not the word `for`), `g[r] = []` / `row[c] = false` / `Array.from` in makeGrid (r1); 6.9.11 `const dy = y - TOP; floor(dy / BH)` (r2), `const b = bricks[r][c]; if (b === 1)` and for-of in bricksLeft (r6), `score += BRICK_POINTS` (r5), `b.push(new Array(BRICK_COLS).fill(1))` (r1; 6.9.10 r1 accepts `.fill(false)`, 6.9.11 r1 does not accept `.fill(1)`, an inconsistency between the two twin labs).
- Honest shapes that pass, as committed (count of passing / written; the rest are the refusals above, most of them untaught shapes): 6.9.4 5/9, 6.9.6 5/10, 6.9.7 8/11, 6.9.8 12/12, 6.9.10 17/29, 6.9.11 7/13, 6.9.14 9/15.
- Backtracking: the patched patterns add a tempered scan (`(?:(?!X)[\s\S])*?`); they were run on the whole case set at a few milliseconds each. I did not run the 5000 / 10000 character stress from round 5.

## Quiz 6.9.13

Seven questions, answers at index 2, 1, 1, 3, 0, 2, 3 (A once, B twice, C twice, D twice). No order is hidden, `quiz.shuffle` is not set, pass is 70% (5 of 7; a blind guess gets there about 1.3% of the time).

- Longest-option tell: not found. The correct option is the longest in 1 of 7 (q5, where all four are 5 characters). Lengths of correct vs longest distractor: q1 29 vs 31, q2 45 vs 47, q4 32 vs 39, q6 68 vs 72, q7 62 vs 73. It is the LONGEST WRONG that is the longest in q6 and q7 (the over-explained distractor). No shortest tell either.
- Position tell: not found (no run of more than two; the correct is never the same slot three times).
- Mild content tells (no length involved):
  - q3 `[120, 140, 160, 3]`: the correct 140 is the middle of three close numbers and the only one that is not a multiple of 40. A test-wise guess lands on it.
  - q1 options C and D are the mirror pair (row 2 column 5 / column 2 row 5); the correct is one of the pair, so a student who spots the twin has 50%.
  - q6: the correct is the only option in code formatting (`grid[8]`, `undefined`); the three distractors are soft magic ("quietly", "skips", "carries on").
  - q4: the only option with an integer column AND `floor` (the module's repeated keyword); q2's correct echoes the reading's slogan ("the grid is the truth, the screen is a picture").
  - q5: `Row 5` is out of range for a 5-row wall (rows 0 to 4), so it is eliminated by anyone who knows `BRICK_ROWS`; the arithmetic then decides among 2, 1 and 4.
- Answer key reaches the browser: the quiz has no `summative: true`, so `redactQuiz()` returns it unchanged and `answer` and `explanation` ship with the page. Read from the code, not confirmed in a browser. This matches 28 of the repo's 34 quizzes (points 0, "checked instantly"); only 5 carry `summative`. Decision for the author, not a defect of 6.9.

## Not fixable by regex

A never-called function holding the right text (6.9.4 `function unused() { ... }` is 5/5, 6.9.14 `function unused() { score += 10 - 0; }` is 1/1) or a dead variable (`const legend = {...}` beside `new Tiles(..., {})`, which builds no level, is 5/5 on 6.9.4) passes every card. Only the `tests` requirement type (run the code and ask `coins.length`, `levelNum`, the grid after a click) closes that, and the repo already has it. The labs are short enough to carry four to six `tests` cases each (`coins.length` after a walk, `won` after the last level, `grid[0][0]` after `clickCell(10, 10)`), but that is a bigger change than this lens's brief.

## Summary table

| Lab | Cheapest false green | Score | Fix |
| --- | --- | --- | --- |
| 6.9.4 | string with all five statements | 5/5 | none by regex (patterns need quote text) |
| 6.9.6 | hardcoded start + decor loops; swapped x/y; result of `findStart` ignored | 5/5 | `ignoreStrings` on r3-r5; move P in a level |
| 6.9.7 | `A && B;` then `won = true;` | 4/4 | r4 after an `if` |
| 6.9.8 | `levelNum += 1` ungated | 5/5 | r4 needs coins/goal before the increment |
| 6.9.10 | `grid[r][c] !== undefined` read-first; empty `if` count | 6/6 | r4 order, r5, r6 |
| 6.9.11 | bounds test after the read; empty `if` count | 6/6 | r3 order, r6 |
| 6.9.14 | `score += 10 - 0` in a dead function | 1/1 | none (open-ended); r1 widened for honest shapes |
| 6.9.13 | no length or position tell; mild content tells | | key ships to the browser (formative) |
