# Butte College CSCI 4 — Course Outline Reference
## Introduction to Programming Concepts and Methodologies

> Source: [Butte College CurriQunet](https://butte.curriqunet.com/DynamicReports/AllFieldsReportByEntity/4467?entityType=Course&reportId=213)
> Created/Revised by: Sathrum, Luke | Date: 05/02/2022

---

## Course Metadata

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

## Catalog Description

This course introduces students to the fundamental concepts of programming. Students will learn about the software development life-cycle, algorithms, and the design, implementation, and testing of programs using an object-oriented programming language.

---

## Student Learning Outcomes (SLOs)

Upon successful completion, students should be able to:

| SLO | Exact Wording |
|-----|---------------|
| SLO 1 | Describe the software development life-cycle |
| SLO 2 | Describe principles of structured programming |
| SLO 3 | Describe, design, implement, and test structured programs using currently accepted methodology |
| SLO 4 | Explain what an algorithm is and its importance in computer programming |

---

## Course Content — Lecture Topics

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

## Course Content — Lab Topics

Same topics as lecture with lab-allocated hours totaling 25.50 hours.

---

## Methods of Instruction

1. Collaborative Group Work
2. Demonstrations
3. Homework — students are required to complete two hours of outside-of-class homework for each hour of lecture
4. Lecture
5. Multimedia Presentations

---

## Methods of Evaluation

1. **Quizzes**
2. **Homework**
3. **Lab Projects**
4. **Mid-term and final examinations**

---

## Assignment Examples (from course outline)

### Reading Assignments
- Read section on loops; discuss infinite loop problems
- Read documentation on exception handling for programming language used

### Writing Assignments
- Write out, in detail, an algorithm for searching for a specific value in an array of integers
- Correct formatting per coding conventions and document functions

### Out-of-Class Assignments
- Design and document test data; determine if sample program passes/fails
- Design and implement a short program that opens a text file and searches for and counts the number of occurrences of a given string

---

## Required Textbooks

1. Savitch & Mock (2017). *Problem Solving with C++*, Pearson, 10th edition
2. Deitel & Deitel (2017). *C++ How to Program*, Prentice Hall, 10th edition
3. Al Sweigart (2019). *Automate the Boring Stuff with Python*, No Starch Press, 2nd edition

> **Note:** The textbook list reflects C++ and Python. This dual-enrollment section uses JavaScript as the programming language. The SLOs and topics are language-agnostic; coverage is what matters, not the specific language.

---

## Gap Analysis vs. Curriculum Plan

Items from this official outline that are **missing or underserved** in the curriculum plan:

### CRITICAL — Required by course outline, not in curriculum plan

| Gap | Outline Requirement | Curriculum Plan Status |
|-----|---------------------|----------------------|
| **Mid-term exam** | "Mid-term and final examinations" listed as required evaluation method | No midterm exists anywhere in the plan |
| **Final exam** | Same | No final exam exists anywhere in the plan |
| **Quizzes** | "Quizzes" listed as required evaluation method | Only one quiz (A4.2, Week 4). No grading category for quizzes. |
| **Sequential access files** | "File I/O including sequential access files" | W8 covers it fully — A8.2 (read) + A8.3 (write + round-trip) map open/read/write/close to browser JS (FileReader/Blob) |
| **Sequential processing** | "Data types, variables, expressions, sequential processing" | Sequential processing (step-by-step execution flow) is implicit but never named or taught as a concept |

### HIGH — Standard intro-programming topics in the outline's spirit

| Gap | Notes |
|-----|-------|
| **`do...while` loops** | "Control structures: selective and repetitive" — `do...while` is a standard repetitive structure |
| **Multiple-subscripted arrays** | Outline says "arrays including multiple-subscripted arrays" — W8 introduces 2D arrays briefly but doesn't go deep enough for 6.25 hours of lecture coverage |
| **Text file I/O program** | Out-of-class assignment example: "design and implement a short program that opens a text file and searches for and counts the number of occurrences of a given string" | A8.2 reads the file and counts/filters lines in-browser; A8.3 writes a new file (Blob download) and reads it back — the search-and-count program is fully achievable in browser JS |

### NOTES — Alignment items, not gaps

| Item | Status |
|------|--------|
| OOP coverage | Outline says "object-oriented programming language" and "procedural vs. OOP" — covered in W17 |
| Pass by value/reference | 5.00 hours in outline — W7 covers this, allocation seems proportional |
| Algorithms + sort/search | 5.00 hours in outline — W5 + W22 cover this adequately |
| Error handling | 1.25 hours in outline — W23 covers this (may be over-allocated relative to outline) |
| Testing | 2.50 hours in outline — W24 covers this adequately |
| Contact hours | Outline requires 68 total; curriculum plan provides 126 (3.5 × 36). Exceeds requirement. |

---

## OpenStax Supplementary Mapping (JavaScript core)

**Primary reference book:** *Introduction to Python Programming* (OpenStax, Das/Lawson/Mayfield/Norouzi, CC BY-NC-SA). Used as a structural model for the Q1 console sequence and converted to JavaScript. Python-specific syntax is translated (`print()`→`console.log`, `def`→`function`/arrow, `list`→array, `dict`→object); SLO/topic coverage is language-agnostic.

### Python chapters → Q1 console sequence (A1.1–A9.1)

| Python ch. | Title | Maps to | Status |
|---|---:|---|---|
| 1 | Statements (IO, variables, strings, numbers, error messages, comments) | W1–3 Foundations (1.1) | **Adopt** — includes a dedicated "Error messages" section worth folding into W1 as its own lesson |
| 2 | Expressions | W2–3 (operators, types) | Adopt |
| 3 | Objects | W2 variables (object/ref preview) | Adopt as a preview only — value-first ordering retained |
| 4 | Decisions | W4 Conditionals | Adopt |
| 5 | Loops | W5 Algorithms + Loops | Adopt (incl. `do...while`) |
| 6 | Functions | W6 Functions | Adopt |
| 7 | Modules | W19 JSCAD libraries | Defer — libraries taught in JSCAD context |
| 8 | Strings | W2–3 string methods | Adopt |
| 9 | Lists | W8 Arrays (incl. multiple-subscripted) | Adopt |
| 10 | Dictionaries | — | **Excluded** — not in the CSCI 4 outline or SLOs |
| 11 | Classes | W12 OOP (q5play) | Borrow framing only — q5play-grounded OOP retained over abstract OOP |
| 12 | Recursion | — (W30 optional enrichment) | Optional, not assessed |
| 13 | Inheritance | W12 (named, not required) | Name only |
| 14 | Files | W8 File I/O, W16 q5play save, W31 JSCAD multi-file | Adopt concept — browser FileReader replaces Python `open()` |
| 15 | Data Science | — | Excluded — out of CSCI 4 scope |

### Excluded Python content
- **Ch 10 Dictionaries** — no outline/SLO requirement.
- **Ch 15 Data Science** — belongs to *Principles of Data Science*, not CSCI 4.
- **Ch 12 Recursion / Ch 13 Inheritance** — beyond scope; handled as optional enrichment / q5play context.

### Gap coverage the Python book helps close
The outline's required topics that the book covers directly and the plan under-serves:
- **`do...while` loops** (Ch 5) — "Control structures: selective and repetitive"
- **Multiple-subscripted arrays** (Ch 9) — "Arrays including multiple-subscripted arrays" (6.25 hrs)
- **Sequential access files** (Ch 14) — "File I/O including sequential access files" (open, read line-by-line, write, close)

---

## Open-Source JavaScript References

Two free, open-source JS references supplement the plan. Both are read-in-the-browser resources that pair with the OpenStax structural model above — the Python book sets the Q1 chapter sequence; these supply the JS-native syntax, examples, and depth for each topic.

### Primary: The Modern JavaScript Tutorial (javascript.info)
Ilya Kantor. Open source (CC-BY-SA), free online. Modern, comprehensive, beginner-appropriate progression. Covers essentially the entire CSCI 4 outline in JS-native form.

### Secondary: Eloquent JavaScript (Haverbeke)
CC-BY-NC (code MIT), free online + free PDF/EPUB. Strong narrative prose with project chapters (robot, platform game, pixel editor). Best for motivated readers and optional enrichment; not the primary text.

**Note:** *You Don't Know JS Yet* (Simpson, CC-BY-NC-ND) was considered but **excluded** — it is an advanced deep-dive into language internals (scope, closures, `this`), not an intro text.

### javascript.info sections → outline gap coverage

| Outline gap / underserved topic | javascript.info section |
|---|---|
| File I/O — sequential access files (FileReader, line-by-line) | [Binary data, files](/binary) → File and FileReader |
| Error handling (1.25 hr outline topic) | [Error handling](/error-handling) → try...catch, custom errors |
| Testing principles (W27) | [Code quality](/code-quality) → Automated testing with Mocha |
| Debugging (W26) | [Code quality](/code-quality) → Debugging in the browser |
| Multiple-subscripted arrays | [Arrays](/array) + [Array methods](/array-methods) |
| JSON / serialization (W16 q5play save) | [JSON methods, toJSON](/json) |
| LocalStorage / persistence (W16) | [Storing data in the browser](/data-storage) → LocalStorage |
| Async / preload (W16 loadJSON) | [Promises, async/await](/async) → callbacks intro |
| DOM / browser events (if HTML is added) | [Document](/document) + [Introduction to Events](/events) |

### Unresolved constraint
Browser JS cannot `open/write/close` sequential-access files the way C++/Python can. javascript.info's FileReader section is the closest fit, but true sequential file write is an inherent client-side limitation — a curriculum-design constraint to address separately (e.g., a `download`/Blob approach or server-side Pages Function), not a resource gap.
