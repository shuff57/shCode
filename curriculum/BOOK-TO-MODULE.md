# Book → Module: turning a written book chapter into shCode modules

The bookSHelf textbook and shCode are two repos with one curriculum between them.
This doc is the join. It says what to do when a chapter of the book is written (or
rewritten) and the matching shCode unit needs to be built (or resynced).

**Nothing else documents this.** The chapter→unit mapping lives only on the book side
(`book_manifest.yaml`); the lesson-authoring conventions live only on this side
(`curriculum/resources/`). Neither knows about the other. This file is the bridge.

- **Book repo:** `C:/Users/shuff/Documents/GitHub/bookSHelf`
- **Book project:** `projects/Introduction to Programming Concepts and Methodologies/`
- **Mapping table:** that project's `book_manifest.yaml`, `shCode:` block
- **This repo's build specs:** `curriculum/modules/` + `curriculum/resources/`

---

## 1. The division of labour

Fixed by the operator on 2026-08-07 and recorded in `book_manifest.yaml`. Do not
renegotiate it per-chapter.

| | Owns | Does not own |
|---|---|---|
| **Book** | Teaching: prose, Definitions, Insight Notes, Examples, Try It Nows, Problem Sets. Source of truth for *concepts*. | shCode's labs, challenge specs, graded rubrics. |
| **shCode** | Graded work: labs, assignments, challenges, capstones, and the unit/module/lesson structure they hang on. | The concepts. It imports them. |

Two consequences that decide arguments before they start:

1. **The book is upstream.** shCode content is disposable; the book is not. When the
   two disagree, shCode changes. Friction on import is resolved by surgical text edits
   in shCode, **never** by renumbering the book.
2. **shCode invents its own graded work.** Do not port the book's Problem Sets into
   lessons as assignments. Read them for what the student should be able to do, then
   write shCode-native labs against `lab-assignment-conventions.md`.

The one thing still unagreed: **self-graded question format.** When that work starts,
both sides have to settle on question shape and grading together. Until then, shCode's
graders stay regex/AI as they are today.

---

## 2. The pipeline

```
  bookSHelf                              shCode
  ─────────                              ──────
  remastered/Chapter_N_Remastered/
    N.1_topic.md   ──┐
    N.2_topic.md   ──┤  (2) section → sub-module
    N.3_topic.md   ──┘         │
                               ▼
  book_manifest.yaml    curriculum/modules/<U.M>_<topic>.md
    shCode: block  ────▶   the SPEC   (3) write/update it
    (1) chapter → unit          │
                                │  (4) "build U.M.Y"
                                ▼
                          lessons/<U-M-L>-<descriptor>/
                            lesson.json + script.js + content.md
                                │
                                ▼  (5) verify
                          /module/U.M renders, graders pass on the solution
```

Steps 3–5 are already documented: `curriculum/README.md` and
`curriculum/resources/*`. **Steps 1–2 are what this doc adds.**

---

## 3. Step 1: chapter → unit

`book_manifest.yaml` carries the coarse table. It is quarter-level and deliberately
lumpy (`2.2-2.7` is one row for all of chapter 6):

| Book chapters | shCode unit |
|---|---|
| 1, 2, 3 | 1.1 Foundations |
| 4 | Q1-synth Print Shop |
| 5 | 2.1 moSHion Foundations |
| 6 | 2.2–2.7 Game Mechanics |
| 7 | Q2-synth Arcade Cabinet |
| 8 | 3.1–3.2 JSCAD Foundations |
| 9 | 3.3 3D Modeling |
| 10 | Q3-synth Fits-My-Stuff |
| 11 | 4.1 Advanced Modeling |
| 12 | 4.2 Production Pipeline |
| 13 | Q4-synth Mechanism |

Use it to find the neighbourhood, then go to step 2 for the actual join.

---

## 4. Step 2: section → sub-module (the real granularity)

**One book section maps to one sub-module spec.** Not one lesson: one *spec*, which
then fans out to 15–30 lessons. The mapping for Q2 is already 1:1, because unit 2 was
built alongside chapters 5–7 even though nothing wrote it down:

| Book section | Sub-module spec | Unit |
|---|---|---|
| 5.1 Hello Sprite and Movement | `2.1.1_hello-sprite-movement.md` | 2.1 |
| 5.2 Physics Feel | `2.1.2_physics-feel.md` | 2.1 |
| 5.3 Classes and Objects via moSHion | `2.2.1_classes-via-moshion.md` | 2.2 |
| 6.1 Groups **+** 6.2 Overlaps and Collisions | `2.3.1_groups-overlaps.md` | 2.3 |
| 6.3 Physics Applications | `2.3.2_physics-applications.md` | 2.3 |
| 6.4 Animated Sprites and Camera | `2.4.1_animation-camera.md` | 2.4 |
| 6.5 Save and Load | `2.5.1_game-saves.md` | 2.5 |
| 6.6 Game State Machines | `2.6.1_game-states.md` | 2.6 |
| 6.7 Advanced Input **+** 6.8 Joints | `2.7.1_joints-advanced-input.md` | 2.7 |
| 6.9 Timing and Async | **: no home :** | *(gap, see §8)* |
| 7.1 Arcade Cabinet (Q2 Synthesis) | `2.8.1_capstone-game.md` | 2.8 |

### Q1 (chapters 1–4 → units 1.1–1.4)

Derived 2026-08-10 from `curriculum-plan.md` (authoritative on calendar: ~35 contact
hours, 10 weeks, 9 sub-modules) against the 19 remastered Q1 book sections. **Nothing is
built yet**: unit 1 has zero lesson folders, and the three existing `1.1.x` specs
predate the book.

**One book section = one sub-module. Never combined** (operator, 2026-08-10). The section
index carries through unchanged, so the mapping is a rule, not a lookup:

```
book chapter C, section C.S   →   sub-module  Q.U.S
                                  where Q.U is the unit that owns chapter C
```

Q1 owns chapters 1–4 as units 1.1–1.4, so:

| Unit | Book chapter | Sub-modules |
|---|---|---|
| 1.1 Foundations | 1 (5 sections) | `1.1.1` … `1.1.5` |
| 1.2 Control Flow | 2 (5 sections) | `1.2.1` … `1.2.5` |
| 1.3 Functions and Data | 3 (8 sections) | `1.3.1` … `1.3.8` |
| 1.4 Synthesis | 4 (1 section) | `1.4.1` |

Sub-modules are sized in **class days, 1–3**. Weeks are not a spec field: the calendar
groups sub-modules into weeks downstream and can be re-cut without touching a spec.

| Sub-module | Book section | Lines | Days |
|---|---|---|---|
| `1.1.1` | 1.1 Software Lifecycle | 253 | **2** *(spec written: concept count, not estimate)* |
| `1.1.2` | 1.2 Variables and Data Types | 568 | 1 |
| `1.1.3` | 1.3 Documentation and Coding Conventions | 229 | 1 |
| `1.1.4` | 1.4 Programming Paradigms and Languages | 368 | 1 |
| `1.1.5` | 1.5 Program Design Tools and Environments | 983 | 2 |
| `1.2.1` | 2.1 Conditionals | 1110 | 2 |
| `1.2.2` | 2.2 Algorithms and Loops | 534 | 1 |
| `1.2.3` | 2.3 The Switch Statement | 1024 | 2 |
| `1.2.4` | 2.4 Loop Control and Nested Loops | 1054 | 2 |
| `1.2.5` | 2.5 Handling Errors with Try/Catch | 794 | 2 |
| `1.3.1` | 3.1 Functions: Definition and Calls | 590 | 1 |
| `1.3.2` | 3.2 Parameters and Return Values | 748 | 2 |
| `1.3.3` | 3.3 Arrays | 844 | 2 |
| `1.3.4` | 3.4 Function Expressions and Arrow Functions | 622 | 2 |
| `1.3.5` | 3.5 Objects and Properties | 796 | 2 |
| `1.3.6` | 3.6 Functions: Pass by Value/Reference | 384 | 1 |
| `1.3.7` | 3.7 Array Methods | 628 | 2 |
| `1.3.8` | 3.8 Saving and Loading Data | 600 | 1 |
| `1.4.1` | 4.1 Print Shop (Q1 Synthesis) | 151 | 3 |

**The Days column is a provisional estimate**, derived from book line count at roughly 590
lines per class day (`1.4.1` is a project: days come from the activity, not its 151 lines).
It exists so the quarter can be sized before any spec is written. When each spec IS written,
set `days:` from the atomic-concept count per `sub-module-spec-conventions.md` §2a and
overwrite the estimate here.

### Why 1:1 and not one-per-week

A sub-module used to mean *one week of class*. It now means **one book section**, and
`week:` becomes a scheduling field that several sub-modules share. Three things this buys:

- **The mapping is mechanical.** No table lookup, no judgement call about which sections
  pair. A book renumber moves one row.
- **Resync is surgical.** Change §2.3 and exactly one sub-module rebuilds. Under the
  combined scheme, editing §2.3 forced a rebuild of everything §2.1 shared a spec with.
- **Load becomes a scheduling knob, not a mapping defect.** Balancing weeks no longer
  means re-cutting the content boundaries.

- **Sizing is honest.** A sub-module takes the days its content takes, 1 to 3. Nothing is
  padded to fill a week or crammed to fit one.

`sub-module-spec-conventions.md` has been updated to match (2026-08-10): `week:`,
`contactHours:` and `sessions:` are replaced by `days:` and `bookSection:`, and §0 states
the 1:1 rule. Older specs carrying the retired fields migrate per its §1.1.

### Quarter size

The estimates above total **31 class days** for Q1. Against a 10-week quarter that is
about 3 days per week, at the top of the range, with no slack. The earlier "~40% over"
figure was mostly an artifact of forced section pairing; 1:1 mapping plus honest day-sizing
absorbs most of it. Re-total once real `days:` values replace the estimates.

### The Q.U scheme above is retired: full book-native renumber (operator, 2026-08-12)

The `Q.U` unit id used throughout this file (e.g. `1.1`, `1.2`, `2.4`) prefixes a
quarter digit that doesn't exist in the book. It has been replaced everywhere,
**including already-built content**, by the book's own chapter/section numbering :
the same three-part shape the book already uses internally for definitions and
examples (`### Definition 1.2.1`, see §5):

```
Unit N            = book Chapter N
Module N.S         = book Chapter N, Section S
Submodule N.S.K     = book Chapter N, Section S, subsection/item K
```

Every table above (§3, §4) describing `1.1`–`1.4` and `2.1`–`2.8` as *unit* ids is
**historical**: it documents the mapping as planned before the renumber, not the ids
on disk today. The actual result:

| Old id (this file's tables) | New id | What it is |
|---|---|---|
| Unit 1.1 Foundations, sub-module 1.1.1 | Module 1.1 | book Ch.1 §1.1 (ids happened to already match: no rename needed) |
| Unit 1.1, sub-modules 1.1.2 / 1.1.3 (carry-over content) | Module 1.2 / 1.3 | book Ch.1 §1.2 Variables, §1.3 Documentation |
| Unit 1.2 Control Flow | Unit 2, modules 2.1 / 2.2 / 2.3 | book Ch.2 §2.1 Conditionals, §2.2 Algorithms/Loops, §2.3 Switch |
| Unit 1.3 Functions and Data | Unit 3, modules 3.1 / 3.2 | book Ch.3 §3.1 Functions, §3.2 Arrays |
| Unit 1.4 Synthesis | Unit 4, module 4.1 | book Ch.4 §4.1 Print Shop |
| Unit 2.1 moSHion Foundations, 2.2 OOP | Unit 5, modules 5.1 / 5.3 | book Ch.5 §5.1 Hello Sprite, §5.3 Classes/Objects (§5.2 Physics Feel not built) |
| Unit 2.3 Collections and Physics Applications | Unit 6, modules 6.1 / 6.3 | book Ch.6 §6.1+6.2 Groups/Overlaps combined, §6.3 Physics Applications |
| Unit 2.4–2.7 | Unit 6, modules 6.4–6.7 | book Ch.6 §6.4–§6.8 (6.7 combines §6.7 Advanced Input + §6.8 Joints, per this doc's own combined-spec rule) |
| Unit 2.8 (not built) | Unit 7, module 7.1 | book Ch.7 §7.1 Arcade Cabinet |

176 moSHion lesson folders and their D1 rows (`lesson_state`, `commits`: 35 real
students, 3,858 rows) were renumbered and repointed in this pass; so were the smaller
1.1–1.4 carry-overs. **This reverses the "Q2 is grandfathered" rule that used to be
here**: that rule stood until 2026-08-12, when it was explicitly overridden because
leaving two incompatible numbering schemes permanently in the same app was judged
worse than a one-time repoint.

One built-content wrinkle worth knowing: switch statements are taught directly after
conditionals (module 2.1) in the actual lesson sequence, not after algorithms/loops
(module 2.2): module *numbers* follow the book's section order (2.1, 2.2, 2.3), but
the taught *order* was kept as originally built rather than reshuffled to match.

**Not yet done:** the `.md` sub-module spec files' prose (`curriculum/modules/*.md`)
was updated enough to be accurate at the frontmatter/summary level (ids, titles,
category) so every `/module/X.Y` route resolves, but was not rewritten section-by-
section against the book for full pedagogical accuracy: several files carry a
"flagged for a follow-up pass" note. Treat that prose as provisional.

**Note the coarse table in `book_manifest.yaml` is wrong for Q1.** It reads
`1.1 Foundations ← chapters 1,2,3` and `Q1-synth ← chapter 4`. Q1 is actually four units
(1.1 Foundations, 1.2 Control Flow, 1.3 Functions and Data, 1.4 Synthesis) and chapter 4
lands in `1.4.1`, not a separate `Q1-synth`. Fix the manifest row or ignore it for Q1 and
use this table.

**Load is not balanced, and shuffling will not fix it.** At ~335 book lines per contact
hour (the Q1 average), a 3.5-hour sub-module should carry ~1170 lines. `1.2.1` carries
2134 (1.8×) and `1.3.2` carries 1802 (1.5×), while `1.1.1` and `1.1.2` sit at half load.
Moving §2.3 out of `1.2.1` just overloads `1.2.2` instead. The real finding is that Q1's
remastered book content is roughly 40% larger than the plan's calendar assumes. Three
ways out, and it is the curriculum author's call, not the builder's:

1. Compress: teach less of the heavy sections
2. Extend: Q1 runs longer than 10 weeks
3. Demote: some sections become reading-only with no graded slot

Line count is a crude proxy for concept load; re-check against atomic-concept counts
before acting on it.

### Q2 (chapters 5–7 → units 2.1–2.8)

Two sections may share a spec when they are one week of class (6.1+6.2, 6.7+6.8). A
section never splits across two specs, if it feels like it should, the book section
is too big and that is a book-side conversation.

For a chapter with no existing unit, derive the split from **contact hours, not section
count**: a sub-module is one week (~3.5 hours, 2 sessions). Write the mapping into a new
row of the table above in the same commit.

---

## 5. Step 3: what the book supplies to the spec

The sub-module spec (`sub-module-spec-conventions.md`, 18 required sections) is the
build target. Roughly half of it is now a *transcription* job from the book rather than
an authoring job:

| Book element | Goes into the spec as | Then becomes |
|---|---|---|
| `## Learning Objectives` | §Learning Objectives (verbatim starting point) | slide deck outline |
| `## N.M.K` sub-headings | §Topics Covered: **one bullet per atomic concept** | one lesson slot each |
| Definitions: **two shapes, see below** | §Vocabulary table rows | reading glossary rows |
| `> **Insight Note:**` | §Teacher Notes, or a §Context `**Do NOT:**` bullet | reading prose |
| `### Try It Now N.K` | §Readings → Reading content guidance → **Try it:** | a `js live` block in a reading lesson |
| Worked examples in prose | §Worked Examples (teacher-led), full code | `preview: "example"` lesson |
| `## Problem Set` | **read for intent, do not transcribe** | nothing: shCode writes its own labs |
| `## Key Terms` | cross-check against §Vocabulary | glossary completeness |

### Definitions have two different shapes: grep for both

The book does not use one callout convention across chapters:

```
ch1-3 (Q1)    ### Definition 1.2.1: Special Numeric Values      ← H3 heading
ch5-7 (Q2)    > **Definition 6.1: Group**: A collection...     ← blockquote bold
```

A coverage check that greps only the Q2 shape returns **zero definitions** on every Q1
section and reports the glossary complete. That is a check failing the way it was
written rather than the way the defect fails. Match both, and assert the count is
non-zero before trusting it.

Q1 sections also carry `### Example N.M.K:` and `### Try It Now N.M.K` as H3 headings
(three-part numbering), where Q2 uses `### Try It Now N.K` (two-part). Same trap.

What the book **cannot** supply and you still have to author: the Session Plan, the
Assignments (`A<W>.<N>`), the Numbered Lesson List, the starter-file shapes, and the
grader requirements.

### The granularity bar is the hard part

`sub-module-spec-conventions.md` §2a: **one new concept per lesson** for intro-level
units. A book section is written as continuous prose and will happily introduce five
concepts in one `##` block. Splitting that into five lesson slots is the actual work of
step 3, and the most common way to get this wrong is to let a book sub-heading become
one lesson because the heading count looked convenient.

Rule of thumb from the built units: a 150-line book section becomes **15–30 lessons**.
Unit 2 currently ships 175 lessons across seven modules (2.1: 21, 2.2: 33, 2.3: 21,
2.4: 19, 2.5: 26, 2.6: 26, 2.7: 29) from eleven book sections.

### Lesson types available

Set by `curriculum/resources/README.md`. The spec's Numbered Lesson List assigns one
per slot:

| Type | Graded | Starter `script.js` |
|---|---|---|
| `slides` | no | none: `U.M.1` is always the unit deck |
| `video` | no | none: URL left empty, teacher curates |
| `reading` | no | none |
| `example` | no | fully working sketch (read-along) |
| `moshion (lesson)` | yes | scaffold + `// STEP N:` description comments |
| `moshion (assignment)` | yes | same scaffold shape, no solution code |
| `moshion (challenge)` | yes | **empty file**: student structures it |
| `assignment` + `aiGrader` | yes (AI) | none: written response |

---

## 6. Step 4: build

Unchanged, and already documented. Say **"build 2.3.1"**; the builder reads the spec,
cross-checks the unit index at `curriculum/modules/<U.M>_*.md`, and emits
`lessons/<U-M-L>-<descriptor>/`. The spec is self-contained by design: the builder
should not need the book or `curriculum-plan.md` open.

Hard rules it must not break (each has bitten before):

- Every lesson `title` starts with `<U>.<M>.<L>`: a title without it is **silently
  dropped** from `/module/U.M` and the home page.
- No invented video URLs.
- No commented-out solution code in a scaffold.
- Mastery grading: `points`, `totalPoints`, `passingScore` all `0`; Submit is
  all-green-gated.

---

## 7. Resync: when the book changes under a built unit

This is the common case now, not the exception. Unit 2 is built (175 lessons) against
chapters 5–7 **as they were before the Q1/ch6 remaster**. Chapter 6 was restructured
during that remaster; its section numbering moved.

Resync a unit like this, in this order:

1. **Re-derive the section→sub-module row** in §4. Section numbers move; spec ids do
   not. Fix the table first, or every later step verifies against the wrong section.
2. **Diff the concepts, not the prose.** For each spec, list the book section's atomic
   concepts and compare against the spec's §Topics Covered. Three outcomes:
   - *concept added* → new lesson slot, inserted with the `<L><letter>` suffix
     (`2.3.3a`) so existing slots keep their ids and student progress survives
   - *concept removed* → delete the lesson folder; note it in the spec
   - *concept reworded* → edit the reading/glossary, leave the slot alone
3. **Never renumber built lesson folders.** `lesson.json.id` is the folder name and
   student commits and progress hang off it. The letter-suffix insert exists precisely
   so a mid-unit addition costs nothing. Renaming a *title* is safe; renaming a
   *folder* is not.
4. **Re-run the graders** against the reference solutions in the touched module. A
   book change that renames an API silently breaks every regex requirement mentioning
   it.
5. **Update `status:`** in the spec frontmatter (`draft | ready | shipped | built`).

Assignments and challenges are shCode's own. A book change does **not** justify
rewriting a working lab unless the concept it grades actually moved.

---

## 8. Known gaps

- **Book §1.1 has no JavaScript basics, but the course needs them on day one.**
  §1.1 is purely the software lifecycle: zero occurrences of boolean, integer,
  string or sequential execution, and `console.log` only inside two worked
  examples. shCode's `1-1-2-reading-console-log` and `1-1-4-sdlc-overview`
  therefore invent that teaching so week one has something runnable, which
  `curriculum-plan.md` §1.1 explicitly asks for ("Teacher demo: type
  `console.log("hello")`… Students open DevTools, run 3 provided statements").
  The consequence is that the §1.1 **deck cannot cover what the labs demand** :
  a teacher presenting from slides alone reaches a console lab having
  introduced no JavaScript at all. **Book-side request:** a short JS-basics
  opener in §1.1 (print a value, a string, a number, sequential execution)
  would let the deck carry it. Until then the two shCode lessons are load-
  bearing and **a resync must not delete them for being absent from the book**.
  Raised 2026-08-16 from a module 1.1 review.

- **Book §2.1 never defines the comparison operators it relies on.** `===`, `==`,
  `<`, `>`, `<=`, `>=` are used pervasively from 2.1.1 onward: every worked
  example depends on them, but the section gives them no definition, no table
  and no subsection of their own. A student reading the book cold has to infer
  six operators from usage. shCode's `2.1.15`/`2.1.16`/`2.1.17`
  (reading / worked example / lab) are therefore load-bearing scaffolding with
  no book anchor, tagged `sourceRef: designed` rather than `book 2.1 :`.
  **A resync must not delete them for being absent from the book.**
  Same shape as the §1.1 JavaScript-basics gap above. **Book-side request:** a
  short operator table in §2.1, before Example 2.1. Raised 2026-08-16 from a
  module 2.1 build.

- **`do…while` is in the curriculum plan but not in book §2.2.** The plan's §2.2
  module goal asks for it explicitly; the book section does not contain it
  anywhere. shCode teaches it at `2.2.11`/`2.2.12`, so those lessons are
  likewise load-bearing and must survive a resync. Note the book *does* reach
  `do…while` later: §2.4 covers it as part of loop entry (Definition 2.4.1) :
  so the gap is one of **placement**, not absence: the plan wants it a section
  earlier than the book delivers it. Decide whether the plan moves to match the
  book or §2.2 keeps its own treatment. Raised 2026-08-16 from a module 2.2 build.

- **Book §2.4 Example 2.3 needs arrays three weeks before arrays are taught.**
  "Filtering while you loop" is written over `readings = [4, -2, 7, 0, -9, 3]`,
  but arrays are book §3.3 and §2.4 teaches Sep 18. shCode's
  `2-4-14-example-filtering-while-loop` teaches the same continue-vs-keep idea
  over a numeric range instead. The book's §2.2 linear-search example (Example
  2.5) has the same problem and additionally uses `break`, which is itself §2.4
 : `2.2.14a` adapts it to a `found`-flag search over a range. Both adaptations
  are deliberate and should not be "corrected" back toward the book's text.
  **Book-side request:** either move these examples after §3.3, or rewrite them
  on ranges. Raised 2026-08-16 from the chapter 2 build.

- **§6.9 Timing and Async has no shCode home.** It is not in Module 6.7 (which covers
  joints and advanced input, zero async content) and Module 7.1 is the capstone. Either
  it becomes a new Module 6.8/6.9 spec or it is book-only teaching with no graded work.
  Decide before chapter 6 is rebuilt.
- **Only Q2 is mapped at section level.** Chapters 1–4 and 8–13 have the coarse
  chapter→unit row and nothing finer. The old `curriculum/modules/lessons/1.1.1`–`1.1.5`
  specs (pre-book, written against the old FCC/CodeHS activity lists) were removed
  2026-08-12 rather than resynced: they predated the book-native scheme entirely and
  described a retired "5 sub-modules under one Unit 1.1" structure that no longer
  exists (see the renumber table above). Modules 1.2–1.5 need fresh section-level specs
  authored against the book directly, not a resync of the deleted files.
- **Module statuses are stale across the moSHion units (5–7).** Several module spec
  frontmatter `status:` fields don't match what's actually shipped on disk. Trust the
  disk, fix the frontmatter during resync.
- **Slides moved off Slidev entirely (2026-08-12).** The old moshion-era Slidev decks
  (`slides/2.1`–`2.5`, `public/slides/2.1`–`2.5`) collided with the new Unit 2 (Control
  Flow) module ids after the renumber and were removed rather than resynced: every
  `*-1-slides` lesson now carries a placeholder `slidesUrl` (its own module id, e.g.
  `/slides/5.1/`) pointing at nothing yet. `package.json`'s `slides:build-all` /
  `slides:U.M:*` scripts, the `@slidev/*` devDependencies, and
  `scripts/strip-slide-externals.mjs` were all removed the same day: **slide decks are
  now HTML sourced from bookSHelf's Introduction to Programming section slides, not
  Slidev-authored Markdown.** No build pipeline exists yet for the new source; authoring
  that pipeline (how a bookSHelf section's slides become a `public/slides/<U.M>/`
  directory, or whether they're served some other way) is unstarted.
- **Resolved 2026-08-16: there is no pipeline, by design.** `slidesUrl` holds the
  absolute bookSHelf deck URL and `ContentLessonView` iframes it directly, so a push to
  bookSHelf updates the deck with no shCode rebuild. Nothing is copied into
  `public/slides/`: that directory is gone, along with the leftover `2.1`–`2.5` build
  output (archived to `.archive/`, gitignored) and the retired
  `curriculum/resources/slide-deck-conventions.md`. This works because bookSHelf serves
  decks with `Access-Control-Allow-Origin: *` (the HEAD readiness probe needs it), no
  `X-Frame-Options`, and `must-revalidate`. Lessons with no deck yet simply omit
  `slidesUrl` and render the "not published yet" placeholder.
- **Deck URLs end in a theme suffix.** `.paper` is the house theme and everything
  published so far uses it. Other themes exist (`bookshelf`, `grid`, `ledger`,
  `letter`, `notebook`, `course-module`) and §1.1 also has an older `.bookshelf`
  build still live alongside its `.paper` one: prefer `.paper`. Guess wrong and
  you do not get a 404, see below.
- **A wrong deck URL returns HTTP 200, not 404.** `oerbookshelf.app` serves its site
  landing page ("Hand-curated math textbooks…") for any unrecognised deck path, so a
  HEAD probe cannot tell a real deck from a typo. This bit for real: `1-1-1-slides`
  shipped pointing at `1.1_software_lifecycle.paper`, which does not exist, and
  module 1.1 students were iframing the marketing landing page. Found and fixed
  2026-08-16. **To verify a deck URL, GET it and compare byte length against a
  deliberately bogus path**: same length means the deck is not there. A real deck is
  150–250 KB and its `<title>` names the section.
- **Deck inventory, checked 2026-08-16.** Six decks are published, and all six are
  linked. The other thirteen `*-1-slides` lessons correctly carry no `slidesUrl`
  and render the "not published yet" placeholder: **do not invent URLs for them.**

  | Published + linked | No deck in any theme |
  |---|---|
  | §1.1 §1.2 §1.3 §1.4 §1.5 §2.1 | §2.2 §2.3 §3.1 §3.2 §4.1 §5.1 §5.3 §6.1 §6.3 §6.4 §6.5 §6.6 §6.7 |

  Re-run the check by probing each section slug (the remastered `.md` filename,
  minus the extension) with the GET-and-compare method above. When a deck is
  published on the book side, the only shCode change needed is adding its URL to
  that module's `*-1-slides` lesson.
- **No automated gate on any of this.** Nothing checks that a spec's concept list still
  matches its book section, and nothing checks that a built lesson matches its spec.
  The design for a builder/critic loop that would do it is in the book repo at
  `docs/plans/2026-08-06-gauntlet-loop-analysis.md`, §"Application to shCode
  Assignments". It was never implemented.

---

## 9. What this doc is not

- Not a spec format reference: that is `curriculum/resources/sub-module-spec-conventions.md`.
- Not a lesson-authoring guide: that is the per-type docs in `curriculum/resources/`.
- Not the curriculum plan: that is `curriculum-plan.md`, which remains the SLO and
  calendar authority. Where it and the book disagree on *concepts*, the book wins.
