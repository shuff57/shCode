**Goal:** See the same defensive-copy idea from this module in a much later unit, where it stops a real bug: removing items from a list while a `for...of` loop is walking that same list.

## Step 1: Loop over the list directly

Say a program removes every score below 50. The loop visits the array one item at a time. Run it and watch an item slip through.

```js live plain
let scores = [45, 30, 80, 60];

for (const score of scores) {
  if (score < 50) {
    scores.splice(scores.indexOf(score), 1);
  }
}

console.log(scores);
```

`30` survives even though it is below 50. Removing an item shifts every later item down one position, but the loop has already moved past that position — exactly the trap Section 6.2 warns about for bullets leaving the canvas.

## Step 2: Loop over a copy instead

Iterate `[...scores]`: a snapshot of the array. Removing from the real array no longer disturbs the list the loop is walking. Run it and every value below 50 is gone.

```js live plain
let scores = [45, 30, 80, 60];

for (const score of [...scores]) {
  if (score < 50) {
    scores.splice(scores.indexOf(score), 1);
  }
}

console.log(scores);
```

The loop removes `45` and `30` safely. The loop's own list is a separate array that never shrinks under it.

## Step 3: The line that was doing the work

Everything above turns on one small change. This is the pair side by side — the only difference is the spread.

```js live plain
let list = [3, 1, 2];

for (const n of list) {
  console.log("walking " + n);
}

for (const n of [...list]) {
  console.log("walking copy " + n);
}
```

## Key takeaways

- `[...scores]` builds a new array holding the same items — a snapshot the loop can trust.
- Removing from an array while iterating it directly can skip entries, because each removal shifts the rest down.
- Looping a copy is the same defensive-copy rule from 3.6.9, seen in the wild: you are not the only holder of that array.
- The copy is shallow, which is exactly enough here — the loop only needs the list of items, not copies of the items themselves.
