# cs-student-moderate lens: Breakout 6.10 (13 lessons)

Session `b610mod`, cookie `dev_student=b610mod`, dev server :3002 (DEV_ROLE=student), lock ON (6.10.10 opened "Lesson locked, 0 of 13" until
the 6.10 lessons were marked complete through `/api/lesson-state`). Browser session closed at the end. No lesson file edited; only this file written.

Method: the grader is `gradeWithTests` from `lib/run-tests-node.ts`, bundled with esbuild from the working tree. About 150 shapes, each made by
splicing one function body into the lab's `solution.js`, so only the card under test can move. Baseline: every starter red, every reference green
(6.10.4 3/3, .5 6/6, .6 5/5, .8 2/2, .9 3/3, .10 3/3, .13 2/2). Browser: the real editor, Run, Quest panel, and a real run of the game.
Citations: `check-lesson-citations` says "838 lessons, every cited lesson number resolves" (the 2 FORWARD notes are 1.4.9 and 6.4.4, not here).

Verdict: **GAP LIST** (1 real gameplay defect that no lesson models a fix for, 1 grader vs the course's own model, 2 small reference defects).

## Gaps, most important first

### G1. 6.10.5 / 6.10.2 / 6.10.3: the wall flip, taught without the guard the paddle flip got, glues the ball to a side wall (reproduced in the browser)
The pieces are all taught and they do not compose. 6.10.2 spends a whole section on why the paddle bounce is `ball.overlaps(paddle) && vy > 0`
("flipping `vy` on every one of them sends the ball up, down, up: it shivers"). The wall flip written two sections earlier, and shown in 6.10.3,
6.10.5 step 2 and every solution, has no such guard:

```js
if (ball.x < R || ball.x > 400 - R) vx = -vx;      // 6.10.2, 6.10.3, 6.10.5 s2
...
vx = (ball.x - paddle.x) / 10;                      // 6.10.2 steer line, runs AFTER the wall test
```

Order in `moveBall`: move, wall flip, paddle bounce and steer. When the ball lands on the paddle on a frame where `ball.x < R` (it has just touched
the left wall and is dropping onto the left end of the paddle), the steer line sets `vx` from `ball.x - paddle.x`. The paddle's x can never be below 40
(6.10.4 s3), so for any `ball.x < 6` that is negative: the ball is sent INTO the wall. Next frame x is still under `R`, the wall test flips it, the
frame after it flips again, and `ball.x` shivers between about 1.5 and 5 for as long as it likes. Every later paddle hit re-steers it into the wall
(`(3 - 40) / 10`), so the player cannot get out; only missing the ball (losing a life) frees it.

Evidence:
- Browser, reference 6.10.10 game with the first serve set to x 11, y 352, `vx -3`, `vy 4` and the paddle held at x 40: at frame 258 the readout is
  `x 5  vx -3.5  y 240`, at frame 399 `x 1.5  vx 3.5  y 188`, at frame 1686 (28 s) `x 5  vx -3.5  y 144`: still glued, half the ball off the canvas,
  eating the left column of bricks on the way (score 20 to 40). `-3.5` is exactly `(5 - 40) / 10`.
- Headless copy of the reference physics with a paddle that tracks the ball with noise: 4% of games stuck at noise 5, 12% at noise 10, 23% at noise 20,
  43% at noise 40, per 20,000 frames. Median 50 to 70 paddle bounces before it happens, so a long game of 36 bricks can reach it.
- With the direction guard the same simulation gives 0 stuck in 1600 games:
  `if ((ball.x < R && vx < 0) || (ball.x > 400 - R && vx > 0)) vx = -vx;`. The 6.10.5 grader accepts that shape (6/6, both the one-line and the
  two-line form), so the fix is not blocked by r2.

Why it matters for transfer: 6.10.11 tells the student to hunt for "a ball that shivers along the paddle"; this is the version they will actually
find, and nothing in the course shows the fix. The principle exists (6.10.2, paddle), it just was not applied to the walls, so the student cannot
copy it across.
Bridge: write the wall tests with the same `&& vx < 0` / `&& vx > 0` guard in 6.10.2, 6.10.3 and 6.10.5 s2 (and the one-sentence reason), or put the
steer before the wall test. One sentence in 6.10.2's "Off the paddle, only while coming down" section would do.

### G2. 6.10.5 r6 refuses the lost-ball code that 6.10.3, the card's own Help target, models
r6 says "Help: 6.10.3 (Worked Example: A ball in a box)". 6.10.3's lost-ball block is written inline and has no `serve()`:

```js
if (ball.y > 400 + R) {
  ball.x = 200;
  ball.y = 300;
  vx = 3;
  vy = -4;
}
```

Pasted into `moveBall()` in place of step 4's line, the browser Quest panel reads **5/6**: "A lost ball is served again: Not yet". Confirmed on the app's
grader bundle too. The r6 pattern wants the first statement after `{` to be `serve()` or `ball.y =`; 6.10.3 starts with `ball.x =`.
`ball.y = 300;` first (then x, vx, vy) is green. The step does say "call `serve()`" and gives the hint `if (ball.y > 400 + R) serve();`, so a student who
reads the step recovers; but a student who copies from the worked example the card points to is refused, and 6.10.2 is the only place `serve()` is
described, with no code (6.10.3 has no `serve()` function at all).
Bridge, either: allow any of `ball.x =`, `ball.y =` after the `{` (the 6.10.3 order), or make 6.10.3 call a `serve()` it defines. Related, smaller: the
check is limited to `moveBall` and `draw`, so the same `serve()` call moved into a helper is red (the module's own 6.10.9 does exactly that with
`checkEnd()`); red but explained by the step.

### G3. 6.10.6 s3 hint cites a promise 6.9.11 never made
6.10.6 step 3, hint 1: "This is the call 6.9.11 promised: the ball asks the same `hitAt` your mouse clicks used."
Nothing in 6.9.11 (steps, hints, starter, solution) or in 6.9.9 or 6.9.12 mentions a ball or Breakout (grep of `6-9-grids-*`: 0 hits).
BREAKOUT-SPEC section 11, decision 7, says the 6.9.11 hint "This is the function a Breakout ball will call later through `hitAt(ball.x, ball.y)`
now lands"; that hint is not in the file (the six 6.9.11 hints read: makeGrid-shaped loops, `b.push(row)`, the bounds test, the three lines, the
count loops, `drawTop()`). The backward reference has drifted. Harmless to play (the sentence still reads true), but it names a source that does
not say it. Bridge: drop "promised" ("the same `hitAt` your mouse clicks used in 6.9.11") or put the sentence back in 6.9.11.

### G4. 6.10.2 argues against physics with a claim 5.2.11 contradicts
6.10.2: "Why not let physics bounce it, with the `bounciness` of 5.2.11? A physics bounce can lose a little speed and pick up some spin, and Breakout
wants the same speed every time."
5.2.11 (Reading: Bounciness and Friction): "`.bounciness` ... from 0 (sticks) to 1 (bounces at full speed)". A student who reuses 5.2.11 sets
`ball.bounciness = 1` and has, by the course's own model, a bounce at full speed. The honest reasons (the bricks are data, not sprites; the steer line
needs the ball's x relative to the paddle; `collider = 'none'` as in 5.9.5) are all in the same reading, but the one given first is the weak one.
Low. Bridge: lead with "the bricks will not be sprites, so there is nothing for a physics ball to bounce off", and drop or soften the speed claim.

## Transfer that carried (how far the example had to travel)
- 6.10.4 from 5.9.2 (Defender's ship): `if (kb.pressing('left')) ship.x -= 5;` and the `if (ship.x < 20) ship.x = 20;` clamp are the same shapes; the
  edit is the constants and the extra `control` test. One-word edits. 14 mutations all green except two that are red for good reason: the 6.3.3
  kinematic form `paddle.vel.x = -6` (it would not move a `'static'` sprite; 6.3.3 models `vel.x` on a kinematic sprite, so this is the only
  trap in the seam, and the step spells out `paddle.x -= 6` right beside it) and a ternary key move.
- 6.10.5 from 6.10.3 and 5.9.5: moves, walls, paddle `overlaps` + `vy > 0`, steer. 25 shapes green, including separate wall ifs, `abs()`, `width`,
  `ball.d / 2`, literals 6/394, `*= -1`, nested `vy > 0`, `paddle.overlaps(ball)`, `-abs(vy)`, `* 0.1`, `map(...)`, `ball.vel.x = vx`.
  Red as the reading says: `colliding()` (5.3.5; 5.9.5 explains why), walls tested against 0 and 400.
- 6.10.6 from 6.9.5/6.9.10/6.9.11: `WALL[r][c] === '#'` then push 1 or 0, the `drawBricks` loops, `hitAt` (given, with the 6.9.5 bounds guard). 12 `makeBricks` shapes
  (ternary, else-first, `while`, `charAt`, `for...of`, `b.push([])`, `b[r][c] =`) and 7 `drawBricks` shapes green. Red: a loop-free
  `WALL.map(...).map(...)` (r1 insists on a `for`/`while`) and `Number(WALL[r][c] === '#')` (r2); neither is modelled anywhere in 6.9, so not a gap.
- 6.10.8: the 6.9.5 bounds guard inside `hitAt` is what makes `hitAt(ball.x - R, ball.y)` safe at `x < R` (c = -1) and above the wall (r < 0): an
  earlier lesson doing exactly the job it was written for. 11 of 13 shapes green (separate ifs, temps, `ball.d / 2`, literal 6, flags, order
  swapped, parentheses). Red: `ball.top/.bottom/.left/.right`, a helper `hitEdge(dx, dy)`, vertical edges only.
- 6.10.9: `bricksLeft` 6 of 7 (`n++`, `n += cell`, `for...of`, `.flat().filter`, `while`, constants; red: `reduce`), `checkEnd` 8 of 9 (`lives--`, `<= 0`,
  `> 0` first, serve-then-check, `< 1`, a `const left`, else-if, `height`; red: score `=== 360` for the win, correctly, and a helper `loseLife()`).
- 6.10.10: pickMode shapes 8/8 (`pressed`, numeric `kb.presses(1)` which really works at runtime, else-if, order, `prompt`, one `state = 'play'`
  after both keys). R: `state = 'title'` before or after `startGame()`, inside `startGame()`, `pressed`, `'R'`: all green. Title: `switch (state)` (the
  6.6.11 shape), `==`, text in `draw()`: green. Red: a helper `drawTitle()` and a one-line title (one `text(` only).
- 6.10.13: any of the three challenges turns r1 green; the starter alone is red; `WALLS[0][0].length` is the two-level index of 6.9.5 (`levels[1][3][2]`).
- Browser checks that came out as the text says: key `'1'` starts the game; `prompt()` runs in the sketch (sandbox has `allow-modals`);
  the 6.10.7 live sketch (centre test: `bricks hit: 0`, edges: the brick on the left breaks and `bricks hit: 1`); 6.10.10 reference shows 3/3 with
  Submit enabled.

## Seams (could a student who finished the lesson start the next one without new instruction?)
Every starter is the previous reference plus a named delta; diffs checked: 6.10.4 to .5 (ball, `serve`, empty `moveBall`), .5 to .6 (WALL, `hitAt`,
three empty functions), .6 to .8 (identical: the starter IS the solution, with the centre test), .8 to .9 (`lives`, `state`, `bricksLeft`, `checkEnd`,
the lost-ball line moves out of `moveBall`), .9 to .10 (`'title'`, empty `pickMode`). All names carry. Yes at every seam, with G2 as the one place a
student's reading of the previous lesson's model disagrees with the card.
- 6.10.7 to 6.10.8 is the only large conceptual step (a second `hitAt` per edge, `||`, flip by which edge); it is taught, with a live demo and a table,
  and the reference carries. Good seam.
- Prose citations resolved by hand: 6.10.2 "The next screen" is 6.10.3; 6.10.3 "the last reading" is 6.10.2; 6.10.4 "The last lab of this module lets
  the player choose" is 6.10.10 (6.10.13 is titled Challenges); 6.10.6 "The next reading is about why" is 6.10.7; 6.10.7 "In 6.10.6 the ball asked",
  "the same `hitAt` as before", "the canvas walls in 6.10.5"; 6.10.8 "the game from 6.10.6, finished" (6.10.7 is a reading); 6.10.9 "from 6.10.8";
  6.10.10 "from 6.10.9"; 6.10.11 "from 6.10.10". All point at what they claim. Titled citations: 6.8.8 (Vector from A to B), 6.9.9 (`&&` stops at the
  first false), 6.9.5, 6.6.7, 6.6.11, 6.6.16, 6.6.17, 3.1.9 (`Number(prompt(...))`), 5.1.6, 5.1.13, 6.3.3, 6.7.3, 5.9.5 (`overlaps` is level-triggered, `collider = 'none'`),
  5.1.16 (positive `vel.y` is down) all resolve and say what is claimed.
- Quiz 6.10.12: eight questions, every `source` ("6.10.2", "6.10.3", "6.10.7", "6.10.10") resolves to a real lesson; every answer is taught on that lesson.
- Not exercised by this module at all: 6.5 storage (no best score is kept) and 6.1 groups (the bricks are data, by design, so no `Group`), so
  there was nothing to transfer from them and nothing to break. 5.2 physics is the road deliberately not taken (G4).
- AI-graded 6.10.1 and 6.10.11: not run (grader absent in dev). Both rubrics are written "very generous", consistent with the lax rule.

## Smaller notes (not gaps)
- 6.10.4 r3 accepts a clamp inside the mouse branch only (`paddle.x = constrain(mouse.x, 40, 360)` with the keys unclamped): lax by design.
- 6.10.8 and 6.10.9: the hint text and the readings agree with the references; no step asks for anything untaught.
