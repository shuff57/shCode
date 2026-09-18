## Answer Key — 2.7.5 Write the Steps

### Rubric (20 points total)

| Criterion | Points | What earns full credit |
|---|---:|---|
| **Nested loop** | 8 | Two nested `for`/`while` loops. Outer iterates a range or string; inner iterates a different range or walks a string. Both loops execute their bodies. |
| **Branch with `&&`/`||`** | 8 | An `if` / `else if` / `else` chain with at least one compound condition using `&&` or `||`. The condition must be meaningful (not `true && true`). |
| **Break or continue** | 4 | At least one `break` or `continue` inside the nested loop that affects control flow (not decorative). |

**Total: 20 points**

### Partial credit guidelines

- **Nested loop (8 pts):**
  - 8: Two properly nested loops, both execute
  - 6: Two loops but one doesn't execute (off-by-one bounds)
  - 4: Only one loop, or loops not nested
  - 2: Loop-like structure but not valid JS (e.g., `for` without body)
  - 0: No loop or only one loop

- **Branch with `&&`/`||` (8 pts):**
  - 8: `if`/`else if`/`else` with at least one `&&` or `||` in a condition
  - 5: `if`/`else` with compound condition but missing `else if` chain
  - 3: Only `if`/`else` with simple condition (no `&&`/`||`)
  - 0: No branch or only `if` without `else`

- **Break/continue (4 pts):**
  - 4: `break` or `continue` inside a loop, affects flow meaningfully
  - 2: `break`/`continue` present but decorative (e.g., after last statement in loop)
  - 0: None

### Partial credit for D2 (20 pts total)

D2 is graded against the problem, not against the chart. A correct chart with buggy code loses only the D2 points. A blank chart costs the 10 D1 points.

**Partial credit ladder for D2 (suggested):**
- 20: All three criteria met, runs correctly
- 16: One minor issue (off-by-one in loop bounds, missing `typeof`)
- 12: Two of three structural elements present
- 8: Only one structural element
- 4: Significant logic error but some structure
- 0: Blank or fundamentally wrong approach

### Example reference solution (Problem 1: Seat Map)

```js
// Problem: Seat Map
// Partners: N/A
// Date: 2026-09-30

const ROWS = 5;
const SEATS_PER_ROW = 10;
const GROUP_SIZE = 3;
const BLOCKED = "4,5; 2,7";  // row,seat pairs

try {
  if (ROWS < 1 || SEATS_PER_ROW < 1 || GROUP_SIZE < 1) {
    throw new Error("R, S, G must be at least 1");
  }

  let found = false;
  let foundRow = 0;
  let foundStart = 0;

  for (let r = 1; r <= ROWS; r++) {
    let consecutive = 0;
    for (let s = 1; s <= SEATS_PER_ROW; s++) {
      // Check if seat is blocked
      let blocked = false;
      if (BLOCKED.includes(`${r},${s}`)) {
        continue;
      }
      consecutive = consecutive + 1;
      if (consecutive >= GROUP_SIZE) {
        found = true;
        foundRow = r;
        foundStart = s - GROUP_SIZE + 1;
        break;
      }
    }
    if (found) {
      break;
    }
  }

  switch (true) {
    case found:
      console.log(`Block found at row ${foundRow}, seats ${foundStart}..${foundStart + GROUP_SIZE - 1}`);
      break;
    default:
      console.log("No block found");
  }

  console.log(typeof found);
} catch (err) {
  console.log(err.message);
}
```

**Points earned (example):**
- Nested loop: 8/8 (row loop + seat loop)
- Branch with `&&`/`||`: 8/8 (if/else if/else with `&&` in condition)
- Break/continue: 4/4 (break when found)
- **Total: 20/20**