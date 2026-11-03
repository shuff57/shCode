# cs-student-moderate lens, round 2: Breakout 6.10 (13 lessons)

Commit under test: 59d61d25 (breakout lens round 1). Session `b610r2`, cookie `dev_student=b610mod2`, dev server :3002 (DEV_ROLE=student). Lessons 1-9 marked complete through
`/api/lesson-state` to open 6.10.10 (lock ON); all rows deleted afterwards and the browser session closed. No lesson file edited; only this file written.

Method: the grader is `gradeWithTests` from `lib/run-tests-node.ts` (built with tsc, same as `scripts/audit-grader-tolerance.mjs`), fed a lab's `solution.js` with one
function body swapped for a shape the course itself modelled earlier (6.9 grids, 5.9 Defender, 6.3, 6.6, 6.10.3). About 60 shapes. Browser: the real editor and a real run.

## Verdict: CLEAN (no blocking gap; one low consistency note and two informational notes)

### Round 1 findings, re-checked

- G1 (ball glued to a side wall): FIXED, and played.
  - Browser, 6.10.10 reference with the first serve set to x 11, y 352, `vx -3`, `vy 4` and the paddle held at x 40 (the exact scenario that glued at x 1.5 to 5 in round 1).
    Run in the real editor, keys mode, canvas clicked: samples every 0.7 s read `x 134.5`, `281.5`, `36.5`, `187`, `54`, `79`, `202`, `12`, `162`, `85`, with `vx` flipping between 3.5 and -3.5. The ball
    leaves the wall at once (`(5 - 40) / 10 = -3.5` is flipped back by the guarded wall on the next frame) and plays on. No frozen `x`.
  - Headless copy of the guarded physics, noisy tracking paddle (noise 5/10/20/40, 20,000 frames, 2,000 games): 0 stuck (round 1 reported 4% to 43%).
  - The guard is now taught where the paddle guard is: 6.10.2 (code block plus the sentence in "Off the paddle, only while coming down"), 6.10.3 live block, 6.10.5 step 2 (with the reason and a pointer
    to step 3's `vy > 0`), and every solution from 6.10.5 to 6.10.13. The pieces compose and the example carries: the edit from the paddle's `vy > 0` to the wall's `vx < 0` is one clause.
- G2 (6.10.5 r6 refusing 6.10.3's inline lost-ball block): FIXED. 6.10.3's block pasted into `moveBall()` grades 6/6.
- G3 (6.10.6 hint citing a promise 6.9.11 never made): FIXED. Hint now reads "the same `hitAt` your mouse clicks used in 6.9.11", which is true (6.9.11 s2: `hitAt` is called from `mouse.presses()`).
- G4 (6.10.2 arguing against `bounciness` with a claim 5.2.11 contradicts): FIXED. The reading now leads with "the bricks will not be sprites at all: they are data (6.9.9), so there would be nothing for a physics ball
  to bounce off", and drops the speed claim.

## Transfer that carried (round 2 adaptations, distance travelled)

- 6.10.4 from 5.9.4 (Defender): the literal clamp `if (ship.x < 20) ship.x = 20;` becomes `if (paddle.x < 40) paddle.x = 40;` / `> 360`: two number edits, 3/3. Also green: `== `, `else if`, `paddle.x = paddle.x - 6`,
  double quotes, other key names, ternary clamp, `constrain`, `max(min())`, `paddle.w / 2`, `width`. Red, as the step spells out: the 6.3.3 kinematic `paddle.vel.x = -6` (r2; the step shows `paddle.x -= 6` beside it) and a
  Defender-shaped paddle with no `control` test at all (r1; the step asks for "when `control` is `'mouse'`").
- 6.10.5 walls from the pre-guard model (`if (ball.x < R) vx = -vx;`): still green, 6/6. Also green: both walls in one `||` if, nested `if (vx < 0)`, `abs(vx)`/`-abs(vx)`.
- 6.10.9 from 6.6.7/6.6.17: `lives = lives - 1`, `<= 0`, `if (lives > 0) serve(); else state = 'lost'`, serve then check, `!bricksLeft()`, `bricksLeft() < 1`, double quotes, `forEach` (3.7.19) and
  `flat().filter` for `bricksLeft`: all 3/3.
- 6.10.13 from 6.9.8 and 6.9.14: the 6.9.8 next-level shape (`wallNum += 1; if (wallNum === WALLS.length) state = 'won'; else { bricks = makeBricks(); serve(); }`, `WALLS[wallNum][r][c]`) grades 2/2 with
  a sentence; a 6.9.14-style two-hit (`bricks[r][c] -= 1;`) grades 2/2; a bare "Bricks take two hits." (four words) grades 2/2. Both pointers resolve: 6.9.14 does teach two-hit bricks with the same
  three `=== 1` to `> 0` edits, and 6.9.8 loads the next level.
- 6.10.6 (6.9.10/6.9.11 shapes) and 6.10.8: unchanged since round 1, not re-walked.

## Notes (none blocking)

### N1. Low: 6.10.9 r2 refuses the inline lost-ball reset that 6.10.3 models, the family G2 closed in 6.10.5
In `checkEnd()`, `else { ball.x = 200; ball.y = 300; vx = 3; vy = -4; }` in place of `else serve();` grades 2/3 (r2 red). 6.10.5 r6 was widened to accept exactly this block; 6.10.9 r2 was not.
The step does say "otherwise `serve()` again" and the starter has `serve()`, so a student reading the step recovers, and the card text says "served again". Bridge, only if you want the two cards to agree:
let r2's else-branch also take a `ball.x =` / `ball.y =` assignment. Not a transfer break: nothing in 6.10.9 points the student at 6.10.3's block (its Help is 6.6.7).

### N2. Informational: the wall guard is taught but not graded
6.10.5 r2 still passes the unguarded wall tests (6/6), so a student who writes `if (ball.x < R) vx = -vx;` from memory of the old shape gets green and a game that can still glue. The card description says the
direction test "keeps it from sticking", and step 2 explains it, so this is the lax-by-design rule, not a defect. Same for 6.10.13: a wall rule with no direction test turns nothing red.

### N3. Informational: 6.10.2 shows the steer line before explaining it
The reading's code block gives `vx = (ball.x - paddle.x) / 10;` and the new wall-guard sentence refers to the paddle "steering a ball back toward a wall", two paragraphs before "The paddle steers" explains the
line. It reads fine on a second pass and the 6.10.3 live sketch follows at once; no student task depends on it.

## Backward and forward references (both citation forms)

- `check-lesson-citations`: "838 lessons, every cited lesson number resolves" (the 2 FORWARD notes are 1.4.9 and 6.4.4, not in this module).
- Citations added by round 1, resolved by hand to the displayed title (folder numbers drift from displayed ones in 6.6: folder `6-6-16-*` is titled 6.6.17, `6-6-15-*` is 6.6.16): 6.6.17 Condition-Driven
  Transitions, 6.6.16 Keyboard-Driven State Changes, 6.6.11 Title Screen with Start Button, 6.6.7 The state Variable, 6.3.3 Input edges, 5.1.13 kb.pressing(key), 5.9.5, 5.1.6, 5.2.11, 3.1.9, 6.9.8, 6.9.9,
  6.9.10 (`drawGrid`, `makeGrid` exist), 6.9.11 (`hitAt`, `makeBricks`, `bricksLeft` exist), 6.9.14. All say what is claimed.
- Prose forward pointers: 6.10.2 "The next screen" is 6.10.3; 6.10.4 "The last lab of this module" is 6.10.10; 6.10.5 s2 "the same idea as the paddle's `vy > 0` in step 3" is step 3 of the same lab; 6.10.6
  "The next reading" is 6.10.7. All land.
- Quiz 6.10.12 `source` strings (6.10.2, 6.10.3, 6.10.7, 6.10.10) resolve; the eight answers are still taught on those lessons after the edits.
- "Click the canvas so the sketch hears your keys (5.1.13)": confirmed live. A key press sent before a click did nothing (`state` stayed `title`); after a click, `2` started play.
