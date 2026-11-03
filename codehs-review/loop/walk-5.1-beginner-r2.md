# Module 5.1 round 2 walk: struggling beginner (session w51b2)

Dev server, DEV_ROLE=teacher, 1280x720, headless. Dev has no AI, so every Check verdict is the pattern fallback. Screenshots: /tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/walk51r2/ . Code was put into the editor with a programmatic fill (not keystroke by keystroke).

## First-report items

1. 5.1.22 r6 `mover.pos.x = mover.pos.x + 1` and `pos.y = pos.y - 1` refused: FIXED. Both give 8/8 (pg_a1.png). Also accepted: `+= 2`, `mover.x = mover.x + 1`, rotation + 3, `rotationSpeed` in setup, `vel.x = 2` in setup, sin+cos orbit, `rotation = frameCount * 2`, arrow keys with braces, and renaming player and mover to hero and ball.
2. Brief hidden behind File > content.md: FIXED. Step 3 of the Steps drawer is now self-sufficient and names `sin(frameCount * 0.05)`, rotation, `pos.x = pos.x + 1` (5.1.9) and `vel` (5.1.15). The Quest card for r6 says what to try and how to self-check. The reading is the new 5.1.22.
3. Worked Examples used `vel`, `if/else`, the else-to-zero rule and `sin` before they were taught: FIXED. The lesson is now 5.1.18, after velocity (5.1.15), the movement pattern (5.1.16) and else-to-zero (5.1.17). It contains no sin, cos or frameCount. The old "performance tab" line is gone (grep finds nothing).
4. Undefined vocabulary in 5.1.3 (`function`, `let`, `console.log`, fill, textSize, text, `+`): PARTLY. 5.1.3 now says "function, let and console.log are the same ones you used in Chapters 1 to 3" and gives one line each for fill, textSize, text and `+`. Fair for this course. Still never defined in 5.1: "variable" (5.1.4 uses it, 5.1.8 teaches it), "define", and `if (cond)` itself. The 5.1.13 sketch uses `if ... else` with no gloss.
5. 5.1.3 console claim and Stop: FIXED for the console. The 5.1.3 block is a "live console" block, and "setup ran" prints in a Console box under the canvas (513.png). Reading blocks still have only Run and Reset, no Stop.
6. 5.1.4 "squares crowd out" wording: NOT FIXED (cosmetic). Line 5 still says "more and more squares pile up and spread out until they cover the whole canvas". The worked-example copy in 5.1.18 says the same.
7. Docs drawer hints ("find the Canvas section") in 5.1.11, 5.1.19 and 5.1.26: NOT FIXED. The drawer still opens on Overview ("aimed at people who've written a little JavaScript ... Box2D ... planck.js", docs.png). The 5.1.19 hint now names a page ("Physics, Gravity and velocity"), which is better. The 5.1.11 and 5.1.26 hints are unchanged.
8. Error messages: FIXED. Real runs with the exact code:
   - Missing `)` in `new Sprite(200, 200, 40, 40;`: "There is a typo near line 5: missing ) after argument list" (e1.png), then the raw error and `sketch.js:5`. "argument list" is still jargon, but there is a line number.
   - `player = Sprite(...)` with no new: "Put the word new in front: new Sprite(...)." (e2.png).
   - `player.color = deepskyblue;`: "The word deepskyblue is not defined. If it is a colour or text, put quotes around it." (e3.png).
   - Untouched starter then Run: "Your sketch needs a canvas first: inside setup(), write new Canvas(400, 400)." (e4.png). This is a red box on a student who has done nothing yet, but the sentence is useful.
9. Green on a crashing sketch (5.1.26): FIXED. With `world.origin = 'math'` after the sprite, Check marks 4/4 but Submit stays disabled ("Fix runtime error before submitting"). Moving the line up enables Submit.
10. Layout, Steps drawer open, 1280x720: PARTLY. The editor is now 480 px wide, was about 420 (511-steps.png). Code lines no longer wrap at 30 characters, and a long comment still wraps. The preview is about 360 px, so a 400x400 canvas is scaled or letterboxed rather than cut off (pg-quest.png). Run does not turn into a tall two-line block on error any more. Commit, History and Submit wrap to a second row when an error is showing. The drawer still persists across lessons, and with it closed the preview starts below the fold.
11. Stale descriptions: 5.1.3 "Read before 5.1.4 (Worked Example)" is now correct, and 5.1.13 "Read before 5.1.14 (Key names)" is correct. Every `5.1.N` in every lesson.json and content.md resolves to the right title, including the 5.1.18 to 5.1.24 renumber. One new stale one is listed under NEW 2.
12. 5.1.24 rubric table above the questions: NOT FIXED (524.png). The page opens with the Rubric table (Q1/Q2/Q3), and the questions come later.

Graders that were too strict:
- 5.1.19 ternary and reset-at-top-then-ifs: FIXED. Both give 3/3.
- 5.1.20 reset-at-top and independent ifs, braces, `width / 2`, `background(30)`, `hero` instead of `player`: all 7/7.
- 5.1.7 `100.5`, a `let box` variable, a hex colour, and `box.x = 250; box.w = 90`: all 3/3. A negative x `new Sprite(-20, 60, 140, 30)` is PARTLY fixed: 2/3, was 1/3. I did not find which card fails.
- 5.1.25 r4 `rotation = frameCount * 2`: FIXED, 4/4. `let held = kb.pressing('left'); if (held) ...` is still refused (3/4). That shape is never taught, so this is a note.
- 5.1.26 sprite y as a variable (`let y = 50` inside setup), `showGrid(25)`, negative x: all 4/4.

## NEW problems, ranked

No quit point this round. 5.1.23 is startable and finishable with what the earlier screens show.

1. 5.1.18 Step 2, ambiguous edit instruction. It says "put `//` in front of the first `else` line (the one that sets `player.vel.x` to `0`)". In the live block the first line that starts with `else` is `else if (kb.pressing('right')) ... = 4;`, not the one that sets 0, and there are two else-to-zero lines because the block has both axes. A literal student comments out the wrong line, so the drift they were told to expect does not appear. Suggested wording: "the line `else player.vel.x = 0;`".
2. 5.1.10 description: "Read before 5.1.11 (worked example)". 5.1.11 is the Hello Sprite lab. The worked example is 5.1.4. This is a plausible-but-wrong near neighbour.
3. First Check after a code swap: on 5.1.26 with a valid sketch, the first Check returned 0/4. Pressing Check again returned 4/4. I used programmatic fills, so I cannot say a real typist would see it. Worth a look: the card state may read the draft before it syncs.
4. 5.1.7 negative x: still 2/3, with no clue which card is wrong (above).
5. 5.1.3 / 5.1.4: "variable" and `if` remain unexplained until later, as in item 4 above. Minor, because Chapters 1 to 3 are the stated prerequisite.
6. Drawer hint text for the Docs drawer (item 7) is the same unchanged wrong-register page.

New fixes that introduced no problems:
- 5.1.22 reading: all three live blocks ran with no console errors. Every term in it (frameCount, sin, cos, radians, rotationSpeed, `*`) is defined where it is first used. It cites `pos.x = pos.x + 1` from 5.1.9, `vel` from 5.1.15 and `rotation` degrees from 5.1.10, and all three are in earlier lessons. The example matches the Playground shape.
- 5.1.18 contains nothing untaught. `//` is explained in 5.1.9, before it is used.
- Submit waits for the sketch: confirmed in the 5.1.26 crash case.

## WORKED CLEANLY
5.1.11 (1/4, then 4/4 line by line; the friendly errors), 5.1.19, 5.1.20, 5.1.22, 5.1.23 (8/8 with six different motion shapes and a renamed pair), 5.1.26 (optional, clear).
