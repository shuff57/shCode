**Goal:** Find a single missing `break` by reading the *output*, not the code — then confirm it by finding the line.

## Step 1 — Run it and read the output before scrolling to the code

`level` is `2`. Run this and notice you get two lines, not one.

```js live plain
let level = 2;

switch (level) {
  case 1:
    console.log("Beginner");
    break;
  case 2:
    console.log("Intermediate");
  case 3:
    console.log("Advanced");
    break;
  default:
    console.log("Unknown level");
}
```

## Step 2 — Find the missing break from the symptom

The output is:

```
Intermediate
Advanced
```

`case 2` matched and printed `"Intermediate"` — that part is correct. Then execution fell through into `case 3` and printed `"Advanced"` too. It stopped there, because `case 3` *does* have its `break`. A learner at level 2 gets told they're Advanced — a wrong answer that no error message points you to. The fix is one word:

```js live plain
let level = 2;

switch (level) {
  case 1:
    console.log("Beginner");
    break;
  case 2:
    console.log("Intermediate");
    break;
  case 3:
    console.log("Advanced");
    break;
  default:
    console.log("Unknown level");
}
```

## Key takeaways

- The symptom of a missing `break` is extra output — lines from cases that shouldn't have matched.
- To find the bug, start at the *first* unexpected line and look at the `case` directly above it.
- Adding the missing `break` fixes the bug without touching anything else in the block.
