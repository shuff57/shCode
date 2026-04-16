# CSCI 4 — Introduction to Programming Concepts and Methodologies
## Curriculum Plan: JavaScript + JSCAD 3D Modeling
### Chico USD / Butte College Dual Enrollment | High School Juniors

---

## COURSE METADATA

- **Language:** JavaScript (ES6+)
- **Primary Environment:** JSCAD browser app (https://openjscad.xyz/) — no install required
- **Secondary Environment:** Browser DevTools console for Q1 fundamentals
- **Students:** High school juniors, little to no prior coding experience
- **Contact Hours:** 3.5 hours/week × 36 weeks = 126 total contact hours
- **Printers:** 10 FDM printers, 250×250mm build plates, ~3 students per printer
- **Articulation:** Butte College CSCI 4 (dual enrollment)
- **Pathway Destination:** FreeCAD / Mechatronics course (same teacher)

---

## CSCI 4 SLO COVERAGE MAP

Each SLO must be covered by at least one graded assignment.

| SLO | Description | Primary Coverage | Backup Coverage |
|-----|-------------|-----------------|-----------------|
| SLO 1 | Describe the software development life-cycle | W1 lecture + W1 assignment | W33 capstone doc |
| SLO 2 | Describe principles of structured programming | W2 + W17 OOP unit | W10 functions unit |
| SLO 3 | Describe, design, implement, and test structured programs | W8 first program + W26 project | W33 capstone |
| SLO 4 | Explain what an algorithm is and its importance | W5 algorithm assignment | W22 sort/search unit |

### Topic Coverage Map

| Topic | Weeks | Assignment Type |
|-------|-------|----------------|
| Software life-cycle | 1 | Written + discussion |
| Procedural vs OOP | 17 | Code + written comparison |
| Program design tools & environments | 1–2 | Lab setup + reflection |
| Documentation | Throughout (formal: W3, W11) | Inline comments + README |
| Coding conventions | 3 (formal), enforced throughout | Code review rubric |
| Data types, variables, expressions, sequential processing | 2–3 | Exercises + quiz |
| Arrays | 13–14 | Modeling + standalone exercises |
| Control structures (if/switch/for/while/do...while) | 4–8 | Exercises + JSCAD patterns |
| Algorithms: sorting and searching | 22 | Standalone JS assignment |
| File I/O | 8, 19 (browser FileReader + JSCAD multi-file) | Lab + multi-file project |
| Error handling | 23 | Debug exercise |
| Parameters by value and reference | 10–11 | Functions deep dive |
| Testing principles | 24 | Test case writing assignment |

### AP CSP Non-Coding Topic Integration

These topics align with AP CSP Big Ideas 1, 2, 4, and 5 (which together account for **65–76% of the AP exam**). They are woven into existing weeks as 15–20 minute discussions, bell-ringer activities, or short written components — not separate units. Students taking AP CSP get reinforcement; all students get computing literacy.

| AP CSP Big Idea | Topic | Week | Integration Method |
|-----------------|-------|------|-------------------|
| BI 2: Data (17–22%) | Binary number systems — how computers store data | 2 | Discussion + activity |
| BI 2: Data | Data compression — lossy vs lossless | 8 | Discussion tied to file I/O |
| BI 2: Data | Digital image representation — pixels, RGB | 11 | Discussion tied to JSCAD colors |
| BI 2: Data | Metadata — data about data | 19 | Discussion tied to multi-file projects |
| BI 4: CSN (11–15%) | How the Internet works — HTTP, DNS, client-server | 10 | Discussion: how does JSCAD reach your browser? |
| BI 4: CSN | Protocols and fault tolerance — TCP/IP, routing, redundancy | 11 | Bell-ringer activity |
| BI 4: CSN | Parallel and distributed computing | 22 | Discussion tied to algorithm efficiency |
| BI 5: IOC (21–26%) | Open source and licensing — Creative Commons, copyright | 3 | Discussion tied to documentation week |
| BI 5: IOC | Beneficial and harmful effects of computing | 15 | Discussion: 3D printing ethics |
| BI 5: IOC | Digital divide — who has access to technology | 25 | Written component |
| BI 5: IOC | Computing bias — algorithmic bias, design bias | 33 | Discussion during capstone |
| BI 5: IOC | Cybersecurity — encryption, PII, phishing, malware | 23 | Discussion tied to error handling |
| BI 5: IOC | Intellectual property — DMCA, fair use, open source models | 19 | Discussion tied to importing external geometry |
| BI 1: CRD (10–13%) | Collaboration in development | 34 | Practiced via peer review |
| BI 1: CRD | Identifying and correcting errors | 23 | Directly covered (syntax, runtime, logic) |

---

# Q1: JavaScript Fundamentals
### ~35 contact hours | 10 weeks
### Goal: Students can read and write basic JS programs with confidence before any spatial complexity is added.
### Environment: Browser console + simple HTML files with embedded script tags. No JSCAD yet.

---

## Unit 1.1: Foundations

### 1.1.1 What Is Programming / Software Lifecycle (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1, SLO 4 (intro)

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

### 1.2.1 Conditionals (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3 (implement structured programs)

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

### 1.3.1 Functions: Definition and Calls (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2, SLO 3

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

**Learning Objectives:**
- Declare and initialize arrays
- Access elements by index
- Use array methods: push, pop, shift, unshift, length, indexOf, includes
- Use a loop to iterate over an array
- Create a multi-dimensional array
- Read a text file using the browser FileReader API
- Process file contents line-by-line using arrays

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

**In-Class Activities:**
- Live code: array of part names, loop through and print each
- Introduce `[x, y, z]` as a coordinate array — "this is how JSCAD will talk to us"
- Live code: build a simple HTML page with a file picker, read a .txt file, split into lines, display each line
- Students load a provided text file of part measurements and use arrays to process it
- **AP CSP Discussion (15 min):** Data compression. Compare the .txt file size to a compressed .zip of the same file. Explain lossy vs lossless compression. Preview: "STL files are huge because they store every triangle. 3MF uses compression — same model, smaller file."

**Assignments:**
- **A8.1 (Lab):** Write a program that stores 10 design measurements in an array. Use loops to find the maximum, minimum, and average. Must use at least 3 different array methods.
- **A8.2 (Lab, File I/O coverage):** Build an HTML page with a file input that reads a `.txt` file containing one item per line (provided: a list of 20 part names and dimensions). Using FileReader and `.split('\n')`, load the file into an array, then: (a) count how many lines contain a user-specified search string, (b) find and display all lines matching a filter, (c) display the total number of lines read. Must use at least one loop and one array method. Comment explaining how FileReader works and what sequential file access means.

**Teacher Notes:**
- The `[x, y, z]` array introduction is intentional foreshadowing. Say explicitly: "In a few weeks we'll be using arrays exactly like this to place shapes in 3D space."
- A8.2 is the primary File I/O coverage artifact. Provide students with a pre-made .txt file so they focus on the reading/processing code, not file creation.
- FileReader is asynchronous — students will encounter callbacks for the first time. Keep the explanation simple: "tell the browser what to do WHEN the file is ready." Do not go deep on async/promises.
- Bridge to JSCAD: "When we import files in JSCAD later, the browser is doing exactly this behind the scenes."

---

## Unit 1.4: Synthesis

### 1.4.1 Q1 Review and Mini-Project (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1, SLO 2, SLO 3, SLO 4 (synthesis)

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

# Q2: JSCAD — 2D to 3D
### ~31.5 contact hours | 9 weeks
### Goal: Students transition from pure JS to JSCAD. Start with 2D shapes, learn the library concept, then go 3D.
### Environment: JSCAD browser app (https://openjscad.xyz/). All work done in browser.

---

## Unit 2.1: JSCAD Foundations

### 2.1.1 Libraries and JSCAD Introduction (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (program design tools)

**Learning Objectives:**
- Explain what a software library is and why libraries exist
- Import and use a named export from a library
- Run a first JSCAD program in the browser
- Identify the required structure of a JSCAD file: `main()` function

**Topics:**
- What is a library: pre-written code organized into reusable modules
- Why reinvent the wheel? The economics of open source
- JSCAD's module structure: `@jscad/modeling` and its sub-modules
- Destructured imports: `const { primitives } = require('@jscad/modeling')`
- The JSCAD `main()` function: entry point, must return a geometry or array of geometries
- JSCAD browser UI tour: code editor, 3D viewport, export button

**In-Class Activities:**
- Teacher demo: build the simplest possible JSCAD program (return a cube)
- Students type it themselves — do not copy-paste
- Explore the viewport: rotate, zoom, pan
- Change the cube dimensions — observe the live update
- **AP CSP Discussion (15 min):** How the Internet works. JSCAD loaded in your browser from a server. Trace the path: DNS lookup → HTTP request → server response → browser renders. Draw it on the board. "Every time you open openjscad.xyz, all of this happens in milliseconds."

**Assignments:**
- **A10.1 (Lab):** Write a JSCAD program that imports from at least 2 different sub-modules (e.g. primitives and transforms) and returns at least 3 different shapes. Write a comment above each import explaining what that module provides.
- **A10.2 (Written):** In your own words, explain what a library is, why programmers use them, and what JSCAD's library provides. Half page.

**Teacher Notes:**
- The `require()` syntax will look unfamiliar. Explain it as "asking for a toolbox from a toolshed." The destructuring `const { primitives }` pulls out just the tools you need.
- Students will want to immediately make complex things. Hold them to simple this week — the goal is understanding the structure, not the output.

---

### 2.1.2 2D Shapes and Transforms (~3.5 hrs)
**Contact hours:** 3.5

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
- **AP CSP Bell-Ringer (10 min):** Protocols and fault tolerance. Quick discussion: "What happens if one server on the Internet goes down? Can your message still get through?" Introduce redundancy, routing, TCP/IP at a conceptual level. Tie to: digital images are data sent over these same protocols.

**Assignments:**
- **A11.1 (Lab):** Design a 2D logo or symbol using at least 6 shapes from at least 2 different primitive types. Must use translate and rotate on at least 2 shapes. Full comments. Export as SVG.
- **A11.2 (Lab):** Using only the JSCAD documentation (no asking for code), find and use one primitive type NOT covered in class this week. Write a comment explaining what it does and how you figured it out.

**Teacher Notes:**
- A11.2 is a deliberate documentation-reading exercise. Students need to get comfortable reading API docs — this is a professional skill.
- The coordinate system will confuse students who expect y to go down (like screen coordinates). Address this explicitly.

---

### 2.1.3 Boolean Operations in 2D (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Apply union, subtract, and intersect operations to 2D shapes
- Explain what each boolean operation produces conceptually
- Use booleans to create shapes that can't be made with primitives alone
- Debug a boolean operation that produces unexpected results

**Topics:**
- `modeling/booleans`: union, subtract, intersect
- Conceptual explanation: union = combine, subtract = cut, intersect = keep overlap
- Order matters in subtract
- Common failure: shapes must overlap for boolean to work
- Using booleans to create holes, cutouts, complex profiles

**In-Class Activities:**
- Live code: rectangle minus circle = shape with round hole
- Students reproduce 3 target shapes shown on screen using only primitives + booleans
- Debugging exercise: provided code with broken boolean — find and fix

**Assignments:**
- **A12.1 (Lab):** Create a 2D gasket or plate design that uses all three boolean operations (union, subtract, intersect). Must be a design that could realistically be laser-cut or used as a profile for extrusion. Comments explaining each boolean operation used.
- **A12.2 (Written):** Explain union, subtract, and intersect in your own words. Draw (by hand or digitally) what each operation produces given two overlapping circles.

**Teacher Notes:**
- Boolean operations are conceptually the most important JSCAD concept for the FreeCAD pathway. FreeCAD uses identical operations. Say this explicitly.
- "Order matters in subtract" is the #1 gotcha. Demo it visually.

**Quiz:**
- **A12.3 (Quiz — in class, 15 min):** Given 3 pairs of overlapping shapes, sketch or describe the result of union, subtract, and intersect. Identify which boolean operation was used in 2 provided JSCAD code snippets. One question on coordinate system orientation.

---

## Unit 2.2: Parametric Design

### 2.2.1 Parameters and getParameterDefinitions (~3.5 hrs)
**Contact hours:** 3.5

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
- Connecting back to functions: parameters are just function arguments with a UI

**In-Class Activities:**
- Refactor a hardcoded design from W11 to use parameters
- Live demo: change parameter slider, watch model update in real time
- Discussion: what would you parameterize in a real product?

**Assignments:**
- **A13.1 (Lab):** Take your A11.1 logo design and add at least 4 parameters using `getParameterDefinitions()`. At least one must be a number with min/max, one must be a checkbox that changes the design, one must be a choice/dropdown. The design must respond meaningfully to all parameters.
- **A13.2 (Written):** Explain the connection between `getParameterDefinitions()` parameters and the function parameters you learned in Q1. What is the same? What is different?

**Teacher Notes:**
- A13.2 is an explicit connection back to SLO content from Q1. Students should recognize that parameters are just arguments.
- The checkbox parameter that changes the design is intentionally open-ended — encourage creativity.

---

### 2.2.2 Arrays in JSCAD / Loops Generating Geometry (~3.5 hrs)
**Contact hours:** 3.5

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
- **A14.1 (Lab):** Write a JSCAD program that generates a pattern of at least 20 shapes using loops. The pattern must have at least 2 parameters that control it (e.g., count, spacing, size). Full comments. This should be something that would be interesting to eventually extrude and print.
- **A14.2 (Lab):** Rewrite A14.1's loop using `Array.from()` and `map()` instead of a for loop. Comment explaining what changed and which version you prefer and why.

**Teacher Notes:**
- This week is where students start seeing why code is more powerful than manual design tools. "Change one number, regenerate 20 shapes" lands well.
- `map()` is a stretch for beginners but worth introducing. Don't require mastery — require exposure.

**Exam:**
- **Semester 1 Midterm 3 (~1 hour, in class):** Covers Weeks 10–14 (JSCAD introduction, 2D shapes, transforms, booleans, parameters, arrays/loops generating geometry). Format: 5 multiple-choice on JSCAD concepts, 3 code-reading (what does this JSCAD code produce?), 2 short-answer (what is a library, explain parameterization), 1 write-a-JSCAD-function problem. Administer at start or end of week — teacher discretion.

---

## Unit 2.3: 3D Modeling

### 2.3.1 First Extrusion: 2D to 3D (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Extrude a 2D shape into a 3D solid using extrudeLinear
- Use extrudeRotate to create rotationally symmetric 3D forms
- Understand the coordinate system transition from 2D to 3D
- Export an STL file from JSCAD

**Topics:**
- `extrudeLinear({ height })`: push a 2D shape into the Z axis
- `extrudeRotate({ angle, segments })`: rotate a 2D profile around an axis
- 3D coordinate system: x, y, z — what changes from 2D
- STL export process
- Print preparation overview: what makes a model printable (manifold, no holes, flat bottom)

**In-Class Activities:**
- Live code: extrude the W12 gasket design into a 3D part
- Students extrude their own A12.1 design
- Demo: extrudeRotate to make a vase profile
- Discuss what makes a good first print
- **AP CSP Discussion (15 min):** Beneficial and harmful effects of computing. 3D printing enables prosthetics, housing, and custom medical devices — but also untraceable weapons, counterfeit parts, and copyright infringement. Discuss: "Just because you CAN print something, should you?"

**Assignments:**
- **A15.1 (Lab):** Take your A12.1 2D design and extrude it into a printable 3D part using extrudeLinear. Add a height parameter. Export STL. Write a print checklist comment at the top of the file: is it manifold? Does it have a flat bottom? What infill would you recommend?
- **A15.2 (Lab):** Use extrudeRotate to create a rotationally symmetric object (bowl, cup profile, knob, etc.). At least 2 parameters must control the shape. Export STL.

**Teacher Notes:**
- FIRST PRINT MILESTONE: A15.1 or A15.2 should be the first things students actually print. Coordinate print queue by printer group.
- Failed prints are learning opportunities. Require students to document what failed and what they changed.
- This is a major motivational moment — do not rush past it.

---

### 2.3.2 3D Primitives and Transforms (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Create 3D primitives: cube, cuboid, sphere, cylinder, torus
- Apply 3D transforms: translate, rotate, scale in 3D
- Compose multi-part 3D assemblies
- Use 3D boolean operations

**Topics:**
- 3D primitives from `modeling/primitives`
- 3D transforms: translate([x,y,z]), rotateX/Y/Z, scale
- 3D booleans: same union/subtract/intersect but now in 3D
- Building assemblies: multiple parts positioned relative to each other
- Thinking in 3D: spatial reasoning strategies

**In-Class Activities:**
- Live code: simple robot figure from primitives
- Students build a 3-part assembly of their choice
- Challenge: use subtract to cut a hole through a 3D solid

**Assignments:**
- **A16.1 (Lab):** Build a 3D assembly of at least 5 distinct primitives that together form a recognizable object (not just random shapes). Must use translate, at least one rotation, and at least one boolean operation. Fully parameterized with at least 3 parameters.
- **A16.2 (Lab):** Model a simple functional part: a cylinder with a hole through the center (like a bushing or spacer). Parameterize outer diameter, inner diameter (hole size), and height. Demonstrate that subtract correctly creates the hole.

**Teacher Notes:**
- A16.2 is the first "functional" part — it has a mechanical purpose. This connects to the mechatronics pathway destination.
- Students will struggle with 3D spatial reasoning. Encourage drawing on paper before coding.

**Quiz:**
- **A16.3 (Quiz — in class, 15 min):** Identify 3D primitives from descriptions, predict the result of a translate + rotate sequence, explain the difference between 2D and 3D boolean operations. One code-tracing question on a multi-part 3D assembly.

---

## Unit 2.4: Object-Oriented Programming

### 2.4.1 Classes and Objects (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 2 (OOP vs procedural), SLO 3

**Learning Objectives:**
- Define a class with a constructor and methods in JavaScript
- Instantiate objects from a class
- Access properties and call methods on an object
- Compare OOP to the procedural approach used so far
- Explain when OOP is more appropriate than procedural code

**Topics:**
- Class syntax: `class`, `constructor()`, `this`
- Instance methods
- Creating objects with `new`
- Comparing OOP vs procedural: same problem, two approaches
- OOP concepts introduced (not required to implement): encapsulation, inheritance, polymorphism
- Relevance: Python classes in FreeCAD scripting use identical concepts

**In-Class Activities:**
- Live code: `PrintPart` class with constructor(name, width, height, depth), `volume()` method, `fitsOnPrinter(maxW, maxH, maxD)` method
- Students extend the class: add one new property and one new method
- Pair exercise: build a `PrintQueue` class that stores an array of `PrintPart` objects

**Assignments:**
- **A17.1 (Lab):** Write a `DesignComponent` class with: constructor taking name, x, y, z dimensions, and material; a `volume()` method; a `describe()` method that returns a formatted string; a `isLargerThan(otherComponent)` method. Instantiate at least 4 objects and demonstrate all methods.
- **A17.2 (Written, graded):** Compare OOP and procedural programming. What problem does OOP solve that procedural code struggles with? Give a specific example from your own code this year. What did you use in Q1 that was procedural? (SLO 2 primary coverage for OOP vs procedural)

**Teacher Notes:**
- This is the OOP SLO coverage. A17.2 written response is the documentation artifact for SLO 2.
- Do not go deep into inheritance or polymorphism — introduce the vocabulary, explain the concept, don't require implementation.
- Explicitly bridge to FreeCAD: "When you use Python to script FreeCAD, you'll be creating and manipulating objects just like this."

---

## Unit 2.5: Synthesis

### 2.5.1 Q2 Review and Major Project (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3 (design, implement, test)

**Learning Objectives:**
- Design and build a complete parameterized 3D object independently
- Apply the full design process: plan → model → test → iterate → print
- Write complete documentation for a JSCAD project

**Assignments:**
- **A18.1 — Q2 Major Project (major grade):** Design and build a parameterized, printable object of your choosing. Requirements:
  - At least 8 parameters in `getParameterDefinitions()`
  - Uses at least 3 different primitive types
  - Uses at least 2 boolean operations
  - Uses at least one loop to generate repeated geometry
  - Fully documented with comments
  - README describing: what the object is, what each parameter does, print settings used
  - Must be actually printed and submitted with the physical print
  - 1-page design log: what you planned, what changed, what you would improve

**Teacher Notes:**
- This is the first major print milestone. Allow 2 weeks of in-class work time if needed.
- Grade on: parameterization quality, code documentation, design intent clarity, README, physical print.
- Failed prints that are documented and iterated on should not be penalized — iteration is the skill.

**Exam:**
- **Semester 1 Final (~1.5 hours, in class):** Cumulative exam covering all Semester 1 material (Weeks 1–18). Format: 20 multiple-choice (mix of JS fundamentals and JSCAD concepts), 5 code-tracing, 4 short-answer (SLO-aligned: lifecycle, structured programming, algorithms, OOP vs procedural — include one question comparing OOP and procedural approaches as SLO 2 backup artifact), 2 write-code problems (one pure JS, one JSCAD). Schedule the exam and project submission on separate days within the week.

---

# Q3: Advanced Modeling + CS Foundations
### ~31.5 contact hours | 9 weeks
### Goal: Advanced JSCAD modeling plus deliberate coverage of remaining SLO topics that don't fit naturally into the modeling spine.

---

## Unit 3.1: Project Architecture

### 3.1.1 Multi-File Projects and File I/O (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: File I/O

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
- Connecting to general File I/O concept: reading and writing external data
- Version control intro: `git init`, `git add`, `git commit`, `git log` — why saving versions matters when projects span multiple files

**In-Class Activities:**
- Teacher demo: split a previous project into two files — components.js and main.js
- Students refactor their A18.1 project into at least 2 files
- Demo importing an external SVG into JSCAD as a 2D profile
- Teacher demo: initialize a git repo, make two commits showing a before/after refactor
- **AP CSP Discussion (15 min):** Metadata and intellectual property. When you import an SVG or STL, it carries metadata — author, creation date, software used. Discuss: who owns a 3D model on Thingiverse? What license is it under? What is DMCA? "Always check the license before using someone else's geometry."

**Assignments:**
- **A19.1 (Lab, File I/O coverage):** Refactor your Q2 major project into a multi-file structure: one file for component/helper functions, one file for parameters, one file for main assembly. Initialize a git repo and make at least 2 commits showing your refactoring progress. Write a README explaining what each file does and why you split it this way.
- **A19.2 (Written):** Explain what file I/O means in programming. How does JSCAD's multi-file system relate to the general concept of reading from and writing to files? What are the limits of what JSCAD can do with files compared to a general-purpose program?

**Teacher Notes:**
- A19.2 written response is the File I/O SLO documentation artifact.
- The "limits of JSCAD file I/O" question in A19.2 is intentional — students should be honest that JSCAD's I/O is limited and understand what real file I/O looks like.

---

## Unit 3.2: Advanced JSCAD

### 3.2.1 Hulls and Advanced Extrusions (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Use hull() and hullChain() to create organic forms
- Use extrudeHelical for spiral/spring forms
- Use extrudeFromSlices for tapered or morphing extrusions
- Select the right extrusion type for a given design intent

**Topics:**
- `modeling/hulls`: hull(), hullChain()
- `extrudeHelical`: springs, threads, spirals
- `extrudeFromSlices`: lofted forms, tapers
- When to use each: form follows function
- Design intent: matching tool to outcome

**In-Class Activities:**
- Live code: hullChain through 5 circles of varying radius to make organic tube
- Students experiment freely for 30 minutes: build something they couldn't before
- Share-out: show one thing that surprised you

**Assignments:**
- **A20.1 (Lab):** Build a design that uses at least 2 advanced extrusion/hull techniques from this week. The design must be intentional (not random exploration) — write a design brief explaining what you were trying to make and why you chose those techniques.
- **A20.2 (Quiz — in class, 15 min):** Match each advanced technique (hull, hullChain, extrudeHelical, extrudeFromSlices) to the form it produces. Given a design goal, choose the correct technique and explain why.

---

### 3.2.2 Measurements and Printability (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Use JSCAD measurement functions to query geometry properties
- Calculate volume, bounding box, and surface area programmatically
- Identify common printability issues: overhangs, thin walls, unsupported spans
- Write a printability checker function

**Topics:**
- `modeling/measurements`: measureVolume, measureBoundingBox, measureDimensions
- Using measurement data in logic: "if volume > X, warn user"
- Printability constraints: overhang angle, minimum wall thickness, support needs
- Design for manufacturing: thinking about how a print will be built layer by layer

**In-Class Activities:**
- Live code: function that takes a geometry, measures it, and prints a report
- Students add a printability warning system to a previous design using parameters
- Discussion: what does a slicer actually do?

**Assignments:**
- **A21.1 (Lab):** Add a measurement report to your Q2 major project. The report should print: estimated volume, bounding box dimensions, whether it fits on the printer (using build volume check), and at least one design-specific measurement relevant to your part. Use `getParameterDefinitions()` to expose a "show measurements" toggle.

**Teacher Notes:**
- Light week by design — use extra time for print queue rotation, individual help, or catch-up on delayed assignments from W19–20.

---

## Unit 3.3: Algorithms and Software Quality

### 3.3.1 Sorting and Searching (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: algorithms including sorting and searching

**Learning Objectives:**
- Implement a linear search algorithm
- Implement a bubble sort algorithm
- Analyze why algorithm efficiency matters
- Apply sorting and searching to design-relevant data

**Topics:**
- Linear search: iterate and compare
- Binary search: concept only, implement optional
- Bubble sort: compare adjacent, swap if out of order
- Why efficiency matters: Big-O conceptually (not formally)
- Applying algorithms to arrays of objects: sort by dimension, search by name

**In-Class Activities:**
- Physical simulation: 8 students hold cards with numbers, class talks through bubble sort steps
- Live code: linear search on array of print job objects
- Students trace bubble sort by hand on a 6-element array
- **AP CSP Discussion (10 min):** Parallel and distributed computing. "What if you had 4 printers instead of 1 — how would you split the print queue?" Introduce the concept of parallel processing, speedup, and why you can't always parallelize everything (dependencies).

**Assignments:**
- **A22.1 (Lab, Algorithms SLO):** Write a JS program (not JSCAD — standalone) that:
  - Stores at least 8 "design parts" as objects with name, volume, printTime properties
  - Implements linear search by name (returns the part or null)
  - Implements bubble sort by volume (ascending)
  - Implements bubble sort by printTime (descending)
  - Prints results before and after sorting
  - Full comments explaining how each algorithm works step by step
- **A22.2 (Written):** Explain in your own words how bubble sort works. Why would sorting a list be useful in a real program?

**Teacher Notes:**
- A22.1 is the formal sorting/searching SLO coverage artifact.
- The physical card simulation is highly effective — do not skip it.
- Students do not need to implement binary search, but should understand why it's faster.
- **Enrichment (optional, not assessed):** Show a recursive implementation of factorial and linear search. Explain: "Some algorithms call themselves — this is called recursion. You'll see it again in CSCI 20." One live-code demo, no assignment required.

**Exam:**
- **Semester 2 Midterm 1 (~1 hour, in class):** Covers Weeks 19–22 (multi-file projects, file I/O concepts, advanced modeling, measurements, sorting and searching algorithms). Format: 10 multiple-choice, 3 code-tracing (trace a sort or search), 2 short-answer (explain bubble sort, what makes a model printable), 1 write-a-function problem (implement a search or sort on an array of objects). Administer at end of week after sorting/searching content.

---

### 3.3.2 Error Handling and Debugging (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: error handling

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
- Add input validation to A6.2 design calculator
- **AP CSP Discussion (15 min):** Cybersecurity basics. Error handling prevents crashes, but what about intentional attacks? Brief intro to: PII (personally identifiable information), phishing, malware, and why input validation is also a security practice. "Never trust user input — it might be an attack, not a mistake."

**Assignments:**
- **A23.1 (Lab, Error Handling SLO):** Take your W9 Print Job Manager and add: input validation to every function (throw errors for invalid inputs), try/catch around the main execution block, at least one custom error type, and a user-facing error message for each possible failure mode.
- **A23.2 (Lab):** Add error handling to your JSCAD Q2 major project: validate all parameters (e.g., prevent negative dimensions, enforce min/max), add a try/catch around your main function, and display a meaningful message when parameters are invalid.

---

### 3.3.3 Testing Principles (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** Topic: principles of testing and designing test data

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
- **A24.1 (Lab, Testing SLO):** Write a complete test suite for your W9 Print Job Manager functions. For each function, write at least 3 test cases: one normal input, one edge case (boundary value), one invalid input. Implement a simple test runner that reports pass/fail. Submit test results showing at least one test catching a real bug you then fixed.
- **A24.2 (Written):** Explain the difference between normal cases, edge cases, and error cases in testing. Why is it important to test all three?

**Teacher Notes:**
- A24.1 is the Testing SLO coverage artifact.
- "Submit test results showing at least one test catching a real bug" is intentional — students should experience tests as bug-finders, not box-checkers.

**Quiz:**
- **A24.3 (Quiz — in class, 15 min):** Classify 4 test cases as normal, edge, or error cases. Write 3 test cases for a provided function (one of each type). Explain why testing matters in one sentence.

---

## Unit 3.4: Presentation and Polish

### 3.4.1 Colors, Text, and Export Formats (~3.5 hrs)
**Contact hours:** 3.5

**Learning Objectives:**
- Apply colors to JSCAD geometries using colorize()
- Use vectorText to add text to a 3D model
- Design models intended for display/presentation vs function
- Export in multiple formats (STL, 3MF, AMF)

**Topics:**
- `modeling/colors`: colorize(), named colors, RGB, hex
- `modeling/text`: vectorChar, vectorText
- Text as geometry: extruding text into 3D
- Multi-color design: strategic use of color for visualization
- Export formats: STL vs 3MF vs AMF — when to use each

**In-Class Activities:**
- Live code: personalized nameplate with extruded text and color
- Students build a colored, labeled version of a previous design
- Export in two different formats, compare file sizes
- **AP CSP Discussion (20 min):** Digital divide and access to technology. Not everyone has access to 3D printers, high-speed Internet, or even computers. Discuss: who benefits from the tools we're using? Who is excluded? What can be done about it? Connection: "We're in a lab with 10 printers — most schools have zero."

**Assignments:**
- **A25.1 (Lab):** Design a personalized nameplate or badge that includes: your name in 3D text (extruded), at least 2 colors, at least one design element beyond just text, parameters for text size and depth. Export as STL and print.
- **A25.2 (Quiz — in class, 15 min):** Name 3 export formats and when to use each. Write a `colorize()` call given an RGB value. Explain one difference between STL and 3MF.
- **A25.3 (Written, AP CSP IOC):** Half page: choose one computing innovation (3D printing, AI, social media, GPS, or your own) and describe one beneficial effect and one harmful effect. Explain who is helped and who might be harmed. Mention at least one legal or ethical concern (copyright, privacy, access, bias).

**Teacher Notes:**
- Light week by design — use extra time for print queue rotation, individual help, or catch-up on delayed assignments from W23–24.

---

## Unit 3.5: Synthesis

### 3.5.1 Q3 Major Project (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 3 (full design, implement, test cycle)

**Learning Objectives:**
- Complete a full design-to-print cycle independently
- Apply error handling, testing, and documentation to a JSCAD project
- Iterate based on print results

**Assignments:**
- **A26.1 — Q3 Major Project (major grade):** Design a functional mechanical part or assembly. Requirements:
  - Must have a real function (not purely decorative)
  - At least 10 parameters
  - Multi-file structure (at least 2 files)
  - Measurement report built in
  - Input validation on all parameters
  - README with: design intent, parameter documentation, print settings, iteration log
  - Physical print required
  - Must be able to explain every line of code if asked

**Teacher Notes:**
- "Functional" examples: a custom bracket, a cable clip, a tool holder, a modular shelf connector, a phone stand with specific angle.
- Physical print + code are both graded. A beautiful print with undocumented spaghetti code is not full credit.

---

### 3.5.2 Q3 Review (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1, SLO 2, SLO 3, SLO 4 (synthesis)

**Learning Objectives:**
- Demonstrate mastery of Q3 concepts through review and examination
- Identify connections between pure JS concepts and JSCAD applications
- Self-assess readiness for the capstone project

**Topics:**
- Review: multi-file projects, advanced modeling, measurements, algorithms, error handling, testing
- Connecting concepts: how Q1 fundamentals enabled Q3 complexity
- Capstone project preview: what to expect in Q4

**In-Class Activities:**
- Q3 concept review: structured review of W19–W26 topics
- Practice problems: mixed set of JS + JSCAD problems covering all Q3 topics
- Capstone project overview and brainstorming session

**Assignments:**
- **A27.1 (Review Lab):** Complete a set of 8 review problems spanning Q3 topics: multi-file module design, measurement queries, sorting/searching, error handling with try/catch, test case writing, and JSCAD modeling. Self-grade using provided answer key and identify your weakest area.

**Exam:**
- **Semester 2 Midterm 2 (~1 hour, in class):** Cumulative Q3 exam covering Weeks 19–26 (multi-file projects, advanced modeling, measurements, sorting/searching, error handling, testing, colors/text). Format: 15 multiple-choice, 5 code-tracing, 3 short-answer, 2 write-code problems (one algorithm, one JSCAD). Administer after the review activity.

**Teacher Notes:**
- This is the buffer week. Use it to catch up on any Q3 content that ran long.
- The self-assessment in A27.1 helps students identify what to review before the midterm.
- Use the capstone brainstorming to get students thinking early — they'll start design specs next week.

---

# Q4: FreeCAD Bridge + Capstone
### ~28 contact hours | 8 weeks
### Goal: FreeCAD bridge unit first to inform capstone thinking, then student-directed capstone project with no mid-project interruption.

---

## Unit 4.1: FreeCAD Bridge

### 4.1.1 FreeCAD Interface and Python Basics (~3.5 hrs)
> **Compressed** from 2 weeks to 1. Preview, not mastery. A29.1 becomes a stretch goal within A28.1.
**Contact hours:** 7.0

**Learning Objectives:**
- Open and navigate the FreeCAD interface
- Identify the equivalent of JSCAD operations in FreeCAD's GUI
- Write a basic FreeCAD Python macro that creates geometry
- Explain what a Python macro is and how it relates to JS functions

**Topics:**
- FreeCAD interface tour: workbenches, model tree, 3D view
- Sketch → Pad (same as 2D profile → extrudeLinear)
- Part Design boolean operations: identical concepts, different UI
- FreeCAD Python console: REPL, same concept as browser DevTools
- Python syntax crash course: the 5 differences from JS that matter
  - Indentation instead of braces
  - `def` instead of `function`
  - No semicolons
  - `print()` not `console.log()`
  - Different import syntax
- Writing a macro: `FreeCAD.ActiveDocument.addObject()` to create a box programmatically
- Parametric modeling in FreeCAD: Spreadsheet workbench as equivalent to `getParameterDefinitions()`

**In-Class Activities:**
- Side-by-side: JSCAD code on left, FreeCAD UI on right — find every equivalent operation
- Students recreate their A16.2 bushing/spacer in FreeCAD using only the GUI
- Students write a FreeCAD Python macro that creates a box with user-defined dimensions

**Assignments:**
- **A28.1 (Lab — Bridge Unit):** Complete a mapping document: for each JSCAD concept listed (primitives, translate, rotate, subtract, union, extrudeLinear, parameters, multi-file), write the FreeCAD equivalent. Include a screenshot of where to find it in FreeCAD.
- **A29.1 (Lab — Bridge Unit):** Write a FreeCAD Python macro that creates a parametric cylinder with a hole (same as A16.2 in JSCAD). Comment the Python code with annotations explaining the JS equivalent of each line.

**Teacher Notes:**
- The bridge unit is explicitly a preview, not mastery. Students should leave knowing: "I've been here before, just with different syntax."
- The Python syntax crash course should be framed as: "You already know programming. Python is just a different dialect."
- A28.1 mapping document is the artifact that makes this a pathway unit. Keep it — it's also useful as a reference card for the mechatronics course.
- Placing the bridge first means capstone design starts with FreeCAD concepts fresh — students may incorporate ideas from both tools into their capstone planning.

---

## Unit 4.2: Capstone Project

### 4.2.1 Design Phase (~7 hrs)
> **Compressed** from 3 weeks to 2. Design spec and first milestone combined.
**Contact hours:** 10.5

**Learning Objectives:**
- Define a project scope that is achievable and meaningful
- Write a design specification before building
- Break a large project into milestones

**Topics:**
- Project scoping: what's realistic in 6 weeks
- Design specification document: what it is, why it exists
- Milestone planning: working backwards from a deadline
- Peer design review: giving and receiving feedback

**Assignments:**
- **A30.1 — Capstone Design Spec (major grade):** A 2-page design specification for your capstone project. Must include: project title and purpose, list of features/requirements, sketch of the design, parameter list (what will be parameterized and why), milestone plan with 3 checkpoints, and a printability analysis.
- **A31.1 — Capstone Milestone 1:** Working JSCAD model with basic geometry — no polish required. Code review with teacher.
- **A32.1 — Capstone Milestone 2:** All geometry complete, parameters working, documentation in progress.

**Exam:**
- **Semester 2 Midterm 3 (~1 hour, in class):** Covers Weeks 28–32 (FreeCAD bridge concepts, Python syntax basics, capstone design process). Format: 5 multiple-choice on FreeCAD/Python concepts, 3 concept-mapping questions (JSCAD concept → FreeCAD equivalent), 2 short-answer (explain a design decision from your capstone, compare JS and Python syntax), 1 write-a-macro problem (simple FreeCAD Python macro). Administer at end of Week 32.

**Teacher Notes:**
- Capstone design now follows the bridge directly — students can draw on both JSCAD and FreeCAD concepts when planning.
- "6 weeks" = design (W30–32) + build (W33–35). W36 is presentations + final.

---

### 4.2.2 Build and Iterate (~14 hrs)
> **Extended** from 3 weeks to 4. Extra week for print failures, iteration, and debugging.
**Contact hours:** 10.5

**Learning Objectives:**
- Complete a full project through multiple design iterations
- Document the design process, not just the final product
- Give and receive structured peer feedback

**Topics:**
- Iteration: design → build → test → revise cycle
- Version control concepts: why you save versions
- Peer code review: what to look for, how to give useful feedback
- Presentation skills: explaining a technical project to a non-technical audience
- **AP CSP Discussion (15 min, during W33):** Computing bias. Algorithms and designs reflect the assumptions of their creators. Examples: facial recognition accuracy varies by skin tone, voice assistants struggle with accents, autocomplete reinforces stereotypes. Ask: "What assumptions did YOU make in your capstone design? Who might struggle to use it?"

**Assignments:**
- **A33.1 — Capstone Milestone 3:** Feature-complete model, documentation complete, test suite for key functions.
- **A34.1 — Peer Review:** Review two classmates' capstone projects. Write structured feedback: what works, what's unclear, one specific code improvement suggestion, one design improvement suggestion.
- **A35.1 — Final Print:** Submit final printed capstone with iteration documentation.

---

### 4.2.3 Presentations and Reflection (~3.5 hrs)
**Contact hours:** 3.5
**SLOs covered:** SLO 1 (lifecycle reflection), SLO 3 (full program demonstration)

**Assignments:**
- **A36.1 — Capstone Presentation (major grade):** 5-minute presentation + Q&A. Must cover: what the object is and does, how you designed it (key code decisions), what changed from your original design spec and why, one thing you'd do differently, how this work connects to the FreeCAD/mechatronics course.
- **A36.2 — Course Reflection (Written):** 1 page. Reflect on the software development life-cycle as you experienced it across the year. Give a specific example of each phase from your capstone project. (SLO 1 closing artifact)

**Exam:**
- **Semester 2 Final (~1.5 hours, in class):** Cumulative exam covering all Semester 2 material (Weeks 19–36), with selected questions from Semester 1 fundamentals. Format: 20 multiple-choice (JS fundamentals, JSCAD modeling, algorithms, FreeCAD concepts), 5 code-tracing (mix of JS and Python), 4 short-answer (SLO-aligned: lifecycle reflection, OOP vs procedural — include one question comparing OOP and procedural as SLO 2 backup artifact, algorithm analysis, testing principles), 2 write-code problems (one JSCAD modeling task, one standalone JS algorithm). Schedule on a separate day from capstone presentations.

---

## GRADING STRUCTURE (Suggested)

| Category | Weight |
|----------|--------|
| Weekly Lab Assignments | 22% |
| Written Assignments | 10% |
| Quizzes (8 total) | 5% |
| Midterm Exams (6 total) | 15% |
| Final Exams (2 total) | 10% |
| Q1 Mini Project | 5% |
| Q2 Major Project | 10% |
| Q3 Major Project | 10% |
| Capstone Project + Presentation | 13% |

> **Note:** Quizzes, midterms, and finals are required evaluation methods per the Butte College CSCI 4 course outline. All four evaluation categories (quizzes, homework, lab projects, mid-term and final examinations) must be represented in grading.

### Exam Scheduling Notes

Exam weeks still include regular content. Plan for the exam to occupy the first class meeting (~1–1.5 hours), with remaining time for new content or project work.

| Exam | Week | Scheduling Guidance |
|------|------|-------------------|
| S1 Midterm 1 | 5 | Exam first day, loops content second day |
| S1 Midterm 2 | 9 | Exam first day, mini project work fills remaining time (may extend into W10 first session) |
| S1 Midterm 3 | 14 | Exam first day, arrays-in-JSCAD content second day |
| S1 Final | 18 | Exam and Q2 project submission on separate days within the week |
| S2 Midterm 1 | 22 | Exam at end of week after sorting/searching content completes |
| S2 Midterm 2 | 27 | Review activity first, exam second — this is a buffer week |
| S2 Midterm 3 | 32 | Exam at end of week after capstone milestone 2 |
| S2 Final | 36 | Exam and capstone presentations on separate days within the week |

---

## SLO COVERAGE FINAL VERIFICATION

| SLO | Covered By | Assessment Artifact |
|-----|-----------|-------------------|
| SLO 1: Software lifecycle | W1 lecture, A1.1, A36.2 | A1.1 written, A36.2 written |
| SLO 2: Structured programming / OOP | W2–3, W17, A17.2, S1 Final, S2 Final | A17.2 written (primary), S1/S2 Final exam questions (backup) |
| SLO 3: Design, implement, test programs | A9.1 (with manual tests), A18.1, A26.1, A36.1 | All major projects |
| SLO 4: Algorithms | W5, A5.1, A22.1 | A5.1 written, A22.1 lab |
| Data types/variables | W2–3, A2.1, A2.2 | Lab assignments |
| Arrays | W8, W14, A8.1, A14.1 | Lab assignments |
| Control structures | W4–6 (incl. do...while W5), A4.1 | Lab + quiz |
| Algorithms: sort/search | W22, A22.1 | A22.1 lab + A22.2 written |
| File I/O | W8, W19, A8.2, A19.1, A19.2 | A8.2 lab (primary), A19.2 written |
| Error handling | W23, A23.1 | A23.1 lab |
| Pass by value/reference | W7, A7.1, A7.2 | A7.2 written |
| Testing principles | W24, A24.1 | A24.1 lab + A24.2 written |
| Documentation | W3, enforced throughout | A3.1, inline in all projects |
| Coding conventions | W3, enforced throughout | Style guide rubric |
| OOP vs procedural | W17, A17.2, S1 Final, S2 Final | A17.2 written (primary), exam questions (backup) |
| Software lifecycle | W1, W36 | A1.1, A36.2 |

---

## NOTES FOR CLAUDE CODE

When generating individual assignments from this plan, use the following conventions:

- Each assignment file should be named: `A[week].[number]_[short_title].md`
- Include: learning objectives, instructions, starter code (if applicable), rubric, estimated time, and which SLO(s) it covers
- Starter code for JSCAD assignments should use the browser app format (no npm required)
- JSCAD starter code imports should use: `const { primitives, transforms, booleans, measurements, colors, text, extrusions } = require('@jscad/modeling')`
- Written assignments should include a prompt, length guidance, and a simple rubric
- Lab assignments should include: setup instructions, step-by-step task list, expected output description, rubric
- All rubrics should reference the class coding style guide
- Print milestone assignments should include a print checklist section

### Priority build order for assignments:
1. Q1 assignments first (A1.1 through A9.1) — needed before anything else
2. Q2 transition assignments (A10.1 through A15.2) — needed for JSCAD intro
3. SLO coverage assignments (A17, A19, A22, A23, A24) — needed for dual enrollment documentation
4. Major projects (A18.1, A26.1, A36.1) — scaffolded by all preceding assignments
5. Bridge unit (A28.1, A29.1) — now first in Q4, can be built in parallel with Q3 assignments

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
- Assign students to printer groups of 3 in Week 15 (first print milestone).
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
- **Week 27** (Q3 Review): built-in review + buffer week. Allows Q3 content to run long if needed.
- **Weeks 21 and 25** are intentionally light — use extra time for individual help or catch-up.

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
                                              W10 JSCAD Intro → W12 Booleans → W15 Extrusion → All Q3/Q4
```

A student who doesn't understand functions (W6) cannot succeed in JSCAD. Catch this by Week 7 at the latest.
