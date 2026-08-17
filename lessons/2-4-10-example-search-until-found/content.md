**Goal:** Find the first number at or above 20 that divides evenly by 7 — without knowing in advance how far you'll have to look.

## Step 1 — while (true), on its own, is a bug

```js
// BROKEN — do not run this. It never stops.
let current = 20;

while (true) {
  console.log(current);
  current++;
}
```

`true` is a condition that is never false. Written alone like this, it prints forever. Do not run it.

## Step 2 — Add a break, and it becomes deliberate

```js live plain
let current = 20;

while (true) {
  if (current % 7 === 0) {
    console.log("Found: " + current);
    break;
  }
  current++;
}
```

Same `while (true)` — but now it says something completely different: *this loop ends when it finds what it's looking for, and not before.* The `%` operator gives the remainder of a division; `current % 7 === 0` is how you test whether `current` divides evenly by 7.

## Step 3 — Why this shape, and not a while with a real condition

You could try to write a normal condition instead, but you'd have to know the stopping value before you started — and the whole point here is that you don't. `while (true)` plus a `break` near the top of the body is how you write "keep going until you find it" honestly, without inventing a fake limit.

## Key takeaways

- `while (true)` alone is always an infinite loop — it needs a `break` to be safe.
- Put the `break` near the top of the body, where a reader can find the exit quickly.
- This shape is for exactly one situation: you don't know how many rounds it will take, only what you're looking for.
- `%` (remainder) is how you test "does this number divide evenly into that one."
