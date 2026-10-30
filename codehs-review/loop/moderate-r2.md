# cs-student-moderate lens, ROUND 2: 5.2 (5.2.1-5.2.20), 5.3, 5.4, 5.5

Method: same as round 1. Every requirement regex read from each `lesson.json` and run through the real
`lib/grader.ts` (esbuild bundle) against the starter (must be red), the reference, and 5-15 answers shaped
like the course's own earlier examples. Behaviour claims checked by running the sketch in the moSHion runner
(harness page framing `/moshion/runner.html`, `preview-eval` for state, synthetic key events) on the dev
server, session `r2-moderate`, cookie `dev_student=r2moderate`. All 17 `js live` fences in 5.2-5.5 were run:
none throws. Also checked: every number-shaped citation (swept, all resolve by title), every prose citation
("you saw it in", "the loops unit", "Unit 1", "5.4 lab"), both quizzes' `source` strings, all AI-graded
prompts (read only). Ids are on-screen titles; dirs differ (5.3.7 = `5-3-pinball-6-...`).

Baseline: every graded starter is fully red except 5.2.20 r1 (canvas; passes on the untouched starter, a free
card on a 0-point challenge). Every reference is fully green.

## 1. Round-1 findings: FIXED / NOT FIXED

### Transfer / references

| Round-1 finding | Verdict | Evidence |
| --- | --- | --- |
| 5.2.1 cites 5.1.14 for frameCount | FIXED (number) / NOT FIXED (fact) | Now cites 5.1.15 = "Worked Example: Keyboard Movement", correct. But 5.1.15 line 196 still says frameCount "starts at 0"; Run logs `1,2,3` (verified) and 5.2.1 says `1`. The two lessons the student is sent between contradict. |
| 5.2.2 cites 5.1.20 for `world.gravity.y = 0` | FIXED | Now: "gravity gets its own reading in 5.2.6", and 5.2.6 is "Reading: Gravity". Forward pointer lands. (Gravity is still first taught after 5.2.2-5.2.4 already use it; handled honestly in prose.) |
| 5.5.7 promises a "follow your own tail" challenge in 5.5.11 | FIXED | Promise deleted; replaced by "A small simplification ... a little stricter". 5.5.11 offers beat / best / double-turn only. Nothing dangling. |
| 5.3.6 "several hundred within a second" vs 5.3.5 "sixty a second" | FIXED | Measured: 5.3.6 demo climbs about 60 per second (31, 61, 91 ... every 0.5 s = +30); 5.3.3 demo gives 33 per drop, 99 after two Rs; 5.3.5 demo reads 1, 2, 3. All three prose numbers true. |
| frameCount % n seam | still clean | |
| 5.3.9/5.3.10 `if (playing)` to 5.4.8 broken transfer | FIXED | 5.4.8 step 3 now teaches the wrapper ("same shape as 5.3.10"), and r5/r6 enforce it: the old literal answer (no wrapper) scores r5 F, r6 F. Reference run: crash, 5 s later `playing=false score unchanged pipes=2 gravity 0` (nothing spawns), R restores `playing=true pipes=0 gravity=20`. |
| `floor` name collision (5.2.1 `floor()` vs `let floor` sprite) | NOT FIXED | `let ... floor` still in 5.2.6 reading, 5.2.11 reading, 5.3.2/5.3.3/5.3.4/5.3.7/5.3.8(setup)/5.3.10/5.3.12 starters and solutions. Run of `floor = new Sprite(..); new Sprite(floor(random(20,180)),..)` throws `TypeError: floor is not a function (sketch.js:2:103)`. Latent (no 5.3 step needs random) but 5.3.12 says "or invent your own" and a random-start-x idea is the first thing 5.2.1 enables. |

### Behaviour vs prose

| Round-1 finding | Verdict | Evidence |
| --- | --- | --- |
| 5.3.7 / 5.3.10 / 5.3.4 goal unreachable, score stuck at 0 | FIXED | New table (bumper tilted 14, gold goal at the low end, walls, drain). 5.3.7 reference: one drop = 1, then R x3 = 2, 3, 4 ("exactly 4" true). 5.3.8 reference: 1, 6, 16, then R adds another 16 (32). 5.3.10 reference: Game over shows `score: 1`, R gives `0|true`, second drop scores again. |
| 5.4.6/5.4.7 text hidden behind pipes | NOT FIXED | Screenshot of 5.4.7 reference at the passing moment shows "ore: 0"; 5.4.8 reference after a crash shows `score: ` with the digit under the frozen pipe and "ss R to play again" cut off. 5.4.8 step 3's own hint ("leave the score text above the if so the score still shows after a crash") is defeated by the sprite layer. |
| 5.3.10 hint `ball.y > 400` reachable only by accident | FIXED | Hint now names the drain. |

### Graders vs the course's own model (re-run)

FIXED (verified by running the answer): 5.2.3 r3 `floor(random(1, 6 + 1))`; 5.2.3 r4 `floor(random(0, colors.length))`;
5.3.4 `"static"` double quotes and `goal.collider = 'static'`, and r1 no longer accepts gravity 0;
5.3.7 r2 (`!wasTouching && touching`, nested ifs, `=== true && === false`, `score = score + 1`, `score++`) and r3 (`prev`, `now`);
5.3.8 r1 index loop and `forEach`, r3 `score = score + b.worth`;
5.3.10 r2 `>=`, `> height`, `gameOver = true`; r3 `restart()` function;
5.4.4 `kb.presses('space')`, `"space"`, `>= / <=`, `bird.pos.y`, `height / 2`;
5.4.6 r2 `const pipe = makePipe(); pipes.push(pipe);`;
5.4.7 r1-r3 (index loop, `!p.passed && p.x < bird.x`, `bird.x > p.x`, `=== false`, `<=`, `score++`, flag before score, forEach);
5.4.8 r1 vacuity (starter now red), r2 `p.colliding(bird)`, `kb.presses('R')`, `restart()`, `pipes.splice(0)`, `pipes.length = 0`;
5.5.4 r2 (`dy !== 1`, `== 0`, nested), r3 (`=== -1 / === 20`, `> 19`, constants, pixel test);
5.5.6 r3 (`score++`, `score = score + 1`, either order), r2 `splice(len - 1)`, r4 `!==`/early `return`;
5.5.8 r1 index loop; 5.5.11 r1 (`beat--`, `beat -= 1`, `beat = beat - 1`, `max(`, `best = max`, `if (best < score)`).
Pick-one challenges (5.2.20, 5.3.12, 5.4.11, 5.5.11) are now one card each and can be passed.

NOT FIXED (all measured):

| Where | Refused answer | Course model |
| --- | --- | --- |
| 5.2.3 r1/r2 | `let nx = random(30, 370); coin.x = nx;` | 5.2.1 "One line, one number: `const pick = ...`" |
| 5.4.6 r3 | splice before delete, via `const dead = pipes[i]; pipes.splice(i, 1); dead.mate.delete(); dead.delete();` (a correct answer) | 5.4.5 never says order matters |
| 5.4.8 r2 + r5 | inverted flag: `gameOver = true` on crash and `if (!gameOver) { ... }` wrapper both refused (r2 needs `= false`, r5 needs `if (x)` positive) | 5.3.9 calls it "a game-over flag"; 5.3.10 r2 was relaxed, 5.4.8 r2 was not |
| 5.5.8 r1 | found-flag loop (`found = true; ... return found`), `.some(...)` | step says "return true straight away", so low |
| 5.5.8 r3 | `if (isBody(col,row)) return makeFood();`, `while (true) { if (!isBody) break; ... }` | 5.5.7 shows one shape only; low |
| 5.5.6 r3 | `const nf = makeFood(); food = nf;` | low |

## 2. NEW findings (this round)

### 5.2.20 r3 refuses the approach the lesson names (blocking tolerance defect, introduced by the one-card fix)

`content.md` ("two separate goal variables (or a small counter)"), step s3 ("Use a counter (or check how many goal
variables remain)"), the hint ("content.md describes two acceptable ways") and the closing line ("did you use two
variables or a counter? Both are valid") all say a no-counter answer is fine. Card r3 pattern is
`\+\+|\+=\s*1|\.length\s*===\s*0|x = x + 1`. Measured:

- `if (goal1 === null && goal2 === null && !done) { console.log('All goals collected!'); }` -> r3 F
- `if (!goal && !goal2 ...)` -> r3 F
- counter `collected += 1` / `collected = collected + 1` -> P; counting down `collected -= 1` -> F.

The course's own text is the counter-example. Pass condition for "variables remain": `goal\w*\s*===?\s*null` joined with `&&`,
or `!goal\w*\s*&&\s*!goal\w*`. (Optional 0-point lab, but the card is red on a correct, taught answer.)

### 5.3.4 step 3 + 5.3.2/5.3.3: the circle constructor was never taught, and the step describes it wrongly

`new Sprite(70, 60, 24)` (x, y, diameter) first appears unexplained in the 5.3.2 live example and 5.3.3. 5.1.6 teaches
`new Sprite(x, y, w, h)` only; no 5.1 or 5.2 lesson uses the 3-argument form (it appears in the 5.2.18 *solution*, which students
do not see before 5.3). 5.3.4 step 3 then says "a sprite with no width and height given falls as a circle" while its own hint
passes a third number. A literal student writes `new Sprite(70, 60)` (no size at all): p5play gives a default box, not a ball.
Fix: one sentence in 5.3.3 or 5.3.4: "give ONE number and you get a circle that wide".

### 5.4.6 / 5.4.7: touching a pipe flings the bird off the screen for good, and nothing says so

There is no crash rule until 5.4.8, and pipes are `kinematic`. Measured on the 5.4.7 reference with no input: bird at x=100
at t=1 s, x=91 at t=3 s, x=-29 at 4 s, then -149, -269 ... -2429 at 24 s. Score stays 0 and cannot rise (`p.x < bird.x` is
never true), pipes.length keeps cycling 2-3. The reading says "the bird's `x` never changes" (5.4.5) and quiz 5.4.10 q3
repeats it. 5.4.7 step 2's check ("score should rise by exactly one as each pipe slides behind the bird") is true only if the
student never touches a pipe (verified with a gap-following bot: 0,0,1,2,2,3,4). A student who bumps one pipe sees a dead
game, blames the code. Fix in the course: one line in 5.4.6 ("if the bird touches a pipe it is carried away; press Run again;
5.4.8 gives losing a proper meaning") or make the pipes `collider = 'none'` until 5.4.8.

### 5.4.8 / 5.4.7 / 5.4.6: score and "press R" text are drawn under the pipes (unfixed round-1 item, now with proof for the crash screen)

`text('score: ' + score, 20, 36)` spans x 20..~145, exactly where the bird (x=100) and the pipe that kills it overlap. At the
Game over screen the score value is hidden and "press R to play again" is clipped. The step promises "the score should stay where
it was" and cannot be observed. Move the score to a column no pipe can freeze on (or draw it after sprites).

### 5.2.17 vs 5.2.16 controls changed silently

5.2.16 (the model) and its text say arrow keys (`kb.pressing('left')`); 5.2.17 and 5.2.20 starters use `a` / `d`. 5.2.20's
step says "a and d"; 5.2.17 never says. Not a blocker (5.1.14 teaches both), but a copy-from-the-example student presses arrows.

### Smaller ones

- 5.2.18 card help pointers: r2 (static sprites) cites 5.2.11 (static is 5.2.6); r4 (a key repositions the ball) cites 5.2.11 (key
  checks are 5.2.9/5.2.10). 5.2.18 r3 needs `bounciness` strictly above 0.8 while the 5.2.11 example uses exactly 0.8.
- 5.3.4 r3 refuses `ball.bounciness = .8` (leading-dot decimal); `0.75` ok.
- 5.2.20 wording: "above the wind zone (y less than 200)" while the wind zone IS `player.y < 200`.
- 5.2.20 r1 (canvas) is green on the untouched starter.
- 5.2.5 "Slides: Physics Feel" has no deck and no content (`lesson.json` says "Placeholder until the deck is rebuilt"); the student
  sees "These slides aren't published yet ... mark this complete and carry on". Honest, but it sits mid-module and gates 5.2.6.
- 5.2.1 says `Math.random()`/`Math.floor()` were "met in the loops unit, in the shuffled-deck example" - true (2.4.3), but 2.4.3 says "You do not
  have to write that line yourself". 5.2.1 therefore teaches `floor(random())` fresh, which is fine, but "you met" overstates.
- 5.3.8 introduces a different table (440 x 420, no drain, bounciness 0) from the 5.3.4/5.3.7/5.3.10 table; fine as separate
  starters, but 5.3.10's `ball.y > 400` hint only works on the first table.
- 5.5.1 "as you did in the 5.4 lab when you split the pipes from the bird": prose pointer to a module, not a lesson (5.4.6 is meant).
- 5.4.11 challenge 3 says "wobble sideways ... the top and bottom half must stay in step or the gap stops being a gap"; a sideways
  wobble does not break a gap, a vertical one does.

### Prose-citation sweep

Resolved by hand, all land: 5.2.1 "5.1.15" (fixed), "Unit 1 remainder" (1.2.7 has `10 % 3`), "loops unit shuffled-deck" (2.4.3);
5.2.2 "5.1.8 new Sprite inside draw() was a bug" (5.1.8 = "Storing the sprite in a let variable"); 5.3.2/5.3.1 "In 5.2.18 you built ... a key that
puts the ball back" (true: r4); 5.3.5 "5.2.9 drew the distinction" (true); 5.3.9 "wasTouching flag from 5.3.5" (true); 5.4.2 "5.2.9" (true);
5.4.5 "as 5.2.1 showed", "bumpers in 5.3.8" (true); 5.4.6 hint "backwards loop from 5.4.5" (true; i-- seen in 2.2.6); 5.5.2 "worth in 5.3.8",
"beat from 5.4.5", "5.2.1" (true); 5.5.5 "pipes in 5.4.5" (true). Quiz `source` strings (5.4.10, 5.5.10) all resolve to the right title.
5.2.7 (Falling Block) and 5.2.12 (Bouncy Ball) exist as `moshion-gravity` / `moshion-bounce`; the 5.2.x numbering has no gap.

### AI-graded screens (read only, no grader on dev)

5.2.19, 5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1, 5.5.9: every rubric item says "be very generous"; every question is answerable from the
page named. Nothing asked that was not taught. 5.2.19 q1 sends the student to "your own experience in 5.1" (fine). 5.2.18 is the one
lab that is NOT marked by Run (Check button, AI); the step says so in its last sentence, which is the right place.

## 3. Verdict per module

| Module | Verdict |
| --- | --- |
| 5.2 | Biggest gap: **5.2.20 r3 refuses the "two variables" answer that the lesson itself calls valid** (5.2.3 r1/r2 refusing `floor(random(30,370))` / a temp variable is the runner-up; `floor` sprite name collision with 5.2.1 still latent). |
| 5.3 | Biggest gap: **the circle constructor `new Sprite(x, y, d)` is never taught and 5.3.4 step 3 describes it wrongly** ("no width and height given" while the hint passes 24). Reachability and prose numbers are now clean. |
| 5.4 | Biggest gap: **a bird that touches a pipe in 5.4.6/5.4.7 is swept off-screen for good (x = -2429 after 24 s), the score can never rise again, and nothing warns the student**; close second, score/"press R" text is hidden under the pipes at the crash screen. 5.4.8 freeze/if (playing) is now genuinely taught and graded. |
| 5.5 | **Clean** for transfer. Residual only: 5.5.8 r1/r3 refuse the found-flag loop and `if (isBody) return makeFood()`, which the step ("return true straight away") does not model. |

## 4. Notes for whoever fixes

- Keep grading lax: every fix above is a pattern widening, none needs a tightening.
- The 5.4.8 r2/r5 widening for an inverted flag is the same widening 5.3.10 r2 already got.
- Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/` (`t5*.cjs` grader batteries, `rc.sh` runner driver).
