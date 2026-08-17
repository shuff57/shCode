**Goal:** Trace a chained ternary the same way you traced an else if chain — top to bottom, stop at the first true test.

## Step 1 — Run the chain as written

`speed` is 55. Predict which value `zone` gets before running.

```js live plain
let speed = 55;
let zone = (speed < 25) ? "School zone" :
  (speed < 45) ? "City" :
  (speed < 65) ? "Highway" :
  "Autobahn";
console.log(zone);
```

## Step 2 — Try a lower value

Change `speed` to `10`. The very first test (`speed < 25`) is now true, so the chain stops immediately.

```js live plain
let speed = 10;
let zone = (speed < 25) ? "School zone" :
  (speed < 45) ? "City" :
  (speed < 65) ? "Highway" :
  "Autobahn";
console.log(zone);
```

## Step 3 — Break the ordering on purpose

Move `(speed < 65)` to the front of the chain (first test) and re-run with `speed = 10`. Notice `zone` becomes `"Highway"` — wrong, because a chain, like an `else if` chain, stops at the *first* true test, not the most specific one.

```js live plain
let speed = 10;
let zone = (speed < 65) ? "Highway" :
  (speed < 25) ? "School zone" :
  (speed < 45) ? "City" :
  "Autobahn";
console.log(zone);
```

## Key takeaways

- A chained ternary evaluates top to bottom and stops at the first `true` test — same rule as `else if`.
- Ordering the cutoffs from smallest to largest is not a style choice; putting a wide test first silently steals cases meant for a narrower one.
- Each line of a chained ternary should read as one clean question. If it gets hard to read on one screen, that's a sign to switch to `if...else if`.
