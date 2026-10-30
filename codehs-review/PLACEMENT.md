# Placement: where CodeHS ideas land in units 5, 6, 7 and after

Drafted 2026-10-30 from the four disposition files in this folder, the logged-in reads of Game
Design modules 4-6 (Mini Golf, Projectiles, Jumper) and AP CSA module 3 (`csa-3.3-3.9.md`).
**Working names and today's ids**: the final unit numbers (5 functional / 6 OOP use / 7 writing
classes) are not applied yet, so each row says where the module lives in the tree now.
Everything below is a proposal for the owner; nothing here is decided. Structure and ideas only,
no CodeHS text, problems or code.

## The rule all three CodeHS game projects follow

Every project (Mini Golf, Projectiles, Jumper) runs: **written decomposition, then build steps in
one cumulative program, with a concept lesson inserted exactly where the next step needs it,
pseudocode before each hard step, and a fixed close: level 2, playtest, reflection.** Quizzes
follow concept lessons, not projects. Our 5.3 and 5.4 follow the injection rule already; they lack
the written plan, the pseudocode step and the playtest/reflection close.

## Proposed placement

| Block | Module (today's id) | Status | Takes from | Gap it fills |
| --- | --- | --- | --- | --- |
| **5 functional** | 5.1 Hello Sprite and Movement | built | GD 3.2-3.4 | add one lesson: **reading the reference** (CSA 1.7) |
| | 5.2 Physics Feel | built | GD 3.5 | none |
| | 5.3 Project: Pinball | built | GD Mini Golf | add: written plan, playtest + reflection close |
| | 5.4 Project: Flappy | built | VGD Helicopter | add: pseudocode before the pipe loop; **random** and **timers** are inside it, not taught on their own |
| | 5.5 Project: Snake | to build | VGD 12.1 | an array that grows and is searched; **grid sense** |
| | (candidate) a **projectile/cannon** build | undecided | GD Projectiles | needs `Group`, which today waits until 6.1 |
| | (candidate) Breakout | undecided | VGD 11.1 | grid of sprites without groups |
| **6 OOP (use)** | 5.6 Classes and Instances | built | CSA 1.12-1.14 | keep whole; `this` stays early |
| | new OOP games x2-3 (not rebuilds) | to design | GD Projectiles/Jumper shape | proposed: Brick Breaker, wave shooter, boss fight |
| **7 writing classes** | **new opener: design before syntax** | to build | CSA 3.1 | draw the classes first |
| | 5.7 Writing Your Own Classes | built | CSA 3.3-3.5 | add a **Debugging:** step, an accessor/mutator full class |
| | 5.8 Inside a Class | built | CSA 3.6-3.8 | add a static **instance counter** exercise; static/scope order is open |
| **concepts / systems** | 6.1 Groups and Overlaps | built | GD 5.3 | **tiles** missing |
| | **new: grids and tile maps** | to design | GD 5.3, CSA 4.11-4.13 | 2D arrays have only a sliver in 3.3 |
| | 6.2-6.4, 6.7 | built | GD 5.6, 6.2-6.3, 5.2 | spritesheets are in 6.4; check |
| | **new: sound and music** | to design | GD 4.6; book 6.10 | no lesson anywhere |
| | 6.5 Save and Load, 6.6 State Machines, 6.8 Joints | built | none (ours) | keep on our own reasons |
| **capstone** | 7.1 Arcade Cabinet | 2 screens | GD 6.8, VGD 17.1, CSP M18 | grow into the five-step close with a design-thinking frame |

## Lessons and patterns to borrow (apply to every build module)

1. A **written decomposition** at the start of each build.
2. **Pseudocode** before each hard step.
3. **Playtest and reflection** as the close of each build.
4. A named **Debugging:** activity kind.
5. A **quiz after a concept lesson**, not only at module ends.
6. Small named **setup functions** in a growing project (their solutions decompose the scene).
7. A **runner-style harness** per class in the class unit.

## Decided by the owner, 2026-10-30

1. **Groups stay at 6.1.** Functional games (5.3-5.5) use individual sprites and arrays; no cannon/projectile
   build in the functional block for now.
2. **One grids module**: tile maps and 2D arrays, placed in the systems block after 6.1. moSHion has no tile-map
   support (`MOSHION-GAPS.md`), so the module needs a small library addition or a helper taught in the lesson.
3. **Random numbers and timers get a dedicated lesson before Unit 5** (not only inside 5.4). 5.4's inline use stays;
   the lesson comes first so 5.4 can point back to it.
4. **The five-step close (written plan, build, playtest, reflect) is adopted on every build module and is
   AI-graded like the PAs.** Each build module (5.3, 5.4, 5.5, the OOP games) gets plan/playtest/reflect screens
   with an `aiGrader` rubric. Lazy-grading rules apply (`feedback_pseudocode-grading-lax`): accept any phrasing
   of a correct idea.

## Still open

4. **Console user input.** Wanted at all, or keyboard-only from 5.1?
5. **Sound.** New lesson inside a build, or a standalone module?
7. **Breakout and a projectile build** as extra functional games, or hold at Pinball, Flappy, Snake?
8. **Inheritance.** CSA does not teach it, so it cannot settle the question. A name-only reading at
   the end of the class unit, or nothing?
9. **Static before or after scope/access** (CSA does static first; ours is built the other way).
10. **Hex/RGB colour reading** in Unit 5.
11. **Pacing.** 5.7 is about 4h45m, 5.8 about 3h, against a 1.75 contact-hour note; unresolved.
12. **Numbering.** Apply the unit-level repartition now or after Unit 5 content exists.

## What I could not check

The fit tallies in the four disposition files are the subagents' judgments. Counts were checked
against the public explore pages and match (CSA 61/4 modules, VGD 74/17, CSP 106/19, GD 37/6). Solutions
were read for three CSA exercises and one GD exercise; the rest were read by title and brief only.
