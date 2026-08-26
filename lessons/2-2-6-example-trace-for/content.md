**Goal:** Watch the three parts of a `for` loop: init, condition, increment: do their job on every pass.

## Step 1: Print i on every pass

The loop starts with `i = 1`, checks `i <= 5` before each pass, and adds 1 to `i` at the end of each pass. Run it and confirm five lines print.

```js live plain
for (let i = 1; i <= 5; i++) {
  console.log(i);
}
```

## Step 2: Accumulate a sum

Add a `total` variable outside the loop. Each pass adds `i` to `total`. After the loop ends, print `total`.

```js live plain
let total = 0;

for (let i = 1; i <= 5; i++) {
  total = total + i;
}

console.log("Sum 1 to 5:", total);
```

## Step 3: Trace the last pass

Change the limit to `3` and add a log **inside** the loop so you can see `i` and `total` on every single pass. Notice that when `i` becomes `4`, the condition `i <= 3` is false and the loop stops: the body never runs for `i = 4`.

```js live plain
let total = 0;

for (let i = 1; i <= 3; i++) {
  total = total + i;
  console.log("after pass i=" + i + ", total=" + total);
}

console.log("Done. Total:", total);
```

## Step 4: Change the step, not just the limit

The increment doesn't have to add 1. Run this loop that counts by twos:

```js live plain
for (let i = 2; i <= 10; i += 2) {
  console.log(i);
}
```

Now count down instead: start high, subtract each pass, and stop once you pass 1:

```js live plain
for (let i = 5; i >= 1; i--) {
  console.log(i);
}
```

Same three parts every time: init, condition, increment, just different numbers in each slot.

## Key takeaways

- The `for` header has three parts: **init** (runs once), **condition** (checked before every pass), **increment** (runs after every pass).
- The loop body runs only while the condition is true.
- Variables declared outside the loop (like `total`) survive after the loop ends.
- The increment can go up, down, or by any step size: the loop only cares that init, condition, and increment agree with each other.
- Logging inside the loop is the fastest way to trace what is happening on each pass.
