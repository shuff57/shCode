# Chapter 3 — Functions and Data: Assessment Rubrics

Teacher-facing. This folder is outside `lessons/`, so it is never loaded by
`loadLessons()` and never appears in a student's file explorer.

Scheduled per the CS 2026-2027 syllabus:

| Meeting | Date | Assessment | Gradebook category |
|---|---|---|---|
| 28 | Mon Nov 02, 2026 | Ch 3 Group PA — Snack Shack (`ch3-group-pa`) | Group Assessment |
| 29 | Wed Nov 04, 2026 | Ch 3 Test — Gradebook (`ch3-test`) | Individual Assessment |

No retakes and no corrections on either, per the syllabus.

---

## What shCode can and cannot grade

Read this before you trust the green checkmarks.

The grader in `server.js` is **regex only**. It tests a pattern against the raw
text of a file. It cannot run code, so it cannot tell you whether an answer is
*correct* — only whether the code *looks* like the thing you asked for.

To cover that gap, each assessment ships a **self-check block** at the bottom of
`script.js`. It runs real assertions in the preview and prints PASS/FAIL to the
Console. That is the honest signal for behavior.

So there are three layers:

1. **Requirement checkmarks** — did they use the technique the chapter actually
   teaches (a loop, `push()`, `map()` with an arrow, spread, JSON +
   `localStorage`), and did they finish every stub.
2. **Console self-check** — does the code actually work.
3. **You** — design quality, demo, collaboration, and the written answers.

Points below come from all three. Do not grade from the checkmarks alone: a
student can satisfy every regex with code that does nothing.

---

## Ch 3 Group PA — Snack Shack (100 pts)

One period, in pairs: design, build, demo.
Suggested clock: 10 min design, 30 min build, 10 min demo.

### Design — 20 pts (`plan.md`, requirements `plan1`–`plan4`)

| Pts | Descriptor |
|---:|---|
| 18–20 | Contracts name real types in and out ("an array of item objects", not "stuff"). Test plan predicts exact values. Risk is specific and has a response. |
| 14–17 | Contracts filled in but vague in places. Test plan present but one prediction is hand-waved. |
| 10–13 | Table partly filled. Test plan is a restatement of the task rather than a prediction. |
| 0–9 | Plan written after the code, or mostly blank. |

Hold the line on this one. The plan is graded on being written *first*; that is
SLO 3 ("design, implement, and test"). If you see them coding at minute two,
note it here.

### Build — 50 pts (one line per self-check behavior)

| # | Behavior | Section | Pts |
|---:|---|---|---:|
| 1 | `makeItem` returns an object with name, price, qty | §3.5, §3.2 | 6 |
| 2 | `totalValue` sums price × qty with a loop and an accumulator | §3.3.5 | 8 |
| 3 | `lowStock` builds a **new** array with `push()`, original untouched | §3.3.4 | 8 |
| 4 | `receiptLines` builds `"Popcorn x12"` lines with `map()` + arrow | §3.7.1, §3.4.3 | 8 |
| 5 | `sellItem` lowers qty through the reference, floors at 0 | §3.6 | 8 |
| 6 | `save`/`load` round-trip, and a never-saved key returns the seed | §3.8.2, §3.8.3, §3.8.5 | 7 |
| 7 | Loading unreadable text does not crash | §3.8.4 | 5 |

Award full points when the Console shows PASS. Award partial when the logic is
right but an edge case fails — a `totalValue` that works but returns a string, a
`sellItem` that goes negative.

**Only four array methods are taught in §3.7: `.map()`, `.slice()`, `.concat()`
and spread.** §3.7.6 *names* `.filter()` and `.reduce()` explicitly as things
students will meet in other people's code but that this book does not teach. So:

- Totalling and selecting are meant to be done **by hand** — a loop with an
  accumulator (§3.3.5) and a loop with `push()` (§3.3.4). That is the taught
  form, and `code2`/`code3` are your flags for it.
- A student who writes `.reduce()` or `.filter()` will *pass the behavior check*
  and *fail* `code2`/`code3`. Do not treat that as cheating — 3.7.6 told them
  those exist. Give the behavior points, take the technique points, and note in
  feedback that the chapter wanted the hand-written form. Cap that line at 5.
- `code4` is the reverse flag: `map()` **is** taught, and `receiptLines` is where
  they should reach for it rather than a loop.

### Demo — 20 pts

Both partners talk. Ask each one about a function **the other** wrote.

| Pts | Descriptor |
|---:|---|
| 18–20 | Both explain what goes in and what comes out, and can answer about their partner's code. |
| 14–17 | Both speak; one is shaky on the partner's half. |
| 10–13 | One partner carries the demo. |
| 0–9 | No working demo, or only one partner can say anything about the code. |

### Collaboration — 10 pts

`plan3` requires the split to be written down. Full credit when both partners
actually wrote code matching the split they declared. If one person typed
everything, cap the pair at 5 here regardless of how good the program is.

---

## Ch 3 Test — Gradebook (100 pts)

One period, individual, closed book. This is a distributed mid-term.

### Written — 40 pts (`answers.md`, requirements `ans1`–`ans4`)

10 pts each. The regex only checks that something substantial was written on the
line; correctness is yours. See `answer-key.md`.

| Pts | Descriptor |
|---:|---|
| 9–10 | Correct and in their own words, with a concrete reference to their code where asked. |
| 6–8 | Correct idea, imprecise vocabulary. |
| 3–5 | Partly right, or a definition restated without understanding. |
| 0–2 | Absent or wrong. |

### Code — 60 pts (15 pts per self-check behavior)

| # | Behavior | Section | Pts |
|---:|---|---|---:|
| 1 | `average` returns the mean, and 0 for an empty array | §3.3.5, §3.2.4 | 15 |
| 2 | `highest` returns the largest score | §3.7.4 | 15 |
| 3 | `passing` builds a **new** array with `push()`, roster untouched | §3.3.4 | 15 |
| 4 | `addScore` copies the student **and** its scores, changing neither | §3.7.5, §3.6.3 | 15 |

`addScore` is the one that matters most, and it is deliberately harder than it
looks. `{ ...student }` alone is a **shallow copy** (§3.6 Key Terms): the new
object is distinct but `scores` is still the same array, so pushing to it changes
the original too. Only `{ ...student, scores: [...student.scores, score] }`
passes. A student who mutates, or who shallow-copies, fails self-check 4 and
requirement `t6`. Weight your written feedback there and tie it back to Q2.

`highest` is the §3.7.4 spread check. `Math.max(scores)` handed an array returns
`NaN` — the book shows exactly that. A student who writes a loop instead gets
the right answer and a red `t5`: give the behavior points, take the technique
points, same as the PA.

Partial credit: 8–11 when the function works on the happy path but fails an edge
case (`average([])` dividing by zero, `highest` on a one-element array).

---

## Operational notes

- **Both assessments are live but locked.** They show on the home page all term
  with a padlock and a `Locked` tag, so students can see what is coming. Opening
  one requires the unlock code, and the check runs on the server: until it
  passes, the browser never receives the starter files, the roster, the written
  questions, or the grading patterns. Typing the URL directly does not get in.

  **Current codes** — change these before you use them:

  | Lesson | Code |
  |---|---|
  | `ch3-group-pa` | `MAPLE-7314` |
  | `ch3-test` | `CEDAR-2895` |

  Codes live in each `lesson.json` as `"unlockCode"`, next to `"locked": true`.
  Both are read from disk on every request, so editing that file takes effect
  immediately — no restart, no redeploy. Read the code off the board at the
  start of the period; case and stray spaces do not matter.

  Three ways to run a period:

  - **Read the code aloud** on the day. The normal path.
  - **Set `"locked": false`** to leave a lesson open with no code at all.
  - **Set `"locked": true` and delete the code** for a hard lock nobody can open.

  An unlock lasts 8 hours and is per student, per browser, per lesson, so a
  lesson re-locks itself overnight and the PA's code does not open the test.
  Rotating a code immediately invalidates anyone already holding an unlock —
  useful if a code leaks mid-period. A student who reloads, or moves to another
  machine, simply re-enters the code.
- **Closed book.** The lesson text names the sections it draws on, which is a
  hint but not an answer. Decide whether students may keep the textbook tab open;
  the syllabus says closed book.
- **Work is saved automatically.** Every edit is backed up in the browser a
  moment after it is typed, and restored when the lesson reopens. A refresh, a
  closed lid, or a crashed tab no longer costs a student the period. The strip
  beside the lesson title shows the time of the last save, so a worried student
  has something to point at.

  Two consequences worth knowing before a no-retake day:

  - **Saves are per browser, not per student.** On a shared classroom machine, a
    student who sits down after someone else sees a banner reading *"Picked up
    where you left off"* with the earlier save time. That banner is the tell —
    have them click **Start fresh** before beginning. The same applies to a
    student who wants a clean slate: **Reset to starter code** wipes the saved
    work for that lesson and restores the stubs. It asks for confirmation first.
  - **A locked-down or private browser may refuse to store anything.** The strip
    turns into an amber warning saying not to refresh. Work still proceeds
    normally in that session; only the backup is missing.

  Saved work is per lesson, so the PA and the Test never overwrite each other,
  and opening a lesson without typing leaves nothing stored.
- **`localStorage` is shared** across lessons on the same origin. The PA's
  §3.8 task uses the key `snack-shack`, separate from the draft-saving keys
  above. If a pair's load behaves strangely, clear site data — note that doing
  so also clears their saved work and their unlock.
- **Absent students.** Syllabus rules apply: excused absence buys the same number
  of days from return. There is no retake for a PA that was simply missed.
