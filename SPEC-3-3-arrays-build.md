# SPEC: Build out Module 3.3 Arrays (8 → 18 lessons)

## Context (you should not need anything outside this file or the repo)

`curriculum/modules/3.3_arrays.md` has the full density re-audit and the
Numbered Lesson List (18 rows). Read that file first — it explains why these
10 lessons are the exact gap (index assignment, shift/unshift, arrays+functions,
nested arrays) and which 6 existing lessons need a **title-only** renumber.

**Hard rules, from `curriculum/resources/sub-module-spec-conventions.md`:**
- Never rename an existing lesson folder / never change an existing `lesson.json.id`. `lesson_state.lesson_id` is the folder name and renaming orphans student progress.
- Only edit the `title` field on the 6 existing lessons being renumbered — nothing else in those files.
- New lesson folder names follow `<U>-<M>-<L>-<descriptor>`, e.g. `3-3-3-reading-index-assignment`.
- Every lesson `title` must start with its `<U>.<M>.<L>` number exactly (e.g. `"3.3.4 Lab: ..."`) or it is silently dropped from the app.
- Mastery grading only: `grading.totalPoints`, `grading.passingScore`, and every `requirements[].points` must be `0`.
- No invented video URLs; these lessons don't use video.
- Do not put solution code inside a graded lesson's `script.js` starter — only `// STEP N:` comment breadcrumbs. Full working code goes in `solution.js` only.

## Task A — Retitle 6 existing lessons (title field only)

| Folder | Old title | New title |
|---|---|---|
| `lessons/3-2-3-reading-array-iteration/lesson.json` | `3.3.3 Reading: Looping Over Arrays (for / for…of)` | `3.3.5 Reading: Looping Over Arrays (for / for…of)` |
| `lessons/3-2-4-reading-split-lines/lesson.json` | `3.3.4 Reading: Splitting Text into Lines (.split)` | `3.3.8 Reading: Splitting Text into Lines (.split)` |
| `lessons/3-2-5-lab-sum-array/lesson.json` | `3.3.5 Sum an Array` | `3.3.9 Sum an Array` |
| `lessons/3-2-6-example-menu-loop/lesson.json` | `3.3.6 Worked Example: A tiny menu loop` | `3.3.10 Worked Example: A tiny menu loop` |
| `lessons/3-2-6a-chart-the-array-loop/lesson.json` | `3.3.7 Chart the Code: Looping Over an Array` | `3.3.11 Chart the Code: Looping Over an Array` |
| `lessons/3-2-7-arrays/lesson.json` | `3.3.8 Arrays` | `3.3.18 Arrays` |

`3-2-1-slides` (3.3.1) and `3-2-2-reading-array-basics` (3.3.2) do NOT change.

After retitling, run `node scripts/check-lesson-citations.mjs` and fix any
lesson content elsewhere in the repo that cites the OLD numbers
(`3.3.3`, `3.3.4`, `3.3.5`, `3.3.6`, `3.3.7`, `3.3.8` as this module's lessons)
by name — the script tells you which lesson and which reference. Point each at
the new number instead of deleting the reference.

## Task B — 10 net-new lessons

Match the exact JSON shape and file layout of the sibling lessons named in
each block (open them for the shape; content below is what to put in them —
do not copy the book text verbatim, write original explanations/examples in
the same house voice as the sibling).

Every lesson: `"category": "Unit 1: JavaScript Fundamentals"`, `"unit": "3.3 Arrays"`,
`"slos": ["SLO-3"]`, `"week": 8`, `"grading": {"totalPoints": 0, "passingScore": 0, "allowLateSubmit": true}`.

---

### 3.3.3 — `3-3-3-reading-index-assignment` (type: `lesson`, preview: `reading`)
Shape like `3-2-2-reading-array-basics` (`content.md` + `lesson.json`, `steps: []`, `requirements: []`).

Title: `"3.3.3 Reading: Changing an Item by Index"`
Description: "Learn how assigning to `arr[i]` replaces one item without changing the array's length. Read before the index-assignment lab."

Content must teach: an existing slot is written the same way a plain variable
is — `colors[1] = "yellow"` replaces index 1 in place; the array does not grow
or shrink; a `let`/`console.log` runnable example proving it (colors example
is fine to adapt, use different values); a short note that an array can mix
types (`[42, "hello", true]`) and that the console prints strings in quotes,
numbers/booleans bare — that's a type signal, not decoration; short glossary
table like the sibling's (`arr[i] = value` → "replace the item at index i").

### 3.3.4 — `3-3-4-lab-update-by-index` (type: `assignment`, preview: `console`)
Shape like `3-2-5-lab-sum-array` (`lesson.json` + `script.js` scaffold with `// STEP N:` comments + `solution.js` + `index.html` + `style.css` — copy `index.html`/`style.css` byte-for-byte from `3-2-5-lab-sum-array`, only `script.js`/`solution.js`/`lesson.json` differ).

Title: `"3.3.4 Lab: Update Scores by Index"`
Steps: (1) create an array `scores` with at least 4 numbers, (2) reassign the
value at index 0 to a new number using `scores[0] = ...` (not push/pop), (3)
console.log the whole array to show the change.
Requirements (regex, all points 0): index-assignment present (pattern for
`scores\[0\]\s*=` or a general `\[\d+\]\s*=\s*[^=]` non-comparison assignment),
console.log present.
Solution: e.g. `let scores = [88, 91, 76, 60]; scores[0] = 95; console.log(scores);`

### 3.3.6 — `3-3-6-reading-shift-unshift` (type: `lesson`, preview: `reading`)
Shape like `3-2-2-reading-array-basics`.

Title: `"3.3.6 Reading: Adding and Removing from the Front"`
Description: "Learn `.unshift()` and `.shift()`, the front-of-list partners to `.push()` and `.pop()` you already know. Read before the queue lab."

Content must teach: a 4-row table (push/pop/unshift/shift × add-or-remove ×
which end); a runnable example showing `unshift` adding to the front and
`push` adding to the back on the same array so the contrast is visible; a
second example showing `shift()` returns the removed value, same double-job
idea as `return` (tie back to Module 3.2 — do not re-explain `return`, just
name the callback); glossary table with all four methods.

### 3.3.7 — `3-3-7-lab-shift-unshift-queue` (type: `assignment`, preview: `console`)
Shape like `3-2-5-lab-sum-array` (copy index.html/style.css from it).

Title: `"3.3.7 Lab: Front-of-Line Queue"`
Steps: (1) create an array `line` with at least 2 names, (2) `.push()` one
more name onto the back, (3) `.shift()` the first person off and store the
result in a variable, (4) `console.log` who is being served and the
remaining array.
Requirements (regex, points 0): `.push(` present, `.shift(` present,
`console.log(` present.
Solution mirrors the book's counter-line pattern but with different names/values.

### 3.3.12 — `3-3-12-reading-arrays-and-functions` (type: `lesson`, preview: `reading`)
Shape like `3-2-2-reading-array-basics`.

Title: `"3.3.12 Reading: Arrays and Functions"`
Description: "Learn how a whole array can be one function parameter, and how a function can build and return a new array. Read before the filter-function lab."

Content must teach: an array passed as a single parameter (adapt the
`highest(numbers)` idea — different name/values — looping with `for...of` to
find a max, and note why you seed the accumulator with `numbers[0]` rather
than `0`); the empty-array-then-push-then-return pattern as "the most reusable
shape in this chapter" — a function that filters/builds a new list; one
runnable worked snippet of that pattern with different values than the
worked-example lesson below (avoid duplicating 3.3.13 verbatim). One
`Context Pause`-style callout: passing an array into a function does not copy
it the way a number does — mutating it inside the function is visible outside
— defer full treatment to Module 3.6, name it, don't teach it here.

### 3.3.13 — `3-3-13-example-filter-passing-scores` (type: `lesson`, preview: `example`)
Shape like `3-2-6-example-menu-loop` (`lesson.json` + `content.md`, `steps: []`, `requirements: []`, fully worked/read-along — no student-authored code).

Title: `"3.3.13 Worked Example: Keeping Only the Passing Scores"`
Content: full runnable function `passing(scores)` that loops with `for...of`,
pushes scores >= 60 into a new `result` array, returns it; call it twice
(once with a mix that includes passing/failing, once with an array that
returns empty) and show `[]` printed for the second case; one sentence
explaining an empty-array return is correct, not an error, so a caller never
has to special-case "nothing matched."

### 3.3.14 — `3-3-14-lab-filter-function` (type: `assignment`, preview: `console`)
Shape like `3-2-5-lab-sum-array` (copy index.html/style.css from it).

Title: `"3.3.14 Lab: Write a Function That Filters an Array"`
Steps: (1) write a function `doubled(numbers)` (or an equivalent original
name — do not literally reuse the book's, invent your own e.g. `bigger`),
that takes an array parameter, (2) build a new empty array inside it and
push each transformed value in with a `for...of` loop, (3) `return` the new
array, (4) call it with a sample array and `console.log` both the result and
the original array to show the original is untouched.
Requirements (regex, points 0): `function` declaration present, `for` or
`for...of` loop present (`for\s*\(`), `.push(` present, `return` present.
Solution: full working version proving the original array is unmutated.

### 3.3.15 — `3-3-15-reading-nested-arrays` (type: `lesson`, preview: `reading`)
Shape like `3-2-2-reading-array-basics`.

Title: `"3.3.15 Reading: Lists Inside Lists"`
Description: "Learn how an array can hold other arrays, which is how you store a grid or a table of rows. Read before the nested-array lab."

Content must teach: an element can itself be an array (`grid = [[1,2],[3,4],[5,6]]`);
reading `grid[2][0]` left to right (outer index picks the row, inner index
picks the cell within it); `grid.length` counts rows, not total values — the
outer array does not know how long its rows are; a nested `for...of` loop
(outer walks rows, inner walks cells) visiting every cell, tied back to
Module 2.4's nested loops (name it, don't re-teach it); glossary entry for
"nested array" / "2D array".

### 3.3.16 — `3-3-16-example-nested-array-grid` (type: `lesson`, preview: `example`)
Shape like `3-2-6-example-menu-loop`.

Title: `"3.3.16 Worked Example: A Tic-Tac-Toe Board as a Nested Array"`
Content: build a 3x3 board as a nested array of `"X"`/`"O"`/`""`, read one
specific cell by `[row][col]`, then a nested loop that prints the whole board
row by row (join each row with a space before printing). Fully worked,
read-along, no student-authored code.

### 3.3.17 — `3-3-17-lab-nested-array-update` (type: `assignment`, preview: `console`)
Shape like `3-2-5-lab-sum-array` (copy index.html/style.css from it).

Title: `"3.3.17 Lab: Read and Update a Nested Array"`
Steps: (1) create a 2x2 (or larger) nested array of numbers named `grid`,
(2) log one specific inner value using double-index syntax, (3) reassign one
inner value with `grid[r][c] = ...`, (4) use a nested loop to sum every
number in the grid and log the total.
Requirements (regex, points 0): nested-array literal present (`\[\s*\[`),
double-index read/write present (`\]\[`  or `\[\d+\]\[\d+\]`), nested `for`
present (two `for\s*\(` occurrences — check count >= 2 if the checker
supports a count-based rule, otherwise two separate patterns each anchored
differently), `console.log(` present.
Solution: full working nested-loop sum, matching the book's 2x2 pattern with
different numbers.

## Task C — Verification (run in order, fix failures before reporting done)

```
node scripts/generate-lessons-manifest.mjs
node scripts/check-lesson-numbers.mjs
node scripts/check-lesson-citations.mjs
node scripts/check-starters.mjs
node scripts/check-solution-leak.mjs
node scripts/test-console-labs.mjs
```

Report which of these you ran and their pass/fail output verbatim — do not
summarize as "all passed" without showing the actual command output.

## Task D — Reply

Reply via the message center (`--re last`) with: which of the 10 new lesson
folders you created, the 6 retitles you applied, any stale citation you found
and fixed, the verification output, and one open design decision you were
unsure about (naming, exact regex leniency, wording) for review.
