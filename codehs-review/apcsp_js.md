# CodeHS `apcsp_js` (AP CSP in JavaScript) — disposition for shCode

Read 2026-10-30 from the public explore pages (course id 6166). All 19 modules and all 106 lessons were fetched; activity kinds come from each lesson page's icon labels. Structure only; no CodeHS text, problems or code is reproduced. Nothing was unreachable (a few lesson pages in 11.5-11.10 returned HTTP 405 once and were re-fetched fine).

Fit: Exact = same idea, same order. Close = same idea, different depth. Partial = overlap in one part. None = no counterpart.

Course shape in one line: M1 Karel (21) | M2 Practice PT | M3 JS basics + graphics + mouse (9) | M4 control structures (12) | M5 functions (9) | M6 PT | M7 arrays (9) | M8 digital information (11) | M9-10 PTs | M11 Internet (12) | M12-15 data/impact projects | M16 Create PT | M17 exam review | M18 design thinking (4) | M19 final. Every content module closes on a quiz (1.21, 3.9, 4.12, 5.9, 7.9, 8.11, 11.12, 13.4).

## 1. Lesson-by-lesson table

| id | title | activity kinds seen | destination | fit | note |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Welcome to AP CSP | Free Response, Video | CUT: orientation | None | course welcome; our 1.1 opens on console.log instead |
| 1.2 | Introduction to Programming With Karel | Check for Understanding, Debugging, Example, Exercise x2, Video | CUT: Karel | None | Karel basics; the ideas (statements run in order, commands) are in 1.1.3 first statement |
| 1.3 | More Basic Karel | Check for Understanding, Debugging, Example, Exercise x2, Video | CUT: Karel | None | Karel basics; the ideas (statements run in order, commands) are in 1.1.3 first statement |
| 1.4 | Karel Can't Turn Right | Badge, Check for Understanding, Example, Exercise x2, Free Response, Video | CUT: Karel | None | Karel-only badge lesson |
| 1.5 | Functions in Karel | Check for Understanding, Debugging, Example, Exercise x3, Video | 3.1 Functions: Definition and Calls | Partial | define-then-call idea taught on Karel; ours uses JS functions directly |
| 1.6 | The Start Function | Check for Understanding, Example, Exercise x2, Video | CUT: Karel | None | entry-point function convention; moot in our runtime (moSHion setup/draw covers it in 5.1) |
| 1.7 | Top Down Design and Decomposition in Karel | Check for Understanding, Debugging, Example, Exercise, Free Response, Video | 1.5 Program Design Tools (decomposition screens) | Partial | top-down decomposition; we do it in flowcharts and plan-first, not by splitting functions |
| 1.8 | Commenting Your Code | Check for Understanding, Example, Exercise, Free Response, Video | 1.3 Documentation and Coding Conventions | Close | commenting; ours also teaches naming and team vocabulary |
| 1.9 | Abstraction | Check for Understanding, Example, Free Response x3, Video | NEW: 7.x opener 'Abstraction and program design' (see section 2) | None | abstraction as hiding detail behind a name; matches the CSA 3.1 opener already recommended for Unit 7, no shCode lesson names it |
| 1.10 | Super Karel | Badge, Check for Understanding, Example, Exercise, Video | CUT: Karel | None | Karel extension libraries |
| 1.11 | For Loops | Check for Understanding, Example x2, Exercise x4, Video | 2.2 Algorithms and Loops | Partial | for loop introduced on Karel; counted repetition |
| 1.12 | If Statements | Check for Understanding, Example x2, Exercise, Survey, Video | 2.1 Conditionals | Partial | if / if-else on Karel sensors; ours is on JS values |
| 1.13 | If/Else Statements | Badge, Check for Understanding, Example x2, Exercise, Video | 2.1 Conditionals | Partial | if / if-else on Karel sensors; ours is on JS values |
| 1.14 | While Loops in Karel | Check for Understanding, Example, Exercise x3, Video | 2.2 Algorithms and Loops | Partial | while loop on Karel conditions |
| 1.15 | Control Structures Example | Check for Understanding, Example, Exercise, Video | CUT: Karel | None | combined control structures worked on Karel; our 2.6/2.7 PAs combine them in JS |
| 1.16 | Debugging Strategies | Check for Understanding x2, Debugging x4, Video x2 | 1.5 (1.5.41-43 debugging with console.log) / 2.5 | Partial | debugging as a named strategy with find-the-bug drills; ours has the console.log route but no standalone strategy lesson |
| 1.17 | Karel Algorithms | Check for Understanding, Example x2, Exercise, Video x2 | 1.5 Program Design Tools | Partial | algorithm design practice; Karel context cut |
| 1.18 | How to Indent Your Code | Check for Understanding, Example, Exercise x2, Video | 1.3 Documentation and Coding Conventions | Close | indentation as readability; one screen's worth |
| 1.19 | Ultra Karel | Badge, Check for Understanding, Example x2, Exercise x2, Video | CUT: Karel | None | Karel extension libraries |
| 1.20 | Karel Challenges | Badge, Challenge x5 | CUT: Karel | None | Karel challenge set |
| 1.21 | Introduction to Programming Quiz | Unit Quiz | pattern only: module-closing quiz | None | not content; cadence reference (our quiz at 1.1.23 and per-module PAs already do this) |
| 2.1 | Practice PT: Pair-Programming Paint! | Badge, Challenge, Check for Understanding, Connection, Free Response x6, Video | 1.6 / 1.7 Chapter 1 PAs (pattern only) | Partial | pair-built small artifact as a checkpoint; ours is plan plus writeup, different species |
| 3.1 | What is Code | Connection, Free Response, Video | 1.4 Programming Paradigms and Languages | Partial | what code is and what programs are for; ours is a taxonomy, theirs a motivation |
| 3.2 | Uses of Programs | Free Response x4, Video x2 | 1.4 Programming Paradigms and Languages | Partial | what code is and what programs are for; ours is a taxonomy, theirs a motivation |
| 3.3 | Hello World | Check for Understanding, Example, Exercise, Video | 1.1 Software Lifecycle (1.1.2-1.1.3 first statement) | Close | first output statement; ours uses console.log |
| 3.4 | Variables | AP Practice, Check for Understanding, Example, Exercise, Video | 1.2 Variables and Data Types | Close | declare, assign, reuse; ours goes far deeper (7 primitives, typeof) |
| 3.5 | User Input | AP Practice, Badge, Check for Understanding, Example, Exercise, Video | NEW: 1.2.x or 2.1.x 'Asking the user' (prompt / input) | Partial | user input as a value to store; we teach keyboard input in 5.1.13 but no console-style prompt lesson before it |
| 3.6 | Basic Math in JavaScript | AP Practice, Check for Understanding, Example x3, Exercise x3, Video | 1.2 Variables and Data Types (1.2.16 operators check) | Partial | arithmetic, operator order; no dedicated Math lesson (floor/round/remainder) in Units 1-3 |
| 3.7 | Using Graphics in JavaScript | Badge, Check for Understanding, Example x4, Exercise x2, Video | 5.1 Hello Sprite Movement (canvas screens) | Partial | drawing shapes at coordinates; ours is sprites on moSHion canvas, not primitive drawing |
| 3.8 | Mouse Events: Mouse Clicked | Check for Understanding, Example x2, Exercise, Video | 5.1 (5.1.13-14 input) | Partial | a first event handler; ours teaches keyboard first, mouse in 6.x |
| 3.9 | Programming with JavaScript Quiz | Badge, Unit Quiz | pattern only: module-closing quiz | None | cadence reference |
| 4.1 | Booleans | Check for Understanding, Example, Exercise, Video | 1.2.17-18 booleans + 2.1 Conditionals | Close | boolean values and what makes them; split across two of ours |
| 4.2 | Logical Operators | Check for Understanding, Example x3, Exercise x2, Video | 2.1 Conditionals | Close | combining and comparing conditions; AP Practice items are multiple choice |
| 4.3 | Comparison Operators | AP Practice, Check for Understanding, Example x2, Exercise x2, Video | 2.1 Conditionals | Close | combining and comparing conditions; AP Practice items are multiple choice |
| 4.4 | If Statements | AP Practice, Badge, Check for Understanding, Example x4, Exercise x2, Video | 2.1 Conditionals | Close | if / else if chains; ours 43 screens vs 10 activities |
| 4.5 | Key Events | Check for Understanding, Example, Exercise, Video | 5.1 Hello Sprite Movement (5.1.13-14) | Close | keyboard events; ours is polled input in a draw loop, theirs is an event handler |
| 4.6 | For Loops in JavaScript | Check for Understanding, Example, Exercise x3, Video | 2.2 Algorithms and Loops | Close | counted for loops, custom start/stop/step, practice patterns |
| 4.7 | General For Loops | Check for Understanding, Example x2, Exercise x2, Video | 2.2 Algorithms and Loops | Close | counted for loops, custom start/stop/step, practice patterns |
| 4.8 | For Loop Practice | Check for Understanding, Example, Exercise x3, Video | 2.2 Algorithms and Loops | Close | counted for loops, custom start/stop/step, practice patterns |
| 4.9 | Random Numbers | Check for Understanding, Example x2, Exercise x2, Survey, Video | NEW: 2.4.x or 3.x 'Random numbers' (Math.random / floor) | Partial | random ints in a range; appears only inside a 2.4 example and 5.1 challenges, never taught on its own before games need it |
| 4.10 | While Loops | AP Practice, Check for Understanding, Example, Exercise x2, Video | 2.2 Algorithms and Loops | Close | while loop with a changing condition |
| 4.11 | Loop and a Half | Badge, Check for Understanding, Example, Exercise x2, Video | 2.4 Loop Control and Nested Loops (2.4.10 search until found) | Partial | exit from the middle of an infinite loop; we have break and search-until-found, not the named pattern |
| 4.12 | Javascript Control Structures Quiz | Unit Quiz | pattern only: module-closing quiz | None | cadence reference |
| 5.1 | Functions and Parameters 1 | Check for Understanding, Example, Exercise x2, Video | 3.2 Parameters and Return Values | Exact | parameters in three steps (one, several, combined); the order we already use |
| 5.2 | Functions and Parameters 2 | Check for Understanding, Example, Exercise x2, Video | 3.2 Parameters and Return Values | Exact | parameters in three steps (one, several, combined); the order we already use |
| 5.3 | Functions and Parameters 3 | Badge, Check for Understanding, Example, Exercise x3, Video | 3.2 Parameters and Return Values | Exact | parameters in three steps (one, several, combined); the order we already use |
| 5.4 | Functions and Return Values 1 | Check for Understanding, Example, Exercise x2, Video | 3.2 Parameters and Return Values | Exact | return values, then using a return value in an expression |
| 5.5 | Functions and Return Values 2 | Check for Understanding, Example, Exercise x2, Video | 3.2 Parameters and Return Values | Exact | return values, then using a return value in an expression |
| 5.6 | Local Variables and Scope | Check for Understanding, Example, Exercise, Video | 3.1.4 reading-scope + 3.2.21 scope prediction | Exact | local scope; they close it with one lesson, we place it inside 3.1 and 3.2 |
| 5.7 | JavaScript vs Karel | Badge, Connection, Example x2, Exercise x2, Free Response, Video | CUT: Karel comparison | None | bridges back to Karel; nothing to bridge |
| 5.8 | Basic JavaScript and Graphics Challenges | Badge, Challenge x3 | 3.9 / 3.10 Chapter 3 PAs (pattern only) | Partial | challenge set after the concept block |
| 5.9 | Functions and Parameters Quiz | Unit Quiz | pattern only: module-closing quiz | None | cadence reference |
| 6.1 | Project: Tell a Story | Challenge, Connection, Demo, Free Response x4 | 4.1 Print Shop (pattern only) | Partial | open-ended project after functions; ours is a console build, theirs a story with graphics. Brief, not content |
| 7.1 | Intro to Lists/Arrays | AP Practice, Check for Understanding, Example, Exercise x2, Video | 3.3 Arrays | Exact | what an array is, make one |
| 7.2 | Indexing Into an Array | Badge, Check for Understanding, Example, Exercise, Video | 3.3 Arrays | Exact | index, read and write by position |
| 7.3 | Adding/Removing From an Array | Check for Understanding, Example, Exercise, Video | 3.3 Arrays / 3.7 Array Methods | Exact | push, pop and friends |
| 7.4 | Array Length and Looping Through Arrays | Check for Understanding, Example x4, Exercise x6, Free Response, Video | 3.3 Arrays | Exact | length, looping with for and for-of; theirs has 13 activities, ours spreads it |
| 7.5 | Iterating Over an Array | Badge, Check for Understanding, Example x2, Exercise x4, Survey, Video | 3.3 Arrays | Exact | length, looping with for and for-of; theirs has 13 activities, ours spreads it |
| 7.6 | Finding an Element in a List | Check for Understanding, Example x2, Exercise, Video | 3.3 / 3.7 (indexOf, includes) | Close | find an element; manual loop first, method after |
| 7.7 | Removing an Element From an Array | AP Practice, Check for Understanding, Example, Exercise, Video | 3.7 Array Methods (splice / filter) | Close | remove an element; check our order of loop-then-method matches |
| 7.8 | Simulation | Badge, Connection, Example x2, Exercise, Video | 5.4 Flappy (array of pipes) as a use case | Partial | arrays modelling a changing world; ours does it with game objects, theirs a dice-style simulation |
| 7.9 | Basic Data Structures Quiz | Unit Quiz | pattern only: module-closing quiz | None | cadence reference |
| 8.1 | Intro to Digital Information | Check for Understanding, Example x2, Free Response, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.2 | Number Systems | Check for Understanding x2, Example, Exercise x2, Notes, Video x2 | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.3 | Encoding Text with Binary | Badge, Check for Understanding, Example x4, Exercise x3, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.4 | Pixel Images | Check for Understanding, Example, Exercise x3, Resource, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.5 | Hexadecimal | Check for Understanding, Example, Exercise, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.6 | Pixel Colors! | Check for Understanding, Example x3, Exercise x4, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.7 | Image Manipulation | Badge, Check for Understanding x2, Example x4, Exercise x3, Video x2 | CUT: out of scope (digital information) | None | pixel-array loops are the one overlap with arrays-of-arrays; revisit only if we add image work |
| 8.8 | Data Compression | Check for Understanding x2, Example x2, Free Response, Video x2 | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.9 | Lossy Compression | Check for Understanding, Connection, Example, Exercise, Free Response, Video | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.10 | Cryptography | Check for Understanding x2, Example x2, Exercise, Free Response, Video x2 | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 8.11 | Digital Information Quiz | Unit Quiz | CUT: out of scope (digital information) | None | binary, color, compression and ciphers; no game-dev use |
| 9.1 | Practice PT: Steganography | Challenge, Connection, Demo, Example, Free Response | CUT: out of scope (AP Practice PT) | None | exam-prep project; no shCode counterpart |
| 10.1 | Practice PT: Create an Image Filter! | Challenge, Connection, Free Response | CUT: out of scope (AP Practice PT) | None | exam-prep project; no shCode counterpart |
| 11.1 | Welcome to the Internet | Check for Understanding, Free Response, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.2 | Internet Hardware | Check for Understanding, Connection, Video x2 | CUT: out of scope (Internet) | None | networking and policy |
| 11.3 | Internet Addresses | Check for Understanding x2, Free Response x2, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.4 | Viewing Websites | Check for Understanding, Free Response, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.5 | DNS | Check for Understanding, Video x2 | CUT: out of scope (Internet) | None | networking and policy |
| 11.6 | Routing | Check for Understanding, Free Response, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.7 | Packets and Protocols | Check for Understanding, Connection, Free Response, Resource, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.8 | Sequential, Parallel & Distributed Computing | Check for Understanding, Free Response, Resource, Video | CUT: out of scope (Internet) | None | sequential vs parallel; only touches our game loop if we ever discuss frames vs threads |
| 11.9 | Cybersecurity | Check for Understanding, Connection x3, Example x3, Free Response x2, Survey, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.10 | The Impact of the Internet | Check for Understanding, Connection x2, Free Response x3, Video | CUT: out of scope (Internet) | None | networking and policy |
| 11.11 | Creative Credit & Copyright | Check for Understanding, Connection, Free Response x4, Video | CUT: out of scope (Internet) | None | credit and copyright; consider one reading in Unit 5 for sprite/sound assets |
| 11.12 | The Internet Quiz | Badge, Unit Quiz | CUT: out of scope (Internet) | None | networking and policy |
| 12.1 | The Effects of the Internet | Free Response x4 | CUT: out of scope (Internet) | None | networking and policy |
| 13.1 | Getting Started with Data | Check for Understanding, Connection, Free Response, Video | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 13.2 | Visualizing and Interpreting Data | Check for Understanding x2, Free Response x2, Notes, Video | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 13.3 | Data Collection & Limitations | Check for Understanding x3, Example x3, Free Response x3, Video x2 | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 13.4 | Data Quiz | Unit Quiz | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 14.1 | Present a Data-Driven Insight | Free Response x5 | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 15.1 | The Impacts of Computing | Free Response x4 | CUT: out of scope (data / impacts) | None | data analysis and AP written reflections |
| 16.1 | Create Performance Task: Overview | Article x4, Free Response x3, Notes x2 | CUT: AP exam logistics | None | College Board Create task rules; our capstone is a game with a different rubric |
| 16.2 | Create Performance Task: Guidelines | Article x3, Free Response x3, Notes | CUT: AP exam logistics | None | College Board Create task rules; our capstone is a game with a different rubric |
| 16.3 | Create Performance Task: Categories and Questions | Article x5, Free Response x3, Notes x5 | CUT: AP exam logistics | None | College Board Create task rules; our capstone is a game with a different rubric |
| 16.4 | Planning and Pacing Your Project | Free Response x3, Notes x3 | CUT: AP exam logistics | None | College Board Create task rules; our capstone is a game with a different rubric |
| 16.5 | Complete the Create Performance Task | Challenge x3, Connection, Free Response x6, Notes | CUT: AP exam logistics | None | College Board Create task rules; our capstone is a game with a different rubric |
| 17.1 | Preparation | Resource | CUT: AP exam prep | None | exam review |
| 17.2 | Practice AP Exam | AP Practice | CUT: AP exam prep | None | exam review |
| 18.1 | Intro to Design Thinking | Article, Check for Understanding, Demo, Free Response x3, Video | NEW: capstone opener 'Design thinking' (reading) | Partial | empathize / define / ideate vocabulary as a one-screen frame for the capstone |
| 18.2 | Prototype | Check for Understanding, Connection x2, Free Response, Video | capstone: prototype step | Partial | paper or rough prototype before code; fits our plan-first habit from 1.5 |
| 18.3 | Test | Check for Understanding, Connection, Free Response x4, Resource, Video x2 | capstone: playtest step | Partial | testing with a real user; strong fit for a game (watch someone play) |
| 18.4 | Project Prep and Development | Challenge, Free Response x3, Survey | capstone: planning and build | Partial | project prep survey and build; map to the capstone plan screen |
| 19.1 | Final | Final | CUT: course final | None | one assessment shell |

## 2. Gaps in shCode this course exposes (Units 1-4 ordering)

CSP's fundamentals order is: values and output, variables, **user input, basic math, then graphics and one mouse event**, then booleans, logical, comparison, if, **key events**, for, general for, practice, **random numbers**, while, **loop and a half**, then functions-with-parameters (3 steps), returns (2 steps), scope, then arrays (7 steps, ending in find and remove). Ours matches the big spine (variables, conditionals, loops, functions, arrays) and is more thorough, so the gaps are small and specific:

1. **No standalone Math/random lesson.** `Math.random` first shows up in a 2.4 example and in 5.1 challenges (plus 6.x), and `Math.floor` the same. CSP gives random numbers its own lesson at the end of loops (4.9) and basic math one before graphics (3.6). A student hits "random whole number from 1 to 6" inside a game with no earlier screen. Proposal: one short module-level lesson at the end of 2.2 or in 2.4 (`Math.random`, `Math.floor`, the scale-and-shift recipe), plus remainder (`%`) if it is not already in 1.2.
2. **No user-input lesson in the console units.** CSP teaches `prompt`-style input right after variables. Ours teaches input only as keyboard polling in 5.1. Unit 4's print shop and 2.x labs work around it. Decide whether console input is wanted at all (see open questions).
3. **Loop-and-a-half is not named.** We have break and search-until-found (2.4.10), but not the "loop forever, test in the middle, break" pattern as its own idea. Cheap to add as one reading plus one lab in 2.4.
4. **Debugging has no module of its own.** CSP has a full lesson (two videos, four debugging exercises). We have 1.5.41-43 and PA find-and-fix items. Not urgent, but 2.5 (try/catch) comes before any "read the error, narrow it down" strategy lesson outside console.log.
5. **Abstraction as a named idea.** CSP 1.9 names it before functions. We do not use the word until 3.x/5.x. Matches the earlier CSA recommendation to open Unit 7 with abstraction and program design; one reading could also sit at the top of 3.1.
6. **Scope placement is fine** (3.1.4 and 3.2.21), but CSP gives it one lesson of its own after returns; ours has two spots without a named closing screen. No change needed beyond checking the quiz covers it.
7. **Order check passed:** parameters (3.2) before arrays (3.3), return values before arrays, scope before arrays. This is the same order the seeding doc already says to keep. One difference: CSP puts finding and removing an element (7.6-7.7) as separate lessons after iteration; ours puts array methods in 3.7, four modules later. Fine for a game course, but the loop-first version of find/remove is worth checking exists in 3.3.
8. **Cadence:** CSP closes every content module with one quiz. We close chapters with PAs and have a unit quiz at 1.1.23; check 2.x, 3.x, 5.3-5.5 each have a short closing check (already recommended in `CODEHS-SEEDING.md` section 5).
9. **Capstone framing:** CSP's design-thinking module (empathize, prototype, test, build) has no shCode counterpart and fits a game capstone, particularly the playtest step.

## 3. Things in shCode this course does not justify

- **2.3 The Switch Statement** (31 screens): not taught in CSP either. Already flagged in `CODEHS-MAP.md`; this course adds no support.
- **2.5 try/catch** (27 screens): absent from CSP; its answer to errors is debugging exercises.
- **1.1 SDLC depth, 1.4 paradigms, 1.5 flowcharts** (22 + 23 + 45 screens): CSP covers decomposition and debugging in about three lessons total. Keep if the owner values the planning habit; it is not borrowed from here.
- **3.4 arrow functions, 3.6 pass by value/reference, 3.8 saving and loading:** no CSP equivalent. 3.6 and 3.8 do serve the game units (5.6 and 6.5 depend on them), so they are justified by our own track, not by this course.
- **Karel (CSP M1, 21 lessons):** correctly absent; no action.

## 4. Open questions for the owner

1. **Console user input:** add a short `prompt`-style input lesson to Unit 1 or 2, or keep input as keyboard-only from 5.1 on?
2. **Random numbers:** is a dedicated lesson before Unit 5 wanted, or keep teaching `Math.random` inside the first game that needs it (the CodeHS inject-where-needed rule)? Either is defensible; today it is neither, because only an example uses it earlier.
3. **Digital information (binary, color, hex, compression, ciphers):** the brief puts it out of scope. One small exception to consider: a hex/RGB color reading in Unit 5, since sprites use colors. Agree?
4. **Internet and impacts modules:** confirm all cut. One candidate for a single reading: creative credit and copyright (11.11), for sprite and sound assets in the capstone.
5. **Quizzes:** adopt CSP's one-quiz-closes-every-module rule for modules 5.3 onward, or keep PAs only?
6. **Design thinking (CSP M18):** adopt its four steps as the capstone's structure, or leave the capstone with the plan-first flow from 1.5?
7. **Abstraction reading:** place it at the top of 3.1, the top of the Unit 7 class block, or both?
