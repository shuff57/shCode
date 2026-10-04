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

## Decisions recorded after the phase 1 judge

- **A teacher's unsubmit returns the tries.** `lesson-unsubmit` deletes the submission
  rows, so the count resets and the earlier best score is not kept. Accepted: it is
  teacher-only, and it is the way to give one student a clean slate.
- **The count and the score are the server's.** A capped part's counted row is written
  by the server (the quiz from its key, an AI part by `grade-written`, a deterministic
  console part clamped). `lesson_state.score` on a capped part is derived from those
  rows; the browser's number is ignored.
- **Open for the owner:** the repository is public and the generated server modules
  (`quiz-keys`, `ai-graders`, `pa-pseudocode`) are committed, as are `solution.js` files.
  A student who finds the repo can read answers no matter what the app serves.

## Release (decided 2026-10-03)

A judge showed that "solution after the last try" lets an early finisher, or a
throwaway account, pass the answer on while the test is still open for everyone else.
The user chose: **the solution appears after every try is spent AND the teacher has
released it for the student's class.** Then added: a release can be **now or a date and
time**, opening by itself.

- **Table** `class_solution_releases` (migration 0032): `(class_id, scope, scope_id)` ->
  `release_at` epoch ms. Scopes `module` (a whole test) and `lesson` (a part); a part row
  beats its module row, the same inheritance as `class_open_dates`. No `unit` scope.
  **No row means not released** (the opposite of an open date).
- **One instant, no cron.** Released when `release_at <= now`, compared with the server
  clock on every reveal request. "Release now" writes `now`; a date writes the
  school-timezone instant through `lib/due-dates-core.ts` (DST-correct, same `time`
  shape as the due/open dates). Take back = delete the row; to close one part under a
  released module, a lesson row at `HELD_BACK` (year 9999).
- **Gate.** `attempt-reveal` and the capped path of `quiz-reveal` need both conditions.
  Any live class of the student that released it suffices; expired and archived classes
  do not count. Teachers and admins bypass both (preview). A DB error fails closed (503
  on attempt-reveal, key withheld on quiz-reveal).
- **What a student sees.** attempt-reveal answers 403 `{reason: 'not-released',
  scheduledAt, now, cap}`; the panel says "You have used all 3 tries. Your teacher
  releases the solution on Fri Nov 6, 3:00 PM." (or "...will release the solution.")
  with a Check again button and a re-check on focus (no polling). A capped quiz keeps
  showing the total, with `answersWithheld` in place of the key.
- **Teacher UI.** `/teacher?class=<id>` -> "Release solutions": per test and per part,
  Release now / date + time / Take back, state in words ("Released", "Releases Fri Nov
  6, 3:00 PM", "Not released"), and "N of M students have used all 3 tries".
- **Known gap, out of scope:** `schoolInstant` in `lib/due-dates-core.ts` rolls
  '2026-13-45' over into a different day; the release route refuses non-existent days
  itself (`isRealDate`), the due and open routes still accept them.

## Accepted after the phase 2 gaming judge (2026-10-03)

- **The chart legality gate is browser-only.** `grade-written` grades whatever text arrives,
  so a hand-typed illegal chart can be scored. The browser shows the red checks and asks for
  confirmation before a red chart spends a counted try. Accepted as low: the AI feedback and the
  best-of score are all that is at stake.
- **Burst risk, not built.** Under six parallel requests the judge saw 60-114 s per grade and one
  180 s abort (no row written, no try spent). A class submitting inside one minute is the real
  deploy risk. Cheapest first: a 25-parallel burst test against ollama.com before test day;
  ask students to submit when ready; jittered client retry on 429/502 only if the burst fails.
- **A find-and-fix part is a code lesson with an AI grader**, not a written answer. `lib/lesson-view.ts`
  keeps `console`/`moshion`/`reshape` previews in the workspace even when they carry an `aiGrader`
  (`scripts/test-lesson-view.mjs` guards it).
- **A chart that fails the legality checks may still be handed in on a capped part**, after an
  explicit confirm that it uses a try. A student stuck on one check is not locked out.

## Round 4: the final judge's findings (2026-10-03)

- **A 0-point (pass/fail) capped part grades a REAL percent.** The group demos and charts,
  1.7.2 and 1.7.5 stored score 0 and, with a null `maxScore`, graded 100% on completion. Now the
  part's best is **criteria met out of criteria total** (met 1, partial half; `criteriaScore` in
  `lib/grade-pass.ts`) and the manifest's `maxScore` is the criteria count for a CAPPED pass/fail
  rubric (`scripts/generate-lessons-manifest.mjs`, mirrored in `app/page.tsx`). An uncapped pass/fail
  rubric stays binary. `scoreKind` stays rubric-points based so a group demo does not move from
  Lab to Written. **Completion rule, decided:** every capped part completes on ANY hand-in (the
  test-mode rule: a part nobody can pass must not lock the next one), so the group demos keep
  their original intent (they used to complete only on a pass) in effect, because a junk demo now
  earns 0%, not 100%. The pass rule (ceil(n/2) criteria) still decides "struggling" in the review queue.
- **A release counts only for a student who was in the class when it took effect**
  (`enrolled_at <= release_at`, `functions/_shared/solutionRelease.ts`). Students join a class
  themselves with its code; without this a student from another period joins period 1 after it
  released and reads the solution early. **A genuine late joiner is included by the teacher releasing
  again** (the upsert moves `release_at` to now, which is after their `enrolled_at`). Remaining limit,
  accepted: a student who joins the releasing class BEFORE it releases is indistinguishable from a
  member; rotate the class code (`regenerate-code`) if that is a worry.
- **Teachers can give tries back on any capped part** (`POST /api/classes/[id]/tries-reset`, migration
  0033, buttons in the student drawer): `give-back-one` removes the newest counted try, `reset` removes
  every row so all tries are back. **Audit trail, decided:** the rows are deleted (every reader of
  `lesson_submissions` reads the part as it now is) but copied as JSON into `lesson_try_resets`
  with who, when, the class and the best score before, in the same batch. This supersedes the earlier
  "unsubmit leaves no audit trail" for capped parts; quiz `lesson-unsubmit` itself is unchanged.
- **A teacher's override respects best-of** on a capped part: the mark is THAT row's score (a marked row
  is read as stored, not re-derived from the AI criteria) and the stored score is the higher of the
  mark and the best counted try, unless the teacher ticks "use this as the score even if lower"
  (`replaceBest`). Uncapped parts are unchanged.
- **Deploy guards.** `npm run deploy` now also runs `stamp-tries-applied.mjs --check`: it refuses until
  the human has run `stamp-tries-applied.mjs --set-now` once at go-live and committed it. CLAUDE.md's
  Build + deploy section says to deploy with `npm run deploy` from a worktree that has `pa-pseudocode/`
  populated.
- **No silent test skips.** `test-attempt-reveal.mjs` needs an in-memory SQLite (`bun:sqlite`, or
  `node:sqlite` on Node >= 22.5, `scripts/lib/sqlite-adapter.mjs`) and FAILS without one unless
  `ALLOW_SKIP_SQLITE=1`. It passes on both engines under Bun; real Node was not available to run it.
