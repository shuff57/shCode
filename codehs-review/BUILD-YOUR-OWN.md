# Build your own: one capstone at the end of units 5, 6 and 7

Design spec, drafted 2026-11-04 on `codehs-inspiration`. Nothing is built by this file.

**What this is for.** Every unit currently ends with a game the course chose. A student can
finish Unit 5 without ever deciding what a game should be. Three short capstones, one at the
end of each unit, make them decide three times, with the requirement list growing with the
unit, so that 8.1's eleven-item performance task is the fourth time rather than the first.

**This is not 8.1.** `8.1 Arcade Cabinet` is the Semester 1 synthesis: eleven capability
checks drawn from every unit, 15% of the course total, a design doc, a testing log, a
showcase. These three are **formative, 0 points, one lesson each**, and each is checked only
against its own unit. 8.1 stays exactly as it is.

**One rule across all three.** The game may not be a rebuild of a game the course already had
them build (Pinball, Flappy, Snake, Pocket, Breakout, Sling, Climb, Defender). It must be a
new idea, or a **deliberate combination of two of them**, and the pitch must name which two
and say what the combination changes. "Snake but with a gun" is not a combination; "Snake's
grid and Sling's aim, where the snake must be aimed" is.

---

## 5.17 Build your own: a small game, five mechanics

**After 5.16 Snake. Last lesson of Unit 5. About 60 minutes, mostly build time. 0 points.**

Unit 5 owns movement, physics feel, the edge check, arrays, score, lose and restart, words on
a sprite, `.life`, sound, and the physics knobs. Pointer aim, direction and speed, drag and
stop, and pass-through targets are Pocket's (6.1-6.4), so they do not belong on this card.
No classes and no groups yet, and the cards say so.

| # | Requirement | Checked as |
| --- | --- | --- |
| r1 | A sprite the player moves, by keys or by the pointer | `kb.pressing`/`kb.presses` or `mouse` controlling `x`/`y`/`vel`, in `update()` or `draw()` |
| r2 | Something to touch or avoid that scores **once per event** | a score change inside an edge check (`wasTouching`), a delete, or a flag — not under a level `colliding()` alone |
| r3 | A way to lose, and R starts again with the score back to 0 | a lost flag or state plus an `R` handler that resets the score, not only the sprites |
| r4 | At least three of one kind of sprite kept in an array, and swept | a `push` into an array and a loop that deletes *and* splices (or filters) what is finished |
| r5 | A label on screen, and one sprite that removes itself | `.text` on a sprite or `text()` in `drawTop()`, and a `.life` above 0 on a sprite that should expire |

A class of the student's own is **allowed but earns nothing here**: this unit is about doing
it with functions and arrays, and a card must never fail a student for knowing more than the
unit taught.

**AI-checked, not regex:** the README pitch. Two criteria — (a) it names the game's idea in
two sentences and its win and lose conditions; (b) it is not one of the three games built in
this unit, or, if it combines two, it names both and says what the combination changes.

## 6.28 Build your own: a bigger game, three states

**After 6.27 Climb. Last lesson of Unit 6. About 75 minutes. 0 points.**

Unit 6 owns groups, overlaps and collisions, physics tuning, camera and animation, saving,
state machines, advanced input, joints, grids, sound, Sling and Climb. Breakout moved to
unit 7 (7.13-7.17), so it is not a unit 6 capability. A class of the student's own is allowed
but earns nothing; the objects block is the next unit.

| # | Requirement | Checked as |
| --- | --- | --- |
| r1 | A Group of sprites, created and emptied as the game runs | `new Group()` with `new group.Sprite()` (or `group.add`), and `group.delete()` / `deleteAll()`, not an array alone |
| r2 | Three states and a way between them | a state variable set to three named values (`title`, `play`, `over` or the student's own), each changing what runs |
| r3 | Something that survives closing the tab | `storeItem`/`getItem` (or the engine's save) for a best score or a setting, read at start |
| r4 | Sound on one event, with a key that mutes it | `loadSound` + `.play()` in the branch where the event happens, and a mute flag the key flips |
| r5 | **One of:** a camera that scrolls, an animated sprite, a grid level, or a joint | whichever the student picks, used for something the game needs, not decoration |
| r6 | A timer that does something visible | `every()` starting, spawning, or ending something; `after()` also counts once 6.21 has introduced it |

**AI-checked:** the pitch, with the same two criteria as 5.7 plus (c) it names which of r5 it
chose and why that one.

## 7.21 Build your own: one game, in objects

**After 7.6 Defender, Part C. Last lesson of Unit 7. About 75 minutes. 0 points.**

Unit 7 owns classes, properties, constructors, methods, `this`, arrays of instances, statics
and the refactor. This is the unit where the answer to "how do I keep ten of these in step"
is finally "you do not".

| # | Requirement | Checked as |
| --- | --- | --- |
| r1 | A class you wrote, with a constructor and at least two properties | `class X { constructor(...) { ... } }` in the graded file, capitalised, not extending `Sprite` |
| r2 | At least three instances, made in a loop and kept in one array | `for`/`forEach` pushing `new X(...)`, one array |
| r3 | A method that changes that instance's own state | a method using `this.something =` or `this.something +=` |
| r4 | Removal in one place, after the frame, with no splice inside a loop | `filter` (or a single reverse splice pass) driven by a `removed`/`alive`/hp check |
| r5 | One mechanic from Unit 5 or 6, carried in | a Group, a saved score, a sound, a state machine or a camera — named in the pitch |

**AI-checked:** the pitch, with the same criteria plus (d) it says what the class version does
that a procedural version could not, in one sentence.

---

## Why these lists and not longer ones

8.1's eleven items are the union of everything, and they are deliberately hard to satisfy by
accident. The per-unit lists are the **subset that unit taught**, so a student who did the
labs can meet them without new instruction, and a student who only did the labs has to make
one decision the labs did not make: what the game is.

Each list is five or six items, every item is capability-level (any names, any structure),
and nothing pins a title, a sprite name or a file layout — the same rule 8.1 follows.

## Placement and cost

| Unit | Lesson | After | Count |
| --- | --- | --- | --- |
| 5 | **5.17** Build your own | 5.16 Snake | 1 |
| 6 | **6.28** Build your own | 6.27 Climb | 1 |
| 7 | **7.21** Build your own | 7.6 Defender, Part C | 1 |

Three lessons, about 3.5 contact hours in total, no new modules, no renumbering. They ship
inside their unit's last batch: 5.17 with Snake, 6.28 with Climb, 7.21 with the objects block
(a new batch after B10, before the integration round).

**Open for the owner:** whether the pitch is AI-checked (my recommendation, because "is this
a clone" is a judgement a regex cannot make) or read by the teacher.
