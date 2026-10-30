# Editors audit, round 4: modules 5.2, 5.3 (5.3.1-5.3.12), 5.4, 5.5 (5.5.1-5.5.11 Snake)

Run by cs-function-audit on 2026-10-30 against commit 0d039346 (round 5 fixes). Dev server localhost:3002
(DEV_ROLE=student) was up (HTTP 200). playwright-cli session `r5-editors`, cookie `dev_student=r5editors`.
Measurements, not verdicts: the pass/fail call is the human's. Not repeated, per the brief: the 17 `js live` fences
(clean, frames advance, no editor-kind or async hits, no `floor` variable declared) from the earlier pass.

Method: same harness as rounds 2-3 (a playwright `run-code` script; code set through the CodeMirror doc, then the real Run
button; frames read from `frameCount` inside the runner iframe, 60 fps headless). Harness files:
`.../scratchpad/r5ed/` (not in the repo). FILES were regenerated from the working tree at 0d039346, not reused from the
13:52 harness that predates round 5.

This file is written early and appended as checks finish. Sections marked PENDING are not measured yet.

## Moving target
HEAD advanced to b8ffb4b6 (round 6, committed 15:06) while this ran. It changed only grader regexes in six lesson.json
files (5.2.8, 5.2.10, 5.2.18, 5.4.4, moshion-gravity and one more bounded-pattern edit); no script.js, solution.js or
prose. The dev server serves the working tree, so the lab sweep (15:00-15:08) straddled the change and items 5, 7, 8, 4,
6, 3, 2, 9b ran after it. Item 7 therefore reflects the new gravity pattern (10 red; 20, 0, -5 green), and every starter
0/N and reference N/N result is the same before and after.

## Lesson ids used (title number is not the id)
5.2.7 = `moshion-gravity`; 5.2.8 = `5-2-3-lab-tune-gravity`; 5.2.14 = `5-2-9-lab-wind-zone`;
5.2.17 = `5-2-11-lab-reaching-the-goal`; 5.2.18 = `5-2-13-a5-2-1-pinball-scene`; 5.2.20 = `5-2-15-challenges`;
5.2.3 = `5-2-random-3-lab-random-spot-and-colour`; 5.3.1 = `5-3-pinball-plan-sketch-the-game`;
5.3.2 = `5-3-pinball-1-reading-from-scene-to-game`; Snake labs = `5-5-snake-4`, `-6`, `-8`, `-11`.

## Item 9: numbers and cross-references in prose changed in rounds 3-5 (static, diff f5e53852..0d039346)
Every lesson.json / content.md line changed in the two commits was read. Cross-references checked against the titles in
the lesson tree (all resolve to the lesson the text names): 5.1.16 Velocity (5-1-15), 5.4.6 Pipes that come and go
(5-4-flappy-5), 5.4.5 A world that scrolls (5-4-flappy-4, which does teach `drawTop()`), 5.3.5 collision reading,
5.3.7 Score one point per touch (pinball-6), 5.3.9 State of the game, 5.2.16 Finished Scene, 5.2.12 Bouncy Ball
(`moshion-bounce`), 5.5.4/5.5.5. Numbers in changed prose and what measures them:
- 5.2.7 step 2: gravity 0 then 20, "falls faster" -> item 7 below (live).
- 5.2.3 "for the first second the corner reads `roll: 0`" -> item 5 below (live).
- 5.2.17 "a few small hops ... that half second the space bar does nothing" -> round-3 measurement was 37 frames (0.62 s)
  between first landing and settle; re-measured in item 9b below.
- 5.2.17 "distance less than 25" matches `dist < 25` in script/solution (static).
- 5.5.4 "below 0, or 20 or more" -> 400/20 = 20 columns, `drawTop()` text positions -> item 2.
- 5.3.2 "a circle 24 pixels wide" -> item 6.
Other changed prose carries no new number (5.4.8 `vel.x` to 0, 5.5.2 `drawTop()` snippet uses 22/20/32, shown in the
reading only).

## Item 8 expected value (static)
5.2.14 right wall is `new Sprite(394, 200, 12, 400, 'static')`: inner face x = 388. Player is 40 wide, so its centre
stops at 388 - 20 = 368. "About x 367" is that minus rounding. Live measurement is in item 8 below.

## Item 1: starter + reference of every lab (live, 32 lab ids, 46 script/solution files)
Each file set into the CodeMirror doc, real Run clicked, 1.8 s wait, then `frameCount` read twice 0.5 s apart.
Result for all 46 runs: no `#error` banner (e = null), frames advance (about +30 per 0.5 s), zero page errors.
Quest card counts: every starter 0/N, every reference N/N. Cards read from `.submit-results li`:
5.2.17 `5-2-11` 0/4 and 4/4; 5.2.18 `5-2-13` 0/4 and 4/4; 5.2.20 `5-2-15` 0/4 and 4/4; 5.2.10 `5-2-5` 0/4, 4/4;
5.2.14 `5-2-9` 0/3, 3/3; 5.2.3 `5-2-random-3` 0/5, 5/5; 5.2.4 `5-2-random-4` 0/5, 5/5; 5.3.4 `pinball-3` 0/4, 4/4;
5.3.7 `pinball-6` 0/3, 3/3; 5.3.8 `pinball-7` 0/3, 3/3; 5.3.10 `pinball-9` 0/4, 4/4; 5.3.12 `pinball-10` 0/1, 1/1;
5.4.4 `flappy-3` 0/3, 3/3; 5.4.6 `flappy-5` 0/3, 3/3; 5.4.7 `flappy-6` 0/3, 3/3; 5.4.8 `flappy-7` 0/6, 6/6;
5.4.11 `flappy-9` 0/1, 1/1; 5.5.4 `snake-4` 0/3, 3/3; 5.5.6 `snake-6` 0/4, 4/4; 5.5.8 `snake-8` 0/3, 3/3;
5.5.11 `snake-11` 0/1, 1/1; `moshion-bounce` 0/4, 4/4. Starters only (no solution.js exists): 5.2.8 `5-2-3` 0/1,
5.2.7 `moshion-gravity` 0/1.
5.2.18 note: in the round-4 advanced sweep the 5.2.18 reference read 0/4 in an older harness; at 0d039346 it reads 4/4.
Lab console pane: "No messages." everywhere except 5.2.4 reference, which shows "Almost!" (a lab message, not an error).
NOT counted here: 5.2.18 "needs Check" per the brief. The 5.2.18 cards here are the regex cards and went green on the
reference without pressing Check; the AI Check button was NOT pressed (see "could not check").

## Item 5: 5.2.3 roll, first-second explanation: FIXED
Reference run, `roll` and `coin` sampled every frame for 900 frames. `roll` is 0 from fc 7 to fc 59, first change at
fc 60 (to 6), then 5, 1, (fc 240 no change, same value), 6, 4, 1, 3, 4, 3, 6, 5, 3, 6, 4 at each multiple of 60.
Values seen: 0,1,3,4,5,6 (never 7, never 0 after fc 60; 2 simply not drawn in 15 rolls). Coin x range 44-366, y range
31-269, so inside 30-370 / 30-270. The step text "For the first second the corner reads `roll: 0`" matches (53 frames
at 0, about 0.9 s from start).

## Item 7: 5.2.7 and 5.2.8 cards when gravity is changed (live, starter with only the gravity line edited): FIXED
`world.gravity.y` read back from the runner, card read after Run.
- 5.2.7 `moshion-gravity`: 10 -> red; 20 -> green; 0 -> green; -5 -> green; `20; // keep` -> green. No error banner.
- 5.2.8 `5-2-3-lab-tune-gravity`: same pattern, 10 red, 20/0/-5 green, no error banner.
So the 5.2.7 step 2 path (0, then 20, leave at 20) ends green, and 5.2.7 is not green at the shipped 10.

## Item 8: 5.2.14 walls, hold d: FIXED
Reference run, player left to settle 2.5 s, `d` held (keydown dispatched into the runner window) for 200 frames:
max player.x 367.5, last x 366.9, vel.x still 4 (pushing), y 349.5 (resting on ground). Right wall inner face
`rightWall.x - rightWall.w/2` = 388.0, player width 40, so the centre stops 20 px short: 367 to 368 (the 0.5 px is the
solver's overlap). Holding `a` for 200 frames: min x 32.7, last 33.1; left wall inner face 12, so 32 expected. The player
does not leave the canvas either way. Matches "holding d stops about x 367".

## Item 4: 5.2.20 two-goal path (live, reference): FIXED
Run, `d` held 120 frames: player reaches x 366.9 on the ground, goal1 collected (collected = 1), goal2 still present.
Then 8 space taps (60 ms keydown, every 55 frames) with `d` still held: the wind zone lifts the player to min y 29.6,
goal2 (360, 120) is collected at fc 273. Lab console: exactly one line, `All goals collected!` (printed once; the
reference then sets `collected = 3` so the `=== 2` test cannot fire again). So the second goal is reachable with
the taught jump + wind, and the message waits for both.

## Item 6: 5.3.1/5.3.2 "ball diameter 24" claim: FIXED
The claim sits in the 5.3.2 reading (`5-3-pinball-1-reading-from-scene-to-game`): "`new Sprite(70, 60, 24)` ... a circle
24 pixels wide". 5.3.1 itself (`5-3-pinball-plan-sketch-the-game`) has no diameter claim. Ran the 5.3.2 fence verbatim in
its own editor (one Run button, no error banner): `ball.d` = 24, `ball.w` = 24, `ball.h` = 24, `ball.shape` = "circle",
`ball.radius` = 12. The ball drops onto the bumper (rotation 14 reads back 14), reaches x 377 against the right wall,
max y 363 on the ground, and passes the left gap region (x 31 at fc 365). `typeof floor` = "function" and `ground`
is the object, so the prose about `ground` vs `floor` is accurate.

## Item 3: floor(random(40,100)) in a pinball sketch: FIXED
Two sketches in the 5.3.2 editor: the 5.3.2 fence, and the 5.3.4 reference, each with 300 calls of
`floor(random(40,100))` added at the top of `setup()`. No error banner in either (so `floor` is not shadowed by
`ground` or anything else). 300 values: all integers, min 40, max 99. In the fence variant `ball.x = floor(random(40,100))`
on the R key worked: the ball was at x 96.8 after R (it had drifted from the reset spot by the time of the read).

## Item 2: Snake text visible above the snake (drawTop): FIXED for 5.5.6, 5.5.8, 5.5.11; 5.5.4 partly measured
Method: for each lab, starter and reference, set a 3-cell snake (or the single block in 5.5.4) on row 1 moving right so it
crosses the score text, and counted near-white pixels (all channels > 200) in the text rectangle on every frame for 110
frames, split into frames where a cell overlaps the rectangle and frames where none does. If the snake covered the
text the count would drop on overlap frames. `typeof drawTop` = "function" in all eight runs, no error banner, no page
errors. Then the same count on the "Game over" rectangle with the cells away and with the cells moved onto it.

| lab | file | text white px, no overlap | text white px, overlap | overlap frames | game-over white px, away / covered |
|---|---|---|---|---|---|
| 5.5.4 `snake-4` | starter | 203 | 203-204 | 29 of 111 | 0 / 0 (see note) |
| 5.5.4 `snake-4` | reference | 203 | 203-204 | 30 of 111 | 117 / 119 |
| 5.5.6 `snake-6` | starter | none (snake over text all 111 frames) | 273-279 | 111 of 111 | 938 / 941 |
| 5.5.6 `snake-6` | reference | 273 | 273-280 | 52 of 111 | 938 / 941 |
| 5.5.8 `snake-8` | starter | 273 | 273-280 | 51 of 111 | 938 / 941 |
| 5.5.8 `snake-8` | reference | 273 | 273-280 | 51 of 111 | 938 / 941 |
| 5.5.11 `snake-11` | starter | 273 | 273-280 | 103 of 111 | 938 / 941 |
| 5.5.11 `snake-11` | reference (score + best line) | 554 | 554-561 | 99 of 111 | 938 / 941 |

Overlap frames really happened (29 to 111 per run) and the text pixel count never fell below the no-overlap count, and the
game-over count did not fall when the cells sat on it. Caveat: the snake adds up to +7 near-white pixels on overlap
frames (a bright edge), small against 203-554, so a half-hidden word could not hide behind it, but the lens counts pixels,
it does not read the words.
Note on 5.5.4 starter: its game-over cell reads 0 because the starter does not end the round at a wall (that is the
student's step 3), `playing` stayed true after sending the block to column 19. The game-over text of the 5.5.4
reference is above and reads 117/119. So "Game over" in 5.5.4 was measured only on the reference.

## Item 9b: 5.2.17 hops claim (live, reference)
"Right after the first drop the player makes a few small hops ... for that half second the space bar does nothing."
Measured with `colliding(ground)` per frame: Run at fc 35, first ground contact fc 90, last frame off the ground fc 128
(0.63 s after first contact), two further touchdowns, hop heights 10 px and 1 px. "A few small hops" holds (two, both
tiny); "half second" is 0.63 s measured, so about right, a slightly generous "half". Matches the round-3 figure (37 frames).

## Status of the brief's items
| # | item | status | evidence |
|---|---|---|---|
| 1 | starter and reference of every lab | FIXED/clean | 46 runs, no error banner, frames advance, starters 0/N, references N/N, no page errors |
| 2 | Snake text above the snake | FIXED (5.5.6, 5.5.8, 5.5.11); 5.5.4 text FIXED, 5.5.4 game-over measured on reference only | table above |
| 3 | floor(random(40,100)) in pinball | FIXED | 300 values, ints 40-99, no error |
| 4 | 5.2.20 two-goal path | FIXED | both goals collected, message printed once |
| 5 | 5.2.3 roll first second | FIXED | roll 0 until fc 60, then 1-6 |
| 6 | ball diameter 24 | FIXED | d = w = h = 24, circle (claim is in 5.3.2 reading, not 5.3.1) |
| 7 | 5.2.7/5.2.8 green at gravity 20 | FIXED | 20 green, 10 red, 0 and -5 green, both lessons |
| 8 | 5.2.14 walls | FIXED | holding d stops at x 367.5, holding a at 32.7 |
| 9 | numbers in prose changed in rounds 3-5 | FIXED for every number with a runtime meaning; others static | items 5, 6, 7, 9b, static diff read |
OPEN: none found.

## Lens summary
- output-claim: items 3-9 above compare each prose claim with the measured output; no mismatch.
- editor-kind: the 17 live fences were covered by the earlier pass and not repeated. The 5.3.2 fence showed one Run
  button and a canvas runner (not a model editor).
- async-output: not re-run (earlier static grep found no setTimeout / .then / Promise in scope).
- silent-no-output: 5.2.20 reference printed its one line. The 5.2.4 reference console shows "Almost!" (see item 1).

## Checks I could NOT perform
- 5.2.18 Check button (AI check) was not pressed; only the regex cards were read. The AI result is not measured.
- Real keyboard events: keys were KeyboardEvents dispatched into the runner iframe window, not browser-level key presses.
- No visual judgement of any frame (no screenshot read); item 2 is a pixel count, not a reading of the words.
- 5.2.7 and 5.2.8 have no solution.js, so the "reference" there is the starter with the gravity line edited.
- Snake 5.5.4 game-over text on the starter (the starter has no wall check, so the round cannot end).
- Prose numbers outside the changed lines were not re-audited; 5.7/5.8-era labs in `5-3-*` and `5-5-*` (non-pinball,
  non-snake) were out of scope.
- The 5.2.18 note in item 1 about an older harness reading 0/4 on the reference is from a stale `alllabs.out`, not from this run.
