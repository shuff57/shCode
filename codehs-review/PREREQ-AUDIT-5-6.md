# Prerequisite audit: units 5 and 6

Written 2026-11-05 on `codehs-inspiration` at `3dac9db6`. Read-only: nothing in `lessons/` was
changed. This file records what a student is asked to write, and whether the course has shown
it to them first.

> **Status: fixed.** Every finding below was applied on the same day. The before/after table
> and the verification results are in `PREREQ-FIXES-5-6.md`.

## Scope

All 297 authored lessons in units 5 and 6, in the order a student plays them, plus:

- the planned **Climb** arc, 6.22-6.27 (`OPTIONAL` in `LAYOUT-2026-11.md`, specified in
  `SUB-BUILDS.md`)
- the **5.17** capstone (built) and the **6.28** capstone (specified in `BUILD-YOUR-OWN.md`,
  not built)
- the unit 5 games (Pinball, Flappy, Snake) and the unit 6 games (Pocket, Sling)

Unit 7 is out of scope except where a unit 6 lesson or capstone depends on it.

## Method

1. Read every lesson's `lesson.json` (steps, hints, requirement descriptions) and `content.md`
   in play order, and recorded the first screen that introduces each API the games use.
2. Ran an automated first-mention scan over the 297 lessons for ~70 moSHion APIs
   (`/tmp/opencode/api_audit.mjs`), then hand-checked every API whose first mention fell in a
   game lab rather than a reading, worked example, or sub-build.
3. Walked each game chain lesson by lesson and asked: at the point the student must type this
   line, has a screen already shown it?

**"Taught"** here means a reading, worked example, slides, sub-build, or lab step/hint
introduces the idea before the student is asked to write it. Sitting unread in a starter file
does not count.

## Verdict

**The five authored game chains are structurally sound.** Every mechanic a game introduces has
a teaching screen and a sub-build inside the same chain before the lab that applies it. No
authored game depends on a unit 6 concept that unit 5 never taught.

**Five things are not covered**, and four of them are small edits:

| # | Where | What |
| --- | --- | --- |
| 1 | 5.17 capstone | Forbids rebuilding "the four games you already built", naming Pocket, which is 6.1-6.5 |
| 2 | 6.1.4 and 6.2.4 starters | `new Walls()` is used two modules before 6.3.1 teaches it |
| 3 | 6.20.1 reference solution | `startRound()` does not clear blocks or shots, and no requirement catches it |
| 4 | 6.28 capstone spec | Asks for `removeAll` (does not exist), `group.add` (not taught), Breakout (moved to unit 7), `after()` (untaught) |
| 5 | Climb 6.22-6.27 | Needs `addSensor`, which appears nowhere in units 1-7 |

---

## Findings by priority

### P1 - a student hits these

#### 1. 5.17 counts a game the student has not built

`lessons/5-17-build-your-own/lesson.json`:

- line 4: *"it cannot be one of the **four** games you already built"*
- line 18: *"If you combine two of **Pinball, Flappy, Snake and Pocket**..."*

Pocket is 6.1-6.5. A student at 5.17 has built three games: Pinball (5.3-5.9), Flappy
(5.10-5.12), Snake (5.13-5.16). The capstone asks them not to rebuild a game they have not
seen, and offers a combination involving it. This is also inconsistent with the capstone's own
AI check, which says "not one of the four games built in **this unit**".

**Fix:** "three games" and "Pinball, Flappy and Snake" in both places. If the intent is to
allow Pocket once unit 6 exists, the capstone needs a second, unit-6 version, not a rewrite of
this one.

#### 2. `new Walls()` is in two starters before it is taught

| File | Line | Content |
| --- | --- | --- |
| `lessons/6-1-pocket-4-lab-the-aim-line/script.js` | 10 | `const wall = new Walls();` |
| `lessons/6-2-pocket-4-lab-take-the-shot/script.js` | 10 | `const wall = new Walls();` |
| `lessons/6-3-pocket-1-reading-rolling-to-a-stop/content.md` | 27 | first explanation |

The 6.1.4 lab has three steps: run it, add the aim line, check it reads as a shot. None
mentions the wall. The student meets `Walls` as unexplained starter code twice, then gets the
explanation a module later, after the wall has already been used in two graded labs.

**Fix (applied):** 6.1.4 gained a step, "The rails", that has the student write `const walls =
new Walls();` and explains the four edges and their names; 6.3.1 is now a one-line recap. The
line was taken out of 6.1.4's starter so it is written, not read, and r3 checks it. The starter's
`wall.color = 'brown'` went too: the rails sit outside the canvas, so the colour was invisible
and misleading.

**What this turned up:** the rails could never stop anything. The cue ball was
`collider = 'none'` in every Pocket lab, and a `'none'` body is a sensor - it passes through the
static walls. Played headlessly, a max shot from x=200 reached x=1350 on a 400-wide canvas.
`collider = 'dynamic'` was set in 6.1.4, 6.2.4, 6.3.3 and 6.4.4 (starters and solutions); the
same shot now stops at x=389, on the rail. Measured, not assumed.

#### 3. 6.20.1's reset is incomplete, and the requirements do not catch it

`lessons/6-20-sling-1-lab-five-shots/solution.js`:

```js
function startRound() {
  for (let i = 0; i < 3; i++) { ... blocks.push(b); }
  shotsLeft = 5;
  won = false;
}
```

`blocks` and `shots` are module-level arrays and are never emptied. Press R after a round and
three more blocks are pushed on top of the survivors, while `shots` still holds deleted
sprites.

The lesson's own step is explicit: *"R rebuilds the wall, empties the shots and resets the
count. Put the rebuild in a `startRound()` so R and setup share it."* The reference solution
does two of those three things.

The lab has only two graded requirements, neither of which looks at `startRound`, so a
student can ship the broken reset and pass. The AI prompt does not ask about it either.

**Fix:** at the top of `startRound()`:

```js
for (const b of blocks) b.delete();
for (const s of shots) s.delete();
blocks = []; shots = [];
```

Then add one requirement (or one AI-prompt line) that checks R restores the wall to three
blocks. Otherwise the reference solution teaches the bug the next lesson debugs.

#### 4. The 6.28 capstone spec asks for things the course does not teach

`codehs-review/BUILD-YOUR-OWN.md` section "6.14 Build your own" (the spec for 6.28):

| Requirement | Problem |
| --- | --- |
| r1: `group.add` / `group.delete` (or `removeAll`) | `removeAll` does not exist in the engine; the method is `deleteAll()`. 6.1 teaches `new group.Sprite()`, not `group.add`, so a student following the lessons writes a different line than the card asks for |
| r5: "a camera that scrolls, an animated sprite, a grid level, or a joint" | fine - all four are taught (6.9, 6.9, 6.14, 6.13) |
| r6: "a timer that does something visible: `every()` or `after()`" | `every()` is introduced only in the 5.11.2 hint; `after()` is taught nowhere before 6.28 |
| one rule: "not Pinball, Flappy, Snake, Pocket, **Breakout**, Sling, Climb, Defender" | Breakout moved to unit 7 (7.13-7.17), so at 6.28 the student has not built it. Harmless as a "do not rebuild" list, but the 5.17 version of the same rule says "built in this unit" and is wrong there |

**Fix:** `removeAll` -> `deleteAll`; either teach `group.add` explicitly (one line in 6.1.3) or
change the card to `new group.Sprite()`; either drop `after()` from r6 or add it to the 6.21
challenge teaching (see P2-1).

#### 5. Climb needs `addSensor`, taught nowhere

`SUB-BUILDS.md` Climb outline, "A platform and a foot": *"`addSensor`, `overlaps` per platform,
grounded reset each frame."* The same mechanic is described in `DEEPEN-GAMES.md` 5.14.5.

`addSensor` has **zero** mentions in any lesson in units 1-7, in any reading, example,
sub-build, or lab hint. This is the one prerequisite the Climb arc cannot borrow: the player
must ask "is there a platform under my feet", and the course has only taught
`colliding(ground)`, which is also true against a wall or a platform's underside. Without
`addSensor` the student either climbs walls or needs a second, untaught trick.

**Fix:** one reading in 6.22 before the first lab, or a sub-build, showing
`feet = player.addSensor(0, h/2 + 2, w - 4, 4)` and `feet.overlaps(p)`. This is a real gap,
not a doc-drift artefact: the current Climb outline in `SUB-BUILDS.md` requires it.

The other Climb prerequisites are covered:

| Need | Taught |
| --- | --- |
| `overlaps(sprite)` | 6.4.1 (Pocket) |
| `angleTo`, `direction`, `speed` | 6.2.1 (Pocket) |
| `constrain` | 6.16.2 (Sling) |
| `'none'` collider | 6.4.1 |
| delete + splice sweep | 5.11.2, 6.18.2 |
| `static`, gravity | 5.2.6, 5.2.2 |
| `kb.pressing` / `presses` | 5.1.13, 6.3.3 |
| state and restart | 5.5.1-5.5.2 |
| `drawTop` | 5.11.3 (starter function + step) |

---

### P2 - thin coverage or wrong order

#### 1. `after()` is used in a challenge, taught nowhere

`lessons/6-21-sling-3-challenges-make-it-yours/content.md` line 9 offers
`after(60, () => { shotsLeft += 1; })` as a challenge answer. The only other mention in units
1-6 is a grading description in `5-11-flappy-sub-spawn-and-recycle/lesson.json` line 80.

Challenges are optional, so this does not block a student. It does mean the challenge cannot
be attempted from what the course taught.

**Fix:** add two sentences to the 6.21.3 challenge card explaining `after(frames, fn)` runs
once, and that it must be created outside `draw()` or it restarts every frame. If `after()` is
meant to be a real course API, it belongs in a reading, not a challenge.

#### 2. Flappy teaches `every()` in the sub-build, then grades `frameCount %`

- `5-11-flappy-sub-spawn-and-recycle/lesson.json` line 23: *"`every(90, () => { ... })` runs
  the function every 90 frames"*, with the same as the hint.
- `5-4-flappy-5-lab-pipes-that-come-and-go/lesson.json` line 20 teaches
  `frameCount % 90 === 0`, and its requirement regex (line 49) accepts **only** the
  `frameCount %` form.

A student who uses the API the sub-build just taught fails the lab. Both ideas are explained,
so nothing is untaught, but the two screens disagree about which one is the course's answer.

**Fix:** pick one. Easiest: change the 5.11.3 hint and regex to also accept
`every(N, ...)`, or change 5.11.2 to teach `frameCount % 90` and leave `every()` for the
optional timer reading.

#### 3. `HingeJoint` is used at 6.8.10 before the 6.13 joints module

`6.8.8` (pendulum) and `6.8.10` (car ramp) both use `HingeJoint`; the reading is 6.13.4.

This one is **covered in practice**: 6.8.10's own step 3 explains the joint in place
("pins two sprites at one point... the pin goes where the FIRST sprite is"), and 6.8.8's content
says it is a preview, *"you'll see joints again in W17: today, just read and feel the swing."*
The student is not asked to invent it.

**Worth a note only:** the pendulum preview is labeled, the car ramp is not. Add "you will meet
this properly in 6.13" to 6.8.10 step 3, so the student knows the mechanism is coming rather
than thinking they missed it.

#### 4. The wall that falls on its own is debugged after the final lab

`6.20.1` builds the wall with default (dynamic) blocks; `6.20.2` is the debugging lesson about
the wall toppling. That ordering is deliberate - debug the code you just wrote - but 6.20.1's
solution demonstrates the unstable wall and its requirements do not ask for stability. A
student can finish 6.20.1 with the "bug" and then be taught it was one.

**Fix (small):** in 6.20.1, either make the blocks `static` in the reference solution and let
6.20.2 introduce the dynamic case, or add one sentence to 6.20.1's last step: *"if your wall
falls over before you hit it, that is 6.20.2's problem - leave it."*

---

### P3 - polish and drift

1. **`rect()` one lesson early.** `5-13-snake-sub-step-on-a-grid/script.js` line 15
   pre-writes `rect(x, 200, CELL, CELL)`; the sub-build that teaches `rect` for the body is
   5.14.2. It is starter code the student does not type, and 5.1.23's optional challenges
   mention plain shapes, so this is low risk. Either add a half-line to 5.13.4 or accept it.
2. **5.17 r4 is looser than its description.** The card says "pushed into an array and the
   array is read in a loop"; the regex accepts any `.push(` or `new Group(` and never checks a
   loop. It also accepts `new Group(`, which is a unit 6 API, in a unit 5 capstone. Tighten to
   require both a push and a `for`/`forEach` over the same name.
3. **Doc numbering in `BUILD-YOUR-OWN.md`.** The three capstones are headed 5.7, 6.14 and 7.7;
   the actual numbers are 5.17, 6.28 and 7.21. Anyone reading the spec to build the lesson will
   look in the wrong module.
4. **`DEEPEN-GAMES.md` describes a different Flappy and Snake.** Its 5.4.x arc (timers with
   names, `.texture`, centred words, `constrain`) and its 5.14.x "Jumper" arc are not the built
   5.10-5.12 and 5.13-5.16 chains. Its prerequisite claims (`moveTowards`, `.texture`,
   `after()`) therefore describe lessons that do not exist. `moveTowards` and `.texture` are
   **not** required by the current Climb outline; `addSensor` is. Do not treat the DEEPEN list
   as the current gap list.
5. **Module screen tables in 5.10 and 5.13 are stale** - they predate the inserted sub-builds
   and misnumber the later labs.

---

## Game-by-game coverage

Baseline for every table: canvas, sprite, variables, input, velocity and the frame loop are
taught in 5.1.1-5.1.22 and are not repeated.

### Pinball (5.3-5.9)

| Mechanic | Taught | Applied |
| --- | --- | --- |
| Scene -> game | 5.3.2 | 5.3.4 |
| Collision is not an event | 5.4.1 | 5.4.3 sub-build |
| Score once per touch | 5.4.3 | 5.4.4 |
| Three bumpers in an array | 5.4.5 | 5.4.5 |
| State and restart | 5.5.1, 5.5.2 | 5.5.3 |
| Debug: round never ends | 5.5.4 | - |
| Sound on a hit | 5.6.1-5.6.2 | 5.6.3 |
| Debug: sound every frame | 5.6.4 | - |
| Popup that floats and dies | 5.7.3 | 5.7.4 |
| Physics knobs (mass, gravityScale, rotationLock, debug) | 5.8.1 | 5.8.3 |
| Two masses | 5.8.2 | 5.8.3 |

**Verdict: complete.** Every lesson in the chain is a teach-then-apply pair, including two
debugging lessons placed after the mechanic they debug.

### Flappy (5.10-5.12)

| Mechanic | Taught | Applied |
| --- | --- | --- |
| Gravity and a tap | 5.10.4 | 5.10.5 |
| Timer: `every(90, ...)` | 5.11.2 (hint) | 5.11.3 (**grades `frameCount %`** - see P2-2) |
| Array sweep: delete + splice, backwards | 5.11.2 | 5.11.3 |
| Debug: pipes never leave | 5.11.4 | - |
| Score once per pipe | 5.12.1 | 5.12.2 |
| Crash and restart | 5.12.3 | 5.12.3 |

**Verdict: complete except the timer API mismatch.** No untaught mechanic.

### Snake (5.13-5.16)

| Mechanic | Taught | Applied |
| --- | --- | --- |
| Grid: cell, pixel, one step | 5.13.2, 5.13.3 | 5.13.4, 5.13.5 |
| Steering on edge presses | 5.1.13 (`presses`), 5.13.3 | 5.13.5 |
| Body array, grow | 5.14.2 | 5.14.3 |
| Debug: never grows | 5.14.4 | - |
| Self-overlap | 5.15.2 | 5.15.3 |
| Debug: tail never bites | 5.15.4 | - |

**Verdict: complete.** `rect` is the only early mention, and it is pre-written starter code
(P3-1).

### Pocket (6.1-6.5)

| Mechanic | Taught | Applied |
| --- | --- | --- |
| Pointer press, hold, release | 6.1.2 | 6.1.3 |
| Aim line | 6.1.3 | 6.1.4 |
| `new Walls()` | **6.3.1** | **6.1.4, 6.2.4** (see P1-2) |
| `angleTo`, `direction`, `speed` | 6.2.1 | 6.2.2 |
| Drag / slow to a stop | 6.3.1 | 6.3.2 |
| `overlaps` | 6.4.1 | 6.4.2 |
| Pocket that swallows the ball | 6.4.1 | 6.4.3 |

**Verdict: one ordering gap (`Walls`).** Everything else is taught before use.

### Sling (6.16-6.21)

| Mechanic | Taught | Applied |
| --- | --- | --- |
| Arm turns with `constrain` | 6.16.2 | 6.16.3 |
| Launch on release, `direction` / `speed` | 6.17.1 | 6.17.2 |
| Off-screen sweep | 6.18.2 | 6.18.3 |
| Hits and a budget | 6.19.2 | 6.19.3 |
| Win / lose round | 6.20.1 | 6.20.1 |
| Debug: wall falls on its own | 6.20.2 | after the lab (P2-4) |

**Verdict: complete, with the reset bug in the reference solution (P1-3).**

---

## Climb (6.22-6.27, planned, OPTIONAL)

The arc is not built; this audits the outline in `SUB-BUILDS.md` and the module map in
`LAYOUT-2026-11.md`.

| Module | Mechanic | Prereq | Covered? |
| --- | --- | --- | --- |
| 6.22 | Platforms, foot sensor | `addSensor` | **No** - P1-5 |
| 6.22 | `overlaps` per platform | 6.4.1 | yes |
| 6.23 | Grounded reset each frame | 5.2.9 (ground check runs every frame), 6.4.1 | yes |
| 6.23 | Jump on `presses` only | 5.1.13, 6.3.3 | yes |
| 6.24 | Spawn above, move down, delete below | 5.11.2, 6.18.2 | yes |
| 6.25 | Coins through `'none'`, delete + splice | 6.4.1, 5.11.2 | yes |
| 6.26 | Follower: `direction = angleTo(player)` | 6.2.1 | yes |
| 6.27 | Playtest, extend | 5.9.1 pattern | yes |

Only `addSensor` is missing. The rest of the arc is assembled from Pocket, Sling, Flappy and
Snake mechanics that are already taught.

---

## Capstones

### 5.17 (built)

- Content: five requirements, all drawn from unit 5. Checked in full; r1-r5 each cite a
  lesson that teaches the idea.
- Bug: the "four games" text (P1-1).
- Weakness: r4's regex (P3-2).

### 6.28 (specified, not built)

- Spec: `BUILD-YOUR-OWN.md`, section headed "6.14 Build your own".
- Three real problems: `removeAll`, `group.add`, `after()` (P1-4).
- Requirements r2-r5 are all backed by taught lessons: state machines 6.11, `storeItem`
  6.10, sound 6.15, camera 6.9, animation 6.9, grid 6.14, joints 6.13.
- The "not Breakout" rule is harmless but should read "built so far", not "built in this
  unit", because Breakout is a unit 7 game.

---

## Doc drift found while auditing

| File | Problem |
| --- | --- |
| `BUILD-YOUR-OWN.md` | Capstones headed 5.7 / 6.14 / 7.7; actual 5.17 / 6.28 / 7.21 |
| `BUILD-YOUR-OWN.md` | 6.28 r1 names `removeAll`, which does not exist |
| `DEEPEN-GAMES.md` | Describes a 5.4 Flappy arc and a 5.14 Jumper arc that were never built; its `moveTowards` / `.texture` / `after()` prereq list is not the current plan |
| `codehs-review/SUB-BUILDS.md` | Numbered 5.7/5.8 for Sling/Climb; actual 6.16-6.21 and 6.22-6.27 |
| `5.10` and `5.13` module docs | Screen tables predate the inserted sub-builds |

`LAYOUT-2026-11.md` is the current map and the numbering in this report follows it.

---

## What this audit did not check

- **Whether the lessons actually run.** No sketch was executed, no starter was rendered, no
  grader was fired. This is a reading of the authored text, not a test pass.
- **Whether the prose is good.** Clarity, pacing, and reading level were out of scope.
- **Unit 7 prerequisites for unit 7 games.** Only unit 7 APIs that a unit 6 lesson or capstone
  reaches for were checked.
- **The 8.1 performance task.** It was not compared against this coverage.
- **Climb as built code.** The arc does not exist yet; the audit is against its spec.
- **Automated first-mention completeness.** The scan covered a hand-written list of ~70 APIs.
  An API missing from that list would not have been flagged unless it appeared while reading
  the chains.
