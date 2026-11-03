# 6.10 Breakout -- strong-student lens, round 3 (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD d284c5bf (breakout lens round 2). Labs 6.10.4, .5, .6, .8, .9, .10, .13.
No lesson file touched. Grading is `lib/grader.ts` bundled with esbuild and called directly against each lab's own `lesson.json`
requirements at HEAD, no mocks. Harness and case files are in the scratchpad
(`.../scratchpad/r3/`: `lib.cjs`, `c*.cjs` replayed from round 2, `n4/n4b/n5/n5b/n5c/n6/n8/n9/n10/np.cjs` new, `fix.cjs` builds the patch,
`cmp.sh` diffs HEAD against a patch over every case file, `tr.cjs` restyles, `timing*.cjs`); not in the repo.

**Verdict: NOT CLEAN.** Round 2's fixes (A to H, W1 to W4) all hold and no honest regression came from them. But round 2 fixed
the cheats it found and left their siblings: seven gaming gaps, five of them one line or a one-token change from a shape round 2
closed, plus three punished-elegance families. All seven gaps and all three elegance families have a pattern fix that was run
(section 5, patterns in `codehs-review/loop/breakout-advanced-r3-patterns.json`). Five further gaps have no safe pattern fix (section 3).

Run: 478 cases replayed from rounds 1 and 2, 423 new named cases (270 honest-shaped, 153 cheats), 96 mechanical restyles of the seven
references, plus 16 function-style, 9 loop-bound and 3 paren cases. Baseline at HEAD: all seven references full, all seven starters 0.

---

## 0. Earlier cheats and round 2's fixes, re-tried

The 478 replayed cases give 69 mismatches at HEAD, **the same 69 as round 2's "not fixed" list** (declared leftovers, the
6.10.6 fragment and helper-name rows, `RADIUS`/`r`, `h`, `hw2`). Every round-1 and round-2 cheat that A to H closed is still red:
gap counting (all shapes), `return n + 1`, `return 0`, first-miss loss (`lives > 0` / `!== 0` / `>= 1` -> lost), steer outside the
paddle `if`, wrong-way steer, `paddle.x = 400 / 0 / 1000` clamps, unconditional `state = 'play'` as first or last line,
`vx = 0` walls, `if (ball.y > 0) serve()`, `ball.y < 400`, empty key ifs, soup, string and comment smuggling.
All 96 restyles of all seven references (`==`, `let`/`var`, no spaces, quotes, Allman, CRLF, tabs, blank lines, brace-less to braced,
`ball.pos.x`, `n++`/`lives--`, longhand, extra parentheses round every `if`) stay full.
Every requirement uses `ignoreStrings` (6.10.13 r2 is the deliberate exception), so a required line written inside a string is blanked.

---

## 1. GAMEABLE (cheapest first)

Declared leftovers are not repeated (empty-`if` bodies, 6.10.6 fragments and helper names, 6.10.13 floor, 6.10.10 r1 and r3, blanked title
words, left-vs-right arrows, `lost`/`play`, the 6.10.8 centre decoy, walls at 1/399, `-= 0`, `abs` sign, `vx = 1`, 6.9 lexer tricks).

### 1. 6.10.5 r2 -- 6/6 with ONE wall line that bounces off neither wall
In `moveBall()`, replace both side-wall lines with:
```js
if (ball.x < R && vx > 0) vx = -vx;
```
6/6. The ball passes through both side walls. Also 6/6, each on its own: `if (ball.x > R) vx = -vx;` as the right wall (flips every frame),
`if (ball.x < 400 - R) vx = -vx;` or `ball.x < width - R && vx < 0` as the left wall, and the same line twice (`ball.x < R && vx < 0`
then `ball.x < R && vx > 0`).
Cause: the left and right alternatives test the comparison operator, the limit and the sign guard as three separate lookaheads over the
whole head. `vx > 0` supplies the `>` the right wall wants, `R` is accepted as the right wall's limit because `400 - R` contains it, and
`400` or `width` in a left wall still contains `R`. One `if` therefore satisfies both halves. Round 2's F widened this card; the
operator-and-limit binding was never checked.
Same cause, same fix, three more cards: **6.10.5 r3** `if (ball.y > 0 && vy < 5) vy = -vy;` (flips every frame), **6.10.5 r6**
`if (ball.y > 0 && ball.x < 400) serve();` and `... && score < 999` (serves every frame; round 1 closed the bare `if (ball.y > 0)` and this is
one clause longer), **6.10.9 r2** `if (ball.y > 0 && score < 999) { lives -= 1; ... }` (loses a life every frame), all full marks.
**Fix 1:** bind the comparison to the ball. Left/top: `ball.x` then optional offset then `<` or `<=` then a radius token (`R`, a digit 1 to 12,
`ball.d`...), or the reversed `R > ball.x`, or `ball.x - R <= 0`. Right: `ball.x >=` then `39x | 388 | 389 | 400 - <radius> | width - <radius> | width`,
or reversed, or `ball.x + R >= 400 | width`. Lost ball: `ball.y` (with an optional `- R`) `>` 36x to 999 | `height`, or reversed with an optional `+ R`.
The sign guard stays optional. Must still pass (all run, 6.10.5): `ball.x < R && vx < 0`, `ball.x - R < 0`, `ball.x - R <= 0`, `ball.x + R > 400`,
`ball.x + R >= width`, `ball.x < ball.d / 2`, `ball.x > width - ball.d / 2`, `R > ball.x`, `400 - R < ball.x`, `400 + R < ball.y`, `ball.x < 6`, `> 394`,
`> 399 - R`, `< R + 1`, `ball.y < 0 + R`, `ball.y - R > 400`, `ball.pos.x`, the `||` combined wall, `vx *= -1`, `0 - vx`, `-1 * vx`, `abs`, ternary walls,
Allman braces. Must still fail: the lines above, the untouched starter.

### 2. 6.10.9 r1 -- 3/3 with `continue` and no count at all
```js
function bricksLeft() {
  let n = 0;
  for (let r = 0; r < bricks.length; r++)
    for (let c = 0; c < bricks[r].length; c++)
      if (bricks[r][c] === 0) continue;    // n is never incremented: returns 0
  return n;
}
```
3/3, so the wall is "won" from the first frame. Siblings of round 2's closed gap count, all 3/3:
- `if (bricks[r][c] === 1) continue; n++;` (also `!== 0` with `n += 1`, and `if (bricks[r][c]) continue; n++;`): counts the gaps.
- `n += bricks[r][c] === 0 ? 1 : 0;` and `n += (bricks[r][c] === 0);`: counts the gaps.
- `return bricks.flat().filter(b => b === 0).length;` (also `b => !b`, `b => b === 7`, `() => false`, `() => true`), and the row form
  `n += row.filter(cell => cell === 0).length;`: the filter predicate is never read.
- `for (const row of bricks)` replaced by loops that never cover the wall: `r < 1, c < 1`, or `c < 3`, or `while (false)`, with a correct `if`/`n++` inside.
- a `for` loop plus `return WALL.filter(x => x).length;` (any receiver but `bricks`).
Cause: round 2's A closed the zero test directly followed by `n++` / `+= 1`; the `continue` alternative, the `+= <expression>` alternative and the
two `.filter(` alternatives sit outside that guard, and the loop lookahead is only the words `for|while|forEach`.
**Fix 2:** (a) a `continue` must be under a zero test (`=== 0`, `<= 0`, `< 1`, `!x`, `!== <nonzero>`) and be followed by an increment of the counter; (b) a refusal
of `cnt += <expr> === 0 / < 1 / <= 0` beside A's; (c) the filter predicate must read its parameter positively (`=== 1`, `> 0`, `>= 1`, `!== 0`, bare truthy, `Boolean`),
and the loop-plus-`.filter` alternative needs a receiver that is `bricks[...]`, a `for...of bricks` variable, a `const row = bricks[...]` alias or a `bricks.forEach`
parameter; (d) each loop header needs a bound that is not 0 to 4 (a `.length`, `BRICK_ROWS`, a name, 5 or more) or a `for...of` / `forEach` / reverse `>= 0`.
Must still pass (run): the reference; `if (gap) continue; n += 1` / `n++`, braced and `else`; `n += bricks[r][c]`; `n += cell === 1 ? 1 : 0`;
`.flat().filter(b => b === 1 | b > 0 | b !== 0 | b)`, `.filter(Boolean)`; `row.filter(cell => cell === 1 | cell)` in a loop, over `bricks[r]`, a `for...of` variable and a row alias;
`bricks.forEach(row => row.forEach(cell => ...))`; `for...of`, `let`/`var`; `r < BRICK_ROWS`, `r < 5`, `r < rows` (an alias), `r !== bricks.length`, reverse `r >= 0`, `r <= bricks.length - 1`.

### 3. 6.10.5 r5 -- 6/6 with the steer in the wrong `if`
```js
if (ball.overlaps(paddle) && vy > 0) {
  vy = -vy;
}
if (vy) vx = (ball.x - paddle.x) / 10;     // also: inside the top-wall if, the lost-ball if, if (true), if (control === 'mouse')
```
6/6. Round 2's C asks for "an `if` body"; any `if` will do, so the steer runs every frame (or on the top wall). The expression is also unchecked:
`vx = (ball.x - paddle.x) * 0`, `vx = (ball.x + paddle.x) / 10`, `/ 100000` are 6/6 (the same family as the declared `vx = 1`; not fixed).
**Fix 3:** the head of the `if` that holds the steer must mention the paddle (`paddle`, `overlaps`, an alias bound to `...overlaps(paddle)`), measured over the head only
(a parenthesis-bounded scan, so the steer's own `paddle.x` cannot satisfy it). An outer paddle `if` with an inner `if (vy > 0)` is its own alternative.
Must still pass (run): reference; steer before the flip; offset variable inside and before the `if`; nested `if (overlaps) { if (vy > 0) {...} }`; `hit` alias;
position-test head with `paddle.x`; `* 0.1`, `map()`, `constrain()`, `/ paddle.w * 8`; `else if` after a wall `if`; `paddle.overlaps(ball)`; extra parentheses.

### 4. 6.10.4 r3 -- 3/3 with a clamp whose conditions are about something else
```js
if (score < 0) paddle.x = 40;
if (score > 0) paddle.x = 360;
```
3/3 (also `if (1 < 2) paddle.x = 40; if (2 > 1) paddle.x = 360;`, `lives < 1` / `lives > 9`, and `mouse.x` as the tested value, which leaves keys unclamped).
Cause: the head test is `(?=[^;{}]{0,200}\bpaddle.x\b)(?=[^;{}]{0,200}[<>])`, which does not stop at the `)`: the `paddle.x` and the `40` it needs are the body's.
Direction is not read either: `if (paddle.x > 40) paddle.x = 40; if (paddle.x > 360) paddle.x = 360;` (pins the paddle left) is 3/3 (open, section 3).
**Fix 4:** the compared value must be `paddle.x` itself (`paddle.x <|> ...`, with an optional `- 40` / `+ 40`, or `... <|> paddle.x`); the ternary alternatives get the same rule.
Cost, named: `const px = paddle.x; if (px < 40) ...` (an alias of the paddle's x) stops passing. Must still pass (run): reference, `40 > paddle.x`, `paddle.x - 40 < 0` / `paddle.x + 40 > 400`,
`(paddle.x)`, `<=` / `>=`, `else if`, `constrain`, `Math.max(Math.min())`, nested ternary, `LEFT`/`RIGHT`, `minX`/`maxX`, `lo`/`hi`, `halfW`, `width - 40`, `paddle.pos.x`, `paddle.w / 2`, `||` joined then `constrain`.

### 5. 6.10.10 r2 -- 3/3 with `state = 'play'` under a trivially true `if`
```js
function pickMode() {
  if (kb.presses('1')) control = 'mouse';
  if (kb.presses('2')) control = 'keys';
  if (true) state = 'play';          // also if (1), if (control), if (!false), if (score >= 0), if (state)
}
```
3/3: the title lasts no frames. Round 2's D accepts any `if`. Also 3/3: `state = 'play'` after `if (false) return;`, and after a guard `return` that never fires.
**Fix 5:** the `if` holding `state = 'play'` (or the guard `if ... return`) must test a key: `kb.presses|pressed|released|pressing(`, a comparison with a one-character string or a digit,
a variable bound to a `kb` call, or a flag assigned `true`. Must still pass (run): reference, `else if`, combined `||` then one `state`, `const k = kb.presses(...)` then `if (k)`,
`chosen = true` then `if (chosen)` and `if (picked === true)`, guard return `if (!kb.presses('1') && !kb.presses('2')) return;`, `switch (k)` with `case '1'`, `start('mouse')` helper,
`kb.pressed`, `kb.pressing`, `kb.presses(1)`, double quotes, no semicolons, extra parentheses. Left (section 3): `if (kb.presses('9')) state = 'play'`, `switch (1) { case 1: ... }`.

### 6. 6.10.5 r6 and 6.10.9 r2 -- 6/6 and 3/3 with a "serve" that only moves x
```js
if (ball.y > 400 + R) ball.x = 200;      // 6.10.5: the ball stays below the screen for good
```
6/6. In 6.10.9 the same (`else ball.x = 200;`) is 3/3. Cause: the "served again" alternative takes `ball.x =` alone (round 2's W2 widened 6.10.9 to match 6.10.5).
**Fix 6:** drop the x-only alternative; `ball.y =`, `ball.pos.y`, `ball.pos =`, `serve()`, `startGame()` stay. Must still pass (run): `serve()`, the inline reset
`ball.x = 200; ball.y = 300; vx = 3; vy = -4;` (6.10.5 and 6.10.9, in `else`, under `lives > 0`, with `ball.pos.x`).

### 7. 6.10.9 r2 and r3 -- 3/3 with the ternary alternative unread
```js
state = lives > 0 ? 'play' : 'won';               // 6.10.9 r2: the game is never 'lost' (also : 'oops', four letters, the declared string class)
state = bricksLeft() > 0 ? 'won' : 'play';        // 6.10.9 r3: wins while bricks remain; also state = bricksLeft() ? 'won' : 'play';
```
3/3 each. Cause: the ternary alternative asks only for `state =` ... `lives` ... `?` (r2) and `? 'won'` after `bricksLeft(` (r3); neither the sense nor the word is read.
**Fix 7:** r2: a zero test then a four-character string (`lives === 0 ? 'lost'`, `!lives ? ...`), or a positive test with the four-character string in the else slot (`lives > 0 ? ... : 'lost'`);
r3: `bricksLeft() === 0 | <= 0 | < 1 | !` then `? 'won'`, or `bricksLeft() > 0 | !== 0 | bare ? ... : 'won'`. Must still pass (run): `state = lives === 0 ? 'lost' : 'play'`,
`lives > 0 ? 'play' : 'lost'`, `state = bricksLeft() === 0 ? 'won' : state`. Still open after the fix: a four-letter junk word (`'oops'`) and `lives === 0 ? 'play' : 'play'`
(the declared `lost`/`play` blanking).

---

## 2. PUNISHED ELEGANCE (honest answers refused at HEAD)

Each is the reference with one function body changed; the red card in brackets.

| Lab | Honest answer | At HEAD | Fix |
| --- | --- | --- | --- |
| 6.10.8 r1, r2 | the ball's position in variables: `const x = ball.x; const y = ball.y; if (hitAt(x, y - R) \|\| hitAt(x, y + R)) vy = -vy; if (hitAt(x - R, y) \|\| hitAt(x + R, y)) vx = -vx;` (6.10.6 r5 and the lab's own `hitAt(x, y)` model this) | **0/2** [r1, r2] | **8**: `ball.y - R` may be a variable bound to `ball.y` (same for x and for `+`); run 2/2 |
| 6.10.5 r5 | `vx += (ball.x - paddle.x) / 10;` (`vx = vx + (...) / 20` is accepted: `+=` is punished, the longhand is not) | 5/6 [r5] | **3** (`vx +=` accepted); run 6/6 |
| 6.10.9 r2 | guard return: `if (lives > 0) { serve(); return; } state = 'lost';` (round 2's B refuses it) | 2/3 [r2] | **9**: a positive `lives` test whose block returns, then `state = 'lost'`; run 3/3 |
| 6.10.4 r3 | clamp with a half-width in a short name: `const h = PADDLE_W / 2;` or `w2`; margins `50 / 350`, `60 / 340` (paddle fully on screen) | 2/3 [r3] | **10**: any name bound to a half-width or a 30 to 99 number; limit numbers 30 to 99 and 300 to 369; run 3/3 (`30 / 370`, `25 / 375`, `20 / 380` stay refused: the paddle would leave the screen) |
| 6.10.5 r4 | `const hit = ball.overlaps(paddle); if (hit) { if (vy > 0) { ... } }` | 5/6 [r4] | not fixed |
| 6.10.5 r6 | the bottom as a named constant: `const H = 400; if (ball.y > H + R) serve();` | 5/6 [r6] | not fixed |
| 6.10.9 r1 | the gaps counted then subtracted: `return BRICK_ROWS * BRICK_COLS - gaps;` (A refuses every zero-test counter by design) | 2/3 [r1] | accepted cost of round 2's A |

Refused and not counted: arrow or function-expression definitions of the lab's own functions (`const hitBricks = () => {...}` is 0/2 on 6.10.8; `inFunction` finds declarations
only, and every starter ships the declaration), `.reduce`, `Number(bool)`, a one-line `line.split('').map(...)` on a separate line from `of WALL`, a helper under a name not on the card's list.

Tested and fine (all full unless named in the table): `count++` / `+= 1` / `= count + 1` / `++count` with counters `n total count left i result standing bricksCount _n n2`; `for...of`
with `let`, `const`, `var`, `==`; `forEach` with `function` and arrow callbacks and with index parameters; `while` loops; row alias; cell alias; `continue` on a gap; `return (count)` and
a missing semicolon; keys by `dx`, `step`, `SPEED`, `speed`, ternary chains, `kb.holding('ArrowLeft')`, `switch (control)`, `&&` on one line, `||` with `a`/`d`, Allman; mouse by alias, `==`,
`!== 'keys'`, `switch`, `mouse.pos.x`; walls by ternary, `||` combined, `ball.d / 2`, `ball.w / 2`, `width`, `ball.pos.x`, `vx *= -1`, `0 - vx`, `-1 * vx`, `-(vx)`, `abs`; paddle by `paddle.overlaps(ball)`,
`overlapping`, `vy >= 0`, `0 < vy`, nested, `hit` alias in one head; steer by offset variable, `* 0.1`, `map`, `constrain`, `hitPos`; lost by `height`, `>= 400`, `ball.y - R > 400`, `+ ball.d`, inline reset;
title by `==`, reversed, `!== 'play'`, `switch`, template literal, double quotes; pick by `if/else if`, key variable, ternary control, state first, `kb.pressed`, `kb.pressing`, `kb.presses(1)`, `digit1`, flag, helper arrow;
four-edge `hitBricks` by separate ifs, hit variables per edge, flags, `||` vs `|`, `&&` guards, ternaries, aliases `top/bottom/left/right`, `else if` chain, early return; 6.10.6 `for...of` lines, `charAt`, `!== '.'`,
`b[r][c] = ... ? 1 : 0`, `+(ch === '#')`, `while`, `continue` in `drawBricks`, `x`/`y` consts.

---

## 3. Open (no pattern fix, or a fix that costs honest shapes)

| Lab | Code | Score | Why not fixed |
| --- | --- | --- | --- |
| 6.10.9 r2 | `serve()` outside the lost branch: `if (bricksLeft() === 0) { state = 'won'; serve(); }` with the lost branch only counting lives; or `serve();` as the last line of `checkEnd` | 3/3 | the serve lookahead reads the whole listed-function body; tying it to the guard block needs a brace-depth model for six shapes (brace-less guard, helper call, early return, alias, `else`, nested `if`). A `tests` requirement through `scripts/moshion-harness.mjs` (call `checkEnd` with `ball.y = 500`, expect `ball.y` back inside) is the clean fix |
| 6.10.9 r2 | `if (ball.y > 400 + R) { loseBall(); }` with no `loseBall` defined and `lives -= 1` elsewhere | 3/3 | Fix 1 plus the helper-name restriction (below) stops `noop()` and `redraw()`; a listed name that is called but never defined is the declared "undefined helper" class |
| 6.10.10 r2 | `if (kb.presses('9')) state = 'play';` (key 9 starts the game; 1 and 2 only set `control`); `switch (1) { case 1: state = 'play'; }` | 3/3 | the same shape as the declared "key 2 without its own `state`" |
| 6.10.4 r3 | `if (paddle.x > 40) paddle.x = 40; if (paddle.x > 360) paddle.x = 360;` (direction not read); `paddle.x = constrain(paddle.x, 40, 40);` | 3/3 | a direction rule needs the two `if`s to point opposite ways, which breaks `40 > paddle.x` pairs and the combined `\|\|` shape; judged a wrong-value mistake, like the declared `1/399` |
| 6.10.5 r4 | `if (ball.overlaps(paddle) \|\| vy > 0) {...}`; the body `vy = 4`, `vy = abs(vy)`, `vy = -4` | 6/6 | the card reads the head only; a body check is the declared empty-`if` class |
| 6.10.4 r2 | `if (kb.pressing('left')) paddle.x -= 6; if (kb.pressing('left')) paddle.x += 6;` (both on one key) and `paddle.x += kb.pressing('left') + kb.pressing('right');` | 3/3 | the declared left-vs-right class |
| 6.10.5, all | the whole `moveBall` body (or just `ball.x += vx; ball.y += vy;`) moved into `setup()` or `serve()`; `moveBall` left empty | 6/6 | the price of round 2's Fix H (whole-file `regex`): the ball never animates. Round 2 recorded "nothing new opened"; this is what opened. A `function: "*"` grader feature or a `tests` requirement closes it |

---

## 4. What was tested, honestly

Honest-shaped cases new this round: 270, of which 242 passed at HEAD and 248 pass with the patches. The 22 that still fail are the section 2 "not fixed"
rows, untaught shapes, and seven cases whose labels were wrong (an undefined helper, an early `return` that skips the serve, a `lives = 0` decrement). Cheat-shaped cases: 153; 51 stopped at HEAD,
106 with the patches; the rest are the declared leftovers and section 3. A mismatch against the patches that was not already a mismatch at HEAD: **one**, the named px alias in Fix 4.
Elegance half: all named honest families in section 2 were run, not assumed. Not tested: the AI-graded 6.10.1 and .11, the .12 quiz, and a browser run of the sketches (semantic claims are from reading the code).

---

## 5. Fixes -- run against references, honest shapes, cheats, restyles and starters

Patterns: `codehs-review/loop/breakout-advanced-r3-patterns.json` as `{lab: {card: {pattern}}}`, edits of the shipped patterns (card types unchanged). Built by `fix.cjs` from the shipped text,
with an assertion on every replacement count. Idioms added: a **head-bounded scan** `(?:[^;{}()]|\((?:[^()]|\([^()]*\))*\))*?` (it cannot cross the `)` that closes an `if` head, so a brace-less body cannot supply the head's words), and **bound comparisons** (operator and limit adjacent to the ball or paddle coordinate).

| Fix | Card | Closes | Net effect |
| --- | --- | --- | --- |
| 1 | 6.10.5 r2, r3, r6; 6.10.9 r2 | one-line walls, `ball.x > R`, `ball.y > 0 && ...` serves and life loss | in the 6.10.5 and 6.10.9 counts below |
| 2 | 6.10.9 r1 | `continue` only, inverted `continue`, gap ternary, filter predicate, partial loops | in the 6.10.9 count below |
| 3 | 6.10.5 r5 | steer in any `if`; also accepts `vx +=` | in the 6.10.5 count; `vx +=` accepted |
| 4 | 6.10.4 r3 | unrelated or `mouse.x` heads | 6 cheats red in 6.10.4; the px alias costs |
| 5 | 6.10.10 r2 | `if (true)`, `if (1)`, `if (control)`, `if (kb)`, `if (!false)`, `if (score >= 0)`, `if (state)`, dead guard return | 8 cheats red in 6.10.10 |
| 6 | 6.10.5 r6, 6.10.9 r2 | x-only serve | in the 6.10.5 and 6.10.9 counts |
| 7 | 6.10.9 r2, r3 | ternary sense | in the 6.10.9 count |
| 8 | 6.10.8 r1, r2 | accepts `x`/`y` aliases | `x`/`y` aliases accepted (0/2 to 2/2) |
| 9 | 6.10.9 r2 | accepts the guard-return lost shape; a guard call must be a name from the card's list | guard-return accepted; `noop()` / `redraw()` decoys red |
| 10 | 6.10.4 r3 | accepts `h`, `w2`, `50/350`, `60/340` | `h`, `w2`, `50/350`, `60/340` accepted |

Newly stopped across all fixes: 55 cheat-labelled cases (6.10.4: 6, 6.10.5: 16, 6.10.9: 25, 6.10.10: 8); newly accepted: 8 honest-labelled cases; newly refused: 1 (the px alias).

References and starters with every patch applied: 4 3/3, 5 6/6, 6 5/5, 8 2/2, 9 3/3, 10 3/3, 13 2/2; starters 0 on every lab. All 96 restyles full. The first draft of Fix 3 failed one restyle (extra
parentheses round every `if`: the bounded scan did not enter a double-paren head) and was corrected before this report; a bounded scan that does not allow one nested pair is the trap to avoid.
Totals over 901 named cases: 199 mismatches against their labels at HEAD (69 declared from round 2, the rest this round's gaps, section 3, and the seven mislabelled), 142 with the patches.
No case that was correct at HEAD turned wrong except the named px alias.

### Speed
Whole `grade()` call, best of 3, 5000-character adversarial bodies in every graded function of 6.10.4, .5, .8, .9, .10, 518 combinations
(36 triggers including `if (((((((`, `(a(b(c(d(`, `if (ball.overlaps(paddle`, `bricks.flat().filter(`, `continue; `, `let chosen = false; chosen = true; `, `if (lives > 0) { serve(); return; `, `const h = PADDLE_W / 2; `, with and without closers).
Shipped patterns: worst 29.8 ms. Patched patterns: worst 32 to 46 ms on a quiet run; one run read 93.6 ms at load average 47 and the same card re-measured alone (best of 5, per card, 6.10.5, same input)
was at most 11 ms. Nothing over 100 ms. Per-card on 6.10.4 r3 with the alias alternative: worst 9.7 ms. No lookbehind added; the only new nested quantifier is the head-bounded scan, whose alternatives are disjoint.

### Gates
Not run: no lesson file was edited and no pattern shipped. Before applying: `scripts/check-starters.mjs`, `scripts/audit-grader-tolerance.mjs --gate`, `scripts/test-grader-tolerance.mjs`, and add each
"must still pass" row above to the accept list and each closed cheat to the reject list. The 6.10 card texts for 6.10.8 ("test the ball's four edges") and 6.10.9 r1 do not need to change.

Decision for the owner: Fixes 1 to 7 close cheats that cost one line or one token and are siblings of shapes round 2 already closed; I would ship them. Fixes 8 to 10 only widen. Section 3 needs a `tests`
requirement through the moshion harness (the 6.10.9 serve, and the 6.10.5 code-in-the-wrong-function case) or a decision to keep the floor lax.
