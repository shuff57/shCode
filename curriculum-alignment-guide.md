# CSCI 4 Curriculum Alignment Guide
## freeCodeCamp (FCC) Lesson Mapping

This guide maps external lesson sections from freeCodeCamp's JavaScript Certification to the CSCI 4 curriculum plan. Alignment is at the section/module level. Multiple sources may align to the same week. JSCAD-specific weeks are omitted (mapped separately).

**Sources:**
- **FCC** = freeCodeCamp JavaScript Certification (v9)
- *(external platform sections carry no source tag)*


---

## QUARTER 1: JavaScript Fundamentals (Weeks 1-9)

### Week 1 — What Is Programming / Software Lifecycle

| Source | Section | Notes |
|--------|---------|-------|
| 1.1 | Welcome to AP CSP | Video intro to CS concepts |
| 1.2 | Introduction to Programming With Karel | First program, commands, sequential execution |
| 3.1 | What is Code | Video + written reflection on what code is |
| 3.2 | Uses of Programs | Why learn to program, programs in daily life |
| 1.1 | Introduction to Programming With Karel | Same Karel intro, fewer activities |
| FCC Variables and Strings | Introduction to JavaScript [Theory] | What JS is, first statements, console output |

**Gap:** freeCodeCamp does not explicitly teach the software development lifecycle (design-code-test-maintain). This is teacher-delivered content per the curriculum plan.

---

### Week 2 — Variables and Data Types

| Source | Section | Notes |
|--------|---------|-------|
| FCC Variables and Strings | Introduction to JavaScript [Theory] | `let`, `const`, variable declaration |
| FCC Variables and Strings | Working with Data Types [Theory] | Numbers, strings, booleans, typeof |
| FCC Variables and Strings | Build a Greeting Bot [Workshop] | Variable practice with string output |
| FCC Variables and Strings | Build a JavaScript Trivia Bot [Lab] | Variables + strings applied |
| FCC Variables and Strings | Build a Sentence Maker [Lab] | Template literals, concatenation |
| FCC Variables and Strings | JavaScript Variables and Data Types Review [Review] | Consolidation |
| FCC Variables and Strings | JavaScript Variables and Data Types Quiz [Quiz] | Assessment |
| 3.3 | Hello World | console.log, first JS output |
| 3.4 | Variables | Variable declaration, assignment, types |
| 3.6 | Basic Math in JavaScript | Arithmetic operators, order of operations, type coercion (`24 vs "24"`) |
| 3.1 | Hello World | Same as AP 3.3 |
| 3.2 | Variables | Same as AP 3.4 |
| 3.4 | Basic Math in JavaScript | Same as AP 3.6 |

**Strong coverage.** freeCodeCamp's "Working with Data Types" theory section directly addresses `typeof`, type coercion, and the four primary types.

---

### Week 3 — Documentation and Coding Conventions

| Source | Section | Notes |
|--------|---------|-------|
| FCC Variables and Strings | Understanding Code Clarity [Theory] | Naming, readability, clean code principles |
| 1.7 | Top Down Design and Decomposition in Karel | Structured decomposition (conceptual bridge) |
| 1.8 | Commenting Your Code | Single-line/block comments, why comments matter |
| 1.18 | How to Indent Your Code | Indentation rules and formatting |
| 1.7 | Commenting Your Code | Same as AP 1.8 |
| 1.15 | How to Indent Your Code | Same as AP 1.18 |

**Partial gap:** Neither source covers README writing or JSDoc-style documentation. The FCC "Understanding Code Clarity" theory is the closest to the curriculum plan's code readability focus. Teacher-created style guide still needed.

---

### Week 4 — Conditionals

| Source | Section | Notes |
|--------|---------|-------|
| FCC Booleans and Numbers | Working with Comparison and Boolean Operators [Theory] | `===`, `!==`, `<`, `>`, `&&`, `\|\|`, `!` |
| FCC Booleans and Numbers | Understanding Comparisons and Conditionals [Theory] | if/else if/else, switch |
| FCC Booleans and Numbers | Build a Logic Checker App [Workshop] | Applied boolean logic |
| FCC Booleans and Numbers | Build a Fortune Teller [Lab] | Conditionals in practice |
| FCC Booleans and Numbers | JavaScript Comparisons and Conditionals Review [Review] | |
| FCC Booleans and Numbers | JavaScript Comparisons and Conditionals Quiz [Quiz] | |
| 4.1 | Booleans | Boolean values, true/false |
| 4.2 | Logical Operators | `&&`, `\|\|`, `!` with exercises (Can You Graduate?, School's Out) |
| 4.3 | Comparison Operators | `==`, `<`, `>`, `<=`, `>=` with exercises |
| 4.4 | If Statements | if/else if/else, nested conditionals (10 activities including Teenagers, Meal Planner) |
| 5.1 | Booleans | Same as AP 4.1 |
| 5.2 | Logical Operators | Same as AP 4.2 |
| 5.3 | Comparison Operators | Same as AP 4.3 |
| 5.4 | If Statements | Same as AP 4.4, with 10 activities |

**Excellent coverage.** freeCodeCamp has strong theory explanations. Neither emphasizes `===` vs `==` as strongly as the curriculum plan requires — teacher should supplement.

---

### Week 5 — Algorithms and Loops (For and While)

| Source | Section | Notes |
|--------|---------|-------|
| FCC Loops | Working with Loops [Theory] | for, while, do-while, break, continue |
| FCC Loops | Build a Sentence Analyzer [Workshop] | Loop-based string processing |
| FCC Loops | Build a Space Mission Roster [Workshop] | Iterating and accumulating |
| FCC Loops | Build a Factorial Calculator [Lab] | Classic accumulation pattern |
| FCC Loops | Build a Longest Word Finder App [Lab] | Searching pattern with loops |
| FCC Loops | JavaScript Loops Review [Review] | |
| FCC Loops | JavaScript Loops Quiz [Quiz] | |
| 4.6 | For Loops in JavaScript | Basic for loop syntax, exercises (Meme Text Generator, The Worm) |
| 4.7 | General For Loops | Countdown, count by twos, powers of two |
| 4.8 | For Loop Practice | Sum, factorial, nested concepts |
| 4.10 | While Loops | While loop syntax, Inventory exercise, Fibonacci |
| 4.11 | Loop and a Half | Break patterns, sentinel loops (Snake Eyes, Better Password) |
| 1.11 | For Loops (Karel) | Visual loop concept reinforcement |
| 1.14 | While Loops in Karel | Visual while loop reinforcement |
| 1.17 | Karel Algorithms | Algorithm thinking with Karel |
| 5.5 | For Loops in JavaScript | Same as AP 4.6 |
| 5.6 | General For Loops | Same as AP 4.7 |
| 5.9 | While Loops | Same as AP 4.10 |
| 5.10 | Loop and a Half | Same as AP 4.11 |

**Strong coverage.** freeCodeCamp has better applied projects (Factorial Calculator, Longest Word Finder). The curriculum plan's algorithm definition ("precise, ordered set of steps") is teacher-delivered.

**Gap:** Neither source explicitly covers the "what is an algorithm" conceptual discussion the curriculum plan requires for SLO 4.

---

### Week 6 — Functions Part 1 (Definition and Calls)

| Source | Section | Notes |
|--------|---------|-------|
| FCC Functions | Working with Functions [Theory] | Function declaration, parameters, return values, arrow functions |
| FCC Functions | Build a Calculator [Workshop] | Functions with parameters and returns |
| FCC Functions | Build a Boolean Check Function [Lab] | Return values practice |
| FCC Functions | Build an Email Masker [Lab] | String processing with functions |
| FCC Functions | Build a Loan Qualification Checker [Workshop] | Multi-parameter functions |
| FCC Functions | Build a Celsius to Fahrenheit Converter [Lab] | Simple function with return |
| FCC Functions | JavaScript Functions Review [Review] | |
| FCC Functions | JavaScript Functions Quiz [Quiz] | |
| 5.1 | Functions and Parameters 1 | Function definition, single parameter (Double, Square, Triple) |
| 5.2 | Functions and Parameters 2 | Multiple parameters (Sum, Area of Triangle) |
| 5.3 | Functions and Parameters 3 | Functions with graphics — visual feedback |
| 5.4 | Functions and Return Values 1 | Return values intro |
| 5.5 | Functions and Return Values 2 | Return values applied (Is It Even?, Min) |
| 5.6 | Local Variables and Scope | Scope intro — local vs global |
| 7.1-7.6 | Functions and Parameters 1-6 + Return Values + Scope | Same content as AP 5.x |

**Excellent coverage.** freeCodeCamp has strong applied projects (Calculator, Loan Checker).

---

### Week 7 — Functions Part 2 (Pass by Value/Reference)

| Source | Section | Notes |
|--------|---------|-------|
| FCC Objects | Introduction to JavaScript Objects and Their Properties [Theory] | Objects as reference types (partial) |
| FCC Objects | Working with Optional Chaining and Object Destructuring [Theory] | Spread operator, destructuring (partial) |
| FCC JavaScript Fundamentals Review | Working with Types and Objects [Theory] | Value vs reference types revisited |

**Significant gap.** freeCodeCamp has no dedicated section on pass-by-value vs pass-by-reference. This is a curriculum plan-specific deep dive (SLO topic). FCC's Objects theory touches on reference types, and the Fundamentals Review revisits it, but it does not explicitly contrast primitive vs object mutation behavior. This week is primarily teacher-delivered with custom exercises.

---

### Week 8 — Arrays and File I/O

| Source | Section | Notes |
|--------|---------|-------|
| FCC Arrays | Working with Arrays [Theory] | Declaration, indexing, common methods (push, pop, shift, unshift, includes) |
| FCC Arrays | Build a Shopping List [Workshop] | Array creation and manipulation |
| FCC Arrays | Build a Lunch Picker Program [Lab] | Random access, array methods |
| FCC Arrays | Build a Golf Score Translator [Lab] | Array lookup pattern |
| FCC Arrays | Working with Common Array Methods [Theory] | map, filter, slice, splice, indexOf |
| FCC Arrays | JavaScript Arrays Review [Review] | |
| FCC Arrays | JavaScript Arrays Quiz [Quiz] | |
| 7.1 | Intro to Lists/Arrays | Array declaration, literal syntax |
| 7.2 | Indexing Into an Array | Zero-based indexing, bracket notation |
| 7.3 | Adding/Removing From an Array | push, pop, splice |
| 7.4 | Array Length and Looping Through Arrays | for loop iteration, sum, max, product (13 activities) |
| 7.5 | Iterating Over an Array | Applied iteration with visualization |
| 7.6 | Finding an Element in a List | indexOf, linear search, algorithm efficiency intro |
| 7.7 | Removing an Element From an Array | splice for removal |
| (no array unit) | - | Intro CS course does not include arrays |

**Good coverage for arrays, gap for File I/O.** The external array material is excellent — 7 lessons with 50+ activities covering all array operations. freeCodeCamp Arrays covers the same ground more concisely. freeCodeCamp does not cover the browser FileReader API or file I/O concepts — that content is curriculum plan-specific.

---

### Week 9 — Q1 Review and Mini-Project

| Source | Section | Notes |
|--------|---------|-------|
| FCC JavaScript Fundamentals Review | Full section (24 items) | Comprehensive review: types, objects, arrays, variables, modules, rest params. Includes 15+ labs (Gradebook App, Pyramid Generator, Password Generator, Inventory Management) |
| FCC Booleans and Numbers | Build a Mathbot [Workshop] | Multi-concept review project |
| 3.9 | Programming with JavaScript Quiz | Unit quiz for JS basics |
| 4.12 | JavaScript Control Structures Quiz | Unit quiz for control flow |
| 5.9 | Functions and Parameters Quiz | Unit quiz for functions |
| 7.9 | Basic Data Structures Quiz | Unit quiz for arrays |
| 5.8 | Basic JavaScript and Graphics Challenges | Open-ended challenges (Ghosts, Guessing Game, Draw Something) |

**Good supplemental resources.** The FCC Fundamentals Review section is an excellent match — it's a synthesis of all Q1 concepts with challenging labs. Neither matches the curriculum plan's "Print Job Manager" project specifically, but freeCodeCamp's Gradebook App and Inventory Management labs are similar in scope.

---

## QUARTER 2: Selected JS-Content Weeks

### Week 17 — OOP: Classes and Objects

| Source | Section | Notes |
|--------|---------|-------|
| FCC Classes | Understanding How to Work with Classes in JavaScript [Theory] | Class syntax, constructor, this, methods, inheritance |
| FCC Classes | Build a Shopping Cart [Workshop] | Class with methods, state management |
| FCC Classes | Build a Project Idea Board [Lab] | Applied OOP |
| FCC Classes | JavaScript Classes Review [Review] | |
| FCC Classes | JavaScript Classes Quiz [Quiz] | |
| FCC Objects | Introduction to JavaScript Objects and Their Properties [Theory] | Objects as data containers (bridge to classes) |
| FCC Objects | Build a Wildlife Tracker [Workshop] | Object methods, properties |
| FCC Objects | Build a Recipe Tracker [Workshop] | Object manipulation |

**Strong FCC coverage.** FCC's Classes section directly maps to this week. The FCC Shopping Cart workshop is a good analog to the curriculum plan's `PrintPart` / `PrintQueue` class exercises. FCC Objects section provides the foundation that leads into classes.

**Gap:** Neither source explicitly compares OOP vs procedural programming as the curriculum plan requires for SLO 2. This comparison is teacher-delivered.

---

## QUARTER 3: JS-Content Weeks

### Week 22 — Sorting and Searching Algorithms

| Source | Section | Notes |
|--------|---------|-------|
| FCC Algorithms | Introduction to Common Searching and Sorting Algorithms [Theory] | Binary search, merge sort, bubble sort, selection sort, quicksort concepts |
| FCC Algorithms | Implement the Binary Search Algorithm [Workshop] | Guided binary search implementation |
| FCC Algorithms | Implement the Merge Sort Algorithm [Workshop] | Guided merge sort implementation |
| FCC Algorithms | Implement the Bubble Sort Algorithm [Lab] | Independent bubble sort implementation |
| FCC Algorithms | Implement the Selection Sort Algorithm [Lab] | Independent selection sort |
| FCC Algorithms | Implement the Insertion Sort Algorithm [Lab] | Independent insertion sort |
| FCC Algorithms | Implement the Quicksort Algorithm [Lab] | Advanced sort |
| FCC Algorithms | Searching and Sorting Algorithms Review [Review] | |
| FCC Algorithms | Searching and Sorting Algorithms Quiz [Quiz] | |
| 7.6 | Finding an Element in a List | Linear search, indexOf, algorithm efficiency intro |

**Excellent coverage.** freeCodeCamp's Algorithms section is a near-perfect match for this week — it covers bubble sort (required by curriculum plan), plus binary search, merge sort, and more. The section goes beyond the curriculum plan's requirements (quicksort, insertion sort) which gives stretch material for advanced students.

---

### Week 23 — Error Handling and Debugging

| Source | Section | Notes |
|--------|---------|-------|
| FCC Debugging | Debugging Techniques [Theory] | Debugging strategies, common error types |
| FCC Debugging | Debug a Random Background Color Changer [Lab] | Applied debugging practice |
| FCC Debugging | Debugging JavaScript Review [Review] | |
| FCC Debugging | Debugging JavaScript Quiz [Quiz] | |
| FCC Booleans and Numbers | Debug Type Coercion Errors in a Buggy App [Lab] | Specific debugging — type errors |
| FCC Booleans and Numbers | Debug Increment and Decrement Operator Errors in a Buggy App [Lab] | Specific debugging — logic errors |
| 1.16 | Debugging Strategies | 8 activities on debugging approaches (Karel context but transferable) |

**Partial coverage.** FCC Debugging section is short (4 items) but directly relevant. The two FCC debugging labs in Booleans and Numbers add practical exercises. freeCodeCamp does not cover try/catch, throw, or custom errors — those are curriculum plan-specific topics.

**Gap:** try/catch/finally syntax, throwing custom errors, and input validation are not covered by either source. Teacher-delivered.

---

### Week 24 — Testing Principles

| Source | Section | Notes |
|--------|---------|-------|
| (none) | — | — |

**Complete gap.** freeCodeCamp has no dedicated section on testing principles, writing test cases, or test-driven development. This entire week is teacher-delivered curriculum plan content. freeCodeCamp's labs implicitly test code but never teach testing as a concept.

---

## Non-Programming Units → Curriculum Plan Integration

AP CSP non-coding topics are integrated into the curriculum plan as 10–20 minute discussions, bell-ringers, and one graded written assignment. The table below maps each AP CSP unit to the curriculum plan week(s) where its topics are reinforced.

| Unit | Topic | Curriculum Plan Week(s) | Integration |
|-------------|-------|------------------------|-------------|
| Unit 8 | Digital Information: binary, hex, pixel images, compression, cryptography | W2 (binary), W8 (compression), W11 (image representation) | AP CSP Discussions in-class |
| Unit 9 | Practice PT: Steganography | W8 (data compression context) | Conceptual connection only — no steganography project in CSCI 4 |
| Unit 10 | Practice PT: Image Filter | W11 (digital image representation via JSCAD colors) | Conceptual connection only — no image filter project in CSCI 4 |
| Unit 11 | The Internet: hardware, DNS, protocols, cybersecurity | W10 (HTTP, DNS, client-server), W11 (TCP/IP, fault tolerance), W23 (cybersecurity) | AP CSP Discussions + bell-ringer |
| Unit 12 | Effects of the Internet | W15 (beneficial/harmful effects), W25 (digital divide) | AP CSP Discussions |
| Unit 13 | Data: visualization, collection, limitations | W19 (metadata), W22 (parallel computing) | AP CSP Discussions |
| Unit 14 | Present a Data-Driven Insight | W25 (A25.3 written assignment on impacts) | Graded written assignment |
| Unit 15 | Impacts of Computing | W15 (ethics), W25 (digital divide + A25.3), W33 (computing bias) | AP CSP Discussions + written |
| Unit 18 | Creative Development: design thinking, prototyping | W1 (lifecycle), W3 (documentation), W34 (peer review/collaboration) | Already embedded in plan structure |

### Units NOT Integrated (and why)

| Unit | Reason |
|-------------|--------|
| Unit 9 (Steganography) | Requires image manipulation not available in JSCAD environment. Students get the underlying concepts (binary, compression, encryption) through other discussions. |
| Unit 10 (Image Filter) | Same — image pixel manipulation doesn't map to JSCAD. Conceptually covered via W11 color/image discussion. |
| Unit 14 (Data-Driven Insight) | No standalone data analysis project in CSCI 4. A25.3 written assignment covers the "present an insight" concept at smaller scale. |

### Supplemental Lessons for AP CSP Discussion Topics

Teachers may assign specific supplemental lessons as homework to reinforce the in-class AP CSP discussions:

| Curriculum Plan Discussion | Recommended Lesson | Notes |
|---------------------------|----------------------|-------|
| W2: Binary number systems | 8.1–8.3 (Number Systems, Binary, Pixel Images) | Video + exercises on binary conversion |
| W8: Data compression | 8.5 (Compression) | Lossy vs lossless with examples |
| W10: How the Internet works | 11.1–11.3 (Internet hardware, DNS, protocols) | Video series on Internet infrastructure |
| W11: Protocols & fault tolerance | 11.4–11.5 (Routing, fault tolerance) | Interactive simulations |
| W15: Beneficial/harmful effects | 12.x (Effects of the Internet project) | Research + writing |
| W23: Cybersecurity | 11.6+ (Cybersecurity, encryption) + 8.6 (Cryptography) | Video + exercises |
| W25: Digital divide | 15.x (Impacts of Computing project) | Research + presentation |
| W33: Computing bias | 15.x (Impacts of Computing project) | Discussion prompts |

---

## COVERAGE SUMMARY

### Programming Content

| Curriculum Week | Topic | Coverage | Gaps |
|----------------|-------|--------------|--------------|------|
| W1 | Programming / Lifecycle | Partial | Partial | Lifecycle is teacher-delivered |
| W2 | Variables / Data Types | Strong | Strong | None |
| W3 | Documentation / Conventions | Partial | Partial | README, JSDoc not covered |
| W4 | Conditionals | Strong | Strong | `===` vs `==` emphasis needed |
| W5 | Algorithms / Loops | Strong | Strong | Algorithm definition is teacher-delivered |
| W6 | Functions (Def/Call) | Strong | Strong | None |
| W7 | Pass by Value/Reference | Weak | None | Almost entirely teacher-delivered |
| W8 | Arrays / File I/O | Strong (arrays) | Strong (arrays) | File I/O not covered |
| W9 | Q1 Review / Mini-Project | Strong | Good (quizzes) | Custom project needed |
| W17 | OOP / Classes | Strong | None | OOP vs procedural comparison teacher-delivered |
| W22 | Sorting / Searching | Excellent | Weak | FCC is the primary source here |
| W23 | Error Handling / Debugging | Partial | Partial | try/catch teacher-delivered |
| W24 | Testing Principles | None | None | Entirely teacher-delivered |

### AP CSP Non-Coding Integration

| Curriculum Week | AP CSP Topic | Unit | Coverage |
|----------------|-------------|-------------|----------|
| W2 | Binary number systems | Unit 8 (8.1–8.3) | Platform has video + exercises; plan adds 15-min discussion |
| W3 | Open source / licensing | — | Teacher-delivered; no direct platform lesson |
| W8 | Data compression | Unit 8 (8.5) | Platform has dedicated lesson; plan adds 15-min discussion |
| W10 | How the Internet works | Unit 11 (11.1–11.3) | Platform has video series; plan adds 15-min discussion |
| W11 | Protocols / fault tolerance | Unit 11 (11.4–11.5) | Platform has simulations; plan adds 10-min bell-ringer |
| W15 | Beneficial/harmful effects | Unit 12 | Platform has research project; plan adds 15-min discussion |
| W19 | Metadata / intellectual property | Unit 13 (partial) | Teacher-delivered; platform covers metadata but not IP |
| W22 | Parallel computing | — | Teacher-delivered; no direct platform lesson |
| W23 | Cybersecurity basics | Unit 11 (11.6+), Unit 8 (8.6) | Platform has crypto + cybersecurity; plan adds 15-min discussion |
| W25 | Digital divide + A25.3 written | Unit 12, Unit 15 | Platform has research projects; plan adds discussion + graded written |
| W33 | Computing bias | Unit 15 | Platform has impacts project; plan adds 15-min discussion |

**Key takeaways:**

- **Programming content:** freeCodeCamp provides strong coverage for Weeks 2–6 and 8 (core JS fundamentals). FCC is the primary source for W17 (Classes) and W22 (Algorithms). Weeks 7, 23–24, and the lifecycle/documentation/testing content require teacher-created materials regardless of external resources.
- **AP CSP non-coding content:** AP CSP Units 8, 11, 12, 13, and 15 provide substantial resources for the AP CSP discussions added to the curriculum plan. Two topics (open source/licensing, parallel computing) have no platform equivalent and are teacher-delivered.
- **Not integrated:** Units 9 (Steganography) and 10 (Image Filter) require image manipulation not available in the JSCAD environment. Students get the underlying concepts through other discussions.
