**Goal:** See that a `break` inside a nested loop stops only the loop it's *directly* inside — not both.

## Step 1 — Predict, then run

Before you run this, guess: does `break` stop just the inner loop, or the whole thing?

```js live plain
for (let i = 1; i <= 3; i++) {
  for (let j = 1; j <= 3; j++) {
    if (j === 2) {
      break;
    }
    console.log("i=" + i + " j=" + j);
  }
}

console.log("Done.");
```

**What you should see:**
```
i=1 j=1
i=2 j=1
i=3 j=1
Done.
```

The inner loop breaks at `j === 2` every single time — but the outer loop is untouched. It starts a fresh inner loop for the next `i`, and that fresh inner loop breaks at `j === 2` again.

## Step 2 — Say the rule out loud

`break` ends the loop it is **directly** inside. Here, `break` sits inside the `j` loop's body, so it ends the `j` loop. The `i` loop is a different loop entirely — `break` never touches it.

## Key takeaways

- `break` in a nested loop only leaves the loop it's written inside — one level, not all of them.
- The outer loop keeps running and starts a brand-new inner loop on its next round.
- This surprises people who expect `break` to mean "stop everything." It means "stop *this* loop."
