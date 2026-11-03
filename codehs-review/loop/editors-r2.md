# Editors audit, round 2: modules 5.2, 5.3, 5.4, 5.5

Run by cs-function-audit on 2026-10-30, after round-1 fixes (commit 96c86674). Dev server localhost:3002
(DEV_ROLE=student), playwright-cli session `r2-editors` (closed), cookie `dev_student=r2editors`. Measurements, not
verdicts: each item gives the claim, the measured fact, and the lesson id + step. The pass/fail call is the human's.
Baseline is `codehs-review/loop/editors.md` (F1-F12).

## How the four lenses were run (and what was NOT)

`audit.mjs` / `cs_lenses.mjs` are bookSHelf tools for published bookSHelf pages. shCode lessons are not bookSHelf
pages, so I did not run them. I applied the four lens definitions by hand with a playwright-cli harness: every
`js live` fence and every moshion lab/challenge in scope was run with the real Run button (labs: starter, then
`solution.js` pasted into the CodeMirror doc, then Run). A requestAnimationFrame logger inside the runner iframe
sampled game variables once per frame (`frameCount`, `performance.now()`), so every number below is a frame count.
The headless browser ran a steady 60 fps this round (measured from the logger), so frames / 60 = seconds. Keys were
KeyboardEvents dispatched into the iframe window. The Console pane text was read from `.liveconsole-text` (live
fences) and `.console-output` (labs).

Sanity floor: non-zero everywhere (every in-scope live fence and lab produced a runner iframe whose `frameCount`
advanced, 75-89 frames at 1.3-1.5 s). No zero-probe pages.

Lens summary (counts, not a pass/fail):
- editor-kind: the 5 console fences from F7 now carry the `console` flag and render a Console pane that shows the output. No console-vs-drawing mixups.
- async-output: 0 hits (no setTimeout/setInterval/.then/Promise/async/await in any in-scope content.md, script.js, solution.js).
- silent-no-output: 0 hits. The 5.2.20 starter is no longer empty (F10). Labs whose starter is silent by design (5.2.4 beat lab) print nothing until the student writes the line.
- output-claim: F1-F6, F8, F9, F11 re-measured, all now match (below). One reading number is loose (N5).

Every starter and every reference `solution.js` ran with no `#error` banner. Quest counts on the solutions: 5.2.14 2/2,
5.2.10 4/4, 5.2.17 4/4, 5.2.20 4/4, 5.2.3 5/5, 5.2.4 5/5, 5.3.4 4/4, 5.3.7 3/3, 5.3.8 3/3, 5.3.10 3/3, 5.3.12 1/1,
5.4.4 3/3, 5.4.6 3/3, 5.4.7 3/3, 5.4.8 6/6, 5.4.11 1/1, 5.5.4 3/3, 5.5.6 4/4, 5.5.8 3/3, 5.5.11 1/1, moshion-bounce 4/4.
5.2.18 is AI-checked (0/4 until Check, as before).

## Status of the round-1 findings

### F1 pinball table never reaches the goal: FIXED
New table: walls at x=5 and 395, bumper (140,115) 200x14 rot 14, goal (286,151) 100x14 rot 14, floor (250,385) 280 wide
(stops short of the left wall, so there is a drain), ball (70,60) bounciness 0.75.
- `5-3-pinball-1` Try it: ball hits the bumper, rolls off the end into the right wall (x max 357), bounces across the floor, travels left (x=32 at fc 377) and falls out through the gap: y>400 at fc 412 (6.9 s). Prose ("falls out through the gap at the bottom left") matches.
- `5-3-pinball-2` Step 2: ball is on the gold for 33 frames (136..168), one floor contact at fc 230, drain at fc 346. Step 3: score 0 until fc 136, then +1 per frame to 33 at fc 168 (0.55 s). Prose "shoots up to 33 in about half a second" matches. After R the next drop adds 33 (score 66). Prose "one crossing, thirty-three points" matches.
- `5-3-pinball-3` (5.3.4) reference: goal contact fc 136-160, drain fc 346, Quest 4/4, no error.
- `5-3-pinball-6` (5.3.7) starter: 0, then 1..33 over fc 136-168. Solution: 1 after the first drop, then 2, 3, 4 after three R presses (fc 538, 987, 1437), Quest 3/3. Step 3 text ("reads 1 ... press R three times ... exactly 4") matches. The "no key moves the ball" problem is gone.
- `5-3-pinball-9` (5.3.10) solution: score 1 at fc 136, `playing` false at fc 346 (5.5 s after Run), then "Game over"; R restores playing=true, score 0, ball (70,~71). R pressed mid-round also restarts. No prose claim about the lab's Game-over time.
- `5-3-pinball-8` (5.3.9 reading): score 1 at fc 67, `playing` false at fc 176 (2.93 s from frame 0). Prose "About three seconds in, ... Game over" matches. R restores score 0 / playing true.

### F2 5.3.5 reading numbers and backwards Try-this: FIXED
`5-3-pinball-4` Try it (bounciness 0): score 1 at fc 65, then 2, 3, 4 after R x3 (fc 567, 817, 1066). Matches "1, then 2, 3, 4".
Try this (delete `wasTouching = touching;`): score 66, 186, 306 at fc 130, 250, 370, i.e. 60/s. Matches "about sixty points a second".
Second Try this (update moved inside the `if`): first landing 1, three R presses add nothing. Matches the new text, and the
logical explanation is now correct.

### F3 5.3.6 example speeds and counts: FIXED
`5-3-pinball-5` Step 1: 36, 136, 236, 336 at fc 100/200/300/400 (60 per second, never stops). Step 2: 1, then 2, 3, 4 after R x3.
Try this (bounciness 0.2): drops add 3 each (1,2,3 then 4,5,6 then 7,8,9 then 10,11,12). Matches "each drop adds 3".

### F4 5.3.9 reading never reaches Game over: FIXED
See F1. Try this (remove `ball.vel.y = 0;`): with a 1.5 s wait on the Game over screen the next round ends 52 frames after R
(first round 176). Direction matches; "about half the usual time" is loose, it is under a third here (N5).

### F5 5.3.8 lab cannot show three values: FIXED
`5-3-pinball-7` starter: score races 1..80 on the first bumper only, as described. Solution (three bumpers in a zigzag,
ball bounciness 0): first drop 1 (fc 29), 6 (fc 139), 16 (fc 322). Matches "1, then 6, then 16". Each R adds 16: 16, 32, 48, 64
(per-bumper steps +1, +5, +10 each time). No jitter flicker: a drop no longer climbs to 120. Observation, not a claim: after a
drop the ball rests at (223,302) on the lower end of the third bumper rather than reaching the floor, same spot every drop.

### F6 holding the key does not hover: FIXED
`5-4-flappy-2` Try this 3: with `kb.pressing` held, `vel.y` is -4 on every frame, y falls from 238 to 8.5 by fc 81, wraps to 200 at fc 64/118/172/226/280 (a wrap every 54 frames) and climbs again; after release `vel.y` is 2.5 and growing. Matches the new text ("climbs at one steady speed and never falls ... leaves the top, comes back to the middle, and climbs again. Let go and it falls"). `5-4-flappy-1` prose and table now say "climbs steadily".
Flap size, from y=250 at standstill: gravity 20 / flap -4 rises 45 px; flap -8 rises 125-187 px; gravity 40 / flap -4 about 32 px. The "-8 nearly to the top" claim holds from lower starts (apex y=50-63 in two runs).

### F7 console.log in fences with no console pane: FIXED
`5-2-2`, `5-2-4`, `5-2-10`, `5-2-12`, `5-2-random-2` all carry `js live console` and show a Console pane under the canvas.
- 5.2.6 gravity: pane shows `ball.y = 213` at 1 s, `ball.y = 255` from 2 s on. New prose ("grows ... then stops changing once the ball lands") matches.
- 5.2.9 ground check: `touching` fills the pane (pane keeps the last 200 lines); `space pressed once` appears once per press.
- 5.2.15 delete: `a deleted` once; `b visible: false` / `b visible: true` per v press.
- 5.2.16 finished scene: `You win!` once. 5.2.2 sparkles: one line (`five seconds are up`) at fc 300, 12 squares at fc 380.

### F8 vel.y = -3 is not "fighting gravity": FIXED
`5-2-8` Try it: with `player.vel.y = -3` y = -24.5 at fc 30, -112 at fc 60, -517 at fc 199: rises steadily off the top and never returns. New prose says exactly that. The applyForce half is still mild (y 92.6 vs 98.7 without force at fc 30; 187.6 vs 212.5 at fc 60) and the prose still says "more gently", which is accurate.

### F9 the jump leaves the canvas: FIXED
Reference jump -7 (was -8), 5.2.10 lab: apex y=59.1 (top edge 39); a mid-air second tap adds nothing (apex unchanged). 5.2.16 example
and 5.2.17 lab (same scene, bounciness 0.6): apex y=30.5 (top edge 10.5), so the player stays on screen and passes above y=200 into
the wind zone. Caveat in N1.

### F10 5.2.20 starter does nothing: FIXED
`5-2-15` starter is now the one-goal scene (the editor text equals `script.js`). Run: no error, `frameCount` advances, walking onto
the goal prints `You win!` once and deletes the goal. Reference solution: first goal then a jump to the second, `collected` 1 then 3, Console shows `All goals collected!` once, Quest 4/4.

### F11 "same table as 5.2.18": FIXED (wording)
5.3.2 now says "the same kind of scene you built in 5.2.18, with two walls and a drain added"; 5.3.3 calls its table "the table from 5.3.2". No claim of identity with 5.2.18 remains.

### F12 `floor` sprite name breaks the `floor()` taught in 5.2.1: STILL OPEN (latent)
Re-reproduced in the 5.2.11 editor: `ball = new Sprite(180, floor(random(40, 100)), ...)` with `let ball, floor;` in scope gives `TypeError: floor is not a function @ sketch.js:7:26`. Declared `floor` sprite appears in 5.2.6, 5.2.11 (5.2.18 solution), every 5.3 pinball block and the 5.3.12 challenge scene; `floor(` calls appear in 5.2.1, 5.2.2, 5.2.3 solution and 5.5.x. A file-level grep finds no file that does both (5.2.3 and 5.5.x use `floor(` with no floor sprite), so nothing hits it today. A student who adds `random` to a pinball challenge (5.3.12 challenges 1 and 2 invite it) will.

## New and changed blocks

- 5.2.16 example (`5-2-12`): runs, Console shows `You win!` once after holding right (goal gone 46 frames after the press, x=366), one line even after 0.8 s more. Jump apex y=30.5 when the jump registers. See N1.
- 5.2.17 lab (`5-2-11`): starter and solution run, Quest 4/4. Solution: wait for the settle, tap `d` for 640 ms, Console `You win!` once, `goal === null`.
- 5.2.20 (`5-2-15`): see F10.
- 5.3.12 (`5-3-pinball-10`): starter = the finished game (score 1 at fc 136, Game over at fc 346). Reference solution runs: second goal (330,250) worth 5 is hit (score 1 then 6 at fc 200), slider sweeps x 68..332, `best` 6 survives R (score 0, best 6, playing true), Quest 1/1. The challenge-2 snippet from the prose pasted into the starter runs with no error. See N3.
- 5.4.8 (`5-4-flappy-7`): reference with an autopilot bird (score 1, 2, 3 at fc 261/351/441), then crash: `playing` false, gravity 0, bird.y constant 218 even with Space pressed, pipe `vel.x` 0/0, pipes length constant 2, score constant 3 for 300 frames. R: pipes 0, sprites 1, gravity 20, score 0, playing true, and pipes resume at the next 90-frame beat. Grader mutants: remove the freeze 5/6, remove only bird/pipe freeze (keep gravity) 5/6, restart keeps pipes 5/6: the freeze fix works. Gap: N2.
- 5.5.6 (`5-5-snake-6`): starter (five functions, `step()` replaces the head) runs; the head dashes ahead of a 3-cell body to the wall and `playing` goes false, as the step text implies. Solution, food placed ahead three times: 3 -> 4 -> 5 -> 6 cells, score 3, sprite count = cells + food, Quest 4/4. Matches "six cells, score 3".

Other numbers re-measured and unchanged: 5.2.4 (random-4) lamp flips at fc 30/60/90..., `Almost!` once (fc 70), `Time is up!` once (fc 300), starter prints nothing; 5.2.3 (random-3) x 44..366, y 31..269, colours from the list, rolls 1-6 after the first roll; 5.4.6 pipes at fc 90/180/270 and `pipes.length` holds at 2-3 (starter: 1 forever); 5.4.7 solution scores once per pipe (1..6 at fc 261, 351, ... every 90) when the bird flies through the gaps; 5.5.3 block steps 7.5 times a second (133 ms), wraps at col 19 -> 0, Try this 2 and 3 as written; 5.5.4 starter walks off the grid (col 35 at fc 200), solution ignores down while going up and right while going left, stops at the wall on the last cell reached, Quest 3/3; 5.5.8 `isBody` true on a body cell, food never on the body in 500 draws, stepping into the body ends the round; 5.5.11 starter reproduces the double-turn bug (Up then Left 40 ms apart ends the round at head (12,10)), solution survives it (heading up), `beat` 8 -> 5 after three foods, `best` 3 survives R.

## New findings

### N1 (medium-low): the 5.2.16 / 5.2.17 / 5.2.20 player bounces for 5-8 s, and Space is ignored while it does
Scene: player bounciness 0.6 on a ground with friction 0.5, jump = `kb.presses(' ') && player.colliding(ground)`. Measured on
5.2.16: `colliding(ground)` is true on only 84 of 200 frames in fc 200-400 and on 100 of 100 only from about fc 500; the player is
still bouncing (y 316..350) until about fc 300. Eight jump attempts spaced across that window gave apex 30.5, 245.8, 344.8 in a
repeating cycle, i.e. a jump that works about one press in three. After it settles every press jumps to 30.5. A student who
presses Space in the first seconds sees nothing and has no way to know why. The same scene is the starter for 5.2.17 and 5.2.20.
(5.2.10 and 5.2.14 labs have no bounciness on the player and jump reliably.)

### N2 (medium-low, grader): 5.4.8 card r5 is satisfied by code that keeps spawning pipes after the crash
r5 ("The game runs only while the flag is true") matches `if (word) {` followed anywhere later by `frameCount %`. Mutant of the
reference with the spawn line moved out of the `if (playing)` block: Quest 6/6, and after the crash the pipe count goes 2, 3, 4, 5, 6, 7
(new pipes keep arriving and move at -2 while the old ones are frozen). `if (true) {` instead of `if (playing) {` also scores 6/6.
The freeze (r4) and restart-clears-pipes (r3) cards do go red on their mutants (above).

### N3 (low): the challenge-2 slider (5.3.12) is almost never touched
The prose snippet puts the slider at (200,230), sweeping x 70..330. Across six drops with different timing the ball touched it for 0-1 frames per drop (0,0,1,1,0,0), so the bumper that slides changes nothing visible. Challenge 1 tells the student to watch a drop first and place the goal where the ball goes; challenge 2 gives no such hint. (Reference solution still scores because goal2 sits on the path.)

### N4 (low): an idle bird is shoved off the left edge by the first pipe (5.4.6-5.4.7 labs)
In the 5.4.7 reference with no flapping, the bird is hit by the first kinematic pipe and carried left: bird.x 100 -> 84.9 (fc 249) -> 4.9 (fc 289) -> -395 (fc 489), score stays 0 because the pipe never gets behind the bird. Step 3 ("watch one drop") does not say the bird has to fly through the gap to score. Scoring works as described once the bird flies the gaps.

### N5 (low): two loose numbers in prose
- `5-3-pinball-1` Try this: "let the ball settle". The ball does not settle; it drains at fc ~412 and falls forever.
- `5-3-pinball-8` Try this (remove `ball.vel.y = 0;`): "about half the usual time". Measured 52 frames against 176 (under a third) after a 1.5 s wait; longer waits shorten it further.

### N6 (low): `roll` shows 0 for the first second of the 5.2.3 lab
Step 2 says "never a 0 or a 7". `roll` starts at 0 and is first set at frame 60; rolls from fc 61 onward were 1, 3, 4, 5, 6 (no 0, no 7).

### N7 (info): no side walls in the 5.2.17 and 5.2.20 scenes
Holding `d` for 1.5 s from the start walks the player past the goal and off the right edge (x=512, y=471 at about 3.5 s). The 5.2.16 example has walls; the lab and challenge scenes do not. The goal is reachable by tapping `d` for about 640 ms after the player has landed.

## Checks I could NOT perform

- `audit.mjs` and `cs_lenses.mjs`: bookSHelf-only, not applicable to shCode lessons. The four lenses were applied by hand, so there is no lens self-check run behind this report.
- Pixels, layout, colour, text overflow. Canvas text (score, Game over) was read through sketch variables, not OCR or screenshots. A PASS from this run says nothing about appearance.
- Real keyboard input and focus: all keys were KeyboardEvents dispatched into the runner iframe window. A student who has not clicked the preview first was not simulated.
- Real-machine frame rate: 60 fps in this headless run, so seconds = frames/60 here; a slower machine stretches the seconds but not the frame counts.
- 5.2.7 (`moshion-gravity`) and 5.2.8 Tune Gravity: no solution file; each only ran with no error and an advancing `frameCount`. `moshion-bounce` (5.2.12): starter/solution ran, Quest 4/4, step wording not re-measured. 5.2.14 wind lab: ran, Quest 2/2, force strength not measured. 5.4.4 flap lab and 5.4.11 challenges: ran, Quest 3/3 and 1/1; the three 5.4.11 challenge behaviours were not exercised. 5.3.12 challenge 3 (best score) tested through the reference only.
- The 5.4.8 autopilot (flaps when the bird drops below the gap centre) is my own driver; a human fly-through may differ. The 5.5.6 and 5.5.11 food was placed by editing `food.col/row` in the running sketch, and the 5.5.8 bite was built by replacing `segments`, not steered by hand.
- AI Check on 5.2.18 (Quest cards), Commit, Submit, quizzes, plan and playtest screens: out of scope, not walked.
- Harness notes: a lab reopened after a paste restores the pasted code from the server draft even after localStorage is cleared, so later starter runs used `setCode(script.js)`; the first visit of each lab was a true starter run. The scratchpad directory is shared with concurrent agents and overwrote my first helper files, so the harness lives in `scratchpad/r2ed/`. I marked every in-scope lesson completed for `dev_student=r2editors` (dev server memory only). No repo files were edited other than this report.
