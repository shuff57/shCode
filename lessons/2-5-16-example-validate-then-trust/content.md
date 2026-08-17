**Goal:** Run a quantity that arrived as text through two separate checks before the program trusts it, throwing on the first one that fails.

## Step 1 — Convert and check for NaN

`typed` holds text. `Number(typed)` converts it — but if the text isn't a valid number, the result is `NaN`, and `Number()` does **not** throw on its own. That's exactly the kind of silent wrongness a deliberate `throw` turns into something you can't ignore.

```js live plain
const typed = "abc";

try {
  const quantity = Number(typed);

  if (Number.isNaN(quantity)) {
    throw new Error("That is not a number: " + typed);
  }

  console.log("Ordering " + quantity + " items.");
} catch (err) {
  console.log("Could not place the order. " + err.message);
}
```

## Step 2 — Add the second check

A number can convert fine and still be wrong for this program's rules — like `0` or a negative quantity.

```js live plain
const typed = "0";

try {
  const quantity = Number(typed);

  if (Number.isNaN(quantity)) {
    throw new Error("That is not a number: " + typed);
  }
  if (quantity <= 0) {
    throw new Error("Quantity must be at least 1.");
  }

  console.log("Ordering " + quantity + " items.");
} catch (err) {
  console.log("Could not place the order. " + err.message);
}
```

## Step 3 — Try all three paths

Change `typed` to `"abc"`, then `"0"`, then `"3"` and re-run each time. Every failing path lands in the same `catch`, and `err.message` says exactly which check rejected the input.

```js live plain
const typed = "3";

try {
  const quantity = Number(typed);

  if (Number.isNaN(quantity)) {
    throw new Error("That is not a number: " + typed);
  }
  if (quantity <= 0) {
    throw new Error("Quantity must be at least 1.");
  }

  console.log("Ordering " + quantity + " items.");
} catch (err) {
  console.log("Could not place the order. " + err.message);
}
```

## Key takeaways

- `Number()` converts quietly and returns `NaN` on failure — it never throws, so you must check for `NaN` yourself.
- Each `throw` names exactly what's wrong; one `catch` can still handle every check.
- Checks run in order, and the first one that fails is the one that reports.
