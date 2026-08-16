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

> **Renumbered 2026-08-14** onto book-native `§chapter.section` IDs and the new `A<chapter>.<section>.<n>`
> assignment scheme — see the Q1 header note below for why. Week numbers removed; Part B's real-date
> calendar is still pending a capacity decision (compress further / demote / extend the year), so a
> week number here would be a second thing to fix later. Section references are stable regardless of
> that decision.

Each SLO must be covered by at least one graded assignment.

| SLO | Description | Primary Coverage | Backup Coverage |
|-----|-------------|-----------------|-----------------|
| SLO 1 | Describe the software development life-cycle | §1.1 lecture + A1.1.1 written | §7.1 Arcade Cabinet capstone + §13.3 Mechanism capstone reflection |
| SLO 2 | Describe principles of structured programming | §5.3–5.4 OOP + A5.4.2 written | §3.1–3.2 functions + §12.1 JSCAD modules |
| SLO 3 | Describe, design, implement, and test structured programs | §7.1 Arcade Cabinet capstone + §13.1–13.3 Mechanism capstone | §4.1 Q1 synthesis (Print Shop) |
| SLO 4 | Explain what an algorithm is and its importance | §2.2 algorithms + A2.2.1 written | §11.3 sort/search + shplay collision logic (§6.2) |

### SLO Alignment Across Quarters

A term-by-term view of how each SLO is introduced, reinforced, and assessed. **Bold** cells are the primary artifacts retained for dual-enrollment documentation.

| SLO | Q1 Console Fundamentals (Ch.1–4) | Q2 shplay Game Dev (Ch.5–7) | Q3 JSCAD Foundations (Ch.8–10) | Q4 Advanced JSCAD + Capstone (Ch.11–13) |
|-----|-------------------------------|------------------------------|-------------------------------|----------------------------------------|
| **SLO 1** — SDLC | §1.1 lecture + **A1.1.1 written** (intro) | §7.1 Arcade Cabinet design/build/test/reflect cycle (A7.1.1) | §10.1 Fits-My-Stuff lifecycle observation | §13.1–13.3 full capstone lifecycle + **A13.3.2 closing reflection** |
| **SLO 2** — Structured programming | §1.3 coding conventions; §3.1–3.2 functions; §3.6 pass-by-value/reference (A3.6.2) | **§5.3–5.4 OOP via shplay + A5.4.2 written (primary artifact)**; §6.6 game-state machines | §8.1 libraries; §8.4 parameters as function args | §12.1 multi-file module design |
| **SLO 3** — Design / implement / test | §4.1 Print Shop with manual tests (A4.1.1) | **§7.1 Arcade Cabinet capstone (A7.1.1 — primary Sem 1 evidence)**: design doc + code + testing log + reflection | §9.3 error handling (A9.3.1); §9.4 testing principles (A9.4.1) | **§13.1–13.3 Mechanism capstone (A13.3.1 — primary Sem 2 evidence)**: spec → build → test → print → present |
| **SLO 4** — Algorithms | §2.2 algorithm definition + **A2.2.1 written** (intro) | §6.2 collision detection as algorithm; §6.3 physics tuning | §8.5 loops generating geometry | **§11.3 Sort/Search on part data (A11.3.1 — primary applied evidence)** |

### Assignment → SLO Trace

Each graded artifact that anchors an SLO appears at least twice (primary + backup) so documentation survives a missing assignment.

| Artifact | SLO(s) | Role |
|----------|--------|------|
| A1.1.1 | SLO 1 | Primary intro (SDLC written) |
| A1.5.1 | SLO 3, SLO 4 | First flowchart; Appendix D convention issued |
| A2.2.0 / A3.1.0 / A4.1.0 / A10.1.0 / A13.1.2 | SLO 1 (design phase), SLO 3, SLO 4 | **Design-before-code evidence.** A chart dated before its code is the only artifact showing design as a *process* rather than a finished program |
| A2.2.1 | SLO 4 | Primary intro (algorithm definition + JS) |
| A3.6.2 | SLO 2, pass-by-ref | Written artifact |
| A4.1.1 | SLO 3 | Q1 synthesis (Print Shop) |
| A5.4.2 | SLO 2, OOP vs procedural | **Primary written artifact** |
| A6.5.1 | SLO 3, File I/O | Persistent storage (shplay) |
| A7.1.1 | SLO 1, SLO 2, SLO 3 | **Primary Sem 1 capstone evidence** |
| A9.3.1 | Topic: Error handling | Primary lab |
| A9.4.1 | Topic: Testing principles | Primary lab |
| A11.3.1 | SLO 4 | **Primary applied algorithms artifact** |
| A12.1.1 / A12.1.2 | Topic: File I/O (JSCAD) | Multi-file + written comparison |
| A13.3.1 | SLO 1, SLO 3 | **Primary Sem 2 capstone evidence** |
| A13.3.2 | SLO 1 | Closing lifecycle reflection |

### Topic Coverage Map

> **Renumbered 2026-08-14** — see the SLO Coverage Map note above; the same week-vs-section caveat applies here.

| Topic | Sections | Assignment Type |
|-------|-------|----------------|
| Software life-cycle | §1.1, §7.1, §13.1–13.3 | Written + discussion + capstone reflection |
| Procedural vs OOP | §5.3–5.4 | Code + written comparison |
| Program design tools & environments | §1.5, §5.1, §8.1 | Lab setup + reflection (console, shplay, JSCAD) |
| Flowcharting / design-before-code | §1.5 (convention + starter 4: the book's 3 + `io`), §2.2 (loop hexagon), §3.1 (function call), §4.1 (connectors, notes) | **Gate on every graded build artifact — see Appendix D.** Auto-checked in-app; hand-drawn on Part D of every test |
| Documentation | Throughout (formal: §1.3, §5.3–5.4, §8.1) | Inline comments + READMEs |
| Coding conventions | §1.3 (formal), enforced throughout | Code review rubric |
| Data types, variables, expressions, sequential processing | §1.2–1.3 | Exercises + quiz |
| Arrays | §3.3 (intro), §6.1–6.2 (shplay Groups), §8.5 (JSCAD parametric) | Exercises + applied modeling |
| Control structures (if/switch/for/while/do...while) | §2.1–2.5, applied §6.3–6.8 (shplay) | Exercises + shplay mechanics |
| Algorithms: sorting and searching | §11.3 | Applied to geometry data |
| File I/O | §3.8 (JSON/localStorage — see Part A's re-opened gap note), §6.5 (shplay save/load), §12.1 (JSCAD multi-file + STL export) | Lab + multi-file project |
| Error handling | §2.5 (intro), §9.3 (deepened) | Debug exercise |
| Parameters by value and reference | §3.6 | Functions deep dive |
| Testing principles | §9.4 | Test case writing assignment |

### AP CSP Non-Coding Topic Integration

These topics align with AP CSP Big Ideas 1, 2, 4, and 5 (which together account for **65–76% of the AP exam**). They are woven into existing sections as 15–20 minute discussions, bell-ringer activities, or short written components — not separate units. Students taking AP CSP get reinforcement; all students get computing literacy. **Renumbered 2026-08-14** to sections; see the individual §-level entries in the Q1–Q4 body above for the actual discussion prompts (most carry forward unchanged, just relabeled).

| AP CSP Big Idea | Topic | Section | Integration Method |
|-----------------|-------|------|-------------------|
| BI 2: Data (17–22%) | Binary number systems — how computers store data | §1.2 | Discussion + activity |
| BI 2: Data | Data compression — lossy vs lossless | §3.3 | Discussion tied to arrays/data (moved off the retired FileReader lab) |
| BI 2: Data | Digital image representation — pixels, sprites, RGB | §6.4 | Discussion tied to shplay sprites + animation |
| BI 2: Data | Metadata — data about data | §6.5 | Discussion tied to game save/load JSON |
| BI 4: CSN (11–15%) | How the Internet works — HTTP, DNS, client-server | §5.1 | Discussion: how does shplay reach your browser? |
| BI 4: CSN | Protocols and fault tolerance — TCP/IP, routing, redundancy | §5.2 | Bell-ringer activity |
| BI 4: CSN | Parallel and distributed computing | §11.3 | Discussion tied to algorithm efficiency + sort/search |
| BI 5: IOC (21–26%) | Open source and licensing — Creative Commons, copyright | §1.3 | Discussion tied to documentation section |
| BI 5: IOC | Beneficial and harmful effects of computing | §7.1 | Discussion: game design ethics + addictive patterns |
| BI 5: IOC | Digital divide — who has access to technology | §13.2 | Written component tied to capstone |
| BI 5: IOC | Computing bias — algorithmic bias, design bias | §13.2 | Discussion during capstone |
| BI 5: IOC | Cybersecurity — encryption, PII, phishing, malware | §9.3 | Discussion tied to error handling |
| BI 5: IOC | Intellectual property — DMCA, fair use, open source models | §12.1 | Discussion tied to STL export + asset sourcing |
| BI 1: CRD (10–13%) | Collaboration in development | §13.2 | Practiced via peer review during capstone |
| BI 1: CRD | Identifying and correcting errors | §9.3 | Directly covered (syntax, runtime, logic) |

---

# Q1: JavaScript Fundamentals
### 32 meetings | ~56 contact hours | weeks 1–15 (Fri Aug 14 – Mon Nov 16, 2026)
### *Meeting counts and dates computed by `scripts/cs_schedule.py` against the real CUSD 2026-27 calendar. Sizing model: 1 meeting per book section (7 dense sections get 2) — see Part B.*
### Goal: Students can read and write basic JS programs with confidence before any spatial complexity is added.
### Environment: Browser console + simple HTML files with embedded script tags. No JSCAD yet.
### Numbering note (2026-08-13): This quarter is renumbered onto the book's own chapter.section
### IDs (book repo `bookSHelf`, project "Introduction to Programming Concepts and Methodologies"),
### per `curriculum/BOOK-TO-MODULE.md`'s completed 2026-08-12 renumber. Unit N = book Chapter N;
### module N.S = book Chapter N §N.S. The old `1.1.1`-style Q.U sub-module IDs are retired.
### Assignment IDs are now anchored to their section (`A<chapter>.<section>.<n>`) instead of a
### running sequential count — the old `A1.1, A1.2, A2.1...` scheme broke the first time a chapter
### grew a section, which is exactly what happened here (Ch.1 went from 3 to 5 sections, Ch.3 from
### 3 to 8). Book §1.1–1.3 content carries forward near-verbatim from the retired Units 1.1–1.3;
### §1.4, 1.5, 2.3, 2.4, 2.5, 3.2, 3.4, 3.5, 3.7 are newly authored against book sections that had
### no prior shCode coverage. §3.8 is substantially rewritten — see its note below.
### Load: sized at **1 meeting per book section** (operator decision 2026-08-14), with 2 meetings
### for the dense Q1 sections — §1.5 (980 lines), §2.1 (1110), §2.4 (1054) —
### plus §3.2 (748) and §3.3 (844) on pedagogical grounds. (§2.3, 1024 lines, was cut back to one
### meeting to help fund the semester-close blocks — see Part B.) That is **32 meetings across 14 weeks**,
### ending with §4.1 Print Shop on Mon Nov 16, 2026. An earlier revision defaulted to 2 meetings per
### section from BOOK-TO-MODULE.md's line-count proxy — which that document labels a provisional
### estimate — and produced a phantom capacity shortfall; see Part B for the correction.

---

## Unit 1: Foundations (book Chapter 1)
> **SLO focus:** Introduces **SLO 1** (lifecycle, W1 primary artifact A1.1.1) and **SLO 2** (coding conventions and structured style foundations).

### 1.1 What Is Programming / Software Lifecycle (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 253 lines, 1 meeting — revised down from 2 on 2026-08-14. This was the one day-count in BOOK-TO-MODULE.md derived from a real written spec rather than the line-count proxy; it is re-examined here because the proxy it anchored has been retired.

> **This is day one of the course, and it also carries orientation** (added 2026-08-14, matching the
> Intro Stats calendar, which reserves the same Fri Aug 14 slot for "Orientation and Syllabus").
> Orientation shares this meeting rather than taking one of its own: Semester 1 has no spare slot
> before the anchored Dec 16 final, and §1.1 is both the lightest section in the book (253 lines) and
> the natural day-one hook. Run the meeting as **syllabus, expectations and tools first, then "what is
> programming and how does software actually get made"** — the lifecycle content is the payoff, not an
> afterthought. If §1.1 ever needs a full period of its own, a meeting has to come from elsewhere in
> Chapters 1–5; see Part B.
**Book section:** 1.1 Software Lifecycle
**SLOs covered:** SLO 1, SLO 4 (intro)
**Reading:** Book §1.1 Software Lifecycle

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
- **A1.1.1 (Written, graded):** In 1 page, describe the software development life-cycle in your own words. Give one real-world example of a software product and walk through how you think it went through each phase. (SLO 1 primary coverage)
- **A1.1.2 (Lab):** Follow setup checklist — open browser console, run 5 provided `console.log` statements, screenshot results, submit.

**Teacher Notes:**
- Keep it conceptual this week. Resist going deep on syntax.
- The lifecycle discussion should feel relevant — use examples like apps students use daily.
- Do not mention JSCAD yet.

---

### 1.2 Variables and Data Types (~1.75 hrs)
**Contact hours:** 1.75
**Book section:** 1.2 Variables and Data Types
**SLOs covered:** SLO 2 (intro to structured programming)
**Reading:** Book §1.2 Variables and Data Types

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
- **A1.2.1 (Lab):** Given 10 variable declarations with bugs (wrong type, wrong syntax, poor names), fix all 10 and explain each fix in a comment.
- **A1.2.2 (Lab):** Write a program that declares at least 6 variables describing a real object (at least 2 numbers, 2 strings, 1 boolean). Use template literals to print a description sentence. Must use at least 2 string methods. Must follow naming conventions.

**Teacher Notes:**
- Type coercion in JS will confuse students. Address it directly rather than avoiding it.
- Template literals (`\`Hello ${name}\``) are easier than concatenation for beginners. Lead with them.

---

### 1.3 Documentation and Coding Conventions (~1.75 hrs)
**Contact hours:** 1.75
**Book section:** 1.3 Documentation and Coding Conventions
**SLOs covered:** SLO 2 (structured programming principles)
**Reading:** Book §1.3 Documentation and Coding Conventions

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
- **A1.3.1 (Lab):** Take the provided undocumented program (10–15 lines), add inline comments explaining every line, fix formatting to match style guide, write a 3-sentence README.
- **A1.3.2 (Written):** 1 paragraph: why does documentation matter in professional software development? Use one specific example.
- **A1.3.3 (Quiz — in class, 15 min):** Identify data types of 5 expressions, fix 3 variable declarations with syntax or naming errors, match 4 vocabulary terms (variable, constant, data type, comment) to definitions.

**Teacher Notes:**
- Distribute the class coding style guide this week. It should cover: indentation (2 spaces), semicolons (required), naming (camelCase variables, UPPER_SNAKE for constants), comment requirements.
- This style guide will be used as a grading rubric for all future assignments.
- Reinforce documentation every week going forward — do not let it slip.

---

### 1.4 Programming Paradigms and Languages (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 368 lines, 1 meeting.
**Book section:** 1.4 Programming Paradigms and Languages
**SLOs covered:** SLO 2 (structured vs. other paradigms)
**Reading:** Book §1.4 Programming Paradigms and Languages

**Learning Objectives:**
- Define what a programming paradigm is
- Distinguish procedural/structured, object-oriented, and declarative/functional paradigms at a conceptual level
- Name several current high-level languages and what each is typically used for
- Explain, in outline, why so many programming languages exist

**Topics:**
- What a paradigm is: a way of thinking about and organizing a solution, not a specific syntax
- The imperative/procedural paradigm — this course's Q1 default: sequence, conditionals, loops
- Declarative and functional programming (conceptual survey only — not required for Q1 code)
- Structured programming as a discipline within the imperative paradigm (single entry/exit control structures — bridges directly to SLO 2)
- Survey of current languages by purpose: web (JS), data/scripting (Python), systems (C/C++/Rust), mobile (Swift/Kotlin) — language choice driven by the problem, not by "which is best"

**In-Class Activities:**
- Class discussion: show the same small task (e.g. "average a list of numbers") described in an imperative loop vs. a one-line functional call — ask what's the same, what's different
- Card-sort activity: match a language name to its typical use case
- Bridge forward: "shplay next quarter uses classes — that's the object-oriented paradigm. JSCAD later is mostly procedural, like this quarter."

**Assignments:**
- **A1.4.1 (Written):** Half page. Pick two languages other than JavaScript. What is each typically used for, and why does that fit the paradigm(s) it supports?

**Teacher Notes:**
- Keep this conceptual and light — no new syntax this week. It's a zoom-out, not a coding week.
- Don't require students to write OOP or functional code yet; they've only seen procedural/imperative so far. Naming the paradigms now means later chapters (OOP in shplay, functional-flavored array methods in §3.7) land as "oh, that's the other paradigm from §1.4" rather than unexplained new vocabulary.

---

### 1.5 Program Design Tools and Environments (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** 980 lines — one of seven sections scheduled at **2 meetings**. Pseudocode and flowcharts are a genuinely new skill, and this lands in the first weeks when tooling friction is highest.
**Book section:** 1.5 Program Design Tools and Environments
**SLOs covered:** SLO 3 (program design tools and environments — Butte outline topic)
**Reading:** Book §1.5 Program Design Tools and Environments

**Learning Objectives:**
- Write pseudocode for a simple task before coding it
- Read and draw a basic flowchart (start/end, process, decision, arrows)
- Explain computational thinking as decomposition + pattern recognition + abstraction + algorithm design
- Use the browser DevTools console and debugger as a program design/development environment

**Topics:**
- Computational thinking: decomposition, pattern recognition, abstraction, algorithmic thinking
- Pseudocode: writing steps in plain structured English before writing code
- Flowcharts: start/end ovals, process rectangles, decision diamonds, directional arrows
- **The class flowchart convention (Appendix D)** — handed out here, exactly as the style guide is handed out in §1.3, and enforced on every graded build artifact from this point on
- The in-app flowchart editor: dragging shapes, connecting arrows, splicing a shape into an existing path, and reading the eight structural checks
- The code editor + browser console as this course's IDE: what an IDE actually provides (editing, running, inspecting)
- Debugging tools preview: `console.log` as a debugging technique, browser DevTools panels

**In-Class Activities:**
- Live demo: take a real task ("decide if a triangle is valid given 3 side lengths"), write pseudocode, then draw the flowchart together
- Pair exercise: students write pseudocode + a flowchart for a provided problem before being shown any code
- **Break a good chart on purpose:** delete one exit off a diamond, then a `no` label, then drag a shape loose — read the check that turns red each time. Students should meet every failure message once, on a chart they are not being graded on.
- Tool tour: DevTools Elements/Console/Sources panels — just enough to know they exist and what each is for

**Assignments:**
- **A1.5.1 (Lab):** Given a word-problem prompt, write pseudocode AND a flowchart for the solution (no code yet). Then implement it in JS and confirm the code matches the plan. **The flowchart must pass all eight structural checks before the coding half unlocks** — this is the first and gentlest run of the Appendix D gate, with no grade attached to failing it.
- **A1.5.2 (Written):** Half page — explain computational thinking's four components in your own words, with one example each from something you've already coded this quarter.

**In-app (partially built 2026-08-15 — the flowchart spine only):**

| Lesson | Covers |
|---|---|
| `1-5-1-slides` | placeholder; no deck built yet |
| `1-5-2-reading-pseudocode-and-flowcharts` | book §1.5.4–1.5.5 — pseudocode keywords, the three shapes, the diamond's two rules |
| `1-5-3-reading-the-flowchart-convention` | Appendix D as a student handout — the rule, the eight checks, what the checker cannot see, scope, release schedule |
| `1-5-4-a1-5-1-flowchart-gate` | A1.5.1's chart half (Tier 1, book's three shapes). **The JS half is not built** — A1.5.1 is currently chart-and-pseudocode only |
| `1-5-5-a1-5-2-computational-thinking` | A1.5.2, AI-graded |

**Still unbuilt in this section:** book §1.5.1 (think before you type), §1.5.2 (decomposition and
pattern recognition), §1.5.3 (abstraction), §1.5.6 (how algorithms get executed), §1.5.7 (where
JavaScript runs), §1.5.8 (reading an error message), §1.5.9 (testing and debugging) — and the whole
of §1.4. A1.5.2 asks about the four components of computational thinking, which §1.5.1–1.5.3 are
supposed to teach; until those exist the assignment's own page carries the definitions, and it
accepts an everyday task rather than "something you've already coded", because by week 2 students
have coded almost nothing. Restore the narrower wording once §1.4 and the rest of §1.5 are built.

**Teacher Notes:**
- This week is the design-before-code habit the whole course leans on — planning with pseudocode/flowcharts before writing JS. **Appendix D turns that from advice into a gate**: from here on every challenge, Group PA, test and synthesis project opens with a flowchart, and the in-app coding lesson is locked until the flowchart is green. Say so explicitly today, so the pattern is a known rule rather than a recurring surprise.
- Only four shapes exist this week — the book's three (oval, rectangle, diamond) plus the parallelogram, which is ours. The editor hides four more behind **+ more shapes**; the loop hexagon arrives at §2.2, the function-call shape at §3.1, connectors and notes at §4.1. Tell students they exist and to leave them alone until then — a student who finds them early will use a hexagon as decoration.
- Butte's official outline names "program design tools and programming environments" as its own topic (see Part A) — this section is that topic's primary coverage.

---

## Unit 2: Control Flow (book Chapter 2)
> **SLO focus:** Introduces **SLO 4** (algorithm definition, primary artifact A2.2.1); reinforces **SLO 3** (students implement first structured programs with branching and iteration).

### 2.1 Conditionals (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** 1110 lines — the largest section in the book, scheduled at **2 meetings**. First real logic, plus comparison operators, logical operators and truthiness.
**Book section:** 2.1 Conditionals
**SLOs covered:** SLO 3 (implement structured programs)
**Reading:** Book §2.1 Conditionals

**Learning Objectives:**
- Write if, else if, and else statements
- Use comparison operators: `==`, `===`, `!=`, `!==`, `<`, `>`, `<=`, `>=`
- Use logical operators: `&&`, `||`, `!`
- Explain the difference between `==` and `===`

**Topics:**
- if / else if / else syntax
- Comparison operators (emphasize `===` over `==`)
- Logical operators
- Nested conditionals
- Truthy and falsy values (brief)

**In-Class Activities:**
- Fizzbuzz as a class — work through it together, do not just show the answer
- Students write a "print settings advisor" in console: given filament type and layer height variables, print recommended temperature
- Pair debugging: find the bug in 5 provided conditional programs

**Assignments:**
- **A2.1.1 (Lab):** Write a program that takes 3 hardcoded variables (score, attendance, lateAssignments) and uses conditionals to print a grade recommendation. Must use at least one `else if` chain and one `&&` or `||`.
- **A2.1.2 (Quiz — in class):** Short written quiz on operator precedence, `===` vs `==`, and tracing through 3 conditional code snippets to predict output.

**Teacher Notes:**
- `===` vs `==` is a JS-specific issue. Teach `===` as the default, mention `==` exists and why it's dangerous.
- Fizzbuzz is a rite of passage. Work through it collaboratively — don't just show the answer.
- Switch statements move to §2.3 this quarter (book gives switch its own section) — don't pull it forward here.

---

### 2.2 Algorithms and Loops (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 534 lines, 1 meeting.
**Book section:** 2.2 Algorithms and Loops
**SLOs covered:** SLO 4 (algorithms), SLO 3
**Reading:** Book §2.2 Algorithms and Loops

**Learning Objectives:**
- Define what an algorithm is
- Write a for loop with correct syntax
- Write a while loop
- Trace through a loop to predict output
- Identify infinite loop conditions

**Topics:**
- What is an algorithm: a precise, ordered set of steps to solve a problem
- Why algorithms matter in programming
- for loop: initialization, condition, increment
- while loop: condition-based iteration
- Common loop patterns: counting, accumulating, searching
- **New shape (Appendix D): the loop-setup hexagon** `{{i = 0 to 9}}` — how a `for` loop's three parts (start, limit, step) collapse into one shape, and how the return arrow closes the loop

**In-Class Activities:**
- Algorithm discussion: write an algorithm in plain English for making a sandwich, then translate to pseudocode (callback to §1.5)
- **Draw the same loop twice** — once as a bare decision diamond with a manual counter, once with the hexagon. The hexagon is not new logic, it is the same three parts named in one place; students should be able to say which diamond it replaced.
- Live code: loop that prints numbers 1–20, then only even numbers
- Students trace 3 loops by hand before running them

**Assignments:**
- **A2.2.0 (Flowchart, gate — 0 pts):** Chart the counting-or-accumulation problem you will write in A2.2.1, using the loop-setup hexagon. Must pass all eight structural checks. **A2.2.1 stays locked until this is green** (Appendix D).
- **A2.2.1 (Written + Lab, SLO 4 primary):** Part A: Write a plain-English algorithm for a task of your choice (not programming). Part B: Write a JS program using at least one for loop and one while loop that solves a simple counting or accumulation problem. Document with comments. **The program must match the A2.2.0 chart** — if you changed your mind while coding, update the chart and say why in a comment.

**In-app (built 2026-08-15 — §2.2 is the pilot module for diagram-native teaching):**
Five modes of chart work, not five repeats of one. Only the last costs an AI call; the rest are
free browser-side checks, so frequency is not rationed.

| Lesson | Mode | Tier |
|---|---|---|
| `2-2-2a-reading-flowchart-shapes` | vocabulary + scratch canvas | 0 |
| `2-2-3a-chart-the-algorithm` | **chart the code** — draw largest-of-three from its JS, then compare against Figure 2.2.1 | 1 |
| `2-2-5-reading-for-loop` | Figure 2.2.3 — the loop drawn the long way, five shapes | 0 |
| `2-2-6a-chart-the-for-loop` | **chart the code** — Figure 2.2.4 collapses three shapes into the hexagon | 1 |
| `2-2-8-reading-while-loop` | **read and predict** — four trace questions, no drawing; question 4 is the infinite loop drawn | 0 |
| `2-2-11-fix-the-broken-chart` | **find the defect** — starter opens with five red checks and one actual mistake | 1 |
| `2-2-12-a5-2-flowchart-decision` | **draw from a spec** — the graded gate | 2 |

The shapes reading moved to `2-2-2a` (from `2-2-11`) so the vocabulary exists before anything
downstream uses it — a language taught in week 11 of 13 cannot be the module's thinking tool.
The two in-class activities above are now in-app: "draw the same loop twice" is Figures 2.2.3 and
2.2.4, and "break a good chart on purpose" is `2-2-11`.

**Teacher Notes:**
- This is SLO 4's primary coverage. Be explicit in class: "an algorithm is a precise sequence of steps." Students should be able to repeat this back.
- **Tier-1 lessons check legality, not correctness.** A structurally legal chart of the wrong algorithm passes. That is the deliberate trade for zero cost and unlimited retries — the graded judgement of *logic* happens at `2-2-12` and on the test. Do not tell students a green check means a right answer.
- **This is the section where the flowchart stops being a §1.5 exercise and becomes the working habit.** An algorithm that only exists as prose is exactly the thing SLO 4 asks students to make precise; the chart is the precision. Expect the first real resistance here — chart it anyway.
- The loop-back arrow is the single hardest thing to draw correctly all year. It leaves the *bottom of the loop body* and returns to the *hexagon*, not into the middle of the body. Watch for it on every chart from here to §4.1.
- do...while, break/continue, and nested loops now live in §2.4, immediately after this section — keep this week to for/while only.

**Exam:**
- **Semester 1 Midterm 1 (~1 hour, in class):** Covers §1.1–2.2 (software lifecycle, variables, types, documentation, conventions, paradigms, design tools, conditionals, algorithms/loops). Administer after §2.2, before §2.3.

---

### 2.3 The switch Statement (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** **1 meeting.** 1024 book lines puts this in 2-meeting range, but `switch` is a syntactic variant of the if/else-if chain from §2.1 and much of the section is repeated worked examples. It was pre-registered as the first candidate to cut "if a meeting is ever needed elsewhere" — and on 2026-08-14 one was, to schedule the semester-close blocks. Teach the syntax and the fall-through trap; do not re-teach the decision logic.
**Book section:** 2.3 The switch Statement
**SLOs covered:** SLO 3, Topic: selective structures (Butte outline)
**Reading:** Book §2.3 The switch Statement

**Learning Objectives:**
- Write a `switch` statement with multiple `case` labels and a `default`
- Explain when a `switch` is a better fit than an `if/else if` chain
- Identify and avoid fall-through bugs from a missing `break`

**Topics:**
- `switch (expr) { case value: ... break; ... default: ... }` syntax
- Fall-through behavior and why `break` matters
- `switch` vs. `if/else if`: readability when branching on one value's exact matches

**In-Class Activities:**
- Live code: rewrite an `else if` chain from §2.1 as an equivalent `switch`
- Debugging exercise: find the missing `break` in 3 provided switch statements and explain what each produces without it

**Assignments:**
- **A2.3.1 (Lab):** Write a "print settings advisor" using `switch` on a `filamentType` variable (at least 4 cases + default), printing a recommended temperature and speed for each. Include one deliberate comment showing where fall-through would occur if a `break` were removed.

**Teacher Notes:**
- Butte's outline lists switch explicitly under "selective structures" — this section is that topic's dedicated coverage.
- Missing-break fall-through is the #1 real-world switch bug. Make students find it, don't just tell them about it.

---

### 2.4 Loop Control and Nested Loops (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** 1054 lines — scheduled at **2 meetings**. Nested loops is the documented beginner wall.
**Book section:** 2.4 Loop Control and Nested Loops
**SLOs covered:** SLO 3, Topic: selective and repetitive structures (Butte outline)
**Reading:** Book §2.4 Loop Control and Nested Loops

**Learning Objectives:**
- Write a `do...while` loop and explain how it differs from `while` (executes body at least once)
- Use `break` and `continue` to control loop execution
- Write a nested loop (a loop inside a loop) and trace its execution
- Identify an off-by-one error

**Topics:**
- `do...while` loop: body executes once, then the condition is checked
- `break`: exit a loop immediately
- `continue`: skip to the next iteration
- Nested loops: outer/inner loop relationship, common use (grids, tables)
- Off-by-one errors: the most common loop bug

**In-Class Activities:**
- Live code: a menu-repeat pattern using `do...while` ("ask at least once, then keep asking while invalid")
- Live code: nested loop printing a small multiplication table or a grid of `*` characters
- Students trace 3 loops by hand (one `do...while`, one with `break`, one nested) before running them

**Assignments:**
- **A2.4.1 (Lab):** Debug 5 provided loop programs — two have infinite loops, two have off-by-one errors, one has a `do...while` logic error. Fix all five and explain each bug in a comment.
- **A2.4.2 (Lab):** Write a nested-loop program that prints a grid pattern of at least 5×5, with dimensions controlled by variables (not hardcoded loop bounds).

**Teacher Notes:**
- Off-by-one is one of the most common bugs students will encounter all year — name it explicitly here and keep referencing it.
- Nested loops preview JSCAD's pattern-generation loops in Q3 (§8.5) — mention the connection.

---

### 2.5 Handling Errors with try/catch (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 794 lines, 1 meeting. §9.3 re-teaches this properly with custom error types, input-validation design and the DevTools debugger — Q1 needs the one `try`/`catch` pattern.
**Book section:** 2.5 Handling Errors with try/catch
**SLOs covered:** Topic: error handling (intro — deepened again in §9.3)
**Reading:** Book §2.5 Handling Errors with try/catch

**Learning Objectives:**
- Explain what a runtime error is and how it differs from a syntax error
- Write a `try/catch` block around code that might throw
- Read the error object's `.message` inside a `catch` block
- Explain why catching an error early avoids crashing the whole program

**Topics:**
- Runtime errors: code that is syntactically valid but fails while running (e.g. calling a method on `undefined`)
- `try { ... } catch (err) { ... }` syntax
- Reading `err.message` to report what went wrong
- Why this comes early: 26 downstream uses across Q2/Q3 rely on try/catch before the deeper error-handling/debugging unit in §9.3

**In-Class Activities:**
- Live demo: a program that crashes on bad input, then wrap it in `try/catch` so it reports instead of crashing
- Pair exercise: given 3 snippets that throw, add try/catch and print a friendly message from each

**Assignments:**
- **A2.5.1 (Lab):** Take your A2.2.1 loop program and add a `try/catch` around the part that could fail on bad input (e.g. a non-number). Print a friendly error message instead of letting it crash.

**Teacher Notes:**
- This is intro-level try/catch only — custom error types, input-validation design, and the DevTools debugger workflow are §9.3's job, not this week's. Keep it to "wrap it, catch it, report it."
- The book moved this here (instead of leaving it in the old Q3 error-handling week) because try/catch is used constantly starting in Q2 — see book_manifest.yaml's own note on this section.

---

## Unit 3: Functions and Data (book Chapter 3)
> **SLO focus:** Reinforces **SLO 2** (functions as structured decomposition) and **SLO 3** (design/implement routines); covers the Butte outline topic **Pass by value/reference** (primary artifact A3.6.2).

### 3.1 Functions: Definition and Calls (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 591 lines, 1 meeting.
**Book section:** 3.1 Functions: Definition and Calls
**SLOs covered:** SLO 2, SLO 3
**Reading:** Book §3.1 Functions: Definition and Calls

**Learning Objectives:**
- Define and call a function
- Explain the difference between defining and calling a function
- Explain what scope means (intro)

**Topics:**
- Function declaration syntax
- Void functions (no return yet — that's §3.2)
- Basic scope: local vs global variables
- **New shape (Appendix D): the function-call double-rail** `[[greetUser()]]` — one shape standing for a whole sequence defined elsewhere, and the fact that flow *comes back* from it

**In-Class Activities:**
- Live code: a simple greeting function, called several times with different hardcoded behavior
- Students convert 2 hardcoded programs from §2.1–2.2 into functions
- **Redraw an old chart with the new shape:** take the A2.1.1 chart, collapse the repeated block into one `[[ ]]` shape, and count how many rectangles disappeared. That count *is* the argument for functions — make students say the number out loud.
- Pair exercise: write a function, swap with partner, write the function call

**Assignments:**
- **A3.1.0 (Flowchart, gate — 0 pts):** Redraw your A2.1.1 grade-advisor chart with each planned function as a single `[[ ]]` shape. Must pass all eight checks. **A3.1.1 stays locked until this is green** (Appendix D).
- **A3.1.1 (Lab):** Refactor your A2.1.1 grade advisor program to use at least 2 named functions (no parameters/return required yet — that's next section). Each function must have a comment documenting what it does. **Every `[[ ]]` shape on your A3.1.0 chart must exist as a real function**, and vice versa.

**Teacher Notes:**
- Keep this week to definition + calling only. Parameters and return values get their own dedicated section next (§3.2) — the old combined treatment moved too fast for what's actually two distinct concepts.
- The double-rail shape is the first time decomposition is *visible*. §1.5 taught decomposition as a word; this is the picture of it, and Appendix D's "past 20 shapes, decompose" rule now has a tool behind it.
- A common error: students draw the function's *body* hanging off the `[[ ]]` shape. It doesn't — the body is a separate chart, or no chart at all. Flow enters the double-rail and leaves it, like any other single step.

---

### 3.2 Parameters and Return Values (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** 748 lines — scheduled at **2 meetings**. §3.1 was deliberately split from this because the old combined treatment moved too fast; re-compressing it would undo that.
**Book section:** 3.2 Parameters and Return Values
**SLOs covered:** SLO 2, SLO 3
**Reading:** Book §3.2 Parameters and Return Values

**Learning Objectives:**
- Write functions with parameters
- Write functions with return values
- Distinguish a parameter (the function's own name for an input) from an argument (the actual value passed at a call site)
- Explain why `return` matters — the 95 downstream uses of function returns all depend on this section

**Topics:**
- Parameters vs. arguments
- Return values — why `return` matters (a function that only `console.log`s cannot hand its result to other code)
- Void functions vs. value-returning functions
- Arrow functions (brief intro — show both syntaxes; full treatment in §3.4)

**In-Class Activities:**
- Live code: function that calculates area of a rectangle, called with different arguments, then modified to `return` instead of `console.log`
- Bug hunt: 3 provided functions that `console.log` instead of `return` — fix each and explain what broke because of it

**Assignments:**
- **A3.2.1 (Lab):** Write a "design calculator" program with 4 functions: `calculateVolume(w, h, d)`, `calculateSurfaceArea(w, h, d)`, `isWithinBuildVolume(w, h, d)` (returns boolean), and a main function that calls all three and prints results using template literals. Every function must use `return`, not `console.log`, to produce its answer.

**Teacher Notes:**
- The design calculator is a deliberate bridge toward JSCAD thinking. "Build volume" starts priming spatial thinking.
- Emphasize return values — many beginners write functions that `console.log` instead of returning. Address this directly; it is this section's core teaching point.

---

### 3.3 Arrays (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** 844 lines — scheduled at **2 meetings**. Flagged as one of the two highest-leverage sections in Q1: groups, JSCAD parameter arrays and sorting all assume fluency.
**Book section:** 3.3 Arrays
**SLOs covered:** SLO 3, Topic: arrays
**Reading:** Book §3.3 Arrays

**Learning Objectives:**
- Declare and initialize arrays
- Access elements by index
- Use array methods: push, pop, shift, unshift, length, indexOf, includes
- Use a loop to iterate over an array
- Create a multi-dimensional array

**Topics:**
- Array declaration and initialization
- Zero-based indexing
- Common array methods
- Iterating with for loops and for...of
- 2D arrays: arrays of arrays
- Arrays as coordinate containers (deliberate bridge: `[x, y, z]` introduced here — foreshadows JSCAD)

**In-Class Activities:**
- Live code: array of part names, loop through and print each
- Introduce `[x, y, z]` as a coordinate array — "this is how JSCAD will talk to us"
- Students load a provided array of 10 part measurements and compute max/min/average with a loop

**Assignments:**
- **A3.3.1 (Lab):** Write a program that stores 10 design measurements in an array. Use loops to find the maximum, minimum, and average. Must use at least 3 different array methods.

**Teacher Notes:**
- The `[x, y, z]` array introduction is intentional foreshadowing. Say explicitly: "In a few weeks we'll be using arrays exactly like this to place shapes in 3D space."
- File I/O (reading/writing files with the browser) moved off this section — see §3.8, which covers what the book actually teaches now (JSON + localStorage), not the old FileReader/Blob treatment.

---

### 3.4 Function Expressions and Arrow Functions (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 622 lines, 1 meeting. New syntax for the concept from §3.1–3.2, not a new concept; students get the real mileage in §3.7's array methods.
**Book section:** 3.4 Function Expressions and Arrow Functions
**SLOs covered:** SLO 2
**Reading:** Book §3.4 Function Expressions and Arrow Functions

**Learning Objectives:**
- Write a function expression (a function assigned to a variable)
- Write an arrow function in both single-expression and block-body form
- Explain when to reach for an arrow function vs. a named function declaration
- Read arrow-function callbacks fluently (53 downstream uses depend on this)

**Topics:**
- Function declarations vs. function expressions
- Arrow function syntax: `(params) => expr` and `(params) => { statements; return x; }`
- Implicit return in single-expression arrows
- Arrow functions as callback arguments (preview of §3.7's array methods)

**In-Class Activities:**
- Live code: rewrite 3 named functions from §3.1–3.2 as arrow functions
- Pair exercise: given 4 arrow functions with the implicit-return shorthand, rewrite each with an explicit `return` and block body, and vice versa

**Assignments:**
- **A3.4.1 (Lab):** Rewrite your A3.2.1 design-calculator functions as arrow functions assigned to `const`. Add one new arrow function using implicit return. Comment on which style you find more readable and why.

**Teacher Notes:**
- This section closes a real gap: arrow functions appear 53 times in later chapters (all of §3.7's array-method callbacks use one), but nothing before this taught the syntax on its own.

---

### 3.5 Objects and Properties (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 796 lines, 1 meeting.
**Book section:** 3.5 Objects and Properties
**SLOs covered:** SLO 2, SLO 3
**Reading:** Book §3.5 Objects and Properties

**Learning Objectives:**
- Create an object literal with properties
- Read and write a property using dot notation and bracket notation
- Use object destructuring to unpack properties into variables
- Model a real-world "thing" (a design part, a game entity) as an object with named properties

**Topics:**
- Object literal syntax: `{ key: value, ... }`
- Dot notation vs. bracket notation for property access
- Adding, updating, and deleting properties
- Destructuring: `const { width, height } = part;`
- Objects vs. arrays: when each is the right container

**In-Class Activities:**
- Live code: model a "design part" as an object (name, width, height, material) instead of parallel arrays
- Refactor exercise: take a set of parallel arrays from §3.3 (names, widths, heights) and convert it into an array of objects
- Destructuring drill: unpack 4 provided objects into named variables

**Assignments:**
- **A3.5.1 (Lab):** Rewrite your A3.3.1 measurements program to store each measurement as an object (`{ name, value, unit }`) instead of a bare number, in an array of objects. Use destructuring at least twice when reading values back out.

**Teacher Notes:**
- This section closes the single largest citation gap in the book (140 downstream uses of object literals against almost no prior coverage) — it is a foundational week, not a light one.
- Pass-by-reference for objects is next (§3.6) — don't pre-teach mutation here, just structure and access.

---

### 3.6 Functions: Pass by Value/Reference (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 384 lines, 1 meeting. Demonstrate on an object built in §3.5 the meeting before — reference semantics are invisible without one.
**Book section:** 3.6 Functions: Pass by Value/Reference
**SLOs covered:** SLO 3, Topic: parameters by value and reference
**Reading:** Book §3.6 Functions: Pass by Value/Reference

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
- **A3.6.1 (Lab):** Write two versions of a "scale a design" function — one that mutates the original object, one that returns a new object. Write a test that proves they behave differently. Comment explaining pass-by-reference.
- **A3.6.2 (Written, Topic: pass by value/reference — primary artifact):** Explain in your own words the difference between pass-by-value and pass-by-reference. Give one example of each. Why does it matter?

**Teacher Notes:**
- This is one of the harder conceptual weeks. Use physical analogies: passing by value is like giving someone a photocopy. Passing by reference is like giving them the original.
- This Butte outline topic is formally covered here — A3.6.2 is its primary written artifact.

---

### 3.7 Array Methods (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 628 lines, 1 meeting.
**Book section:** 3.7 Array Methods
**SLOs covered:** SLO 3, Topic: arrays
**Reading:** Book §3.7 Array Methods

**Learning Objectives:**
- Use `.map()` to transform every element of an array into a new array
- Use `.slice()` to extract a portion of an array without mutating it
- Use object/array destructuring together with array methods
- Use the spread operator to copy or combine arrays and objects

**Topics:**
- `.map(callback)` — the single most-used array method downstream; usually called with an arrow function (§3.4)
- `.slice(start, end)` — non-mutating extraction, vs. the mutating methods from §3.3
- `.concat()` for combining arrays without mutation
- Spread syntax: `[...arr]`, `{...obj, override}` — copying and overriding
- Destructuring an array result: `const [first, ...rest] = arr;`

**In-Class Activities:**
- Live code: convert a `for` loop that builds a new array into an equivalent `.map()` call
- Pair exercise: given a provided array of part objects, use `.slice()` and `.map()` together to produce a formatted top-3 list without mutating the original
- Spread drill: merge two provided objects with `{...a, ...b}` and predict which properties win on conflict

**Assignments:**
- **A3.7.1 (Lab):** Rewrite your A3.5.1 objects-array program using `.map()` to produce a formatted summary array (instead of a manual loop) and `.slice()` to show only the top 3 by value, without mutating the original array. Use spread at least once to create a copy before modifying it.

**Teacher Notes:**
- Scope this to what the book and downstream chapters actually use: `.map()` and `.slice()` dominate; `.filter()`, `.reduce()`, `.forEach()`, `.sort()`, `.indexOf()`, `.includes()`, `.splice()` are used zero times in later chapters (sorting/searching is implemented by hand later, in §11.3, because implementing it IS that section's lesson) — don't over-teach methods the course never calls on again.
- `.map()` is a stretch for some beginners but worth requiring — every downstream `.map()` call uses an arrow function, so §3.4 is a hard prerequisite for this section.

---

### 3.8 Saving and Loading Data (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 600 lines, 1 meeting.
**Book section:** 3.8 Saving and Loading Data
**SLOs covered:** SLO 3, Topic: File I/O
**Reading:** Book §3.8 Saving and Loading Data

**Learning Objectives:**
- Convert a JS object/array into a JSON string with `JSON.stringify()`
- Convert a JSON string back into a JS object/array with `JSON.parse()`
- Save and retrieve a value persistently in the browser using `localStorage`
- Explain what "serialization" means and why data must be serialized to be saved or sent somewhere

**Topics:**
- `JSON.stringify(value)` — turning live JS data into a portable string
- `JSON.parse(str)` — turning that string back into live data
- `localStorage.setItem(key, value)` / `localStorage.getItem(key)` — key-value persistence in the browser
- Why storage always needs strings: `localStorage` (and most storage/transport) only holds strings, so objects/arrays must be serialized first
- Sequential access, reframed: reading a parsed array back out with a loop is still "read the data in order" — the shape changed, the sequential-access idea didn't

**In-Class Activities:**
- Live code: take an array of objects from §3.5/§3.7, `JSON.stringify()` it, log the string, then `JSON.parse()` it back and confirm it's usable data again
- Live code: save a high-score-style value with `localStorage.setItem`, refresh the page conceptually (discuss: the value survives), read it back with `getItem`
- Bug hunt: `localStorage.getItem` returns a string — trace a bug where a saved number gets concatenated instead of added, and fix it with `Number()`/`JSON.parse()`

**Assignments:**
- **A3.8.1 (Lab, File I/O coverage):** Take your A3.7.1 array-of-objects program. (1) Serialize the array with `JSON.stringify()` and save it under a key with `localStorage.setItem`. (2) Write a separate function that reads it back with `localStorage.getItem` + `JSON.parse()` and rebuilds the working array. (3) Prove round-trip correctness: log the array before saving and after loading and confirm they match. Comment explaining why the data had to be serialized first.

**Teacher Notes:**
- **This section replaces the old FileReader/Blob-based "Arrays and File I/O" week.** book_manifest.yaml retitled this section deliberately: chapters 4–13 use FileReader/Blob zero times, but use JSON.parse (11×), JSON.stringify (3×), and key-value storage (3×) throughout — most directly, shplay's own save/load system in §6.5 is this exact `storeItem`/`getItem` pattern one layer up. Teaching FileReader here taught a skill the rest of the book never calls on again.
- **Butte outline flag:** the official outline names "File I/O including sequential access files" as a required topic, and the old A8.2/A8.3 FileReader labs were written specifically to cover that literal phrase. This section's JSON/localStorage approach is the better fit for what the course actually uses downstream, but it does not read a text file byte-by-byte the way "sequential access files" implies. See Part A's gap-analysis table (flagged for a follow-up pass) — if the sequential-file-reading phrasing needs to stay literally covered for articulation purposes, consider a short *supplementary* read-only FileReader demo (not a full graded lab) rather than reverting this section's main teaching.
- `getItem` returns strings. Expect bugs from `getItem('x') + 1` concatenating — teach `Number()`/`JSON.parse()` explicitly, same trap as before, different API.

---

## Unit 4: Synthesis — Print Shop (book Chapter 4)
> **SLO focus:** **SLO 3 primary Q1 evidence (A4.1.1 Print Shop)** — first complete design/implement/test program. Also reinforces SLO 1, 2, 4 in a single cohesive project.

### 4.1 Print Shop — Q1 Synthesis (~5.25 hrs)
**Contact hours:** 5.25 (3 class days, per BOOK-TO-MODULE.md's synthesis-project sizing)
**Book section:** 4.1 Print Shop — Q1 Synthesis
**SLOs covered:** SLO 1, SLO 2, SLO 3 (design/implement/test — **PRIMARY SLO 3 EVIDENCE FOR SEMESTER 1**), SLO 4 (synthesis)
**Reading:** Book §4.1 Print Shop — Q1 Synthesis (reviews §1.1–3.8)

> **Promoted to Semester 1's primary SLO 3 artifact, 2026-08-14.** §7.1 Arcade Cabinet previously held
> this role, but Part B's real dates place it in Semester 2 (see the note there). Print Shop lands
> **Nov 6–16, 2026**, comfortably inside Semester 1, and already covers all four SLOs — so retain its
> design docs, testing logs and reflections as accreditation evidence, not just as project artifacts.

**Learning Objectives:**
- Apply all Q1 concepts in a single cohesive program with real stakes, not an abstract admin exercise
- Write documented, convention-following code independently
- Debug a program of moderate complexity
- Persist data across a session using the §3.8 JSON/localStorage pattern

**Topics:**
- Review: variables, conditionals, loops, functions, arrays, objects, array methods, JSON/localStorage
- Code reading and debugging practice
- Program design process: plan before coding (callback to §1.5's pseudocode/flowchart habit)
- **Last two shapes (Appendix D): connectors and notes.** This is the first chart big enough to need them — a jump (`((A))` twice) instead of a long arrow across the page, and a bracket note for a decision a reader would otherwise question

**In-Class Activities:**
- **Day 1 is design day: chart before code.** Whole-period charting of the pricing and queue flow, teacher circulating. No JS is written on day 1.
- Pair debugging challenge: 15-line program with 5 bugs of different types
- Q1 concept map: students draw relationships between topics covered

**Assignments:**
- **A4.1.0 — Print Shop design chart (graded, 10% of the project):** A flowchart of the whole tool, drawn and submitted **on day 1, before any build time**. Must pass all eight structural checks, use at least one `[[ ]]` shape per planned function, and stay under 20 flow shapes — decompose with the double-rail if it doesn't. **Build days do not open until this is green** (Appendix D §D.1).
- **A4.1.1 — Print Shop (Lab, major grade, SLO 3 primary):** Build a "Print Shop" pricing and queue tool in pure JS (no JSCAD). This is deliberately reframed from an office-admin chore into something with a real verdict: students run 10 shared printers starting in Q3, so this tool gets used. Requirements:
  - Store at least 5 print orders as objects in an array. Each order has: name (string), width/height/depth (numbers), filament type (string), priority (number)
  - Function to calculate estimated print time from volume, and a price from `grams × filament cost/gram + machine-time cost`
  - Function to find all orders that fit within a given build volume (takes 3 parameters)
  - Function to sort the queue by priority
  - Save/load the order queue using `JSON.stringify`/`localStorage` from §3.8
  - Main program that calls all functions and prints a formatted verdict: e.g. "you made \$14.20; queue is 6 hours"
  - Full documentation and style guide compliance, plus a README
  - At least 3 manual test cases: call each key function with a known input, print PASS or FAIL against the expected result
  - **Chart fidelity:** the shipped code matches A4.1.0, or the chart was updated and the README says what changed and why. A design that survived contact with the build unchanged is rare and suspicious; a design that was silently abandoned is the actual deduction.

**Teacher Notes:**
- **Guard day 1.** The single failure mode of this project is a student who "just starts coding and will chart it after" — that produces a transcript, not a design, and it is visible in the grading (Appendix D §D.7). Day 1 is charting; the editors stay closed.
- Realigned from the old "Print Job Manager" framing (abstract office admin) to a pricing/queue tool with real stakes, per the book's own redesign of this section — an office-admin chore motivates nobody at 14; a program that tells you what you earned and how long the queue is does. Same underlying structures (arrays of objects, functions, sorting), different narrative.
- Grade on: correctness, documentation, style guide compliance, README quality.
- This is the "first complete program" for SLO 3 coverage documentation, and the first appearance of a text-only program delivering a verdict rather than a report — a deliberate console-only constraint before Q2 adds visuals.

**Exam:**
- **Semester 1 Midterm 2 (~1 hour, in class):** Cumulative Q1 exam covering §1.1–3.8 (all JS fundamentals through arrays, objects, array methods, and JSON/localStorage). Administer before the synthesis project's build days begin.

---

# Q2: shplay — Applied Game Development
### 23 meetings | ~40 contact hours | weeks 15–24 (Tue Nov 17, 2026 – Wed Feb 10, 2027)
### *Interrupted by the Semester 1 Close (Dec 9–17): Chapters 1–5 are examined before Ch 6 begins, so this quarter's Ch 6–7 work runs Jan 5 – Feb 11.*
### *Meeting counts and dates computed by `scripts/cs_schedule.py` against the real CUSD 2026-27 calendar. Sizing model: 1 meeting per book section (7 dense sections get 2) — see Part B.*
### Goal: Students extend Q1 fundamentals into a motivating visual/game context, learn OOP through hands-on use, practice save/load, and ship a complete game as their Semester 1 capstone.
### Environment: shplay in-app editor (built on q5.js + Box2D physics) — no install required.
### Design-before-code (Appendix D): every in-app challenge in Ch 5–7 is preceded by its own flowchart
### lesson, which must be green before the challenge unlocks. Game logic is where charts earn their
### keep — a state machine, a collision consequence and a spawn loop are all far easier to argue about
### as a picture than as prose. All eight shapes are released by now.
### Numbering note (2026-08-13): renumbered onto book Chapters 5–7, same convention as Q1 (see
### its numbering note). Book §5.4 (Writing Your Own Classes) and §6.9 (Timing and Async) are
### newly authored — neither had prior shCode coverage. §7.1's capstone assignment is rewritten
### from an open-ended brief to a fixed-requirements/free-theme shape, matching book_manifest.yaml's
### own redesign of this section (open briefs at this age produce unfinished Minecraft attempts and
### inconsistent SLO evidence; a fixed checklist with a free skin guarantees coverage without
### capping creativity).
### Load: sized at **1 meeting per book section** — no Q2 section is at 2. (§6.3 Physics Applications,
### 812 lines, was cut back to one meeting to help fund the semester-close blocks; it is pure
### application of §5.2 and §6.2 with no new API. See Part B.) Three pairs share continuous blocks — §5.3+5.4 (one continuous lesson in
### the book: §5.3 explains the pre-built Sprite class, §5.4 immediately has the reader write their
### own), §6.1+6.2 and §6.7+6.8 (each already ships as one in-app module) — but each pair still gets
### one meeting per section. **23 meetings, weeks 15–24**, ending Wed Feb 10, 2027.
### **Q2 is split by the semester boundary.** Chapter 5 finishes Dec 8; the Semester 1 Review Project
### and Final Exam then run Dec 10–16, examining Chapters 1–5. Chapter 6 opens Semester 2 in January.
### The break therefore falls on a clean chapter boundary — earlier revisions cut mid-Chapter-6.
### The Arcade Cabinet capstone runs Feb 5–10, in Semester 2 — see the SLO-attribution note at §7.1.

---

## Unit 5: shPlay Foundations (book Chapter 5)
> **SLO focus:** Reinforces **SLO 3** (design/implement/test in a visual context); applies Q1 control structures (SLO backup) to interactive programs.

### 5.1 Hello Sprite and Movement (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 184 lines, 1 meeting.
**Book section:** 5.1 Hello Sprite and Movement
**SLOs covered:** SLO 3 (design, implement, test)
**Reading:** Book §5.1 Hello Sprite and Movement

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
- Teacher demo: type the minimum working sprite program live, line by line (in-app: `5-1-4-example-minimum-sprite`)
- Students work through the module 5.1 reading/lab sequence (canvas + sprite basics, keyboard input, velocity)
- Pair exercise: change the canvas size, make the sprite a different shape, swap control keys
- **AP CSP Discussion (15 min):** How the Internet works. Tracing how shplay loaded in your browser: DNS → HTTP → server → renderer. "Every time you open this page, all of this happens in milliseconds."

**Assignments:**
- **A5.1.1 (Lab, in-app `5-1-21-a10-1-sprite-playground`):** Build a "sprite playground": a canvas, one controllable sprite with WASD keys, a second sprite that moves automatically using `frameCount`, and an on-screen text label displaying a message. Must run without errors on Run.
- **A5.1.2 (Lab, in-app `5-1-22-a10-2-frame-loop`):** Half page — in your own words, what is the difference between `setup()` and `draw()`, and what does "60 frames per second" actually mean for the values you pick?

**Teacher Notes:**
- `vel.x`/`vel.y` are pixels per frame. shplay targets ~60 fps — tell students this explicitly or they'll pick absurd values.
- Omitting `vel.x = 0` in the else branch leaves the sprite drifting. Watch for this bug.
- Some students will try `player.x =` — show that `player.pos.x` works too, but `vel` is the shplay idiom.

---

### 5.2 Physics Feel (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 453 lines, 1 meeting.
**Book section:** 5.2 Physics Feel
**SLOs covered:** SLO 3
**Reading:** Book §5.2 Physics Feel
**Build status:** no in-app lessons exist for this module yet (`lessons/5-2-*` is empty) — this section needs lesson authoring before it can ship, same gap BOOK-TO-MODULE.md already flags.

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
- Students build a bouncy-ball scene live: gravity, a dynamic sprite, a static floor
- Pair challenge: turn the bouncing ball into a "sticky" ball (low bounciness)
- Discussion: why doesn't a ball bounce forever? (energy loss via friction/restitution)

**Assignments:**
- **A5.2.1 (Lab):** Using the provided template, build a pinball-like scene. Requirements: at least 3 static obstacle sprites, a dynamic ball with `bounciness > 0.8`, gravity enabled, a reset key that repositions the ball at the top. Test by running and observing for 30 seconds.
- **A5.2.2 (Written):** Short paragraph — why does setting `vel` every frame "fight" the physics engine? When would you use `applyForce` instead?
- **AP CSP Bell-Ringer (10 min):** Protocols and fault tolerance — what happens if one server on the Internet goes down? Introduce redundancy, routing, TCP/IP at a conceptual level.

**Teacher Notes:**
- Beginners often set `bounciness = 1` and expect perpetual motion. That's lossless collision; real friction still drains the system. Explain.
- The pendulum example returns in §6.3 — don't front-load it here.
- Physics is new vocabulary for most; lean on the visual feedback to anchor understanding.
- No in-app lessons exist yet for this module (see build-status note above) — this week runs on live-coded demos and the two assignments until lessons are authored.

---

## Unit 5, continued: Classes (book §5.3–5.4, scheduled as one combined block)
> **SLO focus:** **SLO 2 primary artifact (A5.4.2 written OOP-vs-procedural comparison)** — the structured-programming documentation anchor for dual enrollment.
> **Compression note:** §5.3 and §5.4 are scheduled together — the book itself treats them as one continuous lesson (§5.3 explains the pre-built `Sprite` class, §5.4 immediately has the reader write their own), and the old plan already spent one combined week on this same ground before the book split it into two sections.

### 5.3 Classes and Instances (~1.75 hrs)
**Contact hours:** 1.75
**Book section:** 5.3 Classes and Instances
**SLOs covered:** SLO 2 (intro), SLO 3
**Reading:** Book §5.3 Classes and Instances

**Learning Objectives:**
- Explain what a class is and what an instance (object) is
- Use the `new` keyword to create instances from a class
- Distinguish a class (blueprint) from its instances (objects)
- Explain what a property is, and distinguish an explicitly-set value from one that falls back to the class's default

**Topics:**
- Every shplay primitive (`Canvas`, `Sprite`, `Group`) is an instance of a class — `Sprite` itself is the blueprint
- Class vs. instance, using sprites already built in §5.1–5.2 as the running example
- Properties as data belonging to one instance (`.color`, `.vel`) vs. the class's own defaults (`.bounciness`, `.friction`)

**In-Class Activities:**
- Teacher demo: "Every sprite is an object." Console-log `player.constructor.name`, inspect properties, mutate `player.color` live.
- Reading (10 min): handout showing an "enemy fleet" written procedurally and with classes — students annotate which is which (previews §5.4's decision rule).

**Teacher Notes:**
- Students have already used `new Sprite(...)` for two weeks. Lead with: "You've been using classes — now let's see what's really happening."
- No graded assignment on its own — §5.3's content builds directly into §5.4's, which is where the graded lab and written artifact live.

---

### 5.4 Writing Your Own Classes (~1.75 hrs)
**Contact hours:** 1.75 (combined with §5.3 above into one ~3.5 hr week)
**Book section:** 5.4 Writing Your Own Classes
**SLOs covered:** SLO 2 primary (OOP vs procedural), SLO 3
**Reading:** Book §5.4 Writing Your Own Classes
**Build status:** no dedicated in-app lessons exist for this module yet (`lessons/5-4-*` is empty) — the graded Collectible lab and OOP write-up currently ship under the `5-3-*` lesson folder (`5-3-31-a12-1-collectible`, `5-3-32-a12-2-oop-writeup`) since 5.3/5.4 hadn't been split when those were built. Leave them there until a dedicated 5.4 folder is authored — don't move working graded content just to match the new section boundary.

**Learning Objectives:**
- Write a class with a constructor and properties
- Use `this` correctly inside a method
- Write methods that take parameters, return values, and call other methods on the same instance
- Use composition (storing another object as a property) instead of `extends`
- Store many instances of a class in an array and loop over them
- Decide when a problem calls for a class vs. a procedural solution

**Topics:**
- Class syntax: `class Name { constructor() { ... } method() { ... } }`
- The `new` operator and what it does mechanically
- Properties and `this` inside a method
- Writing methods, including one method calling another on the same instance
- Composition: `this.sprite = new Sprite(...)` instead of `extends Sprite`
- Arrays of instances — many objects, one loop
- Procedural vs. OOP: a three-question decision rule (more than one? own state? own behavior tied to that state?)
- Vocabulary (name only, not required): inheritance, polymorphism

**In-Class Activities:**
- Live code: build an `Enemy` class with `constructor(x, y, hp)`, a `damage(n)` method, a `render()` method
- Pair exercise: extend the `Enemy` class with a new property and method
- Side-by-side comparison: the same win-condition logic written as one loose `goal` variable vs. as a `Goal` class with an array of instances — discuss which is easier to extend to 5 goals

**Assignments:**
- **A5.4.1 (Lab, in-app `5-3-31-a12-1-collectible`):** Write a `Collectible` class — `constructor(x, y, value, color)` and a `collect()` method that returns the value and marks the item gone. Instantiate at least 5 in `setup()` and render them as sprites. Include at least one method call whose return value is used elsewhere.
- **A5.4.2 (Written, graded, SLO 2 primary, in-app `5-3-32-a12-2-oop-writeup`):** 1 page comparing procedural and OOP. Must include: definitions in your own words; a specific Q1 example that was procedural; a specific shplay example that is OOP; and one scenario where OOP is clearly the better choice, with reasoning.

**Teacher Notes:**
- Don't go deep into inheritance or polymorphism — name them, don't require them; composition covers the same ground for shplay's own classes.
- A5.4.2 is the SLO 2 primary written artifact. Keep the essays.

---

## Unit 6: Game Mechanics (book Chapter 6)
> **SLO focus:** Reinforces **SLO 3** (applied implementation) and **SLO 4** (collision detection + spawn logic are algorithms); also reinforces the Q1 Arrays topic in a new context.
> **Compression note:** §6.1 and §6.2 are scheduled together (they already ship as one lesson module, `6-1-*`, since the book split what used to be a single "Groups and Overlaps" section into two).

### 6.1 Groups (~1.75 hrs)
**Contact hours:** 1.75
**Book section:** 6.1 Groups
**SLOs covered:** SLO 3, SLO 4 (algorithmic thinking in collision detection)
**Reading:** Book §6.1 Groups
**Build status:** ships as in-app module `6-1-*` (e.g. `6-1-4-example-iterate-group`, `6-1-5-groups-sandbox`), combined with §6.2 below.

**Learning Objectives:**
- Use `Group` to manage collections of related sprites
- Spawn and despawn sprites during gameplay
- Explain how group iteration relates to the array loops from Q1

**Topics:**
- `new Group()` — a specialized sprite collection (an array-like with extras)
- Adding sprites to a group (pass the group as a parent, or add explicitly)
- Iterating over a group; `remove()` to despawn a sprite
- Spawning logic: random positions, timed spawns via `frameCount % N === 0`

**In-Class Activities:**
- In-app: `6-1-4-example-iterate-group`, `6-1-5-groups-sandbox`
- Discussion: how is a `Group` different from an `Array`? (It's an Array with extra methods.)

---

### 6.2 Overlaps and Collisions (~1.75 hrs)
**Contact hours:** 1.75 (combined with §6.1 above into one ~3.5 hr week)
**Book section:** 6.2 Overlaps and Collisions
**SLOs covered:** SLO 3, SLO 4 (algorithmic thinking in collision detection)
**Reading:** Book §6.2 Overlaps and Collisions
**Build status:** ships as in-app module `6-1-*` (`6-1-6-video-overlaps`, `6-1-7-example-apple-catcher`, `6-1-8-reading-collisions`, `6-1-9`/`6-1-10` remove-during-iteration bug + safe despawn pattern, `6-1-12-challenges`).

**Learning Objectives:**
- Detect overlaps with `sprite.overlaps(group)`
- Explain collision detection as an algorithm (link back to SLO 4)
- Avoid the remove-during-iteration bug

**Topics:**
- `overlaps(other)` — returns boolean, or accepts a callback per overlap
- The `overlaps` callback runs once per collision pair — useful for scoring
- Iterating a group and removing during iteration causes index-skipping; the safe pattern is iterate-backwards or collect-then-remove

**In-Class Activities:**
- In-app: `6-1-6-video-overlaps`, `6-1-7-example-apple-catcher`, `6-1-8-reading-collisions`
- In-app challenge: `6-1-12-challenges`

**Assignments:**
- **A6.2.1 (Lab, in-app `6-1-12-challenges`, Asteroid Field — graded):** Spawn at least 10 asteroids at random positions, detect overlap with the player ship and transition to a "hit" log or state, despawn asteroids that leave the canvas.

**Teacher Notes:**
- Students often iterate a group and `remove` during iteration — index skipping results. Show the safe pattern from `6-1-9`/`6-1-10`.
- This module reinforces Q1 §3.3 arrays in a new, motivating context.

---

### 6.3 Physics Applications (~3.5 hrs)
**Contact hours:** 3.5
**Sizing note:** **1 meeting.** 812 lines makes this the largest section in Ch 6, but it is pure *application* of §5.2 (physics properties) and §6.2 (collisions) and introduces no new API — the only one of the dense candidates for which that was true. Cut from 2 on 2026-08-14 to help fund the semester-close blocks. See Part B.
**Book section:** 6.3 Physics Applications
**SLOs covered:** SLO 3
**Reading:** Book §6.3 Physics Applications
**Build status:** ships as in-app module `6-3-*` (`6-3-2` presses-vs-pressing, `6-3-3` input-edges, `6-3-5`–`6-3-7` jump/ground detection, `6-3-8` pendulum example).

**Learning Objectives:**
- Combine input, physics, and collision to build a playable scene
- Distinguish `kb.presses(...)` (edge) from `kb.pressing(...)` (level)
- Tune oscillation and angular motion (pendulum preview of §6.8 joints)
- Debug interactions between input-driven and physics-driven motion

**Topics:**
- Edge-triggered input: `kb.presses('space')` fires once per press
- Impulse forces for jumping
- Ground detection: checking `colliding` against a sprite or group
- Slopes, angular motion (previews §6.8 joints)

**In-Class Activities:**
- In-app: `6-3-2` through `6-3-7` (input edges + ground detection sequence)
- Students study the worked example `6-3-8-example-pendulum`
- Discussion: what makes a jump "feel right"? (Coyote time, variable height, air control.)

**Assignments:**
- **A6.3.1 (Lab):** Build a playable scene combining input, physics, and collision: at least one static obstacle, at least one dynamic player sprite, working input-driven motion (jump or similar), and a visible win condition.

**Teacher Notes:**
- This week is consolidation, not new concepts. Use it to rescue students who fell behind §5.1–5.4.
- The Pendulum example previews joints; tell students explicitly they'll return to it in §6.8.

**Exam:**
- **Semester 1 Midterm 3 (~1 hour, in class):** Covers §5.1–6.3 (shplay foundations, physics, classes/OOP, groups/overlaps, physics applications). Administer at the start or end of the week — teacher discretion.

---

## Unit 6, continued: Animation & Camera
> **SLO focus:** Reinforces **SLO 3** (implement + test the more polished systems needed for the capstone).

### 6.4 Animated Sprites and Camera (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 608 lines, 1 meeting.
**Book section:** 6.4 Animated Sprites and Camera
**SLOs covered:** SLO 3
**Reading:** Book §6.4 Animated Sprites and Camera
**Build status:** ships as in-app module `6-4-*`.

**Learning Objectives:**
- Attach and switch animations on a sprite
- Use `camera` to scroll a world larger than the canvas
- Implement a camera that follows the player
- Use `layer` to control render order
- Explain why the camera is a coordinate transform

**Topics:**
- Sprite animations: `addAni(name, ...frames)`, `changeAni(name)`
- `camera.x`, `camera.y` — moving the view; smooth camera with `lerp`
- Layer / depth sorting for render order

**In-Class Activities:**
- In-app: `6-4-*` reading/example sequence (animation states → camera follow → smoothing → layers)
- **AP CSP Discussion (15 min):** Digital image representation. Sprites are stored as pixel grids with RGBA values. A 64×64 animation frame × 4 bytes × 8 frames ≈ 131 KB per sprite sheet. Why do real games compress textures?

**Assignments:**
- **A6.4.1 (Lab, in-app `6-4-19-challenges`):** Build a side-scrolling scene: at least 2 animation states on the player (idle, run); a camera that follows the player with a world larger than the canvas; at least 3 platforms; a visible end goal.

**Teacher Notes:**
- Camera math confuses students. Show visually: "the world doesn't move, the camera's window does."

---

### 6.5 Save and Load (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 559 lines, 1 meeting. §3.8 already teaches `JSON.stringify`/`parse` and localStorage; new here are shplay's `storeItem`/`getItem` and choosing what state to persist.
**Book section:** 6.5 Save and Load
**SLOs covered:** SLO 3 (design/implement/test), Topic: File I/O
**Reading:** Book §6.5 Save and Load
**Build status:** ships as in-app module `6-5-*`, and already teaches `JSON.stringify`/`JSON.parse` (`6-5-9`, `6-5-10`) — consistent with Q1 §3.8's realignment to the same JSON/localStorage pattern.

**Learning Objectives:**
- Save data persistently with `storeItem(name, val)` (shplay's localStorage wrapper)
- Retrieve saved data with `getItem(name)` and convert back to correct type
- Serialize structured data (not just single values) with `JSON.stringify`/`JSON.parse`

**Topics:**
- shplay persistent storage: `storeItem`, `getItem`, `removeItem`, `clearStorage`
- Serialization with JSON for saving structured player state, not just one value
- Save slots and overwrite/delete handling

**In-Class Activities:**
- Live code: a high-score tracker using `storeItem('highScore', score)`
- In-app: `6-5-9`/`6-5-10` JSON stringify/parse sequence, then `6-5-17`/`6-5-18` save-slots examples
- **AP CSP Discussion (15 min):** Metadata. A save file stores values plus structure (what each field means). What other metadata do games keep — timestamps, versions, player IDs?

**Assignments:**
- **A6.5.1 (Lab, File I/O coverage, in-app `6-5-26-challenges`):** Add persistent high scores to your §6.4 game — top 3 with player initials, reads on start, writes when a new score qualifies, and a "clear" button that calls `clearStorage`. Prove persistence by closing and reopening the browser.

**Teacher Notes:**
- `getItem` returns strings. Expect bugs from `getItem('x') + 1` concatenating. Teach `Number()`/`JSON.parse()` explicitly — the exact same trap named in Q1 §3.8.
- This module satisfies the SLO 3 File I/O requirement.

---

### 6.6 Game State Machines (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 415 lines, 1 meeting.
**Book section:** 6.6 Game State Machines
**SLOs covered:** SLO 2 (structured programming), SLO 3 (design/implement/test)
**Reading:** Book §6.6 Game State Machines
**Build status:** ships as in-app module `6-6-*` (uses `switch` from Q1 §2.3 directly — `6-6-3` through `6-6-6`).

**Learning Objectives:**
- Implement a game state machine (MENU, PLAY, PAUSE, WIN, LOSE)
- Structure `draw()` around a game-state variable with a `switch`
- Handle transitions between states (input, timers, collision outcomes)

**Topics:**
- Game state as a variable: `let gameState = 'menu'`
- State dispatch with `switch` (direct callback to Q1 §2.3)
- Transitions between states (input, timers, collision outcomes); saving/loading which state to resume into (ties to §6.5)

**In-Class Activities:**
- Live code: take a §6.4 game and add menu + play + game-over states via `switch`
- Pair exercise: add a pause state

**Assignments:**
- **A6.6.1 (Lab, in-app `6-6-25-challenges`):** Add states to your game. Minimum: menu, play, end (win or lose). Use a `switch` in `draw()`. Menu → play on start key. Play → end on condition. End → menu on keypress.

**Teacher Notes:**
- State machines often devolve into giant if-chains. Redirect students toward `switch` for readability — this is where Q1 §2.3 pays off directly.
- State is a prerequisite for the capstone — do not allow students to skip it.

---

## Unit 6, continued: Advanced Input, Joints, and Timing
> **SLO focus:** Reinforces **SLO 3** (implement + debug a complex interactive system); final content before capstone.
> **Compression note:** §6.7 and §6.8 are scheduled together — they already ship as one lesson module, `6-7-*`, since the book split what used to be a single "Joints and Advanced Input" section into two.

### 6.7 Advanced Input (~1.75 hrs)
**Contact hours:** 1.75
**Book section:** 6.7 Advanced Input
**SLOs covered:** SLO 3
**Reading:** Book §6.7 Advanced Input
**Build status:** ships as in-app module `6-7-*` (`6-7-3`–`6-7-10`: mouse position, pressing/presses, hit-testing, click-to-spawn, drag-and-release), combined with §6.8 below.

**Learning Objectives:**
- Read mouse position and button state
- Implement click-to-spawn and drag-to-move interactions
- Distinguish edge-triggered mouse events from level-triggered ones

**Topics:**
- `mouse.x/y`, `mouse.pressing()`, `mouse.pressed()`
- Hit-testing: `world.getSpriteAt(x, y)`
- Drag pattern: track the dragged sprite, snap velocity to zero on release

**In-Class Activities:**
- In-app: `6-7-3`–`6-7-10` mouse sequence

---

### 6.8 Joints (~1.75 hrs)
**Contact hours:** 1.75 (combined with §6.7 above into one ~3.5 hr week)
**Book section:** 6.8 Joints
**SLOs covered:** SLO 3
**Reading:** Book §6.8 Joints
**Build status:** ships as in-app module `6-7-*` (`6-7-11`–`6-7-19`: distance/hinge joints, `joint.delete()`, `applyForce`, vector math for launch force).

**Learning Objectives:**
- Create distance and hinge joints between sprites
- Implement a slingshot: drag, release, apply force
- Release a joint with `joint.delete()`
- Debug joint behavior by visualizing the constraints

**Topics:**
- `new DistanceJoint(a, b, ...)` — fixed distance between two sprites
- `new HingeJoint(a, b, ...)` — rotational pivot
- `sprite.applyForce(fx, fy)` and vector math for a launch direction
- `joint.delete()` — releasing a joint (e.g. slingshot release)

**In-Class Activities:**
- In-app: `6-7-11`–`6-7-19` joints + applyForce sequence
- Discussion: what real mechanical systems do each of these joints model?

**Assignments:**
- **A6.8.1 (Lab, Sumo challenge):** Complete a Two-Player Pong-Sumo scene using at least one joint or applyForce pattern from this week. Must include: separate input schemes for two players (e.g., WASD vs arrows); a win condition when one sprite is knocked out of bounds; a visible score or round counter.

**Teacher Notes:**
- Joints are the most complex shplay concept. Aim for "understand enough to use in capstone," not full mastery.
- The slingshot pattern (drag + release + force) appears in many classic games — encourage students to riff on it.

---

### 6.9 Timing and Async (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 335 lines, 1 meeting.
**Book section:** 6.9 Timing and Async
**SLOs covered:** SLO 3
**Reading:** Book §6.9 Timing and Async
**Build status:** no in-app lessons exist yet (`lessons/6-9-*` is empty) — genuinely new content, drafted here for the first time.

**Learning Objectives:**
- Explain that `draw()` already runs synchronously ~60×/sec — shplay games do not need a hand-written frame loop
- Distinguish `frameCount`-based timing (frame-rate dependent) from wall-clock timing (`setTimeout`/`setInterval`, frame-rate independent)
- Use `setTimeout`/`setInterval` for a one-shot or repeating delayed action, and `clearInterval` to stop it

**Topics:**
- The `draw()` loop is shplay's own synchronous frame loop — students have been using timing via `frameCount % N === 0` since §6.1 without a hand-written loop
- `setTimeout(fn, ms)` — run something once, after a delay, independent of frame rate
- `setInterval(fn, ms)` / `clearInterval(id)` — run something repeatedly, and how to stop it
- Why `frameCount`-based timing drifts if the frame rate drops, and wall-clock timing doesn't

**In-Class Activities:**
- Live code: a countdown timer implemented two ways — `frameCount`-based and `setTimeout`-based — compare behavior if the tab lags
- Pair exercise: add a `setInterval` power-up spawner to a §6.6 game, and make sure `clearInterval` stops it on game-over

**Assignments:**
- **A6.9.1 (Lab):** Add a wall-clock-timed event to your capstone-in-progress (e.g. a power-up that spawns every 5 real seconds via `setInterval`, or a 3-2-1 countdown via chained `setTimeout`). Must call `clearInterval`/clear the timeout appropriately when the game ends or resets.

**Teacher Notes:**
- This section is new — no existing lesson content to build from. Keep scope tight: the goal is "know `setTimeout`/`setInterval` exist and when to reach for one over `frameCount`," not a deep async/Promises unit (that's out of scope for this course).
- The book moved this here (not earlier, with functions) because `setTimeout`/`setInterval` take a function argument, which needed §3.1–3.4 first — and it's motivated by something students have already built (games), not an abstract timer demo.
- This module needs in-app lessons authored before it can ship as a normal graded week — flag for the lesson-authoring backlog.

---

## Unit 7: Synthesis — Arcade Cabinet (book Chapter 7)
> **SLO focus:** **SLO 3 primary Sem 1 evidence (A7.1.1 Arcade Cabinet)** — design + implement + test cycle. Also contributes to SLO 1 (lived SDLC) and SLO 2 (classes + state machines in use).

### 7.1 Arcade Cabinet — Q2 Synthesis (~5.25 hrs, ~1.5 weeks)
**Contact hours:** 5.25
**Book section:** 7.1 Arcade Cabinet — Q2 Synthesis
**SLOs covered:** SLO 1 (lifecycle), SLO 2 (structured programming), SLO 3 (design/implement/test)
**Reading:** Book §7.1 Arcade Cabinet — Q2 Synthesis (reviews §5.1–6.9)

> **SLO 3 semester attribution — resolved 2026-08-14.** This section was labelled *PRIMARY SLO 3
> EVIDENCE FOR SEMESTER 1*, but Part B's real dates put it at **Feb 5–10, 2027 — inside Semester 2**,
> and no pacing option short of cutting six further meetings from Q1–Q2 moves it back. Semester 1's
> primary SLO 3 evidence is therefore **§4.1 Print Shop (Mon Nov 9, 2026)**, with the Ch 5 Test and
> Ch 5 Group PA (Dec 3 / Dec 7) as supporting individual evidence. Arcade Cabinet remains a major
> SLO 3 artifact — it is simply Semester 2's first one, alongside §13.1–13.3 Mechanism.

**Learning Objectives:**
- Implement a complete game against a fixed required-mechanics checklist with a free theme
- Run and document manual test cases on key logic
- Document the design, code, and development reflection
- Iterate based on peer and teacher feedback

**Topics:**
- Design-doc structure against a fixed checklist: what's required vs. what's yours to skin
- Time management across a multi-day build
- Version control habits (commit frequency and message quality)
- Playtesting as testing

**In-Class Activities:**
- Homework: students draft a 1-page design doc mapping their chosen theme onto the required checklist
- Design review day: 2-minute presentations, class Q&A — **each student presents their state-machine flowchart on screen**, which is faster to critique than prose and catches the missing lose-state before three build days are spent on it
- Supervised build days with office-hours support
- Capstone showcase day
- **AP CSP Discussion (15 min):** Beneficial and harmful effects of computing. Games shape player behavior — addictive loops vs fair challenge, inclusive design. What ethical choices did you make in your game?

**Assignments:**
- **A7.1.1 — Arcade Cabinet (major grade, SLO 1/2/3 primary):** Fixed required-mechanics checklist, free theme/art/feel. **Realigned 2026-08-13** from the old open-ended "build a game" brief to this fixed-requirements shape, matching book_manifest.yaml's own redesign — an open brief at this age means attempting something like Minecraft and shipping nothing, and it made SLO evidence inconsistent across students. This checklist is exactly the Q2 skill set, so coverage is guaranteed and scope creep is structurally impossible inside the build window. Required:
  - One screen, one objective
  - Player control (§5.1)
  - A `Group` of spawned objects (§6.1)
  - A collision WITH a consequence, not just a log (§6.2)
  - A visible score
  - BOTH a win state AND a lose state
  - A title → play → game-over state machine (§6.6)
  - A persistent high score (§6.5)
  - **Design chart (submitted on design-review day, before build days open):** a flowchart of the state machine — every state a shape, every transition a labelled arrow, plus the win and lose conditions as diamonds. All eight structural checks green. This is the one required artifact that is faster to draw than to write, and it makes a missing lose-state impossible to hide (Appendix D §D.1).
  - **Testing log:** ≥5 manual test cases with expected vs. actual outcome and fixes applied
  - **Reflection (1 pp):** walk through the SDLC phases as you lived them — design, code, test, plan for maintenance
  - **Commits:** ≥5 meaningful commits across the build
  - **Showcase:** 3-minute demo to the class

**Teacher Notes:**
- This is a major SLO 1/2/3 artifact — but it now lands in **Semester 2** (Feb 5–10, 2027), so Semester 1's SLO 1/2/3 artifacts are §4.1 Print Shop and the Semester 1 Review Project. Retain design docs, testing logs, and reflections for all three.
- Students not finished by showcase day still present what they have — the testing log + reflection describe what they would fix. Iteration is a graded step.
- The fixed checklist is a floor, not a ceiling — theme, art, and feel are entirely the student's; a custom class beyond the Group requirement, extra joints, or additional states are all welcome stretch goals.
- Rubric weights: Implementation 40% / Testing log 15% / Reflection 15% / Showcase 10% / Commits 10% / **Design doc + state-machine chart 10%**.
- The chart is not extra work bolted onto the design doc — it *replaces* the prose paragraph students used to write describing their states, which nobody could critique on design-review day at 2 minutes each. Same 10%, better artifact.

**Exam:**
- **The Semester 1 Final no longer sits here.** It is now **Wed Dec 16, 2026**, covering **Chapters 1–5**, preceded by the 3-meeting Semester 1 Review Project (Dec 10–14). The semester breaks cleanly after Chapter 5, so §7.1 Arcade Cabinet is a Semester 2 event and this exam block has moved — see **Semester Close** for the full blueprint and **Part B** for the dates.
- **The Arcade Cabinet showcase is not a finals-week event.** It runs Feb 5–10, 2027, in the middle of Semester 2.

---

# Q3: JSCAD Foundations — 2D to 3D + Quality
### 16 meetings | ~28 contact hours | weeks 25–31 (Tue Feb 16 – Thu Apr 8, 2027), including Ch 10 below
### *Meeting counts and dates computed by `scripts/cs_schedule.py` against the real CUSD 2026-27 calendar. Sizing model: 1 meeting per book section (7 dense sections get 2) — see Part B.*
### Goal: Transition from shplay into JSCAD. Learn the library model, 2D primitives, parametric design, extrusion into 3D, 3D composition, error handling/testing discipline, and a personal parametric-design synthesis project.
### Environment: JSCAD browser app (https://jscad.app/) — no install required.
### Design-before-code (Appendix D): unchanged, and the charts change character here. A JSCAD chart is
### a *build order* — measure, derive, profile, extrude, cut — not a control-flow chart, because the
### expensive mistake in Q3 is a step done in the wrong order, not a missing branch. Grade them on
### whether the arrows show what feeds what.
### Numbering note (2026-08-13): renumbered onto book Chapters 8–10, same convention as Q1/Q2.
### Chapters 8 and 9 map 1:1 onto the old Units 3.1+3.2 and 3.3+3.4 (no content gaps, no new
### sections — just renumbering off IDs that collided with book Ch.3 "Functions and Data"). Chapter
### 10 "Fits-My-Stuff" is a brand-new synthesis project the old plan never had — designed from
### scratch per operator decision 2026-08-13 (see its own section). Load stayed roughly flat here,
### so this quarter is NOT extended or compressed relative to the old plan, only renumbered plus
### one new synthesis week.

---

## Unit 8: JSCAD Foundations (book Chapter 8)
> **SLO focus:** Introduces **SLO 2** (program design tools — libraries and modularity) and reinforces **SLO 3** (implement parameterizable 2D designs).

### 8.1 Libraries and JSCAD Introduction (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 685 lines, 1 meeting.
**Book section:** 8.1 Libraries and JSCAD Introduction
**SLOs covered:** SLO 2 (program design tools), Topic: Documentation
**Reading:** Book §8.1 Libraries and JSCAD Introduction

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
- **A8.1.1 (Lab):** Write a JSCAD program that imports from at least 2 different sub-modules (e.g. primitives and transforms) and returns at least 3 different shapes. Write a comment above each import explaining what that module provides.
- **A8.1.2 (Written):** In your own words, explain what a library is, why programmers use them, and what JSCAD's library provides. Half page.

**Teacher Notes:**
- The `require()` syntax will look unfamiliar. Explain it as "asking for a toolbox from a toolshed." Destructuring `const { primitives }` pulls out just the tools you need.
- Students will want to immediately make complex things. Hold them to simple this week — the goal is understanding the structure, not the output.
- Bridge back to shplay: "shplay was one big library — you imported classes by name. JSCAD is the same idea, different tool."

---

### 8.2 2D Shapes and Transforms (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 622 lines, 1 meeting.
**Book section:** 8.2 2D Shapes and Transforms
**SLOs covered:** SLO 3
**Reading:** Book §8.2 2D Shapes and Transforms

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
- **A8.2.1 (Lab):** Design a 2D logo or symbol using at least 6 shapes from at least 2 different primitive types. Must use translate and rotate on at least 2 shapes. Full comments. Export as SVG.
- **A8.2.2 (Lab):** Using only the JSCAD documentation (no asking for code), find and use one primitive type NOT covered in class this week. Write a comment explaining what it does and how you figured it out.

**Teacher Notes:**
- A8.2.2 is a deliberate documentation-reading exercise. Reading API docs is a professional skill.
- The coordinate system will confuse students who expect y to go down (screen coordinates in shplay). Address this explicitly — JSCAD uses math-standard orientation.

---

### 8.3 Boolean Operations in 2D (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 388 lines, 1 meeting.
**Book section:** 8.3 Boolean Operations in 2D
**SLOs covered:** SLO 3
**Reading:** Book §8.3 Boolean Operations in 2D

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
- **A8.3.1 (Lab):** Create a 2D gasket or plate design that uses all three boolean operations (union, subtract, intersect). Must be a design that could realistically be laser-cut or used as a profile for extrusion. Comments explaining each boolean operation used.
- **A8.3.2 (Written):** Explain union, subtract, and intersect in your own words. Draw (by hand or digitally) what each operation produces given two overlapping circles.

**Teacher Notes:**
- Boolean operations are conceptually the most important JSCAD idea for the downstream mechatronics pathway. Professional CAD tools use identical operations. Say this explicitly.
- "Order matters in subtract" is the #1 gotcha. Demo it visually.

**Quiz:**
- **A8.3.3 (Quiz — in class, 15 min):** Given 3 pairs of overlapping shapes, sketch or describe the result of union, subtract, and intersect. Identify which boolean operation was used in 2 provided JSCAD snippets. One question on coordinate system orientation.

---

### 8.4 Parameters and getParameterDefinitions (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 369 lines, 1 meeting.
**Book section:** 8.4 Parameters and getParameterDefinitions
**SLOs covered:** SLO 3
**Reading:** Book §8.4 Parameters and getParameterDefinitions

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
- Refactor a hardcoded design from §8.2 to use parameters
- Live demo: change parameter slider, watch model update in real time
- Discussion: what would you parameterize in a real product?

**Assignments:**
- **A8.4.1 (Lab):** Take your A8.2.1 logo design and add at least 4 parameters using `getParameterDefinitions()`. At least one must be a number with min/max, one must be a checkbox that changes the design, one must be a choice/dropdown. The design must respond meaningfully to all parameters.
- **A8.4.2 (Written):** Explain the connection between `getParameterDefinitions()` parameters and the function parameters you learned in Q1 (§3.2). What is the same? What is different?

**Teacher Notes:**
- A8.4.2 is an explicit connection back to Q1 SLO content. Students should recognize that parameters are just arguments.
- The checkbox parameter that changes the design is intentionally open-ended — encourage creativity.

**Exam:**
- **Semester 2 Midterm 1 (~1 hour, in class):** Covers §8.1–8.4 (JSCAD introduction, 2D shapes, transforms, booleans, parameters). Administer at start or end of week — teacher discretion.

---

### 8.5 Arrays in JSCAD / Loops Generating Geometry (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 461 lines, 1 meeting.
**Book section:** 8.5 Arrays in JSCAD / Loops
**SLOs covered:** SLO 3, Topic: Arrays
**Reading:** Book §8.5 Arrays in JSCAD / Loops

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
- **A8.5.1 (Lab):** Write a JSCAD program that generates a pattern of at least 20 shapes using loops. The pattern must have at least 2 parameters that control it (e.g., count, spacing, size). Full comments. This should be something that would be interesting to eventually extrude and print.
- **A8.5.2 (Lab):** Rewrite A8.5.1's loop using `Array.from()` and `.map()` (from Q1 §3.7) instead of a for loop. Comment explaining what changed and which version you prefer and why.

**Teacher Notes:**
- This week is where students start seeing why code is more powerful than manual design tools. "Change one number, regenerate 20 shapes" lands well.
- `.map()` was already taught in Q1 §3.7 — this is reinforcement in a new context, not new syntax.

---

## Unit 9: 3D Modeling (book Chapter 9)
> **SLO focus:** Reinforces **SLO 3** (design/implement/test 3D geometry) — first physical-artifact milestone arrives here.

### 9.1 First Extrusion: 2D to 3D (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 298 lines, 1 meeting.
**Book section:** 9.1 First Extrusion: 2D to 3D
**SLOs covered:** SLO 3
**Reading:** Book §9.1 First Extrusion: 2D to 3D

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
- Live code: extrude the §8.3 gasket design into a 3D part
- Students extrude their own A8.3.1 design
- Demo: `extrudeRotate` to make a vase profile
- Discuss what makes a good first print

**Assignments:**
- **A9.1.1 (Lab):** Take your A8.3.1 2D design and extrude it into a printable 3D part using `extrudeLinear`. Add a height parameter. Export STL. Write a print checklist comment at the top of the file: is it manifold? Does it have a flat bottom? What infill would you recommend?
- **A9.1.2 (Lab):** Use `extrudeRotate` to create a rotationally symmetric object (bowl, cup profile, knob, etc.). At least 2 parameters must control the shape. Export STL.

**Teacher Notes:**
- FIRST PRINT MILESTONE: A9.1.1 or A9.1.2 should be the first things students actually print. Coordinate the print queue by printer group (see Appendix B).
- Failed prints are learning opportunities. Require students to document what failed and what they changed.
- This is a major motivational moment — do not rush past it.

---

### 9.2 3D Primitives and Transforms (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 700 lines, 1 meeting. `translate`/`rotate`/`scale` were taught in §8.2 on 2D shapes; only the primitives and the third axis are new.
**Book section:** 9.2 3D Primitives and Transforms
**SLOs covered:** SLO 3
**Reading:** Book §9.2 3D Primitives and Transforms

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
- **A9.2.1 (Lab):** Build a 3D assembly of at least 5 distinct primitives that together form a recognizable object (not just random shapes). Must use translate, at least one rotation, and at least one boolean operation. Fully parameterized with at least 3 parameters.
- **A9.2.2 (Lab):** Model a simple functional part: a cylinder with a hole through the center (like a bushing or spacer). Parameterize outer diameter, inner diameter (hole size), and height. Demonstrate that subtract correctly creates the hole.

**Teacher Notes:**
- A9.2.2 is the first "functional" part — it has a mechanical purpose. This connects to the mechatronics pathway destination.
- Students will struggle with 3D spatial reasoning. Encourage drawing on paper before coding.

**Quiz:**
- **A9.2.3 (Quiz — in class, 15 min):** Identify 3D primitives from descriptions, predict the result of a translate + rotate sequence, explain the difference between 2D and 3D boolean operations. One code-tracing question on a multi-part 3D assembly.

---

### 9.3 Error Handling and Debugging (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 699 lines, 1 meeting.
**Book section:** 9.3 Error Handling and Debugging
**SLOs covered:** Topic: error handling (deepens the intro-level try/catch from Q1 §2.5)
**Reading:** Book §9.3 Error Handling and Debugging

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
- Add input validation to the A3.2.1 design calculator from Q1
- **AP CSP Discussion (15 min):** Cybersecurity basics. Error handling prevents crashes, but what about intentional attacks? Brief intro to PII, phishing, malware, and why input validation is also a security practice. "Never trust user input — it might be an attack, not a mistake."

**Assignments:**
- **A9.3.1 (Lab, Error Handling SLO):** Take your A4.1.1 Print Shop and add: input validation to every function (throw errors for invalid inputs), try/catch around the main execution block, at least one custom error type, and a user-facing error message for each possible failure mode.
- **A9.3.2 (Lab):** Add error handling to one JSCAD project from §8.1–9.2: validate all parameters (e.g., prevent negative dimensions, enforce min/max), add a try/catch around your main function, and display a meaningful message when parameters are invalid.

**Teacher Notes:**
- A9.3.1 is the Error Handling SLO coverage artifact.
- The three error types (syntax, runtime, logic) are recurring vocabulary — keep referencing them all year.
- This deepens the intro-level try/catch from Q1 §2.5 with custom error types, input-validation design, and the DevTools debugger workflow — don't re-teach basic try/catch syntax from scratch.

---

### 9.4 Testing Principles (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 507 lines, 1 meeting. Test the validation written in §9.3 the meeting before.
**Book section:** 9.4 Testing Principles
**SLOs covered:** Topic: Principles of testing and designing test data
**Reading:** Book §9.4 Testing Principles

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
- Pair exercise: write tests for partner's A3.2.1 design calculator

**Assignments:**
- **A9.4.1 (Lab, Testing SLO):** Write a complete test suite for your A4.1.1 Print Shop functions. For each function, write at least 3 test cases: one normal input, one edge case (boundary value), one invalid input. Implement a simple test runner that reports pass/fail. Submit test results showing at least one test catching a real bug you then fixed.
- **A9.4.2 (Written):** Explain the difference between normal cases, edge cases, and error cases in testing. Why is it important to test all three?

**Teacher Notes:**
- A9.4.1 is the Testing SLO coverage artifact.
- "Submit test results showing at least one test catching a real bug" is intentional — students should experience tests as bug-finders, not box-checkers.

**Quiz:**
- **A9.4.3 (Quiz — in class, 15 min):** Classify 4 test cases as normal, edge, or error cases. Write 3 test cases for a provided function (one of each type). Explain why testing matters in one sentence.

**Exam:**
- **Semester 2 Midterm 2 (~1 hour, in class):** Covers §8.5–9.4 (arrays/loops in JSCAD, extrusion, 3D primitives, error handling, testing). Administer at end of week after testing content.

---

# Q3, continued: Synthesis Project — Fits-My-Stuff (book Chapter 10)
### ~5.25 contact hours | 1.5 weeks
### Goal: Students measure something they actually own and model a parametric organizer that fits it — the first time their code becomes a physical object they keep.
### Environment: JSCAD browser app + calipers.
### New section (drafted 2026-08-14 per operator decision): the old curriculum plan had no synthesis
### project between JSCAD Foundations/3D Modeling and Q4 — book Chapter 10 was designed from
### scratch in the book itself and never had a matching shCode week. Drafted here following the
### same pattern as the other three synthesis projects (fixed required-mechanics checklist, free
### theme, ends in something physical).

---

## Unit 10: Synthesis — Fits-My-Stuff (book Chapter 10)
> **SLO focus:** Reinforces **SLO 2** (parametric design as structured, reusable programming) and **SLO 3** (design/implement/test a physical artifact) — the first project where code becomes something the student keeps.

### 10.1 Fits-My-Stuff — Q3 Synthesis (~5.25 hrs, ~1.5 weeks)
**Contact hours:** 5.25
**Book section:** 10.1 Fits-My-Stuff — Q3 Synthesis
**SLOs covered:** SLO 2, SLO 3 (synthesis)
**Reading:** Book §10.1 Fits-My-Stuff — Q3 Synthesis (reviews §8.1–9.4)

**Learning Objectives:**
- Take a physical measurement with calipers and translate it into a parametric 2D profile
- Extrude and cut cavities to produce a printable holder/organizer sized to a real object
- Expose parameters so a classmate can resize the model to fit their own object without editing code
- Explain why this is a testable definition of parametric design

**Topics:**
- Measuring a real object: calipers, tolerances, what "fits" means in practice
- 2D profile → `extrudeLinear` → cavity cutouts via booleans
- A loop/array generating repeated slots (e.g. a pen holder with N slots)
- `getParameterDefinitions()` exposing the measurements that matter, not just decorative knobs
- Print constraints: small, flat, no supports — sharing a printer 3 ways on a 250×250mm bed

**In-Class Activities:**
- Caliper day: students measure their chosen object (headphones, controller, pencils, a game cartridge) and record real dimensions
- Live code: build a simple slotted holder from a measured width/depth, parameterized
- **The graded core — swap test:** each student hands their JSCAD file to a classmate, who resizes it to fit THEIR object by changing parameters only, with no code edits. If it doesn't fit after a parameter change, the design wasn't actually parametric — that's the finding, not a failure.

**Assignments:**
- **A10.1.0 — Build-order chart (graded, 10% of the project; due on caliper day, before any modeling):** A flowchart of how the model gets built, not of what it looks like: measure → derive parameters → 2D profile → extrude → cut cavities → the loop that repeats slots. The loop-setup hexagon carries the repeated-slot loop; each parameter that feeds a step is a labelled arrow into it. All eight structural checks green (Appendix D §D.1).
- **A10.1.1 — Fits-My-Stuff (major grade, SLO 2/3):** Design and print a parametric organizer sized to an object you own. Requirements:
  - A 2D profile extruded into 3D (`extrudeLinear`), with at least one boolean-cut cavity
  - A loop/array generating at least 2 repeated slots or compartments
  - At least 3 exposed `getParameterDefinitions()` parameters tied to real measurements (not purely decorative)
  - **Swap test:** a classmate resizes your model to fit their own object using parameters only — document the result (did it fit? what had to change?)
  - Printability check: small, flat, no supports needed
  - Short write-up: what you measured, what you parameterized, and what the swap test revealed

**Teacher Notes:**
- This spans spring recess by design — no chapter test or group PA scheduled against it.
- **The chart is what makes the swap test survivable.** A student who charted "measure → parameter → geometry" as a chain has already worked out which numbers are inputs and which are derived; a student who started modeling immediately has hardcoded their own measurements into the geometry and will fail the swap. Grade A10.1.0 on whether the arrows go *from* measurements *into* shapes.
- The swap test is the actual teaching point: a design that only works for its own author isn't parametric yet, however many parameters it exposes. Make the swap mandatory, not optional.
- This is the emotional peak many students will name at year's end — keep it personal (their own object), not an abstract assigned widget.

---

# Q4: Advanced JSCAD + 3D Capstone
### 18 meetings | ~31.5 contact hours | weeks 32–39 (Mon Apr 12 – Tue Jun 1, 2027)
### *Meeting counts and dates computed by `scripts/cs_schedule.py` against the real CUSD 2026-27 calendar. Sizing model: 1 meeting per book section (7 dense sections get 2) — see Part B.*
### *Ends with the Semester 2 Close: capstone presentations May 21–25, then the **Semester 2 Final Exam on Wed May 26**. Chapters 11 and 12 share one assessment block; 2 spare meetings remain after the final. See Part B.*
### Goal: Advanced modeling techniques, sorting/searching applied to geometry, multi-file projects, and a student-directed 3D capstone ending the year.
### Environment: JSCAD browser app + 3D printers.
### Design-before-code (Appendix D): still a gate on every challenge, and the §11.3 sort/search charts
### are the year's best use of it — a sort is the one algorithm students cannot debug by staring at it,
### and the chart is where an off-by-one in the comparison shows up before the code does.
### Numbering note (2026-08-13): renumbered onto book Chapters 11–13, same convention as the rest
### of the plan. All three chapters map 1:1 onto the old Units 4.1/4.2/4.3 (no content gaps) — the
### old IDs collided with book Chapter 4 "Print Shop Synthesis", which is the only reason this
### quarter needed touching. §13's capstone requirements are strengthened to match
### book_manifest.yaml's own added constraint (multi-part fit, not a single printed blob) — see
### that section's note.

---

## Unit 11: Advanced Modeling (book Chapter 11)
> **Assessed jointly with Unit 12 (2026-08-14)** — one **Ch 11–12 Group PA (Apr 27) + Ch 11–12 Test
> (Apr 29)** covering §11.1–12.2, scheduled after §12.2. Both chapters are undersized on their own; see
> Unit 12's note and Part B.
> **SLO focus:** **SLO 4 primary applied artifact (A11.3.1 Sort/Search on geometry data)**. Reinforces SLO 3 through advanced modeling techniques and measurement-driven design.

### 11.1 Hulls and Advanced Extrusions (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 165 lines, 1 meeting.
**Book section:** 11.1 Hulls and Advanced Extrusions
**SLOs covered:** SLO 3
**Reading:** Book §11.1 Hulls and Advanced Extrusions

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
- **A11.1.1 (Lab):** Build a design that uses at least 2 advanced extrusion/hull techniques from this week. The design must be intentional (not random exploration) — write a short design brief explaining what you were trying to make and why you chose those techniques.
- **A11.1.2 (Quiz — in class, 15 min):** Match each advanced technique (hull, hullChain, extrudeHelical, extrudeFromSlices) to the form it produces. Given a design goal, choose the correct technique and explain why.

---

### 11.2 Measurements and Printability (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 206 lines, 1 meeting.
**Book section:** 11.2 Measurements and Printability
**SLOs covered:** SLO 3
**Reading:** Book §11.2 Measurements and Printability

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
- **A11.2.1 (Lab):** Add a measurement report to one of your Q3 projects. The report should print: estimated volume, bounding box dimensions, whether it fits on the printer (using build-volume check), and at least one design-specific measurement relevant to the part. Use `getParameterDefinitions()` to expose a "show measurements" toggle.

**Teacher Notes:**
- Light week by design — use extra time for print queue rotation, individual help, or catch-up on any delayed Q3 assignments.

---

### 11.3 Sorting and Searching on Geometry (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 580 lines, 1 meeting.
**Book section:** 11.3 Sorting and Searching on Geometry
**SLOs covered:** SLO 4 (algorithms, primary), Topic: sorting and searching
**Reading:** Book §11.3 Sorting and Searching on Geometry

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
- **A11.3.1 (Lab, Algorithms SLO primary):** Write a standalone JS program (not JSCAD) that:
  - Stores at least 8 "design parts" as objects with `name`, `volume`, `printTime` properties
  - Implements linear search by name (returns the part or `null`)
  - Implements bubble sort by `volume` (ascending)
  - Implements bubble sort by `printTime` (descending)
  - Prints results before and after sorting
  - Full comments explaining how each algorithm works step by step
- **A11.3.2 (Written):** Explain in your own words how bubble sort works. Why would sorting a list be useful in a real program? Give a real-world example beyond this course.

**Teacher Notes:**
- A11.3.1 is the formal sorting/searching SLO coverage artifact.
- The physical card simulation is highly effective — do not skip it.
- Students do not need to implement binary search but should understand why it's faster.
- **Enrichment (optional, not assessed):** Show a recursive implementation of factorial or linear search. Explain: "Some algorithms call themselves — this is called recursion. You'll see it again in the next course."

---

## Unit 12: Production Pipeline (book Chapter 12)
> **SLO focus:** Reinforces **SLO 2** (multi-file modular structure). Covers Butte outline topic **File I/O (secondary location, A12.1.1/A12.1.2)**. Prepares the production pipeline used by the capstone.
>
> **Assessed jointly with Unit 11 (2026-08-14).** There is no separate Ch 12 Group PA or Ch 12 Test —
> one combined **Ch 11–12 Group PA (Apr 27) + Ch 11–12 Test (Apr 29)** covers §11.1–12.2. At 465 lines
> across two sections this is the smallest content chapter in the book, and Ch 11 is the second
> smallest; separately they spent four meetings assessing less content than Chapter 8 assesses on one
> block. **Book numbering is unchanged** — these sections keep their own IDs, teaching time and
> assignments, and only the assessment block is shared. See Part B and **Individual Chapter
> Assessments**.

### 12.1 Multi-File Projects and File I/O (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 251 lines, 1 meeting.
**Book section:** 12.1 Multi-File Projects and File I/O
**SLOs covered:** SLO 2 (structured programming), Topic: File I/O
**Reading:** Book §12.1 Multi-File Projects and File I/O
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
- **A12.1.1 (Lab, File I/O coverage):** Refactor one Q3 project into a multi-file structure: one file for component/helper functions, one file for parameters, one file for main assembly. Initialize a git repo and make at least 2 commits showing your refactoring progress. Write a README explaining what each file does and why you split it this way.
- **A12.1.2 (Written):** Explain what file I/O means in programming. How does JSCAD's multi-file system relate to the general concept of reading from and writing to files? Compare briefly with the shplay `storeItem`/`getItem` and JSON approach from Q2 §6.5.

**Teacher Notes:**
- A12.1.2 comparing JSCAD multi-file to shplay save/load reinforces that file I/O takes many forms.
- Students should leave this week with a working git workflow they can use on the capstone.

---

### 12.2 Colors, Text, and Export Formats (~1.75 hrs)
**Contact hours:** 1.75
**Sizing note:** 214 lines, 1 meeting.
**Book section:** 12.2 Colors, Text, and Export Formats
**SLOs covered:** SLO 3
**Reading:** Book §12.2 Colors, Text, and Export Formats

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
- **A12.2.1 (Lab):** Design a personalized nameplate or badge that includes: your name in 3D text (extruded), at least 2 colors, at least one design element beyond just text, parameters for text size and depth. Export as STL and print.
- **A12.2.2 (Quiz — in class, 15 min):** Name 3 export formats and when to use each. Write a `colorize()` call given an RGB value. Explain one difference between STL and 3MF.

**Exam:**
- **Semester 2 Midterm 3 (~1 hour, in class):** Covers §10.1–12.2 (Fits-My-Stuff synthesis, hulls/advanced extrusions, measurements, sorting/searching, multi-file projects, colors/text/export). Administer at end of this section.

---

## Unit 13: Synthesis — Mechanism (book Chapter 13)
> **SLO focus:** **SLO 3 primary Sem 2 evidence (A13.3.1 Mechanism Capstone)**; **SLO 1 closing artifact (A13.3.2 lifecycle reflection)**. Every SLO must be demonstrable in the capstone deliverable.
> **Strengthened requirement (2026-08-13):** aligned to book_manifest.yaml's own added constraint — a single printed blob never exercises Q4's measurement/printability content, because nothing has to fit. The capstone now requires 2+ printed parts with a real interface (hinge, snap fit, threaded lid, or peg-and-socket), not just one polished object. Tolerance-and-fit is the lesson that transfers directly to the FreeCAD/Mechatronics course next in sequence, and it can't be learned from a single part — the first print never fits, which is what teaches iteration honestly.

### 13.1 Capstone Design Phase (~3.5 hrs)
**Contact hours:** 3.5
**Book section:** 13.1 Capstone Design Phase
**SLOs covered:** SLO 1 (lifecycle), SLO 3 (design phase)
**Reading:** Book §13.1 Capstone Design Phase

**Learning Objectives:**
- Define a project scope that is achievable and meaningful in 3 weeks
- Write a design specification before building, including a bill of materials
- Break a large project into milestones

**Topics:**
- Project scoping: what's realistic in 3 weeks of in-class work
- Design specification document, including a bill of materials (BOM) — where §11.3's sort/search work lands
- Milestone planning: working backwards from a deadline
- Peer design review: giving and receiving feedback

**Assignments:**
- **A13.1.1 — Capstone Design Spec (major grade component):** A 2-page design specification for a capstone with **2+ printed parts that fit together via at least one real interface** (hinge, snap fit, threaded lid, or peg-and-socket). Must include: project title and purpose, list of features/requirements, sketch of the design, **a build-order flowchart (below)**, a bill of materials (each part, its role, and how it interfaces with the others), parameter list (what will be parameterized and why), milestone plan with 3 checkpoints (M1 geometry, M2 parameters+validation, M3 polish+print), and a printability analysis (overhangs, supports, orientation) for each part.
- **A13.1.2 — Capstone build-order chart (10% of the capstone grade; the design-phase deliverable, due before §13.2 build days open):** One flowchart covering **both parts and their interface** — each part's geometry as a `[[ ]]` subroutine shape charted separately, the shared parameters that set the fit as arrows into both, and the tolerance decision as an actual diamond (`gap >= 0.4mm`). All eight structural checks green (Appendix D §D.1). This is the last flowchart of the year and the only one that has to hold two things at once.

**Teacher Notes:**
- "Functional" examples to suggest: a hinged box, a snap-fit cable organizer with a lid, a two-part bracket joined by a peg-and-socket, a threaded-lid container. Every example must have 2+ parts and a real interface — a single polished object does not satisfy this capstone.
- Require peer design review in class: students swap specs and flag one scope risk each — specifically checking that the interface between parts is realistic to print and assemble. **Swap the charts, not the prose** — a scope risk is visible as a chart with thirty shapes in it, and invisible in two pages of confident writing.
- **The tolerance diamond is the point of A13.1.2.** A capstone where the two parts' dimensions are set independently, with no shared parameter and no clearance decision, does not fit on the first print and the student has no idea why. On the chart that shows up as two subroutine shapes with no arrow between them — catch it here, three weeks before the print.
- Specs that can't be built in 3 weeks get revised before the build phase begins — no exceptions.

---

### 13.2 Capstone Build and Iterate (~7 hrs, 2 weeks)
**Contact hours:** 7.0 (2 weeks)
**Book section:** 13.2 Capstone Build and Iterate
**SLOs covered:** SLO 2 (structured programming), SLO 3 (implement + test)
**Reading:** Book §13.2 Capstone Build and Iterate

**Learning Objectives:**
- Complete a full multi-part project through multiple design iterations
- Document the design process, not just the final product
- Give and receive structured peer feedback
- Iterate on a part-to-part fit that doesn't work the first time

**Topics:**
- Iteration: design → build → test → revise cycle — expect the first print of an interface not to fit
- Version control discipline: why and when you commit
- Peer code review: what to look for, how to give useful feedback
- Presentation skills: explaining a technical project to a non-technical audience
- **AP CSP Discussion (15 min, week 1 of build):** Digital divide. Not everyone has access to 3D printers, high-speed Internet, or even computers. Discuss: who benefits from the tools we're using? Who is excluded? What can be done about it? "We're in a lab with 10 printers — most schools have zero."
- **AP CSP Discussion (15 min, week 2 of build):** Computing bias. Designs reflect the assumptions of their creators. Examples: facial recognition accuracy varies by skin tone, voice assistants struggle with accents. Ask: "What assumptions did YOU make in your capstone? Who might struggle to use it?"

**Assignments:**
- **A13.2.1 — Capstone Milestone 1:** Working JSCAD model with basic geometry for every part — no polish required. Code review with teacher.
- **A13.2.2 — Capstone Milestone 2:** All part geometry complete, parameters working, input validation in place. Documentation draft including the BOM.
- **A13.2.3 — Capstone Milestone 3:** Feature-complete multi-part model, README complete, test suite for key functions, first print of each part attempted.
- **A13.2.4 — Peer Review:** Review two classmates' capstones. Written feedback: what works, what's unclear, one specific code improvement suggestion, one specific design/fit improvement suggestion.
- **A13.2.5 — Final Print:** Submit final printed capstone with **all parts assembled via their designed interface**, plus iteration documentation (photos of failed + successful prints/fits + what changed between them) and a printability report.

**Teacher Notes:**
- Extra week built in for print failures, iteration, and debugging — this is the most error-prone part of the year, and now more so with a real fit requirement.
- Require daily commits during the build weeks; commit frequency is graded as part of A13.2.
- Students who finish early help classmates via peer review — do not assign new content.
- A first-try interface that doesn't fit is expected, not a failure — that iteration IS the lesson this capstone was strengthened to teach.

---

### 13.3 Presentations and Reflection (~3.5 hrs)
**Contact hours:** 3.5
**Semester 2 demonstration (2026-08-14):** these two meetings (May 21 & 25, 2027) are also the **Semester 2 Review Project** — the demonstration assignment in the week before the Jun 1 final. No separate review project is scheduled for Semester 2, because this already is one and adding one would consume the schedule's remaining slack. Add a reflection component that generalises from the capstone to the semester's concepts, and require students to bring their reflection document to the final: **Part D of the Semester 2 exam asks two short-answer questions about their own mechanism**, and that document is the one reference permitted beyond the syntax sheet. See **Semester Close**.
**Book section:** 13.3 Presentations and Reflection
**SLOs covered:** SLO 1 (lifecycle reflection), SLO 3 (full program demonstration) — **PRIMARY SLO 3 EVIDENCE FOR SEMESTER 2**
**Reading:** Book §13.3 Presentations and Reflection

**Learning Objectives:**
- Present a technical project to a mixed audience
- Reflect on the full software development lifecycle through a completed work
- Connect the year's learning to the next course in the pathway

**Assignments:**
- **A13.3.1 — Capstone Presentation (major grade):** 5-minute presentation + Q&A. Must cover: what the object is and does, including how its parts fit together; how you designed it (key code decisions); what changed from your original design spec and why (especially any fit iteration); one thing you'd do differently; how this work connects to the FreeCAD/mechatronics pathway you're heading into.
- **A13.3.2 — Course Reflection (Written, SLO 1 closing artifact):** 1 page. Reflect on the software development life-cycle as you experienced it across the year. Give a specific example of each phase (design, code, test, maintenance) drawn from either the Q2 Arcade Cabinet capstone, the Q4 Mechanism capstone, or both.

**Exam:**
- **Semester 2 Final (~1.5 hours, in class):** Cumulative exam covering all of Semester 2 (§8.1–13.3), with selected questions from Semester 1 fundamentals. Format: multiple-choice (JS fundamentals, shplay, JSCAD modeling, algorithms), code-tracing (mix of JS and JSCAD), short-answer (SLO-aligned: lifecycle reflection; OOP vs. procedural; algorithm analysis; testing principles), write-code problems (one JSCAD modeling task, one standalone JS algorithm). Schedule on a separate day from capstone presentations.

**Teacher Notes:**
- Capstone presentations can be split across two class meetings if the cohort is large — presentations day 1, final exam day 2 (or reversed).
- Keep A13.3.2 reflections on file as the SLO 1 closing artifact for dual-enrollment documentation.

---

## PART A - OFFICIAL COURSE OUTLINE (Butte College CSCI 4)

> Folded in from `butte-csci4-slo.md` (now `.deprecated.md`). The official course-outline reference: SLO wording, contact hours, evaluation methods, and the gap analysis vs. this plan.

## Butte College CSCI 4 — Course Outline Reference
### Introduction to Programming Concepts and Methodologies

> Source: [Butte College CurriQunet](https://butte.curriqunet.com/DynamicReports/AllFieldsReportByEntity/4467?entityType=Course&reportId=213)
> Created/Revised by: Sathrum, Luke | Date: 05/02/2022

---

### Course Metadata

| Field | Value |
|-------|-------|
| Title | Introduction to Programming Concepts and Methodologies |
| Units | 3.00 (2.50 lecture + 0.50 lab) |
| Lecture Hours | 42.50 contact / 85.00 out-of-class / 127.50 total |
| Lab Hours | 25.50 contact / 0.00 out-of-class / 25.50 total |
| Total Contact Hours | 68.00 |
| Transfer Status | CSU / UC |
| C-ID | COMP 112 |
| Minimum Qualifications | Computer Science (Masters Required), or Computer Information Systems |

---

### Catalog Description

This course introduces students to the fundamental concepts of programming. Students will learn about the software development life-cycle, algorithms, and the design, implementation, and testing of programs using an object-oriented programming language.

---

### Student Learning Outcomes (SLOs)

Upon successful completion, students should be able to:

| SLO | Exact Wording |
|-----|---------------|
| SLO 1 | Describe the software development life-cycle |
| SLO 2 | Describe principles of structured programming |
| SLO 3 | Describe, design, implement, and test structured programs using currently accepted methodology |
| SLO 4 | Explain what an algorithm is and its importance in computer programming |

---

### Course Content — Lecture Topics

| Topic | Hours |
|-------|-------|
| Software life-cycle | 2.50 |
| Procedural vs. object-oriented programming | 2.50 |
| Program design tools and programming environments | 2.50 |
| Documentation | 2.50 |
| Coding conventions | 2.50 |
| Data types, variables, expressions, sequential processing | 2.50 |
| Arrays including multiple-subscripted arrays | 6.25 |
| Control structures: selective and repetitive | 5.00 |
| Algorithms including simple sorting and searching | 5.00 |
| File I/O including sequential access files | 2.50 |
| Error handling | 1.25 |
| Passing parameters by value and reference | 5.00 |
| Principles of testing and designing test data | 2.50 |
| **Total** | **42.50** |

### Course Content — Lab Topics

Same topics as lecture with lab-allocated hours totaling 25.50 hours.

---

### Methods of Instruction

1. Collaborative Group Work
2. Demonstrations
3. Homework — students are required to complete two hours of outside-of-class homework for each hour of lecture
4. Lecture
5. Multimedia Presentations

---

### Methods of Evaluation

1. **Quizzes**
2. **Homework**
3. **Lab Projects**
4. **Mid-term and final examinations**

---

### Assignment Examples (from course outline)

#### Reading Assignments
- Read section on loops; discuss infinite loop problems
- Read documentation on exception handling for programming language used

#### Writing Assignments
- Write out, in detail, an algorithm for searching for a specific value in an array of integers
- Correct formatting per coding conventions and document functions

#### Out-of-Class Assignments
- Design and document test data; determine if sample program passes/fails
- Design and implement a short program that opens a text file and searches for and counts the number of occurrences of a given string

---

### Required Textbooks

1. Savitch & Mock (2017). *Problem Solving with C++*, Pearson, 10th edition
2. Deitel & Deitel (2017). *C++ How to Program*, Prentice Hall, 10th edition
3. Al Sweigart (2019). *Automate the Boring Stuff with Python*, No Starch Press, 2nd edition

> **Note:** The textbook list reflects C++ and Python. This dual-enrollment section uses JavaScript as the programming language. The SLOs and topics are language-agnostic; coverage is what matters, not the specific language.

---

### Gap Analysis vs. Curriculum Plan

Items from this official outline that are **missing or underserved** in the curriculum plan.
**Cross-references updated 2026-08-14** to the book-native `§chapter.section` IDs used throughout
this document — the old `WN` week citations here no longer resolve to real weeks after the
renumber and the Part B calendar rebuild (see that section's capacity finding).

#### CRITICAL — Required by course outline, not in curriculum plan

| Gap | Outline Requirement | Curriculum Plan Status |
|-----|---------------------|----------------------|
| **Mid-term exam** | "Mid-term and final examinations" listed as required evaluation method | No midterm exists anywhere in the plan |
| **Final exam** | Same | No final exam exists anywhere in the plan |
| **Quizzes** | "Quizzes" listed as required evaluation method | Several quizzes exist scattered through the plan (§1.3, §2.3, §8.3, §8.4, §9.2, §9.4, §11.1, §12.2) but there is no dedicated grading category for them |
| **Sequential access files** | "File I/O including sequential access files" | **RE-OPENED 2026-08-13.** §3.8 was realigned from FileReader/Blob to JSON/localStorage to match what the book now teaches and what every downstream chapter actually uses (see §3.8's own note) — that is the pedagogically correct call, but it means this literal outline phrase no longer has a dedicated lab. §3.8's teacher notes suggest a short supplementary read-only FileReader demo as a fix; that demo has not been built. Decide and build it, or document why JSON/localStorage satisfies "sequential access" in spirit. |
| **Sequential processing** | "Data types, variables, expressions, sequential processing" | Sequential processing (step-by-step execution flow) is explicitly named and taught in §1.2 (added 2026-08-13) — no longer a gap |

#### HIGH — Standard intro-programming topics in the outline's spirit

| Gap | Notes |
|-----|-------|
| **`do...while` loops** | "Control structures: selective and repetitive" — now explicitly covered in §2.4 (added 2026-08-13), no longer a gap |
| **Multiple-subscripted arrays** | Outline says "arrays including multiple-subscripted arrays" — §3.3 introduces 2D arrays; still doesn't go deep enough for 6.25 hours of outline lecture coverage |
| **Text file I/O program** | Out-of-class assignment example: "design and implement a short program that opens a text file and searches for and counts the number of occurrences of a given string" | Was covered by the old A8.2 FileReader lab; now open again per the Sequential access files row above until the supplementary demo is built |

#### NOTES — Alignment items, not gaps

| Item | Status |
|------|--------|
| OOP coverage | Outline says "object-oriented programming language" and "procedural vs. OOP" — covered in §5.3–5.4 |
| Pass by value/reference | 5.00 hours in outline — §3.6 covers this, allocation seems proportional |
| Algorithms + sort/search | 5.00 hours in outline — §2.2 + §11.3 cover this adequately |
| Error handling | 1.25 hours in outline — §2.5 (intro) + §9.3 (deepened) cover this; likely over-allocated relative to outline now that it's taught twice |
| Testing | 2.50 hours in outline — §9.4 covers this adequately |
| Contact hours | Outline requires 68 total; the plan's original design claimed 126 (3.5 × 36). Part B now computes **88 meetings (~154 hrs)** — content, chapter assessments, both semester review projects and both final exams — against **90 available**. It fits, with 2 spare. Still above the outline's 68, which has not been a binding constraint on this course's actual delivery for some time |

---

### OpenStax Supplementary Mapping (JavaScript core)

**Primary reference book:** *Introduction to Python Programming* (OpenStax, Das/Lawson/Mayfield/Norouzi, CC BY-NC-SA). Used as a structural model for the Q1 console sequence and converted to JavaScript. Python-specific syntax is translated (`print()`→`console.log`, `def`→`function`/arrow, `list`→array, `dict`→object); SLO/topic coverage is language-agnostic. **Note:** the book itself (bookSHelf's `book_manifest.yaml`) now cites `python_intro` directly as a source pool for several sections — this table's mapping and the book's own sourcing should agree; re-verify if either changes.

#### Python chapters → Q1 console sequence (§1.1–4.1)

| Python ch. | Title | Maps to | Status |
|---|---:|---|---|
| 1 | Statements (IO, variables, strings, numbers, error messages, comments) | §1.1–1.3 Foundations | **Adopt** — includes a dedicated "Error messages" section worth folding into §1.1 as its own lesson |
| 2 | Expressions | §1.2 (operators, types) | Adopt |
| 3 | Objects | §1.2 variables (object/ref preview); full treatment now in §3.5 | Adopt as a preview only — value-first ordering retained |
| 4 | Decisions | §2.1 Conditionals | Adopt |
| 5 | Loops | §2.2 Algorithms and Loops, §2.4 Loop Control (do...while) | Adopt (incl. `do...while`, now with its own section) |
| 6 | Functions | §3.1–3.2 Functions | Adopt |
| 7 | Modules | §8.1 JSCAD libraries | Defer — libraries taught in JSCAD context |
| 8 | Strings | §1.2 string methods | Adopt |
| 9 | Lists | §3.3 Arrays (incl. multiple-subscripted) | Adopt |
| 10 | Dictionaries | — | **Excluded** — not in the CSCI 4 outline or SLOs |
| 11 | Classes | §5.3–5.4 OOP (shplay) | Borrow framing only — shplay-grounded OOP retained over abstract OOP |
| 12 | Recursion | — (§11.3 optional enrichment) | Optional, not assessed |
| 13 | Inheritance | §5.4 (named, not required) | Name only |
| 14 | Files | §3.8 (JSON/localStorage, not FileReader — see Gap Analysis above), §6.5 shplay save, §12.1 JSCAD multi-file | Adopt concept — browser JSON/localStorage replaces Python `open()`; FileReader coverage is the re-opened gap above |
| 15 | Data Science | — | Excluded — out of CSCI 4 scope |

#### Excluded Python content
- **Ch 10 Dictionaries** — no outline/SLO requirement.
- **Ch 15 Data Science** — belongs to *Principles of Data Science*, not CSCI 4.
- **Ch 12 Recursion / Ch 13 Inheritance** — beyond scope; handled as optional enrichment / shplay context.

#### Gap coverage the Python book helps close
The outline's required topics that the book covers directly:
- **`do...while` loops** (Ch 5) — "Control structures: selective and repetitive" — now taught in §2.4
- **Multiple-subscripted arrays** (Ch 9) — "Arrays including multiple-subscripted arrays" (6.25 hrs) — still underserved, see HIGH gap above
- **Sequential access files** (Ch 14) — "File I/O including sequential access files" (open, read line-by-line, write, close) — re-opened gap, see CRITICAL above

---

### Open-Source JavaScript References

Two free, open-source JS references supplement the plan. Both are read-in-the-browser resources that pair with the OpenStax structural model above — the Python book sets the Q1 chapter sequence; these supply the JS-native syntax, examples, and depth for each topic. **Note:** the book's own manifest cites `js1_modern_js` (javascript.info) and `eloquent_js` directly as primary sources for most Q1–Q2 sections now — this section predates that and should be read as historical planning context, not a live source list.

#### Primary: The Modern JavaScript Tutorial (javascript.info)
Ilya Kantor. Open source (CC-BY-SA), free online. Modern, comprehensive, beginner-appropriate progression. Covers essentially the entire CSCI 4 outline in JS-native form.

#### Secondary: Eloquent JavaScript (Haverbeke)
CC-BY-NC (code MIT), free online + free PDF/EPUB. Strong narrative prose with project chapters (robot, platform game, pixel editor). Best for motivated readers and optional enrichment; not the primary text.

**Note:** *You Don't Know JS Yet* (Simpson, CC-BY-NC-ND) was considered but **excluded** — it is an advanced deep-dive into language internals (scope, closures, `this`), not an intro text.

#### javascript.info sections → outline gap coverage

| Outline gap / underserved topic | javascript.info section |
|---|---|
| File I/O — sequential access files (FileReader, line-by-line) | [Binary data, files](/binary) → File and FileReader — **not currently taught**, see re-opened gap above |
| Error handling (1.25 hr outline topic) | [Error handling](/error-handling) → try...catch, custom errors |
| Testing principles (§9.4) | [Code quality](/code-quality) → Automated testing with Mocha |
| Debugging (§9.3) | [Code quality](/code-quality) → Debugging in the browser |
| Multiple-subscripted arrays | [Arrays](/array) + [Array methods](/array-methods) |
| JSON / serialization (§3.8, §6.5) | [JSON methods, toJSON](/json) |
| LocalStorage / persistence (§3.8, §6.5) | [Storing data in the browser](/data-storage) → LocalStorage |
| Async / preload (§6.9 Timing and Async) | [Promises, async/await](/async) → callbacks intro |
| DOM / browser events (if HTML is added) | [Document](/document) + [Introduction to Events](/events) |

#### Sequential-access constraint (re-opened 2026-08-13)
Browser JS cannot `open/write/close` sequential-access files the way C++/Python can — there is no file-handle API and no `close()` call. **The old resolution no longer applies:** §3.8 was realigned from `Blob`/FileReader to JSON/localStorage (see §3.8's own note and the Gap Analysis CRITICAL row above), so the open→read→write→close mapping this note used to describe is not currently taught anywhere in the plan. Node's `fs` (conceptual reference only, not run in-browser) remains available as a contrast if a future pass rebuilds a FileReader demo.

---

## PART B - ASSIGNMENT CALENDAR (2026-27)

> Rebuilt 2026-08-14, replacing an earlier hand-typed `cs_course_schedule.md` table (deleted; see
> git history at `845a118~1` if it is ever needed),
> which used a THIRD numbering scheme independent of both the old Q.U scheme in the main body and
> the book-native scheme this document now uses throughout. This rebuild uses book-native chapter.section
> IDs consistently and, unlike the old table, is **computed against the real CUSD 2026-27 calendar**
> rather than hand-typed.
>
> **Calendar data verified 2026-08-14 against the primary source** — `bookSHelf/cusd academic calendar
> 26-27.pdf` (Chico Unified School District 2026-2027 Student Calendar, updated 5/20/26). Every closure,
> recess range and finals window matches. The Aug 14 start is confirmed two independent ways: it yields
> exactly the 83 / 97 semester day-counts the calendar itself states, and it reproduces the odd/even
> parity of the existing Intro Stats calendar (Aug 18 odd, Aug 17 even). An Aug 13 start — the PDF's
> minimum day for *middle* schools — fails both.
>
> **Generated by `scripts/cs_schedule.py` — do not hand-edit the table below.** Change the section
> list, a day count, or a pairing in that script and re-run it (`PYTHONUTF8=1 python
> scripts/cs_schedule.py`). Any change shifts the date of every meeting after it, so patching a few
> rows by hand silently corrupts the rest.

### Capacity — it fits, with 2 meetings of slack

CS meets on **odd days only** (a single track, not the odd/even dual-track Stats uses) — **90 real
class meetings across the whole 2026-27 year**, verified against the actual district calendar. The
corrected book plus both semester-close blocks needs **88** — 87, plus one for the Ch 8 Group PA, which
is stretched across two meetings because it lands on a minimum day (see below). The year ends **Tue
Jun 1, 2027** with the Semester 2 final, two days before the last day of school. One of the two spare
meetings sits as **catch-up buffer immediately before the Semester 2 close**, where it absorbs
accumulated slippage.

| | Meetings needed | vs. 90 available | Year ends |
|---|---:|---:|---|
| **Current model** (1 meeting/section + finals blocks, Ch 11–12 merged) | **88** | **+2 spare** | **Tue Jun 1, 2027** |
| *Before the Ch 11–12 assessment merge* | *89* | *+1* | *Thu Jun 3, 2027* |
| *Content only, before finals blocks were scheduled* | *87* | *+3* | *Mon May 24, 2027* |
| *Superseded: 2-day-default model* | *111* | *−21* | *Fri Jul 30, 2027* |
| *Superseded: same, after "Tier 1–3" compression* | *97* | *−7* | *Tue Jun 22, 2027* |

> **Slack is 2 meetings.** One is an explicit catch-up row just before the Semester 2 close; the other
> is Jun 3, the last day of school (itself a minimum day). One lost day is absorbable; three are not.
> Note that a future minimum-day collision consumes a meeting automatically — the stretch rule below
> spends slack to protect assessments, which is the right trade but is not free. Further meetings could come from cutting §13.2 Capstone Build
> from 4 to 3, or merging another undersized chapter's assessment block. **Do not** re-cut §2.3 or
> §6.3 — both are already down to one meeting to fund the finals blocks (see below).

#### Why the earlier numbers were wrong — and why this matters for trusting the table

The 111-meeting figure, the 21-meeting shortfall, and the whole compression exercise it triggered were
artifacts of a **bad sizing assumption, not of the content**. That model gave most sections 2 meetings.
It came from `BOOK-TO-MODULE.md`'s day-count column — which that document explicitly labels *"a
provisional estimate"* derived from book **line count** at ~590 lines per class day, to be replaced by
real atomic-concept counts once specs were written. The replacement never happened, so a line-count
proxy silently carried the entire calendar. Worse, that proxy only ever covered Chapters 1–4; the
Ch 5–13 day counts were extrapolated by analogy with no source at all, and were measurably wrong —
Chapter 11's sections are 165, 206 and 580 lines and Chapter 12's are 251 and 214, yet every one had
been given two meetings.

**Current model (operator decision 2026-08-14): one meeting per book section.** Three exception types,
and nothing else:

1. **Dense sections get 2 meetings — 7 of them**, listed below. Chosen from real line counts of every
   section file in the book repo (base `.md` at the highest available tier; `_Solutions` and
   `_MathVerify` files are teacher-side keys, not student contact content) blended with the
   pedagogical flags already recorded in this document.
2. **Four pre-existing pairs** are taught as one continuous block: §1.2+1.3, §5.3+5.4, §6.1+6.2,
   §6.7+6.8 — each is one continuous lesson in the book or already ships as a single in-app module.
   **A pair still gets one meeting per section**; pairing means "teach these together", not "fit two
   sections into one period." No section is compressed below a meeting anywhere in this model.
3. **Synthesis chapters are sized by the activity** (§4.1/§7.1/§10.1 at 3 meetings, Ch 13 at 8), not by
   prose length — their section files are only 100–160 lines.

| Section | Lines | Why 2 meetings |
|---|---:|---|
| §1.5 Program Design Tools and Environments | 980 | Pseudocode and flowcharts are a genuinely new skill, and this lands in the weeks when tooling friction is highest |
| §2.1 Conditionals | 1110 | Largest section in the book; first real logic, plus comparison operators, logical operators and truthiness |
| §2.3 The switch Statement | 1024 | Line count only — see the caveat below |
| §2.4 Loop Control and Nested Loops | 1054 | Nested loops is the documented beginner wall |
| §3.2 Parameters and Return Values | 748 | §3.1 was deliberately split from this because the combined treatment moved too fast |
| §3.3 Arrays | 844 | One of the two highest-leverage sections in Q1 — groups, JSCAD parameter arrays and sorting all assume fluency |
| §6.3 Physics Applications | 812 | Largest section in Chapter 6 |

**Caveat on §2.3.** Its 1024 lines are largely repeated worked examples, and `switch` is conceptually a
syntactic variant of the if/else-if chain from §2.1. It is the weakest of the seven and the first
candidate to drop to one meeting if a meeting is ever needed elsewhere. It is left at two deliberately:
after a round of over-compression, erring generous is the right direction, and the cost is one meeting
out of three spare.

#### Semester close — review project, then final exam

Both semesters end the same way: **a project that demonstrates the semester's work, then a final exam
the project has prepared them for.** These are now real rows in the calendar; previously neither was
scheduled at all.

| | Semester 1 | Semester 2 |
|---|---|---|
| Last content meeting | Ch 5 Test — Tue Dec 8, 2026 | §13.3 presentations — Tue May 25, 2027 |
| **Demonstration project** | **Semester 1 Review Project**, 2 meetings — Dec 10 & 14 | **§13.3 Capstone Presentations and Reflection**, 2 meetings — May 21 & 25 |
| **Final exam** | **Wed Dec 16, 2026** — the last CS meeting inside the district's Dec 14–17 window | **Tue Jun 1, 2027** — inside the district's Jun 1–2 window, with 1 catch-up meeting between it and the presentations |
| Exam covers | **Chapters 1–5** | **Chapters 6–13** |

Three things this buys:

- **Both finals are anchored to their district window in code**, not placed by sequence position — see
  the note below on why that matters.
- **The semester now breaks on a clean chapter boundary.** Semester 1 is Chapters 1–5 entire; Semester 2
  opens at Chapter 6 on Jan 5. Earlier revisions cut mid-Chapter-6, which made the exam scope awkward
  (§1.1–6.2) and left an orphan meeting stranded before winter break.
- **The old finals collision is resolved by construction.** Content used to be scheduled on top of the
  Dec 14–17 window; the final now occupies it deliberately.
- **Semester 2 needs no separate review project** — §13.3 already *is* a semester demonstration, it
  already runs two meetings, and it already falls the week before the exam. It is reframed below so the
  exam draws on the capstone each student just built rather than testing unrelated ground.

- **All 9 content chapters keep both assessments** (individual Test + paired Group PA). See below.

#### Chapters 11 and 12 share one assessment block

**Chapter 12 is the smallest content chapter in the book** — 465 lines across two sections (§12.1 at
251, §12.2 at 214). Chapter 11 is the second smallest at 951. Separately they carried a Group PA *and*
a Test each: **four assessment meetings for 1,416 lines of content**, while Chapter 8 covers 2,525
lines on one block and Chapter 9 covers 2,204 on one.

Merged, Ch 11–12 is 5 sections / 1,416 lines with a single Group PA + Test — still a smaller chapter
than either Ch 8 or Ch 9. **Saves 2 meetings**, which is the schedule's entire safety margin.

**This is a scheduling and assessment merge, not a renumber.** Book section IDs are untouched: §11.1,
§11.2, §11.3, §12.1 and §12.2 keep their identities, their own entries in the main body, and their
alignment to the book. What changed is that one assessment block covers all five instead of two blocks
covering three and two. The content is also coherent as a unit — hulls, printability, sort/search on
geometry, multi-file organisation, and export formats are all "make it real and ship it" skills, and
all five feed the Ch 13 capstone directly.

#### What the finals blocks cost

Four meetings had to come from somewhere. Two came from the three that were spare; the other two came
from the two weakest 2-meeting sections, both already flagged in this document as first candidates:

| Section | Was | Now | Why it was the right meeting to take |
|---|---:|---:|---|
| §2.3 The switch Statement | 2 | 1 | 1024 lines, but largely repeated worked examples — `switch` is a syntactic variant of §2.1's if/else-if chain. Pre-registered here as "the first candidate to drop if a meeting is ever needed elsewhere." |
| §6.3 Physics Applications | 2 | 1 | 812 lines, but pure *application* of §5.2 (physics properties) and §6.2 (collisions) — the only one of the seven dense sections introducing no new API or concept. |

No other section moved, no chapter test or Group PA was dropped, and the Ch 13 capstone is untouched at
8 meetings.

#### Retired: the "Tier 1–4" doubling-up menu

An earlier revision of this section carried a four-tier menu of candidate pairings sized to close the
phantom 21-meeting gap, with Tiers 1–3 adopted. **All of it is reverted** — the gap it addressed does
not exist under correct sizing. Two of its rationales were also wrong on the merits and are recorded
here so they are not re-proposed:

- **Tier 1 claimed the Group PA on Ch 3, 6, 9 and 12 was redundant** because each is followed by a
  synthesis chapter that "is a group PA." **False.** The Group PA is a **paired** assessment; the
  synthesis project is assessed **individually**. They measure different things and neither substitutes
  for the other. All 9 content chapters keep both.
- **Tier 4 proposed moving synthesis-project build time out of class.** Rejected — it is the wrong
  trade for students without reliable machines at home, and it is unnecessary now.

Tier 2's and Tier 3's observations about which sections are *conceptually* light (§2.5 after §9.3
re-teaches it, §3.4 as syntax for a known concept, §6.5 as a second exposure to §3.8's JSON) survive as
the per-section **Sizing notes** in the main body — they inform teaching emphasis, not meeting counts.

**Assessment types:**
- **Ch N Test** — 1-day **individual** chapter test (in-class, closed book), on every content chapter
  (1, 2, 3, 5, 6, 8, 9, 11, 12) and on no synthesis chapter. Full per-chapter specs — format, blueprint,
  and what each one is allowed to assume — are in **"Individual chapter assessments"** below.
- **Ch N Group PA** — 1-day **paired** performance assessment (design + build + demo), on every
  content chapter. Distinct from the synthesis projects, which are assessed individually.
  **The "design" third is a flowchart** (Appendix D): the pair charts the solution together on one
  screen, gets it green, and only then opens an editor — worth **25% of the PA**. Pairing is what
  makes this the best flowchart of the chapter, because two students who disagree about what happens
  next have to resolve it on the diagram before either can type.
- **Synthesis Project** — the book's own capstone chapters (4, 7, 10, 13); no separate test/PA, the
  project itself is the performance assessment. Each opens with a graded design chart submitted
  before build days (A4.1.0, A7.1.1's state-machine chart, A10.1.0, A13.1.2) — **10% of the project**.
- **Semester Review Project** — the demonstration assignment in the meetings immediately before a
  final. Semester 1 gets a dedicated 3-meeting one (Dec 10–14); Semester 2 uses §13.3 Capstone
  Presentations and Reflection, which already serves the purpose. Spec in **"Semester close"** below.
- **Semester Final Exam** — 1 meeting, individual, in the district's finals window. **Both finals are
  now real rows in the calendar** (meetings 42 and 90); earlier revisions left them unscheduled, which
  is how the 87-meeting count understated the year.

### Full calendar (single continuous sequence — semester boundary marked inline)

| # | Ch | Chapter | Assignment | Wk | Date |
|---:|---:|---|---|---:|---|
| 1 | 1 | Foundations | Orientation and Syllabus + §1.1 Software Lifecycle | 1 | Fri Aug 14, 2026 |
| 2 | 1 | Foundations | §1.2 Variables and Data Types + §1.3 Documentation and Coding Conventions (day 1/2) | 2 | Tue Aug 18, 2026 |
| 3 | 1 | Foundations | §1.2 Variables and Data Types + §1.3 Documentation and Coding Conventions (day 2/2) | 2 | Thu Aug 20, 2026 |
| 4 | 1 | Foundations | §1.4 Programming Paradigms and Languages | 3 | Mon Aug 24, 2026 |
| 5 | 1 | Foundations | §1.5 Program Design Tools and Environments (day 1/2) | 3 | Wed Aug 26, 2026 |
| 6 | 1 | Foundations | §1.5 Program Design Tools and Environments (day 2/2) | 3 | Fri Aug 28, 2026 |
| 7 | 1 | Foundations | **Ch 1 Group PA** | 4 | Tue Sep 01, 2026 |
| 8 | 1 | Foundations | **Ch 1 Test** | 4 | Thu Sep 03, 2026 |
| 9 | 2 | Control Flow | §2.1 Conditionals (day 1/2) | 5 | Tue Sep 08, 2026 |
| 10 | 2 | Control Flow | §2.1 Conditionals (day 2/2) | 5 | Thu Sep 10, 2026 |
| 11 | 2 | Control Flow | §2.2 Algorithms and Loops | 6 | Mon Sep 14, 2026 |
| 12 | 2 | Control Flow | §2.3 The switch Statement | 6 | Wed Sep 16, 2026 |
| 13 | 2 | Control Flow | §2.4 Loop Control and Nested Loops (day 1/2) | 6 | Fri Sep 18, 2026 |
| 14 | 2 | Control Flow | §2.4 Loop Control and Nested Loops (day 2/2) | 7 | Tue Sep 22, 2026 |
| 15 | 2 | Control Flow | §2.5 Handling Errors with try/catch | 7 | Thu Sep 24, 2026 |
| 16 | 2 | Control Flow | **Ch 2 Group PA** | 8 | Mon Sep 28, 2026 |
| 17 | 2 | Control Flow | **Ch 2 Test** | 8 | Wed Sep 30, 2026 |
| 18 | 3 | Functions and Data | §3.1 Functions: Definition and Calls | 8 | Fri Oct 02, 2026 |
| 19 | 3 | Functions and Data | §3.2 Parameters and Return Values (day 1/2) | 9 | Wed Oct 07, 2026 |
| 20 | 3 | Functions and Data | §3.2 Parameters and Return Values (day 2/2) | 9 | Fri Oct 09, 2026 |
| 21 | 3 | Functions and Data | §3.3 Arrays (day 1/2) | 10 | Tue Oct 13, 2026 |
| 22 | 3 | Functions and Data | §3.3 Arrays (day 2/2) | 10 | Thu Oct 15, 2026 |
| 23 | 3 | Functions and Data | §3.4 Function Expressions and Arrow Functions | 11 | Mon Oct 19, 2026 |
| 24 | 3 | Functions and Data | §3.5 Objects and Properties | 11 | Wed Oct 21, 2026 |
| 25 | 3 | Functions and Data | §3.6 Functions: Pass by Value/Reference | 11 | Fri Oct 23, 2026 |
| 26 | 3 | Functions and Data | §3.7 Array Methods | 12 | Tue Oct 27, 2026 ⚠ MIN DAY |
| 27 | 3 | Functions and Data | §3.8 Saving and Loading Data | 12 | Thu Oct 29, 2026 |
| 28 | 3 | Functions and Data | **Ch 3 Group PA** | 13 | Mon Nov 02, 2026 |
| 29 | 3 | Functions and Data | **Ch 3 Test** | 13 | Wed Nov 04, 2026 |
| 30 | 4 | Synthesis — Print Shop | **§4.1 Print Shop — Q1 Synthesis (day 1/3)** | 13 | Fri Nov 06, 2026 |
| 31 | 4 | Synthesis — Print Shop | **§4.1 Print Shop — Q1 Synthesis (day 2/3)** | 14 | Tue Nov 10, 2026 |
| 32 | 4 | Synthesis — Print Shop | **§4.1 Print Shop — Q1 Synthesis (day 3/3)** | 14 | Fri Nov 13, 2026 |
| 33 | 5 | shPlay Foundations | §5.1 Hello Sprite and Movement | 15 | Tue Nov 17, 2026 |
| 34 | 5 | shPlay Foundations | §5.2 Physics Feel | 15 | Thu Nov 19, 2026 |
| 35 | 5 | shPlay Foundations | §5.3 Classes and Instances + §5.4 Writing Your Own Classes (day 1/2) | 16 | Mon Nov 30, 2026 |
| 36 | 5 | shPlay Foundations | §5.3 Classes and Instances + §5.4 Writing Your Own Classes (day 2/2) | 16 | Wed Dec 02, 2026 |
| 37 | 5 | shPlay Foundations | **Ch 5 Group PA** | 16 | Fri Dec 04, 2026 |
| 38 | 5 | shPlay Foundations | **Ch 5 Test** | 17 | Tue Dec 08, 2026 |
| — | — | — | ***← SEMESTER 1 CLOSE — Ch 1-5 complete. Review project Dec 10 & 14, final Dec 16 (inside the district's Dec 14-17 window).*** | — | — |
| 39 | S1 | Semester 1 Close | **Semester 1 Review Project (covers Ch 1-5) (day 1/2)** | 17 | Thu Dec 10, 2026 |
| 40 | S1 | Semester 1 Close | **Semester 1 Review Project (covers Ch 1-5) (day 2/2)** | 18 | Mon Dec 14, 2026 |
| 41 | S1 | Semester 1 Close | **SEMESTER 1 FINAL EXAM (Ch 1-5 cumulative)** | 18 | Wed Dec 16, 2026 |
| — | — | — | ***← district's Winter Recess (Dec 21 - Jan 1). Semester 2 opens at Chapter 6.*** | — | — |
| 42 | 6 | Game Mechanics | §6.1 Groups + §6.2 Overlaps and Collisions (day 1/2) | 19 | Mon Jan 04, 2027 |
| 43 | 6 | Game Mechanics | §6.1 Groups + §6.2 Overlaps and Collisions (day 2/2) | 19 | Wed Jan 06, 2027 |
| 44 | 6 | Game Mechanics | §6.3 Physics Applications | 19 | Fri Jan 08, 2027 |
| 45 | 6 | Game Mechanics | §6.4 Animated Sprites and Camera | 20 | Tue Jan 12, 2027 |
| 46 | 6 | Game Mechanics | §6.5 Save and Load | 20 | Thu Jan 14, 2027 |
| 47 | 6 | Game Mechanics | §6.6 Game State Machines | 21 | Tue Jan 19, 2027 |
| 48 | 6 | Game Mechanics | §6.7 Advanced Input + §6.8 Joints (day 1/2) | 21 | Thu Jan 21, 2027 |
| 49 | 6 | Game Mechanics | §6.7 Advanced Input + §6.8 Joints (day 2/2) | 22 | Mon Jan 25, 2027 |
| 50 | 6 | Game Mechanics | §6.9 Timing and Async | 22 | Wed Jan 27, 2027 |
| 51 | 6 | Game Mechanics | **Ch 6 Group PA** | 22 | Fri Jan 29, 2027 |
| 52 | 6 | Game Mechanics | **Ch 6 Test** | 23 | Tue Feb 02, 2027 |
| 53 | 7 | Synthesis — Arcade Cabinet | **§7.1 Arcade Cabinet — Q2 Synthesis (day 1/3)** | 23 | Thu Feb 04, 2027 |
| 54 | 7 | Synthesis — Arcade Cabinet | **§7.1 Arcade Cabinet — Q2 Synthesis (day 2/3)** | 24 | Mon Feb 08, 2027 |
| 55 | 7 | Synthesis — Arcade Cabinet | **§7.1 Arcade Cabinet — Q2 Synthesis (day 3/3)** | 24 | Wed Feb 10, 2027 |
| 56 | 8 | JSCAD Foundations | §8.1 Libraries and JSCAD Introduction | 25 | Tue Feb 16, 2027 |
| 57 | 8 | JSCAD Foundations | §8.2 2D Shapes and Transforms | 25 | Thu Feb 18, 2027 |
| 58 | 8 | JSCAD Foundations | §8.3 Boolean Operations in 2D | 26 | Mon Feb 22, 2027 |
| 59 | 8 | JSCAD Foundations | §8.4 Parameters and getParameterDefinitions | 26 | Wed Feb 24, 2027 |
| 60 | 8 | JSCAD Foundations | §8.5 Arrays in JSCAD / Loops | 26 | Fri Feb 26, 2027 |
| 61 | 8 | JSCAD Foundations | **Ch 8 Group PA (day 1/2)** | 27 | Tue Mar 02, 2027 ⚠ MIN DAY |
| 62 | 8 | JSCAD Foundations | **Ch 8 Group PA (day 2/2)** | 27 | Thu Mar 04, 2027 |
| 63 | 8 | JSCAD Foundations | **Ch 8 Test** | 28 | Mon Mar 08, 2027 |
| 64 | 9 | 3D Modeling | §9.1 First Extrusion: 2D to 3D | 28 | Wed Mar 10, 2027 |
| 65 | 9 | 3D Modeling | §9.2 3D Primitives and Transforms | 28 | Fri Mar 12, 2027 |
| — | — | — | ***← district's Spring Recess (Mar 15-19, 2027)*** | — | — |
| 66 | 9 | 3D Modeling | §9.3 Error Handling and Debugging | 29 | Tue Mar 23, 2027 |
| 67 | 9 | 3D Modeling | §9.4 Testing Principles | 29 | Thu Mar 25, 2027 |
| 68 | 9 | 3D Modeling | **Ch 9 Group PA** | 30 | Wed Mar 31, 2027 |
| 69 | 9 | 3D Modeling | **Ch 9 Test** | 30 | Fri Apr 02, 2027 |
| 70 | 10 | Synthesis — Fits-My-Stuff | **§10.1 Fits-My-Stuff — Q3 Synthesis (day 1/3)** | 31 | Tue Apr 06, 2027 |
| 71 | 10 | Synthesis — Fits-My-Stuff | **§10.1 Fits-My-Stuff — Q3 Synthesis (day 2/3)** | 31 | Thu Apr 08, 2027 |
| 72 | 10 | Synthesis — Fits-My-Stuff | **§10.1 Fits-My-Stuff — Q3 Synthesis (day 3/3)** | 32 | Mon Apr 12, 2027 |
| 73 | 11-12 | Advanced Modeling and Production | §11.1 Hulls and Advanced Extrusions | 32 | Wed Apr 14, 2027 |
| 74 | 11-12 | Advanced Modeling and Production | §11.2 Measurements and Printability | 32 | Fri Apr 16, 2027 |
| 75 | 11-12 | Advanced Modeling and Production | §11.3 Sorting and Searching on Geometry | 33 | Tue Apr 20, 2027 |
| 76 | 11-12 | Advanced Modeling and Production | §12.1 Multi-File Projects and File I/O | 33 | Thu Apr 22, 2027 |
| 77 | 11-12 | Advanced Modeling and Production | §12.2 Colors, Text, and Export Formats | 34 | Tue Apr 27, 2027 |
| 78 | 11-12 | Advanced Modeling and Production | **Ch 11-12 Group PA** | 34 | Thu Apr 29, 2027 |
| 79 | 11-12 | Advanced Modeling and Production | **Ch 11-12 Test** | 35 | Mon May 03, 2027 |
| 80 | 13 | Synthesis — Mechanism | **§13.1 Capstone Design Phase (day 1/2)** | 35 | Wed May 05, 2027 |
| 81 | 13 | Synthesis — Mechanism | **§13.1 Capstone Design Phase (day 2/2)** | 35 | Fri May 07, 2027 |
| 82 | 13 | Synthesis — Mechanism | **§13.2 Capstone Build and Iterate (day 1/4)** | 36 | Tue May 11, 2027 |
| 83 | 13 | Synthesis — Mechanism | **§13.2 Capstone Build and Iterate (day 2/4)** | 36 | Thu May 13, 2027 |
| 84 | 13 | Synthesis — Mechanism | **§13.2 Capstone Build and Iterate (day 3/4)** | 37 | Mon May 17, 2027 |
| 85 | 13 | Synthesis — Mechanism | **§13.2 Capstone Build and Iterate (day 4/4)** | 37 | Wed May 19, 2027 |
| 86 | 13 | Synthesis — Mechanism | **§13.3 Presentations and Reflection (day 1/2)** | 37 | Fri May 21, 2027 |
| — | — | — | ***← SEMESTER 2 CLOSE — capstone presentations May 21 & 25, 1 catch-up meeting, then the final Jun 1 (inside the district's Jun 1-2 window).*** | — | — |
| 87 | 13 | Synthesis — Mechanism | **§13.3 Presentations and Reflection (day 2/2)** | 38 | Tue May 25, 2027 |
| 88 | -- | Buffer | — buffer / catch-up — | 38 | Thu May 27, 2027 |
| 89 | S2 | Semester 2 Close | **SEMESTER 2 FINAL EXAM (Ch 6-13 cumulative)** | 39 | Tue Jun 01, 2027 |

### What this table does and doesn't tell you

- **Assignment-level detail (A#.#.# labs, written pieces, quizzes) lives in the main body above**, not
  repeated here — this table is meeting-by-meeting pacing, the main body is what happens in each meeting.
- **Non-school days** (Labor Day, Thanksgiving, Winter/Spring Recess, etc.) are the same as those listed
  under the old Part B and are already baked into the date math above — a closure shifts the next meeting
  forward, it does not remove a meeting from the count.
- **Rerun after any further section-list or pairing change:** the generating logic (chapter list with
  per-section day-counts, walking real odd-day meetings from Aug 14, 2026) is documented inline above;
  a full script should be written and checked in once the load-imbalance decision (compress further /
  demote / extend the year) is made, so this table can be regenerated instead of hand-edited again.
- **Regenerate, never hand-patch.** Any change to the section list, a day count or a pairing shifts
  the date of every meeting after it. Edit `scripts/cs_schedule.py` and re-run it.
- **Minimum days stretch an assessment rather than reshuffle content.** The district runs four
  minimum days (Oct 27, Jan 26, Mar 2, Jun 3): school is in session but every period is shortened, so a
  meeting landing on one cannot carry a full 1.75-hour block. Assessments are one meeting by default,
  and one meeting *is* the whole assessment — there is no slack in it. So when a Test, Group PA, review
  project or synthesis day lands on a minimum day, the generator gives **that one assessment a second
  meeting**: the shortened day becomes its briefing/kickoff half and the next full meeting carries the
  build and demo. Content order is untouched. It costs one meeting per collision and draws down slack.
  A *multi-day* block needs no such treatment — its first or last day fits a shortened period fine, and
  only its interior days are protected.
- **On the current run that stretched exactly one thing: `Ch 8 Group PA` → Mar 2 (day 1/2) + Mar 4
  (day 2/2).** The only other minimum-day meeting is §3.7 Array Methods on Oct 27, an ordinary lesson,
  which is fine on a short period but worth knowing when planning it. Both are flagged inline below and
  in `cs_course_schedule.md`, and the resolution re-runs automatically after any schedule change — a
  stretch shifts later meetings and can create a fresh collision, so the pass iterates until stable.
- **Regenerate, never hand-patch.** Any change to the section list, a day count or a pairing shifts
  the date of every meeting after it. Edit `scripts/cs_schedule.py` and re-run it.
- **Minimum days are handled automatically.** The district runs four minimum days (Oct 27, Jan 26,
  Mar 2, Jun 3) — school is in session but every period is shortened, so a meeting landing on one
  cannot carry a full 1.75-hour block. The generator now refuses to leave a **Test, Group PA, review
  project or synthesis day** on a minimum day: it swaps the assessment with the nearest ordinary
  single-section meeting and prints what it moved. On the current run it moved **Ch 8 Group PA off
  Mar 2 to Feb 26**, trading with §8.5. Two ordinary teaching sections still sit on minimum days —
  §3.7 Array Methods (Oct 27) and §8.5 Arrays in JSCAD (Mar 2) — which is acceptable for instruction
  but worth knowing when planning those two lessons. Minimum days are flagged inline below and in
  `cs_course_schedule.md`.
- **Regenerate, never hand-patch.** Any change to the section list, a day count or a pairing shifts
  the date of every meeting after it. Edit `scripts/cs_schedule.py` and re-run it.
- **⚠ One minimum-day collision.** **Tue Jan 26, 2027** is a District-wide Staff Development Day —
  school is in session but every period is shortened, so the meeting cannot carry a full 1.75-hour
  block. It currently holds §6.7+6.8 day 2/2. Either move the lighter half of that pair onto it or
  swap it with a neighbouring meeting. The other three minimum days (Oct 27, Mar 2, Jun 3) do not fall
  on CS meetings. Minimum days are flagged inline in the table and in `cs_course_schedule.md`.
- **Nothing that needs a whole period** — a Test, a Group PA, a final exam — should ever be scheduled
  on a minimum day. Check this after any regeneration; the flag is emitted automatically.
- **Two scheduling collisions to resolve when building the actual bell schedule**, both visible above
  and neither caused by the compression: meetings 41–42 (§6.3) sit inside the Dec 14–17 Semester 1
  final window, and meetings 89–90 (Ch 12 Test, §13.1) sit inside the May 27 – Jun 2 Semester 2 final
  window. Either the finals displace those meetings (pushing everything after them one slot later) or
  those meetings move.

---

## PART C - EXTERNAL ALIGNMENT (freeCodeCamp + AP CSP)

> Folded in from `curriculum-alignment-guide.md` (now `.deprecated.md`). Week-by-week FCC activity mapping (its CodeHS rows were stripped during seeding), AP CSP non-coding integration, and the coverage summary.
>
> **STALE — flagged 2026-08-14, not remapped in this pass.** Every "Week N" label in this Part
> (the FCC/AP-CSP week-by-week tables immediately below, and the AP CSP integration table) refers
> to the OLD, retired week numbering from before the 2026-08-13/14 book-native renumber and Part B's
> capacity-driven calendar rebuild. Unlike Part A and Part B, this section's ~330 lines of detailed
> external-platform mappings were not individually remapped to `§chapter.section` IDs — the practical
> reason is that FCC/AP-CSP lesson-to-week mapping is auxiliary supplementary material, not core
> curriculum, and Part B's own finding (the real pacing doesn't fit the school year yet, pending a
> further compress/demote/extend-year decision) means any week numbers written here now would likely
> need touching again once that decision lands. **Treat every "Week N" below as "the content that
> used to be week N" — a topic pointer, not a real date** — until this section gets its own remap
> pass. The GRADING STRUCTURE, SLO COVERAGE, SOURCE ALIGNMENT, and appendices further down ARE fixed
> to the new `§` IDs, since those are load-bearing (grading weights, SLO documentation) rather than
> auxiliary.

## CSCI 4 Curriculum Alignment Guide
### freeCodeCamp (FCC) Lesson Mapping

This guide maps external lesson sections from freeCodeCamp's JavaScript Certification to the CSCI 4 curriculum plan. Alignment is at the section/module level. Multiple sources may align to the same week. JSCAD-specific weeks are omitted (mapped separately).

**Sources:**
- **FCC** = freeCodeCamp JavaScript Certification (v9)
- *(external platform sections carry no source tag)*


---

### QUARTER 1: JavaScript Fundamentals (Weeks 1-9)

#### Week 1 — What Is Programming / Software Lifecycle

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

#### Week 2 — Variables and Data Types

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

#### Week 3 — Documentation and Coding Conventions

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

#### Week 4 — Conditionals

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

#### Week 5 — Algorithms and Loops (For and While)

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

#### Week 6 — Functions Part 1 (Definition and Calls)

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

#### Week 7 — Functions Part 2 (Pass by Value/Reference)

| Source | Section | Notes |
|--------|---------|-------|
| FCC Objects | Introduction to JavaScript Objects and Their Properties [Theory] | Objects as reference types (partial) |
| FCC Objects | Working with Optional Chaining and Object Destructuring [Theory] | Spread operator, destructuring (partial) |
| FCC JavaScript Fundamentals Review | Working with Types and Objects [Theory] | Value vs reference types revisited |

**Significant gap.** freeCodeCamp has no dedicated section on pass-by-value vs pass-by-reference. This is a curriculum plan-specific deep dive (SLO topic). FCC's Objects theory touches on reference types, and the Fundamentals Review revisits it, but it does not explicitly contrast primitive vs object mutation behavior. This week is primarily teacher-delivered with custom exercises.

---

#### Week 8 — Arrays and File I/O

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

#### Week 9 — Q1 Review and Mini-Project

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

### QUARTER 2: Selected JS-Content Weeks

#### Week 17 — OOP: Classes and Objects

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

### QUARTER 3: JS-Content Weeks

#### Week 22 — Sorting and Searching Algorithms

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

#### Week 23 — Error Handling and Debugging

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

#### Week 24 — Testing Principles

| Source | Section | Notes |
|--------|---------|-------|
| (none) | — | — |

**Complete gap.** freeCodeCamp has no dedicated section on testing principles, writing test cases, or test-driven development. This entire week is teacher-delivered curriculum plan content. freeCodeCamp's labs implicitly test code but never teach testing as a concept.

---

### Non-Programming Units → Curriculum Plan Integration

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

#### Units NOT Integrated (and why)

| Unit | Reason |
|-------------|--------|
| Unit 9 (Steganography) | Requires image manipulation not available in JSCAD environment. Students get the underlying concepts (binary, compression, encryption) through other discussions. |
| Unit 10 (Image Filter) | Same — image pixel manipulation doesn't map to JSCAD. Conceptually covered via W11 color/image discussion. |
| Unit 14 (Data-Driven Insight) | No standalone data analysis project in CSCI 4. A25.3 written assignment covers the "present an insight" concept at smaller scale. |

#### Supplemental Lessons for AP CSP Discussion Topics

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

### COVERAGE SUMMARY

#### Programming Content

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

#### AP CSP Non-Coding Integration

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



## INDIVIDUAL CHAPTER ASSESSMENTS

> Added 2026-08-14. The **Ch N Test** rows have existed in Part B's calendar since the rebuild, but only
> as a one-line definition with no spec. This section is that spec.

Every **content** chapter ends with a two-meeting assessment block: the **paired Group PA first, then
the individual Test.** The four **synthesis** chapters (4, 7, 10, 13) deliberately have neither — the
project *is* the assessment, and it is graded individually even when built in a team.

> **Group PA before Test, always.** Students work the chapter's material collaboratively before being
> assessed on it alone, so the group assessment doubles as the review session for the individual one —
> the same order the Intro Stats calendar uses. A student who discovers a gap during the Group PA has
> one meeting to close it. Reversing the order wastes that.

| Chapter | Group PA (1st) | Individual Test (2nd) | Notes |
|---|:---:|:---:|---|
| 1 Foundations | ✅ | ✅ |   |
| 2 Control Flow | ✅ | ✅ |   |
| 3 Functions and Data | ✅ | ✅ |   |
| 4 Print Shop | — | — |  Synthesis; project is the assessment  |
| 5 shPlay Foundations | ✅ | ✅ |   |
| 6 Game Mechanics | ✅ | ✅ |   |
| 7 Arcade Cabinet | — | — |  Synthesis  |
| 8 JSCAD Foundations | ✅ | ✅ |   |
| 9 3D Modeling | ✅ | ✅ |   |
| 10 Fits-My-Stuff | — | — |  Synthesis  |
| 11 Advanced Modeling | ✅ | ✅ | **One shared block with Ch 12** — see below |
| 12 Production Pipeline | ↑ | ↑ | Assessed together with Ch 11; no separate PA or Test |
| 13 Mechanism | — | — |  Synthesis; primary SLO 3 evidence for Semester 2  |

**8 individual chapter tests and 8 paired group PAs.** Every content chapter is assessed; Chapters
11 and 12 share a single block.

> **Ch 11 + Ch 12 share one assessment block (2026-08-14).** Ch 12 is the smallest content chapter
> in the book (465 lines) and Ch 11 the second smallest (951); separately they spent 4 meetings
> assessing 1,416 lines, while Ch 8 assesses 2,525 lines on one block. Merged they remain smaller
> than Ch 8 or Ch 9. Book section IDs are unchanged — this is an assessment merge, not a renumber.

> A 2026-08-14 revision briefly dropped the Group PA on Ch 3, 6, 9 and 12 on the theory that the
> synthesis chapter immediately following each one was itself a group performance assessment. That
> was wrong: **the Group PA is a paired assessment and the synthesis project is assessed
> individually**, so they measure different things and neither substitutes for the other. Reverted.

### Common format (identical across all nine — students should never be surprised by the shape)

- **~50 minutes**, one class meeting. The remaining period time is the next chapter's first lesson.
- **Individual, closed book, closed laptop.** A **printed one-page syntax reference** is supplied with
  every test (the relevant subset of Appendix A's style guide plus bare method signatures). Beginners
  should be assessed on whether they can reason, not on whether they memorized argument order.
- **No retake penalty on the first retake.** One equivalent alternate form, within two weeks, replaces
  the original score. This matches the green-to-advance model used for lessons: the goal is evidence of
  mastery, not evidence of when mastery arrived.

| Part | What it is | Weight |
|---|---|---:|
| **A — Vocabulary and concepts** | ~6 short-answer items. "What is X and when would you use it?" | 25% |
| **B — Trace the code** | ~4 snippets; predict the exact output. No writing, only reading. | 25% |
| **C — Find and fix** | ~3 short broken programs; identify the bug, name its type (syntax / runtime / logic), fix it. | 20% |
| **D — Design it, then write it** | **D1:** hand-draw a flowchart for the stated problem. **D2:** write the 1–2 functions or snippets it describes. | 30% (10 / 20) |

Part B is deliberately as heavy as Part D. Intro students who can only write and never read produce
code they cannot debug; tracing is the skill that generalizes.

**Part D is charted before it is coded, on every test** (Appendix D §D.1) — the same order the whole
course uses, so the test rehearses the habit rather than suspending it. Three consequences worth
stating plainly:

- **D1 is hand-drawn on paper.** Tests are closed-laptop, so the in-app checker isn't there. Grade D1
  against the same eight checks by eye; the printed syntax reference includes the shape table.
- **D1 is graded even when D2 is wrong.** A correct design with a botched implementation is a
  different failure from no design at all, and the split marks make that visible — which is exactly
  the diagnostic a teacher needs when deciding what to reteach.
- **D2 is graded against the problem, not against D1.** A student who charts one approach and codes a
  better one loses nothing. Only a *blank* D1 costs the 10.

### Per-chapter blueprints

Each blueprint lists what the test assesses and, just as importantly, **what it may assume** — so a
test never silently depends on a section taught in a later chapter.

**Ch 1 Test — Foundations** (§1.1–1.5) · *SLO 1*
Lifecycle stages in order and what happens in each; variable declaration and the primitive data types;
why naming conventions and comments exist (evaluated on a supplied snippet, not recited); the
difference between two paradigms and why a language is chosen for a job; reading a supplied flowchart
and writing short pseudocode. **Part D is pseudocode and a flowchart, not JavaScript** — students have
not yet written conditionals, so D1 is the chart and D2 is pseudocode for the same problem. **Only the
book's three shapes — oval, rectangle, diamond** (Appendix D §D.2). This test mirrors book exercise
1.5.11, which asks for exactly three; the parallelogram is a shCode addition and must not be required
here even though the editor offers it. **Assumes:** nothing prior.

**Ch 2 Test — Control Flow** (§2.1–2.5) · *SLO 2, SLO 3*
`if`/`else if`/`else`; comparison and logical operators, including the truthiness traps; `for` vs
`while` and when each fits; `switch` with correct `break` placement and one fall-through question;
`break`/`continue`; one nested-loop trace (Part B) and one nested-loop write (Part D); a `try`/`catch`
around code that throws. **Assumes:** Ch 1 variables and types.

**Ch 3 Test — Functions and Data** (§3.1–3.8) · *SLO 2, SLO 3*
Function definition vs call; parameters vs arguments vs return value, and what a function with no
`return` evaluates to; array indexing, `.length`, iteration; arrow-function syntax converted both
directions against a `function` declaration; object literal access with both dot and bracket notation;
**pass-by-value vs pass-by-reference — at least one Part B trace where a function mutates a passed
object**; `.map`/`.filter`/`.slice` on a supplied array; `JSON.stringify`/`parse` round-trip.
**Assumes:** Ch 1–2. This is the heaviest test of Q1 and the last gate before the Print Shop project.

**Ch 5 Test — shPlay Foundations** (§5.1–5.4) · *SLO 2, SLO 3*
`setup()` vs `draw()` and what belongs in each; creating a sprite and moving it by velocity vs by
position; what `bounciness`, `friction` and `drag` each change (predict the behavior, don't recite the
number); **class vs instance vs property vs method as vocabulary**, then writing a small class with a
constructor and one method. **Assumes:** Ch 1–3, especially objects (§3.5). **Does not assume** groups
or collisions — those are Ch 6.

**Ch 6 Test — Game Mechanics** (§6.1–6.9) · *SLO 3*
Groups and why iterating a group beats tracking sprites individually; `overlaps` vs `collides` and what
each does to motion; reading a supplied collision callback and predicting the score change; one
animation/camera question; `storeItem`/`getItem` and choosing what state is worth saving; **drawing or
completing a game state machine** given three states; one `setTimeout`/`setInterval` question including
why the interval must be cleared. **Assumes:** Ch 5, and §3.7 array methods for the group iteration.

**Ch 8 Test — JSCAD Foundations** (§8.1–8.5) · *SLO 2, SLO 3*
What a library is and what `require` returns; the coordinate system and its origin; `translate`,
`rotate`, `scale` applied to 2D shapes, including one question where **order of operations changes the
result**; `union`/`subtract`/`intersect` predicted on a supplied pair of overlapping shapes;
`getParameterDefinitions` — write a parameter block for a stated design; a `for` loop producing an
array of positioned shapes. **Assumes:** Ch 2–3 (loops, arrays). **Everything is 2D** — extrusion is
Ch 9.

**Ch 9 Test — 3D Modeling** (§9.1–9.4) · *SLO 3, Topic: testing*
`extrudeLinear` on a known 2D profile and what the resulting solid looks like; the 3D primitives and
which is right for a stated part; transforms on the third axis; **naming the three error types**
(syntax / runtime / logic) against supplied examples; writing input validation that throws for an
invalid dimension; what makes a good test case and choosing test data for a stated function, including
at least one boundary value. **Assumes:** Ch 8.

**Ch 11–12 Test — Advanced Modeling and Production** (§11.1–12.2) · *SLO 3*
One combined test over five sections — the last test before the capstone, and deliberately weighted
toward what the capstone needs.
*From Ch 11:* when a hull is the right tool versus a boolean; measuring a supplied model and stating
whether it is printable; **tolerance — given a hole and a peg dimension, does it fit, and what
clearance is needed**; tracing a sort over an array of part objects; a linear search predicate over
geometry.
*From Ch 12:* splitting a model across files — what gets exported, what gets imported, and why;
reading a supplied two-file project and predicting whether it runs; applying color and text;
**choosing an export format for a stated purpose** (printing vs sharing vs further editing) and
justifying it.
**Assumes:** Ch 8–9 and §3.7 array methods.
**Balance note:** five sections is the widest of the eight tests, so keep Part A shallow across all
five rather than deep on any one. The tolerance question and the export-format justification are the
two items that matter most for Ch 13 — protect those if the paper runs long.

## SEMESTER CLOSE — REVIEW PROJECT + FINAL EXAM

> Added 2026-08-14. Neither the review project nor the final exams had ever been scheduled; they are
> now real rows in Part B (meetings 39–42 and 88–90).

Both semesters end the same way: **a project that demonstrates the semester's work, then a final exam
the project has prepared them for.** The pairing is the point — the review project is not revision
busywork, it is the exam's own study guide in executable form, and every requirement in the project
maps to a section of the exam.

| | Semester 1 | Semester 2 |
|---|---|---|
| Covers | Chapters 1–5 | Chapters 6–13 |
| Demonstration project | **Semester 1 Review Project** — 3 meetings, Dec 10 & 14 | **§13.3 Capstone Presentations and Reflection** — 2 meetings, May 21 & 25 |
| Final exam | **Wed Dec 16, 2026** | **Tue Jun 1, 2027** |
| Exam length | ~1.5 hrs, one meeting, individual, closed book | same |

**Semester 2 reuses the capstone rather than adding a second project.** §13.3 already is a semester
demonstration, already runs two meetings, and already falls the week before the exam window. Adding a
separate review project would consume the schedule's entire remaining slack (see Part B).

---

### The Semester 1 Review Project (Chapters 1–5)

**Meetings:** 3 (Dec 10 & 14) · **Assessed:** individually · **Format:** one program, built in class

A single working program, specified as a **requirements checklist rather than a theme** — same shape as
§7.1 Arcade Cabinet, for the same reason. Students pick what the program *is*; the checklist guarantees
it exercises the semester.

**Required, and each one is a line on the exam blueprint:**

| # | Requirement | Exam section it prepares |
|---|---|---:|
| 1 | At least 3 variables with correct types, and a comment block naming each type | Part A |
| 2 | A conditional with at least 3 branches, using a logical operator (`&&` or `\|\|`) | Part A, B |
| 3 | Both loop kinds — one `for`, one `while` — and a stated reason for each choice | Part B, D |
| 4 | One nested loop that produces a 2-D result (grid, table, or pattern) | Part B |
| 5 | At least 2 functions with parameters and a `return`, called from a third | Part D |
| 6 | An array of objects, plus one array method (`.map` / `.filter` / `.forEach`) over it | Part B, D |
| 7 | One function that *mutates* a passed object, with a comment explaining why it changes the original | Part B — the pass-by-reference trace |
| 8 | Save and reload state with `JSON.stringify` / `parse` + localStorage | Part A |
| 9 | A `try`/`catch` around something that can fail, with a friendly message | Part C |
| 10 | A shPlay sprite that moves, and one class the student wrote with a constructor and a method | Part A, D |

**Deliverables:** the program, **a flowchart of it drawn on day 1 before any code** (Appendix D — all
eight checks green; this is also the last flowchart rehearsal before Part D of the final), a short
design doc (what it does, which requirement each part satisfies), and a testing log of at least 3 bugs
found and fixed with the error type named for each.

**Teacher notes:**

- **Requirement 7 is the one to watch.** Pass-by-reference is the single most common Semester 1 exam
  failure, and it is the requirement students most often satisfy by accident without understanding.
  Check the comment, not just the code.
- Day 1 is design + checklist mapping **+ the flowchart**; day 2 is build; day 3 is finish, test, and
  self-mark the checklist. Students who finish early extend rather than idle.
- **Hand back the checklist as the exam study guide on day 3.** The mapping above is not a secret — the
  entire point is that a student who completed the project honestly has already practised every exam
  question type.

### Semester 1 Final Exam — Wed Dec 16, 2026 (Chapters 1–5)

~1.5 hours, individual, closed book, printed one-page syntax reference supplied — same conventions as
the chapter tests. Same four-part structure, so nothing about the format is new:

| Part | Content | Weight |
|---|---|---:|
| **A — Vocabulary and concepts** | Lifecycle stages; data types; paradigms; class vs instance vs property vs method; what localStorage does | 25% |
| **B — Trace the code** | ~5 snippets: a 3-branch conditional, a nested loop, an array method chain, **a pass-by-reference mutation**, a shPlay `draw()` loop | 25% |
| **C — Find and fix** | 3 broken programs; name the error type (syntax / runtime / logic) and fix | 20% |
| **D — Write it** | Two problems: one function with parameters and a return; one small class with a constructor and a method | 30% |

**Every Part B and D item has a direct analogue in the review project's checklist.** If a student built
the project, they have seen each question type in their own code three days earlier.

### Semester 2 Final Exam — Tue Jun 1, 2027 (Chapters 6–13)

Same length, format and conventions. What makes this exam work is that it **draws on the student's own
capstone** rather than testing abstract ground — they present it May 21/25 and sit the exam Jun 1.

| Part | Content | Weight |
|---|---|---:|
| **A — Vocabulary and concepts** | Groups vs individual sprites; state machines; what a library is; boolean operations; the three error types; what makes a good test case; export formats and when each is right | 25% |
| **B — Trace the code** | ~5 snippets: a collision callback, a JSCAD transform chain **where order changes the result**, a parameter block, a sort over part objects, a `setInterval` | 25% |
| **C — Find and fix** | 3 broken programs, at least one a JSCAD model that produces wrong geometry rather than an error | 20% |
| **D — Write it and justify it** | One JSCAD modelling task from a stated spec, **plus two short-answer questions about the student's own capstone**: name a tolerance decision you made and why, and name one thing you would model differently now | 30% |

**Part D's capstone questions are the link back to §13.3.** They cannot be revised for in the abstract —
the preparation *is* having built and reflected on the mechanism. Students bring their reflection
document to the exam; it is the one permitted reference beyond the syntax sheet.

**Teacher note:** grade Part D's capstone answers on the quality of the engineering reasoning, not on
whether the capstone succeeded. A student whose mechanism jammed and who can explain precisely why has
demonstrated more than one whose part fit on the first try by luck.

---

### Reconciling with the existing midterm/final structure — **decision needed**

The "Exam Scheduling Notes" table below defines **6 midterms** whose coverage bands were written before
these chapter tests were specified, and they now overlap heavily — S1 Midterm 1 (§1.1–2.2) is almost
exactly Ch 1 Test plus half of Ch 2 Test. Left as-is, the course runs **8 chapter tests + 6 midterms +
2 finals = 16 individual assessments across 88 meetings**, roughly one meeting in five spent testing.

**The 6 midterms are the only assessments still absent from Part B's calendar.** Both finals are now
scheduled (meetings 41 and 89) and every chapter test and Group PA has a real date. **Part B has only
2 spare meetings**, so six midterms cannot be added — scheduling them would push the Semester 2 final
past the last day of school.

**Recommendation: retire the 6 midterms; keep the 8 chapter tests + 2 semester finals.** The chapter
tests give finer-grained, more frequent individual evidence at the natural content boundary, they are
already scheduled against real dates, and the two cumulative finals still satisfy the Butte outline's
requirement that mid-term and final examinations both be represented — the chapter tests *are* the
mid-term examinations, just distributed. That would put individual assessment at **10 meetings, not 16**.

This is a curriculum-author decision and is **not applied** — the midterm table below is unchanged. If
it is adopted, the grading weights immediately below need the reallocation noted there. If it is
rejected, six meetings have to be found, and Part B's capacity note lists where they could come from.

---

## GRADING STRUCTURE (Suggested)

| Category | Weight (as written) | Weight if midterms are retired |
|----------|--------|--------|
| Weekly Lab Assignments | 25% | 25% |
| Written Assignments | 10% | 10% |
| Quizzes (multiple, scattered per section) | 5% | 5% |
| **Individual Chapter Tests (8 total)** | **—** | **15%** |
| Midterm Exams (6 total) | 15% | *retired* |
| Final Exams (2 total) | 10% | 10% |
| Q1 Synthesis (§4.1 Print Shop) | 5% | 5% |
| Q2 Synthesis (§7.1 Arcade Cabinet capstone) | 15% | 15% |
| Q4 Synthesis (§13.1–13.3 Mechanism capstone + presentation) | 15% | 15% |

> **Second column added 2026-08-14, not adopted.** It shows the weights if the "retire the 6 midterms"
> recommendation in **Individual Chapter Assessments** above is taken: the midterms' 15% transfers
> intact to the 8 chapter tests, so no other category moves and both columns still total 100%.
>
> **Note:** Quizzes, midterms, and finals are required evaluation methods per the Butte College CSCI 4 course outline. All four evaluation categories (quizzes, homework, lab projects, mid-term and final examinations) must be represented in grading. Under the second column the chapter tests serve as the distributed mid-term examinations; the two cumulative finals are unchanged.
> **Category name updated 2026-08-14** — "8 total" quizzes removed since the exact count shifted with the renumber (quizzes now sit at §1.3, §2.3, §8.3, §8.4, §9.2, §9.4, §11.1, §12.2); recount once Part B's pacing question is settled.

### Exam Scheduling Notes

Exam weeks still include regular content. Plan for the exam to occupy the first class meeting (~1–1.5 hours), with remaining time for new content or project work.

> **Overlap warning, 2026-08-14.** The six midterms below predate the per-chapter individual tests now
> specified in **Individual Chapter Assessments**, and their coverage bands substantially duplicate
> them. **None of the six appear in Part B's calendar, and only 2 spare meetings exist.** The two
> semester finals in the same table ARE scheduled (Dec 16 and Jun 1). Read the
> reconciliation recommendation above before scheduling any of the midterms.

| Exam | Covers | Scheduling Guidance |
|------|------|-------------------|
| S1 Midterm 1 | §1.1–2.2 | Exam first day, remaining content second day |
| S1 Midterm 2 | §1.1–3.8 (cumulative) | Exam first day, synthesis project work fills remaining time |
| S1 Midterm 3 | §5.1–6.3 (shplay foundations, physics, OOP, groups, physics applications) | — |
| **S1 Final** | **Chapters 1–5 (cumulative)** — corrected 2026-08-14 | **SCHEDULED: Wed Dec 16, 2026** (meeting 41). Preceded by the 3-meeting Semester 1 Review Project, Dec 10–14. Full blueprint in **Semester Close** above |
| S2 Midterm 1 | §8.1–8.4 (JSCAD libraries, 2D, booleans, parameters) | — |
| S2 Midterm 2 | §8.5–9.4 (loops→geometry, extrusion, 3D primitives, error handling, testing) | — |
| S2 Midterm 3 | §10.1–12.2 (Fits-My-Stuff synthesis, hulls, measurements, sort/search, multi-file, colors/export) | Now fully duplicated by the single Ch 11–12 Test (Apr 29) |
| **S2 Final** | **Chapters 6–13 (cumulative)**, with selected Semester 1 fundamentals — corrected 2026-08-14; Semester 2 opens at Chapter 6 | **SCHEDULED: Tue Jun 1, 2027** (meeting 89). Preceded by §13.3 capstone presentations, May 21–25. Part D draws on the student's own capstone — see **Semester Close** above |

---

## SLO COVERAGE FINAL VERIFICATION

| SLO / Topic | Covered By | Assessment Artifact |
|-------------|-----------|-------------------|
| SLO 1: Software lifecycle | §1.1 lecture (A1.1.1), §7.1 Arcade Cabinet capstone, §13.3 closing reflection | A1.1.1 written (intro), A13.3.2 written (closing) |
| SLO 2: Structured programming / OOP | §1.2–1.3, §5.3–5.4 (shplay OOP), A5.4.2, S1 Final, S2 Final | A5.4.2 written (primary), exam questions (backup) |
| SLO 3: Design, implement, test programs | A4.1.1 (Print Shop synthesis), A7.1.1 (Arcade Cabinet capstone), A13.3.1 (Mechanism capstone) | All major projects |
| SLO 4: Algorithms | §2.2, A2.2.1 (intro), A11.3.1 (applied) | A2.2.1 written (intro), A11.3.1 lab (applied) |
| Data types / variables | §1.2, A1.2.1, A1.2.2 | Lab assignments |
| Arrays | §3.3 (intro), §6.1–6.2 (shplay groups), §8.5 (JSCAD loops→geometry) | A3.3.1, A6.2.1, A8.5.1 |
| Control structures | §2.1–2.5 (core, incl. switch and try/catch now dedicated sections), applied §6.3–6.8 (shplay mechanics) | Lab + quiz |
| Algorithms: sort/search | §11.3, A11.3.1 | A11.3.1 lab + A11.3.2 written |
| File I/O | §3.8 (JSON/localStorage — **RE-OPENED gap on the literal "sequential access" phrase**, see Part A), §6.5 (shplay save/load), §12.1 (JSCAD multi-file) | A3.8.1 lab, A6.5.1 lab, A12.1.1 lab + A12.1.2 written |
| Error handling | §2.5 (intro), §9.3 (deepened), A9.3.1 | A9.3.1 lab |
| Pass by value/reference | §3.6, A3.6.1, A3.6.2 | A3.6.2 written |
| Testing principles | §9.4, A9.4.1 | A9.4.1 lab + A9.4.2 written |
| Documentation | §1.3, enforced throughout | A1.3.1, inline in all projects |
| Coding conventions | §1.3, enforced throughout | Style guide rubric |
| OOP vs procedural | §5.3–5.4, A5.4.2, S1 Final, S2 Final | A5.4.2 written (primary), exam questions (backup) |

---

## SOURCE ALIGNMENT (open references per chapter)

The per-chapter reading map is **seeded from the full table of contents** in [`js-references-toc.md`](js-references-toc.md)
as the single source of truth for the seven open references:

- **JS1** → *The Modern JavaScript Tutorial* (javascript.info, Ilya Kantor, CC-BY-SA)
- **JS2** → *Eloquent JavaScript* (Marijn Haverbeke, CC-BY-NC, code MIT)
- **PY** → *Introduction to Python Programming* (OpenStax, CC BY-NC-SA) → structural model; Python syntax translated to JS
- **shplay** → in-app docs at `/docs/shplay` (bundled `public/shplay/`, MIT facade + MIT planck.js, built from the public `shplay.d.ts` API) + in-repo docs at `public/shplay/docs/` + q5.js learn pages (LGPL-3.0) for graphics-layer concepts. The engine is an original MIT-licensed reimplementation of the q5play API design — no q5play license obligations
- **JSCAD** → in-app docs at `/docs/jscad` + in-repo docs at `public/jscad/docs/` + external API docs (openjscad.xyz, MIT) + GitHub monorepo `github.com/jscad/OpenJSCAD.org` → CDN-loaded, lessons need internet
- **freeCodeCamp** → the Q1 content platform — week-by-week mapping in `curriculum-alignment-guide.md`, full activity list in `curriculum-data/master-activity-list.md`
- **jscadui / jscad.app** → the Q3–Q4 JSCAD browser environment (`github.com/hrgdavor/jscadui`, MIT)

To seed a chapter/section/subsection, pull the matching **JS1/JS2/PY → chapter/section** or
**shplay → section → page** / **JSCAD → module → function** anchor from `js-references-toc.md`
and drop it into that section reading/source row. Anchor notation: `JS1 → Fundamentals → Variables` ·
`shplay → sprite → Your first sprite` · `JSCAD → extrusions → extrudeLinear`. Do **not** duplicate the TOC here.

**Updated 2026-08-14** to match the book-native renumber — chapter numbers below now match this
document's own §-IDs directly (Chapter N = book Chapter N), so the old "(W1→3)"-style week-range
parentheticals are removed rather than left stale; see Part B for real dates, still pending the
capacity decision.

- **Chapter 1** Foundations: JS1 Fundamentals; JS2 Ch 1→2; PY Ch 1→2; OpenStax CS Ch 1, Ch 9, Ch 3, Ch 7
- **Chapter 2** Control Flow: JS1 Comparisons/Conditionals/Loops/switch/try-catch; JS2 Ch 2; OpenStax CS Ch 3
- **Chapter 3** Functions and Data: JS1 Functions/Objects/Arrays/Array methods/JSON+LocalStorage (NOT File/FileReader — see §3.8's realignment note); JS2 Ch 3→4
- **Chapter 4** Q1 Synthesis (Print Shop): openstax_cs Ch 9 (SDLC framing); reviews all of Ch 1-3
- **Chapter 5** shPlay Foundations: shplay in-app docs; JS1 Functions, Classes; JS2 Ch 6
- **Chapter 6** Game Mechanics: shplay docs; JS1 Arrays/JSON methods + LocalStorage, Timing (setTimeout/setInterval); JS2 Ch 4, Ch 18
- **Chapter 7** Q2 Synthesis (Arcade Cabinet): shplay ch 8; JS2 Ch 16, Ch 8 (testing discipline); reviews all of Ch 5-6
- **Chapter 8** JSCAD Foundations: JS1 Modules; JS2 Ch 10; JS1 Functions/Arrays, JS2 Ch 5 (map), (parametric)
- **Chapter 9** 3D Modeling: JSCAD API docs; JS1 Error handling + Debugging + Mocha testing; JS2 Ch 8
- **Chapter 10** Q3 Synthesis (Fits-My-Stuff): no reading — synthesis build; reviews Ch 8-9
- **Chapter 11** Advanced Modeling: JS1 Array methods (sort); JS2 Ch 5; OpenStax CS Ch 3 (sort/search backing §11.3)
- **Chapter 12** Production Pipeline: JS1 Modules; JS2 Ch 10 + Ch 20 Node fs
- **Chapter 13** Q4 Synthesis (Mechanism capstone): JS2 Ch 8 (design mindset); OpenStax CS Ch 14, Ch 1 (digital divide / computing bias for §13.2-13.3); no reading for §13.3

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
- **Every graded build artifact gets a paired flowchart lesson, and it must be numbered FIRST.** Lessons
  unlock sequentially within a module (`functions/_shared/lessonAccess.ts`, server-enforced), so
  `2-2-11-flowchart-…` before `2-2-12-challenges` *is* the gate — the same two lessons in the other
  order is a suggestion with no teeth. Getting the numbering wrong is the one authoring mistake that
  silently voids Appendix D.
- Flowchart lessons use `preview: "diagram"` with a `diagram` block in `lesson.json`
  (`starter` as Mermaid, `rules` omitted to inherit `DEFAULT_RULES`, optional `aiGrader`), **`points: 0`**
  like every other lesson, and a `starter` that is a *scaffold* — a Start oval and an End oval, never a
  worked chart the student only has to rearrange
- Release shapes on schedule (Appendix D §D.2). A starter or rubric must not use a shape from a later
  section: no hexagon before §2.2, no `[[ ]]` before §3.1, no connectors or notes before §4.1
- Print milestone assignments (starting §9.1 First Extrusion) should include a print checklist section

### Priority build order for assignments:
1. **Q1 assignments first** (A1.1.1 through A4.1.1) — prerequisites for everything
2. **Q2 shplay assignments** (A5.1.1 through A7.1.1) — needed for the Arcade Cabinet capstone
3. **SLO coverage assignments** (A5.4.2 OOP written, A6.5.1 file I/O, A9.3.1 error handling, A9.4.1 testing, A11.3.1 sort/search) — required for dual-enrollment SLO documentation
4. **Q3 JSCAD foundations** (A8.1.1 through A9.4.3, A10.1.1 Fits-My-Stuff)
5. **Q4 advanced JSCAD + capstone** (A11.1.1 through A13.3.2)
6. **Major capstones** (A7.1.1 Arcade Cabinet, A13.3.1 Mechanism) — scaffolded by all preceding assignments

---

## APPENDIX A: CLASS CODING STYLE GUIDE

This is the grading rubric for code style, distributed in §1.3 (Documentation and Coding Conventions) and enforced for all assignments thereafter. Print this as a 1-page handout. Its companion is **Appendix D: Flowchart Convention**, issued two sections later in §1.5 — this one governs the code, that one governs the design that precedes it.

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
- Assign students to printer groups of 3 at §9.1 (first print milestone — A9.1.1 / A9.1.2 extrusion lab).
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
- Use A1.3.3 quiz (§1.3) and A2.1.2 quiz (§2.1) results to identify students struggling with fundamentals.
- S1 Midterm 1 (§1.1–2.2) is the first formal checkpoint. Students scoring below 60% should be flagged for intervention.
- Track quiz and midterm scores across the semester to identify trends.

### Catch-Up Opportunities
- **§4.1** (Print Shop Synthesis): built-in review project. Use midterm results to target review topics.
- **§6.3** (Physics Applications): consolidation week, no brand-new concepts. Use it to rescue students lagging on §5.1–5.4.
- **§7.1** (Arcade Cabinet capstone): entire build window is supervised work time — easy to fold catch-up sessions in.
- **§11.2** (Measurements): light content; use extra time for print queue rotation and individual help.
- **§12.2** (Colors/Text/Export): light content; last checkpoint before capstone design begins.

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
If a student falls behind, prioritize catching up on these gateway topics — everything downstream depends on them. **Updated 2026-08-14** to book-native `§chapter.section` IDs; real dates are pending Part B's capacity decision, so this map is ordered by curriculum sequence, not by week number.

```
§1.2 Variables → §2.1 Conditionals → §2.2 Loops → §3.1-3.2 Functions → §3.3 Arrays
                                                                          ↓
                                    §5.1 shPlay Intro → §5.3-5.4 OOP → §6.5 Save / §6.6 States → §7.1 Arcade Cabinet
                                                                          ↓
                     §8.1 JSCAD Intro → §8.3 Booleans → §9.1 Extrusion → §11.1+ Advanced → §13.1-13.3 Mechanism
```

A student who doesn't understand functions (§3.1–3.2) cannot succeed in shplay OOP (§5.3–5.4) or JSCAD. Catch this before §3.6 (Pass by Value/Reference) at the latest.
A student who hasn't grasped classes by §5.4 will struggle through the rest of Q2 — flag them before §6.1 (Groups) and keep them in re-submission loops on A5.4.1.

---

## APPENDIX D: FLOWCHART CONVENTION

> Added 2026-08-15, when the in-app flowchart editor shipped. Before this, "draw a flowchart" appeared
> in §1.5 and then nowhere else with any teeth — students drew one on day six and never again, which is
> the failure mode §1.5's own teacher note warns about ("reference it explicitly in later sections").
> This appendix is that reference, and the editor is what makes it enforceable rather than aspirational.

This is the grading rubric for flowcharts and the companion to **Appendix A**. Distributed in **§1.5
(Program Design Tools and Environments)**, enforced on every graded build artifact thereafter. Print
it as a 1-page handout next to the style guide.

### D.1 The rule — design before code

**Every graded build artifact opens with a flowchart, and the flowchart is submitted before the code
is.** Not alongside. Before.

| Artifact | Where the flowchart lives | Weight |
|---|---|---|
| **Challenge / Lab** (in-app `A<ch>.<sec>.<n>`) | Its own lesson immediately *preceding* the coding lesson. The coding lesson is locked until the flowchart is green. | Pass/fail gate, 0 pts (green-to-advance) |
| **Ch N Group PA** (paired) | The *design* third of design → build → demo. Drawn by the pair together, on one screen, before either partner types code. | 25% of the PA |
| **Ch N Test** (individual) | **Part D's opening item** — flowchart the solution, then write the code for it. Ch 1's Part D is flowchart-and-pseudocode only, since conditionals have not been taught yet. | ~1/3 of Part D |
| **Synthesis Project** (§4.1, §7.1, §10.1, §13.1) | A required deliverable of the design doc, reviewed on design-review day, **before build days begin**. | 10% of project grade |

Three reasons this is a gate and not a suggestion:

1. **It is the only place SLO 1 and SLO 3 are visible as a *process*.** A finished program is evidence
   the student can code; a flowchart dated before the code is evidence they can *design*. Butte's
   outline asks for both.
2. **It is the cheapest debugging a beginner will ever do.** A missing `else` branch costs thirty
   seconds to spot on a diagram and forty minutes to spot in code they have already grown attached to.
3. **It cannot be bluffed after the fact.** A flowchart submitted after working code is a transcript,
   not a plan, and reads exactly like one.

### D.2 Shape vocabulary and release schedule

Eight shapes, no more. The editor shows the starter four; the other four sit behind **+ more shapes**
and are introduced in the section that needs them. A shape not yet released may not appear on a test
or a required deliverable.

| Shape | Mermaid | Means | Released at |
|---|---|---|---|
| Oval — `terminal` | `A([Start])` | The one place the program begins; the place it finishes | §1.5 |
| Rectangle — `process` | `A[do it]` | Something the program *does*: set, calculate, print | §1.5 |
| Diamond — `decision` | `A{age >= 18}` | A yes/no question. Exactly two exits | §1.5 |
| Parallelogram — `io` | `A[/get the age/]` | Something in, or something out | §1.5 |
| Hexagon — `preparation` | `A{{i = 0 to 9}}` | Loop setup: the counter, its start, its limit | §2.2 (with `for`/`while`) |
| Double-rail — `subroutine` | `A[[drawScore()]]` | Call a function defined elsewhere; flow comes back | §3.1 (with functions) |
| Circle — `connector` | `A((A))` | A jump. Two circles with the same letter are one point | §4.1 (first chart to outgrow a page) |
| Bracket — `comment` | `A>a note]` | A note to the reader. Sits beside the chart, takes no arrows | §4.1 |

**Do not invent shapes.** Document, manual-input, display and database symbols are systems-analysis
notation this course never touches; a student reaching for one has almost always mis-sized a `process`
rectangle instead.

> **How much of this the book actually supports** (checked against bookSHelf's remastered chapters,
> 2026-08-15). Book Table 1.5.2 teaches **three** shapes — oval, rectangle, diamond. The parallelogram
> is not in the book at all, and the word "flowchart" does not appear anywhere in Chapters 2–13:
> §1.5 is the book's entire flowchart coverage.
>
> **Everything past the first three shapes, and every flowchart after §1.5, is a shCode extension.**
> That is a deliberate choice, not an oversight — the book's own §1.5 sells flowcharts as the tool you
> reach for "when a piece of logic gets tangled enough that you cannot hold it in your head", and then
> never asks for one again, which is precisely how a design habit dies in week three. But it has two
> hard consequences:
>
> 1. **Assessment must not outrun the book.** Anything graded against a book exercise stays inside the
>    three. Book exercise 1.5.11 is literally *"name the three flowchart shapes"* — a Ch 1 Test asking
>    for four is testing shCode, not the text students read.
> 2. **The reading is ours to write and ours to maintain.** `lessons/2-2-11-reading-flowchart-shapes`
>    (renumbered from `2-2-12` on 2026-08-15 so it precedes the challenges lesson and the gate
>    actually fires) has no book section behind it, so a book resync will never update it. Treat it
>    as original course material in the resync checklist, not as derived content.

### D.3 The eight structural checks (auto-graded, in-app, free)

The editor runs these in the browser the instant a student asks, and **all eight must be green before
the AI grader is called at all** — a model call is never spent on a diagram with a floating box in it.
These judge whether the drawing is a legal flowchart, never whether it solves the assigned problem.

| Check | Passes when |
|---|---|
| `one-start` | Exactly one shape has no incoming arrow, and it is an oval |
| `has-end` | At least one oval has arrows in and none out |
| `all-labeled` | No shape is blank — notes included |
| `no-orphans` | No shape floats with no arrows at all (notes exempt) |
| `decision-two-exits` | Every diamond has exactly two arrows leaving it |
| `decision-labeled` | Every arrow out of a diamond carries a label (any non-empty text — see below) |
| `connector-pairs` | Every connector letter appears exactly twice |
| `reaches-end` | Following arrows from Start reaches every shape and finishes at an End oval |

Two shapes are not ordinary flow nodes and the checker collapses the graph before any rule runs: a
**note** is dropped (otherwise it reads as a floating shape *and* as a second start), and **connectors
sharing a letter merge into one point** (otherwise everything after a jump is reported unreachable —
failing exactly the charts connectors exist to make readable).

Assignments may add `min-decisions`, `min-process`, `min-nodes` or `no-self-loop` in `lesson.json`.
Those are per-assignment floors, not part of the convention.

> **`decision-labeled` checks that a label exists, not what it says** — deliberately, decided
> 2026-08-16. The rule tests `!(e.label ?? '').trim()` and nothing more, so `yes`/`no`,
> `true`/`false`, `over 18`/`under 18` and a typo all pass. An earlier version of this row claimed
> the checker enforced `yes` or `no`; it never has.
>
> Kept lenient because `true`/`false` and a restated condition are legitimate flowchart labels, and
> a checker that reddened them would be teaching a house style as though it were the notation.
> **`yes`/`no` remains the class convention** — it is what every worked example uses and what the
> on-screen message advises — it is simply graded by eye under D.4 rather than by the rule.
>
> Do not "fix" this by tightening the rule later. Charts that were green when submitted would turn
> red retroactively, which is the one thing a pass/fail gate must never do.

### D.4 What the checker cannot see — graded by eye

A chart can pass all eight checks and still be unreadable. These are the human half:

- **Top to bottom, always.** The main path runs down the page. A chart read left-to-right is wrong even
  if it is connected correctly.
- **`yes` continues down, `no` goes right.** The answer that carries the story forward stays on the
  spine; the exception branches out. Labels are lowercase `yes` and `no` — not `true`/`Y`/`✓`.
  **This is the bullet the checker leaves entirely to you**: `decision-labeled` only tests that a
  label exists, so `true`/`false` goes green and only a reader will catch it (see D.3).
- **Ovals say exactly `Start` and `End`.** Nothing else.
- **Task labels are imperative English, six words or fewer.** `add the score`, not `score = score + 1`
  and not `the program will then add one to the score`. **A label that is code is a defect** — the
  flowchart exists precisely to be language-independent.
- **Diamonds hold a question, not a statement.** `age >= 18` or `is it a school day?` — a condition a
  reader can answer yes or no to.
- **A loop's return arrow leaves the bottom of the loop body and re-enters at the hexagon** (or at the
  decision guarding the loop), never mid-body.
- **Arrows do not cross where a connector would do.** Two crossings is a chart; five is a knot — use a
  connector pair.

### D.5 Scope — how much detail

**One shape per step a reader could get wrong, not one shape per line of code.** Setting up three
variables is one rectangle. A five-line calculation the student had to think about is one rectangle.
A branch is always its own diamond.

- **Target 6–15 flow shapes.** Under 6 and the chart isn't earning its place; over 20 and nobody reads it.
- **Past 20, decompose.** Pull a coherent chunk into a `subroutine` shape and, if the assignment needs
  it, chart that separately. This is the same decomposition §1.5 teaches as computational thinking —
  make the connection out loud.
- **The chart must fit one page or one screen.** If it doesn't, that is the signal to decompose, not
  to shrink the font.

### D.6 Grading deductions (per violation)

| Violation | Deduction |
|---|---|
| No flowchart submitted on a graded build artifact | Code is not accepted until it is |
| A structural check still red at submission | -5 pts (the app shows every failure *before* you submit) |
| Diamond exit unlabelled, or labelled anything but `yes`/`no` | -2 pts each |
| Label is code rather than English | -1 pt each |
| Flowchart does not match the code that shipped | -5 pts |
| Over 20 flow shapes with no `subroutine` decomposition | -3 pts |
| Chart flows sideways or bottom-up | -3 pts |
| A shape from outside the eight | -2 pts each |

Re-submission follows Appendix C: labs accept corrections to 80% credit, major projects iterate in
window instead.

### D.7 Enforcement, and why the gate actually holds

The lock is not honour-system. In-app lessons unlock sequentially within a module
(`functions/_shared/lessonAccess.ts`, enforced server-side, admins and teachers exempt), so a
flowchart lesson numbered immediately before its coding lesson genuinely blocks the coding lesson
until the flowchart is `completed`. That is the whole mechanism — **numbering the flowchart lesson
first is what creates the gate.** An authoring pass that appends the flowchart lesson after the
challenge produces a requirement with no teeth.

Teacher notes:

- **Grade the flowchart on the design, not the neatness.** The editor auto-routes arrows; a student
  cannot make it ugly and should not be rewarded for making it pretty.
- **Hand back a red check as a question, not a mark.** "Your diamond has one exit — what happens when
  the answer is no?" is the entire lesson, and the app has already phrased it that way on screen.
- **Watch for the transcript tell** on projects: a flowchart whose shapes map one-to-one onto lines of
  finished code, in order, was drawn afterwards. Charts drawn first have a rectangle that says
  `work out the price` where the code has eleven lines.

### D.8 Where the in-app chart lessons are

Built 2026-08-15. Every one of these is Tier 1 or lower unless marked — structural checks only, run
in the browser, no AI call and no points. Frequency is the point, so nothing here is rationed.

| Lesson | Mode | Module |
|---|---|---|
| `1-5-2-reading-pseudocode-and-flowcharts` | figure + scratch canvas | 1.5 |
| `1-5-3-reading-the-flowchart-convention` | this appendix, as a student handout | 1.5 |
| `1-5-4-a1-5-1-flowchart-gate` | draw from a spec | 1.5 |
| `2-1-4a-chart-the-if-else` | chart the code | 2.1 |
| `2-2-2a-reading-flowchart-shapes` | recap + toolbar tour | 2.2 |
| `2-2-3a-chart-the-algorithm` | chart the code | 2.2 |
| `2-2-5-reading-for-loop` | figure — the loop drawn the long way | 2.2 |
| `2-2-6a-chart-the-for-loop` | chart the code, hexagon released | 2.2 |
| `2-2-8-reading-while-loop` | read and predict | 2.2 |
| `2-2-11-fix-the-broken-chart` | find the defect | 2.2 |
| `2-2-12-a5-2-flowchart-decision` | **Tier 2** — draw from a spec, AI-graded | 2.2 |
| `2-3-3a-chart-the-switch` | chart the code | 2.3 |
| `3-1-2a-reading-the-function-call-shape` | double-rail released | 3.1 |
| `3-1-7a-a3-1-0-flowchart-gate` | **A3.1.0** — chart before you refactor | 3.1 |
| `3-2-6a-chart-the-array-loop` | chart the code | 3.2 |
| `4-1-2a-reading-connectors-and-notes` | connector + note released | 4.1 |
| `4-1-3a-a4-1-0-design-chart` | **A4.1.0** — whole-program design, day 1 | 4.1 |
| `5-3-20a-chart-the-method-chain` | chart the code — one method, not a program | 5.3 |
| `5-3-29a-read-the-two-designs` | read and predict — procedural vs OOP, drawn | 5.3 |
| `6-5-20a-read-the-continue-chart` | read and predict | 6.5 |
| `6-6-13a-chart-the-state-machine` | chart the code | 6.6 |
| `6-6-19a-fix-the-pause-chart` | find the defect | 6.6 |
| `6-7-10a-fix-the-drag-chart` | find the defect | 6.7 |
| `6-7-21a-chart-the-slingshot` | chart the code — one frame of a many-frame gesture | 6.7 |

**Five modes, not one exercise repeated.** Draw-from-a-spec is the only mode the course had before
this, and a student who can only produce a chart from a spec has learned a drawing task. Chart-the-
code, read-and-predict and find-the-defect run the arrow the other way, which is where fluency comes
from — and read-and-predict needs no canvas at all.

**Modules with no chart lesson yet:** 1.1–1.3, 5.1, 5.2, 6.1, 6.3, 6.4. 1.1–1.3 sit before the
vocabulary exists and should stay bare. Of the rest, 6.1 (groups and overlaps) is the one with a
real chart in it — collision handling branches hard — and 5.1, 5.2, 6.3 and 6.4 are mostly
single-concept mechanics where pseudocode says it faster.

**A note on the two Q2 modules, because they are the ones that justify the whole exercise.** In 5.3
the chart is not the deliverable, the *comparison* is: the same feature drawn procedurally and with
an array of objects, so the case for classes rests on "a fourth enemy costs three shapes or none"
rather than on the word "cleaner". In 6.7 both lessons are about a gesture that spans hundreds of
frames while the chart covers one — the idle path that runs most often is the one nobody draws, and
`applyForce` sitting on the stretch path instead of the release path is the unit's most common
physics bug, obvious in a picture and invisible in the code.

**Tier 1 checks legality, not correctness.** A structurally perfect chart of the wrong algorithm
passes. That is the deliberate trade for zero cost and unlimited retries — the judgement of *logic*
happens at `2-2-12`, on the tests, and on the two graded gates. Never tell a student a green check
means a right answer, and note that each of these lessons says so itself, in its own last paragraph.
