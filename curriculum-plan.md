# CSCI 4 — Introduction to Programming Concepts and Methodologies
## Curriculum Plan: JavaScript + shplay + JSCAD 3D Modeling
### Chico USD / Butte College Dual Enrollment | High School Juniors

---

## COURSE METADATA

- **Language:** JavaScript (ES6+)
- **Primary Environments:**
  - Browser DevTools console (Q1 JavaScript fundamentals)
  - shplay in-app editor (Q2 applied game development) — no install required
  - JSCAD browser app (https://jscad.app/) (Q3–Q4 3D modeling) — no install required
- **Students:** High school juniors, little to no prior coding experience
- **Contact Hours:** 3.5 hours/week × 36 weeks = 126 total contact hours
- **Printers:** 10 FDM printers, 250×250mm build plates, ~3 students per printer
- **Articulation:** Butte College CSCI 4 (dual enrollment)
- **Pathway Destination:** FreeCAD / Mechatronics course (same teacher, next course in sequence)

---

## CSCI 4 SLO COVERAGE MAP

Each SLO must be covered by at least one graded assignment.

| SLO | Description | Primary Coverage | Backup Coverage |
|-----|-------------|-----------------|-----------------|
| SLO 1 | Describe the software development life-cycle | W1 lecture + A1.1 written | W18 Game Capstone + W36 3D Capstone reflection |
| SLO 2 | Describe principles of structured programming | W12 OOP + A12.2 written | W6–7 functions + W31 JSCAD modules |
| SLO 3 | Describe, design, implement, and test structured programs | W18 Game Capstone + W36 3D Capstone | W9 Q1 mini-project |
| SLO 4 | Explain what an algorithm is and its importance | W5 algorithms + A5.1 written | W30 sort/search + shplay collision logic (W13) |

### SLO Alignment Across Quarters

A term-by-term view of how each SLO is introduced, reinforced, and assessed. **Bold** cells are the primary artifacts retained for dual-enrollment documentation.

| SLO | Q1 (W1–9) Console Fundamentals | Q2 (W10–18) shplay Game Dev | Q3 (W19–27) JSCAD Foundations | Q4 (W28–36) Advanced JSCAD + Capstone |
|-----|-------------------------------|------------------------------|-------------------------------|----------------------------------------|
| **SLO 1** — SDLC | W1 lecture + **A1.1 written** (intro) | W18 Game Capstone design/build/test/reflect cycle (A18.1) | W24 first-print lifecycle observation | W33–36 full capstone lifecycle + **A36.2 closing reflection** |
| **SLO 2** — Structured programming | W3 coding conventions; W6 functions; W7 pass-by-value/reference (A7.2) | **W12 OOP via shplay + A12.2 written (primary artifact)**; W16 game-state machines | W19 libraries; W22 parameters as function args | W31 multi-file module design |
| **SLO 3** — Design / implement / test | W9 Print Job Manager with manual tests (A9.1) | **W18 Game Capstone (A18.1 — primary Sem 1 evidence)**: design doc + code + testing log + reflection | W26 error handling (A26.1); W27 testing principles (A27.1) | **W36 3D Capstone (A36.1 — primary Sem 2 evidence)**: spec → build → test → print → present |
| **SLO 4** — Algorithms | W5 algorithm definition + **A5.1 written** (intro) | W13 collision detection as algorithm; W14 physics tuning | W23 loops generating geometry | **W30 Sort/Search on part data (A30.1 — primary applied evidence)** |

### Assignment → SLO Trace

Each graded artifact that anchors an SLO appears at least twice (primary + backup) so documentation survives a missing assignment.

| Artifact | SLO(s) | Role |
|----------|--------|------|
| A1.1 | SLO 1 | Primary intro (SDLC written) |
| A5.1 | SLO 4 | Primary intro (algorithm definition + JS) |
| A7.2 | SLO 2, pass-by-ref | Written artifact |
| A9.1 | SLO 3 | Sem 1 mini-project (console) |
| A12.2 | SLO 2, OOP vs procedural | **Primary written artifact** |
| A16.1 | SLO 3, File I/O | Persistent storage (shplay) |
| A18.1 | SLO 1, SLO 2, SLO 3 | **Primary Sem 1 capstone evidence** |
| A26.1 | Topic: Error handling | Primary lab |
| A27.1 | Topic: Testing principles | Primary lab |
| A30.1 | SLO 4 | **Primary applied algorithms artifact** |
| A31.1 / A31.2 | Topic: File I/O (JSCAD) | Multi-file + written comparison |
| A36.1 | SLO 1, SLO 3 | **Primary Sem 2 capstone evidence** |
| A36.2 | SLO 1 | Closing lifecycle reflection |

### Topic Coverage Map

| Topic | Weeks | Assignment Type |
|-------|-------|----------------|
| Software life-cycle | 1, 18, 36 | Written + discussion + capstone reflection |
| Procedural vs OOP | 12 | Code + written comparison |
| Program design tools & environments | 1–2, 10, 19 | Lab setup + reflection (console, shplay, JSCAD) |
| Documentation | Throughout (formal: W3, W12, W19) | Inline comments + READMEs |
| Coding conventions | 3 (formal), enforced throughout | Code review rubric |
| Data types, variables, expressions, sequential processing | 2–3 | Exercises + quiz |
| Arrays | 8 (intro), 13 (shplay Groups), 23 (JSCAD parametric) | Exercises + applied modeling |
| Control structures (if/switch/for/while/do...while) | 4–5, applied W11–14 (shplay) | Exercises + shplay mechanics |
| Algorithms: sorting and searching | 30 | Applied to geometry data |
| File I/O | 8 (FileReader + Blob write), 16 (shplay save/load), 31 (JSCAD multi-file + STL export) | Lab + multi-file project |
| Error handling | 26 | Debug exercise |
| Parameters by value and reference | 7 | Functions deep dive |
| Testing principles | 27 | Test case writing assignment |

### AP CSP Non-Coding Topic Integration

These topics align with AP CSP Big Ideas 1, 2, 4, and 5 (which together account for **65–76% of the AP exam**). They are woven into existing weeks as 15–20 minute discussions, bell-ringer activities, or short written components — not separate units. Students taking AP CSP get reinforcement; all students get computing literacy.

| AP CSP Big Idea | Topic | Week | Integration Method |
|-----------------|-------|------|-------------------|
| BI 2: Data (17–22%) | Binary number systems — how computers store data | 2 | Discussion + activity |
| BI 2: Data | Data compression — lossy vs lossless | 8 | Discussion tied to file I/O |
| BI 2: Data | Digital image representation — pixels, sprites, RGB | 15 | Discussion tied to shplay sprites + animation |
| BI 2: Data | Metadata — data about data | 16 | Discussion tied to game save/load JSON |
| BI 4: CSN (11–15%) | How the Internet works — HTTP, DNS, client-server | 10 | Discussion: how does shplay reach your browser? |
| BI 4: CSN | Protocols and fault tolerance — TCP/IP, routing, redundancy | 11 | Bell-ringer activity |
| BI 4: CSN | Parallel and distributed computing | 30 | Discussion tied to algorithm efficiency + sort/search |
| BI 5: IOC (21–26%) | Open source and licensing — Creative Commons, copyright | 3 | Discussion tied to documentation week |
| BI 5: IOC | Beneficial and harmful effects of computing | 18 | Discussion: game design ethics + addictive patterns |
| BI 5: IOC | Digital divide — who has access to technology | 34 | Written component tied to capstone |
| BI 5: IOC | Computing bias — algorithmic bias, design bias | 35 | Discussion during capstone |
| BI 5: IOC | Cybersecurity — encryption, PII, phishing, malware | 26 | Discussion tied to error handling |
| BI 5: IOC | Intellectual property — DMCA, fair use, open source models | 31 | Discussion tied to STL export + asset sourcing |
| BI 1: CRD (10–13%) | Collaboration in development | 35 | Practiced via peer review during capstone |
| BI 1: CRD | Identifying and correcting errors | 26 | Directly covered (syntax, runtime, logic) |

---

# Q1: JavaScript Fundamentals
### ~35 contact hours | 10 weeks
### Goal: Students can read and write basic JS programs with confidence before any spatial complexity is added.
### Environment: Browser console + simple HTML files with embedded script tags. No JSCAD yet.

---

## Unit 1.1: Foundations
> **SLO focus:** Introduces **SLO 1** (lifecycle, W1 primary artifact A1.1) and **SLO 2** (coding conventions and structured style foundations).

### 1.1.1 What Is Programming / Software Lifecycle (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1, SLO 4 (intro)
**Reading:** JS1 → An introduction → An Introduction to JavaScript; PY Ch 1 Statements (intro framing)

**Learning Objectives:**
- Define what a program is and what programming languages are
- Describe the software development life-cycle (design → code → test → maintain)
- Set up and use browser DevTools console
- Write and run a first JS statement

**Topics:**
- What is code, what is a computer actually doing
- Survey of programming languages (why so many, when do you choose)
- The software development life-cycle: design, development, documentation, testing, maintenance
- Introduction to the browser console as a coding environment
- `console.log()` as first output

**In-Class Activities:**
- Teacher demo: type `console.log("hello")` in console, explain what happened
- Students open DevTools, run 3 provided statements, modify them
- Class discussion: name something in their life that runs on code

**Assignments:**
- **A1.1 (Written, graded):** In 1 page, describe the software development life-cycle in your own words. Give one real-world example of a software product and walk through how you think it went through each phase. (SLO 1 primary coverage)
- **A1.2 (Lab):** Follow setup checklist — open browser console, run 5 provided `console.log` statements, screenshot results, submit.

**Teacher Notes:**
- Keep it conceptual this week. Resist going deep on syntax.
- The lifecycle discussion should feel relevant — use examples like apps students use daily.
- Do not mention JSCAD yet.

---

### 1.1.2 Variables and Data Types (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (intro to structured programming)
**Reading:** JS1 → JavaScript Fundamentals → Variables, Data types, Basic operators, maths; JS2 Ch 1 Values, Types, and Operators; PY Ch 2 Expressions

**Learning Objectives:**
- Declare variables using `let` and `const`
- Identify and use the four primary JS data types: number, string, boolean, null/undefined
- Write expressions using arithmetic operators
- Explain the difference between a variable and a value
- Explain sequential processing: code executes top to bottom, one statement at a time
- Use basic string methods: `.length`, `.toUpperCase()`, `.toLowerCase()`, `.includes()`

**Topics:**
- `let` vs `const` vs `var` (keep `var` brief, explain why we use `let`/`const`)
- Numbers, strings, booleans, null, undefined
- Arithmetic operators: `+`, `-`, `*`, `/`, `%`, `**`
- String concatenation and template literals
- String methods: `.length`, `.toUpperCase()`, `.toLowerCase()`, `.includes()`, `.indexOf()`, `.slice()`
- `typeof` operator
- Naming conventions: camelCase, descriptive names
- Sequential processing: code executes one statement at a time, top to bottom — this is the default flow before conditionals and loops change it

**In-Class Activities:**
- Live coding: declare variables for a "design spec" — width, height, material, isWaterproof
- Students predict output before running: type coercion gotchas (`"3" + 3`)
- Pair exercise: write variables describing a physical object in the room
- Sequencing exercise: students reorder 5 shuffled JS statements to produce correct output — demonstrates sequential processing
- **AP CSP Discussion (15 min):** Binary number systems. Show how the number 42 is stored as `00101010`. Students convert 3 decimal numbers to binary by hand. Connection: "Every variable you declare is stored as bits — even that string."

**Assignments:**
- **A2.1 (Lab):** Given 10 variable declarations with bugs (wrong type, wrong syntax, poor names), fix all 10 and explain each fix in a comment.
- **A2.2 (Lab):** Write a program that declares at least 6 variables describing a real object (at least 2 numbers, 2 strings, 1 boolean). Use template literals to print a description sentence. Must use at least 2 string methods. Must follow naming conventions.

**Teacher Notes:**
- Type coercion in JS will confuse students. Address it directly rather than avoiding it.
- Template literals (`\`Hello ${name}\``) are easier than concatenation for beginners. Lead with them.

---

### 1.1.3 Documentation and Coding Conventions (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (structured programming principles)
**Reading:** JS1 → Code quality → Coding Style, Comments; PY Ch 1 Statements (comments)

**Learning Objectives:**
- Write single-line and multi-line comments
- Apply consistent coding conventions (naming, spacing, indentation)
- Write a basic README for a program
- Explain why documentation matters

**Topics:**
- Single-line comments `//` and block comments `/* */`
- JSDoc-style function documentation (introduce now, reinforce all year)
- Indentation rules, semicolons, spacing around operators
- What a README is and why it exists
- Code readability as a professional skill

**In-Class Activities:**
- Show two versions of identical code: one undocumented/messy, one clean. Discuss.
- Students document a provided messy program
- Introduce the class coding style guide (teacher prepares this — 1 page, clear rules)
- **AP CSP Discussion (15 min):** Open source and licensing. JSCAD is open-source software — what does that mean? Brief intro to Creative Commons, MIT License, copyright. Ask: "Can you use someone else's 3D model in your project? Under what conditions?"

**Assignments:**
- **A3.1 (Lab):** Take the provided undocumented program (10–15 lines), add inline comments explaining every line, fix formatting to match style guide, write a 3-sentence README.
- **A3.2 (Written):** 1 paragraph: why does documentation matter in professional software development? Use one specific example.
- **A3.3 (Quiz — in class, 15 min):** Identify data types of 5 expressions, fix 3 variable declarations with syntax or naming errors, match 4 vocabulary terms (variable, constant, data type, comment) to definitions.

**Teacher Notes:**
- Distribute the class coding style guide this week. It should cover: indentation (2 spaces), semicolons (required), naming (camelCase variables, UPPER_SNAKE for constants), comment requirements.
- This style guide will be used as a grading rubric for all future assignments.
- Reinforce documentation every week going forward — do not let it slip.

---

## Unit 1.2: Control Flow
> **SLO focus:** Introduces **SLO 4** (W5 algorithm definition, primary artifact A5.1); reinforces **SLO 3** (students implement first structured programs with branching and iteration).

### 1.2.1 Conditionals (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3 (implement structured programs)
**Reading:** JS1 → JavaScript Fundamentals → Comparisons, Conditional branching: if '?', Logical operators; JS2 Ch 2 Program Structure (Conditional execution); PY Ch 4 Decisions

**Learning Objectives:**
- Write if, else if, and else statements
- Use comparison operators: `==`, `===`, `!=`, `!==`, `<`, `>`, `<=`, `>=`
- Use logical operators: `&&`, `||`, `!`
- Write a switch statement
- Explain the difference between `==` and `===`

**Topics:**
- if / else if / else syntax
- Comparison operators (emphasize `===` over `==`)
- Logical operators
- Nested conditionals
- switch statements
- Truthy and falsy values (brief)

**In-Class Activities:**
- Fizzbuzz as a class — work through it together, do not just show the answer
- Students write a "print settings advisor" in console: given filament type and layer height variables, print recommended temperature
- Pair debugging: find the bug in 5 provided conditional programs

**Assignments:**
- **A4.1 (Lab):** Write a program that takes 3 hardcoded variables (score, attendance, lateAssignments) and uses conditionals to print a grade recommendation. Must use at least one `else if` chain, one `&&` or `||`, and one switch statement somewhere in the program.
- **A4.2 (Quiz — in class):** Short written quiz on operator precedence, `===` vs `==`, and tracing through 3 conditional code snippets to predict output.

**Teacher Notes:**
- `===` vs `==` is a JS-specific issue. Teach `===` as the default, mention `==` exists and why it's dangerous.
- Fizzbuzz is a rite of passage. Work through it collaboratively — don't just show the answer.

---

### 1.2.2 Algorithms and Loops (~5.25 hrs)
> **Extended** to allow algorithm concepts + for/while/do...while without rushing.
**Contact hours:** 3.5
**SLOs covered:** SLO 4 (algorithms), SLO 3
**Reading:** JS1 → JavaScript Fundamentals → Loops: while and for, The "switch" statement; JS2 Ch 2 Program Structure (while and do loops, for loops); PY Ch 5 Loops (incl. do...while)

**Learning Objectives:**
- Define what an algorithm is
- Write a for loop with correct syntax
- Write a while loop
- Trace through a loop to predict output
- Identify infinite loop conditions
- Write a do...while loop

**Topics:**
- What is an algorithm: a precise, ordered set of steps to solve a problem
- Why algorithms matter in programming
- for loop: initialization, condition, increment
- while loop: condition-based iteration
- do...while loop: body executes at least once, then checks condition
- Loop control: break, continue
- Common loop patterns: counting, accumulating, searching

**In-Class Activities:**
- Algorithm discussion: write an algorithm in plain English for making a sandwich, then translate to pseudocode
- Live code: loop that prints numbers 1–20, then only even numbers
- Students trace 3 loops by hand before running them

**Assignments:**
- **A5.1 (Written + Lab):** Part A: Write a plain-English algorithm for a task of your choice (not programming). Part B: Write a JS program using at least one for loop and one while loop that solves a simple counting or accumulation problem. Document with comments.
- **A5.2 (Lab):** Debug 5 provided loop programs — two have infinite loops, two have off-by-one errors, one has a do...while logic error. Fix all five and explain each bug in a comment.

**Teacher Notes:**
- The algorithm discussion is SLO 4's primary coverage. Be explicit in class: "an algorithm is a precise sequence of steps." Students should be able to repeat this back.
- The off-by-one error is one of the most common bugs they'll encounter. Name it explicitly.

**Exam:**
- **Semester 1 Midterm 1 (~1 hour, in class):** Covers Weeks 1–5 (software lifecycle, variables, types, documentation, conventions, conditionals, loops, algorithms). Format: 10 multiple-choice, 5 code-tracing (predict output), 2 short-answer (define algorithm, describe lifecycle phase), 1 write-a-function problem. Administer at the start of the week before new loop content, or at the end after loops are introduced — teacher discretion.

---

## Unit 1.3: Functions and Data
> **SLO focus:** Reinforces **SLO 2** (functions as structured decomposition) and **SLO 3** (design/implement routines); covers the Butte outline topic **Pass by value/reference** (W7, primary artifact A7.2).

### 1.3.1 Functions: Definition and Calls (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2, SLO 3
**Reading:** JS1 → JavaScript Fundamentals → Functions, Function expressions, Arrow functions, the basics; JS2 Ch 3 Functions; PY Ch 6 Functions

**Learning Objectives:**
- Define and call a function
- Write functions with parameters
- Write functions with return values
- Explain the difference between defining and calling a function
- Explain what scope means (intro)

**Topics:**
- Function declaration syntax
- Parameters vs arguments
- Return values — why return matters
- Void functions vs value-returning functions
- Basic scope: local vs global variables
- Arrow functions (brief intro — show both syntaxes)

**In-Class Activities:**
- Live code: function that calculates area of a rectangle, then call it with different arguments
- Students convert 3 hardcoded programs from W4–W5 into functions
- Pair exercise: write a function, swap with partner, write the function call

**Assignments:**
- **A6.1 (Lab):** Refactor your A4.1 grade advisor program to use at least 2 named functions. Each function must have a JSDoc comment above it documenting parameters and return value.
- **A6.2 (Lab):** Write a "design calculator" program with 4 functions: `calculateVolume(w, h, d)`, `calculateSurfaceArea(w, h, d)`, `isWithinBuildVolume(w, h, d)` (returns boolean), and a main function that calls all three and prints results using template literals.

**Teacher Notes:**
- The A6.2 design calculator is a deliberate bridge toward JSCAD thinking. "Build volume" starts priming spatial thinking.
- Emphasize return values — many beginners write functions that console.log instead of returning. Address this directly.

---

### 1.3.2 Functions: Pass by Value/Reference (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3, Topic: parameters by value and reference
**Reading:** JS1 → Objects: the basics → Object references and copying; JS2 Ch 4 Data Structures (Mutability); PY Ch 3 Objects

**Learning Objectives:**
- Explain what "pass by value" means
- Explain what "pass by reference" means
- Predict whether a function call will mutate its input
- Demonstrate the difference with objects vs primitives

**Topics:**
- Primitives are passed by value: number, string, boolean
- Objects and arrays are passed by reference
- Why this matters: unintended mutation bugs
- Defensive copying: spread operator `{...obj}` and `[...arr]`
- Pure functions vs functions with side effects

**In-Class Activities:**
- Live demo: swap function that works on primitives vs one that tries to work on objects — trace what happens
- Students predict output for 6 provided code snippets before running
- Discussion: when would you *want* a function to mutate its input?

**Assignments:**
- **A7.1 (Lab):** Write two versions of a "scale a design" function — one that mutates the original object, one that returns a new object. Write a test that proves they behave differently. Comment explaining pass-by-reference.
- **A7.2 (Written):** Explain in your own words the difference between pass-by-value and pass-by-reference. Give one example of each. Why does it matter?

**Teacher Notes:**
- This is one of the harder conceptual weeks. Use physical analogies: passing by value is like giving someone a photocopy. Passing by reference is like giving them the original.
- This SLO topic is formally covered here. Make sure A7.1 is in the gradebook explicitly tied to this topic.

**Quiz:**
- **A7.3 (Quiz — in class, 20 min):** Trace 3 function calls and predict output (testing scope, return values, and pass-by-value vs pass-by-reference). Identify whether a provided function mutates its input. Write a function signature given a description.

---

### 1.3.3 Arrays and File I/O (~5.25 hrs)
> **Extended** to give File I/O (FileReader API) its own session separate from core array instruction.
**Contact hours:** 3.5
**SLOs covered:** SLO 3, Topic: arrays, Topic: File I/O
**Reading:** JS1 → Data types → Arrays, Array methods, Iterables; JS1 → Binary data, files → File and FileReader ⚠️FILE I/O; JS2 Ch 4 Data Structures: Objects and Arrays; JS2 Ch 18 File fields; PY Ch 9 Lists, Ch 14 Files

**Learning Objectives:**
- Declare and initialize arrays
- Access elements by index
- Use array methods: push, pop, shift, unshift, length, indexOf, includes
- Use a loop to iterate over an array
- Create a multi-dimensional array
- Read a text file using the browser FileReader API
- Process file contents line-by-line using arrays
- Write text out to a downloadable file using `Blob` + `<a download>`

**Topics:**
- Array declaration and initialization
- Zero-based indexing
- Common array methods
- Iterating with for loops and for...of
- 2D arrays: arrays of arrays
- Arrays as coordinate containers (deliberate bridge: `[x, y, z]` introduced here)
- File I/O in the browser: HTML `<input type="file">` + FileReader API
- `FileReader.readAsText()`: reading a file as a string
- `.split('\n')` to convert file content into an array of lines — sequential access
- Processing file data: searching, counting, filtering lines
- Writing a file in the browser: `Blob` + `URL.createObjectURL` + `<a download>`
- Sequential-access file model: open → read/write → close, mapped to browser JS

**In-Class Activities:**
- Live code: array of part names, loop through and print each
- Introduce `[x, y, z]` as a coordinate array — "this is how JSCAD will talk to us"
- Live code: build a simple HTML page with a file picker, read a .txt file, split into lines, display each line
- Students load a provided text file of part measurements and use arrays to process it
- Live code: build the write side — `Blob` from filtered lines, trigger download, then re-read the downloaded file back
- **AP CSP Discussion (15 min):** Data compression. Compare the .txt file size to a compressed .zip of the same file. Explain lossy vs lossless compression. Preview: "STL files are huge because they store every triangle. 3MF uses compression — same model, smaller file."

**Assignments:**
- **A8.1 (Lab):** Write a program that stores 10 design measurements in an array. Use loops to find the maximum, minimum, and average. Must use at least 3 different array methods.
- **A8.2 (Lab, File I/O coverage):** Build an HTML page with a file input that reads a `.txt` file containing one item per line (provided: a list of 20 part names and dimensions). Using FileReader and `.split('\n')`, load the file into an array, then: (a) count how many lines contain a user-specified search string, (b) find and display all lines matching a filter, (c) display the total number of lines read. Must use at least one loop and one array method. Comment explaining how FileReader works and what sequential file access means.
- **A8.3 (Lab, File I/O write + round-trip):** Add the write side to the A8.2 page. (1) Reuse the filtered-lines result from A8.2 and build it into a single string. (2) Wrap the string in a `Blob` and trigger a download via `<a download>` so a real new `.txt` file lands on disk. (3) Add a *second* `<input type="file">` on the same page; re-select the just-downloaded file, read it back with FileReader, and display its line count — verify it matches what was written. (4) Comment block naming the four sequential-access concepts against browser reality: **open** = user picks the file via the input picker; **read** = `FileReader.onload` fires with the content; **write** = `Blob` built + download triggered; **close** = no explicit close call in browser JS (unlike Python's `f.close()` / C++'s `.close()`) — the download completing *is* the close. That contrast is the teaching moment. Requires the sandboxed iframe to allow downloads (`allow-downloads` in `LivePreview.tsx`).

**Teacher Notes:**
- The `[x, y, z]` array introduction is intentional foreshadowing. Say explicitly: "In a few weeks we'll be using arrays exactly like this to place shapes in 3D space."
- A8.2 + A8.3 together are the primary File I/O coverage artifacts (read + write + round-trip). Provide students with a pre-made .txt file so they focus on the reading/processing code, not file creation.
- FileReader is asynchronous — students will encounter callbacks for the first time. Keep the explanation simple: "tell the browser what to do WHEN the file is ready." Do not go deep on async/promises.
- A8.3's write side needs downloads allowed in the sandboxed preview iframe. `components/LivePreview.tsx` already sets `allow-downloads` — do not remove it, or A8.3 silently breaks.
- The open→read→write→close mapping in A8.3's comment is the actual SLO teaching point: browser JS has no `f.close()`, and naming that explicitly is more valuable than pretending the analogy is exact.
- Bridge to JSCAD: "When we import files in JSCAD later, the browser is doing exactly this behind the scenes."

---

## Unit 1.4: Synthesis
> **SLO focus:** **SLO 3 backup artifact (A9.1 Print Job Manager)** — first complete design/implement/test program. Also reinforces SLO 1, 2, 4 in a single cohesive project.

### 1.4.1 Q1 Review and Mini-Project (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1, SLO 2, SLO 3, SLO 4 (synthesis)
**Reading:** JS1 → Miscellaneous → JavaScript specials (review); JS2 Ch 4 Summary (review)

**Learning Objectives:**
- Apply all Q1 concepts in a single cohesive program
- Write documented, convention-following code independently
- Debug a program of moderate complexity

**Topics:**
- Review: variables, conditionals, loops, functions, arrays
- Code reading and debugging practice
- Program design process: plan before coding

**In-Class Activities:**
- Pair debugging challenge: 15-line program with 5 bugs of different types
- Q1 concept map: students draw relationships between topics covered

**Assignments:**
- **A9.1 — Q1 Mini Project (Lab, major grade):** Build a "Print Job Manager" in pure JS (no JSCAD). Requirements:
  - Store at least 5 print jobs as objects in an array. Each job has: name (string), width/height/depth (numbers), filament (string), priority (number)
  - Function to calculate estimated print time based on volume
  - Function to find all jobs that fit within a given build volume (takes 3 parameters)
  - Function to sort jobs by priority (basic sort — can use Array.sort with comparator)
  - Main program that calls all functions and prints a formatted summary
  - Full documentation and style guide compliance
  - At least 3 manual test cases: call each key function with a known input, print PASS or FAIL based on whether the output matches expected (pre-formal testing — lightweight is fine)
  - README file

**Teacher Notes:**
- This project intentionally looks like real data a 3D printing lab would manage. It primes students for JSCAD without being modeling yet.
- Grade on: correctness, documentation, style guide compliance, README quality.
- This is the "first complete program" for SLO 3 coverage documentation.

**Exam:**
- **Semester 1 Midterm 2 (~1 hour, in class):** Cumulative Q1 exam covering Weeks 1–8 (all JS fundamentals including arrays and file I/O). Format: 15 multiple-choice, 5 code-tracing, 3 short-answer, 2 write-a-function problems (one must use arrays). Administer before the mini-project work begins.

---

# Q2: shplay — Applied Game Development
### ~31.5 contact hours | 9 weeks (W10–W18)
### Goal: Students extend Q1 fundamentals into a motivating visual/game context, learn OOP through hands-on use, practice File I/O, and ship a complete game as their Semester 1 capstone.
### Environment: shplay in-app editor (built on q5.js + Box2D physics) — no install required.

---

## Unit 2.1: shplay Foundations
> **SLO focus:** Reinforces **SLO 3** (design/implement/test in a visual context); applies Q1 control structures (SLO backup) to interactive programs.

### 2.1.1 Hello Sprite and Movement (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3 (design, implement, test)
**Reading:** shplay → overview → The sketch lifecycle; shplay → canvas → Creating the canvas, Background and clearing; shplay → sprite → Your first sprite, Position, rotation, scale; shplay → input → Keyboard basics, Multi-key movement; JS2 Ch 13 JavaScript and the Browser (context)

**Learning Objectives:**
- Create a canvas with `new Canvas(width, height)`
- Create a sprite with `new Sprite(x, y, w, h)` and set its properties
- Use `setup()` and `draw()` as the shplay program skeleton
- Drive sprite movement with the keyboard using `kb.pressing(...)` and `vel.x/y`
- Explain the frame loop: `draw()` runs every frame

**Topics:**
- shplay program skeleton: `setup()`, `draw()`, optional `update()`
- `Canvas(width, height)` — sets up the drawing area
- `Sprite(x, y, w, h)` — creating sprites
- Sprite properties: `color`, `pos`, `vel`, `rotation`, `layer`
- `background()` inside `draw()`
- Keyboard input: `kb.pressing('left' | 'right' | 'up' | 'down')`
- Setting velocity: `player.vel.x = 4`; screen coords — up is negative y

**In-Class Activities:**
- Teacher demo: type the minimum working sprite program live, line by line
- Students complete the in-app lesson **5.1.2 Hello Sprite**
- Students complete the in-app lesson **5.1.4 Make it Move**
- Pair exercise: change the canvas size, make the sprite a different shape, swap control keys
- **AP CSP Discussion (15 min):** How the Internet works. Tracing how shplay loaded in your browser: DNS → HTTP → server → renderer. "Every time you open this page, all of this happens in milliseconds."

**Assignments:**
- **A10.1 (Lab):** Build a "sprite playground" in the in-app editor: a canvas, one controllable sprite with WASD keys, a second sprite that moves automatically using `frameCount`, and an on-screen text label displaying a message. Must run without errors on Run.
- **A10.2 (Written):** Half page — in your own words, what is the difference between `setup()` and `draw()`, and what does "60 frames per second" actually mean for the values you pick?

**Teacher Notes:**
- `vel.x`/`vel.y` are pixels per frame. shplay targets ~60 fps — tell students this explicitly or they'll pick absurd values.
- Omitting `vel.x = 0` in the else branch leaves the sprite drifting. Watch for this bug.
- Some students will try `player.x =` — show that `player.pos.x` works too, but `vel` is the shplay idiom.

---

### 2.1.2 Physics Feel (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** shplay → physics → Gravity and velocity, Bounciness and friction, Forces, torque, and rotation; shplay → sprite → Collider types: dynamic, static, kinematic, none; JS2 Ch 6 The Secret Life of Objects (classes preview, optional)

**Learning Objectives:**
- Enable and disable gravity with `world.gravity.y`
- Control bounciness and friction on sprites
- Distinguish `dynamic`, `static`, and `kinematic` sprite bodies
- Predict sprite motion given initial velocity + gravity
- Debug physics behavior by adjusting single properties at a time

**Topics:**
- `world.gravity` — global physics setting
- Sprite bodies: `dynamic` (affected by forces), `static` (immovable), `kinematic` (moves but ignores forces)
- `bounciness` / restitution
- `friction`, `drag` (air resistance)
- Forces vs velocity: `applyForce(...)` vs assigning `vel`
- Automatic collision response

**In-Class Activities:**
- Students complete in-app lesson **5.2.1 Bouncy Ball**
- Students study the worked example **5.1.3 Falling Block**
- Pair challenge: turn the bouncing ball into a "sticky" ball (low bounciness)
- Discussion: why doesn't a ball bounce forever? (energy loss via friction/restitution)

**Assignments:**
- **A11.1 (Lab):** Using the provided template, build a pinball-like scene. Requirements: at least 3 static obstacle sprites, a dynamic ball with `bounciness > 0.8`, gravity enabled, a reset key that repositions the ball at the top. Test by running and observing for 30 seconds.
- **A11.2 (Written):** Short paragraph — why does setting `vel` every frame "fight" the physics engine? When would you use `applyForce` instead?
- **AP CSP Bell-Ringer (10 min):** Protocols and fault tolerance — what happens if one server on the Internet goes down? Introduce redundancy, routing, TCP/IP at a conceptual level.

**Teacher Notes:**
- Beginners often set `bounciness = 1` and expect perpetual motion. That's lossless collision; real friction still drains the system. Explain.
- The pendulum worked example returns in W14 — don't front-load it here.
- Physics is new vocabulary for most; lean on the visual feedback to anchor understanding.

---

## Unit 2.2: Object-Oriented Programming
> **SLO focus:** **SLO 2 primary artifact (A12.2 written OOP-vs-procedural comparison)** — the structured-programming documentation anchor for dual enrollment.

### 2.2.1 Classes and Objects via shplay (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 primary (OOP vs procedural), SLO 3
**Reading:** JS1 → Classes → Class basic syntax, Class inheritance (optional); JS2 Ch 6 The Secret Life of Objects (Methods, Classes, Prototypes); PY Ch 11 Classes (framing only); shplay → GitHub repo → shplay.d.ts → `Sprite` class (L227) — "what `new Sprite()` really is"

**Learning Objectives:**
- Define a class with a constructor and methods in JavaScript
- Instantiate objects with `new` and access properties/methods via dot notation
- Explain what happens under the hood when `new Sprite(x, y, w, h)` is called
- Compare a procedural and an OOP solution to the same problem
- Identify when OOP is more appropriate than procedural code

**Topics:**
- Class syntax: `class Name { constructor() { ... } method() { ... } }`
- `this` keyword — binding
- Instance vs class
- Properties vs methods
- Creating objects with `new`
- Every shplay primitive (`Canvas`, `Sprite`, `Group`) is an instance of a class
- Procedural pattern: parallel arrays + helper functions taking an index
- OOP pattern: array of instances, each with its own state + behavior
- Vocabulary (intro only): encapsulation, inheritance, polymorphism
- Relevance: classes in JavaScript work almost identically to Python classes you'll see in downstream courses

**In-Class Activities:**
- Teacher demo: "Every sprite is an object." Console-log `player.constructor.name`, inspect properties, mutate `player.color` live.
- Live code: build an `Enemy` class with `constructor(x, y, hp)`, a `damage(n)` method, a `render()` method.
- Pair exercise: extend the `Enemy` class with a new property and method.
- Revisit in-app lesson **5.1.1 Sprite Showcase** — now read it as an API tour of the `Sprite` class.
- Reading (10 min): handout showing an "enemy fleet" written procedurally and with classes — students annotate which is which.

**Assignments:**
- **A12.1 (Lab):** Write a `Collectible` class — `constructor(x, y, value, color)` and a `collect()` method that returns the value and marks the item gone. Instantiate at least 5 in `setup()` and render them as sprites. Include at least one method call whose return value is used elsewhere.
- **A12.2 (Written, graded, SLO 2 primary):** 1 page comparing procedural and OOP. Must include: definitions in your own words; a specific Q1 example that was procedural; a specific shplay example that is OOP; and one scenario where OOP is clearly the better choice, with reasoning.

**Teacher Notes:**
- Students have already used `new Sprite(...)` for two weeks. Lead with: "You've been using classes — now let's see what's really happening."
- Don't go deep into inheritance or polymorphism — name them, don't require them.
- A12.2 is the SLO 2 written artifact. Keep the essays.

---

## Unit 2.3: Collections and Physics Applications
> **SLO focus:** Reinforces **SLO 3** (applied implementation) and **SLO 4** (collision detection + spawn logic are algorithms); also reinforces the Q1 Arrays topic in a new context.

### 2.3.1 Groups and Overlaps (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3, SLO 4 (algorithmic thinking in collision detection)
**Reading:** shplay → groups → Spawning and defaults, Iterating and removing, Filtering and searching; shplay → collisions → colliding vs overlapping, Collisions with groups; JS1 → Data types → Arrays, Array methods (review)

**Learning Objectives:**
- Use `Group` to manage collections of related sprites
- Detect overlaps with `sprite.overlaps(group)`
- Spawn and despawn sprites during gameplay
- Explain how group iteration relates to the array loops from Q1

**Topics:**
- `new Group()` — a specialized sprite collection (an array-like with extras)
- Adding sprites to a group (pass the group as a parent, or add explicitly)
- Iterating over a group
- `overlaps(other)` — returns boolean, or accepts a callback per overlap
- `remove()` — despawn a sprite
- Spawning logic: random positions, timed spawns via `frameCount % N === 0`
- Collision detection as an algorithm (link back to SLO 4)

**In-Class Activities:**
- Students complete in-app lesson **5.3.1 Introducing Groups**
- Students study the worked example **5.3.2 Apple Catcher**
- Students attempt the challenge **5.3.3 Asteroid Field**
- Discussion: how is a `Group` different from an `Array`? (It's an Array with extra methods.)

**Assignments:**
- **A13.1 (Lab, Asteroid Field — graded):** Complete the Asteroid Field challenge fully. Must: (1) spawn at least 10 asteroids at random positions, (2) detect overlap with the player ship and transition to a "hit" log or state, (3) despawn asteroids that leave the canvas.

**Teacher Notes:**
- Students often iterate a group and `remove` during iteration — index skipping results. Show the safe pattern: iterate backwards, or collect-then-remove.
- The `overlaps` callback runs once per collision pair — good for scoring.
- This module reinforces Q1 W8 arrays in a new, motivating context.

---

### 2.3.2 Physics Applications (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** shplay → input → Keyboard basics, Mouse position and buttons; shplay → physics → Gravity and velocity, Bounciness and friction; JS1 → JavaScript Fundamentals → Comparisons, Conditional branching (review for input-driven logic)

**Learning Objectives:**
- Combine input, physics, and collision to build a playable scene
- Distinguish `kb.presses(...)` (edge) from `kb.pressing(...)` (level)
- Tune oscillation and angular motion (pendulum preview)
- Debug interactions between input-driven and physics-driven motion

**Topics:**
- Edge-triggered input: `kb.presses('space')` fires once per press
- Impulse forces for jumping
- Ground detection: checking `colliding` against a sprite or group
- Static platforms as level geometry
- Slopes, angular motion (previews W17 joints)

**In-Class Activities:**
- Students attempt challenge **5.1.5 Space Jumper**
- Students attempt challenge **5.2.3 Car on a Ramp**
- Students study the worked example **5.2.2 Swinging Pendulum**
- Discussion: what makes a jump "feel right"? (Coyote time, variable height, air control.)

**Assignments:**
- **A14.1 (Lab, Space Jumper OR Car challenge):** Complete ONE of the two challenges fully. Must include at least one static obstacle, at least one dynamic player sprite, working input-driven motion, and a visible win condition (flag, top, etc.).

**Teacher Notes:**
- This week is consolidation, not new concepts. Use it to rescue students who fell behind W10–13.
- Car on a Ramp is harder — steer advanced students here.
- The Pendulum study previews joints; tell students explicitly they'll return to it in W17.

**Exam:**
- **Semester 1 Midterm 3 (~1 hour, in class):** Covers Weeks 10–14 (shplay foundations, physics, OOP, groups/overlaps, physics applications). Format: 5 multiple-choice on shplay + OOP concepts, 3 code-reading (predict what this sprite/group code produces), 2 short-answer (explain OOP vs procedural, explain the frame loop), 1 write-code problem (fill in a sprite/input loop). Administer at the start or end of the week — teacher discretion.

---

## Unit 2.4: Animation & Camera
> **SLO focus:** Reinforces **SLO 3** (implement + test the more polished systems needed for the capstone).

### 2.4.1 Animated Sprites and Camera (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** shplay → animation → Ani (sprite-sheet frames), Anis (named animation sets), Groups with animations; shplay → camera → Following a target, Screen space vs world space; JS1 → Animation → JavaScript animations (conceptual, optional)

**Learning Objectives:**
- Attach and switch animations on a sprite
- Use `camera` to scroll a world larger than the canvas
- Implement a camera that follows the player
- Use `layer` to control render order
- Explain why the camera is a coordinate transform

**Topics:**
- Sprite animations: `addAni(name, ...frames)`, `changeAni(name)`
- Single-frame art: `sprite.image`
- `camera.x`, `camera.y` — moving the view
- Camera follow pattern: `camera.x = player.x - canvas.w / 2`
- Smooth camera with linear interpolation (`lerp`)
- Layer / depth sorting for render order

**In-Class Activities:**
- Students complete in-app lesson **5.4.1 Animated Sprites**
- Students study the worked example **5.4.2 Camera Follow**
- Students attempt the challenge **5.4.3 Side-Scrolling Platformer**
- **AP CSP Discussion (15 min):** Digital image representation. Sprites are stored as pixel grids with RGBA values. A 64×64 animation frame × 4 bytes × 8 frames ≈ 131 KB per sprite sheet. Why do real games compress textures?

**Assignments:**
- **A15.1 (Lab, Platformer challenge):** Complete the Side-Scrolling Platformer challenge. Must include: at least 2 animation states on the player (idle, run); a camera that follows the player with a world larger than the canvas; at least 3 platforms; a visible end goal.

**Teacher Notes:**
- Camera math confuses students. Show visually: "the world doesn't move, the camera's window does."
- Animation speed is tuned via `sprite.animation.frameDelay`.
- Extend into W16 if students need more time; W16 content can absorb the slack.

---

## Unit 2.5: State and Persistence
> **SLO focus:** **SLO 2** (state machines as structured programming) and **SLO 3** (File I/O primary artifact A16.1 persistent storage); covers Butte outline topic **File I/O (secondary location)**.

### 2.5.1 Save, Load, and Game States (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (structured programming), SLO 3 (design/implement/test), Topic: File I/O
**Reading:** JS1 → Data types → JSON methods, toJSON; JS1 → Storing data in the browser → LocalStorage, sessionStorage; JS2 Ch 18 File fields + Storing data client-side; PY Ch 14 Files (structural)

**Learning Objectives:**
- Save data persistently with `storeItem(name, val)` (localStorage)
- Retrieve saved data with `getItem(name)` and convert back to correct type
- Export game data as JSON using `save(obj, 'filename.json')`
- Load JSON at runtime using `loadJSON(url)` in `preload()`
- Implement a game state machine (MENU, PLAY, PAUSE, WIN, LOSE)
- Structure `draw()` around a game-state variable with a switch or if/else chain

**Topics:**
- shplay persistent storage: `storeItem`, `getItem`, `removeItem`, `clearStorage`
- Serialization with JSON: `JSON.stringify`, `JSON.parse`
- File export: `save(obj, 'level.json')` triggers a browser download
- Async loading: `loadJSON` must run inside `preload()`
- Game state as a variable: `let gameState = 'menu'`
- State dispatch with `switch`
- Transitions between states (input, timers, collision outcomes)

**In-Class Activities:**
- Live code: a high-score tracker using `storeItem('highScore', score)`
- Students convert their game's player stats into a JSON string and log/download it
- Live code: take a W15 game and add menu + play + game-over states via `switch`
- Pair exercise: add a pause state triggered by `P`
- **AP CSP Discussion (15 min):** Metadata. A save file stores values plus structure (what each field means). What other metadata do games keep — timestamps, versions, player IDs?

**Assignments:**
- **A16.1 (Lab, File I/O coverage):** Add persistent high scores to your W15 game — top 3 with player initials, reads on start, writes when a new score qualifies, and a "clear" button that calls `clearStorage`. Prove persistence by closing and reopening the browser.
- **A16.2 (Lab):** Add states to your W15 game. Minimum: menu, play, end (win or lose). Use a `switch` or if/else chain in `draw()`. Menu → play on start key. Play → end on condition. End → menu on keypress.

**Teacher Notes:**
- `getItem` returns strings. Expect bugs from `getItem('x') + 1` concatenating. Teach `Number()` / `parseInt` explicitly.
- `loadJSON` is async — it must live inside `preload()`, not `setup()`.
- State machines often devolve into giant if-chains. Redirect students toward `switch` for readability.
- State is a prerequisite for the capstone — do not allow students to skip it.
- This module satisfies the SLO 3 File I/O requirement.

---

## Unit 2.6: Advanced Mechanics
> **SLO focus:** Reinforces **SLO 3** (implement + debug a complex interactive system); final content week before capstone.

### 2.6.1 Joints and Advanced Input (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** shplay → joints → DistanceJoint, HingeJoint, SliderJoint, GlueJoint, GrabberJoint; shplay → input → Dragging and clicks, Gamepad (Contro); shplay → patterns → Projectiles from a player (applied force pattern)

**Learning Objectives:**
- Create distance, hinge, and slider joints between sprites
- Implement a slingshot: drag, release, apply force
- Handle two-player input with separate key bindings
- Debug joint behavior by visualizing the constraints

**Topics:**
- `new DistanceJoint(a, b, ...)` — fixed distance between two sprites
- `new HingeJoint(a, b, ...)` — rotational pivot
- `new SliderJoint(a, b, ...)` — linear track
- Mouse input: `mouse.pressing()`, `mouse.pressed()`, `mouse.x/y`
- Applied force on release: `sprite.applyForce(fx, fy)`
- Two-player key mapping

**In-Class Activities:**
- Students complete in-app lesson **5.5.1 Joints: Distance, Hinge, Slider**
- Students study worked example **5.5.2 Slingshot**
- Students attempt challenge **5.5.3 Two-Player Pong-Sumo**
- Discussion: what real mechanical systems do each of these joints model?

**Assignments:**
- **A17.1 (Lab, Sumo challenge):** Complete the Two-Player Pong-Sumo challenge. Must include: separate input schemes for two players (e.g., WASD vs arrows); a win condition when one sprite is knocked out of bounds; a visible score or round counter.

**Teacher Notes:**
- Joints are the most complex shplay concept. Aim for "understand enough to use in capstone," not full mastery.
- The slingshot pattern (drag + release + force) appears in many classic games — encourage students to riff on it.
- This is the last content week before capstone — wrap up any open challenges here.

---

## Unit 2.7: Synthesis
> **SLO focus:** **SLO 3 primary Sem 1 evidence (A18.1 Game Capstone)** — design + implement + test cycle. Also contributes to SLO 1 (lived SDLC) and SLO 2 (classes + state machines in use).

### 2.7.1 Capstone Game (~3.5 hrs in class + homework)
**Contact hours:** 3.5
**SLOs covered:** SLO 1 (lifecycle), SLO 2 (structured programming), SLO 3 (design/implement/test — **PRIMARY SLO 3 EVIDENCE FOR SEMESTER 1**)
**Reading:** shplay → patterns → Scene/state switching, Top-down movement, Platformer jump (reference during build); JS2 Ch 16 Project: A Platform Game (enrichment); JS2 Ch 8 Bugs and Errors (testing discipline)

**Learning Objectives:**
- Design a complete game specification
- Implement the design using shplay patterns learned W10–W17
- Run and document manual test cases on key logic
- Document the design, code, and development reflection
- Iterate based on peer and teacher feedback

**Topics:**
- Design-doc structure: premise, mechanics, controls, states, win condition, stretch goals
- Time management across a multi-day build
- Version control habits (commit frequency and message quality)
- Playtesting as testing

**In-Class Activities:**
- **W17 evening homework:** students draft a 1–2 page design doc
- **W18 Monday:** design review — 2-minute presentations, class Q&A
- **W18 Tue–Thu:** supervised build time with office-hours support
- **W18 Friday:** 3-minute capstone showcase
- **AP CSP Discussion (15 min):** Beneficial and harmful effects of computing. Games shape player behavior — addictive loops vs fair challenge, inclusive design. What ethical choices did you make in your game?

**Assignments:**
- **A18.1 — Capstone Game (major grade, SLO 1/2/3 primary):**
  - **Design doc (1–2 pp):** premise, mechanics, controls, all game states, win/lose condition, ≥2 stretch goals
  - **Implementation:** ≥1 custom class (SLO 2), ≥1 Group (collections), persistent storage for ≥1 piece of data (SLO 3 file I/O), ≥3 game states, non-trivial win/lose logic
  - **Testing log:** ≥5 manual test cases with expected vs actual outcome and fixes applied
  - **Reflection (1 pp):** walk through the SDLC phases as you lived them — design, code, test, plan for maintenance
  - **Commits:** ≥5 meaningful commits across the week
  - **Showcase:** 3-minute demo to the class

**Teacher Notes:**
- This is the Semester 1 SLO 1/2/3 artifact. Retain design docs, testing logs, and reflections.
- Students not finished by Friday still present what they have — the Testing log + Reflection describe what they would fix. Iteration is a graded step.
- Rubric weights: Design doc 20% / Implementation 40% / Testing log 15% / Reflection 15% / Showcase 10%.

**Exam:**
- **Semester 1 Final (~1.5 hours, in class):** Cumulative exam covering all Semester 1 material (Weeks 1–18). Format: 20 multiple-choice (mix of JS fundamentals and shplay concepts), 5 code-tracing, 4 short-answer (SLO-aligned: lifecycle, structured programming, algorithms, OOP vs procedural), 2 write-code problems (one pure JS, one shplay snippet). Schedule the exam and capstone showcase on separate days within the week.

---

# Q3: JSCAD Foundations — 2D to 3D + Quality
### ~31.5 contact hours | 9 weeks (W19–W27)
### Goal: Transition from shplay into JSCAD. Learn the library model, 2D primitives, parametric design, extrusion into 3D, and 3D composition. Close Q3 with error handling and testing discipline.
### Environment: JSCAD browser app (https://jscad.app/) — no install required.

---

## Unit 3.1: JSCAD Foundations
> **SLO focus:** Introduces **SLO 2** (program design tools — libraries and modularity) and reinforces **SLO 3** (implement parameterizable 2D designs).

### 3.1.1 Libraries and JSCAD Introduction (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (program design tools), Topic: Documentation
**Reading:** JSCAD → parametric tutorial (entry point, `main()`); jscadui → jscad.app (browser UI: editor, viewport, parameters, export); JSCAD → GitHub repo → packages/modeling/src (module structure), packages/web (browser UI); JS1 → Modules → Modules, introduction, Export and Import; JS2 Ch 10 Modules (ES modules); PY Ch 7 Modules (structural)

**Learning Objectives:**
- Explain what a software library is and why libraries exist
- Import and use a named export from a library
- Run a first JSCAD program in the browser
- Identify the required structure of a JSCAD file: the `main()` function

**Topics:**
- What is a library: pre-written code organized into reusable modules
- Why reinvent the wheel? The economics of open source
- JSCAD's module structure: `@jscad/modeling` and its sub-modules
- Destructured imports: `const { primitives } = require('@jscad/modeling')`
- The JSCAD `main()` function: entry point; returns a geometry or array of geometries
- JSCAD browser UI tour: code editor, 3D viewport, export button

**In-Class Activities:**
- Teacher demo: build the simplest possible JSCAD program (return a cube)
- Students type it themselves — do not copy-paste
- Explore the viewport: rotate, zoom, pan
- Change cube dimensions — observe the live update

**Assignments:**
- **A19.1 (Lab):** Write a JSCAD program that imports from at least 2 different sub-modules (e.g. primitives and transforms) and returns at least 3 different shapes. Write a comment above each import explaining what that module provides.
- **A19.2 (Written):** In your own words, explain what a library is, why programmers use them, and what JSCAD's library provides. Half page.

**Teacher Notes:**
- The `require()` syntax will look unfamiliar. Explain it as "asking for a toolbox from a toolshed." Destructuring `const { primitives }` pulls out just the tools you need.
- Students will want to immediately make complex things. Hold them to simple this week — the goal is understanding the structure, not the output.
- Bridge back to shplay: "shplay was one big library — you imported classes by name. JSCAD is the same idea, different tool."

---

### 3.1.2 2D Shapes and Transforms (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → primitives → rectangle, circle, ellipse, polygon, star; JSCAD → transforms → translate, rotate, scale, center; JS1 → Objects: the basics → Objects (object literals, review)

**Learning Objectives:**
- Create 2D primitives: rectangle, circle, ellipse, polygon, star
- Apply 2D transforms: translate, rotate, scale
- Combine multiple shapes into an array and return them
- Read JSCAD API documentation independently

**Topics:**
- 2D primitives from `modeling/primitives`
- Transform functions from `modeling/transforms`
- The coordinate system: x is right, y is up in 2D
- Returning arrays of shapes from `main()`
- How to read the JSCAD docs: function signature, parameters, examples

**In-Class Activities:**
- Live code: design a simple face using circles and rectangles
- Students spend 20 minutes building any 2D composition using at least 5 shapes
- Class share-out: project viewport on screen, students explain one decision they made

**Assignments:**
- **A20.1 (Lab):** Design a 2D logo or symbol using at least 6 shapes from at least 2 different primitive types. Must use translate and rotate on at least 2 shapes. Full comments. Export as SVG.
- **A20.2 (Lab):** Using only the JSCAD documentation (no asking for code), find and use one primitive type NOT covered in class this week. Write a comment explaining what it does and how you figured it out.

**Teacher Notes:**
- A20.2 is a deliberate documentation-reading exercise. Reading API docs is a professional skill.
- The coordinate system will confuse students who expect y to go down (screen coordinates in shplay). Address this explicitly — JSCAD uses math-standard orientation.

---

### 3.1.3 Boolean Operations in 2D (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → booleans → union, subtract, intersect; JS1 → JavaScript Fundamentals → Logical operators (conceptual parallel, review)

**Learning Objectives:**
- Apply union, subtract, and intersect operations to 2D shapes
- Explain what each boolean operation produces conceptually
- Use booleans to create shapes that can't be made with primitives alone
- Debug a boolean operation that produces unexpected results

**Topics:**
- `modeling/booleans`: union, subtract, intersect
- Conceptual explanation: union = combine, subtract = cut, intersect = keep overlap
- Order matters in subtract
- Common failure: shapes must overlap for a boolean to produce anything
- Using booleans for holes, cutouts, and complex profiles

**In-Class Activities:**
- Live code: rectangle minus circle = shape with round hole
- Students reproduce 3 target shapes shown on screen using only primitives + booleans
- Debugging exercise: provided code with a broken boolean — find and fix

**Assignments:**
- **A21.1 (Lab):** Create a 2D gasket or plate design that uses all three boolean operations (union, subtract, intersect). Must be a design that could realistically be laser-cut or used as a profile for extrusion. Comments explaining each boolean operation used.
- **A21.2 (Written):** Explain union, subtract, and intersect in your own words. Draw (by hand or digitally) what each operation produces given two overlapping circles.

**Teacher Notes:**
- Boolean operations are conceptually the most important JSCAD idea for the downstream mechatronics pathway. Professional CAD tools use identical operations. Say this explicitly.
- "Order matters in subtract" is the #1 gotcha. Demo it visually.

**Quiz:**
- **A21.3 (Quiz — in class, 15 min):** Given 3 pairs of overlapping shapes, sketch or describe the result of union, subtract, and intersect. Identify which boolean operation was used in 2 provided JSCAD snippets. One question on coordinate system orientation.

---

## Unit 3.2: Parametric Design
> **SLO focus:** Reinforces **SLO 2** (parameters as function arguments — direct bridge from Q1 W6–7) and **SLO 3** (design/implement parametric models).

### 3.2.1 Parameters and getParameterDefinitions (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → parametric tutorial → `getParameterDefinitions()`, `main(params)`, parameter types; JSCAD → GitHub repo → packages/core/src/parameters (runtime engine, not in JSDoc build); JS1 → JavaScript Fundamentals → Functions, Function expressions (parameters review)

**Learning Objectives:**
- Write a `getParameterDefinitions()` function in JSCAD
- Create parameters of different types: number, text, checkbox, choice
- Use parameter values inside `main()`
- Explain why parameterization is more powerful than hardcoding

**Topics:**
- `getParameterDefinitions()` function structure
- Parameter types: number (with min/max/step), text, checkbox, choice (dropdown)
- Accessing parameters: `params.paramName` in `main(params)`
- The design value of parameterization: one model, infinite variations
- Connecting back to Q1 functions: parameters are just function arguments with a UI

**In-Class Activities:**
- Refactor a hardcoded design from W20 to use parameters
- Live demo: change parameter slider, watch model update in real time
- Discussion: what would you parameterize in a real product?

**Assignments:**
- **A22.1 (Lab):** Take your A20.1 logo design and add at least 4 parameters using `getParameterDefinitions()`. At least one must be a number with min/max, one must be a checkbox that changes the design, one must be a choice/dropdown. The design must respond meaningfully to all parameters.
- **A22.2 (Written):** Explain the connection between `getParameterDefinitions()` parameters and the function parameters you learned in Q1 (W6–7). What is the same? What is different?

**Teacher Notes:**
- A22.2 is an explicit connection back to Q1 SLO content. Students should recognize that parameters are just arguments.
- The checkbox parameter that changes the design is intentionally open-ended — encourage creativity.

**Exam:**
- **Semester 2 Midterm 1 (~1 hour, in class):** Covers Weeks 19–22 (JSCAD introduction, 2D shapes, transforms, booleans, parameters). Format: 5 multiple-choice on JSCAD concepts, 3 code-reading (what does this JSCAD code produce?), 2 short-answer (what is a library, explain parameterization), 1 write-a-JSCAD-function problem. Administer at start or end of week — teacher discretion.

---

### 3.2.2 Arrays in JSCAD / Loops Generating Geometry (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3, Topic: Arrays
**Reading:** JS1 → Data types → Arrays, Array methods; JS1 → Advanced working with functions → Rest parameters and spread syntax (optional); JS2 Ch 5 Higher-order Functions (map, filter, reduce); PY Ch 9 Lists → 9.5 List comprehensions (structural)

**Learning Objectives:**
- Use a for loop to generate an array of JSCAD shapes
- Use `map()` to transform an array of values into an array of shapes
- Explain why returning an array from `main()` renders multiple shapes
- Generate a repeating pattern programmatically

**Topics:**
- Returning arrays of geometries from `main()`
- Using a for loop to build a shapes array
- Array `map()` as a functional alternative to for loops
- Pattern generation: linear arrays, grids
- The power of parametric patterns: change one number, change the whole pattern

**In-Class Activities:**
- Live code: loop that places 5 circles in a row, spacing controlled by a variable
- Students make a 3×3 grid of shapes using nested loops
- Challenge: make the shapes vary in size based on their position

**Assignments:**
- **A23.1 (Lab):** Write a JSCAD program that generates a pattern of at least 20 shapes using loops. The pattern must have at least 2 parameters that control it (e.g., count, spacing, size). Full comments. This should be something that would be interesting to eventually extrude and print.
- **A23.2 (Lab):** Rewrite A23.1's loop using `Array.from()` and `map()` instead of a for loop. Comment explaining what changed and which version you prefer and why.

**Teacher Notes:**
- This week is where students start seeing why code is more powerful than manual design tools. "Change one number, regenerate 20 shapes" lands well.
- `map()` is a stretch for beginners but worth introducing. Don't require mastery — require exposure.

---

## Unit 3.3: 3D Modeling
> **SLO focus:** Reinforces **SLO 3** (design/implement/test 3D geometry) — first physical-artifact milestone arrives here in W24.

### 3.3.1 First Extrusion: 2D to 3D (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → extrusions → extrudeLinear, extrudeRotate; JSCAD → primitives → circle, rectangle (profile inputs); JS1 → JavaScript Fundamentals → Numbers (angle/segment parameters, review)

**Learning Objectives:**
- Extrude a 2D shape into a 3D solid using `extrudeLinear`
- Use `extrudeRotate` to create rotationally symmetric 3D forms
- Understand the coordinate system transition from 2D to 3D
- Export an STL file from JSCAD

**Topics:**
- `extrudeLinear({ height })`: push a 2D shape into the Z axis
- `extrudeRotate({ angle, segments })`: rotate a 2D profile around an axis
- 3D coordinate system: x, y, z — what changes from 2D
- STL export process
- Print preparation overview: what makes a model printable (manifold, no holes, flat bottom)

**In-Class Activities:**
- Live code: extrude the W21 gasket design into a 3D part
- Students extrude their own A21.1 design
- Demo: `extrudeRotate` to make a vase profile
- Discuss what makes a good first print

**Assignments:**
- **A24.1 (Lab):** Take your A21.1 2D design and extrude it into a printable 3D part using `extrudeLinear`. Add a height parameter. Export STL. Write a print checklist comment at the top of the file: is it manifold? Does it have a flat bottom? What infill would you recommend?
- **A24.2 (Lab):** Use `extrudeRotate` to create a rotationally symmetric object (bowl, cup profile, knob, etc.). At least 2 parameters must control the shape. Export STL.

**Teacher Notes:**
- FIRST PRINT MILESTONE: A24.1 or A24.2 should be the first things students actually print. Coordinate the print queue by printer group (see Appendix B).
- Failed prints are learning opportunities. Require students to document what failed and what they changed.
- This is a major motivational moment — do not rush past it.

---

### 3.3.2 3D Primitives and Transforms (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → primitives → cube, cuboid, sphere, cylinder, torus; JSCAD → transforms → translate, rotate, scale, scaleX/Y/Z; JSCAD → booleans → union, subtract, intersect (3D)

**Learning Objectives:**
- Create 3D primitives: cube, cuboid, sphere, cylinder, torus
- Apply 3D transforms: translate, rotate, scale in 3D
- Compose multi-part 3D assemblies
- Use 3D boolean operations

**Topics:**
- 3D primitives from `modeling/primitives`
- 3D transforms: `translate([x,y,z])`, `rotateX/Y/Z`, `scale`
- 3D booleans: same union/subtract/intersect, now in 3D
- Building assemblies: multiple parts positioned relative to each other
- Thinking in 3D: spatial reasoning strategies

**In-Class Activities:**
- Live code: simple robot figure from primitives
- Students build a 3-part assembly of their choice
- Challenge: use subtract to cut a hole through a 3D solid

**Assignments:**
- **A25.1 (Lab):** Build a 3D assembly of at least 5 distinct primitives that together form a recognizable object (not just random shapes). Must use translate, at least one rotation, and at least one boolean operation. Fully parameterized with at least 3 parameters.
- **A25.2 (Lab):** Model a simple functional part: a cylinder with a hole through the center (like a bushing or spacer). Parameterize outer diameter, inner diameter (hole size), and height. Demonstrate that subtract correctly creates the hole.

**Teacher Notes:**
- A25.2 is the first "functional" part — it has a mechanical purpose. This connects to the mechatronics pathway destination.
- Students will struggle with 3D spatial reasoning. Encourage drawing on paper before coding.

**Quiz:**
- **A25.3 (Quiz — in class, 15 min):** Identify 3D primitives from descriptions, predict the result of a translate + rotate sequence, explain the difference between 2D and 3D boolean operations. One code-tracing question on a multi-part 3D assembly.

---

## Unit 3.4: Quality and Rigor
> **SLO focus:** Covers Butte outline topics **Error handling (W26, primary artifact A26.1)** and **Testing principles (W27, primary artifact A27.1)**. Reinforces SLO 3 (test structured programs).

### 3.4.1 Error Handling and Debugging (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: Error handling
**Reading:** JS1 → Error handling → Error handling "try...catch", Custom errors; JS1 → Code quality → Debugging in the browser; JS2 Ch 8 Bugs and Errors (Language, Exceptions, Assertions); PY Ch 14 Files → 14.4 Handling exceptions, 14.5 Raising exceptions (structural)

**Learning Objectives:**
- Distinguish between syntax errors, runtime errors, and logic errors
- Use try/catch for runtime error handling
- Write defensive code that validates inputs before using them
- Use browser DevTools debugger to step through code

**Topics:**
- Three types of errors: syntax, runtime, logic
- try/catch/finally syntax
- Throwing custom errors: `throw new Error("message")`
- Input validation: checking types and ranges before using values
- JSCAD-specific: what happens when geometry operations fail (non-manifold, invalid parameters)
- DevTools debugger: breakpoints, step-through, watch expressions

**In-Class Activities:**
- Live demo: program that crashes without try/catch, then add it
- Students use DevTools debugger to trace a provided buggy program
- Add input validation to the A6.2 design calculator from Q1
- **AP CSP Discussion (15 min):** Cybersecurity basics. Error handling prevents crashes, but what about intentional attacks? Brief intro to PII, phishing, malware, and why input validation is also a security practice. "Never trust user input — it might be an attack, not a mistake."

**Assignments:**
- **A26.1 (Lab, Error Handling SLO):** Take your W9 Print Job Manager and add: input validation to every function (throw errors for invalid inputs), try/catch around the main execution block, at least one custom error type, and a user-facing error message for each possible failure mode.
- **A26.2 (Lab):** Add error handling to one JSCAD project from W19–25: validate all parameters (e.g., prevent negative dimensions, enforce min/max), add a try/catch around your main function, and display a meaningful message when parameters are invalid.

**Teacher Notes:**
- A26.1 is the Error Handling SLO coverage artifact.
- The three error types (syntax, runtime, logic) are recurring vocabulary — keep referencing them all year.

---

### 3.4.2 Testing Principles (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: Principles of testing and designing test data
**Reading:** JS1 → Code quality → Automated testing with Mocha; JS2 Ch 8 Bugs and Errors (Testing); PY Ch 14 Files → 14.4 Handling exceptions (structural)

**Learning Objectives:**
- Explain why software testing matters
- Write test cases that cover normal, edge, and error cases
- Implement basic unit tests without a framework
- Design test data that would reveal bugs

**Topics:**
- Why test? Cost of bugs found late vs early
- What is a unit test: test one function in isolation
- Test case anatomy: input → expected output → actual output → pass/fail
- Normal cases, edge cases, error cases
- Designing test data: what inputs would break this function?
- Manual testing vs automated testing (conceptual)

**In-Class Activities:**
- Students write test cases for a provided function before seeing the implementation
- Live code: simple test runner function (no framework)
- Pair exercise: write tests for partner's A6.2 design calculator

**Assignments:**
- **A27.1 (Lab, Testing SLO):** Write a complete test suite for your W9 Print Job Manager functions. For each function, write at least 3 test cases: one normal input, one edge case (boundary value), one invalid input. Implement a simple test runner that reports pass/fail. Submit test results showing at least one test catching a real bug you then fixed.
- **A27.2 (Written):** Explain the difference between normal cases, edge cases, and error cases in testing. Why is it important to test all three?

**Teacher Notes:**
- A27.1 is the Testing SLO coverage artifact.
- "Submit test results showing at least one test catching a real bug" is intentional — students should experience tests as bug-finders, not box-checkers.

**Quiz:**
- **A27.3 (Quiz — in class, 15 min):** Classify 4 test cases as normal, edge, or error cases. Write 3 test cases for a provided function (one of each type). Explain why testing matters in one sentence.

**Exam:**
- **Semester 2 Midterm 2 (~1 hour, in class):** Covers Weeks 23–27 (arrays/loops in JSCAD, extrusion, 3D primitives, error handling, testing). Format: 10 multiple-choice, 3 code-tracing, 2 short-answer (classify a bug by type; explain an edge case), 1 write-code problem (validate inputs and test one function). Administer at end of week after testing content.

---

# Q4: Advanced JSCAD + 3D Capstone
### ~31.5 contact hours | 9 weeks (W28–W36)
### Goal: Advanced modeling techniques, sorting/searching applied to geometry, multi-file projects, and a student-directed 3D capstone ending the year.
### Environment: JSCAD browser app + 3D printers.

---

## Unit 4.1: Advanced Modeling
> **SLO focus:** **SLO 4 primary applied artifact (A30.1 Sort/Search on geometry data)**. Reinforces SLO 3 through advanced modeling techniques and measurement-driven design.

### 4.1.1 Hulls and Advanced Extrusions (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → hulls → hull, hullChain; JSCAD → extrusions → extrudeHelical, extrudeFromSlices; JS2 Ch 5 Higher-order Functions (composability, optional)

**Learning Objectives:**
- Use `hull()` and `hullChain()` to create organic forms
- Use `extrudeHelical` for spiral and spring forms
- Use `extrudeFromSlices` for tapered or morphing extrusions
- Select the right extrusion type for a given design intent

**Topics:**
- `modeling/hulls`: `hull()`, `hullChain()`
- `extrudeHelical`: springs, threads, spirals
- `extrudeFromSlices`: lofted forms, tapers
- When to use each: form follows function
- Design intent: matching tool to outcome

**In-Class Activities:**
- Live code: `hullChain` through 5 circles of varying radius to make an organic tube
- Students experiment freely for 30 minutes: build something they couldn't before
- Share-out: show one thing that surprised you

**Assignments:**
- **A28.1 (Lab):** Build a design that uses at least 2 advanced extrusion/hull techniques from this week. The design must be intentional (not random exploration) — write a short design brief explaining what you were trying to make and why you chose those techniques.
- **A28.2 (Quiz — in class, 15 min):** Match each advanced technique (hull, hullChain, extrudeHelical, extrudeFromSlices) to the form it produces. Given a design goal, choose the correct technique and explain why.

---

### 4.1.2 Measurements and Printability (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → measurements → measureVolume, measureBoundingBox, measureDimensions; JS2 Ch 4 Data Structures: Objects and Arrays (object data, review)

**Learning Objectives:**
- Use JSCAD measurement functions to query geometry properties
- Calculate volume, bounding box, and surface area programmatically
- Identify common printability issues: overhangs, thin walls, unsupported spans
- Write a printability checker function

**Topics:**
- `modeling/measurements`: `measureVolume`, `measureBoundingBox`, `measureDimensions`
- Using measurement data in logic: "if volume > X, warn the user"
- Printability constraints: overhang angle, minimum wall thickness, support needs
- Design for manufacturing: thinking about how a print will be built layer by layer

**In-Class Activities:**
- Live code: function that takes a geometry, measures it, and prints a report
- Students add a printability warning system to a previous design using parameters
- Discussion: what does a slicer actually do?

**Assignments:**
- **A29.1 (Lab):** Add a measurement report to one of your Q3 projects. The report should print: estimated volume, bounding box dimensions, whether it fits on the printer (using build-volume check), and at least one design-specific measurement relevant to the part. Use `getParameterDefinitions()` to expose a "show measurements" toggle.

**Teacher Notes:**
- Light week by design — use extra time for print queue rotation, individual help, or catch-up on any delayed Q3 assignments.

---

### 4.1.3 Sorting and Searching on Geometry (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 4 (algorithms, primary), Topic: sorting and searching
**Reading:** JS1 → Data types → Array methods (sort, find, indexOf); JS2 Ch 5 Higher-order Functions (filter, map, reduce); JS2 Ch 4 Data Structures (Rest parameters, The Math object — optional); PY Ch 9 Lists → 9.2 Sorting and reversing lists (structural)

**Learning Objectives:**
- Implement a linear search algorithm
- Implement a bubble sort algorithm
- Analyze why algorithm efficiency matters
- Apply sorting and searching to design-relevant data (parts, vertices, layers)

**Topics:**
- Linear search: iterate and compare
- Binary search: concept only, implement optional
- Bubble sort: compare adjacent, swap if out of order
- Why efficiency matters: Big-O conceptually (not formally)
- Applying algorithms to arrays of part objects: sort by dimension, search by name, sort by print time

**In-Class Activities:**
- Physical simulation: 8 students hold cards with numbers; the class talks through bubble sort step by step
- Live code: linear search on an array of part objects (name, volume, printTime)
- Students trace bubble sort by hand on a 6-element array
- **AP CSP Discussion (10 min):** Parallel and distributed computing. "What if you had 4 printers instead of 1 — how would you split the print queue?" Introduce parallel processing, speedup, and why not everything parallelizes (dependencies).

**Assignments:**
- **A30.1 (Lab, Algorithms SLO primary):** Write a standalone JS program (not JSCAD) that:
  - Stores at least 8 "design parts" as objects with `name`, `volume`, `printTime` properties
  - Implements linear search by name (returns the part or `null`)
  - Implements bubble sort by `volume` (ascending)
  - Implements bubble sort by `printTime` (descending)
  - Prints results before and after sorting
  - Full comments explaining how each algorithm works step by step
- **A30.2 (Written):** Explain in your own words how bubble sort works. Why would sorting a list be useful in a real program? Give a real-world example beyond this course.

**Teacher Notes:**
- A30.1 is the formal sorting/searching SLO coverage artifact.
- The physical card simulation is highly effective — do not skip it.
- Students do not need to implement binary search but should understand why it's faster.
- **Enrichment (optional, not assessed):** Show a recursive implementation of factorial or linear search. Explain: "Some algorithms call themselves — this is called recursion. You'll see it again in the next course."

---

## Unit 4.2: Production Pipeline
> **SLO focus:** Reinforces **SLO 2** (multi-file modular structure). Covers Butte outline topic **File I/O (W31 JSCAD location — A31.1/A31.2)**. Prepares the production pipeline used by the capstone.

### 4.2.1 Multi-File Projects and File I/O (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (structured programming), Topic: File I/O
**Reading:** JSCAD → GitHub repo → jsdoc/tutorials (Multi-File Projects source), packages/io (file import system); JS1 → Modules → Modules, introduction, Export and Import; JS2 Ch 10 Modules (ES + CommonJS); JS2 Ch 20 Node.js → The filesystem module (conceptual File I/O); PY Ch 14 Files (structural)

**Learning Objectives:**
- Split a JSCAD project across multiple files
- Export data from one file and import it in another
- Explain what file I/O means and why it matters in programming
- Use JSCAD's file import system to load external geometry

**Topics:**
- Multi-file JSCAD projects: the `include` system
- Modular design: separating component definitions from assembly
- Exporting and importing JS modules
- JSCAD's file import: loading SVG, STL as geometry input
- Connecting to the general File I/O concept: reading and writing external data
- Version control intro: `git init`, `git add`, `git commit`, `git log` — why saving versions matters across multiple files

**In-Class Activities:**
- Teacher demo: split a previous project into two files — `components.js` and `main.js`
- Students refactor one of their Q3 projects into at least 2 files
- Demo importing an external SVG into JSCAD as a 2D profile
- Teacher demo: initialize a git repo, make two commits showing a before/after refactor
- **AP CSP Discussion (15 min):** Metadata and intellectual property. Imported SVG/STL files carry metadata — author, creation date, software used. Who owns a 3D model on Thingiverse? What license is it under? What is DMCA? "Always check the license before using someone else's geometry."

**Assignments:**
- **A31.1 (Lab, File I/O coverage):** Refactor one Q3 project into a multi-file structure: one file for component/helper functions, one file for parameters, one file for main assembly. Initialize a git repo and make at least 2 commits showing your refactoring progress. Write a README explaining what each file does and why you split it this way.
- **A31.2 (Written):** Explain what file I/O means in programming. How does JSCAD's multi-file system relate to the general concept of reading from and writing to files? Compare briefly with the shplay `save`/`storeItem` approach you used in W16.

**Teacher Notes:**
- A31.2 comparing JSCAD multi-file to shplay save/load reinforces that file I/O takes many forms.
- Students should leave this week with a working git workflow they can use on the capstone.

---

### 4.2.2 Colors, Text, and Export Formats (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3
**Reading:** JSCAD → colors → colorize; JSCAD → text → vectorChar, vectorText; JSCAD → GitHub repo → packages/io (STL/3MF/AMF/OBJ serializers — STL/OBJ not in JSDoc build, cite repo source) + User Guide `en:user_guide_formats`; JS1 → JavaScript Fundamentals → Data types (strings, review for text params)

**Learning Objectives:**
- Apply colors to JSCAD geometries using `colorize()`
- Use `vectorText` to add text to a 3D model
- Design models intended for display/presentation vs function
- Export in multiple formats (STL, 3MF, AMF)

**Topics:**
- `modeling/colors`: `colorize()`, named colors, RGB, hex
- `modeling/text`: `vectorChar`, `vectorText`
- Text as geometry: extruding text into 3D
- Multi-color design: strategic use of color for visualization
- Export formats: STL vs 3MF vs AMF — when to use each

**In-Class Activities:**
- Live code: personalized nameplate with extruded text and color
- Students build a colored, labeled version of a previous design
- Export in two different formats, compare file sizes

**Assignments:**
- **A32.1 (Lab):** Design a personalized nameplate or badge that includes: your name in 3D text (extruded), at least 2 colors, at least one design element beyond just text, parameters for text size and depth. Export as STL and print.
- **A32.2 (Quiz — in class, 15 min):** Name 3 export formats and when to use each. Write a `colorize()` call given an RGB value. Explain one difference between STL and 3MF.

**Exam:**
- **Semester 2 Midterm 3 (~1 hour, in class):** Covers Weeks 28–32 (hulls/advanced extrusions, measurements, sorting/searching, multi-file projects, colors/text/export). Format: 10 multiple-choice, 3 code-tracing (trace a sort or search; predict a colorize result), 2 short-answer (explain bubble sort; explain when to use each export format), 1 write-a-function problem (sort an array of parts). Administer at end of Week 32.

---

## Unit 4.3: Capstone
> **SLO focus:** **SLO 3 primary Sem 2 evidence (A36.1 3D Capstone)**; **SLO 1 closing artifact (A36.2 lifecycle reflection)**. Every SLO must be demonstrable in the capstone deliverable.

### 4.3.1 Capstone Design Phase (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1 (lifecycle), SLO 3 (design phase)
**Reading:** JS2 Ch 8 Bugs and Errors (design mindset / testing discipline, reference); JSCAD → parametric tutorial (parameter design review)

**Learning Objectives:**
- Define a project scope that is achievable and meaningful in 3 weeks
- Write a design specification before building
- Break a large project into milestones

**Topics:**
- Project scoping: what's realistic in 3 weeks of in-class work
- Design specification document: what it is, why it exists
- Milestone planning: working backwards from a deadline
- Peer design review: giving and receiving feedback

**Assignments:**
- **A33.1 — Capstone Design Spec (major grade component):** A 2-page design specification for your capstone project. Must include: project title and purpose, list of features/requirements, sketch of the design, parameter list (what will be parameterized and why), milestone plan with 3 checkpoints (M1 geometry, M2 parameters+validation, M3 polish+print), and a printability analysis (overhangs, supports, orientation).

**Teacher Notes:**
- "Functional" examples to suggest: a custom bracket, a cable clip, a tool holder, a modular shelf connector, a phone stand with specific angle, a desk organizer, a small-part enclosure.
- Require peer design review in class: students swap specs and flag one scope risk each.
- Specs that can't be built in 3 weeks get revised before W34 begins — no exceptions.

---

### 4.3.2 Capstone Build and Iterate (~7 hrs across W34–W35)
**Contact hours:** 7.0 (2 weeks)
**SLOs covered:** SLO 2 (structured programming), SLO 3 (implement + test)
**Reading:** JSCAD → measurements (printability reference); shplay → patterns → Scene/state switching (design-pattern reference); JS2 Ch 8 Bugs and Errors (iterative debugging)

**Learning Objectives:**
- Complete a full project through multiple design iterations
- Document the design process, not just the final product
- Give and receive structured peer feedback

**Topics:**
- Iteration: design → build → test → revise cycle
- Version control discipline: why and when you commit
- Peer code review: what to look for, how to give useful feedback
- Presentation skills: explaining a technical project to a non-technical audience
- **AP CSP Discussion (15 min, during W34):** Digital divide. Not everyone has access to 3D printers, high-speed Internet, or even computers. Discuss: who benefits from the tools we're using? Who is excluded? What can be done about it? "We're in a lab with 10 printers — most schools have zero."
- **AP CSP Discussion (15 min, during W35):** Computing bias. Designs reflect the assumptions of their creators. Examples: facial recognition accuracy varies by skin tone, voice assistants struggle with accents. Ask: "What assumptions did YOU make in your capstone? Who might struggle to use it?"

**Assignments:**
- **A34.1 — Capstone Milestone 1 (W34):** Working JSCAD model with basic geometry — no polish required. Code review with teacher.
- **A34.2 — Capstone Milestone 2 (W34 end):** All geometry complete, parameters working, input validation in place. Documentation draft.
- **A35.1 — Capstone Milestone 3 (W35):** Feature-complete model, README complete, test suite for key functions, first print attempted.
- **A35.2 — Peer Review (W35):** Review two classmates' capstones. Written feedback: what works, what's unclear, one specific code improvement suggestion, one specific design improvement suggestion.
- **A35.3 — Final Print (W35):** Submit final printed capstone with iteration documentation (photos of failed + successful prints + what changed between them).

**Teacher Notes:**
- Extra week built in for print failures, iteration, and debugging — this is the most error-prone part of the year.
- Require daily commits during the build weeks; commit frequency is graded as part of A34/A35.
- Students who finish early help classmates via peer review — do not assign new content.

---

### 4.3.3 Presentations and Reflection (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1 (lifecycle reflection), SLO 3 (full program demonstration) — **PRIMARY SLO 3 EVIDENCE FOR SEMESTER 2**

**Learning Objectives:**
- Present a technical project to a mixed audience
- Reflect on the full software development lifecycle through a completed work
- Connect the year's learning to the next course in the pathway

**Assignments:**
- **A36.1 — Capstone Presentation (major grade):** 5-minute presentation + Q&A. Must cover: what the object is and does; how you designed it (key code decisions); what changed from your original design spec and why; one thing you'd do differently; how this work connects to the FreeCAD/mechatronics pathway you're heading into.
- **A36.2 — Course Reflection (Written, SLO 1 closing artifact):** 1 page. Reflect on the software development life-cycle as you experienced it across the year. Give a specific example of each phase (design, code, test, maintenance) drawn from either the Q2 game capstone, the Q4 3D capstone, or both.

**Exam:**
- **Semester 2 Final (~1.5 hours, in class):** Cumulative exam covering all Semester 2 material (Weeks 19–36), with selected questions from Semester 1 fundamentals. Format: 20 multiple-choice (JS fundamentals, shplay, JSCAD modeling, algorithms), 5 code-tracing (mix of JS and JSCAD), 4 short-answer (SLO-aligned: lifecycle reflection; OOP vs procedural — include one question comparing them as SLO 2 backup artifact; algorithm analysis; testing principles), 2 write-code problems (one JSCAD modeling task, one standalone JS algorithm). Schedule on a separate day from capstone presentations.

**Teacher Notes:**
- Capstone presentations can be split across two class meetings if the cohort is large — presentations day 1, final exam day 2 (or reversed).
- Keep A36.2 reflections on file as the SLO 1 closing artifact for dual-enrollment documentation.

---

## GRADING STRUCTURE (Suggested)

| Category | Weight |
|----------|--------|
| Weekly Lab Assignments | 25% |
| Written Assignments | 10% |
| Quizzes (8 total) | 5% |
| Midterm Exams (6 total) | 15% |
| Final Exams (2 total) | 10% |
| Q1 Mini Project (W9 Print Job Manager) | 5% |
| Q2 Game Capstone (W18) | 15% |
| Q4 3D Capstone + Presentation (W33–W36) | 15% |

> **Note:** Quizzes, midterms, and finals are required evaluation methods per the Butte College CSCI 4 course outline. All four evaluation categories (quizzes, homework, lab projects, mid-term and final examinations) must be represented in grading.

### Exam Scheduling Notes

Exam weeks still include regular content. Plan for the exam to occupy the first class meeting (~1–1.5 hours), with remaining time for new content or project work.

| Exam | Week | Scheduling Guidance |
|------|------|-------------------|
| S1 Midterm 1 | 5 | Exam first day, loops content second day |
| S1 Midterm 2 | 9 | Exam first day, mini project work fills remaining time |
| S1 Midterm 3 | 14 | Covers shplay W10–14 (foundations, physics, OOP, groups, physics applications) |
| S1 Final | 18 | Exam and game capstone showcase on separate days within the week |
| S2 Midterm 1 | 22 | Covers JSCAD foundations W19–22 (libraries, 2D, booleans, parameters) |
| S2 Midterm 2 | 27 | Covers W23–27 (loops→geometry, extrusion, 3D primitives, error handling, testing) |
| S2 Midterm 3 | 32 | Covers W28–32 (hulls, measurements, sort/search, multi-file, colors/export) |
| S2 Final | 36 | Exam and 3D capstone presentations on separate days within the week |

---

## SLO COVERAGE FINAL VERIFICATION

| SLO / Topic | Covered By | Assessment Artifact |
|-------------|-----------|-------------------|
| SLO 1: Software lifecycle | W1 lecture, A1.1, W18 game capstone, A36.2 | A1.1 written (intro), A36.2 written (closing) |
| SLO 2: Structured programming / OOP | W2–3, W12 (shplay OOP), A12.2, S1 Final, S2 Final | A12.2 written (primary), exam questions (backup) |
| SLO 3: Design, implement, test programs | A9.1 (console mini-project), A18.1 (game capstone), A36.1 (3D capstone) | All major projects |
| SLO 4: Algorithms | W5, A5.1 (intro), A30.1 (applied) | A5.1 written (intro), A30.1 lab (applied) |
| Data types / variables | W2–3, A2.1, A2.2 | Lab assignments |
| Arrays | W8 (intro), W13 (shplay groups), W23 (JSCAD loops→geometry) | A8.1, A13.1, A23.1 |
| Control structures | W4–5 (core), applied W11–14 (shplay mechanics) | Lab + quiz |
| Algorithms: sort/search | W30, A30.1 | A30.1 lab + A30.2 written |
| File I/O | W8 (FileReader + Blob write), W16 (shplay save/load), W31 (JSCAD multi-file) | A8.2 + A8.3 labs, A16.1 lab, A31.1 lab + A31.2 written |
| Error handling | W26, A26.1 | A26.1 lab |
| Pass by value/reference | W7, A7.1, A7.2 | A7.2 written |
| Testing principles | W27, A27.1 | A27.1 lab + A27.2 written |
| Documentation | W3, enforced throughout | A3.1, inline in all projects |
| Coding conventions | W3, enforced throughout | Style guide rubric |
| OOP vs procedural | W12, A12.2, S1 Final, S2 Final | A12.2 written (primary), exam questions (backup) |

---

## SOURCE ALIGNMENT (open references per chapter)

The per-chapter reading map is **seeded from the full table of contents** in [`js-references-toc.md`](js-references-toc.md)
as the single source of truth for the seven open references:

- **JS1** → *The Modern JavaScript Tutorial* (javascript.info, Ilya Kantor, CC-BY-SA)
- **JS2** → *Eloquent JavaScript* (Marijn Haverbeke, CC-BY-NC, code MIT)
- **PY** → *Introduction to Python Programming* (OpenStax, CC BY-NC-SA) → structural model; Python syntax translated to JS
- **shplay** → in-app docs at `/docs/shplay` (bundled `public/shplay/`, v4.0.1, built from the public `shplay.d.ts` API) + GitHub project `github.com/shplay/shplay` + q5.js learn pages (LGPL-3.0) for graphics-layer concepts. **The external "Learn shplay" textbook is NOT a course reference** — its Creator License forbids CS-teaching/textbook use without the [shplay Educational License](https://shplay.org/teach)
- **JSCAD** → external API docs (openjscad.xyz, MIT) + GitHub monorepo `github.com/jscad/OpenJSCAD.org` → CDN-loaded, lessons need internet
- **freeCodeCamp** → the Q1 content platform — week-by-week mapping in `curriculum-alignment-guide.md`, full activity list in `curriculum-data/master-activity-list.md`
- **jscadui / jscad.app** → the Q3–Q4 JSCAD browser environment (`github.com/hrgdavor/jscadui`, MIT)

To seed a chapter/section/subsection, pull the matching **JS1/JS2/PY → chapter/section** or
**shplay → section → page** / **JSCAD → module → function** anchor from `js-references-toc.md`
and drop it into that section reading/source row. Anchor notation: `JS1 → Fundamentals → Variables` ·
`shplay → sprite → Your first sprite` · `JSCAD → extrusions → extrudeLinear`. Do **not** duplicate the TOC here.

- **Chapter 1** Foundations (W1→3): JS1 Fundamentals; JS2 Ch 1→2; PY Ch 1→2
- **Chapter 2** Control Flow (W4→5): JS1 Comparisons/Conditionals/Loops; JS2 Ch 2; PY Ch 4→5
- **Chapter 3** Functions and Data (W6→8): JS1 Functions/Objects/Arrays + File and FileReader; JS2 Ch 3→4; PY Ch 3/6/9/14
- **Chapter 4** Synthesis (W9): JS1 JavaScript specials; JS2 Ch 4
- **Chapter 5** shplay Foundations (W10→11): shplay in-app docs; JS1 Functions
- **Chapter 6** OOP (W12): JS1 Classes; JS2 Ch 6; PY Ch 11 (framing)
- **Chapter 7** Collections & Physics (W13→14): JS1 Arrays/Map/Set; JS2 Ch 4
- **Chapter 8** Animation & Camera (W15): shplay docs; JS1 Animation (optional)
- **Chapter 9** State & Persistence (W16): JS1 JSON methods + LocalStorage; JS2 Ch 18; PY Ch 14
- **Chapter 10** Advanced Mechanics (W17): shplay docs
- **Chapter 11** Game Capstone (W18): JS2 Ch 16 (optional enrichment)
- **Chapter 12** JSCAD Foundations (W19→21): JS1 Modules; JS2 Ch 10; PY Ch 7
- **Chapter 13** Parametric Design (W22→23): JS1 Functions/Arrays; JS2 Ch 5 (map); PY Ch 6/9
- **Chapter 14** 3D Modeling (W24→25): JSCAD API docs
- **Chapter 15** Quality & Rigor (W26→27): JS1 Error handling + Debugging + Mocha testing; JS2 Ch 8
- **Chapter 16** Advanced Modeling (W28→30): JS1 Array methods (sort); JS2 Ch 5
- **Chapter 17** Production Pipeline (W31→32): JS1 Modules; JS2 Ch 10 + Ch 20 Node fs; PY Ch 14
- **Chapter 18** 3D Capstone (W33→36): JS2 Ch 8 (design mindset); no reading for 4.3.3

## NOTES FOR CLAUDE CODE

When generating individual assignments from this plan, use the following conventions:

- Each assignment file should be named: `A[week].[number]_[short_title].md`
- Include: learning objectives, instructions, starter code (if applicable), rubric, estimated time, and which SLO(s) it covers
- Starter code for **Q1 (console)** assignments should run in the browser DevTools console or a bare `<script>` tag
- Starter code for **Q2 (shplay)** assignments should be a single `script.js` with `setup()`/`draw()`, runnable inside the in-app shplay editor
- Starter code for **Q3/Q4 (JSCAD)** assignments should use the browser-app format (no npm required). JSCAD imports: `const { primitives, transforms, booleans, measurements, colors, text, extrusions, hulls } = require('@jscad/modeling')`
- Written assignments should include a prompt, length guidance, and a simple rubric
- Lab assignments should include: setup instructions, step-by-step task list, expected output description, rubric
- All rubrics should reference the class coding style guide
- Print milestone assignments (starting W24) should include a print checklist section

### Priority build order for assignments:
1. **Q1 assignments first** (A1.1 through A9.1) — prerequisites for everything
2. **Q2 shplay assignments** (A10.1 through A18.1) — needed for the game capstone
3. **SLO coverage assignments** (A12.2 OOP written, A16.1 file I/O, A26.1 error handling, A27.1 testing, A30.1 sort/search) — required for dual-enrollment SLO documentation
4. **Q3 JSCAD foundations** (A19.1 through A27.3)
5. **Q4 advanced JSCAD + capstone** (A28.1 through A36.2)
6. **Major capstones** (A18.1 game, A36.1 3D model) — scaffolded by all preceding assignments

---

## APPENDIX A: CLASS CODING STYLE GUIDE

This is the grading rubric for code style, distributed in Week 3 and enforced for all assignments thereafter. Print this as a 1-page handout.

### Indentation
- 2 spaces per indent level. No tabs.
- Consistent nesting — every `{` increases indent, every `}` decreases.

### Semicolons
- Required at the end of every statement.

### Naming
- **Variables and functions:** `camelCase` — e.g., `printTime`, `calculateVolume`
- **Constants:** `UPPER_SNAKE_CASE` — e.g., `MAX_BUILD_WIDTH`, `DEFAULT_INFILL`
- **Classes:** `PascalCase` — e.g., `PrintPart`, `DesignComponent`
- Names must be descriptive. Single-letter names only allowed for loop counters (`i`, `j`, `k`).

### Comments
- Every function must have a JSDoc comment above it:
  ```js
  /**
   * Calculates the volume of a rectangular solid.
   * @param {number} w - width in mm
   * @param {number} h - height in mm
   * @param {number} d - depth in mm
   * @returns {number} volume in mm³
   */
  ```
- Inline comments (`//`) on any line where the logic is not obvious from the code alone.
- No commented-out code in final submissions.

### Spacing
- One space around operators: `x + y`, not `x+y`
- One space after commas: `func(a, b)`, not `func(a,b)`
- One blank line between function definitions.
- No trailing whitespace.

### Braces
- Opening brace on the same line as the statement:
  ```js
  if (condition) {
    // body
  }
  ```
- Always use braces for `if`/`else`/`for`/`while` bodies, even single-line.

### File Structure
- Imports/requires at the top.
- Constants after imports.
- Functions in the middle.
- Main logic / function calls at the bottom.
- README file required for all projects.

### Grading Deductions (per violation)
| Violation | Deduction |
|-----------|-----------|
| Missing JSDoc on a function | -2 pts |
| Inconsistent indentation | -1 pt per instance (max -5) |
| Poor variable name | -1 pt per instance |
| Missing semicolons | -1 pt per instance (max -3) |
| No README on a project | -5 pts |
| Commented-out code in submission | -2 pts |

---

## APPENDIX B: PRINT QUEUE MANAGEMENT

### Printer Group Assignments
- Assign students to printer groups of 3 in Week 24 (first print milestone — A24.1 / A24.2 extrusion lab).
- Each group shares one printer for the semester. Groups rotate printers each quarter.
- Post a group roster next to each printer.

### Queue Rotation
- Each printer group gets one designated print day per week.
- Students submit STL + print settings sheet to the queue by end of previous class.
- Teacher or designated student operator starts prints at the beginning of the print day.
- Long prints (>2 hours) may run overnight — teacher discretion.

### Print Settings Baseline
| Setting | Default Value |
|---------|--------------|
| Material | PLA |
| Layer height | 0.2 mm |
| Infill | 20% |
| Supports | Off unless needed |
| Build plate adhesion | Brim |
| Nozzle temp | 200°C |
| Bed temp | 60°C |

Students may deviate from defaults with justification documented in their print checklist.

### Failed Print Protocol
1. Document the failure: photo + 1-sentence description of what went wrong.
2. Diagnose: was it a model issue (non-manifold, overhang) or a printer issue (adhesion, jam)?
3. Fix the model or settings.
4. Resubmit to the queue.
5. Failed prints that are documented and iterated on are **not penalized** — iteration is the skill.

### Estimated Print Times (for queue planning)
| Part Volume | Typical Print Time |
|-------------|-------------------|
| < 10 cm³ | 30–60 min |
| 10–50 cm³ | 1–3 hours |
| 50–150 cm³ | 3–6 hours |
| > 150 cm³ | Teacher approval required |

---

## APPENDIX C: STUDENT SUPPORT AND REMEDIATION

### Early Identification
- Use A3.3 quiz (Week 3) and A4.2 quiz (Week 4) results to identify students struggling with fundamentals.
- S1 Midterm 1 (Week 5) is the first formal checkpoint. Students scoring below 60% should be flagged for intervention.
- Track quiz and midterm scores across the semester to identify trends.

### Catch-Up Opportunities
- **Week 9** (Q1 Review): built-in review week. Use midterm results to target review topics.
- **Week 14** (shplay Physics Applications): consolidation week, no brand-new concepts. Use it to rescue students lagging on W10–13.
- **Week 18** (Game Capstone): entire week is build time — easy to fold catch-up sessions into supervised work.
- **Week 29** (Measurements): light content; use extra time for print queue rotation and individual help.
- **Week 32** (Colors/Text/Export): light content; last checkpoint before capstone design begins.

### Peer Tutoring
- After S1 Midterm 1 results, pair struggling students with stronger peers for weekly 15-minute check-ins.
- Peer tutors earn participation credit. Struggling students are not penalized for needing help.

### Re-Submission Policy
- Weekly lab assignments accept re-submission with corrections for up to **80% credit**.
- Re-submissions must include a comment at the top explaining what was wrong and what was fixed.
- Major projects do not accept re-submission — iterate during the project timeline instead.

### Office Hours
- Teacher holds weekly office hours (recommend: one session before school, one at lunch).
- Students who score below 60% on any midterm are required to attend at least one office hours session before the next exam.

### Sequential Dependency Map
If a student falls behind, prioritize catching up on these gateway topics — everything downstream depends on them:

```
W2 Variables → W4 Conditionals → W5 Loops → W6 Functions → W8 Arrays
                                                              ↓
                                         W10 shplay Intro → W12 OOP → W16 State/Save → W18 Game Capstone
                                                              ↓
                                         W19 JSCAD Intro → W21 Booleans → W24 Extrusion → W28+ Advanced → W33 3D Capstone
```

A student who doesn't understand functions (W6) cannot succeed in shplay OOP (W12) or JSCAD. Catch this by Week 7 at the latest.
A student who hasn't grasped classes by W12 will struggle through the rest of Q2 — flag them before W13 (Groups) and keep them in re-submission loops on A12.1.
