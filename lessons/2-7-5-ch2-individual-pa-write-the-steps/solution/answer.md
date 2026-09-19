## Answer Key — 2.7.5 Write the Steps

### Rubric (20 points total — matches lesson.json and the grader prompt)

| Criterion | Points | What earns full credit |
|---|---:|---|
| **Branch with &&/||** | 8 | `if` / `else if` / `else` chain with at least one compound `&&` or `||` condition |
| **Nested loop** | 9 | Two nested `for`/`while` loops, both executing; inner completes a full sweep per outer pass |
| **Break or continue** | 3 | One `break`/`continue` inside the nested loop that changes what runs |

**Total: 20 points**

### Partial credit ladders

- **Nested loop (9):** 9 correct nest with consistent bounds · 6–7 correct nest with an off-by-one in one bound · 3 two loops that do not actually nest · 0 no loop.
- **Branch (8):** 8 full chain with a meaningful compound condition · 5 chain present, conditions all simple · 3 single if/else · 0 no branch.
- **Break/continue (3):** 3 changes what runs · 1 present but decorative · 0 none (a switch-case `break` does not count — that is §2.3, not loop control).

### D2 is graded against the problem, not against D1

A correct chart with botched code loses only the D2 points. A blank D1 costs the 10 — see the D1 rubric.

### Reference solution (Problem 1: Seat Map)

No functions, no arrays, no objects. Nested loop, `if / else if / else` with `&&`,
`continue` past blocked seats, `break` the moment the block is found. The
classification is an `if / else if / else` — `switch (true)` is deliberately not
used, because Chapter 2 never teaches it.

```js
// Problem: Seat Map
// Partners: N/A
// Date: 2026-09-30

const ROWS = 5;
const seatsPerRow = 10;
const groupSize = 3;

try {
  if (ROWS < 1 || seatsPerRow < 1 || groupSize < 1) {
    throw new Error("R, S and G must all be at least 1");
  }

  let found = false;
  let foundRow = 0;
  let foundStart = 0;

  for (let r = 1; r <= ROWS; r++) {
    let consecutive = 0;
    for (let s = 1; s <= seatsPerRow; s++) {
      // Seats 4 and 5 of every row are staff seats -- skip them.
      if (s === 4 || s === 5) {
        continue;
      }
      consecutive = consecutive + 1;
      if (consecutive >= groupSize && !found) {
        found = true;
        foundRow = r;
        foundStart = s - groupSize + 1;
      }
    }
  }

  // Report with a branch, not a switch: two outcomes, and §2.3 teaches
  // that a two-outcome classification is an if/else.
  if (found) {
    console.log(`Block found: row ${foundRow}, seats ${foundStart} to ${foundStart + groupSize - 1}`);
  } else if (ROWS < 1) {
    console.log("No theater at all");
  } else {
    console.log("No block of " + groupSize + " free seats anywhere");
  }

  console.log(typeof found);
} catch (err) {
  console.log(err.message);
}
```

**Points earned (example):**
- Branch with `&&`: 8/8 — `consecutive >= groupSize && !found` is compound
- Nested loop: 9/9 — seat sweep inside a row sweep, both run
- Break/continue: 3/3 — `continue` past seats 4 and 5
- **Total: 20/20**

**Note on the `break`:** this reference intentionally does not `break` out of
the sweep — the full map is worth walking so the report can name the *first*
block found from the top. A student who breaks early earns the same 3: the
criterion is a loop-control keyword that changes what runs, and theirs does.
