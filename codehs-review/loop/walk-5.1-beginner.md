# Module 5.1 walk: struggling beginner (session w51b)

Dev server http://localhost:3002, DEV_ROLE=teacher, 1280x720, headless playwright-cli. All 25 lessons opened. Every lab was driven with real Run and Check presses. Readings and examples were opened and every live block was run (zero console or runtime errors from any shipped example).

Dev has no AI. Check calls `/api/grade-written/?stream=1`, gets a 404, and shows "The grader isn't responding right now. Your work is saved ... The pattern check marked your cards instead, so you can keep going." So every verdict below is the lesson's regex fallback. The production AI Check may accept shapes the regexes refuse.

Idle wording of the Check area (all labs):
- Status line under the toolbar: "Run shows what your code does. Press Check to have the AI read it and mark the Quest cards, whatever shape you wrote it in. Submit turns on once they are green."
- Header chip: "Still needed (N) · press Check to mark them", plus a 0/N bar.

Screenshots are in `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/walk51/`, files prefixed `b-` or `51`.

## QUIT POINT

```
QUIT POINT
  5.1.22  Sprite Playground (first lab with no starter code)
          Eight cards from an empty file. The one that stops a beginner is
          "mover moves on its own" (r6). The only screen that shows how
          (5.1.15 Worked Example 3: frameCount, sin, cos) is a teacher-led
          example seven lessons back that nothing required. 5.1.15 also
          never explains what sin() is.
          The assignment brief, with the sin() example line, is not on the
          lesson page. It sits behind File > content.md and nothing points
          there. The Steps tab says only "Drive the mover sprite with
          frameCount ... oscillate, orbit, or spin" and hides a hint saying
          "see 5.1.15".
          The one motion line 5.1.9 actually taught is refused (see GRADER 1).
          A student who has typed "mover.pos.x = mover.pos.x + 1" is stuck
          on a red card with no reason given.
```

The earlier quit candidates are 5.1.15 (it uses `if`, `else`, `vel` and `sin` before they are taught) and 5.1.3 (see ORDERING 1). Both are survivable because they are readings. 5.1.22 is the first place a student has to produce something that was never modelled for them.

## Ranked list (worst first)

1. **GRADER, 5.1.22 r6.** `mover.pos.x = mover.pos.x + 1;` in draw() is refused (7/8, the "mover moves on its own" card stays red). `mover.pos.y = mover.pos.y - 1;` is refused too. This is exactly the motion line 5.1.9 teaches (`player.pos.x = player.pos.x + 1`).
2. **UNSHOWN STEP / quit point, 5.1.22.** The brief (`content.md`: required features, rubric, "oscillate" example line) is not shown on the lesson page. It is only a file in the File tab.
3. **ORDERING, 5.1.15 Worked Examples.** It uses `if / else if / else`, `vel.x`, the else-to-zero fix and `sin(frameCount * 0.05)` before the lessons that teach them. Details in ORDERING 1.
4. **UNDEFINED VOCABULARY, 5.1.3 to 5.1.4.** `function`, `let`, "variable", `+` joining text, `console.log`, `fill`, `textSize` and `text` all appear in the first reading with no explanation. `let` is explained at 5.1.8 and "variable" at 5.1.8 (the glossary). That is 5 lessons late.
5. **FUNCTIONAL, 5.1.3.** It says `setup ran` prints "in the on-canvas console", but the inline reading editor has no console. The message only goes to browser DevTools (I found it with `playwright-cli console`). It also says "stop and restart the sketch" and the embed has only Run and Reset, no Stop.
6. **MISLEADING OBSERVATION, 5.1.4 Step 1.** The page says "a square starts in the middle, then more squares crowd out". After 6 seconds the canvas is a hot-pink field of black shards (screenshot `b-514-run.png`). A beginner looking for "squares" decides they did something wrong. 5.1.15 Step 2 says the opposite: "You just can't see them because they're all in the same spot."
7. **DOCS TARGET, hints in 5.1.11, 5.1.19, 5.1.24.** The hints say "Open the moSHion docs drawer ... find the Canvas section." The drawer opens on Overview, with no jump to Canvas. Its first paragraph says "It's aimed at people who've written a little JavaScript ... Box2D ... planck.js ... a handful of globals". That is the wrong register for this student.
8. **ERROR MESSAGES unreadable (5.1.11).** Three real slips and what a beginner sees:
   - Missing `)` or `;` gives "SyntaxError: Failed to execute 'appendChild' on 'Node': missing ) after argument list", with no line number.
   - `player = Sprite(...)` without `new` gives "TypeError: Class constructor Sprite cannot be invoked without 'new'". It does give line 5:12. "Class" and "constructor" are never taught.
   - Forgetting quotes, `player.color = deepskyblue;`, gives "ReferenceError: deepskyblue is not defined". "Defined" is never taught, and the message does not say "quotes".
9. **GREEN ON A CRASHING SKETCH, 5.1.25.** With `world.origin = 'math'` placed after the sprite, Run shows the red error "world.origin = 'math' must come before any sprite ... put it at the top of setup()". Check still marks 4/4 and enables Submit. The student sees green and red together.
10. **LAYOUT, 1280x720.** See LAYOUT below.
11. **STALE CITATIONS.** Two lesson descriptions point at the wrong lesson (see Citations).
12. **5.1.23 order.** The rubric table (Q1/Q2/Q3) renders above the questions it grades.

## BLOCKING

None of the readings or labs is literally impossible with the screens given, with one exception: 5.1.22 r6 needs `frameCount` and `sin`/`cos` or `rotation`, and those are only in 5.1.15 (not required). If the student does follow the hint to 5.1.15 it is doable.

## ORDERING (needed at X, taught at Y)

1. **5.1.15 Worked Examples (read at position 15).**
   - `vel.x` and `vel.y` are used here, but 5.1.16 teaches them. The 5.1.10 footer says "you'll meet vel in 5.1.16", so the course knows it is early.
   - `if / else if / else` is used. It is never taught in 5.1. 5.1.13 is the first screen that uses `if` and `else` (with `{}`), and 5.1.17 is titled "Movement pattern (if / else if / else)" but only explains the chain. "What does `if (cond)` mean" is never answered. Needed at 5.1.13, taught: never.
   - The "drifting sprite bug" and the else-to-zero rule are walked through here, three lessons before 5.1.17 and 5.1.18 teach them.
   - `sin()`, `cos()` and "kinematic" appear with a one-paragraph "what the math does". The only place they come back is 5.1.22 and 5.1.24.
   - Step 2 says "Open the in-app editor's performance tab". There is no such tab.
   - Steps are "Type this exactly ... Click Run", but the typed blocks are static (no Run button and no editor on the page). "Typed into the moSHion in-app editor" does not say which lesson's editor.
2. **`let` and "variable."** First used in 5.1.3 (`let frames = 0`) and 5.1.4 Step 3 ("Store it in a variable"). Taught at 5.1.8, which is 4 to 5 lessons late. `function` and "define" are never explained.
3. **`//` comments and "uncomment."**
   - The 5.1.7 starter has comment lines, and nothing says what `//` is.
   - 5.1.9's Try this says "uncomment the `background('#222')` line". "Comment" is never defined.
4. **`+` joining text and a number** (`'frames: ' + frames`, 5.1.3): unexplained there. 5.1.24 step 4 does explain it ("joining words and a number with `+`"), 21 lessons later.
5. **5.1.24 Challenges.** The Steps text only uses things 5.1 showed (`kb.pressing`, sin/cos, `text`), and that is clean. Everything in the brief file `content.md` is not: `kb.presses`, arrays, `%`, DevTools console, `Math.round`, template strings, `frameRate()`, `lerp`. A student who opens File > content.md gets a different, harder lesson. Challenge 3 there is labelled "hard", and the Steps version calls the same idea "easy".
6. **Dimensions of "the middle."** 5.1.20 step 1 says "one sprite in the middle" for a 400x400 canvas. The student has to work out (200, 200) themselves. 5.1.6 shows 180,180 on a 360 canvas, so it is inferable. This is a hard-but-possible case, not a gap.
7. **Video 5.1.2** shows `new Sprite(200, 200);` (two numbers) on screen at "2/7 The canvas", while 5.1.6 insists the four numbers are x, y, width, height. Frame: `b-v2play.png`.

Not manufactured: `kb`, `pos`, `vel`, `layer`, `rotation` are all introduced in the lesson that uses them.

## GRADER (taught shape refused)

These are the Check pattern-fallback verdicts. I did not run production AI.

1. **5.1.22 r6 ("The mover sprite moves on its own ...").**
   - Refused: `mover.pos.x = mover.pos.x + 1;` in `draw()`. Also refused: `mover.pos.y = mover.pos.y - 1;`.
   - The regex handles `mover.x = mover.x + 1`, `mover.pos.x += 2`, `mover.pos.x++`, `mover.rotation += 3`, `mover.vel.x = 2`, `mover.rotationSpeed = 2`, `mover.rotation = frameCount * 2` and sin/cos with frameCount. It misses the `pos.x = pos.x + n` form.
   - The same line is taught in 5.1.9 as `player.pos.x = player.pos.x + 1`.
   - The card says only "Not yet" with the general sentence. It does not tell the student what shape it wants.
2. **5.1.22 r6 and the variable name `mover`.** The regexes need the literal name `mover`. The starter declares `let player, mover;` and Step 1 says one `player` and one `mover`, so this is fair. A student who renames it is refused. I did not run a rename.
3. **5.1.19 r1 and r2 (else branches).**
   - Refused: ternary `player.vel.x = kb.pressing('d') ? 3 : kb.pressing('a') ? -3 : 0;` (1/3 only, r3 passes).
   - Refused: reset at the top then independent ifs (`player.vel.x = 0; ... if (kb.pressing('a')) ...`) (1/3). Neither shape is taught in 5.1, so this is a note rather than a defect. The AI path should accept them.
   - Accepted: `else { player.vel.x = 0; }` with braces, `else` on its own line, `let speed = 3; ... = -speed;`, speed 3, 4.5, any non-4 value, and arrow keys.
4. **5.1.7 r1.** A negative x (`new Sprite(-20, 60, 140, 30)`) is refused (1/3). The `\d+` pattern does not allow a minus sign or a decimal. Not a taught shape.
5. **5.1.24 r4 ("a technique beyond canvas + sprite + background").**
   - Refused: `player.rotation = frameCount * 2;`. That is the "Spin" variation in 5.1.15, but it is not one of the five listed challenges.
   - Refused: `let held = kb.pressing('left'); if (held) player.color = 'red';`. Variable-held key is not taught.
   - Accepted: color-by-key with `if/else`, with `||`, `kb.presses`, `text(...)`, sin/cos, `lerp`, `mouse.x`.
6. **5.1.25 r3.** Refused: a sprite whose y is a variable (`let y = 50; new Sprite(100, y, 40, 40)`), 3/4. The card says "a positive second number", so this is fair. Accepted: negative x with positive y, `"math"` with double quotes, `showGrid(25)`.
7. **Loose, from the same runs (not my lens):** 5.1.11 r4 turns green with `background()` only in `setup()` or with `new Sprite` still inside `draw()` (4/4). 5.1.25 turns 4/4 on a sketch that throws.

Accepted without complaint (listed because the shapes are plausible): 5.1.7 with a `let box` variable, with the sprite stored then recolored, with a hex colour, with double quotes, or with a second sprite; 5.1.11 chained `new Sprite(...).color = ...`, `hero` instead of `player`, `background("black")`, `background(34)`; 5.1.20 braces, arrow keys, `width/2`, reset-then-ifs (5.1.20 does not require the else); 5.1.22 oscillate, rotation, rotationSpeed, vel, orbit, `let t = frameCount * 0.05`.

## FUNCTIONAL

- **Check in dev:** every press ends with the "grader isn't responding" banner and a console 404 (`/api/grade-written/?stream=1`). Expected without an AI binding.
- **Draft persistence:** the editor kept my last test code when I came back to 5.1.22. Real student progress is not recorded under DEV_ROLE=teacher, as expected.
- **Run button:** while running, the button reads "Stop" in red (tall, two lines when an error shows).
- **5.1.4 / 5.1.13 inline editors:** no Stop. Running the pile-up example leaves it running forever with the Run button scrolled away.
- **Videos 5.1.2 and 5.1.12:** the cover and Play work (captions, seven chapters) and "Mark as complete" appears below.
- **5.1.1:** the slides placeholder is known; not walked further.
- **Runtime errors:** none from any shipped example. Only my deliberate slips errored.

## LAYOUT (1280x720)

- **Drawer persists across lessons.** Open the Steps or Quest drawer once (it is closed by default) and it stays open on every later lab. The editor falls to about 420 px wide and code lines wrap at ~30 characters, e.g. `player.vel.x = -4;` splitting across lines in `b-519-drift.png`. The preview is about 420 px wide, so a 400x400 canvas is cut off. Screenshots: `517-steps.png`, `b-511-start.png`.
- **Toolbar crowding with the drawer open.** On an error the Run/Stop button becomes a tall 2-line block. The state label is clipped to "× Run your c…" and "× Fix runtim…" (`b-525-late.png`, `b-e1.png`). "Commit (1)" wraps.
- **Canvas below the fold.** With the drawer closed, the editor starts around y=380 and the 360 to 400 px preview does not fit above the fold. The student scrolls between code and sketch (`517-a.png`).
- **5.1.25 step 1** is a single paragraph of about 270 words in the narrow Steps column (`b-525-late.png`).
- **Reading pages:** the "What you'll learn" lists render with no bullet markers. Headings are plain mono text, so section breaks are hard to see (`513-top.png`). Low.
- **Video player** extends below the fold at 1280x720 (controls cut off until scrolled).
- **Step hints** are collapsed ("▶ Hints") in every lab and easy to miss.

## Citations resolved mechanically

I extracted every `5.1.N` reference in every lesson.json and content.md and resolved it against the lesson titles.
- Every Help link and every Quest-card help resolves to the correct lesson. Examples: r1 to 5.1.5, r3 to 5.1.6, r5/r6 to 5.1.16, background to 5.1.9, else to 5.1.18, 5.1.22 r6 to 5.1.15, text() to 5.1.21, key names to 5.1.14.
- Two descriptions are wrong:
  - 5.1.3 says "Read before 5.1.4 (Canvas)". 5.1.4 is the Worked Example, and Canvas is 5.1.5.
  - 5.1.13 says "Read before 5.1.14 (Velocity)". 5.1.14 is Key names, and Velocity is 5.1.16.
  - Both are plausible-but-wrong near neighbours. The in-reading "Read before" lines in the body are correct.
- 5.1.10 says "you'll meet vel in 5.1.16", but 5.1.15 uses it first.
- Lesson folder ids do not match titles (for example `5-1-19-reading-wasd` is 5.1.14, `5-1-14-example-keyboard` is 5.1.15). The student only sees titles, so no student impact.

## WORKED CLEANLY

- **5.1.5, 5.1.6, 5.1.8, 5.1.9, 5.1.10, 5.1.13, 5.1.14 (key names), 5.1.16, 5.1.17, 5.1.18, 5.1.21 (text):** each reading has a "by the end you should answer" list, one live example, a "what you'll see" line, and a "Try this" step. Terms are defined before use. No runtime errors.
- **5.1.7 Exploration:** a very good first lab. It starts from a working sketch, asks for predictions, and Check gave useful partial progress (0/3, then 1/3, then 3/3 as I changed numbers).
- **5.1.11 Hello Sprite:** the step-by-step typing works with Run after each line (1/4, 2/4, 3/4, 4/4). The Quest cards name what is missing.
- **5.1.19 Delete the else:** the drift is easy to see, the cards go red when the else lines are deleted (so Check confirms the break) and green when restored. The speed requirement is clearly worded. The starter's odd column spacing (`if      (`) is cosmetic.
- **5.1.20 Make it Move:** staged Check went 2, 3, 5, 7 of 7 as I added each step. Arrow keys, WASD, braces and `width/2` were all accepted.
- **5.1.23 writeup:** the three questions point at 5.1.3, 5.1.4, 5.1.12 and 5.1.16, and the rubric is plain.
- **5.1.24 Steps text:** every challenge uses only things taught in 5.1 (the brief file is the problem, not the steps).
- **5.1.25:** correctly marked optional, with a clear error message when order is wrong.
