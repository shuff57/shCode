# Module 5.1 walk, round 2: moderate lens (transfer)

Lens: a middle student who adapts the course's own earlier examples. Read-only. Module is now 26 lessons (5.1.1 to 5.1.26). I read the content and lesson.json of 5.1.13-5.1.26 and re-ran the real grader (`lib/grader.ts` bundled fresh) on about 70 course-shaped answers. I drove 5.1.20 and 5.1.15 in the browser (session `w51m2`, closed at the end). The dev AI was down, so Check was the pattern fallback. I did not re-run every live block in 5.1.22 or 5.1.21; I read them. I did not re-check 5.1.1 (slides placeholder), 5.1.7, or the 5.1.25 step-4 paragraph rendering.

Scratch dir (S): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/walk51r2/`. It holds the test scripts `t20.cjs`, `t23.cjs`, `t_misc.cjs`, the citation sweep `cites.txt` and `prose.txt`, and the screenshots.

## 1. First-report items

| # | Item | Status |
| --- | --- | --- |
| S1 | Drift: 5.1.14's four-ifs port to `vel` scores 7/7 | **Mostly fixed, one hole left** (see N1). The four-ifs-with-no-reset version now scores 5/7 in 5.1.20 ("Still needed (2)", cards r5 and r6 red, each with a Help pointer to 5.1.15/5.1.17 and a "tap a key and let go" hint; `S/s20-drift-check.png`, `S/s20-drift-quest.png`). The same sketch fails r5 in 5.1.23. 5.1.14 step 5 now ends with "Anything a key changes needs a line that puts it back ... You will meet this rule again when keys change a sprite's speed". That is the missing bridge, and its reset-at-top shape works (below). 5.1.16 now gives the right reason for the chain: "Because they are one chain, the final `else` runs only when neither key is held". The old wrong "glitchy movement" sentence is gone from 5.1.17. |
| S2 | Worked Example before its readings; "same spot"; kinematic; sin in a worked example | **Fixed.** Order is 5.1.14 keys, 15 vel, 16 pattern, 17 else-to-zero, 18 Worked Example, 19 drift lab. Example 1's bug text now matches 5.1.4 ("push each other apart"). "kinematic" and the sin example are gone from 5.1.18. A new reading, 5.1.22, teaches `frameCount`/`sin`/`cos`/`rotationSpeed`. Residual nit: Example 1 is still a repeat of 5.1.4, but it says "again, as a reminder". |
| S3 | Why `vel` and not `pos`? | **Fixed.** 5.1.15 has a "Moving by `pos` or by `vel`?" section and a side-by-side demo. I ran it: the orange (`vel`) square reaches the gray box and shoves it along. The blue (`pos`) square piles in, and the gray box is knocked and twisted off (`S/vel-strip.png`). The text says "twist and the blue square squeezes past", which is a loose match. 5.1.24 Q3 points at 5.1.15, and its rubric reasons (engine knows the speed, so it handles bumps) are now in that paragraph. A student can answer from the course. 5.1.15's last outcome question also asks it. |
| S4 | Helper functions refused | **Mostly fixed.** Accepted in 5.1.20 (`handleInput()`, and `moveX()`/`moveY()`), in 5.1.23 (input, mover and label each in its own helper), and in 5.1.25 (Challenge 3 via `hud()`). A mover with any name works (`enemy`), by `sin` or by `vel`. `'ArrowLeft'` is accepted. A ternary, reset-at-top, `{}`-braced elses and a speed variable all pass. Still refused: 5.1.19 with the whole pattern in a helper (r1, r2 and r3 all red), and `background()` inside a helper called from `draw()` (5.1.20 r7, 5.1.23 r8). See N3. |
| S5 | Sprite built in `draw()` passes every lab | **Not fixed** (N2). |
| S6 | "So far everything has been a sprite" | **Fixed.** 5.1.21 now says "You have already seen words on the canvas twice: the frame counter in 5.1.3 and the `w is HELD` sketch in 5.1.13". 5.1.3 says a later reading covers `fill`/`textSize`/`text`. |
| S7 | Stale content.md and solutions with untaught forms | **Partly.** 5.1.25 `content.md` now matches the five challenges. Playground `content.md` still carries the old A10.1 spec, but students never see it. The solutions are unchanged and still use untaught forms (N4). |
| S8 | 5.1.14 claimed `'a'` and `'left'` are different keys | **Fixed.** It now says `'left'` listens to **a** too, and works the "lowest line wins" consequence through. Its Try-this step 1 explains why **a** gives tomato. |
| S9 | Drifted pointers | **Fixed.** I swept all 180 number-shaped `5.1.N` citations (steps, hints, requirement Help lines, descriptions, content, starter comments) against current titles, and every one resolves; see `S/cites.txt`. The prose pointers resolve too: 5.1.15 "next up: the movement pattern reading" is 5.1.16; 5.1.16 "the next reading covers this" is 5.1.17; 5.1.10 "meet it in 5.1.15" is velocity; 5.1.6 "next reading (5.1.8)" lands on the reading, skipping the 5.1.7 lab. Read-before lines are consistent. 5.1.13's description now says 5.1.14 is key names. 5.1.19's Docs hint ("Physics, Gravity and velocity") exists as a docs section (`lib/moshion-docs.ts:779`). Every requirement on 5.1.11, 5.1.19, 5.1.20, 5.1.23 and 5.1.25 carries a Help pointer, and each names the right screen. The earlier gaps in 5.1.11 r2 and r4 and 5.1.25 r4 are filled. |
| S10 | Video's two-number sprite refused | **Fixed for 5.1.11** (`new Sprite(200, 200)` passes). 5.1.7 not re-run. |

Answer to the focus question: the course now steers a student to a working sprite by two routes. One is 5.1.14 step 5 followed by reset-at-top. The other is 5.1.16's chain. I tested reset-at-top in the browser: it moves while the key is held and stops on release (`S/top-strip.png`). 5.1.20 refuses a sprite that never stops. But it does not refuse a sprite that stops incorrectly (N1).

## 2. New problems, ranked

### N1. A misplaced `else` scores 7/7 on a sprite that cannot go left or up. HIGH (blocking-ish)
- Lessons: 5.1.20 (r5/r6), 5.1.23 (r5), 5.1.19 (r1/r2), reached from 5.1.14's model.
- Adaptation: a student takes 5.1.14's four independent ifs, changes the colours to velocities, sees the sprite drift, and is told by the red cards that a final `else` "sets it to 0". They add the `else` after the last `if` of each axis:
  ```js
  if (kb.pressing('left'))  player.vel.x = -4;
  if (kb.pressing('right')) player.vel.x = 4;
  else player.vel.x = 0;
  ```
  The distance is one added line. It scores 7/7 in 5.1.20 and 8/8 in 5.1.23, and Submit enables. In the browser the sprite moved right but did **not** move left when I held the left arrow (`S/bug-left-held.png` against `S/bug-right-held.png`), because the `else` is attached only to the right-key `if` and zeroes `vel.x` every frame the right key is up. Up is broken the same way.
- Why the course does not catch it: 5.1.16's outcome question "What would happen if you used two separate `if` blocks instead of `if / else if`?" is answered only for "no else". The trap of two ifs plus one trailing `else` is never shown. It is also the shape a student reaches by combining 5.1.14 (separate ifs) with 5.1.17's "add the else".
- Bridge: either one sentence and a run-it example in 5.1.16 ("an `else` belongs to the `if` right above it"), or a grader that requires an `else if` or a reset above the keys. I checked the matching regex: it only looks for `else ... vel.x = 0` somewhere in the function.
- Related and smaller: 5.1.23 r5 passes with the x-axis reset only (the `y` chain has no final `else`), although the rubric row says "applied on both axes". Likewise a mover driven by `mover.vel.x = player.vel.x` passes r6, so it moves only while a key is held.

### N2. A sprite created inside `draw()` still passes every sprite lab. MEDIUM (S5, not fixed)
- 5.1.11 r2, 5.1.20 r2 and 5.1.23 r2 are plain `new Sprite(` matches anywhere, and all three pass on a sketch that makes the sprite in `draw()` (measured: 4/4, 7/7, 8/8). That is the exact bug 5.1.4, 5.1.8, the video and 5.1.18 all warn about, and the course's first example (5.1.4 step 1) is that code.
- 5.1.23 r7 passes with `text()` placed before `background()`, the invisible-text bug 5.1.21 teaches. The `text()` check on a sketch whose label sits only in `setup()` correctly fails.
- Bridge: one `inFunction setup` requirement per lab, as the course has already done elsewhere.

### N3. 5.1.19 and the `background` check do not follow a helper. LOW-MEDIUM
- 5.1.19 r1, r2 and r3 are `inFunction draw`, so moving the starter's whole pattern into `steer()` turns all three red. 5.1.20 and 5.1.23 accept the same refactor. The inconsistency is the finding, because the 5.1.19 card says only "Restore else ...".
- `background('#222')` inside a helper that `draw()` calls is refused by 5.1.20 r7 and 5.1.23 r8, even though 5.1.20 r3-r6 follow helpers.

### N4. Reference solutions still model untaught forms. LOW-MEDIUM
- 5.1.25 solution: `kb.presses` (comment: "which 5.2.9 teaches"), `companion.collider = 'none'`, and `player.x` shorthand. 5.1.23 solution: `mover.x` and `Math.sin`.
- The course modelled `pos.x` and bare `sin`. A student who opens Solution meets four unseen forms. The graders accept both spellings.

### N5. 5.1.25 "own idea" and Challenge 1 are narrower than what 5.1.22 teaches. LOW
- `player.rotationSpeed = 3` set once in `setup()` fails r4. 5.1.22 teaches exactly that as a way to move on its own, and the lab says "something else beyond a canvas, a sprite and a background counts". `player.rotation = frameCount * 2;` in `draw()` passes. Challenge 1 written as `let held = kb.pressing('left'); if (held) ...` also fails r4. The `inFunction draw` form with `kb.pressing()` inline is the only shape modelled in 5.1.13/5.1.14, so this one is a stretch.

### N6. 5.1.18 title and example wording. LOW
- Lesson title is "Worked Example: Keyboard Movement" (singular), but the page opens "5.1.18 Worked Examples" and Example 1 is a repeat of 5.1.4 (the minimum sprite). A student who opened it for the keyboard sees the sprite program first. It does say "again, as a reminder".
- Example 2 step 2 says to comment out "the first `else` line (the one that sets `player.vel.x` to `0`)". In the live block there are two `else` lines per axis (`else if` and `else`), so "first else" can be misread as the `else if (right)` line. Commenting that one out breaks the right key, not the stop. The fenced snippet above it is unambiguous.

## 3. What transfers well in round 2 (not findings)
- 5.1.14 (colour reset at top) to 5.1.20 (velocity reset at top) is a one-word edit and works. That is the most reusable bridge in the module.
- 5.1.22's "one sprite you drive, one that moves itself" live block is the Playground's shape almost verbatim. Playground step 3 lists every route (sin, circle, spin, `pos` nudge, `vel` in `setup`, `rotationSpeed`), and the grader accepts all of them (measured).
- 5.1.22 to 5.1.25: Challenge 2 (orbit) and Challenge 5 (wave) are one-line edits of the 5.1.22 reading, and Challenge 3 and Challenge 4 are edits of 5.1.21. All passed when written the way the readings showed them.
- 5.1.15 to 5.1.24 Q3 now has a source in the course.

## Suggested fix order
1. N1: one sentence and example in 5.1.16 (an `else` belongs to the `if` above it), plus tighten r5/r6 in 5.1.20 and 5.1.23, and the 5.1.23 both-axes row.
2. N2: an `inFunction setup` sprite requirement per lab, and a draw-order check for `text()` after `background()`.
3. N3: follow helpers in 5.1.19, or add a one-line card note; let `background` count in a helper.
4. N4/N5/N6: align solutions to the taught forms; accept `rotationSpeed` in `setup` for Challenge 4; retitle 5.1.18.
