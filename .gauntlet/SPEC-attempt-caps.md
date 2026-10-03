# SPEC: three tries on every Group and Individual PA

Record: `.gauntlet/attempt-caps-loop.json` (created when phase 0 runs). Written 2026-10-03.

## What the user decided

- Every part of every Group and Individual PA gets **3 tries**, and students are told so
  before they start.
- **Best try counts** (not last). This is what `WrittenGrader` already does
  (`Math.max(prior, earned)`), so no score rule changes.
- After the 3rd try the student is shown the **solution as plain-language pseudocode**.
- Applies to **Chapters 1, 2 and 3 now, and to every PA written for the rest of this
  semester**. Groups are still graded separately; each student has their own 3 tries,
  though they may work together.
- **How each part is graded.** AI feedback on the chart and demo parts. The coding parts
  keep their deterministic grading.

| Part | Graded by | Tries |
|---|---|---|
| x.7.1 / 3.10.1 Concepts and traces (quiz) | answer key, deterministic | 3 (new) |
| x.7.2 / 3.10.2 In your own words | AI, per-criterion | 3 |
| x.7.3 / 3.10.3 Find and fix | requirement checks, deterministic | 3 (new) |
| x.7.4 / 3.10.4 Chart it | AI on the chart (legality checker stays as the gate) | 3 (new AI) |
| x.7.5 / 3.10.5 Write the steps | AI, per-criterion (existing; no Run button) | 3 |
| x.6.1 / 3.9.1 Group chart | AI | 3 (new AI) |
| x.6.2 / 3.9.2 Group build | requirement checks, deterministic | 3 (new) |
| x.6.3 / 3.9.3 Group demo | AI (existing, non-summative) | 3 |

Assumptions to confirm (nothing below is built on them until confirmed):
1. Part 5 write-the-steps stays AI-graded: it has no Run button, so there is nothing to
   check deterministically.
2. The quiz shows only a total between tries. Per-question marking and the answers
   appear after try 3, otherwise three tries is an elimination game.
3. Attempts already made before the cap goes live do not count. Every student gets a
   fresh 3 on Chapters 1 and 2, even where they sat the part once. The old best
   score stays on the record and a better new one replaces it.

## What already exists (do not rebuild)

- `lib/attempt-cap.ts` `countAttempts`: server-side count from `lesson_submissions`; a
  `gradingFailed` row is free.
- `maxSubmissions` + `revisable` on `aiGrader` (only 2.7.2 and 2.7.5 set them today).
- "N of 3 attempts left" in `WrittenGrader`.
- `GET /api/quiz-reveal`, gated on one recorded submission.

## New work

1. **Generic cap.** `maxSubmissions` for `quiz` (`QuizView`), `grading` (console parts in
   `LessonWorkspace`) and `diagram` (`DiagramAssignmentView`), all using `countAttempts`.
   Count from the server, never the browser.
2. **A banner before the first try.** "You get 3 tries. Your best one counts. After the
   third, you will see how it is solved." Shown on every capped part, not after try 1.
3. **Solution reveal.** `GET /api/attempt-reveal?lessonId=` returns the pseudocode only
   when the caller has 3 counted attempts. Pseudocode is authored in
   `pa-pseudocode/<id>.md` (a top-level folder: `solution/` collides with `solution.js` on 2.7.3 and the group builds, and anything under `lessons/` is shipped to students by `lib/lessons.ts`) and baked into a generated server module
   (same rule as `quiz-keys.generated.ts`: never under `public/`). The quiz's
   `revealAfterSubmit` moves from after-1 to after-3.
4. **AI rubrics** for the charts (x.7.4, x.6.1). The checker still decides whether it is a
   legal flowchart; the AI comments on whether the logic answers the problem, so the
   grader sees only the drawing's own content.
5. **Authoring.** Pseudocode for all 24 PA lessons (3 Chapter-1 group, 5 Chapter-1 individual, 3+5 for Chapter 2, 3+5 for Chapter 3).
6. **A standing check** `scripts/check-pa-attempts.mjs` in `npm test`: every lesson in a
   `.6.`/`.7.`/`3.9`/`3.10` PA unit declares `maxSubmissions: 3`, a pseudocode file. A PA added later fails the build until it does. This is what carries it
   forward for the semester.

## Hard rules

- The pseudocode, the grading prompt and every rubric `description` never reach the
  browser or `public/`. `check-ai-grader-leak` and `check-solution-leak` are extended to `pa-pseudocode/`.
- Feedback between tries names what is missing but may not quote the pseudocode.
- Nothing is pushed or deployed from inside the loop. Those are human approvals.
- Judges use their own `dev_student=<name>` cookie and port, max 3 in parallel.

## Phases

| Phase | Gate | Judge | Done when |
|---|---|---|---|
| 0. The check | `check-pa-attempts.mjs` written and **fails** on today's tree, listing each part | none | the failure list matches the table above |
| 1. Mechanism | unit tests for the count, best-score and the reveal route against a D1 stub (try 2 gets no pseudocode, try 3 does; a `gradingFailed` row is free; a second device cannot reset the count) | reviewer hunts a way to reach the pseudocode early | tests green; no early path |
| 2. AI on charts | `test-grader`, `test-grade-stream` and `audit-grader-tolerance --gate` on strong, thin and off-topic charts | advanced student lens tries to game the chart rubric | thin and off-topic never pass |
| 3. Authoring | pseudocode exists for every part; leak check covers it; each pseudocode matches its reference | beginner lens: can the pseudocode be followed without the answer code | no leak; no mismatch |
| 4. Rollout | `check-pa-attempts.mjs` green; full `npm test` | the three student lenses walk one chapter's test in a browser, using all 3 tries | banner seen before try 1; try 3 shows the solution; best score kept |
| 5. Deploy | human approval; deploy from a clean worktree; the origin returns the cap | none | live |

One round is gate, judge, fix, sweep, decide. Two clean rounds exit a phase and four
rounds cap it, as in `SPEC-open-items-loop.md`.

## Open questions for the user

- The three assumptions above.
- Chapter 4 and later: which assessments exist yet? Only Chapters 1-3 have PA units
  today, so "forward" is carried by the standing check and not by lessons.
