# Beginner lens, FINAL pass B: 5.3 (1-12), 5.4 (1-11), 5.5 (1-11)

Date 2026-10-31. Session `g-beginner`, dev server :3002 (DEV_ROLE=student), cookie dev_student=gbeginner, commit 94250f2b. Lock ON, no stub POSTs.

STATUS: COMPLETE. 5.3 12/12, 5.4 11/11, 5.5 11/11, every lesson finished through its own UI with the lock on.

## Method
- Driver: playwright-cli `eval` / `run-code` against the real lesson page. Code is INJECTED into CodeMirror (select all, insertText), not typed. Run = real Run button (Stop then Run after an edit, since the cards only re-read on a fresh Run). Every lesson is finished through its own UI (Mark as complete, or Submit then Confirm Submission).
- Reaching 5.3 under the lock: 5.2 (20 lessons) completed by the cheapest legitimate route: readings/examples/slides marked complete, every lab given its reference `solution.js` injected and submitted. 5.2 was NOT audited here (the earlier pass did it).

## 5.3 Project: Pinball

### 5.3.1 Plan (AI, read only)
Task text read: four numbered questions plus a four-line rubric that mirrors them. Plain words, "variable" is taught in unit 1. Typed an honest four-part plan; dev has no grader, the "grader isn't responding ... saved and sent to your teacher" line showed and the lesson counted (1/12). Clean.

### 5.3.2 Reading, 5.3.3 Example
Read. 5.3.3 says Step 3's score "shoots up to 33"; I ran the live block and the canvas shows score: 33. Matches. Glossary and the `ground` not `floor` note are good. Clean.

### 5.3.4 Lab: Build the table
Starter 0/4 (red, as it should be). Reference (identical to the 5.3.3 Step 3 code, so a copy-paste student wins): 4/4. Differently shaped answer, double quotes plus `bounciness = .75`: 4/4.
GRADER (found): `world.gravity.y = (10);` (extra parentheses round the number) is refused, card "Gravity is on" stays red, every other card green. The regex needs a digit straight after the `=`. A student who writes parentheses round a number is rare, but this is the exact shape the parentheses-tolerance round was meant to cover, and the card gives no hint that the brackets are the problem.
Submit went through, unlocked 5.3.5.

### 5.3.5 Reading, 5.3.6 Example
Read. 5.3.5 uses "level-triggered / edge-triggered" in its table and defines them in the glossary at the bottom, after use (the same words 5.2.9 left undefined; nothing in the lab needs them). 5.3.6 prose "bounciness 0.2: each drop adds 3": I edited the live block to 0.2 and the canvas reads score: 3. Matches. Clean.

### 5.3.7 Lab: Score one point per touch
Starter (after Reset) 0/3. Reference 3/3. Differently shaped answers, all 3/3 and all play correctly: `((touching) && (!wasTouching))` with `score++`; `!wasTouching && touching` (swapped); `let touching = goal.colliding(ball)` with `wasTouching = (touching)`.
FUNCTIONAL / GRADER (found, important): `if ((touching) && (wasTouching === false))` and `if (touching === true && wasTouching === false)` both go 3/3 GREEN and then the game never scores (score: 0 after a full drop plus an R drop, checked on the canvas). Reason: `colliding()` hands back a number (0 when not touching), so `wasTouching` becomes `0` after frame one and `0 === false` is never true. The card regex deliberately accepts `=== true` / `=== false`, so a student who writes the "explicit" version gets every card green, can Submit, and the step 3 "press R three times and it reads 4" check shows 0 with no hint why. Nothing in 5.3.5 says colliding returns a number or warns against `=== false`. Either teach it in 5.3.5 ("compare with `!wasTouching`, not `=== false`"), or stop the card going green for `=== true/false`, or make the Run card fail when the score stays 0.
Prose check: reference run shows score 2 after one drop plus one R (Run starts a drop that scores 1), consistent with "1, then 4 after three R presses".
Submit ok (unlocks 5.3.8).

### 5.3.8 Lab: Three bumpers, three values
Starter 0/3. Reference 3/3; canvas after the first drop plus one R reads 32 = 16 + 16, matching "the score should read ... 16. Press R and the next drop adds another 16". Differently shaped answers: `bumpers.forEach(function (b) {...})` with a no-braces `if (...) score += b.worth;` 3/3 and plays right (submitted this one); classic `for (let i ...)` with `bumpers[i]`, `score = score + (bumpers[i].worth)`: runs correctly but the third card stays RED.
GRADER (found): extra parentheses round the added value, `score = score + (bumpers[i].worth);`, is refused ("The bumper's own worth is added only when contact starts" red) although the game scores exactly right. The card regex allows brackets round the test, not round the value.
FUNCTIONAL / GRADER (second instance of the 5.3.7 problem): `if (touching && b.wasTouching === false)`, the shape the step itself invites ("give each bumper a wasTouching of false"), is 3/3 green and scores 0 at run time (colliding gives a number, so the memory is 0, never false). Same fix as 5.3.7.

### 5.3.9 Reading, 5.3.10 Lab: Lose, and start again
Reading clean. Lab: starter 0/4, reference 4/4, inverse flag (`let over`, `if (!over)`, `over = true` on a lost ball) 4/4, `if (playing === true)` + `ball.y > height` + double-quoted `"r"` 4/4 (submitted). Watched the sketch: ball rolls over the gold, drains, "Game over / score: 1 / press R to play again", R restores play and score 0. The pinball ball does reach the goal on the reference table. Clean.

### 5.3.11 Playtest and reflect (AI, read only)
Four questions, rubric mirrors them, all in plain words. One soft spot: it says "Play your finished pinball game" but never says where the finished game is (it is the 5.3.10 script); a student who skipped or reset may not have one. Honest answer typed; grader-down fallback saved it and it counted (11/12). Clean enough.

### 5.3.12 Challenges: Make it yours (ONE challenge is enough: confirmed)
Starter 0/1. Each challenge alone turns the single card green AND runs correctly: (1) second goal, double quotes, `score = score + 5` (submitted): game over screen reads score 6 after the ball also reaches the orange block; (2) slider alone: purple bar sweeps, ball knocked; (3) best score alone: green. The `//` sentence step is not checked by any card (nothing to report).
Note (not a beginner problem): the card regex includes `\bframeCount\b`, so a bare mention of frameCount (even in a comment) turns it green. Advanced lens owns that.

## 5.3 VERDICT
Single biggest gap: the `=== false` / `=== true` false green in 5.3.7 and 5.3.8 (cards green, game scores 0, no hint why). Everything else is small (parenthesised gravity number, parenthesised `worth`).

## 5.4 Project: Flappy

### 5.4.1 Plan (AI, read only)
Same shape as 5.3.1: four questions, mirrored rubric, plain words. The page's own paragraph on Flappy is enough to answer; it points back to "5.3.10" for rereading. Typed an honest answer, grader-down fallback saved it, counted (1/11). Clean.

### 5.4.2 Reading, 5.4.3 Example
Read. Set-vs-add (`= -4` vs `-= 4`), why `presses`, and the "two numbers tune the game" paragraph are all taught before the lab asks. Small wording nit in 5.4.2: "`bird.vel.y -= 4` leaves 4 faster than before" is ambiguous (faster up?), but it is only a contrast line. Clean.

### 5.4.4 Lab: Make it flap
Starter 0/3. Reference 3/3. Differently shaped answers:
- double quotes and the key name: `if (kb.presses("space")) bird.vel.y = -4;` (no braces) and `if ((bird.y > 400) || (bird.y < 0))`: 3/3 (submitted).
- two separate ifs, one for the bottom and one for the top: 3/3.
GRADER (found, medium): the NAMED TEST, `const tapped = kb.presses(' '); if (tapped) { bird.vel.y = -4; }` (with `bird.y > height`), is refused: card "The space bar flaps the bird" red, the other two green. 5.3.5 and 5.3.7 taught exactly this shape for the ball (`const touching = ...; if (touching && ...)`), so a student carrying the pattern forward loses the mark for the habit the course just taught. Nothing on the card says the test must sit inside the `if (...)` parentheses.
GRADER (found, low): extra parentheses round the numbers, `bird.vel.y = (-4);` and `bird.y = (200);`, turn all three cards red.

### 5.4.5 Reading: A world that scrolls
Read. Everything the next lab needs is shown: kinematic, `frameCount %`, array push, the backwards delete loop, why backwards, `drawTop()`. `pipes[i].mate` is used in the reading's code but never introduced in words ("the bottom half" is only a comment); the lab's starter gives `makePipe()` so it works. Text-on-top claim holds: in the run the "pipes: 3" label sits above pipes that slide under it. Clean.

### 5.4.6 Lab: Pipes that come and go
Starter 0/3. Reference 3/3. Differently shaped, all 3/3: `if ((frameCount % 90) === 0) pipes.push(makePipe());` (no braces, submitted); named test `const spawn = frameCount % 90 === 0; if (spawn) { let p = makePipe(); pipes.push(p); }`; `if ((pipes[i].x) < (-30))`; `const gone = ...; if (gone)`. This card family is tolerant. Prose check: the "pipes:" counter reads 3 at 4 s and at 16 s (2 or 3 and holds): matches.
Note: a splice-BEFORE-delete order (`pipes.splice(i,1); pipes[i].mate.delete(); ...`) also goes 3/3 green although it deletes the wrong pipe or the next one; an honest beginner mistake the card cannot see. Low.

### 5.4.7 Lab: Score a gap
Starter 0/3. Reference 3/3. Five differently shaped answers, ALL 3/3 and the score climbs correctly (11 after about 20 s): `p.passed === false && bird.x > p.x` with `score++`; index loop with `((pipes[i].x < bird.x) && (!pipes[i].passed))` and `score = score + 1`; named test `const behind = p.x < bird.x; if (behind && !p.passed)`; nested ifs; flag first then score (submitted). `p.passed` is a real true/false here, so the `=== false` shape is safe in this lab (unlike 5.3.7/5.3.8). Clean.

### 5.4.8 Lab: Crash, and start again
Six cards; starter 0/6. Reference 6/6. Differently shaped, both 6/6: (a) named test `const hit = bird.colliding(p) || bird.colliding(p.mate); if (hit)`, `if (playing === true)`, double-quoted `"r"`; (b) index loop to freeze the pipes, `pipes.length = 0` restart, `if (playing === false)`, `"Game over"` in double quotes (submitted).
FREEZES AFTER A CRASH: yes. Screenshots 5 s apart after the crash are identical (pipes, bird, score stay put), no new pipe arrives, "Game over / press R to play again" is drawn over the frozen pipe in `drawTop()`, R clears the pipes and puts the bird back with score 0. Matches the step text. Four steps are long (step 3 is a paragraph plus two hints), but each piece was shown. Clean.

### 5.4.9 Playtest and reflect (AI, read only)
Task text read. CONFUSING: it says "lose in a different way each time: into a pipe, off the screen, and by flying a long way". In the game the student has just built (5.4.4 and 5.4.8) leaving the top or bottom does NOT lose, it puts the bird back in the middle ("a stand-in for losing", 5.4.3). A literal student tries to lose "off the screen" and cannot. Typed that honest observation as the surprise; grader-down fallback saved it and it counted. Minor.
Order note: 5.4.9 (playtest) sits before 5.4.10 (quiz); both unlocked in sequence, no problem.

### 5.4.10 Check: the flapping game (quiz, 8 questions, pass 6)
Citations resolved mechanically: all 8 `source` labels (5.4.2, 5.4.2, 5.4.5 x3, 5.4.6, 5.4.7, 5.4.8) match the title of the lesson their `sourceIds` point at. No rot. I answered with q6 deliberately wrong (7/8): passed at once and the page moved on to 5.4.11 without a stop to show the one I missed (the per-question review links for a miss sit below; I did not see a "you missed" banner before it advanced, so a student who passes with a miss may never read which one). Low.

### 5.4.11 Challenges: Make it yours (ONE challenge is enough: confirmed)
Starter 0/1. Each challenge alone turns the card green and runs: (1) `top.vel.x = -2 - score / 5;` (submitted); (2) best score with `if (score > best) best = score;` and a `best:` line in drawTop; (3) `top.vel.y = random(0.3, 0.7); bottom.vel.y = top.vel.y;`. Reference (all three) 1/1.
WOBBLE: ran the reference; across screenshots the first pipe pair's top half bottom edge moves 42 to 44 to 52 px and the bottom half's top edge 140 to 143 to 152: both halves move down together, gap stays the same size, and everything freezes at Game over. Pipes visibly move.
The step says "Start from your finished 5.4.8" while the page already loads a finished game as the starter; harmless but a student may paste their own over it.

## 5.4 VERDICT
Single biggest gap: the NAMED TEST in 5.4.4 (`const tapped = kb.presses(' '); if (tapped)`) is refused although 5.3 just taught the named-test habit. Everything else in 5.4 accepted every taught shape I tried (including a splice-before-delete order that is actually wrong).

## 5.5 Project: Snake

### 5.5.1 Plan (AI, read only), 5.5.2 Reading, 5.5.3 Example
Plan: same four questions; the Snake paragraph on the page is enough to answer. Honest answer typed, grader-down fallback saved it, counted. Reading 5.5.2: cell vs pixel, `n * CELL + CELL / 2` with "column 3 lands at 70", `frameCount % 8`, `floor(random(20))`, `drawTop()` all explained before use; `CELL`, a constant in capitals, is used without a word on why capitals (harmless). Example 5.5.3 clean.

### 5.5.4 Lab: Steer it
Starter 0/3. Reference 3/3. Differently shaped, all 3/3: double quotes with `&& (dy === 0)`; nested ifs (`if (kb.presses('up')) { if (dy === 0) {...} }`); test first `dy === 0 && kb.presses('up')`; named test `const offGrid = head.col < 0 || head.col > 19 || ...; if (offGrid) {...} else {...}` (submitted). Tolerant.
Visible: on Run the "arrow keys steer" label shows, the ArrowDown press turns the block, at the wall it reads "Game over" in the middle of the canvas. Clean.

### 5.5.5 Reading: A body that grows
Read. unshift/pop/delete and "two places to clean up" are all explained before the lab; glossary at the foot defines the words. Clean.

### 5.5.6 Lab: Grow and eat
Starter 0/4. Reference 4/4. Differently shaped, all 4/4: named test `const ate = col === food.col && row === food.row; if (ate) ... else ...` (submitted); `==` with `(col == food.col) && (row == food.row)`, `score++`, `segments.pop().delete();`; negated test first (`if (col !== food.col || row !== food.row) { pop } else { score... }`); brace-less else `else segments.pop().delete();`. Tolerant. (The starter's `return` in `step()` is explained in a comment on the line.)
PROSE NUMBERS: "eat three pieces of food, six cells long, score 3": I pinned the food to three cells in the path and ran it: canvas reads score: 3 and six green cells. Matches. The "Game over / press R" text is drawn on top of the snake, readable (Snake text IS visible above the snake).

### 5.5.7 Reading: Searching the array
Read. Needs `while` (taught 2.2.13) and `return` early (taught 3.2.14); both are real prior lessons, and the reading re-explains why the final `return false` sits outside the loop. The "tail counts as body" simplification is announced. Clean.

### 5.5.8 Lab: Don't bite yourself
Starter 0/3. Reference 3/3. Differently shaped, all 3/3: index loop `segments[i]` with braces and `|| (isBody(col, row))`; flag version (`let found = false; ... found = true; ... if (found) return true;`); named test `const hit = ...; if (hit) return true;` with `while (isBody(col, row) === true)` (submitted); the bite test stored first (`const bit = isBody(col, row);`). Tolerant. Clean.

### 5.5.9 Playtest and reflect (AI, read only)
Task text read. Wording nit: "which part of the code could cause it: the beat, the head and tail swap, the search, the food placement". "the head and tail swap" is not a name the course used (5.5.5 calls it "add a head, remove the tail"), so a literal reader looks for a swap that does not exist. Honest answer typed (the stricter-tail finding the reading itself announced); fallback saved it and it counted. Minor.

### 5.5.10 Check: the Snake game (quiz, 6 questions, need 5)
Citations resolved mechanically: all 6 `source` labels (5.5.2 x2, 5.5.4, 5.5.5 x2, 5.5.7) match the title of the lesson their `sourceIds` point at, AND the rendered "reread 5.5.x" links point at /lesson/5-5-snake-2, -2, -4, -5, -5, -7. No rot.
First attempt deliberately 4/6: page said "4 of 6 right, you need 5. Read the notes above, change your answers and check again", each miss/hit showed an explanation with a reread link, button became "Check again". Second attempt 6/6 moved on. Clean.

### 5.5.11 Challenges: Make it yours (ONE challenge is enough: confirmed)
Starter 0/1. Reference (all three) 1/1. One challenge alone, each green and playable: faster snake (`let beat = 8;`, `frameCount % beat`, `beat = beat - 1; if (beat < 3) beat = 3;`, submitted); best score with `if (best < score) { best = score; }`; stored turns (`turnX`/`turnY`).
GRADER (found, low-medium): extra parentheses are refused here, although the game runs correctly: `beat = (beat - 1);` and `if ((score) > (best)) best = score;` both leave "Your rule is in the code" red. The same student's unparenthesised `beat = beat - 1` and `best < score` pass, so the card gives no clue that the brackets are what it dislikes.
CONFUSING: the challenge text says "Turn the `8` in `frameCount % 8` into a variable called `beat`", but the starter already has `const BEAT = 8;` and `frameCount % BEAT`. There is no `8` to turn; a student has to work out that `BEAT` must be renamed (and made `let`, since a `const` cannot shrink). Say "turn `BEAT` into a `let` called `beat`".

## 5.5 VERDICT
Single biggest gap: the parenthesised-twin refusals in 5.5.11 (`beat = (beat - 1)`, `(score) > (best)`) plus the BEAT-vs-8 wording. The unit itself (5.5.1 to 5.5.10) is clean.

---

# SUMMARY

QUIT POINT
  5.3.7  Lab: Score one point per touch (and again 5.3.8)
         Not a "cannot start" quit point, a silent one: `if (touching === true && wasTouching === false)` and `b.wasTouching === false` go GREEN on every card and then the game never scores (score stays 0). `colliding()` returns a number, so the stored memory is 0, never `false`. The student finishes, Submits, and learns nothing is wrong until the "press R three times, reads 4" step shows 0 with no hint why. Nothing in 5.3.5 warns against `=== false`, and 5.3.8's own step wording ("a `wasTouching` of `false`") invites it.

BLOCKING
  None. Every lab was completable with a taught answer; no lesson needed an untaught concept (while 2.2.13, return 3.2.14, arrays 3.3.x, `random`/`floor` 5.2.1 are all earlier). I could not find a lesson that is "not startable".

REFUSED HONEST ANSWERS (GRADER)
  5.3.4   `world.gravity.y = (10);` (brackets round the number): "Gravity is on" red.
  5.3.8   `score = score + (bumpers[i].worth);`: worth card red, game scores correctly.
  5.4.4   named test `const tapped = kb.presses(' '); if (tapped) {...}`: flap card red (the same named-test habit 5.3.5/5.3.7 just taught); and `bird.vel.y = (-4); bird.y = (200);` turns all three red.
  5.5.11  `beat = (beat - 1);` and `if ((score) > (best))`: red.
  FALSE GREEN (opposite direction): 5.3.7 and 5.3.8 `=== true/false` shapes (above); 5.4.6 splice-before-delete order is green though it deletes the wrong pipe.

CONFUSING TEXT
  5.4.9  "lose ... off the screen": in the built game going off screen resets the bird, it does not lose.
  5.5.9  "the head and tail swap": not a name the course used.
  5.5.11 "the `8` in `frameCount % 8`" vs starter's `BEAT`.
  5.3.5  uses "level-triggered / edge-triggered" in its table, defined only in the glossary at the foot (same words 5.2.9 left undefined; no lab needs them).

CHECKS YOU ASKED FOR
  Snake text visible above the snake: yes (score line, "Game over / press R" drawn over body cells and readable; also true in Flappy).
  5.4.8 freezes after a crash: yes (frames 5 s apart identical, no new pipe, score fixed, R clears).
  5.4.11 and 5.5.11 completable by ONE challenge: yes (5.3.12 too), three single-challenge variants each.
  5.4.11 wobble reference makes pipes move: yes, both halves of a pair drift together (top edge 42 to 44 to 52 px, bottom edge 140 to 143 to 152), gap constant, frozen at Game over.
  Pinball ball reaches the goal: yes (score 1 per drop on the reference table; 16 per drop with three bumpers).
  Prose numbers: 5.3.3 score 33, 5.3.6 "adds 3" at bounciness 0.2, 5.3.8 "1, 6, 16" (32 after two drops), 5.4.6 "pipes: 2 or 3 and holds" (3), 5.5.6 "six cells, score 3": all match what I saw.
  Quiz citations (5.4.10, 5.5.10): all resolved, none rotted.
  AI-graded screens (5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1, 5.5.9): task text read, honest answers typed, "grader isn't responding ... saved and sent to your teacher" fallback saved each and unlocked the next lesson.

VERDICT PER MODULE
  5.3 Pinball: single biggest gap = the `=== false` false green in 5.3.7 / 5.3.8.
  5.4 Flappy: single biggest gap = the named test refused in 5.4.4 (`const tapped = ...; if (tapped)`).
  5.5 Snake: single biggest gap = parenthesised twins refused in 5.5.11 (and BEAT wording); 5.5.1 to 5.5.10 clean.

WORKED CLEANLY
  5.3.1 to 5.3.3, 5.3.5, 5.3.6, 5.3.9, 5.3.10, 5.3.12; 5.4.1 to 5.4.3, 5.4.5 to 5.4.8, 5.4.10, 5.4.11; 5.5.1 to 5.5.10.

HOW I REACHED 5.3 (not audited here)
  5.2.1 to 5.2.20 completed under the lock: readings, examples and the 5.2.5 slides marked complete; every lab got its reference `solution.js` (or, for 5.2.7 and 5.2.8 which have none, a one-line gravity change) injected and submitted; 5.2.19 via the grader-down fallback; 5.2.18 submitted with its reference.
  Method caveat: code was injected, not typed line by line, so partial-run behaviour (half-typed code) was not exercised. The cards only re-read on a fresh Run (an edit while a sketch runs leaves the old card state until Stop then Run); a student pressing Ctrl+Enter once sees stale cards. Not logged as a defect, but worth knowing.
