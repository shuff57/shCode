# Sub-builds: learn the mechanic in a throwaway sketch, then put it in the game

Design spec, drafted 2026-11-04 on `codehs-inspiration`. Nothing is built by this file.

**The problem.** A lab like `5.3.7 Lab: Score one point per touch` hands the student the
whole pinball table and asks them to add the edge check *inside it*. The mechanic and the
game arrive in the same breath: when the score is wrong, the student cannot tell whether
they misunderstand `wasTouching` or whether they put the line in the wrong `if`. The course
has readings and worked examples, but no rung where the student *writes* the mechanic alone,
where nothing else can be wrong.

**The pattern.** Every day-sized submodule gets a **sub-build**: one lesson on a blank canvas
with the smallest scene that shows the mechanic, its own starter, and cards that check only
that mechanic. The next lesson is the apply lab, which starts from the game in progress. The
sub-build's reference is the apply lab's starting point, so the two fit.

```
submodule (one day, 40-55 min)
  reading or example     8-10 min   teaches the idea, in the module's own words
  sub-build             10-12 min   one sprite or two, the mechanic alone, no game
  apply lab             15-25 min   the same mechanic, inside the game, starter = game so far
  check / challenge      0-15 min   only where the submodule closes one
```

**What a sub-build is not.** It is not the Worked Example: an example is a finished program
the student reads and runs, a sub-build is one they write. It is not a challenge: a challenge
is the apply step made harder. And it is not a second copy of the lab — the sub-build has no
score, no restart, no second sprite unless the mechanic needs one.

**Shape of a sub-build lesson.** Type `lab`, 10-12 minutes, 2-3 steps, 2-3 cards, one starter
of fewer than 40 lines. The starter holds the scene and nothing else: the canvas, the one
sprite the mechanic acts on, and a `// STEP` comment where the line goes. The cards name the
mechanic, never the game ("a new sprite is made on one frame per event", not "the popup
appears above the bumper").

---

## The sub-builds, by game

### 5.3 Pinball — 8 submodules, 5 new sub-builds

| Group (submodule) | Sub-build | Apply lab it feeds |
| --- | --- | --- |
| from-scene-to-game | — (the lab already builds the smallest table) | 5.3.4 Build the table |
| scoring-an-event | **Score once:** one ball, one bumper, a score, the frame before | 5.3.7 Score one point per touch |
| losing-and-restarting | **End and start again:** a 3-second timer, a lost flag, R | 5.3.10 Lose, and start again |
| make-it-yours | — (challenges) | — |
| sound-on-a-hit | **One key, one sound:** load in `setup()`, play in a branch | 5.3.14 A chime on every bumper hit |
| polish-labels-and-popups | **A word that floats and dies:** `.text`, `.life`, a `'none'` sprite | 5.3.17 Show the worth, pop the points |
| polish-physics-knobs | **Two balls, two masses:** same push, different `mass`; `gravityScale` | 5.3.19 Nudge the table |
| polish-close | — (playtest and reflection) | — |

### 5.4 Flappy — 4 submodules, 3 sub-builds

**Flap:** gravity plus one tap, no pipes. **Spawn and recycle:** a pipe made on a timer, moved
left, deleted and spliced. **Score once:** a gap passed, counted one frame. The check-and-extend
group takes none.

### 5.5 Snake — 4 submodules, 3 sub-builds

**Step on a grid:** one sprite moving cell to cell on `every()`. **Grow:** an array of body
cells, one added per food. **Search the body:** a loop that asks "am I in my own tail", and
the bug the loop prevents.

### 5.6 Pocket (pool) — 5 submodules, 4 sub-builds

**An aim line:** pointer, `line()`, `dist()`. **Pull back and let go:** direction and speed on
`mouse.released()`, power capped. **Slow to a stop:** `.drag`, "stopped" as speed under a
number, `new Walls()` rails. **A pocket you roll over:** `'none'` + `overlaps()` once.

### 6.16-6.21 Sling (catapult) — 6 submodules, 4 sub-builds

**An arm that turns:** `rotateTo` and `constrain` about the aim. **Launch:** a sprite made on
release, `direction`/`speed`, gravity arc. **Out and gone:** off-screen and `.life`, plus the
sweep. **Hits and a budget:** every shot against every block, one hit per shot, a block that
leaves.

### 6.22-6.27 Climb (Doodle Jump) — 6 submodules, 4 sub-builds

**Teaching that has to come first:** `addSensor` is taught nowhere in units 1-7. 6.22 must
introduce it on its own screen before the first lab: `feet = player.addSensor(0, h/2 + 2, w - 4, 4)`,
then `feet.overlaps(p)` for each platform. `colliding(ground)` alone is not enough - it is also
true against a wall or a platform's underside, so the player climbs walls.

**A platform and a foot:** `addSensor`, `overlaps` per platform, grounded reset each frame.
**Spawn and recycle:** platforms made above, moved down, deleted below. **Coins you climb
through:** `'none'`, `overlaps`, delete and splice. **A follower:** `direction = angleTo(player)`
and a speed below the player's.

---

## Structure: submodule = schedulable day

The submodule is the **existing lesson group** (`curriculum/groups/<module>.json`), promoted
from presentation to a schedulable unit:

- `group` becomes a date scope alongside `unit`, `module` and `lesson`, keyed
  `moduleId:groupId` (`5.3:scoring-an-event`) because group ids repeat across modules.
- The module page heading gains a due chip and a "3 of 4 screens done" count.
- Each group gets an anchor (`/module/5.3#scoring-an-event`) so a teacher can link a day.
- Everything else stays per screen, as today, so progress and locks still key on folders.

**Splitting a game into modules (option B) is not needed yet.** Measured today: Pinball 1.2
weeks, Flappy 0.6, Snake 0.6, Breakout 1.0, Pocket/Sling/Climb will land near 1.0. A module per
game is already the right size; the day-sized unit is the group. Split a game into two modules
only when it passes about 1.5 weeks or needs its own grade — then `repartition-units.mjs` moves
it in one command.

## Effect on the build plan

- **One new lesson per group that needs a sub-build**, 23 across the six games, each
  10-12 minutes. That adds ~4.5 contact hours to the games block, and it is the cheapest
  hour in the course: it is where the mechanic is actually learned.
- Inserting a sub-build mid-module renumbers that module's later lessons; `renumber-module.mjs`
  does it from one plan, folders keep their ids, progress is untouched.
- The batch table gains the sub-builds of the game each batch already builds; no new batch.
- `check-starters`, `check-live-blocks`, `check-lesson-groups` and the tolerance gate apply to
  a sub-build exactly as to a lab, so nothing new is needed to verify them.

## Open

1. **Does every group get one?** I would not: the plan and playtest groups have nothing to
   build alone. About 60% of groups, not 100%.
2. **Does the sub-build count for the grade?** Recommendation: no. 0 points, completion
   credit, like the closes — its reference answer is the apply lab's starter, so grading it
   would grade the same code twice.
3. **Does a sub-build appear in the module page list?** Yes, as its own row with a `lab`
   badge, immediately above the apply lab it feeds.
