# Grids and tile maps (6.9) editors audit: 7 moSHion labs, 3 live blocks, 14 lessons

Run by cs-function-audit on 2026-10-31. Dev server localhost:3002 (DEV_ROLE=student). playwright-cli session `g-audit`,
cookie `dev_student=gaudit` (closed at the end; `mom`, `codehs`, `launcher`, `motion` untouched). No repo file edited.
Measurements, not verdicts: the pass/fail call is the human's.

## Method
- Lesson inventory: runnable editors are 7 labs (6.9.4, 6.9.6, 6.9.7, 6.9.8, 6.9.10, 6.9.11, 6.9.14) and 3 `js live` fences
  (6.9.3, 6.9.5, 6.9.9). 6.9.1 and 6.9.12 are AI-graded written parts, 6.9.13 is a quiz, 6.9.2 has no code fence that runs.
- Gate bypass: marked the 14 lessons completed for `dev_student=gaudit` through the dev stub `POST /api/lesson-state/<id>`,
  then DELETEd only the lab under test. The lesson page keeps a draft in localStorage, so the harness cleared localStorage before
  each starter run (a first run without clearing showed the previous reference code, which is how I noticed).
- Node half: every `script.js` and `solution.js` and every live block run headlessly through `scripts/moshion-harness.mjs`
  (deterministic, engine `kb` and mouse input). A BFS bot walked the real mazes with held arrow keys. Harness files are in the
  session scratchpad `g/`, not the repo.
- Browser half: the real lesson page, starter Run, then reference pasted by keyboard insertText and Run, quest count read, runner
  iframe `frameCount` read twice 500 ms apart, held keys and real mouse clicks into the runner iframe, screenshots. Labs 4, 6, 7, 8,
  10, 11 and live blocks 6.9.3, 6.9.5, 6.9.9.
- Static: `node scripts/check-starters.mjs` ends "every reference scores full, every starter does not" (277 lessons; none of the 7
  labs is in its no-reference list). All 96 lesson-number mentions (28 distinct lessons) in the 14 lessons' lesson.json and content.md, including every "Help:" pointer, resolve
  to a real lesson with that number and title (a regex pass; the 74 unique rows were all matched to a title).
- Load note: the machine's load average was about 90 during the run and a cold lesson page took 30 to 48 s to compile, so several
  browser runs needed retries. Nothing in the results below depends on timing.

## Defects and mismatches (numbered as found)

### D1 (real, reproduced in the real browser) 6.9.5 live block and Try 3: the mouse can never leave the canvas
- Prose (6.9.5, reading): "If the mouse is off the map, the row can be -1 or 10", live block text "Move the mouse off the canvas and the
  line goes away instead of crashing", Try 3: "Delete `r >= 0 && ` from the test and move the mouse above the maze. The sketch stops with an error."
- Measured: `public/moshion/moshion.js` listens for `mousemove` on the canvas element only (lines 3259 to 3278), so `mouse.x/y` stop
  updating when the pointer leaves it. In the real browser I moved the mouse from inside the canvas up through the top edge and 200 px
  beyond: `mouse.y` stayed at 0 and `frameCount` kept advancing (145 to 163), with no error in the page console or the panel. Moving
  right of the canvas left `mouse` frozen at the last inside point (111, 111). The maze fills the whole 400 by 400 canvas, so there is no "above the maze" inside
  the canvas either. Try 3 cannot produce the error the page promises, and the bottom line never "goes away".
- Same family, but this one does work: 6.9.9 Try 2 (the strip above a grid that starts 40 px down is inside the canvas): node removal of
  `r >= 0 &&` and a click at y = 20 stops the sketch with `Cannot read properties of undefined (reading 'length')`.
- Also: before the mouse enters the canvas the line reads `row 0, column 0 holds [#]` (mouse starts at 0, 0), not blank.
- Suggested fix: make Try 3 use a click or a mouse position that is reachable (for example give the maze a 40 px strip above it, as 6.9.9 does),
  and drop "the line goes away" or use `mouse.isOnCanvas` to make it true.

### D2 (minor, number on screen) 6.9.8 win screen reads "level 4 of 3"
- Step 2: "after level 3 the screen says 'You escaped!'". It does, and the authored `drawTop()` also prints `level 4 of 3` at the same moment
  (`levelNum` is 3 after the last goal and the HUD prints `levelNum + 1`). Seen in the real browser (screenshot `ga/shots/8-after-level-3.png`)
  and in node (`coins left: 0 / level 4 of 3 / score: 13 / You escaped! / Press R to play again`). Student code cannot fix it unless they edit drawTop.
- Suggested fix: in the starter and reference `drawTop`, `Math.min(levelNum + 1, levels.length)`, or draw the level line only when `!won`.

### D3 (real, text vs starter) 6.9.6 starter: the player is not "in the corner", it is off the canvas, and the corner reads `[undefined]`
- Description and step 2: "the player always appears at the top-left corner instead of on the P"; step 1: "Nothing changes on screen until step 2".
  Step 3: "The corner of the screen shows `standing on: [ ]`".
- Measured, starter (node, and the real page screenshot `ga/shots/6-starter.png`): the player is created at (0, 0) overlapping the static wall in
  tile (0, 0), the physics pushes it out to x = -13.4, y = 0, which is entirely left of the canvas. No blue square is on screen at all. After
  step 1 only it is still there; after step 2 it stands at (60, 60). The corner text with `tileAt` still empty is `standing on: [undefined]`, never `[ ]`
  (`[ ]` is what open floor reads after step 3, which is true: `[P]` at the start, `[ ]` along the corridor, `[c]` on the coin at x 160 to 200).
- Suggested fix: create the player at `TILE / 2` or at (60, 60) in the starter's placeholder, or reword to "the blue square is nowhere on screen"; say `[undefined]` in step 3.

### D4 (minor, starter comment vs step text) 6.9.4 starter comments
- Starter comment for step 1: "make a Group called walls. Its collider is static ..., and its color is slategray". The step text says `'dimgray'`, the reference uses
  `dimgray`, and `walls = new Group();` is already in the starter, so "make a Group called walls" is stale. (Nothing grades the color.) 6.9.4 step 1 and
  step 2 comments agree with the steps otherwise.

### D5 (minor, help pointer content) 6.9.4 r3 and 6.9.7 r2 to r4 point at 6.9.3, which does not show the thing asked
- 6.9.4 r3 "The goal is its own Group" Help: 6.9.3. 6.9.3's example has only `walls` and `coins`, no goal Group.
- 6.9.7 r2 (score), r3 (`coins.length === 0 && player.overlaps(goals)`), r4 (`won = true`) all say Help: 6.9.3. 6.9.3 has no score, no goal and no `won`
  (it does show `player.overlaps(coins, (p, coin) => { coin.delete(); })`, which is what r1's pointer 6.2.3 also teaches). The pointers resolve to a real lesson,
  but a student following r3 or r4 finds nothing there about goals or winning. Step 2's own text carries the `&&` pattern, so this does not block.

### D6 (minor, forward reference) 6.9.11 step 3 hint 2
- "This is the function a Breakout ball will call later through `hitAt(ball.x, ball.y)`". No lesson in the repo after 6.9 uses `hitAt` or builds a Breakout
  (`grep hitAt lessons/` outside 6-9-grids is empty; `curriculum/modules/6.9_grids-and-tile-maps.md` says a Breakout module "can" be built later).

### D7 (note, 6.9.14 challenge 2 wording)
- "Change the places that test `=== 1` to `> 0`": there are three (drawBricks, hitAt, bricksLeft). Leaving `bricksLeft` unchanged is a silent mistake:
  with row 0 as 2s the words read `bricks left: 32` against 40 on screen (measured in node). The text and hints do not say how many places or name them.
  Works as written once all three are changed (all cleared reads 0, `Cleared!` shows).

### Smaller observations (not defects of the editors)
- In a 1280 by 720 window the 400 px canvas starts at y = 311 and the fixed "Module 6.9" footer bar starts at y = 684, so the bottom 27 px of the canvas is under
  the bar until the page is scrolled. The bottom-strip words of 6.9.6 (`standing on`, y 392) and 6.9.7 (`Grab every coin first!`, y 392) are in that strip. Not tested at other heights.
- 6.9.10 and 6.9.11 (400 by 440 and 400 by 400 canvases) display scaled (380 by 418 for 6.9.10 in this layout), so clicks are still correct (the engine scales mouse
  coordinates) but sizes in the text are not 1:1 on screen.
- In two browser runs `frameCount` read as `ReferenceError` in the runner iframe (6.9.11 reference and 6.9.3 live block) right after a Run and not on re-reads; the
  sketches themselves were verified by other reads in the same run. I take it as a read-timing artifact of my harness, not a lesson defect.

## Per-lab results
Starter and reference, real Run button, 2.5 s later. Quest counts are the page's own counters. "Frames" are `frameCount` read 500 ms apart (30 frames each, 60 fps).

| Lab | Starter run | Starter quest | Reference quest | Frames advance | Page console / pageerror |
|---|---|---|---|---|---|
| 6.9.4 Build the maze | no error | 0/5 | 5/5 | yes | none |
| 6.9.6 Find the start | no error | 0/5 | 5/5 | yes | none |
| 6.9.7 Coins and the goal | no error | 0/4 | 4/4 | yes | none |
| 6.9.8 The next level | no error | 0/5 | 5/5 | yes | none |
| 6.9.10 Light the grid | no error | 0/6 | 6/6 | yes | none |
| 6.9.11 A wall of bricks | no error | 0/6 | 6/6 | yes (starter), reference read hit the timing artifact above | none |
| 6.9.14 Challenges | no error (node only) | 0/1 | not run in the browser | n/a | n/a |

## What each lab does against its text (node harness plus browser)
- 6.9.4: reference reads `coins left: 5`, 58 walls, 5 coins, 1 goal, `level.length` 64 (58 + 5 + 1). Held right/left/up/down from the start: the player stops at x = 347,
  x = 53, y = 53, y = 227 (walls are static, coins and goal are walked through, coins stay 5). The starter has no walls or coins and reads `coins left: 0` as step text implies.
- 6.9.6: see D3. Reference start (60, 60) = "one tile in"; walking right gives `[P]`, `[ ]` ..., `[c]` at x = 168 to 186; real browser: after 700 ms right the player is at x = 186 on `c`, then down stops at y = 67 against the wall.
- 6.9.7: a held right key picks the first coin in the real browser (coins 5 to 4, score 0 to 1). With 4 coins left, standing on the goal keeps `won` false and draws
  `Grab every coin first!` (draw ops checked in node; the bottom strip was under the footer bar in my screenshot). All coins collected then the goal: `won` true,
  `You escaped!`. The shortest walk to the goal in this maze already passes over 2 coins (so "try the goal first" lands with 3 coins left, still the message).
- 6.9.8: the three maps are 10 by 10, one P and one G each, 5, 4 and 4 coins, all solvable (BFS). A held-key bot clears all three levels: levelNum 0 to 1 to 2 to 3, the
  player lands on each new P (60, 60), coins reset to 5, 4, 4, `won` true after level 3, R restarts at level 1 with 5 coins and score 0. No sprites leak between levels
  (65 sprites on level 1 before and after a full game and R). Same in the real browser by teleporting onto each coin and goal. See D2 for the win-screen HUD.
- 6.9.10: reference draws 64 cells with black outlines; `lit: 0 of 64`, three clicks read `lit: 3 of 64`, one off reads 2. Clicks in the 40 px strip under the grid and at
  the edges (399, 399) cause no error. The text's claim holds: with the bounds check removed a strip click gives `Cannot read properties of undefined (reading '4')` and the sketch stops (frames stop at 6).
  Real browser: 3 then 2 lit, strip clicks leave 2.
- 6.9.11: 40 bricks, `bricks left: 40`, a click on the first brick gives 39 and score 10, a second click on the same place does nothing, y = 60 is row 0 and y = 159 is row 4,
  y = 160 and above-wall clicks do nothing. Removing the bounds tests, or leaving only `r >= 0`, stops the sketch on a click above or below the wall exactly as the step says.
  Forgetting `- TOP` removes the wrong brick (a click at y = 70 clears row 3). All 40 clicks: `bricks left: 0 / score: 400 / Cleared! / Press R for a new wall`; R brings back 40. Real browser: same numbers.
- 6.9.14: the starter is the 6.9.11 reference. Challenge 1 as written gives 50, 40, 30, 20, 10 by row. Challenge 2 as written (row 0 of 2s, `-= 1`, `silver`, three `=== 1` to `> 0`):
  first hit on row 0 scores 10 with the brick still there, second removes it, all cleared reads 0. The reference (all three) reads 8 by 5 from `SHAPE`, `bricks left: 32`, first hit scores 50.

## Live blocks (3 `js live` fences), real lesson pages
Each page loaded, the block's own Run clicked, one runner iframe mounted (sandbox `allow-scripts allow-downloads allow-modals`), frames advancing, no page console or pageerror events, no Console pane (none prints).
- 6.9.3: `tiles in the level: 34 / walls: 30 coins: 4` as the text implies (four coins). Holding right through the real keyboard walks the player through the two coins on its row (coins 4 to 2, tiles 34 to 32).
  Tries (node): 1 wall to space = 33 tiles, 29 walls; 2 no coin legend = 30 tiles, 0 coins; 3 TILE = 30 shifts the first tile to x = 20 with width 30, `15, 15` puts it at 15 and the maze spans 300 px; 4 a letter deleted gives 33 tiles and 29 walls (a hole at the row's end). All four sentences are right.
- 6.9.5: `P was found at 60, 60`; Try 1 (`'G'`) puts the square at 340, 340; Try 2 differs only in the right half of a tile (mouse 70 gives row/col 1 with floor and 2 with round). Try 3 and "goes away" are wrong, see D1.
- 6.9.9: grid `010010` row 0; a real click on cell (0, 0) gives `110010`; a click in the strip above the grid (y = 15) leaves it unchanged. Tries 2 (strip click with `r >= 0` removed stops the sketch) and 3 (TOP = 0 still works; the words are covered by the grid) are right as written.

## Help pointers and hints
- All 96 numbered mentions (28 distinct lessons) resolve (3.3.20, 2.2.19, 2.4.24, 3.2.11, 3.5.3, 5.5.2, 5.2.6, 2.1.20, 2.1.29, 2.1.33, 3.3.21, 6.2.3 and every 6.9.x). Spot checks: 5.2.6 sets `world.gravity.y = 10` as 6.9.2 says; 5.5.2 defines `cellToPixel`; 6.2.3 teaches the `overlaps(group, (a, b) => ...)` callback that 6.9.7 step 1 cites.
- Hints that name an earlier lesson all point backward (6.9.8 hint to 6.9.2, 6.9.5, 6.9.6, 6.9.7; 6.9.11 to 6.9.10; 6.9.10 to 6.9.9). The only forward pointer is D6. For D5, the pointers resolve but two of the five goal and score requirements point at a lesson that never shows a goal.

## Lenses
- output-claim: no sketch calls `console.log`; the "claim" is the HUD and the prose, covered above (D1 to D7).
- editor-kind: every fence is a moSHion sketch and mounted the runner iframe; no console fence exists in 6.9 (grep for `console.`, `setTimeout`, `setInterval`, `.then(`, `Promise`, `async`, `await` over lessons/6-9-grids-* returns nothing).
- async-output: nothing async in any file.
- silent-no-output: every starter and reference draws at least one HUD string from the first frame; none is empty. The only silent error shape is in the text on purpose (the bounds removals), and each stops the sketch visibly in node.

## Checks I could NOT perform
- The audit.mjs CS lens runner (bookSHelf) does not apply to shCode lessons; I used the moSHion harness and the real page instead.
- 6.9.14 and 6.9.4 held keys in the real browser (6.9.4 walls were measured in node only; 6.9.14 was node only, no browser run, no Submit).
- 6.9.6 starter in the real browser: the "no blue square on screen" claim comes from the screenshot plus node, not from reading `player.x` in the page (two attempts to read it timed out under load).
- Grader alternates: I did not test other valid forms (`map[r].indexOf('P')`, `charAt`, `Math.floor`) against the regex requirements, nor the capstone-style "reference scores full" beyond `check-starters`.
- The AI-graded parts 6.9.1 and 6.9.12, the quiz 6.9.13 and 6.9.2's text were read, not run or submitted.
- A real-keyboard full playthrough of 6.9.7 and 6.9.8 (the bot ran in node with the engine's key input; the browser used a few real key holds and teleports).
- Pixel contrast or layout beyond one 1280 by 720 window.
- Reading `frameCount` again after the two timing artifacts above.

## Summary for the human's call
| # | Lesson | Severity | One line |
|---|---|---|---|
| D1 | 6.9.5 live block, Try 3 | real, reproduced | the mouse never leaves the canvas, so "the line goes away" and Try 3's crash cannot happen |
| D2 | 6.9.8 | minor | win screen reads `level 4 of 3` |
| D3 | 6.9.6 starter | real, text vs state | player is off canvas (x = -13), not in the corner; corner reads `[undefined]`, not `[ ]` |
| D4 | 6.9.4 starter comment | minor | says slategray (step says dimgray) and "make a Group" for one already made |
| D5 | 6.9.4 r3, 6.9.7 r2 to r4 | minor | Help: 6.9.3 has no goal, score or won |
| D6 | 6.9.11 hint | minor | a Breakout ball "later" calls `hitAt`, no such lesson exists |
| D7 | 6.9.14 challenge 2 | note | three `=== 1` places, none counted or named |

Nothing found that blocks a student: every starter runs without error, every reference runs with no console output and scores full, each lab's step claims about
counts, coordinates and what the words read were measured and hold (except D2, D3), and the three live blocks render and run.
