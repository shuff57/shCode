# Beginner lens, round 2: module 6.10 Breakout (replay after round 1)

Date 2026-11-01. Commit 59d61d25 (breakout lens round 1). Session: own headless Chromium (Python Playwright), cookie dev_student=b610beg2, dev server :3002, DEV_ROLE=student, lock ON, no stubbed POSTs. Walked 1 to 13 in order through the real lock (lesson 1 first; every later lesson opened only after the one before it was done). All 13 end "completed". AI grader absent in dev (6.10.1 and 6.10.11 show "The grader isn't responding right now" and advance, as before). No repo files edited.

Method. Each lab built one STEP at a time from the step text (run after each step, Quest cards read after each run), then the finished game played in the browser. Card progress tracked exactly the steps done on 4, 5, 6, 8, 9, 10 (starter all red; one step, one card, no early green, no red left over). 6.10.13 checked with 12 variants.

## QUIT POINT
None. Nothing in the module is unstartable or refused with a reason the student cannot read. The round-1 quit point (6.10.13 r2) is gone.

## Round-1 fixes verified in the browser

1. Guarded wall flip. 6.10.5 s2 now gives `if (ball.x < R && vx < 0) vx = -vx;` and `if (ball.x > 400 - R && vx > 0) vx = -vx;` word for word in the hints. Typed one step at a time: cards go 1/6, then r2 and r3 green together after the wall lines, r4 and r5 after the paddle, r6 after serve(). 6.10.2 explains the guard in the wall paragraph and again under the paddle; 6.10.3's live block carries the same two lines with a comment. The card r2 text tells the student the direction test is what stops sticking. No Run error at any partial state.
2. Click-canvas reminders. Confirmed the need and the fix live. 6.10.4 (control = 'keys', Run, hold ArrowRight): paddle x stays 200. After a click on the canvas it goes to 360. 6.10.9 (three misses, "Out of balls. Press R"): R without a click does nothing, R after a click gives score 10 / lives 3. 6.10.10 (title, key 2): nothing without a click, game starts after a click. The step text now says "click the canvas so the sketch hears your keys (5.1.13)" in 6.10.4 s2, 6.10.9 s2, 6.10.10 s2 (both 1 and 2) and s3, and the 6.10.13 first hint. A literal student following the text is never left waiting.
3. 6.10.13 r2. The lesson's own sentence `// Press 3 for one ball, with the mouse.` now turns r2 green, placed below the title line, above it, or in place of it. Also green: `// Key 3 gives the player one ball, so every miss counts.`, `// My rule: key 3 gives one ball and no spare lives.`, `//Key 3 = one ball (hard mode)`, two separate comment lines. Red, and the card says why: `// Hard mode` (two words), `// One ball mode` (three words), a `/* */` comment. The card text now matches the check ("at least four words ... numbers included ... only the title line with the lesson number does not count").
4. 6.10.13 r1. Serve speed (`vx = 5; vy = -6`) now passes, plus `lives = 5`, `lives = 1`, narrower paddle, Challenge 1 as written, and the reference (all three). Challenge 3's step now says `wallNum = 0` goes above `bricks = makeBricks();` and why.
5. Smaller. 6.10.5 s1 now says "Press Stop, then Run" and the button is labelled Stop while running (matches). 6.10.10 s1 gives x about 30: lines at x 30 fit on the canvas (seen: "Press 2 to play with the arrow keys" reaches x about 415 of 658 px preview, nothing clipped). 6.10.10 one-line titles are accepted (per fix table, not re-walked; the two-line title I typed passed).

Quiz 6.10.12: 8 questions, key 1,0,2,3,1,3,0,2 passes ("completed"). Q2 (`ball.x < R`) still agrees with the lab's guarded line.

## BLOCKING
None. Every step is startable with what the ledger holds.

## GRADER (taught answers refused)
None new. Remaining reds are all explained by the card: two or three word comment (card says four words), a `/* */` comment (card says `//`).
Observation, not a finding: 6.10.13 r2 turns green with the sentence placed below all the code even though the card says "above the first line of code". Lax in the student's favour; no beginner is hurt.

## ORDERING / UNTAUGHT
1. LOW. 6.10.5 s2 says the wall direction test is "the same idea as the paddle's `vy > 0` in step 3". Step 3 is not done yet, so a literal student has nothing to compare with. The sentence cites 6.10.2, which does explain it, and it is not needed to type the lines (the two lines are given in the hints). Suggest "the same idea as the paddle test you add next". Same shape in 6.10.2: the wall paragraph says "the paddle section below says why" and it does, two paragraphs later. Neither blocks.
2. LOW. 6.10.13 Challenge 1 asks to add `Press 3 for one ball, with the mouse` to the title screen but gives no y or x. The reference puts it at (27, 290), and the ball waits at y 300, so a student who copies the 6.10.10 pattern one line lower (y 290) is fine, but the line is not graded and no screen says where. Not needed for the check; the key itself works (tested: key 3 gives `lives: 1`).
3. LOW (unchanged, checked still fine). 6.10.10 s1 hint says "as in 6.6.11" (title drawn in `draw()` there, in `drawTop()` here); `drawTop` is in the starter and taught in 5.4.

No step in any of the 13 lessons asks for something an earlier screen does not hold. Terms (vx, vy, R, serve, steer, state, `&&` as AND, `kb.pressing` vs `kb.presses`, prompt returns a string) are defined before use. Content.md is not relied on in the moshion labs: every instruction needed is in the steps and hints.

## FUNCTIONAL
- Full play-through works: paddle by mouse and by arrow keys (after click), ball bounces on three walls, steers off the paddle, edges break bricks, lives to 0, "Out of balls. Press R", R back to the title (6.10.10), key 2 starts keys mode, key 3 (Challenge 1) starts with `lives: 1`.
- No error text or console errors at any partial run (steps 1 to n of each lab ran clean).
- Submit then Confirm completes each lab; the next lesson unlocks; progress bar and "Lesson N of 13" correct.
- Not re-measured by me: ball glue physics on the guarded flip (round-1 harness shows 0/30 stuck); I saw no stuck ball in any run.

## WORKED CLEANLY
Step-to-card correspondence in 6.10.4, .5, .6, .8, .9, .10 (each step turns exactly its cards green, none early); hints that carry the exact line; click-canvas reminders at every point a key is pressed; 6.10.13 now accepts the lesson's own modelled sentence and the named "faster serve".

## Verdict
CLEAN. Only low-severity wording notes (ORDERING 1 and 2) remain, neither a blocker nor a refused answer.
