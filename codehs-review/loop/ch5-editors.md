# Chapter 5 runnable-editor audit (5.1, 5.6-5.8, 5.9-5.11): GAPS FOUND (G1 to G7)

Run by cs-function-audit on 2026-11-01, branch `codehs-inspiration`, HEAD `57e7af4b`. No lesson file edited.
Dev server localhost:3002 (DEV_ROLE=student), own headless Chromium, cookie `dev_student=ch5editors`. Untouched: `mom`, `codehs`, `launcher`, `motion`, `stats45`. Nobody pkill'd.
Measurements, not verdicts: the pass/fail call is the human's.

Scope: 41 moSHion labs (each a `script.js` starter and a `solution.js`), 63 `js live` blocks in 5.1/5.6-5.11 readings and examples, the Steps and Quest drawers of every lab.
Module-to-folder map: 5.1 = `5-1-*`; 5.6 = `5-3-1..14, 5-3-35, 5-3-36`; 5.7 = `5-3-15..34`; 5.8 = `5-5-1..20`; 5.9 = `5-9-defender-*`; 5.10 = `5-10-defender-*`; 5.11 = `5-11-defender-*`.

## Gaps

### G1 (major, 5.1 and 5.6-5.8): a default sprite falls off the canvas within about 1.5 s, so the documented picture is gone
Measured in the real browser (live block 5.1.4 step 3, hoisted `player`): `allSprites` y = 221 at frame 22, 403 at frame 70, 1041 at frame 143. Same for the 5.1.11 reference solution
(y 612 at frame 100) and live block 5.8.5. Cause: `new Sprite(...)` is `dynamic` and the engine's world gravity is 9.8 by default (`world.gravity.y` read back as 9.8 in the runner;
`pl.World({ gravity: Vec2(0, 9.8) })`, unchanged since 2026-08-25). Nothing in 5.1 or 5.6-5.8 sets gravity to 0 or the sprite to static, and 5.2.2 only says a dynamic sprite "is affected by gravity".
Documented text that is untrue after about 1.3 s: 5.1.4 "a dark canvas with a square in the middle"; 5.1.7 step 1 "a tomato-colored square in the middle of a dark 360 by 360 canvas";
5.1.6 "a default-colored square centred"; 5.1.10 "a tilted blue square overlapping a red square"; 5.1.15 "a blue square that drifts right" (it also falls); 5.1.9 "smear of blue squares across the canvas"
(sprite is at y 434 after 1.5 s); 5.6.15 steps 1-4 ("A single rectangle appears at (80, 80)", "Six sprites"); 5.7.11 "A red square appears at the center"; 5.7.12/5.7.13 "five red squares should appear on screen";
5.7.10 "Click anywhere to pop the bubble: it should disappear" (already gone); 5.8.5 "The sprite is still on screen, red"; 5.8.6, 5.8.11 and 5.8.15 sprite colour/removal claims.
Browser canvas census 2.4 s after Run (1 distinct colour, 0 non-background pixels) on the reference solutions of 5.1.7, 5.1.11 (draws blank), 5.6.14, 5.7.9, 5.7.10, 5.7.12, 5.7.13, 5.7.14 (every enemy gone, HP text stays).
Labs unaffected (set `vel` each frame, `collider = 'none'`, or `'static'`): 5.1.19, 5.1.20, 5.1.22 player, 5.1.24 player, 5.6.11, 5.7.x counter labs, all of 5.9-5.11.
Suggested fix is the human's call: `world.gravity.y = 0` for 5.1-5.8 sketches (or a runner default), or teach `collider = 'static'` in 5.1.

### G2 (major, 5.1.19 live block): `'a'` and `'left'` are the same key to the engine, so "each one gives its own color" is false
`public/moshion/moshion.js` (KEY_DIRS_) maps `a/d/w/s` to `left/right/up/down`, so `kb.pressing('left')` answers for the arrow and for `a`. Node harness on the 5.1.19 block: a -> gold, ArrowLeft -> gold, d -> orchid, ArrowRight -> orchid.
The tomato and mediumseagreen lines never show. Text says "they are different keys, so each has its own line". Real browser (Run the block, click the canvas, hold each key, read `box.color` in the runner): a -> gold, ArrowLeft -> gold, d -> orchid, ArrowRight -> orchid. Confirmed.

### G3 (minor-moderate, five starters): first Run says only "Script error."
5.1.11, 5.1.20, 5.1.21, 5.1.23 and 5.6.14 starters have an empty `setup()`. Run draws nothing; the red banner and Console read `Error: Script error.` The real message
(`new Canvas(w, h) must be called in setup()`) only reaches the page console (`pageerror`). Compare 5.7.5's starter, whose error shows the full message and line. Quest still shows 0/N.

### G4 (moderate, 5.1.19 lab = folder `5-1-18-lab-else-to-zero`): steps describe a different starter than the one shipped
Description and steps 1-2: "Start from a working WASD movement pattern... Hold a WASD key: the sprite moves. Release: it stops... Find the two lines that say `else player.vel.x = 0;`... Delete both lines".
The shipped `script.js` has no else lines (it ships broken; its own comments say "Tap a WASD key once and watch the sprite drift" and "Add the missing else lines"). Measured: starter drifts after a tap, so step 1 "Release: it stops" is false and step 2 has nothing to delete.

### G5 (minor, 5.1.24 Challenges = `5-1-23-challenges`): starter and text say arrow keys, reference uses WASD
Starter STEP 6/7 and content Challenge 1 say arrow keys / `kb.presses('left')`; `solution.js` moves and cycles colour on `a/d/w/s` only. Measured: ArrowLeft does not change colour in the reference, `a` does.
(Note: via G2 the engine would accept either; the reference just does not use it.) Challenge 4 lists an FPS line; the reference HUD shows Frame and Player only.

### G6 (minor, 5.1.22 = `5-1-21-a10-1-sprite-playground`): content.md "Starter code" differs from the shipped `script.js`
content.md says "Paste this into script.js": a starter with canvas, two sprites, `a/d` pattern. The shipped `script.js` is an empty skeleton with STEP comments.

### G7 (minor, 5.11 Steps drawer, `5-11-defender-5-lab-bullet` step 2 hint): inline code pokes past the text column
`this.sprite.overlaps(enemy.sprite)` is 289 px wide in a 287 px column; the drawer scrolls sideways by 23 px (scrollWidth 342 vs clientWidth 319). At 1440 px it is fully visible but flush against the edge. 5.11.9 (`5-11-defender-sound-lab-sound-effects`) Quest drawer scrolls 2 px (321 vs 319).

### Minor text numbers
5.9.5 Try 2 says the score "jumps by about 4"; measured 5 for one shot passing through a falling drone.

## Method
- **Static:** `check-starters` (every reference scores full, every starter does not), `check-live-blocks` (491 blocks match), `check-hints` (382 requirements carry a hint): all green.
  Step and hint code (fences and inline) diffed against each `solution.js`, whitespace and comments stripped: every statement-shaped snippet is in the solution. The only absentees are by design
  (deletion instructions such as `let step = 3;` in 5.8.4, `let wave, wavePause, fallSpeed;` in 5.11.6, the debug line `text('lengths: ' ...)` in 5.10.8, `function removeEnemy(j)` offered as optional in 5.10.2/5.10.5/5.10.8, API shapes with `...`).
  Backticked identifiers in every step/hint were checked against starter plus solution: no unknown member or function name.
- **Node** (`scripts/moshion-harness.mjs`, unmodified): all 82 starter/solution files run 300 frames and then a key sweep (16 keys, 30 frames each, plus a click); sprite positions read at 30/120/240/480 frames; scripted play for the 5.9-5.11 claims.
- **Real browser** (headless Chromium, own context): every lab page loaded, editor content read back from CodeMirror and compared with `script.js` (all 41 equal), Run clicked on the starter, then the editor replaced by `solution.js` and Run again.
  Per run: runner `frameCount` read 600 ms apart, canvas pixel census at about 2.4 s, Quest count, Console panel, page `pageerror`/console. Steps and Quest drawers opened with every Hints disclosure expanded and every `code`/`pre` and every overflowing element measured at 1440 px.
  The 63 live blocks each Run in a fresh page, censused at 0.7 s and 3.5 s.
- **Lens mapping:** editor-kind: every lab mounts `/moshion/runner.html` (preview `moshion`), none is a console fence. async-output: no `setTimeout`/`.then`/`Promise`/`prompt()` in any of the 82 files, nothing to fire on.
  silent-no-output: the only `console.log` fences are in 5.6.9 (`5-3-8`); its solution prints `red` / `40` every frame into the Console panel (measured). output-claim: documented vs measured, below.

## Labs: runs, draws, Quest (real browser, starter then solution)
`Run` always advances `frameCount` about 36 per 600 ms. "blank at 2.4 s" = the canvas census found 0 non-background pixels (see G1). Quest = card count shown after Run.

| Lab (folder) | Starter | Solution |
|---|---|---|
| 5.1.7 (`5-1-7-lab-one-sprite`) | 0/3, sprite visible at start, blank at 2.4 s | 3/3, blank at 2.4 s (G1) |
| 5.1.11 (`5-1-11-moshion-intro`) | 0/4, **no canvas, "Script error."** (G3) | 4/4, blank at 2.4 s (G1) |
| 5.1.19 (`5-1-18-lab-else-to-zero`) | 0/2, drifts and falls | 2/2, 100 px of sprite visible |
| 5.1.20 (`5-1-20-moshion-move-keys`) | 0/7, **"Script error."** (G3) | 7/7 draws |
| 5.1.22 (`5-1-21-a10-1-sprite-playground`) | 0/8, **"Script error."** (G3) | 8/8 draws; `mover` falls away (G1) |
| 5.1.24 (`5-1-23-challenges`) | 1/4, **"Script error."** (G3) | 4/4 draws |
| 5.6.9 (`5-3-8`) | 0/1 draws | 1/1, Console fills with `red`/`40` each frame, as step 1 says |
| 5.6.10 (`5-3-9`) | 0/2 draws | 2/2; Space cycles red, lime, deepskyblue, orange, magenta (node) |
| 5.6.11 (`5-3-10`) | 0/2 nothing yet (by design) | 2/2; b2 stays blue when b1 changes (node) |
| 5.6.14 (`5-3-13`) | 0/5 **"Script error."** (G3) | 5/5, blank at 2.4 s (G1) |
| 5.6.16 (`5-3-36`) | 0/5 nothing on canvas, as step 1 says | 5/5, two words, 71 non-bg px |
| 5.7.3 (`5-3-17`) | 0/1 draws (0, hint text) | 1/1; two Space presses give 2 (node) |
| 5.7.4 (`5-3-18`) | 0/2 draws | 2/2; 1, 2, 3 add up to 6 (node) |
| 5.7.5 (`5-3-19`) | 0/1 `c.isHigh is not a function`, line shown, canvas blank | 1/1; red above 10, white at 10 (node) |
| 5.7.6 (`5-3-20`) | 0/1 draws | all cards met; B adds 5 and Space 1 gives 6 (node) |
| 5.7.9 (`5-3-22`) | 0/1 | 1/1, sprite falls before you can hold the arrow (G1) |
| 5.7.10 (`5-3-23`) | 0/1 | 1/1, bubble already gone before the click (G1) |
| 5.7.12 (`5-3-25`) | 0/4 | 4/4, all three Enemies fall away (G1) |
| 5.7.13 (`5-3-26`) | 0/1 | 1/1, "five red squares" gone by 1.3 s (G1) |
| 5.7.14 (`5-3-27`) | 0/2 | 2/2, five HP labels stay, squares gone (G1) |
| 5.7.19 (`5-3-31`) | 0/5, 56 px | 5/5, 200 px |
| 5.7.22 (`5-3-34`) | 0/4 | 4/4, 206 px |
| 5.8.3 (`5-5-3`) | 0/1; stays at 1 (step 1 claim) | 1/1; 1, 2, 3, 4 (node) |
| 5.8.4 (`5-5-4`) | 0/3 | 3/3; A, A, A, U comes back by the same step |
| 5.8.8 (`5-5-8`) | 0/2 | 2/2; sprite gone before the grey-out shows (G1) |
| 5.8.9 (`5-5-9`) | 0/2 | all met |
| 5.8.12 (`5-5-12`) | 0/2 | all met |
| 5.8.13 (`5-5-13`) | 0/2 | 2/2; four enemy sprites fall away (G1) |
| 5.8.16 (`5-5-16`) | 0/2 | 2/2 |
| 5.8.18 (`5-5-18`) | 0/4 | 4/4; three arrive together |
| 5.9.4 (`5-9-defender-4`) | 0/5 | 5/5 |
| 5.9.6 (`5-9-defender-6`) | 0/3 | 3/3 |
| 5.9.7 (`5-9-defender-7`) | 0/5 | 5/5 |
| 5.10.2 (`5-10-defender-2`) | 0/5 | 5/5 |
| 5.10.5 (`5-10-defender-5`) | 0/5 | 5/5 |
| 5.10.7 (`5-10-defender-7`) | 0/4 | 4/4 |
| 5.10.8 (`5-10-defender-8`) | 1/2 | 2/2 |
| 5.11.4 (`5-11-defender-4`) | 0/6 | 6/6 |
| 5.11.5 (`5-11-defender-5`) | 0/6 | 6/6 |
| 5.11.6 (`5-11-defender-6`) | 0/6 | 6/6 |
| 5.11.9 (`5-11-defender-sound-lab`) | 0/3 | 3/3 |
| 5.11.10 (`5-11-defender-9`) | 0/1 | 1/1 |

Console panel: "No messages" on every run except the four "Script error." starters, 5.7.5's starter (expected, full message), and 5.6.9's solution (expected output). No page `console` errors on any solution.

## Documented behaviour that matched (5.9-5.11, measured)
- **5.9.4:** holding left/right 3-5 s ends at x 20 and 380 (starter runs off to -700 / 800); Space gives a shot every 12 frames = 5 a second; at most 4 alive.
- **5.9.6:** each shot that lands adds exactly 1 and the drone returns to y -20 (starter: score never moves). **5.9.7:** starter top reads `base: undefined`; solution `base: 3`, 2/1/0 at frames 254/515/776, then "Game over" and "press R to play again"; R gives base 3, playing true.
- **5.10.2:** starter spawns nothing; solution lands three enemies, `base:` 2, 1, 0, round ends. **5.10.5:** starter shots pass through; solution text counts 3, 2, 1; orange scores 30, crimson 10. **5.10.7:** starter `wave: undefined`, solution `wave: 0`; waves of 3, 4, 5 at fallSpeed 0.75, 1, 1.25; R mid-wave empties the field, `wave: 0`, wave 1 returns after the 60-frame pause.
- **5.10.8:** starter after one landing: labels `1,1,3,1` against `enemyHp` of seven entries (arrays 4/7/4: the missing splice); solution 4/4/4.
- **5.11.4/5/6:** the three references play identically to the 5.10.7 reference on a 2400-frame scripted game (score, wave, base, sprite count every 240 frames all equal), as "plays exactly as before" requires; all five 5.11 starters also equal it. 5.11.10 differs only by the added `best` line.
- **5.11.9 sound lab:** `zap.volume` 0.3, `boom.rate` 0.5; over 3000 frames of held Space, 250 `zap.play()` calls = one per shot (3000 / 12); 27 `boom.play()` for 27 finished enemies (score 350 = 23 crimson + 4 orange). No sound on landing. Browser audio path (real `AudioContext`) NOT re-measured, see "Not performed".
- **Reading text vs code (5.11.1):** "8 splices, 13 lines naming enemyHp/enemyWorth, 2 removal copies" holds on the 5.10.7 reference (8 `.splice(` calls, 13 lines), "138 lines vs 177" holds on code-only lines of 5.10.7 and 5.11.6.
- **Class labs, member names:** step text for `Enemy` (`takeHit`, `isAlive`, `land`, `move`, `reachedBase`, `remove`), `Bullet` (`isAlive`, `hits(enemy)`, `spend`), `Spawner` (`ready`, `makeWave`, `wave`, `pause`), `Enemy.spawned`, `Collectible` (`collect`), `Counter`, `Score`, `Mover`, `Bubble` all exist with those names in the solutions; starters carry the same signatures.
- **5.9.3 live block:** cooldown readout 12, 11 ... 1, 12; interval 12 / 4 / 30 frames and every frame at 0; with the countdown line deleted it fires once; releasing settles at 0; at most 3 shots alive.
  **5.10.6:** pause 60 then wave 1 of 3, pause stays 90 while the field is not clear, wave 2 of 4; Try 1 (guard deleted) piles waves every 90 frames, Try 2 gives 2, 4, 6, Try 3 shortens the gap.
  **5.11.3:** Try 1 and Try 2 both leave ghost sprites (sprites on screen climbs past "in the list"); base keeps them equal.
- **5.8 live blocks:** 5.8.1 count 3 after three presses; 5.8.2 step 1 stays 1, step 2 gives 1, 2, 3, 4; 5.8.5 hp -2 after three presses; 5.8.6 step 1 reaches -2, step 2 stops at 0; 5.8.11 step 2 gives 4, 2, 0 and greys; 5.8.14 `Enemy.spawned` +1 per click, `e.spawned` undefined; 5.8.15 5 spawned, 20 Space presses leave 0 still here, one click gives 6 / 1; 5.8.17 an enemy every 90 frames, a wave of 3 together.
- **5.1 live blocks:** 5.1.10 layers (tomato then deepskyblue fills; swapped gives the reverse); 5.1.13 `w is up` / `w is HELD`, Try with `'space'` makes w inert; 5.1.3 `setup ran` once, `frames` climbs about 60 a second; 5.1.24 `Hello, canvas!` white at (20, 60); 5.1.17 a tapped `d` keeps x moving (vel.x stays 4).

## Live-block sweep (real browser, 63 blocks in 43 lessons, each Run in a fresh page)
Every block ran: `frameCount` advanced on all 63 (about 168 frames in 2.8 s), no page error, no Console message on any.
- **22 blocks are blank at 3.5 s after drawing at 0.7 s** (the sprite is the only thing drawn and it has fallen out): 5.1.10 #1; 5.1.14 #1, #3; 5.1.15 #1; 5.1.17 #1; 5.1.19 #1; 5.1.4 #3; 5.1.6 #1, #2; 5.1.8 #2; 5.6.15 #1-#4 (`5-3-14`); 5.7.11 #1-#4 (`5-3-24`); 5.7.15 #2 (`5-3-28` OOP version); 5.7.16 #1 and #2 (`5-3-29`); 5.6.7 #1 (`5-3-6`, the DevTools reveal "familiar sketch").
- **13 more have every or most sprites off the canvas at 3.5 s, with only text left**: 5.1.4 #1-#2 and 5.1.8 #1 (the "bug" demos with 137-153 of ~209 sprites off; by design a pile-up, but the pile falls away), 5.1.9 #1, 5.7.8 #1, 5.8.5 #1, 5.8.6 #1-#2, 5.8.11 #1-#2, 5.8.14 #1, 5.8.17 #1-#2.
- Blocks with no sprite (text, console or `circle()` only: 5.1.3, 5.1.5, 5.1.13, 5.1.24, 5.6.x readings, 5.7.1-5.7.5 text blocks, 5.8.1, 5.8.2, 5.8.10, 5.8.15) and the 5.9/5.10/5.11 blocks (5.9.3, 5.9.5, 5.10.6, 5.11.3) are unaffected: drawing present at both times.
- `5.1.5` draws only the dark canvas (0 non-background pixels), as its text says ("Nothing else has been drawn yet").

## Not performed
- The real Web Audio path of the 5.11.9 sound lab in the browser (is `coin.wav` decoded, does a `start` fire per shot, does `M` write the master gain). Measured only in node: counts of `zap.play()` and `boom.play()` against shots and finished enemies. The stand-in tones (peak about 12000) were not re-measured.
- Real held-key play in the browser for every lab (the Steps and Run checks used no key input; keys were driven through the node harness, and in the browser only for 5.1.19).
- Real-mouse checks of 5.7.10's click and the 5.8.14/5.8.15 click blocks (node only).
- Steps/Quest drawers at 1024 px (1440 and 700 measured; the drawer is a fixed 319 px column at 1440 and full width at 700, so only 1440 shows the 5.11.5 edge case).
- Every "Try this" edit in every live block. Done in node for 5.1.10, 5.1.13, 5.1.19, 5.9.3, 5.9.5, 5.10.6, 5.11.3; read but not run for the remaining 5.1 and 5.6-5.7 text-only blocks (their claims are `What you'll see` text that the run output matched).
- The 5.7.7 and 5.8.19 pseudocode editors (console preview, no runnable code) and quizzes: out of scope for the runner.
- Interrupted work: the first pass lost its scratch files when the session was interrupted and the dev server restarted (lesson-state is in memory and was wiped, so the student's 109 completions were re-posted); the numbers above are from the first pass where stated in the tables and from the re-run for the live-block sweep and G2.

## Result
**GAPS FOUND, no failing starter or solution in 5.9-5.11.** Every one of the 82 files in 5.1, 5.6-5.8 and 5.9-5.11 runs and advances frames; every solution reaches full Quest; every starter stays below full. Gaps for the human to rule on:
- G1 (major): default gravity drops every default `Sprite` in 5.1 and 5.6-5.8 off the canvas within about 1.5 s: 22 live blocks blank, 13 more with only text left, 8 lab solutions blank at 2.4 s (5.1.7, 5.1.11, 5.6.14, 5.7.9, 5.7.10, 5.7.12, 5.7.13, 5.7.14).
- G2 (major): 5.1.19 live block claims `a` and `left` give different colours; the engine treats them as the same key (confirmed in the real browser).
- G3, G4 (moderate): five starters answer Run with only "Script error."; the 5.1.19 lab's steps describe a starter that is not the one shipped.
- G5, G6, G7, 5.9.5 "about 4" (minor).
