**Goal:** Watch the three parts of a `for` loop — init, condition, increment — do their job on every pass.

## Step 1 — Print i on every pass

The loop starts with `i = 1`, checks `i <= 5` before each pass, and adds 1 to `i` at the end of each pass. Run it and confirm five lines print.

```js live console
for (let i = 1; i <= 5; i++) {
  console.log(i);
}
```

## Step 2 — Accumulate a sum

Add a `total` variable outside the loop. Each pass adds `i` to `total`. After the loop ends, print `total`.

```js live console
let total = 0;

for (let i = 1; i <= 5; i++) {
  total = total + i;
}

console.log("Sum 1 to 5:", total);
```

## Step 3 — Trace the last pass

Change the limit to `3` and add a log **inside** the loop so you can see `i` and `total` on every single pass. Notice that when `i` becomes `4`, the condition `i <= 3` is false and the loop stops — the body never runs for `i = 4`.

```js live console
let total = 0;

for (let i = 1; i <= 3; i++) {
  total = total + i;
  console.log("after pass i=" + i + ", total=" + total);
}

console.log("Done. Total:", total);
```

## Key takeaways

- The `for` header has three parts: **init** (runs once), **condition** (checked before every pass), **increment** (runs after every pass).
- The loop body runs only while the condition is true.
- Variables declared outside the loop (like `total`) survive after the loop ends.
- Logging inside the loop is the fastest way to trace what is happening on each pass.
