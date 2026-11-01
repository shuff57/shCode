# 6.10 Breakout -- strong-student lens, round 2 (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD 59d61d25 (breakout lens round 1). Labs 6.10.4, .5, .6, .8, .9, .10, .13.
No lesson file touched. Grading is `lib/grader.ts` bundled with esbuild and called directly, each lab's own `lesson.json`
requirements at HEAD, no mocks. Harness and every case file are in the scratchpad
(`.../scratchpad/r2/`: `lib.cjs`, `c4/c5/c6/c8/c9/c10/c13/cx/c5b/c10b/t9/ce.cjs`, `tr.cjs`, `timing*.cjs`, `patch1.cjs`); not in the repo.

**Verdict: NOT CLEAN.** Round 1 closed everything round 1 found that it set out to close, with no honest regression. Round 2
found 6 gaming gaps (two of them one-liners on one card) and 9 punished-elegance families. Five gaps and the two largest
elegance families have a tested fix (section 4, patterns in `codehs-review/loop/breakout-advanced-r2-patterns.json`).

Run: 502 named cases (roughly 40% gaming, 60% honest) plus 96 mechanical restyles of the seven references.
Per lab: .4 54, .5 103, .6 66, .8 42, .9 121, .10 72, .13 44. Baseline: all seven references full, all seven starters 0.

---

## 0. Round 1 cheats, re-tried

Every cheat in `breakout-advanced.md` and `breakout-fix-cases.md` was re-run. All stay closed:
6.10.9 bare `.filter(`, empty-`if` then `n += 1` / `n++`, guard deleted, `state = 'lost'` / `'won'` unlinked, lives branch missing;
6.10.8 unconditional flips, empty ifs then flips; 6.10.5 `vx = 0` / `vy = 0` walls, bare `overlaps` / `vy > 0`,
`if (ball.y > 0) serve()`, `ball.y < 400`; 6.10.4 soup, empty key ifs, clamp 0/400, clamp 999/1, `constrain(mouse.x, 0, 999)`
alone, ternary key reads; 6.10.10 key reads or `prompt(` unrelated to the assignments; 6.10.13 comment and string smuggling
(0 or 1 of 2).

Honest restyles, mechanical, all seven references: `==` for `===`, `const` to `let` and `var`, every space around an operator
removed, single to double quotes and to backticks, Allman braces, CRLF, tabs, doubled blank lines, brace-less ifs given braces,
`ball.pos.x` forms, `n++` / `lives--`, longhand `x = x + y`, an extra pair of parentheses round every `if` condition.
**96 of 96 stay full.**

## 1. GAMEABLE (cheapest first)

Declared leftovers are not repeated (empty-`if` bodies, 6.10.6 fragments, 6.10.13 floor, string-blanked words and keys and arrows,
6.10.8 centre decoy, walls at 1/399 and the same family at 12/388, structural dead code).

### 1. 6.10.10 r1 -- 1/3 from the untouched starter plus one line
```js
// untouched starter, in drawTop(), above the 'won' line:
if (state === 'title') showIt();
```
r1 turns green (starter 0/3 becomes 1/3). With the reference plus `function showTitle() {}` it stays 3/3. No title text is
written. Cause: the third alternative accepts `if (<title test>) anyName()` and then a lazy `[\s\S]*?\btext\s*\(` anywhere later,
and drawTop's own `won` / `lost` lines are that later `text(`. The called function is never required to exist or to write text.
This is not the declared blanked-words class: the title words are not the issue, the title is never drawn.
Fix tried and **not shipped**: scoping r1 to the whole file so the call could be tied to a definition that contains `text(`
broke the starter (scored 1/3) and opened three new cheats, so it was dropped. No safe pattern-only fix found. Honest options:
a `tests` requirement (set `state = 'title'`, call `drawTop`, expect a text call) or restricting alt 3 to the listed helper names
(which then refuses `showMenu` and `drawStartScreen`, accepted today only because of the lazy scan).

### 2. 6.10.9 r1 -- 3/3 counting the gaps
```js
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++)
    for (let c = 0; c < bricks[r].length; c++)
      if (bricks[r][c] === 0) n++;      // also  == 0,  and  if (!bricks[r][c]) n++
  return n;
}
```
3/3. It returns the number of GAPS (3 at the start, so the wall can never be won). Cause: the brick-test lookahead only asks
that `bricks[r][c]` appear in an `if` head; the comparison is never read. Also 3/3: `return n + 1;`, and `return 0;` as the
last line after a correct count (dead code, structural, noted only). **Fix A.**

### 3. 6.10.9 r2 -- 3/3 losing on the first miss
```js
if (ball.y > 400 + R) {
  lives -= 1;
  if (lives > 0) state = 'lost';   // also  lives !== 0
  else serve();
}
```
3/3: the game ends on the first miss while lives are left. Cause: the lives test in front of `state = 'lost'` is any of
`=== 0 / <= 0 / < 1 / > 0 / >= 1 / !== 0`, and any `else` in front of it counts. Round 1 recorded this as "not proposed
(semantic swap)"; it is a one-regex fix with no honest cost. **Fix B.**

### 4. 6.10.5 r5 -- 6/6 with the steer outside the paddle `if`, or steering the wrong way
```js
if (ball.overlaps(paddle) && vy > 0) { vy = -vy; }
vx = (ball.x - paddle.x) / 10;        // every frame: the wall flips are undone
```
6/6. Same with `vx = (paddle.x - ball.x) / 10` inside the `if` (the ball is sent away from the side it landed on).
Cause: r5 only asks for `vx =` with `ball.x` and `paddle.x` on the same line, anywhere in `moveBall`. It is in round 1's list
("r5 ... passes at the top level of moveBall") and round 1 did not touch r5. **Fix C.**

### 5. 6.10.10 r2 -- 3/3 with the game starting without a key
```js
function pickMode() {
  if (kb.presses('1')) control = 'mouse';
  if (kb.presses('2')) control = 'keys';
  state = 'play';          // unconditional: the title screen lasts no frames
}
```
3/3. Also `state = 'play';` as the first line, and `if (kb.presses('2')) { control = 'keys'; }` with no `state = 'play'`
in key 2's own branch. Cause: the third lookahead accepts `state = 'play'` anywhere. **Fix D** closes the two unconditional
shapes; key 2 without its own `state` is left (closing it refuses the honest "one `state` after both keys" shape).

### 6. 6.10.10 r3 -- 3/3 with the title shown forever
```js
} else if (kb.presses('r')) {
  startGame();
}
state = 'title';           // unconditional, in draw(): the game can never leave the title
```
3/3. Also `kb.presses('r'); state = 'title';` as bare statements. Cause: alt 2 is `kb.presses('r')` ... `startGame()` then a
lazy `state = 'title'` anywhere after it, written for "state is set inside startGame" (the list is `draw`, `startGame`, joined into
one body). A pattern cannot tell the unconditional line in `draw` from the one in `startGame`. Round 1's closure ("R unrelated to
state = title") holds; this is its residual. No fix proposed: any tightening refuses the honest `startGame()`-sets-it shape.

### 7. Wrong values that still score (lower value, one line each)
| Lab | Code | Score |
| --- | --- | --- |
| 6.10.4 r3 | `if (paddle.x < 40) paddle.x = 400; if (paddle.x > 360) paddle.x = 0;` (also `= 1000`) | 3/3, **Fix E** closes it |
| 6.10.4 r2 | `if (kb.pressing('left')) paddle.x -= 0;` and `+= 0` (moves by zero) | 3/3, not fixed |
| 6.10.5 r2/r3 | left wall `vx = -abs(vx)`, top `vy = -abs(vy)` (sign-neutral `abs` accepted either sign); `vx = 1` at both walls | 6/6, not fixed |
| 6.10.8 r1/r2 | `if (hitAt(top) \|\| hitAt(bottom) \|\| hitAt(left) \|\| hitAt(right)) { vy = -vy; vx = -vx; }` | 2/2, arguably an honest alternative |
| 6.10.13 r1 | `vx = 3.0;` and `vx = 03;` in `serve()` (the same speed) count as "a faster serve"; with a four-word comment, 2/2 (run) | in the declared floor class |

---

## 2. PUNISHED ELEGANCE (honest, course-shaped answers refused)

Each is the reference with one function body swapped; the red card in brackets.

| Lab | Honest answer | Result | Fix |
| --- | --- | --- | --- |
| 6.10.9 r1 | counter not named `n`: `let count = 0; ... count++;` (also `total`, `left`, `num`, `sum`, `bricks_left`, `c2`; `++`, `+= 1`, `= x + 1` each: 21 of 21 shapes) | 2/3 [r1] | **A** (all 21 pass) |
| 6.10.9 r1 | `for (const row of bricks) for (const cell of row) if (cell) total += 1;`; `++count` | 2/3 [r1] | A |
| 6.10.5 r2 | right wall with the radius typed: `if (ball.x > 400 - 6 && vx > 0)` (the left `ball.x < 6` is accepted) | 5/6 [r2] | **F** |
| 6.10.6 r1 | `WALL.forEach(line => { ... line.split('').forEach(ch => ... row.push(...)) })` (6.10.6 r3 and 6.10.9 r1 take `forEach`; this card says "for or while") | 4/5 [r1] | **G** |
| 6.10.4 r2 | keys moved by a helper: `if (control === 'keys') moveWithKeys();` | 2/3 [r2] | H |
| 6.10.4 r3 | clamp in `limitPaddle()` (name not on the list); `clampToScreen(x)` returning `constrain(x, ...)` | 2/3 [r3] | H for the first, not the second |
| 6.10.5 | `wallsBounce()`, `bounceOffEdges()` (r2, r3); `bouncePaddle()` (r4, r5); `moveIt()` (r1); `isLost()` (r6) | 4/6, 4/6, 5/6, 5/6 | H for all but `isLost()` |
| 6.10.6 r3/r4 | `drawBricks` calls `drawBrick(r, c)` holding the `fill` / `rect` | 3/5 | list/grader |
| 6.10.8 r1/r2 | edge tests in boolean helpers `hitsVertical()` / `hitsSideways()` | **0/2** | list/grader |
| 6.10.9 r2, r3 | `missed()` for the life code; `winGame()` for the win | 2/3 | list/grader |
| 6.10.10 r3 | `restart()` holding `startGame(); state = 'title';` | 2/3 [r3] | list/grader |
| 6.10.4 r3 | `let h = PADDLE_W / 2; if (paddle.x < h) paddle.x = h;` (`half...` works, `h` does not) | 2/3 [r3] | not fixed |
| 6.10.5 r2/r3 | radius named `RADIUS` or `r` | 4/6 | not fixed (the starter gives `R`) |
| 6.10.6 r5 | `const x = ball.x, y = ball.y; if (hitAt(x, y)) vy = -vy;` (6.10.8 takes point aliases) | 4/5 [r5] | not fixed |
| 6.10.10 r1 | `text(state === 'title' ? ... : '')`; `state === 'title' && text(...)` | 2/3 [r1] | not fixed |
| 6.10.13 r1 | a rule the card does not name: key speed, steer divisor, ball colour, wall layout, `lives += 1` on a brick | 1/2 [r1] | declared floor |

**The helper class** is one cause for the rows marked H and "list/grader": the card is an `inFunction` over a list of names
and a helper under any other name is invisible. Round 1 added common names; the long tail stays. A whole-file `regex` for 6.10.4
r2/r3 and 6.10.5 r1 to r6 fixes seven of those rows (**Fix H**, tested). The same switch on 6.10.6 / .9 / .10 was tried and
rejected: it let `makeBricks`'s loops satisfy `drawBricks` (one-loop `drawBricks` and a draws-every-cell `drawBricks` newly
passed), let any `serve()` in the file satisfy 6.10.9 r2 (`lost` branch with no serve newly passed), and broke the
`startGame`-sets-title shape on 6.10.10 r3. Those labs need more names or a grader feature (`function: "*"`).

Not found: no issue with `let` versus `const`, `==`, spacing, parentheses or brace placement (all passed in the restyle sweep
and in dozens of named shapes). Ternary, `&&`, guard-return and `forEach` shapes passed everywhere except the rows above.
Refused, not counted as defects because the course has not taught them: `.reduce(...)` for `bricksLeft`, `WALL.map(...)` with
no loop, a bare global `key === '1'`.

---

## 3. Elegance half: tested, with results recorded

Named honest cases, all full marks unless listed in section 2: Allman; `==`; no spaces; double quotes and backticks; `else if`
chains; `switch (control)`; `constrain` / `Math.max(Math.min())` / ternary clamps; `half` variables; reversed comparisons
(`PADDLE_W / 2 > paddle.x`); keys by `dx` / `step` variables, `((right) - (left)) * 6`, `&&`-joined, `kb.holding`, `ArrowLeft`;
`vx *= -1`, `-1 * vx`, `0 - vx`, `(-vx)`, `abs` flips; guard first, nested guard, `||` guard; pull-back then flip; ternary walls;
`>=` / `<=`; `ball.d / 2`, `width`, `height`; `pos.x` forms; steer by offset variable, `* 0.1`, `/ 8`, `map()`, `constrain()`;
nested overlap / `vy > 0`; `paddle.overlaps(ball)`; hit alias; `vy >= 0`; lost test in `draw()`, first, after a block, with
`height + R`, `ball.y - R > 400`; `for...of` with `entries()`; running `x` / `y` with `+=`; `BW * c`; `rect((c * BW), (TOP + (r * BH)), ...)`;
literals `50 / 20 / 60`; alias `const hit = hitAt(...)`; `=== true`; `vy *= -1`; `abs(vy)`; `if ((hitAt(...)))`; `lives--`, `<= 0`,
`!lives`, `< 1`, `lives > 0` first; `bricksLeft() < 1`, `!bricksLeft()`, `0 === bricksLeft()`; `const left = bricksLeft()`;
`const lost = ...`; guard return first; `else if` chain; `kb.pressed`, `kb.pressing`, `kb.presses(1)`, `prompt`; `begin(mode)`;
one-line, braced, ternary and alias pick; `drawTitle()` / `titleScreen()` helpers; R in a nested `else`, in its own `if`,
`kb.pressed('r')`, `'R'`, double quotes, `state` before or after `startGame()`; each of the 6.10.13 challenges alone, plus
`PADDLE_W`, `lives`, `score`, speed (`4`, `3.5`, `-5`) and `vy *= 1.1` rules.
Not tested: optional chaining (no honest place for it in these labs), the AI-graded 6.10.1 / .11, the 6.10.12 quiz, and running
the sketches in a browser (semantic claims are from reading the code).

---

## 4. Fixes -- run against the references, honest shapes, cheats and starters

Patterns are in `codehs-review/loop/breakout-advanced-r2-patterns.json` as `{lab: {card: pattern}}`; an object value
`{pattern?, type: "regex"}` means "also switch the card to a whole-file `regex`". They are edits of the shipped patterns,
not rewrites. Results are with ALL of them applied and the whole 502-case set re-run: **0 new honest refusals, 0 new cheats**;
the mismatch list against HEAD shows only removals.

| Fix | Card | Change | Closes | Must still pass (run) |
| --- | --- | --- | --- | --- |
| A | 6.10.9 r1 | the counter is whatever identifier `bricksLeft` returns (`return X;` captured, `\bn\b` replaced by `\k<cnt>` in all 19 places); a zero test (`=== 0`, `== 0`, `< 1`, `<= 0`, `!x`) directly followed by the increment is refused | gap counting (3 shapes), `return n + 1`, `return 0`; 21 renamed-counter shapes, `if (cell) total += 1`, `++count` | `solution.js` 3/3; `n = n + bricks[r][c]`, `n += bricks[r][c]`, `forEach` count, `for...of`, row alias, `continue` on a gap, `flat().filter()`, `n++`; starter 0 |
| B | 6.10.9 r2 | `if (...) state = 'lost'` needs a ZERO test (`=== 0`, `<= 0`, `< 1`, `!lives`); an `else` before `state = 'lost'` needs a positive `if (lives > 0 / >= 1 / !== 0)` just before it | `lives > 0` -> lost, `lives !== 0` -> lost | reference 3/3; `lives > 0` first then `else state = 'lost'`; `lives--`, `<= 0`, `< 1`, `!lives`; `const lost = ...`; starter 0 |
| C | 6.10.5 r5 | the steer sits inside an `if` body (one level of inner braces allowed) and is `ball.x` before `paddle.x` (or `-(paddle.x - ball.x)`); offset aliases kept, declared before the `if` or inside it | steer outside the `if`, wrong-way steer, steer after an empty `if` | reference 6/6; nested overlap / `vy > 0`; steer before the flip; offset variable inside and before; hit alias; one-line `{ }`; position test; `ball.pos.x`; centre alias; `* 0.1`; `map()`; starter 0 |
| D | 6.10.10 r2 | `state = 'play'` must be under an `if`, a `case`, or after a guard `return` | `state = 'play'` as the first or last bare line | reference 3/3; guard return (both), `switch (k)` with `case`, combined `\|\|` if, `if / else if / else`, nested `if`; `begin(mode)`; starter 0 |
| E | 6.10.4 r3 | what the clamp assigns must also carry a limit token (`PADDLE_W`, `/ 2`, 3x / 4x / 35x / 36x, `half...`, a CAPS constant, `min` / `max` ...) | `paddle.x = 400` / `= 1000` / `= 0` clamps | reference 3/3; `PADDLE_W / 2`, `40`, `360`, `400 - 40`, `half`, `constrain`, ternary clamp, `paddle.w / 2`; starter 0 |
| F | 6.10.5 r2 | right wall also accepts `400 - <1..12>` | `ball.x > 400 - 6` | reference 6/6 (the 12/388 family stays declared) |
| G | 6.10.6 r1 | `forEach` counts as a loop and `.forEach(` joins `map` / `split` as a method on `WALL` | `WALL.forEach(...)` | reference 5/5; starter 0 |
| H | 6.10.4 r2, r3; 6.10.5 r1 to r6 | `type: "regex"` (whole file) instead of `inFunction` + names | 7 helper rows in labs .4 and .5 | reference; starters 0; every cheat that was caught is still caught. Labs .6 / .8 / .9 / .10 deliberately NOT switched (section 2) |

Cheapest breaks AFTER the fixes (still full marks, not fixed): 6.10.10 r1 (starter + one line, 1.1); 6.10.10 r3 (unconditional
`state = 'title'`); 6.10.10 r2 key 2 without its own `state`; 6.10.4 r2 `-= 0`; 6.10.5 sign-neutral `abs` and `vx = 1`; 6.10.8
combined flip; 6.10.13 `3.0`. Every empty-`if` shape and every 6.10.6 fragment shape is unchanged (declared).

References and starters under the full patch set: 4 3/3, 5 6/6, 6 5/5, 8 2/2, 9 3/3, 10 3/3, 13 2/2; starters 0 on every lab.

### Speed

Every graded card was run on 5000-character adversarial bodies placed in every graded function of its lab and in the helper
names: 1,167 (card x function x trigger) combinations, the whole `grade()` call, best of 3. Triggers: repeated
`if (ball.y > 400 `, `if (ball.x < R && vx < 0) {`, `kb.pressing(`, `const a = kb.pressing(...); if (a) `,
`paddle.x = paddle.x < 40 ? `, `if (bricks[r][c] === 1) `, `bricks.forEach(row => row.forEach(c => `, `const h = hitAt(...)`,
`if (state === 'title') { `, `case 'title': `, `for (const row of bricks) for (const cell of row) `, `const row = bricks[r]; `,
`const off = ball.x - paddle.x; `, `vx = (ball.x < R ? `, `if (ball.overlaps(paddle)) { if (vy > 0) { `, open `(((` and `{{{`,
`else `, `} else if (`, with and without 8 closers; 6.10.13 r2 on 5000 characters of blank lines, `// a b c d e` lines and bare `//`.
**Shipped patterns: worst 42 ms (6.10.5 r6 on `if (ball.y > 400 `, load average 47); none over 50 ms, none over 100 ms.
Patched patterns: worst 17.9 ms.** No lookbehind added. The one new nested quantifier, `(?:[^{}]|\{[^{}]*\}){0,400}?` in Fix C,
has disjoint alternatives and a 400 cap.

### Gates

Not run: no lesson file was edited and no pattern was shipped; the fixes are proposals. Before applying, run
`scripts/check-starters.mjs`, `scripts/audit-grader-tolerance.mjs --gate`, `scripts/test-grader-tolerance.mjs`, and add each
"must still pass" row above to the accept list and each closed cheat to the reject list.

Decision for the owner: Fix H and the 1.1 / 1.6 residuals need a call. H is a scope change on two labs (no honest regression
found, seven honest refusals removed, nothing new opened). 1.1 and 1.6 have no pattern-only fix that leaves the honest helper
shapes alone; the choice is between a `tests` requirement through `scripts/moshion-harness.mjs` (set `state`, call the
function, read the result) and accepting the lax floor.
