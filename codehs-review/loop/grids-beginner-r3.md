# Beginner lens round 3: module 6.9 Grids and Tile Maps (14 lessons)

Date 2026-10-31. Session `g-beginner3` (closed), cookie dev_student=gbeginner3, dev server :3002, DEV_ROLE=student, lock ON, no stubbed POSTs. Walked 1 to 14 in order through the real lock (direct goto of 6.9.14 first showed "Lesson locked"). Every lesson 1-13 ends "completed" in /api/lesson-state; 14 left "started" on purpose. Method: readings Mark as complete; labs get code typed into CodeMirror (select-all, insertText), Stop then Run, cards read from the Quest drawer, Submit then Confirm Submission. Reference solutions were used to move forward; the round-2 gap shapes were then run as edited copies. No repo files edited.

## QUIT POINT
None. The module is startable and finishable end to end. This round I did not re-walk the step text slowly for every lab (rounds 1 and 2 did); the focus was the round-2 fixes and the Confirm button question.

## Round 2 fixes: verified held (live, in the browser)
- 6.9.14 r2 sentence: `// Without it every brick is worth 10 again.` 2/2 (was refused). `// Removing it makes every brick worth 10 again.` 2/2. A sentence with none of the keywords (`// My rule gives the top rows more points.`) 2/2 via the "few words" alternative. A title line starting with a digit (the starter's) still gives r2 red, as the card says.
- 6.9.10 r1 with two `while` loops (`let r = 0; while (r < ROWS) { const row = []; let c = 0; while (c < COLS) { row.push(false); c = c + 1; } g.push(row); r = r + 1; }`): 6/6, submitted, lesson completed.
- 6.9.11 r1 with `b[r] = []; b[r].push(1);` (no `.push(row)`): 6/6, submitted, completed.
- 6.9.8 r5 with a helper `const lastLevel = levels.length - 1; if (levelNum === lastLevel) { won = true; } else { levelNum += 1; loadLevel(levelNum); }`: 5/5.
- Reference solutions all score full on 4, 6, 7, 8, 10, 11, 14 in the browser.
- 6.9.13: all `sourceIds` resolve to a real lesson (2, 9, 5, 5, 11, 10, 8). q6 now points at 6.9.10, the lab that guards the strip click.

## GRADER (taught-but-differently-shaped answers refused)
Nothing new refused this round. Nothing to add.

## ORDERING / UNTAUGHT
Nothing blocking. Small, carried over: 6.9.13 q6 option text says "reading a cell from it stops the sketch" but the question's code is a WRITE (`grid[r][c] = ...`); the true error is "cannot set properties of undefined". A careful beginner who traces the line may hesitate. Low.

## FUNCTIONAL: can the hidden "Confirm Submission" button be reached while Submit is disabled?

Short answer: not by any real student action. Only a script calling the element's own `.click()` can do it, which is what round 2's test script did by accident.

Evidence (6.9.14 at 1/2 cards, header "Still needed (1) 1/2", Submit `disabled`):
1. The button exists in the DOM (count 1) inside `<dialog class="commit-dialog">`, but the dialog is closed: `dialog.open === false`, computed `display: none`, button box 0 x 0.
2. Playwright's actionable `click()` on it times out ("waiting for ... element not visible"). A real mouse cannot hit a 0x0 `display:none` node.
3. Tab traversal: 300 consecutive Tab presses from the body never focus it (display:none is not focusable).
4. Real mouse click at the centre of the disabled Submit button: no dialog opens (0 open dialogs). Playwright's `click()` on it times out on "element is disabled". Enter, Space, Ctrl+Enter, Ctrl+S pressed on the page: still 0 open dialogs.
5. Code reading (components/LessonWorkspace.tsx): `setSubmitOpen(true)` has exactly one caller, `handleSubmit`, and `handleSubmit` has exactly two callers, the header Submit button and the one at line 1390, both `disabled={submitted || !canSubmit}`. SubmitDialog opens only from `submitOpen`. No keyboard shortcut, no URL parameter and no other component reaches it.
6. Why the button is in the DOM at all: every Run calls `runClientGrade()`, which does `setGradeReport(report)`, and SubmitDialog only returns null while `report` is null. So after the first Run the dialog and its Confirm button are always mounted but closed.
7. Why a script can complete the lab: `HTMLElement.click()` dispatches a click on a hidden element, so `onConfirm` (`confirmSubmit`) runs; with `gradeReport` already set by Run it records the submission and calls `recordLessonCompleted`, with no check that `canSubmit` is true. That is the round-2 result (completed at 1/2). `confirmSubmit` does not re-check the gate itself.

Only remaining real-student route I could think of: Submit enabled at all green, then `handleSubmit` re-grades fresh, so the dialog shows the current report, not a stale one; Cancel/Esc close it through `onClose`. I found no stale-report path. If the team wants defence in depth (a student with devtools can complete any lab), the one-line guard is `if (!canSubmit) return;` at the top of `confirmSubmit`. Not needed for honest students.

Other:
- AI-graded 6.9.1 and 6.9.12 again show "The grader isn't responding right now ... sent to your teacher" and advance (dev fallback, unchanged).
- 6.9.13 quiz: all seven answered, "Check my answers" goes straight to 6.9.14 with no score shown (unchanged from rounds 1 and 2).
- After Confirm on a lab, navigation to the next lesson takes more than 2.5 s here (6.9.6, 6.9.10, 6.9.11 still showed the old page at 2.5 s; 6.9.6 reached 6.9.7 by 9 s). The lesson is already completed in state. A student who clicks Confirm and sees nothing for several seconds may click again. Low; dev-server speed likely.

## Single biggest gap
Clean on the student side. The round-2 fixes all held and I found nothing new that blocks or wrongly refuses a beginner. The Confirm button is not reachable by a real click, key or tab; only a scripted `.click()` on the hidden element completes a lab at 1/2, and `confirmSubmit` has no `canSubmit` guard of its own (optional hardening).
