# Disposition: CodeHS `gamedesign` (Introduction to Game Design)

Read 2026-10-30 from public pages (course id 21074): `/course/gamedesign/explore` for the 6 modules / 37 lessons, then every lesson page under `/course/21074/explore/module/<m>/lesson/<id>` (all 37 fetched). Lesson pages list activity numbers and titles only; **the pages show no activity types**. The "kinds" column is inferred from title prefixes (Project, Exploration, Check Your Understanding, Debugging, Live Coding, Pseudocode) and from the earlier map for the Level #2 ritual. Untitled-prefix activities are written "notes/reading?" where that is a guess.

Not seen: activity bodies, any code, any lesson content. Nothing here is copied text.

Note: activity titles on 3.1 still say "JSGameLib" (3.1.1, 3.1.5); the course is p5play-based per its syllabus (CODEHS-SEEDING.md correction). Treat the library name in those titles as a stale label.

Destinations use current shCode ids (5.1-5.4, 5.6-5.8, 6.1-6.8, 7.1). The owner's plan renumbers: Unit 5 functional, Unit 6 OOP (5.6 moves here), Unit 7 custom classes (5.7, 5.8), then the concepts block (now 6.x), then capstone. Destinations are written in current ids.

## 1. Lesson table

| id | title | activity kinds seen | destination | fit | note (idea only) |
|---|---|---|---|---|---|
| 1.1 | Intro to Games | reading, "what have you played" prompt, reflection | CUT: genre/appreciation framing; we start at console.log | None | A one-question "what games have you played" opener could be a single 5.1 warm-up prompt. |
| 1.2 | Unpacking a Game | 2 notes + 2 check-your-understanding, investigate, 3 identify (elements/components/mechanics), experience write-up | NEW: 5.3 Pinball opening screen (mechanic/component vocabulary) | Partial | Teach "mechanic vs component" as the words we use to decompose a game before building; cut the standalone lesson. |
| 1.3 | Categorizing Games | notes, perspectives, genres, pick games, categorize, reflection | CUT: survey lesson, no code | None | Perspective (top-down/side) is worth one sentence in 5.1/5.3 because it decides gravity. |
| 2.1 | How to Think Like a Programmer | notes, decomposition x2, algorithms x2 (non-code tasks) | 1.5 | Close | We already do decomposition/flowcharts; their unplugged "write steps for an everyday task" is a cheap warm-up. |
| 2.2 | Intro to JavaScript | print x2, intro-yourself, Debugging, check | 1.1 / 1.2 | Close | Covered. The Debugging activity type (fix a broken snippet) is the thing we lack as a named kind. |
| 2.3 | Variables | notes, live coding, exploration, check, Debugging, data exercise | 1.2 | Close | Covered, deeper in ours. |
| 2.4 | User Input | notes, greetings, exploration (guessing game), check, story | 1.2 / 2.1 (see gaps: prompt-style input) | Partial | We have no prompt/readline-style input module; games use keys and mouse instead, so likely nothing to take. |
| 2.5 | Basic Math | notes, practice, 2 applied exercises, check | 1.2 | Close | Covered. |
| 2.6 | Basic Functions | notes, variables in functions, program-flow trace, Debugging, check, pseudocode-then-build pair | 3.1 | Close | Take the "plan in pseudocode, then build your own function" pair as a 3.1 closer. |
| 3.1 | Introducing Libraries | notes, 3 playable game demos, docs page | 5.1 (opening) | Close | Show finished demos first, then the docs page as a thing students learn to read. Check 5.1 does this. |
| 3.2 | Program Structure | notes, reference page, 3 exercises (one Exploration), check | 5.1 (frame loop group) | Exact | Same setup/draw seam as 5.1's "frame loop" lesson. Keep the reference-page idea. |
| 3.3 | Understanding the Canvas | notes, create canvas, coordinates, helper fn, refresh, shelving exercise, check | 5.1 (canvas and sprite group) | Exact | Coordinates plus "refresh each frame". Their helper-function-for-coordinates step is a function-reuse hook. |
| 3.4 | Your First Sprites | notes, sprite exercises x3, Exploration, check | 5.1 (Hello Sprite group) | Exact | Same sequence; confirm we have a Check after sprites (5.1 has none by design). |
| 3.5 | The Physics of Sprites | 4 notes each followed by an Exploration (gravity, collisions, properties, motion), reflection | 5.2 | Exact | Notes -> probe loop and a closing reflection. Already the model for 5.2. |
| 4.1 | Mini Golf - Setup | design-process notes, project intro, decomposition, setup note, canvas step | 5.3 Pinball (opening) | Exact | Project opens by decomposing the game before code. Matches 5.3. |
| 4.2 | Mini Golf - Sprites | add sprites, 3 build steps, commenting pass | 5.3 | Exact | Build steps in small named pieces, then a "comment your code" step. |
| 4.3 | Booleans | notes, boolean questions, graphics booleans, examples, reflection, check | 2.1 (exists) plus a 5.3 mid-project beat for "was touching" | Partial | We teach booleans in Unit 2; the idea to take is re-meeting them at the moment the game needs a flag. |
| 4.4 | If/Else Statements | notes x2, check, Exploration, application | 2.1 (exists) plus 5.3/5.4 beats | Partial | Same: injection point, not new content. |
| 4.5 | Mini Golf - Interactions | drag, rotate, slow down, remove ball (4 build steps) | 5.3 (mouse-drag aim) / 6.7 Advanced Input | Close | Mouse drag-to-aim plus friction. 6.7 owns mouse aiming; 5.3 may need only the drag. |
| 4.6 | Mini Golf - Music and Score Display | notes, music, display score, update score | 5.3 (score) ; sound -> NEW: sound lesson | Partial | Score injection is in 5.3 already. Music has no home (see gaps). |
| 4.7 | Mini Golf - Hole #2 Challenge | intro, planning (free response), build challenge, playtesting (free response), reflection | 5.3 closer; ritual -> every project module | Partial | Take the five-step "level 2" close as a repeatable module ending (see Q3). |
| 5.1 | Projectiles - Setup | project intro, decomposition, setup note, canvas, ground | 5.4 Flappy (opening) | Close | Same decompose-first opening. Different game (projectile vs scroll). |
| 5.2 | Projectiles - Cannon | notes, sprites, move, rotation pseudocode, rotate | 6.7 Advanced Input (aim at mouse) | Exact | Pseudocode first, then rotate toward a point. Aiming is already in 6.7. |
| 5.3 | Groups and Tiles | notes, group of boxes, Exploration (fountain), tiles notes, tile exercise, Exploration (star field) | 6.1 Groups and Overlaps; tiles -> NEW: tile maps lesson (in 6.1 or the platformer build) | Exact (groups), None (tiles) | Groups are covered. Tile layout from a text map has no home. |
| 5.4 | Projectiles - Cannonballs | notes, cannonball group, firing | 5.4 Flappy (spawn/reap an array) or 6.1 | Close | Spawn-from-an-event is the same idea as pipe spawning. Sprites in a group, not an array, here. |
| 5.5 | Projectiles - Tower | notes, wood and stone groups, wood and stone tiles | 6.1 (two groups, different materials) | Partial | Different material per group fits 6.3 (bounce/density). Tile build is the only part with no home. |
| 5.6 | Projectiles - Destroying Tiles | notes, destruction pseudocode, prototype, loop through groups, destroy, limit destruction | 6.2 Overlaps and Collisions | Close | Remove on hit, loop through a group; ours leads with the remove-during-iteration bug. Add "limit it" (hit budget) as a follow-up. |
| 5.7 | Projectiles - Winning Scenario | notes, target, win message, win check | 6.6 Game State Machines (win state) | Close | Win as a state change; ours is a full state machine, theirs a flag. |
| 5.8 | Projectiles - Level #2 Challenge | intro, planning, build, playtest, reflection | ritual; see 4.7 | Partial | Repeat of the ritual. |
| 6.1 | Jumper - Setup | project intro, decomposition, setup note, framework, grass tiles | NEW: platformer build (see gaps) | None | Platformer is not in our plan; opening beats (decompose, tiles) are reusable. |
| 6.2 | Jumper - Character Prototype | notes, pseudocode, sprite, movement, jump, follow camera | 6.3 Physics Applications + 6.4 camera | Close | Movement plus jump plus camera as three small build steps in one lesson. |
| 6.3 | Sprite Animations | notes, spritesheet intro, create animations, Exploration (walk), run | 6.4 Animated Sprites and Camera | Exact | Spritesheets are in 6.4 already per MAP; confirm. |
| 6.4 | Jumper - Character Animation | notes, idle, walking | 6.4 | Close | Idle/walk switching by velocity. |
| 6.5 | Jumper - Collecting Coins | notes, decomposition, animated coins, collect, count | 6.1 + 6.4 | Close | Animated pickup in a group plus a counter. |
| 6.6 | Jumper - Improved Player Functionality | notes, get back up, jump mechanics, ground sensor | 6.3 Physics Applications (ground sensor) | Exact | Ground sensor and "when can I jump". 6.3 holds the edge-trigger idea. |
| 6.7 | Jumper - End of Level | notes, ending pseudocode, ending event, game over, final design | 6.6 Game State Machines | Close | End-of-level and game-over are two states. Ours teaches the machine. |
| 6.8 | Jumper - Level #2 Challenge | intro, planning, build, playtest, reflection | ritual; 7.1 Arcade Cabinet | Partial | Same close; relevant to the capstone. |

37 lessons, 37 rows.

## 2. Gaps in shCode this course exposes

1. **Tile maps** (layout from a text/array grid). 5.3 and 6.1-6.2 here lean on them. We have no home; fits best in 6.1 or a platformer build. Needs a 2D array, so it also touches 3.3.
2. **Sound/music** (4.6; the book's own unbuilt 6.10). No lesson.
3. **A platformer build** (movement + jump + ground sensor + coins + camera + end of level). We have the parts in 6.3/6.4/6.6 but no project that puts them together; our builds are Pinball, Flappy, Snake.
4. **Projectile/cannon build** (aim, fire, destroy blocks, win). Parts exist (6.7 aiming, 6.2 destroy). No build.
5. **Playtesting and feedback step** (written, per project). No equivalent anywhere in our modules.
6. **A "Debugging:" activity kind** (fix a broken snippet). We have it as content in places, not as a named kind.
7. **Pseudocode-before-code step inside a build** (their pseudocode activities before cannon rotation, destruction, ending, character). We use flowcharts in 1.5, not inside a game build.
8. **Planning/decomposing a game before coding** (setup lessons of every project). Our 5.3 opens from the physics scene; confirm each build opens with a decomposition screen.
9. **Perspective/genre vocabulary** (mechanic, component, perspective). Needed as words for design talk; no home.

## 3. Things in shCode this course does not justify

Nothing here is evidence against our modules; this course is thin. Weaker-justified only:

- **6.8 Joints, 6.5 Save and Load, 6.6 as a full state machine, 6.2's bug-first framing**: no counterpart; their win/lose is a flag. Keep on our own reasons (the map already records this).
- **7.1 at 2 screens**: this course's close is a five-step ritual every project; 7.1 is thinner than every project close here.
- **Unit 2/3 depth** (switch, try/catch, arrow functions): not taught here; this course's whole JS on-ramp is 6 lessons. Not a reason to cut, since it does not cover our later needs either.

## 4. Open questions for the owner

1. Tiles: add a lesson (and where: 6.1 or the first platformer build), or leave them out?
2. Build a **platformer** and/or **projectile** project, or stay with Pinball/Flappy/Snake and let 6.3/6.4/6.6 carry those ideas?
3. Adopt the five-step project close (intro, plan, build level 2, playtest, reflect) as a standard ending on every build module (5.3, 5.4, 5.5)? It overlaps with the PA rhythm.
4. Sound: new lesson inside a build (as here) or a standalone concepts module (book 6.10)?
5. Playtesting: a free-response step per build, graded by AI or ungraded?
6. Their activity titles say "JSGameLib" while the syllabus says p5play. Is that worth a note in CODEHS-MAP.md, or ignore?
7. Unit 2/3 "Debugging:" exercises: add as a named kind, or keep as content?
