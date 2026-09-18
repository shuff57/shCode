# Teacher-critic pass — modules 2.6 and 2.7

Reviewer role: the person who has to run these two periods with 30 teenagers.
Worktree: `/home/shuff57/Documents/GitHub/shCode-cs3d` (branch `cs-3d`).
Reviewed: `curriculum/modules/2.6_ch2-group-pa.md` (253 lines) and
`curriculum/modules/2.7_ch2-individual-pa.md` (386 lines), both `status: draft`,
both untracked. Note: both files were edited on disk at 06:39 during this pass
(2.6 grew 229→253 lines, 2.7 grew 376→386); every line number below is against
the current on-disk version.

---

## 1. The one that mattered

**2.7.3's answer key will ship in View Source, and the redaction layer that
closed the a6006dd5 leak does not cover it.**

`lib/quiz-redact.ts`'s `redactLessonForClient()` handles exactly two things —
`quiz` and `aiGrader`:

```
lib/quiz-redact.ts:84-93
  export function redactLessonForClient(lesson: Lesson): Lesson {
    let out = lesson;
    if (isSummativeQuiz(out.quiz)) { out = { ...out, quiz: redactQuiz(...) }; }
    if (isSummativeAiGrader(out.aiGrader)) { out = { ...out, aiGrader: redactAiGrader(...) }; }
    return out;
  }
```

It never touches `lesson.requirements`. But `LessonWorkspace` is a client
component that receives the whole `Lesson` object and reads
`lesson.requirements`:

```
components/LessonWorkspace.tsx:1     'use client';
components/LessonWorkspace.tsx:47-48 interface LessonWorkspaceProps { lesson: Lesson; ... }
components/LessonWorkspace.tsx:554   lesson.requirements,
components/LessonWorkspace.tsx:560   lesson.requirements.map((r) => ({ ...r, ...report.results... }))
components/LessonWorkspace.tsx:571   lesson.requirements,
```

and the assignment route hands it the redacted lesson:

```
app/assignment/[id]/page.tsx:35  const forClient = redactLessonForClient(lesson);
app/assignment/[id]/page.tsx:38  <LessonWorkspace lesson={forClient} mode="assignment" />
```

`lib/lessons.ts:89` builds `requirements` from `meta.requirements`, so every
`Requirement` field — including `pattern` — is in the object that crosses the
`'use client'` boundary and is serialised into the RSC payload. This is the
identical mechanism `lib/quiz-redact.ts:4-18` describes for the quiz leak.

**The patterns are the answer.** On the Chapter 1 Find-and-Fix that 2.7.3 is
modelled on, `lessons/1-7-3-ch1-individual-pa-find-and-fix/lesson.json:41-98`
encodes all four fixes as regexes:

| Req | Line | Pattern (abridged) | What it hands over |
| --- | --- | --- | --- |
| r1 | 48 | `let\s+itemName\s*=\s*(?:"[^"\n]*"\|'[^'\n]*'\|`[^`\n]*`)\s*;` | the starter's `"Notebook;` must be closed — bug 1's fix |
| r2 | 60 | `^(?![\s\S]*\bbeforTax\b)(?=[\s\S]*\btotal\s*=\s*(?:beforeTax\s*\+\s*tax\|tax\s*\+\s*beforeTax))` | `beforTax` is the typo and the fix is `beforeTax` — bug 2 |
| r3 | 71 | `(?:let\s+shipping\s*=\s*5\s*;\|beforeTax\s*=\s*[^;\n]*Number\s*\(\s*shipping\s*\))` | `shipping` must be the number `5`, not `"5"` — bug 3 |
| r4 | 82 | `^(?![\s\S]*\bcount\s*=\s*2\b)(?=[\s\S]*\b(?:let\|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*2\s*;[\s\S]*\bwrapFee\s*=[^;\n]*(?<![A-Za-z0-9_$])\1(?![A-Za-z0-9_$]))` | `count` must not be reassigned to 2 and `wrapFee` must use the new variable — bug 4 |

A student who opens View Source on `/assignment/1-7-3-.../` gets the corrected
line for bug 1 verbatim, the corrected value for bug 3, and the exact shape of
the fixes for bugs 2 and 4. That is the answer key, on a summative part with no
retake.

**No check catches it.** `scripts/check-quiz-key-leak.mjs:52-53` only collects
lessons where `lesson.quiz?.summative` or `lesson.aiGrader?.summative` is set:

```
scripts/check-quiz-key-leak.mjs:52  if (lesson.quiz?.summative) summative.push(...)
scripts/check-quiz-key-leak.mjs:53  if (lesson.aiGrader?.summative) summative.push(...)
```

A `grading.summative` lesson (which is what 2.7.3 is, per 2.7's own table at
line 204) is never collected, and the check has no notion of `requirements` at
all. `scripts/check-summative-parts.mjs` only checks that the flag is *set*, not
that the key is withheld. So the guard that exists for the quiz/rubric leak has
a blind spot exactly where 2.7.3 lives.

**This is live today on 1.7.3, and 2.7.3 will inherit it.** 1.7.3 is
`"type": "assignment"` (lesson.json:5), so `lib/lesson-href.ts` sends students
to `/assignment/`, the route that calls `redactLessonForClient` — which is a
no-op for requirements. 2.7.3 is specified as the same Find-and-Fix shape
(2.7 lines 67, 204) and will be authored the same way.

**Fix.** Extend `redactLessonForClient` to strip `pattern` (and `expected`,
`testFn`, `expect`) from a `grading.summative` lesson's requirements before the
client boundary, and teach `check-quiz-key-leak.mjs` to collect
`grading.summative` lessons and scan the built page for each requirement's
`pattern`. The `description`/`title`/`hint` fields are the checklist the student
is meant to see and must stay. This is the same shape as the quiz fix: the
browser can no longer self-grade from the pattern, so the teacher reads the
submission (which 2.7 already says happens — "shCode records the work; it does
not compute the 100", line 292).

**Secondary, same class:** `redactLessonForClient` also does not handle
`diagram.aiGrader` (`lib/diagram-types.ts:184-190`). No summative diagram
currently carries one (1-7-4 has none), but `2-2-12-a5-2-flowchart-decision`
does, and if 2.7.4 is given one its `prompt`/`rubric` ships unredacted.
`check-quiz-key-leak.mjs` has the same blind spot (it checks `lesson.aiGrader`,
not `lesson.diagram.aiGrader`).

---

## 2. PASS/FAIL per area

### Area 1 — The day itself: **FAIL**

- **2.6's 105 minutes** (lines 73-79) are fully allocated: 0-8 form/pick,
  8-33 design, 33-75 build, 75-95 demo, 95-105 slack. But:
  - **A pair that finishes at minute 60 has nowhere to go.** The only guidance
    is "A pair that finishes early has not finished. Ask for an input that makes
    their loop run zero times" (lines 219-223). That is a question, not a
    destination, and it does not fill 35 minutes.
  - **The demo window is 20 minutes for 15 pairs.** "run the program for the
    teacher" (line 78) at 75-95 means ~80 seconds per pair if the teacher
    watches every one. There is no instruction to sample, to have pairs demo to
    each other, or to run demos in parallel. 1.6 has the identical window
    (1.6 lines 51) and the identical silence.
  - **No absent-partner instruction.** 2.6 is paired (line 12) and never says
    what a solo student does. 1.6 does not either (grep for
    absent/absence/odd/three-way across 1.6 and 2.6 returns nothing). **This is
    an inherited gap, not a new one.**
  - **No odd-numbered-class / three-way-group instruction.** Same: absent from
    both 1.6 and 2.6.
- **2.7's 53 minutes** (line 12) sit inside a 105-minute block. Line 81-82 says
  "the leftover is the next chapter's first lesson either way." The calendar
  does not agree: `curriculum-plan.md:2639-2641` puts the Ch 2 Test on Wed Sep
  30 and §3.1 on Fri Oct 02. So on Sep 30 there are ~52 unscheduled minutes and
  no lesson to put in them. The plan's common format
  (`curriculum-plan.md:3186`) says "The remaining period time is the next
  chapter's first lesson", but the calendar schedules that lesson two days
  later. **The doc asserts a plan convention the calendar contradicts.**
- **Absence on 2.7** is explicitly deferred: "An absence remains a teacher
  judgement each time rather than a policy the app enforces" (lines 311-312).
  That is honest, but it is the same non-answer 1.7 gives (1.7 lines 177-179),
  and it leaves the teacher improvising on the day.

### Area 2 — What has to exist before the bell: **FAIL**

Nothing for 2.6 or 2.7 exists yet. `ls -d lessons/2-6-* lessons/2-7-*` returns
"No such file or directory" for both. See the pre-flight checklist in §3 for
the itemised state. The build is roughly the size of the Chapter 1 pair: 8
lesson folders (2.6.1-3, 2.7.1-5), each with `lesson.json` + `content.md` (plus
`script.js`/`index.html`/`style.css` for the console lessons), 7 reference
solutions, the Ch 2 syntax reference, and the two new rule blocks.

### Area 3 — Integrity: **FAIL**

- The section "`summative` hides the key on screen; two other pieces keep it off
  the wire" (2.7 lines 231-265) is **accurate as far as it goes**:
  - `lib/quiz-redact.ts` does strip `answer`/`explanation`/`source` from a
    summative quiz and `prompt`/`contextDocs` from a summative `aiGrader`
    (verified, lines 47-77).
  - `scripts/score-quiz.mjs` does turn picks into marks from the source key
    (verified, lines 48-50, 90-95).
  - `fetchSubmissions` is called at `components/WrittenGrader.tsx:144` and is
    defined at `lib/written-grader-store.ts:50` (verified).
  - The server-page call sites are correct: `app/lesson/[lessonId]/page.tsx:46`
    and `app/assignment/[id]/page.tsx:35` (the doc cites line 8, which is the
    *import*; the call is at 46/35 — a minor citation slip).
- **But the section is incomplete in the way that matters.** It claims "Three
  pieces close that" and lists only quiz/aiGrader. It does not mention that
  `requirements[].pattern` is unredacted (finding §1), nor `diagram.aiGrader`.
  A reader of this section would conclude the leak class is closed. It is not.
- **The flowchart `solution/` directory does NOT leak.** Verified:
  `lib/lessons.ts:32-37` excludes `solution/` by name, and
  `scripts/check-solution-leak.mjs` measures it. `1-6-1`'s
  `solution/chart.mmd` text ("Is the cost per slice at or under") appears **0
  times** in `functions/_shared/lesson-starters.generated.ts` and **1 time** in
  `functions/_shared/solutions.generated.ts` (teacher-only). The pattern is
  sound.
- **2.6.1 has no redaction exposure.** It is a diagram lesson with no `quiz` and
  no `aiGrader`, so `redactLessonForClient` is a no-op for it, and its reference
  chart is protected by the `solution/` exclusion. The doc says nothing about
  this, and does not need to. The exposure is on 2.7.3, not 2.6.1.
- **The D1/D2 problem menu is not a leak.** It is in `content.md`, rendered to
  the student as the assignment; picking one is the task.
- **The 2.7.5 aiGrader rubric is covered** *if* 2.7.5 sets `aiGrader.summative`
  (the doc's table at line 206 says it will). `redactAiGrader` strips `prompt`
  and `contextDocs` and empties `rubric` (lines 69-77).
- **`check-summative-parts.mjs` is red right now** — verified, exit code 1, 25
  failures (20 in "2.1 Conditionals", 5 in "1.3 Documentation and Coding
  Conventions"). The doc says so at lines 356-366. The gate that is supposed to
  protect 2.7's five parts is 25 failures deep in noise.

### Area 4 — Grading afterwards: **FAIL**

- **2.6's three artifacts** live in three different lessons (2.6.1 chart, 2.6.2
  program, 2.6.3 demo writeup). The teacher gets them from the teacher view, but
  **there is no pair view.** `app/teacher/page.tsx:406`'s `StudentDrawer` is
  keyed by a single email (`app/teacher/page.tsx:425-426` fetches
  `/api/classes/{id}/students/{email}`), and a grep for
  `pairId|pair_id|partnerEmail|group_id|pairView` across `app/`, `components/`,
  `lib/`, `functions/` returns nothing. So a pair's work is read by opening two
  students separately and combining by hand. For 15 pairs that is 30 drawer
  opens across 3 lessons each.
- **2.7's Part A marks do not exist until a CLI step.** `score-quiz.mjs` must be
  run per lesson (`node scripts/score-quiz.mjs 2-7-1-...`). The doc says this
  (lines 254-256). The script's closing line is hardcoded to the wrong chapter:
  `scripts/score-quiz.mjs:143` prints "Each question is worth 5 points on the
  **Chapter 1 PA**: score x 5." The arithmetic happens to still hold for 2.7
  (8 questions × 5 = 40 = 15 + 25), but the label is stale and will mislead.
- **The full path from "period ends" to "a number in Aeries"** for 2.7 is:
  1. run `score-quiz.mjs` for 2.7.1 (Part A + B picks → right/asked);
  2. open the teacher page, open each student's drawer;
  3. read 2.7.1's raw JSON response for Part B (the drawer renders
     `sub.response` as preformatted text — for a quiz that is
     `{"answers":{...},"graded":true}`, not a readable paper);
  4. read 2.7.2's AI grade and 2.7.5's AI grade from the submission queue;
  5. read 2.7.3's submission (requirements-graded, 0 points, so the teacher
     assigns the 20 by hand);
  6. read 2.7.4's chart (diagram submission, 0 points, 10 by hand);
  7. combine 15+25+10+20+10+20 into one 100 and enter it in Aeries.
  That is 7+ manual steps per student, ×30 students, with no worksheet the app
  produces. The doc acknowledges "shCode records the work; it does not compute
  the 100" (line 292) but does not give the teacher a single view that adds it
  up.
- **2.6's manual path** is the same shape with no CLI step: open two students ×
  three lessons, read chart/program/demo, combine into one pair score, enter in
  Aeries.

### Area 5 — The gap between 2.6 and 2.7: **FAIL**

- **The instruction is incoherent.** 2.6 line 224: "Hand this back as the study
  guide on Sep 28." 2.7 line 316: "Hand the PA rubric back as the study guide on
  Sep 28." The PA is *sat* on Sep 28 (2.6 line 12). You cannot hand back graded
  work on the same day it is being produced, before it has been graded. The two
  docs also disagree on *what* is handed back — 2.6 says "this" (the PA), 2.7
  says "the PA rubric" — and neither artifact exists: there is no `rubrics/`
  directory in the repo, and the only rubric is the 2.6.3 `aiGrader` block in
  `lesson.json`, which is teacher-only via the solution endpoint.
- **This is inherited.** 1.6 line 183 and 1.7 line 183 have the same same-day
  instruction ("Hand the PA checklist back as the study guide on Sep 1", PA on
  Sep 1). 2.6/2.7 changed "checklist" to "rubric" and made the two docs
  disagree, but did not fix the timing.
- **Does it leak 2.7's content?** The two assessments deliberately share item
  types (2.7 lines 316-318: "Every item type here has an analogue in the program
  the pair built"). Handing back a worked chart + program + demo is a worked
  example of the test's item types. The doc calls this intentional and "not a
  secret". The direct-leak risk depends on whether the PA's specific problems
  (Locker Sweep / Word Audit / Savings Run / Coin Drawer, 2.6 lines 191-200) are
  the same as 2.7's D1/D2 menu — the docs do not say, and 2.7's menu is not
  written yet. **Unresolvable from the docs as they stand.**

---

## 3. Pre-flight checklist

Ordered as a teacher would run it. State is against the current tree.

| # | Item | State | Evidence |
| --- | --- | --- | --- |
| 1 | `lessons/2-6-1-*` (design chart) | **MISSING** | `ls -d lessons/2-6-*` → no such file |
| 2 | `lessons/2-6-2-*` (build) | **MISSING** | same |
| 3 | `lessons/2-6-3-*` (demo) | **MISSING** | same |
| 4 | `lessons/2-7-1-*` (concepts + traces, 3 forms) | **MISSING** | `ls -d lessons/2-7-*` → no such file |
| 5 | `lessons/2-7-2-*` (own words) | **MISSING** | same |
| 6 | `lessons/2-7-3-*` (find and fix) | **MISSING** | same |
| 7 | `lessons/2-7-4-*` (chart it) | **MISSING** | same |
| 8 | `lessons/2-7-5-*` (write it) | **MISSING** | same |
| 9 | 2.6.1 rule block: `min-nodes:8`, `min-process:2`, `min-decisions:1` | **MISSING** | 2.6 lines 166-177 specify it; no lesson.json exists |
| 10 | 2.7.4 rule block: same as 2.6.1 | **MISSING** | 2.7 lines 144-152 specify it |
| 11 | 2.6.1 `solution/chart.mmd` (hexagon form **and** tight-`while` form) | **MISSING** | 2.6 lines 250-253 require both; no folder |
| 12 | 2.6.2 `solution.js` | **MISSING** | no folder |
| 13 | 2.7.1 answer key (synthesised from lesson.json) | **MISSING** | no folder |
| 14 | 2.7.2 `solution/answer.md` | **MISSING** | no folder |
| 15 | 2.7.3 `solution.js` | **MISSING** | no folder |
| 16 | 2.7.4 `solution/chart.mmd` | **MISSING** | no folder |
| 17 | 2.7.5 `solution/answer.md` | **MISSING** | no folder |
| 18 | Ch 2 printed syntax reference (loops, `break`/`continue`, `switch`, `try`/`catch`, operators, shape table) | **MISSING** | 2.7 lines 154-159; no file anywhere in the repo (`find -iname '*syntax*reference*'` empty) |
| 19 | Open-date lock on module 2.6 (Mon Sep 28) | **UNVERIFIED** | set via `PUT /api/classes/[id]/open-dates`; no script, no D1 access from here |
| 20 | Open-date lock on module 2.7 (Wed Sep 30) | **UNVERIFIED** | same |
| 21 | `node scripts/check-summative-parts.mjs` | **EXISTS, RED** | exit 1, 25 failures (20 in 2.1, 5 in 1.3) |
| 22 | `node scripts/check-solution-leak.mjs` | **EXISTS, GREEN** | "180 solution.js + 12 solution/ checked, none leaked" |
| 23 | `node scripts/check-quiz-key-leak.mjs` | **EXISTS, NOT CHECKED** | needs `out/`; no `out/` in this tree |
| 24 | `node scripts/test-quiz.mjs` (form lengths) | **EXISTS** | will validate 2.7.1 once authored |
| 25 | `node scripts/check-diagram-solutions.mjs` | **EXISTS** | will validate 2.6.1/2.7.4 reference charts |
| 26 | `node scripts/check-starters.mjs` | **EXISTS** | will validate 2.6.2/2.7.3 references against requirements |
| 27 | 2.7.3 requirements redaction (finding §1) | **MISSING** | `lib/quiz-redact.ts` does not touch `requirements` |
| 28 | Aeries category decision | **UNRESOLVED** | 2.7 lines 338-348; two live schemes disagree |
| 29 | 2.7.5 code rubric authored | **MISSING** | first code rubric on a chapter test (2.7 lines 301-303) |

---

## 4. Breaks on the day

**B1 — 2.7.3's answer key is in View Source.**
Trigger: a student opens `/assignment/2-7-3-.../` and presses Ctrl-U.
Consequence: the four regex patterns name the four fixes; the Find-and-Fix part
(20 points, no retake) is defeated before the student types.
Fix: extend `redactLessonForClient` to strip `pattern`/`expected`/`testFn`/
`expect` from a `grading.summative` lesson's requirements, and extend
`check-quiz-key-leak.mjs` to collect `grading.summative` lessons and scan for
each pattern. Do this before authoring 2.7.3, not after.

**B2 — The 20-minute demo window cannot hold 15 pairs.**
Trigger: 75 minutes into 2.6, every pair wants the teacher to watch.
Consequence: either the teacher watches 80 seconds each and grades nothing
properly, or the window overruns into the 95-105 slack and the period ends with
pairs undemoed.
Fix: write the demo as a rotation (pairs demo to a neighbouring pair, teacher
samples 4-5) or move the demo to the start of the next period. 1.6 has the same
hole; fix it in both.

**B3 — A pair that finishes at minute 60 has no destination.**
Trigger: a strong pair clears build early.
Consequence: they sit idle or start the demo writeup early, and the "finishes
early has not finished" note is a question with no task behind it.
Fix: name a concrete extension in 2.6.2 (e.g. "add a second `switch` case and
re-run the zero-iteration input"), the way 1.6.2's step 7 names a concrete
re-run.

**B4 — An absent partner on Sep 28 has no policy.**
Trigger: one of a pair is out.
Consequence: the present student either does the whole PA solo (unfair to the
pair grade) or does nothing (loses the 25/50/25).
Fix: state the rule in 2.6 — e.g. "a solo student does all three thirds and the
demo names them as sole author; the pair grade is not affected." 1.6 inherits
the same gap.

**B5 — An odd-numbered class leaves a three-way group.**
Trigger: 29 students, or a pair plus one.
Consequence: no instruction for how a three-way group splits the 25/50/25 or
who drives.
Fix: state it in 2.6 (e.g. "a three-way group still produces one chart and one
program; the demo names all three and who drove which third").

**B6 — The ~52 minutes after the 2.7 test are unscheduled.**
Trigger: the test ends at minute 53 of a 105-minute block.
Consequence: the doc says the leftover is §3.1, but the calendar
(`curriculum-plan.md:2641`) puts §3.1 on Fri Oct 02. The teacher has no lesson
to run and no instruction.
Fix: either move §3.1 to Sep 30 in the calendar, or write what fills the second
half of Sep 30 into 2.7.

**B7 — "Hand back the study guide on Sep 28" cannot be done on Sep 28.**
Trigger: the teacher reads 2.6 line 224 / 2.7 line 316.
Consequence: the PA is being sat that day; there is nothing graded to hand back,
and no rubric artifact exists to hand out.
Fix: change both to "hand back the graded PA on Oct 1" (or the next meeting),
and author the rubric as a real handout. Decide whether the PA's specific
problems are the same as 2.7's D1/D2 menu; if they are, the study guide is a
direct leak.

**B8 — `check-summative-parts.mjs` is red, so the gate is noise.**
Trigger: a builder runs it before the day.
Consequence: 25 pre-existing failures hide a real miss on 2.7's five parts.
Fix: either stop marking module quizzes `quiz.summative` (2-1-39, 1-3-21) or
key the rule on the unit being a `N.6`/`N.7` assessment unit. 2.7 lines 356-366
already names both options.

**B9 — No pair view for 2.6 grading.**
Trigger: the teacher grades the PA.
Consequence: 30 drawer opens across 3 lessons, combined by hand, with no view
that shows a pair's chart + program + demo together.
Fix: add a pair-scoped view to `app/teacher/page.tsx` (or at minimum a
"combine these two students" affordance), or accept the manual cost and say so
in 2.6.

**B10 — `score-quiz.mjs` names the wrong chapter.**
Trigger: the teacher runs it for 2.7.1.
Consequence: the closing line says "Chapter 1 PA" (`scripts/score-quiz.mjs:143`),
which reads as a wrong-lesson warning on a high-stakes day.
Fix: make the line read the lesson's own title, or drop the chapter name.

**B11 — 2.6's rule-block survey is factually wrong.**
Trigger: a builder trusts 2.6 lines 159-160 ("`min-process: 3` exists in exactly
two lessons in the course and both are the Chapter 1 assessment").
Consequence: `3-4-20-chart-forms-comparison` also sets `min-process: 3`
(verified). The recommendation (use `min-process: 2`) is still right, but the
supporting claim is false and a builder may over-trust the survey.
Fix: correct the sentence to "three lessons" and add 3-4-20 to the table at
2.6 lines 149-157.

---

## 5. What I could not check

- **The built page.** No `node_modules` and no `out/` in this worktree, so I
  could not run `npm run build` and read the RSC payload. The §1 finding is
  proven from the code path (redaction function + client component + route),
  which is the same mechanism the repo already documented and fixed for the
  quiz/rubric leak. The built-page measurement is the confirmation step and
  should be run before the day: `npm run build && node
  scripts/check-quiz-key-leak.mjs` (after extending it to `grading.summative`).
- **The D1 open-date lock state.** It lives in D1 (`class_open_dates`); I have
  no database access from here. The docs say "keep the module locked until the
  period starts" (2.7 line 311) but there is no script or checklist item that
  sets it, and the lock is client-side only (`components/LessonAccessGate.tsx`,
  confirmed).
- **Whether 2.7's D1/D2 menu matches 2.6's menu.** 2.7's menu is not written
  yet, so the study-guide leak question in Area 5 cannot be answered from the
  docs.
- **The Aeries category.** Two live schemes disagree (2.7 lines 338-348); I
  cannot resolve which the district uses.
- **The Ch 2 syntax reference.** It does not exist in the repo, so I cannot
  check whether it would leak the hexagon or the `switch`/`try` syntax the test
  assesses. 2.7 says it "needs rebuilding" (line 154) but there is no source
  sheet to rebuild from.
- **Live submit behaviour.** No seeded student account, so the "one attempt"
  lock and the `fetchSubmissions` server check were read from code, not watched
  refuse a second submission. The a6006dd5 commit records the same limitation
  ("no live submit against a seeded student account").
