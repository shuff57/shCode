**Goal:** Try every boundary of a range condition and see why no `case` list could ever describe it.

## Step 1 — Walk the chain across every boundary

Run this with `score` at `95`, `90`, `89`, `80`, `79`, and `50`. Each one lands in a different branch, but the branches overlap on purpose — `90` only reaches the `A` branch because the earlier tests already failed at `100` and below.

```js live plain
let score = 89;

if (score >= 90) {
  console.log("A");
} else if (score >= 80) {
  console.log("B");
} else if (score >= 70) {
  console.log("C");
} else {
  console.log("F");
}
```

## Step 2 — Why there's no case list for this

A `switch` needs a fixed, finite list of exact values to compare against. `score >= 80` isn't one value — it's every number from 80 to 89, and every one of those numbers would need its own `case` line to write it as a `switch`. Ten thousand possible scores, ten thousand cases. That's the tell that a condition is a *range*, not a *match*, and belongs in `if...else`.

## Key takeaways

- A `switch` can only compare against exact values — `score >= 80` names a whole range, not one value.
- If you find yourself trying to force a range into `case` labels, that's the signal to keep the `if...else` chain instead.
- The reverse is never a problem: any `switch` *can* be rewritten as `if...else` (using `===` for each case) — it's only ranges that can't go the other direction.
