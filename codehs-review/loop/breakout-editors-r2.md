# Breakout (6.10) editors re-audit, round 2: 7 moSHion labs, 2 live blocks, 13 lessons

Run by cs-function-audit on 2026-11-01 against commit `59d61d25` (breakout lens round 1). Previous report: `codehs-review/loop/breakout-editors.md`.
Dev server localhost:3002 (DEV_ROLE=student). playwright-cli session `b610ed2` (headless Chromium), cookie `dev_student=b610ed2`; its 13 lesson-state
rows were deleted and the session closed at the end. `mom`, `codehs`, `launcher`, `motion`, `stats45` untouched. No lesson or repo file edited.
Measurements, not verdicts: the pass/fail call is the human's.

Result: **no functional gap. The side-wall sticking is gone in every script, solution and live block, headless and in the real browser; every starter
and solution still runs, draws and scores; the Steps drawer shows the new code unclipped; the click-canvas reminders are there and the key tests
show they are needed. One minor wording gap (M1) and four notes below.**

## What changed, and what I audited
Audited state is HEAD `59d61d25` (lesson code files, `script.js` and `solution.js`, byte-identical to HEAD throughout the run: `git diff HEAD` empty for all 14).
Changed in the commit: the side-wall test in seven scripts/solutions and the 6.10.3 live block (`if (ball.x < R && vx < 0)` and `if (ball.x > 400 - R && vx > 0)`),
step/hint text in 4, 5, 9, 10, 13, content text in 2, 3, 13, grader patterns and card text.
**Concurrent edits:** from about 09:18 someone else began editing lesson files in the working tree (`lesson.json` of 4, 5, 6, 9, 10, 13, `content.md` of 2 and 13;
requirements patterns, 5's step 2 text, 13's step 1 text). I did not audit those uncommitted edits. Everything I measured in the browser was loaded
before they started (dev server restarted 09:11 with a clean tree, `git status` clean for lessons at 09:11:56); step text I quote below was checked against
`git show HEAD:`.

## Method
- **Node, deterministic** (`scripts/moshion-harness.mjs`): 30 seeded bots (paddle follows the ball with a random offset re-rolled every 1.5 s, up to
  20000 frames) over the six references 5, 6, 8, 9, 10, 13 plus the live blocks 3 and 7; an A/B of the shipped wall line against the OLD line on the same
  scenario; the four Tries of 6.10.3 (default, no steering, R to 0, `/ 4`).
- **Real browser** (headless Chromium via playwright-cli): every starter and every reference pasted by insertText, Run clicked; per run the runner iframe's
  `frameCount` read 600 ms apart, canvas pixel census, Quest count, Console panel, screenshot. Wall trap driven by real mouse moves into the iframe on
  all six wall-bearing labs. Real held keys and a real click on the canvas for 6.10.4 and 6.10.10. Both live blocks run in place, their Tries edited into
  the live editor and rerun. Steps drawer opened with every Hints disclosure at 1440x900, 1024x768, 700x800. Readings 2, 3, 7 at 1440, 1024, 600.
- **Static:** `node scripts/check-starters.mjs` ends "every reference scores full, every starter does not". Grep of HEAD for `console.`, `setTimeout`,
  `setInterval`, `.then(`, `Promise` in every 6.10 code file: no hits (the async-output and silent-no-output lenses have nothing to fire on; output-claim reduces
  to "does the documented behavior/text appear on screen", measured below).

## 1. Side-wall sticking: gone
- **Same scenario, old line vs shipped line, node** (paddle pinned at the wall by the mouse, ball put at x 5 or 395 heading down, 600 frames, longest run of
  consecutive frames within 8 px of a side wall):
  - old line `if (ball.x < R || ball.x > 400 - R) vx = -vx;` swapped into each reference: **600 of 600 frames, both walls, all six labs** (ball at x
    4.5, 5, 4.5, 5 ... or 395.5, 395 ... for good).
  - shipped line: **7 frames, both walls, all six labs** (x 4.5, 5, 5.5, 6, 6.5, 3.1, 6.5, 9.8: it dips once, turns, and leaves).
- **Real browser, mouse pinned at the left edge (paddle x 40) and the right edge (paddle x 360), ball put hugging the wall heading down, 30 samples at 100 ms:**
  labs 5, 6, 8, 9, 10, 13 each give `maxConsecutiveSamplesWithin8px = 1`, the ball back out in the field every time (e.g. lab 5 left: x 3.15 then 33, 83, 133 ... over
  250 ms steps, vx +3.35). Lab 5's old trap driver (`b/xtrap.js`, ball (5,340), vx -0.5) gives x 33 -> 388 -> back, no ping-pong; old report measured 1, 1, 1, 4.5, 4.5 ... for 3 s.
  (Lab 9 left run ended with `state` lost after three misses; lab 9 right run, tested in its own load, stayed `play` and left the wall.)
- **Bots, 30 seeds each, 20000 frames, references:** 6.10.5, 6.10.6, 6.10.8: 0 stuck, 0 errors, longest time within 8 px of a wall 21 frames (a slow vx near the wall,
  leaves). 6.10.9, 6.10.10, 6.10.13: **30 of 30 won**, 0 stuck, 0 errors (round 1: a 6.10.13 run stalled with 16 or 28 bricks in 2 of 6 seeds; 6.10.9/10 had
  4 to 6 of 30 trapped). Live block 6.10.3: 0 stuck, 0 errors.
- Greps: no `ball.x < R ||` or `x > 400 - R)` single-test form remains anywhere in 6.10 (code, content, hints). The only `R ||` left is the VERTICAL test in the 6.10.7
  live block (`ball.y < R || ball.y > 260`), which is not a side wall.

## 2. Every starter and solution still runs, draws, scores
Real browser, localStorage cleared per run (counts `Quest`, `frameCount` before and 600 ms after, canvas colours sampled, Console):

| Lab | Starter Quest | Solution Quest | frameCount 1 -> 2 (starter / solution) | Canvas | Errors / Console |
|---|---|---|---|---|---|
| 6.10.4 | 0/3 | 3/3 | 149->185 / 148->184 | 400x400 | none, "No messages" |
| 6.10.5 | 0/6 | 6/6 | 147->184 / 145->182 | 400x400 | none |
| 6.10.6 | 0/5 | 5/5 | 92->129 / 148->185 | 400x400 | none |
| 6.10.8 | 0/2 | 2/2 | 148->187 / 148->185 | 400x400 | none |
| 6.10.9 | 0/3 | 3/3 | 148->184 / 145->182 | 400x400 | none |
| 6.10.10 | 0/3 | 3/3 | 149->185 / 148->184 | 400x400 | none |
| 6.10.13 | 0/2 | 2/2 | 147->183 / 148->185 | 400x400 | none |

Colour census: every starter and solution draws more than the background (39 to 234 distinct sampled colours; 6.10.9 onward includes the wall). The Quest counts match
round 1 exactly (3, 6, 5, 2, 3, 3, 2). frameCount advances about 37 per 600 ms, no stalls. (My batch of lab 4 solution and lab 8 solution overlapped a second
backgrounded batch on the same session; both were re-run alone and gave the rows above.)

## 3. Documented behavior matches
- **6.10.3 live block (real browser, edited in place):** Run gives `vx: 3 vy: -4`, `paddle bounces: 0` (v0 = [3,-4,0]). Try 2 (delete steering line): node, 6000 frames,
  only 2 distinct vx values (3 and -3). Try 3 (`ball.x < R` to `ball.x < 0`, `ball.x > 400 - R` to `ball.x > 400`, the edit the new step 3 text asks for): node min x -2.8, max 402.8
  ("goes half into each side wall before it turns"); browser min x -0.7, max 399.3 over 6 s. Try 4 (`/ 4`): max |vx| 8.5, 55 distinct vx, no stuck frames, 0 errors.
  Matches "What each Try found".
- **6.10.7 live block (real browser):** Run: `bricks hit: 0` after 6 s with `useEdges = false`; Try 1 (`useEdges = true`) turns at y 15 after hit 1; Try 2 (`START_X = 75`)
  hit 1, `useEdges` false; Try 3 (75 and edges) hit 1. Canvas 400x300 scaled to 360x270 inside a 360x360 frame, fully visible, no error. Unchanged since round 1.
- **6.10.5 documented text:** step 2 says the wall tests need `vx < 0` left, `vx > 0` right; the starter's comment, the hint (two one-liners) and the reference all agree. Measured: starter stays
  still showing `vx: 3 vy: -4`; reference passes 6/6 and bounces left, right, top, paddle, falls out and serves again.
- **6.10.6, 6.10.8, 6.10.9 ("Out of balls. Press R", "You cleared the wall! Press R", 3 lives, 36 bricks, R restarts):** node round-1 scenarios unchanged; the bots above reach `won` 30 of 30.
  6.10.10 in the real browser: `state` title with control mouse; after click then `1`: (play, mouse); Stop, Run, click, `2`: (play, keys, paddle 200), ArrowRight held to 360; three misses give
  state lost, lives 0, 33 bricks left; click already focused, `r`: (title, 3 lives, 36 bricks, score 0). The `prompt()` note is untouched code-wise (not re-run this round, see "not performed").
- **6.10.13:** the new sentence ("`startGame()` sets `wallNum` to 0 above `bricks = makeBricks();`") is exactly the reference's order. In node, the reference loads clean; moving
  `wallNum = 0;` to the end of `startGame()` still throws `Cannot read properties of undefined (reading '0')` at setup, so the sentence is doing real work, and the step now says it. The reference
  plays wall 1, wall 2, `won`, R, title (30 of 30 bots).
- **Quest/card text for 6.10.5 r2:** says "Testing the way it moves as well (vx < 0 on the left, vx > 0 on the right) keeps it from sticking to a wall" and the reference scores 6/6 with exactly that.
- **Tries (6.10.3, four) and Tries (6.10.7, three):** all measured above; text of 6.10.3 Try 3 now names both side-wall tests, as the code has two lines.

## 4. Steps drawer: new code blocks unclipped
Every Hints disclosure opened, `code` and `pre` boxes measured against their scroll ancestor, all seven labs, three widths:
- clipped code boxes: **0** at 1440, 1024 and 700; drawer horizontal scroll: none. Box counts 44, 58, 55, 17, 45, 48, 43 for labs 4, 5, 6, 8, 9, 10, 13.
- The new wall hint of 6.10.5 (`if (ball.x < R && vx < 0) vx = -vx;` and `if (ball.x > 400 - R && vx > 0) vx = -vx;`) is the longest new snippet: it wraps onto two lines inside
  the 320 px drawer (right edge 1405 and 1407 of 1440; 991 of 1024; 652 of 700), `scrollWidth == clientWidth`, nothing cut. Screenshot `steps-1440-5-lab-bounce.png` and
  `drawer5.png` (scratchpad `ed2/`) show it, wrapped at ` = -` / `vx;`, legible.
- Readings (not runnable): 6.10.2 has 4 `pre` boxes and **0 Run buttons**; 6.10.3 and 6.10.7 have exactly 1 Run button each and the live editor. No page has horizontal document
  scroll at 1440, 1024 or 600 (`scrollWidth == innerWidth`). At 600 wide, one `pre` in 6.10.2 (the paddle clamp, scrollWidth 648 in 520) and one in 6.10.7 (687 in 520) scroll sideways
  inside their box instead of clipping, exactly as in round 1.

## 5. Click-canvas reminders appear, and the key tests show why they are needed
- Reminder text present in the rendered Steps drawer ("click the canvas so the sketch hears your keys", cited to 5.1.13): 6.10.4 step 2 (1 occurrence), 6.10.9 step 2 (1),
  6.10.10 steps 2 and 3 (the drawer counts 1; step 3 reads "press R (click the canvas first if nothing happens)"), 6.10.13 step 1 hint and `content.md` (1 each); none in 5, 6, 8 (no keys there).
- Behavior they describe, real browser: after Run, `document.activeElement` is the Stop button in the parent and the iframe's `document.hasFocus()` is false.
  6.10.4 (reference with `control = 'keys'`): ArrowRight held 700 ms without a click leaves paddle at 200; after one click on the canvas ArrowRight reaches 360 and ArrowLeft 40.
  6.10.10: `1` without a click leaves (title, mouse); click then `1` gives (play, mouse).
  So the round-1 gap G2 is closed in the places it bit. (6.10.2's paddle paragraph still has no such line; that was only suggested as optional.)

## Gaps
### M1 (minor wording, 6.10.10 step 1) "about 300 pixels wide" is 336
The step says `Press 2 to play with the arrow keys` at `textSize(16)` is "about 300 pixels wide". The runner draws text in 16 px `monospace`; measured with
`measureText`: 336 px for that line (288 for line 1, 345.6 for 6.10.13's `Press 3 for one ball, with the mouse`). The conclusions in the step hold: at x 30 the line ends at 366 and fits; at x 100 it ends at 436
and is cut off at 400. Only the number is 12 percent low. No behavior depends on it.

## Notes (not defects)
- The dev server on :3002 was DOWN (connection refused) at about 09:12 for more than two minutes, mid-run (cause unknown, not me). I restarted it with
  `DEV_ROLE=student npm run dev` (log: scratchpad `ed2/dev.log`) and left it running. Its in-memory student progress was lost with the old process; I re-seeded my own cookie's 13 rows
  and deleted them again at the end. Nobody was pkill'd.
- The scratchpad folder `.../scratchpad/r2/` is in use by another agent (its own `b610r2` session, patch and mismatch files). I wrote `lib.mjs`, `gen.mjs`, `fences.json`, `bots.mjs`, `runone.sh`, `xtrap2.js`, `xtrap3.js`,
  `trap-out.txt`, and some `run-*`/`shot-*` files into it before noticing, so any same-named file of the other agent's may have been overwritten. I moved to `scratchpad/ed2/` for everything after.
- 6.10.13 title line `Press 3 ...` still sits at y 290 and the waiting ball at y 300 (about 3 px apart), as in round 1; the line fits horizontally (x 27, ends 372.6).
- The fixed progress footer covers the lower canvas on a short window (round 1 G4): platform-wide, not re-measured this round.

## Checks I could NOT perform
- `audit.mjs` / `cs_lenses.mjs` (bookSHelf harness): not applicable to shCode, so no lens output exists. The four lenses were applied by hand as above.
- The uncommitted lesson.json / content.md edits made during the run (see "What I audited") were not audited, so their Quest/grader changes are unmeasured.
- Re-run of the `prompt()` title-screen path (6.10.10 note), the three 6.10.13 challenges applied literally to the starter in the browser, and 6.10.9's R-after-click in the browser: these paths
  have unchanged code (only the wall line moved, and the 6.10.9/6.10.10/6.10.13 flows ran end to end in bots and, for 6.10.10, in the real browser). Round 1's measurements of them stand but were not repeated.
- Canvas words are not readable from pixels in the browser; on-screen text was read from the harness's `fillText` ops and from drawer text. I looked at screenshots of the Steps drawer (6.10.5) only.
- Touch, screen reader, sound, Safari, Firefox: not exercised (headless Chromium only). The bot's paddle is crude; the A/B on the wall line is exact, the bot rates are not a student rate.

## Evidence kept (scratchpad, not in the repo)
`/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/ed2/`: `ab.mjs` (old-vs-shipped A/B), `bots.mjs`, `tries3.mjs`, `n13.mjs`, `genlive.mjs`/`live-new.js`,
`keys-run.js`, `steps-run.js`, `reads2.js`, `drawer5.js`, `xtrap3.js`, screenshots `steps-*-5-lab-bounce.png`, `drawer5.png`, `live3.png`, `live7.png`, `keys10.png`. The bot, trap and starter/solution run outputs are in
`.../scratchpad/r2/trap-out.txt` and the task output files under `.../tasks/`.
