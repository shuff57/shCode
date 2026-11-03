# CodeHS as a structural model for shCode

**Scope.** What CodeHS's courses look like *structurally* — module → lesson → activity,
and how the sequence is paced — compared with what shCode ships today. Not a content
lift: nothing here proposes copying CodeHS prose or problems. Working notes, 2026-10-29,
branch `codehs-inspiration`.

Source: the public `/course/<slug>/explore` pages (module and lesson outlines) and each
lesson's public page (its activity list with type labels). Six courses pulled in full.

---

## 1. The six courses, measured

| Course | Slug | Modules | Lessons | Activities | Acts / lesson |
| --- | --- | ---: | ---: | ---: | ---: |
| Introduction to Game Design | `gamedesign` | 6 | 37 | 196 | 5.3 |
| Video Game Design in JavaScript | `videogamedesign` | 17 | 74 | 434 | 5.9 |
| Introduction to CS in JavaScript (Corgi) | `introjs_corgi` | 14 | 59 | 329 | 5.6 |
| AP Computer Science Principles (JS) | `apcsp_js` | 19 | 106 | — | — |
| AP Computer Science Principles (Python) | `apcsp_py_26` | 21 | — | — | — |
| AP Computer Science A (Cortado) | `apcsacortado` | 4 | 61 | — | — |

**Activity type mix** (the interesting number; shCode's equivalent in §4):

| Type | `gamedesign` | `videogamedesign` | `introjs_corgi` |
| --- | ---: | ---: | ---: |
| Exercise | 65 (33%) | 125 (29%) | 90 (27%) |
| Notes | 37 (19%) | 22 (5%) | 15 (5%) |
| Free Response | 33 (17%) | 9 (2%) | 7 (2%) |
| Video | 20 (10%) | 70 (16%) | 50 (15%) |
| Example | 11 (6%) | 85 (20%) | 69 (21%) |
| Quiz / Check for Understanding | 12 (6%) | 57 (13%) | 49 (15%) |
| Article | 8 (4%) | — | — |
| Challenge | 6 (3%) | 36 (8%) | 23 (7%) |
| Debugging | 3 (2%) | 8 (2%) | 6 (2%) |
| Badge | — | 18 (4%) | 15 (5%) |

The game-library course (`gamedesign`) is the outlier in the best way: half its
activities are Notes or Free Response, because it is project-driven. The fundamentals
course is drill-driven: a third exercises, a fifth examples, a sixth video.

---

## 2. Which course actually matches what we teach

Reading shCode as it stands — Units 1–3 procedural JavaScript (foundations, SDLC,
variables/types, conditionals, loops, functions, arrays, objects, error handling, data
persistence), Unit 4 a console project, Units 5–7 the moSHion/Box2D game track —
and ignoring Unit 8 (3D, per the brief):

| Rank | Course | Overlap | Where it stops matching |
| ---: | --- | --- | --- |
| **1** | **Video Game Design in JavaScript** | The whole arc, in order: Karel → JS basics → canvas/graphics → control structures → functions → animation/timers/events/collisions → Breakout + Snake → arrays → objects → Tic-Tac-Toe + Helicopter → final project. Our 1.x→2.x→3.x→5.x→6.x, almost module for module. | Karel (grid-world pre-JS) has no shCode analogue; we start at `console.log`. Nothing on saving/loading (our 3.8, 6.5) or joints (6.8). |
| **2** | **Introduction to Game Design (p5play)** | Units 5–7 near 1:1: "Introducing Libraries" → our 5.1; Program Structure → setup/draw; First Sprites → our sprite model; **Physics of Sprites** → our 5.2 physics feel; Groups and Tiles → our 6.1/6.2; Cannon rotation + mouse → our 6.7; Camera That Follows → our 6.4; End of Level / Game Over → our 6.6. | Its fundamentals are thin (9 lessons total), so it cannot carry Units 1–3. |
| **3** | **Introduction to CS in JS (Corgi)** | A strict subset of #1 — same modules minus data structures, projects, arrays/objects. | Less depth than #1 with no compensating difference. Use it only as a pacing reference for a semester version. |
| **4** | **AP CSP (JavaScript)** | Its modules 1–7 (Intro to Programming, JS, control structures, functions/parameters, basic data structures) ≈ our Units 1–3, with Practice PTs as checkpoints. | Modules 8–19 are digital information, the internet, data, impacts, the Create PT — half the course, none of it ours. Valuable only as a *sequencing* reference (see Pattern 5). |
| **5** | **AP CSA (Cortado)** | Class creation, objects, collections ≈ our 3.5/3.6/5.3/5.4 conceptually. | Java throughout, and it opens with objects (Unit 1) where we open with the SDLC. Sequencing insight only (Pattern 6). |

**Verdict:** *Video Game Design in JavaScript* is the spine to mine for the whole
course; *Introduction to Game Design* is the spine to mine for Units 5–7. AP CSP and
AP CSA are worth reading for how they *pace and assess*, not for what they teach.

---

## 3. The structural patterns worth taking

### Pattern 1 — A lesson is a 5-activity bundle with one objective, closed by a check

Every CodeHS lesson states a Description and an **Objective** ("Students will be able
to: …" as bullets), then 4–6 activities in a fixed rhythm:

```
Video or Notes → Example → Check for Understanding → Exercise → Exercise → Challenge
                              (the gate, not the closer)
```

Lesson 3.4, "Your First Sprites": Video → Example (`Sprite Face`) → Exercise
(`Exploration: Shapeshifter`) → Exercise (`Downhill Delights`) → CFU quiz → Challenge
(`Block Mario`).

The placement is the finding, and it is consistent: **in the two fundamentals courses,
not one of the 94 lessons that carries a Check for Understanding ends on it** — all 94
put the check directly after the concept and keep exercising afterwards. A quiz is a
gate on the reading, not a cap on the lesson.

**Our gap.** shCode has no lesson layer: the tree is `module → screen`, and a module is
20–45 screens. Units 5.1 (23), 5.3 (36), 6.7 (31) and 2.1 (43) have no internal
closure point — a student reads ten screens before anything asks them anything, and
the module objective is stated once in `curriculum/modules/*.md`, which the student
never sees.

### Pattern 2 — A concept module is followed by a practice-only module

`videogamedesign` modules 4, 6, 8 and 10 contain exactly one lesson each — "Graphics
Challenges", "Control Structures Challenges", "Functions Challenges", "Animation
Challenges" — an open problem set with no new instruction.

**Our gap.** We have `Challenges: Stretch Problems` (13 screens, e.g. `2-1-41`), but it
is a screen inside the module, not a bounded practice block a student can be sent to
after the concept work. A one-lesson "Challenges" module after each concept module
makes the concept/practice alternation visible on the module list.

### Pattern 3 — The project spine with just-in-time concepts

This is the boldest move and the one I would not copy wholesale. In `gamedesign` the
students start Mini Golf in module 4.1–4.2, then **Booleans and If/Else are taught in
4.3–4.4 because the putter needs them**, then the project resumes in 4.5. The concept
block lives inside the project, not before it.

**Our gap — and our reason.** shCode teaches conditionals in Unit 2 and starts moving
things in Unit 5; a student who meets `if` for the first time in a game loop has no
quiet console to learn it in. That ordering is deliberate and worth defending. What
*is* transferable is the smaller version: within Units 5–7, run a project spine and
inject the module's concept into it — e.g. 6.4 camera work taught as a step of the
arcade build rather than beside it.

### Pattern 4 — Every project closes with the same five-step ritual

Mini Golf (4.7), Projectiles (5.8) and Jumper (6.8) each end identically:

1. `Level #2 Intro` (Notes)
2. `Planning Level #2` (Free Response)
3. `Project - Developing Level #2` (Challenge)
4. `Playtesting and Feedback` (Free Response)
5. `<Project> Reflection` (Free Response)

Same words, same order, three times. Students learn the ritual once and the third one
costs almost no instruction.

**Our gap.** Unit 7 is two screens — `7.1.1 Arcade Cabinet (Q2 Synthesis)` and
`7.1.2 Q2 Reflection` — so the project has a close, but a single one: no second level,
nothing between "build it" and "reflect on it". CodeHS's ritual puts a planning step,
a harder variant and a playtest-and-feedback step in that gap, and repeats the shape
so it carries no instruction by the third time.

### Pattern 5 — Assessment cadence is predictable and named

- `videogamedesign`: every concept module ends with `<Topic> Quiz`.
- AP CSA: **every** module ends with `Mid-Unit Assessment` then `End-of-Unit Assessment`.
- AP CSP: a `Practice PT` follows each pair of concept modules — Pair-Programming Paint,
  Tell a Story, Steganography, Create an Image Filter — each a small artifact graded
  like the real performance task.

**Our gap.** The whole course has 26 quiz screens, concentrated at chapter ends, plus
the group/individual PA pairs per chapter. The PA pair is stronger than anything CodeHS
has; the *middle* cadence (a quiz or small artifact every 1–2 modules) is thinner.

### Pattern 6 — Naming tells the student the mode, and the mode is a real taxonomy

`Exploration: Shapeshifter`, `Project - Walls`, `Debugging: Hiking App`, `Check Your
Understanding - Booleans`. The prefix is the activity type, and the type is what the
platform grades.

**Our status.** We already do this — `Reading:`, `Worked Example:`, `Lab:`, `Video:`,
`Slides:`, `Challenges:` are consistent across 689 screens. This one is done; the
lesson layer (§Pattern 1) is what is missing around it.

### Pattern 7 — Debugging is its own activity type

`Debugging: Printing Error` (2.2.4), `Debugging: Hiking App` (2.3.5),
`Debugging: Console Bear` (2.6.4) — deliberately broken programs, distinct from
exercises, 2% of activities. Our nearest equivalent is `1.2.28 Fix Ten Declarations`,
which reads as an assessment rather than a routine.

### Pattern 8 — Video does a fifth of the teaching

16% of `videogamedesign` activities are video, including "Live Coding: Variables" and
"Development with Pseudocode". We are at 5% (34 of 689), and 33% reading — the inverse
emphasis. Not automatically wrong for a reading-first course, but it is the single
largest proportional difference, and it is cheap to test on one module.

---

## 4. Where shCode is already ahead

Worth writing down so a CodeHS-shaped refactor does not throw it away.

- **Module front matter.** `curriculum/modules/*.md` carries SLO focus, a module goal,
  and pre-/post-requisite snapshots. CodeHS gives a module one sentence.
- **Two-part assessment.** Group PA + individual PA every chapter, with per-problem
  variants, an AI grader with required criteria, and deterministic checks (plan parser,
  model checker). CodeHS's unit quiz is a fixed-answer quiz.
- **Authored artefacts.** Flowchart authoring, requirement events, three-tries with
  solution release, the gradebook — none of it exists in the CodeHS model.
- **Depth per concept.** Our 3.5 (objects) runs 26 screens; CodeHS's object module runs
  5 lessons. That depth is why our PAs can be performance tasks.

---

## 5. If we take three things, take these

1. **Introduce a lesson layer inside modules** (Pattern 1). Not a new content type — a
   grouping record with `title`, `objective`, and an ordered list of screen ids, 4–6
   screens each, last one always a check. Unit 2.1 (43 screens) is the proof case: it
   becomes ~8 lessons of 5, each with one sentence a student can read.
2. **A standard project close** (Pattern 4): second level → plan → build → playtest →
   reflect. Apply it to 7.1 first, then to 5.x/6.x project screens.
3. **A practice-only module after each concept module** (Pattern 2), promoted from the
   existing Stretch Problems screens. Zero new content, a visible rhythm on the module
   list.

Deliberately *not* recommended: just-in-time concepts inside projects (Pattern 3) —
it assumes the students have no prior quiet console, which is the opposite of our
Unit 1–3 design.
