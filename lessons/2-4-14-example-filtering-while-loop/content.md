**Goal:** Add up only the positive numbers in a range, ignoring the rest, two different ways.

## Step 1 — Skip with continue

Count `n` from `-5` up to `5`. Whenever `n` is zero or negative, skip it with `continue` and move straight to the next value.

```js live plain
let total = 0;

for (let n = -5; n <= 5; n++) {
  if (n <= 0) {
    continue;
  }
  total = total + n;
}

console.log("Total of positive values: " + total);
```

`1 + 2 + 3 + 4 + 5` is `15`. Every value from `-5` to `0` got skipped.

## Step 2 — The same loop, written the other way

You can write the same result with an `if` that **keeps** instead of a `continue` that **skips**:

```js live plain
let total = 0;

for (let n = -5; n <= 5; n++) {
  if (n > 0) {
    total = total + n;
  }
}

console.log("Total of positive values: " + total);
```

Both versions print the same total. `continue` earns its place when the thing you want to skip is checked at the top and the real work below it is long — it saves the reader from following a block of code wrapped in an `if` that runs all the way to the bottom of the loop. When the kept work is this short, either shape is fine.

## Key takeaways

- `continue` and a keep-only `if` can produce the same result — they're two ways to say the same filter.
- `continue` reads better when there's a lot of work to skip past; a keep-only `if` reads better when the kept work is short.
- Both still run every round of the loop — `continue` just does nothing useful in the skipped ones.
