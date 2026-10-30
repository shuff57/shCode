# apcsacortado (AP CSA, Java) -> shCode disposition

Read 2026-10-30 from the public pages `codehs.com/course/apcsacortado/explore` (course 22971) and each of the 61 lesson pages (all fetched with curl; nothing unreachable). Titles and activity names only; no CodeHS text, problems or code is reproduced. Companion to `CODEHS-MAP.md`, `CODEHS-SEEDING.md`, `CODEHS-INSPIRATION.md`.

Modules: 1 Using Objects and Methods (17 lessons), 2 Selection and Iteration (14), 3 Class Creation (11), 4 Data Collections (19). Total 483 activities.

**Headline findings**
- There is no inheritance, polymorphism or interface lesson anywhere in this course. The only trace is a "Class Hierarchy" note inside 1.12 (activity 1.12.7). Module 4 is Data Collections, not inheritance. This course therefore gives no evidence for `extends`/`super` in the OOP game units.
- Destinations use today's ids (5.6 = use, 5.7/5.8 = write) with the planned Unit 6 / Unit 7 split in parentheses.
- Activity key: V video, Ex example, E exercise, CFU check for understanding, FR free response, N notes, IN interactive notes, A article, Ch challenge, Q unit quiz. Counts follow the letter. 16 exercises are named "Debugging:" and 55 "Exploration:".

## 1. Disposition table (one row per lesson)

| id | title | activity kinds | destination | fit | note |
|---|---|---|---|---|---|
| 1.1 | Introduction to Algorithms, Programming, and Compilers | V4 FR2 CFU2 E4 Ex2 | 1.5 (pseudocode, reading errors) + 1.4 | Partial | Algorithm-as-steps and a first run/read-the-error loop; the compile step has no JS counterpart. ASCII-art print lab is a cheap first console task. |
| 1.2 | Variables and Data Types | V3 Ex2 E6 CFU2 | 1.2 | Close | Type declarations are Java-only. Worth keeping: the swap-two-values probe and the primitive-vs-reference split (feeds 3.6). |
| 1.3 | Expressions and Output | V2 Ex3 E6 CFU2 | 1.2 (operators, template literals) | Close | Print/escape ideas map to console.log and template literals. The integer-division trap becomes a JS float surprise, not truncation. |
| 1.4 | Assignment Statements and Input | V2 Ex2 CFU2 E5 N1 | 1.2 (assignment); CUT: Scanner/input half | Partial | Update-a-variable idea is covered. Scanner and its buffer trap are Java-only; our input is keys and mouse (5.1). |
| 1.5 | Casting and Range of Variables | V1 Ex2 E5 CFU1 N1 | 1.2 (coercion, special numeric values) | Close | Adapt: casting becomes Number()/coercion, overflow becomes MAX_SAFE_INTEGER, round-off becomes float error. The Java int-range teaching is cut. |
| 1.6 | Compound Assignment Operators | V1 Ex1 N1 CFU1 E4 | 1.2 or 2.2 (+=, ++); verify placement | Close | Small lesson; pair with a score/health tally so it lands in a game context (5.3 injection rule). Not checked at lesson level. |
| 1.7 | Application Program Interface (API) and Libraries | V3 Ex1 CFU1 FR2 E1 | NEW: reading a reference (front of 5.1) | Partial | Navigating an API doc is the transferable skill; aim it at the moSHion/p5play reference, not a String API. We have no lesson on this. |
| 1.8 | Documentation with Comments | V2 E4 CFU2 Ex2 | 1.3 Documentation and Conventions | Close | Comment-for-intent, comment-out-to-debug, and a structured doc-comment format (JSDoc analog). 1.3 goes wider (naming, reuse). |
| 1.9 | Method Signatures | V1 Ex2 CFU1 E4 N1 | 3.1 / 3.2 | Close | Parts of a signature map to function name, parameters, return. Overloading is cut (JS has none); default parameters are the analog. |
| 1.10 | Calling Class Methods | V1 Ex1 E4 CFU1 | 3.1 (calling); 5.8 (static) | Partial | Calling a method with no instance is the idea behind Math.x() and our static reading; fold into those, no stand-alone lesson. |
| 1.11 | Math Class | V1 CFU1 E4 | NEW: Math toolkit (tail of 3.2, or 5.2) | Partial | random, floor, hypot, pow all earn their place in games. No dedicated Math lesson located; Math.random only appears inside labs. |
| 1.12 | Objects: Instances of Classes | V1 Ex1 E2 CFU1 FR2 N1 | 5.6 (Unit 6 'use objects') | Exact | Instance vs class, handed a class. Class-hierarchy note is the only inheritance content in the whole course. |
| 1.13 | Object Creation and Storage (Instantiation) | V2 N1 Ex1 E3 CFU1 | 5.6 | Exact | new builds an instance; printing an object. Two-part video split is a natural lesson seam for 5.6. |
| 1.14 | Calling Instance Methods | V1 Ex1 CFU1 E3 | 5.6 (+ 3.5 object methods) | Exact | Calling a method on an instance. JS needs this here, Java does not; we already teach it early. |
| 1.15 | String Manipulation | V1 Ex2 E7 CFU2 N2 | 1.2.14 string methods; 2.2 | Close | Concatenation and string methods; the explore-then-summarize note pair is a good pattern for the methods list. |
| 1.16 | Mid-Unit Assessment | Q1 FR1 | CUT: exam-format MCQ + FRQ | None | AP exam rehearsal. shCode closes a chapter with a PA pair; a short module-closing check is the only idea worth taking (CODEHS-SEEDING s5). |
| 1.17 | End of Unit Assessment | Q1 FR2 | CUT: exam-format MCQ + FRQ | None | Same as 1.16. |
| 2.1 | Algorithms with Selection and Repetition | V1 FR4 CFU1 IN1 | 1.5 (pseudocode) + 2.2 | Close | Algorithms in prose/pseudocode before code. shCode's 1.5 is much deeper (flowcharts). |
| 2.2 | Boolean Expressions | V1 Ex1 E4 CFU1 A1 FR1 | 2.1 | Close | Boolean expressions, truth tables, returning a boolean (ties to isAlive in 5.8). Truth tables are not a distinct shCode lesson. |
| 2.3 | if Statements | V1 Ex1 E5 CFU1 | 2.1 | Exact | Plain if. Debug-first-then-explore alternation is their pacing model. |
| 2.4 | Nested if Statements | V2 Ex2 CFU2 E5 | 2.1 | Close | else-if chains and nesting; two concepts, two check gates inside one lesson. |
| 2.5 | Compound Boolean Expressions | V1 Ex1 E5 CFU1 | 2.1 (&& || !) | Exact | Compound conditions; convert-pseudocode-to-code exercise is a good bridge from 1.5. |
| 2.6 | Comparing Boolean Expressions | V2 Ex1 E5 CFU2 A1 | 2.1 (partial) + 3.6 | Partial | De Morgan and equivalent expressions: not located in shCode, optional. Object comparison: JS === compares references, no equals(); lands in 3.6. |
| 2.7 | while Loops | V2 Ex1 E5 CFU2 | 2.2 / 2.4 | Exact | while, plus infinite loops and exit strategies (2.4 diagnoses infinite loops). |
| 2.8 | for Loops | V2 Ex1 E5 CFU1 | 2.2 | Exact | for loop variations; debugging a prime-number loop. |
| 2.9 | Implementing Selection and Iteration Algorithms | N1 Ex1 E5 FR1 | 2.2 canonical algorithms; 2.6/2.7 PAs | Close | Running totals, min/max, digit work. Our PAs carry this role. |
| 2.10 | Implementing String Algorithms | V1 Ex1 N2 E6 CFU1 | 2.2 / 2.4; 1.2.14 | Partial | String traversal. Their 'trace the mystery algorithm and say what it does' trio is a pattern shCode lacks. 2.2.17b count-a-letter exists. |
| 2.11 | Nested Iteration | V2 Ex1 E5 CFU1 | 2.4 nested loops | Exact | Grid/triangle shapes by nested loops; direct on-ramp to tile grids (see gaps). |
| 2.12 | Informal Run-Time Analysis | V1 A1 FR1 E3 CFU1 | CUT (or one optional reading in 2.4) | None | Counting statement executions is AP-specific. Possible reuse: frame-budget thinking in 6.x. Owner call. |
| 2.13 | Mid-Unit Assessment | Q1 FR1 | CUT: exam-format MCQ + FRQ | None | See 1.16. |
| 2.14 | End of Unit Assessment | Q1 FR2 | CUT: exam-format MCQ + FRQ | None | See 1.16. |
| 3.1 | Abstraction and Program Design | V2 CFU1 FR3 | NEW: Unit 7 opener, design before syntax | Partial | Plan a class system on paper before writing it. shCode has decomposition and flowcharts (1.5) but no class-diagram step. |
| 3.2 | Impact of Program Design | N3 FR2 E1 | NEW: short reading, Unit 7 (or 1.3) | Partial | Reliability, social impact, and crediting borrowed code. moSHion/p5play is borrowed code, so attribution is real here. |
| 3.3 | Anatomy of a Class | V1 Ex1 CFU1 E3 IN1 | 5.7 (Unit 7) | Close | Fields, access, encapsulation vs abstraction. JS has # private fields and convention only; decide what we teach. |
| 3.4 | Constructors | V2 Ex1 E5 CFU2 | 5.7 | Exact | Constructors, and handing an object to a constructor (our composition: sprite held inside). Overloaded constructors cut (default values/options object). |
| 3.5 | Methods: How to Write Them | V1 Ex1 E5 CFU1 | 5.7 | Exact | Writing methods; accessor/mutator pair. Getters/setters are optional in JS. |
| 3.6 | Methods: Passing and Returning References of an Object | V1 Ex1 E3 CFU1 Ch1 | 5.8 (object acts on object) + 3.6 | Close | Passing an object in and returning one. shCode's player.hit(enemy) is the same idea; 3.6 covers reference semantics. |
| 3.7 | Class Variables and Methods | V1 Ex1 E3 CFU1 Ch1 | 5.8 (static) | Exact | Class variables and methods; shared counter. CSA puts it before scope, shCode after (open question). |
| 3.8 | Scope and Access | V1 IN1 E3 CFU1 FR1 | 5.8 | Exact | Scope inside a class, which variables exist where. Our interactive scope explorer is a pattern to consider. |
| 3.9 | this Keyword | V1 Ex1 E4 CFU1 | 5.6 (taught early) | Close | this. CSA last, shCode first because JS forces it. Divergence stays. |
| 3.10 | Mid-Unit Assessment | Q1 FR1 | CUT: exam-format MCQ + FRQ | None | See 1.16. |
| 3.11 | End of Unit Assessment | Q1 FR2 | CUT: exam-format MCQ + FRQ | None | See 1.16. |
| 4.1 | Ethical and Social Issues Around Data Collection | N2 FR4 E2 | NEW: short reading beside 3.8/6.5 | Partial | Data privacy and bias. Our save/load modules store student data, so a reading fits there. The encapsulation-as-security exercise pairs with 5.8 access. |
| 4.2 | Introduction to Using Data Sets | V1 FR3 | CUT: data-set analysis essays | None | Free-response analysis of fitness/everyday data sets; AP-exam style, no game or JS link. |
| 4.3 | Array Creation and Access | V1 E4 CFU1 IN1 FR1 | 3.3 Arrays | Exact | Create and index. Array as an instance variable is the part to carry into Unit 7. |
| 4.4 | Array Traversals | V1 E5 CFU1 | 3.3 | Exact | Traversal with a loop; debugging and explore pair. |
| 4.5 | Implementing Array Algorithms | N1 E3 Ex1 CFU1 | 3.3 + 3.7 | Close | Reverse, find duplicates, reorder. Adapt with .reverse()/.slice() vs hand loops. |
| 4.6 | Using Text Files | V2 Ex1 E7 IN1 | CUT file I/O; ADAPT idea into 3.8 and 2.5 | Partial | No file system in the browser sandbox. Persistence is 3.8 (localStorage); the try/catch motive is a failed JSON.parse. split() is a string method. |
| 4.7 | Wrapper Classes | V1 E5 N1 CFU1 | CUT: wrapper classes | None | Boxing exists only in Java. Number()/parseInt/null handling is the JS residue, covered in 1.2. |
| 4.8 | ArrayList Methods | V1 IN1 E6 CFU1 | 3.3 (push, pop, splice) | Close | ArrayList as a separate type is cut; JS arrays already grow and shrink. |
| 4.9 | ArrayList Traversals | V1 Ex1 E6 CFU1 | 3.3 + 6.2 | Close | Forward vs backward traversal while removing items is exactly the bug 6.2 leads with. Direct validation of that framing. |
| 4.10 | Implementing ArrayList Algorithms | N1 Ex1 E6 CFU1 | 3.7 + 3.3 | Close | Numeric/string list algorithms; explore-then-modify pairs. |
| 4.11 | 2D Array Creation and Access | V1 E4 IN1 CFU1 | 3.3 (list of lists); NEW: grids | Partial | 2D arrays have only a sliver in 3.3. Boards and tile maps need a real lesson (see gaps). |
| 4.12 | 2D Array Traversals | V1 Ex1 A1 FR1 CFU1 E3 Ch2 | NEW: grids, Unit 6 | Partial | Row/column traversal plus a two-part board game challenge. Candidate for a board-class build. |
| 4.13 | Implementing 2D Array Algorithms | N1 E4 V1 Ex1 | NEW: grids, Unit 6 | Partial | Shifting, flipping, and plotting from a grid. Plotting maps to canvas drawing. |
| 4.14 | Searching Algorithms | V1 E5 CFU1 | 2.2 (linear search) | Close | Linear search over 1D and 2D. Binary search appears only in 4.17. |
| 4.15 | Sorting Algorithms | V2 A3 E2 CFU2 Ex1 FR1 | NEW (optional): sorting on canvas | Partial | Selection and insertion sort with simulation articles. Adapt as one visualizer lab; otherwise rely on .sort(compare) in 3.7. |
| 4.16 | Recursion | V2 Ex3 FR4 CFU1 N1 E1 | CUT (optional enrichment) | None | Recursion with tree and trace-table tracing. No game need yet; revisit only if a fractal or flood-fill build appears. |
| 4.17 | Recursive Searching and Sorting | V3 Ex1 E3 A1 CFU2 FR1 | CUT | None | Binary search and merge sort recursively; builds on 4.16. |
| 4.18 | Mid-Unit Assessment | Q1 FR1 | CUT: exam-format MCQ + FRQ | None | See 1.16. |
| 4.19 | End of Unit Assessment | Q1 FR2 | CUT: exam-format MCQ + FRQ | None | See 1.16. |

Tallies: 14 lessons CUT outright (8 exam-format assessments, 4.2, 4.7, 4.16, 4.17, 2.12), plus 4.6 as file I/O. Fit: Exact 14, Close 19, Partial 15, None 13.

### Verdicts on the Java-only topics

| Topic (lessons) | Verdict | Why |
|---|---|---|
| Primitive types, casting, range (1.2, 1.5) | Adapt | JS has one number type. Teach coercion, MAX_SAFE_INTEGER and float error, which 1.2 already does. |
| Scanner input (1.4) | Cut | Our input is keyboard/mouse. |
| Overloading methods/constructors (1.9, 3.4) | Cut | JS has none. Default parameters stand in. |
| Wrapper classes (4.7) | Cut | No boxing in JS. |
| ArrayList (4.8-4.10) | Cut as a type, keep the ideas | JS arrays already grow. The remove-while-iterating hazard is worth keeping (4.9 = 6.2). |
| 2D arrays (4.11-4.13) | Keep, adapt | Board games and tile maps are 2D game design. Needs a real lesson. |
| Linear search (4.14) | Keep | Already a canonical algorithm in 2.2. |
| Selection/insertion sort (4.15) | Optional | One canvas visualizer lab at most. |
| Binary search, merge sort (4.17) | Cut | No game or JS pull. |
| Recursion (4.16) | Cut for now | Revisit only if a build needs it. |
| Text files (4.6) | Cut file I/O, adapt the idea | Persistence is localStorage (3.8); try/catch motive is a failed parse. |
| Inheritance, interfaces | Not in this course | Nothing to keep, adapt or cut. See open questions. |
| Static (3.7) | Keep | Already 5.8. |

## 2. Gaps in shCode this course exposes

1. **Grids / 2D arrays.** 3.3 has "a list of lists" and nothing more; this course gives six lessons (4.11-4.13 plus the nested loops of 2.11). Tile maps (CODEHS-MAP flags tiles as missing) and board games need it. Proposed: one grid module in Unit 6, built on 2.4 nested loops.
2. **Design before syntax for classes.** Nothing opens 5.7 with a "what are the objects and how do they relate" step (CSA 3.1). Proposed: a lesson at the front of Unit 7 that draws the classes first.
3. **Reading a reference.** No lesson teaches finding a method in the moSHion/p5play reference (CSA 1.7). Proposed: one lesson at the start of 5.1.
4. **Math toolkit.** random, floor, hypot, pow are used in labs but not taught as a set (CSA 1.11).
5. **Crediting borrowed code and impact** (3.2, 4.1). 1.1 touches ethics only; a short reading fits Unit 7 or beside 3.8/6.5, since our games store student data.
6. **Trace-and-explain ("mystery algorithm") exercises** (2.10, 4.16). Not a pattern we use; it pairs well with the trace screens in 2.2.
7. **Boolean equivalence / De Morgan** (2.6). Absent from 2.1. Low priority.
8. **Getters/setters and `#private`.** 3.3 and 3.5 teach access with accessor/mutator pairs. 5.8 teaches access by convention (`takeHit`, `isAlive`); decide whether to name `#private` and `get`/`set`.

## 3. Things in shCode this course does not justify

- `switch` (2.3), arrow functions (3.4): absent here, as in the other four courses.
- `try`/`catch` (2.5) has only light support: this course meets it once, around file reading (4.6).
- 1.1 SDLC and 1.4 paradigm taxonomy: CSA names neither.
- localStorage (3.8, 6.5), joints (6.8), `applyForce`: absent. Those are our advantage, not a defect.
- Composition-over-`extends` as the stated rule (curriculum-plan 5.4): this course does not contradict it, since it teaches no inheritance at all.
- Weight check: 1.2 at 31 screens against 1.2/1.3/1.5/1.6 here (four Java lessons, about 44 activities). Depth holds.
- Nothing here argues for the 5.8 `static` reading being cut; 3.7 backs it.

## 4. Open questions for the owner

1. **Inheritance in the OOP game units?** This course does not teach it, so it cannot decide the question. If wanted, evidence must come from somewhere else (p5play subclassing Sprite is the live pull). Option: a name-only reading at the end of Unit 7, no `extends`/`super` in graded work. Confirm.
2. **Static before or after scope/access** (CSA 3.7 then 3.8; we do the reverse)? Course supports swapping, but 5.8 is built and shipped.
3. **Grids unit:** build one in Unit 6 (tiles + board game), or leave 2D arrays to a list-of-lists sliver?
4. **Sorting visualizer lab** (4.15): wanted as optional, or cut entirely?
5. **Run-time analysis** (2.12): cut, or a frame-budget reading in 6.x?
6. **Module-closing check:** adopt a short check at the end of each 6.x/7.x module in place of CSA's mid/end pair (CODEHS-SEEDING s5)?
7. **Placement of 1.6 and 1.11** (compound assignment, Math): I did not verify lesson-level coverage in 1.2/2.2; please confirm or let an audit pass check it.
8. **Unit renumber:** the tree still has 5.6-5.8 for the OOP block while the plan says Unit 6 (use) and Unit 7 (write). Rows above name both; confirm which numbering the final map uses.
