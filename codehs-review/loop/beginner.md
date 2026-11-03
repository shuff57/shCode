# Beginner lens: modules 5.2 (opener 5.2.1-5.2.4), 5.3, 5.4, 5.5

Date 2026-10-30. Session `lens-beginner`, dev server :3002, `dev_student=beginner`.

Method, and what was NOT done:
- Every lab with requirements (24 labs) was run in a real browser: starter alone, then the reference solution (all green), then 17 "taught-but-differently-shaped" variants.
- All readings, examples, quizzes and starters were read in order. Every "N.N.N (Title)" citation was resolved mechanically against lesson titles. Quiz `source` fields in 5.4.10 and 5.5.10 all resolve correctly.
- NOT verified: AI grading. The dev server has no grader (`The grader isn't responding right now`), so 5.2.19, 5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1 and 5.5.9 were judged from their rubric text only. I never saw a real AI verdict.
- A lesson was never typed by hand line by line. Code was injected into CodeMirror and Run was clicked.

```
QUIT POINT
  5.2.16  Lab: Reaching the Goal  (5-2-11-lab-reaching-the-goal)
          One step asks for seven things at once: an `if (goal)` guard, dx, dy, a
          Pythagorean distance, a "small enough" number, a log, `goal.delete()` and
          `goal = null`. The only model for it is 5.2.17 Worked Example: The Finished
          Scene, which comes AFTER the lab. The distance formula was last taught in
          3.1.14/3.1.15, two units back. The three requirement cards cite "Help: 5.2.15
          (Cleanup and Delete)", and that reading never mentions distance.
          This is where a beginner stops. Runner-up: 5.2.20, where the starter file is
          completely blank and the lab asks for a whole two-goal game.
```

## BLOCKING (a taught answer is refused, or a lesson cannot be finished from what came before)

1. **5.3.7 Lab: Score one point per touch** (`5-3-pinball-6-lab-score-one-point-per-touch`). Measured: 2/3 on each variant below, and the green-to-advance lock means a red card stops the student.
   - `!wasTouching && touching` (order swapped) fails r2. The regex needs `&&` before `!`.
   - `touching === true && wasTouching === false` fails r2. This is the natural beginner expansion of `!`.
   - Naming the memory variable `last` or `prev` fails r3. r3 needs a name containing "touching". The step never says the name matters.
   - `score++` passes here, but it is refused in 5.4.7 (below). The course is inconsistent.
2. **5.3.4 Lab: Build the table** (`5-3-pinball-3-lab-build-the-table`). Double-quoted `"static"` gives 2/4 (r2 and r4 both need single quotes). Nothing in the course says quote style matters. Same on 5.4.4 (`kb.presses(" ")` gives 2/3) and 5.5.4 (`kb.presses("up")` gives 2/3). 5.2.18 and 5.2.12 accept both quote styles, so the course is not consistent.
3. **5.3.10 Lab: Lose, and start again** (`5-3-pinball-9-lab-lose-and-start-again`, step 2, r2). `ball.y >= 400` and `ball.y > height` both give 2/3, because r2 needs `ball.y > <digits>`. A `gameOver = true` flag also fails. The step says "set the flag to false", so that last one follows the step, but it is the shape a beginner picks after the reading on states.
4. **5.4.7 Lab: Score a gap** (`5-4-flappy-6-lab-score-a-gap`). Each of these gives 2/3:
   - `score++` (r3 needs `+= 1`).
   - `!p.passed && p.x < bird.x`.
   - `p.passed === false`.
   - Putting `p.passed = true` before `score += 1`.
5. **5.4.4 Lab: Make it flap** (`5-4-flappy-3-lab-make-it-flap`, step 2). `bird.y = height / 2` ("put it back in the middle") fails r3, because r3 needs `bird.y = <digits>`. `height` was never taught. The grader is stricter than the lesson.
6. **5.5.8 Lab: Don't bite yourself** (`5-5-snake-8-lab-dont-bite-yourself`). `for (let i = 0; i < segments.length; i++)` gives 2/3, because r1 accepts only `for...of segments`. The index loop is the loop 5.4.5 itself uses, and 5.5.7 teaches only `for...of`.
7. **5.3.12 Challenges** (`5-3-pinball-10-challenges-make-it-yours`, r1). The second goal must be named exactly `goal2` (or `goals.push`). The challenge text never says the name. `secondGoal` or `goalB` is red for no visible reason.
8. **5.2.16, citations.** r2, r3 and r4 point to "Help: 5.2.15 (Cleanup and Delete)". That reading teaches `delete()` and `visible`, and never distance. The distance formula is in 3.1.14/3.1.15, and `distanceTo` is only said to be "from the Sprite docs".
9. **5.3.12, 5.4.11 and 5.5.11, step 2** ("Write one sentence in the notes under the editor"). There is no notes area. The page contains the word "notes" zero times. The File panel lists `content.md` and `script.js` only. A beginner has nowhere to write it, and no requirement checks it.
10. **5.3.12 Challenge 2** ("bumper that moves"). The text says a static sprite does not move, so make it dynamic, give it a low `bounciness` and set its velocity "and it will keep going". With gravity on (`world.gravity.y = 10`) a dynamic bumper falls to the floor. `kinematic` is taught (5.1.15, 5.4.5), but this text never points to it. As written, this challenge produces a falling bumper.

## ORDERING (needed at X, taught at Y)

- **Distance formula:** needed 5.2.16, shown 5.2.17 (1 lesson late). Originally taught 3.1.14-15, so it is a recall.
- **`return` inside a function:** used in the 5.5.6 starter (`step()` has `return;` and the helpers return values). 5.5.7 ("Why can a function return in the middle of a loop?") explains early return one lesson later. Plain `return` is taught in unit 3, so this is a mild point.
- **`world.gravity.y = 0`:** appears in 5.2.2/5.2.3/5.2.4 with an explanation. 5.2.6 Reading: Gravity comes after them. The 5.2.2 text says "the line from 5.1.20", but 5.1.20 ("Make it Move") has no gravity at all.
- **5.2.20 "refactor is coming later, in §5.4"** (arrays of goal objects). 5.4 is Flappy, which has arrays of pipes, not objects with classes. Classes come in 5.6/5.7. This is a wrong forward reference.
- **5.5.6 starter:** 5.5.4 was a one-block walker. 5.5.6 hands over about 60 lines in five functions (`makeSegment`, `makeFood`, `step`, `startRound`, `setup`) and asks for edits inside `step()`. No lesson showed a function that returns a new sprite and is called from three places.
- **5.5.4 step 3:** the starter puts the pixel update ABOVE the "STEP 3" comment. The hint says "put the pixel update in the else", so the student must cut and re-nest two lines. The reference solution does exactly that. The step never says to move them, and the starter is built so the student's check lands too late (the block has already jumped off the grid).
- **5.2.1 citation:** "You saw frameCount move a sprite in 5.1.14". 5.1.14 is "Reading: Key names". frameCount is in 5.1.15 Worked Example (off by one).
- **5.2.2 citation:** the gravity line is attributed to 5.1.20 (see above).

## GRADER / content accuracy

- **5.3.5 Reading, "Try this" is false (confirmed in the browser).** It says: delete `wasTouching = touching;` and "the score now climbs once and stops". I ran it and the score printed 26, 86, 146, 206 ... It races, because `!wasTouching` is always true. The page shows the opposite of what the reading promised. The 5.3.7 hint "If it reads 1 and stops, the remembered variable is never updated" has the same confusion. It is only true if the update sits inside the `if`.
- **5.4.8 "freeze the world" does not freeze (confirmed in the browser).** I followed the steps literally on the starter. Crash gave `playing=false`, gravity 0 and pipe speed 0, and all three cards went green. But the pipe count then kept rising (3, 4, 5) because the `frameCount % 90` spawn and the flap are still outside any `if (playing)`. The reference solution wraps everything in `if (playing) {...} else {...}`. The step text never says to. The 5.3.9 reading showed that shape, but 5.4.8 does not point back to it. No requirement catches it.
- **5.5.4 r1** checks only `'up'`. A student who writes only the up key still passes "Each arrow key sets the direction".
- **5.5.6 r3** needs `score += 1` before `food = makeFood()` within 80 characters. The step lists "add 1 to score, delete the food, make a new one", which matches. But `food.delete(); food = makeFood(); score += 1;` fails, and so does `score++`.
- **AI rubric inconsistency.** 5.3.1, 5.3.11, 5.4.1 and 5.4.9 carry "Be very generous: anything remotely related ... earns full credit". 5.5.1 and 5.5.9 do not (checked in `lesson.json`). 5.5.1 says "a list that only restates the rules in one lump is partial". 5.5.9 says "If they found nothing, ... acceptable as partial" and needs a bug "described concretely enough that another person could look for it". Neither matches the "anything remotely related passes" standard.
- **Whether the screens say what to write.** The AI screens do this well: 5.3.1, 5.4.1 and 5.5.1 each describe the game, then list the four things to cover. The 5.5 plan restates the Snake rules in a paragraph, which helps. One oddity: the same four questions appear twice on the page, once as "Aim to cover" and again as "WHAT TO ANSWER" with different wording. The rubric table (3rd copy) is shown too, so the page is long.

## FUNCTIONAL / UI

- **5.2.18 Pinball Scene** is the only lab where Run does not mark the cards. The starter shows "Still needed (4)". Running the reference solution leaves 0/4. The cards only move after a "Check" button press (AI marks them; with no grader the pattern check does). The helper text says "**Grade** has the AI read it", and the button says "**Check**". Every other lab in 5.2-5.5 goes green on Run alone. Nothing teaches the difference.
- **5.2.5 Slides:** the student sees "These slides aren't published yet. Nothing is missing on your end". The lesson description still says "Placeholder until the deck is rebuilt from bookSHelf". The slot is dead but harmless.
- **Numbering:** displayed 5.2.7 and 5.2.12 live in the folders `moshion-gravity` and `moshion-bounce`, and 5.2.1-5.2.4 are `5-2-random-*`. This is invisible to students and displays correctly. It is the cause of a trap for anyone who unlocks lessons by folder name: `5-2-5-lab-add-a-jump` is only "Lesson 10 of 20" and stays locked until those two are done.
- **Latent trap:** `let ball, bumper, floor, goal` (5.3.2, 5.3.3, 5.3.7 and the 5.2.6/5.2.11 readings) makes `floor` a sprite variable. 5.2.1 taught `floor(random(...))` as a function. A student who adds a random spot to a 5.3.12 challenge gets "floor is not a function" with nothing to explain it.
- **Drafts persist across visits.** My earlier solution runs showed up as "starters" the next time (5.3.12 opened with `goal2` and `best` already typed). This is fine, but be aware when testing.

## Undefined vocabulary (none of it needed to finish a task, all unexplained)

- 5.2.11 Bounciness and Friction: "restitution", "geometric mean".
- 5.2.12 Bouncy Ball hints: "Box2D's restitution coefficient".
- 5.2.13 Forces vs Velocity: "Newtons", "respects mass".
- 5.2.12 hint "change positions and rotations" (rotation is taught in 5.1.10, which is fine).
- 5.4.5: "kinematic". It is defined in the glossary and was first shown in 5.1.15.

## WORKED CLEANLY

- **5.2.3 and 5.2.4 (new opener):** both starters at 0, both references 5/5. Variants that passed: `if/else` instead of `on = !on` (5/5); `colors[floor(random(colors.length))]`; `random(colors)`.
- **5.2.1 and 5.2.2:**
  - They teach `random`, `floor`, `%` and `===` before the labs use them.
  - They explain the one-shot trap in plain words.
  - The "Math.random in the loops unit, shuffled-deck" reference resolves to 2.4.3.
  - The 5.2.2 "Try this" #5 does exactly what 5.2.4 step 3 needs.
- **5.2.5-5.2.15:** every cross-reference resolves, and 5.2.9, 5.2.13 and 5.2.14 are solvable from the previous reading.
- **5.3, 5.4 and 5.5 readings:** the text, the quiz sources and the "Help:" citations resolve without error (checked mechanically), except the cases above.
- **5.5.1 and 5.5.9:** a student who does the work is not left guessing what to write.
- **Every reference solution turns its lab fully green** except 5.2.18, which needs Check (above).
- **Passed (taught shapes):** 5.5.4 `col > 19` (3/3), 5.5.6 as written (3/3), 5.3.7 `score++` (3/3).

## Single biggest gap per module

- **5.2:** 5.2.16 Reaching the Goal. Seven actions in one step, with its worked example (5.2.17) a lesson later and the help links aimed at the wrong reading.
- **5.3:** 5.3.7. The grader rejects `=== false`, a swapped order and a renamed memory variable, and the 5.3.5 reading's "delete the line" experiment tells the student the wrong result (the score races, not "climbs once and stops").
- **5.4:** 5.4.8. The "freeze the world" step does not freeze (pipes keep spawning), and the grader goes green on the broken version because the step never says to wrap the play code in `if (playing)`.
- **5.5:** 5.5.4 step 3 and 5.5.6. The starter cuts the step in the wrong place and the next lab hands a 60-line program with no scaffolding between a one-block walker and a snake of arrays.
