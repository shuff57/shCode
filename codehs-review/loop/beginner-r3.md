# Beginner lens, round 3: modules 5.2, 5.3, 5.4, 5.5 (Snake only)

Date 2026-10-30. Session `r3-beginner` (closed), dev server :3002, `dev_student=r3beginner`. Round-2 fixes are commit f5e53852.

## Method, and what was bypassed

- Walked in order with the lock ON. Every lesson was opened by URL only after its predecessors were `completed`, and the lock refused me when I tried to skip (5.2.3 and 5.2.4 both answered "Lesson locked" first). Readings and examples: "Mark as complete". Labs: Run, then Submit and "Confirm Submission".
- Code was injected into CodeMirror (select-all, insertText), not typed line by line. Each lab ran twice: the starter (red) and the reference solution (green, then Submit).
- BYPASSED with a direct POST of `completed` to the dev stub, because there is no way through for a student:
  - 5.2.7 (`moshion-gravity`) and 5.2.8 (`5-2-3-lab-tune-gravity`). See QUIT POINT.
  - AI-graded screens, because the dev server has no grader: 5.2.19, 5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1, 5.5.9. I read the task text and rubric only.
- 5.2.18 "Check" fell back to the pattern check ("grader isn't responding ... pattern check marked your cards instead") and went 4/4, so a student with no grader can still Submit.
- The quizzes 5.4.10 and 5.5.10 were taken in the UI, one answer deliberately wrong each (7/8 and 5/6 both passed). I did not see the wrong-answer review link.
- Citations: 114 "N.N.N (Title)" and "N.N.N Title" citations across the four modules' lesson.json and content.md were resolved against real titles. All resolve. Two flagged hits are regex false positives (trailing prose swallowed).

```
QUIT POINT
  5.2.7  Worked Example: Falling Block   (lessons/moshion-gravity)
  5.2.8  Lab: Tune Gravity               (lessons/5-2-3-lab-tune-gravity)
         Neither lesson can be completed, so 5.2.8 and 5.2.9 never unlock.
         Both are workspace pages (preview "moshion") with zero requirements:
         the header reads 0/0, "Submit" is permanently disabled, and the page
         has no "Mark as complete" button. LessonWorkspace only enables Submit
         when totalCriteria > 0 and all of them are green. The unlock rule
         (lib/lesson-lock.ts) needs every earlier lesson `completed`, so a
         student stops at 5.2.7. Verified in the browser: after Run, the
         Submit button stays disabled, and 5.2.8 stays "(locked)". After I
         POSTed 5.2.7 as completed, 5.2.8 opened and had the same dead end.
         Rounds 1 and 2 jumped past the lock, so they could not see this.
         Fix options: give each one a requirement (for example "ran the
         sketch" or one gravity value changed), or make the page show Mark
         as complete when there are no requirements.
         Side note on 5.2.8: step 2 says "describe in a sentence what it felt
         like" and there is no box to write in (same shape as round-1 item 9).
```

## Round-2 open items

| Item | Status | Evidence |
| --- | --- | --- |
| `floor` shadows p5 `floor()` (R1 #20) | FIXED | 5.3.7 starter is `let ball, bumper, ground, goal, score;`. 5.3.4 hint says "Do not name one `floor`", and 5.3.2 explains why. No `let ... floor` is left in 5.2-5.5. The Snake labs call `floor(random(20))` and that works. |
| 5.2.17 never names the keys (N1) | FIXED | Step 3 says "move with `a` and `d` (jump with the space bar)". The 5.2.20 starter comment says it too. |
| 5.2.20 "above the wind zone" (N2) | FIXED | It now says "up in the wind zone (y less than 200)". I played the scene: a jump from the floor reaches y=31 because the wind pushes up, so a goal at y=120 is reachable. |
| 5.2.20 starter 1/4 on Run (N4) | FIXED | The starter is now 0/4; the solution is 4/4. |
| 5.3.9 citation comma (N3) | FIXED | It reads "5.3.10 Lab: Lose, and start again". |
| Score hidden under a pipe (N5) | FIXED | Text now lives in `drawTop()`, which is taught in 5.4.5 before the labs use it. After a crash the "score: 0" sits on top of the pipe in a screenshot, with "Game over" showing. |
| 5.5.4 'up'-only card (R1 #21) | FIXED | r1 now needs all four keys. With only "down" removed the lab shows 2/3. `kb.pressing("up")` with double quotes and an `else if` chain are both 3/3. |
| AI rubric strictness 5.5.1 / 5.5.9 (R1 #22) | FIXED (text) | Both rubrics carry the same "Be very generous ... only a blank or unrelated answer is a miss" wording as 5.3.1, 5.3.11, 5.4.1 and 5.4.9. Their prompts cite 5.4.8, 5.5.1 and 5.5.8, which exist. Never seen graded, because dev has no grader. |
| 5.2.5 slides placeholder (R1 #23) | OWNER DECISION, unchanged | The page says "These slides aren't published yet. Nothing is missing on your end — your teacher hasn't built this deck yet ... mark this complete and carry on." The lesson description still says "Placeholder until the deck is rebuilt". A student can finish it, so it does not block. |

## The four experiments I judged from text only in round 2, now run

- 5.3.5 "delete `wasTouching = touching;`": FIXED, verified. Score goes 66, 99, 132 (jumps of 33 per touch contact), and it races exactly as the reading says. Moving the update inside the `if` gives a score that stays at 1 after three presses of R, also as the reading says.
- 5.3.10 `gameOver = true` flag: FIXED, verified. A `gameOver` flag, with its test turned round, is 4/4. So is `ball.y >= height`. (My variant had a slip in the R handler and still scored 4/4, so the card checks shape, not behaviour. That suits the lax-grading rule.)
- 5.4.7 "set `p.passed = true` before `score += 1`": FIXED, verified. 3/3.
- 5.2.20 second goal reachable: FIXED, verified (see above).

## New findings

1. **5.2.7 and 5.2.8 are an unfinishable pair.** See QUIT POINT. This is the one real blocker in the unit. It was invisible in rounds 1 and 2 because both bypassed the lock.
2. **5.5.6 step 1 describes 5.5.4 wrongly.** The starter comment says the code is "the move from 5.5.4's `draw()`, now in a function". But 5.5.4 moves one head block with `head.col += dx`, and this starter deletes and rebuilds the head. That is a one-line comment edit. Low severity: the comments above each helper still carry a beginner.
3. **5.2.7 prose says "the floor catches it"** while the code names the sprite `ground`. The 5.2.12 scene text may do the same. This is plain English, not a code name, so it is cosmetic. I am listing it only because the floor to ground rename was the last round's work.
4. After a Submit the progress bar text I read showed "0/N" or the old count for a moment, because the page navigates on its own. It had no effect: the lesson-state endpoint showed `completed` each time.

## Worked cleanly

- Every starter is 0/N on Run (including the 5.2.20 starter now). Every reference solution is full on Run, and Submit then unlocks the next lesson. I checked 5.2.3, 5.2.4, 5.2.10, 5.2.12, 5.2.14, 5.2.17, 5.2.18 (via Check), 5.2.20, 5.3.4, 5.3.7, 5.3.8, 5.3.10, 5.3.12, 5.4.4, 5.4.6, 5.4.7, 5.4.8, 5.4.11, 5.5.4, 5.5.6, 5.5.8 and 5.5.11.
- The pinball and Flappy reading to lab sequence needs no leaps. Terms are taught before use: `drawTop()` in 5.4.5, `for...of` and `while` in 5.5.7, `unshift` and `pop` in 5.5.5.

## Verdict per module

- **5.2: not clean. Single biggest gap: 5.2.7 (Falling Block) and 5.2.8 (Tune Gravity) can never be completed, so a student stops at 5.2.7.** Everything else in 5.2 is fixed.
- **5.3: clean.** The `floor` trap, the comma citation and the `gameOver` flag are all fixed. The 5.3.5 experiments behave as the text says.
- **5.4: clean.** The freeze really freezes, the score stays readable after a crash, and `passed` before `score` is accepted.
- **5.5 (Snake, 5.5.1 to 5.5.11): clean.** The `'up'`-only card is fixed and the AI rubrics are lax. The only remark is the 5.5.6 step 1 comment (finding 2), which is not a blocker. The AI-graded screens were judged from the rubric text only.
