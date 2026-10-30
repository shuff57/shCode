# Editors audit, round 3: modules 5.2, 5.3, 5.4, 5.5 (Snake)

Run by cs-function-audit on 2026-10-30, after the round-2 fixes (commit f5e53852). Dev server localhost:3002
(DEV_ROLE=student), playwright-cli session `r3-editors` (closed), cookie `dev_student=r3editors`. Measurements, not
verdicts: each item gives the claim, the measured fact, and the lesson id. The pass/fail call is the human's.
Baseline is `codehs-review/loop/editors-r2.md` (N1-N7, F12).

**THIS ROUND IS INCOMPLETE.** The dev server on port 3002 stopped answering at about 12:58 (connection refused from then
on, still refused at 13:08 after ten minutes of polling). I did not start it, as instructed. Everything below was
measured before it went down. The unfinished parts are listed under "Checks I could NOT perform" so a second pass can
pick up exactly those.

## How the four lenses were run (and what was NOT)

Same method as round 2. `audit.mjs` / `cs_lenses.mjs` are bookSHelf tools for published bookSHelf pages and do not apply
to shCode lessons, so I applied the four lens definitions by hand with a playwright-cli harness (`run-code` scripts in
the scratchpad `r3ed/`). Every number is a frame count read by a requestAnimationFrame logger inside the runner iframe
(`frameCount`, `performance.now()`); the headless browser ran a steady 60 fps (fc 60 to 70 takes 167 ms), so
frames / 60 = seconds. Keys were KeyboardEvents dispatched into the iframe window. Labs were driven by `setCode()` on
the CodeMirror doc (starter = `script.js`, reference = `solution.js`) then the real Run button.

Sanity floor: non-zero. Every block I ran produced a runner iframe whose `frameCount` advanced; no zero-probe pages.

Lens summary (counts, not a pass/fail):
- async-output: 0 hits. A grep of every content.md, script.js and solution.js in 5.2, 5.3 pinball, 5.4 flappy, 5.5 snake
  and moshion-* finds no setTimeout, setInterval, .then, Promise, async or await. (Static, so it also holds for the part
  of the round the server cut short.)
- editor-kind: static check only. Every `js live` fence in scope that calls `console.log` carries the `console` flag and
  no fence carries the flag without a log (0 mismatches). Runtime check of the Console pane was NOT repeated this round.
- silent-no-output: 0 hits in what I ran. The 5.2.20 starter prints `You win!` once when the goal is touched.
- output-claim: the items below.

## Status of the round-2 findings

### N1 player bounciness 0.6 and Space ignored while it bounces: FIXED, one small residue
5.2.16 example (`5-2-12`), same constants as the 5.2.17 lab, 5.2.20 and 5.2.14 starters: `player.bounciness` reads 0.2
(was 0.6). Landing: first contact fc 90, the last hop ends and `colliding(ground)` stays true from fc 129 (2.15 s after
Run). Frames with `colliding(ground)` true: fc 100-200 73/100, fc 200-300 100/100, 300-400 100/100, 400-500 100/100.
Round 2 had 84/200 in fc 200-400 and a settle at about fc 500.
Space test, one fresh Run per attempt, one press at the given frame: fc 85 (still falling), 92, 96, 100, 104, 108, 112, 116,
120, 124 gave no jump; fc 128, 135, 150 each jumped (apex y 54.5, top edge about 34, on screen). So a press in the 0.6 s
between the first landing (fc 90) and the settle (fc 127) still does nothing, 37 frames, against five to eight seconds and
one press in three before. The prose says nothing about it. Not re-timed separately in the 5.2.17 and 5.2.20 labs (same
player constants, same ground).

### N2 5.4.8 card r5 satisfied by code that keeps spawning after the crash: FIXED
Mutants of the reference pasted into the 5.4.8 lab (`5-4-flappy-7`), idle bird so it crashes on the first pipe at fc 242:

| Variant | Quest | Red card | Pipes at crash | 300 frames later |
|---|---|---|---|---|
| reference | 6/6 | none | 2 | 2 |
| spawn block moved out of `if (playing)` (before it) | 5/6 | r5 "runs only while the flag is true" | 2 | 6 |
| `if (true) {` instead of `if (playing) {` | 5/6 | r5 | 2 | 6 |
| spawn line one-lined above the `if` | 5/6 | r5 | 2 | 6 |
| `if (playing === true) {` | 6/6 | none | 2 | 2 |
| remove `world.gravity.y = 0;` | 5/6 | r4 "freezes the world" | 2 | 2 |
| restart no longer empties `pipes` | 5/6 | r3 "restart clears the pipes" | 2 | 2 |

The red cards now line up with the leaking behaviour (pipe count 2 to 6 after the crash). One honest form is refused, see M2 below.

### 5.4.8 freeze and restart (r2 "new and changed blocks"): FIXED, re-confirmed with an autopilot bird
Reference with the autopilot (flaps when the bird drops below the gap centre): crash at fc 1052, score 9. At the crash:
`bird.y` 173.5, `vel.y` 0, `world.gravity.y` 0, pipes 2 with `vel.x` 0/0. Space pressed, 200 frames later: all identical, score 9,
pipes still 2, `birdX` 100. R: score 0, gravity 20, `playing` true, 3 sprites 18 frames after (bird plus a pipe pair that
spawned on the fc 1260 beat); 200 frames later `pipes.length` is 2 again. Quest 6/6, 0 red.

### N3 challenge-2 slider almost never touched (5.3.12): FIXED
The prose snippet now puts the slider at (160, 250), 60x12, sweeping x 130..190. Pasted into the starter, nine drops with
R pressed 0, 25, 50, 10, 70, 35, 90, 5 frames after Game over: the ball touched the slider in 9 of 9 drops (1 or 2
`colliding` frames each; round 2 was 0-1 frames in 2 of 6). Round length from R to Game over: 272, 548, 299, 445, 613, 299,
299, 693, 602 frames; the unmodified starter is 346 every drop. The prose ("the knock sends it somewhere new ... sometimes
it goes back across the table and the round lasts longer; sometimes it drops into the drain sooner") matches: 272 and
299 are shorter than 346, 445 to 693 are longer. Reference solution (all three challenges, slider inside `if (playing)`):
slider contact 1 frame in 9 of 9 drops, score 6 every drop, round 337 then 366 frames every time (deterministic, so the
solution does not show the variety the snippet does; the prose does not claim it). No error on any variant. I did not
separately measure "after the ball bounces off the ground it flies back to the left in a high arc"; the 9/9 contacts are
the only evidence for the path.

### 5.3.9 restart-round length (two earlier measurements disagreed): SETTLED, prose matches
Block `5-3-pinball-8` (the `js live` fence). Normal code, any wait: first round 175 frames from frame 0, every round after R
176 frames = 2933 ms. Prose "About three seconds in ... Game over" matches (2.93 s).
Try this (delete `ball.vel.y = 0;`). Method A: frames from the restart frame to Game over, R pressed N s after Game over:

| wait on Game over | frames | share of 176 | velocity at R |
|---|---|---|---|
| 0.5 s | 120 | 68% | 6.1 |
| 1 s | 105 | 60% | 8.6 |
| 2 s | 86 | 49% | 13.6 |
| 3 s | 74 | 42% | 18.6 |
| 5 s | 59 | 34% | 28.7 |
| 7 s | 50 | 28% | 38.7 |

Method B (independent: wall-clock `waitForTimeout` before the R press, timed with `performance.now`): 2 s gave 86 frames
(1433 ms), 3 s gave 74 (1233 ms), 5 s gave 60 (1000 ms). The two methods agree. The new prose says "wait about two seconds
... about half the usual time" (86 of 176) and "after five seconds ... only about a third" (59-60 of 176): both match.
The round-2 figure "52 frames after a 1.5 s wait" does not reproduce: 1 s gives 105 and 2 s gives 86, so 1.5 s sits near 95;
52 frames is what a wait of about 9 s gives. I did not get a clean direct 1.5 s sample (the second method's window was too short for
the 1 s and 1.5 s rows), so the 1.5 s value is interpolated. Round 2's 52 is probably a measuring slip, not a prose problem.

### N4 idle bird shoved off the left edge by the first pipe (5.4.x labs): FIXED
`bird.x = 100; bird.vel.x = 0;` is now at the top of `draw()` in the 5.4.6, 5.4.7, 5.4.8 and 5.4.11 starters and references, and 5.4.5's
reading says why. Idle bird (no flap), `bird.x` minimum and maximum over 500-700 frames: 100 and 100 in the 5.4.4 lab (no
pipes), and in the 5.4.6, 5.4.7, 5.4.8 and 5.4.11 labs, each as starter (set from `script.js`) and as reference, with up to 3
pipes alive (round 2: 100 to 84.9 to -395). `5-4-flappy-3` (5.4.4) has no `drawTop` and
nothing in it needed one. Caveat: a lab reopened after a paste restores the pasted code from the server draft, so the
first starter pass was invalid for some labs and I redid every starter with an explicit `setCode(script.js)`.

### `drawTop()` text over pipes (the 5.4 text fix): FIXED
`drawTop` is a real moSHion hook: `public/moshion/moshion.js` calls it right after `render()` (line 3053). Measured on the
canvas: white pixels in the score-text rectangle (x 20..130, y 20..42, in canvas pixels), counted every frame, split by
whether a pipe's x-range overlaps the rectangle and its top pipe reaches y < 45. The count with a pipe over the text equals the count without
one in every lab: 5.4.6 reference 172-173 vs 172-173 (388 overlapping frames of 661), 5.4.7 reference 234-273 vs 234-273 (388 of 664),
5.4.8 reference 273 vs 273 (463 of 660), 5.4.11 starter and reference 273 vs 273 (463 of 660). This is a number read off
`getImageData`, not a look at the picture; it says the text pixels are present when a pipe is under them.
Prose in 5.4.5 matches the code ("drawTop() runs after the sprites are drawn"); the Game over words in 5.4.8 and 5.4.11 now
come from `drawTop()` and show in the same count.

### 5.5.6 growth (Snake): FIXED / matches
Reference with food moved (by editing `food.col/row/x/y` in the running sketch) two cells ahead of the head each time:
score 1, 2, 3 at fc 40, 56, 72; `segments.length` 4, 5, 6; `allSprites.length` 5, 6, 7 (cells plus the food). Matches
"six cells, score 3". Quest 4/4 on the reference and on three honest rewrites of `step()` (a named `const ate = ...` test, an
`if` that returns after eating followed by a bare block, and `!==` first with the pop in the `if` and the eat in the `else`),
the widened r4 pattern accepts all of them. Starter: no error, head dashes to the wall (col 19), `playing` false, three cells
long, Quest 0/4, as the step text implies.

### F12 / floor sprite name: FIXED in scope
No 5.2, 5.3 (pinball), 5.4, 5.5 or moshion-* lesson file declares or uses a variable named `floor` any more (grep of
`let/const/var ... floor`, `floor =`, `floor.x/y/color/...`). 5.2.2, 5.2.6, 5.3.1 to 5.3.12 use `ground`; 5.3.1's reading explains it
("a variable named `floor` would hide it"). The `floor(` callers (5.2.1, 5.2.2 reading, 5.2.3, 5.5.x) have no `floor` variable in scope. Outside the scope you named, three 6.7
readings still declare `let floor = new Sprite(...)` (6.7.17 `6-7-17-reading-applyforce`, 6.7.24 `6-7-24-reading-bounciness`,
6.7.25 `6-7-25-example-bounciness-compare`); they do not call `floor(` so nothing breaks today. The runtime proof (a pinball block
with `floor(random(40, 100))` running without a TypeError) was written but NOT run, the server went down first.

### N5 two loose numbers: FIXED
`5-3-pinball-1` Try this now says "watch one drop all the way to the drain" (the ball drains at fc ~412, round 2). `5-3-pinball-8`: see the 5.3.9
table above.

### N6 `roll` shows 0 for the first second of the 5.2.3 lab: OPEN (not re-measured)
`git diff 96c86674 f5e53852` on the random-3 lesson changes only the card patterns and descriptions. The starter still begins
with `let roll = 0;` and the step still says "check that you see a 6 and never a 0 or a 7", so the on-screen `roll: 0` before the first
roll at frame 60 is unchanged by reading. I did not run it this round.

### N7 no side walls in the 5.2.17 and 5.2.20 scenes: FIXED
Both labs now have `leftWall` and `rightWall` (checked with `typeof` in the runner). Holding `d` for 3 s from fc 150: `maxX` 367.5, `finalX` 366.9,
`maxY` 349.7 (starter and reference, both labs); the player stays against the right wall and the goal at (360, 340) is reached.
5.2.17 reference: goal gone at fc 186, Console `You win!` once, Quest 4/4. 5.2.20 starter: goal gone at fc 186, `You win!` once. 5.2.20 reference with
two goals: holding `d` alone prints nothing in the Console (it waits for both goals; I did not track goal 1's deletion), Quest 4/4. The 5.2.12 example moves with `a` and `d`
now, the prose says so, and it runs (`bounciness` 0.2, no error).

## New findings

### M1 (low, scene): the 5.2.14 wind-zone lab still has no walls
`5-2-9-lab-wind-zone` (5.2.14) starter and reference: `leftWall`/`rightWall` do not exist. Holding `d` for 3 s from fc 150 carries the player off the
400-wide ground: x 920, y 1496 by the end of the window. Quest still 3/3, no error. The same class as N7, in the one lab the
N7 fix did not touch. The lab's step only needs the player to jump into the wind zone, so this is a scene
nicety, not a broken claim.

### M2 (low, grader): 5.4.8 r5 refuses a gate written on the spawn line itself
Variant: the spawn block removed from `if (playing) { ... }` and written as `if (playing && frameCount % 90 === 0) { pipes.push(makePipe()); }` after the block.
Behaviour is correct (pipes 2 at the crash and 2 three hundred frames later, same as the reference) but the card "The game runs only while the flag is true"
stays red, Quest 5/6, because r5 wants a bare `if (flag) {` around `frameCount %`. A student who gates it this way sees a red card on code that works. The
other flag shapes tried (`playing`, `playing === true`) pass.

### M3 (info): the 5.2 first-hop window is not mentioned in the prose
After the fix a press at fc 92 to 124 (about 0.6 s after the player lands on its first drop) is ignored while it settles; see N1. If the lesson
tells a student "press space" and they press immediately after landing, nothing happens for about half a second. This is a smaller version of the old N1 and
needs no change unless the text promises an instant jump.

## Other numbers re-checked this round (unchanged or matching)
- 5.2.17 / 5.2.20 / 5.2.14 reference `solution.js` run with no `#error`; Quest: 5.2.17 4/4 (starter 0/4), 5.2.20 4/4 (0/4), 5.2.14 3/3 (0/3).
- 5.4.4 lab starter 0/3; 5.4.6 3/3 (0/3); 5.4.7 3/3 (0/3); 5.4.8 6/6 (0/6); 5.4.11 1/1 (0/1); 5.5.6 4/4 (0/4). All references: no error.
- 5.3.12 reference ran with no error, score 6 each drop; its Quest count was not read.
- `5-2-10` and `5-2-12` live fences: Run gives no error, `frameCount` 131 at 2.2 s after Run (60 fps).

## Checks I could NOT perform

- **The dev server went down mid-run (about 12:58, still refused at 13:08).** No result after that point exists. Not done because of it:
  - runtime sweep of the other 12 `js live` fences in scope (5.2.2, 5.2.4, 5.2.6, 5.2.8, random-2, 5.3.1 pinball-1, pinball-2 x3, pinball-4, pinball-5 x2, pinball-8
    other than the Try-this block, 5.4.2 flappy-2, 5.5.3 snake-3): errors, frameCount and Console text after the floor to ground rename (the Console pane values
    `ball.y = 213` and `= 255` in 5.2.2 included);
  - starter and reference sweep of the labs not listed under "other numbers" (5.2.3, 5.2.4, 5.2.10, 5.2.13 pinball scene, 5.2.18, 5.3.4, 5.3.7, 5.3.8, 5.3.10,
    5.5.4, 5.5.8, 5.5.11, moshion-bounce including its widened bounciness card 0.5 to 1, moshion-gravity);
  - `floor(random(40, 100))` running in a pinball sketch with a `ground` sprite (the F12 runtime proof);
  - 5.2.20 two-goal path driven like a student (`d` held to the wall, one Space tap, `All goals collected!` once);
  - the 5.1.14 claim that `frameCount` is `1` on the first frame (changed prose in this commit); not measured, only the 90-frame beat in 5.4 (pipes at 90/180/270) is
    from round 2;
  - 5.3.1's "24 pixels wide" ball (`ball.d`), N6 above, and whether 5.3.12 challenges 1 and 3 still behave as in round 2.
- `audit.mjs` and `cs_lenses.mjs`: bookSHelf-only, not applicable to shCode lessons. No lens self-check run stands behind this report.
- Pixels, layout, colour, overflow. The only pixel read is the white-pixel count in the `drawTop` check, and it is a count, not a look. A pass here says nothing about
  appearance. The model that wrote these scripts cannot see.
- Real keyboard input and focus: all keys were KeyboardEvents dispatched into the runner iframe window. A student who has not clicked the preview first was not simulated.
- Real-machine frame rate: 60 fps in this headless run; a slower machine stretches seconds but not frame counts.
- The 5.4.8 autopilot is my own driver; the 5.5.6 food was moved by editing `food.col/row/x/y` in the running sketch, not steered by hand; the Space-timing test pressed at
  discrete frames in fresh runs, not a human tapping.
- Harness note: a lab reopened after a paste restores the pasted code from the server draft even after localStorage is cleared, so every starter result in this
  report is from an explicit `setCode(script.js)` and a check that the editor text equals `script.js` (verified for the 5.4 labs). The scratchpad is shared with
  concurrent agents; my files are under `scratchpad/r3ed/`. I marked the in-scope lessons completed for `dev_student=r3editors` (dev server memory, lost with the restart). No repo
  files were edited other than this report.
