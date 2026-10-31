# Beginner lens: module 6.9 Grids and Tile Maps (14 lessons)

Date 2026-10-31. Session `g-beginner`, cookie dev_student=gbeginner, dev server :3002, DEV_ROLE=student, lock ON, no stubbed POSTs. Every lesson finished through its own UI (labs: Submit, then Confirm; readings: Mark as complete; quiz: Check my answers). All 14 end "completed" in /api/lesson-state. Session closed at the end.

Method: lab code injected into CodeMirror (select all, insertText), Stop then Run after each step, cards read from the Quest drawer. Each lab got a differently shaped answer on top of the taught one. Run/inject helpers are not saved (scratchpad).

## QUIT POINT
6.9.6 step 1 (write `findStart`). It is the first time the student must write a nested loop AND `return { x, y }` from inside it AND turn a row and column into pixels, all in one function. 6.9.5 shows the scan (counting coins) and the return-an-object (`return { x: 60, y: 60 }`) as two separate fragments; nothing shows them joined. The hints do spell the whole thing out (step hint 2 is the full `if` with the return), so it is startable, but a student who does not open hint 2 stalls here. Not blocking, but this is where I would expect a head to go down. (6.9.8 step 1 is the other heavy one: five statements in one step, again fully hinted.)

## BLOCKING
None. No lab was unstartable with what Units 1-5 and 6.1-6.8 plus 6.9's own readings taught.

## GRADER (taught-but-differently-shaped answers refused)
All of these ran correctly in the sketch and were refused by the card; the card gave the same title with "Not yet" and no hint at what shape it wanted.

1. **6.9.11 card r2 "A hit pixel becomes a row and a column"** (the biggest one, it is the lesson's whole idea). Refused:
   - `const localY = y - TOP; const r = floor(localY / BH);`
   - `y = y - TOP; const r = floor(y / BH);`
   - `const r = floor(y / BH - 3);`
   Accepted: `floor((y - TOP) / BH)`, `Math.floor((y - 60) / 20)`, `floor((-TOP + y) / BH)`, `floor(y / BH) - TOP / BH`. The step says "take that off first", and splitting it over two lines is exactly that.
2. **6.9.6 card r3 "Row and column become pixels"**: `c * TILE + (TILE / 2)` (parenthesised half tile) refused. Accepted: `(c * TILE) + TILE / 2`, `TILE * c + TILE / 2`, `c * 40 + 20`, `TILE / 2 + c * TILE`, `c * TILE + TILE * 0.5`. Same extra-parentheses family seen in the 5.x passes.
3. **6.9.4 card r5 "The first tile is centred half a tile in"**: `new Tiles(map, (TILE / 2), (TILE / 2), TILE, TILE, {...})` refused (4/5). `20, 20` and `TILE / 2` accepted. Step 3's own wording calls the legend "the last word" (`legend`), and `const legend = {...}; new Tiles(map, 20, 20, TILE, TILE, legend)` IS accepted (5/5), good.
4. **6.9.14 card r1 "You changed one rule of the wall"** (challenge 1): refused `score = score + (BRICK_ROWS - r) * 10;`, `score = score + 10 * (BRICK_ROWS - r);`, and a helper variable (`let points = (BRICK_ROWS - r) * 10; score += points;`). Accepted: `score += (BRICK_ROWS - r) * 10;`, `score += (5 - r) * 10;`, `score += 10 * (BRICK_ROWS - r);`. The starter and the step both use `+=`, so low severity, but `score = score + ...` is a shape this course has accepted elsewhere (6.9.7 r2, 6.9.8 r4).
   Challenge 2 shapes all passed (`-= 1`, `= bricks[r][c] - 1`, `bricks[r][c]--`); challenge 3 passed with `SHAPE[r][c] === "#"` and `SHAPE[r].charAt(c) == "#"`.

Accepted cleanly (differently shaped): 6.9.4 double quotes + legend const; 6.9.6 `== "P"`, `Math.floor`, `let col/row`, one-line `return map[floor(y / TILE)][floor(x / TILE)]`; 6.9.7 `function (p, coin)`, `coin.remove()`, `score++`, one-line no-brace `if (coins.length == 0 && (player.overlaps(goals))) won = true;`; 6.9.8 `levelNum = levelNum + 1` with `>=`, and `if/else` with no braces (`if (levelNum === levels.length) won = true; else loadLevel(levelNum);`); 6.9.10 no braces on inner for, `=== true`/if-else fill with double quotes, early-return bounds with `||`, `n++`; 6.9.11 `Math.floor`, early-return with `||`, `score = score + 10`, `== 1`, `n = n + 1`.

## ORDERING / UNTAUGHT
- 6.9.14 challenge 3: the text never says the `'2'` bricks will be invisible and uncounted until challenge 2's `> 0` changes are also made (drawBricks and bricksLeft test `=== 1`). Doing challenge 3 alone, my '2' row vanished and "bricks left" skipped it (27 of 32). One sentence needed.
- 6.9.14 step s2 ("write one sentence as a // comment ... what would happen if you removed it") has no card, so a student cannot tell whether they did it right. Not a blocker, a self-check gap.
- 6.9.4 starter comments disagree with the step text: STEP 1 comment says "make a Group called walls ... color slategray" but `walls = new Group()` is already made and the step says `'dimgray'`. A student who copies the comment's colour still passes (no card checks colour) but sees a different grey than the lesson shows.
- 6.9.2 cites 3.3.20 ("A map is an array (3.3.20)"), which is "Lists Inside Lists" (nested arrays), a near neighbour rather than the plain-array lesson. Right neighbourhood, so it reads fine; flagging as the wrong-but-plausible kind.
- Vocabulary used without a definition but explained by context, not findings: "falsy" (6.9.8 s1, glossed in the same sentence), "flag" (`won`), "callback" (6.9.7, points to 6.2.3 which does teach it), `rotationLock` (appears in starters, 6.9.2 gives a reason).
- Every cross-reference resolved: 2.2.19 Walking Through a Word, 2.4.24 Nested Loops, 3.2.11 return, 3.5.3 object literal, 2.1.20 ?:, 2.1.29 && || !, 2.1.33 Flip It with !, 3.3.21 tic-tac-toe nested array, 5.5.1 Plan Snake, 5.5.2 world on a grid (does contain `cellToPixel`), 5.4.6 Pipes, 6.2.3 Collisions + Overlaps, 5.2.6 Gravity. Quiz review links (7): q1 -> 6.9.2, q2 -> 6.9.9, q3/q4 -> 6.9.5, q5 -> 6.9.11, q6 -> 6.9.10, q7 -> 6.9.8; each lands on the lesson that holds the idea.

## FUNCTIONAL / RENDER
- All five reading/example live blocks and all six labs run; 6.9.5's live block mouse readout and 6.9.9's click-to-flip both work (clicks need a real down/up gap; an instant click is missed by `mouse.presses()`, a test-tool artifact, not a lesson fault).
- 6.9.5 live block: the maze draws walls only, so `row 3, column 6 holds [c]` names a coin that is not on screen. The "What you'll see" line promises it, so a beginner may look for a coin that is not there. Minor.
- Previews scale the 400x400 / 400x440 canvas into the pane (about 0.9). In 6.9.6 the bottom corner text (`standing on: [...]`, y=392) and in 6.9.10 the `lit: n of 64` line (y=428) are below the fold on a 1280x720 screen; the step tells the student to read them, so they must scroll the page. 6.9.6 step 3 depends on reading that line.
- No horizontal overflow on 6.9.2 (scrollWidth 1280 = viewport). Tables and code blocks render. The Quest drawer pushes the page narrower when open (cosmetic, one transient blank panel while it closed).
- First load of an /assignment/ page (6.9.12, 6.9.13) sat on "Checking access..." for 10-20 s; a reload cleared it. Likely dev-compile only.
- AI-graded 6.9.1 and 6.9.12: both returned "The grader isn't responding right now. Your answer has been saved and sent to your teacher for marking." and the next lesson unlocked (dev fallback, same as the 5.x passes).
- 6.9.13 quiz: 5/7 passed (I missed q3 and q5 on purpose) and the page advanced to 6.9.14 straight away, so the student never sees their score or which ones they missed until they come back; on revisit the explanation and "(reread 6.9.x)" show under every question.
- Submit on 6.9.4/6/7/8/10/11/14 advanced to the next lesson with no visible confirmation of the grade.

## WORKED CLEANLY
6.9.2, 6.9.3 (live block runs, 34 tiles / 30 walls / 4 coins as the text says), 6.9.5, 6.9.9 readings: terms are defined before use, the Try-this lists work as stated. The labs' step-by-step hints (full code in hint 2) mean none of the labs is unstartable. 6.9.7 and 6.9.8 grading is the most tolerant in the module. The quiz has no ambiguous question; its explanations restate the lesson.

## Single biggest gap
6.9.11's "A hit pixel becomes a row and a column" card refuses the lesson's own idea (take `TOP` off, then divide) when it is written over two lines (`const localY = y - TOP;`), with no hint about the shape it wants.
