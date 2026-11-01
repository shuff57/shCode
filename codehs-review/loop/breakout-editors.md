# Breakout (6.10) editors audit: 7 moSHion labs, 2 live blocks, 4 code-only fences, 13 lessons

Run by cs-function-audit on 2026-11-01. Dev server localhost:3002 (DEV_ROLE=student). playwright-cli session `b610`, cookie
`dev_student=b610` (session closed at the end; its 13 lesson-state rows deleted; `mom`, `codehs`, `launcher`, `motion`, `stats45`
untouched). No lesson or repo file edited. Measurements, not verdicts: the pass/fail call is the human's.

Result: **GAP LIST, 4 gaps (1 real game bug in the reference code, 1 real teaching gap, 2 minor). Nothing is broken at the
"does not run / draws nothing / grader wrong" level.**

## Inventory
- Runnable editors: labs 6.10.4, .5, .6, .8, .9, .10, .13 (`preview: moshion`, each with `script.js` + `solution.js`); live blocks in
  6.10.3 (`js live`, 57 lines) and 6.10.7 (`js live`, 71 lines).
- Not runnable, no Run button (measured: 0 Run buttons on 6.10.2): four plain `js` fences in 6.10.2 and one in 6.10.7.
- No code in 6.10.1, .11, .12 (AI-graded plan, AI-graded reflect, quiz). No `console.*`, `setTimeout`, `.then`, `Promise` in any
  6.10 script, solution or content file (grep), so the async-output and silent-no-output lenses have nothing to fire on and
  output-claim reduces to "does the documented on-screen text/behavior appear".

## Method
- Node: all 14 files (7 starters, 7 solutions) and both live blocks through `scripts/moshion-harness.mjs` (deterministic; engine
  input, `kb`, mouse). Text on screen read from `fillText` ops. Scenario scripts: held-key and mouse steps for 6.10.4; walls/paddle/serve
  for 6.10.5; claims of each step; lose three lives, win, R restart for 6.10.9/.10; the three challenges applied literally to the
  6.10.13 starter; all four Tries of 6.10.3 and all three Tries of 6.10.7. Bots (seeded random paddle offsets) for 12000 to 80000 frames.
- Browser: real lesson page, localStorage cleared, starter Run, then reference pasted by insertText and Run. Per run: runner iframe
  `frameCount` read 600 ms apart (it advanced every time: about 37 frames per 600 ms, no stalls), canvas pixel census (colours
  sampled), Quest count, Console panel, screenshot. Real mouse and real held keys into the iframe. Both live blocks run in place.
- Layout: Steps drawer with every Hints disclosure opened, `code`/`pre` boxes measured against the scroll ancestor at 1440x900 and
  1024x768 (all 7 labs); `pre` and live-block widths at 1440, 1024, 600.
- Static: `node scripts/check-starters.mjs` ends "every reference scores full, every starter does not" (284 lessons; none of the
  seven 6.10 labs is in its no-reference list). Every lesson-number mention in the 6.10 lesson.json, content.md and code files resolves to a real lesson
  whose title matches what the text says it teaches (title field, not folder name: e.g. 6.6.16 is folder `6-6-15-...`).
- Tools not run: `audit.mjs` / `cs_lenses.mjs` live in bookSHelf and audit published bookSHelf pages; they do not apply to shCode,
  so the four lenses were applied by hand as above.

## What was measured and held (so the gaps below are the only ones)
- Starter Run, real browser, all seven labs: iframe appears, canvas 400x400 (live 6.10.7: 400x300), `frameCount` advancing, no error
  banner, Console "No messages", Quest `0/N` (4: 0/3, 5: 0/6, 6: 0/5, 8: 0/2, 9: 0/3, 10: 0/3, 13: 0/2). Each starter draws more than
  the background (paddle plus ball plus text; 6.10.9 onward also the wall).
- Reference Run, real browser, all seven labs: `N/N` on the Quest every time, no errors, still drawing.
- 6.10.4: mouse 0 gives `paddle x: 40`, mouse 399 gives `360` (words and sprite), y stays 370. With `control = 'keys'` held ArrowLeft
  50 after 400 ms then 40, held ArrowRight reaches 360 (real keyboard into the iframe).
- 6.10.5: ball at (200,300), vx 3, vy -4; starter stays still with the words `vx: 3   vy: -4`; after step 1 alone it leaves the
  canvas (800, -500 after 200 frames, no error); with the reference a bot gets 16 paddle bounces and vx values from -2.8 to 2.8, x range
  3.9 to 396.4, y min 4.0; a missed ball is served again after 174 frames.
- 6.10.6: starter bricks empty, nothing drawn for them (as step 1 says); reference draws five rows with the `'.'` gaps; score +10 a
  brick. Bricks at start 36 (40 minus 4 gaps), which is the number 6.10.9 promises.
- 6.10.7 live block, node and real browser: centre test leaves `bricks hit: 0`; `useEdges = true` gives 1 and the red dot is the ball
  centre, four cyan pixels at (x, y-R), (x, y+R), (x-R, y), (x+R, y) (read from the canvas). `START_X = 75`, centre test turns at
  y 119 (centre on the brick's lower edge, ball half inside); edges test turns at y 131 (top touching). Matches What you'll see and
  Tries 1 to 3.
- 6.10.3 live block: `vx: 3   vy: -4`, `paddle bounces: 0` on Run. Tries 2, 3, 4 measured in node: no steering gives only vx = -3 or 3;
  walls at 0/400 let ball.x reach -2.3 and 402.6; `/ 4` pushes vx to +-8.2. Matches the text.
- 6.10.9: starter reads `bricks left: 0`, reference 36 and falling; three misses give `lives: 0` and `Out of balls. Press R`;
  clearing the wall gives `You cleared the wall! Press R` (bot won at frame 5555); R gives `play, 3 lives, score 0, 36 bricks`.
- 6.10.10: starter waits on `title` forever (pressing 1 changes nothing, as step 1 says); reference shows `BREAKOUT` plus both
  choice lines between y 205 and 265; 1 gives (play, mouse), 2 gives (play, keys); after a lost game R gives `title`, 3 lives, 36
  bricks. **The prompt() note is true:** a `pickMode()` built on `prompt(...)` runs in the sandboxed runner (allow-modals), the dialog
  opens, answering 2 gives (play, keys), Quest 3/3, Console empty.
- 6.10.13: starter 0/2, reference 2/2. Challenge 1 (key 3, lives 1, title line), Challenge 2 (top row `'2'`, push 2, `-= 1`,
  `silver`, three `=== 1` become `> 0`; there are exactly three), Challenge 3 (WALLS, wallNum, next wall) each applied literally to the
  starter and played to the end: all three run, R brings back a whole game (3 lives, 36 bricks, title).
- Steps drawer, all seven labs, hints opened (44 to 55 `code` boxes per lab): nothing wider than the drawer, no horizontal scroll
  in the drawer, at 1440 and 1024 wide. Readings: `pre` boxes fit at 1440 and 1024; at 600 wide two of them scroll sideways
  (scrollWidth 648 and 687 in a 520 box) rather than clip. Live blocks 6.10.3 and 6.10.7: iframe 360x360, canvas scaled to fit, fully visible,
  all four bricks of 6.10.7 inside the frame.
- Hint code: every hint snippet is the reference's own line (read against `solution.js`); the compound ones are the same text
  the reference uses.

## Gaps (numbered as found)

### G1 (real, reproduced in the real browser and in node) the reference ball can get stuck against a side wall for good
- Where: the wall test in 6.10.5's `moveBall()` (`if (ball.x < R || ball.x > 400 - R) vx = -vx;`), identical in the 6.10.3 live
  example, the 6.10.2 snippet and the 6.10.6, .8, .9, .10, .13 references. So it is what the whole module teaches.
- Mechanism: the wall test flips whenever `ball.x < R`, not only when it is moving toward the wall. The paddle test runs after it in
  the same frame and sets `vx = (ball.x - paddle.x) / 10`. If the ball reaches the paddle while still within R (6 px) of the left wall,
  the paddle is pinned at x = 40, so `ball.x - paddle.x` is about -35 and `vx` is about -3.5, i.e. toward the wall. Next frame x is
  about 1.8 (< 6), flip, +3.5; the frame after x is about 5.3 (still < 6), flip, -3.5. The ball ping-pongs between x 1.8 and 5.3 forever.
  The mirror case happens at the right wall (x > 394). It keeps rising and falling in a 4 pixel strip.
- No player action frees it: the only paddle steer available at x about 5 is a negative vx. Only losing the ball (it falls past the
  paddle) serves a fresh one. In 6.10.8 and later a trapped ball in column 0 or 7 also cannot break the bricks that are not in that strip,
  so the wall cannot be finished until the player gives up a life.
- Real browser, reference of 6.10.5, paddle held at x 40, ball put at (5, 340) heading down: ball.x then reads 1, 1, 1, 4.5, 4.5, 1, 4.5,
  4.5, 4.5, 4.5 over 2.5 s, vx +-3.55 (driver `b/xtrap.js`). 3 s later still 4.5 / vx -3.55. Moving
  the paddle away freed nothing until the ball fell out and was served.
- How often with a human-like paddle: a bot that follows the ball with a random offset (re-rolled every 1.5 s) hit it in 7 of 30
  runs of the 6.10.5 reference (12000 frames each), 12 of 30 for 6.10.6, 4 of 30 for the 6.10.10 reference, 6 of 30 for the 6.10.3 live
  example, and a full 6.10.13 reference run stalled with 16 or 28 bricks left in 2 of 6 seeds. Its first entry in every one of those is
  the paddle bounce landing within 6 px of the wall.
- Suggested fix (not applied): flip only when moving toward the wall, `if (ball.x < R && vx < 0) vx = -vx;` and
  `if (ball.x > 400 - R && vx > 0) vx = -vx;` (the same idea as the `vy > 0` guard the module already teaches for the paddle), in every
  script, solution, reading snippet and the 6.10.3 live block, and the requirement r2 text/pattern of 6.10.5 if it pins the single-test form.

### G2 (real, teaching gap) the labs say "press Run, then press a key" but the sketch cannot hear keys until the canvas is clicked
- Measured: after clicking Run, `document.activeElement` is the Run button in the parent page and the runner iframe's
  `document.hasFocus()` is false. A real key press (`1`) leaves `state` at `title`. After one click on the canvas the iframe has focus
  and the same press gives (play, keys). The platform does not forward keys.
- Where it bites: 6.10.4 step 2 ("press Run, and hold the arrows"), 6.10.10 step 2 ("Run it and press 1 ... Run again and press 2")
  and the title screen's own "Press 1 / Press 2", plus R on the end screens in 6.10.9 and 6.10.10 ("Press R").
  The mouse paths work without a click.
- Context: the course already teaches this elsewhere (5.1.13 "click the canvas to focus it", 5.1.19, 5.1.21, 5.9.3, 6.1.7). No 6.10 text,
  step, hint or the title screen says it. A student who presses Run, then 1, sees nothing happen and has no hint why.
- Suggested fix (not applied): one sentence in 6.10.4 step 2 and 6.10.10 step 2 ("click the canvas first so the sketch hears your keys"),
  and it fits a line in the 6.10.2 paddle paragraph.

### G3 (minor, an unstated ordering) 6.10.13 Challenge 3 crashes if `wallNum = 0;` is added at the end of `startGame()`
- Text: "Add `let wallNum;`, set it to 0 in `startGame()`, and make `makeBricks()` read `WALLS[wallNum]`." The starter's `startGame()` begins
  with `bricks = makeBricks();`. A student who appends `wallNum = 0;` after `serve();` (the literal reading) gets, at setup,
  `Cannot read properties of undefined (reading '0')`, because `makeBricks()` runs with `wallNum` undefined. The reference puts it first.
  Neither the step text nor the hints say "before `bricks = makeBricks();`". (Measured in node, same message as the page's runner.)
- It is also what makes the second playthrough crash if the win left `wallNum` at 2 and the reset came after `makeBricks()`.

### G4 (minor, layout, platform-wide, not specific to 6.10) the fixed progress footer covers the lower part of the canvas on a short window
- The editor row ends at y 743 on every 6.10 lab (iframe 325 to 743). The fixed `lesson-progress-footer` is 36 px tall at the bottom of the
  viewport. At 1366x768 it covers canvas y 390 to 400 (the lab 13 line `wall 1 of 2` at y 390 is just under it). At 1280x720 it
  covers canvas y 344 to 400, which includes the paddle (y 364 to 376). At 1366x650 (a normal laptop browser window) the visible canvas
  stops about y 290; the paddle, the lost-ball region and 6.10.9's `Out of balls` message at y 260 only come into view after scrolling.
  Same observation as the 6.9 audit. The page scrolls, so nothing is lost, but Breakout's playing field is the lower half.
- Related, harmless: before the mouse enters the canvas `mouse.x` is 0, so in mouse mode the paddle sits at x = 40 (measured: 40), not
  in the middle; in 6.10.9 the first ball was lost within 2.5 s while the pointer was still outside the canvas.

## Small notes (not defects)
- 6.10.13 reference: the added title line `Press 3 for one ball, with the mouse` sits at y 290; the ball waits at y 300 (radius 6), so
  the text and the ball are about 3 px apart. 6.10.10 step 1 asks for the title lines "between y 200 and 280".
- 6.10.5's starter changes `drawTop` (shows `vx`/`vy` instead of `control`/`paddle x`); the step does not mention it. Nothing breaks.
- 6.10.13 step 1: the three challenge paragraphs render as one run of text with only a line break between them (no blank line).
- The live-block editors keep your edits across reloads (browser storage); my Try edit of 6.10.7 survived a reload and had to be undone
  with Reset. Behaves like the other live blocks.
- First request of a lab page after a cold compile returned 500 once (dev server, transient); all 13 pages return 200 afterwards.

## Checks I could NOT perform
- `audit.mjs` / `cs_lenses.mjs` (bookSHelf harness): not applicable to shCode, so no lens output exists for these pages.
- Canvas text is not readable from pixels: on-screen words were read from the harness's `fillText` ops, and in the browser I looked at
  screenshots of 6.10.7 (live), 6.10.10 and 6.10.13 and 6.10.9 reference runs and the Steps drawer of 6.10.4 and 6.10.13 only. The other
  screenshots are on disk but not looked at (scratchpad `b/shot-*.png`, `b/shotplay-*.png`).
- A touch device, a screen reader, sound (none used), and Safari/Firefox were not exercised (Chromium only).
- A human player over a long session: the G1 frequencies come from bots, not from students. The bot is crude; the mechanism is exact.
- The graders' regex acceptance of other student wordings (cs-student lenses own that). Only reference and starter scores were measured.
- The Quest cards' own copy and the AI-graded parts (6.10.1, 6.10.11) were not run.

## Evidence kept (scratchpad, not in the repo)
`/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/b/`: `lib.mjs` (node harness
helpers), `n1.mjs` to `n13.mjs` (node scenarios), `gen.mjs` and `run-*.js` (browser drivers), `steps.js`, `reads.js`, `live*.js`, `vp.js`.
