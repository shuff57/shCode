# Advanced lens, round 3: module 6.9 Grids and Tile Maps

Run 2026-10-31, after commit fb970ab8 (fix round 2). Labs 6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11, 6.9.14 and quiz 6.9.13. Policy: grading is LAX, so only false greens that skip the lesson's point are listed. Declared leftovers from rounds 1 and 2 (dead never-called functions, a string on 6.9.4, `coins[0].delete()`, a discarded `findStart` result, `tileAt` constant or swapped, hardcoded start, the `||` forms on 6.9.7 and 6.9.8, `delete` after build, count of dark cells, wrong-size grid or wall, `return true` always, `// if` on 6.9.14) are not re-reported.

## Method

- Real grader: `lib/grader.ts` rebuilt with esbuild from the current tree, each lab's CURRENT `lesson.json` requirements. No repo file edited.
- Replay: all 159 round-1 cases and the 60 round-2 cases, then 65 new files (cheats and honest shapes) built from each lab's CURRENT `solution.js` with one function swapped.
- Behaviour claims were run, not read: stubs of the p5 globals call `clickCell` (6.9.10) and `hitAt` (6.9.11) with clicks in the strip, on a cell, off the right edge, and twice on the same cell.
- Every proposed pattern was run against: the lab's `solution.js`, its untouched `script.js`, 83 honest cases for the two guard cards (round 1, round 2, round 3 sets), 47 extra honest spellings written for this round (23 guard, 24 offset), and an adversarial stress (worst 28 ms on 5000-character strings; the first draft of the guard pattern took 1.3 s on one of them and was rewritten, see below).
- Scratch (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/g69/r3a/` (`new3/` = the 65 new cases, `gen3.cjs` makes them, `beh10.cjs` and `beh11.cjs` = behaviour runs, `prop3.cjs` and `prop3top.cjs` = pattern builders, `proposed-patterns.json` = the four finished JSON strings, `chk3*.cjs` = the checks, `jc/` = the strip-function differential).
- Starters: 4 0/5, 6 0/5, 7 0/4, 8 0/5, 10 0/6, 11 0/6, 14 0/2. References: full on all seven.

## Replay: what holds

Every cheat the round-2 fix targeted is still closed, and no honest round-1 or round-2 shape went red:

| Round-2 close | Replay |
| --- | --- |
| 10 r4 row-upper-only, read first then `!== undefined &&`, row upper plus column | still 5/6 (r4) |
| 10 r3 no TOP | still 5/6 (r3) |
| 11 r4 no cell gate, `const inside` plus unconditional body | still 5/6 (r4) |
| 11 r3 column-zero plus row-upper-only | still 5/6 (r3) |
| 7 r4 `won = true` under empty ifs / brace slip | still 3/4 (r4) |
| regex literal after `if (...)`, `else` (7 and 8, three files) | r1, r2 red (7: 2/4; 8: 2/5). Intended. |
| 14: score rule in a string, no sentence, sentence under 3 words | still 1/2 or 0/2 |

Honest shapes all still green: `(TILE / 2)`, `HALF`, for...of counts, row-alias counts, `.fill(1)`, two-step TOP offset (`const localY = y - TOP`, `y = y - TOP`, `y -= TOP`, `floor(y / BH - 3)`), `y - 60` literals, ternary flip, if/else flip, while-built grids, early-return guards, nested ifs, `grid[r] === undefined`, `!grid[r]`, `?.[`, `y >= TOP && r < ROWS`, `if (y < TOP) return;` then `r < ROWS`.

Declared leftovers re-confirmed unchanged: 4 dead_fn / legend_unused / string_only; 6 hardcoded start / swapped / discarded / tileAt; 7 collect ungated / score outside callback; 8 `||`, delete after build, hardcoded player; 11 count of gaps / wrong wall / `return true` always; 14 dead declaration.

## GAMEABLE, cheapest first

### 1. 6.9.10 r4 and 6.9.11 r3: the bounds can be on the COLUMN, and the strip click still crashes (BIGGEST GAP)

Round 2 closed `r < ROWS` alone and `c < COLS` alone by requiring a lower and an upper test on the SAME variable. The variable is still not tied to the one that picks the row, and on an 8 by 8 grid `ROWS`, `8` and `grid.length` are also valid column limits. Run through the stub (click at (75,10), in the strip, r = -1):

```
// 6.9.10, each scores 6/6, each THROWs on the strip click
if (c >= 0 && c < 8)           { grid[r][c] = !grid[r][c]; }
if (c >= 0 && c < ROWS)        { grid[r][c] = !grid[r][c]; }
if (c >= 0 && c < grid.length) { grid[r][c] = !grid[r][c]; }

// 6.9.11, 6/6, THROWs on a click above the wall
if (c >= 0 && c < 5 && bricks[r][c] === 1) { ... }
if (c >= 0 && c < BRICK_ROWS && bricks[r][c] === 1) { ... }
```

A pixel alternative also admits an empty strip test: `if (y < TOP) { }` followed by `if (c < 8) { grid[r][c] = ...; }` is 6/6 and throws. A student who writes the column test and forgets the row has produced exactly the slip quiz q6 asks about, and it is green. Medium: the strip click is the one out-of-grid click the lab has, and step 3 says "a click in the strip does nothing".

Tighten (`10:r4`, `11:r3`; builder `prop3.cjs`, finished strings in `proposed-patterns.json`): capture the variable that indexes the FIRST row access with a lookahead, `^(?=(?:(?!\bgrid\s*\[[^\]]+\]\s*\[)[\s\S])*?\bgrid\s*\[\s*(?<rv>[A-Za-z_$][\w$]*)\s*\])`, then require the lower and upper tests on `\k<rv>` before that read (same five spellings as now: `>= 0`, `< 0`, `> -1`, `0 <= v`, either order; pixel alternative keeps "any variable `< TOP`" but its row upper test must be on `\k<rv>`). The `?.[`, `grid[r] === undefined`, `!grid[r]` and `grid[r] && grid[` alternatives are unchanged. Using one captured name instead of the old `(?<a>..)...(?<e>..)` alternatives also removes the backtracking: the first draft that kept the per-alternative captures took 0.9 to 1.4 s on a 5000-character string of repeated bounds tests; this form is under 30 ms.

- Now fails: the three 6.9.10 column-only forms, strip-empty-if plus column, the 6.9.11 `c < 5`, `c < BRICK_ROWS` forms, and `y < TOP` empty plus `c < 5`. It also turns red the 6.9.11 "gate on the wrong cell" (`bricks[0][0] === 1` as the read) from round 2, as a side effect.
- Still passes (run): both references; `r >= 0 && r < ROWS && c >= 0 && c < COLS` in every spelling above; `grid[0].length` and `grid[r].length` for the column; `r > -1`; `0 <= r`; upper before lower; `||` then return; three-step early returns; nested ifs; renamed row/col; `y >= TOP && r < ROWS && c < COLS`; `if (y < TOP) return;` then `r < ROWS`; `grid[r] !== undefined`; `grid[r] &&`; `grid?.[`; `!grid[r]`; for 11 the same plus row-only bounds. 83 honest cases checked, none changed. Starters 0.
- Not fixed by it, and not claimed: `const row = grid[r]; row[c] = !row[c]; if (r >= 0 && ...) { }` still passes r4 (the alias read is invisible to the "before the read" rule), but r5 requires `grid[..][..] =`, so that file is red overall anyway.
- Strictness left as it was: `ROWS > r && r >= 0` (operands reversed) is refused before and after. Not taught; no action.

### 2. 6.9.10 r3 and 6.9.11 r2: the TOP offset is accepted anywhere, with any sign

```
// 6.9.10 r3: 6/6. The offset is computed and never used, so the click lands 40 px high
const r = floor(y / CELL);   const t = y - TOP;

// 6.9.11 r2: 6/6 (y + TOP, y * TOP, and an unused y - TOP)
const r = floor((y + TOP) / BH);
const r = floor((y * TOP) / BH);
const t = y - TOP;  ...  const r = floor(y / BH);
```
Run: `y + TOP` in 6.9.11 makes the click at (75,10), above the wall, remove a brick (`bricksLeft` 40 to 39 and the score 10), and the click at (75,70) on the first row does nothing. `floor(y / CELL) - TOP` in 6.9.10 is also 6/6 and lights nothing. All visible in a playtest, so Low to Medium. The round-2 report asked for the offset on 6.9.10; the fix only asked that `-TOP` appear somewhere in `clickCell`, and 6.9.11's first alternative takes `TOP` anywhere inside `floor(...)`, with no sign.

Tighten (`10:r3`, `11:r2`; builder `prop3top.cjs`): the subtraction must be inside the `floor(` that is divided by the cell size (`floor\s*\([^;]*-\s*\(?\s*(?:TOP|40)\b[^;]*\/\s*(?:CELL|50)\b`), or `/ CELL - TOP / CELL`, or a variable assigned `v -= TOP` / `= w - TOP` that is then used inside a later `floor(... v ... / CELL)` (the variable name is captured, `\k<t>`). 6.9.11 keeps its `- 3` and `- TOP / BH` alternatives.
- Now fails: unused `const t = y - TOP`, `floor(y / CELL) - TOP`, the `- TOP` hidden in an unrelated comparison (10); `y + TOP`, `y * TOP`, unused const (11).
- Still passes (run on the reference body with the one line swapped): `floor((y - TOP) / CELL)`, `Math.floor((y-TOP)/CELL)` with no spaces, `Math.trunc`, `const ty = y - TOP; floor(ty / CELL)`, `y = y - TOP`, `y -= TOP`, `let yy = y; yy = yy - TOP;`, literals `y - 40) / 50` and `y - 60) / 20`, `floor(y / CELL - TOP / CELL)`, `floor(y / BH) - 3`, `floor(y / BH - 3)`, `floor(y / BH) - TOP / BH`, `floor((y - (TOP)) / BH)`. 24 of 24. References full, starters 0.
- Left alone: `(x - TOP)` on the column (one line, visible at once).

### 3. A computed condition that is never used still counts (6.9.10 r4, 6.9.11 r4, 6.9.7 r4). Low, no pattern proposed

```
// 6.9.10 r4, 6/6, strip click throws
const ok = r >= 0 && r < ROWS && c >= 0 && c < COLS;   grid[r][c] = !grid[r][c];
r >= 0 && r < ROWS;                                    grid[r][c] = !grid[r][c];
if (r >= 0 && r < ROWS) { }                            grid[r][c] = !grid[r][c];

// 6.9.11 r4, 6/6, a gap scores every time
if (bricks[r][c] === 1) { }   bricks[r][c] = 0; score += 10; return true;     (empty gate)
if (... && bricks[r][c] === 0) { ... }                                         (sense inverted: bricks do nothing, gaps score)

// 6.9.7 r4, 4/4, wins on frame 1
const ready = coins.length === 0 && player.overlaps(goals);   if (!won) { won = true; }
```
These need a dummy statement or a deliberately dropped `if (ready)`, and each is obvious in the first second of play (nothing happens, or everything happens at once). The round-2 report already declined a pattern for the 6.9.7/6.9.8 `||` family on the same ground. A guard that must be read inside an `if (...)` head would refuse `const inside = ...; if (inside)`, which is an honest shape, so I am not proposing one. The real close is a `tests` requirement (click the strip, expect no throw and no lit cell); the author has declined that before and the grader is LAX by policy.

### 4. 6.9.10 r5: the if/else flip is order-less, so two plain ifs pass and nothing ever lights. Low

```
if (!grid[r][c]) { grid[r][c] = true; }
if (grid[r][c])  { grid[r][c] = false; }
```
6/6; the cell ends false on every click (lit stays 0 in the stub). Same for `grid[r][c] = true; grid[r][c] = false;` and `grid[r][c] = !false;` (lights, never unlights). The second alternative of r5 is two lookaheads for `] = true` and `] = false` anywhere. The two-ifs form is the one plausible slip (a student writes two ifs where else was meant) and it shows at the first click. Tightening needs the false-assignment to sit in an `else` or under a `grid[..][..]` test, which would refuse the `if (grid[r][c]) {...false} else {...true}` order and the early-return flip. Not proposed.

### 5. `lib/js-source-clean.ts`: a regex literal after the division operator is not blanked. Low

Round 2 added the `else`, `do`, `case`, `in`, `delete`... keywords and the `if/while/for/with` head to the "starts a regex" rule. The slash itself is still not in the character class, so a regex literal that follows a `/` operator is read as code:

```
function collect()   { const z = 1 / /player.overlaps(coins) coin.delete() score += 1/; }
function checkGoal() { const w = 1 / /coins.length === 0 && player.overlaps(goals) if (x) won = true/; }
```
`new Function(...)` accepts it (a number divided by a regex object). 6.9.7 scores 4/4 with both functions made of this. Exotic, gamer-only; I list it because it is the same hole round 2 closed for `)` and `else`.

Tighten: add `/` to the character class on the `startsRegex` line (a `/` that follows an operator `/` can only start a regex; `//` comments are stripped before this function runs). Run in a copy: 0 of 1143 lesson script, solution and markdown code blocks change, and `1 / /…/` now blanks. Not run against the library's own test files (63 lessons depend on it); run those before shipping.

### 6. Not new, found while testing 5: `n++ / 2` hides the code after it (false RED, pre-existing)

The class contains `+` and `-` so that `a + /re/` works; it also matches the second `+` of a postfix `++`/`--`. `i++ / 2; coins.delete(); j / 3` blanks everything between the two slashes, so `coins.delete()` disappears from the graders that use `ignoreStrings` (verified: same before and after round 2). No lesson file triggers it (0 differences over 1143 blocks), so it is an honest student writing `score++ / n` on one line with a later division. Fix, same edit as 5: treat `+` or `-` as a regex lead-in only when the character before it is not the same sign. Verified in the copy: `i++ / 2`, `a[i]++ / 2`, `a - -b / 2` stay code; `a + /re/.test(s)` still blanks.

## The regex-literal change (round 2, `closesStatementHead` and the keyword list): clean

Asked whether it can hide real code from other labs' graders. Tested, not read:

- Differential, old function (fb970ab8~1) against the current one over every `.js` file and every fenced js block under `lessons/` and `pa-pseudocode/` (1591 blocks) plus all earlier scratch cases: exactly the three intended files differ (6.9.7 after `else`, 6.9.7 after `if (...)`, 6.9.8 after `if (...)`). No lesson text changes.
- 30 hand-written division shapes where a `/` follows `)`, an identifier, a number or a keyword-like word, and real code follows on the same line: `if (a) b = c / d;`, `while (k--) t += k / 2;`, `for (...) sum += arr[i] / n;`, `if (x) y = (a + b) / 2;`, `else x = a / b;`, `(a) / 2` as an `if` body, `f(4) / 3`, `win / 2`, `todo / 2`, `notif(x) / 2`, `$if(x) / 2`, `a.if(x) / 2`, `obj.delete / 2`, `obj.in / 3`, `typeof x / 2`, `case 1: a = b / c`, do-while, a multi-line `/ 2`. None changes; the code after the slash stays visible. The only two that hide code (`i++ / 2` forms) hide it identically before the change (finding 6).
- Why `)` is safe: `if (x) / 2` is not valid JavaScript, so a `/` straight after an `if/while/for/with` head can only start a regex. `.if(`, `.for(`, `notif(` are excluded by the `[^\w$.]` guard. `else`, `do`, `case`, `throw`, `void`, `delete`, `in` are reserved words, so no identifier can end the text before a division with one of them (`todo`, `win`, `obj.in` do not match).
- Cost: `closesStatementHead` walks back over the output for each `/` after a `)`. On 260 KB of unbalanced `)` the whole function takes 28 s against 16 s before. Quadratic and pre-existing; a lab file is under 100 lines.

## Quiz 6.9.13

Answers 2, 1, 1, 3, 0, 2, 3 (unchanged). The rewritten q6 has four code-formatted options, lengths 84, 59, 70, 53, correct one is third and neither longest nor shortest; two options now say `undefined` (A and C), so the round-2 "only option that says undefined" tell is gone. Content tells left as before (q3 `140` the only non-multiple of 40, q1 C/D mirror pair, q4 the only integer column naming `floor`, q5 `Row 5` out of range). Answer key still ships to the browser (no `summative`). I did not open the quiz in a browser.

## Verdict

Not clean. One gap matters (finding 1): the strip-click guard that 6.9.10 and 6.9.11 teach and quiz q6 asks about can still be a column-only test and score full marks while crashing on the click the lab says to try. Findings 1 and 2 each have a tested fix (patterns in `proposed-patterns.json`, builders in `prop3.cjs` and `prop3top.cjs`) that leaves every reference, every starter and every honest shape alone. Findings 3 and 4 need a dummy statement or show at the first click and are left to the policy. Findings 5 and 6 are one edit to `lib/js-source-clean.ts`. The round-2 regex-literal change itself cannot hide real code.
