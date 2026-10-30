# CodeHS `videogamedesign` -- disposition for shCode

Course 20517, "Video Game Design in JavaScript": 17 modules, 74 lessons, 434 activities. Read 2026-10-30 from the public explore pages (no login). All 74 lesson pages were fetched; nothing is unseen.

**Limits of what the pages show.** They give lesson and activity titles only. Descriptions and objectives are empty, and activity type is not labelled. "Activity kinds" below is inferred from title words (Quiz, Live Coding, Exploration, Debugging, Badge, Project, Reflection); everything else is "untyped" (reads as exercise or notes). Nothing was copied: ideas and structure only.

Note: this course teaches the CodeHS Graphics library (circles, rectangles, timers) up to module 14. It has no sprites, physics or classes. It is a *spine* for the concept order in units 1-3 and a source of game ladders (Breakout, Snake, Helicopter), not for moSHion/p5play.

## 1. Lesson table

| id | title | activity kinds seen | destination | fit | note |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Introduction to Programming With Karel | 5 acts: quiz, 4 untyped | CUT: Karel intro | None | Nothing: we open at console.log in 1.1/1.2 |
| 1.2 | More About Karel | 5 acts: quiz, 4 untyped | CUT: Karel (grid world, pre-JS) | None |  |
| 1.3 | Karel Can't Turn Right | 6 acts: badge, quiz, 4 untyped | CUT: Karel (grid world, pre-JS) | None |  |
| 1.4 | Functions in Karel | 5 acts: quiz, 4 untyped | CUT: Karel (grid world, pre-JS) | None |  |
| 1.5 | The Main Function | 4 acts: quiz, 3 untyped | CUT: Karel main() | None |  |
| 1.6 | Top Down Design and Decomposition in Karel | 5 acts: quiz, 4 untyped | 1.5 (idea only) | Partial | Decompose-then-build idea already lives in 1.5 planning tools; no Karel needed |
| 1.7 | Commenting Your Code | 4 acts: quiz, 3 untyped | 1.3 | Close | Commenting is already in 1.3 |
| 1.8 | Super Karel | 5 acts: badge, quiz, 3 untyped | CUT: Karel (grid world, pre-JS) | None |  |
| 1.9 | For Loops | 8 acts: quiz, 7 untyped | CUT: Karel (2.2 covers for loops) | None |  |
| 1.10 | If Statements and Conditionals | 6 acts: quiz, 5 untyped | CUT: Karel (2.1 covers if) | None |  |
| 1.11 | If/Else Statements | 7 acts: badge, quiz, 5 untyped | CUT: Karel (2.1 covers if/else) | None |  |
| 1.12 | While Loops | 6 acts: quiz, 5 untyped | CUT: Karel (2.2 covers while) | None |  |
| 1.13 | How to Indent Your Code | 6 acts: badge, quiz, 4 untyped | 1.3 | Partial | Indentation as readability; confirm 1.3 says it |
| 1.14 | Control Structures Example | 4 acts: quiz, 3 untyped | CUT: Karel (grid world, pre-JS) | None |  |
| 1.15 | More Karel Examples and Testing | 6 acts: live-coding, quiz, 4 untyped | CUT: Karel | None | Live-coding-a-solve video format is the only takeaway (see 3 in gaps) |
| 1.16 | Challenge Problems | 6 acts: badge, 5 untyped | CUT: Karel | None |  |
| 1.17 | Programming with Karel Quiz | 1 acts: quiz | CUT: Karel | None |  |
| 2.1 | Hello World | 5 acts: quiz, 4 untyped | 1.1 / 1.2 | Close | First-program ladder: print, then personalise |
| 2.2 | Variables | 6 acts: debugging, live-coding, quiz, 3 untyped | 1.2 | Close | Includes a Debugging activity and a Live Coding video; 1.2 is deeper |
| 2.3 | User Input | 6 acts: badge, quiz, 4 untyped | NEW: input module (prompt-style input) or fold into 1.2 | None | No shCode lesson takes user input from a prompt; decide if needed before sprites |
| 2.4 | Basic Math | 7 acts: quiz, 6 untyped | 1.2 | Partial | Arithmetic exercises; confirm 1.2 has operator practice |
| 2.5 | Collaborative Programming | 4 acts: reflection, 3 untyped | CUT: pair programming (PA pairs cover collaboration) | None | Reflection prompt on working with a partner is the only idea |
| 2.6 | Random Numbers | 6 acts: badge, quiz, 4 untyped | NEW: Math.random inside 5.x games (inject, no module) | None | Random numbers arrive in 5.4 spawning today; no teaching screen of its own |
| 2.7 | Basic Functions | 6 acts: quiz, 5 untyped | 3.1 | Close | Function basics incl. flow-of-calls tracing |
| 2.8 | JavaScript Basics Quiz | 2 acts: badge, quiz | CUT: course-level quiz; 1.6/1.7 PAs close ch.1 | None |  |
| 3.1 | Intro to the Canvas and Graphics | 9 acts: live-coding, quiz, 7 untyped | 5.1 | Partial | Coordinates and a debug overlay for positioning; ours is sprite-based, canvas drawn by moSHion |
| 3.2 | More Graphics Objects | 8 acts: exploration, live-coding, quiz, 5 untyped | 5.1 | Partial | Compose a picture from shapes; fits a 5.1 lab not a module |
| 3.3 | Positioning Graphics Objects | 5 acts: quiz, 4 untyped | 5.1 | Partial | Positioning relative to canvas size and other shapes |
| 3.4 | JavaScript Graphics Quiz | 1 acts: quiz | CUT: quiz | None |  |
| 4.1 | Graphics Challenges | 3 acts: 3 untyped | 5.1 (stretch lab) | Partial | One-lesson open challenge set after a concept block |
| 5.1 | Booleans | 6 acts: exploration, quiz, 4 untyped | 2.1 | Close | Booleans-as-questions framing |
| 5.2 | If/Else Statements | 6 acts: badge, quiz, 4 untyped | 2.1 | Close |  |
| 5.3 | Logical Operators | 9 acts: quiz, 8 untyped | 2.1 | Close | &&, ||, ! with game-like scenarios |
| 5.4 | Comparison Operators | 9 acts: quiz, 8 untyped | 2.1 | Close | Comparison operators with ranges and parity |
| 5.5 | Graphics and Conditionals | 8 acts: quiz, 7 untyped | 5.1 / 5.3 | Partial | Conditionals driving visuals; ours drives sprites |
| 5.6 | While Loops | 6 acts: debugging, quiz, 4 untyped | 2.2 | Close | Includes a Debugging activity |
| 5.7 | The Break Statement | 7 acts: quiz, reflection, 5 untyped | 2.4 | Close | break; password-retry and dice-until patterns |
| 5.8 | While Loops and Graphics | 6 acts: debugging, 5 untyped | 2.2 / 5.1 | Partial | Loops that draw; ours uses loops to build sprite rows |
| 5.9 | For Loops | 10 acts: exploration, quiz, 8 untyped | 2.2 | Close | Includes an Exploration step first |
| 5.10 | For Loops and Graphics | 9 acts: badge, debugging, exploration, 6 untyped | 2.2 / 6.1 | Partial | Using the loop index for position and size; same idea as sprite grids |
| 5.11 | Javascript Control Structures Quiz | 1 acts: quiz | CUT: quiz | None |  |
| 6.1 | Control Structures Challenges | 3 acts: 3 untyped | 2.6/2.7 PAs | Partial | Open challenge set closing a module |
| 7.1 | Parameters | 9 acts: live-coding, quiz, 7 untyped | 3.2 | Close | Parameters with a Live Coding video |
| 7.2 | Return Values | 7 acts: quiz, 6 untyped | 3.2 | Close | Return values |
| 7.3 | Default Parameter Values | 6 acts: quiz, 5 untyped | 3.2 | Partial | Default parameters: confirm 3.2 teaches them |
| 7.4 | Variable Scopes | 8 acts: badge, exploration, live-coding, quiz, reflection, 3 untyped | 3.1 / 3.2 | Close | Scope; 3.2.24 teaches local vs global, 5.8 teaches it inside a class |
| 7.5 | Functions Quiz | 1 acts: quiz | CUT: quiz | None |  |
| 8.1 | Functions Challenges | 4 acts: badge, 3 untyped | 3.9/3.10 PAs | Partial | Mixed challenge set |
| 9.1 | Timers | 8 acts: project, quiz, 5 untyped | NEW: time-based events in 5.4 (inject) | Partial | setInterval-style timers; moSHion uses frame count, so teach as frame counting |
| 9.2 | Stopping Timers | 7 acts: badge, project, quiz, 4 untyped | NEW: time-based events in 5.4 (inject) | Partial | Stopping a timer = our spawn that ends; low need with a frame loop |
| 9.3 | Collisions | 7 acts: live-coding, project, quiz, 4 untyped | 5.2 / 6.2 | Close | Collision detection with a live-coding step |
| 9.4 | Mouse Click Events | 6 acts: project, quiz, 4 untyped | 6.7 | Close | Click events |
| 9.5 | More Mouse Events | 9 acts: badge, project, quiz, 6 untyped | 6.7 | Close | Drag, paint, move events |
| 9.6 | Key Events | 6 acts: project, quiz, 3 untyped | 5.1 | Close | Key events; ours via kb.pressing |
| 9.7 | Animation and Games Quiz | 1 acts: quiz | CUT: quiz | None |  |
| 10.1 | Animation Challenges | 2 acts: 2 untyped | 5.1 (stretch lab) | Partial |  |
| 11.1 | Breakout | 5 acts: badge, 4 untyped | NEW: 5.x Breakout (optional 4th functional game) | Partial | Bricks, ball, paddle, collisions as one guided ladder; overlaps Pinball |
| 12.1 | Snake Game | 4 acts: 4 untyped | 5.5 (planned Snake) | Exact | Grow-on-eat, self-collision, food; array that grows |
| 13.1 | Intro to Arrays | 7 acts: exploration, quiz, 5 untyped | 3.3 | Close |  |
| 13.2 | Adding & Removing from an Array | 7 acts: exploration, quiz, 5 untyped | 3.3 | Close | push/pop; arrays as parameters note |
| 13.3 | Iterating Through an Array | 8 acts: quiz, reflection, 6 untyped | 3.3 | Close |  |
| 13.4 | Array Iteration with Graphics | 7 acts: exploration, quiz, 5 untyped | 5.4 / 6.1 | Partial | Array of shapes updated each frame = Flappy obstacles |
| 13.5 | Array Methods | 6 acts: 6 untyped | 3.7 | Exact |  |
| 14.1 | Intro to Objects | 8 acts: quiz, 7 untyped | 3.5 | Close | Object literals and properties |
| 14.2 | Graphic Objects | 8 acts: exploration, reflection, 6 untyped | 3.5 / 5.6 | Partial | Objects as visual things; ours are sprites |
| 14.3 | Object Methods | 6 acts: exploration, quiz, 4 untyped | 3.5 / 5.7 | Close | Methods on objects |
| 14.4 | Iterating Through an Object | 8 acts: quiz, 7 untyped | 3.5 | Partial | for...in; confirm 3.5 covers |
| 14.5 | Object Constructors | 9 acts: quiz, 8 untyped | 5.7 | Close | Constructors; ends with a prototypes extension we would skip |
| 15.1 | Tic Tac Toe | 4 acts: badge, 3 untyped | NEW: grid/board game build (candidate, not scheduled) | None | 2D-array board logic; we have no turn-based game |
| 16.1 | Game Design: Helicopter | 1 acts: 1 untyped | 5.4 | Exact | Intro/spec for a flap-and-dodge game |
| 16.2 | Basics | 7 acts: badge, 6 untyped | 5.4 | Exact | Move, add obstacles, smooth movement (each as a paired explain+do) |
| 16.3 | Improvements | 8 acts: 8 untyped | 5.4 | Close | Wall and obstacle collisions, scrolling terrain |
| 16.4 | Polish | 8 acts: badge, 7 untyped | 5.4 / 6.4 | Close | Image, score, particles, extensions as polish steps |
| 17.1 | Project Prep and Development | 5 acts: project, 3 untyped | 7.1 | Close | Intro, plan, pseudocode, build, present: a 5-step capstone |

Module-level shape worth keeping in mind (from the lists above): modules 4, 6, 8, 10 are one-lesson "Challenges" blocks after concept modules; modules 11, 12, 15, 16, 17 are projects; every concept module ends with a quiz (a "Badge" activity closes many lessons).

## 2. Gaps in shCode this course exposes

1. **No user-input lesson.** Nothing in 1.x-3.x takes input from the person running the program (CodeHS 2.3). Check whether any later module assumes it before deciding.
2. **Random numbers have no teaching home.** Random appears inside 5.4/6.x builds but no screen teaches it (CodeHS 2.6). Inject at the first game that needs it (5.3 or 5.4) as a short worked example.
3. **Time-based spawning.** CodeHS gives timers two lessons (9.1-9.2). We use frame counting. 5.4 does this; confirm it teaches "every N frames" explicitly.
4. **Breakout and Snake as guided ladders.** 11.1 and 12.1 are step-by-step build ladders (bricks, ball and paddle, collisions; grow, collide, food). Snake is planned as 5.5; Breakout is a candidate fourth functional game. It would show grids of sprites before groups exist, so it conflicts with "nothing may use groups" in 5.3-5.5.
5. **Grid/board game with 2D data (Tic Tac Toe, 15.1).** We have no turn-based game or nested-array lesson.
6. **A bounded "Challenges" block after concept work** (modules 4, 6, 8, 10). Already noted in CODEHS-INSPIRATION Pattern 2; this course is the origin.
7. **Live Coding video** (a short solve narrated on screen) appears about 12 times. We have few videos.
8. **Debugging as an activity type** (2.2, 5.6, 5.8, 5.10). Same finding as Pattern 7.
9. **Capstone ritual.** 17.1 is intro, plan, pseudocode, write, present. Our 7.1 has 2 screens; planning and pseudocode steps are missing.

## 3. Things in shCode this course does not justify

Nothing here argues for cutting anything; the course is simply shallower. Items it does not cover at all: `switch` (2.3), `try/catch` (2.5), arrow functions (3.4), pass-by-reference (3.6), save/load (3.8, 6.5), state machines (6.6), joints (6.8), the SDLC and paradigm units (1.1, 1.4), flowcharts (1.5). Its object coverage (module 14) stops at constructors, with an optional prototypes extension. It teaches no inheritance of substance. So the OOP block (5.6-5.8) and units 6.x are justified only by the other courses (AP CSA, Intro to Game Design) already recorded in CODEHS-SEEDING.md. Absence from this course is not evidence against them.

## 4. Open questions for the owner

1. Karel: confirm the 17 Karel lessons are cut in full, not just reworked. Their only transferable content is decomposition (1.6) and the badge-per-lesson cadence.
2. User input (2.3): do we want a lesson on it, or does the course stay output-only until the sprite units?
3. Breakout (11.1): add it as a fourth functional game, or let Pinball, Flappy and Snake cover the ground? It overlaps Pinball's ball and paddle.
4. Tic Tac Toe (15.1): is a turn-based, 2D-array game worth a slot anywhere, or out of scope for a sprite-based course?
5. HANDOFF.md currently calls module 5.5 "Inside a Class" (20 screens) while the brief calls 5.5 Snake and the file tree has 5.8_inside-a-class.md. Which number is current? This table assumes Snake is 5.5.
6. Timers: do we teach the timer idea by name (setInterval) or only frame counting?
7. Do we adopt the CodeHS cadence of a one-lesson "Challenges" module after each concept block, or keep challenges as screens inside modules?
