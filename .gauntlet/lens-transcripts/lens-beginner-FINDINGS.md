# CS-STUDENT-BEGINNER LENS — Chapter 2 Assessment Findings

Working dir: /home/shuff57/Documents/GitHub/shCode-cs3d
Dev server: http://127.0.0.1:3002 (role=student)
Identity: cookie `dev_student=beginner` (email presented: beginner)
Screenshots: /tmp/opencode/lens-beginner/

---

## Lesson 1 — /lesson/2-6-1-ch2-group-pa-design-chart — PASS

- Loads and renders title, prose, React Flow diagram editor, toolbar (Start/End, Task, Decision, Input/Output, + more shapes), Check my diagram / Submit / Save draft. Screenshot: `L1-01-loaded.png`.
- Built a legal 9-shape chart (Start, INPUT n, SET count, loop hexagon, decision, CONTINUE, FLIP, REPORT, End) with 9 arrows. Checker reported **11 / 11 checks passed**. Screenshot: `L1-02-checked.png`.
- Submitted; page auto-advanced to 2.6.2. Screenshot: `L1-03-submitted.png`.
- Reload of 2.6.1 shows the chart persisted and lesson marked `1/3 · 33%`; `/api/lesson-state` shows `"2-6-1-...":"completed"`. Server-side lock confirmed. Screenshot: `L1-05-back-to-2-6-1.png`.
- **Gate verified**: before submitting 2.6.1, `/lesson/2-6-2-ch2-group-pa-build` rendered "Lesson locked — Finish the prior lessons in this module to unlock this one." Screenshot: `gate-2-6-2-before.png`.
- MINOR: The lesson prose says "get all ten checks green" (intro) but the checker runs **11** checks ("Flowchart structure — 11 / 11 checks passed"). The prose also says "Ten checks run". Off-by-one in the lesson text vs the checker. Evidence: `L1-check.txt` line "Flowchart structure — 11 / 11 checks passed"; `L1-01-loaded.txt` "get all ten checks green".
- MINOR: The lesson says "Five shapes" and lists a hexagon for loop setup, but the toolbar initially shows only four buttons; the hexagon is hidden behind "+ more shapes". A first-month student following the text ("Five shapes") may not find the hexagon. Evidence: `recon-1-more-shapes.png`, toolbar buttons before/after "+ more shapes".
- MINOR: The pseudocode block in Step 2 is Locker-Sweep-specific even though the student is told to pick one of four problems; a student who picks Word Audit / Savings Run / Coin Drawer gets a pseudocode template that does not match their problem. Evidence: `L1-01-loaded.txt` Step 2 block.
- MINOR: The checker's "Uses at least eight flow shapes" requirement is not stated anywhere in the lesson text (the text only says "at least two task rectangles" and "at least one decision diamond"). A student can pass the stated requirements and still fail the hidden 8-shape check. Evidence: `L1-check-default.txt` "Uses at least eight flow shapes — Needs at least 8 shapes".

---

## Lesson 2 — /lesson/2-6-2-ch2-group-pa-build — PASS

- Loads with a CodeMirror editor, a 10-item requirements checklist, Run / Reset / Commit / History, and the chart from 2.6.1 rendered above. Screenshot: `L2-01-loaded.png`.
- Wrote JS satisfying all 10 checklist items; after pressing **Run** the checklist cleared ("Still needed" gone) and Submit enabled. Output: `North Bank locker 7 is open`. Screenshot: `L2-06-run.png`.
- Submit opens a "Confirm Submission" modal listing all 10 items as Complete; clicking Confirm advanced to 2.6.3 and `/api/lesson-state` shows `"2-6-2-...":"completed"`. Screenshots: `L2-08-confirm-modal.png`, `L2-09-confirmed.png`.
- MINOR: The checklist only re-evaluates on **Run**, not on typing. A student who types correct code and clicks Submit without running sees a stale "Still needed" list and a disabled Submit. Evidence: `L2c.mjs` — after typing, checklist unchanged; after Run, all passed.
- MINOR: The lesson text says "STEP 3: Build the program under the chart it came from" but the starter file's STEP 3 comment is the last line; there is no explicit instruction that the checklist is the grading contract or that Run is required to refresh it.

---

## Lesson 3 — /lesson/2-6-3-ch2-group-pa-demo — PASS (grader unavailable)

- Loads as an Assignment page with a single response textarea and "Submit for feedback". Screenshot: `L3-01-loaded.png`.
- Wrote a full 6-part response; Submit enabled; submitted. Screenshot: `L3-03-graded.png`.
- **AI grader failed**: on-screen error "Grader returned a non-JSON response (HTTP 404). Ask your teacher — the Ollama key or endpoint may not be configured. Your answer has been saved and sent to your teacher for marking." The lesson still marked complete (`3/3 · 100%`) and `/api/lesson-state` shows `"2-6-3-...":"completed"`. Evidence: `L3-graded.txt`.
- Reload shows the response persisted and the lesson complete. Screenshot: `L3-04-reload.png`.
- MAJOR: The lesson body numbers its sections "Part 1, Part 2, Part 3 (One thing you logged), Part 3 (Lifecycle), Part 4, Part 5" — **two sections are both labelled "Part 3"**, and the body's Part 4/Part 5 correspond to the rubric's Part 5/Part 6. A student following the body numbering will mislabel their answers. Evidence: `L3-loaded.txt` (body) vs the rubric block (Part 5 checklist, Part 6 extension).
- MINOR: The rubric says "You can revise and resubmit as many times as you want" but the page shows no resubmit affordance after submitting (only the saved response). Evidence: `L3-reload.txt`.

---

## Lesson 4 — /lesson/2-7-1-ch2-individual-pa-concepts — PASS

- Loads 8 questions: 3 concept (`c1-if-decides`, `c2-switch-equality`, `c3-loop-shapes`) + 5 traces (`a-t1..a-t5`). Screenshot: `L4-01-loaded.png`.
- Raw HTML scan for `"answer"`, `"pattern"`, `"prompt"`, `answer:`, `pattern:`, `prompt:`, `correctAnswer`, `correct:`, `rubric` — **none found**. The embedded quiz JSON has only `id`, `question`, `options`, `code`, `variant`; no answer key. Evidence: `L4-quiz.json`.
- Options are shuffled per student and stable across reloads: `beginner` vs `otherstudent` differ; `beginner` reload is identical. Evidence: `L4-shuffle2.mjs` output.
- No positional wording ("first option", "option A", etc.) in the rendered text; the only "answer A" regex hit was the false positive "Answer all 8". Evidence: `L4-recon2.mjs`.
- Answered all 8 and submitted. **No score, no per-question marking, no explanations appeared**; page advanced to 2.7.2. Screenshot: `L4-04-submitted.png`.
- Reload of 2.7.1 shows "Submitted" and no score. Server-side lock confirmed. Screenshot: `L4-05-reload.png`.
- MINOR: The quiz JSON contains 18 questions (3 concept + 15 traces across variants a/b/c) but the page renders only 8. This is by design (variant selection) but means the "8 questions" count is a per-student subset; not a defect, noted for completeness.

---

## Lesson 5 — /lesson/2-7-2-ch2-individual-pa-own-words — FAIL (CRITICAL)

- Loads 3 short-answer questions (for vs while 4pts, === vs == 3pts, throw vs console.log 3pts) with one response textarea. Screenshot: `L5-01-loaded.png`.
- **CRITICAL (dev server) — cross-student submission leak / global summative lock.** The page shows "Submitted. Your answer is with your teacher. Nothing is marked here and this one does not reopen" for `beginner`, who never submitted this lesson. The only 2.7.2 submission in the dev store belongs to student `adv-attack`. A brand-new student `lensfresh1` who completed 2.7.1 and then opened 2.7.2 also immediately saw "Submitted" with an empty textarea and no submit button. Evidence:
  - `curl /api/lesson-submissions?lessonId=2-7-2-ch2-individual-pa-own-words` with cookie `dev_student=beginner` returns `adv-attack`'s response.
  - `L5-03-fresh-student.png` — fresh student, empty textarea, "Submitted" disabled.
  - `/api/lesson-state` for `beginner` shows `"2-7-2-...":"started"` (not completed), yet the page renders the submitted lock.
  - The dev submissions endpoint is not filtered by the requesting student: `beginner`, `brandnewstudent123`, and `anothernew456` all receive the same `adv-attack` submission.
  - **Root cause (dev only):** `server.js:282-285` — the dev stub `GET /api/lesson-submissions` filters only by `lessonId`, never by `devIdentity(req)`. The production Pages Function `functions/api/lesson-submissions/index.ts:42-46` **does** filter `WHERE student_email = ? AND lesson_id = ?`, so this specific leak is a dev-server-only divergence. The client (`lib/written-grader-store.ts` `fetchSubmissions` → `LessonWorkspace`/`WrittenGrader`) treats "any submission returned" as "already submitted", so the unfiltered dev response produces the global lock.
- Impact (dev): (a) privacy — one student's written answer is served to every other student; (b) assessment integrity — a student is locked out of their own summative written response because a different student submitted first. Production is not affected by this particular route, but the dev path is what the task asked to check and it is broken.
- MINOR: The page's "Submitted" state is derived from the submissions list rather than the per-student lesson state, which is why the lock is global when the list is unfiltered.

---

## Lesson 6 — /lesson/2-7-3-ch2-individual-pa-find-and-fix — FAIL (CRITICAL)

- **CRITICAL — the lesson is impossible to complete: the starter `script.js` is missing.** The page opens with the editor showing `content.md` (the lesson prose) and no `script.js`. All five requirements in `lesson.json` target `file: "script.js"` (`r1`–`r5`), and the lesson text says "Four broken programs … fix it" and "Above each fix, write a comment". A student has no `script.js` to edit, no way to create one (the File tab only offers Upload/Download of `content.md`; uploading a `script.js` replaces the editor buffer but the file name stays `content.md`), and the checker can never see a `script.js`.
  - Evidence: `lessons/2-7-3-ch2-individual-pa-find-and-fix/` contains only `content.md`, `lesson.json`, `solution.js` — no `index.html`, `style.css`, or `script.js`, even though `lesson.json`'s `files` array declares all three. Compare `lessons/2-6-2-ch2-group-pa-build/` which correctly ships `index.html`, `script.js`, `style.css`.
  - Evidence: `functions/_shared/lesson-starters.generated.ts` line 299 — the generated starters bundle for 2-7-3 contains only `{"content.md": ...}`; the 2-6-2 entry contains `index.html`, `style.css`, `script.js`.
  - Evidence: `L6-02-loaded.png` (editor shows `content.md`), `L6-06-file-tab-dom.png` (File tab lists only `content.md`), `L6-08-uploaded.png` (after uploading a `script.js`, editor file name still reads `content.md`).
- **CRITICAL — Run does nothing.** Pressing `▶ Run` on the broken while-loop produces no output, no error, and no network request; the Output pane stays "Click Run to see output." The required timeout message ("Your code was still running after 3 seconds, so it was stopped.") never appears because no code is executed. Evidence: `L6-run-instrumented.txt` — Output region is exactly `"Output\nClick Run to see output."`; instrumented run (`L6-run3.mjs`) logged zero API requests and zero console errors on Run.
- **CRITICAL — the forbidden diagnosis sentence ships in the client JS bundle loaded by the 2.7.3 page (dev AND production).** The raw HTML and rendered body do not contain it, but the page loads `/_next/static/chunks/app/lesson/[lessonId]/page.js`, and that chunk **does** contain "check that the value in the condition actually changes". A student can read it via View Source / devtools. Evidence: `L6-bundle-scan.mjs` — `CHUNKS CONTAINING FORBIDDEN SENTENCE: [".../app/lesson/%5BlessonId%5D/page.js"]`.
  - Root cause: `components/LessonWorkspace.tsx:403-408` builds the timeout message as `summative ? "…stopped." : "…stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop."`. The sentence is suppressed **on screen** for summative lessons (2.7.3 has `grading.summative: true`), but the full string is still compiled into the shipped bundle. The same string also appears in `components/DocLiveSnippet.tsx:59`, `components/LiveCodeBlock.tsx:104`, `components/SandboxWorkspace.tsx:174`, and `lib/js-docs.ts:441`.
  - **Production confirmed**: the built `out/` bundle `out/_next/static/chunks/3727-11f51e78bf3ab8a1.js` contains the full ternary with the forbidden sentence, and that chunk is referenced by **all five** built 2.7 pages (`out/lesson/2-7-*/index.html`). So this is not a dev-only artifact — the answer is in the shipped JS on every 2.7 page. Evidence: `grep -c "3727-11f51e78bf3ab8a1"` = 2 for each of the five built pages; `grep -l "condition actually changes" out/_next/static/chunks/3727-*.js` matches.
  - Confirmed the mechanism on a non-summative lesson: running the Bug 4 broken while-loop on 2.6.2 produced the full message including the forbidden sentence. Evidence: `timeout-message-test.txt` — `FORBIDDEN SENTENCE PRESENT: true`.
- **CRITICAL — the required stop message never appears on 2.7.3.** Because Run does nothing (no `script.js`), the console never says "Your code was still running after 3 seconds, so it was stopped." The Output pane stays "Click Run to see output." Evidence: `L6-run-banner.txt` — Output is exactly `"Output\nClick Run to see output."`; `runtimeError banner: none`.
- **PASS (partial) — no regex/answer leakage in the requirements payload.** All five requirements carry `"pattern":"$undefined"` (the regex is not shipped to the client). Evidence: `L6-source.html` requirement entries.
- MAJOR: The lesson text describes four bugs (Bug 1 syntax, Bug 2 runtime, Bug 3 logic, Bug 4 logic) but the page never renders the four broken programs as editable code — they appear only as fenced code blocks inside `content.md`. A student cannot "fix" a code block in a markdown file and have the checker see it.
- MINOR: The lesson description in the RSC payload says "the checklist shows which symptom remains", but no checklist is rendered on the page (the requirements panel is absent because there is no `script.js` to evaluate).
- NOTE: 2.7.3 was locked behind 2.7.2, which itself cannot complete because of the Lesson 5 leak. I unblocked it only by POSTing `{"state":"completed"}` to `/api/lesson-state/2-7-2-...` via the app's own API, purely to reach 2.7.3 for testing. A real student cannot get past 2.7.2 at all.

## Lesson 7 — /lesson/2-7-4-ch2-individual-pa-chart-it — PASS (with contradictions)

- Loads with the React Flow diagram editor, the five-shape toolbar, Check my diagram / Submit / Save draft. Screenshot: `L7-01-loaded.png`.
- Built a legal 9-shape chart (Start, INPUT, SET remaining, loop hexagon, decision, two task rectangles, REPORT, End) with 9 arrows. Checker reported **11 / 11 checks passed**. Screenshot: `L7-03-seeded.png`.
- **Unlimited attempts confirmed**: pressed Check my diagram twice in a row, both returned 11 / 11 with no penalty or lockout. Evidence: `L7-check1.txt`, `L7-check2.txt`.
- Checker shows **legality only** (structural checks: one Start, one End, labels, floating shapes, ≥2 rectangles, ≥1 diamond, two exits, labelled exits, path from Start to End, ≥8 shapes, no self-arrow). It does not compare against a model answer. Evidence: `L7-check-default.txt`.
- Submitted; advanced to 2.7.5; `/api/lesson-state` shows `"2-7-4-...":"completed"`. Screenshot: `L7-05-submit-click.png`.
- Reload shows the chart persisted and progress `4/5 · 80%`; server-side state is `completed`. Screenshot: `L7-07-reload-submitted.png`.
- MAJOR: The lesson text contradicts the page. It says "The chart is hand-drawn on paper, then you submit a photo/scan. **The in-app checker is not used here** -- the teacher grades by eye", yet the page renders the in-app diagram editor with a working "Check my diagram" button and a Submit that unlocks the next part. A student is told not to use the tool that is the only way to complete the lesson. Evidence: `L7-loaded.txt` vs `L7-01-loaded.png`.
- MAJOR: Check-count mismatch. The intro says "All **ten** checks must pass"; the body says "the same **eight** structural checks the app uses. All eight must pass"; the checker actually runs **11** checks ("Flowchart structure — 11 / 11 checks passed"). Three different numbers for the same checker. Evidence: `L7-loaded.txt`, `L7-check-default.txt`.
- MINOR: After submitting, reloading 2.7.4 shows no explicit "Submitted" banner and the Submit button is still enabled (unlike 2.7.1/2.7.2 which show "Submitted"). The server-side state is `completed`, so the lock is real, but the UI gives no confirmation. Evidence: `L7-reload2.txt` — `Submit disabled: false`, `submitted banner: none`.
- MINOR: The lesson says "The double-rail ([[ ]]) and connector/comment shapes are not released and must not appear", but the toolbar's "+ more shapes" menu offers **Connector** and **Note** shapes. A student can add a forbidden shape from the toolbar. Evidence: `L7-01-loaded.txt` toolbar list.

## Lesson 8 — /lesson/2-7-5-ch2-individual-pa-write-the-steps — FAIL (CRITICAL, same leak)

- Loads as an Assignment page with the three problems (Seat Map, Word Grid, Fuel Log), the rules, and a single response textarea. Screenshot: `L8-01-loaded.png`.
- **No Run button confirmed** (correct per spec): zero occurrences of "▶ Run" in the rendered page. Evidence: `L8-loaded.txt` (`grep -c "▶ Run"` = 0).
- **CRITICAL (dev server) — same cross-student submission leak as 2.7.2.** The page shows "Submitted. Your answer is with your teacher. Nothing is marked here and this one does not reopen" for `beginner`, who never submitted 2.7.5. The only 2.7.5 submission in the dev store belongs to `adv-p45`. A fresh student `lensfresh3` who completed 2.7.4 and then opened 2.7.5 also immediately saw "Submitted" with an empty textarea and no submit button. Evidence:
  - `curl /api/lesson-submissions?lessonId=2-7-5-ch2-individual-pa-write-the-steps` with cookie `dev_student=beginner` returns `adv-p45`'s response.
  - `L8-02-fresh-leak.png` — fresh student, empty textarea, "Submitted" disabled.
  - `/api/lesson-state` for `beginner` shows `"2-7-5-...":"started"` (not completed), yet the page renders the submitted lock.
  - Same root cause as Lesson 5: `server.js:282-285` dev stub does not filter by student; production `functions/api/lesson-submissions/index.ts` does.
- Impact: identical to Lesson 5 — privacy leak of one student's written code to every other student, and a global lock that prevents a student from submitting their own summative response.
- MINOR: The lesson text says "write the JavaScript" and "A single JavaScript program (one file...)", but the page provides a plain prose textarea ("Your response", "Write your response here. Full sentences preferred.") rather than a code editor. The AI-grader rubric block is also shown, which is the written-response template, not a code template. Evidence: `L8-loaded.txt`.

## View Source scan (all 2.7 pages) — PASS

Scanned the raw HTML of all five 2.7 pages (dev server, `page.content()` after full render) for `"answer"`, `"pattern"`, `"prompt"`, `answer:`, `pattern:`, `prompt:`, `correctAnswer`, `correct:`, `rubric`, `explanation`, `answerKey`, `correctIndex`, and the forbidden diagnosis sentence.

- **No `"answer"`, `"pattern"`, or `"prompt"` keys anywhere** on any 2.7 page (counts all 0). Evidence: `viewsource-scan.mjs` output; saved sources `source-2-7-*.html`.
- **No regex text leaked**: every requirement in 2.7.3 carries `"pattern":"$undefined"` (the regex is not shipped to the client). Evidence: `L6-source.html`.
- **No rubric text leaked**: the `aiGrader` payload on 2.7.2 and 2.7.5 is `{"summative":true,"rubricTitle":"...","model":"...","rubric":[]}` — the `rubric` array is empty; only the human-readable title ships. Evidence: extracted `aiGrader` JSON.
- **Forbidden diagnosis sentence absent from the raw HTML** on every 2.7 page (including 2.7.3). Evidence: `viewsource-scan.mjs` — `forbidden sentence: false` for all five.
- **BUT the forbidden sentence IS present in the JS bundle** loaded by every 2.7 page (dev and production) — see the Lesson 6 CRITICAL finding. The raw-HTML scan alone would miss it; the bundle scan (`L6-bundle-scan.mjs`) catches it. This is the one leak the "search the raw HTML" instruction does not surface.
- The only "rubric"/"explanation" string hits are prose in the lesson body ("no explanations shown", "graded down on the rubric") and the `rubricTitle` field — not answer keys.
- NOTE: the 2.7.1 quiz JSON (18 questions across variants a/b/c) ships `id`, `question`, `options`, `code`, `variant` only — no answer key. Evidence: `L4-quiz.json`.

---

# SUMMARY

| # | Lesson | Verdict | CRITICAL | MAJOR | MINOR |
|---|--------|---------|----------|-------|-------|
| 1 | 2.6.1 design-chart | PASS | 0 | 0 | 4 |
| 2 | 2.6.2 build | PASS | 0 | 0 | 2 |
| 3 | 2.6.3 demo | PASS (grader 404) | 0 | 1 | 1 |
| 4 | 2.7.1 concepts quiz | PASS | 0 | 0 | 1 |
| 5 | 2.7.2 own-words | FAIL | 1 | 0 | 1 |
| 6 | 2.7.3 find-and-fix | FAIL | 3 | 1 | 1 |
| 7 | 2.7.4 chart-it | PASS | 0 | 2 | 2 |
| 8 | 2.7.5 write-the-steps | FAIL | 1 | 0 | 1 |
| — | View Source scan | PASS (HTML) / FAIL (bundle) | — | — | — |
| **TOTAL** | | **5 PASS / 3 FAIL** | **5** | **4** | **13** |

## The five CRITICAL findings

1. **2.7.3 is impossible to complete** — the starter `script.js` is missing from disk; only `content.md` ships, while all 5 requirements target `script.js`. No way to create it from the UI.
2. **2.7.3 Run does nothing** — no output, no error, no network request; the required 3-second stop message never appears.
3. **The forbidden diagnosis sentence ships in the JS bundle** on every 2.7 page (dev and production, chunk `3727-*`), even though it is suppressed on screen for summative lessons.
4. **2.7.2 cross-student submission leak (dev)** — the dev stub returns every student's submission, so a student who never submitted sees "Submitted" and is locked out.
5. **2.7.5 cross-student submission leak (dev)** — same root cause as #4.

## Blocking chain

2.7.2 cannot complete (leak #4) → 2.7.3 stays locked → 2.7.3 cannot complete (missing starter #1) → 2.7.4 stays locked. A real student is stopped at 2.7.2 and can never reach 2.7.3–2.7.5. I reached 2.7.3–2.7.5 only by POSTing `{"state":"completed"}` to `/api/lesson-state/<id>` via the app's own API, purely to test them.

## What passed cleanly

- 2.6.1 gate on 2.6.2 (locked until 2.6.1 submitted) — verified.
- 2.6.1/2.6.2/2.7.4 server-side completion locks — verified by reload + `/api/lesson-state`.
- 2.7.1: 8 questions (3 concept + 5 traces), per-student seeded shuffle stable on reload, no score/marking shown, no positional wording, no answer key in the payload.
- 2.7.4: unlimited checker attempts, legality-only checks, 11/11 on a legal chart.
- 2.7.5: no Run button (correct).
- Raw-HTML scan: no `"answer"`, `"pattern"`, or `"prompt"` keys; no regex text; empty `aiGrader.rubric`.
