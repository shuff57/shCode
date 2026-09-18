# CS-STUDENT-ADVANCED LENS — Chapter 2 Assessment (2.6 / 2.7) Findings

**Lens:** strong 14-year-old, reads everything, adversarial.
**Server:** http://127.0.0.1:3002 (role=student, `dev_student=advanced`).
**Date:** 2026-09-18.
**Method:** Playwright (bunx) + direct execution of `lib/diagram-check.ts`, `lib/grader.ts`,
`lib/quiz-redact.ts` against the real lesson JSON; raw HTML + RSC payload extraction with
`curl` + Python; screenshots in `/tmp/opencode/lens-advanced/`.

**Headline:** the 2.7 paper is **not leak-free** (module pages ship the teacher doc), and
**2.7.3 is completely broken** — its editor opens `content.md`, its requirements are
redacted to `undefined` patterns, and the checklist goes all-green on garbage. Two 2.7.1
answer keys are wrong. 2.6.2's checklist is gameable. Details below.

---

## Per-lesson verdicts

| Lesson | Verdict | One-line |
|---|---|---|
| 2.6.1 Design the Chart | **FAIL** | 11 checks run, text says "ten"; no-hexagon chart passes all 11; unreleased shapes offered in palette |
| 2.6.2 Build It | **FAIL** | Checklist gameable (10/10 on a program that solves nothing); `n="abc"` slips the guard |
| 2.6.3 Demo It | **FAIL** | Duplicate "Part 3" heading; content.md Part numbering (1–5) disagrees with lesson.json prompt (1–6) |
| 2.7.1 Concepts and Traces | **FAIL** | Two wrong answer keys (`a-t3-fallthrough`, `b-t1-equality`); quiz reopens after draft deletion |
| 2.7.2 In Your Own Words | **PASS** | Server-side lock holds; no key leak; minor: "resubmit as many times as you want" copy contradicts summative |
| 2.7.3 Find and Fix | **FAIL (CRITICAL)** | Editor opens `content.md`; requirements redacted to `undefined` → all 5 pass on garbage; no script.js on disk |
| 2.7.4 Chart It | **FAIL** | Text says "eight checks" and "in-app checker is not used" — 11 checks run live; no-hexagon passes |
| 2.7.5 Write the Steps | **FAIL** | Three different point splits (lesson.json 8/9/3, prompt 8/12, answer.md 8/8/4); reference solution uses `switch (true)` the module says is not taught |

---

## CRITICAL

### C1. 2.7.3 Find and Fix is non-functional — editor opens `content.md`, checklist passes on garbage

**Evidence chain:**

1. `lessons/2-7-3-ch2-individual-pa-find-and-fix/` on disk contains only
   `content.md`, `lesson.json`, `solution.js`. There is **no `script.js`**.
2. The starter code lives only inside `lesson.json`'s `files[]` array
   (`"path":"script.js"`, 1279 chars). But `lib/lessons.ts:84` builds the client
   file map from **disk only** (`readFiles(base)`); it never reads `meta.files`.
   So the browser receives exactly one file: `content.md`.
3. In the browser the editor tab reads **`content.md`** and shows the markdown
   instructions, not the broken program. Screenshot: `273-probe.png`, `273-typed.png`.
4. `redactLessonForClient()` (correctly) strips `pattern` from a
   `grading.summative` lesson. The client therefore holds
   `pattern: undefined` for all five requirements (confirmed in the RSC payload:
   `"pattern":"$undefined"`).
5. `lib/grader.ts` `checkRegex()` does `new RegExp(req.pattern || '', ...)`.
   `new RegExp('')` matches **every** string. So all five requirements pass
   vacuously.

**Reproduced in-browser:** typed `this is not javascript at all` into the 2.7.3
editor, pressed Submit → dialog reads:

```
Submit Assignment
Complete
✓ Bug 1 — the program does not run at all — Complete
✓ Bug 2 — the program stops part way through — Complete
✓ Bug 3 — the savings total is wrong — Complete
✓ Bug 4 — the loop counter never advances — Complete
✓ All four bugs are named — Complete
```

Screenshot: `273-garbage-dialog.png`. Direct `grade()` reproduction:

```
=== grade() with REDACTED requirements (what the browser has) ===
  passed  r1 … passed  r5
all passed: true
new RegExp(undefined||'').test('garbage') = true
```

**Impact:** Part 3 of the Chapter 2 test (20 of 100 points) is unanswerable as
designed and unmarkable by the in-app checklist. A student who types nothing
still sees "Complete". The teacher's only signal is the raw submission text.

**Note:** the sibling `1-7-3` works because its `script.js` is on disk
(`fileName: "script.js"` confirmed in-browser). The 2.7.3 author put the starter
in `lesson.json` instead of on disk. `scripts/check-starters.mjs` already flags
this: `1 with a reference but no matching starter: 2-7-3-ch2-individual-pa-find-and-fix`.

**Also:** because the editor holds `content.md`, the Run button executes the
markdown as JS (no output). The module doc's own worry — that the 3s-kill
message hands over the repair — is moot here, but the underlying bug (C1) is
worse.

---

### C2. Module pages leak the full teacher doc in the RSC payload

`/module/2.6` and `/module/2.7` render the module markdown inside `<TeacherOnly>`,
which is a `'use client'` component that hides the content for students. But the
**HTML is server-rendered and serialised into the RSC payload before the client
gate runs**. A signed-out student can View Source and read the entire teacher
reference.

**Confirmed in the built output** (`out/module/2.7/index.html`) and live
(`raw-module-2.7.html`):

| Leaked string | What it gives away |
|---|---|
| `beforTax` | the exact typo in 2.7.3 Bug 2 |
| `the closed-string form the unterminated literal has to become` | 2.7.3 Bug 1 repair |
| `let shipping = 5;` — the corrected **value** | 2.7.3 Bug 3 repair |
| `truthiness trap` (×3) | 2.7.1 trace topics |
| `min-process`, `no-self-loop`, `min-nodes` | 2.6.1/2.7.4 rule internals |
| `switch (true)` is not taught | design rationale |

The 2.7 module doc even contains a table titled **"What View Source gives away"**
that enumerates the 2.7.3 answer key — and that table is itself in the payload.

**Root cause:** `app/module/[moduleId]/page.tsx` passes `html` (the rendered
module markdown) into the client tree unconditionally; `TeacherOnly` only
controls *display*, not *shipment*. This is the exact class of bug
`lib/quiz-redact.ts` was written to fix for lessons — but module pages were never
covered.

**Impact:** the 2.7.3 answer key (the part that is already broken) and the 2.7.1
trace topics are readable from the module page. The home page is clean
(`app/page.tsx`'s `forCards()` projection works — 0 hits for `"answer"`,
`beforTax`, `truthiness trap`).

Screenshots: `raw-module-2.7.html` (saved), `raw-module-2.6.html`.

---

## MAJOR

### M1. 2.7.1 has two wrong answer keys

Executed every trace snippet and compared to the keyed option:

| Question | Keyed answer | Actual output | Correct option |
|---|---|---|---|
| `a-t3-fallthrough` | `[0] "Intermediate"` | `Intermediate` **then** `Advanced` | `[1] "Intermediate then Advanced"` |
| `b-t1-equality` | `[0] "has crates"` | `empty` | `[1] "empty"` |

Both explanations are **correct** and contradict the key:

- `a-t3`: *"Case 2 matches and prints Intermediate, but its case has no break, so
  execution falls through into case 3 and prints Advanced too… Two lines, in that
  order."* → key should be option 1.
- `b-t1`: *"Loose equality converts false to the number 0, and 0 == 0 is true, so
  the if runs and prints empty."* → key should be option 1.

**Impact:** `scripts/score-quiz.mjs` marks against `q.answer`. Every student who
answers these two correctly is marked wrong. On a summative paper with no retake,
that is 10 of 100 points lost by the students who understood the material.
(The other 16 questions execute to their keyed answer.)

### M2. 2.6.2 checklist is gameable — 10/10 without solving anything

All ten requirements are independent regexes over `script.js`. A program that
satisfies every one but solves none:

```js
// Problem: nothing
// Partners: nobody
const XYZ = 1;
let s = "hi";
let num = 5;
if (num < 0) { throw new Error("nope"); }
for (let i = 0; i < 1; i++) {
  continue;
  break;
}
switch (s) {
  case "a": break;
  case "b": break;
  default: break;
}
console.log("done");
```

In-browser result: `STILL NEEDED: null`, `SUBMIT: {"disabled":false}`,
`OUTPUT: "done"`. Screenshot: `262-GAMEABLE-RUNNABLE.png`.

Specific weaknesses:

- **r7 and r8 overlap.** r7 = `\bcontinue\s*;`, r8 = `\b(break|continue)\s*;`.
  A single `continue;` satisfies both. The lesson text says "the brief forces a
  break or a second continue" — the regex does not.
- **r9 description ≠ r9 regex.** Description: *"A switch statement with at least
  three cases and a default, every case has a break."* Regex:
  `\bswitch\s*\([^)]*\)\s*\{[^}]*\bcase\b[^}]*\bbreak\s*;` — one case + one
  break passes. No default required, no three-case floor.
- **r3** `const\s+[A-Z][A-Z0-9_]{2,}\s*=` accepts `const XYZ = 1;` — any
  UPPER_SNAKE const, not the problem's limit.
- **r10** `throw\s+new\s+Error\s*\([^)]*\)` accepts a throw that can never fire.
- **r4/r5** accept any string/number variable, unrelated to the problem.

The task brief said "13 checks"; the lesson actually has **10** requirements
(`lesson.json` `requirements.length === 10`, description says "Ten checks"). The
gamability verdict stands regardless of the count.

### M3. 2.6.1 / 2.7.4 run 11 checks but the text says "ten" / "eight"

- 2.6.1 `lesson.json` has **11** rules; description says *"get all ten checks
  green"*; content.md says *"**Ten checks run**"*.
- 2.7.4 `lesson.json` has **11** rules; description says *"All ten checks must
  pass"*; content.md says *"the same **eight** checks"* and *"All eight must
  pass"*.

In-browser header reads **"Flowchart structure — 4 / 11 checks passed"** on both.
Screenshots: `diag-2.6.1-checks.png`, `diag-2.7.4-checks.png`.

### M4. 2.7.4 content says the in-app checker is not used — it is

`content.md`: *"The chart is hand-drawn on paper, then you submit a photo/scan.
The in-app checker is **not** used here -- the teacher grades by eye against the
same eight checks."*

But 2.7.4 is `preview: "diagram"` with a live `DiagramAssignmentView`: the
"Check my diagram" button runs all 11 checks in-browser, and Submit is gated on
them (except under `summative`, which allows hand-in). The lesson text describes
a paper workflow the app does not implement. This is the same plan-vs-shipped
divergence the module doc flags under "Still open", but it is stated to the
student as fact.

### M5. 2.7.5 has three mutually inconsistent point splits

| Source | Branch | Loop/nesting | Loop control | Total |
|---|---|---|---|---|
| `lesson.json` rubric | 8 | 9 | 3 | 20 |
| `aiGrader.prompt` | 8 | 12 (loop+nesting) | "counted inside criterion 2" | 20 |
| `solution/answer.md` | 8 | 8 | 4 | 20 |

The prompt explicitly says *"Criterion 2 -- the loop and its nesting (12 of the
20)"* and *"Criterion 3 -- loop control (counted inside criterion 2, not
separately)"*, while the rubric array it is paired with awards 9 + 3. The
answer key awards 8 + 4. An AI grader reading the prompt and a teacher reading
the rubric will not agree.

### M6. 2.7.5 reference solution uses `switch (true)`, which the module says is not taught

`curriculum/modules/2.6_ch2-group-pa.md` (Still open): *"**`switch (true)` is not
taught**, which is why every classification names three outcomes. Verified: the
string appears nowhere in `lessons/2-*`."*

`solution/answer.md` line 87: `switch (true) {`. The reference answer for the
summative coding item uses a construct the chapter explicitly does not teach.
The rubric's branch criterion also claims *"if/else if/else with `&&`"* full
credit, but the reference has `if` + `switch (true)` — no `else if` chain.

### M7. 2.7.1 quiz reopens after deleting the server draft

`QuizView` derives its lock from `graded` (localStorage) and the **draft**
(`fetchDraft`), not from submissions. `WrittenGrader` uses `fetchSubmissions`
for its lock; `QuizView` does not import it.

Reproduced: submit all 8 → `Submitted` (radios disabled) → `DELETE
/api/lesson-drafts/2-7-1-…` + `localStorage.clear()` → reload → button reads
**"Submit what I have (0 of 8)"**, all 32 radios enabled, 0 checked. Re-answered
and re-submitted; submission count went 3 → 4. Screenshots:
`271-draft-deleted-2.png`, `271-resubmit-2.png`.

**Impact:** a student can retake Part 1 (15 points) by clearing site data and
deleting the draft. The module doc claims the server lock closed this
("clearing site data, switching browser or opening a second device handed back
an unlocked Submit") — that fix landed on `WrittenGrader` only, not `QuizView`.

### M8. 2.6.2 guard does not catch non-numeric input

`if (n < 1) throw …` with `n = "abc"`: `"abc" < 1` is `false`, so the guard does
not fire; `1 <= "abc"` is `false`, so the loop runs zero times and the program
prints `open / Open: 0` with no error. Screenshot: `262-B-n__abc_.png`.

The lesson text says *"validate the one input that can be bad"* and the hint
says *"n must be at least 1"*. A string is a bad input the guard silently
accepts. (n=0, n=-1, n=0.5 all correctly throw.)

---

## MINOR

### m1. 2.6.3 has two "Part 3" headings

`content.md`: `### Part 3: One thing you logged` (line 25) and
`### Part 3: Lifecycle` (line 32). The lesson.json prompt numbers them 1–6
correctly. A student following the on-page headings sees two Part 3s and no
Part 6.

### m2. 2.6.3 content.md Part numbering (1–5) ≠ lesson.json prompt (1–6)

content.md ends at "Part 5: Extension"; the AI-grader prompt has six parts
(Part 6 = Extension). The rubric has six criteria. The on-page text is missing
the sixth heading.

### m3. 2.7.2 copy contradicts summative

`WrittenGrader` renders: *"You can revise and resubmit as many times as you
want."* On a `summative` item the button locks after submit and the panel says
*"this one does not reopen"*. The generic copy is shown before submit, so a
student is told the opposite of what will happen. (The lock itself works
correctly — server-side `fetchSubmissions` held across a fresh context and a
localStorage clear.)

### m4. Unreleased shapes are offered in the 2.6.1/2.7.4 palette

The "+ more shapes" palette offers **Function call** (`[[ ]]`), **Connector**
(`(( ))`), and **Note** — all explicitly "not released" for Chapter 2
(2.7.4 content: *"No `[[ ]]` double-rail, no connectors, no comments — not
released yet"*). The checker does not reject them (a chart using subroutine +
connector passed 10/11, failing only `min-process`). Screenshots:
`diag-2.6.1-palette.png`, `diag-2.7.4-palette.png`.

### m5. 2.7.3 r3/r4 regexes pass on the unfixed starter

Direct test against the starter text: r3 (`savings = savings + DEPOSIT` inside
the for) and r4 (`i++` inside the while) both **PASS** on the buggy starter,
because the regexes match the *presence* of the update, not its position
relative to `continue`. The checklist cannot distinguish the bug from the fix.
(Currently masked by C1, but it is a latent defect once C1 is fixed.)

### m6. 2.7.3 r5 requires the words but not the mapping

`r5` requires `syntax`, `runtime`, `logic` to appear in comments anywhere. It
does not require one per bug or the correct kind per bug. The lesson text says
*"four comments, one per bug"*; the regex accepts three words in one comment.

### m7. 2.6.1/2.7.4 no-hexagon chart passes all 11 checks

Confirmed by direct execution: a straight-line chart with a diamond and 8 shapes
passes every rule including `min-nodes: 8`, `no-self-loop`, and `reaches-end`.
The lesson text says *"A chart with no hexagon fails even if it is otherwise
perfect"* (2.7.4) — **false**. The module doc admits this ("no check will catch
it") but the student-facing text claims otherwise. The tight-while form
(diamond → body → back to diamond) also passes all 11; `no-self-loop` does not
trip because the back-edge targets the diamond, not the body.

### m8. 2.7.4 `min-nodes: 8` is trivially met by the starter + one shape

The starter is 2 shapes; adding a diamond, two rectangles, an io and an end
reaches 8 without a loop. `min-nodes` counts every flow shape, so it does not
enforce the loop the lesson says is "the point of this chapter".

---

## Integrity verdict

**NOT leak-free.**

- **Home page:** clean. `app/page.tsx`'s `forCards()` projection strips quiz,
  rubric, requirements and files. 0 hits for `"answer"`, `"explanation"`,
  `"prompt"`, `beforTax`, `truthiness trap`.
- **Lesson pages (2.7.1–2.7.5):** clean for quiz keys and aiGrader rubrics.
  `redactLessonForClient()` works: 2.7.1 ships no `"answer"`/`"explanation"`;
  2.7.2/2.7.5 ship `"rubric":[]` and no `"prompt"`; 2.7.3 ships
  `"pattern":"$undefined"`. `scripts/check-quiz-key-leak.mjs` reports
  `OK - 21 summative page(s) ship no answer key`.
- **Module pages (`/module/2.6`, `/module/2.7`):** **LEAK.** The full teacher
  module doc is in the RSC payload, including the 2.7.3 answer-key table
  (`beforTax`, the closed-string repair, `let shipping = 5;`), the 2.7.1 trace
  topics, and the rule internals. `TeacherOnly` hides it visually but ships it.
- **2.7.3 lesson page:** the requirements' `pattern` is correctly redacted, but
  the *starter code* is missing from disk, so the page is broken rather than
  leaky. The answer key is nonetheless readable from `/module/2.7`.

**Net:** a student who opens `/module/2.7` before the test can read the 2.7.3
repairs and the 2.7.1 trace topics. The lesson-level redaction is solid; the
module-level surface is not covered by any check.

---

## Checklist-gamability verdict (2.6.2)

**GAMEABLE — 10/10 on a program that solves nothing.**

The ten requirements are independent, order-free regexes. A 15-line program with
a throw that never fires, a one-iteration loop containing `continue; break;`, and
a one-case switch passes every check and runs cleanly (`SUBMIT` enabled,
`STILL NEEDED: null`). The two structural checks that were supposed to force the
brief — r7/r8 (continue + break) and r9 (switch with three cases + default) — are
both satisfiable by a single token each. The checklist verifies *presence of
syntax*, never *the program's shape*. It is a style linter, not a grader.

---

## Pace table (strong student, observed)

Estimates from `lesson.json`; observed from actually doing each part.

| Part | estimateMins | Realistic (strong student) | Verdict |
|---|---:|---:|---|
| 2.7.1 Concepts and Traces | 16 | 10–13 | **Generous.** 8 MCQs; 5 are 4-line traces. A strong student reads and answers in ~1 min each. 16 is sized for a struggling student. |
| 2.7.2 In Your Own Words | 7 | 6–9 | **Fair.** Three short answers; the `for`/`while` and `===` answers are recall. 7 is tight but achievable; a slow typist needs 9. |
| 2.7.3 Find and Fix | 11 | **N/A — broken** | Cannot be assessed. As designed (4 bugs, name the type, fix) a strong student needs ~8–10 min. Currently the editor shows markdown, so the part is unanswerable. |
| 2.7.4 Chart It | 7 | 5–8 | **Fair-to-tight.** Drawing a legal 8-shape chart with a hexagon and a labelled diamond in 7 min is brisk but doable; the checker gives instant feedback. The text says "hand-drawn on paper" but the app is in-browser, which is faster. |
| 2.7.5 Write the Steps | 12 | 14–18 | **Unrealistic.** A nested loop + `if/else if/else` with `&&` + break/continue + try/catch + switch + header + UPPER_SNAKE const + template literal + `typeof`, with **no Run button** and one attempt. A strong student writing this cold needs 14–18 min. 12 is the most under-budgeted part. |

**Paper total:** budgeted 53. Realistic for a strong student: ~43–56 min
(2.7.1 −4, 2.7.2 +1, 2.7.3 broken, 2.7.4 +0, 2.7.5 +4). The 53-minute budget is
roughly right *in aggregate* but misallocated: 2.7.1 is over-budgeted by ~4 min
and 2.7.5 under-budgeted by ~4 min. A strong student finishes 2.7.1 early and
runs out of time on 2.7.5 — the part worth the most (20 points).

**Who the budgets are unrealistic for:**
- **2.7.5 (12 min):** unrealistic for everyone. It is the only part that requires
  writing a complete program with no execution feedback.
- **2.7.1 (16 min):** unrealistic in the other direction — over-generous for a
  strong student, which wastes paper time that 2.7.5 needs.
- **2.7.3 (11 min):** the estimate is fine for the intended task; the task itself
  is not delivered.

---

## Content defects vs Chapter 2 (2.1–2.5 reference)

| # | Claim | Contradiction | Severity |
|---|---|---|---|
| 1 | 2.7.5 reference uses `switch (true)` | 2.6 module: *"`switch (true)` is not taught… the string appears nowhere in `lessons/2-*`"* | MAJOR |
| 2 | 2.7.5 rubric full credit = *"if/else if/else with `&&`"* | Reference solution has `if` + `switch (true)`, no `else if` chain | MAJOR |
| 3 | 2.7.4 text: *"A chart with no hexagon fails"* | Checker passes a no-hexagon chart 11/11 | MAJOR |
| 4 | 2.7.4 text: *"the in-app checker is not used here"* | 2.7.4 has a live checker | MAJOR |
| 5 | 2.6.1 text: *"Ten checks run"* | 11 rules run | MAJOR |
| 6 | 2.7.4 text: *"the same eight checks"* | 11 rules run | MAJOR |
| 7 | 2.6.2 text: *"the brief forces a break or a second continue"* | One `continue;` satisfies r7 and r8 | MAJOR |
| 8 | 2.6.2 text: *"validate the one input that can be bad"* | `n="abc"` passes the guard | MAJOR |
| 9 | 2.7.1 `a-t3` explanation says two lines print | Key says one line | MAJOR |
| 10 | 2.7.1 `b-t1` explanation says "empty" prints | Key says "has crates" | MAJOR |
| 11 | 2.7.5 prompt: loop+nesting = 12 | lesson.json rubric: 9 + 3 | MAJOR |
| 12 | 2.7.5 answer.md: nested 8 + break 4 | lesson.json rubric: 9 + 3 | MAJOR |
| 13 | 2.6.3 content: two "Part 3" headings | prompt numbers 1–6 | MINOR |
| 14 | 2.7.2 copy: *"resubmit as many times as you want"* | summative locks after submit | MINOR |
| 15 | 2.7.4 text: *"No `[[ ]]`, no connectors, no comments"* | palette offers all three | MINOR |

**No contradiction found** between 2.7.1's concept questions and 2.1/2.3/2.4
teaching (the `if` truthiness, `switch` strict equality, and nested-loop product
questions all match 2.1.18, 2.3.18, 2.4.24). The 2.7.2 rubric's `for`/`while`
and `===`/`==` answers match 2.4.1 and 2.1.7/2.3.18.

---

## Screenshot index

| Finding | Screenshot |
|---|---|
| C1 2.7.3 editor shows content.md | `273-probe.png`, `273-typed.png` |
| C1 2.7.3 garbage passes all | `273-garbage-dialog.png` |
| C2 module leak | `raw-module-2.7.html`, `raw-module-2.6.html` |
| M2 2.6.2 gameable | `262-GAMEABLE-RUNNABLE.png` |
| M3 11 checks | `diag-2.6.1-checks.png`, `diag-2.7.4-checks.png` |
| M7 quiz reopens | `271-draft-deleted-2.png`, `271-resubmit-2.png` |
| M8 n="abc" | `262-B-n__abc_.png` |
| m4 unreleased shapes | `diag-2.6.1-palette.png`, `diag-2.7.4-palette.png` |
| 2.6.2 edge inputs | `262-B-n_0.png`, `262-B-n__1.png`, `262-B-n_0_5.png`, `262-C-zero.png` |
| 2.6.2 3s kill | `262-D-infinite.png` |
| 2.7.2 lock holds | `272-after-submit.png`, `272-draft-deleted.png` |
| 2.7.5 lock holds | `275-after-submit.png`, `275-reopen.png` |
| 2.7.4 reopen | `274-after-submit.png`, `274-reopen.png` |
