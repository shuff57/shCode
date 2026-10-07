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

No functions, no arrays, no objects. Nested loop, `if / else if / else` with `||`,
`continue` past blocked seats (which also breaks up the run of free seats), `break`
the moment the block is found, and a `switch` that classifies the result into three
outcomes. `switch (true)` is deliberately not used, because Chapter 2 never teaches
it: the `switch` is on a text label the loop sets.

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

  // The result as a label: "front" (rows 1-2), "back" (any later row),
  // or "none" while no block has been found.
  let verdict = "none";
  let foundRow = 0;
  let foundStart = 0;

  for (let r = 1; r <= ROWS; r++) {
    let consecutive = 0;
    for (let s = 1; s <= seatsPerRow; s++) {
      // Seats 4 and 5 of every row are blocked. A blocked seat ends the
      // run of free seats, so the count starts again, then we skip it.
      if (s === 4 || s === 5) {
        consecutive = 0;
        continue;
      }
      consecutive = consecutive + 1;
      if (consecutive === groupSize) {
        foundRow = r;
        foundStart = s - groupSize + 1;
        if (r <= 2) {
          verdict = "front";
        } else {
          verdict = "back";
        }
        break; // stop this row: the block is found
      }
    }
    if (verdict !== "none") {
      break; // stop the sweep: no need to look at later rows
    }
  }

  switch (verdict) {
    case "front":
      console.log(`Block found near the front: row ${foundRow}, seats ${foundStart} to ${foundStart + groupSize - 1}`);
      break;
    case "back":
      console.log(`Block found further back: row ${foundRow}, seats ${foundStart} to ${foundStart + groupSize - 1}`);
      break;
    default:
      console.log("No block of " + groupSize + " free seats anywhere");
  }

  console.log(typeof verdict);
} catch (err) {
  console.log(err.message);
}
```

**Points earned (example):**
- Branch with `||`: 8/8 — `s === 4 || s === 5` and the `if / else` that sets the label (full marks need a chain with at least one compound condition)
- Nested loop: 9/9 — seat sweep inside a row sweep, both run
- Break/continue: 3/3 — `continue` past seats 4 and 5
- **Total: 20/20**

**Note on the `break`:** the task says to `break` the moment the block is found, so the reference does, once out of the seat loop and once out of the row loop. A `break` inside a `switch` case does not count for the loop-control criterion.
