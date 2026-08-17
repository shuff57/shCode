**Goal:** Fix a `while` loop that hangs because `continue` skips its update, without changing what it's supposed to print.

## Step 1 — Read the broken version (do not run it)

This loop is meant to print the odd numbers from 1 to 5. It never stops, so it's shown only as text — don't type this version in.

```js
// BROKEN — do not run this. It never stops.
let i = 0;
while (i < 5) {
  if (i % 2 === 0) {
    continue;      // jumps back up without ever reaching i++
  }
  console.log(i);
  i++;
}
```

When `i` is `0`, `0 % 2 === 0` is true, `continue` fires, and execution jumps straight back to `while (i < 5)` — without ever reaching `i++`. `i` is still `0` on the next round, and every round after that. Nothing ever changes.

## Step 2 — Move the update above the continue

The fix isn't removing `continue` — it's making sure `i++` runs *before* anything that could skip past it.

```js live plain
let i = 0;

while (i < 5) {
  i++;
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

Run it. `i` becomes `1` first, then the even check runs, then either the log happens or `continue` skips it — either way, `i` has already changed.

## Key takeaways

- The bug isn't "using `continue`" — it's *where* the update sits relative to it.
- In a `while` loop, put the update as the **first** thing in the body if anything below it might `continue`.
- Tracing the first round by hand (`i` is `0`, condition is true, does `continue` fire, what changed?) catches this before you ever run it.
