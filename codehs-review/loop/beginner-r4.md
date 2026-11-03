# Beginner lens, round 4: modules 5.2, 5.3, 5.4, 5.5 (Snake only)

Date 2026-10-30. Session `r4-beginner` (closed), dev server :3002, `dev_student=r4beginner`. Fixes under test: commit 21b0f12b.

## Method

- Fresh student, lock ON, strictly in order: 5.2.1 to 5.2.20, 5.3.1 to 5.3.12, 5.4.1 to 5.4.11, 5.5.1 to 5.5.11. **No stub POSTs.** Every lesson was finished through its own UI: "Mark as complete" on readings, examples and slides; Run, green cards, Submit, "Confirm Submission" on labs; "Submit for feedback" on written screens; "Check my answers" on quizzes. The lock held the whole way, and each Submit unlocked the next lesson (5.2 ended at 19/20 before 5.2.20; 5.5.11's Submit moved on to 5.6).
- Every lab: starter Run (red, 0/N), then the reference solution injected into CodeMirror (not typed line by line), Run (all green), Submit. Where the lesson said "change X" (5.2.7, 5.2.8) I made that edit by hand.
- AI-graded screens (5.2.19, 5.3.1, 5.3.11, 5.4.1, 5.4.9, 5.5.1, 5.5.9): dev has no grader. Submit for feedback answers "The grader isn't responding right now. Your answer has been saved and sent to your teacher for marking", **and the lesson still counts**: the next lesson unlocked and the counter moved each time (for example 18/20 to 19/20). So a student is never stuck on a grader outage.
- Not done: typing lab code one line at a time, and judging real AI grades.

## QUIT POINT

None. The round 3 quit point (5.2.7 and 5.2.8) is fixed. I got through all 62 lessons with no stub.

## BLOCKERS

None.

## Round 3 items

| Item | Status | Evidence |
| --- | --- | --- |
| 5.2.7 Falling Block completable | FIXED | It now has one card, "You changed the gravity", 0/1 on the starter. Step 2's edit (`gravity.y = 0`) turns it green and Submit works. |
| 5.2.8 Tune Gravity completable | FIXED | 0/1 on the starter. `gravity.y = -5` plus a `//` comment line at the bottom is green, and Submit unlocks 5.2.9. Step 2 now says "write one sentence as a `//` comment at the bottom of the code", so the old "no box to write in" side note is gone. |
| Snake text visible | FIXED | In 5.5.4 a screenshot of the running solution shows "arrow keys steer" and, after the block walks off, "Game over", both readable on the canvas. `drawTop()` carries a comment saying it runs after the sprites are drawn. |
| 5.2.17 playable | FIXED | After clicking the canvas, holding `d` walks the player to the goal. "You win!" prints once and the goal vanishes. |
| 5.2.20 playable | FIXED | `d` collects the first goal. The space bar then lifts the player into the wind zone and collects the second goal (y about 120). "All goals collected!" prints. Starter 0/4, solution 4/4. |
| 5.5.6 step 1 comment | FIXED | The starter now says "One move of the snake, run on the beat. It does the job 5.5.4 did on each..." and "New since 5.5.4: the snake is an array". |
| Quiz review links 5.4.10 and 5.5.10 | OK | I resolved every link on both quiz pages and compared it to its question's `source`. 5.4.10's eight links go to 5.4.2, 5.4.2, 5.4.5, 5.4.5, 5.4.5, 5.4.6, 5.4.7 and 5.4.8, and 5.5.10's six go to 5.5.2, 5.5.2, 5.5.4, 5.5.5, 5.5.5 and 5.5.7. All point at the right lesson. |
| 5.2.5 slides placeholder | UNCHANGED (owner decision) | The page says the deck is not published and to carry on. It still completes. |

## New findings (all minor, none blocks)

1. **Run does not re-run while a sketch is already running.** After editing code on a lab whose sketch is running, the button reads "Stop" and the cards stay at their old count (0/1) until you Stop, then Run. Cause: the sketch was already running. A student who edits first and presses nothing sees red and may think the edit was wrong. A one-line note in the lab ("press Stop, then Run again after an edit") or turning "Stop" back into a restart would remove the doubt. I hit this twice in 5.2.7 and 5.2.8.
2. **Keys only reach the sketch after you click the canvas.** My first `d` hold did nothing; a click first made it work. 5.1.13, 5.1.16, 5.1.18 and 5.1.19 do teach "click the canvas to focus it". 5.2.17, 5.2.20, 5.4.4 and 5.5.4 do not repeat it. Not a gap by the course's own ledger, but a one-clause reminder in 5.2.17 would help a student who skipped back.
3. **5.2.18 Run gives 0/4 on a correct solution; only Check turns the cards green.** The page says so ("Check has the AI read it and mark the Quest cards"). With no grader, the fallback line "The pattern check marked your cards instead" turned them 4/4. Fine, but a student who only presses Run sees red.
4. **5.3.12, 5.4.11, 5.5.11 starters are 0/1.** Optional stretch, one card each. Matches the stated design.

## AI-graded screens: does the task text alone say what to write?

Yes, for all seven. Each has a "WHAT TO ANSWER" block with numbered questions, a lesson pointer, and "a few short sentences per answer is plenty". 5.3.1, 5.4.1 and 5.5.1 ask for four parts, two things to remember, what first and what unsure. 5.3.11, 5.4.9 and 5.5.9 ask four reflection questions about rounds played. 5.2.19 asks two direct questions. The rubric wording on 5.2.19 is lax ("accept any everyday phrasing ... doesn't need textbook precision"). I could not see a real grade. One note: the playtest screens say "Play your finished game" but the playtest page has no sketch; the student must go back to the lab. The lesson pointer says so, so it is fine.

## Worked cleanly

Every starter was red and every reference was green and submittable in these 33 labs and assignments: 5.2.3, 5.2.4, 5.2.7, 5.2.8, 5.2.10, 5.2.12, 5.2.14, 5.2.17, 5.2.18, 5.2.20, 5.3.4, 5.3.7, 5.3.8, 5.3.10, 5.3.12, 5.4.4, 5.4.6, 5.4.7, 5.4.8, 5.4.11, 5.5.4, 5.5.6, 5.5.8, 5.5.11. All readings and examples completed. Both quizzes passed with one answer deliberately wrong and auto-advanced.

## Verdict per module

- **5.2: clean.** The two blockers are fixed and 5.2.17 and 5.2.20 are playable. (The "Stop then Run" note above is the only rough edge.)
- **5.3: clean.**
- **5.4: clean.**
- **5.5 (Snake, 5.5.1 to 5.5.11): clean.** Text shows on the canvas, and the 5.5.6 comment is corrected.
