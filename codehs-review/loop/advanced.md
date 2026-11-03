# Advanced lens (shortest passing answer), modules 5.2 to 5.5

Run 2026-10-30, branch codehs-inspiration. Method: every graded lab in 5.2 (incl. the 5.2.1-5.2.4 opener), 5.3 Pinball, 5.4 Flappy, 5.5 Snake was run through the real grader (`gradeWithTests` via `lib/run-tests-node.ts`) with ~130 candidate answers: cheap, elegant, taught-but-differently-shaped. Browser confirmation (playwright-cli session `lens-advanced`, cookie dev_student=advanced) on three of them. The AI-graded plan/playtest screens were not attacked (lax by design).

Gates: `node scripts/check-starters.mjs` is green (258 graded lessons: every reference full, every starter below full).
BUT two starters already pass one requirement: 5.4.6 r2 and 5.4.8 r1 (below).

Elegance half, run as named tests (not asserted): see the REFUSES tables. 24 correct or taught answers were refused.

---------------------------------------------------------------------
## 5.2 Physics Feel (5.2.1-5.2.20)

GAMEABLE
- 5.2.4 Lab: A beat and a one-shot (5-2-random-4), STEP 1. 5/5 with the beat doing nothing.
  Minimum input (starter plus):
      if (frameCount % 30 === 0) { }
      on = !on;
  The lamp flips on EVERY frame, the opposite of a beat. Scores 5/5 once the STEP 3 repair and the one-shot are added.
  Cause: r2 is `frameCount % N === 0 ) {? [\s\S]{0,160}? on = !on`, the 160-char window walks out of the empty block. r1 is satisfied by an empty body.
  Tighten r2 so the flip is inside the beat's block (or brace-less on the same statement):
      frameCount\s*%\s*\d+\s*\)?\s*===?\s*0\s*\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?FLIP|\{\s*if\s*\([^)]*\)\s*\{?[^{}]*?FLIP|[^{};]*?FLIP)
      FLIP = \bon\s*=\s*\(?\s*(?:!\s*\(?\s*on|true|false)
  Tested standalone: PASSES the reference, `if (...) on = !on;`, `{ if (on) { on = false; } else { on = true; } }`, `{ if (on) on = false; else on = true; }`, a console.log before the flip. FAILS `{ }` then `on = !on;` and `{ foo(); }` then `on = !on;`.
- 5.2.3 Lab: A random spot and colour (5-2-random-3), STEP 1-3. 5/5 with everything OUTSIDE the once-a-second block (coin teleports every frame). Same cause as above: no r requires the random calls to sit inside `frameCount % 60 === 0`. Low priority (owner wants regex labs lax), but it is the same "beat" concept 5.2.4 teaches.
- 5.2.3 r4, STEP 3 ("using the list's length"): `const n = 3; const pick = floor(random(n)); coin.color = colors[pick];` passes r4 (any identifier in `random(ident)`), so the `.length` point is not measured. Low.
- 5.2.16 Lab: Reaching the Goal (5-2-11), STEP 1. 4/4 with no proximity test:
      if (goal) { Math.sqrt(1); goal.delete(); goal = null; }
  The goal vanishes on frame 1. r2 matches `Math.sqrt(` anywhere, and nothing ties the distance to the delete. Medium: the lab's point is "delete when close".
  Must still pass: reference; `if (goal && dist(player.x, player.y, goal.x, goal.y) < 25) {...}` (see REFUSES); `player.distanceTo(goal)` form.
- 5.2.20 Challenges (5-2-15): 4/4 for four lines of nothing: `new Canvas(400,400); new Sprite();new Sprite();new Sprite(); let i=0; i++; console.log('All goals collected!');`. Starter is empty, r4 is a bare literal print. Optional lab, low stakes, but it is "hardcode the expected output" verbatim.
- 5.2.12 Bouncy Ball (moshion-bounce): 4/4 for `ball.bounciness = 0; ball.friction = 100;` plus two static sprites and no gravity. Steps 1 (gravity), 2 (four walls, r1 wants two), 6 (kick) and 7 (background) are never measured, and the values are not read, so a sticky ball passes "Make it bouncy".
- 5.2.14 Lab: Wind Zone (5-2-9) r2: `if (player.y < 200) { player.applyForce(0, 3); }` (downward, the wrong way) passes; the step says negative y. Low.

MISSING MEASUREMENT
- 5.2.8 Lab: Tune Gravity (5-2-3): requirements [], totalPoints 0. Nothing is graded and nothing records that the student ran it. Probably intended (discuss with a partner). Noted only.

REFUSES (elegance / taught-but-refused)
| Lesson, req | Refused answer | Taught where |
| --- | --- | --- |
| 5.2.3 r4 | `floor(random(0, colors.length))` (two-argument form) | 5.2.1 teaches `random(min, max)` and "floor(random(low, high + 1))" |
| 5.2.3 r3 | `floor(random(1, 6 + 1))` (the reading's own "high + 1" rule written out) | 5.2.1 line 45 |
| 5.2.16 r1 | `if (goal && player.distanceTo(goal) < 25) {...}` (the guard folded into one condition; r1 needs `if (goal)` alone, and the starter comment itself offers distanceTo) | 5.2.15, starter STEP 1 |
| 5.2.4 r1/r2 | `!(frameCount % 30)` | not taught, ignore |
Not tested and so NOT "none found": semicolon-free style on 5.2.x labs.

---------------------------------------------------------------------
## 5.3 Pinball

GAMEABLE
- 5.3.4 Lab: Build the table (5-3-pinball-3), STEP 1. `world.gravity.y = 0;` (and `-10`) passes r1: "turn gravity on" accepts gravity off. 5.2.18 r1 already has the non-zero rule (`-?(?:[1-9]|0?\.\d*[1-9])`); copy it.
  Must still pass: the reference (`= 10`), `= 0.5`, `= -10`.
- 5.3.7 Lab: Score one point per touch (5-3-pinball-6), r1-r3. 3/3 for a lookalike that does nothing:
      const t = ball.colliding(goal);
      if (t && !x) { score += 1; }
      touching = x;
  (`x` never defined; score races exactly like the starter.) r2 and r3 match shape, not meaning.
- 5.3.10 Lab: Lose, and start again (5-3-pinball-9), STEPS 1-3. 3/3 with the flag declared and never read:
      let a = true;  if (ball.y > 400) a = false;   ... and score = 0 inside kb.presses('r')
  No "Game over" screen, no `if (playing)`. The flag is the lab's concept and nothing uses it. Add r4: the flag is read.
      \bif\s*\(\s*!?\s*playing\s*\)|\bplaying\s*(?:\?|&&)|&&\s*!?playing\b      (name `playing` is given in the step text)
  Tested: passes the reference, fails the "unused flag" attempt and the starter.
- 5.3.12 Challenges (5-3-pinball-10): see "Pick one" blocker below.

BLOCKING FOR AN HONEST STUDENT (the REFUSES list, all verified in the real grader)
| Lesson, req | Refused, correct answer | Taught where |
| --- | --- | --- |
| 5.3.7 r2 | `if (touching && !wasTouching) score += 1;` (brace-less) | 5.3.5 reading line 78 and 5.3.6 example line 75 teach exactly this line. Browser confirmed: 2/3, "Still needed (1)". |
| 5.3.7 r2 | `if (!wasTouching && touching) {...}` , `wasTouching === false` | same |
| 5.3.7 r3 | memory variable named anything but `...touching...`: `last`, `prev`, `touchedLast`, `wasHit` | step 2 says "a variable that remembers" and never names it; the r3 description is name-agnostic |
| 5.3.7 r3, 5.3.8 r2, 5.3.10 r1 | no-semicolon style (`wasTouching = touching` newline) | r3/r2/r1 all need a trailing `;` |
| 5.3.7 r2, 5.3.8 r3 | `score = score + 1`, `score = score + b.worth` | assignment form from unit 1/2; 5.3.7 r2 accepts `+=`/`++` only |
| 5.3.10 r2 | `if (ball.y >= 400)` ; `ball.y > height` ; `400 < ball.y` | 5.3.9 reading uses `>`; `>=` is the natural second form |
| 5.3.10 r3 | `kb.presses("r")` (double quotes) | course quotes are single, but r3 is the only quote-sensitive requirement in the module |
| 5.3.4 r2, r4 | `"static"` in double quotes | same |
| 5.3.4 r4 | `goal = new Sprite(...); goal.collider = 'static';` | not shown in the lesson, borderline |
| 5.3.8 r1 | indexed `for (let i...)` and `forEach` | 5.4.6 teaches the indexed loop; `forEach` not taught |
Proposed replacements, each run against that lesson's own solution.js and starter (starter must stay 0):
- 5.3.7 r2: `if\s*\(\s*(?:\w+\s*&&\s*!\s*\w+|!\s*\w+\s*&&\s*\w+|\w+\s*&&\s*\w+\s*===?\s*false)\s*\)\s*\{?[\s\S]{0,80}?score\s*(?:\+=|\+\+|=\s*score\s*\+)`
    reference true, starter false, brace-less true, swapped true, `=== false` true, "touching alone races" false.
- 5.3.7 r3: `(?:const|let)\s+(\w+)\s*=\s*ball\.colliding\s*\(\s*goal\s*\)[\s\S]*?\b\w+\s*=\s*\1\b\s*;?`
    reference true, starter false, `hit/last` true, no-semicolon true, "assigns undefined x" false. (Ties memory to r1's variable.)
- 5.3.10 r2: `(?:ball\.y\s*>=?\s*(?:\d+|height)|(?:\d+|height)\s*<=?\s*ball\.y)[\s\S]{0,80}?\w+\s*=\s*false` (drop `height` if it is not taught).
- 5.3.12 and 5.3.10 r1: `(?<![\w.])\w+\s*=\s*true\b` (no trailing `;`).

---------------------------------------------------------------------
## 5.4 Flappy

GAMEABLE
- 5.4.8 Lab: Crash, and start again (5-4-flappy-7), STEPS 1-3. 3/3 on the starter plus two lines, no flag, no freeze, no Game over (browser confirmed, Submit dialog shows "A flag says whether the game is being played: Complete", lesson stored `completed`):
      if (bird.colliding(p)) { p.passed = false; }     // inside the pipe loop
      if (kb.presses('r')) { pipes = []; }
  Causes: r1 `\b\w+\s*=\s*true\s*;` is ALREADY satisfied by the starter's own `p.passed = true;` (a requirement vacuous on the untouched starter), r2 accepts any `x = false` within 160 chars of `bird.colliding(`, so `p.passed = false` counts.
  Fix r1 as `(?<![\w.])\w+\s*=\s*true\b`: starter false, reference true. Add r4 "flag is read": same pattern as 5.3.10 above (reference true, starter false).
  Ungraded steps: STEP 2 (freeze gravity, bird, pipes), STEP 3 ("Game over" while flag false), "turn gravity back on", "zero the score".
- 5.4.6 Lab: Pipes that come and go (5-4-flappy-5): the untouched starter already scores r2 (`pipes.push(makePipe())` is in its `if (frameCount === 1)`). r2 should be tied to the beat: `frameCount\s*%\s*(?:\d+|\w+)\s*===?\s*0\s*\)\s*\{?[\s\S]{0,120}?pipes\.push\s*\(` (reference true, starter false, two-line `const p = makePipe(); pipes.push(p);` true).
  Also 3/3 with `if (frameCount % 1 === 0) {...push}` and `pipes[0].delete(); pipes.splice(0,1);` unconditionally: the `x < -30` test is not measured.
- 5.4.4 Lab: Make it flap (5-4-flappy-3), STEP 2 "its position AND its speed": `if (bird.y > 400) { bird.y = 200; }` passes with no speed reset. Low.
- 5.4.11 Challenges: see "Pick one" below. One line of dead code, `min(1,2); if (score > best) {} random(1); random(2);`, scores 3/3.

BLOCKING FOR AN HONEST STUDENT
| Lesson, req | Refused, correct answer | Taught where |
| --- | --- | --- |
| 5.4.7 r1, r2, r3 | the count written inside the loop the starter ALREADY has: `for (let i...) { if (pipes[i].x < bird.x && !pipes[i].passed) { score += 1; pipes[i].passed = true; } }` fails ALL THREE (r1 wants `for (const p of pipes)`, `\w+\.x` cannot match `pipes[i].x`) | the lab's own starter and 5.4.6 STEP 2 use `pipes[i]` |
| 5.4.7 r3 | `score++`, `score = score + 1` | 2.1.14 teaches `++` |
| 5.4.7 r2 | `!p.passed && p.x < bird.x`, `bird.x > p.x && p.passed === false` | operand order |
| 5.4.6 r2 | `const p = makePipe(); pipes.push(p);` | two-line form is the natural beginner shape |
| 5.4.6 r1 | `frameCount % gap === 0` with `const gap = 90` | variables |
| 5.4.4 r1 | `kb.presses('space')` | 5.3.5 reading table teaches `kb.presses('space')`; r1 accepts only `' '` |
| 5.4.4 r3 | `bird.y >= 400 \|\| bird.y <= 0` ; `bird.y > height` | `>`/`<` only, digits only |
| 5.4.4 r1/r2 | `const FLAP = -4; bird.vel.y = FLAP;` | named constant |
| 5.4.8 r3 | `kb.presses("r")`, `pipes.splice(0)` | |
| 5.4.8 r2 | `p.colliding(bird)` | |
Proposed (all verified against solution.js and starter): 5.4.7 r2 `(?:\w+(?:\[\w+\])?\.x\s*<\s*bird\.x\s*&&\s*!\s*\w+(?:\[\w+\])?\.passed|!\s*\w+(?:\[\w+\])?\.passed\s*&&\s*\w+(?:\[\w+\])?\.x\s*<\s*bird\.x)`; r3 `score\s*(?:\+=\s*1|\+\+|=\s*score\s*\+\s*1)[\s\S]{0,60}?\w+(?:\[\w+\])?\.passed\s*=\s*true`; r1 should accept any loop that mentions `pipes` (for-of OR indexed), or be dropped since r2 already requires the pipe test.

---------------------------------------------------------------------
## 5.5 Snake

GAMEABLE
- 5.5.6 Lab: Grow and eat (5-5-snake-6), STEP 2 ("do NOT remove the tail that step", "the snake should be six cells long"). 3/3 for a snake that never grows:
      segments.unshift(makeSegment(col, row));
      const tail = segments.pop(); tail.delete();
      score += 1;  food = makeFood();
  every step scores and respawns food. r1 (unshift), r2 (pop then delete), r3 (score += 1 then food = makeFood()) are all met. The lab's lesson, "the tail is kept on the eating step", is unmeasured.
  Best fix is a runtime `tests` case (the harness supports them): call step() with the food in front of the head and assert `segments.length` goes 3 to 4, and 3 to 3 when not eating. A regex fix would have to accept both `else { pop }` and an early `return` after eating; my strict regex refused the early-return shape, so I do not recommend regex here.
- 5.5.4 Lab: Steer it (5-5-snake-4): r1 checks ONE key. Title says "Each arrow key sets the direction", pattern is `kb.presses('up')...dy = -1`. 3/3 with `if (kb.presses('up')) { dx = 0; dy = -1; }` plus `if (dy === 0 && dx === 0) {}` (a junk guard) plus the wall test. Down, left and right are never measured, and neither is that the guard belongs to a key. Fix: make r1 require all four keys (four lookaheads), r2 require `kb.presses(...)&&\s*d[xy]\s*===\s*0` or `if (d[xy] === 0)` wrapping a `kb.presses`.
- 5.5.11 Challenges (5-5-snake-11): see "Pick one" below; `beat -= 1; if (score > best) {} turnX = 0;` is 3/3.
- 5.5.8 Lab: Don't bite yourself (5-5-snake-8): r2 is satisfied by `isBody(col,row);` called and thrown away before `playing = false`; r1 by `for (const s of segments) { return true; }` (always true). Lax by design; noted only.

REFUSES
| Lesson, req | Refused, correct answer |
| --- | --- |
| 5.5.6 r3 | `score++`, `score = score + 1`, and food respawn written BEFORE `score += 1` |
| 5.5.8 r1 | `segments.some(s => ...)`, indexed `for (let i...)` (reading 5.5.7 teaches for-of only, so fine; noted) |
| 5.5.4 r3 | `col > 19` (taught `>= 20`), `head.col === 20` |
| 5.5.4 r2 | `dy !== 1` style guards |

---------------------------------------------------------------------
## Cross-cutting blocker: the three "Pick one" challenge labs grade ALL THREE
5.3.12 (5-3-pinball-10), 5.4.11 (5-4-flappy-9), 5.5.11 (5-5-snake-11). The page says "Pick one", "Choose one of the three, or invent your own"; each lab has three requirements and Submit needs all three.
Browser check on 5.5.11: wrote an honest `best` score feature, Run: counter "1/3", "Still needed (2)", Submit button disabled, lesson stays `started`. A student who invents their own rule (explicitly allowed) can never pass.
The one-line dead-code answer passes all three on all three labs (3/3 each). So the honest student is blocked and the gamer is free: the exact inversion.
Fix: make the three requirements one-of (a single `type: "custom"` or one regex alternation r1|r2|r3 worth 3), or reword the page to "do all three". Starter must stay below full: the shipped finished game scores 0/3 on all three, still true under a one-of rule if the alternation is on the changed behaviour, not on code the starter already has.

---------------------------------------------------------------------
## Starter/reference gate summary (scripts/check-starters.mjs, run plus a per-requirement scan)
All 21 graded labs in scope: reference full, starter not full.
Starters that already pass a requirement: 5-4-flappy-5 r2 (`pipes.push(makePipe())` is in the starter), 5-4-flappy-7 r1 (`p.passed = true;`).

## Single biggest gap per module
- 5.2: 5.2.4 r2 (and r1): an empty `if (frameCount % 30 === 0) { }` plus an unconditional `on = !on;` earns 5/5, so the new opener's one real concept, a beat that gates an action, is not measured. Runner-up: 5.2.16 deletes the goal on frame 1 for 4/4.
- 5.3: 5.3.7 r2/r3 refuse the exact line the course teaches (`if (touching && !wasTouching) score += 1;` brace-less) and any memory name but `...touching...`, while a lookalike that races the score passes 3/3. Runner-up: 5.3.12 "pick one" needs all three.
- 5.4: 5.4.8 (r1 passes on the starter via `p.passed = true;`, r2 accepts `p.passed = false`): 3/3 with no flag, no freeze, no Game over, confirmed in the browser to complete the lesson. Runner-up: 5.4.7 refuses the loop inside the starter's own `pipes[i]` loop (all three requirements).
- 5.5: 5.5.6 grades pop/unshift/score but not that eating KEEPS the tail, so a snake that never grows scores 3/3. Runner-up: 5.5.4 grades only the up key.
