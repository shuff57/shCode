# Advanced lens, round 2: module 6.9 Grids and Tile Maps

Run 2026-10-31, after commit 12fe4260 (fix round 1). Labs 6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11, 6.9.14 and quiz 6.9.13. Policy: grading is LAX, so only false greens that skip the lesson's point are listed. Dead never-called functions, a string on 6.9.4, `coins[0].delete()`, a discarded `findStart` result and the `||` in 6.9.8 are the declared leftovers and are not re-reported as findings.

## Method

- Real grader: `lib/grader.ts` rebuilt with esbuild from the current tree, each lab's CURRENT `lesson.json` requirements. No repo file edited.
- All 159 round-1 cases replayed, then 60 new files (cheats AND honest shapes) built from each lab's CURRENT `solution.js` with one function swapped. Every proposed pattern below was run against: the lab's own `solution.js`, its untouched `script.js`, every honest case in both sets, and a 5000-character adversarial stress (worst case 11 ms, under 1 ms on the stress strings).
- Behaviour claims for 6.9.10 were run, not read: a stub of the p5 globals calls `clickCell` with clicks at (75,70), (75,10), (200,5), (399,300).
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r2/` (`cur.txt` = round-1 replay, `new/` = new cases, `prop.cjs` and `prop2.cjs` = proposed patterns, `run10.cjs` = behaviour check).
- Starters: 4 0/5, 6 0/5, 7 0/4, 8 0/5, 10 0/6, 11 0/6, 14 0/2. References: full on all seven.

## Round-1 replay: what the fix closed

Every round-1 cheat that the fix round targeted now fails the intended card, and no honest round-1 shape went red:

| Round-1 cheat | Now |
| --- | --- |
| all functions as one string (6, 7, 8, 10, 11) | 6: 2/5, 7, 8, 10, 11: 0 cards |
| 7 `A && B;` then `won = true;` | 3/4 (r4) |
| 7 `\|\|` instead of `&&` | 3/4 (r3) |
| 8 ungated `levelNum += 1` | 4/5 (r4) |
| 10 `!== undefined` read first, bounds after read, flip then unused const | 5/6 (r4) |
| 10 self-assignment flip | 5/6 (r5) |
| 10 and 11 empty-if count, `n = 64` | 5/6 (r6) |
| 11 bounds after read, `!== undefined` read first | 5/6 (r3) |
| 14 string / score rule in string | 0/2 and 1/2 |
| honest shapes the fix meant to admit (`(TILE / 2)`, `HALF`, for...of count, alias count, `.fill(1)`, two-step TOP offset, challenge aliases, `switch (SHAPE[r][c])`) | all green now |

Cheats that still score full and were NOT claimed closed (declared leftovers): 6.9.4 dead function / unused legend / string; 6.9.6 hardcoded start, swapped x/y, discarded `findStart`, `tileAt` constant or swapped; 6.9.7 `collect` ungated delete, score outside callback; 6.9.8 `||`, delete after build, hardcoded player; 6.9.10 count of dark cells, wrong size grid; 6.9.11 count of gaps, wrong size wall, `return true` always.

## GAMEABLE, cheapest first

### 1. 6.9.10 r4: three guards that crash on the click the lab is about score 6/6 (BIGGEST GAP)

Fix round 1 moved the words strip ABOVE the grid (`TOP = 40`, canvas 400 x 440). A click in the strip now gives `r = -1`, and that is the only out-of-grid click there is (x is always 0 to 399, nothing sits below the grid). Step 3 says "a click in the strip does nothing" and quiz q6 asks what `grid[-1]` does. r4 still accepts all of these, run through the stub:

```
// row upper bound only                      // column guard only
if (r < ROWS) { grid[r][c] = !grid[r][c]; }  if (c >= 0 && c < COLS) { grid[r][c] = !grid[r][c]; }

// read first, bounds after, joined by &&
if (grid[r][c] !== undefined && r >= 0) { grid[r][c] = !grid[r][c]; }

// upper row bound plus column bounds
if (r < ROWS && c >= 0 && c < COLS) { grid[r][c] = !grid[r][c]; }
```
All six cards green. Click at (75,10): `THROW(Cannot read properties of undefined)`. The reference and the four-part guard print `ok` for the same click.

Cause: alt 1 of r4 is "any one comparison with ROWS, COLS, grid.length or 7/8 before the first read", so `r < ROWS` or even `c < COLS` satisfies it with no lower bound. The last alt (`!== undefined &&`) has no ordering at all, so it re-admits the very shape round 1 asked to close when it is followed by `&&`.

Tighten (key `10:r4`, pattern in `prop.cjs`, `p10`): before the first `grid[..][..]` read, the SAME variable must have a lower test (`v >= 0`, `v < 0`, `v > -1`, `0 <= v`) and an upper test against `ROWS` / `grid.length` / `8` (either order), or a pixel test `y < TOP` / `y >= TOP` plus any row upper test, or the existing `?.[`, `grid[r] === undefined` before the read, `!grid[r]`, `grid[r] && grid[r][`. The unordered `!== undefined &&` alternative is dropped. Uses named groups (`(?<a>..)` and `\k<a>`), because numbered backreferences silently match empty when the alternation joins them.

- Now fails: row-upper-only, column-only, row-upper plus column, read-first-`!== undefined &&` (three variants).
- Still passes (run, unchanged): reference; `r >= 0 && r < ROWS && c >= 0 && c < COLS`; `r < 0 || r >= ROWS || c < 0 || c >= COLS` then return; `0 <= r && r < grid.length`; nested ifs; `grid[r] && grid[r][c] !== undefined`; `if (y < TOP) return;` then `r < ROWS && c < COLS`; early `y < TOP` before the floor; `?.[`; `grid[r] === undefined` return; `!grid[r]`; literal 8; renamed row/col; if/else flip.
- Starter 0/6.

### 2. 6.9.10 r3, r2: TOP is the new point of the lab and nothing measures it

`floor(y / CELL)` with no TOP, or `floor((y + TOP) / CELL)`, scores 6/6. Run: a click at (75,10) (in the strip) flips a cell (`lit=4` against 2 for the reference), and the click lands 40 pixels off the drawn cell. `drawGrid` with `rect(c * CELL, r * CELL, ...)` also scores 6/6. 6.9.11 r2 does require the offset; 6.9.10 r3 was left asking only for two floors over CELL. Visible in play, so Medium.

Tighten r3 (key `10:r3`, `prop2.cjs`): add a lookahead for `-\s*\(?\s*(TOP|40)\b` or `-=\s*(TOP|40)\b`. Passes: the reference, `y - TOP`, `y -= TOP`, `const local = y - TOP`, the eight new honest forms. (The older honest 10-cases in `cases/` were written before TOP existed and read red on this, correctly; they are stale, not evidence.) Leave r2 alone: drawing without TOP is consistent with itself and only overlaps the strip.

### 3. 6.9.11 r4/r5: a click on a gap scores. Missing measurement

```
if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS) { bricks[r][c] = 0; score += 10; return true; }
```
6/6. Nothing requires the cell to be a brick, so clicking the same spot again adds 10 each time. The step says "IF ... the cell is `1`" and "click the empty space where it was: nothing happens". Also 6/6 with the condition on the wrong cell (`bricks[0][0] === 1`) or an unused `const inside = ...` and an unconditional body.

Tighten r4 (key `11:r4`, `p11r4`): the removal must be present AND the cell must be read in an `if (...)` condition (`if ([^{}]*bricks[..][..]`) or through an alias (`const cell = bricks[r][c]; if (cell ...`).
- Now fails: no cell gate, dead-guard-unconditional, `const inside` plus unconditional body.
- Still passes (run): reference; nested `if (bricks[r][c] === 1)`; early return `if (bricks[r][c] !== 1) return false;` and `=== 0`; truthy `&& bricks[r][c]`; `> 0` with `-= 1`.
- Starter 0/6. `bricks[0][0] === 1` (wrong cell) still passes; that needs a deliberate dummy.

### 4. 6.9.11 r3: a lower bound on the column alone still counts

```
if (r < BRICK_ROWS && c >= 0 && c < BRICK_COLS && bricks[r][c] === 1) { ... }
```
6/6; a click above the wall (`y < 60`, `r = -1`) throws. This was declined in round 1 as "column-only zero test". With the strip and the wall now both teaching "click above the wall", this is the exact slip the 6.9.5 experiment asks the student to try (delete `r >= 0 &&`), and `c >= 0` can never fail (x >= 0). Same cause as finding 1.

Tighten r3 (key `11:r3`, `p11`): the same variable-matching bounds as finding 1, with `BRICK_ROWS` / `bricks.length` / `5`. Now fails: column-zero-row-upper-only. Still passes: the reference, row-only bounds (`r >= 0 && r < BRICK_ROWS && bricks[r][c] === 1`), early-return forms, `bricks.length`, `bricks[r] === undefined` return, `?.[`. Starter 0/6.

### 5. 6.9.7 r4: `won = true` need not be under the test

```
if (coins.length === 0) { }
if (player.overlaps(goals)) { }
won = true;
```
4/4, and the brace-slip version (`if (A && B) { score += 0; }` then `won = true;` below it) is also 4/4. Wins on frame 1. Low, needs an empty or misplaced body.

Tighten r4 (key `7:r4`, `prop2.cjs`): `\bif\s*\([^{}]*\)\s*(?:\{[^}]*)?\bwon\s*=\s*true\b|\bwon\s*=\s*[^;]*&&`. Now fails the two shapes above. Still passes: reference, nested ifs, flag variables, brace-less `if (...) won = true`, `won = A && B`, `!coins.length && goals.overlaps(player)`. Starter 0/4.

### 6. The `||` slip is closed only in its bare form (6.9.7 r3, 6.9.8 r4)

Round-1 fix made plain `coins.length === 0 || player.overlaps(goals)` red on 6.9.7. These still score 4/4 on 6.9.7 and 5/5 on 6.9.8:
```
if ((coins.length === 0 || player.overlaps(goals)) && !won) { won = true; }

if (coins.length === 0) { won = true; }
if (player.overlaps(goals)) { won = true; }
```
Also on 6.9.8: `if (coins.length === 0 && player.overlaps(goals)) { score += 0; }` followed by an unconditional `levelNum++` (the test is textually before the increment, so r4 is satisfied), and `const msg = coins.length + ' ' + player.overlaps(goals); levelNum++;`. These are one `&& !won` or one dummy statement away from the declared leftover, so I am NOT proposing a pattern; a `tests` requirement (walk, count `coins.length`, `won`) is the only real close and the author already declined it.

### 7. ignoreStrings is bypassed by a regex literal after `)` or `else` (all labs with ignoreStrings)

```
function collect()   { if (true) /player.overlaps(coins) coin.delete() score += 1/; }
function collect()   { if (false) {} else /player.overlaps(coins) coin.delete() score += 1/; }
function loadLevel(n) { if (n >= 0) /level.delete() new Tiles(levels[n]) findStart(map) player.x/; }
```
`node --check` accepts all three (a regex literal is a valid statement). 6.9.7 scores 4/4 with both of its functions done this way, 6.9.8 loadLevel scores r1, r2, r3. Cause: `blankStringContents()` in `lib/js-source-clean.ts` calls a `/` after `)` or after the word `else` division, so the text between the slashes stays as code. `return /.../` is handled (2/4). A gamer-only trick, Low: a student has to know regex literals exist.

Tighten (`lib/js-source-clean.ts`, not a lesson file): treat `/` as a regex start after `else`, `do`, `case`, `in`, `of`, `throw`, `void`, `delete`, `new` (the same list as `return|typeof`), and after a `)` whose matching `(` is preceded by `if`, `while`, `for` or `with`. Must still pass: `(a + b) / 2`, `f(x) / 3`, `arr[i] / n`. Not run (shared library, 63 lessons depend on it); needs the library's own tests.

### 8. 6.9.6 r3: the cellToPixel call is credited without its body

`findStart` returning `{ x: cellToPixel(c), y: cellToPixel(r) }` with `function cellToPixel(i) { return i * TILE; }` (no half tile) is 5/5. r3 accepts `\b(?:cellToPixel|tileToPixel|toPixel)\s*\(` as the whole computation, and the helper body lives outside the function r3 scopes to. The player stands on the tile corner, the starter's own symptom, so the student sees it. Low. Because r3 is an `inFunction` card it cannot see the helper; closing it means a second whole-file `regex` card (helper body contains `TILE / 2`, `20` or `0.5 *`), which adds a card for one rare shape. Not recommended.

### 9. 6.9.14: the sentence card accepts `// if`

`r2` is `//[^\n]*\b(?:would|without|otherwise|instead|if)\b` and 6.9.14 is 2/2 with `score += 5;` plus `// if` (and `function unused() { score += 5; } // if`). The brief called the lab open-ended and graded as lax; noted only because r2 now measures that a sentence-shaped comment exists, not what it says. No pattern proposed. A teacher or the AI check reads the sentence.

## Honest answers refused (strictness, listed once, no action)

6.9.7 r3 refuses the guard-return form (`if (coins.length > 0) return; if (player.overlaps(goals)) won = true;`, 3/4) because it needs `=== 0`, `<= 0`, `< 1` or `!`. The course teaches `&&` there, so this is acceptable under the policy. 6.9.8 r1 and 6.9.14 are otherwise clean on every honest shape tried.

## Quiz 6.9.13

Answers 2, 1, 1, 3, 0, 2, 3 (A once, B twice, C twice, D twice). `quiz.shuffle` not set, `summative` not set, pass 70 percent (5 of 7). Lengths (correct vs the others):

- q1 29 vs 18, 31, 29. q2 45 vs 45, 47, 18. q3 3 vs 3, 3, 1. q4 32 vs 32, 28, 39. q5 5 vs 5, 5, 5. q7 62 vs 49, 45, 73.
- q6 is now the LONGEST option (69 vs 67, 59, 53). The margin is two characters and the other three are close behind, so it is not a usable tell, but the round-1 note ("longest-option tell: none") is no longer exactly true. Fixed tell, new one: the correct q6 option is still the only one that says `undefined`, the word the stem and q6's own explanation lead with. A test-wise reader picks it.
- Position tell: none. No three in a row.
- Content tells left as round 1 found them: q3 `140` is the only non-multiple of 40 among 120, 140, 160; q1 C and D are a mirror pair and the answer is one of them; q4 the correct option is the only one that is an integer column and names `floor`; q5 `Row 5` is out of range for a 5-row wall.
- Answer key ships to the browser (no `summative`), same as the other formative quizzes; unchanged decision for the author.
- `content.md` says "Each question names the lesson to reread if you miss it". The questions carry no per-question reread field in `lesson.json`; if the quiz view shows `source`, the sentence is fine, otherwise it is a promise with nothing behind it. I did not open the quiz in a browser.

## Verdict

Not clean. One gap matters (finding 1): the strip-click guard that 6.9.10 teaches and the quiz asks about is not actually measured, and three plausible slips score 6/6 and crash on the very click the lab tells the student to try. Findings 2, 3 and 4 are the same kind, each with a tested fix that leaves every honest shape and every reference alone. Findings 5 to 9 are Low.
