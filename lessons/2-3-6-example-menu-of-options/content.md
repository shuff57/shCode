**Goal:** Watch a `switch` route a vending-machine selection to the right case, then see what `default` buys you when the selection doesn't match anything.

## Step 1 — Run a known selection

`selection` is `"B"`. Trace the `case` clauses top to bottom until one matches.

```js live plain
let selection = "B";

switch (selection) {
  case "A":
    console.log("Dispensing: chips");
    break;
  case "B":
    console.log("Dispensing: pretzels");
    break;
  case "C":
    console.log("Dispensing: cookies");
    break;
  default:
    console.log("Unknown selection. Refunding your money.");
}
```

## Step 2 — Try a selection nothing matches

Change `selection` to `"Z"` and run it again. No `case` matches, so `default` runs and the customer gets their money back.

```js live plain
let selection = "Z";

switch (selection) {
  case "A":
    console.log("Dispensing: chips");
    break;
  case "B":
    console.log("Dispensing: pretzels");
    break;
  case "C":
    console.log("Dispensing: cookies");
    break;
  default:
    console.log("Unknown selection. Refunding your money.");
}
```

## Key takeaways

- `switch (selection)` writes the tested value once; every `case` below it just names a value to compare against.
- The first matching `case` runs, then `break` stops execution.
- A `switch` without a `default` would do nothing at all when nothing matches — rarely what you want when a user can type anything.
