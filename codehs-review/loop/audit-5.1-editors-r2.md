# Module 5.1 editor audit, round 2 (CS-editor lenses)

Date 2026-11-03. Dev server http://localhost:3002, DEV_ROLE=teacher, headless `playwright-cli` session `a51e2` (closed at the end). Read-only: no repo file was edited. Module now has 26 lessons. Screenshots are under `S/` = `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/audit51r2/`. Helper scripts (drv2.py, timed.py, combo.py, wscode.py, edit.py, keys.py, track.py, gen_variant.py) are in the same folder.

These are measurements, not verdicts. Pass/fail is the reader's call.

Method is the same as round 1: `audit.mjs` / `cs_lenses.mjs` only read published `docs/` pages, so the four lenses (output-claim, editor-kind, async-output, silent-no-output) were applied by hand to shCode's own surfaces. Every claim in a lesson's text was compared with what the sketch really did: sprite positions, velocities and colours read from the sketch iframe, canvas pixels read, held-key drives, "Try this" edits re-typed into the editor, screenshots.

**Caveat on timing.** The machine was at load average 58 to 72 during the whole run (other agents' browsers). Run-to-start latency of a few seconds, and two of my harness key-presses that did not register (see "Could NOT verify"), are probably load. Frame counts, positions and pixel values are not affected by that.

## Lens results at a glance

- **editor-kind**: every `js live` fence mounted the moSHion canvas (`.output-header` plain panes = 0; canvas = 1 in every iframe). Only 5.1.3 mounts a Console panel, and it is the only fence with the `console` flag. All 7 workspace lessons mount the moshion workspace. No console fence rendered as a model editor, and no canvas fence is a console pane.
- **async-output**: grep of every 5.1 `content.md`, `script.js` and `solution.js` for `setTimeout`, `setInterval`, `.then(`, `new Promise`, `prompt(`, `async`, `await`: zero hits. No block in scope, so nothing for the lens to fire on. This is "nothing to probe", not a pass against a probe.
- **silent-no-output**: the only `console.log` in 5.1 is the one in 5.1.3, and it now prints (below). No other fence logs.
- **output-claim**: results below.

## Round 1 defects: fixed / not fixed

| # (R1) | Defect | R2 status |
|---|---|---|
| 1 | 5.1.18 Worked Examples (dir `5-1-14-example-keyboard`): "invisible bug / performance tab / Click Run on a static fence" | **FIXED** |
| 2 | 5.1.3: `setup ran` printed nowhere | **FIXED** (with a latency note) |
| 3 | 5.1.4 / 5.1.8: crowd wording; stale "engine reports" phrase | **FIXED** (text) |
| 3 (runs stack) | Running several blocks leaves earlier sketches running | **NOT FIXED** |
| 4 | 5.1.10: layered squares never overlap | **FIXED** |
| 5 | 5.1.25 trail: "same dark grey" / orphaned text | **FIXED** in text; behaviour residue noted |
| 6 | 5.1.25 "FPS: 60.0" hint | **FIXED** (the FPS text is gone) |
| 8 | 5.1.19 step text quotes lines that do not match the starter | **NOT FIXED** |
| 9 | Blank starters print a bare engine error | **FIXED** (friendly first sentence) |

### 5.1.3 (`5-1-3-reading-canvas-sprite`): FIXED
- Fence is now `js live console`; a Console panel mounts under the canvas.
- Claim: "`setup ran` prints **once** in the Console box under the canvas ... Press Run again: `setup ran` prints once for that start." Measured over 6 consecutive Runs on one page load, twice: the count of `setup ran` in the Console panel was never above 1. Run clears the panel (count 0 at 150 ms) and the line returns once. 12 more Runs at 3.5 s: 12 of 12 showed exactly 1, canvas `frameCount` about 207 (about 60 fps).
- Latency note: under load 70, 3 of 16 Runs showed an empty Console (placeholder text) at 2.65 s and the line at 3.5 s. Startup latency, not a lost message. Re-test on an idle box before calling it nothing.
- Evidence: `S/5.1.3-run1.png`, `S/5.1.3-run2.png` (canvas `frames: 156`, Console `setup ran`).

### 5.1.18 Worked Examples (`5-1-14-example-keyboard`): FIXED, one wording risk
- Example 1 Step 1 now says "puts a square in the middle of a dark canvas, and then something goes wrong" and Step 2 matches 5.1.4's crowd wording. No "Click Run" on static fences, no "performance tab" (grep clean). Only the two "combined final" fences are `js live`, and the text says so ("each example ends with a block you can run").
- Live block 1 (minimum sprite): 1 sprite, deepskyblue, no error. Live block 2 (keyboard): left/right/up/down each set `vel` to +-4 and release returns it to 0; left+up moves diagonally (`vel -4,-4`).
- Step 2 "drifts forever": with `// else player.vel.x = 0;` commented, one left press leaves `vx -4` after release and x goes 80 to -40 and on. **Claim holds.**
- **NEW, LOW, wording**: Step 2 says "put `//` in front of the first `else` line (the one that sets `player.vel.x` to `0`)". The first line that starts with `else` in the live block is `else if (kb.pressing('right')) ...`. Commenting that one (measured) kills the right arrow, left still works, and nothing drifts, so the promised bug does not appear. The parenthetical rescues a careful reader. Evidence in numbers only.
- Cross refs checked: "5.1.23 Sprite Playground", "5.1.24 Frame Loop Writeup", "5.1.25 Challenges" all match the titles.

### 5.1.4 and 5.1.8: FIXED (text matches behaviour)
- 5.1.4 Step 1 text now: "A square appears in the middle, then more and more squares pile up and spread out until they cover the whole canvas." Measured at 300/600/1000/2000/3500 ms: 16/34/58/118/208 sprites; first frames are a plus-shaped cluster, then a crowd, then a solid pink fill with x spread -126..561 (it does spill off the canvas, as Step 2 now says). Step 3 (hoisted): 1 sprite. See `S/m-5.1.4-step1.png`.
- Step 2 now says a sketch "left running long enough starts to slow down" (softened, no number). I did not re-measure the frame-rate drop. Round 1 measured it at 10 s and later.
- 5.1.8: same wording; the "Watch what the engine reports" phrase is gone (grep clean). Block 1: 178 sprites at 2.5 s; block 2: 1 sprite. "Try this" (`player.color = 'tomato'` in `draw()`): centre pixel (255,99,71) as claimed.
- Minor, carried: the 5.1.4/5.1.8 preview is 360 px wide and the canvas is 400, so the crowd is cropped at the right edge. Nothing in the text promises otherwise.

### 5.1.10 (`5-1-10-reading-sprite-props`): FIXED
- `draw()` now resets `pos` and `rotation` every frame, and the text explains why. Measured at 2.5 s: player (120,140) rot 30 layer 2, box (150,160) rot 0 layer 1; still overlapping. Pixel at the overlap point is blue (0,191,255); pixel on the box alone is tomato.
- Try this 1 (swap layers): overlap pixel becomes tomato (255,99,71): "the red square jumps in front" holds.
- Try this 2 (`player.pos.x = 80`): blue at x 80, the overlap shrinks (pixel at x 110 is blue, at the old overlap is tomato).
- Evidence: `S/m-5.1.10.png` (left original, middle layers swapped, right x=80).

### 5.1.22 (new, `5-1-sin-frame-1-reading-moving-with-framecount`): matches the text, no defect
All numbers were read from a logging line pushed into `draw()`.
- `frameCount` is 1 on the first frame, 60 about one second later. Claim "1 on the first frame" holds.
- Block 1: `x = 200 + sin(frameCount*0.05)*100` ranges 100.001..299.999. Radians confirmed (x at frame 233 = 120.66, which matches sin(11.65)). "One full swing about 126 frames" holds (peak near frame 31, back near 126).
- Try this 1 (`* 40`): range 160..240. 2 (`0.1`): about twice as fast (period 63 frames). 3 (`cos` on y): y 20..220, a circle. 4 (`rotation = frameCount * 2`): rotation reads 120 at frame 61 and wraps at +-180; a full turn takes 180 frames = 3 s as claimed.
- "Simpler ways": `pos.x = pos.x + 1` creeps right (x 201 to 688 by 8 s, leaves the canvas); `vel.x = 2` in `setup()` does the same (x 202 to 1166); `rotation = rotation + 3` spins in place (x,y fixed, rotation wraps); `rotationSpeed = 3` spins in place (rotation reads 543 at frame 181, so it does not wrap here, harmless). All as written.
- "as in 5.1.9" and "as in 5.1.15": 5.1.9 does use `pos.x = pos.x + 1`, 5.1.15 does use `vel.x`. Both references correct.
- Block 2: held `a` sets player `vx -4`, `d` sets `+4`, release returns 0; the orange mover bobs y 53..179 around 120 (+-80) throughout, with or without a key. As claimed.
- **NEW, LOW**: the player has no walls. Holding `a` for 0.5 s from x 80 takes it to x -40 (off the canvas); the text does not promise it stays on screen. A student who holds a key briefly loses the blue square until they hold the opposite key.
- Sanity: `plainOutputPanes = 0`, canvases 1 per block, sprites 1 and 2, no errors.

### pos versus vel block in 5.1.15 (`5-1-15-reading-velocity`, block 2): matches
Text: orange (vel) "reaches its box, slows down, and pushes the box along in a straight line"; blue (pos) "is forced 3 pixels further into its box every frame ... the two twist and the blue square squeezes past". Tracked every 400 ms: orange and its box stay at y 170 and drift right together (box x 239 at 1.4 s, 467 at 4.9 s). The blue pair rotates 1 to 28 to 68 degrees (t 1.8 s to 3.4 s), then blue passes at x 372 and runs on (x 912 at 6.4 s). Both claims hold. Residue: by about 4 s everything has left the 400 px canvas. Not claimed otherwise.
Block 1 (`vel.x = 4`): drifts right and leaves the 360 px canvas in about 1.4 s (carried from round 1; the text says only "drifts right").

### 5.1.25 Challenges (`5-1-23-challenges`) trail: FIXED in text, residue in behaviour
- The claim now lives in `lesson.json` step 4, which the Steps side tab shows (text found on the page after opening Steps; `S/5.1.25-steps.png`). The "same dark grey" claim and the `content.md`-only orphan are gone.
- New claim: `background('rgba(34, 34, 34, 0.1)')` in place of `background('#222')` makes "each frame's paint only 10% solid, so the old frames fade out slowly behind a moving sprite instead of vanishing at once". Measured with a tomato sprite oscillating over a 400x200 canvas: the trail fades smoothly over about 8 sprite widths (`S/m-5.1.25-trail.png`, top `#222` control, bottom rgba).
- Residue (measured, unchanged from round 1): untouched pixels settle at RGBA (21,21,21,247), not (34,34,34,255), so the canvas is translucent and the page's #111 shows through; it reads nearly black next to the `#222` control. The path the sprite crossed settles at (29,29,29,255), a faint lighter strip that never clears (visible in the bottom half of the montage). The text's claims hold; a student comparing the two grey values will see them differ.
- Challenge examples run: `text('x: ' + player.pos.x, 10, 20)` draws white text on `#222` without a `fill()` call.
- **NEW, LOW-MEDIUM, output-claim**: that literal example prints unrounded floats once the player moves or collides: `x: 200.00000000000003` at rest, `x: 304.99999999999966` while moving (`S/5.1.25-c3.png`). Challenge 4 also says "the player's x and y". The reference solution wraps them in `Math.round`, but neither the challenge text nor 5.1.21 mentions rounding.
- The reference solution runs clean: canvas 500x400, player 36 px, white companion circling, `kb.presses` cycles the colour (deepskyblue, hotpink after `d`, orange after `a`), HUD `Frame:` and `Player:` visible.

### 5.1.14 key names (`5-1-19-reading-wasd`): claims hold
Box colour read after holding each key: `a` tomato, left arrow gold, `d` mediumseagreen, right arrow orchid, `w` and up arrow and others gray (no mapping).
- "`kb.pressing('left')` is true for the left arrow or `a`; a letter listens only to itself": `a` gives tomato (both lines true, lower line wins), left arrow gives gold (only the `'left'` line). 
- Two keys: `a`+left arrow gives tomato; `a`+`d` gives mediumseagreen; left+right gives orchid. "The lowest line wins" holds.
- Try this 2 and 3 (`'a'`->`'w'`, `'left'`->`'up'`; `'d'`->`'s'`, `'right'`->`'down'`): `w` tomato, up gold, `s` green, down orchid; `a` and left arrow now gray. As written.

### First-run friendly error on blank starters: FIXED
Run on the unedited starter shows, in both the sketch pane and the Console tab, the plain sentence first and the engine message second:
`Your sketch needs a canvas first: inside setup(), write new Canvas(400, 400).` then `Error: new Canvas(w, h) must be called in setup()`.
Seen on 5.1.11 (`S/5.1.11-starter-run.png`), 5.1.20, 5.1.23 (dir `5-1-21`), 5.1.25 (dir `5-1-23`). The Submit area adds "Fix runtime error before submitting". The `400, 400` in the hint matches 5.1.11 and 5.1.20 step 1 (400x400) and is within 5.1.23's 300x300..800x600 and 5.1.25's "any size". Starters for 5.1.7, 5.1.19 and 5.1.26 run clean (canvas 1; sprites 1/1/0).
Reference solutions all run with no error: 5.1.7 (gold bar 140x30 at 60,60), 5.1.11 (deepskyblue 40x40 on 400x400), 5.1.19 (speed 3, stops on release), 5.1.20 (a/d/w set +-4, release 0), 5.1.23, 5.1.25, 5.1.26 (math origin, box at 100,50).

### Several blocks on one page: NOT FIXED (still run together)
- 5.1.4 has 3 blocks. With a 3200 px tall viewport so all three are visible, Run on each in turn left all three sketches ticking: frameCount 262/244/93 then 350/329/175 1.5 s later (sprite counts of the two crowd sketches 350 and 329). `S/5.1.4-stacked-3-sketches.png` shows two pink crowds and the blue square at once.
- With the default viewport the earlier sketches that scroll out of view stop advancing (frameCount frozen at 95 and 100 for 1.5 s) while the one in view runs. That is the browser throttling off-screen iframes, not the page stopping them: they resume when scrolled back (the first iframe went 183 to 324 afterwards).
- Same on 5.1.6 (2 live), 5.1.8 (2), 5.1.22 (2): all iframes alive at the end of a run-through.
- Re-running one block restarts that block's own iframe only.

## NEW or remaining defects, ranked

1. **MEDIUM (not fixed, carried): earlier sketches keep running when another block is run** (above). On 5.1.4 it doubles the crowd cost for anyone who runs Step 1 then Step 2. Not a text defect.
2. **LOW-MEDIUM (new): Challenges 3 and 4 print long floats** (5.1.25, `x: 304.99999999999966`). The lesson text gives `text('x: ' + player.pos.x, 10, 20)` as the example.
3. **LOW (new): 5.1.18 Example 2 Step 2 "first `else` line"** is ambiguous. Evidence above (`vel` stays 0, right arrow dead).
4. **LOW (not fixed, carried R1 #8): 5.1.19 lab step 2** says "Find the two lines that say `else player.vel.x = 0;` and `else player.vel.y = 0;`". The starter lines are `else                       player.vel.x =  0;` with aligned spaces, so a literal find does not match.
5. **LOW (residue): 5.1.25 trail** leaves a permanent faint lighter strip and a translucent canvas (21,21,21,247). Text no longer overclaims.
6. **LOW (new): 5.1.22 player can leave the canvas** after about 0.3 to 0.5 s of holding one key (no walls). Not claimed.
7. **LOW (carried): 5.1.9** "a smear of blue squares" is, at 1 px per frame, one solid blue bar, and the canvas without `background()` is transparent over the page's #111, not `#222` (`S/m-5.1.9.png`). The Try-this (uncomment, rerun) does give a clean sprite on `#222`.

## Checks I could NOT perform

- **`audit.mjs` and `cs_lenses.mjs`**: not run (they read published `docs/` pages; shCode is served by Next). No `lens_findings` JSON exists. The four lenses were applied by hand. The `cs_lenses.mjs` self-check was not run.
- **5.1.13 key response (R1 "checked") intermittent under load**: on 3 of 6 page loads my first synthetic key press did not register (kb reported `pressing: false` for every key on one page load), or `kb.pressing('w')` read true while the canvas still read "w is up" in the same sample. 4 later attempts (and an instrumented copy that logged inside `draw()`) all showed `w is HELD` (242 white pixels versus 167 for `w is up`), and `Space` after changing the key name to `'space'` worked while `w` did nothing. I could not separate "iframe not focused yet at my click" from a product fault at load 70. Worth a re-test on an idle box; I am not calling it a defect.
- **5.1.2, 5.1.12 (video), 5.1.1 (slides)**: no editor; not examined. **5.1.24 Frame Loop Writeup**: two text areas, no code editor, not examined.
- **Check button, AI Check, Submit, Commit**: not clicked; this audit covers what the editors print, not what the graders accept. The new `ai-check.ts` and `LessonWorkspace` changes in 5c45931f (Submit waits for the sketch to report) were not exercised.
- **5.1.26 hover label** (`showMouse()`): not re-tested this round; only the solution's sprite position and canvas were checked.
- **Frame-rate slowdown claim (5.1.4 Step 2)**: not re-measured; round 1 numbers stand (headless software rendering).
- **Visual judgement**: screenshots were looked at by the model writing this report only where a finding names one. The lenses themselves are text and DOM/pixel measurements.
- **Dev side effect**: I typed variants into the 5.1.5, 5.1.8, 5.1.10, 5.1.13, 5.1.21, 5.1.22 and 5.1.25 editors and ran solutions in the workspace editors. The browser profile was in-memory and is closed. If the dev server keeps drafts for `dev@local`, lessons 5.1.7, 5.1.11, 5.1.19, 5.1.20, 5.1.23, 5.1.25 and 5.1.26 may open on my test code until Reset is clicked. No repo file was touched; this report is the only file written.
