# cs-student-moderate lens, FINAL PASS: 5.2, 5.3 (5.3.1-5.3.12), 5.4, 5.5 (5.5.1-5.5.11 Snake)
Commit 51139eb7. Status: COMPLETE. Session f-moderate closed. No repo edits other than this file.
Method: grader rebuilt from lib/grader.ts (esbuild) into scratchpad f/; every graded lab run against starter, reference, and answers copied from the course's own earlier examples.

## Baseline (new grader, current lesson.json)
All 28 graded labs: every starter fully red, every reference fully green (5.2.3, 5.2.4, 5.2.10, 5.2.12, 5.2.14, 5.2.17, 5.2.18, 5.2.20, 5.3.4, 5.3.7, 5.3.8, 5.3.10, 5.3.12, 5.4.4, 5.4.6, 5.4.7, 5.4.8, 5.4.11, 5.5.4, 5.5.6, 5.5.8, 5.5.11). 5.2.7 / 5.2.8 starters red (one card, any non-10 gravity).

## 5.2 so far
- 5.2.7 step 2 rewrite ("0, then 20, leave it at 20"): consistent. Following the steps as written ends on 20, card green, steps 3-4 (dynamic ground falls, second block stacks) are true. FIXED (r4 finding 1).
- 5.2.3 (course shapes from 5.2.1/5.2.2: `coin.x = random(30,370)`, `floor(random(1,7))`, `colors[floor(random(colors.length))]`, `const pick = ...; coin.color = colors[pick]`, `Math.floor(Math.random()*n)`, parenthesised): all P; cheats F. Clean.
- 5.2.4 (course `on = !on`, if/else flip, `=== true`, `5*60`, const beat, parens, fix by lifting the 70-test out / `if (!on)` inside / empty `if(on){}` then standalone): all P, cheats F. One refusal: fix `if (!on && frameCount === 70)` fails r5 (the `\bon\s*&&` lookahead matches the `on` inside `!on`). Honest and it works (frame 70 the lamp is off) but the card says "joined with &&", so by design. Low.
- 5.2.10 (battery t5210 re-run): all taught shapes P; nested-if jump F by design (card and step both say `&&`; 5.2.9's reading shows two separate ifs, not nested, so the nested form is not what the course modelled either).
- 5.2.14 (5.2.13 `player.applyForce(0, -3)` wrapped in `if (player.y < 200)`, pos.y, braceless, const wind, -wind, parens, `200 > player.y`): all P. Refused: `const inZone = player.y < 200; if (inZone) {...}` (habit from 5.3.7, a later lesson) and a second if nested inside the zone. Low.
- 5.2.17 (battery t5217 re-run): all taught distance shapes P.
- 5.2.18 (gravity 10/9.8/.5, bounciness 0.8/0.9, three statics, reset by `if (kb.presses('r')) { ball.x=..; ball.y=..}` braceless/double-quoted/with extra vel resets/`||`): P. Refused: `ball.pos.set(200,40)` and `ball.moveTo` (never taught), gravity/bounciness through a named constant (`const g = 10; world.gravity.y = g`) r1 F; r3 F for `const b = 0.9; ball.bounciness = b`. Same "named constant" family that 5.2.10/5.3.4 accept. Low.
- 5.2.20: course hint shape (counter `+= 1`, `=== 2`, then `collected = 3`), `++`, two-null variables, `!goal && !goal2`, parens, double quotes: all P. Refused: message put in a variable first (`const msg = 'All goals collected!'; console.log(msg)`). Low.

## 5.3 (5.3.1-5.3.12)
- 5.3.4 (5.3.3's table copied verbatim, goal by `'static'` arg or `goal.collider = 'static'`, gravity 9.8 / const, bounciness .5 .6 .75 1 / const): all P; 2 statics, bounce 0.3, gravity 0 F. Clean.
- 5.3.8 (5.3.7's edge shape moved onto `b.wasTouching`, for...of / index / forEach / not-first / `=== false` / flag-first nested / no `touching` var): all P; `+1`, no edge, worth outside the if, global `wasTouching` F. Refused honest: `b.wasTouching = (touching)` and `score += (b.worth)` (parens on the right-hand side; 5.3.8 was not in the round-7 parens list), `const points = b.worth; score += points`, and the both-branch update. Low.
- 5.3.10 (5.3.9's `let playing = true` / `if (ball.y > 400) playing = false` / `if (playing) {..} else {text}` / restart with `playing = true; score = 0`, plus `!playing`, `=== false`, `gameOver` flag, `height`, `>=`, `400 < ball.y`, extra parens, `restart()` function, `do..while`): all P; flag-never-read, no losing test, score-not-reset F. Clean.
- 5.3.12: free-form, one regex, not walked beyond baseline.
- 5.3.7: see open items.
- Prose: 5.3.3 ends "it is the whole subject of the next lesson" but the next lesson is 5.3.4 (Lab: Build the table); the score-racing explanation is 5.3.5, two lessons on (the sentence then names 5.3.5, so a student is not lost). Drift from the 5.3.4 insertion. Low.

## 5.4 (5.4.1-5.4.11)
- 5.4.4 (5.4.3's flap + `if (bird.y > 400 || bird.y < 0)` copied; two ifs, else-if, `height`, `pos.y`, braceless, nested, `&&` extra test, named `FLAP`/`flap` variable, `-FLAP`): all P. `-= 4`, `pressing`, `vel.y = 0`, up-arrow-only F as intended. FIXED vs r4 item.
- 5.4.6 (r4 battery re-run): same as r4. Honest refusals unchanged: `const gone = pipes[i].x < -30; if (gone)` (r3) and `const beat = frameCount % 90 === 0; if (beat)` (r2).
- 5.4.7: course shape, forEach, loop name `pipe`, `<=`, `=== false`, parens, `+ 1`, split ifs, `p.mate.x`: P. REFUSED (r2), all honest: `const behind = p.x < bird.x; if (behind && !p.passed)`, `const alreadyCounted = p.passed`, `p.x + 25 < bird.x`, `p.x < bird.x - 30`, `p.x + p.width / 2 < bird.x`, `bird.x - p.x > 0`, `if (p.passed) {} else if (p.x < bird.x)`.
- 5.4.8: reference and every r4 shape P. NEW refusal: the restart (r3) accepts `pipes = []`, `pipes.length = 0`, `pipes.splice(0, ...)` only. 5.4.6 teaches the reverse loop `for (let i = pipes.length - 1; i >= 0; i--) { pipes[i].mate.delete(); pipes[i].delete(); pipes.splice(i, 1); }`; pasted into the R block it deletes every pipe and empties the array, and r3 stays red. The step's hint hands out `pipes = [];`, so a stuck student can recover. Also refused: `while (pipes.length > 0) { const p = pipes.pop(); ... }`, `world.gravity.y = (0)` (r4, absurd).
- 5.4.11: reference still ships dead `top.wobble` / `top.phase` (the only two lines that use them are the assignments). See open items.
- 5.4.9 / 5.4.10: quiz `source` fields all resolve (5.4.2, 5.4.5-5.4.8). AI rubrics read generous, not run live here.

## 5.5 Snake (5.5.1-5.5.11)
- 5.5.4 (5.1/5.4 else-if chain of `kb.pressing`, `kb.presses`, separate ifs, nested both ways, `dy !== 1`, `dy = -1; dx = 0` order, walls as `>= 20`, `> 19`, `=== -1/20`, four ifs, named `off`, `GRID` constant): all P. WASD F (the step says arrow keys). No-back-check and two-keys F. Clean.
- 5.5.6 (r4 battery re-run): honest shapes P. Refused: `const last = segments[segments.length - 1]; segments.pop(); last.delete()` (r2; the grader wants `.delete()` before the pop for the index form; 5.5.5 never shows it) and pixel comparison (card says cell). Low.
- 5.5.8 (5.5.7's `isBody` verbatim, index loops, `found` flag with/without break, nested ifs, separate bite if, isBody-first, `do..while`, `=== true`, `const bit = isBody(...)`): all P. `if` instead of `while` and a loop-free `isBody` F. Clean.
- 5.5.11: the card names `beat`, `best`, `turnX`; a student who writes `speed` or `bestScore` is refused, but the challenge text told them the names. By design.
- 5.5.1 / 5.5.9 rubrics: pointers (5.4.8, 5.5.1, 5.5.8) resolve; wording is generous.
- Student UI: sidebar for 5.5 shows 5.5.1-5.5.11 in order, "0 of 11 completed".

## 5.2.5 deck (/slides/5.2_physics_feel.paper.html, 12 slides, wired as `slidesUrl`, HTTP 200, no `<div class="notes">`)
Terms before taught: none found. dynamic/static defined on slide 4 before use; `&&` explained on slide 7; `colliding` defined slide 6; `Math.sqrt` glossed slide 9; the one-shot is credited to 5.2.1 (it is there). Numbers against 5.2.6-5.2.20: gravity 10 / 0 / -5 (5.2.8's four values include 20, slide says "20 feels heavy"), jump `-7` (5.2.10 reference), bounciness 0.8 and friction 0.5 (5.2.11/5.2.14), `dist < 25` (5.2.16, 5.2.17 step, 5.2.20), "0.8 or more" and "three static sprites" (5.2.18 cards r2/r3): all match. Citations: "5.2.6 preview", "5.2.9 preview", "5.2.10 preview", "5.2.11 preview", "5.2.16 preview", "5.2.18" each land on the right lesson; "3.1.7 Worked Example: Refactoring calcDistance" resolves.
One overclaim: slide 10 says "Every piece is on one of the slides before this one", but the reset key (a key press that sets `ball.x`/`ball.y`) is not on any slide, and no 5.2 lesson models it before 5.2.18 (it first appears in 5.3.3, `if (kb.presses('r')) { ball.x = 70; ...}`). Both halves are taught (presses in 5.2.9, setting `.x` in 5.1), so it composes; the slide claim is just a little too strong. Low.

## Citations
`check-lesson-citations.mjs`: "784 lessons, every cited lesson number resolves"; the two FORWARD notes are in 1.4.9 and 6.4.4, not in 5.2-5.5. Prose citations resolved by hand: 5.2.1 "loops unit card example" (true, only read), 5.2.20 "comes later ... classes" (5.6+), 5.3.4 "next lesson is about counting" (5.3.5 reading: true), 5.3.3 "next lesson" (drift, above), 5.5.2 and 5.5.6 "drawTop() from 5.4.5" (5.4.5 introduces it: true), 5.5.1 "5.4.8" (true).

## The moderate-r4 open items
| Item | Status now | Still a real problem? |
| --- | --- | --- |
| 5.3.7 r3 passes the named bug (`wasTouching = touching` moved inside the scoring `if`) | UNCHANGED. Measured r1 P r2 P r3 P on the bug; both-branch honest update (`if (touching) { wasTouching = true } else { wasTouching = false }`) still r3 F | Yes, small. 5.3.5 line 91 names that bug and line 103 says the update "must run on every frame, not only when it is true"; the grader passes the first and refuses the second. Also the same both-branch refusal in 5.3.8 r2. Only bites a student who copies the "try this" mutation and leaves it. |
| 5.4.4 refuses a named flap variable | FIXED. `const FLAP = 5; bird.vel.y = -FLAP`, `let flap = -5; bird.vel.y = flap` all P | No. |
| 5.4.7 r2 refuses `p.x + 25 < bird.x` / `p.x < bird.x - 25` | UNCHANGED (F) | Not for the shape the course models (step text: "its x is less than the bird's x"). It is a widening only. The larger real refusal in the same card is the 5.3.7-style named test (`const behind = p.x < bird.x; if (behind && !p.passed)` F), which 5.4.7's own description calls "the same idea as 5.3.7". |
| 5.4.11 wobble | UNCHANGED. Reference still never reads `wobble` / `phase`; challenge text has no size cap; r1 turns green on any second `random(` call | Yes, small and optional (a challenge). A student who opens the reference to see how challenge 3 is done finds only dead properties. |

## Verdict per module
| Module | Verdict |
| --- | --- |
| 5.2 | **Clean.** r4's biggest gap (5.2.7 contradiction) is fixed and measured; every course-shaped answer in 5.2.3, 5.2.4, 5.2.10, 5.2.14, 5.2.17, 5.2.18, 5.2.20 passes; the new deck is consistent. Residual lows only (named constant in 5.2.18 r1/r3, slide-10 overclaim). |
| 5.3 | Biggest gap: **5.3.7 r3 contradicts the course's own rule** (passes the bug 5.3.5 names, refuses an every-frame update written with if/else). 5.3.4, 5.3.8 and 5.3.10 otherwise take every course-shaped answer. |
| 5.4 | Biggest gap: **graders refuse honest shapes the course itself modelled earlier**: 5.3.7's named test (`const behind = ...; if (behind && ...)` in 5.4.7 r2, `const beat`/`const gone` in 5.4.6 r2/r3) and 5.4.6's reverse-loop `splice` as the 5.4.8 restart (r3). Each has a way out (hint or rewrite), none blocks. |
| 5.5 | **Clean.** |

Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/f/` (`grader.cjs` rebuilt from lib/grader.ts at 51139eb7; `base.cjs`, `a523/a524/a5214/a5220/a534/a537/a538/a5310/a544/a547/a548/a554/a558.cjs` plus the r4 `t*.cjs` re-run).
