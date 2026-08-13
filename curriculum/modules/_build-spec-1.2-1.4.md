# Build spec — Unit 1.2–1.4 in-app lessons (console track)

> Internal build instructions for the readings + AI-graded writeups of Units 1.2–1.4.
> No `id:` frontmatter on purpose so the module loader ignores this file.

## Hard rules (every lesson)

- **CONSOLE track — Q1 JS fundamentals. NO q5play, NO game-dev, NO JSCAD anywhere.** No `player`, `sprite`, `Canvas`, etc.
- Titles MUST start with the exact `U.M.N` shown (integer-only — no letter suffix; that mechanism was retired 2026-08-12, see `sub-module-spec-conventions.md` §4.1), or the lesson vanishes from its module.
- Do NOT hand-edit `public/lessons-manifest.json` (auto-generated). Do NOT modify the existing console lessons (`conditionals`, `intro-algorithms`, `algorithm-practice`, `loops`, `functions`, `arrays`, `print-job-manager`).
- Mirror the shape of the already-built 1.1 lessons EXACTLY:
  - Reading canonical: `lessons/1-1-2-reading-type-coercion/` (lesson.json + content.md)
  - Writeup canonical: `lessons/1-1-1-a1-1-sdlc-writeup/` (lesson.json + content.md)
- Conventions (binding): `curriculum/resources/reading-conventions.md`, `curriculum/resources/written-assignment-conventions.md`.

### Reading lesson.json shape
```
type "lesson", preview "reading", contentFile "content.md",
slos [..], week N, unit "<unit label>", category "Unit 1: JavaScript Fundamentals",
steps [], requirements [], grading { totalPoints:0, passingScore:0, allowLateSubmit:true }
```
No `externalLink` (no invented URLs).

### Reading content.md shape
- Open straight into `## Topic` subsection(s) — no hub header, no metadata table.
- Each topic: a **What you'll learn:** bullet list (3–4 items), a **Try it:** line, then a ```` ```js live console ```` runnable block.
- Close with a `## Short glossary (quick reference)` table.
- Beginner JS ONLY: `if/else`, named vars, plain `for`, `console.log`. NO ternaries, arrow callbacks, destructuring, chained array methods, `??`/`&&` shortcuts. Under ~100 lines.

### Writeup lesson.json shape (AI-graded)
```
type "assignment", preview "assignment", contentFile "content.md", points 0,
slos [..], week N, unit "<unit label>", category "Unit 1: JavaScript Fundamentals",
steps [], requirements [], grading { totalPoints:0, passingScore:0, allowLateSubmit:true },
aiGrader { rubricTitle, model "deepseek-v4-flash:0731-cloud", contextDocs [], prompt, rubric:[{id,title,description,points:0}, ...] }
```
`contextDocs` MUST be `[]`. Every rubric `points` is `0` (all rubric rows the same — either all `0` or all `1`, never mixed; see `written-assignment-conventions.md` §1/§4). content.md = one-line nudge + `# | Criterion` checklist (no points column, no copied prompt, no example answer). Note: `WrittenGrader.tsx` grades this shape (`points:0`) at a bare-majority threshold, not 100% — written assignments allow partial credit by design, unlike this doc's console labs. Don't expect `grading.passingScore` above to change that; it isn't read on the written path.

---

## MODULE 1.2 — Control Flow  (unit label: "1.2 Control Flow")

| dir | title | slos | week | concept |
|-----|-------|------|------|---------|
| `lessons/1-2-1a-reading-if-else/` | `1.2.1a Reading — If / Else if / Else` | ["SLO-3"] | 4 | Branching: `if`, `else if`, `else`. Live block: set `let score = 85;` then print a grade tier with an if/else-if/else chain. |
| `lessons/1-2-1b-reading-comparison-operators/` | `1.2.1b Reading — Comparison Operators & === vs ==` | ["SLO-3"] | 4 | `<, >, <=, >=, ===, !==`. Teach `===` as default; show `5 === "5"` is `false` but `5 == "5"` is `true` (mention `==` is risky). Live block: several `console.log` comparisons including the `===` vs `==` contrast. |
| `lessons/1-2-1c-reading-logical-operators/` | `1.2.1c Reading — Logical Operators: && || !` | ["SLO-3"] | 4 | `&&` (both), `||` (either), `!` (not). Live block: combine two conditions with `&&` and `||`, and negate one with `!`. |
| `lessons/1-2-1d-reading-switch/` | `1.2.1d Reading — switch Statements` | ["SLO-3"] | 4 | `switch`/`case`/`break`/`default`. Live block: switch on `let day = "Wed";` printing a message per case, with a `default`. Note the `break` matters. |
| `lessons/1-2-2a-reading-what-is-algorithm/` | `1.2.2a Reading — What Is an Algorithm?` | ["SLO-4"] | 5 | An algorithm is a precise, ordered set of steps to solve a problem. Live block: a tiny algorithm — find the largest of three numbers using `if` comparisons, print it. |
| `lessons/1-2-4a-reading-for-loop/` | `1.2.4a Reading — The for Loop` | ["SLO-3"] | 6 | `for (init; condition; increment)`. Live block: print 1..5, then sum 1..5 into a total and print it. |
| `lessons/1-2-4b-reading-while-loop/` | `1.2.4b Reading — while & do…while` | ["SLO-3"] | 6 | `while` checks first; `do…while` runs once then checks. Live block: a `while` countdown from 3, then a tiny `do…while` that runs once. Mention infinite loops (always change the condition variable). |

### Writeup (module 1.2)
| dir | title | slos | week |
|-----|-------|------|------|
| `lessons/1-2-2b-a5-1-algorithm-writeup/` | `1.2.2b Algorithm in Plain English` | ["SLO-4"] | 5 |

- rubricTitle: `"Algorithm in Plain English — AI-graded rubric"`
- prompt: "Part 1 — In your own words, what is an algorithm? (1–2 sentences.)\n\nPart 2 — Write a precise, step-by-step algorithm in plain English (not code) for an everyday task you know well — making a sandwich, tying your shoes, logging into a website, etc. Number the steps. Someone who has never done the task should be able to follow your steps exactly and succeed. Be precise: don't skip steps or assume the reader 'just knows' something."
- rubric (points 0 each):
  - `defines-algorithm` — Defines an algorithm as a precise, ordered set of steps to accomplish a task, in the student's own words.
  - `numbered-ordered-steps` — Part 2 is a numbered/ordered list of steps in a sensible sequence.
  - `precise-unambiguous` — Steps are precise and unambiguous — no major skipped step or "and then it's done" hand-wave a beginner couldn't follow.
  - `complete-task` — The steps, followed exactly, actually accomplish the chosen task from start to finish.

---

## MODULE 1.3 — Functions and Data  (unit label: "1.3 Functions and Data")

| dir | title | slos | week | concept |
|-----|-------|------|------|---------|
| `lessons/1-3-1a-reading-function-basics/` | `1.3.1a Reading — Defining & Calling a Function` | ["SLO-2"] | 7 | `function name() { ... }` defines; `name()` calls/runs it. Defining ≠ calling. Live block: define `function greet() {...}`, then call it twice. |
| `lessons/1-3-1b-reading-parameters-return/` | `1.3.1b Reading — Parameters & Return Values` | ["SLO-2"] | 7 | Parameters are inputs; `return` hands a value back. Live block: `function add(a, b) { return a + b; }` then store the result in a variable and print it. Contrast: a function that `console.log`s vs one that `return`s. |
| `lessons/1-3-1c-reading-scope/` | `1.3.1c Reading — Scope: Local vs Global` | ["SLO-2"] | 7 | A variable declared inside a function is local — invisible outside. Live block: a local var inside a function, show it works inside and that a global var is reachable inside. (Don't trigger a ReferenceError in the live run — explain it in prose instead.) |
| `lessons/1-3-1d-reading-pass-by-value-reference/` | `1.3.1d Reading — Pass by Value vs Reference` | ["SLO-3"] | 7 | Primitives (number/string/boolean) are passed by **value** (a copy — the original is safe). Objects/arrays are passed by **reference** (shared — a function can change the original). Live block: a function that tries to change a number param (original unchanged) and one that `push`es to an array param (original changes). |
| `lessons/1-3-1e-reading-defensive-copying/` | `1.3.1e Reading — Defensive Copying: [...] and {...}` | ["SLO-3"] | 7 | Copy before you change to protect the original: `let copy = [...arr];`. Live block: copy an array with `[...arr]`, change the copy, show the original is untouched. |
| `lessons/1-3-2a-reading-array-basics/` | `1.3.2a Reading — Array Basics: Index, push, pop` | ["SLO-3"] | 8 | Arrays hold a list; zero-based indexing (`arr[0]` is first); `.push()` adds to end, `.pop()` removes from end, `.length` counts. Live block: build an array, read `arr[0]`, push, pop, print length. |
| `lessons/1-3-2b-reading-array-iteration/` | `1.3.2b Reading — Looping Over Arrays (for / for…of)` | ["SLO-3"] | 8 | Visit each element with a `for` loop using the index, or `for (const item of arr)`. Live block: sum an array of numbers with a `for` loop, then print each item with `for...of`. |
| `lessons/1-3-2c-reading-split-lines/` | `1.3.2c Reading — Splitting Text into Lines (.split)` | ["SLO-3"] | 8 | When you read a text file, you get one big string; `.split("\n")` turns it into an array of lines you can loop over (a preview of File I/O). Live block: a multi-line template-literal string, `.split("\n")` into lines, loop and print each with its line number. |

### Writeup (module 1.3)
| dir | title | slos | week |
|-----|-------|------|------|
| `lessons/1-3-1f-a7-2-pass-by-reference-writeup/` | `1.3.1f Pass by Value vs Reference` | ["SLO-2"] | 7 |

- rubricTitle: `"Pass by Value vs Reference — AI-graded rubric"`
- prompt: "Explain, in your own words, the difference between pass by value and pass by reference in JavaScript.\n\n1. What does 'pass by value' mean, and which kinds of values does JavaScript pass this way?\n2. What does 'pass by reference' mean, and which kinds of values does JavaScript pass this way?\n3. Give one short example of each (you can describe code in words).\n4. Why does this matter? Describe one bug that could happen if a programmer forgets the difference."
- rubric (points 0 each):
  - `value-defined` — Explains pass-by-value: the function gets a copy; changes inside don't affect the original. Correctly says primitives (number/string/boolean) are passed by value.
  - `reference-defined` — Explains pass-by-reference: the function shares the same object/array; changes inside DO affect the original. Correctly says objects/arrays are passed by reference.
  - `example-each` — Gives a plausible example of each (e.g., changing a number param has no outside effect; pushing to an array param does).
  - `why-it-matters` — Describes a real consequence: an unintended-mutation bug, or why you'd copy before changing.

---

## MODULE 1.4 — Synthesis  (unit label: "1.4 Synthesis")

> The existing console mini-project `print-job-manager` is being renumbered to `1.4.2` (done separately) so these readings precede it and the reflection follows it.

| dir | title | slos | week | concept |
|-----|-------|------|------|---------|
| `lessons/1-4-1a-reading-plan-before-code/` | `1.4.1a Reading — Plan Before You Code` | ["SLO-3"] | 9 | Before coding, write the steps in plain words (pseudocode as comments), then fill in code under each. Decompose a big task into small ones. Live block: a short program whose steps are written first as `//` comments, then implemented under each. |
| `lessons/1-4-1b-reading-manual-testing/` | `1.4.1b Reading — Manual Testing: PASS / FAIL Checks` | ["SLO-3"] | 9 | Test a function by calling it with a known input and checking the result against what you expect; print PASS or FAIL. Live block: a small function (e.g. `double(n)`), then two manual checks that print "PASS" / "FAIL" by comparing actual to expected with `if`. |

### Writeup (module 1.4)
| dir | title | slos | week |
|-----|-------|------|------|
| `lessons/1-4-3-q1-reflection-writeup/` | `1.4.3 Q1 Reflection` | ["SLO-1"] | 9 |

- rubricTitle: `"Q1 Reflection — AI-graded rubric"`
- prompt: "Reflect on your first quarter of programming.\n\n1. Name one concept from Q1 (variables, conditionals, loops, functions, arrays, etc.) that you found hardest, and explain how you worked through it.\n2. Think about how you'd build a small program now. Describe how you would plan it, build it, and test it — connect this to the software-development life-cycle phases you learned in Week 1.\n3. What is one thing you want to get better at next quarter?"
- rubric (points 0 each):
  - `hardest-concept` — Names a specific Q1 concept they found hard and describes, specifically, how they worked through it (not a generic "I practiced").
  - `plan-build-test` — Describes a plan → build → test process for a small program, showing they understand the order of work.
  - `connects-sdlc` — Connects the reflection to the SDLC phases / their own lived experience this quarter (specific, not generic).
