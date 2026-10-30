# Editors audit: modules 5.2 (5.2.1-5.2.20), 5.3, 5.4, 5.5

Run by cs-function-audit on 2026-10-30. Dev server localhost:3002 (DEV_ROLE=student), playwright session
`lens-editors`, cookie `dev_student=editors`. Measurements, not verdicts: every item gives the claim, the
measured fact, and the lesson id + step. The pass/fail call is the human's.

## How the four lenses were run (and what was NOT)

`audit.mjs` / `cs_lenses.mjs` are bookSHelf tools for published bookSHelf pages. shCode lessons are not
bookSHelf pages, so I did not run them. I applied the four lens definitions by hand with a playwright
harness: each `js live` fence (20 of them) and each moshion lab (24 labs + 2 moshion-* lessons) was run with
the real Run button; the iframe's `frameCount`, sprite count, `#error` banner and canvas pixels were read;
labs were run twice (starter, then `solution.js` pasted in) and the Console pane text and Quest count read.
Keys were driven by dispatching KeyboardEvents into the iframe (plus a few real-keyboard checks).

Sanity floor: `blocks_found` equivalent is non-zero everywhere (20 live fences, 26 lab pages), no zero-probe pages.

Lens summary (counts, not a pass/fail):
- editor-kind: 5 `js live` fences call `console.log` with no `console` flag, so no console pane (F7). Labs all
  render with a Console pane and it does show output (5.2.4, 5.2.16, 5.2.20 lines appeared). No console-vs-drawing mixups found.
- async-output: 0 hits. No `setTimeout`/`setInterval`/`.then`/`Promise`/`async` anywhere in scope.
- silent-no-output: 1 hit, the empty 5.2.20 starter (F10).
- output-claim: F1-F6, F8, F9, F11 below are documented numbers/behaviour that the block does not produce.

Things that passed: every Run produces a canvas with no `#error` banner and `frameCount` advancing, on all 20
live fences and all 26 lab starters and solutions (blank starters 5.2.12/5.2.18/5.2.20/5.3.4 are blank by design).
Every reference `solution.js` took its Quest to N/N (5.2.18 is AI-checked, so 0/4 until Check; not a defect).
Verified matches: random() fixed seed (5.2.3 lab `5-2-random-3`: two Runs gave identical x/y/roll/colour sequences, rolls stayed
1..6); sparkles beat (12 squares at frame 388 = frames 30..360); 5.2.4 lab (`5-2-random-4`) one-shot and halfway check (`Almost!`
once, `Time is up!` once, lamp flips at 30/60); pipes spawn at frames 90/180/270 and `pipes.length` holds at 2-3
(5.4.6 lab s3); flap `-4` at gravity 20 rises about 38 px, `-8` rises 180 px (to y=20, "nearly to the top"),
gravity 40 rises 7 px ("barely holds"); score per pipe once (5.4.7 lab); crash freezes (gravity 0, pipe vel.x 0),
R clears pipes and restarts (5.4.8 lab); snake eats 3 -> 6 cells, score 3 (5.5.6 lab s3); no-reverse steering and
wall stop (5.5.4 lab); `isBody` true/false, food never lands on body in 500 draws, step into body ends round (5.5.8 lab);
bounciness 1 keeps a constant apex (moshion-bounce s3); two-goal finish prints `All goals collected!` once (5.2.20).

## Findings

### F1 (high): pinball table deflects the ball off the left edge; the documented floor/goal behaviour never happens
Shared table: bumper (200,160) 140x16 rotation -12, goal (330,250), ball dropped at x=200. Measured on every copy:
the ball hits the bumper, goes left, leaves the canvas at frame ~230 (x=-91 at fc 233, x=-328 y=882 by fc 383),
and never touches the floor or the goal. Score stays 0 forever.
- `5-3-pinball-1-reading-from-scene-to-game`, Try it: "the ball falls, hits the bumper, and rolls down to the floor". After 6 s the canvas shows only the bumper.
- `5-3-pinball-2-example-the-table-and-the-goal`, Step 1 ("rolls... lands"), Step 2 ("falls past [the goal] and lands on the floor"), Step 3 ("push the ball into the gold block... score climbs so fast... keeps climbing while the ball rests against the block"): score 0 at every sample over 6 s and after pressing R; the ball is at x=-74 after R.
- `5-3-pinball-3-lab-build-the-table`, s4 ("somewhere the ball could reach") and s1 ("you should see it drop"): reference solution ball trace 200:58 -> 196:131 -> 149:75 -> 52:191 -> -44:207 -> -188:211.
- `5-3-pinball-6-lab-score-one-point-per-touch`, s1 ("push the ball into the gold block") and s3 ("Press R three times and let the ball land each time. The score should read exactly 3"): reference solution, 3 s then R x3 with 3 s each: score 0, 0, 0, 0; ball resting at x=-23. There is no key that moves the ball, so "push" is not possible. Quest still shows 3/3 (regex only).
- `5-3-pinball-9-lab-lose-and-start-again`, s2: "Game over" flips only after the ball has crossed y>400 off-canvas: playing true at fc 317, false at fc 390 (about 6 s of empty canvas first).

### F2 (high): 5.3.5 reading numbers are wrong and its "Try this" is backwards
`5-3-pinball-4-reading-a-collision-is-not-an-event`, Try it ("What you'll see") and Try this:
- Claim: "score reads 1 - not 600. Press R and it becomes 2." Measured (bounciness 0.2, goal bar): 3 after the first landing (three separate contacts as it settles), 6 after R, 9, 12. The "count once per touch" demo counts three.
- Claim: delete `wasTouching = touching;` -> "The score now climbs once and stops, because wasTouching stays false forever". Measured with that line removed: fc 70 score 2, fc 131 score 37, fc 221 score 127, fc 341 score 247, fc 521 score 427, i.e. +1 per frame while touching, exactly the original bug (`touching && !false` is just `touching`). The prose's explanation is also logically reversed.

### F3 (medium): 5.3.6 example speeds and counts
`5-3-pinball-5-example-the-score-that-climbs`:
- Step 1: "several hundred within a second". Measured 60 per second (score 1, 31, 91, 151 at fc 65, 125, 185, 245). Contradicts 5.3.5's own "sixty points a second".
- Step 2: "one point per landing. Press R three times and the score reads 3." Measured: 3 after the first landing, 6, 9, 12 after the Rs (three contacts per drop, same cause as F2).

### F4 (medium): 5.3.9 reading never reaches Game over
`5-3-pinball-8-reading-the-state-of-the-game`, Try it: "touches the gold bar once (score 1), and keeps falling. Once it passes the bottom the words Game over replace the play area." Measured: score 3; ball comes to rest on the bar at (200,228) and stays (fc 112 through 653 unchanged), `playing` stays true, "Game over" and "press R to play again" are never shown. The whole else-branch the reading teaches is unobservable without editing the sketch. Its "Try this" (remove `ball.vel.y = 0`) needs R pressed mid-fall, which the text does not say.

### F5 (medium): 5.3.8 lab cannot show three values, and one drop scores 120
`5-3-pinball-7-lab-three-bumpers-three-values`, s3: "the middle bumper is worth 5 and the bottom one 10... one hit on the bottom bumper should move the score by 10." Reference solution: ball starts x=220, directly above the 10-point bumper. Every score sampled across a run and three R drops was a multiple of 10 (10, 20, ... 140); the 1- and 5-point bumpers (x=110, x=330) were never touched. A single drop climbed 10 -> 120 in about 4 s as the ball settled (wasTouching flickers true/false while it jitters), then held at 120.

### F6 (medium): holding the key does not "hover"
`5-4-flappy-2-example-the-bird-that-flaps`, Try this 3 ("kb.pressing... The bird freezes in a hover") and `5-4-flappy-1-reading-gravity-and-the-flap` table ("the bird floats and cannot fall", prose "hover in place"). Measured with `kb.pressing(' ')` and the key held: vel.y is -4 every sample and y goes 324, 297, 274, 251, 228, ... 18 then wraps to 200 and climbs again (about -23 px per 100 ms). The bird climbs steadily and leaves the top; it does not stay in place. ("cannot fall" is true.)

### F7 (medium, editor-kind): console.log in fences with no console pane
Five `js live` fences log with `console.log` but are plain moSHion editors (no `console` flag), so output goes only to browser devtools. The prose describes the output as something the student reads:
- `5-2-2-reading-gravity`: "watch ball.y climb every second as the ball falls". Devtools logs were 213, 255, 255, 255, 255, 255: it climbs once, then holds at 255 (ball lands by about 1.2 s).
- `5-2-4-reading-ground-check`: "touching prints every frame... space pressed once prints only on the first frame". Both are true (234 `touching` in 301 frames; 1 `space pressed once` on a 600 ms hold) but neither is visible on the page.
- `5-2-10-reading-delete`: "pressing d again logs nothing more". Logs `a deleted` once, `b visible: false/true` per v press; invisible.
- `5-2-12-example-finished-scene`, Step 2 ("the win message can only ever print once"): `You win!` prints once to devtools only.
- `5-2-random-2-example-sparkles`, What you'll see ("the console prints its line once"): logs once at frame 300, devtools only.
For contrast the lab pages do have a Console pane and it showed `Almost!`, `Time is up!`, `You win!` and `All goals collected!`. Adding `console` to those five fence info strings would fix it.

### F8 (low-medium): `vel.y = -3` is not "fighting gravity", it launches the player
`5-2-8-reading-forces-vs-velocity` (5.2.13), Try it: "replace that line with player.vel.y = -3 ... fighting gravity outright". Measured: y=-4 at fc 23, -109 at fc 59, -374 at fc 150, still rising; the player leaves the top of the canvas within about 0.4 s and never returns. The applyForce half is true but mild: at fc 58-59 y is 183 with the force versus 203 without; landing at fc ~83 versus ~70.

### F9 (low): the jump leaves the canvas
`5-2-5-lab-add-a-jump` (5.2.10) reference: vel.y -8, gravity 10, 400 px canvas: apex y=-30 (the player is above the top edge). `5-2-12-example-finished-scene` (5.2.17), Step 1 "drift upward through the wind zone above y = 200": one jump reaches y=-77 and the player is off screen for about 1 s. Mid-air second tap does not re-launch (vy -5.8, falling), as taught.

### F10 (low, silent-no-output): 5.2.20 starter Run does nothing and the button sticks on Stop
`5-2-15-challenges` (5.2.20), starter is an empty file. After Reset (starter) and Run: the button reads "Stop" at 1 s, 3 s and 6 s, the preview still says "Click Run to execute your moSHion sketch.", no runner iframe exists, Console is empty. No message says the script is empty.

### F11 (low): "same table as 5.2.18" is not
`5-3-pinball-1-reading-from-scene-to-game` ("That is the whole scene from 5.2.18") and `5-3-pinball-2-example-the-table-and-the-goal` Step 1 ("Same table as 5.2.18"). 5.2.18's reference has two bumpers (120,120) -20 and (280,220) +20 and a floor at y=380; the 5.3 table has one bumper (200,160) -12 and a floor at y=385.

### F12 (low, latent): `floor` sprite name breaks the `floor()` that 5.2.1 just taught
5.2.6 and 5.2.11 readings (`5-2-2-reading-gravity`, `5-2-6-reading-bounciness-friction`) and every 5.3 pinball lab/example declare `let ball, floor` and `floor = new Sprite(...)`. 5.2.1 teaches `floor(random(...))` as a function. Reproduced in the 5.2.11 editor: with `let floor` in scope, `floor(random(100, 200))` shows `TypeError: floor is not a function @ sketch.js:9:12`. No lesson in scope hits it today (no file both declares `floor` and calls `floor(`), but a student combining the two will.

## Checks I could NOT perform
- Frame timing in real seconds: the headless browser ran about 30 fps in several runs (bounce settling took longer than on a 60 fps machine), so I verified frame-based claims (frame 90/180/270, frame 300, frame 70) in frames, and any seconds-based claim only approximately.
- Real-keyboard behaviour is only partly covered: most key presses were dispatched KeyboardEvents into the iframe. Real keyboard input worked when the iframe was clicked first (delete reading `v`, ground-check Space hold), but I did not test a student who has not clicked the preview (focus on first press).
- Pixels/visual appearance: I read canvas non-background percentage and a few screenshots only; no judgement on layout, colour or text overflow (eyes-pages job). The text inside the canvas (score, "Game over") was read through variables, not OCR.
- 5.5.8 bite by actually steering into the body: tested by constructing the segment and calling `step()`, not by playing it; likewise snake growth was tested by moving the food in front of the head, not by steering to random food.
- 5.2.14 wind zone lab and 5.2.3/5.2.7 (no `solution.js`) were run (no error, canvas drawn) but their step wording was not measured beyond that. 5.2.19 (`5-2-14-a5-2-2-vel-vs-applyforce`) is a written assignment with no editor. The other plan/playtest/quiz screens have no runnable editors and were not walked.
- Every step of every `js` (non-live) fence in the readings: those are static code, not editors; I read their claims against the live blocks that exercise the same code (frame 90/180/270 checked on the 5.4.6 lab).
- AI Check on 5.2.18 (Quest cards), Commit, Submit: out of scope.
- Not touched: repo files (only this file written), codehs/mom sessions. Side effects: dev server in-memory state for `dev_student=editors` marked the scoped lessons completed (to bypass the sequence lock), and my solution pastes persist in that browser's localStorage; session `lens-editors` is closed.
