# Module 5.1 walk: moderate lens (transfer)

Lens: a competent middle student who reaches back for the course's own earlier examples and adapts them. All 25 lessons (`5.1.1` to `5.1.25`) read from `lessons/5-1-*` (note: folder numbers do not match titles from 5.1.14 on, see S9). Labs run in the dev server as teacher, session `w51m` (closed). Graders were measured by bundling `lib/grader.ts` and feeding it the course-shaped answers below (harness and notes in the scratchpad: `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/walk51/`, files `h.cjs`, `t1.cjs`, `t2.cjs`, `t3.cjs`). Nothing in the repo was edited.

Chapters 1-4 give the student: `let`, conditionals and `else if` chains (2.1), loops, functions (3.1-3.2), objects and dot notation (3.5), `new Error(...)` (2.5, the only `new` they have seen), string `+`. They have never seen `sin`/`cos`/`Math.sin` (grep of 1.x-4.x content finds none), `frameCount`, or any drawing call.

Screenshot dir (S): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/walk51/`

## Ranked seams (breaks first)

### S1. The course's own keyboard model (5.1.14) ports to velocity as a drift bug, and 5.1.20 grades it 7/7. BLOCKING-ish
- Lessons: 5.1.14 (model) to 5.1.20 (lab). Also 5.1.17 and 5.1.18.
- 5.1.14's only multi-key example is four independent `if` lines, no `else`: `if (kb.pressing('left'))  box.color = 'gold'; if (kb.pressing('a')) box.color = 'tomato';` ... and its Try-this step 4 says "the line written lowest wins". A student adapting that to move a sprite writes exactly:
  ```js
  if (kb.pressing('left')) player.vel.x = -4;
  if (kb.pressing('right')) player.vel.x = 4;
  if (kb.pressing('up')) player.vel.y = -4;
  if (kb.pressing('down')) player.vel.y = 4;
  ```
  Distance from the model: change `box.color = 'gold'` to `player.vel.x = -4`. That sprite never stops (the exact bug 5.1.18 names).
- Grader: 5.1.20 requirements r1-r7 all pass on it (r5 is only `.vel.x\s*=` anywhere in `draw`, r3/r4 only `kb.pressing('left'...)`; nothing requires an `else` or a zero). Same for an `if / else if` chain with the final `else` left off. In the browser: 7/7 green, Submit enabled (dev AI was down: "The grader isn't responding ... The pattern check marked your cards instead"). Screenshot: `S/s20-drift-check.png` (sketch in `S/s20-drift-run.png`). The lab that follows 5.1.18-5.1.19's whole "else-to-zero" lesson is the one lab where it is not checked. The playground (5.1.22 r5) only needs ONE `else <x>.vel.<x|y> = 0` anywhere, so an x-only reset passes the "Else-to-zero pattern applied on both axes" rubric row.
- Also 5.1.17 (reading) gives the wrong reason for `else if`: "Without the `else if`, pressing two opposite keys at the same time could set velocity twice, causing glitchy movement." Two separate ifs just let the last one win (which 5.1.14 itself says). The correct reason (one chain, so the final `else` belongs to the pair) is never stated, so a student sees no reason to prefer the chain over 5.1.14's style.
- Bridge: one line in 5.1.14 "this works for colour because the colour is reset every frame; velocity is not reset" (or switch 5.1.14's example to the chain with an `else`), and an else-to-zero requirement in 5.1.20 (`else[\s{]*\w+\.vel\.x\s*=\s*0`), as 5.1.19 r1/r2 and 5.1.22 r5 already use.

### S2. 5.1.15 "Worked Example" is placed before the readings it depends on and contradicts 5.1.4/5.1.8/5.1.12
- Order is 5.1.13 (`kb.pressing`), 5.1.14 (key names), 5.1.15 (worked example), then 5.1.16 (velocity), 5.1.17 (movement pattern), 5.1.18 (else-to-zero). 5.1.15 uses `player.vel.x = -4`, the if/else chain and the drifting bug before 5.1.16 defines `vel`, 5.1.17 shows the chain and 5.1.18 explains the bug. 5.1.10 even says "`vel` ... deserves its own reading. You'll meet it in 5.1.16" (that promise does land, but the example in 5.1.15 breaks it first). The same "break the else on purpose" is then taught three times (5.1.15 step 2, 5.1.18 reading, 5.1.19 lab).
- 5.1.15 Worked Example 1 step 2 says of the sprite-in-draw bug "You just can't see them because they're all in the same spot." 5.1.4 step 2 says the squares spread out, 5.1.8 says "push each other apart into a growing crowd", and the 5.1.12 video narration says "They shove each other aside, and the canvas fills with squares." Three lessons and a video say one thing, the fourth says the opposite. (`lessons/5-1-14-example-keyboard/content.md`, Example 1 Step 2.)
- 5.1.15 is a title of "Worked Example: Keyboard Movement" but holds three examples; Example 1 is a duplicate of all of 5.1.4. "kinematic" in its last takeaway is never defined anywhere in 5.1.
- 5.1.15 is the only place `sin`, `cos` and `frameCount` are taught (Example 3 plus "Variations"), as a worked example with no reading, and 5.1.22 and 5.1.24 both depend on it. It works (see S4), but note the example is also the only source and sits before the velocity block, 7 screens before it is needed.
- Bridge: move 5.1.15 after 5.1.19 (or split Example 3 out as its own screen next to 5.1.21), drop Example 1, fix the "same spot" sentence.

### S3. Moving by `pos` per frame (5.1.9, video 5.1.12) versus `vel` (5.1.16): no screen says why, and 5.1.23 Q3 asks
- 5.1.9 and the 5.1.12 video both teach "make it move" as `player.pos.x = player.pos.x + 2` in `draw()`. 5.1.16 then says the engine adds `vel` to `pos` "for you" and never contrasts the two. 5.1.23 Q3 ("Why do you think the engine gives us vel instead of making us set pos.x ourselves every frame?", pointed at 5.1.16) asks for a comparison nobody made, and the rubric's example reasons (collisions/physics integrate, frame-rate independence) are in no lesson. The one hint is a bullet in 5.1.15 ("`.pos.x` directly ... is a kinematic style"). The grader accepts "any reasonable answer", so it passes anyway; the "points you back at the lesson" pointer does not.
- 5.1.22 mixes both (player by `vel`, mover by `pos`) without the course ever saying that is a choice.

### S4. Helper functions (Chapter 3) are refused by every 5.1 lab check that scopes to `draw`
- Chapters 2 and 3 teach splitting work into functions. A middle student who writes `function handleInput() {...}`, `function moveMover() {...}`, `function drawLabel() {...}` and calls them from `draw()` fails 5.1.20 r3, r4, r5, r6 and 5.1.22 r3, r4, r5, r6, r7 (the `inFunction draw` / `['draw','update']` checks never follow a call). Measured: 5.1.20 with `move()` = r1 r2 r7 only; 5.1.22 = r1 r2 r8 only; 5.1.24 Challenge 5 via `bob()` fails r4. Nothing in 5.1 models a helper (or says "put it directly in `draw()`"), so the student cannot tell why 4 of 7 cards are red. In prod the AI Check may cover it (the page says "whatever shape you wrote it in"), but with the AI down the pattern check is what students see.
- Same family: 5.1.22 r6 hard-codes the name `mover` for the velocity/`+=` branch (`enemy.vel.x = 2` fails; `enemy.pos.x = ... cos(frameCount ...)` passes because `frameCount` is name-free); `mover.vel.x = speed` (a variable) fails, `mover.vel.x = 2` (the 5.1.16 form) passes.
- `kb.pressing('ArrowLeft')` fails 5.1.20 r3/r4, though the lab's own AI prompt says "spellings such as 'ArrowLeft' work too". Not taught in 5.1, so only a mismatch between the prompt and the regex.

### S5. The same bug the course teaches (sprite made inside `draw()`) passes every lab that builds a sprite
- 5.1.4, 5.1.8 and the 5.1.12 video each teach "do not `new Sprite` in `draw()`". 5.1.11 (r2 `new\s+Sprite\s*\(` anywhere), 5.1.20 r2, 5.1.22 r2 (two `new Sprite(` anywhere), 5.1.24 r2: measured, a sketch that creates both sprites inside `draw()` passes all 8 cards of 5.1.22 and all 4 of 5.1.11. A student following the very first example in 5.1.4 (sprite in draw) gets full marks. Same for 5.1.21's order rule: `text()` placed before `background()` (invisible text) passes 5.1.22 r7.
- Fix is one `inFunction setup` requirement per lab, which the course has already used elsewhere.

### S6. 5.1.21's "So far everything on the canvas has been a sprite" is false (backward reference drift)
- 5.1.3's first live example draws `text('frames: ' + frames, 20, 90)` with `fill('white'); textSize(20);`, and 5.1.13's does `text('w is HELD', 20, 90)`. Neither explains `fill`, `textSize` or `text`. 5.1.21 then introduces all three as new, opening with "So far everything on the canvas has been a sprite." The student has typed past those three calls twice with the explanation postponed 18 screens. (No prior reading promises it.)

### S7. 5.1.24 and 5.1.22: stale `content.md` that contradicts the live lesson, and a solution that uses untaught forms
- `lessons/5-1-23-challenges/content.md` describes SIX challenges ("Challenge 3: Inspect + display (hard)" with DevTools, `Object.keys(player)`, "classes in Week 12", Challenge 4 with `frameRate()`, Challenge 5 trail with `rgba` background, Challenge 6 `lerp`). The lesson the student sees (steps tab, `S/s24-steps.png`) lists FIVE challenges with different numbering and content (Challenge 3 = show a value, Challenge 5 = a wave). The page text does not contain "Challenge 6" or "DevTools" (checked in the browser), so `content.md` is dead for the student, but it is what an author or teacher would open and it still teaches `kb.presses`, `lerp`, template strings and `frameRate()` that nothing in 5.1 covers. `lessons/5-1-21-a10-1-sprite-playground/content.md` is similarly a pre-renumber "A10.1" spec (points table, "text label at the top", "Take a screenshot") that the live lab does not show.
- In 5.1.24's step 4 the five challenges render as one block (paragraph breaks lost, `S/s24-steps.png`), so "Challenge 1" ... "Challenge 5" read as a wall.
- Solutions (the "Solution" panel a student can reach): 5.1.24 solution uses `kb.presses` (its own comment: "which 5.2.9 teaches"), `companion.collider = 'none'`, and `player.x`/`companion.x` shorthand; 5.1.22's solution uses `mover.x` and `Math.sin`. The course modelled `pos.x` and `sin`. All are accepted by the graders (they allow `x`/`pos.x` and `Math.sin`), but a student who opens the solution meets four untaught forms.
- Step 4 Challenge 2 never mentions that a companion with the default collider can be pushed; fine at radius 60 (worked in `S/s24-ch2-run.png`), so no finding, only that `collider = 'none'` appears in the solution unprompted.

### S8. The first and the second 5.1.14 claims conflict with the engine
- 5.1.14: "Both name the 'left' direction, but they are different keys, so each has its own line." `public/moshion/moshion.js` (lines 114-119) and the Docs (Input, "Keyboard basics") say `kb.pressing('left')` already answers for the left arrow OR `a`. The 5.1.14 example still behaves as described (the later `'a'` line recolours last), but the explanation is the opposite of the engine; the Docs the student is told to use say "You get both control schemes without writing either one twice". 5.1.22 hint "Pick one set of keys and use it for all four directions" has the same blind spot (either set would have been enough).

### S9. Pointers and numbers that drifted
- Folder ids no longer match titles: `5-1-19-reading-wasd` is 5.1.14, `5-1-14-example-keyboard` is 5.1.15, `5-1-15..18` are 5.1.16..19, `5-1-24-reading-text-labels` is 5.1.21, `5-1-21-a10-1-...` is 5.1.22, `5-1-22-...` is 5.1.23, `5-1-23-challenges` is 5.1.24. Every student-visible title/number citation resolves correctly (checked all ~140 `5.1.N` mentions by script against titles), so only authors see this.
- `lessons/5-1-13-reading-input/lesson.json` description: "Read before 5.1.14 (Velocity)". 5.1.14 is Key names; velocity is 5.1.16. (Stale; only matters where description is shown.)
- 5.1.19 hints (s1, s4): "find the Sprite velocity section" / "review the velocity section". The docs drawer sections are Overview, Canvas, Coordinates, Sprite, Physics, Collisions & Overlaps, Groups, Camera, Input, Joints, Animation, Text & HUD, Persistence, Game Patterns, and Sprite's subsections (Your first sprite, Collider types, Position/rotation/scale, Color/visibility/layer, Shape options, Removing, Angular velocity, Speed/direction/moveTowards, ...). There is no "Sprite velocity" section; `vel.x = 4` first appears in an Input example. The "Canvas", "Sprite", "Coordinates" pointers in 5.1.11/5.1.25 do land.
- 5.1.25's solution aside, the first example the Docs opens on ("Overview") has `world.gravity.y = 10`, which makes a sprite fall; the 5.1 readings never set gravity (default 0). Minor.
- Prose references resolved: "Heads-up: the next reading (5.1.8)" in 5.1.6 (skips the 5.1.7 lab, still lands on the reading), "meet properly in 5.1.10" in 5.1.9, "Next up: the movement pattern reading" in 5.1.16 and "covered in detail in the next reading" in 5.1.17 all land. Help: pointers on requirements all name the right screen (5.1.5, 5.1.6, 5.1.9, 5.1.14, 5.1.16, 5.1.17, 5.1.18, 5.1.21, 5.1.15). Missing pointers: 5.1.11 r2 and r4, 5.1.24 r4.

### S10. Video versus lessons
- 5.1.2 (checked audio cues in `public/videos/5-1-2/audio/en/timings.js`): the sketch is `new Canvas(400, 400); new Sprite(200, 200);` with a two-number sprite (50 x 50 default). 5.1.6 teaches only the four-number form, never says width and height are optional or that 50 is the default, and 5.1.7 r1/r2 refuse the two-number form from the video (`new Sprite(100, 100)` fails r1 AND r2, since r2 needs the last two numbers; measured). The video also says "Both are 400 pixels, the tiny dots that make up a screen" and "On a math graph, though, y goes up", which pay off in 5.1.5 and 5.1.25. "Next, read 5.1.3 ... setup box, and a second box named draw" lands (5.1.3).
- 5.1.12 matches the lessons well: the added line is `player.pos.x = player.pos.x + 2` (the 5.1.9 form), starting from 5.1.11's solution (200, 200, 40, 40, deepskyblue); it cites "5.1.4" for the bug and "5.1.13" next, both correct. Its "2 x 60 = 120 pixels" is the same arithmetic 5.1.23 Q2 asks for, so that transfer works (see S3 for the missing vel comparison). The only mismatch is S2 (5.1.15 "same spot").
- 5.1.1: the slide deck is not published; the student sees "These slides aren't published yet ... mark this complete and carry on", and the lesson's description is shown under the title: "Placeholder until the deck is rebuilt from bookSHelf" (`S/s01.png`).

## Transfer chain, lesson by lesson (what carries)

Distance = how far the student's edit is from the earlier example.

| Lab | Copied from | Distance | Note |
| --- | --- | --- | --- |
| 5.1.7 (explore) | 5.1.6 `new Sprite(180,180,60,60).color` | change numbers/colour | Good. r2 `(?!60,60)` is the right tolerance. |
| 5.1.11 (Hello Sprite) | 5.1.4 step 3 + 5.1.8 | zero (solution is verbatim) | Fine; passes the pile-up version (S5). |
| 5.1.19 (drift) | 5.1.17 Try-it chain | delete 2 lines, change `4` | Starter already scores r1, r2 green; the delete/observe steps are not graded (intended). `else { player.vel.x = 0; }` and `=0 ;` accepted; `!kb.pressing(...)` rewrite refused (not taught). Speed via a variable accepted. |
| 5.1.20 (Make it Move) | 5.1.17 Try-it chain | zero (copy) | Fails on 5.1.14's model (S1) and helper functions (S4). |
| 5.1.22 (Playground) | 5.1.20 + 5.1.15 Ex3 `sin` + 5.1.21 `text` | three one-line copies | Carries well: Ex3's `mover.pos.x = 400 + sin(frameCount * 0.05) * 80`, `rotation = frameCount * 2` and `fill/textSize/text` all pass. Ex3's hard-coded 400 sits off-screen on the minimum 300 px canvas the lab allows. |
| 5.1.24 (Challenges) | 5.1.15 variations, 5.1.14 colour, 5.1.21 | small | All five challenges in the step text pass when written the way the lessons showed them, except Ch1 written with a `let held = kb.pressing(...)` variable and Ch5 via a helper (both refused). Ch2 orbit + HUD adapted from 5.1.15 and 5.1.21 ran correctly in the browser (`S/s24-ch2-run.png`). |
| 5.1.25 (math grid, optional) | 5.1.6 | new construct, own steps | `showGrid()` with no argument and `"math"` accepted; y as a variable refused (fine, optional). |

## Chapters 1-4 seams the student crosses here
- `new` (5.1.5, 5.1.6, video 5.1.2): "you create one with `new Canvas(w, h)`" with no explanation. The only earlier `new` is `throw new Error(...)` in 2.5. The course defers the idea on purpose (module doc says OOP is a later reveal), so it is a carried-on-faith item rather than a defect; no screen says "copy the `new` words as written".
- Dot notation chain `player.vel.x = 4` (two dots) and `player.pos.x = player.pos.x + 1`: 3.5 taught dots on plain objects; 5.1.10 re-defines "property" as if new. Carries.
- `sin`/`cos`: new in 5.1.15, taught only as "scale, sin, scale, offset" with no reading (S2).
- `text(` / `+` with a number (5.1.24 Challenge 3 "joining words and a number with `+`"): string `+` is from 1.2; carries.

## What carries well (not findings)
- 5.1.3 to 5.1.4 to 5.1.8 to 5.1.11: `setup()`/`draw()`, then the hoist, then the `let` variable, then the lab, each reusing the previous screen's code nearly verbatim.
- 5.1.17 to 5.1.18 to 5.1.19: one pattern, one deliberately broken copy, one lab, with Help pointers pointing straight back.
- Video 5.1.12 matches 5.1.9/5.1.10/5.1.11 line for line (`player`, `pos.x`, 40 x 40, deepskyblue).
- All numeric citations in the module resolve; the Help text titles match the titles (checked by script).

## Suggested order of fixes
1. S1 (add else-to-zero to 5.1.20; fix 5.1.17's reason; flag in 5.1.14).
2. S2 and S3 (reorder or split 5.1.15; fix "same spot"; add a pos-versus-vel sentence to 5.1.16).
3. S4/S5 (let `inFunction` checks follow one level of calls, or add a one-line note; add `inFunction setup` for the sprite requirements).
4. S6-S9 (wording, stale content.md, doc-section names).
