**Goal:** Trace a nested if and see why the inner check only fires when the outer one passes.

## Step 1: Run it with both conditions true

`hasTicket` is `true` and `age` is `10`. Predict what prints, then run.

```js live plain
let hasTicket = true;
let age = 10;

if (hasTicket) {
  console.log("Ticket confirmed.");

  if (age < 12) {
    console.log("Kids' seating section.");
  } else {
    console.log("General seating section.");
  }
} else {
  console.log("No entry without a ticket.");
}
```

## Step 2: Fail the outer condition

Change `hasTicket` to `false`. Run it. Notice the inner `if (age < 12)` never runs: you only see the "No entry" message. The outer `if` skipped its entire block, inner check included.

```js live plain
let hasTicket = false;
let age = 10;

if (hasTicket) {
  console.log("Ticket confirmed.");

  if (age < 12) {
    console.log("Kids' seating section.");
  } else {
    console.log("General seating section.");
  }
} else {
  console.log("No entry without a ticket.");
}
```

## Step 3: Pass the outer, fail the inner

Set `hasTicket` back to `true` and change `age` to `20`. Now the outer condition passes, so the inner `if` runs, and its own `else` fires because 20 is not less than 12.

```js live plain
let hasTicket = true;
let age = 20;

if (hasTicket) {
  console.log("Ticket confirmed.");

  if (age < 12) {
    console.log("Kids' seating section.");
  } else {
    console.log("General seating section.");
  }
} else {
  console.log("No entry without a ticket.");
}
```

## Key takeaways

- A nested `if` only runs when the code around it decides to run its block at all.
- The outer `if`'s `else` is unrelated to the inner `if`'s `else`: each `if` owns its own `else`.
- Nesting answers "given that the first thing is true, what about this second thing?": a compound condition like `a && b` answers a different question: "are both true at once?"
- Indent each nested level so it's obvious which condition a line depends on.
