# Beginner lens: module 6.10 Breakout (13 lessons)

Date 2026-11-01. Session `b610beg` (closed), cookie dev_student=b610beg, dev server :3002, DEV_ROLE=student, lock ON, no stubbed POSTs. Walked 1 to 13 in order through the real lock (a direct goto of 6.10.4 first showed "Lesson locked", 0 of 13). Lessons 1-12 end "completed" in /api/lesson-state; 13 left "started" on purpose. No repo files edited.

Method. Every word of every step, requirement description and content.md read in order; every cross-reference resolved against lesson titles. Browser: readings Mark as complete; labs typed into CodeMirror, Stop then Run, cards read from the Quest drawer, Submit then Confirm (the reference solution was used to move forward on 4, 5, 6, 8, 9, 10; partial-run shapes were run live on 4, 5, 10, 13). The game itself was played in the browser (lab 9: three misses gave `lives: 0` and `Out of balls. Press R`; lab 10: title screen, key 2, held ArrowLeft, paddle went to the edge, lives and score moved). Grading was then measured offline with the real grader (`gradeWithTests`) over about 190 taught-but-differently-shaped answers (scripts in the session scratchpad, not the repo).

## QUIT POINT
  6.10.13  Challenges: Make it yours, requirement r2 "You wrote your sentence"
           A student does Challenge 1 and writes the sentence the lesson itself models:
               // Press 3 for one ball, with the mouse.
           Card r2 stays red ("Not yet", 1/2) and Submit stays disabled. The card says
           "(any wording works; a comment that starts with a number ... does not count)".
           The comment does not start with a number, so the student cannot tell what is
           wrong, and there is nothing else to change. Confirmed live in the browser.
           Not a hard module-wide quit (everything before it is finishable), but it is
           the last gate and the one place a correct, taught answer is refused with a
           reason that does not explain it.

## BLOCKING
None. Every lab is startable with what the ledger holds and the reference scores full on all 33 requirements.

## GRADER (taught-but-differently-shaped answers refused)

1. 6.10.13 r2 (sentence). The few-words alternative is `(?:[A-Za-z][A-Za-z'-]*[,.:;!?]?[ \t]+){3}[A-Za-z]` anchored at the first comment line, so a digit among the first three words breaks it. The keywords alternative (`would|without|otherwise|instead|if|remov\w*`) saves some, not these. Refused (each with a working Challenge 1 in the file):
   - `// Press 3 to play with one ball.`
   - `// Key 3 gives the player one ball, so every miss counts.`
   - `// My rule: key 3 gives one ball and no spare lives.`
   - `// Pressing 3 starts a game with one life.`
   - `// Hard mode` (two words) and `//Key 3 = one ball (hard mode)`
   Accepted: `// My rule: key three gives one ball.`, `// Third mode: one ball only.`, `// I added a third mode.`
   The same sentence with "3" spelled "three" passes, which a beginner cannot guess. Challenge 1 is about key 3, so this is the most natural sentence there is. Fix idea: count any non-space word (`\S+`) instead of letters only, or accept any comment of 3+ words that does not start with a digit.

2. 6.10.13 r1, "a rule of your own, such as a faster ball". The card (and 6.10.11) names "a faster ball", but the natural edit, the serve speed in `serve()` (`vx = 3; vy = -4;` to `vx = 5; vy = -6;`), scores r1 red. Passed: narrower paddle (`const PADDLE_W = 60`), more lives (`lives = 5`), `score += 20`, a bounce that multiplies vy (`vy = -vy * 1.1`). Refused: serve speed, steering divisor (`/ 10` to `/ 5`), key speed (`6` to `10`), ball colour, a taller paddle sprite. Only the first is named by the card.

3. 6.10.10 r1 (title words). Needs two or more `text(` calls inside `if (state === 'title') { ... }`. Refused: one combined line `text('BREAKOUT: press 1 for mouse, 2 for arrow keys', 20, 240)` and one `text()` with `\n` breaks; `if (state !== 'play') {...}`. The step says "the name of the game and the two choices", hint says "two or three text lines", so the common shape passes; a one-line title is a plausible beginner shape. Low.

4. 6.10.5 r6 (lost ball). Refused: `if (ball.y > 400 + R) { ball.x = 200; ball.y = 300; }` (resets by hand, `ball.x` first) and the reversed `if (400 + R < ball.y) serve();`. The step says to call `serve()`, and the starter's `serve()` is right there, so low.

5. 6.10.6 r2. `row.push(0)` then `if (WALL[r][c] === '#') row[c] = 1;` is refused (the step says push 1 or push 0, so low). `.map(...)` solutions fail r1 ("two loops") but `.map` is not in the ledger, so that is not a finding.

Held, no finding (checked and accepted): 6.10.4 all 22 shapes (numbers 40/360, `constrain`, `Math.max/min`, `switch (control)`, `else if`, `paddle.x = paddle.x - 6`, `==`, double quotes, `paddle.w / 2`, `width`); 6.10.5 all 30 (`*= -1`, `vx = vx * -1`, two separate wall ifs, `<=`, `ball.x - R < 0`, `width`, nested if, `vy > 0` first, `overlaps` either way round, temp var for the offset, `* 0.1`, `/ 8`, `vy = -abs(vy)`, `> 400`, `>= 400 + R`); 6.10.6 makeBricks in 12 shapes, drawBricks in 12; 6.10.8 all but a contrived `-R + ball.y`; 6.10.9 all 21 shapes of count, lives and win (`lives--`, `<= 0`, `< 1`, `> 0` first, serve before the check, `== 0`, `!bricksLeft()`, `for...of`, `n++`); 6.10.10 pickMode (else-if, state first, double quotes, `pressing`, `prompt` as string or Number) and R going to the title (in `draw`, or in `startGame`). Partial runs score exactly the steps done.

## ORDERING / UNTAUGHT

1. UNSHOWN STEP. Keys reach the sketch only after the canvas is clicked. Live test (6.10.13, Run then press 2 then hold ArrowRight): nothing happened, the title stayed; after a click on the canvas, 2 and the arrows worked. Three steps ask for keys with no reminder: 6.10.4 s2 ("hold the arrows"), 6.10.9 s2/s3 ("Press R") and 6.10.10 s2 ("press 1", "press 2"). It was taught (5.1.13 "Click the canvas to focus it", also in a 6.x reading), long before, and a student who did 5.1.13 recently may remember, but a literal student after Run presses 1 and sees nothing. Needed one sentence at 6.10.4 s2 and 6.10.10 s2. Medium-low, and the real stall inside the labs.

2. 6.10.5 s1 "Press Run again to bring it back." While the sketch runs the button is labelled Stop, not Run (Ctrl+Enter is printed beside it). The literal student looks for a Run button. Low; the same wording may be used elsewhere in the course.

3. 6.10.10 s1: where does the text go across? `text(...)` needs an x and the step gives only "between y 200 and 280". `text('Press 2 to play with the arrow keys', 100, 265)` is clipped at the canvas edge (seen live: "...the arrow |"); the string is about 300 px wide, so x must be 90 or less. 6.6.11, cited as the model, uses x 115 for a shorter line. The student can see the cut-off and adjust, so low.

4. 6.10.13 Challenge 3, "set it to 0 in `startGame()`": says nothing about putting it above `bricks = makeBricks();`. Below it, `WALLS[wallNum]` is `WALLS[undefined]` on the first run and `makeBricks` stops with a "cannot read properties of undefined" error. Low-medium; the line order is the whole trap and is not mentioned.

5. 6.10.10 s1 hint "as in 6.6.11": that example draws its title in `draw()` (inside a `switch`), while this lab says `drawTop()`. `drawTop` was taught in 5.4 and is in the starter, so only a wording mismatch.

Checked and fine: terms and ledger. `||` (2.1.10, used here as OR and in a hint), `&&` short-circuit (6.9.9), `WALL[r][c]` on a string (6.9.5), `kb.presses` vs `kb.pressing` (6.3.3), `prompt` returns a string (stated in 6.10.10 s2's note, so q8 of the quiz is taught), `collider = 'none'` (5.9.5), y down (5.1.15), x is the centre (5.1.6), `drawTop` (5.4), `serve`, `steer`, `R`, `vx/vy` (defined in this module's glossary before use). No step asks for anything that no earlier screen holds, in either the labs or the two assignments.

## Citations (all resolved mechanically, each to a title)
5.9.5 Did the shot hit? | 5.1.16 Velocity (y increases downward, ok) | 5.2.11 Bounciness and Friction | 5.1.6 Sprite (x and y are the centre) | 6.7.3 mouse.x and mouse.y | 5.1.13 kb.pressing | 6.8.8 Vector from A to B | 6.9.1, 6.9.2, 6.9.5, 6.9.8, 6.9.9, 6.9.10, 6.9.11, 6.9.14 (two-hit bricks and the three `=== 1` places, matches 6.10.13) | 6.6.7 state variable | 6.6.11 title screen | 6.6.16 keyboard transitions | 6.6.17 condition-driven transitions | 6.3.3 input edges | 3.1.9 (Number(prompt(...)) is in step 2 of that lab). The quiz: 8 questions, answer key checked by hand (1,0,2,3,1,3,0,2; q4 is 30/10 = 3, q5 is 164); `source` labels and `sourceIds` agree, and the review links shown after a wrong set resolve to 6.10.2 (q1-3), 6.10.3 (q4), 6.10.7 (q5-7), 6.10.10 (q8). Pass bar says "6 of 8" and passPercent 70 gives 6. Every Help: link on a requirement card points at a lesson that teaches the thing.

## FUNCTIONAL
- A whole play-through works: ball bounces on three walls, steers off the paddle, edges break bricks, lives fall to 0, "Out of balls. Press R"; title screen, mode pick, R back to title; the 13 starter plays.
- First Run after typing into the editor once showed "Stop" with the preview still on "Click Run to execute your moSHion sketch" (6.10.4, 15 s, no iframe); Stop then Run fixed it. Could be my insert-text method, not reproduced on any later lab; not counted.
- The AI-graded lessons 6.10.1 and 6.10.11 show "Error: The grader isn't responding right now..." in dev and advance (dev fallback, as expected). Rubrics are the "very generous" kind and the questions ask only what the page says.
- Live sketch in 6.10.7 shows what "What you'll see" says (centre test: `bricks hit: 0`); the Try steps reason out correctly against the code (START_X 104 and 75, edges on and off).

## WORKED CLEANLY
Order of the module (plan, reading, example, paddle, bounce, wall, edge reading, edges, win/lose, mode, playtest, quiz, challenges); every lab has the exact line or a hint with it, so none needs invention; every starter has one STEP comment per step and the requirement cards match the steps; half-finished runs are safe in each lab (a finished step 1 never errors, the ball just flies off in 6.10.5 and the text says so); no lab asks for something taught only after it; the glossaries define the new words before they are asked for.

## Single biggest gap
6.10.13 r2: the sentence check refuses any sentence with a digit in its first three words, including the lesson's own "Press 3 for one ball, with the mouse." and its card says any wording works. Second: no Breakout lab reminds the student to click the canvas before pressing keys.

## Verdict
GAP LIST (no blocking, no untaught asks). Two grader gaps worth fixing (items 1 and 2), one unshown step (ORDERING 1), the rest low.
