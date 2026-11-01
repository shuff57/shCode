# 6.10 Breakout -- strong-student lens (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD 0cc01827. Labs 6.10.4, .5, .6, .8, .9, .10 and the 6.10.13 challenges.
Every lesson file untouched. Grading is `lib/grader.ts` through `gradeWithTests` (compiled with the repo's `tsc`, as
`scripts/test-grader-tolerance.mjs` does), each lab's own `lesson.json` requirements, no mocks.

**Verdict: NOT CLEAN.** Both halves.

- Gaming: every one of the six labs and the challenge card can reach full marks with no working code. The cheapest are
  one line each (below). Several are not the declared "computed-but-unused" class: the pieces are all there but not
  related to each other (the 2.2.20 shape).
- Punished elegance: 28 honest shapes (table in section 2; ternary flip, clamp then flip, a reversed comparison,
  a row alias, a brace-less one-liner) lose marks.

Ran 271 cases (about 140 gaming/semantic, about 130 honest). Baseline: all seven references full, all seven starters 0.
Ignored as instructed: lexer-level 6.9 leftovers, the deliberate swapped-edge pairing in 6.10.8.

---

## 1. GAMEABLE (cheapest first)

### 6.10.9 Win or lose -- 3/3 with no counting and no lives logic
r1 `bricksLeft`: `|\.filter\s*\(` is a bare second alternative of the whole pattern, so ANY `.filter(` passes r1.
```js
function bricksLeft() { return bricks.filter(row => row).length; }   // returns 5 (rows), not bricks
function checkEnd() {
  lives -= 1; if (lives === 0) {} state = 'lost'; serve();
  bricksLeft() === 0; state = 'won';
}
```
Scores 3/3. The game is lost on the first frame. Cause: r2 and r3 are three fragments each (decrement, comparison,
assignment) with no relation between them, and r2 never asks that `ball.y` be tested at all.

Separate exact breaks, each 3/3 with the rest of the reference:
- r1, the 2.2.20 break: `if (bricks[r][c] === 1) {}` then `n += 1;` after it. Counts all 40 cells, so the wall can never be cleared. Also `n++` after both loops.
- r2, guard deleted: remove the `if (ball.y > 400 + R)` wrapper, leaving `lives -= 1; if (lives === 0) state = 'lost'; else serve();` in `checkEnd`. A life per frame. 3/3.
- r3: `bricksLeft() === 0; state = 'won';` (or `if (bricksLeft() === 0) {}` then `state = 'won';`). Wins at once. 3/3.
- Not proposed (semantic swap): branches reversed, `if (lives > 0) state = 'lost'; else serve();` is 3/3.

### 6.10.8 Hit with the edges -- 2/2 with the hit result ignored
```js
function hitBricks() {
  hitAt(ball.x, ball.y - R); hitAt(ball.x, ball.y + R); vy = -vy;
  hitAt(ball.x - R, ball.y); hitAt(ball.x + R, ball.y); vx = -vx;
}
```
2/2. Both speeds flip every frame whether anything was hit. Cause: r1/r2 are four lookaheads over the whole function
(`ball.y - R`, `ball.y + R`, two `hitAt(`, a flip) with no `if`. This is not the declared pairing swap: here the flip is not
conditional on a hit at all. Also 2/2: the centre test kept (`if (hitAt(ball.x, ball.y)) { vy = -vy; vx = -vx; }`) with
`ball.y - R; ball.y + R; ball.x - R; ball.x + R; hitAt(); hitAt();` as bare statements (the declared unused-value class).

### 6.10.5 Bounce -- 6/6 on a ball that never bounces
```js
ball.x += vx; ball.y += vy;
if (ball.x < 1) vx = 0; if (ball.x > 399) vx = 0;
if (ball.y < 1) vy = 0;
ball.overlaps(paddle); vy > 0;
vx = ball.x - paddle.x;
if (ball.y > 0) serve();
```
6/6. Individual causes:
- r2/r3 accept `vx = 0` / `vy = 0` as a "flip" (`\bvx\s*=(?!=)\s*-?\s*\d` takes any digit). The ball sticks to the wall.
- r4: `ball.overlaps(paddle)` and `vy > 0` are two unrelated lookaheads; bare statements satisfy both.
- r6: the lost-ball threshold is not checked: `if (ball.y > 0) serve();` is accepted (serves every frame).
- r5: `vx = paddle.x - ball.x` (steers the wrong way) and `vx = ball.x - paddle.x` with no `/ 10` pass, and the line passes at the top level of `moveBall` (every frame, outside the paddle `if`).
- Walls at 1/399 or 12/388 instead of `R` pass r2 (any digit 1-12 in the condition counts). Same family as the declared "0 and 400" refusal, but one pixel off is accepted.

### 6.10.4 The paddle -- 3/3 with no key logic and a wrong clamp
```js
control === 'mouse'; paddle.x = mouse.x;
kb.pressing(); kb.pressing(); paddle.x -= 6; paddle.x += 6;
if (paddle.x < 1) paddle.x = 1; if (paddle.x > 1) paddle.x = 1;
```
3/3. (Separately: left key mapped to `+= 6` and right key to `-= 6`, the arrows reversed, is also 3/3; the key names are blanked and the key is not tied to its sign.)
- r2: the two `kb.` calls and the two `-=`/`+=` are independent whole-function lookaheads.
- r3: the limit is never read. `if (paddle.x < 0) paddle.x = 0; if (paddle.x > 400) paddle.x = 400;` is 3/3 (half the paddle off screen: the step says half its width). `if (paddle.x < 999) paddle.x = 1;` is 3/3.
- `paddle.x = constrain(mouse.x, 0, 999)` alone satisfies r1 and r3 for the mouse; keys are then never clamped. 3/3.

### 6.10.10 Pick a mode -- 3/3 with blank title and no key test
```js
// drawTop():  if (state === 'title') { text('', 0, 0); text('', 0, 0); }
// pickMode(): kb.presses('1'); kb.presses('2'); control = 'mouse'; control = 'keys'; state = 'play';
// startGame(): ...; kb.presses('r'); state = 'title';
```
3/3.
- r1: strings are blanked so the words are never read: empty strings, `'x'`, or `'Hello'/'Goodbye'` all pass. The step asks for the name and the two choices. This follows from `ignoreStrings: true` and cannot be fixed without reading strings.
- r2: key reads and the three assignments are separate lookaheads; `if (kb.presses('1')) {}` x2 then unconditional assignments passes. The student's title screen then never waits.
- r3: `kb.presses('r')` followed anywhere by `state = 'title'` (the full pair in `startGame()` is the declared honest shape, so an unconditional one in `draw()` also passes).

### 6.10.6 A wall from text -- 5/5 on two functions of fragments
makeBricks: `for (;;) break; for (;;) break; WALL[0][0] === '#'; b.push(1); b.push(0); b.push([]);` (r1+r2).
drawBricks: `for (;;) break; for (;;) break; bricks[0][0]; fill('red'); rect(0, 0, 1, 1); TOP + 1; 1 * BW; 1 * BH;` (r3+r4).
With an honest `hitBricks`, 5/5. This is the declared unused-fragment class; recorded because it is the whole of what the
labs measure for `makeBricks`/`drawBricks`. Not fixed by the proposals below (a link-based pattern still cannot tell an
empty `if` from a full one).
Smaller: r2 does not require the `#` test to feed the push: `row.push(true ? 1 : 0)` plus a stray `WALL[0][0] === '#'` is 5/5.

### 6.10.13 Challenges -- 2/2 for two tokens
`// if` on its own line at the top (r2 takes any comment with `if`/`would`/`without`/...) and `kb.presses('3');` as a bare
statement (r1 counts any fourth `kb.presses(`). Also `level++;` for an undeclared name, or `lives = 4;` inside a function
that is never called. By design lax ("a rule of your own"), recorded as the floor. A comment holding the answers, and a string holding them, each scored 1/2 (r1 failed): they cannot smuggle r1.

### Structural class (declared for 6.9, confirmed to carry over)
Dead code scores the same as live code: `return;` first line of `movePaddle` followed by the reference, an `if (false) {` or
`if (0) {` wrapper, and a decoy `function movePaddle(){ ...reference... }` placed before an empty real one (the first match
wins in `extractFunctionBody`, the last wins at run time). Each 3/3 on 6.10.4 and 6/6 on 6.10.5. Not re-reported.

---

## 2. PUNISHED ELEGANCE (honest, course-shaped answers refused)

Each is the reference with one function body swapped; failed requirement in brackets.

| Lab | Honest answer | Result |
| --- | --- | --- |
| 6.10.5 | `if (ball.x < R) { ball.x = R; vx = -vx; }` (and the same for the other walls, `ball.y = R; vy = -vy;`): pull the ball back in, then flip | 4/6 [r2, r3] |
| 6.10.5 | `vx = (ball.x < R \|\| ball.x > 400 - R) ? -vx : vx;` and `vy = ball.y < R ? -vy : vy;` | 4/6 [r2, r3] |
| 6.10.5 | `if (R > ball.y) vy = -vy;` (reversed, as 6.10.4 r3 accepts) | 5/6 [r3]; with both x walls reversed 4/6 [r2, r3] |
| 6.10.5 | `vx = (-vx)` / `vy = (-vy)` with clarifying parentheses | 4/6 [r2, r3] |
| 6.10.5 | walls moved into a helper `bounceWalls()` called from `moveBall` | 4/6 [r2, r3] |
| 6.10.5 | `if (400 + R < ball.y) serve();` | 5/6 [r6] |
| 6.10.5 | `if (ball.y > 400 + R) { paddle.x = 200; serve(); }` (anything before `serve()`) | 5/6 [r6] |
| 6.10.4 | clamp by ternary: `paddle.x = paddle.x < PADDLE_W / 2 ? PADDLE_W / 2 : paddle.x;` | 2/3 [r3] |
| 6.10.4 | mouse via a variable: `const target = mouse.x; paddle.x = target;` | 2/3 [r1] |
| 6.10.4 | `let dx = 0; if (kb.pressing('left')) dx = -6; ... paddle.x += dx;` | 2/3 [r2] |
| 6.10.4 | clamp moved to a helper `keepOnScreen()` | 2/3 [r3] |
| 6.10.6 | drawBricks with `const row = bricks[r];` then `row[c]` (6.10.9 r1 accepts this same alias) | 4/5 [r3] |
| 6.10.6 | drawBricks with `bricks.forEach((row, r) => row.forEach(...))` (forEach is taught in 3.7.19) | 4/5 [r3] |
| 6.10.6 | `vy = hitAt(ball.x, ball.y) ? -vy : vy;` | 4/5 [r5] |
| 6.10.6 | `hitAt(ball.x, ball.y) && (vy = -vy);` | 4/5 [r5] |
| 6.10.6 | `if (!hitAt(ball.x, ball.y)) return; vy = -vy;` | 4/5 [r5] |
| 6.10.6 | `if (hitAt(ball.x, ball.y)) { score += 1; vy = -vy; }` | 4/5 [r5] |
| 6.10.6 | `row.push(Number(WALL[r][c] === '#'))` | 4/5 [r2] |
| 6.10.8 | `vy = hitAt(a) \|\| hitAt(b) ? -vy : vy;` (both axes) | 0/2 [r1, r2] |
| 6.10.9 | `n = n + bricks[r][c];` (the spec accepts `lives = lives - 1`; `x = x + y` is the longhand) | 2/3 [r1] |
| 6.10.9 | `bricks.forEach(row => row.forEach(cell => { if (cell === 1) n++; }));` | 2/3 [r1] |
| 6.10.9 | a helper `loseBall()` holding the life/lost/serve logic, called from `checkEnd` (the card is scoped to `checkEnd`) | 2/3 [r2] |
| 6.10.10 | three one-line ifs `if (state === 'title') text(...)`, the style the reference uses for 'won' and 'lost' two lines below | 2/3 [r1] |
| 6.10.10 | title in a helper `drawTitle()`, or one `text('BREAKOUT: press 1 ... or 2 ...', ...)` | 2/3 [r1] |
| 6.10.10 | `control = kb.presses('1') ? 'mouse' : 'keys';`, or a helper `begin(mode)` setting `control = mode` | 2/3 [r2] |
| 6.10.13 | faster ball by `vx = 4; vy = -6;` in `serve()` (the card names "a faster ball") | 1/2 [r1] |
| 6.10.13 | `const R = 8;`, or a new wall shape (data only), or a separate `hits[r][c]` array | 1/2 [r1] |
| 6.10.13 | sentence `// Key 3 = one ball, not three.` (digits break the word run; "would" saves it) | 1/2 [r2] |

Root causes, in order of how many rows they explain:
1. Every `if (...) FLIP` card allows only `\)\s*\{?\s*` between the condition and the flip, so a statement before the
   flip, or any non-`if` shape for the same idea (ternary, `&&`, guard return), fails (6.10.5 r2/r3/r6, 6.10.6 r5).
2. The comparison lookaheads require `<` for the near wall and `>` for the far one with the variable on the left.
3. Alias and shape lists differ between sibling cards (6.10.9 r1 takes a row alias and `for...of`, 6.10.6 r3 takes only `bricks[..][..]` and `of bricks`).

---

## 3. Elegance half: what was tested and passed (so "none found" is not claimed)

Accepted correctly, graded: Allman braces; `==`; double quotes and backticks; no spaces at all (`if(control==='mouse'){...}`);
`paddle.x = paddle.x - 6`; `else if` chains; `switch (control)` with `constrain`; `max(..., min(...))`; `ball.d / 2` and `ball.pos.y`
as the radius/position; `abs` / `-abs` flips; `vx *= -1`; `vx = vx * (-1)`; fixed-speed `vx = 3` / `vx = -3` at walls; nested
`if (vy > 0)` inside the overlap; steering through an offset variable, `* 0.1`, either order; a position test instead of
`overlaps`; `ball.vel.x = vx`; the lost-ball test in `draw()`; `for...of` over `WALL` and its letters; `split('').map`;
`while` with `charAt`; `b[r] = []`; `switch` on the letter; `isBrick` helper variable; running `x`/`y` with `+= BW`; `BW * c`;
precomputed `x`, `y`; an alias `const hit = hitAt(...)`; `=== true`; point aliases and result aliases in 6.10.8; `6` for `R`;
no-space `ball.y-R`; `lives--`, `<= 0`, `!lives`; `lives > 0` first; guard-return and `const lost = ball.y > 400 + R`;
`const left = bricksLeft()`; `if (cell) n++`; `n += cell`; `flat().filter(...)`; `continue` on a gap; `while` counting;
`kb.presses(1)` numbers; `kb.pressed`; `prompt()`; the title in a `switch (state)`; `else if` with `drawTop` conditions; and
R handled in a separate `if`.
Not tested: optional chaining (nothing in these labs reads a possibly-missing value, so there was no honest place to put
it), `let` vs `const` beyond the aliases above (no card tests a declaration keyword), the AI-graded 6.10.1/.11, the 6.10.12
quiz, and the sketch actually running in a browser (semantic claims above are by reading the code, not by playing it).

---

## 4. Fixes -- every one run against the references, honest shapes and starters

Patterns are in `codehs-review/loop/breakout-advanced-patterns.json` (`{lab: {card: pattern}}`, ready to paste into
`lesson.json`; lab keys p=.4, b=.5, w=.6, e=.8, l=.9, m=.10). Built by editing the shipped patterns, not rewriting the
cards. Lab 6.10.13 is not changed. Harness and all 271 cases were in the scratchpad
(`.../scratchpad/bo/`: `lib.cjs`, `c45/c5/c68/c910/c13/cx.cjs`, `patch.cjs`); not in the repo.

Each tightening links fragments the card already requires (it adds no new vocabulary):

| Card | Tightened to require | Closes |
| --- | --- | --- |
| 6.10.9 r1 | the `+1` is first in the body of the brick `if`, or adds a non-numeric (`n += cell`, `n = n + bricks[r][c]`), or the loop uses `continue`; `.filter(` only on `bricks.flat()` or on a row/other receiver inside a `for` | `n += 1` after the `if`, bare `.filter(` |
| 6.10.9 r2 | a comparison with `ball.y` exists; `state = 'lost'` is in the body of an `if` testing `lives` or in its `else` | guard deleted, unlinked `state = 'lost'` |
| 6.10.9 r3 | `state = 'won'` in the body (or after statements in the braces) of an `if` whose condition is the `bricksLeft()` test, direct or by alias | unlinked win |
| 6.10.8 r1/r2 | the flip follows an `if` containing a `hitAt(` call (or an alias of one), or is a ternary on `hitAt(` | unconditional flips; also admits the ternary |
| 6.10.5 r2/r3 | flip after any statements in the braces; ternary; reversed comparison; `(-vx)`; fixed value `[1-9]` or `0.5`, not `0` | `vx = 0`, and the honest refusals above |
| 6.10.5 r4 | the overlap and `vy > 0` in the same `if` condition, nested `if`s in either order, or `vy = -4` style set inside the overlap `if` | bare statements |
| 6.10.5 r6 | `ball.y` against a number 360+ / `height`, any comparator side, statements before `serve()` | `ball.y > 0`; 3 honest refusals |
| 6.10.4 r2 | each `kb.` read in an `if` condition (or alias, or the ternary on the same line) followed by the matching `paddle.x` update | unlinked soup |
| 6.10.4 r3 | the limit mentions `PADDLE_W`, `paddle.w`, `/ 2`, a number 30-49 / 350-369, or a `half...` name; ternary clamp added | clamp at 0/400, nonsense constants |
| 6.10.6 r3 | adds a row alias `const row = bricks[r];` and `bricks.forEach(`; `forEach` counts as a loop | 2 honest refusals |
| 6.10.6 r5 | flip after other statements; ternary on `hitAt`; `hitAt(..) && (vy = ..)`; guard return | 4 honest refusals |
| 6.10.10 r1 | adds two brace-less `if (state === 'title') text(...)` lines | 1 honest refusal |
| 6.10.10 r2 | at least two key reads in an `if` condition, a ternary or an alias (or a `prompt(`) | unconditional pickMode |

Results with all of them applied (run, not estimated):

- Must still pass, each lab's own `solution.js`: 6.10.4 3/3, .5 6/6, .6 5/5, .8 2/2, .9 3/3, .10 3/3.
- Must still be 0: each starter, 0/3, 0/6, 0/5, 0/2, 0/3, 0/3.
- Honest, differently-shaped answers: all of section 3's accepted list still pass (0 newly refused of about 130 honest cases);
  20 earlier honest refusals are now accepted: ten in 6.10.5 (clamp then flip in two shapes, ternary, two reversed forms, `(-vx)`, three
  `serve()` blocks), two ternary clamps in 6.10.4, six in 6.10.6 (row alias, forEach, ternary, `&&`, guard return, a statement
  before the flip), the 6.10.8 ternary, and the 6.10.10 brace-less one-liners.
  Still refused (not fixed, no pattern change worth the risk): `dx` helper (6.10.4 r2), alias `mouse.x` (r1), the helper-function
  rows in 6.10.4/.5/.9/.10, `Number(...)` push, the 6.10.13 rows, and two 6.10.9 r1 shapes: `n = n + bricks[r][c]` and the `forEach` count. The
  new link lookahead admits both but the shipped brick-test lookahead underneath still does not; widening that
  alternative was not run, so it is not proposed.
- Cheapest breaks after the change: 6.10.9 0/3, 6.10.8 0/2, 6.10.5 soup 2/6, 6.10.4 soup 1/3, 6.10.10 2/3 (r1 words remain
  ungradable). **Still full marks**: 6.10.6 soup (5/5), 6.10.13 (2/2), the `if (kb.presses('1')) {}` empty-block soup in
  .10, and the empty-`if` variants of everything: a regex cannot tell `{}` from a body that works, and only a `tests`
  requirement would. A `tests` case through `scripts/moshion-harness.mjs` for 6.10.9 `bricksLeft`/`checkEnd` (set `bricks`, call, compare)
  would close it; not built or measured here.
- Cost: worst case on a 6000-character adversarial body (`if (ball.y > 400 ` x500 in `moveBall`) went from 14 ms to 236 ms
  (6.10.5 r2/r3/r6 and r4); the spec's measured worst was 32 ms. The first draft of 6.10.9 r2 cost 340 ms and was
  reordered to 3 ms. Acceptable for a button press; flagged because the spec records speed as a checked property.

Decision for the owner: PLACEMENT/lax-grading policy (`feedback_pseudocode-grading-lax`) says accept any phrasing of a
correct idea. These changes do that (they accept 16 more honest shapes) and tighten only where a pattern accepts text that
is unrelated to the idea. The lax reading on its own would leave 6.10.9 and 6.10.8 where an empty `if` or an unconditional
flip scores full.

---

## 5. Held (tried, not broken)

Comments and strings holding the answers: re-tried only on 6.10.13 (1/2 each). The spec's 74 cases cover them on the
labs and the lexer is out of scope, so they were not re-run. Starters score 0 on every lab. The reference with `const`/`let`/`var` changed, quotes changed, spaces removed,
`==` for `===` all stay full. The two-hit, wall-list, third-mode challenge answers from the reference all score 2/2 on
6.10.13, as do `PADDLE_W = 60`, `lives = 5`, `score += 5`, `vy = -vy * 1.05`, `vy *= 1.05`, `bricks[r][c]--`,
`kb.pressed('3')`.
