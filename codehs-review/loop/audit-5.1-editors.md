# Module 5.1 editor audit (CS-editor lenses)

Date 2026-11-03. Dev server http://localhost:3002, DEV_ROLE=teacher, headless `playwright-cli` session `a51e` (closed at the end). Read-only: no repo file was edited; only this report was written. Screenshots are under `S/` = `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/audit51/`.

These are measurements, not verdicts. Pass/fail is the reader's call.

## How the lenses were run

`bookSHelf`'s `audit.mjs` / `cs_lenses.mjs` only read published `docs/` pages, so they cannot see shCode. The four lenses were applied by hand to shCode's own surfaces, with the same logic:

- **output-claim**: the lesson's own text says what a block shows ("What you'll see", step text). Each claim was compared with what the sketch really did (sprite count and positions read from the sketch iframe, key presses sent, canvas pixels read, screenshots).
- **editor-kind**: a `js live` fence with no `plain` flag renders `MoshionPreview` (a canvas). `plain` renders a console Output pane. `console` adds a LiveConsole under a canvas. A moshion lesson must mount the moshion workspace.
- **async-output**: any block that logs or draws from `setTimeout`/`.then`/`new Promise`/`prompt()`.
- **silent-no-output**: a block that calls `console.log` and shows no output.

Helper scripts: `S/drv.py`, `S/probe.js`, `S/growth.js`.

## Coverage (25 lessons titled 5.1.x)

Sanity floor: every page with a `.livecodeblock` or a workspace had `blocks_found > 0`; none was a zero-probe run.

| Lesson (title / dir) | Editors | Run |
|---|---|---|
| 5.1.1 slides, 5.1.2 video, 5.1.12 video (`5-1-1`, `5-1-2`, `5-1-12`) | none (cm=0) | nothing to run |
| 5.1.23 Frame Loop Writeup (`5-1-22-a10-2-frame-loop`) | two textareas, no code editor | not applicable |
| 5.1.3 `5-1-3` | 1 live block | yes |
| 5.1.4 `5-1-4` | 3 live blocks | yes, all three |
| 5.1.5 `5-1-5` | 1 | yes |
| 5.1.6 `5-1-6` | 2 | yes |
| 5.1.7 `5-1-7-lab-one-sprite` | moshion workspace | starter, two edits, solution |
| 5.1.8 `5-1-8` | 2 | yes, plus 5 timed shots |
| 5.1.9 `5-1-9` | 1 | yes |
| 5.1.10 `5-1-10` | 1 | yes, plus timed state |
| 5.1.11 `5-1-11` | moshion workspace | starter and solution |
| 5.1.13 `5-1-13` | 1 | yes, with the w key held |
| 5.1.14 (reading, dir `5-1-19-reading-wasd`) | 1 | yes, all four key names |
| 5.1.15 Worked Examples (dir `5-1-14-example-keyboard`) | 3 live and 6 static `js` fences | live blocks run, keys driven |
| 5.1.16 `5-1-15` | 1 | yes |
| 5.1.17 `5-1-16` | 1 | yes, wasd driven |
| 5.1.18 `5-1-17` | 1 | yes, drift driven |
| 5.1.19 lab (`5-1-18`) | moshion workspace | starter, no-else edit, solution, keys |
| 5.1.20 `5-1-20` | moshion workspace | starter, solution, keys |
| 5.1.21 reading (dir `5-1-24`) | 1 | yes |
| 5.1.22 Sprite Playground (`5-1-21`) | moshion workspace | starter, solution, keys |
| 5.1.24 Challenges (`5-1-23`) | moshion workspace | starter, solution, keys, trail tests |
| 5.1.25 grid lab (`5-1-25`) | moshion workspace | starter, 3 edits, late-origin error, hover |

Note: lesson titles and directory numbers do not line up (title 5.1.15 is dir `5-1-14`, title 5.1.24 is dir `5-1-23`, and so on). Lesson ids below are directory names with the title in brackets.

## Lens results at a glance

- **editor-kind**: all 21 live fences plus all 7 moshion workspaces mounted the moshion canvas (`plainOutputPanes = 0` everywhere, `iframe` present after Run, canvas count 1). No console fence is rendered as a model editor, and no moshion block is a console pane. One quiet mismatch: 5.1.3's text promises an on-canvas console that its fence does not mount (finding 2).
- **async-output**: no 5.1 block uses `setTimeout`, `.then`, `new Promise` or `prompt()`. Nothing to flag.
- **silent-no-output**: one hit, 5.1.3 (finding 2).
- **output-claim**: the findings below.

## Defects, ranked

### 1. HIGH: 5.1.15 Worked Examples (`5-1-14-example-keyboard`), Example 1: the text says the bug is invisible, but it is a visible crowd

- **Claims** (static fence plus text): "Click Run. You'll see a dark canvas with a square in the middle." and, in Step 2, "...300 sprites exist. You just can't see them because they're all in the same spot." Then: "Open the in-app editor's performance tab (or the browser DevTools) to confirm."
- **Actual** (same code as 5.1.4 Step 1, `new Sprite` in `draw()`): at 3 s the canvas holds about 200 sprites and shows a solid pink mass, not "a square in the middle" (see finding 3's shots). The sprites are visible and spread out. This is the opposite of "all in the same spot".
- **Performance tab**: the lesson page has no tab by that name (page controls are only Docs, Run/Reset, Mark as complete). The claim points at UI that does not exist.
- **Also**: Step 1 says "Click Run" on a static `js` fence. The `js` fences render as plain `<pre>` with no Run button (9 `<pre>` blocks, 3 live blocks). Only the final "combined final" blocks are runnable.
- The module's 5.1.4 and 5.1.8 were already reworded to the crowd description. This lesson still carries the pre-fix text.
- Fix direction (not applied): copy 5.1.4's Step 1/Step 2 wording, delete the "performance tab" sentence.
- Evidence: `S/5.1.4-step1-t3000.png` (same code), `S/5.1.15-ex2-final.png`.

### 2. HIGH: 5.1.3 (`5-1-3-reading-canvas-sprite`): `console.log('setup ran')` prints nowhere (silent-no-output)

- **Claim**: "`setup ran` prints **once** in the on-canvas console" and "Notice `setup ran` prints once each time you start."
- **Actual**: the fence is ```` ```js live ```` with no `console` flag, so `LiveCodeBlock` renders only the canvas (`showConsole` is false). After Run the block's preview text is empty and "setup ran" exists nowhere on the page except in the editor source. The canvas shows only `frames: N` (181 after about 3 s). No error, no placeholder.
- The pattern exists elsewhere: 5.2/5.3 fences written as ```` ```js live console ```` mount a `LiveConsole` panel (confirmed 1 panel on `5-2-2`). I did not verify that panel echoes `console.log`; `components/LiveConsole.tsx` listens for the iframe's console messages.
- Smaller same-block wording: "stop and restart the sketch". A live block has Run and Reset only, no Stop. Run restarts it and frames start again from 1.
- Evidence: `S/5.1.3-block.png`.

### 3. MEDIUM: 5.1.4 `5-1-4-example-minimum-sprite` and 5.1.8 `5-1-8-reading-sprite-variable`: the "growing crowd of squares pushing apart" claim (verified, with three differences)

Requested verification: run the block, screenshot at 3 s.

**Confirmed** (5.1.4 Step 1 and Step 2, 5.1.8 block 1): `new Sprite` in `draw()` makes about 65 sprites per second (34 at 0.5 s, 69 at 1 s, 135 at 2 s, 201 at 3 s, 327 at 5 s), all created at the same point, and they push each other apart (x spread -32..368 at 0.5 s, -126..555 at 3 s, -225..628 at 5 s). "300 sprites in 5 seconds" holds (324 to 327). One sprite when hoisted (5.1.4 Step 3, 5.1.8 block 2): `sprites 1` through 5 s, a single blue square at (180,100).

The three differences from the text:

a. **It is a solid wall, not a crowd of squares.** Every square is the default colour (hotpink), so from about 1.5 s the 360 px preview is flat pink with no square distinguishable. The "square starts in the middle, then more squares crowd out" phase lasts about 1 second. At 0.5 s the shape is a plus sign (`S/5.1.4-step1-t500.png`), not an even crowd. At 3 s: `S/5.1.4-step1-t3000.png` and `S/5.1.8-crowd-t3000.png` are fully filled.
b. **The crowd leaves the canvas.** There are no walls: at 5 s sprites range to x -225..628 and y -190..588 on a 400x400 canvas. Most of the pile is off-screen.
c. **Frame rate claim is true but late.** "The frame rate slowly drops": 60 fps at 5 s (327 sprites), 30 fps at 10 s (554 sprites), 15 fps at 20 s, 20 fps at 30 s (1048 sprites). A student watching 5 seconds sees no slowdown. (Headless software rendering; a real laptop will be later.)

Related:
- **5.1.8 stale phrase**: "Watch what the engine reports after a few seconds." The engine reports nothing: no console, no counter, no text anywhere in the preview (`bodyText ""`). Looks like a leftover from an earlier version that printed a sprite count. Defect on its own (output-claim).
- **Runs stack**: running 5.1.4's blocks one after another leaves the earlier sketches running. After the third Run the page held three live sketches (frames 192, 198, 188), the first two still piling sprites. Running Step 1 and Step 2 together doubles the cost and drops the frame rate sooner. Not a text defect; a behaviour note.
- Evidence: `S/5.1.4-step1-t{500,1000,2000,3000,5000}.png`, `S/5.1.4-step2-t*.png`, `S/5.1.8-crowd-t*.png`, `S/5.1.8-fixed-t*.png`, `S/5.1.4-long-t{10000,20000,30000}.png`.

### 4. MEDIUM: 5.1.10 `5-1-10-reading-sprite-props`: the layer demo shows no overlap

- **Claim**: "a tilted blue square overlapping a red square, with the blue one on top because its `layer` is higher." Try-this: "swap the two `layer` values... the red square jumps in front."
- **Actual**: both sprites are dynamic bodies and start overlapping, so the physics pushes them apart within about 7 frames. By frame 7 they are edge to edge and never overlap again (blue (99,129), red (171,171), layers 2 and 1 confirmed). Red also ends tilted (18 degrees) though only the blue is given a rotation. With nothing overlapping, swapping the layers changes nothing visible, so the lesson's point (layer decides who is on top) cannot be seen.
- Fix direction: `collider = 'none'` on both sprites in the demo (the solution file in 5.1.22 already does this for the companion).
- Evidence: `S/5.1.10-t150.png`, `S/5.1.10-t2500.png`, `S/m5.png` (side-by-side).

### 5. MEDIUM: 5.1.24 rgba trail (verified): it fades, but the background is not "the same dark grey" and a ghost band stays

Requested verification: the claim lives in `lessons/5-1-23-challenges/content.md`, Challenge 5 "Easy path".

- **Claim**: `background('rgba(34, 34, 34, 0.1)')` "is the same dark grey (`#222`...) ... older frames fade instead of vanishing."
- **Tested**: a tomato sprite oscillating across a 400x200 canvas, collider off, same code in all runs.
  - **The trail does fade**: a tomato streak behind the sprite shrinks to nothing over about eight sprite lengths (`S/5.1.24-trail-easy-t10.png`).
  - **Not the same grey**: pixels the sprite never touched settle at RGBA (21,21,21,247) after 3 s and still at 10 s. `#222` is (34,34,34,255). The canvas is semi-transparent and shows the page's #111 through it, so the sketch looks nearly black (`S/5.1.24-trail-easy.png` next to `S/5.1.24-trail-none.png`, the `#222` control).
  - **A permanent ghost band**: pixels the sprite passed settle at (29-30,29,29,255), lighter than the surround, so the sprite's path stays visible as a lighter stripe indefinitely (the 8-bit rounding stall of a 10% blend). "Instead of vanishing" is true of the colour, but the path never fully clears.
- **Honest path verified**: with an array of last positions, `circle()` and `fill('rgba(255, 255, 255, ' + (i / trail.length) + ')')`, brightness along the trail rises with `i` (samples 34 background, 59, 251, 255 toward the head). It fades as described (`S/5.1.24-trail-hard.png`).
- **"`fill(255, 255, 255, 120)` paints solid white"**: confirmed. Pixel at the circle centre = 255. The same circle with `fill('rgba(255, 255, 255, 0.47)')` reads 138 (a real blend).
- **Orphaned text** (confirms `walk-5.1-advanced.md` finding 4): this lesson is `preview: moshion`, so `ContentLessonView` never renders `content.md`. The Steps panel lists a different Challenge 5 ("a wave", sin on `pos.y`). "Trail effect" and the rgba text appear nowhere on the page. The trail claim is reachable only by the docs drawer, whose own example (`rgba(0,0,0,0.1)` on black) behaves correctly. The docs-drawer claim passes; the `content.md` claim cannot be read by a student.
- Evidence: `S/5.1.24-trail-easy.png`, `S/5.1.24-trail-easy-t10.png`, `S/5.1.24-trail-none.png`, `S/5.1.24-trail-hard.png`, `S/m6.png`.

### 6. LOW: 5.1.24 `content.md` Challenge 4: "FPS: 60.0" example is not what the code prints

- `text('FPS: ' + frameRate(), ...)` printed `FPS: 59.88023952095873`. The hint shows `FPS: 60.0` and never mentions rounding. Orphaned text (see finding 5), so a student only meets it in the step panel's Challenge 4, which says nothing about format.
- Evidence: `S/5.1.24-fps.png` (the screenshot caught the Docs drawer over the iframe, but the FPS line is readable).

### 7. (withdrawn)

Placeholder kept so finding numbers stay stable; nothing here.

### 8. LOW: 5.1.19 lab (`5-1-18-lab-else-to-zero`): step text quotes lines that do not match the starter

- Step 2: "Find the two lines that say `else player.vel.x = 0;` and `else player.vel.y = 0;`." The starter's lines are `else                       player.vel.x =  0;` (aligned columns, extra spaces). A find-in-file for the quoted text will not match.
- The behaviour the lab teaches is verified (below).

### 9. LOW: starters show an engine error before the student has typed anything

5.1.11, 5.1.20, 5.1.22, 5.1.24 (blank-step starters): Run prints `Error: new Canvas(w, h) must be called in setup()` in the preview (canvases 0, sprites 0). It is not silent, and it is the engine's own message on an unfinished scaffold. Listed because "Run shows what your code does" with a red error is the first thing a student sees. 5.1.25's starter runs clean (a dark canvas, 149 frames).

## Claims that matched (no defect)

- **5.1.7**: starter is a tomato square in the middle of a dark 360x360 canvas; `60, 60` moves it upper left; `140, 30` makes a wide flat rectangle; the solution (gold bar) runs (`S/5.1.7-montage.png`).
- **5.1.11, 5.1.20, 5.1.22, 5.1.24** reference solutions: run with no console errors; canvas 1, sprites 1/1/2/2. Held key, release, hold other key: velocity set then reset to 0 as taught (`vx 4` held, `0` after release; 5.1.24 solution uses speed 3). 5.1.22 shows `WASD to move the blue sprite` text; 5.1.24 shows the `Frame:`/`Player:` HUD (`S/m2.png`).
- **5.1.19 drift**: starter stops on release (`vx 0`). With both `else` lines deleted, one `d` tap leaves `vx 4`, x goes 344 to 372 to 540 and later 804 (`S/5.1.19-noelse-d.png`). Solution at speed 3 stops on release.
- **5.1.13**: `w is up` then `w is HELD` while held (`S/5.1.13-w.png`).
- **5.1.14 reading**: gray at rest; `a` tomato, left arrow gold, `d` mediumseagreen, right arrow orchid.
- **5.1.15 (velocity reading, dir `5-1-15`)**: sprite drifts right at `vx 4`. It leaves the 360 px canvas after about 1.4 s and keeps going (x 540 at 2 s), so "a blue square that drifts right" is true for about a second and then the canvas is empty.
- **5.1.17 (movement pattern)**: a, d, w, s each set vel to +-4 and release resets to 0.
- **5.1.18 (else-to-zero reading)**: after one `d` tap `vx` stays 4 (x 296 to 452 to 728, y -92 after a `w` tap): "drifts off-screen after a single keypress" is true.
- **5.1.15 Examples 2 and 3**: arrow keys move and stop; WASD moves the player; the orange mover oscillates 328..480 around x 400 as the text says.
- **5.1.21 (text reading)**: `Hello, canvas!` white, upper left.
- **5.1.25**: default grid has (0,0) at top-left, y down. After `world.origin = 'math'` the axes cross at the centre and y is up. `box` at (100,50) sits right of and above centre, and the hover label reads the pointer (-89, 60). Setting `world.origin` after a sprite is made errors with "must come before any sprite is made..." as the step says (`S/m3.png`).
- **5.1.3** `frames: N` counts up; **5.1.5** dark canvas with nothing else; **5.1.6** hotpink default square and tomato chained colour; **5.1.9** a blue smear bar grows right with no `background()` (it is a solid bar, not separate squares).

## Checks I could NOT perform

- **Lens self-check and `audit.mjs`**: not run. They read published `docs/` pages; shCode lessons are served by Next, not `docs/`. The four lenses were applied manually instead, so no `lens_findings` JSON exists for this module.
- **async-output**: no 5.1 block contains deferred output, so the lens had nothing to fire on. Reported as "no block in scope", not as a pass against a probe.
- **Solutions of 5.1.7 and 5.1.25's `showMouse()` label**: verified by hover only at one pointer position.
- **Real-browser frame-rate claims** (5.1.4 "frame rate slowly drops"): measured in headless software rendering only; the 10 s / 20 s thresholds will be later on a real machine.
- **Keyboard grading cards and the AI Check**: not exercised (Check, Submit and Commit were not clicked). This audit covers what the editors print, not what the graders accept.
- **LiveConsole content**: I confirmed the panel mounts with the `console` flag but did not run a block to see `console.log` text in it.
- **Videos (5.1.2, 5.1.12) and slides (5.1.1)**: no code editors; their media is `eyes-video` / `eyes-decks` territory. Nothing visual about those pages is claimed here.
- **Visual verdicts**: screenshots were read by the model reading this report for the finding above only where stated; the lenses themselves are text and DOM measurements.
- **Dev side effect**: editing code in the workspace editors (my "no-else", trail and late-origin variants) writes drafts into the browser's storage and possibly the dev server's draft store. The browser profile was in-memory and is closed; no repo file was touched. If the dev draft store keeps them, lessons 5.1.19, 5.1.24 and 5.1.25 may open on my test code for the `dev@local` user until Reset is clicked.
