# Capstone editors audit: Defender (5.9, 5.10, 5.11), 26 lessons

Run by cs-function-audit on 2026-10-31 against c7d1c6bf. Dev server localhost:3002 (DEV_ROLE=student) was up (HTTP 200).
playwright-cli session `h-editors`, cookie `dev_student=heditors`. Measurements, not verdicts: the pass/fail call is the human's.
Written early and appended as checks finished; complete as of the final section.

## Method
- Gate bypass: marked the 26 lessons completed for `dev_student=heditors` through the dev server's in-memory
  `POST /api/lesson-state/<id>` (the same stub earlier rounds used), and DELETEd the lab under test before opening it.
  Nothing in the repo was edited.
- Node half: every `script.js` (starter) and `solution.js` was run headlessly through `scripts/moshion-harness.mjs`
  with synthetic key input (`box.input.keyDown/keyUp`), reading sketch globals with `vm.runInContext`. Harness files are in
  the scratchpad `h/`, not the repo.
- Browser half: the real lesson page, CodeMirror set by keyboard insertText, the real Run button.
- Lesson inventory: 11 moSHion labs (5.9.4, 5.9.6, 5.9.7, 5.10.2, 5.10.5, 5.10.7, 5.10.8, 5.11.4, 5.11.5, 5.11.6, 5.11.9),
  4 `js live` fences (5.9.3, 5.9.5, 5.10.6, 5.11.3), the rest are plans, readings and quizzes with no runnable editor.
- Static grade check: `node scripts/check-starters.mjs` ends "every reference scores full, every starter does not"
  (269 lessons; none of the 11 labs is in its no-reference list).

## Defects and mismatches (numbered as found)

### D1 (minor, text vs sketch) "three enemies in a column" is not what the sketch draws: 5.10.6 live block, echoed in 5.10.7 s3
- 5.10.6 prose: "wave 1 arrives: three enemies in a column, one above the other" and "`-20 - i * 50` ... is what makes the
  column". 5.10.7 step 3: "stacks the wave in a column above the top".
- Measured: each enemy gets its own `40 + floor(random(8)) * 45`. Wave 1 x values on one run: [40, 265, 355]; wave 2 [130, 355, 220,
  265]; wave 3 [130, 85, 355, 40, 175]. They are staggered 50 px apart vertically in random lanes, never one column.
- Suggested fix: say "in a staggered line above the top, each in a lane of its own" (or "one above the other, in random lanes").
  The later bullet "picks one of eight columns" is right and can stay.

### D2 (minor, number claim) 5.9.3 "cooldown runs 12, 11, 10 ... down to 0" between two shots
- While Space is held the HUD reads 12, 11, ... 1, then 12 again (frame list: 12,11,10,9,8,7,6,5,4,3,2,1,12,11,10,9). It never
  shows 0 between shots because the countdown to 0 and the refill to 12 happen in the same `draw()` before `drawTop()`.
  0 appears only after Space is released (6,5,4,3,2,1,0,0,0 measured) or with COOLDOWN = 0.
- Suggested fix: "runs 12, 11, 10 ... down to 1 and starts again at 12; let go and it settles at 0."

### D3 (cosmetic, starter state) 5.10.7 starter: "wave: undefined" is drawn on top of "base: 3"
- Real browser, real canvas (screenshot of the 5.10.7 starter after Run): the HUD line reads `score: 0   wave: undefinebase: 3`.
  `wave: undefined` is 15 characters at 18px monospace starting at x = 165, so it ends near x = 327; `base: 3` starts at x = 310.
  Step 1 correctly says the top "says `wave: undefined`" but a student sees two overprinted strings, not two readable ones.
  (5.9.7's starter, by contrast, does what its text says: `base: undefined` at x = 310 runs off the right edge, only `base: und`
  is visible. That one is stated in the step and is fine.)
- Suggested fix: add "and it runs into `base:`" to step 1, or draw the wave HUD at x = 150 in the starter (ends near 312 and
  still collides), or print `'wave: ' + wave` after `base:` is moved; the least invasive is the one-sentence note.

### D4 (minor, hint code vs "in the middle of the screen") 5.9.7 step 3 hint
- Hint: `if (!playing) { text('Game over', 122, 190); }`. Coordinates 122 / 190 are the reference's, which sets `textSize(30)`
  first (line 5.9.7 solution.js drawTop). The step text and hints never say to change the size. A student who types the hint as
  given draws it at the HUD's 18px: `Game over` spans x = 122 to about 219, centre 170, not the canvas centre 200, and is the same
  size as the score. It runs and it grades green (r4), but it is not "in the middle" and not the screen the solution shows.
- Suggested fix: make the hint `textSize(30); text('Game over', 122, 190);` and say the second line is smaller
  (`textSize(14)` then `text('press R to play again', 128, 216);`), or drop the coordinates from the hint.

## Per-lab results, real lesson page (starter and reference, real Run button)
Reference code and starter set in the editor by keyboard insertText, run by the Run button, 3.5 s later: quest count, frame count
read from the runner iframe twice 500 ms apart, Console panel text, page `console` and `pageerror` events. Frame advance is
about 30 frames per 500 ms in every run (60 fps).

| Lab | Starter quest | Reference quest | Frames advance | Console panel | page console/pageerror |
|---|---|---|---|---|---|
| 5.9.4 Fly and fire | 0/5 | 5/5 | yes | No messages | none |
| 5.9.6 Hit the drone | 0/3 | 3/3 | yes | No messages | none |
| 5.9.7 Hold the base | 0/5 | 5/5 | yes | No messages | none |
| 5.10.2 A field of enemies | 0/5 | 5/5 | yes | No messages | none |
| 5.10.5 Shoot them down | 0/5 | 5/5 | yes | No messages | none |
| 5.10.7 Waves | 0/4 | 4/4 | yes | No messages | none |
| 5.10.8 Debugging | 1/2 | 2/2 | yes | No messages | none |
| 5.11.4 Enemy takes over | 0/6 | 6/6 | yes | No messages | none |
| 5.11.5 Bullet | 0/6 | 6/6 | yes | No messages | none |
| 5.11.6 A Spawner | 0/6 | 6/6 | yes | No messages | none |
| 5.11.9 Challenges | 0/1 | 1/1 | yes | No messages | none |

5.10.8 starter is 1/2 by design (r2 the kill splices all three arrays is green, r1 the landing is red).
Alternate forms the text promises:
- `removeEnemy(j)` helper ("the check reads that function too"): 5.10.2 reference rewritten with the helper 5/5, 5.10.5 5/5,
  5.10.8 step 4 form 2/2.
- 5.11.9 "any one of them turns it green": best score only 1/1, boss wave only 1/1, Ship class only 1/1, all three 1/1;
  a comment that only names them (`// my rule: a best score, a boss every fifth wave (this.wave % 5 === 0), a Ship class with
  this.cooldown`) stays 0/1. Good in both directions.
- Editors show the right file: the editor's visible text equals the starter only for short files (5.9.4); longer ones are
  virtualised by CodeMirror so a full-text compare is not meaningful. The 0/N and N/N counts above are the evidence that the
  intended code was in the editor.

## What each lab does against its text (node harness, deterministic, keys held through the engine's own `kb`)
5.9.4: starter, hold left 200 frames: `ship.x` = -800 (slides off, as step 1 says). Reference: pins at 20 and 380. Hold Space 180
frames: shots at frames 0, 12, 24 ... 168 (five a second, evenly spaced, "about five a second" true), `shots alive` max 4, never
climbs ("4 or fewer" true).
5.9.6: with the ship under the drone and Space held, each shot adds exactly 1 (score steps 0>1>2... one per hit), the drone is
back at y = -20 on the hit frame. Starter: shots pass through, score 0.
5.9.7: starter `base: undefined`; reference baseHp 3>2>1>0 at frames 258, 519, 780, `Game over` + `press R to play again`
drawn, `playing` false. R: baseHp 3, score 0, bullets 0, sprites back to 3 (ship, base, drone).
5.10.2: reference: crimson `1` and orange `3` labels; landings at frames 449, 509, 569 (about 9.5 s), then `Game over`; R leaves
exactly 2 sprites (ship, base) and arrays [0,0,0]; new enemies arrive again. Starter: no enemies at all, as step 1 says
("nothing shows yet").
5.10.5: a tough enemy's label goes 3, 2, 1 and it scores 30; a crimson scores 10; arrays stay [n,n,n].
5.10.7: R mid-wave empties the field, wave back to 0, wave 1 again after the 60-frame pause. Wave sizes 3, 4, 5.
5.10.8 symptom (the real thing the step describes), starter code: first landing at frame 579; shooting the other two leaves
`enemyHp` = [3] vs `enemies` = []; wave 2 enemies' labels [1,1,3,1] against `enemyHp` [3,1,1,3,1]. Shooting the lowest
enemy: label sequence `1,1,3,1` then `2,1,3,1` (the 1 goes UP to 2), then the enemy dies on the third shot. The orange 3 dies
in one shot. With the one line added, the sequence is `1,1,3,1` then it dies on the first shot. Every sentence of the report
reproduces. The hint `text('lengths: ' ...)` runs and shows `lengths: 0 1 0` on the starter and `0 0 0` on the fix.
5.11.4, 5.11.5, 5.11.6 references and the 5.11.9 starter: played frame for frame against the 5.10.7 (Part B) reference with the
same seeded `Math.random` and the same bot (12000 frames, reached wave 9, score 940, game over once, R once): score, base hp,
`playing`, wave, bullet count, enemy count, every enemy's x/y and the HUD text were identical on every frame; the only
difference is the new `enemies faced` line in 5.11.6+. "The game must play exactly as before" is true.
5.11.9 reference: boss on wave 5 is 10 hp, speed 0.875 (half of 1.75), purple, worth 100, label `10`; `best` survives R
(1040 stays after R, score back to 0).

## Draw order / words readable above sprites (drawTop)
Every HUD string (`score:`, `base:`, `wave:`, `best:`, `Game over`, `press R`, `enemies faced`, `shots alive`, `lengths`) in all
22 starter and reference sketches was checked frame by frame for 1500 frames, including the game-over frame with enemies parked
behind the words: in the recorded draw ops, every one of those fillText ops comes after the last sprite shape op. 0 frames
violate it. A real-browser screenshot of the 5.11.6 reference at game over shows `Game over`, `enemies faced: 3` and
`press R to play again` clear of everything.

## Live blocks (4 `js live` fences), real lesson pages
Each page loaded, the block's own Run button clicked, frame counter read twice 500 ms apart, then Space held 2 s through the real
keyboard on the focused runner iframe, then the block's variables read. No page console or pageerror events on any of the four. None has a
Console pane (none calls `console.log`, so the plain-editor kind is correct).
- 5.9.3: frames advance (149 to 179); Space held 2 s: `fired` = 10, `bullets` = 2. Ten shots in two seconds is the "five a second" claim.
  Try-this 1-3 measured in node: COOLDOWN 0 = a shot every frame (240 in 240, 34 alive), 4 = every 4 frames (15/s), 30 = every 30 (2/s),
  deleting the countdown line = exactly one shot then never. All four sentences are right. Only D2 above is off.
- 5.9.5: Space under the drone scores 1 per hit in the real browser (`score` 1 after the first hit). Node mutants: deleting
  `resetDrone();` = the drone keeps falling and each shot still adds 1 and vanishes (31 in 400 frames); also deleting the two removal lines =
  a single shot adds 4 (+1 on four consecutive frames) and the drone passes through; `colliding` instead of `overlaps` = 0 points. The text says "about 4": exactly 4.
- 5.10.6: `pause` starts at 60 (58 after two frames), wave 1 at frame 57 with 3 enemies, wave 2 with 4, wave 3 with 5; the gap after
  the field clears is 90 frames every time. Try-this 1: 36 on the field at once and a wave every 90 frames. Try-this 2 `wave * 2` gives 2, 4, 6, 8, 10. Try-this 3: gap 10. Only D1 is off.
- 5.11.3: `in the list` and `sprites on screen` equal on every one of 900 frames. Try-this 1 (remove loop deleted): 861 of 900 frames differ,
  up to 22 ghosts. Try-this 2 (filter first): the same 861 and 22. Both sentences are right.

## Static prose checked against the lessons
- 68 cross-references of the form `N.N.N (Kind: Title)` in the 26 lessons all resolve to a lesson with that number and title.
- 5.11.1's numbers: Part B reference has 8 `splice` calls, 13 lines naming `enemyHp`/`enemyWorth`, 2 copies of the removal, 138 code lines;
  Part C reference 177 code lines. All right as written.
- 5.9.1's one-paragraph spec (400 x 400, a shot at most every 12 frames, crimson 10 / orange 30, every third enemy tough, 3 base hp, `wave + 2`
  enemies) matches the code. 5.9.2's "at most 5 shots a second (60 / 12)" and 5.9.8 Q1 (`5` shots in 60 frames: shots at 0, 12, 24, 36, 48) match.
- 5.10.4's "missing break" TypeError: with the `break` removed from the 5.10.5 reference, one shot hitting the second or third enemy in the
  array stops the sketch with `TypeError: Cannot read properties of undefined (reading 'overlaps')`; hitting the first enemy does not crash. The text matches.

## Lenses
- output-claim: no sketch prints; the "claim" here is the HUD and the prose, covered above (D1-D4 are the mismatches).
- editor-kind: no `console.log` anywhere in these 26 lessons (grep over content.md, script.js, solution.js), so no console fence can render as a
  model editor and no drawing fence lacks a canvas. All 11 labs and 4 live blocks mount the moSHion runner iframe.
- async-output: no `setTimeout`, `setInterval`, `.then`, `Promise`, `async`, `await` in any of the 26 lessons' files.
- silent-no-output: every starter and every reference draws at least one HUD string from the first frame; none draws nothing.
  (The 5.9.4 starter, which does nothing the student asked for yet, still reads `shots alive: 0`.)

## Checks I could NOT perform
- A held key through the real browser inside the 11 lab pages (labs were driven in node with the engine's `kb`; only the four live blocks
  got a real keyboard press, and 5.9.3 and 5.9.5 agree with the node numbers, so the two halves match, but a lab-page key press was not made).
- A pixel-level contrast measurement. Readability was checked as draw order (every HUD string after the last sprite shape op) plus one real
  screenshot of 5.11.6 at game over and of the 5.10.7 and 5.9.7 starters; I did not screenshot every game-over screen in a real browser.
- The four assignment lessons (5.9.1, 5.10.3, 5.11.2, 5.11.7) and three quizzes: no runnable code editor, written AI-graded responses and
  multiple choice. I read their text and checked the numbers in it; I did not run the AI grader or submit.
- The `/` route returned HTTP 500 once on the very first cold request of this session (dev server compiling, logged by playwright-cli as
  "Failed to load resource: 500 @ http://localhost:3002/"). Not reproduced on any later load (200) and not in the capstone lessons; noted only.
- Real-browser re-run of every node scenario (waves, game over, R): node harness with `box.input` and a seeded random was the instrument.

## Summary of defects (for the human's call)
| # | Lesson | Severity | One line |
|---|---|---|---|
| D1 | 5.10.6 live block, 5.10.7 step 3 | minor (text vs sketch) | "in a column": x is random per enemy, the wave is a staggered diagonal-ish line, not a column |
| D2 | 5.9.3 | minor (number claim) | "cooldown runs 12, 11, ... down to 0" while held: the HUD shows 12 to 1 and never 0 |
| D3 | 5.10.7 starter | cosmetic | `wave: undefined` prints over `base: 3` ("undefinebase: 3") |
| D4 | 5.9.7 step 3 hint | minor | the hint's `text('Game over', 122, 190)` assumes `textSize(30)`, which no text or hint gives; typed as given it is 18px and not centred |

Nothing found that blocks a student: every starter runs and renders what its text says, every reference runs with no console output
and scores full, the `removeEnemy` helper forms and each 5.11.9 challenge alone also score full, the 5.10.8 bug reproduces exactly as
written and the fix removes it, and 5.11.4 to 5.11.6 play identically to Part B.
