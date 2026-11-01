# Advanced lens, round 4 (final): module 6.9 Grids and Tile Maps

Run 2026-10-31, after commit b0de5647 (fix round 3). Labs 6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11, 6.9.14 and quiz 6.9.13. Policy: grading is LAX, so only false greens that skip the lesson's point are listed. Declared leftovers from rounds 1 to 3 (dead never-called functions, strings on 6.9.4, `coins[0].delete()`, discarded `findStart`, `tileAt` constant or swapped, hardcoded start, the `||` forms on 6.9.7 and 6.9.8, `delete` after build, count of dark cells, wrong-size grid, `return true` always, `// if` on 6.9.14, computed-but-unused guards, hybrid loops, `ROWS > r`) are not re-reported.

## Method

- Real grader: `lib/grader.ts` rebuilt with esbuild from the current tree (b0de5647), each lab's CURRENT `lesson.json`. No repo file edited.
- Replay: all 159 round-1, 60 round-1b, 60 round-2 and 65 round-3 case files (344 runs). Every starter 0 (4: 0/5, 6: 0/5, 7: 0/4, 8: 0/5, 10: 0/6, 11: 0/6, 14: 0/2), every reference full. Every round-3 close is still closed (10 r4 column-only x5, 10 r3 TOP x4, 11 r2 `+`/`*` TOP x4, 11 r3 `c < 5`, `c < BRICK_ROWS`, `y > TOP` empty, 10 r5 `= true; = false;` and two plain ifs without a return). No cheat that was red went green; no cheat file that was green changed except the intended ones. Honest reds that remain are the same declared refusals as round 1 (`HALF` on 6.9.4 r5, `score += POINTS` on 6.9.7 r2, guard-return on 6.9.7 r3, and so on).
- Behaviour claims were run, not read: stubs of the p5 globals call `clickCell` (6.9.10) and `hitAt` (6.9.11) with 11 and 13 clicks (on a cell, in the strip, off every edge, repeated), and compare lit count / bricks / score to the reference.
- 160 new files / bodies built from each lab's CURRENT `solution.js` with one function swapped: 39 guard shapes (10), 8 (11), 25 flip / offset / loop shapes, 12 regex-literal keyword shapes, 4 comment-smuggle shapes. Every proposed fix below was run against: the lab's `solution.js`, its untouched `script.js`, all 116 (10) and 62 (11) earlier case files, 15 to 20 new honest spellings per fix, and a 5000-character adversarial timing (worst 29 ms).
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r4/`. `h.cjs` = case builder + behaviour stubs, `g1`, `g2`, `g4`, `g5`, `g6`, `g7`, `g8` = the case runs, `replay.cjs` = the 344-run replay, `prop4.cjs`, `prop4b.cjs`, `prop4c.cjs` = pattern builders, `chk4*.cjs` = the must-still-pass checks, `proposed-patterns-r4.json` = the four finished JSON strings, `patch/cur.ts` + `patch/js-source-clean.diff` = the proposed `lib/js-source-clean.ts`, `corp.cjs` = the 1494-block corpus differential.

## GAMEABLE, cheapest first

### 1. `lib/js-source-clean.ts`: a quote inside a regex literal carries a whole `//` comment through as code (BIGGEST GAP)

`stripJsComments` has no regex-literal handling (its own header says so). `/'/` is read as the start of a string; the string "closes" at the next `'` on the line, which can be the last character of a trailing comment. The comment is then kept verbatim, and `blankStringContents` (which does know `/'/` is a regex and blanks it) sees the comment text as plain code. Every grader in the repo reads through `stripJsComments`, so this is comment smuggling that beats BOTH the comment strip and `ignoreStrings`.

```
// 6.9.7 collect() and checkGoal(), each one line of regex plus a comment. Parses, runs, does nothing.
function collect() {
  const q = /'/; // player.overlaps(coins, (p, coin) => { coin.delete(); score += 1; }) '
}
function checkGoal() {
  const q = /'/; // if (coins.length === 0 && player.overlaps(goals)) { won = true; } '
}
```
Scores 4/4 (run). The same with `"` (`/"/ ... "`) scores 4/4. A backtick version (`` /`/ `` then comment lines, closed by the next template) carries several lines. Cost to find it: someone has to know that a quote in a regex confuses the scan. It is not an accident; it is a deliberate bypass, and it turns any lab to full marks with zero code. Medium-low for a classroom, but it is the one hole that is not specific to a lab's pattern.

Related holes in the same function, same fix family (both run):
- A regex literal after `new`, `instanceof`, `await` is not blanked: `async function collect() { await /player.overlaps(coins) coin.delete() score += 1/; }`, `new /.../;`, `x instanceof /.../;` all parse and score 4/4 on 6.9.7 (the round-2 keyword list has `else do case throw void delete in` but not these). `typeof`, `void`, `delete`, `!`, `+`, `-` are closed (0/4).
- The round-3 `++`/`--` rule reads `a+++/re/` (that is `a++ + /re/`, valid) as division because the character before the last `+` is also `+`: `k+++/player.overlaps(coins) coin.delete() score += 1/;` scores 4/4. A run of an odd number of signs is a binary or unary sign (regex follows), an even run is `++`/`--` (division follows).

Tighten (`lib/js-source-clean.ts`, tested diff in `patch/js-source-clean.diff`): pull the "does this `/` start a regex" test out of `blankStringContents` into `slashStartsRegex(out)`, call it from `stripJsComments` after the `//` and `/*` checks (a regex literal is copied whole to its closing `/` on the same line, so a quote inside it never opens a phantom string), add `new|instanceof|await` to the keyword list, and replace the `++` test with `signRun(before) % 2 === 1`.
- Now fails: the three comment-smuggle files (0/4), `await`/`new`/`instanceof` (0/4), `k+++/.../` and `k---/.../` (0/4).
- Still passes / unchanged (run): `i++ / 2; coins.delete(); j / 3`, `a[i]++ / 2`, `a - -b / 2`, `n-- / 2`, `a + /re/.test(s)`, `x = y - /re/.test(s)`, `x = (a + b) / 2; // it's half`, `if (a) b = c / d; // don't`, `x = new Foo(1) / 2`, `newCount / 2`, `obj.new / 2`, `await_ / 2`, `a instanceof B ? c / 2 : d / 3`. Differential old vs new `stripJsComments` + `blankStringContents` over every `.js`, fenced js block and scratch case under `lessons/`, `pa-pseudocode/` and the 344 scratch files: 1494 blocks, **0 changes**. The 344-run grader replay with the patched file is byte-identical to the unpatched one.
- Not run: the repo's own tests that import the file (`test-2-7-3-comments` and the 63 lessons that depend on it). Run those before shipping.

### 2. 6.9.10 r4 and 6.9.11 r3: the bounds can be joined by `||`, and the strip click still crashes. Medium

Round 3 tied the lower and upper tests to the row variable, but not to the operator between them. A guard written `||` instead of `&&` (or a `&&` pair followed by `|| c ...`) is true for every click, and the strip click (r = -1) still throws:

```
// 6.9.10 r4, each 6/6, each THROWs on the strip click (stub: 1,T,T,2,...)
if (r >= 0 || r < ROWS)                              { grid[r][c] = !grid[r][c]; }
if ((r >= 0 || r < ROWS) && (c >= 0 || c < COLS))    { ... }
if (r >= 0 && r < ROWS || c >= 0 && c < COLS)        { ... }      // precedence slip
// 6.9.11 r3, each 6/6, each THROWs on a click above the wall
if ((r >= 0 || r < BRICK_ROWS) && bricks[r][c] === 1)                              { ... }
if (r >= 0 && r < BRICK_ROWS && c >= 0 && c < BRICK_COLS || bricks[r][c] === 1)    { ... }
```
`&&` versus `||` is the slip quiz q6 is about, and the strip click is the one out-of-grid click the lab has. The 6.9.7 and 6.9.8 `||` forms were declined as "needs a runtime test"; here the guard is the point of the card, and a pattern is enough because the two spellings are different shapes: a positive lower bound (`>= 0`, `> -1`) must not share a condition with `||`, a negative one (`< 0`) must not share one with `&&`.

Tighten (`10:r4`, `11:r3`; builder `prop4.cjs`, finished strings in `proposed-patterns-r4.json`): insert two negative lookaheads right after the `^(?=...<rv>...)` capture, before the bounds alternatives (the `?.[`, `=== undefined`, `!grid[r]`, `grid[r] &&` alternatives are untouched). The first refuses a `||` in the same condition (no `;`, `{`, `}` or `return` between) as a positive lower test on `\k<rv>`, before the first double index. The second refuses `\k<rv> < 0` sharing a condition with `&&`.
- Now fails: all six forms above, plus `if (c < 0 || c >= COLS || r >= 0 || r < ROWS) {} else {...}`, `r >= 0 && r < ROWS && c >= 0 && c < COLS || r === 0`, and `if (r < 0 && r >= ROWS) return;`.
- Still passes (run, 14 shapes for 10, 3 for 11): the reference; `if (r < 0 || r >= ROWS || c < 0 || c >= COLS) { return; }` and the column-first spelling; `r >= 0 && r < ROWS && c >= 0 && c < COLS` in both orders; `!(r >= 0 && r < ROWS)`; nested ifs; `if (r < 0) return; if (r >= ROWS) return;`; `r > -1`; `y < TOP || x < 0` return then `r >= 0 && r < ROWS`; `||` return with no semicolon on the line above; `else if (c < 0 || c >= COLS)` after the guard; 11: `if (r < 0 || r >= BRICK_ROWS || ...) return false;` then `bricks[r][c] === 1`. All 116 + 62 earlier case files: 0 changed. Reference full, starters 0. Timing: worst 29 ms on a 4900-character string of repeated `r >= 0`.

### 3. 6.9.10 r5: the round-3 close of "two plain ifs" is undone by a taught early-return guard. Medium-low

The second alternative of r5 now needs `] = true`, `] = false` and `\b(?:else|return)\b` anywhere in `clickCell`. The reference's own style of guard (`if (r < 0 || ... ) return;`) supplies the `return`:

```
// 6.9.10 r5, 6/6; two plain ifs, the cell never ends lit (stub: 0,0,0,0,...) or never unlights (1,1,1,2,2,3,...)
if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
if (!grid[r][c]) { grid[r][c] = true; }
if (grid[r][c])  { grid[r][c] = false; }
```
The slip (`else` forgotten) is exactly what round 3 meant to catch, and it shows at the first click, but the card is green.

Tighten (`10:r5`, builder `prop4c.cjs`): replace `(?=[\s\S]*\b(?:else|return)\b)` by `(?=[\s\S]*(?:\]\s*=\s*(?:true|false)\b[^{}]*\}?\s*\belse\b|\]\s*=\s*(?:true|false)\b\s*;?\s*return\b))`: an `else` that closes the block holding a `true`/`false` assignment, or a `return` right after one.
- Now fails: the three two-ifs files (both orders, plus an `else` that belongs to the guard), `= true; = false;` with a return guard.
- Still passes (run): if/else either order with braces, braceless `if (x) a = false; else a = true;`, `else` on its own line, `else if (=== false)` chain, an extra statement in the block, early-return flip `{ grid[r][c] = false; return; } grid[r][c] = true;` (also without semicolons and the `true` first), `= !grid[r][c]`, ternary. Reference full, starter 0, all 116 earlier 10-files: 0 changed.

### 4. Lower, listed so the author can decline them

- **6.9.10 r3 accepts a shape that is wrong for this lab, and round 3 listed it as honest.** `const r = floor(y / CELL) - TOP / CELL;` is 6/6, but TOP / CELL is 0.8 here (it is the integer 3 only in 6.9.11), so `r` is fractional, `grid[r]` is undefined and every click throws (stub: `T,0,0,T,T,T,...`). The round-3 report's "24 of 24 honest" included `floor(y / BH) - TOP / BH`, which is right for 6.9.11; the 6.9.10 twin was checked as `sub_after_floor` and passed. Fix (`10:r3`, `prop4b.cjs`): in the first alternative replace the `[^;]*` between `floor\(` and `-\s*TOP` by `(?:[^;)]|\([^;()]*\))*` (no unbalanced `)` before the minus). Run: `floor(y / CELL) - TOP / CELL` and `- 40 / 50` now red; 12 honest offset spellings (const `ty`, `y = y - TOP`, `y -= TOP`, `y - 40) / 50`, no-space, `Math.trunc`, `y - (TOP)`, `((y) - TOP)`, `floor(abs(y) - TOP / CELL)`, nested floor, `y / CELL - TOP / CELL`) stay green, reference full, starter 0, 116 earlier files unchanged. Not proposing to touch 6.9.11 r2.
- **Flip reads the wrong cell.** `grid[r][c] = !grid[c][r]`, `!grid[r][0]`, `!c`, `!0`, `r !== c`, `r > 0 ? true : false` are all 6/6 on r5 (any `!` or `?` after the `=`), and none unlights a cell. Transposed indices is the plausible one. A fix needs the right-hand side to read the same two index expressions or an alias of them (`const was = grid[r][c]` is an accepted honest shape), which is bigger than the slip. Not proposed; the second click on a lit cell shows it.
- **TOP applied to the column.** `floor((x - TOP) / CELL)` for the column and `floor(y / CELL)` for the row is 6/6 on 10 r3 (any `floor` with `- TOP`); the lit cell is the wrong one. Same family as round 3's declined "(x - TOP) on the column". A second declared dummy: an unused second `floor((y - TOP) / CELL)`.
- **Count of one cell.** `countLit` with two empty `while` loops and `if (grid[0][0]) n++;` is 6/6 (declared "hybrid / wrong cell" family; the on-screen counter reads 0).

## What I tried and could not break (round-3 patterns and the strip change)

- **Column-only guard tied to the row variable (10 r4, 11 r3):** `c >= 0 && c < 8`, `c < ROWS`, `c < grid.length`, `c < 5`, `c < BRICK_ROWS`, `grid[c] !== undefined` with the row unguarded all fail or, for the last, only pass because the grid is 8 wide and the canvas is 400 px (the column cannot leave the grid; the only bad click is the strip). I looked for a way to make the first `grid[x]` read name a decoy variable: `const col = grid[c];` before the real guard turns `rv` into `c`. That needs a dummy read, so it is the declared dummy family. `grid[c] !== undefined` as the whole guard is 6/6 and throws on the strip click (stub `1,T,T,...`); it needs the wrong variable on purpose, and tying the `=== undefined` / `!grid[..]` / `grid[..] &&` alternatives to the captured row variable (`grid\s*\[\s*\k<rv>\s*\]`) would close it. Not proposed (deliberate, not a slip).
- **TOP offset sign (10 r3, 11 r2):** `floor((TOP - y) / CELL)` and `floor((y - TOP) * CELL)` are red; `y + TOP`, `y * TOP`, unused `const t = y - TOP`, `floor(y / CELL) - TOP` stay red as designed. Only the shapes in 4 get through.
- **Flip card else/return:** if/else either order, braceless, early-return flip, `else if` chain, ternary and `!` all still green (see 3 for the one hole).
- **`while` in draw / count:** nested `while` drawGrid is green and draws the same; two dead `while` loops plus one hard cell is the declared dead-code family.
- **Division-then-regex (`closesStatementHead`, keyword list):** 30 shapes in the round-3 differential plus `if (a) b = c / d`, `else x = a / b`, `typeof x / 2`, `f(4) / 3`, `win / 2`, `obj.in / 3`, a ternary with `/` after `?`, `a instanceof B ? c / 2 : d / 3`: none hides the code after the slash. A regex statement after `}` is blanked (class includes `}`), so that smuggle is closed.
- **`++`/`--` handling:** `i++ / 2`, `a[i]++ / 2`, `n-- / 2`, `a - -b / 2`, `k--/ 2` stay code; the only miss is the odd run in 1.

## Quiz 6.9.13

Unchanged since round 3: answers 2, 1, 1, 3, 0, 2, 3; q6 options are lengths 84, 59, 70, 53 (correct is third, neither longest nor shortest). Content tells as listed before (q3 `140`, q1 C/D mirror pair, q4, q5). Answer key still ships to the browser (no `summative`). Not opened in a browser this round.

## Verdict

Not clean. In order: (1) the regex-quote comment smuggle in `stripJsComments` scores a whole lab 4/4 with no code and works against every grader, with a tested differential-clean fix (plus three one-token neighbours in the same function); (2) `||` joins the strip-click guard on 6.9.10 and 6.9.11 and the sketch still crashes on the one out-of-grid click the lab has; (3) the round-3 two-ifs close on 6.9.10 r5 is bypassed by an early-return guard. Everything else the round-3 fixes targeted is closed, no honest shape went red, no starter scores above 0, and every reference scores full under every proposed pattern (all four JSON strings and the strip diff are in the scratch folder named above). Items 2 and 3 and the first two items under "Lower" are plausible student slips; item 1 is a deliberate exploit and could reasonably be left to the "no cheating the grader" policy if the author prefers.
