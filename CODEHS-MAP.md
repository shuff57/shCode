# shCode → CodeHS counterpart map

Companion to `CODEHS-INSPIRATION.md`. One row per shCode module, its closest CodeHS
lesson(s), and what an auditor should compare. Built 2026-10-29 from the public
`/course/<slug>/explore` pages and each lesson's public activity list.

**Fit levels**

| Fit | Means |
| --- | --- |
| **Exact** | Same idea, same order; the CodeHS lessons could be renamed into our slots. |
| **Close** | Same idea, different depth or a different language. Worth a side-by-side. |
| **Partial** | Overlaps one activity or one paragraph; neither course owns it. |
| **None** | No counterpart anywhere in the five courses checked. |

Courses checked: `gamedesign` (Introduction to Game Design: the code is **p5play**, and some lesson prose still calls it JSGameLib;
`/course/jsgamelib/explore` is a 404, and the course syllabus is titled "Intro to Game Design
with p5play"),
`videogamedesign` (Video Game Design in JavaScript), `introjs_corgi`
(Introduction to CS in JavaScript), `apcsp_js` (AP CSP in JavaScript),
`apcsacortado` (AP CSA). Unit 8 (3D) is out of scope per the brief.

Screens = `lesson.json` count by the `unit` field, which is authoritative — the folder
prefix is not always the unit (5.7 lives in `5-3-*`, 6.2 in `6-1-*`, 6.8 in `6-7-*`).

---

## Unit 1 — Foundations

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 1.1 Software Lifecycle | 22 | AP CSP 1.16 *Debugging Strategies*; VGD 1.6 *Top Down Design and Decomposition in Karel* | Partial | CodeHS teaches decomposition and debugging but **never names a lifecycle model**. Our SDLC, four phases, four Ps and the prescriptive-limit screens have no counterpart — decide whether that is our advantage or over-teaching for a first unit. |
| 1.2 Variables and Data Types | 31 | VGD 2.2 *Variables*; GD 2.3 *Variables* (incl. *Live Coding: Variables* video) | Close | Theirs is one lesson of variables; ours is 31 screens through seven primitives, `null`/`undefined`, BigInt, `typeof`. Check whether our depth is load-bearing for later modules or just thorough. |
| 1.3 Documentation and Coding Conventions | 21 | VGD 1.7 *Commenting Your Code*; CSA 1.8 *Documentation with Comments* | Close | CodeHS has commenting only. Naming, reuse-vs-create, team vocabulary are ours. |
| 1.4 Programming Paradigms and Languages | 23 | AP CSP 3.1 *What is Code*, 3.2 *Uses of Programs*; CSA 1.1 *Introduction to Algorithms, Programming, and Compilers* | Partial | No paradigm taxonomy in CodeHS. Ours is the only place students meet procedural vs OOP vs declarative before 5.7. |
| 1.5 Program Design Tools and Environments | 45 | GD 2.1 *How to Think Like a Programmer* (Problem Decomposition ×2, Algorithms ×2); GD 2.6.6 *Development with Pseudocode*; CSA 1.7 *API and Libraries* | Partial | They plan in prose and pseudocode; we plan in flowcharts. Their pseudocode-before-build rhythm is worth comparing screen for screen. |
| 1.6 / 1.7 Chapter 1 PAs | 3 + 5 | AP CSP 2.1 *Practice PT: Pair-Programming Paint!*; VGD 4.1 *Graphics Challenges* | Partial | Their checkpoint is a small artifact; ours is a plan + writeup pair. Different assessment species — not a gap. |

## Unit 2 — Control flow

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 2.1 Conditionals | 43 | VGD 5.1–5.5 *Booleans → If/Else → Logical Operators → Comparison Operators → Graphics and Conditionals*; GD 4.3–4.4 *Booleans / If/Else Statements* | Close | Our 43 screens against their five lessons (≈25 activities). Their each-concept-then-exercise alternation is the pacing model to test ours against. |
| 2.2 Algorithms and Loops | 22 | VGD 5.6 *While Loops*, 5.9 *For Loops*; AP CSP 4.6–4.11 (*For Loops in JavaScript*, *General For Loops*, *For Loop Practice*, *Random Numbers*, *While Loops*, *Loop and a Half*) | Close | AP CSP's *Loop and a Half* has no shCode equivalent — check whether our loop module covers the sentinel/break-mid-body pattern at all. |
| 2.3 The Switch Statement | 31 | — | **None** | Not taught in any of the five courses (lesson titles searched). Either our differentiator or unnecessary weight in a JS course where `if/else` is idiomatic. This is the clearest keep-or-cut decision on the map. |
| 2.4 Loop Control and Nested Loops | 33 | VGD 5.7 *The Break Statement*; CSA 2.11 *Nested Iteration* | Partial | CodeHS's JS courses never go past `break`. Nested iteration only appears in Java. Compare against CSA's treatment if we want a second opinion on depth. |
| 2.5 Handling Errors with try/catch | 27 | AP CSP 1.16 *Debugging Strategies*; the `Debugging:` activity type (VGD 2.2.4, 2.3.5, 2.6.4) | Partial | **`try`/`catch` appears nowhere in the five courses.** Their answer to error handling is debugging exercises. Worth asking whether we teach the construct before students have ever debugged. |
| 2.6 / 2.7 Chapter 2 PAs | 3 + 5 | VGD 6.1 *Control Structures Challenges*; AP CSP Practice PTs | Partial | A one-lesson challenge set is their post-module assessment. Compare to our PA pair. |

## Unit 3 — Functions and data

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 3.1 Functions: Definition and Calls | 15 | VGD 7.1–7.4 *Parameters / Return Values / Default Parameter Values / Variable Scopes*; AP CSP 5.1–5.6; CSA 1.9 *Method Signatures* | Close | Our 15 screens against their 20 activities. Ours is leaner here than their equivalent — check nothing was cut that 3.2 assumes. |
| 3.2 Parameters and Return Values | 29 | same four VGD lessons; CSA 3.6 *Methods: Passing and Returning References* | Close | Default parameters (VGD 7.3) — do we teach them? |
| 3.3 Arrays | 24 | VGD 13.1–13.4 *Intro to Arrays / Adding & Removing / Iterating / Array Iteration with Graphics*; AP CSP 7.1–7.7 | Close | AP CSP splits into seven lessons including *Finding an Element* and *Removing an Element*; ours is one module. Compare coverage per operation. |
| 3.4 Function Expressions and Arrow Functions | 22 | — | **None** | Not in any course. Justified for JS (callbacks, array methods) but check whether 3.7 depends on it, because CodeHS teaches array methods without arrow syntax. |
| 3.5 Objects and Properties | 26 | VGD 14.1–14.5 *Intro to Objects / Graphic Objects / Object Methods / Iterating / Object Constructors*; CSA 3.3–3.8 | Close | CSA teaches objects in **Unit 1** and classes in Unit 3; we defer both to 3.5 and 5.6. Their ordering is the argument against ours — worth reading before defending it. |
| 3.6 Pass by Value/Reference | 17 | CSA 3.6 *Methods: Passing and Returning References of an Object* | Close | Java semantics vs JS. Only place any of the five courses touches the idea. |
| 3.7 Array Methods | 23 | VGD 13.5 *Array Methods* | **Exact** | Title-for-title match. Compare which methods each covers (`map`/`filter`/`forEach`/`reduce`?). |
| 3.8 Saving and Loading Data | 24 | — | **None** | No `localStorage`, no persistence anywhere in the five courses. Ours is the differentiator that makes 6.5 possible. |
| 3.9 / 3.10 Chapter 3 PAs | 3 + 4 | AP CSP 16.1–16.5 *Create Performance Task* scaffold | Partial | Their PT scaffolding (overview → guidelines → questions → planning) may be worth borrowing for our PA instructions. |

## Unit 4 — Synthesis

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 4.1 Q1 Synthesis Project (Print Shop) | 7 | VGD 11.1 *Breakout*, 12.1 *Snake Game*; AP CSP 6.1 *Project: Tell a Story* | Partial | Their project is a ladder of guided steps inside one lesson; ours is 7 screens. Compare the *step count* — a guided project in CodeHS is 8–20 built steps. |

## Unit 5 — Sprites (the closest match on the whole map)

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 5.1 Hello Sprite and Movement | 24 | GD 3.2 *Program Structure* (*Bounce Bounce Revolution*, *The Elevator*, *The Propeller*); GD 3.3 *Understanding the Canvas* (*Create a Canvas*, *Refreshing the Canvas*, *Shelving Boxes*); GD 3.4 *Your First Sprites* (*Sprite Face*, *Shapeshifter*, *Downhill Delights*, *Block Mario*) | **Exact** | Three of their lessons (20 activities) = our one module (24 screens). This is the row to run the lesson-layer experiment on: their three natural lesson boundaries are already the objective boundaries ours lacks. |
| 5.2 Physics Feel | 16 | GD 3.5 *The Physics of Sprites* — *Physics Engines and Gravity*, *Collisions*, *Physical Properties*, *Motion*, each followed by an *Exploration:* exercise, closing on *Sprite Physics Reflection* | **Exact** | Their loop is Notes → Exploration ×4 → reflection. Ours is 16 screens. Compare whether our students get the same four hands-on probes. |
| 5.6 Classes and Instances | 16 | VGD 14.1–14.5 *Objects*; CSA 3.3 *Anatomy of a Class*, 3.4 *Constructors* | Close | Nothing in GD (the game course) covers classes at all — they instantiate sprites without explaining them, which is exactly the "deliberate reveal" our 5.6 was built for. Confirm ours does the reveal and theirs never does. |
| 5.7 Writing Your Own Classes | 22 | CSA 3.3–3.8; VGD 14.5 *Object Constructors* | Close | CSA has constructors, `this`, scope/access, class vs instance methods across six lessons. Ours covers methods, `this.sprite`, composition, arrays of instances, and the procedural-vs-object comparison. |
| 5.8 Inside a Class | 20 | CSA 3.8 *Scope and Access*, and the class-variable lesson that closes the range the 5.4 row cites | Close | **Added 2026-10-29; not in the first audit.** Closes the `static`/class-variable question this table used to ask of 5.7: scope *inside* a class (3.2.24 taught local-vs-global only), access, `player.hit(enemy)`, `static spawned`, and a wave-spawner build. Unit 5 had no quiz at all before it. |

## Unit 6 — Physics and game systems

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 6.1 Groups and Overlaps | 5 | GD 5.3 *Groups and Tiles* — *Introducing Groups*, *Group of Boxes*, *Fountain*, *Introducing Tiles*, *Brick Man*, *Star Field* | **Exact** | Ours is 5 screens to their 6 activities. **Tiles have no shCode counterpart** — decide keep or cut. |
| 6.2 Overlaps and Collisions | 7 | GD 3.5.3–3.5.4 *Collisions* + *Exploration: Collisions*; GD 5.6 *Destroying Tiles*, *Looping Through Groups* | Close | Ours leads with the remove-during-iteration bug. Theirs never names it — check our bug-first framing is not scaring students off a pattern they could learn safely. |
| 6.3 Physics Applications | 10 | GD 3.5 *Physics of Sprites*; GD 6.2 *Character Movement*, *Character Jumps*, *A Camera That Follows* | Close | Their jump/ground-sensor work sits in a project (6.6 *Adding a Ground Sensor*), ours in a concept module. Compare which placement makes the edge-trigger idea land. |
| 6.4 Animated Sprites and Camera | 19 | GD 6.3 *Sprite Animations* (*Sprites in Games*, *Intro to Spritesheets*, *Creating Sprite Animations*, *Learning to Walk*, *Born to Run*); GD 6.2.6 *A Camera That Follows* | **Exact** | **Spritesheets** are a GD idea with no shCode counterpart. Their walk-cycle exercise is the model for a sprite-animation lab if we add one. |
| 6.5 Save and Load | 27 | — | **None** | 27 screens with no counterpart anywhere. Our biggest genuinely-original module. |
| 6.6 Game State Machines | 28 | GD 6.7 *End of Level* (*Ending Event* pseudocode → *The Ending Event* → *Game Over* → *Final Level Design*) | Partial | They teach an end-of-level flow, not a state machine. Compare whether our explicit state machine is worth the vocabulary. |
| 6.7 Advanced Input | 16 | GD 5.2 *Cannon* (*Moving the Cannon*, *Pseudocode for Cannon Rotation*, *Rotating the Cannon*) | Close | Their advanced input is mouse-angle aiming. Ours — check we cover the same case, since aiming is what the arcade capstone needs. |
| 6.8 Joints | 15 | — | **None** | No joints, no `applyForce`, nothing Box2D-specific in any course. Ours entirely. |

## Unit 7 — Capstone

| shCode | Screens | Closest CodeHS | Fit | What to compare |
| --- | ---: | --- | --- | --- |
| 7.1 Arcade Cabinet | 2 | GD 6.7.5 *Project - Final Level Design*; GD 6.8 *Level #2 Intro → Planning → Creating Level #2 → Playtesting and Feedback → Jumper Reflection*; VGD 17.1 *Project Prep and Development* | Partial | Their capstone close is a five-step ritual repeated on every project. Ours is 2 screens. See Pattern 4 in `CODEHS-INSPIRATION.md`. |

### Unit 8 and after — planned, not audited

The book's spine runs to **thirteen chapters** (`bookSHelf/projects/Introduction to Programming
Concepts and Methodologies/outline.md`); this map stops at 7 because everything after it is
either unbuilt or out of scope. Only the first section of chapter 8 exists in the app:

| Book chapter | Sections | In the app? |
| --- | --- | --- |
| 8 JSCAD Foundations | 8.1 Libraries and JSCAD Introduction · 8.2 2D Shapes and Transforms · 8.3 Boolean Operations in 2D · 8.4 Parameters and `getParameterDefinitions` · 8.5 Arrays in JSCAD / Loops | **only 8.1**, as 11 screens on the B-rep kernel (`status: draft`, quarter 3) |
| 9 3D Modeling | 9.1 First Extrusion · 9.2 3D Primitives and Transforms · 9.3 Error Handling and Debugging · 9.4 Testing Principles | no |
| 10 Synthesis — Fits-My-Stuff (Q3) | 10.1 | no |
| 11 Advanced Modeling | 11.1 Hulls and Advanced Extrusions · 11.2 Measurements and Printability · 11.3 Sorting and Searching on Geometry | no |
| 12 Production Pipeline | 12.1 Multi-File Projects and File I/O · 12.2 Colors, Text, and Export Formats | no |
| 13 Synthesis — Mechanism (Q4) | 13.1 Capstone Design Phase · 13.2 Capstone Build and Iterate · 13.3 Presentations and Reflection | no |

Fit would be **None** for all of it: none of the five CodeHS courses goes past a 2D canvas, and
none teaches parametric solid modelling, a build history or an exported mesh. CodeHS's nearest
neighbour is its separate three.js course, which was not among the six pulled.

**The trap waiting there:** the book's chapters 8–13 are written against **JSCAD**
(`getParameterDefinitions`, `union`/`subtract`, JSCAD's own error handling), and JSCAD is retired
in shCode — 8.1 was re-pointed at the B-rep kernel and reSHape Script. Building 8.2–9.4 from the
outline as written would rebuild the dependency the course is trying to leave.

Also unbuilt from the book's chapter 6: **6.9 Timing and Async** and **6.10 Sound and Texture**.

---

## What CodeHS teaches that we do not

| Topic | Where | Note |
| --- | --- | --- |
| Karel grid world (pre-JS) | VGD 1.x (17 lessons), Corgi 1.x, AP CSP 1.2–1.20 | Their on-ramp to sequencing, functions and loops. We start at `console.log`. |
| Tiles | GD 5.3 | Tile maps as a distinct data structure from groups. |
| Spritesheets / animation frames | GD 6.3 | Five activities. |
| Playtesting and feedback | GD 4.7.4, 5.8.4, 6.8.4 | Free-response step closing every project. |
| Digital information (binary, hex, compression, cryptography) | AP CSP 8.x (11 lessons) | Whole quarter of AP CSP. Not in our course. |
| The Internet (DNS, routing, packets, cybersecurity) | AP CSP 11.x (12 lessons) | Idem. |
| Data collection, visualization, limitations | AP CSP 13.x | Idem. |
| Impacts of computing | AP CSP 15.x, 12.1 | We touch ethics in 1.1; they give it modules. |
| Create Performance Task scaffolding | AP CSP 16.x | Their AP-specific PA structure. |
| 2D arrays, recursion, searching/sorting, `ArrayList` | CSA 4.x (19 lessons) | Java-only. |

## What we teach that CodeHS does not

| Topic | Module | Screens |
| --- | --- | ---: |
| `switch` | 2.3 | 31 |
| `try`/`catch` | 2.5 | 27 |
| Function expressions / arrow functions | 3.4 | 22 |
| `localStorage` persistence | 3.8, 6.5 | 24 + 27 |
| Box2D joints, `applyForce` | 6.8 | 15 |
| SDLC, four phases, four Ps, prescriptive limits | 1.1 | 22 |
| Paradigm taxonomy | 1.4 | 23 |
| Flowchart authoring | 1.5 | 45 |
| Group + individual PA pair per chapter, AI-graded | 1.6/1.7, 2.6/2.7, 3.9/3.10 | 28 |

---

## How to run the audit off this map

1. **Coverage pass — the five `None` rows.** 2.3 switch, 3.4 arrow functions, 3.8
   save/load, 6.5 save/load, 6.8 joints. Three of the five are load-bearing for later
   work (3.8 → 6.5 → 6.6); switch and arrow functions are the ones genuinely worth
   re-justifying.
2. **Order pass — 3.5 versus AP CSA.** CSA puts objects in Unit 1 and classes in Unit 3;
   we put both after two units of procedural work. Read CSA 1.12–1.15 (*Objects:
   Instances of Classes*, *Object Creation and Storage*, *Calling Instance Methods*)
   before defending our order.
3. **Form pass — the six `Exact` / `Close` rows in Units 5–6.** For each, take CodeHS's
   lesson boundaries and check whether ours has a matching internal seam. 5.1 against
   GD 3.2–3.4 is the first experiment; 5.2 against GD 3.5 is the second (their four
   *Exploration:* probes vs our 15 screens).
4. **Assessment pass — where their check sits.** In the two fundamentals courses, all
   94 lessons that carry a Check for Understanding put it immediately after the concept
   and keep exercising. Ours puts quizzes at module ends. Pick one module and try the
   mid-lesson gate.
5. **Naming pass — not needed.** `Reading:`, `Worked Example:`, `Lab:`, `Video:`,
   `Challenges:` are already consistent. The missing layer is the lesson, not the label.

---

## Pilot status (2026-10-29)

**5.1 is grouped.** `curriculum/groups/5.1.json` splits its 24 screens into six
lessons whose seams are CodeHS's — *Program Structure* → *The Canvas* → *Your First
Sprites* — with an objective each:

| Lesson | Screens | Minutes | Ends in |
| --- | ---: | ---: | --- |
| 1 The frame loop | 4 | ~30 | worked example |
| 2 The canvas and the sprite | 6 | ~30 | reading |
| 3 Hello Sprite | 2 | ~23 | lab |
| 4 Keyboard input and velocity | 4 | ~30 | reading |
| 5 The else-to-zero rule | 4 | ~40 | lab |
| 6 Build it and prove it | 4 | ~110 | worked example |

The layer is presentational: a heading above each group on the module page, and a
nothing on the individual screens (a per-screen banner was tried and removed). Progress, the sequential
lock, due dates and "X of Y" are still per screen, unchanged.

**No new check screens in 5.1.** Five of its six lessons already end in a lab, an
example or a challenge; a quiz there would be busywork. The rule recorded in
`curriculum/groups/README.md`: a lesson needs a check when its last screen is a
reading or a video — which points at 1.2, 1.5, 3.2, 6.5 and 6.7, not at 5.1.

**Content pass on 5.1 (same day).** Reordered and rewritten so nothing is asked before
it is taught: 5.1.7 became an exploration, 5.1.14 is a new key-names reading
(WASD and arrows), 5.1.21 is a new `text()` reading, 5.1.20 lost its `update()`,
gravity and dynamic-sprite steps, and Falling Block moved to 5.2.3. The lesson table
above shows the earlier six-lesson split; the current groups are in
`curriculum/groups/5.1.json` (4, 6, 2, 5, 3 and 4 screens).

Next module to group: 5.2, against GD 3.5 (*The Physics of Sprites*), which is a
Notes → Exploration ×4 → reflection loop in four clean lessons.
