## Chapter 2 Individual PA — Part 5 of 5: Write the Steps

**This is the coding part of the test, and you are doing it alone.** One problem, pick
one of three, write the JavaScript. **20 points**, about **12 minutes**. No Run button.
You get three attempts; read the feedback, fix the code, send it again.

**What you write:** A single JavaScript program (one file, no functions, no arrays, no
objects) that solves the problem you picked. It must contain:

- A **nested loop** (for/while inside for/while)
- A **branch** with `if` / `else if` / `else` and at least one `&&` or `||`
- A **break** or `continue` inside the loop
- A **try/catch** around the one input that can be bad, reporting `err.message`
- A `switch` that classifies the result (three outcomes)
- **Documentation:** header comment (Problem, Partners = N/A, Date), a const for the
  limit, camelCase names throughout, at least one template literal `console.log`,
  `typeof` for one value

**Three problems. Pick one.** They are the same difficulty and the same shape: take one
or two inputs, walk something with a loop, decide inside the loop, classify with a
`switch`, guard the bad input, report a total and a verdict. Adjacent tables should
not pick the same one.

---

### 1. Seat Map

You are assigning seats in a theater. Rows `1..R`, seats per row `1..S`. Some seats are
blocked (`continue` past them). A group needs `G` adjacent seats. `break` the moment
you find a block of `G` adjacent free seats. Report the row and starting seat, or
"no block found". `throw` on bad `R`, `S`, or `G`.

---

### 2. Word Grid

You have a word and a grid size `N`. Walk the word character by character, placing each
letter in an `N x N` grid row by row (`continue` past spaces). `break` when the word
ends. Count vowels, digits, others with a `switch`. `throw` on empty word or `N < 1`.

---

### 3. Fuel Log

A vehicle logs fuel stops. You have `F` fuel entries. Each entry has miles driven and
gallons added. Compute MPG for each stop (`try`/`catch` on zero gallons). Track best
and worst MPG. `break` if any entry exceeds a max MPG threshold. `throw` on bad `F`
or negative gallons.

---

### Rules

- **No functions, no arrays, no objects.** Single script, top to bottom.
- **Iteration** only from counters or string indexing (`word[i]`, `word.length`).
- **Header comment:** Problem, Partners = N/A, Date.
- **Limit** as a `const`.
- **Template literal** in at least one `console.log`.
- **`typeof`** for one value.
- **No Run button.** Three attempts; your best one is the mark that counts.

### What is marked

The 20 points are the **branch** (8), the **nested loop** (9) and the **break or
`continue`** (3). The header comment, the `const` limit, the template literal, `typeof`,
the `try/catch` and the `switch` are all required, but they are checked as feedback only and
earn no points of their own: leave one out and the feedback will say so.

**Fuel Log is the one problem where the nested loop is not obvious.** It is still required:
for example, an outer loop over days and an inner loop over that day's fuel stops. Seat Map
and Word Grid nest naturally (rows then seats, rows then columns).