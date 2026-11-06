# Prereq fixes, units 5 and 6: the new order against the original

Applied 2026-11-05 on `codehs-inspiration` at `3dac9db6`. Companion to
`PREREQ-AUDIT-5-6.md`; that file records what was wrong, this one records what changed.

## The order table

Every row is a place where the student's path changed. "Original" is the order a student met
the idea before this pass; "Fixed" is the order they meet it now. Nothing was renumbered -
these are content and sequencing changes inside existing slots.

| # | Idea | Original order | Fixed order |
| --- | --- | --- | --- |
| 1 | Capstone game count | 5.17 says "four games you already built" and names Pocket; Pocket is 6.1-6.5, so the student has built three | 5.17 says "three games"; the combination example uses Pinball + Snake, both built |
| 2 | `new Walls()` | 6.1.4 uses it unexplained -> 6.2.4 uses it unexplained -> 6.3.1 explains it | 6.1.4 step 2 builds it (four static rails, the four names); 6.2.4 recalls it; 6.3.1 is a recap |
| 3 | Flappy timer API | 5.11.2 teaches `every(90, ...)` -> 5.11.3 grades only `frameCount % 90` | 5.11.2 teaches `every(90, ...)` -> 5.11.3 accepts either form |
| 4 | Sling restart | 6.20.1 step asks for a clear + rebuild -> starter and solution only add -> rubric ignores the reset | 6.20.1 step, starter, solution and rubric all clear before rebuilding |
| 5 | `after()` | 6.21.3 challenge uses it with no explanation | 6.21.3 explains the call and where it may sit |
| 6 | `addSensor` | Climb 6.22 spec requires it; no lesson in 1-7 teaches it | 6.22 spec makes it the first teaching screen of the arc |
| 7 | 6.28 capstone APIs | `group.add`, `removeAll`, Breakout, `after()` | `new group.Sprite()`/`group.add`, `deleteAll()`, no Breakout, `every()` |
| 8 | Joints | 6.8.10 uses `HingeJoint`, explained in its step, no pointer to the joints module | same, plus a pointer to 6.13 |
| 9 | The ball is solid | the Pocket ball is `collider = 'none'` in 6.1-6.4, so the rails cannot stop it: played headlessly, a shot from x=200 sails to x=1350 on a 400-wide canvas | `collider = 'dynamic'` in all four labs: the same shot stops at x=389, on the rail |
| 10 | Drag strength | `.drag = 0.02` in 6.3-6.4 decays about 2% per second, so a shot crosses the table and hits a rail instead of rolling to rest | `.drag = 1`: a soft shot dies on the table (pull 24 stops at x=308 after 2.5 s) and the sink window is a mid-range pull of 48-68 |

## The same thing as a play-order walk

### Unit 5

| Slot | Original | Fixed |
| --- | --- | --- |
| 5.10.4 | Sub-build introduces `every(90, ...)` | unchanged |
| 5.11.3 | Lab hint and grader accept only `frameCount % 90` | hint and grader accept `frameCount % 90` or `every(90, ...)` |
| 5.13.4 | `rect()` pre-written one lesson before 5.14.2 teaches it | unchanged; starter code, noted as low risk |
| 5.17.1 | "four games", Pocket offered as a combination | "three games", Pinball/Flappy/Snake only |

### Unit 6

| Slot | Original | Fixed |
| --- | --- | --- |
| 6.1.4 | `new Walls()` in the starter, no explanation; ball is a sensor | new step 2 "The rails" builds it: four static rails, their four names, and why the ball must be solid; r3 checks it |
| 6.2.4 | `new Walls()` in the starter, no explanation; ball is a sensor | starter keeps the rails; hint recalls the 6.1.4 object; ball is solid, so the rails stop the shot |
| 6.3.1 | First explanation of `Walls`; `drag = 0.02` | one-line recap of the rails built in 6.1.4; `drag = 1` with what the number means |
| 6.3.2 | `drag = 0.02` in the sub-build | `drag = 1` |
| 6.3.3 | ball is a sensor, so "slow to a stop" never meets a rail; `drag = 0.02` | ball is solid; `drag = 1`, so a soft shot visibly dies on the table |
| 6.4.4 | ball is a sensor, pocket static, `drag = 0.02` | ball is solid, `drag = 1`; pocket still static until the student makes it pass-through |
| 6.5.3 | sand patch raises drag to `0.08` | raises it to `6`, which is now the strong end of the scale |
| 6.8.10 | `HingeJoint` explained in step 3 | same, plus "you meet joints properly in 6.13" |
| 6.20.1 | `startRound()` pushes blocks, clears nothing; 2 AI rubric rows | `startRound()` deletes old blocks and shots, empties both arrays; 3 AI rubric rows |
| 6.21.3 | `after()` unexplained; "on R... no, on a key" artifact | `after()` explained; artifact removed |
| 6.22 | `addSensor` required by the spec, taught nowhere | `addSensor` is the first teaching screen of the arc (spec) |
| 6.28 | `removeAll`, `group.add`, Breakout, `after()` in the spec | `deleteAll()`, `new group.Sprite()`, no Breakout, `every()` (spec) |

## What changed, file by file

| File | Before | After |
| --- | --- | --- |
| `lessons/5-17-build-your-own/lesson.json` | "four games"; Pocket in the combination list; r4 accepted any `.push` or `new Group` | "three games"; Pinball/Flappy/Snake; r4 needs a push plus a loop, or a Group |
| `lessons/5-4-flappy-5-lab-pipes-that-come-and-go/lesson.json` | `frameCount %` only, in hint, r1, r2 and AI prompt | accepts `frameCount %` or `every(90, ...)` in all four |
| `lessons/6-1-pocket-4-lab-the-aim-line/lesson.json` | step 1 had no hint; 3 steps; 12 min | new step 2 "The rails" teaches `new Walls()`; r3 checks it; 4 steps; 15 min |
| `lessons/6-1-pocket-4-lab-the-aim-line/script.js` | `wall` pre-built with a colour; ball a sensor | ball solid; no rails in the starter, so the student writes the line |
| `lessons/6-1-pocket-4-lab-the-aim-line/solution.js` | same `wall`, ball a sensor | `const walls = new Walls();`, ball solid |
| `lessons/6-2-pocket-4-lab-take-the-shot/lesson.json` | step 1 had no hint | step 1 recalls the `walls` object from 6.1.4 |
| `lessons/6-2-pocket-4-lab-take-the-shot/script.js`, `lessons/6-2-pocket-4-lab-take-the-shot/solution.js` | ball a sensor, `wall.color = 'brown'` | ball solid, `const walls = new Walls();` (the colour line is gone: the rails are off screen) |
| `lessons/6-3-pocket-3-lab-slow-stop-count/script.js`, `lessons/6-3-pocket-3-lab-slow-stop-count/solution.js` | ball a sensor | ball solid |
| `lessons/6-4-pocket-3-lab-sink-it/script.js`, `lessons/6-4-pocket-3-lab-sink-it/solution.js` | ball a sensor | ball solid; the pocket stays static until the student makes it pass-through |
| `lessons/6-3-pocket-1-reading-rolling-to-a-stop/content.md` | introduced `new Walls()` for the first time; `drag = 0.02` | one-line recap of the rails built in 6.1.4; `drag = 1`, what the number means, and why `0.02` is nearly frictionless |
| `lessons/6-3-pocket-2-sub-slow-to-a-stop/lesson.json`, `solution.js` | `drag = 0.02` in the step, the hint and the reference | `drag = 1` |
| `lessons/6-3-pocket-3-lab-slow-stop-count/lesson.json`, `solution.js` | hint and reference used `0.02` | `1` |
| `lessons/6-4-pocket-3-lab-sink-it/script.js`, `solution.js` | `0.02` | `1` |
| `lessons/6-5-pocket-3-challenges-make-it-yours/content.md` | sand patch "raise its drag (say 0.08)" | "say 6", on the new scale |
| `lessons/6-20-sling-1-lab-five-shots/script.js` | `startRound()` added 3 blocks, left old blocks and shots | deletes old blocks and shots, empties both arrays |
| `lessons/6-20-sling-1-lab-five-shots/solution.js` | same bug as the starter | same fix |
| `lessons/6-20-sling-1-lab-five-shots/lesson.json` | step 4 said "R rebuilds", code did not; 2 rubric rows | step 4 teaches clear-then-rebuild; 3 rubric rows |
| `lessons/6-21-sling-3-challenges-make-it-yours/content.md` | `after()` in a challenge, unexplained; drafting artifact "on R... no" | `after()` explained; artifact removed |
| `lessons/6-3-10-a14-2-car-ramp/lesson.json` | joint explained, no forward pointer; help title said "scale" | adds 6.13 pointer; title matches the lesson ("layer") |
| `lessons/5-10-flappy-sub-gravity-and-a-tap/lesson.json` | Help pointed to 5.2.1 (wrong lesson) and 5.4.4 (old number) | Help points to 5.2.6 and 5.1.15 |
| `lessons/5-11-flappy-debug-pipes-never-leave/lesson.json` | Help pointed to 5.4.5 (old number) | Help points to 5.11.1 |
| `codehs-review/BUILD-YOUR-OWN.md` | capstones headed 5.7/6.14/7.7; `removeAll`; Breakout in unit 6; `after()` | 5.17/6.28/7.21; `deleteAll`; Breakout removed; `every()` |
| `codehs-review/SUB-BUILDS.md` | Sling 5.7, Climb 5.8; no `addSensor` note | 6.16-6.21, 6.22-6.27; `addSensor` teaching requirement |
| `codehs-review/DEEPEN-GAMES.md` | read as a current plan | status banner: superseded for Flappy/Snake; only `addSensor` survives |
| `curriculum/modules/5.10_flappy-the-flap.md` | 4-row screen table, lab at 5.10.4 | 5-row table, sub-build 5.10.4, lab 5.10.5 |
| `curriculum/modules/5.13_snake-grid-and-steering.md` | 4-row screen table, lab at 5.13.4 | 5-row table, sub-build 5.13.4, lab 5.13.5 |

## What did not change

- **No lesson was renumbered, renamed, moved or deleted.** 916 lessons, 916 distinct numbers,
  80 modules, no collisions.
- **No module order changed.** The unit 5/6 play order is identical; only the contents of
  existing slots changed.
- **Climb and 6.28 are still specs, not lessons.** The `addSensor` fix is a requirement written
  into `SUB-BUILDS.md`; the 6.28 fix is written into `BUILD-YOUR-OWN.md`. Neither lesson exists
  to edit yet.
- **5.13.4's early `rect()` is left alone.** It is pre-written starter code the student does not
  type, and 5.14.2 teaches it one lesson later.

## Verification

| Check | Result |
| --- | --- |
| `check-concept-order` | pass: 97 console labs, 44 features |
| `check-lesson-numbers` | pass: 916 lessons, 916 distinct numbers |
| `check-lesson-groups` | pass |
| `check-starters` | pass: every reference scores full, every starter does not |
| `check-live-blocks` | pass: 491 blocks, all match |
| `check-hints` | pass: 382/382 requirements carry a hint |
| `check-prompt-pointers` | pass: all 5 pointer checks |
| `check-carry-chain` | pass: 27 links, 0 problems |
| `check-slot-map` | pass: 53/53 rows agree |
| `test-lesson-solution-parity` | pass: dev and production answer identically |
| `check-solution-leak` | pass: 296 solution.js checked, none leaked |
| `check-assignment-codes` | pass: 86 codes, each on one lesson |
| `test-capstone-requirements` | pass: 19/19 cases |
| `check-help-pointer-titles` | 9 mismatches remain, down from 13; all pre-existing title-wording drift, none in the fixed paths |
| `test-moshion --corpus` | pass: all 606 runnable sketches run and draw |

Regex probes run directly against the new patterns:

- 5.17 r4: matches `push` + `for`, rejects `push` alone, accepts `new Group()`.
- 5.11.3 r1: matches both `frameCount % 90 === 0` and `every(90, ...)`.
- 5.11.3 r2: matches both the `if` beat and the `every()` callback, rejects a callback with no push.
- 6.1.4 r3: matches `const walls = new Walls();`, rejects the starter.

Headless playtests through `scripts/moshion-harness.mjs`, driving the real solution files:

| Sketch | Result |
| --- | --- |
| 6.1.4 solution, 180 frames, no input | ball at rest at (200, 200); no errors |
| 6.2.4 solution, max shot to the right | ball stops at x=389 on a 400-wide canvas, speed 0 (before the fix: x=1350, speed 10, off the table) |
| 6.4.4 solution, pull 48-68 at the pocket | ball sinks at (330, 300), `sunk` true; pulls 40 and below stop on the table, 72 and above roll over |
| 6.3.3 solution, pull 24 | ball slows from 200 to 308 and stops after 2.5 s, in open table |

## Drag retuned

`0.02` was two orders of magnitude too weak. moSHion maps `.drag` to planck's linear damping,
which decays by `e^-d` per second, not per frame: at `0.02` a ball at speed 10 is still at 8.87
after six seconds, so no shot ever rolled to rest - the rails stopped everything. Measured with
the real 6.3.3 and 6.4.4 solutions:

| drag | what a max shot does | pulls that sink (of 120) |
| --- | --- | --- |
| 0.02 (before) | crosses the table in 0.5 s, stops on a rail | about 8-16 (a 1-unit speed window) |
| 0.5 | stops on a rail | 28-40 |
| **1 (now)** | soft and medium shots die on the table; max shots reach a rail | **48-68** |
| 1.5 | stops on a rail | 72-96 |
| 2 | stops on a rail | 92-120 (max power only) |

`1` is the value where a student can see drag work (pull 24 stops mid-table in 2.5 s) and still
sink from a comfortable half pull. 6.3.1 now says what the number means instead of leaving its
size unexplained.

## What I could not verify

- **That any sketch runs in a browser.** The 606-sketch corpus and the four Pocket playtests ran
  headlessly through the moSHion harness, not in the real runner; rendering and the pointer were
  simulated.
- **That the 6.20.1 fix behaves on screen.** It is the same delete-then-rebuild pattern used in
  5.5.2 and 6.19, but the round was not played.
- **The 5.17 r4 regex against real student code.** Three hand-written samples only.
- **Climb and 6.28.** Both are still documents; the fixes are spec text, not authored lessons.
- **The full `npm test`.** Targeted checks were run, not the whole suite.
