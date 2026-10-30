# cs-student-moderate lens, ROUND 3: 5.2 (5.2.1-5.2.20), 5.3 (5.3.1-5.3.12), 5.4, 5.5 (5.5.1-5.5.11 Snake)

Method: same as rounds 1-2. The grader bundle was REBUILT from `lib/grader.ts` this round (esbuild), then every
requirement regex in the graded labs was run against the starter (must be red), the reference (must be green) and 10-30
answers shaped like the course's own earlier examples. Behaviour claims were checked by running the sketches in the moSHion
runner (harness page + `preview-eval`, synthetic key events, screenshots) on the dev server, session `r3-moderate`, cookie
`dev_student=r3moderate`. Round-2 fixes are commit f5e53852. Ids are on-screen titles; dirs differ (5.3.7 = `5-3-pinball-6-...`).

Baseline: every graded starter is fully red (including 5.2.20 r1, which was green on the untouched starter in round 2), every
reference is fully green. The 21 labs/challenges run (starter and solution) with no console error. 5.2.18 is marked by the AI
Check button, not by Run, so its regexes are not what a student meets; I read its `aiCheck` rubric instead.

## 1. Round-2 open items: FIXED / NOT FIXED

| Item | Verdict | Evidence |
| --- | --- | --- |
| `floor` sprite vs `floor()` | FIXED | No `floor` variable left anywhere in 5.2-5.5 sketches (grep). `ball = new Sprite(floor(random(40,100)),60,24)` and `let q = floor(random(1,7))` appended to the 5.3.4 / 5.3.10 solutions run clean. 5.3.2 explains the rename in one paragraph; 5.3.4 step 2 hint repeats it. |
| 5.2.20 r3 refuses "two variables" answer | FIXED | `goal===null && goal2===null`, `!goal && !goal2`, with or without a done-flag: r3 P. Counter `+=1`, `++`, `= x + 1`, counting down `-=1` / `--`, `>= 2`: P. r1 now red on the untouched starter. Wording "above the wind zone" is now "up in the wind zone (y less than 200)". Residual (low): a second-goal check that only tests `if (goal === null)` (one variable) is refused. |
| Circle constructor `new Sprite(x, y, d)` taught | FIXED | 5.3.2 now has a paragraph on it ("One number makes a circle that many pixels across ... same kind of ball you made in 5.2.12"); 5.2.12's starter comment ("One size argument instead of two makes it a circle") and hint teach it earlier; 5.3.4 step 3 describes it correctly and cites 5.3.2. |
| Bird swept off screen in 5.4.6/5.4.7 | FIXED | 5.4.5 teaches `bird.x = 100; bird.vel.x = 0;` and every starter from 5.4.6 has it. Measured on the 5.4.6 and 5.4.7 references over 20 s: bird x is 100 at every sample, pipes cycle 2-3, score climbs 0 to 14. |
| 5.2.3 narrow pattern (temp variable) | FIXED | `let nx = random(30,370); coin.x = nx;` r1 P, r2 P. Also P: `coin.pos.x`, `floor(random(30,370))`, `Math.random()`, `random(colors)`, `random (30,370)`. Residual (low): `round(random(1,6))` and `const d = floor(random(6)); roll = d + 1` fail r3 (die); `random(5)` hard-coded fails r4 by design. |
| 5.4.6 narrow pattern (splice first) | FIXED | `const dead = pipes[i]; pipes.splice(i,1); dead.mate.delete(); dead.delete();` r3 P; forward loop with `i--` P. `.remove()` and `.filter` still F (not taught). |
| 5.4.8 inverted `gameOver` | FIXED | `gameOver = true` on crash with `if (!gameOver) {...}` wrapper, `=== false`, `== false`: r2, r5 P. `restart()`, `pipes.length = 0`, `pipes.splice(0)`, `splice(0, pipes.length)`, backwards-delete loop: P. Residual (low): early-return wrapper (`if (!playing) { ...; return; }`) fails r5; `while (pipes.length>0) pipes.pop()` fails r3. Neither is modelled by 5.3.9/5.3.10. |
| 5.5.8 found-flag | FIXED | `let found=false; ... found=true; return found`, `let result`, index loop, `do...while`, `while (isBody(col,row) === true)`, separate bite `if`, `isBody` first: all P. Still F (low, unchanged, not taught): `.some(...)`, `forEach` flag, `if (isBody) return makeFood()`, `while (true) { ... break }`. |
| 5.2.17 keys | FIXED | 5.2.8, 5.2.10, 5.2.14, 5.2.16 text and code, 5.2.17, 5.2.20 all use `a` / `d` + space. Same keys end to end. |
| 5.2.18 pointers | FIXED | r2 (static) now cites 5.2.6, r4 (key repositions ball) cites 5.2.9, r3 now "0.8 or more" (5.2.11 example uses exactly 0.8). All three land on the right lesson. |
| 5.4.x text hidden behind pipes | FIXED for 5.4 | `drawTop()` is taught in 5.4.5 BEFORE its first use (5.4.6 starter), is documented in `public/moshion/docs/moshion.d.ts`, and works: screenshot of the 5.4.6 reference with a pipe at x~150 shows "pipes: 2" on top of it; screenshot of the 5.4.8 crash screen shows "score: 0" (digit visible over the frozen pipe) and "Game over / press R to play again" readable. See NEW finding 1 for 5.5. |
| 5.2.1 frameCount "starts at 0" vs `1` | FIXED | 5.1.15 now says "is `1` on the first frame". 5.2.1 agrees; Run logs 1,2,3. |
| 5.2.5 Slides placeholder | NOT FIXED | Unchanged ("Placeholder until the deck is rebuilt"); still a lesson in the chain (student UI shows it as lesson 5 of 20, locked until 5.2.4 is done). Honest but empty. |
| 5.2.1 "you met Math.random() in the loops unit" | NOT FIXED (trivial) | 2.4.3 still says "You do not have to write that line yourself". |
| 5.3.4 r3 refuses `.75` / `.8` (leading-dot decimal) | NOT FIXED (low) | `ball.bounciness = .75` r3 F; `0.75`, `0.9`, `1` P. Also `ball.bounciness = bounce` (variable) F. |
| 5.5.1 "the 5.4 lab" | NOT FIXED (trivial) | Prose points at a module, not a lesson (5.4.6 meant). |
| 5.4.11 challenge 3 "wobble sideways ... the gap stops being a gap" | NOT FIXED (low) | Text unchanged. A sideways wobble of one half does not close a vertical gap; a vertical wobble would. |
| 5.5.6 r3 `const nf = makeFood(); food = nf;` | NOT FIXED (low) | Still F. |

Round-2 items that need no re-check and still hold: 5.3.3 prose number (33 per crossing, next drop 66, measured again), 5.3.6
bounciness-0.2 claim (3, 6, 9, 12 measured), 5.3.7 (1,2,3,4), 5.3.8 (1, 6, 16, then R adds 16 to reach 32: measured with a sample every
0.5 s), 5.3.10 (play, drain at ~4 s, Game over keeps score 1, R gives `true s0`), 5.3.12 slider (ball passes within one ball radius of
the slider at t~3 s), 5.2.20 second goal reachable by one jump from the first goal (ball y reaches ~31, goal collected).

## 2. NEW findings (this round)

### 1. 5.5.6 / 5.5.8 / 5.5.11: the score and "Game over" text are hidden under the snake (the 5.4 defect, not carried across the seam)

5.4.5 says "The labs from here on keep their words in [drawTop()]", and every 5.4 lab does. The 5.5 starters, references and
challenges still call `text('score: ' + score, 20, 32)`, `text('Game over', 130, 190)`, `text('press R to play again', ...)` from
`draw()` (grep: no `drawTop` anywhere in `5-5-snake-*`; 5.5.2-5.5.8 never mention it). Measured on the 5.5.6 reference: press R,
up, then left once the head reaches row 1; screenshot shows "score: ?" with the three green cells sitting on the digits. Row 1
is a normal place for a snake to be, and the top row is where a student steering "up" for a bit ends up. Same cause, same cure as 5.4:
move the three `text` blocks into `drawTop()` and say so in one line in 5.5.2 (or 5.5.5). 5.5.11's `best` display ("show it beside the
current score") inherits it. Affects what a student sees, not what the graders accept.
Transfer view: the pieces are all taught (5.4.5), the seam to 5.5 just does not apply them.

### 2. 5.4.7 lesson description is stale

`lesson.json` description of 5.4.7: "The starter has no score." The starter now declares `score`, sets it to 0 and shows it in `drawTop()`,
and step 1 says "The score is already on screen, starting at 0". Card text only; one sentence to delete.

### 3. Smaller seams

- 5.2.10 r4 and 5.4.4: `bird.vel.y = flap` with `let flap = -4` (a named constant) is refused (r1, r2); `player.vel.y -= 8` is refused (5.2.10 r4). Low:
  5.4.2 shows the exact line, and `-=` is the thing 5.4.2 warns about.
- 5.2.10 r4's Help points to 5.2.6 (Reading: Gravity) for "set vel.y negative"; 5.2.6 teaches negative *gravity*, the negative
  *velocity* is 5.1.15 / 5.1.16. The pointer lands on a lesson that does not say it.
- 5.2.14 r2 refuses `const inZone = player.y < 200; if (inZone) applyForce(...)` and r3 refuses a named negative variable
  (`applyForce(0, wind)` with `const wind = -3`). 5.2.1 modelled `const pick = ...` first; low.
- 5.2.10 r3 refuses a nested `if (kb.presses) { if (colliding) ...}`; the step says "joined with &&", so this one is by design.
- 5.3.7: the grader passes the one bug the lesson names ("update inside the if": `if (touching && !wasTouching) { score += 1; wasTouching = touching; }`
  with no separate line) with 3/3 green, and the student then sees the score stuck at 1 after R. Pattern r3 only checks that `x = touching` exists somewhere.
  Lax by instruction, but the student's first signal is a green card on a game that is broken.
- 5.4.7: `p.x + 25 < bird.x` ("pipe fully past") and `p.x < bird.x - 25` are refused by r2. A competent student reasons about the pipe's width; the step says "x less than the bird's x".
- 5.5.11 r1 refuses a hand-named counter (`speed -= 1`, `nextDx/nextDy`, `hiScore`) because the challenge text dictates `beat`, `best`, `turnX/turnY`: by design.
- Quizzes 5.4.10 (8 q) and 5.5.10 (6 q): every answer key is true to the lesson cited; all `source` strings (5.4.2, 5.4.5-5.4.8, 5.5.2, 5.5.4, 5.5.5, 5.5.7) resolve
  to the right title. Nothing asked that was not taught. (Q6 of 5.5.10 and q6 of 5.4.10 test early `return` and delete-plus-splice, both taught.)

### Prose-citation sweep (new text only)

5.3.2 "5.2.12 Bouncy Ball" (exists, teaches one-number circle), "5.2.1 (Reading: Random numbers...)" (exists, teaches floor); 5.3.4 hints "5.3.2 shows it", "5.2.11 explains what the
number means", "5.3.3 Step 2" (all true); 5.4.5 "as 5.2.1 showed" (true), "the way the bumpers were in 5.3.8" (array, true); 5.4.2 "5.2.9 told the difference" (true);
5.4.4 hint "key name from 5.1.13" (5.1.13 lists `'space'`, true); 5.4.8 step 3 "the same shape as 5.3.10", "`!wasTouching` from 5.3.7" (true); 5.4.6 hint "backwards loop from 5.4.5" (true);
5.4.8 description "playing flag from 5.3.9" (reading introduces it, lab 5.3.10 uses it; true). 5.5.2 "worth in 5.3.8", "beat from 5.4.5" (true), "5.2.1 showed" (true).
Order check, student UI: the sidebar lists 5.2.1 ... 5.2.20 in numeric order, each linked lesson dir matches its title (5.2.7 = `moshion-gravity`, 5.2.12 = `moshion-bounce`),
and the green-to-advance lock behaves (a fresh student opening 5.2.5 sees "Lesson locked" with 0 of 20 done).

## 3. Verdict per module

| Module | Verdict |
| --- | --- |
| 5.2 | **Clean** for transfer. Residual only: 5.2.5 is an empty placeholder slide lesson in the middle of the chain; 5.2.10 r4's help pointer cites a lesson that does not teach it. |
| 5.3 | **Clean.** The circle constructor, the `ground` rename, reachable goals and every prose number now hold. Residual: 5.3.4 refuses `.75`; 5.3.7 passes the "update inside the if" bug. |
| 5.4 | **Clean** (all five round-2 gaps closed; `drawTop()` is taught before it is used and works). Residual: 5.4.7 card description says the starter has no score; 5.4.11 challenge 3 wobble sentence. |
| 5.5 | Biggest gap: **the score / Game over / press-R text is still drawn in `draw()`, so the snake covers it (verified by screenshot), although 5.4.5 promised "the labs from here on" use `drawTop()` and 5.5 never applies or mentions it.** Everything else (grader tolerance, found-flag, transfer from 5.4 and 5.3) is clean. |

## 4. Notes for whoever fixes

- Fix for finding 1 is mechanical: in 5.5.4's `Game over` line and in the three `text(...)` blocks of the 5.5.6 / 5.5.8 / 5.5.11 starters and references, move text into
  `function drawTop() { ... }`; add the module-convention sentence to `curriculum/modules/5.5_*.md` as 5.4 has it. No grader change needed (no regex looks at where `text` is called).
- Keep grading lax; every residual refusal above is a pattern widening, none needs a tightening. Optional widenings: 5.4.4 r1/r2 named flap variable, 5.2.14 r2 boolean variable,
  5.3.4 r3 leading-dot decimal, 5.4.7 r2 `p.x + k < bird.x`.
- Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/r3/`
  (`t52*.cjs`, `t53*.cjs`, `t54*.cjs`, `t55*.cjs`, `t511.cjs` grader batteries on a fresh `grader.cjs` build; `rc.sh`, `shot.sh`, `sc*.js` runner scenarios).
